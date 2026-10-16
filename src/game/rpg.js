/* ── RPG 모드 ──────────────────────────────────────────────
   처음 들어오면 이름을 정한다. 이름은 이 기기에 남고 다시 바꿀 수 없다.
   그다음 직업(전사 · 마법사 · 궁수) · 원소 · 성별을 고르고 광장에 선다. 광장의 사냥문을 지나면 사냥터다.
   사냥터에는 토끼가 늘 열다섯 마리 이하로 돌아다닌다. 한 마리가 죽으면 한 마리가 새로 나온다.
   토끼 한 마리는 경험치 1 · 1코인. 사냥꾼에게 받은 퀘스트로 다섯 마리를 잡으면 경험치 10 · 15코인.

   판정은 방장 한 명이 하고, 나머지는 받은 상태를 그린다.
   레벨 · 경험치 · 코인 · 퀘스트는 각자의 기기에 이름과 함께 남아 다음에 들어와도 이어진다. */
import { P, towerIdx } from "./world.js";
import { SHOPS, SKILLS as SHOP_SKILLS, SKILL_USE, POTION } from "./shopData.js";
import { newBag, cleanBag, extraStat, tickBuffs, packBuffs, applyBuffs, equipped, addMat, matCount, jo } from "./shop.js";
import { BUILD } from "../net/version.js";
import { TITLES, TITLE_BY_ID, REC_IDS, PARTY } from "./socialData.js";
import { DROPS, MAT_BY_ID, GIFT } from "./itemData.js";
import { REQ_NPCS, REQ_BY_NPC, REQUESTS } from "./requestData.js";

export const RPG_CREW_MAX = 16;
// RPG 서버 — 방 코드 없이 모두 서버 1에 모인다. 서버 1이 가득 차면 다음 서버로 넘어간다.
// (방 만들기 코드에는 숫자 1이 나오지 않아 이 이름과 겹치지 않는다)
export const RPG_SERVERS = ["RPG1", "RPG2", "RPG3", "RPG4", "RPG5"];

// 결투 — 1대1. 파티 창에서 신청하고 상대가 수락하면 둘만 결투장 칸(MAPS.arena.rings) 하나로 옮겨 간다.
// ready 초를 센 뒤 싸우고, 한 사람이 쓰러지거나 time 초가 지나면(무승부) 끝난다. end 초 뒤 둘 다 원래 자리로 돌아가고 체력이 찬다.
// 피해는 몹을 칠 때의 dmgMul(한 방에 끝나지 않게). 결투장에서는 자동 평타가 꺼진다. 신청은 reqT 초 동안 기다린다.
// 명예 — 이기면 진 사람 명예의 honorRate 에 honorBase 를 더한 만큼 오른다(지는 쪽은 그대로). 경험치 · 코인은 없다
export const DUEL = { dmgMul: 0.3, ready: 3, time: 90, end: 2.5, reqT: 30, honorRate: 0.1, honorBase: 10 };
export const honorGain = (loserHonor) => Math.round((loserHonor || 0) * DUEL.honorRate) + DUEL.honorBase;

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
    // 가운데 분수 · 상점 노점 · 명예 순위판 · 의뢰 NPC
    blocks: [{ x: 900, y: 620, r: 96 }, ...SHOPS.map((sh) => ({ x: sh.x, y: sh.y - 6, r: 48 })), { x: 900, y: 252, r: 40 },
      ...REQ_NPCS.map((n) => ({ x: n.x, y: n.y - 4, r: 18 }))],
    // 상점 — 자리와 이름은 shopData.js 의 SHOPS. 위쪽 가운데는 명예 순위판(결투 명예 순위를 본다).
    // 의뢰 NPC 셋 — requestData.js 의 REQ_NPCS. 말을 걸면 의뢰 창이 열린다
    npcs: [
      ...SHOPS.map((sh) => ({ id: `shop-${sh.id}`, shop: sh.id, name: sh.name, keeper: sh.keeper, x: sh.x, y: sh.y })),
      { id: "honor", board: 1, name: "명예 순위", keeper: "명예의 전당", x: 900, y: 256 },
      ...REQ_NPCS.map((n) => ({ id: `req-${n.id}`, req: n.id, name: n.name, x: n.x, y: n.y })),
    ],
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
    gates: [
      { x: 90, y: 920, r: 64, to: "wolf", at: [3400, 920], label: "늑대 사냥터" },
      { x: 4110, y: 920, r: 64, to: "gorilla", at: [260, 920], label: "고릴라 사냥터 · 50~100레벨" },
    ],
    blocks: [],
    npcs: [],
    zone: [520, 3950],
    paths: [[[4170, 920], [4000, 920], [3840, 880], [3680, 900]]],   // 고릴라 사냥터로 가는 흙길
  },
  gorilla: {
    id: "gorilla", name: "고릴라 사냥터", w: 4600, h: 1800, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(16,64,36,0.30)",                  // 짙은 밀림
    gates: [
      { x: 90, y: 920, r: 64, to: "boar", at: [3990, 920], label: "멧돼지 사냥터" },
      { x: 4510, y: 920, r: 64, to: "goblin", at: [260, 920], label: "고블린 사냥터 · 100~130레벨" },
    ],
    blocks: [],
    npcs: [],
    zone: [520, 4350],
    paths: [[[4570, 920], [4400, 920], [4240, 880], [4080, 900]]],   // 고블린 사냥터로 가는 흙길
  },
  // 100레벨 넘어서는 세 곳 — 몹이 더 멀리서 알아채고, 더 오래 쫓고, 둘레의 같은 무리를 불러 함께 덤빈다(BRUTE)
  goblin: {
    id: "goblin", name: "고블린 사냥터", w: 4600, h: 1800, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(52,60,22,0.34)",                  // 축축한 늪지
    gates: [
      { x: 90, y: 920, r: 64, to: "gorilla", at: [4390, 920], label: "고릴라 사냥터" },
      { x: 4510, y: 920, r: 64, to: "orc", at: [260, 920], label: "오크 사냥터 · 130~160레벨" },
    ],
    blocks: [],
    npcs: [],
    zone: [520, 4350],
    paths: [[[4570, 920], [4400, 920], [4240, 880], [4080, 900]]],
  },
  orc: {
    id: "orc", name: "오크 사냥터", w: 4800, h: 1800, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(92,48,28,0.34)",                  // 붉은 바위 언덕
    gates: [
      { x: 90, y: 920, r: 64, to: "goblin", at: [4390, 920], label: "고블린 사냥터" },
      { x: 4710, y: 920, r: 64, to: "ogre", at: [260, 920], label: "오우거 사냥터 · 160~200레벨" },
    ],
    blocks: [],
    npcs: [],
    zone: [520, 4550],
    paths: [[[4770, 920], [4600, 920], [4440, 880], [4280, 900]]],
  },
  ogre: {
    id: "ogre", name: "오우거 사냥터", w: 5000, h: 1800, top: 170, spawn: [260, 920], bg: "field", tile: 2600,
    tint: "rgba(30,26,46,0.40)",                  // 어두운 골짜기
    gates: [{ x: 90, y: 920, r: 64, to: "orc", at: [4590, 920], label: "오크 사냥터" }],
    blocks: [],
    npcs: [],
    zone: [520, 4850],
  },
  // 결투장 — 문이 없다. 결투를 수락하면 비어 있는 칸(rings)으로 둘이 옮겨 오고, 끝나면 원래 자리로 돌아간다
  arena: {
    id: "arena", name: "결투장", w: 5400, h: 1400, top: 170, pvp: true, spawn: [700, 780], bg: "field", tile: 2600,
    tint: "rgba(96,64,36,0.30)",                  // 모래빛 — 바닥 무늬는 rpgArt.js drawArenaFloor
    gates: [],
    blocks: [],
    npcs: [],
    rings: [0, 1, 2, 3].map((i) => ({ x: 700 + i * 1300, y: 780, rx: 540, ry: 380 })),   // 칸 하나에 결투 하나
  },
};
// 스냅샷은 이 차례로 맵을 싣는다 — 새 맵은 뒤에만 더한다
const MAP_IDS = ["plaza", "field", "wolf", "boar", "gorilla", "arena", "goblin", "orc", "ogre"];

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
   고릴라는 50~100레벨, 쫓아와 주먹으로 치고 가까우면 가슴을 두드렸다가 둘레를 내려찍는다. 고릴라 왕(보스)은 110레벨.
   고블린은 100~130레벨, 작고 빠르다. 떼로 몰려와 단검으로 쉴 새 없이 찌른다. 고블린 대장(보스)은 140레벨.
   오크는 130~160레벨, 도끼로 찍고 가까우면 도끼를 치켜들었다가 둘레를 내려친다. 오크 족장(보스)은 170레벨.
   오우거는 160~200레벨, 몸이 가장 크다. 몽둥이로 치고 넓은 둘레를 내려찍는다. 오우거 왕(보스)은 210레벨.
   보스는 재료를 떨군다(itemData.js DROPS). 일반 몹은 떨구지 않는다.
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
  gorilla: {
    name: "고릴라", rad: 30,
    hp: (lv) => Math.round((3300 + 120 * (lv - 50)) * GORILLA.hpMul),   // 4,950 ~ 13,950
    dmg: (lv) => Math.round((90 + 3 * (lv - 50)) * GORILLA.dmgMul),     // 주먹 126 ~ 336 (내려찍기는 slamMul 배)
    xp: (lv) => 3 * lv, coin: (lv) => Math.round(1.5 * lv),             // 센 만큼 조금 더 준다
    size: (lv) => 1.15 + 0.008 * (lv - 50),                             // 1.15 ~ 1.55
    boss: { name: "고릴라 왕", lv: 110, hp: 150000, dmg: 420, xp: 5000, coin: 3000, size: 2.2 },
  },
  goblin: {
    name: "고블린", rad: 20,
    hp: (lv) => 14000 + 300 * (lv - 100),         // 14,000 ~ 23,000
    dmg: (lv) => 220 + 3 * (lv - 100),            // 단검 220 ~ 310 — 대신 빨리 찌른다(GOBLIN.punchCd)
    xp: (lv) => 3 * lv, coin: (lv) => Math.round(1.6 * lv),
    size: (lv) => 0.95 + 0.004 * (lv - 100),      // 0.95 ~ 1.07 — 작다
    boss: { name: "고블린 대장", lv: 140, hp: 220000, dmg: 420, xp: 6000, coin: 3600, size: 2 },
  },
  orc: {
    name: "오크", rad: 26,
    hp: (lv) => 22000 + 400 * (lv - 130),         // 22,000 ~ 34,000
    dmg: (lv) => 330 + 4 * (lv - 130),            // 도끼 330 ~ 450 (내려치기는 slamMul 배)
    xp: (lv) => Math.round(3.5 * lv), coin: (lv) => Math.round(1.8 * lv),
    size: (lv) => 1.2 + 0.005 * (lv - 130),       // 1.2 ~ 1.35
    boss: { name: "오크 족장", lv: 170, hp: 380000, dmg: 560, xp: 8000, coin: 5000, size: 2 },
  },
  ogre: {
    name: "오우거", rad: 30,
    hp: (lv) => 36000 + 500 * (lv - 160),         // 36,000 ~ 56,000
    dmg: (lv) => 450 + 5 * (lv - 160),            // 몽둥이 450 ~ 650 (내려찍기는 slamMul 배)
    xp: (lv) => 4 * lv, coin: (lv) => 2 * lv,
    size: (lv) => 1.45 + 0.006 * (lv - 160),      // 1.45 ~ 1.69 — 가장 크다
    boss: { name: "오우거 왕", lv: 210, hp: 600000, dmg: 760, xp: 11000, coin: 7000, size: 1.95 },
  },
};
// 고릴라 — 멧돼지 다음이라 한 단계 더 세게. 레벨 식(멧돼지를 이은 값)에 hpMul · dmgMul 을 곱한다.
// slamRange 안에 들면 wind 초 가슴을 두드렸다가 slamR 둘레를 내려찍는다(dmg × slamMul). 내려찍기는 cd 초마다
export const GORILLA = {
  hpMul: 1.5, dmgMul: 1.4,
  aggro: 290, walk: 165, punchCd: 1.3,
  slamRange: 170, wind: 0.7, slamR: 150, slamMul: 1.4, cd: 4.5, rest: 0.8,
  call: 0, leash: 900,
};
/* 고블린 · 오크 · 오우거 — 고릴라와 같은 셈(stepBrute)에 더 공격적인 값을 넣는다.
   aggro 알아채는 거리 · walk 쫓는 빠르기 · punchCd 한 대 치는 간격 · call 처음 덤빌 때 이 둘레의 같은 무리를 함께 부른다 ·
   leash 제자리에서 이만큼 멀어질 때까지 쫓는다(고릴라 900). slamRange 0 이면 내려찍기가 없다 */
export const GOBLIN = { aggro: 380, walk: 215, punchCd: 0.8, slamRange: 0, call: 340, leash: 1200 };
export const ORC = { aggro: 400, walk: 190, punchCd: 1.05, slamRange: 170, wind: 0.55, slamR: 150, slamMul: 1.5, cd: 4, rest: 0.6, call: 320, leash: 1200 };
export const OGRE = { aggro: 420, walk: 170, punchCd: 1.3, slamRange: 210, wind: 0.6, slamR: 200, slamMul: 1.7, cd: 4.5, rest: 0.7, call: 260, leash: 1200 };
const BRUTE = { gorilla: GORILLA, goblin: GOBLIN, orc: ORC, ogre: OGRE };
// 멧돼지 돌진 — 이 거리 안에 들면 wind 초 몸을 낮췄다가 speed 로 time 초 달린다. 돌진에 맞으면 dmg × chargeMul
export const BOAR = { aggro: 270, chargeRange: 230, wind: 0.45, speed: 430, time: 0.7, rest: 1.1, cd: 3.6, chargeMul: 1.5, walk: 150 };
const MOB_TYPES = ["rabbit", "wolf", "boar", "gorilla", "goblin", "orc", "ogre"];   // 스냅샷 차례 — 뒤에만 더한다
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
  { map: "gorilla", type: "gorilla", n: 22, lv: [50, 100], respawn: 3 },
  { map: "gorilla", type: "gorilla", boss: 1, n: 2, respawn: 10 },
  { map: "goblin", type: "goblin", n: 26, lv: [100, 130], respawn: 2.5 },
  { map: "goblin", type: "goblin", boss: 1, n: 2, respawn: 12 },
  { map: "orc", type: "orc", n: 24, lv: [130, 160], respawn: 3 },
  { map: "orc", type: "orc", boss: 1, n: 2, respawn: 14 },
  { map: "ogre", type: "ogre", n: 20, lv: [160, 200], respawn: 3.5 },
  { map: "ogre", type: "ogre", boss: 1, n: 2, respawn: 16 },
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
export const LV_MAX = 200;

/* ── 스탯 — 레벨이 오를 때마다 2포인트, 처음 만들 때 2포인트를 받는다(1 → 200레벨까지 모두 400포인트).
   스탯 하나에는 STAT_MAX 까지 찍는다. 400포인트로 한 스탯을 250까지 올리고 남은 150을 나눌 수 있다.
   물리력은 전사 · 궁수의 공격력, 마법력은 마법사의 공격력과 모든 직업의 화상 · 독 피해를 올린다. */
export const STAT_MAX = 250;          // 스탯 하나의 상한 — 100 에서 250 으로 늘렸다(한 스탯에 몰아 찍을 수 있게)
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
// 받은 값을 거른다 — 스탯마다 0~STAT_MAX, 모두 합쳐 받은 포인트를 넘지 않게
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
// 맡은 의뢰 — { NPC id: { i 의뢰 차례, n 잡은 수 } }. 없는 의뢰는 버린다
export function cleanReqs(d) {
  const out = {};
  if (!d || typeof d !== "object") return out;
  REQ_NPCS.forEach((npc) => {
    const r = d[npc.id], list = REQUESTS[npc.id] || [];
    const i = r ? Math.floor(Number(r.i)) : -1;
    if (!(i >= 0 && i < list.length)) return;
    const q = list[i];
    out[npc.id] = { i, n: q.kind === "hunt" ? clamp(Math.floor(Number(r.n) || 0), 0, q.n) : 0 };
  });
  return out;
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
    honor: Math.max(0, Math.floor(Number(r.honor) || 0)),   // 명예
    reqs: cleanReqs(r.reqs),                     // 맡은 광장 의뢰
    gift: typeof r.gift === "string" ? r.gift : "",   // 마지막으로 받은 업데이트 선물 id
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
// 레벨 · 경험치 · 코인 · 퀘스트 · 스탯 · 가방 · 칭호 · 기록 · 명예 · 의뢰를 남긴다. 가방은 저장된 기록을 실은 뒤의 것만 남긴다.
export function writeChar(d) {
  const cur = loadSave();
  if (!cur) return;
  // 레벨은 내려가는 일이 없다 — 내려간 기록이 오면 남의 기록이 섞인 것이니 남기지 않는다(서버 저장도 이 기록을 쓴다)
  if (Math.floor(Number(d.lv) || 1) < Math.floor(Number(cur.lv) || 1)) return;
  const bag = d.bag && d.bag.ld ? { ...d.bag, ld: undefined } : cur.bag;
  store({ ...cur, lv: d.lv, xp: d.xp, coins: d.coins, quest: { on: !!d.quest.on, n: d.quest.n }, stats: { ...d.st }, bag,
    rec: cleanRec(d.rec), titles: cleanTitles(d.titles), title: TITLE_BY_ID[d.title] ? d.title : "",
    honor: Math.max(0, Math.floor(Number(d.honor) || 0)), reqs: cleanReqs(d.reqs),
    gift: d.gift === GIFT.id ? GIFT.id : cur.gift || "" });
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
    duels: [],                                    // 진행 중인 결투 — 방장만 { a, b, wa, wb, ring, phase, t, cnt, ret }
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
    honor: 0,                               // 명예 — 결투에서 이기면 오른다
    reqs: {},                               // 맡은 광장 의뢰 { NPC id: { i, n } }
    gift: "",                               // 받은 업데이트 선물 id(itemData.js GIFT)
    duelInv: null, dvs: -1, dph: 0, dtl: 0, ring: -1,   // 받은 결투 신청 · 결투 상대 자리 · 단계(1 준비 2 싸움 3 끝) · 남은 초 · 결투장 칸
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
      const pend = g.pending[pi];
      delete g.pending[pi];
      if (pend) rpgJoin(g, pi, pend.d, pend.who);       // 같은 사람이 보낸 기록일 때만 싣는다(rpgJoin 이 본다)
      fx(g, "plaza", { kind: "nova", x: h.x, y: h.y - 10, r: 60, color: elemOf(h).light, n: 8, t: 0.6, life: 0.6 });
    }
  });
}

/* 들어온 사람이 알려 준 제 기록 — 아직 세워지지 않았으면 세울 때 쓴다.
   who 는 보낸 사람의 접속 id. 자리 번호만 믿으면, 그 자리를 떠난 사람이 늦게 보낸 기록이
   새로 앉은 사람에게 실려 남의 캐릭터를 덮어쓴다(레벨 100 → 36 사고). 그래서 자리 주인과 같을 때만 싣는다 */
export function rpgJoin(g, pi, d, who) {
  const h = g.heroes[pi];
  const owner = h ? h.who : g.looks[pi] && g.looks[pi].who;
  if (who !== undefined && owner && who !== owner) return;
  if (!h) { g.pending[pi] = { d, who }; return; }
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
  h.honor = Math.max(0, Math.floor(Number(d.honor) || 0));
  h.reqs = cleanReqs(d.reqs);
  h.titles = cleanTitles(d.titles);
  h.title = h.titles.includes(d.title) ? d.title : "";
  h.gift = typeof d.gift === "string" ? d.gift : "";
  if (h.gift !== GIFT.id) giveGift(g, h);         // 이번 업데이트 선물 — 캐릭터마다 한 번
  awardTitles(g, h, true);                        // 예전 캐릭터도 이미 채운 조건의 칭호는 조용히 받는다
  if (d.auto !== undefined) h.auto = d.auto ? 1 : 0;
  if (Array.isArray(d.hold)) rpgHold(g, pi, d.hold);   // 누르고 있던 방향 — 이어받을 때 멈추지 않게
  refreshHp(h, true);
  if (keepHp) h.hp = Math.min(h.max, keepHp);
  h.migr = 0;
  h.loaded = 1;
}

/* 업데이트 선물 — 물약 · 재료를 가방에 넣고 받았다고 적어 둔다. 손님 화면은 스냅샷의 선물 표시로 안내 창을 띄운다 */
function giveGift(g, h) {
  Object.entries(GIFT.potions).forEach(([id, n]) => { h.bag.p[id] = Math.min(POTION.stackMax, (h.bag.p[id] || 0) + n); });
  Object.entries(GIFT.mats).forEach(([id, n]) => addMat(h.bag, id, n));
  h.bag.v += 1;
  h.gift = GIFT.id;
  sys(g, h.pi, "업데이트 선물을 받았습니다. 가방(I)에서 확인하세요.");
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
  const R = M.rings && M.rings[o.ring];
  if (R) {                                         // 결투 중이면 제 칸(타원) 밖으로 못 나간다
    const nx = (o.x - R.x) / (R.rx - rad), ny = (o.y - R.y) / (R.ry - rad);
    const k = Math.hypot(nx, ny);
    if (k > 1) { o.x = R.x + (o.x - R.x) / k; o.y = R.y + (o.y - R.y) / k; }
  }
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
  if (isPvp(h.map) && h.dph === 1) say(g, h.map, h.x, h.y - 90, "곧 시작합니다", "#d9c9a6");
  // 사거리 안에 아무도 없어도 친다 — 겨눈 쪽으로 허공을 벤다 · 쏜다(heroAttack)
}

export function npcNear(h) {
  if (!h) return null;
  return MAPS[h.map].npcs.find((n) => dist(h.x, h.y, n.x, n.y) <= RPG.talkR) || null;
}

/* 사냥꾼에게 말을 건다 — 퀘스트를 받거나, 얼마나 남았는지 듣는다 */
export function rpgTalk(g, pi) {
  const h = g.heroes[pi];
  const npc = npcNear(h);
  if (!h || !npc || h.down > 0 || npc.shop || npc.board || npc.req) return;   // 상점 · 순위판 · 의뢰는 화면에서 창을 연다
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
  g.duels = [];
  g.heroes.forEach((h) => {
    if (!h) return;
    h.loaded = 0; h.migr = 1;                     // 기록이 다시 올 때까지 — 자리 · 체력은 그대로
    delete h.wsp;                                 // 이제 가방에서 바로 본다
    // 진행 중이던 결투는 무르고 광장으로 — 결투 기록(돌아갈 자리)은 옛 방장에게만 있었다
    if (h.dvs >= 0) {
      h.map = "plaza"; [h.x, h.y] = MAPS.plaza.spawn;
      h.down = 0; h.hp = h.max; h.dvs = -1; h.dph = 0; h.dtl = 0; h.ring = -1;
    }
    h.duelInv = null;
    h.tx = undefined; h.ty = undefined;
  });
}

/* ── 결투 (방장만 판정) ─────────────────────────────────── */
export const isPvp = (map) => !!(MAPS[map] && MAPS[map].pvp);
// 칠 수 있는 상대 — 결투가 시작된 뒤의 내 결투 상대 하나뿐
function nearFoes(g, h, x, y, range) {
  if (!isPvp(h.map) || h.dph !== 2) return [];
  const o = g.heroes[h.dvs];
  if (!o || o.map !== h.map || o.down > 0 || o.dph !== 2) return [];
  return dist(x, y, o.x, o.y) - 7 <= range ? [o] : [];
}
// 결투 상대를 친다 — 쓰러지면 결투가 끝난다(tickDuels)
function hitFoe(g, h, o, raw) {
  if (!o || o.down > 0) return;
  hurtHero(g, o, raw * DUEL.dmgMul);
}

/* 결투 신청 · 답 — req = { op: "ask", to } · { op: "accept" } · { op: "decline" } · { op: "giveup" } */
export function rpgDuel(g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req) return false;
  if (req.op === "ask") {
    const o = g.heroes[req.to];
    if (!o || o === h || !o.loaded) return false;
    if (h.dvs >= 0) return void sys(g, pi, "결투 중에는 신청할 수 없습니다.");
    if (o.dvs >= 0) return void sys(g, pi, `${nameOf(g, o.pi)}님은 지금 결투 중입니다.`);
    if (h.down > 0) return void sys(g, pi, "쓰러진 동안은 신청할 수 없습니다.");
    o.duelInv = { from: pi, t: DUEL.reqT };
    sys(g, pi, `${nameOf(g, o.pi)}님에게 결투를 신청했습니다.`);
    sys(g, o.pi, `${nameOf(g, pi)}님이 결투를 신청했습니다. (명예 ${h.honor})`);
    return true;
  }
  if (req.op === "accept" || req.op === "decline") {
    const inv = h.duelInv;
    h.duelInv = null;
    const o = inv && g.heroes[inv.from];
    if (!o) return void sys(g, pi, "신청한 사람이 서버에 없습니다.");
    if (req.op === "decline") { sys(g, o.pi, `${nameOf(g, pi)}님이 결투를 거절했습니다.`); return true; }
    if (h.dvs >= 0 || o.dvs >= 0) return void sys(g, pi, "둘 가운데 한 사람이 이미 결투 중입니다.");
    if (h.down > 0 || o.down > 0) return void sys(g, pi, "쓰러진 사람이 있어 결투를 시작할 수 없습니다.");
    const used = g.duels.map((d) => d.ring);
    const ring = MAPS.arena.rings.findIndex((_, i) => !used.includes(i));
    if (ring < 0) return void [h, o].forEach((q) => sys(g, q.pi, "결투장이 모두 차 있습니다. 잠시 뒤 다시 신청해 주세요."));
    startDuel(g, o, h, ring);
    return true;
  }
  if (req.op === "giveup") {
    const d = g.duels.find((q) => (q.a === pi || q.b === pi) && q.phase !== "end");
    if (!d) return false;
    endDuel(g, d, d.a === pi ? d.b : d.a, `${nameOf(g, pi)}님이 기권했습니다`);
    return true;
  }
  return false;
}
function startDuel(g, a, b, ring) {
  const R = MAPS.arena.rings[ring];
  const d = { a: a.pi, b: b.pi, wa: a.who, wb: b.who, ring, phase: "ready", t: DUEL.ready, cnt: DUEL.ready + 1,
    ret: [a, b].map((q) => ({ map: q.map, x: q.x, y: q.y })) };
  g.duels.push(d);
  [[a, b, -1], [b, a, 1]].forEach(([q, vs, side]) => {
    q.ret = null;
    q.map = "arena"; q.x = R.x + side * R.rx * 0.45; q.y = R.y;
    q.dir = -side; q.face = 0; q.hold = []; q.fire = 0; q.dash = 0;
    q.hp = q.max; q.down = 0; q.duelInv = null;
    q.dvs = vs.pi; q.dph = 1; q.dtl = DUEL.ready; q.ring = ring;
    sys(g, q.pi, `${nameOf(g, vs.pi)}님과 결투를 시작합니다. (상대 명예 ${vs.honor})`);
  });
  fx(g, "arena", { kind: "ring", x: R.x, y: R.y, r: 120, color: "#ffe08a", t: 0.6, life: 0.6, snd: "boss" });
}
// 결투를 끝낸다 — win 은 이긴 사람 자리(-1 이면 무승부). why 는 알림에 붙는 말
function endDuel(g, d, win, why) {
  if (d.phase === "end") return;
  d.phase = "end"; d.t = DUEL.end;
  const R = MAPS.arena.rings[d.ring];
  const w = win >= 0 ? g.heroes[win] : null, l = win >= 0 ? g.heroes[win === d.a ? d.b : d.a] : null;
  if (w) {
    const gain = honorGain(l ? l.honor : 0);
    w.honor += gain;
    w.rec.pvp += 1;
    fx(g, "arena", { kind: "call", x: w.x, y: w.y - 110, text: `승리! 명예 +${gain}`, color: "#ffd873", t: 1.6, life: 1.6, snd: "clear", who: w.pi });
    sys(g, w.pi, `결투에서 이겼습니다${why ? ` — ${why}` : ""}. 명예 +${gain} (지금 ${w.honor})`);
    if (l) {
      fx(g, "arena", { kind: "call", x: l.x, y: l.y - 110, text: "패배", color: "#e9b0a0", t: 1.6, life: 1.6, who: l.pi });
      sys(g, l.pi, `결투에서 졌습니다${why ? ` — ${why}` : ""}.`);
    }
  } else {
    fx(g, "arena", { kind: "call", x: R.x, y: R.y - 140, text: "무승부", color: "#e8dcc0", t: 1.6, life: 1.6 });
    [d.a, d.b].forEach((pi) => g.heroes[pi] && sys(g, pi, "결투가 무승부로 끝났습니다. 명예는 그대로입니다."));
  }
  [d.a, d.b].forEach((pi) => { const q = g.heroes[pi]; if (q && q.dvs >= 0) { q.dph = 3; q.dtl = DUEL.end; } });
}
// 결투 진행 — 신청 시간 · 세기 · 승부 · 돌려보내기
function tickDuels(g, dt) {
  g.heroes.forEach((h) => {
    if (!h || !h.duelInv) return;
    h.duelInv.t -= dt;
    if (h.duelInv.t <= 0 || !g.heroes[h.duelInv.from]) h.duelInv = null;
  });
  g.duels = g.duels.filter((d) => {
    const a = g.heroes[d.a], b = g.heroes[d.b];
    const aOk = a && a.who === d.wa, bOk = b && b.who === d.wb;
    if (d.phase !== "end" && (!aOk || !bOk)) {     // 한 사람이 서버를 떠났다 — 남은 사람이 이긴다
      endDuel(g, d, aOk ? d.a : bOk ? d.b : -1, "상대가 서버를 떠났습니다");
    }
    d.t -= dt;
    const R = MAPS.arena.rings[d.ring];
    if (d.phase === "ready") {
      const n = Math.ceil(d.t);
      if (n < d.cnt && n > 0) {
        d.cnt = n;
        fx(g, "arena", { kind: "call", x: R.x, y: R.y - 150, text: String(n), color: "#ffe08a", t: 0.8, life: 0.8, snd: "build" });
      }
      if (d.t <= 0) {
        d.phase = "fight"; d.t = DUEL.time;
        fx(g, "arena", { kind: "call", x: R.x, y: R.y - 150, text: "시작!", color: "#ffd873", t: 0.9, life: 0.9, snd: "wave" });
      }
    } else if (d.phase === "fight") {
      if (a.down > 0 || b.down > 0) endDuel(g, d, a.down > 0 ? d.b : d.a, "");
      else if (d.t <= 0) endDuel(g, d, -1, "");
    } else if (d.t <= 0) {                         // 끝 — 둘 다 원래 자리로 돌려보낸다
      [[d.a, aOk, 0], [d.b, bOk, 1]].forEach(([pi, ok, i]) => {
        const q = g.heroes[pi];
        if (!q || !ok) return;
        const r = d.ret[i];
        const back = MAPS[r.map] && !MAPS[r.map].pvp ? r : { map: "plaza", x: MAPS.plaza.spawn[0], y: MAPS.plaza.spawn[1] };
        q.map = back.map; q.x = back.x; q.y = back.y;
        q.down = 0; q.hp = q.max; q.dvs = -1; q.dph = 0; q.dtl = 0; q.ring = -1; q.gateCd = 1;
      });
      return false;
    }
    const ph = d.phase === "ready" ? 1 : d.phase === "fight" ? 2 : 3;
    [a, b].forEach((q, i) => { if (q && (i ? bOk : aOk)) { q.dph = ph; q.dtl = Math.max(0, d.t); } });
    return true;
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
  if (h && !(m.hitBy || (m.hitBy = [])).includes(pi)) m.hitBy.push(pi);   // 친 사람 — 잡히면 모두 보상을 받는다
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

/* 몹을 잡았다 — 그 몹을 한 번이라도 친 사람 가운데 같은 맵에 있는 사람이 모두 경험치 · 코인을 다 받는다(막타만이 아니다).
   잡은 수 · 퀘스트 · 사냥 의뢰도 저마다 센다. 치지 않은 파티원은 같은 맵이면 경험치의 PARTY.share 만큼 받는다 */
function killMob(g, m, pi) {
  if (m.dead) return;
  m.dead = true;
  m.hp = 0;
  flushNum(g, m, 1);
  fx(g, m.map, { kind: "poof", x: m.x, y: m.y - 6, t: 0.45, life: 0.45, color: "rgba(236,230,216,1)" });
  g.respawn.push({ t: SPAWNS[m.gi].respawn, gi: m.gi });
  if (!g.heroes[pi]) return;
  const got = [...new Set([...(m.hitBy || []), pi])].map((qi) => g.heroes[qi])
    .filter((q) => q && q.map === m.map && (q.loaded || q.pi === pi));
  if (m.boss) {
    fx(g, m.map, { kind: "call", x: m.x, y: m.y - 30 - 50 * m.size, text: `${mobName(m)} 처치!`, color: "#ffd873",
      t: 1.4, life: 1.4, snd: "clear", who: pi });
  }
  got.forEach((h) => rewardKill(g, m, h, h.pi === pi));
  // 치지 않은 파티원 — 같은 맵이면 경험치를 나눠 받는다(코인은 없다)
  const part = Math.max(1, Math.round(m.xp * PARTY.share));
  const ptys = new Set(got.filter((h) => h.pty).map((h) => h.pty));
  g.heroes.forEach((o) => {
    if (!o || !o.loaded || !o.pty || !ptys.has(o.pty) || o.map !== m.map || got.includes(o)) return;
    fx(g, o.map, { kind: "text", x: o.x, y: o.y - 100, text: `+${part} XP 파티`, color: "#a9e79c", t: 0.9, life: 0.9, who: o.pi });
    giveXp(g, o, part);
  });
  if (m.boss) dropLoot(g, got, m);
}
// 한 사람 몫 — 막타를 친 사람은 몹 자리에, 나머지는 제 머리 위에 숫자를 띄운다
function rewardKill(g, m, h, last) {
  h.kills += 1;
  h.coins += m.coin;
  h.rec[m.type] += 1;
  if (m.boss) h.rec.boss += 1;
  if (h.pty) h.rec.party += 1;
  fx(g, m.map, { kind: "text", x: last ? m.x : h.x, y: last ? m.y - 16 : h.y - 100, text: `+${m.xp} XP · +${m.coin} 코인`, color: "#f3d27f",
    t: 0.9, life: 0.9, snd: "coin", who: h.pi });
  giveXp(g, h, m.xp);
  huntReq(g, h, m);
  if (h.quest.on && m.type === "rabbit") {
    h.quest.n += 1;
    if (h.quest.n >= QUEST.need) {
      h.quest = { on: false, n: 0 };
      h.coins += QUEST.coin;
      h.rec.quest += 1;
      fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: `퀘스트 완료! +${QUEST.xp} XP · +${QUEST.coin} 코인`,
        color: "#a9e79c", t: 1.4, life: 1.4, snd: "clear", who: h.pi });
      giveXp(g, h, QUEST.xp);
    }
  }
}

/* 보스 재료 — 그 보스를 친 사람 가운데 같은 맵에 있는 사람(got)이 저마다 받는다(itemData.js DROPS) */
function dropLoot(g, got, m) {
  const d = DROPS[m.type];
  if (!d) return;
  const mat = MAT_BY_ID[d.id];
  got.forEach((q) => {
    const qi = q.pi;
    if (!q.loaded) return;
    const n = d.n + (Math.random() < d.bonus ? 1 : 0);
    const put = addMat(q.bag, d.id, n);
    if (!put) return void sys(g, qi, `${jo(mat.name, "이", "가")} 가득 차 더 받지 못했습니다.`);
    fx(g, q.map, { kind: "call", x: q.x, y: q.y - 128, text: `${mat.name} ×${put}`, color: mat.color, t: 1.5, life: 1.5,
      snd: mat.stone ? "clear" : "coin", who: qi });
    sys(g, qi, `${mobName(m)}에게서 ${mat.name} ${put}개를 얻었습니다.${n > d.n ? " (행운! 하나 더)" : ""}`);
  });
}

/* ── 광장 의뢰 (requestData.js) ───────────────────────────── */
// 잡은 몹이 맡은 사냥 의뢰의 몹이면 하나 센다
function huntReq(g, h, m) {
  REQ_NPCS.forEach((npc) => {
    const r = h.reqs[npc.id];
    const q = r && REQUESTS[npc.id][r.i];
    if (!q || q.kind !== "hunt" || q.mob !== m.type || r.n >= q.n) return;
    r.n += 1;
    if (r.n >= q.n) sys(g, h.pi, `의뢰를 마쳤습니다. 광장의 ${npc.name}에게 알려 주세요.`);
  });
}
// 의뢰를 끝낼 수 있는지 — 막히는 이유를 모은다(빈 목록이면 끝낼 수 있다)
export function whyReqDone(h, npcId) {
  const r = h && h.reqs && h.reqs[npcId];
  const q = r && (REQUESTS[npcId] || [])[r.i];
  if (!q) return ["맡은 의뢰가 없습니다"];
  if (q.kind === "hunt") return r.n >= q.n ? [] : [`${MOB[q.mob].name} ${q.n - r.n}마리 남았습니다`];
  const have = matCount(h.bag, q.mat);
  return have >= q.n ? [] : [`${MAT_BY_ID[q.mat].name} ${q.n - have}개 모자랍니다`];
}
export const reqNear = (h, npcId) => {
  const n = REQ_BY_NPC[npcId];
  return !!(h && n && h.map === "plaza" && dist(h.x, h.y, n.x, n.y) <= RPG.talkR * 1.5);
};
/* 의뢰 — req = { op: "take", npc, i } · { op: "done", npc } · { op: "drop", npc } (방장만 판정) */
export function rpgRequest(g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || !REQ_BY_NPC[req.npc]) return false;
  const npc = REQ_BY_NPC[req.npc], list = REQUESTS[npc.id];
  if (!reqNear(h, npc.id)) return void sys(g, pi, `${npc.name} 가까이 가야 합니다.`);
  const cur = h.reqs[npc.id];
  if (req.op === "take") {
    const i = Math.floor(Number(req.i));
    const q = list[i];
    if (!q) return false;
    if (cur) return void sys(g, pi, "이미 맡은 의뢰가 있습니다. 끝내거나 포기한 뒤 받을 수 있습니다.");
    if (h.lv < q.lv) return void sys(g, pi, `레벨 ${q.lv}부터 받을 수 있습니다.`);
    h.reqs[npc.id] = { i, n: 0 };
    fx(g, h.map, { kind: "call", x: npc.x, y: npc.y - 96, text: "의뢰 받음", color: "#ffe08a", t: 0.9, life: 0.9, snd: "build", who: pi });
    return true;
  }
  if (req.op === "drop") {
    if (!cur) return false;
    delete h.reqs[npc.id];
    sys(g, pi, `${npc.name}의 의뢰를 포기했습니다.`);
    return true;
  }
  if (req.op === "done") {
    const why = whyReqDone(h, npc.id);
    if (why.length) return void sys(g, pi, why.join(" · "));
    const q = list[cur.i];
    if (q.kind === "collect") {
      h.bag.m[q.mat] -= q.n;
      if (h.bag.m[q.mat] <= 0) delete h.bag.m[q.mat];
      h.bag.v += 1;
    }
    delete h.reqs[npc.id];
    h.coins += q.coin || 0;
    h.rec.req += 1;
    const got = Object.entries(q.mats || {}).map(([id, n]) => `${MAT_BY_ID[id].name} ${addMat(h.bag, id, n)}개`);
    const xp = Math.max(1, Math.round(needXp(h.lv) * (q.xp || 0)));
    const parts = [q.coin ? `${q.coin.toLocaleString("ko-KR")}코인` : "", h.lv < LV_MAX ? `경험치 ${xp}` : "", ...got].filter(Boolean);
    fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "의뢰 완료!", color: "#a9e79c", t: 1.4, life: 1.4, snd: "clear", who: pi });
    sys(g, pi, `${npc.name}의 의뢰를 끝냈습니다. ${parts.join(" · ")}`);
    giveXp(g, h, xp);
    return true;
  }
  return false;
}

function giveXp(g, h, amt) {
  h.xp += amt;
  let up = 0;
  while (h.lv < LV_MAX && h.xp >= needXp(h.lv)) {
    h.xp -= needXp(h.lv);
    h.lv += 1;
    up += 1;
    refreshHp(h, false);
    if (h.down <= 0) h.hp = h.max;             // 레벨이 오르면 체력이 가득 찬다
  }
  if (h.lv >= LV_MAX) h.xp = 0;
  if (!up) return;
  // 레벨업 연출 — 빛기둥 · 고리 · 반짝이 · 글자(art.js "lvup"). 여러 레벨이 한꺼번에 올라도 한 번만. 소리는 그 사람에게만
  fx(g, h.map, { kind: "lvup", x: h.x, y: h.y, text: `Lv ${h.lv} · 스탯 +${STAT_PER_LV * up}`, t: 1.8, life: 1.8, snd: "lvup", who: h.pi });
  fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 10, r: 70, color: "#ffe08a", n: 14, t: 0.7, life: 0.7 });
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
    h.down = isPvp(h.map) ? DUEL.end + 1 : RPG.down;   // 결투에서 쓰러지면 결투가 끝날 때 일어난다
    h.hold = [];
    fx(g, h.map, { kind: "burst", x: h.x, y: h.y - 30, r: 40, color: "#ff9a8a", n: 10, t: 0.5, life: 0.5 });
    say(g, h.map, h.x, h.y - 90, isPvp(h.map) ? "쓰러짐" : "쓰러짐 — 광장에서 일어납니다", "#ffbdb2");
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

/* ── 영웅의 공격 — 사거리 안의 몹을 친다 ───────────────────────
   force 는 스페이스로 친 것 — 사거리 안에 아무도 없어도 겨눈 쪽으로 허공을 벤다 · 쏜다(사거리는 표시일 뿐).
   자동 평타는 사거리 안에 몹이 있을 때만 나간다 */
function heroAttack(g, h, force) {
  const pi = h.pi;
  const map = h.map;
  const job = jobOf(h), el = elemOf(h);
  const dmg = job.dmg * heroDmgMul(h);
  const rng = heroRange(h);
  const hy = h.y - 34;
  if (isPvp(map)) return pvpAttack(g, h, job, el, dmg, rng, hy, force);

  if (job.id === "warrior") {                     // 전사 — 둘레를 한 번에 벤다
    const list = nearMobs(g, map, h.x, h.y, rng);
    if (!list.length) return force && swingAir(g, h, el);
    h.dir = list[0].x < h.x ? -1 : 1;
    h.face = 0;
    list.forEach((m) => { hitMob(g, pi, m, dmg); soak(g, h, m, 0); });
    afterHit(g, h, list[0], list[0].x, list[0].y, dmg);
    fx(g, map, { kind: "slash", x: h.x + h.dir * 30, y: h.y - 30, a: h.dir > 0 ? 0 : Math.PI,
      color: el.light, t: 0.24, life: 0.24, snd: "slash" });
    return true;
  }

  // 마법사 · 궁수 — 가장 가까운 몹에게 날린다. 없으면 겨눈 쪽 사거리 끝으로 날린다
  const [m] = nearMobs(g, map, h.x, h.y, rng, 1);
  if (!m) return force && shootAir(g, h, job, el, dmg, rng, hy);
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

// 겨누는 방향 — 누르고 있는 방향, 없으면 바라보는 쪽(좌우). 단위 벡터
export function aimDir(h) {
  let dx = 0, dy = 0;
  (h.hold || []).forEach((d) => {
    if (d === "left") dx -= 1; else if (d === "right") dx += 1; else if (d === "up") dy -= 1; else if (d === "down") dy += 1;
  });
  if (!dx && !dy) dx = h.dir || 1;
  const l = Math.hypot(dx, dy);
  return [dx / l, dy / l];
}
// 겨눈 곳 — 내 자리에서 r 만큼 떨어진 곳(위아래는 땅 비율로 줄인다)
function aimAt(h, r) {
  const [ax, ay] = aimDir(h);
  if (ax) h.dir = ax < 0 ? -1 : 1;
  return [h.x + ax * r, h.y + ay * r * RPG.squash];
}
// 허공 베기 — 맞는 것은 없고 베는 모습만
function swingAir(g, h, el) {
  aimAt(h, 1);
  h.face = 0;
  fx(g, h.map, { kind: "slash", x: h.x + h.dir * 30, y: h.y - 30, a: h.dir > 0 ? 0 : Math.PI,
    color: el.light, t: 0.24, life: 0.24, snd: "slash" });
  return true;
}
// 허공 쏘기 — 사거리 끝까지 날아간다. 마법 구슬은 떨어진 자리 둘레를 친다(landHit)
function shootAir(g, h, job, el, dmg, rng, hy) {
  const [tx, ty] = aimAt(h, rng);
  h.face = 0;
  const fly = job.fly || 0.2;
  if (job.id === "mage") {
    fx(g, h.map, { kind: "shot", x0: h.x + h.dir * 14, y0: hy, x1: tx, y1: ty - 10, style: "orb",
      art: ELEM_ART[el.id].fly || 0, r: 22, color: el.light, t: fly, life: fly, snd: "orb" });
  } else {
    fx(g, h.map, { kind: "shot", x0: h.x, y0: hy, x1: tx, y1: ty - 10, style: "arrow", color: el.light, t: fly, life: fly, snd: "shot" });
  }
  if (job.splash && !isPvp(h.map)) g.hits.push({ t: fly, pi: h.pi, mid: -1, x: tx, y: ty, map: h.map, dmg, splash: job.splash });
  return true;
}

// 결투장 평타 — 몹 대신 사람을 친다. 원소 효과는 싣지 않는다
function pvpAttack(g, h, job, el, dmg, rng, hy, force) {
  const map = h.map, pi = h.pi;
  if (job.id === "warrior") {
    const list = nearFoes(g, h, h.x, h.y, rng);
    if (!list.length) return force && h.dph === 2 && swingAir(g, h, el);
    h.dir = list[0].x < h.x ? -1 : 1;
    h.face = 0;
    list.forEach((o) => hitFoe(g, h, o, dmg));
    fx(g, map, { kind: "slash", x: h.x + h.dir * 30, y: h.y - 30, a: h.dir > 0 ? 0 : Math.PI,
      color: el.light, t: 0.24, life: 0.24, snd: "slash" });
    return true;
  }
  const [o] = nearFoes(g, h, h.x, h.y, rng);
  if (!o) return force && h.dph === 2 && shootAir(g, h, job, el, dmg, rng, hy);
  h.dir = o.x < h.x ? -1 : 1;
  h.face = 0;
  const fly = job.fly || 0.2;
  const art = ELEM_ART[el.id];
  if (job.id === "mage") {
    fx(g, map, { kind: "shot", x0: h.x + h.dir * 14, y0: hy, x1: o.x, y1: o.y - 30, style: "orb",
      art: art.fly || 0, r: 22, color: el.light, t: fly, life: fly, snd: "orb" });
  } else {
    fx(g, map, { kind: "shot", x0: h.x, y0: hy, x1: o.x, y1: o.y - 30, style: "arrow",
      color: el.light, t: fly, life: fly, snd: "shot" });
  }
  g.hits.push({ t: fly, pi, hid: o.pi, x: o.x, y: o.y, map, dmg, splash: job.splash || 0 });
  return true;
}
// 결투장에서 날아간 것이 닿았다 — 그 사이 맵을 떠났거나 쓰러졌으면 빗나간다
function landFoe(g, s, h) {
  const o = g.heroes[s.hid];
  const el = elemOf(h);
  if (!o || o.map !== s.map || o.down > 0) return;
  if (s.splash) {
    nearFoes(g, h, o.x, o.y, s.splash).forEach((q) => hitFoe(g, h, q, s.dmg * (q === o ? 1 : 0.5)));
    fx(g, s.map, { kind: "art", art: ELEM_ART[el.id].hit, x: o.x, y: o.y - 4, r: 34, t: 0.4, life: 0.4 });
  } else {
    if (!nearFoes(g, h, o.x, o.y, 1).includes(o)) return;   // 쉼터로 들어갔거나 같은 파티가 됐다
    hitFoe(g, h, o, s.dmg);
    fx(g, s.map, { kind: "burst", x: o.x, y: o.y - 30, r: 18, color: el.light, n: 6, t: 0.3, life: 0.3 });
  }
}

// 날아간 것이 닿았다
function landHit(g, s) {
  const h = g.heroes[s.pi];
  if (h && s.hid !== undefined) return landFoe(g, s, h);
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
    hitMob(g, s.pi, m, s.dmg, s.skill, s.sure);
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

  // 결투장이면 몹 대신 사람을 고른다
  const pvp = isPvp(map);
  if (pvp && h.dph !== 2) return say(g, map, h.x, h.y - 90, "곧 시작합니다", "#d9c9a6");
  const near = (x, y, r, n) => (pvp ? nearFoes(g, h, x, y, r) : nearMobs(g, map, x, y, r, n));
  let cx = h.x, cy = h.y, list, mul;
  if (job.id === "warrior") {
    list = near(h.x, h.y, 240); mul = 3;
  } else if (job.id === "mage") {
    const [t] = near(h.x, h.y, 360, 1);
    if (t) { cx = t.x; cy = t.y; } else [cx, cy] = aimAt(h, 200);   // 아무도 없으면 겨눈 쪽에 터뜨린다
    list = near(cx, cy, 200); mul = 2.8;
  } else {
    list = near(h.x, h.y, 300); mul = 2.6;
  }
  // 닿는 것이 없어도 기술은 나간다(대기 시간도 돈다) — 사거리는 표시일 뿐
  if (cx !== h.x) h.dir = cx < h.x ? -1 : 1;
  h.face = 0;

  list.forEach((m) => {
    if (pvp) return hitFoe(g, h, m, base * mul);
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
  const [dx, dy] = aimDir(h);
  const v = DASH.dist / DASH.time;
  h.dvx = dx * v; h.dvy = dy * v;
  if (dx) h.dir = dx < 0 ? -1 : 1;
  h.dash = DASH.time; h.inv = DASH.inv; h.dashCd = DASH.cd;
  return true;
}
// 돌진 — 상대 바로 앞(몸 반지름 + LUNGE_GAP)까지 time 초에 달려간다. 대쉬와 같은 걸음(dashStep)으로 움직이고 그동안 맞지 않는다
const LUNGE_GAP = 26;
function lungeTo(h, o, time) {
  const dx = o.x - h.x, dy = (o.y - h.y) / RPG.squash;
  const d = Math.hypot(dx, dy) || 1;
  const go = Math.max(0, d - ((o.rad || 16) * 0.5 + LUNGE_GAP));
  h.dvx = (dx / d) * (go / time); h.dvy = (dy / d) * (go / time);
  if (Math.abs(dx) > 1) h.dir = dx < 0 ? -1 : 1;
  h.face = 0;
  h.dash = time; h.inv = Math.max(h.inv || 0, time + 0.1);
}
// 손님 화면에서 먼저 그리는 급소 찌르기 돌진 — 방장 판정과 같은 상대를 고른다. 판정(피해)은 방장만 한다
export function predictLunge(g, h, id) {
  const s = ACTIVE_SKILLS.find((q) => q.id === id);
  const L = s && s.use.lunge;
  if (!L || !h || h.down > 0 || !(h.bag && h.bag.s[id] > 0) || (h.scd && h.scd[id] > 0) || MAPS[h.map].safe) return false;
  const pvp = isPvp(h.map);
  if (pvp && h.dph !== 2) return false;
  let o = pvp ? g.heroes[h.dvs] : nearMobs(g, h.map, h.x, h.y, L.reach, 1)[0];
  if (o && (o.map !== h.map || o.down > 0 || dist(h.x, h.y, o.x, o.y) - (pvp ? 7 : (o.rad || 0) * 0.5) > L.reach)) o = null;
  if (!o) {                                        // 아무도 없으면 겨눈 쪽으로 끝까지 — 방장 판정과 같다
    const [tx, ty] = aimAt(h, L.reach);
    o = { x: tx, y: ty, rad: -2 * LUNGE_GAP };
  }
  lungeTo(h, o, L.time);
  h.predict = 0.6;
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
    const pvp = isPvp(map);
    if (pvp && h.dph !== 2) return say(g, map, h.x, h.y - 90, "곧 시작합니다", "#d9c9a6");
    // 결투장이면 사람에게 — 치명타 보장 스킬은 치명타 피해 배율을 곱한다
    const strike = (m) => (pvp ? hitFoe(g, h, m, dmg * (u.crit ? critMul(h) : 1)) : hitMob(g, pi, m, dmg, true, u.crit));
    if (u.radius) {                                // 둘레를 모두
      const list = pvp ? nearFoes(g, h, h.x, h.y, u.radius) : nearMobs(g, map, h.x, h.y, u.radius);
      list.forEach(strike);                        // 닿는 것이 없어도 쓴다
      fx(g, map, { kind: "nova", x: h.x, y: h.y - 8, r: u.radius, color: "#c9b6f0", n: 18, t: 0.7, life: 0.7, snd: "boom" });
    } else if (u.lunge) {                          // 급소 찌르기 — 가장 가까운 적 앞까지 돌진해 찌른다
      const L = u.lunge;
      const [m] = pvp ? nearFoes(g, h, h.x, h.y, L.reach) : nearMobs(g, map, h.x, h.y, L.reach, 1);
      const x0 = h.x, y0 = h.y;
      if (!m) {                                    // 아무도 없으면 겨눈 쪽으로 끝까지 돌진한다
        const [tx, ty] = aimAt(h, L.reach);
        lungeTo(h, { x: tx, y: ty, rad: -2 * LUNGE_GAP }, L.time);
        fx(g, map, { kind: "burst", x: x0, y: y0 - 10, r: 22, color: "#ffe9b0", n: 8, t: 0.3, life: 0.3, snd: "slash" });
      } else {
      lungeTo(h, m, L.time);
      fx(g, map, { kind: "burst", x: x0, y: y0 - 10, r: 22, color: "#ffe9b0", n: 8, t: 0.3, life: 0.3, snd: "slash" });
      // 닿는 순간에 찌른다 — 그사이 상대가 쓰러졌거나 맵을 떠났으면 빗나간다
      const hit = { t: L.time, pi, x: m.x, y: m.y, map, splash: 0, skill: true, sure: !!u.crit };
      g.hits.push(pvp ? { ...hit, hid: m.pi, dmg: dmg * (u.crit ? critMul(h) : 1) } : { ...hit, mid: m.id, dmg });
      }
    } else {                                       // 가장 가까운 하나
      const reach = heroRange(h) * SKILL_USE.reach;
      const [m] = pvp ? nearFoes(g, h, h.x, h.y, reach) : nearMobs(g, map, h.x, h.y, reach, 1);
      // 아무도 없으면 겨눈 쪽 사거리 끝을 친다(맞는 것은 없다)
      const [bx, by] = m ? [m.x, m.y] : aimAt(h, Math.min(reach, 140));
      if (m) { h.dir = m.x < h.x ? -1 : 1; strike(m); }
      fx(g, map, { kind: "burst", x: bx, y: by - 14, r: 30, color: u.crit ? "#ffd873" : "#f2e3c2", n: 10, t: 0.4, life: 0.4, snd: "crit" });
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
      if (h.dvs >= 0) return;                     // 결투에서 쓰러졌다 — 결투가 끝나면 원래 자리로 돌아간다(tickDuels)
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
    const force = !!h.fire || h.fireQ > 0;          // 스페이스 — 사거리 안에 아무도 없어도 친다
    if ((!h.auto || isPvp(h.map)) && !force) return;   // 결투장에서는 자동 평타를 끈다
    if (heroAttack(g, h, force)) { h.cd = heroCd(h); h.swing = 0.25; h.fireQ = 0; }
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

/* 고릴라 · 고블린 · 오크 · 오우거 — 쫓아와 치고, 가까우면 기운을 모았다가(wind) 둘레를 내려찍는다(slam). 값은 BRUTE 의 표.
   고릴라는 가슴을 두드리고, 오크는 도끼를, 오우거는 몽둥이를 치켜든다. 고블린은 내려찍기 없이 빠르게 찌른다.
   기운을 모으는 동안 bite 를 켜 둬 손님 화면에서도 일어선 모습이 보인다.
   call 이 있으면 처음 덤빌 때 둘레의 같은 무리도 같은 사람에게 덤빈다 */
function stepBrute(g, m, dt, P) {
  const spd = m.slow > 0 ? 0.5 : 1;
  m.chargeCd = Math.max(0, m.chargeCd - dt);
  if (m.state === "wind") {
    m.moving = 0; m.bite = 0.2;
    m.t -= dt;
    if (m.t <= 0) {                                  // 내려찍기 — 둘레의 사람 모두
      const r = P.slamR * (m.boss ? 1.35 : 1);
      g.heroes.forEach((h) => {
        if (!h || h.map !== m.map || h.down > 0 || dist(m.x, m.y, h.x, h.y) > r + 16) return;
        hurtHero(g, h, m.dmg * P.slamMul);
        fx(g, m.map, { kind: "burst", x: h.x, y: h.y - 26, r: 22, color: "#d8cbb8", n: 7, t: 0.32, life: 0.32 });
      });
      fx(g, m.map, { kind: "ring", x: m.x, y: m.y, r, color: "#cbb79a", t: 0.45, life: 0.45 });
      fx(g, m.map, { kind: "burst", x: m.x + m.ax * 20 * m.size, y: m.y - 6, r: 30 * m.size, color: "#a68f72", n: 12, t: 0.4, life: 0.4, snd: "boom" });
      m.state = "rest"; m.t = P.rest; m.chargeCd = P.cd * (m.boss ? 0.7 : 1);
    }
    keepMob(m);
    return;
  }
  if (m.state === "rest") {
    m.moving = 0;
    m.t -= dt;
    if (m.t <= 0) { m.state = "idle"; m.t = 0.3; }
    return;
  }
  const aggro = m.boss ? P.aggro * 1.3 : P.aggro;
  const far = Math.hypot(m.x - m.hx, (m.y - m.hy) / RPG.squash);
  let tg = m.tgt >= 0 ? g.heroes[m.tgt] : null;
  if (tg && (tg.map !== m.map || tg.down > 0 || dist(m.x, m.y, tg.x, tg.y) > aggro * 2.2 || far > P.leash)) { tg = null; m.tgt = -1; }
  if (!tg && far < P.leash * 0.78) {
    const near = nearestHero(g, m, aggro);
    if (near) { tg = near; m.tgt = near.pi; }
  }
  if (!tg) m.called = 0;
  else if (P.call && !m.called) {                   // 둘레의 같은 무리를 부른다
    m.called = 1;
    g.mobs.forEach((q) => {
      if (q === m || q.dead || q.type !== m.type || q.map !== m.map || q.tgt >= 0) return;
      if (dist(m.x, m.y, q.x, q.y) > P.call) return;
      q.tgt = tg.pi; q.called = 1;
    });
  }
  if (tg) {
    const dx = tg.x - m.x, dy = (tg.y - m.y) / RPG.squash;
    const d = Math.hypot(dx, dy) || 1;
    const reach = m.rad + 16;
    if (Math.abs(dx) > 2) m.ax = dx < 0 ? -1 : 1;
    if (P.slamRange && m.chargeCd <= 0 && d < P.slamRange * (m.boss ? 1.3 : 1)) {
      m.state = "wind"; m.t = P.wind * (m.boss ? 0.8 : 1); m.moving = 0;
      return;
    }
    if (d > reach) {
      const v = P.walk * (m.boss ? 1.1 : 1) * spd;
      m.x += (dx / d) * v * dt; m.y += (dy / d) * v * RPG.squash * dt;
      m.moving = 1;
    } else {
      m.moving = 0;
      if (m.biteCd <= 0) {                          // 한 대
        hurtHero(g, tg, m.dmg);
        fx(g, m.map, { kind: "burst", x: tg.x, y: tg.y - 26, r: 18, color: "#d8cbb8", n: 6, t: 0.3, life: 0.3 });
        m.biteCd = P.punchCd * (m.boss ? 0.85 : 1);
        if (!P.slamRange) m.bite = 0.2;             // 고블린 — 찌르는 모습(그림만)
      }
    }
  } else {
    m.t -= dt;
    if (m.t <= 0) {
      if (m.state === "idle") {
        const back = far > 260;
        const a = back ? Math.atan2((m.hy - m.y) / RPG.squash, m.hx - m.x) : Math.random() * Math.PI * 2;
        const v = back ? 120 : 50 + Math.random() * 40;
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
  else if (BRUTE[m.type]) { stepBrute(g, m, dt, BRUTE[m.type]); spreadPack(g, m); }
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
  tickDuels(g, dt);
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

// 장착한 특별 무기 id — 손님은 스냅샷으로 받은 값(wsp), 방장은 가방에서 바로 본다
export function heldSpecial(h) {
  if (!h) return "";
  if (h.wsp !== undefined) return h.wsp;
  const w = h.bag && equipped(h.bag);
  return (w && w.sp) || "";
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
  const busy = new Set(g.heroes.filter(Boolean).map((h) => h.map));
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
        REC_IDS.map((k) => h.rec[k]), heldSpecial(h),
        h.honor || 0, h.duelInv ? h.duelInv.from : -1, h.dvs, h.dph, r1(h.dtl || 0), h.ring,
        REQ_NPCS.map((n) => (h.reqs[n.id] ? [h.reqs[n.id].i, h.reqs[n.id].n] : 0)), h.gift === GIFT.id ? 1 : 0]
      : 0)),
    b: packBags(g),
    ver: BUILD,                                   // 방장의 빌드 — 손님이 견주어 옛 버전 방장을 알아챈다
    // 몹은 사람이 있는 맵의 것만 — 사냥터가 늘어 모두 보내면 메시지가 너무 커진다(손님은 제 맵만 그린다)
    m: g.mobs.filter((m) => busy.has(m.map)).map((m) => [m.id, mapIdx(m.map), Math.round(m.x), Math.round(m.y), Math.round((m.hp / m.max) * 100),
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
    if (row.length > 33) h.wsp = row[33] || "";      // 장착한 특별 무기 — 그림에 들려 그린다
    if (row.length > 39) {                         // 명예 · 결투
      h.honor = row[34] || 0;
      h.duelInv = row[35] >= 0 ? { from: row[35], t: h.duelInv && h.duelInv.from === row[35] ? h.duelInv.t : DUEL.reqT } : null;
      h.dvs = row[36]; h.dph = row[37]; h.dtl = row[38]; h.ring = row[39];
    }
    if (row.length > 41) h.gift = row[41] ? GIFT.id : "";   // 이번 업데이트 선물을 받았는지
    if (Array.isArray(row[40])) {                  // 맡은 광장 의뢰
      h.reqs = {};
      REQ_NPCS.forEach((n, i) => { const r = row[40][i]; if (r) h.reqs[n.id] = { i: r[0], n: r[1] }; });
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
