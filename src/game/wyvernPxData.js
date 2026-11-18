/* ── 히든 직업 Wyvern Knight 006 도트 시트 규격(11월 17일) ─────────────
   외부 이펙트 라이브러리 없이 design/effects/wyvern/make.py 가 한 칸씩 직접 그린 시트다(Engineer 003 · Necromancer 004 와 같은 방식).
   값은 그 스크립트가 낸 design/effects/wyvern/manifest.json 과 같아야 한다(tools/wyvern.test.mjs 가 본다). 그리기는 wyvernArt.js. */
export const WYVERN_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/wyvern/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const WYVERN_PX = {
  wy_claw: { w: 112, h: 96, cols: 6, n: 6, cx: 10, cy: 48, r: 88 },   // 용조격 — 굵은 발톱 참격 세 줄(11월 18일 다시 그림, 기준점 = 손, 그림 속 반지름 r)
  wy_hit: { w: 64, h: 64, cols: 8, n: 8, cx: 32, cy: 32 },   // 타격 — 흰 섬광 · 가시 여덟 · 불꽃 고리 · 불씨(11월 18일)
  wy_wyvern: { w: 317, h: 302, cols: 7, n: 7, cx: 182, cy: 143, rows: 2, mouth: [73, 4] },   // 와이번 옆모습(오른쪽, 1배) — 11월 18일 사용자 자세 참고 그림대로 0 날개 위 · 1 내리침 · 2 날개 아래 · 3 올림 · 4~6 불 뿜기(design/effects/wyvern/pose.py). 줄 0 그대로 · 1 연마 75 붉은 선
  wy_sit: { w: 328, h: 109, cols: 3, n: 3, cx: 190, cy: 104, rows: 2, mouth: [103, -42] },   // 지상 대기 와이번(1배, 기준점 = 몸 아래 땅) — 웅크려 목을 앞으로 길게 뻗고 접은 날개 손목으로 땅을 짚은 자세(11월 18일 사용자 기획) · 0 · 1 숨쉬기 · 2 앉아서 불 뿜기
  wy_shade: { w: 122, h: 24, cols: 4, n: 4, cx: 61, cy: 12, loop: 1 },   // 땅에 비친 와이번 그림자 — 날갯짓 4칸
  wy_ball: { w: 20, h: 20, cols: 4, n: 4, cx: 12, cy: 10, loop: 1 },   // 와이번 화염탄(오른쪽으로 난다)
  wy_sigil: { w: 96, h: 56, cols: 8, n: 8, cx: 48, cy: 28 },   // 소환 문양 — 0~3 나타남 · 4~7 반복
  wy_portal: { w: 80, h: 72, cols: 8, n: 8, cx: 18, cy: 36 },   // 용염 포효 포탈 — 0~3 열림 · 4~7 용 머리가 나와 입을 벌린다(오른쪽)
  wy_puff: { w: 32, h: 32, cols: 8, n: 8, cx: 16, cy: 18 },   // 불꽃 덩어리 — 범위를 채우는 큰 형상(0 뜨거움 → 7 연기)
  wy_crack: { w: 200, h: 120, cols: 4, n: 8, cx: 100, cy: 60, r: 90 },   // 바닥 균열 · 화염 충격파(그림 속 반지름 r)
  wy_drop: { w: 40, h: 110, cols: 7, n: 7, cx: 20, cy: 104 },   // 떨어지는 화염탄(바닥 기준) — 0~3 떨어짐 · 4~6 터짐
  wy_scale: { w: 76, h: 96, cols: 8, n: 16, cx: 38, cy: 90 },   // 용린 수호 비늘 방벽(발밑 기준, 1배) — 0~5 쌓여 오름 · 6~11 빛이 훑는 반복 · 12~15 깨짐(11월 18일)
  wy_spike: { w: 64, h: 20, cols: 6, n: 6, cx: 4, cy: 10 },   // 반격 — 불붙은 비늘 창(오른쪽으로) · 0~1 돋음 · 2~4 날아감 · 5 꺼짐
  wy_awake: { w: 128, h: 80, cols: 10, n: 10, cx: 64, cy: 46, rows: 2 },   // 반룡 날개 한 쌍(어깨 사이 기준, 1배, 11월 18일 사용자 "날개 위치가 어색해") — 0~5 펼쳐짐 · 6~9 날갯짓. 줄 1 보라 잔상
  wy_pillar: { w: 72, h: 160, cols: 8, n: 8, cx: 36, cy: 152 },   // 화염 기둥 · 용성 충돌(바닥 기준)
  wy_icons: { w: 24, h: 24, cols: 10, n: 10, cx: 0, cy: 0 },   // 스킬 아이콘 10칸
  wy_bits: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, rows: 6 },   // 범위를 채우는 작은 입자 — 줄 0 불씨 · 1 불티 · 2 연기 · 3 비늘 조각(칸 = 회전) · 4 보라 잔광 · 5 작은 불길
  wy_blade: { w: 80, h: 25, cols: 4, n: 4, cx: 18, cy: 13, rows: 2 },   // 아르카디온 — 11월 18일 사용자 그림을 도트로 옮긴 손에 드는 용의 대검(손잡이 기준, 1배) — 0~3 날 빛 흐름. 줄 1 역린 해방 보라 테
  wy_arc: { w: 160, h: 120, cols: 7, n: 7, cx: 20, cy: 60, rows: 2, r: 100 },   // 큰 참격(그림 속 반지름 r) — 줄 0 불꽃 · 1 보라(2타). 11월 18일 굵은 초승달로 다시 그림
  wy_spin: { w: 120, h: 80, cols: 6, n: 6, cx: 60, cy: 40, r: 54 },   // 천공강습 회오리 베기(가운데 기준, 그림 속 반지름 r)
  wy_trail: { w: 64, h: 32, cols: 6, n: 6, cx: 32, cy: 16 },   // 천공강습 돌진 불꼬리 한 마디(오른쪽으로) — 길 따라 이어 붙인다
  wy_wave: { w: 200, h: 120, cols: 4, n: 7, cx: 100, cy: 60, r: 92 },   // 땅을 쓸고 나가는 불길 고리(그림 속 반지름 r)
  wy_flare: { w: 28, h: 48, cols: 8, n: 8, cx: 14, cy: 46 },   // 솟는 불길(바닥 기준) — 범위를 빽빽하게 채운다
};
// 아이콘 칸 차례(wy_icons)
export const WYVERN_ICON = { claw: 0, contract: 1, roar: 2, dive: 3, scale: 4, sky: 5, awake: 6, ult: 7, assault: 8, arcadion: 9 };
