import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,rpgMove,rpgTalk,rpgFire,rpgSkill,npcNear,mapIdx,fieldPvpMap,MAPS,RPG} from '../src/game/rpg.js';
import {VILLAGE as V,VILLAGE_NPCS,VILLAGE_SIGHTS,VILLAGE_DIALOGUES} from '../src/game/villageData.js';
import {pickNpc,npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=()=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'village-test',name:'마을시험',hero:{name:'마을시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'마을시험',lv:30,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'village-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/RPG.squash);

test('새 안전 맵은 스냅샷 목록 끝에 추가하고 기존 광장 NPC를 유지한다',()=>{
 assert.equal(mapIdx(V.id),mapIdx('race')+1);
 assert.equal(mapIdx('plaza'),0);assert.equal(mapIdx('field'),1);assert.equal(mapIdx('arena'),5);
 assert.ok(MAPS[V.id].safe);assert.equal(fieldPvpMap(V.id),false);assert.equal(fieldPvpMap('field'),true);
 assert.equal(MAPS.plaza.npcs.length,20);assert.equal(MAPS.plaza.npcs.find(n=>n.board).y,256);
 assert.equal(MAPS[V.id].npcs.length,8);
});

test('광장 북쪽 문까지 실제로 걸어서 입장하고 남쪽 문으로 왕복한다',()=>{
 const g=world(),h=g.heroes[0];Object.assign(h,{map:'plaza',x:1030,y:340,gateCd:0});
 rpgMove(g,0,{x:V.gate.x,y:V.gate.y,m:'plaza'});step(g,150);
 assert.equal(h.map,V.id);assert.ok(Math.hypot(h.x-V.spawn[0],h.y-V.spawn[1])<5);
 step(g,35);assert.equal(h.map,V.id,'도착 즉시 되돌아가지 않는다');
 rpgMove(g,0,{x:V.exit.x,y:V.exit.y,m:V.id});step(g,90);
 assert.equal(h.map,'plaza');assert.deepEqual([h.x,h.y],V.plazaAt);
 step(g,35);assert.equal(h.map,'plaza');
});

test('주민 여섯과 조사물 둘은 클릭·접근 가능하며 퀘스트를 오염시키지 않는다',()=>{
 const g=world(),h=g.heroes[0];h.map=V.id;
 for(const n of [...VILLAGE_NPCS,...VILLAGE_SIGHTS]){
  assert.equal(pickNpc(V.id,n.x,n.y-20)?.id,n.id);
  Object.assign(h,{x:n.x,y:n.y+70});const stop=npcStopPoint(h,n);
  Object.assign(h,stop);assert.equal(npcNear(h)?.id,n.id);
  const before=JSON.stringify({quest:h.quest,reqs:h.reqs,bag:h.bag,coins:h.coins});
  rpgTalk(g,0);assert.equal(JSON.stringify({quest:h.quest,reqs:h.reqs,bag:h.bag,coins:h.coins}),before);
  assert.ok(VILLAGE_DIALOGUES[n.id].lines.length>=2);
  assert.ok(MAPS[V.id].blocks.every(b=>distance(stop,b)>b.r+14),'대화 지점이 건물·장식 안에 갇히지 않는다: '+n.id);
 }
});

test('마을 안 평타·스킬과 사냥터 PvP는 막고 새 맵 위치는 손님 스냅샷에 보인다',()=>{
 const g=world(),h=g.heroes[0];Object.assign(h,{map:V.id,x:1100,y:1450,gateCd:1});
 const cd=h.sk;rpgFire(g,0,true);rpgSkill(g,0);step(g,2);
 assert.equal(h.sk,cd);assert.equal(h.swing,0);assert.equal(g.mobs.filter(m=>m.map===V.id).length,0);
 const guest=makeWorld();rpgApply(guest,rpgPack(g));
 assert.equal(guest.heroes[0].map,V.id);assert.equal(guest.heroes[0].x,h.x);assert.equal(guest.heroes[0].y,h.y);
});

test('귀환점과 여섯 건물 앞은 남쪽에서 실제 이동으로 접근할 수 있다',()=>{
 for(const n of VILLAGE_NPCS){const g=world(),h=g.heroes[0];Object.assign(h,{map:V.id,x:V.spawn[0],y:V.spawn[1],gateCd:2});const dest=npcStopPoint(h,n);rpgMove(g,0,{...dest,m:V.id});step(g,700);assert.equal(h.map,V.id);assert.equal(npcNear(h)?.id,n.id,`${n.id}: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);}
});
