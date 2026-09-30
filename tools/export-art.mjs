// 게임이 코드로 그리던 그림(배경 · 탑 · 돌판 · 성채 · RPG 맵과 소품)을 투명 PNG 로 뽑는다.
// 쓰는 법:  npm run dev  로 개발 서버를 띄운 뒤  node tools/export-art.mjs [주소] [저장 폴더]
//   기본값 — 주소 http://localhost:5173/?net=local · 저장 폴더 tools/out
// 뽑은 PNG 는  python3 tools/png-to-webp.py [저장 폴더]  로 public/assets/game 에 WebP 로 옮긴다.
// (Playwright 가 있어야 한다.)
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

const defenseJobs = await page.evaluate(async () => {
  const art = await import('/src/game/art.js');
  const world = await import('/src/game/world.js');
  const { W, H, CX, CY, P, SPOTS, TOWERS } = world;
  const S = 2;
  const out = [];
  const make = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = Math.round(w * S); c.height = Math.round(h * S);
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    draw(ctx);
    // 잘렸는지 보려고 그림이 닿은 범위를 잰다
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { data: c.toDataURL('image/png'), w: c.width, h: c.height, bbox: [x0 / S, y0 / S, (x1 + 1) / S, (y1 + 1) / S] };
  };
  const add = (file, w, h, draw, kind = 'sprite') => out.push({ file, kind, ...make(w, h, draw) });
  const F = art.FRAME;

  // 배경
  add('defense/bg', W, H, (ctx) => art.paintTerrain(ctx), 'bg');
  add('defense/arena-bg', W, H, (ctx) => art.paintArenaBg(ctx, 0), 'bg');

  // 돌판 — 자리 성격 × (비어 있음 · 지음)
  Object.keys(SPOTS).forEach((sp) => [false, true].forEach((built) => {
    add(`defense/pads/${sp}-${built ? 'built' : 'empty'}`, F.pad.w, F.pad.h, (ctx) => {
      art.padBody(ctx, { x: F.pad.ox, y: F.pad.oy, spot: sp }, built);
    });
  }));

  // 탑 — 종류 × 4단계. 조준하는 부품은 따로 뽑는다.
  TOWERS.forEach((def, idx) => {
    const kind = def.id;
    for (let lv = 1; lv <= 4; lv++) {
      const t = { type: kind, lv, aim: 0, pulse: 0, warm: 0, aid: 0, owner: idx };
      const aimed = !!art.TURRETS[kind];
      add(`defense/towers/${kind}-${lv}`, F.tower.w, F.tower.h, (ctx) => {
        ctx.translate(F.tower.ox, F.tower.oy); ctx.scale(0.86, 0.86);
        art.setDrawPart(aimed ? 'base' : 'all');
        art.towerBody(ctx, kind, lv, P[idx], 0, t, 0);
        art.setDrawPart('all');
      });
      if (aimed) {
        add(`defense/towers/${kind}-${lv}-turret`, F.turret.w, F.turret.h, (ctx) => {
          ctx.translate(F.turret.ox, F.turret.oy); ctx.scale(0.86, 0.86);
          ctx.translate(0, -art.TURRETS[kind].py(lv));      // 종류 함수가 제 축으로 옮기는 만큼 되돌려 축을 원점에 둔다
          art.setDrawPart('turret');
          art.towerBody(ctx, kind, lv, P[idx], 0, t, 0);
          art.setDrawPart('all');
        });
      }
    }
  });

  // 성채 — 4단계 + 돌아가는 포신
  for (let tier = 1; tier <= 4; tier++) {
    add(`defense/castle/tier-${tier}`, F.castle.w, F.castle.h, (ctx) => {
      ctx.translate(F.castle.ox - CX, F.castle.oy - CY);
      art.castleBody(ctx, tier, 0);
    });
  }
  add('defense/castle/gun-barrel', F.gun.w, F.gun.h, (ctx) => {
    ctx.translate(F.gun.ox - CX, F.gun.oy - (CY - 24 - 3));
    art.drawCastleGun(ctx, { castle: { aim: 0, pulse: 0 } }, 0, 'barrel');
  });
  return out;
});

const rpgJobs = await page.evaluate(async () => {
  const art = await import('/src/game/rpgArt.js');
  const rpg = await import('/src/game/rpg.js');
  const { RFRAME, TREE_VARIANTS } = art;
  const out = [];
  const make = (w, h, S, draw) => {
    const c = document.createElement('canvas');
    c.width = Math.round(w * S); c.height = Math.round(h * S);
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    draw(ctx);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { data: c.toDataURL('image/png'), w: c.width, h: c.height, bbox: [x0 / S, y0 / S, (x1 + 1) / S, (y1 + 1) / S] };
  };
  const add = (file, w, h, draw, kind = 'sprite', S = 2) => out.push({ file, kind, ...make(w, h, S, draw) });

  // 맵 바탕 — 1배 (코드가 지금 그리는 크기 그대로)
  ['plaza', 'field'].forEach((id) => {
    const M = rpg.MAPS[id];
    const c = art.paintMap(id);
    out.push({ file: `rpg/${id}`, kind: 'bg', data: c.toDataURL('image/png'), w: c.width, h: c.height, bbox: [0, 0, c.width, c.height] });
  });
  const F = RFRAME;
  add('rpg/fountain', F.fountain.w, F.fountain.h, (ctx) => { ctx.translate(F.fountain.ox - 900, F.fountain.oy - 620); art.drawFountainBody(ctx, 0); });
  ['lamp', 'bench'].forEach((k) => add(`rpg/${k}`, F[k].w, F[k].h, (ctx) => { art.drawPropBody(ctx, { k, x: F[k].ox, y: F[k].oy }); }));
  add('rpg/gate', F.gate.w, F.gate.h, (ctx) => { art.drawGateBody(ctx, { x: F.gate.ox, y: F.gate.oy, r: 64 }, 0); });
  add('rpg/hunter', F.hunter.w, F.hunter.h, (ctx) => { art.drawNpcBody(ctx, F.hunter.ox, F.hunter.oy, 0); });
  [false, true].forEach((fz) => add(`rpg/rabbit${fz ? '-frozen' : ''}`, F.rabbit.w, F.rabbit.h, (ctx) => {
    ctx.translate(F.rabbit.ox, F.rabbit.oy); art.drawRabbitBody(ctx, fz);
  }));
  TREE_VARIANTS.forEach((v, i) => add(`rpg/tree-${i}`, F.tree.w, F.tree.h, (ctx) => { art.drawTreeBody(ctx, F.tree.ox, F.tree.oy, 1, v.pine, v.seed); }));
  return out;
});

const report = [];
for (const j of [...defenseJobs, ...rpgJobs]) {
  fs.writeFileSync(path.join(OUT, j.file.replace(/\//g, "__") + ".png"), Buffer.from(j.data.split(",")[1], "base64"));
  report.push({ file: j.file, kind: j.kind, w: j.w, h: j.h, bbox: j.bbox });
}
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log("뽑은 그림", report.length, "장 →", OUT);
await browser.close();
