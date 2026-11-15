// BLOOD-001 형상화 — 이 게임용으로 새로 쓴 pixelfx 꼴 이펙트(11월 15일, blood-field.js 와 같은 방식).
// 피가 모여 물체가 만들어지고, 쓰고 나면 다시 피로 풀린다. part · phase 옵션으로 여러 장을 뽑는다(make-form.mjs).
//   sword  — 혈검. 손잡이(0,0 = 쥔 손)에서 +x 쪽으로 칼날. form 모임 → 손잡이 → 칼날 · hold 든 검(반짝임) · break 칼끝부터 피로 풀림
//   arc    — 혈검 궤적. 0,0 = 몸 가운데, +x 쪽을 벤다. swing1 위 → 아래 · swing2 아래 → 위 · swing3 크게 내려베기
//   veil   — 혈막. 0,0 = 몸 가운데. 여러 겹의 휘어진 방패판. form 굳음 · hold 반복 · hit(+x 쪽이 맞음) 움푹 · 파문 · fold 안으로 접혀 풀림
//   hand   — 혈수 강타의 손. 0,0 = 손목. 손바닥이 아래 · 손끝이 +x. form 손바닥 → 손가락 · open 반복 · clench 주먹 쥐기 · unravel 손끝부터 풀림
//   wave   — 혈류 파동(11월 15일). 0,0 = 파동 중심. 바깥으로 퍼지는 붉은 물결 가장자리 하나(r = 반지름, 땅 비율 0.78 을 넣어 그린다)
//   hook   — 혈쇄 갈고리(11월 15일). 0,0 = 쥔 손(form) · 갈고리 머리 뒤끝(head). +x 로 날아간다. form 손에서 갈고리가 생김 · head 날아가는 머리
//   link   — 사슬 마디 하나. 0,0 = 마디 가운데 · +x 가 사슬 방향. variant 0 둥근 마디 · 1 옆에서 본 마디 · 2 · 3 팽팽한(밝은) 마디
//   drop   — 사슬이 핏방울로 풀린다(마디 하나 자리에서 아래로 떨어진다)
// 외곽선은 C[6] · 가장 밝은 빛은 C[7] 만 쓴다 — 게임이 이 두 색을 따로 떼어(밝은 외곽 시트) 어두운 연마 색에서도 외곽을 밝게 그린다.
// 쓰는 법: pixelfx 저장소 src/fx/nature/blood-form.js 로 복사하고 make-form.mjs 로 뽑는다.
import { fit, hex, clamp, smooth, rand, TAU } from "../../core/index.js";

export const meta = {
  name: "Blood form",
  desc: "Blood gathers into a sword, a shield of curved plates or a giant hand, is used, and runs back into blood.",
  tags: ["blood", "form", "sword", "shield", "hand"],
  size: [160, 160],
  origin: [80, 80],
  duration: 0.4,
  loop: false,
  fps: 30,
  bg: "none",
  options: { palette: ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"], seed: 5, part: "sword", phase: "hold", u: 0, ang: 0 },
};

const lerp = (a, b, k) => a + (b - a) * k;
const ez = (k) => 1 - Math.pow(1 - clamp(k), 3);
// 화면 아래(중력) 쪽을 이 이펙트 안의 좌표로 — 칼은 돌려서 뽑으므로 떨어지는 방울은 이 방향으로 떨어진다
const downOf = (a) => [Math.sin(a), Math.cos(a)];

/* ── 혈검 ───────────────────────────── */
// 11월 15일 사용자 그림을 픽셀 단위로 옮겼다(사용자 "원본 사진 픽셀별로 보고 똑같이"). cut.py 가 그림을 칼 축으로 돌려 길이 80 으로 줄이고
// q.py 가 아래 팔레트로 칸마다 가장 가까운 색을 골랐다. 0~7 은 혈 팔레트(6 · 7 밝은 외곽 — 밝은 외곽 시트로 떨어진다), 8~11 금속 회색, 12~14 노란 빛.
// 게임은 이 시트를 1배로 그린다(한 칸 = 화면 1px). 칼 위 좌표는 쥔 손(HX, HY)이 0, 0 · 칼끝이 +x.
const SPR = [
  "...............7................................................................",
  "..............7b.aa.............................................................",
  "...........ba..9a999b...........................................................",
  "............a9.99..a.....7b.....................................................",
  "..............909.......7ba99ab....7............................................",
  "..............a0199899a99a99199999ab999aaaaabb..................................",
  ".............b.ae98008133233221819a999999999999999aaaaeeaad77...................",
  "...............7.9912229.b633333322223333333434443344eedddddcccba9aab...........",
  "...............6ea.9332344333333333333322222223332232319eeeeeeeea9999adab7......",
  "...............5454332343222223222222222122129999989189988111888191999999119a...",
  "..ba....7b9999981343923288a....666.........................................a9ab.",
  "99181999999aab..a94...39........................................................",
  ".99b7............65..639........................................................",
  "..................6..5e.........................................................",
  "................................................................................"
];
const SPR_PAL = ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8", "#1d0a10", "#544a4f", "#8a7f85", "#c2b8bd", "#ffd36a", "#e0a23a", "#8a6a20"];
const SPR_C = SPR_PAL.map(hex);
const HX = 9, HY = 10;                                   // 쥔 손 — 손잡이 가운데
const GUARD = 23;                                        // 이 칸(x)부터 칼날
const SW = SPR[0].length, SH = SPR.length;
const BL = SW - GUARD;                                   // 칼날 길이(칸)
const TOP = Array.from({ length: SW }, (_, x) => { for (let y = 0; y < SH; y++) if (SPR[y][x] !== ".") return y; return -1; });
const HILT_R = Math.max(...SPR.flatMap((r, y) => [...r].map((ch, x) => (ch !== "." && x < GUARD ? Math.hypot(x - HX, y - HY) : 0))));
// hiltK — 손잡이 · 가드가 손에서 바깥으로 이만큼 생겼다 · bladeK — 칼날이 가드에서 이만큼 뻗었다 · cut — 칼끝부터 이만큼 사라졌다
function sword(p, C, hiltK, bladeK, shine, cut = 0) {
  const reach = BL * bladeK * (1 - cut);
  const col = (i) => (i === 6 ? C[6] : i === 7 ? C[7] : SPR_C[i]);
  p.shade(-HX - 1, -HY - 1, SW - HX + 1, SH - HY + 1, (lx, ly) => {
    const x = Math.floor(lx + HX), y = Math.floor(ly + HY);
    if (x < 0 || y < 0 || x >= SW || y >= SH) return 0;
    const ch = SPR[y][x];
    if (ch === ".") return 0;
    if (x < GUARD) { if (Math.hypot(x - HX, y - HY) > HILT_R * hiltK) return 0; }
    else if (x - GUARD >= reach) return 0;
    return col(parseInt(ch, 16));
  });
  if (shine >= 0 && shine <= 1 && reach >= BL) {         // 칼등을 따라 흐르는 빛 두 칸
    for (let k = 0; k < 2; k++) {
      const x = GUARD + 2 + Math.floor((BL - 6) * shine) + k;
      if (TOP[x] >= 0) p.px(x - HX, TOP[x] - HY, C[7]);
    }
  }
}
function swordForm(p, C, u, o) {
  // 0~0.4 피가 손으로 모인다 → 0.25~0.6 손잡이 · 가드 → 0.5~1 칼날이 뻗는다(1배로 그리므로 알갱이는 2칸)
  const R = 36;
  for (let i = 0; i < 18; i++) {
    const a0 = rand(o.seed, i, 1) * TAU, d0 = R * (0.7 + 0.5 * rand(o.seed, i, 2)), k = ez((u - rand(o.seed, i, 3) * 0.12) / 0.38);
    if (k >= 1 || u < rand(o.seed, i, 3) * 0.12) continue;
    const sw = 1.6 * (1 - k), a = a0 + sw, d = d0 * (1 - k);
    p.rect(Math.cos(a) * d, Math.sin(a) * d, 2, 2, i % 3 ? C[4] : C[5]);
    const kb = Math.max(0, k - 0.12), ab = a0 + 1.6 * (1 - kb), db = d0 * (1 - kb);
    p.rect(Math.cos(ab) * db, Math.sin(ab) * db, 2, 2, C[3]);
  }
  const pool = smooth(0.08, 0.35, u) * (1 - smooth(0.45, 0.7, u));
  if (pool > 0) { p.circle(0, 0, 2 + 4.4 * pool, C[3]); p.circle(0, 0, 2.4 * pool, C[5]); }
  const hk = ez((u - 0.22) / 0.35), bk = ez((u - 0.5) / 0.5);
  sword(p, C, hk, bk, -1);
  if (bk > 0 && bk < 1) {                              // 자라나는 칼끝 — 피가 튄다
    const tx = GUARD - HX + BL * bk;
    p.rect(tx + 1, -4, 2, 2, C[5]); p.rect(tx + 1, 2, 2, 2, C[5]); p.rect(tx + 3, -1, 2, 2, C[7]);
    p.rect(tx - 4, -6, 2, 2, C[4]); p.rect(tx - 6, 4, 2, 2, C[4]);
  }
}
function swordBreak(p, C, u, o) {
  // 칼끝부터 피로 풀린다 — 0~0.6 칼날이 줄고 · 0.45~0.85 손잡이가 녹아 흘러내린다. 떨어진 방울은 화면 아래로
  const cut = ez(u / 0.6), hk = 1 - ez((u - 0.45) / 0.4);
  if (u < 0.85) sword(p, C, hk, 1, -1, cut);
  const [gx, gy] = downOf(o.ang || 0);
  for (let i = 0; i < 20; i++) {
    const born = rand(o.seed, i, 5) * 0.55, age = u - born;
    if (age <= 0 || age > 0.5) continue;
    const at = born < 0.6 ? GUARD - HX + BL * (1 - ez(born / 0.6)) : -6;   // 이미 사라진 칼 자리에서
    const side = (rand(o.seed, i, 6) - 0.5) * 2, sp = 20 + 28 * rand(o.seed, i, 7), fall = 140 * age * age;
    const x = at + side * 4 + side * sp * age * 0.5 + gx * fall, y = side * sp * age + gy * fall;
    p.rect(x, y, 2, 2, age < 0.18 ? C[5] : age < 0.35 ? C[4] : C[3]);
    if (age < 0.25) p.rect(x - gx * 2, y - gy * 2, 2, 2, C[3]);
  }
}

/* ── 혈검 궤적 ───────────────────────── */
// 초승달 — 머리(지금 칼끝)가 a0 → a1 로 지나가고 꼬리가 뒤따라 옅어진다. 바깥 테두리는 밝게, 바깥으로 핏방울이 튄다
function crescent(p, C, R, W, a0, a1, u, tailLen, o, big) {
  const head = lerp(a0, a1, ez(u / 0.7)), tail = lerp(a0, a1, ez((u - tailLen) / 0.7));
  if (u > 1) return;
  const lo = Math.min(head, tail), hi = Math.max(head, tail);
  if (hi - lo < 0.02) return;
  const fade = 1 - smooth(0.7, 1, u);
  p.shade(-R - 2, -R - 2, R + 2, R + 2, (x, y, out) => {
    const d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (a < lo || a > hi) return;
    const s = (a - tail) / (head - tail || 1e-6);      // 0 꼬리 · 1 머리
    const w = W * (0.25 + 0.75 * Math.sin(Math.PI * clamp(s * 0.95 + 0.05))) * (0.4 + 0.6 * fade);
    if (d > R || d < R - w) return;
    const v = (d - (R - w)) / w;                       // 0 안 · 1 바깥
    if (v > 0.82) return C[s > 0.85 ? 7 : 6];
    if (v > 0.55) return C[s > 0.6 ? 5 : 4];
    if (v > 0.25) return C[s > 0.4 ? 4 : 3];
    return s > 0.5 ? C[3] : C[2];
  });
  // 바깥으로 튀는 피
  const n = big ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const at = lerp(a0, a1, rand(o.seed, i, 31)), born = clamp((at - a0) / (a1 - a0 || 1e-6)) * 0.55;
    const age = u - born;
    if (age <= 0 || age > 0.45) continue;
    const r = R + 2 + (8 + 10 * rand(o.seed, i, 32)) * age / 0.45 * (big ? 1.4 : 1);
    const x = Math.cos(at) * r, y = Math.sin(at) * r;
    p.px(x, y, age < 0.15 ? C[6] : age < 0.3 ? C[5] : C[3]);
    if (big && age < 0.2) p.px(x + Math.cos(at), y + Math.sin(at), C[4]);
  }
}
function arcFx(p, C, u, o) {
  const ph = o.phase;
  if (ph === "swing1") crescent(p, C, 46, 12, -1.25, 1.05, u, 0.32, o, false);
  else if (ph === "swing2") crescent(p, C, 44, 11, 1.1, -1.2, u, 0.32, o, false);   // 거꾸로 — 아래에서 위로
  else crescent(p, C, 50, 17, -2.2, 1.35, u, 0.4, o, true);   // swing3 — 머리 뒤에서 앞으로 크게 내려벤다
}

/* ── 혈막 ───────────────────────────── */
const VR = 34, VY = 0.86, PLATES = 6;
// 판 하나 — 가운데 각 c, 폭 span, 반지름 r, 두께 w. dent(0~1)면 가운데가 안으로 들어간다
function plate(p, C, c, span, r, w, dent, lit) {
  if (span <= 0.01 || r <= 1) return;
  p.shade(-r - 3, -r * VY - 3, r + 3, r * VY + 3, (x, y) => {
    const ny = y / VY, d = Math.hypot(x, ny), a = Math.atan2(ny, x);
    let da = a - c; da -= Math.round(da / TAU) * TAU;
    if (Math.abs(da) > span / 2) return;
    const s = da / (span / 2);                          // -1 ~ 1
    const rr = r - dent * 11 * Math.cos(s * Math.PI / 2) ** 2 + 1.2 * (1 - s * s);   // 휘어진 판 · 움푹
    const ww = w * (0.55 + 0.45 * Math.cos(s * Math.PI / 2));
    if (d > rr || d < rr - ww) return;
    const v = (d - (rr - ww)) / ww;
    if (v > 0.8 || Math.abs(s) > 0.88) return lit && v > 0.8 ? C[7] : C[6];   // 바깥 · 양끝 테두리
    if (v < 0.22) return C[1];                          // 안쪽 가장자리 — 두께가 보이게 어둡게
    if (v < 0.45) return lit ? C[4] : C[2];
    if (v > 0.62 && s < -0.1 && s > -0.7) return lit ? C[7] : C[5];   // 휘어진 면의 빛 한 줄
    return lit ? C[5] : C[3];
  });
}
function veilFx(p, C, u, o) {
  const ph = o.phase, gap = 0.22, span = TAU / PLATES - gap;
  let grow = 1, fold = 0, dent = 0, wave = -1, rot = 0;
  if (ph === "form") grow = ez((u - 0.25) / 0.6);
  if (ph === "hold") rot = u * (TAU / PLATES);          // 안쪽 겹이 천천히 돈다(한 바퀴 = 판 한 칸 → 이음매 없음)
  if (ph === "hit") { dent = Math.sin(Math.PI * clamp(u / 0.7)); wave = u; }
  if (ph === "fold") fold = ez(u / 0.8);
  // 모여드는 피(form)
  if (ph === "form") for (let i = 0; i < 22; i++) {
    const a0 = rand(o.seed, i, 41) * TAU, k = ez((u - rand(o.seed, i, 42) * 0.2) / 0.45);
    if (k <= 0 || k >= 1) continue;
    const d = VR * (1.8 - 0.8 * k), a = a0 - 0.8 * k;
    p.px(Math.cos(a) * d, Math.sin(a) * d * VY, i % 2 ? C[5] : C[4]);
  }
  // 안쪽 겹(뒤) → 바깥 겹(앞)
  for (let layer = 0; layer < 2; layer++) {
    const r0 = layer ? VR : VR - 8, w = layer ? 8 : 6, off = layer ? 0 : span / 2 + gap / 2 + rot;
    for (let i = 0; i < PLATES; i++) {
      let c = off + i * (TAU / PLATES) - Math.PI / 2;
      let sp = span * grow * (layer ? 1 : 0.8), r = r0 * (0.75 + 0.25 * grow);
      if (fold > 0) { sp *= 1 - fold; r *= 1 - 0.75 * fold; c += fold * 1.4 * (layer ? 1 : -1); }   // 안으로 접히며 돈다
      let da = c - (o.hitA || 0); da -= Math.round(da / TAU) * TAU;   // 맞은 쪽(hitA)에 가까운 판
      const near = Math.max(0, Math.cos(da));
      const dd = layer ? dent * near ** 6 : dent * 0.4 * near ** 6;
      // 파문 — 맞은 자리에서 양쪽으로 밝은 빛이 판을 따라 퍼진다
      const lit = wave >= 0 && Math.abs(Math.abs(da) - wave * Math.PI * 1.1) < 0.45;
      plate(p, C, c, sp, r, w, dd, lit || (ph === "form" && grow > 0.9 && u < 0.95));
    }
  }
  if (ph === "hit" && u < 0.5) {                        // 맞은 자리 — 바깥으로 튀는 피
    for (let i = 0; i < 8; i++) {
      const a = (o.hitA || 0) + (rand(o.seed, i, 51) - 0.5) * 1.6, d = VR + 2 + 14 * (u / 0.5) * (0.5 + rand(o.seed, i, 52));
      p.px(Math.cos(a) * d, Math.sin(a) * d * VY, u < 0.2 ? C[7] : C[5]);
    }
  }
  if (fold > 0.5) {                                     // 접힌 판이 피 방울로 풀린다
    for (let i = 0; i < 14; i++) {
      const a = rand(o.seed, i, 61) * TAU, k = (fold - 0.5) / 0.5, d = VR * 0.25 * (1 - k) + 2;
      p.px(Math.cos(a) * d, Math.sin(a) * d * VY + 18 * k * k * rand(o.seed, i, 62), k < 0.6 ? C[5] : C[3]);
    }
  }
}

/* ── 혈수 강타의 손 ─────────────────────── */
// 손등이 위 · 손끝이 +x(오른쪽 아래). 손가락 마디 둘 — curl(0 편 손 ~ 1 주먹)
const FINGERS = [[-10, 10, 1.0], [-3.5, 13, 1.15], [3, 12, 1.1], [9, 10, 0.9]];   // 손가락 뿌리 x · 길이 · 굵기 배율
function hand(p, C, palmK, fingK, curl, gone, o) {
  // gone — 손끝부터 이만큼(0~1) 풀렸다
  if (palmK <= 0) return;
  const pw = 15 * palmK, ph = 11 * palmK, cy = -2;
  const drawFinger = (bx, len, wk, pad, col, colTip) => {
    // 손등에서 아래로 뻗은 손가락 — curl 이면 안쪽(-x)으로 말려 들어간다
    const L = len * fingK * (1 - 0.8 * curl);            // 오므릴수록 손가락이 손바닥 밑으로 말려 들어가 짧아 보인다
    if (L < 0.8) return;
    const a1 = Math.PI / 2 - 0.35 + curl * 0.5, a2 = a1 + curl * 1.2;
    const m1 = L * 0.55, m2 = L * 0.45;
    const x0 = bx, y0 = cy + ph * 0.7;
    const x1 = x0 + Math.cos(a1) * m1, y1 = y0 + Math.sin(a1) * m1, x2 = x1 + Math.cos(a2) * m2, y2 = y1 + Math.sin(a2) * m2;
    const cutK = clamp(gone * 1.6);
    const ex = lerp(x2, x0, cutK), ey = lerp(y2, y0, cutK);
    if (cutK >= 1) return;
    const r = 2.1 * wk + pad;
    if (cutK < 0.45) { p.beam(x0, y0, x1, y1, r * 2, col); p.beam(x1, y1, ex, ey, r * 1.8, col); }
    else p.beam(x0, y0, ex, ey, r * 2, col);
    if (colTip) p.px(ex, ey, colTip);
  };
  const thumb = (pad, col) => {
    const L = 9 * fingK, a = Math.PI * 0.85 - curl * 2.3;   // 주먹이면 엄지가 손가락 앞을 가로지른다
    if (L < 0.8 || gone > 0.5) return;
    p.beam(-pw * 0.55, cy + 2 + curl * 4, -pw * 0.55 + Math.cos(a) * L, cy + 2 + curl * 4 + Math.sin(a) * L, (2.4 + pad) * 2, col);
  };
  // 주먹 — 오므릴수록 손바닥 아래 앞쪽에 둥근 마디 넷과 말려 들어간 손가락 끝 줄이 생긴다
  const kOf = (i) => clamp((curl - 0.2) / 0.6) * clamp(1 - gone * 1.8 + i * 0.12);
  const knuckles = (pad, col, col2) => {
    if (curl < 0.2) return;
    FINGERS.forEach(([bx], i) => { const kk = kOf(i); if (kk > 0.05) p.circle(bx * palmK + 1.5, cy + ph * 1.05 + 2, 2.8 * kk + pad, col2); });   // 말린 손가락 끝(아래 줄)
    FINGERS.forEach(([bx], i) => { const kk = kOf(i); if (kk > 0.05) p.circle(bx * palmK + 0.5, cy + ph * 0.7, 3.7 * kk + pad, col); });            // 마디(위 줄)
  };
  const palmGone = clamp((gone - 0.4) / 0.6);
  // 1) 밝은 외곽(조금 크게) 2) 몸
  for (const pass of [0, 1]) {
    const pad = pass ? 0 : 1, col = pass ? C[4] : C[6];
    FINGERS.forEach(([bx, len, wk]) => drawFinger(bx * palmK, len, wk, pad, col, pass ? C[5] : 0));
    if (palmGone < 1) p.ellipse(0, cy, pw * (1 - 0.5 * palmGone) + pad, ph * (1 - 0.6 * palmGone) + pad, col);
    knuckles(pad, col, pass ? C[3] : C[6]);
    thumb(pad, col);
    // 손목 — 몸에서 이어진 피 줄기
    if (palmGone < 0.6) p.beam(-pw - 6, cy - 6, -pw * 0.6, cy - 2, (5 + pad) * 2 * (1 - palmGone), col);
  }
  if (palmGone < 1) {
    // 손등 위쪽 빛(풀리기 전에만)
    if (palmGone < 0.3) p.line(-pw * 0.6, cy - ph * 0.6, pw * 0.5, cy - ph * 0.8, C[5]);
    if (curl > 0.6 && gone < 0.3) FINGERS.forEach(([bx], i) => {   // 마디 사이 골 · 마디 빛
      const x = bx * palmK + 0.5, y = cy + ph * 0.7;
      if (i) p.line(x - 3.4, y - 1, x - 3.4, y + 3, C[1]);
      p.px(x - 1, y - 2, C[7]); p.px(x, y - 2, C[6]);
    });
  }
}
function handFx(p, C, u, o) {
  const ph = o.phase;
  if (ph === "form") {                                  // 손바닥 먼저(0~0.5) → 손가락(0.4~1)
    for (let i = 0; i < 20; i++) {
      const a0 = rand(o.seed, i, 71) * TAU, k = ez((u - rand(o.seed, i, 72) * 0.15) / 0.5);
      if (k <= 0 || k >= 1) continue;
      const d = 34 * (1 - k), a = a0 + 1.2 * k;
      p.px(Math.cos(a) * d, Math.sin(a) * d - 2, i % 3 ? C[4] : C[6]);
    }
    hand(p, C, ez(u / 0.5), ez((u - 0.4) / 0.6), 0, 0, o);
  } else if (ph === "open") {                           // 편 손 — 손끝에서 피가 맺혀 떨어진다(반복)
    const breath = 0.06 * Math.sin(u * TAU);
    hand(p, C, 1, 1, breath + 0.06, 0, o);
    for (let i = 0; i < 3; i++) {
      const k = (u + i / 3) % 1, x = -6 + i * 7 + 2, y = 14 + k * 10;
      p.px(x, y, k < 0.5 ? C[5] : C[3]);
    }
  } else if (ph === "clench") hand(p, C, 1, 1, ez(u), 0, o);   // 손가락을 오므려 주먹
  else if (ph === "unravel") {                          // 손끝부터 풀려 피가 흘러내린다
    hand(p, C, 1, 1, 1, ez(u / 0.85), o);
    for (let i = 0; i < 22; i++) {
      const born = rand(o.seed, i, 81) * 0.6, age = u - born;
      if (age <= 0 || age > 0.45) continue;
      const x = 12 - 26 * (born / 0.6) + (rand(o.seed, i, 82) - 0.5) * 10, y = 6 + 60 * age * age + age * 10;
      p.px(x, y, age < 0.15 ? C[6] : age < 0.3 ? C[5] : C[3]);
    }
  }
}


/* ── 혈류 파동(11월 15일) ─────────────────── */
// 반지름 r 의 물결 가장자리 하나 — 바깥 1칸은 밝은 외곽(C6 · 위쪽은 C7), 안으로 갈수록 어두운 꼬리. 가장자리 밖으로 작은 피 방울이 튄다.
// 시트는 반지름마다 한 칸이라, 게임이 지금 판정 반경에 가장 가까운 칸을 고르면 보이는 가장자리 = 판정 가장자리(2배 그림이면 ±2px)
const WVY = 0.78;
function waveFx(p, C, o) {
  const r = o.r, tail = Math.min(7, 2 + r * 0.12);
  p.shade(-r - 6, -(r + 6) * WVY, r + 6, (r + 6) * WVY, (x, y) => {
    const d = Math.hypot(x, y / WVY), v = r - d;
    if (v < 0 || v > 3 + tail) return;
    const a = Math.atan2(y / WVY, x), top = Math.sin(a) < -0.35 && Math.cos(a) < 0.5;   // 왼쪽 위 — 빛을 받는 쪽
    if (v < 1.4) return top ? C[7] : C[6];
    if (v < 2.4) return C[5];
    if (v < 3) return C[4];
    const k = (v - 3) / tail;                             // 0 가장자리 쪽 · 1 안쪽 끝
    if (k < 0.4) return C[3];
    if (k < 0.75) return ((Math.floor(x) + Math.floor(y)) & 1) ? C[3] : 0;   // 안쪽 꼬리는 듬성듬성 — 땅 · 적 공격 예고가 비친다
    return ((Math.floor(x) + 2 * Math.floor(y)) % 4 === 0) ? C[2] : 0;
  });
  // 가장자리 밖으로 튀는 방울 — 반지름에 따라 깜빡이며 바뀐다(같은 r 은 늘 같은 그림)
  const n = Math.min(18, 6 + Math.floor(r / 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(o.seed, i, 91) * 0.3, on = Math.floor(r / 4 + i * 1.7) % 3;
    if (on === 0) continue;
    const d = r + 2 + on + 2 * rand(o.seed, i, 92);
    const x = Math.cos(a) * d, y = Math.sin(a) * d * WVY;
    p.rect(x, y, 2, 2, on === 1 ? C[7] : C[6]);            // 2칸 방울 — 2배로 그리면 4px
    if (on === 2) p.px(x - Math.cos(a) * 2, y - Math.sin(a) * 2 * WVY, C[5]);
  }
}

/* ── 혈쇄 갈고리(11월 15일) ─────────────────── */
// 갈고리 머리 — 0,0 이 뒤끝(사슬이 이어지는 고리), +x 로 자루 → 끝에서 낫처럼 휘어 아래 뒤로 돌아오는 날 · 뾰족한 끝
// 날은 어긋난 두 원의 사이(초승달)라 양끝이 저절로 가늘어진다
const HK_O = [15, 3, 8.5], HK_I = [12.6, 5.2, 6.6];      // 바깥 원 · 안쪽 원 [x, y, r]
function hookIn(x, y, pad, k) {
  // 자루 — 뒤끝부터 k 만큼
  const shaft = 3 + 11 * Math.min(1, k / 0.45);
  if (x >= -pad && x <= shaft + pad && Math.abs(y) <= 1.3 + pad) return 1;
  if (k <= 0.45) return 0;
  const a = Math.atan2(y - HK_O[1], x - HK_O[0]), lim = -1.95 + ((k - 0.45) / 0.55) * (2.35 + 1.95);   // 날이 위에서부터 끝까지 자란다
  if (a < -1.95 || a > lim) return 0;
  const dO = Math.hypot(x - HK_O[0], y - HK_O[1]), dI = Math.hypot(x - HK_I[0], y - HK_I[1]);
  return dO <= HK_O[2] + pad && dI >= HK_I[2] - pad ? 2 : 0;
}
function hookHead(p, C, k, glint) {
  // k — 자루 뒤끝부터 이만큼(0~1) 생겼다
  p.shade(-4, -8, 26, 16, (x, y) => {
    const X = x + 0.5, Y = y + 0.5, w = hookIn(X, Y, 0, k);
    if (!w) return hookIn(X, Y, 1, k) ? C[6] : undefined;   // 밝은 외곽
    if (w === 1) return Y < -0.2 ? C[5] : C[3];             // 자루 — 윗면 빛
    const dO = HK_O[2] - Math.hypot(X - HK_O[0], Y - HK_O[1]);
    return dO < 1.2 ? C[5] : dO < 2.4 ? C[4] : C[2];          // 날 — 바깥 날은 밝게 · 안쪽은 어둡게
  });
  // 뒤끝 고리
  p.shade(-5, -3, 2, 3, (x, y) => { const d = Math.hypot(x + 1.5, y + 0.5); if (d > 2.8) return; if (d > 1.9) return C[6]; if (d > 0.9) return C[4]; });
  if (k >= 1) {
    const ta = 2.35, tx = HK_O[0] + Math.cos(ta) * (HK_O[2] - 0.8), ty = HK_O[1] + Math.sin(ta) * (HK_O[2] - 0.8);
    p.px(tx, ty, C[7]);                                    // 뾰족한 끝이 빛난다
    if (glint >= 0) { const g = Math.floor(glint * 12); p.px(1 + g, -1, C[7]); }   // 자루를 따라 흐르는 빛
  }
}
function hookFx(p, C, u, o) {
  if (o.phase === "form") {
    // 0~0.45 피가 손 앞으로 모인다 → 0.3~1 자루부터 날 끝까지 굳는다
    for (let i = 0; i < 14; i++) {
      const a0 = rand(o.seed, i, 101) * TAU, k = ez((u - rand(o.seed, i, 102) * 0.1) / 0.45);
      if (k <= 0 || k >= 1) continue;
      const d = 18 * (1 - k), a = a0 + 1.4 * (1 - k);
      p.rect(8 + Math.cos(a) * d, Math.sin(a) * d, 2, 2, i % 3 ? C[4] : C[6]);
    }
    hookHead(p, C, ez((u - 0.3) / 0.7), -1);
  } else hookHead(p, C, 1, u);                           // head — 날아가는 머리(빛이 자루를 따라 흐른다)
}
// 사슬 마디 — 둥근 마디(앞에서) · 납작한 마디(옆에서)가 번갈아 이어진다. 팽팽하면(2 · 3) 몸이 밝아진다
function linkFx(p, C, o) {
  const v = o.variant | 0, taut = v >= 2, body = taut ? C[5] : C[3], hi = taut ? C[7] : C[5];
  if (v % 2 === 0) {
    p.shade(-5, -4, 5, 4, (x, y) => {
      const X = x + 0.5, Y = y + 0.5, d = Math.hypot(X / 4.2, Y / 3);
      if (d > 1.12) return; if (d > 0.86) return C[6];
      if (Math.abs(X) < 2.2 && Math.abs(Y) < 0.9) return;   // 가운데 구멍
      return Y < 0 ? hi : body;
    });
  } else {
    p.shade(-4, -2, 4, 2, (x, y) => {
      const ax = Math.abs(x + 0.5), ay = Math.abs(y + 0.5);
      if (ax > 4 || ay > 1.6) return; if (ax > 3.2 || ay > 1.1) return C[6]; return y < 0 ? hi : body;
    });
  }
}
// 마디 하나가 핏방울로 풀린다 — 3~4 방울이 흩어져 아래로 떨어진다(돌리지 않고 뽑는다)
function dropFx(p, C, u, o) {
  if (u < 0.25) linkFx(p, C, { variant: 0 });
  for (let i = 0; i < 4; i++) {
    const age = u - 0.1 - i * 0.05; if (age <= 0) continue;
    const vx = (rand(o.seed, i, 111) - 0.5) * 16, x = vx * age, y = -4 * age + 30 * age * age * 2;
    if (age > 0.75) continue;
    p.px(x, y, age < 0.25 ? C[6] : age < 0.5 ? C[5] : C[3]);
    if (age < 0.4) p.px(x, y - 1, C[4]);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), u = o.u;
  if (o.part === "sword") {
    if (o.phase === "form") swordForm(p, C, u, o);
    else if (o.phase === "break") swordBreak(p, C, u, o);
    else sword(p, C, 1, 1, u);
  } else if (o.part === "arc") arcFx(p, C, u, o);
  else if (o.part === "veil") veilFx(p, C, u, o);
  else if (o.part === "hand") handFx(p, C, u, o);
  else if (o.part === "wave") waveFx(p, C, o);
  else if (o.part === "hook") hookFx(p, C, u, o);
  else if (o.part === "link") linkFx(p, C, o);
  else if (o.part === "drop") dropFx(p, C, u, o);
}
