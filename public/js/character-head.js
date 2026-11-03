// Phần đầu nhân vật: tóc, mặt, phụ kiện. Toạ độ đã lật theo hướng nhìn (mặt quay sang +x).
import { PALETTE } from './palette.js';
import { circle, polygon, roundRect } from './draw.js';

export const HEAD_R = 18;
const EYES_X = [1, 10];

function fillStroke(ctx, fill, lineWidth = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// ---------- Tóc phía sau đầu (vẽ trước đầu) ----------
export function drawBackHair(ctx, hair, color, headY, step) {
  if (hair === 'long') {
    roundRect(ctx, -19, headY - 4, 20, 36, 9, color);
  } else if (hair === 'bob') {
    roundRect(ctx, -20, headY - 6, 23, 22, 9, color);
  } else if (hair === 'ponytail') {
    ctx.save();
    ctx.translate(-16, headY - 6);
    ctx.rotate(0.55 + Math.sin(step) * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, 13, 7, 15, 0, 0, Math.PI * 2);
    fillStroke(ctx, color);
    ctx.restore();
    circle(ctx, -16, headY - 6, 3.5, PALETTE.hairTie, PALETTE.ink, 2);
  } else if (hair === 'bun') {
    circle(ctx, -6, headY - 21, 9, color);
  } else if (hair === 'braid') {
    // Bím tóc thả sau lưng, đung đưa nhẹ khi đi
    const sway = Math.sin(step) * 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(-15 + sway * (i / 5), headY + 4 + i * 6.5, 5.5 - i * 0.4, 4.6, 0, 0, Math.PI * 2);
      fillStroke(ctx, color, 2);
    }
    circle(ctx, -15 + sway, headY + 40, 3, PALETTE.hairTie, PALETTE.ink, 1.8);
  }
}

// ---------- Mặt ----------
export function drawFace(ctx, eyes, male, headY) {
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const ex of EYES_X) {
    if (eyes === 'happy') {
      ctx.beginPath();
      ctx.arc(ex, headY + 4.5, 2.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (eyes === 'sparkle') {
      circle(ctx, ex, headY + 3, 3, PALETTE.ink, null);
      circle(ctx, ex + 0.9, headY + 2, 1.1, PALETTE.white, null);
    } else if (eyes === 'monolid') {
      ctx.beginPath();
      ctx.ellipse(ex, headY + 3.5, 2.7, 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.ink;
      ctx.fill();
    } else {
      circle(ctx, ex, headY + 3, 2.2, PALETTE.ink, null);
    }
    // Nam có lông mày ngang
    if (male) {
      ctx.beginPath();
      ctx.moveTo(ex - 2.5, headY - 2);
      ctx.lineTo(ex + 2.5, headY - 2.5);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = male ? 0.55 : 1;
  circle(ctx, -3, headY + 9, male ? 3 : 3.5, PALETTE.cheek, null);
  circle(ctx, 14, headY + 9, male ? 2.5 : 3, PALETTE.cheek, null);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(5.5, headY + 8, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

// ---------- Tóc phía trên (vẽ sau mặt) ----------
export function drawHairTop(ctx, hair, color, headY) {
  const R = HEAD_R;
  ctx.beginPath();
  switch (hair) {
    case 'short':
      ctx.arc(0, headY, R + 1, Math.PI * 0.95, Math.PI * 2.02);
      ctx.quadraticCurveTo(12, headY - 12, 8, headY - 9);
      ctx.quadraticCurveTo(-4, headY - 13, -18, headY + 2);
      break;
    case 'sidePart':
      // Mái lệch kiểu Hàn, rất phổ biến ở các bạn trẻ Việt
      ctx.arc(0, headY, R + 1.5, Math.PI * 0.93, Math.PI * 2.04);
      ctx.quadraticCurveTo(17, headY - 6, 12, headY - 1);
      ctx.quadraticCurveTo(4, headY - 10, -6, headY - 12);
      ctx.quadraticCurveTo(-14, headY - 8, -18, headY + 3);
      break;
    case 'spiky':
      // Tóc vuốt ngược ra sau, ngắn và mềm
      for (const [x, lift] of [[-12, 20], [-4, 24], [4, 24], [11, 21]]) {
        ctx.beginPath();
        ctx.moveTo(x + 5, headY - 14);
        ctx.quadraticCurveTo(x, headY - lift + 2, x - 6, headY - lift);
        ctx.quadraticCurveTo(x - 3, headY - 16, x - 5, headY - 12);
        ctx.closePath();
        fillStroke(ctx, color, 2.2);
      }
      ctx.beginPath();
      ctx.arc(0, headY, R + 1, Math.PI * 0.95, Math.PI * 2.02);
      ctx.quadraticCurveTo(12, headY - 12, 8, headY - 9);
      ctx.quadraticCurveTo(-4, headY - 13, -18, headY + 2);
      break;
    case 'buzz':
      ctx.arc(0, headY, R + 0.8, Math.PI * 0.98, Math.PI * 2.02);
      ctx.lineTo(15, headY - 8);
      ctx.quadraticCurveTo(0, headY - 13, -17, headY - 3);
      break;
    case 'mushroom':
      ctx.arc(0, headY, R + 3, Math.PI * 0.88, Math.PI * 2.04);
      ctx.lineTo(15, headY - 1);
      ctx.lineTo(-12, headY - 1);
      break;
    default:
      // Tóc nữ: mái chéo mềm
      ctx.arc(0, headY, R + 1, Math.PI * 0.92, Math.PI * 2.02);
      ctx.quadraticCurveTo(14, headY - 12, 6, headY - 6);
      ctx.quadraticCurveTo(-4, headY - 12, -18, headY + 4);
  }
  ctx.closePath();
  fillStroke(ctx, color);
}

// ---------- Phụ kiện ----------
export function drawAccessory(ctx, accessory, headY) {
  switch (accessory) {
    case 'nonLa': {
      // Nón lá
      ctx.beginPath();
      ctx.moveTo(-30, headY - 6);
      ctx.lineTo(0, headY - 36);
      ctx.lineTo(30, headY - 6);
      ctx.quadraticCurveTo(0, headY - 1, -30, headY - 6);
      fillStroke(ctx, PALETTE.nonLa);
      ctx.strokeStyle = PALETTE.nonLaLine;
      ctx.lineWidth = 1.5;
      for (const k of [0.33, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(-30 * k, headY - 36 + 30 * k);
        ctx.quadraticCurveTo(0, headY - 34 + 32 * k, 30 * k, headY - 36 + 30 * k);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(9, headY - 4);
      ctx.quadraticCurveTo(10, headY + 10, 6, headY + 17);
      ctx.stroke();
      break;
    }
    case 'helmet':
      // Mũ bảo hiểm nửa đầu
      ctx.beginPath();
      ctx.arc(0, headY - 2, HEAD_R + 3, Math.PI, Math.PI * 2);
      ctx.closePath();
      fillStroke(ctx, PALETTE.helmet);
      roundRect(ctx, 14, headY - 7, 12, 5, 2.5, PALETTE.helmetVisor);
      circle(ctx, -6, headY - 12, 3, PALETTE.white, null);
      ctx.beginPath();
      ctx.moveTo(8, headY - 2);
      ctx.lineTo(6, headY + 17);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'cap':
      ctx.beginPath();
      ctx.arc(0, headY - 4, HEAD_R + 2, Math.PI, Math.PI * 2);
      ctx.closePath();
      fillStroke(ctx, PALETTE.cap);
      roundRect(ctx, 10, headY - 8, 20, 5, 2.5, PALETTE.capBrim);
      circle(ctx, 0, headY - 24, 2.5, PALETTE.capBrim, PALETTE.ink, 1.8);
      break;
    case 'khanDong':
      // Khăn đóng đi cùng áo dài nam
      roundRect(ctx, -20, headY - 19, 40, 13, 6, PALETTE.khanDong);
      ctx.strokeStyle = PALETTE.khanDongLine;
      ctx.lineWidth = 1.5;
      for (const x of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(x - 3, headY - 17);
        ctx.lineTo(x + 3, headY - 8);
        ctx.stroke();
      }
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        circle(ctx, -9 + Math.cos(a) * 3.5, headY - 14 + Math.sin(a) * 3.5, 2.6, PALETTE.blossomDeep, null);
      }
      circle(ctx, -9, headY - 14, 1.8, PALETTE.cream, null);
      break;
    case 'bow': {
      const [x, y] = [-7, headY - 17];
      polygon(ctx, [[x, y], [x - 9, y - 6], [x - 9, y + 6]], PALETTE.bow);
      polygon(ctx, [[x, y], [x + 9, y - 6], [x + 9, y + 6]], PALETTE.bow);
      circle(ctx, x, y, 3, PALETTE.bow, PALETTE.ink, 2);
      break;
    }
    case 'glasses':
      for (const ex of EYES_X) circle(ctx, ex, headY + 3, 4.6, 'rgba(255, 255, 255, 0.3)', PALETTE.ink, 1.8);
      ctx.beginPath();
      ctx.moveTo(-3.6, headY + 2);
      ctx.lineTo(-12, headY);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      break;
    default:
  }
}
