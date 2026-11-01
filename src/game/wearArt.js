/* 입은 방어구 겹쳐 그리기(wearData.js). rpgArt.js drawHero 가 몸 그림을 그린 바로 뒤에 부른다 — 같은 변환(뒤집기 · 기울임)을 쓰므로 몸과 같이 움직인다.
   그림을 못 불러오면 아무것도 그리지 않는다(몸만 보인다) */
import { WEAR, WEAR_SETS } from "./wearData.js";

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
// codes — [투구, 갑옷, 신발] 각각 WEAR_SETS 차례 + 1(0 은 없음). ww · hh 는 몸 그림 크기, top 은 몸 그림 위, 몸 가운데가 x = 0
export function drawWear(ctx, codes, view, hh, top) {
  const F = WEAR.frame[view], col = WEAR.views.indexOf(view);
  if (!codes || !F || col < 0) return;
  const s = hh / F[3], [cw, ch] = WEAR.cell;
  const x = -(F[0] + F[2] / 2) * s, y = top + hh - (F[1] + F[3]) * s;
  WEAR.order.forEach((row) => {
    const code = codes[row];
    if (!code) return;
    const im = sheet(WEAR_SETS[code - 1]);
    if (im) ctx.drawImage(im, col * cw, row * ch, cw, ch, x, y, cw * s, ch * s);
  });
}
