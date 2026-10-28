/* RPG 전용 서버 저장 — 거래 트리거가 막은 저장(stale · busy · moved)을 10초마다 다시 보내지 않는지 본다.
   장부 Durable Object 에 닿지 않는다(LEDGER 바인딩을 가짜로 끼운다) */
import test from 'node:test';
import assert from 'node:assert/strict';
import {RpgRoom} from '../server/src/room.js';
import {saveChar} from '../server/src/save.js';

// 장부 가짜 — 부를 때마다 handler(fn, args) 의 답을 JSON 으로 돌려준다
const ledger=(handler)=>({idFromName:()=>1,get:()=>({fetch:async(url,init)=>{
 const out=await handler(String(url).split('/').pop(),JSON.parse(init.body));
 return new Response(JSON.stringify(out),{status:200});
}})});
// 앉은 사람 하나가 있는 방 — 판정 루프는 돌리지 않는다
function room(env){
 const r=new RpgRoom({},env);
 r.start();r.stop();
 r.seats[0]={id:'a1b2c3d4',name:'가',hero:{name:'가',job:'warrior',elem:'flame',gender:'m'}};
 r.publish();
 r.accts.set('a1b2c3d4',{name:'가',tok:'t',base:{name:'가',lv:1},admin:false,look:r.seats[0].hero,savedKey:'',dead:false});
 r.conns.set('a1b2c3d4',{id:'a1b2c3d4',ws:{send(){}},gone:0});
 r.rjoin(r.conns.get('a1b2c3d4'),{cls:0,data:{}});            // 화면이 기록을 보낸 것처럼 — 서버는 불러온 기록(base)을 싣는다
 assert.equal(r.g.heroes[0].loaded,1);
 return r;
}
const settle=()=>new Promise((res)=>setTimeout(res,20));

test('장부의 답을 그대로 돌려주고 장부가 없으면 off 로 읽는다',async()=>{
 const env={LEDGER:ledger((fn,a)=>({ok:false,err:'stale',fn,name:a.p_name}))};
 const r=await saveChar(env,'가','t',{});
 assert.equal(r.err,'stale');assert.equal(r.fn,'rpg_srv_save');assert.equal(r.name,'가');
 assert.equal((await saveChar({},'가','t',{})).err,'off');
 const down={LEDGER:{idFromName:()=>1,get:()=>({fetch:async()=>{throw new Error('down');}})}};
 assert.equal((await saveChar(down,'가','t',{})).err,'net');
});
for(const err of ['stale','busy','moved'])test(`${err} 를 받으면 한 번 남기고 그 접속의 저장을 멈춘다`,async()=>{
 const warn=console.warn;let calls=0;const logs=[];
 try{
  console.warn=(m)=>logs.push(m);
  const r=room({LEDGER:ledger(()=>{calls++;return {ok:false,err};})});
  r.saveOne('a1b2c3d4');await settle();
  r.g.heroes[0].xp+=1;r.saveOne('a1b2c3d4');await settle();   // 기록이 바뀌어도 다시 보내지 않는다
  assert.equal(calls,1);assert.equal(r.accts.get('a1b2c3d4').dead,true);assert.equal(logs.length,1);
 }finally{console.warn=warn;}
});
test('네트워크 오류는 예전처럼 다음에 다시 보낸다',async()=>{
 let calls=0;
 const env={LEDGER:{idFromName:()=>1,get:()=>({fetch:async()=>{calls++;throw new Error('down');}})}};
 const r=room(env);
 r.saveOne('a1b2c3d4');await settle();r.saveOne('a1b2c3d4');await settle();
 assert.equal(calls,2);assert.equal(r.accts.get('a1b2c3d4').dead,false);
});
