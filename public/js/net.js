// Mọi giao tiếp Socket.IO nằm ở đây
import { EVENTS } from '/shared/constants.js';

export function createNet(handlers) {
  // window.io được nạp từ /socket.io/socket.io.js
  const socket = window.io({ autoConnect: true });
  let joinData = null;
  let everConnected = false;

  const join = (data) => new Promise((resolve) => {
    socket.timeout(8000).emit(EVENTS.JOIN, data, (err, res) => {
      if (err) return resolve({ ok: false, error: 'Không kết nối được máy chủ, thử lại nhé.' });
      if (res.ok) joinData = data;
      resolve(res);
    });
  });

  socket.on('connect', async () => {
    handlers.onConnectionChange(true);
    // Kết nối lại sau khi rớt mạng: tự vào lại phòng cũ ở vị trí hiện tại
    if (everConnected && joinData) {
      const res = await join({ ...joinData, x: handlers.getLocalX() });
      if (res.ok) handlers.onRejoin(res);
    }
    everConnected = true;
  });
  socket.on('disconnect', () => handlers.onConnectionChange(false));

  socket.on(EVENTS.STATE, handlers.onState);
  socket.on(EVENTS.LEFT, handlers.onLeft);
  socket.on(EVENTS.MOVE, handlers.onMove);
  socket.on(EVENTS.CHAT, handlers.onChat);
  socket.on(EVENTS.HAND, handlers.onHand);
  socket.on(EVENTS.LOOK, handlers.onLook);
  socket.on(EVENTS.QUEST, handlers.onQuest);
  socket.on(EVENTS.FX, handlers.onFx);

  return {
    join,
    leave: () => {
      joinData = null;
      socket.emit(EVENTS.LEAVE);
    },
    sendMove: (m) => socket.connected && socket.volatile.emit(EVENTS.MOVE, m),
    sendChat: (text) => socket.emit(EVENTS.CHAT, { text }),
    sendLook: (look) => socket.emit(EVENTS.LOOK, { look }),
    collect: (itemId) => socket.emit(EVENTS.COLLECT, { itemId }),
    interact: (targetId) => socket.emit(EVENTS.INTERACT, { targetId }),
    toggleHand: (holding) => new Promise((resolve) => {
      socket.timeout(5000).emit(EVENTS.HAND, { holding }, (err, res) => {
        resolve(err ? { ok: false, error: 'Mạng hơi chậm, thử lại nhé.' } : res);
      });
    }),
  };
}
