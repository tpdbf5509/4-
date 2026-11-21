/* 로컬 전용 — 레퀴엠 획득 루트 처음부터 끝까지(독서 → 봉인 셋 → 보스 → 유리관 → 장착 → 무기 스킬). 운영 서버에는 연결하지 않는다.
   먼저 server/에서 wrangler d1 execute four-lane --local --file=schema.sql 와 wrangler dev --port 8787. */
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {RESET,GIFT} from '../src/game/itemData.js';
import {mapIdx} from '../src/game/rpg.js';
import {RQ} from '../src/game/requiemData.js';
const HTTP='http://127.0.0.1:8787',name=`진혼${Date.now().toString(36).slice(-4)}`,id=randomBytes(8).toString('hex');
const rpc=(fn,args)=>fetch(`${HTTP}/rpc/${fn}`,{method:'POST',body:JSON.stringify(args)}).then(r=>r.json());
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,msg,ms=12000){const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await wait(50);}throw Error(msg);}
const data={name,lv:100,rs:RESET.id,gift:GIFT.id,stats:{str:100,hp:100},bag:{oc:1,n:1,bd:{on:1,lv:100,tr:[[20,0],[0,0],[0,0]],b:200}}};
const made=await rpc('rpg_create',{p_name:name,p_code:'13579',p_data:data});assert.ok(made.ok,JSON.stringify(made));
const acct={name,tok:made.token};
const ws=new WebSocket(`ws://127.0.0.1:8787/rpg/RPGT?id=${id}`);let lobby,snap,bag,seat=-1,q=0,msgs=[];
const send=(k,d)=>ws.send(JSON.stringify({k,d}));
const input=(kind,dir,aim)=>send('input',{cls:seat,kind,dir,aim,q:++q});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.k==='lobby')lobby=m.d;if(m.k==='rsnap'){snap=m.d;if(m.d.b?.[seat])bag=m.d.b[seat];}else if(m.k!=='lobby')msgs.push(m);};
const me=()=>snap.h[seat],at=(x,y,r=30)=>Math.hypot(me()[0]-x,(me()[1]-y)/.78)<r;
const goto=async(map,x,y)=>{input('mv',{m:map,x,y});await until(()=>at(x,y),`이동 실패 ${map} ${x},${y} 지금 ${me()[0]},${me()[1]}`,25000);input('hold',[]);};
const step=s=>console.log('통과 —',s);
try{
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});send('auth',{s:randomBytes(32).toString('hex')});send('hello',{name});send('pick',{hero:{name,job:'warrior',gender:'m'},acct});
 await until(()=>lobby?.seats?.some(s=>s?.id===id),'자리 없음');seat=lobby.seats.findIndex(s=>s?.id===id);send('rjoin',{cls:seat,data:{auto:0}});
 await until(()=>snap?.h?.[seat]?.[16],'캐릭터 없음');
 input('train',{op:'god'});
 input('train',{op:'go',map:'erden-library-2'});await until(()=>me()[10]===mapIdx('erden-library-2'),'도서관 이동 실패');
 input('requiem',{op:'read',book:RQ.book});await until(()=>bag?.rq?.started,'독서 시작 실패');step('1 독서 → 퀘스트 시작');
 input('train',{op:'go',map:'bloodlab'});await until(()=>me()[10]===mapIdx('bloodlab'),'시설 이동 실패');
 await goto('bloodlab',RQ.door.x,RQ.door.y);input('talk');
 await until(()=>me()[10]===mapIdx(`requiem-${seat}`),'봉인 문 개방 실패');step('2 봉인 문 → 개인 격리실');
 await goto(`requiem-${seat}`,RQ.core.x-180,RQ.core.y);
 input('blood',{op:'press',s:'shot'},[1,0]);await wait(1400);input('blood',{op:'release',s:'shot'},[1,0]);await until(()=>bag.rq.a===1,'압축 봉인 실패');step('3 압축 봉인(2단 적혈탄)');
 await goto(`requiem-${seat}`,RQ.field.x,RQ.field.y);
 input('blood',{op:'press',s:'field'});await until(()=>bag.rq.b===1,'증폭 봉인 실패',6000);input('blood',{op:'release',s:'field'});step('4 증폭 봉인(혈역 2초)');
 input('blood',{op:'sword'});await wait(400);
 for(let i=0;i<3;i++){const c=RQ.chains[i];await goto(`requiem-${seat}`,c.x-80,c.y);input('fire',false);input('fire',true,[1,0]);await wait(300);input('fire',false);await until(()=>bag.rq.c&(1<<i),`사슬${i} 실패`,3000);}
 assert.equal(bag.rq.c,7);step('5 형상화 봉인(혈검 사슬 셋)');
 await goto(`requiem-${seat}`,RQ.tube.x,RQ.tube.y+60);input('talk');await wait(500);
 const t0=Date.now();let shotAt=0;
 while(!bag.rq.killed&&Date.now()-t0<240000){
  const dx=RQ.bossAt.x-me()[0],dy=RQ.bossAt.y-me()[1],d=Math.hypot(dx,dy)||1;
  if(!shotAt){input('blood',{op:'press',s:'shot'},[dx/d,dy/d]);shotAt=Date.now();}
  else if(Date.now()-shotAt>1350){input('blood',{op:'release',s:'shot'},[dx/d,dy/d]);shotAt=0;await wait(750);}
  await wait(50);
 }
 assert.ok(bag.rq.killed,'보스 처치 실패');step(`6 RQ-0 처치 (${((Date.now()-t0)/1000).toFixed(0)}초)`);
 assert.ok(!bag.rq.rewarded);await until(()=>bag.rq.rewarded,'보상 수령 실패',12000);
 const w=bag.w.find(w=>w.sp===RQ.weapon);assert.ok(w,'가방에 레퀴엠 없음');step(`7 5.5초 동기화 → 가방에 레퀴엠 (u=${w.u} r=${w.r} e=${bag.e})`);
 input('shop',{op:'equip',u:w.u});await until(()=>bag.e===w.u,'장착 실패',4000);step('8 장착');
 await wait(1500);assert.equal(bag.e,w.u);step('9 장착 유지(1.5초 뒤)');
 // 무기 스킬 발동(쿨타임·피해)은 사냥터가 필요해 격리실에서는 확인하지 않는다 — 사냥터 확인은 tools/blood-gun.test.mjs 가 맡는다.
}finally{if(ws.readyState===1)send('bye');ws.close();}
