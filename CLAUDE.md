# CLAUDE.md — Đi Dạo Cùng Nhau 🌸

Game mini 2D online cho **2 người** (một cặp đôi) cùng đi dạo trên trình duyệt khi không thể gặp nhau.
Mục tiêu: **ấm áp, nhẹ nhàng, dễ thương**. Không có thắng thua, không áp lực.

---

## 1. Nguyên tắc sản phẩm

- **Chỉ 2 người / phòng.** Vào phòng bằng mã phòng (vd: `MAY123`). Không có người lạ.
- **Mở link là chơi**, không cài đặt, không đăng ký tài khoản. Chạy tốt trên **điện thoại và máy tính**.
- **Đơn giản trước, đẹp sau, nhiều tính năng sau cùng.** Mỗi tính năng phải chạy được trọn vẹn rồi mới làm tiếp.
- Toàn bộ chữ hiển thị cho người chơi bằng **tiếng Việt**.

## 2. Công nghệ (không đổi khi chưa hỏi người dùng)

| Phần | Lựa chọn |
|---|---|
| Client | HTML5 Canvas + **JavaScript thuần (ES modules)**, không framework, không bước build |
| Server | **Node.js 20** + Express (phục vụ file tĩnh) + **Socket.IO** (realtime) |
| Lưu trữ | File JSON trong `data/` (ở giai đoạn 3 có thể chuyển sang SQLite, phải hỏi trước) |
| Deploy | Render / Railway / Fly.io (chọn ở giai đoạn deploy) |

**Không thêm thư viện npm mới** khi chưa hỏi người dùng. Toàn bộ hình ảnh được **vẽ bằng code Canvas**, không dùng ảnh tải từ mạng.

## 3. Cấu trúc thư mục

```
Walk online/
├── CLAUDE.md
├── package.json
├── server/
│   ├── index.js          # Khởi động Express + Socket.IO
│   ├── rooms.js          # Quản lý phòng (tạo, vào, rời, tối đa 2 người)
│   ├── quests.js         # Logic nhiệm vụ chung (server là trọng tài), chia việc cho 2 file dưới
│   ├── challenges.js     # Thử thách Cổng Hoa Đào: người gỗ, né lá, ca dao, chụp ảnh (+ chia việc cho folk-games)
│   ├── folk-games.js     # Trò dân gian: lật thẻ hoa, kéo co (+ chia việc cho 2 file dưới)
│   ├── folk-goat.js      # Bịt mắt bắt dê (dê thật + dê bù nhìn, dê giật mình, nút ra hiệu)
│   ├── folk-nemcon.js    # Ném còn (lấy lực / hô ném, gió, vòng nhanh dần)
│   ├── challenge-utils.js # Hàm chung cho thử thách (nắm tay, đứng ở vạch, chia vai…)
│   ├── bridge-quests.js  # Nhiệm vụ Cầu Tình Yêu: lấy gỗ, khiêng ván, buộc lạt
│   ├── bridge-games.js   # Thử thách Cầu Tình Yêu: câu cá koi, tâm đầu ý hợp, khoá tình yêu (+ chia việc cho bridge-rhythm)
│   ├── bridge-rhythm.js  # Chung ô dưới mưa, xếp đá cầu may, nhảy sạp
│   ├── bot.js            # Bot cho chế độ 1 người (đi theo, phối hợp nhiệm vụ)
│   ├── bot-folk.js       # Bot chơi trò dân gian (làm theo / ra lệnh bằng tin nhắn)
│   ├── bot-bridge.js     # Bot chơi thử thách Cầu Tình Yêu
│   └── storage.js        # data/progress.json (tiến độ) + data/memories.json (ảnh kỷ niệm); DATA_DIR để đổi thư mục
├── public/
│   ├── index.html        # Màn hình vào phòng + canvas
│   ├── style.css
│   └── js/
│       ├── main.js       # Điểm vào, vòng lặp game
│       ├── net.js        # Mọi giao tiếp Socket.IO nằm ở đây
│       ├── input.js      # Bàn phím + nút cảm ứng
│       ├── player.js     # Trạng thái người chơi (vị trí, bong bóng chat)
│       ├── character.js  # Vẽ nhân vật chibi theo ngoại hình (look)
│       ├── character-head.js # Tóc, mặt, phụ kiện của nhân vật
│       ├── customize.js  # Trình tạo nhân vật: xem trước + lựa chọn
│       ├── world.js      # Nền chung (trời, đồi, đường) + gọi vẽ từng cảnh
│       ├── scenes/       # gate.js (Cổng Hoa Đào), bridge.js (Cầu Tình Yêu bờ tre + suối), bridge-far.js (bờ bên kia)
│       ├── quests.js     # Nhiệm vụ phía client: trạng thái, tương tác, bảng nhiệm vụ
│       ├── quest-view.js # Vẽ theo kiểu nhiệm vụ (vật rơi, khiêng ván, buộc lạt, mũi tên mép)
│       ├── quest-draw.js # Hàm vẽ vật thể nhiệm vụ (cánh hoa, chuông, ván, búa…)
│       ├── blueprint-map.js # Bản vẽ thu nhỏ cho người cầm bản vẽ
│       ├── challenge-client.js # Client của thử thách Cổng Hoa Đào (bảng nhiệm vụ, tương tác, thông báo)
│       ├── challenge-view.js   # Vẽ thử thách Cổng Hoa Đào + lớp phủ (cây hô, ảnh polaroid)
│       ├── challenge-draw.js   # Hình vẽ: vạch, cây đào già, đèn lồng chữ, khung ảnh, polaroid
│       ├── folk-view.js        # Vẽ trò dân gian + lớp phủ (màn hình bịt mắt, thanh lực, "DÔ!")
│       ├── folk-draw.js        # Hình vẽ: dê, khăn bịt mắt, cột còn, thẻ hoa, dây kéo co, bù nhìn
│       ├── bridge-client.js    # Client của thử thách Cầu Tình Yêu (bảng nhiệm vụ, ✋, thông báo, nhảy bật lên)
│       ├── bridge-view.js      # Vẽ thử thách Cầu Tình Yêu + lớp phủ ("Giật!", dải nhịp sạp)
│       ├── bridge-draw.js      # Hình vẽ: cần câu, cá, biển trả lời, ô, mưa, đá đung đưa, sạp tre, ô khoá số
│       ├── screens.js    # Màn hình vào phòng + bảng thay đồ
│       ├── draw.js       # Hàm vẽ dùng chung (bo góc, mây, hoa…)
│       ├── palette.js    # Bảng màu — mọi màu lấy từ đây
│       └── ui.js         # Chat bong bóng, emote, HUD
├── scripts/
│   └── check.js          # Dùng cho `npm run check`
├── shared/
│   ├── constants.js      # Hằng số dùng chung client/server (tốc độ, kích thước map, tên sự kiện)
│   ├── quests.js         # Cảnh, chắn đường, độ khó, hàm dùng chung cho nhiệm vụ
│   ├── quests-gate.js    # Danh sách nhiệm vụ cảnh 1
│   └── quests-bridge.js  # Danh sách nhiệm vụ cảnh 2 (toạ độ BRIDGE + offset)
└── data/                 # Dữ liệu lưu (đã gitignore)
```

Quy tắc: mỗi file **một trách nhiệm**, cố gắng **dưới ~300 dòng**. Lớn hơn thì tách.

## 4. Lệnh

```bash
npm install          # Cài phụ thuộc
npm run dev          # Chạy server có tự reload (node --watch), mở http://localhost:3456
npm start            # Chạy production
PORT=3457 npm run dev  # Đổi cổng nếu 3456 bị trùng (cổng 3000 đã bị Docker của dự án khác dùng)
npm run check        # Kiểm tra cú pháp toàn bộ file JS (node --check)
```

## 5. Kiến trúc mạng

- **Client tự di chuyển nhân vật của mình** (mượt, không trễ), gửi vị trí lên server ~**15 lần/giây**.
- **Server là trọng tài nhẹ**: kiểm tra dữ liệu hợp lệ (x trong giới hạn map, chat ≤ 120 ký tự, emote nằm trong danh sách), rồi chuyển cho người còn lại.
- Client **nội suy (lerp)** vị trí của người kia để nhìn mượt.
- **Nắm tay**: người đang đứng yên bị kéo theo người đang đi (giữ khoảng cách `HOLD_DISTANCE`). Người đang tự đi thì không bị kéo, tránh hai bên níu nhau đứng im.
- Mỗi tab có `clientId` riêng (sessionStorage). Vào lại phòng với cùng `clientId` sẽ thay chỗ cũ, tránh lỗi "phòng đầy" do kết nối ma.
- Tên sự kiện khai báo **một lần duy nhất** trong `shared/constants.js`, không viết chuỗi cứng rải rác.

Sự kiện chính:

| Sự kiện | Chiều | Dữ liệu |
|---|---|---|
| `room:join` | C → S | `{ roomCode, name, look, clientId, solo?, x? }` |
| `room:leave` | C → S | — |
| `room:state` | S → C | `{ players: [...] }` |
| `room:left` | S → C | `{ id }` |
| `player:move` | C ↔ S | `{ x, dir, walking }` |
| `player:chat` | C ↔ S | `{ text }` |
| `player:look` | C ↔ S | `{ look }` (thay đồ khi đang chơi) |
| `player:emote` | C ↔ S | `{ type }` |
| `hand:toggle` | C ↔ S | `{ holding }` |
| `quest:state` | S → C | `{ index, count, seerId, items: [{ id, x, kind?, age? }], plank: { x, carriers }, tie?: { holder, sweepAge }, ch?: {…trạng thái thử thách} }` — gửi riêng từng người |
| `quest:collect` | C → S | `{ itemId }` |
| `quest:interact` | C → S | `{ targetId }` — mục tiêu cố định (`bellA`), vật `item:<id>`, `plank`, hoặc buộc lạt `holdOn`/`holdOff`/`tie` |
| `quest:fx` | S → C | thử thách mới: `start`/`fail` (reason `moved`/`drop`/`leaf`) · `turn` · `lantern` · `photoWait`/`photoFail`/`photo` · `{ targetId, by }` rung chuông · `{ type: 'catch', by, kind, x }` +1/−1 · `lift`/`liftFail`/`lifted`/`drop`/`deliver` khiêng ván · `{ type: 'hold', by }` · `{ type: 'tie', ok, reason?, x }` |

Mất kết nối thì client **tự kết nối lại** và vào lại phòng cũ, không làm người chơi mất trạng thái.

## 6. Phong cách hình ảnh: vẽ đơn giản, dễ thương

- Hình khối **tròn, bo góc**, không có cạnh sắc. Viền mềm màu đậm hơn nền, không dùng đen tuyền.
- **Màu pastel**, tất cả định nghĩa trong `palette.js`. Gợi ý gốc:
  - Hồng đào `#FFC8DD`, hồng phấn `#FFAFCC`, xanh trời `#BDE0FE`, xanh nhạt `#A2D2FF`, tím lavender `#CDB4DB`, kem `#FFF8E7`, viền nâu `#5C4B51`
- **Nhân vật kiểu chibi**: đầu to, thân nhỏ, mắt chấm tròn, má hồng. Khi đi thì nhún nhảy nhẹ và chân đung đưa. Hai nhân vật khác nhau bằng màu áo và kiểu tóc.
- Chuyển động luôn **có easing**, không giật cục.
- Nền **parallax 3–4 lớp** (trời → núi/đồi xa → cây → đường đi).

## 7. Bối cảnh: "Đồi Mây Ước" (địa điểm hư cấu)

Một con đường dạo **cuộn ngang** dài khoảng 3–4 màn hình, đi qua lần lượt:

1. **Cổng Hoa Đào**: điểm xuất phát, hàng cây anh đào rơi cánh hoa.
2. **Cầu Tình Yêu**: bắc qua dòng suối có sen và cá koi; sửa xong thì lan can treo trái tim và ổ khoá tình yêu.
3. **Hồ Đom Đóm**: buổi tối có đom đóm bay, có **ghế đá** để ngồi cùng nhau.
4. **Cánh Đồng Hoa Gió**: hoa đung đưa, chong chóng giấy quay.
5. **Ngọn Hải Đăng Trên Đồi**: điểm cuối, nhìn ra biển và hoàng hôn.

Màu trời **theo giờ thật** của người chơi: sáng, chiều vàng, hoàng hôn hồng, đêm tím có sao.

## 8. Lộ trình phát triển

Làm **theo thứ tự**, xong và kiểm tra giai đoạn trước mới sang giai đoạn sau.

- **Giai đoạn 1 (MVP)** ✅
  - [x] Màn hình vào phòng (tên, chọn màu, mã phòng)
  - [x] Hai nhân vật đi trái/phải, thấy nhau realtime
  - [x] Chat bong bóng trên đầu nhân vật
  - [x] Nắm tay khi đứng gần nhau
  - [x] Nền tĩnh đơn giản cho cảnh 1
  - [x] Nút điều khiển cảm ứng cho điện thoại
- **Tuỳ chỉnh nhân vật** ✅: chọn **Nam/Nữ** trước, mỗi giới có kiểu tóc, trang phục, phụ kiện riêng; màu da, màu tóc, mắt, màu áo dùng chung. Có xem trước và thay đồ khi đang đi dạo.
  - **Tạo hình người Việt** là định hướng chính: áo dài, áo bà ba, nón lá, khăn đóng, mũ bảo hiểm, áo đội tuyển; màu tóc tông đen/nâu; màu da trắng hồng → ngăm.
  - `LOOK_OPTIONS` (shared) chia `common` / `female` / `male`. Đổi giới tính: lựa chọn nào không hợp sẽ về mặc định (`sanitizeLook`), lựa chọn dùng chung được giữ.
  - Thêm lựa chọn mới: thêm giá trị vào `LOOK_OPTIONS`, màu vào `palette.js`, nhãn tiếng Việt trong `customize.js`, cách vẽ trong `character.js` (thân, trang phục) hoặc `character-head.js` (tóc, mặt, phụ kiện).
- **Nhiệm vụ hợp tác** ✅
  - Cảnh 1 Cổng Hoa Đào (0–6100), 10 thử thách: hứng hoa → một hai ba đứng im → nắm tay né lá → bịt mắt bắt dê → chuông gió → ném còn → lật thẻ hoa → kéo co → ghép ca dao → chụp ảnh kỷ niệm.
  - Thử thách nắm tay chưa bắt đầu thì hiện **bảng "Cách bắt đầu"** có ô tích (nắm tay, đứng ở vạch). Kéo co: chữ "DÔ!", thanh kéo và thông báo hiện ngay trên đầu nhân vật — không dùng `toast` vì trên điện thoại toast nằm đúng chỗ đó.
  - Né lá: lá chỉ rơi trong đoạn [startX, endX] phía trước hai người, gần đích thì thả thưa đi để mật độ đều.
  - Cảnh 2 Cầu Tình Yêu (6100–9900), 10 thử thách: lấy gỗ tốt → khiêng ván → buộc lạt tre → câu cá koi → nắm tay qua cầu → tâm đầu ý hợp → chung ô dưới mưa → xếp đá cầu may → nhảy sạp → khoá tình yêu. Toạ độ cảnh 2 viết theo `BRIDGE + offset` trong `shared/quests-bridge.js`. Chắn đường: sau buộc lạt (+840), sau câu cá (+1160), cuối cảnh (+3700, Hồ Đom Đóm chưa mở).
  - Kiểu mới ở cảnh 2: `fishing` (người cầm cần `fisherId` chỉ thấy phao; người kia thấy loại cá `kind` + cá bơi tới `approachIn`, bấm `call` hô "Giật!"; người cầm cần `pull` lúc phao nhúc nhích: koi +1 và đổi vai, cá con −`nibblePenalty`, giật sớm thì cá sợ), `together` (không nhắn tin — server chặn chat khi `phase: 'choose'`, gửi fx `noChat`; mỗi người `post:i`; chưa lật thì không gửi lựa chọn của người kia; giống nhau +1, khác nhau −`missPenalty`), `umbrella` (nắm tay, người không cầm ô phải ở trong `cover` quanh tâm ô = người cầm ô + `wind`; ra ngoài thì `wet` tăng, đủ `wetMax` thì về vạch), `stack` (đá đung đưa theo pha `phase`/`speed`, `stackOffset`; người thả `placerId` bấm `drop`, phải lệch so với viên trên cùng ≤ `tolerance`; người kia giữ `holdOn`/`holdOff` để đá chậm `steadySlow`; rơi `maxMisses` viên là đổ cả chồng; thay phiên), `sap` (nắm tay ở giữa sạp; server xếp sẵn nhịp `beats` open/close, `breakChance` = sạp khép sớm; mỗi nhịp khép cả hai phải `jump` đúng một lần trong `jumpWindowMs`, nhảy loạn cũng trượt; trượt −`missPenalty`), `lock` (4 ô; người `leftId` xoay ô 1–2, người kia ô 3–4; mỗi người chỉ nhận `known` = mã ô của người kia; cùng bấm `lock`; sai thì báo theo `feedback` count/each/none, sai `maxTries` lần thì đổi mã).
  - **Độ khó** 🌱 Dễ / 🌸 Thường / 🔥 Khó: người tạo phòng chọn (`room:join` gửi `level`), lưu cùng tiến độ; người vào sau dùng độ khó của phòng. Mỗi nhiệm vụ khai báo `levels: { easy, hard }` ghi đè thông số gốc (= Thường). **Luôn lấy định nghĩa qua `questAt(index, level)` / `questOf(progress)`**, không đọc `QUESTS[i]` trực tiếp khi cần thông số.
  - **Bẫy ở Cổng Hoa Đào** (Thường nhẹ, Khó dày, Dễ không có): hứng hoa có hoa vàng +3 rơi nhanh và gió (`vx`, vị trí qua `fallX`); người gỗ hô thiếu "ba" (`fakeChance`) và nhanh dần gần đích (`rush`); né lá có chùm 3 lá và rơi nhanh dần; bắt dê có dê giật mình (`fleeRadius`) và dê bù nhìn (`decoys`, chộp nhầm −1); ném còn có gió lệch điểm hô (`wind`, chỉ người hô thấy) và vòng nhanh dần sau mỗi lần lọt; lật thẻ thêm cặp và xáo lại khi sai quá `maxMisses`; kéo co có "DỐ!" giả (`cueFake`) và nhịp nhanh dần; ca dao có chữ mồi gần giống (`SIMILAR_WORDS`).
  - **Thử thách nắm tay** (`hand: true` — statue, leafWalk, tug): không tự kéo nhau (`quests.handChallenge()`), cách nhau > `HAND_DROP_GAP` (90) hoặc buông tay là rớt tay. statue/leafWalk: thua thì server **đưa cả hai về vạch** (gửi `player:move` cho chính người đó = dịch chuyển), chờ 1,5s mới bắt đầu lại; bắt đầu khi nắm tay và cả hai trong 90 quanh vạch.
  - **Lưu tiến độ theo tên nhiệm vụ** (`questId`), không theo số thứ tự; bản lưu cũ chỉ có `index` được đổi qua `LEGACY_ORDER` (`savedIndex`). Vào phòng thì xuất hiện ở `spawnX` của nhiệm vụ đang làm (nếu có).
  - Ảnh chụp ở thử thách `photo` lưu vào `data/memories.json` theo phòng (`addPhoto`); album xem lại chưa làm.: làm lần lượt; xong nhiệm vụ mở chắn đường thì mới đi tiếp. Tiến độ lưu theo mã phòng.
  - Kiểu nhiệm vụ: `catch` (hứng vật rơi: đồ tốt +1, đồ xấu −1, điểm không âm; hiện 20% tốt), `blueprint` (ván rải ngẫu nhiên giữa các mốc 🪨🏮🏺; người cầm bản vẽ xem bản vẽ thu nhỏ ở bảng gỗ rồi **nhắn tin** chỉ, chỉ người kia mới nhặt được), `carry` (hai người đứng hai bên ván ✋ cùng lúc để nâng, giữ khoảng cách `minGap`–`maxGap` khi đi, ra tới `deliverX` là giao), `tie` (một người **nhấn giữ** ✋ ở chỗ giữ ván — `holdOn`/`holdOff`; người kia bấm `tie` khi kim `tieNeedle` trong vùng `zone`; trượt hoặc không ai giữ thì −1; mỗi nút buộc kim nhanh thêm `speedUp`), `sync` (bấm cùng lúc ở 2 chỗ), `holdWalk` (nắm tay đi tới đích). `plates`/`collect` hiện chưa dùng nhưng vẫn giữ trong engine. Thêm ở Cổng Hoa Đào: `statue` (cây hô chu kỳ go → chant → freeze; lúc freeze ai lệch quá `moveTolerance` sau `graceMs` là thua), `leafWalk` (lá rơi phía trước hướng đi `spawnAhead`, **server tự phát hiện** lá trúng ai),  Trò dân gian: `blindGoat` (người bịt mắt `blindId` không nhận vị trí dê, chỉ chộp được khi đứng trong `grabRadius`; người dẫn đường dùng **nút ra hiệu** `sig:left/right/stop/grab` — không bắt nhắn tin; bắt được thì đổi vai), `nemcon` (hai việc tách riêng: người ném `thrower` giữ ✋ = `aim`, thả = `throw`, lực trong `powerZone` thì bóng `ready`; người kia (thấy vòng) bấm `shout` lúc vòng trong `ringZone` thì lọt; thay phiên ném), `memory` (thẻ úp không gửi loại hoa; thay phiên lật, sai thì úp lại sau `showMs`), `tug` (khi có "DÔ!" cả hai `pull` cách nhau ≤ `syncMs`; kéo sớm hay lệch nhịp thì bị kéo lại; s ≥ 1 là thắng). Đã bỏ `butterfly` (bản lưu cũ chuyển sang `blindgoat` qua `RENAMED`). `cadao` (người biết câu = `seerId` nhận `verse`; thay phiên chạm đèn đúng thứ tự, sai thì tắt hết), `photo` (nắm tay trong khung + cùng bấm).
  - **Thông tin bí mật** (bản vẽ): server gửi `quest:state` riêng cho từng người (`emitQuest`), chỉ người cầm bản vẽ (`seerId`) nhận `kind` của ván. Không bao giờ broadcast chung cho cả phòng.
  - Server chỉ gửi trường công khai của người chơi (`publicState`): không lộ `clientId` hay trạng thái nội bộ của bot.
  - Vật rơi do server thả theo nhịp (`tickQuest`, 100ms) quanh vị trí hai người; gửi kèm `age` để client tự tính độ cao, không phụ thuộc đồng hồ server.
  - Server kiểm tra khoảng cách và thời gian; client không tự quyết hoàn thành. Server kẹp vị trí không cho vượt chắn đường.
  - Thêm nhiệm vụ/cảnh mới: khai báo trong `shared/quests.js` (SCENES, QUESTS, BARRIERS), vẽ cảnh trong `public/js/scenes/`, vẽ vật thể nhiệm vụ trong `public/js/quests.js`. Kiểu nhiệm vụ mới thì thêm logic ở `server/quests.js`.
  - Kiểm thử: chạy server với `DATA_DIR=<thư mục tạm>` để không ghi đè tiến độ thật.
- **Chế độ 1 người (để test)** ✅: tích "🤖 Chơi 1 người" ở màn hình vào phòng. Server thêm một bot vào phòng, mã nội bộ `SOLO-<mã>` nên **tiến độ tách riêng** khỏi phòng thật cùng mã.
  - Bot đi theo người chơi; ở `sync`/`plates` khi người chơi tới gần một mục tiêu (≤ 250) thì bot sang mục tiêu còn lại, rung chuông theo sau ~0,3s; nắm tay được; trả lời chat. Bot không hứng hoa giùm.
  - `blueprint`: bot cầm bản vẽ thì đứng ở bảng gỗ và nhắn "Tấm thứ N bên trái/phải <mốc>" (`describePlank`); người chơi cầm bản vẽ thì bot hiểu tin nhắn dạng "đèn lồng phải 2" (`findPlank`, so từ khoá không dấu). `carry`: bot sang đầu ván bên kia, nâng theo, giữ cách 80 khi khiêng. `tie`: bot sang chỗ còn lại; ở chỗ giữ thì giữ ván, ở chỗ buộc thì canh kim vào giữa vùng xanh rồi buộc.
  - Bot chạy trong nhịp 100ms của server (`tickRoomBot`), đi qua đúng logic nhiệm vụ như người thật. Người chơi rời phòng thì phòng đóng luôn.
  - Thêm kiểu nhiệm vụ mới cần 2 người thì nhớ dạy bot cách phối hợp trong `server/bot.js`.
  - Trò dân gian (`server/bot-folk.js`): bot bịt mắt làm theo tin nhắn "trái/phải/dừng/bắt", bot dẫn đường thì nhắn hướng; ném còn: bot tự canh lực + vòng, hoặc hô "Ném!" khi vòng sắp về giữa và lực vừa đủ; lật thẻ: bot chỉ nhớ thẻ đã thấy; kéo co: bot kéo ngay sau người chơi.
  - Thử thách Cổng Hoa Đào: bot đứng im khi cây hô `freeze`; né lá thì đi sát người chơi; ca dao: bot biết câu thì nhắn «chữ» cần chạm, người chơi biết câu thì bot hiểu chữ có trên đèn trong tin nhắn; chụp ảnh thì bấm theo.
  - Thử thách Cầu Tình Yêu (`server/bot-bridge.js`): câu cá — bot nhìn nước thì hô khi koi cắn, bot cầm cần thì giật khi được hô; tâm đầu ý hợp — bot chọn giống người chơi ~70%; chung ô — bot đứng dưới tâm ô theo gió; xếp đá — bot giữ đá khi người chơi thả, tự canh thả khi tới lượt; nhảy sạp — bot tự nhảy đúng nhịp; khoá — bot nhắn mã ô của người chơi, hiểu tin nhắn "tim, trăng" (từ khoá `words` trong `symbols`) để xoay ô của mình.
- **Giai đoạn 2 (Không khí)**: đủ 5 cảnh của Đồi Mây Ước, parallax, trời theo giờ thật, emote, đồng hồ "đã đi cùng nhau X phút", nhạc nền (có nút tắt).
- **Giai đoạn 3 (Kỷ niệm)**: nhặt và tặng quà, ngồi ghế đá, lời nhắn để lại trên đường, chuỗi ngày (streak), lưu dữ liệu.
- **Giai đoạn 4 (Deploy)**: đưa lên mạng, có link gửi cho người ấy.

Cập nhật các ô `[ ]` → `[x]` trong file này khi hoàn thành.

## 9. Quy trình làm việc cho Claude

1. **Trước khi code**: đọc file này, nêu ngắn gọn sẽ làm gì và sửa file nào. Với thay đổi lớn (kiến trúc, thư viện mới, đổi giao thức mạng) thì **hỏi người dùng trước**.
2. **Làm từng bước nhỏ**: mỗi lần chỉ một tính năng, chạy được ngay.
3. **Kiểm tra trước khi báo xong**:
   - `npm run check` không có lỗi.
   - Chạy server, mở **2 tab trình duyệt** cùng mã phòng: hai nhân vật thấy nhau, di chuyển, chat hoạt động.
   - Thử khung hình điện thoại (~390×844).
   - Console trình duyệt và server không có lỗi.
   - Không kiểm tra được bước nào thì **nói rõ là chưa kiểm tra**, không báo "xong" khi chưa chạy thử.
4. **Sau khi xong**: cập nhật lộ trình ở mục 8, tóm tắt cho người dùng những gì đã đổi và cách thử.
5. **Git**: dự án dùng git. Commit sau mỗi tính năng hoàn chỉnh, message tiếng Việt ngắn gọn (vd: `feat: chat bong bóng`). **Chỉ commit khi người dùng đồng ý.**

## 10. Quy ước code

- Tên biến, hàm, file bằng **tiếng Anh** (`camelCase`, file `kebab-case` hoặc một từ). Comment ngắn bằng **tiếng Việt**, chỉ khi cần giải thích *tại sao*.
- Không dùng số "ma thuật": đưa vào `shared/constants.js` hoặc `palette.js`.
- Vòng lặp game dùng `requestAnimationFrame` + `deltaTime`, **không phụ thuộc FPS**.
- Nút ✋ hỗ trợ **nhấn giữ** (pointerdown = tương tác, pointerup = `quests.release()`); phím E tương tự với keydown/keyup.
- Toàn trang tắt bôi đen chữ và menu nhấn giữ (`user-select: none`, `-webkit-touch-callout: none`), chỉ `input` được chọn chữ.
- Canvas phải nét trên màn hình retina (nhân `devicePixelRatio`) và co giãn theo cửa sổ.
- **Bảo mật cơ bản**: không bao giờ chèn chat vào DOM bằng `innerHTML`; server giới hạn độ dài và tần suất tin nhắn; mã phòng chỉ gồm chữ và số.
- Không để lại `console.log` debug khi hoàn thành tính năng.
