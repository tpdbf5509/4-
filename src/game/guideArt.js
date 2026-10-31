/* 첫 10분 길 안내 화살표 그림(guideData.js) — drawRpg 다음에 화면 좌표로 그린다 */
import { W, H } from "./world.js";
import { GUIDE } from "./guideData.js";

// 첫 10분 길 안내 화살표 — 목표가 화면 안이면 그 위에서 아래로 까딱이고, 밖이면 화면 가장자리에서 그쪽을 가리킨다(guideData.js)
export function drawGuideArrow(ctx, g, t, now) {
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  if (!t || !me || me.map !== t.map || !g.cam) return;
  const cx = Math.round(g.cam.x), cy = Math.round(g.cam.y);
  const tx = t.x - cx, ty = t.y - cy - GUIDE.arrowLift, pad = 44;
  const inView = tx > pad && tx < W - pad && ty > pad && ty < H - pad;
  let x = tx, y = ty, ang = Math.PI / 2;
  if (inView) y += Math.sin(now / 220) * 6;
  else {
    const hx = me.x - cx, hy = me.y - cy - 40;
    ang = Math.atan2(ty - hy, tx - hx);
    // 내 캐릭터에서 목표 쪽으로 뻗은 선이 화면 가장자리와 만나는 곳
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const sx = dx > 0 ? (W - pad - hx) / dx : dx < 0 ? (pad - hx) / dx : Infinity;
    const sy = dy > 0 ? (H - pad - hy) / dy : dy < 0 ? (pad - hy) / dy : Infinity;
    const s = Math.max(0, Math.min(sx, sy)) - Math.abs(Math.sin(now / 220)) * 6;
    x = hx + dx * s; y = hy + dy * s;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-6, -15); ctx.lineTo(-1, -5); ctx.lineTo(-16, -5); ctx.lineTo(-16, 5); ctx.lineTo(-1, 5); ctx.lineTo(-6, 15);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(44, 31, 18, 0.9)"; ctx.stroke();
  ctx.fillStyle = "#ffe08a"; ctx.fill();
  ctx.restore();
}
