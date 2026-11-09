import { rpgTrade } from "./trade.js";
import { trading } from "./tradeData.js";
import { stormBusy } from './stormWeaponCombat.js';
import { cleanSkillAim, cleanSkillPt, aimedSkillInput } from './skillAim.js';
/* ── 받은 입력을 규칙에 넘긴다 — 방장 화면(RpgView.jsx)과 전용 서버(server/)가 같은 것을 쓴다 ──
   d = { cls: 자리, kind, dir, q, aim: 선택적인 스킬 방향, pt: 선택적인 포인터 자리 }. 늦게 도착한 옛 누름 · 뗌 · 이동(hold · mv · fire)은 버린다(freshInput) */
import {
  rpgHold, rpgMove, rpgSkill, rpgWeaponSkill, rpgWeaponRelease, rpgTalk, rpgFire, rpgAuto, rpgPvp, rpgHideGear, rpgStat, rpgUseSkill, rpgDash, rpgParty, rpgTitle,
  rpgWorldBoss, rpgGuild, rpgAdv, rpgDeep, rpgAbyss, rpgRace, rpgDuel, rpgBlock, rpgRequest, rpgQuest, rpgDungeon, rpgTrain, rpgHerb, freshInput, setFxBy,
} from "./rpg.js";
import { rpgShop } from "./shop.js";
import { rpgAdminCmd } from "./adminCmd.js";
import { rpgStory } from "./storyQuest.js";

const ACTS = {
  trade: (g, pi, dir) => rpgTrade(g, pi, dir),
  hold: (g, pi, dir) => rpgHold(g, pi, dir),
  mv: (g, pi, dir) => rpgMove(g, pi, dir),         // 마우스 오른쪽 클릭 이동 — { x, y, m }
  skill: (g, pi) => rpgSkill(g, pi),
  wskill: (g, pi) => rpgWeaponSkill(g, pi),
  wcharge: (g, pi, dir) => dir === true ? rpgWeaponSkill(g, pi) : rpgWeaponRelease(g, pi, dir === "cancel"),
  talk: (g, pi) => rpgTalk(g, pi),
  fire: (g, pi, dir) => rpgFire(g, pi, !!dir),
  auto: (g, pi, dir) => rpgAuto(g, pi, !!dir),
  pvp: (g, pi, dir) => rpgPvp(g, pi, !!dir),
  gear: (g, pi, dir) => rpgHideGear(g, pi, dir),   // 장비 외형 숨기기 — 비트 묶음(rpg.js HIDE_GEAR)
  stat: (g, pi, dir) => rpgStat(g, pi, dir),
  use: (g, pi, dir) => rpgUseSkill(g, pi, dir),
  dash: (g, pi, dir) => rpgDash(g, pi, dir),
  shop: (g, pi, dir) => rpgShop(g, pi, dir),
  herb: (g, pi, dir) => rpgHerb(g, pi, dir),       // 약초 채집 — 시작 · 멈춤(alchemy.js)
  party: (g, pi, dir) => rpgParty(g, pi, dir),
  title: (g, pi, dir) => rpgTitle(g, pi, dir),
  duel: (g, pi, dir) => rpgDuel(g, pi, dir),
  block: (g, pi, dir) => rpgBlock(g, pi, dir),     // 차단 목록 추가 · 해제(block.js)
  req: (g, pi, dir) => rpgRequest(g, pi, dir),
  quest: (g, pi, dir) => rpgQuest(g, pi, dir),
  cmd: (g, pi, dir) => rpgAdminCmd(g, pi, dir),   // 관리자 명령어(채팅 "/")
  dg: (g, pi, dir) => rpgDungeon(g, pi, dir),
  wb: (g, pi, dir) => rpgWorldBoss(g, pi, dir),
  guild: (g, pi, dir) => rpgGuild(g, pi, dir),
  train: (g, pi, dir) => rpgTrain(g, pi, dir),
  adv: (g, pi, dir) => rpgAdv(g, pi, dir),         // 1차 전직 — 시험 · 확정 · 전직 스킬(advance.js)
  deep: (g, pi, dir) => rpgDeep(g, pi, dir),       // 계몽의 문 — 계몽의 눈 만들기 · 400~800레벨 사냥터 입장(deepData.js)
  abyss: (g, pi, dir) => rpgAbyss(g, pi, dir),     // 심연의 탑 — 입장 · 나가기 · 파편 교환(abyssData.js)
  race: (g, pi, dir) => rpgRace(g, pi, dir),       // 광장 몹 레이스 — 참가 · 취소 · 포기(race.js)
  story: (g, pi, dir) => rpgStory(g, pi, dir),   // 메인 스토리 1부 — 대화 마침 · 이야기 장소로 가기(storyQuest.js)
  rgo: (g, pi, dir) => rpgRace(g, pi, { op: "go", on: !!dir }),   // 레이스 질주 누름 · 뗌 — 늦게 온 옛 것은 버린다(FRESH_SLOT)
};
export function rpgInput(g, d) {
  if (!d || !Number.isInteger(d.cls) || !g.heroes[d.cls]) return;
  if(stormBusy(g.heroes[d.cls]) && ['skill','use','adv','dash'].includes(d.kind))return;
  if (d.kind !== "trade" && !(d.kind==="guild"&&["sync","settled"].includes(d.dir?.op)) && trading(g.heroes[d.cls])) return;
  const act = Object.prototype.hasOwnProperty.call(ACTS, d.kind) ? ACTS[d.kind] : null;
  if (!act || !freshInput(g.heroes[d.cls], d.kind, d.q, g.t)) return;
  const prev = setFxBy(d.cls);                     // 이 입력이 낸 스킬 연출의 주인
  const h = g.heroes[d.cls];
  const aimed = aimedSkillInput(d.kind, d.dir);
  h.inputAim = aimed ? cleanSkillAim(d.aim) : null;
  h.inputPt = aimed ? cleanSkillPt(d.pt) : null;
  const taunter=g.heroes[h.tauntBy];if(h.tauntT>0&&taunter?.map===h.map&&taunter.down<=0){h.inputAim=cleanSkillAim([taunter.x-h.x,(taunter.y-h.y)/.78]);h.inputPt=[taunter.x,taunter.y];}
  try { act(g, d.cls, d.dir); } finally { delete h.inputAim; delete h.inputPt; setFxBy(prev); }
}
