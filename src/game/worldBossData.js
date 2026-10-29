/* 월드보스 첫 시험 수치. 출현·판정·드롭 확률은 여기서 조절한다. */
import { WORLD_WEAPONS } from './worldEquipmentData.js';
import { STORM_WEAPONS } from './stormWeaponData.js';
// 보상 수령함 검증과 지급도 같은 목록을 쓴다. 원래 무기 ID와 능력치는 유지한다.
export const WORLD_BOSS_WEAPONS = [...WORLD_WEAPONS, ...STORM_WEAPONS];
export const worldBossWeapons = id => WORLD_BOSS_WEAPONS.filter(w => (w.rewardBoss || w.set) === id);
export const WORLD_BOSS = {
  revision:4, // 진행 중인 보스도 체력 비율과 기여도를 보존하며 새 수치로 옮긴다.
  map: 'worldboss', fee: 100000, period: 3600000, duration: 900000, endWait: 20,
  contribution: .1, wind: 1.5, gap: 2.8, rageGap: 1.8, rageAt: .3,
  hitPct: .45, poolPct: .14, poolTime: 7, poolTick: 1, // 경고를 보고 피해야 하는 강한 연속 공격으로 바꾼다.
  coop: {window:1.6,sync:.85,players:3,stun:4,lv:400}, // 400레벨 3명이 스킬을 맞춰 큰 기술을 4초간 끊는다. lv — 최고 레벨이 800 으로 올라도(10월 26일) 예전 만렙 400 기준을 그대로 둔다
  w: 2200, h: 1500, spawn: [900,950], center: [1250,1100], squash: .78,
  portal:{x:1660,y:1115,reach:115},
  art: '/assets/game/rpg/boss/world-bosses.webp', artCols: 3, artRows: 2, artSize: 700,
  artFeet: [[.75,.755,.77],[.738,.715,.72]],
  heart: [10,20], coins: [50000,150000], coinStep: 100,
  weaponChance: .02, armorChance: .03, ticketChance: .3,
  potions: [{id:'heal_l',chance:.65,n:5},{id:'buff_str',chance:.25,n:2},{id:'buff_int',chance:.25,n:2},{id:'buff_crit',chance:.2,n:2}],
};
export const WORLD_BOSSES = [
  // 사용자 예시인 뱀1200만에 맞춰 이전 체력의 1/100로 조정한다. 공격 패턴·보상·15분 제한은 유지한다.
  { id:'dragon',type:'world_dragon',name:'드래곤 괴수',hp:11500000,color:'#f3aa74',sub:'삼연 숨결 · 추적 운석 · 종말의 화염폭풍',attacks:['cone','meteors','inferno'] },
  { id:'serpent',type:'world_serpent',name:'거대 뱀 괴수',hp:12000000,color:'#b7d58b',sub:'맹독 추격 · 이중 휩쓸기 · 독왕의 탈피',attacks:['poison','ring','molt'] },
  { id:'machine',type:'world_machine',name:'고대 번개 기계형 괴수',hp:12500000,color:'#9edcf0',sub:'회전 전류 · 연속 낙뢰 · 천벌 과부하',attacks:['cross','lightning','overload'] },
  // 새 보스는 기존 기계보다 체력 50만 증가. 무기 셋만 전용 보상으로 준다.
  { id:'thunderbird',type:'world_thunderbird',name:'뇌조',hp:13000000,color:'#b4b9fa',sub:'뇌익 전류 · 깃털 낙뢰 · 뇌우 폭풍',attacks:['thunder_wings','thunder_hunt','thunderstorm'],
    art:{src:'/assets/game/rpg/boss/thunderbird.webp',cols:2,rows:1,size:700,feet:[.80,.885]} },
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
  thunder_wings:{name:'뇌익 전류',hits:2,gap:1.2,damage:.5},
  thunder_hunt:{name:'깃털 낙뢰',hits:3,gap:1,damage:.5},
  thunderstorm:{name:'뇌우 폭풍',major:true,wind:3.2,hits:3,gap:1.5,damage:.7,final:.85},
};
export const WORLD_BOSS_BY_TYPE=Object.fromEntries(WORLD_BOSSES.map(b=>[b.type,b]));
export const WORLD_BOSS_BY_ID=Object.fromEntries(WORLD_BOSSES.map(b=>[b.id,b]));
export const worldBossIdentity=(g,h)=>String(g.names[h.pi]||g.looks[h.pi]?.name||'').normalize('NFKC').trim().toLowerCase();
