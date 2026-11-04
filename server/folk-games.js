// Trò chơi dân gian ở Cổng Hoa Đào: bịt mắt bắt dê, ném còn, lật thẻ hoa, kéo co.
// Mỗi hàm trả về { changed, fx?, completed? }. Thông tin bí mật chỉ gửi cho người được phép thấy.
import { INTERACT_RADIUS, SERVER_SLACK } from '../shared/quests.js';
import { NONE, RESTART_DELAY_MS, START_ZONE, bothAtStart, handOk, pair, rand, shuffle } from './challenge-utils.js';
import { SIGNALS, goatPublic, grabGoat, setupGoat, signalGoat, tickBlindGoat } from './folk-goat.js';
import { interactNemcon, nemconPublic, setupNemcon, tickNemcon } from './folk-nemcon.js';

export const FOLK_TYPES = ['blindGoat', 'nemcon', 'memory', 'tug'];


// ---------- Khởi tạo ----------
export function setupFolk(p, q, now) {
  switch (q.type) {
    case 'blindGoat':
      setupGoat(p, q, now);
      break;
    case 'nemcon':
      setupNemcon(p, q, now);
      break;
    case 'memory': {
      const flowers = q.flowers.slice(0, q.pairs);
      const kinds = shuffle(flowers.flatMap((f) => [f.id, f.id]));
      p.items = kinds.map((kind, i) => ({ id: p.nextItemId++, x: q.slotStart + i * q.slotGap, kind, state: 'down' }));
      p.ch = { up: [], lastBy: null, hideAt: null, goal: q.pairs, misses: 0, reshuffle: false };
      p.count = 0;
      break;
    }
    case 'tug':
      p.ch = { phase: 'idle', s: 0, cueAt: null, nextCueAt: 0, presses: {} };
      p.count = 0;
      break;
    default:
  }
}

// ---------- Trạng thái gửi cho từng người ----------
export function folkPublic(p, q, now, viewerId) {
  const ch = p.ch;
  switch (q.type) {
    case 'blindGoat':
      return goatPublic(ch, q, now, viewerId);
    case 'nemcon':
      return nemconPublic(ch, now, viewerId);
    case 'memory':
      return { lastBy: ch.lastBy, goal: ch.goal, misses: ch.misses, maxMisses: q.maxMisses };
    case 'tug':
      return {
        phase: ch.phase, s: ch.s, cueAge: ch.cueAt ? now - ch.cueAt : undefined, cueFake: ch.cueAt ? ch.cueFake : undefined,
        window: ch.window, readyIn: Math.max(0, (ch.readyAt ?? 0) - now),
      };
    default:
      return undefined;
  }
}

export function folkItems(p, q) {
  // Thẻ úp thì không gửi loại hoa
  if (q.type === 'memory') return p.items.map(({ id, x, state, kind }) => ({ id, x, state, kind: state === 'down' ? undefined : kind }));
  return null;
}

// ---------- Lật thẻ hoa ----------
function tickMemory(p, now) {
  const ch = p.ch;
  if (!ch.hideAt || now < ch.hideAt) return NONE;
  for (const it of p.items) if (ch.up.includes(it.id)) it.state = 'down';
  ch.up = [];
  ch.hideAt = null;
  if (!ch.reshuffle) return { changed: true };
  // Sai quá nhiều: xáo lại các thẻ còn úp
  const down = p.items.filter((it) => it.state === 'down');
  const kinds = shuffle(down.map((it) => it.kind));
  down.forEach((it, i) => {
    it.kind = kinds[i];
  });
  ch.reshuffle = false;
  ch.misses = 0;
  return { changed: true, fx: { type: 'reshuffle' } };
}

function flipCard(p, q, player, targetId, now) {
  const ch = p.ch;
  const card = p.items.find((it) => `item:${it.id}` === targetId);
  if (!card || card.state !== 'down' || ch.hideAt) return NONE;
  if (Math.abs(player.x - card.x) > INTERACT_RADIUS + SERVER_SLACK) return NONE;
  if (ch.lastBy === player.id) return { changed: false, fx: { type: 'turn', by: player.id } };
  card.state = 'up';
  ch.up.push(card.id);
  ch.lastBy = player.id;
  if (ch.up.length < 2) return { changed: true };
  const [a, b] = ch.up.map((id) => p.items.find((it) => it.id === id));
  if (a.kind === b.kind) {
    a.state = 'done';
    b.state = 'done';
    ch.up = [];
    p.count++;
    return { changed: true, fx: { type: 'match', ok: true, kind: a.kind, x: b.x }, completed: p.count >= ch.goal };
  }
  ch.hideAt = now + q.showMs;
  ch.misses++;
  if (q.maxMisses && ch.misses >= q.maxMisses) ch.reshuffle = true;
  return { changed: true, fx: { type: 'match', ok: false, x: b.x, reshuffle: ch.reshuffle } };
}

// ---------- Kéo co ----------
// Càng gần thắng nhịp hô càng nhanh, cửa sổ bấm càng hẹp
const tugRush = (q, ch) => 1 - q.rush * Math.max(0, ch.s);

function settleCue(p, q, now) {
  const ch = p.ch;
  if (ch.cueFake) {
    // Hô giả: không ai bấm là đúng
    ch.cueAt = null;
    ch.cueFake = false;
    ch.presses = {};
    ch.nextCueAt = now + rand(...q.cueGapMs) * tugRush(q, ch);
    return { changed: true };
  }
  const times = Object.values(ch.presses);
  const ok = times.length === 2 && Math.abs(times[0] - times[1]) <= q.syncMs;
  ch.s = Math.min(1, ch.s + (ok ? q.step : -q.slip));
  ch.cueAt = null;
  ch.presses = {};
  ch.nextCueAt = now + rand(...q.cueGapMs) * tugRush(q, ch);
  p.count = Math.round(Math.max(0, ch.s) * 100);
  if (ch.s >= 1) return { changed: true, fx: { type: 'pull', ok: true }, completed: true };
  if (ch.s <= -1) {
    ch.s = 0;
    p.count = 0;
    return { changed: true, fx: { type: 'fail', reason: 'lost' } };
  }
  return { changed: true, fx: { type: 'pull', ok } };
}

function tickTug(p, q, room, now) {
  const ch = p.ch;
  if (ch.phase === 'idle') {
    if (now < (ch.readyAt ?? 0) || !handOk(room) || !bothAtStart(room, q.startX)) return NONE;
    ch.phase = 'active';
    ch.nextCueAt = now + 1200;
    return { changed: true, fx: { type: 'start', quest: q.type } };
  }
  if (!handOk(room) || pair(room).some((pl) => Math.abs(pl.x - q.startX) > START_ZONE + 40)) {
    Object.assign(ch, { phase: 'idle', s: 0, cueAt: null, presses: {}, readyAt: now + RESTART_DELAY_MS });
    p.count = 0;
    return { changed: true, fx: { type: 'fail', reason: 'drop' } };
  }
  if (!ch.cueAt && now >= ch.nextCueAt) {
    ch.cueAt = now;
    ch.cueFake = Math.random() < q.fakeChance;
    ch.window = Math.round(q.cueWindowMs * tugRush(q, ch));
    ch.presses = {};
    return { changed: true };
  }
  if (ch.cueAt && now - ch.cueAt > ch.window) return settleCue(p, q, now);
  return NONE;
}

function pullRope(p, q, player, now) {
  const ch = p.ch;
  if (ch.phase !== 'active') return NONE;
  if (!ch.cueAt) {
    // Kéo khi chưa hô: bị đội kia kéo lại
    ch.s = Math.max(-1, ch.s - q.slip);
    p.count = Math.round(Math.max(0, ch.s) * 100);
    return { changed: true, fx: { type: 'early', by: player.id } };
  }
  if (ch.cueFake) {
    // Bấm khi hô "DỐ!" giả: bị đội kia kéo lại
    ch.s = Math.max(-1, ch.s - q.slip);
    p.count = Math.round(Math.max(0, ch.s) * 100);
    ch.cueAt = null;
    ch.cueFake = false;
    ch.nextCueAt = now + rand(...q.cueGapMs) * tugRush(q, ch);
    return { changed: true, fx: { type: 'fooled', by: player.id } };
  }
  ch.presses[player.id] ??= now;
  if (Object.keys(ch.presses).length === 2) return settleCue(p, q, now);
  return NONE;
}

// ---------- Điểm vào ----------
export function tickFolk(p, q, room, now) {
  if (q.type === 'blindGoat') return tickBlindGoat(p, q, room, now);
  if (q.type === 'nemcon') return tickNemcon(p, room);
  if (q.type === 'memory') return tickMemory(p, now);
  if (q.type === 'tug') return tickTug(p, q, room, now);
  return NONE;
}

export function interactFolk(p, q, player, targetId, room, now) {
  if (q.type === 'blindGoat' && targetId === 'grab') return grabGoat(p, q, player, room, now);
  if (q.type === 'blindGoat' && targetId in SIGNALS) return signalGoat(p, player, targetId, now);
  if (q.type === 'nemcon') return interactNemcon(p, q, player, targetId, room, now);
  if (q.type === 'memory') return flipCard(p, q, player, targetId, now);
  if (q.type === 'tug' && targetId === 'pull') return pullRope(p, q, player, now);
  return NONE;
}
