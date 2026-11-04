// Logic nhiệm vụ phía server: server là trọng tài, client chỉ gửi yêu cầu
import {
  QUESTS, COLLECT_RADIUS, CATCH_RADIUS, CATCH_FROM, INTERACT_RADIUS, PLATE_RADIUS,
  SERVER_SLACK, SYNC_WINDOW_MS, fallX, questOf, sanitizeLevel, savedIndex,
} from '../shared/quests.js';
import { interactBlueprint, interactCarry, interactTie, layPlanks, moveBridge } from './bridge-quests.js';
import {
  CHALLENGE_TYPES, challengeItems, challengePublic, interactChallenge, moveChallenge, setupChallenge, tickChallenge,
} from './challenges.js';

// Vật rơi: nới thời điểm hứng vì mạng trễ; giữ thêm chút sau khi chạm đất rồi mới xoá
const CATCH_PROGRESS_SLACK = 0.18;
const LANDED_KEEP_MS = 400;
const ITEM_PREFIX = 'item:';

// level: độ khó người tạo phòng chọn; phòng đã có bản lưu thì giữ độ khó cũ
export function createProgress(saved, level) {
  const index = savedIndex(saved);
  const p = {
    index, count: 0, items: [], presses: [], platesSince: null, nextItemId: 1, lastSpawnAt: 0, seerId: null,
    plank: null, holder: null, sweepStart: 0, lastTieAt: 0, ch: null,
    level: sanitizeLevel(saved?.level ?? level),
  };
  setupQuest(p, Number.isInteger(saved?.count) ? saved.count : 0);
  return p;
}

// Trạng thái gửi cho từng người. Vật rơi có `age` để client tự tính vị trí, không phụ thuộc đồng hồ server.
// Nhiệm vụ bản vẽ: chỉ người cầm bản vẽ (seer) mới nhận được ván nào tốt/mục.
export function publicQuest(p, now = Date.now(), viewerId = null) {
  const q = questOf(p);
  const items = (q && challengeItems(p, q)) ?? p.items.map((it) => {
    if (q?.type === 'blueprint') return { id: it.id, x: it.x, kind: viewerId === p.seerId ? it.kind : undefined };
    if (!it.spawnAt) return { id: it.id, x: it.x };
    return { id: it.id, x: it.x, kind: it.kind, age: now - it.spawnAt, vx: it.vx, fallMs: it.fallMs };
  });
  const tie = q?.type === 'tie' ? { holder: p.holder, sweepAge: now - p.sweepStart } : undefined;
  const ch = p.ch && q ? challengePublic(p, q, now, viewerId) : undefined;
  return { index: p.index, level: p.level, count: p.count, items, seerId: p.seerId, plank: p.plank, tie, ch };
}

// Lưu theo tên nhiệm vụ để thêm/bớt nhiệm vụ sau này không làm lệch tiến độ
export function savedQuest(p) {
  return { questId: QUESTS[p.index]?.id ?? 'done', count: p.count, level: p.level };
}

function setupQuest(p, count = 0) {
  const q = questOf(p);
  p.count = 0;
  p.items = [];
  p.presses = [];
  p.platesSince = null;
  p.seerId = null;
  p.plank = null;
  p.holder = null;
  p.sweepStart = Date.now();
  p.ch = null;
  if (q && CHALLENGE_TYPES.includes(q.type)) {
    if (q.type === 'blindGoat' || q.type === 'nemcon') p.count = Math.max(0, Math.min(q.goal - 1, count));
    setupChallenge(p, q, Date.now());
    return;
  }
  if (!['collect', 'catch', 'blueprint', 'carry'].includes(q?.type)) return;
  p.count = Math.max(0, Math.min(q.goal - 1, count));
  if (q.type === 'collect') p.items = q.fixed.slice(p.count).map((x) => ({ id: p.nextItemId++, x }));
  if (q.type === 'blueprint') layPlanks(p, q);
  if (q.type === 'carry') p.plank = { x: q.pileX, carriers: null };
}

// Thả một vật rơi quanh vị trí của hai người
function spawnFalling(p, q, room, now) {
  const xs = [...room.players.values()].map((pl) => pl.x);
  const [min, max] = q.range;
  const lo = Math.max(min, Math.min(...xs) - q.spreadX);
  const hi = Math.min(max, Math.max(...xs) + q.spreadX);
  const x = Math.round(lo + Math.random() * Math.max(0, hi - lo));
  // Hoa vàng +3 hiếm và rơi rất nhanh; vật rơi theo gió đang thổi
  const roll = Math.random();
  const kind = roll < (q.goldRatio ?? 0) ? 'gold' : roll < (q.goldRatio ?? 0) + q.badRatio ? 'bad' : 'good';
  const fallMs = kind === 'gold' ? q.goldFallMs : q.fallMs;
  p.items.push({ id: p.nextItemId++, x, kind, spawnAt: now, vx: p.wind ?? 0, fallMs });
  p.lastSpawnAt = now;
}

// Đổi hướng gió theo từng cơn
function tickWind(p, q, now) {
  if (!q.windMax || now < (p.nextWindAt ?? 0)) return;
  p.wind = Math.round((Math.random() * 2 - 1) * q.windMax);
  const [a, b] = q.windEveryMs;
  p.nextWindAt = now + a + Math.random() * (b - a);
}

// Chia vai "người biết bí mật" (bản vẽ / câu ca dao) khi đủ người mà người cũ không còn trong phòng
function ensureSeer(p, room) {
  if (room.players.has(p.seerId) || room.players.size < 2) return false;
  const ids = [...room.players.keys()];
  p.seerId = ids[Math.floor(Math.random() * ids.length)];
  return true;
}

// Gọi định kỳ. Trả về { changed, fx?, teleport? }
export function tickQuest(p, room, now, dtMs) {
  const q = questOf(p);
  if (!q || room.players.size === 0) return { changed: false };
  if (CHALLENGE_TYPES.includes(q.type)) {
    const seer = q.type === 'cadao' && ensureSeer(p, room);
    const res = finish(p, tickChallenge(p, q, room, now, dtMs));
    return seer ? { ...res, changed: true } : res;
  }
  return { changed: tickOther(p, q, room, now) };
}

// Hoàn thành nhiệm vụ nếu thử thách báo xong
function finish(p, res) {
  if (res.completed) complete(p);
  return res;
}

function tickOther(p, q, room, now) {
  if (q.type === 'blueprint') return ensureSeer(p, room);

  if (q.type === 'catch') {
    tickWind(p, q, now);
    const before = p.items.length;
    p.items = p.items.filter((it) => now - it.spawnAt <= it.fallMs + LANDED_KEEP_MS);
    let changed = p.items.length !== before;
    if (now - p.lastSpawnAt >= q.spawnMs) {
      spawnFalling(p, q, room, now);
      changed = true;
    }
    return changed;
  }

  // Người giữ ván rời phòng thì ván lỏng
  if (q.type === 'tie' && p.holder && !room.players.has(p.holder)) {
    p.holder = null;
    return true;
  }

  // Người khiêng rời phòng thì ván rơi
  if (q.type === 'carry' && p.plank.carriers && !p.plank.carriers.every((id) => room.players.has(id))) {
    p.plank.carriers = null;
    return true;
  }
  return false;
}

function complete(p) {
  p.index++;
  setupQuest(p);
}

const near = (player, x, radius) => Math.abs(player.x - x) <= radius + SERVER_SLACK;

// Mỗi hàm trả về { changed, fx? } để server biết cần báo gì cho cả phòng

export function handleCollect(p, player, itemId, now) {
  const q = questOf(p);
  if (q?.type !== 'collect' && q?.type !== 'catch') return { changed: false };
  const item = p.items.find((it) => it.id === itemId);
  if (!item) return { changed: false };

  let fx;
  if (q.type === 'catch') {
    // Chỉ hứng được khi vật đang rơi ngang người (vật bị gió thổi lệch theo thời gian)
    const age = now - item.spawnAt;
    const progress = age / item.fallMs;
    const inWindow = progress >= CATCH_FROM - CATCH_PROGRESS_SLACK && progress <= 1 + CATCH_PROGRESS_SLACK;
    const x = fallX(item, Math.min(age, item.fallMs));
    if (!inWindow || !near(player, x, CATCH_RADIUS)) return { changed: false };
    const gain = { good: 1, gold: 3, bad: -1 }[item.kind];
    p.count = Math.max(0, p.count + gain);
    fx = { type: 'catch', by: player.id, kind: item.kind, x };
  } else {
    if (!near(player, item.x, COLLECT_RADIUS)) return { changed: false };
    p.count++;
  }

  p.items = p.items.filter((it) => it !== item);
  if (p.count >= q.goal) complete(p);
  return { changed: true, fx };
}

export function handleInteract(p, player, targetId, now, room) {
  const q = questOf(p);
  if (q && CHALLENGE_TYPES.includes(q.type)) return finish(p, interactChallenge(p, q, player, targetId, room, now));
  if (q?.type === 'blueprint') {
    if (!targetId.startsWith(ITEM_PREFIX)) return { changed: false };
    const item = p.items.find((it) => it.id === Number(targetId.slice(ITEM_PREFIX.length)));
    return item ? finish(p, interactBlueprint(p, q, player, item)) : { changed: false };
  }
  if (q?.type === 'carry') return targetId === 'plank' ? interactCarry(p, q, player, room, now) : { changed: false };
  if (q?.type === 'tie') return finish(p, interactTie(p, q, player, targetId, now));

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
  const q = questOf(p);
  if (q && CHALLENGE_TYPES.includes(q.type)) return finish(p, moveChallenge(p, q, room, now));
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
  } else if (q?.type === 'carry' || q?.type === 'tie') {
    return finish(p, moveBridge(p, q, room, a, b));
  } else if (q?.type === 'holdWalk') {
    if (room.holding && a.x >= q.goalX && b.x >= q.goalX) {
      complete(p);
      return { changed: true };
    }
  }
  return { changed: false };
}
