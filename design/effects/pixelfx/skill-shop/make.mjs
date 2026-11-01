// 스킬 상점 스킬 연출 시트 뽑기(게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/skill-px/ 에 넣는다(_none 은 쓰지 않는다)
//         smash · cleave 는 lighten.py 로 반투명 먼지를 흙빛으로 밝혀 넣는다(밝은 사냥터에서 검댕처럼 보였다)
// — pixelfx(MIT) 이펙트를 색을 바꿔 렌더하고, 쓸 구간만 잘라 투명 여백을 걷어 낸다
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const hx = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, k) => toHex(hx(a).map((v, i) => v + (hx(b)[i] - v) * k));
// 어두운 바탕 → dark → key → light → 거의 흰색, n 칸. 원색을 피하려고 회색 쪽으로 조금 당긴다
function ramp(dark, key, light, n) {
  const stops = [mix("#141218", dark, 0.35), dark, mix(key, "#8a8580", 0.18), mix(light, "#d8d2c8", 0.15), mix(light, "#fffaf2", 0.75)];
  const out = [];
  for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * (stops.length - 1), j = Math.min(stops.length - 2, Math.floor(t)); out.push(mix(stops[j], stops[j + 1], t - j)); }
  return out;
}
const PARCH = ["#2a2018", "#4a3726", "#6e5238", "#94724f", "#b99a74", "#d9c3a0", "#efe3c8", "#fffaf0"];
const ELEM = { flame: ["#8f2620", "#d9483f", "#ef8177"], frost: ["#2a5f96", "#4a8ed2", "#7cb6ea"], bolt: ["#96761c", "#ddb23f", "#f2d179"],
  poison: ["#5c7c1f", "#8fb93c", "#bcdd71"], corrode: ["#207565", "#3fae94", "#78d5bf"], gravity: ["#82316a", "#c1569f", "#e08cc6"], none: ["#7c6d55", "#b9a88a", "#efe3c8"] };
const ICE = ["#1c2a38", "#2f4a66", "#4f7398", "#7ea0c0", "#adc8de", "#dbe8f2", "#f8fcff"];
const LIST = [
  { name: "smash", id: "melee/hammer-smash", n: 12, end: 1.1, opts: { palette: PARCH, stone: "#c8bca4" } },
  { name: "burst", id: "arcane/mana-burst", n: 14, end: 1.2, opts: { palette: ["#1e1a2e", "#352c52", "#4f4277", "#6c5c9c", "#8a7cb8", "#a698cc", "#c4b8e2", "#ddd4f0"], light: 0.35 } },
  { name: "pierce", id: "impacts/crit-hit", n: 10, end: 0.55, opts: { palette: ["#2e1e14", "#5a3522", "#8a5232", "#bf7a46", "#e0a560", "#f0c97e", "#f8e6b4", "#fffbee"] } },
  { name: "aid", id: "nature/healing-bloom", n: 16, end: 2.0, opts: { palette: ["#14201a", "#1f3427", "#2f4d38", "#46694c", "#64886a", "#8bab84", "#b9d3a8", "#eef6e2"], petal: ["#4a3040", "#9a6a80", "#dcaabd", "#f6e0e8"], heart: ["#8a6a3a", "#d4b070", "#f0dca0", "#fffaea"] } },
  { name: "rush", id: "melee/thrust", n: 8, end: 0.5, opts: { palette: ["#2a2018", "#5a4430", "#8c6c4c", "#bb9b74", "#dcc39e", "#f1e4c9", "#fffaf0"] } },
  { name: "dash", id: "melee/thrust", n: 8, end: 0.5, opts: { palette: ["#1c2230", "#2f3d55", "#4a5f80", "#7a90b0", "#a8bad2", "#d6e0ec", "#f8fbff"], seed: 5 } },
  { name: "spin", id: "melee/spin-slash", n: 10, end: 0.6, opts: { palette: ["#2a2018", "#4a3a2a", "#74603f", "#a08a64", "#c8b48e", "#e8dcc0", "#fffaf0"] } },
  { name: "cleave", id: "nature/quake", n: 12, end: 1.6, opts: { palette: ["#14110e", "#221c16", "#2e261e", "#3c3228", "#4e4234", "#645646", "#7e6e5a", "#9c8c76"], glow: ["#5a3a24", "#8c5a34", "#c08048", "#e0aa6c", "#f2d3a0"] } },
  { name: "arrow", id: "projectiles/arrow", n: 6, end: 0.6, loop: 1, opts: { palette: ["#5c4a3a", "#8a7058", "#e8e2d6", "#fffaf0"], wind: "#c8c0b0" } },
  { name: "arrow_ice", id: "projectiles/arrow", n: 6, end: 0.6, loop: 1, opts: { palette: ["#3a4a5c", "#6a88a8", "#dbe8f2", "#ffffff"], wind: "#b8cce0" } },
  { name: "spark", id: "impacts/hit-spark", n: 8, end: 0.45, opts: { palette: ["#3a2a1c", "#7a5434", "#b07a48", "#d8a468", "#ecca8c", "#f6e6bc", "#fffbee"] } },
  { name: "spark_ice", id: "impacts/hit-spark", n: 8, end: 0.45, opts: { palette: ICE } },
  { name: "chain", id: "lightning/zap-hit", n: 10, end: 0.75, opts: { palette: ["#141626", "#232a4a", "#36437a", "#5266a6", "#7a8fcc", "#a8b8e6", "#d6e0f6", "#f8faff"] } },
  { name: "iron", id: "holy/divine-shield", n: 12, end: 2.4, loop: 1, opts: { palette: ["#1c2128", "#2e3640", "#46525e", "#66737f", "#8e9aa5", "#b6c0c9", "#dce3e9", "#f8fafc"] } },
  { name: "circle", id: "arcane/magic-circle-cast", n: 16, end: 2.6, opts: { palette: ["#141c2a", "#22314a", "#34496c", "#4c6690", "#6c88b2", "#94aed0", "#c2d4ea", "#f2f7fd"] } },
  ...Object.entries(ELEM).flatMap(([el, [d, k, l]]) => [
    { name: `orb_${el}`, id: "projectiles/plasma-shot", n: 8, end: 0.8, loop: 1, opts: { palette: ramp(d, k, l, 8) } },
    { name: `boom_${el}`, id: "explosions/plasma-explosion", n: 11, end: 1.1, opts: { palette: ramp(d, k, l, 7), accent: ramp(d, k, l, 5) } },
  ]),
];
const man = {};
for (const s of LIST) {
  const fx = await loadEffect(s.id);
  s.fps = s.loop ? s.n / s.end : (s.n - 1) / s.end;
  const r = renderFrames(fx, { fps: s.fps, actor: false, options: s.opts });
  const n = Math.min(r.n, s.n);
  const fr = r.frames.slice(0, n), { w, h } = r;
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
  man[s.name] = { src: s.id, w: cw, h: ch, cols, n, fps: s.fps, loop: s.loop ? 1 : 0, px: fx.meta.origin[0] - x0, py: fx.meta.origin[1] - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(man));
