// Bản vẽ thu nhỏ: chỉ người cầm bản vẽ thấy khi đứng ở bảng gỗ
import { PALETTE } from './palette.js';
import { circle, roundRect } from './draw.js';

const MAP_H = 118;
const FONT = 'Nunito, "Segoe UI", system-ui, sans-serif';

export function blueprintMap(ctx, { viewW, top, q, items, meX, partnerX }) {
  const w = Math.min(viewW - 24, 540);
  const left = (viewW - w) / 2;
  const [x0, x1] = [q.range[0] - 40, q.range[1] + 30];
  const mapX = (x) => left + 18 + ((x - x0) / (x1 - x0)) * (w - 36);
  const lineY = top + 74;

  roundRect(ctx, left, top, w, MAP_H, 14, PALETTE.cream);
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText('🗺️ Bản vẽ — ✓ ván tốt · ✗ ván mục', left + w / 2, top + 14);

  // Đường bờ suối
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mapX(x0) - 6, lineY);
  ctx.lineTo(mapX(x1) + 6, lineY);
  ctx.stroke();

  // Mốc
  for (const m of q.landmarks) {
    ctx.font = `16px ${FONT}`;
    ctx.fillText(m.icon, mapX(m.x), lineY - 26);
    ctx.font = `700 9px ${FONT}`;
    ctx.fillText(m.name, mapX(m.x), lineY - 40);
    ctx.strokeStyle = PALETTE.inkSoft;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mapX(m.x), lineY - 16);
    ctx.lineTo(mapX(m.x), lineY + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Ván
  for (const it of items) {
    const x = mapX(it.x);
    const good = it.kind === 'good';
    roundRect(ctx, x - 6, lineY - 3, 12, 6, 2, PALETTE.wood, PALETTE.ink, 1.2);
    ctx.font = `900 11px ${FONT}`;
    ctx.fillStyle = good ? PALETTE.plus : PALETTE.minus;
    ctx.fillText(good ? '✓' : '✗', x, lineY + 13);
  }

  // Vị trí hai người
  const who = [[meX, 'Bạn', PALETTE.ink], [partnerX, 'Người ấy', PALETTE.heart]];
  for (const [x, label, color] of who) {
    if (x === undefined || x < x0 - 200 || x > x1 + 200) continue;
    const mx = Math.max(left + 10, Math.min(left + w - 10, mapX(x)));
    circle(ctx, mx, lineY + 28, 4, color, null);
    ctx.fillStyle = color;
    ctx.font = `700 9px ${FONT}`;
    ctx.fillText(label, mx, lineY + 38);
  }
}
