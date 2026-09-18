/* ────────────────────────────────────────────────────────────
   네 갈래 방어선 — 4인 협동 디펜스
   한 대의 키보드로 네 명이 함께 중앙 요새를 지킵니다.
   ──────────────────────────────────────────────────────────── */

export const W = 1000, H = 760, CX = 500, CY = 380;
export const R_SPAWN = 344;     // 남·북 관문까지의 거리
export const R_SPAWN_X = 448;   // 동·서 관문까지의 거리 (화면이 가로로 넓다)
export const R_CORE = 74;       // 성문 앞 (길이 여기서 끝난다)
export const WAVE_OPTIONS = [15, 30, 45, 60];   // 대기실에서 고르는 라운드 수
export const TOTAL_WAVES = 15;                  // 기본값
export const PREP = 5;
export const REWARD_T = 22;    // 보상을 고르는 시간

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

// 병과 색 (TOWERS 차례와 같다)
export const P = [
  { key: "#4e9e5a", dark: "#2f6b39", light: "#78c283", name: "궁수" },
  { key: "#4a8ed2", dark: "#2a5f96", light: "#7cb6ea", name: "서리" },
  { key: "#d2793a", dark: "#95501f", light: "#eda061", name: "포병" },
  { key: "#a86fc9", dark: "#71428c", light: "#c99ae0", name: "보급" },
  { key: "#ddb23f", dark: "#96761c", light: "#f2d179", name: "뇌전" },
  { key: "#8fb93c", dark: "#5c7c1f", light: "#bcdd71", name: "역병" },
];

export const SEATS = 6;      // 고를 수 있는 병과 수
export const CREW_MAX = 4;   // 한 판에 들어갈 수 있는 인원

/* ── 길 ─────────────────────────────────────────────────── */
export const DIRS4 = [
  { dx: 0, dy: -1, name: "북" },
  { dx: 1, dy: 0, name: "동" },
  { dx: 0, dy: 1, name: "남" },
  { dx: -1, dy: 0, name: "서" },
];

// 길은 직각으로만 꺾인다. 곧은 가로·세로 구간만으로 이어 붙여 네모난 굽이를 만든다.
const AMP_Y = 180;     // 남·북 길이 좌우로 벌어지는 폭
const AMP_X = 153;     // 동·서 길이 위아래로 벌어지는 폭
const ENT = 0.10;      // 관문 쪽 직진 구간 (전체 깊이 대비)
const EXT = 0.10;      // 성문 쪽 직진 구간
const TAPER = 0.8;     // 성채에 가까운 굽이일수록 좁게 (네 길이 서로 부딪히지 않게)

export function makeLane(li) {
  const { dx, dy } = DIRS4[li];
  const nx = -dy, ny = dx;                       // 길에 수직인 방향
  // 화면이 가로로 넓으니 동·서 길은 더 멀리서 출발한다
  const horiz = dx !== 0;
  const r0 = horiz ? R_SPAWN_X : R_SPAWN;
  const A = horiz ? AMP_X : AMP_Y;

  // (r, w) = (성채까지 남은 거리, 옆으로 벌어진 정도).
  // 이웃한 모서리끼리 r이나 w 중 하나만 달라서 모든 구간이 가로 아니면 세로가 된다.
  const span = r0 - R_CORE;
  const ent = span * ENT, ext = span * EXT;
  const h = (span - ent - ext) / 3;              // 가로로 지른 구간 사이의 간격
  const rA = r0 - ent, rB = rA - h, rC = rB - h, rD = rC - h;
  const a1 = A, a2 = A * TAPER, a3 = A * TAPER * TAPER;
  const corners = [
    [r0, 0], [rA, 0], [rA, a1], [rB, a1], [rB, -a2], [rC, -a2], [rC, a3], [rD, a3], [rD, 0], [R_CORE, 0],
  ];
  const toXY = ([r, w]) => ({ x: CX + dx * r + nx * w, y: CY + dy * r + ny * w });

  const pts = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = toXY(corners[i]), b = toXY(corners[i + 1]);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(d / 3));
    for (let k = 0; k < n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
  }
  pts.push(toXY(corners[corners.length - 1]));

  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  return { pts, cum, len: cum[cum.length - 1], dx, dy, nx, ny, name: DIRS4[li].name };
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
// 길을 따라가며 옆으로 물러난 자리 다섯을 고른다.
// 길에서 멀수록, 서로 떨어져 있을수록 좋은 자리로 본다.
const MIN_ROAD = 40;       // 길에서 이만큼은 떨어져야 자리로 쓴다
const SLOT_GAP = 56;       // 자리끼리의 최소 거리
const EDGE = 46;           // 화면 가장자리 여백

/* 경로를 따라가며 쓸 만한 자리를 모두 찾는다.
   길에서 충분히 떨어져 있고 서로 붙지 않는 자리라면 다 쓴다. */
export const SLOTS = [];
export const SLOT_INDEX = [[], [], [], []];   // [경로][몇 번째] → 전체 번호
{
  const road = [];
  LANES.forEach((L) => { for (let k = 0; k < L.pts.length; k += 3) road.push(L.pts[k]); });
  const far = (x, y) => {
    let d = Infinity;
    for (const q of road) {
      const dd = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y);
      if (dd < d) d = dd;
    }
    return Math.sqrt(d);
  };

  LANES.forEach((L, li) => {
    // 진행도마다 길 양옆으로 후보를 하나씩 모은다 (길을 사이에 두고 마주 보게 둘 수 있다)
    const cand = [];
    for (let u = 0.04; u <= 0.961; u += 0.006) {
      const p = posAt(li, u);
      const al = Math.hypot(p.ax, p.ay) || 1;
      const px = -p.ay / al, py = p.ax / al;
      for (const side of [1, -1]) {
        let best = null;
        for (let off = 44; off <= 124; off += 4) {
          const x = p.x + px * side * off, y = p.y + py * side * off;
          if (x < EDGE || x > W - EDGE || y < EDGE || y > H - EDGE) continue;
          if (Math.hypot(x - CX, y - CY) < R_CORE + 48) continue;
          // 화면 위 모서리는 체력·웨이브·속도 표시가 덮는다
          if (y < 150 && (x < 330 || x > 740)) continue;
          const d = far(x, y);
          if (!best || d > best.d) best = { x, y, d, u };
        }
        if (best) cand.push(best);
      }
    }
    cand.sort((a, b) => a.u - b.u);

    // 길에서 떨어진 순서가 아니라 경로 순서대로, 자리가 되는 곳마다 하나씩 놓는다
    cand.forEach((c) => {
      if (c.d < MIN_ROAD) return;
      for (const s of SLOTS) {
        if (Math.hypot(s.x - c.x, s.y - c.y) < SLOT_GAP) return;
      }
      SLOT_INDEX[li].push(SLOTS.length);
      SLOTS.push({ lane: li, idx: SLOT_INDEX[li].length - 1, x: Math.round(c.x), y: Math.round(c.y) });
    });
  });
}

export const sk = (lane, idx) => {
  const row = SLOT_INDEX[lane] || SLOT_INDEX[0];
  return row[Math.max(0, Math.min(idx, row.length - 1))] || 0;
};

// 이동은 자리 사이를 눈에 보이는 대로 옮겨 다닌다.
// 누른 방향과 60도 안쪽에 있는 자리 중 가장 가깝고 방향이 잘 맞는 곳으로 간다.
export const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function nextSlot(from, act) {
  const v = DIR_VEC[act];
  if (!v) return -1;
  // 먼저 60도 안쪽에서 찾고, 그쪽이 비어 있으면 더 넓게 훑는다
  for (const limit of [0.5, 0.15]) {
    let best = -1, bestScore = Infinity;
    for (let i = 0; i < SLOTS.length; i++) {
      const s = SLOTS[i];
      const dx = s.x - from.x, dy = s.y - from.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;
      const dot = (dx * v[0] + dy * v[1]) / d;
      if (dot < limit) continue;
      const score = d / (dot * dot);
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/* ── 규칙 ───────────────────────────────────────────────── */
export const TOWERS = [
  { id: "archer", name: "궁수탑", cost: 30, range: 158, dmg: 15, interval: 0.95,
    note: "단일 대상 · 사거리가 가장 길다" },
  { id: "frost", name: "서리탑", cost: 25, range: 128, dmg: 4, interval: 0.85, slow: 0.5, slowT: 1.6,
    note: "적 이동 속도를 절반으로" },
  { id: "cannon", name: "대포탑", cost: 40, range: 118, dmg: 11, interval: 1.5, splash: 48,
    note: "착탄 지점 범위 피해" },
  { id: "supply", name: "보급소", cost: 35, range: 140, dmg: 0, interval: 0, gold: 0.45, buff: 0.25,
    note: "주변 타워 강화 · 골드 생성" },
  { id: "bolt", name: "번개탑", cost: 55, range: 142, dmg: 10, interval: 1.2, chain: 3,
    note: "가까운 적 셋까지 연쇄" },
  { id: "poison", name: "독탑", cost: 45, range: 124, dmg: 3, interval: 1.0, poison: 7, poisonT: 4,
    note: "맞은 적이 계속 아파한다 · 장갑 무시" },
];
export const TOWER_BY_ID = Object.fromEntries(TOWERS.map((t) => [t.id, t]));
export const towerIdx = (id) => TOWERS.findIndex((t) => t.id === id);

// 병과 하나가 탑 하나를 맡는다
export const CLASSES = TOWERS;

export const SKILLS = [
  { name: "집중 사격", cd: 32, note: "궁수탑 피해 2배 · 8초" },
  { name: "한파", cd: 30, note: "모든 적 정지 · 4초" },
  { name: "융단 폭격", cd: 34, note: "모든 적에게 45 피해" },
  { name: "긴급 보급", cd: 36, note: "전원 45 골드 · 성채 12 회복" },
  { name: "뇌우", cd: 33, note: "모든 적에게 30 피해 · 1.5초 감전" },
  { name: "역병", cd: 35, note: "모든 적이 6초간 초당 12 피해" },
];

// 보스는 사람 수가 적으면 체력을 덜어 준다 (1명 · 2명 · 3명 · 4명)
export const BOSS_CREW = [0.7, 0.75, 0.85, 1];
export const bossScale = (crew) => BOSS_CREW[Math.max(1, Math.min(4, crew)) - 1];

// 보스를 하나 잡을 때마다 관문에서 나오는 적이 이만큼씩 세진다
export const SURGE_HP = 0.12;
export const SURGE_SPD = 0.045;

// 성채도 스스로 싸운다
export const CASTLE_GUN = { range: 150, dmg: 22, interval: 1.6, splash: 34 };

export const ENEMY = {
  grunt: { hp: 34, spd: 50, dmg: 4, gold: 7, r: 8, res: 0, label: "오크 보병" },
  rusher: { hp: 15, spd: 127, dmg: 3, gold: 5, r: 7, res: 0, label: "고블린 척후" },
  armor: { hp: 58, spd: 41, dmg: 7, gold: 11, r: 10, res: 0.25, label: "중장갑 트롤" },
  boss: { hp: 340, spd: 32, dmg: 25, gold: 130, r: 16, res: 0.15, label: "오우거 지휘관" },
  titan: { hp: 700, spd: 24, dmg: 60, gold: 320, r: 30, res: 0.3, label: "대군주" },
};

/* 보스를 잡으면 각자 셋 중 하나를 고른다.
   대부분 고른 사람 몫이고, 성벽만 수비대 전체에 적용된다. */
export const PERKS = [
  { id: "power",  icon: "attack", name: "전투의 각인", note: "내 타워 공격력 +20%" },
  { id: "reach",  icon: "range",  name: "매의 눈",     note: "내 타워 사거리 +22" },
  { id: "haste",  icon: "speed",  name: "전장의 북",   note: "내 타워 공격 속도 +18%" },
  { id: "crit",   icon: "crit",   name: "급소 찌르기", note: "12% 확률로 피해 두 배" },
  { id: "chill",  icon: "frost",  name: "무거운 사슬", note: "맞은 적이 1.2초간 느려진다" },
  { id: "gold",   icon: "gold",   name: "전리품",      note: "내가 잡은 적 골드 +25%" },
  { id: "thrift", icon: "build",  name: "숙련된 목수", note: "건설·강화 비용 -18%" },
  { id: "cool",   icon: "skill",  name: "빠른 준비",   note: "내 스킬 대기 시간 -20%" },
  { id: "bank",   icon: "chest",  name: "군수 계약",   note: "웨이브를 넘길 때마다 +60 골드" },
  { id: "wall",   icon: "shield", name: "성벽 보수",   note: "성채 최대 체력 +30 · 완전 회복" },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
export const PERK_IDS = PERKS.map((p) => p.id);

// 능력이 쌓였을 때의 값
export const perkVal = {
  power: (n) => 1 + 0.2 * n,
  reach: (n) => 22 * n,
  haste: (n) => 0.18 * n,
  crit: (n) => 0.12 * n,
  gold: (n) => 1 + 0.25 * n,
  thrift: (n) => Math.max(0.3, 1 - 0.18 * n),
  cool: (n) => Math.max(0.3, 1 - 0.2 * n),
  bank: (n) => 60 * n,
};

// 셋을 뽑는다. 이미 많이 쌓인 것도 다시 나올 수 있게 두되, 성벽은 성채가 튼튼하면 뺀다
export function rollPerks(g, n = 3) {
  const pool = PERKS.filter((p) => p.id !== "wall" || g.core.max < 220);
  return shuffle(pool).slice(0, n).map((p) => p.id);
}

/* ── 조작키 (온라인에서는 각자 자기 키보드를 쓴다) ────────── */
export const MOVE_KEYS = {
  KeyW: "up", KeyA: "left", KeyS: "down", KeyD: "right",
  ArrowUp: "up", ArrowLeft: "left", ArrowDown: "down", ArrowRight: "right",
};
export const BUILD_KEYS = ["Space", "Enter", "KeyQ"];
export const SKILL_KEYS = ["ShiftLeft", "ShiftRight", "KeyE"];
export const KEY_HINT = { move: "W A S D · 방향키", build: "Space", skill: "Shift" };

export const ETYPES = ["grunt", "rusher", "armor", "boss", "titan"];

/* ── 상태 ───────────────────────────────────────────────── */
export function makeGame(seats = [true, true, true, true, false, false], total = TOTAL_WAVES) {
  const flags = [];
  for (let i = 0; i < SEATS; i++) flags.push(!!seats[i]);
  return {
    seats: flags,
    total: WAVE_OPTIONS.includes(total) ? total : TOTAL_WAVES,
    phase: "ready",
    wave: 0,
    timer: PREP,
    core: { hp: 100, max: 100 },
    players: flags.map((_, i) => {
      // 여섯 병과를 네 경로에 나눠 세운다
      const lane = i % 4;
      const slot = Math.min(SLOT_INDEX[lane].length - 1, i < 4 ? 3 : i === 4 ? 1 : 5);
      const s = SLOTS[sk(lane, slot)];
      return {
        gold: 90, cd: 0, lane, slot, built: 0, kills: 0,
        perks: {},                      // 보스를 잡고 고른 능력 { id: 개수 }
        cx: s.x, cy: s.y, cr: CLASSES[i].range, jolt: 0, heldKeys: [], holdT: 0,
      };
    }),
    towers: new Array(SLOTS.length).fill(null),
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
    surge: 0,           // 보스를 몇 번 잡았는지 (관문에서 나오는 적이 그만큼 세진다)
    pendingReward: 0,   // 이번 웨이브가 끝나면 보상을 고른다
    offer: null,        // 고를 수 있는 능력 [자리][셋]
    picked: null,       // 고르기를 마친 자리
    combo: 0,
    comboT: 0,
    banner: null,       // { text, sub, t, life, tone }
    out: [],            // 호스트가 다른 참가자에게 보낼 연출 이벤트
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
export function waveKind(n, total = TOTAL_WAVES) {
  if (n >= total) return "titan";
  if (n % 5 === 0) return "boss";
  if (n % 4 === 0) return "rush";
  return "normal";
}

/* 적이 세지는 정도. 라운드를 길게 잡으면 그만큼 완만하게 올라간다.
   어느 길이로 하든 마지막 웨이브의 세기는 같다. */
export function waveScale(n, total = TOTAL_WAVES) {
  return Math.pow(1.155, ((n - 1) * TOTAL_WAVES) / Math.max(1, total));
}

export function buildQueue(n, players = 4, total = TOTAL_WAVES) {
  const crew = Math.max(1, Math.min(CREW_MAX, players));
  const kind = waveKind(n, total);
  const laneCount = Math.max(1, Math.min(crew, n < 2 ? 2 : n < 4 ? 3 : 4));
  const active = shuffle([0, 1, 2, 3]).slice(0, laneCount);
  const one = () => active[Math.floor(Math.random() * active.length)];

  // 보스 웨이브에는 보스 하나만 나온다
  if (kind === "boss") return [{ type: "boss", lane: one() }];
  if (kind === "titan") return [{ type: "titan", lane: one() }];

  const list = [];
  const step = (n * TOTAL_WAVES) / Math.max(1, total);   // 15라운드 기준으로 환산한 진행도

  if (kind === "rush") {
    // 갑자기 빠른 적이 떼로 몰려온다
    const count = Math.round((10 + step * 2.6) * (0.5 + 0.13 * crew));
    for (let i = 0; i < count; i++) list.push({ type: "rusher", lane: active[i % active.length] });
    return list;
  }

  const count = Math.round((5 + step * 1.9) * (0.44 + 0.14 * crew));
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    const r = Math.random();
    if (step >= 3 && r < 0.32) type = "rusher";
    else if (step >= 5 && r > 0.76) type = "armor";
    list.push({ type, lane: active[i % active.length] });
  }
  return list;
}
