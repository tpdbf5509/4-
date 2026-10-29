import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,rpgPromote,aimDir,RPG} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {cleanSkillAim,pointerSkillAim} from '../src/game/skillAim.js';
import {SPECIAL_BY_ID,specialTier} from '../src/game/shop.js';
import {RESET,GIFT} from '../src/game/itemData.js';
function setup(id='violet_bow',advClass){
 const sp=SPECIAL_BY_ID[id],g=makeWorld();g.out=[];g.mySeat=0;
 const seats=[{id:'aim',name:'조준시험',hero:{name:'조준시험',job:sp.t==='staff'?'mage':sp.t==='bow'?'archer':'warrior',elem:'frost',gender:'m'}}];
 rpgSyncSeats(g,seats);rpgJoin(g,0,{name:'조준시험',rs:RESET.id,gift:GIFT.id,lv:400,ts:0,advClass,
 stats:{str:200,int:200,hp:200},bag:{oc:1,w:[{u:1,t:sp.t,r:specialTier(sp),g:4,p:100,sp:id}],e:1,n:2,s:{j_pierce:1},ks:{job:'j_pierce',g:[]}}},'aim');
 const h=g.heroes[0];h.auto=0;h.map='train';h.x=900;h.y=700;h.hold=[];h.look=[1,0];h.lookF=0;h.face=0;h.dir=1;
 rpgStep(g,.01);const m=g.mobs.find(m=>m.map==='train'&&m.hp>0);h.x=m.x-200;h.y=m.y;
 return {g,h,m,seats};
}
const run=(g,t)=>{for(let i=0;i<Math.ceil(t/.02);i++)rpgStep(g,.02);};
test('카메라·캐릭터 위치·세로 비율로 포인터 방향을 계산하고 다른 맵의 포인터는 버린다',()=>{
 const h={x:1000,y:800,map:'train'},cam={x:420,y:420};
 assert.deepEqual(pointerSkillAim(h,cam,{x:480,y:346,map:'train'},RPG.squash),[-1,0]);
 assert.deepEqual(pointerSkillAim(h,cam,{x:580,y:246,map:'train'},RPG.squash),[0,-1]);
 assert.equal(pointerSkillAim(h,cam,{x:480,y:346,map:'plaza'},RPG.squash),null);
});
test('영벡터·NaN·무한대·잘못된 입력은 거절하고 큰 정상 벡터는 정규화한다',()=>{
 for(const v of [null,{},[0,0],[NaN,1],[Infinity,0],[1],[1,2,3],[1e20,0]])assert.equal(cleanSkillAim(v),null);
 assert.deepEqual(cleanSkillAim([0,-500]),[0,-1]);
});
test('자전궁은 이동 방향과 반대인 포인터로 발사하고 뒤의 가까운 적으로 휘지 않는다',()=>{
 const {g,h}=setup();h.hold=['right'];
 rpgInput(g,{cls:0,kind:'wskill',aim:[-8,0]});
 assert.equal(h.ws.storm.ax,-1);assert.equal(h.ws.storm.ay,0);assert(!('inputAim'in h));
 assert.deepEqual(aimDir(h),[1,0]);run(g,1.6);assert.equal(h.trn?.tot||0,0);
});
test('조준이 없는 터치·옛 입력은 기존 바라보는 방향으로 발사한다',()=>{
 const {g,h}=setup();rpgInput(g,{cls:0,kind:'wskill'});assert.equal(h.ws.storm.ax,1);
 run(g,1.6);assert(h.trn.tot>0);
});
test('월드보스 직선 무기도 포인터 방향을 시전 상태에 고정한다',()=>{
 const {g,h}=setup('machine_bow');rpgInput(g,{cls:0,kind:'wskill',aim:[0,-1]});
 assert.equal(h.ws.world.cast.ax,0);assert.equal(h.ws.world.cast.ay,-1);run(g,2);assert.equal(h.trn?.tot||0,0);
});
test('관통 화살의 그림과 실제 판정이 같은 마우스 방향을 따른다',()=>{
 const {g,h}=setup();rpgInput(g,{cls:0,kind:'use',dir:'j_pierce',aim:[-1,0]});
 const beam=g.out.find(f=>f.kind==='beam');assert(beam.x1<beam.x0);assert.equal(h.trn?.tot||0,0);
 h.scd.j_pierce=0;rpgInput(g,{cls:0,kind:'use',dir:'j_pierce',aim:[1,0]});assert(h.trn.tot>0);
});
test('명사수의 지연 저격도 시전 순간의 포인터 방향을 보존한다',()=>{
 const {g,h}=setup('star_bow','marksman');rpgInput(g,{cls:0,kind:'adv',dir:{op:'use'},aim:[-1,0]});
 const shot=g.out.find(f=>f.kind==='sk_adv_snipe');assert(shot.x1<shot.x0);
 run(g,2);assert.equal(h.trn?.tot||0,0);
});
test('창뢰 쌍검은 놓는 순간의 방향으로 확정하고 스냅샷·승계 뒤에도 유지한다',()=>{
 const {g,h,seats}=setup('azure_dual');rpgInput(g,{cls:0,kind:'wcharge',dir:true,aim:[1,0],q:1});run(g,.4);
 rpgInput(g,{cls:0,kind:'wcharge',dir:false,aim:[-1,0],q:2});assert.equal(h.ws.storm.ax,-1);
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));rpgPromote(guest);
 assert.equal(guest.heroes[0].ws.storm.ax,-1);assert(!('inputAim'in guest.heroes[0]));
 const x=h.x;run(g,.4);assert(h.x<x);
});
test('마우스 방향은 이동·대쉬 입력에 섞여 들어와도 사용하지 않는다',()=>{
 const {g,h}=setup();rpgInput(g,{cls:0,kind:'dash',dir:[1,0],aim:[-1,0]});assert(h.dvx>0);assert(!('inputAim'in h));
});
