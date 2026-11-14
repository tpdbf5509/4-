/* ── 히든 직업 BLOOD-001 그리기 — 적혈탄 · 혈흔 · 혈량 전환(11월 14일 1단계) ─────────────
   판정은 하지 않는다. 시각 · 크기는 판정 수치(bloodJobData.js)에서 읽는다 — 예고 · 범위와 실제 판정이 같다.
   크림슨 레퀴엠과 같은 pixelfx 시트(rpg/effects/blood-gun/*.webp, MIT pixelfx 로 뽑음)와 혈색 팔레트를 쓴다. 시트를 못 불러오면 코드 도트로 그린다.
   색은 연마 합계에 따라 바뀐다(f.c: red · violet · dusk) — 시트는 hue-rotate · 밝기로 물들이고 외곽은 늘 밝게.
   연출 종류: sk_bj_charge(차징 구체) · sk_bj_shot(본탄) · sk_bj_hit · sk_bj_end · sk_bj_burst(팽창) · sk_bj_reap(혈흔 회수 실) · sk_bj_conv(혈량 전환) · sk_bj_fizz(차징 취소) */
import { BLOOD_SHOT as S, BLOOD_COLORS, BLOOD } from "./bloodJobData.js";
import { BLOOD_PX_SRC, BLOOD_PX_SHEETS as SH } from "./bloodGunPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const PX = 3;
const pal = (f) => BLOOD_COLORS[f && f.c] || BLOOD_COLORS.red;
// 시트 물들이기 — 붉은 시트를 보라 · 어두운 보라로(외곽은 밝기로 살린다)
const TINT_FILTER = { red: "", violet: "hue-rotate(-40deg) saturate(1.1)", dusk: "hue-rotate(-55deg) brightness(0.6) contrast(1.4)" };

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${BLOOD_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
function cell(ctx, name, i, x, y, k, alpha, rot, c) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const sx = (i % T.cols) * T.w, sy = Math.floor(i / T.cols) * T.h;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  if (TINT_FILTER[c]) ctx.filter = TINT_FILTER[c];
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * k, -T.cy * k, T.w * k, T.h * k);
  ctx.restore();
  return true;
}
const once = (name, u) => Math.min(SH[name].n - 1, Math.floor(clamp(u) * SH[name].n));
const loopI = (name, t, spin) => Math.floor(((t / spin) % 1 + 1) % 1 * SH[name].n) % SH[name].n;

function dot(ctx, x, y, color, s, a = 1) { if (a <= 0) return; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
function ring(ctx, x, y, r, sq, color, a, w = 1, dash = 0) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}
function disc(ctx, x, y, r, sq, color, a) { if (a <= 0 || r <= 0) return; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.fill(); }

// 손끝 자리 — 겨눈 쪽으로 조금 앞
const hand = (f, sq) => [f.x + (f.ax || 1) * 26, f.y - S.lift + (f.ay || 0) * 26 * sq];

/* 차징 — 손바닥의 붉은 구체가 점점 작아지고 중심이 검붉게 · 밝은 테두리. 0.8 · 1.6초에 고리가 안으로 접힌다 */
function charge(ctx, f, t, sq) {
  const P = pal(f), [mx, my] = hand(f, sq), u = clamp(f.u || 0), tier = f.tier || 0;
  const R = 15 - 7 * u;                                 // 압축될수록 작아진다(충돌 지름은 그대로 16)
  for (let i = 0; i < 10; i++) {                       // 모여드는 방울
    const a = i * TAU / 10 + t * 3, d = 20 + 14 * (1 - u) + 6 * Math.sin(t * 9 + i);
    dot(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.85, i % 3 ? P.base : P.bright, PX - 1, 0.7);
  }
  disc(ctx, mx, my, R + 3, 1, P.rim, 0.55);
  disc(ctx, mx, my, R, 1, P.bright, 0.95);
  disc(ctx, mx, my, R * (0.35 + 0.45 * u), 1, u > 0.5 ? P.shadow : P.deep, 0.9);
  if (f.ping) ring(ctx, mx, my, 34 - 30 * clamp(t / 0.2), 1, P.glow, 1 - clamp(t / 0.2), 2);
  // 단계 점 두 개 — 0.8초 · 1.6초에 채운다
  for (let i = 0; i < 2; i++) { const x = f.x - 9 + i * 18, y = f.y - 112; ctx.globalAlpha = 1; ctx.strokeStyle = P.rim; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 4, 8, 8); if (tier > i) dot(ctx, x, y, P.bright, 6, 1); }
}
/* 본탄 — 작은 탄 + 짧은 가는 궤적. 빠른 탄은 궤적 간격을 늘리고 관통 탄은 이중 테두리 */
function shot(ctx, f, t, sq) {
  const P = pal(f), ax = f.ax || 1, ay = f.ay || 0, d = Math.min(f.len, f.v * t);
  const x = f.x0 + ax * d, y = f.y0 + ay * d * sq, rot = Math.atan2(ay * sq, ax);
  const k = 1.2 + 0.25 * (f.tier || 0);
  if (!cell(ctx, "bg_bolt", loopI("bg_bolt", t, 0.5), x, y, k, 1, rot, f.c)) {
    const gap = f.fast ? 9 : 6;
    for (let i = 1; i < 7; i++) dot(ctx, x - ax * i * gap, y - ay * i * gap * sq, i < 3 ? P.bright : P.base, PX - (i > 3 ? 1 : 0), 0.85 - i * 0.11);
  }
  disc(ctx, x, y, 6, 1, P.shadow, 0.9);
  disc(ctx, x, y, 4, 1, P.bright, 1);
  ring(ctx, x, y, 8, 1, P.rim, 0.9, 1);
  if (f.pierce) ring(ctx, x, y, 11, 1, P.glow, 0.8, 1);
}
function hit(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  if (cell(ctx, "bg_spark", once("bg_spark", u), f.x, f.y - 26, 1.3 + 0.2 * (f.tier || 0), 1 - u * 0.4, 0, f.c)) return;
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8, d = 6 + 26 * u; dot(ctx, f.x + Math.cos(a) * d, f.y - 26 + Math.sin(a) * d * sq, P.bright, PX, 1 - u); }
}
function end(ctx, f, t) {
  const P = pal(f), u = clamp(t / f.life);
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.4, d = 4 + 12 * u; dot(ctx, f.x + Math.cos(a) * d, f.y - S.lift + Math.sin(a) * d, P.base, PX - 1, 1 - u); }
}
/* 팽창 — 얇은 외곽 고리가 곧바로 실제 피해 반경을 보이고, 안쪽 혈액이 0.15초 부풀었다가 0.2초 흩어진다(판정은 처음 한 번) */
function burst(ctx, f, t, sq) {
  const P = pal(f), R = f.r, grow = clamp(t / 0.15), out = clamp((t - 0.15) / 0.2);
  ring(ctx, f.x, f.y, R, sq, P.rim, 1 - out, 1);
  if (!cell(ctx, "bg_boom", once("bg_boom", clamp(t / 0.4)), f.x, f.y - 12, R / 90, 1 - out * 0.7, 0, f.c)) {
    disc(ctx, f.x, f.y - 10, R * 0.85 * grow, sq, P.base, 0.55 * (1 - out));
    disc(ctx, f.x, f.y - 10, R * 0.45 * grow, sq, P.shadow, 0.6 * (1 - out));
  }
}
/* 혈흔 회수 — 대상에서 사용자 쪽으로 가느다란 붉은 실이 돌아온다(혈량은 적중 순간 이미 받았다) */
function reap(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), n = Math.max(1, f.n | 0);
  for (let j = 0; j < n; j++) {
    const k = clamp(u * 1.3 - j * 0.06), x = f.x + (f.x1 - f.x) * k, y = f.y - 30 + (f.y1 - 34 - (f.y - 30)) * k + Math.sin(k * Math.PI) * -(18 + j * 5);
    dot(ctx, x, y, j % 2 ? P.glow : P.bright, PX - 1, 1 - u * 0.6);
  }
  if (f.got && u < 0.6) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x1, f.y1 - 120 - 18 * u); }
  void sq;
}
/* 혈량 전환 — 가슴에서 팔로 붉은 맥동. 체력 소모와 실제 증가량을 따로 띄운다 */
function conv(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  ring(ctx, f.x, f.y - 40, 10 + 24 * u, 1, P.bright, 1 - u, 2);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const k = clamp(u * 1.6 - i * 0.12); dot(ctx, f.x + s * 22 * k, f.y - 44 + 10 * k, P.glow, PX - 1, 1 - u); }
  ctx.globalAlpha = 1 - u; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "#ff9a8a"; ctx.fillText(`체력 -${f.hp}`, f.x - 30, f.y - 118 - 16 * u);
  if (f.got) { ctx.fillStyle = P.glow; ctx.fillText(`혈량 +${f.got}`, f.x + 30, f.y - 118 - 16 * u); }
  void sq;
}
// 차징 취소 — 구체가 작은 방울로 흩어진다(소리 · 숫자 없음)
function fizz(ctx, f, t, sq) {
  const P = pal(f), [mx, my] = hand(f, sq), u = clamp(t / f.life);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.3, d = 4 + 22 * u; dot(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d + 12 * u * u, P.base, PX - 1, 1 - u); }
}

const KINDS = { sk_bj_charge: charge, sk_bj_shot: shot, sk_bj_hit: hit, sk_bj_end: end, sk_bj_burst: burst, sk_bj_reap: reap, sk_bj_conv: conv, sk_bj_fizz: fizz };
export const BLOOD_JOB_CAP = { sk_bj_charge: 4, sk_bj_shot: 8, sk_bj_hit: 12, sk_bj_end: 6, sk_bj_burst: 6, sk_bj_reap: 10, sk_bj_conv: 4, sk_bj_fizz: 4 };
export function drawBloodJobFx(ctx, f, p, sq) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq); } finally { ctx.restore(); }
  return true;
}

/* ── 내 혈흔 — 적의 체력바 아래 작은 방울 1~5개. 마지막 2초는 외곽이 줄어들고, 5중첩은 하나의 문양 + 숫자 5 ──
   다른 사람의 혈흔은 그리지 않는다(내 화면 값 bloodView(me).mk 만) */
const DROP = ["..#..", ".###.", "#####", "#####", ".###."];
function drop(ctx, x, y, color, a, s = 2) { DROP.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === "#") dot(ctx, x + i * s, y + j * s, color, s, a); }); }
export function drawBloodJobMarks(ctx, g, M, v, time, inView, c) {
  if (!v || !v.mk || !v.mk.length) return;
  const P = BLOOD_COLORS[c] || BLOOD_COLORS.red;
  for (const [k, n, left] of v.mk) {
    const o = k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))];
    if (!o || o.map !== M.id || o.dead || !inView(o.x, o.y)) continue;
    const rad = o.rad || 16, by = o.type ? o.y - rad * 2 - 14 : o.y - 108;   // 체력바 바로 아래쪽
    const warn = left < BLOOD.mark.warn ? clamp(left / BLOOD.mark.warn) : 1, a = 0.55 + 0.45 * warn;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (n >= BLOOD.mark.max) {
      const pulse = 0.8 + 0.2 * Math.sin(time * 8);
      ring(ctx, o.x, by + 5, 8 * (0.6 + 0.4 * warn), 1, P.rim, a, 1);
      drop(ctx, o.x - 5, by, P.bright, pulse, 2);
      ctx.globalAlpha = 1; ctx.fillStyle = P.rim; ctx.font = "bold 10px 'Do Hyeon', sans-serif"; ctx.textAlign = "left"; ctx.fillText("5", o.x + 9, by + 10);
    } else for (let i = 0; i < n; i++) {
      const x = o.x - (n * 12) / 2 + i * 12;
      ctx.globalAlpha = a; ctx.strokeStyle = P.rim; ctx.lineWidth = 1; ctx.strokeRect(x - 1, by - 1, 12 * warn, 12);
      drop(ctx, x, by, P.bright, a, 2);
    }
    ctx.restore();
  }
}
