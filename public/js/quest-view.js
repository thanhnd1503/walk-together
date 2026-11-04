// Vẽ theo từng kiểu nhiệm vụ (hàm thuần, nhận đủ dữ liệu qua tham số)
import { holdMark, leafItem, longPlank, petalItem, progressRing, promptBubble, ropeCoil, stump, tieBar } from './quest-draw.js';
import { FALL_HEIGHT, PLATE_RADIUS, fallX, tieNeedle } from '/shared/quests.js';

const LANDED_FADE = 0.1; // phần tiến độ rơi để mờ dần sau khi chạm đất
const CARRY_HEIGHT = 22; // ván khiêng ngang tay
const CARRY_WARN = 14; // còn cách giới hạn chừng này thì ván đỏ lên để cảnh báo
const PLANK_OVERHANG = 18;

// Cánh hoa / lá khô đang rơi
export function drawFalling(ctx, q, items, spawnedAt, groundY, t, now) {
  for (const it of items) {
    const fallMs = it.fallMs ?? q.fallMs;
    const age = now - spawnedAt.get(it.id);
    const progress = age / fallMs;
    if (progress > 1 + LANDED_FADE) continue;
    const fall = Math.min(1, progress);
    const y = groundY - 10 - FALL_HEIGHT * (1 - fall);
    const sx = fallX(it, Math.min(age, fallMs)) + (fall < 1 ? Math.sin(progress * 9 + it.id) * 6 : 0);
    ctx.save();
    if (progress > 1) ctx.globalAlpha = 1 - (progress - 1) / LANDED_FADE;
    if (it.kind === 'bad') leafItem(ctx, sx, y, progress * 6 + it.id);
    else petalItem(ctx, sx, y, t, it.kind === 'gold');
    ctx.restore();
  }
}

// Ván đang khiêng: vẽ sau nhân vật để nằm trước mặt, ngang tay
export function drawCarriedPlank(ctx, q, plank, people, groundY) {
  const carriers = plank?.carriers && people.filter((p) => p && plank.carriers.includes(p.id));
  if (carriers?.length === 2) {
    const [a, b] = carriers;
    const gap = Math.abs(a.renderX - b.renderX);
    const warn = gap < q.minGap + CARRY_WARN || gap > q.maxGap - CARRY_WARN;
    // Hai đầu ván chìa ra ngoài tay cho dễ thấy
    const lo = Math.min(a.renderX, b.renderX) - PLANK_OVERHANG;
    const hi = Math.max(a.renderX, b.renderX) + PLANK_OVERHANG;
    longPlank(ctx, lo, hi, groundY - CARRY_HEIGHT, warn);
  }
}

// Ván nằm chờ trên đất
export function drawCarry(ctx, plank, groundY, nearPlank) {
  if (plank.carriers) return;
  longPlank(ctx, plank.x - 40, plank.x + 40, groundY - 4, false);
  if (nearPlank) promptBubble(ctx, plank.x, groundY - 100);
}

// Buộc lạt: chỗ giữ ván, chỗ buộc và thanh canh nhịp phía trên chỗ buộc
export function drawTie(ctx, q, tie, count, groundY, t, now) {
  const [holdSpot, tieSpot] = q.targets;
  const held = Boolean(tie.holder);
  holdMark(ctx, holdSpot.x, groundY, held, t);
  ropeCoil(ctx, tieSpot.x, groundY);
  const needle = tieNeedle(q, count, now - tie.start);
  tieBar(ctx, tieSpot.x - 30, groundY - 128, needle, q.zone, held, count, q.goal);
}

// Cùng đứng trên hai cọc (hiện chưa dùng)
export function drawPlates(ctx, q, people, platesStart, groundY, now) {
  for (const target of q.targets) {
    stump(ctx, target.x, groundY, people.some((p) => Math.abs(p.x - target.x) <= PLATE_RADIUS));
  }
  if (platesStart !== null) {
    const mid = (q.targets[0].x + q.targets[1].x) / 2;
    progressRing(ctx, mid, groundY - 120, Math.min(1, (now - platesStart) / q.holdMs));
  }
}

// Vị trí các mục tiêu cần đi tới của nhiệm vụ hiện tại (không tính vật rơi)
export function targetMarks(q, state, isSeer) {
  if (!q) return [];
  switch (q.type) {
    case 'sync': return q.targets.map((tg) => ({ x: tg.x, icon: '🔔' }));
    case 'tie': return q.targets.map((tg) => ({ x: tg.x, icon: tg.id === 'hold' ? '🤲' : '🪢' }));
    case 'plates': return q.targets.map((tg) => ({ x: tg.x, icon: '🪵' }));
    case 'collect': return state.items.map((it) => ({ x: it.x, icon: '🪵' }));
    case 'blueprint': return isSeer ? [{ x: q.boardX, icon: '🗺️' }] : state.items.map((it) => ({ x: it.x, icon: '🪵' }));
    case 'carry': return [{ x: state.plank.carriers ? q.deliverX : state.plank.x, icon: '🪵' }];
    case 'holdWalk': return [{ x: q.goalX, icon: '💕' }];
    case 'statue': return [{ x: q.startX, icon: '🏁' }];
    case 'leafWalk': return [{ x: q.startX, icon: '🏁' }];
    case 'cadao': return state.items.map((it) => ({ x: it.x, icon: '🏮' }));
    case 'blindGoat': return [{ x: (q.area[0] + q.area[1]) / 2, icon: '🐐' }];
    case 'nemcon': return [{ x: q.throwX, icon: '🏐' }];
    case 'memory': return state.items.filter((it) => it.state === 'down').map((it) => ({ x: it.x, icon: '🃏' }));
    case 'tug': return [{ x: q.startX, icon: '💪' }];
    case 'photo': return [{ x: q.frameX, icon: '📸' }];
    default: return [];
  }
}
