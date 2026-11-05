/* 공허의 관측자 경고 · 타격 · 포탈 연출(11월 4일). 중력장은 보라색, 공간 균열은 검보라색 중심.
   범위 칠하기 · 안전지대 글자 · 남은 시간은 worldBossArt.js 가 공통으로 그리고, 여기서는 이 보스만의 장식을 더한다. */
import { WORLD_BOSS as C, WORLD_BOSS_PATTERNS as PAT } from './worldBossData.js';
import { VOID_PALETTE as P } from './voidWeaponData.js';
import { drawVoidHolePx, drawVoidPortalPx, drawVoidSigilPx, drawVoidHitPx } from './worldBossPxArt.js';   // 11월 5일 pixelfx 시트 — 못 불러오면 아래 도트 그림
const TAU = Math.PI * 2, PX = 4;
const clamp = x => Math.max(0, Math.min(1, x));
const snap = v => Math.round(v / PX) * PX;
const noise = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const VOID_TONE = [P.dark, P.purple, P.core];   // worldBossArt.js TONES.void — [어두움, 본색, 밝음]
function dot(ctx, x, y, color, s = PX, alpha = 1) { ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(snap(x) - s / 2, snap(y) - s / 2, s, s); }
function ringDots(ctx, x, y, r, color, alpha, q = 1, from = 0, span = TAU, size = PX) {
  const n = Math.max(12, Math.round(r * 0.5 * q));
  for (let i = 0; i < n; i++) { const a = from + span * i / n; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * C.squash, color, size, alpha); }
}
function shard(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(snap(x), snap(y - r)); ctx.lineTo(snap(x + r * 0.6), snap(y)); ctx.lineTo(snap(x), snap(y + r)); ctx.lineTo(snap(x - r * 0.6), snap(y)); ctx.closePath(); ctx.fill();
}
// 포탈 — 어두운 구멍과 도는 보라 고리. 둘 사이를 잇는 점선이 보스가 건너갈 길
function portal(ctx, x, y, t, alpha, tag, q) {
  const rx = 78, ry = 100, pulse = 0.85 + 0.15 * Math.sin(t * 6);
  if (drawVoidPortalPx(ctx, x, y, t, alpha)) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = P.core; ctx.strokeStyle = P.rift; ctx.lineWidth = 4; ctx.textAlign = 'center'; ctx.font = "16px 'Do Hyeon',sans-serif";
    ctx.strokeText(tag, x, y + 28); ctx.fillText(tag, x, y + 28); ctx.restore(); return;
  }
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = P.violet; ctx.globalAlpha = alpha * 0.35; ctx.beginPath(); ctx.ellipse(x, y - 60, rx + 22, ry + 22, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = alpha; ctx.fillStyle = P.dark; ctx.beginPath(); ctx.ellipse(x, y - 60, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = P.rift; ctx.beginPath(); ctx.ellipse(x, y - 60, rx * 0.72, ry * 0.72, 0, 0, TAU); ctx.fill();
  const n = Math.max(14, Math.round(36 * q));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + t * 1.6, rr = 1 - ((i * 0.37 + t * 0.8) % 1) * 0.85;
    dot(ctx, x + Math.cos(a) * rx * rr, y - 60 + Math.sin(a) * ry * rr, i % 3 ? P.purple : P.core, PX, alpha * (1 - rr * 0.5) * pulse);
  }
  for (let i = 0; i < Math.max(16, Math.round(44 * q)); i++) { const a = i / 44 * TAU; dot(ctx, x + Math.cos(a) * rx, y - 60 + Math.sin(a) * ry, P.glow, PX, alpha * pulse); }
  ctx.globalAlpha = alpha; ctx.fillStyle = P.core; ctx.strokeStyle = P.rift; ctx.lineWidth = 4; ctx.textAlign = 'center'; ctx.font = "16px 'Do Hyeon',sans-serif";
  ctx.strokeText(tag, x, y + 28); ctx.fillText(tag, x, y + 28);
  ctx.restore();
}
function link(ctx, A, B, t, alpha) {
  const n = Math.round(Math.hypot(B.x - A.x, (B.y - A.y) / C.squash) / 28);
  for (let i = 0; i <= n; i++) { const u = (i + (t * 3 % 1)) / n; if (u > 1) continue; dot(ctx, A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u - 40, i % 2 ? P.purple : P.glow, PX, alpha * 0.8); }
}
// 중력 붕괴 — 장판 안쪽으로 감기는 도트 소용돌이. 끌어당기는 마지막 구간에 더 빨라지고 가운데가 검게 닫힌다
function gravity(ctx, s, attack, p, t, q) {
  const P0 = PAT.gravity_collapse, pulling = attack.t <= P0.pullFor, k = pulling ? 1 - attack.t / P0.pullFor : 0;
  const arms = 3, n = Math.max(8, Math.round(18 * q));
  if (drawVoidHolePx(ctx, s, t)) {   // 도는 블랙홀 시트 — 붙잡는 마지막 구간에 가운데로 모이는 안쪽 고리만 더한다
    ringDots(ctx, s.x, s.y, s.r, P.glow, 0.9, q, t * 0.5, TAU, PX);
    ringDots(ctx, s.x, s.y, s.r * (1 - p * 0.7), P.violet, 0.8, q, -t, TAU * 0.7, PX);
    return;
  }
  for (let a = 0; a < arms; a++) for (let i = 0; i < n; i++) {
    const u = (i / n + t * (pulling ? 1.8 : 0.7)) % 1, r = s.r * (1 - u) * (1 - k * 0.4), ang = a * TAU / arms + u * 4.2 - t * 2.6;
    dot(ctx, s.x + Math.cos(ang) * r, s.y + Math.sin(ang) * r * C.squash, u > 0.65 ? P.core : P.purple, PX + (u > 0.7 ? 2 : 0), 0.3 + 0.6 * u);
  }
  ctx.globalAlpha = 0.5 + 0.4 * p; ctx.fillStyle = P.rift; ctx.beginPath(); ctx.ellipse(s.x, s.y, 14 + 22 * p + 12 * k, (14 + 22 * p + 12 * k) * C.squash, 0, 0, TAU); ctx.fill();
  ringDots(ctx, s.x, s.y, s.r, P.glow, 0.9, q, t * 0.5, TAU, PX);
  ringDots(ctx, s.x, s.y, s.r * (1 - p * 0.7), P.violet, 0.8, q, -t, TAU * 0.7, PX);
}
// 공간 절단 — 선 위에 균열 눈금과 진행 방향 화살표. 예고가 다 찰수록 선이 밝아진다
function cut(ctx, s, attack, p, t, q) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, C.squash); ctx.rotate(s.a);
  const n = Math.max(10, Math.round(s.len / 34));
  for (let i = 1; i <= n; i++) {
    const x = s.len * i / n;
    ctx.globalAlpha = 0.45 + 0.5 * p; ctx.fillStyle = i % 2 ? P.glow : P.core;
    ctx.fillRect(snap(x), -2, PX * 2, PX);   // 가운데 점선
    if (i % 3 === 0) { ctx.fillStyle = P.core; ctx.fillRect(snap(x - 10), -s.width + 2, PX, PX); ctx.fillRect(snap(x - 10), s.width - 6, PX, PX); }
  }
  ctx.strokeStyle = P.core; ctx.lineWidth = 2; ctx.globalAlpha = 0.35 + 0.65 * p;
  for (let j = 1; j <= 4; j++) { const x = s.len * j / 5; ctx.beginPath(); ctx.moveTo(x - 14, -12); ctx.lineTo(x, 0); ctx.lineTo(x - 14, 12); ctx.stroke(); }
  ctx.restore();
}
export function drawVoidGround(ctx, a, attack, p, t, q = 1) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (attack.kind === 'gravity_collapse') attack.areas.forEach(s => gravity(ctx, s, attack, p, t, q));
  else if (attack.kind === 'space_cut') attack.areas.forEach(s => cut(ctx, s, attack, p, t, q));
  else if (attack.kind === 'void_cross' && attack.portals) {
    const [A, B] = attack.portals, step = attack.step;
    link(ctx, A, B, t, 0.8);
    portal(ctx, A.x, A.y, t, 1, step === 1 ? '출구' : '포탈', q); portal(ctx, B.x, B.y, t, 1, step === 1 ? '도착' : '포탈', q);
  }
  ctx.restore();
}
// 타격 — tone 'void'. 중력 붕괴 폭발 · 공간 절단 베임 · 포탈 충격파 · 사건의 지평선 소멸
export function drawVoidImpact(ctx, f, p, q = 1) {
  const s = f.area; if (!s) return false;
  const fade = 1 - p;
  if (drawVoidHitPx(ctx, f, p, q)) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (s.shape === 'line') {
    const dx = Math.cos(s.a) * s.len, dy = Math.sin(s.a) * s.len * C.squash, n = Math.max(12, Math.round(s.len / 12 * q));
    for (let i = 0; i < n; i++) { const u = i / n, w = s.width * 2 * fade * (0.6 + 0.4 * Math.sin(u * 9 + p * 5)); const x = s.x + dx * u, y = s.y + dy * u;
      dot(ctx, x, y, P.violet, PX + w * 0.5, 0.55 * fade); dot(ctx, x, y, P.glow, PX + w * 0.2, 0.9 * fade); dot(ctx, x, y, P.core, PX, fade); }
    ctx.globalAlpha = fade; ctx.strokeStyle = P.rift; ctx.lineWidth = 6 * fade; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + dx, s.y + dy); ctx.stroke();
  } else if (f.doom) {
    // 사건의 지평선 — 안전 구역 밖이 모두 검은 구멍으로 빨려 든다
    ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = P.rift; ctx.fillRect(f.x - 1400, f.y - 1000, 2800, 2000);
    const n = Math.max(10, Math.round(30 * q));
    for (let i = 0; i < n; i++) { const ang = i / n * TAU, d = 900 * (1 - p) + 60; shard(ctx, f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * C.squash, 12, i % 2 ? P.purple : P.glow, fade); }
    ringDots(ctx, f.x, f.y, 80 + 700 * (1 - p), P.core, fade, q, 0, TAU, PX + 2);
  } else {
    const r = (s.r || 200) * (0.25 + 0.75 * clamp(p * 1.6)), x = s.x, y = s.y;
    ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = P.violet; ctx.beginPath(); ctx.ellipse(x, y, r, r * C.squash, 0, 0, TAU); ctx.fill();
    if (s.shape === 'ring') ringDots(ctx, x, y, s.inner, P.glow, fade, q, 0, TAU, PX);
    ringDots(ctx, x, y, r, P.core, fade, q, 0, TAU, PX + 2); ringDots(ctx, x, y, r * 0.78, P.purple, fade, q, 0, TAU, PX + 1);
    const n = Math.max(6, Math.round(16 * q));
    for (let i = 0; i < n; i++) { const ang = i / n * TAU + f.seed, d = r * (0.3 + 0.7 * noise(i, f.seed || 1)); shard(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d * C.squash - 20 * p, 6 + noise(i, 3) * 6, i % 2 ? P.purple : P.glow, fade); }
  }
  ctx.restore();
  return true;
}
// 보스 몸 위 저주 문양 — 즉사 예고 동안 머리 위에 검은 눈 고리가 열린다
export function drawVoidSigil(ctx, x, y, p, time) {
  if (drawVoidSigilPx(ctx, x, y, p)) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const r = 70 + 40 * p, cy = y - 330;
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + time * 0.8; dot(ctx, x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.35, i % 4 ? P.purple : P.core, PX + 1, 0.4 + 0.5 * p); }
  ctx.globalAlpha = 0.5 + 0.5 * p; ctx.fillStyle = P.rift; ctx.beginPath(); ctx.ellipse(x, cy, r * 0.5, r * 0.18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = P.core; ctx.fillRect(snap(x) - 2, snap(cy) - 10, 4, 20);
  ctx.restore();
}
