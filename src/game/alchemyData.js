/* ── RPG 연금술 — 물약 제작 레벨 · 레시피 · 채집물 · 제작 의뢰. 숫자는 이 파일 한 곳에서 고친다 ─────────────
   규칙은 alchemy.js(제작 · 의뢰 · 채집 판정), 물약 상점 창은 src/AlchemyPanel.jsx, 채집물 그림은 alchemyArt.js.
   제작 레벨 · 경험치 · 의뢰는 가방 bag.al 에 남는다(shop.js cleanBag). 판정은 전용 서버(방장)가 한다.
   11월 9일 사용자 기획 — 물약 상점 중심에서 채집 · 제작 중심으로 바꾼다. 제작 레벨 50부터 일반 물약을 산다 */
import { DEEP_MAPS } from "./deepData.js";
import { HIGH_IDS } from "./highData.js";

export const ALCH = {
  maxLv: 50,             // 최고 제작 레벨
  buyLv: 50,             // 이 레벨부터 일반 물약을 상점에서 산다(특별 물약 셋은 늘 산다)
  needBase: 80,          // 필요 경험치 = needBase + needStep × (레벨 − 1)
  needStep: 20,
  halfGap: 15,           // 제작 레벨 − 레시피 해금 레벨이 이만큼 이상이면 경험치 50%
  zeroGap: 25,           // 이만큼 이상이면 경험치 0
  saveLv: 45,            // 이 레벨부터 재료 절약
  saveChance: 0.05,      // 제작할 때 5% 확률로 재료 한 종류를 1개 덜 쓴다(그 재료가 2개 이상 들 때만 — 모든 재료는 1개 이상 쓴다)
  repeat: 10,            // 연속 제작 한 번에 하는 수
  // 제작 대성공 — 결과물을 하나 더 받는다(경험치는 한 번 몫). 물약을 마실 때의 대성공(POTION.greatChance)과 다른 것
  great: [{ lv: 1, p: 0.03 }, { lv: 20, p: 0.05 }, { lv: 40, p: 0.08 }, { lv: 50, p: 0.1 }],
};
// lv 레벨에서 다음 레벨로 가는 데 드는 경험치
export const needCraftXp = (lv) => ALCH.needBase + ALCH.needStep * (lv - 1);

// 특별 물약 — 상점 값 · 조건 그대로, 제작 레벨 제한과 제작에서 뺀다
export const SPECIAL_POTIONS = ["reset", "adv_reset", "elem_swap"];

/* 제작 개편 전에 갖고 있던 일반 물약 정리 — 11월 9일 사용자 결정. 캐릭터마다 한 번(받은 id 는 가방 bag.pg 에 남는다).
   종류마다 keep 개를 남기고 초과분은 1개당 rate 코인으로 바꿔 준다. 특별 물약 셋은 건드리지 않는다.
   이 id 를 받은 뒤에 만든 물약은 건드리지 않는다. 코인이 한도를 넘으면 넘는 몫의 물약은 바꾸지 않고 그대로 둔다 */
export const POTION_CONVERT = { id: "pc-2026-11-09", keep: 15, rate: 10000 };

/* 재료 — itemData.js MATERIALS 맨 뒤에 붙는다(가방 bag.m · 999개까지 · 되팔 수 없다).
   물 · 정제수는 약사에게 코인으로 산다(price · 제작 레벨 제한 없음). 나머지 여섯은 사냥터에서 채집한다 */
export const ALCH_MATS = [
  { id: "herb", name: "약초", color: "#8fc48a", sell: 0, alch: 1, note: "사냥터 입구 둘레에서 채집한다" },
  { id: "herb_red", name: "붉은 약초", color: "#d98b7f", sell: 0, alch: 1, note: "토끼 ~ 오크 사냥터에서 채집한다" },
  { id: "herb_blue", name: "푸른 약초", color: "#86a9d6", sell: 0, alch: 1, note: "토끼 ~ 고블린 사냥터에서 채집한다" },
  { id: "life_flower", name: "생명의 꽃", color: "#f0b8cf", sell: 0, alch: 1, note: "멧돼지 사냥터부터 채집한다" },
  { id: "wind_grass", name: "바람풀", color: "#a8d8c8", sell: 0, alch: 1, note: "고블린 사냥터부터 채집한다" },
  { id: "shadow_grass", name: "그림자풀", color: "#8a7fa8", sell: 0, alch: 1, note: "200레벨 넘는 사냥터에서 채집한다" },
  { id: "water", name: "물", color: "#bcd8e8", sell: 0, alch: 1, price: 10, note: "약사에게 산다" },
  { id: "pure_water", name: "정제수", color: "#d8eef6", sell: 0, alch: 1, price: 60, note: "약사에게 산다" },
];
export const ALCH_MAT_BY_ID = Object.fromEntries(ALCH_MATS.map((m) => [m.id, m]));
export const ALCH_SHOP_MATS = ALCH_MATS.filter((m) => m.price).map((m) => m.id);   // 약사가 파는 재료
export const ALCH_BUY_N = [1, 10];        // 재료 사기 단추 — 한 번에 사는 수

/* 레시피 — 결과 물약(shopData.js POTIONS id) · 해금 레벨 · 재료 · 제작 경험치. 차례는 화면 차례다 */
export const RECIPES = [
  { id: "heal_s", lv: 1, mats: { herb: 2, water: 1 }, xp: 10 },
  { id: "heal_m", lv: 5, mats: { herb: 4, water: 2 }, xp: 18 },
  { id: "buff_str", lv: 10, mats: { herb_red: 3, water: 2 }, xp: 22 },
  { id: "buff_int", lv: 10, mats: { herb_blue: 3, water: 2 }, xp: 22 },
  { id: "heal_l", lv: 15, mats: { herb: 6, life_flower: 1 }, xp: 30 },
  { id: "buff_crit", lv: 15, mats: { herb_blue: 4, pure_water: 1 }, xp: 30 },
  { id: "speed1", lv: 20, mats: { wind_grass: 3, water: 2 }, xp: 35 },
  { id: "speed2", lv: 25, mats: { wind_grass: 6, pure_water: 2 }, xp: 50 },
  { id: "hide1", lv: 25, mats: { shadow_grass: 4, pure_water: 2 }, xp: 55 },
  { id: "hide2", lv: 35, mats: { shadow_grass: 7, pure_water: 3 }, xp: 70 },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// 레벨별 해금 — 제작 정보 탭에 보인다(레시피 해금은 RECIPES 에서 만든다)
export const ALCH_PERKS = [
  { lv: 30, text: "추가 제작 경험치 보너스 없이 정상 성장" },
  { lv: 40, text: "제작 대성공 확률 8%" },
  { lv: 45, text: "제작 재료 절약 5%" },
  { lv: 50, text: "일반 물약 상점 구매 해금 · 제작 대성공 10% · 칭호 「마스터 연금술사」" },
];

/* ── 채집 ─────────────────────────────────────────────────
   사냥터마다 입구 둘레(몹이 나오는 구간 zone 앞쪽 · 문 · 도착 자리와 떨어진 곳)에 넷. 몹이 몰리는 가운데 · 끝쪽에는 두지 않는다.
   가까이(reach) 가서 상호작용 키(E)나 화면 단추 · 오른쪽 클릭으로 채집한다. time 초 동안 움직이지 않으면 n 개를 받는다.
   채집한 자리는 respawn 초 뒤에 다시 난다. 판정 · 보상은 서버가 하고, 먼저 끝낸 사람 하나만 받는다 */
export const GATHER = {
  reach: 100,            // 채집 거리(px)
  time: 1,               // 채집에 걸리는 초
  respawn: 60,           // 다시 나기까지 초
  n: [1, 3],             // 한 번에 받는 수
  moveCancel: 6,         // 채집을 시작한 자리에서 이만큼(px) 넘게 움직이면 취소
};
// 자리 — 맵 왼쪽 입구(문 x 90 · 도착 260,920)를 비켜 위 · 아래로. 모든 사냥터가 같은 틀(높이 1700~1800)이다
const SPOTS = [[260, 420], [420, 560], [420, 1280], [260, 1440]];   // 나무는 x 500 부터(rpgArt.js MAP_TREES) · 사냥꾼(430, 740)과도 떨어진다
// 사냥터 묶음마다 자리 넷에 나는 채집물 — 높은 사냥터일수록 희귀한 풀이 많다. 초보 사냥터에도 약초가 둘 있다
const TIERS = [
  { maps: ["field", "wolf"], kinds: ["herb", "herb_red", "herb_blue", "herb"] },
  { maps: ["boar", "gorilla"], kinds: ["herb", "herb_red", "herb_blue", "life_flower"] },
  { maps: ["goblin"], kinds: ["herb", "herb_blue", "wind_grass", "life_flower"] },
  { maps: ["orc", "ogre"], kinds: ["herb", "herb_red", "wind_grass", "life_flower"] },
  { maps: ["skeletal", "zombie", "necro", "golem", "chimera", "spider"], kinds: ["herb", "wind_grass", "shadow_grass", "life_flower"] },
  { maps: [...DEEP_MAPS.map((d) => d.id), ...HIGH_IDS], kinds: ["life_flower", "wind_grass", "shadow_grass", "shadow_grass"] },
];
// 채집물 목록 — 차례(i)가 채집물 번호다(스냅샷 hb · 채집 입력). 새 사냥터는 TIERS 뒤에만 더한다
export const HERBS = TIERS.flatMap((t) => t.maps.flatMap((map) => t.kinds.map((kind, k) => ({ map, kind, x: SPOTS[k][0], y: SPOTS[k][1] }))))
  .map((n, i) => ({ ...n, i }));
export const HERBS_BY_MAP = HERBS.reduce((o, n) => { (o[n.map] || (o[n.map] = [])).push(n); return o; }, {});

/* ── 제작 의뢰 — 약사에게 하루 3개(한국 시간 자정에 새로) ───────────
   오늘 처음 물약 상점을 쓸 때 그때의 제작 레벨로 정한다. 해금한 레시피 가운데 최근 range 레벨 안의 것만 고른다(초보는 회복 물약 (소)).
   정한 물약을 n 개 가지고 있으면 납품한다 — 물약을 실제로 빼고 제작 경험치 · 재료를 준다. 하나는 한 번만 받는다 */
export const ALCH_REQ = {
  perDay: 3,
  range: 14,             // 내 레벨 − 레시피 해금 레벨이 이 안인 것만(경험치가 깎이지 않는 것)
  n: [2, 4],             // 납품할 수(레벨이 오를수록 큰 쪽이 나온다)
  xpMul: 1.5,            // 보상 경험치 = 레시피 경험치 × 납품 수 × xpMul
  matMul: 1,             // 보상 재료 = 레시피 재료(물 · 정제수 빼고) × matMul — 한 번 더 만들 몫
};
