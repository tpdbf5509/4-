/* ── 받은 입력을 규칙에 넘긴다 — 방장 화면(RpgView.jsx)과 전용 서버(server/)가 같은 것을 쓴다 ──
   d = { cls: 자리, kind, dir, q }. 늦게 도착한 옛 누름 · 뗌(hold · fire)은 버린다(freshInput) */
import {
  rpgHold, rpgSkill, rpgWeaponSkill, rpgTalk, rpgFire, rpgAuto, rpgStat, rpgUseSkill, rpgDash, rpgParty, rpgTitle,
  rpgDuel, rpgRequest, rpgDungeon, rpgTrain, freshInput,
} from "./rpg.js";
import { rpgShop } from "./shop.js";

const ACTS = {
  hold: (g, pi, dir) => rpgHold(g, pi, dir),
  skill: (g, pi) => rpgSkill(g, pi),
  wskill: (g, pi) => rpgWeaponSkill(g, pi),
  talk: (g, pi) => rpgTalk(g, pi),
  fire: (g, pi, dir) => rpgFire(g, pi, !!dir),
  auto: (g, pi, dir) => rpgAuto(g, pi, !!dir),
  stat: (g, pi, dir) => rpgStat(g, pi, dir),
  use: (g, pi, dir) => rpgUseSkill(g, pi, dir),
  dash: (g, pi, dir) => rpgDash(g, pi, dir),
  shop: (g, pi, dir) => rpgShop(g, pi, dir),
  party: (g, pi, dir) => rpgParty(g, pi, dir),
  title: (g, pi, dir) => rpgTitle(g, pi, dir),
  duel: (g, pi, dir) => rpgDuel(g, pi, dir),
  req: (g, pi, dir) => rpgRequest(g, pi, dir),
  dg: (g, pi, dir) => rpgDungeon(g, pi, dir),
  train: (g, pi, dir) => rpgTrain(g, pi, dir),
};
export function rpgInput(g, d) {
  if (!d || !Number.isInteger(d.cls) || !g.heroes[d.cls]) return;
  const act = Object.prototype.hasOwnProperty.call(ACTS, d.kind) ? ACTS[d.kind] : null;
  if (!act || !freshInput(g.heroes[d.cls], d.kind, d.q, g.t)) return;
  act(g, d.cls, d.dir);
}
