/* 격자 연습장(?sandbox) — 맵은 이 기기 세계에서만 쓰고 스냅샷 맵 차례에는 없다. 허수아비 · 훈련장 기능이 이 맵에서도 듣는다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgInput} from '../src/game/rpgInput.js';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgTrain,trainView,sandboxDummies,testSpots,MAPS,RPG,SNAP_ORDER,dist} from '../src/game/rpg.js';
import {SANDBOX} from '../src/game/sandboxData.js';
import {RESET,GIFT} from '../src/game/itemData.js';

const world=()=>{
  const g=makeWorld();g.mySeat=0;g.out=null;g.test=1;g.high=true;
  rpgSyncSeats(g,[{id:'sb',name:'연습',hero:{name:'연습',job:'warrior',gender:'m'}}]);
  rpgJoin(g,0,{name:'연습',ts:1,lv:200,rs:RESET.id,gift:GIFT.id,stats:{str:300},bag:{oc:1,w:[],n:1}},'sb');
  const h=g.heroes[0];h.map=SANDBOX.id;[h.x,h.y]=SANDBOX.spawn;return g;
};

test('격자 연습장 맵은 MAPS 에만 있고 스냅샷 맵 차례 · 테스트 서버 이동 목록에는 없다',()=>{
  assert.ok(MAPS[SANDBOX.id]&&MAPS[SANDBOX.id].grid&&MAPS[SANDBOX.id].train);
  assert.ok(!SNAP_ORDER.maps.includes(SANDBOX.id));
  assert.ok(!testSpots().some(q=>q.ids.includes(SANDBOX.id)));
});

test('허수아비는 고른 자리에 서고, 치면 초당 피해가 쌓이며 쓰러지지 않는다',()=>{
  const g=world(),h=g.heroes[0];
  sandboxDummies(g,SANDBOX.id,[[h.x+SANDBOX.cell*2,h.y],[h.x+SANDBOX.cell*12,h.y]]);
  const ds=g.mobs.filter(m=>m.type==='dummy'&&m.map===SANDBOX.id);
  assert.equal(ds.length,2);
  assert.equal(Math.round(dist(h.x,h.y,ds[0].x,ds[0].y)/SANDBOX.cell),2,'한 칸 = 게임 거리 50');
  sandboxDummies(g,SANDBOX.id,[[h.x+SANDBOX.cell*2,h.y]]);
  assert.equal(g.mobs.filter(m=>m.type==='dummy'&&m.map===SANDBOX.id).length,1,'다시 세우면 예전 것은 치운다');
  rpgInput(g,{cls:0,kind:'fire',dir:true});
  for(let i=0;i<120;i++)rpgStep(g,1/30);
  const t=trainView(g,h);
  assert.ok(t.hits>0&&t.tot>0,'맞힌 기록이 남는다');
  assert.ok(g.mobs.some(m=>m.type==='dummy'&&m.map===SANDBOX.id&&!m.dead));
});

test('무적 · 쿨타임 끄기가 이 맵에서도 켜진다',()=>{
  const g=world(),h=g.heroes[0];
  assert.ok(rpgTrain(g,0,{op:'god'}));
  assert.ok(rpgTrain(g,0,{op:'nocd'}));
  h.sk=5;rpgStep(g,1/30);
  assert.equal(h.sk,0);
  assert.equal(h.map,SANDBOX.id);
  assert.ok(h.y>=MAPS[SANDBOX.id].top);
  assert.ok(Number.isFinite(RPG.squash));
});

test('크림슨 레퀴엠을 막 든 캐릭터의 첫 평타가 멈추지 않는다(11월 16일 — h.ws 없이 혈흔을 쌓다 판정이 멈췄다)',()=>{
  const g=makeWorld();g.mySeat=0;g.out=null;g.test=1;g.high=true;
  rpgSyncSeats(g,[{id:'sb',name:'연습',hero:{name:'연습',job:'warrior',gender:'m'}}]);
  rpgJoin(g,0,{name:'연습',ts:1,lv:200,rs:RESET.id,gift:GIFT.id,stats:{str:300},bag:{oc:1,w:[{u:1,sp:'blood_gun',p:0}],e:1,n:2}},'sb');
  const h=g.heroes[0];h.map=SANDBOX.id;[h.x,h.y]=SANDBOX.spawn;
  delete h.ws;
  sandboxDummies(g,SANDBOX.id,[[h.x+SANDBOX.cell*2,h.y]]);
  rpgInput(g,{cls:0,kind:'fire',dir:true});
  assert.doesNotThrow(()=>{for(let i=0;i<40;i++)rpgStep(g,0.05);});
  assert.ok(trainView(g,h).hits>0,'허수아비를 맞혔다');
});

test("히든 직업 스킬 설명 — 세 직업 모두 평타 + 스킬 일곱 · 빈 값 없음", async () => {
  const { hiddenSkillInfo, HIDDEN_SKILL_JOBS } = await import("../src/game/hiddenSkillInfo.js");
  for (const id of HIDDEN_SKILL_JOBS) {
    const v = hiddenSkillInfo(id);
    assert.equal(v.skills.length, 7, id);
    for (const q of [v.basic, ...v.skills]) {
      assert.ok(q.name && q.act && q.lv >= 1 && q.desc.length && q.stats.length, `${id} ${q.s}`);
      assert.ok(!/undefined|NaN/.test(JSON.stringify(q)), `${id} ${q.s}`);
    }
  }
});
