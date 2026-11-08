// RPG 테스트 모드(?test, 11월 7일) — 테스트 방만 무적 · 어디서나 초당 피해 · 장소 이동이 되고, 저장 · 거래는 하지 않는다.
// 시험: node --test tools/test-mode.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgTrain,trainView,testSpots,MAPS,RPG_TEST_SERVER} from '../src/game/rpg.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {RpgRoom} from '../server/src/room.js';

const world=(testOn)=>{const g=makeWorld();g.test=testOn;g.mySeat=0;rpgSyncSeats(g,[{id:'tm-test',name:'시험',hero:{name:'시험',job:'warrior',gender:'m'}}]);rpgJoin(g,0,{name:'시험',lv:30,rs:RESET.id,gift:GIFT.id,stats:{},bag:{oc:1,w:[],n:1}},'tm-test');return g;};
const step=(g,n)=>{for(let i=0;i<n;i++)rpgStep(g,1/30);};

test('테스트 방은 어느 맵으로나 옮기고, 일반 방은 옮기지 않는다',()=>{
 const t=world(true),h=t.heroes[0];
 for(const id of ['spider','fallen','dawnwood','worldboss','lumen']){
  assert.equal(rpgTrain(t,0,{op:'go',map:id}),true,id);assert.equal(h.map,id);
 }
 assert.equal(rpgTrain(t,0,{op:'go',map:'stone1-0'}),false,'던전은 입장 규칙이 있어 뺀다');
 assert.equal(rpgTrain(t,0,{op:'go',map:'arena'}),false,'결투장도 뺀다');
 const n=world(false);
 assert.equal(rpgTrain(n,0,{op:'go',map:'spider'}),false);assert.equal(n.heroes[0].map,'plaza');
 assert.ok(testSpots().every((q)=>q.ids.every((id)=>MAPS[id]&&!MAPS[id].dungeon)));
});

test('테스트 방 무적 — 사냥터 몹에게 맞아도 체력이 줄지 않는다',()=>{
 const g=world(true),h=g.heroes[0];
 rpgTrain(g,0,{op:'go',map:'spider'});
 assert.equal(rpgTrain(g,0,{op:'god'}),true);
 const m=g.mobs.find((q)=>q.map==='spider'&&!q.dead);[h.x,h.y]=[m.x+20,m.y];
 step(g,30*20);
 assert.equal(h.down,0);assert.equal(h.hp,h.max);
});

test('일반 방은 훈련장 밖에서 무적을 켤 수 없다',()=>{
 const g=world(false);
 assert.equal(rpgTrain(g,0,{op:'god'}),false);
 assert.ok(!g.heroes[0].trn||!g.heroes[0].trn.god);
});

test('테스트 방 초당 피해 — 허수아비가 아닌 몹을 쳐도 센다',()=>{
 const g=world(true),h=g.heroes[0];
 rpgTrain(g,0,{op:'go',map:'field'});rpgTrain(g,0,{op:'god'});
 h.auto=true;
 const m=g.mobs.find((q)=>q.map==='field'&&!q.dead);[h.x,h.y]=[m.x+30,m.y];
 step(g,30*4);
 const v=trainView(g,h);
 assert.ok(v.tot>0&&v.hits>0,`쌓인 피해 ${v.tot}`);
});

test('테스트 서버 방은 저장하지 않고 거래 · 길드 · 장터를 막는다',async()=>{
 let saves=0;
 const env={LEDGER:{idFromName:()=>1,get:()=>({fetch:async(url)=>{if(String(url).endsWith('rpg_srv_save'))saves+=1;return new Response(JSON.stringify({ok:true}));}})}};
 const r=new RpgRoom({},env);
 r.test=true;r.start();r.stop();
 assert.equal(r.g.test,true);
 r.seats[0]={id:'a1b2c3d4',name:'가',hero:{name:'가',job:'warrior',elem:'flame',gender:'m'}};
 r.publish();
 r.accts.set('a1b2c3d4',{name:'가',tok:'t',base:{name:'가',lv:1},admin:false,look:r.seats[0].hero,savedKey:'',dead:false});
 const sent=[];r.conns.set('a1b2c3d4',{id:'a1b2c3d4',ws:{send(m){sent.push(JSON.parse(m));}},gone:0});
 r.rjoin(r.conns.get('a1b2c3d4'),{cls:0,data:{}});
 r.g.heroes[0].lv=99;
 await r.saveOne('a1b2c3d4');
 assert.equal(saves,0,'저장 요청이 장부로 가지 않는다');
 for(const fn of ['trade_open','trade_action','guild_action','market','abyss_claim']){
  r.ledger(r.conns.get('a1b2c3d4'),{rid:1,fn,args:{}});
 }
 await new Promise((res)=>setTimeout(res,30));
 const errs=sent.filter((m)=>m.k==='ledger').map((m)=>m.d.res.err);
 assert.deepEqual(errs,['test','test','test','test','test']);
 assert.equal(RPG_TEST_SERVER,'RPGT');
});
