/* 길드 토벌 판정은 방장만 돌린다. 영속 소속·화폐·순위는 guild.sql의 입장권 RPC가 맡는다. */
import {GUILD as C,GUILD_BOSS_BY_ID,GUILD_BOSS_BY_TYPE,guildMap,guildKey,GUILD_HALL as H,guildHallMap} from './guildData.js';
import {worldBossAreaContains} from './worldBoss.js';
import {trading} from './tradeData.js';
export const isGuildBoss=m=>!!GUILD_BOSS_BY_TYPE[m?.type];
export const guildRunOf=(g,h)=>(g.gruns||[]).find(r=>r.map===h?.map)||null;
/* 길드 광장 — 길드마다 칸 하나를 방장이 빌려준다(g.ghalls [{guild, slot}]). 안에 아무도 없으면 칸을 돌려받는다.
   칸 번호만 스냅샷 맵 차례로 가고, 어느 길드 칸인지는 들어온 사람의 h.guild.id 로 정한다(방장이 바뀌면 다시 짝짓는다) */
export const isGuildHall=map=>typeof map==='string'&&map.startsWith('guildhall-');
const hallOf=(g,id)=>(g.ghalls||[]).find(x=>x.guild===id)||null;
export const guildHallOf=(g,h)=>{const x=h?.guild?.id&&hallOf(g,h.guild.id);return x?guildHallMap(x.slot):null;};
function toHall(E,g,h){
  const id=h.guild?.id;if(!id)return false;
  let x=hallOf(g,id);
  if(!x){let slot=0;while((g.ghalls||[]).some(q=>q.slot===slot))slot++;if(slot>=H.slots)return false;x={guild:id,slot};(g.ghalls||=[]).push(x);}
  h.map=guildHallMap(x.slot);h.x=H.spawn[0]+(Math.random()-.5)*120;h.y=H.spawn[1]+(Math.random()-.5)*40;h.hold=[];h.dest=null;h.fire=0;h.gateCd=1;
  E.fx(g,h.map,{kind:'ring',x:h.x,y:h.y-10,r:50,color:'#e6d6a0',t:.5,life:.5});return true;
}
// 토벌을 마치면 그 길드의 광장으로, 길드가 없으면 광장으로
const home=(E,g,h)=>{if(!toHall(E,g,h))E.plaza(g,h);};
const area=(shape,x,y,extra)=>({shape,x,y,...extra});
function bossBody(E,g,r){const b=GUILD_BOSS_BY_ID[r.boss],m=E.body(r.mob,-1,b.type,1,C.raidLevel,r.map,r.x,r.y,{hp:b.hp,dmg:1,xp:0,coin:0});m.hp=r.hp;m.max=b.hp;m.pose=r.attack?1:0;return m;}
export function guildRestore(E,g){
  g.mobs=g.mobs.filter(m=>!isGuildBoss(m));
  for(const r of g.gruns||[])if(r.phase==='fight')g.mobs.push(bossBody(E,g,r));
  g.nextId=Math.max(g.nextId,...(g.gruns||[]).map(r=>r.mob+1));
}
function notice(E,g,h,text,sub=''){E.notice(g,{text,sub,who:h?.pi??-1,t:5,life:5,tone:'#ffe0a0'});}
export function guildInput(E,g,pi,d){
  const h=g.heroes[pi];if(!h?.loaded||!d)return false;
  if(d.op==='sync'){
    const s=d.state;if(!s||!Number.isInteger(s.used)||s.used<0||s.used>C.coreMax)return false;
    const level=Math.floor(Math.min(C.templeMax,Math.max(0,Number(s.level)||0)));
    const ticket=s.raid,raid=ticket&&typeof ticket.id==='string'&&typeof ticket.guild==='string'&&GUILD_BOSS_BY_ID[ticket.boss]&&Array.isArray(ticket.members)&&ticket.members.length<=C.cap&&Number.isFinite(ticket.expires)?{id:ticket.id.slice(0,36),guild:ticket.guild.slice(0,36),boss:ticket.boss,server:String(ticket.server).slice(0,4),expires:ticket.expires,members:ticket.members.filter(n=>typeof n==='string'&&n.length<=16)}:null;
    h.guild={id:typeof s.id==='string'?s.id.slice(0,36):null,name:String(s.name||'').slice(0,12),level:s.id?level:0,used:s.used,raid};
    E.refresh(h);return true;
  }
  if(d.op==='settled'){g.gresults=(g.gresults||[]).filter(r=>r.id!==d.id||!r.members.includes(guildKey(g,h)));return true;}
  if(d.op==='hall'){                                // 광장의 길드 문 → 내 길드 광장
    if(h.map!=='plaza'||h.down>0||trading(h)||h.dvs>=0||!h.guild?.id)return false;
    if(!toHall(E,g,h)){notice(E,g,h,'길드 광장을 준비하고 있습니다','잠시 뒤 다시 들어와 주세요');return false;}
    return true;
  }
  const r=guildRunOf(g,h);
  if(d.op==='leave'){if(!r)return false;home(E,g,h);return true;}
  // 토벌 입장은 내 길드 광장(토벌전 문)에서 — 예전처럼 광장에서도 된다
  const atHall=isGuildHall(h.map)&&guildHallOf(g,h)===h.map;
  if(d.op!=='enter'||!(h.map==='plaza'||atHall)||h.down>0||trading(h)||h.dvs>=0)return false;
  const t=h.guild?.raid;
  if(!t||t.guild!==h.guild.id||t.server!==g.wbServer||!Array.isArray(t.members)||!t.members.includes(guildKey(g,h))||t.expires<=Date.now()||!GUILD_BOSS_BY_ID[t.boss])return false;
  let run=(g.gruns||[]).find(r=>r.id===t.id);
  if(run&&run.phase!=='fight')return false;
  if(!run){
    let slot=0;while((g.gruns||[]).some(r=>r.slot===slot))slot++;if(slot>=C.slots){notice(E,g,h,'토벌 공간을 준비하고 있습니다','잠시 뒤 토벌 합류를 눌러 주세요');return false;}
    const [x,y]=C.center,B=GUILD_BOSS_BY_ID[t.boss];
    run={id:t.id,guild:t.guild,boss:t.boss,members:[...t.members],slot,map:guildMap(slot),mob:g.nextId++,x,y,hp:B.hp,max:B.hp,expires:t.expires,
      t:Math.min(C.raidSeconds,(t.expires-Date.now())/1000),phase:'fight',end:0,seq:0,cd:2,attack:null,contrib:[],reported:false};
    (g.gruns||=[]).push(run);g.mobs=g.mobs.filter(m=>m.map!==run.map);g.mobs.push(bossBody(E,g,run));
  }
  h.map=run.map;h.x=C.spawn[0]+pi%2*40;h.y=C.spawn[1]+pi%3*30;h.hold=[];h.dest=null;h.fire=0;h.gateCd=1;
  notice(E,g,h,'길드 토벌 시작',GUILD_BOSS_BY_ID[run.boss].name);return true;
}
export function guildHit(g,m,h,damage){
  if(!h?.loaded||h.map!==m.map||damage<=0)return;
  const r=guildRunOf(g,h),key=guildKey(g,h);if(!r||r.phase!=='fight'||!r.members.includes(key))return;
  if(!r.contrib.includes(key))r.contrib.push(key);r.hp=Math.max(0,m.hp-damage);
}
export function guildKilled(E,g,m){
  const r=(g.gruns||[]).find(r=>r.mob===m.id);if(!r||r.phase!=='fight')return;
  r.phase='clear';r.hp=0;r.end=C.exitWait;r.attack=null;
  (g.gresults||=[]).push({id:r.id,phase:r.phase,contrib:[...r.contrib],members:[...r.members]});
  g.heroes.filter(h=>h?.map===r.map).forEach(h=>notice(E,g,h,'길드 토벌 완료!',`길드 점수 +${GUILD_BOSS_BY_ID[r.boss].points} · 길드석 보상 정산 중`));
}
function areas(r,m,heroes){
  const kind=GUILD_BOSS_BY_ID[r.boss].patterns[r.seq%2],angle=(r.seq%8)*Math.PI/4;
  if(kind==='slam')return {kind,name:'강화 점액 폭발',areas:[area('circle',m.x,m.y,{r:380})]};
  if(kind==='split')return {kind,name:'분열 점액탄',areas:heroes.map(h=>area('circle',h.x,h.y,{r:155}))};
  if(kind==='wave')return {kind,name:'해일의 고리',areas:[area('ring',m.x,m.y,{inner:225,r:850})]};
  if(kind==='song')return {kind,name:'세이렌의 공명',areas:heroes.map(h=>area('circle',h.x,h.y,{r:210}))};
  if(kind==='feather')return {kind,name:'불꽃 깃털',areas:Array.from({length:6},(_,i)=>area('line',m.x,m.y,{a:angle+i*Math.PI/3,width:65,len:1000}))};
  return {kind,name:'불사조의 심판',areas:[area('ring',m.x,m.y,{inner:240,r:1050}),...heroes.slice(0,2).map(h=>area('circle',h.x,h.y,{r:125}))]};
}
export function tickGuild(E,g,dt){
  // 길드 광장 — 길드를 떠났거나 다른 길드 칸에 있으면 광장으로. 빈 칸은 돌려받는다
  g.heroes.forEach(h=>{if(h?.loaded&&isGuildHall(h.map)&&guildHallOf(g,h)!==h.map){
    const x=(g.ghalls||[]).find(q=>guildHallMap(q.slot)===h.map);
    if(!x&&h.guild?.id){(g.ghalls||=[]).push({guild:h.guild.id,slot:Number(h.map.slice(10))});return;}   // 방장이 바뀌어 짝을 잃었다 — 이 사람의 길드로 다시 짝짓는다
    E.plaza(g,h);
  }});
  g.ghalls=(g.ghalls||[]).filter(x=>g.heroes.some(h=>h?.map===guildHallMap(x.slot)));
  g.gruns=(g.gruns||[]).filter(r=>{
    const inside=g.heroes.filter(h=>h?.map===r.map),alive=inside.filter(h=>h.loaded&&h.down<=0);
    const close=()=>{inside.forEach(h=>home(E,g,h));g.mobs=g.mobs.filter(m=>m.map!==r.map);return false;};
    if(r.phase!=='fight'){r.end-=dt;return r.end>0?true:close();}
    r.t=Math.min(r.t-dt,(r.expires-Date.now())/1000);
    if(r.t<=0||(!inside.length&&r.t<C.raidSeconds-3)){
      r.phase='fail';r.end=C.exitWait;r.attack=null;(g.gresults||=[]).push({id:r.id,phase:r.phase,contrib:[...r.contrib],members:[...r.members]});g.mobs.forEach(m=>{if(m.map===r.map)m.dead=true;});
      inside.forEach(h=>notice(E,g,h,'길드 토벌 종료','시간 초과 또는 모든 참여자가 퇴장했습니다'));return true;
    }
    const m=g.mobs.find(m=>m.id===r.mob&&!m.dead);if(!m){guildRestore(E,g);return true;}
    r.hp=m.hp;r.x=m.x;r.y=m.y;
    if(r.attack){
      r.attack.t-=dt;
      if(r.attack.t<=0){
        const a=r.attack;alive.forEach(h=>{if(r.phase==='fight'&&a.areas.some(s=>worldBossAreaContains(s,h)))E.hurt(g,h,h.max*GUILD_BOSS_BY_ID[r.boss].damage);});
        if(r.phase!=='fight')return true;
        a.areas.forEach((s,i)=>E.fx(g,r.map,{kind:'sk_guild_hit',x:s.x,y:s.y,area:s,boss:r.boss,seed:i,t:.8,life:.8,kick:i===0?.25:0,snd:r.boss==='siren'?'orb':'boom'}));
        r.attack=null;m.pose=0;r.cd=m.hp/m.max<C.rageAt?C.rageGap:C.gap;
      }
    }else if(alive.length){
      r.cd-=dt;if(r.cd<=0){r.attack={...areas(r,m,alive),t:C.wind,life:C.wind};r.seq++;m.pose=1;}
    }
    return true;
  });
}
export function guildReport(g,h){
  const key=guildKey(g,h);
  return (g.gresults||[]).filter(r=>r.members.includes(key)).map(r=>({id:r.id,outcome:r.phase,contributors:r.contrib}));
}
export function guildView(g,h){const r=guildRunOf(g,h);return {run:r?{...r,members:undefined,contrib:undefined}:null,reports:guildReport(g,h)};}
