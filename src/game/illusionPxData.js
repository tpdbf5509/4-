/* ── 히든 직업 Illusionist 005 도트 이펙트 시트 규격(11월 17일) ─────────────
   외부 이펙트 라이브러리 없이 design/effects/illusionist/make.py 가 한 칸씩 직접 그린 시트다(Engineer 003 과 같은 방식).
   값은 그 스크립트가 낸 design/effects/illusionist/manifest.json 과 같아야 한다(tools/illusion.test.mjs 가 본다). 그리기는 illusionArt.js. */
export const ILLUSION_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/illusionist/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const ILLUSION_PX = {
  il_card: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, loop: 1, rows: 3 },   // 절단 카드 — 8칸 회전(줄 = 연마 색 셋: 흰 · 푸른 테두리 · 거울 뒷면)
  il_shard: { w: 32, h: 32, cols: 7, n: 7, cx: 16, cy: 16 },   // 카드 적중 — 흰 절단선 · 네 조각
  il_cut: { w: 8, h: 6, cols: 3, n: 3, cx: 0, cy: 3, rows: 2 },   // 절단선 마디(가로로 늘림, 왼쪽 끝이 기준) — 줄 0 흰 · 1 보라
  il_burst: { w: 64, h: 64, cols: 4, n: 8, cx: 32, cy: 34, r: 28 },   // 작은 폭발(그림 속 반지름 r) — 폭렬 셔플 · 블링크 분신
  il_fan: { w: 40, h: 32, cols: 5, n: 5, cx: 20, cy: 26 },   // 손 위 카드 부채(손이 기준)
  il_arc: { w: 112, h: 72, cols: 6, n: 6, cx: 40, cy: 40, rows: 2, r: 52 },   // 덱 슬래시 호(오른쪽을 본다, 그림 속 반지름 r) — 줄 0 첫 참격 흰빛 · 1 역방향 보랏빛
  il_box: { w: 128, h: 112, cols: 6, n: 12, cx: 64, cy: 64, r: 56 },   // 카드 프리즌 상자(그림 속 반지름 r) — 0~3 생김 · 4~7 유지 · 8~11 접힘
  il_fist: { w: 112, h: 96, cols: 5, n: 10, cx: 40, cy: 56 },   // 팬텀 피스트(오른쪽을 본다) — 0~3 압축 · 4~7 전진 · 8~9 흩어짐
  il_mirror: { w: 24, h: 40, cols: 8, n: 8, cx: 12, cy: 38 },   // 거울 프레임(발밑 기준) — 0~3 솟음 · 4~7 빛줄기
  il_big: { w: 112, h: 144, cols: 6, n: 12, cx: 56, cy: 136 },   // 큰 거울(땅 기준) — 0~3 모임 · 4 완성 · 5~11 파쇄
  il_ghost: { w: 64, h: 64, cols: 6, n: 6, cx: 32, cy: 32, rows: 2 },   // 잔상 — 줄 0 트릭(라벤더) · 1 거울(청백)
  il_flash: { w: 32, h: 32, cols: 6, n: 6, cx: 16, cy: 16 },   // 순간이동 섬광
  il_bits: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, rows: 6 },   // 범위를 채우는 작은 입자 — 줄 0 크림 카드 · 1 보라 카드 · 2 라벤더 반짝임 · 3 크림 반짝임 · 4 유리 조각 · 5 연기
  il_icons: { w: 24, h: 24, cols: 8, n: 8, cx: 0, cy: 0 },   // 스킬 아이콘 8칸 — 카드 · 셔플 · 슬래시 · 프리즌 · 블링크 · 피스트 · 미러 · 최후
};
// 아이콘 칸 차례(il_icons)
export const ILLUSION_ICON = { card: 0, shuffle: 1, slash: 2, prison: 3, blink: 4, fist: 5, mirror: 6, final: 7 };
