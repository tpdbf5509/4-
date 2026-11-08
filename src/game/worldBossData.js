/* 월드보스 첫 시험 수치. 출현·판정·드롭 확률은 여기서 조절한다. */
import { WORLD_WEAPONS, VOID_WEAPONS } from './worldEquipmentData.js';
import { STORM_WEAPONS } from './stormWeaponData.js';
// 보상 수령함 검증과 지급도 같은 목록을 쓴다. 원래 무기 ID와 능력치는 유지한다.
export const WORLD_BOSS_WEAPONS = [...WORLD_WEAPONS, ...STORM_WEAPONS, ...VOID_WEAPONS];
export const worldBossWeapons = id => WORLD_BOSS_WEAPONS.filter(w => (w.rewardBoss || w.set) === id);
export const WORLD_BOSS = {
  revision:5, // 진행 중인 보스도 체력 비율과 기여도를 보존하며 새 수치로 옮긴다.
  map: 'worldboss', fee: 350000,   // 소환비 — 11월 8일 10만 → 35만(사용자 결정)
  introGrace: 4.2,   // 성역에 들어와 등장 연출(약 4초, worldBossIntroData.js)을 보는 동안 보스가 공격을 시작하지 않는다(초)
  period: 3600000, duration: 900000, endWait: 20,
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
  // 11월 5일 사용자 지정 최대 체력. 진행 중인 보스는 revision으로 남은 비율을 보존해 갱신한다.
  { id:'dragon',type:'world_dragon',name:'드래곤 괴수',hp:30000000,color:'#f3aa74',sub:'삼연 숨결 · 추적 운석 · 종말의 화염폭풍 · 멸망의 운석(즉사)',attacks:['cone','meteors','inferno','dragon_doom'] },
  { id:'serpent',type:'world_serpent',name:'거대 뱀 괴수',hp:36000000,color:'#b7d58b',sub:'맹독 추격 · 이중 휩쓸기 · 독왕의 탈피 · 독왕의 심판(즉사)',attacks:['poison','ring','molt','serpent_doom'] },
  { id:'machine',type:'world_machine',name:'고대 번개 기계형 괴수',hp:40000000,color:'#9edcf0',sub:'회전 전류 · 연속 낙뢰 · 천벌 과부하 · 최후의 방전(즉사)',attacks:['cross','lightning','overload','machine_doom'] },
  // 뇌조는 무기 셋만 전용 보상으로 준다.
  { id:'thunderbird',type:'world_thunderbird',name:'뇌조',hp:45000000,color:'#b4b9fa',sub:'전격 깃털 · 뇌광 급강하 · 폭풍의 눈 · 천뢰 심판(즉사)',attacks:['thunder_feathers','thunder_dive','thunder_eye','thunder_doom'],
    art:{src:'/assets/game/rpg/boss/thunderbird.webp',cols:2,rows:1,size:700,feet:[.80,.885]} },
  // 11월 4일 사용자 요청 — 다섯 번째 보스. 새 보스는 늘 뒤에 더한다(출현 차례 · 스냅샷 몹 번호). 권장 레벨 800.
  // 공허의 교차(void_cross)는 체력 50% 이하에서만 쓰고, 그 전에는 건너뛴다. 전설 무기는 공허의 대검 · 지팡이 · 장궁, 방어구는 차원의 지배자
  { id:'void',type:'world_void',name:'공허의 관측자',hp:64000000,color:'#a077f0',recLv:800,sub:'중력 붕괴 · 공간 절단 · 공허의 교차(체력 50% 이하) · 사건의 지평선(즉사)',
    attacks:['gravity_collapse','space_cut','void_cross','event_horizon'],
    art:{src:'/assets/game/rpg/boss/void-observer.webp',cols:2,rows:1,size:700,feet:[.84,.84]} },
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
  // 옛 세 패턴은 진행 중인 전투·스냅샷을 끝까지 처리하려고 남긴다. 새 수치는 이곳에서만 조절한다.
  thunder_feathers:{name:'전격 깃털',hint:'깃털 사이로 피하세요',hits:2,wind:1.8,gap:1.3,damage:.42,
    angles:[-.72,-.36,0,.36,.72],shift:.18,len:900,width:24},
  thunder_dive:{name:'뇌광 급강하',hint:'경로 옆으로 피하세요',landHint:'안쪽으로 들어오세요',hits:2,wind:1.8,gap:1.35,damage:.5,
    dive:.48,minLen:260,maxLen:650,overshoot:100,width:70,margin:100,inner:140,r:330},
  thunder_eye:{name:'폭풍의 눈',hint:'푸른 원 안으로 이동하세요',major:true,wind:3.2,hits:3,gap:1.8,damage:.7,final:.85,
    radii:[260,190,210],offsets:[0,300,0],margin:220},
  /* 즉사 기술(11월 4일, 사용자 요청) — 보스마다 네 번째 공격. 오래 예고하고 피할 자리가 늘 있다.
     맞으면 방어 · 피해 감소 · 보호막과 상관없이 쓰러진다(rpg.js hurtHero 의 doom). 대쉬 무적 · 전설 갑옷 부활은 그대로 살린다.
     큰 기술(major)이라 마지막 1.6초에 400레벨 3명이 합동 공격하면 끊을 수 있다. wind 는 예고 시간(초) */
  dragon_doom:{name:'멸망의 운석',hint:'빛나는 원 안으로 숨으세요',doom:true,major:true,wind:4.6,hits:1,damage:1,
    shelters:[-2.2,2.2],shelterR:150,shelterD:520,margin:200},          // 보스가 노린 쪽에서 좌우 뒤로 2.2라디안 · 520 거리에 피난 원 둘
  serpent_doom:{name:'독왕의 심판',hint:'뱀의 등 뒤로 돌아가세요',doom:true,major:true,wind:4.6,hits:1,damage:1,len:1600,arc:2.45}, // 앞쪽 ±140도를 덮는다 — 등 뒤 80도만 안전
  machine_doom:{name:'최후의 방전',hint:'기계 발밑으로 붙으세요',doom:true,major:true,wind:4.6,hits:1,damage:1,inner:190,r:1700}, // 보스 둘레 190 안만 안전
  /* 공허의 관측자(11월 4일) — damage 는 맞은 사람 최대 체력에 대한 비율(방어 적용 전). 예고 시간 wind 는 첫 타, 이어지는 타는 gap.
     중력 붕괴 — 사람 둘레에 보라색 장판 r, 마지막 pullFor 초 동안 장판 안의 사람을 중심으로 pull px/초 끌어당긴 뒤 터진다. 장판 밖이면 안 맞는다
     공간 절단 — 사람 하나씩 겨눈 직선 3번(중심선에서 양쪽 width). 공격마다 0.8초 예고
     공허의 교차 — 체력 belowHp 이하에서만. 포탈 둘(서로 portalD*2 떨어진 곳)을 열고 보스가 포탈 → 포탈 → 처음 포탈로 건너뛰며 충격파(r 원 · 원 · 고리)
     사건의 지평선 — 4.6초 예고 즉사. 보스 둘레(safeD)에 안전 구역 셋(반지름 safeR), 구역끼리 safeGap 배 반지름 이상 떨어지고 걸어 들어갈 수 있는 안쪽에만 둔다 */
  gravity_collapse:{name:'중력 붕괴',hint:'보라색 원 밖으로 벗어나세요',hits:1,wind:1.5,damage:.45,r:185,pull:170,pullFor:.5},
  space_cut:{name:'공간 절단',hint:'붉은 선 밖으로 피하세요',hits:3,wind:.8,gap:.8,damage:.3,len:1400,width:58},
  void_cross:{name:'공허의 교차',hint:'포탈에 내려앉는 충격파를 피하세요',hits:3,wind:1.6,gap:1.3,damage:.4,belowHp:.5,portalD:300,r:240,ringInner:120,ringR:430},
  event_horizon:{name:'사건의 지평선',hint:'빛나는 안전 구역으로 들어가세요',doom:true,major:true,wind:4.6,hits:1,damage:1,safes:3,safeR:150,safeD:420,safeGap:2.4,margin:60},
  thunder_doom:{name:'천뢰 심판',hint:'뇌조에게서 멀리 벗어나세요',doom:true,major:true,wind:4.6,hits:1,damage:1,r:560},           // 보스 둘레 560 안이 즉사
};
export const WORLD_BOSS_BY_TYPE=Object.fromEntries(WORLD_BOSSES.map(b=>[b.type,b]));
export const WORLD_BOSS_BY_ID=Object.fromEntries(WORLD_BOSSES.map(b=>[b.id,b]));
export const worldBossIdentity=(g,h)=>String(g.names[h.pi]||g.looks[h.pi]?.name||'').normalize('NFKC').trim().toLowerCase();
