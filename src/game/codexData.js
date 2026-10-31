/* ── RPG 도감 · 업적 — 숫자와 목록은 이 파일 한 곳에서 고친다 ─────────────
   도감은 캐릭터 기록(h.rec, socialData.js REC_IDS)의 잡은 수를 그대로 보여 준다. 새로 세는 것은 없다.
   업적은 조건을 채우면 방장(전용 서버)이 코인을 바로 준다(rpg.js awardAchieves). 받은 업적 id 는 가방 b.ac 에 남는다.
   칭호 보상은 socialData.js TITLES 에 같은 조건으로 따로 두어, 칭호 규칙(awardTitles)이 준다.
   숨은 칭호(TITLES[].secret)는 여기에 적지 않는다 — 얻기 전에는 어디에도 보이지 않아야 한다. */

import { GUARD_IDS } from "./abyssData.js";

// 도감 — 무리마다 몹 차례. id 는 기록(REC_IDS) 열쇠다. 허수아비(dummy)는 넣지 않는다
export const CODEX_GROUPS = [
  { id: "field", name: "들판 · 숲", note: "1~200레벨", mobs: ["rabbit", "wolf", "boar", "gorilla", "goblin", "orc", "ogre"] },
  { id: "undead", name: "죽음의 땅", note: "200~400레벨", mobs: ["skeletal", "zombie", "necro", "golem", "chimera", "spider"] },
  { id: "deep", name: "계몽의 문 너머", note: "400~800레벨", mobs: ["fspirit", "lavagolem", "firedrake", "ifrit", "wraith", "abyss", "voidmage", "fallen"] },
  { id: "dungeon", name: "던전", note: "던전 보스와 졸개", mobs: ["gramor", "argas", "morgas", "skeleton", "barkanon", "serka"], boss: 1 },
  { id: "guild", name: "길드 토벌", note: "길드 보스", mobs: ["guild_slime", "guild_siren", "guild_phoenix"], boss: 1 },
  { id: "abyss", name: "심연의 탑", note: "10층마다 나오는 수호자", mobs: GUARD_IDS, boss: 1 },
];
export const CODEX_IDS = CODEX_GROUPS.flatMap((c) => c.mobs);
// 사냥터 몹(던전 · 길드 보스는 빼고) — "모두 100마리" 업적에 쓴다
export const CODEX_FIELD_IDS = CODEX_GROUPS.filter((c) => !c.boss).flatMap((c) => c.mobs);

// 도감 별 — 잡은 수가 이만큼이면 별 하나씩. 처음 한 마리를 잡으면 도감에 모습이 드러난다
export const CODEX_STARS = [1, 100, 1000];

// 도감 칸 수 — 잡은 수가 min 이상인 몹의 수
export const dexCount = (rec, min = 1, ids = CODEX_IDS) => ids.filter((k) => ((rec && rec[k]) || 0) >= min).length;
export const starsOf = (n) => CODEX_STARS.filter((s) => n >= s).length;

/* 업적 조건의 열쇠 — 칭호와 같은 열쇠(lv · 기록 열쇠)에 도감 열쇠를 더한다.
   dex 도감에 드러난 몹 수 · dex100 100마리 넘게 잡은 사냥터 몹 수 · dgboss 던전 보스 다섯을 모두 잡았는지(종류 수) · gboss 길드 보스 종류 수 */
const DG_BOSSES = ["gramor", "argas", "morgas", "barkanon", "serka"];
const GUILD_BOSS_IDS = ["guild_slime", "guild_siren", "guild_phoenix"];
export const CODEX_BOSS_IDS = [...DG_BOSSES, ...GUILD_BOSS_IDS, ...GUARD_IDS];   // 보스 모습으로 그리는 몹
export const CODEX_NEED = {
  dex: (rec) => dexCount(rec),
  dex100: (rec) => dexCount(rec, 100, CODEX_FIELD_IDS),
  dgboss: (rec) => dexCount(rec, 1, DG_BOSSES),
  gboss: (rec) => dexCount(rec, 1, GUILD_BOSS_IDS),
  tguard: (rec) => dexCount(rec, 1, GUARD_IDS),
};
export const CODEX_NEED_NAME = { dex: "도감", dex100: "100마리 넘게 잡은 몹", dgboss: "잡아 본 던전 보스", gboss: "잡아 본 길드 보스", tguard: "잡아 본 탑 수호자" };

/* 업적 — 차례대로 보인다. coin 은 받는 코인(소량), title 은 함께 얻는 칭호 id(TITLES 에 같은 조건으로 있다).
   이미 나간 id 는 바꾸지 않는다(가방 b.ac 에 남는다). 새 업적은 아무 곳에나 더해도 된다 */
export const ACHIEVES = [
  // 도감
  { id: "dex5", group: "도감", name: "첫 도감 기록", need: { dex: 5 }, coin: 1000 },
  { id: "dex15", group: "도감", name: "도감 수집가", need: { dex: 15 }, coin: 3000 },
  { id: "dex25", group: "도감", name: "도감 연구가", need: { dex: 25 }, coin: 6000 },
  { id: "dexall", group: "도감", name: "도감 완성", need: { dex: CODEX_IDS.length }, coin: 20000, title: "dexall" },
  { id: "dex100_10", group: "도감", name: "꾸준한 관찰자", need: { dex100: 10 }, coin: 5000 },
  { id: "dex100_all", group: "도감", name: "모든 사냥터의 기록", need: { dex100: CODEX_FIELD_IDS.length }, coin: 20000, title: "dex100" },
  // 던전 · 보스
  { id: "dg1", group: "던전 · 보스", name: "첫 던전", need: { dg: 1 }, coin: 1000 },
  { id: "dg10", group: "던전 · 보스", name: "던전 단골", need: { dg: 10 }, coin: 4000 },
  { id: "dg100", group: "던전 · 보스", name: "던전 정복자", need: { dg: 100 }, coin: 15000, title: "dg100" },
  { id: "dgboss", group: "던전 · 보스", name: "다섯 군주를 넘은 자", need: { dgboss: DG_BOSSES.length }, coin: 8000 },
  { id: "gboss", group: "던전 · 보스", name: "길드 토벌대", need: { gboss: GUILD_BOSS_IDS.length }, coin: 6000 },
  { id: "boss100", group: "던전 · 보스", name: "우두머리 백 마리", need: { boss: 100 }, coin: 4000 },
  { id: "boss1000", group: "던전 · 보스", name: "우두머리 천 마리", need: { boss: 1000 }, coin: 15000, title: "boss1000" },
  // 모험
  { id: "quest300", group: "모험", name: "사냥꾼의 단골", need: { quest: 300 }, coin: 4000 },
  { id: "req100", group: "모험", name: "광장의 일꾼", need: { req: 100 }, coin: 5000 },
  { id: "party1000", group: "모험", name: "함께라서 든든", need: { party: 1000 }, coin: 4000 },
  // 심연의 탑(abyssData.js)
  { id: "abyss10", group: "심연의 탑", name: "탑의 첫 수호자", need: { atop: 10 }, coin: 5000 },
  { id: "abyss25", group: "심연의 탑", name: "심연의 중턱", need: { atop: 25 }, coin: 15000 },
  { id: "abyss50", group: "심연의 탑", name: "심연을 정복한 자", need: { atop: 50 }, coin: 40000, title: "abyss50" },
  { id: "tguard", group: "심연의 탑", name: "여섯 수호자", need: { tguard: GUARD_IDS.length }, coin: 20000 },
];
export const ACHIEVE_BY_ID = Object.fromEntries(ACHIEVES.map((a) => [a.id, a]));
