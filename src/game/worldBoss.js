/* 서버별 보스. 방장만 판정하며 진행·기여·미지급 결과를 통째로 스냅샷에 싣는다. */
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_ID,WORLD_BOSS_BY_TYPE,WORLD_BOSS_PATTERNS,worldBossIdentity,WORLD_BOSS_WEAPONS,worldBossWeapons} from './worldBossData.js';
import {WORLD_SET_BY_ID} from './worldEquipmentData.js';
import {POTION,POTIONS,weaponCap} from './shopData.js';
import {ARMOR_SLOTS,armorCap} from './armorData.js';
import {MAT_MAX} from './itemData.js';
import {specialTier,specialPrice} from './shop.js'; // 물품을 지급할 때만 읽어 기존 장비 생성 규칙을 맞춘다.
import {trading} from './tradeData.js';
import {thunderbirdAreas,startThunderbirdDive,tickThunderbirdDive} from './thunderbirdCombat.js';
const distance=(x,y,a,b)=>Math.hypot(x-a,(y-b)/C.squash);
const activeHeroes=g=>g.heroes.filter(h=>h?.loaded&&h.map===C.map&&h.down<=0);
const randomInt=(lo,hi,rng)=>lo+Math.floor(rng()*(hi-lo+1));
const time=()=>Date.now();
export const newWorldBossState=(now=time())=>({clock:now,lastHour:Math.floor(now/C.period)-1,active:null,results:[]});
export const isWorldBoss=m=>!!WORLD_BOSS_BY_TYPE[m?.type];
export const worldBossPortalNear=h=>!!h&&h.map==='plaza'&&distance(h.x,h.y,C.portal.x,C.portal.y)<=C.portal.reach;
export function cleanWorldBossBag(d,b){
  b.wbDone=Array.isArray(d?.wbDone)?[...new Set(d.wbDone.filter(x=>typeof x==='string'&&x.length<100))].slice(-64):[];
  b.wbMail=Array.isArray(d?.wbMail)?d.wbMail.filter(x=>x&&Number.isSafeInteger(x.n)&&x.n>0&&x.n<=1000&&(
    x.k==='weapon'&&WORLD_BOSS_WEAPONS.some(w=>w.id===x.id)||x.k==='armor'&&WORLD_SET_BY_ID[x.set]&&ARMOR_SLOTS.some(s=>s.id===x.id)||
    x.k==='material'&&['heart','dungeon_ticket'].includes(x.id)||x.k==='potion'&&POTIONS.some(p=>p.id===x.id)
  )).slice(0,500).map(x=>({k:x.k,id:x.id,n:x.n,...(x.set?{set:x.set}:{})})):[];
}
export function rollWorldBossReward(id,rng=Math.random){
  const items=[{k:'material',id:'heart',n:randomInt(...C.heart,rng)}];
  worldBossWeapons(id).forEach(w=>{if(rng()<C.weaponChance)items.push({k:'weapon',id:w.id,n:1});});
  if(WORLD_SET_BY_ID[id])ARMOR_SLOTS.forEach(s=>{if(rng()<C.armorChance)items.push({k:'armor',id:s.id,set:id,n:1});});
  if(rng()<C.ticketChance)items.push({k:'material',id:'dungeon_ticket',n:1});
  C.potions.forEach(p=>{if(rng()<p.chance)items.push({k:'potion',id:p.id,n:p.n});});
  return {coins:randomInt(C.coins[0]/C.coinStep,C.coins[1]/C.coinStep,rng)*C.coinStep,items};
}
// 가방이 차도 보상은 사라지지 않는다. 남은 물품은 저장되는 수령함에 둔다.
export function collectWorldBossMail(h){
  const b=h.bag,remain=[];let received=0;
  for(const item of b.wbMail||[]){let n=item.n;
    if(item.k==='weapon'){
      const sp=WORLD_BOSS_WEAPONS.find(w=>w.id===item.id);
      if(!sp){remain.push(item);continue;}
      while(n>0&&b.w.length<weaponCap(h)){b.w.push({u:b.n++,t:sp.t,r:specialTier(sp),g:sp.g,p:specialPrice(sp),sp:sp.id});n--;received++;}
    }else if(item.k==='armor'){
      while(n>0&&b.a.length<armorCap(h)){b.a.push({u:b.n++,s:item.id,g:3,set:item.set});n--;received++;}
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
  g.wb.active={id,key,mob:m.id,expires,hp:m.hp,max:m.max,x,y,balance:C.revision,phase:'fight',end:0,contrib:[],seq:0,cd:3,attack:null,pools:[],elapsed:0,stun:0};
  notify(E,g,null,`${B.name} 출현`,'광장 월드보스 포탈에서 입장하세요','warn');
}
export function worldBossInput(E,g,pi,req){
  const h=g.heroes[pi],w=g.wb;
  if(!h?.loaded||!req||trading(h))return false;
  if(req.op==='collect'){const n=collectWorldBossMail(h);notify(E,g,h,n?'보상을 받았습니다':'가방 공간이 필요합니다',h.bag.wbMail.length?'남은 물품은 수령함에 보관됩니다':'',n?'good':'bad');return !!n;}
  if(req.op==='leave'){if(h.map!==C.map||h.down>0)return false;E.plaza(g,h);return true;}
  if(h.map!=='plaza'||h.down>0||h.dvs>=0)return false;
  if(!worldBossPortalNear(h)){notify(E,g,h,'월드보스 포탈 가까이 이동해 주세요','','bad');return false;}
  if(req.op==='summon'){
    if(w.active){notify(E,g,h,'이미 월드보스가 출현해 있습니다','','bad');return false;}
    if(!WORLD_BOSS_BY_ID[req.id]||h.coins<C.fee){notify(E,g,h,'소환에는 10만 코인이 필요합니다','','bad');return false;}
    h.coins-=C.fee;
    spawn(E,g,req.id,`${g.wbServer||'RPG'}:paid:${w.clock}:${g.nextId}`,w.clock+C.duration);
    return true;
  }
  if(req.op==='enter'&&w.active?.phase==='fight'){
    h.map=C.map;h.x=C.spawn[0]+pi*18;h.y=C.spawn[1]+pi%3*25;h.gateCd=1;h.hold=[];h.dest=null;h.fire=0;
    return true;
  }
  return false;
}
export function worldBossHit(g,m,h,amount,{direct=true}={}){
  const a=g.wb?.active;if(!h?.loaded||!a||a.phase!=='fight'||a.mob!==m.id||!(amount>0))return;
  const name=worldBossIdentity(g,h);if(!name)return;
  let c=a.contrib.find(c=>c.name===name);if(!c){c={name,damage:0};a.contrib.push(c);}
  c.damage+=Math.max(0,Math.min(m.hp,amount));a.hp=Math.max(0,m.hp-amount);
  const attack=a.attack;
  if(direct&&h.lv>=C.coop.lv&&h.down<=0&&h.map===m.map&&worldBossCoopOpen(a)){
    const now=a.elapsed||0;
    attack.coop=(attack.coop||[]).filter(c=>now-c.at<=C.coop.sync);
    // 같은 캐릭터의 다단 공격과 자리 재사용은 인원을 늘리지 않는다.
    const previous=attack.coop.find(c=>c.name===name);
    if(previous)previous.at=now;else attack.coop.push({name,owner:h.who||h.sw,at:now});
    const present=new Set(activeHeroes(g).filter(h=>h.lv>=C.coop.lv).map(h=>`${worldBossIdentity(g,h)}:${h.who||h.sw}`));
    attack.coop=attack.coop.filter(c=>present.has(`${c.name}:${c.owner}`));
    if(attack.coop.length>=C.coop.players){a.stun=C.coop.stun;a.attack=null;a.breakPending=true;m.pose=0;}
  }
}
export function worldBossKilled(E,g,m){
  const a=g.wb.active;if(!a||a.mob!==m.id||a.phase!=='fight')return;
  a.phase='clear';a.hp=0;a.end=C.endWait;a.attack=null;a.pools=[];a.stun=0;a.breakPending=false;
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
  if(s.shape==='outside')return d>s.r;
  if(s.shape==='ring')return d<=s.r&&d>=s.inner;
  const c=Math.cos(s.a),t=Math.sin(s.a),along=dx*c+dy*t,across=-dx*t+dy*c;
  if(s.shape==='line')return along>=-40&&along<=s.len&&Math.abs(across)<=s.width;
  return d<=s.len&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-s.a),Math.cos(Math.atan2(dy,dx)-s.a)))<=s.arc;
}
export function worldBossCoopOpen(a){
  return !!(a?.phase==='fight'&&!a.stun&&a.attack?.major&&(a.attack.step||0)===0&&a.attack.t>0&&a.attack.t<=C.coop.window);
}
function patternAreas(kind,step,m,heroes,angle){
  const bird=thunderbirdAreas(kind,step,m,heroes,angle);if(bird)return bird;
  const targets=heroes.slice(step%heroes.length).concat(heroes.slice(0,step%heroes.length));
  const circles=(r,n=5)=>targets.slice(0,n).map(h=>area('circle',h.x,h.y,{r}));
  const spokes=(n,a,width=60)=>Array.from({length:n},(_,i)=>area('line',m.x,m.y,{a:a+i*Math.PI*2/n,len:1050,width}));
  if(kind==='cone')return [area('cone',m.x,m.y,{a:angle+[0,.68,-.68][step],len:780,arc:.48})];
  if(kind==='ring')return [step===0?area('ring',m.x,m.y,{inner:175,r:590}):area('circle',m.x,m.y,{r:285})];
  if(kind==='cross')return spokes(4,angle+step*Math.PI/4);
  if(kind==='meteors')return circles(step===2?180:120);
  if(kind==='lightning')return circles(step===2?165:105);
  if(kind==='poison')return circles(155,4);
  if(kind==='inferno'){
    if(step===0)return [area('ring',m.x,m.y,{inner:200,r:800})];
    if(step===3)return [area('cone',m.x,m.y,{a:angle,len:1100,arc:1.02})];
    return circles(step===2?205:155);
  }
  if(kind==='molt')return step===0?[area('ring',m.x,m.y,{inner:245,r:850})]:step===1?[area('circle',m.x,m.y,{r:310})]:circles(195);
  if(kind==='overload')return step===2?[area('ring',m.x,m.y,{inner:215,r:1050})]:spokes(8,angle+step*Math.PI/8,45);
  if(kind==='thunder_wings')return spokes(4,angle+step*Math.PI/4,65);
  if(kind==='thunder_hunt')return circles(step===2?175:115);
  // 안쪽 안전 → 바깥쪽 안전 → 추적 낙뢰. 각 단계의 경고를 보고 피한다.
  if(kind==='thunderstorm')return step===0?[area('ring',m.x,m.y,{inner:240,r:950})]:step===1?[area('circle',m.x,m.y,{r:340})]:circles(190);
  return [];
}
function beginAttack(g,m,a,heroes){
  const B=WORLD_BOSS_BY_ID[a.id],kind=B.attacks[a.seq++%B.attacks.length],P=WORLD_BOSS_PATTERNS[kind];
  const target=(m.taunt>0&&heroes.find(h=>h.pi===m.tgt))||heroes[a.seq%heroes.length],angle=Math.atan2((target.y-m.y)/C.squash,target.x-m.x);
  const wind=P.wind||C.wind;
  const targets=kind==='thunder_dive'?[target,...heroes.filter(h=>h!==target)]:heroes;
  a.attack={kind,name:P.name,major:!!P.major,step:0,stages:P.hits,angle,areas:patternAreas(kind,0,m,targets,angle),t:wind,life:wind,coop:[]};m.pose=1;
}
function impact(E,g,m,a,heroes){
  const attack=a.attack,P=WORLD_BOSS_PATTERNS[attack.kind],last=(attack.step||0)===P.hits-1;
  if(startThunderbirdDive(attack))return; // 준비가 끝나면 실제 경로를 따라 움직이며 한 번씩 친다.
  const damage=last&&P.final?P.final:P.damage;
  if(!attack.diving)heroes.forEach(h=>{if(a.phase==='fight'&&attack.areas.some(s=>worldBossAreaContains(s,h)))E.hurt(g,h,h.max*damage);});
  if(a.phase!=='fight'){a.attack=null;return;}
  if(P.pool&&(!P.major||last))a.pools.push(...attack.areas.filter(s=>s.shape==='circle').map(s=>({...s,t:C.poolTime,next:C.poolTick})));
  const nextSafe=attack.kind==='thunder_eye'&&!last?patternAreas(attack.kind,attack.step+1,m,heroes,attack.angle)[0]:null;
  attack.areas.forEach((s,i)=>E.fx(g,C.map,{...(nextSafe?{nextSafe}:{}),kind:'sk_raid_hit',x:s.x,y:s.y,area:s,t:P.major?.85:.65,life:P.major?.85:.65,tone:a.id,pattern:attack.kind,major:P.major,final:last,seed:i+attack.step*7,snd:['machine','thunderbird'].includes(a.id)?'zap':'boom',kick:i===0?(P.major?.45:.2):0}));
  if(!last){
    if(attack.diving)attack.diving=false;
    attack.step++;attack.t=attack.life=P.gap;attack.coop=[];
    attack.areas=heroes.length?patternAreas(attack.kind,attack.step,m,heroes,attack.angle):[];
  }else{a.attack=null;m.pose=0;a.cd=m.hp/m.max<C.rageAt?C.rageGap:C.gap;}
}
function tickPools(E,g,a,heroes,dt){
  const keep=a.pools.filter(p=>{p.t-=dt;p.next-=dt;if(p.next<=0){p.next+=C.poolTick;heroes.forEach(h=>{if(a.phase==='fight'&&worldBossAreaContains(p,h))E.hurt(g,h,h.max*C.poolPct);});}return p.t>0;});
  a.pools=a.phase==='fight'?keep:[];
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
  if(a.balance!==C.revision){
    const max=WORLD_BOSS_BY_ID[a.id].hp,mul=max/m.max;
    m.hp=Math.max(1,Math.round(m.hp*mul));m.max=max;a.max=max;a.contrib.forEach(c=>c.damage*=mul);a.balance=C.revision;
  }
  // 개편 전 스냅샷의 단발 공격도 남은 준비 시간을 보존하며 이어간다.
  if(a.attack&&!Number.isFinite(a.attack.step)){
    const P=WORLD_BOSS_PATTERNS[a.attack.kind];
    Object.assign(a.attack,{step:0,stages:P.hits,name:P.name,major:!!P.major,angle:a.attack.areas[0]?.a||0,coop:[]});
  }
  a.hp=m.hp;a.x=m.x;a.y=m.y;
  if(w.clock>=a.expires){a.phase='fail';a.end=C.endWait;a.attack=null;a.pools=[];a.stun=0;a.breakPending=false;m.dead=true;notify(E,g,null,'월드보스가 물러났습니다','시간 안에 토벌하지 못했습니다','bad');return;}
  const heroes=activeHeroes(g);a.elapsed=(a.elapsed||0)+dt;
  if(a.breakPending){
    a.breakPending=false;
    E.fx(g,C.map,{kind:'sk_raid_break',x:m.x,y:m.y-130,t:1.1,life:1.1,kick:.35,snd:'orb'});
    heroes.forEach(h=>notify(E,g,h,'합동 공격 성공!',`강력 패턴 차단 · ${C.coop.stun}초 기절`));
  }
  tickPools(E,g,a,heroes,dt);
  if(a.phase!=='fight')return;
  if(a.stun>0){a.stun=Math.max(0,a.stun-dt);m.pose=0;a.cd=C.gap;return;}
  if(a.attack){
    tickThunderbirdDive(E,g,m,a,heroes,dt);
    if(a.phase!=='fight'||!a.attack)return;
    if(worldBossCoopOpen(a))a.attack.coop=(a.attack.coop||[]).filter(c=>a.elapsed-c.at<=C.coop.sync);
    a.attack.t-=dt;
    if(a.attack.t<=0)impact(E,g,m,a,heroes);
  }else if(heroes.length){
    a.cd-=dt;if(a.cd<=0)beginAttack(g,m,a,heroes);
    // 준비 중에는 멈추고 대상이 멀 때만 천천히 다가간다.
    else{const h=heroes[0],d=distance(m.x,m.y,h.x,h.y);if(d>280){m.x+=(h.x-m.x)/d*55*dt;m.y+=(h.y-m.y)/d*55*dt;}}
  }
}

export function worldBossView(g,h){
  const w=g.wb,a=w?.active,name=worldBossIdentity(g,h);
  const damage=a?.contrib.find(c=>c.name===name)?.damage||0;
  return {clock:w?.clock||0,tradeBlocked:trading(h),active:a?{id:a.id,phase:a.phase,hp:a.hp,max:a.max,expires:a.expires,end:a.end,damage,stun:a.stun||0,attack:a.attack?{name:a.attack.name,hint:a.attack.kind==='thunder_dive'&&a.attack.step?WORLD_BOSS_PATTERNS[a.attack.kind].landHint:WORLD_BOSS_PATTERNS[a.attack.kind]?.hint,t:a.attack.t,step:a.attack.step||0,stages:a.attack.stages,major:a.attack.major,open:worldBossCoopOpen(a),coop:a.attack.coop?.length||0}:null}:null,mail:h.bag.wbMail||[]};
}
