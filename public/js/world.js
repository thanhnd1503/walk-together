// Nền chung của Đồi Mây Ước (trời, đồi, đường đi) + vẽ từng cảnh
import { PALETTE } from './palette.js';
import { circle, cloud, petal, seeded } from './draw.js';
import { WORLD_WIDTH } from '/shared/constants.js';
import { drawGateScene } from './scenes/gate.js';
import { drawBridgeScene } from './scenes/bridge.js';

const PETAL_COUNT = 28;

const flowers = [];
for (let i = 0; i < 160; i++) {
  flowers.push({ x: seeded(i) * WORLD_WIDTH, dy: 22 + seeded(i + 99) * 50, hue: i % 3 });
}

const petals = [];

function resetPetal(p, viewW, viewH, initial) {
  p.x = Math.random() * viewW;
  p.y = initial ? Math.random() * viewH : -10;
  p.vy = 14 + Math.random() * 18;
  p.vx = 8 + Math.random() * 14;
  p.rot = Math.random() * Math.PI;
  p.spin = (Math.random() - 0.5) * 2;
  p.size = 2.5 + Math.random() * 2;
}

export function updateWorld(dt, view) {
  if (petals.length === 0) {
    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = {};
      resetPetal(p, view.w, view.h, true);
      petals.push(p);
    }
  }
  for (const p of petals) {
    p.y += p.vy * dt;
    p.x += (p.vx + Math.sin(p.y * 0.03) * 10) * dt;
    p.rot += p.spin * dt;
    if (p.y > view.h || p.x > view.w + 10) resetPetal(p, view.w, view.h, false);
  }
}

function hills(ctx, view, camX, factor, base, amp, freq, color) {
  ctx.beginPath();
  ctx.moveTo(0, view.h);
  for (let sx = 0; sx <= view.w + 20; sx += 20) {
    const wx = sx + camX * factor;
    const y = base - (Math.sin(wx * freq) * 0.6 + Math.sin(wx * freq * 2.3 + 1) * 0.4) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(view.w, view.h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Lớp nền phía sau nhân vật
export function drawWorld(ctx, view, camX, groundY, t, questIndex) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.w, view.h);

  // Mặt trời tròn ấm áp
  circle(ctx, view.w * 0.82, Math.max(60, groundY - 260), 40, PALETTE.sunGlow, null);
  circle(ctx, view.w * 0.82, Math.max(60, groundY - 260), 28, PALETTE.sun, null);

  // Mây trôi chậm, lặp vô tận; trời càng cao (màn hình dọc) thì càng nhiều mây
  const span = view.w + 200;
  const skyH = groundY - 140;
  const count = Math.max(5, Math.round(skyH / 70));
  for (let i = 0; i < count; i++) {
    const x = ((i * 260 + t * (4 + seeded(i + 3) * 4) - camX * 0.15) % span + span) % span - 100;
    const y = groundY - 150 - seeded(i) * Math.max(90, skyH - 40);
    cloud(ctx, x, y, 0.7 + seeded(i + 7) * 0.6);
  }

  hills(ctx, view, camX, 0.3, groundY - 60, 30, 0.004, PALETTE.hillFar);
  hills(ctx, view, camX, 0.55, groundY - 25, 22, 0.007, PALETTE.hillNear);

  // Cỏ + đường đi
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, groundY - 22, view.w, view.h);
  ctx.fillStyle = PALETTE.pathEdge;
  ctx.fillRect(0, groundY - 12, view.w, 28);
  ctx.fillStyle = PALETTE.path;
  ctx.fillRect(0, groundY - 9, view.w, 22);

  ctx.save();
  ctx.translate(-camX, 0);
  const left = camX - 150;
  const right = camX + view.w + 150;

  for (const f of flowers) {
    if (f.x < left || f.x > right) continue;
    const color = [PALETTE.blossomDeep, PALETTE.cream, PALETTE.blossom][f.hue];
    circle(ctx, f.x, groundY + f.dy, 3, color, null);
  }
  drawGateScene(ctx, groundY, left, right, questIndex);
  drawBridgeScene(ctx, groundY, left, right, questIndex, t);
  ctx.restore();
}

// Lớp phía trước nhân vật (cánh hoa rơi)
export function drawForeground(ctx) {
  for (const p of petals) petal(ctx, p.x, p.y, p.rot, p.size);
}
