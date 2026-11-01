// 월드보스 연출 시트 뽑기(게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         strike_m · strike_t · acid 는 post.py 로 어두운 그늘 · 주황 불티를 걷어 낸다(밝은 바닥에서 검댕처럼 보였다)
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/world-boss/ 에 넣는다
// — pixelfx(MIT) 이펙트를 보스 빛깔(톤다운 · 파스텔)로 렌더하고, from~to 초 구간에서 n 칸을 고르게 뽑아 투명 여백을 걷어 낸다
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
// 보스 빛깔 — 어두운 것 → 밝은 것. 흰색은 가장 뜨거운 가운데에만 둔다
const FIRE = ["#2e1814", "#5a2620", "#8e3c2c", "#bb5a3e", "#d9805a", "#e9a882", "#f3cfae", "#faead8", "#fff8ee"];
const ACID = ["#121810", "#1e2a18", "#2e4024", "#466034", "#6a8a4e", "#93b274", "#c0d6a2", "#ecf4dc"];
const VOLT_M = ["#0e1620", "#1a2a3a", "#2a465c", "#426c86", "#6894ac", "#98bccc", "#cbe2ea", "#f4fafc"];
const VOLT_T = ["#14122a", "#232046", "#36346a", "#545290", "#7c7ab6", "#a8a6d6", "#d2d0ee", "#f6f5ff"];
const GOLD = ["#2a2014", "#544024", "#86683a", "#b69456", "#d8ba7e", "#ecd8a8", "#f8efd4", "#fffbf2"];
const LIST = [
  // 드래곤 — 숨결(반복) · 운석(경고 동안 떨어지고 맞는 순간 터진다)
  { name: "breath", id: "fire/fire-breath", from: 0, to: 1.5, n: 12, loop: 1, opts: { palette: FIRE } },
  { name: "meteor", id: "fire/meteor", from: 0, to: 1.7, n: 22, opts: { palette: FIRE, stone: "#4e4258", rock: ["#141016", "#2a2228", "#463a40", "#6a5a5c"] } },
  // 뱀 — 독 튀김 · 남는 독 웅덩이(반복)
  { name: "acid", id: "nature/acid-splash", from: 0.2, to: 1.6, n: 14, opts: { palette: ACID } },
  { name: "puddle", id: "nature/toxic-puddle", from: 0, to: 4, n: 16, loop: 1, opts: { palette: ["#08090a", "#0e120e", "#161c14", "#20281a", "#2e3a22", "#4f6a3a", "#8fb26a", "#d6e8b4"], sheen: ["#2a2240", "#4c4070", "#3e6a66", "#92bdb2"] } },
  // 기계 · 뇌조 — 바닥 문양이 차오르다(경고) 낙뢰가 꽂힌다(맞는 순간)
  { name: "strike_m", id: "lightning/lightning-strike", from: 0, to: 1.9, n: 20, opts: { palette: VOLT_M, sparks: ["#f4fafc", "#d4ecf4", "#a6d2e2", "#6aa6c0"] } },
  { name: "strike_t", id: "lightning/lightning-strike", from: 0, to: 1.9, n: 20, opts: { palette: VOLT_T, sparks: ["#f8f6ff", "#dcdaf6", "#b4b0e6", "#8682c2"], seed: 8 } },
  { name: "feather", id: "holy/feather-burst", from: 0.5, to: 2.1, n: 12, opts: { palette: VOLT_T, glow: "#b4b0e6" } },
  // 공통 — 합동 공격 성공 · 기절 별 · 쓰러질 때
  { name: "break", id: "holy/smite", from: 0.4, to: 1.7, n: 14, opts: { palette: GOLD, stone: "#5a5066" } },
  { name: "stun", id: "status/stunned", from: 0, to: 2, n: 16, loop: 1, opts: { palette: ["#3a2c18", "#7a5c30", "#b8904e", "#dab878", "#ecd7a0", "#f8eed0", "#fffaf0"], birds: ["#1a1626", "#6a6c98", "#aeb4d8", "#eef0fa"], beak: "#e0a868" } },
  { name: "fall", id: "holy/holy-pillar", from: 0.2, to: 3.0, n: 20, opts: { palette: GOLD, shafts: 7 } },
];
const man = {};
for (const s of LIST) {
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
  man[s.name] = { src: s.id, from: s.from, to: s.to, w: cw, h: ch, cols, n, loop: s.loop ? 1 : 0, px: fx.meta.origin[0] - x0, py: fx.meta.origin[1] - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(man));
