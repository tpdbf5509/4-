import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,rpgPromote,rpgDuel,rpgSkill,rpgUseSkill,rpgAdv,rpgDungeon,rpgWorldBoss,rpgRequest,rpgHold,statEarned,huntingXp,physMul,MAPS,DUEL} from '../src/game/rpg.js';
import {rpgShop,whyPotionUse,cleanBag} from '../src/game/shop.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {DUNGEONS,DUNGEON} from '../src/game/dungeonData.js';
import {WORLD_BOSS} from '../src/game/worldBossData.js';
import {armorTakeMul} from '../src/game/armor.js';
import {COMBAT_RULES,refreshPowerCircles,empowerHealing} from '../src/game/combatRules.js';
import {REQUESTS,REQ_BY_NPC} from '../src/game/requestData.js';
import {JOB_TUNE} from '../src/game/jobTuneData.js';
const run=(g,t)=>{for(let n=0;n<Math.ceil(t/.02);n++)rpgStep(g,.02);};
function setup(count=4){
 const g=makeWorld();g.mySeat=0;g.out=[];g.wb.lastHour=Math.floor(g.wb.clock/WORLD_BOSS.period);
 const jobs=['warrior','mage','warrior','mage'];
 const seats=Array.from({length:count},(_,i)=>({id:'c'+i,name:'전투'+i,hero:{name:'전투'+i,job:jobs[i],gender:'m',elem:'frost'}}));
 rpgSyncSeats(g,seats);for(let i=0;i<count;i++)rpgJoin(g,i,{name:seats[i].name,rs:RESET.id,gift:GIFT.id,lv:400,ts:0,coins:1000000,
  stats:{str:100,int:100,hp:200},bag:{oc:1,w:[],n:1,p:{heal_s:20,heal_l:20},s:{j_shield:1,aid:1,pierce:1},ks:{job:'j_shield',g:['aid','pierce']}}},'c'+i);
 g.heroes.filter(Boolean).forEach(h=>{h.auto=0;h.inv=0;});return {g,seats,h:g.heroes[0]};
}
function duel(){const f=setup();f.g.heroes.forEach((h,i)=>{if(h)h.pty=i<2?1:2;});
 assert(rpgDuel(f.g,0,{op:'ask',to:2,size:2}));assert(rpgDuel(f.g,2,{op:'accept'}));run(f.g,3.1);return f;}
test('2대2는 서로 다른 2인 파티가 수락해야 시작하고 혼자 쓰러져도 계속한다',()=>{
 const {g}=duel();assert.equal(g.duels[0].size,2);assert(g.heroes.filter(Boolean).every(h=>h.dph===2&&h.duelPotions===5));
 g.heroes[2].down=10;run(g,.02);assert.equal(g.duels[0].phase,'fight');
 g.heroes[3].down=10;run(g,.02);assert.equal(g.duels[0].phase,'end');assert(g.heroes[0].honor>0&&g.heroes[1].honor>0);
 run(g,3);assert(!g.duels.length);assert(g.heroes.filter(Boolean).every(h=>h.map==='plaza'&&h.duelPotions===0));
});
test('2대2 파티 변경·소유자 교체·인원 부족은 수락을 거절한다',()=>{
 const {g}=setup();g.heroes.forEach((h,i)=>{if(h)h.pty=i<2?1:2;});
 assert(rpgDuel(g,0,{op:'ask',to:2,size:2}));g.heroes[1].pty=0;
 assert.equal(rpgDuel(g,2,{op:'accept'}),false);assert.equal(g.duels.length,0);
});
test('팀원은 공격하지 않으며 범위 공격은 양쪽 적에게 각자 피해 한도를 적용한다',()=>{
 const {g}=duel(),[a,b,c,d]=g.heroes;for(const h of [a,b,c,d]){h.x=1000;h.y=900;h.inv=0;}
 d.max=c.max;d.hp=c.hp;const hp=[a,b,c,d].map(h=>h.hp);rpgSkill(g,0);
 assert.equal(b.hp,hp[1]);assert(c.hp<hp[2]&&d.hp<hp[3]);
 assert(Math.abs((hp[2]-c.hp)-(hp[3]-d.hp)*(1-JOB_TUNE.warrior.cut))<.01);   // c 는 검사 — 기본 방어력 3%
 assert(hp[2]-c.hp<=c.max*DUEL.skillPct);assert(hp[3]-d.hp<=d.max*DUEL.skillPct);
});
test('결투용 물약만 5번 사용하며 구매 물약·응급 처치를 차단하고 가방 수량은 유지한다',()=>{
 const {g,h}=duel();assert(whyPotionUse(h,'heal_l').length>0);assert(!whyPotionUse({...h,hp:1},'heal_s').length);
 const bag=structuredClone(h.bag.p);
 for(let n=0;n<5;n++){h.hp=1;rpgShop(g,0,{op:'puse',id:'heal_s'});assert.equal(h.duelPotions,4-n);}
 h.hp=1;rpgShop(g,0,{op:'puse',id:'heal_s'});assert.equal(h.hp,1);
 rpgUseSkill(g,0,'aid');assert.equal(h.hp,1);assert(!h.scd?.aid);
 assert.deepEqual(h.bag.p,bag);assert.deepEqual(cleanBag(structuredClone(h.bag)).p,bag);
});
test('2대2 스냅샷·승계는 팀·물약·귀환 위치를 보존한다',()=>{
 const {g,seats,h}=duel();h.hp=1;rpgShop(g,0,{op:'puse',id:'heal_s'});
 const copy=makeWorld();rpgSyncSeats(copy,seats);rpgApply(copy,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(copy);
 assert.equal(copy.duels[0].members.length,4);assert.equal(copy.heroes[0].duelPotions,4);assert.equal(copy.heroes[0].map,'arena');
 copy.heroes.forEach(h=>{if(h)h.loaded=1;});rpgDuel(copy,0,{op:'giveup'});run(copy,3);
 assert(copy.heroes.filter(Boolean).every(h=>h.map==='plaza'&&h.dvs===-1));
});
test('기사 Z는 40초 방어·20초 대기이며 결투 상대를 4초 도발한다',()=>{
 const {g,h}=duel();h.advClass='knight';const enemy=g.heroes[2];enemy.x=h.x+150;enemy.y=h.y;
 rpgAdv(g,0,{op:'use'});assert.equal(h.as.gT,40);assert.equal(h.as.cd,20);assert.equal(enemy.tauntBy,0);assert.equal(enemy.tauntT,4);
 const x=enemy.x;rpgHold(g,2,['right']);run(g,.2);assert(enemy.x<x);assert(enemy.tauntT<4);
 run(g,4);assert.equal(enemy.tauntT,0);assert(h.as.gT>30);
});
test('기사의 보스 도발도 스냅샷과 승계에 남는다',()=>{
 const {g,h,seats}=setup(1);h.advClass='knight';h.x=WORLD_BOSS.portal.x;h.y=WORLD_BOSS.portal.y;
 rpgWorldBoss(g,0,{op:'summon',id:'dragon'});rpgWorldBoss(g,0,{op:'enter'});
 const m=g.mobs.find(m=>m.id===g.wb.active.mob);h.x=m.x-100;h.y=m.y;rpgAdv(g,0,{op:'use'});assert.equal(m.taunt,4);
 const copy=makeWorld();rpgSyncSeats(copy,seats);rpgApply(copy,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(copy);
 const boss=copy.mobs.find(q=>q.id===m.id);assert.equal(boss.taunt,4);assert.equal(boss.tgt,0);
});
test('강화 마법진은 같은 팀의 범위 내 공격력·치유력만 20% 올리고 벗어나면 끝난다',()=>{
 const {g}=duel(),caster=g.heroes[1],ally=g.heroes[0],enemy=g.heroes[2];
 caster.x=ally.x=enemy.x=1000;caster.y=ally.y=enemy.y=900;
 const base=physMul(ally);rpgUseSkill(g,1,'j_shield');assert.equal(g.powerCircles.length,1);assert.equal(caster.scd.j_shield,25);
 assert(Math.abs(physMul(ally)/base-1.2)<1e-9);assert.equal(empowerHealing(ally),1.2);assert.equal(enemy.empower,0);
 ally.x+=COMBAT_RULES.circle.radius+1;refreshPowerCircles(g);assert.equal(ally.empower,0);assert.equal(empowerHealing(ally),1);
 run(g,20.1);assert.equal(g.powerCircles.length,0);
});
test('강화 마법진은 저장된 스킬 ID를 유지하고 스냅샷·승계에 남는다',()=>{
 const {g,seats}=setup(),h=g.heroes[1];h.map='train';rpgUseSkill(g,1,'j_shield');
 const copy=makeWorld();rpgSyncSeats(copy,seats);rpgApply(copy,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(copy);
 assert.equal(copy.powerCircles.length,1);assert(copy.heroes[1].bag.s.j_shield>0);
});
test('마법진 위 치유사의 실제 축복은 아군 치유량을 20% 늘리고 적은 치유하지 않는다',()=>{
 const {g}=duel(),healer=g.heroes[1],ally=g.heroes[0],enemy=g.heroes[2];healer.advClass='healer';
 for(const h of [healer,ally,enemy]){h.x=1000;h.y=900;}ally.hp=enemy.hp=1;
 rpgUseSkill(g,1,'j_shield');rpgAdv(g,1,{op:'use'});
 assert(Math.abs(ally.hp-1-ally.max*.2*1.2)<.001);assert.equal(enemy.hp,1);
});
test('급소 찌르기는 제자리에서 찌르고 멀리 있는 적에게 돌진하지 않는다',()=>{
 const {g,h}=setup(1);h.map='train';h.x=800;h.y=700;const x=h.x,y=h.y;
 rpgUseSkill(g,0,'pierce');run(g,.3);assert.equal(h.x,x);assert.equal(h.y,y);assert(!(h.dash>0));
});
test('400레벨 이후 레벨업 포인트는 3개이며 기존 누적 포인트도 같은 공식이다',()=>{
 assert.equal(statEarned(400)-statEarned(399),2);assert.equal(statEarned(401)-statEarned(400),3);
 assert.equal(statEarned(800),2000);
});
test('사냥터 최고 레벨을 넘을 때만 경험치를 1/100로 줄이고 던전은 제외한다',()=>{
 assert.equal(huntingXp({lv:100},{map:'wolf',xp:100}),1);
 const {g,h}=setup(1),m=g.mobs.find(m=>m.type==='wolf');assert(m);
 assert.equal(huntingXp({lv:1},m,100),100);assert.equal(huntingXp(h,m,100),1);
 assert.equal(huntingXp(h,{map:'train',xp:100}),100);
});
test('저레벨 의뢰는 받을 때부터 코인만 주며 같은 레벨 의뢰는 경험치·재료도 준다',()=>{
 for(const lv of [100,400]){const {g,h}=setup(1),q=REQUESTS.guard[4],npc=REQ_BY_NPC.guard;h.lv=lv;h.x=npc.x;h.y=npc.y;
 rpgRequest(g,0,{op:'take',npc:'guard',i:4});assert.equal(h.reqs.guard.coinOnly,lv>q.lv);
 h.reqs.guard.n=q.n;const coins=h.coins,xp=h.xp;rpgRequest(g,0,{op:'done',npc:'guard'});
 assert.equal(h.coins-coins,q.coin);if(lv===400){assert.equal(h.xp,xp);assert(!h.bag.m.blue);}else{assert(h.xp>xp);assert(h.bag.m.blue>0);}
 }
});
test('던전은 300레벨까지 기본 체력, 600레벨은 잡몹·보스 모두 2배며 승계에도 보존한다',()=>{
 const sample=lv=>{const {g,h,seats}=setup(1),d=DUNGEONS[0];h.lv=lv;h.x=DUNGEON.npc.x;h.y=DUNGEON.npc.y;rpgDungeon(g,0,{op:'enter',id:d.id});
 const r=g.runs[0];r.gap=0;const old=Math.random;try{Math.random=()=>.5;run(g,.02);}finally{Math.random=old;}
 const mob=g.mobs.find(m=>m.map===r.map);g.mobs=g.mobs.filter(m=>m.map!==r.map);r.wave=d.waves.length;r.gap=0;run(g,.02);
 const boss=g.mobs.find(m=>m.map===r.map&&m.boss);return {g,h,seats,r,mob,boss};};
 const a=sample(300),b=sample(600);assert.equal(a.r.hpScale,1);assert.equal(b.r.hpScale,2);assert(Math.abs(b.mob.max-a.mob.max*2)<2);assert.equal(b.boss.max,a.boss.max*2);
 const copy=makeWorld();rpgSyncSeats(copy,b.seats);rpgApply(copy,JSON.parse(JSON.stringify(rpgPack(b.g))));rpgPromote(copy);
 assert.equal(copy.runs[0].hpScale,2);assert.equal(copy.mobs.find(m=>m.boss&&m.map===b.r.map).max,b.boss.max);
});
test('보스 피해는 5% 증가하고 방어가 있으면 방어 적용 전부터 45% 줄어든다',()=>{
 for(const armored of [false,true]){const {g,h}=setup(1);h.x=WORLD_BOSS.portal.x;h.y=WORLD_BOSS.portal.y;
 if(armored){h.bag.a=[{u:11,s:'body',g:0}];h.bag.ae.body=11;}
 rpgWorldBoss(g,0,{op:'summon',id:'dragon'});rpgWorldBoss(g,0,{op:'enter'});const a=g.wb.active;a.cd=0;run(g,.02);
 const s=a.attack.areas[0];h.x=s.x+Math.cos(s.a)*100;h.y=s.y+Math.sin(s.a)*100*.78;h.inv=0;h.calm=0;
 const hp=h.hp,expected=h.max*.45*1.05*armorTakeMul(h)*(armored?.55:1)*(1-JOB_TUNE.warrior.cut);run(g,1.51);   // 검사 기본 방어력 3%
 assert(Math.abs(hp-h.hp-expected)<.01,`${armored}: ${hp-h.hp} != ${expected}`);
 }
});
test('뇌조 급강하 중 기사 반격으로 보스가 죽어도 판정이 안전하게 끝난다',()=>{
 const {g,h}=setup(1);h.advClass='knight';h.x=WORLD_BOSS.portal.x;h.y=WORLD_BOSS.portal.y;
 rpgWorldBoss(g,0,{op:'summon',id:'thunderbird'});rpgWorldBoss(g,0,{op:'enter'});
 const a=g.wb.active,m=g.mobs.find(m=>m.id===a.mob);h.x=m.x-400;h.y=m.y;m.hp=1;a.hp=1;
 rpgAdv(g,0,{op:'use'});h.as.nul=0;a.seq=1;a.cd=0;run(g,2.6);assert.equal(a.phase,'clear');
});
