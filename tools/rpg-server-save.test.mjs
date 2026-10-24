/* RPG 전용 서버 저장 — 거래 트리거가 막은 저장(stale · busy · moved)을 10초마다 다시 보내지 않는지 본다.
   Supabase 에 닿지 않는다(fetch 를 바꿔 끼운다) */
import test from 'node:test';
import assert from 'node:assert/strict';
import {RpgRoom} from '../server/src/room.js';
import {saveChar} from '../server/src/save.js';

const env={SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'x'};
const answer=(status,body)=>async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{status});
// 앉은 사람 하나가 있는 방 — 판정 루프는 돌리지 않는다
function room(){
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

test('옛 SQL 의 400 trade_stale 답도 stale 로 읽는다',async()=>{
 const keep=globalThis.fetch;
 try{
  globalThis.fetch=answer(400,{code:'P0001',message:'trade_stale',details:null,hint:null});
  assert.deepEqual(await saveChar(env,'가','t',{}),{ok:false,err:'stale'});
  globalThis.fetch=answer(400,{code:'22P02',message:'invalid input'});
  assert.equal((await saveChar(env,'가','t',{})).err,'net');
 }finally{globalThis.fetch=keep;}
});
for(const err of ['stale','busy','moved'])test(`${err} 를 받으면 한 번 남기고 그 접속의 저장을 멈춘다`,async()=>{
 const keep=globalThis.fetch,warn=console.warn;let calls=0;const logs=[];
 try{
  globalThis.fetch=async(...a)=>{calls++;return answer(200,{ok:false,err})(...a);};
  console.warn=(m)=>logs.push(m);
  const r=room();
  r.saveOne('a1b2c3d4');await settle();
  r.g.heroes[0].xp+=1;r.saveOne('a1b2c3d4');await settle();   // 기록이 바뀌어도 다시 보내지 않는다
  assert.equal(calls,1);assert.equal(r.accts.get('a1b2c3d4').dead,true);assert.equal(logs.length,1);
 }finally{globalThis.fetch=keep;console.warn=warn;}
});
test('네트워크 오류는 예전처럼 다음에 다시 보낸다',async()=>{
 const keep=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;throw new Error('down');};
  const r=room();
  r.saveOne('a1b2c3d4');await settle();r.saveOne('a1b2c3d4');await settle();
  assert.equal(calls,2);assert.equal(r.accts.get('a1b2c3d4').dead,false);
 }finally{globalThis.fetch=keep;}
});
