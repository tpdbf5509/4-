/* ── 스킬 상점 스킬 연출 — pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑은 픽셀 시트 ─────────────
   스킬 상점에서 파는 액티브 13종(일반 4 · 직업 9)의 연출만 바꾼다. 판정(맞는 시각 · 범위)은 rpg.js 그대로다.
   시트는 public/assets/game/rpg/effects/skill-px/<이름>.webp. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   뽑는 법 · 색은 design/effects/pixelfx/skill-shop/make.mjs. 그리기는 skillPxArt.js.
   연출 kind 는 "sk_px_<시트>" — 스킬 연출이라 rpgArt.js 의 CROWD · FX_LOD 규칙으로 남의 것은 덜 그린다. */

export const SKILL_PX_SRC = "/assets/game/rpg/effects/skill-px/";

// 시트 칸 — w · h 한 칸 크기, cols 열 수, n 칸 수, px · py 기준점(대부분 발밑), loop 반복 여부
export const SKILL_PX_SHEETS = {
  smash: { w: 148, h: 91, cols: 3, n: 12, px: 55, py: 73 },                // melee/hammer-smash
  burst: { w: 169, h: 143, cols: 4, n: 14, px: 77, py: 118 },              // arcane/mana-burst
  pierce: { w: 163, h: 120, cols: 3, n: 10, px: 66, py: 92 },              // impacts/crit-hit
  aid: { w: 107, h: 114, cols: 5, n: 16, px: 53, py: 105 },                // nature/healing-bloom
  rush: { w: 148, h: 63, cols: 2, n: 8, px: 5, py: 53 },                   // melee/thrust
  spin: { w: 175, h: 87, cols: 3, n: 10, px: 75, py: 69 },                 // melee/spin-slash
  cleave: { w: 245, h: 77, cols: 2, n: 12, px: 126, py: 62 },              // nature/quake
  arrow: { w: 81, h: 15, cols: 2, n: 6, px: 79, py: 7, loop: 1 },          // projectiles/arrow
  arrow_ice: { w: 81, h: 15, cols: 2, n: 6, px: 79, py: 7, loop: 1 },      // projectiles/arrow(서리빛)
  spark: { w: 112, h: 69, cols: 3, n: 8, px: 28, py: 56 },                 // impacts/hit-spark
  spark_ice: { w: 112, h: 69, cols: 3, n: 8, px: 28, py: 56 },             // impacts/hit-spark(서리빛)
  chain: { w: 119, h: 88, cols: 3, n: 10, px: 75, py: 44 },                // lightning/zap-hit
  iron: { w: 70, h: 74, cols: 4, n: 12, px: 35, py: 61, loop: 1 },         // holy/divine-shield
  circle: { w: 162, h: 219, cols: 5, n: 16, px: 81, py: 192 },             // arcane/magic-circle-cast
  // 원소 구체 — 원소마다 색을 따로 뽑았다(원소 탑 색에서 톤다운)
  orb_flame: { w: 103, h: 53, cols: 3, n: 8, px: 78, py: 26, loop: 1 },    // projectiles/plasma-shot
  orb_frost: { w: 103, h: 53, cols: 3, n: 8, px: 78, py: 26, loop: 1 },
  orb_bolt: { w: 103, h: 53, cols: 3, n: 8, px: 78, py: 26, loop: 1 },
  orb_poison: { w: 102, h: 52, cols: 3, n: 8, px: 78, py: 25, loop: 1 },
  orb_corrode: { w: 102, h: 52, cols: 3, n: 8, px: 78, py: 25, loop: 1 },
  orb_gravity: { w: 103, h: 52, cols: 3, n: 8, px: 78, py: 25, loop: 1 },
  boom_flame: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },         // explosions/plasma-explosion
  boom_frost: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },
  boom_bolt: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },
  boom_poison: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },
  boom_corrode: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },
  boom_gravity: { w: 200, h: 192, cols: 4, n: 11, px: 101, py: 94 },
};
// 원소 시트가 있는 원소 — 없으면(원소 없음) 서리빛으로 그린다
export const SKILL_PX_ELEMS = ["flame", "frost", "bolt", "poison", "corrode", "gravity"];
export const SKILL_PX_ELEM_FALLBACK = "frost";

/* 그리는 법 — kind 마다.
   mode: at 한 점(x, y 발밑) · along 두 점 사이에 눕혀 늘린다(x0 → x1) · fly 두 점 사이를 날아간다
   k 키우는 배수(1배 픽셀 → 게임 좌표) · rk 반지름(f.r)에 맞출 때 시트 1배의 반지름(k = r / rk, kMax 넘지 않게)
   span along 에서 시트 1배의 가로 길이(두 점 거리 / span 만큼 늘린다) · lift 기준점을 위로 띄우는 높이(게임 좌표)
   ring 범위 고리를 함께 그린다(예전 고리와 같은 크기 · 1px 얇은 선) · spin 반복 시트를 몇 배 빠르게 돌리는지
   from 한 번짜리 시트의 앞부분을 이 몫만큼 건너뛴다(맞는 순간에 바로 터지게) */
export const SKILL_PX_LOOK = {
  smash: { mode: "at", k: 2, from: 0.25 },                       // 강타 — 맞은 자리에 망치 내려찍기
  burst: { mode: "at", rk: 62, kMax: 2.6, ring: 1 },     // 마력 폭발 — 둘레 210 에 맞춘 마력 고리
  pierce: { mode: "at", k: 1.5 },                      // 급소 찌르기 — 치명타 불꽃
  aid: { mode: "at", k: 2, from: 0.15 },                         // 응급 처치 — 발밑에 피어나는 꽃
  rush: { mode: "at", k: 2 },                          // 돌진 베기 — 출발 자리의 찌르기 줄기
  spin: { mode: "at", rk: 60, kMax: 3, ring: 1 },      // 돌진 베기 — 닿은 자리 둘레 120 을 도는 칼바람
  cleave: { mode: "along", span: 236, k: 1.7 },        // 대지 가르기 — 한 줄로 갈라지는 땅
  arrow: { mode: "fly", k: 2.4 },                        // 관통 화살 · 연사 — 날아가는 화살
  arrow_ice: { mode: "fly", k: 2.4 },                    // 후퇴 사격 — 서리빛 화살
  spark: { mode: "at", k: 1.8 },                       // 화살이 맞은 자리
  spark_ice: { mode: "at", k: 1.8 },                   // 후퇴 사격이 맞은 자리
  chain: { mode: "along", span: 70, k: 1.6, kMax: 3, end: 1 },   // 연쇄 번개 — 앞 대상에서 뻗어 오는 번개(끝점이 맞은 자리)
  iron: { mode: "at", rk: 29, kMax: 2.6, spin: 2.4 },  // 철벽 — 몸을 감싸는 방패 구슬
  circle: { mode: "at", rk: 40, kMax: 2.4, ring: 1 },         // 강화 마법진 — 발밑 마법진과 빛기둥
  orb: { mode: "fly", k: 2, elem: 1 },                 // 원소 구체 — 날아가는 원소 구슬
  boom: { mode: "at", rk: 80, kMax: 2.4, ring: 1, elem: 1 },   // 원소 구체 — 맞은 자리 둘레 140 폭발
};
// 같은 종류는 최근 몇 개만 그린다(rpgArt.js FX_LOD.cap) — 연사 화살 · 연쇄 번개처럼 한 번에 여럿 나오는 것만 넉넉히
export const SKILL_PX_CAP = { sk_px_arrow: 10, sk_px_spark: 10, sk_px_chain: 8, sk_px_boom: 4, sk_px_burst: 4, sk_px_cleave: 4 };
