// Thử thách ở Cổng Hoa Đào: người gỗ, né lá, ca dao, chụp ảnh (+ chia việc cho trò dân gian ở folk-games.js).
// Mỗi hàm trả về { changed, fx?, teleport?, photo?, completed? }; quests.js lo phần hoàn thành nhiệm vụ.
import { INTERACT_RADIUS, SERVER_SLACK, SYNC_WINDOW_MS, CATCH_FROM, SIMILAR_WORDS } from '../shared/quests.js';
import { NONE, backToStart, bothAtStart, handOk, pair, pick, rand, shuffle } from './challenge-utils.js';
import { BRIDGE_TYPES, bridgeItems, bridgePublic, interactBridge, setupBridge, tickBridge } from './bridge-games.js';
import { FOLK_TYPES, folkItems, folkPublic, interactFolk, setupFolk, tickFolk } from './folk-games.js';

export const CHALLENGE_TYPES = ['statue', 'leafWalk', 'cadao', 'photo', ...FOLK_TYPES, ...BRIDGE_TYPES];

const LANDED_KEEP_MS = 300;

// ---------- Khởi tạo ----------
export function setupChallenge(p, q, now) {
  if (FOLK_TYPES.includes(q.type)) {
    setupFolk(p, q, now);
    return;
  }
  if (BRIDGE_TYPES.includes(q.type)) {
    setupBridge(p, q, now);
    return;
  }
  switch (q.type) {
    case 'statue':
      p.ch = { phase: 'idle', cycle: 'go', cycleAt: now, cycleMs: rand(...q.goMs), snap: null };
      break;
    case 'leafWalk':
      p.ch = { phase: 'idle' };
      break;
    case 'cadao': {
      const verse = pick(q.verses);
      const words = verse.split(' ');
      // Chữ mồi: một số là chữ gần giống chữ trong câu (đổi dấu/vần), còn lại là chữ ngẫu nhiên
      const similar = shuffle(words.map((w) => SIMILAR_WORDS[w.toLowerCase()]).filter(Boolean)).slice(0, q.similarDecoys);
      const random = shuffle(q.decoys.filter((d) => !words.includes(d))).slice(0, q.decoyCount - similar.length);
      const all = shuffle([...words, ...similar, ...random]);
      p.items = all.map((word, i) => ({ id: p.nextItemId++, x: q.slots[0] + i * q.slotGap, word, lit: false }));
      p.ch = { verse, words, lastBy: null };
      p.count = 0;
      break;
    }
    case 'photo':
      p.ch = { presses: [] };
      break;
    default:
  }
}

// ---------- Trạng thái gửi cho từng người ----------
export function challengePublic(p, q, now, viewerId) {
  if (FOLK_TYPES.includes(q.type)) return folkPublic(p, q, now, viewerId);
  if (BRIDGE_TYPES.includes(q.type)) return bridgePublic(p, q, now, viewerId);
  const ch = p.ch;
  switch (q.type) {
    case 'statue':
      return { phase: ch.phase, cycle: ch.cycle, cycleAge: now - ch.cycleAt, cycleMs: ch.cycleMs, fake: ch.fake };
    case 'leafWalk':
      return { phase: ch.phase };
    case 'cadao':
      // Chỉ người biết câu mới nhận được câu ca dao
      return { verse: viewerId && viewerId === p.seerId ? ch.verse : undefined, lastBy: ch.lastBy, goal: ch.words.length };
    default:
      return undefined;
  }
}

export function challengeItems(p, q) {
  if (FOLK_TYPES.includes(q.type)) return folkItems(p, q);
  if (BRIDGE_TYPES.includes(q.type)) return bridgeItems(p, q);
  if (q.type === 'cadao') return p.items.map(({ id, x, word, lit }) => ({ id, x, word, lit }));
  return null;
}

// Hai người đã đi được bao nhiêu phần đường (0 → 1)
const progressOf = (room, from, to) => {
  const mid = pair(room).reduce((sum, pl) => sum + pl.x, 0) / Math.max(1, room.players.size);
  return Math.max(0, Math.min(1, (mid - from) / (to - from)));
};

// ---------- Người gỗ ----------
function nextCycle(ch, q, room, now) {
  const order = { go: 'chant', chant: 'freeze', freeze: 'go' };
  // Gần đích cây hô nhanh hơn; thỉnh thoảng hô "Một… hai…" rồi quay luôn
  const speed = 1 - q.rush * progressOf(room, q.startX, q.goalX);
  ch.cycle = order[ch.cycle];
  ch.cycleAt = now;
  ch.fake = ch.cycle === 'chant' && Math.random() < q.fakeChance;
  const chant = q.chantMs * speed * (ch.fake ? 0.45 : 1);
  ch.cycleMs = ch.cycle === 'go' ? rand(...q.goMs) * speed : ch.cycle === 'chant' ? chant : q.freezeMs;
  ch.snap = null;
}

function checkStatue(p, q, room, now) {
  const ch = p.ch;
  if (ch.phase === 'idle') {
    if (now < (ch.readyAt ?? 0) || !handOk(room) || !bothAtStart(room, q.startX)) return NONE;
    ch.phase = 'active';
    ch.cycle = 'go';
    ch.cycleAt = now;
    ch.cycleMs = rand(...q.goMs);
    return { changed: true, fx: { type: 'start', quest: q.type } };
  }
  if (!handOk(room)) return backToStart(p, q, room, now, 'drop');
  if (pair(room).every((pl) => pl.x >= q.goalX)) return { changed: true, completed: true };

  // Đang "đứng im": chụp vị trí sau một chút thời gian ân hạn, rồi ai lệch khỏi vị trí đó là thua
  if (ch.cycle === 'freeze' && now - ch.cycleAt >= q.graceMs) {
    if (!ch.snap) ch.snap = Object.fromEntries(pair(room).map((pl) => [pl.id, pl.x]));
    const mover = pair(room).find((pl) => Math.abs(pl.x - ch.snap[pl.id]) > q.moveTolerance);
    if (mover) return backToStart(p, q, room, now, 'moved', mover.id);
  }
  return NONE;
}

function tickStatue(p, q, room, now) {
  const ch = p.ch;
  if (ch.phase !== 'active') return checkStatue(p, q, room, now);
  if (now - ch.cycleAt >= ch.cycleMs) {
    nextCycle(ch, q, room, now);
    return { changed: true };
  }
  return checkStatue(p, q, room, now);
}

// ---------- Né lá ----------
function tickLeafWalk(p, q, room, now) {
  const ch = p.ch;
  if (ch.phase === 'idle') {
    if (now < (ch.readyAt ?? 0) || !handOk(room) || !bothAtStart(room, q.startX)) return NONE;
    ch.phase = 'active';
    p.lastSpawnAt = 0;
    return { changed: true, fx: { type: 'start', quest: q.type } };
  }
  if (!handOk(room)) return backToStart(p, q, room, now, 'drop');
  if (pair(room).every((pl) => pl.x >= q.endX)) return { changed: true, completed: true };

  // Lá rơi tới ngang người ai thì người đó bị trúng (server tự kiểm tra)
  for (const it of p.items) {
    const progress = (now - it.spawnAt) / it.fallMs;
    if (progress < CATCH_FROM || progress > 1) continue;
    const hit = pair(room).find((pl) => Math.abs(pl.x - it.x) <= q.hitRadius);
    if (hit) return backToStart(p, q, room, now, 'leaf', hit.id);
  }

  let changed = false;
  const before = p.items.length;
  p.items = p.items.filter((it) => now - it.spawnAt <= it.fallMs + LANDED_KEEP_MS);
  if (p.items.length !== before) changed = true;
  if (now - p.lastSpawnAt >= q.spawnMs) {
    p.lastSpawnAt = now;
    // Rải đều phía trước, không quá vạch đích; gần đích đoạn còn lại ngắn thì thả ít đi cho mật độ không dồn lại
    const mid = pair(room).reduce((s, pl) => s + pl.x, 0) / 2;
    const [a, b] = q.spawnAhead;
    const lo = Math.max(q.startX, mid + a);
    const hi = Math.min(q.endX, mid + b);
    if (hi > lo && Math.random() < (hi - lo) / (b - a)) {
      // Gần đích lá rơi nhanh hơn; thỉnh thoảng cả chùm 3 lá
      const fallMs = q.fallMs * (1 - q.rush * progressOf(room, q.startX, q.endX));
      const x = Math.round(rand(lo, hi));
      const xs = Math.random() < q.clusterChance ? [x - 24, x, x + 24] : [x];
      for (const lx of xs) p.items.push({ id: p.nextItemId++, x: lx, kind: 'bad', spawnAt: now, fallMs });
      changed = true;
    }
  }
  return { changed };
}

// ---------- Ca dao ----------
function interactCadao(p, q, player, targetId) {
  const item = p.items.find((it) => `item:${it.id}` === targetId);
  if (!item || item.lit || Math.abs(player.x - item.x) > INTERACT_RADIUS + SERVER_SLACK) return NONE;
  const ch = p.ch;
  if (p.count > 0 && ch.lastBy === player.id) return { changed: false, fx: { type: 'turn', by: player.id } };
  if (item.word !== ch.words[p.count]) {
    for (const it of p.items) it.lit = false;
    p.count = 0;
    ch.lastBy = null;
    return { changed: true, fx: { type: 'lantern', ok: false, by: player.id, x: item.x, word: item.word } };
  }
  item.lit = true;
  p.count++;
  ch.lastBy = player.id;
  const fx = { type: 'lantern', ok: true, by: player.id, x: item.x, word: item.word };
  return { changed: true, fx, completed: p.count >= ch.words.length };
}

// ---------- Chụp ảnh ----------
function interactPhoto(p, q, player, room, now) {
  if (Math.abs(player.x - q.frameX) > q.frameHalf + SERVER_SLACK) return NONE;
  const ch = p.ch;
  ch.presses = ch.presses.filter((pr) => now - pr.at <= SYNC_WINDOW_MS && pr.id !== player.id);
  ch.presses.push({ id: player.id, at: now });
  if (ch.presses.length < 2) return { changed: false, fx: { type: 'photoWait', by: player.id } };
  const inFrame = pair(room).every((pl) => Math.abs(pl.x - q.frameX) <= q.frameHalf + SERVER_SLACK / 2);
  if (!inFrame || !handOk(room)) return { changed: false, fx: { type: 'photoFail', by: player.id } };
  const photo = {
    at: new Date().toISOString(),
    scene: q.scene,
    people: pair(room).map((pl) => ({ name: pl.name, look: pl.look })),
  };
  return { changed: true, fx: { type: 'photo', photo }, photo, completed: true };
}

// ---------- Điểm vào ----------
export function tickChallenge(p, q, room, now, dtMs) {
  if (room.players.size === 0) return NONE;
  if (q.type === 'statue') return tickStatue(p, q, room, now);
  if (q.type === 'leafWalk') return tickLeafWalk(p, q, room, now);
  if (FOLK_TYPES.includes(q.type)) return tickFolk(p, q, room, now);
  if (BRIDGE_TYPES.includes(q.type)) return tickBridge(p, q, room, now, dtMs);
  return NONE;
}

// Gọi khi có người di chuyển (phản ứng nhanh hơn nhịp tick)
export function moveChallenge(p, q, room, now) {
  if (q.type === 'statue') return checkStatue(p, q, room, now);
  return NONE;
}

export function interactChallenge(p, q, player, targetId, room, now) {
  if (FOLK_TYPES.includes(q.type)) return interactFolk(p, q, player, targetId, room, now);
  if (BRIDGE_TYPES.includes(q.type)) return interactBridge(p, q, player, targetId, room, now);
  if (q.type === 'cadao') return interactCadao(p, q, player, targetId);
  if (q.type === 'photo' && targetId === 'photo') return interactPhoto(p, q, player, room, now);
  return NONE;
}
