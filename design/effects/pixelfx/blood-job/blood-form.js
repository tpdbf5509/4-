// BLOOD-001 형상화 — 이 게임용으로 새로 쓴 pixelfx 꼴 이펙트(11월 15일, blood-field.js 와 같은 방식).
// 피가 모여 물체가 만들어지고, 쓰고 나면 다시 피로 풀린다. part · phase 옵션으로 여러 장을 뽑는다(make-form.mjs).
//   sword  — 혈검. 손잡이(0,0 = 쥔 손)에서 +x 쪽으로 칼날. form 모임 → 손잡이 → 칼날 · hold 든 검(반짝임) · break 칼끝부터 피로 풀림
//   arc    — 혈검 궤적. 0,0 = 몸 가운데, +x 쪽을 벤다. swing1 위 → 아래 · swing2 아래 → 위 · swing3 크게 내려베기
//   veil   — 혈막. 0,0 = 몸 가운데. 여러 겹의 휘어진 방패판. form 굳음 · hold 반복 · hit(+x 쪽이 맞음) 움푹 · 파문 · fold 안으로 접혀 풀림
//   hand   — 혈수 강타의 손. 0,0 = 손목. 손바닥이 아래 · 손끝이 +x. form 손바닥 → 손가락 · open 반복 · clench 주먹 쥐기 · unravel 손끝부터 풀림
// 외곽선은 C[6] · 가장 밝은 빛은 C[7] 만 쓴다 — 게임이 이 두 색을 따로 떼어(밝은 외곽 시트) 어두운 연마 색에서도 외곽을 밝게 그린다.
// 쓰는 법: pixelfx 저장소 src/fx/nature/blood-form.js 로 복사하고 make-form.mjs 로 뽑는다.
import { fit, clamp, smooth, rand, TAU } from "../../core/index.js";

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
const BL = 19, BW = 2.4;
// 칼날 윤곽 — len 까지(끝은 늘 뾰족하게)
function bladePts(len, pad) {
  const tip = 2 + len, taper = Math.min(len, 7), w = BW + pad;
  return [[1.5 - pad, -w], [Math.max(2, tip - taper), -w * 0.92], [tip + pad * 1.6, 0], [Math.max(2, tip - taper), w * 0.92], [1.5 - pad, w]];
}
function sword(p, C, hiltK, bladeK, shine, cut = 0) {
  // cut — 칼끝부터 이만큼(0~1) 사라졌다(풀리는 중)
  const len = BL * bladeK * (1 - cut);
  if (hiltK > 0) {
    const gl = 6 * hiltK, gh = 6 * hiltK;
    // 손잡이 · 감은 끈
    p.rect(-gl - 0.5, -1.5, gl + 1, 3, C[1]);
    p.rect(-gl, -1, gl, 2, C[2]);
    for (let x = -5; x <= -1; x += 2) if (-x <= gl) p.px(x, 0, C[3]);
    // 가드 — 끝이 뒤로 휘는 피의 가시
    if (gh > 0.5) {
      p.rect(-0.5, -gh - 1, 3, gh * 2 + 2, C[6]);
      p.rect(0.5, -gh, 1, gh * 2, C[3]);
      if (hiltK > 0.7) { p.px(-1, -gh - 1, C[6]); p.px(-1, gh, C[6]); p.px(-2, -gh - 2, C[6]); p.px(-2, gh + 1, C[6]); }
      p.px(1, 0, C[5]);
    }
    // 끝 구슬
    if (hiltK > 0.85) { p.circle(-gl - 2, 0, 2.2, C[6]); p.circle(-gl - 2, 0, 1.2, C[4]); }
  }
  if (len > 0.8) {
    p.poly(bladePts(len, 1), C[6]);                     // 밝은 외곽
    p.poly(bladePts(len, 0), C[4]);
    p.line(3, 0, Math.max(3, 1 + len - 4), 0, C[2]);    // 가운데 홈(검붉다)
    p.line(3, -BW + 1, Math.max(3, len - 3), -1, C[5]); // 윗날 빛
    for (let x = 6; x < len - 3; x += 5) p.px(x, 1, C[3]);   // 아랫날 결
    if (shine >= 0 && shine <= 1) { const x = 3 + (len - 5) * shine; p.px(x, -1, C[7]); p.px(x + 1, -1, C[7]); p.px(x, -2, C[6]); }
    if (cut === 0) p.px(2 + len, 0, C[7]);
  }
}
function swordForm(p, C, u, o) {
  // 0~0.4 피가 손으로 모인다 → 0.25~0.6 손잡이 → 0.5~1 칼날이 뻗는다
  const R = 18;
  for (let i = 0; i < 16; i++) {
    const a0 = rand(o.seed, i, 1) * TAU, d0 = R * (0.7 + 0.5 * rand(o.seed, i, 2)), k = ez((u - rand(o.seed, i, 3) * 0.12) / 0.38);
    if (k >= 1 || u < rand(o.seed, i, 3) * 0.12) continue;
    const sw = 1.6 * (1 - k), a = a0 + sw, d = d0 * (1 - k);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    p.px(x, y, i % 3 ? C[4] : C[5]);
    const kb = Math.max(0, k - 0.12), ab = a0 + 1.6 * (1 - kb), db = d0 * (1 - kb);
    p.px(Math.cos(ab) * db, Math.sin(ab) * db, C[3]);
  }
  const pool = smooth(0.08, 0.35, u) * (1 - smooth(0.45, 0.7, u));
  if (pool > 0) { p.circle(0, 0, 1 + 2.2 * pool, C[3]); p.circle(0, 0, 1.2 * pool, C[5]); }
  const hk = ez((u - 0.22) / 0.35), bk = ez((u - 0.5) / 0.5);
  sword(p, C, hk, bk, -1);
  if (bk > 0 && bk < 1) {                              // 자라나는 칼끝 — 피가 튄다
    const tx = 2 + BL * bk;
    p.px(tx + 1, -2, C[5]); p.px(tx + 1, 2, C[5]); p.px(tx + 2, 0, C[7]);
    p.px(tx - 2, -BW - 2, C[4]); p.px(tx - 3, BW + 2, C[4]);
  }
}
function swordBreak(p, C, u, o) {
  // 칼끝부터 피로 풀린다 — 0~0.6 칼날이 줄고 · 0.45~0.85 손잡이가 녹아 흘러내린다. 떨어진 방울은 화면 아래로
  const cut = ez(u / 0.6), hk = 1 - ez((u - 0.45) / 0.4);
  if (u < 0.85) sword(p, C, hk, 1, -1, cut);
  const [gx, gy] = downOf(o.ang || 0);
  for (let i = 0; i < 18; i++) {
    const born = rand(o.seed, i, 5) * 0.55, age = u - born;
    if (age <= 0 || age > 0.5) continue;
    const at = born < 0.6 ? 2 + BL * (1 - ez(born / 0.6)) : -3;   // 이미 사라진 칼 자리에서
    const side = (rand(o.seed, i, 6) - 0.5) * 2, sp = 10 + 14 * rand(o.seed, i, 7), fall = 70 * age * age;
    const x = at + side * 2 + side * sp * age * 0.5 + gx * fall, y = side * sp * age + gy * fall;
    p.px(x, y, age < 0.18 ? C[5] : age < 0.35 ? C[4] : C[3]);
    if (age < 0.25) p.px(x - gx, y - gy, C[3]);
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

export function draw(p, t, o) {
  const C = fit(o.palette, 8), u = o.u;
  if (o.part === "sword") {
    if (o.phase === "form") swordForm(p, C, u, o);
    else if (o.phase === "break") swordBreak(p, C, u, o);
    else sword(p, C, 1, 1, u);
  } else if (o.part === "arc") arcFx(p, C, u, o);
  else if (o.part === "veil") veilFx(p, C, u, o);
  else if (o.part === "hand") handFx(p, C, u, o);
}
