import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgWorldBoss,rpgStep,rpgPack,rpgApply,rpgPromote,rpgWeaponSkill,rpgDungeon,npcNear,MAPS} from '../src/game/rpg.js';
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_PATTERNS} from '../src/game/worldBossData.js';
import {worldBossHit,worldBossKilled,rollWorldBossReward,collectWorldBossMail,worldBossAreaContains,worldBossCoopOpen} from '../src/game/worldBoss.js';
import {cleanBag} from '../src/game/shop.js';
import {RESET,GIFT,MAT_MAX} from '../src/game/itemData.js';
import {DUNGEONS,DUNGEON} from '../src/game/dungeonData.js';
const seats=Array.from({length:3},(_,i)=>({id:`wb${i}`,name:`토벌${i}`,hero:{name:`토벌${i}`,job:'archer',elem:'frost',gender:'m'}}));
function setup(){
 const g=makeWorld();g.mySeat=0;g.wb.lastHour=Math.floor(g.wb.clock/C.period);g.out=[];
 rpgSyncSeats(g,seats);for(let i=0;i<3;i++)rpgJoin(g,i,{name:seats[i].name,rs:RESET.id,gift:GIFT.id,lv:100,ts:0,coins:300000,stats:{str:100,hp:100},bag:{oc:1,w:[{u:1,t:'bow',r:10,g:4,p:100,sp:'dragon_bow'}],e:1,n:2}},seats[i].id);
 g.heroes.forEach(h=>{if(h){h.auto=0;h.x=C.portal.x;h.y=C.portal.y+70;}});return g;
}
function advance(g,t){for(let n=0;n<Math.ceil(t/.02);n++)rpgStep(g,.02);}
const E={notice(){}};
test('소환은 광장·코인 확인 후 한 번만 차감하며 중복 출현을 거절한다',()=>{
 const g=setup(),h=g.heroes[0];h.coins=C.fee-1;assert(!rpgWorldBoss(g,0,{op:'summon',id:'dragon'}));assert(!g.wb.active);
 h.coins=300000;h.map='train';assert(!rpgWorldBoss(g,0,{op:'summon',id:'dragon'}));h.map='plaza';
 assert(rpgWorldBoss(g,0,{op:'summon',id:'dragon'}));assert.equal(h.coins,200000);
 assert(!rpgWorldBoss(g,0,{op:'summon',id:'serpent'}));assert.equal(h.coins,200000);assert.equal(g.mobs.filter(m=>m.map===C.map).length,1);
});
test('자연 출현은 시간 경계를 지나 한 번만 발생하고 서버별로 독립이다',()=>{
 const a=setup(),b=setup();a.wbServer='RPG1';b.wbServer='RPG2';const at=(Math.floor(a.wb.clock/C.period)+1)*C.period;
 a.wb.clock=b.wb.clock=at-5;a.wb.lastHour=b.wb.lastHour=at/C.period-1;
 advance(a,.02);advance(b,.02);assert(a.wb.active);assert(b.wb.active);assert.notEqual(a.wb.active.key,b.wb.active.key);assert.notEqual(a.wb.active.id,b.wb.active.id);
 const key=a.wb.active.key;advance(a,1);assert.equal(a.wb.active.key,key);assert.equal(a.heroes[0].coins,300000);
});
test('성역에 세 명이 각각 입장하고 언제든 살아서 나올 수 있다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});
 for(let i=0;i<3;i++)assert(rpgWorldBoss(g,i,{op:'enter'}));assert(g.heroes.every(h=>!h||h.map===C.map));
 assert(rpgWorldBoss(g,1,{op:'leave'}));assert.equal(g.heroes[1].map,'plaza');
});
test('실제 무기 스킬 피해가 월드보스 기여도에 집계되고 보상을 한 번만 준다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});rpgWorldBoss(g,0,{op:'enter'});
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob),h=g.heroes[0];m.hp=m.max=a.hp=a.max=1000;h.x=m.x-130;h.y=m.y;h.look=[1,0];h.dir=1;
 rpgWeaponSkill(g,0);advance(g,2);assert.equal(a.phase,'clear');assert(a.contrib[0].damage===1000);assert(h.coins>=250000);assert(h.bag.m.heart>=10);assert(h.bag.wbDone.includes(a.key));
 const before=h.coins;advance(g,1);assert.equal(h.coins,before);
});
test('기여도 정확히 10%는 제외하고 10% 초과만 지급하며 과잉 피해는 집계하지 않는다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'serpent'});const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);m.hp=m.max=a.hp=a.max=1000;
 worldBossHit(g,m,g.heroes[0],100);m.hp-=100;worldBossHit(g,m,g.heroes[1],110);m.hp-=110;worldBossHit(g,m,g.heroes[2],999999);
 assert.equal(a.contrib[2].damage,790);worldBossKilled(E,g,m);
 assert(!g.heroes[0].bag.wbDone.includes(a.key));assert(g.heroes[1].bag.wbDone.includes(a.key));assert(g.heroes[2].bag.wbDone.includes(a.key));
});
test('드롭은 독립 추첨이고 확정 보상 범위와 코인 100 단위를 지킨다',()=>{
 const all=rollWorldBossReward('dragon',()=>0);assert.equal(all.items.length,13);assert.equal(all.coins,50000);assert.equal(all.items[0].n,10);
 const min=rollWorldBossReward('machine',()=>.999999);assert.equal(min.items.length,1);assert.equal(min.items[0].n,20);assert.equal(min.coins,150000);
 for(let i=0;i<100;i++){const r=rollWorldBossReward('serpent');assert(r.coins>=50000&&r.coins<=150000&&r.coins%100===0);assert(r.items[0].n>=10&&r.items[0].n<=20);}
});
test('가방이 차면 물품을 보관하고 재접속 정리 후 빈 칸만큼 수령한다',()=>{
 const g=setup(),h=g.heroes[0];h.bag.m.heart=MAT_MAX;h.bag.w=Array.from({length:30},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:1}));h.bag.a=Array.from({length:30},(_,i)=>({u:100+i,s:'head',g:0}));h.bag.n=200;
 h.bag.wbMail=[{k:'material',id:'heart',n:20},{k:'weapon',id:'dragon_dual',n:1},{k:'armor',id:'head',set:'dragon',n:1}];
 assert.equal(collectWorldBossMail(h),0);assert.equal(h.bag.wbMail.length,3);
 h.bag=cleanBag(JSON.parse(JSON.stringify(h.bag)));assert.equal(h.bag.wbMail[0].n,20);h.bag.m.heart-=5;h.bag.w.pop();h.bag.a.pop();
 assert.equal(collectWorldBossMail(h),7);assert.equal(h.bag.wbMail[0].n,15);assert(h.bag.w.some(w=>w.sp==='dragon_dual'));assert(h.bag.a.some(a=>a.set==='dragon'));
});
test('방장 승계는 보스 체력·기여·위험지역·남은 공격을 복구한다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'machine'});rpgWorldBoss(g,0,{op:'enter'});advance(g,3.2);
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);worldBossHit(g,m,g.heroes[0],200);m.hp-=200;advance(g,.02);
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(guest);
 assert.equal(guest.wb.active.hp,a.hp);assert.deepEqual(guest.wb.active.contrib,a.contrib);assert.deepEqual(guest.wb.active.attack,a.attack);assert.equal(guest.mobs.find(m=>m.id===a.mob).hp,m.hp);assert.equal(guest.mobs.find(m=>m.id===a.mob).pose,1);
});
test('입장자가 없어 스냅샷에서 몹이 생략돼도 승계하면 복구한다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});const snap=JSON.parse(JSON.stringify(rpgPack(g)));assert(!snap.m.some(row=>row[0]===g.wb.active.mob));
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,snap);rpgPromote(guest);assert(guest.mobs.some(m=>m.id===guest.wb.active.mob));
});
test('보스마다 세 패턴이 순서대로 나오고 모든 연속 타격이 끝난다',()=>{
 for(const B of WORLD_BOSSES){const g=setup();rpgWorldBoss(g,0,{op:'summon',id:B.id});rpgWorldBoss(g,0,{op:'enter'});const a=g.wb.active,h=g.heroes[0];h.inv=999;
  for(let n=0;n<3;n++){a.cd=0;advance(g,.02);assert.equal(a.attack.kind,B.attacks[n]);assert.equal(a.attack.major,n===2);
   const expected=WORLD_BOSS_PATTERNS[B.attacks[n]].hits,seen=new Set();
   for(let t=0;t<12&&a.attack;t+=.02){seen.add(a.attack.step);advance(g,.02);}
   assert(!a.attack);assert.equal(seen.size,expected);assert(g.out.some(f=>f.kind==='sk_raid_hit'&&f.pattern===B.attacks[n]));
  }
 }
 assert(worldBossAreaContains({shape:'ring',x:0,y:0,inner:100,r:300},{x:200,y:0}));assert(!worldBossAreaContains({shape:'ring',x:0,y:0,inner:100,r:300},{x:50,y:0}));
});
test('시간 초과는 보상 없이 종료하고 광장으로 돌아간다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});rpgWorldBoss(g,0,{op:'enter'});g.wb.active.expires=g.wb.clock;g.wb.active.stun=4;g.wb.active.breakPending=true;advance(g,.02);assert.equal(g.wb.active.phase,'fail');assert.equal(g.wb.active.stun,0);assert.equal(g.wb.active.breakPending,false);advance(g,C.endWait+.1);assert.equal(g.wb.active,null);assert.equal(g.heroes[0].map,'plaza');assert(!g.heroes[0].bag.m.heart);
});
test('경고 범위에 남으면 피해를 받고 대쉬 무적이면 피한다',()=>{
 for(const inv of [0,3]){
  const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});rpgWorldBoss(g,0,{op:'enter'});const a=g.wb.active,h=g.heroes[0];
  a.cd=0;advance(g,.02);const before=h.hp;h.inv=inv;advance(g,C.wind+.04);
  if(inv)assert.equal(h.hp,before);else assert(h.hp<before*.8);
 }
});
test('같은 자리에 들어온 다른 캐릭터는 이전 기여도와 보상을 물려받지 않는다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);
 worldBossHit(g,m,g.heroes[0],m.hp);
 const replacement=structuredClone(seats);replacement[0]={id:'new',name:'새모험가',hero:{...seats[0].hero,name:'새모험가'}};rpgSyncSeats(g,replacement);
 rpgJoin(g,0,{name:'새모험가',rs:RESET.id,gift:GIFT.id,lv:100,stats:{hp:100},coins:0,bag:{oc:1}},'new');
 worldBossKilled(E,g,m);assert.equal(g.heroes[0].coins,0);assert.equal(g.heroes[0].bag.wbDone.length,0);assert(g.wb.results[0].rewards.some(r=>r.name==='토벌0'&&!r.applied));
});
test('던전 입장권은 코인 대신 한 장 소비하고 중복 요청은 소비하지 않는다',()=>{
 const g=setup(),h=g.heroes[0],d=DUNGEONS[0];h.x=DUNGEON.npc.x;h.y=DUNGEON.npc.y;h.coins=0;h.bag.m.dungeon_ticket=2;
 assert(rpgDungeon(g,0,{op:'enter',id:d.id,ticket:true}));assert.equal(h.bag.m.dungeon_ticket,1);assert.equal(h.coins,0);
 rpgDungeon(g,0,{op:'enter',id:d.id,ticket:true});assert.equal(h.bag.m.dungeon_ticket,1);assert(MAPS[h.map].dungeon);
});

function major(id='dragon'){
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id});
 for(let i=0;i<3;i++){rpgWorldBoss(g,i,{op:'enter'});g.heroes[i].lv=400;g.heroes[i].inv=999;}
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);a.seq=2;a.cd=0;advance(g,.02);
 advance(g,1.7);assert(worldBossCoopOpen(a));return {g,a,m};
}
test('만렙 세 명의 실제 무기 스킬을 맞추면 패턴을 취소하고 4초 기절한다',()=>{
 const {g,a,m}=major();g.heroes.filter(Boolean).forEach(h=>{h.x=m.x-100;h.y=m.y;h.look=[1,0];});
 rpgWeaponSkill(g,0);rpgWeaponSkill(g,1);advance(g,.04);assert(!a.stun);assert.equal(a.attack.coop.length,2);
 rpgWeaponSkill(g,2);advance(g,.04);assert(a.stun>3.9);assert.equal(a.attack,null);assert(g.out.some(f=>f.kind==='sk_raid_break'));
 const hits=g.out.filter(f=>f.kind==='sk_raid_hit').length;advance(g,3.5);assert.equal(g.out.filter(f=>f.kind==='sk_raid_hit').length,hits);assert(a.stun>0);
});
test('한 사람의 다단 공격·평타·지속 피해·만렙 미만은 합동 인원을 채우지 않는다',()=>{
 const {g,a,m}=major();for(let i=0;i<20;i++)worldBossHit(g,m,g.heroes[0],10);
 assert.equal(a.attack.coop.length,1);worldBossHit(g,m,g.heroes[1],10,{direct:false});assert.equal(a.attack.coop.length,1);
 g.heroes[1].lv=399;worldBossHit(g,m,g.heroes[1],10);assert.equal(a.attack.coop.length,1);
 worldBossHit(g,m,g.heroes[2],10);assert.equal(a.attack.coop.length,2);assert(!a.stun);
});
test('만렙 세 명이 자동 평타를 유지해도 합동 차단이 저절로 발동하지 않는다',()=>{
 const {g,a,m}=major();g.heroes.filter(Boolean).forEach(h=>{h.x=m.x-100;h.y=m.y;h.auto=1;h.cd=0;});
 advance(g,.4);assert(!a.stun);assert.equal(a.attack.coop.length,0);assert(a.contrib.length>0);
});
test('너무 이른 타격과 0.85초 넘게 어긋난 타격은 차단에 실패한다',()=>{
 const {g,a,m}=major();a.attack.t=2;for(const h of g.heroes.filter(Boolean))worldBossHit(g,m,h,10);assert.equal(a.attack.coop.length,0);
 a.attack.t=1.5;worldBossHit(g,m,g.heroes[0],10);advance(g,.9);worldBossHit(g,m,g.heroes[1],10);worldBossHit(g,m,g.heroes[2],10);assert(!a.stun);assert.equal(a.attack.coop.length,2);
 worldBossHit(g,m,g.heroes[0],10);assert.equal(a.stun,C.coop.stun);assert.equal(a.attack,null);
});
test('모든 보스의 합동 차단과 기절은 방장 승계 후에도 유지된다',()=>{
 for(const B of WORLD_BOSSES){const {g,a,m}=major(B.id);g.heroes.filter(Boolean).forEach(h=>worldBossHit(g,m,h,10));assert(a.stun>0);
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(guest);
 assert.equal(guest.wb.active.stun,4);assert.equal(guest.wb.active.attack,null);advance(guest,.5);assert(guest.wb.active.stun<4&&guest.wb.active.stun>3.4);assert(!guest.out.some(f=>f.kind==='sk_raid_hit'));
 }
});
test('뇌조만 새 무기 셋을 독립 추첨하고 없는 방어구 세트를 지급하지 않는다',()=>{
 const expected=['storm_staff','violet_bow','azure_dual'];
 const all=rollWorldBossReward('thunderbird',()=>0);
 assert.deepEqual(all.items.filter(x=>x.k==='weapon').map(x=>x.id),expected);
 assert(!all.items.some(x=>x.k==='armor'));
 for(const id of ['dragon','serpent','machine'])assert(!rollWorldBossReward(id,()=>0).items.some(x=>expected.includes(x.id)));
 const none=rollWorldBossReward('thunderbird',()=>.02);assert(!none.items.some(x=>x.k==='weapon'));
 let draws=0;
 const single=rollWorldBossReward('thunderbird',()=>[0,.019,.02,.5][draws++]??1-Number.EPSILON);
 assert.deepEqual(single.items.filter(x=>x.k==='weapon').map(x=>x.id),['storm_staff']);
});
test('뇌조 무기는 가방이 가득 차도 재접속·승계 뒤 수령할 수 있다',()=>{
 const g=setup(),h=g.heroes[0],ids=['storm_staff','violet_bow','azure_dual'];
 h.bag.w=Array.from({length:30},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:1}));h.bag.n=31;
 h.bag.wbMail=ids.map(id=>({k:'weapon',id,n:1}));
 assert.equal(collectWorldBossMail(h),0);
 h.bag=cleanBag(JSON.parse(JSON.stringify(h.bag)));assert.equal(h.bag.wbMail.length,3);
 h.bag.w.splice(0,3);assert.equal(collectWorldBossMail(h),3);assert.equal(h.bag.wbMail.length,0);
 assert.deepEqual(h.bag.w.slice(-3).map(w=>w.sp),ids);
 assert(h.bag.w.slice(-3).every(w=>w.g===4&&w.r>=0));
 rpgWorldBoss(g,0,{op:'summon',id:'thunderbird'});rpgWorldBoss(g,0,{op:'enter'});
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);worldBossHit(g,m,h,200);m.hp-=200;
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(guest);
 assert.equal(guest.wb.active.id,'thunderbird');assert.equal(guest.mobs.find(m=>m.id===a.mob).type,'world_thunderbird');
 assert.deepEqual(guest.heroes[0].bag.w.slice(-3).map(w=>w.sp),ids);
});
test('뇌조 실제 토벌은 기여자에게 전용 무기 셋을 한 번만 지급한다',()=>{
 const g=setup(),h=g.heroes[0];rpgWorldBoss(g,0,{op:'summon',id:'thunderbird'});
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob),rng=Math.random;
 worldBossHit(g,m,h,m.hp);
 try{Math.random=()=>0;worldBossKilled(E,g,m);}finally{Math.random=rng;}
 assert.equal(a.phase,'clear');assert.equal(h.bag.wbDone.filter(k=>k===a.key).length,1);
 const weapons=h.bag.w.filter(w=>['storm_staff','violet_bow','azure_dual'].includes(w.sp));
 assert.equal(weapons.length,3);const before=h.bag.w.length;
 worldBossKilled(E,g,m);assert.equal(h.bag.w.length,before);
 assert.equal(cleanBag(JSON.parse(JSON.stringify(h.bag))).w.filter(w=>weapons.some(q=>q.sp===w.sp)).length,3);
});
test('기절 차단에 실패하면 큰 기술이 여러 단계로 터지고 공격력이 증가했다',()=>{
 const {g,a}=major('machine'),h=g.heroes[0];h.inv=0;const s=a.attack.areas[0];h.x=s.x+100;h.y=s.y;const before=h.hp;
 advance(g,a.attack.t+.02);assert(h.hp<before*.6);assert.equal(a.attack.step,1);assert(a.attack.major);assert(!a.stun);
});
test('이전 버전 보스도 남은 체력과 기여 비율을 보존해 새 체력으로 바꾼다',()=>{
 const g=setup();rpgWorldBoss(g,0,{op:'summon',id:'dragon'});const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);
 a.balance=3;m.max=a.max=1150000000;m.hp=a.hp=575000000;a.contrib=[{name:'토벌0',damage:575000000}];advance(g,.02);
 assert.equal(m.max,11500000);assert.equal(m.hp,5750000);assert.equal(a.contrib[0].damage,5750000);
});
test('광장 포탈 근처에서만 소환·입장하고 포탈은 대화 대상이다',()=>{
 const g=setup(),h=g.heroes[0];h.x=900;h.y=820;assert(!rpgWorldBoss(g,0,{op:'summon',id:'dragon'}));
 h.x=C.portal.x;h.y=C.portal.y+70;assert(npcNear(h).worldBoss);assert(rpgWorldBoss(g,0,{op:'summon',id:'dragon'}));
 h.x=900;h.y=820;assert(!rpgWorldBoss(g,0,{op:'enter'}));h.x=C.portal.x;h.y=C.portal.y+70;assert(rpgWorldBoss(g,0,{op:'enter'}));
});
