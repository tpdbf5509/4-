// BLOOD-001 연출 시트 뽑기(11월 14일, 게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/blood-job/px/ 에 넣는다
// — 크림슨 레퀴엠(blood-gun/make.mjs)과 같은 방식, 다른 이펙트 · 씨앗. Codex 레이어(bj-layers*.webp)가 맡지 않던 코드 도트 연출을 대신한다.
//   색은 bloodJobData.js BLOOD_COLORS.red(검붉은 → 밝은 붉은 → 연한 분홍). 흰빛은 가장 뜨거운 가운데에만.
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
const B8 = ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"];
const B7 = B8.slice(1), B5 = ["#650b17", "#b8192d", "#e53945", "#ff6973", "#ffb0b6"];
const SPARK = ["#ffeaea", "#ffb0b6", "#ff6973", "#e53945"];
// from · to 는 원본 이펙트의 초. loop 는 마지막 칸이 처음 칸으로 이어지게(끝을 포함하지 않는다)
const LIST = [
  // 적혈탄 차징 — 손끝에 맺히는 혈액 구슬(반복) · 날아가는 방울(반복, 흡수 · 회수 · 핏방울도 쓴다)
  { name: "bj_orb", id: "arcane/arcane-orb", from: 0, to: 2.4, n: 10, loop: 1, opts: { palette: B8, seed: 11 } },
  { name: "bj_drop", id: "projectiles/plasma-shot", from: 0, to: 0.8, n: 6, loop: 1, opts: { palette: B8, size: 3, seed: 9 } },
  // 적중 · 소멸(피 튀김) · 팽창
  { name: "bj_hit", id: "impacts/blunt-hit", from: 0, to: 0.5, n: 8, opts: { palette: B7, warm: "#ff6973", dust: "#8a3a44", clod: "#4a0e18", seed: 6 } },
  { name: "bj_pop", id: "water/splash", from: 0.1, to: 1.1, n: 8, opts: { palette: B8, stone: false, seed: 4 } },
  { name: "bj_burst", id: "arcane/mana-burst", from: 0.2, to: 1.4, n: 10, opts: { palette: B8, seed: 12 } },
  // 혈량 전환 — 가슴에서 붉은 심장이 맥동한다
  { name: "bj_heart", id: "pickups/heart-pickup", from: 0, to: 1.2, n: 8, loop: 1, opts: { palette: B8, seed: 8 } },
  // 혈수 강타 착지 · 혈검 베기 · 교차 베기
  { name: "bj_slam", id: "impacts/ground-slam", from: 0, to: 1.0, n: 10, opts: { palette: B8, stone: "#3a0a14", seed: 5 } },
  { name: "bj_slash", id: "melee/sword-slash", from: 0.05, to: 0.6, n: 8, opts: { palette: B8, seed: 4 } },
  { name: "bj_cross", id: "melee/double-slash", from: 0.3, to: 0.8, n: 8, opts: { palette: B8, seed: 4 } },
  // 혈막 — 몸을 두른 막(반복) · 막는 순간 · 막이 접히며 모인다
  { name: "bj_shield", id: "holy/divine-shield", from: 0, to: 2.4, n: 10, loop: 1, opts: { palette: B8, seed: 3 } },
  { name: "bj_block", id: "impacts/shield-block", from: 0, to: 0.8, n: 8, opts: { palette: B8, seed: 3 } },
  { name: "bj_suck", id: "explosions/implosion", from: 0.2, to: 1.1, n: 10, opts: { palette: B7, seed: 9 } },
  // 폭주 — 몸을 감싸는 검붉은 불꽃(반복). 탈진은 Codex 갑주 조각 칸만 쓴다
  { name: "bj_rage", id: "shadow/shadow-flames", from: 0, to: 2.4, n: 10, loop: 1, opts: { palette: B8, seed: 2 } },
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
