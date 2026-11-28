/* 실제 게임 스킬 설명 창(11월 17일 사용자 "격자 연습장 말고 실제 게임에 스킬 상세설명 적용해줘") — RpgView 가 SkillInfoPanel 로 띄운다.
   내 캐릭터의 지금 직업만 보인다: 일반 직업(검사 · 마법사 · 궁수) + 1차 전직 · BLOOD-001 · Gambler 002.
   Engineer 003 · Necromancer 004 · Illusionist 005 는 실제 게임에 이었다. Wyvern Knight 006 도 11월 24일 이었다.
   숫자는 모두 각 데이터 상수에서 만든다(수치를 바꾸면 설명도 따라간다). 설명 문장은 데이터의 note 를 그대로 쓴다 */
import { JOB_BY_ID, BIG_SKILL, RPG, ACTIVE_SKILLS, STATS, jobOf, elemOf, skillName, heldSpecial, heroRange } from "./rpg.js";
import { SKILLS as SHOP_SKILLS, SKILL_USE } from "./shopData.js";
import { WEAPON_SKILLS } from "./skillData.js";
import { advOf } from "./advance.js";
import { BLOOD, BLOOD_NAME, BLOOD_TITLE, TRAIN_NAMES, BLOOD_SHOT, BLOOD_SMASH, BLOOD_FORM, BLOOD_FIELD, BLOOD_WAVE, BLOOD_HOOK,
  BLOOD_PIERCE, BLOOD_SEA, BLOOD_LEGION, BLOOD_ORIGIN, BLOOD_AWAKE, BLOOD_STATE, BLOOD_COST_CUT } from "./bloodJobData.js";
import { bloodView, newLock, awakeLock, stableCap, bloodCost, costCut } from "./bloodJob.js";
import { gamblerView } from "./gamblerJob.js";
import { engineerView } from "./engineerJob.js";
import { necroView } from "./necroJob.js";
import { illusionView } from "./illusionJob.js";   // Illusionist 005(11월 23일 실제 게임)
import { wyvernOn, wyvernView } from "./wyvernJob.js";   // Wyvern Knight 006(11월 24일 실제 게임)
import { hiddenSkillInfo } from "./hiddenSkillInfo.js";

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const x = (v) => `×${Number(Number(v).toFixed(2))}`;
const STAT_NAME = { ...Object.fromEntries(STATS.map((t) => [t.id, t.name])), job: "직업 주 스탯" };
// 데이터 note 는 " · " 로 이어 적었다 — 긴 것은 조각마다 한 줄로 나눠 읽기 쉽게
const lines = (t) => (!t ? [] : t.length > 48 ? t.split(" · ") : [t]);
const sec = (v) => `${Number(Number(v).toFixed(2))}초`;

/* 카드 하나 = { s, act(키 칸), name, tag, lvText, lock, ult, desc[], stats[[이름, 값]], train[] } — SkillInfoPanel 이 그린다 */

// 무기 스킬(X) — 전설 · 월드 무기마다 다르다. 들고 있지 않으면 없음
function weaponCard(h) {
  const sp = heldSpecial(h), W = sp && WEAPON_SKILLS[sp];
  if (!W || !W.skill) return null;
  const S = W.skill, desc = lines(S.note);
  if (W.passive && W.passive.name) desc.push(`늘 켜짐 · ${W.passive.name} — ${W.passive.note || ""}`);
  if (W.elem && W.elem.note) desc.push(W.elem.note);
  const stats = [];
  if (S.cd) stats.push(["대기", sec(S.cd)]);
  if (S.mul) stats.push(["피해", x(S.mul)]);
  if (S.r) stats.push(["범위", `반지름 ${S.r}`]);
  if (S.dur) stats.push(["지속", sec(S.dur)]);
  return { s: sp === "blood_gun" ? "chase" : "wskill", act: "wskill", name: W.name, tag: "무기 스킬", lvText: W.role || "", desc, stats };
}

// 스킬 상점 스킬 — 가방 스킬 칸(1 · 2 · R)에 넣은 액티브와 배운 패시브
function shopCard(h, id, act) {
  const s = SHOP_SKILLS.find((q) => q.id === id);
  if (!s) return null;
  const lv = (h.bag && h.bag.s && h.bag.s[id]) || 0, max = (s.gold || []).length || 5;
  const head = { s: id, act, name: s.name, tag: s.fam === "job" ? "직업 스킬" : s.kind === "passive" ? "패시브" : "스킬", lvText: `스킬 레벨 ${lv}/${max}`, lock: !lv, desc: [s.note] };
  if (s.kind === "passive" && s.bonus) {
    const st = s.bonus.stat, amt = s.bonus.per * Math.max(1, lv);
    return { ...head, act: "", stats: [["효과", `${STAT_NAME[st] || st} +${amt}${st === "crit" ? "%" : ""}`]] };
  }
  const u = s.use || {}, i = Math.max(0, Math.min(Math.max(1, lv), (u.mul || u.heal || u.cut || [1]).length) - 1);
  const stats = [["대기", sec(u.cd)]];
  if (u.mul) stats.push(["피해", `기본 ${SKILL_USE.base} × ${STAT_NAME[u.dmg] || "스탯"} 배율 × ${u.mul[i]}`]);
  if (u.heal) stats.push(["회복", `최대 체력 ${pct(u.heal[i])}`]);
  if (u.cut) stats.push(["피해 감소", `${pct(u.cut[i])} · ${sec(u.dur)}`]);
  if (u.radius) stats.push(["범위", `반지름 ${u.radius}`]);
  if (u.splash) stats.push(["범위", `반지름 ${u.splash}`]);
  if (u.len) stats.push(["길이 · 폭", `${u.len} · ${u.width}`]);
  if (u.reach) stats.push(["사거리", u.reach]);
  if (u.lunge) stats.push(["돌진", u.lunge.reach]);
  if (u.n) stats.push(["발 수", `${u.n}발`]);
  if (u.jumps) stats.push(["옮겨 감", `${u.jumps}번 · 매번 ${pct(u.fall)}`]);
  if (u.back) stats.push(["물러남", u.back]);
  return { ...head, stats };
}

// 1차 전직 — 전직 스킬(Z) · 패시브 · 소환술사 궁극기(G) · 치유사 평타 바꾸기(V)
function advCards(h) {
  const c = advOf(h);
  if (!c) return [];
  const out = [];
  const A = c.active;
  if (A) {
    const stats = [["대기", sec(A.cd)]];
    if (A.dur) stats.push(["지속", sec(A.dur)]);
    if (A.r) stats.push(["범위", `반지름 ${A.r}`]);
    if (A.hits) stats.push(["피해", A.hits.map((q) => x(q.mul)).join(" + ")]);
    else if (A.mul) stats.push(["피해", x(A.mul)]);
    out.push({ s: "adv", act: "adv", name: A.name, tag: "전직 스킬", lvText: c.name, desc: lines(A.note), stats });
  }
  if (c.passive) out.push({ s: "advp", act: "", name: c.passive.name, tag: "전직 패시브", lvText: "늘 켜짐", desc: lines(c.passive.note), stats: [] });
  const U = c.ultimate;
  if (U) {
    const stats = [["대기", sec(U.cd)]];
    if (U.life) stats.push(["지속", sec(U.life)]);
    if (U.mul) stats.push(["내려치기", `${x(U.mul)} · ${sec(U.every)}마다`]);
    out.push({ s: "advUlt", act: "advUlt", name: U.name, tag: "전직 궁극기", ult: 1, lvText: c.name, desc: lines(U.note), stats });
  }
  if (c.healShot) out.push({ s: "healMode", act: "healMode", name: "치유 평타", tag: "평타 바꾸기", lvText: c.name,
    desc: ["누르면 평타가 치유로 바뀌고 다시 누르면 공격으로 돌아옵니다.", "사거리 안에서 다친 아군 모두(나 포함)를 즉시 회복합니다. 결투장에서는 공격 평타입니다."],
    stats: [["회복", `최대 체력 ${pct(c.healShot.heal)}`]] });
  return out;
}

const SKILL_DESC = {
  mage: () => ["적이 없으면 겨눈 쪽에 터집니다."],
};

function normalInfo(h) {
  const job = jobOf(h), el = elemOf(h), c = advOf(h), B = BIG_SKILL[job.id] || BIG_SKILL.archer;
  const ks = (h.bag && h.bag.ks) || { job: "", g: ["", ""] };
  const rules = [job.note];
  if (el && el.name) rules.push(`원소 ${el.name} — 평타가 ${el.hit}. 큰 기술은 ${el.big}.`);
  if (c) rules.push(`${c.name} — ${c.note}`);
  rules.push("스킬 상점에서 배워 가방 스킬 칸에 넣은 스킬만 씁니다.");
  const skills = [
    { s: "skill", act: "skill", name: skillName(h), tag: "큰 기술", ult: 1, lvText: "", desc: SKILL_DESC[job.id] ? SKILL_DESC[job.id](B) : [],
      stats: [["대기", sec(RPG.skillCd)], ...(job.id === "mage" ? [["사거리", B.reach]] : []), ["범위", `반지름 ${B.r}`], ["피해", `평타 피해 ${x(B.mul)}`]] },
    ...advCards(h),
  ];
  ks.g.forEach((id, i) => { const q = id && shopCard(h, id, `use${i + 1}`); if (q) skills.push(q); });
  if (ks.job) { const q = shopCard(h, ks.job, "use5"); if (q) skills.push(q); }
  const w = weaponCard(h);
  if (w) skills.push(w);
  // 배운 패시브(늘 켜짐)
  SHOP_SKILLS.filter((s) => s.kind === "passive" && h.bag && h.bag.s && h.bag.s[s.id]).forEach((s) => skills.push(shopCard(h, s.id, "")));
  const unslot = ACTIVE_SKILLS.filter((s) => h.bag && h.bag.s && h.bag.s[s.id] && !ks.g.includes(s.id) && ks.job !== s.id).map((s) => s.name);
  if (unslot.length) rules.push(`배웠지만 칸에 없는 스킬 — ${unslot.join(" · ")}`);
  return {
    id: job.id, name: c ? c.name : job.name, title: c || (el && el.name) ? [el && el.name, job.name].filter(Boolean).join(" ") : "",
    rules,
    basic: { s: "fire", act: "fire", name: `평타 · ${c ? c.weapon : job.weapon}`, tag: "기본 공격", lvText: "",
      desc: [job.note.split(" · ")[0] + "."],
      stats: [["기본 피해", job.dmg], ["공격 간격", sec(job.cd)], ["사거리", Math.round(heroRange({ ...h, ac: null }))], ...(job.splash ? [["맞은 자리 둘레", `반지름 ${job.splash}`]] : [])] },
    skills,
    note: "피해 배율은 평타 피해 또는 스탯 배율에 곱하는 값입니다. 전투 중 강화 · 장비 효과는 따로 붙습니다.",
  };
}

// BLOOD-001 — 키는 혈 행동 키, 혈역 증폭은 큰 기술 키(빈 칸이면)
function bloodInfo(h) {
  const v = bloodView(h) || {}, lv = v.lv || 1, bd = h.bag && h.bag.bd;
  const U = BLOOD.unlock, lk = (n) => (lv < n ? `직업 레벨 ${n}에 열림` : `직업 레벨 ${n}`);
  const card = (s, act, name, need, desc, stats, extra = {}) => ({ s, act, name, lvText: lk(need), lock: lv < need, desc, stats, ...extra });
  const nl = (D) => { const w = bd ? newLock(bd, D) : "잠김"; return { lock: !!w, lvText: w ? w.replace("열립니다", "열림") : `직업 레벨 ${D.lv}` }; };
  const T = BLOOD_SHOT.tiers, F = BLOOD_FORM;
  const bc = (n) => bloodCost(false, n, lv);   // 레벨 감소가 든 혈량 소모(11월 28일)
  const awk = bd ? awakeLock(bd) : "잠김";
  return {
    id: "blood", name: BLOOD_NAME, title: BLOOD_TITLE, lvLabel: `직업 레벨 ${lv}`,
    rules: [
      `혈량으로 스킬을 씁니다. 안정 한계 ${stableCap(lv)} · 증폭 +${BLOOD.cap.amp} · 과부하 +${BLOOD.cap.over}(직업 레벨 ${BLOOD.cap.step}마다 +${BLOOD.cap.per}).`,
      `혈량 ${BLOOD.regen.below} 아래면 사냥터에서 1초마다 +${BLOOD.regen.gain}. 일반 스킬 칸 · 전직 스킬은 쓰지 않습니다.`,
      `직업 레벨 ${BLOOD_COST_CUT.steps[0]}부터 ${BLOOD_COST_CUT.steps.length}단계로 스킬 혈량 소모가 줄어듭니다(단계당 ${pct(BLOOD_COST_CUT.max / BLOOD_COST_CUT.steps.length)} · 최대 ${pct(BLOOD_COST_CUT.max)}). 지금 −${pct(costCut(lv))}.`,
      `과부하 — 혈량 ${BLOOD_STATE.rage.settle}으로 ${sec(BLOOD_STATE.rage.dur)} 폭주한 뒤 ${sec(BLOOD_STATE.tired.dur)} 탈진합니다. 탈진 중에는 피해 −${pct(-BLOOD_STATE.tired.atk)} · 이동 −${pct(-BLOOD_STATE.tired.spd)} · 체력 회복 −${pct(-BLOOD_STATE.tired.heal)}.`,
      `혈흔 — 평타마다 1중첩(최대 ${BLOOD.mark.max} · ${BLOOD.mark.dur}초) · 중첩당 피해 +${pct(BLOOD.mark.per)}.`,
    ],
    basic: { s: "basic", act: "fire", name: "평타 · 크림슨 레퀴엠", tag: "기본 공격", lvText: "늘 열림",
      desc: ["바탕 직업과 상관없이 한 대상을 쏩니다.", `맞히면 혈량 +${BLOOD.basicGain}과 혈흔 1중첩을 얻습니다.`],
      stats: [["혈량", `+${BLOOD.basicGain}`], ["혈흔", `최대 ${BLOOD.mark.max}중첩`], ["사거리", Math.round(heroRange({ ...h, ac: null }))]] },   // 히든 계열 전용 사거리(hiddenFamilyData.js)
    skills: [
      card("shot", "bShot", BLOOD_SHOT.name, U.shot, ["누르는 동안 모으고 뗄 때 쏩니다.", `${T.map((t, i) => `${i ? `${i}단계 ${t.at}초` : "기본"} ${x(t.mul)}`).join(" · ")}`],
        [["혈량", T.map((t) => bc(t.cost)).join(" · ")], ["대기", T.map((t) => t.cd).join(" · ") + "초"], ["사거리", T.map((t) => t.range).join(" · ")]],
        { train: [`압축형 연마 ${BLOOD_SHOT.sp1} — ${BLOOD_SHOT.pierce}명 관통`, `압축형 연마 ${BLOOD_SHOT.sp2} — 팽창 ${x(BLOOD_SHOT.burstMul)}`, `압축형 연마 ${BLOOD_SHOT.sp3} — 팽창 ${x(BLOOD_SHOT.burstMul3)}`] }),
      card("conv", "bConv", "혈량 전환", 1, [`최대 체력 ${pct(BLOOD.convert.hp)}를 혈량 +${BLOOD.convert.gain}으로 바꿉니다.`],
        [["대기", sec(BLOOD.convert.cd)]]),
      card("smash", "bSmash", BLOOD_SMASH.name, U.smash, ["누르는 동안 모아 앞쪽을 거대한 손으로 내려칩니다.", `일반 몹 경직 ${sec(BLOOD_SMASH.stun)} · 넉백 ${BLOOD_SMASH.kb}.`],
        [["혈량", BLOOD_SMASH.tiers.map((t) => bc(t.cost)).join(" · ")], ["대기", sec(BLOOD_SMASH.cd)], ["범위", `${BLOOD_SMASH.len} × ${BLOOD_SMASH.wid}`], ["피해", `${x(BLOOD_SMASH.mul)} · 최대 차징 ${x(BLOOD_SMASH.fullMul)}`]],
        { train: [`증폭형 연마 ${BLOOD_SMASH.sp50} — 범위 +${pct(BLOOD_SMASH.size50)} · 최대 차징 ${x(BLOOD_SMASH.fullMul50)}`] }),
      card("sword", "bSword", F.sword.name, U.shape, [`혈검을 만들어 ${sec(F.sword.hold)} 동안 손에 듭니다.`, "평타를 새로 누를 때마다 한 번씩 벱니다."],
        [["혈량", bc(F.sword.cost)], ["대기", sec(F.sword.cd)], ["범위", `반지름 ${F.sword.r} · ${F.sword.arc}°`], ["참격", x(F.sword.mul)]],
        { train: [`형상화 연마 25 — 참격 ${x(F.sword.mul25)}`, `형상화 연마 50 — 참격 ${x(F.sword.mul50)} · ${F.sword.wave.every}번째마다 참격파 ${x(F.sword.wave.mul)}`] }),
      card("veil", "bVeil", F.veil.name, U.shape, [`${sec(F.veil.dur)} 동안 받는 피해를 줄입니다.`, `실제로 막았다면 끝날 때 혈량 +${F.veil.back}.`],
        [["혈량", bc(F.veil.cost)], ["대기", sec(F.cd)], ["피해 감소", pct(F.veil.red)]],
        { train: [`형상화 연마 50 — 감소 ${pct(F.veil.red50)} · 가시 반격 ${x(F.veil.spike.mul)}`] }),
      card("wave", "bWave", BLOOD_WAVE.name, U.wave, ["포인터 자리에서 파동이 퍼집니다.", `지나간 대상은 ${sec(BLOOD_WAVE.slow)} 동안 이동 −${pct(BLOOD_WAVE.slowAmt)}.`],
        [["혈량", bc(BLOOD_WAVE.cost)], ["대기", sec(BLOOD_WAVE.cd)], ["범위", `반지름 ${BLOOD_WAVE.r}`], ["피해", x(BLOOD_WAVE.mul)]],
        { train: [`증폭형 연마 ${BLOOD_WAVE.sp50} — 두 번째 파동 ${x(BLOOD_WAVE.mul2)}`] }),
      card("hook", "bHook", BLOOD_HOOK.name, U.hook, ["겨눈 쪽 적에게 갈고리를 걸고 그 앞까지 끌려갑니다.", `도착하면 ${x(BLOOD_HOOK.mul)} + 충격파 ${x(BLOOD_HOOK.shockMul)}.`],
        [["혈량", bc(BLOOD_HOOK.cost)], ["대기", sec(BLOOD_HOOK.cd)], ["사거리", BLOOD_HOOK.reach]],
        { train: [`형상화 연마 50 — 도착 ${x(BLOOD_HOOK.mul50)}`] }),
      card("field", "bField", BLOOD_FIELD.name, U.field, [`누르고 있는 동안 최대 ${sec(BLOOD_FIELD.dur)} · 1초마다 혈량 +${BLOOD_FIELD.gain}.`, "이 획득만 안정 한계를 넘습니다."],
        [["대기", sec(BLOOD_FIELD.cd)], ["범위", `반지름 ${BLOOD_FIELD.r}`], ["이동", `−${pct(BLOOD_FIELD.slow)}`]],
        { train: [`증폭형 연마 50 — 켜진 동안 혈액 스킬 피해 +${pct(BLOOD_FIELD.dmg50)}`] }),
      { s: "pierce", act: "bPierce", name: BLOOD_PIERCE.name, ...nl(BLOOD_PIERCE), desc: ["검은 탄이 줄 위의 적을 모두 꿰뚫고 잔상이 뒤따릅니다."],
        stats: [["혈량", bc(BLOOD_PIERCE.cost)], ["대기", sec(BLOOD_PIERCE.cd)], ["사거리", BLOOD_PIERCE.range], ["피해", `${x(BLOOD_PIERCE.mul)} + 잔상 ${x(BLOOD_PIERCE.ghostMul)} × ${BLOOD_PIERCE.ghosts}`]] },
      { s: "sea", act: "bSea", name: BLOOD_SEA.name, ...nl(BLOOD_SEA), desc: [`내 자리를 ${sec(BLOOD_SEA.dur)} 동안 피의 바다로 바꿉니다.`, `안에 있는 동안 내 다른 혈액 공격 +${pct(BLOOD_SEA.dmg)}.`],
        stats: [["혈량", bc(BLOOD_SEA.cost)], ["대기", sec(BLOOD_SEA.cd)], ["범위", `반지름 ${BLOOD_SEA.r}`], ["피해", `${x(BLOOD_SEA.mul)} × ${BLOOD_SEA.dur} + 끝 ${x(BLOOD_SEA.endMul)}`]] },
      { s: "legion", act: "bLegion", name: BLOOD_LEGION.name, ...nl(BLOOD_LEGION), desc: [`분신 ${BLOOD_LEGION.n}을 ${sec(BLOOD_LEGION.dur)} 동안 부릅니다.`, `끝날 때 셋이 함께 목표를 꿰뚫습니다(${x(BLOOD_LEGION.endMul)}).`],
        stats: [["혈량", bc(BLOOD_LEGION.cost)], ["대기", sec(BLOOD_LEGION.cd)], ["분신 공격", `${x(BLOOD_LEGION.mul)} × ${BLOOD_LEGION.hits}`]] },
      { s: "origin", act: "bOrigin", name: BLOOD_ORIGIN.name, ult: 1, ...nl(BLOOD_ORIGIN), desc: [`${sec(BLOOD_ORIGIN.full)} 모은 뒤 혈액 창 ${BLOOD_ORIGIN.spears}개를 내리꽂고 하나로 모아 터뜨립니다.`, `보스에게는 최대 체력 ${pct(BLOOD_ORIGIN.bossPct)}를 더합니다.`],
        stats: [["혈량", bc(BLOOD_ORIGIN.cost)], ["대기", sec(BLOOD_ORIGIN.cd)], ["피해", `${x(BLOOD_ORIGIN.spearMul)} × ${BLOOD_ORIGIN.spears} + ${x(BLOOD_ORIGIN.endMul)}`]] },
      { s: "awake", act: "bAwake", name: BLOOD_AWAKE.name, ult: 1, lock: !!awk, lvText: awk ? awk.replace("열립니다", "열림") : `연마 합계 ${BLOOD_AWAKE.sum}`,
        desc: [`${sec(BLOOD_AWAKE.dur)} 동안 혈액 스킬 피해 +${pct(BLOOD_AWAKE.dmg)} · 혈량 소모 −${pct(BLOOD_AWAKE.cost)}.`, `공격 스킬마다 첫 대상에게 ${pct(BLOOD_AWAKE.echo)} 잔상.`],
        stats: [["대기", sec(BLOOD_AWAKE.cd)], ["평타 혈흔", `${BLOOD_AWAKE.marks}중첩`]] },
      ...[weaponCard(h)].filter(Boolean),
    ],
    trainNames: TRAIN_NAMES,
    note: `피해는 내 공격력에 곱하는 값입니다. 연마는 ${TRAIN_NAMES.join(" · ")} 셋입니다.`,
  };
}

/* 지금 내 캐릭터의 설명 — { info, lv(직업 레벨, 없으면 0) } */
export function gameSkillInfo(h) {
  if (!h || !h.bag) return null;
  const gv = gamblerView(h);
  if (gv) return { info: hiddenSkillInfo("gambler"), lv: gv.lv || 1 };
  const ev = engineerView(h);
  if (ev) return { info: hiddenSkillInfo("engineer"), lv: ev.lv || 1 };   // 11월 19일 실제 게임에 이음
  const nv = necroView(h);
  if (nv) return { info: hiddenSkillInfo("necromancer"), lv: nv.lv || 1 };   // 11월 22일 사용자 신고 — 그림자 군주가 궁수 설명으로 떴다
  const iv = illusionView(h);
  if (iv) return { info: hiddenSkillInfo("illusionist"), lv: iv.lv || 1 };
  if (wyvernOn(h)) return { info: hiddenSkillInfo("wyvern"), lv: wyvernView(h).lv || 1 };
  const bv = bloodView(h);
  if (bv) return { info: bloodInfo(h), lv: bv.lv || 1 };
  if (!JOB_BY_ID[h.job]) return null;
  return { info: normalInfo(h), lv: 0 };
}
