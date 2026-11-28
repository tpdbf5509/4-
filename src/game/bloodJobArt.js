/* ── 히든 직업 BLOOD-001 그리기 — 적혈탄 · 혈흔 · 혈량 전환(11월 14일 1단계) ─────────────
   판정은 하지 않는다. 시각 · 크기는 판정 수치(bloodJobData.js)에서 읽는다 — 예고 · 범위와 실제 판정이 같다.
   연출은 pixelfx 시트(blood-job/px/*.webp, bloodJobPxData.js)로만 그린다(11월 14일 사용자 지시 — Codex 레이어는 걷어 냈다).
   코드로 그리는 것은 판정 범위를 보이는 1px 예고선 · 남은 시간 띠 · 숫자 글자뿐이다. 시트를 못 불러오면 그 연출은 비워 둔다.
   색은 연마 합계에 따라 바뀐다(f.c: red · violet · dusk) — 시트는 hue-rotate · 밝기로 물들이고 외곽은 늘 밝게.
   연출 종류: sk_bj_charge(차징 구체) · sk_bj_shot(본탄) · sk_bj_hit · sk_bj_end · sk_bj_burst(팽창) · sk_bj_reap(혈흔 회수 실) · sk_bj_conv(혈량 전환) · sk_bj_fizz(차징 취소) */
import { BLOOD_SHOT as S, BLOOD_COLORS, BLOOD, BLOOD_FIELD as FD, BLOOD_TINT, BLOOD_FORM } from "./bloodJobData.js";
import { BLOOD_JOB_PX_SRC, BLOOD_JOB_PX as SH } from "./bloodJobPxData.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const PX = 3;
const pal = (f) => BLOOD_COLORS[f && f.c] || BLOOD_COLORS.red;
// 시트 물들이기 — 붉은 시트를 보라 · 어두운 보라로(외곽은 밝기로 살린다)
const TINT_FILTER = { red: "", violet: "hue-rotate(-40deg) saturate(1.1)", dusk: "hue-rotate(-55deg) brightness(0.6) contrast(1.4)",
  abyss: "hue-rotate(-75deg) brightness(0.42) contrast(1.6) saturate(1.2)" };   // 원초적 지배(11월 16일) — 검은색 · 어두운 보라

const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) { im = imgs[name] = new Image(); im.onerror = () => { imgs[name] = null; }; im.src = `${BLOOD_JOB_PX_SRC}${name}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
/* 픽셀 그림은 정수 배로만 키운다 — 1배보다 작게 그리거나 1.3 · 2.6 배처럼 그리면 도트가 빠지고 뭉개져 어색하다(11월 14일 사용자 지적).
   세로만 누르는 것(ky)도 도트 모양이 찌그러져 쓰지 않는다 */
const pxK = (k) => Math.max(1, Math.round(k));
function cell(ctx, name, i, x, y, k0, alpha, rot, c, mirror = false) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0 || k0 <= 0) return false;
  const k = pxK(k0);
  const sx = (i % T.cols) * T.w, sy = Math.floor(i / T.cols) * T.h;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  if (TINT_FILTER[c]) ctx.filter = TINT_FILTER[c];
  // 왼쪽을 볼 때는 180도 돌리지 않고 좌우로 뒤집는다 — 돌리면 베기 · 방울이 위아래까지 뒤집혀 어색하다
  const flipX = rot && Math.cos(rot) < -1e-6;
  ctx.translate(x, y);
  if (flipX || mirror) ctx.scale(flipX ? -1 : 1, mirror ? -1 : 1);
  if (rot) ctx.rotate(flipX ? Math.atan2(Math.sin(rot), -Math.cos(rot)) * (mirror ? -1 : 1) : rot * (mirror ? -1 : 1));
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * k, -T.cy * k, T.w * k, T.h * k);
  ctx.restore();
  return true;
}
/* 형상화 시트(11월 15일) — 몸은 연마 색으로 물들이고 밝은 외곽(_rim)은 색조만 바꿔 늘 밝게 둔다.
   row 는 방향 줄(rows), i 는 칸. flipX 면 좌우로 뒤집는다(왼쪽을 볼 때) */
const RIM_FILTER = { red: "", violet: "hue-rotate(-40deg)", dusk: "hue-rotate(-55deg) saturate(0.9)", abyss: "hue-rotate(-80deg) saturate(0.8)" };
function formCell(ctx, name, row, i, x, y, k0, alpha, c, flipX = false) {
  const T = SH[name], im = sheet(name); if (!im || alpha <= 0) return false;
  const rim = T.rim ? sheet(`${name}_rim`) : null, k = pxK(k0), j = Math.max(0, Math.min(T.n - 1, i | 0)) + (row | 0) * T.cols;
  const sx = (j % T.cols) * T.w, sy = Math.floor(j / T.cols) * T.h;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); if (flipX) ctx.scale(-1, 1);
  if (TINT_FILTER[c]) ctx.filter = TINT_FILTER[c];
  ctx.drawImage(im, sx, sy, T.w, T.h, -T.cx * k, -T.cy * k, T.w * k, T.h * k);
  if (rim) { ctx.filter = RIM_FILTER[c] || "none"; ctx.drawImage(rim, sx, sy, T.w, T.h, -T.cx * k, -T.cy * k, T.w * k, T.h * k); }
  ctx.restore();
  return true;
}
// 처음 BLOOD-001 을 그릴 때 시트를 한꺼번에 불러 둔다 — 첫 혈검 · 혈막 · 강타가 빈 칸으로 지나가지 않게
let warmed = 0;
export function warmBloodJob() { if (warmed) return; warmed = 1; for (const k of Object.keys(SH)) { sheet(k); if (SH[k].rim) sheet(`${k}_rim`); } }
const row16 = (a) => ((Math.round(a / (TAU / 16)) % 16) + 16) % 16;
// 오른쪽 반 5줄(-90 · -45 · 0 · 45 · 90도) — 왼쪽은 뒤집는다
function row5(a) {
  const flip = Math.cos(a) < -1e-6;
  let b = flip ? Math.PI - a : a;
  b = Math.atan2(Math.sin(b), Math.cos(b));
  return [Math.max(0, Math.min(4, Math.round((Math.max(-Math.PI / 2, Math.min(Math.PI / 2, b)) + Math.PI / 2) / (Math.PI / 4)))), flip];
}
const onceI = (name, u) => Math.min(SH[name].n - 1, Math.floor(clamp(u) * SH[name].n));
const loopIdx = (name, spin) => Math.floor(((NOW / spin) % 1) * SH[name].n) % SH[name].n;

const POOL_R = 117, POOL_OPEN = 0.6, POOL_A = 0.8;   // 혈역 피 웅덩이 — 그림 속 반지름(1배 픽셀, 판정 반경 / 이 값 = 배수) · 번지는 시간 · 투명도(적 공격 예고가 비치게)
const once = (name, u) => Math.min(SH[name].n - 1, Math.floor(clamp(u) * SH[name].n));
const loopI = (name, t, spin) => Math.floor(((t / spin) % 1 + 1) % 1 * SH[name].n) % SH[name].n;
// 한 번짜리 시트를 u(0~1)에 맞춰 · 반복 시트를 spin 초 주기로
// 반복 시트는 이 기기 시계(NOW)로 돈다 — 연출이 0.25초마다 새로 생겨도(혈역 · 폭주 기운) 처음 칸으로 되감기지 않게. t 는 칸을 어긋나게 할 몫만 쓴다
let NOW = 0;
const pxOnce = (ctx, name, u, x, y, k, a, rot, c, mirror) => cell(ctx, name, once(name, u), x, y, k, a, rot, c, mirror);
const pxLoop = (ctx, name, off, spin, x, y, k, a, rot, c) => cell(ctx, name, loopI(name, NOW + (off % 1), spin), x, y, k, a, rot, c);

function dot(ctx, x, y, color, s, a = 1) { if (a <= 0) return; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
function ring(ctx, x, y, r, sq, color, a, w = 1, dash = 0) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash([dash, dash]);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore();
}
function disc(ctx, x, y, r, sq, color, a) { if (a <= 0 || r <= 0) return; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.fill(); }

// 손끝 자리 — 겨눈 쪽으로 조금 앞
const hand = (f, sq) => [f.x + (f.ax || 1) * 26, f.y - S.lift + (f.ay || 0) * 26 * sq];

/* 차징 — 손끝의 작은 핏빛 구슬(bj_core). 단계가 오를수록 작고 단단해지고 둘레 방울이 늘고 빨리 돈다.
   11월 15일 사용자 "압축되는 거 크기 크게 줄여줘" — 예전 bj_gather + bj_orb(1배, 지름 80px 넘음) 대신 지름 약 32px */
const CORE_K = 2;
function charge(ctx, f, t, sq) {
  const P = pal(f), [mx, my] = hand(f, sq), tier = f.tier || 0;
  formCell(ctx, "bj_core", Math.min(2, tier), loopIdx("bj_core", 0.7 - 0.15 * tier), mx, my, CORE_K, 1, f.c);
  void t;                                              // 단계가 오를 때의 큰 타격 빛(bj_hit)은 뺐다 — 구슬 줄 · 머리 위 점 · 소리로 알린다
  // 단계 점 두 개 — 0.6초 · 1.2초에 채운다
  for (let i = 0; i < 2; i++) { const x = f.x - 9 + i * 18, y = f.y - 112; ctx.globalAlpha = 1; ctx.strokeStyle = P.rim; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 4, 8, 8); if (tier > i) dot(ctx, x, y, P.bright, 6, 1); }
}
/* 본탄 — 작은 탄 + 짧은 가는 궤적. 빠른 탄은 궤적 간격을 늘리고 관통 탄은 이중 테두리 */
function shot(ctx, f, t, sq) {
  const P = pal(f), ax = f.ax || 1, ay = f.ay || 0, d = Math.min(f.len, f.v * t);
  const x = f.x0 + ax * d, y = f.y0 + ay * d * sq, rot = Math.atan2(ay * sq, ax);
  const k = 1.2 + 0.25 * (f.tier || 0);
  pxLoop(ctx, "bj_drop", 0, 0.4, x, y, k * (f.fast ? 1.15 : 1), 1, rot, f.c);
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
  pxOnce(ctx, "bj_burst", clamp(t / 0.45), f.x, f.y - 12, R / 70, 1 - out * 0.6, 0, f.c);
}
/* 혈흔 회수 — 대상에서 사용자 쪽으로 가느다란 붉은 실이 돌아온다(혈량은 적중 순간 이미 받았다) */
function reap(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), n = Math.max(1, f.n | 0);
  for (let j = 0; j < Math.min(n, 5); j++) {           // 회수한 혈흔마다 방울 하나가 날아 돌아온다
    const k = clamp(u * 1.3 - j * 0.06), x = f.x + (f.x1 - f.x) * k, y = f.y - 30 + (f.y1 - 34 - (f.y - 30)) * k + Math.sin(k * Math.PI) * -(18 + j * 5);
    const dk = clamp(k + 0.02), nx = f.x + (f.x1 - f.x) * dk, ny = f.y - 30 + (f.y1 - 34 - (f.y - 30)) * dk + Math.sin(dk * Math.PI) * -(18 + j * 5);
    if (k < 1) pxLoop(ctx, "bj_drop", j * 0.1, 0.4, x, y, 0.6, 1 - u * 0.5, Math.atan2(ny - y, nx - x), f.c);
  }
  if (f.got && u < 0.6) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x1, f.y1 - 120 - 18 * u); }
  void sq;
}
/* 혈량 전환 — 가슴에서 팔로 붉은 맥동. 체력 소모와 실제 증가량을 따로 띄운다 */
function conv(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  pxLoop(ctx, "bj_heart", 0, 0.6, f.x, f.y - 44, 1.1 + 0.3 * u, 1 - u * u, 0, f.c);
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
const handAt = (f, sq) => [f.x + (f.ax || 1) * 8, f.y - 100 + (f.ay || 0) * -10 * sq];   // 머리 위 조금 앞 — 손이 몸을 가리지 않게
// 혈수 강타 — 손바닥이 먼저 · 손가락이 뒤에 만들어진다(차징 첫 0.3초). 다 되면 편 손이 손끝에서 피를 떨군다
const HAND_FORM = 0.3, HAND_W = 55;                   // 손 그림 폭 기준(1배 픽셀) — 판정 폭 180 이면 2배, 넓히면 3배
function smashCharge(ctx, f, t, sq) {
  const P = pal(f), u = clamp(f.u || 0), tier = f.tier || 0, ct = u * 0.9 + t;
  groundRect(ctx, f.x, f.y, f.ax || 1, f.ay || 0, f.L, f.W, sq, P.rim, 0.75);
  const [hx, hy] = handAt(f, sq), size = 110 * (f.W / 180), k = size / HAND_W, flip = (f.ax || 1) < 0;
  if (ct < HAND_FORM) formCell(ctx, "bj_hd_form", 0, onceI("bj_hd_form", ct / HAND_FORM), hx, hy, k, 1, f.c, flip);
  else formCell(ctx, "bj_hd_open", 0, loopIdx("bj_hd_open", 0.6), hx, hy, k, 1, f.c, flip);
  for (let i = 0; i < tier; i++) {                    // 추가 소모 단계마다 손 옆 혈액 방울 하나
    const rx = hx + (flip ? -1 : 1) * size * 0.55, ry = hy - size * 0.3 + i * 18;
    pxLoop(ctx, "bj_drop", i * 0.3, 0.4, rx, ry, 1, 0.95, -Math.PI / 2, f.c);   // 위로 솟는 방울
  }
  if (f.ping) pxOnce(ctx, "bj_hit", clamp(t / 0.2), hx, hy, 0.9, 1 - clamp(t / 0.2), 0, f.c);
}
// 발동 — 손가락을 오므려 주먹을 쥐고(앞 35%) 앞으로 내려친다. 닿으면 손끝부터 피로 풀린다(0.3초)
function smashFire(ctx, f, t, sq) {
  const P = pal(f), d = f.d || 0.2, ax = f.ax || 1, ay = f.ay || 0, flip = ax < 0;
  const tx = f.x + ax * f.L * 0.62, ty = f.y + ay * f.L * 0.62 * sq, k = (110 * (f.W / 180)) / HAND_W;
  if (t < d) {
    groundRect(ctx, f.x, f.y, ax, ay, f.L, f.W, sq, P.rim, 0.9);
    const [hx, hy] = handAt(f, sq), c = clamp(t / (d * 0.35));
    if (c < 1) return void formCell(ctx, "bj_hd_clench", 0, onceI("bj_hd_clench", c), hx, hy, k, 1, f.c, flip);
    const u = clamp((t - d * 0.35) / (d * 0.65)), e = u * u;
    const x = hx + (tx - hx) * e, y = hy - 50 * Math.sin(u * Math.PI) + (ty - 26 - hy) * e;
    formCell(ctx, "bj_hd_clench", 0, SH.bj_hd_clench.n - 1, x, y, k * (1 + 0.25 * e), 1, f.c, flip);   // 주먹이 커지며 떨어진다
    return;
  }
  const u = clamp((t - d) / 0.3);
  formCell(ctx, "bj_hd_unravel", 0, onceI("bj_hd_unravel", u), tx, ty - 26, k * 1.25, 1 - u * 0.2, f.c, flip);
}
function slam(ctx, f, t, sq) {
  const u = clamp(t / f.life), D = f.W * 1.5;
  pxOnce(ctx, "bj_slam", u, f.x, f.y + 6, D / 230, 0.9 * (1 - u * 0.5), 0, f.c);   // pixelfx 바닥 충격 · 흙먼지 · 돌
  pxOnce(ctx, "bj_hit", clamp(u * 1.6), f.x, f.y - 16, D / 120, 0.9 * (1 - u), 0, f.c);
  void sq;
}
// 혈검 베기 궤적 — 1타 위 → 아래 · 2타 아래 → 위 · 3타 크게 내려베기. 몸 가운데 둘레 실제 반경(반경 1px 예고선은 옅게)
const ARC_R = 47, ARC_K = 2, CUT_K = 2;                // 궤적 그림 반지름(1배 픽셀) · 배수 — 몸에 붙어 보이게 2배(반지름 약 94). 실제 반경은 1px 예고선. CUT_K 베인 자리 배수
function sword(ctx, f, t, sq) {
  const P = pal(f), ax = f.ax || 1, ay = f.ay || 0, R = f.r || 140, [row, flip] = row5(Math.atan2(ay * sq, ax));
  const name = f.i === 2 ? "bj_arc3" : f.i === 1 ? "bj_arc2" : "bj_arc1";
  formCell(ctx, name, row, Math.min(SH[name].n - 1, 1 + Math.floor(clamp(t / f.life) * (SH[name].n - 1))), f.x, f.y - 34, ARC_K * Math.min(1.5, R / 140), 1, f.c, flip);
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.22 * (1 - clamp(t / f.life)), 1, 4);
  // 베인 자리 — 맞은 적 몸 위에 사선 + 터지는 피(11월 16일). 칼이 지나간 뒤 조금 늦게 그어진다
  if (f.hs) for (const [hx, hy] of f.hs) { const v = clamp((t - 0.04) / (f.life - 0.04)); if (t >= 0.04) formCell(ctx, "bj_cut", 0, onceI("bj_cut", v), hx, hy - 36, CUT_K, 1, f.c, flip !== (f.i === 1)); }
}
// 혈검이 풀린다 — 손에 들려 있던 자리에서 칼끝부터 피로 흘러내린다
const bladeSeen = new Map();                          // pi → { x, y, a, at } — 마지막으로 그린 손 · 칼 방향(drawBloodBlade 가 적는다)
const swEndAt = new WeakMap();
function swordEnd(ctx, f, t, sq) {
  let at = swEndAt.get(f.src || f);
  if (!at) { const b = bladeSeen.get(f.pi); at = b && NOW - b.at < 0.5 ? b : { x: f.x + (f.ax || 1) * 14, y: f.y - 36, a: Math.atan2((f.ay || 0) * sq, f.ax || 1) }; swEndAt.set(f.src || f, at); }
  if (f.ph === 1) return void pxOnce(ctx, "bj_pop", t / f.life, at.x, at.y + 8, 0.5, 1 - t / f.life * 0.5, 0, f.c);   // 만들던 중에 끊겼다 — 모이던 피가 흩어진다
  formCell(ctx, "bj_sw_break", row16(at.a), onceI("bj_sw_break", t / f.life), at.x, at.y, BLADE_K, 1, f.c);
}
// 혈막 — 피가 몸 둘레에서 휘어진 방패판 두 겹으로 굳는다(0.3초) · 맞으면 그쪽 판이 움푹 · 파문 · 끝나면 판이 안으로 접혀 풀린다
const VEIL_D = 70, VEIL_FORM = 0.3;                   // 혈막 그림 지름(1배 픽셀) — 보이는 지름 140 × 크기 보너스
const veilHit = new Map();                            // pi → { born, a } — 마지막으로 맞은 때(기기 시계 performance.now) · 방향
function veil(ctx, f, t, sq) {
  const P = pal(f), left = 1 - clamp((f.u || 0) + (f.max > 0 ? t / f.max : 0));   // 남은 시간은 낸 뒤 흐른 만큼 줄인다
  const x = f.x, y = f.y - 40, D = 140 * (f.sz || 1), k = D / VEIL_D, age = (f.u || 0) * (f.max || 15) + t;
  const hit = veilHit.get(f.pi), ht = hit ? performance.now() / 1000 - hit.born : 9;   // 기기 시계 — g.t 는 손님 화면에서 앞뒤로 맞춰진다
  if (age < VEIL_FORM) formCell(ctx, "bj_vl_form", 0, onceI("bj_vl_form", age / VEIL_FORM), x, y, k, 1, f.c);
  else if (ht < 0.35) { const [row, flip] = row5(hit.a); formCell(ctx, "bj_vl_hit", row, onceI("bj_vl_hit", ht / 0.35), x, y, k, 1, f.c, flip); }
  else formCell(ctx, "bj_vl_hold", 0, loopIdx("bj_vl_hold", 1.8), x, y, k, 0.85, f.c);   // 몸이 비쳐 보이게 조금 옅게
  // 남은 시간 — 외곽 띠
  ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = P.glow; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, D / 2 + 6, D / 2 * 0.86 + 6, 0, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke(); ctx.restore();
  void sq;
}
function veilEnd(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), x = f.x, y = f.y - 40, k = 140 / VEIL_D;
  formCell(ctx, "bj_vl_fold", 0, onceI("bj_vl_fold", u), x, y, k, 1, f.c);   // 판이 안으로 접혀 피로 풀린다
  if (f.got && u < 0.7) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x, f.y - 120 - 16 * u); }
  void sq;
}
// 맞음 — 방향만 적어 둔다(혈막 그림이 그쪽 판을 움푹 들어가게 그린다) · 맞은 자리에 작은 튐
function ripple(ctx, f, t, sq) {
  const a = Number.isFinite(f.a) ? f.a : 0, u = clamp(t / f.life);
  const h = veilHit.get(f.pi), born = performance.now() / 1000 - t;
  if (!h || Math.abs(h.born - born) > 0.1) veilHit.set(f.pi, { born, a });
  pxOnce(ctx, "bj_hit", u, f.x + Math.cos(a) * 62, f.y - 40 + Math.sin(a) * 52, 0.45, 0.8 * (1 - u), 0, f.c);
  void sq;
}

/* ── 혈류 파동(11월 15일 개편) — 가장자리가 판정 반경 그대로 퍼진다. 시트는 반지름마다 한 칸(bj_wave)이라 지금 반경에 가장 가까운 칸을 2배로 그린다 ── */
const WAVE_R0 = 4, WAVE_STEP = 2, WAVE_K = 2;          // bj_wave 칸 i 의 반지름 = 4 + 2i(1배) — 2배로 그리면 화면 반경과 ±2px
function wave(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 180, d = f.d || 0.35, r = R * clamp(t / d), fade = t <= d ? 1 : 1 - clamp((t - d) / Math.max(0.01, f.life - d));
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.3 * fade, 1, 4);   // 1px 범위 예고선 — 다 퍼졌을 때의 판정 반경
  const T = SH.bj_wave, i = Math.max(0, Math.min(T.n - 1, Math.round((r / WAVE_K - WAVE_R0) / WAVE_STEP)));
  if (r > 6) formCell(ctx, "bj_wave", 0, i, f.x, f.y, WAVE_K, fade, f.c);
  if (t < 0.3) pxOnce(ctx, "bj_pop", t / 0.3, f.x, f.y, 1, 1 - t / 0.3, 0, f.c);   // 가운데 — 피가 튀며 파동이 시작된다
}
/* ── 혈쇄 갈고리(11월 15일 개편) — 손에서 갈고리가 생겨 날아가며 사슬 마디가 이어진다 → 걸리면 팽팽해지고 끌려가며 짧아진다 → 핏방울로 풀린다 ── */
const HK_K = 2, HK_FORM = 0.1, LINK_GAP = 13, HK_BACK = 22;   // 그림 배수 · 생기는 시간 · 마디 간격(화면 px) · 머리 뒤끝에서 날 끝까지(화면 px)
const hookHand = (f) => [f.x + (f.ax || 1) * 16, f.y - 36];
function chain(ctx, f, x0, y0, x1, y1, taut, sag) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), n = Math.floor(len / LINK_GAP);
  if (n <= 0) return;
  const row = row16(Math.atan2(dy, dx));
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n, x = x0 + dx * s, y = y0 + dy * s + Math.sin(Math.PI * s) * sag;   // 날아가는 동안은 조금 처진다
    formCell(ctx, "bj_hk_link", row, (i % 2) + (taut ? 2 : 0), x, y, HK_K, 1, f.c);
  }
}
function hook(ctx, f, t, sq) {
  const [hx, hy] = hookHand(f), tx = f.x1, ty = f.y1 - 30, a = Math.atan2(ty - hy, tx - hx), row = row16(a);
  const k = clamp(t / (f.d || 0.15)), ex = tx - Math.cos(a) * HK_BACK, ey = ty - Math.sin(a) * HK_BACK;
  const x = hx + (ex - hx) * k, y = hy + (ey - hy) * k;
  chain(ctx, f, hx, hy, x, y, false, Math.min(10, Math.hypot(x - hx, y - hy) * 0.05));
  if (t < HK_FORM) formCell(ctx, "bj_hk_form", row, onceI("bj_hk_form", t / HK_FORM), x, y, HK_K, 1, f.c);
  else formCell(ctx, "bj_hk_head", row, loopIdx("bj_hk_head", 0.3), x, y, HK_K, 1, f.c);
  void sq;
}
function hookPull(ctx, f, t, sq) {
  const [hx, hy] = hookHand(f), tx = f.x1, ty = f.y1 - 30, a = Math.atan2(ty - hy, tx - hx), row = row16(a);
  const ex = tx - Math.cos(a) * HK_BACK, ey = ty - Math.sin(a) * HK_BACK;
  chain(ctx, f, hx, hy, ex, ey, t < 0.1, 0);           // 걸린 순간 팽팽하게 빛나고 · 끌려가며 마디가 줄어든다
  formCell(ctx, "bj_hk_head", row, 0, ex, ey, HK_K, 1, f.c);
  if (t < 0.18) pxOnce(ctx, "bj_hit", t / 0.18, tx, ty, 0.5, 0.9, 0, f.c);   // 걸린 자리
  void sq;
}
function hookEnd(ctx, f, t, sq) {
  const u = clamp(t / f.life), ax = f.ax || 1, ay = f.ay || 0;
  for (let i = 0; i < 3; i++) formCell(ctx, "bj_hk_drop", 0, onceI("bj_hk_drop", u), f.x + ax * (18 + i * 12), f.y - 36 + ay * (18 + i * 12) * sq, HK_K, 1 - u * 0.4, f.c);
  pxOnce(ctx, "bj_pop", u, f.x + ax * 52, f.y - 30 + ay * 52 * sq, 0.5, 1 - u * 0.6, 0, f.c);   // 갈고리 머리가 피로 터진다
}

/* ── 손에 든 혈검(11월 15일) — drawHero 가 몸 그림 좌표(발밑 0, 0 · 좌우 뒤집기 적용된 상태) 안에서 부른다 ──
   만드는 중(0.25초)은 생성 칸, 든 동안은 손 위치 · 보는 쪽에 맞춘 각도, 벨 때는 겨눈 쪽 둘레로 칼이 크게 돈다. 방장 · 손님 모두 스냅샷 값(bloodView)으로 그린다 */
const BLADE_K = 1;                                    // 칼 그림 배수 — 사용자 그림을 픽셀 단위로 옮긴 시트라 1배(몸 높이 75 에 칼 길이 약 80)
// 손 자리(몸 그림의 비율) · 든 각도(도, 몸 그림 기준 — 옆 그림은 왼쪽을 본다)
export const BLADE_HAND = {
  m: { front: [0.77, 0.63, -55], turn: [0.24, 0.63, -125], side: [0.16, 0.55, -150], back: [0.88, 0.62, -80] },
  f: { front: [0.87, 0.62, -55], turn: [0.13, 0.62, -125], side: [0.3, 0.6, -150], back: [0.88, 0.62, -80] },
};
// 베기 — [시작, 끝](겨눈 쪽 기준 도) · 걸리는 초
const BLADE_SWING = [[-75, 60, 0.14], [60, -75, 0.14], [-140, 75, 0.2]];
export function drawBloodBlade(ctx, h, v, view, flip, ww, hh, top, behind, time) {
  const sw = v && v.sw;
  if (!sw) return;
  if ((view === "back") !== behind) return;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  const late = v.at ? Math.min(0.3, (Date.now() - v.at) / 1000) : 0;   // 손님 — 스냅샷 뒤 흐른 시간만큼 앞으로
  const H = (BLADE_HAND[h.gender === "f" ? "f" : "m"] || BLADE_HAND.m)[view] || BLADE_HAND.m.front;
  const lx = (H[0] - 0.5) * ww, ly = top + H[1] * hh;
  let a = (H[2] * Math.PI) / 180;                      // 몸 그림 안 각도
  const c = tintOf(h);
  const sT = sw.sT + late;
  if (sw.ph === 2 && sw.i > 0 && sw.sT < 9) {          // 베는 중 — 겨눈 쪽 둘레로 돈다(몸 그림 안 좌표로 바꿔 계산)
    const S = BLADE_SWING[(sw.i - 1) % 2], u = clamp(sT / S[2]);
    if (u < 1 || sT < S[2] + 0.12) {
      const base = Math.atan2((sw.ay || 0) * 0.78, sw.ax || 1);
      const w = base + ((S[0] + (S[1] - S[0]) * (1 - Math.pow(1 - u, 3))) * Math.PI) / 180;
      a = flip ? Math.PI - w : w;
    }
  }
  if (sw.ph === 1) formCell(ctx, "bj_sw_form", row16(a), onceI("bj_sw_form", (sw.t + late) / BLOOD_FORM.sword.form), lx, ly, BLADE_K, 1, c);
  else formCell(ctx, "bj_sw_hold", row16(a), loopIdx("bj_sw_hold", 0.8), lx, ly, BLADE_K, 1, c);
  // 풀릴 때 쓸 자리 — 세계 좌표 · 화면 각도
  bladeSeen.set(h.pi, { x: h.x + (flip ? -lx : lx), y: h.y + ly, a: flip ? Math.PI - a : a, at: NOW });
}

/* ── 3단계 연출 — 혈역 증폭 · 폭주 · 탈진 ─────────────
   혈역: 발밑 문양에서 혈관이 사방으로 뻗고 0.4초 동안 안쪽이 검붉게 물든다(판정 반경은 처음부터 350). 외곽선은 얇고 선명하게 · 안쪽은 옅게.
   마지막 2초는 외곽선 밝기가 안쪽으로 좁아진다(실제 반경은 그대로). 끝나면 바깥부터 걷히고, 과부하면 중심으로 급히 끌려든다 */
function field(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 350, open = f.start ? clamp(t / 0.4) : 1, u = clamp(f.u || 0);
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.8, 1);
  // 땅이 피로 물든다(bj_flood 0.6초) → 핏줄기를 따라 발밑으로 빨려 든다(bj_drink 반복). 마법진 대신(11월 14일 사용자 요청)
  const age = (f.u || 0) * FD.dur + t, k = R / POOL_R;
  if (age < POOL_OPEN) pxOnce(ctx, "bj_flood", age / POOL_OPEN, f.x, f.y, k, POOL_A, 0, f.c);
  else pxLoop(ctx, "bj_drink", 0, 1.2, f.x, f.y, k, POOL_A, 0, f.c);
  void open;
  const left = (1 - u) * 10;
  if (left < 2) ring(ctx, f.x, f.y, R * (0.92 + 0.08 * (left / 2)), sq, P.glow, 0.5 + 0.5 * Math.sin(t * 20), 2);   // 끝나 간다 — 실제 반경은 그대로
}
function fieldEnd(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 350, u = clamp(t / f.life), k = f.over ? 1 - clamp(u * 2.5) : 1 - u;
  pxOnce(ctx, "bj_dry", f.over ? clamp(u * 2.5) : u, f.x, f.y, R / POOL_R, POOL_A, 0, f.c);   // 피가 가운데로 말려 사라진다
  if (f.over) pxOnce(ctx, "bj_suck", u, f.x, f.y - 40, 1.2, 1 - u * 0.5, 0, f.c);   // 과부하 — 중심으로 급히 끌려든다
  ring(ctx, f.x, f.y, R * k, sq, P.rim, 0.8 * (1 - u), 1);
}
// 흡수 — 혈역 바닥에서 사용자 쪽으로 방울이 흘러든다 · 실제 증가량
// 11월 16일 — 지형 흡수: 혈역 바닥 한 곳(x, y)에서 입자가 솟아올랐다가(앞 25%) 시전자에게 빨려 든다. 숫자는 실제로 늘었을 때만
function absorb(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 + f.x * 0.01, sx = f.x + Math.cos(a) * 18, sy = f.y + Math.sin(a) * 18 * sq;
    const rise = clamp(u / 0.25), k = clamp((u - 0.25) * 1.5 - i * 0.04), y0 = sy - 26 * rise;
    const x = sx + (f.x1 - sx) * k, y = y0 + (f.y1 - 40 - y0) * k;
    if (k < 1) pxLoop(ctx, "bj_drop", i * 0.07, 0.4, x, y, 0.45, 0.9 * (1 - k * 0.5), k > 0 ? Math.atan2(f.y1 - 40 - y, f.x1 - x) : -Math.PI / 2, f.c);
  }
  if (f.got && u < 0.75) { ctx.globalAlpha = 1 - u; ctx.fillStyle = P.glow; ctx.font = "bold 13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`혈량 +${f.got}`, f.x1, f.y1 - 124 - 14 * u); }
}
// 폭주 — 시작은 고리가 바깥으로 터진다(피해 · 넉백 없음) · 지속은 몸을 감싸는 기운
function rage(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  if (f.start) {
    pxOnce(ctx, "bj_dark", u, f.x, f.y - 40, 1.1, 1 - u * 0.3, 0, f.c);   // 검붉은 핵이 터지며 고리가 퍼진다(피해 · 넉백 없음)
    return;
  }
  pxLoop(ctx, "bj_rage", 0, 2.4, f.x, f.y + 4, 1.25, 0.6 + 0.3 * Math.sin(Math.PI * u), 0, f.c);   // 발밑 검붉은 불꽃이 몸을 감싼다
  void P; void sq;
}
// 탈진 — 혈액 갑주가 떨어져 사라진다
function tired(ctx, f, t, sq) {
  const u = clamp(t / f.life);
  if (f.start) { pxOnce(ctx, "bj_fall", u, f.x, f.y - 50, 0.8, 0.95 * (1 - u * 0.4), 0, f.c); return; }   // 혈액 갑주 조각이 흩날려 떨어진다
  // 지속(11월 28일 사용자 — 탈진인 것이 한눈에 보이게): 머리 위 식은 회청색 시계가 느리게 돌고 방울이 가라앉는다. 폭주 불꽃(검붉음 · 발밑)과 겹치지 않는 머리 위 작은 표시
  pxLoop(ctx, "bj_tired_loop", 0, 2.4, f.x, f.y - 66, 1, 0.9, 0, "");
  void sq;
}

/* ── 4단계 — 해금 경로 연출 ─────────────
   lead: 핏방울 하나가 핏자국에서 유리관 쪽으로 기어간다. warn: 시험 3단계 바닥 예고 원(안쪽이 시간에 맞춰 찬다) */
function lead(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), e = u * u * (3 - 2 * u);
  const x = f.x + (f.x1 - f.x) * e, y = f.y + (f.y1 - f.y) * e - Math.abs(Math.sin(u * 18)) * 4;
  pxLoop(ctx, "bj_drop", 0, 0.4, x, y, 0.5, 1 - u * 0.3, Math.atan2(f.y1 - f.y, f.x1 - f.x), f.c);
  void P; void sq;
}
function warn(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / (f.d || 1.5));
  ring(ctx, f.x, f.y, f.r, sq, P.rim, t > (f.d || 1.5) ? 1 - clamp((t - f.d) / 0.2) : 0.9, 1);
  disc(ctx, f.x, f.y, f.r * u, sq, P.bright, 0.22);
}

/* ── 11월 16일 최종 강화 연출 — 모두 기존 pixelfx 시트(blood-job/px)를 다시 써서 그린다. 코드는 1px 범위선 · 글자만 ──
   흑혈 관통 · 혈해 개문 · 혈형 군단 · 원초의 혈맥 · 원초적 지배 · 연마 50 추가타(참격파 · 지면 폭발 · 혈막 가시 · 갈고리 충격파) */
// 원초적 지배 잔상 — 맞은 자리에 검보라 타격이 한 번 더
function echo(ctx, f, t) { const u = clamp(t / f.life); pxOnce(ctx, "bj_hit", u, f.x - 8, f.y - 30, 1.4, 1 - u * 0.4, 0, "abyss"); }
// 혈수 강타 최대 차징 — 같은 범위가 한 번 더 터진다(바닥 충격 + 팽창)
function blast(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life), D = f.W * 1.6;
  groundRect(ctx, f.x - (f.ax || 1) * f.L * 0.5, f.y - (f.ay || 0) * f.L * 0.5 * sq, f.ax || 1, f.ay || 0, f.L, f.W, sq, P.rim, 0.5 * (1 - u), false);
  pxOnce(ctx, "bj_slam", u, f.x, f.y + 6, D / 230, 0.95 * (1 - u * 0.4), 0, f.c);
  pxOnce(ctx, "bj_burst", u, f.x, f.y - 20, D / 160, 0.9 * (1 - u * 0.5), 0, f.c);
}
// 혈막 가시 반격 — 몸에서 대상까지 가시가 뻗고 박힌 자리가 터진다
function spike(ctx, f, t, sq) {
  const u = clamp(t / f.life), sx = f.x, sy = f.y - 40, tx = f.x1, ty = f.y1 - 30, a = Math.atan2(ty - sy, tx - sx);
  const k = clamp(u / 0.35), x = sx + (tx - sx) * k, y = sy + (ty - sy) * k;
  pxLoop(ctx, "bj_drop", 0, 0.3, x, y, 1, 1 - clamp((u - 0.6) / 0.4), a, f.c);
  if (u > 0.3) pxOnce(ctx, "bj_hit", (u - 0.3) / 0.7, tx, ty, 1, 1 - u * 0.5, 0, f.c);
  void sq;
}
// 혈쇄 갈고리 도착 — 대상에 박히고 둘레가 충격파로 터진다(1px 반경선 = 판정 반경)
function hookHit(ctx, f, t, sq) {
  const P = pal(f), u = clamp(t / f.life);
  ring(ctx, f.x, f.y, f.r, sq, P.rim, 0.6 * (1 - u), 1);
  pxOnce(ctx, "bj_slam", u, f.x, f.y + 4, (f.r * 2) / 230 * 1.4, 0.9 * (1 - u * 0.4), 0, f.c);
  pxOnce(ctx, "bj_hit", clamp(u * 1.5), f.x, f.y - 26, 1.4, 1 - u, 0, f.c);
}
/* 줄 탄 — swave 혈검 참격파(붉은 초승달이 앞으로) · pierce 흑혈 관통(gi 0 본탄 · 1~3 잔상). 판정과 같은 속도로 그린다 */
function line(ctx, f, t, sq) {
  const ax = f.ax || 1, ay = f.ay || 0, d = Math.min(f.len, f.v * t), x = f.x + ax * d, y = f.y - 34 + ay * d * sq, rot = Math.atan2(ay * sq, ax);
  const out = clamp((t - f.len / f.v) / 0.15);
  if (f.sk === "swave") {
    const [row, flip] = row5(rot);
    formCell(ctx, "bj_arc3", row, 2, x, y, 2, 1 - out, f.c, flip);   // 칸 2 — 가는 초승달이 다 그려진 칸(11월 16일 궤적 시트를 다시 뽑았다)
    return;
  }
  const c = "abyss";                                  // 흑혈 — 검은색에 가까운 탄(잔상은 검붉게 옅게)
  if (!f.gi) {
    pxLoop(ctx, "bj_drop", 0, 0.3, x, y, 2, 1 - out, rot, c);
    for (let i = 1; i <= 3; i++) pxLoop(ctx, "bj_drop", i * 0.1, 0.3, x - ax * i * 26, y - ay * i * 26 * sq, 2 - i * 0.4, (0.5 - i * 0.12) * (1 - out), rot, c);   // 빠른 탄의 꼬리
  } else pxLoop(ctx, "bj_drop", f.gi * 0.2, 0.3, x, y, 2, (0.75 - f.gi * 0.12) * (1 - out), rot, f.c || "dusk");
}
// 흑혈 관통 마지막 — 검은색 · 보라색 입자 폭발(혈흔 5중첩이면 더 크게)
function pburst(ctx, f, t) { const u = clamp(t / f.life); pxOnce(ctx, "bj_dark", u, f.x, f.y - 30, f.five ? 1.3 : 0.8, 1 - u * 0.3, 0, "abyss"); }
// 흑혈 관통 차징 — 손끝 검은 구체에 주변 붉은 혈액이 빨려 든다
function pcharge(ctx, f, t, sq) {
  const [mx, my] = hand(f, sq), u = clamp(t / f.life);
  for (let i = 0; i < 6; i++) {                       // 붉은 방울이 구체로 흡수된다
    const a = i * TAU / 6, r = 60 * (1 - u), x = mx + Math.cos(a) * r, y = my + Math.sin(a) * r * 0.7;
    if (u < 0.95) pxLoop(ctx, "bj_drop", i * 0.13, 0.3, x, y, 0.5, 0.9, Math.atan2(my - y, mx - x), f.c);
  }
  formCell(ctx, "bj_core", 2, loopIdx("bj_core", 0.3), mx, my, 2 + Math.round(u), 1, "abyss");
}
/* 혈해 개문 — 바닥이 검붉게 물들고(혈역 웅덩이 시트를 더 짙게 · 넓게) 혈관이 퍼진다. 기둥 · 가시는 sk_bj_spire. 1px 외곽선 = 판정 반경 */
function sea(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 380, age = (f.u || 0) * 8 + t, k = R / POOL_R, c = f.c === "abyss" ? "abyss" : "dusk";
  ring(ctx, f.x, f.y, R, sq, P.rim, 0.85, 1);
  if (age < POOL_OPEN) pxOnce(ctx, "bj_flood", age / POOL_OPEN, f.x, f.y, k, 0.9, 0, c);
  else pxLoop(ctx, "bj_drink", 0.5, 1.6, f.x, f.y, k, 0.9, 0, c);
  const left = (1 - clamp(f.u || 0)) * 8 - t;
  if (left < 0.8) pxOnce(ctx, "bj_suck", 1 - clamp(left / 0.8), f.x, f.y - 30, 1.6, 0.9, 0, f.c);   // 끝나기 직전 — 피가 가운데로 모인다
}
function seaEnd(ctx, f, t, sq) {
  const P = pal(f), R = f.r || 380, u = clamp(t / f.life);
  pxOnce(ctx, "bj_dry", u, f.x, f.y, R / POOL_R, 0.85, 0, "dusk");
  if (f.boom) { pxOnce(ctx, "bj_burst", u, f.x, f.y - 30, R / 70, 1 - u * 0.4, 0, f.c); ring(ctx, f.x, f.y, R * (0.4 + 0.6 * clamp(u * 2)), sq, P.glow, 1 - u, 2); }
}
function spire(ctx, f, t, sq) { const u = clamp(t / f.life); pxOnce(ctx, "bj_slam", u, f.x, f.y + 4, 0.55, 0.9 * (1 - u * 0.5), 0, f.c); pxOnce(ctx, "bj_hit", u, f.x, f.y - 24, 0.9, 1 - u, 0, f.c); void sq; }
/* 혈형 군단 — 분신은 사용자 캐릭터 그림을 피 색 실루엣으로(시전자 외형 그대로) · 손에 혈검 시트. 0.2초마다 오는 자리에서 속도대로 미끄러진다 */
const cloneImgs = {};
function cloneImg(gd, view) {
  if (typeof Image === "undefined") return null;
  const k = `${gd}/${view}`;
  let im = cloneImgs[k];
  if (im === undefined) { im = cloneImgs[k] = new Image(); im.onerror = () => { cloneImgs[k] = null; }; im.src = `/assets/characters/rpg/blood-${gd}/${view}.webp`; }
  return im && im.complete && im.naturalWidth ? im : null;
}
const CLONE_H = 78, CLONE_FILTER = { red: "brightness(0.55) sepia(1) hue-rotate(-50deg) saturate(6)", violet: "brightness(0.5) sepia(1) hue-rotate(-90deg) saturate(5)", dusk: "brightness(0.35) sepia(1) hue-rotate(-100deg) saturate(4)", abyss: "brightness(0.25) sepia(1) hue-rotate(-110deg) saturate(4)" };
const cloneSeen = new Map();                          // "pi:i" → 앞 프레임에 본 가장 새 연출의 시작 시각(겹친 장 중 하나만 그린다)
function cloneBody(ctx, f, x, y, a, c, dir) {
  const im = cloneImg(f.g ? "f" : "m", "side");
  if (im) {
    const k = CLONE_H / im.naturalHeight, w = im.naturalWidth * k;
    ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.filter = CLONE_FILTER[c] || CLONE_FILTER.red;
    ctx.translate(Math.round(x), Math.round(y)); if (dir > 0) ctx.scale(-1, 1);   // 옆 그림은 왼쪽을 본다
    ctx.drawImage(im, -w / 2, -CLONE_H, w, CLONE_H); ctx.restore();
  }
  formCell(ctx, "bj_sw_hold", dir > 0 ? 14 : 10, loopIdx("bj_sw_hold", 0.8), x + dir * 16, y - 40, 1, a, c);   // 손에 든 혈검
}
function clone(ctx, f, t, sq) {
  const key = `${f.pi}:${f.i}`, born = NOW - t, s = cloneSeen.get(key) || { frame: -1, cur: -9, prev: -9 };
  cloneSeen.set(key, s);
  if (s.frame !== NOW) { s.frame = NOW; s.prev = s.cur; s.cur = -9; }
  s.cur = Math.max(s.cur, born);
  if (s.prev > -9 && Math.abs(born - s.prev) > 0.02) return;   // 앞 프레임의 가장 새 장만
  const x = f.x + (f.vx || 0) * t, y = f.y + (f.vy || 0) * t;
  pxLoop(ctx, "bj_rage", f.i * 0.3, 2.4, x, y + 4, 1, 0.45, 0, f.c);   // 발밑 핏빛 기운
  cloneBody(ctx, f, x, y, 0.85, f.c, f.d || 1);
  void sq;
}
function lgForm(ctx, f, t, sq) {
  const u = clamp(t / f.life);
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3, r = 60 * u; pxOnce(ctx, "bj_pop", u, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * sq, 0.6, 1 - u * 0.4, 0, f.c); }
  pxOnce(ctx, "bj_suck", 1 - u, f.x, f.y - 30, 0.8, 0.9, 0, f.c);
}
function lgHit(ctx, f, t, sq) {
  const u = clamp(t / f.life), rot = Math.atan2((f.y - f.y0) * 1, f.x - f.x0);
  pxOnce(ctx, f.w ? "bj_cross" : "bj_slash", u, f.x0, f.y0 - 34, 1, 1 - u * 0.3, rot, f.c);
  pxOnce(ctx, "bj_hit", u, f.x, f.y - 26, 0.8, 1 - u, 0, f.c);
  void sq;
}
function lgEnd(ctx, f, t, sq) {
  const u = clamp(t / f.life);
  for (const [x0, y0] of f.cp || []) {                 // 세 분신이 목표를 관통하며 핏물로 사라진다
    const k = clamp(u / 0.4), x = x0 + (f.x - x0) * k * 1.3, y = y0 + (f.y - y0) * k * 1.3;
    if (u < 0.45) cloneBody(ctx, f, x, y, 0.85 * (1 - u), f.c, f.x > x0 ? 1 : -1);
    else pxOnce(ctx, "bj_pop", (u - 0.45) / 0.55, x, y - 20, 0.7, 1 - u * 0.5, 0, f.c);
  }
  if (f.hit && u > 0.3) pxOnce(ctx, "bj_cross", (u - 0.3) / 0.7, f.x - 20, f.y - 40, 2, 1, 0, f.c);
  void sq;
}
/* 원초의 혈맥 — 차징: 시전자 둘레만 어두워지고(다른 사람 시야는 가리지 않는다) 뒤에 검은 원형 문양 · 가운데 붉은 구체가 작아진다 */
// 발밑 문양 · 국소 암전은 땅 층(sk_bj_ochground) — 캐릭터를 덮지 않게(11월 16일)
function ochargeGround(ctx, f, t) {
  const u = clamp((f.u || 0) + t / 1.2);
  pxOnce(ctx, "bj_dark", 0.15 + 0.2 * u, f.x, f.y - 30, 2, 0.2, 0, "abyss");   // 시전자 둘레 국소 암전(다른 사람 시야를 가리지 않게 옅게)
  pxLoop(ctx, "bj_drink", 0, 1.4, f.x, f.y, 1, 0.85, 0, "abyss");               // 발밑 검은 원형 문양
}
function ocharge(ctx, f, t, sq) {
  const u = clamp((f.u || 0) + t / 1.2);
  formCell(ctx, "bj_core", Math.min(2, Math.floor(u * 3)), loopIdx("bj_core", 0.3 - 0.15 * u), f.x, f.y - 120, Math.max(2, 5 - Math.round(u * 3)), 1, f.c);   // 붉은 구체가 점점 작아진다
  void sq;
}
// 창 12개 — 시전자 둘레에서 차례로 날아가 목표에 꽂힌다 → 하나로 모여 최종 폭발(보라 · 검정 충격파). 시간표는 판정과 같다
function spears(ctx, f, t, sq) {
  const P = pal(f), n = f.n || 12, gap = f.gap || 0.05, fly = f.fly || 0.35, endAt = (n - 1) * gap + fly + (f.wait || 0.35);
  if (t < endAt) {
    for (let i = 0; i < n; i++) {
      const s = t - i * gap; if (s < 0) continue;
      const a = i * TAU / n, sx = f.x0 + Math.cos(a) * 140, sy = f.y0 - 60 + Math.sin(a) * 90, tx = f.x, ty = f.y - 30;
      const k = clamp(s / fly), e = k * k, x = sx + (tx - sx) * e, y = sy + (ty - sy) * e, rot = Math.atan2(ty - sy, tx - sx);
      if (k < 1) pxLoop(ctx, "bj_drop", i * 0.08, 0.3, x, y, 1.5, 1, rot, f.c);   // 혈액 창 — 꼬리가 긴 핏빛 탄
      else if (s < fly + 0.2) pxOnce(ctx, "bj_hit", (s - fly) / 0.2, tx, ty, 0.9, 0.9, 0, f.c);
    }
    const g0 = (n - 1) * gap + fly;
    if (t > g0) formCell(ctx, "bj_core", 2, loopIdx("bj_core", 0.2), f.x, f.y - 40, 2 + Math.round(clamp((t - g0) / (endAt - g0)) * 3), 1, "abyss");   // 하나의 구체로 모인다
    return;
  }
  const u = clamp((t - endAt) / Math.max(0.1, f.life - endAt));
  ring(ctx, f.x, f.y, (f.R || 220) * (0.3 + 0.7 * clamp(u * 2)), sq, P.glow, 1 - u, 2);
  pxOnce(ctx, "bj_dark", u, f.x, f.y - 40, 2, 1 - u * 0.3, 0, "abyss");
  pxOnce(ctx, "bj_burst", u, f.x, f.y - 30, (f.R || 220) / 70, 0.85 * (1 - u * 0.5), 0, f.c);
}
/* 원초적 지배 — 시작: 검보라 폭발 · 지속: 등 뒤 검은 원형 문양 · 발밑 기운 · 둘레를 도는 작은 검붉은 입자 */
function awake(ctx, f, t) { const u = clamp(t / f.life); pxOnce(ctx, "bj_dark", u, f.x, f.y - 40, 1.4, 1 - u * 0.3, 0, "abyss"); }
function awakeEnd(ctx, f, t) { const u = clamp(t / f.life); pxOnce(ctx, "bj_fall", u, f.x, f.y - 50, 0.8, 0.9 * (1 - u * 0.4), 0, "abyss"); }
// 11월 16일 사용자 "그림자가 캐릭터를 덮어버려" — 발밑 검은 문양 · 기운은 땅 층(사람 아래, sk_bj_auraground)으로 나눠 그린다. 이 층은 둘레 입자만
function auraGround(ctx, f) {
  pxLoop(ctx, "bj_drink", 0, 2.2, f.x, f.y - 2, 1, 0.75, 0, "abyss");          // 검은 원형 문양
  pxLoop(ctx, "bj_rage", 0, 2.4, f.x, f.y + 4, 1.25, 0.55, 0, "abyss");
}
function aura(ctx, f, t, sq) {
  for (let i = 0; i < 4; i++) {                        // 둘레를 도는 입자
    const a = NOW * 2.2 + i * TAU / 4, x = f.x + Math.cos(a) * 34, y = f.y - 40 + Math.sin(a) * 34 * sq;
    pxLoop(ctx, "bj_drop", i * 0.25, 0.4, x, y, 0.5, 0.9, a + Math.PI / 2, "abyss");
  }
  void t;
}

const KINDS = { sk_bj_aura_g: auraGround, sk_bj_ocharge_g: ochargeGround, sk_bj_echo: echo, sk_bj_blast: blast, sk_bj_spike: spike, sk_bj_hookhit: hookHit, sk_bj_line: line, sk_bj_pburst: pburst, sk_bj_pcharge: pcharge, sk_bj_sea: sea, sk_bj_seaend: seaEnd, sk_bj_spire: spire, sk_bj_clone: clone, sk_bj_lgform: lgForm, sk_bj_lghit: lgHit, sk_bj_lgend: lgEnd, sk_bj_ocharge: ocharge, sk_bj_spears: spears, sk_bj_awake: awake, sk_bj_awakeend: awakeEnd, sk_bj_aura: aura, sk_bj_wave: wave, sk_bj_hook: hook, sk_bj_hookpull: hookPull, sk_bj_hookend: hookEnd, sk_bj_swend: swordEnd, sk_bj_lead: lead, sk_bj_warn: warn, sk_bj_field: field, sk_bj_fieldend: fieldEnd, sk_bj_absorb: absorb, sk_bj_rage: rage, sk_bj_tired: tired, sk_bj_smc: smashCharge, sk_bj_smash: smashFire, sk_bj_slam: slam, sk_bj_sword: sword, sk_bj_veil: veil, sk_bj_veilend: veilEnd, sk_bj_ripple: ripple, sk_bj_charge: charge, sk_bj_shot: shot, sk_bj_hit: hit, sk_bj_end: end, sk_bj_burst: burst, sk_bj_reap: reap, sk_bj_conv: conv, sk_bj_fizz: fizz };
export const BLOOD_JOB_CAP = { sk_bj_echo: 6, sk_bj_blast: 4, sk_bj_spike: 4, sk_bj_hookhit: 4, sk_bj_line: 10, sk_bj_pburst: 6, sk_bj_pcharge: 2, sk_bj_sea: 4, sk_bj_seaend: 2, sk_bj_spire: 12, sk_bj_clone: 9, sk_bj_lgform: 2, sk_bj_lghit: 8, sk_bj_lgend: 2, sk_bj_ocharge: 4, sk_bj_spears: 2, sk_bj_awake: 2, sk_bj_awakeend: 2, sk_bj_aura: 4, sk_bj_wave: 4, sk_bj_hook: 4, sk_bj_hookpull: 4, sk_bj_hookend: 4, sk_bj_swend: 4, sk_bj_lead: 2, sk_bj_warn: 2, sk_bj_field: 4, sk_bj_fieldend: 4, sk_bj_absorb: 6, sk_bj_rage: 4, sk_bj_tired: 4, sk_bj_smc: 4, sk_bj_smash: 4, sk_bj_slam: 4, sk_bj_sword: 8, sk_bj_veil: 8, sk_bj_veilend: 4, sk_bj_ripple: 6, sk_bj_charge: 4, sk_bj_shot: 8, sk_bj_hit: 12, sk_bj_end: 6, sk_bj_burst: 6, sk_bj_reap: 10, sk_bj_conv: 4, sk_bj_fizz: 4 };
// 시전자를 따라다니는 연출 — 그릴 때 지금 그 사람 자리로 옮긴다(혈역 · 폭주 기운)
const FOLLOW = new Set(["sk_bj_aura", "sk_bj_aura_g", "sk_bj_ocharge", "sk_bj_ocharge_g", "sk_bj_pcharge", "sk_bj_field", "sk_bj_rage", "sk_bj_tired", "sk_bj_veil", "sk_bj_veilend", "sk_bj_ripple", "sk_bj_sword", "sk_bj_hook", "sk_bj_hookpull"]);   // 갈고리 사슬은 손(시전자)에서 나온다   // 혈막도 시전자를 따라다닌다(11월 15일)
// 혈막 — 겹쳐 둔 여러 장 중 한 사람당 한 프레임에 한 장만(가장 새 것). 끝 연출이 나오면 남은 장은 그리지 않는다
const veilSeen = new Map();   // pi → { frame, cur: 이번 프레임에 본 가장 새 장의 u, prev: 앞 프레임의 cur, endU · endAt: 끝 연출이 나온 때 살아 있던 가장 새 u · 그 시각 }
// 한 연출의 땅에 깔리는 몫 — 땅 층(rpgArt)이 이 이름으로 바꿔 사람 · 몹 아래에 먼저 그린다. 나머지(둘레 입자 · 구체)는 원래 층(11월 16일 사용자 "그림자가 캐릭터를 덮어버려")
export const BLOOD_JOB_UNDER = { sk_bj_aura: "sk_bj_aura_g", sk_bj_ocharge: "sk_bj_ocharge_g" };
export const BLOOD_JOB_GROUND = new Set(["sk_bj_sea", "sk_bj_seaend", "sk_bj_field", "sk_bj_fieldend", "sk_bj_veil", "sk_bj_veilend", "sk_bj_wave"]);   // 땅에 깔리는 연출 — 사람 · 몹 아래에 그린다(skillArt GROUND_FX). 혈막도 맨 뒤 — 적을 뚫고 나와 보였다(11월 15일 사용자)
// 연마 합계(영구 레벨)에 따른 혈색 — 방장은 가방 bd, 손님은 스냅샷 bdv(같은 tr 모양)
function tintOf(h) {
  if (h && ((h.bdv && h.bdv.aw) || (!h.bdv && h.bd && h.bd.aw))) return "abyss";   // 원초적 지배 중 — 모든 혈액 연출이 검보라
  const v = h && (h.bdv || (h.bag && h.bag.bd && h.bag.bd.on ? h.bag.bd : null));
  const sum = v && Array.isArray(v.tr) ? v.tr.reduce((n, q) => n + ((q && q[0]) | 0), 0) : 0;
  return BLOOD_TINT.find((t) => sum >= t.from).id;
}
export function drawBloodJobFx(ctx, f, p, sq, g, time) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  NOW = Number.isFinite(time) ? time : performance.now() / 1000;
  const f0 = f;
  if (FOLLOW.has(f.kind) && g && Number.isInteger(f.pi)) {
    const h = g.heroes && g.heroes[f.pi];
    if (h && h.map === f.map && Number.isFinite(h.x)) f = { ...f, x: h.x, y: h.y };
  }
  if (!f.c && g && Number.isInteger(f.pi)) { const c = tintOf(g.heroes && g.heroes[f.pi]); if (c !== "red") f = { ...f, c }; }   // 시전자 연마 합계 색
  if (f.kind === "sk_bj_veil" || f.kind === "sk_bj_veilend") {
    // 장마다 진행도 u(서버가 낸 값, 장마다 다르고 변하지 않음)로 알아본다. 예전에는 g.t 로 잰 시작 시각으로 골랐는데
    // 손님 화면은 스냅샷마다 g.t 가 앞뒤로 맞춰져 시각이 흔들리고, 그때마다 모든 장을 건너뛰어 혈막이 안 보였다(11월 15일 사용자 보고)
    const v = veilSeen.get(f.pi) || { frame: -1, cur: -1, prev: -1, endU: -1, endAt: -9 };
    veilSeen.set(f.pi, v);
    if (v.frame !== NOW) { v.frame = NOW; v.prev = v.cur; v.cur = -1; }   // 앞 프레임에 본 가장 새 장 — 새 장은 다음 프레임부터 그려 두 장이 겹쳐 밝아지지 않게
    const u = Number.isFinite(f.u) ? f.u : 0, wall = performance.now() / 1000;
    if (f.kind === "sk_bj_veilend") { v.endU = Math.max(v.endU, v.prev, v.cur); v.endAt = wall; }
    else {
      if (wall - v.endAt < 1 && u <= v.endU + 1e-6) return true;              // 이미 끝난 혈막의 남은 장
      v.cur = Math.max(v.cur, u);
      if (v.prev >= 0 && Math.abs(u - v.prev) > 1e-6) return true;              // 앞 프레임의 가장 새 장만 그린다
    }
  }
  if (f !== f0) f = { ...f, src: f0 };                // 복사본이어도 같은 연출로 알아본다(swEndAt)
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

/* ── 단서 자리 그림 — 단서가 나온 사람에게만 보인다(shown). 조사 여부는 화면 칸(rpg-talk)이 알려 준다 ──
   핏자국(토끼 사냥터 흙길 옆) · 압축기(훈련장 허수아비 뒤, 원 셋) · 분수 바닥 금속판(광장) · 낡은 수문(광장) */
export function drawBloodSpots(ctx, M, spots, time, sq, shown) {
  const P = BLOOD_COLORS.red;
  for (const s of spots) {
    if (s.map !== M.id || (shown && !shown(s))) continue;   // 단서가 나온 자리만 그린다
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
