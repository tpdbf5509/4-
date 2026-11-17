/* ── 히든 직업 Wyvern Knight 006 도트 시트 규격(11월 17일) ─────────────
   외부 이펙트 라이브러리 없이 design/effects/wyvern/make.py 가 한 칸씩 직접 그린 시트다(Engineer 003 · Necromancer 004 와 같은 방식).
   값은 그 스크립트가 낸 design/effects/wyvern/manifest.json 과 같아야 한다(tools/wyvern.test.mjs 가 본다). 그리기는 wyvernArt.js. */
export const WYVERN_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/wyvern/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const WYVERN_PX = {
  wy_claw: { w: 96, h: 64, cols: 6, n: 6, cx: 8, cy: 32, r: 80 },   // 용조격 — 오른쪽을 보는 세 줄 발톱 참격(기준점 = 손, 그림 속 반지름 r)
  wy_hit: { w: 48, h: 48, cols: 7, n: 7, cx: 24, cy: 24 },   // 타격 — 불꽃 터짐 · 고리 · 불씨
  wy_wyvern: { w: 72, h: 56, cols: 7, n: 7, cx: 36, cy: 36, rows: 2 },   // 와이번 옆모습(오른쪽) — 0~3 날갯짓 · 4~6 불 뿜기. 줄 0 그대로 · 1 연마 75 붉은 선
  wy_shade: { w: 64, h: 20, cols: 4, n: 4, cx: 32, cy: 10, loop: 1 },   // 땅에 비친 와이번 그림자 — 날갯짓 4칸
  wy_ball: { w: 20, h: 20, cols: 4, n: 4, cx: 12, cy: 10, loop: 1 },   // 와이번 화염탄(오른쪽으로 난다)
  wy_sigil: { w: 96, h: 56, cols: 8, n: 8, cx: 48, cy: 28 },   // 소환 문양 — 0~3 나타남 · 4~7 반복
  wy_portal: { w: 80, h: 72, cols: 8, n: 8, cx: 18, cy: 36 },   // 용염 포효 포탈 — 0~3 열림 · 4~7 용 머리가 나와 입을 벌린다(오른쪽)
  wy_puff: { w: 32, h: 32, cols: 8, n: 8, cx: 16, cy: 18 },   // 불꽃 덩어리 — 범위를 채우는 큰 형상(0 뜨거움 → 7 연기)
  wy_crack: { w: 200, h: 120, cols: 4, n: 8, cx: 100, cy: 60, r: 90 },   // 바닥 균열 · 화염 충격파(그림 속 반지름 r)
  wy_drop: { w: 40, h: 110, cols: 7, n: 7, cx: 20, cy: 104 },   // 떨어지는 화염탄(바닥 기준) — 0~3 떨어짐 · 4~6 터짐
  wy_scale: { w: 40, h: 56, cols: 6, n: 6, cx: 20, cy: 54, loop: 1 },   // 용린 수호 비늘(발밑 기준) — 반복
  wy_spike: { w: 48, h: 24, cols: 6, n: 6, cx: 4, cy: 12 },   // 반격 화염 가시(오른쪽으로)
  wy_awake: { w: 64, h: 72, cols: 10, n: 10, cx: 32, cy: 66, rows: 2 },   // 반룡 날개 · 뿔(발밑 기준, 몸 뒤) — 0~5 생겨남 · 6~9 반복. 줄 0 검붉은 · 1 보라 잔상
  wy_pillar: { w: 72, h: 160, cols: 8, n: 8, cx: 36, cy: 152 },   // 화염 기둥 · 용성 충돌(바닥 기준)
  wy_icons: { w: 24, h: 24, cols: 10, n: 10, cx: 0, cy: 0 },   // 스킬 아이콘 10칸
  wy_bits: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, rows: 6 },   // 범위를 채우는 작은 입자 — 줄 0 불씨 · 1 불티 · 2 연기 · 3 비늘 조각(칸 = 회전) · 4 보라 잔광 · 5 작은 불길
  wy_blade: { w: 96, h: 28, cols: 4, n: 4, cx: 10, cy: 14 },   // 아르카디온 대검(손잡이 기준) — 0~2 빚어짐 · 3 다 됨
  wy_arc: { w: 128, h: 80, cols: 6, n: 6, cx: 16, cy: 40, rows: 2, r: 90 },   // 아르카디온 가로 참격(그림 속 반지름 r) — 줄 0 1타 · 1 2타
};
// 아이콘 칸 차례(wy_icons)
export const WYVERN_ICON = { claw: 0, contract: 1, roar: 2, dive: 3, scale: 4, sky: 5, awake: 6, ult: 7, assault: 8, arcadion: 9 };
