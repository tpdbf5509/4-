/* 입은 방어구 겹쳐 그리기(wearData.js). rpgArt.js drawHero 가 몸 그림을 그린 바로 뒤에 부른다 — 같은 변환(뒤집기 · 기울임)을 쓰므로 몸과 같이 움직인다.
   그림을 못 불러오면 아무것도 그리지 않는다(몸만 보인다) */
import { WEAR, WEAR_SETS } from "./wearData.js";
import { WEAR_FIT } from "./wearFit.js";

const imgs = {};
function sheet(id) {
  if (typeof Image === "undefined") return null;
  let im = imgs[id];
  if (im === undefined) {
    im = imgs[id] = new Image();
    im.onerror = () => { imgs[id] = null; };
    im.src = WEAR.src(id);
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// 몸 그림 주소 끝(<캐릭터>/<보기>) — 캐릭터마다 잰 맞춤값(wearFit.js)을 찾는 키
const fitKey = (src) => { const m = /\/rpg\/([^/]+)\/([^/.]+)\.webp/.exec(src || ""); return m ? `${m[1]}/${m[2]}` : ""; };
// codes — [투구, 갑옷, 신발] 각각 WEAR_SETS 차례 + 1(0 은 없음). body 는 그린 몸 그림, ww · hh 는 그린 크기, top 은 몸 그림 위, 몸 가운데가 x = 0
export function drawWear(ctx, codes, view, body, ww, hh, top) {
  const F = WEAR.frame[view], col = WEAR.views.indexOf(view);
  if (!codes || !F || col < 0) return;
  const [cw, ch] = WEAR.cell, fit = WEAR_FIT[fitKey(body && body.src)];
  // 맞춤값이 없는 그림은 예전처럼 키에 맞춰 늘리고 발밑 가운데를 맞춘다
  const s0 = hh / F[3], x0 = -(F[0] + F[2] / 2) * s0, y0 = top + hh - (F[1] + F[3]) * s0;
  WEAR.order.forEach((row) => {
    const code = codes[row];
    if (!code) return;
    const im = sheet(WEAR_SETS[code - 1]);
    if (!im) return;
    if (!fit) { ctx.drawImage(im, col * cw, row * ch, cw, ch, x0, y0, cw * s0, ch * s0); return; }
    const f = fit[row];
    if (!f) return;                                 // 모자를 쓴 캐릭터는 투구를 그리지 않는다
    const s = f[0] * hh;
    ctx.drawImage(im, col * cw, row * ch, cw, ch, -ww / 2 + f[1] * ww, top + f[2] * hh, cw * s, ch * s);
  });
}
