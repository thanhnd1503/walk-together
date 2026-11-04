// Điểm vào: kết nối các phần lại với nhau + vòng lặp game
import {
  WORLD_WIDTH, WALK_SPEED, SEND_RATE, HEARTBEAT_MS, HOLD_DISTANCE,
} from '/shared/constants.js';
import { heart } from './draw.js';
import { Player } from './player.js';
import { drawWorld, drawForeground, updateWorld } from './world.js';
import { createInput } from './input.js';
import { createNet } from './net.js';
import { createQuests } from './quests.js';
import { setupJoinScreen, setupLookScreen, showJoinScreen } from './screens.js';
import { drawBubble, setStatus, toast } from './ui.js';

const VIEW_H = 360; // chiều cao logic tối thiểu
const MIN_VIEW_W = 420; // chiều rộng logic tối thiểu (màn hình dọc điện thoại)
const EDGE = 24;

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const chatInput = $('chat-input');
const btnHand = $('btn-hand');

const state = {
  joined: false,
  connected: true,
  roomCode: '',
  selfId: null,
  players: new Map(),
  holding: false,
};
const view = { w: MIN_VIEW_W, h: VIEW_H, scale: 1 };

// ---------- Canvas co giãn + nét trên màn hình retina ----------
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  view.scale = Math.min(cssH / VIEW_H, cssW / MIN_VIEW_W);
  view.w = cssW / view.scale;
  view.h = cssH / view.scale;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Chừa chỗ cho thanh nút phía dưới
const groundY = () => view.h - Math.max(95, 140 / view.scale);

// ---------- Người chơi ----------
const self = () => state.players.get(state.selfId);
const partner = () => [...state.players.values()].find((p) => p.id !== state.selfId);

function syncPlayers(list) {
  const ids = new Set(list.map((p) => p.id));
  for (const id of state.players.keys()) if (!ids.has(id)) state.players.delete(id);
  for (const data of list) {
    const existing = state.players.get(data.id);
    if (existing) {
      existing.setInfo(data);
      if (!existing.isLocal) existing.applyRemote(data);
    } else {
      state.players.set(data.id, new Player(data, data.id === state.selfId));
    }
  }
  updateStatus();
}

function setHolding(holding) {
  state.holding = holding;
  btnHand.classList.toggle('active', holding);
}

function updateStatus() {
  if (!state.joined) return;
  const p = partner();
  if (!state.connected) setStatus('📡 Mất kết nối, đang thử lại…');
  else if (p) setStatus(`💕 Đang đi dạo cùng ${p.name}`);
  else setStatus(`⏳ Phòng ${state.roomCode}: đang chờ người ấy…`);
}

function enterRoom(res) {
  state.selfId = res.selfId;
  state.players.clear();
  syncPlayers(res.players);
  setHolding(res.holding);
  quests.setState(res.quest, true);
  updateStatus();
}

// ---------- Mạng ----------
const net = createNet({
  getLocalX: () => self()?.x,
  onConnectionChange(connected) {
    state.connected = connected;
    updateStatus();
  },
  onRejoin: enterRoom,
  onState({ players, holding }) {
    const before = partner();
    syncPlayers(players);
    setHolding(holding);
    const after = partner();
    if (!before && after) toast(`🌸 ${after.name} đã đến!`);
  },
  onLeft({ id, players }) {
    const gone = state.players.get(id);
    if (gone) toast(`🥺 ${gone.name} đã rời đi`);
    syncPlayers(players);
    setHolding(false);
  },
  onMove(data) {
    // MOVE của chính mình = server đưa về vạch xuất phát
    state.players.get(data.id)?.applyRemote(data);
  },
  onChat({ id, text }) {
    state.players.get(id)?.say(text);
  },
  onLook({ id, look }) {
    const p = state.players.get(id);
    if (p) p.setInfo({ name: p.name, look });
  },
  onQuest(data) {
    quests.setState(data);
  },
  onFx(data) {
    quests.onFx(data, state.selfId, groundY());
  },
  onHand({ holding }) {
    if (holding !== state.holding) toast(holding ? '💕 Đã nắm tay nhau' : 'Đã buông tay');
    setHolding(holding);
  },
});

const quests = createQuests({
  net, toast, panelEl: $('quest-panel'), actBtn: $('btn-act'), getSelfId: () => state.selfId, getHolding: () => state.holding,
});

// ---------- Điều khiển ----------
async function toggleHand() {
  if (!state.joined) return;
  const res = await net.toggleHand(!state.holding);
  if (!res.ok) toast(res.error);
}

const input = createInput({
  chatInput, btnLeft: $('btn-left'), btnRight: $('btn-right'), btnAct: $('btn-act'),
  onHand: toggleHand,
  onAct: () => state.joined && quests.interact(),
  onActUp: () => quests.release(),
  onFocusChat: () => chatInput.focus(),
  isBlocked: () => lookScreen.isOpen(),
});

btnHand.addEventListener('click', toggleHand);

$('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  net.sendChat(text);
  chatInput.value = '';
});

$('copy-link').addEventListener('click', async () => {
  const link = `${location.origin}/?room=${state.roomCode}`;
  try {
    await navigator.clipboard.writeText(link);
    toast('💌 Đã sao chép link, gửi cho người ấy nhé!');
  } catch {
    window.prompt('Sao chép link này gửi cho người ấy:', link);
  }
});

$('leave-room').addEventListener('click', () => {
  if (!window.confirm('Rời phòng đi dạo này?')) return;
  net.leave();
  state.joined = false;
  state.selfId = null;
  state.players.clear();
  setHolding(false);
  lastSent = null;
  showJoinScreen();
});

const lookScreen = setupLookScreen({ net, getSelf: self });
setupJoinScreen({
  net,
  onJoined(res, roomCode, solo) {
    state.roomCode = roomCode;
    state.joined = true;
    $('copy-link').hidden = solo; // chơi 1 người thì không có ai để mời
    enterRoom(res);
    if (solo) toast('🤖 Chế độ 1 người: Bot sẽ phối hợp làm nhiệm vụ cùng bạn', 3500);
  },
});

// ---------- Cập nhật ----------
let sendTimer = 0;
let lastSent = null;
let lastSentAt = 0;
let introTime = 0;

function updateLocal(dt) {
  const me = self();
  if (!me) return;
  const axis = input.axis();
  me.walking = axis !== 0;
  if (axis) {
    me.x += axis * WALK_SPEED * dt;
    me.dir = axis;
  }

  // Nắm tay: mình đứng yên thì được kéo theo người kia (thử thách nắm tay thì không: mỗi người tự đi)
  const p = partner();
  if (state.holding && p && !axis && !quests.handChallenge()) {
    const gap = me.x - p.renderX;
    if (Math.abs(gap) > HOLD_DISTANCE) {
      me.x = p.renderX + Math.sign(gap) * HOLD_DISTANCE;
      me.walking = true;
      me.dir = p.dir;
    }
  }
  // Không đi qua chắn đường của nhiệm vụ chưa xong
  me.x = Math.max(EDGE, Math.min(WORLD_WIDTH - EDGE, quests.maxX(), me.x));
  quests.update(me, p, axis > 0);

  sendTimer += dt;
  if (sendTimer < 1 / SEND_RATE) return;
  sendTimer = 0;
  const msg = { x: Math.round(me.x * 10) / 10, dir: me.dir, walking: me.walking };
  const changed = !lastSent || msg.x !== lastSent.x || msg.dir !== lastSent.dir || msg.walking !== lastSent.walking;
  const now = performance.now();
  if (changed || now - lastSentAt > HEARTBEAT_MS) {
    net.sendMove(msg);
    lastSent = msg;
    lastSentAt = now;
  }
}

function cameraX(dt) {
  const maxCam = Math.max(0, WORLD_WIDTH - view.w);
  const me = self();
  if (!me) {
    // Chưa vào phòng: máy quay lướt chậm qua lại trên cảnh
    introTime += dt;
    return ((1 - Math.cos(introTime * 0.04)) / 2) * maxCam;
  }
  if (view.w >= WORLD_WIDTH) return (WORLD_WIDTH - view.w) / 2;
  return Math.max(0, Math.min(maxCam, me.renderX - view.w / 2));
}

// ---------- Vẽ ----------
function render(camX, t, now) {
  const gy = groundY();
  drawWorld(ctx, view, camX, gy, t, quests.index);

  const me = self();
  const p = partner();
  const inWorld = (fn) => { ctx.save(); ctx.translate(-camX, 0); fn(); ctx.restore(); };
  inWorld(() => quests.draw(ctx, gy, t, me, p));

  const players = [...state.players.values()].sort((a, b) => (a.isLocal ? 1 : 0) - (b.isLocal ? 1 : 0));
  for (const pl of players) {
    const other = pl === me ? p : me;
    const reach = state.holding && other ? (other.renderX - pl.renderX) / 2 : null;
    pl.draw(ctx, pl.renderX - camX, gy, t, reach);
  }
  inWorld(() => quests.drawFront(ctx, gy, me, p)); // vật cầm trên tay vẽ trước mặt nhân vật

  if (state.holding && me && p) {
    const mid = (me.renderX + p.renderX) / 2 - camX;
    heart(ctx, mid, gy - 92 + Math.sin(t * 3) * 3, 14);
  }

  if (state.joined) quests.drawOverlay(ctx, camX, view, gy, me, p);
  for (const pl of players) {
    if (pl.bubble) drawBubble(ctx, pl.bubble, pl.renderX - camX, pl.headTopY(gy), now);
  }

  drawForeground(ctx);
}

let lastTime = performance.now();
function frame(now) {
  // Giới hạn dt để không "dịch chuyển tức thời" khi quay lại tab
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (state.joined) updateLocal(dt);
  for (const pl of state.players.values()) pl.update(dt);
  updateWorld(dt, view);

  render(cameraX(dt), now / 1000, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
