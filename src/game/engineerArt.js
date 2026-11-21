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
import { ENGINEER_PX_SRC, ENGINEER_PX as SH, ENGINEER_PFX as PF } from "./engineerPxData.js";

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
export function warmEngineer() { if (warmed) return; warmed = 1; for (const k of [...Object.keys(SH), ...Object.keys(PF)]) sheet(k); }

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
/* ── 빛 연출(11월 21일 사용자 "빛나는 이펙트를 넣어줘" → "pixelfx를 통해서 이팩트만 바꿔봐") ─────────────
   pixelfx(MIT)로 뽑은 시트 셋(engineerPxData.js ENGINEER_PFX, 다시 묶기 design/effects/pixelfx/engineer/pack.py)을 빛 더하기(lighter)로 얹는다.
   바닥 진 = rune-circle · 빛 기둥 = magic-circle-cast(진이 번쩍이고 흰 기둥이 솟아 흩어짐) · 번짐 = collect-burst(섬광 · 고리 · 반짝이).
   판정과는 상관없는 장식 — 크기만 판정 수치(r 등)를 따르고, 3배(GLOW_K)까지만 키운다. 시트를 못 불러오면 그리지 않는다. */
const GLOW_K = 3;
function pf(ctx, name, i, x, y, k, a, row) {
  const T = PF[name], im = sheet(name); if (!im || a <= 0) return;
  const j = clamp(i | 0, 0, T.n - 1), kk = clamp(Math.round(k), 1, GLOW_K);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha *= clamp(a); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, (j % T.cols) * T.w, ((row || 0) * T.per + Math.floor(j / T.cols)) * T.h, T.w, T.h,
    Math.round(x - T.cx * kk), Math.round(y - T.cy * kk), T.w * kk, T.h * kk);
  ctx.restore();
}
/* 은은한 빛 번짐(11월 21일 사용자 "이거처럼 빛이 은은하게 퍼지는 이펙트") — en_pf_halo 를 매끈하게 늘려 빛 더하기로 깐다.
   도트 시트 둘레로 넓게 퍼지는 부드러운 빛이라 이것만 흐림(smoothing)을 켠다. 천천히 숨 쉬듯 밝기가 오르내린다(HALO.breath) */
const HALO = { a: 1, breath: .15, speed: 2.4 };   // a 전체 세기 · breath 숨쉬기 폭 · speed 숨 빠르기
function halo(ctx, i, x, y, w, h, a, row) {
  const T = PF.en_pf_halo, im = sheet("en_pf_halo"); if (!im || a <= 0 || w < 1 || h < 1) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha *= clamp(a * HALO.a * (1 - HALO.breath + HALO.breath * Math.sin(NOW * HALO.speed + x * .01)));
  ctx.drawImage(im, i * T.w, (row || 0) * T.h, T.w, T.h, x - w / 2, i ? y - h : y - h / 2, w, h);
  ctx.restore();
}
const softRound = (ctx, x, y, r, a, row, sqk = 1) => halo(ctx, 0, x, y, r * 2, r * 2 * sqk, a, row);   // sqk < 1 이면 바닥에 눕힌 번짐
const softColumn = (ctx, x, y, w, h, a, row) => halo(ctx, 1, x, y, w, h, a, row);
const pfOnce = (name, u) => Math.min(PF[name].n - 1, Math.floor(clamp(u) * PF[name].n));
// 번짐 — size 화면 반지름, u 0~1 생애(0 이면 흰 섬광 칸). 그림 속 빛 가운데가 바닥 기준점보다 30 위라 그만큼 내린다
const BURST_R = 36, BURST_UP = 30;
function glow(ctx, x, y, size, u, row = 0) {
  if (u < 0 || u > 1 || size <= 0) return;
  const k = clamp(Math.round(size / BURST_R), 1, GLOW_K);
  softRound(ctx, x, y, size * 1.6, (1 - u) ** 1.5 * .8, row);
  pf(ctx, "en_pf_burst", pfOnce("en_pf_burst", u), x, y + BURST_UP * k, k, 1, row);
}
// 바닥 진 — r 화면 반지름, t 연출이 시작된 뒤 초
const RUNE_R = 46;
function sigil(ctx, x, y, r, t, a, row = 0) {
  const T = PF.en_pf_rune;
  softRound(ctx, x, y, r * 1.5, a * .55, row, .45);
  pf(ctx, "en_pf_rune", Math.floor(t * T.fps + x * .01) % T.n, x, y, r / RUNE_R, a, row);
}
// 빛 기둥 — u 0~1 생애, k 정수 배
function pillar(ctx, x, y, u, k, a, row = 0) {
  if (u < 0 || u > 1) return;
  const env = Math.min(1, u * 5) * (1 - u) ** .6;   // 솟을 때 번지고 흩어질 때 잦아든다
  softColumn(ctx, x, y, 170 * k, 240 * k, a * env, row);
  softRound(ctx, x, y, 80 * k, a * env, row, .45);
  pf(ctx, "en_pf_cast", pfOnce("en_pf_cast", u), x, y, k, a, row);
}
const seedOf = (f) => (f.x0 ?? f.x ?? 0) * 0.37 + (f.y0 ?? f.y ?? 0) * 0.61 + (f.pi || 0) * 3.1;

/* ── 스킬 본체(11월 21일 사용자 "pixelfx로 새롭게 다시 그려줘") ─────────────
   펄스 · 명중 · 사격 · 착지 · 주먹 · 폭발 · 자기장 · 레일포 · 오버클럭 · 궤도 섬멸을 pixelfx 시트(ENGINEER_PFX)로 그린다.
   남은 손 그림은 설치물 몸 · 아이콘 · 레이저 · 레일포 띠(길이에 맞춰 늘리는 줄)뿐. 1px 예고 · 범위 선과 입자(bits)는 그대로다. */
const R1 = (f) => f.row || 0;
// pixelfx 칸 하나를 ang 으로 돌려 그린다(나는 탄) — 기준점이 (x, y)
function pfRot(ctx, name, i, x, y, ang, k, a, row) {
  const T = PF[name], im = sheet(name); if (!im || a <= 0) return;
  const j = clamp(i | 0, 0, T.n - 1), kk = clamp(Math.round(k), 1, GLOW_K);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha *= clamp(a); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.drawImage(im, (j % T.cols) * T.w, ((row || 0) * T.per + Math.floor(j / T.cols)) * T.h, T.w, T.h, -T.cx * kk, -T.cy * kk, T.w * kk, T.h * kk);
  ctx.restore();
}
const pfLoop = (name, off = 0) => Math.floor((NOW + off) * PF[name].fps) % PF[name].n;

/* 펄스 발진 — 손목에 섬광이 모였다가 플라즈마 탄이 날아간다 */
function pulse(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, row = R1(f);
  if (t < f.d) return void glow(ctx, f.x0 + ax * 14, f.y0 + ay * 14 * sq, 18, t / f.d * .3, row);
  const d = Math.min(f.len, f.v * (t - f.d)), x = f.x0 + ax * d, y = f.y0 + ay * d * sq;
  softRound(ctx, x, y, 30, .55, row);
  pfRot(ctx, "en_pf_shot", pfLoop("en_pf_shot", f.x0 * .01), x, y, Math.atan2(ay * sq, ax), 1, 1, row);
}
function hit(ctx, f, t, sq) {
  const u = t / f.life;
  pf(ctx, "en_pf_zap", pfOnce("en_pf_zap", u), f.x, f.y - 24, f.big ? 2 : 1, 1, R1(f));
  bits(ctx, seedOf(f), f.x, f.y, sq, u, f.big ? { spk: 8, deb: 4 } : { spk: 4 }, { r: f.big ? 26 : 16, lift: 24, up: 26, spread: .2 });
}

/* 기계 사격 — 짧은 레이저 + 총구 섬광 + 맞은 자리 전기 명중. 터렛은 포신 끝, 드론은 몸 아래 렌즈에서 나간다 */
function zap(ctx, f, t, sq) {
  const u = t / f.life, a = f.a || 0;
  let x0 = f.x0, y0 = f.y0;
  if (f.k === 0) { const sa = Math.atan2(Math.sin(a) * sq, Math.cos(a)); x0 += Math.cos(sa) * 24; y0 += -36 + Math.sin(sa) * 24 * 0.6; }
  else y0 += 2;
  const x1 = f.x1, y1 = f.y1 - 22, ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  strip(ctx, "en_laser", once("en_laser", u), x0, y0, ang, len, f.k === 0 ? K : 1, f.oc ? 1 : 0.9);
  if (u < .5) glow(ctx, x0, y0, 20, u * .4, R1(f));
  pf(ctx, "en_pf_zap", pfOnce("en_pf_zap", u), x1, y1, 1, 1, R1(f));
}
/* 터렛 자리 — 설치 가능 위치에 1px 녹색 사각 외곽(기획안) */
function place(ctx, f, t, sq) {
  const u = t / f.life, s = 22 + 6 * (1 - u);
  sigil(ctx, f.x, f.y, 46, t, (1 - u) * .9, R1(f));
  glow(ctx, f.x, f.y - 16, 36, u, R1(f));
  ctx.save(); ctx.globalAlpha *= 1 - u * 0.7; ctx.strokeStyle = "#8FE0A6"; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(f.x - s) + 0.5, Math.round(f.y - s * sq) + 0.5, Math.round(s * 2), Math.round(s * 2 * sq)); ctx.restore();
}
function hexSum(ctx, f, t, sq) {
  const u = t / f.life;
  sigil(ctx, f.x, f.y, 64, t, u > .75 ? (1 - u) / .25 : 1, R1(f));
  pillar(ctx, f.x, f.y, u, 1, .9, R1(f));
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 8, arc: 4 }, { r: 40, lift: 30, up: 20, gold: .25 });
}
// 수호자 착지 자리 — 내려오는 동안 바닥 진 · 빛 기둥 · 1px 원, 닿으면 땅 충격
function pad(ctx, f, t, sq) {
  const u = t / f.life;
  sigil(ctx, f.x, f.y, 128, t, u > 0.7 ? (1 - u) / 0.3 : 1, R1(f));
  if (t < f.d) { pillar(ctx, f.x, f.y, t / f.d * .4, 2, .85, R1(f)); ring(ctx, f.x, f.y, 70 * (1 - t / f.d) + 20, sq, C.bright, 0.7, 3); }
  else {
    const v = (t - f.d) / (f.life - f.d);
    pf(ctx, "en_pf_slam", pfOnce("en_pf_slam", v), f.x, f.y, 1, 1, R1(f));
    bits(ctx, seedOf(f), f.x, f.y, sq, v, { deb: 10, spk: 8 }, { r: 70, out: .5, up: 50, spread: .25 });
  }
}
function fold(ctx, f, t) {
  const u = t / f.life;
  if (f.k === 0) cell(ctx, "en_turret", 12 + once("en_turret", u, 3), f.x, f.y, K, 1, f.row || 0);
  else pf(ctx, "en_pf_zap", pfOnce("en_pf_zap", u), f.x, f.y + (f.hz || 0) - (f.k === 2 ? 40 : 0), f.k === 2 ? 2 : 1, 1, R1(f));
}
function punch(ctx, f, t, sq) {
  const u = t / f.life;
  pf(ctx, "en_pf_crit", pfOnce("en_pf_crit", u), f.x, f.y - 4, 1, 1, R1(f));
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { spk: 6, deb: 6 }, { r: 30, lift: 30, up: 34, spread: .15, gold: .3 });
}
function boom(ctx, f, t, sq) {
  const u = t / f.life;
  softRound(ctx, f.x, f.y - f.r * .3, f.r * 1.8, (1 - u) ** 1.2, R1(f));
  pf(ctx, "en_pf_plasma", pfOnce("en_pf_plasma", u), f.x, f.y - f.r * .3, f.r / 60, 1, R1(f));
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { deb: 12, spk: 10 }, { r: f.r * 0.75, out: .45, up: 70, spread: .3, gold: .4 });
}

/* 자기장 포획 — 0.00 청록 안내 원 → 판정 앞뒤로 전자기 거품이 부풀었다가 끊어진다 */
const EMP_R = 56;   // emp-blast 그림 속 거품 반지름
function magnet(ctx, f, t, sq) {
  if (t < f.hit) ring(ctx, f.x, f.y, f.r, sq, C.base, 0.5 + 0.4 * (t / f.hit), 4);
  sigil(ctx, f.x, f.y, f.r, t, 1 - (t / f.life) ** 3, R1(f));
  softRound(ctx, f.x, f.y - f.r * .3, f.r * 1.3, (1 - t / f.life) * .6, R1(f));
  pf(ctx, "en_pf_emp", pfOnce("en_pf_emp", t / f.life), f.x, f.y, f.r / EMP_R, 1, R1(f));
  const grow = f.hit - 0.05;
  if (t >= grow) bits(ctx, seedOf(f), f.x, f.y, sq, (t - grow) / (f.life - grow), { arc: 16, spk: 16 }, { r: f.r * 0.92, out: -0.25, lift: 8, up: 30, spread: .6, gold: .2, k: 3 });
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
    return void glow(ctx, f.x0 + ax * 12, f.y0 + (f.ay || 0) * 12 * sq, 36, u * .3, R1(f));
  }
  const u = (t - f.d) / (f.life - f.d), len = Math.hypot(x1 - f.x0, y1 - f.y0);
  for (let i = 0, m = nq(Math.max(3, Math.round(len / 60))); i <= m; i++) glow(ctx, f.x0 + (x1 - f.x0) * i / m, f.y0 + (y1 - f.y0) * i / m, 36, u, R1(f));
  strip(ctx, "en_rail", once("en_rail", u), f.x0, f.y0, ang, len, f.w / SH.en_rail.h, 1);
  glow(ctx, f.x0, f.y0, 72, u, R1(f));
  pf(ctx, "en_pf_crit", pfOnce("en_pf_crit", u), x1, y1 + 26, 1, 1, R1(f));
  for (let i = 0, m = nq(7); i < m; i++) {
    const d = (i + 0.5) / m;
    bits(ctx, seedOf(f) + i * 13, f.x0 + (x1 - f.x0) * d, f.y0 + (y1 - f.y0) * d, sq, u, { spk: 3, arc: 1 }, { r: f.w * 0.6, lift: 0, up: 24, spread: .25, gold: f.oc ? .5 : .15 });
  }
}

/* 센트리 터렛 작은 레일포 — 포신 끝에서 사거리 끝까지 가는 띠 · 빛 번짐 · 끝 섬광(큰 레일포의 줄인 판, 예고 없음) */
const MRAIL = { k: .45, glow: 16, step: 90, bits: 3 };
function mrail(ctx, f, t, sq) {
  const u = t / f.life, a = f.a || 0, sa = Math.atan2(Math.sin(a) * sq, Math.cos(a));
  const x0 = f.x0 + Math.cos(sa) * 24, y0 = f.y0 - 36 + Math.sin(sa) * 24 * 0.6;   // 포신 끝(sk_en_zap 터렛과 같은 자리)
  const x1 = f.x0 + f.ax * f.len, y1 = f.y0 + f.ay * f.len * sq - 22, ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  for (let i = 0, m = nq(Math.max(2, Math.round(len / MRAIL.step))); i <= m; i++) glow(ctx, x0 + (x1 - x0) * i / m, y0 + (y1 - y0) * i / m, MRAIL.glow, u, R1(f));
  strip(ctx, "en_rail", once("en_rail", u), x0, y0, ang, len, f.w / SH.en_rail.h, 1);
  if (u < .5) glow(ctx, x0, y0, MRAIL.glow * 1.6, u * .5, R1(f));
  pf(ctx, "en_pf_crit", pfOnce("en_pf_crit", u), x1, y1 + 12, MRAIL.k, 1, R1(f));
  for (let i = 0, m = nq(MRAIL.bits); i < m; i++) {
    const d = (i + 0.5) / m;
    bits(ctx, seedOf(f) + i * 13, x0 + (x1 - x0) * d, y0 + (y1 - y0) * d, sq, u, { spk: 2 }, { r: f.w * 0.6, lift: 0, up: 14, spread: .25, gold: f.oc ? .5 : .15 });
  }
}

/* 오버클럭 — 시작 때 내 발밑에 바닥 진 · 빛 기둥 · 갈래 번개와 땅 충격 고리. 기계 테두리는 drawEngineerUnit 이 상태로 그린다 */
function oc(ctx, f, t, sq) {
  const u = t / f.life;
  sigil(ctx, f.x, f.y, 64, t, 1 - u, R1(f));
  pillar(ctx, f.x, f.y, u, 1, .8, R1(f));
  softRound(ctx, f.x, f.y - 30, 110, (1 - u) * .7, R1(f));
  pf(ctx, "en_pf_clap", pfOnce("en_pf_clap", u), f.x, f.y, 1, 1, R1(f));
}
// 과열 — 붉은 경고선(1px)과 주황 전류
function heat(ctx, f, t, sq) {
  const u = t / f.life, blink = Math.floor(t / 0.1) % 2 ? 0.4 : 1;
  ring(ctx, f.x, f.y, 46, sq, C.warn, (1 - u) * blink); ring(ctx, f.x, f.y - 40, 34, 1, C.warn, (1 - u) * blink, 3);
  cell(ctx, "en_zap", loop(4, 0.1), f.x, f.y - 46, K, 1 - u, 1);
  cell(ctx, "en_exhaust", loop(SH.en_exhaust.n,.25), f.x, f.y-48, 1, 1-u, 1);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { emb: 10, smk: 6 }, { r: 28, lift: 44, up: 40, spread: .6 });
}

/* 궤도 섬멸 명령 — 0~0.55 1px 십자 예고 → 0.55부터 0.18초 간격 5번 궤도 번개 → 1.65 빛 기둥 하강 → 1.75 플라즈마 폭발 · 땅 충격.
   중앙 제어면 첫 포격 전에 전방 안내 레이저 3개(장식). 카메라는 그대로 */
const BOLT_HIT = 2;   // en_pf_bolt 에서 번개가 땅에 닿는 칸
function orbit(ctx, f, t, sq) {
  const R = f.r;
  if (t < f.life) sigil(ctx, f.x, f.y, R, t, t < f.end ? .9 : .9 * (1 - (t - f.end) / (f.life - f.end)), R1(f));
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
  const T = PF.en_pf_bolt;
  for (let i = 0; i < f.n; i++) {
    // 번개가 내려오는 두 칸은 미리 보여 주고 실제 포격 시각에 땅에 닿게 맞춘다
    const at = f.d + i * f.gap, dt = t - at; if (dt < -BOLT_HIT / T.fps || dt > (T.n - BOLT_HIT) / T.fps) continue;
    const a = rnd(i, 3) * TAU, d = R * 0.65 * Math.sqrt(rnd(i, 7));
    const sx = f.x + Math.cos(a) * d, sy = f.y + Math.sin(a) * d * sq;
    if (dt >= 0) softRound(ctx, sx, sy - 20, 90, Math.max(0, 1 - dt / .5) * .8, R1(f));
    pf(ctx, "en_pf_bolt", BOLT_HIT + Math.floor(dt * T.fps), sx, sy, 1, 1, R1(f));
    if (dt >= 0) bits(ctx, seedOf(f) + i * 31, sx, sy, sq, dt / 0.6, { spk: 6, deb: 5 }, { r: 44, out: .5, up: 46, spread: .2, gold: .3 });
  }
  if (t >= f.d * 0.5 && t < f.end + 0.3) bits(ctx, seedOf(f) + 7, f.x, f.y, sq, (t - f.d * 0.5) / (f.end + 0.3 - f.d * 0.5), { arc: 18, spk: 22 }, { r: R * 0.95, out: .05, lift: 6, spread: .85, gold: .3, k: 3 });
  if (t >= f.beam) pillar(ctx, f.x, f.y, Math.min(1, (t - f.beam) / (f.life - f.beam)), 3, 1, R1(f));
  if (t >= f.end) {
    const v = (t - f.end) / (f.life - f.end);
    pf(ctx, "en_pf_clap", pfOnce("en_pf_clap", v), f.x, f.y, R / 104, 1, R1(f));
    softRound(ctx, f.x, f.y - 40, R * 1.4, (1 - v) ** 1.2, R1(f));
    pf(ctx, "en_pf_plasma", pfOnce("en_pf_plasma", v), f.x, f.y - 40, 2, 1, R1(f));
    bits(ctx, seedOf(f) + 3, f.x, f.y, sq, v, { deb: 16, spk: 12 }, { r: R * 0.7, out: .35, up: 90, spread: .3, gold: .4 });
  }
}

const KINDS = { sk_en_pulse: pulse, sk_en_hit: hit, sk_en_zap: zap, sk_en_place: place, sk_en_hexsum: hexSum, sk_en_pad: pad, sk_en_fold: fold, sk_en_punch: punch,
  sk_en_boom: boom, sk_en_magnet: magnet, sk_en_rail: rail, sk_en_mrail: mrail, sk_en_oc: oc, sk_en_heat: heat, sk_en_orbit: orbit };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const ENGINEER_CAP = { sk_en_pulse: 10, sk_en_hit: 14, sk_en_zap: 16, sk_en_place: 4, sk_en_hexsum: 4, sk_en_pad: 2, sk_en_fold: 6, sk_en_punch: 4,
  sk_en_boom: 3, sk_en_magnet: 3, sk_en_rail: 3, sk_en_mrail: 8, sk_en_oc: 2, sk_en_heat: 2, sk_en_orbit: 2 };
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
