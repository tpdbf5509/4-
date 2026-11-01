/* ── 스킬 상점 스킬 연출 그리기 — pixelfx(MIT) 픽셀 시트 ─────────────────────────
   수치는 skillPxData.js. 방장이 보낸 연출(kind "sk_px_<이름>")만 그린다. 판정은 하지 않는다.
   시트는 처음 쓸 때 하나씩 불러온다(원소 구체는 내 원소 것만 받게 된다). 못 불러오면 얇은 고리 · 선으로 대신한다. */
import { SKILL_PX_SRC, SKILL_PX_SHEETS, SKILL_PX_LOOK, SKILL_PX_ELEMS, SKILL_PX_ELEM_FALLBACK } from "./skillPxData.js";

const PRE = "sk_px_";
const imgs = {};
function sheetImg(name) {
  let im = imgs[name];
  if (im === undefined) {
    im = imgs[name] = new Image();
    im.onerror = () => { imgs[name] = null; };
    im.src = `${SKILL_PX_SRC}${name}.webp`;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}

// 예전 고리(art.js nova)와 같은 크기로 넓어지는 범위 고리 — 1px 얇은 선
function rangeRing(ctx, f, p) {
  const r = (f.r || 80) * (0.2 + p * 1.05);
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.8;
  ctx.strokeStyle = f.color || "#d8d2e6";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// 시트를 못 불러왔을 때 — 가볍게 자리만 보인다
function fallback(ctx, f, p, look) {
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.7;
  ctx.strokeStyle = f.color || "#efe3c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (look.mode === "at") ctx.arc(f.x, f.y - 20, 14 + p * 22, 0, Math.PI * 2);
  else { ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); }
  ctx.stroke();
  ctx.restore();
}

export function drawSkillPx(ctx, f, p) {
  if (!f.kind.startsWith(PRE)) return false;
  const key = f.kind.slice(PRE.length), look = SKILL_PX_LOOK[key];
  if (!look) return true;
  if (look.mode !== "at" && ![f.x0, f.y0, f.x1, f.y1].every(Number.isFinite)) return true;
  const el = look.elem ? (SKILL_PX_ELEMS.includes(f.el) ? f.el : SKILL_PX_ELEM_FALLBACK) : null;
  const name = el ? `${key}_${el}` : key, S = SKILL_PX_SHEETS[name];
  if (look.ring) rangeRing(ctx, f, p);
  const im = S && sheetImg(name);
  if (!im) { fallback(ctx, f, p, look); return true; }

  // 칸 고르기 — 한 번짜리는 연출 수명에 맞춰 처음부터 끝까지, 반복은 지난 시간으로 돈다
  const age = f.life - f.t;
  const i = S.loop ? Math.floor(age * S.n * (look.spin || 1.5)) % S.n : Math.min(S.n - 1, Math.floor(S.n * ((look.from || 0) + p * (1 - (look.from || 0)))));
  const sx = (i % S.cols) * S.w, sy = Math.floor(i / S.cols) * S.h;
  let k = look.k || 1;
  if (look.rk && f.r) k = Math.min(look.kMax || 9, f.r / look.rk);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (look.mode === "at") {
    ctx.translate(f.x, f.y - (look.lift || 0));
    if (f.dir < 0) ctx.scale(-1, 1);
    // 반복 시트(철벽)는 수명 끝 30% 동안 흐려진다
    if (S.loop) ctx.globalAlpha = Math.min(1, (1 - p) / 0.3);
    ctx.drawImage(im, sx, sy, S.w, S.h, -S.px * k, -S.py * k, S.w * k, S.h * k);
  } else if (look.mode === "along") {
    const dx = f.x1 - f.x0, dy = f.y1 - f.y0, len = Math.hypot(dx, dy) || 1;
    const kx = Math.min(look.kMax || 9, Math.max(look.k || 1, len / look.span));
    if (look.end) ctx.translate(f.x1, f.y1);              // 끝점이 맞은 자리 — 번개는 왼쪽(앞 대상)에서 뻗어 온다
    else ctx.translate((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2);
    ctx.rotate(Math.atan2(dy, dx));
    if (dx < 0 && !look.end) ctx.scale(1, -1);           // 왼쪽으로 누우면 위아래가 뒤집히지 않게
    const ky = look.end ? kx : look.k || 1;
    ctx.drawImage(im, sx, sy, S.w, S.h, -S.px * kx, -S.py * ky, S.w * kx, S.h * ky);
  } else if (look.mode === "ray") {                      // 출발점에서 x1 쪽으로 돌려 그린다 — 돌진 · 대쉬 줄기
    const dx = f.x1 - f.x0, dy = f.y1 - f.y0;
    ctx.translate(f.x0, f.y0);
    ctx.rotate(Math.atan2(dy, dx));
    if (dx < 0) ctx.scale(1, -1);
    const cy = look.cy ?? S.py;
    ctx.drawImage(im, sx, sy, S.w, S.h, -S.px * k, -cy * k, S.w * k, S.h * k);
  } else {                                                 // fly — 머리(기준점)가 x0 → x1 로 날아간다
    const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
    if (f.x1 < f.x0) ctx.scale(1, -1);
    ctx.drawImage(im, sx, sy, S.w, S.h, -S.px * k, -S.py * k, S.w * k, S.h * k);
  }
  ctx.restore();
  return true;
}
