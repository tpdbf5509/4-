/* ── 히든 직업 Gambler 002 도트 이펙트 시트 규격(11월 16일) ─────────────
   사용자 지시 "pixelfx 쓰지 말고 직접 만들어줘" — 외부 이펙트 라이브러리 없이 design/effects/gambler/make.py 가 한 칸씩 직접 그린 시트다.
   값은 그 스크립트가 낸 design/effects/gambler/manifest.json 과 같아야 한다(tools/gambler.test.mjs 가 본다). 그리기는 gamblerArt.js. */
export const GAMBLER_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/gambler/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const GAMBLER_PX = {
  gm_chip: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, loop: 1, rows: 3 },   // 황금 칩 — 세로축으로 도는 포커 칩(줄 = 금 · 청백 테두리 · 자주 무늬)
  gm_coin: { w: 10, h: 10, cols: 6, n: 6, cx: 5, cy: 5, loop: 1, rows: 3 },   // 작은 금화(줄 = 연마 색 셋)
  gm_glint: { w: 9, h: 9, cols: 5, n: 5, cx: 4, cy: 4 },   // 십자 반짝임
  gm_spark: { w: 40, h: 40, cols: 6, n: 6, cx: 20, cy: 20 },   // 작은 타격 불꽃
  gm_dice: { w: 24, h: 26, cols: 10, n: 10, cx: 11, cy: 13 },   // 주사위 — 0~3 구르는 중 · 4~9 눈 1~6
  gm_hex: { w: 76, h: 48, cols: 4, n: 8, cx: 38, cy: 24 },   // 칩 장막 발밑 육각 문양 — 0~3 퍼짐 · 4~7 유지
  gm_shard: { w: 44, h: 44, cols: 6, n: 6, cx: 22, cy: 12 },   // 장막이 깨져 흩어지는 조각
  gm_burst: { w: 106, h: 134, cols: 4, n: 8, cx: 53, cy: 92, r: 46 },   // 금빛 폭발(그림 속 반지름 r) — 운명의 눈
  gm_rainhit: { w: 174, h: 204, cols: 3, n: 9, cx: 87, cy: 135, r: 80 },   // 코인 폭우 타격
  gm_jack: { w: 314, h: 349, cols: 5, n: 10, cx: 157, cy: 225, r: 150 },   // 777 마지막 폭발 · 테이블 끝 폭발
  gm_jacktop: { w: 314, h: 349, cols: 5, n: 10, cx: 157, cy: 225, r: 150 },   // 잭팟(자주 고리)
  gm_card: { w: 36, h: 48, cols: 6, n: 6, cx: 18, cy: 24, loop: 1 },   // 하우스 엣지 금빛 카드
  gm_slot: { w: 28, h: 38, cols: 7, n: 7, cx: 14, cy: 19 },   // 슬롯 릴 — 0~3 도는 중 · 4 금색 7 · 5 체리 · 6 자주 7
  gm_table: { w: 288, h: 226, cols: 7, n: 14, cx: 144, cy: 113, r: 140 },   // 황금 테이블 — 0~4 펼침 · 5~8 유지 · 9~13 접힘
  gm_pillar: { w: 52, h: 150, cols: 8, n: 8, cx: 26, cy: 146 },   // 잭팟 빛기둥(바닥이 cy)
  gm_icons: { w: 24, h: 24, cols: 8, n: 8, cx: 0, cy: 0 },   // 스킬 아이콘 8칸 — 칩 · 장막 · 눈 · 폭우 · 더블 다운 · 테이블 · 엣지 · 777
  gm_props: { w: 48, h: 52, cols: 5, n: 5, cx: 24, cy: 48 },   // 해금 경로 조사물(발밑이 기준점) — 0 낡은 칩 상자 · 1 열린 상자 · 2 계약서 게시판 · 3 망가진 주사위 기계 · 4 되살아난 기계
};
// 아이콘 칸 차례(gm_icons)
export const GAMBLER_ICON = { chip: 0, veil: 1, dice: 2, rain: 3, dd: 4, table: 5, edge: 6, jack: 7 };
// 조사물 칸 차례(gm_props)
export const GAMBLER_PROP = { box: 0, boxOpen: 1, deed: 2, machine: 3, machineOn: 4 };
