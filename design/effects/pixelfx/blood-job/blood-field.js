// BLOOD-001 혈역 증폭 바닥 — 이 게임용으로 새로 쓴 pixelfx 꼴 이펙트(blood-gun/blood-pool.js 와 같은 방식, 11월 14일).
// 위에서 본 땅이 피로 물들고(open) → 피가 소용돌이 줄기를 따라 가운데(시전자 발밑)로 빨려 든다(loop) → 끝나면 가운데로 말려 사라진다(drain).
// 쓰는 법: pixelfx 저장소 src/fx/nature/blood-field.js 로 복사하고 make.mjs 가 phase 옵션으로 세 번 뽑는다.
import { fit, clamp, smooth, rand, tileNoise, TAU } from "../../core/index.js";

export const meta = {
  name: "Blood field",
  desc: "Seen from above, the ground floods with blood in an uneven pool; spiral rivulets and rings flow inward and are drunk at the centre; on drain it all rushes into the middle.",
  tags: ["blood", "pool", "ground", "top-down", "drain", "absorb"],
  size: [250, 156],
  origin: [125, 78],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"], seed: 7, radius: 117, phase: "loop" },
};

const SY = 0.6, LOOP = 1.2;
const dot = (p, x, y, c, a) => { if (a > 0.3) p.px(Math.round(x), Math.round(y), c); };   // px 는 투명도를 받지 않는다 — 옅은 점은 건너뛴다
const rim = (th, s) => 1 + 0.07 * Math.sin(3 * th + s) + 0.05 * Math.sin(7 * th + s * 2.1) + 0.03 * Math.sin(13 * th + s * 3.7);

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, ry = R * SY, ph = o.phase || "loop";
  // 퍼진 정도(0~1) — open 은 0.6초에 가운데서 바깥으로, drain 은 0.5초에 가운데로
  const cover = ph === "open" ? 1 - Math.pow(1 - clamp(t / 0.6, 0, 1), 2.4) : ph === "drain" ? 1 - smooth(0, 0.5, t) : 1;
  if (cover <= 0.01) return;
  const flow = ph === "drain" ? 3.2 : 1;               // 빨려 드는 빠르기 — 끝날 때는 급히 말려 든다
  const w = (t / LOOP) * TAU * flow;                  // 한 바퀴(LOOP)마다 무늬가 정확히 한 칸 안으로 — 반복 이음매가 없다
  // 핏줄기 — 바깥에서 가운데로 휘어 들어오는 가는 줄기 RIV 개(각도 · 휘는 정도는 씨앗으로)
  const RIV = 7, riv = [];
  for (let i = 0; i < RIV; i++) riv.push({ a: (i + 0.7 * rand(i, 21)) / RIV * TAU, bend: 0.15 + 0.8 * rand(i, 22), len: 0.5 + 0.5 * rand(i, 23), w: 0.8 + 0.8 * rand(i, 24) });
  p.shade(-R - 2, -ry - 2, R + 2, ry + 2, (x, y, out) => {
    const dx = x / R, dy = y / ry, rho = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const n = tileNoise(x * 0.07, y * 0.12, 0, 0, o.seed), n2 = tileNoise(x * 0.21, y * 0.33, 0, 0, o.seed + 9);
    const k = rho / (rim(th, o.seed) * cover);          // 0 가운데, 1 가장자리
    // 바깥쪽은 고르지 않게 — 웅덩이가 군데군데 이어진 모양
    if (k > 1) return;
    if (k > 0.62 && n * 0.5 + n2 * 0.25 < (k - 0.62) * 1.6 - 0.25) return;
    let c = n2 > 0.35 ? C[2] : C[1];                      // 고인 피(어두운 결)
    if (k > 0.9) c = C[1];
    if (k < 0.5 && n2 > 0.1) c = C[2];
    // 윤기 — 위쪽에 짧은 빛 몇 줄
    if (dy < -0.1 && n2 > 0.55 && n > 0.2 && k < 0.85) c = C[3];
    // 핏줄기: 이 점이 줄기 위에 있으면 밝게, 줄기를 따라 안으로 흐르는 맥동
    for (const r of riv) {
      if (rho > r.len * cover * 1.02) continue;
      const want = r.a + r.bend * Math.log(rho + 0.08);
      let d = ((th - want) % TAU + TAU) % TAU; if (d > Math.PI) d = TAU - d;
      if (d * rho * R > r.w * (0.4 + rho)) continue;       // 줄기 굵기(1배 픽셀) — 가운데로 갈수록 가늘다
      const pulse = Math.sin((rho * 7 + w / TAU * 7) * 1.0 + r.a * 3);   // 시간이 갈수록 마루가 안으로
      c = pulse > 0.75 ? C[5] : pulse > 0.2 ? C[4] : C[3];
      break;
    }
    if (k < 0.1) c = k < 0.05 ? C[0] : C[1];               // 가운데 — 피가 빨려 드는 검붉은 구멍
    out.c = c;
    out.a = 1;
  });
  // 가장자리에서 가운데로 끌려 드는 방울(반복과 이음매가 맞게 나이를 LOOP 로 돌린다)
  for (let i = 0; i < 26; i++) {
    const age = ((t * flow / LOOP + rand(i, 3)) % 1 + 1) % 1, a = rand(i, 5) * TAU + age * 1.2;
    const d = (1 - age) * (0.35 + 0.65 * rand(i, 7)) * cover;
    const x = Math.cos(a) * d * R, y = Math.sin(a) * d * ry;
    const c = age > 0.75 ? C[6] : rand(i, 9) > 0.5 ? C[5] : C[4];
    dot(p, x, y, c, 0.9 * Math.sin(Math.PI * age));
    if (rand(i, 11) > 0.6) dot(p, x + Math.cos(a), y + Math.sin(a) * SY, C[3], 0.7 * Math.sin(Math.PI * age));
  }
  // 가운데 빛 — 빨아들일 때마다 맥동
  const beat = 0.5 + 0.5 * Math.sin(w * 2);
  for (let i = -2; i <= 2; i++) dot(p, i, 0, C[6], (0.45 + 0.4 * beat) * (1 - Math.abs(i) * 0.2) * cover);
  dot(p, 0, -1, C[7], 0.6 * beat * cover);
  // 펴질 때 바깥 테두리를 따라 한 번 번쩍
  if (ph === "open" && t < 0.7) {
    const rr = cover;
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU; if (rand(i, 13) < 0.35) continue;
      dot(p, Math.cos(a) * R * rr * rim(a, o.seed), Math.sin(a) * ry * rr * rim(a, o.seed), C[5], 0.8 * (1 - t / 0.7));
    }
  }
}
