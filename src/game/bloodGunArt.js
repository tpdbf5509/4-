/* 크림슨 레퀴엠 전용 도트 연출(11월 13일) — 혈계 추격 5단계 + 혈흔 표식. 기존 스킬 연출을 쓰지 않는다.
   모든 모양을 PX 칸(네모 도트)에 맞춰 찍어 도트 그림처럼 보이게 하고, 같은 시간에는 같은 모양을 그린다(무작위 상태 없음).
   색은 사용자가 정한 다섯 가지 한 벌: 진한 혈색 · 기본 붉은색 · 밝은 혈색 · 핵심 발광 · 그림자. 블러 · 번짐 · 화면 가리기는 쓰지 않는다.
   - sk_blood_charge  1단계 혈계 발사 준비: 총구 앞 작은 붉은 마법진 · 모여드는 검붉은 입자 · 심장 박동 고리
   - sk_blood_shot    2단계 관통 혈탄: 검붉은 중심 + 밝은 테두리 탄환 · 긴 붉은 잔상 · 총구 섬광
   - sk_blood_hit     적중 충격(관통 혈탄은 큰 충격파 · 유도 혈탄은 작은 파열 · fade 는 흩어짐)
   - sk_blood_seek    3단계 피의 추적자: 흩어진 혈액 에너지 → 6개의 작은 혈액 결정 → 곡선으로 목표를 쫓는다(목표 자리는 살아 있는 몹을 따라간다)
   - sk_blood_res     4단계 혈흔 공명: 붉은 균열이 강하게 빛나고 고리가 퍼지며 결정 조각이 떠오른다(중첩 n 이 많을수록 고리 · 조각이 늘어난다)
   - sk_blood_boom    5단계 혈계 처형: 원형 충격파 · 날카로운 붉은 조각(5중첩은 더 크고 밝다)
   - 혈흔 표식(drawBloodMarks): 몹 몸의 붉은 균열(중첩만큼 선명) · 머리 위 붉은 방울과 숫자 · 5중첩은 약하게 맥동
   시간은 bloodGunData.js 의 같은 수치에서 읽어 판정과 어긋나지 않는다. 알갱이 수에는 q(연출 줄이기 · 사람 많은 맵)를 곱한다.
   11월 13일부터 혈계 추격 여섯 연출은 pixelfx 시트(bloodGunPxArt.js)로 먼저 그리고, 이 파일의 도트 그림은 시트를 못 불러왔을 때만 쓴다.
   혈흔 표식(drawBloodMarks)은 계속 이 파일의 도트 그림이다. */
import { BLOOD_PALETTE as P, BLOOD_SKILLS } from './bloodGunData.js';
import { drawBloodPx, warmBloodPx } from './bloodGunPxArt.js';   // 11월 13일 — pixelfx 시트가 있으면 그것으로 그리고, 없으면 아래 도트 그림
import { heldSpecial } from './rpg.js';

const S = BLOOD_SKILLS.blood_gun.skill, H = S.hold, MAXN = BLOOD_SKILLS.blood_gun.passive.max;
const TAU = Math.PI * 2, PX = 3;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const noise = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const snap = (v) => Math.round(v / PX) * PX;
function dot(ctx, x, y, color, s = PX, alpha = 1) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.fillRect(snap(x), snap(y), s, s);
}
function line(ctx, x0, y0, x1, y1, color, alpha, s = PX) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / PX));
  for (let i = 0; i <= n; i++) dot(ctx, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, color, s, alpha);
}
function ring(ctx, x, y, r, sq, color, alpha, q = 1, dash = 1, from = 0, span = TAU) {
  const n = Math.max(10, Math.round(r * 0.55 * q));
  for (let i = 0; i < n; i += dash) { const a = from + span * i / n; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * sq, color, PX, alpha); }
}
function disc(ctx, x, y, r, sq, color, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(snap(x), snap(y), Math.max(PX, snap(r)), Math.max(PX, snap(r * sq)), 0, 0, TAU); ctx.fill();
}
// 혈액 결정 — 마름모 도트(바깥 테두리 · 속 · 한가운데 발광)
function crystal(ctx, x, y, r, alpha, spin = 0) {
  r = Math.max(PX, snap(r));
  for (let dy = -r; dy <= r; dy += PX) {
    const w = r - Math.abs(dy);
    for (let dx = -w; dx <= w; dx += PX) {
      const edge = Math.abs(dx) + Math.abs(dy) >= r - PX;
      dot(ctx, x + dx, y + dy, edge ? P.bright : (spin > 0.5 ? P.base : P.deep), PX, alpha);
    }
  }
  dot(ctx, x, y, P.glow, PX, alpha);
}
// 날카로운 조각 — 방향 a 로 길쭉한 도트 선
function sliver(ctx, x, y, a, len, color, alpha) { line(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, color, alpha, PX); }

/* ── 1단계 · 혈계 발사 준비 (0.4초) ── */
function charge(ctx, f, t, sq, g, q) {
  const u = clamp(t / S.charge), ax = f.ax || 1, ay = f.ay || 0;
  const mx = f.x + ax * 30, my = f.y - 38 + ay * 30 * sq;                  // 총구
  const cx = f.x + ax * 78, cy = f.y - 38 + ay * 78 * sq;                  // 총구 앞 작은 붉은 원형 마법진(세워서 보인다)
  const fade = u > 0.88 ? (1 - u) / 0.12 : 1;
  // 모여드는 검붉은 입자 — 점마다 짧은 꼬리를 달아 총구로 빨려 드는 방향이 보이게
  const n = Math.max(8, Math.round(20 * q));
  for (let i = 0; i < n; i++) {
    const a = noise(i, 3) * TAU, d0 = 46 + noise(i, 5) * 44, k = clamp(u * 1.15 - noise(i, 7) * 0.25), d = d0 * (1 - k), k2 = clamp(k - 0.12), d2 = d0 * (1 - k2);
    const al = (0.45 + 0.55 * k) * fade, c = i % 3 === 0 ? P.bright : i % 3 === 1 ? P.base : P.deep;
    dot(ctx, mx + Math.cos(a) * d2, my + Math.sin(a) * d2 * 0.7, P.deep, PX, al * 0.6);
    dot(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.7, c, PX + 1, al);
  }
  // 마법진 — 바깥 고리 · 안쪽 고리 · 돌아가는 눈금(어두운 밑선을 깔아 풀밭 위에서도 보이게)
  const rr = 13 + 8 * clamp(u * 3), spin = u * 8;
  ring(ctx, cx, cy, rr + 2, 1, P.shadow, 0.55 * fade, q, 1);
  ring(ctx, cx, cy, rr, 1, P.bright, 0.95 * fade, q, 1);
  ring(ctx, cx, cy, rr * 0.6, 1, P.glow, 0.85 * fade, q, 2);
  for (let i = 0; i < 6; i++) { const a = spin + i * TAU / 6; dot(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, P.glow, PX + 1, fade); dot(ctx, cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6, P.base, PX, fade); }
  dot(ctx, cx, cy, P.glow, PX * 2, (0.5 + 0.5 * u) * fade);
  // 총구의 붉은 발광이 점점 밝아진다
  disc(ctx, mx, my, 5 + 8 * u, 1, P.base, 0.5 * fade);
  disc(ctx, mx, my, 3 + 4 * u, 1, P.bright, 0.7 * fade);
  dot(ctx, mx, my, P.glow, PX * 2, (0.4 + 0.6 * u) * fade);
  // 낮은 심장 박동 — 발밑에서 두 번 퍼지는 고리
  for (const b of [0.06, 0.24]) {
    const k = clamp((u - b) / 0.32); if (k <= 0 || k >= 1) continue;
    ring(ctx, f.x, f.y, 14 + 36 * k, sq, P.base, 0.95 * (1 - k), q, 1);
    ring(ctx, f.x, f.y, 10 + 28 * k, sq, P.bright, 0.8 * (1 - k), q, 2);
  }
}

/* ── 2단계 · 관통 혈탄 ── */
function shot(ctx, f, t, sq, g, q) {
  const ax = f.ax || 1, ay = f.ay || 0, mx = f.x + ax * 30, my = f.y - 38 + ay * 30 * sq;
  const travel = f.len / f.v, d = Math.min(f.len, f.v * t), tail = Math.max(0, d - 300);
  const fade = t > travel ? clamp(1 - (t - travel) / 0.14) : 1;
  const at = (k) => [mx + ax * k, my + ay * k * sq];
  // 잔상 — 가늘고 긴 붉은 줄(바깥 어두운 선 · 안쪽 붉은 선 · 끝으로 갈수록 옅다)
  const steps = Math.max(8, Math.round((d - tail) / PX / (q < 0.6 ? 2 : 1)));
  for (let i = 0; i < steps; i++) {
    const k = tail + (d - tail) * i / steps, u = i / steps, [x, y] = at(k);
    dot(ctx, x, y - PX, P.deep, PX, (0.2 + 0.6 * u) * fade);
    dot(ctx, x, y, u > 0.7 ? P.bright : P.base, PX, (0.35 + 0.65 * u) * fade);
  }
  if (t <= travel) {   // 탄환 머리 — 검붉은 중심 · 밝은 붉은 테두리 · 가운데 발광
    const [hx, hy] = at(d);
    for (let dy = -9; dy <= 9; dy += PX) for (let dx = -12; dx <= 12; dx += PX) {
      const e = (dx / 12) ** 2 + (dy / 9) ** 2;
      if (e > 1) continue;
      dot(ctx, hx + dx, hy + dy, e > 0.62 ? P.bright : P.deep, PX, 1);
    }
    dot(ctx, hx, hy, P.glow, PX * 2, 1);
    dot(ctx, hx - ax * 12, hy - 2, P.shadow, PX, 0.9);
  }
  // 총구 섬광(짧게)
  if (t < 0.1) {
    const k = 1 - t / 0.1;
    for (let i = 0; i < 8; i++) { const a = Math.atan2(ay * sq, ax) + (i - 3.5) * 0.28; sliver(ctx, mx, my, a, 18 * k + 6, i % 2 ? P.bright : P.glow, k); }
    dot(ctx, mx, my, P.glow, PX * 3, k);
  }
}

/* ── 적중 충격 ── */
function hit(ctx, f, t, sq, g, q) {
  const x = f.x, y = f.y - 26, u = clamp(t / f.life), a = 1 - u;
  if (f.fade) {   // 쫓을 적이 없어 붉은 입자로 흩어진다
    for (let i = 0; i < Math.max(4, Math.round(8 * q)); i++) { const an = noise(i, 2) * TAU, d = 8 + 26 * u; dot(ctx, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.8, i % 2 ? P.base : P.deep, PX, a); }
    return;
  }
  const big = !!f.big, R = big ? 38 : 20;
  if (big) ring(ctx, f.x, f.y, R * (0.3 + 0.9 * u), sq, P.bright, a, q, 1);   // 관통 혈탄이 닿으면 붉은 충격파
  ring(ctx, x, y, R * (0.25 + 0.75 * u), 0.8, big ? P.glow : P.bright, a, q, 1);
  const n = Math.max(4, Math.round((big ? 12 : 7) * q));
  for (let i = 0; i < n; i++) { const an = noise(i, 4) * TAU, d = R * (0.2 + 0.9 * u); sliver(ctx, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.8, an, big ? 7 : 5, i % 2 ? P.bright : P.base, a); }
  dot(ctx, x, y, P.glow, PX * 2, a);
}

/* ── 3단계 · 피의 추적자 ── */
// 쫓는 목표의 지금 자리 — 살아 있는 몹(사람)을 따라가고, 없으면 마지막으로 알린 자리
function target(g, b) {
  const o = b[2] ? g?.mobs?.find((m) => m.id === b[1]) : g?.heroes?.[b[1]];
  return o && !o.dead ? [o.x, o.y - 26] : [b[3], b[4] - 26];
}
function seek(ctx, f, t, sq, g, q) {
  const sx = f.x, sy = f.y - 28;
  // 흩어진 혈액 에너지 — 첫 적중 자리에서 바깥으로 흩어졌다가 결정으로 응축한다
  if (t < f.form) {
    const k = t / f.form, n = Math.max(6, Math.round(16 * q));
    for (let i = 0; i < n; i++) { const a = noise(i, 1) * TAU, d = 34 * (1 - k) * (0.4 + noise(i, 8)); dot(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.8, i % 3 ? P.base : P.deep, PX, 0.9 * (1 - k * 0.4)); }
  }
  for (const b of f.b) {
    const [i, , , , , delay, T, bend] = b, a0 = i * TAU / (f.n || S.n) + 0.4;
    if (t < delay) {   // 응축한 결정이 잠시 공중에서 돈다
      const k = clamp(t / (f.form * 0.8)), a = a0 + t * 8, r = 8 + 14 * k;
      crystal(ctx, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.75, 3 + 3 * k, 0.4 + 0.6 * k, Math.sin(t * 20 + i));
      continue;
    }
    const u = (t - delay) / T; if (u >= 1.02) continue;
    const a = a0 + delay * 8, ox = sx + Math.cos(a) * 22, oy = sy + Math.sin(a) * 16;
    const [ex, ey] = target(g, b), dx = ex - ox, dy = ey - oy, len = Math.hypot(dx, dy) || 1;
    const cx = (ox + ex) / 2 - dy / len * bend, cy = (oy + ey) / 2 + dx / len * bend;
    const at = (k) => { const kk = Math.pow(clamp(k), 1.35), w = 1 - kk; return [w * w * ox + 2 * w * kk * cx + kk * kk * ex, w * w * oy + 2 * w * kk * cy + kk * kk * ey]; };
    const trail = Math.max(3, Math.round(8 * q));
    for (let j = trail; j >= 1; j--) {   // 검붉은 잔상
      const [x, y] = at(u - j * 0.035); if (u - j * 0.035 < 0) continue;
      dot(ctx, x, y, j > trail / 2 ? P.deep : P.base, PX, 0.75 * (1 - j / (trail + 1)));
    }
    const [hx, hy] = at(u);
    crystal(ctx, hx, hy, 6, 1, Math.sin(t * 30 + i));
  }
}

/* ── 4단계 · 혈흔 공명 ── */
function res(ctx, f, t, sq, g, q) {
  const u = clamp(t / f.life), x = f.x, y = f.y - 26, n = clamp(f.n || 1, 1, MAXN);
  // 몸의 붉은 균열이 강하게 빛난다
  for (let i = 0; i < n + 2; i++) { const a = noise(i, 9) * TAU; sliver(ctx, x, y, a, 8 + 8 * noise(i, 6), i % 2 ? P.glow : P.bright, 0.5 + 0.5 * u); }
  // 중첩에 따라 확장하는 붉은 고리
  for (let r = 0; r < Math.min(3, 1 + (n >> 1)); r++) ring(ctx, x, y, 12 + 22 * clamp(u + r * 0.12) , 0.85, r ? P.base : P.bright, (1 - u * 0.5), q, 1);
  // 대상 둘레에 떠오르는 혈액 결정 조각 — 에너지가 응축되며 안쪽으로 모인다
  const k = Math.max(3, Math.round((3 + n) * q));
  for (let i = 0; i < k; i++) { const a = i * TAU / k + u * 3, d = (30 - 18 * u) , rise = u * 14; crystal(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - rise, 3, 0.9, i); }
}

/* ── 5단계 · 혈계 처형 ── */
function boom(ctx, f, t, sq, g, q) {
  const u = clamp(t / f.life), a = 1 - u * u, full = (f.n || 1) >= MAXN, R = f.r * (full ? 1.12 : 1), x = f.x, y = f.y - 12;
  disc(ctx, x, y, R * Math.min(1, u * 4) * 0.6, sq, P.deep, 0.55 * a);                          // 검붉은 속
  disc(ctx, x, y, R * 0.35 * (1 - u), sq, full ? P.glow : P.bright, 0.8 * (1 - u));             // 밝은 중심(5중첩은 더 밝다)
  ring(ctx, x, y, R * Math.min(1, u * 2.4), sq, P.bright, a, q, 1);                              // 원형 충격파
  ring(ctx, x, y, R * 0.72 * Math.min(1, u * 2.4), sq, P.base, a, q, 2);
  if (full) ring(ctx, x, y, R * 1.05 * Math.min(1, u * 2.4), sq, P.glow, a * 0.8, q, 3);
  const n = Math.max(8, Math.round((12 + (f.n || 1) * 3) * q));                                   // 날카로운 붉은 조각이 흩어진다
  for (let i = 0; i < n; i++) {
    const an = i * TAU / n + noise(i, 3) * 0.4, d = R * (0.25 + 0.95 * Math.min(1, u * 1.6)) * (0.7 + 0.4 * noise(i, 5));
    sliver(ctx, x + Math.cos(an) * d, y + Math.sin(an) * d * sq, an, 6 + 5 * noise(i, 8), i % 3 === 0 ? P.glow : i % 3 === 1 ? P.bright : P.base, a);
  }
}

/* ── 길게 누르기 차징(11월 14일) — 누르는 동안 이어서 그린다. 풀차징이면 검은 핵 · 붉은 탄환 12개 회전 · 번쩍임이 더해진다
   위치는 쏘는 사람을 따라간다(차징 중에는 천천히 걷는다). 회전은 화면 시계(time)로 이어 돌려 다시 보내는 연출 사이가 끊기지 않는다 ── */
function hold(ctx, f, t, sq, g, q, time) {
  const o = g?.heroes?.[f.pi], x = o && !o.down ? o.x : f.x, y = o && !o.down ? o.y : f.y, ax = f.ax || 1, ay = f.ay || 0;
  const mx = x + ax * 30, my = y - 38 + ay * 30 * sq, u = clamp(f.u), full = !!f.full;
  const fade = clamp((f.life - t) / 0.08);                                                    // 다음 연출이 이어받기 전 잠깐 옅어진다
  // 발밑 — 누른 시간만큼 커지는 고리 · 풀차징이면 검은 바탕에 붉은 이중 고리
  const R = 22 + 30 * u;
  if (full) disc(ctx, x, y, R + 6, sq, P.shadow, 0.5 * fade);
  ring(ctx, x, y, R, sq, full ? P.glow : P.bright, 0.85 * fade, q, 1);
  ring(ctx, x, y, R * 0.72, sq, P.base, 0.7 * fade, q, 2, time * (full ? 3 : 1.5));
  // 총구로 모여드는 붉은 입자(풀차징이면 더 많이)
  const n = Math.max(6, Math.round((full ? 18 : 10) * q));
  for (let i = 0; i < n; i++) {
    const k = (time * 1.6 + noise(i, 3)) % 1, a = noise(i, 5) * TAU + time * 0.6, d = (full ? 64 : 48) * (1 - k);
    dot(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.7, i % 3 ? P.base : P.bright, PX + 1, (0.3 + 0.7 * k) * fade);
  }
  // 총구 구슬 — 누를수록 커진다
  disc(ctx, mx, my, 5 + 8 * u, 1, P.base, 0.6 * fade);
  disc(ctx, mx, my, 3 + 4 * u, 1, P.bright, 0.8 * fade);
  if (!full) return;
  // 풀차징 — 검은 핵 · 붉은 탄환 12개 회전 · 방사 빛줄기 · 번쩍임
  const pulse = 0.75 + 0.25 * Math.sin(time * 14), m = Math.max(4, Math.round(H.ring * Math.max(0.6, q)));
  disc(ctx, mx, my, 12, 1, P.shadow, 0.95 * fade);
  ring(ctx, mx, my, 15, 1, P.glow, pulse * fade, q, 1);
  for (let i = 0; i < m; i++) {
    const a = time * 4.2 + i * TAU / m, rr = 27;
    dot(ctx, mx + Math.cos(a - 0.16) * rr, my + Math.sin(a - 0.16) * rr * 0.85, P.deep, PX, 0.7 * fade);
    crystal(ctx, mx + Math.cos(a) * rr, my + Math.sin(a) * rr * 0.85, 4, fade, i);
  }
  for (let i = 0; i < 8; i++) { const a = time * 1.3 + i * TAU / 8; sliver(ctx, mx, my, a, 18 + 10 * pulse, i % 2 ? P.glow : P.bright, 0.7 * fade); }
  if (f.ping) { ring(ctx, x, y, R + 90 * clamp(t / 0.25), sq, P.glow, 1 - clamp(t / 0.25), q, 1); disc(ctx, mx, my, 30 * (1 - clamp(t / 0.2)), 1, P.glow, 0.7); }
  ring(ctx, x, y, R + 12, sq, P.shadow, 0.6 * fade, q, 1);
}
// 풀차징으로 쏜 연출 — 기존 연출 위에 검은색과 화려한 붉은 빛을 덧그린다
function strongOver(ctx, f, t, sq, g, q) {
  if (f.kind === 'sk_blood_shot') {
    const ax = f.ax || 1, ay = f.ay || 0, mx = f.x + ax * 30, my = f.y - 38 + ay * 30 * sq, d = Math.min(f.len, f.v * t), steps = Math.max(8, Math.round(d / 18));
    for (let i = 0; i < steps; i++) {
      const k = d * i / steps, x = mx + ax * k, y = my + ay * k * sq, a = (0.25 + 0.5 * i / steps) * clamp(1 - Math.max(0, t - f.len / f.v) / 0.14);
      dot(ctx, x - ay * 12, y + ax * 12, P.shadow, PX * 2, a); dot(ctx, x + ay * 12, y - ax * 12, P.shadow, PX * 2, a);
      if (i % 2) dot(ctx, x + noise(i, 2) * 10 - 5, y + noise(i, 4) * 10 - 5, P.glow, PX, a);
    }
  } else if (f.kind === 'sk_blood_seek') {
    seek(ctx, f, t, sq, g, Math.min(q, 0.7));
  } else if (f.kind === 'sk_blood_boom') {
    const u = clamp(t / f.life), R = f.r * Math.min(1, u * 2.4);
    disc(ctx, f.x, f.y - 12, f.r * 0.7 * Math.min(1, u * 4), sq, P.shadow, 0.55 * (1 - u));
    ring(ctx, f.x, f.y - 12, R, sq, P.shadow, 0.7 * (1 - u * u), q, 1);
    ring(ctx, f.x, f.y - 12, R * 0.86, sq, P.glow, 0.8 * (1 - u * u), q, 2);
  }
}

// 월드 장비 세트 효과 — 시트를 못 불러왔을 때의 붉은 도트 폭발
function set(ctx, f, t, sq, g, q) {
  const u = clamp(t / f.life), R = f.r * Math.min(1, u * 2.4), a = 1 - u * u;
  disc(ctx, f.x, f.y - 8, R * 0.8, sq, P.deep, 0.5 * a);
  ring(ctx, f.x, f.y - 8, R, sq, P.bright, a, q, 1);
  ring(ctx, f.x, f.y - 8, R * 0.7, sq, P.base, a, q, 2);
}
const KINDS = { sk_blood_set: set, sk_blood_charge: charge, sk_blood_hold: hold, sk_blood_shot: shot, sk_blood_hit: hit, sk_blood_seek: seek, sk_blood_res: res, sk_blood_boom: boom };
export const BLOOD_FX_KINDS = Object.keys(KINDS);
export function drawBloodFx(ctx, f, p, time, sq, g, q = 1) {
  const fn = KINDS[f.kind]; if (!fn) return false;
  const t = clamp(p) * f.life;
  if (drawBloodPx(ctx, f, t, sq, g, time)) {   // pixelfx 시트(못 불러왔으면 false)
    if (f.strong) { ctx.save(); ctx.imageSmoothingEnabled = false; try { strongOver(ctx, f, t, sq, g, q, time); } finally { ctx.restore(); } }
    return true;
  }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  try { fn(ctx, f, t, sq, g, q, time); if (f.strong) strongOver(ctx, f, t, sq, g, q, time); } finally { ctx.restore(); }
  return true;
}

/* ── 혈흔 표식 — 몹 몸의 붉은 균열 + 머리 위 붉은 방울과 숫자 ── */
const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'] };
const DROP = ['..#..', '.###.', '#####', '#####', '.###.'];
function bits(ctx, rows, x, y, color, alpha, s = 2) {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s); } });
}
export function drawBloodMark(ctx, m, time) {
  const n = clamp(m.bl | 0, 0, MAXN); if (!n) return;
  const full = n >= MAXN, pulse = full ? 0.75 + 0.25 * Math.sin(time * 9) : 1;
  const rad = m.rad || 16, cx = m.x, cy = m.y - rad * 0.9;
  const ix = m.x + rad * 0.9 + 10, iy = m.y - rad * 1.7 - (m.wk ? 24 : 0);   // 방울 · 숫자는 몸 옆 위쪽 — 이름표 · 체력 줄 · 피해 숫자와 겹치지 않게
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // 균열 — 첫 중첩은 작은 표식, 늘수록 길고 선명한 붉은 선이 퍼진다
  const lines = 2 + n;
  for (let i = 0; i < lines; i++) {
    const a = noise(i + (m.id | 0) * 0.37, 2) * TAU, len = (6 + 4 * n) * (0.6 + 0.6 * noise(i, 4)), al = clamp((0.5 + 0.1 * n) * pulse, 0, 1);
    const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.8;
    line(ctx, cx, cy, x1, y1, P.shadow, al * 0.8, PX + 1);
    line(ctx, cx, cy, x1, y1, i % 2 ? P.bright : P.base, al, PX);
    if (n >= 3) dot(ctx, x1, y1, P.glow, PX, al);
  }
  dot(ctx, cx, cy, full ? P.glow : P.bright, PX * 2, pulse);
  // 방울 + 숫자 — 어두운 바탕판 위에 밝은 붉은 도트
  ctx.globalAlpha = 0.78; ctx.fillStyle = P.shadow; ctx.fillRect(ix - 4, iy - 4, 44, 22);
  bits(ctx, DROP, ix, iy, full ? P.glow : P.bright, pulse, 3);
  bits(ctx, DIGITS[n], ix + 22, iy, full ? P.glow : P.bright, pulse, 3);
  ctx.restore();
}
let warmed = false;   // 크림슨 레퀴엠을 든 사람이나 혈흔이 보이면 시트를 한 번만 미리 받는다
export function drawBloodMarks(ctx, g, M, time, inView) {
  if (!warmed && (g.heroes.some((h) => h && h.map === M.id && heldSpecial(h) === 'blood_gun') || g.mobs.some((m) => m.bl))) { warmed = true; warmBloodPx(); }
  for (const m of g.mobs) {
    if (!m.bl || m.dead || m.map !== M.id || !inView(m.x, m.y)) continue;
    drawBloodMark(ctx, m, time);
  }
}
