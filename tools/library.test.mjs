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

test('도서관 두 층은 스냅샷 맵 목록에서 제자리(연구시설 다음, 115 · 116)를 지키고 안전 지역이다',()=>{
 // 11월 16일 — 뒤에 Gambler 002 카지노 뒷방이 붙었다. 맵 차례는 뒤에만 더하므로 도서관 번호는 그대로다
 const at=mapIdx('bloodlab');
 assert.deepEqual(LIBRARY_MAPS.map(m=>mapIdx(m.id)),[at+1,at+2]);
 assert.deepEqual(LIBRARY_MAPS.map(m=>mapIdx(m.id)),[115,116]);
 assert.ok(SNAP_ORDER.maps.length>=118);
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
 assert.equal(STORY_DIALOGUES['lib1-patch'].books,'patch');assert.equal(MAPS['erden-library'].npcs.find(n=>n.id==='lib1-shelf').shelf,'village');assert.equal(MAPS['erden-library-2'].npcs.find(n=>n.id==='lib2-shelf').shelf,'legend');
});

test('도서관 위치는 손님 스냅샷에 그대로 보인다',()=>{
 const g=world(),h=g.heroes[0];Object.assign(h,{map:'erden-library-2',x:1200,y:1200});
 const guest=makeWorld();rpgApply(guest,rpgPack(g));assert.equal(guest.heroes[0].map,'erden-library-2');
});

import {LIB_BOOKS,LIB_TABS,LIB_LOOKS,shelfRows,libBookOpen} from '../src/game/libraryBooks.js';
test('장서 11권(+ 루엔 전용 한 권) — 탭 셋 · 두 쪽 · 책장에 한 번씩 꽂히고 나머지는 고를 수 없는 꽂이 책',()=>{
 assert.equal(LIB_BOOKS.filter(b=>!b.only).length,11);
 assert.deepEqual(LIB_TABS.map(t=>t.name),['마을 기록','수송대','전설 · 민담']);
 for(const b of LIB_BOOKS){assert.equal(b.pages.length,2,b.id);assert.ok(LIB_LOOKS[b.look]&&b.spine&&b.title&&b.by,b.id);}
 for(const t of LIB_TABS){
  const real=shelfRows(t.id).flat().filter(s=>s.book).map(s=>s.book.id).sort();
  assert.deepEqual(real,LIB_BOOKS.filter(b=>b.tab===t.id&&!b.only).map(b=>b.id).sort(),t.id);
 }
});
test('붉은 강 설화는 처음부터 전설 · 민담에 있고 001 단서는 오른쪽 쪽 마지막 문장에만',()=>{
 const b=LIB_BOOKS.find(q=>q.id==='red-river');
 assert.equal(b.tab,'legend');assert.ok(libBookOpen(b,null,false));
 const text=(blk)=>typeof blk==='string'?blk:Object.values(blk).join(' ');
 const all=b.pages.flat().map(text);
 assert.deepEqual(all.map((t,k)=>t.includes('001')?k:-1).filter(k=>k>=0),[all.length-1]);
 assert.ok(b.pages[1].at(-1).end);
});
test('수송대 일지 · 검사표는 1장, 축제 · 리아의 수첩은 4장을 마치면 열린다',()=>{
 const by=(id)=>LIB_BOOKS.find(q=>q.id===id);
 assert.equal(libBookOpen(by('guard'),{ch:1},false),false);assert.equal(libBookOpen(by('guard'),{ch:2},false),true);
 assert.equal(libBookOpen(by('lia'),{ch:4},false),false);assert.equal(libBookOpen(by('lia'),{ch:5},false),true);
 assert.equal(libBookOpen(by('lia'),{done:true},false),true);assert.equal(libBookOpen(by('lia'),null,true),true);
});
