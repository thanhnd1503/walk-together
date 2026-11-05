// Vẽ các thử thách ở Cổng Hoa Đào theo trạng thái server gửi (hàm thuần, nhận đủ dữ liệu qua tham số)
import { PALETTE } from './palette.js';
import { roundRect } from './draw.js';
import { promptBubble } from './quest-draw.js';
import { drawFalling } from './quest-view.js';
import { lanternWord, lineMark, oldTree, polaroid, shout } from './challenge-draw.js';

const LANTERN_TOP = 150; // dây treo đèn cao hơn mặt đất
const POLAROID_MS = 5500;

export const isWatching = (ch) => ch?.phase === 'active' && ch.cycle === 'freeze';

// s: trạng thái phía client của thử thách (xem challenge-client.js)
export function drawChallenge(ctx, q, s, groundY, t, now, people) {
  const { ch } = s;
  switch (q.type) {
    case 'statue': {
      lineMark(ctx, q.startX, groundY, 'Xuất phát', PALETTE.plus);
      lineMark(ctx, q.goalX, groundY, 'Đích', PALETTE.heart);
      oldTree(ctx, q.treeX, groundY, isWatching(ch));
      if (ch?.phase === 'active' && ch.cycle === 'chant') shout(ctx, q.treeX, groundY - 230, ch.fake ? 'Một… hai…' : 'Một… hai… ba…', PALETTE.ink);
      if (isWatching(ch)) shout(ctx, q.treeX, groundY - 230, 'Đứng im! 👀', PALETTE.minus);
      break;
    }
    case 'leafWalk':
      lineMark(ctx, q.startX, groundY, 'Xuất phát', PALETTE.plus);
      lineMark(ctx, q.endX, groundY, 'Đích', PALETTE.heart);
      drawFalling(ctx, { fallMs: q.fallMs }, s.items, s.spawnedAt, groundY, t, now);
      break;
    case 'cadao': {
      const xs = s.items.map((it) => it.x);
      const first = Math.min(...xs);
      const last = Math.max(...xs);
      roundRect(ctx, first - 40, groundY - LANTERN_TOP - 70, 6, LANTERN_TOP + 66, 3, PALETTE.woodDark, PALETTE.ink, 2);
      roundRect(ctx, last + 34, groundY - LANTERN_TOP - 70, 6, LANTERN_TOP + 66, 3, PALETTE.woodDark, PALETTE.ink, 2);
      ctx.beginPath();
      ctx.moveTo(first - 37, groundY - LANTERN_TOP - 66);
      ctx.quadraticCurveTo((first + last) / 2, groundY - LANTERN_TOP + 10, last + 37, groundY - LANTERN_TOP - 66);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      for (const it of s.items) {
        const dip = Math.sin(((it.x - first) / (last - first)) * Math.PI) * 30; // đèn treo theo độ võng của dây
        lanternWord(ctx, it.x, groundY - LANTERN_TOP - 50 + dip, it.word, it.lit, t);
      }
      if (s.nearItem) promptBubble(ctx, s.nearItem.x, groundY - 40);
      break;
    }
    case 'photo':
      if (s.nearTarget) promptBubble(ctx, q.frameX, groundY - 100);
      break;
    default:
  }
}

// Trạng thái cây đào già, hiện giữa màn hình vì cây thường nằm ngoài tầm nhìn
const STATUE_SHOUT = {
  go: ['🌳 Cây quay lưng — đi đi!', PALETTE.plus],
  chant: ['Một… hai… ba…', PALETTE.ink],
  freeze: ['ĐỨNG IM! 👀', PALETTE.minus],
};

// Lớp phủ trên màn hình: lời cây hô, ảnh polaroid sau khi chụp
export function drawChallengeOverlay(ctx, q, s, view, now, camX, groundY) {
  if (q?.type === 'statue' && s.ch?.phase === 'active') {
    const [text, color] = s.ch.cycle === 'chant' && s.ch.fake ? ['Một… hai…', PALETTE.ink] : STATUE_SHOUT[s.ch.cycle];
    shout(ctx, view.w / 2, Math.max(150, view.h * 0.3), text, color);
  }
  if (s.photoShown && now - s.photoShown.at < POLAROID_MS) {
    polaroid(ctx, view.w, view.h, s.photoShown.photo, (now - s.photoShown.at) / POLAROID_MS);
  }
}

// Bảng hướng dẫn khi thử thách nắm tay chưa bắt đầu: từng bước có ô tích
const HOWTO_LAST = {
  statue: '🌳 Đi khi cây quay lưng, đứng im khi cây hô',
  leafWalk: '🍂 Nắm tay đi tới vạch Đích, né lá rơi',
  tug: '💪 Thấy "DÔ!" thì cả hai cùng bấm ✋',
  umbrella: '☂️ Người không cầm ô đứng sát dưới ô mà đi',
  sap: '🎋 Sạp khép "cạch!" thì cả hai cùng bấm ✋ để nhảy',
};
// Mẹo thêm khi có bẫy ở độ khó hiện tại
const HOWTO_TRAP = {
  statue: (q) => q.fakeChance && '🤪 Cây có thể hô thiếu "ba" rồi quay luôn!',
  tug: (q) => q.fakeChance && '🤪 Cẩn thận "DỐ!" giả, đừng bấm!',
  umbrella: (q) => q.windMax && '🌬️ Gió làm ô nghiêng, đứng lệch theo ô nhé',
  sap: (q) => q.breakChance && '🤪 Có lúc sạp khép sớm, nhìn dải nhịp nhé',
};
const START_ZONE = 90;

export function drawHowTo(ctx, q, view, me, partner, holding) {
  const atLine = (p) => p && Math.abs(p.x - q.startX) <= START_ZONE;
  const steps = [
    [holding, '🤝 Nắm tay nhau (nút 🤝 hoặc phím H)'],
    [atLine(me) && atLine(partner), q.type === 'sap' ? '📍 Cả hai đứng giữa sạp' : '📍 Cả hai đứng ở vạch xuất phát'],
    [null, HOWTO_LAST[q.type]],
  ];
  const trap = HOWTO_TRAP[q.type]?.(q);
  if (trap) steps.push([null, trap]);
  // Màn hình thấp (máy tính): bảng nhỏ gọn, nằm dưới chỗ thông báo để không bị che
  const tall = view.h > 700;
  const row = tall ? 20 : 15;
  const w = Math.min(view.w - 24, tall ? 300 : 240);
  const h = 24 + steps.length * row;
  const x = (view.w - w) / 2;
  const y = tall ? view.h * 0.4 : 92;
  roundRect(ctx, x, y, w, h, 14, 'rgba(255, 248, 231, 0.95)');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const size = tall ? 11 : 9;
  ctx.font = `800 ${size}px Nunito, "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Cách bắt đầu', x + 12, y + 12);
  steps.forEach(([done, label], i) => {
    const ly = y + 28 + i * row;
    ctx.font = `700 ${size}px Nunito, "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = done ? PALETTE.plus : PALETTE.ink;
    const mark = done === null ? '•' : done ? '✅' : '⬜';
    ctx.fillText(`${mark} ${label}`, x + 12, ly);
  });
}
