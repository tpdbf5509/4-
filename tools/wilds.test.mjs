/* 에르덴 바깥 장소(wildsData.js) — 별이슬숲. 맵 차례는 맨 뒤 · 문은 테스트 서버에서만 · 마을 ↔ 숲 · 나무가 길 · 출구를 막지 않는다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgMove,rpgTalk,npcNear,mapIdx,MAPS,RPG,SNAP_ORDER,gatesOf} from '../src/game/rpg.js';
import {WILD_MAPS,WILD_PLANTS,WILD_VILLAGE_GATE,WILDS} from '../src/game/wildsData.js';
import {DEW_PLANTS} from '../src/game/wildsPlant.js';
import {npcStopPoint} from '../src/game/mouseMove.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=(t)=>{const g=makeWorld();g.mySeat=0;g.test=t;rpgSyncSeats(g,[{id:'w-test',name:'숲시험',hero:{name:'숲시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'숲시험',lv:5,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'w-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/RPG.squash);
const walkTo=(g,m,x,y)=>{rpgMove(g,0,{x,y,m});step(g,500);};

test('별이슬숲은 맵 목록 맨 뒤에 붙고 안전 지역이다',()=>{
 assert.equal(SNAP_ORDER.maps.at(-1),'dew-forest');
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

test('나무는 빼곡하고(400그루 넘게) 그림 파일이 모두 있다',()=>{
 assert.ok(DEW_PLANTS.length>400,String(DEW_PLANTS.length));
 assert.ok(DEW_PLANTS.every(([k])=>WILD_PLANTS[k]));
 WILD_PLANTS.forEach(p=>assert.ok(existsSync(`public/assets/game/rpg/story/places/prop-${p.look}.webp`),p.look));
 assert.ok(existsSync('public/assets/game/rpg/story/ground/dew-forest.webp'));
});
