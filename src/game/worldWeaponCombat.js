/* 월드보스 무기 판정. 진행 상태는 ws.world에 숫자·문자·배열만 보관해 방장 승계에도 이어간다.
   E는 기존 RPG의 대상 선택·피해·이동·연출 함수다. 피해와 PvP 제한은 기존 판정을 그대로 거친다. */
import { WORLD_WEAPON_SKILLS, WORLD_SET_BY_ID } from './worldEquipmentData.js';
import { worldArmorOnHit, worldCooldownMul } from './armor.js';
const key = o => o.type ? `m${o.id}` : `h${o.pi}`;
const state = h => h.ws.world || (h.ws.world = { cast: null, venom: [], marks: [], flights: [] });
const target = (g, k) => k[0] === 'm' ? g.mobs.find(m => m.id === Number(k.slice(1))) : g.heroes[Number(k.slice(1))];
const effect = (E, g, h, kind, data, life = 0.5) => E.fx(g, h.map, { kind, x: h.x, y: h.y, t: life, life, ...data });
// 새 스킬이 중간에 사용돼도 연속 공격 전체의 PvP 피해 상한을 보존한다.
function damage(E, g, h, o, amount, c, dot = false) {
  if (!E.alive(g, h, o, h.map)) return;
  const previous = h.cast;
  h.cast = c.cap;
  try { E.strike(g, h, o, amount, dot); } finally { h.cast = previous; }
}
function poison(h, o, S, cap) {
  const w = state(h), k = key(o);
  let d = w.venom.find(v => v.key === k);
  if (!d) { d = { key: k, map: h.map, stacks: 0, t: S.duration, next: S.tick, cap }; w.venom.push(d); }
  d.stacks = Math.min(S.max, d.stacks + 1); d.t = S.duration;
}
export function castWorldWeapon(E, g, h, id) {
  const W = WORLD_WEAPON_SKILLS[id];
  if (!W) return false;
  const S = W.skill, [ax, ay] = E.aim(g, h, S.reach || S.len || S.r);
  const [o] = E.near(g, h, h.x, h.y, S.reach || S.len || S.r, 1);
  const [x, y] = o ? [o.x, o.y] : E.end(h, ax, ay, (S.reach || S.len || S.r) * 0.65);
  state(h).cast = { id, map: h.map, t: 0, index: 0, ax, ay, x, y, ox: h.x, oy: h.y,
    cap: { raw: 0, weapon: true }, next: S.delay || 0 };
  if (id === 'machine_sword') {
    const c = state(h).cast;
    E.line(g,h,ax,ay,S.len,S.width).forEach(q => damage(E,g,h,q,E.base(h)*S.mul,c));
    const [x1,y1] = E.end(h,ax,ay,S.len);
    effect(E,g,h,'sk_wb_fracture',{x0:h.x,y0:h.y,x1,y1,w:S.width,snd:'slash'},S.delay);
  }
  h.ws.wcd = S.cd * worldCooldownMul(h);
  h.swing = 0.35;
  effect(E, g, h, 'call', { x: h.x, y: h.y - 104, text: W.name, color: '#ffd873', who: h.pi }, 0.9);
  if (id === 'dragon_dual') effect(E,g,h,'sk_wb_dual_charge',{r:S.r*.75,pi:h.pi},S.delay);
  if (id === 'dragon_staff') effect(E,g,h,'sk_wb_meteor',{x,y,r:S.r,color:'#f6a35f'},S.delay);
  if (S.delay && id !== 'dragon_dual') effect(E, g, h, 'sk_wb_warn', { x: id === 'machine_bow' ? h.x : x, y: id === 'machine_bow' ? h.y : y, r: S.r || 90, color: id.startsWith('machine') ? '#8edbfa' : '#f3aa78' }, S.delay);
  return true;
}
function stepCast(E, g, h, c) {
  const S = WORLD_WEAPON_SKILLS[c.id].skill, i = c.index, last = i === (S.hits || 1) - 1;
  const base = E.base(h), hit = (o, mul, dot = false) => damage(E, g, h, o, base * mul, c, dot);
  if (c.id === 'dragon_dual') {
    if(i===0)effect(E,g,h,'sk_wb_dual_spin',{r:S.r*.75,pi:h.pi,snd:'slash',kick:.12},S.gap*S.surgeAt);
    if(i===S.surgeAt){
      const [x1,y1]=E.end(h,c.ax,c.ay,S.distance);
      c.dashing=true;c.motion={x1,y1,until:c.t+S.surge};
      E.move(h,{x:x1,y:y1},S.surge);
      effect(E,g,h,'sk_wb_dual_dash',{x0:h.x,y0:h.y,x1,y1,pi:h.pi,duration:S.surge,snd:'orb',kick:.22},S.surge+.38);
    }
    // 돌진 중 지나온 선분도 검사한다. 빠르게 움직여 적을 건너뛰어도 판정이 빠지지 않는다.
    const x0=c.lastX??h.x,y0=c.lastY??h.y,list=new Set();
    for(let n=0;n<=3;n++)E.near(g,h,x0+(h.x-x0)*n/3,y0+(h.y-y0)*n/3,S.r).forEach(o=>list.add(o));
    list.forEach(o=>hit(o,last?S.finish:S.mul));c.lastX=h.x;c.lastY=h.y;
    h.swing=.18;
    if(last)effect(E,g,h,'sk_wb_cross',{y:h.y-28,r:S.r,pi:h.pi,snd:'boom',kick:.55},.48);
  } else if (c.id === 'dragon_staff') {
    const r = last ? S.finalRadius : S.r;
    E.near(g,h,c.x,c.y,r).forEach(o=>hit(o,last?S.finish:S.mul));
    // 운석 예고와 착탄은 같은 지역을 쓴다.
    effect(E,g,h,'sk_wb_impact',{x:c.x,y:c.y,r,tone:'fire',snd:'boom',kick:last?.3:.12},0.5);
    if(!last){
      const nextR = i === S.hits - 2 ? S.finalRadius : S.r;
      effect(E,g,h,'sk_wb_warn',{x:c.x,y:c.y,r:nextR,color:'#f6a35f'},S.gap);
      effect(E,g,h,'sk_wb_meteor',{x:c.x,y:c.y,r:nextR,color:'#f6a35f'},S.gap);
    }
  } else if (c.id === 'dragon_bow') {
    const [mx,my] = E.end(h,c.ax,c.ay,S.step); E.move(h,{x:mx,y:my},0.12);
    for(let n=0;n<S.arrows;n++) {
      const a=Math.atan2(c.ay,c.ax)+(n-(S.arrows-1)/2)*S.spread;
      const ax=Math.cos(a),ay=Math.sin(a);
      E.line(g,h,ax,ay,S.len,S.width).forEach(o=>hit(o,S.mul));

    }
    effect(E,g,h,'sk_wb_volley',{x0:h.x,y0:h.y-30,ax:c.ax,ay:c.ay,len:S.len,arrows:S.arrows,spread:S.spread,snd:'shot'},.28);
    if(last){
      const [o]=E.near(g,h,h.x,h.y,S.len,1);
      const [x1,y1]=o?[o.x,o.y]:E.end(h,c.ax,c.ay,S.len);
      effect(E,g,h,'sk_wb_beast',{x0:h.x,y0:h.y-30,x1,y1:y1-30,color:'#f4b16d',dragon:true},S.fly);
      if(o)state(h).flights.push({key:key(o),map:h.map,t:S.fly,mul:S.finish,cap:c.cap});
    }
  } else if(c.id==='serpent_sword'){
    E.arc(g,h,c.ax,c.ay,S.r,S.arc).forEach(o=>{
      hit(o,S.mul); poison(h,o,S.poison,c.cap);
      if(last){const d=state(h).venom.find(v=>v.key===key(o));if(d){hit(o,S.finish*d.stacks);d.t=0;}}
    });
    effect(E,g,h,'sk_wb_venom_slash',{y:h.y-30,r:S.r,a:Math.atan2(c.ay,c.ax),dir:i%2?-1:1,tone:'serpent',snd:'slash'},0.3);
    if(last)effect(E,g,h,'sk_wb_impact',{r:S.r,tone:'poison',snd:'boom'},0.4);
  } else if(c.id==='serpent_staff'){
    E.near(g,h,c.x,c.y,S.r).forEach(o=>hit(o,S.mul,true));
    effect(E,g,h,'sk_wb_pool',{x:c.x,y:c.y,r:S.r},S.gap+0.1);
  } else if(c.id==='serpent_bow'){
    const list=E.line(g,h,c.ax,c.ay,S.len,S.width);
    list.forEach(o=>{
      hit(o,S.mul);
      const w=state(h),k=key(o);w.marks=w.marks.filter(m=>m.key!==k);
      w.marks.push({key:k,map:h.map,t:S.duration,next:0,cap:c.cap});
    });
    const [x1,y1]=E.end(h,c.ax,c.ay,S.len);
    effect(E,g,h,'sk_wb_beast',{x0:h.x,y0:h.y-30,x1,y1:y1-30,color:'#b4da79'},0.4);
  } else if(c.id==='machine_sword'){
    const x=c.ox+c.ax*S.len*(i+1)/S.hits,y=c.oy+c.ay*S.len*(i+1)/S.hits*E.squash;
    E.near(g,h,x,y,S.r).forEach(o=>hit(o,S.burst));
    effect(E,g,h,'sk_wb_lightning',{x,y,r:S.r,snd:'zap'},0.45);
  } else if(c.id==='machine_staff'){
    E.near(g,h,c.x,c.y,S.r).forEach(o=>hit(o,last?S.finish:S.mul));
    effect(E,g,h,last?'sk_wb_lightning':'sk_wb_grid',{x:c.x,y:c.y,r:S.r,snd:'zap'},0.5);
  } else if(c.id==='machine_bow'){
    const list=E.line(g,h,c.ax,c.ay,S.len,S.width),done=new Set(list);
    list.forEach(o=>hit(o,S.mul));
    for(const o of list)for(const q of E.near(g,h,o.x,o.y,S.hop).filter(q=>!done.has(q)).slice(0,S.branches)){
      done.add(q);hit(q,S.chain);
      effect(E,g,h,'sk_wb_arc',{x0:o.x,y0:o.y-20,x1:q.x,y1:q.y-20,snd:'zap'},0.3);
    }
    const [x1,y1]=E.end(h,c.ax,c.ay,S.len);
    effect(E,g,h,'sk_wb_rail',{x0:h.x,y0:h.y-30,x1,y1:y1-30,w:S.width/2,snd:'boom',kick:.25},0.55);
  }
}
export function tickWorldWeapon(E,g,h,dt){
  const w=h.ws?.world;if(!w || !h.loaded)return;
  const id=E.held(h);
  // 맵 이동·사망·장비 교체는 진행 중인 기술과 해당 무기의 표식을 끝낸다.
  if(h.down>0 || !WORLD_WEAPON_SKILLS[id]) {
    if(w.cast?.id==='dragon_dual' && w.cast.dashing){h.dash=0;h.dvx=0;h.dvy=0;}
    h.ws.world=null;return;
  }
  const c=w.cast;
  if(c && (c.map!==h.map || c.id!==id)){
    if(c.id==='dragon_dual' && c.dashing){h.dash=0;h.dvx=0;h.dvy=0;}
    w.cast=null;
  }
  if(w.cast){
    const S=WORLD_WEAPON_SKILLS[c.id].skill;c.t+=dt;
    // 방장 승계 후 남은 돌진을 복원한다. 손님 화면에서 먼저 이동시키지 않는다.
    if(c.dashing && c.motion && !(h.dash>0) && c.motion.until-c.t>.001){
      E.move(h,{x:c.motion.x1,y:c.motion.y1},c.motion.until-c.t);
    }
    while(c.t>=c.next && c.index<(S.hits||1)){
      stepCast(E,g,h,c);c.index++;c.next+=S.gap||1;
    }
    if(c.index>=(S.hits||1))w.cast=null;
  }
  const P=WORLD_WEAPON_SKILLS.serpent_sword.skill.poison;
  w.venom=w.venom.filter(d=>{
    const o=target(g,d.key);if(id!=='serpent_sword'||d.map!==h.map||d.t<=0||!E.alive(g,h,o,h.map))return false;
    d.t-=dt;d.next-=dt;
    while(d.next<=0){damage(E,g,h,o,E.base(h)*P.mul*d.stacks,d,true);d.next+=P.tick;}
    return d.t>0;
  });
  w.marks=w.marks.filter(m=>{m.t-=dt;m.next=Math.max(0,m.next-dt);return id==='serpent_bow'&&m.map===h.map&&m.t>0&&E.alive(g,h,target(g,m.key),h.map);});
  w.flights=w.flights.filter(f=>{
    if(id!=='dragon_bow'||f.map!==h.map)return false;
    f.t-=dt;if(f.t>0)return true;
    const o=target(g,f.key);if(E.alive(g,h,o,h.map))damage(E,g,h,o,E.base(h)*f.mul,f);
    return false;
  });
}
export function worldWeaponBasicHit(E,g,h,o){
  if(E.held(h)!=='serpent_bow')return;
  const m=h.ws?.world?.marks.find(m=>m.key===key(o)&&m.map===h.map&&m.t>0&&m.next<=0);
  if(!m)return;
  const S=WORLD_WEAPON_SKILLS.serpent_bow.skill;m.next=S.markGap;
  E.noProc(()=>damage(E,g,h,o,E.base(h)*S.markMul,m,true));
  effect(E,g,h,'sk_wb_venom_mark',{x:o.x,y:o.y-20,r:40},0.3);
}
export function worldSetHit(E,g,h,o,flags){
  if(!worldArmorOnHit(h,flags))return;
  const M=WORLD_SET_BY_ID.machine;
  E.noProc(()=>E.near(g,h,o.x,o.y,M.radius).forEach(q=>E.strike(g,h,q,E.base(h)*M.mul)));
  effect(E,g,h,'sk_wb_set_discharge',{x:o.x,y:o.y,r:M.radius,snd:'zap'},0.45);
}
