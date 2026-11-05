// Hàm dùng chung cho các thử thách (Cổng Hoa Đào, Cầu Tình Yêu)
import { HAND_DROP_GAP } from '../shared/quests.js';

export const START_ZONE = 90; // đứng cách vạch xuất phát trong khoảng này là "ở vạch"
export const RESTART_DELAY_MS = 1500; // thua rồi chờ chút mới bắt đầu lại
export const NONE = { changed: false };

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export const pair = (room) => [...room.players.values()];

// Người còn lại trong phòng
export const otherOf = (room, id) => pair(room).find((pl) => pl.id !== id);

// Đang nắm tay và chưa cách nhau quá xa
export function handOk(room) {
  const [a, b] = pair(room);
  return Boolean(a && b && room.holding && Math.abs(a.x - b.x) <= HAND_DROP_GAP);
}

export const bothAtStart = (room, x) => pair(room).length === 2 && pair(room).every((pl) => Math.abs(pl.x - x) <= START_ZONE);

// Chọn ngẫu nhiên một người trong phòng cho vai đặc biệt nếu người giữ vai cũ không còn
export function ensureRole(room, id) {
  if (room.players.has(id) || room.players.size < 2) return id;
  return pick(pair(room)).id;
}

const RESET_GAP = 25; // về vạch: hai người đứng hai bên vạch

// Thử thách nắm tay thất bại: cả hai về vạch xuất phát, chờ chút mới bắt đầu lại
export function backToStart(p, q, room, now, reason, by = null) {
  p.ch.phase = 'idle';
  p.ch.readyAt = now + RESTART_DELAY_MS;
  p.items = [];
  const teleport = pair(room).map((pl, i) => ({ id: pl.id, x: q.startX + (i ? RESET_GAP : -RESET_GAP) }));
  return { changed: true, fx: { type: 'fail', reason, by }, teleport };
}
