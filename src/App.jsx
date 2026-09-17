import { useEffect, useRef, useState, useCallback } from "react";

/* ────────────────────────────────────────────────────────────
   네 갈래 방어선 — 4인 협동 디펜스
   한 대의 키보드로 네 명이 함께 중앙 요새를 지킵니다.
   ──────────────────────────────────────────────────────────── */

const W = 860, H = 640, CX = 430, CY = 320;
const R_SPAWN = 272;     // 적이 나오는 관문까지의 거리
const R_CORE = 88;       // 성문 앞 (길이 여기서 끝난다)
const TOTAL_WAVES = 15;
const PREP = 9;

/* ── 색 ─────────────────────────────────────────────────── */
const C = {
  grass: "#6aa844",
  grassDark: "#528c35",
  grassLight: "#7dbb52",
  grassDeep: "#3f7128",
  dirt: "#c9a163",
  dirtLight: "#ddbb84",
  dirtEdge: "#9a7340",
  stone: "#d5cdba",
  stoneMid: "#b3a993",
  stoneDark: "#847b68",
  wood: "#8a5c34",
  woodDark: "#5f3d21",
  roof: "#3f6fb5",
  roofDark: "#2c5290",
  ink: "#2c2118",
  gold: "#f0c04a",
  hpGood: "#5fc45c",
  hpLow: "#d2453f",
};

// 플레이어(=병과) 색
const P = [
  { key: "#4e9e5a", dark: "#2f6b39", light: "#78c283", name: "궁수" },
  { key: "#d2793a", dark: "#95501f", light: "#eda061", name: "포병" },
  { key: "#4a8ed2", dark: "#2a5f96", light: "#7cb6ea", name: "마법" },
  { key: "#a86fc9", dark: "#71428c", light: "#c99ae0", name: "보급" },
];

/* ── 길 ─────────────────────────────────────────────────── */
const DIRS4 = [
  { dx: 0, dy: -1, name: "북" },
  { dx: 1, dy: 0, name: "동" },
  { dx: 0, dy: 1, name: "남" },
  { dx: -1, dy: 0, name: "서" },
];

// 코어에서 떨어진 거리. 앞쪽(idx 0)이 바깥, 뒤쪽(idx 4)이 코어에 가깝다
const DIST = [236, 200, 164, 128, 96];

function makeLane(li) {
  const { dx, dy } = DIRS4[li];
  const nx = -dy, ny = dx;                  // 길에 수직인 방향
  const amp = li % 2 === 0 ? 26 : -26;      // 경로마다 굽는 쪽을 다르게
  const bend = (s) => amp * Math.sin(s * Math.PI * 1.7) * Math.sin(s * Math.PI);
  const at = (s) => {
    const r = R_SPAWN + (R_CORE - R_SPAWN) * s;
    const w = bend(s);
    return { x: CX + dx * r + nx * w, y: CY + dy * r + ny * w };
  };

  const N = 90, pts = [], cum = [0];
  for (let k = 0; k < N; k++) pts.push(at(k / (N - 1)));
  for (let k = 1; k < N; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  return { pts, cum, len: cum[N - 1], dx, dy, nx, ny, at, bend, name: DIRS4[li].name };
}

const LANES = [0, 1, 2, 3].map(makeLane);

// 경로 위 u(0~1, 길이 비율) 지점의 좌표와 진행 방향
function posAt(lane, u) {
  const L = LANES[lane];
  const target = Math.max(0, Math.min(1, u)) * L.len;
  let lo = 0, hi = L.cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (L.cum[mid] <= target) lo = mid; else hi = mid;
  }
  const seg = L.cum[hi] - L.cum[lo] || 1;
  const f = (target - L.cum[lo]) / seg;
  const a = L.pts[lo], b = L.pts[hi];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ax: b.x - a.x, ay: b.y - a.y };
}

/* ── 자리(타워 터) ──────────────────────────────────────── */
const SLOTS = [];
LANES.forEach((L, li) => {
  DIST.forEach((d, si) => {
    const s = (R_SPAWN - d) / (R_SPAWN - R_CORE);
    const p = L.at(s), q = L.at(Math.min(1, s + 0.012));
    let tx = q.x - p.x, ty = q.y - p.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const side = si % 2 === 0 ? 1 : -1;     // 길 양옆으로 번갈아
    SLOTS.push({ lane: li, idx: si, x: p.x - ty * 40 * side, y: p.y + tx * 40 * side });
  });
});
const sk = (lane, idx) => lane * 5 + idx;

// 이동 인접 그래프: 각 경로(북0·동1·남2·서3)는 안쪽(코어 쪽)으로 갈수록 idx가 커진다.
// 경로마다 남는 축 하나(CW_DIR)는 어느 칸에서든 시계 방향 옆 경로의 같은 칸으로 이어져 있다.
// 반시계 방향은 그 경로 고유의 "코어 쪽" 방향(TOWARD)과 겹치므로, 그 축이 막히는 가장 안쪽 칸에서만 넘어갈 수 있다.
const TOWARD = ["down", "left", "up", "right"];
const AWAY = { down: "up", up: "down", left: "right", right: "left" };
const CW_DIR = ["right", "down", "left", "up"];

/* ── 규칙 ───────────────────────────────────────────────── */
const CLASSES = [
  { name: "궁수탑", cost: 30, range: 158, dmg: 15, interval: 0.95, note: "단일 대상 · 사거리가 가장 길다" },
  { name: "대포탑", cost: 40, range: 118, dmg: 11, interval: 1.5, splash: 48, note: "착탄 지점 범위 피해" },
  { name: "서리탑", cost: 25, range: 128, dmg: 4, interval: 0.85, slow: 0.5, slowT: 1.6, note: "적 이동 속도를 절반으로" },
  { name: "보급소", cost: 35, range: 140, dmg: 0, interval: 0, gold: 0.45, buff: 0.25, note: "주변 타워 강화 · 골드 생성" },
];

const SKILLS = [
  { name: "집중 사격", cd: 32, note: "궁수탑 피해 2배 · 8초" },
  { name: "융단 폭격", cd: 34, note: "모든 적에게 45 피해" },
  { name: "한파", cd: 30, note: "모든 적 정지 · 4초" },
  { name: "긴급 보급", cd: 36, note: "전원 45 골드 · 성채 12 회복" },
];

const ENEMY = {
  grunt: { hp: 24, spd: 27, dmg: 4, gold: 6, r: 8, res: 0, label: "오크 보병" },
  rusher: { hp: 15, spd: 55, dmg: 3, gold: 5, r: 7, res: 0, label: "고블린 척후" },
  armor: { hp: 58, spd: 18, dmg: 7, gold: 11, r: 10, res: 0.25, label: "중장갑 트롤" },
  boss: { hp: 340, spd: 14, dmg: 25, gold: 60, r: 16, res: 0.15, label: "오우거 지휘관" },
};

const KEYS = [
  { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", build: "KeyQ", skill: "KeyE",
    cap: { move: "W A S D", build: "Q", skill: "E" } },
  { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", build: "Period", skill: "Slash",
    cap: { move: "↑ ← ↓ →", build: ".", skill: "/" } },
  { left: "KeyJ", right: "KeyL", up: "KeyI", down: "KeyK", build: "KeyU", skill: "KeyO",
    cap: { move: "I J K L", build: "U", skill: "O" } },
  { left: "Digit4", right: "Digit6", up: "Digit8", down: "Digit5", build: "Digit7", skill: "Digit9",
    cap: { move: "8 4 5 6", build: "7", skill: "9" } },
];

const CODEMAP = {};
KEYS.forEach((k, i) => {
  ["left", "right", "up", "down", "build", "skill"].forEach((a) => {
    CODEMAP[k[a]] = [i, a];
    if (k[a].startsWith("Digit")) CODEMAP["Numpad" + k[a].slice(5)] = [i, a];
  });
});

/* ── 상태 ───────────────────────────────────────────────── */
function makeGame() {
  return {
    phase: "ready",
    wave: 0,
    timer: PREP,
    core: { hp: 100, max: 100 },
    players: [0, 1, 2, 3].map((i) => {
      const s = SLOTS[sk(i, 2)];
      return {
        gold: 90, cd: 0, lane: i, slot: 2, built: 0, kills: 0,
        cx: s.x, cy: s.y, cr: CLASSES[i].range, jolt: 0, heldKeys: [], holdT: 0,
      };
    }),
    towers: new Array(20).fill(null),
    enemies: [],
    bullets: [],
    fx: [],
    queue: [],
    spawnT: 0,
    focus: 0,
    shake: 0,
    hitFlash: 0,
    paused: false,
    speed: 1,
    t: 0,
  };
}

function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildQueue(n) {
  const count = 6 + Math.floor(n * 2.2);
  const laneCount = n < 2 ? 2 : n < 4 ? 3 : 4;
  const active = shuffle([0, 1, 2, 3]).slice(0, laneCount);
  const list = [];
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    const r = Math.random();
    if (n >= 3 && r < 0.32) type = "rusher";
    else if (n >= 5 && r > 0.76) type = "armor";
    list.push({ type, lane: active[i % active.length] });
  }
  if (n % 5 === 0) list.push({ type: "boss", lane: active[Math.floor(Math.random() * active.length)] });
  return list;
}

/* ── 그리기 도우미 ──────────────────────────────────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shadow(ctx, x, y, rx, ry, alpha = 0.22) {
  ctx.fillStyle = `rgba(28,42,20,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 길에서 얼마나 떨어져 있는지 (지형 장식이 길을 덮지 않게)
function distToPaths(x, y) {
  let best = 1e9;
  for (const L of LANES) {
    for (let k = 0; k < L.pts.length; k += 2) {
      const d = Math.hypot(L.pts[k].x - x, L.pts[k].y - y);
      if (d < best) best = d;
    }
  }
  return best;
}

/* ── 정적 배경(지형·길·숲) — 한 번만 그려서 재사용 ─────── */
function paintTerrain(ctx) {
  const rnd = mulberry32(20260917);

  // 잔디 바탕
  const g = ctx.createRadialGradient(CX, CY - 40, 60, CX, CY, 560);
  g.addColorStop(0, "#77b44d");
  g.addColorStop(0.55, C.grass);
  g.addColorStop(1, "#4d8632");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 잔디 얼룩
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = 14 + rnd() * 48;
    ctx.fillStyle = rnd() > 0.5 ? "rgba(125,187,82,0.30)" : "rgba(63,113,40,0.20)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 잔디 포기
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (distToPaths(x, y) < 28) continue;
    const h = 3 + rnd() * 4;
    ctx.strokeStyle = rnd() > 0.45 ? "rgba(62,110,38,0.55)" : "rgba(140,200,95,0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2 - rnd() * 2, y - h);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2 + rnd() * 2, y - h * 0.85);
    ctx.stroke();
  }

  // 길: 바깥 그림자 → 흙 → 안쪽 밝은 결
  const strokePath = (L, width, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(L.pts[0].x, L.pts[0].y);
    for (let k = 1; k < L.pts.length; k++) ctx.lineTo(L.pts[k].x, L.pts[k].y);
    ctx.stroke();
  };
  LANES.forEach((L) => strokePath(L, 58, "rgba(47,84,28,0.45)"));
  LANES.forEach((L) => strokePath(L, 52, C.dirtEdge));
  LANES.forEach((L) => strokePath(L, 46, C.dirt));
  LANES.forEach((L) => strokePath(L, 30, "rgba(226,193,142,0.55)"));

  // 길 위 자갈과 바퀴 자국
  LANES.forEach((L) => {
    for (let k = 4; k < L.pts.length - 4; k += 3) {
      const p = L.pts[k], q = L.pts[k + 1];
      let tx = q.x - p.x, ty = q.y - p.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const off = (rnd() - 0.5) * 34;
      const x = p.x - ty * off, y = p.y + tx * off;
      ctx.fillStyle = rnd() > 0.5 ? "rgba(146,110,62,0.55)" : "rgba(238,214,168,0.5)";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6 + rnd() * 2.6, 1.2 + rnd() * 1.8, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // 길가 돌
    for (let k = 3; k < L.pts.length - 3; k += 6) {
      const p = L.pts[k], q = L.pts[k + 1];
      let tx = q.x - p.x, ty = q.y - p.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      for (const side of [-1, 1]) {
        const off = side * (25 + rnd() * 4);
        const x = p.x - ty * off, y = p.y + tx * off;
        const r = 2.4 + rnd() * 2.2;
        ctx.fillStyle = "#9e968a";
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c2bbae";
        ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.25, r * 0.6, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  // 숲과 바위
  const spots = [];
  const okSpot = (x, y, pad) => {
    if (x < 16 || x > W - 16 || y < 16 || y > H - 16) return false;
    if (Math.hypot(x - CX, y - CY) < R_CORE + 34) return false;
    if (distToPaths(x, y) < 42) return false;
    for (const s of SLOTS) if (Math.hypot(s.x - x, s.y - y) < 44) return false;
    for (const s of spots) if (Math.hypot(s.x - x, s.y - y) < pad) return false;
    return true;
  };

  // 숲은 바깥일수록 빽빽하게, 전장(가운데)은 트이게
  const forestOdds = (x, y) => {
    const d = Math.hypot(x - CX, y - CY);
    if (d < 150) return 0;
    return Math.min(1, Math.pow((d - 150) / 210, 1.5));
  };

  const trees = [];
  for (let i = 0; i < 900 && trees.length < 52; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (rnd() > forestOdds(x, y)) continue;
    if (!okSpot(x, y, 46)) continue;
    spots.push({ x, y });
    // 한 그루가 자리 잡으면 곁에 한두 그루 더 — 무리 지어 자라게
    const group = 1 + Math.floor(rnd() * 2.6);
    for (let k = 0; k < group && trees.length < 52; k++) {
      const gx = x + (rnd() - 0.5) * 66, gy = y + (rnd() - 0.5) * 50;
      if (k > 0 && !okSpot(gx, gy, 30)) continue;
      spots.push({ x: gx, y: gy });
      trees.push({ x: gx, y: gy, s: 0.78 + rnd() * 0.5, pine: rnd() > 0.5, seed: rnd() * 99 });
    }
  }
  const rocks = [];
  for (let i = 0; i < 300 && rocks.length < 18; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!okSpot(x, y, 42)) continue;
    spots.push({ x, y });
    rocks.push({ x, y, s: 0.7 + rnd() * 0.7 });
  }
  const bushes = [];
  for (let i = 0; i < 340 && bushes.length < 30; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!okSpot(x, y, 34)) continue;
    spots.push({ x, y });
    bushes.push({ x, y, s: 0.65 + rnd() * 0.5, berry: rnd() > 0.65 });
  }

  // 들꽃
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (distToPaths(x, y) < 32) continue;
    const col = ["#f2e46b", "#f0f0ef", "#eba3c6", "#f5b657"][Math.floor(rnd() * 4)];
    ctx.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      const a = (Math.PI / 2) * k;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 낮은 것부터 그려 겹침이 자연스럽게
  const scenery = [...rocks.map((o) => ({ ...o, k: "rock" })),
                   ...bushes.map((o) => ({ ...o, k: "bush" })),
                   ...trees.map((o) => ({ ...o, k: "tree" }))].sort((a, b) => a.y - b.y);
  scenery.forEach((o) => {
    if (o.k === "rock") drawRock(ctx, o.x, o.y, o.s);
    else if (o.k === "bush") drawBush(ctx, o.x, o.y, o.s, o.berry);
    else drawTree(ctx, o.x, o.y, o.s, o.pine, o.seed);
  });

  // 가장자리 어둡게
  const vig = ctx.createRadialGradient(CX, CY, 220, CX, CY, 620);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(18,40,12,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawTree(ctx, x, y, s, pine, seed) {
  shadow(ctx, x + 3 * s, y + 3 * s, 15 * s, 6 * s, 0.24);
  ctx.fillStyle = C.woodDark;
  roundRect(ctx, x - 3 * s, y - 14 * s, 6 * s, 16 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#7d5330";
  roundRect(ctx, x - 3 * s, y - 14 * s, 3 * s, 16 * s, 2 * s);
  ctx.fill();

  if (pine) {
    for (let k = 0; k < 3; k++) {
      const w = (20 - k * 4) * s, h = 17 * s, ty = y - 10 * s - k * 11 * s;
      ctx.fillStyle = ["#2f6628", "#377230", "#3f8035"][k];
      ctx.beginPath();
      ctx.moveTo(x, ty - h);
      ctx.lineTo(x + w, ty);
      ctx.lineTo(x - w, ty);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(120,190,90,0.35)";
      ctx.beginPath();
      ctx.moveTo(x, ty - h);
      ctx.lineTo(x - w, ty);
      ctx.lineTo(x - w * 0.25, ty);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const blobs = [[0, -30, 17], [-13, -22, 12], [13, -23, 12], [-6, -38, 11], [7, -37, 10]];
    ctx.fillStyle = "#2f6b28";
    blobs.forEach(([bx, by, r]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#3f8434";
    blobs.forEach(([bx, by, r]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, (y + by * s) - 2 * s, r * 0.86 * s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "rgba(134,199,94,0.75)";
    ctx.beginPath(); ctx.arc(x - 7 * s, y - 36 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 * s + (seed % 3), y - 28 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRock(ctx, x, y, s) {
  shadow(ctx, x + 2 * s, y + 2 * s, 14 * s, 5 * s, 0.22);
  ctx.fillStyle = "#77747c";
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y + 3 * s);
  ctx.lineTo(x - 9 * s, y - 11 * s);
  ctx.lineTo(x + 2 * s, y - 15 * s);
  ctx.lineTo(x + 12 * s, y - 6 * s);
  ctx.lineTo(x + 13 * s, y + 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9c99a2";
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y - 11 * s);
  ctx.lineTo(x + 2 * s, y - 15 * s);
  ctx.lineTo(x + 6 * s, y - 7 * s);
  ctx.lineTo(x - 5 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, y - 10 * s);
  ctx.lineTo(x + 1 * s, y - 13 * s);
  ctx.lineTo(x - 1 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
}

function drawBush(ctx, x, y, s, berry) {
  shadow(ctx, x + 2 * s, y + 2 * s, 12 * s, 4.5 * s, 0.2);
  ctx.fillStyle = "#2f6b28";
  [[-8, 0, 9], [8, 0, 9], [0, -5, 11]].forEach(([bx, by, r]) => {
    ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#44903a";
  [[-7, -2, 7], [7, -2, 7], [0, -7, 9]].forEach(([bx, by, r]) => {
    ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
  });
  if (berry) {
    ctx.fillStyle = "#d4453f";
    [[-5, -6], [3, -9], [7, -3]].forEach(([bx, by]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, 1.9 * s, 0, Math.PI * 2); ctx.fill();
    });
  }
}

/* ── 관문(적 출현구) ───────────────────────────────────── */
function drawPortal(ctx, lane, time) {
  const L = LANES[lane];
  const p = L.pts[0];
  const ang = Math.atan2(L.dy, L.dx);
  ctx.save();
  ctx.translate(p.x, p.y);
  shadow(ctx, 0, 14, 30, 9, 0.28);

  ctx.rotate(ang + Math.PI / 2);
  // 돌 아치
  ctx.fillStyle = C.stoneDark;
  roundRect(ctx, -30, -20, 60, 40, 8); ctx.fill();
  ctx.fillStyle = C.stoneMid;
  roundRect(ctx, -27, -18, 54, 34, 7); ctx.fill();
  // 어두운 입구
  const gg = ctx.createLinearGradient(0, -14, 0, 14);
  gg.addColorStop(0, "#160f1c");
  gg.addColorStop(1, "#3a2340");
  ctx.fillStyle = gg;
  roundRect(ctx, -18, -12, 36, 26, 6); ctx.fill();
  // 안쪽 기운
  const pulse = 0.4 + 0.25 * Math.sin(time * 2.2 + lane);
  ctx.fillStyle = `rgba(190,110,230,${pulse})`;
  ctx.beginPath(); ctx.ellipse(0, 2, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  // 돌 블록 선
  ctx.strokeStyle = "rgba(60,54,44,0.5)";
  ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 14, -18); ctx.lineTo(i * 14, -12); ctx.stroke();
  }
  ctx.restore();
}

/* ── 성채 ───────────────────────────────────────────────── */
const OUTLINE = "rgba(48,34,20,0.62)";

function inkPath(ctx, fill, lw = 1.8, stroke = OUTLINE) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// 원통형 탑 하나 (성채 모서리·중앙 공용)
function keepTower(ctx, x, y, r, h, roofCol, roofDark, time, flag) {
  // 몸통
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x + r, y - h);
  ctx.lineTo(x + r, y);
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI);
  ctx.closePath();
  inkPath(ctx, C.stoneMid);
  ctx.beginPath();
  ctx.moveTo(x - r, y - 2);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x - r * 0.15, y - h);
  ctx.lineTo(x - r * 0.15, y - 2);
  ctx.closePath();
  ctx.fillStyle = C.stone; ctx.fill();
  // 성가퀴
  ctx.beginPath();
  ctx.ellipse(x, y - h, r + 2.5, (r + 2.5) * 0.4, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stone, 1.6);
  const n = Math.max(4, Math.round(r / 2.6));
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const bx = x + Math.cos(a) * (r + 1.5);
    const by = y - h + Math.sin(a) * (r + 1.5) * 0.4;
    ctx.beginPath();
    roundRect(ctx, bx - 2.4, by - 6, 4.8, 7, 1.2);
    inkPath(ctx, C.stoneMid, 1.2);
  }
  // 지붕
  const rh = r * 1.9;
  ctx.beginPath();
  ctx.moveTo(x, y - h - 6 - rh);
  ctx.lineTo(x + r + 4, y - h - 4);
  ctx.lineTo(x - r - 4, y - h - 4);
  ctx.closePath();
  inkPath(ctx, roofDark, 1.8);
  ctx.beginPath();
  ctx.moveTo(x, y - h - 6 - rh);
  ctx.lineTo(x + 1, y - h - 4);
  ctx.lineTo(x - r - 4, y - h - 4);
  ctx.closePath();
  ctx.fillStyle = roofCol; ctx.fill();
  // 창
  ctx.beginPath();
  roundRect(ctx, x - r * 0.32, y - h * 0.62, r * 0.64, h * 0.34, r * 0.32);
  inkPath(ctx, "#4b3f2e", 1.2);

  if (flag) {
    const top = y - h - 6 - rh;
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 20); ctx.stroke();
    const wv = Math.sin(time * 3) * 3;
    ctx.beginPath();
    ctx.moveTo(x, top - 20);
    ctx.quadraticCurveTo(x + 13, top - 17 + wv, x + 23, top - 14);
    ctx.lineTo(x + 23, top - 7);
    ctx.quadraticCurveTo(x + 12, top - 5 - wv, x, top - 7);
    ctx.closePath();
    inkPath(ctx, C.gold, 1.4);
  }
}

function drawCastle(ctx, g, time) {
  const ratio = Math.max(0, g.core.hp / g.core.max);
  shadow(ctx, CX, CY + 44, 92, 28, 0.32);

  // 언덕(바닥 단) — 옆면을 먼저 그려 높이감을 준다
  ctx.beginPath();
  ctx.ellipse(CX, CY + 24, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#7f9a4e", 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY + 14, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#93b25c", 2);

  // 포석 마당
  ctx.beginPath();
  ctx.ellipse(CX, CY + 12, 80, 46, 0, 0, Math.PI * 2);
  inkPath(ctx, "#bfb5a0", 1.8);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX, CY + 12, 80, 46, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(122,112,94,0.4)";
  ctx.lineWidth = 1.3;
  for (let a = 0; a < 14; a++) {
    const t = (a / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(t) * 20, CY + 12 + Math.sin(t) * 12);
    ctx.lineTo(CX + Math.cos(t) * 82, CY + 12 + Math.sin(t) * 48);
    ctx.stroke();
  }
  for (const rr of [0.45, 0.75]) {
    ctx.beginPath();
    ctx.ellipse(CX, CY + 12, 80 * rr, 46 * rr, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 성벽 — 옆면 + 윗면으로 두께를 만든다
  ctx.beginPath();
  ctx.ellipse(CX, CY + 6, 62, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stoneDark, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4, 62, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stone, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4, 46, 24, 0, 0, Math.PI * 2);
  inkPath(ctx, "#a79c86", 1.6);

  // 성가퀴
  for (let a = 0; a < 18; a++) {
    const t = (a / 18) * Math.PI * 2;
    const x = CX + Math.cos(t) * 62, y = CY - 4 + Math.sin(t) * 36;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t + Math.PI / 2);
    ctx.beginPath();
    roundRect(ctx, -4.6, -7, 9.2, 10, 1.6);
    inkPath(ctx, a % 2 ? C.stoneMid : C.stone, 1.3);
    ctx.restore();
  }

  // 네 방향 성문
  DIRS4.forEach((d) => {
    const x = CX + d.dx * 58, y = CY - 4 + d.dy * 34;
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.beginPath();
    roundRect(ctx, -10, -13, 20, 20, 8);
    inkPath(ctx, "#5d3f22", 1.8);
    ctx.beginPath();
    roundRect(ctx, -7.5, -11, 15, 17, 7);
    inkPath(ctx, "#8a5c34", 1.4);
    ctx.strokeStyle = "#54381f"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7.5, -2); ctx.lineTo(7.5, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 6); ctx.stroke();
    ctx.restore();
  });

  // 모서리 탑 넷 + 중앙 첨탑
  keepTower(ctx, CX - 46, CY + 8, 11, 26, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX + 46, CY + 8, 11, 26, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX - 34, CY - 14, 10, 24, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX + 34, CY - 14, 10, 24, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX, CY - 2, 19, 48, C.roof, C.roofDark, time, true);

  // 피해 흔적
  if (ratio < 0.65) {
    ctx.strokeStyle = "rgba(70,58,44,0.6)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(CX - 12, CY - 34); ctx.lineTo(CX - 6, CY - 22); ctx.lineTo(CX - 12, CY - 10);
    ctx.stroke();
  }
  if (ratio < 0.35) {
    for (let i = 0; i < 4; i++) {
      const ph = (time * 0.85 + i * 0.5) % 1;
      ctx.fillStyle = `rgba(92,82,74,${0.45 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(CX + 10 + i * 6, CY - 52 - ph * 40, 5 + ph * 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 체력 띠
  const bw = 96;
  ctx.beginPath();
  roundRect(ctx, CX - bw / 2 - 4, CY + 50, bw + 8, 15, 7);
  inkPath(ctx, "rgba(38,28,18,0.86)", 1.6, "rgba(20,14,8,0.9)");
  ctx.fillStyle = "#392d20";
  roundRect(ctx, CX - bw / 2, CY + 53, bw, 9, 4); ctx.fill();
  const hc = ratio > 0.5 ? C.hpGood : ratio > 0.25 ? "#e0a53c" : C.hpLow;
  ctx.fillStyle = hc;
  roundRect(ctx, CX - bw / 2, CY + 53, Math.max(3, bw * ratio), 9, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, CX - bw / 2, CY + 53, Math.max(3, bw * ratio), 4, 2); ctx.fill();
}

/* ── 타워 터 ────────────────────────────────────────────── */
function drawPad(ctx, s, occupied, time) {
  shadow(ctx, s.x, s.y + 8, 24, 9, 0.26);
  // 흙더미 + 돌판(옆면을 먼저 그려 두께를 준다)
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 5, 22, 14, 0, 0, Math.PI * 2);
  inkPath(ctx, "#6f6353", 1.6);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 22, 14, 0, 0, Math.PI * 2);
  inkPath(ctx, occupied ? "#b0a68f" : "#a89d86", 1.6);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 3, 16, 8, 0, Math.PI, Math.PI * 2); ctx.fill();

  if (!occupied) {
    const pulse = 0.45 + 0.25 * Math.sin(time * 2.4 + s.x * 0.05);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "rgba(255,243,206,0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 15, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 망치 표시
    ctx.translate(s.x, s.y);
    ctx.rotate(-0.5);
    ctx.beginPath(); roundRect(ctx, -1.1, -2, 2.2, 8.5, 1);
    inkPath(ctx, "#b98a52", 1);
    ctx.beginPath(); roundRect(ctx, -4.8, -5.6, 9.6, 4.2, 1.4);
    inkPath(ctx, "#cfd4da", 1);
    ctx.restore();
  }
}

/* ── 타워 ───────────────────────────────────────────────── */
function drawTower(ctx, t, s, time) {
  const lv = t.lv;
  const recoil = t.pulse > 0 ? Math.pow(Math.max(0, t.pulse) / 0.4, 2) : 0;
  const col = P[t.owner];
  ctx.save();
  ctx.translate(s.x, s.y - 2);

  if (t.owner === 0) drawArcherTower(ctx, lv, col, time, t, recoil);
  else if (t.owner === 1) drawCannonTower(ctx, lv, col, time, t, recoil);
  else if (t.owner === 2) drawFrostTower(ctx, lv, col, time, t, recoil);
  else drawSupplyTower(ctx, lv, col, time, t, recoil);

  ctx.restore();

  // 단계 표시
  for (let i = 0; i < lv; i++) {
    const x = s.x - (lv - 1) * 4 + i * 8, y = s.y + 17;
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI * 2) / 5;
      const r = k % 2 === 0 ? 3.2 : 1.4;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,66,16,0.8)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function towerBase(ctx, w, h) {
  ctx.beginPath();
  roundRect(ctx, -w / 2, -h, w, h + 4, 5);
  inkPath(ctx, C.stoneDark, 2);
  ctx.beginPath();
  roundRect(ctx, -w / 2, -h, w, h, 5);
  inkPath(ctx, "#a99e88", 2);
  ctx.fillStyle = C.stone;
  roundRect(ctx, -w / 2 + 2, -h + 2, w * 0.42, h - 4, 4); ctx.fill();
  ctx.strokeStyle = "rgba(92,82,64,0.45)";
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1, -h + (h / 3) * i);
    ctx.lineTo(w / 2 - 1, -h + (h / 3) * i);
    ctx.stroke();
  }
}

function drawArcherTower(ctx, lv, col, time, t, recoil) {
  const h = 26 + lv * 5;
  towerBase(ctx, 30, h);
  // 출입구와 화살 구멍
  ctx.beginPath(); roundRect(ctx, -6, -13, 12, 13, 5);
  inkPath(ctx, "#4b3f2e", 1.4);
  ctx.beginPath(); roundRect(ctx, -2.6, -h + 7, 5.2, 9, 2.6);
  inkPath(ctx, "#4b3f2e", 1.2);
  // 나무 발코니
  ctx.beginPath(); roundRect(ctx, -24, -h - 9, 48, 10, 4);
  inkPath(ctx, C.woodDark, 1.8);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -24, -h - 10, 48, 7, 4); ctx.fill();
  // 지붕을 받치는 기둥
  ctx.strokeStyle = C.woodDark; ctx.lineWidth = 4;
  [-19, 19].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, -h - 9); ctx.lineTo(x, -h - 26); ctx.stroke();
  });
  ctx.strokeStyle = C.wood; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-19, -h - 17); ctx.lineTo(19, -h - 17); ctx.stroke();
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 52); ctx.lineTo(26, -h - 25); ctx.lineTo(-26, -h - 25); ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 52); ctx.lineTo(4, -h - 25); ctx.lineTo(-26, -h - 25); ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  ctx.beginPath(); roundRect(ctx, -27, -h - 27, 54, 5, 2.5);
  inkPath(ctx, col.dark, 1.5);
  // 궁수
  const aim = t.aim || 0;
  ctx.save();
  ctx.translate(0, -h - 16);
  ctx.beginPath(); roundRect(ctx, -5, -1, 10, 9, 4);
  inkPath(ctx, col.dark, 1.5);
  ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2);
  inkPath(ctx, "#e8cfa8", 1.5);
  ctx.save();
  ctx.rotate(aim);
  ctx.strokeStyle = "#6f4a28";
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(9 - recoil * 3, -2, 7.5, -1.15, 1.15); ctx.stroke();
  ctx.strokeStyle = "rgba(252,248,238,0.95)";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(6.6 - recoil * 3, -8.6); ctx.lineTo(6.6 - recoil * 3, 4.6); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // 깃발
  if (lv >= 3) {
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h - 52); ctx.lineTo(0, -h - 68); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h - 68);
    ctx.lineTo(15, -h - 63 + Math.sin(time * 4) * 2);
    ctx.lineTo(0, -h - 58);
    ctx.closePath();
    inkPath(ctx, col.light, 1.4);
  }
}

function drawCannonTower(ctx, lv, col, time, t, recoil) {
  const h = 24 + lv * 4;
  towerBase(ctx, 36, h);
  // 나무 포대
  ctx.beginPath(); roundRect(ctx, -24, -h - 11, 48, 12, 5);
  inkPath(ctx, C.woodDark, 1.8);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -24, -h - 12, 48, 8, 5); ctx.fill();
  // 화약통
  ctx.beginPath(); roundRect(ctx, -29, -h - 3, 11, 14, 3.5);
  inkPath(ctx, "#6d4526", 1.5);
  ctx.fillStyle = "#4a3a2a";
  roundRect(ctx, -29, -h + 2, 11, 2.4, 1); ctx.fill();
  // 포탄 더미
  ctx.beginPath(); ctx.arc(23, -h + 2, 4.2, 0, Math.PI * 2);
  inkPath(ctx, "#33333a", 1.3);
  ctx.beginPath(); ctx.arc(28, -h + 4, 4.2, 0, Math.PI * 2);
  inkPath(ctx, "#33333a", 1.3);

  // 대포
  const aim = t.aim || 0;
  ctx.save();
  ctx.translate(0, -h - 18);
  ctx.rotate(aim);
  const back = recoil * 6;
  ctx.beginPath(); roundRect(ctx, -13 - back, -8, 34 + lv * 3, 16, 7);
  inkPath(ctx, "#3b3b42", 2);
  ctx.fillStyle = "#5b5b66";
  roundRect(ctx, -11 - back, -6.5, 30 + lv * 3, 6, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(20 + lv * 3 - back, 0, 8.4, 0, Math.PI * 2);
  inkPath(ctx, "#2a2a30", 1.8);
  ctx.fillStyle = "#131317";
  ctx.beginPath(); ctx.arc(21 + lv * 3 - back, 0, 5.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-11 - back, 0, 8.4, 0, Math.PI * 2);
  inkPath(ctx, col.key, 1.8);
  ctx.fillStyle = col.light;
  ctx.beginPath(); ctx.arc(-12.6 - back, -2.4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 바퀴
  [-14, 14].forEach((x) => {
    ctx.beginPath(); ctx.arc(x, -h - 6, 6.4, 0, Math.PI * 2);
    inkPath(ctx, "#4a3421", 1.8);
    ctx.fillStyle = "#7a562f";
    ctx.beginPath(); ctx.arc(x, -h - 6, 2.6, 0, Math.PI * 2); ctx.fill();
  });
}

function drawFrostTower(ctx, lv, col, time, t) {
  const h = 32 + lv * 6;
  // 얼음 기둥
  ctx.beginPath();
  ctx.moveTo(-17, 2); ctx.lineTo(-11, -h); ctx.lineTo(11, -h); ctx.lineTo(17, 2);
  ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(-17, 2); ctx.lineTo(-11, -h); ctx.lineTo(0, -h); ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-13, -4); ctx.lineTo(-9.5, -h + 5); ctx.lineTo(-4, -h + 5); ctx.lineTo(-7, -4);
  ctx.closePath(); ctx.fill();
  // 띠
  ctx.beginPath(); roundRect(ctx, -15, -h * 0.55, 30, 7, 3);
  inkPath(ctx, "#dff3ff", 1.5);

  // 룬 고리
  ctx.save();
  ctx.translate(0, -h - 3);
  ctx.rotate(time * 0.8);
  ctx.strokeStyle = `rgba(200,238,255,${0.55 + 0.22 * Math.sin(time * 3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 7, 0, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    ctx.fillStyle = "rgba(236,250,255,0.9)";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 19, Math.sin(a) * 7, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 떠 있는 결정
  const bob = Math.sin(time * 2.2) * 3;
  ctx.save();
  ctx.translate(0, -h - 13 + bob);
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
  glow.addColorStop(0, "rgba(190,236,255,0.8)");
  glow.addColorStop(1, "rgba(120,190,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(time * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0);
  ctx.closePath();
  inkPath(ctx, "#bfe8ff", 1.6, "rgba(70,130,180,0.7)");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(4, -2); ctx.lineTo(0, 3); ctx.lineTo(-4, -2);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 바닥 고드름
  for (let k = -1; k <= 1; k += 2) {
    ctx.beginPath();
    ctx.moveTo(k * 15, 4); ctx.lineTo(k * 21, -8 - lv * 1.5); ctx.lineTo(k * 10, -2);
    ctx.closePath();
    inkPath(ctx, "rgba(214,243,255,0.92)", 1.4, "rgba(90,150,200,0.6)");
  }
}

function drawSupplyTower(ctx, lv, col, time) {
  const h = 26 + lv * 4;
  // 통나무 벽
  ctx.beginPath(); roundRect(ctx, -22, -h, 44, h + 3, 4);
  inkPath(ctx, C.woodDark, 2);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -22, -h, 44, h - 2, 4); ctx.fill();
  ctx.strokeStyle = "rgba(70,44,24,0.55)";
  ctx.lineWidth = 1.3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-21, -h + (h / 3) * i); ctx.lineTo(21, -h + (h / 3) * i); ctx.stroke();
  }
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 28); ctx.lineTo(29, -h + 2); ctx.lineTo(-29, -h + 2); ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 28); ctx.lineTo(5, -h + 2); ctx.lineTo(-29, -h + 2); ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  // 문
  ctx.beginPath(); roundRect(ctx, -8, -17, 16, 17, 6);
  inkPath(ctx, "#4b3a28", 1.6);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(4.5, -8, 1.6, 0, Math.PI * 2); ctx.fill();
  // 상자와 자루
  ctx.beginPath(); roundRect(ctx, 17, -14, 14, 14, 2.5);
  inkPath(ctx, "#9a6a3c", 1.6);
  ctx.strokeStyle = "#6a4523"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(17, -7); ctx.lineTo(31, -7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-26, -6, 7, 8, 0, 0, Math.PI * 2);
  inkPath(ctx, "#c8b189", 1.5);
  // 금화 반짝임
  const ph = (time * 0.7) % 1;
  ctx.globalAlpha = 0.9 * (1 - ph);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(24, -20 - ph * 18, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // 깃발
  if (lv >= 3) {
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h - 28); ctx.lineTo(0, -h - 44); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h - 44);
    ctx.lineTo(15, -h - 39 + Math.sin(time * 4) * 2);
    ctx.lineTo(0, -h - 34);
    ctx.closePath();
    inkPath(ctx, col.light, 1.4);
  }
}

/* ── 적 ─────────────────────────────────────────────────── */
function drawEnemy(ctx, e, time) {
  const cfg = ENEMY[e.type];
  const s = cfg.r / 5.4;
  const grow = Math.min(1, e.age / 0.4);
  const walk = e.freeze > 0 ? 0 : Math.sin(e.age * (e.type === "rusher" ? 16 : 9));
  const bob = e.freeze > 0 ? 0 : Math.abs(walk) * 1.6 * s;

  shadow(ctx, e.x, e.y + 9 * s, 11 * s, 4.4 * s, 0.26 * grow);

  ctx.save();
  ctx.globalAlpha = grow;
  ctx.translate(e.x, e.y - bob);
  ctx.scale(s * (0.55 + grow * 0.45) * (e.ax < 0 ? -1 : 1), s * (0.55 + grow * 0.45));

  if (e.type === "grunt") drawOrc(ctx, walk, time);
  else if (e.type === "rusher") drawGoblin(ctx, walk, time);
  else if (e.type === "armor") drawTroll(ctx, walk, time);
  else drawOgre(ctx, walk, time);

  // 피격 섬광
  if (e.flash > 0) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, e.flash * 6)})`;
    ctx.fillRect(-24, -34, 48, 50);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();

  // 얼음
  if (e.freeze > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#a8ddf5";
    ctx.beginPath();
    ctx.moveTo(e.x - 11 * s, e.y + 9 * s);
    ctx.lineTo(e.x - 7 * s, e.y - 16 * s);
    ctx.lineTo(e.x, e.y - 22 * s);
    ctx.lineTo(e.x + 8 * s, e.y - 15 * s);
    ctx.lineTo(e.x + 11 * s, e.y + 9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  } else if (e.slow > 0) {
    ctx.fillStyle = "rgba(150,215,245,0.5)";
    for (let k = 0; k < 3; k++) {
      const a = time * 3 + k * 2.1;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * 11 * s, e.y + Math.sin(a) * 5 * s - 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 체력 막대
  const hr = Math.max(0, e.hp / e.max);
  e.shown = e.shown === undefined ? hr : e.shown + (hr - e.shown) * 0.2;
  if (e.shown < 0.999) {
    const bw = (e.type === "boss" ? 42 : 24) * (e.type === "boss" ? 1 : s * 1.1);
    const by = e.y - (e.type === "boss" ? 34 : 20) * s - 6;
    ctx.fillStyle = "rgba(20,16,12,0.75)";
    roundRect(ctx, e.x - bw / 2 - 1.5, by - 1.5, bw + 3, 6.5, 3); ctx.fill();
    ctx.fillStyle = e.shown > 0.5 ? C.hpGood : e.shown > 0.25 ? "#e5a93e" : C.hpLow;
    roundRect(ctx, e.x - bw / 2, by, Math.max(1.5, bw * e.shown), 3.5, 2); ctx.fill();
  }
}

function limbs(ctx, walk, col, w, len) {
  ctx.fillStyle = col;
  [-1, 1].forEach((k) => {
    const sw = walk * k * 2.6;
    ctx.save();
    ctx.translate(k * 4, 3);
    ctx.rotate(sw * 0.16);
    roundRect(ctx, -w / 2, 0, w, len, w / 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawOrc(ctx, walk) {
  limbs(ctx, walk, "#3f5f24", 5, 9);
  // 몸통
  ctx.fillStyle = "#6f9a3f";
  roundRect(ctx, -8, -10, 16, 15, 6); ctx.fill();
  ctx.fillStyle = "#83b04d";
  roundRect(ctx, -8, -10, 9, 15, 6); ctx.fill();
  // 허리띠
  ctx.fillStyle = "#6b4526";
  roundRect(ctx, -8.5, -2, 17, 3.6, 1.6); ctx.fill();
  ctx.fillStyle = C.gold;
  roundRect(ctx, -2, -2.2, 4, 4, 1.4); ctx.fill();
  // 팔 + 몽둥이
  ctx.save();
  ctx.rotate(-0.3 + walk * 0.22);
  ctx.fillStyle = "#6f9a3f";
  roundRect(ctx, 4, -8, 10, 4.6, 2.3); ctx.fill();
  ctx.fillStyle = "#7d5330";
  roundRect(ctx, 12, -11, 4, 12, 2); ctx.fill();
  ctx.fillStyle = "#95653c";
  ctx.beginPath(); ctx.arc(14, -12, 4.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = "#7ea94a";
  ctx.beginPath(); ctx.arc(0, -16, 7.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6f9a3f";
  ctx.beginPath(); ctx.arc(2.6, -14.5, 6.2, 0, Math.PI * 2); ctx.fill();
  // 귀
  ctx.fillStyle = "#6f9a3f";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 6.4, -18); ctx.lineTo(k * 11, -21); ctx.lineTo(k * 6.6, -14.5);
    ctx.closePath(); ctx.fill();
  });
  // 눈 + 엄니
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(3.4, -17.4, 2.4, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1d1508";
  ctx.beginPath(); ctx.arc(4.2, -17.3, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3e5a1e"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(1.2, -20.4); ctx.lineTo(5.8, -19.4); ctx.stroke();
  ctx.fillStyle = "#f4f1e2";
  ctx.beginPath(); ctx.moveTo(1.6, -12.6); ctx.lineTo(2.9, -15.2); ctx.lineTo(4.2, -12.6); ctx.closePath(); ctx.fill();
}

function drawGoblin(ctx, walk) {
  limbs(ctx, walk, "#7c4520", 4, 8);
  ctx.fillStyle = "#c07a3c";
  roundRect(ctx, -6.5, -9, 13, 13, 5); ctx.fill();
  ctx.fillStyle = "#d89152";
  roundRect(ctx, -6.5, -9, 7, 13, 5); ctx.fill();
  ctx.fillStyle = "#5e3a1c";
  roundRect(ctx, -7, -2.5, 14, 3, 1.5); ctx.fill();
  // 단검
  ctx.save();
  ctx.rotate(-0.55 + walk * 0.3);
  ctx.fillStyle = "#c07a3c";
  roundRect(ctx, 3, -8, 9, 4, 2); ctx.fill();
  ctx.fillStyle = "#cfd4da";
  ctx.beginPath(); ctx.moveTo(11, -8.5); ctx.lineTo(19, -10.5); ctx.lineTo(11, -4.8); ctx.closePath(); ctx.fill();
  ctx.restore();
  // 머리 + 큰 귀
  ctx.fillStyle = "#d89152";
  ctx.beginPath(); ctx.arc(1, -14, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c07a3c";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 5, -16); ctx.lineTo(k * 14, -22); ctx.lineTo(k * 5.4, -11.5);
    ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(4, -15.2, 2.2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1d1508";
  ctx.beginPath(); ctx.arc(4.7, -15.1, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7c4520"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1.5, -11.4); ctx.lineTo(6, -11.9); ctx.stroke();
}

function drawTroll(ctx, walk) {
  limbs(ctx, walk, "#4a5666", 6.5, 10);
  // 몸통 + 갑옷
  ctx.fillStyle = "#7d8ba0";
  roundRect(ctx, -11, -13, 22, 19, 7); ctx.fill();
  ctx.fillStyle = "#93a2b5";
  roundRect(ctx, -11, -13, 12, 19, 7); ctx.fill();
  ctx.fillStyle = "#5d6878";
  roundRect(ctx, -11.5, -6, 23, 5, 2); ctx.fill();
  // 어깨 갑옷
  ctx.fillStyle = "#b9c3cf";
  ctx.beginPath(); ctx.ellipse(-9, -13, 6.5, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -13, 6.5, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  // 방패
  ctx.save();
  ctx.rotate(walk * 0.08);
  ctx.fillStyle = "#6a4a2c";
  roundRect(ctx, -19, -12, 11, 19, 5); ctx.fill();
  ctx.fillStyle = "#8a6238";
  roundRect(ctx, -18, -11, 9, 17, 4); ctx.fill();
  ctx.fillStyle = "#b9c3cf";
  ctx.beginPath(); ctx.arc(-13.5, -2.5, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 머리 + 투구
  ctx.fillStyle = "#93a2b5";
  ctx.beginPath(); ctx.arc(1, -20, 7.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#adb9c8";
  ctx.beginPath(); ctx.arc(1, -21.5, 7.6, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5d6878";
  roundRect(ctx, -6.6, -21.5, 15, 4, 1.6); ctx.fill();
  ctx.fillStyle = "#ffcf4d";
  ctx.beginPath(); ctx.ellipse(4.4, -19.4, 1.9, 1.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawOgre(ctx, walk, time) {
  limbs(ctx, walk, "#4a3b58", 8, 12);
  // 망토
  ctx.fillStyle = "#4b2340";
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.quadraticCurveTo(-20 - Math.sin(time * 3) * 2, 2, -10, 10);
  ctx.lineTo(10, 10);
  ctx.quadraticCurveTo(20 + Math.sin(time * 3) * 2, 2, 12, -18);
  ctx.closePath(); ctx.fill();
  // 몸통
  ctx.fillStyle = "#7b6389";
  roundRect(ctx, -13, -18, 26, 25, 9); ctx.fill();
  ctx.fillStyle = "#907aa0";
  roundRect(ctx, -13, -18, 14, 25, 9); ctx.fill();
  ctx.fillStyle = "#3f3049";
  roundRect(ctx, -13.5, -8, 27, 6, 2.5); ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(0, -5, 3.4, 0, Math.PI * 2); ctx.fill();
  // 도끼
  ctx.save();
  ctx.rotate(-0.25 + walk * 0.16);
  ctx.fillStyle = "#6b4526";
  roundRect(ctx, 8, -26, 4.4, 34, 2); ctx.fill();
  ctx.fillStyle = "#c9ced8";
  ctx.beginPath();
  ctx.moveTo(10, -26); ctx.lineTo(26, -30); ctx.lineTo(26, -14); ctx.lineTo(10, -18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#8d949f";
  ctx.beginPath();
  ctx.moveTo(10, -22); ctx.lineTo(26, -22); ctx.lineTo(26, -14); ctx.lineTo(10, -18);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = "#8a729a";
  ctx.beginPath(); ctx.arc(0, -26, 9.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3f3049";
  ctx.beginPath(); ctx.arc(0, -28, 9.6, Math.PI, Math.PI * 2); ctx.fill();
  // 뿔
  ctx.fillStyle = "#e8e1cc";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 6, -33); ctx.lineTo(k * 13, -42); ctx.lineTo(k * 10.5, -31);
    ctx.closePath(); ctx.fill();
  });
  // 눈
  ctx.fillStyle = "#ff6a4a";
  [-1, 1].forEach((k) => {
    ctx.beginPath(); ctx.ellipse(k * 3.6 + 1, -25, 2.2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#f4f1e2";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 3 + 1, -20); ctx.lineTo(k * 4.6 + 1, -16); ctx.lineTo(k * 5.8 + 1, -20);
    ctx.closePath(); ctx.fill();
  });
}

/* ── 탄과 효과 ──────────────────────────────────────────── */
function drawBullet(ctx, b) {
  const ang = Math.atan2(b.vy || 0, b.vx || 1);
  if (b.kind === "arrow") {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.strokeStyle = "#7d5330";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = "#d7dce2";
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8e2d2";
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (b.kind === "ball") {
    const lift = Math.sin(Math.min(1, b.travel) * Math.PI) * 22;
    ctx.fillStyle = "rgba(30,26,20,0.2)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2c2c33";
    ctx.beginPath(); ctx.arc(b.x, b.y - lift, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#54545e";
    ctx.beginPath(); ctx.arc(b.x - 1.6, b.y - lift - 1.6, 2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.x * 0.2 + b.y * 0.2);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    glow.addColorStop(0, "rgba(200,240,255,0.9)");
    glow.addColorStop(1, "rgba(140,205,245,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e6f7ff";
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawFx(ctx, f) {
  const k = f.kind;
  if (k === "boom") {
    const p = 1 - f.t / f.life;
    const r = f.r * (0.3 + p * 1.1);
    ctx.globalAlpha = 1 - p;
    const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    grd.addColorStop(0, "rgba(255,240,180,0.95)");
    grd.addColorStop(0.5, "rgba(245,150,52,0.75)");
    grd.addColorStop(1, "rgba(120,60,24,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (k === "poof") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.75;
    ctx.fillStyle = f.color || "rgba(212,206,190,1)";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + f.x;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * p * 13, f.y + Math.sin(a) * p * 9 - p * 6, 5 + p * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "ice") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = "#d8f2ff";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const d = p * 16;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.7, 2.4 * (1 - p), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "coin") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, (1 - p) * 2.2);
    const y = f.y - p * 26;
    ctx.fillStyle = "#c79320";
    ctx.beginPath(); ctx.ellipse(f.x, y, 5, 5.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.ellipse(f.x, y - 0.8, 4.2, 4.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(f.x - 1.2, y - 2, 1.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (k === "text") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, f.t * 2.4) * (1 - Math.pow(p, 3));
    ctx.font = "700 14px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    const y = f.y - 30 - (1 - Math.pow(1 - p, 2)) * 18;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(28,22,14,0.9)";
    ctx.strokeText(f.text, f.x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, y);
    ctx.globalAlpha = 1;
  }
}

/* ── 본체 ───────────────────────────────────────────────── */
export default function App() {
  const cvsRef = useRef(null);
  const G = useRef(makeGame());
  const bgRef = useRef(null);
  const [hud, setHud] = useState(() => snap(G.current));
  const [helpOpen, setHelpOpen] = useState(false);

  function snap(g) {
    return {
      phase: g.phase, wave: g.wave, timer: Math.max(0, g.timer),
      hp: Math.max(0, Math.round(g.core.hp)), max: g.core.max,
      left: g.queue.length + g.enemies.length,
      paused: g.paused, speed: g.speed,
      players: g.players.map((p) => ({
        gold: Math.floor(p.gold), cd: Math.max(0, p.cd),
        lane: p.lane, slot: p.slot, built: p.built, kills: p.kills,
      })),
    };
  }

  const start = useCallback(() => {
    if (G.current.phase === "over" || G.current.phase === "clear") G.current = makeGame();
    const g = G.current;
    if (g.phase !== "ready") return;
    g.phase = "prep";
    g.wave = 1;
    g.timer = PREP;
    g.queue = [];
    setHud(snap(g));
  }, []);

  const togglePause = useCallback(() => {
    const g = G.current;
    if (g.phase !== "prep" && g.phase !== "wave") return;
    g.paused = !g.paused;
    setHud(snap(g));
  }, []);

  const setSpeed = useCallback((v) => {
    const g = G.current;
    g.speed = v;
    g.paused = false;
    setHud(snap(g));
  }, []);

  /* 입력 */
  useEffect(() => {
    function onKey(e) {
      const g = G.current;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (g.phase === "ready" || g.phase === "over" || g.phase === "clear") start();
        return;
      }
      if (e.code === "Escape") { e.preventDefault(); togglePause(); return; }
      const m = CODEMAP[e.code];
      if (!m) return;
      e.preventDefault();
      if (e.repeat) return;
      if (g.phase !== "prep" && g.phase !== "wave") return;
      if (g.paused) return;
      const [pi, act] = m;
      if (act === "build") doBuild(g, pi);
      else if (act === "skill") doSkill(g, pi);
      else {
        applyMove(g, pi, act);
        const p = g.players[pi];
        if (!p.heldKeys.includes(act)) p.heldKeys.push(act);
        p.holdT = 0.24;
      }
    }
    function onUp(e) {
      const m = CODEMAP[e.code];
      if (!m) return;
      const [pi, act] = m;
      const p = G.current.players[pi];
      p.heldKeys = p.heldKeys.filter((a) => a !== act);
    }
    function onBlur() { G.current.players.forEach((p) => (p.heldKeys = [])); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [start, togglePause]);

  function applyMove(g, pi, act) {
    const p = g.players[pi];
    const lane = p.lane, idx = p.slot;
    const toward = TOWARD[lane];
    const away = AWAY[toward];

    if (act === away) {
      if (idx === 0) { p.jolt = 0.12; return; }
      p.slot = idx - 1;
      p.jolt = 0.2;
      return;
    }
    if (act === toward) {
      if (idx < 4) { p.slot = idx + 1; p.jolt = 0.2; return; }
      p.lane = (lane + 3) % 4;
      p.jolt = 0.2;
      return;
    }
    if (act === CW_DIR[lane]) {
      p.lane = (lane + 1) % 4;
      p.jolt = 0.2;
      return;
    }
    p.jolt = 0.12;
  }

  function say(g, x, y, text, color) {
    g.fx.push({ kind: "text", x, y, text, color, t: 1.1, life: 1.1 });
  }

  function doBuild(g, pi) {
    const p = g.players[pi];
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const cls = CLASSES[pi];
    if (!t) {
      if (p.gold < cls.cost) return say(g, s.x, s.y, "골드 부족", "#f0dcb4");
      p.gold -= cls.cost;
      p.built++;
      g.towers[key] = { owner: pi, lv: 1, cd: 0, pulse: 0.4, aim: 0 };
      g.fx.push({ kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5 });
      say(g, s.x, s.y, cls.name, P[pi].light);
    } else if (t.owner === pi) {
      if (t.lv >= 4) return say(g, s.x, s.y, "최대 단계", "#f0dcb4");
      const cost = Math.round(cls.cost * (0.7 + t.lv * 0.45));
      if (p.gold < cost) return say(g, s.x, s.y, `${cost} 골드 필요`, "#f0dcb4");
      p.gold -= cost;
      t.lv++;
      t.pulse = 0.4;
      g.fx.push({ kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5, color: "rgba(246,220,150,1)" });
      say(g, s.x, s.y, `${t.lv}단계`, P[pi].light);
    } else {
      say(g, s.x, s.y, `${t.owner + 1}P 자리`, "#f0dcb4");
    }
  }

  function doSkill(g, pi) {
    const p = g.players[pi];
    if (p.cd > 0) return say(g, CX, CY - 96, `${SKILLS[pi].name} ${Math.ceil(p.cd)}초`, "#f0dcb4");
    p.cd = SKILLS[pi].cd;
    if (pi === 0) {
      g.focus = 8;
      say(g, CX, CY - 96, "집중 사격!", P[0].light);
    } else if (pi === 1) {
      g.enemies.forEach((e) => {
        hurt(g, e, 45, 1, true);
        g.fx.push({ kind: "boom", x: e.x, y: e.y, r: 30, t: 0.4, life: 0.4 });
      });
      g.shake = 0.45;
      say(g, CX, CY - 96, "융단 폭격!", P[1].light);
    } else if (pi === 2) {
      g.enemies.forEach((e) => {
        e.freeze = Math.max(e.freeze, 4);
        g.fx.push({ kind: "ice", x: e.x, y: e.y, t: 0.5, life: 0.5 });
      });
      say(g, CX, CY - 96, "한파!", P[2].light);
    } else {
      g.players.forEach((q) => (q.gold += 45));
      g.core.hp = Math.min(g.core.max, g.core.hp + 12);
      for (let i = 0; i < 6; i++) {
        g.fx.push({ kind: "coin", x: CX + (Math.random() - 0.5) * 70, y: CY + 20, t: 0.9, life: 0.9 });
      }
      say(g, CX, CY - 96, "긴급 보급!", P[3].light);
    }
  }

  function hurt(g, e, dmg, byPlayer, ignoreRes) {
    if (e.dead) return;
    const d = ignoreRes ? dmg : dmg * (1 - ENEMY[e.type].res);
    e.hp -= d;
    e.flash = 0.12;
    if (e.hp <= 0) {
      e.dead = true;
      const reward = Math.round(ENEMY[e.type].gold + g.wave * 0.6);
      if (typeof byPlayer === "number") {
        g.players[byPlayer].gold += reward;
        g.players[byPlayer].kills++;
      } else {
        g.players.forEach((p) => (p.gold += reward / 4));
      }
      g.fx.push({ kind: "poof", x: e.x, y: e.y, t: 0.45, life: 0.45 });
      g.fx.push({ kind: "coin", x: e.x, y: e.y - 6, t: 0.8, life: 0.8 });
    }
  }

  /* 루프 */
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 정적 배경 한 번만 그리기
    const bg = document.createElement("canvas");
    bg.width = W * dpr;
    bg.height = H * dpr;
    const bctx = bg.getContext("2d");
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintTerrain(bctx);
    bgRef.current = bg;

    let raf, last = performance.now(), frame = 0;
    const loop = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      const g = G.current;
      if (!g.paused) {
        const steps = g.speed;
        for (let i = 0; i < steps; i++) step(g, dt);
      }
      draw(ctx, g);
      if (++frame % 5 === 0) setHud(snap(g));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function step(g, dt) {
    g.t += dt;
    if (g.shake > 0) g.shake -= dt;
    if (g.hitFlash > 0) g.hitFlash -= dt;
    g.fx.forEach((f) => (f.t -= dt));
    g.fx = g.fx.filter((f) => f.t > 0);

    const kPos = 1 - Math.exp(-dt * 15);
    const kRad = 1 - Math.exp(-dt * 9);
    g.players.forEach((p, pi) => {
      const key = sk(p.lane, p.slot);
      const s = SLOTS[key];
      const t = g.towers[key];
      const range = t ? CLASSES[t.owner].range + 12 * (t.lv - 1) : CLASSES[pi].range;
      p.cx += (s.x - p.cx) * kPos;
      p.cy += (s.y - p.cy) * kPos;
      p.cr += (range - p.cr) * kRad;
      if (p.jolt > 0) p.jolt -= dt;
    });

    if (g.phase !== "prep" && g.phase !== "wave") return;

    g.players.forEach((p, pi) => {
      if (!p.heldKeys.length) return;
      p.holdT -= dt;
      if (p.holdT <= 0) {
        applyMove(g, pi, p.heldKeys[p.heldKeys.length - 1]);
        p.holdT = 0.11;
      }
    });

    g.players.forEach((p) => { if (p.cd > 0) p.cd -= dt; });
    if (g.focus > 0) g.focus -= dt;

    if (g.phase === "prep") {
      g.timer -= dt;
      if (g.timer <= 0) {
        g.phase = "wave";
        g.queue = buildQueue(g.wave);
        g.spawnT = 0;
      }
    } else if (g.phase === "wave") {
      g.spawnT -= dt;
      if (g.queue.length && g.spawnT <= 0) {
        const q = g.queue.shift();
        const base = ENEMY[q.type];
        const scale = Math.pow(1.155, g.wave - 1);
        const p0 = posAt(q.lane, 0);
        g.enemies.push({
          type: q.type, lane: q.lane, p: 0,
          hp: base.hp * scale, max: base.hp * scale,
          x: p0.x, y: p0.y, ax: p0.ax, ay: p0.ay,
          slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, dead: false, age: 0,
        });
        g.spawnT = q.type === "boss" ? 1.4 : 0.62;
      }
      if (!g.queue.length && !g.enemies.length) {
        if (g.wave >= TOTAL_WAVES) { g.phase = "clear"; return; }
        g.players.forEach((p) => (p.gold += 22 + g.wave * 3));
        g.wave++;
        g.phase = "prep";
        g.timer = PREP;
      }
    }

    // 보급소
    const supports = [];
    g.towers.forEach((t, i) => { if (t && t.owner === 3) supports.push({ t, s: SLOTS[i] }); });
    supports.forEach(({ t }) => {
      g.players.forEach((p) => (p.gold += CLASSES[3].gold * t.lv * dt));
    });

    // 사격
    g.towers.forEach((t, i) => {
      if (!t) return;
      if (t.pulse > 0) t.pulse -= dt;
      const cls = CLASSES[t.owner];
      if (t.owner === 3) return;
      const s = SLOTS[i];
      let mul = 1;
      supports.forEach((sp) => {
        if (Math.hypot(sp.s.x - s.x, sp.s.y - s.y) <= CLASSES[3].range) {
          mul = Math.max(mul, 1 + CLASSES[3].buff * sp.t.lv);
        }
      });
      t.cd -= dt * mul;
      const range = cls.range + 12 * (t.lv - 1);
      let target = null;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) > range) continue;
        if (!target || e.p > target.p) target = e;
      }
      if (target) t.aim = Math.atan2(target.y - (s.y - 20), target.x - s.x);
      if (t.cd > 0) return;
      if (!target) { t.cd = 0; return; }
      t.cd = cls.interval;
      let dmg = cls.dmg * (1 + 0.62 * (t.lv - 1));
      if (t.owner === 0 && g.focus > 0) dmg *= 2;
      g.bullets.push({
        x: s.x, y: s.y - 20, tx: target.x, ty: target.y, target, dmg,
        owner: t.owner, splash: cls.splash || 0, slow: cls.slow || 0, slowT: cls.slowT || 0,
        speed: t.owner === 1 ? 300 : 470,
        kind: t.owner === 0 ? "arrow" : t.owner === 1 ? "ball" : "shard",
        travel: 0, total: Math.max(1, Math.hypot(target.x - s.x, target.y - s.y + 20)),
        vx: target.x - s.x, vy: target.y - (s.y - 20),
      });
      t.pulse = 0.4;
      if (t.owner === 1) {
        g.fx.push({ kind: "poof", x: s.x + Math.cos(t.aim) * 22, y: s.y - 20 + Math.sin(t.aim) * 22,
          t: 0.3, life: 0.3, color: "rgba(230,224,210,1)" });
      }
    });

    // 탄
    g.bullets = g.bullets.filter((b) => {
      const tg = b.target;
      if (tg && !tg.dead) { b.tx = tg.x; b.ty = tg.y; }
      const dx = b.tx - b.x, dy = b.ty - b.y;
      const d = Math.hypot(dx, dy);
      const mv = b.speed * dt;
      b.vx = dx; b.vy = dy;
      b.travel = Math.min(1, 1 - d / b.total);
      if (d <= mv) {
        if (b.splash) {
          g.enemies.forEach((e) => {
            if (e.dead) return;
            const dd = Math.hypot(e.x - b.tx, e.y - b.ty);
            if (dd <= b.splash) hurt(g, e, b.dmg * (dd < b.splash * 0.5 ? 1 : 0.6), b.owner);
          });
          g.fx.push({ kind: "boom", x: b.tx, y: b.ty, r: b.splash, t: 0.42, life: 0.42 });
          g.shake = Math.max(g.shake, 0.12);
        } else if (tg && !tg.dead) {
          hurt(g, tg, b.dmg, b.owner);
          if (b.slow) {
            tg.slow = Math.max(tg.slow, b.slowT);
            tg.slowAmt = b.slow;
            g.fx.push({ kind: "ice", x: b.tx, y: b.ty, t: 0.4, life: 0.4 });
          }
        }
        return false;
      }
      b.x += (dx / d) * mv;
      b.y += (dy / d) * mv;
      return true;
    });

    // 적 이동
    g.enemies.forEach((e) => {
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.dead) return;
      if (e.freeze > 0) { e.freeze -= dt; return; }
      if (e.slow > 0) e.slow -= dt;
      const spd = ENEMY[e.type].spd * (e.slow > 0 ? e.slowAmt : 1);
      e.p += (spd * dt) / LANES[e.lane].len;
      const pos = posAt(e.lane, e.p);
      e.x = pos.x; e.y = pos.y; e.ax = pos.ax; e.ay = pos.ay;
      if (e.p >= 1) {
        e.dead = true;
        g.core.hp -= ENEMY[e.type].dmg;
        g.shake = 0.32;
        g.hitFlash = 0.35;
        g.fx.push({ kind: "boom", x: e.x, y: e.y, r: 26, t: 0.35, life: 0.35 });
      }
    });
    g.enemies = g.enemies.filter((e) => !e.dead);
    g.bullets = g.bullets.filter((b) => !b.target || !b.target.dead || b.splash);

    if (g.core.hp <= 0) { g.core.hp = 0; g.phase = "over"; }
  }

  /* 그리기 */
  function draw(ctx, g) {
    ctx.save();
    if (g.shake > 0) {
      const s = g.shake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);
    else { ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H); }

    const playing = g.phase === "prep" || g.phase === "wave";

    // 관문
    for (let i = 0; i < 4; i++) drawPortal(ctx, i, g.t);

    // 사거리 미리보기
    if (playing) {
      g.players.forEach((p, pi) => {
        ctx.fillStyle = `${P[pi].key}1c`;
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.cr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `${P[pi].key}66`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.cr, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // 타워 터
    SLOTS.forEach((s, i) => drawPad(ctx, s, !!g.towers[i], g.t));

    // 성채 · 타워 · 적을 y 순서로 겹쳐 그리기
    const layers = [{ y: CY + 30, kind: "castle" }];
    g.towers.forEach((t, i) => { if (t) layers.push({ y: SLOTS[i].y, kind: "tower", t, s: SLOTS[i] }); });
    g.enemies.forEach((e) => layers.push({ y: e.y, kind: "enemy", e }));
    layers.sort((a, b) => a.y - b.y);
    layers.forEach((o) => {
      if (o.kind === "castle") drawCastle(ctx, g, g.t);
      else if (o.kind === "tower") drawTower(ctx, o.t, o.s, g.t);
      else drawEnemy(ctx, o.e, g.t);
    });

    // 탄 · 효과
    g.bullets.forEach((b) => drawBullet(ctx, b));
    g.fx.forEach((f) => drawFx(ctx, f));

    // 플레이어 커서
    if (playing) {
      g.players.forEach((p, pi) => {
        const col = P[pi];
        const s = SLOTS[sk(p.lane, p.slot)];
        const gap = Math.hypot(s.x - p.cx, s.y - p.cy);
        const jo = p.jolt > 0 ? Math.pow(p.jolt / 0.2, 2) : 0;
        const b = 22 + jo * 5 + Math.min(gap * 0.05, 4) + Math.sin(g.t * 3 + pi) * 0.8;
        const arm = 8 + jo * 2;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(30,24,16,0.5)";
        ctx.lineWidth = 5;
        for (let pass = 0; pass < 2; pass++) {
          if (pass === 1) { ctx.strokeStyle = col.light; ctx.lineWidth = 2.6; }
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([ax, ay]) => {
            ctx.beginPath();
            ctx.moveTo(p.cx + ax * b, p.cy + ay * b * 0.82 - ay * arm);
            ctx.lineTo(p.cx + ax * b, p.cy + ay * b * 0.82);
            ctx.lineTo(p.cx + ax * b - ax * arm, p.cy + ay * b * 0.82);
            ctx.stroke();
          });
        }
        // 이름표
        const label = `${pi + 1}P`;
        ctx.font = "700 12px Jua, system-ui, sans-serif";
        ctx.textAlign = "center";
        const lw = 26;
        ctx.fillStyle = "rgba(28,22,14,0.82)";
        roundRect(ctx, p.cx - lw / 2, p.cy - b * 0.82 - 20, lw, 15, 5); ctx.fill();
        ctx.fillStyle = col.light;
        ctx.fillText(label, p.cx, p.cy - b * 0.82 - 9);
        ctx.restore();
      });
    }

    // 성채 피격 섬광
    if (g.hitFlash > 0) {
      ctx.fillStyle = `rgba(190,40,32,${g.hitFlash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // 일시정지
    if (g.paused && playing) {
      ctx.fillStyle = "rgba(18,30,16,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f4e7c8";
      ctx.font = "700 34px Jua, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("일시정지", CX, CY - 6);
      ctx.font = "500 15px Jua, system-ui, sans-serif";
      ctx.fillStyle = "rgba(244,231,200,0.8)";
      ctx.fillText("Esc 키로 계속합니다", CX, CY + 22);
    }
  }

  /* ── 화면 ─────────────────────────────────────────────── */
  const phaseLabel =
    hud.phase === "ready" ? "대기" :
    hud.phase === "prep" ? "배치 시간" :
    hud.phase === "wave" ? "교전 중" :
    hud.phase === "clear" ? "방어 성공" : "성채 함락";

  const playing = hud.phase === "prep" || hud.phase === "wave";
  const hpRatio = hud.hp / hud.max;

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>네 갈래 방어선</h1>
          <p>한 대의 키보드, 네 명의 수비대. 북·동·남·서에서 밀려오는 적을 막고 성채를 지키세요.</p>
        </div>
        <button className="btn-ghost" onClick={() => setHelpOpen((v) => !v)}>
          {helpOpen ? "적 정보 닫기" : "적 정보"}
        </button>
      </header>

      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          {/* 좌상단 자원 */}
          <div className="hud hud-left">
            <div className="crest">
              <Shield />
              <div className="crest-num" style={{ color: hpRatio > 0.5 ? "#a9e79c" : hpRatio > 0.25 ? "#f3c766" : "#f09a90" }}>
                {hud.hp}
              </div>
            </div>
            <div className="wave-box">
              <span className="wave-label">{phaseLabel}</span>
              <span className="wave-num">
                웨이브 {hud.wave || 0}<em>/{TOTAL_WAVES}</em>
              </span>
              <span className="wave-sub">
                {hud.phase === "prep" ? `${Math.ceil(hud.timer)}초 뒤 시작`
                  : hud.phase === "wave" ? `남은 적 ${hud.left}` : "—"}
              </span>
            </div>
          </div>

          {/* 우상단 속도 */}
          <div className="hud hud-right">
            <button className={`sbtn ${hud.paused ? "on" : ""}`} onClick={togglePause} title="일시정지 (Esc)">
              <span className="pause-glyph" />
            </button>
            <button className={`sbtn ${!hud.paused && hud.speed === 1 ? "on" : ""}`} onClick={() => setSpeed(1)}>×1</button>
            <button className={`sbtn ${!hud.paused && hud.speed === 2 ? "on" : ""}`} onClick={() => setSpeed(2)}>×2</button>
          </div>

          {/* 시작 · 종료 */}
          {!playing && (
            <div className="curtain">
              <div className="scroll-panel">
                <div className="scroll-eyebrow">
                  {hud.phase === "ready" ? "네 명 모두 자리에 앉았나요" : `웨이브 ${hud.wave}에서 종료`}
                </div>
                <h2>
                  {hud.phase === "ready" && <>성문이 곧 열립니다</>}
                  {hud.phase === "clear" && <>성채를 지켰습니다</>}
                  {hud.phase === "over" && <>성채가 무너졌습니다</>}
                </h2>
                <p>
                  {hud.phase === "ready" && `첫 웨이브까지 ${PREP}초의 배치 시간이 있습니다.`}
                  {hud.phase === "clear" && "15번의 웨이브를 모두 막아냈습니다."}
                  {hud.phase === "over" && "방어선을 다시 세워보세요."}
                </p>
                <button className="btn-main" onClick={start}>
                  {hud.phase === "ready" ? "방어 시작" : "다시 시작"}
                </button>
                <span className="hint">스페이스바로도 시작합니다</span>
              </div>
            </div>
          )}
        </div>

        {/* 플레이어 카드 */}
        <div className="party">
          {hud.players.map((p, i) => {
            const cls = CLASSES[i];
            const ready = p.cd <= 0;
            return (
              <div key={i} className="card" style={{ "--pc": P[i].key, "--pcl": P[i].light, "--pcd": P[i].dark }}>
                <div className="card-head">
                  <span className="badge"><ClassIcon i={i} /></span>
                  <span className="who">
                    <b>{i + 1}P</b> {cls.name}
                  </span>
                  <span className="coin"><Coin />{p.gold}</span>
                </div>
                <div className="card-note">{cls.note}</div>
                <div className="card-row">
                  <span>{LANES[p.lane].name} · {p.slot + 1}번 자리</span>
                  <span>건설 {p.built} · 처치 {p.kills}</span>
                </div>
                <div className={`skill ${ready ? "ready" : ""}`}>
                  <span className="skill-name">{SKILLS[i].name}</span>
                  <span className="skill-state">{ready ? "준비됨" : `${Math.ceil(p.cd)}초`}</span>
                  <span className="skill-bar">
                    <span style={{ width: `${ready ? 100 : (1 - p.cd / SKILLS[i].cd) * 100}%` }} />
                  </span>
                </div>
                <div className="keys">
                  <kbd>{KEYS[i].cap.move}</kbd><span>이동</span>
                  <kbd>{KEYS[i].cap.build}</kbd><span>건설</span>
                  <kbd>{KEYS[i].cap.skill}</kbd><span>스킬</span>
                </div>
              </div>
            );
          })}
        </div>

        {helpOpen && (
          <div className="codex">
            {Object.entries(ENEMY).map(([k, v]) => (
              <div key={k} className="codex-row">
                <span className="codex-name">{v.label}</span>
                <span className="codex-desc">
                  {k === "grunt" && "기본 병력. 3웨이브까지는 이 유형만 들어옵니다."}
                  {k === "rusher" && "3웨이브부터. 체력은 낮지만 두 배 빠릅니다."}
                  {k === "armor" && "5웨이브부터. 받는 피해를 25% 줄입니다."}
                  {k === "boss" && "5·10·15웨이브. 성채에 닿으면 25 피해를 줍니다."}
                </span>
                <span className="codex-stat">체력 {v.hp} · 속도 {v.spd}</span>
              </div>
            ))}
          </div>
        )}

        <p className="footnote">
          자리는 네 경로에 다섯 칸씩, 모두 스무 칸입니다. 좌우(또는 상하)로 누르면 옆 경로의 같은 칸으로 넘어갑니다.
          같은 자리에 자기 타워를 다시 지으면 4단계까지 강화됩니다.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jua&family=Do+Hyeon&display=swap');

        .page {
          min-height: 100vh;
          padding: 22px 20px 44px;
          background:
            radial-gradient(1200px 600px at 50% -10%, #33512c 0%, #1d2f1b 45%, #162415 100%);
          color: #f2e8d2;
          font-family: Jua, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;
          letter-spacing: -0.01em;
        }
        .masthead {
          max-width: 900px; margin: 0 auto 16px;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        }
        .masthead h1 {
          margin: 0; font-family: 'Do Hyeon', Jua, sans-serif; font-size: 30px; line-height: 1.1;
          color: #f6e5bb; text-shadow: 0 2px 0 #2c1f12, 0 4px 10px rgba(0,0,0,0.4);
          letter-spacing: -0.02em;
        }
        .masthead p { margin: 6px 0 0; font-size: 13px; color: #c3bda4; max-width: 560px; line-height: 1.6; }

        .stage { max-width: 900px; margin: 0 auto; }

        .frame {
          position: relative; border-radius: 14px; overflow: hidden;
          border: 3px solid #6b4f2c;
          box-shadow: 0 0 0 3px #2a1d10, 0 18px 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.25);
          background: #4d8632;
        }
        .frame canvas { width: 100%; height: auto; display: block; }

        .hud { position: absolute; top: 12px; display: flex; gap: 8px; align-items: stretch; }
        .hud-left { left: 12px; }
        .hud-right { right: 12px; }

        .crest, .wave-box, .sbtn {
          background: linear-gradient(#4a3722, #322416);
          border: 2px solid #8a6a3f; border-radius: 10px;
          box-shadow: 0 4px 0 #22180e, 0 6px 14px rgba(0,0,0,0.4);
        }
        .crest { display: flex; align-items: center; gap: 6px; padding: 6px 11px 6px 8px; }
        .crest svg { width: 22px; height: 22px; display: block; }
        .crest-num { font-family: 'Do Hyeon', sans-serif; font-size: 20px; line-height: 1; }

        .wave-box { display: flex; flex-direction: column; gap: 1px; padding: 5px 12px; }
        .wave-label { font-size: 10.5px; color: #d0ba8e; letter-spacing: 0.02em; }
        .wave-num { font-family: 'Do Hyeon', sans-serif; font-size: 16px; color: #f6e5bb; line-height: 1.2; }
        .wave-num em { font-style: normal; font-size: 11px; color: #b09a73; }
        .wave-sub { font-size: 10.5px; color: #c9b58c; }

        .sbtn {
          width: 38px; height: 38px; display: grid; place-items: center; cursor: pointer;
          color: #e8d7ae; font-family: 'Do Hyeon', sans-serif; font-size: 14px; padding: 0;
        }
        .sbtn:hover { filter: brightness(1.15); }
        .sbtn.on { background: linear-gradient(#7a5a2e, #5d4222); border-color: #d6b26a; color: #fff3d0; }
        .pause-glyph { width: 12px; height: 13px; border-left: 4px solid currentColor; border-right: 4px solid currentColor; }

        .curtain {
          position: absolute; inset: 0; display: grid; place-items: center;
          background: rgba(14,24,12,0.72); backdrop-filter: blur(2px);
        }
        .scroll-panel {
          width: min(420px, 82%); text-align: center; padding: 26px 28px 24px;
          background: linear-gradient(#f0e0bb, #dcc79b);
          border: 3px solid #8a6a3f; border-radius: 14px;
          box-shadow: 0 8px 0 #4a3520, 0 20px 40px rgba(0,0,0,0.45);
          color: #3a2a18;
        }
        .scroll-eyebrow { font-size: 11.5px; color: #8a6c44; }
        .scroll-panel h2 {
          margin: 6px 0 8px; font-family: 'Do Hyeon', sans-serif; font-size: 26px;
          color: #45301b; letter-spacing: -0.02em;
        }
        .scroll-panel p { margin: 0 0 16px; font-size: 13px; color: #6b533a; line-height: 1.6; }
        .btn-main {
          font-family: Jua, sans-serif; font-size: 15px; color: #fff4d8; cursor: pointer;
          padding: 11px 26px; border-radius: 10px; border: 2px solid #7c3f1c;
          background: linear-gradient(#d2793a, #a8521f);
          box-shadow: 0 4px 0 #6f3514, 0 8px 16px rgba(0,0,0,0.3);
        }
        .btn-main:active { transform: translateY(2px); box-shadow: 0 2px 0 #6f3514; }
        .hint { display: block; margin-top: 10px; font-size: 11.5px; color: #8a6c44; }

        .btn-ghost {
          font-family: Jua, sans-serif; font-size: 12.5px; color: #e8d7ae; cursor: pointer;
          padding: 8px 14px; border-radius: 9px; border: 2px solid #6b4f2c;
          background: linear-gradient(#3e2e1c, #2b2013);
          box-shadow: 0 3px 0 #1d1409;
        }
        .btn-ghost:hover { filter: brightness(1.15); }

        .party {
          margin-top: 14px; display: grid; gap: 10px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .card {
          background: linear-gradient(#3b2c1b, #2a1f13);
          border: 2px solid #6b4f2c; border-top-color: var(--pc);
          border-radius: 11px; padding: 10px 11px 11px;
          box-shadow: 0 4px 0 #1b1309, 0 8px 18px rgba(0,0,0,0.35);
        }
        .card-head { display: flex; align-items: center; gap: 7px; }
        .badge {
          width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
          background: linear-gradient(var(--pcl), var(--pc)); border: 1.5px solid var(--pcd);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .badge svg { width: 15px; height: 15px; display: block; }
        .who { font-size: 13.5px; color: #f2e3c2; }
        .who b { font-family: 'Do Hyeon', sans-serif; color: var(--pcl); }
        .coin { margin-left: auto; display: flex; align-items: center; gap: 4px;
          font-family: 'Do Hyeon', sans-serif; font-size: 16px; color: #f3d27f; }
        .coin svg { width: 14px; height: 14px; }

        .card-note { margin-top: 6px; font-size: 11px; color: #a8987a; line-height: 1.45; min-height: 30px; }
        .card-row {
          display: flex; justify-content: space-between; gap: 6px;
          font-size: 10.5px; color: #9c8d70; padding-top: 7px; margin-top: 3px;
          border-top: 1px solid rgba(160,130,90,0.25);
        }

        .skill { margin-top: 8px; display: grid; grid-template-columns: 1fr auto; gap: 2px 6px; align-items: center; }
        .skill-name { font-size: 12px; color: #8d8068; }
        .skill.ready .skill-name { color: #f2e3c2; }
        .skill-state { font-size: 10.5px; color: #9c8d70; }
        .skill.ready .skill-state { color: var(--pcl); }
        .skill-bar { grid-column: 1 / -1; height: 4px; border-radius: 3px; background: #1d1509; overflow: hidden; }
        .skill-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--pc), var(--pcl)); }

        .keys {
          margin-top: 9px; display: grid; grid-template-columns: auto 1fr; gap: 5px 7px;
          align-items: center; font-size: 10.5px; color: #93866c;
        }
        .keys kbd { justify-self: start; }
        kbd {
          font-family: 'Do Hyeon', sans-serif; font-size: 10.5px; color: #e2d2ac;
          padding: 2px 6px; border-radius: 5px; background: #1e1609;
          border: 1px solid #5b452a; box-shadow: 0 1.5px 0 #120d05;
        }

        .codex {
          margin-top: 12px; border: 2px solid #6b4f2c; border-radius: 11px; overflow: hidden;
          background: linear-gradient(#3b2c1b, #2a1f13);
        }
        .codex-row {
          display: flex; gap: 14px; align-items: baseline; padding: 9px 13px; font-size: 12px;
          border-top: 1px solid rgba(160,130,90,0.2);
        }
        .codex-row:first-child { border-top: none; }
        .codex-name { width: 96px; color: #f2e3c2; flex: none; }
        .codex-desc { flex: 1; color: #a8987a; }
        .codex-stat { color: #9c8d70; width: 112px; flex: none; text-align: right; }

        .footnote { margin: 14px 2px 0; font-size: 12px; color: #93866c; line-height: 1.7; }

        @media (max-width: 760px) {
          .party { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 440px) {
          .page { padding: 16px 12px 32px; }
          .party { grid-template-columns: 1fr; }
          .codex-row { flex-wrap: wrap; }
          .codex-stat { text-align: left; width: auto; }
        }
        button:focus-visible { outline: 2px solid #f3d27f; outline-offset: 2px; }
      `}</style>
    </div>
  );
}

/* ── 작은 아이콘 ────────────────────────────────────────── */
function Shield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l8 3v7c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V5l8-3z" fill="#c9d4dd" stroke="#6d798a" strokeWidth="1.4" />
      <path d="M12 4.2L6 6.4V12c0 3.8 2.4 6.7 6 7.9V4.2z" fill="#eaf1f6" />
      <path d="M12 7v9" stroke="#8d99a8" strokeWidth="1.2" />
    </svg>
  );
}

function Coin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#c79320" />
      <circle cx="12" cy="11" r="8" fill="#f0c04a" />
      <circle cx="12" cy="11" r="5" fill="none" stroke="#c79320" strokeWidth="1.6" />
      <ellipse cx="9" cy="7.6" rx="2" ry="1.3" fill="rgba(255,255,255,0.65)" transform="rotate(-30 9 7.6)" />
    </svg>
  );
}

function ClassIcon({ i }) {
  if (i === 0) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20L20 4M20 4h-6M20 4v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M4 20l1.5-4.5L8.5 18 4 20z" fill="#fff" />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="14" r="7" fill="#fff" />
        <path d="M16 8l3-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="20" cy="4" r="2" fill="#fff" />
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8l2.5 11h-13L8 8z" fill="#fff" />
      <path d="M9.5 8V6a2.5 2.5 0 015 0v2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
