// BLOOD-001 탈진 지속 연출 시트 뽑기(11월 28일, 게임이 쓰지 않는 기록용 스크립트) — make.mjs 와 같은 방식
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/blood-job/px/ 에 넣는다
// — 크림슨 레퀴엠(blood-gun/make.mjs)과 같은 방식, 다른 이펙트 · 씨앗. BLOOD-001 연출은 이 시트만 쓴다(11월 14일 사용자 지시 — Codex 레이어 · 코드 도트 모두 걷어 냄).
//   색은 bloodJobData.js BLOOD_COLORS.red(검붉은 → 밝은 붉은 → 연한 분홍). 흰빛은 가장 뜨거운 가운데에만.
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
// from · to 는 원본 이펙트의 초. loop 는 마지막 칸이 처음 칸으로 이어지게(끝을 포함하지 않는다)
// 탈진 — 폭주(검붉은 불꽃)와 구분되게 식은 회청색 · 무거운 기운. status/slowed: 느려진 시계 눈금 + 천천히 가라앉는 방울과 느린 고리(반복)
const T8 = ["#101018", "#1c1c2a", "#2e2e44", "#46465f", "#64647f", "#8484a0", "#a8a8c0", "#d0d0de"];
const LIST = [
  { name: "bj_tired_loop", id: "status/slowed", from: 0, to: 2.4, n: 12, loop: 1, opts: { palette: T8, seed: 21 } },
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
