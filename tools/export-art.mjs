// 게임이 코드로 그리던 그림(배경 · 탑 · 돌판 · 성채 · RPG 맵과 소품)을 투명 PNG 로 뽑는다.
// 움직이는 것(깃발 · 분수 물결 · 탑의 반짝임 · 문 소용돌이)은 한 바퀴(ANIM_T 초)를 36 등분한 프레임을
// 6칸씩 줄지어 붙인 "시트" 한 장으로 뽑는다. 모든 프레임이 같은 그림은 정지 그림 한 장으로 줄인다.
//
// 쓰는 법:  npm run dev  로 개발 서버를 띄운 뒤  node tools/export-art.mjs [주소] [저장 폴더]
//   기본값 — 주소 http://localhost:5173/?net=local · 저장 폴더 tools/out
// 뽑은 PNG 는  python3 tools/png-to-webp.py [저장 폴더]  로 public/assets/game 에 WebP 로 옮기고,
// 움직이는 그림 목록(manifest.json)도 함께 만든다. (Playwright · Pillow 가 있어야 한다.)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const URL = process.argv[2] || "http://localhost:5173/?net=local";
const OUT = path.resolve(process.argv[3] || "tools/out");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(URL, { waitUntil: "networkidle" });

const jobs = await page.evaluate(async () => {
  const art = await import("/src/game/art.js");
  const rart = await import("/src/game/rpgArt.js");
  const rpg = await import("/src/game/rpg.js");
  const world = await import("/src/game/world.js");
  const { W, H, CX, CY, P, SPOTS, TOWERS } = world;
  const { FRAME, TURRETS, ANIM_T } = art;
  const F = rart.RFRAME;
  const S = 2, N = 36, COLS = 6;     // 배율 · 한 바퀴의 프레임 수 · 시트 한 줄의 칸 수
  const out = [];

  const renderAt = (w, h, scale, draw, t) => {
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.scale(scale, scale);
    draw(ctx, t);
    return { c, d: ctx.getImageData(0, 0, c.width, c.height).data };
  };
  const bbox = (d, w, h, scale) => {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return [x0 / scale, y0 / scale, (x1 + 1) / scale, (y1 + 1) / scale];
  };
  const worstDiff = (a, b) => { let worst = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i] - b[i]); if (v > worst) worst = v; } return worst; };

  // 정지 그림 한 장 (kind: "sprite" 투명 그림 · "bg" 배경)
  const addStill = (file, w, h, draw, kind = "sprite", scale = S) => {
    const f = renderAt(w, h, scale, draw, 0);
    out.push({ file, kind, data: f.c.toDataURL("image/png"), w: f.c.width, h: f.c.height,
      bbox: bbox(f.d, f.c.width, f.c.height, scale), n: 1, cols: 1, seam: null });
  };
  // 움직이는 그림 — 프레임을 모두 뽑아 같으면 한 장으로, 다르면 시트로 붙인다
  const addAnim = (file, w, h, draw) => {
    const frames = [];
    for (let i = 0; i < N; i++) frames.push(renderAt(w, h, S, draw, (i / N) * ANIM_T));
    const W1 = Math.round(w * S), H1 = Math.round(h * S);
    let b = [1e9, 1e9, -1, -1];
    frames.forEach((f) => { const q = bbox(f.d, W1, H1, S); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; });
    const still = frames.every((f) => worstDiff(f.d, frames[0].d) === 0);
    if (still) {
      out.push({ file, kind: "sprite", data: frames[0].c.toDataURL("image/png"), w: W1, h: H1, bbox: b, n: 1, cols: 1, seam: null });
      return;
    }
    const rows = Math.ceil(N / COLS);
    const sheet = document.createElement("canvas");
    sheet.width = W1 * COLS; sheet.height = H1 * rows;
    const cx = sheet.getContext("2d");
    frames.forEach((f, i) => cx.drawImage(f.c, (i % COLS) * W1, Math.floor(i / COLS) * H1));
    // 끝(ANIM_T 초)이 처음(0 초)과 이어져야 한다 — 얼마나 어긋나는지 잰다
    const seam = worstDiff(renderAt(w, h, S, draw, ANIM_T).d, frames[0].d);
    out.push({ file, kind: "sprite", data: sheet.toDataURL("image/png"), w: W1, h: H1, bbox: b, n: N, cols: COLS, seam });
  };

  /* ── 방어전 ── */
  addStill("defense/bg", W, H, (ctx) => art.paintTerrain(ctx), "bg");
  addStill("defense/arena-bg", W, H, (ctx) => art.paintArenaBg(ctx, 0, false), "bg");   // 둘러선 숲은 나무 그림으로 따로 그린다

  Object.keys(SPOTS).forEach((sp) => [false, true].forEach((built) => {
    addStill(`defense/pads/${sp}-${built ? "built" : "empty"}`, FRAME.pad.w, FRAME.pad.h, (ctx) => {
      art.padBody(ctx, { x: FRAME.pad.ox, y: FRAME.pad.oy, spot: sp }, built);
    });
  }));

  TOWERS.forEach((def, idx) => {
    const kind = def.id;
    for (let lv = 1; lv <= 4; lv++) {
      const t = { type: kind, lv, aim: 0, pulse: 0, warm: 0, aid: 0, owner: idx };
      const aimed = !!TURRETS[kind];
      addAnim(`defense/towers/${kind}-${lv}`, FRAME.tower.w, FRAME.tower.h, (ctx, time) => {
        ctx.translate(FRAME.tower.ox, FRAME.tower.oy); ctx.scale(0.86, 0.86);
        art.setDrawPart(aimed ? "base" : "all");
        art.towerBody(ctx, kind, lv, P[idx], time, t, 0);
        art.setDrawPart("all");
      });
      if (aimed) {
        addAnim(`defense/towers/${kind}-${lv}-turret`, FRAME.turret.w, FRAME.turret.h, (ctx, time) => {
          ctx.translate(FRAME.turret.ox, FRAME.turret.oy); ctx.scale(0.86, 0.86);
          ctx.translate(0, -TURRETS[kind].py(lv));      // 종류 함수가 제 축으로 옮기는 만큼 되돌려 축을 원점에 둔다
          art.setDrawPart("turret");
          art.towerBody(ctx, kind, lv, P[idx], time, t, 0);
          art.setDrawPart("all");
        });
      }
    }
  });

  for (let tier = 1; tier <= 4; tier++) {
    addAnim(`defense/castle/tier-${tier}`, FRAME.castle.w, FRAME.castle.h, (ctx, time) => {
      ctx.translate(FRAME.castle.ox - CX, FRAME.castle.oy - CY);
      art.castleBody(ctx, tier, time);
    });
  }
  addStill("defense/castle/gun-barrel", FRAME.gun.w, FRAME.gun.h, (ctx) => {
    ctx.translate(FRAME.gun.ox - CX, FRAME.gun.oy - (CY - 24 - 3));
    art.drawCastleGun(ctx, { castle: { aim: 0, pulse: 0 } }, 0, "barrel");
  });

  /* ── RPG ── */
  ["plaza", "field"].forEach((id) => {
    const c = rart.paintMap(id);                    // 코드가 그리는 크기 그대로(1배)
    out.push({ file: `rpg/${id}`, kind: "bg", data: c.toDataURL("image/png"), w: c.width, h: c.height,
      bbox: [0, 0, c.width, c.height], n: 1, cols: 1, seam: null });
  });
  addAnim("rpg/fountain", F.fountain.w, F.fountain.h, (ctx, time) => {
    ctx.translate(F.fountain.ox - 900, F.fountain.oy - 620); rart.drawFountainBody(ctx, time);
  });
  ["lamp", "bench"].forEach((k) => addStill(`rpg/${k}`, F[k].w, F[k].h, (ctx) => {
    rart.drawPropBody(ctx, { k, x: F[k].ox, y: F[k].oy });
  }));
  addAnim("rpg/gate", F.gate.w, F.gate.h, (ctx, time) => {
    rart.drawGateBody(ctx, { x: F.gate.ox, y: F.gate.oy, r: 64 }, time);
  });
  addStill("rpg/hunter", F.hunter.w, F.hunter.h, (ctx) => rart.drawNpcBody(ctx, F.hunter.ox, F.hunter.oy, 0));
  [false, true].forEach((fz) => addStill(`rpg/rabbit${fz ? "-frozen" : ""}`, F.rabbit.w, F.rabbit.h, (ctx) => {
    ctx.translate(F.rabbit.ox, F.rabbit.oy); rart.drawRabbitBody(ctx, fz);
  }));
  art.TREE_VARIANTS.forEach((v, i) => addStill(art.treeName(i), art.TREE_FRAME.w, art.TREE_FRAME.h, (ctx) => {
    art.drawTree(ctx, art.TREE_FRAME.ox, art.TREE_FRAME.oy, 1, v.pine, v.seed);
  }));
  return { out, animT: ANIM_T, frames: N };
});

const report = [];
for (const j of jobs.out) {
  fs.writeFileSync(path.join(OUT, j.file.replace(/\//g, "__") + ".png"), Buffer.from(j.data.split(",")[1], "base64"));
  report.push({ file: j.file, kind: j.kind, w: j.w, h: j.h, bbox: j.bbox, n: j.n, cols: j.cols, seam: j.seam });
}
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ animT: jobs.animT, frames: jobs.frames, files: report }, null, 1));

// 점검 — 프레임 밖으로 잘린 그림과 처음 · 끝이 이어지지 않는 그림을 알린다
let warn = 0;
for (const j of report) {
  if (j.kind === "bg") continue;
  const fw = j.w / 2, fh = j.h / 2;
  const [x0, y0, x1, y1] = j.bbox;
  if (Math.min(x0, y0, fw - x1, fh - y1) < 1) { console.log("⚠ 프레임 밖으로 잘림:", j.file, j.bbox); warn++; }
  if (j.seam !== null && j.seam > 12) { console.log("⚠ 한 바퀴가 이어지지 않음:", j.file, "차이", j.seam); warn++; }
}
const anim = report.filter((j) => j.n > 1).length;
console.log(`뽑은 그림 ${report.length}장 (움직이는 그림 ${anim}장) → ${OUT}${warn ? ` · 경고 ${warn}건` : ""}`);
await browser.close();
