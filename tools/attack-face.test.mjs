/* 평타 때 몸 방향(11월 18일 버그) — 좌우를 보고 치면 옆을 보고, 치는 순간 앞(face 0)으로 돌아가지 않는다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgInput} from '../src/game/rpgInput.js';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,sandboxDummies} from '../src/game/rpg.js';
import {SANDBOX} from '../src/game/sandboxData.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {faceAim} from '../src/game/faceDir.js';

const world=(job)=>{
  const g=makeWorld();g.mySeat=0;g.out=null;g.test=1;g.high=true;
  rpgSyncSeats(g,[{id:'sb',name:'연습',hero:{name:'연습',job,gender:'m'}}]);
  rpgJoin(g,0,{name:'연습',ts:1,lv:200,rs:RESET.id,gift:GIFT.id,stats:{str:300},bag:{oc:1,w:[],n:1}},'sb');
  const h=g.heroes[0];h.map=SANDBOX.id;[h.x,h.y]=SANDBOX.spawn;return g;
};
const walk=(g,d)=>{rpgInput(g,{cls:0,kind:'hold',dir:[d]});rpgStep(g,1/30);rpgInput(g,{cls:0,kind:'hold',dir:[]});rpgStep(g,1/30);};

for(const job of ['warrior','mage','archer'])for(const [side,dx] of [['left',-1],['right',1]]){
  test(`${job} — ${side} 를 보고 옆의 허수아비를 쳐도 옆을 본다`,()=>{
    const g=world(job),h=g.heroes[0];
    sandboxDummies(g,SANDBOX.id,[[h.x+dx*SANDBOX.cell*2,h.y]]);
    walk(g,side);
    assert.equal(h.face,1);assert.equal(h.dir,dx);
    rpgInput(g,{cls:0,kind:'fire',dir:true});
    for(let i=0;i<20;i++){rpgStep(g,1/30);assert.equal(h.face,1,'치는 동안 옆');assert.equal(h.dir,dx);}
    rpgInput(g,{cls:0,kind:'fire',dir:false});rpgStep(g,1/30);
    assert.equal(h.face,1,'다 친 뒤에도 옆');
  });
}

test('허공 평타도 바라보던 쪽을 지킨다',()=>{
  const g=world('warrior'),h=g.heroes[0];
  sandboxDummies(g,SANDBOX.id,[]);
  for(const [d,face] of [['left',1],['right',1],['up',2],['down',0]]){
    walk(g,d);
    rpgInput(g,{cls:0,kind:'fire',dir:true});
    for(let i=0;i<10;i++)rpgStep(g,1/30);
    rpgInput(g,{cls:0,kind:'fire',dir:false});rpgStep(g,1/30);
    assert.equal(h.face,face,d);
  }
});

test('faceAim — 걸을 때와 같은 기준',()=>{
  const h={dir:1,face:1};
  faceAim(h,-1,0.1);assert.deepEqual([h.dir,h.face],[-1,1]);
  faceAim(h,0.1,-1);assert.equal(h.face,2);
  faceAim(h,0.1,1);assert.equal(h.face,0);
  faceAim(h,0,0);assert.equal(h.face,0,'방향이 없으면 그대로');
});
