// Bịt mắt bắt dê: dê thật + dê bù nhìn, dê giật mình chạy, nút ra hiệu của người dẫn đường
import { SERVER_SLACK, goatX } from '../shared/quests.js';
import { NONE, ensureRole, otherOf, pair, rand } from './challenge-utils.js';

export const SIGNALS = { 'sig:left': 'left', 'sig:right': 'right', 'sig:stop': 'stop', 'sig:grab': 'grab' };
const SIGNAL_GAP_MS = 250;

// goats[0] là dê thật, các con sau là dê bù nhìn (chộp nhầm bị −1)
export function setupGoat(p, q, now) {
  const goats = Array.from({ length: 1 + q.decoys }, (_, i) => ({
    x0: rand(...q.area), tx: rand(...q.area), at: now, decoy: i > 0, speed: q.goatSpeed * (i > 0 ? 0.8 : 1), nextTurnAt: now,
  }));
  p.ch = { blindId: null, goats, goat: goats[0], fledAt: 0 };
}

// Người bịt mắt không được biết dê ở đâu
export function goatPublic(ch, q, now, viewerId) {
  const goats = viewerId === ch.blindId ? undefined
    : ch.goats.map((g) => ({ x0: g.x0, tx: g.tx, age: now - g.at, speed: g.speed, decoy: g.decoy }));
  return { blindId: ch.blindId, goats };
}

const FLEE_COOLDOWN_MS = 1500;

function moveGoat(g, q, now, awayFrom = []) {
  g.x0 = goatX(q, g, now - g.at);
  g.at = now;
  g.speed = q.goatSpeed * (g.decoy ? 0.8 : 1);
  // Đổi hướng ngẫu nhiên; sau khi bị bắt thì chạy ra xa người chơi
  let tx = rand(...q.area);
  for (let i = 0; i < 10 && awayFrom.some((x) => Math.abs(x - tx) < 180); i++) tx = rand(...q.area);
  g.tx = Math.round(tx);
  g.nextTurnAt = now + rand(...q.wanderMs);
}

export function tickBlindGoat(p, q, room, now) {
  const ch = p.ch;
  const blind = ensureRole(room, ch.blindId);
  let changed = blind !== ch.blindId;
  ch.blindId = blind;
  for (const g of ch.goats) {
    if (now >= g.nextTurnAt) {
      moveGoat(g, q, now);
      changed = true;
    }
  }
  // Dê thật giật mình khi người bịt mắt lại gần: chạy nhanh ra xa
  const blindPl = room.players.get(ch.blindId);
  const g = ch.goat;
  const gx = goatX(q, g, now - g.at);
  if (q.fleeRadius && blindPl && Math.abs(blindPl.x - gx) < q.fleeRadius && now - ch.fledAt > FLEE_COOLDOWN_MS) {
    const away = Math.sign(gx - blindPl.x) || 1;
    g.x0 = gx;
    g.at = now;
    g.tx = Math.round(Math.max(q.area[0], Math.min(q.area[1], gx + away * rand(120, 220))));
    g.speed = q.fleeSpeed;
    g.nextTurnAt = now + rand(...q.wanderMs);
    ch.fledAt = now;
    changed = true;
  }
  return { changed };
}

// Người dẫn đường bấm nút ra hiệu: báo cho cả phòng (người bịt mắt thấy mũi tên to)
export function signalGoat(p, player, targetId, now) {
  const ch = p.ch;
  if (player.id === ch.blindId || now - (ch.lastSignalAt ?? 0) < SIGNAL_GAP_MS) return NONE;
  ch.lastSignalAt = now;
  return { changed: false, fx: { type: 'signal', dir: SIGNALS[targetId], by: player.id } };
}

export function grabGoat(p, q, player, room, now) {
  const ch = p.ch;
  if (player.id !== ch.blindId) return NONE;
  const reach = q.grabRadius + SERVER_SLACK / 2;
  const caught = ch.goats.find((g) => Math.abs(player.x - goatX(q, g, now - g.at)) <= reach);
  if (!caught) return { changed: false, fx: { type: 'goat', ok: false, by: player.id } };
  const gx = goatX(q, caught, now - caught.at);
  const away = pair(room).map((pl) => pl.x);
  if (caught.decoy) {
    // Chộp nhầm dê bù nhìn
    p.count = Math.max(0, p.count - 1);
    moveGoat(caught, q, now, away);
    return { changed: true, fx: { type: 'goat', ok: false, decoy: true, by: player.id, x: gx } };
  }
  p.count++;
  ch.blindId = otherOf(room, player.id)?.id ?? null; // bắt được thì đổi vai
  for (const g of ch.goats) moveGoat(g, q, now, away);
  return { changed: true, fx: { type: 'goat', ok: true, by: player.id, x: gx }, completed: p.count >= q.goal };
}
