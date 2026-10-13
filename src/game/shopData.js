/* ── RPG 광장 상점 설정 ─────────────────────────────────────
   가격 · 확률 · 제한 수치를 모두 여기 한 곳에 모은다. 밸런스를 바꿀 때는 이 파일만 고치면 된다.
   화폐는 기존 "코인"을 그대로 쓴다.
   스탯 수치는 스탯 창에 보이는 값과 같은 단위다(물리력 10 · 체력 100 · 치명타 확률 5 = 5%). */

/* 광장 상점 네 곳 — 자리(x, y)는 광장 맵 좌표(바닥 그림의 꽃밭 · 바위를 비켜 둔 풀밭). 가까이 가서 대화 키(E)를 누르면 창이 열린다. */
export const SHOPS = [
  { id: "weapon", name: "무기상점", keeper: "대장장이", x: 300, y: 330, color: "#b98a6a", line: "좋은 무기는 사냥을 바꾸지." },
  { id: "skill", name: "스킬 상점", keeper: "현자", x: 200, y: 780, color: "#8a9ac2", line: "익힐 준비가 되었는가?" },
  { id: "potion", name: "물약 상점", keeper: "약사", x: 1600, y: 330, color: "#8fb59a", line: "다치면 언제든 오게." },
  { id: "casino", name: "도박장", keeper: "딜러", x: 1550, y: 950, color: "#c29a8a", line: "운을 시험해 보시겠어요?" },
];
export const SHOP_REACH = 110;            // 이만큼 가까우면 상점을 쓸 수 있다

/* 하루의 기준 — 한국 시간 자정에 바뀐다 */
export const DAY_TZ_HOURS = 9;

/* ── 무기 ──────────────────────────────────────────────── */
// 종류마다 올려 주는 주 스탯. mul 은 같은 단계 · 등급에서 주는 양의 배율, price 는 값의 배율
export const WEAPON_TYPES = [
  { id: "sword", name: "검", stat: "str", mul: 1, price: 1 },
  { id: "axe", name: "도끼", stat: "str", mul: 1.1, price: 1.1 },
  { id: "staff", name: "지팡이", stat: "int", mul: 1, price: 1 },
  { id: "tome", name: "마도서", stat: "int", mul: 1.1, price: 1.1 },
  { id: "dagger", name: "단검", stat: "crit", mul: 0.6, price: 1 },     // 치명타 확률은 상한(80%)이 있어 적게 준다
  { id: "great", name: "대검", stat: "cdmg", mul: 0.8, price: 1 },
];
// 등급 — mul 은 스탯 배율, price 는 값 배율
export const GRADES = [
  { id: 0, name: "일반", mul: 1, price: 1 },
  { id: 1, name: "고급", mul: 1.3, price: 2 },
  { id: 2, name: "희귀", mul: 1.7, price: 4 },
  { id: 3, name: "영웅", mul: 2.2, price: 8 },
  { id: 4, name: "전설", mul: 3, price: 16 },
];
// 단계 — 10레벨마다 새 무기가 들어온다. 단계의 레벨이 곧 레벨 제한이다.
export const WEAPON_TIERS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const WEAPON = {
  pts: 2,                // 1단계 일반 무기가 주는 양 — 스탯 포인트로 셈한 값(물리력이면 포인트당 2라 +4)
  ptsPerTier: 3,         // 단계마다 늘어나는 포인트
  price: 100,            // 1단계 일반 무기 값
  priceGrow: 1.6,        // 단계마다 값이 이만큼 곱해진다
  sellRate: 0.4,         // 되팔면 산 값의 40%
  bagMax: 30,            // 가방에 넣을 수 있는 무기 수
};
// 오늘의 특가 — 날짜로 종류 · 등급을 정하고, 단계는 내 레벨에 맞는 가장 높은 단계
export const DEAL = {
  discount: 0.3,         // 30% 할인
  perDay: 1,             // 하루에 살 수 있는 수
  grades: [1, 2, 3],     // 특가로 나오는 등급(고급 · 희귀 · 영웅)
};

/* ── 스킬 ──────────────────────────────────────────────── */
// 계열 — 해금 조건에 쓰는 스탯
export const SKILL_FAMS = [
  { id: "phys", name: "물리", stat: "str" },
  { id: "magic", name: "마법", stat: "int" },
  { id: "crit", name: "치명타", stat: "crit" },
  { id: "life", name: "생존", stat: "hp" },
];
/* 스킬 — 배열의 n번째 값이 n+1레벨로 올릴 때의 조건이다(첫 값은 처음 배울 때).
   gold 비용 · lv 캐릭터 레벨 · need 계열 스탯 수치(장비 · 버프를 뺀, 찍은 포인트로 만든 값).
   패시브는 bonus 만큼 스킬 레벨마다 스탯이 오른다. 액티브는 아직 사고 올리기만 한다(전투에서 쓰기는 다음 작업). */
export const SKILLS = [
  { id: "smash", name: "강타", kind: "active", fam: "phys", note: "앞의 적을 세게 내려친다",
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [30, 40, 50, 60, 70] },
  { id: "might", name: "근력 단련", kind: "passive", fam: "phys", note: "물리력이 오른다", bonus: { stat: "str", per: 4 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [20, 30, 40, 50, 60] },
  { id: "burst", name: "마력 폭발", kind: "active", fam: "magic", note: "둘레에 마력을 터뜨린다",
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [30, 40, 50, 60, 70] },
  { id: "mana", name: "마나 친화", kind: "passive", fam: "magic", note: "마법력이 오른다", bonus: { stat: "int", per: 4 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [20, 30, 40, 50, 60] },
  { id: "pierce", name: "급소 찌르기", kind: "active", fam: "crit", note: "반드시 치명타가 터지는 일격",
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [10, 15, 20, 25, 30] },
  { id: "eye", name: "날카로운 눈", kind: "passive", fam: "crit", note: "치명타 확률이 오른다", bonus: { stat: "crit", per: 1 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [8, 12, 16, 20, 24] },
  { id: "aid", name: "응급 처치", kind: "active", fam: "life", note: "체력을 크게 되찾는다",
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [200, 300, 400, 500, 600] },
  { id: "tough", name: "강인함", kind: "passive", fam: "life", note: "최대 체력이 오른다", bonus: { stat: "hp", per: 30 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [130, 200, 270, 340, 410] },
];

/* ── 물약 ──────────────────────────────────────────────── */
// kind: heal(최대 체력의 pct 만큼 회복) · buff(dur 초 동안 stat 이 amt 만큼) · reset(찍은 스탯 포인트를 모두 돌려받는다)
export const POTIONS = [
  { id: "heal_s", name: "회복 물약 (소)", kind: "heal", pct: 0.25, price: 30 },
  { id: "heal_m", name: "회복 물약 (중)", kind: "heal", pct: 0.5, price: 80 },
  { id: "heal_l", name: "회복 물약 (대)", kind: "heal", pct: 0.8, price: 200 },
  { id: "buff_str", name: "힘의 물약", kind: "buff", stat: "str", amt: 20, dur: 60, price: 150 },
  { id: "buff_int", name: "지혜의 물약", kind: "buff", stat: "int", amt: 20, dur: 60, price: 150 },
  { id: "buff_crit", name: "집중의 물약", kind: "buff", stat: "crit", amt: 10, dur: 60, price: 200 },
  { id: "reset", name: "스탯 초기화 물약", kind: "reset", price: 5000 },
];
export const POTION = {
  stackMax: 99,          // 한 종류를 이만큼까지 가질 수 있다
  greatChance: 0.05,     // 마실 때 5% 확률로 효과 2배 — "대성공" (초기화 물약에는 없다)
  greatMul: 2,
};

/* ── 도박장 ─────────────────────────────────────────────── */
export const CASINO = {
  evTarget: 0.9,         // 모든 게임의 기댓값 — 건 금액의 90%
  minBet: 10,
  maxBet: 1000,          // 한 번에 걸 수 있는 최대 코인
  daily: { box: 10, dice: 30, slot: 30 },   // 하루 이용 횟수
};
// 랜덤 상자 — 내 레벨 단계의 무기 또는 물약이 나온다. 값은 내용물 상점가의 기댓값 ÷ evTarget 으로 정한다.
export const BOX = {
  weapon: 0.5,           // 무기가 나올 확률(나머지는 물약)
  grades: [50, 30, 14, 5, 1],               // 무기 등급별 확률(%) — 일반 · 고급 · 희귀 · 영웅 · 전설
  potions: { heal_s: 30, heal_m: 25, heal_l: 15, buff_str: 10, buff_int: 10, buff_crit: 10 },   // 물약별 확률(%)
};
// 주사위 홀짝 — 맞히면 2배. houseEdge 확률로 주사위가 모서리에 서서 집이 가져간다(기댓값 0.9).
export const DICE = { pay: 2, house: 0.1 };
// 슬롯머신 — 세 칸이 같은 그림이면 건 금액 × mul. w 는 한 칸에 그 그림이 나올 무게.
export const SLOT = [
  { id: "cherry", name: "체리", w: 40, mul: 5 },
  { id: "lemon", name: "레몬", w: 30, mul: 10 },
  { id: "bell", name: "종", w: 20, mul: 25 },
  { id: "star", name: "별", w: 7, mul: 200 },
  { id: "seven", name: "7", w: 3, mul: 1500 },
];
