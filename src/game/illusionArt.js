/* ── 히든 직업 Illusionist 005(마술사) 그리기(11월 17일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(illusionData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/illusionist/px/*.webp, illusionPxData.js)로만 그린다(Engineer 003 과 같은 방식).
   코드로 그리는 것은 예고 · 범위를 보이는 1px 선뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   범위 안은 큰 형상(상자 · 거울 · 주먹 · 폭발)과 작은 입자(il_bits — 카드 조각 · 반짝임 · 유리 조각 · 연기)로 채운다.
   입자 수는 한 연출 · 한 프레임 상한(IL_BITS)이 있고 연출 품질(DETAIL)에 따라 준다.
   연출 종류: sk_il_card · hit(절단 카드) · ready · spend(트릭) · shuffle(폭렬 셔플) · slash · cut(덱 슬래시) · prison(카드 프리즌)
              · blink(카드 블링크) · fist(팬텀 피스트) · mirror(미러 하우스) · ghost(잔상) · final(최후의 셔플) */
import { ILLUSION_COLORS as C } from "./illusionData.js";
import { illusionView } from "./illusionJob.js";
import { ILLUSION_PX_SRC, ILLUSION_PX as SH } from "./illusionPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const K = 2;
let DETAIL = 1;
const nq = (n) => Math.max(1, Math.round(n * DETAIL));
const ROW = { white: 0, blue: 1, mirror: 2 };
const rnd = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${ILLUSION_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
let warmed = 0;
export function warmIllusion() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) sheet(k); }

// 한 칸 — i 칸 · row 색 줄 · k 정수 배 · flip 좌우 뒤집기 · rot 회전(라디안)
function cell(ctx, name, i, x, y, k = K, alpha = 1, row = 0, flip = false, rot = 0) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(k));
  const sx = (j % T.cols) * T.w, sy = (Math.floor(j / T.cols) + (T.rows ? row : 0)) * T.h;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * kk, -T.cy * kk, T.w * kk, T.h * kk);
  ctx.restore();
  return true;
}
// 가로로 늘려 그리는 띠(절단선) — 세로는 정수 배, 가로는 길이에 맞춘다
function strip(ctx, name, i, x, y, ang, len, kh, alpha = 1, row = 0) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0 || len < 1) return;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(kh));
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.drawImage(im, (j % T.cols) * T.w, (Math.floor(j / T.cols) + (T.rows ? row : 0)) * T.h, T.w, T.h, 0, -T.cy * kk, len, T.h * kk);
  ctx.restore();
}
let NOW = 0;
const once = (name, u, n = SH[name].n) => Math.min(n - 1, Math.floor(clamp(u) * n));
const loop = (n, spin, off = 0) => Math.floor((((NOW + off) / spin) % 1 + 1) % 1 * n) % n;
function ring(ctx, x, y, r, sq, color, a, dash = 0) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.ellipse(Math.round(x) + 0.5, Math.round(y) + 0.5, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}
function line(ctx, x0, y0, x1, y1, color, a, dash = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); ctx.stroke(); ctx.restore();
}
// 곧은 띠의 판정 테두리(1px) — 덱 슬래시 · 팬텀 피스트 예고
function bandEdge(ctx, x0, y0, ax, ay, len, w, sq, color, a) {
  const n = Math.hypot(ax, ay * sq) || 1, ox = (-ay * sq / n) * w / 2, oy = (ax / n) * w / 2 * sq;
  const x1 = x0 + ax * len, y1 = y0 + ay * len * sq;
  line(ctx, x0 + ox, y0 + oy, x1 + ox, y1 + oy, color, a, 3);
  line(ctx, x0 - ox, y0 - oy, x1 - ox, y1 - oy, color, a, 3);
  line(ctx, x1 + ox, y1 + oy, x1 - ox, y1 - oy, color, a);
}

/* ── 작은 입자 — 범위를 촘촘히 채운다(사용자가 여러 번 짚은 "범위에 비해 비어 보임") ─────────────
   il_bits 한 칸을 범위 안에 뿌린다. 자리 · 속도 · 늦게 나오는 정도는 연출마다 정해진 씨앗으로 정해져 프레임마다 이어진다.
   한 연출 · 한 프레임에 그리는 수에 상한을 둔다. 판정과 상관없는 장식이라 DETAIL 에 따라 준다 */
const BIT = { cardw: 0, cardp: 1, spkl: 2, spkc: 3, glass: 4, smk: 5 };
export const IL_BITS = { perFx: 64, perFrame: 380 };
let bitFrame = -1, bitLeft = IL_BITS.perFrame;
function bitBudget(n) {
  if (NOW !== bitFrame) { bitFrame = NOW; bitLeft = IL_BITS.perFrame; }
  const k = Math.max(0, Math.min(n, bitLeft)); bitLeft -= k; return k;
}
/* spec — { 종류: 개수 }. o: r 퍼질 반지름 · out 바깥으로 나는 거리(반지름 비율, 음수면 안으로) · up 튀는 높이 · lift 그리는 높이 · spread 시작 시각 흩어짐 · k 배율 */
function bits(ctx, seed, x, y, sq, u, spec, o = {}) {
  if (u < 0 || u > 1) return;
  const R = o.r || 40, out = o.out ?? 0.6, lift = o.lift ?? 0, spread = o.spread ?? 0.35, kk = o.k || K;
  let total = 0; for (const n of Object.values(spec)) total += nq(n);
  let left = bitBudget(Math.min(IL_BITS.perFx, total)), idx = 0;
  for (const [kind, n0] of Object.entries(spec)) {
    const n = nq(n0);
    for (let i = 0; i < n && left > 0; i++, idx++) {
      const s0 = seed * 7.13 + idx;
      const st = rnd(s0, 1) * spread, len = 1 - spread * 0.5;
      const v = (u - st) / len; if (v < 0 || v > 1) continue;
      left--;
      const a = rnd(s0, 2) * TAU, d0 = Math.sqrt(rnd(s0, 3)) * R;
      const go = (kind === "smk" ? 0.25 : out) * R * (0.5 + rnd(s0, 4)) * (1 - (1 - v) ** 2);
      let px = x + Math.cos(a) * (d0 + go), py = y + Math.sin(a) * (d0 + go) * sq - lift;
      if (kind === "cardw" || kind === "cardp" || kind === "glass") { const up = (o.up ?? 40) * (0.5 + rnd(s0, 5)); py -= up * 4 * v * (1 - v); }   // 튀어 올랐다 떨어진다
      if (kind === "smk") py -= (o.up ?? 40) * 0.6 * v;
      if (kind === "cardw" || kind === "cardp" || kind === "glass") cell(ctx, "il_bits", (loop(8, 0.3, rnd(s0, 6)) + idx) % 8, px, py, kk, 1 - v * v, BIT[kind]);
      else cell(ctx, "il_bits", once("il_bits", v), px, py, kind === "smk" ? kk + 1 : kk, kind === "smk" ? 0.7 : 1, BIT[kind]);
    }
  }
}
const seedOf = (f) => (f.x0 ?? f.x ?? 0) * 0.37 + (f.y0 ?? f.y ?? 0) * 0.61 + (f.pi || 0) * 3.1;

/* 절단 카드 — 0.00 손 위에서 카드가 돈다 → 0.09 얇은 흰 선을 남기며 직선으로 */
function card(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, row = f.row || 0;
  if (t < f.d) return void cell(ctx, "il_card", loop(8, 0.1), f.x0 + ax * 10, f.y0 - 6, K, 1, row);
  const d = Math.min(f.len, f.v * (t - f.d)), x = f.x0 + ax * d, y = f.y0 + ay * d * sq;
  const back = Math.min(d, 90), ang = Math.atan2(ay * sq, ax);
  strip(ctx, "il_cut", 1, x - ax * back, y - ay * back * sq, ang, back, 1, 0.9, 0);
  cell(ctx, "il_card", loop(8, 0.12), x, y, K, 1, row);
  if (DETAIL > .5) for (let i = 0; i < 2; i++) { const b = d - 16 - i * 26; if (b > 6) cell(ctx, "il_bits", loop(6, 0.18, i * .09), f.x0 + ax * b, f.y0 + ay * b * sq + (i ? 5 : -5), 1, .85, i ? BIT.spkl : BIT.spkc); }
}
function hit(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "il_shard", once("il_shard", u), f.x, f.y - 26, K, 1, 0, (f.ax || 1) < 0);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { cardw: 3, spkc: 4, spkl: 3 }, { r: 18, lift: 26, up: 22, spread: .2 });
}
// 트릭 3개 — 내 둘레에 카드 셋이 돈다
function ready(ctx, f, t, sq) {
  const u = t / f.life;
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + u * 5; cell(ctx, "il_card", loop(8, 0.2, i * .1), f.x + Math.cos(a) * 30, f.y - 44 + Math.sin(a) * 12, K, 1 - u * u, f.row || 0); }
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spkl: 6, spkc: 4 }, { r: 34, lift: 44, up: 16, spread: .5 });
}
// 트릭 3개를 쓴다 — 카드 셋이 앞으로 흩어진다
function spend(ctx, f, t, sq) {
  const u = t / f.life;
  for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6, d = 20 + u * 50; cell(ctx, "il_card", loop(8, 0.08, i * .1), f.x + Math.cos(a) * d * (f.dir || 1), f.y - 44 + Math.sin(a) * d * 0.5, K, 1 - u, f.row || 0); }
  cell(ctx, "il_flash", once("il_flash", u), f.x, f.y - 44, K, 1 - u * .5);
}

/* 폭렬 셔플 — 0.00 손 위 부채 → 0.15~0.55 카드가 차례로 날아간다 → 0.70 같은 자리 폭발(반지름 = 판정) */
function shuffle(ctx, f, t, sq) {
  const n = f.n || 5, gap = n > 1 ? (f.last - f.first) / (n - 1) : 0, R = f.r;
  if (t < f.last + 0.1) cell(ctx, "il_fan", once("il_fan", t / f.first), f.x0, f.y0 + 6, K, t < f.last ? 1 : 1 - (t - f.last) / 0.1);
  if (t < f.end) ring(ctx, f.x, f.y, R, sq, C.base, 0.45 + 0.4 * (t / f.end), 4);
  for (let i = 0; i < n; i++) {
    const t0 = f.first + i * gap, u = (t - t0) / f.fly;
    const a = rnd(i, 5) * TAU, d = R * 0.45 * Math.sqrt(rnd(i, 9)), tx = f.x + Math.cos(a) * d, ty = f.y + Math.sin(a) * d * sq;
    if (u >= 0 && u < 1) {
      const x = f.x0 + (tx - f.x0) * u, y = f.y0 + (ty - f.y0) * u - Math.sin(u * Math.PI) * 40;
      cell(ctx, "il_card", loop(8, 0.06, i * .05), x, y, K, 1, f.row || 0);
      strip(ctx, "il_cut", 1, f.x0 + (tx - f.x0) * Math.max(0, u - 0.25), f.y0 + (ty - f.y0) * Math.max(0, u - 0.25), Math.atan2(ty - f.y0, tx - f.x0), Math.hypot(tx - f.x0, ty - f.y0) * Math.min(u, 0.25), 1, 0.8);
    }
    const v = (t - t0 - f.fly) / 0.4;
    if (v >= 0 && v < 1) { cell(ctx, "il_burst", once("il_burst", v), tx, ty - 6, K, 1); bits(ctx, seedOf(f) + i * 17, tx, ty, sq, v, { cardw: 4, spkl: 4, spkc: 3 }, { r: 30, up: 30, spread: .2 }); }
  }
  // 폭발 전 — 겨눈 범위 안을 도는 카드 조각 · 반짝임(비어 보이지 않게)
  if (t < f.end) bits(ctx, seedOf(f) + 3, f.x, f.y, sq, t / f.end, { spkl: 14, spkc: 8, cardp: 6 }, { r: R * 0.95, out: -0.2, lift: 8, up: 20, spread: .7 });
  if (t >= f.end) {
    const v = (t - f.end) / (f.life - f.end);
    cell(ctx, "il_burst", once("il_burst", v), f.x, f.y, Math.max(2, Math.round(R / SH.il_burst.r)));
    for (let i = 0; i < nq(5); i++) { const a = i * TAU / 5 + 0.3, d = R * 0.6; cell(ctx, "il_burst", once("il_burst", v + 0.1), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq, K, .9); }
    bits(ctx, seedOf(f) + 5, f.x, f.y, sq, v, { cardw: 14, cardp: 10, spkc: 12, spkl: 10, smk: 10 }, { r: R * 0.8, out: .35, up: 60, spread: .3 });
  }
}

/* 덱 슬래시 — 0.00 시전자 둘레 카드 반원 → 두 번 전진 · 참격(첫 흰빛 · 두 번째 보랏빛). 몸은 판정이 옮긴다 */
function slash(ctx, f, t, sq, h) {
  const ax = f.ax || 1, ay = f.ay || 0, hx = h ? h.x : f.x, hy = h ? h.y : f.y, ang = Math.atan2(ay * sq, ax);
  if (t < f.d) {
    for (let i = 0; i < 7; i++) { const a = ang - Math.PI / 2 + (i / 6) * Math.PI; cell(ctx, "il_card", loop(8, 0.1, i * .03), hx + Math.cos(a) * 34, hy - 30 + Math.sin(a) * 26, K, t / f.d, f.row || 0); }
    bandEdge(ctx, f.x, f.y, ax, ay, f.len, f.w, sq, C.base, 0.6);
    return;
  }
  for (let s = 0; s < 2; s++) {
    const u = (t - f.d - s * f.seg) / (f.seg + 0.12);
    if (u < 0 || u > 1) continue;
    cell(ctx, "il_arc", once("il_arc", u), hx + ax * 10, hy - 30, K, 1, s, false, s ? ang + Math.PI : ang);
    bits(ctx, seedOf(f) + s * 9, hx, hy, sq, u, { cardw: s ? 0 : 8, cardp: s ? 8 : 0, spkc: 6, spkl: 6 }, { r: f.w * 0.5, lift: 26, up: 24, spread: .3 });
  }
}
// 전진 한 번이 지나간 띠 — 흰(보라) 절단선 여러 줄과 흩어지는 카드
function cut(ctx, f, t, sq) {
  const u = t / f.life, ax = f.ax || 1, ay = f.ay || 0, ang = Math.atan2(ay * sq, ax), half = f.len / 2;
  const n = Math.hypot(ax, ay * sq) || 1, px = -ay * sq / n, py = ax / n;
  for (let i = 0; i < nq(5); i++) {
    const o = (i - 2) * f.w * 0.18 * sq, sx = f.x - ax * half + px * o, sy = f.y - 30 - ay * half * sq + py * o;
    strip(ctx, "il_cut", once("il_cut", u), sx, sy, ang, f.len, i === 2 ? 2 : 1, 1 - u * 0.3, f.m ? 1 : 0);
  }
  for (let i = 0, k = nq(4); i < k; i++) {
    const d = (i + 0.5) / k;
    bits(ctx, seedOf(f) + i * 13, f.x - ax * half + ax * f.len * d, f.y - ay * half * sq + ay * f.len * d * sq, sq, u, { cardw: f.m ? 1 : 4, cardp: f.m ? 4 : 1, spkc: 3, smk: 1 }, { r: f.w * 0.45, lift: 20, up: 30, spread: .2 });
  }
}

/* 카드 프리즌 — 0.00~0.30 상자가 생긴다 → 0.30~1.50 안에서 네 번 → 1.70 접히며 최종 폭발 */
function prison(ctx, f, t, sq) {
  const R = f.r, k = R / SH.il_box.r;
  if (t < f.end) ring(ctx, f.x, f.y, R, sq, C.base, t < f.form ? 0.5 + 0.5 * t / f.form : 0.6, t < f.form ? 4 : 0);
  let i;
  if (t < f.form) i = once("il_box", t / f.form, 4);
  else if (t < f.end - 0.1) i = 4 + loop(4, 0.4);
  else i = 8 + Math.min(3, Math.floor((t - f.end + 0.1) / 0.075));
  if (t < f.end + 0.2) cell(ctx, "il_box", i, f.x, f.y - 10 * k, k, t > f.end ? 1 - (t - f.end) / 0.2 : 1);
  (f.hits || []).forEach((h0, j) => {
    const v = (t - h0) / 0.3; if (v < 0 || v > 1) return;
    const a = rnd(j, 11) * TAU, d = R * 0.4 * Math.sqrt(rnd(j, 12)), x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * sq;
    cell(ctx, "il_shard", once("il_shard", v), x, y - 20, 3, 1, 0, j % 2 === 1);
    strip(ctx, "il_cut", once("il_cut", v), x - 50, y - 20 - (j % 2 ? -30 : 30), j % 2 ? -0.55 : 0.55, 110, 1, 1, j % 2);
    bits(ctx, seedOf(f) + j * 23, x, y, sq, v, { cardw: 5, spkc: 4, spkl: 4 }, { r: 40, lift: 20, up: 26, spread: .2 });
  });
  // 갇힌 동안 상자 안을 떠도는 카드 · 반짝임
  if (t >= f.form * 0.5 && t < f.end) bits(ctx, seedOf(f) + 7, f.x, f.y, sq, (t - f.form * 0.5) / (f.end - f.form * 0.5), { cardp: 12, cardw: 8, spkl: 16, spkc: 8 }, { r: R * 0.9, out: -0.15, lift: 10, up: 30, spread: .8 });
  if (t >= f.end) {
    const v = (t - f.end) / (f.life - f.end);
    cell(ctx, "il_burst", once("il_burst", v), f.x, f.y, Math.max(2, Math.round(R * 0.8 / SH.il_burst.r)));
    bits(ctx, seedOf(f) + 3, f.x, f.y, sq, v, { cardw: 14, cardp: 14, spkc: 10, smk: 10 }, { r: R * 0.7, out: .5, up: 70, spread: .25 });
  }
}

/* 카드 블링크 — 0.00 원래 자리 카드 넷 → 0.12 새 자리 섬광 → 0.22 원래 자리 분신 폭발(반지름 = 판정) */
function blink(ctx, f, t, sq) {
  const R = f.r;
  if (t < f.boom) {
    ring(ctx, f.x, f.y, R, sq, C.base, 0.6, 3);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * 8; cell(ctx, "il_card", loop(8, 0.08, i * .1), f.x + Math.cos(a) * 22, f.y - 34 + Math.sin(a) * 14, K, 1, f.row || 0); }
    if (t >= f.jump) cell(ctx, "il_card", 0, f.x, f.y - 30, 4, 0.55, 2);   // 남겨 둔 카드 분신
  }
  if (t >= f.jump - 0.04) {
    const v = (t - f.jump + 0.04) / 0.3;
    if (v < 1) { cell(ctx, "il_flash", once("il_flash", v), f.x1, f.y1 - 30, 3); bits(ctx, seedOf(f) + 1, f.x1, f.y1, sq, v, { spkl: 8, spkc: 6, cardw: 4 }, { r: 34, lift: 30, up: 20, spread: .2 }); }
    line(ctx, f.x, f.y - 30, f.x1, f.y1 - 30, C.cream, 0.5 * (1 - clamp(v)), 4);
  }
  if (t >= f.boom) {
    const v = (t - f.boom) / (f.life - f.boom);
    cell(ctx, "il_burst", once("il_burst", v), f.x, f.y, Math.max(2, Math.round(R / SH.il_burst.r)));
    cell(ctx, "il_ghost", once("il_ghost", v), f.x, f.y - 30, 3, 1, 1);
    bits(ctx, seedOf(f) + 2, f.x, f.y, sq, v, { cardw: 10, cardp: 8, spkl: 10, glass: 6, smk: 6 }, { r: R * 0.85, out: .4, up: 50, spread: .25 });
  }
}

/* 팬텀 피스트 — 0.00~0.25 압축 → 0.25~0.50 직선 전진 → 0.50 충돌 → 0.50~0.80 카드 조각 */
function fist(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, ang = Math.atan2(ay * sq, ax), flip = ax < 0, rot = flip ? ang - Math.PI : ang;
  if (t < f.hit) bandEdge(ctx, f.x, f.y, ax, ay, f.len, f.w, sq, C.base, 0.55 + 0.3 * t / f.hit);
  const kk = Math.max(3, Math.round(f.w / 60));
  if (t < f.form) {
    cell(ctx, "il_fist", once("il_fist", t / f.form, 4), f.x0 + ax * 40, f.y0 + ay * 40 * sq, kk, 1, 0, flip, rot);
    bits(ctx, seedOf(f), f.x0 + ax * 40, f.y0 + 34, sq, t / f.form, { cardw: 8, cardp: 6 }, { r: 60, out: -0.7, lift: 34, up: 10, spread: .4 });
  } else if (t < f.hit) {
    const u = (t - f.form) / (f.hit - f.form), d = 40 + (f.len - 40) * u;
    cell(ctx, "il_fist", 4 + Math.min(3, Math.floor(u * 4)), f.x0 + ax * d, f.y0 + ay * d * sq, kk, 1, 0, flip, rot);
    for (let i = 0, n = nq(5); i < n; i++) { const o = (i - (n - 1) / 2) * f.w * 0.16; strip(ctx, "il_cut", 1, f.x0 + ax * 30, f.y0 + o * sq, ang, Math.max(1, d - 70), 1, 0.7, i % 2); }
  } else {
    const v = (t - f.hit) / (f.life - f.hit), d = f.len;
    cell(ctx, "il_fist", 8 + Math.min(1, Math.floor(v * 2)), f.x0 + ax * d, f.y0 + ay * d * sq, kk, 1 - v * 0.5, 0, flip, rot);
    cell(ctx, "il_burst", once("il_burst", v), f.x + ax * d, f.y + ay * d * sq, Math.max(3, Math.round(f.w / 2 / SH.il_burst.r)));
    // 띠 전체에 흩어지는 카드 조각(뒤로)
    for (let i = 0, n = nq(5); i < n; i++) {
      const dd = f.len * (i + 0.5) / n;
      bits(ctx, seedOf(f) + i * 19, f.x + ax * dd, f.y + ay * dd * sq, sq, v, { cardw: 4, cardp: 3, spkc: 3, smk: 2 }, { r: f.w * 0.45, out: .3, up: 50, spread: .25 });
    }
  }
}

/* 미러 하우스 — 0.00~0.45 거울 프레임 넷이 솟는다 → 8초 유지. 반지름 r 1px 테두리 · 안을 도는 카드 조각과 반짝임(거울은 판정 대상이 아니다) */
function mirror(ctx, f, t, sq) {
  const R = f.r, u = t / f.life, fade = t > f.life - 0.5 ? (f.life - t) / 0.5 : 1;
  ring(ctx, f.x, f.y, R, sq, C.base, 0.55 * fade, 5);
  ring(ctx, f.x, f.y, R - 6, sq, C.accent, 0.35 * fade);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, x = f.x + Math.cos(a) * R * 0.82, y = f.y + Math.sin(a) * R * 0.82 * sq;
    const fr = t < f.rise ? once("il_mirror", t / f.rise, 4) : 4 + loop(4, 0.8, i * 0.2);
    cell(ctx, "il_mirror", fr, x, y, 3, fade);
  }
  // 집 안 — 천천히 떠도는 카드 조각 · 반짝임(1.6초 주기로 다시 뿌린다)
  const cyc = 1.6, k = Math.floor(t / cyc), v = (t % cyc) / cyc;
  bits(ctx, seedOf(f) + k * 41, f.x, f.y, sq, v, { cardp: 8, cardw: 6, spkl: 12, spkc: 6, glass: 4 }, { r: R * 0.9, out: .05, lift: 10, up: 30, spread: .6 });
  if (t < f.rise + 0.2) bits(ctx, seedOf(f) + 999, f.x, f.y, sq, t / (f.rise + 0.2), { spkc: 14, glass: 10 }, { r: R, out: .1, lift: 20, up: 40, spread: .3 });
  void u;
}

/* 잔상 — 트릭(라벤더) · 거울(청백) X 자 카드 실루엣. 끝없는 앙코르면 30% 크게 */
function ghost(ctx, f, t, sq) {
  const u = t / f.life, kk = f.big ? 4 : 3;
  cell(ctx, "il_ghost", once("il_ghost", u), f.x, f.y - 30, kk, 1, f.m ? 1 : 0);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, f.m ? { glass: 8, spkc: 6 } : { cardp: 6, spkl: 6 }, { r: f.big ? 40 : 30, lift: 30, up: 24, spread: .2 });
}

/* 최후의 셔플 — 0.00~0.50 카드 12장 원 배열 → 0.60~1.70 0.1초마다 공격 → 1.80 큰 거울 → 2.00 파쇄 · 최종 → (앙코르) 2.12 거울 파쇄 */
function final(ctx, f, t, sq) {
  const R = f.r, n = f.n || 12, hitEnd = f.first + (n - 1) * f.gap;
  if (t < f.end) ring(ctx, f.x, f.y, R, sq, f.full ? C.cream : C.base, 0.5 + 0.3 * Math.min(1, t / 0.5), t < 0.5 ? 4 : 0);
  if (t < f.mirror + 0.1) {
    for (let i = 0; i < n; i++) {
      const a0 = i * TAU / n, ap = Math.min(1, t / 0.5), spin = t > 0.5 ? (t - 0.5) * 1.6 : 0;
      const conv = t > hitEnd ? clamp((t - hitEnd) / (f.mirror - hitEnd)) : 0;
      const d = R * 0.85 * ap * (1 - conv), a = a0 + spin;
      cell(ctx, "il_card", loop(8, 0.12, i * 0.04), f.x + Math.cos(a) * d, f.y - 30 + Math.sin(a) * d * sq, K, ap, f.row || 0);
    }
  }
  for (let i = 0; i < n; i++) {
    const at = f.first + i * f.gap, v = (t - at) / 0.32; if (v < 0 || v > 1) continue;
    const a = rnd(i, 3) * TAU, d = R * 0.6 * Math.sqrt(rnd(i, 7)), x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * sq;
    const a1 = i * TAU / n + (at - 0.5) * 1.6, sx = f.x + Math.cos(a1) * R * 0.85, sy = f.y - 30 + Math.sin(a1) * R * 0.85 * sq;
    strip(ctx, "il_cut", once("il_cut", v), sx, sy, Math.atan2(y - 20 - sy, x - sx), Math.hypot(x - sx, y - 20 - sy), 1, 1, i % 2);
    cell(ctx, "il_shard", once("il_shard", v), x, y - 22, 3, 1, 0, i % 2 === 1);
    bits(ctx, seedOf(f) + i * 29, x, y, sq, v, { cardw: 3, cardp: 2, spkc: 3 }, { r: 34, lift: 18, up: 30, spread: .2 });
  }
  // 공격 내내 넓은 원 안을 채우는 카드 비 · 반짝임
  if (t >= 0.3 && t < f.end) bits(ctx, seedOf(f) + 7, f.x, f.y, sq, (t - 0.3) / (f.end - 0.3), { cardw: 14, cardp: 14, spkl: 18, spkc: 10 }, { r: R * 0.95, out: .05, lift: 10, up: 50, spread: .85 });
  if (t >= hitEnd && t < f.end + 0.6) {
    const v = t < f.end ? (t - hitEnd) / (f.end - hitEnd) : 0;
    const fr = t < f.mirror ? once("il_big", v, 4) : t < f.end ? 4 : 5 + Math.min(6, Math.floor((t - f.end) / 0.08));
    cell(ctx, "il_big", fr, f.x, f.y + 8, Math.max(2, Math.round(R / 120)), 1);
  }
  if (t >= f.end) {
    const v = (t - f.end) / (f.life - f.end);
    cell(ctx, "il_burst", once("il_burst", v), f.x, f.y, Math.max(3, Math.round(R * 0.75 / SH.il_burst.r)));
    bits(ctx, seedOf(f) + 3, f.x, f.y, sq, v, { glass: 18, cardw: 12, cardp: 10, spkc: 12, smk: 10 }, { r: R * 0.75, out: .4, up: 90, spread: .3 });
  }
  if (f.enc && t >= f.encore) {
    const v = (t - f.encore) / (f.life - f.encore);
    cell(ctx, "il_ghost", once("il_ghost", v), f.x, f.y - 40, 6, 1, 1);
    ring(ctx, f.x, f.y, R * (0.4 + 0.6 * v), sq, C.blue, 1 - v);
    bits(ctx, seedOf(f) + 11, f.x, f.y, sq, v, { glass: 20, spkc: 10 }, { r: R * 0.9, out: .3, up: 60, spread: .2 });
  }
}

const KINDS = { sk_il_card: card, sk_il_hit: hit, sk_il_ready: ready, sk_il_spend: spend, sk_il_shuffle: shuffle, sk_il_slash: slash, sk_il_cut: cut,
  sk_il_prison: prison, sk_il_blink: blink, sk_il_fist: fist, sk_il_mirror: mirror, sk_il_ghost: ghost, sk_il_final: final };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const ILLUSION_CAP = { sk_il_card: 10, sk_il_hit: 12, sk_il_ready: 2, sk_il_spend: 2, sk_il_shuffle: 3, sk_il_slash: 2, sk_il_cut: 4,
  sk_il_prison: 3, sk_il_blink: 2, sk_il_fist: 2, sk_il_mirror: 2, sk_il_ghost: 6, sk_il_final: 2 };
const FOLLOW = new Set(["sk_il_ready", "sk_il_spend"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const ILLUSION_GROUND = new Set(["sk_il_mirror"]);

function rowOf(h) { const v = h ? illusionView(h) : null; return v ? ROW[v.tint] || 0 : 0; }

export function drawIllusionFx(ctx, f, p, sq, g, time, quality = 1) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  DETAIL = clamp(quality, .15, 1);
  warmIllusion();
  const h = g && Number.isInteger(f.pi) ? g.heroes && g.heroes[f.pi] : null;
  if (FOLLOW.has(f.kind) && h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y, dir: h.dir };
  if (f.row === undefined) { const row = rowOf(h); if (row) f = { ...f, row }; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq, h && Number.isFinite(h.x) ? h : null); } finally { ctx.restore(); }
  return true;
}

/* 아이콘 한 칸(스킬 단추 · 연습장 · 설명 창) — CSS background. 한 칸 24px 을 size 픽셀로 */
export function illusionIconStyle(i, size = 48) {
  const T = SH.il_icons, k = size / T.w;
  return { width: size, height: size, backgroundImage: `url(${ILLUSION_PX_SRC}il_icons.webp)`, backgroundSize: `${T.w * T.cols * k}px ${T.h * k}px`,
    backgroundPosition: `${-i * T.w * k}px 0`, imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
}
