/* 광장 사람 NPC 그림. 맵·NPC 차례·대화 판정은 기존 데이터를 그대로 쓴다. */
export const PLAZA_NPC_ART = {
  size: 84, shopSize: 74, width: 256, height: 256, feet: [128, 248],
  ids: ['shop-weapon','shop-skill','shop-potion','shop-casino','shop-scroll','shop-forge','shop-junk',
    'req-guard','req-collector','req-alchemist','req-questmaster','dungeon','adv','race'],
};
export const plazaNpcPath = id => PLAZA_NPC_ART.ids.includes(id) ? `/assets/game/rpg/npc/${id}.webp` : null;
