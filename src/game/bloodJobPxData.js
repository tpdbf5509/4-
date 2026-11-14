/* ── 히든 직업 BLOOD-001 pixelfx 시트(11월 14일) ─────────────
   BLOOD-001 연출은 이 시트만 쓴다(11월 14일 사용자 지시 — Codex 레이어 · 코드 도트를 모두 걷어 냈다). pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑았다.
   뽑는 법 · 색은 design/effects/pixelfx/blood-job/make.mjs. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   크림슨 레퀴엠 시트(blood-gun/*)와는 다른 이펙트 · 씨앗이다. 그리기는 bloodJobArt.js. */
export const BLOOD_JOB_PX_SRC = "/assets/game/rpg/effects/blood-job/px/";

// w · h 한 칸, cols 열 수, n 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트
export const BLOOD_JOB_PX = {
  bj_orb: { w: 86, h: 104, cols: 4, n: 10, cx: 43, cy: 36, loop: 1 },     // arcane/arcane-orb — 적혈탄 차징 구슬
  bj_drop: { w: 88, h: 52, cols: 2, n: 6, cx: 63, cy: 26, loop: 1 },      // projectiles/plasma-shot — 날아가는 방울(탄 · 회수 · 흡수 · 핏방울). 머리가 기준점, 꼬리는 왼쪽
  bj_hit: { w: 90, h: 76, cols: 3, n: 8, cx: 46, cy: 50 },                // impacts/blunt-hit — 적혈탄 적중
  bj_pop: { w: 129, h: 73, cols: 3, n: 8, cx: 63, cy: 52 },               // water/splash — 피 튀김(탄 소멸 · 차징 취소 · 혈막 흩어짐)
  bj_burst: { w: 160, h: 139, cols: 3, n: 10, cx: 79, cy: 70 },           // arcane/mana-burst — 혈흔 팽창
  bj_heart: { w: 41, h: 45, cols: 3, n: 8, cx: 21, cy: 22, loop: 1 },     // pickups/heart-pickup — 혈량 전환 심장 맥동
  bj_slam: { w: 236, h: 145, cols: 3, n: 10, cx: 118, cy: 102 },          // impacts/ground-slam — 혈수 강타 착지(바닥선이 cy)
  bj_slash: { w: 104, h: 101, cols: 3, n: 8, cx: 31, cy: 70 },            // melee/sword-slash — 혈검 1 · 2타(오른쪽을 본다)
  bj_cross: { w: 115, h: 83, cols: 3, n: 8, cx: 13, cy: 55 },             // melee/double-slash — 혈검 교차 베기
  bj_shield: { w: 70, h: 74, cols: 4, n: 10, cx: 35, cy: 37, loop: 1 },   // holy/divine-shield — 혈막(반복)
  bj_block: { w: 110, h: 74, cols: 3, n: 8, cx: 14, cy: 45 },             // impacts/shield-block — 혈막이 막는 순간
  bj_suck: { w: 166, h: 163, cols: 4, n: 10, cx: 79, cy: 84 },            // explosions/implosion — 혈막을 회수하며 접힌다
  bj_rage: { w: 80, h: 96, cols: 4, n: 10, cx: 40, cy: 87, loop: 1 },     // shadow/shadow-flames — 폭주 발밑 불꽃(반복)
  bj_gather: { w: 96, h: 79, cols: 3, n: 10, cx: 46, cy: 38, loop: 1 },   // arcane/spell-charge — 혈수 강타 차징 · 내려치는 피 덩어리
  bj_flood: { w: 237, h: 143, cols: 3, n: 8, cx: 112, cy: 75 },          // nature/blood-field(이 게임용 새 이펙트) open — 혈역: 땅이 피로 물든다
  bj_drink: { w: 233, h: 142, cols: 3, n: 12, cx: 112, cy: 74, loop: 1 }, // 같은 이펙트 loop — 핏줄기를 따라 발밑으로 빨려 든다(반지름 117, 세로 0.6)
  bj_dry: { w: 233, h: 142, cols: 3, n: 8, cx: 112, cy: 74 },            // 같은 이펙트 drain — 끝나면 가운데로 말려 사라진다
  bj_dark: { w: 249, h: 218, cols: 3, n: 10, cx: 125, cy: 90 },           // shadow/dark-explosion — 폭주 시작
  bj_fall: { w: 143, h: 135, cols: 4, n: 10, cx: 71, cy: 50 },            // holy/feather-burst — 탈진: 혈액 갑주 조각이 흩날려 떨어진다
};
