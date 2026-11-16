/* 에르덴 도서관(libraryData.js) — 마을 문 → 1층 → 계단 → 2층 → 계단 → 1층 → 마을, 모든 대상에 걸어가 말을 건다. 맵 차례는 맨 뒤 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,rpgMove,rpgTalk,npcNear,mapIdx,MAPS,RPG,SNAP_ORDER} from '../src/game/rpg.js';
import {LIBRARY,LIBRARY_MAPS} from '../src/game/libraryData.js';
import {STORY_DIALOGUES} from '../src/game/storyData.js';
import {npcStopPoint,pickNpc} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=()=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'lib-test',name:'도서관시험',hero:{name:'도서관시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'도서관시험',lv:5,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'lib-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/RPG.squash);
const walkTo=(g,m,x,y)=>{rpgMove(g,0,{x,y,m});step(g,400);};

test('도서관 두 층은 스냅샷 맵 목록 맨 뒤에 붙고 안전 지역이다',()=>{
 const n=SNAP_ORDER.maps.length;
 assert.deepEqual(LIBRARY_MAPS.map(m=>mapIdx(m.id)),[n-2,n-1]);
 LIBRARY_MAPS.forEach(m=>assert.ok(MAPS[m.id].safe&&MAPS[m.id].library));
});

test('이야기를 시작하지 않아도 마을 문 → 1층 → 계단 → 2층 → 1층 → 마을로 다닌다',()=>{
 const g=world(),h=g.heroes[0];
 Object.assign(h,{map:'dawnwood',x:LIBRARY.door.x,y:LIBRARY.door.y+150,gateCd:0});
 walkTo(g,'dawnwood',LIBRARY.door.x,LIBRARY.door.y);assert.equal(h.map,'erden-library','마을 → 1층');
 step(g,60);assert.equal(h.map,'erden-library','들어오자마자 나가지 않는다');
 const up=MAPS['erden-library'].gates.find(q=>q.libGate==='up');
 walkTo(g,'erden-library',up.x,up.y);assert.equal(h.map,'erden-library-2','계단으로 2층');
 step(g,60);assert.equal(h.map,'erden-library-2');
 const down=MAPS['erden-library-2'].gates[0];
 walkTo(g,'erden-library-2',down.x,down.y+300);walkTo(g,'erden-library-2',down.x,down.y);   // 계단 구멍은 아래쪽에서 들어간다assert.equal(h.map,'erden-library','계단으로 1층');
 step(g,60);
 const out=MAPS['erden-library'].gates[0];
 walkTo(g,'erden-library',out.x,out.y);assert.equal(h.map,'dawnwood','문으로 마을');
});

test('사서 · 책장 · 조사물 모두 걸어가 말을 걸 수 있고 막힌 곳에 갇히지 않는다',()=>{
 for(const m of LIBRARY_MAPS){
  for(const n of MAPS[m.id].npcs){
   const g=world(),h=g.heroes[0];Object.assign(h,{map:m.id,x:m.spawn[0],y:m.spawn[1],gateCd:3});
   assert.equal(pickNpc(m.id,n.x,n.y-20)?.id,n.id,n.id);
   const dest=npcStopPoint(h,n);assert.ok(MAPS[m.id].blocks.every(b=>distance(dest,b)>b.r+10),'대화 자리 막힘: '+n.id);
   rpgMove(g,0,{...dest,m:m.id});step(g,900);
   assert.equal(npcNear(h)?.id,n.id,`${m.id}/${n.id}: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);
   assert.ok(STORY_DIALOGUES[n.id]?.intro,n.id);
   const before=JSON.stringify({b:h.bag,c:h.coins});rpgTalk(g,0);assert.equal(JSON.stringify({b:h.bag,c:h.coins}),before);
  }
 }
 assert.equal(STORY_DIALOGUES['lib1-patch'].books,'patch');assert.equal(STORY_DIALOGUES['lib1-guide'].books,'guide');
});

test('도서관 위치는 손님 스냅샷에 그대로 보인다',()=>{
 const g=world(),h=g.heroes[0];Object.assign(h,{map:'erden-library-2',x:1200,y:1200});
 const guest=makeWorld();rpgApply(guest,rpgPack(g));assert.equal(guest.heroes[0].map,'erden-library-2');
});
