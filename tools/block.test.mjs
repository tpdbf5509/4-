/* 차단 · 결투 반복 신청 막기(block.js · duel.js) */
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgDuel,rpgParty,rpgBlock,heroRecord,DUEL} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {cleanBag} from '../src/game/shop.js';
import {BLOCK} from '../src/game/block.js';
import {RESET,GIFT} from '../src/game/itemData.js';

const run=(g,t)=>{for(let n=0;n<Math.round(t/.05);n++)rpgStep(g,.05);};
function setup(n=3){
  const g=makeWorld();g.out=[];
  const seats=Array.from({length:n},(_,i)=>({id:`b-${i}`,name:`사람${i}`,hero:{name:`사람${i}`,job:'warrior',elem:'frost',gender:'m'}}));
  rpgSyncSeats(g,seats);
  seats.forEach((s,i)=>rpgJoin(g,i,{name:s.name,rs:RESET.id,gift:GIFT.id,lv:50,ts:0,bag:{oc:1}},s.id));
  g.mobs=[];return g;
}
const msgs=(g,pi)=>g.sys.filter(m=>m.who===pi).map(m=>m.msg);

test('차단한 사람의 결투 신청 · 파티 초대가 오지 않는다',()=>{
  const g=setup();
  assert(rpgBlock(g,1,{op:'add',name:'사람0'}));
  assert.deepEqual(g.heroes[1].bag.bk,['사람0']);
  assert.equal(rpgDuel(g,0,{op:'ask',to:1}),false);
  assert.equal(g.heroes[1].duelInv,null);
  assert(!msgs(g,1).some(m=>m.includes('결투를 신청')));
  rpgParty(g,0,{op:'invite',to:1});
  assert(!g.heroes[1].invite);
  // 다른 사람은 그대로 된다
  assert(rpgDuel(g,2,{op:'ask',to:1}));
  assert.equal(g.heroes[1].duelInv.from,2);
});
test('차단하면 받아 둔 신청을 지우고, 해제하면 다시 받는다',()=>{
  const g=setup();
  assert(rpgDuel(g,0,{op:'ask',to:1}));
  rpgInput(g,{cls:1,kind:'block',dir:{op:'add',name:'사람0'}});
  assert.equal(g.heroes[1].duelInv,null);
  assert(rpgBlock(g,1,{op:'del',name:'사람0'}));
  assert.deepEqual(g.heroes[1].bag.bk,[]);
  run(g,DUEL.reaskGap+.1);
  assert(rpgDuel(g,0,{op:'ask',to:1}));
});
test('내가 차단한 사람에게도 신청할 수 없고, 나 자신은 차단할 수 없다',()=>{
  const g=setup();
  assert(rpgBlock(g,0,{op:'add',name:'사람1'}));
  assert.equal(rpgDuel(g,0,{op:'ask',to:1}),false);
  assert.equal(rpgBlock(g,0,{op:'add',name:'사람0'}),false);
});
test('결투 신청은 askGap · reaskGap 간격을 지킨다',()=>{
  const g=setup();
  assert(rpgDuel(g,0,{op:'ask',to:1}));
  assert.equal(rpgDuel(g,0,{op:'ask',to:1}),false);   // 답을 기다리는 중
  rpgDuel(g,1,{op:'decline'});
  assert.equal(rpgDuel(g,0,{op:'ask',to:2}),false);   // 아무에게나 5초
  run(g,DUEL.askGap+.1);
  assert.equal(rpgDuel(g,0,{op:'ask',to:1}),false);   // 같은 사람 20초
  assert(rpgDuel(g,0,{op:'ask',to:2}));
  run(g,DUEL.reaskGap+.1);
  assert(rpgDuel(g,0,{op:'ask',to:1}));
});
test('차단 목록은 저장되고 다시 읽힌다',()=>{
  const g=setup();
  rpgBlock(g,0,{op:'add',name:'사람1'});
  const rec=heroRecord(g.heroes[0],{},null);
  assert.deepEqual(cleanBag(rec.bag).bk,['사람1']);
  assert.equal(cleanBag({}).bk,undefined);
  const many=Array.from({length:BLOCK.max+10},(_,i)=>`n${i}`);
  assert.equal(cleanBag({bk:many}).bk.length,BLOCK.max);
});
test('받아들여진 결투 뒤 다시 붙기는 기다리지 않는다',()=>{
  const g=setup();
  assert(rpgDuel(g,0,{op:'ask',to:1}));assert(rpgDuel(g,1,{op:'accept'}));
  rpgDuel(g,1,{op:'giveup'});run(g,DUEL.end+1);
  assert(rpgDuel(g,0,{op:'ask',to:1}));
});
