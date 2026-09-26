/* ────────────────────────────────────────────────────────────
   네 갈래 방어선 — 4인 협동 디펜스
   한 대의 키보드로 네 명이 함께 중앙 요새를 지킵니다.
   ──────────────────────────────────────────────────────────── */

export const W = 1160, H = 760, CX = 580, CY = 380;
export const R_SPAWN = 344;     // 남·북 관문까지의 거리
export const R_SPAWN_X = 448;   // 동·서 관문까지의 거리 (화면이 가로로 넓다)
export const R_CORE = 74;       // 성문 앞 (길이 여기서 끝난다)
export const WAVE_OPTIONS = [15, 30, 45, 60];   // 대기실에서 고르는 라운드 수
export const TOTAL_WAVES = 15;                  // 기본값
export const PREP = 5;

/* 난이도 — 대기실에서 방장이 고른다.
   elite  는 관문에서 나오는 적이 얼마나 돌격병·중갑으로 쏠리는지,
   leak   는 성문까지 온 적 하나가 성채를 얼마나 깎는지,
   perks  는 보상으로 고를 수 있는 카드 수,
   arena  는 결전장에서만 달라지는 몫이다 (adTune 참고). */
export const DIFFS = [
  { id: "easy", name: "쉬움",   hp: 0.75, count: 0.85, spd: 0.92, gold: 1.2, start: 130, core: 130, prep: 7, surge: 0.08,
    note: "적이 약하고 골드가 넉넉합니다" },
  { id: "normal", name: "보통", hp: 1,    count: 1,    spd: 1,    gold: 1,   start: 90,  core: 100, prep: 5, surge: 0.12,
    note: "기준이 되는 난이도입니다" },
  { id: "hard", name: "어려움", hp: 1.35, count: 1.15, spd: 1.08, gold: 0.9, start: 80,  core: 90,  prep: 5, surge: 0.16,
    note: "적이 단단하고 골드가 빡빡합니다" },
  { id: "hell", name: "지옥",   hp: 1.8,  count: 1.45, spd: 1.22, gold: 0.7,  start: 70, core: 72, prep: 4, surge: 0.32,
    elite: 0.55, leak: 1.25, perks: 2,
    arena: { hp: 0.85, lives: 4, revive: 1.35, wear: 0.35, tell: 0.78, rest: 0.58, limit: 0.65, move: 1.45, cut: 0.35 },
    note: "보스가 일찍 분노하고, 보상 카드도 두 장뿐입니다" },
];
export const DEFAULT_DIFF = 1;
export const diffOf = (g) => DIFFS[(g && g.diff) || 0] || DIFFS[DEFAULT_DIFF];
export const prepTime = (g) => diffOf(g).prep;
export const REWARD_T = 22;    // 보상을 고르는 시간
export const LEAVE_T = 25;     // 대기실로 돌아가자는 제안이 살아 있는 시간
export const LEAVE_FORCE = 20; // 이만큼 지나면 방장이 혼자 결정할 수 있다

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
  { key: "#5b6ad6", dark: "#343f96", light: "#8e99e8", name: "저격" },
  { key: "#d2793a", dark: "#95501f", light: "#eda061", name: "포병" },
  { key: "#ddb23f", dark: "#96761c", light: "#f2d179", name: "뇌전" },
  { key: "#d9483f", dark: "#8f2620", light: "#ef8177", name: "화염" },
  { key: "#8fb93c", dark: "#5c7c1f", light: "#bcdd71", name: "역병" },
  { key: "#4a8ed2", dark: "#2a5f96", light: "#7cb6ea", name: "서리" },
  { key: "#c1569f", dark: "#82316a", light: "#e08cc6", name: "중력" },
  { key: "#d4788f", dark: "#93445a", light: "#f0b4c2", name: "보급" },
  { key: "#3fae94", dark: "#207565", light: "#78d5bf", name: "부식" },
  { key: "#8fb6d8", dark: "#5a7fa0", light: "#bcd8ef", name: "성기사" },
];

export const SEATS = 11;     // 고를 수 있는 병과 수
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
  const cornersRW = [
    [r0, 0], [rA, 0], [rA, a1], [rB, a1], [rB, -a2], [rC, -a2], [rC, a3], [rD, a3], [rD, 0], [R_CORE, 0],
  ];
  const toXY = ([r, w]) => ({ x: CX + dx * r + nx * w, y: CY + dy * r + ny * w });

  const pts = [];
  for (let i = 0; i < cornersRW.length - 1; i++) {
    const a = toXY(cornersRW[i]), b = toXY(cornersRW[i + 1]);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(d / 3));
    for (let k = 0; k < n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
  }
  pts.push(toXY(cornersRW[cornersRW.length - 1]));

  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  // 굵은 꺾임 자리(그림용) — 길은 직각으로만 꺾이므로 이 점들 사이는 늘 가로 아니면 세로다
  const corners = cornersRW.map(toXY);
  return { pts, cum, len: cum[cum.length - 1], dx, dy, nx, ny, name: DIRS4[li].name, corners };
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
          // 화면 위 모서리는 표시창이 덮는다 (왼쪽은 체력·웨이브·성채, 오른쪽은 속도·소리)
          if (y < 176 && x < W * 0.36) continue;
          if (y < 100 && x > W * 0.66) continue;
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

  /* 자리마다 성격을 붙인다. 그 자리에서 길이 얼마나 보이는지로 정한다.
     - 여러 경로가 걸치면 핵심 지점
     - 한 경로를 길게 굽어보면 집중 지점
     - 길에서 멀찍이 떨어져 있으면 장거리 지점
     - 스쳐 지나가는 자리면 위험 지점 */
  const R = 130;
  SLOTS.forEach((sl) => {
    let near = Infinity, seen = 0;
    const lanes = new Set();
    LANES.forEach((L, li) => {
      let hit = 0;
      for (let k = 0; k < L.pts.length; k += 2) {
        const d = Math.hypot(L.pts[k].x - sl.x, L.pts[k].y - sl.y);
        if (d < near) near = d;
        if (d <= R) hit++;
      }
      if (hit >= 26) lanes.add(li);   // 그 경로를 제대로 굽어봐야 친다
      seen += hit;
    });
    sl.near = Math.round(near);
    sl.seen = seen;            // 사정권에 들어오는 길의 양
    sl.lanes = lanes.size;
  });
  // 길을 많이 굽어보는 순서로 잘라 집중 지점을 정한다
  const sorted = SLOTS.map((s) => s.seen).sort((a, b) => b - a);
  const focusCut = sorted[Math.floor(sorted.length * 0.34)];
  SLOTS.forEach((sl) => {
    if (sl.lanes >= 2) sl.spot = "key";
    else if (sl.seen >= focusCut) sl.spot = "focus";
    else if (sl.near >= 62) sl.spot = "long";
    else sl.spot = "risk";
  });
}

/* 자리 성격 — 그 자리에 세운 탑에 붙는 보너스 */
export const SPOTS = {
  key: { name: "핵심 지점", tag: "여러 길이 걸친다", color: "#c186e0", dark: "#7d4aa0",
    note: "범위·연쇄가 강해진다 · 대포 화염 번개" },
  focus: { name: "집중 지점", tag: "길을 길게 굽어본다", color: "#6fb6e8", dark: "#3a6f96",
    note: "공격 속도 +15%" },
  long: { name: "장거리 지점", tag: "길에서 물러나 있다", color: "#7fc98a", dark: "#3f7a4a",
    note: "사거리 +18 · 궁수 저격" },
  risk: { name: "위험 지점", tag: "적이 스쳐 지나간다", color: "#e8a45c", dark: "#95611f",
    note: "공격력 +20%" },
};
export const spotOf = (i) => SPOTS[(SLOTS[i] && SLOTS[i].spot) || "risk"];

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
  /* 공격 */
  { id: "archer", role: "공격", name: "궁수탑", cost: 30, range: 158, dmg: 15, interval: 0.95,
    note: "단일 대상 · 사거리가 가장 길다" },
  { id: "sniper", role: "공격", name: "저격탑", cost: 70, range: 165, dmg: 58, interval: 2.6, pickBig: true,
    note: "가장 단단한 적 하나를 크게 때린다" },
  { id: "cannon", role: "공격", name: "대포탑", cost: 40, range: 118, dmg: 11, interval: 1.5, splash: 48,
    note: "착탄 지점 범위 피해" },
  { id: "bolt", role: "공격", name: "번개탑", cost: 55, range: 142, dmg: 10, interval: 1.2, chain: 3,
    note: "가까운 적 셋까지 연쇄" },
  { id: "flame", role: "공격", name: "화염탑", cost: 50, range: 112, dmg: 0, interval: 1, aura: "burn",
    burn: 9, burnT: 5, note: "범위 안 모두에게 5초 화상" },
  { id: "poison", role: "공격", name: "독탑", cost: 45, range: 124, dmg: 3, interval: 1, poison: 7, poisonT: 4,
    note: "하나에게 강한 지속 피해 · 장갑 무시" },

  /* 제어 */
  { id: "frost", role: "제어", name: "서리탑", cost: 25, range: 128, dmg: 4, interval: 0.85, slow: 0.5, slowT: 1.6,
    note: "적 이동 속도를 절반으로" },
  { id: "gravity", role: "제어", name: "중력탑", cost: 65, range: 145, dmg: 0, interval: 3.2, aura: "pull",
    pull: 0.025, note: "범위 안 적을 뒤로 끌어 모은다" },

  /* 지원 */
  { id: "supply", role: "지원", name: "보급소", cost: 35, range: 140, dmg: 0, interval: 0, gold: 0.45, buff: 0.25,
    note: "주변 타워 강화 · 골드 생성" },
  { id: "corrode", role: "지원", name: "부식탑", cost: 60, range: 132, dmg: 7, interval: 1.1, shred: 0.2, shredT: 4,
    note: "맞은 적의 장갑을 4초간 깎는다" },
  { id: "paladin", role: "지원", name: "성기사탑", cost: 60, range: 150, dmg: 0, interval: 0, ward: 0.06,
    note: "성채가 받는 피해를 줄인다" },
];

export const TOWER_BY_ID = Object.fromEntries(TOWERS.map((t) => [t.id, t]));
export const towerIdx = (id) => TOWERS.findIndex((t) => t.id === id);

/* 강화 값 — 단계가 올라갈수록 가파르게 비싸진다. 1→2 · 2→3 · 3→4 */
export const TOWER_MAX_LV = 4;
export const UP_MUL = [1.2, 2, 3.2];
export const upCostOf = (def, lv) => Math.round((def.cost || 0) * (UP_MUL[lv - 1] || 0));

/* 보급소가 이웃에게 밀어 주는 몫 — 공격력과 공격 속도에 같이 실린다.
   단계를 올려도 천천히만 오르게 묶어 둔다. */
export const supplyAid = (lv) => TOWER_BY_ID.supply.buff * (0.6 + 0.4 * Math.max(1, lv));

// 병과 하나가 탑 하나를 맡는다
export const CLASSES = TOWERS;

export const SKILLS = [
  { name: "집중 사격", cd: 32, note: "궁수탑 피해 2배 · 8초" },
  { name: "결정타", cd: 30, note: "가장 단단한 적에게 250 피해" },
  { name: "융단 폭격", cd: 34, note: "모든 적에게 45 피해" },
  { name: "뇌우", cd: 33, note: "모든 적에게 30 피해 · 1.5초 감전" },
  { name: "화염 폭풍", cd: 32, note: "모든 적이 6초간 불탄다" },
  { name: "역병", cd: 35, note: "모든 적이 6초간 초당 12 피해" },
  { name: "한파", cd: 30, note: "모든 적 정지 · 4초" },
  { name: "블랙홀", cd: 34, note: "모든 적을 뒤로 당기고 2초 정지" },
  { name: "긴급 보급", cd: 36, note: "전원 45 골드 · 성채 12 회복" },
  { name: "산성비", cd: 33, note: "모든 적 장갑 40% 감소 · 8초" },
  { name: "성역", cd: 34, note: "8초간 성채 피해 60% 감소 · 20 회복" },
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

/* 희귀도 — 카드가 얼마나 세게 등장하는지, 뽑힐 때 얼마나 귀한지.
   weight 는 rollPerks 가 등급을 고를 때 쓰는 상대적 확률 몫이다. */
export const RARITY = {
  common:    { id: "common",    name: "일반", weight: 55, color: "#cfc6ae", glow: "rgba(207,198,174,0.4)" },
  rare:      { id: "rare",      name: "희귀", weight: 27, color: "#7ec4ff", glow: "rgba(126,196,255,0.5)" },
  epic:      { id: "epic",      name: "영웅", weight: 13, color: "#c98bff", glow: "rgba(201,139,255,0.55)" },
  legendary: { id: "legendary", name: "전설", weight: 5,  color: "#ffb44a", glow: "rgba(255,180,74,0.65)" },
};
export const RARITY_IDS = ["common", "rare", "epic", "legendary"];

/* 보스를 잡으면 각자 셋 중 하나를 고른다.
   대부분 고른 사람 몫이고, 성벽만 수비대 전체에 적용된다. */
export const PERKS = [
  /* 타워 성능 */
  { id: "power",  icon: "attack", name: "전투의 각인", note: "내 타워 공격력 +20%", rarity: "common" },
  { id: "reach",  icon: "range",  name: "매의 눈",     note: "내 타워 사거리 +22", rarity: "common" },
  { id: "haste",  icon: "speed",  name: "전장의 북",   note: "내 타워 공격 속도 +18%", rarity: "common" },
  { id: "command", icon: "flag",  name: "전투 지휘",   note: "모든 수비대의 타워 +5%", rarity: "rare" },

  /* 공격에 붙는 것 */
  { id: "crit",   icon: "crit",   name: "급소 찌르기", note: "12% 확률로 피해 두 배", rarity: "rare" },
  { id: "burn",   icon: "flame",  name: "불타는 탄환", note: "적중한 적이 3초간 불탄다 (피해의 10%)", rarity: "common" },
  { id: "arc",    icon: "arc",    name: "연쇄 공격",   note: "10% 확률로 옆 적 하나를 더 때린다", rarity: "rare" },
  { id: "pierce", icon: "pierce", name: "관통의 힘",   note: "뒤에 있는 적 1명까지 꿰뚫는다", rarity: "rare" },
  { id: "blast",  icon: "blast",  name: "폭발 탄환",   note: "착탄 지점 주변에 피해의 20%", rarity: "epic" },
  { id: "hunter", icon: "mark",   name: "사냥꾼의 표식", note: "보스에게 주는 피해 +15%", rarity: "epic" },
  { id: "execute", icon: "execute", name: "마무리 일격", note: "체력 35% 이하인 적에게 +25%", rarity: "epic" },
  { id: "chill",  icon: "frost",  name: "무거운 사슬", note: "맞은 적이 1.2초간 느려진다", rarity: "common" },

  /* 상황에 따라 세지는 것 */
  { id: "berserk", icon: "rage",  name: "광전사의 분노", note: "성채가 다칠수록 공격력 (최대 +20%)", rarity: "rare" },
  { id: "laststand", icon: "last", name: "최후의 저항", note: "성채 체력 20% 이하일 때 공격력 +30%", rarity: "epic" },
  { id: "thirst", icon: "drop",   name: "피의 갈증",   note: "적을 잡으면 3초간 공격 속도 +10%", rarity: "common" },

  /* 골드 */
  { id: "gold",   icon: "gold",   name: "전리품",      note: "내가 잡은 적 골드 +25%", rarity: "common" },
  { id: "luck",   icon: "luck",   name: "행운의 동전", note: "10% 확률로 골드를 두 배로 줍는다", rarity: "rare" },
  { id: "greed",  icon: "chest",  name: "탐욕의 손",   note: "보스를 잡으면 +100 골드", rarity: "legendary" },
  { id: "bank",   icon: "note",   name: "군수 계약",   note: "웨이브를 넘길 때마다 +60 골드", rarity: "common" },
  { id: "ration", icon: "ration", name: "비상식량",    note: "성채가 절반 아래로 떨어지면 +100 골드", rarity: "common" },

  /* 건설 */
  { id: "thrift", icon: "build",  name: "숙련된 목수", note: "건설·강화 비용 -18%", rarity: "common" },
  { id: "swift",  icon: "swift",  name: "신속한 건설", note: "짓고 나서 첫 사격까지 -25%", rarity: "common" },

  /* 스킬 */
  { id: "cool",   icon: "skill",  name: "빠른 준비",   note: "내 스킬 대기 시간 -20%", rarity: "rare" },
  { id: "amp",    icon: "amp",    name: "마력 증폭",   note: "내 스킬 위력 +15%", rarity: "epic" },
  { id: "echo",   icon: "echo",   name: "재사용의 축복", note: "10% 확률로 스킬 대기가 절반으로", rarity: "epic" },

  /* 성채 */
  { id: "wall",   icon: "shield", name: "성벽 보수",   note: "성채 최대 체력 +30 · 완전 회복", rarity: "legendary" },
  { id: "guard",  icon: "guard",  name: "불굴의 방어", note: "성채가 받는 피해 -8%", rarity: "common" },
  { id: "bulwark", icon: "wall",  name: "철벽",        note: "보스에게 받는 피해 -20%", rarity: "legendary" },
  { id: "regen",  icon: "heal",   name: "재생의 문장", note: "5초마다 성채 체력 2% 회복", rarity: "rare" },
  { id: "repair", icon: "repair", name: "응급 수리",   note: "성채가 30% 아래로 떨어지면 10% 회복", rarity: "rare" },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
export const PERK_IDS = PERKS.map((p) => p.id);

// 능력이 쌓였을 때의 값 (n = 가진 개수)
export const perkVal = {
  power: (n) => 1 + 0.2 * n,
  reach: (n) => 22 * n,
  haste: (n) => 0.18 * n,
  command: (n) => 0.05 * n,

  crit: (n) => 0.12 * n,
  burn: (n) => 0.1 * n,
  arc: (n) => 0.1 * n,
  pierce: (n) => n,
  blast: (n) => 0.2 * n,
  hunter: (n) => 0.15 * n,
  execute: (n) => 0.25 * n,

  berserk: (n) => 0.2 * n,
  laststand: (n) => 0.3 * n,
  thirst: (n) => 0.1 * n,

  gold: (n) => 1 + 0.25 * n,
  luck: (n) => 0.1 * n,
  greed: (n) => 100 * n,
  bank: (n) => 60 * n,
  ration: (n) => 100 * n,

  thrift: (n) => Math.max(0.3, 1 - 0.18 * n),
  swift: (n) => Math.max(0.2, 1 - 0.25 * n),

  cool: (n) => Math.max(0.3, 1 - 0.2 * n),
  amp: (n) => 1 + 0.15 * n,
  echo: (n) => 0.1 * n,

  guard: (n) => Math.max(0.4, 1 - 0.08 * n),
  bulwark: (n) => Math.max(0.25, 1 - 0.2 * n),
  regen: (n) => 0.02 * n,
  repair: (n) => 0.1 * n,
};

/* 보스 결전 — 보스 웨이브에는 판이 결전장으로 바뀐다.
   수비대가 직접 앞으로 나가 보스를 때리고, 보스의 내리치기를 피한다. */
export const ARENA = {
  floor: 606,            // 바닥 기준선 (그림용)
  left: 88, right: 1072,    // 걸어 다닐 수 있는 범위 — 넷이 흩어져 설 만큼
  top: 264, bottom: 700,
  bx: 580, by: 364,      // 보스 그림이 서는 자리
  bfy: 482,              // 보스 발이 닿는 높이
  squash: 0.62,          // 비스듬히 내려다보는 판이라 위아래는 좁게 센다
  reach: 190,            // 때릴 수 있는 거리
  rangeMul: 1.6,         // 결전장은 판보다 넓다 — 사거리를 이만큼 늘려 쓴다
  spd: 292,              // 초당 좌우 이동 거리 — 누르고 있는 동안 이어서 걷는다
  spdY: 196,             // 초당 위아래 이동 거리
  step: 13, stepY: 9,    // 한 번 눌렀을 때 움직이는 거리
  swing: 0.32, land: 0.13, cd: 0.36,   // 휘두르기 · 맞는 순간 · 다음 공격까지
  down: 1.1,             // 넘어져 있는 시간
  knock: 36,             // 맞고 밀려나는 거리
  hpMul: 1.55,           // 사람 수 한 명당 보스 체력 배수
  base: 18,              // 맨손 기본 피해
  tower: 0.5,            // 지은 탑 공격력이 실리는 비율
  coreHit: 0.22,         // 보스 한 대가 사람에게 주는 피해 비율
  // 사람이 깎인 만큼 성채도 깎이되, 한 사람이 다 쓰러졌을 때 성채가 잃는 몫을
  // 이 비율로 묶는다. 보스가 셀수록 사람 체력이 커지는데 성채는 그대로라,
  // 그냥 1:1로 두면 뒷 보스에서는 한 명만 쓰러져도 성채가 무너졌다.
  coreShare: 0.25,
  skill: 4.2,            // 스킬 한 방의 배수
  comboT: 2.2,           // 연타가 이어지는 시간
  lives: 5,              // 몇 대를 맞으면 쓰러지는지 — 이 수로 각자의 체력을 잡는다
  revive: 4,             // 쓰러진 뒤 다시 일어나기까지
  reviveHp: 0.5,         // 일어날 때 돌아오는 체력 비율
  // 결전장에서는 스킬이 시간으로 차지 않는다. 때린 만큼 찬다.
  // 한 번 채우는 데 드는 피해 = (보스 체력 ÷ 사람 수) × charge
  charge: 0.5,
  aidCut: 0.5,           // 보급소는 제가 밀어 준 사람이 낸 피해로 찬다

  // 저절로 차오르지는 않는다. 채우는 길은 보급소뿐이다.
  bspd: 90,              // 보스가 걷는 속도 (좌우)
  bspdY: 58,             // 보스가 걷는 속도 (위아래)
  breach: 168,           // 보스가 곁에 있다고 보는 거리 — 이 안이면 후려친다
  club: 172,             // 방망이가 닿는 거리
  clubArc: 1.15,         // 방망이가 훑는 부채꼴의 절반 각 (라디안)
  bswing: 0.72,          // 방망이를 한 번 휘두르는 데 걸리는 시간
  bland: 0.34,           // 휘두르기 시작해서 맞는 순간까지
  bcd: 2,                // 다음 방망이질까지
  clubDmg: 0.5,          // 방망이 한 대 — 크게 내리치는 것보다는 약하다
};

/* 난이도마다 결전장이 달라지는 몫. 적어 두지 않은 값은 기준을 그대로 쓴다.
   hp     는 보스 체력, lives 는 몇 대를 맞으면 쓰러지는지,
   revive 는 다시 일어나기까지, wear 는 두 번째부터 얼마씩 더 누워 있는지,
   tell   은 붉은 자리가 떠 있는 시간, rest 는 다음 공격까지,
   limit  은 분노하기까지, bite 는 한 대의 무게다.
   move   는 걸어 다니는 속도, cut 은 tell 에서 초 단위로 깎아내는 몫이다. */
export const AD_TUNE = { hp: 1, bite: 1, lives: ARENA.lives, revive: 1, wear: 0, tell: 1, rest: 1, limit: 1, move: 1, cut: 0 };
export const AD_WEAR_MAX = 2.2;      // 아무리 자주 쓰러져도 이보다 더 누워 있지는 않는다
export const AD_MEND = 14;           // 이만큼 버티고 서 있으면 쌓인 몫이 한 칸 풀린다
export const adTune = (g) => ({ ...AD_TUNE, ...(diffOf(g).arena || {}) });

/* 보스는 결전장 안을 걸어 다닌다. 자리는 arena 에 담고, 그림 기준선은 발끝에서 이만큼 위다. */
export const ARENA_LIFT = ARENA.bfy - ARENA.by;
export const bossX = (g) => (g.arena && g.arena.x !== undefined ? g.arena.x : ARENA.bx);
export const bossY = (g) => (g.arena && g.arena.y !== undefined ? g.arena.y : ARENA.bfy);
export const bossTop = (g) => bossY(g) - ARENA_LIFT;

/* 결전장에서 병과마다 다르게 싸운다. 사거리·간격은 판 위 타워 수치를 그대로 쓰고,
   결전장은 판보다 넓으므로 사거리에 ARENA.rangeMul 을 곱한다.
   한 방 피해는 타워의 초당 피해에서 뽑아, 병과끼리 비슷한 몫이 되도록 맞췄다.
   rooted 가 붙은 병과는 겨누어 쏘므로, 발을 멈춰야 평타가 나간다. */
/* 병과 이펙트 원본에서 떼어 낸 그림 — design/effects/hero-fx-sheet.webp
   fly 는 날아가는 것, hit 는 꽂힌 자국, big 은 스킬로 꽂힌 자국,
   cast 는 스킬을 쓸 때 보스 자리에 얹는 그림이다. r 은 얹을 크기(반지름). */
export const ARENA_ART = {
  archer: { fly: "archer/arrow", flyR: 30, hit: "archer/hit1", hitR: 46,
    big: "archer/hit", bigR: 108, cast: "archer/volley", castR: 190 },
  sniper: { fly: "sniper/slug", flyR: 34, hit: "sniper/hit", hitR: 62,
    big: "sniper/hit", bigR: 118, cast: "sniper/mark", castR: 168 },
  cannon: { fly: "cannon/shell", flyR: 24, hit: "cannon/boom", hitR: 74,
    big: "cannon/boom", bigR: 132, rain: "cannon/rain1", rainR: 22,
    land: "cannon/hit", landR: 42, smoke: "cannon/smoke", smokeR: 30 },
  // 둘째 장 — design/effects/hero2-fx-sheet.webp
  bolt: { fly: "bolt/fly", flyR: 36, hit: "bolt/hit", hitR: 40,
    big: "bolt/storm", bigR: 138, strike: "bolt/strike", strikeR: 58,
    arc: "bolt/arc", arcR: 58, ring: "bolt/ring", ringR: 72 },
  // 화염탑은 이펙트를 새로 받아 넷째 장으로 바꿨다
  flame: { fly: "flame/fly", flyR: 26, hit: "flame/hit", hitR: 64,
    big: "flame/storm", bigR: 120, up: "flame/up", upR: 64,
    boom: "flame/boom", boomR: 72, ring: "flame/ring", ringR: 62 },
  poison: { fly: "poison/fly", flyR: 28, hit: "poison/hit", hitR: 54,
    big: "poison/storm", bigR: 148, cloud: "poison/cloud", cloudR: 60,
    pool: "poison/pool", poolR: 96, drop: "poison/drop", dropR: 26,
    ring: "poison/ring", ringR: 76 },
  // 셋째 장 — design/effects/hero3-fx-sheet.webp
  frost: { fly: "frost/fly", flyR: 30, hit: "frost/hit", hitR: 64,
    big: "frost/big", bigR: 148, ring: "frost/ring", ringR: 70,
    sigil: "frost/sigil", sigilR: 54 },
  gravity: { field: "gravity/field", fieldR: 112, hit: "gravity/crush", hitR: 92,
    big: "gravity/hole", bigR: 124, pull: "gravity/pull", pullR: 46,
    swirl: "gravity/swirl", swirlR: 62 },
  supply: { beam: "supply/beam", beamR: 52, ring: "supply/ring", ringR: 46,
    dome: "supply/dome", domeR: 78, bless: "supply/bless", blessR: 56,
    spark: "supply/spark", sparkR: 46, wave: "supply/wave", waveR: 54,
    up: "supply/up", upR: 50 },
  // 넷째 장 — design/effects/hero4-fx-sheet.webp
  corrode: { fly: "corrode/fly", flyR: 26, hit: "corrode/hit", hitR: 56,
    big: "corrode/storm", bigR: 132, pool: "corrode/pool", poolR: 82,
    up: "corrode/up", upR: 62 },
  paladin: { fly: "paladin/fly", flyR: 34, hit: "paladin/slash", hitR: 70,
    big: "paladin/sigil", bigR: 106, blade: "paladin/blade", bladeR: 76,
    orb: "paladin/orb", orbR: 84, ring: "paladin/ring", ringR: 84 },
};

export const ARENA_KIT = {
  archer:  { mode: "shot",  dmg: 45,  cd: 0.95, fly: 0.20, rng: 158, shot: "arrow", col: "#cfe3a6", rooted: 1 },
  sniper:  { mode: "shot",  dmg: 130, cd: 2.60, fly: 0.10, rng: 165, shot: "slug",  col: "#8e99e8", rooted: 1 },
  cannon:  { mode: "bomb",  dmg: 66,  cd: 1.50, fly: 0.42, rng: 118, splash: 96, shot: "shell", col: "#eda061", rooted: 1 },
  bolt:    { mode: "chain", dmg: 55,  cd: 1.20, rng: 142, chain: 3, col: "#f2d179" },
  flame:   { mode: "aura",  dmg: 32,  cd: 1.00, rng: 112, burn: 14, burnT: 5, col: "#ef8177" },
  poison:  { mode: "shot",  dmg: 18,  cd: 1.00, fly: 0.24, rng: 124, poison: 12, poisonT: 4, trueDmg: 1,
             shot: "acid", col: "#bcdd71" },
  frost:   { mode: "shot",  dmg: 39,  cd: 0.85, fly: 0.18, rng: 128, slow: 3, shot: "shard", col: "#7cb6ea" },
  gravity: { mode: "field", dmg: 118, cd: 3.20, rng: 145, stagger: 0.7, col: "#e08cc6", rooted: 1 },
  corrode: { mode: "shot",  dmg: 46,  cd: 1.10, fly: 0.20, rng: 132, shred: 0.2, shredT: 4,
             shot: "acid", col: "#78d5bf" },
  paladin: { mode: "melee", dmg: 33,  cd: 0.50, rng: 72,  col: "#bcd8ef" },   // 붙어야 닿는다
  supply:  { mode: "aid",   dmg: 0,   cd: 2.20, rng: 140, buff: 0.25, buffT: 5, heal: 4, col: "#c99ae0" },
};
export const arenaKit = (pi) => ARENA_KIT[(CLASSES[pi] || {}).id] || ARENA_KIT.archer;
export const arenaArtOf = (pi) => ARENA_ART[(CLASSES[pi] || {}).id] || null;
export const arenaRange = (pi) => arenaKit(pi).rng * ARENA.rangeMul;

/* 보스가 쓰는 공격. tell 동안 바닥에 붉은 자리가 뜨고, 그때 빠져나가면 된다. */
export const ARENA_PATTERNS = [
  { id: "slam",  name: "내리치기", tell: 1.45, dmg: 1.0, note: "한 곳을 크게 내리친다" },
  { id: "sweep", name: "휩쓸기",   tell: 1.7,  dmg: 0.9, note: "둘레를 쓸어버린다 — 품 안이나 바깥으로" },
  { id: "stomp", name: "발구르기", tell: 1.35, dmg: 0.8, note: "세 곳을 동시에 짓밟는다" },
  { id: "swipe", name: "후려치기", tell: 0.75, dmg: 0.6, note: "곁에 붙은 것을 팔로 후려친다" },
  { id: "leap",  name: "내려찍기", tell: 1.5,  dmg: 1.1, note: "뛰어올라 한 곳에 떨어진다" },
  { id: "rush",  name: "돌진",     tell: 1.1,  dmg: 0.95, note: "일직선으로 밀고 들어온다" },
  // 십자로 한 번 가르고, 쉬지 않고 엇갈려 한 번 더 가른다. 두 번째는 따로 뽑히지 않는다.
  { id: "cross", name: "십자 가르기",   tell: 1.05, dmg: 0.85, next: "xcut",
    note: "가로세로로 가른다 — 네 귀퉁이로" },
  { id: "xcut",  name: "엇갈려 가르기", tell: 0.58, dmg: 0.85, chain: 1,
    note: "곧바로 비스듬히 가른다 — 아까 안전하던 자리가 위험해진다" },
  // 대군주만 쓰는 둘. 방망이가 아니라 땅으로 자리를 좁힌다.
  { id: "wake", name: "겹파문",   tell: 1.6, dmg: 0.9,
    note: "파문이 두 겹으로 퍼진다 — 두 겹 사이에 서라" },
  { id: "hail", name: "쏟아지기", tell: 1.3, dmg: 0.8,
    note: "다섯 곳이 한꺼번에 무너진다" },
  // 대군주가 더 쓰는 다섯. hits 가 붙으면 한 기술이 그 횟수만큼 이어서 떨어진다.
  { id: "gore",  name: "뿔찍기",   tell: 1.2, dmg: 1.2,
    note: "정면을 크게 들이받는다 — 양옆이 안전하다" },
  { id: "rift",  name: "대지균열", tell: 1.4, dmg: 0.85,
    note: "땅이 세 줄로 갈라진다 — 줄과 줄 사이로" },
  { id: "pulse", name: "분노의 파동", tell: 1.6, dmg: 1.0, hits: 3, gap: 0.5,
    note: "파동이 세 번 퍼진다 — 안쪽에서 바깥으로" },
  { id: "track", name: "추적 낙석", tell: 1.1, dmg: 0.75, chase: 1,
    note: "자리를 쫓아오다 떨어진다 — 끝에 비켜라" },
  { id: "spin",  name: "광폭 회전", tell: 1.8, dmg: 1.15, hits: 2, gap: 0.45,
    note: "반 바퀴씩 두 번 휘두른다 — 등 뒤로 돌아라" },
];
export const PAT_BY_ID = Object.fromEntries(ARENA_PATTERNS.map((p) => [p.id, p]));

/* 결전은 두 갈래다 — 상대가 누구냐에 따라 읽어야 할 것이 달라진다.
   오우거 지휘관은 방망이로 가르고, 대군주는 땅을 흔들어 설 자리를 좁힌다.
   pool 은 평소에 뽑는 목록, far 는 다들 멀리 떨어졌을 때, close 는 곁에 붙었을 때다. */
export const ARENA_BOSS = {
  boss: {
    tag: "1차 결전",
    lead: "맞으면 깎인 체력만큼 성채도 깎인다 — 피하면서 싸우자",
    color: "#ff9f6a", ring: "#ffb06a",
    pool: ["slam", "stomp", "leap", "cross", "sweep", "cross", "rush"],
    far: ["leap", "rush"], close: ["swipe"],
    tell: 1, after: 1, rest: 1.6, limit: 75,
    // 기술마다 얹을 그림 (design/effects 의 오우거 시트에서 떼어 낸 것).
    // once 가 붙으면 자리마다가 아니라 한 판에 한 장만 얹는다.
    art: {
      cross: { id: "boss/cross", once: 1, r: 300 },
      xcut:  { id: "boss/xcut", once: 1, r: 300 },
      slam:  { id: "boss/slam" },
      leap:  { id: "boss/leap" },
      sweep: { id: "boss/sweep" },
      swipe: { id: "boss/swipe" },
      rush:  { id: "boss/rush" },
      stomp: { id: "boss/stomp1" },
    },
  },
  titan: {
    tag: "2차 결전",
    lead: "파문과 낙반 사이로 자리를 찾아라 — 맞은 만큼 성채가 깎인다",
    color: "#ff6f6f", ring: "#ff7a6a",
    pool: ["wake", "rift", "slam", "hail", "pulse", "leap", "wake", "spin",
      "track", "sweep", "rush", "rift"],
    far: ["leap", "rush", "wake", "rift"], close: ["swipe", "gore"],
    tell: 0.88, after: 0.8, rest: 1.1, limit: 100,
    // 기술마다 얹을 그림 (design/effects 시트에서 떼어 낸 것).
    // once 가 붙으면 자리마다가 아니라 한 판에 한 장만 얹는다.
    art: {
      wake:  { id: "titan/wake", once: 1 },
      hail:  { id: "titan/hail1" },
      slam:  { id: "titan/slam" },
      leap:  { id: "titan/leap" },
      sweep: { id: "titan/sweep" },
      swipe: { id: "titan/swipe" },
      rush:  { id: "titan/rush" },
      gore:  { id: "titan/gore" },
      rift:  { id: "titan/rift", once: 1, r: 260 },
      pulse: { id: "titan/pulse", once: 1, r: 380 },
      track: { id: "titan/track1" },
      spin:  { id: "titan/spin", once: 1, r: 430 },
    },
  },
};
export const arenaBossCfg = (kind) => ARENA_BOSS[kind] || ARENA_BOSS.boss;

/* 뿔찍기 — 보스가 보는 쪽으로 부채꼴 120도 */
export const ARENA_GORE = { half: Math.PI / 3, r: 330 };
/* 대지균열 — 나란한 세 줄 */
export const ARENA_RIFT = { n: 3, len: 520, half: 27, gap: 104, ang: 0.62 };
/* 분노의 파동 — 세 번 퍼진다 */
export const ARENA_PULSE = { r: [120, 250, 380], band: 96 };
/* 추적 낙석 — 여섯 곳, 예비 끝자락에 자리가 굳는다 */
export const ARENA_TRACK = { n: 6, r: 105, pull: 3.4, stop: 0.35 };
/* 광폭 회전 — 반 바퀴씩 두 번 */
export const ARENA_SPIN = { r0: 100, r1: 430, half: Math.PI / 2 };

/* 겹파문 — 안쪽 띠와 바깥 띠, 그 사이가 안전하다 */
export const ARENA_WAKE = { r0: 96, r1: 236, r2: 372, r3: 530 };
/* 쏟아지기 — 다섯 곳 */
export const ARENA_HAIL = { n: 5, r: 132 };

/* 돌진이 훑는 길이 · 뛰어오르는 높이 */
export const ARENA_LEAP = { r: 210, rTitan: 245, up: 190 };
export const ARENA_RUSH = { len: 520, half: 78, halfTitan: 92, spd: 1250, least: 380 };
/* 가르기 띠 — 보스를 지나 판 끝까지 뻗는다 */
export const ARENA_CUT = { reach: 1100, half: 66, halfTitan: 80 };

/* 결전장에서 어느 자리가 공격에 닿는지 — 위아래를 좁게 보아 판단한다 */
export function arenaInZone(z, x, y) {
  if (z.k === "lane") {                    // 돌진이 지나가는 길 — 선분까지의 거리로 본다
    const ax = z.x, ay = z.y / ARENA.squash;
    const bx = z.ex, by = z.ey / ARENA.squash;
    const px = x, py = y / ARENA.squash;
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t)) <= z.w;
  }
  const dx = x - z.x, dy = (y - z.y) / ARENA.squash;
  const d = Math.hypot(dx, dy);
  if (z.k === "cone") {                    // 부채꼴 — 거리와 방향을 같이 본다
    if (d < (z.r0 || 0) || d > z.r1) return false;
    let da = Math.atan2(dy, dx) - z.a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) <= z.half;
  }
  return z.k === "ring" ? d >= z.r0 && d <= z.r1 : d <= z.r;
}
export function arenaNear(x, y, tx, ty) {
  return Math.hypot(x - tx, (y - ty) / ARENA.squash);
}

/* 성채 단계 — 골드를 내고 직접 올린다. 올릴 때마다 겉모습과 성능이 같이 오른다. */
export const CASTLE_TIERS = 4;
export const CASTLE_COST = [120, 250, 420];      // 1→2, 2→3, 3→4
export const CASTLE_HP_UP = 30;                  // 단계마다 최대 체력
export const castleTier = (g) => Math.max(1, Math.min(CASTLE_TIERS, (g.core && g.core.lv) || 1));
export const castleCost = (g) => CASTLE_COST[castleTier(g) - 1] || 0;
// 단계가 오르면 성채 대포도 세진다
export const castleGun = (lv) => ({
  range: CASTLE_GUN.range + (lv - 1) * 14,
  dmg: CASTLE_GUN.dmg * (1 + 0.4 * (lv - 1)),
  interval: CASTLE_GUN.interval * Math.pow(0.92, lv - 1),
  splash: CASTLE_GUN.splash + (lv - 1) * 6,
});

// 짓고 나서 첫 사격까지 걸리는 시간
export const WARMUP = 1.5;

// 등급 하나를 무게에 따라 고른다
function rollRarity() {
  const total = RARITY_IDS.reduce((s, id) => s + RARITY[id].weight, 0);
  let r = Math.random() * total;
  for (const id of RARITY_IDS) {
    r -= RARITY[id].weight;
    if (r <= 0) return id;
  }
  return "common";
}

// 셋을 뽑는다. 이미 많이 쌓인 것도 다시 나올 수 있게 두되, 성벽은 성채가 튼튼하면 뺀다.
// 자리마다 등급을 먼저 굴리고, 그 등급에서 하나를 고른다 — 등급 풀이 바닥나면 한 단계 낮춰 채운다.
export function rollPerks(g, n = 3) {
  const pool = PERKS.filter((p) => p.id !== "wall" || g.core.max < 220);
  const byRarity = {};
  RARITY_IDS.forEach((r) => { byRarity[r] = shuffle(pool.filter((p) => p.rarity === r)); });
  const picks = [];
  for (let i = 0; i < n; i++) {
    let idx = RARITY_IDS.indexOf(rollRarity());
    let chosen = null;
    while (idx >= 0 && !chosen) {
      chosen = byRarity[RARITY_IDS[idx]].pop();
      idx--;
    }
    if (!chosen) break;                 // 풀이 정말 다 바닥났다 (perk 수보다 n 이 클 때만)
    picks.push(chosen.id);
  }
  return picks;
}

/* ── 조작키 (온라인에서는 각자 자기 키보드를 쓴다) ────────── */
export const MOVE_KEYS = {
  KeyW: "up", KeyA: "left", KeyS: "down", KeyD: "right",
  ArrowUp: "up", ArrowLeft: "left", ArrowDown: "down", ArrowRight: "right",
};
export const BUILD_KEYS = ["Space", "Enter", "KeyQ"];
export const SKILL_KEYS = ["ShiftLeft", "ShiftRight", "KeyE"];
export const SELL_KEYS = ["KeyX", "Delete", "Backspace"];
export const KEY_HINT = { move: "W A S D · 방향키", build: "Space", skill: "Shift", sell: "X" };

export const ETYPES = ["grunt", "rusher", "armor", "boss", "titan"];

/* ── 상태 ───────────────────────────────────────────────── */
export function makeGame(seats = [true, true, true, true, false, false], total = TOTAL_WAVES, diff = DEFAULT_DIFF, testMode = false) {
  const flags = [];
  for (let i = 0; i < SEATS; i++) flags.push(!!seats[i]);
  const d = DIFFS[diff] ? diff : DEFAULT_DIFF;
  const D = DIFFS[d];
  return {
    testMode,
    testDmgMul: 1,
    testCharMul: 1,
    testCharDmg: 0,
    seats: flags,
    total: WAVE_OPTIONS.includes(total) ? total : TOTAL_WAVES,
    diff: d,
    phase: "ready",
    wave: 0,
    timer: D.prep,
    core: { hp: D.core, max: D.core, lv: 1 },
    players: flags.map((_, i) => {
      // 여섯 병과를 네 경로에 나눠 세운다
      const lane = i % 4;
      const slot = Math.min(SLOT_INDEX[lane].length - 1, i < 4 ? 3 : i === 4 ? 1 : 5);
      const s = SLOTS[sk(lane, slot)];
      return {
        gold: testMode ? 99999 : D.start, cd: 0, lane, slot, built: 0, kills: 0,
        perks: {},                      // 보스를 잡고 고른 능력 { id: 개수 }
        cx: s.x, cy: s.y, cr: CLASSES[i].range, jolt: 0, heldKeys: [], holdT: 0,
        // 보스 결전장에서 쓰는 값
        ax: ARENA.bx - 255 + i * 170, ay: ARENA.bfy + 150,
        adir: 1, aswing: 0, adown: 0, acd: 0, ahit: 0, askill: 0, adodge: 0,
        ahp: 0, ahpMax: 0, aout: 0,             // 결전장에서만 쓰는 체력 · 쓰러져 있는 시간
      };
    }),
    towers: new Array(SLOTS.length).fill(null),
    arena: null,                        // 보스 결전 중에만 채워진다
    overWhy: 0,                         // 진 까닭 — "wipe" 면 결전장에서 전멸
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
    preview: null,      // 이번 웨이브에 올 적 [종류, 수]
    leave: flags.map(() => false),   // 대기실로 돌아가자는 데 동의한 자리
    leaveT: 0,                       // 동의가 살아 있는 시간
    leaveDone: 0,                    // 모두 동의했다
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
  // 보스 웨이브는 번갈아 온다 — 첫 번째는 오우거 지휘관, 두 번째는 대군주
  if (n % 5 === 0) return (n / 5) % 2 === 0 ? "titan" : "boss";
  if (n % 4 === 0) return "rush";
  return "normal";
}

/* 그 길이의 판에서 이 결전을 처음 만나는 웨이브. 시험용 바로 들어가기에 쓴다. */
export function bossWave(kind, total = TOTAL_WAVES) {
  for (let n = 1; n <= total; n++) if (waveKind(n, total) === kind) return n;
  return total;
}

/* 적이 세지는 정도. 라운드를 길게 잡으면 그만큼 완만하게 올라간다.
   어느 길이로 하든 마지막 웨이브의 세기는 같다. */
export function waveScale(n, total = TOTAL_WAVES) {
  return Math.pow(1.155, ((n - 1) * TOTAL_WAVES) / Math.max(1, total));
}

export function buildQueue(n, players = 4, total = TOTAL_WAVES, diff = DEFAULT_DIFF) {
  const D = DIFFS[diff] || DIFFS[DEFAULT_DIFF];
  const crew = Math.max(1, Math.min(CREW_MAX, players));
  const kind = waveKind(n, total);
  const laneCount = Math.max(1, Math.min(crew, n < 2 ? 2 : n < 4 ? 3 : 4));
  const active = shuffle([0, 1, 2, 3]).slice(0, laneCount);
  const one = () => active[Math.floor(Math.random() * active.length)];

  // 보스 웨이브에는 보스만 나온다 — 길을 따라오는 대신 결전장이 열린다
  if (kind === "boss") return [{ type: "boss", lane: one() }];
  if (kind === "titan") return [{ type: "titan", lane: one() }];

  const list = [];
  const step = (n * TOTAL_WAVES) / Math.max(1, total);   // 15라운드 기준으로 환산한 진행도
  const elite = D.elite || 0;                            // 돌격병·중갑으로 얼마나 쏠리는지

  if (kind === "rush") {
    // 갑자기 빠른 적이 떼로 몰려온다. 높은 난이도에서는 그 틈에 중갑이 섞인다.
    const count = Math.round((10 + step * 2.6) * (0.5 + 0.13 * crew) * D.count);
    for (let i = 0; i < count; i++) {
      const type = elite > 0 && step >= 4 && Math.random() < 0.3 * elite ? "armor" : "rusher";
      list.push({ type, lane: active[i % active.length] });
    }
    return list;
  }

  const count = Math.round((5 + step * 1.9) * (0.44 + 0.14 * crew) * D.count);
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    const r = Math.random();
    if (step >= 3 && r < 0.32 + 0.16 * elite) type = "rusher";
    else if (step >= 5 && r > 0.76 - 0.2 * elite) type = "armor";
    list.push({ type, lane: active[i % active.length] });
  }
  return list;
}
