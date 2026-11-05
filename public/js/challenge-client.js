// Phía client của các thử thách ở Cổng Hoa Đào: trạng thái, bảng nhiệm vụ, tương tác, thông báo, vẽ
import { PALETTE } from './palette.js';
import { drawChallenge, drawChallengeOverlay, drawHowTo } from './challenge-view.js';
import { drawFolk, drawFolkFront, drawFolkOverlay } from './folk-view.js';
import { BRIDGE_TYPES, createBridgeClient } from './bridge-client.js';
import { drawBridgeFront, drawBridgeGame, drawBridgeOverlay } from './bridge-view.js';
import { INTERACT_RADIUS } from '/shared/quests.js';

const FOLK_TYPES = ['blindGoat', 'nemcon', 'memory', 'tug'];
export const CHALLENGE_TYPES = ['statue', 'leafWalk', 'cadao', 'photo', ...FOLK_TYPES, ...BRIDGE_TYPES];

const START_MSG = {
  statue: '🌳 Bắt đầu! Đi khi cây quay lưng, đứng im khi cây hô',
  leafWalk: '🍂 Bắt đầu! Nắm chặt tay, né lá rơi nhé',
  tug: '💪 Bắt đầu kéo co! Thấy "DÔ!" thì cả hai cùng bấm ✋',
  umbrella: '☔ Mưa rồi! Nắm tay đứng sát dưới ô mà đi nhé',
  sap: '🎋 Bắt đầu nhảy sạp! Sạp khép thì cả hai cùng bấm ✋',
};

const TOSS_MSG = { weak: 'lực yếu quá', strong: 'lực mạnh quá', ring: 'hô lệch lúc vòng chưa về giữa' };

export function createChallengeClient({ net, toast, getSelfId, getHolding }) {
  const s = {
    ch: null, items: [], cycleStart: 0, spawnedAt: new Map(), goatStart: 0, ringStart: 0, aimStart: 0, cueStart: 0,
    nearItem: null, nearTarget: null, photoShown: null, seerId: null, toss: null, aiming: false,
    signal: null, tugMsg: null,
  };
  const bridge = createBridgeClient({ net, toast, getSelfId, s });
  const isBridge = (q) => BRIDGE_TYPES.includes(q?.type);

  // Bịt mắt bắt dê: nút ra hiệu nhanh cho người dẫn đường (bấm được cả bằng phím 1–4)
  const signalBar = document.getElementById('signal-bar');
  const sendSignal = (sig) => net.interact(sig);
  for (const btn of signalBar.querySelectorAll('button')) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sendSignal(btn.dataset.sig);
    });
  }
  const SIGNAL_KEYS = { 1: 'sig:left', 2: 'sig:stop', 3: 'sig:grab', 4: 'sig:right' };
  window.addEventListener('keydown', (e) => {
    if (signalBar.hidden || document.activeElement?.tagName === 'INPUT' || !SIGNAL_KEYS[e.key]) return;
    sendSignal(SIGNAL_KEYS[e.key]);
  });

  function setState(next, now) {
    const prevCue = s.ch?.cueAge;
    s.ch = next.ch ?? null;
    s.items = next.items;
    s.seerId = next.seerId;
    const ch = s.ch ?? {};
    if (ch.cycleAge !== undefined) s.cycleStart = now - ch.cycleAge;
    if (ch.goats) s.goatStart = now;
    if (ch.ringAge !== undefined) s.ringStart = now - ch.ringAge;
    if (ch.aimAge !== undefined) s.aimStart = now - ch.aimAge;
    if (ch.cueAge !== undefined && prevCue === undefined) s.cueStart = now - ch.cueAge;
    if (ch.thrower !== getSelfId()) s.aiming = false;
    const ids = new Set(next.items.map((it) => it.id));
    for (const id of s.spawnedAt.keys()) if (!ids.has(id)) s.spawnedAt.delete(id);
    for (const it of next.items) if (it.age !== undefined && !s.spawnedAt.has(it.id)) s.spawnedAt.set(it.id, now - it.age);
    bridge.setState(s.ch, now);
  }

  const idle = () => s.ch?.phase === 'idle';
  const me = () => getSelfId();

  // Tiêu đề + gợi ý cho bảng nhiệm vụ
  function panel(q, count) {
    if (isBridge(q)) return bridge.panel(q, count);
    const ch = s.ch ?? {};
    const titled = (n, goal, unit = '') => `${q.title} (${n}/${goal}${unit})`;
    switch (q.type) {
      case 'statue':
      case 'leafWalk':
        return { title: q.title, hint: idle() ? '🤝 Nắm tay nhau, cùng đứng ở vạch Xuất phát để bắt đầu' : q.hint };
      case 'cadao': {
        const goal = ch.goal ?? '?';
        if (!s.seerId) return { title: titled(count, goal), hint: '⏳ Chờ đủ hai người để chia vai' };
        const hint = ch.verse
          ? `📜 Câu ca dao: "${ch.verse}". Nhắn cho người ấy chữ cần chạm, thay phiên nhau nhé`
          : '🔍 Người ấy biết câu ca dao: hỏi chữ tiếp theo rồi ✋ chạm đèn (thay phiên nhau)';
        return { title: titled(count, goal), hint };
      }
      case 'blindGoat': {
        if (!ch.blindId) return { title: titled(count, q.goal), hint: '⏳ Chờ đủ hai người để chia vai' };
        const hint = ch.blindId === me()
          ? '🙈 Bạn đang bị bịt mắt! Nghe người ấy nhắn đường rồi ✋ chộp dê'
          : '👀 Người ấy bị bịt mắt: bấm nút ⬅️ ✋ 🐐 ➡️ bên dưới (hoặc phím 1–4) để dẫn tới con dê';
        return { title: titled(count, q.goal), hint };
      }
      case 'nemcon': {
        if (!ch.thrower) return { title: titled(count, q.goal), hint: '⏳ Chờ đủ hai người để chia vai' };
        const thrower = ch.thrower === me();
        const hint = thrower
          ? (ch.ready ? '⏳ Lực chuẩn rồi! Chờ người ấy hô ném' : '🏐 Tới lượt bạn ném: đứng ở vạch ném, GIỮ ✋ rồi thả tay khi lực vào vùng xanh')
          : (ch.ready ? '📣 Bóng sẵn sàng! Bấm ✋ HÔ NÉM đúng lúc vòng về giữa cột' : '👀 Chờ người ấy lấy lực. Chỉ bạn thấy vòng trên cột!');
        return { title: titled(count, q.goal), hint };
      }
      case 'memory': {
        const goal = ch.goal ?? 4;
        const turn = ch.lastBy === me() ? '⏳ Tới lượt người ấy lật thẻ' : '🃏 Tới lượt bạn lật một thẻ (✋). Nhớ giùm nhau nhé!';
        const misses = ch.maxMisses ? ` · Sai ${ch.misses}/${ch.maxMisses} là xáo lại` : '';
        return { title: titled(count, goal, ' cặp'), hint: turn + misses };
      }
      case 'tug':
        return { title: `${q.title} (${count}%)`, hint: idle() ? '🤝 Nắm tay nhau, cùng đứng ở vạch Kéo để bắt đầu' : q.hint };
      default:
        return { title: q.title, hint: q.hint };
    }
  }

  const nearest = (list, x, ok) => {
    let best = null;
    let bestD = INTERACT_RADIUS;
    for (const it of list) {
      const d = Math.abs(x - it.x);
      if (ok(it) && d <= bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  };

  // Tìm thứ đứng gần để bấm ✋; trả về true nếu có
  function near(q, player) {
    const ch = s.ch ?? {};
    s.nearItem = null;
    s.nearTarget = null;
    if (q.type === 'cadao') s.nearItem = nearest(s.items, player.x, (it) => !it.lit);
    if (q.type === 'memory') s.nearItem = nearest(s.items, player.x, (it) => it.state === 'down');
    if (q.type === 'photo' && Math.abs(player.x - q.frameX) <= q.frameHalf) s.nearTarget = { id: 'photo', x: q.frameX };
    if (q.type === 'blindGoat' && ch.blindId === me()) s.nearTarget = { id: 'grab', x: player.x };
    if (q.type === 'nemcon' && ch.thrower === me() && !ch.ready && Math.abs(player.x - q.throwX) <= q.throwRadius) s.nearTarget = { id: 'aim', x: q.throwX };
    if (q.type === 'nemcon' && ch.thrower && ch.thrower !== me() && ch.ready) s.nearTarget = { id: 'shout', x: player.x };
    if (q.type === 'tug' && ch.phase === 'active') s.nearTarget = { id: 'pull', x: player.x };
    signalBar.hidden = !(q.type === 'blindGoat' && ch.blindId && ch.blindId !== me());
    if (isBridge(q)) return bridge.near(q, player);
    return Boolean(s.nearItem || s.nearTarget);
  }

  let current = null; // nhiệm vụ đang vẽ gần nhất, để biết chuyển việc cho phần Cầu Tình Yêu
  function interact() {
    if (isBridge(current)) {
      bridge.interact();
      return;
    }
    if (s.nearItem) net.interact(`item:${s.nearItem.id}`);
    else if (s.nearTarget) {
      if (s.nearTarget.id === 'aim') s.aiming = true; // ném còn: giữ để lấy lực, thả tay để ném
      net.interact(s.nearTarget.id);
    }
  }

  function release() {
    bridge.release();
    if (!s.aiming) return;
    s.aiming = false;
    net.interact('throw');
  }

  // Trả về true nếu đã xử lý hiệu ứng này
  function onFx(data, float, groundY) {
    const mine = data.by === me();
    switch (data.type) {
      case 'start':
        toast(START_MSG[data.quest] ?? '🏁 Bắt đầu!', 2600);
        return true;
      case 'fail': {
        const msg = {
          moved: mine ? '😵 Bạn nhúc nhích rồi! Về vạch nào' : '😵 Người ấy nhúc nhích rồi! Về vạch nào',
          drop: '💔 Rớt tay rồi! Nắm tay lại làm lại nhé',
          leaf: mine ? '🍂 Bạn bị lá rơi trúng! Về vạch nào' : '🍂 Người ấy bị lá rơi trúng! Về vạch nào',
          lost: '😵 Bù nhìn kéo thắng rồi! Kéo lại từ giữa nhé',
          wet: mine ? '💧 Bạn ướt sũng rồi! Về vạch nào' : '💧 Người ấy ướt sũng rồi! Về vạch nào',
        }[data.reason];
        toast(msg ?? '😵 Làm lại nào', 2600);
        return true;
      }
      case 'turn':
        if (mine) toast('⏳ Tới lượt người ấy nhé', 1800);
        return true;
      case 'lantern':
        if (data.ok) float(data.x, data.word, PALETTE.plus, groundY - 210);
        else toast(`😵 Sai chữ «${data.word}», đèn tắt hết rồi! Làm lại từ đầu nhé`, 2600);
        return true;
      case 'signal':
        s.signal = { dir: data.dir, at: performance.now(), mine };
        return true;
      case 'goat':
        if (data.ok) float(data.x, 'Bắt được! 🐐', PALETTE.plus);
        else if (data.decoy) toast('😵 Chộp nhầm dê bù nhìn rồi! (−1)', 2200);
        else if (mine) toast('🙈 Chộp hụt rồi! Hỏi người ấy dê ở đâu', 1800);
        return true;
      case 'ready':
        toast(mine ? '🏐 Lực chuẩn! Chờ người ấy hô ném nhé' : '📣 Bóng sẵn sàng! Canh vòng rồi bấm ✋ hô ném', 2400);
        return true;
      case 'toss':
        s.toss = { at: performance.now(), ok: data.ok };
        if (data.ok) toast('🎉 Lọt vòng rồi!', 2000);
        else toast(`😵 Trượt: ${TOSS_MSG[data.reason] ?? 'chưa lọt'}`, 2200);
        return true;
      case 'match':
        if (data.ok) float(data.x, 'Trùng rồi! ✨', PALETTE.plus, groundY - 110);
        else if (data.reshuffle) toast('🔀 Sai nhiều quá, các thẻ úp sắp bị xáo lại!', 2400);
        return true;
      case 'reshuffle':
        toast('🔀 Đã xáo lại các thẻ còn úp, nhớ lại từ đầu nhé!', 2600);
        return true;
      case 'fooled':
        s.tugMsg = { text: '😵 Bị lừa! "DỐ!" là hô giả', ok: false, at: performance.now() };
        return true;
      // Kéo co: báo ngay trên đầu nhân vật (không dùng thông báo chung vì sẽ che chữ "DÔ!")
      case 'pull':
        s.tugMsg = { text: data.ok ? '💪 Kéo được!' : '😵 Lệch nhịp, bị kéo lại!', ok: data.ok, at: performance.now() };
        return true;
      case 'early':
        s.tugMsg = { text: mine ? '😵 Bạn kéo sớm quá, chờ "DÔ!"' : '😵 Người ấy kéo sớm quá!', ok: false, at: performance.now() };
        return true;
      case 'photoWait':
        if (mine) toast('📸 Chờ người ấy cùng bấm nhé', 1600);
        return true;
      case 'photoFail':
        toast('📸 Cả hai phải nắm tay và đứng trong khung ảnh nhé', 2400);
        return true;
      case 'photo':
        s.photoShown = { photo: data.photo, at: performance.now() };
        toast('📸 Đã lưu ảnh kỷ niệm 💕', 3000);
        return true;
      default:
        return bridge.onFx(data, float);
    }
  }

  const isFolk = (q) => FOLK_TYPES.includes(q?.type);

  return {
    setState,
    panel,
    near,
    interact,
    release,
    onFx,
    liftOf: (id, now) => bridge.liftOf(id, now),
    draw(ctx, q, groundY, t, now, people) {
      current = q;
      if (isFolk(q)) drawFolk(ctx, q, s, groundY, t, now, people, me());
      else if (isBridge(q)) drawBridgeGame(ctx, q, s, groundY, t, now, people, me());
      else drawChallenge(ctx, q, s, groundY, t, now, people);
    },
    drawFront(ctx, q, groundY, people) {
      if (isFolk(q)) drawFolkFront(ctx, q, s, groundY, people);
      if (isBridge(q)) drawBridgeFront(ctx, q, s, groundY, people, performance.now());
    },
    drawOverlay(ctx, q, view, now, camX, groundY, player, partner) {
      if (isFolk(q)) drawFolkOverlay(ctx, q, s, view, now, camX, groundY, player);
      if (isBridge(q)) drawBridgeOverlay(ctx, q, s, view, now, camX, groundY, player);
      drawChallengeOverlay(ctx, q, s, view, now, camX, groundY);
      // Thử thách nắm tay chưa bắt đầu: bảng hướng dẫn có ô tích
      if (q.hand && s.ch?.phase === 'idle' && player) drawHowTo(ctx, q, view, player, partner, getHolding());
    },
  };
}
