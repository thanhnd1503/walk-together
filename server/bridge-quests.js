// Nhiệm vụ ở Cầu Tình Yêu: lấy gỗ tốt (bản vẽ), khiêng ván, buộc lạt tre.
// Trả về { changed, fx?, completed? }; quests.js lo phần hoàn thành nhiệm vụ.
import { INTERACT_RADIUS, SERVER_SLACK, SYNC_WINDOW_MS, tieNeedle, tieSweepMs } from '../shared/quests.js';

const TIE_COOLDOWN_MS = 400;
const TIE_LAG_MS = 150; // người bấm thấy kim trễ hơn server một chút vì mạng
const TIE_ZONE_SLACK = 0.04;
const HOLD_RADIUS = INTERACT_RADIUS + 10; // người giữ ván đứng yên nên vị trí trên server đã chính xác

const near = (player, x, radius) => Math.abs(player.x - x) <= radius + SERVER_SLACK;

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Bày lại ván ở vị trí ngẫu nhiên dọc bờ suối, không trùng mốc, `good` tấm tốt còn lại là ván mục
export function layPlanks(p, q) {
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

// Bản vẽ: chỉ người KHÔNG cầm bản vẽ mới nhặt được (người cầm bản vẽ phải nhắn tin chỉ đường)
export function interactBlueprint(p, q, player, item) {
  if (player.id === p.seerId || !near(player, item.x, INTERACT_RADIUS)) return { changed: false };
  p.count = item.kind === 'good' ? p.count + 1 : Math.max(0, p.count - 1);
  p.items = p.items.filter((it) => it !== item);
  const fx = { type: 'catch', by: player.id, kind: item.kind, x: item.x };
  if (p.count >= q.goal) return { changed: true, fx, completed: true };
  if (p.items.filter((it) => it.kind === 'good').length < q.goal - p.count) layPlanks(p, q); // không đủ ván tốt thì có lứa ván mới
  return { changed: true, fx };
}

// Khiêng ván: hai người đứng hai bên ván, bấm trong cửa sổ thời gian thì nâng lên
export function interactCarry(p, q, player, room, now) {
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
export function interactTie(p, q, player, action, now) {
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
  if (p.count >= q.goal) return { changed: true, fx, completed: true };
  // Kim chạy lại từ đầu với tốc độ mới, giữ đúng vị trí hiện tại cho mượt
  const n = tieNeedle(q, p.count - 1, age);
  p.sweepStart = now - (n / 2) * tieSweepMs(q, p.count);
  return { changed: true, fx };
}

// Gọi khi có người di chuyển: khiêng ván (giữ khoảng cách, giao ván) và buộc lạt (người giữ bỏ đi)
export function moveBridge(p, q, room, a, b) {
  if (q.type === 'carry' && p.plank.carriers) {
    const gap = Math.abs(a.x - b.x);
    if (gap < q.minGap || gap > q.maxGap) {
      p.plank.carriers = null;
      return { changed: true, fx: { type: 'drop', x: p.plank.x } };
    }
    p.plank.x = (a.x + b.x) / 2;
    if (p.plank.x >= q.deliverX) {
      p.count++;
      const fx = { type: 'deliver', x: p.plank.x };
      if (p.count >= q.goal) return { changed: true, fx, completed: true };
      p.plank = { x: q.pileX, carriers: null };
      return { changed: true, fx };
    }
  } else if (q.type === 'tie' && p.holder) {
    const holder = room.players.get(p.holder);
    if (!holder || Math.abs(holder.x - q.targets[0].x) > HOLD_RADIUS) {
      p.holder = null;
      return { changed: true };
    }
  }
  return { changed: false };
}
