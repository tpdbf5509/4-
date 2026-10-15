/* ── RPG 재료 · 드롭 · 무기 강화 — 숫자와 목록은 이 파일 한 곳에서 고친다 ─────────────
   규칙은 rpg.js(드롭) · shop.js(강화 · 재료 팔기), 창은 src/ShopPanel.jsx 에 있다. */

/* 재료 — 가방(bag.m)에 종류마다 MAT_MAX 개까지 쌓인다. sell 은 하나를 팔 때 받는 코인(0 이면 팔 수 없다).
   강화석(stone)은 무기 강화소에서 쓴다. 차례는 화면에 보이는 차례다 */
export const MATERIALS = [
  { id: "fur", name: "토끼 털", color: "#efe6d4", sell: 20, note: "대왕 토끼가 떨군다" },
  { id: "fang", name: "늑대 이빨", color: "#ece4d0", sell: 60, note: "우두머리 늑대가 떨군다" },
  { id: "tusk", name: "멧돼지 엄니", color: "#f1e2c4", sell: 150, note: "멧돼지 왕이 떨군다" },
  { id: "hide", name: "고릴라 가죽", color: "#7a6c62", sell: 300, note: "고릴라 왕이 떨군다" },
  { id: "blue", name: "파랑 강화석", color: "#86b6e6", sell: 0, stone: true, note: "고블린 대장이 떨군다 · +10 까지 강화" },
  { id: "eye", name: "경화된 눈알", color: "#d9c37c", sell: 0, stone: true, note: "오크 족장이 떨군다 · +20 까지 강화" },
  { id: "heart", name: "심장결정", color: "#e08a98", sell: 0, stone: true, note: "오우거 왕이 떨군다 · +30 까지 · 가장 잘 붙는다" },
];
export const MAT_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
export const MAT_MAX = 999;

/* 드롭 — 보스만 떨군다(일반 몹은 떨구지 않는다). 몹 종류마다 그 보스가 떨구는 재료.
   보스를 잡으면 그 보스를 한 번이라도 친 사람 가운데 같은 맵에 있는 사람이 저마다 받는다.
   n 개는 반드시, bonus 확률로 하나를 더 받는다. 강화석은 귀해서 1개 + 5% 로 둔다 */
export const DROPS = {
  rabbit: { id: "fur", n: 3, bonus: 0 },
  wolf: { id: "fang", n: 3, bonus: 0 },
  boar: { id: "tusk", n: 3, bonus: 0 },
  gorilla: { id: "hide", n: 3, bonus: 0 },
  goblin: { id: "blue", n: 1, bonus: 0.05 },
  orc: { id: "eye", n: 1, bonus: 0.05 },
  ogre: { id: "heart", n: 1, bonus: 0.05 },
};

/* 무기 강화 — 무기 강화소에서 강화석 하나와 코인(fee × 올릴 단계)을 내고 한 단계씩 올린다.
   실패하면 강화석 · 코인이 사라지고, down 확률로 한 단계 떨어진다(+5 까지는 떨어지지 않는다).
   한 단계마다 무기가 올려 주는 스탯이 per 만큼 늘어난다.
   stones[id][k-1] = +k 로 올릴 때의 성공 확률(%). 강화석마다 올릴 수 있는 최고 단계는 그 목록의 길이다 */
export const ENHANCE = {
  max: 30,
  per: 0.08,            // +1 마다 +8% — +10 이면 1.8배, +20 이면 2.6배, +30 이면 3.4배
  fee: 100,             // 코인 — +k 로 올릴 때 fee × k
  stones: {
    // 파랑 강화석 — +10 까지. +1 70% 에서 +10 5% 까지
    blue: [70, 58, 47, 37, 28, 21, 15, 11, 8, 5],
    // 경화된 눈알 — +20 까지. +1 80% 에서 +20 0.8% 까지
    eye: [80, 68, 57, 47, 38, 30, 24, 19, 15, 12, 9.5, 7.5, 6, 4.8, 3.8, 3, 2.3, 1.7, 1.2, 0.8],
    // 심장결정 — +30 까지. 단계마다 눈알보다 조금 높고 +30 은 0.2%
    heart: [85, 74, 63, 53, 44, 36, 29, 23, 18, 14.5, 11.5, 9, 7.2, 5.8, 4.6, 3.7, 2.9, 2.3, 1.8, 1.4,
      1.1, 0.9, 0.75, 0.6, 0.5, 0.42, 0.35, 0.3, 0.25, 0.2],
  },
  // 실패했을 때 한 단계 떨어질 확률(%) — from 단계로 올리려다 실패한 것부터. 높은 단계일수록 잘 떨어진다
  down: [{ from: 6, rate: 30 }, { from: 11, rate: 45 }, { from: 21, rate: 60 }],
};
export const STONE_IDS = Object.keys(ENHANCE.stones);
// +k 로 올릴 때 이 강화석의 성공 확률(%) — 쓸 수 없으면 0
export const enhRate = (stone, k) => (ENHANCE.stones[stone] && ENHANCE.stones[stone][k - 1]) || 0;
// +k 로 올리다 실패했을 때 한 단계 떨어질 확률(%)
export const enhDown = (k) => ENHANCE.down.reduce((r, d) => (k >= d.from ? d.rate : r), 0);

/* 업데이트 선물 — 캐릭터마다 한 번, 이 id 를 처음 받을 때 준다(서버에 들어와 방장이 기록을 실을 때).
   다음 선물을 줄 때는 id 를 새로 바꾼다. notes 는 함께 보여 줄 업데이트 노트 id(updates.js) */
export const GIFT = {
  id: "2026-10-30",
  potions: { reset: 1 },                        // 스탯 초기화 물약
  mats: { blue: 5, eye: 5, heart: 5 },          // 강화석 세 종류
  notes: ["2026-10-30", "2026-10-29"],
};
