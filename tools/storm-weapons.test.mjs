import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgWeaponSkill,rpgWeaponRelease,rpgPack,rpgApply,rpgPromote,RPG} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {rpgAdminCmd} from '../src/game/adminCmd.js';
import {STORM_WEAPONS,STORM_SKILLS} from '../src/game/stormWeaponData.js';
import {cleanBag,specialsFor,whySpecialBuy,specialTier,rpgShop} from '../src/game/shop.js';
import {RESET,GIFT} from '../src/game/itemData.js';
function setup(id='storm_staff'){
  const sp=STORM_WEAPONS.find(s=>s.id===id),g=makeWorld();g.out=[];
  const ss=[{id:'storm0',name:'시험',hero:{name:'시험',job:sp.t==='staff'?'mage':sp.t==='bow'?'archer':'warrior',elem:'frost',gender:'m'}},
    {id:'storm1',name:'상대',hero:{name:'상대',job:'warrior',elem:'frost',gender:'f'}}];
  rpgSyncSeats(g,ss);
  ss.forEach((s,i)=>rpgJoin(g,i,{name:s.name,rs:RESET.id,gift:GIFT.id,lv:100,ts:0,coins:100000,stats:{str:100,int:100,hp:100},
    bag:{oc:1,w:i?[]:[{u:1,t:sp.t,r:specialTier(sp),g:4,p:100,sp:id}],e:i?0:1,n:2}},s.id));
  const h=g.heroes[0];h.map='train';h.x=900;h.y=700;h.auto=0;h.look=[1,0];h.dir=1;g.heroes[1].auto=0;rpgStep(g,.01);
  const m=g.mobs.find(m=>m.map==='train'&&m.hp>0);h.x=m.x-65;h.y=m.y;
  return {g,h,ss,m};
}
const run=(g,t)=>{for(let n=0;n<Math.round(t/.01);n++)rpgStep(g,.01);};
test('세 무기는 관리자 명령으로 지급·장착·저장되고 상점에서는 제외된다',()=>{
  const {g,h}=setup();h.bag.w=[];h.bag.e=0;
  rpgAdminCmd(g,0,'/지급 나 뇌명 지팡이');assert.equal(h.bag.w.length,0,'일반 사용자의 관리자 명령은 거절');h.admin=1;
  for(const sp of STORM_WEAPONS){
    rpgAdminCmd(g,0,`/지급 나 ${sp.name}`);assert(h.bag.w.some(w=>w.sp===sp.id));
    const w=h.bag.w.find(w=>w.sp===sp.id);rpgShop(g,0,{op:'equip',u:w.u});assert.equal(h.bag.e,w.u);
    assert(!specialsFor(800).some(s=>s.id===sp.id));assert(whySpecialBuy(h,sp.id).some(s=>s.includes('뇌조 토벌')));
  }
  const b=cleanBag(JSON.parse(JSON.stringify(h.bag)),true);assert.equal(b.w.length,3);assert.deepEqual(b.w.map(w=>w.sp),STORM_WEAPONS.map(s=>s.id));
});
test('천뢰난무: 벼락 전에는 무피해, 연속 타격 후 잔상에는 무피해',()=>{
  const {g,h,m}=setup(),S=STORM_SKILLS.storm_staff.skill;h.x=m.x-30;h.y=m.y-40*RPG.squash;rpgWeaponSkill(g,0);run(g,.04);assert.equal(h.trn?.tot||0,0);
  run(g,.08);assert(h.trn.tot>0);const first=h.trn.tot;run(g,1.1);assert(h.trn.tot>first);
  const last=h.trn.tot;run(g,1.3);assert.equal(h.trn.tot,last);assert.equal(h.ws.storm,null);
  assert.equal(g.out.filter(f=>f.kind==='sk_storm_staff').length,1);assert(h.ws.wcd<S.cd);
});
test('자전 관통: 날아오기 전 무피해, 이동한 적은 피하고 관통 적은 각 한 번',()=>{
  const {g,h,m}=setup('violet_bow');h.x=m.x-400;const x=h.x;rpgWeaponSkill(g,0);run(g,.4);assert.equal(h.trn?.tot||0,0);
  run(g,.4);assert(h.trn.tot>0);const total=h.trn.tot;run(g,.6);assert.equal(h.trn.tot,total);assert.equal(h.x,x);
  const b=setup('violet_bow');b.h.x=b.m.x-400;rpgWeaponSkill(b.g,0);run(b.g,.3);b.m.y+=250;run(b.g,1.3);assert.equal(b.h.trn?.tot||0,0);
});
test('창뢰 비상참: 누르고 충전, 놓으면 실제 돌진, 경로 타격과 마무리 한 번',()=>{
  const {g,h}=setup('azure_dual'),S=STORM_SKILLS.azure_dual.skill;h.y=400;g.mobs=[];const x=h.x;
  rpgInput(g,{cls:0,kind:'wcharge',dir:true,q:1});h.hold=['right'];run(g,1.6);
  assert.equal(h.x,x);assert.equal(h.ws.storm.phase,'charge');
  rpgInput(g,{cls:0,kind:'wcharge',dir:false,q:2});run(g,.15);assert(h.x>x && h.x<x+S.distance);
  h.hold=[];run(g,.3);assert(Math.abs(h.x-x-S.distance)<.1);assert.equal(h.ws.storm.phase,'finish');
  assert.equal(g.out.filter(f=>f.kind==='sk_storm_finish').length,1);run(g,2);assert.equal(h.ws.storm,null);
});
test('쌍검: 짧게 눌러도 최소 충전 뒤 발동, 최대 4초에는 자동 발동',()=>{
  const a=setup('azure_dual');rpgWeaponSkill(a.g,0);rpgWeaponRelease(a.g,0);run(a.g,.2);assert.equal(a.h.ws.storm.phase,'charge');run(a.g,.15);assert.equal(a.h.ws.storm.phase,'dash');
  const b=setup('azure_dual');rpgWeaponSkill(b.g,0);run(b.g,4.1);assert.equal(b.h.ws.storm.phase,'dash');
});
test('충전 취소·맵 이동·사망·무기 교체는 진행을 중단한다',()=>{
  for(const mode of ['cancel','map','down','weapon','stun']){
    const {g,h}=setup('azure_dual');rpgWeaponSkill(g,0);run(g,.4);
    if(mode==='cancel')rpgWeaponRelease(g,0,true);
    else if(mode==='map')h.map='plaza';else if(mode==='down')h.down=3;else if(mode==='weapon')h.bag.e=0;else h.cc={stun:1};
    run(g,.03);assert.equal(h.ws.storm,null,mode);assert.equal(h.dash||0,0);
  }
  const {g,h}=setup('azure_dual');rpgWeaponSkill(g,0);run(g,.4);rpgWeaponRelease(g,0);run(g,.1);h.bag.e=0;run(g,.02);const x=h.x;run(g,.3);assert.equal(h.x,x);
});
test('광장·대기시간 중 사용 불가, 손님 입력 순서가 뒤집혀도 충전을 새로 시작하지 않는다',()=>{
  const {g,h}=setup('azure_dual');h.map='plaza';rpgWeaponSkill(g,0);assert(!h.ws?.storm);h.map='train';
  rpgInput(g,{cls:0,kind:'wcharge',dir:false,q:10});rpgInput(g,{cls:0,kind:'wcharge',dir:true,q:9});assert(!h.ws?.storm);
  rpgInput(g,{cls:0,kind:'wcharge',dir:true,q:11});const c=h.ws.storm;rpgWeaponSkill(g,0);assert.equal(h.ws.storm,c);
});
for(const id of ['storm_staff','violet_bow','azure_dual'])test(`${id}: 스냅샷·방장 승계 후 진행이 이어진다`,()=>{
  const {g,h,ss}=setup(id);rpgWeaponSkill(g,0);run(g,id==='azure_dual'?.45:.2);
  if(id==='azure_dual'){rpgWeaponRelease(g,0);run(g,.1);}
  const guest=makeWorld();rpgSyncSeats(guest,ss);rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));
  const copy=guest.heroes[0];assert.equal(copy.ws.storm.id,id);assert.notEqual(copy.ws.storm,h.ws.storm);
  const before=copy.x;rpgPromote(guest);copy.loaded=1;copy.auto=0;guest.heroes[1].auto=0;
  run(guest,3);assert.equal(copy.ws.storm,null);if(id==='azure_dual')assert(copy.x>before+100);
});
test('쌍검은 경로상의 적을 건너뛰지 않고 마지막 타격까지 PvP 상한을 공유한다',()=>{
  const {g,h}=setup('azure_dual'),o=g.heroes[1];g.mobs=[];h.map=o.map='field';h.x=600;h.y=600;o.x=850;o.y=600;
  h.pvpOn=o.pvpOn=1;h.pty=o.pty=0;h.auto=o.auto=0;h.calm=o.calm=-100;o.inv=0;h.bag.w[0].up=20;
  const before=o.hp;rpgWeaponSkill(g,0);run(g,.4);rpgWeaponRelease(g,0);run(g,.2);
  assert(o.hp<before,'실제 돌진 경로 피해');o.x=1060;run(g,.3);
  assert(before-o.hp<=o.max*.12+1,`PvP 한도: ${before-o.hp}`);
  assert(Math.abs(h.y-600)<.01);assert.equal(RPG.squash,.78);
});
