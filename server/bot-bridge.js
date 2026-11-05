// Bot chơi thử thách ở Cầu Tình Yêu (chế độ 1 người): câu cá, tâm đầu ý hợp, chung ô, xếp đá, nhảy sạp, khoá tình yêu
import { INTERACT_RADIUS, questOf } from '../shared/quests.js';
import { stackOffsetNow } from './bridge-rhythm.js';

const REACT_MS = 250; // bot phản ứng chậm hơn chút cho giống người
const TOGETHER_MATCH = 0.7; // xác suất bot chọn giống người chơi
const TOGETHER_WAIT_MS = 4000; // người chơi chưa chọn thì bot tự chọn trước
const UMBRELLA_SIDE = 15; // đứng lệch một chút cho khỏi chồng lên nhau
const JUMP_LEAD_MS = 55; // bot chạy mỗi 100ms: nhảy khi sạp sắp khép trong khoảng này
const AT = INTERACT_RADIUS / 2;

const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const words = (text) => plain(text).split(/[^a-z0-9]+/);

// Ô bot xoay được ở khoá tình yêu
const ownDials = (ch, bot) => (ch.leftId === bot.id ? [0, 1] : [2, 3]);

function togetherChoice(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  if (ch.phase !== 'choose' || ch.picks[bot.id] !== undefined) return null;
  const key = `${ch.turn}|${ch.qi}`;
  if (bot.together?.key !== key) bot.together = { key, since: now, opt: null };
  const t = bot.together;
  if (t.opt === null) {
    const humanPick = ch.picks[human.id];
    if (humanPick !== undefined && now - t.since > REACT_MS) {
      const others = q.posts.map((_, i) => i).filter((i) => i !== humanPick);
      t.opt = Math.random() < TOGETHER_MATCH ? humanPick : others[Math.floor(Math.random() * others.length)];
    } else if (now - t.since > TOGETHER_WAIT_MS) {
      t.opt = Math.floor(Math.random() * q.posts.length);
    }
  }
  return t.opt;
}

function lockGoalDial(room, bot) {
  const ch = room.progress.ch;
  if (!bot.lockGoal || bot.lockGoal.key !== ch.code.join()) return null;
  return ownDials(ch, bot).find((i, k) => ch.dials[i] !== bot.lockGoal.syms[k]) ?? -1;
}

// ---------- Vị trí bot cần đứng (null = theo người chơi như bình thường) ----------
export function bridgeTarget(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  switch (q?.type) {
    case 'fishing':
      return ch.fisherId === bot.id ? q.fishX : q.fishX + 70;
    case 'together': {
      const opt = togetherChoice(room, bot, human, now);
      return opt === null ? null : q.posts[opt];
    }
    case 'umbrella': {
      if (!ch.holderId || ch.phase !== 'active') return null;
      // Người cầm ô: tâm ô = vị trí người cầm + gió; người kia phải đứng dưới tâm ô
      const side = Math.sign(bot.x - human.x) || -1;
      return ch.holderId === bot.id ? human.x - ch.wind + side * UMBRELLA_SIDE : human.x + ch.wind + side * UMBRELLA_SIDE;
    }
    case 'stack':
      return q.pileX + (ch.placerId === bot.id ? -30 : 40);
    case 'lock': {
      const i = lockGoalDial(room, bot);
      if (i === null) return null;
      return i >= 0 ? q.dials[i] : q.lockX + 25;
    }
    default:
      return null;
  }
}

// ---------- Việc bot làm mỗi nhịp: { press?, say? } ----------
export function bridgeAction(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  switch (q?.type) {
    case 'fishing':
      // Bot nhìn nước: cá koi cắn câu thì hô "Giật!"
      if (ch.fisherId !== bot.id && ch.phase === 'bob' && ch.kind === 'koi' && now - ch.bobAt >= REACT_MS && bot.calledBob !== ch.bobAt) {
        bot.calledBob = ch.bobAt;
        return { press: 'call' };
      }
      return {};
    case 'together': {
      const opt = togetherChoice(room, bot, human, now);
      return opt !== null && Math.abs(bot.x - q.posts[opt]) <= AT ? { press: `post:${opt}` } : {};
    }
    case 'stack': {
      if (Math.abs(bot.x - q.pileX) > q.reach) return {};
      if (ch.placerId !== bot.id) return ch.steadyId === bot.id ? {} : { press: 'holdOn' };
      const top = ch.stones.at(-1) ?? 0;
      return Math.abs(stackOffsetNow(p, q, now) - top) <= q.tolerance / 2 ? { press: 'drop' } : {};
    }
    case 'sap': {
      if (ch.phase !== 'active') return {};
      const beat = ch.beats.find((b) => b.kind === 'close' && Math.abs(b.at - now) <= JUMP_LEAD_MS);
      if (!beat || bot.jumpedAt === beat.at) return {};
      bot.jumpedAt = beat.at;
      return { press: 'jump' };
    }
    case 'lock':
      return lockAction(room, bot, now);
    default:
      return {};
  }
}

function lockAction(room, bot) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  if (!ch.leftId) return {};
  // Nhắn cho người chơi mã các ô của họ (mỗi mã một lần)
  const theirs = [0, 1, 2, 3].filter((i) => !ownDials(ch, bot).includes(i));
  const key = ch.code.join();
  if (bot.lockTold !== key) {
    bot.lockTold = key;
    const list = theirs.map((i) => `ô ${i + 1} là ${q.symbols[ch.code[i]].icon} ${q.symbols[ch.code[i]].name}`).join(', ');
    return { say: `Mã của bạn nè: ${list} 🔐 Còn ô của mình là gì vậy?` };
  }
  const i = lockGoalDial(room, bot);
  if (i >= 0 && i !== null && Math.abs(bot.x - q.dials[i]) <= AT) return { press: `dial:${i}` };
  if (i === -1 && Math.abs(bot.x - (q.lockX + 25)) <= AT && bot.lockPressed !== key + ch.tries) {
    bot.lockPressed = key + ch.tries;
    return { press: 'lock', say: 'Mình xoay xong rồi, cùng bấm khoá nha 🔒' };
  }
  return {};
}

// Người chơi bấm: bot phối hợp (giật cần khi được hô, cùng bấm khoá)
export function bridgeOnHumanInteract(room, bot, now, targetId) {
  const p = room.progress;
  const q = questOf(p);
  if (q?.type === 'fishing' && targetId === 'call' && p.ch.fisherId === bot.id) bot.pendingPress = { targetId: 'pull', at: now + REACT_MS };
  if (q?.type === 'lock' && targetId === 'lock' && lockGoalDial(room, bot) === -1) bot.pendingPress = { targetId: 'lock', at: now + REACT_MS };
}

// Người chơi nhắn mã ô của bot ở khoá tình yêu: lấy các biểu tượng theo thứ tự xuất hiện
export function bridgeOnChat(room, bot, text) {
  const p = room.progress;
  const q = questOf(p);
  if (q?.type !== 'lock' || !p.ch.leftId) return null;
  const said = words(text);
  const syms = [];
  for (const w of said) {
    const i = q.symbols.findIndex((s) => s.words.includes(w));
    if (i >= 0) syms.push(i);
  }
  // Hoặc nhắn thẳng biểu tượng: "❤️ 🌙"
  const icons = q.symbols.map((s, i) => [i, text.indexOf(s.icon)]).filter(([, at]) => at >= 0).sort((a, b) => a[1] - b[1]).map(([i]) => i);
  const found = syms.length >= 2 ? syms : icons;
  if (found.length < 2) return "Mã ô của mình là gì vậy? Nhắn 2 biểu tượng theo thứ tự nha, vd: 'tim, trăng' 🔐";
  bot.lockGoal = { key: p.ch.code.join(), syms: found.slice(0, 2) };
  const [a, b] = ownDials(p.ch, bot);
  return `Ô ${a + 1} là ${q.symbols[found[0]].icon}, ô ${b + 1} là ${q.symbols[found[1]].icon} hả? Để mình xoay 🤖`;
}
