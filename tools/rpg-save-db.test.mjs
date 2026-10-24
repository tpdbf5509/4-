/* 로컬 메모리 Postgres에서만 실행한다. 운영 DB 연결은 사용하지 않는다.
   rpg_save 코인 지킴(기록만 · 막기)과 rpg_srv_save 의 거래 트리거 답을 본다 */
import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
let db;
const raw=async(q,args=[])=>(await db.query(q,args)).rows;
const one=async(q,args=[])=>(await raw(q,args))[0].r;
const rec=(name,over={})=>({name,lv:50,ts:0,coins:1000,rs:'2026-10-19',bag:{m:{},w:[],a:[],ae:{},n:1,pg:[]},...over});
const save=(name,data,tok=name)=>one('select public.rpg_save($1,$2,$3) as r',[name,tok,JSON.stringify(data)]);
const srvSave=(name,data,tok=name)=>one('select public.rpg_srv_save($1,$2,$3) as r',[name,tok,JSON.stringify(data)]);
const blocks=()=>raw('select name,why,coins_old,coins_new from public.rpg_save_blocks order by id');
const stored=async(name)=>(await raw('select data,token_hash from public.rpg_chars where name_key=$1',[name]))[0];
before(async()=>{db=new PGlite({extensions:{pgcrypto}});await db.exec('create role anon;create role authenticated;create role service_role;create schema extensions;create extension pgcrypto with schema extensions;');
 for(const name of ['rpg','trade','guild'])await db.exec(await readFile(new URL(`../supabase/${name}.sql`,import.meta.url),'utf8'));
});
after(async()=>{await db.close();});
beforeEach(async()=>{
 await db.exec('truncate public.rpg_chars,public.rpg_trades,public.rpg_save_blocks cascade');
 await db.exec("create or replace function public.rpg_coin_block() returns boolean language sql immutable set search_path = '' as $$ select false $$");
 for(const name of ['가','나'])await db.query("insert into public.rpg_chars(name_key,name,code_hash,token_hash,data,live_sid,live_srv,live_at) values($1,$1,'test',encode(extensions.digest($1,'sha256'),'hex'),$2,$1,'RPG1',now())",[name,JSON.stringify(rec(name))]);
});
test('rpg_srv_save 는 거래 트리거 오류를 예외 대신 답으로 돌려준다',async()=>{
 await db.query("update public.rpg_chars set trade_seq=1,data=jsonb_set(data,'{ts}','1') where name_key='가'");
 assert.deepEqual(await srvSave('가',rec('가',{ts:0,lv:51})),{ok:false,err:'stale'});
 assert.equal((await stored('가')).data.lv,50);
 assert.deepEqual(await srvSave('가',rec('가',{ts:1,lv:51})),{ok:true});
 assert.deepEqual(await srvSave('가',rec('가',{ts:1}),'wrong'),{ok:false,err:'token'});
});
test('rpg_srv_save 는 확인한 거래 중 저장을 busy 로 돌려준다',async()=>{
 const t=(await raw("insert into public.rpg_trades(a,b,server,state,accepted) values('가','나','RPG1','open','[true,false]') returning id"))[0].id;
 await db.query("update public.rpg_chars set trade_id=$1 where name_key in ('가','나')",[t]);
 assert.deepEqual(await srvSave('가',rec('가',{lv:51})),{ok:false,err:'busy'});
});
test('코인이 시간 몫 안에서 늘면 그냥 저장한다',async()=>{
 assert.deepEqual(await save('가',rec('가',{coins:1000+900000})),{ok:true});
 await db.query("update public.rpg_chars set updated_at=now()-interval '10 minutes' where name_key='가'");
 assert.deepEqual(await save('가',rec('가',{coins:901000+5900000})),{ok:true});   // 100만 + 10분 × 50만 안
 assert.deepEqual(await blocks(),[]);
});
test('코인이 한도를 넘으면 기본은 막지 않고 coins 로 남기기만 한다',async()=>{
 assert.deepEqual(await save('가',rec('가',{coins:5000000})),{ok:true});
 assert.equal((await stored('가')).data.coins,5000000);
 assert.deepEqual(await blocks(),[{name:'가',why:'coins',coins_old:1000,coins_new:5000000}]);
 assert.deepEqual(await save('가',rec('가',{coins:5000100})),{ok:true});   // 입장권은 그대로 — 다음 저장도 된다
 assert.equal((await blocks()).length,1);
 assert.deepEqual(await save('가',rec('가',{coins:'99999999999'})),{ok:true});   // 숫자가 아닌 코인도 남긴다
 assert.deepEqual((await blocks()).at(-1),{name:'가',why:'coins',coins_old:5000100,coins_new:null});
});
test('막기로 바꾸면 coins 로 막고 입장권을 지운다',async()=>{
 await db.exec("create or replace function public.rpg_coin_block() returns boolean language sql immutable set search_path = '' as $$ select true $$");
 assert.deepEqual(await save('가',rec('가',{coins:5000000})),{ok:false,err:'guard',why:'coins'});
 const c=await stored('가');assert.equal(c.data.coins,1000);assert.equal(c.token_hash,null);
 assert.deepEqual(await blocks(),[{name:'가',why:'coins',coins_old:1000,coins_new:5000000}]);
});
test('관리자 · 서버 초기화 · 한 사람 되돌리기는 코인 지킴에 걸리지 않는다',async()=>{
 await db.exec("create or replace function public.rpg_coin_block() returns boolean language sql immutable set search_path = '' as $$ select true $$");
 await db.query("update public.rpg_chars set admin=true where name_key='나'");
 assert.deepEqual(await save('나',rec('나',{coins:99999999})),{ok:true});
 assert.deepEqual(await save('가',rec('가',{coins:5000000,rs:'2026-11-01'})),{ok:true});
 assert.deepEqual(await save('가',rec('가',{coins:9000000,rs:'2026-11-01',bag:{m:{},w:[],a:[],ae:{},n:1,pg:['rb-1']}})),{ok:true});
 assert.deepEqual(await blocks(),[]);
});
test('거래로 받은 코인은 DB 가 기록을 고쳐 다음 저장에서 걸리지 않는다',async()=>{
 await db.query("update public.rpg_chars set data=jsonb_set(data,'{coins}','8000000') where name_key='가'");
 const id=(await one("select public.rpg_trade_open('가','가','나','가') as r")).id;
 assert((await one("select public.rpg_trade_action('나','나','나',$1,'join') as r",[id])).ok);
 let t=(await one("select public.rpg_trade_action('가','가','가',$1,'offer',$2) as r",[id,JSON.stringify({coins:7000000,items:[]})])).trade;
 assert((await one("select public.rpg_trade_action('가','가','가',$1,'accept',null,$2) as r",[id,t.hash])).ok);
 t=(await one("select public.rpg_trade_action('나','나','나',$1,'accept',null,$2) as r",[id,t.hash])).trade;
 assert.equal(t.state,'done');
 const got=(await stored('나')).data;assert.equal(got.coins,7001000);assert.equal(got.ts,1);
 assert.deepEqual(await save('나',{...got,coins:7001500}),{ok:true});
 assert.deepEqual(await blocks(),[]);
});
