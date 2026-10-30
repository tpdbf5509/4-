import {trading} from './tradeData.js';
/* 1대1·2대2 결투. 팀·소유자·귀환 위치를 통째로 스냅샷에 보존한다. */
import { COMBAT_RULES } from './combatRules.js';
export const duelMembers=d=>d.members||[{pi:d.a,owner:d.wa,team:0},{pi:d.b,owner:d.wb,team:1}];
const present=(g,p)=>{const h=g.heroes[p.pi];return h?.who===p.owner?h:null;};
export const duelOpponents=(g,h)=>g.heroes.filter(o=>o&&o!==h&&o.loaded&&o.map===h.map&&o.ring===h.ring&&o.dph===2&&o.down<=0&&
  (h.duelTeam===undefined?o.pi===h.dvs:o.duelTeam!==h.duelTeam));
const team=(g,h)=>h.pty?g.heroes.filter(o=>o?.loaded&&o.pty===h.pty):[];
const eligible=h=>h?.loaded&&h.down<=0&&h.dvs<0&&!trading(h);
function teamsFor(g,a,b,size){
  if(size!==2)return [[a],[b]];
  if(!a.pty||!b.pty||a.pty===b.pty)return null;
  const sides=[team(g,a),team(g,b)];
  return sides.every(s=>s.length===2&&s.every(h=>h.map==='plaza'))?sides:null;
}
export function duelInput(E,g,pi,req){
  const h=g.heroes[pi],C=E.config;if(!h?.loaded||!req)return false;
  if(req.op==='giveup'){
    const d=g.duels.find(d=>d.phase!=='end'&&duelMembers(d).some(p=>p.pi===pi&&p.owner===h.who));if(!d)return false;
    finish(E,g,d,1-(h.duelTeam||0),'상대 팀이 기권했습니다');return true;
  }
  if(req.op==='ask'){
    const o=g.heroes[req.to];if(!o||o===h)return false;
    const size=req.size===2?2:1,sides=teamsFor(g,h,o,size);
    if(!sides||!sides.flat().every(eligible)){E.sys(g,pi,size===2?'광장의 결투 가능한 2인 파티끼리 신청하세요':'지금 결투를 신청할 수 없습니다');return false;}
    const members=sides.map(s=>s.map(q=>({pi:q.pi,owner:q.who})));
    o.duelInv={from:pi,t:C.reqT,size,members};
    E.sys(g,pi,`${E.name(g,o.pi)}님에게 ${size}대${size} 결투를 신청했습니다`);
    E.sys(g,o.pi,`${E.name(g,pi)}님이 ${size}대${size} 결투를 신청했습니다`);return true;
  }
  if(req.op!=='accept'&&req.op!=='decline')return false;
  const inv=h.duelInv;h.duelInv=null;const o=inv&&g.heroes[inv.from];
  if(!o)return false;
  if(req.op==='decline'){E.sys(g,o.pi,'결투 신청이 거절됐습니다');return true;}
  const size=inv.size||1,sides=teamsFor(g,o,h,size);
  if(!sides||!sides.flat().every(eligible)||inv.members?.some((s,i)=>s.length!==sides[i].length||s.some(p=>!sides[i].some(q=>p.pi===q.pi&&p.owner===q.who)))){
    E.sys(g,pi,'신청 뒤 참가자나 파티 상태가 바뀌었습니다. 다시 신청하세요');return false;
  }
  const ring=E.rings.findIndex((_,i)=>!g.duels.some(d=>d.ring===i));
  if(ring<0){E.sys(g,pi,'결투장이 모두 차 있습니다');return false;}
  const R=E.rings[ring],all=sides.flat();
  const d={a:o.pi,b:h.pi,wa:o.who,wb:h.who,ring,size,phase:'ready',t:C.ready,cnt:C.ready+1,
    members:sides.flatMap((s,t)=>s.map(q=>({pi:q.pi,owner:q.who,team:t}))),ret:all.map(q=>({map:q.map,x:q.x,y:q.y}))};
  g.duels.push(d);
  sides.forEach((side,t)=>side.forEach((q,i)=>{
    q.ret=null;q.map='arena';q.x=R.x+(t?1:-1)*R.rx*.3;q.y=R.y+(i-(size-1)/2)*130;
    q.dir=t?-1:1;q.face=0;q.hold=[];q.dest=null;q.fire=0;q.dash=0;q.hp=q.max;q.down=0;q.duelInv=null;
    q.dvs=sides[1-t][0].pi;q.dph=1;q.dtl=C.ready;q.ring=ring;q.duelTeam=t;q.duelSize=size;q.duelPotions=COMBAT_RULES.duelPotions;
    q.bf={};q.buff=0;q.guard=0;q.tauntBy=-1;q.tauntT=0;
    E.sys(g,q.pi,`${size}대${size} 결투 시작 · 결투용 회복 물약 (소) 5개 지급`);
  }));return true;
}
function finish(E,g,d,win,why){
  if(d.phase==='end')return;d.phase='end';d.t=E.config.end;
  const members=duelMembers(d),losers=members.filter(p=>p.team!==win).map(p=>present(g,p)).filter(Boolean);
  const honor=losers.reduce((n,h)=>n+(h.honor||0),0)/Math.max(1,losers.length);
  for(const p of members){const h=present(g,p);if(!h)continue;
    h.dph=3;h.dtl=E.config.end;h.duelPotions=0;h.tauntBy=-1;h.tauntT=0;
    if(win<0){E.sys(g,h.pi,'결투 무승부. 명예는 그대로입니다');continue;}
    if(p.team===win){const gain=E.honorGain(honor);h.honor+=gain;h.rec.pvp++;E.win(g,h);
      E.fx(g,'arena',{kind:'call',x:h.x,y:h.y-110,text:`승리! 명예 +${gain}`,color:'#ffd873',t:1.6,life:1.6,snd:'clear',who:h.pi});
      E.sys(g,h.pi,`결투에서 이겼습니다. 명예 +${gain}${why?' · '+why:''}`);
    }else E.sys(g,h.pi,`결투에서 졌습니다${why?' · '+why:''}`);
  }
}
export function tickDuelMatches(E,g,dt){
  for(const h of g.heroes){if(!h?.duelInv)continue;h.duelInv.t-=dt;if(h.duelInv.t<=0||!g.heroes[h.duelInv.from])h.duelInv=null;}
  g.duels=g.duels.filter(d=>{
    const members=duelMembers(d),live=[0,1].map(t=>members.filter(p=>p.team===t).map(p=>present(g,p)).filter(h=>h&&h.map==='arena'&&h.ring===d.ring&&h.down<=0));
    if(d.phase!=='end'&&(!live[0].length||!live[1].length))finish(E,g,d,live[0].length?0:live[1].length?1:-1,'상대 팀 전원 전투 불가');
    d.t-=dt;
    if(d.phase==='ready'&&d.t<=0){d.phase='fight';d.t=E.config.time;}
    else if(d.phase==='fight'&&d.t<=0)finish(E,g,d,-1,'시간 초과');
    else if(d.phase==='end'&&d.t<=0){
      members.forEach((p,i)=>{const h=present(g,p);if(!h)return;const r=d.ret[i];
        const back=E.map(r.map)&&r.map!=='arena'?r:E.plaza;h.map=back.map;h.x=back.x;h.y=back.y;h.dest=null;
        h.down=0;h.hp=h.max;h.dvs=-1;h.dph=0;h.dtl=0;h.ring=-1;h.duelPotions=0;delete h.duelTeam;h.duelSize=0;h.gateCd=1;
      });return false;
    }
    for(const p of members){const h=present(g,p);if(h){h.dph=d.phase==='ready'?1:d.phase==='fight'?2:3;h.dtl=Math.max(0,d.t);}}
    return true;
  });
}
