/* ── 히든 직업 Necromancer 004 도트 시트 규격(11월 17일) ─────────────
   Gambler 002 와 같은 방식 — 외부 이펙트 라이브러리 없이 design/effects/necromancer/make.py 가 한 칸씩 직접 그린 시트다.
   값은 그 스크립트가 낸 design/effects/necromancer/manifest.json 과 같아야 한다(tools/necro.test.mjs 가 본다). 그리기는 necroArt.js. */
export const NECRO_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/necromancer/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const NECRO_PX = {
  nc_knight: { w: 32, h: 40, cols: 16, n: 16, cx: 15, cy: 38, rows: 3 },   // 그림자 기사형 — 한 줄 16칸: 0~3 걷기 · 4~7 공격 · 8~11 솟아오름 · 12~15 흩어짐(줄 셋 = 연마 색)
  nc_assassin: { w: 28, h: 34, cols: 16, n: 16, cx: 13, cy: 32, rows: 3 },   // 그림자 암살형
  nc_archer: { w: 30, h: 40, cols: 16, n: 16, cx: 14, cy: 38, rows: 3 },   // 그림자 사수형
  nc_caster: { w: 30, h: 42, cols: 16, n: 16, cx: 14, cy: 40, rows: 3 },   // 그림자 주술형
  nc_giant: { w: 44, h: 50, cols: 16, n: 16, cx: 21, cy: 48, rows: 3 },   // 그림자 거수형
  nc_orb: { w: 14, h: 14, cols: 6, n: 6, cx: 7, cy: 7, loop: 1 },   // 흑영탄 — 도는 검보라 구체
  nc_hit: { w: 32, h: 32, cols: 6, n: 6, cx: 16, cy: 16 },   // 작은 타격 — 검은 사각 다섯이 흩어진다
  nc_trace: { w: 26, h: 14, cols: 4, n: 4, cx: 13, cy: 7, loop: 1 },   // 추출 가능 흔적 — 땅의 작은 검은 원
  nc_extract: { w: 40, h: 72, cols: 10, n: 10, cx: 20, cy: 66 },   // 흔적 추출 — 0~2 원 · 3~6 그림자 줄기 · 7~9 꺼짐(발밑 기준)
  nc_wisp: { w: 10, h: 10, cols: 4, n: 4, cx: 5, cy: 5, loop: 1 },   // 빨려 드는 영혼 조각
  nc_absorb: { w: 48, h: 24, cols: 5, n: 5, cx: 24, cy: 12 },   // 발밑으로 빨려 드는 고리
  nc_stretch: { w: 120, h: 60, cols: 6, n: 6, cx: 60, cy: 30 },   // 그림자 소집 — 발밑 그림자 다섯이 늘어난다
  nc_slash: { w: 36, h: 30, cols: 5, n: 5, cx: 14, cy: 18 },   // 그림자 근접 베기
  nc_bolt: { w: 16, h: 6, cols: 2, n: 2, cx: 13, cy: 3, loop: 1 },   // 그림자 화살(오른쪽을 본다)
  nc_pop: { w: 86, h: 70, cols: 6, n: 6, cx: 43, cy: 35, r: 35 },   // 주술형 작은 광역 터짐(그림 속 반지름 r)
  nc_slam: { w: 112, h: 90, cols: 6, n: 6, cx: 56, cy: 45, r: 48 },   // 거수형 내려찍기(그림 속 반지름 r)
  nc_boom: { w: 156, h: 155, cols: 4, n: 8, cx: 78, cy: 93, r: 70 },   // 영혼 소각 폭발(핏빛 중심)
  nc_blast: { w: 216, h: 212, cols: 5, n: 10, cx: 108, cy: 126, r: 100 },   // 무명의 군세 마지막 폭발
  nc_swap: { w: 20, h: 60, cols: 6, n: 6, cx: 10, cy: 56 },   // 그림자 교환 — 검은 세로선 셋(발밑 기준)
  nc_domain: { w: 336, h: 265, cols: 4, n: 8, cx: 168, cy: 132, r: 160 },   // 군주의 영역 — 0~3 펼침 · 4~7 유지(땅 반지름 r)
  nc_mark: { w: 28, h: 28, cols: 6, n: 6, cx: 14, cy: 14, loop: 1 },   // 일제 진군 표적
  nc_crack: { w: 30, h: 40, cols: 4, n: 4, cx: 15, cy: 38 },   // 영혼 소각 — 그림자 몸의 붉은 균열
  nc_sigil: { w: 96, h: 72, cols: 8, n: 8, cx: 48, cy: 36 },   // 무명의 군세 — 시전자 뒤 문양(0~5 그려짐 · 6~7 반복)
  nc_wave: { w: 72, h: 84, cols: 6, n: 6, cx: 36, cy: 80 },   // 무명의 군세 파동 앞머리(발밑 기준)
  nc_spike: { w: 12, h: 46, cols: 6, n: 6, cx: 6, cy: 44 },   // 무명의 군세 검은 가시(발밑 기준)
  nc_icons: { w: 24, h: 24, cols: 8, n: 8, cx: 0, cy: 0 },   // 스킬 아이콘 8칸 — 흑영탄 · 흔적 추출 · 그림자 소집 · 그림자 교환 · 군주의 영역 · 일제 진군 · 영혼 소각 · 무명의 군세
};
// 아이콘 칸 차례(nc_icons)
export const NECRO_ICON = { orb: 0, extract: 1, summon: 2, swap: 3, domain: 4, march: 5, burn: 6, legion: 7 };
// 그림자 병사 시트 칸 — 걷기 · 공격 · 솟아오름 · 흩어짐이 4칸씩
export const NC_FRAME = { walk: 0, atk: 4, rise: 8, fade: 12, n: 4 };
