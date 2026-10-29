/* Video Project 2: 0.3초 표본과 빠른 구간의 30fps 표본을 기준으로 한 세 무기.
   시간·색·궤적은 판정과 그림이 공유한다. 피해·사거리는 웹 RPG 좌표에 맞춘 임시 밸런스다. */
export const STORM_WEAPONS = [
  { id: 'storm_staff', name: '뇌명 지팡이', t: 'staff', lv: 100, g: 4, stat: 'int', amt: 260, art: 'storm_staff', hold: 1 },
  { id: 'violet_bow', name: '자전궁', t: 'bow', lv: 100, g: 4, stat: 'str', amt: 260, art: 'violet_bow', hold: 1 },
  { id: 'azure_dual', name: '창뢰 쌍검', t: 'sword', lv: 100, g: 4, stat: 'str', amt: 260, art: 'azure_dual', hold: 1, dual: 1 },
];
export const STORM_PALETTE = {
  core: '#efffff', ice: '#adf5ff', blue: '#639dff', violet: '#7755ff', violetDark: '#322083', cyan: '#39efff', teal: '#12a6cc',
};
export const STORM_SKILLS = {
  storm_staff: {
    name: '천뢰난무', role: '둘레에 연속 낙뢰',
    skill: { note: '둘레 여러 지점에 청백색 벼락을 떨어뜨리고 보랏빛 전기 잔상을 남긴다',
      cd: 12, life: 2.4, delay: 0.06, gap: 0.12, r: 82, mul: 0.8, boltLife: 0.36, residual: 1.35,
      // 앞·뒤·좌·우를 번갈아 친다. 좌표는 바라보는 쪽 기준 [앞, 옆].
      spots: [[65, 0], [35, 105], [145, -65], [-70, -115], [90, 145], [-115, 65], [0, -165], [-155, -25], [160, 40]],
    },
  },
  violet_bow: {
    name: '자전 관통', role: '직선 관통 전격',
    skill: { note: '십자 섬광 뒤 회전하는 보랏빛 전격을 쏜다 · 지나가는 적을 한 번씩 관통한다',
      cd: 9, charge: 0.12, flight: 0.9, fade: 0.42, len: 650, width: 36, mul: 3.6, life: 1.44 },
  },
  azure_dual: {
    name: '창뢰 비상참', role: '충전 · 직선 돌진 · 교차 베기',
    skill: { note: 'X를 누르면 청록빛을 모으고 놓으면 돌진한다 · 양옆 칼날과 전격 궤적 뒤 교차 베기',
      cd: 13, minCharge: 0.3, maxCharge: 4, dash: 0.3, distance: 460, width: 65, r: 112,
      mul: 1.6, finish: 2.5, life: 1.9 },
  },
};
export function stormSpot(c, spot, squash) {
  return [c.ox + c.ax * spot[0] - c.ay * spot[1], c.oy + (c.ay * spot[0] + c.ax * spot[1]) * squash];
}
