// Trạng thái một người chơi; phần vẽ nhân vật nằm ở character.js
import { PALETTE } from './palette.js';
import { drawCharacter } from './character.js';
import { CHAT_SHOW_MS, sanitizeLook } from '/shared/constants.js';

const REMOTE_LERP = 12; // càng lớn càng bám sát vị trí thật của người kia

export class Player {
  constructor(data, isLocal) {
    this.id = data.id;
    this.isLocal = isLocal;
    this.x = data.x;
    this.renderX = data.x;
    this.dir = data.dir ?? 1;
    this.walking = false;
    this.walkTime = 0;
    this.bubble = null;
    this.setInfo(data);
  }

  setInfo({ name, look }) {
    this.name = name;
    this.look = sanitizeLook(look);
  }

  applyRemote({ x, dir, walking }) {
    this.x = x;
    this.dir = dir;
    this.walking = walking;
  }

  say(text) {
    this.bubble = { text, until: performance.now() + CHAT_SHOW_MS };
  }

  update(dt) {
    if (this.isLocal) this.renderX = this.x;
    else this.renderX += (this.x - this.renderX) * Math.min(1, dt * REMOTE_LERP);

    // Người kia đã dừng nhưng hình vẫn đang trượt tới thì vẫn cho bước chân
    const moving = this.walking || Math.abs(this.x - this.renderX) > 1.5;
    this.walkTime = moving ? this.walkTime + dt : 0;
  }

  // reach: khoảng cách (có dấu) từ thân tới bàn tay đang nắm, null nếu không nắm tay
  draw(ctx, sx, groundY, t, reach = null) {
    const step = this.walkTime * 11;
    const walking = this.walkTime > 0;

    ctx.save();
    ctx.translate(sx, groundY);
    drawCharacter(ctx, this.look, {
      dir: this.dir,
      bounce: walking ? -Math.abs(Math.sin(step)) * 3.5 : Math.sin(t * 2) * 0.8,
      legSwing: walking ? Math.sin(step) * 4 : 0,
      step,
      reach,
    });

    // Tên dưới chân
    ctx.font = '700 11px Nunito, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.cream;
    ctx.strokeText(this.name, 0, 8);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(this.name, 0, 8);
    ctx.restore();
  }

  headTopY(groundY) {
    return groundY - 90; // chừa chỗ cho nón lá
  }
}
