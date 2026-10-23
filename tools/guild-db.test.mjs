/* 로컬 메모리 Postgres에서만 실행한다. 운영 DB 연결은 사용하지 않는다. */
import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
let db;
const names=['길드가','길드나','길드다','길드라','길드마'];
const action=async(name,op='get',args={},token=name,sid=name)=>(await db.query('select public.rpg_guild_action($1,$2,$3,$4,$5) as r',[name,token,sid,op,JSON.stringify(args)])).rows[0].r;
const raw=async(q,args=[])=>(await db.query(q,args)).rows;
const create=async()=>{const r=await action(names[0],'create',{name:'시험길드'});assert(r.ok);return r.guild.id;};
before(async()=>{db=new PGlite({extensions:{pgcrypto}});await db.exec('create role anon;create role authenticated;create role service_role;create schema extensions;create extension pgcrypto with schema extensions;');
 for(const name of ['rpg','trade','guild'])await db.exec(await readFile(new URL(`../supabase/${name}.sql`,import.meta.url),'utf8'));
});
after(async()=>{await db.close();});
beforeEach(async()=>{
 await db.exec('truncate public.rpg_chars,public.rpg_guilds,public.rpg_trades cascade');
 for(const name of names)await db.query("insert into public.rpg_chars(name_key,name,code_hash,token_hash,data,live_sid,live_srv,live_at) values($1,$1,'test',encode(extensions.digest($1,'sha256'),'hex'),$2,$1,'RPG1',now())",[name,JSON.stringify({name,lv:50,ts:0,coins:100000,bag:{m:{},w:[],a:[],ae:{},n:1}})]);
});
test('입장권·창·접속을 검사하고 익명 역할의 직접 표 접근과 내부 함수를 차단한다',async()=>{
 assert.equal((await action(names[0],'get',{},'wrong')).err,'token');assert.equal((await action(names[0],'get',{},names[0],'wrong')).err,'live');
 await db.exec('set role anon');try{
 assert((await action(names[0])).ok);
 await assert.rejects(()=>db.query('select * from public.rpg_guilds'),/permission denied/);
 await assert.rejects(()=>db.query("select public.rpg_guild_view('길드가')"),/permission denied/);
 }finally{await db.exec('reset role');}
});
test('생성은 50레벨·5만 코인을 검증하며 중복 생성과 옛 저장을 거절한다',async()=>{
 await db.query("update public.rpg_chars set data=jsonb_set(data,'{lv}','49') where name_key=$1",[names[0]]);assert.equal((await action(names[0],'create',{name:'시험길드'})).err,'level');
 await db.query("update public.rpg_chars set data=jsonb_set(jsonb_set(data,'{lv}','50'),'{coins}','49999') where name_key=$1",[names[0]]);assert.equal((await action(names[0],'create',{name:'시험길드'})).err,'funds');
 await db.query("update public.rpg_chars set data=jsonb_set(data,'{coins}','100000') where name_key=$1",[names[0]]);await create();
 const c=(await raw('select data,trade_seq from public.rpg_chars where name_key=$1',[names[0]]))[0];assert.equal(c.data.coins,50000);assert.equal(c.trade_seq,1);
 assert.equal((await action(names[0],'create',{name:'다른길드'})).err,'member');
 const r=(await raw('select public.rpg_save($1,$1,$2) as r',[names[0],JSON.stringify({...c.data,ts:0,coins:100000})]))[0].r;assert.equal(r.err,'stale');
});
test('미리 받은 초대를 동시에 수락해도 길드 정원 4명을 넘지 않는다',async()=>{
 await create();for(const n of names.slice(1))assert((await action(names[0],'invite',{name:n})).ok);
 const joined=await Promise.all(names.slice(1).map(n=>action(n,'join')));assert.equal(joined.filter(x=>x.ok).length,3);assert.equal(joined.at(-1).err,'full');
 assert.equal((await action(names[0])).guild.members.length,4);
});
test('가입 승인·위임·추방·탈퇴는 권한을 검사하고 길드 이름 변경 뒤에도 소속을 보존한다',async()=>{
 const id=await create();assert((await action(names[1],'apply',{id})).ok);assert.equal((await action(names[2],'approve',{name:names[1]})).err,'leader');assert((await action(names[0],'approve',{name:names[1]})).ok);
 assert.equal((await action(names[0],'leave')).err,'transfer');assert((await action(names[0],'transfer',{name:names[1]})).ok);assert.equal((await action(names[0],'kick',{name:names[1]})).err,'leader');
 await db.query("update public.rpg_chars set name_key='변경이름',name='변경이름' where name_key=$1",[names[1]]);
 const s=await action('변경이름','get',{},names[1],names[1]);assert.equal(s.guild.leader,'변경이름');assert(s.guild.members.some(m=>m.key==='변경이름'));
 assert((await action('변경이름','kick',{name:names[0]},names[1],names[1])).ok);assert.equal((await action(names[0])).guild,null);
});
test('출석은 하루 한 번이며 봉헌은 원자적으로 소비하고 최대70 이후 초과분을 돌려준다',async()=>{
 await create();assert((await action(names[0],'attendance')).ok);assert.equal((await action(names[0],'attendance')).err,'daily');assert.equal((await action(names[0],'donate',{n:-1})).err,'amount');
 assert.equal((await action(names[0],'donate',{n:11})).err,'stones');let r=await action(names[0],'donate',{n:10});assert.equal(r.wallet.stones,0);assert.equal(r.guild.exp,10);
 await db.query('update public.rpg_guild_wallets set stones=100000 where char_key=$1',[names[0]]);
 r=await action(names[0],'donate',{n:999999});assert.equal(r.guild.level,70);assert.equal(r.guild.exp,0);assert.equal(r.wallet.stones,100000-(25550-10));assert.equal((await action(names[0],'donate',{n:1})).err,'max');
});
test('토벌은 같은 서버 참여자·하루3회·동시 한 건을 검사하고 점수와 보상을 한 번만 준다',async()=>{
 await create();await action(names[0],'invite',{name:names[1]});await action(names[1],'join');await db.query("update public.rpg_chars set live_srv='RPG2' where name_key=$1",[names[1]]);
 const r=await action(names[0],'start',{boss:'slime'}),id=r.guild.raid.id;assert.deepEqual(r.guild.raid.members,[names[0]]);assert.equal((await action(names[0],'start',{boss:'phoenix'})).err,'raid_busy');assert.equal((await action(names[0],'disband')).err,'raid_busy');
 assert.equal((await action(names[1],'finish',{id,outcome:'clear',contributors:[names[1]]})).err,'target');assert.equal((await action(names[0],'finish',{id,outcome:'clear',contributors:[names[0]]})).err,'early');
 await db.query("update public.rpg_guild_raids set started_at=now()-interval '4 seconds' where id=$1",[id]);
 assert.equal((await action(names[0],'finish',{id,outcome:'clear',contributors:[names[1]]})).err,'target');
 const clear=await action(names[0],'finish',{id,outcome:'clear',contributors:[names[0]]});assert(clear.ok);assert.equal(clear.guild.points,100);assert.equal(clear.wallet.stones,20);
 const duplicate=await action(names[0],'finish',{id,outcome:'clear',contributors:[names[0]]});assert.equal(duplicate.guild.points,100);assert.equal(duplicate.wallet.stones,20);assert(duplicate.already);
 for(let n=0;n<2;n++){const s=await action(names[0],'start',{boss:'siren'});assert(s.ok);await action(names[0],'finish',{id:s.guild.raid.id,outcome:'fail'});}
 assert.equal((await action(names[0],'start',{boss:'slime'})).err,'raids');
});
test('한국 시간 월요일에 순위를 나누며 지난주 참여자에게 한 번만 네 종류 보상을 준다',async()=>{
 const boundaries=await raw("select public.rpg_guild_week('2026-10-25 14:59:59+00')::text as old,public.rpg_guild_week('2026-10-25 15:00:00+00')::text as new");assert.equal(String(boundaries[0].old).slice(0,10),'2026-10-19');assert.equal(String(boundaries[0].new).slice(0,10),'2026-10-26');
 const id=await create();await db.query('insert into public.rpg_guild_scores values(public.rpg_guild_week()-7,$1,100)',[id]);
 assert.equal((await action(names[0],'claim')).err,'reward');await db.query('insert into public.rpg_guild_credits values(public.rpg_guild_week()-7,$1,$2)',[names[0],id]);
 await db.query("update public.rpg_chars set data=jsonb_set(data,'{bag,m,dungeon_ticket}','999') where name_key=$1",[names[0]]);assert.equal((await action(names[0],'claim')).err,'capacity');assert.equal((await action(names[0])).wallet.cores,0);
 await db.query("update public.rpg_chars set data=jsonb_set(data,'{bag,m,dungeon_ticket}','0') where name_key=$1",[names[0]]);
 const r=await action(names[0],'claim');assert(r.ok);assert.equal(r.reward.rank,1);assert(r.reward.claimed);assert.equal(r.wallet.cores,5);assert.equal(r.wallet.stones,100);
 const c=(await raw('select data,trade_seq from public.rpg_chars where name_key=$1',[names[0]]))[0];assert.equal(c.data.coins,200000);assert.equal(c.data.bag.m.dungeon_ticket,3);assert.equal(c.trade_seq,2);assert.equal((await action(names[0],'claim')).err,'claimed');
});
test('코어는 가방 저장과 분리해 소비하며 공격속도 누적20%를 넘기지 않는다',async()=>{
 await create();await action(names[0],'attendance');await db.query('update public.rpg_guild_wallets set cores=45 where char_key=$1',[names[0]]);
 for(let i=0;i<40;i++)assert((await action(names[0],'core')).ok);
 const r=await action(names[0]);assert.equal(r.wallet.used,40);assert.equal(r.wallet.cores,5);assert.equal((await action(names[0],'core')).err,'max');
 await action(names[0],'disband');const after=await action(names[0]);assert.equal(after.guild,null);assert.equal(after.wallet.used,40);
});
