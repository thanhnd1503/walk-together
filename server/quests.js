// Logic nhiệm vụ phía server: server là trọng tài, client chỉ gửi yêu cầu
import {
  QUESTS, COLLECT_RADIUS, CATCH_RADIUS, CATCH_FROM, INTERACT_RADIUS, PLATE_RADIUS,
  SYNC_WINDOW_MS, SERVER_SLACK,
} from '../shared/quests.js';

// Vật rơi: nới thời điểm hứng vì mạng trễ; giữ thêm chút sau khi chạm đất rồi mới xoá
const CATCH_PROGRESS_SLACK = 0.18;
const LANDED_KEEP_MS = 400;

export function createProgress(saved) {
  const index = Number.isInteger(saved?.index) ? Math.max(0, Math.min(QUESTS.length, saved.index)) : 0;
  const p = { index, count: 0, items: [], presses: [], platesSince: null, nextItemId: 1, lastSpawnAt: 0 };
  setupQuest(p, Number.isInteger(saved?.count) ? saved.count : 0);
  return p;
}

// Vật rơi gửi kèm `age` (đã rơi bao lâu) để client tự tính vị trí, không phụ thuộc đồng hồ server
export function publicQuest(p, now = Date.now()) {
  const items = p.items.map(({ id, x, kind, spawnAt }) => (spawnAt ? { id, x, kind, age: now - spawnAt } : { id, x }));
  return { index: p.index, count: p.count, items };
}

export function savedQuest(p) {
  return { index: p.index, count: p.count };
}

function setupQuest(p, count = 0) {
  const q = QUESTS[p.index];
  p.count = 0;
  p.items = [];
  p.presses = [];
  p.platesSince = null;
  if (q?.type !== 'collect' && q?.type !== 'catch') return;
  p.count = Math.max(0, Math.min(q.goal - 1, count));
  if (q.type === 'collect') p.items = q.fixed.slice(p.count).map((x) => ({ id: p.nextItemId++, x }));
}

// Thả một vật rơi quanh vị trí của hai người
function spawnFalling(p, q, room, now) {
  const xs = [...room.players.values()].map((pl) => pl.x);
  const [min, max] = q.range;
  const lo = Math.max(min, Math.min(...xs) - q.spreadX);
  const hi = Math.min(max, Math.max(...xs) + q.spreadX);
  const x = Math.round(lo + Math.random() * Math.max(0, hi - lo));
  const kind = Math.random() < q.badRatio ? 'bad' : 'good';
  p.items.push({ id: p.nextItemId++, x, kind, spawnAt: now });
  p.lastSpawnAt = now;
}

// Gọi định kỳ: thả vật rơi mới, xoá vật đã chạm đất. Trả về true nếu có thay đổi.
export function tickQuest(p, room, now) {
  const q = QUESTS[p.index];
  if (q?.type !== 'catch' || room.players.size === 0) return false;
  const before = p.items.length;
  p.items = p.items.filter((it) => now - it.spawnAt <= q.fallMs + LANDED_KEEP_MS);
  let changed = p.items.length !== before;
  if (now - p.lastSpawnAt >= q.spawnMs) {
    spawnFalling(p, q, room, now);
    changed = true;
  }
  return changed;
}

function complete(p) {
  p.index++;
  setupQuest(p);
}

const near = (player, x, radius) => Math.abs(player.x - x) <= radius + SERVER_SLACK;

// Mỗi hàm trả về { changed, fx? } để server biết cần báo gì cho cả phòng

export function handleCollect(p, player, itemId, now) {
  const q = QUESTS[p.index];
  if (q?.type !== 'collect' && q?.type !== 'catch') return { changed: false };
  const item = p.items.find((it) => it.id === itemId);
  if (!item) return { changed: false };

  let fx;
  if (q.type === 'catch') {
    // Chỉ hứng được khi vật đang rơi ngang người
    const progress = (now - item.spawnAt) / q.fallMs;
    const inWindow = progress >= CATCH_FROM - CATCH_PROGRESS_SLACK && progress <= 1 + CATCH_PROGRESS_SLACK;
    if (!inWindow || !near(player, item.x, CATCH_RADIUS)) return { changed: false };
    p.count = item.kind === 'good' ? p.count + 1 : Math.max(0, p.count - 1);
    fx = { type: 'catch', by: player.id, kind: item.kind, x: item.x };
  } else {
    if (!near(player, item.x, COLLECT_RADIUS)) return { changed: false };
    p.count++;
  }

  p.items = p.items.filter((it) => it !== item);
  if (p.count >= q.goal) complete(p);
  return { changed: true, fx };
}

export function handleInteract(p, player, targetId, now) {
  const q = QUESTS[p.index];
  if (q?.type !== 'sync') return { changed: false };
  const target = q.targets.find((t) => t.id === targetId);
  if (!target || !near(player, target.x, INTERACT_RADIUS)) return { changed: false };

  // Giữ các lần bấm còn trong cửa sổ thời gian, mỗi người một lần mới nhất
  p.presses = p.presses.filter((pr) => now - pr.at <= SYNC_WINDOW_MS && pr.playerId !== player.id);
  p.presses.push({ playerId: player.id, targetId, at: now });

  const fx = { targetId, by: player.id };
  const [a, b] = p.presses;
  if (a && b && a.targetId !== b.targetId) {
    complete(p);
    return { changed: true, fx };
  }
  return { changed: false, fx };
}

// Gọi mỗi khi có người di chuyển: kiểm tra nhiệm vụ cùng đứng và nắm tay đi
export function checkPositions(p, room, now) {
  const q = QUESTS[p.index];
  const players = [...room.players.values()];
  if (players.length < 2) {
    p.platesSince = null;
    return { changed: false };
  }
  const [a, b] = players;

  if (q?.type === 'plates') {
    const [t1, t2] = q.targets;
    // Đứng yên nên vị trí trên server đã chính xác, chỉ nới rất ít
    const on = (pl, t) => Math.abs(pl.x - t.x) <= PLATE_RADIUS + 8;
    const both = (on(a, t1) && on(b, t2)) || (on(a, t2) && on(b, t1));
    if (!both) {
      p.platesSince = null;
      return { changed: false };
    }
    p.platesSince ??= now;
    if (now - p.platesSince >= q.holdMs) {
      complete(p);
      return { changed: true };
    }
  } else if (q?.type === 'holdWalk') {
    if (room.holding && a.x >= q.goalX && b.x >= q.goalX) {
      complete(p);
      return { changed: true };
    }
  }
  return { changed: false };
}
