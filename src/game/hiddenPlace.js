import { MAPS, FAR_MAPS } from "./rpg.js";
import { eqMap } from "./engineerQuestData.js";
import { nqMap } from "./necroQuestData.js";
import { iqMap } from "./illusionQuestData.js";
import { RQ_MAPS } from "./requiemData.js";

/* 접속 인원 창에서 위치를 숨길 히든 장소 — 히든 직업 해금 · 획득 맵(엔지니어 eng-* · BLOOD-001 연구시설 · 레퀴엠 격리실 · 도박꾼 카지노 뒷방).
   새 히든 직업 맵을 더하면 여기에도 더한다. 광장 · 마을 · 일반 사냥터는 그대로 보인다 */
const HIDDEN_IDS = new Set(["bloodlab", "casino", ...RQ_MAPS]);
export const hiddenPlace = (id) => HIDDEN_IDS.has(id) || eqMap(id) || nqMap(id) || iqMap(id);   // Necromancer 004 탐험 맵(necro_*)도

/* 가짜로 보여 줄 사냥터 — 일반 사냥터 이름만(레벨 제한이 없는 맨 앞 사냥터부터 400레벨대까지) */
const DECOY = ["field", "wolf", "boar", "gorilla", "goblin", "orc", "ogre", ...FAR_MAPS.map((f) => f.id)];
export const DECOY_SECS = 90;   // 한 사람에게 같은 가짜 이름을 유지하는 시간(깜빡임 방지)

/* 사람(seat)마다 시간 덩어리별로 정해지는 값 — 같은 덩어리 안에서는 늘 같다 */
export function shownMapName(id, seat, now = Date.now()) {
  if (!hiddenPlace(id)) return MAPS[id]?.name || "";
  const slot = Math.floor(now / 1000 / DECOY_SECS);
  const x = Math.imul(slot * 31 + (seat | 0) * 977 + 7, 2654435761) >>> 0;
  return MAPS[DECOY[(x >>> 8) % DECOY.length]].name;
}
