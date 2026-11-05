// Cảnh 2 – bờ bên kia Cầu Tình Yêu: liễu rủ, biển trả lời, giàn xếp đá, sạp tre, hàng rào khoá tình yêu
import { PALETTE } from '../palette.js';
import { circle, heart, roundRect, seeded, signpost } from '../draw.js';
import { BARRIERS, QUESTS, SCENES, isDone, questIndexOf } from '/shared/quests.js';
import { bigLock, sapPoles, stoneAt, stoneFrame, STONE_H } from '../bridge-draw.js';

const SCENE = SCENES[1];
const S = SCENE.start;
const quest = (id) => QUESTS.find((q) => q.id === id);
const TOGETHER = quest('together');
const STONES = quest('stones');
const SAP = quest('sap');
const LOCK = quest('lock');
const KOI_BARRIER = BARRIERS.find((b) => b.after === 'koi');
const LOCK_COLORS = ['#FF8FAB', '#F7C948', '#A2D2FF', '#CDB4DB', '#F28B82', '#8FD3C1'];
const FENCE = [LOCK.dials[0] - 70, LOCK.dials.at(-1) + 70];

const willows = [S + 1240, S + 1780, S + 2260, S + 2820, S + 3120, S + 3600];

function willow(ctx, x, groundY, t) {
  roundRect(ctx, x - 7, groundY - 150, 14, 146, 6, PALETTE.trunk);
  circle(ctx, x, groundY - 160, 46, PALETTE.willow);
  // Cành liễu rủ đung đưa
  for (let i = 0; i < 9; i++) {
    const bx = x - 40 + i * 10;
    const len = 60 + seeded(x + i) * 50;
    const sway = Math.sin(t * 1.2 + i * 0.7) * 5;
    ctx.beginPath();
    ctx.moveTo(bx, groundY - 150);
    ctx.quadraticCurveTo(bx + sway, groundY - 150 + len / 2, bx + sway * 1.6, groundY - 150 + len);
    ctx.strokeStyle = i % 2 ? PALETTE.willowDark : PALETTE.willow;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// Dây chắn cuối cầu: câu cá xong mới qua
function ropeGate(ctx, x, groundY) {
  for (const px of [x - 26, x + 26]) roundRect(ctx, px - 4, groundY - 60, 8, 56, 3, PALETTE.woodDark, PALETTE.ink, 2);
  ctx.beginPath();
  ctx.moveTo(x - 24, groundY - 50);
  ctx.quadraticCurveTo(x, groundY - 34, x + 24, groundY - 50);
  ctx.strokeStyle = PALETTE.lantern;
  ctx.lineWidth = 4;
  ctx.stroke();
  signpost(ctx, x + 60, groundY, ['🎣 Câu cá koi', 'xong mới qua'], 96);
}

// Hàng rào treo đầy ổ khoá tình yêu
function lockFence(ctx, groundY, t, done) {
  const [x0, x1] = FENCE;
  for (let px = x0; px <= x1; px += 40) roundRect(ctx, px - 3, groundY - 46, 6, 42, 2, PALETTE.woodDark, PALETTE.ink, 2);
  roundRect(ctx, x0 - 4, groundY - 48, x1 - x0 + 8, 6, 3, PALETTE.wood, PALETTE.ink, 2);
  roundRect(ctx, x0 - 4, groundY - 26, x1 - x0 + 8, 5, 2, PALETTE.wood, PALETTE.ink, 1.5);
  for (let i = 0, lx = x0 + 10; lx < x1 - 6; lx += 15, i++) {
    const ly = groundY - 40 + (i % 2) * 18;
    ctx.beginPath();
    ctx.arc(lx, ly - 2, 3, Math.PI, 0);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRect(ctx, lx - 4, ly - 2, 8, 7, 2, LOCK_COLORS[i % LOCK_COLORS.length], PALETTE.ink, 1.5);
  }
  if (done) {
    // Ổ khoá của hai bạn treo giữa hàng rào, trái tim bay lên
    bigLock(ctx, LOCK.lockX, groundY, true, t);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.4 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      heart(ctx, LOCK.lockX + Math.sin(k * 6 + i) * 18, groundY - 110 - k * 80, 10);
      ctx.restore();
    }
  }
}

const visible = (x, left, right, pad = 120) => x > left - pad && x < right + pad;

export function drawBridgeFar(ctx, groundY, left, right, questIndex, t) {
  if (right < S + 1150 || left > SCENE.end) return;
  for (const x of willows) if (visible(x, left, right)) willow(ctx, x, groundY - 16, t);
  const current = QUESTS[questIndex]?.id;

  if (!isDone(questIndex, 'koi') && visible(KOI_BARRIER.x, left, right)) ropeGate(ctx, KOI_BARRIER.x + 30, groundY - 10);

  // Biển trả lời để trống khi chưa tới lượt thử thách này
  if (current !== 'together') {
    for (const x of TOGETHER.posts) if (visible(x, left, right)) signpost(ctx, x, groundY - 8, ['🪧'], 60);
  }

  if (visible(STONES.pileX, left, right)) {
    stoneFrame(ctx, STONES.pileX, groundY);
    // Xếp xong: chồng đá cầu may đứng thẳng tắp
    if (isDone(questIndex, 'stones')) {
      for (let i = 0; i < STONES.goal; i++) stoneAt(ctx, STONES.pileX, groundY - 12 - STONE_H / 2 - i * STONE_H, 30 - i * 2);
    }
  }

  if (current !== 'sap' && visible(SAP.startX, left, right)) sapPoles(ctx, SAP.startX, groundY, 1, false);

  if (visible((FENCE[0] + FENCE[1]) / 2, left, right, 400)) lockFence(ctx, groundY - 6, t, questIndex > questIndexOf('lock'));
}
