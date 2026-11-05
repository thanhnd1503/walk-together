// Phía client của thử thách ở Cầu Tình Yêu: trạng thái, bảng nhiệm vụ, nút ✋, thông báo
// Dùng chung object `s` với challenge-client.js để phần vẽ (bridge-view.js) đọc được
import { PALETTE } from './palette.js';
import { INTERACT_RADIUS } from '/shared/quests.js';

export const BRIDGE_TYPES = ['fishing', 'together', 'lock', 'umbrella', 'stack', 'sap'];

const HOP_MS = 420;
const HOP_HEIGHT = 26;
const WAIT_ROLES = '⏳ Chờ đủ hai người để chia vai';

export function createBridgeClient({ net, toast, getSelfId, s }) {
  Object.assign(s, { bobStart: 0, approachAt: 0, callAt: 0, stackAt: 0, beats: [], hops: new Map(), sapMsg: null, drop: null, windShown: 0, steadying: false });
  const me = () => getSelfId();

  function setState(ch, now) {
    if (!ch) return;
    if (ch.bobAge !== undefined) s.bobStart = now - ch.bobAge;
    if (ch.approachIn !== undefined) s.approachAt = now + ch.approachIn;
    if (ch.speed !== undefined) s.stackAt = now;
    if (ch.beats) s.beats = ch.beats.map((b) => ({ at: now + b.in, kind: b.kind }));
    if (ch.placerId === me()) s.steadying = false; // tới lượt mình thả thì thôi giữ
  }

  function panel(q, count) {
    const ch = s.ch ?? {};
    const title = `${q.title} (${count}/${q.goal})`;
    switch (q.type) {
      case 'fishing': {
        if (!ch.fisherId) return { title, hint: WAIT_ROLES };
        const hint = ch.fisherId === me()
          ? '🎣 Bạn cầm cần: đứng ở Chỗ câu, nghe người ấy hô "Giật!" rồi bấm ✋ thật nhanh (phao nhúc nhích có khi chỉ là cá con)'
          : '👀 Bạn thấy cá dưới nước: cá koi cam 🐟 cắn câu thì bấm ✋ hô "Giật!", cá con xám thì đừng hô';
        return { title, hint };
      }
      case 'together': {
        if (ch.phase === 'reveal') return { title, hint: ch.match ? '💞 Hợp ý nhau rồi!' : '😅 Khác nhau mất rồi, câu tiếp nhé' };
        const waiting = ch.partnerPicked ? ' · Người ấy đã chọn ✓' : '';
        if (ch.mine !== undefined) return { title, hint: `⏳ Bạn đã chọn, chờ người ấy…${waiting}` };
        return { title, hint: `🤫 Không nhắn tin! Tới biển mình thích rồi bấm ✋${waiting}` };
      }
      case 'umbrella':
        if (ch.phase === 'idle') return { title: q.title, hint: '🤝 Nắm tay nhau, cùng đứng ở vạch Xuất phát để bắt đầu' };
        return {
          title: q.title,
          hint: ch.holderId === me() ? '☂️ Bạn cầm ô: đi đều để người ấy theo kịp, gió làm ô nghiêng đó' : '💧 Đứng sát dưới ô của người ấy (ô nghiêng theo gió!)',
        };
      case 'stack': {
        if (!ch.placerId) return { title, hint: WAIT_ROLES };
        const misses = ch.maxMisses ? ` · Rơi ${ch.misses}/${ch.maxMisses} viên là đổ cả chồng` : '';
        const hint = ch.placerId === me()
          ? '🪨 Tới lượt bạn: bấm ✋ thả đá lúc đá ở ngay trên mũi tên ▼'
          : '🤲 Nhấn GIỮ ✋ để đá đung đưa chậm lại cho người ấy thả';
        return { title, hint: hint + misses };
      }
      case 'sap':
        return { title, hint: ch.phase === 'idle' ? '🤝 Nắm tay nhau, cùng đứng giữa sạp để bắt đầu' : q.hint };
      case 'lock': {
        if (!ch.leftId) return { title: q.title, hint: WAIT_ROLES };
        const mine = ch.leftId === me() ? [1, 2] : [3, 4];
        const known = (ch.known ?? []).map((c, i) => (c === null ? null : `ô ${i + 1} ${q.symbols[c].icon} ${q.symbols[c].name}`)).filter(Boolean).join(', ');
        const tries = ch.maxTries ? ` · Sai ${ch.tries}/${ch.maxTries} lần là đổi mã` : '';
        return { title: q.title, hint: `🔐 Bạn xoay ô ${mine.join(' và ')}. Mã ô của người ấy: ${known} → nhắn cho người ấy, rồi cùng ✋ ở ổ khoá${tries}` };
      }
      default:
        return { title: q.title, hint: q.hint };
    }
  }

  const nearestOf = (xs, x) => {
    let best = -1;
    let bestD = INTERACT_RADIUS;
    xs.forEach((tx, i) => {
      if (Math.abs(x - tx) <= bestD) {
        bestD = Math.abs(x - tx);
        best = i;
      }
    });
    return best;
  };

  // Thứ đứng gần để bấm ✋
  function near(q, player) {
    const ch = s.ch ?? {};
    const x = player.x;
    let target = null;
    switch (q.type) {
      case 'fishing':
        if (ch.fisherId === me() && Math.abs(x - q.fishX) <= q.reach) target = { id: 'pull', x: q.fishX };
        if (ch.fisherId && ch.fisherId !== me()) target = { id: 'call', x };
        break;
      case 'together': {
        const i = ch.phase === 'choose' && ch.mine === undefined ? nearestOf(q.posts, x) : -1;
        if (i >= 0) target = { id: `post:${i}`, x: q.posts[i] };
        break;
      }
      case 'stack':
        if (ch.placerId && Math.abs(x - q.pileX) <= q.reach) target = { id: ch.placerId === me() ? 'drop' : 'steady', x: q.pileX };
        break;
      case 'sap':
        if (ch.phase === 'active') target = { id: 'jump', x };
        break;
      case 'lock': {
        if (!ch.leftId) break;
        const own = ch.leftId === me() ? [0, 1] : [2, 3];
        const i = nearestOf(own.map((k) => q.dials[k]), x);
        if (i >= 0) target = { id: `dial:${own[i]}`, x: q.dials[own[i]] };
        else if (Math.abs(x - q.lockX) <= q.lockRadius) target = { id: 'lock', x: q.lockX };
        break;
      }
      default:
    }
    s.nearTarget = target;
    return Boolean(target);
  }

  function interact() {
    const id = s.nearTarget?.id;
    if (!id) return;
    if (id === 'steady') {
      // Xếp đá: nhấn giữ để đá chậm lại, thả tay là thôi giữ
      s.steadying = true;
      net.interact('holdOn');
      return;
    }
    if (id === 'jump') s.hops.set(me(), performance.now());
    net.interact(id);
  }

  function release() {
    if (!s.steadying) return;
    s.steadying = false;
    net.interact('holdOff');
  }

  // Trả về true nếu đã xử lý hiệu ứng này
  function onFx(data, float) {
    const mine = data.by === me();
    const now = performance.now();
    switch (data.type) {
      case 'call':
        s.callAt = now;
        return true;
      case 'fish': {
        if (data.ok) {
          float(data.x, 'Câu được cá koi! 🐟', PALETTE.plus);
          return true;
        }
        const msg = {
          early: mine ? '😵 Giật sớm quá, cá sợ chạy mất rồi' : '😵 Người ấy giật sớm quá, cá sợ chạy mất',
          small: `🐟 Chỉ là cá con rỉa mồi thôi${data.penalty ? ' (−1)' : ''}`,
          escape: '💨 Cá koi ăn mồi rồi chạy mất! Hô nhanh hơn nhé',
        }[data.reason];
        toast(msg, 2200);
        return true;
      }
      case 'picked':
        if (!mine) toast('✅ Người ấy đã chọn rồi, tới bạn!', 1600);
        return true;
      case 'answer':
        toast(data.ok ? '💞 Hợp ý nhau! +1' : `😅 Khác nhau mất rồi${data.penalty ? ' (−1)' : ''}`, 2200);
        return true;
      case 'noChat':
        if (mine) toast('🤫 Đang đoán ý nhau, chọn xong mới được nhắn nha!', 2200);
        return true;
      case 'steady':
        if (!mine) toast('🤲 Người ấy đang giữ đá, thả đi!', 1500);
        return true;
      case 'stone':
        s.drop = { x: data.x, ok: data.ok, at: now };
        if (data.collapse) toast('💥 Đổ cả chồng đá rồi! Xếp lại từ đầu nhé', 2600);
        else if (!data.ok) toast('😵 Lệch quá, đá rơi mất rồi!', 1800);
        return true;
      case 'jump':
        s.hops.set(data.by, now);
        return true;
      case 'sap': {
        const pinched = data.missed?.includes(me());
        const text = data.ok ? '🎋 Qua!' : pinched ? '😵 Bạn bị kẹp chân!' : '😵 Người ấy bị kẹp chân!';
        s.sapMsg = { text, ok: data.ok, at: now };
        return true;
      }
      case 'notMine':
        if (mine) toast('🔐 Ô này người ấy xoay; bạn xoay 2 ô có chữ "bạn"', 2200);
        return true;
      case 'lockWait':
        if (mine) toast('🔒 Chờ người ấy cùng bấm khoá nhé', 1600);
        return true;
      case 'unlock': {
        if (data.ok) {
          toast('💖 Đã khoá ổ khoá tình yêu!', 3500);
          return true;
        }
        let msg = '🔒 Chưa đúng mã';
        if (data.each) msg = `🔒 Chưa đúng: ${data.each.map((ok, i) => `ô ${i + 1} ${ok ? '✅' : '❌'}`).join(' ')}`;
        else if (data.correct !== undefined) msg = `🔒 Chưa đúng: ${data.correct}/4 ô đúng`;
        if (data.newCode) msg = '🔀 Sai nhiều quá, ổ khoá đổi mã mới rồi!';
        toast(msg, 2600);
        return true;
      }
      default:
        return false;
    }
  }

  // Nhảy sạp: nhân vật bật lên một chút
  function liftOf(id, now) {
    const at = s.hops.get(id);
    if (at === undefined || now - at > HOP_MS) return 0;
    return Math.sin(((now - at) / HOP_MS) * Math.PI) * HOP_HEIGHT;
  }

  return { setState, panel, near, interact, release, onFx, liftOf };
}
