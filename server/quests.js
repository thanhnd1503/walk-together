// Logic nhiệm vụ phía server: server là trọng tài, client chỉ gửi yêu cầu
import {
  QUESTS, COLLECT_RADIUS, CATCH_RADIUS, CATCH_FROM, INTERACT_RADIUS, PLATE_RADIUS,
  SYNC_WINDOW_MS, SERVER_SLACK, tieNeedle, tieSweepMs,
} from '../shared/quests.js';

// Vật rơi: nới thời điểm hứng vì mạng trễ; giữ thêm chút sau khi chạm đất rồi mới xoá
const CATCH_PROGRESS_SLACK = 0.18;
const LANDED_KEEP_MS = 400;
const ITEM_PREFIX = 'item:';
const TIE_COOLDOWN_MS = 400;
const TIE_LAG_MS = 150; // người bấm thấy kim trễ hơn server một chút vì mạng
const TIE_ZONE_SLACK = 0.04;
const HOLD_RADIUS = INTERACT_RADIUS + 10; // người giữ ván đứng yên nên vị trí trên server đã chính xác

export function createProgress(saved) {
  const index = Number.isInteger(saved?.index) ? Math.max(0, Math.min(QUESTS.length, saved.index)) : 0;
  const p = {
    index, count: 0, items: [], presses: [], platesSince: null, nextItemId: 1, lastSpawnAt: 0, seerId: null,
    plank: null, holder: null, sweepStart: 0, lastTieAt: 0,
  };
  setupQuest(p, Number.isInteger(saved?.count) ? saved.count : 0);
  return p;
}

// Trạng thái gửi cho từng người. Vật rơi có `age` để client tự tính vị trí, không phụ thuộc đồng hồ server.
// Nhiệm vụ bản vẽ: chỉ người cầm bản vẽ (seer) mới nhận được ván nào tốt/mục.
export function publicQuest(p, now = Date.now(), viewerId = null) {
  const q = QUESTS[p.index];
  const items = p.items.map((it) => {
    if (q?.type === 'blueprint') return { id: it.id, x: it.x, kind: viewerId === p.seerId ? it.kind : undefined };
    return it.spawnAt ? { id: it.id, x: it.x, kind: it.kind, age: now - it.spawnAt } : { id: it.id, x: it.x };
  });
  const tie = q?.type === 'tie' ? { holder: p.holder, sweepAge: now - p.sweepStart } : undefined;
  return { index: p.index, count: p.count, items, seerId: p.seerId, plank: p.plank, tie };
}

export function savedQuest(p) {
  return { index: p.index, count: p.count };
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Bày lại ván ở vị trí ngẫu nhiên dọc bờ suối, không trùng mốc, `good` tấm tốt còn lại là ván mục
function layPlanks(p, q) {
  const [min, max] = q.range;
  const xs = [];
  for (let tries = 0; xs.length < q.count && tries < 2000; tries++) {
    const x = Math.round(min + Math.random() * (max - min));
    const clear = xs.every((o) => Math.abs(o - x) >= q.minGap) && q.landmarks.every((m) => Math.abs(m.x - x) >= 22);
    if (clear) xs.push(x);
  }
  const kinds = shuffle(xs.map((_, i) => (i < q.good ? 'good' : 'bad')));
  p.items = xs.sort((a, b) => a - b).map((x, i) => ({ id: p.nextItemId++, x, kind: kinds[i] }));
}

function setupQuest(p, count = 0) {
  const q = QUESTS[p.index];
  p.count = 0;
  p.items = [];
  p.presses = [];
  p.platesSince = null;
  p.seerId = null;
  p.plank = null;
  p.holder = null;
  p.sweepStart = Date.now();
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
  const kind = Math.random() < q.badRatio ? 'bad' : 'good';
  p.items.push({ id: p.nextItemId++, x, kind, spawnAt: now });
  p.lastSpawnAt = now;
}

// Chia bản vẽ cho một trong hai người khi đủ người mà người cầm cũ không còn trong phòng
function ensureSeer(p, room) {
  if (room.players.has(p.seerId) || room.players.size < 2) return false;
  const ids = [...room.players.keys()];
  p.seerId = ids[Math.floor(Math.random() * ids.length)];
  return true;
}

// Gọi định kỳ. Trả về true nếu có thay đổi cần báo cho phòng.
export function tickQuest(p, room, now) {
  const q = QUESTS[p.index];
  if (!q || room.players.size === 0) return false;

  if (q.type === 'blueprint') return ensureSeer(p, room);

  if (q.type === 'catch') {
    const before = p.items.length;
    p.items = p.items.filter((it) => now - it.spawnAt <= q.fallMs + LANDED_KEEP_MS);
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

// Bản vẽ: chỉ người KHÔNG cầm bản vẽ mới nhặt được (người cầm bản vẽ phải nhắn tin chỉ đường)
function interactBlueprint(p, q, player, item) {
  if (player.id === p.seerId || !near(player, item.x, INTERACT_RADIUS)) return { changed: false };
  p.count = item.kind === 'good' ? p.count + 1 : Math.max(0, p.count - 1);
  p.items = p.items.filter((it) => it !== item);
  const fx = { type: 'catch', by: player.id, kind: item.kind, x: item.x };
  if (p.count >= q.goal) {
    complete(p);
  } else if (p.items.filter((it) => it.kind === 'good').length < q.goal - p.count) {
    layPlanks(p, q); // không đủ ván tốt để hoàn thành thì có lứa ván mới
  }
  return { changed: true, fx };
}

// Khiêng ván: hai người đứng hai bên ván, bấm trong cửa sổ thời gian thì nâng lên
function interactCarry(p, q, player, room, now) {
  const plank = p.plank;
  if (plank.carriers || !near(player, plank.x, q.reach)) return { changed: false };
  p.presses = p.presses.filter((pr) => now - pr.at <= SYNC_WINDOW_MS && pr.playerId !== player.id);
  p.presses.push({ playerId: player.id, at: now });
  const fx = { type: 'lift', by: player.id };
  if (p.presses.length < 2) return { changed: false, fx };

  const [a, b] = p.presses.map((pr) => room.players.get(pr.playerId));
  const opposite = a && b && (a.x - plank.x) * (b.x - plank.x) < 0;
  const gap = a && b ? Math.abs(a.x - b.x) : 0;
  if (!opposite || gap < q.minGap || gap > q.maxGap) return { changed: false, fx: { type: 'liftFail', by: player.id } };
  plank.carriers = [a.id, b.id];
  plank.x = (a.x + b.x) / 2;
  p.presses = [];
  return { changed: true, fx: { type: 'lifted' } };
}

// Buộc lạt: 'holdOn'/'holdOff' ở chỗ giữ ván; 'tie' ở chỗ buộc khi có người KHÁC đang giữ và kim trong vùng xanh
function interactTie(p, q, player, action, now) {
  const [holdSpot, tieSpot] = q.targets;
  if (action === 'holdOff') {
    if (p.holder !== player.id) return { changed: false };
    p.holder = null;
    return { changed: true };
  }
  if (action === 'holdOn') {
    if (p.holder || Math.abs(player.x - holdSpot.x) > HOLD_RADIUS) return { changed: false };
    p.holder = player.id;
    return { changed: true, fx: { type: 'hold', by: player.id } };
  }
  if (action !== 'tie' || !near(player, tieSpot.x, INTERACT_RADIUS) || now - p.lastTieAt < TIE_COOLDOWN_MS) {
    return { changed: false };
  }
  p.lastTieAt = now;
  const [lo, hi] = q.zone;
  const inZone = (age) => {
    const n = tieNeedle(q, p.count, age);
    return n >= lo - TIE_ZONE_SLACK && n <= hi + TIE_ZONE_SLACK;
  };
  const age = now - p.sweepStart;
  const held = p.holder && p.holder !== player.id;
  if (!held || !(inZone(age) || inZone(age - TIE_LAG_MS))) {
    p.count = Math.max(0, p.count - 1);
    return { changed: true, fx: { type: 'tie', ok: false, reason: held ? 'miss' : 'nohold', by: player.id } };
  }
  p.count++;
  const fx = { type: 'tie', ok: true, by: player.id, x: tieSpot.x };
  if (p.count >= q.goal) {
    complete(p);
  } else {
    // Kim chạy lại từ đầu với tốc độ mới, giữ đúng vị trí hiện tại cho mượt
    const n = tieNeedle(q, p.count - 1, age);
    p.sweepStart = now - (n / 2) * tieSweepMs(q, p.count);
  }
  return { changed: true, fx };
}

export function handleInteract(p, player, targetId, now, room) {
  const q = QUESTS[p.index];
  if (q?.type === 'blueprint') {
    if (!targetId.startsWith(ITEM_PREFIX)) return { changed: false };
    const item = p.items.find((it) => it.id === Number(targetId.slice(ITEM_PREFIX.length)));
    return item ? interactBlueprint(p, q, player, item) : { changed: false };
  }
  if (q?.type === 'carry') return targetId === 'plank' ? interactCarry(p, q, player, room, now) : { changed: false };
  if (q?.type === 'tie') return interactTie(p, q, player, targetId, now);

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
  } else if (q?.type === 'carry' && p.plank.carriers) {
    // Đang khiêng: giữ khoảng cách vừa phải, ván ở giữa hai người
    const gap = Math.abs(a.x - b.x);
    if (gap < q.minGap || gap > q.maxGap) {
      p.plank.carriers = null;
      return { changed: true, fx: { type: 'drop', x: p.plank.x } };
    }
    p.plank.x = (a.x + b.x) / 2;
    if (p.plank.x >= q.deliverX) {
      p.count++;
      const fx = { type: 'deliver', x: p.plank.x };
      if (p.count >= q.goal) complete(p);
      else p.plank = { x: q.pileX, carriers: null };
      return { changed: true, fx };
    }
  } else if (q?.type === 'tie' && p.holder) {
    // Người giữ ván bỏ đi chỗ khác thì ván lỏng
    const holder = room.players.get(p.holder);
    if (!holder || Math.abs(holder.x - q.targets[0].x) > HOLD_RADIUS) {
      p.holder = null;
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
