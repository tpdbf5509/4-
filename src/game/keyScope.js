/* 키 설정 창 — 내 캐릭터가 실제로 쓰는 행동만 보이게 거르고, 구역 · 겹침 · 비어 있음을 셈한다(11월 17일 사용자 "자기 스킬에 맞는 키만").
   저장된 키는 건드리지 않는다. 안 보이는 행동의 키도 그대로 남고, 직업이 바뀌면 다시 보인다.
   keyMap 이 겹친 키를 BLOOD-001 · Gambler 002 먼저 잡으므로(RpgView), 안 쓰는 행동과 겹친 키는 충돌로 치지 않는다 */
import { KEY_ACTIONS, BLOOD_ACTS } from "./keys.js";
import { GM_SLOTS, GM_SKILLS } from "./gamblerData.js";

// 직업과 상관없이 늘 쓰는 행동
const COMMON = ["up", "down", "left", "right", "fire", "dash", "pot1", "pot2", "pot3", "talk", "chat", "stat", "bag", "title", "party", "skills"];
// 일반 직업(검사 · 마법사 · 궁수)이 쓰는 스킬 행동 — 전직 스킬 칸은 전직한 뒤에만, 궁극기 · 평타 바꾸기는 그 전직만
const NORMAL_SKILL = ["skill", "use1", "use2", "use5", "wskill"];
// Gambler 002 — 실제 게임의 히든 직업. 연습장의 다른 히든 직업은 who.hidden 으로 같은 모양을 넘긴다
const GM_HIDDEN = { slots: GM_SLOTS, skills: GM_SKILLS, fire: "황금 칩" };
const hiddenOf = (who) => who.hidden || (who.gambler ? GM_HIDDEN : null);
// 격자 연습장(who.sandbox) — 물약 · 대화 · 창 키는 쓰지 않는다. 스킬 설명(M)은 히든 직업만
const SANDBOX_OFF = ["pot1", "pot2", "pot3", "talk", "chat", "stat", "bag", "title", "party"];

/* 구역 — 창에 보이는 묶음 차례 */
export const KEY_SECTIONS = [
  { id: "move", name: "이동" },
  { id: "basic", name: "기본 전투" },
  { id: "skill", name: "스킬" },
  { id: "potion", name: "물약" },
  { id: "win", name: "창 · 대화" },
];
const SEC_OF = (id) => (["up", "down", "left", "right"].includes(id) ? "move"
  : ["fire", "dash", "skill"].includes(id) ? "basic"
  : id.startsWith("pot") ? "potion"
  : KEY_ACTIONS.find((a) => a.id === id)?.group === "창" ? "win" : "skill");

/* who = { blood, gambler, adv, hidden?: { slots, skills, fire }, sandbox? } — 내 캐릭터의 지금 직업. 알 수 없으면(who 가 null) 모든 행동을 보인다 */
export function activeActs(who) {
  if (!who) return new Set(KEY_ACTIONS.map((a) => a.id));
  const s = baseActs(who);
  if (who.sandbox) { SANDBOX_OFF.forEach((a) => s.delete(a)); if (!hiddenOf(who)) s.delete("skills"); }
  return s;
}
function baseActs(who) {
  const s = new Set(COMMON);
  const hj = hiddenOf(who);
  if (hj) { hj.slots.forEach((q) => s.add(q.act)); return s; }
  if (who.blood) { BLOOD_ACTS.forEach((a) => s.add(a)); s.add("wskill"); s.add("skill"); return s; }   // 큰 기술 키는 혈역 증폭 칸이 비었을 때 그 자리
  NORMAL_SKILL.forEach((a) => s.add(a));
  if (who.adv) s.add("adv");
  if (who.adv === "summoner") s.add("advUlt");
  if (who.adv === "healer") s.add("healMode");
  return s;
}

/* 행동 옆 보조 설명 — 이 직업에서 그 키가 무엇을 하는지 */
export function actNote(id, who) {
  if (!who) return "";
  const hj = hiddenOf(who);
  if (hj) {
    const q = hj.slots.find((s) => s.act === id);
    if (q && hj.skills[q.s]) return hj.skills[q.s].short || hj.skills[q.s].name;
    if (id === "fire") return hj.fire || "";
    return "";
  }
  if (who.blood && id === "skill") return "혈역 증폭 칸이 비었을 때";
  if (who.blood && id === "fire") return "크림슨 레퀴엠";
  return "";
}

/* 창에 그릴 구역 목록 — [{ id, name, rows: [{ a, on(내 직업에서 쓰는가), note, conflict(겹친 행동 이름 목록), empty }] }]
   showOff 가 참이면 안 쓰는 행동도 잠긴 줄로 함께 준다 */
export function keyLayout(binds, who, showOff = false) {
  const on = activeActs(who);
  // 겹침 — 쓰는 행동끼리 같은 키를 나눠 가진 것만(안 쓰는 행동과의 겹침은 게임이 알아서 먼저 고른다)
  const owners = {};
  KEY_ACTIONS.forEach((a) => { if (on.has(a.id)) (binds[a.id] || []).forEach((k) => { if (k) (owners[k] = owners[k] || []).push(a); }); });
  const rows = KEY_ACTIONS.map((a) => {
    const mine = on.has(a.id);
    const conflict = mine ? [...new Set((binds[a.id] || []).filter(Boolean).flatMap((k) => owners[k].filter((o) => o.id !== a.id).map((o) => o.name)))] : [];
    // 비어 있어도 문제가 아닌 행동 — 두 칸 다 비면 안 된다고 보는 것은 쓰는 핵심 행동뿐
    const optional = ["bField", "advUlt", "healMode", "wskill", "adv", "chat", "skills", "pot1", "pot2", "pot3", "title", "party", "dash"].includes(a.id);
    return { a, on: mine, note: actNote(a.id, who), conflict, empty: mine && !optional && !(binds[a.id] || []).some(Boolean) };
  }).filter((r) => r.on || (showOff && !hiddenRow(who, r.a.id)));
  return KEY_SECTIONS.map((s) => ({ ...s, rows: rows.filter((r) => SEC_OF(r.a.id) === s.id) })).filter((s) => s.rows.length);
}

/* 안 쓰는 행동 수 — 「다른 직업 키 N개」 안내 */
export const offCount = (who) => KEY_ACTIONS.filter((a) => !hiddenRow(who, a.id)).length - activeActs(who).size;
// 연습장에서 아예 다루지 않는 행동(물약 · 창) — 「안 쓰는 키 보기」에도 넣지 않는다
const hiddenRow = (who, id) => !!(who && who.sandbox && SANDBOX_OFF.includes(id));
