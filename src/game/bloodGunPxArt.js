/* ── 크림슨 레퀴엠 · 혈계 추격 연출 그리기 — pixelfx(MIT) 픽셀 시트(11월 13일) ─────────────
   수치는 bloodGunPxData.js. 판정은 하지 않는다. 시트를 아직 못 불러왔으면 false 를 돌려주고,
   부른 쪽(bloodGunArt.js)이 예전 코드 도트 그림으로 대신 그린다. 시각은 판정 수치(bloodGunData.js)에서 읽는다.
   시트라 알갱이 계산이 없다 — 사람 많은 맵에서도 시트 몇 장을 찍을 뿐이다. 유도 혈탄 6발은 같은 시트를 6번 찍는다. */
import { BLOOD_PX_SRC, BLOOD_PX_SHEETS as SH, BLOOD_PX_LOOK as L } from "./bloodGunPxData.js";
import { BLOOD_SKILLS, BLOOD_PALETTE as P } from "./bloodGunData.js";

const S = BLOOD_SKILLS.blood_gun.skill, MAXN = BLOOD_SKILLS.blood_gun.passive.max;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) {
    im = imgs[name] = new Image();
    im.onerror = () => { imgs[name] = null; };
    im.src = `${BLOOD_PX_SRC}${name}.webp`;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// 크림슨 레퀴엠을 든 사람이 보이면 미리 받아 둔다 — 첫 시전 때 예전 그림으로 보이지 않게
export function warmBloodPx() { Object.keys(SH).forEach(sheet); }
const ready = (...names) => names.map(sheet).every(Boolean);   // 모두 부른 뒤 본다(앞이 덜 와도 뒤를 함께 받는다)

// 한 번짜리 시트에서 진행 u(0~1) 에 맞는 칸 · 반복 시트에서 시간 t 에 맞는 칸
const once = (name, u) => Math.min(SH[name].n - 1, Math.floor(clamp(u) * SH[name].n));
const loop = (name, t, spin) => Math.floor(((t / spin) % 1 + 1) % 1 * SH[name].n) % SH[name].n;
const noise = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// 한 칸을 (x, y) 에 — 칸의 (cx, cy) 가 (x, y) 에 온다. rot 돌리기 · sy 위아래 누름 ·
// tail 은 기준점에서 왼쪽(뒤)으로 그릴 한도(1배 픽셀, 꼬리가 몸 뒤로 삐져나오지 않게 자른다)
function cell(ctx, name, i, x, y, k, alpha = 1, rot = 0, sy = 1, tail = Infinity) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return;
  const sx = (i % T.cols) * T.w, sY = Math.floor(i / T.cols) * T.h;
  const cut = Math.max(0, T.cx - tail);                      // 왼쪽에서 잘라 낼 폭
  if (cut >= T.w) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sy !== 1) ctx.scale(1, sy);
  ctx.drawImage(im, sx + cut, sY, T.w - cut, T.h, (-T.cx + cut) * k, -T.cy * k, (T.w - cut) * k, T.h * k);
  ctx.restore();
}
// 범위 표시 — 1px 얇은 끊어진 고리
function range(ctx, x, y, r, sq, alpha, color = P.bright, dash = 6) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash ? [dash, dash] : []);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}

// ── 1단계 · 혈계 발사 준비(0.4초): 발밑에 붉은 룬 원이 켜지고 총구에 붉은 구슬이 부푼다 · 심장 박동 고리 두 번
function charge(ctx, f, t, sq) {
  if (!ready("bg_charge", "bg_circle")) return false;
  const u = clamp(t / S.charge), ax = f.ax || 1, ay = f.ay || 0;
  const mx = f.x + ax * 30, my = f.y - 38 + ay * 30 * sq;
  const fade = u > 0.85 ? (1 - u) / 0.15 : 1;
  cell(ctx, "bg_circle", once("bg_circle", u), f.x, f.y + 2, L.circle.k, 0.95 * fade, 0, 1);
  for (const b of [0.06, 0.24]) {
    const k = clamp((u - b) / 0.32); if (k <= 0 || k >= 1) continue;
    range(ctx, f.x, f.y, 14 + 40 * k, sq, 0.95 * (1 - k), P.bright, 0);
  }
  cell(ctx, "bg_charge", once("bg_charge", u), mx, my, L.charge.k * (0.7 + 0.3 * u), fade);
  return true;
}

// ── 2단계 · 관통 혈탄: 총구 섬광 → 붉은 혈탄이 꼬리를 끌며 reach 끝까지 → 끝에서 잦아든다
function shot(ctx, f, t, sq) {
  if (!ready("bg_bolt", "bg_muzzle")) return false;
  const ax = f.ax || 1, ay = f.ay || 0, mx = f.x + ax * 30, my = f.y - 38 + ay * 30 * sq;
  const rot = Math.atan2(ay * sq, ax), scr = Math.hypot(ax, ay * sq);          // 화면에서 한 칸이 가는 거리
  const travel = f.len / f.v, d = Math.min(f.len, f.v * t) * scr;
  const fade = t > travel ? clamp(1 - (t - travel) / 0.14) : 1;
  const hx = mx + ax * Math.min(f.len, f.v * t), hy = my + ay * Math.min(f.len, f.v * t) * sq;
  const B = L.bolt;
  cell(ctx, "bg_bolt", loop("bg_bolt", t, B.loopT), hx, hy, B.k, fade, rot, 1, d / B.k);
  if (t < L.muzzle.play) cell(ctx, "bg_muzzle", once("bg_muzzle", t / L.muzzle.play), mx, my, L.muzzle.k, 1, rot);
  return true;
}

// ── 적중 충격: 관통 혈탄 = 큰 충격 · 유도 혈탄 = 불꽃 · fade(쫓을 적이 없다) = 작은 불꽃으로 흩어짐
function hit(ctx, f, t, sq) {
  const u = clamp(t / f.life), x = f.x, y = f.y - 26;
  if (f.fade) { if (!ready("bg_spark")) return false; cell(ctx, "bg_spark", once("bg_spark", u), x, y, L.spark.k * 0.7, 0.8, noise(x * 0.13 + y * 0.07) * TAU); return true; }
  if (f.big) {
    if (!ready("bg_pierce")) return false;
    cell(ctx, "bg_pierce", once("bg_pierce", u), x, y, L.pierce.k, 1);
    range(ctx, f.x, f.y, 14 + 36 * u, sq, 0.8 * (1 - u), P.bright, 0);
    return true;
  }
  if (!ready("bg_spark")) return false;
  cell(ctx, "bg_spark", once("bg_spark", u), x, y, L.spark.k, 1, noise(x * 0.13 + y * 0.07 + 1) * TAU);
  return true;
}

// ── 3단계 · 피의 추적자: 첫 적중 자리에서 혈액 에너지가 한 점으로 응축 → 유도 혈탄 6발이 곡선으로 목표를 쫓는다
function target(g, b) {   // 쫓는 목표의 지금 자리 — 살아 있는 몹(사람)을 따라가고, 없으면 마지막으로 알린 자리
  const o = b[2] ? g?.mobs?.find((m) => m.id === b[1]) : g?.heroes?.[b[1]];
  return o && !o.dead ? [o.x, o.y - 26] : [b[3], b[4] - 26];
}
function seek(ctx, f, t, sq, g) {
  if (!ready("bg_seeker", "bg_form")) return false;
  const sx = f.x, sy = f.y - 28, K = L.seeker;
  if (f.form > 0 && t < f.form) cell(ctx, "bg_form", once("bg_form", t / f.form), sx, sy, L.form.k, 1);
  for (const b of f.b) {
    const [i, , , , , delay, T, bend] = b, a0 = i * TAU / S.n + 0.4;
    if (t < delay) {   // 응축한 혈탄이 잠시 공중에서 돈다(꼬리 없이 머리만)
      const k = clamp(t / (f.form * 0.8 || 1)), a = a0 + t * 8, r = 8 + 14 * k;
      cell(ctx, "bg_seeker", loop("bg_seeker", t + i * 0.07, K.loopT), sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.75, K.k * (0.4 + 0.5 * k), 0.4 + 0.6 * k, 0, 1, 4);
      continue;
    }
    const u = (t - delay) / T; if (u >= 1.02) continue;
    const a = a0 + delay * 8, ox = sx + Math.cos(a) * 22, oy = sy + Math.sin(a) * 16;
    const [ex, ey] = target(g, b), dx = ex - ox, dy = ey - oy, len = Math.hypot(dx, dy) || 1;
    const cx = (ox + ex) / 2 - dy / len * bend, cy = (oy + ey) / 2 + dx / len * bend;
    const at = (k) => { const kk = Math.pow(clamp(k), 1.35), w = 1 - kk; return [w * w * ox + 2 * w * kk * cx + kk * kk * ex, w * w * oy + 2 * w * kk * cy + kk * kk * ey]; };
    const [hx, hy] = at(u), [nx, ny] = at(u + 0.03), [px, py] = at(u - 0.03);
    const rot = Math.atan2(ny - py, nx - px), run = Math.hypot(hx - ox, hy - oy);   // 머리가 보는 방향 · 출발점에서 온 거리(꼬리가 출발점 뒤로 삐져나가지 않게)
    cell(ctx, "bg_seeker", loop("bg_seeker", t + i * 0.07, K.loopT), hx, hy, K.k, 1, rot, 1, Math.min(K.tailMax, run / K.k + 6));
  }
  return true;
}

// ── 4단계 · 혈흔 공명: 붉은 인장이 몸에 새겨지고 번쩍인다(중첩이 많을수록 크다) · 폭발 반경으로 퍼지는 얇은 고리
function res(ctx, f, t, sq) {
  if (!ready("bg_res")) return false;
  const u = clamp(t / f.life), n = clamp(f.n || 1, 1, MAXN), x = f.x, y = f.y - 26;
  cell(ctx, "bg_res", once("bg_res", u), x, y, L.res.k + L.res.kStack * n, 1);
  range(ctx, f.x, f.y, S.boomR * (0.3 + 0.7 * u), sq, 0.55 * (0.4 + 0.6 * u), P.bright, 6);
  return true;
}

// ── 5단계 · 혈계 처형: 붉은 에너지 폭발 · 5중첩은 검은 핵이 있는 큰 폭발 · 실제 반경은 1px 고리
function boom(ctx, f, t, sq) {
  const full = (f.n || 1) >= MAXN;
  if (!ready(full ? "bg_boom5" : "bg_boom")) return false;
  const u = clamp(t / f.life), x = f.x;
  if (full) {
    if (!ready("bg_boom")) return false;
    cell(ctx, "bg_boom", once("bg_boom", u), x, f.y - 12, L.boom.k * 1.1, 0.9);
    cell(ctx, "bg_boom5", once("bg_boom5", u), x, f.y - 6, L.boom5.k, 1);
  } else cell(ctx, "bg_boom", once("bg_boom", u), x, f.y - 12, L.boom.k * (0.85 + 0.06 * (f.n || 1)), 1);
  range(ctx, f.x, f.y, f.r * Math.min(1, u * 2.4), sq, 0.85 * (1 - u * u), full ? P.glow : P.bright, 0);
  return true;
}

const KINDS = { sk_blood_charge: charge, sk_blood_shot: shot, sk_blood_hit: hit, sk_blood_seek: seek, sk_blood_res: res, sk_blood_boom: boom };
// t 는 시작부터 지난 초. 그렸으면 true, 시트가 없으면 false(예전 도트 그림으로)
export function drawBloodPx(ctx, f, t, sq, g) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { return fn(ctx, f, t, sq, g); } finally { ctx.restore(); }
}
