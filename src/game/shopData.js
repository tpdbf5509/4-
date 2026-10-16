/* ── RPG 광장 상점 설정 ─────────────────────────────────────
   가격 · 확률 · 제한 수치를 모두 여기 한 곳에 모은다. 밸런스를 바꿀 때는 이 파일만 고치면 된다.
   화폐는 기존 "코인"을 그대로 쓴다.
   스탯 수치는 스탯 창에 보이는 값과 같은 단위다(물리력 10 · 체력 100 · 치명타 확률 5 = 5%). */

/* 광장 상점 다섯 곳 — 자리(x, y)는 광장 맵 좌표(바닥 그림의 꽃밭 · 바위를 비켜 둔 풀밭). 가까이 가서 대화 키(E)를 누르면 창이 열린다. */
export const SHOPS = [
  { id: "weapon", name: "무기상점", keeper: "대장장이", x: 300, y: 330, color: "#b98a6a", line: "좋은 무기는 사냥을 바꾸지." },
  { id: "skill", name: "스킬 상점", keeper: "현자", x: 200, y: 780, color: "#8a9ac2", line: "익힐 준비가 되었는가?" },
  { id: "potion", name: "물약 상점", keeper: "약사", x: 1600, y: 330, color: "#8fb59a", line: "다치면 언제든 오게." },
  { id: "casino", name: "도박장", keeper: "딜러", x: 1550, y: 950, color: "#c29a8a", line: "운을 시험해 보시겠어요?" },
  // 무기 강화소 — 강화석으로 무기를 +1 ~ +30 까지 올리고, 보스가 떨군 재료를 판다. 확률 · 값은 itemData.js
  // 주문서 상점 — 지역 워프권을 판다(SCROLLS). 가방(I)의 "주문서" 탭에서 쓴다
  { id: "scroll", name: "주문서 상점", keeper: "필경사", x: 1240, y: 300, color: "#9fb0a0", line: "먼 길도 한 장이면 충분하지요." },
  { id: "forge", name: "무기 강화소", keeper: "강화 장인", x: 430, y: 1020, color: "#a3907c", line: "강화석만 있으면 무기를 더 단단하게 해 주지." },
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
  { id: "bow", name: "활", stat: "str", mul: 1, price: 1 },             // 궁수 공격력과 같은 물리력
];
// 등급 — mul 은 스탯 배율, price 는 값 배율
export const GRADES = [
  { id: 0, name: "일반", mul: 1, price: 1 },
  { id: 1, name: "고급", mul: 1.3, price: 2 },
  { id: 2, name: "희귀", mul: 1.7, price: 4 },
  { id: 3, name: "영웅", mul: 2.2, price: 8 },
  { id: 4, name: "전설", mul: 3, price: 16 },
];
// 단계 — 10레벨마다 무기 단계가 오른다. 단계의 레벨이 곧 레벨 제한이다.
// 상점에서 단계별로 고르는 목록은 없다. 오늘의 특가 · 랜덤 상자가 내 레벨 단계의 무기를 준다.
export const WEAPON_TIERS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const WEAPON = {
  pts: 2,                // 1단계 일반 무기가 주는 양 — 스탯 포인트로 셈한 값(물리력이면 포인트당 2라 +4)
  ptsPerTier: 3,         // 단계마다 늘어나는 포인트
  price: 100,            // 1단계 일반 무기 값
  priceGrow: 1.6,        // 단계마다 값이 이만큼 곱해진다
  sellRate: 0.4,         // 되팔면 산 값의 40%
  bagMax: 30,            // 가방에 넣을 수 있는 무기 수
};
/* 특별 무기 — 이름과 그림이 있는 무기. 무기상점에서 코인으로 바로 산다(같은 무기는 한 자루만). 오늘의 특가 · 랜덤 상자에서도 나온다.
   lv 는 레벨 제한(무기 단계 가운데 하나), g 는 등급, stat 은 올리는 스탯.
   올리는 양 · 값은 같은 단계 · 등급의 일반 무기에 SPECIAL 배율을 곱한다. art 는 public/assets/game/rpg/weapons/<art>.webp */
export const SPECIAL = { mul: 1.25, price: 1.5 };
export const SPECIALS = [
  { id: "clockwork", name: "태엽검", t: "sword", lv: 10, g: 3, stat: "str", art: "clockwork" },
  { id: "forest", name: "숲의 검", t: "sword", lv: 20, g: 3, stat: "hp", art: "forest" },
  { id: "coral", name: "산호검", t: "sword", lv: 30, g: 3, stat: "int", art: "coral" },
  { id: "viper", name: "독사 단검", t: "dagger", lv: 40, g: 3, stat: "crit", art: "viper" },
  { id: "thunder", name: "번개검", t: "sword", lv: 50, g: 3, stat: "str", art: "thunder" },
  { id: "frost", name: "서리검", t: "sword", lv: 60, g: 4, stat: "cdmg", art: "frost" },
  { id: "flame", name: "화염검", t: "sword", lv: 70, g: 4, stat: "str", art: "flame" },
  { id: "star", name: "별의 검", t: "sword", lv: 80, g: 4, stat: "int", art: "star" },
  { id: "shadow", name: "암흑검", t: "great", lv: 90, g: 4, stat: "cdmg", art: "shadow" },
  { id: "holy", name: "신성검", t: "sword", lv: 100, g: 4, stat: "str", art: "holy" },
  // 지팡이 — 마법사 공격력인 마법력을 올린다
  { id: "moon_staff", name: "초승달 지팡이", t: "staff", lv: 10, g: 3, stat: "int", art: "moon_staff" },
  { id: "ice_staff", name: "얼음 수정 지팡이", t: "staff", lv: 20, g: 3, stat: "int", art: "ice_staff" },
  { id: "skull_staff", name: "해골 지팡이", t: "staff", lv: 40, g: 3, stat: "int", art: "skull_staff" },
  { id: "flame_staff", name: "화염 지팡이", t: "staff", lv: 60, g: 4, stat: "int", art: "flame_staff" },
  { id: "thunder_staff", name: "번개 지팡이", t: "staff", lv: 70, g: 4, stat: "int", art: "thunder_staff" },
  { id: "galaxy_staff", name: "은하 지팡이", t: "staff", lv: 90, g: 4, stat: "int", art: "galaxy_staff" },
  { id: "holy_staff", name: "신성 지팡이", t: "staff", lv: 100, g: 4, stat: "int", art: "holy_staff" },
  // 활 — 궁수 공격력인 물리력을 올린다
  { id: "thunder_bow", name: "번개 활", t: "bow", lv: 50, g: 3, stat: "str", art: "thunder_bow" },
  { id: "lava_bow", name: "용암 활", t: "bow", lv: 60, g: 4, stat: "str", art: "lava_bow" },
  { id: "shadow_bow", name: "그림자 활", t: "bow", lv: 80, g: 4, stat: "str", art: "shadow_bow" },
  { id: "star_bow", name: "별자리 활", t: "bow", lv: 90, g: 4, stat: "str", art: "star_bow" },
  { id: "gold_bow", name: "황금 날개 활", t: "bow", lv: 100, g: 4, stat: "str", art: "gold_bow" },
];

// 오늘의 특가 — 날짜로 정한다. 특별 무기 날이면 내 레벨로 낄 수 있는 특별 무기 하나,
// 아니면 종류 · 등급을 정하고 단계는 내 레벨에 맞는 가장 높은 단계
export const DEAL = {
  discount: 0.3,         // 30% 할인
  perDay: 1,             // 하루에 살 수 있는 수
  grades: [1, 2, 3],     // 일반 무기 특가로 나오는 등급(고급 · 희귀 · 영웅)
  special: 0.5,          // 특별 무기가 특가로 나오는 날의 몫(이틀에 한 번꼴)
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
   패시브는 bonus 만큼 스킬 레벨마다 스탯이 오른다.
   액티브는 use 대로 숫자키(key)로 쓴다. cd 는 다시 쓰기까지 초, mul 은 스킬 레벨별 위력 배율(SKILL_USE.base × 스탯 배율에 곱한다).
   dmg 는 위력을 따르는 스탯 — str 물리력 · int 마법력 · job 직업의 공격 스탯. */
export const SKILL_USE = {
  base: 40,              // 공격 스킬의 기본 피해 — 스탯 10 일 때 mul 1 이면 이만큼
  reach: 1.3,            // 한 마리를 노리는 스킬의 사거리 — 내 평타 사거리의 배수
};
export const SKILLS = [
  { id: "smash", name: "강타", kind: "active", fam: "phys", note: "가장 가까운 적 하나를 세게 내려친다",
    use: { key: 1, cd: 6, dmg: "str", mul: [3, 3.6, 4.2, 4.8, 5.4] },
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [30, 40, 50, 60, 70] },
  { id: "might", name: "근력 단련", kind: "passive", fam: "phys", note: "물리력이 오른다", bonus: { stat: "str", per: 4 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [20, 30, 40, 50, 60] },
  { id: "burst", name: "마력 폭발", kind: "active", fam: "magic", note: "내 둘레의 적을 모두 친다",
    use: { key: 2, cd: 10, dmg: "int", radius: 210, mul: [2, 2.4, 2.8, 3.2, 3.6] },
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [30, 40, 50, 60, 70] },
  { id: "mana", name: "마나 친화", kind: "passive", fam: "magic", note: "마법력이 오른다", bonus: { stat: "int", per: 4 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [20, 30, 40, 50, 60] },
  { id: "pierce", name: "급소 찌르기", kind: "active", fam: "crit", note: "가장 가까운 적에게 돌진해 찌른다 · 반드시 치명타가 터진다",
    // lunge — reach 안의 가장 가까운 적 앞까지 time 초에 달려가 찌른다. 달려가는 동안은 맞지 않는다
    use: { key: 3, cd: 8, dmg: "job", crit: 1, mul: [2.2, 2.6, 3, 3.4, 3.8], lunge: { reach: 320, time: 0.18 } },
    gold: [400, 800, 1600, 3200, 6400], lv: [5, 10, 15, 20, 25], need: [10, 15, 20, 25, 30] },
  { id: "eye", name: "날카로운 눈", kind: "passive", fam: "crit", note: "치명타 확률이 오른다", bonus: { stat: "crit", per: 1 },
    gold: [300, 600, 1200, 2400, 4800], lv: [1, 5, 10, 15, 20], need: [8, 12, 16, 20, 24] },
  { id: "aid", name: "응급 처치", kind: "active", fam: "life", note: "최대 체력의 일부를 바로 되찾는다",
    use: { key: 4, cd: 30, heal: [0.25, 0.3, 0.35, 0.4, 0.45] },
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
  // 이속 물약 — amt 만큼 걷는 속도가 빨라진다. 다시 마시면 시간은 새로, 양은 큰 쪽
  { id: "speed1", name: "이속 물약 I", kind: "speed", amt: 0.3, dur: 50, price: 300 },
  { id: "speed2", name: "이속 물약 II", kind: "speed", amt: 0.5, dur: 120, price: 900 },
  // 투명화 물약 — 몹이 알아채지 못한다(보스도 · 공격해도 풀리지 않는다). 결투장 · 던전에서는 마실 수 없다
  { id: "hide1", name: "투명화 물약 I", kind: "hide", dur: 30, price: 1750 },   // 반격 없이 사냥할 수 있어 600 에서 올렸다
  { id: "hide2", name: "투명화 물약 II", kind: "hide", dur: 50, price: 3000 },  // 1,200 에서 올렸다
];
export const POTION = {
  stackMax: 99,          // 한 종류를 이만큼까지 가질 수 있다
  slots: 3,              // 물약 칸 — 가방에서 물약을 넣어 두고 숫자키(5 · 6 · 7)나 화면 칸으로 바로 마신다
  greatChance: 0.05,     // 마실 때 5% 확률로 효과 2배 — "대성공" (회복 · 버프 물약만. 초기화 · 이속 · 투명화에는 없다)
  greatMul: 2,
};

/* ── 주문서 — 지역 워프권 ───────────────────────────────────
   쓰면 고른 지역(광장 · 사냥터)의 입구로 바로 옮겨 간다. 한 번 쓸 때마다 1회씩 줄어든다.
   n 회짜리를 price 코인에 판다 — 많이 살수록 한 번 값이 싸다. 가진 횟수는 가방(bag.wp)에 쌓인다 */
export const SCROLLS = [
  { id: "warp3", name: "지역 워프권 3회", n: 3, price: 1500 },    // 1회 500
  { id: "warp6", name: "지역 워프권 6회", n: 6, price: 2700 },    // 1회 450
  { id: "warp10", name: "지역 워프권 10회", n: 10, price: 4000 }, // 1회 400
];
// 하락 방지권 — 강화에 실패해 단계가 떨어질 때 한 장을 써서 막는다(강화석 · 코인은 그대로 사라진다).
// 강화소에서 "방지권 쓰기"를 켜 둔 때만 쓰고, 떨어지지 않은 실패 · 성공에는 쓰지 않는다
export const GUARD = { name: "하락 방지권", price: 3000, max: 99 };
export const WARP = {
  max: 999,                          // 가질 수 있는 횟수
  // 갈 수 있는 지역 — 차례대로 보인다. 결투장은 결투 신청으로만 간다
  maps: ["plaza", "field", "wolf", "boar", "gorilla", "goblin", "orc", "ogre"],
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
  special: 0.02,         // 특별 무기가 나올 확률 — 내 레벨로 낄 수 있는 것 가운데 하나. 없으면 일반 무기로 바뀐다
  weapon: 0.48,          // 일반 무기가 나올 확률(나머지는 물약)
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
