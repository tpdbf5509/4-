/* ── 히든 직업 Engineer 003(엔지니어) 그리기(11월 17일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(engineerData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/engineer/px/*.webp, engineerPxData.js)로만 그린다(Gambler 002 와 같은 방식).
   코드로 그리는 것은 예고 · 범위를 보이는 1px 선뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   픽셀 그림은 정수 배로만 키운다(보통 2배). 연마 합계 색(청록 · 청백 · 금빛 윤곽)은 기계 시트의 줄로 고른다.
   연출 종류: sk_en_pulse · hit(펄스 발진) · zap(기계 사격) · place · fold(터렛 · 드론 · 수호자) · hexsum(드론 소환) · pad · punch · boom(수호자)
              · magnet(자기장 포획) · rail(직선 레일포) · oc · heat(오버클럭 · 과열) · orbit(궤도 섬멸 명령).
   설치물 몸(터렛 · 드론 · 수호자)은 연출이 아니라 상태(engineerView(h).units)라 rpgArt 가 사람 · 몹과 앞뒤를 맞춰 drawEngineerUnit 으로 그린다 */
import { ENGINEER_COLORS as C, EN_TURRET as TU, EN_MECH as MC, EN_DRONE as DR } from "./engineerData.js";
import { engineerView } from "./engineerJob.js";
import { ENGINEER_PX_SRC, ENGINEER_PX as SH } from "./engineerPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const K = 2;
// 군중·연출 줄이기에서 장식 잔상만 덜고 공격 본체·예고선은 남긴다.
let DETAIL = 1;
const nq = n => Math.max(1, Math.round(n * DETAIL));
const ROW = { teal: 0, pale: 1, gold: 2 };
const rnd = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${ENGINEER_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
let warmed = 0;
export function warmEngineer() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) sheet(k); }

// 한 칸 — i 칸 · row 색 줄 · k 정수 배 · flip 좌우 뒤집기
function cell(ctx, name, i, x, y, k = K, alpha = 1, row = 0, flip = false) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(k));
  const sx = (j % T.cols) * T.w, sy = (Math.floor(j / T.cols) + (T.rows ? row : 0)) * T.h;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * kk, -T.cy * kk, T.w * kk, T.h * kk);
  ctx.restore();
  return true;
}
// 가로로 늘려 그리는 띠(레이저 · 레일포) — 세로는 정수 배, 가로는 길이에 맞춘다. (x, y) 에서 각 ang 으로 len
function strip(ctx, name, i, x, y, ang, len, kh, alpha = 1) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0 || len < 1) return;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(kh));
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.drawImage(im, (j % T.cols) * T.w, Math.floor(j / T.cols) * T.h, T.w, T.h, 0, -T.cy * kk, len, T.h * kk);
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

/* ── 작은 입자(11월 17일 사용자 — "범위는 큰데 이펙트가 작고 자잘한 것이 없어 비어 보인다") ─────────────
   en_bits 시트 한 칸을 범위 안에 여러 개 뿌린다. 자리 · 속도 · 늦게 나오는 정도는 연출마다 정해진 씨앗(seed)으로 정해져
   같은 연출은 매 프레임 같은 입자가 이어서 움직인다. 판정과는 상관없는 장식이라 DETAIL(군중 · 연출 줄이기)에 따라 줄고,
   한 연출 · 한 프레임에 그리는 수에 상한을 둔다(EN_BITS). */
const BIT = { spk: 0, spkg: 1, emb: 2, deb: 3, smk: 4, arc: 5 };
export const EN_BITS = { perFx: 56, perFrame: 360 };   // 한 연출 최대 · 한 프레임 전체 최대(넘으면 그 프레임은 더 그리지 않는다)
let bitFrame = -1, bitLeft = EN_BITS.perFrame;
function bitBudget(n) {
  if (NOW !== bitFrame) { bitFrame = NOW; bitLeft = EN_BITS.perFrame; }
  const k = Math.max(0, Math.min(n, bitLeft)); bitLeft -= k; return k;
}
/* spec — { kind: 개수 }. o: r 퍼질 반지름 · out 바깥으로 나는 거리(반지름 비율) · up 위로 뜨는 높이 · lift 그리는 높이 · gold 금빛 스파크 비율 · k 배율 · spread 시작 시각 흩어짐(0~1) */
function bits(ctx, seed, x, y, sq, u, spec, o = {}) {
  if (u < 0 || u > 1) return;
  const R = o.r || 40, out = o.out ?? 0.6, lift = o.lift ?? 0, spread = o.spread ?? 0.35, kk = o.k || K;
  let total = 0; for (const n of Object.values(spec)) total += nq(n);
  let left = bitBudget(Math.min(EN_BITS.perFx, total)), idx = 0;
  for (const [kind, n0] of Object.entries(spec)) {
    const n = nq(n0);
    for (let i = 0; i < n && left > 0; i++, idx++) {
      const s0 = seed * 7.13 + idx;
      const st = rnd(s0, 1) * spread, len = 1 - spread * 0.5;            // 늦게 나오는 정도 · 사는 길이(연출 비율)
      const v = (u - st) / len; if (v < 0 || v > 1) continue;
      left--;
      const a = rnd(s0, 2) * TAU, d0 = Math.sqrt(rnd(s0, 3)) * R;          // 범위 안 고른 자리
      const go = (kind === "smk" ? 0.25 : out) * R * (0.5 + rnd(s0, 4)) * (1 - (1 - v) ** 2);
      let px = x + Math.cos(a) * (d0 + go), py = y + Math.sin(a) * (d0 + go) * sq - lift;
      if (kind === "deb" || kind === "emb") { const up = (o.up ?? 40) * (0.5 + rnd(s0, 5)); py -= up * 4 * v * (1 - v) * (kind === "emb" ? 1.4 : 1); }   // 튀어 올랐다 떨어진다
      if (kind === "smk") py -= (o.up ?? 40) * 0.6 * v;                      // 연기는 천천히 오른다
      if (kind === "deb") cell(ctx, "en_bits", (loop(8, 0.25, rnd(s0, 6)) + idx) % 8, px, py, kk, 1 - v * v, BIT.deb);
      else if (kind === "arc") cell(ctx, "en_bits", once("en_bits", v), px, py, kk, 1, BIT.arc, rnd(s0, 7) < 0.5);
      else {
        const row = kind === "spk" && rnd(s0, 8) < (o.gold || 0) ? BIT.spkg : BIT[kind];
        cell(ctx, "en_bits", once("en_bits", v), px, py, kind === "smk" ? kk + 1 : kk, kind === "smk" ? 0.75 : 1, row);
      }
    }
  }
}
/* ── 빛 연출(11월 21일 사용자 "빛나는 이펙트를 넣어줘 너무 밋밋해") ─────────────
   참고 그림처럼 바닥 진 · 흰 빛 기둥 · 번짐 · 반짝이를 시트로 얹는다. 번짐 · 기둥 · 반짝이는 빛 더하기(lighter)라 밑 그림이 밝아진다.
   판정과는 상관없는 장식 — 크기만 판정 수치(r 등)를 따른다. 반짝이는 en_bits 와 같은 상한(EN_BITS)을 나눠 쓴다. */
const GLOW_K = 3;   // 번짐 · 바닥 진 최대 배율
function lit(ctx, fn) { ctx.save(); ctx.globalCompositeOperation = "lighter"; try { fn(); } finally { ctx.restore(); } }
// 번짐 — size 화면 반지름
function glow(ctx, x, y, size, a, row = 0) {
  if (a <= 0 || size <= 0) return;
  // 너무 키우면 체크 무늬가 굵은 덩어리로 보여 GLOW_K 배까지만 — 더 넓은 범위는 바닥 진 · 반짝이가 채운다
  lit(ctx, () => cell(ctx, "en_glow", loop(4, .45, x * .013), x, y, clamp(Math.round(size / 23), 1, GLOW_K), a, row));
}
// 바닥 진 — r 화면 반지름, t 연출이 시작된 뒤 초
function sigil(ctx, x, y, r, t, a, row = 0) {
  if (a <= 0) return;
  const i = t < .24 ? Math.min(3, Math.floor(t / .06)) : 4 + loop(8, 1.2, x * .007);
  lit(ctx, () => cell(ctx, "en_sigil", i, x, y, clamp(Math.round(r / SH.en_sigil.r), 1, GLOW_K), a, row));
}
// 빛 기둥 — u 0~1 생애, k 정수 배
function pillar(ctx, x, y, u, k, a, row = 0) {
  if (u < 0 || u > 1 || a <= 0) return;
  lit(ctx, () => cell(ctx, "en_pillar", once("en_pillar", u), x, y, k, a, row));
}
// 반짝이 — 범위 안에서 위로 떠오르며 깜빡인다
function stars(ctx, seed, x, y, sq, u, n, R, row = 0, up = 60) {
  if (u < 0 || u > 1) return;
  const m = bitBudget(nq(n));
  lit(ctx, () => {
    for (let i = 0; i < m; i++) {
      const s0 = seed * 5.71 + i, st = rnd(s0, 1) * .5, v = (u - st) / .5; if (v < 0 || v > 1) continue;
      const a = rnd(s0, 2) * TAU, d = Math.sqrt(rnd(s0, 3)) * R;
      cell(ctx, "en_star", once("en_star", v), x + Math.cos(a) * d, y + Math.sin(a) * d * sq - up * v * (.4 + rnd(s0, 4)), K, 1, row);
    }
  });
}
const seedOf = (f) => (f.x0 ?? f.x ?? 0) * 0.37 + (f.y0 ?? f.y ?? 0) * 0.61 + (f.pi || 0) * 3.1;

/* 펄스 발진 — 0.08초 손목에 사각 광원 · 그 뒤 직선 에너지탄. 뒤에 옅은 잔상 둘 */
function pulse(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, row = f.row || 0;
  if (t < f.d) {
    glow(ctx, f.x0 + ax * 14, f.y0 + ay * 14 * sq, 18, .8, row);
    cell(ctx, "en_charge", once("en_charge", t / f.d), f.x0 + ax * 14, f.y0 + ay * 14 * sq, 1, .85, row);
    return void cell(ctx, "en_flash", once("en_flash", t / f.d), f.x0 + ax * 14, f.y0 + ay * 14 * sq, 1);
  }
  const d = Math.min(f.len, f.v * (t - f.d)), x = f.x0 + ax * d, y = f.y0 + ay * d * sq;
  for (let i = 1, n = nq(4); i <= n; i++) { const b = d - i * 13; if (b > 6) cell(ctx, "en_pulse", loop(4, 0.2, i * 0.05), f.x0 + ax * b, f.y0 + ay * b * sq, 1, .55 * (1-i/(n+1)), row); }
  glow(ctx, x, y, 22, .75, row);
  cell(ctx, "en_pulse", loop(SH.en_pulse.n, 0.16), x, y, 3, 1, row);
  if (DETAIL > .5) for (let i = 0; i < 2; i++) { const b = d - 10 - i * 22; if (b > 6) cell(ctx, "en_bits", (loop(6, 0.18, i * .09)), f.x0 + ax * b, f.y0 + ay * b * sq + (i ? 4 : -4), 1, .8, row === 2 ? BIT.spkg : BIT.spk); }
}
function hit(ctx, f, t, sq) {
  const u = t / f.life;
  glow(ctx, f.x, f.y - 24, f.big ? 46 : 30, 1 - u, f.row || 0);
  cell(ctx, "en_spark", once("en_spark", u), f.x, f.y - 24, f.big ? 4 : 3);
  if (f.big) stars(ctx, seedOf(f), f.x, f.y - 20, sq, u, 5, 26, f.row || 0, 30);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, f.big ? { spk: 8, deb: 4, smk: 2 } : { spk: 5, deb: 2 }, { r: f.big ? 26 : 16, lift: 24, up: 26, spread: .2 });
}

/* 기계 사격 — 총구 섬광 + 짧은 레이저 + 맞은 자리 불꽃. 터렛은 포신 끝, 드론은 몸 아래 렌즈에서 나간다 */
function zap(ctx, f, t, sq) {
  const u = t / f.life, a = f.a || 0;
  let x0 = f.x0, y0 = f.y0;
  if (f.k === 0) { const sa = Math.atan2(Math.sin(a) * sq, Math.cos(a)); x0 += Math.cos(sa) * 24; y0 += -36 + Math.sin(sa) * 24 * 0.6; }
  else y0 += 2;
  const x1 = f.x1, y1 = f.y1 - 22, ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  strip(ctx, "en_laser", once("en_laser", u), x0, y0, ang, len, f.k === 0 ? K : 1, f.oc ? 1 : 0.9);
  if (u < 0.6) cell(ctx, "en_flash", once("en_flash", u / 0.6), x0, y0, 1);
  // 실제 맞은 끝점에만 불꽃을 두고 레이저 중간에는 발사 잔상을 붙인다.
  if (u < .45 && DETAIL > .6) cell(ctx, "en_pulse", 1, x0 + (x1-x0)*u, y0 + (y1-y0)*u, 1, .65);
  glow(ctx, x1, y1, f.k === 0 ? 20 : 14, (1 - u) * .85, f.row || 0);
  cell(ctx, "en_spark", once("en_spark", u), x1, y1, f.k === 0 ? K : 1);
  bits(ctx, seedOf(f), x1, f.y1, sq, u, { spk: 3, deb: 1 }, { r: 10, lift: 22, up: 18, spread: .15, gold: f.oc ? .5 : .1, k: 1 });
}
/* 터렛 자리 — 설치 가능 위치에 1px 녹색 사각 외곽(기획안) */
function place(ctx, f, t, sq) {
  const u = t / f.life, s = 22 + 6 * (1 - u);
  sigil(ctx, f.x, f.y, 32, t, (1 - u) * .8, f.row || 0);
  cell(ctx, "en_assembly", once("en_assembly", u), f.x, f.y, 1);
  ctx.save(); ctx.globalAlpha *= 1 - u * 0.7; ctx.strokeStyle = "#8FE0A6"; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(f.x - s) + 0.5, Math.round(f.y - s * sq) + 0.5, Math.round(s * 2), Math.round(s * 2 * sq)); ctx.restore();
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 6, deb: 5, smk: 2 }, { r: 26, lift: 10, up: 22 });
}
function hexSum(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "en_assembly", once("en_assembly", u), f.x, f.y, 1);
  sigil(ctx, f.x, f.y, 64, t, u > .75 ? (1 - u) / .25 : 1, f.row || 0);
  pillar(ctx, f.x, f.y, u, 1, .9, f.row || 0);
  cell(ctx, "en_hex", u < 0.4 ? once("en_hex", u / 0.4, 4) : 4 + loop(4, 0.4), f.x, f.y, 3, u > 0.75 ? (1 - u) / 0.25 : 1);
  stars(ctx, seedOf(f), f.x, f.y, sq, u, 10, 44, f.row || 0);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 10, arc: 4, deb: 3 }, { r: 40, lift: 30, up: 20, gold: .25 });
}
// 수호자 착지 자리 — 큰 육각 발판(내려오는 동안) · 1px 원
function pad(ctx, f, t, sq) {
  const u = t / f.life;
  sigil(ctx, f.x, f.y, 128, t, u > 0.7 ? (1 - u) / 0.3 : 1, f.row || 0);
  pillar(ctx, f.x, f.y, u, 2, .85, f.row || 0);
  cell(ctx, "en_hex", t < f.d ? once("en_hex", t / f.d, 4) : 4 + loop(4, 0.4), f.x, f.y, 3, u > 0.7 ? (1 - u) / 0.3 : 1);
  if (t < f.d) ring(ctx, f.x, f.y, 70 * (1 - t / f.d) + 20, sq, C.bright, 0.7, 3);
  else {
    const v = (t - f.d) / (f.life - f.d);
    glow(ctx, f.x, f.y - 20, 70, (1 - v), f.row || 0);
    cell(ctx, "en_boom", once("en_boom", v), f.x, f.y, K, .85);
    stars(ctx, seedOf(f), f.x, f.y, sq, v, 14, 80, f.row || 0, 80);
    bits(ctx, seedOf(f), f.x, f.y, sq, v, { smk: 10, deb: 10, spk: 8, emb: 4 }, { r: 70, out: .5, up: 50, spread: .25 });
  }
}
function fold(ctx, f, t) {
  const u = t / f.life;
  if (f.k === 0) cell(ctx, "en_turret", 12 + once("en_turret", u, 3), f.x, f.y, K, 1, f.row || 0);
  else cell(ctx, "en_spark", once("en_spark", u), f.x, f.y + (f.hz || 0) - (f.k === 2 ? 40 : 0), f.k === 2 ? 3 : K);
}
function punch(ctx, f, t, sq) {
  const u = t / f.life;
  glow(ctx, f.x, f.y - 30, 40, 1 - u, f.row || 0);
  cell(ctx, "en_spark", once("en_spark", u), f.x, f.y - 30, 4);
  if (u < .5) cell(ctx, "en_flash", once("en_flash", u / .5), f.x, f.y - 30, K);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 8, deb: 6, smk: 3, emb: 2 }, { r: 30, lift: 30, up: 34, spread: .15, gold: .3 });
}
function boom(ctx, f, t, sq) {
  const u = t / f.life;
  glow(ctx, f.x, f.y - f.r * .3, f.r * .9, 1 - u, f.row || 0);
  cell(ctx, "en_boom", once("en_boom", u), f.x, f.y, f.r / SH.en_boom.r);
  stars(ctx, seedOf(f), f.x, f.y, sq, u, 12, f.r * .7, f.row || 0, 70);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { emb: 14, deb: 14, smk: 12, spk: 10 }, { r: f.r * 0.75, out: .45, up: 70, spread: .3, gold: .4 });
}

/* 자기장 포획 — 0.00 청록 안내 원 → 0.25 전자기장 팽창 → 0.30 판정 → 0.45 전류선이 끊어져 사라짐 */
function magnet(ctx, f, t, sq) {
  const k = f.r / SH.en_field.r, grow = f.hit - 0.05;
  sigil(ctx, f.x, f.y, f.r, t, 1 - (t / f.life) ** 3, f.row || 0);
  if (t >= f.hit) glow(ctx, f.x, f.y - 12, f.r * .5, 1 - (t - f.hit) / (f.life - f.hit), f.row || 0);
  cell(ctx, "en_target", once("en_target", Math.min(1, t/f.hit)), f.x, f.y, K, 1-t/f.life);
  if (t >= f.hit) cell(ctx, "en_charge", once("en_charge", (t-f.hit)/(f.life-f.hit)), f.x, f.y-12, K, 1-(t-f.hit)/(f.life-f.hit), f.row || 0);
  if (t < f.hit) ring(ctx, f.x, f.y, f.r, sq, C.base, 0.5 + 0.4 * (t / f.hit), 4);
  if (t < grow) return;
  const i = t < f.hit ? once("en_field", (t - grow) / 0.05, 3) : t < f.hit + 0.15 ? 3 + Math.floor((t - f.hit) / 0.075) % 2 : 5 + Math.min(2, Math.floor((t - f.hit - 0.15) / 0.07));
  cell(ctx, "en_field", i, f.x, f.y, k);
  // 장 안을 기는 전류 줄기 · 스파크 · 끌려온 금속 조각(판정 0.30초 앞뒤로 가장 짙다)
  stars(ctx, seedOf(f) + 5, f.x, f.y, sq, (t - grow) / (f.life - grow), 12, f.r * .85, f.row || 0, 40);
  bits(ctx, seedOf(f), f.x, f.y, sq, (t - grow) / (f.life - grow), { arc: 20, spk: 22, deb: 8 }, { r: f.r * 0.92, out: -0.25, lift: 8, up: 30, spread: .6, gold: .2, k: 3 });
}

/* 직선 레일포 — 0.00~0.25 가는 청백색 직선 예고(1px, 판정 폭 가장자리 점선) → 0.25 굵은 직선 · 0.25~0.50 잔광 */
function rail(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = (f.ay || 0) * sq, n = Math.hypot(ax, ay) || 1, ang = Math.atan2(ay, ax);
  const x1 = f.x0 + ax * f.len, y1 = f.y0 + (f.ay || 0) * f.len * sq;
  if (t < f.d) {
    const u = t / f.d, ox = -ay / n * f.w / 2, oy = ax / n * f.w / 2 * sq;
    line(ctx, f.x0, f.y0, x1, y1, C.bright, 0.5 + 0.5 * u);
    line(ctx, f.x0 + ox, f.y0 + oy, x1 + ox, y1 + oy, C.base, 0.55, 3);
    line(ctx, f.x0 - ox, f.y0 - oy, x1 - ox, y1 - oy, C.base, 0.55, 3);
    return void cell(ctx, "en_charge", once("en_charge", u), f.x0 + ax * 12, f.y0 + (f.ay || 0) * 12 * sq, K, 1, f.row || 0);
  }
  const u = (t - f.d) / (f.life - f.d), len = Math.hypot(x1 - f.x0, y1 - f.y0);
  // 쏜 길을 따라 번짐 — 흰 심이 색 테두리로 번진다
  for (let i = 0, n = nq(Math.max(3, Math.round(len / 60))); i <= n; i++) glow(ctx, f.x0 + (x1 - f.x0) * i / n, f.y0 + (y1 - f.y0) * i / n, f.w * .9, (1 - u) * .7, f.row || 0);
  strip(ctx, "en_rail", once("en_rail", u), f.x0, f.y0, ang, len, f.w / SH.en_rail.h, 1);
  glow(ctx, f.x0, f.y0, 34, 1 - u, f.row || 0); glow(ctx, x1, y1, 40, 1 - u, f.row || 0);
  if (u < .5) cell(ctx, "en_flash", once("en_flash", u/.5), f.x0, f.y0, K);
  for (let i=1,n=nq(4);i<=n;i++) {
    const d=i/(n+1);
    cell(ctx,"en_charge",once("en_charge",u),f.x0+(x1-f.x0)*d,f.y0+(y1-f.y0)*d,1,.55*(1-u),f.row||0);
  }
  if (u < 0.5) cell(ctx, "en_spark", once("en_spark", u / 0.5), x1, y1, 4);
  // 관통한 길을 따라 스파크 · 파편 · 연기
  for (let i = 0, n = nq(7); i < n; i++) {
    const d = (i + 0.5) / n;
    bits(ctx, seedOf(f) + i * 13, f.x0 + (x1 - f.x0) * d, f.y0 + (y1 - f.y0) * d, sq, u, { spk: 3, deb: 2, smk: 1 }, { r: f.w * 0.6, lift: 0, up: 24, spread: .25, gold: f.oc ? .5 : .15 });
  }
}

/* 오버클럭 — 시작 때 내 둘레에 푸른 번개. 기계 테두리는 drawEngineerUnit 이 상태로 그린다 */
function oc(ctx, f, t, sq) {
  const u = t / f.life;
  sigil(ctx, f.x, f.y, 64, t, 1 - u, f.row || 0);
  pillar(ctx, f.x, f.y, u, 1, .8, f.row || 0);
  glow(ctx, f.x, f.y - 34, 30, 1 - u, f.row || 0);
  cell(ctx, "en_hex", 4 + loop(4, 0.3), f.x, f.y, 3, 1 - u);
  cell(ctx, "en_charge", once("en_charge",u), f.x, f.y-34, K, 1-u, f.row||0);
  for (let i = 0,n=nq(6); i < n; i++) cell(ctx, "en_zap", loop(4, 0.12, i * 0.07), f.x + Math.cos(i * TAU / n + u * 3) * 34, f.y - 40 + Math.sin(i * TAU / n + u * 3) * 28, K, 1 - u);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 16, arc: 6 }, { r: 52, lift: 36, up: 20, spread: .6, gold: .35 });
  stars(ctx, seedOf(f) + 9, f.x, f.y, sq, u, 10, 46, f.row || 0, 70);
}
// 과열 — 붉은 경고선(1px)과 주황 전류
function heat(ctx, f, t, sq) {
  const u = t / f.life, blink = Math.floor(t / 0.1) % 2 ? 0.4 : 1;
  ring(ctx, f.x, f.y, 46, sq, C.warn, (1 - u) * blink); ring(ctx, f.x, f.y - 40, 34, 1, C.warn, (1 - u) * blink, 3);
  cell(ctx, "en_zap", loop(4, 0.1), f.x, f.y - 46, K, 1 - u, 1);
  cell(ctx, "en_exhaust", loop(SH.en_exhaust.n,.25), f.x, f.y-48, 1, 1-u, 1);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { emb: 10, smk: 6 }, { r: 28, lift: 44, up: 40, spread: .6 });
}

/* 궤도 섬멸 명령 — 0~0.55 1px 십자 예고 → 0.55부터 0.18초 간격 5번 궤도 폭격 → 1.65 광선 하강 → 1.75 최종 · 지면 충격파.
   중앙 제어면 첫 포격 전에 전방 안내 레이저 3개(장식). 카메라는 그대로 */
function orbit(ctx, f, t, sq) {
  const R = f.r;
  if (t < f.life) sigil(ctx, f.x, f.y, R, t, t < f.end ? .9 : .9 * (1 - (t - f.end) / (f.life - f.end)), f.row || 0);
  if (t < f.end) cell(ctx,"en_target",once("en_target",Math.min(1,t/f.d)),f.x,f.y,3,.8);
  if (t < f.end) {
    const a = t < f.d ? 0.5 + 0.5 * (t / f.d) : 0.8;
    ring(ctx, f.x, f.y, R, sq, C.bright, a, 4);
    line(ctx, f.x - R, f.y, f.x + R, f.y, C.bright, a); line(ctx, f.x, f.y - R * sq, f.x, f.y + R * sq, C.bright, a);
    ring(ctx, f.x, f.y, 18, sq, C.gold, a);
  }
  if (f.guide && t < f.d) {
    const u = t / f.d;
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * R * 0.45, x = f.x + ox, y = f.y + (i === 1 ? 0 : 0.2 * R * sq);
      line(ctx, x - (f.ax || 0) * 0.4, y - 900, x, y - 900 + 900 * Math.min(1, u * 1.6), C.gold, 0.8);
    }
  }
  for (let i = 0; i < f.n; i++) {
    // 낙하 두 칸은 미리 재생하고 실제 포격 시각부터 명중 칸을 보여 준다.
    const at = f.d + i * f.gap, dt = t - at; if (dt < -.12 || dt > 0.4) continue;
    const a = rnd(i, 3) * TAU, d = R * 0.65 * Math.sqrt(rnd(i, 7));
    if (DETAIL > .6) cell(ctx,"en_target",once("en_target",Math.max(0,dt)/.4),f.x+Math.cos(a)*d,f.y+Math.sin(a)*d*sq,1,.55*(1-Math.max(0,dt)/.4));
    const frame = dt < 0 ? Math.min(1, Math.floor((dt+.12)/.12*2)) : 2 + Math.min(SH.en_strike.n-3, Math.floor(dt/.4*(SH.en_strike.n-2)));
    const sx = f.x + Math.cos(a) * d, sy = f.y + Math.sin(a) * d * sq;
    cell(ctx, "en_strike", frame, sx, sy, 4);
    if (dt >= 0) {
      glow(ctx, sx, sy - 16, 40, 1 - dt / .4, f.row || 0);
      cell(ctx, "en_boom", once("en_boom", dt / 0.4), sx, sy, 2, .9);
      bits(ctx, seedOf(f) + i * 31, sx, sy, sq, dt / 0.6, { spk: 8, deb: 7, emb: 5, smk: 4 }, { r: 44, out: .5, up: 46, spread: .2, gold: .3 });
    }
  }
  // 포격 내내 범위 안을 기는 전류와 떠다니는 스파크 — 넓은 원이 비어 보이지 않게
  if (t >= f.d * 0.5 && t < f.end + 0.3) bits(ctx, seedOf(f) + 7, f.x, f.y, sq, (t - f.d * 0.5) / (f.end + 0.3 - f.d * 0.5), { arc: 18, spk: 22 }, { r: R * 0.95, out: .05, lift: 6, spread: .85, gold: .3, k: 3 });
  if (t >= f.beam) {
    const bt = t - f.beam, hitAt = f.end - f.beam;
    const i = bt < hitAt ? once("en_beam", bt / hitAt, 3) : 3 + Math.min(6, Math.floor((bt - hitAt) / ((f.life - f.end) / 7)));
    pillar(ctx, f.x, f.y, Math.min(1, bt / (f.life - f.beam)), 3, .9, f.row || 0);
    cell(ctx, "en_beam", i, f.x, f.y, 3);
  }
  if (t >= f.end) {
    const v = (t - f.end) / (f.life - f.end);
    glow(ctx, f.x, f.y - 30, R * .7, 1 - v, f.row || 0);
    cell(ctx, "en_shock", once("en_shock", v), f.x, f.y, R / SH.en_shock.r);
    stars(ctx, seedOf(f) + 11, f.x, f.y, sq, v, 20, R * .8, f.row || 0, 120);
    cell(ctx, "en_boom", once("en_boom", v), f.x, f.y, Math.max(2, Math.round(R * 0.4 / SH.en_boom.r)));
    bits(ctx, seedOf(f) + 3, f.x, f.y, sq, v, { emb: 16, deb: 16, smk: 14, spk: 12 }, { r: R * 0.7, out: .35, up: 90, spread: .3, gold: .4 });
  }
}

const KINDS = { sk_en_pulse: pulse, sk_en_hit: hit, sk_en_zap: zap, sk_en_place: place, sk_en_hexsum: hexSum, sk_en_pad: pad, sk_en_fold: fold, sk_en_punch: punch,
  sk_en_boom: boom, sk_en_magnet: magnet, sk_en_rail: rail, sk_en_oc: oc, sk_en_heat: heat, sk_en_orbit: orbit };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const ENGINEER_CAP = { sk_en_pulse: 10, sk_en_hit: 14, sk_en_zap: 16, sk_en_place: 4, sk_en_hexsum: 4, sk_en_pad: 2, sk_en_fold: 6, sk_en_punch: 4,
  sk_en_boom: 3, sk_en_magnet: 3, sk_en_rail: 3, sk_en_oc: 2, sk_en_heat: 2, sk_en_orbit: 2 };
const FOLLOW = new Set(["sk_en_oc", "sk_en_heat"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const ENGINEER_GROUND = new Set(["sk_en_place", "sk_en_hexsum", "sk_en_pad", "sk_en_magnet"]);

function rowOf(h) { const v = h ? engineerView(h) : null; return v ? ROW[v.tint] || 0 : 0; }

export function drawEngineerFx(ctx, f, p, sq, g, time, quality = 1) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  DETAIL = clamp(quality, .15, 1);
  warmEngineer();
  const h = g && Number.isInteger(f.pi) ? g.heroes && g.heroes[f.pi] : null;
  if (FOLLOW.has(f.kind) && h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y };
  if (f.row === undefined) { const row = rowOf(h); if (row) f = { ...f, row }; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq); } finally { ctx.restore(); }
  return true;
}

/* ── 설치물 몸 — rpgArt 가 발 높이(y)로 줄 세워 부른다. u 는 engineerView(h).units 한 칸, v 는 그 사람의 engineerView ── */
export function engineerUnits(h) { const v = engineerView(h); return v && v.units.length ? v.units.map((u) => ({ u, v })) : null; }
const dirOf = (a, sq) => { const s = Math.atan2(Math.sin(a) * sq, Math.cos(a)); return ((Math.round(s / (TAU / 8)) % 8) + 8) % 8; };
export function drawEngineerUnit(ctx, o, time, sq, quality = 1) {
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  DETAIL = clamp(quality, .15, 1);
  warmEngineer();
  const { u, v } = o, row = ROW[v.tint] || 0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  let cx = u.x, cy = u.y - 30;
  if (u.k === "turret") {
    let i = u.t < TU.ready ? once("en_turret", u.t / TU.ready, 4) : 4 + dirOf(u.a, sq);
    if (u.left < 0.3) i = 12 + Math.min(2, Math.floor((0.3 - u.left) / 0.1));
    const recoil = u.t >= TU.ready && u.f < .12 ? 4*(1-u.f/.12) : 0;
    cell(ctx, "en_turret", i, u.x-Math.cos(u.a)*recoil, u.y-Math.sin(u.a)*recoil*sq, K, 1, row);
    if (DETAIL > .6 && u.t >= TU.ready && u.left > .3) cell(ctx,"en_charge",loop(SH.en_charge.n,.9,u.x*.001),u.x,u.y-35,1,.25,row);
    if (u.f < 0.12 && u.t >= TU.ready) { const s = Math.atan2(Math.sin(u.a) * sq, Math.cos(u.a)); cell(ctx, "en_flash", 0, u.x + Math.cos(s) * 24, u.y - 36 + Math.sin(s) * 14, 1); }
  } else if (u.k === "drone") {
    const a = u.t < DR.appear ? u.t / DR.appear : u.left < 0.25 ? u.left / 0.25 : 1;
    ring(ctx, u.x, u.y, 10, sq, "#000", 0.25 * a);                              // 땅의 자리(1px)
    for (let j=0,n=nq(2);j<n;j++) cell(ctx,"en_exhaust",loop(SH.en_exhaust.n,.16,j*.03),u.x+(n===1?0:j?14:-14),u.y+u.hz+3,1,a*.85,v.hot?1:0);
    cell(ctx, "en_drone", loop(SH.en_drone.n, 0.12, u.x * 0.001), u.x, u.y + u.hz + Math.sin(NOW * 4 + u.x) * 2, K, a, row, !!u.fl);
    cy = u.y + u.hz;
  } else {
    const flip = Math.cos(u.a) < 0;
    let i = 0, y = u.y;
    if (u.t < MC.land) y -= (1 - u.t / MC.land) ** 2 * 320;
    else if (u.f < 0.3) i = 5 + Math.min(2, Math.floor(u.f / 0.1));
    else if (u.mv) i = 1 + loop(4, 0.5);
    if (u.t < MC.land || v.oc > 0) for (const dx of [-21,21]) cell(ctx,"en_exhaust",loop(SH.en_exhaust.n,.15,dx*.01),u.x+dx,y-8,1,.9,v.hot?1:0);
    cell(ctx, "en_mech", i, u.x, y, K, u.left < 0.2 ? u.left / 0.2 : 1, row, flip);
    cy = y - 60;
  }
  if (v.oc > 0) cell(ctx, "en_zap", loop(4, 0.1, u.x * 0.01), cx + Math.sin(NOW * 9 + u.y) * 6, cy, K, 0.9, v.hot ? 1 : 0);
  ctx.restore();
}

/* 아이콘 한 칸(스킬 단추 · 연습장) — CSS background. 한 칸 24px 을 size 픽셀로 */
export function engineerIconStyle(i, size = 48) {
  const T = SH.en_icons, k = size / T.w;
  return { width: size, height: size, backgroundImage: `url(${ENGINEER_PX_SRC}en_icons.webp)`, backgroundSize: `${T.w * T.cols * k}px ${T.h * k}px`,
    backgroundPosition: `${-i * T.w * k}px 0`, imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
}
