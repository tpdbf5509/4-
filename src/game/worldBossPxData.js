/* ── 월드보스 연출 — pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑은 픽셀 시트 ─────────────
   보스 공격이 맞는 순간 · 경고 중 떨어지는 운석과 차오르는 낙뢰 문양 · 독 웅덩이 · 합동 공격 성공 · 기절 별 · 토벌 연출만 바꾼다.
   판정 · 피해 · 경고 범위(칠한 자리 · 고리 · 안전지대 글자)는 worldBoss.js · worldBossArt.js 그대로다.
   시트는 public/assets/game/rpg/effects/world-boss/<이름>.webp. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   뽑는 법 · 색은 design/effects/pixelfx/world-boss/make.mjs. 그리기는 worldBossPxArt.js. 시트를 못 불러오면 예전 코드 그림으로 그린다. */

export const WB_PX_SRC = "/assets/game/rpg/effects/world-boss/";

// 시트 칸 — w · h 한 칸 크기, cols 열 수, n 칸 수, px · py 기준점(발밑), loop 반복 여부
// warn · hit 은 한 시트를 경고와 맞는 순간으로 나눠 쓰는 칸 구간 [처음, 끝]
export const WB_PX_SHEETS = {
  breath: { w: 148, h: 104, cols: 3, n: 12, px: 11, py: 66, loop: 1 },                        // fire/fire-breath — 드래곤 숨결
  meteor: { w: 256, h: 204, cols: 5, n: 22, px: 146, py: 180, warn: [0, 7], hit: [8, 21] },    // fire/meteor — 드래곤 운석
  acid: { w: 113, h: 66, cols: 3, n: 14, px: 56, py: 51 },                                     // nature/acid-splash — 뱀 독 튀김
  puddle: { w: 102, h: 55, cols: 3, n: 16, px: 51, py: 43, loop: 1 },                          // nature/toxic-puddle — 뱀 독 웅덩이
  strike_m: { w: 227, h: 261, cols: 5, n: 20, px: 113, py: 228, warn: [0, 7], hit: [8, 19] },  // lightning/lightning-strike — 기계 낙뢰(푸른 잿빛)
  strike_t: { w: 227, h: 262, cols: 5, n: 20, px: 113, py: 228, warn: [0, 7], hit: [8, 19] },  // lightning/lightning-strike — 뇌조 낙뢰(연보라)
  feather: { w: 139, h: 132, cols: 4, n: 12, px: 67, py: 48 },                                 // holy/feather-burst(흰 뭉치는 건너뛴다) — 뇌조 전격 깃털
  break: { w: 182, h: 176, cols: 4, n: 14, px: 91, py: 148 },                                  // holy/smite — 합동 공격 성공
  stun: { w: 50, h: 33, cols: 4, n: 16, px: 24, py: 55, loop: 1 },                             // status/stunned — 기절 별(캐릭터 없이)
  fall: { w: 192, h: 218, cols: 5, n: 20, px: 96, py: 204 },                                   // holy/holy-pillar — 토벌 빛기둥
  // 즉사 기술(11월 4일)
  doom_sigil: { w: 114, h: 113, cols: 5, n: 18, px: 57, py: 106, warn: [0, 13], hit: [14, 17] }, // shadow/hex-sigil — 보스 머리 위 저주 문양(공통)
  doom_nuke: { w: 396, h: 316, cols: 4, n: 16, px: 198, py: 282 },                             // explosions/nuke — 드래곤 멸망의 운석
  doom_miasma: { w: 212, h: 53, cols: 2, n: 12, px: 106, py: 42, loop: 1 },                     // nature/poison-cloud — 뱀 독왕의 심판
  doom_emp: { w: 152, h: 103, cols: 4, n: 14, px: 76, py: 74 },                                 // scifi/emp-blast — 기계 최후의 방전
  doom_plasma: { w: 204, h: 188, cols: 4, n: 12, px: 105, py: 94 },                             // explosions/plasma-explosion — 뇌조 천뢰 심판
  // 공허의 관측자(11월 5일) — 공허 빛깔(검보라 → 연보라). 뽑는 법은 make-void.mjs
  v_hole: { w: 165, h: 126, cols: 4, n: 12, px: 80, py: 48, loop: 1 },                         // shadow/black-hole — 중력 붕괴 장판(기준점은 구멍 가운데)
  v_collapse: { w: 249, h: 223, cols: 4, n: 16, px: 125, py: 185 },                            // shadow/dark-explosion — 중력 붕괴 폭발 · 사건의 지평선
  v_portal: { w: 142, h: 111, cols: 4, n: 12, px: 71, py: 102, loop: 1 },                      // arcane/portal — 공허의 교차 포탈
  v_slam: { w: 234, h: 145, cols: 3, n: 8, px: 117, py: 102 },                                 // impacts/ground-slam(먼지 앞부분만) — 포탈 충격파
  v_rift: { w: 251, h: 81, cols: 3, n: 14, px: 127, py: 66 },                                  // nature/quake — 공간 절단(선을 따라 땅이 갈라진다)
  v_sigil: { w: 118, h: 116, cols: 5, n: 18, px: 59, py: 107, warn: [0, 13], hit: [14, 17] },  // shadow/hex-sigil — 사건의 지평선 머리 위 문양
};

/* 그리는 크기 · 개수 — 게임 좌표에 맞춘 배수 k, 범위 반지름에 맞출 때 시트 1배 반지름 rk(k = r / rk, kMin ~ kMax)
   ring · line 처럼 넓은 범위는 시트 여러 장을 흩어 그린다(n 은 화질 lod.q 를 곱해 줄인다) */
export const WB_PX_LOOK = {
  // 숨결 — 한 장이 덮는 반각 half, rows 는 [시작 자리(길이 몫), 배수, 더 늘어놓을 장 수] 두 겹, alpha 는 눈부심을 줄인다
  breath: { half: 0.24, rows: [[0, 2.6, 0], [0.42, 3, 1]], alpha: 0.82 },
  meteor: { rk: 107, kMin: 1.3, kMax: 2.2 }, // 운석 충격 고리 반지름(1배) — 경고 원에 맞춘다
  meteorRing: { k: 1.6, n: 10 },             // 종말의 화염폭풍 첫 단계 — 고리를 따라 터진다
  acid: { rk: 46, kMin: 1.8, kMax: 2.6 },    // 독 웅덩이 반지름(1배) — 너무 키우면 납작한 띠가 된다
  acidRing: { k: 2, n: 10 },                 // 꼬리 휩쓸기 · 탈피 — 고리를 따라 튄다
  puddle: { rk: 46, fill: 0.6, kMax: 2.6, alpha: 0.7 }, // 남는 독 웅덩이 — 칠한 자리의 6할만 덮고 옅게(진하면 흙덩이처럼 보였다)
  strike: { rk: 60, kMin: 1.5, kMax: 2.3 },  // 낙뢰 — 원 반지름에 맞춘다(문양 · 기둥 높이)
  strikeRing: { k: 1.7, n: 10 },             // 고리 · 폭풍 바깥 낙뢰
  strikeLine: { k: 1.4, at: [0.3, 0.62, 0.94] }, // 전류 줄기 · 급강하 경로를 따라 꽂히는 낙뢰
  feather: { k: 1.4, at: [0.32, 0.64, 0.96], lag: 0.12 }, // 전격 깃털 — 경로를 따라 차례로 흩날린다
  break: { k: 2.8 },                         // 합동 공격 성공 — 보스 발밑에 내리치는 빛
  stun: { k: 3.4, lift: 290 },               // 기절 별 — 보스 머리 위
  fall: { k: 3, life: 2.4 },                 // 토벌 빛기둥
  // 즉사 기술 — sigil 은 경고 내내 보스 머리 위(lift)에 그려지고 맞는 순간 부서진다
  doomSigil: { k: 3.6, lift: 420 },
  doomNuke: { k: 3.8, rings: [[460, 6, 2], [900, 10, 2.4]] },  // 보스 자리에 큰 버섯구름 · 고리마다 [반지름, 개수, 배수] 폭발(피난 원 안은 건너뛴다)
  doomMiasma: { k: 4.2, rows: [320, 700, 1080, 1440], step: 0.62, alpha: 0.78 }, // 부채꼴 안쪽에 줄마다 각도 step 간격으로 독구름
  doomEmp: { k: 4.6, rings: [[480, 6], [900, 9], [1320, 12]] },  // 바깥 고리를 따라 전자기 돔 — [반지름, 개수]
  doomPlasma: { k: 6, boltK: 2.6, bolts: [[0.4, 5], [0.78, 9]] }, // 보스 자리에 원을 덮는 플라스마 · [반지름 몫, 개수] 낙뢰
  // 공허의 관측자 — rk 는 시트 1배 반지름(범위에 맞춘다), k 는 고정 배수
  voidHole: { rk: 62, kMin: 1.4, kMax: 4.2, alpha: 0.92 },       // 중력 붕괴 장판 — 칠한 원 반지름에 맞춘다
  voidCollapse: { rk: 96, kMin: 1.3, kMax: 3.4 },                // 중력 붕괴 폭발 · 포탈 도착 충격 — 원 반지름에 맞춘다
  voidPortal: { k: 2.5, lift: 6 },                               // 포탈 — 발 기준점을 (x, y + lift)에 둔다
  voidSlam: { rk: 100, kMin: 1.4, kMax: 3.4, ring: 1.5, n: 8 },  // 포탈 충격 원 · 고리는 둘레 n 곳에 k 배로
  voidRift: { k: 1.6, gap: 0.78 },                               // 공간 절단 — 시트 한 장이 덮는 길이(251 × k)의 gap 만큼씩 이어 붙인다
  voidDoom: { k: 4.4, rings: [[560, 6, 2.2], [980, 10, 2.6]] },     // 사건의 지평선 — 보스 자리에 큰 붕괴 · 고리마다 [반지름, 개수, 배수]
  voidSigil: { k: 3.6, lift: 420 },                              // 보스 머리 위 문양
};
