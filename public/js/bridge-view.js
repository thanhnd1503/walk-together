// Vẽ thử thách ở Cầu Tình Yêu theo trạng thái server gửi + lớp phủ màn hình (hô "Giật!", dải nhịp sạp)
import { PALETTE } from './palette.js';
import { promptBubble } from './quest-draw.js';
import { lineMark, shout } from './challenge-draw.js';
import { folkText } from './folk-draw.js';
import {
  STONE_H, WATER_Y, answerPost, beatBar, bigLock, fish, fishingRod, lockDial, questionBoard, rain, ripple,
  sapPoles, stoneAt, stonePedestal, swingStone, umbrella, wetMeter,
} from './bridge-draw.js';
import { stackOffset } from '/shared/quests.js';

const APPROACH_MS = 1400; // người nhìn nước thấy cá bơi tới phao trước khi cắn
const CALL_SHOW_MS = 1000;
const DROP_MS = 380;
const SAP_MSG_MS = 1100;
const SAP_FLASH_MS = 160;
const STONE_HANG = 140; // độ cao viên đá đang treo
const PILE_TOP = 12; // mặt bệ đá

const smooth = (k) => k * k * (3 - 2 * k);

// Độ mở của sạp lúc này: 0 = khép, 1 = mở; trượt êm giữa các nhịp
function sapOpen(s, now) {
  const beats = s.beats ?? [];
  const next = beats.find((b) => b.at > now);
  if (!next) return 1;
  const prev = beats.filter((b) => b.at <= now).at(-1);
  const val = (b) => (b.kind === 'close' ? 0 : 1);
  const prevAt = prev?.at ?? next.at - 700;
  const k = smooth(Math.max(0, Math.min(1, (now - prevAt) / (next.at - prevAt))));
  return (prev ? val(prev) : 1) * (1 - k) + val(next) * k;
}

export function drawBridgeGame(ctx, q, s, groundY, t, now, people, selfId) {
  const ch = s.ch;
  if (!ch) return;
  const near = (id) => s.nearTarget?.id === id;
  switch (q.type) {
    case 'fishing': {
      const floatX = q.fishX + 40;
      const fisher = people.find((p) => p.id === ch.fisherId);
      const bobAge = ch.phase === 'bob' ? now - s.bobStart : null;
      const dip = bobAge !== null ? 4 + Math.sin(bobAge / 55) * 4 : Math.sin(t * 2);
      if (fisher) fishingRod(ctx, fisher.renderX + 8, groundY, floatX, dip);
      if (bobAge !== null) ripple(ctx, floatX, groundY, (bobAge % 600) / 600);
      // Chỉ người nhìn nước mới biết cá gì đang tới
      if (ch.kind) {
        const left = s.approachAt - now;
        const y = groundY + WATER_Y + 22;
        if (ch.phase === 'bob') fish(ctx, floatX + 16 + Math.sin(t * 6) * 2, y, -1, ch.kind, t);
        else if (left < APPROACH_MS) fish(ctx, floatX + 16 + (Math.max(0, left) / APPROACH_MS) * 110, y, -1, ch.kind, t);
      }
      if (!fisher || fisher.id !== selfId || !near('pull')) lineMark(ctx, q.fishX, groundY, 'Chỗ câu', PALETTE.koi);
      break;
    }
    case 'together': {
      const [question, ...options] = q.questions[ch.qi];
      questionBoard(ctx, q.posts[1], groundY, question);
      q.posts.forEach((x, i) => {
        let who = null;
        if (ch.picks) {
          const me = ch.picks[selfId] === i;
          const partner = Object.entries(ch.picks).some(([id, v]) => id !== selfId && v === i);
          who = me && partner ? 'both' : me ? 'me' : partner ? 'partner' : null;
        }
        answerPost(ctx, x, groundY, options[i], { mine: ch.mine === i, who, near: near(`post:${i}`) });
      });
      break;
    }
    case 'umbrella': {
      lineMark(ctx, q.startX, groundY, 'Xuất phát', PALETTE.plus);
      lineMark(ctx, q.goalX, groundY, 'Đích', PALETTE.heart);
      const holder = people.find((p) => p.id === ch.holderId);
      s.windShown += ((ch.wind ?? 0) - s.windShown) * 0.08; // ô nghiêng từ từ theo gió
      const cx = holder ? holder.renderX + s.windShown : null;
      rain(ctx, q.startX - 500, q.goalX + 500, groundY, t, cx === null ? null : [cx - 50, cx + 50]);
      if (holder) umbrella(ctx, cx, groundY, s.windShown / 120);
      break;
    }
    case 'sap': {
      const flash = (s.beats ?? []).some((b) => b.kind === 'close' && now >= b.at && now - b.at < SAP_FLASH_MS);
      sapPoles(ctx, q.startX, groundY, ch.phase === 'active' ? sapOpen(s, now) : 1, flash);
      break;
    }
    case 'lock': {
      const owns = (i) => (i < 2) === (selfId === ch.leftId);
      q.dials.forEach((x, i) => {
        const mark = ch.result?.each ? (ch.result.each[i] ? '✅' : '❌') : null;
        lockDial(ctx, x, groundY, i + 1, q.symbols[ch.dials[i]].icon, { mine: ch.leftId && owns(i), near: near(`dial:${i}`), mark });
        // Mình biết mã các ô của người kia: ghi nhỏ phía trên để dễ nhắn
        const code = ch.known?.[i];
        if (code !== null && code !== undefined) folkText(ctx, `📜 ${q.symbols[code].icon}`, x, groundY - 124, 12);
      });
      bigLock(ctx, q.lockX, groundY, false, t);
      if (near('lock')) promptBubble(ctx, q.lockX, groundY - 118);
      break;
    }
    default:
  }
  const bubbleAt = { pull: q.fishX, drop: q.pileX, steady: q.pileX };
  const id = s.nearTarget?.id;
  if (id in bubbleAt) promptBubble(ctx, bubbleAt[id], groundY - (id === 'pull' ? 100 : 222));
  if (id?.startsWith('post:')) promptBubble(ctx, s.nearTarget.x, groundY - 140);
}


// Chồng đá vẽ trước nhân vật (đá nằm ngang chân, không thì bị người che mất)
function drawStack(ctx, q, s, ch, groundY, now) {
  stonePedestal(ctx, q.pileX, groundY);
  const base = groundY - PILE_TOP - STONE_H / 2;
  const drop = s.drop && now - s.drop.at < DROP_MS * 1.6 ? s.drop : null;
  const resting = drop?.ok ? ch.stones.slice(0, -1) : ch.stones; // viên đang rơi chưa nằm trên chồng
  resting.forEach((o, i) => stoneAt(ctx, q.pileX + o, base - i * STONE_H));
  const top = ch.stones.at(-1) ?? 0;
  const hangY = groundY - STONE_HANG;
  // Mũi tên chỉ chỗ cần thả (ngay trên viên trên cùng)
  folkText(ctx, '▼', q.pileX + top, base - ch.stones.length * STONE_H - 14, 12, PALETTE.plus, 900);
  if (drop) {
    // Viên vừa thả đang rơi: trúng thì nằm lên chồng, trượt thì lăn xuống đất
    const k = Math.min(1, (now - drop.at) / DROP_MS);
    const landY = drop.ok ? base - (ch.stones.length - 1) * STONE_H : groundY - 8;
    const sideX = drop.ok ? 0 : Math.sign(drop.x - q.pileX - top || 1) * 40 * k;
    stoneAt(ctx, drop.x + sideX, hangY + (landY - hangY) * k * k);
  } else {
    const phase = ch.phase + ch.speed * (now - s.stackAt);
    swingStone(ctx, q.pileX, groundY, stackOffset(q, phase), hangY, Boolean(ch.steadyId));
  }
  if (ch.steadyId) folkText(ctx, '🤲 đang giữ', q.pileX, groundY - 206, 10, PALETTE.plus);
}

// Vẽ sau nhân vật: chồng đá, thanh ướt trên đầu người không cầm ô
export function drawBridgeFront(ctx, q, s, groundY, people, now) {
  const ch = s.ch;
  if (q.type === 'stack' && ch) drawStack(ctx, q, s, ch, groundY, now);
  if (q.type !== 'umbrella' || ch?.phase !== 'active' || !ch.wet) return;
  const partner = people.find((p) => p.id !== ch.holderId);
  if (partner) wetMeter(ctx, partner.renderX, groundY - 100, ch.wet / q.wetMax);
}

export function drawBridgeOverlay(ctx, q, s, view, now, camX, groundY, me) {
  const ch = s.ch;
  if (!ch || !me) return;
  const topY = Math.max(150, view.h * 0.3);
  if (q.type === 'fishing' && s.callAt && now - s.callAt < CALL_SHOW_MS) {
    if (ch.fisherId === me.id) shout(ctx, view.w / 2, topY, '🎣 GIẬT! Bấm ✋ ngay', PALETTE.minus);
    else folkText(ctx, '📣 Đã hô "Giật!"', me.renderX - camX, groundY - 120, 12, PALETTE.plus);
  }
  if (q.type === 'sap' && ch.phase === 'active') {
    beatBar(ctx, view.w / 2, groundY - 150, s.beats ?? [], now, q.jumpWindowMs);
    if (s.sapMsg && now - s.sapMsg.at < SAP_MSG_MS) {
      folkText(ctx, s.sapMsg.text, me.renderX - camX + 30, groundY - 190 - (now - s.sapMsg.at) / 40, 13, s.sapMsg.ok ? PALETTE.plus : PALETTE.minus);
    }
  }
}
