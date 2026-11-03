// Vẽ nhân vật chibi theo ngoại hình (look). Gốc toạ độ là điểm giữa hai chân.
import { PALETTE, OUTFIT_HEX, HAIR_HEX, SKIN_HEX } from './palette.js';
import { circle, roundRect, star } from './draw.js';
import { HEAD_R, drawAccessory, drawBackHair, drawFace, drawHairTop } from './character-head.js';

const MAX_REACH = 30;

// Màu quần theo trang phục; không có thì là chân trần (váy, quần short)
const LEG_COLOR = {
  aoDai: PALETTE.aoDaiPants,
  baBa: PALETTE.baBaPants,
  tshirtJeans: PALETTE.jeans,
  shirtPants: PALETTE.slacks,
  hoodie: PALETTE.jogger,
};

function bodyColor(look) {
  return look.outfit === 'jersey' ? PALETTE.jersey : OUTFIT_HEX[look.outfitColor] ?? OUTFIT_HEX.white;
}

// pose: { dir, bounce, legSwing, step, reach }
export function drawCharacter(ctx, look, pose) {
  const { dir = 1, bounce = 0, legSwing = 0, step = 0, reach = null } = pose;
  const male = look.gender === 'male';
  const colors = {
    body: bodyColor(look),
    hair: HAIR_HEX[look.hairColor] ?? HAIR_HEX.black,
    skin: SKIN_HEX[look.skin] ?? SKIN_HEX.fair,
  };
  const y = bounce;
  const headY = y - 52;

  // Bóng
  ctx.fillStyle = 'rgba(92, 75, 81, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(dir, 1);

  drawBackHair(ctx, look.hair, colors.hair, headY, step);
  if (look.outfit === 'hoodie') circle(ctx, -7, y - 37, 10, colors.body); // mũ trùm sau gáy
  drawLegs(ctx, look.outfit, colors.skin, y, legSwing);
  drawTorso(ctx, look.outfit, colors.body, y, legSwing, male);

  if (reach === null) {
    circle(ctx, -12 - legSwing * 0.6, y - 22, 4.5, colors.skin, PALETTE.ink, 2);
    circle(ctx, 12 + legSwing * 0.6, y - 22, 4.5, colors.skin, PALETTE.ink, 2);
  }

  circle(ctx, 0, headY, HEAD_R, colors.skin);
  drawFace(ctx, look.eyes, male, headY);
  drawHairTop(ctx, look.hair, colors.hair, headY);
  drawAccessory(ctx, look.accessory, headY);
  ctx.restore();

  // Tay đang nắm vươn về phía người kia (ngoài phép lật để dùng toạ độ thật)
  if (reach !== null) {
    const r = Math.max(-MAX_REACH, Math.min(MAX_REACH, reach));
    const side = Math.sign(r) || 1;
    ctx.beginPath();
    ctx.moveTo(side * 8, y - 26);
    ctx.quadraticCurveTo(r * 0.6, y - 18, r, y - 20);
    ctx.strokeStyle = colors.body;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
    circle(ctx, r, y - 20, 4.5, colors.skin, PALETTE.ink, 2);
    circle(ctx, -side * 12, y - 22, 4.5, colors.skin, PALETTE.ink, 2);
  }
}

function drawLegs(ctx, outfit, skin, y, swing) {
  const pants = LEG_COLOR[outfit];
  const width = outfit === 'aoDai' ? 8 : 7; // quần áo dài ống rộng
  for (const [x, s] of [[-8, swing], [1, -swing]]) {
    roundRect(ctx, x + s, y - 14, width, 14, 3.5, pants ?? skin);
    roundRect(ctx, x + s - 0.5, y - 4, 9, 5, 2.5, PALETTE.shoe, null);
  }
}

// Tà áo dài phủ qua chân, xẻ ở giữa: side = 1 tà trước, -1 tà sau
function drawAoDaiFlap(ctx, color, y, swing, male, side) {
  const bottom = male ? y - 8 : y - 5;
  const sway = swing * 0.6 * side;
  const inner = side * 0.8;
  const outer = side * (male ? 12 : 13);
  ctx.beginPath();
  ctx.moveTo(inner, y - 22);
  ctx.lineTo(side * 10, y - 22);
  ctx.quadraticCurveTo(outer, (y - 22 + bottom) / 2, outer + sway, bottom);
  ctx.lineTo(inner + sway * 0.5, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function skirt(ctx, color, y, top, bottom, flare) {
  ctx.beginPath();
  ctx.moveTo(-10, y - top);
  ctx.lineTo(10, y - top);
  ctx.quadraticCurveTo(10 + flare, y - (top + bottom) / 2, 10 + flare, y - bottom);
  ctx.lineTo(-10 - flare, y - bottom);
  ctx.quadraticCurveTo(-10 - flare, y - (top + bottom) / 2, -10, y - top);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawTorso(ctx, outfit, color, y, swing, male) {
  const w = male ? 24 : 22;
  const x0 = -w / 2;

  if (outfit === 'aoDai') {
    drawAoDaiFlap(ctx, color, y, swing, male, -1);
    drawAoDaiFlap(ctx, color, y, swing, male, 1);
    roundRect(ctx, x0, y - 35, w, 16, 8, color);
    roundRect(ctx, -5, y - 39, 10, 6, 2.5, color); // cổ áo đứng
    return;
  }

  roundRect(ctx, x0, y - 35, w, outfit === 'baBa' ? 25 : 24, male ? 8 : 9, color);

  switch (outfit) {
    case 'baBa':
      for (const by of [-30, -24, -18]) circle(ctx, 5, y + by, 1.3, PALETTE.ink, null);
      break;
    case 'dress':
      skirt(ctx, color, y, 21, 4, 5);
      break;
    case 'tshirtSkirt':
      skirt(ctx, PALETTE.denimSkirt, y, 19, 7, 5);
      break;
    case 'shirtPants': {
      // Cổ áo sơ mi + hàng cúc
      const collar = color === OUTFIT_HEX.white ? PALETTE.cream : PALETTE.white;
      ctx.beginPath();
      ctx.moveTo(-6, y - 35);
      ctx.lineTo(0, y - 29);
      ctx.lineTo(6, y - 35);
      ctx.fillStyle = collar;
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      for (const by of [-25, -19]) circle(ctx, 0, y + by, 1.2, PALETTE.ink, null);
      break;
    }
    case 'hoodie':
      roundRect(ctx, -6, y - 22, 12, 6, 3, null, PALETTE.ink, 1.5);
      ctx.beginPath();
      for (const x of [-3, 3]) {
        ctx.moveTo(x, y - 34);
        ctx.lineTo(x, y - 28);
      }
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'jersey':
      // Áo đội tuyển: đỏ, ngôi sao vàng
      star(ctx, 3, y - 26, 5, PALETTE.jerseyStar);
      roundRect(ctx, x0, y - 17, w, 8, 4, PALETTE.jerseyShorts);
      break;
    default:
  }
}
