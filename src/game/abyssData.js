/* ── RPG 심연의 탑 — 수치는 모두 여기 한 곳 ─────────────────────────────
   10월 31일 사용자 요청. 만렙 캐릭터가 반복할 끝없는 도전과 주간 순위.
   광장의 탑 입구에서 400레벨부터 파티(1~4명)가 함께 들어간다. 한 층에 몹 무리 하나 · 10층마다 수호자.
   모두 잡으면 잠깐 뒤 다음 층. 시간이 다 되거나 모두 쓰러지면 도전이 끝나고 광장으로 돌아간다.
   규칙은 rpg.js(rpgAbyss · tickAbyss), 창은 src/AbyssPanel.jsx, 순위는 장부(server/src/ledger.js fn_rpg_abyss_top).
   수치는 시험 전 초안이다 — 플레이 테스트로 맞춘다.
   스냅샷 · 맵 · 몹 · 기록 · 칭호 차례에 쓰는 목록은 뒤에만 더한다 */
import { BOSS_AI, BOSS_NAMES, DG_LOOKS } from "./dungeonData.js";
import { DEEP_MAPS } from "./deepData.js";

export const ABYSS = {
  lv: 400,                // 들어갈 수 있는 레벨 — 계몽의 문과 같다(계몽의 눈은 필요 없다)
  fee: 30000,             // 입장료(코인) — 들어가는 사람만 낸다. 강화석 던전 중급과 같은 값(초안)
  // 광장의 탑 입구 — 발밑 가운데 자리. 오른쪽 아래 빈 풀밭(11월 1일 노점을 위쪽 한 줄로 옮겨 사냥문 · 노점과 겹치지 않는다)
  gate: { x: 1420, y: 1040, r: 38 },
  reach: 130,             // 이만큼 가까우면 탑 창을 연다
  exitAt: [1490, 762],    // 끝나고 돌아오는 광장 자리(입구 앞)
  slots: 3,               // 동시에 오를 수 있는 무리 수(칸마다 맵 하나)
  w: 2400, h: 1300,       // 층 맵 크기 — 들어가면 가운데에 선다
  time: 90,               // 한 층 제한 시간(초)
  guardTime: 150,         // 수호자 층 제한 시간(초)
  gap: 3,                 // 층을 깨고 다음 층까지(초)
  failWait: 5,            // 도전이 끝나고 광장으로 돌아가기까지(초)
  guardEvery: 10,         // 이 층마다 수호자
  mobsPerZone: 10,        // 몹 종류는 이만큼 층마다 바뀐다(400~800 사냥터 8종을 돌려 쓴다)
  rally: 260,             // 몹은 맵 가장자리에서 나와 가운데 이 둘레로 몰려온다
};

/* 세기 — 층이 오를수록 체력 · 공격이 지수로 늘고 몹 수는 늘다 멈춘다.
   던전 규칙(파티 최고 레벨 / 300 체력 배율, COMBAT_RULES.dungeonScaleLevel)이 위에 겹친다.
   목표: 800레벨 4인 파티가 대략 30~40층(초안 — 시험하며 맞춘다) */
export const ABYSS_SCALE = {
  hp: 1.06,               // 층마다 체력 × 1.06 — 35층이면 약 7.7배
  dmg: 1.03,              // 층마다 공격 × 1.03 — 35층이면 약 2.7배(체력보다 느리게 — 한 방에 눕지 않게)
  mobBase: 8,             // 1층 몹 수
  mobPer: 5,              // 이만큼 층마다 한 마리 더
  mobMax: 24,             // 몹 수 상한 — 그리기 · 판정 부담을 막는다
  mobHp: 1,               // 탑 몹 체력 배율(던전 몹 1.5배와 달리 층 지수가 대신한다)
  lvStep: 5,              // 같은 몹 구간 안에서 한 층마다 오르는 몹 레벨
};
export const floorHp = (f) => ABYSS_SCALE.hp ** Math.max(0, f - 1);
export const floorDmg = (f) => ABYSS_SCALE.dmg ** Math.max(0, f - 1);
export const floorMobs = (f) => Math.min(ABYSS_SCALE.mobMax, ABYSS_SCALE.mobBase + Math.floor(f / ABYSS_SCALE.mobPer));
export const isGuardFloor = (f) => f > 0 && f % ABYSS.guardEvery === 0;
export const floorTime = (f) => (isGuardFloor(f) ? ABYSS.guardTime : ABYSS.time);
// 그 층의 몹 — 10층마다 400~800 사냥터 몹 8종을 차례로 돌려 쓴다(새 몹 그림을 만들지 않는다). 레벨은 그 사냥터 시작 레벨부터
export function floorMob(f) {
  const i = Math.floor((f - 1) / ABYSS.mobsPerZone);
  const z = DEEP_MAPS[i % DEEP_MAPS.length];
  const lv = Math.min(z.lv[1], z.lv[0] + ((f - 1) % ABYSS.mobsPerZone) * ABYSS_SCALE.lvStep);
  return { type: z.id, lv };
}

/* 수호자 6종 — 10층마다 한 마리씩 차례로 나오고, 60층 뒤로는 처음부터 다시 나오며 세기만 오른다.
   그림은 rpg/abyss/guardians.webp(3열 × 2행, 기본 자세) · guardians-attack.webp(같은 배치, 공격 준비). 못 불러오면 rpgArt.js 가 코드로 그린다.
   세기는 GUARD_BASE 에 층 배율 · 파티 배율을 곱한다. 기술은 던전 보스와 같은 셈(dungeonData.js BOSS_AI 설명) */
export const GUARD_BASE = { hp: 2200000, dmg: 3600, xp: 90000, coin: 60000 };
export const GUARDIANS = [
  { type: "tg_fire", name: "재의 용기사", elem: "flame", glow: "#ffb070",
    ai: { rad: 30, size: 2.0, walk: 175, punchCd: 1.1, skills: [
      { k: "charge", name: "불꽃 돌진", min: 240, wind: 0.6, speed: 760, time: 0.6, width: 80, mul: 1.6, push: 150, cd: 8, rest: 0.7 },
      { k: "slam", name: "잿불 강타", range: 220, wind: 0.9, r: 250, mul: 1.8, cd: 7, rest: 0.8 },
      { k: "rage", name: "타오르는 갑옷", at: 0.4, spd: 1.3, dmg: 1.25 },
    ] } },
  { type: "tg_frost", name: "얼어붙은 사제", elem: "frost", glow: "#a8dcff",
    ai: { rad: 26, size: 2.0, walk: 140, punchCd: 1.3, skills: [
      { k: "slam", name: "서리 폭발", range: 320, wind: 1.2, r: 330, mul: 1.5, cd: 8, rest: 0.8 },
      { k: "multi", name: "얼음 창", range: 220, wind: 0.6, n: 3, gap: 0.35, r: 180, mul: 0.9, cd: 6, rest: 0.6 },
      { k: "wall", name: "얼음 장막", at: [0.7, 0.4], dur: 5, cut: 0.6 },
    ] } },
  { type: "tg_bolt", name: "뇌운 파수꾼", elem: "bolt", glow: "#ffe27a",
    ai: { rad: 34, size: 2.1, walk: 150, punchCd: 1.2, skills: [
      { k: "multi", name: "낙뢰", range: 260, wind: 0.5, n: 4, gap: 0.28, r: 200, mul: 0.8, cd: 6.5, rest: 0.6 },
      { k: "charge", name: "방패 돌격", min: 260, wind: 0.65, speed: 700, time: 0.6, width: 90, mul: 1.5, push: 160, cd: 9, rest: 0.8 },
      { k: "wall", name: "뇌운 방패", at: [0.75, 0.5, 0.25], dur: 4, cut: 0.6 },
    ] } },
  { type: "tg_poison", name: "썩은 연꽃의 마녀", elem: "poison", glow: "#b8e08a",
    ai: { rad: 26, size: 2.0, walk: 160, punchCd: 1.0, skills: [
      { k: "slam", name: "독 꽃가루", range: 340, wind: 1.1, r: 340, mul: 1.0, heal: 0.015, cd: 10, rest: 0.8 },
      { k: "mirage", name: "안개 분신", cd: 14, dur: 4, dodge: 0.4 },
      { k: "multi", name: "시든 가시", range: 200, wind: 0.5, n: 3, gap: 0.3, r: 170, mul: 0.9, cd: 6, rest: 0.6 },
    ] } },
  { type: "tg_corrode", name: "녹슨 심판관", elem: "corrode", glow: "#d8a070",
    ai: { rad: 34, size: 2.2, walk: 135, punchCd: 1.4, skills: [
      { k: "slam", name: "심판의 대검", range: 240, wind: 1.1, r: 270, mul: 2.2, cd: 8, rest: 0.9 },
      { k: "charge", name: "녹슨 돌진", min: 260, wind: 0.75, speed: 640, time: 0.65, width: 90, mul: 1.5, push: 140, cd: 10, rest: 0.9 },
      { k: "rage", name: "부서진 저울", at: 0.5, spd: 1.25, dmg: 1.3 },
    ] } },
  { type: "tg_gravity", name: "틈새의 거신", elem: "gravity", glow: "#b8a8ff",
    ai: { rad: 38, size: 2.3, walk: 120, punchCd: 1.5, skills: [
      { k: "slam", name: "중력 붕괴", range: 360, wind: 1.3, r: 380, mul: 1.6, cd: 9, rest: 1.0 },
      { k: "multi", name: "떠도는 돌조각", range: 240, wind: 0.6, n: 4, gap: 0.3, r: 190, mul: 0.8, cd: 7, rest: 0.6 },
      { k: "wall", name: "틈새 장벽", at: [0.66, 0.33], dur: 5, cut: 0.65 },
    ] } },
];
export const GUARD_IDS = GUARDIANS.map((q) => q.type);
export const GUARD_BY_TYPE = Object.fromEntries(GUARDIANS.map((q, i) => [q.type, { ...q, i }]));
// f 층의 수호자(10 · 20 · … 60층, 70층부터 다시 처음)
export const floorGuard = (f) => GUARDIANS[(Math.floor(f / ABYSS.guardEvery) - 1) % GUARDIANS.length];
// 던전 보스 셈(rpg.js stepDgBoss)이 그대로 쓰게 BOSS_AI 에 올린다 — MOB 에 보스로 올리는 것도 그쪽이 한다
GUARDIANS.forEach((q) => { BOSS_AI[q.type] = q.ai; BOSS_NAMES[q.type] = q.name; });

// 그림 — 원본은 design/abyss/. 못 불러와도 코드 그림으로 대신한다
export const ABYSS_ART = {
  gate: { src: "/assets/game/rpg/abyss/abyss-gate.webp", h: 280, foot: 0.94, portal: [0.5, 0.66, 0.16] },   // h 맵에서 그리는 높이 · foot 그림 위에서 발밑까지의 몫 · portal 입구 빛 가운데와 반지름 몫
  // 수호자 기술 연출(11월 1일, Codex 생성 · 검은 바탕 lighter) — fx 6열(수호자 차례 = 원소 차례) × 6행: 내려치기 · 돌진 자국 · 연타 한 방 · 광폭화 기운 · 철벽 돔 · 분신 안개. icerain 은 얼음 비 한 줄기 — 크기 · 길이를 늘려 여러 개 겹쳐 쓴다
  fx: { src: "/assets/game/rpg/abyss/abyss-fx.webp", cols: 6, cell: 256, row: { slam: 0, charge: 1, strike: 2, rage: 3, dome: 4, mirage: 5 } },
  icerain: { src: "/assets/game/rpg/abyss/ice-rain.webp" },   // 가로 : 세로 약 1 : 6.4 — 그릴 때 폭 s · 길이 len 으로 늘려 쓴다
  guards: { src: "/assets/game/rpg/abyss/guardians.webp", atk: "/assets/game/rpg/abyss/guardians-attack.webp", cols: 3, rows: 2, foot: 0.94, h: 250 },   // h 수호자 키(size 1 기준 아님 — 맵 px)
};
// 탑 안 바닥 빛깔 — 깊은 남색 바닥 · 옅은 하늘빛 광채(rpgArt.js paintDungeon 이 코드로 그린다)
DG_LOOKS.abyss = { floor: "#262b44", tile: "#2e3452", line: "#151a2c", wall: "#191d33", glow: "#9fd4ff", fire: "#b8e0ff", moss: "#3a4470" };

/* 보상 — 새 재료 심연의 파편. 층을 깰 때마다 안에 있는 사람이 저마다 받는다.
   10층 단위 첫 돌파 보너스는 한 주에 한 번(같은 층만 반복해 파밍하지 못하게) */
export const SHARD = "abyss_shard", SEAL = "abyss_seal";
export const ABYSS_REWARD = {
  floor: (f) => 2 + Math.floor(f / 10),        // 보통 층 — 1~9층 2개, 10층대 3개 …
  guard: (f) => 15 + f,                         // 수호자 층 — 10층 25개, 30층 45개
  weekBonus: (f) => 3 * f,                      // 이번 주 처음 넘은 10층 단위 — 10층 30개, 40층 120개
};
/* 주간 순위 보상 — 지난주 서버 전체 순위. 화면 · 전용 서버 · 장부가 같이 쓴다.
   11월 9일 개편(사용자 요청): 상위 10 → 50, 그 주 10층 이상만. 새 표는 v2From 주(그 주 월요일)의 순위부터 쓴다.
   그보다 앞서 끝난 주는 예전 표(상위 10 · 파편 300/200/120 · 인장 3/2/1) 그대로 준다 */
export const ABYSS_RANK = {
  top: 50,                // 보상을 받는 순위(새 표)
  minFloor: 10,           // 그 주에 이 층 이상 깨야 순위 보상(새 표)
  oldTop: 10,             // 예전 표의 보상 순위
  v2From: "2026-11-09",   // 새 표를 쓰는 첫 주 — 11월 9일 월요일 배포. 이 주의 순위를 다음 주에 받을 때부터 새 표
  freezeMin: 10,          // 월요일 0시 뒤 이만큼(분) 기다렸다가 지난주 순위를 굳힌다 — 0시 직전에 깬 층의 저장이 들어올 시간
};
// 예전 표(11월 2일 주까지)
const OLD_RANK = (r) => (r === 1 ? { shard: 300, seal: 3 } : r <= 3 ? { shard: 200, seal: 2 } : r <= ABYSS_RANK.oldTop ? { shard: 120, seal: 1 } : null);
/* 새 표 — to 위까지. bx 는 상자 보관함에 넣는 상자 회분(ABYSS_BOXES), look 은 시즌 외형(1위 후광 — 받은 주 동안만) */
export const RANK_TIERS = [
  { to: 1, shard: 600, seal: 5, bx: { abyss_treasure: 3 }, look: "abyss_halo_season" },
  { to: 3, shard: 450, seal: 4, bx: { abyss_treasure: 2 } },
  { to: 10, shard: 300, seal: 3, bx: { abyss_treasure: 1 } },
  { to: 20, shard: 180, seal: 1, bx: { abyss_stone_select: 2 } },
  { to: 50, shard: 100, seal: 0, bx: { abyss_stone_select: 1 } },
];
export const rankV2 = (week) => !week || week >= ABYSS_RANK.v2From;   // week 를 모르면 새 표
export const rankTop = (week) => (rankV2(week) ? ABYSS_RANK.top : ABYSS_RANK.oldTop);
// r 위의 보상 — { shard, seal, bx?, look? } 또는 null. week 는 순위를 낸 주(월요일)
export function rankReward(r, week) {
  if (!(r >= 1)) return null;
  if (!rankV2(week)) return OLD_RANK(r);
  const t = RANK_TIERS.find((x) => r <= x.to);
  return t ? { shard: t.shard, seal: t.seal, bx: { ...t.bx }, ...(t.look ? { look: t.look } : {}) } : null;
}
// 순위 보상 자격 — 새 표는 그 주 minFloor 층 이상(예전 표는 기록만 있으면)
export const rankFloorOk = (floor, week) => !rankV2(week) || floor >= ABYSS_RANK.minFloor;

/* 파편 교환 — 탑 창의 교환 탭. id 는 보낼 때 쓴다(이미 나간 id 는 바꾸지 않는다).
   예전 넷(guard5 · ticket · t_walk · t_king)은 id · 값 · 효과 그대로 — cost 가 [재료 id, 개수] 하나다.
   give: guard 하락 방지권 n장 · mat 재료 n개 · title 칭호 기록 열쇠(한 번만).
   11월 9일 새 여덟(v2) — cost 는 [[재료 id, 개수], …], limit 은 하루 day · 주 week · 평생 life 횟수,
   box 는 사면 곧바로 여는 상자(ABYSS_BOXES), look 은 영구 외형(ABYSS_LOOKS), title 은 칭호 기록 열쇠.
   새 여덟은 전용 서버에서만 판정한다(확률 · 횟수를 방장 브라우저가 정하지 않게). cat 은 교환 탭의 갈래 */
export const SHOP_CATS = [["mat", "강화 재료"], ["box", "보급 상자"], ["rare", "희귀 교환"], ["look", "외형 · 칭호"]];
export const ABYSS_SHOP = [
  { id: "guard5", name: "하락 방지권 5장", cat: "mat", cost: [SHARD, 20], give: { guard: 5 } },
  { id: "ticket", name: "던전 입장권 1장", cat: "box", cost: [SHARD, 30], give: { mat: "dungeon_ticket", n: 1 } },
  { id: "t_walk", name: "칭호 · 심연을 걷는 자", cat: "look", cost: [SHARD, 600], give: { title: "atb" } },
  { id: "t_king", name: "칭호 · 심연의 군주", cat: "look", cost: [SEAL, 5], give: { title: "aking" } },
  { id: "abyss_stone_select", name: "강화석 선택 상자", cat: "mat", v2: 1, cost: [[SHARD, 80]], limit: { day: 3 }, box: "abyss_stone_select" },
  { id: "abyss_stone_advanced", name: "고급 강화 상자", cat: "mat", v2: 1, cost: [[SHARD, 180]], limit: { week: 3 }, box: "abyss_stone_advanced" },
  { id: "abyss_treasure", name: "심연의 보물 상자", cat: "box", v2: 1, cost: [[SHARD, 250]], limit: { week: 2 }, box: "abyss_treasure" },
  { id: "abyss_world_supply", name: "월드보스 준비 상자", cat: "box", v2: 1, cost: [[SHARD, 450]], limit: { week: 1 }, box: "abyss_world_supply" },
  { id: "abyss_essence_supply", name: "심연의 정수 보급", cat: "rare", v2: 1, cost: [[SHARD, 500], [SEAL, 1]], limit: { week: 2 }, box: "abyss_essence_supply" },
  { id: "abyss_core_supply", name: "심연의 결정핵 보급", cat: "rare", v2: 1, cost: [[SHARD, 700], [SEAL, 1]], limit: { week: 1 }, box: "abyss_core_supply" },
  { id: "abyss_wings", name: "심연의 날개", cat: "look", v2: 1, cost: [[SHARD, 1500], [SEAL, 5]], limit: { life: 1 }, look: "abyss_wings" },
  { id: "abyss_title_beyond", name: "칭호 · 탑을 넘어선 자", cat: "look", v2: 1, cost: [[SHARD, 2000], [SEAL, 8]], limit: { life: 1 }, title: "abeyond" },
];
export const ABYSS_SHOP_BY_ID = Object.fromEntries(ABYSS_SHOP.map((s) => [s.id, s]));
// 값 — 예전 물품의 [재료, 개수] 하나도 [[재료, 개수]] 로
export const costsOf = (it) => (!it ? [] : Array.isArray(it.cost[0]) ? it.cost : [it.cost]);

/* 상자 — 재료 가방에 넣지 않는다. 사거나(교환) 보관함에서 열면 곧바로 내용물을 준다.
   give 고정 · pick 셋 가운데 하나를 고른다 · roll 무게(w, 합 100)로 서버가 하나를 뽑는다.
   한 몫: m 재료 { id: 개수 } · coins 코인. 강화 카드 보너스는 상자에 붙지 않는다 */
export const ABYSS_BOXES = {
  abyss_stone_select: { name: "강화석 선택 상자", pick: [{ m: { blue: 50 } }, { m: { eye: 20 } }, { m: { heart: 8 } }] },
  abyss_stone_advanced: { name: "고급 강화 상자", give: { m: { heart: 20, eye: 20, blue: 30 } } },
  abyss_treasure: { name: "심연의 보물 상자", roll: [
    { w: 50, m: { heart: 25 }, coins: 100000 },
    { w: 35, m: { heart: 40 }, coins: 200000 },
    { w: 15, m: { heart: 60 }, coins: 400000 },
  ] },
  abyss_world_supply: { name: "월드보스 준비 상자", give: { m: { dungeon_ticket: 3, heart: 30 } } },   // 월드보스 전설 장비는 없다
  abyss_essence_supply: { name: "심연의 정수 보급", give: { m: { heart: 80, eye: 40 } } },
  abyss_core_supply: { name: "심연의 결정핵 보급", give: { m: { heart: 120, dungeon_ticket: 3 }, coins: 300000 } },
};
export const BOX_IDS = Object.keys(ABYSS_BOXES);   // 보관함 차례(뒤에만 더한다)
export const ABYSS_BOX_MAX = 99;                   // 보관함에 한 종류를 쌓을 수 있는 회분

/* 외형 — 능력치가 없다. 차례가 저장 비트라 뒤에만 더한다. slot 이 같으면 하나만 낀다.
   season 은 주간 1위 후광 — 받은 주가 끝날 때까지만 낄 수 있다(bag.ab.sh). 그림은 abyssLookArt.js(코드 그림) */
export const ABYSS_LOOKS = [
  { id: "abyss_wings", name: "심연의 날개", slot: "back", note: "어두운 보라 날개 · 움직이면 공허 알갱이와 잔상" },
  { id: "abyss_weapon", name: "심연의 무기", slot: "wpn", note: "든 무기를 심연의 보랏빛으로 물들이고 빛 줄기를 남긴다" },
  { id: "abyss_halo", name: "심연의 후광", slot: "head", note: "천천히 도는 보랏빛 고리" },
  { id: "abyss_shadow", name: "백층의 그림자", slot: "aura", legend: 1, note: "어둠과 뒤따르는 그림자 분신 · 전설 외형" },
  { id: "abyss_halo_season", name: "탑의 정점 후광", slot: "head", season: 1, note: "주간 1위 전용 · 받은 주가 끝날 때까지" },
];
export const LOOK_BY_ID = Object.fromEntries(ABYSS_LOOKS.map((l, i) => [l.id, { ...l, i }]));
export const LOOK_SLOTS = { back: "등", wpn: "무기", head: "머리 위", aura: "발밑" };

/* 생애 최초 돌파 보상 — 캐릭터마다 단계별 한 번(bag.ab.fc 비트, 차례 = 비트). 기록 rec.atop(가장 높이 깬 층)으로 소급해 받는다.
   아래 층부터 차례로 받는다. 상점 횟수를 쓰지 않는다. 상자는 보관함으로(bx), 칭호는 기록 열쇠(rec), 외형은 영구 소유(look) */
export const ABYSS_FIRST = [
  { f: 10, give: { bx: { abyss_stone_select: 2 } } },
  { f: 20, give: { bx: { abyss_treasure: 1 } } },
  { f: 30, give: { bx: { abyss_stone_advanced: 2 } } },
  { f: 40, give: { bx: { abyss_treasure: 2 } } },
  { f: 50, give: { bx: { abyss_essence_supply: 1 } } },
  { f: 60, give: { rec: "aconq" }, title: "abyss_title_conqueror" },
  { f: 70, give: { bx: { abyss_core_supply: 1 } } },
  { f: 80, give: { look: "abyss_weapon" } },
  { f: 90, give: { look: "abyss_halo" } },
  { f: 100, give: { look: "abyss_shadow" } },
];

// 재료 — itemData.js MATERIALS 맨 뒤에 붙는다. 팔 수 없다
// 11월 9일 — 두 재료만 99,999개까지 가진다(max, itemData.js matMax). 다른 재료는 MAT_MAX 999 그대로
export const ABYSS_CUR_MAX = 99999;
export const ABYSS_MATS = [
  { id: SHARD, name: "심연의 파편", color: "#8fc8f0", sell: 0, max: ABYSS_CUR_MAX, img: "/assets/game/rpg/abyss/abyss-shard.webp", note: "심연의 탑에서 층을 깨면 얻는다 · 탑 창에서 교환" },
  { id: SEAL, name: "탑의 인장", color: "#d8b870", sell: 0, max: ABYSS_CUR_MAX, img: "/assets/game/rpg/abyss/abyss-seal.webp", note: "심연의 탑 주간 순위 상위 20명이 받는다 · 탑 창에서 교환" },
];

/* 주 — 한국 시간 월요일 0시에 갈린다(길드 주간 순위와 같다, server/src/ledger-guild.js guildWeek). 값은 그 주 월요일 "YYYY-MM-DD" */
const KST_MS = 9 * 3600 * 1000, DAY_MS = 86400000;
export function abyssWeek(ms) {
  const k = new Date(ms + KST_MS), mon = (k.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - mon)).toISOString().slice(0, 10);
}
export const abyssDay = (ms) => new Date(ms + KST_MS).toISOString().slice(0, 10);   // 한국 날짜 — 하루 횟수가 0시에 갈린다
export const prevWeek = (w) => new Date(Date.parse(`${w}T00:00:00Z`) - 7 * DAY_MS).toISOString().slice(0, 10);
export const weekReset = (w) => Date.parse(`${w}T00:00:00Z`) + 7 * DAY_MS - KST_MS;   // 다음 주가 시작하는 순간(ms)

/* 가방의 탑 기록 bag.aw — { w 이번 주, top 이번 주 최고 층, at 그 층에 처음 닿은 때(ms), fc 이번 주 받은 첫 돌파 보너스 층,
   pw · ptop · pat 지난주 값(순위를 지난주로도 셈한다), cl 주간 보상을 받은 주 } */
export function cleanAw(d) {
  const n = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
  const s = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  if (!d || typeof d !== "object") return { w: "", top: 0, at: 0, fc: 0, pw: "", ptop: 0, pat: 0, cl: "" };
  return { w: s(d.w), top: n(d.top, 9999), at: n(d.at, 1e15), fc: n(d.fc, 9999), pw: s(d.pw), ptop: n(d.ptop, 9999), pat: n(d.pat, 1e15), cl: s(d.cl) };
}
// 주가 바뀌었으면 이번 주 값을 지난주 칸으로 옮긴다(한 주 넘게 쉬었으면 지난주도 비운다)
export function rollAw(aw, week) {
  if (aw.w === week) return aw;
  const last = prevWeek(week);
  const keep = aw.w === last;
  return { ...aw, w: week, top: 0, at: 0, fc: 0, pw: keep ? aw.w : "", ptop: keep ? aw.top : 0, pat: keep ? aw.at : 0 };
}
// 기록에서 어느 주의 최고 층 · 닿은 때 — 순위(장부)와 화면이 같이 쓴다
export function weekTop(aw, week) {
  if (!aw) return null;
  if (aw.w === week && aw.top > 0) return { top: aw.top, at: aw.at };
  if (aw.pw === week && aw.ptop > 0) return { top: aw.ptop, at: aw.pat };
  return null;
}
