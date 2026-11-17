import test from 'node:test';
import assert from 'node:assert/strict';
import {LedgerCore} from '../server/src/ledger.js';
import {fakeD1} from './fake-d1.mjs';
// 실제 장부 메서드가 무기와 완료 플래그를 한 저장으로 기록하고 클라이언트 덮어쓰기를 막는지 확인한다.
test('서버 완료 기록·무기 원자 저장, 재로드와 오래된 클라이언트 저장 방어',async()=>{
 const core=new LedgerCore(fakeD1(),{now:()=>1000000000000}),name='진혼저장';
 const data={name,lv:100,ts:0,coins:0,rs:'rq-test',bag:{n:1,e:0,w:[]}};
 const made=await core.call('rpg_create',{p_name:name,p_code:'13579',p_data:data});assert.ok(made.ok);
 const auth={p_name:name,p_token:made.token};
 const done={...data,bag:{n:2,e:0,w:[{u:1,sp:'blood_gun',t:'gun',r:1,g:4,p:1}],rq:{started:1,a:1,b:1,c:7,killed:1,rewarded:1}}};
 assert.equal((await core.call('rpg_srv_save',{...auth,p_data:done})).ok,true);
 assert.equal((await core.call('rpg_save',{...auth,p_data:data})).ok,true);
 const loaded=await core.call('rpg_load',auth);assert.equal(loaded.data.bag.rq.rewarded,1);assert.equal(loaded.data.bag.w.filter(w=>w.sp==='blood_gun').length,1);
 assert.equal((await core.call('rpg_srv_save',{...auth,p_data:done})).ok,true);
 const again=await core.call('rpg_load',auth);assert.equal(again.data.bag.w.length,1);
});
