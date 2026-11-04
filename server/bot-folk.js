// Bot chơi trò dân gian ở Cổng Hoa Đào (chế độ 1 người): bịt mắt bắt dê, ném còn, lật thẻ hoa, kéo co
import { INTERACT_RADIUS, goatX, nemconRing, questOf } from '../shared/quests.js';

const GOAT_STEP = 60; // bot bịt mắt đi từng quãng theo lệnh
const GUIDE_EVERY_MS = 1600;
const NEMCON_HOLD_MS = 525; // giữ chừng này thì lực ≈ 0.7
const NEMCON_SHOUT_LEAD_MS = 100; // bấm hô ném ngay trước khi vòng về giữa (bot chạy mỗi 100ms)
const MEMORY_START_WAIT_MS = 3000; // chưa ai lật thì bot chờ người chơi lật trước
const PULL_DELAY_MS = 120;

const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const words = (text) => plain(text).split(/[^a-z0-9]+/);

// ---------- Bịt mắt bắt dê ----------
// Bot dẫn đường: bấm nút ra hiệu (trái / phải / bắt) theo vị trí dê so với người chơi
function goatGuide(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const gx = goatX(q, p.ch.goat, now - p.ch.goat.at); // bot luôn dẫn tới dê thật, tránh dê bù nhìn
  const d = gx - human.x;
  const sig = Math.abs(d) <= q.grabRadius - 10 ? 'sig:grab' : d < 0 ? 'sig:left' : 'sig:right';
  if (bot.guide?.sig === sig && now - bot.guide.at < GUIDE_EVERY_MS * 2) return null;
  if (bot.guide && now - bot.guide.at < GUIDE_EVERY_MS / 2) return null;
  bot.guide = { sig, at: now };
  return sig;
}

const SIGNAL_MOVES = { 'sig:left': -1, 'sig:right': 1, 'sig:stop': 0 };

// ---------- Ném còn ----------
// Thời gian (ms) tới lần vòng về giữa tiếp theo
// Thời gian (ms) tới lần vòng đi qua điểm cần hô (giữa cột lệch theo gió)
function msToTarget(q, ch, now) {
  for (let t = 0; t <= ch.period; t += 10) {
    if (Math.abs(nemconRing(q, now - ch.ringStart + t, ch.period) - ch.wind) < 0.06) return t;
  }
  return Infinity;
}

// ---------- Lật thẻ hoa ----------
function memoryPick(p, bot) {
  const down = p.items.filter((it) => it.state === 'down');
  const known = (it) => bot.memo?.[it.id];
  const up = p.items.find((it) => it.state === 'up');
  if (up) return down.find((it) => known(it) === up.kind) ?? down.find((it) => !known(it)) ?? down[0];
  const byKind = {};
  for (const it of down) if (known(it)) (byKind[known(it)] ??= []).push(it);
  const pairKnown = Object.values(byKind).find((list) => list.length >= 2);
  return pairKnown?.[0] ?? down.find((it) => !known(it)) ?? down[0];
}

function botTurn(p, bot, human, now) {
  const ch = p.ch;
  if (ch.hideAt) return false;
  if (ch.lastBy === human.id) return true;
  // Chưa ai lật: chờ người chơi một lúc rồi bot lật trước
  return ch.lastBy === null && now - (bot.memoryIdleAt ??= now) > MEMORY_START_WAIT_MS;
}

// ---------- Vị trí bot cần đứng (null = theo người chơi như bình thường) ----------
export function folkTarget(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  switch (q?.type) {
    case 'blindGoat':
      if (ch.blindId === bot.id) return Math.max(q.area[0], Math.min(q.area[1], bot.x + (bot.goatDir ?? 0) * GOAT_STEP));
      return human.x + 70;
    case 'nemcon':
      return ch.thrower === bot.id ? q.throwX : q.poleX;
    case 'memory': {
      if (!botTurn(p, bot, human, now)) return null;
      bot.memoryCard = memoryPick(p, bot)?.id;
      return p.items.find((it) => it.id === bot.memoryCard)?.x ?? null;
    }
    default:
      return null;
  }
}

// ---------- Việc bot làm mỗi nhịp: { press?, say? } ----------
export function folkAction(room, bot, human, now) {
  const p = room.progress;
  const q = questOf(p);
  const ch = p.ch;
  switch (q?.type) {
    case 'blindGoat':
      if (ch.blindId === bot.id) {
        if (bot.goatGrab) {
          bot.goatGrab = false;
          return { press: 'grab' };
        }
        return {};
      }
      return { press: goatGuide(room, bot, human, now) };
    case 'nemcon': {
      if (ch.thrower === bot.id) {
        // Bot ném: lấy lực vừa đủ rồi thả, sau đó chờ người chơi hô
        if (ch.ready || Math.abs(bot.x - q.throwX) > q.throwRadius / 2) return {};
        if (!ch.aimAt) return { press: 'aim' };
        return now - ch.aimAt >= NEMCON_HOLD_MS ? { press: 'throw' } : {};
      }
      // Bot đứng dưới cột: bóng sẵn sàng thì hô ném ngay trước khi vòng về giữa
      if (ch.ready && msToTarget(q, ch, now) <= NEMCON_SHOUT_LEAD_MS) return { press: 'shout' };
      return {};
    }
    case 'memory': {
      // Nhớ mọi thẻ đã lật lên
      bot.memo ??= {};
      for (const it of p.items) if (it.kind) bot.memo[it.id] = it.kind;
      const card = p.items.find((it) => it.id === bot.memoryCard);
      if (!card || card.state !== 'down' || !botTurn(p, bot, human, now)) return {};
      if (Math.abs(bot.x - card.x) > INTERACT_RADIUS / 2) return {};
      bot.memoryCard = null;
      const name = q.flowers.find((f) => f.id === card.kind)?.name;
      return { press: `item:${card.id}`, say: `Thẻ này là ${name} nha, nhớ giùm mình 🧠` };
    }
    default:
      return {};
  }
}

// Người chơi bấm: kéo co thì bot kéo theo; bịt mắt bắt dê thì bot bịt mắt làm theo nút ra hiệu
export function folkOnHumanInteract(room, bot, now, targetId) {
  const p = room.progress;
  const q = questOf(p);
  if (q?.type === 'blindGoat' && p.ch.blindId === bot.id) {
    if (targetId === 'sig:grab') {
      bot.goatDir = 0;
      bot.goatGrab = true;
    } else if (targetId in SIGNAL_MOVES) {
      bot.goatDir = SIGNAL_MOVES[targetId];
    }
  }
  // Hô "DỐ!" giả thì bot không kéo
  if (q?.type === 'tug' && p.ch.phase === 'active' && p.ch.cueAt && !p.ch.cueFake) bot.pendingPress = { targetId: 'pull', at: now + PULL_DELAY_MS };
}

// Người chơi nhắn tin: bot bịt mắt làm theo "trái / phải / dừng / bắt"; trả về câu đáp hoặc null
export function folkOnChat(room, bot, text) {
  const p = room.progress;
  const q = questOf(p);
  if (q?.type !== 'blindGoat' || p.ch.blindId !== bot.id) return null;
  const w = words(text);
  if (w.some((x) => ['bat', 'chop', 'om'].includes(x))) {
    bot.goatDir = 0;
    bot.goatGrab = true;
    return '🙈 Chộp nè!';
  }
  if (w.includes('dung') || w.includes('stop')) {
    bot.goatDir = 0;
    return '🙈 Đứng im rồi';
  }
  if (w.includes('trai')) {
    bot.goatDir = -1;
    return '🙈 Sang trái…';
  }
  if (w.includes('phai')) {
    bot.goatDir = 1;
    return '🙈 Sang phải…';
  }
  return "🙈 Mình bị bịt mắt rồi, nhắn 'trái', 'phải', 'dừng' hay 'bắt' nha";
}
