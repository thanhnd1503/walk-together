// Cảnh và nhiệm vụ hợp tác, dùng chung cho client và server.
// Nhiệm vụ làm lần lượt theo thứ tự; hoàn thành nhiệm vụ mở chắn thì mới đi tiếp được.

export const SCENES = [
  { id: 'gate', name: 'Cổng Hoa Đào', start: 0, end: 2400, spawnX: 260 },
  { id: 'bridge', name: 'Cầu Tình Yêu', start: 2400, end: 4400, spawnX: 2500 },
];

export const COLLECT_RADIUS = 26;
export const CATCH_RADIUS = 24;
// Vật rơi: độ cao bắt đầu rơi (so với mặt đất) và vùng hứng được (ngang người)
export const FALL_HEIGHT = 340;
export const CATCH_HEIGHT = 85;
export const CATCH_FROM = 1 - CATCH_HEIGHT / FALL_HEIGHT; // tiến độ rơi bắt đầu hứng được
export const INTERACT_RADIUS = 40;
export const PLATE_RADIUS = 22;
export const SYNC_WINDOW_MS = 1500;
export const SERVER_SLACK = 40; // nới khoảng cách khi server kiểm tra, vì vị trí trên server trễ hơn

// type:
//  catch    – vật rơi từ trên xuống quanh hai người; hứng đồ tốt +1, đồ xấu −1, đủ `goal` điểm
//  blueprint – một người (seer) xem bản vẽ ở bảng gỗ rồi NHẮN TIN chỉ ván tốt, người kia nhặt; tốt +1, mục −1
//  carry    – hai người nâng hai đầu ván (bấm cùng lúc) rồi đi cùng nhịp ra đầu cầu; xa/sát quá thì rơi
//  tie      – một người nhấn GIỮ để giữ ván, người kia bấm khi kim chạy vào vùng xanh để buộc lạt
//  collect  – nhặt chung đủ `goal` vật phẩm ở vị trí cố định
//  sync     – mỗi người đứng ở một mục tiêu khác nhau, bấm tương tác gần như cùng lúc
//  plates   – hai người cùng đứng trên hai mục tiêu đủ `holdMs`
//  holdWalk – nắm tay nhau đi tới `goalX`
export const QUESTS = [
  {
    id: 'petals', scene: 'gate', type: 'catch',
    title: 'Hứng cánh hoa phát sáng',
    hint: 'Hứng cánh hoa hồng 🌸 (+1), né lá khô 🍂 (−1)',
    goal: 15, range: [200, 2250],
    spawnMs: 420, fallMs: 4200, badRatio: 0.8,
    spreadX: 320, // rơi quanh vị trí hai người
  },
  {
    id: 'bells', scene: 'gate', type: 'sync', object: 'bell',
    title: 'Cùng rung chuông gió',
    hint: 'Mỗi người đứng dưới một chuông, rung cùng lúc',
    // Gần nhau để màn hình điện thoại hẹp (~420 đơn vị) đứng dưới chuông này vẫn thấy chuông kia
    targets: [{ id: 'bellA', x: 1700 }, { id: 'bellB', x: 1870 }],
  },
  {
    id: 'blueprint', scene: 'bridge', type: 'blueprint',
    title: 'Lấy gỗ tốt',
    hint: 'Một người xem bản vẽ ở bảng gỗ và nhắn tin, người kia nhặt',
    goal: 3, count: 10, good: 4, range: [2610, 3190], minGap: 38,
    boardX: 2545,
    // Mốc để mô tả vị trí ván khi nhắn tin; `words` là từ khoá (không dấu) bot hiểu
    landmarks: [
      { id: 'stone', name: 'Hòn đá', icon: '🪨', x: 2700, words: ['da'] },
      { id: 'lantern', name: 'Đèn lồng', icon: '🏮', x: 2890, words: ['den', 'long'] },
      { id: 'jar', name: 'Chum nước', icon: '🏺', x: 3080, words: ['chum', 'lu'] },
    ],
  },
  {
    id: 'carry', scene: 'bridge', type: 'carry',
    title: 'Cùng khiêng ván',
    hint: 'Mỗi người đứng một đầu, ✋ cùng lúc để nâng, đi cùng nhịp ra đầu cầu',
    goal: 3, pileX: 2560, deliverX: 3190, minGap: 45, maxGap: 125, reach: 70,
  },
  {
    id: 'tie', scene: 'bridge', type: 'tie',
    title: 'Buộc lạt tre',
    hint: 'Một người nhấn GIỮ ✋ để giữ ván, người kia bấm ✋ khi kim vào vùng xanh',
    goal: 4, sweepMs: 1600, speedUp: 0.12, zone: [0.4, 0.6],
    targets: [{ id: 'hold', x: 3165 }, { id: 'tie', x: 3225 }],
  },
  {
    id: 'cross', scene: 'bridge', type: 'holdWalk',
    title: 'Nắm tay qua cầu',
    hint: 'Nắm tay nhau đi sang bờ bên kia',
    goalX: 3700,
  },
];

// Chắn đường: mở khi nhiệm vụ `after` hoàn thành; after = null là cảnh tiếp theo chưa ra mắt
export const BARRIERS = [
  { x: 2350, after: 'bells' },
  { x: 3240, after: 'tie' },
  { x: 4300, after: null },
];

// Mô tả vị trí một tấm ván theo mốc gần nhất, ví dụ "Tấm thứ 2 bên phải 🏮 Đèn lồng"
export function describePlank(q, items, item) {
  const mark = q.landmarks.reduce((a, b) => (Math.abs(a.x - item.x) <= Math.abs(b.x - item.x) ? a : b));
  const side = item.x >= mark.x ? 1 : -1;
  const n = items.filter((it) => (it.x - mark.x) * side >= 0 && Math.abs(it.x - mark.x) <= Math.abs(item.x - mark.x)).length;
  return { mark, side, n };
}

// Tìm tấm ván theo mốc + bên + thứ tự (ngược lại của describePlank)
export function findPlank(q, items, markId, side, n) {
  const mark = q.landmarks.find((m) => m.id === markId);
  if (!mark) return null;
  const onSide = items.filter((it) => (it.x - mark.x) * side >= 0).sort((a, b) => Math.abs(a.x - mark.x) - Math.abs(b.x - mark.x));
  return onSide[n - 1] ?? null;
}

// Buộc lạt: kim chạy qua lại 0 → 1 → 0; mỗi nút buộc xong kim chạy nhanh hơn
export function tieSweepMs(q, knots) {
  return q.sweepMs * (1 - q.speedUp * knots);
}

export function tieNeedle(q, knots, ageMs) {
  const k = (ageMs / tieSweepMs(q, knots)) % 1;
  return k < 0.5 ? k * 2 : 2 - k * 2;
}

export const questIndexOf = (id) => QUESTS.findIndex((q) => q.id === id);

export function isDone(index, questId) {
  return index > questIndexOf(questId);
}

// Giới hạn bên phải mà người chơi được đi tới, theo tiến độ hiện tại
export function maxXFor(index) {
  for (const b of BARRIERS) {
    if (!b.after || !isDone(index, b.after)) return b.x;
  }
  return Infinity;
}

export function sceneAt(x) {
  return SCENES.findLast((s) => x >= s.start) ?? SCENES[0];
}

// Vào phòng thì xuất hiện ở đầu cảnh đang làm dở
export function spawnXFor(index) {
  const quest = QUESTS[Math.min(index, QUESTS.length - 1)];
  return SCENES.find((s) => s.id === quest.scene).spawnX;
}
