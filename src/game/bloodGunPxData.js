/* ── 크림슨 레퀴엠 · 혈계 추격 연출 — pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑은 픽셀 시트(11월 13일) ─────────────
   판정 시각 · 범위 · 수치는 bloodGunData.js 그대로다. 연출만 바꾼다.
   시트는 public/assets/game/rpg/effects/blood-gun/<이름>.webp. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   뽑는 법 · 색은 design/effects/pixelfx/blood-gun/make.mjs. 그리기는 bloodGunPxArt.js. 시트를 못 불러오면 예전 코드 도트 그림(bloodGunArt.js)으로 그린다.
   월드보스 · 공허 무기 시트와 다른 이펙트 · 씨앗으로 따로 뽑았다(다른 무기의 연출은 재사용하지 않는다). */

export const BLOOD_PX_SRC = "/assets/game/rpg/effects/blood-gun/";

// 시트 칸 — w · h 한 칸 크기, cols 열 수, n 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 여부
export const BLOOD_PX_SHEETS = {
  bg_charge: { w: 91, h: 81, cols: 3, n: 10, cx: 55, cy: 50 },            // arcane/spell-charge — 1단계 총구에 모이는 붉은 구슬
  bg_circle: { w: 114, h: 86, cols: 3, n: 8, cx: 57, cy: 66 },            // arcane/rune-circle — 1단계 발밑의 붉은 룬 원(바닥에 눕는다)
  bg_muzzle: { w: 50, h: 54, cols: 3, n: 6, cx: 21, cy: 24 },             // projectiles/muzzle-pistol — 2단계 총구 섬광(오른쪽을 본다)
  bg_bolt: { w: 116, h: 26, cols: 2, n: 6, cx: 104, cy: 13, loop: 1 },    // projectiles/laser-bolt — 2단계 관통 혈탄(머리가 기준점, 꼬리는 왼쪽)
  bg_pierce: { w: 171, h: 121, cols: 3, n: 10, cx: 68, cy: 67 },          // impacts/crit-hit — 관통 혈탄이 닿는 큰 충격
  bg_form: { w: 167, h: 154, cols: 4, n: 10, cx: 86, cy: 77 },            // explosions/implosion — 3단계 흩어진 혈액 에너지가 한 점으로 응축
  bg_seeker: { w: 100, h: 51, cols: 3, n: 8, cx: 76, cy: 25, loop: 1 },   // projectiles/plasma-shot — 3단계 유도 혈탄(머리가 기준점)
  bg_spark: { w: 118, h: 75, cols: 3, n: 8, cx: 28, cy: 42 },             // impacts/hit-spark — 유도 혈탄이 닿는 불꽃
  bg_res: { w: 130, h: 121, cols: 4, n: 10, cx: 65, cy: 57 },             // shadow/hex-sigil — 4단계 혈흔 공명: 붉은 인장이 그려지고 번쩍인다
  bg_boom: { w: 201, h: 188, cols: 4, n: 10, cx: 101, cy: 93 },           // explosions/plasma-explosion — 5단계 혈계 처형
  bg_pool: { w: 57, h: 33, cols: 4, n: 16, cx: 29, cy: 17 },              // nature/blood-pool(이 게임용 새 이펙트) — 풀차징에 맞은 적 발밑의 피 웅덩이: 퍼지고 마르고 사라진다
  bg_boom5: { w: 248, h: 216, cols: 4, n: 12, cx: 124, cy: 168 },         // shadow/dark-explosion — 5중첩 처형: 검은 핵이 있는 큰 폭발(바닥선이 cy 아래)
};

/* 그리는 크기 · 시각 — k 고정 배수, play 한 번짜리 시트를 몇 초에 다 돌리는지(0 이면 효과 시간 전체에 맞춘다)
   bolt 의 tailMax · seeker 의 tailMax 는 꼬리가 몸에서 뒤로 뻗는 한도(1배 픽셀) */
export const BLOOD_PX_LOOK = {
  charge: { k: 2.4 },                                // 1단계 총구 구슬 — 효과 시간(S.charge)에 맞춰 돈다
  circle: { k: 1.6, lift: 0 },                       // 발밑 룬 원
  muzzle: { k: 2.8, play: 0.12 },                    // 총구 섬광
  bolt: { k: 3.2, loopT: 0.5 },                      // 관통 혈탄 — 폭 65 판정 안에 두껍게 들어가는 크기
  pierce: { k: 2.4, play: 0.35 },                    // 관통 혈탄 적중 — 효과 시간(0.35)
  form: { k: 1.05, play: 0.3 },                      // 유도 혈탄 응축 — 판정의 form(0.3초)에 맞춘다
  seeker: { k: 1.9, loopT: 0.55, tailMax: 60 },      // 유도 혈탄
  spark: { k: 2.2, play: 0.28 },                     // 유도 혈탄 적중(0.28)
  res: { k: 1.7, kStack: 0.14 },                     // 혈흔 공명 — 중첩이 많을수록 인장이 커진다(효과 시간 0.3 안에 모두 재생)
  boom: { k: 1.55, play: 0.5 },                      // 혈계 처형 — 효과 시간(0.5)
  pool: { k: 2.4 },                                  // 피 웅덩이 — 효과 시간(poolT) 전체에 맞춘다
  boom5: { k: 1.35, play: 0.5 },                     // 5중첩 처형
};
