// 공허 무기 · 차원의 지배자 4세트 연출 시트 뽑기(11월 7일, 게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/void-weapon/ 에 넣는다
// — world-boss/make-void.mjs 와 같은 방식. 공허 빛깔(검보라 → 연보라, 흰색은 가운데에만). 월드보스 공격 시트와 겹치지 않게 다른 이펙트 · 씨앗을 쓴다
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
const V7 = ["#150b2b", "#2a1458", "#4a2a8a", "#6a3fc2", "#a077f0", "#d3b8ff", "#f4ebff"];
const V8 = ["#07030f", ...V7];
const V5 = ["#2a1458", "#6a3fc2", "#a077f0", "#d3b8ff", "#f4ebff"];
const SPARK = ["#f4ebff", "#d3b8ff", "#a077f0", "#6a3fc2"];
const LIST = [
  // 대검 차원 절단 — 둘레를 X 자로 가르는 공간 참격(6번 돌려 그린다) · 마지막 공간 폭발
  { name: "vw_cut", id: "melee/double-slash", from: 0.08, to: 0.8, n: 12, opts: { palette: V7, sparks: SPARK, seed: 4 } },
  { name: "vw_burst", id: "explosions/plasma-explosion", from: 0.03, to: 1.0, n: 10, opts: { palette: V7, accent: V5, seed: 11 } },
  // 장궁 차원 폭우 — 하늘의 일식 같은 균열(반복) · 떨어지는 공허 화살(반복) · 착탄
  { name: "vw_sky", id: "shadow/eclipse", from: 0, to: 4, n: 12, loop: 1, opts: { palette: V8, pearl: ["#4a2a8a", "#a077f0", "#d3b8ff", "#f4ebff"], seed: 6 } },
  { name: "vw_arrow", id: "projectiles/arrow", from: 0, to: 0.6, n: 6, loop: 1, opts: { palette: ["#4a2a8a", "#a077f0", "#d3b8ff", "#f4ebff"], wood: ["#150b2b", "#2a1458", "#4a2a8a", "#6a3fc2"], steel: ["#2a1458", "#6a3fc2", "#a077f0", "#f4ebff"], wind: "#a077f0", seed: 5 } },
  { name: "vw_hit", id: "impacts/crit-hit", from: 0, to: 0.9, n: 10, opts: { palette: V8, height: 4, aim: 0, seed: 8 } },
  // 지팡이 특이점 붕괴 — 소용돌이가 감겨 드는 검은 구(반복) · 마지막 붕괴
  { name: "vw_hole", id: "shadow/void-orb", from: 0, to: 3.2, n: 12, loop: 1, opts: { palette: V8, seed: 7 } },
  { name: "vw_crush", id: "explosions/implosion", from: 0, to: 1.65, n: 12, opts: { palette: V7, seed: 6 } },
  // 패시브 — 대검 공간 참격 · 지팡이 중력 폭발(장궁은 vw_arrow · vw_hit 을 함께 쓴다)
  { name: "vw_spin", id: "melee/spin-slash", from: 0.05, to: 0.8, n: 10, opts: { palette: V7, sparks: SPARK, radius: 46, seed: 9 } },
  // 차원의 지배자 4세트 — 스킬이 맞은 자리의 공간 폭발
  { name: "vw_set", id: "arcane/mana-burst", from: 0.4, to: 1.25, n: 10, opts: { palette: V7, seed: 13 } },
];
const man = {};
for (const s of LIST.filter((s) => s.name.startsWith(ONLY))) {
  const fx = await loadEffect(s.id);
  const r = renderFrames(fx, { fps: 30, actor: false, options: s.opts });
  const pick = [];
  for (let i = 0; i < s.n; i++) {
    const t = s.from + (s.loop ? i / s.n : i / (s.n - 1)) * (s.to - s.from);
    pick.push(r.frames[Math.min(r.n - 1, Math.round(t * 30))]);
  }
  const { w, h } = r;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  pick.forEach((f) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f.clear[(y * w + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(h - 1, y1 + 1);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, n = pick.length;
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * ch) / cw)))), rows = Math.ceil(n / cols);
  const img = canvas(cols * cw, rows * ch, [0, 0, 0, 0]);
  pick.forEach((f, i) => {
    const buf = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) buf.set(f.clear.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * cw * 4);
    img.paste(buf, cw, ch, (i % cols) * cw, Math.floor(i / cols) * ch);
  });
  save(`${OUT}/${s.name}.png`, img.png());
  man[s.name] = { src: s.id, w: cw, h: ch, cols, n, loop: s.loop ? 1 : 0, px: fx.meta.origin[0] - x0, py: fx.meta.origin[1] - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(man));
