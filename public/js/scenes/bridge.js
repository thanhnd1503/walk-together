// Cảnh 2: Cầu Gỗ Nhỏ — bờ tre, suối có sen và cá koi
import { PALETTE } from '../palette.js';
import { circle, roundRect, seeded, signpost } from '../draw.js';
import { BARRIERS, SCENES, isDone } from '/shared/quests.js';

const SCENE = SCENES[1];
const BRIDGE_BARRIER = BARRIERS[1];
const END_BARRIER = BARRIERS[2];
export const STREAM = [3250, 3550];
const GAP = [3330, 3470]; // đoạn cầu bị gãy

const bamboos = [];
for (let x = SCENE.start + 80; x < END_BARRIER.x - 40; x += 230) {
  const jx = x + (seeded(x) - 0.5) * 60;
  if (jx > STREAM[0] - 60 && jx < STREAM[1] + 60) continue;
  bamboos.push({ x: jx, n: 3 + Math.floor(seeded(x + 3) * 3) });
}

function bambooCluster(ctx, x, groundY, n, t) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - n / 2) * 11;
    const h = 120 + seeded(x + i) * 70;
    const sway = Math.sin(t * 0.8 + i) * 3;
    ctx.save();
    ctx.translate(bx, groundY);
    ctx.rotate(sway * 0.004);
    roundRect(ctx, -4, -h, 8, h, 4, i % 2 ? PALETTE.bamboo : PALETTE.bambooDark, PALETTE.ink, 2);
    // Đốt tre
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    for (let y = -30; y > -h + 10; y -= 28) {
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.lineTo(4, y);
      ctx.stroke();
    }
    // Lá tre
    for (let k = 0; k < 3; k++) {
      const ly = -h + 12 + k * 22;
      const side = k % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(side * 12, ly, 12, 4, side * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.bamboo;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function stream(ctx, groundY, t) {
  const [x0, x1] = STREAM;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, groundY - 14, x1 - x0, 2000);
  // Gợn sóng
  ctx.strokeStyle = PALETTE.waterLight;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const wx = x0 + 20 + ((i * 47 + t * 12) % (x1 - x0 - 40));
    const wy = groundY + 12 + (i % 4) * 16;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 8, wy - 3, wx + 16, wy);
    ctx.stroke();
  }
  // Lá sen + hoa sen
  for (const [lx, ly] of [[3290, 30], [3370, 52], [3440, 26], [3510, 46]]) {
    ctx.beginPath();
    ctx.ellipse(lx, groundY + ly, 15, 5, 0, 0.25, Math.PI * 2 - 0.25);
    ctx.lineTo(lx, groundY + ly);
    ctx.closePath();
    ctx.fillStyle = PALETTE.lotusPad;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (const [lx, ly] of [[3370, 46], [3510, 40]]) {
    for (const a of [-0.6, 0, 0.6]) {
      ctx.save();
      ctx.translate(lx, groundY + ly);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -6, 3.5, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.lotus;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  // Cá koi bơi qua lại
  const k = (Math.sin(t * 0.5) + 1) / 2;
  const kx = x0 + 40 + k * (x1 - x0 - 80);
  const dir = Math.cos(t * 0.5) >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.ellipse(kx, groundY + 64, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.moveTo(kx - dir * 9, groundY + 64);
  ctx.lineTo(kx - dir * 16, groundY + 59);
  ctx.lineTo(kx - dir * 16, groundY + 69);
  ctx.closePath();
  ctx.fillStyle = PALETTE.koi;
  ctx.fill();
  ctx.stroke();
  // Đá bờ suối
  for (const sx of [x0 - 4, x1 + 4]) {
    circle(ctx, sx, groundY + 20, 9, PALETTE.inkSoft, PALETTE.ink, 2);
    circle(ctx, sx, groundY + 44, 7, PALETTE.inkSoft, PALETTE.ink, 2);
  }
}

function bridge(ctx, groundY, fixed) {
  const [x0, x1] = STREAM;
  const segments = fixed ? [[x0 - 6, x1 + 6]] : [[x0 - 6, GAP[0]], [GAP[1], x1 + 6]];
  // Lan can phía sau
  for (const [a, b] of segments) {
    for (let px = a + 6; px <= b - 4; px += 50) roundRect(ctx, px - 3, groundY - 38, 6, 34, 2, PALETTE.woodDark, PALETTE.ink, 2);
    roundRect(ctx, a, groundY - 40, b - a, 6, 3, PALETTE.wood, PALETTE.ink, 2);
  }
  // Mặt cầu
  for (const [a, b] of segments) roundRect(ctx, a, groundY - 6, b - a, 11, 4, PALETTE.wood);
  if (!fixed) {
    // Tấm ván gãy rủ xuống nước
    ctx.save();
    ctx.translate(GAP[0], groundY);
    ctx.rotate(0.9);
    roundRect(ctx, -2, -4, 34, 8, 3, PALETTE.wood);
    ctx.restore();
  }
  // Cột chống dưới cầu
  for (const px of [x0 + 10, x1 - 10]) roundRect(ctx, px - 4, groundY + 4, 8, 60, 3, PALETTE.woodDark, PALETTE.ink, 2);
}

function fence(ctx, x, groundY) {
  for (let px = x; px < x + 120; px += 22) roundRect(ctx, px, groundY - 40, 8, 40, 3, PALETTE.wood, PALETTE.ink, 2);
  roundRect(ctx, x - 4, groundY - 30, 120, 6, 3, PALETTE.woodDark, PALETTE.ink, 2);
}

export function drawBridgeScene(ctx, groundY, left, right, questIndex, t) {
  if (right < SCENE.start || left > SCENE.end) return;
  for (const b of bamboos) {
    if (b.x > left - 60 && b.x < right + 60) bambooCluster(ctx, b.x, groundY - 18, b.n, t);
  }
  if (right > STREAM[0] - 20 && left < STREAM[1] + 20) {
    stream(ctx, groundY, t);
    bridge(ctx, groundY, isDone(questIndex, BRIDGE_BARRIER.after));
  }
  if (END_BARRIER.x > left - 150 && END_BARRIER.x < right + 150) {
    signpost(ctx, END_BARRIER.x + 30, groundY - 14, ['Hồ Đom Đóm →', '(sắp mở cửa)']);
    fence(ctx, END_BARRIER.x + 70, groundY - 6);
  }
}
