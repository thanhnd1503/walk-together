// Nhiệm vụ cảnh 2: Cầu Tình Yêu. Toạ độ viết theo BRIDGE + khoảng cách từ đầu cảnh

export const BRIDGE = 6100;

export const BRIDGE_QUESTS = [
  {
    id: 'blueprint', scene: 'bridge', type: 'blueprint',
    title: 'Lấy gỗ tốt',
    hint: 'Một người xem bản vẽ ở bảng gỗ và nhắn tin, người kia nhặt',
    goal: 3, count: 10, good: 4, range: [BRIDGE + 210, BRIDGE + 790], minGap: 38,
    boardX: BRIDGE + 145,
    // Mốc để mô tả vị trí ván khi nhắn tin; `words` là từ khoá (không dấu) bot hiểu
    landmarks: [
      { id: 'stone', name: 'Hòn đá', icon: '🪨', x: BRIDGE + 300, words: ['da'] },
      { id: 'lantern', name: 'Đèn lồng', icon: '🏮', x: BRIDGE + 490, words: ['den', 'long'] },
      { id: 'jar', name: 'Chum nước', icon: '🏺', x: BRIDGE + 680, words: ['chum', 'lu'] },
    ],
  },
  {
    id: 'carry', scene: 'bridge', type: 'carry',
    title: 'Cùng khiêng ván',
    hint: 'Mỗi người đứng một đầu, ✋ cùng lúc để nâng, đi cùng nhịp ra đầu cầu',
    goal: 3, pileX: BRIDGE + 160, deliverX: BRIDGE + 790, minGap: 45, maxGap: 125, reach: 70,
  },
  {
    id: 'tie', scene: 'bridge', type: 'tie',
    title: 'Buộc lạt tre',
    hint: 'Một người nhấn GIỮ ✋ để giữ ván, người kia bấm ✋ khi kim vào vùng xanh',
    goal: 4, sweepMs: 1600, speedUp: 0.12, zone: [0.4, 0.6],
    targets: [{ id: 'hold', x: BRIDGE + 765 }, { id: 'tie', x: BRIDGE + 825 }],
  },
  {
    id: 'koi', scene: 'bridge', type: 'fishing',
    title: 'Câu cá koi',
    hint: 'Người cầm cần chỉ thấy phao; người kia thấy cá dưới nước, cá koi cắn câu thì bấm ✋ hô "Giật!"',
    fishX: BRIDGE + 1000, spawnX: BRIDGE + 900, goal: 3, reach: 40,
    waitMs: [1800, 3600], biteMs: 1300,
    nibbleChance: 0.45, // cá con rỉa mồi: phao cũng nhúc nhích y hệt, giật lúc đó là −1
    nibblePenalty: 1,
    levels: {
      easy: { nibbleChance: 0.25, biteMs: 1700, nibblePenalty: 0 },
      hard: { nibbleChance: 0.6, biteMs: 1000 },
    },
  },
  {
    id: 'cross', scene: 'bridge', type: 'holdWalk',
    title: 'Nắm tay qua cầu',
    hint: 'Nắm tay nhau đi sang bờ bên kia',
    goalX: BRIDGE + 1300,
  },
  {
    id: 'together', scene: 'bridge', type: 'together',
    title: 'Tâm đầu ý hợp',
    hint: 'Không nhắn tin! Mỗi người tự tới biển mình thích rồi ✋. Chọn giống nhau là +1',
    // Gần nhau để màn hình điện thoại hẹp vẫn thấy đủ ba biển
    posts: [BRIDGE + 1470, BRIDGE + 1556, BRIDGE + 1642], spawnX: BRIDGE + 1400,
    goal: 4, revealMs: 2600, missPenalty: 0,
    questions: [
      ['Cuối tuần đi chơi ở đâu?', '🏖️ Biển', '⛰️ Núi', '🏠 Ở nhà'],
      ['Ăn khuya món gì?', '🍜 Phở', '🥖 Bánh mì', '🍢 Ăn vặt'],
      ['Uống gì đây?', '🧋 Trà sữa', '☕ Cà phê', '🥥 Nước dừa'],
      ['Nuôi con gì?', '🐶 Chó', '🐱 Mèo', '🐰 Thỏ'],
      ['Hẹn hò ở đâu?', '🎬 Rạp phim', '☕ Quán quen', '🌳 Công viên'],
      ['Mùa đẹp nhất?', '🌸 Xuân', '☀️ Hạ', '🍂 Thu'],
      ['Lúc nào đẹp nhất?', '🌅 Bình minh', '🌇 Hoàng hôn', '🌙 Đêm sao'],
      ['Tráng miệng món gì?', '🍨 Kem', '🍮 Bánh flan', '🍧 Chè'],
      ['Đi phượt bằng gì?', '🛵 Xe máy', '🚂 Tàu hoả', '✈️ Máy bay'],
      ['Ngày mưa làm gì?', '🛌 Ngủ nướng', '🎮 Chơi game', '🍲 Nấu lẩu'],
      ['Quà tặng thích nhất?', '💐 Hoa', '💌 Thư tay', '🧸 Gấu bông'],
      ['Màu của tụi mình?', '💗 Hồng', '💙 Xanh', '💜 Tím'],
    ],
    levels: {
      easy: { goal: 3 },
      hard: { goal: 5, missPenalty: 1 },
    },
  },
  {
    id: 'umbrella', scene: 'bridge', type: 'umbrella', hand: true,
    title: 'Chung ô dưới mưa',
    hint: 'Nắm tay đi tới vạch Đích; người không cầm ô phải đứng sát dưới ô, ướt quá là về vạch',
    startX: BRIDGE + 1850, goalX: BRIDGE + 2450, spawnX: BRIDGE + 1780,
    cover: 42, wetMax: 2.5, dryRate: 0.5, // số giây đứng ngoài ô thì ướt sũng; vào lại ô thì khô dần
    windMax: 18, windEveryMs: [2500, 4500], // gió làm ô nghiêng, chỗ che lệch sang một bên
    levels: {
      easy: { wetMax: 4, windMax: 0 },
      hard: { wetMax: 1.6, windMax: 30, windEveryMs: [1500, 3000] },
    },
  },
  {
    id: 'stones', scene: 'bridge', type: 'stack',
    title: 'Xếp đá cầu may',
    hint: 'Thay phiên thả đá (✋) lúc đá đung đưa ngay trên chồng đá; người kia nhấn GIỮ ✋ để đá chậm lại',
    pileX: BRIDGE + 2650, spawnX: BRIDGE + 2560, reach: 120, goal: 5,
    swingMs: 1600, swingAmp: 40, steadySlow: 0.4, tolerance: 14,
    speedUp: 0.06, // mỗi viên xếp được, đá đung đưa nhanh hơn
    maxMisses: 3, // rơi quá số viên thì cả chồng đổ
    levels: {
      easy: { goal: 4, tolerance: 20, maxMisses: 0 },
      hard: { goal: 6, tolerance: 11, speedUp: 0.1, maxMisses: 2 },
    },
  },
  {
    id: 'sap', scene: 'bridge', type: 'sap', hand: true,
    title: 'Nhảy sạp',
    hint: 'Nắm tay đứng giữa sạp; mỗi lần sạp KHÉP "cạch!" cả hai cùng bấm ✋ để nhảy',
    startX: BRIDGE + 2950, spawnX: BRIDGE + 2850, goal: 8,
    beatMs: 700, jumpWindowMs: 260, speedUp: 0.04, missPenalty: 2,
    pattern: ['open', 'open', 'close'],
    breakChance: 0.15, // nhịp lỡ: thỉnh thoảng sạp khép sớm hơn bình thường
    levels: {
      easy: { goal: 6, beatMs: 800, jumpWindowMs: 320, breakChance: 0, missPenalty: 1 },
      hard: { goal: 10, beatMs: 620, jumpWindowMs: 220, breakChance: 0.3, missPenalty: 99 },
    },
  },
  {
    id: 'lock', scene: 'bridge', type: 'lock',
    title: 'Khoá tình yêu',
    hint: 'Mỗi người chỉ xoay được 2 ô nhưng chỉ biết mã ô của người kia: nhắn cho nhau rồi cùng ✋ ở ổ khoá',
    dials: [BRIDGE + 3250, BRIDGE + 3310, BRIDGE + 3420, BRIDGE + 3480], lockX: BRIDGE + 3365, spawnX: BRIDGE + 3170,
    lockRadius: 60,
    // `words`: từ khoá không dấu để bot hiểu tin nhắn
    symbols: [
      { icon: '❤️', name: 'Tim', words: ['tim', 'heart'] },
      { icon: '⭐', name: 'Sao', words: ['sao', 'star'] },
      { icon: '🌸', name: 'Hoa', words: ['hoa'] },
      { icon: '🌙', name: 'Trăng', words: ['trang', 'moon'] },
      { icon: '🦋', name: 'Bướm', words: ['buom'] },
    ],
    feedback: 'count', // khoá sai: báo số ô đúng ('each' = báo từng ô, 'none' = không báo)
    maxTries: 0, // sai quá số lần thì đổi mã (0 = không đổi)
    levels: {
      easy: { feedback: 'each' },
      hard: { feedback: 'none', maxTries: 3 },
    },
  },
];
