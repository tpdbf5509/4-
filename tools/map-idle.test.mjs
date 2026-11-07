// 사람이 없는 맵은 멈추고, 들어오면 다시 돈다(11월 7일). 시험: node --test tools/map-idle.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,MAPS,mapsAwake} from '../src/game/rpg.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const world=()=>{const g=makeWorld();g.mySeat=0;rpgSyncSeats(g,[{id:'idle-test',name:'멈춤시험',hero:{name:'멈춤시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'멈춤시험',lv:30,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'idle-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};
const pos=(g,map)=>g.mobs.filter(m=>m.map===map).map(m=>`${m.id}:${m.x.toFixed(2)},${m.y.toFixed(2)},${m.age?.toFixed?.(2)}`).join('|');

test('사람이 없는 사냥터의 몹은 움직이지 않고, 들어가면 다시 움직인다',()=>{
 const g=world();step(g,30);
 const h=g.heroes[0];assert.equal(h.map,'plaza');
 assert.ok(!mapsAwake(g).has('wolf'));
 const before=pos(g,'wolf');assert.ok(before.length>0,'늑대 사냥터에 몹이 있다');
 step(g,300);
 assert.equal(pos(g,'wolf'),before,'빈 맵의 몹이 그대로다');
 h.map='wolf';[h.x,h.y]=MAPS.wolf.spawn;
 step(g,300);
 assert.notEqual(pos(g,'wolf'),before,'사람이 들어가면 몹이 다시 움직인다');
});

test('빈 맵은 다시 나오기까지 남은 시간도 멈춘다',()=>{
 const g=world();step(g,5);
 const gi=g.mobs.find(m=>m.map==='wolf').gi;
 const victim=g.mobs.find(m=>m.map==='wolf'&&m.gi===gi);victim.dead=true;
 step(g,1);
 const r=g.respawn.find(q=>q.gi===gi);assert.ok(r,'다시 나오기 대기가 생겼다');
 const t=r.t;step(g,600);
 assert.equal(g.respawn.find(q=>q.gi===gi)?.t,t,'빈 맵이라 시간이 줄지 않는다');
 const h=g.heroes[0];h.map='wolf';[h.x,h.y]=MAPS.wolf.spawn;
 step(g,Math.ceil(t*30)+5);
 assert.ok(!g.respawn.some(q=>q.gi===gi),'사람이 들어가자 다시 나왔다');
});

test('훈련장 허수아비는 사람이 나가면 치운다',()=>{
 const g=world();const h=g.heroes[0];h.map='train';[h.x,h.y]=MAPS.train.spawn;step(g,3);
 assert.ok(g.mobs.some(m=>m.type==='dummy'));
 h.map='plaza';[h.x,h.y]=MAPS.plaza.spawn;step(g,3);
 assert.ok(!g.mobs.some(m=>m.type==='dummy'));
});
