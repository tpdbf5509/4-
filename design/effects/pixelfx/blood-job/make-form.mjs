// BLOOD-001 형상화 시트 뽑기(11월 15일, 게임이 쓰지 않는 기록용 스크립트)
// 쓰는 법: scratchpad/ext 에 pixelfx 를 받고 blood-form.js 를 그 저장소 src/fx/nature/ 에 복사한 뒤,
//         이 파일을 scratchpad/gen 에 두고 node make-form.mjs out → out/*.png 를 Pillow 로 무손실 WebP 로 바꿔
//         public/assets/game/rpg/effects/blood-job/px/ 에 넣는다.
// 시트마다 두 장: <이름>.png(몸) · <이름>_rim.png(밝은 외곽 C[6] · C[7] 만). 게임은 몸만 연마 색으로 어둡게 물들이고 외곽은 밝게 둔다.
// 줄 = 방향(dirs), 칸 = 시간. 칼 · 궤적 · 혈막의 맞은 쪽은 pixelfx 가 도형을 돌려 다시 찍으므로 픽셀이 뭉개지지 않는다.
import { createFrame, painterFor, fit } from "../ext/pixelfx/src/core/index.js";
import { canvas, save } from "../ext/pixelfx/tools/lib/fxlib.mjs";
import * as FX from "../ext/pixelfx/src/fx/nature/blood-form.js";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], ONLY = process.argv[3] || "";
mkdirSync(OUT, { recursive: true });
const B8 = ["#14040a", "#3a0a14", "#650b17", "#a8152a", "#d82a3e", "#ff4f60", "#ff9ca4", "#ffe6e8"];
const D16 = Array.from({ length: 16 }, (_, i) => (i * Math.PI * 2) / 16);
const D5 = [-90, -45, 0, 45, 90].map((d) => (d * Math.PI) / 180);   // 오른쪽 반 — 왼쪽은 게임이 좌우로 뒤집는다
const LIST = [
  { name: "bj_sw_form", part: "sword", phase: "form", n: 8, dirs: D16 },
  { name: "bj_sw_hold", part: "sword", phase: "hold", n: 4, loop: 1, dirs: D16 },
  { name: "bj_sw_break", part: "sword", phase: "break", n: 8, dirs: D16 },
  { name: "bj_arc1", part: "arc", phase: "swing1", n: 6, dirs: D5 },
  { name: "bj_arc2", part: "arc", phase: "swing2", n: 6, dirs: D5 },
  { name: "bj_arc3", part: "arc", phase: "swing3", n: 8, dirs: D5 },
  { name: "bj_vl_form", part: "veil", phase: "form", n: 8, dirs: [0] },
  { name: "bj_vl_hold", part: "veil", phase: "hold", n: 6, loop: 1, dirs: [0] },
  { name: "bj_vl_hit", part: "veil", phase: "hit", n: 8, dirs: D5 },
  { name: "bj_vl_fold", part: "veil", phase: "fold", n: 8, dirs: [0] },
  { name: "bj_hd_form", part: "hand", phase: "form", n: 8, dirs: [0] },
  { name: "bj_hd_open", part: "hand", phase: "open", n: 4, loop: 1, dirs: [0] },
  { name: "bj_hd_clench", part: "hand", phase: "clench", n: 5, dirs: [0] },
  { name: "bj_hd_unravel", part: "hand", phase: "unravel", n: 8, dirs: [0] },
  // 11월 15일 — 혈류 파동: 칸 = 반지름(WAVE_R0 부터 WAVE_STEP 씩). 게임이 판정 반경에 가장 가까운 칸을 고른다
  { name: "bj_wave", part: "wave", n: 62, dirs: [0], r: (i) => 4 + i * 2, size: [272, 216], cols: 8 },
  // 혈쇄 갈고리 — 손에서 생김 · 날아가는 머리 · 사슬 마디(칸 = 종류 4) · 풀리는 방울
  { name: "bj_hk_form", part: "hook", phase: "form", n: 6, dirs: D16 },
  { name: "bj_hk_head", part: "hook", phase: "head", n: 4, loop: 1, dirs: D16 },
  { name: "bj_hk_link", part: "link", n: 4, dirs: D16, variant: (i) => i },
  { name: "bj_hk_drop", part: "drop", n: 6, dirs: [0] },
  // 적혈탄 압축 구슬 — 줄 = 단계 0 · 1 · 2(돌리지 않는다), 칸 = 한 바퀴
  { name: "bj_core", part: "core", n: 8, loop: 1, dirs: [0, 1, 2], tierRows: 1, size: [40, 40] },
];
const C = fit(B8, 8), RIM = new Set([C[6] >>> 0, C[7] >>> 0]);
const man = {};
for (const s of LIST.filter((q) => q.name.startsWith(ONLY))) {
  const cells = [];
  const [W, H] = s.size || [160, 160], [OX, OY] = [W / 2, H / 2];
  for (const ang of s.dirs) for (let i = 0; i < s.n; i++) {
    const u = s.loop ? i / s.n : s.n === 1 ? 1 : i / (s.n - 1);
    const f = createFrame(W, H);
    const p = painterFor(f).place(OX, OY, false, ["veil", "hand", "wave", "drop", "core"].includes(s.part) ? 0 : ang);
    const o = { ...FX.meta.options, palette: B8, part: s.part, phase: s.phase, u, ang, seed: 5 };
    if (s.r) o.r = s.r(i);
    if (s.variant) o.variant = s.variant(i);
    if (s.tierRows) o.tier = ang;                     // 줄이 방향이 아니라 단계

    if (s.part === "veil" && s.phase === "hit") { o.hitA = ang; }
    // 혈막의 맞은 쪽 — 판은 돌리지 않고(눌린 타원 그대로) 움푹 들어갈 판만 hitA 로 고른다
    FX.draw(p, u, o);
    cells.push(f.color);
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  cells.forEach((col) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (col[y * W + x] >>> 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cols = s.cols || s.n, rows = s.cols ? Math.ceil(s.n / s.cols) : s.dirs.length;
  const body = canvas(cols * cw, rows * ch, [0, 0, 0, 0]), rim = canvas(cols * cw, rows * ch, [0, 0, 0, 0]);
  cells.forEach((col, k) => {
    const b = new Uint8ClampedArray(cw * ch * 4), r = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const c = col[(y + y0) * W + x + x0] >>> 0;
      if (!(c >>> 24)) continue;
      const j = (y * cw + x) * 4, dst = RIM.has(c) ? r : b;
      dst[j] = c & 255; dst[j + 1] = (c >>> 8) & 255; dst[j + 2] = (c >>> 16) & 255; dst[j + 3] = 255;
    }
    const cx = (k % cols) * cw, cy = Math.floor(k / cols) * ch;
    body.paste(b, cw, ch, cx, cy); rim.paste(r, cw, ch, cx, cy);
  });
  save(`${OUT}/${s.name}.png`, body.png());
  save(`${OUT}/${s.name}_rim.png`, rim.png());
  man[s.name] = { w: cw, h: ch, cols, n: s.n, rows: s.cols ? 1 : rows, loop: s.loop ? 1 : 0, cx: OX - x0, cy: OY - y0 };
  console.log(s.name, JSON.stringify(man[s.name]));
}
writeFileSync(`${OUT}/manifest-form.json`, JSON.stringify(man));
