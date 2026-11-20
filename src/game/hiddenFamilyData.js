/* 히든 직업 계열(11월 20일 사용자 "히든 직업은 히든직업이고, 전용 사거리를 만들어줘")
   히든 직업은 검사 · 마법사 · 궁수 묶음(JOB_FAMILY)에 들지 않는 따로 된 계열이다.
   - 사거리: 평타 사거리는 아래 표 한 곳. 바탕 직업(h.job)의 rng · 궁수 보정은 쓰지 않는다(rpg.js heroRange).
   - 무기: 전용 무기(레퀴엠 · 아르카디온 · 그림자 낫)는 묶음이 달라도 "다른 무기 고정 피해"를 받지 않는다(rpg.js offHand).
   - 피해 스탯 · 직업 피해 배율은 아직 바탕 직업을 따른다(수치는 바꾸지 않았다).
   직업 id 는 bag.hj.jobs 칸 이름과 같다(BLOOD-001 만 "blood"). */
export const HIDDEN_FAMILY = { id: "hidden", name: "히든" };

/* 평타 사거리(게임 거리) — base 는 히든 계열 공통 값. 자기 값이 없는 히든 직업은 base 를 쓴다.
   base 230: BLOOD-001 크림슨 레퀴엠(총)에 맞춘 값 — 총과 같은 묶음이던 궁수 바탕의 예전 사거리(약 227)와 거의 같다.
   나머지는 각 직업 평타가 원래 쓰던 거리 그대로(판정 그대로) — 데이터 파일이 이 표를 읽는다. */
const BASE = 230;
export const HIDDEN_RANGE = {
  base: BASE,
  blood: BASE,          // 크림슨 레퀴엠 사격 — 바탕 직업과 상관없이 한 대상을 쏜다
  gambler: 480,         // 황금 칩(GM_CHIP.range)
  engineer: 520,        // 펄스 발진(EN_PULSE.range)
  necromancer: 140,     // 그림자 낫 근접 부채꼴(NC_SCYTHE.reach)
  illusionist: 550,     // 절단 카드(IL_CARD.range)
  wyvern: 160,          // 용조격 근접 부채꼴(WY_CLAW.reach)
};
export const hiddenRange = (id) => HIDDEN_RANGE[id] ?? HIDDEN_RANGE.base;
