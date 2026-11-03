// Nhiệm vụ phía client: hiển thị, phát hiện nhặt/tương tác, bảng nhiệm vụ.
// Server mới là nơi quyết định hoàn thành; client chỉ gửi yêu cầu.
import { PALETTE } from './palette.js';
import {
  FLOATER_MS, bell, edgeMarker, floaterText, goalFlag, leafItem, petalItem, plankItem,
  progressRing, promptBubble, stump,
} from './quest-draw.js';
import {
  QUESTS, SCENES, BARRIERS, COLLECT_RADIUS, CATCH_RADIUS, CATCH_FROM, FALL_HEIGHT,
  INTERACT_RADIUS, PLATE_RADIUS, SYNC_WINDOW_MS, maxXFor, sceneAt,
} from '/shared/quests.js';

const BARRIER_HINT_MS = 4000;
const BELL_SWING_MS = 1400;
const LANDED_FADE = 0.1; // phần tiến độ rơi để mờ dần sau khi chạm đất

// ---------- Module nhiệm vụ ----------
export function createQuests({ net, toast, panelEl, actBtn }) {
  let state = { index: 0, count: 0, items: [] };
  const pending = new Set();
  const fx = new Map(); // targetId -> thời điểm rung
  const spawnedAt = new Map(); // id vật rơi -> thời điểm bắt đầu rơi theo đồng hồ máy này
  let floaters = [];
  let platesStart = null;
  let lastHintAt = 0;
  let lastScene = null;
  let nearTarget = null;

  const panel = {
    scene: Object.assign(document.createElement('div'), { className: 'q-scene' }),
    title: Object.assign(document.createElement('div'), { className: 'q-title' }),
    hint: Object.assign(document.createElement('div'), { className: 'q-hint' }),
  };
  panelEl.append(panel.scene, panel.title, panel.hint);

  const current = () => QUESTS[state.index];

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
    panel.scene.textContent = `📍 ${scene.name} · Nhiệm vụ ${sceneQuests.indexOf(q) + 1}/${sceneQuests.length}`;
    const counted = q.type === 'collect' || q.type === 'catch';
    panel.title.textContent = counted ? `${q.title} (${state.count}/${q.goal})` : q.title;
    panel.hint.textContent = q.hint;
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
        const progress = (now - spawnedAt.get(it.id)) / q.fallMs;
        if (progress >= CATCH_FROM && progress <= 1 && Math.abs(me.x - it.x) <= CATCH_RADIUS && !pending.has(it.id)) {
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

    nearTarget = q?.type === 'sync' ? q.targets.find((t) => Math.abs(me.x - t.x) <= INTERACT_RADIUS) : null;
    actBtn.hidden = !nearTarget;

    if (q?.type === 'plates' && onPlates(q, me, partner)) platesStart ??= now;
    else platesStart = null;

    if (pushingRight && me.x >= maxXFor(state.index) - 2 && now - lastHintAt > BARRIER_HINT_MS) {
      lastHintAt = now;
      toast(q ? '🔒 Cùng hoàn thành nhiệm vụ để mở đường nhé' : '🌙 Hồ Đom Đóm sắp mở cửa, hẹn hai bạn lần sau!');
    }
  }

  function interact() {
    if (nearTarget) net.interact(nearTarget.id);
  }

  function onFx({ type, targetId, by, kind, x }, selfId, groundY) {
    if (type === 'catch') {
      const good = kind === 'good';
      floaters.push({ x, y: groundY - 95, text: good ? '+1' : '−1', color: good ? PALETTE.plus : PALETTE.minus, at: performance.now() });
      return;
    }
    fx.set(targetId, performance.now());
    if (by === selfId) toast('🔔 Đã rung! Người ấy rung chuông còn lại cùng lúc nhé', 2200);
  }

  function draw(ctx, groundY, t, me, partner) {
    const q = current();
    if (!q) return;
    const now = performance.now();

    if (q.type === 'catch') {
      for (const it of state.items) {
        if (pending.has(it.id)) continue;
        const progress = (now - spawnedAt.get(it.id)) / q.fallMs;
        if (progress > 1 + LANDED_FADE) continue;
        const fall = Math.min(1, progress);
        const y = groundY - 10 - FALL_HEIGHT * (1 - fall);
        const sx = it.x + (fall < 1 ? Math.sin(progress * 9 + it.id) * 6 : 0);
        ctx.save();
        if (progress > 1) ctx.globalAlpha = 1 - (progress - 1) / LANDED_FADE;
        if (it.kind === 'bad') leafItem(ctx, sx, y, progress * 6 + it.id);
        else petalItem(ctx, sx, y, t);
        ctx.restore();
      }
    } else if (q.type === 'collect') {
      for (const it of state.items) plankItem(ctx, it.x, groundY - 8 + Math.sin(t * 2 + it.id) * 2, t);
    } else if (q.type === 'sync') {
      for (const target of q.targets) {
        const since = now - (fx.get(target.id) ?? -Infinity);
        const swing = since < BELL_SWING_MS ? Math.sin(since / 70) * 0.5 * (1 - since / BELL_SWING_MS) : 0;
        bell(ctx, target.x, groundY, swing, since < SYNC_WINDOW_MS);
      }
      if (nearTarget) promptBubble(ctx, nearTarget.x, groundY - 150);
    } else if (q.type === 'plates') {
      const people = [me, partner].filter(Boolean);
      for (const target of q.targets) {
        stump(ctx, target.x, groundY, people.some((p) => Math.abs(p.x - target.x) <= PLATE_RADIUS));
      }
      if (platesStart !== null) {
        const mid = (q.targets[0].x + q.targets[1].x) / 2;
        progressRing(ctx, mid, groundY - 120, Math.min(1, (now - platesStart) / q.holdMs));
      }
    } else if (q.type === 'holdWalk') {
      goalFlag(ctx, q.goalX, groundY, t);
    }

    floaters = floaters.filter((f) => now - f.at < FLOATER_MS);
    for (const f of floaters) floaterText(ctx, f, now);
  }

  // Vị trí các mục tiêu cần đi tới của nhiệm vụ hiện tại (không tính vật rơi)
  function targetMarks() {
    const q = current();
    if (!q) return [];
    if (q.type === 'sync') return q.targets.map((tg) => ({ x: tg.x, icon: '🔔' }));
    if (q.type === 'plates') return q.targets.map((tg) => ({ x: tg.x, icon: '🪵' }));
    if (q.type === 'collect') return state.items.map((it) => ({ x: it.x, icon: '🪵' }));
    if (q.type === 'holdWalk') return [{ x: q.goalX, icon: '💕' }];
    return [];
  }

  // Vẽ trong toạ độ màn hình, sau khi đã vẽ xong cảnh
  function drawOverlay(ctx, camX, viewW, groundY) {
    const margin = 24;
    for (const side of [-1, 1]) {
      const off = targetMarks()
        .map((m) => ({ ...m, sx: m.x - camX }))
        .filter((m) => (side < 0 ? m.sx < 0 : m.sx > viewW));
      if (!off.length) continue;
      const nearest = off.reduce((a, b) => (Math.abs(a.sx - viewW / 2) < Math.abs(b.sx - viewW / 2) ? a : b));
      edgeMarker(ctx, side < 0 ? margin : viewW - margin, groundY - 60, side, nearest.icon);
    }
  }

  return {
    setState,
    drawOverlay,
    update,
    interact,
    onFx,
    draw,
    maxX: () => maxXFor(state.index),
    get index() {
      return state.index;
    },
  };
}
