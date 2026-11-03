// Hàm vẽ dùng chung, phong cách bo tròn dễ thương
import { PALETTE } from './palette.js';

export function roundRect(ctx, x, y, w, h, r, fill, stroke = PALETTE.ink, lineWidth = 2.5) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function circle(ctx, x, y, r, fill, stroke = PALETTE.ink, lineWidth = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function heart(ctx, x, y, size, fill = PALETTE.heart) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.5);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function cloud(ctx, x, y, scale) {
  ctx.fillStyle = PALETTE.cloud;
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 10 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 48 * scale, y, 18 * scale, 0, Math.PI * 2);
  ctx.rect(x, y, 48 * scale, 18 * scale);
  ctx.fill();
}

// Cây anh đào: thân cong nhẹ + tán hoa là cụm hình tròn
export function blossomTree(ctx, x, groundY, scale = 1) {
  const s = scale;
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, groundY);
  ctx.quadraticCurveTo(x - 4 * s, groundY - 50 * s, x - 10 * s, groundY - 85 * s);
  ctx.lineTo(x + 6 * s, groundY - 85 * s);
  ctx.quadraticCurveTo(x + 6 * s, groundY - 45 * s, x + 9 * s, groundY);
  ctx.closePath();
  ctx.fillStyle = PALETTE.trunk;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const puffs = [[-30, -95, 26], [0, -118, 32], [30, -96, 27], [-14, -82, 22], [16, -80, 22]];
  for (const [dx, dy, r] of puffs) circle(ctx, x + dx * s, groundY + dy * s, r * s, PALETTE.blossom);
  // Che các nét viền bên trong cho tán nhìn liền khối
  for (const [dx, dy, r] of puffs) circle(ctx, x + dx * s, groundY + dy * s, (r - 2.5) * s, PALETTE.blossom, null);
  for (const [dx, dy] of [[-20, -100], [12, -122], [28, -92], [-2, -86]]) {
    circle(ctx, x + dx * s, groundY + dy * s, 4 * s, PALETTE.blossomDeep, null);
  }
}

export function petal(ctx, x, y, rot, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.blossomDeep;
  ctx.fill();
  ctx.restore();
}

// Ngắt chữ theo độ rộng tối đa, trả về mảng các dòng
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // Từ quá dài (không có khoảng trắng) thì cắt theo ký tự
  return lines.flatMap((l) => {
    if (ctx.measureText(l).width <= maxWidth) return [l];
    const parts = [];
    let cur = '';
    for (const ch of l) {
      if (ctx.measureText(cur + ch).width > maxWidth && cur) {
        parts.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  });
}

export function polygon(ctx, points, fill, stroke = PALETTE.ink, lineWidth = 2.2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function star(ctx, x, y, r, fill) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    points.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  polygon(ctx, points, fill, null);
}

// Số ngẫu nhiên cố định theo hạt giống, để cảnh giống nhau trên mọi máy
export function seeded(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// Biển gỗ có chữ, đáy cột ở (x, groundY); dòng 1 đậm, các dòng sau nhỏ hơn
export function signpost(ctx, x, groundY, lines, width = 116) {
  const h = 18 + lines.length * 13;
  roundRect(ctx, x - 4, groundY - 70, 8, 70, 3, PALETTE.trunk);
  roundRect(ctx, x - width / 2, groundY - 72 - h / 2, width, h, 10, PALETTE.sign);
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? '800 11px Nunito, "Segoe UI", system-ui, sans-serif' : '600 9px Nunito, "Segoe UI", system-ui, sans-serif';
    ctx.fillText(line, x, groundY - 72 - h / 2 + 15 + i * 13);
  });
}
