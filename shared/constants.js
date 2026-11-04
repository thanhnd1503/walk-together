// Hằng số dùng chung cho client và server

export const WORLD_WIDTH = 8100;

export const WALK_SPEED = 130; // px/giây
export const SEND_RATE = 15; // lần/giây
export const HEARTBEAT_MS = 1000;

export const HOLD_DISTANCE = 56; // đủ gần để nắm tay, cũng là khoảng cách khi đang nắm
export const HOLD_BREAK = 180; // server tự buông tay nếu xa hơn (phòng khi mạng trễ)

export const MAX_PLAYERS = 2;
export const NAME_MAX = 16;
export const CHAT_MAX = 120;
export const CHAT_COOLDOWN_MS = 400;
export const CHAT_SHOW_MS = 6000;

export const ROOM_CODE_PATTERN = /^[A-Z0-9]{3,8}$/;

export const LOOK_CHANGE_COOLDOWN_MS = 300;

export const GENDERS = ['female', 'male'];

// Các lựa chọn ngoại hình, tập trung tạo hình người Việt.
// Phần tử đầu tiên là mặc định.
export const LOOK_OPTIONS = {
  common: {
    skin: ['fair', 'ivory', 'honey', 'tan'],
    hairColor: ['black', 'darkBrown', 'chestnut', 'ash', 'honey'],
    eyes: ['dot', 'monolid', 'happy', 'sparkle'],
    outfitColor: ['white', 'pink', 'red', 'yellow', 'huePurple', 'jade', 'blue', 'cream'],
  },
  female: {
    hair: ['long', 'bob', 'ponytail', 'bun', 'braid'],
    outfit: ['aoDai', 'baBa', 'dress', 'tshirtSkirt', 'tshirtJeans', 'jersey'],
    accessory: ['none', 'nonLa', 'bow', 'flower', 'glasses', 'helmet'],
  },
  male: {
    hair: ['short', 'sidePart', 'spiky', 'buzz', 'mushroom'],
    outfit: ['tshirtJeans', 'shirtPants', 'aoDai', 'baBa', 'hoodie', 'jersey'],
    accessory: ['none', 'nonLa', 'cap', 'glasses', 'helmet', 'khanDong'],
  },
};

export function lookOptionsFor(gender) {
  return { ...LOOK_OPTIONS.common, ...LOOK_OPTIONS[gender] };
}

// Giá trị lạ, thiếu hoặc không hợp giới tính thì thay bằng mặc định
export function sanitizeLook(look) {
  const gender = GENDERS.includes(look?.gender) ? look.gender : GENDERS[0];
  const clean = { gender };
  for (const [key, options] of Object.entries(lookOptionsFor(gender))) {
    clean[key] = options.includes(look?.[key]) ? look[key] : options[0];
  }
  return clean;
}

export const EVENTS = {
  JOIN: 'room:join',
  LEAVE: 'room:leave',
  STATE: 'room:state',
  LEFT: 'room:left',
  MOVE: 'player:move',
  LOOK: 'player:look',
  CHAT: 'player:chat',
  HAND: 'hand:toggle',
  QUEST: 'quest:state',
  COLLECT: 'quest:collect',
  INTERACT: 'quest:interact',
  FX: 'quest:fx',
};
