/* 로컬 전용 서버 통합 시험. 운영 서버에는 연결하지 않는다.
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
const data={name,lv:100,rs:RESET.id,gift:GIFT.id,stats:{str:100,hp:100},bag:{oc:1,n:1,bd:{on:1,lv:100,tr:[[20,0],[0,0],[0,0]],b:200},rq:{started:1,a:1,b:1,c:7,killed:1,rewarded:1},w:[{u:1,sp:'blood_gun'}]}};
const made=await rpc('rpg_create',{p_name:name,p_code:'13579',p_data:data});assert.ok(made.ok,JSON.stringify(made));
const acct={name,tok:made.token},args={p_name:name,p_token:made.token};
const stored=await rpc('rpg_load',args);assert.ok(!stored.data.bag.rq);assert.equal(stored.data.bag.w.length,0);
console.log('통과 — 실제 장부 계정 생성의 위조 퀘스트·보상 제거');
const ws=new WebSocket(`ws://127.0.0.1:8787/rpg/RPGT?id=${id}`);let lobby,snap,bag,seat=-1,q=0;
const send=(k,d)=>ws.send(JSON.stringify({k,d}));
const input=(kind,dir,aim)=>send('input',{cls:seat,kind,dir,aim,q:++q});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.k==='lobby')lobby=m.d;if(m.k==='rsnap'){snap=m.d;if(m.d.b?.[seat])bag=m.d.b[seat];}};
try{
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});send('auth',{s:randomBytes(32).toString('hex')});send('hello',{name});send('pick',{hero:{name,job:'warrior',gender:'m'},acct});
 await until(()=>lobby?.seats?.some(s=>s?.id===id),'자리 없음');seat=lobby.seats.findIndex(s=>s?.id===id);send('rjoin',{cls:seat,data:{auto:0}});
 await until(()=>snap?.h?.[seat]?.[16],'캐릭터 없음');input('train',{op:'go',map:'erden-library-2'});
 await until(()=>snap.h[seat][10]===mapIdx('erden-library-2'),'도서관 이동 실패');input('requiem',{op:'read',book:RQ.book});
 await until(()=>bag?.rq?.started,'서버 퀘스트 시작 실패');assert.equal(bag.rq.killed,0);console.log('통과 — 웹소켓 독서 입력 → 서버 검증 → 가방 스냅샷');
 input('requiem',{op:'kill',killed:1,rewarded:1});await wait(200);assert.equal(bag.rq.killed,0);
 input('train',{op:'go',map:'bloodlab'});await until(()=>snap.h[seat][10]===mapIdx('bloodlab'),'시설 이동 실패');input('mv',{m:'bloodlab',x:RQ.door.x,y:RQ.door.y});
 await until(()=>Math.hypot(snap.h[seat][0]-RQ.door.x,(snap.h[seat][1]-RQ.door.y)/.78)<100,'문 접근 실패',20000);input('hold',[]);input('talk');
 await until(()=>snap.h[seat][10]===mapIdx(`requiem-${seat}`),'봉인 문 개방 실패');console.log('통과 — 접근 검사·문 개방 연출·개인 격리실 스냅샷');
 input('mv',{m:`requiem-${seat}`,x:RQ.core.x-180,y:RQ.core.y});await until(()=>Math.hypot(snap.h[seat][0]-(RQ.core.x-180),(snap.h[seat][1]-RQ.core.y)/.78)<30,'핵 접근 실패',20000);
 input('hold',[]);input('blood',{op:'press',s:'shot'},[1,0]);await wait(1400);input('blood',{op:'release',s:'shot'},[1,0]);await until(()=>bag.rq.a===1,'실제 적혈탄 봉인 실패');
 assert.equal(bag.rq.killed,0);assert.ok(!bag.w.some(w=>w.sp===RQ.weapon));console.log('통과 — 실제 서버 적혈탄 충돌로 봉인 해제·위조 보상 불가');
}finally{if(ws.readyState===1)send('bye');ws.close();}
