/* 광장 사람 NPC 그림. 맵·NPC 차례·대화 판정은 기존 데이터를 그대로 쓴다. */
import { PLAZA_NEW } from "./plazaLayout.js";
import { SCREEN_FX } from "./screenFx.js";
export const PLAZA_NPC_ART = {
  size: 84, shopSize: 74, width: 256, height: 256, feet: [128, 248],
  ids: ['shop-weapon','shop-skill','shop-potion','shop-casino','shop-scroll','shop-forge','shop-junk',
    'req-guard','req-collector','req-alchemist','req-questmaster','dungeon','adv','race','shop-onyx'],
};
// 새 광장 + 화면 효과 켬이면 채도를 10% 낮춘 npc-v2(design/plaza-npc/tone_v2.py)
export const plazaNpcPath = id => PLAZA_NPC_ART.ids.includes(id) ? `/assets/game/rpg/${PLAZA_NEW && SCREEN_FX.on ? 'npc-v2' : 'npc'}/${id}.webp` : null;

/* 광장 상점 매대 그림(2D, design/shop-stall/compose.py). 발밑 가운데 기준 게임 좌표 box[x, y, w, h] 칸에 그린다.
   기둥 · 판매대 · 차양 · 그늘 · 바닥 그림자가 한 장이고 주인 앞에 덮는다. ids 에 없는 상점이나 그림을 못 불러오면 코드 도형. */
// 새 광장 + 화면 효과 켬이면 shop-v2 — 새 가판 넷(무기 · 강화소 · 스킬 · 도박장)을 더하고 차양을 구역 색으로 맞췄다. 진열장(onyx)은 그대로
const STALL_V2 = ['weapon', 'forge', 'skill', 'casino', 'scroll', 'potion', 'junk'];
export const SHOP_STALL_ART = { ids: ['scroll', 'potion', 'junk', 'onyx'], box: [-110, -150, 220, 180] };
export const shopStallPath = id => PLAZA_NEW && SCREEN_FX.on && STALL_V2.includes(id) ? `/assets/game/rpg/shop-v2/${id}.webp`
  : SHOP_STALL_ART.ids.includes(id) ? `/assets/game/rpg/shop/${id}.webp` : null;
