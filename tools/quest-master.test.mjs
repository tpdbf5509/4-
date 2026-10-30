import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgRequest,rpgPack,rpgApply,needXp,killCoins,MAPS,SPAWNS} from '../src/game/rpg.js';
import {REQUESTS,QUEST_AREAS,REQ_BY_NPC,questMatches,questXpRate} from '../src/game/requestData.js';
import {RESET,GIFT} from '../src/game/itemData.js';
function setup(lv=10){
 const g=makeWorld();g.mySeat=0;g.out=[];
 rpgSyncSeats(g,[{id:'q',name:'퀘스트시험',hero:{name:'퀘스트시험',job:'warrior',elem:'flame',gender:'m'}}]);
 rpgJoin(g,0,{name:'퀘스트시험',rs:RESET.id,gift:GIFT.id,lv,ts:0,coins:0,stats:{},bag:{oc:1,w:[],n:1}},'q');
 const h=g.heroes[0];Object.assign(h,{map:'plaza',x:REQ_BY_NPC.questmaster.x,y:REQ_BY_NPC.questmaster.y+30});return {g,h};
}
const take=(g,i)=>rpgRequest(g,0,{op:'take',npc:'questmaster',i});
test('모든 사냥터는 일반과 보스 퀘스트가 있고 시작 레벨이 일치한다',()=>{
 assert.equal(QUEST_AREAS.length,21);
 for(const a of QUEST_AREAS){assert(MAPS[a.id]);const qs=REQUESTS.questmaster.filter(q=>q.area===a.id);assert.equal(qs.length,2);assert.deepEqual(a.lv,SPAWNS.find(s=>s.map===a.id&&!s.boss).lv);assert.equal(qs[0].boss,false);assert.equal(qs[1].boss,true);}
});
test('상위 사냥터 수락을 막고 시작 레벨부터 허용한다',()=>{
 const {g,h}=setup(9);assert(!take(g,2));assert(!h.reqs.questmaster);h.lv=10;assert(take(g,2));assert(!take(g,0));
});
test('보스와 일반 몬스터 및 다른 맵을 구분한다',()=>{
 const q=REQUESTS.questmaster[2];assert(questMatches(q,{type:'wolf',map:'wolf',boss:false}));assert(!questMatches(q,{type:'wolf',map:'wolf',boss:true}));assert(!questMatches(q,{type:'wolf',map:'dg-1',boss:false}));
});
test('낮은 사냥터는 경험치가 감소하며 완료와 중복 보상을 검증한다',()=>{
 const {g,h}=setup(21);assert(take(g,2));h.reqs.questmaster.n=20;
 const xp=h.xp;const expected=Math.round(needXp(20)*.4*.2);
 assert.equal(questXpRate(REQUESTS.questmaster[2],20),1);
 assert(rpgRequest(g,0,{op:'done',npc:'questmaster'}));assert.equal(h.xp-xp,expected);
 assert(!rpgRequest(g,0,{op:'done',npc:'questmaster'}));
});
test('퀘스트 대상 일반 몬스터만 원래 코인이고 보스는 그대로다',()=>{
 const {g,h}=setup();const m={type:'wolf',map:'wolf',coin:100,boss:false};assert.equal(killCoins(h,m),95);
 take(g,2);assert.equal(killCoins(h,m),100);assert.equal(killCoins(h,{...m,type:'boar'}),95);
 h.reqs.questmaster.n=20;assert.equal(killCoins(h,m),95);assert.equal(killCoins(h,{...m,boss:true}),100);
});
test('퀘스트 진행이 스냅샷 왕복에서 보존된다',()=>{
 const {g,h}=setup();take(g,3);h.reqs.questmaster.n=1;
 const other=makeWorld();rpgApply(other,rpgPack(g));assert.deepEqual(other.heroes[0].reqs.questmaster,h.reqs.questmaster);
});
