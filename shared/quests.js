// Cảnh và nhiệm vụ hợp tác, dùng chung cho client và server.
// Nhiệm vụ làm lần lượt theo thứ tự; hoàn thành nhiệm vụ mở chắn thì mới đi tiếp được.

export const SCENES = [
  { id: 'gate', name: 'Cổng Hoa Đào', start: 0, end: 2400, spawnX: 260 },
  { id: 'bridge', name: 'Cầu Gỗ Nhỏ', start: 2400, end: 4400, spawnX: 2500 },
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
    spawnMs: 420, fallMs: 4200, badRatio: 0.6,
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
    id: 'planks', scene: 'bridge', type: 'collect', item: 'plank',
    title: 'Tìm ván gỗ sửa cầu',
    hint: 'Tìm 4 tấm ván quanh bờ suối',
    goal: 4, fixed: [2640, 2830, 2990, 3110],
  },
  {
    id: 'bridge', scene: 'bridge', type: 'plates', object: 'stump',
    title: 'Cùng giữ ván ghép cầu',
    hint: 'Hai người đứng lên hai cọc gỗ cùng lúc',
    targets: [{ id: 'stumpA', x: 3150 }, { id: 'stumpB', x: 3215 }],
    holdMs: 3000,
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
  { x: 3240, after: 'bridge' },
  { x: 4300, after: null },
];

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
