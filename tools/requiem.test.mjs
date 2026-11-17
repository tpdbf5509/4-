import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgPack,rpgApply,heroRecord,rpgTalk,MAPS,fieldPvpMap} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {unlockBlood,dropBlood} from '../src/game/bloodJob.js';
import {cleanBag,whyEquip,whyWeaponSell} from '../src/game/shop.js';
import {RQ,RQ_MAPS,rqEligible,protectRq} from '../src/game/requiemData.js';
import {tradeOffer,tradeExchange} from '../server/src/ledger-trade.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {BLOOD_GUN_ITEM,BLOOD_SKILLS,bloodTotal} from '../src/game/bloodGunData.js';
Math.random=()=>.99;
function setup(){
 const g=makeWorld();g.server=true;g.out=[];g.mySeat=0;
 rpgSyncSeats(g,[{id:'rq-test',name:'진혼곡',hero:{name:'진혼곡',job:'warrior',gender:'m'}}]);
 rpgJoin(g,0,{name:'진혼곡',rs:RESET.id,gift:GIFT.id,lv:100,stats:{str:100,hp:100},bag:{oc:1,n:1}},'rq-test');
 const h=g.heroes[0];unlockBlood(h);h.bag.bd.lv=100;h.bag.bd.tr=[[20,0],[0,0],[0,0]];h.auto=0;h.map='erden-library-2';return {g,h};
}
const run=(g,t)=>{for(let i=0;i<Math.ceil(t/.02);i++)rpgStep(g,.02);};
const input=(g,kind,dir,aim)=>rpgInput(g,{cls:0,kind,dir,aim});
const read=g=>input(g,'requiem',{op:'read',book:RQ.book});
function enter(g,h){read(g);h.map='bloodlab';Object.assign(h,RQ.door);rpgTalk(g,0);run(g,3.6);assert.equal(h.map,RQ_MAPS[0]);}
function shot(g,h,m,t=1.3){h.x=m.x-180;h.y=m.y;h.bag.bd.b=200;input(g,'blood',{op:'press',s:'shot'},[1,0]);run(g,t);input(g,'blood',{op:'release',s:'shot'},[1,0]);run(g,.4);}
function seals(g,h){enter(g,h);shot(g,h,g.mobs.find(m=>m.rq==='core'));Object.assign(h,{x:RQ.field.x,y:RQ.field.y});input(g,'blood',{op:'press',s:'field'});run(g,2.2);input(g,'blood',{op:'release',s:'field'});
 input(g,'blood',{op:'sword'});run(g,.3);
 for(let i=0;i<3;i++){const m=g.mobs.find(m=>m.rq===`chain${i}`);h.x=m.x-80;h.y=m.y;input(g,'fire',false);input(g,'fire',true,[1,0]);run(g,.25);input(g,'fire',false);}
 assert.deepEqual([h.bag.rq.a,h.bag.rq.b,h.bag.rq.c],[1,1,7]);}
function boss(g,h){seals(g,h);Object.assign(h,{x:RQ.tube.x,y:RQ.tube.y});rpgTalk(g,0);return g.mobs.find(m=>m.rq==='boss'&&!m.dead);}
function win(g,h){const b=boss(g,h);b.hp=1;shot(g,h,b);assert.equal(h.bag.rq.killed,1);return b;}

test('일반 직업·각성 시험·레벨·직업레벨·영구 연마 조건을 서버에서 검증',()=>{
 for(const change of [h=>dropBlood(h),h=>h.bag.bd.trial=1,h=>h.lv=99,h=>h.bag.bd.lv=99,h=>h.bag.bd.tr[0][0]=19]){const {g,h}=setup();change(h);read(g);assert.ok(!h.bag.rq);}
 const {g,h}=setup();h.map='erden-library';read(g);assert.ok(!h.bag.rq);h.map='erden-library-2';read(g);assert.ok(h.bag.rq.clue);read(g);assert.equal(h.bag.rq.started,1);
});
test('각성 후 수문 재입장과 RQ-0 문 연출, 슬롯별 격리실',()=>{const {g,h}=setup();read(g);h.map='plaza';h.x=1050;h.y=600;rpgTalk(g,0);assert.equal(h.map,'bloodlab');assert.ok(!h.bt);assert.equal(h.bag.bd.lv,100);Object.assign(h,RQ.door);rpgTalk(g,0);run(g,3.6);assert.equal(h.map,RQ_MAPS[0]);assert.ok(!fieldPvpMap(h.map));});
test('적혈탄 1단계 불인정, 실제 2단계 본탄 적중으로 압축 통과',()=>{const {g,h}=setup();enter(g,h);const m=g.mobs.find(m=>m.rq==='core');shot(g,h,m,.65);assert.equal(h.bag.rq.a,0);run(g,.2);shot(g,h,m);assert.equal(h.bag.rq.a,1);});
test('빈 공간 혈역 2초, 장치 밖·중단은 누적하지 않음',()=>{const {g,h}=setup();enter(g,h);h.x=RQ.field.x;h.y=RQ.field.y;input(g,'blood',{op:'press',s:'field'});run(g,1);h.x+=100;run(g,1.2);assert.equal(h.bag.rq.b,0);h.x-=100;run(g,2.1);assert.equal(h.bag.rq.b,1);});
test('혈검 실제 참격으로 사슬 셋 통과, 다른 공격 차단',()=>{const {g,h}=setup();enter(g,h);const m=g.mobs.find(m=>m.rq==='chain0');shot(g,h,m);assert.equal(h.bag.rq.c,0);input(g,'blood',{op:'sword'});run(g,.3);for(let i=0;i<3;i++){const m=g.mobs.find(m=>m.rq===`chain${i}`);h.x=m.x-80;h.y=m.y;input(g,'fire',false);input(g,'fire',true,[1,0]);run(g,.3);input(g,'fire',false);}assert.equal(h.bag.rq.c,7);});
test('서버 보스 페이즈·예고·회피·혈량 강탈',()=>{const {g,h}=setup(),b=boss(g,h);assert.equal(b.max,RQ.hp);b.hp=b.max*.69;run(g,.1);assert.equal(b.rqPhase,2);b.rqCd=0;run(g,.02);const w={...b.rqWarn};h.x=w.x+400;run(g,1.5);assert.equal(b.rqWarn,null);b.hp=b.max*.34;run(g,.02);assert.equal(b.rqPhase,3);assert.ok(RQ.attacks[2].gap<RQ.attacks[0].gap);});
test('패배 후 봉인 보존·무제한 재도전',()=>{const {g,h}=setup();boss(g,h);h.down=2;run(g,.1);assert.ok(!g.mobs.some(m=>m.rq==='boss'));assert.equal(h.bag.rq.c,7);h.down=0;h.hp=h.max;h.map='bloodlab';Object.assign(h,RQ.door);rpgTalk(g,0);run(g,3.6);Object.assign(h,RQ.tube);rpgTalk(g,0);assert.equal(g.mobs.find(m=>m.rq==='boss'&&!m.dead).hp,RQ.hp);});
test('위조 처치·보상 요청 무시, 실제 처치 뒤 5.5초 지나 한 번 지급',()=>{const {g,h}=setup();read(g);input(g,'requiem',{op:'kill',rewarded:1,killed:1});assert.equal(h.bag.rq.killed,0);win(g,h);assert.equal(h.bag.w.filter(w=>w.sp===RQ.weapon).length,0);run(g,5.6);assert.equal(h.bag.w.filter(w=>w.sp===RQ.weapon).length,1);assert.equal(h.bag.rq.rewarded,1);rpgTalk(g,0);run(g,1);assert.equal(h.bag.w.filter(w=>w.sp===RQ.weapon).length,1);});
test('가방 가득 차면 처치 기록 보존·유리관 재수령',()=>{const {g,h}=setup();win(g,h);h.bag.w=Array.from({length:30},(_,i)=>({u:i+1,t:'sword',r:0,g:0,p:1}));h.bag.n=31;run(g,5.6);assert.equal(h.bag.rq.rewarded,0);h.bag.w.pop();Object.assign(h,RQ.tube);rpgTalk(g,0);assert.equal(h.bag.rq.rewarded,1);assert.equal(h.bag.w.filter(w=>w.sp===RQ.weapon).length,1);});
test('기존 레퀴엠은 중복 지급 없이 완료',()=>{const {g,h}=setup();win(g,h);h.bag.w.push({u:1,t:'gun',r:1,g:4,p:1,sp:RQ.weapon});run(g,5.6);assert.equal(h.bag.w.length,1);assert.equal(h.bag.rq.rewarded,1);});
test('저장 왕복·스냅샷 끝 필드·재접속 보상 보류 복구',()=>{const {g,h}=setup();win(g,h);const saved=heroRecord(h);assert.equal(cleanBag(saved.bag).rq.killed,1);const client=makeWorld();rpgSyncSeats(client,[{id:'rq-test',name:'진혼곡',hero:{name:'진혼곡',job:'warrior'}}]);rpgApply(client,rpgPack(g));assert.ok(client.heroes[0].rqRun.reveal>0);const {g:g2,h:h2}=setup();h2.bag=cleanBag(saved.bag);h2.map='bloodlab';Object.assign(h2,RQ.door);rpgTalk(g2,0);run(g2,3.6);run(g2,5.6);assert.equal(h2.bag.rq.rewarded,1);});
test('다른 직업 장착·NPC 판매 차단, 초기화 자동 해제·재활성화',()=>{const {g,h}=setup();win(g,h);run(g,5.6);const w=h.bag.w.find(w=>w.sp===RQ.weapon);h.bag.e=w.u;dropBlood(h);assert.equal(h.bag.e,0);assert.ok(whyEquip(h,w.u).some(s=>s.includes('전용')));assert.ok(whyWeaponSell(h,w.u).some(s=>s.includes('판매할 수')));unlockBlood(h);assert.ok(!whyEquip(h,w.u).some(s=>s.includes('전용')));});
test('개인 거래·장터 공통 검증과 교환 재검증에서 무기 이전 차단',()=>{const data={coins:0,bag:{e:0,w:[{u:1,sp:RQ.weapon}],n:2}};assert.throws(()=>tradeOffer(data,{coins:0,items:[{k:'w',u:'1'}]}),/trade_item/);assert.throws(()=>tradeExchange(data,{coins:0,items:[]},{coins:0,items:[{k:'w',u:'1',item:{sp:RQ.weapon}}]}),/trade_item/);});
test('클라이언트 저장·계정 생성의 위조 기록과 무기 제거, 기존 서버 기록 보존',()=>{const forged={bag:{rq:{started:1,a:1,b:1,c:7,killed:1,rewarded:1},w:[{u:1,sp:RQ.weapon}],n:2}};assert.ok(!protectRq(forged).bag.rq);assert.equal(protectRq(forged).bag.w.length,0);const kept=protectRq({bag:{w:[],n:1}},forged);assert.equal(kept.bag.rq.rewarded,1);assert.equal(kept.bag.w.length,1);});
test('다른 플레이어의 표적은 실제 공격을 맞혀도 진행 불가',()=>{const {g,h}=setup();enter(g,h);const m=g.mobs.find(m=>m.rq==='core');m.own=1;m.x=1000;m.y=1150;shot(g,h,m);assert.equal(h.bag.rq.a,0);assert.ok(!m.dead);});
test('기존 무기 데이터·공격 배율·대기·hold 유지',()=>{assert.equal(BLOOD_GUN_ITEM.amt,260);assert.equal(BLOOD_GUN_ITEM.hold,1);assert.equal(BLOOD_SKILLS.blood_gun.skill.cd,18);assert.equal(bloodTotal(),7.2);assert.ok(RQ_MAPS.every(m=>MAPS[m]));assert.ok(rqEligible(setup().h));});
test('100레벨 물리력 100포인트 기준 전투 시간: 실제 차징·혈량·대기 적용',()=>{
 const {g,h}=setup(),m=boss(g,h);g.test=true;h.trn={god:1,log:[],tot:0,hits:0};h.bd.sw=null;h.bag.bd.b=200;h.bd.cd.field=0;
 const start=g.t;let conversion=0;
 while(!m.dead&&g.t-start<180){
  h.x=m.x-220;h.y=m.y;
  if(h.bag.bd.b<60&&!h.bd.fd&&h.bd.cd.field<=0)input(g,'blood',{op:'press',s:'field'});
  if(h.bag.bd.b<20&&!h.bd.ch&&h.bd.cd.conv<=0){h.hp=h.max;input(g,'blood',{op:'convert'});conversion++;}
  if(h.bd.ch?.s==='shot'&&h.bd.ch.t>=1.2)input(g,'blood',{op:'release',s:'shot'},[1,0]);
  else if(!h.bd.ch&&h.bd.cd.shot<=0&&h.bag.bd.b>=20)input(g,'blood',{op:'press',s:'shot'},[1,0]);
  run(g,.02);
 }
 const elapsed=+(g.t-start).toFixed(2);console.log(`RQ_BALANCE seconds=${elapsed} conversions=${conversion} HP=${RQ.hp}`);
 assert.ok(m.dead);assert.ok(elapsed>=60&&elapsed<=120,`전투 시간 ${elapsed}`);
});
test('전면 방패 감소·파괴 무방비, 2페이즈 강탈과 혈막 경감',()=>{
 const {g,h}=setup(),b=boss(g,h);h.bd.sw=null;h.x=b.x+80;h.y=b.y;b.ax=1;
 const front=b.hp;shot(g,h,b);assert.ok(b.hp<front);assert.ok(b.rqShield<RQ.shield);
 b.rqShield=1;run(g,.8);shot(g,h,b);assert.equal(b.rqShield,0);assert.ok(b.rqStun>0);
 b.hp=b.max*.6;b.rqStun=0;h.bag.bd.b=100;const before=h.hp;b.rqPhase=2;b.rqWarn={x:h.x,y:h.y,t:.01};run(g,.02);
 assert.equal(h.bag.bd.b,70);const plain=before-h.hp;assert.ok(plain>0);
 h.hp=h.max;input(g,'blood',{op:'press',s:'veil'});b.rqWarn={x:h.x,y:h.y,t:.01};const hp=h.hp;run(g,.02);assert.ok(hp-h.hp<plain);
});
