/* ── 히든 직업 Necromancer 004(그림자 군주) 그리기(11월 17일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(necroData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/necromancer/px/*.webp, necroPxData.js)로만 그린다(Gambler 002 와 같은 방식, pixelfx 를 쓰지 않는다).
   코드로 그리는 것은 판정 범위를 보이는 1px 선 · 등급 점뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   픽셀 그림은 정수 배로만 키운다(보통 2배). 연마 합계 색(기본 · 진한 보라 · 은색 테두리)은 그림자 병사 시트의 줄로 고른다.
   연출 종류: sk_nc_reap(그림자 낫 베기) · hit · extract · absorb(흔적 추출) · summon · fade(그림자 소집 · 흩어짐) · strike · pop(그림자 공격)
              · swap(그림자 교환) · domain · domainend(군주의 영역) · mark(일제 진군) · burn(영혼 소각) · legion · legionend(무명의 군세).
   그림자 병사 · 추출 가능 흔적은 연출이 아니라 판정 상태(necroShadows · necroView)로 그린다 — rpgArt 가 사람과 앞뒤를 맞춰 부른다. */
import { NECRO_COLORS as C, NC_SUMMON, NC_DOMAIN, NC_SCYTHE } from "./necroData.js";
import { BLADE_HAND } from "./bloodJobArt.js";   // 손 자리(몸 그림 비율) — BLOOD-001 혈검과 같은 손
import { necroView, necroShadows } from "./necroJob.js";
import { NECRO_PX_SRC, NECRO_PX as SH, NC_FRAME as FR } from "./necroPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const K = 2;                                         // 기본 배수 — 1배 도트를 화면 2픽셀로
const ROW = { shade: 0, violet: 1, silver: 2 };
const GROUND_SQ = 0.78;                              // 땅 비율(RPG.squash) — 영역 안인지 볼 때
const rnd = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${NECRO_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
let warmed = 0;
export function warmNecro() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) sheet(k); }

// 한 칸 그리기 — i 칸 · row 색 줄 · k 정수 배 · flip 좌우 뒤집기 · filter 캔버스 필터
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
function ring(ctx, x, y, r, sq, color, a, dash = 0) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.ellipse(Math.round(x) + 0.5, Math.round(y) + 0.5, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}
/* ── 알갱이(11월 17일 사용자: "범위는 큰데 이펙트가 작고 자잘한 것이 없어 비어 보인다") ──
   불씨 · 파편 · 번개 조각 · 연기를 범위 안에 흩뿌린다. 모양은 도트 시트(nc_ember · shard · zap · smoke), 자리 · 시각은 씨앗 고정.
   수는 연출 품질(PQ, skillArt 의 Q)을 곱하고, 한 화면 그리기마다 PMAX 개를 넘기지 않는다 — 많이 겹쳐도 무거워지지 않게 */
const PMAX = 420;                                    // 한 프레임 알갱이 상한
let PQ = 1, pFrame = -1, pUsed = 0;
const pBudget = () => { if (NOW !== pFrame) { pFrame = NOW; pUsed = 0; } return PMAX - pUsed; };
const PK = { e: "nc_ember", s: "nc_shard", z: "nc_zap", m: "nc_smoke" };
/* o: x · y 가운데, r 반지름(땅 비율 sq), n 수, mix 종류 글자("eesmz"), t 지금(초) · t0 시작 · span 나오는 동안 · life 하나의 수명,
   out 바깥으로 · rise 위로 · ring 1 이면 가장자리 띠에만 · loop 1 이면 계속 되풀이(영역) · k 배수 · a 투명도 · seed */
function motes(ctx, o) {
  const n = Math.min(Math.max(1, Math.round(o.n * PQ)), pBudget());
  if (n <= 0) return;
  const mix = o.mix || "e", life = o.life || 0.6, sq = o.sq || 0.78, k = o.k || K, seed = o.seed || 0;
  for (let i = 0; i < n; i++) {
    let age, cyc = 0;
    if (o.loop) { const v = (o.t / life) + rnd(seed + i, 1); cyc = Math.floor(v); age = v - cyc; }
    else { const born = (o.t0 || 0) + rnd(seed + i, 1) * (o.span || 0); age = (o.t - born) / life; if (age < 0 || age > 1) continue; }
    const r1 = rnd(seed + i * 3 + cyc * 17, 2), r2 = rnd(seed + i * 5 + cyc * 13, 3), ch = mix[i % mix.length];
    const ang = (o.a0 !== undefined ? o.a0 + (r1 - 0.5) * (o.spread || TAU) : r1 * TAU);
    const d = (o.ring ? 0.82 + 0.18 * r2 : Math.sqrt(r2)) * o.r + (o.out || 0) * age * (ch === "m" ? 0.5 : 1);
    const x = o.x + Math.cos(ang) * d + Math.sin(age * 5 + i) * 2;
    const y = o.y + Math.sin(ang) * d * sq - (o.rise || 0) * age * (ch === "m" ? 0.7 : 1) - (o.lift || 0);
    const name = PK[ch], T = SH[name];
    const a = (o.a || 1) * (age > 0.7 ? (1 - age) / 0.3 : 1);
    cell(ctx, name, T.loop ? Math.floor(NOW / 0.08 + i) % T.n : Math.min(T.n - 1, Math.floor(age * T.n)), x, y, ch === "m" ? k + 1 : k, a);
    pUsed++;
  }
}
const sid = (f) => Math.round((f.x || 0) * 0.37 + (f.y || 0) * 0.91 + (f.x1 || 0) * 0.13) % 997;

const solName = (k) => `nc_${SH[`nc_${k}`] ? k : "knight"}`;

/* ── 그림자 병사 — 판정 상태 하나를 그린다. 솟아오름(나온 뒤 rise 초) · 공격 자세 · 걷기 · 서 있기 ──
   등급은 머리 위 1px 점(1~5). 군주의 영역 안이면 조금 밝게 */
export function drawNecroShadow(ctx, sd, row = 0, inDomain = false) {
  warmNecro();
  const name = solName(sd.k), T = SH[name], big = sd.k === "giant", seed = (sd.id || 0) * 0.37;
  let i;
  if (sd.born < NC_SUMMON.rise) i = FR.rise + Math.min(3, Math.floor(sd.born / NC_SUMMON.rise * 4));
  else if (sd.atk > 0) i = FR.atk + Math.min(3, Math.floor((0.42 - sd.atk) / 0.42 * 4));
  else if (sd.mv) i = FR.walk + Math.floor((sd.walk || 0) / 14) % 4;
  else i = FR.walk;
  const up = clamp(sd.born / NC_SUMMON.rise);
  // 뒤 — 오르는 보라 연기 기운(솟는 동안 차오른다) · 걸을 때 뒤로 끌리는 연기
  cell(ctx, "nc_aura", loop(SH.nc_aura.n, 0.9, seed), sd.x, sd.y + 2, big ? 3 : K, (inDomain ? 1 : 0.8) * up);
  if (sd.mv && sd.born >= NC_SUMMON.rise) for (let j = 0; j < 3; j++) {
    const ph = ((NOW / 0.45 + j / 3 + seed) % 1);
    cell(ctx, "nc_puff", Math.floor(ph * SH.nc_puff.n), sd.x - (sd.dir < 0 ? -1 : 1) * (10 + ph * 26), sd.y - 4 - ph * 6, K, 0.9 - ph * 0.5);
  }
  const ok = cell(ctx, name, i, sd.x, sd.y, K, 1, row, sd.dir < 0, inDomain ? "brightness(1.35)" : "");
  if (!ok) { ctx.save(); ctx.fillStyle = C.deep; ctx.globalAlpha = 0.8; ctx.fillRect(Math.round(sd.x) - 8, Math.round(sd.y) - 34, 16, 34); ctx.restore(); }   // 시트가 없을 때 — 자리만
  // 소환 — 하늘에서 보라 번개가 내리치며 솟는다(나온 뒤 0.5초)
  if (sd.born < 0.5) cell(ctx, "nc_thunder", once("nc_thunder", sd.born / 0.5), sd.x, sd.y, big ? 3 : K);
  if (sd.born < 0.9) motes(ctx, { x: sd.x, y: sd.y, r: big ? 46 : 30, n: 16, mix: "eezsm", t: sd.born, span: 0.4, life: 0.5, out: 30, rise: 40, seed: (sd.id || 0) * 7 });   // 솟을 때 튀는 불씨 · 파편
  else motes(ctx, { x: sd.x, y: sd.y, r: big ? 26 : 16, n: 3, mix: "eem", t: NOW, life: 1.1, loop: 1, rise: big ? 80 : 56, lift: 6, k: 1, a: 0.85, seed: (sd.id || 0) * 7 });   // 몸에서 오르는 불씨
  if (sd.born < NC_SUMMON.rise) return;
  ctx.save(); ctx.fillStyle = sd.first ? C.rim : C.bright;   // 등급 점 — 영원의 명령 첫 그림자는 은색
  const top = Math.round(sd.y - T.cy * K - 6);
  for (let j = 0; j < (sd.g | 0); j++) ctx.fillRect(Math.round(sd.x) - (sd.g - 1) * 2 + j * 4, top, 2, 2);
  ctx.restore();
}
// 주인 연마 색 줄 — 방장은 가방, 손님은 화면 값(necroView 가 같은 모양으로 준다)
export const necroRow = (h) => { const v = h ? necroView(h) : null; return v ? ROW[v.tint] || 0 : 0; };
// 이 사람의 그림자 목록 — rpgArt 가 사람 · 몹과 앞뒤를 맞춰 넣는다
export const necroShadowsOf = (h) => necroShadows(h);
export function drawNecroShadowOf(ctx, h, sd, time) {
  const now = Number.isFinite(time) ? time : performance.now() / 1000;
  if (now !== NOW) { NOW = now; }
  const v = necroView(h), dom = !!(v && v.dom > 0) && Math.hypot(sd.x - h.x, (sd.y - h.y) / GROUND_SQ) <= NC_DOMAIN.r;
  drawNecroShadow(ctx, sd, necroRow(h), dom);
}
/* ── 손에 든 그림자 낫 — drawHero 가 몸 그림 좌표(발밑 0, 0 · 좌우 뒤집기 적용된 상태) 안에서 부른다. behind 면 뒤를 볼 때만 ──
   옆 그림은 왼쪽을 보므로 낫 시트(오른쪽을 본다)를 뒤집어 앞으로 겨눈다. 휘두르는 동안(h.swing) 손을 축으로 위에서 아래로 돈다 */
export function drawNecroScythe(ctx, h, view, ww, hh, top, behind, time) {
  if ((view === "back") !== behind) return;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  warmNecro();
  const H = (BLADE_HAND[h.gender === "f" ? "f" : "m"] || BLADE_HAND.m)[view] || BLADE_HAND.m.front;
  const lx = (H[0] - 0.5) * ww, ly = top + H[1] * hh;
  const u = h.swing > 0 ? clamp(1 - h.swing / NC_SCYTHE.swing) : -1;
  const rot = u < 0 ? 0.25 + Math.sin(NOW * 2) * 0.04 : -1.3 + 2.9 * (1 - Math.pow(1 - clamp(u / 0.6), 3));
  ctx.save(); ctx.translate(Math.round(lx), Math.round(ly)); ctx.scale(-1, 1); ctx.rotate(rot);
  cell(ctx, "nc_scythe", Math.floor(NOW / 0.18) % 3 === 0 ? 1 : 0, 0, 0, K);
  ctx.restore();
}

/* 추출 가능 흔적 — 내 것만(남의 흔적은 보이지 않는다). 남은 시간이 1.5초 아래면 깜빡인다 */
export function drawNecroTraces(ctx, h, time) {
  const v = necroView(h);
  if (!v || !v.traces.length) return;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  warmNecro();
  for (const q of v.traces) {
    const a = q.left < 1.5 ? (Math.floor(NOW * 6) % 2 ? 0.35 : 0.9) : 0.9;
    cell(ctx, "nc_trace", loop(SH.nc_trace.n, 0.8, q.id * 0.13), q.x, q.y, K, a);
  }
}

/* ── 연출 ─────────────────────────────────────────── */
// 그림자 낫 베기 — 손 높이에서 겨눈 쪽 둘레를 위에서 아래로(그림 반지름 × 2 = 판정 반지름). 범위는 1px 반달 선으로 잠깐
function reap(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, left = ax < 0, k = Math.max(1, Math.round(f.r / SH.nc_reap.r));
  const ang = Math.atan2(ay * sq, Math.abs(ax));
  ctx.save(); ctx.translate(Math.round(f.x), Math.round(f.y - 30)); if (left) ctx.scale(-1, 1); ctx.rotate(ang * 0.6);
  ctx.translate(-Math.round(f.x), -Math.round(f.y - 30));
  cell(ctx, "nc_reap", Math.max(0, once("nc_reap", t / f.life) - 1), f.x - 4, f.y - 26, k, 0.45);   // 뒤따르는 잔상
  cell(ctx, "nc_reap", once("nc_reap", t / f.life), f.x, f.y - 30, k);
  ctx.restore();
  const a0 = Math.atan2(ay * sq, ax);
  motes(ctx, { x: f.x, y: f.y - 20, r: f.r * 0.85, a0, spread: NC_SCYTHE.arc * 2.2, n: 26, mix: "esezm", t, t0: 0.04, span: 0.16, life: 0.32, out: 40, rise: 18, sq, seed: sid(f) });
  if (t < f.life * 0.5) {
    const a0 = Math.atan2(ay * sq, ax), A = NC_SCYTHE.arc;
    ctx.save(); ctx.globalAlpha *= 0.35 * (1 - t / (f.life * 0.5)); ctx.strokeStyle = C.bright; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(f.x) + 0.5, Math.round(f.y) + 0.5, f.r, f.r * sq, 0, a0 - A, a0 + A); ctx.stroke(); ctx.restore();
  }
}
function hit(ctx, f, t) {
  cell(ctx, "nc_hit", once("nc_hit", t / f.life), f.x, f.y - 26, f.sm ? 1 : 3);
  motes(ctx, { x: f.x, y: f.y - 26, r: 14, n: 12, mix: "esez", t, span: 0.05, life: 0.3, out: 46, rise: 10, sq: 1, seed: sid(f) });
}

// 흔적 추출 — 흔적 자리에 줄기가 솟고(0.25초) 영혼 조각이 발밑으로 빨려 든다(0.5초)
function extract(ctx, f, t) {
  cell(ctx, "nc_extract", once("nc_extract", t / f.d), f.x, f.y, 3);
  motes(ctx, { x: f.x, y: f.y, r: 34, n: 18, mix: "mezs", t, span: f.d, life: 0.4, rise: 70, seed: sid(f) });
  if (t >= f.rise) {
    const u = clamp((t - f.rise) / (f.d - f.rise + 0.15)), x = f.x + (f.x1 - f.x) * u, y = f.y - 100 + (f.y1 - 20 - (f.y - 100)) * u - Math.sin(u * Math.PI) * 40;
    cell(ctx, "nc_wisp", loop(SH.nc_wisp.n, 0.2), x, y, K, 1 - Math.max(0, u - 0.85) / 0.15);
  }
}
function absorb(ctx, f, t) {
  cell(ctx, "nc_absorb", once("nc_absorb", t / f.life), f.x, f.y, 3);
  motes(ctx, { x: f.x, y: f.y, r: 40, n: 14, mix: "emz", t, span: 0.15, life: 0.3, out: -36, rise: 10, seed: sid(f) });
}

// 그림자 소집 — 발밑 그림자 다섯이 늘어나며(병사는 판정 상태 그림이 솟아오른다) 부르는 범위 1px 선
function summon(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "nc_stretch", once("nc_stretch", u * 1.4), f.x, f.y, 3, u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
  ring(ctx, f.x, f.y, f.r, sq, C.bright, 0.6 * (1 - u), 3);
  motes(ctx, { x: f.x, y: f.y, r: f.r, n: 46, mix: "mmeesz", t, span: f.life * 0.5, life: 0.7, rise: 50, out: 10, sq, seed: sid(f) });
}
function fade(ctx, f, t) {
  const name = solName(f.k);
  cell(ctx, name, FR.fade + once(name, t / f.life, 4), f.x, f.y, K, 1, f.row || 0, f.dir < 0);
}
/* 그림자 공격 — 사수는 화살, 주술은 작은 구체가 날아가고(맞는 순간은 pop 이 그린다), 근접은 맞는 순간 베기 반달 */
function strike(ctx, f, t) {
  const x0 = f.x + (f.dir < 0 ? -12 : 12), y0 = f.y - 30, x1 = f.x1, y1 = f.y1 - 24;
  if (t >= f.d - 0.02 && t < f.d + 0.3) {
    cell(ctx, "nc_hit", once("nc_hit", (t - f.d + 0.02) / 0.32), x1, y1 - 2, f.sk === "giant" ? 4 : 3);   // 맞는 순간 — 보라 번개 터짐
    motes(ctx, { x: x1, y: y1, r: 10, n: f.sk === "giant" ? 14 : 8, mix: "esz", t, t0: f.d - 0.02, span: 0.04, life: 0.3, out: 40, rise: 8, sq: 1, seed: sid(f) });
  }
  if (f.sk === "archer" || f.sk === "caster") {
    if (t >= f.d) return;
    const u = t / f.d, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - (f.sk === "caster" ? Math.sin(u * Math.PI) * 24 : 0);
    if (f.sk === "archer") {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
      cell(ctx, "nc_bolt", loop(2, 0.1), 0, 0, K); ctx.restore();
    } else cell(ctx, "nc_orb", loop(SH.nc_orb.n, 0.25), x, y, 1);
    return;
  }
  if (f.sk === "giant") return;                       // 거수형 — 내려찍기는 pop(땅 고리)이 그린다
  const v = (t - (f.d - 0.06)) / 0.26;
  if (v < 0 || v > 1) return;
  cell(ctx, "nc_slash", once("nc_slash", v), x1 - (f.dir < 0 ? -6 : 6), y1, K, 1, 0, f.dir < 0);
}
function pop(ctx, f, t) {
  const name = f.sk === "giant" ? "nc_slam" : "nc_pop", T = SH[name];
  cell(ctx, name, once(name, t / f.life), f.x, f.y, Math.max(1, Math.round(f.r / T.r)));
  motes(ctx, { x: f.x, y: f.y, r: f.r * 0.6, n: 18, mix: "esmz", t, span: 0.08, life: 0.45, out: f.r * 0.6, rise: 20, seed: sid(f) });
}

// 그림자 교환 — 두 자리에서 세로선 셋이 솟는다(0.12초) · 0.18초에 바뀐다
function swap(ctx, f, t) {
  const u = t / f.life;
  cell(ctx, "nc_swap", once("nc_swap", u), f.x, f.y, K);
  cell(ctx, "nc_swap", once("nc_swap", u), f.x1, f.y1, K);
  if (t > f.d && t < f.d + 0.2) { const a = 1 - (t - f.d) / 0.2; cell(ctx, "nc_wisp", 0, f.x, f.y - 30, K, a); cell(ctx, "nc_wisp", 1, f.x1, f.y1 - 30, K, a); }
  for (const [x, y, j] of [[f.x, f.y, 0], [f.x1, f.y1, 1]]) motes(ctx, { x, y: y - 20, r: 18, n: 14, mix: "mezs", t, span: f.d, life: 0.35, out: 24, rise: 30, seed: sid(f) + j * 50 });
}

/* 군주의 영역 — 나를 따라다니는 땅의 원(r320). 처음 0.35초 펼침(0~3 칸) 뒤 4~7 칸 반복. 유지 장이 겹쳐도 같은 칸 · 같은 자리라 밝아지지 않는다 */
const ended = new Map();
const gone = (key, wall) => wall - (ended.get(key) ?? -9) < 0.8;
function domain(ctx, f, t, sq) {
  const k = Math.max(1, Math.round(f.r / SH.nc_domain.r));
  if (f.start && t < f.d) cell(ctx, "nc_domain", once("nc_domain", t / f.d, 4), f.x, f.y, k);
  else cell(ctx, "nc_domain", 4 + loop(4, 1.2), f.x, f.y, k);
  ring(ctx, f.x, f.y, f.r, sq, C.bright, 0.55);
  if (f.start && t < f.d) return;
  // 영역 안 — 0.32초마다 자리를 바꿔 보라 번개가 떨어지고(같은 칸 번갈아 셋), 가장자리에서 연기 기운이 오른다(판정 없음 · 보기만)
  for (let j = 0; j < 3; j++) {
    const slot = Math.floor((NOW + j * 0.21) / 0.63), ph = ((NOW + j * 0.21) / 0.63) % 1;
    const a = rnd(slot, j) * TAU, d = Math.sqrt(rnd(slot, j + 7)) * f.r * 0.85;
    cell(ctx, "nc_thunder", Math.floor(ph * SH.nc_thunder.n), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq, 1, 0.9);
  }
  motes(ctx, { x: f.x, y: f.y, r: f.r * 0.95, n: 70, mix: "memesez", t: NOW, life: 1.4, loop: 1, rise: 46, sq, a: 0.9, seed: 11 });     // 안을 채우는 연기 · 불씨 · 번개 조각
  motes(ctx, { x: f.x, y: f.y, r: f.r, n: 34, mix: "mme", t: NOW, life: 1.2, loop: 1, ring: 1, rise: 60, sq, seed: 53 });                  // 가장자리에서 오르는 연기 벽
  for (let j = 0; j < 8; j++) {
    const a = j / 8 * TAU + NOW * 0.15;
    cell(ctx, "nc_aura", loop(SH.nc_aura.n, 1.1, j * 0.13), f.x + Math.cos(a) * f.r * 0.93, f.y + Math.sin(a) * f.r * 0.93 * sq, K, 0.55);
  }
}
function domainEnd(ctx, f, t, sq) {
  const u = t / f.life, k = Math.max(1, Math.round(f.r / SH.nc_domain.r));
  cell(ctx, "nc_domain", 3 - once("nc_domain", u, 4), f.x, f.y, k, 1 - u * 0.6);
  motes(ctx, { x: f.x, y: f.y, r: f.r * (1 - u * 0.5), n: 40, mix: "mme", t, span: 0.2, life: 0.5, rise: 40, sq, seed: 71 });
}

// 일제 진군 — 대상 머리 위 표적(대상을 따라간다)
function mark(ctx, f, t, sq, g) {
  let x = f.x, y = f.y;
  if (g && f.k && f.k[0] === "m") { const m = g.mobs.find((q) => String(q.id) === f.k.slice(1) && !q.dead); if (m) { x = m.x; y = m.y; } }
  const u = t / f.life;
  cell(ctx, "nc_mark", loop(SH.nc_mark.n, 0.4), x, y - 8, 3, u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
  motes(ctx, { x, y: y - 8, r: 26, n: 8, mix: "ez", t: NOW, life: 0.5, loop: 1, rise: 20, sq: 1, k: 1, seed: 91 });
}

/* 영혼 소각 — 그림자들이 붉게 갈라진 채 겨눈 자리로 달려가(0.25초) 0.4초부터 차례로 터진다. 범위 1px 선 */
function burn(ctx, f, t, sq) {
  ring(ctx, f.x, f.y, f.r, sq, "#C9505A", t < f.boom ? 0.4 + 0.5 * t / f.boom : 0.5, t < f.boom ? 4 : 0);
  (f.from || []).forEach(([x0, y0, k, dir], i) => {
    const at = f.boom + i * f.gap, name = solName(k);
    const ox = (rnd(i, 1) - 0.5) * f.r * 0.7, oy = (rnd(i, 2) - 0.5) * f.r * 0.5 * sq, x1 = f.x + ox, y1 = f.y + oy;
    if (t < at) {
      const u = clamp(t / f.d), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, fl = x1 < x0;
      cell(ctx, name, FR.walk + Math.floor(t / 0.06) % 4, x, y, K, 1, f.row || 0, t < f.d * 0.2 ? dir < 0 : fl);
      cell(ctx, "nc_crack", once("nc_crack", t / at), x, y, K, 1, 0, fl);
      return;
    }
    const v = (t - at) / 0.5;
    if (v < 1) {
      cell(ctx, "nc_boom", once("nc_boom", v), x1, y1, 3);
      motes(ctx, { x: x1, y: y1, r: 30, n: 22, mix: "esmzs", t: t - at, span: 0.06, life: 0.5, out: 90, rise: 40, sq, seed: sid(f) + i * 31 });
    }
  });
}

/* 무명의 군세 — 시전자 뒤 거대한 문양(0~0.6초) · 파동 10번이 시전자 쪽에서 앞으로 밀려오며 군세 실루엣이 지나간다 ·
   2.6초 가장자리에서 가운데로 모이는 검은 가시 · 마지막 폭발은 legionend */
function legion(ctx, f, t, sq) {
  const dir = f.dir < 0 ? -1 : 1, sx = f.x0 - dir * 30, sy = f.y0 - 70;
  if (t < f.end + 0.1) cell(ctx, "nc_sigil", t < f.sigil ? once("nc_sigil", t / f.sigil, 6) : 6 + loop(2, 0.3), sx, sy, 3, t > f.end - 0.2 ? clamp((f.end + 0.1 - t) / 0.3) : 1);
  ring(ctx, f.x, f.y, f.r, sq, C.bright, t < f.first ? 0.3 + 0.5 * t / f.first : 0.6, t < f.first ? 4 : 0);
  // 파동 — 한 번에 보이는 앞머리 셋(가운데 줄 · 위 · 아래), 시전자 쪽 가장자리에서 반대쪽 가장자리로
  const fromDir = Math.sign(f.x - f.x0) || dir;
  for (let i = 0; i < f.n; i++) {
    const at = f.first + i * f.gap, u = (t - at) / 0.5;
    if (u < 0 || u > 1) continue;
    const x = f.x - fromDir * f.r + fromDir * 2 * f.r * u;
    for (let j = -1; j <= 1; j++) {
      const y = f.y + j * f.r * 0.45 * sq, chord = Math.hypot((x - f.x) / f.r, j * 0.45);   // 원 밖으로 나가는 앞머리는 그리지 않는다
      if (chord > 0.92) continue;
      cell(ctx, "nc_wave", loop(SH.nc_wave.n, 0.3, i * 0.07 + j * 0.2), x, y + 20, K, (u > 0.8 ? (1 - u) / 0.2 : 0.85) * clamp((0.92 - chord) / 0.25), 0, fromDir < 0);
    }
  }
  // 군세 실루엣 — 파동이 이어지는 동안 반지름 안을 가로질러 걷는다(판정 없음)
  if (t > f.first && t < f.spike) {
    const kinds = ["knight", "knight", "giant", "archer", "assassin", "caster"];
    for (let j = 0; j < 14; j++) {
      const sp = 0.55 + rnd(j, 3) * 0.3, u = ((t - f.first) * sp + rnd(j, 4)) % 1;
      const x = f.x - fromDir * f.r * 0.95 + fromDir * 1.9 * f.r * u, y = f.y + (rnd(j, 5) - 0.5) * f.r * 1.4 * sq;
      if (Math.hypot(x - f.x, (y - f.y) / sq) > f.r) continue;
      cell(ctx, solName(kinds[j % kinds.length]), FR.walk + Math.floor(t / 0.1 + j) % 4, x, y, K, 0.8, 0, fromDir < 0, "brightness(0.8)");
    }
  }
  if (t > f.first && t < f.end) motes(ctx, { x: f.x, y: f.y, r: f.r, n: 130, mix: "memeszz", t, life: 0.9, loop: 1, rise: 60, sq, seed: sid(f) });   // 군세가 지나는 동안 범위를 채우는 연기 · 불씨 · 번개
  // 가시 — 가장자리에서 가운데로(2.6 → 2.8초)
  if (t >= f.spike - 0.05 && t < f.end + 0.2) {
    const u = clamp((t - f.spike) / (f.end - f.spike));
    for (let j = 0; j < 14; j++) {
      const a = j / 14 * TAU + rnd(j, 7) * 0.3, d = f.r * (0.95 - 0.8 * u) * (0.8 + 0.2 * rnd(j, 8));
      cell(ctx, "nc_spike", once("nc_spike", (t - f.spike + 0.05) / 0.35), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq, K);
    }
  }
}
function legionEnd(ctx, f, t) {
  const u = t / f.life;
  cell(ctx, "nc_blast", once("nc_blast", u), f.x, f.y, Math.max(1, Math.round(f.r / SH.nc_blast.r)));
  motes(ctx, { x: f.x, y: f.y, r: f.r * 0.5, n: 110, mix: "esmzsez", t, span: 0.12, life: 0.7, out: f.r * 0.7, rise: 60, sq: 0.78, seed: sid(f) });
}

const KINDS = { sk_nc_reap: reap, sk_nc_hit: hit, sk_nc_extract: extract, sk_nc_absorb: absorb, sk_nc_summon: summon, sk_nc_fade: fade, sk_nc_strike: strike, sk_nc_pop: pop,
  sk_nc_swap: swap, sk_nc_domain: domain, sk_nc_domainend: domainEnd, sk_nc_mark: mark, sk_nc_burn: burn, sk_nc_legion: legion, sk_nc_legionend: legionEnd };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const NECRO_CAP = { sk_nc_reap: 6, sk_nc_hit: 16, sk_nc_extract: 3, sk_nc_absorb: 3, sk_nc_summon: 2, sk_nc_fade: 8, sk_nc_strike: 16, sk_nc_pop: 10,
  sk_nc_swap: 2, sk_nc_domain: 6, sk_nc_domainend: 2, sk_nc_mark: 3, sk_nc_burn: 2, sk_nc_legion: 2, sk_nc_legionend: 2 };
// 시전자를 따라다니는 연출
const FOLLOW = new Set(["sk_nc_reap", "sk_nc_absorb", "sk_nc_domain", "sk_nc_domainend"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const NECRO_GROUND = new Set(["sk_nc_domain", "sk_nc_domainend", "sk_nc_summon", "sk_nc_absorb", "sk_nc_extract"]);

export function drawNecroFx(ctx, f, p, sq, g, time, q = 1) {
  PQ = Number.isFinite(q) ? clamp(q, 0.2, 1) : 1;
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  warmNecro();
  const h = g && Number.isInteger(f.pi) ? g.heroes && g.heroes[f.pi] : null;
  if (FOLLOW.has(f.kind) && h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y };
  const wall = performance.now() / 1000, key = f.kind === "sk_nc_domain" ? `d${f.pi}` : "";
  if (f.kind === "sk_nc_domainend") ended.set(`d${f.pi}`, wall);
  else if (key) { if (f.start && clamp(p) * f.life < 0.1) ended.delete(key); else if (gone(key, wall)) return true; }
  if (f.row === undefined) { const row = necroRow(h); if (row) f = { ...f, row }; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq, g); } finally { ctx.restore(); }
  return true;
}

/* 아이콘 한 칸(스킬 단추 · 연습장) — CSS background. 한 칸 24px 을 size 픽셀로(정수 배 권장) */
export function necroIconStyle(i, size = 48) {
  const T = SH.nc_icons, k = size / T.w;
  return { width: size, height: size, backgroundImage: `url(${NECRO_PX_SRC}nc_icons.webp)`, backgroundSize: `${T.w * T.cols * k}px ${T.h * k}px`,
    backgroundPosition: `${-i * T.w * k}px 0`, imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
}
