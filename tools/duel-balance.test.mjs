/* 실제 결투·입력·시간 판정으로 시전별 상한과 회복·보호막을 검증한다. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgDuel,rpgFire,rpgSkill,rpgUseSkill,rpgWeaponSkill,rpgAdv,rpgPack,rpgApply,rpgPromote,physMul,magMul,JOBS,FIELD_PVP,RPG,DUEL} from '../src/game/rpg.js';
import {rpgShop,specialTier,POTION_BY_ID} from '../src/game/shop.js';
import {SPECIALS} from '../src/game/shopData.js';
import {WEAPON_SKILLS} from '../src/game/skillData.js';
import {armorTakeMul} from '../src/game/armor.js';
import {asOf} from '../src/game/advance.js';
import {DUEL_TEAM} from '../src/game/duel.js';
import {RESET,GIFT} from '../src/game/itemData.js';

const near=(a,b,epsilon=1e-6)=>assert(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const run=(g,t)=>{for(let n=0;n<Math.round(t/.01);n++)rpgStep(g,.01);};
function setup({job='warrior',size=1,field=false,high=true}={}){
 const g=makeWorld();g.out=[];
 const seats=Array.from({length:size*2},(_,i)=>({id:`duel-${i}`,name:`밸런스${i}`,hero:{name:`밸런스${i}`,job:i===0?job:'mage',elem:'frost',gender:'m'}}));
 rpgSyncSeats(g,seats);
 seats.forEach((s,i)=>rpgJoin(g,i,{name:s.name,rs:RESET.id,gift:GIFT.id,lv:400,ts:0,stats:{str:100,int:100,hp:200},bag:{oc:1,w:[],n:1,p:{heal_s:20},s:{burst:1,pierce:1,j_volley:1,j_orb:1,j_cleave:1,j_shield:1},ks:{job:job==='archer'?'j_volley':job==='mage'?'j_orb':'j_cleave',g:['burst','pierce']}}},s.id));
 g.mobs=[];
 const h=g.heroes[0],o=g.heroes[size];
 g.heroes.filter(Boolean).forEach((q,i)=>{q.auto=0;q.inv=0;q.fire=0;q.pty=size===2?(i<size?1:2):0;});
 if(!field){assert(rpgDuel(g,0,{op:'ask',to:size,size}));assert(rpgDuel(g,size,{op:'accept'}));run(g,DUEL.ready+(size===2?DUEL_TEAM.rollT:0)+.02);}
 g.heroes.filter(Boolean).forEach((q,i)=>{q.map=field?'wolf':'arena';q.x=1000+(i>=size?40:-100*i);q.y=900;q.inv=0;q.calm=0;q.pvpOn=1;});
 if(high){h.buff=100;h.buffAmt=100000;}
 return {g,h,o};
}
function equip(h,id){const s=SPECIALS.find(s=>s.id===id);assert(s,id);h.bag.w=[{u:1,t:s.t,r:specialTier(s),g:4,p:1,sp:id}];h.bag.e=1;}
function basic(g,h){h.cd=0;rpgFire(g,h.pi,true);rpgStep(g,.01);rpgFire(g,h.pi,false);}

test('1대1·2대2 평타는 방어 전 최대 체력 4%이고 약한 평타는 그대로다',()=>{
 for(const size of [1,2]){
  const {g,h,o}=setup({size});const hp=o.hp;basic(g,h);near(hp-o.hp,o.max*.04);
  h.buff=0;const expected=JOBS[0].dmg*physMul(h)*.03,before=o.hp;basic(g,h);near(before-o.hp,expected);
 }
});
test('궁극기는 최대 체력 25%, 일반·직업·전직 스킬은 18%다',()=>{
 for(const kind of ['ult','general','job','adv']){
  const {g,h,o}=setup();const hp=o.hp;
  if(kind==='ult')rpgSkill(g,0);
  if(kind==='general')rpgUseSkill(g,0,'burst');
  if(kind==='job')rpgUseSkill(g,0,'j_cleave');
  if(kind==='adv'){h.advClass='gladiator';rpgAdv(g,0,{op:'use'});run(g,1.1);}
  near(hp-o.hp,o.max*(kind==='ult'?.25:.18));
 }
});
test('마법사 최대 체력 추가 피해도 결투 배율을 곱한 뒤 약한 피해 그대로 적용한다',()=>{
 const {g,h,o}=setup({job:'mage',high:false});const hp=o.hp;
 const raw=44*magMul(h)*2.8,bonus=Math.min(o.max*.01,raw*.25);
 rpgSkill(g,0);near(hp-o.hp,(raw+bonus)*.03);
});
test('2대2 다단히트 무기 스킬은 각 대상에게 합계 18%까지만 적용한다',()=>{
 const {g,h,o}=setup({size:2});equip(h,'flame');const other=g.heroes[3];other.x=o.x;const hp=[o.hp,other.hp];
 rpgWeaponSkill(g,0);run(g,1.1);
 near(hp[0]-o.hp,o.max*.18);near(hp[1]-other.hp,other.max*.18);
});
test('연사의 지연 발사·착탄은 다음 궁극기의 누적값을 사용하지 않는다',()=>{
 const {g,h,o}=setup({job:'archer'});const hp=o.hp;
 rpgUseSkill(g,0,'j_volley');const volley=h.cast;
 rpgSkill(g,0);const ult=h.cast;assert.notEqual(volley,ult);
 run(g,1);near(hp-o.hp,o.max*(.18+.25));assert.equal(h.cast,ult);
});
test('동일 스킬 재시전도 각각 상한을 갖고 이전 지연 타격이 새 시전을 소모하지 않는다',()=>{
 const {g,h,o}=setup({job:'archer'});const hp=o.hp;
 rpgUseSkill(g,0,'j_volley');const first=h.cast;run(g,.23);
 h.scd.j_volley=0;rpgUseSkill(g,0,'j_volley');const second=h.cast;assert.notEqual(first,second);
 run(g,1);near(hp-o.hp,o.max*.36);assert.equal(h.cast,second);
});
test('원소 구체가 늦게 맞아도 궁극기의 상한과 섞이지 않는다',()=>{
 const {g,o}=setup({job:'mage'});const hp=o.hp;rpgUseSkill(g,0,'j_orb');rpgSkill(g,0);run(g,.5);
 near(hp-o.hp,o.max*.43);
});
test('빙판 장판 지속 피해는 전체 18%이고 다른 스킬과 누적값을 나누지 않는다',()=>{
 const {g,h,o}=setup();equip(h,'frost');const hp=o.hp;
 rpgWeaponSkill(g,0);rpgSkill(g,0);run(g,4.1);near(hp-o.hp,o.max*.43);
});
test('움직이는 무기 투사체도 원래 시전의 18%를 사용한다',()=>{
 const {g,h,o}=setup({job:'mage'});equip(h,'galaxy_staff');h.look=[1,0];h.dir=1;const hp=o.hp;
 rpgWeaponSkill(g,0);rpgSkill(g,0);run(g,2);near(hp-o.hp,o.max*.43);
});
test('방어구·방어기는 상한 다음에 적용하며 보호막 흡수에 60%를 다시 곱하지 않는다',()=>{
 const {g,o}=setup();o.bag.a=[{u:10,s:'body',g:0}];o.bag.ae.body=10;o.guard=10;o.jb={iron:0,sh:100,shT:10};
 const hp=o.hp,expected=o.max*.25*armorTakeMul(o)*.5;
 rpgSkill(g,0);near(hp-o.hp,Math.max(0,expected-100));near(o.jb.sh,Math.max(0,100-expected));
});
test('대쉬 회피와 기사 무효화 방어막·철벽은 유지한다',()=>{
 const {g,o}=setup();let hp=o.hp;o.inv=1;rpgSkill(g,0);near(o.hp,hp);
 o.inv=0;g.heroes[0].sk=0;o.job='warrior';o.advClass='knight';rpgAdv(g,1,{op:'use'});o.as.nul=1;
 rpgSkill(g,0);near(o.hp,hp);assert.equal(o.as.nul,0);
 g.heroes[0].sk=0;rpgSkill(g,0);assert(hp-o.hp>0&&hp-o.hp<o.max*.25);
});
test('결투용 소형 물약은 기존 회복의 50%를 한 번만 적용한다',()=>{
 for(const size of [1,2]){const {g,h}=setup({size});h.hp=1;rpgShop(g,0,{op:'puse',id:'heal_s'});near(h.hp-1,h.max*POTION_BY_ID.heal_s.pct*.5);assert.equal(h.duelPotions,4);assert.equal(h.bag.p.heal_s,20);}
});
test('엘프 초당 1.2% 회복은 결투에서 0.6%이고 사냥터는 1.2%다',()=>{
 for(const field of [false,true]){const {g,h}=setup({job:'archer',field});h.advClass='elf';h.hp=h.max/2;h.calm=0;const hp=h.hp;run(g,1);near(h.hp-hp,h.max*(field?.012:.006));}
});
test('치유사의 즉시·지속 회복은 각각 기존의 50%이며 마법진도 한 번만 반영한다',()=>{
 const {g,h,o}=setup({job:'mage',size:2});h.advClass='healer';h.bag.ks.job='j_shield';const ally=g.heroes[1];ally.x=h.x;ally.hp=1;o.hp=1;
 rpgUseSkill(g,0,'j_shield');rpgAdv(g,0,{op:'use'});near(ally.hp-1,ally.max*.2*1.2*.5);near(o.hp,1);
 const hp=ally.hp;run(g,2.01);near(ally.hp-hp,ally.max*.02*1.2*.5);
});
test('성역 보호막은 생성량·축적 상한만 60%이고 흡수량은 그대로다',()=>{
 const {g,h,o}=setup({job:'mage'});equip(h,'holy_staff');const P=WEAPON_SKILLS.holy_staff.passive;
 basic(g,h);run(g,.25);near(h.jb.sh,h.max*P.per*.6);
 for(let n=0;n<30;n++){o.hp=o.max;basic(g,h);run(g,.25);h.calm=0;}
 near(h.jb.sh,h.max*P.cap*.6);
});
test('긴급 보호막 생성은 60%이고 사냥터 PvP는 기존 100%다',()=>{
 for(const field of [false,true]){
  const {g,h,o}=setup({field});o.advClass='healer';o.advM=300;o.hp=o.max*.29;
  h.buff=0;rpgSkill(g,0);assert(o.hp>0);near(o.jb.sh,Math.round(o.max*.15*(field?1:.6)));
 }
});
test('피해 없이 7초 후 초당 1% 자동 회복하며 피격 시 7초를 다시 센다',()=>{
 const {g,h,o}=setup();o.hp=o.max*.5;o.calm=0;const hp=o.hp;
 run(g,6.99);near(o.hp,hp);run(g,1.01);near(o.hp-hp,o.max*.01);
 h.buff=0;rpgSkill(g,0);const after=o.hp;run(g,6.99);near(o.hp,after);run(g,1.01);near(o.hp-after,o.max*.01);
});
test('사냥터 PvP는 평타 3%·스킬 12% 완만한 상한·배율 0.3을 유지한다',()=>{
 const {g,h,o}=setup({field:true});let hp=o.hp;basic(g,h);near(hp-o.hp,o.max*.03);
 hp=o.hp;rpgSkill(g,0);assert(hp-o.hp>o.max*.119&&hp-o.hp<=o.max*.12);
 h.buff=0;hp=o.hp;basic(g,h);near(hp-o.hp,Math.min(34*physMul(h)*.3,o.max*.03));
 assert.deepEqual([FIELD_PVP.dmgMul,FIELD_PVP.basicPct,FIELD_PVP.skillPct,FIELD_PVP.skillSoft],[.3,.03,.12,1.7]);
});
test('PvE 평타·물약·보호막·자동 회복은 기존 수치를 유지한다',()=>{
 const {g,h}=setup({field:true,high:false});h.pvpOn=0;h.map='train';run(g,.01);
 const m=g.mobs.find(m=>m.type==='dummy');m.x=h.x+30;m.y=h.y;const hp=m.hp;
 const random=Math.random;Math.random=()=>.99;
 try{basic(g,h);}finally{Math.random=random;}
 near(hp-m.hp,Math.round(34*physMul(h)));
 h.map='wolf';g.mobs=[];h.hp=1;rpgShop(g,0,{op:'puse',id:'heal_s'});assert(h.hp-1>=h.max*POTION_BY_ID.heal_s.pct);
 h.job='mage';equip(h,'holy_staff');h.map='train';run(g,.01);const target=g.mobs.find(m=>m.type==='dummy');target.x=h.x+30;target.y=h.y;
 basic(g,h);run(g,.25);near(h.jb.sh,h.max*WEAPON_SKILLS.holy_staff.passive.per);
 h.map='wolf';g.mobs=[];h.hp=h.max/2;h.calm=RPG.calm;const before=h.hp;run(g,1);near(h.hp-before,h.max*RPG.calmRegen);
});

test('총사 지연 추가 탄환은 원래 평타와 4%를 나눠 쓰며 다음 궁극기와 섞이지 않는다',()=>{
 const {g,h,o}=setup({job:'archer'});h.advClass='gunner';h.advM=4500;
 h.bag.w=[{u:1,t:'gun',r:1,g:0,p:1}];h.bag.e=1;
 const a=asOf(h);a.mvT=3;a.mvN=1;const hp=o.hp;
 basic(g,h);rpgSkill(g,0);run(g,.4);near(hp-o.hp,o.max*.29);
});
test('소환술사 거대 정령의 결투 금지는 유지하며 일반 전직 정령은 시전 전체 18%다',()=>{
 for(const ult of [false,true]){
  const {g,h,o}=setup({job:'mage'});h.advClass='summoner';const hp=o.hp;
  rpgAdv(g,0,{op:ult?'ult':'use'});run(g,6);near(hp-o.hp,ult?0:o.max*.18);if(ult)assert(!h.as?.gi);
 }
});
test('암살자 처형은 직업 스킬 적중 뒤 20% 조건을 유지하며 일반 스킬에는 붙지 않는다',()=>{
 for(const jobSkill of [false,true]){
  const {g,h,o}=setup();h.advClass='assassin';o.hp=o.max*.25;
  rpgUseSkill(g,0,jobSkill?'j_cleave':'burst');
  if(jobSkill){assert.equal(o.hp,0);assert(o.down>0);}else{assert(o.hp>0);assert.equal(o.down,0);}
 }
});
test('무기 연계의 시전별 상한은 스냅샷 승계 뒤에도 남는다',()=>{
 const {g,h,o}=setup({job:'archer'});equip(h,'lava_bow');h.look=[1,0];const hp=o.hp;
 rpgWeaponSkill(g,0);run(g,.1);near(hp-o.hp,o.max*.18);assert.equal(h.ws.cmb.st,2);
 const copy=makeWorld();rpgApply(copy,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(copy);
 const c=copy.heroes[0],target=copy.heroes[1];c.loaded=1;target.loaded=1;c.buff=100;c.buffAmt=100000;
 const before=target.hp;rpgWeaponSkill(copy,0);run(copy,.1);near(target.hp,before);
});
