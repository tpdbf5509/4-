/* 월드보스 첫 시험 수치. 출현·판정·드롭 확률은 여기서 조절한다. */
export const WORLD_BOSS = {
  map: 'worldboss', fee: 100000, period: 3600000, duration: 900000, endWait: 20,
  contribution: .1, wind: 1.5, gap: 3.8, rageGap: 2.6, rageAt: .3,
  hitPct: .28, poolPct: .08, poolTime: 7, poolTick: 1, // 낮은 레벨도 경고를 보고 피할 기회를 준다.
  w: 2200, h: 1500, spawn: [900,950], center: [1250,1100], squash: .78,
  art: '/assets/game/rpg/boss/world-bosses.webp', artCols: 3, artRows: 2, artSize: 700,
  artFeet: [[.75,.755,.77],[.738,.715,.72]],
  heart: [10,20], coins: [50000,150000], coinStep: 100,
  weaponChance: .02, armorChance: .03, ticketChance: .3,
  potions: [{id:'heal_l',chance:.65,n:5},{id:'buff_str',chance:.25,n:2},{id:'buff_int',chance:.25,n:2},{id:'buff_crit',chance:.2,n:2}],
};
export const WORLD_BOSSES = [
  { id:'dragon',type:'world_dragon',name:'드래곤 괴수',hp:1800000,color:'#f3aa74',sub:'화염 숨결 · 낙하 운석',attacks:['cone','meteors'] },
  { id:'serpent',type:'world_serpent',name:'거대 뱀 괴수',hp:2000000,color:'#b7d58b',sub:'맹독 웅덩이 · 꼬리 휩쓸기',attacks:['poison','ring'] },
  { id:'machine',type:'world_machine',name:'고대 번개 기계형 괴수',hp:2200000,color:'#9edcf0',sub:'십자 전류 · 추적 낙뢰',attacks:['cross','lightning'] },
];
export const WORLD_BOSS_BY_TYPE=Object.fromEntries(WORLD_BOSSES.map(b=>[b.type,b]));
export const WORLD_BOSS_BY_ID=Object.fromEntries(WORLD_BOSSES.map(b=>[b.id,b]));
export const worldBossIdentity=(g,h)=>String(g.names[h.pi]||g.looks[h.pi]?.name||'').normalize('NFKC').trim().toLowerCase();
