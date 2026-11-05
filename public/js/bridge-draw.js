// Hình vẽ cho thử thách ở Cầu Tình Yêu: cần câu + cá, biển trả lời, ô + mưa, đá đung đưa, sạp tre, ô khoá số
import { PALETTE } from './palette.js';
import { circle, heart, roundRect, seeded } from './draw.js';
import { folkText as text } from './folk-draw.js';

// ---------- Câu cá ----------
export const WATER_Y = 30; // mặt nước dưới cầu (so với mặt đất)

// Cần câu từ tay người câu ra tới phao; dip = phao chìm xuống bao nhiêu
export function fishingRod(ctx, handX, groundY, floatX, dip) {
  const tipX = handX + 46;
  const tipY = groundY - 86;
  ctx.beginPath();
  ctx.moveTo(handX, groundY - 38);
  ctx.quadraticCurveTo(handX + 20, groundY - 70, tipX, tipY);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  const fy = groundY + WATER_Y + dip;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(floatX, fy - 6);
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 1;
  ctx.stroke();
  circle(ctx, floatX, fy - 3, 4, PALETTE.lantern, PALETTE.ink, 1.5);
  circle(ctx, floatX, fy + 2, 3, PALETTE.white, PALETTE.ink, 1.2);
}

// Vòng gợn nước quanh phao khi có cá rỉa / cắn
export function ripple(ctx, x, groundY, k) {
  ctx.beginPath();
  ctx.ellipse(x, groundY + WATER_Y + 3, 8 + k * 16, 2 + k * 4, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 - k * 0.8})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Cá dưới nước: koi cam to có đốm, cá con xám nhỏ
export function fish(ctx, x, y, dir, kind, t) {
  const koi = kind === 'koi';
  const s = koi ? 1 : 0.6;
  const wag = Math.sin(t * 10) * 3 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
  ctx.moveTo(-12, 0);
  ctx.lineTo(-22, -6 + wag);
  ctx.lineTo(-22, 6 + wag);
  ctx.closePath();
  ctx.fillStyle = koi ? PALETTE.koi : PALETTE.minnow;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  if (koi) circle(ctx, -2, -1, 3, PALETTE.koiSpot, null);
  circle(ctx, 8, -1, 1.4, PALETTE.ink, null);
  ctx.restore();
}

// ---------- Tâm đầu ý hợp ----------
// Biển trả lời; who: ai đã chọn biển này (chỉ hiện khi lật) — 'me' | 'partner' | 'both' | null
export function answerPost(ctx, x, groundY, label, { mine, who, near }) {
  roundRect(ctx, x - 3, groundY - 76, 6, 72, 3, PALETTE.trunk);
  const border = near || mine ? PALETTE.questGold : PALETTE.ink;
  roundRect(ctx, x - 40, groundY - 100, 80, 34, 10, mine ? PALETTE.blossom : PALETTE.sign, border, near || mine ? 3 : 2);
  text(ctx, label, x, groundY - 83, 10);
  if (who === 'both') heart(ctx, x, groundY - 118, 16);
  else if (who) text(ctx, who === 'me' ? '🙋 Bạn' : '💭 Người ấy', x, groundY - 116, 10, PALETTE.ink, 800);
}

export function questionBoard(ctx, x, groundY, question) {
  ctx.font = `900 13px Nunito, "Segoe UI", system-ui, sans-serif`;
  const w = Math.max(160, ctx.measureText(question).width + 36);
  const y = groundY - 170;
  roundRect(ctx, x - w / 2, y - 18, w, 36, 14, PALETTE.cream);
  text(ctx, `❓ ${question}`, x, y, 13, PALETTE.ink, 900);
}

// ---------- Chung ô dưới mưa ----------
export function umbrella(ctx, x, groundY, tilt) {
  const top = groundY - 112;
  ctx.save();
  ctx.translate(x, top + 34);
  ctx.rotate(tilt);
  roundRect(ctx, -1.5, -34, 3, 40, 1.5, PALETTE.woodDark, null);
  ctx.beginPath();
  ctx.moveTo(-50, -26);
  ctx.quadraticCurveTo(0, -80, 50, -26);
  for (let i = 4; i >= 0; i--) {
    const sx = -50 + i * 20;
    ctx.quadraticCurveTo(sx + 15, -32, sx, -26);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.umbrella;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -58);
  ctx.quadraticCurveTo(-18, -40, -22, -28);
  ctx.moveTo(6, -58);
  ctx.quadraticCurveTo(18, -40, 22, -28);
  ctx.strokeStyle = PALETTE.umbrellaStripe;
  ctx.lineWidth = 3;
  ctx.stroke();
  circle(ctx, 0, -62, 3, PALETTE.woodDark, PALETTE.ink, 1.2);
  ctx.restore();
}

// Mưa rơi xiên trong đoạn [left, right], không rơi dưới ô (sheltered: [x0, x1])
export function rain(ctx, left, right, groundY, t, sheltered) {
  ctx.strokeStyle = PALETTE.rain;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  const height = groundY + 20;
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = left + ((seeded(i) * (right - left) + t * 30) % (right - left));
    const y = (seeded(i + 500) * height + t * (420 + seeded(i + 9) * 120)) % height;
    if (sheltered && x > sheltered[0] && x < sheltered[1] && y > groundY - 112) continue;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 11);
  }
  ctx.stroke();
}

// Thanh "ướt" trên đầu người không cầm ô
export function wetMeter(ctx, x, y, frac) {
  const w = 46;
  roundRect(ctx, x - w / 2, y - 5, w, 10, 5, PALETTE.cream, PALETTE.ink, 1.5);
  if (frac > 0) roundRect(ctx, x - w / 2 + 2, y - 3, (w - 4) * Math.min(1, frac), 6, 3, frac > 0.66 ? PALETTE.minus : PALETTE.water, null);
  text(ctx, '💧', x - w / 2 - 10, y, 11);
}

// ---------- Xếp đá ----------
export const STONE_H = 13;

export function stoneAt(ctx, x, y, w = 30) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, STONE_H / 2 + 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.stone;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x - w / 6, y - 2, w / 8, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.cream;
  ctx.fill();
}

// Giàn tre treo viên đá: dây buộc từ đỉnh giàn xuống viên đá đang đung đưa
export function swingStone(ctx, x, groundY, offset, stoneY, steady) {
  const top = groundY - 190;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + offset, stoneY - 6);
  ctx.strokeStyle = steady ? PALETTE.plus : PALETTE.inkSoft;
  ctx.lineWidth = steady ? 2.5 : 1.5;
  ctx.stroke();
  stoneAt(ctx, x + offset, stoneY);
}

export function stoneFrame(ctx, x, groundY) {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 70, groundY - 4);
    ctx.lineTo(x + side * 6, groundY - 196);
    ctx.strokeStyle = PALETTE.bambooDark;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  roundRect(ctx, x - 26, groundY - 198, 52, 6, 3, PALETTE.bamboo, PALETTE.ink, 1.5);
}

// Bệ đá phẳng dưới chồng đá
export function stonePedestal(ctx, x, groundY) {
  roundRect(ctx, x - 30, groundY - 12, 60, 10, 5, PALETTE.stoneDark, PALETTE.ink, 2);
}

// ---------- Nhảy sạp ----------
// open: 0 = sạp khép, 1 = mở rộng nhất
export function sapPoles(ctx, x, groundY, open, flash) {
  roundRect(ctx, x - 100, groundY - 4, 200, 8, 4, PALETTE.woodDark, PALETTE.ink, 2); // đòn kê
  const gap = 8 + open * 62;
  for (const side of [-1, 1]) {
    circle(ctx, x + side * gap, groundY - 9, 7, PALETTE.bamboo, PALETTE.ink, 2);
    circle(ctx, x + side * gap, groundY - 9, 2.5, PALETTE.bambooDark, null);
  }
  if (flash) text(ctx, 'CẠCH!', x, groundY - 28, 12, PALETTE.minus, 900);
}

// Dải nhịp: các nhịp sắp tới chạy về vạch "bây giờ"; nhịp khép là 💥
export function beatBar(ctx, x, y, beats, nowMs, windowMs) {
  const w = 240;
  const left = x - w / 2;
  const mark = left + 40;
  const pxPerMs = 0.16;
  roundRect(ctx, left, y - 14, w, 28, 14, 'rgba(255, 248, 231, 0.92)');
  roundRect(ctx, mark - windowMs * pxPerMs, y - 12, windowMs * pxPerMs * 2, 24, 6, 'rgba(63, 166, 107, 0.25)', null);
  roundRect(ctx, mark - 1.5, y - 14, 3, 28, 1, PALETTE.ink, null);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left + 4, y - 14, w - 8, 28);
  ctx.clip();
  for (const b of beats) {
    const bx = mark + (b.at - nowMs) * pxPerMs;
    if (b.kind === 'close') {
      circle(ctx, bx, y, 9, PALETTE.minus, PALETTE.ink, 1.5);
      text(ctx, '✋', bx, y, 9, PALETTE.white, 900);
    } else {
      circle(ctx, bx, y, 4, PALETTE.bamboo, PALETTE.ink, 1.2);
    }
  }
  ctx.restore();
  text(ctx, 'Sạp khép 🔴 thì bấm ✋', x, y - 24, 10);
}

// ---------- Khoá tình yêu ----------
// mine: ô mình xoay được; mark: '✅' / '❌' sau khi thử khoá (dễ)
export function lockDial(ctx, x, groundY, n, icon, { mine, near, mark }) {
  const y = groundY - 64;
  roundRect(ctx, x - 2, y + 20, 4, groundY - y - 22, 2, PALETTE.woodDark, PALETTE.ink, 1.2);
  roundRect(ctx, x - 22, y - 22, 44, 44, 10, mine ? PALETTE.cream : PALETTE.sign, near ? PALETTE.questGold : PALETTE.ink, near ? 3 : 2);
  ctx.font = '22px Nunito, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 1);
  text(ctx, `ô ${n}${mine ? ' · bạn' : ''}`, x, y - 32, 10, mine ? PALETTE.plus : PALETTE.inkSoft, 800);
  if (mark) text(ctx, mark, x + 20, y - 20, 12);
}

// Ổ khoá to ở giữa; locked = đã khoá xong
export function bigLock(ctx, x, groundY, locked, t) {
  const y = groundY - 70;
  ctx.beginPath();
  ctx.arc(x, y - 10 - (locked ? 0 : 8), 14, Math.PI, 0);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRect(ctx, x - 22, y - 12, 44, 36, 9, PALETTE.heart);
  heart(ctx, x, y + 6 + (locked ? Math.sin(t * 3) * 1.5 : 0), 14, locked ? PALETTE.cream : PALETTE.blossom);
}
