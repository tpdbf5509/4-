/* 크림슨 레퀴엠 · 전용 스킬 「혈계 추격」 수치 — 한 곳에서만 고친다(11월 13일, 사용자 기획).
   흐름: 평타 → 혈흔 축적 → 관통 혈탄 → 유도 혈탄 6발 → 혈흔 폭발. 한 번 누르면 전부 자동으로 이어진다(추가 입력 없음).
   피해는 모두 기본 스킬 피해(skillBase)의 배수다. 총합(혈흔 5중첩 단일 대상에 6발이 모두 맞을 때)은 bloodTotal() 이 시험에서 7.2 인지 본다.
   판정은 bloodGunCombat.js(방장 · 전용 서버), 연출은 bloodGunArt.js — 연출 시간은 이 수치에서 읽어 판정과 어긋나지 않는다. */
export const BLOOD_PALETTE = { deep: '#650B17', base: '#B8192D', bright: '#E53945', glow: '#FF6973', shadow: '#1A0B14' };

// 무기 — 얻는 곳은 사용자가 정한다. 그때까지 hold 라 상점 · 특가 · 랜덤 상자 · 관리자 자동 지급에서 빠지고 관리자 /지급 으로만 받는다.
// 총은 궁수 묶음 무기(WEAPON_FAMILY)다. 올리는 양은 적룡 지팡이(260)와 같게 시작한다.
export const BLOOD_GUN_ITEM = { id: 'blood_gun', name: '크림슨 레퀴엠', t: 'gun', lv: 100, g: 4, stat: 'str', amt: 260, art: 'blood_gun', hold: 1 };

export const BLOOD_SKILLS = {
  blood_gun: {
    name: '혈계 추격', role: '관통 사격 · 유도 혈탄 · 혈흔 폭발',
    // 평타가 맞으면 혈흔 1중첩(최대 max) · dur 초 동안 다시 맞히지 못하면 사라진다(맞히면 갱신). 혈흔 자체에는 지속 피해가 없다.
    // 혈흔은 적마다 따로 센다. 무기를 바꾸면 모두 사라진다. 스킬이 맞혀서는 쌓이지 않는다
    passive: { name: '혈흔', note: '평타가 맞으면 적에게 혈흔이 쌓인다(최대 5중첩 · 6초 · 다시 맞히면 갱신) · 혈계 추격의 유도 혈탄이 닿으면 한꺼번에 터진다', max: 5, dur: 6 },
    skill: {
      note: '붉은 에너지를 모아 적을 꿰뚫는 혈탄을 쏜다 · 맞으면 유도 혈탄 6발이 적을 추격하고 혈흔이 쌓인 적은 한꺼번에 터진다 · 한 번 누르면 끝까지 자동',
      cd: 18,
      // 1단계 충전 charge 초 → 2단계 관통 혈탄(reach · width · 빠르기 v) 피해 mul, 닿은 모든 적
      charge: 0.4, reach: 650, width: 65, v: 2200, mul: 2.0,
      // 3단계 유도 혈탄 — 첫 적중 자리에서 form 초 동안 응축한 뒤 날아간다. n 발 · 발당 피해 seekMul · 추적 범위 seekR
      // 날아가는 시간은 거리 / seekV 를 seekMin ~ seekMax 로 자른다(너무 느리거나 맴돌지 않게). 발마다 gap 초씩 어긋나 출발
      n: 6, seekMul: 0.45, seekR: 500, form: 0.3, gap: 0.03, seekV: 950, seekMin: 0.22, seekMax: 0.55,
      // 4 · 5단계 혈흔 공명 → 폭발 — 유도 혈탄이 혈흔 있는 적에게 닿으면 혈흔을 모두 써서 res 초 뒤 반경 boomR 폭발.
      // 폭발 피해: 그 적은 중첩 × boomMul, 폭발에 든 다른 적은 같은 값의 splash 배(혈흔 추가 피해 · 연쇄 없음). 대상마다 한 번만
      res: 0.25, boomMul: 0.5, boomR: 85, splash: 0.5,
      life: 4, sndGap: 0.09,   // 안전 상한(초) · 유도탄이 한꺼번에 맞아도 적중음은 이 간격(초)마다 하나
    },
  },
};
// 합계 — 5중첩 단일 대상에 6발이 모두 맞을 때(사용자 기획 7.2배): 관통 + 유도 + 폭발
export const bloodTotal = (stacks = 5) => {
  const S = BLOOD_SKILLS.blood_gun.skill;
  return Math.round((S.mul + S.n * S.seekMul + stacks * S.boomMul) * 1000) / 1000;
};
// 유도 혈탄 곡선 — i 번째 탄의 휘는 정도(px, 부호 = 휘는 쪽). 연출과 판정이 같은 값을 쓴다
export const bloodBend = (i) => (i % 2 ? 1 : -1) * (46 + 22 * (i % 3));
