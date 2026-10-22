/* 서버별 보스. 방장만 판정하며 진행·기여·미지급 결과를 통째로 스냅샷에 싣는다. */
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_ID,WORLD_BOSS_BY_TYPE,worldBossIdentity} from './worldBossData.js';
import {WORLD_WEAPONS,WORLD_SET_BY_ID} from './worldEquipmentData.js';
import {WEAPON,POTION,POTIONS} from './shopData.js';
import {ARMOR,ARMOR_SLOTS} from './armorData.js';
import {MAT_MAX} from './itemData.js';
import {specialTier,specialPrice} from './shop.js'; // 물품을 지급할 때만 읽어 기존 장비 생성 규칙을 맞춘다.
import {trading} from './tradeData.js';
const distance=(x,y,a,b)=>Math.hypot(x-a,(y-b)/C.squash);
const activeHeroes=g=>g.heroes.filter(h=>h?.loaded&&h.map===C.map&&h.down<=0);
const randomInt=(lo,hi,rng)=>lo+Math.floor(rng()*(hi-lo+1));
const time=()=>Date.now();
export const newWorldBossState=(now=time())=>({clock:now,lastHour:Math.floor(now/C.period)-1,active:null,results:[]});
export const isWorldBoss=m=>!!WORLD_BOSS_BY_TYPE[m?.type];
export function cleanWorldBossBag(d,b){
  b.wbDone=Array.isArray(d?.wbDone)?[...new Set(d.wbDone.filter(x=>typeof x==='string'&&x.length<100))].slice(-64):[];
  b.wbMail=Array.isArray(d?.wbMail)?d.wbMail.filter(x=>x&&Number.isSafeInteger(x.n)&&x.n>0&&x.n<=1000&&(
    x.k==='weapon'&&WORLD_WEAPONS.some(w=>w.id===x.id)||x.k==='armor'&&WORLD_SET_BY_ID[x.set]&&ARMOR_SLOTS.some(s=>s.id===x.id)||
    x.k==='material'&&['heart','dungeon_ticket'].includes(x.id)||x.k==='potion'&&POTIONS.some(p=>p.id===x.id)
  )).slice(0,500).map(x=>({k:x.k,id:x.id,n:x.n,...(x.set?{set:x.set}:{})})):[];
}
export function rollWorldBossReward(id,rng=Math.random){
  const items=[{k:'material',id:'heart',n:randomInt(...C.heart,rng)}];
  WORLD_WEAPONS.filter(w=>w.set===id).forEach(w=>{if(rng()<C.weaponChance)items.push({k:'weapon',id:w.id,n:1});});
  ARMOR_SLOTS.forEach(s=>{if(rng()<C.armorChance)items.push({k:'armor',id:s.id,set:id,n:1});});
  if(rng()<C.ticketChance)items.push({k:'material',id:'dungeon_ticket',n:1});
  C.potions.forEach(p=>{if(rng()<p.chance)items.push({k:'potion',id:p.id,n:p.n});});
  return {coins:randomInt(C.coins[0]/C.coinStep,C.coins[1]/C.coinStep,rng)*C.coinStep,items};
}
// 가방이 차도 보상은 사라지지 않는다. 남은 물품은 저장되는 수령함에 둔다.
export function collectWorldBossMail(h){
  const b=h.bag,remain=[];let received=0;
  for(const item of b.wbMail||[]){let n=item.n;
    if(item.k==='weapon'){
      const sp=WORLD_WEAPONS.find(w=>w.id===item.id);
      while(n>0&&b.w.length<WEAPON.bagMax){b.w.push({u:b.n++,t:sp.t,r:specialTier(sp),g:sp.g,p:specialPrice(sp),sp:sp.id});n--;received++;}
    }else if(item.k==='armor'){
      while(n>0&&b.a.length<ARMOR.bagMax){b.a.push({u:b.n++,s:item.id,g:3,set:item.set});n--;received++;}
    }else{
      const store=item.k==='potion'?b.p:b.m,cap=item.k==='potion'?POTION.stackMax:MAT_MAX;
      const put=Math.min(n,Math.max(0,cap-(store[item.id]||0)));if(put){store[item.id]=(store[item.id]||0)+put;n-=put;received+=put;}
    }
    if(n)remain.push({...item,n});
  }
  b.wbMail=remain;if(received)b.v++;
  return received;
}
function notify(E,g,h,text,sub='',tone='good'){
  E.notice(g,{text,sub,tone:{good:'#ffd873',warn:'#ffc18d',bad:'#ffb4a0'}[tone],who:h?.pi??-1,t:5,life:5});
}
function applyResults(E,g){
  for(const result of g.wb.results)for(const reward of result.rewards){
    if(reward.applied)continue;
    const h=g.heroes.find(h=>h?.loaded&&worldBossIdentity(g,h)===reward.name);
    if(!h||trading(h))continue;
    const b=h.bag;
    if(!(b.wbDone||[]).includes(result.key)){
      b.wbDone=[...(b.wbDone||[]),result.key].slice(-64);h.coins+=reward.coins;
      b.wbMail=mergeMail([...(b.wbMail||[]),...reward.items]);b.v++;
      collectWorldBossMail(h);
      notify(E,g,h,'월드보스 보상 획득',`${reward.coins.toLocaleString('ko-KR')}코인 · 심장결정 ${reward.items[0].n}개${b.wbMail.length?' · 남은 물품은 보상 수령함에 보관':''}`);
    }
    reward.applied=true;
  }
}
function mergeMail(items){
  const out=[];
  for(const x of items){let n=x.n;const match=out.find(q=>q.k===x.k&&q.id===x.id&&q.set===x.set&&q.n<1000);
    if(match){const put=Math.min(n,1000-match.n);match.n+=put;n-=put;}
    while(n>0){const put=Math.min(n,1000);out.push({...x,n:put});n-=put;}
  }return out;
}
function spawn(E,g,id,key,expires){
  const B=WORLD_BOSS_BY_ID[id],[x,y]=C.center;
  g.mobs=g.mobs.filter(m=>!isWorldBoss(m));
  const m=E.body(g.nextId++,-1,B.type,1,200,C.map,x,y,{hp:B.hp,dmg:1,xp:0,coin:0});
  g.mobs.push(m);
  g.wb.active={id,key,mob:m.id,expires,hp:m.hp,max:m.max,x,y,phase:'fight',end:0,contrib:[],seq:0,cd:3,attack:null,pools:[]};
  notify(E,g,null,`${B.name} 출현`,'월드보스 창에서 입장하세요','warn');
}
export function worldBossInput(E,g,pi,req){
  const h=g.heroes[pi],w=g.wb;
  if(!h?.loaded||!req||trading(h))return false;
  if(req.op==='collect'){const n=collectWorldBossMail(h);notify(E,g,h,n?'보상을 받았습니다':'가방 공간이 필요합니다',h.bag.wbMail.length?'남은 물품은 수령함에 보관됩니다':'',n?'good':'bad');return !!n;}
  if(req.op==='leave'){if(h.map!==C.map||h.down>0)return false;E.plaza(g,h);return true;}
  if(h.map!=='plaza'||h.down>0||h.dvs>=0)return false;
  if(req.op==='summon'){
    if(w.active){notify(E,g,h,'이미 월드보스가 출현해 있습니다','','bad');return false;}
    if(!WORLD_BOSS_BY_ID[req.id]||h.coins<C.fee){notify(E,g,h,'소환에는 10만 코인이 필요합니다','','bad');return false;}
    h.coins-=C.fee;
    spawn(E,g,req.id,`${g.wbServer||'RPG'}:paid:${w.clock}:${g.nextId}`,w.clock+C.duration);
    return true;
  }
  if(req.op==='enter'&&w.active?.phase==='fight'){
    h.map=C.map;h.x=C.spawn[0]+pi*18;h.y=C.spawn[1]+pi%3*25;h.gateCd=1;h.hold=[];h.fire=0;
    return true;
  }
  return false;
}
export function worldBossHit(g,m,h,amount){
  const a=g.wb?.active;if(!h?.loaded||!a||a.phase!=='fight'||a.mob!==m.id)return;
  const name=worldBossIdentity(g,h);if(!name)return;
  let c=a.contrib.find(c=>c.name===name);if(!c){c={name,damage:0};a.contrib.push(c);}
  c.damage+=Math.max(0,Math.min(m.hp,amount));a.hp=Math.max(0,m.hp-amount);
}
export function worldBossKilled(E,g,m){
  const a=g.wb.active;if(!a||a.mob!==m.id||a.phase!=='fight')return;
  a.phase='clear';a.hp=0;a.end=C.endWait;a.attack=null;a.pools=[];
  const total=a.contrib.reduce((s,c)=>s+c.damage,0);
  const rewards=a.contrib.filter(c=>c.damage>total*C.contribution).map(c=>({name:c.name,...rollWorldBossReward(a.id),applied:false}));
  g.wb.results.push({key:a.key,rewards});
  notify(E,g,null,'월드보스 토벌 완료',`${rewards.length}명 보상 대상 · 기여도 10% 초과`);
  applyResults(E,g);
}
export function worldBossRestore(E,g){
  const a=g.wb?.active;if(!a||a.phase!=='fight')return;
  g.mobs=g.mobs.filter(m=>!isWorldBoss(m));
  const B=WORLD_BOSS_BY_ID[a.id];
  const m=E.body(a.mob,-1,B.type,1,200,C.map,a.x,a.y,{hp:a.max,dmg:1,xp:0,coin:0});m.hp=a.hp;m.pose=a.attack?1:0;g.mobs.push(m);
  g.nextId=Math.max(g.nextId,a.mob+1);
}
function area(shape,x,y,extra={}){return {shape,x,y,...extra};}
export function worldBossAreaContains(s,h){
  const dx=h.x-s.x,dy=(h.y-s.y)/C.squash,d=Math.hypot(dx,dy);
  if(s.shape==='circle')return d<=s.r;
  if(s.shape==='ring')return d<=s.r&&d>=s.inner;
  const c=Math.cos(s.a),t=Math.sin(s.a),along=dx*c+dy*t,across=-dx*t+dy*c;
  if(s.shape==='line')return along>=-40&&along<=s.len&&Math.abs(across)<=s.width;
  return d<=s.len&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-s.a),Math.cos(Math.atan2(dy,dx)-s.a)))<=s.arc;
}
function beginAttack(g,m,a,heroes){
  const B=WORLD_BOSS_BY_ID[a.id],kind=B.attacks[a.seq++%B.attacks.length];
  const target=heroes[a.seq%heroes.length],angle=Math.atan2((target.y-m.y)/C.squash,target.x-m.x);
  let areas;
  if(kind==='cone')areas=[area('cone',m.x,m.y,{a:angle,len:680,arc:.58})];
  else if(kind==='ring')areas=[area('ring',m.x,m.y,{inner:160,r:520})];
  else if(kind==='cross')areas=Array.from({length:4},(_,i)=>area('line',m.x,m.y,{a:angle+i*Math.PI/2,len:900,width:65}));
  else areas=heroes.slice(0,kind==='lightning'?5:3).map(h=>area('circle',h.x,h.y,{r:kind==='poison'?145:115}));
  a.attack={kind,areas,t:C.wind,life:C.wind};m.pose=1;
}
export function tickWorldBoss(E,g,dt){
  const w=g.wb||(g.wb=newWorldBossState());w.clock=Math.max(w.clock+dt*1000,time());
  const hour=Math.floor(w.clock/C.period);
  if(hour>w.lastHour){
    w.lastHour=hour;
    if(!w.active&&w.clock-hour*C.period<C.duration){
      const offset=Number(String(g.wbServer||'RPG1').slice(-1))||1;
      const B=WORLD_BOSSES[(hour+offset)%WORLD_BOSSES.length];spawn(E,g,B.id,`${g.wbServer||'RPG'}:hour:${hour}`,(hour*C.period)+C.duration);
    }
  }
  applyResults(E,g);w.results=w.results.filter(r=>r.rewards.some(r=>!r.applied));
  const a=w.active;if(!a)return;
  if(a.phase!=='fight'){
    a.end-=dt;if(a.end>0)return;
    g.heroes.forEach(h=>{if(h?.map===C.map)E.plaza(g,h);});g.mobs=g.mobs.filter(m=>!isWorldBoss(m));w.active=null;return;
  }
  const m=g.mobs.find(m=>m.id===a.mob&&!m.dead);if(!m){worldBossRestore(E,g);return;}
  a.hp=m.hp;a.x=m.x;a.y=m.y;
  if(w.clock>=a.expires){a.phase='fail';a.end=C.endWait;a.attack=null;a.pools=[];m.dead=true;notify(E,g,null,'월드보스가 물러났습니다','시간 안에 토벌하지 못했습니다','bad');return;}
  const heroes=activeHeroes(g);
  if(a.attack){
    a.attack.t-=dt;
    if(a.attack.t<=0){
      const attack=a.attack;
      heroes.forEach(h=>{if(attack.areas.some(s=>worldBossAreaContains(s,h)))E.hurt(g,h,h.max*C.hitPct);});
      if(attack.kind==='poison')a.pools.push(...attack.areas.map(s=>({...s,t:C.poolTime,next:C.poolTick})));
      attack.areas.forEach(s=>E.fx(g,C.map,{kind:'sk_raid_hit',x:s.x,y:s.y,area:s,t:.55,life:.55,tone:a.id,snd:'boom'}));
      a.attack=null;m.pose=0;a.cd=m.hp/m.max<C.rageAt?C.rageGap:C.gap;
    }
  }else if(heroes.length){
    a.cd-=dt;if(a.cd<=0)beginAttack(g,m,a,heroes);
    // 준비 중에는 멈추고 대상이 멀 때만 천천히 다가간다.
    else{const h=heroes[0],d=distance(m.x,m.y,h.x,h.y);if(d>280){m.x+=(h.x-m.x)/d*55*dt;m.y+=(h.y-m.y)/d*55*dt;}}
  }
  a.pools=a.pools.filter(p=>{p.t-=dt;p.next-=dt;if(p.next<=0){p.next+=C.poolTick;heroes.forEach(h=>{if(worldBossAreaContains(p,h))E.hurt(g,h,h.max*C.poolPct);});}return p.t>0;});
}

export function worldBossView(g,h){
  const w=g.wb,a=w?.active,name=worldBossIdentity(g,h);
  const damage=a?.contrib.find(c=>c.name===name)?.damage||0;
  return {clock:w?.clock||0,tradeBlocked:trading(h),active:a?{id:a.id,phase:a.phase,hp:a.hp,max:a.max,expires:a.expires,end:a.end,damage}:null,mail:h.bag.wbMail||[]};
}
