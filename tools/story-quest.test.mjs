import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgMove,npcNear,MAPS} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {cleanBag} from '../src/game/shop.js';
import {STORY_PEOPLE} from '../src/game/storyData.js';
import {STORY_STEPS,STORY_TAGS,stepTargets} from '../src/game/storyQuestData.js';
import {storyView,storyTargetFor} from '../src/game/storyQuest.js';
import {npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=(bag={})=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'sq',name:'진행시험',hero:{name:'진행시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'진행시험',lv:10,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1,...bag}},'sq');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const walkTo=(g,id)=>{const h=g.heroes[0],n=MAPS[h.map].npcs.find(q=>q.id===id);assert.ok(n,`${h.map} 에 ${id} 없음`);rpgMove(g,0,{...npcStopPoint(h,n),m:h.map});step(g,900);assert.equal(npcNear(h)?.id,id);};
const send=(g,dir)=>rpgInput(g,{cls:0,kind:'story',dir});

test('모든 단계의 대상이 그 맵에 있고 말하는 사람 · 선택지가 올바르다',()=>{
 const ids=new Set(STORY_STEPS.map(s=>s.id));assert.equal(ids.size,STORY_STEPS.length);
 for(const s of STORY_STEPS){
  for(const t of stepTargets(s))assert.ok(MAPS[s.map].npcs.some(n=>n.id===t),`${s.id}: ${s.map}/${t}`);
  if(s.go)assert.ok(MAPS[s.go],s.id);
  const lines=[s.scene||[],...Object.values(s.scenes||{})].flat();
  const all=lines.flatMap(l=>[l,...(l.pick||[]).flatMap(p=>p.then||[])]);
  for(const l of all){if(l.pick){assert.ok(l.pick.length>=2&&l.pick.length<=4,s.id);continue;}
   assert.ok(l.t&&(['me','sys','nar','soeun'].includes(l.s)||STORY_PEOPLE[l.s]),`${s.id}: ${l.s}`);}
  assert.ok(lines.some(l=>l.pick)||s.need,`${s.id} 에 선택지가 없다`);
 }
 assert.ok(STORY_TAGS.length>=5);
});

test('처음부터 1부 끝까지 대화로 진행하고 이야기 맵으로 옮겨 간다',()=>{
 const g=world(),h=g.heroes[0];
 assert.equal(storyView(h).goal,STORY_STEPS[0].goal);
 for(const s of STORY_STEPS){
  if(h.map!==s.map){ if(MAPS[s.map].story){send(g,{op:'go'});} else {h.map=s.map;[h.x,h.y]=MAPS[s.map].spawn;} }
  assert.equal(h.map,s.map,`${s.id} 장소`);step(g,40);
  for(const t of stepTargets(s)){
   assert.ok(storyTargetFor(h,t),`${s.id}/${t}`);
   walkTo(g,t);
   send(g,{op:'done',id:t,step:s.id,tags:['brave','없는꼬리표']});
  }
  if(s.go)assert.equal(h.map,s.go,`${s.id} 뒤 ${s.go} 로`);
 }
 assert.equal(h.bag.sq.i,STORY_STEPS.length);
 assert.deepEqual(h.bag.sq.c,['brave']);
 assert.ok(storyView(h).done);
});

test('대상 곁이 아니거나 차례가 아닌 대화는 진행하지 않는다',()=>{
 const g=world(),h=g.heroes[0];h.map='dawnwood';[h.x,h.y]=MAPS.dawnwood.spawn;step(g,30);
 send(g,{op:'done',id:'hangyeol',step:'1-1a'});assert.equal(h.bag.sq?.i||0,0,'멀리서');
 walkTo(g,'mina');send(g,{op:'done',id:'mina',step:'1-1b'});assert.equal(h.bag.sq?.i||0,0,'차례가 아닌 단계');
 walkTo(g,'hangyeol');send(g,{op:'done',id:'hangyeol',step:'1-1a'});assert.equal(h.bag.sq.i,1);
 send(g,{op:'done',id:'hangyeol',step:'1-1a'});assert.equal(h.bag.sq.i,1,'같은 대화 두 번');
});

test('진행은 가방과 함께 저장 · 불러오기 된다',()=>{
 const b=cleanBag({sq:{i:2,n:['convoy-wagon-1','lab7-core'],c:['brave','x']}});
 assert.deepEqual(b.sq,{i:2,n:['convoy-wagon-1'],c:['brave']});
 const g=world({sq:{i:5,n:[],c:['kind']}});assert.equal(storyView(g.heroes[0]).id,STORY_STEPS[5].id);
 assert.deepEqual(cleanBag({}).sq,{i:0,n:[],c:[]});
});

test('마을의 이야기 장소 문은 진행 전에는 잠기고, 진행하면 걸어서 들어간다',()=>{
 const g=world(),h=g.heroes[0];
 for(const gt of MAPS.dawnwood.gates.filter(q=>q.storyGate)){
  h.bag.sq={i:0,n:[],c:[]};h.map='dawnwood';[h.x,h.y]=[gt.x,gt.y+160];h.gateCd=0;
  rpgMove(g,0,{x:gt.x,y:gt.y,m:'dawnwood'});step(g,240);
  assert.equal(h.map,'dawnwood',`잠긴 문 ${gt.to}`);
  h.bag.sq={i:STORY_STEPS.findIndex(s=>s.map===gt.to),n:[],c:[]};h.gateCd=0;
  rpgMove(g,0,{x:gt.x,y:gt.y,m:'dawnwood'});step(g,240);
  assert.equal(h.map,gt.to,`열린 문 ${gt.to}`);
  const exit=MAPS[gt.to].gates[0];[h.x,h.y]=[exit.x,exit.y-120];h.gateCd=0;rpgMove(g,0,{x:exit.x,y:exit.y,m:gt.to});step(g,240);
  assert.equal(h.map,'dawnwood',`${gt.to} 에서 돌아오기`);
  assert.ok(Math.hypot(h.x-gt.x,h.y-gt.y)<220,'그 문 앞으로 돌아온다');
 }
});

test('봉인 유적 넷은 북 · 동 · 남 · 서 · 중앙 제어 시설 차례로 이어진다',()=>{
 const g=world(),h=g.heroes[0];h.bag.sq={i:STORY_STEPS.length,n:[],c:[]};
 let at='ruin-north';
 for(const to of ['ruin-east','ruin-south','ruin-west','core']){
  const gt=MAPS[at].gates.find(q=>q.to===to);assert.ok(gt,`${at} → ${to}`);
  h.map=at;[h.x,h.y]=[gt.x-150,gt.y];h.gateCd=0;rpgMove(g,0,{x:gt.x,y:gt.y,m:at});step(g,240);
  assert.equal(h.map,to);at=to;
 }
});

test('순서 퍼즐 — 틀린 차례로 조사하면 처음부터 다시 한다',()=>{
 const i=STORY_STEPS.findIndex(s=>s.order),s=STORY_STEPS[i];
 const g=world({sq:{i,n:[],c:[]}}),h=g.heroes[0];h.map=s.map;[h.x,h.y]=MAPS[s.map].spawn;step(g,30);
 walkTo(g,s.need[0]);send(g,{op:'done',id:s.need[0],step:s.id});assert.deepEqual(h.bag.sq.n,[s.need[0]]);
 walkTo(g,s.need[2]);send(g,{op:'done',id:s.need[2],step:s.id});assert.deepEqual(h.bag.sq.n,[],'틀리면 처음으로');
 for(const t of s.need){walkTo(g,t);send(g,{op:'done',id:t,step:s.id});}
 assert.equal(h.bag.sq.i,i+1);
});

test('틀린 답 · 시간 제한 질문에는 정답이 하나 이상 있다',()=>{
 for(const s of STORY_STEPS)for(const l of [s.scene||[],...Object.values(s.scenes||{}),s.wrong||[]].flat()){
  if(!l.pick)continue;
  assert.ok(l.pick.some(p=>!p.wrong),`${s.id} 정답 없음`);
  if(l.timer)assert.ok(l.late&&l.late.then,`${s.id} 시간 초과 대사`);
 }
});
