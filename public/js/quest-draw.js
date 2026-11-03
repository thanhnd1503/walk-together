// Hàm vẽ các vật thể nhiệm vụ (vật rơi, chuông, cọc gỗ, cờ đích, mũi tên mép màn hình)
import { PALETTE } from './palette.js';
import { circle, heart, roundRect } from './draw.js';

export const FLOATER_MS = 1000;

function glow(ctx, x, y, r) {
  circle(ctx, x, y, r, PALETTE.glow, null);
}

export function petalItem(ctx, x, y, t) {
  glow(ctx, x, y, 13 + Math.sin(t * 4) * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2) * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 4.5, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.blossomDeep;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
  circle(ctx, x + 8, y - 8, 1.6 + Math.sin(t * 6) * 0.6, PALETTE.white, null);
}

// Lá khô: hứng phải bị trừ điểm
export function leafItem(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(0, -8, 10, 0);
  ctx.quadraticCurveTo(0, 8, -10, 0);
  ctx.closePath();
  ctx.fillStyle = PALETTE.leaf;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.strokeStyle = PALETTE.leafVein;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

export function floaterText(ctx, f, now) {
  const k = (now - f.at) / FLOATER_MS;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.font = '900 16px Nunito, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.white;
  ctx.strokeText(f.text, f.x, f.y - k * 30);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, f.x, f.y - k * 30);
  ctx.restore();
}

export function plankItem(ctx, x, y, t) {
  glow(ctx, x, y, 16 + Math.sin(t * 4) * 2);
  roundRect(ctx, x - 17, y - 4, 34, 9, 3, PALETTE.wood);
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 8, y);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function bell(ctx, x, groundY, swing, active) {
  const top = groundY - 132;
  roundRect(ctx, x - 24, top, 7, 132, 3, PALETTE.woodDark);
  roundRect(ctx, x + 17, top, 7, 132, 3, PALETTE.woodDark);
  roundRect(ctx, x - 30, top - 6, 60, 9, 4, PALETTE.wood);
  ctx.save();
  ctx.translate(x, top + 3);
  ctx.rotate(swing);
  if (active) glow(ctx, 0, 26, 22);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 12);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 24, 11, Math.PI, 0);
  ctx.lineTo(14, 34);
  ctx.lineTo(-14, 34);
  ctx.closePath();
  ctx.fillStyle = PALETTE.questGold;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  circle(ctx, 0, 37, 3.5, PALETTE.questGold, PALETTE.ink, 2);
  ctx.restore();
}

export function stump(ctx, x, groundY, lit) {
  if (lit) {
    ctx.beginPath();
    ctx.ellipse(x, groundY - 2, 30, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.glow;
    ctx.fill();
  }
  roundRect(ctx, x - 17, groundY - 12, 34, 14, 5, PALETTE.trunk);
  ctx.beginPath();
  ctx.ellipse(x, groundY - 12, 17, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.wood;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function progressRing(ctx, x, y, frac) {
  circle(ctx, x, y, 14, PALETTE.cream);
  ctx.beginPath();
  ctx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.strokeStyle = PALETTE.questGold;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function goalFlag(ctx, x, groundY, t) {
  roundRect(ctx, x - 2, groundY - 96, 5, 96, 2, PALETTE.woodDark, PALETTE.ink, 2);
  heart(ctx, x + 14, groundY - 84 + Math.sin(t * 3) * 2, 18);
}

// Mũi tên ở mép màn hình chỉ tới mục tiêu nằm ngoài tầm nhìn
export function edgeMarker(ctx, x, y, side, icon) {
  circle(ctx, x, y, 15, PALETTE.cream);
  ctx.beginPath();
  ctx.moveTo(x + side * 21, y);
  ctx.lineTo(x + side * 14, y - 7);
  ctx.lineTo(x + side * 14, y + 7);
  ctx.closePath();
  ctx.fillStyle = PALETTE.ink;
  ctx.fill();
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 1);
}

export function promptBubble(ctx, x, y) {
  roundRect(ctx, x - 13, y - 13, 26, 24, 10, PALETTE.white);
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✋', x, y);
}
