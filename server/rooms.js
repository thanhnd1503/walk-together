import {
  MAX_PLAYERS, NAME_MAX, ROOM_CODE_PATTERN, sanitizeLook,
  WORLD_WIDTH, HOLD_DISTANCE, HOLD_BREAK,
} from '../shared/constants.js';
import { maxXFor, spawnXFor } from '../shared/quests.js';
import { createProgress, publicQuest } from './quests.js';
import { loadProgress } from './storage.js';
import { botOf, createBot } from './bot.js';

// code -> { code, solo, players: Map<socketId, player>, holding: boolean, progress }
// Phòng chơi 1 người có mã nội bộ SOLO-xxx: tách riêng phòng thật và tiến độ thật
const rooms = new Map();

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function allRooms() {
  return rooms.values();
}

export function getRoom(code) {
  return rooms.get(code);
}

// Chỉ gửi các trường công khai (không lộ clientId hay trạng thái nội bộ của bot)
export function publicState(room, viewerId = null) {
  const players = [...room.players.values()].map(({ id, name, look, x, dir, walking }) => ({ id, name, look, x, dir, walking }));
  return { players, holding: room.holding, quest: publicQuest(room.progress, Date.now(), viewerId) };
}

// Trả về { room, player, replacedId } hoặc { error }
export function joinRoom(socketId, data) {
  const userCode = String(data?.roomCode ?? '').toUpperCase();
  const solo = data?.solo === true;
  const code = solo ? `SOLO-${userCode}` : userCode;
  const name = String(data?.name ?? '').trim().slice(0, NAME_MAX);
  const clientId = String(data?.clientId ?? '').slice(0, 64);
  const look = sanitizeLook(data?.look);

  if (!ROOM_CODE_PATTERN.test(userCode)) return { error: 'Mã phòng chỉ gồm 3–8 chữ cái hoặc số.' };
  if (!name) return { error: 'Bạn chưa nhập tên.' };

  let room = rooms.get(code);
  if (!room) {
    room = { code, solo, players: new Map(), holding: false, progress: createProgress(loadProgress(code)) };
    rooms.set(code, room);
  }

  // Cùng clientId vào lại (vd: mạng chập chờn) thì thay chỗ cũ, tránh "phòng đầy" vì bóng ma
  let replacedId = null;
  for (const [id, p] of room.players) {
    if (p.clientId === clientId && clientId) {
      replacedId = id;
      room.players.delete(id);
    }
  }

  if (room.players.size >= MAX_PLAYERS) {
    return { error: solo ? 'Phòng 1 người này đang có người chơi ở tab khác.' : 'Phòng này đã đủ 2 người rồi.' };
  }

  // Người vào sau đứng cạnh người đang ở trong phòng, không đè lên nhau
  const other = [...room.players.values()][0];
  const maxX = roomMaxX(room);
  const spawnX = other ? other.x + (other.x + 70 > maxX ? -70 : 70) : spawnXFor(room.progress.index);
  const x = clamp(Number.isFinite(data?.x) ? data.x : spawnX, 0, maxX);
  const player = { id: socketId, clientId, name, look, x, dir: 1, walking: false };
  room.players.set(socketId, player);
  if (solo && !botOf(room)) {
    const bot = createBot(userCode, clamp(x + (x + 70 > maxX ? -70 : 70), 0, maxX));
    room.players.set(bot.id, bot);
  }
  return { room, player, replacedId };
}

export function leaveRoom(code, socketId) {
  const room = rooms.get(code);
  // Không còn trong phòng (đã bị thay chỗ khi vào lại) thì không báo rời đi
  if (!room?.players.delete(socketId)) return null;
  room.holding = false;
  // Chỉ còn bot thì đóng phòng
  if ([...room.players.values()].every((p) => p.isBot)) rooms.delete(code);
  return room;
}

export function updateLook(room, socketId, look) {
  const p = room.players.get(socketId);
  if (!p) return null;
  p.look = sanitizeLook(look);
  return p;
}

// Không cho đi qua chắn đường chưa mở
export function roomMaxX(room) {
  return Math.min(WORLD_WIDTH, maxXFor(room.progress.index));
}

export function updateMove(room, socketId, data) {
  const p = room.players.get(socketId);
  if (!p || !Number.isFinite(data?.x)) return null;
  p.x = clamp(data.x, 0, roomMaxX(room));
  p.dir = data.dir === -1 ? -1 : 1;
  p.walking = Boolean(data.walking);
  return p;
}

function distance(room) {
  const [a, b] = [...room.players.values()];
  return a && b ? Math.abs(a.x - b.x) : Infinity;
}

// Trả về true nếu trạng thái nắm tay vừa bị buông do quá xa
export function checkHoldBreak(room) {
  if (room.holding && distance(room) > HOLD_BREAK) {
    room.holding = false;
    return true;
  }
  return false;
}

export function setHolding(room, want) {
  if (!want) {
    room.holding = false;
    return { ok: true };
  }
  if (room.players.size < MAX_PLAYERS) return { ok: false, error: 'Người ấy chưa vào phòng.' };
  // Cho phép dư một chút vì vị trí trên server trễ hơn màn hình
  if (distance(room) > HOLD_DISTANCE * 1.6) return { ok: false, error: 'Lại gần hơn chút nữa để nắm tay nhé 💕' };
  room.holding = true;
  return { ok: true };
}
