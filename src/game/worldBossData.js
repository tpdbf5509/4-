/* 월드보스 첫 시험 수치. 출현·판정·드롭 확률은 여기서 조절한다. */
export const WORLD_BOSS = {
  revision:2, // 진행 중인 보스도 체력 비율과 기여도를 보존하며 새 수치로 옮긴다.
  map: 'worldboss', fee: 100000, period: 3600000, duration: 900000, endWait: 20,
  contribution: .1, wind: 1.5, gap: 2.8, rageGap: 1.8, rageAt: .3,
  hitPct: .45, poolPct: .14, poolTime: 7, poolTick: 1, // 경고를 보고 피해야 하는 강한 연속 공격으로 바꾼다.
  coop: {window:1.6,sync:.85,players:3,stun:4}, // 만렙 3명이 스킬을 맞춰 큰 기술을 4초간 끊는다.
  w: 2200, h: 1500, spawn: [900,950], center: [1250,1100], squash: .78,
  portal:{x:1280,y:800,reach:115},
  art: '/assets/game/rpg/boss/world-bosses.webp', artCols: 3, artRows: 2, artSize: 700,
  artFeet: [[.75,.755,.77],[.738,.715,.72]],
  heart: [10,20], coins: [50000,150000], coinStep: 100,
  weaponChance: .02, armorChance: .03, ticketChance: .3,
  potions: [{id:'heal_l',chance:.65,n:5},{id:'buff_str',chance:.25,n:2},{id:'buff_int',chance:.25,n:2},{id:'buff_crit',chance:.2,n:2}],
};
export const WORLD_BOSSES = [
  // 만렙 +30 전설 3인, 합산 약15.5만/초의 공격 전념 측정을 기준으로 회피·합동 차단이 필요한 15분 전투를 잡는다.
  { id:'dragon',type:'world_dragon',name:'드래곤 괴수',hp:115000000,color:'#f3aa74',sub:'삼연 숨결 · 추적 운석 · 종말의 화염폭풍',attacks:['cone','meteors','inferno'] },
  { id:'serpent',type:'world_serpent',name:'거대 뱀 괴수',hp:120000000,color:'#b7d58b',sub:'맹독 추격 · 이중 휩쓸기 · 독왕의 탈피',attacks:['poison','ring','molt'] },
  { id:'machine',type:'world_machine',name:'고대 번개 기계형 괴수',hp:125000000,color:'#9edcf0',sub:'회전 전류 · 연속 낙뢰 · 천벌 과부하',attacks:['cross','lightning','overload'] },
];
// damage는 최대 체력에 대한 방어 적용 전 비율이다. 큰 기술의 첫 타격만 합동 공격으로 끊을 수 있다.
export const WORLD_BOSS_PATTERNS = {
  cone:{name:'삼연 화염 숨결',hits:3,gap:.95,damage:.45},
  meteors:{name:'추적 운석 폭격',hits:3,gap:1.1,damage:.5},
  poison:{name:'맹독 추격',hits:2,gap:1.2,damage:.45,pool:true},
  ring:{name:'이중 꼬리 휩쓸기',hits:2,gap:1.5,damage:.5},
  cross:{name:'회전 십자 전류',hits:2,gap:1.1,damage:.5},
  lightning:{name:'연쇄 추적 낙뢰',hits:3,gap:.95,damage:.5},
  inferno:{name:'종말의 화염폭풍',major:true,wind:3.2,hits:4,gap:1.4,damage:.75,final:.85},
  molt:{name:'독왕의 탈피',major:true,wind:3.2,hits:3,gap:1.8,damage:.7,final:.8,pool:true},
  overload:{name:'천벌 과부하',major:true,wind:3.2,hits:3,gap:1.5,damage:.75,final:.85},
};
export const WORLD_BOSS_BY_TYPE=Object.fromEntries(WORLD_BOSSES.map(b=>[b.type,b]));
export const WORLD_BOSS_BY_ID=Object.fromEntries(WORLD_BOSSES.map(b=>[b.id,b]));
export const worldBossIdentity=(g,h)=>String(g.names[h.pi]||g.looks[h.pi]?.name||'').normalize('NFKC').trim().toLowerCase();
