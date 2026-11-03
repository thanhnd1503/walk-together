// Màn hình vào phòng và bảng thay đồ
import { ROOM_CODE_PATTERN, sanitizeLook } from '/shared/constants.js';
import { createEditor } from './customize.js';
import { toast } from './ui.js';

const PREFS_KEY = 'walk.prefs';
const $ = (id) => document.getElementById(id);

function getClientId() {
  // sessionStorage: mỗi tab là một người, tải lại trang vẫn giữ nguyên
  let id = sessionStorage.getItem('walk.clientId');
  if (!id) {
    id = crypto.randomUUID?.() ?? String(Math.random()).slice(2);
    sessionStorage.setItem('walk.clientId', id);
  }
  return id;
}

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function loadPrefs() {
  const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  prefs.look = sanitizeLook(prefs.look);
  return prefs;
}

function savePrefs(patch) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
}

export function setupJoinScreen({ net, onJoined }) {
  const prefs = loadPrefs();
  const nameInput = $('name-input');
  const roomInput = $('room-input');
  const errorEl = $('join-error');
  nameInput.value = prefs.name ?? '';
  roomInput.value = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? prefs.room ?? '';

  const editor = createEditor({ previewEl: $('join-preview'), optionsEl: $('join-options'), look: prefs.look });

  $('random-room').addEventListener('click', () => {
    roomInput.value = randomRoomCode();
  });

  $('join-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const roomCode = roomInput.value.trim().toUpperCase();
    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      errorEl.textContent = 'Mã phòng chỉ gồm 3–8 chữ cái hoặc số.';
      return;
    }
    errorEl.textContent = '';
    const submitBtn = e.submitter;
    if (submitBtn) submitBtn.disabled = true;

    const look = editor.getLook();
    const solo = $('solo-input').checked;
    const res = await net.join({ roomCode, name, look, solo, clientId: getClientId() });
    if (submitBtn) submitBtn.disabled = false;
    if (!res.ok) {
      errorEl.textContent = res.error;
      return;
    }

    savePrefs({ name, room: roomCode, look });
    history.replaceState(null, '', `?room=${roomCode}`);
    $('join-screen').hidden = true;
    $('hud').hidden = false;
    document.activeElement?.blur();
    onJoined(res, roomCode, solo);
  });
}

export function showJoinScreen() {
  history.replaceState(null, '', location.pathname);
  $('hud').hidden = true;
  $('join-screen').hidden = false;
}

export function setupLookScreen({ net, getSelf }) {
  const screen = $('look-screen');
  const editor = createEditor({ previewEl: $('look-preview'), optionsEl: $('look-options'), look: loadPrefs().look });
  const close = () => {
    screen.hidden = true;
  };

  $('edit-look').addEventListener('click', () => {
    const me = getSelf();
    if (me) editor.setLook(me.look);
    screen.hidden = false;
  });
  $('look-cancel').addEventListener('click', close);
  $('look-save').addEventListener('click', () => {
    const look = editor.getLook();
    const me = getSelf();
    if (me) me.setInfo({ name: me.name, look });
    net.sendLook(look);
    savePrefs({ look });
    close();
    toast('✨ Đã thay đồ mới!');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !screen.hidden) close();
  });

  return { isOpen: () => !screen.hidden };
}
