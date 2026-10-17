/* RPG 모드 그리기 — 광장과 사냥터, 영웅, 토끼, 사냥꾼, 문.
   맵은 화면보다 넓다. 내 영웅을 따라 화면(카메라)이 움직인다. */
import { W, H } from "./world.js";
import {
  roundRect, shadow, mulberry32, drawRock, drawBush,
  drawFx, drawBanner, fxWarmUp, FX_ART, mapImg, mapImgFailed,
  sprite, drawSprite, ANIM_T, SR, CR, DR, drawTreeArt, drawTree,
} from "./art.js";
import { RPG, MAPS, QUEST, dist, heroRange, elemOf, heroArtPath, mobName, titleName, heldSpecial, whyReqDone } from "./rpg.js";
import { REQ_BY_NPC, REQUESTS } from "./requestData.js";
import { DG_LOOKS } from "./dungeonData.js";
import { SHOP_BY_ID, SPECIAL_BY_ID, specialArt } from "./shop.js";

/* 캐릭터 그림은 시트 배율 그대로 줄인다 — 방향마다 그림 크기가 달라도 키가 같게 보인다.
   원본 시트에서 캐릭터 키는 대략 280px 이고, 그림 아래에 6px 여백이 있다. */
const HERO_K = 66 / 280;
const HERO_PAD = 6;
const heroCache = {};
function heroImg(h, view) {
  if (typeof Image === "undefined") return null;
  const src = heroArtPath(h, view);
  let im = heroCache[src];
  if (im === undefined) {
    im = heroCache[src] = new Image();
    im.onerror = () => { heroCache[src] = null; };
    im.src = src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
/* 전사가 장착한 특별 무기를 손에 든다 — 칼을 지운 그림(<보기>-bare.webp, tools/bare-warrior.py)에 무기 그림을 얹는다.
   WARRIOR_HAND: 성별 · 보기마다 손 [x, y]와 칼날 방향(도) — 원래 그림 크기 기준, bare-warrior.py 가 출력한 값.
   WEAPON_GRIP: 무기 그림(128px)의 손잡이 [x, y] → 칼끝 [x, y]. 손잡이를 손에 맞추고 칼끝을 칼날 방향으로 돌린다 */
const WARRIOR_HAND = {
  m: { front: [60, 213, 124], turn: [122, 201, 48], side: [72, 194, 134], back: [103, 188, 59] },
  f: { front: [94, 205, 123], turn: [71, 197, 133], side: [46, 197, 125], back: [95, 198, 62] },
};
const WEAPON_GRIP = {
  clockwork: [28, 26, 122, 122], coral: [26, 102, 120, 4], flame: [97, 94, 4, 4], forest: [95, 104, 12, 6],
  frost: [100, 100, 6, 4], holy: [92, 94, 12, 10], shadow: [104, 108, 12, 6], star: [102, 102, 6, 6],
  thunder: [24, 100, 120, 6], viper: [36, 44, 122, 118],
  // 지팡이 — 손잡이 → 머리, 활 — 손잡이 → 위쪽 끝
  moon_staff: [64, 72, 63, 8], ice_staff: [55, 68, 112, 10], skull_staff: [70, 66, 12, 10], flame_staff: [52, 50, 104, 104],
  thunder_staff: [68, 78, 24, 34], galaxy_staff: [64, 78, 64, 10], holy_staff: [50, 68, 96, 20],
  thunder_bow: [56, 64, 10, 8], lava_bow: [71, 64, 23, 8], shadow_bow: [66, 56, 22, 10], star_bow: [66, 60, 16, 12], gold_bow: [71, 52, 12, 12],
};
// 활 그림에서 활줄이 놓인 쪽 — 손잡이 → 위쪽 끝을 보고 왼쪽(-1) · 오른쪽(1). 손에 든 쪽과 다르면 뒤집어 활줄이 몸 쪽을 향하게 한다
const BOW_STRING = { thunder_bow: -1, lava_bow: 1, shadow_bow: 1, star_bow: -1, gold_bow: -1 };
/* 마법사는 특별 지팡이, 궁수는 특별 활을 장착하면 원래 무기를 지운 그림(<보기>-bare.webp, tools/bare-holders.py)에 그 무기를 손에 들려 그린다.
   HOLDER_HAND: 직업 · 성별 · 보기마다 손 [x, y]와 무기 방향(도, 손 → 지팡이 머리 · 활 위쪽 끝)과 그 길이(px) — 원래 그림 크기 기준.
   무기가 몸에 가려 보이지 않는 보기(마법사 옆 · 뒤 등)는 원래 그림을 그대로 쓴다 */
const HOLDER = { mage: "staff", archer: "bow" };     // 직업 → 손에 드는 무기 종류
const HOLDER_HAND = {
  mage: {
    m: { front: [148, 200, -72, 76], turn: [40, 200, -92, 62] },
    f: { front: [152, 193, -69, 70], turn: [37, 186, -103, 59] },
  },
  archer: {
    // 다섯째 값 — 활줄이 놓여야 할 쪽(몸 쪽). 몸 오른쪽에 든 활은 -1, 왼쪽에 든 활은 1
    m: { front: [126, 196, -65, 84, -1], turn: [117, 194, -70, 79, -1] },
    f: { front: [150, 190, -72, 86, -1], turn: [26, 176, -102, 57, 1], side: [34, 160, -110, 69, 1], back: [22, 168, -99, 61, 1] },
  },
};
const HELD_LEN = 30;                                  // 손잡이 → 칼끝 길이(화면 px). 원래 칼은 약 22
const BASIC_LEN = 23;                                 // 특별 무기가 없을 때 코드로 그리는 기본 검 길이
// 검 휘두르기 — 공격하면 t 초 동안: 머리 위로 들어 올렸다가(0~up) 앞으로 내리치고(~hit) 제자리로(~1).
// 전사 평타는 친 순간 바로 맞고 베기 연출(slash)도 0.24초라, 거의 바로 올려 0.1초 안에 내리치고 0.24초에 끝낸다(평타 간격 0.55초보다 짧게).
// 각도는 오른쪽을 보는 모습 기준(도). 왼쪽을 보는 그림(turn · side)은 좌우로 뒤집어 쓴다
const SWING = { t: 0.24, up: 0.12, hit: 0.5, raise: 245, strike: 385 };
const HELD_TYPE = { dagger: 0.8, great: 1.15 };        // 단검은 짧게, 대검은 길게
const weaponCache = {};
function weaponImg(sp) {
  if (typeof Image === "undefined") return null;
  const src = specialArt(sp);
  let im = weaponCache[src];
  if (im === undefined) {
    im = weaponCache[src] = new Image();
    im.onerror = () => { weaponCache[src] = null; };
    im.src = src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// 전사가 손에 든 검 — 칼 지운 몸 그림이 있으면 늘 이 길로 그린다(휘두를 수 있게).
// 특별 무기를 장착했고 그 그림이 있으면 그 무기, 아니면 코드로 그린 기본 검
function heldWeapon(h, view) {
  if (HOLDER[h.job]) {
    const sp = SPECIAL_BY_ID[heldSpecial(h)];
    const hand = sp && sp.t === HOLDER[h.job] && HOLDER_HAND[h.job][h.gender === "f" ? "f" : "m"][view];
    const grip = hand && WEAPON_GRIP[sp.art];
    const wpn = grip && weaponImg(sp);
    const body = wpn && heroImg(h, `${view}-bare`);
    if (!body) return null;                         // 그림이 없으면 원래 그림(원래 무기)을 그대로
    const mirror = !!hand[4] && !!BOW_STRING[sp.art] && hand[4] !== BOW_STRING[sp.art];
    return { body, hand, wpn, grip, len: hand[3] * HERO_K, still: true, mirror };
  }
  if (h.job !== "warrior") return null;
  const hand = WARRIOR_HAND[h.gender === "f" ? "f" : "m"][view];
  const body = hand && heroImg(h, `${view}-bare`);
  if (!body) return null;
  const sp = SPECIAL_BY_ID[heldSpecial(h)];
  const grip = sp && WEAPON_GRIP[sp.art];
  const wpn = grip ? weaponImg(sp) : null;
  return { body, hand, wpn, grip, len: wpn ? HELD_LEN * (HELD_TYPE[sp.t] || 1) : BASIC_LEN,
    left: view === "turn" || view === "side" };
}
// 공격할 때 검 각도(도) — 휘두르는 중이 아니면 null
function swingAngle(h, held, time) {
  const a = h.anim;
  if (!a || held.still) return null;               // 지팡이 · 활은 휘두르지 않는다
  if (h.swing > 0 && !(a.sw > 0)) a.swAt = time;    // 새로 쳤다
  a.sw = h.swing;
  const p = a.swAt === undefined ? 1 : (time - a.swAt) / SWING.t;
  if (p < 0 || p >= 1) return null;
  const f = (d) => (held.left ? 180 - d : d);
  const rest = held.hand[2], up = f(SWING.raise), hit = f(SWING.strike);
  const back = held.left ? rest - 360 : rest + 360;
  const ease = (x) => 1 - (1 - x) * (1 - x);
  if (p < SWING.up) return { ang: rest + (up - rest) * ease(p / SWING.up), trail: 0 };
  if (p < SWING.hit) {
    const q = (p - SWING.up) / (SWING.hit - SWING.up);
    return { ang: up + (hit - up) * ease(q), from: up, trail: 1 - q * 0.4 };
  }
  const q = (p - SWING.hit) / (1 - SWING.hit);
  return { ang: hit + (back - hit) * q, from: up, to: hit, trail: (1 - q) * 0.6 };
}
// 코드로 그린 기본 검 — +x 쪽으로 뻗는다. 원래 그림의 칼처럼 옅은 회색 날 · 갈색 손잡이
function drawBasicSword(ctx, len) {
  ctx.lineJoin = "round";
  ctx.fillStyle = "#6b4a32"; ctx.strokeStyle = "rgba(34,24,18,0.9)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(-4, -1.3, 7, 2.6, 1); ctx.fill(); ctx.stroke();          // 손잡이
  ctx.beginPath(); ctx.roundRect(2.6, -3.6, 1.8, 7.2, 0.8); ctx.fill(); ctx.stroke();      // 날밑
  ctx.fillStyle = "#e8e4dc";
  ctx.beginPath();
  ctx.moveTo(4.4, -1.6); ctx.lineTo(len - 3.2, -1.6); ctx.lineTo(len, 0); ctx.lineTo(len - 3.2, 1.6); ctx.lineTo(4.4, 1.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(5.5, -0.5); ctx.lineTo(len - 4, -0.5); ctx.stroke();
}
function drawHeld(ctx, held, ww, top, sw, col) {
  const { wpn, grip, hand, len } = held;
  const deg = sw ? sw.ang : hand[2];
  ctx.save();
  ctx.translate(-ww / 2 + hand[0] * HERO_K, top + hand[1] * HERO_K);
  if (sw && sw.trail > 0 && sw.from !== undefined) {   // 휘두른 자리에 남는 빛 자국
    const a0 = (sw.from * Math.PI) / 180, a1 = ((sw.to ?? sw.ang) * Math.PI) / 180;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 * sw.trail;
    ctx.strokeStyle = col || "#fff1c8";
    ctx.lineCap = "round";
    [[len * 0.95, 4], [len * 0.7, 2.5]].forEach(([r, w]) => {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(0, 0, r, a0, a1, held.left); ctx.stroke();
    });
    ctx.restore();
  }
  ctx.rotate((deg * Math.PI) / 180);
  if (held.mirror) ctx.scale(1, -1);               // 무기 축을 따라 뒤집는다(활줄을 몸 쪽으로)
  if (wpn) {
    const [gx, gy, tx, ty] = grip;
    const k = len / Math.hypot(tx - gx, ty - gy);
    ctx.rotate(-Math.atan2(ty - gy, tx - gx));
    ctx.scale(k, k);
    ctx.drawImage(wpn, -gx, -gy);
  } else {
    drawBasicSword(ctx, len);
  }
  ctx.restore();
}

/* 보는 쪽에 맞는 그림 — 앞 그림은 오른쪽을, turn 은 왼쪽을 비스듬히 본다. 옆 그림은 왼쪽을 본다.
   flip 은 좌우로 뒤집어 그릴지 */
function heroView(h) {
  if (h.face === 2) return { view: "back", flip: false };
  if (h.face === 1) return { view: "side", flip: h.dir > 0 };
  return { view: h.dir < 0 ? "turn" : "front", flip: false };
}

/* ── 이미지 그림 ─────────────────────────────────────────────
   광장 · 사냥터 바탕과 분수 · 문 · 사냥꾼 · 토끼 같은 것들은 public/assets/game/rpg 의 그림 파일을 얹는다.
   못 불러오면 예전처럼 코드로 그린다. 크기 · 기준점은 public/assets/game/README.md 에 있다. */
const RPG_ART = "/assets/game/rpg";
export const rpgFile = (name) => `${RPG_ART}/${name}.webp`;
// 논리 좌표 기준 크기(w, h)와 기준점(ox, oy = 발밑 · 바닥 가운데)
export const RFRAME = {
  fountain: { w: 220, h: 185, ox: 110, oy: 95 },      // 기준점 = 분수 가운데(900, 620)
  lamp: { w: 64, h: 120, ox: 32, oy: 108 },
  bench: { w: 96, h: 44, ox: 48, oy: 30 },
  gate: { w: 130, h: 190, ox: 65, oy: 138 },          // 기준점 = 문이 서는 자리
  hunter: { w: 84, h: 100, ox: 42, oy: 80 },
  rabbit: { w: 64, h: 56, ox: 32, oy: 46 },
};
let rpgWarm = 0;
export function warmRpgArt() {
  if (rpgWarm) return;
  rpgWarm = 1;
  ["plaza", "field", "lamp", "bench", "hunter", "rabbit", "rabbit-frozen"].forEach((n) => mapImg(rpgFile(n)));
  sprite("rpg/fountain"); sprite("rpg/gate");
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

function paintField(ctx, M) {
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

// 사냥터 가운데 드문드문 선 나무 — 사람보다 앞뒤로 겹쳐 그린다. 늘어난 끝쪽까지 심고, 늑대 사냥터는 소나무가 빽빽하다.
function plantTrees(seed, n, x0, x1, pineRate, skip) {
  const rnd = mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), y = 320 + rnd() * 1250;
    const t = { x, y, s: 1.2 + rnd() * 0.6, pine: rnd() < pineRate, seed: rnd() * 999 };
    if (!skip || !skip(t)) out.push(t);
  }
  return out;
}
const nearGate = (M) => (t) => M.gates.some((q) => Math.hypot(t.x - q.x, t.y - q.y) < 240);
const MAP_TREES = {
  field: [...plantTrees(4401, 22, 700, 2500, 0.5), ...plantTrees(4402, 12, 2500, 3500, 0.55, nearGate(MAPS.field))],
  wolf: plantTrees(4403, 46, 500, 3450, 0.8, nearGate(MAPS.wolf)),
  boar: plantTrees(4404, 40, 500, 4050, 0.3, nearGate(MAPS.boar)),    // 멧돼지 사냥터 — 둥근 나무가 많다
  gorilla: plantTrees(4405, 62, 500, 4500, 0.12, nearGate(MAPS.gorilla)),   // 고릴라 사냥터 — 빽빽한 활엽수 밀림
  goblin: plantTrees(4406, 34, 500, 4450, 0.25, nearGate(MAPS.goblin)),     // 고블린 늪지 — 듬성듬성
  orc: plantTrees(4407, 24, 500, 4650, 0.7, nearGate(MAPS.orc)),            // 오크 언덕 — 바늘잎나무가 드물다
  ogre: plantTrees(4408, 40, 500, 4850, 0.9, nearGate(MAPS.ogre)),          // 오우거 골짜기 — 어두운 바늘잎나무
};
const PLAZA_PROPS = [
  { k: "lamp", x: 560, y: 470 }, { k: "lamp", x: 1240, y: 470 }, { k: "lamp", x: 560, y: 820 }, { k: "lamp", x: 1240, y: 820 },
  { k: "bench", x: 700, y: 900 }, { k: "bench", x: 1100, y: 900 }, { k: "bench", x: 700, y: 360 }, { k: "bench", x: 1100, y: 360 },
];

function drawFieldTree(ctx, t) { drawTreeArt(ctx, t.x, t.y, t.s, t.pine, t.seed); }


/* ── 던전 바닥 — 그림 파일 없이 코드로 그린다(빛깔은 dungeonData.js DG_LOOKS) ─────────────
   위쪽은 벽돌 벽과 기둥 · 횃불 받침, 바닥은 엇갈린 돌 타일 · 금 · 빛나는 틈 · 돌 부스러기, 가장자리는 어둡게.
   던전마다 한 번 그려 두고(한 번에 하나만 남긴다), 횃불 불꽃만 매 프레임 흔들어 그린다(drawTorches) */
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const TORCH_GAP = 400;                                  // 벽의 횃불 간격
export function paintDungeon(M) {
  const L = DG_LOOKS[M.dungeon] || DG_LOOKS.stone1;
  const c = document.createElement("canvas");
  c.width = M.w; c.height = M.h;
  const ctx = c.getContext("2d");
  const rnd = mulberry32(7000 + (M.slot || 0) * 13 + M.dungeon.length * 101);
  ctx.fillStyle = L.floor; ctx.fillRect(0, 0, M.w, M.h);
  // 바닥 돌 타일 — 줄마다 반 칸씩 엇갈린다
  const TW = 120, TH = 62;
  for (let r = 0, y = M.top; y < M.h; r++, y += TH) {
    for (let x = (r % 2 ? -TW / 2 : 0); x < M.w; x += TW) {
      ctx.fillStyle = shade(L.tile, 0.86 + rnd() * 0.24);
      roundRect(ctx, x + 2, y + 2, TW - 4, TH - 4, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x + 6, y + 4, TW - 12, 2);   // 윗면 빛
    }
  }
  ctx.strokeStyle = L.line; ctx.lineWidth = 2;
  for (let y = M.top; y < M.h; y += TH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(M.w, y); ctx.stroke(); }
  // 금 · 빛나는 틈
  const crack = () => {
    let x = rnd() * M.w, y = M.top + 30 + rnd() * (M.h - M.top - 60);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  };
  ctx.strokeStyle = shade(L.line, 0.9); ctx.lineWidth = 1.2;
  for (let i = 0; i < 45; i++) crack();
  ctx.save();
  ctx.strokeStyle = L.glow; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.shadowColor = L.glow; ctx.shadowBlur = 10;
  for (let i = 0; i < 16; i++) crack();
  ctx.restore();
  // 얼룩 · 돌 부스러기
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(rnd() * M.w, M.top + rnd() * (M.h - M.top), 30 + rnd() * 80, 10 + rnd() * 24, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = rnd() * M.w, y = rnd() < 0.5 ? M.top + 6 + rnd() * 40 : M.top + rnd() * (M.h - M.top);
    ctx.fillStyle = shade(L.tile, 0.6 + rnd() * 0.5);
    ctx.beginPath(); ctx.ellipse(x, y, 3 + rnd() * 7, 2 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // 위쪽 벽 — 벽돌 · 기둥 · 횃불 받침
  ctx.fillStyle = L.wall; ctx.fillRect(0, 0, M.w, M.top);
  const BW = 64, BH = 26;
  for (let r = 0, y = 0; y < M.top - 8; r++, y += BH) {
    for (let x = (r % 2 ? -BW / 2 : 0); x < M.w; x += BW) {
      ctx.fillStyle = shade(L.wall, 1.05 + rnd() * 0.3);
      ctx.fillRect(x + 2, y + 2, BW - 4, BH - 4);
    }
  }
  for (let x = TORCH_GAP / 2 - 200; x < M.w + 100; x += TORCH_GAP) {   // 기둥 — 횃불 사이
    ctx.fillStyle = shade(L.wall, 1.5); ctx.fillRect(x - 22, 0, 44, M.top + 10);
    ctx.fillStyle = shade(L.wall, 0.8); ctx.fillRect(x + 14, 0, 8, M.top + 10);
    ctx.fillStyle = shade(L.wall, 1.8); ctx.fillRect(x - 28, M.top - 4, 56, 14);
  }
  for (let x = TORCH_GAP / 2; x < M.w; x += TORCH_GAP) {              // 횃불 받침
    ctx.fillStyle = "#2a1e14"; ctx.fillRect(x - 3, M.top - 64, 6, 26);
    ctx.fillStyle = "#4a3624"; ctx.fillRect(x - 9, M.top - 70, 18, 8);
  }
  const wallShade = ctx.createLinearGradient(0, M.top - 6, 0, M.top + 60);   // 벽 밑 그늘
  wallShade.addColorStop(0, "rgba(0,0,0,0.55)"); wallShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wallShade; ctx.fillRect(0, M.top - 6, M.w, 66);
  // 가장자리를 어둡게
  const edge = (x0, y0, x1, y1, w, h) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
  };
  edge(0, 0, 160, 0, 160, M.h); edge(M.w, 0, M.w - 160, 0, 160, M.h); edge(0, M.h, 0, M.h - 140, M.w, 140);
  return c;
}
// 던전 어둠 — 내 캐릭터 둘레는 밝고 멀수록 어둡다(피해 숫자 · 연출은 이 위에 그려 가리지 않는다)
const DG_DARK = { near: 260, far: 760, alpha: 0.5 };
function drawDungeonDark(ctx, me, cam) {               // 월드 좌표로 그린다(카메라만큼 옮겨진 상태)
  const x = me ? me.x : cam.x + W / 2, y = me ? me.y - 40 : cam.y + H / 2;
  const g = ctx.createRadialGradient(x, y, DG_DARK.near, x, y, DG_DARK.far);
  g.addColorStop(0, "rgba(6,4,2,0)"); g.addColorStop(1, `rgba(6,4,2,${DG_DARK.alpha})`);
  ctx.fillStyle = g; ctx.fillRect(cam.x - 20, cam.y - 20, W + 40, H + 40);
}
// 횃불 불꽃 — 흔들리는 불과 둘레 빛
function drawTorches(ctx, M, cam, time) {
  const L = DG_LOOKS[M.dungeon] || DG_LOOKS.stone1;
  for (let x = TORCH_GAP / 2; x < M.w; x += TORCH_GAP) {
    if (x < cam.x - 120 || x > cam.x + W + 120) continue;
    const y = M.top - 76, f = Math.sin(time * 11 + x) * 0.5 + Math.sin(time * 17 + x * 0.3) * 0.5;
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 120 + f * 8);
    glow.addColorStop(0, `${L.fire}55`); glow.addColorStop(1, `${L.fire}00`);
    ctx.fillStyle = glow; ctx.fillRect(x - 130, y - 130, 260, 260);
    ctx.fillStyle = L.fire;
    ctx.beginPath(); ctx.ellipse(x, y - 4 - f, 6, 12 + f * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff4d0";
    ctx.beginPath(); ctx.ellipse(x, y - 1, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function paintMap(id) {
  const M = MAPS[id];
  const c = document.createElement("canvas");
  c.width = M.w; c.height = M.h;
  const ctx = c.getContext("2d");
  if (id === "plaza") paintPlaza(ctx); else paintField(ctx, M);
  return c;
}

/* ── 움직이는 것들 ─────────────────────────────────────── */
function drawFountain(ctx, time) {
  const fs = sprite("rpg/fountain");
  if (fs) drawSprite(ctx, fs, 900 - RFRAME.fountain.ox, 620 - RFRAME.fountain.oy, RFRAME.fountain.w, RFRAME.fountain.h, time);
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
    const r = (((time * (160 / ANIM_T) + i * 27) % 80) + 80) % 80;     // 물결 하나가 한 바퀴에 두 번 퍼진다
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
    const a = (i / 10) * Math.PI * 2 + time * SR(1);
    const p = (time * CR(1.2) + i * 0.1) % 1;
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
  ctx.setLineDash([8, 8]); ctx.lineDashOffset = -time * DR(20, 16);
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
    const p = (time * CR(0.6) + i / 4) % 1;
    ctx.globalAlpha = 0.8 * (1 - p);
    ctx.beginPath(); ctx.ellipse(x, y - 56, 34 * p + 4, 50 * p + 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawGate(ctx, gt, time) {
  const { x, y } = gt;
  const gs = sprite("rpg/gate");
  if (gs) drawSprite(ctx, gs, x - RFRAME.gate.ox, y - RFRAME.gate.oy, RFRAME.gate.w, RFRAME.gate.h, time);
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

/* 광장 상점 — 그림 파일이 아직 없어 코드로 그린 노점이다. 차양 색은 shopData.js 의 color.
   발밑 가운데가 (x, y). 위에 상점 이름, 아래에 주인 이름을 단다. */
function drawShop(ctx, n, time) {
  const { x, y } = n;
  const c = (SHOP_BY_ID[n.shop] || {}).color || "#b9a07a";
  shadow(ctx, x, y + 4, 62, 12, 0.28);
  ctx.save();
  ctx.translate(x, y);
  // 기둥과 판매대
  ctx.fillStyle = "#6b4e33";
  ctx.fillRect(-54, -92, 5, 92); ctx.fillRect(49, -92, 5, 92);
  ctx.fillStyle = "#8a6a46"; roundRect(ctx, -58, -30, 116, 30, 4); ctx.fill();
  ctx.strokeStyle = "rgba(40,26,14,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  // 주인 — 판매대 뒤에서 살짝 흔들린다
  const bob = Math.sin(time * 2 + x) * 1.2;
  ctx.fillStyle = c; ctx.fillRect(-11, -50 + bob, 22, 22);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -58 + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3, -58 + bob, 1.3, 0, Math.PI * 2); ctx.arc(3, -58 + bob, 1.3, 0, Math.PI * 2); ctx.fill();
  // 줄무늬 차양
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#efe6d2" : c;
    ctx.beginPath();
    ctx.moveTo(-62 + i * 20.7, -92); ctx.lineTo(-62 + (i + 1) * 20.7, -92);
    ctx.lineTo(-62 + (i + 1) * 20.7, -78); ctx.quadraticCurveTo(-62 + (i + 0.5) * 20.7, -70, -62 + i * 20.7, -78);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = "rgba(40,26,14,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-62, -100, 124, 8);
  ctx.fillStyle = c; ctx.fillRect(-62, -100, 124, 8);
  // 간판 — 상점 이름
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "15px 'Do Hyeon', sans-serif";
  const w = ctx.measureText(n.name).width + 20;
  ctx.fillStyle = "rgba(30,22,14,0.86)"; roundRect(ctx, -w / 2, -128, w, 24, 6); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#f6e5bb"; ctx.fillText(n.name, 0, -116);
  // 주인 이름
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.keeper).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, -w2 / 2, 8, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.keeper, 0, 16.5);
  ctx.restore();
}

function drawNpc(ctx, g, n, time) {
  if (n.shop) return drawShop(ctx, n, time);
  if (n.board) return drawHonorBoard(ctx, n, time);
  if (n.req) return drawReqNpc(ctx, g, n, time);
  if (n.dungeon) return drawDungeonNpc(ctx, n, time);
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
  const k = m.size || 1;
  const hop = m.moving ? Math.abs(Math.sin(m.age * (m.boss ? 9 : 13))) * 7 * Math.sqrt(k) : 0;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 13 * grow * k, 4 * grow * k, 0.25);
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  const rim = mapImg(rpgFile(m.freeze > 0 ? "rabbit-frozen" : "rabbit"));
  if (rim) ctx.drawImage(rim, -RFRAME.rabbit.ox, -RFRAME.rabbit.oy, RFRAME.rabbit.w, RFRAME.rabbit.h);
  else drawRabbitBody(ctx, m.freeze > 0);
  if (m.boss) {                                         // 대왕 토끼 — 작은 왕관
    ctx.fillStyle = "#f3c94f"; ctx.strokeStyle = "#8a6420"; ctx.lineWidth = 1.2 / k;
    ctx.beginPath();
    ctx.moveTo(1, -38); ctx.lineTo(3, -46); ctx.lineTo(7, -41); ctx.lineTo(10, -48); ctx.lineTo(13, -41);
    ctx.lineTo(17, -46); ctx.lineTo(18, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(1, -11, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 44 * k + hop);
}

/* 늑대 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 걸을 때 다리를 번갈아 내딛는다.
   우두머리는 털빛이 짙고 목갈기와 붉은 눈을 가진다. */
export function drawWolfBody(ctx, ph, moving, boss, frozen, bite) {
  const fur = frozen ? "#bcd6e6" : boss ? "#4e4953" : "#8d9099";
  const dark = frozen ? "#8fb3c9" : boss ? "#2f2b33" : "#5e616b";
  const belly = frozen ? "#e2f0f8" : boss ? "#8e8792" : "#d8d4cb";
  const line = "rgba(30,24,20,0.85)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 1.6;
  const leg = (lx, off, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line;
    ctx.beginPath(); ctx.roundRect(lx - 3.5 + off, -16, 7, 16, 3); ctx.fill(); ctx.stroke();
  };
  // 뒤쪽 다리 (어둡게)
  leg(-18, -sw, dark); leg(14, sw, dark);
  // 꼬리
  ctx.save(); ctx.translate(-24, -26); ctx.rotate(-0.7 + (moving ? Math.sin(ph * 0.5) * 0.15 : 0));
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-12, 0, 14, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(-22, 0, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 몸통 · 배
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-2, -25, 27, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(2, -17, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-6, -34, 16, 4, -0.05, 0, Math.PI * 2); ctx.fill();   // 등줄기
  // 앞쪽 다리
  leg(-12, sw, fur); leg(20, -sw, fur);
  // 머리 — 물 때는 앞으로 내민다
  ctx.save();
  ctx.translate(bite > 0 ? 4 : 0, 0);
  if (boss) {                                           // 목갈기
    ctx.fillStyle = "#e9e4dc";
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -2.2 + i * 0.55, r = i % 2 ? 11 : 17;
      ctx.lineTo(18 + Math.cos(a) * r, -30 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  // 귀
  [[17, -44, 20, -58, 26, -45], [24, -45, 30, -58, 32, -42]].forEach(([a, b, c, d, e, f]) => {
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "#c79a9a";
  ctx.beginPath(); ctx.moveTo(20, -46); ctx.lineTo(21, -53); ctx.lineTo(24, -46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.arc(24, -35, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 주둥이 · 코 · 입
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(35, -30, 9, 5.5, 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#231c1c"; ctx.beginPath(); ctx.arc(43, -31.5, 2.4, 0, Math.PI * 2); ctx.fill();
  if (bite > 0) {
    ctx.fillStyle = "#7a2a2a"; ctx.beginPath(); ctx.ellipse(36, -25.5, 6, 2.6, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(33, -27); ctx.lineTo(34, -24); ctx.lineTo(35, -27); ctx.fill();
  }
  // 눈
  ctx.fillStyle = boss ? "#ff5b4a" : "#f2c14e";
  ctx.beginPath(); ctx.ellipse(28, -38, 2.4, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1c1414"; ctx.beginPath(); ctx.arc(28.6, -38, 1.1, 0, Math.PI * 2); ctx.fill();
  if (boss) {                                           // 흉터
    ctx.strokeStyle = "rgba(240,220,210,0.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(22, -44); ctx.lineTo(27, -33); ctx.stroke();
  }
  ctx.restore();
}

function drawWolf(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 9 : 11);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2.5 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 30 * grow * k, 7 * grow * k, 0.28);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawWolfBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(6, -28, 34, 16, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 60 * k + bob);
}

/* 멧돼지 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 등에 뻣뻣한 갈기, 주둥이 옆에 엄니.
   멧돼지 왕은 털빛이 짙고 엄니가 크며 눈이 붉다. low 가 켜지면(몸을 낮춤 · 들이받음) 머리를 숙인다. */
export function drawBoarBody(ctx, ph, moving, boss, frozen, low) {
  const fur = frozen ? "#bcd6e6" : boss ? "#4a3428" : "#7a5a40";
  const dark = frozen ? "#8fb3c9" : boss ? "#2c1e16" : "#563e2b";
  const snout = frozen ? "#e2f0f8" : boss ? "#8a6a5a" : "#c09a80";
  const line = "rgba(30,20,14,0.85)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 1.6;
  const leg = (lx, off, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line;
    ctx.beginPath(); ctx.roundRect(lx - 4 + off, -14, 8, 14, 3); ctx.fill(); ctx.stroke();
  };
  leg(-16, -sw, dark); leg(12, sw, dark);
  // 꼬리
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-27, -24); ctx.quadraticCurveTo(-34, -30, -31, -20); ctx.stroke();
  ctx.lineWidth = 1.6;
  // 몸통 — 둥글고 두툼하다
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-2, -24, 28, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 등 갈기
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-22, -32);
  for (let i = 0; i <= 8; i++) ctx.lineTo(-22 + i * 5.2, -38 - (i % 2 ? 6 : 1));
  ctx.lineTo(20, -32); ctx.closePath(); ctx.fill();
  leg(-10, sw, fur); leg(18, -sw, fur);
  // 머리 — 숙이면 앞으로 내려간다
  ctx.save();
  ctx.translate(low > 0 ? 3 : 0, low > 0 ? 5 : 0);
  ctx.rotate(low > 0 ? 0.18 : 0);
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(24, -26, 13, 11, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 귀
  ctx.beginPath(); ctx.moveTo(17, -34); ctx.lineTo(16, -45); ctx.lineTo(24, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 주둥이 · 콧구멍
  ctx.fillStyle = snout;
  ctx.beginPath(); ctx.ellipse(37, -22, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2a1c16";
  ctx.beginPath(); ctx.arc(38, -24, 1.2, 0, Math.PI * 2); ctx.arc(38, -20, 1.2, 0, Math.PI * 2); ctx.fill();
  // 엄니
  const tk = boss ? 1.5 : 1;
  ctx.fillStyle = "#f4ead6"; ctx.strokeStyle = line; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(32, -17); ctx.quadraticCurveTo(36 + 4 * tk, -18, 34 + 5 * tk, -26 - 4 * tk); ctx.lineTo(34, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 눈
  ctx.fillStyle = boss ? "#ff5b4a" : "#1c1410";
  ctx.beginPath(); ctx.arc(27, -30, boss ? 2.2 : 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoar(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 10 : 12);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2.2 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 32 * grow * k, 8 * grow * k, 0.3);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawBoarBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(4, -26, 36, 18, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 54 * k + bob);
}

/* 고릴라 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 평소에는 주먹을 땅에 짚고 걷는다.
   up 이 켜지면(가슴 두드리기) 일어서서 두 주먹으로 가슴을 번갈아 친다. 고릴라 왕은 등이 은빛이고 눈이 붉다. */
export function drawGorillaBody(ctx, ph, moving, boss, frozen, up) {
  const fur = frozen ? "#bcd6e6" : boss ? "#2f2b2d" : "#423c39";
  const dark = frozen ? "#8fb3c9" : boss ? "#1b181a" : "#2a2522";
  const skin = frozen ? "#e2f0f8" : boss ? "#6a5d58" : "#7c6b61";
  const silver = frozen ? "#eef7fb" : "#bdb8b1";
  const line = "rgba(16,12,10,0.9)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const limb = (x0, y0, x1, y1, w, col) => {
    ctx.strokeStyle = line; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  const blob = (x, y, rx, ry, rot, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const face = (hx, hy) => {
    blob(hx, hy, 11, 10, 0, fur);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 8, 9, 5, 0, Math.PI, Math.PI * 2); ctx.fill();   // 정수리
    blob(hx + 5, hy + 2, 6.5, 6.5, 0, skin);
    ctx.strokeStyle = line; ctx.lineWidth = 2;                                                            // 툭 튀어나온 눈썹
    ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + 10, hy - 3); ctx.stroke();
    ctx.fillStyle = boss ? "#ff5b4a" : "#120c0a";
    ctx.beginPath(); ctx.arc(hx + 6, hy - 0.5, boss ? 1.9 : 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1210";
    ctx.beginPath(); ctx.arc(hx + 9, hy + 4, 1, 0, Math.PI * 2); ctx.arc(hx + 6.5, hy + 4.3, 1, 0, Math.PI * 2); ctx.fill();
  };
  if (up > 0) {                                     // 일어서서 가슴을 친다
    const beat = Math.sin(ph * 3);
    limb(-7, -20, -9, 0, 10, dark); limb(7, -20, 9, 0, 10, fur);
    blob(0, -38, 18, 24, 0, fur);
    if (boss) { ctx.fillStyle = silver; ctx.beginPath(); ctx.ellipse(-8, -40, 6, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    blob(4, -34, 10, 13, 0, skin);                  // 가슴
    limb(-12, -50, 0 + beat * 3, -38 - beat * 3, 10, dark);
    limb(14, -50, 8 - beat * 3, -40 + beat * 3, 11, fur);
    blob(1 + beat * 3, -38 - beat * 3, 5.5, 5, 0, dark);
    blob(8 - beat * 3, -40 + beat * 3, 6, 5.5, 0, fur);
    face(4, -64);
    return;
  }
  // 주먹을 땅에 짚고 걷는다 — 먼 쪽 다리 · 팔, 몸통, 가까운 쪽 다리 · 팔, 머리 순서
  limb(-16, -22, -18 - sw, 0, 9, dark);
  limb(10, -40, 16 - sw, -2, 10, dark);
  blob(16 - sw, -2, 5, 4, 0, dark);
  blob(-2, -30, 25, 18, -0.28, fur);
  if (boss) { ctx.fillStyle = silver; ctx.beginPath(); ctx.ellipse(-8, -40, 15, 6, -0.28, 0, Math.PI * 2); ctx.fill(); }
  limb(-10, -20, -8 + sw, 0, 10, fur);
  limb(15, -38, 22 + sw, -2, 11, fur);
  blob(22 + sw, -2, 6, 4.5, 0, fur);
  face(24, -46);
}

function drawGorilla(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 7 : 8);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 30 * grow * k, 8 * grow * k, 0.32);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawGorillaBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(2, -34, 28, 24, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, (m.bite > 0 ? 78 : 60) * k + bob);
}

/* ── 고블린 · 오크 · 오우거 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다 ─────────────
   up 이 켜지면 고블린은 단검을 찌르고, 오크 · 오우거는 무기를 머리 위로 치켜든다(곧 내려친다). */
const lineCol = "rgba(18,14,10,0.9)";
function limbOf(ctx) {
  return (x0, y0, x1, y1, w, col) => {
    ctx.strokeStyle = lineCol; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
}
function blobOf(ctx) {
  return (x, y, rx, ry, rot, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = lineCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
}
function poly(ctx, pts, col) {
  ctx.fillStyle = col; ctx.strokeStyle = lineCol; ctx.lineWidth = 1.4;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// 고블린 — 작은 초록 몸, 큰 귀, 등에 멘 자루와 허리춤 주머니. 고블린 대장은 붉은 두건과 금 귀걸이
export function drawGoblinBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#cfe6f2" : boss ? "#6f9a4a" : "#86a95c";
  const dark = frozen ? "#9dc0d6" : boss ? "#4c6e30" : "#5e7d3e";
  const vest = frozen ? "#b9d3e2" : "#6b5638";
  const sack = frozen ? "#dcecf4" : "#b8956a";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-3, -14, -5 - sw, 0, 5, dark);                         // 먼 다리
  blob(-12, -27, 8, 10, -0.2, sack);                          // 등에 멘 자루
  ctx.strokeStyle = "#7a5b36"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-15, -36); ctx.lineTo(-8, -36); ctx.stroke();
  limb(3, -14, 5 + sw, 0, 5, skin);                           // 가까운 다리
  blob(0, -23, 9, 11, 0, vest);                               // 조끼
  ctx.strokeStyle = "#3e2e1c"; ctx.lineWidth = 3;             // 허리띠
  ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(9, -16); ctx.stroke();
  [[-6, -13, 4.5], [5, -12, 5]].forEach(([x, y, r]) => {      // 허리춤 주머니
    blob(x, y, r, r * 0.9, 0, frozen ? "#e2eff6" : "#a3794a");
    ctx.fillStyle = frozen ? "#c4dcea" : "#7c5732"; ctx.fillRect(x - r * 0.8, y - r * 0.9, r * 1.6, 2);
  });
  // 단검 든 팔 — 찌를 때 앞으로 뻗는다
  const hx = up > 0 ? 18 : 11, hy = up > 0 ? -25 : -19;
  limb(4, -28, hx, hy, 4, skin);
  ctx.strokeStyle = lineCol; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (up > 0 ? 14 : 9), hy - (up > 0 ? 1 : 5)); ctx.stroke();
  ctx.strokeStyle = frozen ? "#f2fbff" : "#d9dde2"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.lineTo(hx + (up > 0 ? 14 : 9), hy - (up > 0 ? 1 : 5)); ctx.stroke();
  // 머리 · 귀
  poly(ctx, [[-1, -41], [-15, -50], [-2, -35]], skin);
  blob(4, -39, 9, 8.5, 0, skin);
  poly(ctx, [[9, -43], [19, -50], [11, -37]], skin);
  if (boss) { blob(3, -46, 9, 4, 0, frozen ? "#e8f4fa" : "#b8483c"); ctx.fillStyle = "#e7c35a"; ctx.beginPath(); ctx.arc(-3, -33, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = boss ? "#ff7a4a" : "#f2e27a";
  ctx.beginPath(); ctx.arc(8, -40, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.arc(8.6, -40, 1, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [[11, -38], [16, -36], [11, -35]], skin);         // 뾰족한 코
  ctx.strokeStyle = lineCol; ctx.lineWidth = 1.2;              // 씩 웃는 입
  ctx.beginPath(); ctx.moveTo(6, -33); ctx.quadraticCurveTo(9, -31, 12, -33); ctx.stroke();
}

// 해골 — 모르가스가 부르는 졸개. 빛바랜 뼈 · 갈비뼈 · 녹슨 칼 · 초록 눈빛(모르가스와 같은 빛)
export function drawSkeletonBody(ctx, ph, moving, boss, frozen, up) {
  const bone = frozen ? "#e2f0f8" : "#ddd6c2";
  const shade = frozen ? "#b4d0e0" : "#a69d86";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-3, -14, -5 - sw, 0, 3, shade);                        // 먼 다리
  limb(3, -14, 5 + sw, 0, 3, bone);                           // 가까운 다리
  blob(0, -14, 6, 3, 0, shade);                               // 골반
  ctx.strokeStyle = bone; ctx.lineWidth = 2.6;                // 등뼈
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -34); ctx.stroke();
  ctx.lineWidth = 2;                                           // 갈비뼈
  for (let k = 0; k < 4; k++) {
    const y = -31 + k * 4, w = 8 - k;
    ctx.beginPath(); ctx.moveTo(-w, y + 1.5); ctx.quadraticCurveTo(0, y - 2.5, w, y + 1.5); ctx.stroke();
  }
  // 칼 든 팔 — 칠 때 앞으로 뻗는다
  const hx = up > 0 ? 17 : 10, hy = up > 0 ? -27 : -20;
  limb(3, -32, hx, hy, 2.6, bone);
  ctx.strokeStyle = frozen ? "#f2fbff" : "#8a6a4a"; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (up > 0 ? 16 : 10), hy - (up > 0 ? 2 : 12)); ctx.stroke();
  ctx.strokeStyle = frozen ? "#ffffff" : "#b8b2a4"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.lineTo(hx + (up > 0 ? 16 : 10), hy - (up > 0 ? 2 : 12)); ctx.stroke();
  // 머리 — 해골 · 턱 · 초록 눈빛
  blob(3, -42, 8.5, 8, 0, bone);
  blob(5, -35.5, 5, 2.6, 0, shade);
  ctx.fillStyle = "#1a1612";
  ctx.beginPath(); ctx.arc(1, -42, 2.4, 0, Math.PI * 2); ctx.arc(7.5, -42, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = frozen ? "#bfe6ff" : "#7fe0a0";
  ctx.beginPath(); ctx.arc(1.4, -42, 1.1, 0, Math.PI * 2); ctx.arc(7.9, -42, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1612"; ctx.lineWidth = 0.8;           // 이빨 줄
  ctx.beginPath(); ctx.moveTo(2, -36.5); ctx.lineTo(9, -36.5); ctx.stroke();
}

// 오크 — 회녹색 근육, 아래 엄니, 도끼. 오크 족장은 뿔 투구와 붉은 전투 무늬
export function drawOrcBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#cfe3ee" : boss ? "#6f8058" : "#7f9268";
  const dark = frozen ? "#a2c2d4" : "#4a3c30";
  const strap = frozen ? "#c0d7e4" : "#5d4630";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-6, -20, -8 - sw, 0, 8, dark);
  limb(-10, -42, -16, up > 0 ? -66 : -24, 7, skin);           // 먼 팔
  limb(6, -20, 8 + sw, 0, 8, dark);
  blob(0, -34, 16, 18, 0, skin);                              // 몸통
  ctx.strokeStyle = strap; ctx.lineWidth = 4;                 // 어깨끈
  ctx.beginPath(); ctx.moveTo(-12, -46); ctx.lineTo(12, -22); ctx.stroke();
  ctx.fillStyle = dark; ctx.fillRect(-14, -21, 28, 6);        // 허리
  if (boss) { ctx.strokeStyle = "#b5473c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(4, -36); ctx.moveTo(-6, -34); ctx.lineTo(4, -30); ctx.stroke(); }
  // 도끼 — 평소에는 비스듬히 들고, 치켜들면 머리 위로
  const hx = up > 0 ? 4 : 18, hy = up > 0 ? -76 : -28;
  const tx = up > 0 ? -12 : 24, ty = up > 0 ? -104 : -64;
  limb(10, -44, hx, hy, 8, skin);
  limb(hx, hy, tx, ty, 3.5, frozen ? "#d6e8f2" : "#6e5236");
  const a = Math.atan2(ty - hy, tx - hx);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
  poly(ctx, [[-4, 0], [-10, 13], [6, 14], [4, 0]], frozen ? "#eef8fc" : "#b9bcc0");
  ctx.restore();
  blob(hx, hy, 4.5, 4.5, 0, skin);
  // 머리 — 엄니 · 눈썹 · 상투(족장은 뿔 투구)
  blob(8, -56, 11, 10.5, 0, skin);
  if (boss) {
    blob(7, -63, 11, 6, 0, frozen ? "#e6f2f8" : "#5a5550");
    poly(ctx, [[-2, -66], [-9, -80], [2, -69]], "#e8dcc6"); poly(ctx, [[14, -67], [22, -80], [16, -64]], "#e8dcc6");
  } else {
    ctx.fillStyle = "#2a221c"; ctx.beginPath(); ctx.ellipse(3, -66, 4, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(8, -59); ctx.lineTo(17, -58); ctx.stroke();
  ctx.fillStyle = boss ? "#ff5b4a" : "#2a1a10"; ctx.beginPath(); ctx.arc(13, -56, 1.7, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [[12, -50], [13.5, -55], [15, -50]], "#f4ecd8");
  poly(ctx, [[16, -50], [17.5, -54.5], [19, -50.5]], "#f4ecd8");
}

// 오우거 — 큰 배, 작은 머리, 가시 몽둥이. 오우거 왕은 왕관과 붉은 눈
export function drawOgreBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#d5e6ef" : boss ? "#9a7a5e" : "#b59a78";
  const dark = frozen ? "#a6c4d6" : boss ? "#6e5440" : "#87705a";
  const cloth = frozen ? "#c6dbe7" : "#5f4a36";
  const wood = frozen ? "#d9ebf4" : "#7a5a3a";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-9, -18, -11 - sw, 0, 11, dark);
  limb(-16, -48, up > 0 ? -18 : -24, up > 0 ? -76 : -24, 10, dark);   // 먼 팔
  limb(9, -18, 11 + sw, 0, 11, skin);
  blob(0, -36, 23, 23, 0, skin);                              // 큰 배
  blob(4, -30, 12, 11, 0, frozen ? "#e2eef5" : "#c9b08e");
  poly(ctx, [[-20, -20], [20, -20], [14, -6], [-14, -6]], cloth);   // 허리 두른 천
  // 몽둥이 — 평소에는 땅에 끌고, 치켜들면 머리 위로
  const hx = up > 0 ? 6 : 24, hy = up > 0 ? -82 : -30;
  const tx = up > 0 ? -16 : 40, ty = up > 0 ? -116 : -2;
  limb(14, -50, hx, hy, 11, skin);
  const a = Math.atan2(ty - hy, tx - hx), len = Math.hypot(tx - hx, ty - hy);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  poly(ctx, [[0, -3], [len, -8], [len + 4, 0], [len, 8], [0, 3]], wood);
  ctx.fillStyle = frozen ? "#f2fbff" : "#d8d0c0";
  [0.55, 0.75, 0.92].forEach((t) => {
    ctx.beginPath(); ctx.moveTo(len * t, -6 * t - 2); ctx.lineTo(len * t + 2, -6 * t - 7); ctx.lineTo(len * t + 4, -6 * t - 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(len * t, 6 * t + 2); ctx.lineTo(len * t + 2, 6 * t + 7); ctx.lineTo(len * t + 4, 6 * t + 2); ctx.fill();
  });
  ctx.restore();
  blob(hx, hy, 6, 6, 0, skin);
  // 작은 머리 — 아래턱이 나온 얼굴
  blob(12, -63, 10, 9.5, 0, skin);
  blob(16, -57, 7, 4.5, 0, dark);
  if (boss) poly(ctx, [[4, -70], [6, -79], [10, -73], [13, -80], [16, -73], [20, -78], [20, -69]], "#e2c063");
  ctx.fillStyle = boss ? "#ff5b4a" : "#1c120c";
  ctx.beginPath(); ctx.arc(17, -65, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, -68); ctx.lineTo(20, -67); ctx.stroke();
  poly(ctx, [[15, -59], [16, -63], [17.5, -59]], "#f4ecd8");
}

// 셋을 같은 틀로 그린다 — 크기 · 그림자 · 맞았을 때 반짝임 · 머리 위 표시. top 은 머리 높이(크기 1 기준)
function bruteDrawer(body, shadowR, top, upTop) {
  return (ctx, m, time) => {
    const k = m.size || 1;
    const grow = Math.min(1, (m.age || 0) / 0.35);
    const ph = (m.age || 0) * (m.boss ? 8 : 9);
    const bob = m.moving ? Math.abs(Math.sin(ph)) * 2 * k : 0;
    shadow(ctx, m.x, m.y + 2, shadowR * grow * k, shadowR * 0.28 * grow * k, 0.32);
    ctx.save();
    ctx.translate(m.x, m.y - bob);
    ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
    body(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
    if (m.flash > 0) {
      ctx.globalAlpha = Math.min(0.6, m.flash * 5);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(2, -top * 0.5, shadowR, top * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    drawMobMarks(ctx, m, time, (m.bite > 0 ? upTop : top) * k + bob);
  };
}
const drawGoblin = bruteDrawer(drawGoblinBody, 16, 52, 52);
const drawOrc = bruteDrawer(drawOrcBody, 22, 72, 100);
const drawOgre = bruteDrawer(drawOgreBody, 28, 76, 112);
const drawSkeleton = bruteDrawer(drawSkeletonBody, 15, 52, 52);

/* 던전 보스 — 그림 시트에서 자른 자세(tools/cut-bosses.py)를 같은 배율로 발밑 가운데에 맞춰 그린다.
   idle · move 는 프레임 목록(돌아가며), 기술 자세(slam · charge · attack)는 있는 보스만. 그림을 못 불러오면 오우거 몸을 크게 그려 대신한다.
   pose 비트는 rpg.js stepDgBoss — 1 기술 준비(warnR 둘레) · 2 돌진 준비 · 4 돌진 · 8 철벽 · 16 광폭화 · 32 잔상 */
const frames = (name, n) => Array.from({ length: n }, (_, i) => `${name}${i}`);
const BOSS_ART = {
  gramor: { scale: 2.2, idle: ["idle"], move: ["idle", "move"], slam: "slam", charge: "charge", attack: "attack" },
  argas: { scale: 2.05, idle: ["idle"], move: ["idle", "move"], slam: "slam", charge: "charge", attack: "attack" },
  morgas: { scale: 0.95, idle: frames("idle", 4), move: frames("walk", 4), glow: "#7fe0a0" },
  barkanon: { scale: 1.15, idle: ["idle"], move: frames("walk", 4), glow: "#ff7a50" },
  serka: { scale: 1.12, idle: ["idle"], move: frames("walk", 4), glow: "#8fc8ff" },
};
const bossImg = (type, pose) => mapImg(`${RPG_ART}/boss/${type}-${pose}.webp`);
function drawDungeonBoss(ctx, m, time) {
  const A = BOSS_ART[m.type] || BOSS_ART.gramor;
  const grow = Math.min(1, (m.age || 0) / 0.5);
  const pose = m.pose || 0;
  const x = m.x, y = m.y;
  // 대지 강타 준비 — 내려칠 둘레를 붉게 깜빡인다
  if (pose & 1) {
    const p = 0.5 + 0.5 * Math.sin(time * 14);
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, RPG.squash);
    ctx.fillStyle = `rgba(230,90,50,${0.12 + 0.12 * p})`;
    ctx.strokeStyle = `rgba(255,150,90,${0.5 + 0.4 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, m.warnR || 200, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  shadow(ctx, x, y + 2, 70 * grow, 20 * grow, 0.35);
  // 맞을 때는 자세를 바꾸지 않고 밝게만(쉴 새 없이 맞아 깜빡이지 않게)
  const list = m.moving ? A.move : A.idle;
  const name = (pose & 4 && A.charge) || (pose & 1 && A.slam) || ((pose & 2 || m.bite > 0) && A.attack)
    || list[Math.floor(time * (m.moving ? 6 : 3)) % list.length];
  const img = bossImg(m.type, name) || bossImg(m.type, A.idle[0]);
  // 잔상 — 뒤로 흐린 그림 둘
  if (pose & 32 && img) {
    const w = img.width * A.scale, h = img.height * A.scale;
    [-1, 1].forEach((k) => {
      ctx.save(); ctx.globalAlpha = 0.28;
      ctx.translate(x + k * 46 + Math.sin(time * 9 + k) * 6, y);
      ctx.scale(m.ax < 0 ? -1 : 1, 1);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
    });
  }
  // 기술 준비 · 광폭화 — 몸 둘레 빛(그림에 기술 자세가 없는 보스)
  if ((pose & 16 || (pose & 3 && !A.slam)) && img) {
    const h = img.height * A.scale;
    ctx.save();
    const glow = pose & 16 ? "rgba(255,80,60,0.42)" : A.glow || "#ffb070";
    const gr = ctx.createRadialGradient(x, y - h * 0.45, 10, x, y - h * 0.45, h * 0.6);
    gr.addColorStop(0, pose & 16 ? glow : `${glow}66`); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.fillRect(x - h * 0.6, y - h * 1.05, h * 1.2, h * 1.2);
    ctx.restore();
  }
  const breathe = m.moving ? 0 : Math.sin(time * 2.2) * 0.012;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow, grow * (1 + breathe));
  let top = 230;
  if (img) {
    const w = img.width * A.scale, h = img.height * A.scale;
    ctx.drawImage(img, -w / 2, -h, w, h);
    top = h;
    if (m.flash > 0) {                               // 맞으면 잠깐 밝게
      ctx.globalAlpha = Math.min(0.35, m.flash * 3);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
  } else {
    ctx.scale(2.2, 2.2);
    drawOgreBody(ctx, (m.age || 0) * 8, m.moving, 1, m.freeze > 0, m.bite);
  }
  ctx.restore();
  // 철벽 자세 — 금빛 고리
  if (pose & 8) {
    const p = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save();
    ctx.translate(x, y - top * 0.45);
    ctx.strokeStyle = `rgba(255,196,110,${0.55 + 0.3 * p})`; ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(255,170,80,0.9)"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(0, 0, top * 0.62, top * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  drawMobMarks(ctx, m, time, top * grow);
}
const MOB_DRAW = { wolf: drawWolf, boar: drawBoar, gorilla: drawGorilla, goblin: drawGoblin, orc: drawOrc, ogre: drawOgre, gramor: drawDungeonBoss, argas: drawDungeonBoss, morgas: drawDungeonBoss, barkanon: drawDungeonBoss, serka: drawDungeonBoss, skeleton: drawSkeleton };
const MOB_LABEL = { boar: "#f2b48a", gorilla: "#d9d0c4", wolf: "#f0c9a8", goblin: "#c9dca8", orc: "#cfd6b8", ogre: "#e4cfb4", skeleton: "#cfe6d4" };

/* 던전 관리인 — 짙은 망토에 등불을 든 사람. 머리 위에 칼 모양 표시 */
function drawDungeonNpc(ctx, n, time) {
  const { x, y } = n;
  const bob = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y + 2, 17, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "#5e4a52"; ctx.strokeStyle = "rgba(30,20,12,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-11, -38); ctx.lineTo(11, -38); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-8, -2, 6, 3); ctx.fillRect(2, -2, 6, 3);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.3, -46, 1.3, 0, Math.PI * 2); ctx.arc(3.3, -46, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5e4a52"; ctx.beginPath(); ctx.arc(0, -49, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  // 등불
  ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(18, -30); ctx.stroke();
  const glow = 0.7 + 0.3 * Math.sin(time * 5);
  ctx.fillStyle = `rgba(255,190,100,${glow})`; ctx.fillRect(15, -24, 7, 9);
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const jump = Math.abs(Math.sin(time * 3)) * -4;
  ctx.font = "22px 'Do Hyeon', sans-serif";
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
  ctx.strokeText("⚔", x, y - 86 + jump);
  ctx.fillStyle = "#f0b28a"; ctx.fillText("⚔", x, y - 86 + jump);
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

/* 광장 의뢰 NPC — 망토 두른 마을 사람. 망토 색은 requestData.js 의 color.
   머리 위: 받을 수 있으면 느낌표, 맡은 의뢰를 끝냈으면 금빛 물음표, 하는 중이면 흐린 물음표 */
function drawReqNpc(ctx, g, n, time) {
  const { x, y } = n;
  const def = REQ_BY_NPC[n.req] || {};
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const bob = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y + 2, 17, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  const col = def.color || "#9a8a70";
  ctx.fillStyle = col; ctx.strokeStyle = "rgba(30,20,12,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-11, -38); ctx.lineTo(11, -38); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,240,215,0.25)"; ctx.fillRect(-1, -36, 2, 34);
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-8, -2, 6, 3); ctx.fillRect(2, -2, 6, 3);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.3, -46, 1.3, 0, Math.PI * 2); ctx.arc(3.3, -46, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -49, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();   // 두건
  ctx.restore();
  // 머리 위 표시
  const list = REQUESTS[n.req] || [];
  const cur = me && me.reqs && me.reqs[n.req];
  const ready = cur && !whyReqDone(me, n.req).length;
  const mark = cur ? "?" : me && list.some((q) => me.lv >= q.lv) ? "!" : "";
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (mark) {
    const jump = cur && !ready ? 0 : Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "26px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
    ctx.strokeText(mark, x, y - 88 + jump);
    ctx.fillStyle = cur && !ready ? "#b9ad98" : "#ffd873";
    ctx.fillText(mark, x, y - 88 + jump);
  }
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

const BOSS_HP_COL = "#d8645a", BOSS_GHOST_COL = "#f0b052";   // 보스 체력 칸 · 피해 잔상(던전 위 칸과 같은 색 — style.css .rpg-dg-boss)
/* 몹 머리 위 — 걸린 것(불 · 독 · 기절), 체력, 레벨. top 은 발밑에서 머리 꼭대기까지의 높이 */
function drawMobMarks(ctx, m, time, top) {
  const x = m.x, y = m.y;
  if (m.burn > 0 || m.poison > 0) {
    ctx.fillStyle = m.burn > 0 ? "rgba(245,140,40,0.8)" : "rgba(150,220,90,0.7)";
    for (let k = 0; k < 3; k++) {
      const p = (time * 1.5 + k / 3) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.arc(x + (k - 1) * 6, y - top * 0.35 - p * 16, 2.2 + p * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (m.stun > 0) {
    ctx.fillStyle = "#ffe27a";
    for (let k = 0; k < 3; k++) {
      const a = time * 5 + (k / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, y - top + 6 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const boss = !!m.boss;
  const tagY = y - top - 10;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // 체력 — 보스는 늘 보이고, 나머지는 다쳤을 때만
  let barY = tagY;
  if (boss || m.hp < m.max) {
    const bw = boss ? 70 : 28, r = Math.max(0, Math.min(1, m.hp / m.max));
    barY = tagY - 1;
    ctx.fillStyle = "rgba(20,16,12,0.75)"; roundRect(ctx, x - bw / 2 - 1, tagY + 6, bw + 2, boss ? 6 : 5, 2); ctx.fill();
    // 보스 — 실제 칸 뒤에 주황 잔상(bossBar.js, 화면 루프가 m.hpFx 를 돌린다)
    const ghost = boss && m.hpFx ? Math.max(r, m.hpFx.ghost) : r;
    if (ghost > r) { ctx.fillStyle = BOSS_GHOST_COL; roundRect(ctx, x - bw / 2, tagY + 7, bw * ghost, 4, 1.5); ctx.fill(); }
    ctx.fillStyle = boss ? BOSS_HP_COL : r > 0.5 ? "#8fd07f" : "#e5a93e";
    if (r > 0) { roundRect(ctx, x - bw / 2, tagY + 7, Math.max(1.5, bw * r), boss ? 4 : 3, 1.5); ctx.fill(); }
  }
  // 레벨 — 보스는 이름도 붙인다
  const label = boss ? `Lv${m.lv} ${mobName(m)}` : `Lv${m.lv}`;
  ctx.font = boss ? "12px 'Do Hyeon', sans-serif" : "10px 'Do Hyeon', sans-serif";
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = boss ? "rgba(70,20,16,0.82)" : "rgba(20,14,10,0.62)";
  roundRect(ctx, x - w / 2, barY - 7, w, 13, 6); ctx.fill();
  ctx.fillStyle = boss ? "#ffd873" : MOB_LABEL[m.type] || "#f2ead6";
  ctx.fillText(label, x, barY);
  ctx.restore();
}

/* ── 움직임 — 그림은 방향마다 한 장이라, 몸 전체를 튀기고 기울이고 눌러서 걷는 것처럼 보이게 한다 ──
   걸을 때: 한 걸음마다 통통 튀고, 좌우로 살짝 흔들리고, 발이 닿을 때 눌렸다 펴진다(흙먼지도 인다).
   서 있을 때: 천천히 숨을 쉰다. 칠 때: 치는 쪽으로 몸을 기울였다 돌아온다.
   그리기에만 쓰는 값이라 h.anim 에 두고 주고받지 않는다 — 방장 · 손님 화면 모두 제 화면에서 계산한다. */
const STRIDE = 24;            // 한 걸음에 가는 거리
function heroMotion(g, h, time) {
  const a = h.anim || (h.anim = { x: h.x, y: h.y, t: time, ph: 0, walk: 0, land: 0 });
  const dt = Math.min(0.1, Math.max(0, time - a.t));
  const moved = Math.hypot(h.x - a.x, (h.y - a.y) / RPG.squash);
  a.x = h.x; a.y = h.y; a.t = time;
  // 문을 지나거나 위치를 맞추느라 한 번에 크게 옮긴 것은 걸음으로 치지 않는다
  const going = dt > 0 && moved / dt > 30 && moved < 80;
  a.walk += ((going ? 1 : 0) - a.walk) * Math.min(1, dt * 12);     // 걷기와 서기 사이를 부드럽게
  if (going) {
    const step = Math.floor(a.ph / Math.PI);
    a.ph += (moved / STRIDE) * Math.PI;
    if (Math.floor(a.ph / Math.PI) !== step) { a.land = 1; kickDust(g, h); }   // 발이 닿았다
  } else if (a.walk < 0.05) {
    a.ph = 0;
  }
  a.land = Math.max(0, a.land - dt * 7);
  const w = a.walk;
  const s = Math.abs(Math.sin(a.ph));
  const breath = Math.sin(time * 2.4 + h.pi * 1.3) * (1 - w);
  const sq = a.land * 0.08 * w;
  let lean = 0, lunge = 0;
  if (h.swing > 0) {
    const k = Math.sin(Math.min(1, h.swing / 0.25) * Math.PI);
    lean = 0.15 * k; lunge = 5 * k;
  }
  return {
    hop: -s * 6 * w,                                  // 걸음마다 튀어 오른다
    tilt: Math.sin(a.ph) * 0.09 * w,                  // 좌우로 흔들린다
    sx: 1 - breath * 0.012 + sq * 0.8,
    sy: 1 + breath * 0.018 + s * 0.03 * w - sq,       // 숨쉬기 · 떠오를 때 늘고 닿을 때 눌린다
    lean, lunge, lift: s * w,
  };
}

/* 발밑 흙먼지 — 그리기만 하는 것이라 이 화면에만 남긴다 */
function kickDust(g, h) {
  const list = g.dust || (g.dust = []);
  if (list.length > 40) list.shift();
  list.push({ map: h.map, x: h.x - h.dir * 6 + (Math.random() - 0.5) * 6, y: h.y + 1, t: 0, life: 0.38,
    vx: -h.dir * (8 + Math.random() * 8) });
}
function drawDust(ctx, g, map, time) {
  const list = g.dust;
  if (!list || !list.length) return;
  const dt = Math.min(0.1, Math.max(0, time - (g.dustT ?? time)));
  g.dustT = time;
  ctx.save();
  g.dust = list.filter((d) => {
    d.t += dt;
    if (d.t >= d.life || d.map !== map) return false;
    const p = d.t / d.life;
    ctx.globalAlpha = (1 - p) * 0.4;
    ctx.fillStyle = map === "plaza" ? "#e9e1cf" : "#d8c9a4";
    ctx.beginPath();
    ctx.ellipse(d.x + d.vx * d.t, d.y - p * 5, 3 + p * 6, 1.6 + p * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
  ctx.restore();
}

function drawHero(ctx, g, h, time) {
  const pi = h.pi;
  const col = elemOf(h);
  const mine = g.mySeat === pi;
  const down = h.down > 0;
  const { view, flip } = heroView(h);
  const held = heldWeapon(h, view);
  const im = held ? held.body : heroImg(h, view) || heroImg(h, "front");
  const mo = down ? null : heroMotion(g, h, time);

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
  const lift = mo ? mo.lift : 0;                     // 떠오르면 그림자가 작고 옅어진다
  shadow(ctx, h.x, h.y + 3, 15 * (1 - lift * 0.18), 5 * (1 - lift * 0.18), 0.3 * (1 - lift * 0.3));
  ctx.translate(h.x, h.y + (mo ? mo.hop : 0));
  if (down) { h.anim = null; ctx.rotate(-0.9 * h.dir); ctx.translate(0, 10); ctx.globalAlpha = 0.5; }
  else if (h.bf && h.bf.hide && h.bf.hide.t > 0) ctx.globalAlpha = 0.45;   // 투명화 물약 — 비쳐 보인다
  if (mo) {                                          // 발밑을 축으로 기울이고 누른다
    ctx.translate(h.dir * mo.lunge, 0);
    ctx.rotate(mo.tilt + h.dir * mo.lean);
    ctx.scale(mo.sx, mo.sy);
  }
  if (flip) ctx.scale(-1, 1);
  if (im) {
    const ww = im.naturalWidth * HERO_K, hh = im.naturalHeight * HERO_K;
    const top = -hh + HERO_PAD * HERO_K;
    ctx.drawImage(im, -ww / 2, top, ww, hh);
    if (held) drawHeld(ctx, held, ww, top, down ? null : swingAngle(h, held, time), col.light);
    if (h.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.5, h.flash * 3);
      ctx.drawImage(im, -ww / 2, top, ww, hh);
    }
  } else {
    ctx.fillStyle = col.key; roundRect(ctx, -9, -34, 18, 34, 7); ctx.fill();
  }
  ctx.restore();

  // 체력 · 레벨 · 이름
  const bw = 40, byy = h.y - 66 - 12;
  const r = Math.max(0, Math.min(1, h.hp / (h.max || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(18,12,8,0.8)"; roundRect(ctx, h.x - bw / 2 - 1, byy - 1, bw + 2, 6, 3); ctx.fill();
  ctx.fillStyle = down ? "#6a5a52" : r > 0.5 ? "#8fd07f" : r > 0.25 ? "#e8c05e" : "#ef8b7c";
  roundRect(ctx, h.x - bw / 2, byy, Math.max(1.5, bw * r), 4, 2); ctx.fill();
  ctx.font = "10.5px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const nm = `Lv${h.lv} ${(g.names && g.names[pi]) || "모험가"}`;
  const wdt = ctx.measureText(nm).width + 12;
  // 내 파티원은 이름표 테두리를 연두빛으로
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const mate = me && me.pty && h.pty === me.pty && h !== me;
  ctx.fillStyle = "rgba(20,14,10,0.72)"; roundRect(ctx, h.x - wdt / 2, h.y + 6, wdt, 15, 7); ctx.fill();
  if (mate) { ctx.strokeStyle = "#a9d99a"; ctx.lineWidth = 1; ctx.stroke(); }
  else if (MAPS[h.map].pvp && me && h !== me && me.dvs === h.pi) { ctx.strokeStyle = "#e9a08a"; ctx.lineWidth = 1; ctx.stroke(); }   // 내 결투 상대
  ctx.fillStyle = down ? "#a89a90" : col.light; ctx.fillText(nm, h.x, h.y + 14);
  if (h.title) {                                  // 칭호 — 이름 아래
    ctx.font = "10px 'Jua', sans-serif";
    ctx.fillStyle = "rgba(233,211,154,0.92)";
    ctx.fillText(`「${titleName(h.title)}」`, h.x, h.y + 29);
  }
  if (down) {
    ctx.fillStyle = "#ffbdb2"; ctx.font = "11px 'Jua', sans-serif";
    ctx.fillText(`${Math.ceil(h.down)}초 뒤 광장에서`, h.x, byy - 10);
  }
  ctx.restore();
}

/* 결투장 바닥 — 칸(rings)마다 모래 원형 경기장 · 돌 테두리 · 네 귀퉁이 깃발. 결투 중인 사람은 제 칸 밖으로 못 나간다 */
function drawArenaFloor(ctx, M) {
  ctx.save();
  (M.rings || []).forEach(({ x: cx, y: cy, rx, ry }, k) => {
    ctx.fillStyle = "rgba(222,196,150,0.55)";
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(120,98,72,0.85)"; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(240,226,196,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 12, ry - 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(150,112,80,0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy, 130, 86, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - ry + 30); ctx.lineTo(cx, cy + ry - 30); ctx.stroke();
    [[cx - rx * 0.72, cy - ry * 0.72], [cx + rx * 0.72, cy - ry * 0.72], [cx - rx * 0.72, cy + ry * 0.72], [cx + rx * 0.72, cy + ry * 0.72]].forEach(([x, y], i) => {
      ctx.fillStyle = "rgba(60,44,30,0.35)";
      ctx.beginPath(); ctx.ellipse(x, y + 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6b5440"; ctx.fillRect(x - 3, y - 70, 6, 72);
      ctx.fillStyle = i % 2 ? "#c98d7a" : "#8fa9c4";
      ctx.beginPath(); ctx.moveTo(x + 3, y - 68); ctx.lineTo(x + 34, y - 58); ctx.lineTo(x + 3, y - 46); ctx.closePath(); ctx.fill();
    });
    ctx.font = "15px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(90,66,44,0.7)";
    ctx.fillText(`${k + 1}번 결투장`, cx, cy - ry - 16);
  });
  ctx.restore();
}

/* 명예 순위판 — 광장 위쪽 가운데. 나무 판에 금빛 글씨, 가까이 가면 E 로 연다 */
function drawHonorBoard(ctx, n, time) {
  const { x, y } = n;
  ctx.save();
  shadow(ctx, x, y + 2, 46, 9, 0.3);
  ctx.fillStyle = "#6b4f36"; ctx.fillRect(x - 40, y - 46, 7, 48); ctx.fillRect(x + 33, y - 46, 7, 48);
  ctx.fillStyle = "#8a6646"; ctx.strokeStyle = "rgba(40,26,16,0.9)"; ctx.lineWidth = 2;
  roundRect(ctx, x - 58, y - 108, 116, 66, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f3e2bd"; roundRect(ctx, x - 50, y - 100, 100, 50, 4); ctx.fill();
  ctx.fillStyle = "#c79a3e";
  ctx.beginPath(); ctx.moveTo(x, y - 124); ctx.lineTo(x + 9, y - 108); ctx.lineTo(x - 9, y - 108); ctx.closePath(); ctx.fill();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.fillStyle = "#5a3f22"; ctx.fillText("명예 순위", x, y - 86);
  ctx.strokeStyle = "rgba(90,63,34,0.35)"; ctx.lineWidth = 1;
  [0, 1].forEach((i) => { ctx.beginPath(); ctx.moveTo(x - 36, y - 72 + i * 9); ctx.lineTo(x + 36, y - 72 + i * 9); ctx.stroke(); });
  const glow = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.globalAlpha = 0.5 + glow * 0.4;
  ctx.fillStyle = "#ffd873"; ctx.font = "16px 'Do Hyeon', sans-serif";
  ctx.fillText("★", x, y - 134 - glow * 3);
  ctx.restore();
}

/* 채팅 말풍선 — 14글자씩 끊어 세 줄까지. 아랫변 가운데에 꼬리 */
function drawBubble(ctx, x, y, text, alpha) {
  const lines = [];
  for (let i = 0; i < text.length && lines.length < 3; i += 14) lines.push(text.slice(i, i + 14));
  if (text.length > 42) lines[2] = `${lines[2].slice(0, 13)}…`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "12px 'Jua', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, lh = 15, hh = lines.length * lh + 8;
  const top = y - hh;
  ctx.fillStyle = "rgba(250,244,230,0.94)";
  roundRect(ctx, x - w / 2, top, w, hh, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(120,96,64,0.6)"; ctx.lineWidth = 1;
  roundRect(ctx, x - w / 2, top, w, hh, 8); ctx.stroke();
  ctx.fillStyle = "#3a2c1c";
  lines.forEach((l, i) => ctx.fillText(l, x, top + 4 + lh / 2 + i * lh));
  ctx.restore();
}

/* 바탕 그림 — 그림 한 장이 가로 tile 만큼을 덮는다. 맵이 더 넓으면 좌우로 뒤집어 이어 붙여 이음새가 보이지 않게 한다 */
function drawTiled(ctx, im, M, cam) {
  const TW = M.tile || M.w;
  const kx = im.naturalWidth / TW, ky = im.naturalHeight / M.h;
  const sy = cam.y * ky, sh = H * ky;
  for (let k = Math.floor(cam.x / TW); k * TW < cam.x + W; k++) {
    const x0 = k * TW;
    const v0 = Math.max(cam.x, x0), v1 = Math.min(cam.x + W, x0 + TW);
    if (v1 <= v0) continue;
    const dx = v0 - cam.x, dw = v1 - v0;
    if (k % 2 === 0) {
      ctx.drawImage(im, (v0 - x0) * kx, sy, dw * kx, sh, dx, 0, dw, H);
    } else {
      ctx.save();
      ctx.translate(dx + dw, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, (TW - (v1 - x0)) * kx, sy, dw * kx, sh, 0, 0, dw, H);
      ctx.restore();
    }
  }
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
  const bgName = M.bg || M.id;
  const bim = M.dungeon ? null : mapImg(rpgFile(bgName));
  if (M.dungeon) {                                    // 던전 — 코드로 그린 바닥(던전마다 하나만 남긴다)
    const key = `dg:${M.dungeon}`;
    let bg = bgs && bgs[key];
    if (bgs && !bg) {
      Object.keys(bgs).forEach((k) => { if (k.startsWith("dg:")) delete bgs[k]; });
      bg = bgs[key] = paintDungeon(M);
    }
    if (bg) ctx.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
    else { ctx.fillStyle = (DG_LOOKS[M.dungeon] || DG_LOOKS.stone1).floor; ctx.fillRect(0, 0, W, H); }
  } else if (bim) {
    drawTiled(ctx, bim, M, cam);
    if (M.tint) { ctx.fillStyle = M.tint; ctx.fillRect(0, 0, W, H); }
  } else if (mapImgFailed(rpgFile(bgName))) {          // 파일이 없을 때만 예전처럼 코드로 그린다
    const bg = (bgs && bgs[M.id]) || (bgs && (bgs[M.id] = paintMap(M.id)));
    if (bg) ctx.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
  } else { ctx.fillStyle = M.id === "plaza" ? "#4f6e34" : "#557a37"; ctx.fillRect(0, 0, W, H); }
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  (M.paths || []).forEach((pts) => dirtPath(ctx, pts, 64));
  if (M.dungeon) drawTorches(ctx, M, cam, time);
  if (M.pvp) drawArenaFloor(ctx, M);
  const inView = (x, y, pad = 160) => x > cam.x - pad && x < cam.x + W + pad && y > cam.y - pad && y < cam.y + H + pad;

  // 내 사거리 — 토끼가 들어오면 또렷해진다
  if (me && me.down <= 0 && !M.safe) {
    const rr = heroRange(me);
    const foe = M.pvp && me.dvs >= 0 ? g.heroes[me.dvs] : null;
    const on = M.pvp
      ? !!(foe && foe.map === M.id && foe.down <= 0 && dist(me.x, me.y, foe.x, foe.y) <= rr)
      : g.mobs.some((m) => m.map === M.id && dist(me.x, me.y, m.x, m.y) <= rr);
    ctx.save();
    ctx.translate(me.x, me.y); ctx.scale(1, RPG.squash);
    ctx.globalAlpha = on ? 0.09 : 0.04; ctx.fillStyle = elemOf(me).key;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.5 : 0.25; ctx.strokeStyle = elemOf(me).light; ctx.lineWidth = 1.4;
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
    (MAP_TREES[M.id] || []).forEach((t) => { if (inView(t.x, t.y)) order.push({ y: t.y, tree: t }); });
  }
  g.mobs.forEach((m) => { if (!m.dead && m.map === M.id && inView(m.x, m.y)) order.push({ y: m.y, m }); });
  g.heroes.forEach((h) => { if (h && h.map === M.id) order.push({ y: h.y, h }); });
  drawDust(ctx, g, M.id, time);
  order.sort((a, b) => a.y - b.y);
  order.forEach((o) => {
    if (o.m) (MOB_DRAW[o.m.type] || drawRabbit)(ctx, o.m, time);
    else if (o.h) drawHero(ctx, g, o.h, time);
    else if (o.gate) drawGate(ctx, o.gate, time);
    else if (o.npc) drawNpc(ctx, g, o.npc, time);
    else if (o.fountain) drawFountain(ctx, time);
    else if (o.prop) drawProp(ctx, o.prop);
    else if (o.tree) drawFieldTree(ctx, o.tree);
  });

  if (M.dungeon) drawDungeonDark(ctx, me, cam);
  g.fx.forEach((f) => { if (here(f) && (f.kind !== "art" || (FX_ART[f.art] || {}).over)) drawFx(ctx, f); });
  ctx.globalAlpha = 1;
  // 채팅 말풍선 — 모든 것 위에
  if (g.bubbles) {
    const now = performance.now();
    g.heroes.forEach((h, pi) => {
      const b = g.bubbles[pi];
      if (!h || !b || h.map !== M.id) return;
      if (now > b.until) { delete g.bubbles[pi]; return; }
      drawBubble(ctx, h.x, h.y - 96, b.text, Math.min(1, (b.until - now) / 400));
    });
  }
  ctx.restore();
  if (g.banner) drawBanner(ctx, g.banner);
}
