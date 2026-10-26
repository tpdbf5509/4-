/* ── RPG 재료 · 드롭 · 무기 강화 — 숫자와 목록은 이 파일 한 곳에서 고친다 ─────────────
   규칙은 rpg.js(드롭) · shop.js(강화 · 재료 팔기), 창은 src/ShopPanel.jsx 에 있다. */
import { DEEP_MAPS, DEEP_MATS, EYE_MAT } from "./deepData.js";

/* 재료 — 가방(bag.m)에 종류마다 MAT_MAX 개까지 쌓인다. sell 은 하나를 팔 때 받는 코인(0 이면 팔 수 없다).
   강화석(stone)은 무기 강화소에서 쓴다. 차례는 화면에 보이는 차례다 */
export const MATERIALS = [
  { id: "fur", name: "토끼 털", color: "#efe6d4", sell: 20, note: "대왕 토끼가 떨군다" },
  { id: "fang", name: "늑대 이빨", color: "#ece4d0", sell: 60, note: "우두머리 늑대가 떨군다" },
  { id: "tusk", name: "멧돼지 엄니", color: "#f1e2c4", sell: 150, note: "멧돼지 왕이 떨군다" },
  { id: "hide", name: "고릴라 가죽", color: "#7a6c62", sell: 300, note: "고릴라 왕이 떨군다" },
  { id: "blue", name: "파랑 강화석", color: "#86b6e6", sell: 0, stone: true, note: "고블린 대장 · 강화석 던전 일반 · +10 까지 강화" },
  { id: "eye", name: "경화된 눈알", color: "#d9c37c", sell: 0, stone: true, note: "오크 족장 · 강화석 던전 중급 · +20 까지 강화" },
  { id: "heart", name: "심장결정", color: "#e08a98", sell: 0, stone: true, note: "오우거 왕 · 강화석 던전 고급 · +30 까지 · 가장 잘 붙는다" },
  // 200레벨 넘어서는 사냥터의 보스 재료 — 강화에는 쓰지 못하고 강화소에서 팔 수 있다(뒤에만 더한다)
  { id: "bone", name: "왕의 뼛조각", color: "#e3dcc6", sell: 500, note: "스켈레톤 킹이 떨군다" },
  { id: "rot", name: "썩은 심장", color: "#a3b27a", sell: 800, note: "좀비 군주가 떨군다" },
  { id: "soul", name: "리치의 영혼석", color: "#b79be0", sell: 1200, note: "리치 대마법사가 떨군다" },
  { id: "core", name: "골렘 핵", color: "#c9b27e", sell: 1800, note: "고대 골렘이 떨군다" },
  { id: "mane", name: "키메라 갈기", color: "#e0a87a", sell: 2500, note: "키메라 왕이 떨군다" },
  { id: "silk", name: "포식거미 비단", color: "#d5d2e6", sell: 3500, note: "포식거미 여왕이 떨군다" },
  {id:"dungeon_ticket",name:"던전 입장권",color:"#e5c47c",sell:0,note:"던전 입장료 대신 한 장 사용 · 월드보스 보상"},
  ...DEEP_MATS, EYE_MAT,                       // 400~800레벨 보스 재료 · 계몽의 눈(deepData.js)
];
export const MAT_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
export const MAT_MAX = 999;

/* 드롭 — 보스만 떨군다(일반 몹은 떨구지 않는다). 몹 종류마다 그 보스가 떨구는 재료.
   보스를 잡으면 그 보스를 한 번이라도 친 사람 가운데 같은 맵에 있는 사람이 저마다 받는다.
   roll 이 있으면 DROP_ROLL 의 확률로 1~5개 가운데 하나를 받는다(예전에는 3개 고정).
   없으면 n 개는 반드시, bonus 확률로 하나를 더 받는다. 강화석은 귀해서 1개 + 5% 로 둔다 */
// 개수별 무게 — [개수, 무게]. 무게를 모두 더한 값이 분모다(지금 100). 평균이 3개라 예전(3개 고정)과 벌이가 같다
export const DROP_ROLL = [[1, 15], [2, 20], [3, 30], [4, 20], [5, 15]];
export const rollDrop = (r = Math.random()) => {
  const total = DROP_ROLL.reduce((n, [, w]) => n + w, 0);
  let acc = 0;
  for (const [n, w] of DROP_ROLL) { acc += w; if (r * total < acc) return n; }
  return DROP_ROLL[DROP_ROLL.length - 1][0];
};
export const DROPS = {
  rabbit: { id: "fur", roll: 1 },
  wolf: { id: "fang", roll: 1 },
  boar: { id: "tusk", roll: 1 },
  gorilla: { id: "hide", roll: 1 },
  goblin: { id: "blue", n: 1, bonus: 0.05 },
  orc: { id: "eye", n: 1, bonus: 0.05 },
  ogre: { id: "heart", n: 1, bonus: 0.05 },
  skeletal: { id: "bone", roll: 1 },
  zombie: { id: "rot", roll: 1 },
  necro: { id: "soul", roll: 1 },
  golem: { id: "core", roll: 1 },
  chimera: { id: "mane", roll: 1 },
  spider: { id: "silk", roll: 1 },
  ...Object.fromEntries(DEEP_MAPS.map((d) => [d.id, { id: d.drop, roll: 1 }])),   // 400~800레벨 보스(deepData.js)
};

/* 무기 강화 — 무기 강화소에서 강화석 하나와 코인(fee × 올릴 단계)을 내고 한 단계씩 올린다.
   실패하면 강화석 · 코인이 사라지고, down 확률로 한 단계 떨어진다(+5 까지는 떨어지지 않는다).
   한 단계마다 무기가 올려 주는 스탯이 per 만큼 늘어난다.
   stones[id][k-1] = +k 로 올릴 때의 성공 확률(%). 강화석마다 올릴 수 있는 최고 단계는 그 목록의 길이다 */
export const ENHANCE = {
  max: 30,
  per: 0.08,            // +1 마다 +8% — +10 이면 1.8배, +20 이면 2.6배, +30 이면 3.4배
  fee: 250,             // 코인 — +k 로 올릴 때 fee × k. 확률을 올린 만큼 100 에서 250 으로 올렸다
  stones: {
    // 파랑 강화석 — +10 까지. +1 95% 에서 +10 30% 까지(예전 70% → 5%)
    blue: [95, 90, 85, 78, 70, 62, 54, 46, 38, 30],
    // 경화된 눈알 — +20 까지. +1 95% 에서 +20 11% 까지(예전 80% → 0.8%)
    eye: [95, 92, 88, 84, 79, 74, 68, 62, 56, 50, 45, 40, 35, 31, 27, 23, 20, 17, 14, 11],
    // 심장결정 — +30 까지. 단계마다 눈알보다 조금 높고 +30 은 4%(예전 85% → 0.2%)
    heart: [97, 94, 91, 88, 84, 80, 76, 72, 68, 64, 59, 54, 49, 45, 41, 37, 33, 30, 27, 24,
      21, 18, 16, 14, 12, 10, 8, 6, 5, 4],
  },
  // 실패했을 때 한 단계 떨어질 확률(%) — from 단계로 올리려다 실패한 것부터. +10 까지는 떨어지지 않는다
  down: [{ from: 11, rate: 30 }, { from: 21, rate: 40 }],
};
export const STONE_IDS = Object.keys(ENHANCE.stones);
// +k 로 올릴 때 이 강화석의 성공 확률(%) — 쓸 수 없으면 0
export const enhRate = (stone, k) => (ENHANCE.stones[stone] && ENHANCE.stones[stone][k - 1]) || 0;
// +k 로 올리다 실패했을 때 한 단계 떨어질 확률(%)
export const enhDown = (k) => ENHANCE.down.reduce((r, d) => (k >= d.from ? d.rate : r), 0);

/* 서버 초기화 — 캐릭터의 rs 가 이 id 와 다르면 들어올 때 한 번 모든 진행(레벨 · 코인 · 스탯 · 가방 · 스킬 · 기록 · 칭호 · 명예 · 의뢰)을 처음으로 돌린다.
   이름 · 직업 · 원소 · 성별은 그대로 둔다. 관리자 캐릭터는 건드리지 않는다. 다시 초기화하려면 id 를 새로 쓴다 */
export const RESET = { id: "2026-10-19" };

/* 업데이트 선물 — 캐릭터마다 한 번, 이 id 를 처음 받을 때 준다(서버에 들어와 방장이 기록을 실을 때).
   다음 선물을 줄 때는 id 를 새로 바꾼다. notes 는 함께 보여 줄 업데이트 노트 id(updates.js) */
/* 한 사람에게만 주는 선물 — name 은 캐릭터 이름(서버 rpg_chars.name). 들어와 있으면 방장이 한 번 주고 그 사람 채팅 칸에만 msg 를 띄운다.
   받은 id 는 가방(bag.pg)에 남아 다시 주지 않는다. armor 는 [{ s 부위, g 등급(0 초급 ~ 3 전설) }]. 새 선물은 id 를 새로 쓴다 */
export const PERSONAL_GIFTS = [
  { id: "pg-2026-10-17-1", name: "극우몰이 김도현", armor: [{ s: "body", g: 3 }], msg: "이번 한번만 주는거다" },
];
/* 한 사람 되돌리기 — 관리자 기록이 섞여 레벨 · 코인이 부풀려진 캐릭터를 들어올 때 한 번 되돌린다(받은 id 는 가방 bag.pg 에 남는다).
   lv 로 낮추고(경험치 0 · 찍은 스탯 없음 = 그 레벨 몫의 포인트를 모두 돌려준다) 코인을 coins 로 두며, items 면 무기 · 방어구 · 물약 · 재료 · 주문서 · 강화 도구를 모두 비운다(배운 스킬은 둔다). legends 면 전설 특별 무기(관리자 선물)만 뺀다.
   그 레벨보다 높아야 얻는 칭호와 코인 칭호도 뗀다. 이 이름은 관리자 표시가 실려 와도 관리자로 치지 않는다. DB 를 직접 고치면 접속 중에 10초마다 덮어써지므로 이 방법을 쓴다 */
export const PERSONAL_ROLLBACKS = [
  { id: "rb-2026-10-19-1", name: "니여친레보탱", lv: 17, coins: 0, items: true },
];
export const GIFT = {
  id: "2026-10-30",
  potions: { reset: 1 },                        // 스탯 초기화 물약
  mats: { blue: 5, eye: 5, heart: 5 },          // 강화석 세 종류
  notes: ["2026-10-30", "2026-10-29"],
};
