/* ── RPG 모드 ──────────────────────────────────────────────
   대기실 없이 바로 광장에 선다. 광장의 사냥문을 지나면 사냥터다.
   사냥터에는 토끼가 늘 열다섯 마리 이하로 돌아다닌다. 한 마리가 죽으면 한 마리가 새로 나온다.
   토끼 한 마리는 경험치 1 · 1코인. 사냥꾼에게 받은 퀘스트로 다섯 마리를 잡으면 경험치 10 · 15코인.

   판정은 방장 한 명이 하고, 나머지는 받은 상태를 그린다.
   레벨 · 경험치 · 코인 · 퀘스트는 각자의 기기에 병과마다 남아 다음에 들어와도 이어진다. */
import { P, CLASSES, ARENA_KIT, ARENA_ART } from "./world.js";

export const RPG_CREW_MAX = 8;

export const RPG = {
  heroHp: 190,
  rangeMul: 1.25,        // 탑 사거리보다 조금 넓게
  spd: 250,              // 영웅이 걷는 속도
  squash: 0.78,          // 비스듬히 내려다보는 땅이라 위아래 거리는 좁게 센다
  skillCd: 20,
  down: 5,               // 쓰러지면 이만큼 뒤에 광장에서 일어난다
  calm: 2.5,             // 이만큼 맞지 않으면 체력이 저절로 차오른다
  calmRegen: 0.03,       // 그때 초당 차오르는 몫 (최대 체력 대비)
  talkR: 100,            // 이만큼 가까우면 말을 걸 수 있다
  edge: 40,
};

/* 맵 — 광장과 사냥터. 문에 들어서면 반대쪽 맵의 at 자리로 옮겨 간다. */
export const MAPS = {
  plaza: {
    id: "plaza", name: "광장", w: 1800, h: 1200, top: 170, safe: true, spawn: [900, 820],
    gates: [{ x: 1690, y: 660, r: 64, to: "field", at: [240, 920], label: "사냥문" }],
    blocks: [{ x: 900, y: 620, r: 96 }],          // 가운데 분수
    npcs: [],
  },
  field: {
    id: "field", name: "사냥터", w: 2600, h: 1700, top: 170, spawn: [240, 920],
    gates: [{ x: 90, y: 920, r: 64, to: "plaza", at: [1560, 700], label: "광장" }],
    blocks: [],
    npcs: [{ id: "hunter", name: "사냥꾼", x: 430, y: 740 }],
    rabbits: 15,
  },
};
const MAP_IDS = ["plaza", "field"];

export const QUEST = { name: "토끼 사냥", need: 5, xp: 10, coin: 15 };
const RABBIT = { hp: 40, xp: 1, coin: 1, rad: 13, bump: 4, respawn: 1.5 };

// 병과마다 버티는 몫 — 붙어서 싸우는 성기사가 가장 튼튼하다
const CLASS_HP = { paladin: 1.35, supply: 1.1, sniper: 0.85 };
const SUPPLY_SHOT = 60;          // 보급소도 혼자 사냥할 수는 있어야 한다

/* 병과마다 쓰는 큰 기술 */
export const RPG_SKILL = {
  archer:  { name: "화살비" },   sniper: { name: "결정타" },  cannon: { name: "융단 폭격" },
  bolt:    { name: "뇌우" },     flame:  { name: "화염 폭풍" }, poison: { name: "역병" },
  frost:   { name: "한파" },     gravity: { name: "블랙홀" },  supply: { name: "긴급 보급" },
  corrode: { name: "산성비" },   paladin: { name: "성역" },
};

const STYLE = {
  shot: "멀리서 쏜다", bomb: "포탄 · 범위 피해", chain: "번개가 옮겨 붙는다", aura: "주변을 태운다",
  field: "중력장으로 끌어당긴다", melee: "붙어서 벤다 · 튼튼하다", aid: "아군 회복 · 공격력 강화",
};
export const rpgStyle = (pi) => STYLE[kitOf(pi).mode] || "";

const kitOf = (pi) => ARENA_KIT[(CLASSES[pi] || {}).id] || ARENA_KIT.archer;
const artOf = (pi) => ARENA_ART[(CLASSES[pi] || {}).id] || null;
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, (by - ay) / RPG.squash); }

/* ── 성장 ──────────────────────────────────────────────── */
export const needXp = (lv) => 30 * lv;         // 1→2 는 30, 그다음부터 30씩 는다
export const LV_MAX = 99;

const SAVE_KEY = "flg:rpg2";
function loadSave() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (v && v.v === 2 && v.heroes) return v;
  } catch { /* 망가진 기록은 새로 시작한다 */ }
  return { v: 2, heroes: {} };
}
export function heroSave(id) {
  const r = loadSave().heroes[id] || {};
  const q = r.quest || {};
  return {
    lv: clamp(Math.floor(r.lv || 1), 1, LV_MAX),
    xp: Math.max(0, Math.floor(r.xp || 0)),
    coins: Math.max(0, Math.floor(r.coins || 0)),
    quest: { on: !!q.on, n: clamp(Math.floor(q.n || 0), 0, QUEST.need) },
  };
}
export function writeHero(id, d) {
  const s = loadSave();
  s.heroes[id] = { lv: d.lv, xp: d.xp, coins: d.coins, quest: { on: !!d.quest.on, n: d.quest.n } };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 저장이 막혀 있으면 이번만 */ }
}

/* ── 세계 ──────────────────────────────────────────────── */
export function makeWorld() {
  const g = {
    mode: "rpg", t: 0,
    heroes: CLASSES.map(() => null), mobs: [], hits: [], respawn: [], pending: {},
    fx: [], out: null, banner: null, shake: 0, nextId: 1,
    seats: CLASSES.map(() => false), names: [], mySeat: -1,
  };
  for (let i = 0; i < MAPS.field.rabbits; i++) spawnRabbit(g);
  return g;
}

function makeHero(pi, map = "plaza") {
  const [sx, sy] = MAPS[map].spawn;
  const h = {
    pi, map, x: sx + (Math.random() - 0.5) * 120, y: sy + (Math.random() - 0.5) * 60, dir: 1, hold: [],
    hp: 0, max: 0, down: 0, lv: 1, xp: 0, coins: 0, quest: { on: false, n: 0 }, loaded: 0,
    cd: 0.5, sk: 0, swing: 0, kills: 0, flash: 0, numAcc: 0, numT: 0, calm: 0, gateCd: 0,
    buff: 0, buffAmt: 0, guard: 0,
  };
  refreshHp(h, true);
  return h;
}

const heroMaxHp = (h) => Math.round(RPG.heroHp * (CLASS_HP[CLASSES[h.pi].id] || 1) * (1 + 0.08 * (h.lv - 1)));
function refreshHp(h, full) {
  h.max = heroMaxHp(h);
  if (full) h.hp = h.max;
  else h.hp = Math.min(h.max, h.hp);
}
export const heroDmgMul = (h) => (1 + 0.05 * (h.lv - 1)) * (h.buff > 0 ? 1 + h.buffAmt : 1);
export const heroRange = (h) => kitOf(h.pi).rng * RPG.rangeMul;
const heroCd = (h) => kitOf(h.pi).cd;

/* 자리에 앉은 사람을 세계에 세우고, 떠난 사람은 뺀다 (방장만) */
export function rpgSyncSeats(g, flags, names) {
  g.seats = flags.slice();
  g.names = names.slice();
  flags.forEach((on, pi) => {
    if (on && !g.heroes[pi]) {
      const h = g.heroes[pi] = makeHero(pi);
      if (g.pending[pi]) { rpgJoin(g, pi, g.pending[pi]); delete g.pending[pi]; }
      fx(g, "plaza", { kind: "nova", x: h.x, y: h.y - 10, r: 60, color: P[pi].light, n: 8, t: 0.6, life: 0.6 });
    } else if (!on && g.heroes[pi]) {
      g.heroes[pi] = null;
    }
  });
}

/* 들어온 사람이 알려 준 제 기록 — 아직 세워지지 않았으면 세울 때 쓴다 */
export function rpgJoin(g, pi, d) {
  const h = g.heroes[pi];
  if (!h) { g.pending[pi] = d; return; }
  if (!d || h.loaded) return;
  h.lv = clamp(Math.floor(Number(d.lv) || 1), 1, LV_MAX);
  h.xp = clamp(Math.floor(Number(d.xp) || 0), 0, needXp(h.lv) - 1);
  h.coins = Math.max(0, Math.floor(Number(d.coins) || 0));
  const q = d.quest || {};
  h.quest = { on: !!q.on, n: clamp(Math.floor(Number(q.n) || 0), 0, QUEST.need - 1) };
  refreshHp(h, true);
  h.loaded = 1;
}

/* ── 연출 — 어느 맵에서 일어났는지 함께 적는다 ─────────────── */
function fx(g, map, item) {
  const it = { ...item, map };
  g.fx.push(it);
  if (g.out) g.out.push({ k: "fx", ...it });
}
function say(g, map, x, y, text, color) {
  fx(g, map, { kind: "text", x, y, text, color, t: 0.9, life: 0.9 });
}

/* ── 조작 ──────────────────────────────────────────────── */
export function rpgHold(g, pi, dirs) {
  const h = g.heroes[pi];
  if (h) h.hold = Array.isArray(dirs) ? dirs.filter((d) => typeof d === "string").slice(0, 4) : [];
}

// 누르고 있는 만큼 걷는다 — 방장과 손님 화면 양쪽에서 같은 식으로 돈다
export function rpgWalk(h, dt) {
  if (!h || h.down > 0 || !h.hold || !h.hold.length) return;
  let dx = 0, dy = 0;
  h.hold.forEach((d) => {
    if (d === "left") dx -= 1;
    else if (d === "right") dx += 1;
    else if (d === "up") dy -= 1;
    else if (d === "down") dy += 1;
  });
  if (!dx && !dy) return;
  const len = Math.hypot(dx, dy);
  if (dx) h.dir = dx < 0 ? -1 : 1;
  h.x += (dx / len) * RPG.spd * dt;
  h.y += (dy / len) * RPG.spd * RPG.squash * dt;
  keepIn(h, MAPS[h.map], 20);
}

// 맵 가장자리와 막힌 곳(분수) 밖으로 밀어낸다
function keepIn(o, M, rad) {
  o.x = clamp(o.x, RPG.edge, M.w - RPG.edge);
  o.y = clamp(o.y, M.top, M.h - RPG.edge);
  M.blocks.forEach((b) => {
    const dx = o.x - b.x, dy = (o.y - b.y) / RPG.squash;
    const d = Math.hypot(dx, dy);
    const min = b.r + rad;
    if (d < min && d > 0.01) {
      o.x = b.x + (dx / d) * min;
      o.y = b.y + (dy / d) * min * RPG.squash;
    }
  });
}

export function npcNear(h) {
  if (!h) return null;
  return MAPS[h.map].npcs.find((n) => dist(h.x, h.y, n.x, n.y) <= RPG.talkR) || null;
}

/* 사냥꾼에게 말을 건다 — 퀘스트를 받거나, 얼마나 남았는지 듣는다 */
export function rpgTalk(g, pi) {
  const h = g.heroes[pi];
  const npc = npcNear(h);
  if (!h || !npc || h.down > 0) return;
  if (!h.quest.on) {
    h.quest = { on: true, n: 0 };
    fx(g, h.map, { kind: "call", x: npc.x, y: npc.y - 96, text: "퀘스트 받음", color: "#ffe08a", t: 0.9, life: 0.9,
      snd: "build", who: pi });
  } else {
    say(g, h.map, npc.x, npc.y - 70, `토끼 ${QUEST.need - h.quest.n}마리 남았네`, "#f0dcb4");
  }
}

/* ── 토끼 ──────────────────────────────────────────────── */
function spawnRabbit(g) {
  const M = MAPS.field;
  let x = 0, y = 0;
  // 사람 곁이나 문 앞에서는 나오지 않는다
  for (let tries = 0; tries < 12; tries++) {
    x = 300 + Math.random() * (M.w - 400);
    y = M.top + 60 + Math.random() * (M.h - M.top - 120);
    const busy = g.heroes.some((h) => h && h.map === "field" && dist(h.x, h.y, x, y) < 260)
      || M.npcs.some((n) => dist(n.x, n.y, x, y) < 200);
    if (!busy) break;
  }
  g.mobs.push({
    id: g.nextId++, type: "rabbit", map: "field", x, y, ax: Math.random() < 0.5 ? -1 : 1,
    hp: RABBIT.hp, max: RABBIT.hp, rad: RABBIT.rad, age: 0,
    state: "idle", t: 0.5 + Math.random() * 1.5, vx: 0, vy: 0, tgt: -1, bumpCd: 2,
    slow: 0, freeze: 0, stun: 0, burn: 0, bdps: 0, bby: -1, poison: 0, pdps: 0, pby: -1,
    shred: 0, shredAmt: 0, flash: 0, dotT: 0.5, numAcc: 0, numT: 0, numCol: "#ffe9bd",
  });
}

function nearMobs(g, map, x, y, range, n = Infinity) {
  const out = [];
  for (const m of g.mobs) {
    if (m.dead || m.map !== map) continue;
    const d = dist(x, y, m.x, m.y) - m.rad * 0.5;
    if (d <= range) out.push([d, m]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, n).map((o) => o[1]);
}

function flushNum(g, m, tier = 0) {
  if (!(m.numAcc > 0)) return;
  fx(g, m.map, { kind: "dmg", x: m.x + (Math.random() - 0.5) * 14, y: m.y - 30,
    text: String(Math.round(m.numAcc)), color: m.numCol, t: 0.65, life: 0.65, tier });
  m.numAcc = 0;
  m.numT = 0.2;
}

function hitMob(g, pi, m, raw, skill) {
  if (!m || m.dead) return 0;
  const h = g.heroes[pi];
  let dmg = raw * (1 + (m.shred > 0 ? m.shredAmt : 0));
  const crit = Math.random() < 0.05;
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  m.hp -= dmg;
  m.flash = 0.12;
  m.numAcc += dmg;
  m.numCol = crit ? "#ffd873" : P[pi] ? P[pi].light : "#ffe9bd";
  if (crit || skill || m.numT <= 0) flushNum(g, m, crit ? 2 : skill ? 1 : 0);
  // 맞은 토끼는 때린 쪽 반대로 달아난다
  if (h && m.hp > 0 && m.freeze <= 0 && m.stun <= 0) {
    const dx = m.x - h.x, dy = (m.y - h.y) / RPG.squash;
    const len = Math.hypot(dx, dy) || 1;
    m.state = "flee"; m.t = 1.4;
    m.vx = (dx / len) * 190; m.vy = (dy / len) * 190;
  }
  if (m.hp <= 0) killMob(g, m, pi);
  return dmg;
}

function killMob(g, m, pi) {
  if (m.dead) return;
  m.dead = true;
  m.hp = 0;
  flushNum(g, m, 1);
  fx(g, m.map, { kind: "poof", x: m.x, y: m.y - 6, t: 0.45, life: 0.45, color: "rgba(236,230,216,1)" });
  g.respawn.push({ t: RABBIT.respawn });
  const h = g.heroes[pi];
  if (!h) return;
  h.kills += 1;
  h.coins += RABBIT.coin;
  fx(g, m.map, { kind: "text", x: m.x, y: m.y - 16, text: `+${RABBIT.xp} XP · +${RABBIT.coin} 코인`, color: "#f3d27f",
    t: 0.9, life: 0.9, snd: "coin", who: pi });
  giveXp(g, h, RABBIT.xp);
  if (h.quest.on) {
    h.quest.n += 1;
    if (h.quest.n >= QUEST.need) {
      h.quest = { on: false, n: 0 };
      h.coins += QUEST.coin;
      fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: `퀘스트 완료! +${QUEST.xp} XP · +${QUEST.coin} 코인`,
        color: "#a9e79c", t: 1.4, life: 1.4, snd: "clear", who: pi });
      giveXp(g, h, QUEST.xp);
    }
  }
}

function giveXp(g, h, amt) {
  h.xp += amt;
  while (h.lv < LV_MAX && h.xp >= needXp(h.lv)) {
    h.xp -= needXp(h.lv);
    h.lv += 1;
    refreshHp(h, false);
    if (h.down <= 0) h.hp = h.max;             // 레벨이 오르면 체력이 가득 찬다
    fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 10, r: 60, color: "#ffe08a", n: 10, t: 0.6, life: 0.6 });
    fx(g, h.map, { kind: "call", x: h.x, y: h.y - 90, text: `레벨 업! Lv ${h.lv}`, color: "#ffe08a", t: 1, life: 1,
      snd: "wave", who: h.pi });
  }
  if (h.lv >= LV_MAX) h.xp = 0;
}

function hurtHero(g, h, raw) {
  if (!h || h.down > 0 || MAPS[h.map].safe) return;
  const dmg = raw * (h.guard > 0 ? 0.5 : 1);
  h.hp -= dmg;
  h.flash = 0.18;
  h.calm = 0;
  h.numAcc += dmg;
  if (h.numT <= 0) {
    fx(g, h.map, { kind: "dmg", x: h.x, y: h.y - 76, text: `-${Math.round(h.numAcc)}`, color: "#ff9a8a", t: 0.6, life: 0.6 });
    h.numAcc = 0;
    h.numT = 0.3;
  }
  if (h.hp <= 0) {
    h.hp = 0;
    h.down = RPG.down;
    h.hold = [];
    fx(g, h.map, { kind: "burst", x: h.x, y: h.y - 30, r: 40, color: "#ff9a8a", n: 10, t: 0.5, life: 0.5 });
    say(g, h.map, h.x, h.y - 90, "쓰러짐 — 광장에서 일어납니다", "#ffbdb2");
  }
}

/* ── 영웅의 공격 — 사거리 안의 토끼를 저절로 친다 ─────────────── */
function heroAttack(g, h) {
  const pi = h.pi;
  const map = h.map;
  const kit = kitOf(pi);
  const ART = artOf(pi);
  const dmg = kit.dmg * heroDmgMul(h);
  const rng = heroRange(h);
  const hy = h.y - 34;

  if (kit.mode === "aid") {
    let n = 0;
    g.heroes.forEach((q) => {
      if (!q || q.map !== map || q.down > 0 || dist(h.x, h.y, q.x, q.y) > rng) return;
      q.buff = kit.buffT; q.buffAmt = kit.buff;
      if (q.hp < q.max) q.hp = Math.min(q.max, q.hp + q.max * 0.06);
      n += 1;
    });
    const list = nearMobs(g, map, h.x, h.y, rng, 2);
    list.forEach((m) => {
      fx(g, map, { kind: "shot", x0: h.x, y0: hy, x1: m.x, y1: m.y - 10, style: "orb", color: kit.col, t: 0.2, life: 0.2 });
      g.hits.push({ t: 0.2, pi, mid: m.id, dmg: SUPPLY_SHOT * heroDmgMul(h), mode: "shot", kit: {} });
    });
    if (list.length) h.dir = list[0].x < h.x ? -1 : 1;
    return list.length > 0 || n > 1;
  }

  if (kit.mode === "aura") {                      // 화염 — 둘레를 통째로 태운다
    const list = nearMobs(g, map, h.x, h.y, rng);
    if (!list.length) return false;
    list.forEach((m) => {
      m.burn = kit.burnT; m.bdps = Math.max(m.bdps, kit.burn * 0.7 * heroDmgMul(h)); m.bby = pi;
      hitMob(g, pi, m, dmg * 0.75);
    });
    fx(g, map, { kind: "firering", x: h.x, y: h.y - 6, r: rng * 0.9, t: 0.5, life: 0.5, snd: "flame" });
    return true;
  }

  if (kit.mode === "melee") {                     // 성기사 — 둘레를 한 번에 벤다
    const list = nearMobs(g, map, h.x, h.y, rng);
    if (!list.length) return false;
    h.dir = list[0].x < h.x ? -1 : 1;
    list.forEach((m) => hitMob(g, pi, m, dmg));
    fx(g, map, { kind: "slash", x: h.x + h.dir * 30, y: h.y - 30, a: h.dir > 0 ? 0 : Math.PI,
      color: "rgba(255,246,226,0.95)", t: 0.24, life: 0.24 });
    return true;
  }

  if (kit.mode === "chain") {                     // 번개 — 첫 토끼에서 가까운 토끼로 옮겨 붙는다
    const [first] = nearMobs(g, map, h.x, h.y, rng, 1);
    if (!first) return false;
    h.dir = first.x < h.x ? -1 : 1;
    const hops = [first];
    let cur = first;
    while (hops.length < kit.chain) {
      const next = nearMobs(g, map, cur.x, cur.y, 170).find((m) => !hops.includes(m));
      if (!next) break;
      hops.push(next);
      cur = next;
    }
    let x0 = h.x, y0 = hy, pow = dmg;
    hops.forEach((m, k) => {
      fx(g, map, { kind: "zap", x0, y0, x1: m.x, y1: m.y - 10, color: kit.col, t: 0.28, life: 0.28, snd: k === 0 ? "zap" : null });
      hitMob(g, pi, m, pow);
      x0 = m.x; y0 = m.y - 10; pow *= 0.8;
    });
    return true;
  }

  if (kit.mode === "field") {                     // 중력 — 한 자리에 모아 짓누른다
    const [t] = nearMobs(g, map, h.x, h.y, rng, 1);
    if (!t) return false;
    h.dir = t.x < h.x ? -1 : 1;
    const cx = t.x, cy = t.y;
    nearMobs(g, map, cx, cy, 110).forEach((m) => {
      m.x += (cx - m.x) * 0.35; m.y += (cy - m.y) * 0.35;
      m.slow = 1.2;
      hitMob(g, pi, m, dmg);
    });
    fx(g, map, { kind: "hole", x: cx, y: cy - 6, r: 110, color: kit.col, t: 0.7, life: 0.7, snd: "pull" });
    return true;
  }

  // 날아가는 것 — 궁수·저격·대포·독·서리·부식
  const [m] = nearMobs(g, map, h.x, h.y, rng, 1);
  if (!m) return false;
  h.dir = m.x < h.x ? -1 : 1;
  const fly = kit.fly || 0.2;
  if (kit.shot === "slug") {
    fx(g, map, { kind: "beam", x0: h.x + h.dir * 16, y0: hy, x1: m.x, y1: m.y - 10, color: kit.col, w: 6, t: 0.26, life: 0.26 });
  } else {
    fx(g, map, { kind: "shot", x0: h.x, y0: hy, x1: m.x, y1: m.y - 10, style: kit.shot || "arrow",
      art: ART ? ART.fly : 0, r: ART ? ART.flyR * 0.6 : 0, color: kit.col, t: fly, life: fly,
      snd: kit.mode === "bomb" ? "cannon" : "shot" });
  }
  g.hits.push({ t: fly, pi, mid: m.id, x: m.x, y: m.y, map, dmg, mode: kit.mode, kit });
  return true;
}

// 날아간 것이 닿았다
function landHit(g, s) {
  const m = g.mobs.find((q) => q.id === s.mid && !q.dead);
  const kit = s.kit || {};
  if (s.mode === "bomb") {
    const x = m ? m.x : s.x, y = m ? m.y : s.y;
    const R = (kit.splash || 90) * 0.8;
    nearMobs(g, s.map || "field", x, y, R).forEach((q) => hitMob(g, s.pi, q, s.dmg * (q === m ? 1 : 0.6), s.skill));
    fx(g, s.map || "field", { kind: "boom", x, y: y - 6, r: R * 0.8, t: 0.45, life: 0.45, snd: "boom" });
    return;
  }
  if (!m) return;
  if (kit.poison) { m.poison = kit.poisonT; m.pdps = Math.max(m.pdps, kit.poison * 1.5 * heroDmgMul(g.heroes[s.pi] || { lv: 1 })); m.pby = s.pi; }
  if (kit.slow) m.slow = 2;
  if (kit.shred) { m.shred = kit.shredT; m.shredAmt = Math.max(m.shredAmt, kit.shred); }
  fx(g, m.map, { kind: "burst", x: m.x, y: m.y - 10, r: 18, color: kit.col || "#fff6dd", n: 6, t: 0.3, life: 0.3 });
  hitMob(g, s.pi, m, s.dmg, s.skill);
}

/* ── 큰 기술 ───────────────────────────────────────────── */
export function rpgSkill(g, pi) {
  const h = g.heroes[pi];
  if (!h || h.down > 0) return;
  const map = h.map;
  const id = CLASSES[pi].id;
  if (MAPS[map].safe) return say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
  if (h.sk > 0) return say(g, map, h.x, h.y - 90, `${RPG_SKILL[id].name} ${Math.ceil(h.sk)}초`, "#f0dcb4");
  const kit = kitOf(pi);
  const base = kit.dmg * heroDmgMul(h);
  const near = (r) => nearMobs(g, map, h.x, h.y, r);

  if (id === "supply") {
    g.heroes.forEach((q) => {
      if (!q || q.map !== map) return;
      q.hp = Math.min(q.max, q.hp + q.max * 0.4);
      q.buff = 8; q.buffAmt = 0.5;
      fx(g, map, { kind: "heal", x: q.x, y: q.y - 56, text: "보급", t: 1, life: 1 });
    });
    fx(g, map, { kind: "ring", x: h.x, y: h.y - 8, r: 220, color: kit.col, t: 0.8, life: 0.8, snd: "bless" });
  } else {
    const list = id === "sniper" ? nearMobs(g, map, h.x, h.y, 900).sort((a, b) => b.hp - a.hp).slice(0, 1) : near(300);
    if (!list.length) return say(g, map, h.x, h.y - 90, "닿는 토끼가 없다", "#d9c9a6");
    const hit = (m, mul) => hitMob(g, pi, m, base * mul, true);
    if (id === "archer") {
      list.forEach((m) => hit(m, 3.2));
      fx(g, map, { kind: "rain", x: h.x, y: h.y, r: 260, n: 26, color: kit.col, t: 0.9, life: 0.9 });
    } else if (id === "sniper") {
      const t = list[0];
      fx(g, map, { kind: "beam", x0: h.x, y0: h.y - 34, x1: t.x, y1: t.y - 10, color: kit.col, w: 12, t: 0.4, life: 0.4 });
      hit(t, 14);
    } else if (id === "cannon") {
      list.slice(0, 8).forEach((m, i) => g.hits.push({ t: 0.3 + i * 0.09, pi, mid: m.id, x: m.x, y: m.y, map, dmg: base * 2.4, mode: "bomb", kit, skill: 1 }));
    } else if (id === "bolt") {
      list.slice(0, 10).forEach((m) => {
        fx(g, map, { kind: "zap", x0: m.x, y0: m.y - 240, x1: m.x, y1: m.y - 8, color: "#fff0a8", t: 0.3, life: 0.3, snd: "zap" });
        hit(m, 3.2);
        if (!m.dead) m.stun = 1.5;
      });
    } else if (id === "flame") {
      list.forEach((m) => { m.burn = 6; m.bdps = Math.max(m.bdps, kit.burn * 2.4); m.bby = pi; hit(m, 2.2); });
      fx(g, map, { kind: "firering", x: h.x, y: h.y, r: 280, t: 0.8, life: 0.8, snd: "flame" });
    } else if (id === "poison") {
      list.forEach((m) => { m.poison = 6; m.pdps = Math.max(m.pdps, kit.poison * 2.6); m.pby = pi; hit(m, 0.8); });
      fx(g, map, { kind: "cloud", x: h.x, y: h.y - 8, r: 280, color: "rgba(168,222,110,0.85)", t: 1.1, life: 1.1 });
    } else if (id === "frost") {
      list.forEach((m) => { hit(m, 1.6); if (!m.dead) m.freeze = 3; });
      fx(g, map, { kind: "nova", x: h.x, y: h.y - 8, r: 300, color: "#bfe6ff", n: 16, t: 0.8, life: 0.8, snd: "ice" });
    } else if (id === "gravity") {
      list.forEach((m) => { m.x += (h.x - m.x) * 0.6; m.y += (h.y - m.y) * 0.6; hit(m, 2); if (!m.dead) m.stun = 2; });
      fx(g, map, { kind: "hole", x: h.x, y: h.y - 8, r: 240, color: kit.col, t: 1.1, life: 1.1, snd: "pull" });
    } else if (id === "corrode") {
      list.forEach((m) => { m.shred = 8; m.shredAmt = 0.4; hit(m, 1.6); });
      fx(g, map, { kind: "cloud", x: h.x, y: h.y - 8, r: 280, color: "rgba(120,213,191,0.8)", t: 1, life: 1 });
    } else if (id === "paladin") {
      list.forEach((m) => hit(m, 4));
      g.heroes.forEach((q) => { if (q && q.map === map && dist(h.x, h.y, q.x, q.y) < 320) { q.guard = 6; q.hp = Math.min(q.max, q.hp + q.max * 0.2); } });
      fx(g, map, { kind: "sigil", x: h.x, y: h.y - 6, r: 180, color: "#ffeec2", t: 1, life: 1, snd: "bless" });
    }
  }
  h.sk = RPG.skillCd;
  h.swing = 0.4;
  fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: RPG_SKILL[id].name, color: "#ffd873", t: 0.9, life: 0.9, snd: "crit" });
}

/* ── 한 걸음 ───────────────────────────────────────────── */
function stepHeroes(g, dt) {
  g.heroes.forEach((h) => {
    if (!h) return;
    h.flash = Math.max(0, h.flash - dt);
    h.swing = Math.max(0, h.swing - dt);
    h.buff = Math.max(0, h.buff - dt);
    h.guard = Math.max(0, h.guard - dt);
    h.numT = Math.max(0, h.numT - dt);
    h.gateCd = Math.max(0, h.gateCd - dt);
    if (h.down > 0) {
      h.down -= dt;
      if (h.down <= 0) {                          // 광장에서 다시 일어난다
        h.down = 0;
        h.map = "plaza";
        [h.x, h.y] = MAPS.plaza.spawn;
        h.hp = h.max;
        fx(g, "plaza", { kind: "heal", x: h.x, y: h.y - 56, text: "다시 일어남", t: 0.9, life: 0.9, snd: "bless", who: h.pi });
      }
      return;
    }
    h.calm += dt;
    if (h.calm >= RPG.calm) h.hp = Math.min(h.max, h.hp + h.max * RPG.calmRegen * dt);
    rpgWalk(h, dt);

    // 문에 들어서면 반대쪽 맵으로 옮겨 간다
    if (h.gateCd <= 0) {
      const gate = MAPS[h.map].gates.find((q) => dist(h.x, h.y, q.x, q.y) <= q.r);
      if (gate) {
        h.map = gate.to;
        [h.x, h.y] = gate.at;
        h.gateCd = 1;
        fx(g, h.map, { kind: "ring", x: h.x, y: h.y - 10, r: 50, color: "#bfe6ff", t: 0.5, life: 0.5 });
      }
    }

    h.sk = Math.max(0, h.sk - dt);
    h.cd = Math.max(0, h.cd - dt);
    if (h.cd > 0 || MAPS[h.map].safe) return;
    if (heroAttack(g, h)) { h.cd = heroCd(h); h.swing = 0.25; }
  });
}

function nearestHero(g, m, range) {
  let best = null, bd = range;
  g.heroes.forEach((h) => {
    if (!h || h.down > 0 || h.map !== m.map) return;
    const d = dist(m.x, m.y, h.x, h.y);
    if (d < bd) { bd = d; best = h; }
  });
  return best;
}

function stepRabbit(g, m, dt) {
  m.age += dt;
  m.flash = Math.max(0, m.flash - dt);
  m.slow = Math.max(0, m.slow - dt);
  m.freeze = Math.max(0, m.freeze - dt);
  m.stun = Math.max(0, m.stun - dt);
  m.shred = Math.max(0, m.shred - dt);
  m.numT = Math.max(0, m.numT - dt);
  m.bumpCd = Math.max(0, m.bumpCd - dt);
  if (m.numT <= 0 && m.numAcc > 0) flushNum(g, m);
  if (m.burn > 0 || m.poison > 0) {              // 불과 독은 0.5초마다 한 번씩 깎는다
    m.dotT -= dt;
    if (m.dotT <= 0) {
      m.dotT = 0.5;
      if (m.burn > 0) hitMob(g, m.bby, m, m.bdps * 0.5);
      if (!m.dead && m.poison > 0) hitMob(g, m.pby, m, m.pdps * 0.5);
      if (m.dead) return;
    }
    m.burn = Math.max(0, m.burn - dt);
    m.poison = Math.max(0, m.poison - dt);
  }
  if (m.freeze > 0 || m.stun > 0) { m.moving = 0; return; }

  const spd = m.slow > 0 ? 0.5 : 1;
  if (m.state !== "idle") {
    m.x += m.vx * spd * dt;
    m.y += m.vy * spd * RPG.squash * dt;
    if (Math.abs(m.vx) > 1) m.ax = m.vx < 0 ? -1 : 1;
  }
  // 들이받기 — 닿으면 조금 아프고 튕겨 나온다
  if (m.state === "charge") {
    const tg = g.heroes[m.tgt];
    if (tg && tg.map === m.map && tg.down <= 0 && dist(m.x, m.y, tg.x, tg.y) < 26) {
      hurtHero(g, tg, RABBIT.bump);
      fx(g, m.map, { kind: "burst", x: tg.x, y: tg.y - 24, r: 16, color: "#ffd7c2", n: 5, t: 0.25, life: 0.25 });
      m.bumpCd = 3.5;
      m.state = "flee"; m.t = 0.5; m.vx = -m.vx * 0.6; m.vy = -m.vy * 0.6;
    }
  }
  m.t -= dt;
  if (m.t <= 0) {
    const near = m.bumpCd <= 0 ? nearestHero(g, m, 130) : null;
    if (near && Math.random() < 0.3) {
      const dx = near.x - m.x, dy = (near.y - m.y) / RPG.squash;
      const len = Math.hypot(dx, dy) || 1;
      m.state = "charge"; m.t = 0.7; m.tgt = near.pi;
      m.vx = (dx / len) * 240; m.vy = (dy / len) * 240;
    } else if (m.state === "idle") {
      const a = Math.random() * Math.PI * 2, v = 110 + Math.random() * 40;
      m.state = "hop"; m.t = 0.35 + Math.random() * 0.4;
      m.vx = Math.cos(a) * v; m.vy = Math.sin(a) * v;
    } else {
      m.state = "idle"; m.t = 0.6 + Math.random() * 1.6; m.vx = 0; m.vy = 0;
    }
  }
  m.moving = m.state !== "idle" ? 1 : 0;
  const M = MAPS[m.map];
  const bx = clamp(m.x, RPG.edge + 20, M.w - RPG.edge - 20), by = clamp(m.y, M.top + 10, M.h - RPG.edge);
  if (bx !== m.x) m.vx = -m.vx;
  if (by !== m.y) m.vy = -m.vy;
  m.x = bx; m.y = by;
}

export function rpgStep(g, dt) {
  g.t += dt;
  g.shake = Math.max(0, g.shake - dt * 1.6);
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.fx = g.fx.filter((f) => { f.t -= dt; return f.t > 0; });

  stepHeroes(g, dt);
  g.hits = g.hits.filter((s) => {
    s.t -= dt;
    if (s.t > 0) return true;
    landHit(g, s);
    return false;
  });
  g.mobs.forEach((m) => { if (!m.dead) stepRabbit(g, m, dt); });
  g.mobs = g.mobs.filter((m) => !m.dead);

  // 한 마리가 죽으면 한 마리 — 열다섯 마리를 넘지 않는다
  g.respawn = g.respawn.filter((r) => {
    r.t -= dt;
    if (r.t > 0) return true;
    if (g.mobs.length < MAPS.field.rabbits) spawnRabbit(g);
    return false;
  });
  const owed = MAPS.field.rabbits - g.mobs.length - g.respawn.length;
  for (let i = 0; i < owed; i++) g.respawn.push({ t: RABBIT.respawn });
}

/* ── 주고받기 ──────────────────────────────────────────── */
const mapIdx = (id) => Math.max(0, MAP_IDS.indexOf(id));

export function rpgPack(g) {
  return {
    h: g.heroes.map((h) => (h
      ? [Math.round(h.x), Math.round(h.y), h.dir, Math.round(h.hp), h.max, r1(h.down), h.lv, h.xp,
        r1(h.sk), h.swing > 0 ? 1 : 0, mapIdx(h.map), h.coins, h.quest.on ? 1 : 0, h.quest.n, h.kills,
        h.flash > 0 ? 1 : 0, h.loaded ? 1 : 0, h.buff > 0 ? 1 : 0, h.guard > 0 ? 1 : 0]
      : 0)),
    m: g.mobs.map((m) => [m.id, mapIdx(m.map), Math.round(m.x), Math.round(m.y), Math.round((m.hp / m.max) * 100),
      (m.freeze > 0 ? 1 : 0) | (m.slow > 0 ? 2 : 0) | (m.poison > 0 ? 4 : 0) | (m.burn > 0 ? 8 : 0)
        | (m.stun > 0 ? 16 : 0) | (m.shred > 0 ? 32 : 0) | (m.flash > 0 ? 64 : 0),
      m.ax < 0 ? 1 : 0, m.moving ? 1 : 0]),
  };
}

export function rpgApply(g, s) {
  s.h.forEach((row, pi) => {
    if (!row) { g.heroes[pi] = null; return; }
    const map = MAP_IDS[row[10]] || "plaza";
    let h = g.heroes[pi];
    if (!h) { h = g.heroes[pi] = makeHero(pi, map); h.x = row[0]; h.y = row[1]; }
    const mine = pi === g.mySeat;
    const moved = h.map !== map;
    h.map = map;
    h.tx = row[0]; h.ty = row[1];
    // 내 영웅은 내 화면에서 먼저 걷는다. 맵을 옮겼거나 크게 벌어졌을 때만 맞춘다.
    if (moved || (mine && Math.hypot(row[0] - h.x, row[1] - h.y) > (h.hold.length ? 140 : 70))) {
      h.x = row[0]; h.y = row[1];
    }
    if (!mine) h.dir = row[2];
    h.hp = row[3]; h.max = row[4]; h.down = row[5]; h.lv = row[6]; h.xp = row[7]; h.sk = row[8];
    if (row[9]) h.swing = Math.max(h.swing, 0.2);
    h.coins = row[11]; h.quest = { on: !!row[12], n: row[13] }; h.kills = row[14];
    if (row[15]) h.flash = 0.15;
    h.loaded = row[16]; h.buff = row[17] ? 0.3 : 0; h.guard = row[18] ? 0.3 : 0;
  });
  const seen = new Set();
  s.m.forEach(([id, mi, x, y, pct, flags, flip, moving]) => {
    seen.add(id);
    let m = g.mobs.find((q) => q.id === id);
    if (!m) {
      m = { id, type: "rabbit", map: MAP_IDS[mi] || "field", x, y, ax: 1, hp: 100, max: 100, age: 0, rad: RABBIT.rad };
      g.mobs.push(m);
    }
    m.tx = x; m.ty = y;
    if (Math.hypot(x - m.x, y - m.y) > 160) { m.x = x; m.y = y; }
    m.hp = pct; m.max = 100;
    m.freeze = flags & 1 ? 0.3 : 0; m.slow = flags & 2 ? 0.3 : 0; m.poison = flags & 4 ? 0.3 : 0;
    m.burn = flags & 8 ? 0.3 : 0; m.stun = flags & 16 ? 0.3 : 0; m.shred = flags & 32 ? 0.3 : 0;
    if (flags & 64) m.flash = 0.1;
    m.ax = flip ? -1 : 1;
    m.moving = moving;
  });
  g.mobs = g.mobs.filter((m) => seen.has(m.id));
}

export function rpgApplyOut(g, list) {
  list.forEach((o) => {
    if (o.k === "fx") {
      const item = { ...o };
      delete item.k;
      g.fx.push(item);
    } else if (o.k === "banner") {
      g.banner = { text: o.text, sub: o.sub, tone: o.tone, t: o.t, life: o.life };
    }
  });
}

// 손님 화면 — 소식 사이를 메운다
export function rpgStepVisual(g, dt) {
  g.t += dt;
  g.shake = Math.max(0, g.shake - dt * 1.6);
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.fx = g.fx.filter((f) => { f.t -= dt; return f.t > 0; });
  const k = Math.min(1, dt * 10);
  g.heroes.forEach((h) => {
    if (!h) return;
    h.swing = Math.max(0, h.swing - dt);
    h.flash = Math.max(0, h.flash - dt);
    if (h.tx === undefined) return;
    if (h.pi === g.mySeat) {
      if (h.down <= 0 && h.hold.length) rpgWalk(h, dt);
      else { h.x += (h.tx - h.x) * k * 0.5; h.y += (h.ty - h.y) * k * 0.5; }
    } else {
      const dx = h.tx - h.x;
      if (Math.abs(dx) > 1) h.dir = dx < 0 ? -1 : 1;
      h.x += dx * k; h.y += (h.ty - h.y) * k;
    }
  });
  g.mobs.forEach((m) => {
    m.age += dt;
    m.flash = Math.max(0, (m.flash || 0) - dt);
    if (m.tx !== undefined) { m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; }
  });
}
