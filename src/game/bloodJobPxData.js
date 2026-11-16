/* ── 히든 직업 BLOOD-001 pixelfx 시트(11월 14일) ─────────────
   BLOOD-001 연출은 이 시트만 쓴다(11월 14일 사용자 지시 — Codex 레이어 · 코드 도트를 모두 걷어 냈다). pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑았다.
   뽑는 법 · 색은 design/effects/pixelfx/blood-job/make.mjs. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   크림슨 레퀴엠 시트(blood-gun/*)와는 다른 이펙트 · 씨앗이다. 그리기는 bloodJobArt.js. */
export const BLOOD_JOB_PX_SRC = "/assets/game/rpg/effects/blood-job/px/";

// w · h 한 칸, cols 열 수, n 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트
export const BLOOD_JOB_PX = {
  bj_orb: { w: 86, h: 104, cols: 4, n: 10, cx: 43, cy: 36, loop: 1 },     // arcane/arcane-orb — 옛 적혈탄 차징 구슬(11월 15일부터 bj_core 를 쓴다)
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
  /* 11월 15일 — 형상화(피가 모여 물체가 되고 쓰고 나면 풀린다). design/effects/pixelfx/blood-job/blood-form.js(이 게임용 새 이펙트) · make-form.mjs 로 뽑았다.
     rim: 같은 이름 + _rim 시트에 밝은 외곽(C6 · C7)만 따로 있다 — 어두운 연마 색에서도 외곽은 밝게 그린다. rows: 줄마다 방향.
     혈검 겉모양은 사용자 그림(11월 15일)을 픽셀 단위로 옮겼다(cut.py · q.py). 혈검 시트 셋(bj_sw_*)만 1배로 그린다 */
  bj_sw_form: { w: 152, h: 152, cols: 8, n: 8, rows: 16, cx: 76, cy: 76, rim: 1 },   // 혈검 생성 — 모이는 피 → 손잡이 → 칼날(줄 = 16방향, 0 오른쪽부터 시계 방향 22.5도)
  bj_sw_hold: { w: 142, h: 142, cols: 4, n: 4, rows: 16, cx: 71, cy: 71, loop: 1, rim: 1 },   // 든 혈검 — 칼날 위 빛이 흐른다(반복, 16방향)
  bj_sw_break: { w: 160, h: 158, cols: 8, n: 8, rows: 16, cx: 80, cy: 78, rim: 1 },   // 혈검 풀림 — 칼끝부터 피로 흘러내린다(16방향)
  bj_arc1: { w: 131, h: 147, cols: 8, n: 8, rows: 5, cx: 58, cy: 63, rim: 1 },   // 혈검 1타 궤적 — 위에서 아래로(줄 = -90 · -45 · 0 · 45 · 90도, 왼쪽은 좌우 뒤집기)
  bj_arc2: { w: 128, h: 141, cols: 8, n: 8, rows: 5, cx: 58, cy: 60, rim: 1 },   // 혈검 2타 궤적 — 아래에서 위로
  bj_arc3: { w: 164, h: 162, cols: 8, n: 8, rows: 5, cx: 80, cy: 74, rim: 1 },   // 혈검 3타 — 크게 내려베기
  bj_vl_form: { w: 121, h: 83, cols: 8, n: 8, cx: 59, cy: 41, rim: 1 },   // 혈막 생성 — 피가 모여 휘어진 방패판 두 겹으로 굳는다
  bj_vl_hold: { w: 70, h: 62, cols: 6, n: 6, cx: 35, cy: 31, loop: 1, rim: 1 },   // 혈막 유지(반복 — 안쪽 겹이 천천히 돈다)
  bj_vl_hit: { w: 90, h: 96, cols: 8, n: 8, rows: 5, cx: 35, cy: 48, rim: 1 },   // 혈막 피격 — 맞은 쪽 판이 움푹 · 파문(줄 = 맞은 방향 5)
  bj_vl_fold: { w: 70, h: 62, cols: 8, n: 8, cx: 35, cy: 31, rim: 1 },   // 혈막 끝 — 판이 안으로 접혀 피로 풀린다
  bj_hd_form: { w: 50, h: 62, cols: 8, n: 8, cx: 28, cy: 34, rim: 1 },   // 혈수 강타 — 손바닥 → 손가락
  bj_hd_open: { w: 45, h: 40, cols: 4, n: 4, cx: 28, cy: 15, loop: 1, rim: 1 },   // 편 손(반복)
  bj_hd_clench: { w: 45, h: 37, cols: 5, n: 5, cx: 28, cy: 15, rim: 1 },   // 손가락을 오므려 주먹
  bj_hd_unravel: { w: 45, h: 39, cols: 8, n: 8, cx: 28, cy: 15, rim: 1 },   // 주먹이 손끝부터 피로 풀린다
  /* 11월 15일 개편 — 혈류 파동 · 혈쇄 갈고리(같은 blood-form.js 의 wave · hook · link · drop). 2배로 그린다 */
  bj_wave: { w: 259, h: 207, cols: 8, n: 62, cx: 127, cy: 103, rim: 1 },   // 혈류 파동 가장자리 — 칸 i 의 반지름 = 4 + 2i(1배, 땅 비율 0.78 포함). 판정 반경에 가장 가까운 칸
  bj_hk_form: { w: 50, h: 50, cols: 6, n: 6, rows: 16, cx: 25, cy: 25, rim: 1 },   // 갈고리가 손 앞에서 생긴다(16방향, 기준점 = 자루 뒤끝)
  bj_hk_head: { w: 50, h: 50, cols: 4, n: 4, rows: 16, cx: 25, cy: 25, loop: 1, rim: 1 },   // 날아가는 갈고리 머리(빛이 자루를 따라 흐른다)
  bj_hk_link: { w: 12, h: 12, cols: 4, n: 4, rows: 16, cx: 6, cy: 6, rim: 1 },   // 사슬 마디 — 칸 0 둥근 · 1 옆 · 2 · 3 팽팽한(밝은)
  bj_hk_drop: { w: 11, h: 37, cols: 6, n: 6, cx: 6, cy: 5, rim: 1 },   // 마디가 핏방울로 풀려 떨어진다
  bj_cut: { w: 32, h: 40, cols: 8, n: 8, cx: 17, cy: 9, rim: 1 },   // 11월 16일 — 혈검에 맞은 자리: 사선이 그어지고 피가 터진다(맞은 적마다, 2배)
  /* 11월 15일 — 적혈탄 압축 구슬(blood-form.js core). 예전 bj_orb · bj_gather 차징(지름 80px 넘음)을 대신한다. 2배로 그려 화면 지름 약 32px */
  bj_core: { w: 20, h: 16, cols: 8, n: 8, rows: 3, cx: 10, cy: 9, loop: 1, rim: 1 },   // 줄 = 단계 0 · 1 · 2(갈수록 작고 단단 · 도는 방울이 는다), 칸 = 한 바퀴
  bj_fall: { w: 143, h: 135, cols: 4, n: 10, cx: 71, cy: 50 },            // holy/feather-burst — 탈진: 혈액 갑주 조각이 흩날려 떨어진다
};
