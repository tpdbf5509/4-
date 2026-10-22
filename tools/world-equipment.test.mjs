/* 판정·저장·스냅샷을 실제 게임 함수로 검증한다. node --test tools/world-equipment.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill, rpgPack, rpgApply, rpgPromote } from '../src/game/rpg.js';
import { WORLD_WEAPONS, WORLD_SETS, WORLD_WEAPON_SKILLS, worldArtCell, worldArt } from '../src/game/worldEquipmentData.js';
import { cleanBag, specialsFor, whySpecialBuy, specialTier, rpgShop } from '../src/game/shop.js';
import { armorAtkMul, worldSetCount, worldCritBonus, worldDotMul, worldCooldownMul, worldArmorOnHit, worldArmorTick, worldArmorAbsorb, packArmor, applyArmor } from '../src/game/armor.js';
import { RESET, GIFT } from '../src/game/itemData.js';
const seats = WORLD_WEAPONS.slice(0,2).map((_,i)=>({id:`test${i}`,name:`장비시험${i}`,hero:{name:`장비시험${i}`,job:'warrior',elem:'frost',gender:'m'}}));
function setup(id='dragon_dual', set=null){
  const sp=WORLD_WEAPONS.find(w=>w.id===id),g=makeWorld();
  const ss=structuredClone(seats);ss[0].hero.job=sp.t==='staff'?'mage':sp.t==='bow'?'archer':'warrior';
  rpgSyncSeats(g,ss);
  for(let i=0;i<2;i++)rpgJoin(g,i,{name:ss[i].name,rs:RESET.id,gift:GIFT.id,lv:100,ts:0,coins:1000000,stats:{str:100,int:100,hp:100},bag:{oc:1,w:i===0?[{u:1,t:sp.t,r:specialTier(sp),g:4,p:100,sp:id}]:[],e:i===0?1:0,n:10}},ss[i].id);
  const h=g.heroes[0];h.map='train';h.x=900;h.y=700;h.auto=0;h.look=[1,0];h.dir=1;
  g.heroes[1].auto=0;
  if(set)wear(h,set);
  rpgStep(g,.01);
  return {g,h,ss};
}
function wear(h,set,slots=['head','body','legs','feet']){
  h.bag.a=slots.map((s,i)=>({u:10+i,s,g:3,set}));h.bag.ae=Object.fromEntries(h.bag.a.map(a=>[a.s,a.u]));
}
function advance(g,t){for(let n=0;n<Math.ceil(t/.02);n++)rpgStep(g,.02);}
for(const sp of WORLD_WEAPONS)test(`${sp.name}: 스킬 피해와 완료`,()=>{
  const {g,h}=setup(sp.id);
  rpgWeaponSkill(g,0);assert.equal(h.ws.wcd,WORLD_WEAPON_SKILLS[sp.id].skill.cd);
  advance(g,7);
  assert(h.trn?.tot > 0, `${sp.id}가 실제 허수아비 피해 기록에 남아야 함`);
  if (sp.id === 'dragon_dual' || sp.id === 'dragon_bow') assert(h.x > 900, '전진 이동이 실제로 발생해야 함');
  assert.equal(h.ws.world.cast,null);assert(Number.isFinite(h.hp));
});
test('장비 시트 21칸·저장·상점 제외·장착',()=>{
 const {h}=setup();
 for(const set of WORLD_SETS)wear(h,set.id);
 h.bag.a=WORLD_SETS.flatMap((set,r)=>['head','body','legs','feet'].map((s,i)=>({u:20+r*4+i,s,g:3,set:set.id})));
 h.bag.w=WORLD_WEAPONS.map((w,i)=>({u:i+1,t:w.t,r:specialTier(w),g:w.g,sp:w.id,up:12,p:100}));
 const restored=cleanBag(JSON.parse(JSON.stringify(h.bag)));
 assert.equal(restored.a.length,12);assert.equal(restored.w.length,9);assert.equal(restored.a.filter(a=>a.set==='serpent').length,4);
 assert(restored.w.every(w=>w.up===12));assert(specialsFor(400).every(w=>!w.world));
 const cells=new Set(WORLD_WEAPONS.map(w=>worldArtCell(worldArt(w.id))));
 for(const set of WORLD_SETS)for(const s of ['head','body','legs','feet'])cells.add(worldArtCell(worldArt(`${set.id}:${s}`)));
 assert.equal(cells.size,21);assert(!cells.has(null));
 for(const sp of WORLD_WEAPONS)assert(whySpecialBuy(h,sp.id).includes('월드보스 전용 장비입니다'));
});
test('세트는 부위별로 계산·혼합 가능·효과 회수',()=>{
 const {h}=setup();wear(h,'dragon',['head','body']);
 assert.equal(worldCritBonus(h),.15);assert.equal(worldSetCount(h,'dragon'),2);
 h.bag.a.push({u:12,s:'legs',g:3,set:'machine'},{u:13,s:'feet',g:3,set:'machine'});h.bag.ae.legs=12;h.bag.ae.feet=13;
 assert.equal(worldCooldownMul(h),.9);
 wear(h,'dragon');const atk=armorAtkMul(h);worldArmorOnHit(h,{weapon:true});assert(armorAtkMul(h)>atk);
 const arm=packArmor(h),other={...h,arm:null};applyArmor(other,JSON.parse(JSON.stringify(arm)));assert.equal(other.arm.sets.rage,5);
 h.bag.ae={};worldArmorTick(h,.01);assert.equal(h.arm.sets.rage,0);assert.equal(worldCritBonus(h),0);
 wear(h,'serpent');assert.equal(worldDotMul(h),1.2);
 for(let n=0;n<8;n++)worldArmorOnHit(h,{dot:true});assert.equal(h.arm.sets.shield,h.max*.12);
 const absorbed=worldArmorAbsorb(h,100);assert(absorbed<100);worldArmorTick(h,6);assert.equal(worldArmorAbsorb(h,100),100);
 wear(h,'machine');for(let n=0;n<5;n++){worldArmorOnHit(h,{basic:true});worldArmorTick(h,.31);}
 assert.equal(h.arm.sets.charge,5);assert.equal(worldArmorOnHit(h,{weapon:true}),true);assert.equal(h.arm.sets.charge,0);
});
test('세계 스킬 스냅샷·방장 승계 후 이어짐·장비 교체 취소',()=>{
 const {g,h,ss}=setup('dragon_staff');rpgWeaponSkill(g,0);advance(g,.7);
 const s=JSON.parse(JSON.stringify(rpgPack(g))),guest=makeWorld();rpgSyncSeats(guest,ss);rpgApply(guest,s);
 assert(guest.heroes[0].ws.world.cast);const index=guest.heroes[0].ws.world.cast.index;
 rpgPromote(guest);guest.heroes[0].loaded=1;guest.heroes[0].auto=0;guest.heroes[1].auto=0;
 advance(guest,.4);assert(!guest.heroes[0].ws.world.cast || guest.heroes[0].ws.world.cast.index>index);
 h.bag.e=0;advance(g,.02);assert.equal(h.ws.world,null);
});
test('광장에서는 발동 불가·수량 부족 관리자 지급은 전체 거절',()=>{
 const {g,h}=setup();h.map='plaza';rpgWeaponSkill(g,0);assert(!h.ws?.world);
 h.admin=1;h.bag.w=Array.from({length:29},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:1}));const n=h.bag.a.length;
 rpgShop(g,0,{op:'wbgive',set:'dragon'});assert.equal(h.bag.w.length,29);assert.equal(h.bag.a.length,n);
 h.bag.w=[];rpgShop(g,0,{op:'wbgive',set:'dragon'});assert.equal(h.bag.w.length,3);assert.equal(h.bag.a.length,4);
 h.admin=0;rpgShop(g,0,{op:'wbgive',set:'machine'});assert.equal(h.bag.w.length,3);
});
test('비룡육연사: 화살 30발·마지막 비룡 1회',()=>{
 const {g}=setup('dragon_bow');g.out=[];rpgWeaponSkill(g,0);advance(g,2);
 assert.equal(g.out.filter(f=>f.kind==='sk_pierce').length,30);
 assert.equal(g.out.filter(f=>f.kind==='sk_wb_beast'&&f.dragon).length,1);
});
test('다단 스킬이 결투 피해 상한을 공유한다',()=>{
 const {g,h}=setup('dragon_bow'),o=g.heroes[1];
 h.map=o.map='field';h.x=600;h.y=600;o.x=690;o.y=600;h.pvpOn=o.pvpOn=1;h.pty=o.pty=0;
 h.bag.w[0].up=30;g.mobs=[];h.calm=o.calm=-100;h.auto=o.auto=0;o.inv=0;
 const before=o.hp;rpgWeaponSkill(g,0);advance(g,2);
 assert(o.hp<before);assert(before-o.hp <= o.max*.12+1,`누적 피해 ${before-o.hp}는 최대 체력 12% 이하여야 함`);
});
