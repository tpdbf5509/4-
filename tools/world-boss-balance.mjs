/* node tools/world-boss-balance.mjs
   만렙 3인 +30 용왕 장비의 공격 전념 측정. 회피·사망·장비 조합 차이를 제외한 표본이다. */
import {makeWorld,rpgSyncSeats,rpgJoin,rpgStep,rpgWeaponSkill,rpgSkill,rpgUseSkill,rpgWorldBoss,LV_MAX} from '../src/game/rpg.js';
import {SKILLS} from '../src/game/shopData.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {WORLD_BOSS as C,WORLD_BOSSES} from '../src/game/worldBossData.js';
const seconds=120,dt=.02,jobs=['warrior','mage','archer'],weapons=['dragon_dual','dragon_staff','dragon_bow'];
const g=makeWorld();g.wb.lastHour=Math.floor(g.wb.clock/C.period);
const seats=jobs.map((job,i)=>({id:`balance${i}`,name:`측정${i}`,hero:{name:`측정${i}`,job,elem:'flame',gender:'m'}}));
rpgSyncSeats(g,seats);
for(let i=0;i<jobs.length;i++){
  const job=jobs[i],w={u:1,t:job==='mage'?'staff':job==='archer'?'bow':'sword',r:10,g:4,p:1,sp:weapons[i],up:30};
  const armor=['head','body','legs','feet'].map((s,n)=>({u:10+n,s,g:3,set:'dragon'}));
  const skills=Object.fromEntries(SKILLS.filter(s=>!s.job||s.job===job).map(s=>[s.id,s.gold.length]));
  const active=SKILLS.filter(s=>s.use&&(!s.job||s.job===job)),jb=active.find(s=>s.job),general=active.filter(s=>!s.job).slice(-2);
  rpgJoin(g,i,{name:seats[i].name,rs:RESET.id,gift:GIFT.id,lv:LV_MAX,coins:C.fee,ts:0,stats:{[job==='mage'?'int':'str']:400,crit:400},
    bag:{oc:1,w:[w],e:1,a:armor,ae:Object.fromEntries(armor.map(a=>[a.s,a.u])),n:20,s:skills,ks:{job:jb.id,g:general.map(s=>s.id)}}},seats[i].id);
  const h=g.heroes[i];h.x=C.portal.x;h.y=C.portal.y+70;h.auto=1;h.inv=99999;
}
rpgWorldBoss(g,0,{op:'summon',id:'dragon'});
const raid=g.wb.active,m=g.mobs.find(m=>m.id===raid.mob);
m.hp=m.max=raid.hp=raid.max=1e12;raid.cd=1e9;raid.expires+=1e12;
g.heroes.filter(Boolean).forEach(h=>{h.map=C.map;h.x=m.x-100;h.y=m.y;h.look=[1,0];});
for(let n=0;n<seconds/dt;n++){
  for(const h of g.heroes.filter(Boolean)){
    h.x=m.x-100;h.y=m.y;
    if(!(h.ws?.wcd>0))rpgWeaponSkill(g,h.pi);
    if(!(h.sk>0))rpgSkill(g,h.pi);
    for(const id of [h.bag.ks.job,...h.bag.ks.g])if(!(h.scd?.[id]>0))rpgUseSkill(g,h.pi,id);
  }
  rpgStep(g,dt);
  if(n%100===0){g.fx=[];g.notes=[];g.sys=[];}
}
const rows=raid.contrib.map(c=>({name:c.name,dps:Math.round(c.damage/seconds)})),total=rows.reduce((n,r)=>n+r.dps,0);
console.log(JSON.stringify({seconds,loadout:'Lv400 / 주 능력400·치명타400 / +30 용왕 무기·4세트',rows,totalDps:total,
  model:WORLD_BOSSES.map(b=>({boss:b.name,hp:b.hp,threeAt90PercentSeconds:Math.ceil(b.hp/(total*.9)),twoAtSampleMaxSeconds:Math.ceil(b.hp/(Math.max(...rows.map(r=>r.dps))*2))}))},null,2));
