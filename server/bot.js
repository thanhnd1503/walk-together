// Bot đóng vai người ấy trong chế độ 1 người (để test): đi theo, phối hợp làm nhiệm vụ
import { GENDERS, LOOK_OPTIONS, WALK_SPEED, HOLD_DISTANCE, sanitizeLook } from '../shared/constants.js';
import { INTERACT_RADIUS, describePlank, findPlank, tieNeedle, questOf } from '../shared/quests.js';
import { folkAction, folkOnChat, folkOnHumanInteract, folkTarget } from './bot-folk.js';

const FOLLOW_GAP = 70;
const SPLIT_RANGE = 250; // người chơi tới gần mục tiêu trong khoảng này thì bot tách ra chỗ còn lại
const STOP_EPS = 4;
const CATCH_UP_SPEED = 1.25; // đi nhanh hơn chút khi bị bỏ xa
const PRESS_DELAY_MS = 300;
const PRESS_EXPIRE_MS = 1200;
const TIE_EVERY_MS = 900; // bot buộc lạt không bấm liên tục
const CARRY_GAP = 80;
const HINT_EVERY_MS = 9000; // bot cầm bản vẽ nhắn lại gợi ý nếu người chơi chưa nhặt
const REPLIES = ['Ừa 💕', 'Đi tiếp nào!', 'Hihi 😆', 'Mình ở đây nè 🤖', 'Cố lên nha!', 'Đẹp quá ha 🌸'];
const HELP = "Mình chưa hiểu 😅 Nhắn kiểu: 'đèn lồng phải 2' (mốc + trái/phải + thứ mấy)";
const CADAO_HELP = 'Chữ nào vậy? Nhắn đúng chữ trên đèn lồng nha 🏮';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function randomLook() {
  const gender = pick(GENDERS);
  const look = { gender };
  for (const [key, options] of Object.entries({ ...LOOK_OPTIONS.common, ...LOOK_OPTIONS[gender] })) {
    look[key] = pick(options);
  }
  return sanitizeLook(look);
}

export function createBot(code, x) {
  return {
    id: `bot-${code}`, isBot: true, name: 'Bot 🤖', look: randomLook(),
    x, dir: 1, walking: false, pendingPress: null, pendingPick: null, hint: null,
  };
}

export const humanOf = (room) => [...room.players.values()].find((p) => !p.isBot);
export const botOf = (room) => [...room.players.values()].find((p) => p.isBot);

// Mục tiêu còn lại (xa người chơi hơn) cho nhiệm vụ cần mỗi người một chỗ
function otherTarget(q, human) {
  return q.targets.reduce((a, b) => (Math.abs(a.x - human.x) > Math.abs(b.x - human.x) ? a : b));
}

function targetX(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const folk = folkTarget(room, bot, human, now);
  if (folk !== null) return folk;
  if (q?.type === 'sync' || q?.type === 'plates' || q?.type === 'tie') {
    const near = q.targets.some((t) => Math.abs(t.x - human.x) <= SPLIT_RANGE);
    if (near) return otherTarget(q, human).x;
  }
  if (q?.type === 'cadao') {
    const lamp = cadaoTarget(room, bot, human);
    if (lamp) return lamp.x;
  }
  if (q?.type === 'blueprint') {
    if (p.seerId === bot.id) return q.boardX + 30; // đứng xem bản vẽ ở bảng gỗ
    const plank = bot.pendingPick && p.items.find((it) => it.id === bot.pendingPick);
    if (plank) return plank.x;
  }
  if (q?.type === 'carry') {
    // Đang khiêng: giữ khoảng cách với người chơi ở phía của mình
    if (p.plank.carriers) return human.x + (Math.sign(bot.x - human.x) || 1) * CARRY_GAP;
    // Người chơi tới gần ván: bot sang đầu ván bên kia
    const humanSide = Math.sign(human.x - p.plank.x) || -1;
    if (Math.abs(human.x - p.plank.x) <= q.reach) return p.plank.x - humanSide * 40;
  }
  const gap = room.holding ? HOLD_DISTANCE : FOLLOW_GAP;
  // Đi phía sau người chơi; nếu đang ở sẵn phía trước thì đứng phía trước
  const side = Math.sign(bot.x - human.x) || -human.dir;
  return human.x + side * gap;
}

// Ca dao: đèn bot cần tới — tới lượt bot thì chữ kế tiếp (bot biết câu) hoặc chữ người chơi vừa nhắn
function cadaoTarget(room, bot, human) {
  const p = room.progress;
  const myTurn = p.count > 0 && p.ch.lastBy === human.id;
  if (p.seerId === bot.id) return myTurn || p.count === 0 ? p.items.find((it) => it.word === p.ch.words[p.count]) : null;
  return bot.pendingPick ? p.items.find((it) => it.id === bot.pendingPick && !it.lit) : null;
}

// Người chơi vừa bấm tương tác: bot phối hợp theo nhiệm vụ
export function onHumanInteract(room, now, targetId) {
  const bot = botOf(room);
  const human = humanOf(room);
  const q = questOf(room.progress);
  if (!bot || !human) return;
  if (q?.type === 'sync') bot.pendingPress = { targetId: otherTarget(q, human).id, at: now + PRESS_DELAY_MS };
  if (q?.type === 'carry' && !room.progress.plank.carriers) bot.pendingPress = { targetId: 'plank', at: now + PRESS_DELAY_MS };
  if (q?.type === 'photo') bot.pendingPress = { targetId: 'photo', at: now + PRESS_DELAY_MS };
  folkOnHumanInteract(room, bot, now, targetId);
}

// Bỏ dấu tiếng Việt để so từ khoá: "Đèn lồng" -> "den long"
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

// Người chơi nhắn tin. Bot ở vai nhặt ván thì cố hiểu "mốc + trái/phải + số"; trả về câu bot đáp
export function onHumanChat(room, text) {
  const bot = botOf(room);
  const p = room.progress;
  const q = questOf(p);
  const folkReply = bot && folkOnChat(room, bot, text);
  if (folkReply) return folkReply;
  if (bot && q?.type === 'cadao' && p.seerId && p.seerId !== bot.id) {
    // Tìm chữ trên đèn lồng (chưa sáng) có trong tin nhắn
    const said = ` ${plain(text)} `;
    const lamp = p.items.find((it) => !it.lit && said.includes(` ${plain(it.word)} `));
    if (!lamp) return CADAO_HELP;
    bot.pendingPick = lamp.id;
    return `Chữ «${lamp.word}» hả? Để mình chạm 🏮`;
  }
  if (!bot || q?.type !== 'blueprint' || !p.seerId || p.seerId === bot.id) return pick(REPLIES);

  const words = plain(text).split(/[^a-z0-9]+/);
  const mark = q.landmarks.find((m) => m.words.some((w) => words.includes(w)));
  const side = words.includes('phai') ? 1 : words.includes('trai') ? -1 : 0;
  const n = Number(words.find((w) => /^[1-9]$/.test(w)));
  const plank = mark && side && n ? findPlank(q, p.items, mark.id, side, n) : null;
  if (!plank) return HELP;
  bot.pendingPick = plank.id;
  return `Tấm thứ ${n} bên ${side > 0 ? 'phải' : 'trái'} ${mark.name} hả? Để mình nhặt 🤖`;
}

// Bot cầm bản vẽ: nhắn chỉ đường tới tấm ván tốt gần người chơi nhất
function blueprintHint(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  if (Math.abs(bot.x - (q.boardX + 30)) > STOP_EPS) return null;
  const good = p.items.filter((it) => it.kind === 'good');
  if (!good.length) return null;
  const plank = good.reduce((a, b) => (Math.abs(a.x - human.x) <= Math.abs(b.x - human.x) ? a : b));
  const key = `${plank.id}|${p.items.length}`;
  if (bot.hint?.key === key && now - bot.hint.at < HINT_EVERY_MS) return null;
  bot.hint = { key, at: now };
  const { mark, side, n } = describePlank(q, p.items, plank);
  return `Tấm thứ ${n} bên ${side > 0 ? 'phải' : 'trái'} ${mark.icon} ${mark.name} là ván tốt nè!`;
}

// Buộc lạt: đứng chỗ giữ ván thì giữ; đứng chỗ buộc thì canh kim vào giữa vùng xanh rồi buộc
function tieAction(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const [holdSpot, tieSpot] = q.targets;
  if (Math.abs(bot.x - holdSpot.x) <= INTERACT_RADIUS / 2 && !p.holder) return { press: 'holdOn' };
  if (Math.abs(bot.x - tieSpot.x) > INTERACT_RADIUS / 2 || p.holder !== human.id) return {};
  const [lo, hi] = q.zone;
  const n = tieNeedle(q, p.count, now - p.sweepStart);
  const margin = (hi - lo) / 4;
  if (n < lo + margin || n > hi - margin || now - (bot.lastTieAt ?? 0) < TIE_EVERY_MS) return {};
  bot.lastTieAt = now;
  return { press: 'tie' };
}

// Nhiệm vụ lấy gỗ: bot cầm bản vẽ thì nhắn gợi ý; bot ở vai nhặt thì nhặt tấm người chơi chỉ
function blueprintAction(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  if (q?.type !== 'blueprint') return {};
  if (p.seerId === bot.id) {
    const say = blueprintHint(room, bot, human, now);
    return say ? { say } : {};
  }
  const item = bot.pendingPick && p.items.find((it) => it.id === bot.pendingPick);
  if (!item) {
    bot.pendingPick = null;
  } else if (Math.abs(bot.x - item.x) <= INTERACT_RADIUS / 2) {
    bot.pendingPick = null;
    return { press: `item:${item.id}` };
  }
  return {};
}

// Ca dao: bot biết câu thì nhắc chữ khi tới lượt người chơi; tới đèn của mình thì chạm
function cadaoAction(room, bot, human) {
  const p = room.progress;
  const lamp = cadaoTarget(room, bot, human);
  if (lamp && Math.abs(bot.x - lamp.x) <= INTERACT_RADIUS / 2) {
    if (p.seerId !== bot.id) bot.pendingPick = null;
    return { press: `item:${lamp.id}` };
  }
  if (p.seerId === bot.id && p.ch.lastBy === bot.id) {
    const word = p.ch.words[p.count];
    const key = `${p.count}|${word}`;
    if (word && bot.hint?.key !== key) {
      bot.hint = { key };
      return { say: `Tới lượt bạn: chạm đèn chữ «${word}» nhé 🏮` };
    }
  }
  return {};
}

// Gọi định kỳ. Trả về { moved, press, say } — press là targetId bot cần bấm lúc này
export function tickBot(room, dt, now, maxX) {
  const bot = botOf(room);
  const human = humanOf(room);
  if (!bot || !human) return { moved: false };

  // Người gỗ: lúc cây hô "đứng im" thì bot đứng yên tuyệt đối
  const qq = questOf(room.progress);
  const frozen = qq?.type === 'statue' && room.progress.ch?.phase === 'active' && room.progress.ch.cycle === 'freeze';
  const goal = frozen ? bot.x : Math.max(0, Math.min(maxX, targetX(room, bot, human, now)));
  const dx = goal - bot.x;
  const before = `${bot.x}|${bot.dir}|${bot.walking}`;
  if (Math.abs(dx) <= STOP_EPS) {
    bot.walking = false;
  } else {
    const speed = WALK_SPEED * (Math.abs(dx) > 100 ? CATCH_UP_SPEED : 1);
    const step = Math.min(Math.abs(dx), speed * dt);
    bot.x = Math.round((bot.x + Math.sign(dx) * step) * 10) / 10;
    bot.dir = Math.sign(dx);
    bot.walking = true;
  }
  if (!bot.walking && !room.holding) bot.dir = Math.sign(human.x - bot.x) || bot.dir; // quay về phía người chơi

  let press = null;
  const pp = bot.pendingPress;
  if (pp && now >= pp.at) {
    const q = questOf(room.progress);
    const isPlank = pp.targetId === 'plank';
    const isPhoto = pp.targetId === 'photo';
    const anywhere = pp.targetId === 'pull'; // kéo co: bấm tại chỗ
    const target = anywhere ? bot : isPlank ? room.progress.plank : isPhoto ? { x: q.frameX } : q?.targets?.find((t) => t.id === pp.targetId);
    const reach = anywhere ? Infinity : isPlank ? q?.reach : isPhoto ? q.frameHalf : INTERACT_RADIUS;
    if (target && Math.abs(bot.x - target.x) <= reach) {
      press = pp.targetId;
      bot.pendingPress = null;
    } else if (now - pp.at > PRESS_EXPIRE_MS) {
      bot.pendingPress = null;
    }
  }
  const type = questOf(room.progress)?.type;
  const actions = {
    tie: tieAction, cadao: cadaoAction, blueprint: blueprintAction, blindGoat: folkAction, nemcon: folkAction, memory: folkAction,
  };
  const action = press || !actions[type] ? {} : actions[type](room, bot, human, now);
  return { moved: before !== `${bot.x}|${bot.dir}|${bot.walking}`, press: press ?? action.press, say: action.say };
}
