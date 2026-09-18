/* ────────────────────────────────────────────────────────────
   네 갈래 방어선 — 4인 협동 디펜스
   한 대의 키보드로 네 명이 함께 중앙 요새를 지킵니다.
   ──────────────────────────────────────────────────────────── */

export const W = 1000, H = 760, CX = 500, CY = 380;
export const R_SPAWN = 330;     // 남·북 관문까지의 거리
export const R_SPAWN_X = 438;   // 동·서 관문까지의 거리 (화면이 가로로 넓다)
export const R_CORE = 74;       // 성문 앞 (길이 여기서 끝난다)
export const TOTAL_WAVES = 15;
export const PREP = 9;

/* ── 색 ─────────────────────────────────────────────────── */
export const C = {
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
export const P = [
  { key: "#4e9e5a", dark: "#2f6b39", light: "#78c283", name: "궁수" },
  { key: "#d2793a", dark: "#95501f", light: "#eda061", name: "포병" },
  { key: "#4a8ed2", dark: "#2a5f96", light: "#7cb6ea", name: "마법" },
  { key: "#a86fc9", dark: "#71428c", light: "#c99ae0", name: "보급" },
];

/* ── 길 ─────────────────────────────────────────────────── */
export const DIRS4 = [
  { dx: 0, dy: -1, name: "북" },
  { dx: 1, dy: 0, name: "동" },
  { dx: 0, dy: 1, name: "남" },
  { dx: -1, dy: 0, name: "서" },
];

// 길은 굽이를 다섯 번 틀고, 굽이가 바깥으로 부푼 자리마다 타워 터를 하나씩 둔다
export const SLOT_S = [0.1, 0.28, 0.46, 0.64, 0.82];
const SLOT_OFF = 76;   // 길 가장자리에서 타워 터까지

export function makeLane(li) {
  const { dx, dy } = DIRS4[li];
  const nx = -dy, ny = dx;                       // 길에 수직인 방향
  // 화면이 가로로 넓으니 동·서 길은 더 멀리서 출발시키고,
  // 남·북 길은 좌우로 크게 굽이쳐 빈 곳을 메운다
  const horiz = dx !== 0;
  const r0 = horiz ? R_SPAWN_X : R_SPAWN;
  const amp = horiz ? 100 : 108;
  // 양 끝(관문·성문)에서는 곧게 들어가고 가운데가 크게 굽이친다.
  // 두 번째 파를 섞어 굽이 크기를 들쭉날쭉하게 — 자로 잰 파형처럼 보이지 않게 한다
  const bend = (s) =>
    Math.pow(Math.sin(s * Math.PI), 0.35) *
    (amp * Math.sin(s * Math.PI * 5) + amp * 0.3 * Math.sin(s * Math.PI * 3 + 0.8));
  const at = (s) => {
    const r = r0 + (R_CORE - r0) * s;
    const w = bend(s);
    return { x: CX + dx * r + nx * w, y: CY + dy * r + ny * w };
  };

  const N = 320, pts = [], cum = [0];
  for (let k = 0; k < N; k++) pts.push(at(k / (N - 1)));
  for (let k = 1; k < N; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  return { pts, cum, len: cum[N - 1], dx, dy, nx, ny, r0, at, bend, name: DIRS4[li].name };
}

export const LANES = [0, 1, 2, 3].map(makeLane);

// 경로 위 u(0~1, 길이 비율) 지점의 좌표와 진행 방향
export function posAt(lane, u) {
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
// 굽이가 바깥으로 부푼 지점마다 하나씩, 길 바깥쪽으로 물려 놓는다.
// 굽이가 번갈아 반대쪽으로 휘므로 이웃한 칸끼리 자연히 멀어진다.
export const SLOTS = [];
LANES.forEach((L, li) => {
  SLOT_S.forEach((s, si) => {
    const pt = L.at(s);
    const off = (Math.sign(L.bend(s)) || 1) * SLOT_OFF;   // 굽이가 부푼 바깥쪽으로 물린다
    SLOTS.push({ lane: li, idx: si, x: pt.x + L.nx * off, y: pt.y + L.ny * off });
  });
});
export const sk = (lane, idx) => lane * 5 + idx;

// 이동 인접 그래프: 각 경로(북0·동1·남2·서3)는 안쪽(코어 쪽)으로 갈수록 idx가 커진다.
// 경로마다 남는 축 하나(CW_DIR)는 어느 칸에서든 시계 방향 옆 경로의 같은 칸으로 이어져 있다.
// 반시계 방향은 그 경로 고유의 "코어 쪽" 방향(TOWARD)과 겹치므로, 그 축이 막히는 가장 안쪽 칸에서만 넘어갈 수 있다.
export const TOWARD = ["down", "left", "up", "right"];
export const AWAY = { down: "up", up: "down", left: "right", right: "left" };
export const CW_DIR = ["right", "down", "left", "up"];

/* ── 규칙 ───────────────────────────────────────────────── */
export const TOWERS = [
  { id: "archer", name: "궁수탑", cost: 30, range: 158, dmg: 15, interval: 0.95,
    note: "단일 대상 · 사거리가 가장 길다" },
  { id: "cannon", name: "대포탑", cost: 40, range: 118, dmg: 11, interval: 1.5, splash: 48,
    note: "착탄 지점 범위 피해" },
  { id: "frost", name: "서리탑", cost: 25, range: 128, dmg: 4, interval: 0.85, slow: 0.5, slowT: 1.6,
    note: "적 이동 속도를 절반으로" },
  { id: "supply", name: "보급소", cost: 35, range: 140, dmg: 0, interval: 0, gold: 0.45, buff: 0.25,
    note: "주변 타워 강화 · 골드 생성" },
  { id: "bolt", name: "번개탑", cost: 55, range: 142, dmg: 10, interval: 1.2, chain: 3,
    note: "가까운 적 셋까지 연쇄" },
  { id: "poison", name: "독탑", cost: 45, range: 124, dmg: 3, interval: 1.0, poison: 7, poisonT: 4,
    note: "맞은 적이 계속 아파한다" },
];
export const TOWER_BY_ID = Object.fromEntries(TOWERS.map((t) => [t.id, t]));
export const towerIdx = (id) => TOWERS.findIndex((t) => t.id === id);

// 병과마다 고를 수 있는 타워 (첫 번째가 기본). 번개·독은 누구나 지을 수 있다
export const CLASS_TOWERS = [
  ["archer", "bolt", "poison"],
  ["cannon", "bolt", "poison"],
  ["frost", "bolt", "poison"],
  ["supply", "bolt", "poison"],
];

// 예전 이름 (병과별 기본 타워)
export const CLASSES = CLASS_TOWERS.map((ids) => TOWER_BY_ID[ids[0]]);

export const SKILLS = [
  { name: "집중 사격", cd: 32, note: "궁수탑 피해 2배 · 8초" },
  { name: "융단 폭격", cd: 34, note: "모든 적에게 45 피해" },
  { name: "한파", cd: 30, note: "모든 적 정지 · 4초" },
  { name: "긴급 보급", cd: 36, note: "전원 45 골드 · 성채 12 회복" },
];

// 성채도 스스로 싸운다
export const CASTLE_GUN = { range: 150, dmg: 22, interval: 1.6, splash: 34 };

export const ENEMY = {
  grunt: { hp: 24, spd: 62, dmg: 4, gold: 6, r: 8, res: 0, label: "오크 보병" },
  rusher: { hp: 15, spd: 127, dmg: 3, gold: 5, r: 7, res: 0, label: "고블린 척후" },
  armor: { hp: 58, spd: 41, dmg: 7, gold: 11, r: 10, res: 0.25, label: "중장갑 트롤" },
  boss: { hp: 340, spd: 32, dmg: 25, gold: 60, r: 16, res: 0.15, label: "오우거 지휘관" },
  titan: { hp: 700, spd: 24, dmg: 60, gold: 220, r: 30, res: 0.3, label: "대군주" },
};

// 보스를 잡으면 수비대 전체가 축복을 하나 받는다
export const BLESSINGS = [
  { id: "power", name: "전투의 각인", note: "모든 타워 공격력 +20%" },
  { id: "reach", name: "매의 눈", note: "모든 타워 사거리 +18" },
  { id: "haste", name: "전장의 북", note: "모든 타워 공격 속도 +15%" },
  { id: "riches", name: "전리품", note: "전원 골드 +180" },
  { id: "wall", name: "성벽 보수", note: "성채 최대 체력 +40 · 완전 회복" },
];

/* ── 조작키 (온라인에서는 각자 자기 키보드를 쓴다) ────────── */
export const MOVE_KEYS = {
  KeyW: "up", KeyA: "left", KeyS: "down", KeyD: "right",
  ArrowUp: "up", ArrowLeft: "left", ArrowDown: "down", ArrowRight: "right",
};
export const BUILD_KEYS = ["Space", "Enter", "KeyQ"];
export const PICK_KEYS = ["KeyZ", "KeyC", "Tab"];
export const PICK_NUM = { Digit1: 0, Digit2: 1, Digit3: 2 };
export const SKILL_KEYS = ["ShiftLeft", "ShiftRight", "KeyE"];
export const KEY_HINT = { move: "W A S D · 방향키", build: "Space", skill: "Shift", pick: "Z · 1 2 3" };

export const ETYPES = ["grunt", "rusher", "armor", "boss", "titan"];

/* ── 상태 ───────────────────────────────────────────────── */
export function makeGame(seats = [true, true, true, true]) {
  return {
    seats: seats.slice(0, 4),
    phase: "ready",
    wave: 0,
    timer: PREP,
    core: { hp: 100, max: 100 },
    players: [0, 1, 2, 3].map((i) => {
      const s = SLOTS[sk(i, 2)];
      return {
        gold: 90, cd: 0, lane: i, slot: 2, built: 0, kills: 0, pick: 0,
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
    nextId: 1,
    castle: { cd: 0, aim: Math.PI / 2, pulse: 0 },
    bless: { power: 0, reach: 0, haste: 0 },
    blessed: [],      // 받은 축복 id
    combo: 0,
    comboT: 0,
    banner: null,     // { text, sub, t, life, tone }
    out: [],          // 호스트가 다른 참가자에게 보낼 연출 이벤트
  };
}

export const seatCount = (g) => g.seats.filter(Boolean).length;

export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// 웨이브 성격: 보통 / 돌격(빠른 적 떼) / 보스 / 대군주
export function waveKind(n) {
  if (n === TOTAL_WAVES) return "titan";
  if (n % 5 === 0) return "boss";
  if (n % 4 === 0) return "rush";
  return "normal";
}

export function buildQueue(n, players = 4) {
  const crew = Math.max(1, Math.min(4, players));
  const kind = waveKind(n);
  const laneCount = Math.max(1, Math.min(crew, n < 2 ? 2 : n < 4 ? 3 : 4));
  const active = shuffle([0, 1, 2, 3]).slice(0, laneCount);
  const list = [];

  if (kind === "rush") {
    // 갑자기 빠른 적이 떼로 몰려온다
    const count = Math.round((10 + n * 2.6) * (0.5 + 0.13 * crew));
    for (let i = 0; i < count; i++) list.push({ type: "rusher", lane: active[i % active.length] });
    return list;
  }

  const count = Math.round((5 + n * 1.9) * (0.44 + 0.14 * crew));
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    const r = Math.random();
    if (n >= 3 && r < 0.32) type = "rusher";
    else if (n >= 5 && r > 0.76) type = "armor";
    list.push({ type, lane: active[i % active.length] });
  }
  if (kind === "boss") {
    list.push({ type: "boss", lane: active[Math.floor(Math.random() * active.length)] });
  }
  if (kind === "titan") {
    list.push({ type: "titan", lane: active[Math.floor(Math.random() * active.length)] });
  }
  return list;
}
