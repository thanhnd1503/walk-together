import express from 'express';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {
  EVENTS, CHAT_MAX, CHAT_COOLDOWN_MS, LOOK_CHANGE_COOLDOWN_MS,
} from '../shared/constants.js';
import {
  joinRoom, leaveRoom, getRoom, allRooms, publicState, updateMove, updateLook, checkHoldBreak, setHolding,
  roomMaxX,
} from './rooms.js';
import {
  handleCollect, handleInteract, checkPositions, publicQuest, savedQuest, tickQuest, chatBlocked,
} from './quests.js';
import { addPhoto, saveProgress } from './storage.js';
import { botOf, onHumanChat, onHumanInteract, tickBot } from './bot.js';

const PORT = Number(process.env.PORT) || 3456;
const root = (p) => fileURLToPath(new URL(p, import.meta.url));

const app = express();
app.use(express.static(root('../public')));
app.use('/shared', express.static(root('../shared')));

const QUEST_TICK_MS = 100;
const BOT_REPLY_MS = 900;

const httpServer = createServer(app);
const io = new Server(httpServer, { maxHttpBufferSize: 4096 });

// Mỗi người nhận trạng thái riêng (nhiệm vụ bản vẽ: chỉ người cầm bản vẽ thấy ván tốt/mục)
function emitQuest(room, now) {
  for (const player of room.players.values()) {
    if (!player.isBot) io.to(player.id).emit(EVENTS.QUEST, publicQuest(room.progress, now, player.id));
  }
}

// Báo tiến độ mới cho cả phòng và lưu lại
function applyQuest(room, result) {
  // Đưa người chơi về vạch: gửi MOVE cho cả phòng, kể cả chính người đó (client coi là dịch chuyển)
  for (const { id, x } of result.teleport ?? []) {
    const pl = room.players.get(id);
    if (!pl) continue;
    pl.x = x;
    pl.walking = false;
    io.to(room.code).emit(EVENTS.MOVE, { id, x, dir: pl.dir, walking: false });
  }
  if (result.photo) addPhoto(room.code, result.photo);
  if (result.fx) io.to(room.code).emit(EVENTS.FX, result.fx);
  if (!result.changed) return;
  emitQuest(room, Date.now());
  saveProgress(room.code, savedQuest(room.progress));
}

io.on('connection', (socket) => {
  let roomCode = null;
  let lastChatAt = 0;
  let lastLookAt = 0;

  const leave = () => {
    if (!roomCode) return;
    const room = leaveRoom(roomCode, socket.id);
    if (room) socket.to(roomCode).emit(EVENTS.LEFT, { id: socket.id, ...publicState(room) });
    socket.leave(roomCode);
    roomCode = null;
  };

  socket.on(EVENTS.JOIN, (data, ack) => {
    if (typeof ack !== 'function') return;
    leave();

    const result = joinRoom(socket.id, data);
    if (result.error) return ack({ ok: false, error: result.error });

    const { room, replacedId } = result;
    if (replacedId) io.sockets.sockets.get(replacedId)?.disconnect(true);

    roomCode = room.code;
    socket.join(roomCode);
    ack({ ok: true, selfId: socket.id, ...publicState(room, socket.id) });
    socket.to(roomCode).emit(EVENTS.STATE, publicState(room));
  });

  socket.on(EVENTS.MOVE, (data) => {
    const room = roomCode && getRoom(roomCode);
    if (!room) return;
    const p = updateMove(room, socket.id, data);
    if (!p) return;
    socket.to(roomCode).emit(EVENTS.MOVE, { id: p.id, x: p.x, dir: p.dir, walking: p.walking });
    if (checkHoldBreak(room)) io.to(roomCode).emit(EVENTS.HAND, { holding: false });
    applyQuest(room, checkPositions(room.progress, room, Date.now()));
  });

  socket.on(EVENTS.COLLECT, (data) => {
    const room = roomCode && getRoom(roomCode);
    const p = room?.players.get(socket.id);
    if (!p) return;
    applyQuest(room, handleCollect(room.progress, p, Number(data?.itemId), Date.now()));
  });

  socket.on(EVENTS.INTERACT, (data) => {
    const room = roomCode && getRoom(roomCode);
    const p = room?.players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    const targetId = String(data?.targetId ?? '');
    applyQuest(room, handleInteract(room.progress, p, targetId, now, room));
    if (room.solo) onHumanInteract(room, now, targetId);
  });

  socket.on(EVENTS.CHAT, (data) => {
    const room = roomCode && getRoom(roomCode);
    const now = Date.now();
    if (!room || now - lastChatAt < CHAT_COOLDOWN_MS) return;
    const text = String(data?.text ?? '').trim().slice(0, CHAT_MAX);
    if (!text) return;
    lastChatAt = now;
    // Thử thách "Tâm đầu ý hợp": đang chọn thì không được nhắn cho nhau
    if (chatBlocked(room.progress)) {
      socket.emit(EVENTS.FX, { type: 'noChat', by: socket.id });
      return;
    }
    io.to(roomCode).emit(EVENTS.CHAT, { id: socket.id, text });
    const bot = room.solo && botOf(room);
    if (bot) {
      const reply = onHumanChat(room, text);
      setTimeout(() => io.to(room.code).emit(EVENTS.CHAT, { id: bot.id, text: reply }), BOT_REPLY_MS);
    }
  });

  socket.on(EVENTS.LOOK, (data) => {
    const room = roomCode && getRoom(roomCode);
    const now = Date.now();
    if (!room || now - lastLookAt < LOOK_CHANGE_COOLDOWN_MS) return;
    lastLookAt = now;
    const p = updateLook(room, socket.id, data?.look);
    if (p) socket.to(roomCode).emit(EVENTS.LOOK, { id: p.id, look: p.look });
  });

  socket.on(EVENTS.HAND, (data, ack) => {
    const room = roomCode && getRoom(roomCode);
    if (!room || typeof ack !== 'function') return;
    const result = setHolding(room, Boolean(data?.holding));
    ack(result);
    if (result.ok) io.to(roomCode).emit(EVENTS.HAND, { holding: room.holding });
  });

  socket.on(EVENTS.LEAVE, leave);
  socket.on('disconnect', leave);
});

function tickRoomBot(room, now) {
  const bot = botOf(room);
  if (!bot) return;
  const { moved, press, say } = tickBot(room, QUEST_TICK_MS / 1000, now, roomMaxX(room));
  if (moved) io.to(room.code).emit(EVENTS.MOVE, { id: bot.id, x: bot.x, dir: bot.dir, walking: bot.walking });
  if (press) applyQuest(room, handleInteract(room.progress, bot, press, now, room));
  if (say) io.to(room.code).emit(EVENTS.CHAT, { id: bot.id, text: say });
  if (moved) applyQuest(room, checkPositions(room.progress, room, now));
}

// Nhịp chung: vật rơi của nhiệm vụ hứng, bot của chế độ 1 người
setInterval(() => {
  const now = Date.now();
  for (const room of allRooms()) {
    applyQuest(room, tickQuest(room.progress, room, now, QUEST_TICK_MS));
    if (room.solo) tickRoomBot(room, now);
  }
}, QUEST_TICK_MS);

httpServer.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(`❌ Cổng ${PORT} đang bị chương trình khác dùng. Thử cổng khác: PORT=3457 npm run dev`);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`🌸 Đi Dạo Cùng Nhau đang chạy tại http://localhost:${PORT}`);
  // Địa chỉ trong mạng Wi-Fi nhà, để mở thử trên điện thoại
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        console.log(`📱 Trên điện thoại (cùng Wi-Fi): http://${net.address}:${PORT}`);
      }
    }
  }
});
