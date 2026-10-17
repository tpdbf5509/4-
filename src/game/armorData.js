/* ── RPG 방어구 — 수치는 모두 여기 한 곳 ─────────────────────────
   부위 넷(투구 · 갑옷 · 바지 · 신발) × 등급 넷(초급 · 희귀 · 영웅 · 전설). 부위마다 하나씩 낀다.
   규칙(효과 셈 · 장착 · 되팔기)은 armor.js, 그림은 public/assets/game/rpg/armor/<부위>-<등급>.webp(tools/cut-armor.py).
   SLOTS · GRADES 의 차례는 저장 · 스냅샷에 쓰니 뒤에만 더한다. */

export const ARMOR_SLOTS = [
  { id: "head", name: "투구", note: "최대 체력" },
  { id: "body", name: "갑옷", note: "받는 피해 감소" },
  { id: "legs", name: "바지", note: "공격력" },
  { id: "feet", name: "신발", note: "이동 속도" },
];
// drop — 보스가 방어구를 떨굴 때 등급이 정해지는 몫(%), 합 100. sell — 무기상점에서 되파는 값
export const ARMOR_GRADES = [
  { id: 0, name: "초급", drop: 52, sell: 500 },
  { id: 1, name: "희귀", drop: 30, sell: 2000 },
  { id: 2, name: "영웅", drop: 17, sell: 8000 },
  { id: 3, name: "전설", drop: 1, sell: 30000 },   // 너무 잘 뜬다는 의견으로 3% → 1%(줄인 2% 는 초급으로)
];
// 기본 효과 — 등급 0~3 의 값. 투구 최대 체력 · 갑옷 피해 감소 · 바지 공격력은 5%씩, 신발 이동 속도는 2% 에서 2.5%씩 오른다
export const ARMOR_BASE = {
  head: [0.05, 0.1, 0.15, 0.2],
  body: [0.05, 0.1, 0.15, 0.2],
  legs: [0.05, 0.1, 0.15, 0.2],
  feet: [0.02, 0.045, 0.07, 0.095],
};
// 영웅(2) · 전설(3) 특수 효과
export const ARMOR_SPECIAL = {
  // 투구 — 적을 잡으면 최대 체력의 몫만큼 회복(일반 몹 · 보스)
  head: { 2: { mob: 0.03, boss: 0.1 }, 3: { mob: 0.07, boss: 0.2 } },
  // 갑옷 — 체력이 below 이하로 떨어지면 dur 초 동안 받는 피해 cut 만큼 감소, cd 초에 한 번.
  // 전설은 쓰러질 때 한 번 일어난다 — revive.cd 초에 한 번, 체력 revive.hp 로 · revive.inv 초 무적
  body: {
    2: { below: 0.2, dur: 3, cut: 0.5, cd: 60 },
    3: { below: 0.2, dur: 3, cut: 0.6, cd: 60, revive: { cd: 300, hp: 0.3, inv: 3 } },
  },
  // 바지 — 체력이 below 이하면 공격력 atk 만큼 더. 전설은 공격 속도 aspd 만큼 늘 빨라진다
  legs: { 2: { below: 0.3, atk: 0.1 }, 3: { below: 0.4, atk: 0.2, aspd: 0.1 } },
  // 신발 — 몹을 맞히면 per 초(최대 max 초까지 쌓인다) 동안 그 몹 쪽으로 걸을 때 이동 속도 spd 만큼 더.
  // 전설은 공격 속도 · 공격력도 늘 aspd · atk 만큼
  feet: { 2: { per: 3, max: 15, spd: 0.15 }, 3: { per: 5, max: 30, spd: 0.2, aspd: 0.1, atk: 0.1 } },
};
export const ARMOR = {
  bagMax: 30,           // 가방에 넣을 수 있는 방어구 수
};
export const armorName = (s, g) => `${ARMOR_GRADES[g].name} ${ARMOR_SLOTS.find((q) => q.id === s).name}`;
export const armorArt = (s, g) => `/assets/game/rpg/armor/${s}-${g}.webp`;
