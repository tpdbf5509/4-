/* 방장만 판정한다. 모든 진행 상태는 ws.storm에 직렬화 가능하게 보관한다. */
import { STORM_SKILLS, stormSpot } from './stormWeaponData.js';
const key = o => o.type ? `m${o.id}` : `h${o.who || o.pi}`;
export const stormCharging = h => h.ws?.storm?.id === 'azure_dual' && h.ws.storm.phase === 'charge';
export const stormBusy = h => stormCharging(h) || (h.ws?.storm?.id === 'azure_dual' && h.ws.storm.phase === 'dash');
const effect = (E,g,h,kind,c,life,snd) => E.fx(g,h.map,{kind,x:c.ox,y:c.oy,ax:c.ax,ay:c.ay,pi:h.pi,token:c.token,t:life,life,snd});
function stop(h) {
  if (h.ws?.storm?.phase === 'dash') { h.dash=0; h.dvx=0; h.dvy=0; }
  if(h.ws) h.ws.storm=null;
}
function valid(E,g,h,c) { return h.loaded && h.down<=0 && h.map===c.map && E.held(h)===c.id && !E.locked(h) && !E.safe(h.map) && !E.trading(h); }
function damage(E,g,h,c,o,mul) {
  if(!E.alive(g,h,o,c.map))return;
  const previous=h.cast;h.cast=c.cap;
  try { E.strike(g,h,o,c.base*mul); } finally { h.cast=previous; }
}
export function castStormWeapon(E,g,h,id) {
  const W=STORM_SKILLS[id];if(!W)return false;
  if(h.ws.storm)return true; // 훈련장 대기시간 해제 중에도 같은 기술을 중첩하지 않는다.
  const S=W.skill,[ax,ay]=E.face(h);
  const c={id,map:h.map,phase:id==='azure_dual'?'charge':'cast',t:0,index:0,ax,ay,ox:h.x,oy:h.y,
    base:E.base(h),cap:{raw:0,weapon:true,sid:'wpn'},hits:[],lastX:h.x,lastY:h.y,travel:0,
    token:`${h.who||h.pi}:${g.t}:${id}`};
  h.ws.storm=c;h.ws.wcd=S.cd*E.cooldown(h);h.swing=.28;
  if(id==='azure_dual'){h.dash=0;h.dvx=0;h.dvy=0;}
  else effect(E,g,h,id==='storm_staff'?'sk_storm_staff':'sk_storm_bow',c,S.life,'zap');
  E.fx(g,h.map,{kind:'call',x:h.x,y:h.y-104,text:W.name,color:id==='azure_dual'?'#adfaff':'#c5c7ff',who:h.pi,t:.8,life:.8});
  return true;
}
export function releaseStormWeapon(E,g,h,cancel=false) {
  const c=h?.ws?.storm;if(!c || c.id!=='azure_dual' || c.phase!=='charge')return;
  if(cancel || !valid(E,g,h,c)){stop(h);return;}
  c.released=true;
  if(c.t<STORM_SKILLS.azure_dual.skill.minCharge)return;
  launch(E,g,h,c);
}
function launch(E,g,h,c) {
  const S=STORM_SKILLS.azure_dual.skill;
  c.phase='dash';c.t=0;c.ox=h.x;c.oy=h.y;c.lastX=h.x;c.lastY=h.y;
  const [x,y]=E.end(h,c.ax,c.ay,S.distance);c.endX=x;c.endY=y;
  E.move(h,{x,y},S.dash);h.swing=S.dash;
  effect(E,g,h,'sk_storm_dash',c,S.life,'slash');
}
function sweep(E,g,h,c,x0,y0,x1,y1,width,mul) {
  const dx=x1-x0,dy=(y1-y0)/E.squash,len=Math.hypot(dx,dy);
  if(len<.001)return;
  E.lineFrom(g,h,x0,y0,dx/len,dy/len,len,width).forEach(o=>{
    const k=key(o);if(c.hits.includes(k))return;c.hits.push(k);damage(E,g,h,c,o,mul);
  });
}
export function tickStormWeapon(E,g,h,dt) {
  const c=h.ws?.storm;if(!c)return;
  if(!valid(E,g,h,c)){stop(h);return;}
  const S=STORM_SKILLS[c.id]?.skill;if(!S){stop(h);return;}
  c.t+=dt;
  if(c.id==='storm_staff'){
    while(c.index<S.spots.length && c.t>=S.delay+c.index*S.gap){
      const [x,y]=stormSpot(c,S.spots[c.index++],E.squash);
      E.near(g,h,x,y,S.r).forEach(o=>damage(E,g,h,c,o,S.mul));
    }
    if(c.t>=S.life)stop(h);
  }else if(c.id==='violet_bow'){
    const next=Math.min(S.len,Math.max(0,(c.t-S.charge)/S.flight)*S.len);
    if(next>c.travel){
      const [x0,y0]=stormSpot(c,[c.travel,0],E.squash),[x1,y1]=stormSpot(c,[next,0],E.squash);
      sweep(E,g,h,c,x0,y0,x1,y1,S.width,S.mul);c.travel=next;
    }
    if(c.t>=S.life)stop(h);
  }else if(c.phase==='charge'){
    if(c.t>=S.maxCharge || (c.released && c.t>=S.minCharge))launch(E,g,h,c);
  }else if(c.phase==='dash'){
    sweep(E,g,h,c,c.lastX,c.lastY,h.x,h.y,S.width,S.mul);c.lastX=h.x;c.lastY=h.y;
    // 승계 직후 남은 돌진만 복구한다. 이미 지난 경로의 중복 피해는 hits가 막는다.
    if(!(h.dash>0) && c.t<S.dash)E.move(h,{x:c.endX,y:c.endY},S.dash-c.t);
    if(c.t>=S.dash && !(h.dash>0)){
      c.phase='finish';c.finishX=h.x;c.finishY=h.y;
      E.near(g,h,h.x,h.y,S.r).forEach(o=>damage(E,g,h,c,o,S.finish));
      E.fx(g,h.map,{kind:'sk_storm_finish',x:h.x,y:h.y,ax:c.ax,ay:c.ay,pi:h.pi,t:S.life-S.dash,life:S.life-S.dash,snd:'boom',kick:.22});
    }
  }else if(c.t>=S.life)stop(h);
}
