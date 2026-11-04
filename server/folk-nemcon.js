// Ném còn: người ném lấy lực, người kia (thấy vòng + gió) bấm hô ném đúng lúc
import { SERVER_SLACK, nemconPower, nemconRing } from '../shared/quests.js';
import { NONE, ensureRole, otherOf } from './challenge-utils.js';

// Người hô bấm nút lúc thấy vòng tới điểm cần hô: chấp nhận trễ mạng một chút
const RING_LAGS_MS = [0, 120];

export function setupNemcon(p, q, now) {
  p.ch = { thrower: null, ringStart: now, period: q.ringPeriodMs, aimAt: null, ready: false, wind: newWind(q) };
}

// Người ném không thấy vòng lẫn gió
export function nemconPublic(ch, now, viewerId) {
  const spotter = viewerId && viewerId !== ch.thrower;
  return {
    thrower: ch.thrower,
    ready: ch.ready,
    aimAge: ch.aimAt ? now - ch.aimAt : undefined,
    ringAge: spotter ? now - ch.ringStart : undefined,
    period: spotter ? ch.period : undefined,
    wind: spotter ? ch.wind : undefined,
  };
}

export function tickNemcon(p, room) {
  const thrower = ensureRole(room, p.ch.thrower);
  if (thrower === p.ch.thrower) return NONE;
  p.ch.thrower = thrower;
  p.ch.aimAt = null;
  return { changed: true };
}

// Gió mỗi lượt: điểm cần hô lệch khỏi giữa cột
function newWind(q) {
  return Math.round((Math.random() * 2 - 1) * q.windMax * 100) / 100;
}

// Hết lượt ném (lọt hay trượt): đổi người ném, gió đổi
function endToss(p, q, room, ch, by, fx) {
  ch.aimAt = null;
  ch.ready = false;
  ch.wind = newWind(q);
  ch.thrower = otherOf(room, by)?.id ?? by;
  return { changed: true, fx, completed: p.count >= q.goal };
}

// Ném còn chia hai việc: người ném lấy lực (aim/throw), người kia hô ném lúc vòng về giữa (shout)
export function interactNemcon(p, q, player, action, room, now) {
  const ch = p.ch;
  if (action === 'shout') {
    if (!ch.ready || player.id === ch.thrower) return NONE;
    const hit = RING_LAGS_MS.some((lag) => Math.abs(nemconRing(q, now - ch.ringStart - lag, ch.period) - ch.wind) <= q.ringZone);
    if (hit) {
      p.count++;
      // Lọt rồi thì vòng chạy nhanh hơn
      ch.period *= q.ringSpeedUp;
      ch.ringStart = now;
    }
    return endToss(p, q, room, ch, ch.thrower, { type: 'toss', ok: hit, reason: hit ? null : 'ring', by: player.id });
  }
  if (player.id !== ch.thrower || ch.ready || Math.abs(player.x - q.throwX) > q.throwRadius + SERVER_SLACK) return NONE;
  if (action === 'aim') {
    ch.aimAt = now;
    return { changed: true };
  }
  if (action !== 'throw' || !ch.aimAt) return NONE;
  const power = nemconPower(q, now - ch.aimAt);
  ch.aimAt = null;
  if (power < q.powerZone[0] || power > q.powerZone[1]) {
    const reason = power < q.powerZone[0] ? 'weak' : 'strong';
    return endToss(p, q, room, ch, player.id, { type: 'toss', ok: false, reason, power, by: player.id });
  }
  ch.ready = true; // lực chuẩn: chờ người kia hô
  return { changed: true, fx: { type: 'ready', power, by: player.id } };
}
