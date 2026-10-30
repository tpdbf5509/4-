import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,MAPS} from '../src/game/rpg.js';
import {rpgShop,cleanBag,whyBagExpand,matBuyPrice} from '../src/game/shop.js';
import {SHOPS,weaponCap} from '../src/game/shopData.js';
import {armorCap} from '../src/game/armorData.js';
import {JUNK} from '../src/game/junkData.js';
import {MAT_BY_ID} from '../src/game/itemData.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {tradeExchange} from '../server/src/ledger-trade.js';
const junk=SHOPS.find(s=>s.id==='junk');
function setup(coins=1e7,mats={}){
 const g=makeWorld();g.mySeat=0;g.out=[];
 rpgSyncSeats(g,[{id:'j',name:'잡화시험',hero:{name:'잡화시험',job:'warrior',elem:'flame',gender:'m'}}]);
 rpgJoin(g,0,{name:'잡화시험',rs:RESET.id,gift:GIFT.id,lv:50,ts:0,coins,stats:{},bag:{oc:1,w:[],n:1,m:mats}},'j');
 const h=g.heroes[0];Object.assign(h,{map:'plaza',x:junk.x,y:junk.y+30,coins});return {g,h};
}
const allMats=()=>Object.fromEntries(Object.keys(MAT_BY_ID).map(id=>[id,500]));
test('광장에 잡동산이 상점 NPC 가 있다',()=>{
 assert(MAPS.plaza.npcs.some(n=>n.shop==='junk'));
});
test('재료와 코인으로 가방을 단계마다 넓히고 끝에서 멈춘다',()=>{
 const {g,h}=setup(1e7,allMats());
 assert.equal(weaponCap(h),30);assert.equal(armorCap(h),30);
 for(let i=0;i<JUNK.steps.length;i++){
  const before=h.coins,st=JUNK.steps[i];
  const r=rpgShop(g,0,{op:'bagx'});assert(r.ok,r.msg);
  assert.equal(before-h.coins,st.coins);
  assert.equal(weaponCap(h),30+(i+1)*JUNK.step);assert.equal(armorCap(h),30+(i+1)*JUNK.step);
 }
 assert.equal(rpgShop(g,0,{op:'bagx'}).ok,false);
 assert.equal(weaponCap(h),60);
});
test('재료가 모자라거나 멀리 있으면 넓히지 않는다',()=>{
 const {g,h}=setup(1e7,{});
 assert(whyBagExpand(h).some(x=>x.includes('부족')));assert.equal(rpgShop(g,0,{op:'bagx'}).ok,false);
 const s=setup(1e7,allMats());s.h.x=200;s.h.y=200;assert.equal(rpgShop(s.g,0,{op:'bagx'}).ok,false);
});
test('넓힌 칸은 기록을 다시 실어도 남고 그만큼 무기를 싣는다',()=>{
 const w=Array.from({length:40},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:10}));
 assert.equal(cleanBag({w,bx:2}).w.length,40);
 assert.equal(cleanBag({w,bx:2}).bx,2);
 assert.equal(cleanBag({w}).w.length,30);
 assert.equal(cleanBag({bx:99}).bx,JUNK.steps.length);
});
test('재료를 사고 하루 한도를 지킨다',()=>{
 const {g,h}=setup(1e7,{});
 const r=rpgShop(g,0,{op:'mbuy',id:'fur',n:5});assert(r.ok,r.msg);
 assert.equal(h.bag.m.fur,5);assert.equal(1e7-h.coins,matBuyPrice('fur')*5);
 assert.equal(matBuyPrice('fur'),MAT_BY_ID.fur.sell*JUNK.buyMul);
 assert.equal(rpgShop(g,0,{op:'mbuy',id:'blue',n:1}).ok,false);   // 강화석은 팔지 않는다
 assert(rpgShop(g,0,{op:'mbuy',id:'fang',n:JUNK.buyDaily-5}).ok);
 assert.equal(rpgShop(g,0,{op:'mbuy',id:'fang',n:1}).ok,false);
});
test('잡동산이 상점에서도 재료를 판다',()=>{
 const {g,h}=setup(0,{fur:3});
 assert(rpgShop(g,0,{op:'msell',id:'fur',n:3,shop:'junk'}).ok);assert.equal(h.coins,MAT_BY_ID.fur.sell*3);
});
test('거래로 받는 칸도 넓힌 만큼 는다',()=>{
 const w=Array.from({length:30},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:10}));
 const inn={coins:0,items:[{k:'w',u:'x',n:1,item:{t:'sword',r:0,g:0,p:10}}]};
 assert.throws(()=>tradeExchange({coins:0,bag:{w,n:31}},{coins:0,items:[]},inn));
 assert.equal(tradeExchange({coins:0,bag:{w,n:31,bx:1}},{coins:0,items:[]},inn).bag.w.length,31);
});
