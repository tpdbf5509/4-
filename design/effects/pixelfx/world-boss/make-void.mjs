// 공허의 관측자 연출 시트 뽑기(11월 5일, 게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make-void.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/world-boss/ 에 넣는다
// — make.mjs 와 같은 방식. 공허 빛깔(검보라 → 연보라, 흰색은 가운데에만)로 렌더하고 from~to 초 구간에서 n 칸을 고른다
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
const VOID = ["#07030f", "#150b2b", "#2a1458", "#4a2a8a", "#6a3fc2", "#a077f0", "#d3b8ff", "#f4ebff"];
const LIST = [
  // 중력 붕괴 — 경고 동안 장판에서 도는 블랙홀(반복) · 터지는 순간 안으로 무너지는 폭발
  { name: "v_hole", id: "shadow/black-hole", from: 0, to: 4, n: 12, loop: 1, opts: { palette: VOID } },
  { name: "v_collapse", id: "shadow/dark-explosion", from: 0.2, to: 2.6, n: 16, opts: { palette: VOID, seed: 9 } },
  // 공허의 교차 — 포탈(반복) · 도착 충격파
  { name: "v_portal", id: "arcane/portal", from: 0, to: 2.4, n: 12, loop: 1, opts: { palette: VOID } },
  { name: "v_slam", id: "impacts/ground-slam", from: 0, to: 0.75, n: 8, opts: { palette: VOID } },
  // 공간 절단 — 선을 따라 땅이 갈라진다(가로로 긴 시트라 길이에 맞춰 이어 붙인다)
  { name: "v_rift", id: "nature/quake", from: 0.12, to: 2.4, n: 14, opts: { palette: ["#07030f", "#150b2b", "#211445", "#2a1458", "#3e2878", "#6a3fc2", "#8d6bd1", "#a077f0"], glow: ["#1a0c3a", "#4a2a8a", "#a077f0", "#d3b8ff", "#f4ebff"], seed: 5 } },
  // 사건의 지평선 — 머리 위 문양(경고 동안 그려지고 맞는 순간 부서진다)
  { name: "v_sigil", id: "shadow/hex-sigil", from: 0.2, to: 3.6, n: 18, opts: { palette: VOID, seed: 11 } },
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
  man[s.name] = { src: s.id, from: s.from, to: s.to, w: cw, h: ch, cols, n, loop: s.loop ? 1 : 0, px: fx.meta.origin[0] - x0, py: fx.meta.origin[1] - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest-void.json`, JSON.stringify(man));
