// Bàn phím + nút cảm ứng

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

export function createInput({ chatInput, btnLeft, btnRight, btnAct, onHand, onAct, onActUp, onFocusChat, isBlocked }) {
  const held = { left: false, right: false };
  const touch = { left: false, right: false };

  const typing = () => document.activeElement === chatInput;

  window.addEventListener('keydown', (e) => {
    if (typing()) {
      if (e.key === 'Escape') chatInput.blur();
      return;
    }
    if (document.activeElement?.tagName === 'INPUT' || isBlocked()) return; // đang ở màn hình khác
    if (LEFT_KEYS.has(e.key)) held.left = true;
    else if (RIGHT_KEYS.has(e.key)) held.right = true;
    else if ((e.key === 'h' || e.key === 'H') && !e.repeat) onHand();
    else if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !e.repeat) onAct();
    else if (e.key === 'Enter') {
      e.preventDefault();
      onFocusChat();
    } else return;
    e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    if (LEFT_KEYS.has(e.key)) held.left = false;
    if (RIGHT_KEYS.has(e.key)) held.right = false;
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') onActUp();
  });

  // Nút ✋: bấm là tương tác, nhấn giữ là giữ (vd: giữ ván), thả tay là buông
  btnAct.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btnAct.setPointerCapture?.(e.pointerId);
    onAct();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btnAct.addEventListener(ev, onActUp);
  btnAct.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mất focus cửa sổ thì thả hết phím, tránh nhân vật tự đi mãi
  window.addEventListener('blur', () => {
    held.left = held.right = touch.left = touch.right = false;
    onActUp();
    btnLeft.classList.remove('pressed');
    btnRight.classList.remove('pressed');
  });
  chatInput.addEventListener('focus', () => {
    held.left = held.right = false;
  });

  function bindTouch(btn, side) {
    const press = (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      touch[side] = true;
      btn.classList.add('pressed');
    };
    const release = () => {
      touch[side] = false;
      btn.classList.remove('pressed');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  bindTouch(btnLeft, 'left');
  bindTouch(btnRight, 'right');

  return {
    // -1 trái, 1 phải, 0 đứng yên
    axis() {
      if (isBlocked()) return 0;
      const l = held.left || touch.left;
      const r = held.right || touch.right;
      return (r ? 1 : 0) - (l ? 1 : 0);
    },
  };
}
