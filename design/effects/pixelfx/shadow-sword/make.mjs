// 암흑검 종말의 연격 연출 시트 뽑기(기록용) — pixelfx(MIT) 이펙트를 톤다운 보랏빛으로 뽑고 쓸 칸만 잘라 투명 여백을 걷어 낸다
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx) 이 파일을 scratchpad/gen 에 두고 node make.mjs out. cut1 · cut2 는 그대로, slam 은 lighten.py 로 먼지를 밝혀 WebP 로 바꿔 public/assets/game/rpg/effects/skill-px/sh_*.webp 에 넣는다
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const range = (a, b, s = 1) => { const o = []; for (let i = a; i <= b; i += s) o.push(i); return o; };
const LIST = [
  // 1타 — 보랏빛 초승달 한 줄기
  { name: "cut1", id: "melee/sword-slash", pick: range(0, 16), opts: { palette: ["#1e1a2c", "#342c4e", "#51457a", "#7b6aa6", "#a899c9", "#cfc4e3", "#ece6f4", "#fbf8ff"], sparks: ["#f3ecfb", "#d6c8ee", "#a996cf", "#7b69ab"], seed: 2 } },
  // 2타 — 먼지 장미빛 초승달(그릴 때 위아래로 뒤집어 반대로 벤다)
  { name: "cut2", id: "melee/sword-slash", pick: range(0, 16), opts: { palette: ["#2a1a2c", "#4c2c4c", "#74476f", "#a06c98", "#c79bbf", "#e5c8dc", "#f6e9f1", "#fffafd"], sparks: ["#f8eef3", "#e6c6d8", "#c298b4", "#936d8c"], seed: 9 } },
  // 마무리 — 내려치는 순간부터 충격 · 먼지 · 불티가 흩어지는 데까지
  { name: "slam", id: "melee/heavy-cleave", pick: range(9, 27, 2), opts: { palette: ["#1e1a2c", "#342c4e", "#51457a", "#7b6aa6", "#a899c9", "#cfc4e3", "#ece6f4", "#fbf8ff"], stone: "#4a4466", seed: 5 } },
];
const man = {};
for (const s of LIST) {
  const fx = await loadEffect(s.id);
  const r = renderFrames(fx, { fps: 30, actor: false, options: s.opts });
  const fr = s.pick.filter((i) => i < r.n).map((i) => r.frames[i]), n = fr.length, { w, h } = r;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  fr.forEach((f) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f.clear[(y * w + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(h - 1, y1 + 1);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * ch) / cw)))), rows = Math.ceil(n / cols);
  const img = canvas(cols * cw, rows * ch, [0, 0, 0, 0]);
  fr.forEach((f, i) => {
    const buf = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) buf.set(f.clear.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * cw * 4);
    img.paste(buf, cw, ch, (i % cols) * cw, Math.floor(i / cols) * ch);
  });
  save(`${OUT}/${s.name}.png`, img.png());
  man[s.name] = { src: s.id, w: cw, h: ch, cols, n, px: fx.meta.origin[0] - x0, py: fx.meta.origin[1] - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(man));
