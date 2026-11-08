/* ── 공허 무기 · 차원의 지배자 4세트 연출 — pixelfx(MIT, github.com/patch-gg/pixelfx)로 뽑은 픽셀 시트(11월 7일) ─────────────
   판정 시각 · 범위는 voidWeaponData.js · worldEquipmentData.js 그대로다. 연출만 바꾼다.
   시트는 public/assets/game/rpg/effects/void-weapon/<이름>.webp. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음).
   뽑는 법 · 색은 design/effects/pixelfx/void-weapon/make.mjs. 그리기는 voidWeaponPxArt.js. 시트를 못 불러오면 예전 코드 도트 그림(voidWeaponArt.js)으로 그린다.
   월드보스 공격 시트(world-boss/v_*)와 다른 이펙트 · 씨앗으로 따로 뽑았다(월드보스 무기 연출은 재사용하지 않는다). */

export const VOID_PX_SRC = "/assets/game/rpg/effects/void-weapon/";

// 시트 칸 — w · h 한 칸 크기, cols 열 수, n 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 여부
export const VOID_PX_SHEETS = {
  vw_cut: { w: 116, h: 90, cols: 4, n: 12, cx: 58, cy: 45 },             // melee/double-slash — 대검 X 자 공간 참격
  vw_burst: { w: 198, h: 188, cols: 4, n: 10, cx: 99, cy: 94 },          // explosions/plasma-explosion — 대검 마지막 공간 폭발
  vw_sky: { w: 143, h: 125, cols: 4, n: 12, cx: 73, cy: 66, loop: 1 },   // shadow/eclipse — 장궁 하늘의 균열
  vw_arrow: { w: 80, h: 14, cols: 2, n: 6, cx: 78, cy: 7, loop: 1 },     // projectiles/arrow — 떨어지는 공허 화살(화살촉이 기준점)
  vw_hit: { w: 159, h: 99, cols: 3, n: 10, cx: 66, cy: 70 },             // impacts/crit-hit — 화살 착탄
  vw_hole: { w: 127, h: 133, cols: 4, n: 12, cx: 64, cy: 66, loop: 1 },  // shadow/void-orb — 지팡이 블랙홀
  vw_crush: { w: 164, h: 164, cols: 4, n: 12, cx: 79, cy: 79 },          // explosions/implosion — 지팡이 마지막 붕괴 · 중력 공명
  vw_spin: { w: 156, h: 85, cols: 3, n: 10, cx: 68, cy: 50 },            // melee/spin-slash — 대검 패시브 차원의 잔흔
  vw_set: { w: 147, h: 139, cols: 4, n: 10, cx: 77, cy: 115 },           // arcane/mana-burst — 차원의 지배자 4세트 공간 폭발
};

/* 그리는 크기 · 시각 — k 고정 배수, fit 범위 지름에 맞출 때 시트 1배 지름(k = 2r / fit, kMax 넘지 않게)
   play 한 번짜리 시트를 몇 초에 다 돌리는지, spin 반복 시트를 몇 초에 한 바퀴 돌리는지 */
export const VOID_PX_LOOK = {
  cut: { fit: 110, kMax: 3.8, play: 0.42 },          // 대검 6번 베기 — 둘레 r 에 맞추고 베기마다 돌려 그린다
  burst: { fit: 170, kMax: 3, play: 0.35 },          // 대검 마지막 폭발 — burstR 에 맞춘다
  sky: { k: 2.4, spin: 4, lift: 330 },               // 장궁 하늘 균열 — 맞을 자리 위 lift 높이
  arrow: { k: 2.6 },                                 // 떨어지는 화살
  hit: { fit: 150, kMax: 2.2, play: 0.34 },          // 화살 착탄 — arrowR 에 맞춘다
  hole: { fit: 90, kMax: 3.6, spin: 3.2 },           // 블랙홀 — r 에 맞춘다(소용돌이가 범위를 덮는다)
  crush: { fit: 150, kMax: 3.2, lead: 0.3, tail: 0.2 }, // 마지막 붕괴 — 폭발 lead 초 전부터 tail 초 뒤까지(가운데 번쩍임이 폭발 순간)
  spin: { fit: 140, kMax: 3, play: 0.5 },            // 대검 패시브
  gravPas: { fit: 150, kMax: 2.2, play: 0.55 },      // 지팡이 패시브 중력 공명
  set: { fit: 130, kMax: 3, play: 0.6 },             // 4세트 공간 폭발 — radius 에 맞춘다
};
