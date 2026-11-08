// 메인 스토리 전달 개선(11월 8일) — 퀘스트 설명 · 조사형 단서 · 알게 된 것 · 이야기 기록 · 마을 분위기
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgMove,npcNear,MAPS} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {cleanBag} from '../src/game/shop.js';
import {STORY_STEPS,STORY_TAGS,STORY_STEP_BY_ID,stepTargets,stepOpenTargets,sceneOf,storyLineShown,addPick,STORY_REV} from '../src/game/storyQuestData.js';
import {storyView,storyTargetFor,storyPicks} from '../src/game/storyQuest.js';
import {STORY_GUIDE,storyGuideOf,storyFact,storyJournal,storyMoodFor} from '../src/game/storyGuide.js';
import {STORY_FACTS,STORY_RECAP,STORY_MOOD} from '../src/game/storyRecap.js';
import {VILLAGE_DIALOGUES} from '../src/game/villageData.js';
import {npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';

const seat=(k)=>({id:`gd${k}`,name:`안내시험${k}`,hero:{name:`안내시험${k}`,job:'warrior',gender:'m'}});
function world(bags=[{}]){
 const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,bags.map((_,k)=>seat(k)));
 bags.forEach((bag,k)=>rpgJoin(g,k,{name:`안내시험${k}`,lv:10,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1,...bag}},`gd${k}`));
 return g;
}
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const walkTo=(g,id,pi=0)=>{const h=g.heroes[pi],n=MAPS[h.map].npcs.find(q=>q.id===id);assert.ok(n,`${h.map} 에 ${id} 없음`);rpgMove(g,pi,{...npcStopPoint(h,n),m:h.map});step(g,900);assert.equal(npcNear(h)?.id,id);};
const send=(g,dir,pi=0)=>rpgInput(g,{cls:pi,kind:'story',dir});
function picksFor(scene,c,t){const tags=[...c],trust={...t},out=[];
 for(const l of scene){if(!storyLineShown(l,tags,trust)||!l.pick)continue;const k=l.pick.findIndex(p=>!p.wrong);addPick(l.pick[k],tags,trust);out.push(k);}return out;}
const at=(id)=>STORY_STEP_BY_ID[id].i;
const sqAt=(id,n=[],c=[])=>({r:STORY_REV,i:at(id),n,c,t:{}});
const goStep=(g,s,pi=0)=>{const h=g.heroes[pi];if(h.map!==s.map)send(g,{op:'go'},pi);assert.equal(h.map,s.map);step(g,40);};
const finishTarget=(g,s,id,pi=0)=>{walkTo(g,id,pi);const sq=g.heroes[pi].bag.sq;send(g,{op:'done',id,step:s.id,picks:picksFor(sceneOf(s,id),sq.c,sq.t)},pi);};

test('퀘스트 120개 모두 상황 · 이유가 있고 이름이 겹치지 않는다',()=>{
 const qs=[...new Set(STORY_STEPS.map(s=>s.q))];
 for(const q of qs){assert.equal(new Set(STORY_STEPS.filter(s=>s.q===q).map(s=>s.ch)).size,1,`${q} 이 두 장에 있다`);
  const g=STORY_GUIDE[q];assert.ok(g&&g.sit&&g.why,`${q} 설명 없음`);}
 for(const q of Object.keys(STORY_GUIDE))assert.ok(qs.includes(q),`쓰지 않는 설명 ${q}`);
 for(const s of STORY_STEPS)assert.ok(storyGuideOf(s));
});

test('알게 된 것 · 장 기록 · 마을 분위기의 열쇠와 꼬리표가 실제 값이다',()=>{
 const tagOk=(l,w)=>{for(const k of ['if','not'])if(l[k])assert.ok(STORY_TAGS.includes(l[k]),`${w}: 없는 꼬리표 ${l[k]}`);};
 for(const [k,v] of Object.entries(STORY_FACTS)){
  const [sid,tid]=k.split('/'),s=STORY_STEP_BY_ID[sid];assert.ok(s,`없는 단계 ${k}`);
  if(tid)assert.ok(stepTargets(s).includes(tid),`${k}: 그 단계의 대상이 아니다`);
  if(Array.isArray(v))v.forEach(l=>{assert.ok(l.t);tagOk(l,k);});else assert.ok(v.length>4);
 }
 for(let ch=1;ch<=30;ch++){const r=STORY_RECAP[ch];assert.ok(r&&r.sum&&r.next,`${ch}장 기록`);
  for(const o of r.open){assert.ok(o.q);if(o.by){assert.ok(o.by>ch&&o.by<=30,`${ch}장 의문이 ${o.by}장에서 풀린다`);assert.ok(o.a);}}
  r.bond.forEach(l=>{assert.ok(l.t);tagOk(l,`${ch}장`);});}
 for(const m of STORY_MOOD){assert.ok(VILLAGE_DIALOGUES[m.npc],m.npc);assert.ok(STORY_STEP_BY_ID[m.after],m.after);
  m.lines.forEach(l=>{if(typeof l!=='string')tagOk(l,m.npc);});}
 // 조사형 단계 — 단서가 그 맵에 있고 단서마다 장면이 있다
 for(const s of STORY_STEPS.filter(x=>x.look)){assert.ok(s.at&&!s.need);
  for(const id of s.look){assert.ok(MAPS[s.map].npcs.some(n=>n.id===id),`${s.id}/${id}`);assert.ok(s.scenes[id]?.length,`${s.id}/${id} 장면`);assert.ok(STORY_FACTS[`${s.id}/${id}`],`${s.id}/${id} 알게 된 것`);}}
 assert.equal(STORY_STEPS.filter(x=>x.look).length,3,'조사형 단서는 중요한 구간(2 · 4 · 14장)에만');
});

test('조사형 — 단서를 다 보기 전에는 이야기 상대가 잠기고, 서버도 진행을 거절한다',()=>{
 const s=STORY_STEP_BY_ID['2-02'];
 const g=world([{sq:sqAt('2-02')}]),h=g.heroes[0];goStep(g,s);
 let v=storyView(h);
 assert.deepEqual(v.targets,s.look,'처음에는 단서만');assert.equal(v.locked,s.at);assert.equal(v.checks.length,3);
 assert.ok(!storyTargetFor(h,s.at));
 walkTo(g,s.at);send(g,{op:'done',id:s.at,step:s.id,picks:picksFor(sceneOf(s,s.at),[],{})});
 assert.equal(h.bag.sq.i,at('2-02'),'잠긴 상대와 먼저 이야기해도 진행하지 않는다');
 finishTarget(g,s,s.look[0]);
 assert.deepEqual(h.bag.sq.n,[s.look[0]]);assert.ok(g.sys.some(x=>x.msg.startsWith('알게 된 것 · 출고 기록부')),'알게 된 것 알림');
 v=storyView(h);assert.equal(v.locked,s.at,'단서 하나 남음');
 // 저장 · 불러오기 — 찾은 단서는 남는다
 assert.deepEqual(cleanBag({sq:h.bag.sq}).sq.n,[s.look[0]]);
 finishTarget(g,s,s.look[1]);
 v=storyView(h);assert.equal(v.locked,null);assert.deepEqual(v.targets,[s.at]);
 // 추리 질문 — 틀린 답 번호는 서버가 받지 않는다
 const scene=sceneOf(s,s.at),good=picksFor(scene,h.bag.sq.c,h.bag.sq.t);
 const qi=scene.filter(l=>l.pick).findIndex(l=>l.pick.some(p=>p.wrong));
 const bad=[...good];bad[qi]=scene.filter(l=>l.pick)[qi].pick.findIndex(p=>p.wrong);
 assert.equal(storyPicks(scene,bad,[],{}),null);
 finishTarget(g,s,s.at);
 assert.equal(h.bag.sq.i,at('2-02')+1);
});

test('이미 그 단계에 있던 기존 진행 — 단서부터 하면 되고, 앞 장은 그대로다',()=>{
 for(const id of ['2-02','4-02','14-03']){
  const old=cleanBag({sq:sqAt(id,[],['S1_RESCUE:supply'])}).sq;
  assert.equal(old.i,at(id));assert.deepEqual(old.c,['S1_RESCUE:supply']);
  const g=world([{sq:old}]),h=g.heroes[0],s=STORY_STEP_BY_ID[id];goStep(g,s);
  for(const t of stepTargets(s))finishTarget(g,s,t);
  assert.equal(h.bag.sq.i,at(id)+1,id);
 }
});

test('여러 사람이 같은 맵에서 진행해도 서로의 진행에 영향이 없다',()=>{
 const s=STORY_STEP_BY_ID['4-02'];
 const g=world([{sq:sqAt('4-02')},{sq:sqAt('4-02')}]);
 goStep(g,s,0);goStep(g,s,1);
 finishTarget(g,s,s.look[0],0);
 assert.deepEqual(g.heroes[0].bag.sq.n,[s.look[0]]);assert.deepEqual(g.heroes[1].bag.sq.n,[],'다른 사람 단서는 그대로');
 assert.equal(storyView(g.heroes[1]).locked,s.at);
 // 다른 사람 번호로 보낸 진행은 그 사람 곁이 아니면 받지 않는다
 send(g,{op:'done',id:s.look[1],step:s.id,picks:[]},1);assert.deepEqual(g.heroes[1].bag.sq.n,[]);
});

test('이야기 기록 — 끝낸 장만 요약 · 의문 · 관계가 보이고, 답은 그 장을 마쳐야 보인다',()=>{
 let j=storyJournal(sqAt('2-01a',[],['c1_heal','S1_LIA_TRUTH:tell']));
 assert.equal(j.doneCh,1);
 const c1=j.chapters.find(c=>c.ch===1),c2=j.chapters.find(c=>c.ch===2);
 assert.ok(c1.done&&c1.sum&&c1.next);assert.ok(c1.facts.length>=5,'1장 사실');
 assert.ok(c1.open.every(o=>!o.a),'5장 전에는 답이 없다');
 assert.ok(c1.bond.some(b=>b.startsWith('세라'))&&c1.bond.some(b=>b.startsWith('리아')));
 assert.ok(!c2.done&&!c2.sum&&!c2.open.length,'진행 중인 장은 요약 · 의문을 숨긴다');
 assert.ok(!j.chapters.some(c=>c.ch>2),'앞 장은 보이지 않는다');
 // 2장 단서 하나만 찾은 상태 — 그 단서 사실만
 j=storyJournal(sqAt('2-02',['lab7-manifest']));
 const now=j.chapters.find(c=>c.ch===2);
 assert.ok(now.facts.some(f=>f.startsWith('출고 기록부')));assert.ok(!now.facts.some(f=>f.startsWith('빈 보관대')));
 // 5장을 마치면 1장 의문 두 개가 풀린다
 j=storyJournal(sqAt('6-01'));
 assert.equal(j.chapters.find(c=>c.ch===1).open.filter(o=>o.a).length,2);
 // 다 마친 뒤
 j=storyJournal({r:STORY_REV,i:STORY_STEPS.length,n:[],c:[],t:{zero:2,sera:-1}});
 assert.equal(j.doneCh,30);assert.equal(j.chapters.length,30);assert.equal(j.trust.length,2);
});

test('알게 된 것은 고른 갈래에 맞는 문장만 나온다',()=>{
 const s=STORY_STEP_BY_ID['1-02'];
 assert.match(storyFact(s,s.at,['S1_RESCUE:supply']),/물자창고/);
 assert.doesNotMatch(storyFact(s,s.at,['S1_RESCUE:supply']),/구호 식량/);
 assert.match(storyFact(s,s.at,['S1_RESCUE:civilian']),/구호 식량/);
 const w=STORY_STEP_BY_ID['1-03a'];
 assert.match(storyFact(w,'convoy-wagon-1',[],false),/쇠 발굽/);
});

test('마을 분위기 — 진행에 따라 주민 말이 바뀌고, 소은은 끝낸 장을 정리해 준다',()=>{
 assert.equal(storyMoodFor('dawn-elder',{i:0}),null,'시작 전에는 평소 말');
 assert.match(storyMoodFor('dawn-elder',{i:at('1-02')}).join(' '),/북문 종/);
 assert.match(storyMoodFor('dawn-elder',{i:at('5-01')}).join(' '),/축제/);
 assert.match(storyMoodFor('dawn-innkeeper',{i:at('1-03a'),c:['S1_RESCUE:civilian']}).join(' '),/식량이 모자라요/);
 assert.equal(storyMoodFor('dawn-archivist',{i:0}),null);
 assert.match(storyMoodFor('dawn-archivist',{i:at('2-01a')}).join(' '),/1장 「사라진 수송대」/);
});
