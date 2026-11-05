// Thử thách canh nhịp ở Cầu Tình Yêu: chung ô dưới mưa, xếp đá cầu may, nhảy sạp.
// Mỗi hàm trả về { changed, fx?, teleport?, completed? }.
import { SERVER_SLACK, sapBeatMs, stackOffset } from '../shared/quests.js';
import {
  NONE, RESTART_DELAY_MS, START_ZONE, backToStart, bothAtStart, ensureRole, handOk, otherOf, pair, rand,
} from './challenge-utils.js';

export const RHYTHM_TYPES = ['umbrella', 'stack', 'sap'];

// ---------- Chung ô dưới mưa ----------
function startHand(ch, q, room, now) {
  if (now < (ch.readyAt ?? 0) || !handOk(room) || !bothAtStart(room, q.startX)) return false;
  ch.phase = 'active';
  return true;
}

function tickUmbrella(p, q, room, now, dtMs) {
  const ch = p.ch;
  const holder = ensureRole(room, ch.holderId);
  let changed = holder !== ch.holderId;
  ch.holderId = holder;
  if (ch.phase === 'idle') {
    if (!startHand(ch, q, room, now)) return { changed };
    ch.wet = 0;
    ch.nextWindAt = now + rand(...q.windEveryMs);
    return { changed: true, fx: { type: 'start', quest: q.type } };
  }
  if (!handOk(room)) return backToStart(p, q, room, now, 'drop');
  if (pair(room).every((pl) => pl.x >= q.goalX)) return { changed: true, completed: true };

  // Gió đổi hướng: ô nghiêng, chỗ che lệch sang một bên
  if (q.windMax && now >= ch.nextWindAt) {
    ch.wind = Math.round(rand(-1, 1) * q.windMax);
    ch.nextWindAt = now + rand(...q.windEveryMs);
    changed = true;
  }
  const holderPl = room.players.get(ch.holderId);
  const partner = holderPl && otherOf(room, ch.holderId);
  if (!partner) return { changed };
  const center = holderPl.x + ch.wind;
  const outside = Math.abs(partner.x - center) > q.cover;
  const before = Math.round(ch.wet * 10);
  const dt = dtMs / 1000;
  ch.wet = Math.max(0, ch.wet + (outside ? dt : -q.dryRate * dt));
  if (ch.wet >= q.wetMax) return backToStart(p, q, room, now, 'wet', partner.id);
  return { changed: changed || Math.round(ch.wet * 10) !== before };
}

// ---------- Xếp đá cầu may ----------
// Pha đung đưa tính theo thời gian; đổi tốc độ (giữ đá, xếp thêm viên) thì "chốt" pha hiện tại rồi tính tiếp
const stackSpeed = (q, ch, count) => (ch.steadyId ? q.steadySlow : 1) / (q.swingMs * Math.max(0.5, 1 - q.speedUp * count));
const stackPhase = (q, ch, count, now) => ch.phase0 + stackSpeed(q, ch, count) * (now - ch.t0);

// Độ lệch hiện tại của viên đá đang đung đưa (bot dùng để canh thả)
export const stackOffsetNow = (p, q, now) => stackOffset(q, stackPhase(q, p.ch, p.count, now));

function rebase(p, q, now) {
  const ch = p.ch;
  ch.phase0 = stackPhase(q, ch, p.count, now) % 1;
  ch.t0 = now;
}

// Viên đá mới bắt đầu ở mép phải, không thả ngay được
function newStone(ch, now) {
  ch.phase0 = 0.25;
  ch.t0 = now;
  ch.steadyId = null;
}

function tickStack(p, q, room, now) {
  const ch = p.ch;
  const placer = ensureRole(room, ch.placerId);
  let changed = placer !== ch.placerId;
  ch.placerId = placer;
  if (ch.steadyId && !room.players.has(ch.steadyId)) {
    rebase(p, q, now);
    ch.steadyId = null;
    changed = true;
  }
  return { changed };
}

function interactStack(p, q, player, targetId, room, now) {
  const ch = p.ch;
  if (Math.abs(player.x - q.pileX) > q.reach + SERVER_SLACK || !ch.placerId) return NONE;
  const placer = player.id === ch.placerId;
  if (targetId === 'holdOn' && !placer && ch.steadyId !== player.id) {
    rebase(p, q, now);
    ch.steadyId = player.id;
    return { changed: true, fx: { type: 'steady', by: player.id } };
  }
  if (targetId === 'holdOff' && ch.steadyId === player.id) {
    rebase(p, q, now);
    ch.steadyId = null;
    return { changed: true };
  }
  if (targetId !== 'drop') return NONE;
  if (!placer) return { changed: false, fx: { type: 'turn', by: player.id } };
  const offset = stackOffset(q, stackPhase(q, ch, p.count, now));
  const top = ch.stones.at(-1) ?? 0;
  const fx = { type: 'stone', by: player.id, x: q.pileX + offset };
  if (Math.abs(offset - top) <= q.tolerance) {
    ch.stones.push(Math.round(offset));
    p.count++;
    fx.ok = true;
  } else {
    ch.misses++;
    fx.ok = false;
    if (q.maxMisses && ch.misses >= q.maxMisses) {
      // Rơi quá nhiều viên: cả chồng đổ, xếp lại từ đầu
      ch.stones = [];
      ch.misses = 0;
      p.count = 0;
      fx.collapse = true;
    }
  }
  ch.placerId = otherOf(room, player.id)?.id ?? ch.placerId; // thay phiên thả
  newStone(ch, now);
  return { changed: true, fx, completed: p.count >= q.goal };
}

function stackPublic(p, q, now) {
  const ch = p.ch;
  return {
    placerId: ch.placerId, steadyId: ch.steadyId, stones: ch.stones, misses: ch.misses, maxMisses: q.maxMisses,
    phase: stackPhase(q, ch, p.count, now) % 1, speed: stackSpeed(q, ch, p.count),
  };
}

// ---------- Nhảy sạp ----------
const COUNT_IN_MS = 1500;
const BEATS_AHEAD = 6;
const JUMP_GAP_MS = 120;
const JUMP_KEEP_MS = 3000;
const SAP_ZONE = START_ZONE + 40;

// Xếp sẵn các nhịp sắp tới; nhịp lỡ: thỉnh thoảng sạp khép sớm (bỏ bớt nhịp mở)
function refillBeats(ch, q, count, now) {
  while (ch.beats.length < BEATS_AHEAD) {
    const last = ch.beats.at(-1)?.at ?? now + COUNT_IN_MS - sapBeatMs(q, count);
    const group = Math.random() < q.breakChance ? q.pattern.slice(Math.random() < 0.5 ? 1 : 2) : q.pattern;
    let at = last;
    for (const kind of group) {
      at += sapBeatMs(q, count);
      ch.beats.push({ at, kind });
    }
  }
}

// Nhảy đúng: có đúng một cú nhảy quanh lúc sạp khép (nhảy loạn nhiều lần cũng tính là trượt)
function jumpedOk(times, at, w) {
  const inWindow = times.filter((t) => Math.abs(t - at) <= w).length;
  const around = times.filter((t) => t >= at - 2 * w && t <= at + w).length;
  return inWindow >= 1 && around <= 1;
}

function judgeClose(p, q, room, beat) {
  const ch = p.ch;
  const w = q.jumpWindowMs;
  const missed = pair(room).filter((pl) => !jumpedOk(ch.jumps[pl.id] ?? [], beat.at, w)).map((pl) => pl.id);
  if (missed.length === 0) {
    p.count++;
    return { changed: true, fx: { type: 'sap', ok: true }, completed: p.count >= q.goal };
  }
  p.count = Math.max(0, p.count - q.missPenalty);
  return { changed: true, fx: { type: 'sap', ok: false, missed } };
}

function tickSap(p, q, room, now) {
  const ch = p.ch;
  if (ch.phase === 'idle') {
    if (!startHand(ch, q, room, now)) return NONE;
    ch.beats = [];
    ch.jumps = {};
    refillBeats(ch, q, p.count, now);
    return { changed: true, fx: { type: 'start', quest: q.type } };
  }
  if (!handOk(room) || pair(room).some((pl) => Math.abs(pl.x - q.startX) > SAP_ZONE)) {
    Object.assign(ch, { phase: 'idle', beats: [], readyAt: now + RESTART_DELAY_MS });
    p.count = 0;
    return { changed: true, fx: { type: 'fail', reason: 'drop' } };
  }
  const w = q.jumpWindowMs;
  const due = ch.beats.filter((b) => now >= b.at + w);
  if (!due.length) return NONE;
  ch.beats = ch.beats.filter((b) => now < b.at + w);
  let res = { changed: true };
  for (const beat of due) {
    if (beat.kind === 'close') res = judgeClose(p, q, room, beat);
    if (res.completed) return res;
  }
  for (const id of Object.keys(ch.jumps)) ch.jumps[id] = ch.jumps[id].filter((t) => now - t < JUMP_KEEP_MS);
  refillBeats(ch, q, p.count, now);
  return res;
}

function jumpSap(p, player, now) {
  const ch = p.ch;
  if (ch.phase !== 'active') return NONE;
  const list = (ch.jumps[player.id] ??= []);
  if (now - (list.at(-1) ?? 0) < JUMP_GAP_MS) return NONE;
  list.push(now);
  return { changed: false, fx: { type: 'jump', by: player.id } };
}

// ---------- Điểm vào ----------
export function setupRhythm(p, q, now) {
  if (q.type === 'umbrella') p.ch = { phase: 'idle', holderId: null, wind: 0, wet: 0 };
  if (q.type === 'stack') {
    p.ch = { placerId: null, stones: [], misses: 0 };
    newStone(p.ch, now);
  }
  if (q.type === 'sap') p.ch = { phase: 'idle', beats: [], jumps: {} };
}

export function rhythmPublic(p, q, now) {
  const ch = p.ch;
  if (q.type === 'umbrella') {
    return { phase: ch.phase, holderId: ch.holderId, wind: ch.wind, wet: Math.round(ch.wet * 10) / 10 };
  }
  if (q.type === 'stack') return stackPublic(p, q, now);
  if (q.type === 'sap') {
    return {
      phase: ch.phase, beats: ch.beats.map((b) => ({ in: b.at - now, kind: b.kind })),
      readyIn: Math.max(0, (ch.readyAt ?? 0) - now),
    };
  }
  return undefined;
}

export function tickRhythm(p, q, room, now, dtMs) {
  if (q.type === 'umbrella') return tickUmbrella(p, q, room, now, dtMs);
  if (q.type === 'stack') return tickStack(p, q, room, now);
  if (q.type === 'sap') return tickSap(p, q, room, now);
  return NONE;
}

export function interactRhythm(p, q, player, targetId, room, now) {
  if (q.type === 'stack') return interactStack(p, q, player, targetId, room, now);
  if (q.type === 'sap' && targetId === 'jump') return jumpSap(p, player, now);
  return NONE;
}
