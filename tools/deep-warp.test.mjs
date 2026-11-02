import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,MAPS} from '../src/game/rpg.js';
import {rpgShop,whyWarp,addMat} from '../src/game/shop.js';
import {WARP} from '../src/game/shopData.js';
import {DEEP,DEEP_MAPS} from '../src/game/deepData.js';
import {RESET,GIFT} from '../src/game/itemData.js';

// 계몽의 눈 지역 워프 — 레벨 400 + 계몽의 눈이 있어야 400~800레벨 사냥터로 간다
function setup(lv){
 const g=makeWorld();g.out=[];g.mySeat=0;
 const seats=[{id:'dw0',name:'워프0',hero:{name:'워프0',job:'warrior',elem:'frost',gender:'m'}}];
 rpgSyncSeats(g,seats);
 rpgJoin(g,0,{name:'워프0',job:'warrior',rs:RESET.id,gift:GIFT.id,lv,ts:0,stats:{str:20,hp:20},bag:{oc:1,w:[],n:1}},'dw0');
 const h=g.heroes[0];h.auto=0;h.map='plaza';h.x=900;h.y=820;h.bag.wp=5;
 return {g,h};
}
test('워프 목록에 400~800레벨 사냥터 8곳이 들어 있다',()=>{
 DEEP_MAPS.forEach((d)=>{assert(WARP.maps.includes(d.id));assert(MAPS[d.id]&&MAPS[d.id].deep);});
 assert.equal(DEEP_MAPS.length,8);
});
test('레벨이 모자라거나 계몽의 눈이 없으면 막힌다',()=>{
 {const {h}=setup(300);addMat(h.bag,DEEP.eye,1);const why=whyWarp(h,'fspirit');assert(why.some((s)=>s.includes('레벨')),why.join());}
 {const {h}=setup(400);const why=whyWarp(h,'fspirit');assert(why.some((s)=>s.includes('계몽의 눈')),why.join());}
});
test('레벨 400 + 계몽의 눈이면 입구로 옮겨 가고 1회 줄어든다',()=>{
 const {g,h}=setup(400);addMat(h.bag,DEEP.eye,1);
 assert.deepEqual(whyWarp(h,'fallen'),[]);
 rpgShop(g,0,{op:'warp',to:'fallen'});
 assert.equal(h.map,'fallen');assert.equal(h.bag.wp,4);
});
test('눈이 없으면 실제로 옮겨 가지 않고 횟수도 그대로다',()=>{
 const {g,h}=setup(400);
 rpgShop(g,0,{op:'warp',to:'fspirit'});
 assert.equal(h.map,'plaza');assert.equal(h.bag.wp,5);
});
test('기존 지역 워프는 그대로다',()=>{
 const {g,h}=setup(10);
 rpgShop(g,0,{op:'warp',to:'field'});
 assert.equal(h.map,'field');assert.equal(h.bag.wp,4);
});
