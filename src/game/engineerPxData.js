/* ── 히든 직업 Engineer 003 도트 이펙트 시트 규격(11월 17일) ─────────────
   외부 이펙트 라이브러리 없이 design/effects/engineer/make.py 가 한 칸씩 직접 그린 시트다(Gambler 002 와 같은 방식).
   값은 그 스크립트가 낸 design/effects/engineer/manifest.json 과 같아야 한다(tools/engineer.test.mjs 가 본다). 그리기는 engineerArt.js. */
export const ENGINEER_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/engineer/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const ENGINEER_PX = {
  en_pulse: { w: 12, h: 12, cols: 4, n: 4, cx: 6, cy: 6, loop: 1, rows: 3 },   // 펄스 발진 — 사각 전기탄(줄 = 연마 색 셋)
  en_spark: { w: 48, h: 48, cols: 8, n: 8, cx: 24, cy: 24 },   // 명중 — 코어 섬광·잔류 전류·금속 파편
  en_flash: { w: 32, h: 32, cols: 5, n: 5, cx: 16, cy: 16 },   // 총구 섬광 — 청백 코어·금빛 방사선
  en_laser: { w: 8, h: 5, cols: 3, n: 3, cx: 0, cy: 2 },   // 짧은 레이저 마디(가로로 늘림, 왼쪽 끝이 기준)
  en_turret: { w: 32, h: 36, cols: 15, n: 15, cx: 16, cy: 33, rows: 3 },   // 센트리 터렛(발밑 기준) — 0~3 솟음 · 4~11 여덟 방향(오른쪽부터 시계 방향) · 12~14 접힘
  en_drone: { w: 26, h: 18, cols: 4, n: 4, cx: 13, cy: 9, loop: 1, rows: 3 },   // 지원 드론 — 날개 회전 반복
  en_mech: { w: 64, h: 64, cols: 8, n: 8, cx: 28, cy: 61, rows: 3 },   // 강철 수호자(발밑 기준, 오른쪽을 본다) — 0 서기 · 1~4 걷기 · 5~7 주먹
  en_hex: { w: 48, h: 30, cols: 8, n: 8, cx: 24, cy: 15 },   // 육각 소환 표시 — 0~3 나타남 · 4~7 반복
  en_field: { w: 210, h: 168, cols: 4, n: 8, cx: 105, cy: 84, r: 100 },   // 자기장 포획(그림 속 반지름 r) — 0~2 퍼짐 · 3~4 전자기장 · 5~7 끊어짐
  en_rail: { w: 16, h: 12, cols: 4, n: 4, cx: 0, cy: 6 },   // 레일포 마디(가로로 늘림) — 0 가장 밝음 → 3 잔광
  en_boom: { w: 100, h: 100, cols: 4, n: 8, cx: 50, cy: 58, r: 46 },   // 수호자 코어 폭발(그림 속 반지름 r)
  en_strike: { w: 72, h: 128, cols: 7, n: 7, cx: 36, cy: 114 },   // 궤도 포격 한 번(바닥 기준)
  en_beam: { w: 88, h: 304, cols: 10, n: 10, cx: 44, cy: 294 },   // 궤도 광선(바닥 기준) — 0~2 내려옴 · 3~6 굵은 광선 · 7~9 사라짐
  en_shock: { w: 360, h: 290, cols: 4, n: 8, cx: 180, cy: 145, r: 175 },   // 지면 충격파(그림 속 반지름 r)
  en_zap: { w: 20, h: 20, cols: 4, n: 4, cx: 10, cy: 10, loop: 1, rows: 2 },   // 오버클럭 전류 테두리 — 줄 0 푸른 번개 · 1 과열 주황
  en_icons: { w: 24, h: 24, cols: 8, n: 8, cx: 0, cy: 0 },   // 스킬 아이콘 8칸 — 펄스 · 터렛 · 드론 · 자기장 · 레일포 · 수호자 · 오버클럭 · 궤도
  en_assembly: { w: 96, h: 72, cols: 5, n: 10, cx: 48, cy: 48 },   // 기계 조립 — 모여드는 금속 패널과 육각 발판
  en_charge: { w: 64, h: 64, cols: 8, n: 8, cx: 32, cy: 32, rows: 3 },   // 응축 코일 — 8칸 · 연마 색 셋
  en_exhaust: { w: 24, h: 40, cols: 6, n: 6, cx: 12, cy: 2, loop: 1, rows: 2 },   // 추진 불꽃 — 6칸 · 청록/과열 두 색
  en_target: { w: 112, h: 80, cols: 5, n: 10, cx: 56, cy: 40 },   // 표적 지정 회로 — 진행되는 눈금과 수렴 고리
  en_bits: { w: 16, h: 16, cols: 8, n: 8, cx: 8, cy: 8, rows: 6 },   // 범위를 채우는 작은 입자(11월 17일 밀도 보강) — 줄 0 청록 스파크 · 1 금빛 스파크 · 2 불씨 · 3 금속 파편(칸 = 회전) · 4 연기 · 5 짧은 전류 줄기
  // 빛 연출(11월 21일 사용자 "빛나는 이펙트를 넣어줘") — 게임이 빛 더하기(lighter)로 얹는다. 줄 = 연마 색 셋
  en_glow: { w: 48, h: 48, cols: 4, n: 4, cx: 24, cy: 24, loop: 1, rows: 3 },   // 번짐 — 흰 중심 · 색 테두리 · 성긴 바깥(그림 속 반지름 23)
  en_sigil: { w: 136, h: 108, cols: 12, n: 12, cx: 68, cy: 54, rows: 3, r: 64 },   // 바닥 진 — 0~3 그려짐 · 4~11 회전 반복(땅 비율로 누른 그림)
  en_pillar: { w: 36, h: 200, cols: 10, n: 10, cx: 18, cy: 196, rows: 3 },   // 빛 기둥(바닥 기준) — 0~2 솟음 · 3~6 일렁임 · 7~9 사라짐
  en_star: { w: 11, h: 11, cols: 6, n: 6, cx: 5, cy: 5, rows: 3 },   // 반짝이 — 6칸 생애
};
// 아이콘 칸 차례(en_icons)
export const ENGINEER_ICON = { pulse: 0, turret: 1, drone: 2, magnet: 3, rail: 4, mech: 5, oc: 6, orbit: 7 };
