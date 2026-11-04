// Hình vẽ cho các thử thách ở Cổng Hoa Đào: vạch, cây đào già, đèn lồng chữ, khung ảnh, ảnh polaroid
import { PALETTE } from './palette.js';
import { blossomTree, circle, heart, roundRect } from './draw.js';
import { drawCharacter } from './character.js';

const FONT = 'Nunito, "Segoe UI", system-ui, sans-serif';

function label(ctx, text, x, y, size = 11, color = PALETTE.ink) {
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.cream;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Vạch kẻ ngang đường + cờ nhỏ có chữ
export function lineMark(ctx, x, groundY, text, color) {
  for (let i = 0; i < 4; i++) roundRect(ctx, x - 3, groundY - 9 + i * 6, 6, 4, 1, i % 2 ? PALETTE.white : color, null);
  roundRect(ctx, x - 2, groundY - 64, 4, 56, 2, PALETTE.woodDark, PALETTE.ink, 1.5);
  ctx.beginPath();
  ctx.moveTo(x + 2, groundY - 64);
  ctx.lineTo(x + 26, groundY - 56);
  ctx.lineTo(x + 2, groundY - 48);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  label(ctx, text, x, groundY - 74, 10);
}

// Cây đào già: quay lưng (bình thường) hoặc quay mặt nhìn (lúc "đứng im")
export function oldTree(ctx, x, groundY, watching) {
  blossomTree(ctx, x, groundY - 10, 1.7);
  if (!watching) return;
  const y = groundY - 95;
  circle(ctx, x - 9, y, 6, PALETTE.white);
  circle(ctx, x + 9, y, 6, PALETTE.white);
  circle(ctx, x - 9, y + 1, 3, PALETTE.ink, null);
  circle(ctx, x + 9, y + 1, 3, PALETTE.ink, null);
  roundRect(ctx, x - 7, y + 14, 14, 6, 3, PALETTE.ink, null);
}

// Bong bóng lời lớn (cây hô)
export function shout(ctx, x, y, text, color) {
  ctx.font = `900 16px ${FONT}`;
  const w = ctx.measureText(text).width + 26;
  roundRect(ctx, x - w / 2, y - 16, w, 32, 14, PALETTE.white);
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 15);
  ctx.lineTo(x + 4, y + 26);
  ctx.lineTo(x + 8, y + 15);
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
}

// Đèn lồng treo có chữ; lit = đã chạm đúng
export function lanternWord(ctx, x, topY, word, lit, t) {
  const sway = Math.sin(t * 1.6 + x) * 0.06;
  ctx.save();
  ctx.translate(x, topY);
  ctx.rotate(sway);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (lit) circle(ctx, 0, 34, 26, PALETTE.lanternGlow, null);
  ctx.beginPath();
  ctx.ellipse(0, 34, 18, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = lit ? PALETTE.questGold : PALETTE.lantern;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, -8, 12, 16, 5, 2, PALETTE.woodDark, PALETTE.ink, 1.2);
  roundRect(ctx, -8, 52, 16, 5, 2, PALETTE.woodDark, PALETTE.ink, 1.2);
  ctx.restore();
  label(ctx, word, x, topY + 34, 11);
}

// Khung ảnh đứng ở cuối cảnh
export function photoFrame(ctx, x, groundY, half) {
  const top = groundY - 150;
  roundRect(ctx, x - half - 8, top, 12, 150, 4, PALETTE.wood);
  roundRect(ctx, x + half - 4, top, 12, 150, 4, PALETTE.wood);
  roundRect(ctx, x - half - 14, top - 10, half * 2 + 28, 16, 8, PALETTE.woodDark);
  for (const dx of [-half, -half / 2, 0, half / 2, half]) circle(ctx, x + dx, top - 6, 7, PALETTE.blossom);
  heart(ctx, x, top - 22, 16);
  label(ctx, '📸 Góc chụp ảnh', x, top + 18, 11);
}

// Ảnh polaroid hiện giữa màn hình sau khi chụp; k: 0 → 1 theo thời gian hiện
export function polaroid(ctx, viewW, viewH, photo, k) {
  // Vừa với cả màn hình ngang thấp (máy tính) lẫn màn hình dọc cao (điện thoại)
  const w = Math.min(260, viewW - 40, (viewH - 50) / 1.18);
  const h = w * 1.18;
  const x = (viewW - w) / 2;
  const y = viewH > 700 ? viewH * 0.36 : (viewH - h) / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 6, (1 - k) * 6);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.04);
  ctx.translate(-w / 2, -h / 2);
  roundRect(ctx, 0, 0, w, h, 6, PALETTE.white);
  const pad = 12;
  const iw = w - pad * 2;
  const ih = iw * 0.85;
  const sky = ctx.createLinearGradient(0, pad, 0, pad + ih);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(pad, pad, iw, ih);
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(pad, pad + ih * 0.78, iw, ih * 0.22);
  blossomTree(ctx, pad + iw * 0.18, pad + ih * 0.8, 0.8);
  blossomTree(ctx, pad + iw * 0.85, pad + ih * 0.8, 0.7);
  const groundY = pad + ih * 0.86;
  const scale = ih / 175;
  photo.people.forEach((person, i) => {
    ctx.save();
    ctx.translate(pad + iw * (i ? 0.62 : 0.38), groundY);
    ctx.scale(scale, scale);
    drawCharacter(ctx, person.look, { dir: i ? -1 : 1, reach: i ? -16 : 16 });
    ctx.restore();
  });
  heart(ctx, pad + iw / 2, groundY - 100 * scale, 14);
  const date = new Date(photo.at);
  const names = photo.people.map((p) => p.name).join(' 💕 ');
  label(ctx, names, w / 2, pad + ih + 22, 13);
  label(ctx, `Cổng Hoa Đào · ${date.toLocaleDateString('vi-VN')}`, w / 2, pad + ih + 42, 10, PALETTE.inkSoft);
  ctx.restore();
}
