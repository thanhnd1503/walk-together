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
│   ├── quests.js         # Logic nhiệm vụ (server là trọng tài)
│   ├── bot.js            # Bot cho chế độ 1 người (đi theo, phối hợp nhiệm vụ)
│   └── storage.js        # Lưu tiến độ vào data/progress.json (DATA_DIR để đổi thư mục)
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
│       ├── scenes/       # Mỗi cảnh một file: gate.js (Cổng Hoa Đào), bridge.js (Cầu Gỗ Nhỏ)
│       ├── quests.js     # Nhiệm vụ phía client: vật phẩm, chuông, cọc, bảng nhiệm vụ
│       ├── screens.js    # Màn hình vào phòng + bảng thay đồ
│       ├── draw.js       # Hàm vẽ dùng chung (bo góc, mây, hoa…)
│       ├── palette.js    # Bảng màu — mọi màu lấy từ đây
│       └── ui.js         # Chat bong bóng, emote, HUD
├── scripts/
│   └── check.js          # Dùng cho `npm run check`
├── shared/
│   ├── constants.js      # Hằng số dùng chung client/server (tốc độ, kích thước map, tên sự kiện)
│   └── quests.js         # Danh sách cảnh, nhiệm vụ, chắn đường (dùng chung)
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
| `quest:state` | S → C | `{ index, count, items: [{ id, x, kind?, age? }] }` (cũng có trong ack của `room:join`) |
| `quest:collect` | C → S | `{ itemId }` |
| `quest:interact` | C → S | `{ targetId }` |
| `quest:fx` | S → C | `{ targetId, by }` rung chuông, hoặc `{ type: 'catch', by, kind, x }` hiện +1/−1 |

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
2. **Cầu Gỗ Nhỏ**: bắc qua dòng suối có cá koi.
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
- **Nhiệm vụ hợp tác** ✅ (cảnh 1–2): làm lần lượt; xong nhiệm vụ mở chắn đường thì mới đi tiếp. Tiến độ lưu theo mã phòng.
  - Kiểu nhiệm vụ: `catch` (hứng vật rơi: đồ tốt +1, đồ xấu −1, điểm không âm), `collect` (nhặt chung ở vị trí cố định), `sync` (bấm cùng lúc ở 2 chỗ), `plates` (cùng đứng đủ giây), `holdWalk` (nắm tay đi tới đích).
  - Vật rơi do server thả theo nhịp (`tickQuest`, 100ms) quanh vị trí hai người; gửi kèm `age` để client tự tính độ cao, không phụ thuộc đồng hồ server.
  - Server kiểm tra khoảng cách và thời gian; client không tự quyết hoàn thành. Server kẹp vị trí không cho vượt chắn đường.
  - Thêm nhiệm vụ/cảnh mới: khai báo trong `shared/quests.js` (SCENES, QUESTS, BARRIERS), vẽ cảnh trong `public/js/scenes/`, vẽ vật thể nhiệm vụ trong `public/js/quests.js`. Kiểu nhiệm vụ mới thì thêm logic ở `server/quests.js`.
  - Kiểm thử: chạy server với `DATA_DIR=<thư mục tạm>` để không ghi đè tiến độ thật.
- **Chế độ 1 người (để test)** ✅: tích "🤖 Chơi 1 người" ở màn hình vào phòng. Server thêm một bot vào phòng, mã nội bộ `SOLO-<mã>` nên **tiến độ tách riêng** khỏi phòng thật cùng mã.
  - Bot đi theo người chơi; ở `sync`/`plates` khi người chơi tới gần một mục tiêu (≤ 250) thì bot sang mục tiêu còn lại, rung chuông theo sau ~0,3s; nắm tay được; trả lời chat. Bot không hứng/nhặt giùm.
  - Bot chạy trong nhịp 100ms của server (`tickRoomBot`), đi qua đúng logic nhiệm vụ như người thật. Người chơi rời phòng thì phòng đóng luôn.
  - Thêm kiểu nhiệm vụ mới cần 2 người thì nhớ dạy bot cách phối hợp trong `server/bot.js`.
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
- Canvas phải nét trên màn hình retina (nhân `devicePixelRatio`) và co giãn theo cửa sổ.
- **Bảo mật cơ bản**: không bao giờ chèn chat vào DOM bằng `innerHTML`; server giới hạn độ dài và tần suất tin nhắn; mã phòng chỉ gồm chữ và số.
- Không để lại `console.log` debug khi hoàn thành tính năng.
