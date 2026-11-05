// Thử thách ở Cầu Tình Yêu: câu cá koi, tâm đầu ý hợp, khoá tình yêu (+ chia việc cho bridge-rhythm.js).
// Mỗi hàm trả về { changed, fx?, teleport?, completed? }. Thông tin bí mật chỉ gửi cho người được phép thấy.
import { SERVER_SLACK, SYNC_WINDOW_MS, INTERACT_RADIUS } from '../shared/quests.js';
import { NONE, ensureRole, otherOf, rand, shuffle } from './challenge-utils.js';
import {
  RHYTHM_TYPES, interactRhythm, rhythmPublic, setupRhythm, tickRhythm,
} from './bridge-rhythm.js';

export const BRIDGE_TYPES = ['fishing', 'together', 'lock', ...RHYTHM_TYPES];

const CALL_GAP_MS = 300;
const SCARED_WAIT_MS = 1200; // giật hụt làm cá sợ, lâu hơn mới có cá tới

const near = (player, x, radius) => Math.abs(player.x - x) <= radius + SERVER_SLACK;

// ---------- Câu cá koi ----------
function newFish(ch, q, now, extra = 0) {
  ch.phase = 'wait';
  ch.kind = Math.random() < q.nibbleChance ? 'small' : 'koi';
  ch.nextAt = now + rand(...q.waitMs) + extra;
  ch.bobAt = null;
}

function setupFishing(p, q, now) {
  p.ch = { fisherId: null };
  newFish(p.ch, q, now);
}

// Người cầm cần chỉ thấy phao nhúc nhích, không biết cá gì
function fishingPublic(ch, now, viewerId) {
  const spotter = viewerId !== ch.fisherId;
  return {
    fisherId: ch.fisherId,
    phase: ch.phase,
    bobAge: ch.bobAt ? now - ch.bobAt : undefined,
    kind: spotter ? ch.kind : undefined,
    approachIn: spotter && ch.phase === 'wait' ? ch.nextAt - now : undefined,
  };
}

function tickFishing(p, q, room, now) {
  const ch = p.ch;
  const fisher = ensureRole(room, ch.fisherId);
  let changed = fisher !== ch.fisherId;
  ch.fisherId = fisher;
  if (ch.phase === 'wait' && now >= ch.nextAt) {
    ch.phase = 'bob';
    ch.bobAt = now;
    return { changed: true };
  }
  if (ch.phase === 'bob' && now - ch.bobAt >= q.biteMs) {
    const escaped = ch.kind === 'koi';
    newFish(ch, q, now);
    return { changed: true, fx: escaped ? { type: 'fish', ok: false, reason: 'escape' } : undefined };
  }
  return { changed };
}

function interactFishing(p, q, player, targetId, room, now) {
  const ch = p.ch;
  if (targetId === 'call') {
    // Người nhìn nước hô "Giật!" cho người cầm cần
    if (player.id === ch.fisherId || now - (ch.lastCallAt ?? 0) < CALL_GAP_MS) return NONE;
    ch.lastCallAt = now;
    return { changed: false, fx: { type: 'call', by: player.id } };
  }
  if (targetId !== 'pull' || player.id !== ch.fisherId || !near(player, q.fishX, q.reach)) return NONE;
  if (ch.phase !== 'bob') {
    newFish(ch, q, now, SCARED_WAIT_MS);
    return { changed: true, fx: { type: 'fish', ok: false, reason: 'early', by: player.id } };
  }
  if (ch.kind === 'small') {
    p.count = Math.max(0, p.count - q.nibblePenalty);
    newFish(ch, q, now);
    return { changed: true, fx: { type: 'fish', ok: false, reason: 'small', by: player.id, penalty: q.nibblePenalty } };
  }
  p.count++;
  ch.fisherId = otherOf(room, player.id)?.id ?? ch.fisherId; // câu được thì đổi vai
  newFish(ch, q, now);
  return { changed: true, fx: { type: 'fish', ok: true, by: player.id, x: q.fishX }, completed: p.count >= q.goal };
}

// ---------- Tâm đầu ý hợp ----------
function nextQuestion(ch, q) {
  ch.turn++;
  if (ch.turn >= ch.order.length) {
    ch.order = shuffle(ch.order);
    ch.turn = 0;
  }
  ch.qi = ch.order[ch.turn];
  ch.phase = 'choose';
  ch.picks = {};
  ch.revealAt = null;
}

function setupTogether(p, q) {
  const order = shuffle(q.questions.map((_, i) => i));
  p.ch = { order, turn: -1 };
  nextQuestion(p.ch, q);
}

// Chưa lật thì không ai biết người kia chọn gì
function togetherPublic(ch, viewerId) {
  const reveal = ch.phase === 'reveal';
  return {
    phase: ch.phase,
    qi: ch.qi,
    mine: ch.picks[viewerId],
    partnerPicked: Object.keys(ch.picks).some((id) => id !== viewerId),
    picks: reveal ? ch.picks : undefined,
    match: reveal ? ch.match : undefined,
  };
}

function tickTogether(p, q, now) {
  const ch = p.ch;
  if (ch.phase !== 'reveal' || now < ch.revealAt) return NONE;
  nextQuestion(ch, q);
  return { changed: true };
}

function pickAnswer(p, q, player, targetId, room, now) {
  const ch = p.ch;
  const i = Number(targetId.slice('post:'.length));
  if (ch.phase !== 'choose' || ch.picks[player.id] !== undefined || !Number.isInteger(i) || !q.posts[i]) return NONE;
  if (!near(player, q.posts[i], INTERACT_RADIUS)) return NONE;
  ch.picks[player.id] = i;
  const picks = Object.values(ch.picks);
  if (picks.length < 2 || room.players.size < 2) return { changed: true, fx: { type: 'picked', by: player.id } };
  ch.match = picks[0] === picks[1];
  p.count = Math.max(0, p.count + (ch.match ? 1 : -q.missPenalty));
  ch.phase = 'reveal';
  ch.revealAt = now + q.revealMs;
  const fx = { type: 'answer', ok: ch.match, penalty: ch.match ? 0 : q.missPenalty };
  return { changed: true, fx, completed: p.count >= q.goal };
}

// ---------- Khoá tình yêu ----------
const OWN_DIALS = 2; // người giữ vai "trái" xoay 2 ô đầu, người kia 2 ô sau

function newCode(ch, q) {
  const n = q.symbols.length;
  ch.code = q.dials.map(() => Math.floor(Math.random() * n));
  // Ô bắt đầu không trùng mã để không ai "ăn may"
  ch.dials = ch.code.map((c) => (c + 1 + Math.floor(Math.random() * (n - 1))) % n);
  ch.tries = 0;
  ch.presses = [];
}

function setupLock(p, q) {
  p.ch = { leftId: null, result: null };
  newCode(p.ch, q);
}

const ownsDial = (ch, playerId, i) => (i < OWN_DIALS) === (playerId === ch.leftId);

// Mỗi người chỉ biết mã của những ô mình KHÔNG xoay được
function lockPublic(ch, q, viewerId) {
  const known = ch.code.map((c, i) => (viewerId && ch.leftId && !ownsDial(ch, viewerId, i) ? c : null));
  return { leftId: ch.leftId, dials: ch.dials, known, tries: ch.tries, maxTries: q.maxTries, result: ch.result };
}

function tickLock(p, room) {
  const ch = p.ch;
  const left = ensureRole(room, ch.leftId);
  if (left === ch.leftId) return NONE;
  ch.leftId = left;
  return { changed: true };
}

function interactLock(p, q, player, targetId, room, now) {
  const ch = p.ch;
  if (!ch.leftId) return NONE;
  if (targetId.startsWith('dial:')) {
    const i = Number(targetId.slice('dial:'.length));
    if (!Number.isInteger(i) || !q.dials[i] || !near(player, q.dials[i], INTERACT_RADIUS)) return NONE;
    if (!ownsDial(ch, player.id, i)) return { changed: false, fx: { type: 'notMine', by: player.id } };
    ch.dials[i] = (ch.dials[i] + 1) % q.symbols.length;
    ch.result = null;
    return { changed: true };
  }
  if (targetId !== 'lock' || !near(player, q.lockX, q.lockRadius)) return NONE;
  ch.presses = ch.presses.filter((pr) => now - pr.at <= SYNC_WINDOW_MS && pr.id !== player.id);
  ch.presses.push({ id: player.id, at: now });
  if (ch.presses.length < 2) return { changed: false, fx: { type: 'lockWait', by: player.id } };
  ch.presses = [];
  const right = ch.dials.map((d, i) => d === ch.code[i]);
  if (right.every(Boolean)) return { changed: true, fx: { type: 'unlock', ok: true }, completed: true };
  ch.tries++;
  ch.result = {
    correct: q.feedback === 'count' ? right.filter(Boolean).length : undefined,
    each: q.feedback === 'each' ? right : undefined,
  };
  const fx = { type: 'unlock', ok: false, ...ch.result };
  if (q.maxTries && ch.tries >= q.maxTries) {
    // Sai quá nhiều lần: ổ khoá đổi mã mới
    newCode(ch, q);
    ch.result = null;
    fx.newCode = true;
  }
  return { changed: true, fx };
}

// ---------- Điểm vào ----------
export function setupBridge(p, q, now) {
  p.count = 0;
  if (q.type === 'fishing') setupFishing(p, q, now);
  else if (q.type === 'together') setupTogether(p, q);
  else if (q.type === 'lock') setupLock(p, q);
  else setupRhythm(p, q, now);
}

export function bridgePublic(p, q, now, viewerId) {
  if (q.type === 'fishing') return fishingPublic(p.ch, now, viewerId);
  if (q.type === 'together') return togetherPublic(p.ch, viewerId);
  if (q.type === 'lock') return lockPublic(p.ch, q, viewerId);
  return rhythmPublic(p, q, now, viewerId);
}

export const bridgeItems = () => [];

export function tickBridge(p, q, room, now, dtMs) {
  if (q.type === 'fishing') return tickFishing(p, q, room, now);
  if (q.type === 'together') return tickTogether(p, q, now);
  if (q.type === 'lock') return tickLock(p, room);
  return tickRhythm(p, q, room, now, dtMs);
}

export function interactBridge(p, q, player, targetId, room, now) {
  if (q.type === 'fishing') return interactFishing(p, q, player, targetId, room, now);
  if (q.type === 'together') return targetId.startsWith('post:') ? pickAnswer(p, q, player, targetId, room, now) : NONE;
  if (q.type === 'lock') return interactLock(p, q, player, targetId, room, now);
  return interactRhythm(p, q, player, targetId, room, now);
}

// Đang chọn câu trả lời ở "Tâm đầu ý hợp" thì không được nhắn tin
export const chatLocked = (p, q) => q?.type === 'together' && p.ch?.phase === 'choose';
