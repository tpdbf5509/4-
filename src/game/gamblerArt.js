/* ── 히든 직업 Gambler 002(도박꾼) 그리기(11월 16일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(gamblerData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/gambler/px/*.webp, gamblerPxData.js)로만 그린다(사용자 지시 — pixelfx 를 쓰지 않는다).
   코드로 그리는 것은 판정 범위를 보이는 1px 선뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   픽셀 그림은 정수 배로만 키운다(보통 2배). 연마 합계 색(금 · 청백 테두리 · 자주 무늬)은 칩 · 금화 시트의 줄로 고른다.
   연출 종류: sk_gm_chip(황금 칩) · hit · full · bet(풀 베팅) · veil · veilally · veilend · block(칩 장막) · dice · dicehit(운명의 눈)
              · rain(코인 폭우) · dd(더블 다운) · table · tabletick · tableend(황금 테이블) · edge · edgeend(하우스 엣지) · 777 · shock · 777end
              · warn(해금 시험 예고 — 1px 선만). 해금 경로 조사물(칩 상자 · 계약서 · 주사위 기계)은 drawGamblerSpots 가 gm_props 시트로 그린다 */
import { GAMBLER_COLORS as C, GAMBLER, GM_CLUE } from "./gamblerData.js";
import { gamblerView } from "./gamblerJob.js";
import { GAMBLER_PX_SRC, GAMBLER_PX as SH, GAMBLER_PROP } from "./gamblerPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const K = 2;                                         // 기본 배수 — 1배 도트를 화면 2픽셀로
const LIFT = GAMBLER.lift;
const ROW = { gold: 0, frost: 1, plum: 2 };
// 씨앗 고정 난수 — 같은 연출은 어느 화면에서나 같은 자리에 떨어진다
const rnd = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${GAMBLER_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
let warmed = 0;
export function warmGambler() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) sheet(k); }

// 한 칸 그리기 — i 칸 · row 색 줄 · k 정수 배 · flip 좌우 뒤집기 · filter 캔버스 필터(옅은 복제 · 자주 충격파)
function cell(ctx, name, i, x, y, k = K, alpha = 1, row = 0, flip = false, filter = "") {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(k));
  const sx = (j % T.cols) * T.w, sy = (Math.floor(j / T.cols) + (T.rows ? row : 0)) * T.h;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  if (filter) ctx.filter = filter;
  ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * kk, -T.cy * kk, T.w * kk, T.h * kk);
  ctx.restore();
  return true;
}
let NOW = 0;
const once = (name, u, n = SH[name].n) => Math.min(n - 1, Math.floor(clamp(u) * n));
const loop = (n, spin, off = 0) => Math.floor((((NOW + off) / spin) % 1 + 1) % 1 * n) % n;
// 판정 범위 1px 선 — 점선이면 예고, 실선이면 지금 판정 중
function ring(ctx, x, y, r, sq, color, a, dash = 0) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.ellipse(Math.round(x) + 0.5, Math.round(y) + 0.5, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}
const PALE = "saturate(0.35) brightness(1.25)";      // 더블 다운 — 옅은 백금색 복제
const PLUM = "hue-rotate(-88deg) saturate(0.9) brightness(0.9)";   // 황금 계약 충격파 — 금색을 자주로
const DULL = "saturate(0.45) brightness(0.82)";      // 777 아쉬운 결과 — 탁한 금색

/* 황금 칩 — 0.08초 손에서 반짝이고 떠난다. 도는 칩 + 뒤에 반짝임 둘. 하우스 엣지 중이면 금화 하나가 따라간다 */
function chip(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, row = f.row || 0;
  if (t < f.d) return void cell(ctx, "gm_glint", once("gm_glint", t / f.d), f.x0 + ax * 18, f.y0 + ay * 18 * sq, K);
  const d = Math.min(f.len, f.v * (t - f.d)), x = f.x0 + ax * d, y = f.y0 + ay * d * sq;
  for (let i = 1; i <= 2; i++) { const b = d - i * 22; if (b > 6) cell(ctx, "gm_glint", 3 + (i - 1), f.x0 + ax * b, f.y0 + ay * b * sq, K, 0.9 - i * 0.25); }
  if (f.e && d > 30) cell(ctx, "gm_coin", loop(SH.gm_coin.n, 0.24), f.x0 + ax * (d - 26), f.y0 + ay * (d - 26) * sq - 8, K, 1, row);
  cell(ctx, "gm_chip", loop(SH.gm_chip.n, 0.28), x, y, K, 1, row);
}
function hit(ctx, f, t) { cell(ctx, "gm_spark", once("gm_spark", t / f.life), f.x, f.y - 24, f.sm ? 1 : K); }

/* 풀 베팅 준비 — 칩 일곱이 머리 위에 반원으로 선다 */
function full(ctx, f, t) {
  const u = t / f.life, row = f.row || 0;
  for (let i = 0; i < GAMBLER.chips; i++) {
    const a = Math.PI + (i + 0.5) / GAMBLER.chips * Math.PI, at = i * 0.04; if (t < at) continue;
    const k = clamp((t - at) / 0.14), x = f.x + Math.cos(a) * 46 * k, y = f.y - 86 + Math.sin(a) * 30 * k;
    cell(ctx, "gm_chip", (i + loop(SH.gm_chip.n, 0.5)) % SH.gm_chip.n, x, y, 1, u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1, row);
  }
  if (u < 0.5) cell(ctx, "gm_spark", once("gm_spark", u / 0.5), f.x, f.y - 100, K);
}
/* 풀 베팅 발동 — 금화 일곱이 차례로 포물선을 그리며 대상에게 꽂힌다(판정 시각과 같다: i × gap 에 떠나 d 초 뒤 닿는다) */
function bet(ctx, f, t, sq) {
  const row = f.top ? 2 : f.row || 0, x0 = f.x, y0 = f.y - LIFT, x1 = f.x1, y1 = f.y1 - 22;
  for (let i = 0; i < f.n; i++) {
    const u = (t - i * f.gap) / f.d; if (u < 0) continue;
    if (u >= 1) { if (u < 1.9) cell(ctx, "gm_glint", once("gm_glint", (u - 1) / 0.9), x1 + (rnd(i, 3) - 0.5) * 20, y1 + (rnd(i, 4) - 0.5) * 16, K); continue; }
    const side = (i % 2 ? 1 : -1) * (18 + 8 * (i % 3)), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * (34 + side * 0.4) * sq;
    cell(ctx, "gm_coin", (i + Math.floor(u * 8)) % SH.gm_coin.n, x + Math.sin(u * Math.PI) * side * 0.5, y, K, 1, row);
  }
}

/* 칩 장막 — 발밑 육각 문양(시작은 0~3 칸으로 퍼지고 그 뒤 4~7 칸 반복). 0.25초마다 새로 오는 장이 겹쳐도 같은 칸 · 같은 자리라 밝아지지 않는다.
   남은 보호막 비율(f.k)이 낮을수록 안쪽 금화가 줄어든다 */
const ended = new Map();   // "veil|edge" + pi → 끝 연출을 본 시각(이 기기 시계) — 끝난 뒤 남은 유지 장을 그리지 않는다
const gone = (key, wall) => wall - (ended.get(key) ?? -9) < 0.8;
function veil(ctx, f, t) {
  const T = SH.gm_hex;
  if (f.start && t < 0.2) cell(ctx, "gm_hex", once("gm_hex", t / 0.2, 4), f.x, f.y, K);
  else cell(ctx, "gm_hex", 4 + loop(T.n - 4, 0.6), f.x, f.y, K);
  const n = Math.max(1, Math.round(4 * clamp(f.k ?? 1)));
  for (let i = 0; i < n; i++) {
    const a = NOW * 1.6 + i * TAU / n;
    cell(ctx, "gm_coin", loop(SH.gm_coin.n, 0.5, i * 0.13), f.x + Math.cos(a) * 44, f.y + Math.sin(a) * 26, K, 1, f.row || 0);
  }
}
function veilAlly(ctx, f, t) { const u = t / f.life; cell(ctx, "gm_hex", u < 0.3 ? once("gm_hex", u / 0.3, 4) : 4 + loop(4, 0.6), f.x, f.y, K, u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1); }
function veilEnd(ctx, f, t) {
  const u = t / f.life;
  if (f.br) cell(ctx, "gm_shard", once("gm_shard", u), f.x, f.y - 40, K);
  else cell(ctx, "gm_hex", 3 - once("gm_hex", u, 4), f.x, f.y, K, 1 - u * 0.5);
}
function block(ctx, f, t) {
  const u = t / f.life, x = f.x + Math.cos(f.a || 0) * 30, y = f.y - 40 + Math.sin(f.a || 0) * 18;
  cell(ctx, "gm_spark", once("gm_spark", u), x, y, 1); cell(ctx, "gm_glint", once("gm_glint", u), x, y, K);
}

/* 운명의 눈 — 주사위가 손에서 굴러 날아가 0.20초에 눈이 멈추고 0.28초에 터진다. 범위 선은 처음부터 보인다 */
function dice(ctx, f, t, sq) {
  const x0 = f.x, y0 = f.y - LIFT, x1 = f.x1, y1 = f.y1 - 26;
  if (t < f.hit) ring(ctx, f.x1, f.y1, f.r, sq, C.bright, 0.35 + 0.45 * (t / f.hit), 4);
  if (t < f.d) {
    const u = t / f.d, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 46;
    return void cell(ctx, "gm_dice", Math.floor(t / 0.04) % 4, x, y, K);
  }
  const after = t - f.d, pop = after < 0.08 ? -6 * Math.sin(after / 0.08 * Math.PI) : 0, tail = f.life - t;
  const up = t > f.hit ? -(t - f.hit) * 40 : 0;                // 터진 뒤 눈이 위로 떠오르며 옅어진다
  cell(ctx, "gm_dice", 3 + clamp(f.n | 0, 1, 6), x1, y1 + pop + up, K, tail < 0.25 ? tail / 0.25 : 1);
  if (f.lucky && after < 0.3) cell(ctx, "gm_glint", once("gm_glint", after / 0.3), x1 + 14, y1 - 22 + up, K);
}
function diceHit(ctx, f, t) {
  const u = t / f.life, T = SH.gm_burst, k = f.r / T.r, low = f.n <= 2;
  cell(ctx, "gm_burst", once("gm_burst", u), f.x, f.y, k, low ? 0.75 : 1, 0, false, low ? DULL : "");
  if (f.n === 6) cell(ctx, "gm_spark", once("gm_spark", u), f.x, f.y - 40, 3);
}

/* 코인 폭우 — 판정 시각(첫 d 초, 그 뒤 gap 마다)에 맞춰 금화 다섯이 하늘에서 떨어져 꽂힌다. 세 번에 한 번 큰 고리 */
const RAIN_FALL = 0.2, RAIN_DROP = 5, RAIN_H = 260;
function rain(ctx, f, t, sq) {
  ring(ctx, f.x, f.y, f.r, sq, C.bright, t < f.d ? 0.4 + 0.5 * t / f.d : 0.55, t < f.d ? 4 : 0);
  const seed = Math.round(f.x * 7 + f.y * 13), row = f.row || 0;
  for (let i = 0; i < f.n; i++) {
    const at = f.d + i * f.gap, dt = t - at;
    if (dt < -RAIN_FALL || dt > 0.42) continue;
    if (dt >= 0 && i % 3 === 0) cell(ctx, "gm_rainhit", once("gm_rainhit", dt / 0.42), f.x, f.y, f.r / SH.gm_rainhit.r);
    for (let j = 0; j < RAIN_DROP; j++) {
      const a = rnd(seed + i, j) * TAU, d = Math.sqrt(rnd(seed + i, j + 9)) * f.r * 0.9, x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * sq;
      if (dt < 0) { const u = 1 + dt / RAIN_FALL; cell(ctx, "gm_coin", (j + Math.floor(u * 6)) % SH.gm_coin.n, x, y - 10 - (1 - u) * RAIN_H, K, 1, row); cell(ctx, "gm_glint", 4, x, y - 10 - (1 - u) * RAIN_H - 16, K, 0.6); }
      else if (dt < 0.3) cell(ctx, "gm_spark", once("gm_spark", dt / 0.3), x, y - 8, j % 2 ? 1 : K);
    }
  }
}
/* 더블 다운 — 칩 두 닢이 겹쳐지고 0.18초에 직전 스킬이 옅은 백금색으로 한 번 더 터진다 */
function dd(ctx, f, t, sq) {
  if (t < f.d) {
    const u = t / f.d;
    ring(ctx, f.x, f.y, f.r, sq, C.rim, 0.3 + 0.5 * u, 4);
    for (const s of [-1, 1]) cell(ctx, "gm_chip", loop(SH.gm_chip.n, 0.2), f.x + s * 40 * (1 - u), f.y - 50, K, 1, 0, false, PALE);
    return;
  }
  const u = (t - f.d) / (f.life - f.d), name = f.sk === "rain" ? "gm_rainhit" : "gm_burst";
  cell(ctx, name, once(name, u), f.x, f.y, f.r / SH[name].r, 0.9, 0, false, PALE);
  if (f.sk === "dice" && u < 0.6) cell(ctx, "gm_dice", 3 + clamp(f.n | 0, 1, 6), f.x, f.y - 30 - u * 30, K, 1 - u / 0.6, 0, false, PALE);
}

/* 황금 테이블 — 놓은 자리에 고정. 0.4초 펼쳐지고(0~4 칸) 유지(5~8 칸), 끝은 tableend 가 접는다. 범위 선은 늘 보인다 */
function table(ctx, f, t, sq) {
  const T = SH.gm_table, k = f.r / T.r;
  if (t < f.d) cell(ctx, "gm_table", once("gm_table", t / f.d, 5), f.x, f.y, k);
  else cell(ctx, "gm_table", 5 + loop(4, 0.8), f.x, f.y, k);
  ring(ctx, f.x, f.y, f.r, sq, C.base, 0.7, t < f.d ? 4 : 0);
}
// 1초마다 칩 충돌 — 칩 여섯이 판 위에서 가운데로 미끄러져 부딪힌다
function tableTick(ctx, f, t, sq) {
  const u = t / f.life, row = f.row || 0;
  for (let j = 0; j < 6; j++) {
    const a = rnd(f.i * 3 + 1, j) * TAU, d0 = f.r * (0.45 + 0.4 * rnd(f.i, j + 5)), d = d0 * (1 - 0.35 * Math.min(1, u / 0.5));
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * sq - 10;
    if (u < 0.5) cell(ctx, "gm_chip", (j + Math.floor(u * 12)) % SH.gm_chip.n, x, y, K, 1, row);
    else cell(ctx, "gm_spark", once("gm_spark", (u - 0.5) / 0.5), x, y, K);
  }
  ring(ctx, f.x, f.y, f.r * (0.3 + 0.7 * u), sq, C.bright, 0.6 * (1 - u));
}
function tableEnd(ctx, f, t) {
  const u = t / f.life;
  if (u < 0.6) cell(ctx, "gm_table", 9 + once("gm_table", u / 0.6, 5), f.x, f.y, f.r / SH.gm_table.r);
  if (f.boom) cell(ctx, "gm_jack", once("gm_jack", u), f.x, f.y, f.r / SH.gm_jack.r);
}

/* 하우스 엣지 — 어깨 위 양쪽에 금빛 카드 두 장이 떠 있다(1배 — 캐릭터를 가리지 않게 작게). 유지 장이 겹쳐도 같은 칸이라 밝아지지 않는다 */
function edge(ctx, f, t) {
  const bob = Math.round(Math.sin(NOW * 3) * 2);
  for (const s of [-1, 1]) cell(ctx, "gm_card", loop(SH.gm_card.n, 0.9, s * 0.2), f.x + s * 34, f.y - 104 + bob * s, 1);
  if (f.start && t < 0.3) cell(ctx, "gm_spark", once("gm_spark", t / 0.3), f.x, f.y - 104, K);
}
function edgeEnd(ctx, f, t) { const u = t / f.life; for (const s of [-1, 1]) cell(ctx, "gm_card", 0, f.x + s * 34, f.y - 104 + u * 14, 1, 1 - u); }

/* 777 종결식 — 릴 셋이 머리 위에서 돌고(0~0.5초) 코인 일곱이 떨어지며(0.5초부터 gap 마다) 릴이 차례로 멈춘다. 셋째 릴은 결과 시각(show)에 멈춘다.
   결과: 0 아쉬운 결과(7 · 7 · 체리) · 1 당첨(7 · 7 · 7) · 2 잭팟(자주 7 셋). 마지막 폭발은 777end */
function jack(ctx, f, t, sq) {
  ring(ctx, f.x, f.y, f.r, sq, f.res === 2 && t >= f.show ? "#E3B5D8" : C.bright, t < f.d ? 0.4 + 0.5 * t / f.d : 0.6, t < f.d ? 4 : 0);
  const seed = Math.round(f.x * 3 + f.y * 5), row = f.row || 0;
  for (let i = 0; i < f.n; i++) {
    const dt = t - (f.d + i * f.gap); if (dt < -0.22 || dt > 0.4) continue;
    const a = (i / f.n + rnd(seed, i) * 0.1) * TAU, d = f.r * (0.25 + 0.5 * rnd(seed, i + 7)), x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * sq;
    if (dt < 0) { const u = 1 + dt / 0.22; cell(ctx, "gm_chip", Math.floor(u * 8) % SH.gm_chip.n, x, y - 12 - (1 - u) * 300, K, 1, row); }
    else cell(ctx, "gm_burst", once("gm_burst", dt / 0.4), x, y, 1);
  }
  // 릴 — 대상 지점 위. 첫째 · 둘째는 코인이 떨어지는 사이 멈추고 셋째가 결과를 정한다
  const ry = f.y - 190, stops = [f.d + (f.show - f.d) * 0.3, f.d + (f.show - f.d) * 0.65, f.show], tail = f.life - t;
  const a = t < 0.15 ? t / 0.15 : tail < 0.3 ? tail / 0.3 : 1;
  for (let i = 0; i < 3; i++) {
    const x = f.x + (i - 1) * 60;
    let fr = Math.floor((t + i * 0.03) / 0.05) % 4;
    if (t >= stops[i]) fr = f.res === 2 && t >= f.show ? 6 : i === 2 && f.res === 0 ? 5 : 4;
    const pop = t >= stops[i] && t - stops[i] < 0.1 ? 4 : 0;
    cell(ctx, "gm_slot", fr, x, ry + pop, K, a);
  }
  if (t >= f.show && f.res > 0 && t - f.show < 0.4) for (let i = 0; i < 3; i++) cell(ctx, "gm_glint", once("gm_glint", (t - f.show) / 0.4), f.x + (i - 1) * 60 + 16, ry - 26, K);
}
function shock(ctx, f, t) { cell(ctx, "gm_rainhit", once("gm_rainhit", t / f.life * 0.7), f.x, f.y, f.r / SH.gm_rainhit.r, 1, 0, false, PLUM); }
function jackEnd(ctx, f, t) {
  const u = t / f.life, name = f.res === 2 ? "gm_jacktop" : "gm_jack";
  cell(ctx, name, once(name, u), f.x, f.y, f.r / SH[name].r, 1, 0, false, f.res === 0 ? DULL : "");
  if (f.res > 0) cell(ctx, "gm_pillar", once("gm_pillar", u), f.x, f.y, K, 1, 0, false, f.res === 2 ? "" : "saturate(0.6)");
}

// 해금 시험 예고 — 판정 반경 점선이 d 초 동안 안쪽 실선으로 차오른다(코드로 그리는 1px 선)
function warn(ctx, f, t, sq) {
  const u = clamp(t / (f.d || 1));
  ring(ctx, f.x, f.y, f.r, sq, C.bright, u < 1 ? 0.85 : 0.85 * (1 - (t - f.d) / 0.2), 4);
  if (u < 1) ring(ctx, f.x, f.y, f.r * u, sq, C.base, 0.9);
}

const KINDS = { sk_gm_warn: warn, sk_gm_chip: chip, sk_gm_hit: hit, sk_gm_full: full, sk_gm_bet: bet, sk_gm_veil: veil, sk_gm_veilally: veilAlly, sk_gm_veilend: veilEnd, sk_gm_block: block,
  sk_gm_dice: dice, sk_gm_dicehit: diceHit, sk_gm_rain: rain, sk_gm_dd: dd, sk_gm_table: table, sk_gm_tabletick: tableTick, sk_gm_tableend: tableEnd,
  sk_gm_edge: edge, sk_gm_edgeend: edgeEnd, sk_gm_777: jack, sk_gm_shock: shock, sk_gm_777end: jackEnd };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap) — 유지 장(veil · edge)은 0.25~0.3초마다 새로 와 한 사람에 셋쯤 겹친다
export const GAMBLER_CAP = { sk_gm_warn: 4, sk_gm_chip: 10, sk_gm_hit: 14, sk_gm_full: 3, sk_gm_bet: 4, sk_gm_veil: 12, sk_gm_veilally: 6, sk_gm_veilend: 3, sk_gm_block: 6,
  sk_gm_dice: 4, sk_gm_dicehit: 4, sk_gm_rain: 3, sk_gm_dd: 3, sk_gm_table: 3, sk_gm_tabletick: 4, sk_gm_tableend: 3, sk_gm_edge: 12, sk_gm_edgeend: 3, sk_gm_777: 2, sk_gm_shock: 2, sk_gm_777end: 2 };
// 시전자를 따라다니는 연출 — 화면이 그릴 때마다 그 사람 자리로 옮긴다
const FOLLOW = new Set(["sk_gm_full", "sk_gm_veil", "sk_gm_veilally", "sk_gm_veilend", "sk_gm_block", "sk_gm_edge", "sk_gm_edgeend"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const GAMBLER_GROUND = new Set(["sk_gm_veil", "sk_gm_veilally", "sk_gm_table", "sk_gm_warn"]);

// 연마 합계 색 줄 — 방장은 가방, 손님은 스냅샷(h.gmv) 값(gamblerView 가 같은 모양으로 준다)
function rowOf(h) { const v = h ? gamblerView(h) : null; return v ? ROW[v.tint] || 0 : 0; }

export function drawGamblerFx(ctx, f, p, sq, g, time) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  warmGambler();
  const h = g && Number.isInteger(f.pi) ? g.heroes && g.heroes[f.pi] : null;
  if (FOLLOW.has(f.kind) && h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y };
  // 끝 연출이 나온 뒤에는 남은 유지 장을 그리지 않는다(유지 장은 0.7초쯤 살아 있다)
  const wall = performance.now() / 1000;
  const key = f.kind === "sk_gm_veil" ? `v${f.pi}` : f.kind === "sk_gm_edge" ? `e${f.pi}` : "";
  if (f.kind === "sk_gm_veilend") ended.set(`v${f.pi}`, wall); else if (f.kind === "sk_gm_edgeend") ended.set(`e${f.pi}`, wall);
  else if (key) { if (f.start && clamp(p) * f.life < 0.1) ended.delete(key); else if (gone(key, wall)) return true; }
  if (f.row === undefined) { const row = rowOf(h); if (row) f = { ...f, row }; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq); } finally { ctx.restore(); }
  return true;
}

/* 아이콘 한 칸(스킬 단추 · 연습장) — CSS background 로 쓴다. 한 칸 24px 을 size 픽셀로(정수 배 권장) */
export function gamblerIconStyle(i, size = 48) {
  const T = SH.gm_icons, k = size / T.w;
  return { width: size, height: size, backgroundImage: `url(${GAMBLER_PX_SRC}gm_icons.webp)`, backgroundSize: `${T.w * T.cols * k}px ${T.h * k}px`,
    backgroundPosition: `${-i * T.w * k}px 0`, imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
}

/* ── 해금 경로 조사물 — 칩 상자(광장) · 계약서 게시판(에르덴 마을) · 주사위 기계(훈련장). shown(s) 가 참인 자리만 그린다 ──
   u 는 내 진행(bag.gu) — 문이 열렸으면 열린 상자, 단서 C 를 얻었으면 되살아난 기계. 시트를 못 불러오면 아무것도 그리지 않는다(안내 칸은 그대로 뜬다) */
export function drawGamblerSpots(ctx, M, spots, u, shown) {
  warmGambler();
  for (const s of spots) {
    if (s.map !== M.id || (shown && !shown(s))) continue;
    const i = s.id === "box" ? (u && u.o ? GAMBLER_PROP.boxOpen : GAMBLER_PROP.box) : s.id === "deed" ? GAMBLER_PROP.deed : u && (u.c & GM_CLUE.C) ? GAMBLER_PROP.machineOn : GAMBLER_PROP.machine;
    cell(ctx, "gm_props", i, s.x, s.y, K);
  }
}
