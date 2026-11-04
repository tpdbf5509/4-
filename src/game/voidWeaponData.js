/* 공허의 관측자 전용 무기 스킬 수치 — 한 곳에서만 고친다(11월 4일, 사용자 요청).
   화염검(skillData.js flame)과 광역 사냥으로 겨루는 무기 셋. 총 피해 배율은 사용자가 정했고, 타마다 나눈 값은 그 합이 총량이 되게 둔다.
   - 대검 차원 절단: 둘레 6번 베기(0.9초) + 공간 폭발. 총 5.6배 · 15초
   - 장궁 차원 폭우: 정한 자리 위 균열에서 화살 8발 낙하(1.5초). 총 5.6배 · 17초
   - 지팡이 특이점 붕괴: 블랙홀 2초 · 5번 피해 + 마지막 폭발. 총 6.0배 · 19초
   한 대상은 한 판정에 한 번만 맞고(타마다 mul), 모든 타를 맞아도 total 을 넘지 않는다. 패시브 추가 공격은 새 패시브를 켜지 못한다(무한 연쇄 금지).
   화염검 기준: 둘레 150에 0.504 × 10타 = 5.04배(14초) + 불똥 3개마다 회오리 2.2배. */
export const VOID_PALETTE = {
  deep: '#150b2b', dark: '#2a1458', violet: '#6a3fc2', purple: '#a077f0', glow: '#d3b8ff', core: '#f4ebff', rift: '#07030f', gravity: '#b58cff',
};
const total = (S) => Math.round(S.parts.reduce((a, [n, mul]) => a + n * mul, 0) * 1000) / 1000;
export const VOID_SKILLS = {
  void_great: {
    name: '차원 절단', role: '근접 광역 · 6연속 베기와 공간 폭발',
    passive: { name: '차원의 잔흔', note: '몬스터 3마리를 처치하면 다음 평타에 반경 170의 공간 참격이 더해진다', need: 3, max: 2, r: 170, mul: 2.4 },
    skill: { note: '둘레 공간이 갈라지며 0.9초 동안 6번 연달아 베고 마지막에 큰 공간 폭발 · 총 5.6배',
      cd: 15, r: 200, dur: 0.9, slashes: 6, slashMul: 0.7, burstMul: 1.4, burstR: 200, total: 5.6, life: 1.25 },
  },
  void_bow: {
    name: '차원 폭우', role: '원거리 광역 · 균열에서 쏟아지는 화살',
    passive: { name: '차원 화살', note: '평타가 4번 맞을 때마다 맞힌 자리 둘레 반경 130에 추가 화살 폭발', need: 4, r: 130, mul: 1.8 },
    // 균열은 reach 안의 가장 적이 몰린 자리 위에 열린다. 화살 하나는 arrowR 둘레를 치고, 떨어지는 자리는 폭격 범위 r 안(r - arrowR 이내)에 퍼진다
    skill: { note: '정한 자리 상공에 차원 균열이 열리고 1.5초 동안 공허의 화살 8발이 떨어진다 · 총 5.6배',
      cd: 17, reach: 600, r: 230, arrows: 8, arrowR: 140, arrowMul: 0.7, start: 0.25, span: 1.25, fall: 0.22, total: 5.6, life: 1.9 },
  },
  void_staff: {
    name: '특이점 붕괴', role: '광역 집결 · 블랙홀과 연쇄 폭발',
    passive: { name: '중력 공명', note: '공격 스킬이 5번 맞을 때마다 맞힌 자리에 반경 140의 작은 중력 폭발', need: 5, r: 140, mul: 1.2, gap: 0.8 },
    // 몬스터를 중심으로 끌어당기는 힘(pull px/초)은 처음 pullFor 초 동안만 — 그 뒤 수축하고 폭발한다. 보스급 몬스터와 사람은 끌지 않는다
    skill: { note: '정한 자리에 블랙홀이 생겨 2초 동안 몬스터를 끌어당기며 5번 피해를 주고 마지막에 큰 폭발 · 총 6.0배',
      cd: 19, reach: 500, r: 250, ticks: 5, tickMul: 0.8, first: 0.35, gap: 0.35, burstAt: 2.0, burstMul: 2.0, burstR: 250, pull: 230, pullFor: 1.7, total: 6.0, life: 2.5 },
  },
};
// 합계가 사용자가 정한 총 배율과 같은지 시험이 본다(voidTotals)
export const voidTotals = {
  void_great: total({ parts: [[VOID_SKILLS.void_great.skill.slashes, VOID_SKILLS.void_great.skill.slashMul], [1, VOID_SKILLS.void_great.skill.burstMul]] }),
  void_bow: total({ parts: [[VOID_SKILLS.void_bow.skill.arrows, VOID_SKILLS.void_bow.skill.arrowMul]] }),
  void_staff: total({ parts: [[VOID_SKILLS.void_staff.skill.ticks, VOID_SKILLS.void_staff.skill.tickMul], [1, VOID_SKILLS.void_staff.skill.burstMul]] }),
};
// 화살 낙하 자리 — 같은 번호면 늘 같은 자리(균열 중심 기준 [x, y] 비율). 황금각으로 퍼뜨려 겹침을 줄인다. 연출과 판정이 함께 쓴다
export function voidArrowSpot(S, i, cx, cy, squash) {
  const a = i * 2.39996 + 0.6, d = i === 0 ? 0 : (S.r - S.arrowR) * Math.sqrt((i + 0.35) / S.arrows);
  return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * squash];
}
