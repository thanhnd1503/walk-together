// Bot đóng vai người ấy trong chế độ 1 người (để test): đi theo, phối hợp làm nhiệm vụ
import { GENDERS, LOOK_OPTIONS, WALK_SPEED, HOLD_DISTANCE, sanitizeLook } from '../shared/constants.js';
import { QUESTS, INTERACT_RADIUS } from '../shared/quests.js';

const FOLLOW_GAP = 70;
const SPLIT_RANGE = 250; // người chơi tới gần mục tiêu trong khoảng này thì bot tách ra chỗ còn lại
const STOP_EPS = 4;
const CATCH_UP_SPEED = 1.25; // đi nhanh hơn chút khi bị bỏ xa
const PRESS_DELAY_MS = 300;
const PRESS_EXPIRE_MS = 1200;
const REPLIES = ['Ừa 💕', 'Đi tiếp nào!', 'Hihi 😆', 'Mình ở đây nè 🤖', 'Cố lên nha!', 'Đẹp quá ha 🌸'];

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
    x, dir: 1, walking: false, pendingPress: null,
  };
}

export const humanOf = (room) => [...room.players.values()].find((p) => !p.isBot);
export const botOf = (room) => [...room.players.values()].find((p) => p.isBot);

// Mục tiêu còn lại (xa người chơi hơn) cho nhiệm vụ cần mỗi người một chỗ
function otherTarget(q, human) {
  return q.targets.reduce((a, b) => (Math.abs(a.x - human.x) > Math.abs(b.x - human.x) ? a : b));
}

function targetX(room, bot, human) {
  const q = QUESTS[room.progress.index];
  if (q?.type === 'sync' || q?.type === 'plates') {
    const near = q.targets.some((t) => Math.abs(t.x - human.x) <= SPLIT_RANGE);
    if (near) return otherTarget(q, human).x;
  }
  const gap = room.holding ? HOLD_DISTANCE : FOLLOW_GAP;
  // Đi phía sau người chơi; nếu đang ở sẵn phía trước thì đứng phía trước
  const side = Math.sign(bot.x - human.x) || -human.dir;
  return human.x + side * gap;
}

// Người chơi vừa bấm tương tác: bot bấm theo ở mục tiêu của mình
export function onHumanInteract(room, now) {
  const bot = botOf(room);
  const human = humanOf(room);
  const q = QUESTS[room.progress.index];
  if (!bot || !human || q?.type !== 'sync') return;
  bot.pendingPress = { targetId: otherTarget(q, human).id, at: now + PRESS_DELAY_MS };
}

export function botReply() {
  return pick(REPLIES);
}

// Gọi định kỳ. Trả về { moved, press } — press là targetId bot cần bấm lúc này
export function tickBot(room, dt, now, maxX) {
  const bot = botOf(room);
  const human = humanOf(room);
  if (!bot || !human) return { moved: false };

  const goal = Math.max(0, Math.min(maxX, targetX(room, bot, human)));
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
    const q = QUESTS[room.progress.index];
    const target = q?.targets?.find((t) => t.id === pp.targetId);
    if (target && Math.abs(bot.x - target.x) <= INTERACT_RADIUS) {
      press = pp.targetId;
      bot.pendingPress = null;
    } else if (now - pp.at > PRESS_EXPIRE_MS) {
      bot.pendingPress = null;
    }
  }
  return { moved: before !== `${bot.x}|${bot.dir}|${bot.walking}`, press };
}
