// Trình tạo nhân vật: chọn Nam/Nữ, khung xem trước + các lựa chọn ngoại hình
import { GENDERS, lookOptionsFor, sanitizeLook } from '/shared/constants.js';
import { PALETTE, OUTFIT_HEX, HAIR_HEX, SKIN_HEX } from './palette.js';
import { drawCharacter } from './character.js';

const PREVIEW_W = 140;
const PREVIEW_H = 170;
const PREVIEW_SCALE = 1.6;

const GENDER_LABELS = { female: '👧 Nữ', male: '👦 Nam' };

const CATEGORIES = [
  {
    key: 'skin', label: 'Màu da', swatch: SKIN_HEX,
    names: { fair: 'Trắng hồng', ivory: 'Trắng ngà', honey: 'Bánh mật', tan: 'Ngăm' },
  },
  {
    key: 'hair', label: 'Kiểu tóc',
    names: {
      long: 'Dài thẳng', bob: 'Ngang vai', ponytail: 'Đuôi ngựa', bun: 'Búi củ tỏi', braid: 'Tết bím',
      short: 'Ngắn gọn', sidePart: 'Mái lệch', spiky: 'Vuốt dựng', buzz: 'Húi cua', mushroom: 'Tóc nấm',
    },
  },
  {
    key: 'hairColor', label: 'Màu tóc', swatch: HAIR_HEX,
    names: { black: 'Đen tuyền', darkBrown: 'Nâu đen', chestnut: 'Hạt dẻ', ash: 'Nâu khói', honey: 'Nâu mật ong' },
  },
  {
    key: 'eyes', label: 'Đôi mắt',
    names: { dot: 'Tròn xoe', monolid: 'Một mí', happy: 'Cười híp', sparkle: 'Lấp lánh' },
  },
  {
    key: 'outfit', label: 'Trang phục',
    names: {
      aoDai: 'Áo dài', baBa: 'Áo bà ba', dress: 'Váy liền', tshirtSkirt: 'Thun + chân váy',
      tshirtJeans: 'Thun + quần jean', shirtPants: 'Sơ mi công sở', hoodie: 'Áo hoodie', jersey: 'Áo đội tuyển',
    },
  },
  {
    key: 'outfitColor', label: 'Màu áo', swatch: OUTFIT_HEX,
    names: {
      white: 'Trắng nữ sinh', pink: 'Hồng phấn', red: 'Đỏ', yellow: 'Vàng', huePurple: 'Tím Huế',
      jade: 'Xanh ngọc', blue: 'Xanh trời', cream: 'Kem',
    },
  },
  {
    key: 'accessory', label: 'Phụ kiện',
    names: {
      none: 'Không có', nonLa: 'Nón lá', bow: 'Nơ xinh', flower: 'Kẹp hoa', glasses: 'Kính tròn',
      helmet: 'Mũ bảo hiểm', cap: 'Mũ lưỡi trai', khanDong: 'Khăn đóng',
    },
  },
];

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function createEditor({ previewEl, optionsEl, look }) {
  let current = sanitizeLook(look);
  let dir = 1;
  const refreshers = [];
  const options = () => lookOptionsFor(current.gender);

  // ---------- Xem trước ----------
  const canvas = el('canvas', { className: 'look-preview', title: 'Chạm để xoay người' });
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = PREVIEW_W * dpr;
  canvas.height = PREVIEW_H * dpr;
  canvas.style.width = `${PREVIEW_W}px`;
  canvas.style.height = `${PREVIEW_H}px`;
  canvas.addEventListener('click', () => {
    dir = -dir;
  });

  // Ngẫu nhiên trong phạm vi giới tính đang chọn
  const randomBtn = el('button', { type: 'button', className: 'small', textContent: '🎲 Ngẫu nhiên' });
  randomBtn.addEventListener('click', () => {
    const look = { gender: current.gender };
    for (const [key, list] of Object.entries(options())) {
      look[key] = list[Math.floor(Math.random() * list.length)];
    }
    setLook(look);
  });
  previewEl.append(canvas, randomBtn);

  function renderPreview(now) {
    // Chỉ vẽ khi đang hiển thị trên màn hình
    if (previewEl.offsetParent !== null) {
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      ctx.fillStyle = PALETTE.blossom;
      ctx.beginPath();
      ctx.ellipse(PREVIEW_W / 2, PREVIEW_H - 18, 52, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(PREVIEW_W / 2, PREVIEW_H - 20);
      ctx.scale(PREVIEW_SCALE, PREVIEW_SCALE);
      drawCharacter(ctx, current, { dir, bounce: Math.sin(t * 2.5) * 1.2, step: t * 3 });
    }
    requestAnimationFrame(renderPreview);
  }
  requestAnimationFrame(renderPreview);

  // ---------- Nam / Nữ ----------
  const genderRow = el('div', { className: 'gender-toggle', role: 'radiogroup' });
  for (const gender of GENDERS) {
    const b = el('button', { type: 'button', textContent: GENDER_LABELS[gender] });
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => {
      // Đổi giới tính: kiểu tóc/trang phục/phụ kiện không hợp sẽ về mặc định
      if (gender !== current.gender) setLook({ ...current, gender });
    });
    genderRow.append(b);
  }
  refreshers.push(() => {
    [...genderRow.children].forEach((b, i) => {
      const on = GENDERS[i] === current.gender;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', String(on));
    });
  });
  optionsEl.append(genderRow);

  // ---------- Các lựa chọn ----------
  for (const cat of CATEGORIES) {
    let control;

    if (cat.swatch) {
      // Bảng màu dùng chung cho cả nam và nữ
      const values = options()[cat.key];
      control = el('div', { className: 'swatches' });
      for (const value of values) {
        const b = el('button', { type: 'button', title: cat.names[value] });
        b.style.background = cat.swatch[value];
        b.setAttribute('aria-label', `${cat.label}: ${cat.names[value]}`);
        b.addEventListener('click', () => update(cat.key, value));
        control.append(b);
      }
      refreshers.push(() => {
        [...control.children].forEach((b, i) => b.classList.toggle('selected', values[i] === current[cat.key]));
      });
    } else {
      const name = el('span', { className: 'cycler-name' });
      const shift = (d) => {
        const list = options()[cat.key];
        const i = list.indexOf(current[cat.key]);
        update(cat.key, list[(i + d + list.length) % list.length]);
      };
      const prev = el('button', { type: 'button', textContent: '◀', ariaLabel: `${cat.label} trước` });
      const next = el('button', { type: 'button', textContent: '▶', ariaLabel: `${cat.label} sau` });
      prev.addEventListener('click', () => shift(-1));
      next.addEventListener('click', () => shift(1));
      control = el('div', { className: 'cycler' }, [prev, name, next]);
      refreshers.push(() => {
        name.textContent = cat.names[current[cat.key]];
      });
    }

    optionsEl.append(el('div', { className: 'opt-row' }, [
      el('span', { className: 'opt-label', textContent: cat.label }),
      control,
    ]));
  }

  function update(key, value) {
    current = { ...current, [key]: value };
    refresh();
  }

  function refresh() {
    for (const r of refreshers) r();
  }

  function setLook(look) {
    current = sanitizeLook(look);
    refresh();
  }

  refresh();
  return { getLook: () => ({ ...current }), setLook };
}
