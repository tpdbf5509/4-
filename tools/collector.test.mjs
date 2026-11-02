import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgRequest,rpgPack,rpgApply} from '../src/game/rpg.js';
import {REQUESTS,REQ_BY_NPC} from '../src/game/requestData.js';
import {RESET,GIFT,DROPS,MAT_BY_ID} from '../src/game/itemData.js';
function setup(lv){
 const g=makeWorld();g.mySeat=0;g.out=[];
 rpgSyncSeats(g,[{id:'c',name:'수집시험',hero:{name:'수집시험',job:'warrior',elem:'flame',gender:'m'}}]);
 rpgJoin(g,0,{name:'수집시험',rs:RESET.id,gift:GIFT.id,lv,ts:0,coins:0,stats:{},bag:{oc:1,w:[],n:1}},'c');
 const h=g.heroes[0];Object.assign(h,{map:'plaza',x:REQ_BY_NPC.collector.x,y:REQ_BY_NPC.collector.y+30});return {g,h};
}
const L=REQUESTS.collector;
test('보리는 고릴라 가죽 다음부터 800레벨 사냥터 보스 재료까지 받는다',()=>{
 const want=['bone','rot','soul','core','mane','silk','ember','magma','dscale','ifflame','wplate','pearl','voidc','dfeather'];
 assert.deepEqual(L.slice(0,4).map(q=>q.mat),['fur','fang','tusk','hide']);
 assert.deepEqual(L.slice(4).map(q=>q.mat),want);
 const dropped=new Set(Object.values(DROPS).map(d=>d.id));
 L.forEach((q,i)=>{assert(dropped.has(q.mat));if(i)assert(q.lv>=L[i-1].lv);});
 L.slice(4).forEach(q=>assert.equal(q.coin,MAT_BY_ID[q.mat].sell*q.n*2.5));
});
test('레벨이 모자라면 못 받고 재료를 내면 코인을 받는다',()=>{
 const i=L.findIndex(q=>q.mat==='dfeather');
 const {g,h}=setup(749);assert(!rpgRequest(g,0,{op:'take',npc:'collector',i}));
 h.lv=750;assert(rpgRequest(g,0,{op:'take',npc:'collector',i}));
 assert(!rpgRequest(g,0,{op:'done',npc:'collector'}));
 h.bag.m.dfeather=7;const c=h.coins;
 const other=makeWorld();rpgApply(other,rpgPack(g));assert.deepEqual(other.heroes[0].reqs.collector,h.reqs.collector);
 assert(rpgRequest(g,0,{op:'done',npc:'collector'}));
 assert.equal(h.coins-c,L[i].coin);assert.equal(h.bag.m.dfeather,1);assert(!h.reqs.collector);
});
