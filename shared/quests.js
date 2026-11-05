// Cảnh và nhiệm vụ hợp tác, dùng chung cho client và server.
// Nhiệm vụ làm lần lượt theo thứ tự; hoàn thành nhiệm vụ mở chắn thì mới đi tiếp được.

import { GATE_QUESTS } from './quests-gate.js';
import { BRIDGE, BRIDGE_QUESTS } from './quests-bridge.js'; // BRIDGE: điểm bắt đầu cảnh Cầu Tình Yêu

export const SCENES = [
  { id: 'gate', name: 'Cổng Hoa Đào', start: 0, end: BRIDGE, spawnX: 260 },
  { id: 'bridge', name: 'Cầu Tình Yêu', start: BRIDGE, end: BRIDGE + 3800, spawnX: BRIDGE + 100 },
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
//  fishing   – câu cá koi: người cầm cần chỉ thấy phao; người kia thấy cá dưới nước, hô "Giật!" lúc cá koi cắn câu
//  together  – tâm đầu ý hợp: không nhắn tin, mỗi người tự chọn một câu trả lời; chọn giống nhau +1
//  umbrella  – nắm tay đi chung ô dưới mưa; người không cầm ô ra ngoài ô lâu quá thì ướt, cả hai về vạch
//  stack     – xếp đá: thay phiên thả đá đang đung đưa; người kia nhấn GIỮ để đá đung đưa chậm lại
//  sap       – nhảy sạp: nắm tay đứng trong sạp, mỗi lần sạp khép cả hai cùng nhảy (✋)
//  lock      – khoá tình yêu: mỗi người xoay 2 ô nhưng chỉ biết mã ô của người kia, nhắn cho nhau rồi cùng khoá
// `hand: true` = thử thách nắm tay: không tự kéo nhau, mỗi người tự đi cho cùng nhịp
export const QUESTS = [...GATE_QUESTS, ...BRIDGE_QUESTS];

// Chắn đường: mở khi nhiệm vụ `after` hoàn thành; after = null là cảnh tiếp theo chưa ra mắt
export const BARRIERS = [
  { x: BRIDGE - 50, after: 'photo' },
  { x: BRIDGE + 840, after: 'tie' },
  { x: BRIDGE + 1160, after: 'koi' },
  { x: BRIDGE + 3700, after: null },
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

// Xếp đá: đá đung đưa theo pha (0 → 1 là một vòng), lệch khỏi giữa tối đa swingAmp
export const stackOffset = (q, phase) => Math.sin(phase * Math.PI * 2) * q.swingAmp;

// Nhảy sạp: khoảng cách giữa hai nhịp, nhanh dần theo số lần nhảy qua
export const sapBeatMs = (q, count) => q.beatMs * Math.max(0.6, 1 - q.speedUp * count);

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
