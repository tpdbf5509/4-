import {RQ,RQ_MAPS,RQ_LINES,rqMap,rqEligible,rqSealed,cleanRq} from './requiemData.js';
import {BLOOD_FIELD} from './bloodJobData.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/.78);
const save=h=>{h.bag.v++;};
const tell=(E,g,h,s)=>E.sys(g,h.pi,s);
const alive=h=>h?.loaded&&h.down<=0&&rqEligible(h);
const state=h=>h.rqRun||(h.rqRun={door:0,field:0,reveal:0});
export function rqNear(h) {
  if(!rqEligible(h)||!h.bag.rq||h.bag.rq.rewarded||h.down>0)return null;
  if(h.map==='bloodlab'&&dist(h,RQ.door)<=RQ.door.r)return {name:'RQ-0 봉인 문',line:['생체 인식 장치를 조사합니다.','조사하기']};
  if(rqMap(h.map)&&dist(h,RQ.tube)<=RQ.tube.r&&rqSealed(h.bag.rq))return {name:'봉인된 유리관',line:[h.bag.rq.killed?'동기화된 무기를 받습니다.':'봉인 감시자가 깨어납니다.',h.bag.rq.killed?'보상 받기':'조사하기']};
  return null;
}
// 클라이언트 입력은 독서 의도만 받는다. 시험·처치·보상은 서버에서 결정한다.
export function rqInput(E,g,pi,req) {
  const h=g.heroes[pi];if(!alive(h)||E.trading(h))return;
  if(req?.op==='read'&&req.book===RQ.book&&h.map==='erden-library-2'&&!h.bag.rq){
    h.bag.rq=cleanRq({started:1});save(h);tell(E,g,h,'마지막 진혼곡 — 폐쇄 연구시설을 다시 조사하세요.');
  }
}
export function rqTalk(E,g,h) {
  if(!alive(h)||E.trading(h)||!rqNear(h))return false;
  const s=state(h),q=h.bag.rq;
  if(h.map==='bloodlab'){if(!s.door){s.door=.001;s.line=-1;}return true;}
  if(q.killed){if(s.reveal>=RQ.reveal)claim(E,g,h);else s.reveal||=.001;return true;}
  if(!g.mobs.some(m=>m.rq==='boss'&&m.own===h.pi&&!m.dead)){
    const m=target(E,g,h,RQ.bossAt,'boss');
    Object.assign(m,{hp:RQ.hp,max:RQ.hp,boss:1,rad:55,rqPhase:1,rqShield:RQ.shield,rqStun:0,rqCd:2,rqWarn:null});
    tell(E,g,h,'봉인 감시자 RQ-0 — 혈액 차단');
  }return true;
}
function target(E,g,h,p,kind){const m=E.dummyAt(g,h.map,p.x,p.y);Object.assign(m,{rq:kind,own:h.pi,rqOwner:h.who,hp:1e8,max:1e8});return m;}
function claim(E,g,h){
  const q=h.bag.rq;if(!q?.killed||q.rewarded||!alive(h))return;
  if(!h.bag.w.some(w=>w.sp===RQ.weapon)){
    if(!E.bagRoom(h)){if(!state(h).full)tell(E,g,h,'가방이 가득 찼습니다. 공간을 비운 뒤 유리관을 다시 조사하세요.');state(h).full=1;return;}
    E.gear(h,RQ.weapon);if(!h.bag.w.some(w=>w.sp===RQ.weapon))return;
  }
  q.rewarded=1;save(h);tell(E,g,h,'크림슨 레퀴엠을 획득했습니다.');
}
// 적혈탄 본탄과 혈검의 실제 부채꼴 적중만 받는다. 팽창·검기·다른 공격은 봉인을 열지 않는다.
export function rqSkillHit(E,g,h,m,kind,tier=0){
  if(!alive(h)||!rqMap(h.map)||m.map!==h.map||m.own!==h.pi||m.rqOwner!==h.who||!h.bag.rq)return;
  const q=h.bag.rq;
  if(m.rq==='core'&&kind==='shot'&&tier===2){q.a=1;m.dead=true;(state(h).breaks||=[]).push({x:m.x,y:m.y,t:0});save(h);tell(E,g,h,'혈액 압축 봉인이 해제되었습니다.');}
  if(m.rq?.startsWith('chain')&&kind==='sword'){q.c|=1<<Number(m.rq.slice(-1));m.dead=true;(state(h).breaks||=[]).push({x:m.x,y:m.y,t:0});save(h);tell(E,g,h,'봉인된 사슬이 끊어졌습니다.');}
  if(m.rq==='boss'&&kind==='shot'&&m.rqPhase===1&&m.rqShield>0&&(h.x-m.x)*(m.ax||1)>=0){
    m.rqShield=Math.max(0,m.rqShield-E.base(h)*(tier===2?11:tier===1?5.5:2.5));
    if(!m.rqShield){m.rqStun=RQ.stun;tell(E,g,h,'방패 파괴 — 감시자가 무방비 상태입니다.');}
  }
}
export function rqDamage(g,h,m,dmg){
  if(!m.rq)return dmg;
  if(!alive(h)||m.own!==h.pi||m.rqOwner!==h.who||m.map!==h.map||m.rq!=='boss'||h.bag.rq?.killed)return 0;
  if(m.rqStun>0)return dmg*RQ.vulnerable;
  if(m.rqPhase===1&&m.rqShield>0&&(h.x-m.x)*(m.ax||1)>=0)return dmg*(1-RQ.frontCut);
  return dmg;
}
export function rqKilled(E,g,h,m){
  if(!m.rq)return false;
  if(m.rq==='boss'&&alive(h)&&m.own===h.pi&&m.rqOwner===h.who&&rqSealed(h.bag.rq)){
    m.hp=0;m.dead=true;h.bag.rq.killed=1;state(h).reveal=.001;save(h);tell(E,g,h,'봉인 감시자의 동력핵이 꺼졌습니다.');
  }return true;
}
export function tickRq(E,g,h,dt){
  if(!h?.bag)return;
  if(rqMap(h.map) && (h.map!==RQ_MAPS[h.pi] || !h.bag.rq)) E.goMap(g,h,"bloodlab",[900,900]);
  if(!h.bag.bd?.on && h.bag.w?.find(w=>w.u===h.bag.e)?.sp===RQ.weapon){h.bag.e=0;save(h);}
  if(!alive(h)||!rqMap(h.map)){
    g.mobs=g.mobs.filter(m=>!m.rq||m.own!==h.pi);
    if(rqMap(h.map))E.goMap(g,h,'bloodlab',[900,900]);
    if(h.map!=='bloodlab'||!alive(h))h.rqRun=null;
  }
  if(!alive(h)||!h.bag.rq||h.bag.rq.rewarded)return;
  const s=state(h),q=h.bag.rq;
  if(s.breaks)s.breaks=s.breaks.map(b=>({...b,t:b.t+dt})).filter(b=>b.t<1);
  if(s.door&&h.map==='bloodlab'){
    if(dist(h,RQ.door)>RQ.door.r){s.door=0;return;}
    s.door+=dt;const i=Math.min(3,Math.floor(s.door/.65));
    if(i!==s.line){s.line=i;tell(E,g,h,RQ_LINES[i]);}
    if(s.door>=RQ.doorTime){s.door=0;E.goMap(g,h,RQ_MAPS[h.pi],RQ.spawn);}
  }
  if(!rqMap(h.map))return;
  if(h.map!==RQ_MAPS[h.pi]){E.goMap(g,h,'bloodlab',[900,900]);return;}
  const has=k=>g.mobs.some(m=>m.rq===k&&m.own===h.pi&&!m.dead);
  if(!q.a&&!has('core'))target(E,g,h,RQ.core,'core');
  RQ.chains.forEach((p,i)=>{if(!(q.c&(1<<i))&&!has(`chain${i}`))target(E,g,h,p,`chain${i}`);});
  const f=h.bd?.fd;
  if(!q.b){s.field=f&&f.map===h.map&&dist(h,RQ.field)<=RQ.field.r&&dist(f,RQ.field)<=BLOOD_FIELD.r-RQ.field.r?s.field+dt:0;
    if(s.field>=RQ.fieldTime){q.b=1;(s.breaks||=[]).push({...RQ.field,t:0});save(h);tell(E,g,h,'혈액 증폭 봉인이 해제되었습니다.');}}
  if(!rqSealed(q)&&h.y<620)h.y=620;
  if(q.killed&&!q.rewarded){s.reveal=(s.reveal||.001)+dt;if(s.reveal>=RQ.reveal&&!s.full)claim(E,g,h);}
}
export function tickRqBoss(E,g,m,dt){
  const h=g.heroes[m.own];if(!alive(h)||h.map!==m.map||h.who!==m.rqOwner){m.dead=true;return;}
  const p=m.hp/m.max>.7?1:m.hp/m.max>.35?2:3;
  if(p!==m.rqPhase){m.rqPhase=p;m.rqWarn=null;tell(E,g,h,`RQ-0 ${p}페이즈 — ${p===2?'혈액 강탈':'봉인 해제'}`);}
  if(m.rqStun>0){m.rqStun-=dt;return;}
  const a=RQ.attacks[p-1];
  if(m.rqWarn){const w=m.rqWarn;w.t-=dt;if(w.t<=0){if(dist(h,w)<=a.r){E.hurt(g,h,a.dmg);if(a.drain&&h.bag.bd)h.bag.bd.b=Math.max(0,h.bag.bd.b-a.drain);}E.fx(g,m.map,{kind:"rq_impact",x:w.x,y:w.y,t:.5,life:.5,snd:"bloodBoom",who:h.pi});m.rqWarn=null;m.rqCd=a.gap;}return;}
  m.ax=h.x>=m.x?1:-1;const d=dist(h,m);
  if(d>110){m.rqFoot=(m.rqFoot||0)+dt;if(m.rqFoot>.8){m.rqFoot=0;E.fx(g,m.map,{kind:"rq_step",x:m.x,y:m.y,t:.2,life:.2,snd:"rqStep",who:h.pi});}m.x+=(h.x-m.x)/d*RQ.speed*dt;m.y+=(h.y-m.y)/d*RQ.speed*dt;}
  m.rqCd-=dt;if(m.rqCd<=0)m.rqWarn={x:h.x,y:h.y,t:a.warn};
}
export const packRq=h=>h.rqRun?structuredClone(h.rqRun):null;
