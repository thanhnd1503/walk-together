// Cảnh và nhiệm vụ hợp tác, dùng chung cho client và server.
// Nhiệm vụ làm lần lượt theo thứ tự; hoàn thành nhiệm vụ mở chắn thì mới đi tiếp được.

const BRIDGE = 6100; // điểm bắt đầu cảnh Cầu Tình Yêu; toạ độ cảnh 2 tính từ đây

export const SCENES = [
  { id: 'gate', name: 'Cổng Hoa Đào', start: 0, end: BRIDGE, spawnX: 260 },
  { id: 'bridge', name: 'Cầu Tình Yêu', start: BRIDGE, end: BRIDGE + 2000, spawnX: BRIDGE + 100 },
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
export const HAND_DROP_GAP = 90; // thử thách nắm tay: cách nhau xa hơn là rớt tay

// type:
//  catch     – vật rơi quanh hai người; hứng đồ tốt +1, đồ xấu −1, đủ `goal` điểm
//  statue    – nắm tay đi tới đích; khi cây hô "đứng im" ai nhúc nhích/rớt tay thì cả hai về vạch
//  leafWalk  – nắm tay đi qua đoạn lá khô rơi; ai bị lá trúng/rớt tay thì cả hai về vạch
//  blindGoat – bịt mắt bắt dê: một người không thấy gì, người kia nhắn chỉ đường; bắt được thì đổi vai
//  nemcon    – ném còn: người ném giữ ✋ lấy lực (thả ở vùng xanh); người kia thấy vòng, bấm "hô ném" lúc vòng về giữa
//  memory    – lật thẻ hoa: thay phiên mỗi người lật một thẻ, hai thẻ liền nhau trùng hoa thì giữ
//  tug       – kéo co: nắm tay, khi hiện "DÔ!" cả hai bấm ✋ cùng lúc thì kéo được dây
//  sync      – mỗi người đứng ở một mục tiêu khác nhau, bấm tương tác gần như cùng lúc
//  cadao     – một người (seer) biết câu ca dao; hai người THAY PHIÊN chạm đèn lồng đúng thứ tự chữ
//  photo     – nắm tay đứng trong khung ảnh, cùng bấm; ảnh được lưu lại làm kỷ niệm
//  blueprint – người cầm bản vẽ xem ở bảng gỗ rồi NHẮN TIN chỉ ván tốt, người kia nhặt; tốt +1, mục −1
//  carry     – hai người nâng hai đầu ván (bấm cùng lúc) rồi đi cùng nhịp ra đầu cầu; xa/sát quá thì rơi
//  tie       – một người nhấn GIỮ để giữ ván, người kia bấm khi kim chạy vào vùng xanh để buộc lạt
//  collect / plates – còn giữ trong engine, hiện chưa dùng
//  holdWalk  – nắm tay nhau đi tới `goalX`
// `hand: true` = thử thách nắm tay: không tự kéo nhau, mỗi người tự đi cho cùng nhịp
export const QUESTS = [
  {
    id: 'petals', scene: 'gate', type: 'catch',
    title: 'Hứng cánh hoa phát sáng',
    hint: 'Hứng hoa hồng 🌸 (+1), hoa vàng ✨ (+3), né lá khô 🍂 (−1). Coi chừng gió thổi xéo!',
    goal: 15, range: [200, 1350],
    spawnMs: 420, fallMs: 4200, badRatio: 0.8,
    spreadX: 320, // rơi quanh vị trí hai người
    goldRatio: 0.06, goldFallMs: 2200, // cánh hoa vàng +3, rơi rất nhanh
    windMax: 30, windEveryMs: [3500, 6000], // gió thổi vật rơi bay xéo (đơn vị/giây)
    levels: {
      easy: { badRatio: 0.65, goldRatio: 0.1, windMax: 0, hint: 'Hứng hoa hồng 🌸 (+1), hoa vàng ✨ (+3), né lá khô 🍂 (−1)' },
      hard: { badRatio: 0.85, fallMs: 3600, goldRatio: 0.05, windMax: 60 },
    },
  },
  {
    id: 'statue', scene: 'gate', type: 'statue', hand: true,
    title: 'Một, hai, ba… đứng im!',
    hint: 'Nắm tay đi tới cây đào già. Cây hô "Đứng im!" thì không được nhúc nhích',
    startX: 1450, goalX: 2050, treeX: 2120, spawnX: 1330,
    goMs: [2200, 4500], chantMs: 1500, freezeMs: 2000, graceMs: 350, moveTolerance: 5,
    fakeChance: 0.25, // hô "Một… hai…" rồi quay luôn, không đợi "ba"
    rush: 0.45, // càng gần đích cây hô càng nhanh (giảm tối đa 45% thời gian)
    levels: {
      easy: { fakeChance: 0, rush: 0 },
      hard: { fakeChance: 0.45, rush: 0.6, freezeMs: 2500 },
    },
  },
  {
    id: 'leafwalk', scene: 'gate', type: 'leafWalk', hand: true,
    title: 'Nắm tay né lá khô',
    hint: 'Nắm tay đi qua rừng lá. Ai bị lá rơi trúng là cả hai về vạch',
    startX: 2250, endX: 2850, spawnX: 2140, spawnMs: 560, fallMs: 3200, hitRadius: 18,
    spawnAhead: [-120, 460], // lá rơi chủ yếu ở phía trước hướng đi, phải canh lúc đi lúc dừng
    clusterChance: 0.25, // chùm 3 lá rơi cùng lúc
    rush: 0.3, // lá rơi nhanh dần khi gần đích
    levels: {
      easy: { spawnMs: 700, clusterChance: 0, rush: 0 },
      hard: { spawnMs: 480, clusterChance: 0.45, rush: 0.45 },
    },
  },
  {
    id: 'blindgoat', scene: 'gate', type: 'blindGoat',
    title: 'Bịt mắt bắt dê',
    hint: 'Người bịt mắt không thấy gì; người kia bấm nút ra hiệu dẫn đường để bắt dê',
    area: [2980, 3540], spawnX: 2930, goal: 3,
    grabRadius: 40, goatSpeed: 55, wanderMs: [1500, 3000],
    fleeRadius: 70, fleeSpeed: 95, // người bịt mắt lại gần thì dê giật mình chạy
    decoys: 1, // dê bù nhìn: chộp nhầm bị −1
    levels: {
      easy: { fleeRadius: 0, decoys: 0 },
      hard: { fleeRadius: 110, fleeSpeed: 110, decoys: 2 },
    },
  },
  {
    id: 'bells', scene: 'gate', type: 'sync', object: 'bell',
    title: 'Cùng rung chuông gió',
    hint: 'Mỗi người đứng dưới một chuông, rung cùng lúc',
    // Gần nhau để màn hình điện thoại hẹp (~420 đơn vị) đứng dưới chuông này vẫn thấy chuông kia
    targets: [{ id: 'bellA', x: 3680 }, { id: 'bellB', x: 3850 }],
    spawnX: 3560,
  },
  {
    id: 'nemcon', scene: 'gate', type: 'nemcon',
    title: 'Ném còn',
    hint: 'Người ném GIỮ ✋ lấy lực, thả tay ở vùng xanh; người kia thấy vòng, bấm "Hô ném" lúc vòng về giữa',
    throwX: 4000, poleX: 4100, spawnX: 3930, goal: 3, throwRadius: 40,
    chargeMs: 1500, powerZone: [0.55, 0.85], ringPeriodMs: 2600, ringZone: 0.3,
    ringSpeedUp: 0.85, // mỗi lần lọt, vòng chạy nhanh hơn (chu kỳ × hệ số)
    windMax: 0.35, // gió làm điểm cần hô lệch khỏi giữa cột (−1 … 1), chỉ người hô thấy
    levels: {
      easy: { ringSpeedUp: 1, windMax: 0 },
      hard: { ringSpeedUp: 0.75, windMax: 0.55, powerZone: [0.6, 0.82] },
    },
  },
  {
    id: 'memory', scene: 'gate', type: 'memory',
    title: 'Lật thẻ hoa',
    hint: 'Thay phiên mỗi người lật một thẻ; hai thẻ liền nhau trùng hoa thì giữ lại',
    slotStart: 4230, slotGap: 46, spawnX: 4170, showMs: 1400,
    pairs: 5, maxMisses: 6, // lật sai quá số lần thì xáo lại các thẻ còn úp
    flowers: [
      { id: 'dao', icon: '🌸', name: 'Hoa đào' },
      { id: 'sun', icon: '🌻', name: 'Hướng dương' },
      { id: 'tulip', icon: '🌷', name: 'Tulip' },
      { id: 'hibiscus', icon: '🌺', name: 'Dâm bụt' },
      { id: 'rose', icon: '🌹', name: 'Hoa hồng' },
      { id: 'daisy', icon: '🌼', name: 'Hoa cúc' },
    ],
    levels: {
      easy: { pairs: 4, maxMisses: 0 },
      hard: { pairs: 6, maxMisses: 4, showMs: 1000 },
    },
  },
  {
    id: 'tug', scene: 'gate', type: 'tug', hand: true,
    title: 'Kéo co Hò dô ta',
    hint: 'Nắm tay đứng ở vạch; khi hiện "DÔ!" cả hai bấm ✋ cùng lúc',
    startX: 4820, opponentX: 5000, spawnX: 4740,
    cueGapMs: [1400, 2400], cueWindowMs: 1000, syncMs: 400, step: 0.25, slip: 0.1,
    fakeChance: 0.2, // hô "DỐ!" giả: bấm là bị kéo lại
    rush: 0.35, // càng kéo gần thắng, nhịp hô càng nhanh và cửa sổ bấm càng hẹp
    levels: {
      easy: { fakeChance: 0, rush: 0 },
      hard: { fakeChance: 0.35, rush: 0.45, cueWindowMs: 850, syncMs: 330, step: 0.2 },
    },
  },
  {
    id: 'cadao', scene: 'gate', type: 'cadao',
    title: 'Ghép câu ca dao',
    hint: 'Một người biết câu; thay phiên nhau chạm đèn lồng đúng thứ tự chữ',
    spawnX: 5150,
    slots: [5250, 5312, 5374, 5436, 5498, 5560, 5622, 5684],
    // Mỗi câu không lặp chữ; số chữ + số chữ mồi = số đèn
    verses: [
      'Thương nhau củ ấu cũng tròn',
      'Yêu nhau mấy núi cũng trèo',
      'Tay nâng chén muối đĩa gừng',
      'Gừng cay muối mặn xin đừng quên nhau',
      'Đôi ta như lửa mới nhen',
    ],
    decoys: ['trăng', 'gió', 'mây', 'hoa', 'sông', 'thuyền', 'đò', 'mưa'],
    decoyCount: 2, similarDecoys: 1, slotGap: 58, // số chữ mồi; bao nhiêu chữ mồi là chữ gần giống
    levels: {
      easy: { similarDecoys: 0 },
      hard: { decoyCount: 4, similarDecoys: 4 },
    },
  },
  {
    id: 'photo', scene: 'gate', type: 'photo',
    title: 'Chụp ảnh kỷ niệm',
    hint: 'Nắm tay đứng trong khung ảnh rồi cùng bấm ✋',
    frameX: 5880, frameHalf: 55, spawnX: 5760,
  },
  {
    id: 'blueprint', scene: 'bridge', type: 'blueprint',
    title: 'Lấy gỗ tốt',
    hint: 'Một người xem bản vẽ ở bảng gỗ và nhắn tin, người kia nhặt',
    goal: 3, count: 10, good: 4, range: [BRIDGE + 210, BRIDGE + 790], minGap: 38,
    boardX: BRIDGE + 145,
    // Mốc để mô tả vị trí ván khi nhắn tin; `words` là từ khoá (không dấu) bot hiểu
    landmarks: [
      { id: 'stone', name: 'Hòn đá', icon: '🪨', x: BRIDGE + 300, words: ['da'] },
      { id: 'lantern', name: 'Đèn lồng', icon: '🏮', x: BRIDGE + 490, words: ['den', 'long'] },
      { id: 'jar', name: 'Chum nước', icon: '🏺', x: BRIDGE + 680, words: ['chum', 'lu'] },
    ],
  },
  {
    id: 'carry', scene: 'bridge', type: 'carry',
    title: 'Cùng khiêng ván',
    hint: 'Mỗi người đứng một đầu, ✋ cùng lúc để nâng, đi cùng nhịp ra đầu cầu',
    goal: 3, pileX: BRIDGE + 160, deliverX: BRIDGE + 790, minGap: 45, maxGap: 125, reach: 70,
  },
  {
    id: 'tie', scene: 'bridge', type: 'tie',
    title: 'Buộc lạt tre',
    hint: 'Một người nhấn GIỮ ✋ để giữ ván, người kia bấm ✋ khi kim vào vùng xanh',
    goal: 4, sweepMs: 1600, speedUp: 0.12, zone: [0.4, 0.6],
    targets: [{ id: 'hold', x: BRIDGE + 765 }, { id: 'tie', x: BRIDGE + 825 }],
  },
  {
    id: 'cross', scene: 'bridge', type: 'holdWalk',
    title: 'Nắm tay qua cầu',
    hint: 'Nắm tay nhau đi sang bờ bên kia',
    goalX: BRIDGE + 1300,
  },
];

// Chắn đường: mở khi nhiệm vụ `after` hoàn thành; after = null là cảnh tiếp theo chưa ra mắt
export const BARRIERS = [
  { x: BRIDGE - 50, after: 'photo' },
  { x: BRIDGE + 840, after: 'tie' },
  { x: BRIDGE + 1900, after: null },
];

// Bản lưu cũ chỉ có số thứ tự nhiệm vụ theo danh sách cũ này
const LEGACY_ORDER = ['petals', 'bells', 'blueprint', 'carry', 'tie', 'cross'];
// Nhiệm vụ đã bỏ -> nhiệm vụ thay thế ở cùng chỗ
const RENAMED = { butterfly: 'blindgoat' };

// Đổi bản lưu (mới: questId, cũ: index) ra số thứ tự trong danh sách hiện tại
export function savedIndex(saved) {
  if (saved?.questId === 'done') return QUESTS.length;
  const raw = saved?.questId ?? (Number.isInteger(saved?.index) ? LEGACY_ORDER[saved.index] ?? 'done' : null);
  const id = RENAMED[raw] ?? raw;
  if (id === 'done') return QUESTS.length;
  const i = QUESTS.findIndex((q) => q.id === id);
  return i < 0 ? 0 : i;
}

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

// Ném còn: lực lên xuống 0 → 1 → 0 theo thời gian giữ; vòng trên cột trượt qua lại (−1 … 1)
export function nemconPower(q, heldMs) {
  const k = (heldMs / q.chargeMs) % 1;
  return k < 0.5 ? k * 2 : 2 - k * 2;
}

export function nemconRing(q, ageMs, periodMs = q.ringPeriodMs) {
  return Math.sin((ageMs / periodMs) * Math.PI * 2);
}

// Dê đi từ x0 tới tx với tốc độ không đổi (dê giật mình thì chạy nhanh hơn: goat.speed)
export function goatX(q, goat, ageMs) {
  const d = goat.tx - goat.x0;
  const step = ((goat.speed ?? q.goatSpeed) * ageMs) / 1000;
  return Math.abs(d) <= step ? goat.tx : goat.x0 + Math.sign(d) * step;
}

// ---------- Độ khó ----------
// Mỗi nhiệm vụ có thể khai báo `levels: { easy: {...}, hard: {...} }` ghi đè thông số gốc (gốc = 'normal')
export const LEVELS = ['easy', 'normal', 'hard'];
export const LEVEL_NAMES = { easy: '🌱 Dễ', normal: '🌸 Thường', hard: '🔥 Khó' };
export const DEFAULT_LEVEL = 'normal';
export const sanitizeLevel = (level) => (LEVELS.includes(level) ? level : DEFAULT_LEVEL);

const resolved = new Map();

// Định nghĩa nhiệm vụ đã ghép độ khó (giữ cùng một object để so sánh/ghi nhớ được)
export function questAt(index, level = DEFAULT_LEVEL) {
  const base = QUESTS[index];
  if (!base) return undefined;
  const key = `${index}|${level}`;
  if (!resolved.has(key)) resolved.set(key, Object.freeze({ ...base, ...base.levels?.[level], level }));
  return resolved.get(key);
}

// Nhiệm vụ hiện tại của một tiến độ (server) — p có { index, level }
export const questOf = (p) => questAt(p.index, p.level);

// Vật rơi bị gió thổi: vị trí ngang sau ageMs
export const fallX = (it, ageMs) => it.x + ((it.vx ?? 0) * ageMs) / 1000;

// Chữ mồi gần giống (đổi dấu / đổi vần) cho câu ca dao
export const SIMILAR_WORDS = {
  nhau: 'nhàu', trèo: 'treo', tròn: 'tron', núi: 'nui', cũng: 'củng', thương: 'thường', yêu: 'yếu', muối: 'mười',
  đĩa: 'địa', chén: 'chẹn', lửa: 'lừa', đôi: 'đồi', ta: 'tà', mặn: 'mắn', cay: 'cây', quên: 'quen', đừng: 'dừng',
  mấy: 'mây', củ: 'cú', ấu: 'âu', tay: 'tây', nâng: 'nắng', như: 'nhữ', mới: 'mời', nhen: 'nhện', gừng: 'gửng', xin: 'xinh',
};

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

// Vào phòng thì xuất hiện gần nhiệm vụ đang làm dở (không có thì ở đầu cảnh)
export function spawnXFor(index) {
  const quest = QUESTS[Math.min(index, QUESTS.length - 1)];
  return quest.spawnX ?? SCENES.find((s) => s.id === quest.scene).spawnX;
}
