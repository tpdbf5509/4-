import { rpgTrade } from "./trade.js";
import { trading } from "./tradeData.js";
/* ── 받은 입력을 규칙에 넘긴다 — 방장 화면(RpgView.jsx)과 전용 서버(server/)가 같은 것을 쓴다 ──
   d = { cls: 자리, kind, dir, q }. 늦게 도착한 옛 누름 · 뗌(hold · fire)은 버린다(freshInput) */
import {
  rpgHold, rpgSkill, rpgWeaponSkill, rpgTalk, rpgFire, rpgAuto, rpgPvp, rpgStat, rpgUseSkill, rpgDash, rpgParty, rpgTitle,
  rpgWorldBoss, rpgGuild, rpgDuel, rpgRequest, rpgQuest, rpgDungeon, rpgTrain, freshInput, setFxBy,
} from "./rpg.js";
import { rpgShop } from "./shop.js";
import { rpgAdminCmd } from "./adminCmd.js";

const ACTS = {
  trade: (g, pi, dir) => rpgTrade(g, pi, dir),
  hold: (g, pi, dir) => rpgHold(g, pi, dir),
  skill: (g, pi) => rpgSkill(g, pi),
  wskill: (g, pi) => rpgWeaponSkill(g, pi),
  talk: (g, pi) => rpgTalk(g, pi),
  fire: (g, pi, dir) => rpgFire(g, pi, !!dir),
  auto: (g, pi, dir) => rpgAuto(g, pi, !!dir),
  pvp: (g, pi, dir) => rpgPvp(g, pi, !!dir),
  stat: (g, pi, dir) => rpgStat(g, pi, dir),
  use: (g, pi, dir) => rpgUseSkill(g, pi, dir),
  dash: (g, pi, dir) => rpgDash(g, pi, dir),
  shop: (g, pi, dir) => rpgShop(g, pi, dir),
  party: (g, pi, dir) => rpgParty(g, pi, dir),
  title: (g, pi, dir) => rpgTitle(g, pi, dir),
  duel: (g, pi, dir) => rpgDuel(g, pi, dir),
  req: (g, pi, dir) => rpgRequest(g, pi, dir),
  quest: (g, pi, dir) => rpgQuest(g, pi, dir),
  cmd: (g, pi, dir) => rpgAdminCmd(g, pi, dir),   // 관리자 명령어(채팅 "/")
  dg: (g, pi, dir) => rpgDungeon(g, pi, dir),
  wb: (g, pi, dir) => rpgWorldBoss(g, pi, dir),
  guild: (g, pi, dir) => rpgGuild(g, pi, dir),
  train: (g, pi, dir) => rpgTrain(g, pi, dir),
};
export function rpgInput(g, d) {
  if (!d || !Number.isInteger(d.cls) || !g.heroes[d.cls]) return;
  if (d.kind !== "trade" && !(d.kind==="guild"&&["sync","settled"].includes(d.dir?.op)) && trading(g.heroes[d.cls])) return;
  const act = Object.prototype.hasOwnProperty.call(ACTS, d.kind) ? ACTS[d.kind] : null;
  if (!act || !freshInput(g.heroes[d.cls], d.kind, d.q, g.t)) return;
  const prev = setFxBy(d.cls);                     // 이 입력이 낸 스킬 연출의 주인
  try { act(g, d.cls, d.dir); } finally { setFxBy(prev); }
}
