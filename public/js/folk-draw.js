// Hình vẽ cho trò dân gian: dê, khăn bịt mắt, cột còn + vòng, quả còn, thanh lực, thẻ hoa, dây kéo co, bù nhìn rơm
import { PALETTE } from './palette.js';
import { circle, heart, roundRect } from './draw.js';

const FONT = 'Nunito, "Segoe UI", system-ui, sans-serif';

function text(ctx, str, x, y, size, color = PALETTE.ink, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.cream;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Chú dê trắng nhỏ, dir = hướng đi
// decoy = dê bù nhìn: thân rơm, mắt chéo
export function goat(ctx, x, groundY, dir, t, decoy = false) {
  const hop = Math.abs(Math.sin(t * 8)) * 2;
  ctx.save();
  ctx.translate(x, groundY - hop);
  ctx.scale(dir || 1, 1);
  for (const lx of [-9, -3, 5, 11]) roundRect(ctx, lx - 2, -12, 4, 12, 2, PALETTE.inkSoft, PALETTE.ink, 1.5);
  ctx.beginPath();
  ctx.ellipse(0, -18, 16, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = decoy ? PALETTE.nonLa : PALETTE.white;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, 16, -27, 7, decoy ? PALETTE.nonLa : PALETTE.white, PALETTE.ink, 2);
  ctx.beginPath();
  ctx.moveTo(13, -33);
  ctx.quadraticCurveTo(10, -42, 6, -40);
  ctx.moveTo(18, -33);
  ctx.quadraticCurveTo(20, -42, 16, -42);
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (decoy) {
    ctx.beginPath();
    ctx.moveTo(17, -30);
    ctx.lineTo(21, -26);
    ctx.moveTo(21, -30);
    ctx.lineTo(17, -26);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    circle(ctx, 19, -28, 1.5, PALETTE.ink, null);
  }
  ctx.beginPath();
  ctx.moveTo(17, -21);
  ctx.lineTo(19, -16);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// Khăn bịt mắt vẽ chồng lên đầu nhân vật
export function blindfold(ctx, x, groundY) {
  roundRect(ctx, x - 19, groundY - 57, 38, 9, 4, PALETTE.lantern, PALETTE.ink, 1.5);
  roundRect(ctx, x - 26, groundY - 54, 8, 5, 2, PALETTE.lantern, PALETTE.ink, 1.2);
}

// Màn hình tối của người bịt mắt, chừa một vòng nhỏ quanh mình
export function darkness(ctx, w, h, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(30, 22, 34, 0.94)';
  ctx.fill('evenodd');
  ctx.restore();
}

// Cột còn: vòng trượt ngang ở đỉnh; hidden = người ném không thấy (mây che)
export const POLE_HEIGHT = 170;

// wind: điểm cần hô lệch khỏi giữa cột (chỉ người hô thấy)
export function nemconPole(ctx, x, groundY, ring, hidden, t, wind = 0) {
  const top = groundY - POLE_HEIGHT;
  roundRect(ctx, x - 4, top, 8, POLE_HEIGHT, 3, PALETTE.bamboo, PALETTE.ink, 2);
  roundRect(ctx, x - 42, top - 6, 84, 6, 3, PALETTE.bambooDark, PALETTE.ink, 1.5);
  if (!hidden && ring !== null) {
    const rx = x + ring * 34;
    ctx.beginPath();
    ctx.ellipse(rx, top - 22, 10, 14, 0, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.questGold;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Mốc điểm cần hô (lệch theo gió) + cờ gió
    const tx = x + (wind ?? 0) * 34;
    roundRect(ctx, tx - 2, top - 10, 4, 8, 1, PALETTE.minus, null);
    if (wind) text(ctx, wind < 0 ? '🎐 ← gió' : 'gió → 🎐', x, top + 14, 10, PALETTE.ink, 700);
  } else {
    for (const [dx, dy, r] of [[-26, -22, 16], [0, -30, 20], [26, -22, 16], [0, -14, 14]]) circle(ctx, x + dx, top + dy, r, PALETTE.cloud, null);
    text(ctx, '☁️ mây che', x, top - 22 + Math.sin(t * 2) * 2, 10, PALETTE.inkSoft, 700);
  }
}

// Quả còn bay theo đường cong; k: 0 → 1
export function nemconBall(ctx, fromX, toX, groundY, k, ok) {
  const top = groundY - POLE_HEIGHT - 22;
  const x = fromX + (toX - fromX) * Math.min(1, k);
  const y = k <= 1 ? groundY - 40 + (top - (groundY - 40)) * (1 - (1 - k) ** 2) : top + (k - 1) * 600 * (ok ? 0 : 1);
  circle(ctx, x, y, 7, PALETTE.lantern, PALETTE.ink, 2);
  ctx.beginPath();
  ctx.moveTo(x, y + 7);
  ctx.lineTo(x - 4, y + 16);
  ctx.moveTo(x, y + 7);
  ctx.lineTo(x + 4, y + 16);
  ctx.strokeStyle = PALETTE.questGold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Thanh lực ném: vùng xanh = vừa đủ cao tới vòng
export function powerBar(ctx, x, y, power, zone) {
  const w = 130;
  roundRect(ctx, x - w / 2, y - 9, w, 18, 9, PALETTE.cream);
  roundRect(ctx, x - w / 2 + w * zone[0], y - 9, w * (zone[1] - zone[0]), 18, 3, PALETTE.plus, null);
  roundRect(ctx, x - w / 2, y - 9, w, 18, 9, null);
  roundRect(ctx, x - w / 2 + 2, y - 5, (w - 4) * power, 10, 5, PALETTE.lantern, null);
  text(ctx, 'Lực ném', x, y - 20, 10);
}

// Thẻ hoa treo cao hơn đầu (đứng ngay dưới vẫn thấy): down = úp, up = đang lật, done = đã ghép đôi
export function flowerCard(ctx, x, groundY, state, icon, near) {
  const top = groundY - 150;
  roundRect(ctx, x - 2, top + 50, 4, groundY - top - 50, 2, PALETTE.woodDark, PALETTE.ink, 1.2);
  ctx.save();
  if (state === 'done') ctx.globalAlpha = 0.55;
  roundRect(ctx, x - 20, top, 40, 52, 7, state === 'down' ? PALETTE.blossomDeep : PALETTE.white, near ? PALETTE.questGold : PALETTE.ink, near ? 3 : 2);
  if (state === 'down') {
    heart(ctx, x, top + 26, 14, PALETTE.cream);
  } else {
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, top + 27);
  }
  ctx.restore();
  if (state === 'done') text(ctx, '✓', x + 14, top + 6, 14, PALETTE.plus, 900);
}

// Bù nhìn rơm của đội kéo co bên kia; lean > 0 là bị kéo về phía mình
export function scarecrow(ctx, x, groundY, lean) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.rotate(-lean * 0.25);
  roundRect(ctx, -3, -70, 6, 70, 3, PALETTE.woodDark, PALETTE.ink, 1.5);
  roundRect(ctx, -22, -56, 44, 6, 3, PALETTE.woodDark, PALETTE.ink, 1.5);
  roundRect(ctx, -12, -58, 24, 30, 8, PALETTE.nonLa);
  circle(ctx, 0, -72, 11, PALETTE.nonLa);
  circle(ctx, -4, -73, 1.6, PALETTE.ink, null);
  circle(ctx, 4, -73, 1.6, PALETTE.ink, null);
  ctx.beginPath();
  ctx.moveTo(-18, -80);
  ctx.lineTo(0, -96);
  ctx.lineTo(18, -80);
  ctx.closePath();
  ctx.fillStyle = PALETTE.nonLa;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Dây kéo co + dải đỏ ở giữa
export function tugRope(ctx, fromX, toX, groundY, ribbonX) {
  ctx.beginPath();
  ctx.moveTo(fromX, groundY - 26);
  ctx.lineTo(toX, groundY - 34);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRect(ctx, ribbonX - 4, groundY - 40, 8, 16, 2, PALETTE.minus, PALETTE.ink, 1.5);
}

// Thanh tiến độ kéo co (−1 … 1)
export function tugMeter(ctx, x, y, s) {
  const w = 180;
  roundRect(ctx, x - w / 2, y - 8, w, 16, 8, PALETTE.cream);
  roundRect(ctx, x - 1, y - 11, 2, 22, 1, PALETTE.ink, null);
  const fill = (w / 2 - 3) * Math.abs(s);
  if (s > 0) roundRect(ctx, x - fill, y - 5, fill, 10, 5, PALETTE.plus, null);
  if (s < 0) roundRect(ctx, x, y - 5, fill, 10, 5, PALETTE.minus, null);
  text(ctx, '💪 Mình', x - w / 2 + 26, y - 20, 10);
  text(ctx, 'Bù nhìn', x + w / 2 - 24, y - 20, 10);
}

export { text as folkText };
