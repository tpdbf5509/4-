import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,rpgMove,rpgTalk,npcNear,mapIdx,MAPS,RPG} from '../src/game/rpg.js';
import {rpgAdminCmd} from '../src/game/adminCmd.js';
import {VILLAGE as V} from '../src/game/villageData.js';
import {STORY_MAPS,STORY_PEOPLE,STORY_DIALOGUES,storyNpcsOf} from '../src/game/storyData.js';
import {npcStopPoint,pickNpc} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=(admin=0)=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'story-test',name:'이야기시험',hero:{name:'이야기시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'이야기시험',lv:30,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1},admin},'story-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/RPG.squash);

test('이야기 맵 스물세 곳은 마을 뒤 스냅샷 차례에 붙고 모두 안전 지역이다',()=>{
 STORY_MAPS.forEach((m,i)=>{assert.equal(mapIdx(m.id),mapIdx(V.id)+1+i);assert.ok(MAPS[m.id].safe&&MAPS[m.id].story);});
 assert.equal(STORY_MAPS.length,23);
});

test('이야기 인물 열셋이 모두 어딘가에 서 있고 이름표가 있다',()=>{
 const placed=new Set(['dawnwood',...STORY_MAPS.map(m=>m.id)].flatMap(id=>storyNpcsOf(id).map(n=>n.who)));
 assert.deepEqual([...placed].sort(),Object.keys(STORY_PEOPLE).sort());
 for(const n of Object.values(STORY_DIALOGUES))assert.ok(n.name&&n.intro&&n.lines.length>=2,n.id);
});

test('관리자만 /이동 으로 들어가고 문으로 마을에 돌아온다',()=>{
 const p=world(0);rpgAdminCmd(p,0,'/이동 제7연구소');assert.equal(p.heroes[0].map,'plaza');
 const g=world(1),h=g.heroes[0];
 for(const m of STORY_MAPS){
  h.map='plaza';rpgAdminCmd(g,0,`/이동 ${m.name}`);assert.equal(h.map,m.id);
  step(g,60);assert.equal(h.map,m.id,'도착하자마자 되돌아가지 않는다');
  const gate=MAPS[m.id].gates[0];rpgMove(g,0,{x:gate.x,y:gate.y,m:m.id});step(g,200);
  assert.equal(h.map,gate.to,m.id);
 }
});

test('모든 인물 · 조사물은 클릭 · 걸어서 다가가 대화할 수 있고 막힌 곳에 갇히지 않는다',()=>{
 for(const id of ['dawnwood',...STORY_MAPS.map(m=>m.id)]){
  for(const n of MAPS[id].npcs.filter(q=>q.story)){
   const g=world(1),h=g.heroes[0];Object.assign(h,{map:id,x:MAPS[id].spawn[0],y:MAPS[id].spawn[1],gateCd:3});
   assert.equal(pickNpc(id,n.x,n.y-20)?.id,n.id,n.id);
   const dest=npcStopPoint(h,n);assert.ok(MAPS[id].blocks.every(b=>distance(dest,b)>b.r+10),'대화 자리 막힘: '+n.id);
   rpgMove(g,0,{...dest,m:id});step(g,900);
   assert.equal(npcNear(h)?.id,n.id,`${id}/${n.id}: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);
   const before=JSON.stringify({q:h.quest,b:h.bag,c:h.coins});rpgTalk(g,0);assert.equal(JSON.stringify({q:h.quest,b:h.bag,c:h.coins}),before);
  }
 }
});

test('이야기 맵 위치는 손님 스냅샷에 그대로 보인다',()=>{
 const g=world(1),h=g.heroes[0];rpgAdminCmd(g,0,'/이동 기록 보관소');
 const guest=makeWorld();rpgApply(guest,rpgPack(g));assert.equal(guest.heroes[0].map,'vault');
});
