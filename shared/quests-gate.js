// Nhiệm vụ cảnh 1: Cổng Hoa Đào (0 – 6100). Xem chú thích các kiểu nhiệm vụ ở shared/quests.js

export const GATE_QUESTS = [
  {
    id: 'petals', scene: 'gate', type: 'catch',
    title: 'Hứng cánh hoa phát sáng',
    hint: 'Hứng hoa hồng 🌸 (+1), hoa vàng ✨ (+3), né lá khô 🍂 (−1). Coi chừng gió thổi xéo!',
    goal: 15, range: [200, 1350],
    spawnMs: 420, fallMs: 4200, badRatio: 0.8,
    spreadX: 320, // rơi quanh vị trí hai người
    goldRatio: 0.06, goldFallMs: 2200, // cánh hoa vàng +3, rơi rất nhanh
    windMax: 30, windEveryMs: [3500, 6000], // gió thổi vật rơi bay xéo (đơn vị/giây)
    levels: {
      easy: { badRatio: 0.65, goldRatio: 0.1, windMax: 0, hint: 'Hứng hoa hồng 🌸 (+1), hoa vàng ✨ (+3), né lá khô 🍂 (−1)' },
      hard: { badRatio: 0.85, fallMs: 3600, goldRatio: 0.05, windMax: 60 },
    },
  },
  {
    id: 'statue', scene: 'gate', type: 'statue', hand: true,
    title: 'Một, hai, ba… đứng im!',
    hint: 'Nắm tay đi tới cây đào già. Cây hô "Đứng im!" thì không được nhúc nhích',
    startX: 1450, goalX: 2050, treeX: 2120, spawnX: 1330,
    goMs: [2200, 4500], chantMs: 1500, freezeMs: 2000, graceMs: 350, moveTolerance: 5,
    fakeChance: 0.25, // hô "Một… hai…" rồi quay luôn, không đợi "ba"
    rush: 0.45, // càng gần đích cây hô càng nhanh (giảm tối đa 45% thời gian)
    levels: {
      easy: { fakeChance: 0, rush: 0 },
      hard: { fakeChance: 0.45, rush: 0.6, freezeMs: 2500 },
    },
  },
  {
    id: 'leafwalk', scene: 'gate', type: 'leafWalk', hand: true,
    title: 'Nắm tay né lá khô',
    hint: 'Nắm tay đi qua rừng lá. Ai bị lá rơi trúng là cả hai về vạch',
    startX: 2250, endX: 2850, spawnX: 2140, spawnMs: 560, fallMs: 3200, hitRadius: 18,
    spawnAhead: [-120, 460], // lá rơi chủ yếu ở phía trước hướng đi, phải canh lúc đi lúc dừng
    clusterChance: 0.25, // chùm 3 lá rơi cùng lúc
    rush: 0.3, // lá rơi nhanh dần khi gần đích
    levels: {
      easy: { spawnMs: 700, clusterChance: 0, rush: 0 },
      hard: { spawnMs: 480, clusterChance: 0.45, rush: 0.45 },
    },
  },
  {
    id: 'blindgoat', scene: 'gate', type: 'blindGoat',
    title: 'Bịt mắt bắt dê',
    hint: 'Người bịt mắt không thấy gì; người kia bấm nút ra hiệu dẫn đường để bắt dê',
    area: [2980, 3540], spawnX: 2930, goal: 3,
    grabRadius: 40, goatSpeed: 55, wanderMs: [1500, 3000],
    fleeRadius: 70, fleeSpeed: 95, // người bịt mắt lại gần thì dê giật mình chạy
    decoys: 1, // dê bù nhìn: chộp nhầm bị −1
    levels: {
      easy: { fleeRadius: 0, decoys: 0 },
      hard: { fleeRadius: 110, fleeSpeed: 110, decoys: 2 },
    },
  },
  {
    id: 'bells', scene: 'gate', type: 'sync', object: 'bell',
    title: 'Cùng rung chuông gió',
    hint: 'Mỗi người đứng dưới một chuông, rung cùng lúc',
    // Gần nhau để màn hình điện thoại hẹp (~420 đơn vị) đứng dưới chuông này vẫn thấy chuông kia
    targets: [{ id: 'bellA', x: 3680 }, { id: 'bellB', x: 3850 }],
    spawnX: 3560,
  },
  {
    id: 'nemcon', scene: 'gate', type: 'nemcon',
    title: 'Ném còn',
    hint: 'Người ném GIỮ ✋ lấy lực, thả tay ở vùng xanh; người kia thấy vòng, bấm "Hô ném" lúc vòng về giữa',
    throwX: 4000, poleX: 4100, spawnX: 3930, goal: 3, throwRadius: 40,
    chargeMs: 1500, powerZone: [0.55, 0.85], ringPeriodMs: 2600, ringZone: 0.3,
    ringSpeedUp: 0.85, // mỗi lần lọt, vòng chạy nhanh hơn (chu kỳ × hệ số)
    windMax: 0.35, // gió làm điểm cần hô lệch khỏi giữa cột (−1 … 1), chỉ người hô thấy
    levels: {
      easy: { ringSpeedUp: 1, windMax: 0 },
      hard: { ringSpeedUp: 0.75, windMax: 0.55, powerZone: [0.6, 0.82] },
    },
  },
  {
    id: 'memory', scene: 'gate', type: 'memory',
    title: 'Lật thẻ hoa',
    hint: 'Thay phiên mỗi người lật một thẻ; hai thẻ liền nhau trùng hoa thì giữ lại',
    slotStart: 4230, slotGap: 46, spawnX: 4170, showMs: 1400,
    pairs: 5, maxMisses: 6, // lật sai quá số lần thì xáo lại các thẻ còn úp
    flowers: [
      { id: 'dao', icon: '🌸', name: 'Hoa đào' },
      { id: 'sun', icon: '🌻', name: 'Hướng dương' },
      { id: 'tulip', icon: '🌷', name: 'Tulip' },
      { id: 'hibiscus', icon: '🌺', name: 'Dâm bụt' },
      { id: 'rose', icon: '🌹', name: 'Hoa hồng' },
      { id: 'daisy', icon: '🌼', name: 'Hoa cúc' },
    ],
    levels: {
      easy: { pairs: 4, maxMisses: 0 },
      hard: { pairs: 6, maxMisses: 4, showMs: 1000 },
    },
  },
  {
    id: 'tug', scene: 'gate', type: 'tug', hand: true,
    title: 'Kéo co Hò dô ta',
    hint: 'Nắm tay đứng ở vạch; khi hiện "DÔ!" cả hai bấm ✋ cùng lúc',
    startX: 4820, opponentX: 5000, spawnX: 4740,
    cueGapMs: [1400, 2400], cueWindowMs: 1000, syncMs: 400, step: 0.25, slip: 0.1,
    fakeChance: 0.2, // hô "DỐ!" giả: bấm là bị kéo lại
    rush: 0.35, // càng kéo gần thắng, nhịp hô càng nhanh và cửa sổ bấm càng hẹp
    levels: {
      easy: { fakeChance: 0, rush: 0 },
      hard: { fakeChance: 0.35, rush: 0.45, cueWindowMs: 850, syncMs: 330, step: 0.2 },
    },
  },
  {
    id: 'cadao', scene: 'gate', type: 'cadao',
    title: 'Ghép câu ca dao',
    hint: 'Một người biết câu; thay phiên nhau chạm đèn lồng đúng thứ tự chữ',
    spawnX: 5150,
    slots: [5250, 5312, 5374, 5436, 5498, 5560, 5622, 5684],
    // Mỗi câu không lặp chữ; số chữ + số chữ mồi = số đèn
    verses: [
      'Thương nhau củ ấu cũng tròn',
      'Yêu nhau mấy núi cũng trèo',
      'Tay nâng chén muối đĩa gừng',
      'Gừng cay muối mặn xin đừng quên nhau',
      'Đôi ta như lửa mới nhen',
    ],
    decoys: ['trăng', 'gió', 'mây', 'hoa', 'sông', 'thuyền', 'đò', 'mưa'],
    decoyCount: 2, similarDecoys: 1, slotGap: 58, // số chữ mồi; bao nhiêu chữ mồi là chữ gần giống
    levels: {
      easy: { similarDecoys: 0 },
      hard: { decoyCount: 4, similarDecoys: 4 },
    },
  },
  {
    id: 'photo', scene: 'gate', type: 'photo',
    title: 'Chụp ảnh kỷ niệm',
    hint: 'Nắm tay đứng trong khung ảnh rồi cùng bấm ✋',
    frameX: 5880, frameHalf: 55, spawnX: 5760,
  },
];
