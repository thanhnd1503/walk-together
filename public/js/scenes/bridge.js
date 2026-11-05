// Cảnh 2: Cầu Tình Yêu — bờ tre, suối có sen và cá koi
import { PALETTE } from '../palette.js';
import { circle, heart, roundRect, seeded, signpost } from '../draw.js';
import { BARRIERS, QUESTS, SCENES, isDone } from '/shared/quests.js';
import { drawBridgeFar } from './bridge-far.js';

const SCENE = SCENES[1];
const BRIDGE_BARRIER = BARRIERS[1];
const END_BARRIER = BARRIERS.at(-1);
const S = SCENE.start; // toạ độ trong cảnh tính từ đầu cảnh
export const STREAM = [S + 850, S + 1150];
const GAP = [S + 930, S + 1070]; // đoạn cầu bị gãy
const BLUEPRINT = QUESTS.find((q) => q.type === 'blueprint');
const LOCK_COLORS = ['#FF8FAB', '#F7C948', '#A2D2FF', '#CDB4DB', '#F28B82'];

const bamboos = [];
// Rặng tre ở bờ bên này; bờ bên kia là liễu rủ (bridge-far.js)
for (let x = SCENE.start + 80; x < STREAM[0] - 40; x += 230) {
  const jx = x + (seeded(x) - 0.5) * 60;
  if (jx > STREAM[0] - 60 && jx < STREAM[1] + 60) continue;
  bamboos.push({ x: jx, n: 3 + Math.floor(seeded(x + 3) * 3) });
}

function bambooCluster(ctx, x, groundY, n, t) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - n / 2) * 11;
    const h = 120 + seeded(x + i) * 70;
    const sway = Math.sin(t * 0.8 + i) * 3;
    ctx.save();
    ctx.translate(bx, groundY);
    ctx.rotate(sway * 0.004);
    roundRect(ctx, -4, -h, 8, h, 4, i % 2 ? PALETTE.bamboo : PALETTE.bambooDark, PALETTE.ink, 2);
    // Đốt tre
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    for (let y = -30; y > -h + 10; y -= 28) {
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.lineTo(4, y);
      ctx.stroke();
    }
    // Lá tre
    for (let k = 0; k < 3; k++) {
      const ly = -h + 12 + k * 22;
      const side = k % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(side * 12, ly, 12, 4, side * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.bamboo;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function stream(ctx, groundY, t, fishing) {
  const [x0, x1] = STREAM;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, groundY - 14, x1 - x0, 2000);
  // Gợn sóng
  ctx.strokeStyle = PALETTE.waterLight;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const wx = x0 + 20 + ((i * 47 + t * 12) % (x1 - x0 - 40));
    const wy = groundY + 12 + (i % 4) * 16;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 8, wy - 3, wx + 16, wy);
    ctx.stroke();
  }
  // Lá sen + hoa sen
  for (const [lx, ly] of [[S + 890, 30], [S + 970, 52], [S + 1040, 26], [S + 1110, 46]]) {
    ctx.beginPath();
    ctx.ellipse(lx, groundY + ly, 15, 5, 0, 0.25, Math.PI * 2 - 0.25);
    ctx.lineTo(lx, groundY + ly);
    ctx.closePath();
    ctx.fillStyle = PALETTE.lotusPad;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (const [lx, ly] of [[S + 970, 46], [S + 1110, 40]]) {
    for (const a of [-0.6, 0, 0.6]) {
      ctx.save();
      ctx.translate(lx, groundY + ly);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -6, 3.5, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.lotus;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  // Cá koi bơi qua lại (lúc câu cá thì ẩn, để người nhìn nước khỏi nhầm với cá đang cắn câu)
  if (fishing) return drawStreamStones(ctx, x0, x1, groundY);
  const k = (Math.sin(t * 0.5) + 1) / 2;
  const kx = x0 + 40 + k * (x1 - x0 - 80);
  const dir = Math.cos(t * 0.5) >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.ellipse(kx, groundY + 64, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.moveTo(kx - dir * 9, groundY + 64);
  ctx.lineTo(kx - dir * 16, groundY + 59);
  ctx.lineTo(kx - dir * 16, groundY + 69);
  ctx.closePath();
  ctx.fillStyle = PALETTE.koi;
  ctx.fill();
  ctx.stroke();
  drawStreamStones(ctx, x0, x1, groundY);
}

// Đá bờ suối
function drawStreamStones(ctx, x0, x1, groundY) {
  for (const sx of [x0 - 4, x1 + 4]) {
    circle(ctx, sx, groundY + 20, 9, PALETTE.inkSoft, PALETTE.ink, 2);
    circle(ctx, sx, groundY + 44, 7, PALETTE.inkSoft, PALETTE.ink, 2);
  }
}

// ---------- Mốc để mô tả vị trí ván khi nhắn tin ----------
function stone(ctx, x, groundY) {
  ctx.beginPath();
  ctx.ellipse(x, groundY - 16, 26, 18, 0, Math.PI, 0);
  ctx.lineTo(x + 26, groundY - 4);
  ctx.lineTo(x - 26, groundY - 4);
  ctx.closePath();
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  circle(ctx, x - 8, groundY - 22, 4, PALETTE.lotusPad, null); // rêu
}

function lantern(ctx, x, groundY, t) {
  roundRect(ctx, x - 3, groundY - 100, 6, 96, 3, PALETTE.woodDark, PALETTE.ink, 2);
  roundRect(ctx, x - 3, groundY - 100, 26, 6, 3, PALETTE.woodDark, PALETTE.ink, 2);
  const sway = Math.sin(t * 1.5) * 0.08;
  ctx.save();
  ctx.translate(x + 18, groundY - 95);
  ctx.rotate(sway);
  circle(ctx, 0, 22, 18, PALETTE.lanternGlow, null);
  ctx.beginPath();
  ctx.ellipse(0, 22, 11, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.lantern;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, -6, 6, 12, 4, 2, PALETTE.questGold, PALETTE.ink, 1.5);
  roundRect(ctx, -6, 35, 12, 4, 2, PALETTE.questGold, PALETTE.ink, 1.5);
  ctx.restore();
}

function waterJar(ctx, x, groundY) {
  ctx.beginPath();
  ctx.moveTo(x - 12, groundY - 40);
  ctx.quadraticCurveTo(x - 26, groundY - 22, x - 14, groundY - 4);
  ctx.lineTo(x + 14, groundY - 4);
  ctx.quadraticCurveTo(x + 26, groundY - 22, x + 12, groundY - 40);
  ctx.closePath();
  ctx.fillStyle = PALETTE.jar;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  roundRect(ctx, x - 14, groundY - 46, 28, 7, 3, PALETTE.jar);
}

// Bảng gỗ ghim bản vẽ ở đầu cảnh
function board(ctx, x, groundY) {
  roundRect(ctx, x - 26, groundY - 70, 6, 66, 3, PALETTE.woodDark, PALETTE.ink, 2);
  roundRect(ctx, x + 20, groundY - 70, 6, 66, 3, PALETTE.woodDark, PALETTE.ink, 2);
  roundRect(ctx, x - 34, groundY - 92, 68, 46, 6, PALETTE.wood);
  roundRect(ctx, x - 26, groundY - 86, 52, 34, 3, PALETTE.cream, PALETTE.ink, 1.5);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '800 9px Nunito, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Bản vẽ', x, groundY - 76);
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 1;
  for (const dy of [-66, -60]) {
    ctx.beginPath();
    ctx.moveTo(x - 18, groundY + dy);
    ctx.lineTo(x + 18, groundY + dy);
    ctx.stroke();
  }
}

// Ổ khoá tình yêu treo trên lan can
function loveLock(ctx, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y - 2, 3, Math.PI, 0);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundRect(ctx, x - 4, y - 2, 8, 7, 2, color, PALETTE.ink, 1.5);
}

// stage: 'broken' cầu gãy · 'laid' ván đã khiêng tới nhưng chưa đóng đinh · 'fixed' Cầu Tình Yêu
function bridge(ctx, groundY, stage) {
  const [x0, x1] = STREAM;
  const fixed = stage === 'fixed';
  const segments = fixed ? [[x0 - 6, x1 + 6]] : [[x0 - 6, GAP[0]], [GAP[1], x1 + 6]];
  // Lan can phía sau
  for (const [a, b] of segments) {
    for (let px = a + 6; px <= b - 4; px += 50) roundRect(ctx, px - 3, groundY - 38, 6, 34, 2, PALETTE.woodDark, PALETTE.ink, 2);
    roundRect(ctx, a, groundY - 40, b - a, 6, 3, PALETTE.wood, PALETTE.ink, 2);
  }
  // Mặt cầu
  for (const [a, b] of segments) roundRect(ctx, a, groundY - 6, b - a, 11, 4, PALETTE.wood);
  if (stage === 'laid') {
    // Ván mới đặt tạm, hơi lệch, chưa đóng đinh
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(GAP[0] + 24 + i * 46, groundY - 1);
      ctx.rotate((i - 1) * 0.06);
      roundRect(ctx, -24, -5, 48, 10, 3, PALETTE.woodLight);
      ctx.restore();
    }
  }
  if (fixed) {
    // Cầu Tình Yêu: trái tim trên đầu cột, ổ khoá tình yêu dọc lan can
    for (let px = x0; px <= x1; px += 50) heart(ctx, px, groundY - 46, 11);
    for (let i = 0, lx = x0 + 18; lx < x1 - 10; lx += 17, i++) loveLock(ctx, lx, groundY - 30, LOCK_COLORS[i % LOCK_COLORS.length]);
  }
  if (stage === 'broken') {
    // Tấm ván gãy rủ xuống nước
    ctx.save();
    ctx.translate(GAP[0], groundY);
    ctx.rotate(0.9);
    roundRect(ctx, -2, -4, 34, 8, 3, PALETTE.wood);
    ctx.restore();
  }
  // Cột chống dưới cầu
  for (const px of [x0 + 10, x1 - 10]) roundRect(ctx, px - 4, groundY + 4, 8, 60, 3, PALETTE.woodDark, PALETTE.ink, 2);
}

function fence(ctx, x, groundY) {
  for (let px = x; px < x + 120; px += 22) roundRect(ctx, px, groundY - 40, 8, 40, 3, PALETTE.wood, PALETTE.ink, 2);
  roundRect(ctx, x - 4, groundY - 30, 120, 6, 3, PALETTE.woodDark, PALETTE.ink, 2);
}

const visible = (x, left, right, pad = 80) => x > left - pad && x < right + pad;

export function drawBridgeScene(ctx, groundY, left, right, questIndex, t) {
  if (right < SCENE.start || left > SCENE.end) return;
  drawBridgeFar(ctx, groundY, left, right, questIndex, t);
  for (const b of bamboos) {
    if (visible(b.x, left, right)) bambooCluster(ctx, b.x, groundY - 18, b.n, t);
  }
  const [stoneMark, lanternMark, jarMark] = BLUEPRINT.landmarks;
  if (visible(stoneMark.x, left, right)) stone(ctx, stoneMark.x, groundY - 14);
  if (visible(lanternMark.x, left, right)) lantern(ctx, lanternMark.x, groundY - 14, t);
  if (visible(jarMark.x, left, right)) waterJar(ctx, jarMark.x, groundY - 14);
  if (visible(BLUEPRINT.boardX, left, right)) board(ctx, BLUEPRINT.boardX, groundY - 14);

  if (right > STREAM[0] - 20 && left < STREAM[1] + 20) {
    stream(ctx, groundY, t, QUESTS[questIndex]?.type === 'fishing');
    const stage = isDone(questIndex, BRIDGE_BARRIER.after) ? 'fixed' : isDone(questIndex, 'carry') ? 'laid' : 'broken';
    bridge(ctx, groundY, stage);
    // Biển tên cầu
    const mid = (STREAM[0] + STREAM[1]) / 2;
    roundRect(ctx, mid - 58, groundY - 84, 116, 24, 10, PALETTE.sign);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '800 12px Nunito, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Cầu Tình Yêu', mid, groundY - 72);
    heart(ctx, mid - 66, groundY - 72, 12);
    heart(ctx, mid + 66, groundY - 72, 12);
  }
  if (END_BARRIER.x > left - 150 && END_BARRIER.x < right + 150) {
    signpost(ctx, END_BARRIER.x + 30, groundY - 14, ['Hồ Đom Đóm →', '(sắp mở cửa)']);
    fence(ctx, END_BARRIER.x + 70, groundY - 6);
  }
}
