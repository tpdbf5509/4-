/* ── 히든 직업 Necromancer 004(그림자 군주) 그리기(11월 17일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(necroData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/necromancer/px/*.webp, necroPxData.js)로만 그린다(Gambler 002 와 같은 방식, pixelfx 를 쓰지 않는다).
   코드로 그리는 것은 판정 범위를 보이는 1px 선 · 등급 점뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   픽셀 그림은 정수 배로만 키운다(보통 2배). 연마 합계 색(기본 · 진한 보라 · 은색 테두리)은 그림자 병사 시트의 줄로 고른다.
   연출 종류: sk_nc_orb(흑영탄) · hit · extract · absorb(흔적 추출) · summon · fade(그림자 소집 · 흩어짐) · strike · pop(그림자 공격)
              · swap(그림자 교환) · domain · domainend(군주의 영역) · mark(일제 진군) · burn(영혼 소각) · legion · legionend(무명의 군세).
   그림자 병사 · 추출 가능 흔적은 연출이 아니라 판정 상태(necroShadows · necroView)로 그린다 — rpgArt 가 사람과 앞뒤를 맞춰 부른다. */
import { NECRO_COLORS as C, NC_SUMMON, NC_DOMAIN } from "./necroData.js";
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
const solName = (k) => `nc_${SH[`nc_${k}`] ? k : "knight"}`;

/* ── 그림자 병사 — 판정 상태 하나를 그린다. 솟아오름(나온 뒤 rise 초) · 공격 자세 · 걷기 · 서 있기 ──
   등급은 머리 위 1px 점(1~5). 군주의 영역 안이면 조금 밝게 */
export function drawNecroShadow(ctx, sd, row = 0, inDomain = false) {
  warmNecro();
  const name = solName(sd.k), T = SH[name];
  let i;
  if (sd.born < NC_SUMMON.rise) i = FR.rise + Math.min(3, Math.floor(sd.born / NC_SUMMON.rise * 4));
  else if (sd.atk > 0) i = FR.atk + Math.min(3, Math.floor((0.42 - sd.atk) / 0.42 * 4));
  else if (sd.mv) i = FR.walk + Math.floor((sd.walk || 0) / 14) % 4;
  else i = FR.walk;
  const ok = cell(ctx, name, i, sd.x, sd.y, K, 1, row, sd.dir < 0, inDomain ? "brightness(1.3)" : "");
  if (!ok) { ctx.save(); ctx.fillStyle = C.deep; ctx.globalAlpha = 0.8; ctx.fillRect(Math.round(sd.x) - 8, Math.round(sd.y) - 34, 16, 34); ctx.restore(); }   // 시트가 없을 때 — 자리만
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
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  const v = necroView(h), dom = !!(v && v.dom > 0) && Math.hypot(sd.x - h.x, (sd.y - h.y) / GROUND_SQ) <= NC_DOMAIN.r;
  drawNecroShadow(ctx, sd, necroRow(h), dom);
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
// 흑영탄 — 0.09초 손에 모이고 날아간다. 뒤에 옅은 잔상 둘
function orb(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0;
  if (t < f.d) return void cell(ctx, "nc_orb", loop(SH.nc_orb.n, 0.3), f.x0 + ax * 8, f.y0 + ay * 8 * sq, 1, 0.5 + 0.5 * t / f.d);
  const d = Math.min(f.len, f.v * (t - f.d)), x = f.x0 + ax * d, y = f.y0 + ay * d * sq;
  for (let i = 1; i <= 2; i++) { const b = d - i * 16; if (b > 4) cell(ctx, "nc_orb", loop(SH.nc_orb.n, 0.3, i * 0.1), f.x0 + ax * b, f.y0 + ay * b * sq, 1, 0.55 - i * 0.18); }
  cell(ctx, "nc_orb", loop(SH.nc_orb.n, 0.3), x, y, K);
}
function hit(ctx, f, t) { cell(ctx, "nc_hit", once("nc_hit", t / f.life), f.x, f.y - 24, f.sm ? 1 : K); }

// 흔적 추출 — 흔적 자리에 줄기가 솟고(0.25초) 영혼 조각이 발밑으로 빨려 든다(0.5초)
function extract(ctx, f, t) {
  cell(ctx, "nc_extract", once("nc_extract", t / f.d), f.x, f.y, K);
  if (t >= f.rise) {
    const u = clamp((t - f.rise) / (f.d - f.rise + 0.15)), x = f.x + (f.x1 - f.x) * u, y = f.y - 100 + (f.y1 - 20 - (f.y - 100)) * u - Math.sin(u * Math.PI) * 40;
    cell(ctx, "nc_wisp", loop(SH.nc_wisp.n, 0.2), x, y, K, 1 - Math.max(0, u - 0.85) / 0.15);
  }
}
function absorb(ctx, f, t) { cell(ctx, "nc_absorb", once("nc_absorb", t / f.life), f.x, f.y, K); }

// 그림자 소집 — 발밑 그림자 다섯이 늘어나며(병사는 판정 상태 그림이 솟아오른다) 부르는 범위 1px 선
function summon(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "nc_stretch", once("nc_stretch", u * 1.4), f.x, f.y, 3, u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
  ring(ctx, f.x, f.y, f.r, sq, C.bright, 0.6 * (1 - u), 3);
}
function fade(ctx, f, t) {
  const name = solName(f.k);
  cell(ctx, name, FR.fade + once(name, t / f.life, 4), f.x, f.y, K, 1, f.row || 0, f.dir < 0);
}
/* 그림자 공격 — 사수는 화살, 주술은 작은 구체가 날아가고(맞는 순간은 pop 이 그린다), 근접은 맞는 순간 베기 반달 */
function strike(ctx, f, t) {
  const x0 = f.x + (f.dir < 0 ? -12 : 12), y0 = f.y - 30, x1 = f.x1, y1 = f.y1 - 24;
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
}

// 그림자 교환 — 두 자리에서 세로선 셋이 솟는다(0.12초) · 0.18초에 바뀐다
function swap(ctx, f, t) {
  const u = t / f.life;
  cell(ctx, "nc_swap", once("nc_swap", u), f.x, f.y, K);
  cell(ctx, "nc_swap", once("nc_swap", u), f.x1, f.y1, K);
  if (t > f.d && t < f.d + 0.2) { const a = 1 - (t - f.d) / 0.2; cell(ctx, "nc_wisp", 0, f.x, f.y - 30, K, a); cell(ctx, "nc_wisp", 1, f.x1, f.y1 - 30, K, a); }
}

/* 군주의 영역 — 나를 따라다니는 땅의 원(r320). 처음 0.35초 펼침(0~3 칸) 뒤 4~7 칸 반복. 유지 장이 겹쳐도 같은 칸 · 같은 자리라 밝아지지 않는다 */
const ended = new Map();
const gone = (key, wall) => wall - (ended.get(key) ?? -9) < 0.8;
function domain(ctx, f, t, sq) {
  const k = Math.max(1, Math.round(f.r / SH.nc_domain.r));
  if (f.start && t < f.d) cell(ctx, "nc_domain", once("nc_domain", t / f.d, 4), f.x, f.y, k);
  else cell(ctx, "nc_domain", 4 + loop(4, 1.2), f.x, f.y, k);
  ring(ctx, f.x, f.y, f.r, sq, C.bright, 0.55);
}
function domainEnd(ctx, f, t) {
  const u = t / f.life, k = Math.max(1, Math.round(f.r / SH.nc_domain.r));
  cell(ctx, "nc_domain", 3 - once("nc_domain", u, 4), f.x, f.y, k, 1 - u * 0.6);
}

// 일제 진군 — 대상 머리 위 표적(대상을 따라간다)
function mark(ctx, f, t, sq, g) {
  let x = f.x, y = f.y;
  if (g && f.k && f.k[0] === "m") { const m = g.mobs.find((q) => String(q.id) === f.k.slice(1) && !q.dead); if (m) { x = m.x; y = m.y; } }
  const u = t / f.life;
  cell(ctx, "nc_mark", loop(SH.nc_mark.n, 0.4), x, y - 8, K, u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
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
    if (v < 1) cell(ctx, "nc_boom", once("nc_boom", v), x1, y1, K);
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
      cell(ctx, solName(kinds[j % kinds.length]), FR.walk + Math.floor(t / 0.1 + j) % 4, x, y, K, 0.55, 0, fromDir < 0, "brightness(0.6)");
    }
  }
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
}

const KINDS = { sk_nc_orb: orb, sk_nc_hit: hit, sk_nc_extract: extract, sk_nc_absorb: absorb, sk_nc_summon: summon, sk_nc_fade: fade, sk_nc_strike: strike, sk_nc_pop: pop,
  sk_nc_swap: swap, sk_nc_domain: domain, sk_nc_domainend: domainEnd, sk_nc_mark: mark, sk_nc_burn: burn, sk_nc_legion: legion, sk_nc_legionend: legionEnd };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const NECRO_CAP = { sk_nc_orb: 10, sk_nc_hit: 16, sk_nc_extract: 3, sk_nc_absorb: 3, sk_nc_summon: 2, sk_nc_fade: 8, sk_nc_strike: 16, sk_nc_pop: 10,
  sk_nc_swap: 2, sk_nc_domain: 6, sk_nc_domainend: 2, sk_nc_mark: 3, sk_nc_burn: 2, sk_nc_legion: 2, sk_nc_legionend: 2 };
// 시전자를 따라다니는 연출
const FOLLOW = new Set(["sk_nc_absorb", "sk_nc_domain", "sk_nc_domainend"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const NECRO_GROUND = new Set(["sk_nc_domain", "sk_nc_domainend", "sk_nc_summon", "sk_nc_absorb", "sk_nc_extract"]);

export function drawNecroFx(ctx, f, p, sq, g, time) {
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
