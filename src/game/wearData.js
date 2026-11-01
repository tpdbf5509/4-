/* 입은 방어구 겉모습(11월 1일, 사용자 요청) — 전설(등급 3) 투구 · 갑옷 · 신발을 캐릭터 몸 위에 겹쳐 그린다.
   그림은 Codex 가 표준 몸(검사 남 네 방향 · design/wear/base-body.webp)에 맞춰 뽑은 겹침 그림 세트마다 한 장
   (rpg/wear/<세트>.webp — 4열 = 앞 · 옆 · 뒤 · 돌아섬, 3행 = 투구 · 갑옷 · 신발, 칸 384 × 512, 초록 바탕을 지운 투명).
   캐릭터마다 몸 크기가 달라 키(높이)에 맞춰 늘려 그리고 발밑 가운데를 맞춘다 */
export const WEAR_SETS = ["legend", "dragon", "serpent", "machine", "thunderbird"];   // 순서가 스냅샷 코드(1부터) — 뒤에만 더한다. legend 는 세트 없는 전설
export const WEAR_SLOTS = ["head", "body", "feet"];                                   // 겹침 그림 행 차례 · 스냅샷 칸 차례
export const WEAR = {
  src: (id) => `/assets/game/rpg/wear/${id}.webp`,
  cell: [384, 512],
  views: ["front", "side", "back", "turn"],
  // 표준 몸 프레임(칸 안 [x, y, 폭, 높이]) — 겹침 그림이 이 몸에 맞춰 그려졌다. 높이 비와 발밑 가운데로 다른 캐릭터에 맞춘다
  frame: { front: [43, 28, 297, 470], side: [49, 28, 285, 470], back: [56, 28, 271, 470], turn: [39, 28, 305, 470] },
  order: [1, 2, 0],                                                                    // 그리는 차례 — 갑옷 · 신발 · 투구(머리가 맨 위)
};
