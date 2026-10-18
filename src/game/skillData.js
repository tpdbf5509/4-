/* ── RPG 직업 스킬 · 전설 무기 스킬 — 수치는 모두 여기 한 곳 ─────────────
   직업 스킬은 스킬 상점 "직업" 탭에서 배운다(제 직업 것만). 키는 use5 · use6 · use7(기본 R · F · G).
   무기 스킬은 전설 특별 무기(서리검 · 화염검 · 별의 검 · 암흑검 · 신성검)를 들면 쓴다. 키는 wskill(기본 X).
   피해는 SKILL_USE.base(shopData.js) × 스탯 배율 × mul. 규칙은 rpg.js(rpgUseSkill · rpgWeaponSkill · 무기 패시브),
   연출은 skillArt.js. */

const LV5 = (a, b) => [0, 1, 2, 3, 4].map((i) => Math.round((a + ((b - a) * i) / 4) * 100) / 100);
const GOLD = [600, 1200, 2400, 4800, 9600];
const NEED_LV = [20, 30, 45, 60, 80];

// 직업 스킬 — shopData.js SKILLS 에 붙여 상점 · 가방 · 스킬 칸이 함께 쓴다(fam "job").
// kind 가 없으면 산 스킬과 같은 셈(돌진 베기는 lunge + splash). kind: line 앞으로 한 줄 · guard 받는 피해 감소 · volley 여러 발 · leap 뒤로 물러나며 쏘기 · orb 큰 구슬 · chain 연쇄 번개 · shield 보호막
export const JOB_SKILLS = [
  // 전사
  { id: "j_rush", job: "warrior", name: "돌진 베기", note: "가장 가까운 적에게 달려가 둘레를 벤다",
    use: { key: 5, cd: 9, dmg: "str", lunge: { reach: 320, time: 0.18 }, splash: 120, mul: LV5(2.4, 4.4) } },   // 급소 찌르기와 같은 돌진 · 닿은 자리 둘레 splash 를 모두
  { id: "j_cleave", job: "warrior", name: "대지 가르기", note: "앞으로 땅을 갈라 한 줄의 적을 모두 친다",
    use: { key: 6, cd: 7, kind: "line", dmg: "str", len: 320, width: 70, mul: LV5(2.2, 4) } },
  { id: "j_iron", job: "warrior", name: "철벽", note: "잠시 받는 피해를 크게 줄인다",
    use: { key: 7, cd: 25, kind: "guard", dur: 4, cut: LV5(0.4, 0.6) } },
  // 궁수
  { id: "j_pierce", job: "archer", name: "관통 화살", note: "앞으로 꿰뚫는 화살 · 한 줄의 적을 모두 친다",
    use: { key: 5, cd: 7, kind: "line", dmg: "str", len: 460, width: 50, mul: LV5(2, 3.6), arrow: 1 } },
  { id: "j_volley", job: "archer", name: "연사", note: "가장 가까운 적에게 화살 다섯 발을 잇달아 쏜다",
    use: { key: 6, cd: 9, kind: "volley", dmg: "str", n: 5, gap: 0.14, mul: LV5(0.7, 1.15) } },
  { id: "j_leap", job: "archer", name: "후퇴 사격", note: "뒤로 물러나며 가장 가까운 적을 쏘고 느리게 한다",
    use: { key: 7, cd: 8, kind: "leap", dmg: "str", back: 200, time: 0.2, slow: 2, mul: LV5(1.6, 2.8) } },
  // 마법사
  { id: "j_orb", job: "mage", name: "원소 구체", note: "큰 원소 구슬을 던져 맞은 자리 둘레를 친다",
    use: { key: 5, cd: 8, kind: "orb", dmg: "int", splash: 140, mul: LV5(2.4, 4.2) } },
  { id: "j_chain", job: "mage", name: "연쇄 번개", note: "번개가 적 사이를 다섯 번 옮겨 다닌다 · 옮길 때마다 약해진다",
    use: { key: 6, cd: 9, kind: "chain", dmg: "int", jumps: 5, hop: 190, fall: 0.8, mul: LV5(2, 3.4) } },
  { id: "j_shield", job: "mage", name: "마나 보호막", note: "최대 체력의 일부만큼 피해를 막는 보호막",
    use: { key: 7, cd: 28, kind: "shield", dur: 6, amt: LV5(0.3, 0.5) } },
].map((s) => ({ ...s, kind: "active", fam: "job", gold: GOLD, lv: NEED_LV, need: [40, 60, 80, 100, 130] }));
export const JOB_KEYS = { 5: "R", 6: "F", 7: "G" };    // 상점 설명에 보이는 기본 키

/* 전설 무기 스킬 — 특별 무기 id 로 찾는다. passive 는 무기를 든 동안 늘, skill 은 wskill 키로 쓴다 */
export const WEAPON_SKILLS = {
  frost: {
    name: "빙판길", role: "제어와 추격 차단",
    passive: { name: "서리의 흔적", note: "맞히면 이동 속도를 줄인다 · 맞힐 때마다 0.5초씩 쌓여 최대 2초", per: 0.5, max: 2 },
    skill: { note: "앞에 4초 동안 빙판 · 위의 적은 느려지고 지속 피해", cd: 12, dur: 4, ahead: 150, r: 130, slow: 0.5, tick: 0.5, mul: 0.45 },   // 0.5초마다 mul 만큼 피해
    elem: { frost: 1.5, note: "얼음 캐릭터는 빙판의 둔화와 지속 피해가 1.5배" },
  },
  flame: {
    name: "화염베기", role: "화상 폭발",
    passive: { name: "잔불 수확", note: "몹을 잡거나 결투에서 평타를 맞히면 불똥 1개 · 3개면 다음 평타에 불꽃 회오리", need: 3, max: 30, r: 150, mul: 2.2 },
    skill: { note: "0.7초 동안 둘레를 10번 몰아 베고 불똥 9개", cd: 14, dur: 0.67, hits: 10, r: 150, mul: 0.56, embers: 9 },   // 기획 영상과 같은 빠르기(0.067초마다 한 번 · 10번) · 모두 합친 피해는 8번 × 0.7 과 같다
    dot: 0.5,                                         // 든 동안 화상 · 독 피해 +50%
    elem: { flame: 1.3, note: "불 캐릭터는 화상에 걸린 적에게 회오리 · 화염베기 피해 1.3배" },
  },
  star: {
    name: "유성 낙하", role: "마력 충전과 폭발",
    passive: { name: "별의 축적", note: "맞힐 때마다 별빛 1 · 최대 999", max: 999 },
    skill: { note: "별빛을 모두 써서 유성 여러 개를 흩뿌린다 · 많이 모을수록 넓고 많고 세다(10 이상)", cd: 10, min: 10, reach: 360, r0: 90, rPer: 0.14, rMax: 260, mul0: 1.5, mulPer: 0.012, mulMax: 13,
      // 유성 수 = n0 + 별빛 nPer 마다 1(최대 nMax) · 하나는 넓이 rEach 배 · 피해 each 배(겹쳐 맞으면 더 아프다) · gap 초마다 하나씩
      n0: 3, nPer: 100, nMax: 9, rEach: 0.5, each: 0.5, gap: 0.12 },
    note: "모든 원소가 충전한다 · 원소 효과는 없고 마법력과 충전량으로 셈한다",
  },
  shadow: {
    name: "종말의 일격", role: "위험을 감수한 폭딜",
    passive: { name: "무거운 대가", note: "공격할 때 분노 1 · 분노 하나에 공격력 +3% · 이동 속도 -2% · 최대 20 · 4초 쉬면 1초에 5씩 식는다",
      max: 20, atk: 0.03, slow: 0.02, calm: 4, decay: 5 },
    skill: { note: "분노를 모두 써서 강한 일격 · 분노가 많을수록 세다(3 이상)", cd: 8, min: 3, reach: 1.4, mul0: 2, mulPer: 0.3 },
    note: "모든 원소가 쓴다 · 분노 관리와 공격 타이밍이 핵심",
  },
  holy: {
    name: "성광 반격", role: "방어와 반격",
    passive: { name: "수호자의 맹세", note: "피해를 받으면 수호 에너지가 찬다 · 가득 차면 다음 공격 피해 +100%", fill: 1.5, bonus: 1 },   // 최대 체력만큼 받으면 fill 배로 찬다(100 이 가득)
    skill: { note: "3초 동안 받는 피해 50% 감소 · 끝날 때 받은 피해를 앞으로 내뿜는다", cd: 20, dur: 3, cut: 0.5, back: 1.2, len: 340, width: 90, mul: 1.5 },   // 받은 피해(줄이기 전) × back + 기본 피해 × mul 을 앞으로 내뿜는다
    note: "모든 원소가 쓴다 · 보스의 공격을 버틴 뒤 반격하는 무기",
  },
  // 지팡이 넷 — 마법사용(지팡이 묶음). 피해는 마법력(magMul)으로 셈한다
  flame_staff: {
    name: "잿빛 폭발", role: "화상 증폭",
    passive: { name: "불꽃 공명", note: "화상 상태인 적을 치면 피해 +30%(불 캐릭터는 +50%)", bonus: 0.3 },
    skill: { note: "정한 적 둘레에 마력 폭발 · 화상 상태인 적은 1.6배(불 캐릭터는 2배)", cd: 10, reach: 1.4, r: 140, mul: 2.5, burn: 1.6 },
    elem: { flame: 1.5, burn: 2, note: "불 캐릭터는 공명 +50% · 폭발 화상 추가 피해 2배" },
  },
  thunder_staff: {
    name: "낙뢰 지정", role: "단일 대상 집중 공격",
    passive: { name: "전류 집중", note: "같은 적을 이어 치면 집중이 쌓인다 · 하나에 그 적에게 주는 피해 +5% · 최대 10 · 다른 적을 치면 처음부터", per: 0.05, max: 10 },
    skill: { note: "적 하나에 강한 번개 · 집중을 모두 써서 하나에 +40%", cd: 9, reach: 1.5, mul: 3, perStack: 0.4 },
    note: "번개 캐릭터의 연쇄와 달리 한 대상에 몰아친다",
  },
  galaxy_staff: {
    name: "은하 폭격", role: "주문 연계",
    passive: { name: "별의 순환", note: "앞서 쓴 것과 다른 스킬을 쓰면 주문 1 · 최대 10(같은 스킬을 이어 쓰면 쌓이지 않는다)", max: 10 },
    skill: { note: "주문을 모두 써서 정한 곳에 2 + 주문 번 마법 공격(1 이상)", cd: 12, min: 1, reach: 360, r: 150, hit: 70, base: 2, gap: 0.18, mul: 1 },
    note: "모든 원소가 쓴다 · 끌어당기는 중력 효과는 없다",
  },
  holy_staff: {
    name: "신성한 결계", role: "보호막과 마력 방출",
    passive: { name: "마력 장벽", note: "10번 맞히면 최대 체력 8% 보호막(8초)", hits: 10, amt: 0.08, dur: 8 },
    skill: { note: "8초 동안 최대 체력 25% 보호막 · 보호막이 남은 동안 마법 피해 +40% · 깨지면 끝", cd: 18, amt: 0.25, dur: 8, boost: 0.4 },
    note: "원소와 상관없이 보호막과 마법 강화가 작동한다",
  },
};
