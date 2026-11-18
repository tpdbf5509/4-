import test from "node:test";
import assert from "node:assert/strict";
import { defaultKeys, BLOOD_ACTS, bindKey } from "../src/game/keys.js";
import { activeActs, keyLayout, offCount } from "../src/game/keyScope.js";

const ids = (L) => L.flatMap((s) => s.rows.map((r) => r.a.id));

test("일반 직업은 혈 행동 · 전직 칸이 숨는다", () => {
  const on = activeActs({ blood: false, gambler: false, adv: "" });
  BLOOD_ACTS.forEach((a) => assert.ok(!on.has(a)));
  assert.ok(on.has("use1") && on.has("wskill") && !on.has("adv") && !on.has("advUlt") && !on.has("healMode"));
});
test("전직마다 전용 칸만 열린다", () => {
  assert.ok(activeActs({ adv: "summoner" }).has("advUlt"));
  assert.ok(!activeActs({ adv: "summoner" }).has("healMode"));
  assert.ok(activeActs({ adv: "healer" }).has("healMode"));
  assert.ok(activeActs({ adv: "knight" }).has("adv"));
});
test("혈 직업은 혈 행동만, 일반 스킬 칸은 숨는다", () => {
  const on = activeActs({ blood: true });
  assert.ok(on.has("bShot") && on.has("bAwake") && !on.has("use1") && !on.has("adv"));
});
test("도박꾼은 빌려 쓰는 행동만", () => {
  const on = activeActs({ gambler: true });
  ["use1", "use2", "bSmash", "bSword", "use5", "adv", "skill"].forEach((a) => assert.ok(on.has(a)));
  assert.ok(!on.has("bShot") && !on.has("wskill"));
});
test("숨겨도 저장된 키는 그대로 · 모르면 모두 보인다", () => {
  const b = defaultKeys();
  keyLayout(b, { blood: false, adv: "" });
  assert.deepEqual(b, defaultKeys());
  assert.equal(ids(keyLayout(b, null)).length, Object.keys(b).length);
  assert.equal(offCount(null), 0);
});
test("겹침은 쓰는 행동끼리만 센다", () => {
  const b = defaultKeys();   // 혈 행동 3 · 4 가 3 · 4 번 키지만 일반 직업에서는 숨는다
  const L = keyLayout(b, { adv: "" });
  assert.ok(L.every((s) => s.rows.every((r) => !r.conflict.length)));
  const c = { ...b, use2: ["Digit1", ""] };   // 일부러 겹치게
  const rows = keyLayout(c, { adv: "" }).flatMap((s) => s.rows);
  assert.ok(rows.find((r) => r.a.id === "use1").conflict.length === 1);
});
test("showOff 면 안 쓰는 행동도 잠긴 줄로", () => {
  const rows = keyLayout(defaultKeys(), { adv: "" }, true).flatMap((s) => s.rows);
  assert.ok(rows.find((r) => r.a.id === "bShot" && !r.on));
  assert.ok(bindKey);
});

// 격자 연습장(11월 18일) — 물약 · 창 키는 아예 없고, 연습장 히든 직업은 빌린 칸과 스킬 이름이 보인다
import { WY_SLOTS, WY_SKILLS, WY_CLAW } from "../src/game/wyvernData.js";
test("연습장 키 설정은 고른 직업의 행동만 보인다", () => {
  const who = { sandbox: true, blood: false, adv: "", hidden: { slots: WY_SLOTS, skills: WY_SKILLS, fire: WY_CLAW.name } };
  const on = activeActs(who);
  WY_SLOTS.forEach((q) => assert.ok(on.has(q.act)));
  ["pot1", "talk", "bag", "chat", "bConv"].forEach((a) => assert.ok(!on.has(a)));
  assert.ok(on.has("skills"));
  const all = ids(keyLayout(defaultKeys(), who, true));
  assert.ok(!all.includes("pot1") && !all.includes("bag"));
  const fire = keyLayout(defaultKeys(), who).flatMap((s) => s.rows).find((r) => r.a.id === "fire");
  assert.equal(fire.note, WY_CLAW.name);
  const normal = activeActs({ sandbox: true, blood: false, adv: "" });
  assert.ok(!normal.has("skills") && normal.has("use1"));
  assert.equal(offCount(who), ids(keyLayout(defaultKeys(), who, true)).length - on.size);
});
