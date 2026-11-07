/* 공허 무기 전용 도트 연출(11월 4일) — 기존 화염베기 · 유성 · 화살 연사 연출을 쓰지 않는다.
   모든 모양을 PX 칸(네모 도트)에 맞춰 찍어 도트 그림처럼 보이게 하고, 같은 시간에는 같은 모양을 그린다(무작위 상태 없음).
   - sk_void_slash   공허의 대검 차원 절단: 둘레에 갈라지는 공간 균열 6줄 → 마지막 원형 공간 폭발
   - sk_void_rain    공허의 장궁 차원 폭우: 하늘의 균열 → 낙하 자리 표시 → 화살 8발 낙하 · 착탄
   - sk_void_hole    공허의 지팡이 특이점 붕괴: 블랙홀 생성 → 끌어당김 · 맥동 → 수축 → 폭발
   - sk_void_slash_pas / sk_void_arrow_pas / sk_void_grav_pas  패시브 추가 공격(공간 참격 · 화살 폭발 · 중력 폭발)
   - sk_void_set     차원의 지배자 4세트 공간 폭발
   11월 7일부터 pixelfx 시트(voidWeaponPxArt.js)로 먼저 그리고, 이 파일의 도트 그림은 시트를 못 불러왔을 때만 쓴다.
   판정 시각은 voidWeaponData.js 의 같은 수치에서 읽어 판정과 어긋나지 않는다. */
import { VOID_SKILLS, VOID_PALETTE as P, voidArrowSpot } from './voidWeaponData.js';
import { drawVoidPx } from './voidWeaponPxArt.js';   // 11월 7일 — pixelfx 시트가 있으면 그것으로 그리고, 없으면 아래 도트 그림
const TAU = Math.PI * 2, PX = 4;
const clamp = x => Math.max(0, Math.min(1, x));
const noise = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const snap = v => Math.round(v / PX) * PX;
function dot(ctx, x, y, color, s = PX, alpha = 1) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.fillRect(snap(x) - s / 2, snap(y) - s / 2, s, s);
}
// 도트로 찍은 직선 — 세 겹(바깥 어두움 · 보라 · 밝은 심지)
function line(ctx, x0, y0, x1, y1, width, alpha, q = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / (PX * (q < 0.6 ? 2 : 1))));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, w = width * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.02)));
    dot(ctx, x, y, P.violet, PX + w * 1.6, alpha * 0.55);
    dot(ctx, x, y, P.purple, PX + w * 0.7, alpha * 0.85);
    dot(ctx, x, y, P.core, PX, alpha);
  }
}
// 도트로 찍은 타원 고리(위아래로 눌림 sq)
function ring(ctx, x, y, r, sq, color, alpha, q = 1, from = 0, span = TAU, size = PX) {
  const n = Math.max(10, Math.round(r * 0.5 * q));
  for (let i = 0; i < n; i++) { const a = from + span * i / n; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * sq, color, size, alpha); }
}
function shard(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(snap(x), snap(y - r)); ctx.lineTo(snap(x + r * 0.6), snap(y)); ctx.lineTo(snap(x), snap(y + r)); ctx.lineTo(snap(x - r * 0.6), snap(y)); ctx.closePath(); ctx.fill();
}
function disc(ctx, x, y, r, sq, color, alpha) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(snap(x), snap(y), Math.max(PX, snap(r)), Math.max(PX, snap(r * sq)), 0, 0, TAU); ctx.fill();
}
// 범위 표시 — 끊어진 도트 고리
function range(ctx, x, y, r, sq, alpha, color = P.purple, q = 1) {
  const n = Math.max(16, Math.round(r * 0.28 * q));
  for (let i = 0; i < n; i += 2) { const a = i / n * TAU; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * sq, color, PX, alpha); }
}
// ── 공허의 대검 — 차원 절단 ───────────────────────────────
function slash(ctx, f, t, sq, g, q) {
  const S = VOID_SKILLS.void_great.skill, h = g?.heroes?.[f.pi];
  const x = h && h.down <= 0 ? h.x : f.x, y = (h && h.down <= 0 ? h.y : f.y) - 24;
  const step = (S.dur - S.dur / S.slashes) / (S.slashes - 1);
  range(ctx, x, y + 24, S.r, sq, 0.3 * clamp(1 - Math.max(0, t - S.dur - 0.1) / 0.3), P.purple, q);
  for (let k = 0; k < S.slashes; k++) {
    const age = t - k * step; if (age < 0 || age > 0.42) continue;
    const a = k * 0.83 + 0.4, grow = clamp(age / 0.07), fade = clamp(1 - (age - 0.07) / 0.35), len = S.r * 1.7 * grow;
    const dx = Math.cos(a), dy = Math.sin(a) * sq, jag = (noise(k, 2) - 0.5) * 36;
    // 공간이 갈라진 선 — 가운데가 꺾이고 어두운 틈이 벌어진다
    const x0 = x - dx * len * 0.5, y0 = y - dy * len * 0.5, xm = x + dy * jag * 0.4, ym = y - dx * jag * 0.4, x1 = x + dx * len * 0.5, y1 = y + dy * len * 0.5;
    line(ctx, x0, y0, xm, ym, 5, fade, q); line(ctx, xm, ym, x1, y1, 5, fade, q);
    // 어두운 틈
    ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = P.rift; ctx.lineWidth = 3 * (1 - age * 1.5);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xm, ym); ctx.lineTo(x1, y1); ctx.stroke();
    // 베는 초승달 — 균열을 따라 휘두른 칼날 궤적
    const arcR = S.r * (0.72 + 0.08 * (k % 2)), start = a - 1.1, span = 2.2 * grow;
    ring(ctx, x, y, arcR, sq, P.glow, fade * 0.9, q, start, span, PX);
    ring(ctx, x, y, arcR - 6, sq, P.violet, fade * 0.7, q, start + 0.15, span * 0.9, PX);
  }
  // 마지막 원형 공간 폭발
  const b = t - S.dur;
  if (b > -0.06 && b < 0.55) {
    const u = clamp(b / 0.28), fade = clamp(1 - (b - 0.1) / 0.42);
    if (b < 0.08) { disc(ctx, x, y + 14, 34 * (1 - Math.abs(b) / 0.08) + 6, sq, P.rift, 0.95); }   // 터지기 직전 빨려 드는 검은 점
    if (b >= 0) {
      disc(ctx, x, y + 14, S.burstR * u * 0.9, sq, P.dark, 0.35 * fade);
      ring(ctx, x, y + 14, S.burstR * u, sq, P.core, fade, q, 0, TAU, PX + 2);
      ring(ctx, x, y + 14, S.burstR * u * 0.82, sq, P.purple, fade * 0.9, q, 0, TAU, PX + 2);
      ring(ctx, x, y + 14, S.burstR * u * 0.6, sq, P.violet, fade * 0.7, q, 0, TAU, PX);
      const n = Math.max(8, Math.round(22 * q));
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + noise(i, 4) * 0.3, d = S.burstR * (0.25 + 0.85 * u) * (0.7 + 0.5 * noise(i, 6));
        shard(ctx, x + Math.cos(a) * d, y + 14 + Math.sin(a) * d * sq, 6 + noise(i, 8) * 8 * (1 - u), i % 3 ? P.purple : P.glow, fade);
      }
    }
  }
}
// ── 공허의 장궁 — 차원 폭우 ───────────────────────────────
function rain(ctx, f, t, sq, g, q) {
  const S = VOID_SKILLS.void_bow.skill, x = f.x, y = f.y, skyY = y - 330;
  const open = clamp(t / 0.22) * clamp((S.life - 0.15 - t) / 0.3);
  range(ctx, x, y, S.r, sq, 0.45 * clamp(t / 0.15) * clamp((S.life - t) / 0.3), P.purple, q);
  range(ctx, x, y, S.r - 8, sq, 0.25 * clamp(t / 0.15) * clamp((S.life - t) / 0.3), P.violet, q);
  // 하늘의 균열 — 검보라 틈이 가로로 찢어진다
  if (open > 0) {
    const w = 190 * open, hgt = 38 * open;
    disc(ctx, x, skyY, w, 1, P.violet, 0.4 * open); disc(ctx, x, skyY, w * 0.8, hgt / (w * 0.8), P.dark, 0.9 * open);
    disc(ctx, x, skyY, w * 0.6, hgt * 0.6 / (w * 0.6), P.rift, open);
    ring(ctx, x, skyY, w * 0.92, hgt / (w * 0.92), P.glow, 0.85 * open, q, 0, TAU, PX);
    const n = Math.max(6, Math.round(14 * q));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + t * 1.2, d = w * (0.55 + 0.4 * noise(i, 3));
      dot(ctx, x + Math.cos(a) * d, skyY + Math.sin(a) * d * hgt / w, i % 2 ? P.core : P.purple, PX, open);
    }
  }
  for (let i = 0; i < S.arrows; i++) {
    const land = S.start + i * S.span / (S.arrows - 1), [sx, sy] = voidArrowSpot(S, i, x, y, sq);
    // 낙하 자리 표시 — 떨어지기 전부터 작은 원과 가위표
    const show = clamp((t - (land - 0.75)) / 0.15) * (t < land ? 1 : clamp(1 - (t - land) / 0.15));
    if (show > 0) { ring(ctx, sx, sy, S.arrowR * 0.55, sq, P.glow, 0.5 * show, q, i, TAU * 0.8, PX); dot(ctx, sx, sy, P.core, PX + 2, 0.8 * show); dot(ctx, sx - 8, sy, P.purple, PX, 0.7 * show); dot(ctx, sx + 8, sy, P.purple, PX, 0.7 * show); }
    const fall = (t - (land - S.fall)) / S.fall;
    if (fall > 0 && fall < 1) {   // 균열에서 비스듬히 떨어지는 화살
      const hx = sx + 70 * (1 - fall), hy = sy - 360 * (1 - fall);
      line(ctx, hx + 36, hy - 170, hx, hy, 2, 0.9, q);
      shard(ctx, hx, hy, 12, P.core, 1);
    }
    const hit = t - land;   // 착탄 — 도트 번쩍임
    if (hit >= 0 && hit < 0.34) {
      const u = hit / 0.34, fade = 1 - u;
      disc(ctx, sx, sy, S.arrowR * 0.5 * (0.4 + u), sq, P.violet, 0.5 * fade);
      ring(ctx, sx, sy, S.arrowR * (0.3 + 0.7 * u), sq, P.glow, fade, q, 0, TAU, PX + 2);
      const n = Math.max(4, Math.round(8 * q));
      for (let j = 0; j < n; j++) { const a = j / n * TAU + i, d = S.arrowR * (0.2 + 0.6 * u); shard(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d * sq - 14 * u, 5, P.purple, fade); }
    }
  }
}
// ── 공허의 지팡이 — 특이점 붕괴 ───────────────────────────
function hole(ctx, f, t, sq, g, q) {
  const S = VOID_SKILLS.void_staff.skill, x = f.x, y = f.y;
  const birth = clamp(t / 0.3), end = clamp((S.life - t) / 0.4);
  range(ctx, x, y, S.r, sq, 0.4 * clamp(t / 0.2) * end, P.purple, q);
  // 반지름 — 생성 → 천천히 커짐 → 수축 → 폭발 순간 사라짐
  const squeeze = t < S.pullFor ? 1 : clamp(1 - (t - S.pullFor) / (S.burstAt - S.pullFor));
  const core = (22 + 16 * clamp(t / S.pullFor)) * birth * (t < S.burstAt ? squeeze * 0.6 + 0.4 : 0);
  if (t < S.burstAt + 0.05) {
    // 끌려 들어오는 소용돌이 팔 — 바깥에서 안쪽으로 감기며 모인다
    const arms = 3, n = Math.max(10, Math.round(26 * q));
    for (let a = 0; a < arms; a++) for (let i = 0; i < n; i++) {
      const u = (i / n + t * 0.9) % 1, r = S.r * (1 - u) * squeeze + core * 0.5;
      const ang = a * TAU / arms + u * 4.6 - t * 3.4;
      dot(ctx, x + Math.cos(ang) * r, y + Math.sin(ang) * r * sq, u > 0.7 ? P.core : u > 0.35 ? P.purple : P.violet, PX + (u > 0.7 ? 2 : 0), birth * (0.25 + 0.75 * u));
    }
    // 강착 고리와 검은 구
    ring(ctx, x, y, core * 2.1, sq * 0.7, P.violet, 0.8 * birth, q, t * 2, TAU, PX + 2);
    ring(ctx, x, y, core * 1.6, sq * 0.7, P.glow, 0.9 * birth, q, -t * 3, TAU * 0.8, PX);
    disc(ctx, x, y, core * 1.35, sq, P.dark, 0.7 * birth);
    disc(ctx, x, y, core, sq, P.rift, birth);
    ring(ctx, x, y, core + 3, sq, P.core, 0.55 * birth, q, 0, TAU, PX - 1);
  }
  // 5번의 맥동 — 피해가 들어가는 때마다 가운데에서 고리가 퍼진다
  for (let i = 0; i < S.ticks; i++) {
    const age = t - (S.first + i * S.gap); if (age < 0 || age > 0.24) continue;
    const u = age / 0.24; ring(ctx, x, y, S.r * (0.25 + 0.75 * u), sq, P.glow, 1 - u, q, 0, TAU, PX + 1);
  }
  // 마지막 큰 폭발
  const b = t - S.burstAt;
  if (b >= 0 && b < 0.5) {
    const u = clamp(b / 0.26), fade = clamp(1 - b / 0.5);
    disc(ctx, x, y, S.burstR * u, sq, P.violet, 0.4 * fade);
    disc(ctx, x, y, S.burstR * u * 0.55, sq, P.core, 0.7 * fade * (1 - u));
    ring(ctx, x, y, S.burstR * u, sq, P.core, fade, q, 0, TAU, PX + 2);
    ring(ctx, x, y, S.burstR * u * 0.78, sq, P.purple, fade, q, 0, TAU, PX + 2);
    const n = Math.max(10, Math.round(26 * q));
    for (let i = 0; i < n; i++) { const a = i / n * TAU, d = S.burstR * (0.2 + 0.9 * u) * (0.6 + 0.5 * noise(i, 9)); shard(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * sq, 7 * (1 - u * 0.5), i % 2 ? P.purple : P.glow, fade); }
  }
}
// ── 패시브 ──────────────────────────────────────────────
function passiveSlash(ctx, f, t, sq, g, q) {   // 차원의 잔흔 — 둘레를 한 번 가르는 공간 참격
  const x = f.x, y = f.y - 20, r = f.r, u = clamp(t / 0.14), fade = clamp(1 - (t - 0.12) / 0.43);
  ring(ctx, x, y + 20, r, sq, P.purple, 0.45 * fade, q, 0, TAU, PX);
  ring(ctx, x, y, r * 0.8, sq, P.core, fade, q, -0.6, TAU * 0.75 * u, PX + 2);
  ring(ctx, x, y, r * 0.62, sq, P.violet, fade * 0.8, q, 0.9, TAU * 0.55 * u, PX);
  line(ctx, x - r * 0.9 * u, y + r * 0.35 * u * sq, x + r * 0.9 * u, y - r * 0.35 * u * sq, 3, fade, q);
}
function passiveArrow(ctx, f, t, sq, g, q) {   // 차원 화살 — 하늘에서 화살 한 발이 꽂히고 터진다
  const x = f.x, y = f.y, fall = clamp(t / 0.16);
  if (t < 0.16) { line(ctx, x + 50 * (1 - fall) + 24, y - 280 * (1 - fall) - 110, x + 50 * (1 - fall), y - 280 * (1 - fall), 2, 0.9, q); shard(ctx, x + 50 * (1 - fall), y - 280 * (1 - fall), 10, P.core, 1); return; }
  const u = clamp((t - 0.16) / 0.3), fade = 1 - u;
  disc(ctx, x, y, f.r * 0.6 * u, sq, P.violet, 0.5 * fade);
  ring(ctx, x, y, f.r * (0.3 + 0.7 * u), sq, P.glow, fade, q, 0, TAU, PX + 2);
  const n = Math.max(5, Math.round(10 * q));
  for (let i = 0; i < n; i++) { const a = i / n * TAU, d = f.r * (0.2 + 0.7 * u); shard(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * sq, 5, i % 2 ? P.purple : P.core, fade); }
}
function passiveGravity(ctx, f, t, sq, g, q) {   // 중력 공명 — 작은 검은 점이 빨아들였다 터진다
  const x = f.x, y = f.y, pull = clamp(t / 0.25), fade = clamp(1 - (t - 0.25) / 0.3);
  if (t < 0.25) {
    const n = Math.max(6, Math.round(12 * q));
    for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 5, r = f.r * (1 - pull) + 6; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * sq, i % 2 ? P.glow : P.purple, PX, 0.4 + pull * 0.6); }
    disc(ctx, x, y, 8 + pull * 6, sq, P.rift, 1);
  } else {
    const u = clamp((t - 0.25) / 0.3);
    disc(ctx, x, y, f.r * u * 0.8, sq, P.violet, 0.4 * fade);
    ring(ctx, x, y, f.r * u, sq, P.core, fade, q, 0, TAU, PX + 1);
    ring(ctx, x, y, f.r * u * 0.7, sq, P.purple, fade, q, 0, TAU, PX);
  }
}
function setBurst(ctx, f, t, sq, g, q) {   // 차원의 지배자 4세트 공간 폭발(시트를 못 불러왔을 때)
  const u = clamp(t / 0.3), fade = clamp(1 - t / 0.6);
  disc(ctx, f.x, f.y, f.r * u * 0.8, sq, P.violet, 0.35 * fade);
  ring(ctx, f.x, f.y, f.r * u, sq, P.core, fade, q, 0, TAU, PX + 1);
  ring(ctx, f.x, f.y, f.r * u * 0.7, sq, P.purple, fade, q, 0, TAU, PX);
}
const KINDS = { sk_void_set: setBurst, sk_void_slash: slash, sk_void_rain: rain, sk_void_hole: hole, sk_void_slash_pas: passiveSlash, sk_void_arrow_pas: passiveArrow, sk_void_grav_pas: passiveGravity };
export const VOID_FX_KINDS = Object.keys(KINDS);
export function drawVoidFx(ctx, f, p, time, sq, g, q = 1) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  const h = g?.heroes?.[f.pi];
  if (f.token && g && (!h || h.down > 0 || h.ws?.void?.cast?.token !== f.token) && p < 0.98 && f.kind !== 'sk_void_hole' && f.kind !== 'sk_void_rain') return true;   // 베는 중 맵을 떠나거나 쓰러지면 그만 그린다(블랙홀 · 균열은 땅에 남는다)
  if (drawVoidPx(ctx, f, clamp(p) * f.life, sq, g)) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, clamp(p) * f.life, sq, g, q); } finally { ctx.restore(); }
  return true;
}
