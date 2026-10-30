/* 뇌조만의 범위와 급강하. 모든 진행 상태는 기존 attack에 숫자·배열로 보관해 승계를 지원한다. */
import { WORLD_BOSS as C, WORLD_BOSS_PATTERNS as PATTERNS, worldBossIdentity } from './worldBossData.js';
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function thunderbirdAreas(kind,step,m,heroes,angle){
  const P=PATTERNS[kind];
  if(kind==='thunder_feathers')return P.angles.map(a=>({shape:'line',x:m.x,y:m.y,a:angle+a+step*P.shift,len:P.len,width:P.width}));
  if(kind==='thunder_dive'){
    if(step)return [{shape:'ring',x:m.x,y:m.y,inner:P.inner,r:P.r}];
    const target=heroes[0],d=target?Math.hypot(target.x-m.x,(target.y-m.y)/C.squash):P.minLen;
    const len=clamp(d+P.overshoot,P.minLen,P.maxLen);
    const x=clamp(m.x+Math.cos(angle)*len,P.margin,C.w-P.margin),y=clamp(m.y+Math.sin(angle)*len*C.squash,P.margin,C.h-P.margin);
    const dx=x-m.x,dy=(y-m.y)/C.squash;
    return [{shape:'line',x:m.x,y:m.y,a:Math.atan2(dy,dx),len:Math.hypot(dx,dy),width:P.width}];
  }
  if(kind==='thunder_eye')return [{shape:'outside',
    x:clamp(m.x+Math.cos(angle)*P.offsets[step],P.margin,C.w-P.margin),
    y:clamp(m.y+Math.sin(angle)*P.offsets[step]*C.squash,P.margin,C.h-P.margin),r:P.radii[step]}];
  return null;
}
export function startThunderbirdDive(attack){
  if(attack.kind!=='thunder_dive'||attack.step!==0||attack.diving)return false;
  const s=attack.areas[0];if(!s)return false;
  attack.diving=true;attack.hitNames=[];attack.t=attack.life=PATTERNS.thunder_dive.dive;
  return true;
}
export function tickThunderbirdDive(E,g,m,a,heroes,dt){
  const attack=a.attack;if(!attack?.diving)return;
  const s=attack.areas[0],P=PATTERNS.thunder_dive;
  const progress=Math.min(1,Math.max(0,1-(attack.t-dt)/P.dive));
  const x=s.x+Math.cos(s.a)*s.len*progress,y=s.y+Math.sin(s.a)*s.len*C.squash*progress;
  const travelled=(x-m.x)*Math.cos(s.a)+(y-m.y)/C.squash*Math.sin(s.a);
  const seen=new Set(attack.hitNames);
  for(const h of heroes){
    const name=worldBossIdentity(g,h),dx=h.x-m.x,dy=(h.y-m.y)/C.squash;
    const along=dx*Math.cos(s.a)+dy*Math.sin(s.a),across=Math.abs(-dx*Math.sin(s.a)+dy*Math.cos(s.a));
    const fromStart=(h.x-s.x)*Math.cos(s.a)+(h.y-s.y)/C.squash*Math.sin(s.a);
    if(!seen.has(name)&&fromStart>=-40&&fromStart<=s.len&&along>=-P.width&&along<=travelled+P.width&&across<=s.width){
      seen.add(name);attack.hitNames.push(name);E.hurt(g,h,h.max*P.damage);
      if(a.phase!=='fight'||a.attack!==attack)return; // 기사의 반격으로 뇌조가 쓰러졌으면 돌진도 끝낸다.
    }
  }
  m.x=a.x=x;m.y=a.y=y;
}
