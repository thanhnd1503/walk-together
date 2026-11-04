// Cảnh 1: Cổng Hoa Đào
import { PALETTE } from '../palette.js';
import { blossomTree, circle, roundRect, seeded, signpost } from '../draw.js';
import { BARRIERS, QUESTS, SCENES, isDone } from '/shared/quests.js';
import { lanternWord, oldTree, photoFrame } from '../challenge-draw.js';
import { nemconPole, scarecrow } from '../folk-draw.js';

const SCENE = SCENES[0];
const ENTRANCE_X = 120;
const BARRIER = BARRIERS[0];
const DOOR_X = BARRIER.x + 34; // cổng gỗ nằm ngay sau điểm dừng
const TREE_GAP = 210;

const STATUE = QUESTS.find((q) => q.type === 'statue');
const CADAO = QUESTS.find((q) => q.type === 'cadao');
const PHOTO = QUESTS.find((q) => q.type === 'photo');
const NEMCON = QUESTS.find((q) => q.type === 'nemcon');
const TUG = QUESTS.find((q) => q.type === 'tug');
const LANTERNS = [CADAO.slots[0] - 60, CADAO.slots.at(-1) + 60];

// Chừa chỗ cho cây đào già, dây đèn lồng, khung ảnh
const crowded = (x) => [STATUE.treeX, PHOTO.frameX, NEMCON.poleX, TUG.opponentX + 17].some((cx) => Math.abs(x - cx) < 110)
  || (x > LANTERNS[0] && x < LANTERNS[1]);
const trees = [];
for (let x = 380; x < BARRIER.x - 120; x += TREE_GAP) {
  const tx = x + (seeded(x) - 0.5) * 70;
  if (!crowded(tx)) trees.push({ x: tx, scale: 0.85 + seeded(x + 1) * 0.35 });
}

function entrance(ctx, x, groundY) {
  const top = groundY - 150;
  roundRect(ctx, x - 70, top + 20, 14, 130, 6, PALETTE.gate);
  roundRect(ctx, x + 56, top + 20, 14, 130, 6, PALETTE.gate);
  roundRect(ctx, x - 90, top, 180, 18, 9, PALETTE.gateDark);
  roundRect(ctx, x - 78, top + 34, 156, 12, 6, PALETTE.gate);
  roundRect(ctx, x - 46, top + 50, 92, 26, 10, PALETTE.sign);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '800 12px Nunito, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cổng Hoa Đào', x, top + 63);
  for (const dx of [-80, -40, 40, 80]) circle(ctx, x + dx, top + 2, 9, PALETTE.blossom);
}

// Cổng gỗ cuối cảnh: đóng cho tới khi xong nhiệm vụ
function woodenGate(ctx, x, groundY, open) {
  const h = 74;
  roundRect(ctx, x - 40, groundY - h - 6, 10, h + 6, 4, PALETTE.woodDark);
  roundRect(ctx, x + 30, groundY - h - 6, 10, h + 6, 4, PALETTE.woodDark);
  roundRect(ctx, x - 46, groundY - h - 16, 92, 12, 6, PALETTE.wood);

  if (open) {
    // Hai cánh cổng mở sang hai bên
    roundRect(ctx, x - 52, groundY - h + 6, 10, h - 8, 3, PALETTE.wood);
    roundRect(ctx, x + 42, groundY - h + 6, 10, h - 8, 3, PALETTE.wood);
    signpost(ctx, x + 90, groundY - 6, ['Cầu Tình Yêu →'], 100);
    return;
  }
  for (let i = 0; i < 6; i++) {
    roundRect(ctx, x - 29 + i * 10, groundY - h + 4, 8, h - 6, 3, PALETTE.wood, PALETTE.ink, 2);
  }
  roundRect(ctx, x - 30, groundY - 52, 60, 7, 3, PALETTE.woodDark, PALETTE.ink, 2);
  // Ổ khoá
  ctx.beginPath();
  ctx.arc(x, groundY - 38, 5, Math.PI, 0);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  roundRect(ctx, x - 8, groundY - 39, 16, 13, 3, PALETTE.questGold);
  circle(ctx, x, groundY - 33, 1.8, PALETTE.ink, null);
}

// Dây đèn lồng khi chưa tới / đã xong nhiệm vụ ca dao (lúc đang làm thì quests vẽ đèn có chữ)
function lanternRig(ctx, groundY, lit, t) {
  const top = groundY - 200;
  roundRect(ctx, LANTERNS[0] + 20, top - 20, 6, 220, 3, PALETTE.woodDark, PALETTE.ink, 2);
  roundRect(ctx, LANTERNS[1] - 26, top - 20, 6, 220, 3, PALETTE.woodDark, PALETTE.ink, 2);
  for (const x of CADAO.slots) {
    const dip = Math.sin(((x - CADAO.slots[0]) / (CADAO.slots.at(-1) - CADAO.slots[0])) * Math.PI) * 30;
    lanternWord(ctx, x, top + dip, lit ? '💕' : '', lit, t);
  }
}

const visible = (x, left, right, pad = 150) => x > left - pad && x < right + pad;

export function drawGateScene(ctx, groundY, left, right, questIndex, t) {
  if (right < SCENE.start || left > SCENE.end) return;
  const current = QUESTS[questIndex]?.type;
  for (const tree of trees) {
    if (tree.x > left && tree.x < right) blossomTree(ctx, tree.x, groundY - 20, tree.scale);
  }
  if (ENTRANCE_X > left - 100 && ENTRANCE_X < right + 100) entrance(ctx, ENTRANCE_X, groundY - 6);
  if (current !== 'statue' && visible(STATUE.treeX, left, right)) oldTree(ctx, STATUE.treeX, groundY, false);
  if (current !== 'cadao' && visible(CADAO.slots[0], left, right, 600)) lanternRig(ctx, groundY, isDone(questIndex, 'cadao'), t);
  if (visible(PHOTO.frameX, left, right)) photoFrame(ctx, PHOTO.frameX, groundY - 6, PHOTO.frameHalf);
  // Cột còn và bù nhìn rơm đứng sẵn; lúc đang làm nhiệm vụ thì quests vẽ bản động
  if (current !== 'nemcon' && visible(NEMCON.poleX, left, right)) nemconPole(ctx, NEMCON.poleX, groundY, 0, false, t);
  if (current !== 'tug' && visible(TUG.opponentX, left, right)) {
    scarecrow(ctx, TUG.opponentX, groundY, 0);
    scarecrow(ctx, TUG.opponentX + 34, groundY, 0);
  }
  if (DOOR_X > left - 100 && DOOR_X < right + 100) {
    woodenGate(ctx, DOOR_X, groundY - 6, isDone(questIndex, BARRIER.after));
  }
}
