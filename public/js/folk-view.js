// Vẽ trò dân gian theo trạng thái server gửi + lớp phủ màn hình (bịt mắt, thanh lực, "DÔ!")
import { PALETTE } from './palette.js';
import { promptBubble } from './quest-draw.js';
import { lineMark, shout } from './challenge-draw.js';
import {
  blindfold, darkness, flowerCard, folkText, goat, nemconBall, nemconPole, powerBar, scarecrow, tugMeter, tugRope,
} from './folk-draw.js';
import { goatX, nemconPower, nemconRing } from '/shared/quests.js';

const TOSS_MS = 900;
const SIGNAL_MS = 1600;
const TUG_MSG_MS = 1100;
const SIGNAL_ICON = { left: '⬅️', right: '➡️', stop: '✋', grab: '🐐 Bắt!' };
const SIGHT_RADIUS = 46; // người bịt mắt chỉ thấy quanh mình

// s: trạng thái phía client của thử thách (xem challenge-client.js)
export function drawFolk(ctx, q, s, groundY, t, now, people, selfId) {
  const ch = s.ch;
  if (!ch) return;
  switch (q.type) {
    case 'blindGoat': {
      // Người dẫn đường thấy cả dê thật lẫn dê bù nhìn (rơm, mắt chéo)
      for (const g of ch.goats ?? []) {
        const age = g.age + now - s.goatStart;
        goat(ctx, goatX(q, g, age), groundY + 4, Math.sign(g.tx - g.x0), t, g.decoy);
      }
      break;
    }
    case 'nemcon': {
      lineMark(ctx, q.throwX, groundY, 'Vạch ném', PALETTE.plus);
      const ring = ch.ringAge !== undefined ? nemconRing(q, now - s.ringStart, ch.period) : null;
      nemconPole(ctx, q.poleX, groundY, ring, ch.thrower === selfId, t, ch.wind);
      if (ch.ready) folkText(ctx, '🏐 Sẵn sàng!', q.throwX, groundY - 112, 12, PALETTE.plus);
      if (s.toss && now - s.toss.at < TOSS_MS * 1.6) {
        nemconBall(ctx, q.throwX, q.poleX, groundY, (now - s.toss.at) / TOSS_MS, s.toss.ok);
      }
      break;
    }
    case 'memory': {
      for (const it of s.items) {
        const flower = q.flowers.find((f) => f.id === it.kind);
        flowerCard(ctx, it.x, groundY, it.state, flower?.icon ?? '', s.nearItem?.id === it.id);
      }
      break;
    }
    case 'tug': {
      lineMark(ctx, q.startX, groundY, 'Vạch kéo', PALETTE.plus);
      const front = people.length ? Math.max(...people.map((p) => p.renderX)) : q.startX;
      const lean = ch.s ?? 0;
      const crowX = q.opponentX - lean * 30;
      scarecrow(ctx, crowX, groundY, lean);
      scarecrow(ctx, crowX + 34, groundY, lean);
      if (ch.phase === 'active') tugRope(ctx, front + 10, crowX - 8, groundY, (front + crowX) / 2);
      break;
    }
    default:
  }
  if (s.nearTarget && q.type !== 'tug') promptBubble(ctx, s.nearTarget.x, groundY - 100);
}

// Khăn bịt mắt vẽ sau nhân vật (cả hai người đều thấy ai đang bị bịt mắt)
export function drawFolkFront(ctx, q, s, groundY, people) {
  if (q.type !== 'blindGoat' || !s.ch?.blindId) return;
  const blind = people.find((p) => p.id === s.ch.blindId);
  if (blind) blindfold(ctx, blind.renderX, groundY);
}

export function drawFolkOverlay(ctx, q, s, view, now, camX, groundY, me) {
  const ch = s.ch;
  if (!ch || !me) return;
  const sig = s.signal && now - s.signal.at < SIGNAL_MS ? s.signal : null;
  if (q.type === 'blindGoat' && ch.blindId === me.id) {
    darkness(ctx, view.w, view.h, me.renderX - camX, groundY - 40, SIGHT_RADIUS);
    shout(ctx, view.w / 2, Math.max(150, view.h * 0.3), '🙈 Bạn đang bị bịt mắt', PALETTE.ink);
    // Người dẫn đường ra hiệu: mũi tên thật to trên màn hình tối
    if (sig) bigSign(ctx, view.w / 2, groundY - 150, SIGNAL_ICON[sig.dir], 1 - (now - sig.at) / SIGNAL_MS);
  } else if (q.type === 'blindGoat' && sig?.mine) {
    bigSign(ctx, view.w / 2, groundY - 150, SIGNAL_ICON[sig.dir], 0.5 * (1 - (now - sig.at) / SIGNAL_MS));
  }
  if (q.type === 'nemcon' && ch.aimAge !== undefined) {
    powerBar(ctx, view.w / 2, groundY - 125, nemconPower(q, now - s.aimStart), q.powerZone);
  }
  // Kéo co: mọi thứ hiện ngay trên đầu nhân vật để không bị thông báo che
  if (q.type === 'tug' && ch.phase === 'active') {
    const cx = me.renderX - camX + 30;
    tugMeter(ctx, view.w / 2, groundY - 190, ch.s);
    const cue = ch.cueAge !== undefined && now - s.cueStart < (ch.window ?? q.cueWindowMs);
    // Hô giả "DỐ!" trông gần giống, phải đọc kỹ
    if (cue) shout(ctx, cx, groundY - 135, ch.cueFake ? 'DỐ! 🤪' : 'DÔ! 💪 Bấm ✋', PALETTE.minus);
    else folkText(ctx, 'Chờ hiệu lệnh… chuẩn bị', cx, groundY - 130, 11, PALETTE.inkSoft, 700);
    if (s.tugMsg && now - s.tugMsg.at < TUG_MSG_MS) {
      folkText(ctx, s.tugMsg.text, cx, groundY - 160 - (now - s.tugMsg.at) / 40, 13, s.tugMsg.ok ? PALETTE.plus : PALETTE.minus);
    }
  }
}

// Biểu tượng lớn mờ dần (mũi tên ra hiệu)
function bigSign(ctx, x, y, icon, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  folkText(ctx, icon, x, y, 54, PALETTE.white, 900);
  ctx.restore();
}
