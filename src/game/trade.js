import { TRADE, lockPlace } from './tradeData.js';
// 돈과 물품은 여기서 옮기지 않는다. DB를 확인한 각 기기가 기록을 다시 싣는다.
export function rpgTrade(g, pi, d) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !d || !Number.isSafeInteger(d.q) || d.q <= (h.tradeQ || 0)) return;
  h.tradeQ = d.q;
  if (d.op === 'clear') { h.trade = null; return; }
  if (d.op !== 'lock' || !lockPlace(h.map, true) || h.down > 0 || h.dvs >= 0) return;
  h.trade = { q: d.q, until: Date.now() + TRADE.lockMs };
  h.hold = []; h.dest = null; h.fire = 0; h.fireQ = 0; h.dash = 0;
}
