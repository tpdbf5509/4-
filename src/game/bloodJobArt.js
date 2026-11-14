/* ── 히든 직업 BLOOD-001 그리기 — 적혈탄 · 혈흔 · 혈량 전환(11월 14일 1단계) ─────────────
   판정은 하지 않는다. 시각 · 크기는 판정 수치(bloodJobData.js)에서 읽는다 — 예고 · 범위와 실제 판정이 같다.
   연출은 pixelfx 시트(blood-job/px/*.webp, bloodJobPxData.js)로만 그린다(11월 14일 사용자 지시 — Codex 레이어는 걷어 냈다).
   코드로 그리는 것은 판정 범위를 보이는 1px 예고선 · 남은 시간 띠 · 숫자 글자뿐이다. 시트를 못 불러오면 그 연출은 비워 둔다.
   색은 연마 합계에 따라 바뀐다(f.c: red · violet · dusk) — 시트는 hue-rotate · 밝기로 물들이고 외곽은 늘 밝게.
   연출 종류: sk_bj_charge(차징 구체) · sk_bj_shot(본탄) · sk_bj_hit · sk_bj_end · sk_bj_burst(팽창) · sk_bj_reap(혈흔 회수 실) · sk_bj_conv(혈량 전환) · sk_bj_fizz(차징 취소) */
import { BLOOD_SHOT as S, BLOOD_COLORS, BLOOD } from "./bloodJobData.js";
import { BLOOD_JOB_PX_SRC, BLOOD_JOB_PX as SH } from "./bloodJobPxData.js";

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
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${BLOOD_JOB_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
function cell(ctx, name, i, x, y, k, alpha, rot, c, ky = 1) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0 || k <= 0) return false;
  const sx = (i % T.cols) * T.w, sy = Math.floor(i / T.cols) * T.h;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  if (TINT_FILTER[c]) ctx.filter = TINT_FILTER[c];
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  if (ky !== 1) ctx.scale(1, ky);
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * k, -T.cy * k, T.w * k, T.h * k);
  ctx.restore();
  return true;
}
const RUNE_K = 3, RUNE_SQ = 0.26;   // bj_rune 그리는 배수 · 그림 속 원의 세로 비율
const once = (name, u) => Math.min(SH[name].n - 1, Math.floor(clamp(u) * SH[name].n));
const loopI = (name, t, spin) => Math.floor(((t / spin) % 1 + 1) % 1 * SH[name].n) % SH[name].n;
// 한 번짜리 시트를 u(0~1)에 맞춰 · 반복 시트를 spin 초 주기로
const pxOnce = (ctx, name, u, x, y, k, a, rot, c, ky) => cell(ctx, name, once(name, u), x, y, k, a, rot, c, ky);
const pxLoop = (ctx, name, t, spin, x, y, k, a, rot, c, ky) => cell(ctx, name, loopI(name, t, spin), x, y, k, a, rot, c, ky);

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
  pxLoop(ctx, "bj_gather", t, 0.8, mx, my, 0.9 - 0.3 * u, 0.6 * (1 - u * 0.5), 0, f.c);   // 흩어진 피가 손끝으로 모여든다
  pxLoop(ctx, "bj_orb", t, 1.2 - 0.6 * u, mx, my, (R / 15) * 1.35, 0.95, 0, f.c);   // pixelfx 구슬 — 압축될수록 작고 빠르게 돈다
  if (f.ping) pxOnce(ctx, "bj_hit", clamp(t / 0.2), mx, my + 10, 0.7, 1 - clamp(t / 0.2), 0, f.c);
  // 단계 점 두 개 — 0.8초 · 1.6초에 채운다
  for (let i = 0; i < 2; i++) { const x = f.x - 9 + i * 18, y = f.y - 112; ctx.globalAlpha = 1; ctx.strokeStyle = P.rim; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 4, 8, 8); if (tier > i) dot(ctx, x, y, P.bright, 6, 1); }
}
/* 본탄 — 작은 탄 + 짧은 가는 궤적. 빠른 탄은 궤적 간격을 늘리고 관통 탄은 이중 테두리 */
function shot(ctx, f, t, sq) {
  const P = pal(f), ax = f.ax || 1, ay = f.ay || 0, d = Math.min(f.len, f.v * t);
  const x = f.x0 + ax * d, y = f.y0 + ay * d * sq, rot = Math.atan2(ay * sq, ax);
  const k = 1.2 + 0.25 * (f.tier || 0);
  pxLoop(ctx, "bj_drop", t, 0.4, x, y, k * (f.fast ? 1.15 : 1), 1, rot, f.c);
  if (f.pierce) pxLoop(ctx, "bj_drop", t + 0.2, 0.4, x, y, k * 1.4, 0.45, rot, f.c);   // 관통 탄은 겹친 그림자 탄
  void P;
}
function hit(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  pxOnce(ctx, "bj_hit", u, f.x, f.y - 26, 1.1 + 0.2 * (f.tier || 0), 1 - u * 0.4, 0, f.c);
  void P; void sq;
}
function end(ctx, f, t) {
  const P = pal(f), u = clamp(t / f.life);
  pxOnce(ctx, "bj_pop", u, f.x, f.y - S.lift + 10, 0.5, 1 - u * 0.5, 0, f.c);
  void P;
}
/* 팽창 — 얇은 외곽 고리가 곧바로 실제 피해 반경을 보이고, 안쪽 혈액이 0.15초 부풀었다가 0.2초 흩어진다(판정은 처음 한 번) */
function burst(ctx, f, t, sq) {
  const P = pal(f), R = f.r, grow = clamp(t / 0.15), out = clamp((t - 0.15) / 0.2);
  ring(ctx, f.x, f.y, R, sq, P.rim, 1 - out, 1);
  if (out > 0) pxOnce(ctx, "bj_pop", out, f.x, f.y + 6, R / 70, 0.8 * (1 - out), 0, f.c);   // 흩어지는 피
  void grow;
  pxOnce(ctx, "bj_burst", clamp(t / 0.45), f.x, f.y - 12, R / 70, 1 - out * 0.6, 0, f.c, sq / 0.6);
}
/* 혈흔 회수 — 대상에서 사용자 쪽으로 가느다란 붉은 실이 돌아온다(혈량은 적중 순간 이미 받았다) */
function reap(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), n = Math.max(1, f.n | 0);
  for (let j = 0; j < Math.min(n, 5); j++) {           // 회수한 혈흔마다 방울 하나가 날아 돌아온다
    const k = clamp(u * 1.3 - j * 0.06), x = f.x + (f.x1 - f.x) * k, y = f.y - 30 + (f.y1 - 34 - (f.y - 30)) * k + Math.sin(k * Math.PI) * -(18 + j * 5);
    const dk = clamp(k + 0.02), nx = f.x + (f.x1 - f.x) * dk, ny = f.y - 30 + (f.y1 - 34 - (f.y - 30)) * dk + Math.sin(dk * Math.PI) * -(18 + j * 5);
    if (k < 1) pxLoop(ctx, "bj_drop", t + j * 0.1, 0.4, x, y, 0.6, 1 - u * 0.5, Math.atan2(ny - y, nx - x), f.c);
  }
  if (f.got && u < 0.6) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x1, f.y1 - 120 - 18 * u); }
  void sq;
}
/* 혈량 전환 — 가슴에서 팔로 붉은 맥동. 체력 소모와 실제 증가량을 따로 띄운다 */
function conv(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  pxLoop(ctx, "bj_heart", t, 0.6, f.x, f.y - 44, 1.1 + 0.3 * u, 1 - u * u, 0, f.c);
  ctx.globalAlpha = 1 - u; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "#ff9a8a"; ctx.fillText(`체력 -${f.hp}`, f.x - 30, f.y - 118 - 16 * u);
  if (f.got) { ctx.fillStyle = P.glow; ctx.fillText(`혈량 +${f.got}`, f.x + 30, f.y - 118 - 16 * u); }
  void sq;
}
// 차징 취소 — 구체가 작은 방울로 흩어진다(소리 · 숫자 없음)
function fizz(ctx, f, t, sq) {
  const P = pal(f), [mx, my] = hand(f, sq), u = clamp(t / f.life);
  pxOnce(ctx, "bj_pop", u, mx, my + 14, 0.55, 1 - u * 0.4, 0, f.c);
  void P;
}


/* ── 2단계 연출 — 혈수 강타 · 혈검 · 혈막(11월 14일) ─────────────
   혈수 강타: 차징 중 손가락 → 손바닥 → 손목 차례로 윤곽이 차고(아래에서 위로 드러냄) 추가 단계마다 손 옆 고리 하나(최대 3).
   바닥에는 실제 길이 · 폭 직사각형 예고선과 가운데 조준선. 발동하면 주먹이 0.2초 만에 내려치고, 닿으면 바닥 충격파 · 균열 · 튀김.
   혈검: 첫 타 대각선 아래 · 둘째 반대 대각선 위 · 마지막 교차 베기. 궤적은 0.12초 안에 사라진다.
   혈막: 얇은 외곽선이 곧바로 생기고 안쪽 막은 0.15초 동안 찬다. 남은 시간은 외곽 띠. 맞으면 파문. 끝나면 안쪽으로 접힌다 */
// 바닥 직사각형 예고 — 내 자리에서 [ax, ay] 쪽 L × W(땅 비율 sq)
function groundRect(ctx, x, y, ax, ay, L, W, sq, color, a, center = true) {
  if (a <= 0) return;
  const px = -ay, py = ax, hw = W / 2;
  const pt = (al, sd) => [x + ax * al + px * sd, y + (ay * al + py * sd) * sq];
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); [pt(0, -hw), pt(L, -hw), pt(L, hw), pt(0, hw)].forEach(([qx, qy], i) => (i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy))); ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = clamp(a * 0.12); ctx.fillStyle = color; ctx.fill();
  if (center) { ctx.globalAlpha = clamp(a * 0.8); ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(...pt(10, 0)); ctx.lineTo(...pt(L, 0)); ctx.stroke(); }
  ctx.restore();
}
const handAt = (f, sq) => [f.x - (f.ax || 1) * 18, f.y - 70 + (f.ay || 0) * -10 * sq];
function smashCharge(ctx, f, t, sq) {
  const P = pal(f), u = clamp(f.u || 0), tier = f.tier || 0;
  groundRect(ctx, f.x, f.y, f.ax || 1, f.ay || 0, f.L, f.W, sq, P.rim, 0.75);
  const [hx, hy] = handAt(f, sq), size = 110 * (f.W / 180);
  // 손 — 피가 손으로 모여 점점 커진다
  pxLoop(ctx, "bj_gather", t, 0.8, hx, hy, (size / 70) * (0.5 + 0.7 * u), 0.55 + 0.4 * u, 0, f.c);
  for (let i = 0; i < tier; i++) {                    // 추가 소모 단계마다 손 옆 혈액 고리 하나
    const rx = hx + size * 0.55, ry = hy - size * 0.3 + i * 18;
    pxLoop(ctx, "bj_orb", t + i * 0.3, 1.2, rx, ry, 0.32, 0.95, 0, f.c);
  }
  if (f.ping) pxOnce(ctx, "bj_hit", clamp(t / 0.2), hx, hy, 0.9, 1 - clamp(t / 0.2), 0, f.c);
}
function smashFire(ctx, f, t, sq) {
  const P = pal(f), d = f.d || 0.2, ax = f.ax || 1, ay = f.ay || 0;
  const tx = f.x + ax * f.L * 0.62, ty = f.y + ay * f.L * 0.62 * sq;
  if (t < d) {                                        // 내려치기 — 손 뒤에서 주먹이 앞으로 크게 떨어진다
    groundRect(ctx, f.x, f.y, ax, ay, f.L, f.W, sq, P.rim, 0.9);
    const u = clamp(t / d), e = u * u, [hx, hy] = handAt(f, sq);
    const x = hx + (tx - hx) * e, y = hy - 60 * Math.sin(u * Math.PI) + (ty - 30 - hy) * e, k = f.W / 180;
    pxLoop(ctx, "bj_gather", t, 0.4, x, y, 1.9 * k * (1.15 - 0.25 * e), 0.95, 0, f.c);   // 피 덩어리가 앞으로 내려친다
    return;
  }
  const u = clamp((t - d) / 0.3);                     // 손끝부터 풀려 0.3초 안에 사라진다
  pxOnce(ctx, "bj_pop", u, tx, ty + 4, 1.1 * (f.W / 180), 0.85 * (1 - u * 0.5), 0, f.c);   // 덩어리가 풀려 튄다
}
function slam(ctx, f, t, sq) {
  const u = clamp(t / f.life), D = f.W * 1.5;
  pxOnce(ctx, "bj_slam", u, f.x, f.y + 6, D / 230, 0.9 * (1 - u * 0.5), 0, f.c, sq / 0.6);   // pixelfx 바닥 충격 · 흙먼지 · 돌
  pxOnce(ctx, "bj_hit", clamp(u * 1.6), f.x, f.y - 16, D / 120, 0.9 * (1 - u), 0, f.c);
}
function sword(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / 0.12), ax = f.ax || 1, ay = f.ay || 0, rot = Math.atan2(ay * sq, ax), R = f.r || 140;
  const a = 1 - u;
  const v = clamp(t / 0.3), flipY = f.i === 1 ? -1 : 1;   // 대각선 아래 → 반대 대각선 위(뒤집기) → 교차
  if (f.i === 2) pxOnce(ctx, "bj_cross", v, f.x, f.y - 30, R / 80, 1 - v * 0.4, rot, f.c);
  else pxOnce(ctx, "bj_slash", v, f.x, f.y - 30, R / 80, 1 - v * 0.4, rot, f.c, flipY);
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.25 * a, 1, 4);   // 실제 반경을 옅게
}
function veil(ctx, f, t, sq) {
  const P = pal(f), fill = f.start ? clamp(t / 0.15) : 1, left = 1 - clamp(f.u || 0);
  const x = f.x, y = f.y - 40, D = 140 * (f.k || 1);   // 증폭 · 혈역 크기 보너스(보이는 크기만)
  ring(ctx, x, y, D / 2, 1, P.rim, 0.85, 1);         // 외곽선은 처음부터 완성
  pxLoop(ctx, "bj_shield", t, 2.4, x, y, (D / 66) * (0.6 + 0.4 * fill), 0.75 * fill, 0, f.c);   // pixelfx 막(경선이 돈다)
  // 남은 시간 — 외곽 띠
  ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = P.glow; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, D / 2 + 5, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke(); ctx.restore();
  void sq;
}
function veilEnd(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), x = f.x, y = f.y - 40, D = 140 * (1 - 0.7 * u);
  pxLoop(ctx, "bj_shield", t, 2.4, x, y, D / 66, 0.5 * (1 - u), 0, f.c);   // 막이 줄어들며 접힌다
  ring(ctx, x, y, D / 2, 1, P.rim, 1 - u, 1);
  if (f.ok) pxOnce(ctx, "bj_suck", u, x, y, 0.85, 1 - u * 0.3, 0, f.c);   // 회수면 안으로 빨려 접힌다
  else pxOnce(ctx, "bj_pop", u, x, y + 30, 0.9, 1 - u * 0.4, 0, f.c);      // 아니면 피가 흩어진다
  if (f.got && u < 0.7) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x, f.y - 120 - 16 * u); }
  void sq;
}
function ripple(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), ox = Math.sin(f.x * 3.1 + f.y) * 30, oy = Math.cos(f.x + f.y * 1.7) * 24;
  pxOnce(ctx, "bj_hit", u, f.x + ox * 0.5, f.y - 30 + oy * 0.5, 0.45, 0.8 * (1 - u), 0, f.c);   // 막에 맞은 자리
  const side = ox < 0 ? Math.PI : 0;                  // 맞은 쪽으로 막이 번쩍인다
  pxOnce(ctx, "bj_block", u, f.x + Math.cos(side) * 40, f.y - 40, 0.9, 1 - u * 0.4, side, f.c, side ? -1 : 1);
  void P; void sq;
}

/* ── 3단계 연출 — 혈역 증폭 · 폭주 · 탈진 ─────────────
   혈역: 발밑 문양에서 혈관이 사방으로 뻗고 0.4초 동안 안쪽이 검붉게 물든다(판정 반경은 처음부터 350). 외곽선은 얇고 선명하게 · 안쪽은 옅게.
   마지막 2초는 외곽선 밝기가 안쪽으로 좁아진다(실제 반경은 그대로). 끝나면 바깥부터 걷히고, 과부하면 중심으로 급히 끌려든다 */
function field(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 350, open = f.start ? clamp(t / 0.4) : 1, u = clamp(f.u || 0);
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.8, 1);
  // pixelfx 룬 원 — 발밑 문양(크게 키우면 도트가 뭉개져 RUNE_K 배까지만). 판정 반경은 1px 외곽선이 보인다
  pxLoop(ctx, "bj_rune", t, 4, f.x, f.y, RUNE_K * (0.4 + 0.6 * open), 0.85, 0, f.c, Math.min(1.6, sq / RUNE_SQ));
  const left = (1 - u) * 10;
  if (left < 2) ring(ctx, f.x, f.y, R * (0.92 + 0.08 * (left / 2)), sq, P.glow, 0.5 + 0.5 * Math.sin(t * 20), 2);   // 끝나 간다 — 실제 반경은 그대로
}
function fieldEnd(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 350, u = clamp(t / f.life), k = f.over ? 1 - clamp(u * 2.5) : 1 - u;
  pxLoop(ctx, "bj_rune", t, 4, f.x, f.y, RUNE_K * k, 0.8 * (1 - u), 0, f.c, Math.min(1.6, sq / RUNE_SQ));
  if (f.over) pxOnce(ctx, "bj_suck", u, f.x, f.y - 40, 1.2, 1 - u * 0.5, 0, f.c);   // 과부하 — 중심으로 급히 끌려든다
  ring(ctx, f.x, f.y, R * k, sq, P.rim, 0.8 * (1 - u), 1);
}
// 흡수 — 혈역 바닥에서 사용자 쪽으로 방울이 흘러든다 · 실제 증가량
function absorb(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  for (let i = 0; i < 7; i++) {
    const a = i * TAU / 7 + f.x * 0.01, d0 = 120 + (i % 3) * 60, sx = f.x1 + Math.cos(a) * d0, sy = f.y1 + Math.sin(a) * d0 * sq;
    const k = clamp(u * 1.4 - i * 0.05), x = sx + (f.x1 - sx) * k, y = sy + (f.y1 - 40 - sy) * k;
    if (k < 1) pxLoop(ctx, "bj_drop", t + i * 0.07, 0.4, x, y, 0.45, 0.9 * (1 - k * 0.5), Math.atan2(f.y1 - 40 - y, f.x1 - x), f.c);
  }
  if (u < 0.75) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x1, f.y1 - 124 - 14 * u); }
}
// 폭주 — 시작은 고리가 바깥으로 터진다(피해 · 넉백 없음) · 지속은 몸을 감싸는 기운
function rage(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  if (f.start) {
    pxOnce(ctx, "bj_dark", u, f.x, f.y - 40, 1.1, 1 - u * 0.3, 0, f.c);   // 검붉은 핵이 터지며 고리가 퍼진다(피해 · 넉백 없음)
    return;
  }
  pxLoop(ctx, "bj_rage", t, 2.4, f.x, f.y + 4, 1.25, 0.6 + 0.3 * Math.sin(Math.PI * u), 0, f.c);   // 발밑 검붉은 불꽃이 몸을 감싼다
  void P; void sq;
}
// 탈진 — 혈액 갑주가 떨어져 사라진다
function tired(ctx, f, t, sq) {
  const u = clamp(t / f.life);
  pxOnce(ctx, "bj_fall", u, f.x, f.y - 50, 0.8, 0.95 * (1 - u * 0.4), 0, f.c);   // 혈액 갑주 조각이 흩날려 떨어진다
  void sq;
}

/* ── 4단계 — 해금 경로 연출 ─────────────
   lead: 핏방울 하나가 핏자국에서 유리관 쪽으로 기어간다. warn: 시험 3단계 바닥 예고 원(안쪽이 시간에 맞춰 찬다) */
function lead(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), e = u * u * (3 - 2 * u);
  const x = f.x + (f.x1 - f.x) * e, y = f.y + (f.y1 - f.y) * e - Math.abs(Math.sin(u * 18)) * 4;
  pxLoop(ctx, "bj_drop", t, 0.4, x, y, 0.5, 1 - u * 0.3, Math.atan2(f.y1 - f.y, f.x1 - f.x), f.c);
  void P; void sq;
}
function warn(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / (f.d || 1.5));
  ring(ctx, f.x, f.y, f.r, sq, P.rim, t > (f.d || 1.5) ? 1 - clamp((t - f.d) / 0.2) : 0.9, 1);
  disc(ctx, f.x, f.y, f.r * u, sq, P.bright, 0.22);
}

const KINDS = { sk_bj_lead: lead, sk_bj_warn: warn, sk_bj_field: field, sk_bj_fieldend: fieldEnd, sk_bj_absorb: absorb, sk_bj_rage: rage, sk_bj_tired: tired, sk_bj_smc: smashCharge, sk_bj_smash: smashFire, sk_bj_slam: slam, sk_bj_sword: sword, sk_bj_veil: veil, sk_bj_veilend: veilEnd, sk_bj_ripple: ripple, sk_bj_charge: charge, sk_bj_shot: shot, sk_bj_hit: hit, sk_bj_end: end, sk_bj_burst: burst, sk_bj_reap: reap, sk_bj_conv: conv, sk_bj_fizz: fizz };
export const BLOOD_JOB_CAP = { sk_bj_lead: 2, sk_bj_warn: 2, sk_bj_field: 4, sk_bj_fieldend: 4, sk_bj_absorb: 6, sk_bj_rage: 4, sk_bj_tired: 4, sk_bj_smc: 4, sk_bj_smash: 4, sk_bj_slam: 4, sk_bj_sword: 8, sk_bj_veil: 4, sk_bj_veilend: 4, sk_bj_ripple: 6, sk_bj_charge: 4, sk_bj_shot: 8, sk_bj_hit: 12, sk_bj_end: 6, sk_bj_burst: 6, sk_bj_reap: 10, sk_bj_conv: 4, sk_bj_fizz: 4 };
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

/* ── 단서 자리 그림 — 맵에 늘 있는 물건(누구에게나 보인다). 조사 여부는 화면 칸(rpg-talk)이 알려 준다 ──
   핏자국(토끼 사냥터 흙길 옆) · 압축기(훈련장 허수아비 뒤, 원 셋) · 분수 바닥 금속판(광장) · 낡은 수문(광장) */
export function drawBloodSpots(ctx, M, spots, time, sq) {
  const P = BLOOD_COLORS.red;
  for (const s of spots) {
    if (s.map !== M.id) continue;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (s.id === "trail") {
      for (let i = 0; i < 6; i++) dot(ctx, s.x - 30 + i * 11, s.y + Math.sin(i * 1.7) * 6, i % 2 ? P.deep : P.base, PX + (i % 3 === 0 ? 1 : 0), 0.75);
    } else if (s.id === "press") {
      ctx.globalAlpha = 1; ctx.fillStyle = "#4a3a2a"; ctx.fillRect(s.x - 26, s.y - 64, 52, 64);
      ctx.strokeStyle = "#c9a36a"; ctx.lineWidth = 1; ctx.strokeRect(s.x - 26.5, s.y - 64.5, 53, 65);
      ctx.fillStyle = "#8a6a3a"; ctx.fillRect(s.x - 30, s.y - 70, 60, 8);
      [[-14, 4], [0, 7], [14, 4]].forEach(([dx, r]) => { ctx.beginPath(); ctx.arc(s.x + dx, s.y - 38, r, 0, TAU); ctx.strokeStyle = "#e6c48a"; ctx.stroke(); });
    } else if (s.id === "plate") {
      const k = 0.5 + 0.5 * Math.sin(time * 1.3);
      ctx.globalAlpha = 0.35 + 0.35 * k; ctx.fillStyle = "#9fb4c0"; ctx.fillRect(s.x - 10, s.y - 4, 20, 8);
      ctx.globalAlpha = 0.5 * k; ctx.fillStyle = P.bright; ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillText("001", s.x, s.y + 3);
    } else if (s.id === "sluice") {
      ctx.globalAlpha = 1; ctx.fillStyle = "#5a5048"; ctx.fillRect(s.x - 8, s.y - 30, 16, 30);
      ctx.strokeStyle = "#a89a88"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y - 34, 9, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  void sq;
}
