// Chat bong bóng, thông báo nhỏ, thanh trạng thái
import { PALETTE } from './palette.js';
import { roundRect, wrapText } from './draw.js';

const BUBBLE_MAX_W = 150;
const LINE_H = 15;
const FADE_MS = 400;

const toastEl = document.getElementById('toast');
const statusEl = document.getElementById('status');
let toastTimer = 0;

// Chỉ dùng textContent, không bao giờ innerHTML
export function toast(message, ms = 2400) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

export function setStatus(text) {
  statusEl.textContent = text;
}

// Bong bóng chat trên đầu, đáy bong bóng nằm ở (x, bottomY)
export function drawBubble(ctx, bubble, x, bottomY, now) {
  const left = bubble.until - now;
  if (left <= 0) return;
  const alpha = Math.min(1, left / FADE_MS);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 12px Nunito, "Segoe UI", system-ui, sans-serif';
  const lines = wrapText(ctx, bubble.text, BUBBLE_MAX_W).slice(0, 5);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  const h = lines.length * LINE_H + 12;
  const top = bottomY - h - 8;

  roundRect(ctx, x - w / 2, top, w, h, 12, PALETTE.white);
  // Đuôi bong bóng
  ctx.beginPath();
  ctx.moveTo(x - 6, top + h - 1.5);
  ctx.lineTo(x, top + h + 7);
  ctx.lineTo(x + 6, top + h - 1.5);
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, top + h);
  ctx.lineTo(x, top + h + 7);
  ctx.lineTo(x + 6, top + h);
  ctx.stroke();

  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x, top + 7 + i * LINE_H));
  ctx.restore();
}
