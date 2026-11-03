// Cảnh 1: Cổng Hoa Đào
import { PALETTE } from '../palette.js';
import { blossomTree, circle, roundRect, seeded, signpost } from '../draw.js';
import { BARRIERS, SCENES, isDone } from '/shared/quests.js';

const SCENE = SCENES[0];
const ENTRANCE_X = 120;
const BARRIER = BARRIERS[0];
const DOOR_X = BARRIER.x + 34; // cổng gỗ nằm ngay sau điểm dừng
const TREE_GAP = 210;

const trees = [];
for (let x = 380; x < BARRIER.x - 120; x += TREE_GAP) {
  trees.push({ x: x + (seeded(x) - 0.5) * 70, scale: 0.85 + seeded(x + 1) * 0.35 });
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

export function drawGateScene(ctx, groundY, left, right, questIndex) {
  if (right < SCENE.start || left > SCENE.end) return;
  for (const tree of trees) {
    if (tree.x > left && tree.x < right) blossomTree(ctx, tree.x, groundY - 20, tree.scale);
  }
  if (ENTRANCE_X > left - 100 && ENTRANCE_X < right + 100) entrance(ctx, ENTRANCE_X, groundY - 6);
  if (DOOR_X > left - 100 && DOOR_X < right + 100) {
    woodenGate(ctx, DOOR_X, groundY - 6, isDone(questIndex, BARRIER.after));
  }
}
