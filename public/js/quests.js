// Nhiệm vụ phía client: hiển thị, phát hiện nhặt/tương tác, bảng nhiệm vụ.
// Server mới là nơi quyết định hoàn thành; client chỉ gửi yêu cầu.
import { PALETTE } from './palette.js';
import {
  FLOATER_MS, bell, edgeMarker, floaterText, goalFlag, plankItem, promptBubble,
} from './quest-draw.js';
import { blueprintMap } from './blueprint-map.js';
import { CHALLENGE_TYPES, createChallengeClient } from './challenge-client.js';
import { drawCarriedPlank, drawCarry, drawFalling, drawPlates, drawTie, targetMarks } from './quest-view.js';
import {
  QUESTS, SCENES, BARRIERS, COLLECT_RADIUS, CATCH_RADIUS, CATCH_FROM,
  INTERACT_RADIUS, LEVEL_NAMES, PLATE_RADIUS, SYNC_WINDOW_MS, fallX, maxXFor, questAt, sceneAt,
} from '/shared/quests.js';

const BARRIER_HINT_MS = 4000;
const BELL_SWING_MS = 1400;
const BOARD_RANGE = 80; // đứng gần bảng gỗ trong khoảng này thì người cầm bản vẽ xem được bản vẽ
const COUNTED = ['collect', 'catch', 'blueprint', 'carry', 'tie'];

// Thông báo theo hiệu ứng (khiêng ván, buộc lạt): [nội dung, thời gian hiện] hoặc không báo
const FX_TOASTS = {
  lift: (d, mine) => mine && ['🪵 Đã nâng một đầu, người ấy ✋ đầu kia cùng lúc nhé', 1800],
  liftFail: () => ['↔️ Mỗi người đứng một đầu ván, cách nhau vừa phải nhé', 2200],
  lifted: () => ['💪 Nâng lên rồi! Đi cùng nhịp ra đầu cầu nhé', 2200],
  drop: () => ['💥 Rơi ván rồi! Giữ khoảng cách vừa phải, nâng lại nào', 2400],
  hold: (d, mine) => !mine && ['🤲 Người ấy đang giữ ván, buộc lạt đi!', 1800],
  tie: (d) => !d.ok && [d.reason === 'nohold' ? '😵 Chưa ai giữ ván, lạt tuột mất! (−1)' : '😵 Lệch nhịp, nút buộc bị tuột (−1)', 2000],
};

// ---------- Module nhiệm vụ ----------
export function createQuests({ net, toast, panelEl, actBtn, getSelfId, getHolding }) {
  let state = { index: 0, count: 0, items: [], seerId: null, plank: null };
  const pending = new Set();
  const fx = new Map(); // targetId -> thời điểm rung chuông / gõ búa
  const spawnedAt = new Map(); // id vật rơi -> thời điểm bắt đầu rơi theo đồng hồ máy này
  let floaters = [];
  let platesStart = null;
  let lastHintAt = 0;
  let lastScene = null;
  let nearTarget = null;
  let nearItem = null;
  let nearPlank = false;
  let tie = { holder: null, start: 0 }; // buộc lạt: người đang giữ ván + lúc kim bắt đầu chạy (đồng hồ máy này)
  let holding = false; // mình đang nhấn giữ ván

  const panel = {
    scene: Object.assign(document.createElement('div'), { className: 'q-scene' }),
    title: Object.assign(document.createElement('div'), { className: 'q-title' }),
    hint: Object.assign(document.createElement('div'), { className: 'q-hint' }),
  };
  panelEl.append(panel.scene, panel.title, panel.hint);

  const current = () => questAt(state.index, state.level);
  const challenge = createChallengeClient({ net, toast, getSelfId, getHolding });
  const isChallenge = (q) => q && CHALLENGE_TYPES.includes(q.type);
  const isSeer = () => state.seerId && state.seerId === getSelfId();

  function renderPanel() {
    const q = current();
    if (!q) {
      panel.scene.textContent = '🏆 Đã xong mọi nhiệm vụ';
      panel.title.textContent = 'Hồ Đom Đóm sắp mở cửa';
      panel.hint.textContent = 'Cùng nhau đi dạo tiếp nhé 💕';
      return;
    }
    const sceneQuests = QUESTS.filter((x) => x.scene === q.scene);
    const scene = SCENES.find((s) => s.id === q.scene);
    panel.scene.textContent = `📍 ${scene.name} · Nhiệm vụ ${sceneQuests.findIndex((x) => x.id === q.id) + 1}/${sceneQuests.length} · ${LEVEL_NAMES[state.level] ?? ''}`;
    if (isChallenge(q)) {
      const { title, hint } = challenge.panel(q, state.count);
      panel.title.textContent = title;
      panel.hint.textContent = hint;
      return;
    }
    panel.title.textContent = COUNTED.includes(q.type) ? `${q.title} (${state.count}/${q.goal})` : q.title;
    panel.hint.textContent = q.type === 'blueprint' ? blueprintHint() : q.hint;
  }

  function blueprintHint() {
    if (!state.seerId) return '⏳ Chờ đủ hai người để chia bản vẽ';
    if (isSeer()) return "🗺️ Bạn cầm bản vẽ: tới bảng gỗ đầu cảnh để xem, rồi nhắn tin chỉ người ấy (vd: 'đèn lồng phải 2')";
    return '🔍 Người ấy cầm bản vẽ: đọc tin nhắn rồi ✋ nhặt đúng tấm (ván mục −1)';
  }

  function setState(next, initial = false) {
    const prev = state.index;
    const now = performance.now();
    state = next;
    const ids = new Set(next.items.map((it) => it.id));
    for (const id of pending) if (!ids.has(id)) pending.delete(id);
    for (const id of spawnedAt.keys()) if (!ids.has(id)) spawnedAt.delete(id);
    for (const it of next.items) {
      if (it.age !== undefined && !spawnedAt.has(it.id)) spawnedAt.set(it.id, now - it.age);
    }
    if (next.index !== prev) platesStart = null;
    if (next.tie) tie = { holder: next.tie.holder, start: now - next.tie.sweepAge };
    challenge.setState(next, now);
    if (tie.holder !== getSelfId()) holding = false;
    if (!initial && next.index > prev) {
      const done = QUESTS[prev];
      if (next.index >= QUESTS.length) toast('🏆 Hoàn thành mọi nhiệm vụ! Cảnh mới sắp ra mắt', 4000);
      else if (BARRIERS.some((b) => b.after === done.id)) toast('🎉 Đường mới đã mở! Đi tiếp nào →', 3500);
      else toast(`✅ Hoàn thành: ${done.title}`, 3000);
    }
    renderPanel();
  }

  function onPlates(q, me, partner) {
    const on = (p, t) => Math.abs(p.x - t.x) <= PLATE_RADIUS;
    const [t1, t2] = q.targets;
    return partner && ((on(me, t1) && on(partner, t2)) || (on(me, t2) && on(partner, t1)));
  }

  const nearestWithin = (list, x, radius, getX) => {
    let best = null;
    let bestD = radius;
    for (const it of list) {
      const d = Math.abs(x - getX(it));
      if (d <= bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  };

  function update(me, partner, pushingRight) {
    if (!me) return;
    const now = performance.now();
    const q = current();

    const scene = sceneAt(me.x);
    if (lastScene && scene.id !== lastScene) toast(`📍 ${scene.name}`);
    lastScene = scene.id;

    if (q?.type === 'catch') {
      // Hứng khi vật đang rơi ngang người; ẩn ngay cho mượt, server sẽ chấm điểm
      for (const it of state.items) {
        const age = now - spawnedAt.get(it.id);
        const progress = age / (it.fallMs ?? q.fallMs);
        if (progress >= CATCH_FROM && progress <= 1 && Math.abs(me.x - fallX(it, age)) <= CATCH_RADIUS && !pending.has(it.id)) {
          pending.add(it.id);
          net.collect(it.id);
        }
      }
    } else if (q?.type === 'collect') {
      for (const it of state.items) {
        if (Math.abs(me.x - it.x) <= COLLECT_RADIUS && !pending.has(it.id)) {
          pending.add(it.id);
          net.collect(it.id);
        }
      }
    }

    const hasTargets = q?.type === 'sync' || q?.type === 'tie';
    nearTarget = hasTargets ? nearestWithin(q.targets, me.x, INTERACT_RADIUS, (t) => t.x) : null;
    nearItem = q?.type === 'blueprint' && !isSeer() ? nearestWithin(state.items, me.x, INTERACT_RADIUS, (it) => it.x) : null;
    nearPlank = q?.type === 'carry' && !state.plank?.carriers && Math.abs(me.x - state.plank.x) <= q.reach;
    const nearChallenge = isChallenge(q) && challenge.near(q, me);
    actBtn.hidden = !nearTarget && !nearItem && !nearPlank && !nearChallenge;

    if (q?.type === 'plates' && onPlates(q, me, partner)) platesStart ??= now;
    else platesStart = null;

    if (pushingRight && me.x >= maxXFor(state.index) - 2 && now - lastHintAt > BARRIER_HINT_MS) {
      lastHintAt = now;
      toast(q ? '🔒 Cùng hoàn thành nhiệm vụ để mở đường nhé' : '🌙 Hồ Đom Đóm sắp mở cửa, hẹn hai bạn lần sau!');
    }
  }

  function interact() {
    const q = current();
    if (isChallenge(q)) {
      challenge.interact();
      return;
    }
    if (q?.type === 'tie' && nearTarget) {
      // Chỗ giữ ván: nhấn giữ; chỗ buộc: bấm đúng lúc
      if (nearTarget.id === 'hold') {
        holding = true;
        net.interact('holdOn');
      } else {
        net.interact('tie');
      }
    } else if (nearTarget) net.interact(nearTarget.id);
    else if (nearItem) net.interact(`item:${nearItem.id}`);
    else if (nearPlank) net.interact('plank');
  }

  // Thả nút ✋ / phím E
  function release() {
    challenge.release();
    if (!holding) return;
    holding = false;
    net.interact('holdOff');
  }

  function onFx(data, selfId, groundY) {
    const { type, targetId, by, kind, x } = data;
    const now = performance.now();
    const mine = by === selfId;
    const float = (fx, text, color, y = groundY - 95) => floaters.push({ x: fx, y, text, color, at: now });
    if (challenge.onFx(data, float, groundY)) return;

    const floats = {
      catch: () => float(x, { good: '+1', gold: '+3 ✨', bad: '−1' }[kind], kind === 'bad' ? PALETTE.minus : kind === 'gold' ? PALETTE.questGold : PALETTE.plus),
      deliver: () => float(x, '+1 🪵', PALETTE.plus),
      tie: () => data.ok && float(x, 'Chặt! 🪢', PALETTE.plus),
    };
    floats[type]?.();
    const message = FX_TOASTS[type]?.(data, mine);
    if (message) toast(...message);
    if (type in floats || type in FX_TOASTS) return;
    // Chuông gió
    fx.set(targetId, now);
    if (mine) toast('🔔 Đã rung! Người ấy rung chuông còn lại cùng lúc nhé', 2200);
  }


  function draw(ctx, groundY, t, me, partner) {
    const q = current();
    if (!q) return;
    const now = performance.now();

    if (isChallenge(q)) {
      challenge.draw(ctx, q, groundY, t, now, [me, partner].filter(Boolean));
    } else if (q.type === 'catch') {
      drawFalling(ctx, q, state.items.filter((it) => !pending.has(it.id)), spawnedAt, groundY, t, now);
    } else if (q.type === 'collect') {
      for (const it of state.items) plankItem(ctx, it.x, groundY - 8 + Math.sin(t * 2 + it.id) * 2, t);
    } else if (q.type === 'blueprint') {
      // Mọi tấm ván nhìn giống hệt nhau; chỉ bản vẽ ở bảng gỗ mới cho biết tấm nào tốt
      for (const it of state.items) plankItem(ctx, it.x, groundY - 4, t, false);
      if (nearItem) promptBubble(ctx, nearItem.x, groundY - 100);
      if (isSeer()) promptBubble(ctx, q.boardX, groundY - 125);
    } else if (q.type === 'carry') {
      drawCarry(ctx, state.plank, groundY, nearPlank);
    } else if (q.type === 'tie') {
      drawTie(ctx, q, tie, state.count, groundY, t, now);
      if (nearTarget) promptBubble(ctx, nearTarget.x, groundY - 100);
    } else if (q.type === 'sync') {
      for (const target of q.targets) {
        const since = now - (fx.get(target.id) ?? -Infinity);
        const swing = since < BELL_SWING_MS ? Math.sin(since / 70) * 0.5 * (1 - since / BELL_SWING_MS) : 0;
        bell(ctx, target.x, groundY, swing, since < SYNC_WINDOW_MS);
      }
      if (nearTarget) promptBubble(ctx, nearTarget.x, groundY - 150);
    } else if (q.type === 'plates') {
      drawPlates(ctx, q, [me, partner].filter(Boolean), platesStart, groundY, now);
    } else if (q.type === 'holdWalk') {
      goalFlag(ctx, q.goalX, groundY, t);
    }

    floaters = floaters.filter((f) => now - f.at < FLOATER_MS);
    for (const f of floaters) floaterText(ctx, f, now);
  }

  // Vẽ trong toạ độ màn hình, sau khi đã vẽ xong cảnh
  function drawOverlay(ctx, camX, view, groundY, me, partner) {
    const margin = 24;
    for (const side of [-1, 1]) {
      const off = targetMarks(current(), state, isSeer())
        .map((m) => ({ ...m, sx: m.x - camX }))
        .filter((m) => (side < 0 ? m.sx < 0 : m.sx > view.w));
      if (!off.length) continue;
      const nearest = off.reduce((a, b) => (Math.abs(a.sx - view.w / 2) < Math.abs(b.sx - view.w / 2) ? a : b));
      edgeMarker(ctx, side < 0 ? margin : view.w - margin, groundY - 60, side, nearest.icon);
    }

    // Người cầm bản vẽ đứng ở bảng gỗ thì mở bản vẽ thu nhỏ
    const q = current();
    if (q) challenge.drawOverlay(ctx, q, view, performance.now(), camX, groundY, me, partner);
    if (q?.type === 'blueprint' && isSeer() && me && Math.abs(me.x - q.boardX) <= BOARD_RANGE) {
      const top = Math.max(64, groundY - 330);
      blueprintMap(ctx, { viewW: view.w, top, q, items: state.items, meX: me.x, partnerX: partner?.x });
    }
  }

  function drawFront(ctx, groundY, me, partner) {
    const q = current();
    if (q?.type === 'carry') drawCarriedPlank(ctx, q, state.plank, [me, partner], groundY);
    if (isChallenge(q)) challenge.drawFront(ctx, q, groundY, [me, partner].filter(Boolean));
  }

  return {
    handChallenge: () => current()?.hand === true,
    setState,
    drawFront,
    drawOverlay,
    update,
    interact,
    release,
    onFx,
    draw,
    maxX: () => maxXFor(state.index),
    get index() {
      return state.index;
    },
  };
}
