/* ── RPG 모드 ──────────────────────────────────────────────
   탑을 짓지 않는다. 고른 병과의 영웅이 직접 들판을 누빈다.
   몰려오는 괴물을 잡아 경험치를 모으고, 레벨이 오르면 카드 한 장을 고른다.
   다섯째 라운드엔 오우거 지휘관, 열째 라운드엔 대군주가 나온다.

   판정은 방어전과 같이 방장 한 명이 하고, 나머지는 받은 상태를 그린다.
   이번 판의 레벨과 카드는 판이 끝나면 사라진다.
   대신 번 경험치가 영웅 레벨로 쌓여 각자의 기기에 남고, 다음 판에도 이어진다. */
import { W, H, CX, P, CLASSES, ENEMY, ETYPES, ARENA_KIT, ARENA_ART, DIFFS, DEFAULT_DIFF } from "./world.js";

export const RPG_CREW_MAX = 8;
export const RPG_ROUNDS = 10;

export const RPG = {
  left: 60, right: W - 60, top: 150, bottom: H - 40,   // 걸어 다닐 수 있는 들판
  squash: 0.78,          // 비스듬히 내려다보는 들판이라 위아래 거리는 좁게 센다
  spd: 250,              // 영웅이 걷는 속도
  heroHp: 190,
  calm: 2.5,             // 이만큼 맞지 않고 버티면 체력이 저절로 차오른다
  calmRegen: 0.02,       // 그때 초당 차오르는 몫 (최대 체력 대비)
  rangeMul: 1.6,         // 결전장과 같이 탑 사거리보다 넓게 쓴다
  skillCd: 20,
  revive: 10,            // 쓰러진 뒤 다시 일어나기까지
  reviveWear: 4,         // 두 번째부터는 이만큼씩 더 누워 있는다
  reviveMax: 26,
  helpR: 90,             // 쓰러진 동료 곁에 서 있으면
  helpMul: 3,            // 이만큼 빨리 일어난다
  reviveHp: 0.5,
  intro: 3.2,
  rest: 4,               // 라운드 사이 숨 고르기
  restHeal: 0.25,
};

/* 괴물 — 그림과 기본 체력은 방어전의 적을 그대로 쓰고, 들판에 맞게 배수만 둔다 */
const MOB = {
  grunt:  { hp: 2.0, dmg: 10, atk: 1.0, xp: 3,   spd: 1.7 },
  rusher: { hp: 2.2, dmg: 7,  atk: 0.8, xp: 2,   spd: 1.2 },
  armor:  { hp: 2.2, dmg: 16, atk: 1.4, xp: 6,   spd: 1.5 },
  boss:   { hp: 3.8, dmg: 21, atk: 2.0, xp: 50,  spd: 2.2, slam: 52, slamR: 130, every: 5.5, call: "rusher", calls: 3, callT: 14 },
  titan:  { hp: 3.0, dmg: 32, atk: 2.0, xp: 120, spd: 2.4, slam: 78, slamR: 165, every: 5,   call: "grunt",  calls: 5, callT: 12 },
};
const SLAM_TELL = 1.25;
const BOSS_ROUND = { 5: "boss", 10: "titan" };

// 병과마다 버티는 몫 — 붙어서 싸우는 성기사가 가장 튼튼하다
const CLASS_HP = { paladin: 1.35, supply: 1.1, sniper: 0.85 };
const SUPPLY_SHOT = 60;          // 보급소도 혼자 남으면 싸울 수는 있어야 한다

/* 이번 판에서만 쌓이는 카드. cap 은 몇 장까지 겹칠 수 있는지 */
export const RPG_CARDS = [
  { id: "power", name: "힘의 문장",   note: "공격력 +20%" },
  { id: "haste", name: "날랜 손",     note: "공격 속도 +15%" },
  { id: "reach", name: "매의 눈",     note: "사거리 +15%", cap: 4 },
  { id: "vital", name: "강철 심장",   note: "최대 체력 +20% · 늘어난 만큼 회복" },
  { id: "swift", name: "바람 발걸음", note: "이동 속도 +10%", cap: 4 },
  { id: "crit",  name: "급소 찌르기", note: "치명타 확률 +10%", cap: 5 },
  { id: "leech", name: "피의 갈증",   note: "준 피해의 3%만큼 회복", cap: 4 },
  { id: "regen", name: "재생의 문장", note: "초당 최대 체력 1% 회복", cap: 4 },
  { id: "focus", name: "빠른 준비",   note: "스킬 대기 시간 -20%", cap: 3 },
  { id: "multi", name: "갈래 공격",   note: "공격이 적 하나를 더 맞힌다", cap: 3 },
  { id: "wis",   name: "배움의 서",   note: "얻는 경험치 +20%", cap: 4 },
];
const CARD_BY_ID = Object.fromEntries(RPG_CARDS.map((c) => [c.id, c]));

/* 병과마다 쓰는 큰 기술 */
export const RPG_SKILL = {
  archer:  { name: "화살비",    note: "주변 모든 적에게 화살을 퍼붓는다" },
  sniper:  { name: "결정타",    note: "들판에서 가장 단단한 적을 꿰뚫는다" },
  cannon:  { name: "융단 폭격", note: "주변 적 여덟에게 포탄이 떨어진다" },
  bolt:    { name: "뇌우",      note: "주변 적 열에게 벼락 · 1.5초 기절" },
  flame:   { name: "화염 폭풍", note: "주변 모든 적이 크게 불탄다" },
  poison:  { name: "역병",      note: "주변 모든 적이 6초간 병든다" },
  frost:   { name: "한파",      note: "주변 모든 적이 3초간 얼어붙는다" },
  gravity: { name: "블랙홀",    note: "주변 적을 끌어모으고 2초 기절" },
  supply:  { name: "긴급 보급", note: "모든 아군 회복 · 쓰러진 아군을 일으킨다" },
  corrode: { name: "산성비",    note: "주변 적이 받는 피해 +40% · 8초" },
  paladin: { name: "성역",      note: "주변 적을 베고 아군이 받는 피해를 줄인다" },
};

// 대기실에 적는 싸우는 방식
const STYLE = {
  shot: "멀리서 쏜다", bomb: "포탄 · 범위 피해", chain: "번개가 옮겨 붙는다", aura: "주변을 태운다",
  field: "중력장으로 끌어당긴다", melee: "붙어서 벤다 · 튼튼하다", aid: "아군 회복 · 공격력 강화",
};
export function rpgStyle(pi) {
  return STYLE[kitOf(pi).mode] || "";
}

const kitOf = (pi) => ARENA_KIT[(CLASSES[pi] || {}).id] || ARENA_KIT.archer;
const artOf = (pi) => ARENA_ART[(CLASSES[pi] || {}).id] || null;
const diffOf = (g) => DIFFS[g.diff] || DIFFS[DEFAULT_DIFF];
const crewOf = (g) => Math.max(1, g.seats.filter(Boolean).length);
// 사람이 많을수록 괴물도 많다. 혼자일 때는 조금 덜어 준다.
const CREW_MOBS = [0.75, 1.3, 1.75, 2.2, 2.6, 3.0, 3.4, 3.8];
const crewMul = (g) => CREW_MOBS[Math.min(CREW_MOBS.length, crewOf(g)) - 1];
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, (by - ay) / RPG.squash); }

/* ── 성장 ──────────────────────────────────────────────── */
export const needXp = (lv) => 10 + 7 * (lv - 1);        // 이번 판 레벨
export const heroNeed = (lv) => 100 + 60 * lv;           // 영웅 레벨 (다음 판에도 남는다)
export const HERO_MAX = 30;

const SAVE_KEY = "flg:rpg";
export function loadSave() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (v && v.v === 1 && v.heroes) return { best: {}, ...v };
  } catch { /* 망가진 기록은 새로 시작한다 */ }
  return { v: 1, heroes: {}, best: {}, done: [] };
}
function writeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 저장이 막혀 있으면 이번 판만 */ }
}
export function heroRecord(id, save = loadSave()) {
  const r = save.heroes[id];
  return { lv: clamp(Math.floor((r && r.lv) || 1), 1, HERO_MAX), xp: Math.max(0, (r && r.xp) || 0) };
}

/* 판이 끝나면 번 경험치를 영웅에게 쌓는다. 같은 판을 두 번 쌓지 않는다. */
export function commitRun({ runId, cls, gain, round, diffId, clear }) {
  const s = loadSave();
  const cur = heroRecord(cls, s);
  const before = cur.lv;
  // 같은 기기의 두 창에서 한 판을 함께 했을 수도 있으니, 판과 병과를 함께 본다
  const key = `${runId}:${cls}`;
  const done = Array.isArray(s.done) ? s.done : [];
  if (done.includes(key)) return { before, after: cur.lv, xp: cur.xp, need: heroNeed(cur.lv), dup: true };
  cur.xp += Math.max(0, Math.round(gain || 0));
  while (cur.lv < HERO_MAX && cur.xp >= heroNeed(cur.lv)) { cur.xp -= heroNeed(cur.lv); cur.lv += 1; }
  if (cur.lv >= HERO_MAX) cur.xp = 0;
  s.heroes[cls] = cur;
  s.done = [...done, key].slice(-20);
  const reach = clear ? RPG_ROUNDS : Math.max(0, round - 1);
  s.best[diffId] = Math.max(s.best[diffId] || 0, reach);
  writeSave(s);
  return { before, after: cur.lv, xp: cur.xp, need: heroNeed(cur.lv) };
}

/* ── 판 만들기 ─────────────────────────────────────────── */
export function makeRpg(seats, diff = DEFAULT_DIFF) {
  const g = {
    mode: "rpg", t: 0, phase: "intro", timer: RPG.intro,
    round: 0, rounds: RPG_ROUNDS, diff,
    seats: seats.slice(), names: [], mySeat: -1,
    heroes: [], mobs: [], hits: [], zones: [],
    fx: [], out: null, banner: null, shake: 0,
    queue: [], spawnT: 0, spawnGap: 1, nextId: 1,
    runId: Math.random().toString(36).slice(2, 10),
  };
  const crew = crewOf(g);
  const cy = (RPG.top + RPG.bottom) / 2 + 30;
  let k = 0;
  g.heroes = seats.map((on, pi) => {
    if (!on) return null;
    const a = (k / crew) * Math.PI * 2 - Math.PI / 2;
    const rr = crew > 1 ? 80 : 0;
    k += 1;
    return makeHero(pi, CX + Math.cos(a) * rr, cy + Math.sin(a) * rr * RPG.squash);
  });
  banner(g, "사냥 시작", `${RPG_ROUNDS}라운드 · 다섯째와 열째에 보스`, "#f3d27f");
  return g;
}

function makeHero(pi, x, y) {
  const h = {
    pi, x, y, dir: 1, hold: [], hp: 0, max: 0, down: 0,
    lv: 1, xp: 0, cd: 0.8, sk: RPG.skillCd * 0.4, swing: 0,
    cards: {}, offers: [], hlv: 1, kills: 0, dmg: 0, gain: 0,
    buff: 0, buffAmt: 0, guard: 0, flash: 0, numAcc: 0, numT: 0, calm: 0, downs: 0, help: 0,
  };
  refreshHp(h, true);
  return h;
}

const heroMaxHp = (h) => Math.round(RPG.heroHp * (CLASS_HP[CLASSES[h.pi].id] || 1)
  * (1 + 0.05 * (h.hlv - 1)) * (1 + 0.2 * (h.cards.vital || 0)));
function refreshHp(h, full) {
  const old = h.max;
  h.max = heroMaxHp(h);
  if (full) h.hp = h.max;
  else if (h.down <= 0) h.hp = Math.min(h.max, h.hp + Math.max(0, h.max - old));
}

/* 참가자가 알려 준 영웅 레벨 — 판이 막 시작했을 때만 체력을 꽉 채워 준다 */
export function rpgSetHero(g, pi, lv) {
  const h = g.heroes[pi];
  if (!h) return;
  h.hlv = clamp(Math.floor(Number(lv) || 1), 1, HERO_MAX);
  refreshHp(h, g.phase === "intro");
}

export const heroDmgMul = (h) => (1 + 0.04 * (h.hlv - 1)) * (1 + 0.2 * (h.cards.power || 0))
  * (h.buff > 0 ? 1 + h.buffAmt : 1);
export const heroRange = (h) => kitOf(h.pi).rng * RPG.rangeMul * (1 + 0.15 * (h.cards.reach || 0));
const heroCd = (h) => kitOf(h.pi).cd / (1 + 0.15 * (h.cards.haste || 0));
export const heroSkillCd = (h) => RPG.skillCd * Math.max(0.4, 1 - 0.2 * (h.cards.focus || 0));

/* ── 연출 ──────────────────────────────────────────────── */
function fx(g, item) {
  g.fx.push(item);
  if (g.out) g.out.push({ k: "fx", ...item });
}
function banner(g, text, sub, tone) {
  const b = { text, sub, tone, t: 2.6, life: 2.6 };
  g.banner = b;
  if (g.out) g.out.push({ k: "banner", ...b });
}
function say(g, x, y, text, color) {
  fx(g, { kind: "text", x, y, text, color, t: 0.9, life: 0.9 });
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
  const spd = RPG.spd * (1 + 0.1 * (h.cards.swift || 0));
  if (dx) h.dir = dx < 0 ? -1 : 1;
  h.x = clamp(h.x + (dx / len) * spd * dt, RPG.left, RPG.right);
  h.y = clamp(h.y + (dy / len) * spd * RPG.squash * dt, RPG.top, RPG.bottom);
}

export function rpgPick(g, pi, k) {
  const h = g.heroes[pi];
  if (!h || !h.offers.length) return;
  const id = h.offers[0][k];
  if (!CARD_BY_ID[id]) return;
  h.offers.shift();
  h.cards[id] = (h.cards[id] || 0) + 1;
  if (id === "vital") refreshHp(h, false);
  say(g, h.x, h.y - 96, CARD_BY_ID[id].name, P[h.pi].light);
}

function rollCards(h) {
  const pool = RPG_CARDS.filter((c) => (h.cards[c.id] || 0) < (c.cap || 8)).map((c) => c.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/* ── 괴물 ──────────────────────────────────────────────── */
function roundPlan(g, r) {
  const boss = BOSS_ROUND[r] || null;
  let n = Math.round((6 + 3 * r) * diffOf(g).count * crewMul(g));
  if (boss) n = Math.round(n * 0.55);
  const list = [];
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    list.push(r >= 3 && roll < 0.12 + 0.02 * r ? "armor" : r >= 2 && roll < 0.42 ? "rusher" : "grunt");
  }
  if (boss) list.splice(Math.floor(n * 0.2), 0, boss);
  return list;
}

// 들판 바깥 가장자리 — 보스는 늘 위쪽 가운데에서 걸어 들어온다
function edgeSpot(big) {
  if (big) return [CX + (Math.random() - 0.5) * 200, RPG.top - 60];
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return [RPG.left - 50, RPG.top + Math.random() * (RPG.bottom - RPG.top)];
  if (side === 1) return [RPG.right + 50, RPG.top + Math.random() * (RPG.bottom - RPG.top)];
  if (side === 2) return [RPG.left + Math.random() * (RPG.right - RPG.left), RPG.top - 50];
  return [RPG.left + Math.random() * (RPG.right - RPG.left), H + 30];
}

function spawnMob(g, type, at) {
  const base = ENEMY[type];
  const m = MOB[type];
  const D = diffOf(g);
  const r = Math.max(1, g.round);
  const big = type === "boss" || type === "titan";
  // 사람이 많으면 괴물 수만 늘지 않고 한 마리도 단단해진다. 보스는 사람 수만큼, 혼자일 때는 조금 덜어 준다.
  const crew = crewOf(g);
  const crewHp = big ? (crew === 1 ? 0.65 : 0.2 + 0.8 * crew) : 1 + 0.15 * (crew - 1);
  const hp = Math.round(base.hp * m.hp * (1 + 0.32 * (r - 1)) * D.hp * crewHp);
  const [x, y] = at || edgeSpot(big);
  const mob = {
    id: g.nextId++, type, x, y, ax: 1, hp, max: hp, big,
    spd: base.spd * m.spd * D.spd * (1 + 0.02 * (r - 1)),
    dmg: m.dmg * (1 + 0.12 * (r - 1)) * Math.pow(D.hp, 0.75),
    rad: base.r * 1.6, atkT: 0.6, age: 0, tgt: -1, tgtT: 0,
    slow: 0, slowAmt: 1, freeze: 0, stun: 0, burn: 0, bdps: 0, bby: -1,
    poison: 0, pdps: 0, pby: -1, shred: 0, shredAmt: 0, flash: 0,
    numAcc: 0, numT: 0, numCol: "#ffe9bd", dotT: 0.5,
    slamT: m.every || 0, callT: m.callT || 0, tell: 0,
  };
  g.mobs.push(mob);
  if (big) {
    g.shake = Math.max(g.shake, 0.5);
    fx(g, { kind: "ring", x: CX, y: RPG.top + 60, r: 220, color: type === "titan" ? "#ff7a6a" : "#ffb06a",
      t: 0.9, life: 0.9, snd: "boss" });
    banner(g, base.label, type === "titan" ? "땅이 흔들린다 — 붉은 자리를 피하세요" : "보스가 나타났다 — 붉은 자리를 피하세요",
      type === "titan" ? "#ff6f6f" : "#ff9f6a");
  }
  return mob;
}

function startRound(g, r) {
  g.round = r;
  g.phase = "fight";
  g.queue = roundPlan(g, r);
  g.spawnT = 0.4;
  g.spawnGap = (14 + 1.2 * r) / Math.max(1, g.queue.length);
  const boss = BOSS_ROUND[r];
  if (!boss) banner(g, `라운드 ${r}`, r === RPG_ROUNDS - 1 ? "다음은 대군주" : r === 4 ? "다음은 보스" : "", "#f3d27f");
  fx(g, { kind: "ring", x: CX, y: (RPG.top + RPG.bottom) / 2, r: 60, color: "#f3d27f", t: 0.4, life: 0.4, snd: "wave" });
}

const alive = (g) => g.mobs.filter((m) => !m.dead && onField(m));
// 화면 밖에서 걸어 들어오는 중인 적은 아직 겨누지 않는다
const onField = (m) => m.x > 8 && m.x < W - 8 && m.y > 80 && m.y < H - 4;
function nearMobs(g, x, y, range, n = Infinity) {
  const out = [];
  for (const m of g.mobs) {
    if (m.dead || !onField(m)) continue;
    const d = dist(x, y, m.x, m.y) - m.rad * 0.5;
    if (d <= range) out.push([d, m]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, n).map((o) => o[1]);
}

/* 맞은 숫자는 한 마리당 잠깐씩 모아서 띄운다 — 여럿이 한꺼번에 때려도 읽힌다 */
function flushNum(g, m, tier = 0) {
  if (!(m.numAcc > 0)) return;
  fx(g, { kind: "dmg", x: m.x + (Math.random() - 0.5) * 18, y: m.y - m.rad * 2 - 8,
    text: String(Math.round(m.numAcc)), color: m.numCol, t: 0.7, life: 0.7, tier });
  m.numAcc = 0;
  m.numT = 0.22;
}

function hitMob(g, pi, m, raw, skill) {
  if (!m || m.dead) return 0;
  const h = g.heroes[pi];
  let dmg = raw * (1 + (m.shred > 0 ? m.shredAmt : 0));
  const crit = h && Math.random() < 0.05 + 0.1 * (h.cards.crit || 0);
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  m.hp -= dmg;
  m.flash = 0.12;
  m.numAcc += dmg;
  m.numCol = crit ? "#ffd873" : P[pi] ? P[pi].light : "#ffe9bd";
  if (crit || skill || m.numT <= 0) flushNum(g, m, crit ? 2 : skill ? 1 : 0);
  if (h) {
    h.dmg += dmg;
    if (h.cards.leech && h.down <= 0) h.hp = Math.min(h.max, h.hp + dmg * 0.03 * h.cards.leech);
  }
  if (m.hp <= 0) killMob(g, m, pi);
  return dmg;
}

function killMob(g, m, pi) {
  if (m.dead) return;
  m.dead = true;
  m.hp = 0;
  flushNum(g, m, 1);
  const h = g.heroes[pi];
  if (h) h.kills += 1;
  fx(g, { kind: "poof", x: m.x, y: m.y - 6, t: 0.45, life: 0.45, color: "rgba(212,206,190,1)" });
  // 경험치는 다 같이 나눈다. 사람이 많을수록 괴물도 많으니, 한 판에 모이는 양은 비슷하게 맞춘다.
  const xp = MOB[m.type].xp * (1 + 0.08 * (g.round - 1)) / crewMul(g);
  g.heroes.forEach((q) => { if (q) giveXp(g, q, xp * (1 + 0.2 * (q.cards.wis || 0))); });
  if (m.big) {
    g.zones = g.zones.filter((z) => z.by !== m.id);
    g.shake = Math.max(g.shake, 0.6);
    fx(g, { kind: "boom", x: m.x, y: m.y, r: 140, t: 0.7, life: 0.7, snd: "boom" });
    banner(g, `${ENEMY[m.type].label} 쓰러짐`, h ? `마지막 일격 — ${g.names[pi] || CLASSES[pi].name}` : "", "#ffd873");
  }
}

function giveXp(g, h, amt) {
  h.xp += amt;
  h.gain += amt;
  while (h.xp >= needXp(h.lv)) {
    h.xp -= needXp(h.lv);
    h.lv += 1;
    if (h.offers.length < 9) h.offers.push(rollCards(h));
    if (h.down <= 0) h.hp = Math.min(h.max, h.hp + h.max * 0.15);
    fx(g, { kind: "nova", x: h.x, y: h.y - 10, r: 70, color: "#ffe08a", n: 10, t: 0.6, life: 0.6 });
    fx(g, { kind: "call", x: h.x, y: h.y - 118, text: `레벨 ${h.lv}!`, color: "#ffe08a", t: 0.9, life: 0.9,
      snd: h.pi === g.mySeat ? "build" : null });
  }
}

function hurtHero(g, h, raw) {
  if (!h || h.down > 0) return;
  const dmg = raw * (h.guard > 0 ? 0.5 : 1);
  h.hp -= dmg;
  h.flash = 0.18;
  h.calm = 0;
  h.numAcc += dmg;
  if (h.numT <= 0) {
    fx(g, { kind: "dmg", x: h.x, y: h.y - 100, text: `-${Math.round(h.numAcc)}`, color: "#ff9a8a", t: 0.6, life: 0.6 });
    h.numAcc = 0;
    h.numT = 0.3;
  }
  if (h.hp <= 0) {
    h.hp = 0;
    h.downs += 1;
    // 어려울수록, 자주 쓰러질수록 오래 누워 있는다
    const hard = [0.8, 1, 1.25, 1.5][g.diff] || 1;
    h.down = Math.min(RPG.reviveMax, RPG.revive * hard + RPG.reviveWear * (h.downs - 1));
    h.hold = [];
    fx(g, { kind: "burst", x: h.x, y: h.y - 30, r: 40, color: "#ff9a8a", n: 10, t: 0.5, life: 0.5 });
    say(g, h.x, h.y - 110, `${g.names[h.pi] || CLASSES[h.pi].name} 쓰러짐`, "#ffbdb2");
  }
}

function revive(g, h, frac) {
  h.down = 0;
  h.hp = Math.max(h.hp, h.max * frac);
  fx(g, { kind: "heal", x: h.x, y: h.y - 70, text: "다시 일어남", t: 0.9, life: 0.9, snd: "bless" });
}

/* ── 영웅의 공격 — 사거리 안의 적을 저절로 친다 ─────────────── */
function heroAttack(g, h) {
  const pi = h.pi;
  const kit = kitOf(pi);
  const ART = artOf(pi);
  const dmg = kit.dmg * heroDmgMul(h);
  const rng = heroRange(h);
  const many = 1 + (h.cards.multi || 0);
  const hy = h.y - 44;

  if (kit.mode === "aid") {
    let n = 0;
    g.heroes.forEach((q) => {
      if (!q || q.down > 0 || dist(h.x, h.y, q.x, q.y) > rng) return;
      q.buff = kit.buffT; q.buffAmt = kit.buff;
      if (q.hp < q.max) {
        const up = Math.round(Math.min(q.max - q.hp, q.max * 0.06));
        q.hp += up;
        if (up > 0 && q !== h) fx(g, { kind: "heal", x: q.x, y: q.y - 70, text: `+${up}`, t: 0.8, life: 0.8 });
      }
      n += 1;
    });
    if (ART && n > 1) fx(g, { kind: "art", art: ART.ring, x: h.x, y: h.y - 4, r: ART.ringR, t: 0.6, life: 0.6 });
    // 혼자 남아도 싸울 수 있게, 가까운 적 둘에게 빛구슬을 날린다
    const list = nearMobs(g, h.x, h.y, rng, 1 + many);
    list.forEach((m) => {
      fx(g, { kind: "shot", x0: h.x, y0: hy, x1: m.x, y1: m.y - 14, style: "orb", color: kit.col, t: 0.2, life: 0.2 });
      g.hits.push({ t: 0.2, pi, mid: m.id, dmg: SUPPLY_SHOT * heroDmgMul(h), mode: "shot", kit: {} });
    });
    if (list.length) h.dir = list[0].x < h.x ? -1 : 1;
    return n > 1 || list.length > 0;
  }

  if (kit.mode === "aura") {                      // 화염 — 둘레를 통째로 태운다
    const list = nearMobs(g, h.x, h.y, rng);
    if (!list.length) return false;
    list.forEach((m) => {
      hitMob(g, pi, m, dmg * 0.75);
      m.burn = kit.burnT; m.bdps = Math.max(m.bdps, kit.burn * 0.7 * heroDmgMul(h)); m.bby = pi;
    });
    fx(g, { kind: "firering", x: h.x, y: h.y - 8, r: rng * 0.9, t: 0.5, life: 0.5, snd: "flame" });
    if (ART) fx(g, { kind: "art", art: ART.ring, x: h.x, y: h.y - 6, r: ART.ringR, t: 0.5, life: 0.5 });
    return true;
  }

  if (kit.mode === "melee") {                     // 성기사 — 둘레를 한 번에 벤다
    const list = nearMobs(g, h.x, h.y, rng);
    if (!list.length) return false;
    h.dir = list[0].x < h.x ? -1 : 1;
    list.forEach((m) => hitMob(g, pi, m, dmg));
    fx(g, { kind: "slash", x: h.x + h.dir * 40, y: h.y - 40, a: h.dir > 0 ? 0 : Math.PI,
      color: "rgba(255,246,226,0.95)", t: 0.24, life: 0.24, snd: "hit" });
    if (ART) fx(g, { kind: "art", art: ART.hit, x: h.x + h.dir * 50, y: h.y - 36, r: ART.hitR,
      flip: h.dir < 0 ? 1 : 0, t: 0.34, life: 0.34 });
    return true;
  }

  if (kit.mode === "chain") {                     // 번개 — 첫 적에서 가까운 적으로 옮겨 붙는다
    const [first] = nearMobs(g, h.x, h.y, rng, 1);
    if (!first) return false;
    h.dir = first.x < h.x ? -1 : 1;
    const hops = [first];
    let cur = first;
    while (hops.length < kit.chain + many - 1) {
      const next = nearMobs(g, cur.x, cur.y, 170).find((m) => !hops.includes(m));
      if (!next) break;
      hops.push(next);
      cur = next;
    }
    let x0 = h.x, y0 = hy, pow = dmg;
    hops.forEach((m, k) => {
      fx(g, { kind: "zap", x0, y0, x1: m.x, y1: m.y - 14, color: kit.col, t: 0.28, life: 0.28, snd: k === 0 ? "zap" : null });
      hitMob(g, pi, m, pow);
      x0 = m.x; y0 = m.y - 14; pow *= 0.8;
    });
    return true;
  }

  if (kit.mode === "field") {                     // 중력 — 한 자리에 모아 짓누른다
    const [t] = nearMobs(g, h.x, h.y, rng, 1);
    if (!t) return false;
    h.dir = t.x < h.x ? -1 : 1;
    const cx = t.x, cy = t.y;
    nearMobs(g, cx, cy, 120 + 25 * (many - 1)).forEach((m) => {
      if (!m.big) { m.x += (cx - m.x) * 0.35; m.y += (cy - m.y) * 0.35; }
      m.slow = 1.2; m.slowAmt = 0.5;
      hitMob(g, pi, m, dmg);
    });
    fx(g, { kind: "hole", x: cx, y: cy - 8, r: 130, color: kit.col, t: 0.7, life: 0.7, snd: "pull" });
    if (ART) fx(g, { kind: "art", art: ART.field, x: cx, y: cy - 24, r: ART.fieldR * 0.8, t: 0.7, life: 0.7 });
    return true;
  }

  // 날아가는 것 — 궁수·저격·대포·독·서리·부식
  const targets = kit.shot === "slug"
    ? nearMobs(g, h.x, h.y, rng).sort((a, b) => b.hp - a.hp).slice(0, many)   // 저격은 가장 단단한 적부터
    : nearMobs(g, h.x, h.y, rng, many);
  if (!targets.length) return false;
  h.dir = targets[0].x < h.x ? -1 : 1;
  targets.forEach((m) => {
    const fly = kit.fly || 0.2;
    if (kit.shot === "slug") {
      fx(g, { kind: "beam", x0: h.x + h.dir * 20, y0: hy, x1: m.x, y1: m.y - 14, color: kit.col, w: 7, t: 0.26, life: 0.26 });
    } else {
      fx(g, { kind: "shot", x0: h.x, y0: hy, x1: m.x, y1: m.y - 14, style: kit.shot || "arrow",
        art: ART ? ART.fly : 0, r: ART ? ART.flyR * 0.8 : 0, color: kit.col, t: fly, life: fly,
        snd: kit.mode === "bomb" ? "cannon" : "shot" });
    }
    g.hits.push({ t: fly, pi, mid: m.id, x: m.x, y: m.y, dmg, mode: kit.mode, kit });
  });
  return true;
}

// 날아간 것이 닿았다
function landHit(g, s) {
  let m = g.mobs.find((q) => q.id === s.mid && !q.dead);
  const kit = s.kit || {};
  const ART = artOf(s.pi);
  if (s.mode === "bomb") {
    const x = m ? m.x : s.x, y = m ? m.y : s.y;
    const R = (kit.splash || 90) * (s.skill ? 1.1 : 0.9);
    nearMobs(g, x, y, R).forEach((q) => hitMob(g, s.pi, q, s.dmg * (q === m ? 1 : 0.6), s.skill));
    fx(g, { kind: "boom", x, y: y - 6, r: R * 0.8, t: 0.45, life: 0.45, snd: "boom" });
    if (ART) fx(g, { kind: "art", art: ART.hit, x, y: y - 10, r: ART.hitR * 0.8, t: 0.45, life: 0.45 });
    return;
  }
  if (!m) return;
  hitMob(g, s.pi, m, s.dmg, s.skill);
  if (kit.poison) {                              // 독 — 맞은 자리 둘레로 번진다
    const pd = kit.poison * 1.5 * heroDmgMul(g.heroes[s.pi]);
    nearMobs(g, m.x, m.y, 70).forEach((q) => { q.poison = kit.poisonT; q.pdps = Math.max(q.pdps, pd); q.pby = s.pi; });
    fx(g, { kind: "cloud", x: m.x, y: m.y - 8, r: 70, color: "rgba(168,222,110,0.8)", t: 0.6, life: 0.6 });
  }
  if (kit.slow) { m.slow = 2; m.slowAmt = 0.5; }
  if (kit.shred) { m.shred = kit.shredT; m.shredAmt = Math.max(m.shredAmt, kit.shred); }
  if (ART && ART.hit) {
    fx(g, { kind: "art", art: ART.hit, x: m.x, y: m.y - 16, r: ART.hitR * 0.6,
      flip: Math.random() < 0.5 ? 1 : 0, t: 0.4, life: 0.4 });
  } else {
    fx(g, { kind: "burst", x: m.x, y: m.y - 16, r: 22, color: kit.col, n: 6, t: 0.3, life: 0.3 });
  }
}

/* ── 큰 기술 ───────────────────────────────────────────── */
export function rpgSkill(g, pi) {
  const h = g.heroes[pi];
  if (!h || h.down > 0) return;
  if (g.phase !== "fight" && g.phase !== "rest") return;
  if (h.sk > 0) return say(g, h.x, h.y - 110, `${RPG_SKILL[CLASSES[pi].id].name} ${Math.ceil(h.sk)}초`, "#f0dcb4");
  const id = CLASSES[pi].id;
  const kit = kitOf(pi);
  const ART = artOf(pi);
  const mul = heroDmgMul(h);
  const base = kit.dmg * mul;
  const near = (r) => nearMobs(g, h.x, h.y, r);
  let used = true;

  // 닿는 적이 하나도 없으면 쓰지 않는다 — 보급만 아군에게 거는 것이라 예외다
  const reach = { archer: 330, flame: 290, poison: 330, frost: 310, gravity: 390, corrode: 330, paladin: 250 }[id];
  if (reach && !near(reach).length) used = false;
  else if (id === "archer") {
    const list = near(330);
    list.forEach((m) => hitMob(g, pi, m, base * 3.2, true));
    fx(g, { kind: "rain", x: h.x, y: h.y, r: 300, n: 30, color: kit.col, t: 0.9, life: 0.9 });
    if (ART) fx(g, { kind: "art", art: ART.cast, x: h.x, y: h.y - 30, r: ART.castR, t: 0.8, life: 0.8 });
  } else if (id === "sniper") {
    const t = alive(g).sort((a, b) => b.hp - a.hp)[0];
    if (!t) used = false;
    else {
      h.dir = t.x < h.x ? -1 : 1;
      fx(g, { kind: "beam", x0: h.x + h.dir * 20, y0: h.y - 44, x1: t.x, y1: t.y - 20, color: kit.col, w: 14, t: 0.4, life: 0.4 });
      if (ART) fx(g, { kind: "art", art: ART.cast, x: t.x, y: t.y - 20, r: ART.castR * 0.8, t: 0.75, life: 0.75 });
      hitMob(g, pi, t, base * 14, true);
    }
  } else if (id === "cannon") {
    const list = near(430).sort(() => Math.random() - 0.5).slice(0, 8);
    if (!list.length) used = false;
    list.forEach((m, i) => {
      g.hits.push({ t: 0.3 + i * 0.09, pi, mid: m.id, x: m.x, y: m.y, dmg: base * 2.4, mode: "bomb", kit, skill: 1 });
      if (ART) fx(g, { kind: "art", art: ART.rain, x: m.x, y: m.y - 10, r: ART.rainR, t: 0.3 + i * 0.09, life: 0.3 + i * 0.09 });
    });
  } else if (id === "bolt") {
    const list = near(430).slice(0, 10);
    if (!list.length) used = false;
    list.forEach((m) => {
      fx(g, { kind: "zap", x0: m.x + (Math.random() - 0.5) * 60, y0: m.y - 280, x1: m.x, y1: m.y - 10,
        color: "#fff0a8", t: 0.3, life: 0.3, snd: "zap" });
      hitMob(g, pi, m, base * 3.2, true);
      if (!m.dead) m.stun = Math.max(m.stun, m.big ? 0.6 : 1.5);
    });
  } else if (id === "flame") {
    near(290).forEach((m) => {
      hitMob(g, pi, m, base * 2.2, true);
      m.burn = 6; m.bdps = Math.max(m.bdps, kit.burn * 2.4 * mul); m.bby = pi;
    });
    fx(g, { kind: "firering", x: h.x, y: h.y, r: 290, t: 0.8, life: 0.8, snd: "flame" });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      fx(g, { kind: "flame", x: h.x + Math.cos(a) * 150, y: h.y + Math.sin(a) * 100, t: 0.6 + i * 0.06, life: 0.6 + i * 0.06 });
    }
  } else if (id === "poison") {
    near(330).forEach((m) => {
      hitMob(g, pi, m, base * 0.8, true);
      m.poison = 6; m.pdps = Math.max(m.pdps, kit.poison * 2.6 * mul); m.pby = pi;
    });
    fx(g, { kind: "cloud", x: h.x, y: h.y - 10, r: 300, color: "rgba(168,222,110,0.85)", t: 1.1, life: 1.1 });
    if (ART) fx(g, { kind: "art", art: ART.big, x: h.x, y: h.y - 20, r: ART.bigR * 1.4, t: 1, life: 1 });
  } else if (id === "frost") {
    near(310).forEach((m) => {
      hitMob(g, pi, m, base * 1.6, true);
      if (!m.dead) m.freeze = Math.max(m.freeze, m.big ? 1 : 3);
    });
    fx(g, { kind: "nova", x: h.x, y: h.y - 10, r: 310, color: "#bfe6ff", n: 16, t: 0.8, life: 0.8, snd: "ice" });
    if (ART) fx(g, { kind: "art", art: ART.big, x: h.x, y: h.y - 20, r: ART.bigR * 1.3, t: 0.9, life: 0.9 });
  } else if (id === "gravity") {
    const cx = h.x + h.dir * 90, cy = h.y;
    near(390).forEach((m) => {
      if (!m.big) { m.x += (cx - m.x) * 0.7; m.y += (cy - m.y) * 0.7; }
      hitMob(g, pi, m, base * 2, true);
      if (!m.dead) m.stun = Math.max(m.stun, m.big ? 0.8 : 2);
    });
    fx(g, { kind: "hole", x: cx, y: cy - 10, r: 260, color: kit.col, t: 1.1, life: 1.1, snd: "pull" });
    if (ART) fx(g, { kind: "art", art: ART.big, x: cx, y: cy - 20, r: ART.bigR * 1.3, t: 1.1, life: 1.1 });
  } else if (id === "supply") {
    g.heroes.forEach((q) => {
      if (!q) return;
      if (q.down > 0) revive(g, q, 0.5);
      q.hp = Math.min(q.max, q.hp + q.max * 0.4);
      q.buff = 8; q.buffAmt = 0.5;
      fx(g, { kind: "heal", x: q.x, y: q.y - 70, text: "보급", t: 1, life: 1 });
      if (ART) fx(g, { kind: "art", art: ART.bless, x: q.x, y: q.y - 2, r: ART.blessR, t: 0.9, life: 0.9 });
    });
    fx(g, { kind: "ring", x: h.x, y: h.y - 10, r: 260, color: kit.col, t: 0.8, life: 0.8, snd: "bless" });
  } else if (id === "corrode") {
    near(330).forEach((m) => {
      hitMob(g, pi, m, base * 1.6, true);
      m.shred = 8; m.shredAmt = Math.max(m.shredAmt, 0.4);
    });
    fx(g, { kind: "cloud", x: h.x, y: h.y - 10, r: 300, color: "rgba(120,213,191,0.8)", t: 1, life: 1 });
    if (ART) fx(g, { kind: "art", art: ART.big, x: h.x, y: h.y - 20, r: ART.bigR * 1.3, t: 1, life: 1 });
  } else if (id === "paladin") {
    near(250).forEach((m) => hitMob(g, pi, m, base * 4, true));
    g.heroes.forEach((q) => {
      if (!q || q.down > 0 || dist(h.x, h.y, q.x, q.y) > 330) return;
      q.guard = 6;
      q.hp = Math.min(q.max, q.hp + q.max * 0.2);
    });
    fx(g, { kind: "sigil", x: h.x, y: h.y - 6, r: 200, color: "#ffeec2", t: 1, life: 1, snd: "bless" });
    fx(g, { kind: "nova", x: h.x, y: h.y - 10, r: 250, color: "#ffeec2", n: 14, t: 0.8, life: 0.8 });
  }

  if (!used) return say(g, h.x, h.y - 110, "닿는 적이 없다", "#d9c9a6");
  h.sk = heroSkillCd(h);
  h.swing = 0.4;
  fx(g, { kind: "call", x: h.x, y: h.y - 132, text: RPG_SKILL[id].name, color: "#ffd873", t: 0.9, life: 0.9, snd: "crit" });
  g.shake = Math.max(g.shake, 0.25);
}

/* ── 한 걸음 ───────────────────────────────────────────── */
function stepHeroes(g, dt, fighting) {
  g.heroes.forEach((h) => {
    if (!h) return;
    h.flash = Math.max(0, h.flash - dt);
    h.swing = Math.max(0, h.swing - dt);
    h.buff = Math.max(0, h.buff - dt);
    h.guard = Math.max(0, h.guard - dt);
    h.numT = Math.max(0, h.numT - dt);
    if (h.down > 0) {
      // 동료가 곁에 서 있으면 빨리 일어난다
      const helped = g.heroes.some((q) => q && q !== h && q.down <= 0 && dist(q.x, q.y, h.x, h.y) <= RPG.helpR);
      h.help = helped ? 1 : 0;
      h.down -= dt * (helped ? RPG.helpMul : 1);
      if (h.down <= 0) revive(g, h, RPG.reviveHp);
      return;
    }
    h.calm += dt;
    const regen = 0.01 * (h.cards.regen || 0) + (h.calm >= RPG.calm ? RPG.calmRegen : 0);
    if (regen) h.hp = Math.min(h.max, h.hp + h.max * regen * dt);
    rpgWalk(h, dt);
    h.sk = Math.max(0, h.sk - dt);
    h.cd = Math.max(0, h.cd - dt);
    if (!fighting || h.cd > 0) return;
    // 결전장과 달리 들판에서는 걸으면서도 쏜다 — 떼로 몰려오는 적을 피하며 싸워야 해서다
    if (heroAttack(g, h)) { h.cd = heroCd(h); h.swing = 0.25; }
  });
}

function nearestHero(g, x, y) {
  let best = null, bd = Infinity;
  g.heroes.forEach((h) => {
    if (!h || h.down > 0) return;
    const d = dist(x, y, h.x, h.y);
    if (d < bd) { bd = d; best = h; }
  });
  return best;
}

function stepMobs(g, dt) {
  const list = g.mobs;
  for (const m of list) {
    if (m.dead) continue;
    m.age += dt;
    m.flash = Math.max(0, m.flash - dt);
    m.slow = Math.max(0, m.slow - dt);
    m.freeze = Math.max(0, m.freeze - dt);
    m.stun = Math.max(0, m.stun - dt);
    m.shred = Math.max(0, m.shred - dt);
    m.numT = Math.max(0, m.numT - dt);
    if (m.numT <= 0 && m.numAcc > 0) flushNum(g, m);
    // 불과 독은 0.5초마다 한 번씩 깎는다
    if (m.burn > 0 || m.poison > 0) {
      m.dotT -= dt;
      if (m.dotT <= 0) {
        m.dotT = 0.5;
        if (m.burn > 0) hitMob(g, m.bby, m, m.bdps * 0.5);
        if (!m.dead && m.poison > 0) hitMob(g, m.pby, m, m.pdps * 0.5);
        if (m.dead) continue;
      }
      m.burn = Math.max(0, m.burn - dt);
      m.poison = Math.max(0, m.poison - dt);
      if (m.burn <= 0) m.bdps = 0;
      if (m.poison <= 0) m.pdps = 0;
    }
    if (m.freeze > 0 || m.stun > 0) continue;
    const cfg = MOB[m.type];

    // 보스 — 붉은 자리를 띄웠다가 내리친다. 가끔은 졸개를 부른다.
    if (m.big) {
      if (m.tell > 0) { m.tell -= dt; continue; }
      m.slamT -= dt;
      m.callT -= dt;
      if (m.slamT <= 0) {
        const pool = g.heroes.filter((h) => h && h.down <= 0);
        const tg = pool[Math.floor(Math.random() * pool.length)];
        if (tg) {
          g.zones.push({ x: tg.x, y: tg.y, r: cfg.slamR, t: SLAM_TELL, t0: SLAM_TELL, dmg: cfg.slam * (m.dmg / cfg.dmg), by: m.id });
          m.tell = 0.5;
        }
        m.slamT = cfg.every * (0.85 + Math.random() * 0.3);
      }
      if (m.callT <= 0 && m.age > 4) {
        m.callT = cfg.callT;
        for (let i = 0; i < cfg.calls * Math.min(2, crewMul(g)); i++) {
          const a = Math.random() * Math.PI * 2;
          spawnMob(g, cfg.call, [m.x + Math.cos(a) * 90, m.y + Math.sin(a) * 60]);
        }
        fx(g, { kind: "ring", x: m.x, y: m.y, r: 120, color: "#ffb06a", t: 0.6, life: 0.6 });
        say(g, m.x, m.y - 130, "졸개를 부른다", "#ffb06a");
      }
    }

    m.tgtT -= dt;
    let tg = m.tgt >= 0 ? g.heroes[m.tgt] : null;
    if (m.tgtT <= 0 || !tg || tg.down > 0) {
      tg = nearestHero(g, m.x, m.y);
      m.tgt = tg ? tg.pi : -1;
      m.tgtT = 0.5;
    }
    const gx = tg ? tg.x : CX, gy = tg ? tg.y : (RPG.top + RPG.bottom) / 2;
    const d = dist(m.x, m.y, gx, gy);
    const reach = m.rad + 22;
    if (!tg || d > reach) {
      const spd = m.spd * (m.slow > 0 ? m.slowAmt : 1);
      const dx = gx - m.x, dy = (gy - m.y) / RPG.squash;
      const len = Math.hypot(dx, dy) || 1;
      m.x += (dx / len) * spd * dt;
      m.y += (dy / len) * spd * RPG.squash * dt;
      if (Math.abs(dx) > 2) m.ax = dx < 0 ? -1 : 1;
      m.atkT = Math.min(m.atkT, cfg.atk * 0.5);
    } else {
      m.atkT -= dt;
      if (m.atkT <= 0) {
        m.atkT = cfg.atk;
        hurtHero(g, tg, m.dmg);
        fx(g, { kind: "burst", x: tg.x + (m.x - tg.x) * 0.3, y: tg.y - 36, r: 18, color: "#ffd7c2", n: 5, t: 0.25, life: 0.25 });
      }
    }
  }

  // 서로 겹치지 않게 조금씩 밀어낸다 — 보스는 거의 밀리지 않는다
  const live = list.filter((m) => !m.dead);
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j];
      const dx = b.x - a.x, dy = (b.y - a.y) / RPG.squash;
      const min = (a.rad + b.rad) * 0.85;
      if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue;
      const d = Math.hypot(dx, dy);
      if (d >= min || d < 0.01) continue;
      const push = (min - d) / d;
      const wa = a.big ? 0.05 : b.big ? 0.95 : 0.5;
      a.x -= dx * push * wa; a.y -= dy * push * wa * RPG.squash;
      b.x += dx * push * (1 - wa); b.y += dy * push * (1 - wa) * RPG.squash;
    }
  }
  g.mobs = list.filter((m) => !m.dead);
}

function stepZones(g, dt) {
  g.zones = g.zones.filter((z) => {
    z.t -= dt;
    if (z.t > 0) return true;
    g.heroes.forEach((h) => { if (h && dist(z.x, z.y, h.x, h.y) <= z.r) hurtHero(g, h, z.dmg); });
    fx(g, { kind: "boom", x: z.x, y: z.y, r: z.r * 0.9, t: 0.5, life: 0.5, snd: "boom" });
    g.shake = Math.max(g.shake, 0.35);
    return false;
  });
}

export function rpgStep(g, dt) {
  g.t += dt;
  g.shake = Math.max(0, g.shake - dt * 1.6);
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.fx = g.fx.filter((f) => { f.t -= dt; return f.t > 0; });

  const fighting = g.phase === "fight" || g.phase === "rest";
  stepHeroes(g, dt, fighting);

  g.hits = g.hits.filter((s) => {
    s.t -= dt;
    if (s.t > 0) return true;
    landHit(g, s);
    return false;
  });

  if (g.phase === "intro") {
    g.timer -= dt;
    if (g.timer <= 0) startRound(g, 1);
    return;
  }
  if (g.phase === "clear" || g.phase === "over") return;

  stepMobs(g, dt);
  stepZones(g, dt);

  // 모두 쓰러지면 끝
  const crew = g.heroes.filter(Boolean);
  if (crew.length && crew.every((h) => h.down > 0)) {
    g.phase = "over";
    g.zones = [];
    banner(g, "전멸", `라운드 ${g.round}에서 쓰러졌습니다`, "#f09a90");
    fx(g, { kind: "ring", x: CX, y: (RPG.top + RPG.bottom) / 2, r: 60, color: "#f09a90", t: 0.4, life: 0.4, snd: "over" });
    return;
  }

  if (g.phase === "fight") {
    if (g.queue.length) {
      g.spawnT -= dt;
      if (g.spawnT <= 0) { spawnMob(g, g.queue.shift()); g.spawnT = g.spawnGap; }
    } else if (!g.mobs.length && !g.hits.length) {
      if (g.round >= g.rounds) {
        g.phase = "clear";
        banner(g, "사냥 완료", "열 라운드를 모두 버텼습니다", "#a9e79c");
        fx(g, { kind: "ring", x: CX, y: (RPG.top + RPG.bottom) / 2, r: 60, color: "#a9e79c", t: 0.4, life: 0.4, snd: "clear" });
      } else {
        g.phase = "rest";
        g.timer = RPG.rest;
        banner(g, `라운드 ${g.round} 완료`, "잠시 숨을 고릅니다 — 체력이 조금 돌아옵니다", "#a9e79c");
        g.heroes.forEach((h) => {
          if (!h) return;
          if (h.down > 0) revive(g, h, RPG.reviveHp);
          else h.hp = Math.min(h.max, h.hp + h.max * RPG.restHeal);
        });
      }
    }
  } else if (g.phase === "rest") {
    g.timer -= dt;
    if (g.timer <= 0) startRound(g, g.round + 1);
  }
}

/* ── 주고받기 ──────────────────────────────────────────── */
const cardIdx = (id) => RPG_CARDS.findIndex((c) => c.id === id);
const bossOf = (g) => g.mobs.find((m) => m.big && !m.dead) || null;

export function rpgPack(g) {
  const boss = bossOf(g);
  return {
    ph: g.phase, rd: g.round, tm: r1(Math.max(0, g.timer)), df: g.diff, rid: g.runId,
    lf: g.queue.length + g.mobs.length,
    h: g.heroes.map((h) => (h
      ? [Math.round(h.x), Math.round(h.y), h.dir, Math.round(h.hp), h.max, r1(Math.max(0, h.down)),
        h.lv, Math.round(h.xp * 10) / 10, r1(h.sk), h.swing > 0 ? 1 : 0, h.hlv, h.kills, Math.round(h.dmg),
        Math.round(h.gain), h.offers.length ? h.offers[0].map(cardIdx) : 0, h.offers.length,
        RPG_CARDS.map((c) => h.cards[c.id] || 0), h.buff > 0 ? 1 : 0, h.guard > 0 ? 1 : 0, h.flash > 0 ? 1 : 0,
        h.help ? 1 : 0]
      : 0)),
    m: g.mobs.map((m) => [m.id, ETYPES.indexOf(m.type), Math.round(m.x), Math.round(m.y),
      Math.round((m.hp / m.max) * 100),
      (m.freeze > 0 ? 1 : 0) | (m.slow > 0 ? 2 : 0) | (m.poison > 0 ? 4 : 0) | (m.burn > 0 ? 8 : 0)
        | (m.stun > 0 ? 16 : 0) | (m.shred > 0 ? 32 : 0) | (m.flash > 0 ? 64 : 0),
      m.ax < 0 ? 1 : 0]),
    z: g.zones.map((z) => [Math.round(z.x), Math.round(z.y), z.r, Math.round(z.t * 100) / 100, z.t0]),
    bs: boss ? [ETYPES.indexOf(boss.type), Math.round(boss.hp), boss.max] : 0,
  };
}

export function rpgApply(g, s) {
  g.phase = s.ph; g.round = s.rd; g.timer = s.tm; g.runId = s.rid; g.left = s.lf;
  if (typeof s.df === "number") g.diff = s.df;
  g.boss = s.bs ? { type: ETYPES[s.bs[0]], hp: s.bs[1], max: s.bs[2] } : null;
  s.h.forEach((row, pi) => {
    if (!row) { g.heroes[pi] = null; return; }
    let h = g.heroes[pi];
    if (!h) h = g.heroes[pi] = makeHero(pi, row[0], row[1]);
    const mine = pi === g.mySeat;
    h.tx = row[0]; h.ty = row[1];
    if (!mine) h.dir = row[2];
    // 내 영웅은 내 화면에서 먼저 걷는다. 누르고 있는 동안은 크게 벌어졌을 때만 맞추고,
    // 손을 떼면 방장 쪽 자리로 천천히 붙는다.
    if (mine) {
      const far = Math.hypot(row[0] - h.x, row[1] - h.y);
      if (far > (h.hold.length ? 140 : 70)) { h.x = row[0]; h.y = row[1]; }
    }
    h.hp = row[3]; h.max = row[4]; h.down = row[5]; h.lv = row[6]; h.xp = row[7]; h.sk = row[8];
    if (row[9]) h.swing = Math.max(h.swing, 0.2);
    h.hlv = row[10]; h.kills = row[11]; h.dmg = row[12]; h.gain = row[13];
    h.offer = row[14] ? row[14].map((i) => (RPG_CARDS[i] || {}).id).filter(Boolean) : null;
    h.pend = row[15];
    h.cards = {};
    (row[16] || []).forEach((n, i) => { if (n) h.cards[RPG_CARDS[i].id] = n; });
    h.buff = row[17] ? 0.3 : 0; h.guard = row[18] ? 0.3 : 0;
    if (row[19]) h.flash = 0.15;
    h.help = row[20] ? 1 : 0;
  });
  const seen = new Set();
  s.m.forEach(([id, ti, x, y, pct, flags, flip]) => {
    seen.add(id);
    let m = g.mobs.find((q) => q.id === id);
    if (!m) {
      const type = ETYPES[ti] || "grunt";
      m = { id, type, x, y, ax: 1, hp: 100, max: 100, age: 0, big: type === "boss" || type === "titan",
        rad: (ENEMY[type] || ENEMY.grunt).r * 1.6 };
      g.mobs.push(m);
    }
    m.tx = x; m.ty = y;
    if (Math.hypot(x - m.x, y - m.y) > 160) { m.x = x; m.y = y; }
    m.hp = pct; m.max = 100;
    m.freeze = flags & 1 ? 0.3 : 0; m.slow = flags & 2 ? 0.3 : 0; m.poison = flags & 4 ? 0.3 : 0;
    m.burn = flags & 8 ? 0.3 : 0; m.stun = flags & 16 ? 0.3 : 0; m.shred = flags & 32 ? 0.3 : 0;
    if (flags & 64) m.flash = 0.1;
    m.ax = flip ? -1 : 1;
  });
  g.mobs = g.mobs.filter((m) => seen.has(m.id));
  g.zones = s.z.map(([x, y, r, t, t0]) => ({ x, y, r, t, t0 }));
}

export function rpgApplyOut(g, list) {
  list.forEach((o) => {
    if (o.k === "fx") {
      const item = { ...o };
      delete item.k;
      g.fx.push(item);
      if (item.kind === "boom" && item.r >= 100) g.shake = Math.max(g.shake, 0.35);
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
    if (h.pi === g.mySeat && h.down <= 0 && g.phase !== "intro") {
      rpgWalk(h, dt);
      if (!h.hold.length && h.tx !== undefined) { h.x += (h.tx - h.x) * k * 0.4; h.y += (h.ty - h.y) * k * 0.4; }
    } else if (h.tx !== undefined) {
      if (h.pi === g.mySeat && h.hold.length === 0) { h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k; }
      else if (h.pi !== g.mySeat) {
        const dx = h.tx - h.x;
        if (Math.abs(dx) > 1) h.dir = dx < 0 ? -1 : 1;
        h.x += dx * k; h.y += (h.ty - h.y) * k;
      }
    }
  });
  g.mobs.forEach((m) => {
    m.age += dt;
    m.flash = Math.max(0, (m.flash || 0) - dt);
    if (m.tx !== undefined) { m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; }
  });
  g.zones.forEach((z) => { z.t = Math.max(0, z.t - dt); });
}
