/* 10월 30일 전투·성장 개편 수치. 사용자가 확정한 기준이다. */
export const COMBAT_RULES = {
  bossDamage: 1.05, defendedBossDamage: .55,
  dungeonScaleLevel: 300, lowAreaXp: .01,
  highStatLevel: 400, highStatPoints: 3,
  circle: { radius: 180, duration: 20, cooldown: 25, attack: .2, healing: .2 },
  duelPotions: 5,
};
export const duelAllies=(a,b)=>!!a&&!!b&&a.map===b.map&&a.ring===b.ring&&a.duelTeam!==undefined&&a.duelTeam===b.duelTeam&&a.dvs>=0&&b.dvs>=0;
export const circleAlly=(a,b)=>a===b||(a.map===b.map&&(a.dvs>=0||b.dvs>=0?duelAllies(a,b):!(a.pvpOn||b.pvpOn)||(a.pty&&a.pty===b.pty)));
export function refreshPowerCircles(g,dt=0){
  g.powerCircles=(g.powerCircles||[]).filter(c=>{c.t-=dt;const h=g.heroes[c.by];return c.t>0&&h?.who===c.owner&&h.map===c.map&&h.down<=0;});
  for(const h of g.heroes){if(!h)continue;h.empower=0;
    for(const c of g.powerCircles){const by=g.heroes[c.by];if(h.map===c.map&&h.down<=0&&circleAlly(by,h)&&Math.hypot(h.x-c.x,(h.y-c.y)/.78)<=c.r)h.empower=1;}
  }
}
export const empowerAttack=h=>1+(h.empower?COMBAT_RULES.circle.attack:0);
export const empowerHealing=h=>1+(h?.empower?COMBAT_RULES.circle.healing:0);
