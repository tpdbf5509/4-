/* ── RPG 모드 ──────────────────────────────────────────────
   처음 들어오면 이름을 정한다. 이름은 이 기기에 남고 다시 바꿀 수 없다.
   그다음 직업(전사 · 마법사 · 궁수) · 원소 · 성별을 고르고 광장에 선다. 광장의 사냥문을 지나면 사냥터다.
   사냥터에는 토끼가 늘 열다섯 마리 이하로 돌아다닌다. 한 마리가 죽으면 한 마리가 새로 나온다.
   토끼 한 마리는 경험치 1 · 1코인. 사냥꾼에게 받은 퀘스트로 다섯 마리를 잡으면 경험치 10 · 15코인.

   판정은 방장 한 명이 하고, 나머지는 받은 상태를 그린다.
   레벨 · 경험치 · 코인 · 퀘스트는 각자의 기기에 이름과 함께 남아 다음에 들어와도 이어진다. */
import { P, towerIdx } from "./world.js";
import { SHOPS, SKILLS as SHOP_SKILLS, SKILL_USE } from "./shopData.js";
import { newBag, cleanBag, extraStat, tickBuffs, packBuffs, applyBuffs } from "./shop.js";
import { BUILD } from "../net/version.js";
import { TITLES, TITLE_BY_ID, REC_IDS, PARTY } from "./socialData.js";

export const RPG_CREW_MAX = 16;
// RPG 서버 — 방 코드 없이 모두 서버 1에 모인다. 서버 1이 가득 차면 다음 서버로 넘어간다.
// (방 만들기 코드에는 숫자 1이 나오지 않아 이 이름과 겹치지 않는다)
export const RPG_SERVERS = ["RPG1", "RPG2", "RPG3", "RPG4", "RPG5"];

// 대쉬 — 모든 캐릭터의 기본 스킬(F). 누른 방향으로 dist 만큼 time 초에 달려 나가고, inv 초 동안 맞지 않는다
export const DASH = { dist: 230, time: 0.16, inv: 0.3, cd: 4 };
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

/* 맵 — 광장 · 토끼 사냥터 · 늑대 사냥터. 문에 들어서면 반대쪽 맵의 at 자리로 옮겨 간다.
   zone 은 몹이 나오는 가로 구간이다. 입구 쪽이 낮은 레벨, 끝으로 갈수록 높은 레벨이 나온다.
   bg 는 바탕 그림 이름, tile 은 그 그림이 덮는 가로 폭 — 맵이 더 넓으면 좌우로 뒤집어 이어 붙인다. */
export const MAPS = {
  plaza: {
    id: "plaza", name: "광장", w: 1800, h: 1200, top: 170, safe: true, spawn: [900, 820],
    gates: [{ x: 1690, y: 660, r: 64, to: "field", at: [240, 920], label: "사냥문" }],
    blocks: [{ x: 900, y: 620, r: 96 }, ...SHOPS.map((sh) => ({ x: sh.x, y: sh.y - 6, r: 48 }))],   // 가운데 분수 · 상점 노점
    // 상점 네 곳 — 자리와 이름은 shopData.js 의 SHOPS
    npcs: SHOPS.map((sh) => ({ id: `shop-${sh.id}`, shop: sh.id, name: sh.name, keeper: sh.keeper, x: sh.x, y: sh.y })),
  },
  field: {
    id: "field", name: "토끼 사냥터", w: 3800, h: 1700, top: 170, spawn: [240, 920], bg: "field", tile: 2600,
    gates: [
      { x: 90, y: 920, r: 64, to: "plaza", at: [1560, 700], label: "광장" },
      { x: 3700, y: 920, r: 64, to: "wolf", at: [260, 920], label: "늑대 사냥터 · 10~20레벨" },
    ],
    blocks: [],
    npcs: [{ id: "hunter", name: "사냥꾼", x: 430, y: 740 }],
    zone: [300, 3500],
    paths: [[[3760, 920], [3580, 920], [3420, 880], [3260, 900]]],   // 늑대 사냥터로 가는 흙길
  },
  wolf: {
    id: "wolf", name: "늑대 사냥터", w: 3600, h: 1700, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(16,34,22,0.32)",                  // 숲이 깊어 조금 어둡다
    gates: [
      { x: 90, y: 920, r: 64, to: "field", at: [3520, 920], label: "토끼 사냥터" },
      { x: 3510, y: 920, r: 64, to: "boar", at: [260, 920], label: "멧돼지 사냥터 · 20~50레벨" },
    ],
    blocks: [],
    npcs: [],
    zone: [520, 3300],
    paths: [[[3570, 920], [3400, 920], [3240, 880], [3080, 900]]],   // 멧돼지 사냥터로 가는 흙길
  },
  boar: {
    id: "boar", name: "멧돼지 사냥터", w: 4200, h: 1700, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(70,48,20,0.24)",                  // 메마른 흙빛 숲
    gates: [{ x: 90, y: 920, r: 64, to: "wolf", at: [3400, 920], label: "늑대 사냥터" }],
    blocks: [],
    npcs: [],
    zone: [520, 4050],
  },
};
const MAP_IDS = ["plaza", "field", "wolf", "boar"];

// 코인 벌이 — 몹 · 퀘스트가 주는 코인에 곱한다(상점이 생겨 30% 낮췄다). 1코인보다 적게 주지는 않는다
export const COIN_RATE = 0.7;
export const coinOf = (n) => Math.max(1, Math.round(n * COIN_RATE));
// 경험치 — 몹이 주는 경험치에 곱한다(레벨이 너무 빨리 올라 5배 줄였다). 1보다 적게 주지는 않는다. 퀘스트 경험치는 그대로
export const XP_RATE = 0.2;
export const xpOf = (n) => Math.max(1, Math.round(n * XP_RATE));
export const QUEST = { name: "토끼 사냥", need: 5, xp: 10, coin: coinOf(15) };
// 몹 자동 회복 — calm 초 동안 맞지 않으면 초당 최대 체력의 rate 만큼 차오른다
export const MOB_REGEN = { calm: 5, rate: 0.08 };

/* ── 몹 — 레벨이 오를수록 크고 단단하고 아프다 ─────────────────────
   토끼는 1~5레벨, 맞으면 달아나고 가끔 들이받는다. 대왕 토끼(보스)는 10레벨, 달아나지 않고 자주 들이받는다.
   늑대는 10~20레벨, 가까이 오면 쫓아와 문다. 우두머리 늑대(보스)는 25레벨, 둘레를 한꺼번에 문다.
   멧돼지는 20~50레벨, 쫓아와 들이받고 가까우면 몸을 낮췄다가 일직선으로 돌진한다. 멧돼지 왕(보스)은 55레벨.
   size 는 그리는 크기와 몸 반지름(rad)에 같이 곱한다. */
export const MOB = {
  rabbit: {
    name: "토끼", rad: 13,
    hp: (lv) => 40 + 20 * (lv - 1),               // 40 · 60 · 80 · 100 · 120
    dmg: (lv) => 3 + lv,                          // 들이받기 4 ~ 8
    xp: (lv) => 2 * lv, coin: (lv) => lv,
    size: (lv) => 0.85 + 0.1 * (lv - 1),          // 0.85 ~ 1.25
    boss: { name: "대왕 토끼", lv: 10, hp: 1500, dmg: 20, xp: 80, coin: 60, size: 2.1 },
  },
  wolf: {
    name: "늑대", rad: 22,
    hp: (lv) => 300 + 60 * (lv - 10),             // 300 ~ 900
    dmg: (lv) => 12 + 2 * (lv - 10),              // 한 번 물 때 12 ~ 32
    xp: (lv) => 2 * lv, coin: (lv) => lv,
    size: (lv) => 1 + 0.05 * (lv - 10),           // 1.0 ~ 1.5 — 토끼보다 훨씬 크다
    boss: { name: "우두머리 늑대", lv: 25, hp: 8000, dmg: 55, xp: 400, coin: 250, size: 2.1 },
  },
  boar: {
    name: "멧돼지", rad: 26,
    hp: (lv) => 900 + 80 * (lv - 20),             // 900 ~ 3,300
    dmg: (lv) => 30 + 2 * (lv - 20),              // 들이받기 30 ~ 90 (돌진은 BOAR.chargeMul 배)
    xp: (lv) => 2 * lv, coin: (lv) => lv,
    size: (lv) => 1.05 + 0.015 * (lv - 20),       // 1.05 ~ 1.5
    boss: { name: "멧돼지 왕", lv: 55, hp: 30000, dmg: 120, xp: 1500, coin: 800, size: 2 },
  },
};
// 멧돼지 돌진 — 이 거리 안에 들면 wind 초 몸을 낮췄다가 speed 로 time 초 달린다. 돌진에 맞으면 dmg × chargeMul
export const BOAR = { aggro: 270, chargeRange: 230, wind: 0.45, speed: 430, time: 0.7, rest: 1.1, cd: 3.6, chargeMul: 1.5, walk: 150 };
const MOB_TYPES = ["rabbit", "wolf", "boar"];
export const mobName = (m) => (m.boss ? MOB[m.type].boss.name : MOB[m.type].name);
export const mobSize = (type, lv, boss) => (boss ? MOB[type].boss.size : MOB[type].size(lv));

/* 무리 — 맵마다 나오는 몹과 수. 한 마리가 죽으면 respawn 초 뒤에 한 마리가 새로 나온다. */
export const SPAWNS = [
  { map: "field", type: "rabbit", n: 15, lv: [1, 5], respawn: 1.5 },
  { map: "field", type: "rabbit", boss: 1, n: 2, respawn: 5 },
  { map: "wolf", type: "wolf", n: 24, lv: [10, 20], respawn: 2 },
  { map: "wolf", type: "wolf", boss: 1, n: 2, respawn: 5 },
  { map: "boar", type: "boar", n: 22, lv: [20, 50], respawn: 2.5 },
  { map: "boar", type: "boar", boss: 1, n: 2, respawn: 8 },
];

/* ── 직업 — 싸우는 방식을 정한다 ──────────────────────────────
   hp 는 버티는 몫, rng 는 사거리(RPG.rangeMul 을 곱하기 전), splash 는 맞은 자리 둘레로 번지는 폭 */
export const JOBS = [
  { id: "warrior", name: "전사", weapon: "검", note: "붙어서 둘레를 한 번에 벤다 · 가장 튼튼하다",
    hp: 1.35, dmg: 34, cd: 0.55, rng: 72, skill: "회오리" },
  { id: "mage", name: "마법사", weapon: "지팡이", note: "원소 구슬을 쏜다 · 맞은 자리 둘레도 다친다",
    hp: 0.9, dmg: 44, cd: 1.1, rng: 134, splash: 70, fly: 0.24, skill: "폭발" },
  { id: "archer", name: "궁수", weapon: "활", note: "가장 멀리서 쏜다 · 한 마리를 노린다",
    hp: 0.85, dmg: 45, cd: 0.9, rng: 158, fly: 0.2, skill: "화살비" },
];
export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j]));

/* ── 원소 — 디펜스의 원소 탑 여섯에서 가져왔다. 색 · 효과 그림도 그 탑의 것을 쓴다.
   평타에는 약하게, 큰 기술에는 세게 실린다. */
const tint = (id) => P[towerIdx(id)];
export const ELEMS = [
  { id: "flame",   name: "화염", tower: "화염탑", hit: "태운다",          big: "크게 불태운다" },
  { id: "frost",   name: "서리", tower: "서리탑", hit: "느리게 한다",     big: "얼린다" },
  { id: "bolt",    name: "번개", tower: "번개탑", hit: "옆 토끼로 옮겨 붙는다", big: "기절시킨다" },
  { id: "poison",  name: "독",   tower: "독탑",   hit: "독을 스미게 한다", big: "짙은 독을 퍼뜨린다" },
  { id: "corrode", name: "부식", tower: "부식탑", hit: "더 아프게 맞게 한다", big: "크게 약하게 만든다" },
  { id: "gravity", name: "중력", tower: "중력탑", hit: "둘레 토끼를 끌어당긴다", big: "한곳에 모아 묶는다" },
].map((e) => ({ ...e, key: tint(e.id).key, light: tint(e.id).light, dark: tint(e.id).dark }));
export const ELEM_BY_ID = Object.fromEntries(ELEMS.map((e) => [e.id, e]));

export const GENDERS = [{ id: "m", name: "남" }, { id: "f", name: "여" }];
export const NAME_MAX = 8;

// 원소 효과 그림 — 날아가는 것 · 맞은 자국 · 큰 기술
const ELEM_ART = {
  flame:   { fly: "flame/fly",   hit: "flame/hit",     big: "flame/storm" },
  frost:   { fly: "frost/fly",   hit: "frost/hit",     big: "frost/big" },
  bolt:    { fly: "bolt/fly",    hit: "bolt/hit",      big: "bolt/storm" },
  poison:  { fly: "poison/fly",  hit: "poison/hit",    big: "poison/storm" },
  corrode: { fly: "corrode/fly", hit: "corrode/hit",   big: "corrode/storm" },
  gravity: { fly: null,          hit: "gravity/crush", big: "gravity/hole" },
};

/* 캐릭터 겉모습 — 이름 · 직업 · 원소 · 성별. 받은 값은 늘 이걸로 걸러 쓴다 */
export const cleanName = (v) => String(v || "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
export function cleanLook(d) {
  if (!d) return null;
  const name = cleanName(d.name);
  if (!name || !JOB_BY_ID[d.job] || !ELEM_BY_ID[d.elem] || !(d.gender === "m" || d.gender === "f")) return null;
  return { name, job: d.job, elem: d.elem, gender: d.gender };
}
const BASE_LOOK = { name: "", job: "warrior", elem: "flame", gender: "m" };
export const jobOf = (h) => JOB_BY_ID[h && h.job] || JOBS[0];
export const elemOf = (h) => ELEM_BY_ID[h && h.elem] || ELEMS[0];
export const skillName = (h) => `${elemOf(h).name} ${jobOf(h).skill}`;
// 캐릭터 그림 — public/assets/characters/rpg/<직업>-<성별>/<방향>.webp
export const heroArtPath = (h, view = "front") => `/assets/characters/rpg/${jobOf(h).id}-${h && h.gender === "f" ? "f" : "m"}/${view}.webp`;

const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, (by - ay) / RPG.squash); }

/* ── 성장 ──────────────────────────────────────────────── */
export const needXp = (lv) => 30 * lv;         // 1→2 는 30, 그다음부터 30씩 는다
export const LV_MAX = 100;

/* ── 스탯 — 레벨이 오를 때마다 2포인트, 처음 만들 때 2포인트를 받는다(1 → 100레벨까지 모두 200포인트).
   스탯 하나에는 100까지만 찍을 수 있어, 다섯 가운데 둘만 가득 채울 수 있다.
   물리력은 전사 · 궁수의 공격력, 마법력은 마법사의 공격력과 모든 직업의 화상 · 독 피해를 올린다. */
export const STAT_MAX = 100;
// 관리자 캐릭터 — 서버 표의 admin 칸이 켜진 캐릭터(이름 + 코드로 이어 하기 할 때 서버가 알려 준다).
// 레벨은 최고 레벨로 두고, 코인은 쓰는 대로 이만큼 다시 채운다(돈 무제한)
export const ADMIN = { coins: 99999999 };
export const STAT_PER_LV = 2;
export const STAT_START = 2;
export const CRIT_MAX = 0.8;          // 치명타 확률 전체 상한 — 장비가 붙어도 확정 치명타가 되지 않게
export const STATS = [
  { id: "str", name: "물리력", note: "전사 · 궁수 공격력", base: 10, per: 2, fmt: (v) => String(v) },
  { id: "int", name: "마법력", note: "마법사 공격력 · 화상 · 독 피해", base: 10, per: 2, fmt: (v) => String(v) },
  { id: "hp", name: "체력", note: "최대 체력 (직업 배율을 곱한다)", base: 100, per: 15, fmt: (v) => v.toLocaleString("ko-KR") },
  { id: "crit", name: "치명타 확률", note: "치명타가 터질 확률", base: 5, per: 0.5, fmt: (v) => `${r1(v)}%` },
  { id: "cdmg", name: "치명타 피해", note: "치명타가 터졌을 때 피해", base: 150, per: 1, fmt: (v) => `${v}%` },
];
export const STAT_IDS = STATS.map((t) => t.id);
const STAT_BY_ID = Object.fromEntries(STATS.map((t) => [t.id, t]));
export const noStats = () => Object.fromEntries(STAT_IDS.map((k) => [k, 0]));
// 이 레벨까지 받은 포인트
export const statEarned = (lv) => STAT_START + STAT_PER_LV * (clamp(Math.floor(lv || 1), 1, LV_MAX) - 1);
export const statSpent = (st) => STAT_IDS.reduce((n, k) => n + ((st && st[k]) || 0), 0);
export const statLeft = (h) => Math.max(0, statEarned(h.lv) - statSpent(h.st));
// 찍은 포인트에 따른 값 — 표의 기본값 + 포인트당 효과
export const statValue = (id, pts) => STAT_BY_ID[id].base + STAT_BY_ID[id].per * (pts || 0);
// 받은 값을 거른다 — 스탯마다 0~100, 모두 합쳐 받은 포인트를 넘지 않게
export function cleanStats(d, lv) {
  const st = noStats();
  let room = statEarned(lv);
  STAT_IDS.forEach((k) => {
    const v = clamp(Math.floor(Number(d && d[k]) || 0), 0, STAT_MAX);
    st[k] = Math.min(v, room);
    room -= st[k];
  });
  return st;
}

/* ── 칭호 · 기록 (socialData.js) ─────────────────────────── */
export const newRec = () => Object.fromEntries(REC_IDS.map((k) => [k, 0]));
export function cleanRec(d) {
  const r = newRec();
  REC_IDS.forEach((k) => { r[k] = Math.max(0, Math.floor(Number(d && d[k]) || 0)); });
  return r;
}
export const cleanTitles = (list) => (Array.isArray(list) ? [...new Set(list.filter((id) => TITLE_BY_ID[id]))] : []);
// 칭호 조건의 지금 값 — 레벨 · 코인은 캐릭터에서, 나머지는 기록에서
export const needNow = (h, k) => (k === "lv" ? h.lv : k === "coins" ? h.coins : (h.rec && h.rec[k]) || 0);
export const titleMet = (h, t) => Object.entries(t.need).every(([k, n]) => needNow(h, k) >= n);
export const titleName = (id) => (TITLE_BY_ID[id] ? TITLE_BY_ID[id].name : "");

/* 이 기기의 내 캐릭터 — 이름을 처음 한 번 정하고, 처음 게임을 시작할 때 직업 · 원소 · 성별을 정한다.
   넷 다 한 번 정하면 다시 바꿀 수 없다. */
const SAVE_KEY = "flg:rpg3";
function loadSave() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (v && v.v === 3 && cleanName(v.name)) return v;
  } catch { /* 망가진 기록은 새로 시작한다 */ }
  return null;
}
function store(v) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); return true; } catch { return false; }
}
// 저장된 캐릭터 — 없으면 null
export function loadChar() {
  const r = loadSave();
  if (!r) return null;
  const q = r.quest || {};
  const look = cleanLook({ ...BASE_LOOK, ...r, name: r.name }) || { ...BASE_LOOK, name: cleanName(r.name) };
  return {
    ...look,
    picked: !!r.picked,                          // 직업 · 원소 · 성별을 정했는지 — 정했으면 바꿀 수 없다
    lv: clamp(Math.floor(r.lv || 1), 1, LV_MAX),
    xp: Math.max(0, Math.floor(r.xp || 0)),
    coins: Math.max(0, Math.floor(r.coins || 0)),
    quest: { on: !!q.on, n: clamp(Math.floor(q.n || 0), 0, QUEST.need) },
    stats: cleanStats(r.stats, r.lv || 1),
    bag: cleanBag(r.bag),                        // 상점 — 무기 · 물약 · 스킬 · 오늘 쓴 횟수
    linked: !!r.linked,                          // 서버에 이 캐릭터가 있다(이름 + 코드로 이어 할 수 있다)
    tok: typeof r.tok === "string" ? r.tok : "", // 서버 입장권 — 없으면 서버에 저장하지 않는다(다른 기기가 나중에 들어왔다)
    admin: !!r.admin,                            // 관리자 — 서버가 알려 준 것만 쓴다
    rec: cleanRec(r.rec),                        // 잡은 수 · 퀘스트 수 — 칭호 조건
    titles: cleanTitles(r.titles),               // 얻은 칭호
    title: TITLE_BY_ID[r.title] ? r.title : "",  // 달고 있는 칭호
  };
}
// 이름을 정한다 — 이미 정해 둔 이름이 있으면 그대로 둔다. acct 는 서버에 만든 계정 { tok }
export function makeChar(name, acct) {
  const cur = loadSave();
  if (cur) return loadChar();
  const n = cleanName(name);
  if (!n) return null;
  store({ v: 3, name: n, lv: 1, xp: 0, coins: 0, quest: { on: false, n: 0 }, ...(acct ? { linked: 1, tok: acct.tok } : {}) });
  return loadChar();
}

/* ── 서버 계정 — 이름 + 코드 (src/net/rpgSave.js) ─────────────────── */
// 서버에 올리는 기록 — 입장권 · 연결 표시는 빼고 보낸다
export function charRecord() {
  const r = loadSave();
  if (!r) return null;
  const { tok: _tok, linked: _linked, admin: _admin, ...data } = r;
  return data;
}
// 서버 연결 상태를 바꾼다 — 코드를 정했거나(linked · tok), 다른 기기에 밀렸을 때(tok 비움)
export function setAccount(patch) {
  const cur = loadSave();
  if (!cur) return false;
  const next = { ...cur, ...patch };
  if (patch.name) next.name = cleanName(patch.name);
  if (patch.linked !== undefined) next.linked = patch.linked ? 1 : 0;
  return store(next);
}
// 서버에서 불러온 캐릭터로 이 기기의 기록을 바꾼다
export function adoptChar(name, data, tok, admin) {
  const n = cleanName(name);
  if (!n || !data || typeof data !== "object") return null;
  const { tok: _tok, linked: _linked, admin: _admin, ...rest } = data;
  if (!store({ ...rest, v: 3, name: n, linked: 1, tok, admin: admin ? 1 : 0 })) return null;
  return loadChar();
}
// 직업 · 원소 · 성별을 정한다 — 이미 정해 두었으면 그대로 두고 false. 관리자 캐릭터는 언제든 다시 정한다
export function saveLook(d) {
  const cur = loadSave();
  if (!cur || (cur.picked && !cur.admin)) return false;
  return store({ ...cur, job: d.job, elem: d.elem, gender: d.gender, picked: 1 });
}
// 캐릭터를 지운다 — 이름 · 직업 · 원소 · 성별과 레벨 · 코인까지 모두 사라진다
export function deleteChar() {
  try { localStorage.removeItem(SAVE_KEY); return true; } catch { return false; }
}
// 레벨 · 경험치 · 코인 · 퀘스트 · 스탯 · 가방 · 칭호 · 기록을 남긴다. 가방은 저장된 기록을 실은 뒤의 것만 남긴다.
export function writeChar(d) {
  const cur = loadSave();
  if (!cur) return;
  const bag = d.bag && d.bag.ld ? { ...d.bag, ld: undefined } : cur.bag;
  store({ ...cur, lv: d.lv, xp: d.xp, coins: d.coins, quest: { on: !!d.quest.on, n: d.quest.n }, stats: { ...d.st }, bag,
    rec: cleanRec(d.rec), titles: cleanTitles(d.titles), title: TITLE_BY_ID[d.title] ? d.title : "" });
}

/* ── 세계 ──────────────────────────────────────────────── */
export function makeWorld() {
  const g = {
    mode: "rpg", t: 0,
    heroes: new Array(RPG_CREW_MAX).fill(null), mobs: [], hits: [], respawn: [], pending: {},
    fx: [], out: null, banner: null, shake: 0, nextId: 1,
    looks: new Array(RPG_CREW_MAX).fill(null), names: [], mySeat: -1,
    notes: [],                                    // 상점 결과 — { who, ok, msg } 내 것만 화면에 띄운다
    bagRR: 0,                                     // 가방을 돌아가며 다시 보내는 차례
    sys: [],                                      // 알림 한 줄(파티 · 칭호) — { who, msg, at } 내 것만 채팅 칸에 띄운다
    nextParty: 1, titleT: 0,                      // 새 파티 번호 · 칭호 조건을 다시 보는 때
  };
  SPAWNS.forEach((sp, gi) => { for (let i = 0; i < sp.n; i++) spawnMob(g, gi); });
  return g;
}

function makeHero(pi, look, map = "plaza") {
  const [sx, sy] = MAPS[map].spawn;
  const h = {
    pi, map, x: sx + (Math.random() - 0.5) * 120, y: sy + (Math.random() - 0.5) * 60, dir: 1, face: 0, hold: [],
    hp: 0, max: 0, down: 0, lv: 1, xp: 0, coins: 0, quest: { on: false, n: 0 }, loaded: 0, st: noStats(),
    cd: 0.5, sk: 0, swing: 0, kills: 0, flash: 0, numAcc: 0, numT: 0, calm: 0, gateCd: 0,
    buff: 0, buffAmt: 0, guard: 0,
    bag: newBag(), bf: {},            // 상점 가방 · 버프 물약 { 스탯id: { t 남은 초, a 양 } }
    auto: 1, fire: 0, fireQ: 0,       // 자동 평타 · 스페이스를 누르고 있는지 · 눌렀던 한 번을 잠깐 기억
    pty: 0, invite: null,             // 파티 번호(0 이면 없음) · 받은 초대 { from 보낸 사람 자리, t 남은 초 }
    rec: newRec(), titles: [], title: "",   // 잡은 수 · 얻은 칭호 · 달고 있는 칭호
  };
  wear(h, look);
  refreshHp(h, true);
  return h;
}
// 겉모습(직업 · 원소 · 성별)을 입힌다
function wear(h, look) {
  const l = look || BASE_LOOK;
  h.job = jobOf(l).id; h.elem = elemOf(l).id; h.gender = l.gender === "f" ? "f" : "m";
  h.who = l.who || "";
}

// 실제로 쓰는 스탯 — 찍은 포인트의 값 + 장착한 무기 · 패시브 스킬 · 버프 물약
export const statTotal = (h, id) => statValue(id, h.st[id]) + extraStat(h, id);
// 최대 체력 = 체력 스탯 × 직업 배율 — 레벨은 포인트로만 오른다
const heroMaxHp = (h) => Math.round(statTotal(h, "hp") * jobOf(h).hp);
export function refreshHp(h, full) {
  h.max = heroMaxHp(h);
  if (full) h.hp = h.max;
  else h.hp = Math.min(h.max, h.hp);
}
// 공격력 배율 — 스탯 10 이 1배. 마법사는 마법력, 전사 · 궁수는 물리력을 쓴다
const buffMul = (h) => (h.buff > 0 ? 1 + h.buffAmt : 1);
export const physMul = (h) => (statTotal(h, "str") / 10) * buffMul(h);
export const magMul = (h) => (statTotal(h, "int") / 10) * buffMul(h);
export const heroDmgMul = (h) => (jobOf(h).id === "mage" ? magMul(h) : physMul(h));
export const critChance = (h) => Math.min(CRIT_MAX, statTotal(h, "crit") / 100);
export const critMul = (h) => statTotal(h, "cdmg") / 100;
export const heroRange = (h) => jobOf(h).rng * RPG.rangeMul;
const heroCd = (h) => jobOf(h).cd;

/* 자리마다 앉은 사람의 겉모습 — 방장과 손님 모두 자리가 바뀔 때마다 넣는다.
   seats[pi] = { id, name, hero: { name, job, elem, gender } } 또는 null */
export function rpgLooks(g, seats) {
  g.looks = seats.map((s) => {
    const l = s && cleanLook(s.hero);
    return l ? { ...l, who: s.id } : null;
  });
  g.names = seats.map((s) => (s && s.name) || "");
  // 손님 화면에 이미 선 영웅도 겉모습을 맞춘다
  g.heroes.forEach((h, pi) => { if (h && g.looks[pi]) wear(h, g.looks[pi]); });
}

/* 자리에 앉은 사람을 세계에 세우고, 떠난 사람은 뺀다 (방장만) */
export function rpgSyncSeats(g, seats) {
  rpgLooks(g, seats);
  g.looks.forEach((look, pi) => {
    const cur = g.heroes[pi];
    if (cur && (!look || cur.who !== look.who)) g.heroes[pi] = null;     // 떠났거나 다른 사람이 앉았다
    if (look && !g.heroes[pi]) {
      const h = g.heroes[pi] = makeHero(pi, look);
      if (g.pending[pi]) { rpgJoin(g, pi, g.pending[pi]); delete g.pending[pi]; }
      fx(g, "plaza", { kind: "nova", x: h.x, y: h.y - 10, r: 60, color: elemOf(h).light, n: 8, t: 0.6, life: 0.6 });
    }
  });
}

/* 들어온 사람이 알려 준 제 기록 — 아직 세워지지 않았으면 세울 때 쓴다 */
export function rpgJoin(g, pi, d) {
  const h = g.heroes[pi];
  if (!h) { g.pending[pi] = d; return; }
  if (!d || h.loaded) return;
  const keepHp = h.migr && h.hp > 0 ? h.hp : 0;   // 방장을 이어받는 중이면 체력은 그대로
  h.lv = clamp(Math.floor(Number(d.lv) || 1), 1, LV_MAX);
  h.xp = clamp(Math.floor(Number(d.xp) || 0), 0, needXp(h.lv) - 1);
  h.coins = Math.max(0, Math.floor(Number(d.coins) || 0));
  const q = d.quest || {};
  h.quest = { on: !!q.on, n: clamp(Math.floor(Number(q.n) || 0), 0, QUEST.need - 1) };
  if (d.admin) {                                  // 관리자 — 최고 레벨 · 코인 가득
    h.admin = 1;
    h.lv = LV_MAX; h.xp = 0;
    h.coins = Math.max(h.coins, ADMIN.coins);
  }
  h.st = cleanStats(d.stats, h.lv);
  h.bag = cleanBag(d.bag);
  h.bag.ld = 1;
  h.rec = cleanRec(d.rec);
  h.titles = cleanTitles(d.titles);
  h.title = h.titles.includes(d.title) ? d.title : "";
  awardTitles(g, h, true);                        // 예전 캐릭터도 이미 채운 조건의 칭호는 조용히 받는다
  if (d.auto !== undefined) h.auto = d.auto ? 1 : 0;
  if (Array.isArray(d.hold)) rpgHold(g, pi, d.hold);   // 누르고 있던 방향 — 이어받을 때 멈추지 않게
  refreshHp(h, true);
  if (keepHp) h.hp = Math.min(h.max, keepHp);
  h.migr = 0;
  h.loaded = 1;
}

/* 스탯을 찍는다 (방장만 판정) — add 는 { 스탯id: 올릴 포인트 }. 남은 포인트와 스탯 상한을 넘으면 받지 않는다.
   되돌리기는 없다. */
export function rpgStat(g, pi, add) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !add || typeof add !== "object") return false;
  const next = { ...h.st };
  let n = 0;
  for (const k of STAT_IDS) {
    const v = Math.floor(Number(add[k]) || 0);
    if (v < 0) return false;
    next[k] += v;
    n += v;
    if (next[k] > STAT_MAX) return false;
  }
  if (n <= 0 || n > statLeft(h)) return false;
  const wasFull = h.hp >= h.max;
  h.st = next;
  refreshHp(h, false);
  if (wasFull && h.down <= 0) h.hp = h.max;        // 가득 차 있었으면 늘어난 만큼도 채운다
  fx(g, h.map, { kind: "call", x: h.x, y: h.y - 96, text: `스탯 +${n}`, color: "#ffe08a", t: 0.8, life: 0.8,
    snd: "build", who: pi });
  return true;
}

/* ── 연출 — 어느 맵에서 일어났는지 함께 적는다 ─────────────── */
export function fx(g, map, item) {
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
  h.face = dy < 0 ? 2 : dx ? 1 : 0;              // 0 비스듬히 앞 · 1 옆 · 2 뒤
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

/* 자동 평타 켜고 끄기 */
export function rpgAuto(g, pi, on) {
  const h = g.heroes[pi];
  if (h) h.auto = on ? 1 : 0;
}

/* 스페이스 평타 — 누르고 있는 동안 쿨이 돌 때마다 친다. 짧게 눌렀다 떼도 한 번은 나간다. */
export function rpgFire(g, pi, on) {
  const h = g.heroes[pi];
  if (!h) return;
  h.fire = on ? 1 : 0;
  if (!on || h.down > 0) return;
  h.fireQ = 0.35;
  if (MAPS[h.map].safe) return say(g, h.map, h.x, h.y - 90, "광장에서는 싸울 수 없다", "#d9c9a6");
  if (h.cd <= 0 && !nearMobs(g, h.map, h.x, h.y, heroRange(h), 1).length) {
    say(g, h.map, h.x, h.y - 90, "사거리 안에 몹이 없다", "#d9c9a6");
  }
}

export function npcNear(h) {
  if (!h) return null;
  return MAPS[h.map].npcs.find((n) => dist(h.x, h.y, n.x, n.y) <= RPG.talkR) || null;
}

/* 사냥꾼에게 말을 건다 — 퀘스트를 받거나, 얼마나 남았는지 듣는다 */
export function rpgTalk(g, pi) {
  const h = g.heroes[pi];
  const npc = npcNear(h);
  if (!h || !npc || h.down > 0 || npc.shop) return;   // 상점은 화면에서 창을 연다
  if (!h.quest.on) {
    h.quest = { on: true, n: 0 };
    fx(g, h.map, { kind: "call", x: npc.x, y: npc.y - 96, text: "퀘스트 받음", color: "#ffe08a", t: 0.9, life: 0.9,
      snd: "build", who: pi });
  } else {
    say(g, h.map, npc.x, npc.y - 70, `토끼 ${QUEST.need - h.quest.n}마리 남았네`, "#f0dcb4");
  }
}

/* ── 몹이 나온다 ──────────────────────────────────────────── */
function spawnMob(g, gi) {
  const sp = SPAWNS[gi];
  const M = MAPS[sp.map];
  const T = MOB[sp.type];
  const [z0, z1] = M.zone;
  // 레벨을 먼저 정하고, 그 레벨의 구간 안에서 자리를 찾는다 — 보스는 맵 끝쪽 40% 안에 나온다
  const lv = sp.boss ? T.boss.lv : sp.lv[0] + Math.floor(Math.random() * (sp.lv[1] - sp.lv[0] + 1));
  const band = sp.boss ? [0.6, 1] : [(lv - sp.lv[0]) / (sp.lv[1] - sp.lv[0] + 1), (lv - sp.lv[0] + 1) / (sp.lv[1] - sp.lv[0] + 1)];
  let x = 0, y = 0;
  // 사람 곁이나 문 · 사냥꾼 앞에서는 나오지 않는다
  for (let tries = 0; tries < 12; tries++) {
    x = z0 + (band[0] + Math.random() * (band[1] - band[0])) * (z1 - z0);
    y = M.top + 60 + Math.random() * (M.h - M.top - 120);
    const busy = g.heroes.some((h) => h && h.map === sp.map && dist(h.x, h.y, x, y) < 260)
      || M.npcs.some((n) => dist(n.x, n.y, x, y) < 200) || M.gates.some((q) => dist(q.x, q.y, x, y) < 220);
    if (!busy) break;
  }
  g.mobs.push(mobBody(g.nextId++, gi, lv, x, y));
}
// 몹 하나 — 판정에 쓰는 값을 모두 갖춘다. 방장을 이어받을 때 받은 몹을 다시 세울 때도 쓴다
function mobBody(id, gi, lv, x, y) {
  const sp = SPAWNS[gi];
  const T = MOB[sp.type];
  const size = mobSize(sp.type, lv, sp.boss);
  const hp = sp.boss ? T.boss.hp : T.hp(lv);
  return {
    id, gi, type: sp.type, boss: sp.boss ? 1 : 0, lv, size, map: sp.map, x, y, hx: x, hy: y,
    ax: Math.random() < 0.5 ? -1 : 1,
    hp, max: hp, rad: T.rad * size, age: 0, calm: 0,
    dmg: sp.boss ? T.boss.dmg : T.dmg(lv), xp: xpOf(sp.boss ? T.boss.xp : T.xp(lv)), coin: coinOf(sp.boss ? T.boss.coin : T.coin(lv)),
    state: "idle", t: 0.5 + Math.random() * 1.5, vx: 0, vy: 0, tgt: -1, bumpCd: 2, biteCd: 1, bite: 0, chargeCd: 1.5, hitSet: null,
    slow: 0, freeze: 0, stun: 0, burn: 0, bdps: 0, bby: -1, poison: 0, pdps: 0, pby: -1,
    shred: 0, shredAmt: 0, flash: 0, dotT: 0.5, numAcc: 0, numT: 0, numCol: "#ffe9bd",
  };
}

/* ── 방장 이어받기 — 모두가 방장인 것처럼 ──────────────────────────
   방장이 나가면 남은 사람 가운데 하나가 판정을 이어받는다. 이때 세계를 새로 만들지 않고,
   마지막으로 받은 세계(모두의 자리 · 몹 자리와 체력 · 대기 시간)를 판정용으로 바꿔 그대로 이어 간다.
   사람마다의 기록(레벨 · 코인 · 가방 …)은 각자가 다시 보내 준다(rpgJoin). 그동안 체력은 그대로 둔다. */
export function rpgPromote(g) {
  g.out = [];
  g.hits = []; g.respawn = []; g.pending = {};
  g.mobs = g.mobs.filter((m) => !m.dead).map((m) => {
    const gi = SPAWNS.findIndex((sp) => sp.map === m.map && sp.type === m.type && !!sp.boss === !!m.boss);
    if (gi < 0) return null;
    const b = mobBody(m.id, gi, m.lv, m.x, m.y);
    b.hp = Math.max(1, Math.round((b.max * (m.hp || 0)) / (m.max || 100)));   // 받은 체력은 백분율이다
    b.ax = m.ax || 1; b.age = 1;
    return b;
  }).filter(Boolean);
  g.nextId = Math.max(g.nextId, ...g.mobs.map((m) => m.id + 1), 1);
  g.nextParty = Math.max(g.nextParty || 1, ...g.heroes.map((h) => (h ? h.pty + 1 : 1)));
  g.heroes.forEach((h) => {
    if (!h) return;
    h.loaded = 0; h.migr = 1;                     // 기록이 다시 올 때까지 — 자리 · 체력은 그대로
    h.tx = undefined; h.ty = undefined;
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

function hitMob(g, pi, m, raw, skill, sureCrit) {
  if (!m || m.dead) return 0;
  const h = g.heroes[pi];
  let dmg = raw * (1 + (m.shred > 0 ? m.shredAmt : 0));
  const crit = h ? sureCrit || Math.random() < critChance(h) : false;
  if (crit) dmg *= critMul(h);
  dmg = Math.max(1, Math.round(dmg));
  m.hp -= dmg;
  m.calm = 0;                                     // 맞으면 자동 회복을 처음부터 다시 센다
  m.flash = 0.12;
  m.numAcc += dmg;
  m.numCol = crit ? "#ffd873" : h ? elemOf(h).light : "#ffe9bd";
  if (crit || skill || m.numT <= 0) flushNum(g, m, crit ? 2 : skill ? 1 : 0);
  // 늑대와 대왕 토끼는 때린 쪽을 노린다
  if (h && m.hp > 0 && (m.type !== "rabbit" || m.boss)) { m.tgt = pi; m.bumpCd = Math.min(m.bumpCd, 0.6); }
  // 작은 토끼는 때린 쪽 반대로 달아난다
  else if (h && m.hp > 0 && m.freeze <= 0 && m.stun <= 0) {
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
  g.respawn.push({ t: SPAWNS[m.gi].respawn, gi: m.gi });
  const h = g.heroes[pi];
  if (!h) return;
  h.kills += 1;
  h.coins += m.coin;
  h.rec[m.type] += 1;
  if (m.boss) h.rec.boss += 1;
  if (h.pty) {
    h.rec.party += 1;
    // 같은 맵에 있는 파티원도 경험치를 나눠 받는다(코인은 잡은 사람만)
    const part = Math.max(1, Math.round(m.xp * PARTY.share));
    g.heroes.forEach((o) => {
      if (!o || o === h || o.pty !== h.pty || o.map !== h.map || !o.loaded) return;
      fx(g, o.map, { kind: "text", x: o.x, y: o.y - 100, text: `+${part} XP 파티`, color: "#a9e79c", t: 0.9, life: 0.9, who: o.pi });
      giveXp(g, o, part);
    });
  }
  if (m.boss) {
    fx(g, m.map, { kind: "call", x: m.x, y: m.y - 30 - 50 * m.size, text: `${mobName(m)} 처치!`, color: "#ffd873",
      t: 1.4, life: 1.4, snd: "clear", who: pi });
  }
  fx(g, m.map, { kind: "text", x: m.x, y: m.y - 16, text: `+${m.xp} XP · +${m.coin} 코인`, color: "#f3d27f",
    t: 0.9, life: 0.9, snd: "coin", who: pi });
  giveXp(g, h, m.xp);
  if (h.quest.on && m.type === "rabbit") {
    h.quest.n += 1;
    if (h.quest.n >= QUEST.need) {
      h.quest = { on: false, n: 0 };
      h.coins += QUEST.coin;
      h.rec.quest += 1;
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
    fx(g, h.map, { kind: "call", x: h.x, y: h.y - 90, text: `레벨 업! Lv ${h.lv} · 스탯 +${STAT_PER_LV}`, color: "#ffe08a", t: 1, life: 1,
      snd: "wave", who: h.pi });
  }
  if (h.lv >= LV_MAX) h.xp = 0;
}

function hurtHero(g, h, raw) {
  if (!h || h.down > 0 || MAPS[h.map].safe) return;
  if (h.inv > 0) {                                // 대쉬로 피했다
    if (h.numT <= 0) { say(g, h.map, h.x, h.y - 80, "회피", "#cfe6ff"); h.numT = 0.3; }
    return;
  }
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

/* ── 원소를 싣는다 — 평타는 약하게(big 0), 큰 기술은 세게(big 1) ─────── */
function soak(g, h, m, big) {
  if (!m || m.dead) return;
  const mul = magMul(h);                          // 화상 · 독은 직업과 상관없이 마법력을 따른다
  const e = elemOf(h).id;
  if (e === "flame") { m.burn = big ? 6 : 3; m.bdps = Math.max(m.bdps, (big ? 32 : 10) * mul); m.bby = h.pi; }
  else if (e === "frost") { if (big) m.freeze = 3; else m.slow = 2; }
  else if (e === "bolt") { if (big) m.stun = 1.5; }
  else if (e === "poison") { m.poison = big ? 6 : 4; m.pdps = Math.max(m.pdps, (big ? 34 : 12) * mul); m.pby = h.pi; }
  else if (e === "corrode") { m.shred = big ? 8 : 4; m.shredAmt = Math.max(m.shredAmt, big ? 0.4 : 0.2); }
  else if (e === "gravity") { if (big) m.stun = 2; else m.slow = Math.max(m.slow, 1); }
}

// 평타가 맞은 뒤 — 번개는 옆 토끼로 한 번 옮겨 붙고, 중력은 둘레 토끼를 끌어당긴다
function afterHit(g, h, m, x, y, dmg) {
  const e = elemOf(h).id;
  const map = h.map;
  if (e === "bolt") {
    const next = nearMobs(g, map, x, y, 160).find((q) => q !== m);
    if (next) {
      fx(g, map, { kind: "zap", x0: x, y0: y - 10, x1: next.x, y1: next.y - 10, color: elemOf(h).light, t: 0.28, life: 0.28 });
      hitMob(g, h.pi, next, dmg * 0.5);
    }
  } else if (e === "gravity") {
    nearMobs(g, map, x, y, 100).forEach((q) => {
      if (q === m) return;
      q.x += (x - q.x) * 0.3; q.y += (y - q.y) * 0.3;
      q.slow = Math.max(q.slow, 1);
    });
  }
}

/* ── 영웅의 공격 — 사거리 안의 토끼를 친다 ───────────────────── */
function heroAttack(g, h) {
  const pi = h.pi;
  const map = h.map;
  const job = jobOf(h), el = elemOf(h);
  const dmg = job.dmg * heroDmgMul(h);
  const rng = heroRange(h);
  const hy = h.y - 34;

  if (job.id === "warrior") {                     // 전사 — 둘레를 한 번에 벤다
    const list = nearMobs(g, map, h.x, h.y, rng);
    if (!list.length) return false;
    h.dir = list[0].x < h.x ? -1 : 1;
    h.face = 0;
    list.forEach((m) => { hitMob(g, pi, m, dmg); soak(g, h, m, 0); });
    afterHit(g, h, list[0], list[0].x, list[0].y, dmg);
    fx(g, map, { kind: "slash", x: h.x + h.dir * 30, y: h.y - 30, a: h.dir > 0 ? 0 : Math.PI,
      color: el.light, t: 0.24, life: 0.24, snd: "slash" });
    return true;
  }

  // 마법사 · 궁수 — 가장 가까운 토끼에게 날린다
  const [m] = nearMobs(g, map, h.x, h.y, rng, 1);
  if (!m) return false;
  h.dir = m.x < h.x ? -1 : 1;
  h.face = 0;
  const fly = job.fly || 0.2;
  const art = ELEM_ART[el.id];
  if (job.id === "mage") {
    fx(g, map, { kind: "shot", x0: h.x + h.dir * 14, y0: hy, x1: m.x, y1: m.y - 10, style: "orb",
      art: art.fly || 0, r: 22, color: el.light, t: fly, life: fly, snd: "orb" });
  } else {
    fx(g, map, { kind: "shot", x0: h.x, y0: hy, x1: m.x, y1: m.y - 10, style: "arrow",
      color: el.light, t: fly, life: fly, snd: "shot" });
  }
  g.hits.push({ t: fly, pi, mid: m.id, x: m.x, y: m.y, map, dmg, splash: job.splash || 0 });
  return true;
}

// 날아간 것이 닿았다
function landHit(g, s) {
  const h = g.heroes[s.pi];
  const m = g.mobs.find((q) => q.id === s.mid && !q.dead);
  if (!h) return;
  const el = elemOf(h);
  const x = m ? m.x : s.x, y = m ? m.y : s.y;
  if (s.splash) {                                 // 마법 — 맞은 자리 둘레도 다친다
    nearMobs(g, s.map, x, y, s.splash).forEach((q) => {
      hitMob(g, s.pi, q, s.dmg * (q === m ? 1 : 0.5));
      soak(g, h, q, 0);
    });
    fx(g, s.map, { kind: "art", art: ELEM_ART[el.id].hit, x, y: y - 4, r: 34, t: 0.4, life: 0.4 });
  } else {
    if (!m) return;
    hitMob(g, s.pi, m, s.dmg);
    soak(g, h, m, 0);
    fx(g, s.map, { kind: "burst", x, y: y - 10, r: 18, color: el.light, n: 6, t: 0.3, life: 0.3 });
  }
  if (m) afterHit(g, h, m, x, y, s.dmg);
}

/* ── 큰 기술 — 직업이 모양을, 원소가 효과를 정한다 ──────────────
   전사: 둘레를 휘도는 회오리 · 마법사: 가장 가까운 토끼 자리에 원소 폭발 · 궁수: 둘레에 화살비 */
export function rpgSkill(g, pi) {
  const h = g.heroes[pi];
  if (!h || h.down > 0) return;
  const map = h.map;
  const job = jobOf(h), el = elemOf(h);
  const name = skillName(h);
  if (MAPS[map].safe) return say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
  if (h.sk > 0) return say(g, map, h.x, h.y - 90, `${name} ${Math.ceil(h.sk)}초`, "#f0dcb4");
  const base = job.dmg * heroDmgMul(h);
  const art = ELEM_ART[el.id];

  let cx = h.x, cy = h.y, list, mul;
  if (job.id === "warrior") {
    list = nearMobs(g, map, h.x, h.y, 240); mul = 3;
  } else if (job.id === "mage") {
    const [t] = nearMobs(g, map, h.x, h.y, 360, 1);
    if (t) { cx = t.x; cy = t.y; }
    list = t ? nearMobs(g, map, cx, cy, 200) : []; mul = 2.8;
  } else {
    list = nearMobs(g, map, h.x, h.y, 300); mul = 2.6;
  }
  if (!list.length) return say(g, map, h.x, h.y - 90, "닿는 몹이 없다", "#d9c9a6");
  if (cx !== h.x) h.dir = cx < h.x ? -1 : 1;
  h.face = 0;

  list.forEach((m) => {
    if (el.id === "gravity") { m.x += (cx - m.x) * 0.6; m.y += (cy - m.y) * 0.6; }
    hitMob(g, pi, m, base * mul, true);
    soak(g, h, m, 1);
  });

  if (job.id === "warrior") {
    fx(g, map, { kind: "nova", x: h.x, y: h.y - 8, r: 240, color: el.light, n: 16, t: 0.7, life: 0.7, snd: "boom" });
    fx(g, map, { kind: "art", art: art.big, x: h.x, y: h.y - 6, r: 115, t: 0.8, life: 0.8 });
  } else if (job.id === "mage") {
    fx(g, map, { kind: "art", art: art.big, x: cx, y: cy - 6, r: 170, t: 0.9, life: 0.9, snd: "boom" });
  } else {
    fx(g, map, { kind: "rain", x: h.x, y: h.y, r: 260, n: 26, color: el.light, t: 0.9, life: 0.9, snd: "shot" });
    fx(g, map, { kind: "art", art: art.hit, x: h.x, y: h.y - 4, r: 90, t: 0.8, life: 0.8 });
  }
  h.sk = RPG.skillCd;
  h.swing = 0.4;
  fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: name, color: "#ffd873", t: 0.9, life: 0.9, snd: "crit" });
}

/* ── 대쉬 — 누른 방향(없으면 바라보는 쪽)으로 짧게 달려 나간다 ─────────────
   방장이 판정하고, 손님은 제 화면에서 먼저 같은 대쉬를 그린다(startDash). 맵 가장자리 · 분수 · 노점은 넘지 못한다. */
// 손님 화면에서 먼저 그리는 대쉬 — 방장의 판정이 돌아올 동안(predict 초) 위치를 되돌리지 않는다
export function predictDash(h) {
  if (!startDash(h)) return false;
  h.predict = 0.6;
  return true;
}
export function startDash(h) {
  if (!h || h.down > 0 || (h.dashCd || 0) > 0) return false;
  let dx = 0, dy = 0;
  (h.hold || []).forEach((d) => {
    if (d === "left") dx -= 1; else if (d === "right") dx += 1; else if (d === "up") dy -= 1; else if (d === "down") dy += 1;
  });
  if (!dx && !dy) dx = h.dir || 1;
  const len = Math.hypot(dx, dy);
  const v = DASH.dist / DASH.time;
  h.dvx = (dx / len) * v; h.dvy = (dy / len) * v;
  if (dx) h.dir = dx < 0 ? -1 : 1;
  h.dash = DASH.time; h.inv = DASH.inv; h.dashCd = DASH.cd;
  return true;
}
// 대쉬 중 한 걸음 — 방장 · 손님 화면이 같은 식으로 움직인다
function dashStep(h, dt) {
  const t = Math.min(dt, h.dash);
  h.x += h.dvx * t; h.y += h.dvy * RPG.squash * t;
  h.dash = Math.max(0, h.dash - dt);
  keepIn(h, MAPS[h.map], 20);
}
export function rpgDash(g, pi) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || h.down > 0) return;
  if ((h.dashCd || 0) > 0) return say(g, h.map, h.x, h.y - 90, `대쉬 ${Math.ceil(h.dashCd)}초`, "#f0dcb4");
  const x0 = h.x, y0 = h.y;
  if (!startDash(h)) return;
  fx(g, h.map, { kind: "burst", x: x0, y: y0 - 10, r: 22, color: "#e8f2ff", n: 8, t: 0.3, life: 0.3, snd: "slash", who: pi });
}

/* ── 산 스킬 — 숫자키로 쓴다 (방장만 판정) ─────────────────────────
   액티브 스킬만. 위력 · 대기 시간은 shopData.js 의 SKILLS[].use. 대기 시간은 h.scd[스킬id] 에 남는다. */
export const ACTIVE_SKILLS = SHOP_SKILLS.filter((s) => s.use).sort((a, b) => a.use.key - b.use.key);
const skillStatMul = (h, k) => (k === "str" ? physMul(h) : k === "int" ? magMul(h) : heroDmgMul(h));
export function rpgUseSkill(g, pi, id) {
  const h = g.heroes[pi];
  const s = ACTIVE_SKILLS.find((q) => q.id === id);
  if (!h || !s || !h.loaded || h.down > 0) return;
  const lv = (h.bag && h.bag.s[id]) || 0;
  const map = h.map;
  if (!lv) return say(g, map, h.x, h.y - 90, `${s.name} — 스킬 상점에서 배워야 합니다`, "#d9c9a6");
  h.scd = h.scd || {};
  if (h.scd[id] > 0) return say(g, map, h.x, h.y - 90, `${s.name} ${Math.ceil(h.scd[id])}초`, "#f0dcb4");
  const u = s.use;
  const i = Math.min(lv, u.mul ? u.mul.length : u.heal.length) - 1;
  if (u.heal) {                                    // 응급 처치 — 어디서나 쓸 수 있다
    if (h.hp >= h.max) return say(g, map, h.x, h.y - 90, "체력이 이미 가득 찼습니다", "#d9c9a6");
    const before = h.hp;
    h.hp = Math.min(h.max, h.hp + h.max * u.heal[i]);
    fx(g, map, { kind: "heal", x: h.x, y: h.y - 56, text: `+${Math.round(h.hp - before)}`, t: 0.9, life: 0.9, snd: "bless", who: pi });
  } else {
    if (MAPS[map].safe) return say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
    const dmg = SKILL_USE.base * skillStatMul(h, u.dmg) * u.mul[i];
    if (u.radius) {                                // 둘레를 모두
      const list = nearMobs(g, map, h.x, h.y, u.radius);
      if (!list.length) return say(g, map, h.x, h.y - 90, "닿는 몹이 없다", "#d9c9a6");
      list.forEach((m) => hitMob(g, pi, m, dmg, true, u.crit));
      fx(g, map, { kind: "nova", x: h.x, y: h.y - 8, r: u.radius, color: "#c9b6f0", n: 18, t: 0.7, life: 0.7, snd: "boom" });
    } else {                                       // 가장 가까운 하나
      const [m] = nearMobs(g, map, h.x, h.y, heroRange(h) * SKILL_USE.reach, 1);
      if (!m) return say(g, map, h.x, h.y - 90, "사거리 안에 몹이 없다", "#d9c9a6");
      h.dir = m.x < h.x ? -1 : 1;
      hitMob(g, pi, m, dmg, true, u.crit);
      fx(g, map, { kind: "burst", x: m.x, y: m.y - 14, r: 30, color: u.crit ? "#ffd873" : "#f2e3c2", n: 10, t: 0.4, life: 0.4, snd: "crit" });
    }
    h.swing = 0.35;
  }
  h.scd[id] = u.cd;
  fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: s.name, color: "#ffd873", t: 0.8, life: 0.8, who: pi });
}

/* ── 한 걸음 ───────────────────────────────────────────── */
function stepHeroes(g, dt) {
  g.heroes.forEach((h) => {
    if (!h) return;
    h.flash = Math.max(0, h.flash - dt);
    h.swing = Math.max(0, h.swing - dt);
    h.buff = Math.max(0, h.buff - dt);
    tickBuffs(h, dt);                             // 버프 물약 시간
    if (h.scd) for (const k in h.scd) h.scd[k] = Math.max(0, h.scd[k] - dt);   // 산 스킬 대기 시간
    if (h.admin && h.coins < ADMIN.coins) h.coins = ADMIN.coins;   // 관리자는 쓴 만큼 바로 다시 찬다
    h.guard = Math.max(0, h.guard - dt);
    h.numT = Math.max(0, h.numT - dt);
    h.gateCd = Math.max(0, h.gateCd - dt);
    h.inv = Math.max(0, (h.inv || 0) - dt);
    h.dashCd = Math.max(0, (h.dashCd || 0) - dt);
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
    if (h.dash > 0) dashStep(h, dt);                // 대쉬 중에는 걷지 않고 달려 나간다
    else rpgWalk(h, dt);

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
    h.fireQ = Math.max(0, h.fireQ - dt);
    if (h.cd > 0 || MAPS[h.map].safe) return;
    if (!h.auto && !h.fire && h.fireQ <= 0) return;
    if (heroAttack(g, h)) { h.cd = heroCd(h); h.swing = 0.25; h.fireQ = 0; }
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

// 걸린 것 · 시간 — 모든 몹이 같다. 죽었거나 얼었거나 기절했으면 false
function tickMob(g, m, dt) {
  m.age += dt;
  m.calm += dt;
  if (m.calm >= MOB_REGEN.calm && m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.max * MOB_REGEN.rate * dt);
  m.flash = Math.max(0, m.flash - dt);
  m.slow = Math.max(0, m.slow - dt);
  m.freeze = Math.max(0, m.freeze - dt);
  m.stun = Math.max(0, m.stun - dt);
  m.shred = Math.max(0, m.shred - dt);
  m.numT = Math.max(0, m.numT - dt);
  m.bumpCd = Math.max(0, m.bumpCd - dt);
  m.biteCd = Math.max(0, m.biteCd - dt);
  m.bite = Math.max(0, m.bite - dt);
  if (m.numT <= 0 && m.numAcc > 0) flushNum(g, m);
  if (m.burn > 0 || m.poison > 0) {              // 불과 독은 0.5초마다 한 번씩 깎는다
    m.dotT -= dt;
    if (m.dotT <= 0) {
      m.dotT = 0.5;
      if (m.burn > 0) hitMob(g, m.bby, m, m.bdps * 0.5);
      if (!m.dead && m.poison > 0) hitMob(g, m.pby, m, m.pdps * 0.5);
      if (m.dead) return false;
    }
    m.burn = Math.max(0, m.burn - dt);
    m.poison = Math.max(0, m.poison - dt);
  }
  if (m.freeze > 0 || m.stun > 0) { m.moving = 0; return false; }
  return true;
}

// 맵 가장자리에서 튕겨 나온다
function keepMob(m) {
  const M = MAPS[m.map];
  const bx = clamp(m.x, RPG.edge + 20, M.w - RPG.edge - 20), by = clamp(m.y, M.top + 10, M.h - RPG.edge);
  if (bx !== m.x) m.vx = -m.vx;
  if (by !== m.y) m.vy = -m.vy;
  m.x = bx; m.y = by;
}

/* 토끼 — 깡충깡충 돌아다니다 가끔 들이받는다. 대왕 토끼는 더 멀리서, 더 자주, 더 세게 들이받는다. */
function stepRabbit(g, m, dt) {
  const spd = m.slow > 0 ? 0.5 : 1;
  if (m.state !== "idle") {
    m.x += m.vx * spd * dt;
    m.y += m.vy * spd * RPG.squash * dt;
    if (Math.abs(m.vx) > 1) m.ax = m.vx < 0 ? -1 : 1;
  }
  // 들이받기 — 닿으면 아프고 튕겨 나온다
  if (m.state === "charge") {
    const tg = g.heroes[m.tgt];
    if (tg && tg.map === m.map && tg.down <= 0 && dist(m.x, m.y, tg.x, tg.y) < m.rad + 13) {
      hurtHero(g, tg, m.dmg);
      fx(g, m.map, { kind: "burst", x: tg.x, y: tg.y - 24, r: 16 * m.size, color: "#ffd7c2", n: 5, t: 0.25, life: 0.25 });
      m.bumpCd = m.boss ? 2.4 : 3.5;
      m.state = "flee"; m.t = 0.5; m.vx = -m.vx * 0.6; m.vy = -m.vy * 0.6;
    }
  }
  m.t -= dt;
  if (m.t <= 0) {
    const near = m.bumpCd <= 0 ? nearestHero(g, m, m.boss ? 280 : 130) : null;
    if (near && Math.random() < (m.boss ? 0.75 : 0.3)) {
      const dx = near.x - m.x, dy = (near.y - m.y) / RPG.squash;
      const len = Math.hypot(dx, dy) || 1;
      const v = m.boss ? 320 : 240;
      m.state = "charge"; m.t = m.boss ? 1.0 : 0.7; m.tgt = near.pi;
      m.vx = (dx / len) * v; m.vy = (dy / len) * v;
    } else if (m.state === "idle") {
      const a = Math.random() * Math.PI * 2, v = 110 + Math.random() * 40;
      m.state = "hop"; m.t = 0.35 + Math.random() * 0.4;
      m.vx = Math.cos(a) * v; m.vy = Math.sin(a) * v;
    } else {
      m.state = "idle"; m.t = 0.6 + Math.random() * 1.6; m.vx = 0; m.vy = 0;
    }
  }
  m.moving = m.state !== "idle" ? 1 : 0;
  keepMob(m);
}

/* 늑대 — 가까이 온 사람을 쫓아가 문다. 제자리에서 너무 멀어지면 돌아간다.
   우두머리는 더 멀리서 알아채고, 한 번 물 때 둘레의 사람을 모두 문다. */
function stepWolf(g, m, dt) {
  const spd = m.slow > 0 ? 0.5 : 1;
  const aggro = m.boss ? 340 : 250;
  const far = Math.hypot(m.x - m.hx, (m.y - m.hy) / RPG.squash);
  let tg = m.tgt >= 0 ? g.heroes[m.tgt] : null;
  if (tg && (tg.map !== m.map || tg.down > 0 || dist(m.x, m.y, tg.x, tg.y) > aggro * 2.2 || far > 900)) { tg = null; m.tgt = -1; }
  if (!tg && far < 700) {
    const near = nearestHero(g, m, aggro);
    if (near) { tg = near; m.tgt = near.pi; }
  }
  if (tg) {
    const dx = tg.x - m.x, dy = (tg.y - m.y) / RPG.squash;
    const d = Math.hypot(dx, dy) || 1;
    const reach = m.rad + 16;
    if (Math.abs(dx) > 2) m.ax = dx < 0 ? -1 : 1;
    if (d > reach) {
      const v = (m.boss ? 200 : 175) * spd;
      m.x += (dx / d) * v * dt; m.y += (dy / d) * v * RPG.squash * dt;
      m.moving = 1;
    } else {
      m.moving = 0;
      if (m.biteCd <= 0) {
        const list = m.boss
          ? g.heroes.filter((h) => h && h.map === m.map && h.down <= 0 && dist(m.x, m.y, h.x, h.y) < reach * 1.7)
          : [tg];
        list.forEach((h) => {
          hurtHero(g, h, m.dmg);
          fx(g, m.map, { kind: "burst", x: h.x, y: h.y - 26, r: 18, color: "#ffb4a8", n: 6, t: 0.3, life: 0.3 });
        });
        m.biteCd = m.boss ? 1.6 : 1.3;
        m.bite = 0.25;
      }
    }
  } else {
    // 어슬렁거린다 — 제자리에서 멀면 그쪽으로 돌아간다
    m.t -= dt;
    if (m.t <= 0) {
      if (m.state === "idle") {
        const back = far > 260;
        const a = back ? Math.atan2((m.hy - m.y) / RPG.squash, m.hx - m.x) : Math.random() * Math.PI * 2;
        const v = back ? 130 : 70 + Math.random() * 40;
        m.state = "walk"; m.t = back ? 1.2 : 0.8 + Math.random() * 1.2;
        m.vx = Math.cos(a) * v; m.vy = Math.sin(a) * v;
      } else {
        m.state = "idle"; m.t = 1 + Math.random() * 2.2; m.vx = 0; m.vy = 0;
      }
    }
    if (m.state !== "idle") {
      m.x += m.vx * spd * dt;
      m.y += m.vy * spd * RPG.squash * dt;
      if (Math.abs(m.vx) > 1) m.ax = m.vx < 0 ? -1 : 1;
    }
    m.moving = m.state !== "idle" ? 1 : 0;
  }
  keepMob(m);
}

/* 멧돼지 — 쫓아와 들이받는다. 돌진 거리 안에 들면 몸을 낮췄다가(wind) 그 자리를 향해 일직선으로 달린다.
   돌진 중에 닿은 사람은 한 번씩 세게 맞는다. 달린 뒤에는 잠깐 숨을 고른다. 제자리에서 너무 멀어지면 돌아간다. */
function stepBoar(g, m, dt) {
  const spd = m.slow > 0 ? 0.5 : 1;
  m.chargeCd = Math.max(0, m.chargeCd - dt);
  if (m.state === "wind") {                        // 몸을 낮춘다 — 이때 피하면 된다
    m.moving = 0; m.bite = 0.2;
    m.t -= dt;
    if (m.t <= 0) {
      const tg = g.heroes[m.tgt];
      const tx = tg ? tg.x : m.x + m.ax * 100, ty = tg ? tg.y : m.y;
      const dx = tx - m.x, dy = (ty - m.y) / RPG.squash, d = Math.hypot(dx, dy) || 1;
      m.vx = (dx / d) * BOAR.speed; m.vy = (dy / d) * BOAR.speed;
      m.state = "charge"; m.t = BOAR.time; m.hitSet = [];
      fx(g, m.map, { kind: "ring", x: m.x, y: m.y - 10, r: 30 * m.size, color: "#e8c39a", t: 0.3, life: 0.3 });
    }
    keepMob(m);
    return;
  }
  if (m.state === "charge") {                      // 일직선으로 달린다
    m.x += m.vx * spd * dt; m.y += m.vy * spd * RPG.squash * dt;
    if (Math.abs(m.vx) > 1) m.ax = m.vx < 0 ? -1 : 1;
    m.moving = 1;
    g.heroes.forEach((h) => {
      if (!h || h.map !== m.map || h.down > 0 || m.hitSet.includes(h.pi)) return;
      if (dist(m.x, m.y, h.x, h.y) > m.rad + 18) return;
      m.hitSet.push(h.pi);
      hurtHero(g, h, m.dmg * BOAR.chargeMul);
      fx(g, m.map, { kind: "burst", x: h.x, y: h.y - 26, r: 22 * m.size, color: "#ffc9a0", n: 7, t: 0.32, life: 0.32 });
    });
    m.t -= dt;
    if (m.t <= 0) { m.state = "rest"; m.t = BOAR.rest; m.chargeCd = BOAR.cd * (m.boss ? 0.7 : 1); m.vx = 0; m.vy = 0; }
    keepMob(m);
    return;
  }
  if (m.state === "rest") {                        // 숨을 고른다
    m.moving = 0;
    m.t -= dt;
    if (m.t <= 0) { m.state = "idle"; m.t = 0.3; }
    return;
  }
  // 쫓아가 들이받는다 — 늑대와 같은 셈, 조금 느리다
  const aggro = m.boss ? BOAR.aggro * 1.3 : BOAR.aggro;
  const far = Math.hypot(m.x - m.hx, (m.y - m.hy) / RPG.squash);
  let tg = m.tgt >= 0 ? g.heroes[m.tgt] : null;
  if (tg && (tg.map !== m.map || tg.down > 0 || dist(m.x, m.y, tg.x, tg.y) > aggro * 2.2 || far > 900)) { tg = null; m.tgt = -1; }
  if (!tg && far < 700) {
    const near = nearestHero(g, m, aggro);
    if (near) { tg = near; m.tgt = near.pi; }
  }
  if (tg) {
    const dx = tg.x - m.x, dy = (tg.y - m.y) / RPG.squash;
    const d = Math.hypot(dx, dy) || 1;
    const reach = m.rad + 16;
    if (Math.abs(dx) > 2) m.ax = dx < 0 ? -1 : 1;
    if (m.chargeCd <= 0 && d > reach && d < BOAR.chargeRange * (m.boss ? 1.3 : 1)) {
      m.state = "wind"; m.t = BOAR.wind * (m.boss ? 0.8 : 1); m.moving = 0;
      return;
    }
    if (d > reach) {
      const v = BOAR.walk * (m.boss ? 1.15 : 1) * spd;
      m.x += (dx / d) * v * dt; m.y += (dy / d) * v * RPG.squash * dt;
      m.moving = 1;
    } else {
      m.moving = 0;
      if (m.biteCd <= 0) {
        hurtHero(g, tg, m.dmg);
        fx(g, m.map, { kind: "burst", x: tg.x, y: tg.y - 26, r: 18, color: "#ffc9a0", n: 6, t: 0.3, life: 0.3 });
        m.biteCd = m.boss ? 1.4 : 1.6;
        m.bite = 0.25;
      }
    }
  } else {
    m.t -= dt;
    if (m.t <= 0) {
      if (m.state === "idle") {
        const back = far > 260;
        const a = back ? Math.atan2((m.hy - m.y) / RPG.squash, m.hx - m.x) : Math.random() * Math.PI * 2;
        const v = back ? 120 : 60 + Math.random() * 40;
        m.state = "walk"; m.t = back ? 1.2 : 0.8 + Math.random() * 1.2;
        m.vx = Math.cos(a) * v; m.vy = Math.sin(a) * v;
      } else {
        m.state = "idle"; m.t = 1 + Math.random() * 2.2; m.vx = 0; m.vy = 0;
      }
    }
    if (m.state === "walk") {
      m.x += m.vx * spd * dt;
      m.y += m.vy * spd * RPG.squash * dt;
      if (Math.abs(m.vx) > 1) m.ax = m.vx < 0 ? -1 : 1;
    }
    m.moving = m.state === "walk" ? 1 : 0;
  }
  keepMob(m);
}

function stepMob(g, m, dt) {
  if (!tickMob(g, m, dt)) return;
  if (m.type === "wolf") { stepWolf(g, m, dt); spreadPack(g, m); }
  else if (m.type === "boar") { stepBoar(g, m, dt); if (m.state !== "charge") spreadPack(g, m); }
  else stepRabbit(g, m, dt);
}

// 한 사람에게 몰려도 한 자리에 겹치지 않게 같은 무리끼리 살짝 밀어낸다(늑대 · 멧돼지)
function spreadPack(g, m) {
  for (const q of g.mobs) {
    if (q === m || q.dead || q.type !== m.type || q.map !== m.map) continue;
    const dx = m.x - q.x, dy = (m.y - q.y) / RPG.squash;
    const d = Math.hypot(dx, dy), min = (m.rad + q.rad) * 0.8;
    if (d >= min) continue;
    const push = (min - d) * 0.5 * (q.boss && !m.boss ? 1.6 : 1);
    const ux = d > 0.01 ? dx / d : Math.random() - 0.5, uy = d > 0.01 ? dy / d : Math.random() - 0.5;
    m.x += ux * push; m.y += uy * push * RPG.squash;
  }
}

/* ── 칭호 · 파티 (방장만 판정) ──────────────────────────────
   알림은 g.sys 에 남기고 손님에게도 보낸다 — 그 사람 채팅 칸에만 뜬다 */
function sys(g, pi, msg) {
  const it = { who: pi, msg, at: g.t };
  g.sys.push(it);
  if (g.sys.length > 30) g.sys.shift();
  if (g.out) g.out.push({ k: "sys", ...it });
}
const nameOf = (g, pi) => (g.names && g.names[pi]) || "모험가";
const partyOf = (g, id) => (id ? g.heroes.filter((o) => o && o.pty === id) : []);

// 조건을 채운 칭호를 준다. quiet 이면 알리지 않는다(들어올 때 예전 기록으로 받는 것)
function awardTitles(g, h, quiet) {
  TITLES.forEach((t) => {
    if (h.titles.includes(t.id) || !titleMet(h, t)) return;
    h.titles.push(t.id);
    if (!h.title) h.title = t.id;                   // 처음 얻은 칭호는 바로 단다
    if (quiet) return;
    fx(g, h.map, { kind: "call", x: h.x, y: h.y - 120, text: `칭호 「${t.name}」`, color: "#e9d39a", t: 1.4, life: 1.4,
      snd: "clear", who: h.pi });
    sys(g, h.pi, `칭호 「${t.name}」을 얻었습니다. 칭호 창에서 달 수 있습니다.`);
  });
}

// 칭호를 단다 — 얻은 것만. 빈 값이면 뗀다
export function rpgTitle(g, pi, id) {
  const h = g.heroes[pi];
  if (!h || !h.loaded) return false;
  if (id && !h.titles.includes(id)) return false;
  h.title = id || "";
  return true;
}

/* 파티 — req = { op: "invite", to } · { op: "accept" } · { op: "decline" } · { op: "leave" } */
export function rpgParty(g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req) return false;
  if (req.op === "invite") {
    const o = g.heroes[req.to];
    if (!o || o === h || !o.loaded) return false;
    if (o.pty && o.pty === h.pty) return void sys(g, pi, `${nameOf(g, o.pi)}님은 이미 같은 파티입니다.`);
    if (o.pty) return void sys(g, pi, `${nameOf(g, o.pi)}님은 다른 파티에 있습니다.`);
    if (h.pty && partyOf(g, h.pty).length >= PARTY.max) return void sys(g, pi, `파티는 ${PARTY.max}명까지입니다.`);
    o.invite = { from: pi, t: PARTY.inviteT };
    sys(g, pi, `${nameOf(g, o.pi)}님을 파티에 초대했습니다.`);
    sys(g, o.pi, `${nameOf(g, pi)}님이 파티에 초대했습니다.`);
    return true;
  }
  if (req.op === "accept" || req.op === "decline") {
    const inv = h.invite;
    h.invite = null;
    const from = inv && g.heroes[inv.from];
    if (!from) return void sys(g, pi, "초대한 사람이 서버에 없습니다.");
    if (req.op === "decline") { sys(g, from.pi, `${nameOf(g, pi)}님이 초대를 거절했습니다.`); return true; }
    if (h.pty) leaveParty(g, h);
    if (!from.pty) from.pty = g.nextParty++;
    if (partyOf(g, from.pty).length >= PARTY.max) return void sys(g, pi, `파티가 가득 찼습니다(${PARTY.max}명).`);
    h.pty = from.pty;
    partyOf(g, h.pty).forEach((o) => sys(g, o.pi, o === h ? `${nameOf(g, from.pi)}님의 파티에 들어갔습니다.` : `${nameOf(g, pi)}님이 파티에 들어왔습니다.`));
    return true;
  }
  if (req.op === "leave") {
    if (!h.pty) return false;
    leaveParty(g, h);
    sys(g, pi, "파티에서 나왔습니다.");
    return true;
  }
  return false;
}
function leaveParty(g, h) {
  const id = h.pty;
  h.pty = 0;
  partyOf(g, id).forEach((o) => sys(g, o.pi, `${nameOf(g, h.pi)}님이 파티에서 나갔습니다.`));
}

// 초대가 지나면 지우고, 혼자 남은 파티는 푼다. 칭호 조건은 0.5초마다 다시 본다
function tickSocial(g, dt) {
  const count = {};
  g.heroes.forEach((h) => {
    if (!h) return;
    if (h.invite) {
      h.invite.t -= dt;
      if (h.invite.t <= 0 || !g.heroes[h.invite.from]) h.invite = null;
    }
    if (h.pty) count[h.pty] = (count[h.pty] || 0) + 1;
  });
  g.heroes.forEach((h) => {
    if (h && h.pty && count[h.pty] < 2) { h.pty = 0; sys(g, h.pi, "파티원이 모두 떠나 파티가 풀렸습니다."); }
  });
  g.titleT -= dt;
  if (g.titleT <= 0) {
    g.titleT = 0.5;
    g.heroes.forEach((h) => { if (h && h.loaded) awardTitles(g, h, false); });
  }
}

export function rpgStep(g, dt) {
  g.t += dt;
  g.shake = Math.max(0, g.shake - dt * 1.6);
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.fx = g.fx.filter((f) => { f.t -= dt; return f.t > 0; });

  stepHeroes(g, dt);
  tickSocial(g, dt);
  g.hits = g.hits.filter((s) => {
    s.t -= dt;
    if (s.t > 0) return true;
    landHit(g, s);
    return false;
  });
  g.mobs.forEach((m) => { if (!m.dead) stepMob(g, m, dt); });
  g.mobs = g.mobs.filter((m) => !m.dead);

  // 무리마다 한 마리가 죽으면 한 마리 — 정해진 수를 넘지 않는다
  const alive = SPAWNS.map(() => 0), wait = SPAWNS.map(() => 0);
  g.mobs.forEach((m) => { alive[m.gi] += 1; });
  g.respawn = g.respawn.filter((r) => {
    r.t -= dt;
    if (r.t > 0) { wait[r.gi] += 1; return true; }
    if (alive[r.gi] < SPAWNS[r.gi].n) { spawnMob(g, r.gi); alive[r.gi] += 1; }
    return false;
  });
  SPAWNS.forEach((sp, gi) => {
    for (let i = alive[gi] + wait[gi]; i < sp.n; i++) g.respawn.push({ t: sp.respawn, gi });
  });
}

/* ── 주고받기 ──────────────────────────────────────────── */
const mapIdx = (id) => Math.max(0, MAP_IDS.indexOf(id));
// 누르고 있는 방향을 짧은 글자로 — 방장이 받은 입력을 손님이 견주어 보려고 스냅샷에 싣는다(순서는 상관없다)
export const holdKey = (dirs) => (dirs || []).map((d) => d[0]).sort().join("");

/* 가방은 스냅샷마다 보내지 않는다 — 바뀐 사람 것과, 놓쳤을 때를 대비해 차례가 된 한 사람 것만 싣는다 */
function packBags(g) {
  const out = {};
  const n = g.heroes.length;
  g.bagRR = (g.bagRR + 1) % n;
  g.heroes.forEach((h, pi) => {
    if (!h) return;
    if (h.bagSent !== h.bag || h.bagSentV !== h.bag.v || pi === g.bagRR) {
      out[pi] = h.bag;
      h.bagSent = h.bag; h.bagSentV = h.bag.v;
    }
  });
  return out;
}

export function rpgPack(g) {
  return {
    h: g.heroes.map((h) => (h
      ? [Math.round(h.x), Math.round(h.y), h.dir, Math.round(h.hp), h.max, r1(h.down), h.lv, h.xp,
        r1(h.sk), h.swing > 0 ? 1 : 0, mapIdx(h.map), h.coins, h.quest.on ? 1 : 0, h.quest.n, h.kills,
        h.flash > 0 ? 1 : 0, h.loaded ? 1 : 0, h.buff > 0 ? 1 : 0, h.guard > 0 ? 1 : 0, h.auto ? 1 : 0, h.face,
        STAT_IDS.map((k) => h.st[k]), packBuffs(h), h.admin ? 1 : 0,
        ACTIVE_SKILLS.map((s) => r1((h.scd && h.scd[s.id]) || 0)), r1(h.dashCd || 0),
        holdKey(h.hold), h.fire ? 1 : 0,
        h.pty, h.invite ? h.invite.from : -1, TITLES.findIndex((t) => t.id === h.title),
        TITLES.reduce((bits, t, i) => (h.titles.includes(t.id) ? bits | (1 << i) : bits), 0),
        REC_IDS.map((k) => h.rec[k])]
      : 0)),
    b: packBags(g),
    ver: BUILD,                                   // 방장의 빌드 — 손님이 견주어 옛 버전 방장을 알아챈다
    m: g.mobs.map((m) => [m.id, mapIdx(m.map), Math.round(m.x), Math.round(m.y), Math.round((m.hp / m.max) * 100),
      (m.freeze > 0 ? 1 : 0) | (m.slow > 0 ? 2 : 0) | (m.poison > 0 ? 4 : 0) | (m.burn > 0 ? 8 : 0)
        | (m.stun > 0 ? 16 : 0) | (m.shred > 0 ? 32 : 0) | (m.flash > 0 ? 64 : 0),
      m.ax < 0 ? 1 : 0, m.moving ? 1 : 0, MOB_TYPES.indexOf(m.type), m.lv, m.boss, m.bite > 0 ? 1 : 0]),
  };
}

export function rpgApply(g, s) {
  s.h.forEach((row, pi) => {
    if (!row) { g.heroes[pi] = null; return; }
    const map = MAP_IDS[row[10]] || "plaza";
    let h = g.heroes[pi];
    if (!h) { h = g.heroes[pi] = makeHero(pi, g.looks[pi], map); h.x = row[0]; h.y = row[1]; }
    const mine = pi === g.mySeat;
    const moved = h.map !== map;
    h.map = map;
    h.tx = row[0]; h.ty = row[1];
    // 내 영웅은 내 화면에서 먼저 걷는다. 맵을 옮겼거나 크게 벌어졌을 때만 맞춘다.
    // 방금 내 화면에서 대쉬했으면 방장 위치가 따라올 때까지 크게 벌어져도 기다린다
    const slack = mine && h.predict > 0 ? DASH.dist + 140 : h.hold.length ? 140 : 70;
    if (moved || (mine && Math.hypot(row[0] - h.x, row[1] - h.y) > slack)) {
      h.x = row[0]; h.y = row[1];
    }
    if (!mine) { h.dir = row[2]; h.face = row[20] || 0; }
    if (Array.isArray(row[21])) STAT_IDS.forEach((k, i) => { h.st[k] = row[21][i] || 0; });
    h.hp = row[3]; h.max = row[4]; h.down = row[5]; h.lv = row[6]; h.xp = row[7]; h.sk = row[8];
    if (row[9]) h.swing = Math.max(h.swing, 0.2);
    h.coins = row[11]; h.quest = { on: !!row[12], n: row[13] }; h.kills = row[14];
    if (row[15]) h.flash = 0.15;
    h.loaded = row[16]; h.buff = row[17] ? 0.3 : 0; h.guard = row[18] ? 0.3 : 0; h.auto = row[19] ? 1 : 0;
    applyBuffs(h, row[22]);
    h.admin = row[23] ? 1 : 0;
    if (Array.isArray(row[24])) { h.scd = {}; ACTIVE_SKILLS.forEach((s, i) => { h.scd[s.id] = row[24][i] || 0; }); }
    // 대쉬 대기 시간 — 내 화면에서 먼저 대쉬했으면 방장 값이 따라올 때까지 큰 쪽을 둔다
    h.dashCd = mine ? Math.max(row[25] || 0, h.dash > 0 ? h.dashCd || 0 : 0) : row[25] || 0;
    if (s.b && s.b[pi]) h.bag = s.b[pi];
    // 방장이 알고 있는 내 입력 — 손님은 이것과 내 키를 견주어, 중간에 잃은 입력을 다시 보낸다
    if (mine && row.length > 26) h.echo = { hold: row[26], fire: row[27] ? 1 : 0 };
    if (row.length > 28) {                         // 파티 · 초대 · 칭호 · 기록
      h.pty = row[28] || 0;
      h.invite = row[29] >= 0 ? { from: row[29], t: h.invite && h.invite.from === row[29] ? h.invite.t : PARTY.inviteT } : null;
      h.title = TITLES[row[30]] ? TITLES[row[30]].id : "";
      h.titles = TITLES.filter((t, i) => row[31] & (1 << i)).map((t) => t.id);
      if (Array.isArray(row[32])) REC_IDS.forEach((k, i) => { h.rec[k] = row[32][i] || 0; });
    }
  });
  const seen = new Set();
  s.m.forEach(([id, mi, x, y, pct, flags, flip, moving, ti, lv, boss, bite]) => {
    seen.add(id);
    let m = g.mobs.find((q) => q.id === id);
    if (!m) {
      const type = MOB_TYPES[ti] || "rabbit";
      const size = mobSize(type, lv || 1, boss);
      m = { id, type, lv: lv || 1, boss: boss ? 1 : 0, size, map: MAP_IDS[mi] || "field", x, y, ax: 1,
        hp: 100, max: 100, age: 0, rad: MOB[type].rad * size };
      g.mobs.push(m);
    }
    m.bite = bite ? 0.25 : 0;
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
    } else if (o.k === "note") {
      const item = { ...o };
      delete item.k;
      g.notes.push(item);
      if (g.notes.length > 20) g.notes.shift();
    } else if (o.k === "sys") {
      g.sys.push({ who: o.who, msg: o.msg, at: o.at });
      if (g.sys.length > 30) g.sys.shift();
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
      h.predict = Math.max(0, (h.predict || 0) - dt);
      if (h.dash > 0) dashStep(h, dt);             // 먼저 그린 대쉬
      else if (h.down <= 0 && h.hold.length) rpgWalk(h, dt);
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
