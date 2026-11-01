import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgPack,rpgApply,HIDE_GEAR} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {RESET,GIFT} from '../src/game/itemData.js';

function setup(extra={}){
 const g=makeWorld();g.out=[];g.mySeat=0;
 const seats=[{id:'hg0',name:'숨김',hero:{name:'숨김',job:'warrior',elem:'frost',gender:'m'}}];
 rpgSyncSeats(g,seats);
 rpgJoin(g,0,{name:'숨김',rs:RESET.id,gift:GIFT.id,lv:50,ts:0,stats:{str:20,hp:20},bag:{oc:1,w:[],n:1},...extra},'hg0');
 return {g,h:g.heroes[0],seats};
}
test('장비 외형 숨기기는 기본이 보이기이고 입력으로 켜고 끈다',()=>{
 const {g,h}=setup();
 assert.equal(h.hideGear||0,0);
 rpgInput(g,{cls:0,kind:'gear',dir:HIDE_GEAR.weapon});assert.equal(h.hideGear,1);
 rpgInput(g,{cls:0,kind:'gear',dir:HIDE_GEAR.weapon|HIDE_GEAR.armor});assert.equal(h.hideGear,3);
 rpgInput(g,{cls:0,kind:'gear',dir:0});assert.equal(h.hideGear,0);
 for(const bad of ['3',null,{},1.5,-1>>>0]){rpgInput(g,{cls:0,kind:'gear',dir:bad});assert(h.hideGear>=0&&h.hideGear<=3,String(bad));}
});
test('접속할 때 보낸 설정을 싣고 스냅샷으로 다른 화면에도 간다',()=>{
 const {g,h,seats}=setup({hideGear:HIDE_GEAR.armor});
 assert.equal(h.hideGear,2);
 const s=JSON.parse(JSON.stringify(rpgPack(g)));
 const g2=makeWorld();g2.out=[];g2.mySeat=1;rpgSyncSeats(g2,seats);
 rpgApply(g2,s);
 assert.equal(g2.heroes[0].hideGear,2);
});
