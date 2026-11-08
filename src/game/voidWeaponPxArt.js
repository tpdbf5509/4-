/* ── 공허 무기 · 차원의 지배자 4세트 연출 그리기 — pixelfx(MIT) 픽셀 시트(11월 7일) ─────────────
   수치는 voidWeaponPxData.js. 판정은 하지 않는다. 시트를 아직 못 불러왔으면 false 를 돌려주고,
   부른 쪽(voidWeaponArt.js)이 예전 코드 도트 그림으로 대신 그린다. 시각은 판정 수치(voidWeaponData.js)에서 읽는다. */
import { VOID_PX_SRC, VOID_PX_SHEETS as SH, VOID_PX_LOOK as L } from "./voidWeaponPxData.js";
import { VOID_SKILLS, voidArrowSpot } from "./voidWeaponData.js";

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) {
    im = imgs[name] = new Image();
    im.onerror = () => { imgs[name] = null; };
    im.src = `${VOID_PX_SRC}${name}.webp`;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// 공허 무기를 든 사람이 보이면 미리 받아 둔다 — 첫 시전 때 비어 보이지 않게
export function warmVoidPx() { Object.keys(SH).forEach(sheet); }
const ready = (...names) => names.map(sheet).every(Boolean);   // 모두 부른 뒤 본다(앞이 덜 와도 뒤를 함께 받는다)

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const fit = (look, r) => Math.min(look.kMax || 9, (2 * r) / look.fit);
// 한 번짜리 시트에서 진행 u(0~1) 에 맞는 칸 · 반복 시트에서 시간 t 에 맞는 칸
const once = (S, u) => Math.min(S.n - 1, Math.floor(clamp(u) * S.n));
const loop = (S, t, spin) => Math.floor(((t / spin) % 1 + 1) % 1 * S.n) % S.n;
// 한 칸을 (x, y) 에 — 칸의 (cx, cy) 가 (x, y) 에 온다. rot 돌리기 · sy 위아래 누름
function cell(ctx, name, i, x, y, k, alpha = 1, rot = 0, sy = 1) {
  const S = SH[name], im = sheet(name); if (!im || alpha <= 0) return;
  const sx = (i % S.cols) * S.w, sY = Math.floor(i / S.cols) * S.h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sy !== 1) ctx.scale(1, sy);
  ctx.drawImage(im, sx, sY, S.w, S.h, -S.cx * k, -S.cy * k, S.w * k, S.h * k);
  ctx.restore();
}
// 범위 표시 — 1px 얇은 끊어진 고리(예전 도트 고리 대신)
function range(ctx, x, y, r, sq, alpha, color = "#a077f0") {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ── 공허의 대검 — 차원 절단: 둘레 6번 X 자 참격(돌려 가며) → 마지막 공간 폭발
function slash(ctx, f, t, sq, g) {
  if (!ready("vw_cut", "vw_burst")) return false;
  const S = VOID_SKILLS.void_great.skill, h = g?.heroes?.[f.pi];
  const x = h && h.down <= 0 ? h.x : f.x, y = (h && h.down <= 0 ? h.y : f.y) - 24;
  const step = (S.dur - S.dur / S.slashes) / (S.slashes - 1), C = L.cut;
  range(ctx, x, y + 24, S.r, sq, 0.45 * clamp(1 - Math.max(0, t - S.dur - 0.1) / 0.3));
  for (let k = 0; k < S.slashes; k++) {
    const age = t - k * step; if (age < 0 || age > C.play) continue;
    // 베기마다 다른 각도 · 좌우를 번갈아 — 몸 둘레를 갈라 놓는다
    cell(ctx, "vw_cut", once(SH.vw_cut, age / C.play), x, y, fit(C, S.r), 1, k * 1.05 + 0.3, k % 2 ? -sq * 1.4 : sq * 1.4);
  }
  const b = t - S.dur;
  if (b >= 0 && b < L.burst.play) cell(ctx, "vw_burst", once(SH.vw_burst, b / L.burst.play), x, y + 14, fit(L.burst, S.burstR), 1, 0, 0.8);
  return true;
}
// ── 공허의 장궁 — 차원 폭우: 하늘 균열 → 화살 8발 낙하 · 착탄
function rain(ctx, f, t, sq) {
  if (!ready("vw_sky", "vw_arrow", "vw_hit")) return false;
  const S = VOID_SKILLS.void_bow.skill, x = f.x, y = f.y, skyY = y - L.sky.lift;
  const open = clamp(t / 0.22) * clamp((S.life - 0.15 - t) / 0.3), show = clamp(t / 0.15) * clamp((S.life - t) / 0.3);
  range(ctx, x, y, S.r, sq, 0.5 * show);
  cell(ctx, "vw_sky", loop(SH.vw_sky, t, L.sky.spin), x, skyY, L.sky.k * (0.5 + 0.5 * open), open, 0, 0.55);
  for (let i = 0; i < S.arrows; i++) {
    const land = S.start + i * S.span / (S.arrows - 1), [sx, sy] = voidArrowSpot(S, i, x, y, sq);
    // 낙하 자리 — 떨어지기 전부터 얇은 고리
    const mark = clamp((t - (land - 0.75)) / 0.15) * (t < land ? 1 : clamp(1 - (t - land) / 0.15));
    range(ctx, sx, sy, S.arrowR * 0.5, sq, 0.6 * mark, "#d3b8ff");
    const fall = (t - (land - S.fall)) / S.fall;
    if (fall > 0 && fall < 1) {   // 균열에서 비스듬히 떨어지는 화살(화살촉이 앞)
      const hx = sx + 70 * (1 - fall), hy = sy - 360 * (1 - fall);
      cell(ctx, "vw_arrow", loop(SH.vw_arrow, t, 0.6), hx, hy, L.arrow.k, 1, Math.atan2(360, -70));
    }
    const hit = t - land;
    if (hit >= 0 && hit < L.hit.play) cell(ctx, "vw_hit", once(SH.vw_hit, hit / L.hit.play), sx, sy, fit(L.hit, S.arrowR), 1);
  }
  return true;
}
// ── 공허의 지팡이 — 특이점 붕괴: 블랙홀(끌어당김 · 수축) → 붕괴 번쩍임
function hole(ctx, f, t, sq) {
  if (!ready("vw_hole", "vw_crush")) return false;
  const S = VOID_SKILLS.void_staff.skill, x = f.x, y = f.y, H = L.hole, C = L.crush;
  const birth = clamp(t / 0.3), end = clamp((S.life - t) / 0.4);
  range(ctx, x, y, S.r, sq, 0.45 * clamp(t / 0.2) * end);
  const squeeze = t < S.pullFor ? 1 : clamp(1 - (t - S.pullFor) / (S.burstAt - S.pullFor));
  if (t < S.burstAt) cell(ctx, "vw_hole", loop(SH.vw_hole, t, H.spin), x, y - 30, fit(H, S.r) * birth * (0.35 + 0.65 * squeeze), birth);
  // 5번의 맥동 — 피해가 들어가는 때마다 얇은 고리가 퍼진다
  for (let i = 0; i < S.ticks; i++) {
    const age = t - (S.first + i * S.gap); if (age < 0 || age > 0.24) continue;
    range(ctx, x, y, S.r * (0.25 + 0.75 * age / 0.24), sq, 1 - age / 0.24, "#d3b8ff");
  }
  const b = t - (S.burstAt - C.lead);
  if (b >= 0 && b < C.lead + C.tail) cell(ctx, "vw_crush", once(SH.vw_crush, b / (C.lead + C.tail)), x, y - 20, fit(C, S.burstR), 1);
  return true;
}
// ── 패시브 · 4세트
function passiveSlash(ctx, f, t, sq) {
  if (!ready("vw_spin")) return false;
  cell(ctx, "vw_spin", once(SH.vw_spin, t / L.spin.play), f.x, f.y - 20, fit(L.spin, f.r), 1);
  range(ctx, f.x, f.y, f.r, sq, 0.4 * clamp(1 - t / 0.55));
  return true;
}
function passiveArrow(ctx, f, t) {
  if (!ready("vw_arrow", "vw_hit")) return false;
  const fall = clamp(t / 0.16);
  if (t < 0.16) { cell(ctx, "vw_arrow", loop(SH.vw_arrow, t, 0.6), f.x + 50 * (1 - fall), f.y - 280 * (1 - fall), L.arrow.k, 1, Math.atan2(280, -50)); return true; }
  cell(ctx, "vw_hit", once(SH.vw_hit, (t - 0.16) / L.hit.play), f.x, f.y, fit(L.hit, f.r), 1);
  return true;
}
function passiveGravity(ctx, f, t) {
  if (!ready("vw_crush")) return false;
  cell(ctx, "vw_crush", once(SH.vw_crush, t / L.gravPas.play), f.x, f.y - 14, fit(L.gravPas, f.r), 1);
  return true;
}
function setBurst(ctx, f, t, sq) {
  if (!ready("vw_set")) return false;
  cell(ctx, "vw_set", once(SH.vw_set, t / L.set.play), f.x, f.y, fit(L.set, f.r), 1);
  range(ctx, f.x, f.y, f.r, sq, 0.5 * clamp(1 - t / 0.5));
  return true;
}
const KINDS = { sk_void_slash: slash, sk_void_rain: rain, sk_void_hole: hole, sk_void_slash_pas: passiveSlash, sk_void_arrow_pas: passiveArrow, sk_void_grav_pas: passiveGravity, sk_void_set: setBurst };
// t 는 시작부터 지난 초. 그렸으면 true, 시트가 없으면 false(예전 그림으로)
export function drawVoidPx(ctx, f, t, sq, g) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { return fn(ctx, f, t, sq, g); } finally { ctx.restore(); }
}
