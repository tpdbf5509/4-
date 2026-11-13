// 크림슨 레퀴엠 · 혈계 추격 연출 시트 뽑기(11월 13일, 게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고(.claude/skills/pixelfx), 이 파일을 scratchpad/gen 에 두고 node make.mjs out
//         out/*.png 를 Pillow 로 무손실 WebP 로 바꿔 public/assets/game/rpg/effects/blood-gun/ 에 넣는다
// — void-weapon/make.mjs 와 같은 방식. 혈색(검붉은 → 밝은 붉은 → 연한 분홍, 흰색에 가까운 빛은 가장 뜨거운 가운데에만).
//   색 한 벌은 bloodGunData.js BLOOD_PALETTE(진한 혈색 #650B17 · 기본 #B8192D · 밝은 #E53945 · 발광 #FF6973 · 그림자 #1A0B14)에 맞춘다.
import { loadEffect, renderFrames, canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
const B8 = ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"];
const B7 = B8.slice(1), B5 = ["#650b17", "#b8192d", "#e53945", "#ff6973", "#ffb0b6"];
const SPARK = ["#ffeaea", "#ffb0b6", "#ff6973", "#e53945"];
// from · to 는 원본 이펙트의 초. loop 는 마지막 칸이 처음 칸으로 이어지게(끝을 포함하지 않는다)
const LIST = [
  // 1단계 혈계 발사 준비 — 총구에 붉은 에너지가 모여 구슬이 부푼다(0.4초에 맞춰 돌린다) · 발밑의 붉은 룬 원
  { name: "bg_charge", id: "arcane/spell-charge", from: 0, to: 0.62, n: 10, opts: { palette: B8, seed: 5 } },
  { name: "bg_circle", id: "arcane/rune-circle", from: 0.2, to: 1.1, n: 8, opts: { palette: B8, seed: 8 } },
  // 2단계 관통 혈탄 — 총구 섬광 · 날아가는 혈탄(반복) · 관통 충격
  { name: "bg_muzzle", id: "projectiles/muzzle-pistol", from: 0, to: 0.2, n: 6, opts: { palette: B8, height: 26, seed: 3 } },
  { name: "bg_bolt", id: "projectiles/laser-bolt", from: 0, to: 0.5, n: 6, loop: 1, opts: { palette: B8, length: 56, seed: 2 } },
  { name: "bg_pierce", id: "impacts/crit-hit", from: 0, to: 0.5, n: 10, opts: { palette: B8, height: 26, aim: 0, seed: 3 } },
  // 3단계 피의 추적자 — 첫 적중 자리에 모여드는 혈액 에너지 · 유도 혈탄(반복) · 닿는 불꽃
  { name: "bg_form", id: "explosions/implosion", from: 0.3, to: 1.2, n: 10, opts: { palette: B7, seed: 2 } },
  { name: "bg_seeker", id: "projectiles/plasma-shot", from: 0, to: 0.8, n: 8, loop: 1, opts: { palette: B8, size: 5, seed: 3 } },
  { name: "bg_spark", id: "impacts/hit-spark", from: 0, to: 0.4, n: 8, opts: { palette: B7, height: 20, aim: 0, seed: 4 } },
  // 4단계 혈흔 공명 — 붉은 인장이 그려졌다가 번쩍인다(0.25초에 맞춰 돌린다)
  { name: "bg_res", id: "shadow/hex-sigil", from: 0.5, to: 2.75, n: 10, opts: { palette: B8, seed: 7 } },
  // 5단계 혈계 처형 — 붉은 에너지 폭발 · 5중첩은 검은 핵이 있는 큰 폭발
  { name: "bg_boom", id: "explosions/plasma-explosion", from: 0, to: 0.95, n: 10, opts: { palette: B7, accent: B5, seed: 7 } },
  { name: "bg_boom5", id: "shadow/dark-explosion", from: 0.15, to: 1.6, n: 12, opts: { palette: B8, seed: 6 } },
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
