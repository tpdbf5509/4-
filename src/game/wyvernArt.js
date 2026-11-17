/* ── 히든 직업 Wyvern Knight 006(와이번 나이트) 그리기(11월 17일) ─────────────
   판정은 하지 않는다. 시각 · 크기는 연출에 실려 온 판정 수치(wyvernData.js 에서 나온 값)로 맞춘다 — 보이는 범위와 실제 판정이 같다.
   연출은 직접 그린 도트 시트(hidden-jobs/wyvern/px/*.webp, wyvernPxData.js)로만 그린다(Engineer 003 · Necromancer 004 와 같은 방식).
   코드로 그리는 것은 예고 · 범위를 보이는 1px 선뿐이다. 시트를 못 불러오면 그 연출은 범위 선만 남는다.
   사용자가 여러 번 말한 "범위는 큰데 비어 보인다"를 막으려고 범위 안을 큰 형상(불꽃 덩어리 · 균열 · 기둥)과 작은 입자(wy_bits)로 채운다.
   큰 형상 · 입자 수는 품질 값(DETAIL)으로 줄고, 입자는 한 연출 · 한 프레임 상한(WY_BITS)을 넘지 않는다.
   와이번 몸은 상태(wyvernView(h).u)라 rpgArt 가 사람 · 몹과 앞뒤를 맞춰 drawWyvernUnit 으로 그린다. 고도는 그림자와 그림의 화면 높이 차이로만 보인다.
   반룡 날개 · 뿔 · 용린 비늘 · 보라 날개 잔상은 drawWyvernHero 가 캐릭터 그림 앞뒤에 겹친다(무기 그림은 없다). */
import { WY_CONTRACT as CT, WY_BITS, WY_DIVE as DV, WY_ULT as UL } from "./wyvernData.js";
import { wyvernView } from "./wyvernJob.js";
import { WYVERN_PX_SRC, WYVERN_PX as SH } from "./wyvernPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const K = 2;
let DETAIL = 1;
const nq = (n) => Math.max(1, Math.round(n * DETAIL));
const rnd = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
const C = { line: "#E0574A", warn: "#EF9757", pale: "#F8D2A8", violet: "#7A55B0" };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${WYVERN_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
let warmed = 0;
export function warmWyvern() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) sheet(k); }

// 한 칸 — i 칸 · row 색 줄 · k 정수 배 · flip 좌우 · rot 회전(라디안) · flipY 위아래
function cell(ctx, name, i, x, y, k = K, alpha = 1, row = 0, flip = false, rot = 0, flipY = false) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const j = clamp(i | 0, 0, T.n - 1), kk = Math.max(1, Math.round(k));
  const sx = (j % T.cols) * T.w, sy = (Math.floor(j / T.cols) + (T.rows ? row : 0) * Math.ceil(T.n / T.cols)) * T.h;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); if (flip || flipY) ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);
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
// 1px 부채꼴 테두리(예고) — (x, y) 에서 방향 ang(화면각) · 반각 arc · 반지름 r
function fanLine(ctx, x, y, ax, ay, r, arc, sq, color, a) {
  if (a <= 0) return;
  const base = Math.atan2(ay, ax);
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
  for (let i = 0; i <= 24; i++) { const t = base - arc + (2 * arc * i) / 24; ctx.lineTo(Math.round(x + Math.cos(t) * r) + 0.5, Math.round(y + Math.sin(t) * r * sq) + 0.5); }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}
const scr = (ax, ay, sq) => Math.atan2(ay * sq, ax);   // 땅 방향 → 화면 각

/* ── 작은 입자 — wy_bits 한 칸을 범위 안에 여러 개 뿌린다. 자리 · 속도는 연출마다 정해진 씨앗으로 이어진다 ── */
const BIT = { emb: 0, spk: 1, smk: 2, shard: 3, wisp: 4, lick: 5 };
let bitFrame = -1, bitLeft = WY_BITS.perFrame;
function bitBudget(n) {
  if (NOW !== bitFrame) { bitFrame = NOW; bitLeft = WY_BITS.perFrame; }
  const k = Math.max(0, Math.min(n, bitLeft)); bitLeft -= k; return k;
}
// spec — { 종류: 개수 }. o: r 퍼질 반지름 · out 바깥으로 나는 거리(비율) · up 튀는 높이 · lift 그리는 높이 · spread 늦게 나오는 정도 · k 배율 · fan [ax, ay, arc] 부채꼴 안에만
function bits(ctx, seed, x, y, sq, u, spec, o = {}) {
  if (u < 0 || u > 1) return;
  const R = o.r || 40, out = o.out ?? 0.5, lift = o.lift ?? 0, spread = o.spread ?? 0.35, kk = o.k || K;
  let total = 0; for (const n of Object.values(spec)) total += nq(n);
  let left = bitBudget(Math.min(WY_BITS.perFx, total)), idx = 0;
  const fb = o.fan ? Math.atan2(o.fan[1], o.fan[0]) : 0;
  for (const [kind, n0] of Object.entries(spec)) {
    const n = nq(n0);
    for (let i = 0; i < n && left > 0; i++, idx++) {
      const s0 = seed * 7.13 + idx;
      const st = rnd(s0, 1) * spread, len = 1 - spread * 0.5;
      const v = (u - st) / len; if (v < 0 || v > 1) continue;
      left--;
      const a = o.fan ? fb + (rnd(s0, 2) * 2 - 1) * o.fan[2] : rnd(s0, 2) * TAU, d0 = Math.sqrt(rnd(s0, 3)) * R;
      const go = (kind === "smk" ? 0.2 : out) * R * (0.5 + rnd(s0, 4)) * (1 - (1 - v) ** 2);
      let px = x + Math.cos(a) * (d0 + go), py = y + Math.sin(a) * (d0 + go) * sq - lift;
      const up = (o.up ?? 40) * (0.5 + rnd(s0, 5));
      if (kind === "emb" || kind === "shard") py -= up * 4 * v * (1 - v);
      if (kind === "smk" || kind === "wisp") py -= up * 0.7 * v;
      if (kind === "shard") cell(ctx, "wy_bits", (loop(8, 0.3, rnd(s0, 6)) + idx) % 8, px, py, kk, 1 - v * v, BIT.shard);
      else cell(ctx, "wy_bits", once("wy_bits", v), px, py, kind === "smk" ? kk + 1 : kk, kind === "smk" ? 0.7 : 1, BIT[kind]);
    }
  }
}
const seedOf = (f) => (f.x0 ?? f.x ?? 0) * 0.37 + (f.y0 ?? f.y ?? 0) * 0.61 + (f.pi || 0) * 3.1 + (f.i || 0) * 1.7;
// 큰 형상 — 불꽃 덩어리를 부채꼴 안에 줄지어 채운다(앞으로 나아가는 물결). front 0~1 물결이 닿은 비율
function puffFan(ctx, seed, x, y, ax, ay, r, arc, sq, front, age, k = K) {
  const rows = nq(5), base = Math.atan2(ay, ax);
  for (let j = 0; j < rows; j++) {
    const dj = (j + 0.6) / rows; if (dj > front + 0.05) continue;
    const cols = Math.max(1, Math.round(nq(2 + dj * 5) * (arc / 0.8)));
    for (let c = 0; c < cols; c++) {
      const t = cols === 1 ? 0 : (c / (cols - 1)) * 2 - 1, jit = (rnd(seed + j, c) - 0.5) * 0.18;
      const a = base + (t * 0.92 + jit) * arc, d = r * dj * (0.92 + rnd(seed, j * 9 + c) * 0.12);
      const local = clamp((front - dj) / 0.45 + age);
      cell(ctx, "wy_puff", once("wy_puff", local), x + Math.cos(a) * d, y + Math.sin(a) * d * sq - 14, k + (dj > 0.7 ? 0 : 0), 1, 0, rnd(seed, c + j) < 0.5);
    }
  }
}

/* ── 용조격 — 0.00 손등 발톱 불티 · 0.12 앞 95° 참격 · 0.20 잔상 소멸 ── */
function claw(ctx, f, t, sq) {
  const rot = scr(f.ax, f.ay, sq), hx = f.x + f.ax * 10, hy = f.y - 30 + f.ay * 10 * sq;
  if (t < f.d) return void cell(ctx, "wy_bits", once("wy_bits", t / f.d), hx, hy, K, 1, BIT.spk);
  const u = (t - f.d) / (f.life - f.d), k = Math.max(1, Math.round(f.r / SH.wy_claw.r));
  cell(ctx, "wy_claw", once("wy_claw", u), f.x, f.y - 30, k, 1, 0, false, rot, !!f.fl);
  if (u < 0.6) for (let i = 0, n = nq(4); i < n; i++) {
    const a = Math.atan2(f.ay, f.ax) + ((i / (n - 1 || 1)) * 2 - 1) * f.arc * 0.8, d = f.r * (0.6 + 0.3 * rnd(i, 3));
    cell(ctx, "wy_puff", once("wy_puff", u / 0.6 + 0.15), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq - 26, 1, 0.9);
  }
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { emb: 8, spk: 6, shard: 2 }, { r: f.r * 0.9, lift: 26, up: 20, spread: 0.2, fan: [f.ax, f.ay * sq, f.arc] });
}
function hit(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "wy_hit", once("wy_hit", u), f.x, f.y - 24, f.big ? 3 : K);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, f.big ? { emb: 8, spk: 5, smk: 2 } : { emb: 5, spk: 3 }, { r: f.big ? 26 : 16, lift: 24, up: 26, spread: 0.2 });
}
// 와이번 화염탄 — 날아가는 불덩이 · 뒤로 불씨
function ball(ctx, f, t, sq) {
  const u = clamp(t / Math.max(0.01, f.life - 0.05)), x = f.x0 + (f.x1 - f.x0) * u, y = f.y0 + (f.y1 - f.y0) * u - Math.sin(u * Math.PI) * 18;
  const ang = Math.atan2(f.y1 - f.y0 - Math.cos(u * Math.PI) * 18 * Math.PI, f.x1 - f.x0);
  if (u >= 1) return;
  cell(ctx, "wy_ball", loop(4, 0.16), x, y, K, 1, 0, false, ang);
  for (let i = 1, n = nq(4); i <= n; i++) { const b = Math.max(0, u - i * 0.06); cell(ctx, "wy_bits", Math.min(7, i + 1), f.x0 + (f.x1 - f.x0) * b, f.y0 + (f.y1 - f.y0) * b - Math.sin(b * Math.PI) * 18, 1, 0.8, BIT.emb); }
  if (u < 0.2) cell(ctx, "wy_puff", once("wy_puff", u / 0.2), f.x0, f.y0, 1, 0.9);
}
// 소환 — 0.00 문양 · 0.20 머리 · 날개 윤곽 · 0.45 다 나타남(몸은 drawWyvernUnit)
function summon(ctx, f, t, sq) {
  const u = t / f.life;
  if (!f.quick) cell(ctx, "wy_sigil", t < 0.4 ? once("wy_sigil", t / 0.4, 4) : 4 + loop(4, 0.3), f.x, f.y, K, u > 0.7 ? (1 - u) / 0.3 : 1);
  for (let i = 0, n = nq(f.quick ? 3 : 6); i < n; i++) {
    const a = (i / n) * TAU, d = 20 + 18 * rnd(i, 5);
    cell(ctx, "wy_puff", once("wy_puff", u * 1.2 + rnd(i, 2) * 0.2), f.x + Math.cos(a) * d, f.y - CT.hz + Math.sin(a) * d * 0.6, 1, 0.9);
  }
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { lick: 10, emb: 10, shard: 4 }, { r: 44, lift: 4, up: 40, spread: 0.5 });
}
function gone(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "wy_puff", once("wy_puff", 0.4 + u * 0.6), f.x, f.y - CT.hz, 3, 1);
  bits(ctx, seedOf(f), f.x, f.y - CT.hz, sq, u, { shard: 8, emb: 6, smk: 3 }, { r: 30, out: 0.9, up: 20, spread: 0.1 });
}

/* ── 용염 포효 — 0.00~0.15 앞에 포탈이 열린다 · 0.15~0.90 용 머리가 불을 뿜는다(박동 다섯) · 와이번 갈래 0.35~ ── */
function roar(ctx, f, t, sq) {
  const ax = f.ax, ay = f.ay, flip = ax < 0, end = f.d + f.gap * (f.n - 1);
  const px = f.x + ax * 46, py = f.y - 34 + ay * 46 * sq, mouth = 26 * K;
  if (t < f.d) fanLine(ctx, f.x, f.y, ax, ay, f.r, f.arc, sq, C.warn, 0.4 + 0.5 * (t / f.d));
  const pa = t > end + 0.25 ? 1 - (t - end - 0.25) / (f.life - end - 0.25) : 1;
  cell(ctx, "wy_portal", t < f.d ? once("wy_portal", t / f.d, 4) : 4 + Math.min(3, Math.floor((t - f.d) / 0.08)), px, py, K, pa, 0, flip, flip ? -Math.atan2(ay * sq, -ax) * 0.5 : Math.atan2(ay * sq, ax) * 0.5);
  if (t >= f.d) {
    // 물결 다섯 — 박동마다 앞으로 나아가는 불꽃 덩어리 줄. 범위 끝까지 채운다
    for (let i = 0; i < f.n; i++) {
      const at = f.d + i * f.gap, dt = t - at; if (dt < 0 || dt > 0.55) continue;
      puffFan(ctx, seedOf(f) + i * 17, f.x + ax * 30, f.y + ay * 30 * sq, ax, ay, f.r - 20, f.arc, sq, clamp(dt / 0.28), clamp((dt - 0.28) / 0.3));
    }
    const mx = px + (flip ? -mouth : mouth) * Math.abs(Math.cos(Math.atan2(ay * sq, ax))), my = py + ay * 20;
    if (t < end + 0.1) cell(ctx, "wy_puff", loop(3, 0.12), mx, my, 3, 1);
  }
  bits(ctx, seedOf(f), f.x, f.y, sq, clamp((t - f.d) / (f.life - f.d)), { emb: 22, lick: 12, spk: 10, smk: 8 }, { r: f.r, out: 0.15, lift: 14, up: 30, spread: 0.7, fan: [ax, ay * sq, f.arc] });
  // 와이번 갈래 — 와이번 입에서 시전자 앞 짧은 부채꼴로
  const s = f.sub;
  if (s && t >= s.at) {
    const v = clamp((t - s.at) / 0.45);
    for (let i = 0, n = nq(6); i < n; i++) { const b = i / n; cell(ctx, "wy_ball", loop(4, 0.12, i * 0.03), s.wx + (s.x - s.wx) * b * v, s.wy - s.hz + (s.y - 30 - s.wy + s.hz) * b * v, 1, 0.9); }
    puffFan(ctx, seedOf(f) + 91, s.x, s.y, ax, ay, s.r, s.arc, sq, clamp(v * 1.6), clamp(v * 1.4 - 0.4));
  }
}

/* ── 비룡 급강하 — 0.00 착지 1px 붉은 원 · 0.00~0.25 오른다 · 0.25~0.55 와이번 그림자 · 0.55 착지 · 0.55~0.85 균열 · 충격파 ── */
function dive(ctx, f, t, sq) {
  if (t < DV.land) {
    const u = t / DV.land;
    ring(ctx, f.x, f.y, f.r, sq, C.line, 0.55 + 0.4 * u); ring(ctx, f.x, f.y, f.r * (1 - u * 0.85), sq, C.warn, 0.7, 3);
    // 오르는 동안 발밑 불씨 · 날아가는 동안 내려꽂히는 꼬리(시전자를 따라 그린다 — 실제 자리는 dashStep)
    if (t < DV.up) bits(ctx, seedOf(f), f.x0, f.y0, sq, t / DV.up, { lick: 8, smk: 6 }, { r: 30, up: 30, spread: 0.3 });
    if (t >= DV.up) {
      const v = (t - DV.up) / (DV.land - DV.up), x = f.x0 + (f.x - f.x0) * v, y = f.y0 + (f.y - f.y0) * v, air = DV.rise * Math.max(0, 1 - v * v);
      for (let i = 0, n = nq(5); i < n; i++) { const b = Math.max(0, v - i * 0.08); cell(ctx, "wy_puff", Math.min(7, 1 + i), f.x0 + (f.x - f.x0) * b, f.y0 + (f.y - f.y0) * b - DV.rise * Math.max(0, 1 - b * b) - 30, K, 0.9); }
      cell(ctx, "wy_shade", loop(4, 0.2), x, y, f.joint ? 4 : 2, 0.5);
      void air;
    }
    return;
  }
  const v = (t - DV.land) / (f.life - DV.land), k = Math.max(1, Math.round(f.r / SH.wy_crack.r));
  cell(ctx, "wy_crack", once("wy_crack", v * 1.15), f.x, f.y, k);
  if (v < 0.5) cell(ctx, "wy_hit", once("wy_hit", v / 0.5), f.x, f.y - 30, 4);
  for (let i = 0, n = nq(f.joint ? 14 : 10); i < n; i++) {   // 충격파 고리를 따라 불꽃 덩어리
    const a = (i / n) * TAU + rnd(i, 4) * 0.3, d = f.r * (0.35 + 0.6 * clamp(v * 2.2)) * (0.85 + rnd(i, 6) * 0.2);
    cell(ctx, "wy_puff", once("wy_puff", v * 1.3 + rnd(i, 8) * 0.15), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq - 12, K, 1, 0, i % 2 === 1);
  }
  bits(ctx, seedOf(f), f.x, f.y, sq, v, { emb: 18, shard: 12, smk: 12, lick: 10, spk: 8 }, { r: f.r * 0.85, out: 0.35, up: 70, spread: 0.3 });
  if (f.ex) { const w = (t - DV.extra) / 0.4; if (w >= 0 && w <= 1) { cell(ctx, "wy_pillar", once("wy_pillar", w), f.x, f.y, 3); cell(ctx, "wy_crack", once("wy_crack", w), f.x, f.y, Math.max(1, k - 1), 0.9); } }
  if (f.storm) { const w = (t - DV.end) / (f.life - DV.end); if (w >= 0) bits(ctx, seedOf(f) + 5, f.x, f.y, sq, w, { wisp: 20, shard: 14, emb: 10 }, { r: f.r, out: 0.6, up: 50, spread: 0.2 }); }
}

/* ── 용린 수호 — 켜질 때 비늘이 솟는 순간 · 꺼질 때 붉은 점으로 흩어짐(유지 중 비늘은 drawWyvernHero) ── */
function scaleOn(ctx, f, t, sq) {
  if (t > 0.45) return;
  bits(ctx, seedOf(f), f.x, f.y - 30, sq, t / 0.45, { shard: 14, spk: 8 }, { r: 30, out: -0.4, up: 10, spread: 0.3 });
}
function scaleOff(ctx, f, t, sq) {
  bits(ctx, seedOf(f), f.x, f.y - 34, sq, t / f.life, f.big ? { shard: 18, emb: 16, wisp: 8 } : { shard: 14, emb: 8 }, { r: 26, out: 1.2, up: 30, spread: 0.1 });
}
function spike(ctx, f, t, sq) {
  const u = t / f.life;
  cell(ctx, "wy_spike", once("wy_spike", u), f.x, f.y - 30, 3, 1, 0, false, f.a);
  if (u > 0.2) cell(ctx, "wy_hit", once("wy_hit", (u - 0.2) / 0.8), f.x1, f.y1 - 24, K);
}

/* ── 천공 지배 — 0.00 위에 비룡 그림자 · 영역 1px · 낙하마다 예고 원(sk_wy_drop) ── */
function sky(ctx, f, t, sq) {
  const u = t / f.life, a = u * TAU * 1.4;
  ring(ctx, f.x, f.y, f.r, sq, C.line, 0.5 * (1 - u * 0.6), 4);
  cell(ctx, "wy_shade", loop(4, 0.25), f.x + Math.cos(a) * f.r * 0.5, f.y + Math.sin(a) * f.r * 0.5 * sq, 4, 0.45 * (1 - u));
  if (f.wy) cell(ctx, "wy_wyvern", loop(4, 0.32), f.x + Math.cos(a) * f.r * 0.5, f.y + Math.sin(a) * f.r * 0.5 * sq - 220, 3, 0.75 * (1 - u), 0, Math.sin(a) > 0);   // 와이번이 없을 때 — 임시 비룡(그림만)
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { emb: 24, smk: 10, lick: 10 }, { r: f.r * 0.95, out: 0.05, up: 40, spread: 0.8 });
}
function drop(ctx, f, t, sq) {
  const k = Math.max(1, Math.round(f.r / SH.wy_crack.r));
  if (t < f.d) {
    const u = t / f.d;
    ring(ctx, f.x, f.y, f.r, sq, C.line, 0.5 + 0.5 * u); ring(ctx, f.x, f.y, f.r * (1 - u), sq, C.warn, 0.8);
    if (u > 0.2) cell(ctx, "wy_drop", once("wy_drop", (u - 0.2) / 0.8, 4), f.x, f.y, 3);
    return;
  }
  const v = (t - f.d) / (f.life - f.d);
  cell(ctx, "wy_drop", 4 + once("wy_drop", v, 3), f.x, f.y, 3);
  cell(ctx, "wy_crack", once("wy_crack", v), f.x, f.y, k, 0.95);
  for (let i = 0, n = nq(7); i < n; i++) { const a = (i / n) * TAU, d = f.r * (0.3 + 0.55 * v); cell(ctx, "wy_puff", once("wy_puff", v * 1.2 + rnd(i, f.i) * 0.2), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq - 10, K, 1); }
  bits(ctx, seedOf(f), f.x, f.y, sq, v, { emb: 12, shard: 6, smk: 6, spk: 6 }, { r: f.r * 0.8, out: 0.4, up: 60, spread: 0.2 });
}

/* ── 역린 해방 — 0~0.3 눈 · 0.3~0.7 비늘 · 0.7~1.0 날개 · 뿔(날개는 drawWyvernHero). 카메라는 그대로 ── */
function awake(ctx, f, t, sq) {
  const u = t / f.life;
  if (t > 0.3) cell(ctx, "wy_pillar", once("wy_pillar", (t - 0.3) / (f.life - 0.3)), f.x, f.y, 2, 0.75);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, { shard: 20, lick: 14, emb: 14, wisp: 6 }, { r: 44, out: -0.3, up: 60, spread: 0.5 });
  ring(ctx, f.x, f.y, 30 + 50 * u, sq, C.line, 1 - u);
}

/* ── 종언의 용성 — 0~0.5 반경 360 예고 · 0.5 오름 · 0.9 첫 충돌 · 1.0~1.8 폭발 다섯 · 2.0 최종 · (진룡 동조) 2.2 화염 균열 ── */
function ult(ctx, f, t, sq) {
  const R = f.r, kc = Math.max(1, Math.round(R / SH.wy_crack.r));
  if (t < UL.last) {
    const a = t < UL.warn ? 0.4 + 0.6 * (t / UL.warn) : 0.75;
    ring(ctx, f.x, f.y, R, sq, C.line, a); ring(ctx, f.x, f.y, R * 0.66, sq, C.warn, a * 0.7, 4); ring(ctx, f.x, f.y, R * 0.33, sq, C.warn, a * 0.6, 2);
  }
  // 위로 오른 와이번(또는 임시 비룡) 그림자 — 커지며 내려온다
  if (t >= UL.rise && t < UL.first + 0.1) {
    const v = (t - UL.rise) / (UL.first - UL.rise);
    cell(ctx, "wy_shade", loop(4, 0.15), f.x, f.y, 2 + Math.round(v * 4), 0.35 + 0.35 * v);
    if (f.temp) cell(ctx, "wy_wyvern", 4 + loop(3, 0.2), f.x - 60, f.y - 260 * (1 - v) - 80, 3, 0.85, 0, false);
  }
  // 범위 안 내내 불씨 · 연기 — 넓은 원이 비지 않게
  if (t >= UL.warn * 0.5) bits(ctx, seedOf(f) + 7, f.x, f.y, sq, clamp((t - UL.warn * 0.5) / (f.life - UL.warn * 0.5)), { emb: 26, lick: 16, smk: 12, shard: 8 }, { r: R * 0.95, out: 0.05, up: 50, spread: 0.85, k: 3 });
  const boom = (at, k, x, y, big) => {
    const v = (t - at) / 0.6; if (v < 0 || v > 1) return;
    cell(ctx, "wy_crack", once("wy_crack", v), x, y, k, 1);
    cell(ctx, "wy_pillar", once("wy_pillar", v), x, y, big ? 4 : 2);
    for (let i = 0, n = nq(big ? 16 : 6); i < n; i++) { const a = (i / n) * TAU + rnd(at, i), d = k * SH.wy_crack.r * (0.25 + 0.65 * v); cell(ctx, "wy_puff", once("wy_puff", v * 1.2 + rnd(i, 3) * 0.2), x + Math.cos(a) * d, y + Math.sin(a) * d * sq - 12, big ? 3 : K, 1); }
    bits(ctx, seedOf(f) + at * 13, x, y, sq, v, big ? { emb: 22, shard: 14, smk: 14, spk: 10 } : { emb: 10, shard: 6, smk: 5 }, { r: k * SH.wy_crack.r * 0.8, out: 0.4, up: big ? 90 : 50, spread: 0.2 });
  };
  boom(UL.first, kc, f.x, f.y, true);
  for (let i = 0; i < UL.n; i++) { const a = i * TAU / UL.n + 0.4, d = R * 0.55; boom(UL.b0 + i * UL.bGap, Math.max(1, kc - 2), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * sq, false); }
  boom(UL.last, kc, f.x, f.y, true);
  if (f.sync) {
    const v = (t - UL.crack) / 0.6;
    if (v >= 0 && v <= 1) { cell(ctx, "wy_crack", once("wy_crack", v * 0.6), f.x, f.y, kc, 1); bits(ctx, seedOf(f) + 99, f.x, f.y, sq, v, { wisp: 24, lick: 14 }, { r: R * 0.7, out: 0.2, up: 70, spread: 0.2 }); }
  }
}

/* ── 천공강습 — 돌진하는 길을 따라 회전 베기 넷 ── */
function assault(ctx, f, t, sq) {
  const ax = f.x1 - f.x0, ay = f.y1 - f.y0, len = Math.hypot(ax, ay) || 1;
  for (let i = 0; i < f.n; i++) {
    const at = ((i + 1) * f.d) / f.n, v = (t - at + 0.1) / 0.3; if (v < 0 || v > 1) continue;
    const x = f.x0 + ax * ((i + 1) / f.n), y = f.y0 + ay * ((i + 1) / f.n);
    cell(ctx, "wy_arc", once("wy_arc", v), x, y - 30, Math.max(1, Math.round(f.r / SH.wy_arc.r)), 1, 0, false, i * 1.7 + Math.atan2(ay, ax), i % 2 === 1);
    ring(ctx, x, y, f.r, sq, C.warn, 0.35 * (1 - v), 3);
  }
  const u = clamp(t / f.d);
  for (let i = 0, n = nq(8); i < n; i++) { const b = (i + 0.5) / n; if (b > u) break; cell(ctx, "wy_puff", once("wy_puff", (u - b) * 2 + 0.2), f.x0 + ax * b, f.y0 + ay * b - 18, K, 1, 0, i % 2 === 0); }
  bits(ctx, seedOf(f), (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, sq, t / f.life, { emb: 16, shard: 8, spk: 8 }, { r: len / 2 + 30, out: 0.1, up: 40, spread: 0.6 });
}
/* ── 아르카디온 — 용혈로 빚은 대검이 두 번 가로로 벤다(대검은 손 근처에 떠서 휘둘러진다) ── */
function blade(ctx, f, t, sq, g) {
  const h = g && g.heroes && g.heroes[f.pi], x = h && h.map === f.map ? h.x : f.x, y = h && h.map === f.map ? h.y : f.y;
  const u = t / f.life, base = scr(f.ax, f.ay, sq), side = f.ax < 0 ? -1 : 1;
  const swing = t < 0.15 ? -1.2 + 2.4 * (t / 0.15) : t < 0.35 ? 1.2 : t < 0.52 ? 1.2 - 2.6 * ((t - 0.35) / 0.17) : -1.4;
  const fade = u > 0.85 ? (1 - u) / 0.15 : 1;
  cell(ctx, "wy_blade", t < 0.12 ? once("wy_blade", t / 0.12, 3) : 3, x, y - 34, K, fade, 0, false, base + swing * side * 0.6);
  bits(ctx, seedOf(f), x, y, sq, u, { emb: 8, shard: 4 }, { r: 40, lift: 30, up: 20, spread: 0.6 });
}
function arc(ctx, f, t, sq) {
  const u = t / f.life, k = Math.max(1, Math.round(f.r / SH.wy_arc.r));
  cell(ctx, "wy_arc", once("wy_arc", u), f.x, f.y - 30, k, 1, f.i > 1 ? 1 : 0, false, scr(f.ax, f.ay, sq), f.i > 1);
  puffFan(ctx, seedOf(f), f.x, f.y, f.ax, f.ay, f.r, f.arc, sq, clamp(u * 3), clamp(u * 1.5 - 0.2), 1);
  bits(ctx, seedOf(f), f.x, f.y, sq, u, f.i > 1 ? { emb: 14, wisp: 10, shard: 8 } : { emb: 12, spk: 6, shard: 4 }, { r: f.r, lift: 20, up: 24, spread: 0.2, fan: [f.ax, f.ay * sq, f.arc] });
}

const KINDS = { sk_wy_claw: claw, sk_wy_hit: hit, sk_wy_ball: ball, sk_wy_sum: summon, sk_wy_gone: gone, sk_wy_roar: roar, sk_wy_dive: dive, sk_wy_scale: scaleOn,
  sk_wy_scaleoff: scaleOff, sk_wy_spike: spike, sk_wy_sky: sky, sk_wy_drop: drop, sk_wy_awake: awake, sk_wy_ult: ult, sk_wy_assault: assault, sk_wy_blade: blade, sk_wy_arc: arc };
// 같은 종류는 최근 몇 개만 그린다(rpgArt FX_LOD.cap)
export const WYVERN_CAP = { sk_wy_claw: 6, sk_wy_hit: 14, sk_wy_ball: 6, sk_wy_sum: 2, sk_wy_gone: 2, sk_wy_roar: 3, sk_wy_dive: 2, sk_wy_scale: 2, sk_wy_scaleoff: 3,
  sk_wy_spike: 4, sk_wy_sky: 2, sk_wy_drop: 10, sk_wy_awake: 2, sk_wy_ult: 2, sk_wy_assault: 2, sk_wy_blade: 2, sk_wy_arc: 4 };
const FOLLOW = new Set(["sk_wy_scale", "sk_wy_scaleoff", "sk_wy_awake"]);
// 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX)
export const WYVERN_GROUND = new Set(["sk_wy_sum", "sk_wy_sky"]);

export function drawWyvernFx(ctx, f, p, sq, g, time, quality = 1) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  DETAIL = clamp(quality, 0.15, 1);
  warmWyvern();
  const h = g && Number.isInteger(f.pi) ? g.heroes && g.heroes[f.pi] : null;
  if (FOLLOW.has(f.kind) && h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq, g); } finally { ctx.restore(); }
  return true;
}

/* ── 와이번 몸 — rpgArt 가 발 높이(땅 y)로 줄 세워 부른다. 땅에 그림자 · 화면 위 hz 에 몸(고도는 이 차이로만) ── */
export function wyvernUnitOf(h) { const v = wyvernView(h); return v && v.u ? { u: v.u, v } : null; }
export function drawWyvernUnit(ctx, o, time, sq, quality = 1) {
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  DETAIL = clamp(quality, 0.15, 1);
  warmWyvern();
  const { u, v } = o, row = v.tint === "plain" ? 0 : 1;
  const a = u.t < CT.appear ? clamp(u.t / CT.appear) : u.left < 0.4 ? u.left / 0.4 : 1;
  const bob = Math.sin(NOW * 3 + u.x * 0.01) * 3;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  cell(ctx, "wy_shade", loop(4, 0.36, u.x * 0.001), u.x, u.y, K, 0.55 * a * (1 - Math.min(0.5, u.hz / 400)));
  const i = u.f < 0.3 ? 4 + Math.min(2, Math.floor(u.f / 0.1)) : loop(4, 0.36, u.x * 0.001);
  cell(ctx, "wy_wyvern", i, u.x, u.y - u.hz + bob, K, a, row, !!u.fl);
  if (DETAIL > 0.5 && v.aw > 0) bits(ctx, u.x * 0.3, u.x, u.y - u.hz, sq, (NOW * 0.8) % 1, { emb: 6, wisp: 4 }, { r: 30, up: 30, spread: 0.9 });   // 역린 해방 중 — 와이번도 달아오른다
  ctx.restore();
}

/* ── 캐릭터에 겹치는 것 — rpgArt drawHero 가 그림 좌표(발밑 0,0 · 좌우 뒤집힌 판)에서 부른다. behind: 몸 뒤 ── */
export function drawWyvernHero(ctx, h, ww, hh, top, behind, time) {
  const v = wyvernView(h); if (!v) return;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  warmWyvern();
  if (behind) {
    if (v.aw > 0) {
      const el = v.awMax - v.aw, f = el < 1 ? once("wy_awake", el, 6) : 6 + loop(4, 0.6);
      cell(ctx, "wy_awake", f, 0, 0, K, 1, 0);
    } else if (v.wing) cell(ctx, "wy_awake", 6 + loop(4, 0.8), 0, 0, K, 0.45, 1);   // 연마 합계 130 — 보라 날개 잔상
    return;
  }
  if (v.sc) cell(ctx, "wy_scale", loop(SH.wy_scale.n, 0.6), 0, 4, K, 0.85);
  if (v.aw > 0) {   // 반룡 — 눈 · 몸의 붉은 기운(작은 불씨가 피어오른다)
    const n = Math.max(1, Math.round(4 * DETAIL));
    for (let i = 0; i < n; i++) { const s = (NOW * 0.9 + i / n) % 1; cell(ctx, "wy_bits", once("wy_bits", s), (rnd(i, 3) - 0.5) * ww * 0.6, top + hh * (0.9 - s * 0.7), 1, 1, BIT.emb); }
  }
}
// 오른 높이(화면 px) — 급강하 · 용성 동안 캐릭터 그림을 위로 띄운다(실제 자리는 땅)
export const wyvernAir = (h) => { const v = h && h.wy ? wyvernView(h) : null; return v ? v.air : 0; };

/* 아이콘 한 칸(스킬 단추 · 연습장) — CSS background. 한 칸 24px 을 size 픽셀로 */
export function wyvernIconStyle(i, size = 48) {
  const T = SH.wy_icons, k = size / T.w;
  return { width: size, height: size, backgroundImage: `url(${WYVERN_PX_SRC}wy_icons.webp)`, backgroundSize: `${T.w * T.cols * k}px ${T.h * k}px`,
    backgroundPosition: `${-i * T.w * k}px 0`, imageRendering: "pixelated", backgroundRepeat: "no-repeat" };
}
