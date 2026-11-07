import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgMove,npcNear,MAPS} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {cleanBag} from '../src/game/shop.js';
import {STORY_PEOPLE} from '../src/game/storyData.js';
import {STORY_STEPS,STORY_TAGS,stepTargets,sceneOf,storyLineShown,addPick,storyFlag,chapterStart,STORY_REV} from '../src/game/storyQuestData.js';
import {storyView,storyTargetFor,storyPicks} from '../src/game/storyQuest.js';
import {STORY_AFTER,storyBook} from '../src/game/storyAfter.js';
import {STORY_CLEAR_AT} from '../src/game/storyQuestData.js';
import {VILLAGE_DIALOGUES} from '../src/game/villageData.js';
import {STORY_DIALOGUES} from '../src/game/storyData.js';
import {npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=(bag={})=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'sq',name:'진행시험',hero:{name:'진행시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'진행시험',lv:10,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1,...bag}},'sq');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const walkTo=(g,id)=>{const h=g.heroes[0],n=MAPS[h.map].npcs.find(q=>q.id===id);assert.ok(n,`${h.map} 에 ${id} 없음`);rpgMove(g,0,{...npcStopPoint(h,n),m:h.map});step(g,900);assert.equal(npcNear(h)?.id,id);};
const send=(g,dir)=>rpgInput(g,{cls:0,kind:'story',dir});

// 장면을 따라가며 맞는 대답 번호를 고른다 — choose(질문, 보이는 질문 차례) 가 고를 대답 차례(틀린 답 제외)를 정한다
function picksFor(scene,c,t,choose=()=>0){
 const tags=[...c],trust={...t},out=[];let j=0;
 for(const l of scene){if(!storyLineShown(l,tags,trust)||!l.pick)continue;
  const ok=l.pick.map((p,k)=>[p,k]).filter(([p])=>!p.wrong);const [p,k]=ok[choose(ok.length,j++)%ok.length];
  addPick(p,tags,trust);out.push(k);}
 return out;
}
const sqOf=(h)=>h.bag.sq||{i:0,n:[],c:[],t:{}};
function playStep(g,s,choose){
 const h=g.heroes[0];
 if(h.map!==s.map){ if(MAPS[s.map].story){send(g,{op:'go'});} else {h.map=s.map;[h.x,h.y]=MAPS[s.map].spawn;} }
 assert.equal(h.map,s.map,`${s.id} 장소`);step(g,40);
 for(const t of stepTargets(s)){
  assert.ok(storyTargetFor(h,t),`${s.id}/${t}`);
  walkTo(g,t);
  const sq=sqOf(h);send(g,{op:'done',id:t,step:s.id,picks:picksFor(sceneOf(s,t),sq.c||[],sq.t||{},choose)});
 }
 if(s.go)assert.equal(h.map,s.go,`${s.id} 뒤 ${s.go} 로`);
}

test('모든 단계의 대상이 그 맵에 있고 말하는 사람 · 선택지가 올바르다',()=>{
 const ids=new Set(STORY_STEPS.map(s=>s.id));assert.equal(ids.size,STORY_STEPS.length);
 const chs=new Set(STORY_STEPS.map(s=>s.ch));assert.equal(chs.size,30,'1~30장');
 for(const s of STORY_STEPS){
  for(const t of stepTargets(s))assert.ok(MAPS[s.map].npcs.some(n=>n.id===t),`${s.id}: ${s.map}/${t}`);
  if(s.go)assert.ok(MAPS[s.go],s.id);
  const lines=[s.scene||[],...Object.values(s.scenes||{}),s.wrong||[]].flat();
  const all=lines.flatMap(l=>[l,...(l.pick||[]).flatMap(p=>p.then||[]),...(l.late?.then||[])]);
  for(const l of all){if(l.pick){assert.ok(l.pick.length>=2&&l.pick.length<=4,s.id);for(const p of l.pick)for(const x of p.then||[])assert.ok(!x.pick,`${s.id} 겹친 질문`);continue;}
   assert.ok(l.t&&(['me','sys','nar','soeun'].includes(l.s)||STORY_PEOPLE[l.s]),`${s.id}: ${l.s}`);}
  assert.ok(lines.some(l=>l.pick)||s.need,`${s.id} 에 선택지가 없다`);
  for(const t of [l=>l.if,l=>l.not].flatMap(f=>lines.map(f)).filter(Boolean))assert.ok(STORY_TAGS.includes(t),`${s.id}: 없는 꼬리표 ${t}`);
 }
 // 문서의 장기 분기 — 모두 두 값 이상
 for(const k of ['S1_RESCUE','S1_LIA_TRUTH','S2_ZERO','S3_SEAL_ORDER','S4_ARKA','S8_ARCHIVE','S12_EVIDENCE','S14_IRION','S16_ALLIANCE','S18_TRIAL','S18_PUBLIC_WORD','S21_MAP','S24_OBSERVER','S24_RECORD_READING','S27_ZERO_MEMORY','S29_FUTURE'])
  assert.ok(STORY_TAGS.filter(t=>t.startsWith(k+':')).length>=2,k);
});

test('처음부터 30장 끝까지 대화로 진행하고 이야기 맵으로 옮겨 간다 — 첫 대답만 골라도, 마지막 대답만 골라도',()=>{
 for(const choose of [()=>0,(n)=>n-1]){
  const g=world(),h=g.heroes[0];
  assert.equal(storyView(h).goal,STORY_STEPS[0].goal);
  for(const s of STORY_STEPS)playStep(g,s,choose);
  assert.equal(h.bag.sq.i,STORY_STEPS.length);
  assert.ok(storyView(h).done);
  const c=h.bag.sq.c;
  assert.equal(storyFlag(c,'S1_RESCUE'),choose(2)?'civilian':'supply');
  assert.equal(storyFlag(c,'S29_FUTURE'),choose(2)?'federation':'council');
  for(const k of Object.keys(h.bag.sq.t))assert.ok(Math.abs(h.bag.sq.t[k])<=2,k);
  // 완결 보상 — 기록 · 칭호 · 기념 기록서(선택 16개가 모두 적힌다)
  assert.equal(h.rec.story,1);
  step(g,200);
  assert.ok(h.titles.includes('story30'),'칭호 「네 갈래의 증인」');
  const bk=storyBook(c,h.bag.sq.t),lines=bk.pages.flatMap(p=>p.p);
  assert.equal(lines.filter(t=>/^\d+장 · /.test(t)).length,16);
 }
});

test('30-05 를 마치기 전에는 완결 기록이 없고, 불러올 때 완결 진행이면 기록을 채운다',()=>{
 const g=world({sq:{r:STORY_REV,i:STORY_CLEAR_AT-1,n:[],c:[],t:{}}});
 assert.equal(g.heroes[0].rec.story,0);
 const g2=world({sq:{r:STORY_REV,i:STORY_CLEAR_AT,n:[],c:[],t:{}}});
 assert.equal(g2.heroes[0].rec.story,1);
 assert.ok(g2.heroes[0].titles.includes('story30'));
});

test('마을 후일담 — 말할 인물이 마을에 있고 꼬리표 조건이 실제 꼬리표다',()=>{
 for(const [id,lines] of Object.entries(STORY_AFTER)){
  assert.ok(VILLAGE_DIALOGUES[id]||STORY_DIALOGUES[id],id);
  assert.ok(lines.some(l=>!l.if&&!l.not&&!l.tr),`${id} 조건 없는 줄`);
  for(const l of lines)for(const k of ['if','not'])if(l[k])assert.ok(STORY_TAGS.includes(l[k]),`${id} ${l[k]}`);
 }
});

test('대상 곁이 아니거나 차례가 아니거나 대답이 장면과 맞지 않으면 진행하지 않는다',()=>{
 const g=world(),h=g.heroes[0];h.map='dawnwood';[h.x,h.y]=MAPS.dawnwood.spawn;step(g,30);
 const s0=STORY_STEPS[0],good=picksFor(sceneOf(s0,'lia'),[],{});
 send(g,{op:'done',id:'lia',step:s0.id,picks:good});assert.equal(h.bag.sq?.i||0,0,'멀리서');
 walkTo(g,'hangyeol');send(g,{op:'done',id:'hangyeol',step:STORY_STEPS[1].id,picks:[0,0]});assert.equal(h.bag.sq?.i||0,0,'차례가 아닌 단계');
 walkTo(g,'lia');
 send(g,{op:'done',id:'lia',step:s0.id,picks:[]});assert.equal(h.bag.sq?.i||0,0,'대답 없이');
 send(g,{op:'done',id:'lia',step:s0.id,picks:[5]});assert.equal(h.bag.sq?.i||0,0,'없는 대답');
 send(g,{op:'done',id:'lia',step:s0.id,picks:[0,1]});assert.equal(h.bag.sq?.i||0,0,'대답이 더 많다');
 send(g,{op:'done',id:'lia',step:s0.id,picks:good});assert.equal(h.bag.sq.i,1);
 send(g,{op:'done',id:'lia',step:s0.id,picks:good});assert.equal(h.bag.sq.i,1,'같은 대화 두 번');
});

test('틀린 답 · 시간 초과 답은 확정되지 않는다',()=>{
 const s=STORY_STEPS.find(x=>x.scene?.some(l=>l.pick?.some(p=>p.wrong)));
 const scene=sceneOf(s,s.at);const shown=scene.filter(l=>l.pick);
 const bad=shown.map(l=>l.pick.findIndex(p=>p.wrong));
 assert.equal(storyPicks(scene,bad.map((k,j)=>k>=0?k:0),[],{}),null);
});

test('장기 분기는 한 번만 확정되고 관계 수치는 -2~+2 로 묶인다',()=>{
 const tags=[],trust={};
 addPick({tag:'S1_RESCUE:supply'},tags,trust);addPick({tag:'S1_RESCUE:civilian'},tags,trust);
 assert.deepEqual(tags,['S1_RESCUE:supply']);
 for(let i=0;i<5;i++)addPick({tr:{zero:1}},tags,trust);
 for(let i=0;i<9;i++)addPick({tr:{sera:-1}},tags,trust);
 assert.deepEqual(trust,{zero:2,sera:-2});
 const b=cleanBag({sq:{r:STORY_REV,i:3,n:[],c:['S1_RESCUE:supply','S1_RESCUE:civilian','x'],t:{zero:9,mina:-1,nobody:2}}});
 assert.deepEqual(b.sq.c,['S1_RESCUE:supply']);assert.deepEqual(b.sq.t,{zero:2,mina:-1});
});

test('진행은 가방과 함께 저장 · 불러오기 되고, 옛 1부 진행은 같은 장의 처음으로 옮긴다',()=>{
 const b=cleanBag({sq:{r:STORY_REV,i:2,n:['convoy-wagon-1','lab7-core'],c:['c1_wait','x'],t:{}}});
 assert.deepEqual(b.sq,{r:STORY_REV,i:2,n:['convoy-wagon-1'],c:['c1_wait'],t:{}});
 const g=world({sq:{r:STORY_REV,i:5,n:[],c:[],t:{}}});assert.equal(storyView(g.heroes[0]).id,STORY_STEPS[5].id);
 assert.deepEqual(cleanBag({}).sq,{r:STORY_REV,i:0,n:[],c:[],t:{}});
 assert.equal(cleanBag({sq:{i:2,n:[],c:['brave']}}).sq.i,0,'옛 1장');
 assert.equal(cleanBag({sq:{i:13,n:[],c:[]}}).sq.i,chapterStart(3),'옛 3장');
 assert.equal(cleanBag({sq:{i:34,n:[],c:['readLast']}}).sq.i,chapterStart(7),'옛 1부 끝 → 7장');
 assert.deepEqual(cleanBag({sq:{i:34,n:[],c:['readLast']}}).sq.c,[]);
});

test('마을의 이야기 장소 문은 진행 전에는 잠기고, 진행하면 걸어서 들어간다',()=>{
 const g=world(),h=g.heroes[0];
 for(const gt of MAPS.dawnwood.gates.filter(q=>q.storyGate)){
  h.bag.sq={r:STORY_REV,i:0,n:[],c:[],t:{}};h.map='dawnwood';[h.x,h.y]=[gt.x,gt.y+160];h.gateCd=0;
  rpgMove(g,0,{x:gt.x,y:gt.y,m:'dawnwood'});step(g,240);
  assert.equal(h.map,'dawnwood',`잠긴 문 ${gt.to}`);
  h.bag.sq={r:STORY_REV,i:STORY_STEPS.findIndex(s=>s.map===gt.to),n:[],c:[],t:{}};h.gateCd=0;
  rpgMove(g,0,{x:gt.x,y:gt.y,m:'dawnwood'});step(g,240);
  assert.equal(h.map,gt.to,`열린 문 ${gt.to}`);
  const exit=MAPS[gt.to].gates[0];[h.x,h.y]=[exit.x,exit.y-120];h.gateCd=0;rpgMove(g,0,{x:exit.x,y:exit.y,m:gt.to});step(g,240);
  assert.equal(h.map,'dawnwood',`${gt.to} 에서 돌아오기`);
  assert.ok(Math.hypot(h.x-gt.x,h.y-gt.y)<220,'그 문 앞으로 돌아온다');
 }
});

test('봉인 유적 넷은 북 · 동 · 남 · 서 · 중앙 제어 시설 차례로 이어진다',()=>{
 const g=world(),h=g.heroes[0];h.bag.sq={r:STORY_REV,i:STORY_STEPS.length,n:[],c:[],t:{}};
 let at='ruin-north';
 for(const to of ['ruin-east','ruin-south','ruin-west','core']){
  const gt=MAPS[at].gates.find(q=>q.to===to);assert.ok(gt,`${at} → ${to}`);
  h.map=at;[h.x,h.y]=[gt.x-150,gt.y];h.gateCd=0;rpgMove(g,0,{x:gt.x,y:gt.y,m:at});step(g,240);
  assert.equal(h.map,to);at=to;
 }
});

test('순서 퍼즐 — 틀린 차례로 조사하면 처음부터 다시 한다',()=>{
 for(const s of STORY_STEPS.filter(x=>x.order)){
  const i=STORY_STEPS.indexOf(s);
  const g=world({sq:{r:STORY_REV,i,n:[],c:[],t:{}}}),h=g.heroes[0];h.map=s.map;[h.x,h.y]=MAPS[s.map].spawn;step(g,30);
  const go=(t)=>{walkTo(g,t);send(g,{op:'done',id:t,step:s.id,picks:picksFor(sceneOf(s,t),[],{})});};
  go(s.need[0]);assert.deepEqual(h.bag.sq.n,[s.need[0]]);
  go(s.need[2]);assert.deepEqual(h.bag.sq.n,[],s.id+' 틀리면 처음으로');
  for(const t of s.need)go(t);
  assert.equal(h.bag.sq.i,i+1,s.id);
 }
});

test('틀린 답 · 시간 제한 질문에는 정답이 하나 이상 있다',()=>{
 for(const s of STORY_STEPS)for(const l of [s.scene||[],...Object.values(s.scenes||{}),s.wrong||[]].flat()){
  if(!l.pick)continue;
  assert.ok(l.pick.some(p=>!p.wrong),`${s.id} 정답 없음`);
  if(l.timer)assert.ok(l.late&&l.late.then,`${s.id} 시간 초과 대사`);
 }
});
