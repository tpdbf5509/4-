/* 에르덴 바깥 장소(wildsData.js) — 숲 셋 · 루엔 마을 · 루엔 도서관 · 서리봉 · 칼등산. 맵 차례는 맨 뒤 · 문은 테스트 서버에서만 · 마을 ↔ 숲 · 나무가 길 · 출구를 막지 않는다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgMove,rpgTalk,npcNear,mapIdx,MAPS,RPG,SNAP_ORDER,gatesOf} from '../src/game/rpg.js';
import {WILD_MAPS,WILD_SETS,WILD_VILLAGE_GATE,WILDS,LUEN_LIBRARY_MAPS,WILD_PEOPLE} from '../src/game/wildsData.js';
import {LIBRARY_MAPS} from '../src/game/libraryData.js';
import * as PLANTS from '../src/game/wildsPlant.js';
import {npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=(t)=>{const g=makeWorld();g.mySeat=0;g.test=t;rpgSyncSeats(g,[{id:'w-test',name:'숲시험',hero:{name:'숲시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'숲시험',lv:5,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'w-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/RPG.squash);
const walkTo=(g,m,x,y)=>{rpgMove(g,0,{x,y,m});step(g,500);};

test('바깥 장소는 맵 목록 맨 뒤에 차례로 붙고 안전 지역이다',()=>{
 { const i=SNAP_ORDER.maps.indexOf('dew-forest'); assert.deepEqual(SNAP_ORDER.maps.slice(i,i+8),['dew-forest','lantern-forest','scree-forest','luen','frost-peak','blade-ridge','luen-library','luen-library-2']); }   // 뒤에는 Illusionist 005 획득 루트 맵(iq_*)이 붙는다
 assert.ok(mapIdx('dew-forest')>mapIdx('erden-library-2'));
 WILD_MAPS.forEach(m=>assert.ok(MAPS[m.id].safe&&MAPS[m.id].wild));
});

test('실제 게임에 열렸다(live) — 일반 방 · 테스트 방 모두 마을 문이 보인다',()=>{
 assert.equal(WILDS.live,true);
 const has=(g)=>gatesOf(g,MAPS.dawnwood).some(q=>q.to==='dew-forest');
 assert.equal(has(world(false)),true);assert.equal(has(world(true)),true);
});

test('마을 동쪽 문 → 별이슬숲 → 서쪽 출구 → 마을',()=>{
 const g=world(true),h=g.heroes[0],q=WILD_VILLAGE_GATE;
 Object.assign(h,{map:'dawnwood',x:q.back[0],y:q.back[1],gateCd:0});
 walkTo(g,'dawnwood',q.x,q.y);assert.equal(h.map,'dew-forest','마을 → 숲');
 step(g,60);assert.equal(h.map,'dew-forest','들어오자마자 나가지 않는다');
 const out=MAPS['dew-forest'].gates[0];
 walkTo(g,'dew-forest',out.x,out.y);assert.equal(h.map,'dawnwood','숲 → 마을');
 const g2=world(false),h2=g2.heroes[0];Object.assign(h2,{map:'dawnwood',x:q.back[0],y:q.back[1],gateCd:0});
 walkTo(g2,'dawnwood',q.x,q.y);assert.equal(h2.map,'dew-forest','일반 방에서도');
 // 마우스로 이름표(문 40 위)를 눌러도 들어간다 — 11월 22일 입장 제보
 const g3=world(false),h3=g3.heroes[0];Object.assign(h3,{map:'dawnwood',x:q.back[0],y:q.back[1],gateCd:0});
 walkTo(g3,'dawnwood',q.x,q.y-40);assert.equal(h3.map,'dew-forest','이름표를 눌러도');
});

test('나무는 출구 · 들어오는 자리 · 연못 대화 자리를 막지 않고, 숲 가운데 빈터까지 걸어간다',()=>{
 const M=MAPS['dew-forest'],free=(p)=>M.blocks.every(b=>distance(p,b)>b.r+12);
 assert.ok(free({x:M.spawn[0],y:M.spawn[1]}),'들어오는 자리');
 M.gates.forEach(q=>assert.ok(free(q),'출구 '+q.label));
 const g=world(true),h=g.heroes[0];Object.assign(h,{map:'dew-forest',x:M.spawn[0],y:M.spawn[1],gateCd:3});
 walkTo(g,'dew-forest',1650,1060);step(g,300);
 assert.ok(Math.hypot(h.x-1650,h.y-1060)<60,`빈터까지: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);
 const pond=M.npcs.find(n=>n.id==='dew-pond');
 rpgMove(g,0,{...npcStopPoint(h,pond),m:'dew-forest'});step(g,600);
 assert.equal(npcNear(h)?.id,'dew-pond');rpgTalk(g,0);
});

test('나무는 빼곡하고(숲마다 400그루 넘게) 그림 파일이 모두 있다',()=>{
 const lists={dew:PLANTS.DEW_PLANTS,lantern:PLANTS.LANTERN_PLANTS,scree:PLANTS.SCREE_PLANTS};
 for(const [set,list] of Object.entries(lists)){
  assert.ok(list.length>400,set+' '+list.length);assert.ok(list.every(([k])=>WILD_SETS[set][k]),set);
  WILD_SETS[set].forEach(p=>assert.ok(existsSync(`public/assets/game/rpg/story/places/prop-${p.look}.webp`),p.look));
 }
 WILD_MAPS.forEach(m=>assert.ok(existsSync(`public/assets/game/rpg/story/ground/${m.id}.webp`),m.id));
 assert.ok(PLANTS.LANTERN_PLANTS.filter(([k])=>k===6).length>=4,'등불 기둥');
 for(const [set,list] of [['frost',PLANTS.FROST_PLANTS],['ridge',PLANTS.RIDGE_PLANTS]]){
  assert.ok(list.length>20&&list.every(([k])=>WILD_SETS[set][k]),set);
  WILD_SETS[set].forEach(p=>assert.ok(existsSync(`public/assets/game/rpg/story/places/prop-${p.look}.webp`),p.look));
 }
 LUEN_LIBRARY_MAPS.forEach(m=>assert.ok(existsSync(`public/assets/game/rpg/story/ground/${m.id}.webp`),m.id));
 MAPS.luen&&WILD_MAPS.find(m=>m.id==='luen').buildings.forEach(b=>assert.ok(existsSync(`public/assets/game/rpg/story/places/${b.id}.webp`),b.id));
 Object.keys(WILD_PEOPLE).forEach(w=>{assert.ok(existsSync(`public/assets/game/rpg/story/people/${w}.webp`),w);assert.ok(existsSync(`public/assets/game/rpg/story/portraits/${w}.webp`),w);});
});

test('루엔 도서관 — 에르덴과 같은 책장 · 같은 책, 사서만 다르다',()=>{
 LUEN_LIBRARY_MAPS.forEach((m,i)=>{
  const E=LIBRARY_MAPS[i];
  assert.deepEqual(m.sights.map(s=>s.shelf||null),E.sights.map(s=>s.shelf||null));
  assert.deepEqual(m.sights.map(s=>s.books||null),E.sights.map(s=>s.books||null));
  m.npcs.forEach(n=>assert.equal(n.who,'luen-librarian'));
 });
 assert.equal(WILD_PEOPLE['luen-librarian'].name.includes('서하'),true);
});

test('칼등산 능선 밖 벼랑은 걸을 수 없다',()=>{
 const g=world(false),h=g.heroes[0],M=MAPS['blade-ridge'];Object.assign(h,{map:'blade-ridge',x:M.spawn[0],y:M.spawn[1],gateCd:3});
 walkTo(g,'blade-ridge',M.spawn[0],M.spawn[1]+600);
 assert.ok(h.y<M.spawn[1]+200,`벼랑 아래로: ${h.y.toFixed(0)}`);
});

test('숲끼리 오간다 — 별이슬숲 ↔ 등불고개 숲 · 너덜재 숲, 출구 · 들어오는 자리는 막히지 않고 조사물에 말을 건다',()=>{
 for(const m of [...WILD_MAPS,...LUEN_LIBRARY_MAPS]){
  const M=MAPS[m.id],free=(p)=>M.blocks.every(b=>distance(p,b)>b.r+12);
  assert.ok(free({x:M.spawn[0],y:M.spawn[1]}),m.id+' 들어오는 자리');
  M.gates.forEach(q=>{assert.ok(free(q),m.id+' 출구 '+q.label);assert.ok(MAPS[q.to].blocks.every(b=>distance({x:q.at[0],y:q.at[1]},b)>b.r+12),m.id+' → '+q.to+' 도착 자리');});
  for(const q of M.gates){
   const g=world(false),h=g.heroes[0];Object.assign(h,{map:m.id,x:M.spawn[0],y:M.spawn[1],gateCd:2});step(g,70);
   if(LUEN_LIBRARY_MAPS.includes(m))walkTo(g,m.id,q.x,q.y+300);   // 도서관 계단 구멍은 아래쪽에서 들어간다(library.test 와 같다)
   rpgMove(g,0,{x:q.x,y:q.y,m:m.id});step(g,1500);
   assert.equal(h.map,q.to,`${m.id} → ${q.to}: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);
  }
  for(const n of M.npcs){
   const g=world(false),h=g.heroes[0];Object.assign(h,{map:m.id,x:M.spawn[0],y:M.spawn[1],gateCd:3});
   rpgMove(g,0,{...npcStopPoint(h,n),m:m.id});step(g,1500);
   assert.equal(npcNear(h)?.id,n.id,`${m.id}/${n.id}: ${h.x.toFixed(0)},${h.y.toFixed(0)}`);
  }
 }
});
