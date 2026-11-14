import { fit, clamp, smooth, rand, tileNoise, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Blood pool",
  desc: "Seen from above, blood wells out under a target and spreads into an irregular glossy pool with a darker core, a few droplets and a ripple, then dries and fades.",
  tags: ["blood", "pool", "puddle", "ground", "top-down", "gore"],
  size: [80, 48],
  origin: [40, 24],
  duration: 2.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"], seed: 4, radius: 26 },
};

const D = meta.duration, SY = 0.55;

// 가장자리가 울퉁불퉁한 반지름 배율(각도마다)
function rim(th, seed) {
  return 1 + 0.16 * Math.sin(3 * th + seed) + 0.1 * Math.sin(5 * th + seed * 2.3) + 0.06 * Math.sin(9 * th + seed * 4.1);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, ry = R * SY;
  const u = t / D;
  const grow = 1 - Math.pow(1 - clamp(t / 0.5, 0, 1), 3);            // 0.5초 동안 퍼진다
  const dry = smooth(0.55, 1, u);                                       // 뒤로 갈수록 마르고 어두워진다
  const fade = 1 - smooth(0.72, 1, u);                                  // 끝에서 사라진다
  if (fade <= 0) return;
  const spread = 0.35 + 0.65 * grow;
  p.shade(-R - 2, -ry - 2, R + 2, ry + 2, (x, y, out) => {
    const dx = x / R, dy = y / ry, rho = Math.hypot(dx, dy) / spread;
    const th = Math.atan2(dy, dx);
    const edge = rim(th, o.seed);
    const k = rho / edge;                      // 0 가운데, 1 가장자리
    if (k > 1) return;
    const n = tileNoise(x * 0.12, y * 0.2, 0, 0, o.seed);
    if (k > 0.9 + 0.04 * n) return;
    let c;
    if (k > 0.8) c = dry > 0.5 ? C[0] : C[1];          // 가장자리는 어둡고 얇다
    else if (k > 0.45) c = dry > 0.6 ? C[1] : C[2];
    else c = dry > 0.5 ? C[1] : C[2];
    if (k < 0.3) c = dry > 0.5 ? C[0] : C[1];                // 가운데 핵은 짙다
    // 윤기: 위쪽 가장자리 안쪽에 빛이 한 줄
    if (dy < 0 && k > 0.5 && k < 0.72 && n > -0.1 && dry < 0.6) c = C[3];
    out.c = c;
    out.a = fade;
  });
  // 번지는 물결 하나(0.1~0.6초)
  const wt = (t - 0.1) / 0.5;
  if (wt > 0 && wt < 1) {
    const rr = (0.25 + 0.6 * wt) * R;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      if (rand(i, 3) < 0.3) continue;
      p.px(Math.cos(a) * rr * rim(a, o.seed) * spread, Math.sin(a) * rr * rim(a, o.seed) * spread * SY, C[4], (1 - wt) * 0.8 * fade);
    }
  }
  // 튀어 나간 방울
  for (let i = 0; i < 7; i++) {
    const a = rand(i, 11) * TAU, d = (0.7 + 0.45 * rand(i, 12)) * R, at = 0.08 + 0.2 * rand(i, 13);
    if (t < at) continue;
    const g = clamp((t - at) / 0.25, 0, 1);
    const x = Math.cos(a) * d * g, y = Math.sin(a) * d * g * SY;
    p.px(x, y, dry > 0.5 ? C[2] : C[3], fade);
    if (rand(i, 14) > 0.5) p.px(x + 1, y, C[2], fade * 0.8);
  }
  // 반짝임 하나
  if (t > 0.35 && t < 1.1) p.px(-R * 0.22, -ry * 0.28, C[6], 0.9 * fade);
}
