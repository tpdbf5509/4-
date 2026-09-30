/* RPG 모드 그리기 — 광장과 사냥터, 영웅, 토끼, 사냥꾼, 문.
   맵은 화면보다 넓다. 내 영웅을 따라 화면(카메라)이 움직인다. */
import { W, H, P, CLASSES } from "./world.js";
import {
  roundRect, shadow, mulberry32, drawTree, drawRock, drawBush,
  drawFx, drawBanner, classArt, fxWarmUp, FX_ART, mapImg, mapImgFailed,
} from "./art.js";
import { RPG, MAPS, QUEST, dist, heroRange } from "./rpg.js";

const HERO_H = 62;            // 영웅 키 — 넓어진 맵에 맞게 작게 둔다

/* ── 이미지 그림 ─────────────────────────────────────────────
   광장 · 사냥터 바탕과 분수 · 문 · 사냥꾼 · 토끼 같은 것들은 public/assets/game/rpg 의 그림 파일을 얹는다.
   못 불러오면 예전처럼 코드로 그린다. 크기 · 기준점은 public/assets/game/README.md 에 있다. */
const RPG_ART = "/assets/game/rpg";
export const rpgFile = (name) => `${RPG_ART}/${name}.webp`;
// 논리 좌표 기준 크기(w, h)와 기준점(ox, oy = 발밑 · 바닥 가운데)
export const RFRAME = {
  fountain: { w: 260, h: 250, ox: 130, oy: 150 },     // 기준점 = 분수 가운데(900, 620)
  lamp: { w: 64, h: 120, ox: 32, oy: 108 },
  bench: { w: 96, h: 44, ox: 48, oy: 30 },
  gate: { w: 160, h: 210, ox: 80, oy: 150 },          // 기준점 = 문이 서는 자리
  hunter: { w: 84, h: 100, ox: 42, oy: 80 },
  rabbit: { w: 64, h: 56, ox: 32, oy: 46 },
  tree: { w: 100, h: 76, ox: 50, oy: 58 },
};
// 사냥터 나무 그림 — 소나무 셋, 둥근 나무 셋. 크기는 코드에서 배율로 맞춘다.
export const TREE_VARIANTS = [
  { pine: true, seed: 11 }, { pine: true, seed: 47 }, { pine: true, seed: 83 },
  { pine: false, seed: 19 }, { pine: false, seed: 52 }, { pine: false, seed: 90 },
];
const treeVariant = (t) => (t.pine ? 0 : 3) + (Math.floor(t.seed) % 3);
let rpgWarm = 0;
export function warmRpgArt() {
  if (rpgWarm) return;
  rpgWarm = 1;
  ["plaza", "field", "fountain", "lamp", "bench", "gate", "hunter", "rabbit", "rabbit-frozen"].forEach((n) => mapImg(rpgFile(n)));
  TREE_VARIANTS.forEach((_, i) => mapImg(rpgFile(`tree-${i}`)));
}

/* ── 바탕 — 맵마다 한 번만 그려 둔다 ───────────────────────── */
function grass(ctx, M, seed, tone) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = tone[0];
  ctx.fillRect(0, 0, M.w, M.h);
  for (let i = 0; i < M.w * M.h / 9000; i++) {
    const x = rnd() * M.w, y = rnd() * M.h;
    ctx.fillStyle = rnd() < 0.5 ? tone[1] : tone[2];
    ctx.beginPath(); ctx.ellipse(x, y, 30 + rnd() * 70, 12 + rnd() * 26, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(170,210,120,0.22)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < M.w * M.h / 2600; i++) {
    const x = rnd() * M.w, y = rnd() * M.h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 + rnd() * 4, y - 5 - rnd() * 4); ctx.stroke();
  }
}

function treeLine(ctx, M, seed) {
  const rnd = mulberry32(seed);
  const trees = [];
  for (let x = -20; x < M.w + 40; x += 34 + rnd() * 20) {
    trees.push({ x: x + (rnd() - 0.5) * 16, y: 60 + rnd() * (M.top - 70), s: 1.1 + rnd() * 0.6, pine: rnd() < 0.55, seed: rnd() * 999 });
  }
  trees.sort((a, b) => a.y - b.y).forEach((t) => drawTree(ctx, t.x, t.y, t.s, t.pine, t.seed));
  const sh = ctx.createLinearGradient(0, M.top - 30, 0, M.top + 24);
  sh.addColorStop(0, "rgba(20,30,14,0.35)");
  sh.addColorStop(1, "rgba(20,30,14,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, M.top - 30, M.w, 54);
}

function dirtPath(ctx, pts, w) {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#8a7148"; ctx.lineWidth = w + 8;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = "#b39868"; ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function paintPlaza(ctx) {
  const M = MAPS.plaza;
  const rnd = mulberry32(711);
  grass(ctx, M, 31, ["#4f6e34", "rgba(120,160,80,0.10)", "rgba(40,60,26,0.10)"]);
  // 사냥문으로 가는 길
  dirtPath(ctx, [[1380, 690], [1560, 670], [1700, 660]], 70);
  // 돌 바닥 — 분수를 가운데 둔 둥근 광장
  const cx = 900, cy = 640;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, RPG.squash);
  ctx.fillStyle = "#b8ad97";
  ctx.beginPath(); ctx.arc(0, 0, 560, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8d826c"; ctx.lineWidth = 6;
  ctx.stroke();
  // 돌을 동심원으로 깐다
  for (let r = 150; r < 560; r += 44) {
    const n = Math.round((Math.PI * 2 * r) / 52);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + r * 0.01, a1 = a0 + (Math.PI * 2) / n - 0.02;
      ctx.fillStyle = ["#c7bca5", "#bdb29b", "#cfc5ae", "#b3a891"][Math.floor(rnd() * 4)];
      ctx.beginPath();
      ctx.arc(0, 0, r + 40, a0, a1);
      ctx.arc(0, 0, r + 2, a1, a0, true);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(110,98,78,0.35)"; ctx.lineWidth = 2;
  for (let r = 150; r < 560; r += 44) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // 꽃밭 — 광장 둘레
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const x = cx + Math.cos(a) * 640, y = cy + Math.sin(a) * 640 * RPG.squash;
    if (x > 1450 && Math.abs(y - 670) < 120) continue;        // 문으로 가는 길은 비운다
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 0.6);
    ctx.fillStyle = "#5d4630"; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e8f42"; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 16; k++) {
      ctx.fillStyle = ["#f0b8c8", "#f6e3a0", "#e8a0a8", "#fff2f2"][k % 4];
      ctx.beginPath(); ctx.arc((rnd() - 0.5) * 60, (rnd() - 0.5) * 60, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // 가장자리 덤불과 돌
  for (let i = 0; i < 26; i++) {
    const side = rnd() < 0.5;
    const x = side ? 20 + rnd() * 60 : M.w - 20 - rnd() * 60;
    const y = M.top + rnd() * (M.h - M.top - 30);
    if (!side && Math.abs(y - 660) < 140) continue;
    if (rnd() < 0.5) drawRock(ctx, x, y, 0.8 + rnd() * 0.5); else drawBush(ctx, x, y, 0.9 + rnd() * 0.5, rnd() < 0.4);
  }
  for (let x = 30; x < M.w; x += 60 + rnd() * 40) drawBush(ctx, x, M.h - 18, 0.9 + rnd() * 0.4, rnd() < 0.3);
  treeLine(ctx, M, 77);
}

function paintField(ctx) {
  const M = MAPS.field;
  const rnd = mulberry32(919);
  grass(ctx, M, 53, ["#557a37", "rgba(130,170,90,0.10)", "rgba(40,64,26,0.12)"]);
  // 광장으로 돌아가는 길
  dirtPath(ctx, [[60, 920], [240, 920], [420, 860], [600, 880]], 64);
  // 들꽃
  for (let i = 0; i < 420; i++) {
    const x = rnd() * M.w, y = M.top + rnd() * (M.h - M.top);
    ctx.fillStyle = ["#f6f0d8", "#f2d27a", "#e7a8c8", "#bcd8f0"][Math.floor(rnd() * 4)];
    ctx.beginPath(); ctx.arc(x, y, 1.8 + rnd() * 1.4, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * M.w, y = M.top + 40 + rnd() * (M.h - M.top - 60);
    if (x < 700 && Math.abs(y - 880) < 160) continue;
    if (rnd() < 0.45) drawRock(ctx, x, y, 0.8 + rnd() * 0.7); else drawBush(ctx, x, y, 0.9 + rnd() * 0.6, rnd() < 0.35);
  }
  for (let x = 30; x < M.w; x += 60 + rnd() * 40) drawBush(ctx, x, M.h - 18, 0.9 + rnd() * 0.4, rnd() < 0.3);
  treeLine(ctx, M, 99);
}

// 사냥터 가운데 드문드문 선 나무 — 사람보다 앞뒤로 겹쳐 그린다
const FIELD_TREES = (() => {
  const rnd = mulberry32(4401);
  const out = [];
  for (let i = 0; i < 22; i++) {
    const x = 700 + rnd() * 1800, y = 320 + rnd() * 1250;
    out.push({ x, y, s: 1.2 + rnd() * 0.6, pine: rnd() < 0.5, seed: rnd() * 999 });
  }
  return out;
})();
const PLAZA_PROPS = [
  { k: "lamp", x: 560, y: 470 }, { k: "lamp", x: 1240, y: 470 }, { k: "lamp", x: 560, y: 820 }, { k: "lamp", x: 1240, y: 820 },
  { k: "bench", x: 700, y: 900 }, { k: "bench", x: 1100, y: 900 }, { k: "bench", x: 700, y: 360 }, { k: "bench", x: 1100, y: 360 },
];

export const drawTreeBody = drawTree;     // 그림 파일을 뽑을 때 쓴다

function drawFieldTree(ctx, t) {
  const tim = mapImg(rpgFile(`tree-${treeVariant(t)}`));
  if (!tim) return drawTree(ctx, t.x, t.y, t.s, t.pine, t.seed);
  const F = RFRAME.tree;
  ctx.drawImage(tim, t.x - F.ox * t.s, t.y - F.oy * t.s, F.w * t.s, F.h * t.s);
}

export function paintMap(id) {
  const M = MAPS[id];
  const c = document.createElement("canvas");
  c.width = M.w; c.height = M.h;
  const ctx = c.getContext("2d");
  if (id === "plaza") paintPlaza(ctx); else paintField(ctx);
  return c;
}

/* ── 움직이는 것들 ─────────────────────────────────────── */
function drawFountain(ctx, time) {
  const fim = mapImg(rpgFile("fountain"));
  if (fim) ctx.drawImage(fim, 900 - RFRAME.fountain.ox, 620 - RFRAME.fountain.oy, RFRAME.fountain.w, RFRAME.fountain.h);
  else drawFountainBody(ctx, time);
}

// 분수 몸통 — 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawFountainBody(ctx, time) {
  const x = 900, y = 620;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, RPG.squash);
  ctx.fillStyle = "#8d826c"; ctx.beginPath(); ctx.arc(0, 8, 100, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d9d0bd"; ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.fill();
  const wg = ctx.createRadialGradient(0, 0, 10, 0, 0, 82);
  wg.addColorStop(0, "#8fd0ea"); wg.addColorStop(1, "#4d93b8");
  ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(0, 0, 82, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const r = (((time * 30 + i * 27) % 80) + 80) % 80;
    ctx.globalAlpha = 1 - r / 80;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // 가운데 기둥과 솟는 물
  ctx.fillStyle = "#cfc5ae";
  roundRect(ctx, x - 10, y - 58, 20, 58, 5); ctx.fill();
  ctx.fillStyle = "#e6ddca";
  ctx.beginPath(); ctx.ellipse(x, y - 58, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(190,230,250,0.85)";
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + time;
    const p = (time * 1.2 + i * 0.1) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 26 * p, y - 64 - Math.sin(p * Math.PI) * 34 + p * 30, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProp(ctx, o) {
  const pim = mapImg(rpgFile(o.k));
  if (pim) {
    const F = RFRAME[o.k];
    ctx.drawImage(pim, o.x - F.ox, o.y - F.oy, F.w, F.h);
  } else drawPropBody(ctx, o);
}

// 가로등 · 벤치 몸통 — 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawPropBody(ctx, o) {
  if (o.k === "lamp") {
    shadow(ctx, o.x, o.y + 2, 10, 4, 0.25);
    ctx.fillStyle = "#3a3024"; roundRect(ctx, o.x - 3, o.y - 70, 6, 72, 2); ctx.fill();
    ctx.fillStyle = "#2c241b"; roundRect(ctx, o.x - 9, o.y - 86, 18, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffe7a0"; roundRect(ctx, o.x - 6, o.y - 83, 12, 12, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,231,160,0.16)"; ctx.beginPath(); ctx.arc(o.x, o.y - 77, 26, 0, Math.PI * 2); ctx.fill();
  } else if (o.k === "bench") {
    shadow(ctx, o.x, o.y + 3, 40, 6, 0.25);
    ctx.fillStyle = "#6b4a2c"; roundRect(ctx, o.x - 38, o.y - 22, 76, 8, 3); ctx.fill();
    ctx.fillStyle = "#7d5733"; roundRect(ctx, o.x - 38, o.y - 12, 76, 8, 3); ctx.fill();
    ctx.fillStyle = "#3a3024";
    ctx.fillRect(o.x - 32, o.y - 6, 5, 8); ctx.fillRect(o.x + 27, o.y - 6, 5, 8);
  }
}

// 문 몸통 — 바닥 빛 · 문틀 · 안쪽 소용돌이. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawGateBody(ctx, gt, time) {
  const { x, y } = gt;
  // 둥글게 빛나는 문 자리
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, RPG.squash);
  const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, gt.r);
  gl.addColorStop(0, "rgba(190,230,255,0.55)");
  gl.addColorStop(1, "rgba(120,180,230,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, gt.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(200,235,255,0.7)"; ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]); ctx.lineDashOffset = -time * 20;
  ctx.beginPath(); ctx.arc(0, 0, gt.r * 0.9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
  // 나무 문틀
  ctx.fillStyle = "#5d4128";
  roundRect(ctx, x - 50, y - 118, 12, 120, 4); ctx.fill();
  roundRect(ctx, x + 38, y - 118, 12, 120, 4); ctx.fill();
  ctx.fillStyle = "#6f4e30";
  roundRect(ctx, x - 60, y - 130, 120, 18, 6); ctx.fill();
  // 문 안쪽의 소용돌이
  ctx.save();
  ctx.globalAlpha = 0.75;
  const pg = ctx.createLinearGradient(x, y - 112, x, y);
  pg.addColorStop(0, "rgba(150,210,255,0.2)");
  pg.addColorStop(1, "rgba(150,210,255,0.6)");
  ctx.fillStyle = pg;
  ctx.fillRect(x - 38, y - 112, 76, 112);
  ctx.strokeStyle = "rgba(230,245,255,0.8)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const p = (time * 0.6 + i / 4) % 1;
    ctx.globalAlpha = 0.8 * (1 - p);
    ctx.beginPath(); ctx.ellipse(x, y - 56, 34 * p + 4, 50 * p + 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawGate(ctx, gt, time) {
  const { x, y } = gt;
  const gim = mapImg(rpgFile("gate"));
  if (gim) ctx.drawImage(gim, x - RFRAME.gate.ox, y - RFRAME.gate.oy, RFRAME.gate.w, RFRAME.gate.h);
  else drawGateBody(ctx, gt, time);
  // 팻말
  ctx.save();
  ctx.font = "15px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(gt.label).width + 22;
  ctx.fillStyle = "#3b2c1b"; roundRect(ctx, x - w / 2, y - 158, w, 24, 7); ctx.fill();
  ctx.strokeStyle = "#8a6a3f"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#f6e5bb";
  ctx.fillText(gt.label, x, y - 145);
  ctx.restore();
}

// 사냥꾼 몸통 — 그림자와 활 · 망토 · 얼굴 · 모자. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawNpcBody(ctx, x, y, bob) {
  shadow(ctx, x, y + 2, 18, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  // 활 — 등에 멘다
  ctx.strokeStyle = "#7d5733"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(-6, -34, 20, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = "rgba(240,230,210,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6 + Math.cos(-1.2) * 20, -34 + Math.sin(-1.2) * 20); ctx.lineTo(-6 + Math.cos(1.2) * 20, -34 + Math.sin(1.2) * 20); ctx.stroke();
  // 망토와 몸
  ctx.fillStyle = "#4d6b3a";
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-12, -38); ctx.lineTo(12, -38); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7a5634"; ctx.fillRect(-12, -18, 24, 4);
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-9, -2, 6, 4); ctx.fillRect(3, -2, 6, 4);
  // 얼굴과 모자
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.5, -46, 1.4, 0, Math.PI * 2); ctx.arc(3.5, -46, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6b4a2c";
  ctx.beginPath(); ctx.ellipse(0, -54, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -54); ctx.lineTo(-5, -66); ctx.lineTo(8, -64); ctx.lineTo(9, -54); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c9433b"; ctx.fillRect(-9, -57, 18, 3);
  ctx.restore();
}

function drawNpc(ctx, g, n, time) {
  const { x, y } = n;
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const bob = Math.sin(time * 2) * 1.2;
  const him = mapImg(rpgFile("hunter"));
  if (him) ctx.drawImage(him, x - RFRAME.hunter.ox, y + bob - RFRAME.hunter.oy, RFRAME.hunter.w, RFRAME.hunter.h);
  else drawNpcBody(ctx, x, y, bob);

  // 머리 위 표시 — 받을 퀘스트가 있으면 느낌표, 하는 중이면 몇 마리 잡았는지
  const q = me ? me.quest : null;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (q && q.on) {
    ctx.font = "13px 'Do Hyeon', sans-serif";
    const t = `토끼 ${q.n}/${QUEST.need}`;
    const w = ctx.measureText(t).width + 16;
    ctx.fillStyle = "rgba(20,14,10,0.78)"; roundRect(ctx, x - w / 2, y - 100, w, 20, 8); ctx.fill();
    ctx.fillStyle = "#e8dcc0"; ctx.fillText(t, x, y - 90);
  } else {
    const jump = Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "28px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
    ctx.strokeText("!", x, y - 94 + jump);
    ctx.fillStyle = "#ffd873"; ctx.fillText("!", x, y - 94 + jump);
  }
  // 이름
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#ffe08a"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

// 토끼 몸통 — 꼬리 · 몸 · 머리 · 귀. 발밑이 원점이고 오른쪽을 본다. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawRabbitBody(ctx, frozen) {
  const fur = frozen ? "#cfe8f6" : "#f3ede0";
  const shade = frozen ? "#a8cde4" : "#d9cfbd";
  // 꼬리 · 몸
  ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(-13, -9, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-2, -9, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(-3, -4, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  // 머리 · 귀
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.arc(9, -15, 7, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(7, -20); ctx.rotate(-0.25);
  ctx.beginPath(); ctx.ellipse(0, -8, 3, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2b9c4"; ctx.beginPath(); ctx.ellipse(0, -8, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(11, -20); ctx.rotate(0.2); ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, -8, 3, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2b9c4"; ctx.beginPath(); ctx.ellipse(0, -8, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#2a1f13"; ctx.beginPath(); ctx.arc(11, -16, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e88a9c"; ctx.beginPath(); ctx.arc(15.5, -14, 1.3, 0, Math.PI * 2); ctx.fill();
}

function drawRabbit(ctx, m, time) {
  const hop = m.moving ? Math.abs(Math.sin(m.age * 13)) * 7 : 0;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 13 * grow, 4 * grow, 0.25);
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow, grow);
  const rim = mapImg(rpgFile(m.freeze > 0 ? "rabbit-frozen" : "rabbit"));
  if (rim) ctx.drawImage(rim, -RFRAME.rabbit.ox, -RFRAME.rabbit.oy, RFRAME.rabbit.w, RFRAME.rabbit.h);
  else drawRabbitBody(ctx, m.freeze > 0);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(1, -11, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // 걸린 것 — 불 · 독 · 기절
  if (m.burn > 0 || m.poison > 0) {
    ctx.fillStyle = m.burn > 0 ? "rgba(245,140,40,0.8)" : "rgba(150,220,90,0.7)";
    for (let k = 0; k < 3; k++) {
      const p = (time * 1.5 + k / 3) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.arc(x + (k - 1) * 6, y - 14 - p * 16, 2.2 + p * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (m.stun > 0) {
    ctx.fillStyle = "#ffe27a";
    for (let k = 0; k < 3; k++) {
      const a = time * 5 + (k / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, y - 32 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (m.hp < m.max) {
    const bw = 26, r = Math.max(0, m.hp / m.max);
    ctx.fillStyle = "rgba(20,16,12,0.75)"; roundRect(ctx, x - bw / 2 - 1, y - 40, bw + 2, 5, 2); ctx.fill();
    ctx.fillStyle = r > 0.5 ? "#8fd07f" : "#e5a93e"; roundRect(ctx, x - bw / 2, y - 39, Math.max(1.5, bw * r), 3, 1.5); ctx.fill();
  }
}

function drawHero(ctx, g, h, time) {
  const pi = h.pi;
  const col = P[pi];
  const mine = g.mySeat === pi;
  const down = h.down > 0;
  const im = classArt(pi);
  const bob = down ? 0 : Math.abs(Math.sin(time * 3 + pi)) * -1.5;
  const y = h.y + bob;

  ctx.save();
  ctx.translate(h.x, h.y + 2);
  ctx.scale(1, 0.36);
  ctx.globalAlpha = mine ? 0.55 : 0.35;
  ctx.strokeStyle = col.light;
  ctx.lineWidth = mine ? 5 : 3.5;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  if (mine) {
    ctx.globalAlpha = 0.2; ctx.fillStyle = col.key; ctx.fill();
    const full = 1 - Math.min(1, h.sk / RPG.skillCd);
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = h.sk > 0 ? col.key : "#ffe08a";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * full); ctx.stroke();
  }
  ctx.restore();
  if (h.guard > 0) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ffeec2"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 28, 22, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  ctx.save();
  shadow(ctx, h.x, h.y + 3, 15, 5, 0.3);
  ctx.translate(h.x, y);
  if (down) { ctx.rotate(-0.9 * h.dir); ctx.translate(0, 10); ctx.globalAlpha = 0.5; }
  const lunge = h.swing > 0 ? Math.sin((h.swing / 0.25) * Math.PI) * 4 : 0;
  ctx.translate(h.dir * lunge, 0);
  ctx.scale(h.dir < 0 ? -1 : 1, 1);
  if (im) {
    const ww = HERO_H * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, -ww / 2, -HERO_H, ww, HERO_H);
    if (h.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.5, h.flash * 3);
      ctx.drawImage(im, -ww / 2, -HERO_H, ww, HERO_H);
    }
  } else {
    ctx.fillStyle = col.key; roundRect(ctx, -9, -34, 18, 34, 7); ctx.fill();
  }
  ctx.restore();

  // 체력 · 레벨 · 이름
  const bw = 40, byy = h.y - HERO_H - 10;
  const r = Math.max(0, Math.min(1, h.hp / (h.max || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(18,12,8,0.8)"; roundRect(ctx, h.x - bw / 2 - 1, byy - 1, bw + 2, 6, 3); ctx.fill();
  ctx.fillStyle = down ? "#6a5a52" : r > 0.5 ? "#8fd07f" : r > 0.25 ? "#e8c05e" : "#ef8b7c";
  roundRect(ctx, h.x - bw / 2, byy, Math.max(1.5, bw * r), 4, 2); ctx.fill();
  ctx.font = "10.5px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const nm = `Lv${h.lv} ${(g.names && g.names[pi]) || CLASSES[pi].name}`;
  const wdt = ctx.measureText(nm).width + 12;
  ctx.fillStyle = "rgba(20,14,10,0.72)"; roundRect(ctx, h.x - wdt / 2, h.y + 6, wdt, 15, 7); ctx.fill();
  ctx.fillStyle = down ? "#a89a90" : col.light; ctx.fillText(nm, h.x, h.y + 14);
  if (down) {
    ctx.fillStyle = "#ffbdb2"; ctx.font = "11px 'Jua', sans-serif";
    ctx.fillText(`${Math.ceil(h.down)}초 뒤 광장에서`, h.x, byy - 10);
  }
  ctx.restore();
}

/* 내 영웅을 따라가는 화면 — 맵 끝에 닿으면 멈춘다 */
function follow(g, M) {
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const tx = me ? me.x - W / 2 : (M.w - W) / 2;
  const ty = me ? me.y - H / 2 - 20 : (M.h - H) / 2;
  const cx = Math.max(0, Math.min(M.w - W, tx));
  const cy = Math.max(0, Math.min(M.h - H, ty));
  if (!g.cam || g.cam.map !== M.id) g.cam = { x: cx, y: cy, map: M.id };
  else { g.cam.x += (cx - g.cam.x) * 0.2; g.cam.y += (cy - g.cam.y) * 0.2; }
  return g.cam;
}

export function drawRpg(ctx, g, bgs) {
  fxWarmUp();
  const time = g.t;
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const M = MAPS[me ? me.map : "plaza"];
  const cam = follow(g, M);
  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 6;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  warmRpgArt();
  const bim = mapImg(rpgFile(M.id));
  if (bim) {
    // 파일이 얼마나 크든 맵 크기에 맞춰 자른다
    const kx = bim.naturalWidth / M.w, ky = bim.naturalHeight / M.h;
    ctx.drawImage(bim, cam.x * kx, cam.y * ky, W * kx, H * ky, 0, 0, W, H);
  } else if (mapImgFailed(rpgFile(M.id))) {          // 파일이 없을 때만 예전처럼 코드로 그린다
    const bg = (bgs && bgs[M.id]) || (bgs && (bgs[M.id] = paintMap(M.id)));
    if (bg) ctx.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
  } else { ctx.fillStyle = M.id === "plaza" ? "#4f6e34" : "#557a37"; ctx.fillRect(0, 0, W, H); }
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  const inView = (x, y, pad = 160) => x > cam.x - pad && x < cam.x + W + pad && y > cam.y - pad && y < cam.y + H + pad;

  // 내 사거리 — 토끼가 들어오면 또렷해진다
  if (me && me.down <= 0 && !M.safe) {
    const rr = heroRange(me);
    const on = g.mobs.some((m) => m.map === M.id && dist(me.x, me.y, m.x, m.y) <= rr);
    ctx.save();
    ctx.translate(me.x, me.y); ctx.scale(1, RPG.squash);
    ctx.globalAlpha = on ? 0.09 : 0.04; ctx.fillStyle = P[g.mySeat].key;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.5 : 0.25; ctx.strokeStyle = P[g.mySeat].light; ctx.lineWidth = 1.4;
    ctx.setLineDash(on ? [] : [8, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  const here = (f) => !f.map || f.map === M.id;
  g.fx.forEach((f) => { if (here(f) && f.kind === "art" && !(FX_ART[f.art] || {}).over) drawFx(ctx, f); });

  // 앞뒤로 겹치게 — 위에 선 것부터 그린다
  const order = [];
  M.gates.forEach((gt) => order.push({ y: gt.y - 4, gate: gt }));
  M.npcs.forEach((n) => order.push({ y: n.y, npc: n }));
  if (M.id === "plaza") {
    order.push({ y: 620, fountain: 1 });
    PLAZA_PROPS.forEach((o) => order.push({ y: o.y, prop: o }));
  } else {
    FIELD_TREES.forEach((t) => { if (inView(t.x, t.y)) order.push({ y: t.y, tree: t }); });
  }
  g.mobs.forEach((m) => { if (!m.dead && m.map === M.id && inView(m.x, m.y)) order.push({ y: m.y, m }); });
  g.heroes.forEach((h) => { if (h && h.map === M.id) order.push({ y: h.y, h }); });
  order.sort((a, b) => a.y - b.y);
  order.forEach((o) => {
    if (o.m) drawRabbit(ctx, o.m, time);
    else if (o.h) drawHero(ctx, g, o.h, time);
    else if (o.gate) drawGate(ctx, o.gate, time);
    else if (o.npc) drawNpc(ctx, g, o.npc, time);
    else if (o.fountain) drawFountain(ctx, time);
    else if (o.prop) drawProp(ctx, o.prop);
    else if (o.tree) drawFieldTree(ctx, o.tree);
  });

  g.fx.forEach((f) => { if (here(f) && (f.kind !== "art" || (FX_ART[f.art] || {}).over)) drawFx(ctx, f); });
  ctx.globalAlpha = 1;
  ctx.restore();
  if (g.banner) drawBanner(ctx, g.banner);
}
