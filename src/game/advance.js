/* ── RPG 1차 전직 규칙 (방장만 판정) ─────────────────────────────
   수치는 advData.js. E 는 rpg.js 의 대상 고르기 · 피해 · 연출 함수(advEngine) — 피해 · 결투 한도 · 원소는 기존 판정을 그대로 거친다.
   영구 기록: h.advClass(전직 id) · h.advQ({ c, n } 시험) · h.advM(전직 숙련도). 싸우는 동안만: h.as(쿨타임 · 중첩 · 철벽 · 정령 목록 sps ·
   전투 특성 tcd 대기 · pr 정밀 사격 준비 · mvT 기동 사격 · rs 원소 공명 · esT 긴급 보호막 대기) — 스냅샷 줄 53 으로 손님에게 간다.
   클라이언트 예측은 쓰지 않는다 — 손님 화면은 방장이 보낸 연출과 상태만 그린다 */
import { ADV, ADV_BY_ID, ADV_IDS, ADV_UP, cleanAdvQ, trialText, healDone, ADV_MASTERY, ADV_TRAITS, MASTERY_MAX, cleanAdvM, masteryLv, traitAt, ADV_BODY, ADV_SPD_MAX } from "./advData.js";
import { JOB_TUNE } from "./jobTuneData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const keyOf = (o) => (o.type !== undefined ? `m${o.id}` : `h${o.pi}`);
const isHero = (o) => !!o && o.type === undefined;
export const asOf = (h) => h.as || (h.as = { cd: 0, st: 0, stT: 0, fk: "", fn: 0, ex: "", gT: 0, gN: 0, gGap: 0, pT: 0, pCut: 0,
  sps: [], blT: 0, blCut: 0, blReg: 0, blTk: 0, blBy: -1, gcT: 0, lb: -9, lk: "", lt: -9, slT: 0, mgT: 0, bT: 0,
  tcd: 0, cb: [], pr: 0, pNow: 0, mvT: 0, mvN: 0, rs: 0, rsT: 0, esT: 0, mqB: ADV_MASTERY.perMin,
  ut: 0, rush: 0, fh: {}, wdT: 0, ewN: 0, ammo: -1, rl: 0,   // 암살자 지정 불가 · 질주 · 첫 일격 기록 / 엘프 바람 걸음 · 바람 화살 / 총사 탄창 · 장전
  ucd: 0, gi: null });   // 소환술사 궁극기 대기 · 거대 정령 { hp, mhp, t, x, y, map, cd, cap }

// 지금 전직 — 기본 직업과 맞을 때만(관리자가 직업을 바꾸면 맞지 않는 전직은 없는 것으로 본다)
export const advOf = (h) => { const c = h && ADV_BY_ID[h.advClass]; return c && c.job === h.job ? c : null; };
// 시험 중인 전직 — 아직 전직하지 않았고 기본 직업이 맞을 때
export const trialOf = (h) => { const c = h && !h.advClass && h.advQ && ADV_BY_ID[h.advQ.c]; return c && c.job === h.job ? c : null; };
export const trialDone = (h) => { const c = trialOf(h); return !!c && h.advQ.n >= c.trial.n; };
// 전직 숙련도 단계(전직 전이면 0) · 열린 전투 특성 값(2단계부터 · 없으면 null)
export const advMasteryLv = (h) => (advOf(h) ? masteryLv(h.advM) : 0);
export const traitOf = (h) => { const c = advOf(h); return c ? traitAt(c.id, masteryLv(h.advM)) : null; };
/* 10월 30일 — 전직마다 몸(advData.js ADV_BODY). 방장 · 손님이 같은 값(스냅샷 줄 53 의 전직 · 상태)으로 걷는다 */
const bodyOf = (h) => { const c = advOf(h); return (c && ADV_BODY[c.id]) || null; };
export const advHpMul = (h) => (bodyOf(h) ? bodyOf(h).hp || 1 : 1);
export const advTakeMul = (h) => (bodyOf(h) ? bodyOf(h).take || 1 : 1);
// 지정 불가(암살자 그림자 일섬) — 몹이 알아채지 못하고 어떤 공격 · 상태이상도 닿지 않는다(rpg.js notices · h.inv)
export const advHidden = (h) => !!(h && h.as && h.as.ut > 0);
export function advSpeedMul(h) {
  const c = advOf(h), b = bodyOf(h), a = h && h.as;
  let k = b ? b.spd || 1 : 1;
  if (c && c.id === "assassin" && a && a.rush > 0) k = ADV_SPD_MAX;            // 그림자 일섬 뒤 — 엘프만큼(그보다 빠르지 않다)
  if (c && c.id === "elf" && a && a.wdT > 0) k *= 1 + c.active.windSpd;          // 숲바람 화살 뒤 바람 걸음
  if (c && c.id === "gunner" && a && a.rl > 0) k *= 1 - c.reload.slow;           // 장전 중 둔화
  return k;
}
export const advNear = (h, dist) => !!h && h.map === "plaza" && dist(h.x, h.y, ADV.npc.x, ADV.npc.y) <= ADV.reach;

/* 시험을 받을 수 있나 · 전직을 확정할 수 있나 — 막힌 이유(화면 · 방장이 같이 쓴다). dist 는 rpg.js 의 땅 거리 */
export function whyAdvStart(h, cid, dist) {
  const c = ADV_BY_ID[cid], out = [];
  if (!h || !c) return ["없는 전직입니다"];
  if (!h.loaded) out.push("기록을 불러오는 중입니다");
  if (h.advClass) out.push("이미 전직했습니다");
  if (c.job !== h.job) out.push("기본 직업이 다릅니다");
  if (h.lv < ADV.lv && !h.admin) out.push(`레벨 ${ADV.lv} 필요 (지금 ${h.lv})`);
  if (!advNear(h, dist)) out.push("광장의 전직 교관 곁에서 받습니다");
  if (h.advQ && h.advQ.c === cid) out.push("이미 받은 시험입니다");
  return out;
}
export function whyAdvConfirm(h, cid, dist, bagRoom) {
  const c = ADV_BY_ID[cid], out = [];
  if (!h || !c) return ["없는 전직입니다"];
  if (h.advClass && !h.admin) out.push("이미 전직했습니다");
  if (c.job !== h.job) out.push("기본 직업이 다릅니다");
  if (h.lv < ADV.lv && !h.admin) out.push(`레벨 ${ADV.lv} 필요 (지금 ${h.lv})`);
  if (!h.admin && !(h.advQ && h.advQ.c === cid && h.advQ.n >= c.trial.n)) out.push("전직 시험을 먼저 마쳐야 합니다");
  if (!advNear(h, dist)) out.push("광장의 전직 교관 곁에서 확정합니다");
  if (c.gear && !bagRoom) out.push("가방 무기 칸이 가득 찼습니다");
  return out;
}

/* 창에서 보낸 요청 — req = { op: "start" | "drop" | "confirm", c } · { op: "use" } · 관리자 { op: "reset" } */
export function advInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req) return false;
  if (req.op === "use") return advUse(E, g, h);
  if (req.op === "ult") return advUlt(E, g, h);
  if (req.op === "mode") {                          // 치유사 — 평타를 치유 · 공격으로 바꾼다
    if (!advOf(h) || h.advClass !== "healer") return void E.sys(g, pi, "치유사만 평타를 바꿀 수 있습니다.");
    h.healMode = !h.healMode;
    E.say(g, h.map, h.x, h.y - 110, h.healMode ? "치유 평타" : "공격 평타", h.healMode ? "#fff0b0" : "#f0dcb4");
    return true;
  }
  if (req.op === "start") {
    const why = whyAdvStart(h, req.c, E.dist);
    if (why.length) return void E.sys(g, pi, why[0]);
    h.advQ = cleanAdvQ({ c: req.c, n: 0, v: ADV.trialVer });
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "전직 시험 시작", color: "#ffe08a", t: 1, life: 1, snd: "build", who: pi });
    E.sys(g, pi, `${ADV_BY_ID[req.c].trial.name}을 시작했습니다. ${ADV_BY_ID[req.c].trial.note}.`);
    return true;
  }
  if (req.op === "drop") {
    if (!h.advQ) return false;
    h.advQ = null;
    E.sys(g, pi, "전직 시험을 그만두었습니다. 진행은 처음으로 돌아갑니다.");
    return true;
  }
  if (req.op === "confirm") {
    const c = ADV_BY_ID[req.c];
    const why = whyAdvConfirm(h, req.c, E.dist, E.bagRoom(h));
    if (why.length) return void E.sys(g, pi, why[0]);
    h.advClass = req.c; h.advQ = null; h.advM = 0;   // 숙련도 1단계부터
    h.as = null;                                    // 중첩 · 쿨타임을 비운다
    if (c.gear) E.gear(h, c.gear);
    E.refresh?.(h);                                 // 전직 추가 스탯(체력 등)을 바로 싣는다
    E.fx(g, h.map, { kind: "sk_adv_up", x: h.x, y: h.y, c: req.c, t: ADV_UP.life, life: ADV_UP.life, snd: "lvup", who: pi });   // 전직 연출(advArt.js)
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 150, text: `전직 — ${c.name}`, color: "#ffd873", t: 2.2, life: 2.2 });
    E.sys(g, pi, `${c.name}(으)로 전직했습니다. 전직 스킬 「${c.active.name}」은 전직 스킬 키(기본 Z)로 씁니다.${c.gear ? " 전직 무기를 가방에 넣었습니다." : ""} 몬스터 · 보스를 잡으면 전직 숙련도가 올라 2단계에 「${ADV_TRAITS[c.id].name}」이 열립니다.`);
    return true;
  }
  if (req.op === "reset" && h.admin) {             // 관리자 시험용 — 전직 · 시험을 비운다
    h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null;
    E.sys(g, pi, "관리자 — 전직을 비웠습니다.");
    return true;
  }
  if (req.op === "mastery" && h.admin && advOf(h)) {   // 관리자 시험용 — 숙련도 단계를 바로 정한다
    const lv = Math.max(1, Math.min(ADV_MASTERY.pts.length, Math.floor(Number(req.lv) || 1)));
    h.advM = ADV_MASTERY.pts[lv - 1];
    asOf(h).tcd = 0;
    E.sys(g, pi, `관리자 — 전직 숙련도를 ${lv}단계로 정했습니다.`);
    return true;
  }
  return false;
}

/* ── 시험 진행 ─────────────────────────────────────────── */
// 시험에 세는 몹 — 허수아비는 빼고 160레벨 이상 · 던전 · 월드보스
const trialMob = (E, o) => !!o && !isHero(o) && o.type !== "dummy" && (o.lv >= ADV.trialLv || E.bigMap(o.map));
// 한 칸 나아간다 — 목록 시험(list)은 i 번째 종류를 하나. 다 채우면 알린다
function trialAdd(E, g, h, cid, i = -1) {
  const c = trialOf(h), T = c && c.trial, q = h.advQ;
  if (!c || c.id !== cid || q.n >= T.n) return false;
  if (T.list) {
    if (!q.m) q.m = T.list.map(() => 0);
    if (i < 0 || q.m[i] >= T.each) return false;
    q.m[i] += 1;
  }
  q.n += 1;
  if (q.n >= T.n) {
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "전직 시험 완료!", color: "#ffd873", t: 1.6, life: 1.6, snd: "clear", who: h.pi });
    E.sys(g, h.pi, `${T.name}을 마쳤습니다. 광장의 전직 교관에게서 「${c.name}」 전직을 확정하세요.`);
  }
  return true;
}
// 시험 레벨이 오르면 머리 위에 알린다(검투사 · 마도사)
function trialLevelUp(E, g, h, c) {
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 120, text: trialText(c, h.advQ), color: "#ffe08a", t: 1.2, life: 1.2, snd: "lvup", who: h.pi });
}
// 결투에서 이겼다 — 검투사 시험. 이길 때마다 up 확률로 시험 레벨 +1
export function advDuelWin(E, g, h) {
  const T = trialOf(h);
  if (!T || T.id !== "gladiator" || h.advQ.n >= T.trial.n) return;
  if (Math.random() >= T.trial.up) return void E.sys(g, h.pi, `결투장 승급 실패 — ${trialText(T, h.advQ)}. 다음 승리를 노리세요.`);
  trialAdd(E, g, h, "gladiator");
  trialLevelUp(E, g, h, T);
}
/* 비타겟팅 스킬을 한 번 썼다 — hits 는 맞은 대상 목록(빗나가면 빈 목록). 명사수 시험: 160레벨 이상 몹을 맞히면 연속 +1, 못 맞히면 0 */
export function advAimShot(E, g, h, hits) {
  const T = trialOf(h);
  if (!T || T.id !== "marksman" || h.advQ.n >= T.trial.n) return;
  if ((hits || []).some((o) => trialMob(E, o))) {
    trialAdd(E, g, h, "marksman");
    if (h.advQ.n < T.trial.n) E.say(g, h.map, h.x, h.y - 120, `연속 명중 ${h.advQ.n}`, "#9ff0e6");
  } else if (h.advQ.n > 0) {
    h.advQ.n = 0;
    E.say(g, h.map, h.x, h.y - 120, "빗나감 — 연속 0", "#e9b0a0");
  }
}
// 보스 재료를 받았다 — 소환술사 시험(종류마다 each 개까지)
export function advLoot(E, g, h, mat, n) {
  const T = trialOf(h);
  if (!T || T.id !== "summoner") return;
  const i = T.trial.list.indexOf(mat);
  if (i < 0) return;
  let got = 0;
  for (let k = 0; k < n; k++) if (trialAdd(E, g, h, "summoner", i)) got += 1;
  if (got && h.advQ.n < T.trial.n) E.sys(g, h.pi, `수집 시험 — ${trialText(T, h.advQ)}`);
}

/* ── 맞혔을 때 (rpg.js hitMob · hitFoe 가 부른다 — 패시브가 낳은 피해(procOff)는 부르지 않는다) ── */
export function advOnHit(E, g, h, o, basic, side) {
  if (!h || !o) return;
  const a = asOf(h), k = keyOf(o), cast = h.cast;
  const c = advOf(h);
  if (!c) return;
  const P = c.passive;
  if (c.id === "gladiator") {                     // 전투 본능 — 평타는 0.2초에 한 번 · 직업 스킬은 한 번 쓸 때 한 번
    let add = 0;
    if (basic && g.t - (a.bT || -9) >= 0.2) { a.bT = g.t; add = P.basic; }
    else if (!basic && cast && cast.job && !cast.ab) { cast.ab = 1; add = P.job; }
    if (add) { a.st = Math.min(P.max, a.st + add); a.stT = P.fade; }
    comboHit(E, g, h, o, basic, cast);            // 전투 특성 — 연계 참격
  } else if (c.id === "marksman") {               // 약점 포착 — 같은 적을 이어 맞히면 노출
    if (side || a.pNow) return;                   // 정밀 사격 한 발은 세지 않는다(다시 준비가 이어지지 않게)
    if (a.fk === k) a.fn += 1; else { a.fk = k; a.fn = 1; }
    if (a.fn >= P.need) {
      a.ex = k; a.fn = 0; E.say(g, h.map, o.x, o.y - 70, "약점 노출", "#9ff0e6");
      if (!a.pr && a.tcd <= 0 && traitOf(h)) { a.pr = 1; E.say(g, h.map, h.x, h.y - 118, "정밀 사격 준비", "#bffcf3"); }   // 전투 특성 — 다음 평타가 꿰뚫는다
    }
    a.st = a.ex ? P.need : a.fn;
  } else if (c.id === "gunner") {                 // 탄도 숙련 — 같은 적에게 이어 맞히면 다음 탄환이 세진다
    const shot = (!basic && cast && cast.adv) || (basic && E.gunHeld(h));
    if (!shot || side) return;
    if (a.fk === k) a.st = Math.min(P.max, a.st + 1); else { a.fk = k; a.st = 1; }
    a.stT = P.fade;
  } else if (c.id === "archmage") {               // 마력 순환 — 마법 공격이 맞으면 마력(화상 · 독 틱은 세지 않는다)
    resoHit(E, g, h, cast);                       // 전투 특성 — 원소 공명
    if (a.mgT > 0) return;
    a.mgT = P.gap; a.st = Math.min(P.max, a.st + 1);
  } else if (c.id === "healer") {                 // 은총 — 평타가 맞으면 둘레에서 체력이 가장 모자란 사람을 조금 회복
    if (!basic || side || a.gcT > 0) return;
    a.gcT = P.gap;
    let best = null;
    g.heroes.forEach((q) => {
      if (!q || q.down > 0 || q.map !== h.map || q.hp >= q.max || E.dist(h.x, h.y, q.x, q.y) > P.r) return;
      if (q !== h && ((E.pvpMap(h.map)&&!E.allies?.(h,q)) || E.fieldPvp(h))) return;   // 결투 · 사냥터 PvP 에서는 나만
      if (!best || q.hp / q.max < best.hp / best.max) best = q;
    });
    if (best) healHero(E, g, h, best, best.max * P.heal, false);
  } else if (c.id === "assassin") {               // 급소 노리기 — 이 적을 친 때를 적어 둔다(advDmgMul 이 본다)
    a.fh[k] = g.t;
  } else if (c.id === "summoner") {               // 영혼 연결 — 정령이 2초 안에 친 적을 내가 치면
    a.lk = k; a.lt = g.t;
    if ((a.sps || []).some((sp) => sp.t > 0 && sp.lk === k && g.t - sp.lt <= P.win)) soulLink(E, g, h, o);
    coopHit(E, g, h, o, cast);                    // 전투 특성 — 정령 협동 공격
  }
}

/* ── 전투 특성 (숙련도 2단계부터 · advData.js ADV_TRAITS) ───────────────────
   추가 피해는 모두 E.noProc 안에서 친다 — 원소 · 무기 패시브 · 전직 패시브(advOnHit)를 다시 부르지 않아 서로 무한히 잇지 않는다.
   결투 · 사냥터 PvP 는 일으킨 스킬과 같은 한도(withCap)를 나눠 쓴다 */
// 원소 구체 · 연쇄 번개 — 마도사 원소 공명 · 소환술사 정령 협동 공격을 일으키는 직업 스킬
const ORB_SKILLS = ["j_orb", "j_chain"];
// 검투사 연계 참격 — 서로 다른 스킬(cast.sid)을 win 초 안에 need 개 맞히면 마지막으로 맞힌 적 둘레를 벤다. 스킬 한 번은 한 번만 센다
function comboHit(E, g, h, o, basic, cast) {
  const v = traitOf(h);
  if (!v || basic || !cast || !cast.sid || cast.cb) return;
  cast.cb = 1;
  const a = asOf(h);
  a.cb = (a.cb || []).filter((x) => g.t - x.t <= v.win && x.s !== cast.sid);
  a.cb.push({ s: cast.sid, t: g.t });
  if (a.cb.length < v.need || a.tcd > 0) return;
  a.cb = []; a.tcd = v.icd;
  const map = h.map, x0 = o.x, y0 = o.y, big = masteryLv(h.advM) >= 4 ? 1 : 0;
  E.later(g, v.delay, () => {
    if (h.map !== map || h.down > 0) return;
    const live = E.alive(g, h, o, map), x = live ? o.x : x0, y = live ? o.y : y0;
    const dmg = E.base(h, "str") * v.mul;
    E.noProc(() => withCap(h, cast, () => E.near(g, h, x, y, v.r).forEach((q) => E.strike(g, h, q, dmg))));
    E.fx(g, map, { kind: "sk_adv_combo", x, y: y - 30, r: v.r, big, t: 0.45, life: 0.45, snd: "slash", kick: 0.15 });
    E.say(g, map, h.x, h.y - 118, "연계 참격", ADV_TRAITS.gladiator.color);
  });
}
// 마도사 원소 공명 — 원소 구체 · 연쇄 번개 한 번에 하나
function resoHit(E, g, h, cast) {
  const v = traitOf(h);
  if (!v || !cast || cast.rsDone || !ORB_SKILLS.includes(cast.sid)) return;
  cast.rsDone = 1;
  const a = asOf(h);
  a.rs = Math.min(v.max, (a.rs || 0) + 1); a.rsT = v.dur;
}
// 소환술사 정령 협동 공격 — 함께 있는 정령 수만큼 한 번에 합친 피해 한 번(정령마다 따로 치지 않는다 · 연출도 하나)
function coopHit(E, g, h, o, cast) {
  const v = traitOf(h), a = asOf(h);
  if (!v || !cast || cast.coDone || !ORB_SKILLS.includes(cast.sid) || a.tcd > 0) return;
  const n = Math.min(ADV_BY_ID.summoner.active.max, (a.sps || []).filter((sp) => sp.t > 0).length);
  if (!n) return;
  cast.coDone = 1; a.tcd = v.icd;
  const map = h.map, dmg = E.base(h, "int") * v.per * n, big = masteryLv(h.advM) >= 4 ? 1 : 0;
  E.fx(g, map, { kind: "sk_adv_coop", x0: h.x, y0: h.y, d: h.dir || 1, n, x: o.x, y: o.y - 30, elem: E.elem(h), big, t: 0.5, life: 0.5, snd: "zap" });
  E.later(g, 0.15, () => {
    if (h.map !== map || h.down > 0 || !E.alive(g, h, o, map)) return;
    E.noProc(() => withCap(h, cast, () => E.strike(g, h, o, dmg)));
  });
}
function soulLink(E, g, h, o) {
  const a = asOf(h), c = ADV_BY_ID.summoner, P = c.passive;
  if (a.slT > 0 || !E.alive(g, h, o, h.map)) return;
  a.slT = P.gap;
  const dmg = E.base(h, c.active.dmg) * P.mul;
  E.noProc(() => withCap(h, a.sps && a.sps[0] && a.sps[0].cap, () => E.strike(g, h, o, dmg)));
  E.fx(g, h.map, { kind: "sk_adv_link", x: o.x, y: o.y - 30, x0: h.x, y0: h.y - 40, elem: E.elem(h), t: 0.45, life: 0.45, snd: "zap" });
}
/* 치유 — by 가 o 를 amt 만큼. 실제로 찬 몫만 숫자로 띄우고, 축복(trial)이면 치유량(amt)을 치유사 시험에 센다 */
function healHero(E, g, by, o, amt, trial) {
  if (!o || o.down > 0 || amt <= 0) return 0;
  if(by&&E.pvpMap(by.map)&&o!==by&&!E.allies?.(by,o))return 0;
  amt*=E.healMul?.(by)||1;
  const before = o.hp;
  o.hp = Math.min(o.max, o.hp + amt);
  const d = o.hp - before;
  if (d >= 1) E.fx(g, o.map, { kind: "heal", x: o.x, y: o.y - 56, text: `+${Math.round(d)}`, t: 0.8, life: 0.8, who: o.pi });
  if (trial && by && !(o.down > 0)) healTrial(E, g, by, amt);   // 체력이 가득이어도 치유량 그대로 센다 — 혼자 자신을 치유해도 시험이 찬다
  return d;
}
/* 치유사 시험 — 축복의 치유량을 모은다. 칸(n)은 unit 마다, 모자란 몫은 advQ.r 에 남겨 저장 · 스냅샷으로 화면에 1 단위로 보인다.
   예전에는 남은 몫을 방장만 들고 있어 1000 이 찰 때만 게이지가 뛰었다(축복을 써도 안 오르다가 이어 회복 틱에 갑자기 +1000) */
function healTrial(E, g, h, d) {
  const T = trialOf(h);
  if (!T || T.id !== "healer" || h.advQ.n >= T.trial.n) return;
  const q = h.advQ;
  q.r = (q.r || 0) + Math.floor(d);
  while (q.r >= T.trial.unit && trialAdd(E, g, h, "healer")) q.r -= T.trial.unit;
  if (q.n >= T.trial.n) q.r = 0;
}
/* 치유 평타(rpg.js heroAttack 이 부른다) — 치유 평타로 나갔으면 true. 결투장 · 다친 사람이 없으면 false(평타가 나가지 않는다) */
export function advHealShot(E, g, h, rng) {
  if (!h.healMode || h.advClass !== "healer" || !advOf(h) || (E.pvpMap(h.map)&&h.duelSize!==2)) return null;
  const S = ADV_BY_ID.healer.healShot, solo = E.fieldPvp(h);
  let best = null;
  g.heroes.forEach((q) => {
    if (!q || q.down > 0 || q.map !== h.map || !q.loaded || q.hp >= q.max) return;
    if(E.pvpMap(h.map)&&q!==h&&!E.allies?.(h,q))return;
    if (q !== h && (solo || E.dist(h.x, h.y, q.x, q.y) > rng)) return;
    if (!best || q.hp / q.max < best.hp / best.max) best = q;
  });
  if (!best) return false;
  if (best !== h && Math.abs(best.x - h.x) > 1) h.dir = best.x < h.x ? -1 : 1;
  h.face = 0;
  const map = h.map;
  E.fx(g, map, { kind: "shot", x0: h.x + (h.dir || 1) * 14, y0: h.y - 34, x1: best.x, y1: best.y - 30, style: "orb", r: 18, color: S.color, t: S.fly, life: S.fly, snd: "orb" });
  E.later(g, S.fly, () => { if (best.map === map) healHero(E, g, h, best, best.max * S.heal, false); });
  return true;
}
// 축복을 건다 — 받는 피해 감소 · 바로 회복 · 이어 회복(tickAdv)
function bless(E, g, h, o, A) {
  const b = asOf(o);
  b.blT = A.dur; b.blCut = A.cut; b.blReg = A.regen; b.blTk = A.tick; b.blBy = h.pi; b.blAtk = A.atk;
  healHero(E, g, h, o, o.max * A.heal, true);
}
// 정령 · 연속 공격이 같은 결투 피해 한도(스킬 한 번)를 나눠 쓰게 — 잠깐 h.cast 를 바꿔 친다
function withCap(h, cap, fn) {
  if (!cap) return fn();
  const prev = h.cast;
  h.cast = cap;
  try { fn(); } finally { h.cast = prev; }
}

/* 주는 피해 배율 — 표식 · 약점 노출(명사수) · 탄도 숙련(총사). 결투 · PvP 는 ADV.pvpBonusMax 까지 */
export function advDmgMul(E, g, h, o, basic, pvp) {
  if (!o) return 1;
  const c = advOf(h);
  const a = asOf(h), k = keyOf(o), cast = h.cast;
  let bonus = a.blT > 0 ? a.blAtk || 0 : 0;         // 수호의 축복 — 받은 사람 누구나 공격력 증가
  if (!c) return 1 + Math.min(bonus, pvp ? ADV.pvpBonusMax : ADV.pveBonusMax);
  if (c.id === "marksman") {
    if (E.slower && E.slower(h, o)) bonus += c.passive.slower;   // 나보다 느린 적 — 늘 추가 피해(10월 30일)
    if (a.pNow) return 1 + Math.min(bonus, pvp ? ADV.pvpBonusMax : ADV.pveBonusMax);   // 정밀 사격 한 발 — 제 배율만(약점 노출 · 표식과 겹쳐 두 번 커지지 않게, 노출 · 표식도 남긴다)
    if (a.ex === k) { bonus += c.passive.bonus; a.ex = ""; a.st = 0; }
    if (o.wkBy === h.pi && o.wkUntil > g.t && (basic || !(cast && cast.adv))) { bonus += c.passive.bonus; o.wkUntil = 0; }   // 관통 저격의 표식 — 다음 공격(평타 · 직업 스킬)이 터뜨린다
  } else if (c.id === "gunner") {
    if ((!basic && cast && cast.adv) || (basic && E.gunHeld(h))) bonus += a.st * c.passive.per;   // h.cast 는 스킬 뒤에도 남아 있어 평타는 basic 으로 가른다
  } else if (c.id === "assassin") {               // 급소 노리기 — 한동안 치지 않은 적에게 첫 일격 · 평타는 낮게
    const P = c.passive;
    if (g.t - (a.fh[k] ?? -99) >= P.gap) bonus += P.bonus;
    if (basic) return P.basic * (1 + Math.min(bonus, pvp ? ADV.pvpBonusMax : ADV.pveBonusMax));
  }
  return 1 + Math.min(bonus, pvp ? ADV.pvpBonusMax : ADV.pveBonusMax);
}

/* 받는 피해 감소 — 직업 철벽(ironCut)과 철벽 방어 · 불굴의 의지 · 파티 보호를 곱해 합친다.
   전직 감소가 하나라도 있으면 합계는 기사 cap(70%)을 넘지 않는다(직업 철벽만이면 예전 그대로) */
export function advTakeCut(h, ironCut, base = 0) {   // base — 직업 · 전직 기본 감소(jobTuneData.js classCut)
  const a = h.as;
  const K = ADV_BY_ID.knight;
  const parts = base > 0 ? [base] : [];
  if (a && a.gT > 0 && advOf(h) === K) parts.push(K.active.cut);
  if (advOf(h) === K && h.hp <= h.max * K.passive.hp) parts.push(K.passive.cut);
  if (a && a.pT > 0) parts.push(a.pCut);
  if (a && a.blT > 0) parts.push(a.blCut);           // 치유사 수호의 축복
  if (!parts.length) return ironCut || 0;
  if (parts.length === 1 && parts[0] === base) return 1 - (1 - (ironCut || 0)) * (1 - base);   // 기본 감소만 — 상한 없이 예전처럼
  const keep = [ironCut || 0, ...parts].reduce((v, c) => v * (1 - c), 1);
  return Math.min(K.cap, 1 - keep);
}
/* 기사 무효화 방어막 — 피해가 들어오려 할 때 부른다. 방어막이 있으면 그 한 대를 통째로 막고 true.
   맞을 때마다(막아도) 쉰 시간 nulIdle 을 0 으로 — tickAdv 가 regen 초 쉬면 다시 만든다 */
export function advNullShield(E, g, h) {
  if (advOf(h)?.id !== "knight") return false;
  const a = asOf(h);
  a.nulIdle = 0;
  if (a.nul === undefined) a.nul = 1;              // 처음 들어온 기사는 방어막을 가진 채 시작한다
  if (!a.nul) return false;
  a.nul = 0;
  E.fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 30, r: 46, color: "#cfe6ff", n: 10, t: 0.45, life: 0.45, snd: "bless" });
  E.say(g, h.map, h.x, h.y - 96, "무효화", "#cfe6ff");
  return true;
}
// 맞았다(피해가 들어갔다) — 철벽 방어 반격 · 기사 시험
export function advHurt(E, g, h) {
  const a = h.as, c = advOf(h);
  if (c && c.id === "knight" && a && a.gT > 0 && a.gN > 0 && a.gGap <= 0) {
    const A = c.active;
    a.gN -= 1; a.gGap = A.gap;
    const dmg = E.base(h, A.dmg) * A.mul;
    const cap = a.gCap || (a.gCap = { raw: 0, adv: 1 });
    const hit = E.near(g, h, h.x, h.y, A.r);
    withCap(h, cap, () => hit.forEach((o) => E.strike(g, h, o, dmg)));
    E.fx(g, h.map, { kind: "sk_adv_hex", x: h.x, y: h.y - 30, r: A.r, t: 0.45, life: 0.45, snd: "boom" });
    shieldWave(E, g, h, hit);
  } else if (c && c.id === "knight" && a && a.gT > 0) shieldWave(E, g, h, []);
  const T = trialOf(h);
  if (T && T.id === "elf" && h.advQ.n > 0 && h.advQ.n < T.trial.n) {   // 바람 걸음 시험 — 맞으면 처음부터
    h.advQ.n = 0;
    E.say(g, h.map, h.x, h.y - 120, "맞았다 — 연속 0", "#e9b0a0");
  }
  if (T && T.id === "knight" && g.t - (asOf(h).kq ?? -9) >= T.trial.gap) {   // 맷집 시험 — 사람 · 몬스터에게 맞은 수
    asOf(h).kq = g.t;
    trialAdd(E, g, h, "knight");
    if (h.advQ.n < T.trial.n && h.advQ.n % 10 === 0) E.say(g, h.map, h.x, h.y - 120, `맷집 ${h.advQ.n}/${T.trial.n}`, "#cfe0f2");
  }
}
/* 기사 수호의 방패 — 철벽 방어 중 맞으면 방패 충격파. 같은 순간 반격(1.8배)에 맞은 적(hit)은 충격파 피해를 받지 않는다.
   일반 몹만 도발(taunt 초 동안 기사만 노린다 — rpg.js hitMob · tickMob). 보스 · 월드 · 길드 보스 · 허수아비 · 사람은 도발하지 않는다 */
function shieldWave(E, g, h, hit) {
  const v = traitOf(h), a = asOf(h);
  if (!v || a.tcd > 0) return;
  a.tcd = v.icd;
  const dmg = E.base(h, "str") * v.mul, list = E.near(g, h, h.x, h.y, v.r), taunted = [];
  withCap(h, a.gCap || (a.gCap = { raw: 0, adv: 1 }), () => E.noProc(() => list.forEach((o) => { if (!hit.includes(o)) E.strike(g, h, o, dmg); })));
  list.forEach((o) => {
    if (isHero(o) || o.boss || o.type === "dummy" || o.dead) return;
    o.tgt = h.pi; o.taunt = v.taunt;
    if (taunted.length < 8) taunted.push([Math.round(o.x), Math.round(o.y - 70)]);   // 머리 위 도발 표시 — 연출에는 여덟까지만 싣는다
  });
  E.fx(g, h.map, { kind: "sk_adv_wave", x: h.x, y: h.y - 20, r: v.r, big: masteryLv(h.advM) >= 4 ? 1 : 0, marks: taunted, t: 0.6, life: 0.6, snd: "boom" });
}
/* 치유사 긴급 보호막 — h 가 맞아 체력 30% 이하가 됐다(rpg.js hurtHero). 같은 맵 · 같은 파티(나 포함)의 가장 가까운 치유사 하나가 보호막.
   받는 사람(h.as.esT)마다 대기 — 치유사가 여럿이어도 한 번만. 기존 보호막(jb.sh)이 더 크면 나가지 않고 대기도 쓰지 않는다 */
export function advLowHp(E, g, h) {
  const T = ADV_TRAITS.healer;
  if (!h || !h.loaded || h.down > 0 || h.hp <= 0 || h.hp > h.max * T.hp) return;
  const b = asOf(h);
  if (b.esT > 0) return;
  const solo = (E.pvpMap(h.map)&&h.duelSize!==2) || E.fieldPvp(h);   // 결투 · 사냥터 PvP — 치유사 자신에게만
  let best = null, bd = Infinity, bv = null;
  g.heroes.forEach((q) => {
    if (!q || !q.loaded || q.down > 0 || q.map !== h.map) return;
    const c = advOf(q), v = c && c.id === "healer" ? traitOf(q) : null;
    if (!v) return;
    if (q !== h && (solo || E.fieldPvp(q) || !h.pty || q.pty !== h.pty)) return;
    const d = q === h ? 0 : E.dist(h.x, h.y, q.x, q.y);
    if (d > v.r || d >= bd) return;
    best = q; bd = d; bv = v;
  });
  if (!best || !E.shield(h, h.max * bv.amt, bv.dur)) return;
  b.esT = bv.cd;
  const big = masteryLv(best.advM) >= 4 ? 1 : 0;
  E.fx(g, h.map, { kind: "sk_adv_esh", x: h.x, y: h.y - 34, x0: best.x, y0: best.y - 40, self: best === h ? 1 : 0, big, t: 0.9, life: 0.9, snd: "bless" });
  E.say(g, h.map, h.x, h.y - 120, "긴급 보호막", T.color);
}
/* 명사수 정밀 사격 — 준비됐으면 이번 평타가 정밀 사격(rpg.js heroAttack · pvpAttack 이 쏘기 전에 부른다). 준비를 쓰고 대기가 돈다 */
export function advPrecFire(E, g, h) {
  const a = h.as;
  if (!a || !a.pr) return null;
  const c = advOf(h), v = c && c.id === "marksman" ? traitOf(h) : null;
  a.pr = 0;
  if (!v) return null;
  a.tcd = v.icd;
  return { first: v.first, pierce: v.pierce, len: v.len, width: v.width, big: masteryLv(h.advM) >= 4 ? 1 : 0 };
}
/* 정밀 사격이 닿았다(rpg.js landHit) — 첫 적은 평타 first 배(약점 노출 · 표식과 겹치지 않게 pNow), 뒤로 len 안의 몹은 pierce 배(noProc · 튄 피해) */
export function advPrecLand(E, g, h, m, s) {
  const P = s.prec, a = asOf(h), map = s.map;
  const dx = m.x - h.x, dy = (m.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1, ax = dx / d, ay = dy / d;
  a.pNow = 1;
  try { E.hit(g, h, m, s.dmg * P.first); } finally { a.pNow = 0; }
  E.soak(g, h, m, 0);
  const behind = E.line(g, h, ax, ay, d + P.len, P.width).filter((o) => o !== m && !isHero(o) && ((o.x - h.x) * ax + ((o.y - h.y) / E.squash) * ay) > d - 4);
  E.noProc(() => behind.forEach((o) => E.side(g, h, o, s.dmg * P.pierce)));
  const [x1, y1] = [m.x + ax * P.len, m.y + ay * P.len * E.squash];
  E.fx(g, map, { kind: "sk_adv_prec", x: m.x, y: m.y - 30, x0: m.x, y0: m.y - 30, x1, y1: y1 - 30, big: P.big, t: 0.4, life: 0.4, snd: "shot" });
}
// 총사 기동 사격 — 쌍권총을 든 채 후퇴 사격을 썼다(rpg.js jobSkill leap)
export function advLeap(E, g, h) {
  const c = advOf(h), v = c && c.id === "gunner" && E.gunHeld(h) ? traitOf(h) : null;
  if (!v) return;
  const a = asOf(h);
  a.mvT = v.dur; a.mvN = 0;
  E.say(g, h.map, h.x, h.y - 118, "기동 사격", ADV_TRAITS.gunner.color);
}
// 기동 사격 중이면 자동 평타 사거리가 늘어난다 — 물러나며 쏘아도 끊기지 않게(rpg.js heroAttack)
export function advRangeMul(E, h) {
  const a = h.as;
  if (!a || !(a.mvT > 0) || h.advClass !== "gunner" || !E.gunHeld(h)) return 1;
  const v = traitOf(h);
  return v ? v.rng : 1;
}
/* 기동 사격 — 총사가 평타를 쐈다(o 는 노린 적 · dmg 는 그 평타 피해 · fly 날아가는 시간). every 번마다 추가 탄환 한 발:
   평타의 mul 배 × 탄도 숙련 몫(쌓지는 않는다) · noProc 라 원소 · 무기 패시브 · 전직 패시브가 다시 붙지 않는다 */
export function advGunShot(E, g, h, o, dmg, fly) {
  const a = h.as;
  if (!a || !(a.mvT > 0) || !o) return;
  const c = advOf(h), v = c && c.id === "gunner" && E.gunHeld(h) ? traitOf(h) : null;
  if (!v) return;
  a.mvN = (a.mvN || 0) + 1;
  if (a.mvN % v.every) return;
  const amt = dmg * v.mul * (1 + Math.min(a.st * c.passive.per, isHero(o) ? ADV.pvpBonusMax : ADV.pveBonusMax));
  const map = h.map, dir = h.dir || 1, side = (a.mvN / v.every) % 2 ? 1 : -1, big = masteryLv(h.advM) >= 4 ? 1 : 0;
  E.fx(g, map, { kind: "sk_adv_mshot", x: h.x + dir * MUZZLE.gun, y: h.y - MUZZLE.y - 4, x0: h.x + dir * MUZZLE.gun, y0: h.y - MUZZLE.y - 4, x1: o.x, y1: o.y - 30, side, big, t: fly + 0.35, life: fly + 0.35, snd: "shot" });
  E.later(g, fly + 0.05, () => {
    if (h.map !== map || !E.alive(g, h, o, map)) return;
    E.noProc(() => E.extra(g, h, o, amt));
  });
}
// 마도사 원소 공명을 쓴다 — 마력 폭발을 쓸 때 쌓인 공명을 모두 가져간다
function takeReso(h) {
  const a = h.as, v = traitOf(h);
  if (!a || !v || !(a.rs > 0)) return null;
  const n = a.rs;
  a.rs = 0; a.rsT = 0;
  return { n, v };
}
/* 원소 공명 — 마력 폭발(가운데 x, y · 넓이 r · 처음 노린 적 o0)에 원소마다 효과 하나. 공명 n 개만큼 세진다(4단계는 pw 배).
   피해는 noProc(무기 · 전직 패시브 없음) · 결투 한도는 마력 폭발과 함께. 보스는 둔화 · 방어 약화 절반 · 끌지 않는다. 사람(PvP)에게는 피해만 */
function resonate(E, g, h, x, y, r, el, R, cast, o0) {
  const { n, v } = R, T = ADV_TRAITS.archmage, k = n * v.pw, map = h.map, base = E.base(h, "int");
  const mobs = (rr) => E.near(g, h, x, y, rr).filter((q) => !isHero(q));
  const hitAll = (list, mul, dot) => E.noProc(() => withCap(h, cast, () => list.forEach((q) => E.strike(g, h, q, base * mul, dot))));
  if (el === "flame") {
    E.later(g, 0.25, () => { if (h.map === map) hitAll(E.near(g, h, x, y, r * 0.6), T.flame * k); });
  } else if (el === "frost") {
    mobs(r * 1.5).forEach((q) => { q.slow = Math.max(q.slow || 0, T.frost * k * (q.boss ? 0.5 : 1)); });
  } else if (el === "bolt") {
    const list = E.near(g, h, x, y, r * 2).filter((q) => q !== o0).slice(0, 2);
    hitAll(list, T.bolt * k);
    list.forEach((q) => E.fx(g, map, { kind: "zap", x0: x, y0: y - 20, x1: q.x, y1: q.y - 20, color: "#e6ecff", t: 0.3, life: 0.3 }));
  } else if (el === "poison") {                   // 짧은 독 — 0.5초 · 1초에 한 번씩(지속 피해)
    [0.5, 1].forEach((t) => E.later(g, t, () => { if (h.map === map) hitAll(E.near(g, h, x, y, r), T.poison * k, true); }));
  } else if (el === "corrode") {
    mobs(r).forEach((q) => {
      q.shred = Math.max(q.shred || 0, 3 + 2 * n);
      q.shredAmt = Math.max(q.shredAmt || 0, (0.15 + T.corrode * n) * v.pw * (q.boss ? 0.5 : 1));
    });
  } else if (el === "gravity") {
    const pull = Math.min(0.8, T.gravity * k);
    mobs(r * 1.6).forEach((q) => { if (!q.boss) { q.x += (x - q.x) * pull; q.y += (y - q.y) * pull; } });
  }
  E.fx(g, map, { kind: "sk_adv_reso", x, y: y - 20, r, elem: el, n, big: v.pw > 1 ? 1 : 0, t: 0.7, life: 0.7, snd: el === "bolt" ? "zap" : undefined });
}

/* ── 전직 숙련도 (방장만 · 기록 advM) ─────────────────────────────
   몹 · 보스를 잡았을 때만 오른다 — 같은 적을 오래 치거나 PvP 를 반복해도 오르지 않는다. 1분에 perMin 까지(h.as.mqB 통) */
function masteryGain(E, g, h, pts) {
  const c = advOf(h);
  if (!c || !h.loaded || pts <= 0 || (E.trading && E.trading(h))) return 0;
  const cur = cleanAdvM(h.advM);
  if (cur >= MASTERY_MAX) return 0;
  const a = asOf(h), room = Math.floor(a.mqB ?? ADV_MASTERY.perMin), take = Math.min(pts, room, MASTERY_MAX - cur);
  if (take <= 0) return 0;
  a.mqB = (a.mqB ?? ADV_MASTERY.perMin) - take;
  const before = masteryLv(cur);
  h.advM = cur + take;
  const lv = masteryLv(h.advM);
  if (lv > before) {
    const T = ADV_TRAITS[c.id];
    E.fx(g, h.map, { kind: "sk_adv_mastery", x: h.x, y: h.y, lv, c: c.id, t: 1.6, life: 1.6, snd: "lvup", who: h.pi });
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 150, text: `전직 숙련도 ${lv}단계`, color: "#ffd873", t: 1.8, life: 1.8 });
    E.sys(g, h.pi, lv === 2 ? `전직 숙련도 2단계 — 전투 특성 「${T.name}」이 열렸습니다. ${T.text(traitAt(c.id, 2))}.`
      : `전직 숙련도 ${lv}단계 — 「${T.name}」 강화: ${lv === 3 ? T.up3 : T.up4}.`);
  }
  return take;
}
// 사냥터 · 던전 몹을 잡았다 — 허수아비 · 훈련장 · 낮은 레벨 사냥터는 세지 않는다
function masteryKill(E, g, h, m) {
  if (!m || m.type === "dummy" || E.train(m.map)) return;
  if (!(m.lv >= ADV_MASTERY.minLv || E.bigMap(m.map))) return;
  masteryGain(E, g, h, m.boss ? (m.dg ? ADV_MASTERY.dgBoss : ADV_MASTERY.boss) : ADV_MASTERY.mob);
}
// 월드보스 · 길드 토벌 보스를 잡았다 — 친 사람 가운데 같은 맵에 있는 사람(rpg.js killMob)
export function advRaidKill(E, g, m) {
  (m.hitBy || []).forEach((pi) => { const h = g.heroes[pi]; if (h && h.map === m.map) masteryGain(E, g, h, ADV_MASTERY.raid); });
}

// 쓰러졌다 — 정령은 돌아간다
export function advDown(E, g, h) {
  if (h.as) { h.as.sps = []; h.as.blT = 0; h.as.ut = 0; h.as.rush = 0; h.as.gi = null; }
}
/* 몹이 쓰러졌다 — got 은 그 몹을 친 사람 가운데 같은 맵에 있는 사람(보상을 받는 사람).
   총사 시험: 친 사람 모두 그 종류를 한 번 */
export function advOnKill(E, g, m, got) {
  (got || []).forEach((h) => {
    masteryKill(E, g, h, m);                      // 전직 숙련도
    const T = trialOf(h);
    if (T && T.id === "elf" && trialMob(E, m) && trialAdd(E, g, h, "elf") && h.advQ.n < T.trial.n && h.advQ.n % 5 === 0) E.say(g, h.map, h.x, h.y - 120, `바람 걸음 ${trialText(T, h.advQ)}`, "#cdeeb8");
    if (T && T.id === "gunner") {
      const i = T.trial.list.indexOf(m.type);
      if (i >= 0 && trialAdd(E, g, h, "gunner", i) && h.advQ.n < T.trial.n) E.sys(g, h.pi, `사냥 도감 시험 — ${E.mobName(m)} · ${trialText(T, h.advQ)}`);
    }
  });
}
// 마도사 시험 — 마력 폭발이 잡은 몹(advUse 가 폭발로 친 뒤 쓰러졌는지 본다)
function blastKill(E, g, h, o) {
  const T = trialOf(h);
  if (!T || T.id !== "archmage" || isHero(o) || !o.dead || !trialMob(E, o)) return;
  const lv = Math.floor(h.advQ.n / T.trial.per);
  if (trialAdd(E, g, h, "archmage") && Math.floor(h.advQ.n / T.trial.per) > lv) trialLevelUp(E, g, h, T);
}

/* ── 전직 액티브 (키 adv · 기본 Z) ───────────────────────────── */
// 시험 동안 쓸 수 있는 전직 스킬(마도사 시험의 마력 폭발) — 패시브는 없다
const trialSkill = (h) => { const T = trialOf(h); return T && T.trial.skill ? T : null; };
export const advSkillOf = (h) => advOf(h) || trialSkill(h);
export function advUse(E, g, h) {
  const c = advSkillOf(h), map = h.map;
  if (h.down > 0 || E.locked(h)) return false;
  if (!c) return void E.say(g, map, h.x, h.y - 90, `${ADV.lv}레벨에 전직하면 쓸 수 있다`, "#d9c9a6");
  if (E.safe(map)) return void E.say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
  const a = asOf(h), A = c.active;
  if (a.cd > 0) return void E.say(g, map, h.x, h.y - 90, `${A.name} ${Math.ceil(a.cd)}초`, "#f0dcb4");
  if (E.pvpMap(map) && h.dph !== 2) return void E.say(g, map, h.x, h.y - 90, "곧 시작합니다", "#d9c9a6");
  const cast = E.newCast(h);
  cast.adv = 1; cast.sid = "adv";                 // 검투사 연계 참격이 세는 스킬 이름
  const base = E.base(h, A.dmg);
  const pvpCc = (o) => (isHero(o) ? ADV.pvpCc : 1);
  if (c.id === "gladiator") {
    const P = c.passive, boost = a.st >= P.max;
    if (boost) { a.st = 0; a.stT = 0; }
    const mul = boost ? P.mul : 1, r = A.r * (boost ? P.grow : 1);
    const [ax, ay] = E.aim(g, h, r + 40);
    A.hits.forEach((hit, i) => E.later(g, hit.at, () => {
      if (h.map !== map || h.down > 0) return;
      const list = E.arc(g, h, ax, ay, r, A.half);
      withCap(h, cast, () => list.forEach((o) => {
        E.strike(g, h, o, base * hit.mul * mul);
        E.cc(g, h, o, { stun: hit.stun * pvpCc(o) });
        if (hit.wave && !isHero(o)) E.soak(g, h, o, 0);   // 원소는 마지막 한 번만
      }));
      h.swing = 0.24;
      const ang = Math.atan2(ay * E.squash, ax);
      E.fx(g, map, { kind: "sk_adv_slash", x: h.x + ax * 72, y: h.y - 30 + ay * 72 * E.squash, r: r * 0.62, a: ang, i, boost: boost ? 1 : 0, t: 0.32, life: 0.32, snd: "slash", kick: hit.wave ? 0.2 : 0 });
      if (hit.wave) {
        const [wx, wy] = E.end(h, ax, ay, r * 0.7);
        // 충격파 — 베기에 닿지 않은 둘레 적에게 절반
        withCap(h, cast, () => E.near(g, h, wx, wy, A.waveR).forEach((o) => { if (!list.includes(o)) E.strike(g, h, o, base * hit.mul * mul * 0.5); }));
        E.fx(g, map, { kind: "sk_adv_shock", x: wx, y: wy - 20, r: A.waveR, t: 0.5, life: 0.5, snd: "boom" });
      }
    }));
    if (boost) E.say(g, map, h.x, h.y - 120, "투지 폭발", "#ffb4a0");
  } else if (c.id === "knight") {
    a.gT = A.dur; a.gN = A.max; a.gGap = 0; a.gCap = { raw: 0, adv: 1 };
    E.taunt?.(g,h,A.tauntRadius,A.taunt);
    E.fx(g, map, { kind: "sk_adv_guard", x: h.x + (h.dir || 1) * 24, y: h.y - 30, r: 70, t: 0.7, life: 0.7, snd: "bless" });   // 몸 앞쪽
    if (!E.pvpMap(map) && !E.fieldPvp(h)) {       // 파티 보호 — 결투 · 사냥터 PvP 에서는 본인만
      g.heroes.forEach((o) => {
        if (!o || o === h || !h.pty || o.pty !== h.pty || o.map !== map || o.down > 0 || E.dist(h.x, h.y, o.x, o.y) > A.party.r) return;
        const b = asOf(o);
        b.pT = A.dur; b.pCut = A.party.cut;
        E.fx(g, map, { kind: "sk_adv_guard", x: o.x, y: o.y - 34, r: 40, small: 1, t: 0.6, life: 0.6 });
      });
    }
  } else if (c.id === "marksman") {
    const [ax, ay] = E.aim(g, h, A.len);
    const [x1, y1] = E.end(h, ax, ay, A.len);
    const [sx, sy] = E.end(h, ax, ay, MUZZLE.bow);   // 활 앞에서 나간다(몸 한가운데가 아니라)
    E.fx(g, map, { kind: "sk_adv_snipe", x: sx, y: sy - MUZZLE.y, x0: sx, y0: sy - MUZZLE.y, x1, y1: y1 - MUZZLE.y, aim: A.aim, t: A.aim + 0.35, life: A.aim + 0.35, snd: "shot" });
    E.later(g, A.aim, () => {
      if (h.map !== map || h.down > 0) return;
      withCap(h, cast, () => E.line(g, h, ax, ay, A.len, A.width).forEach((o) => {
        E.strike(g, h, o, base * A.mul);
        o.wkUntil = g.t + A.mark; o.wkBy = h.pi;
        E.fx(g, map, { kind: "sk_adv_flash", x: o.x, y: o.y - 30, r: 34, t: 0.35, life: 0.35 });
      }));
    });
  } else if (c.id === "gunner") {
    for (let i = 0; i < A.n; i++) E.later(g, i * A.gap, () => {
      if (h.map !== map || h.down > 0) return;
      const [ax, ay] = E.aim(g, h, A.range);
      const list = E.arc(g, h, ax, ay, A.range, 0.9);
      const o = list.sort((p, q) => E.dist(h.x, h.y, p.x, p.y) - E.dist(h.x, h.y, q.x, q.y))[0];
      const [tx, ty] = o ? [o.x, o.y] : E.end(h, ax, ay, A.range);
      const side = i % 2 ? 1 : -1;                  // 두 자루가 번갈아 — 총구 높이를 조금씩 달리한다
      const [mx, my] = E.end(h, ax, ay, MUZZLE.gun);
      E.fx(g, map, { kind: "sk_adv_shot", x: mx, y: my - MUZZLE.y, x0: mx, y0: my - MUZZLE.y + side * 3, x1: tx, y1: ty - 30, side, t: A.fly + 0.12, life: A.fly + 0.12, snd: i % 2 ? undefined : "shot" });
      h.swing = 0.12;
      if (!o) return;
      E.later(g, A.fly, () => {
        if (!E.alive(g, h, o, map)) return;
        withCap(h, cast, () => E.strike(g, h, o, base * A.mul));
        if (i === A.n - 1 && !isHero(o)) E.soak(g, h, o, 0);   // 원소는 마지막 한 발만 — 여덟 번 겹치지 않게
      });
    });
  } else if (c.id === "archmage") {
    const P = c.passive, n = advOf(h) ? a.st : 0;   // 시험 중에는 마력 순환이 없다
    a.st = 0;
    const [o] = E.near(g, h, h.x, h.y, A.reach, 1);
    const [tx, ty] = o ? [o.x, o.y] : E.aimAt(h, A.aim);
    if (o && Math.abs(o.x - h.x) > 1) h.dir = o.x < h.x ? -1 : 1;
    const r = A.r + P.grow * n, mul = A.mul * (1 + P.per * n), el = E.elem(h);
    const R = advOf(h) ? takeReso(h) : null;     // 전투 특성 — 원소 공명을 모두 쓴다
    E.fx(g, map, { kind: "sk_adv_circle", x: tx, y: ty, r, elem: el, t: A.delay + 0.25, life: A.delay + 0.25 });
    E.later(g, A.delay, () => {
      if (h.map !== map || h.down > 0) return;
      const X = A.elem[el] || {};
      withCap(h, cast, () => E.near(g, h, tx, ty, r).forEach((q) => {
        E.strike(g, h, q, base * mul);
        blastKill(E, g, h, q);                      // 마도사 시험 — 이 폭발로 잡았다
        if (isHero(q)) {
          if (X.stun) E.cc(g, h, q, { stun: X.stun * ADV.pvpCc });
          if (X.slow) E.cc(g, h, q, { slow: X.slow * ADV.pvpCc, slowAmt: 0.3 });
          return;
        }
        E.soak(g, h, q, 0);                         // 화상 · 독 · 부식은 평타 세기로 한 번 — 원소 궁극기(Shift)와 따로
        if (X.stun) E.cc(g, h, q, { stun: X.stun });
        if (X.slow) q.slow = Math.max(q.slow || 0, X.slow);
        if (X.pull && !q.boss) { q.x += (tx - q.x) * X.pull; q.y += (ty - q.y) * X.pull; }
      }));
      E.fx(g, map, { kind: "sk_adv_burst", x: tx, y: ty - 20, r, elem: el, t: 0.55, life: 0.55, snd: "boom", kick: 0.25 });
      if (R) resonate(E, g, h, tx, ty, r, el, R, cast, o);
    });
    if (n || R) E.say(g, map, h.x, h.y - 120, [n ? `마력 ${n}` : "", R ? `공명 ${R.n}` : ""].filter(Boolean).join(" · "), "#d8c8ff");
  } else if (c.id === "healer") {
    const solo = (E.pvpMap(map)&&h.duelSize!==2) || E.fieldPvp(h);   // 결투 · 사냥터 PvP 에서는 나에게만
    const T = trialOf(h), before = T ? healDone(T.trial, h.advQ) : 0;
    g.heroes.forEach((o) => {
      if (!o || o.down > 0 || o.map !== map || !o.loaded) return;
      if (o !== h && (solo || (E.pvpMap(map)&&!E.allies?.(h,o)) || E.dist(h.x, h.y, o.x, o.y) > A.r)) return;
      bless(E, g, h, o, A);
    });
    E.fx(g, map, { kind: "sk_adv_bless", x: h.x, y: h.y, r: A.r, t: 1, life: 1, snd: "bless" });
    if (T && h.advQ) E.say(g, map, h.x, h.y - 124, `치유 시험 +${(healDone(T.trial, h.advQ) - before).toLocaleString()}`, "#fff0c0");   // 이번에 센 몫
  } else if (c.id === "assassin") {
    const P = c.passive;
    a.ut = A.ut; h.inv = Math.max(h.inv || 0, A.ut);   // 지정 불가 — 맞지 않고 상태이상도 없다(h.inv) · 몹이 놓친다(notices)
    E.lose(g, h);
    const o = shadowTarget(E, g, h, A.reach), dashAim = h.inputAim;   // 포인터 방향은 시전 때 적어 둔다(at 초 뒤에는 입력이 지워져 있다)
    E.fx(g, map, { kind: "sk_adv_vanish", x: h.x, y: h.y, t: 0.5, life: 0.5, snd: "slash" });
    E.later(g, A.at, () => {
      if (h.map !== map || h.down > 0) return;
      const x0 = h.x, y0 = h.y;
      if (o && E.alive(g, h, o, map)) {
        // 등 뒤 — 적을 지나 반대편에 나타나 돌아서서 벤다
        const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1;
        E.place(h, o.x + (dx / d) * A.behind, o.y + (dy / d) * A.behind * E.squash);
        h.dir = o.x < h.x ? -1 : 1; h.face = 0;
        withCap(h, cast, () => { E.strike(g, h, o, base * A.mul); E.cc(g, h, o, { stun: A.stun * pvpCc(o) }); });
        if (!isHero(o)) E.soak(g, h, o, 0);
        E.fx(g, map, { kind: "sk_adv_assa", x: o.x, y: o.y - 30, x0, y0: y0 - 30, bx: h.x, by: h.y - 30, d: h.dir, big: masteryLv(h.advM) >= 4 ? 1 : 0, t: 0.7, life: 0.7, snd: "slash", kick: 0.2 });   // bx · by — 내려앉은 등 뒤 자리(연출만)
        if (o.dead || (isHero(o) && o.down > 0)) shadowKill(E, g, h, o);
      } else {                                      // 적이 없다 — 겨눈 쪽으로 빠져나간다(연사를 피하는 데 쓴다)
        const [ax, ay] = dashAim || E.aim(g, h, A.dash);
        if (dashAim && ax) h.dir = ax < 0 ? -1 : 1;
        const [x, y] = E.end(h, ax, ay, A.dash);
        E.place(h, x, y);
        E.fx(g, map, { kind: "sk_adv_vanish", x: h.x, y: h.y, out: 1, t: 0.4, life: 0.4 });
      }
      h.swing = 0.3;
      a.rush = P.rushT + (A.ut - A.at);             // 다시 나타난 뒤 rushT 초 — 엘프만큼 빠르다
    });
  } else if (c.id === "elf") {
    const [ax, ay] = E.aim(g, h, A.len);
    const a0 = Math.atan2(ay, ax);
    for (let i = 0; i < A.n; i++) {
      const ang = a0 + (A.n > 1 ? (i / (A.n - 1) - 0.5) * 2 * A.spread : 0), ux = Math.cos(ang), uy = Math.sin(ang);
      const [x1, y1] = E.end(h, ux, uy, A.len), [sx, sy] = E.end(h, ux, uy, MUZZLE.bow);
      withCap(h, cast, () => E.line(g, h, ux, uy, A.len, A.width).forEach((o) => E.strike(g, h, o, base * A.mul)));
      E.fx(g, map, { kind: "sk_adv_wind", x: sx, y: sy - MUZZLE.y, x0: sx, y0: sy - MUZZLE.y, x1, y1: y1 - MUZZLE.y, t: 0.45, life: 0.45, snd: i ? undefined : "shot" });
    }
    a.wdT = A.wind;
  } else if (c.id === "summoner") {
    const sps = a.sps || (a.sps = []);
    sps.forEach((sp) => { sp.t = A.life; });       // 있던 정령은 시간이 다시 찬다
    if (sps.length < A.max) sps.push(newSpirit(h, A.life, sps.length, sps.length + 1));
    E.fx(g, map, { kind: "sk_adv_summon", x: h.x, y: h.y, r: 80, elem: E.elem(h), t: 0.9, life: 0.9, snd: "bless" });
  }
  a.cd = A.cd;
  h.swing = Math.max(h.swing || 0, 0.35);
  E.fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: A.name, color: "#ffd873", t: 0.8, life: 0.8, who: h.pi });
  return true;
}
/* 소환술사 궁극기 거대 정령 — 지금 원소의 거대 정령 하나를 앞에 부른다(다시 부르면 체력 · 시간이 다시 찬다). 체력이 있다:
   소환술사가 받는 피해의 share 몫을 대신 맞고(advGiantTake) 0 이 되면 부서진다. every 초마다 발밑 둘레를 내려친다(tickGiant) */
export function advUlt(E, g, h) {
  const c = advOf(h), map = h.map;
  if (h.down > 0 || E.locked(h)) return false;
  if (!c || c.id !== "summoner") return void E.say(g, map, h.x, h.y - 90, "소환술사만 쓸 수 있다", "#d9c9a6");
  if (E.safe(map)) return void E.say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
  if (E.pvpMap(map)) return void E.say(g, map, h.x, h.y - 90, "결투에서는 쓸 수 없다", "#d9c9a6");
  const a = asOf(h), U = c.ultimate;
  if (a.ucd > 0) return void E.say(g, map, h.x, h.y - 90, `${U.name} ${Math.ceil(a.ucd)}초`, "#f0dcb4");
  const x = h.x + (h.dir || 1) * U.follow, y = h.y, mhp = Math.round(h.max * U.hpMul);
  a.gi = { hp: mhp, mhp, t: U.life, x, y, map, cd: 0.9, cap: { raw: 0, adv: 1 } };   // 부르고 곧바로 한 번 내려친다(cd 0.9 — 소환진이 도는 동안)
  a.ucd = U.cd;
  h.swing = Math.max(h.swing || 0, 0.4);
  E.fx(g, map, { kind: "sk_adv_gsummon", x, y, r: U.r, elem: E.elem(h), t: 1.1, life: 1.1, snd: "boom", kick: 0.3 });
  E.fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: U.name, color: "#ffd873", t: 0.9, life: 0.9, who: h.pi });
  return true;
}
// 소환술사가 맞으려 한다 — 거대 정령이 share 몫을 대신 맞는다. 남은 몫만 돌려준다
export function advGiantTake(E, g, h, dmg) {
  const gi = h.as && h.as.gi;
  if (!gi || gi.t <= 0 || gi.hp <= 0) return dmg;
  const U = ADV_BY_ID.summoner.ultimate, take = Math.min(gi.hp, dmg * U.share);
  gi.hp -= take;
  if (gi.hp <= 0) {                                // 부서졌다
    gi.hp = 0; gi.t = 0;
    E.fx(g, h.map, { kind: "sk_adv_gbreak", x: gi.x, y: gi.y, r: U.r * 0.6, elem: E.elem(h), t: 0.8, life: 0.8, snd: "boom", kick: 0.2 });
    E.say(g, h.map, gi.x, gi.y - 150, "거대 정령이 흩어졌다", "#d9c9a6");
  } else if (!gi.hurtT || g.t - gi.hurtT > 0.4) {
    gi.hurtT = g.t;
    E.fx(g, h.map, { kind: "dmg", x: gi.x, y: gi.y - 140, text: `-${Math.round(take)}`, color: "#ffd0a0", t: 0.6, life: 0.6, by: h.pi });
  }
  return dmg - take;
}
// 거대 정령의 시간 — 주인 앞으로 천천히 따라오고 every 초마다 둘레를 내려친다
function tickGiant(E, g, h, a, dt) {
  const gi = a.gi;
  if (!gi) return;
  const U = ADV_BY_ID.summoner.ultimate;
  if (h.down > 0 || E.safe(h.map) || E.pvpMap(h.map) || (gi.t -= dt) <= 0 || gi.hp <= 0) {
    if (gi.t > 0 && gi.hp > 0 && h.down <= 0 && gi.map === h.map) E.fx(g, gi.map, { kind: "sk_adv_gbreak", x: gi.x, y: gi.y, r: U.r * 0.5, elem: E.elem(h), t: 0.7, life: 0.7 });
    a.gi = null;
    return;
  }
  if (gi.map !== h.map) { gi.x = h.x + (h.dir || 1) * U.follow; gi.y = h.y; gi.map = h.map; gi.tx = null; }
  // 돌아다닌다 — 내 둘레 roam 안에서 가장 가까운 적에게 가고, 적이 없으면 wander 초마다 새 곳으로 어슬렁거린다
  const inRoam = (x, y) => Math.hypot(x - h.x, (y - h.y) / E.squash) <= U.roam;
  let foe = null, fd = Infinity;
  E.near(g, h, gi.x, gi.y, U.roam + U.r, 99).forEach((o) => { const d = E.dist(gi.x, gi.y, o.x, o.y); if (inRoam(o.x, o.y) && d < fd) { fd = d; foe = o; } });
  if (foe) { gi.tx = foe.x; gi.ty = foe.y; gi.wT = 0; }
  else if (gi.tx == null || (gi.wT = (gi.wT || 0) - dt) <= 0 || E.dist(gi.x, gi.y, gi.tx, gi.ty) < 24) {
    const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * U.roam * 0.8;
    gi.tx = h.x + Math.cos(ang) * d; gi.ty = h.y + Math.sin(ang) * d * E.squash; gi.wT = U.wander;
  }
  const dx = gi.tx - gi.x, dy = gi.ty - gi.y, dd = Math.hypot(dx, dy), stop = foe ? U.r * 0.35 : 0;   // 적에게는 발이 닿을 만큼만 다가선다
  if (dd > stop) { const st = Math.min(dd - stop, U.speed * dt); gi.x += (dx / dd) * st; gi.y += (dy / dd) * st; }
  if (!inRoam(gi.x, gi.y)) {                       // 범위 밖이면 가장자리로 끌어온다
    const ex = gi.x - h.x, ey = (gi.y - h.y) / E.squash, e = Math.hypot(ex, ey) || 1;
    gi.x = h.x + (ex / e) * U.roam; gi.y = h.y + (ey / e) * U.roam * E.squash;
  }
  E.keep(gi, h.map);
  if ((gi.cd -= dt) > 0) return;
  gi.cd = U.every;
  const map = h.map, list = E.near(g, h, gi.x, gi.y, U.r, 99);
  E.fx(g, map, { kind: "sk_adv_gstomp", x: gi.x, y: gi.y, r: U.r, elem: E.elem(h), t: 0.6, life: 0.6, snd: "boom", kick: 0.3 });
  if (!list.length) return;
  const dmg = E.base(h, U.dmg) * U.mul;
  E.later(g, 0.22, () => {                         // 발이 닿는 순간에 맞는다
    if (a.gi !== gi) return;
    E.noProc(() => withCap(h, gi.cap, () => list.forEach((o) => {
      if (!E.alive(g, h, o, map)) return;
      E.strike(g, h, o, dmg);
      E.cc(g, h, o, { stun: U.stun });
    })));
  });
}
/* 암살자 — 그림자 일섬 대상. reach 안의 적 가운데 마우스 포인터에 가장 가까운 적(포인터는 몸통 높이에 견준다).
   포인터가 없으면(터치 · 자동 사냥 · 옛 화면) 나에게 가장 가까운 적 */
const SHADOW_PT_BODY = 30;   // 적 발밑에서 몸통까지 높이(px) — 포인터를 몸에 올리면 그 적을 고르게
function shadowTarget(E, g, h, reach) {
  const p = h.inputPt;
  if (!p) return E.near(g, h, h.x, h.y, reach, 1)[0];
  let best = null, bd = Infinity;
  for (const o of E.near(g, h, h.x, h.y, reach)) {
    const d = E.dist(p[0], p[1], o.x, o.y - SHADOW_PT_BODY);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
/* 암살자 — 그림자 일섬 한 방으로 쓰러뜨렸다: 시험(160레벨 이상 몹) · 전투 특성 그림자 회수(대기 시간을 돌려받는다) */
function shadowKill(E, g, h, o) {
  const T = trialOf(h);
  if (T && T.id === "assassin" && !isHero(o) && trialMob(E, o) && trialAdd(E, g, h, "assassin") && h.advQ.n < T.trial.n) E.say(g, h.map, h.x, h.y - 120, `암살 ${trialText(T, h.advQ)}`, "#d9b8f0");
  const v = traitOf(h);
  if (!v || h.advClass !== "assassin") return;
  const a = asOf(h), back = ADV_BY_ID.assassin.active.cd * v.refund * (o.boss || isHero(o) ? 0.5 : 1);
  a.cd = Math.max(0, (a.cd || ADV_BY_ID.assassin.active.cd) - back);
  E.say(g, h.map, h.x, h.y - 118, "그림자 회수", ADV_TRAITS.assassin.color);
}
/* 엘프 바람 화살 — 엘프가 평타를 쐈다(rpg.js heroAttack). every 번마다 첫 적 쪽으로 한 줄을 꿰뚫는 화살 한 발(noProc · 튄 피해) */
export function advElfShot(E, g, h, o, dmg) {
  const c = advOf(h), v = c && c.id === "elf" ? traitOf(h) : null;
  if (!v || !o) return;
  const a = asOf(h);
  a.ewN = (a.ewN || 0) + 1;
  if (a.ewN % v.every) return;
  const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const [x1, y1] = E.end(h, ux, uy, v.len), [sx, sy] = E.end(h, ux, uy, MUZZLE.bow);
  E.noProc(() => E.line(g, h, ux, uy, v.len, v.width).forEach((q) => E.extra(g, h, q, dmg * v.mul)));
  E.fx(g, h.map, { kind: "sk_adv_wind", x: sx, y: sy - MUZZLE.y, x0: sx, y0: sy - MUZZLE.y, x1, y1: y1 - MUZZLE.y, small: 1, big: masteryLv(h.advM) >= 4 ? 1 : 0, t: 0.4, life: 0.4 });
}
/* 총사 장전 — 쌍권총 평타를 쏠 수 있나(rpg.js heroAttack · pvpAttack 이 쏘기 전에 묻는다). 장전 중이면 false */
export function advGunReady(E, h) {
  const c = advOf(h);
  if (!c || c.id !== "gunner" || !E.gunHeld(h)) return true;
  const a = asOf(h);
  if (a.ammo < 0) a.ammo = c.reload.mag;            // 처음 — 탄창 가득
  return !(a.rl > 0);
}
// 쌍권총 평타를 한 발 쐈다 — 탄창을 다 쓰면 장전을 시작한다(그동안 걷는 속도가 준다 · advSpeedMul)
export function advGunFired(E, g, h) {
  const c = advOf(h);
  if (!c || c.id !== "gunner" || !E.gunHeld(h)) return;
  const a = asOf(h), R = c.reload;
  if (a.ammo < 0) a.ammo = R.mag;
  a.ammo -= 1;
  if (a.ammo > 0) return;
  a.rl = R.time; a.ammo = 0;
  E.say(g, h.map, h.x, h.y - 100, "장전", "#ffcf8a");
}
// 쏘는 자리 — 발밑에서 겨눈 쪽으로 이만큼 앞 · 이만큼 위(손 높이). 몸 한가운데서 나가면 캐릭터를 뚫고 나가 보였다
const MUZZLE = { bow: 18, gun: 22, y: 30 };
const SPIRIT_HOVER = { x: 44, y: 66, ring: 62, flat: 0.55 };   // 정령이 떠 있는 자리 — 하나면 주인 뒤쪽 위, 여럿이면 주인 둘레 고리(ring 반지름 · flat 세로 눌림)
// i 번째 정령의 자리(n 마리 가운데) — 첫째는 뒤쪽 위에서 시작해 고리를 고르게 나눈다
export const spiritSpot = (h, i = 0, n = 1) => {
  const d = h.dir || 1;
  if (n <= 1) return [h.x - d * SPIRIT_HOVER.x, h.y - SPIRIT_HOVER.y];
  const ang = (d > 0 ? Math.PI : 0) + (i / n) * Math.PI * 2;
  return [h.x + Math.cos(ang) * SPIRIT_HOVER.ring, h.y - SPIRIT_HOVER.y + Math.sin(ang) * SPIRIT_HOVER.ring * SPIRIT_HOVER.flat];
};
const newSpirit = (h, life, i, n) => { const [x, y] = spiritSpot(h, i, n); return { t: life, x, y, cd: 0.5, cap: { raw: 0, adv: 1 }, lk: "", lt: -9 }; };

/* ── 시간 (방장 · stepHeroes) ─────────────────────────────── */
export function tickAdv(E, g, h, dt) {
  if (advOf(h)?.id === "knight") {                // 무효화 방어막 — 깨진 뒤 쉬면 다시 생긴다
    const n = asOf(h);
    if (n.nul === undefined) n.nul = 1;
    if (!n.nul && h.down <= 0 && (n.nulIdle = (n.nulIdle || 0) + dt) >= JOB_TUNE.knight.nullShield.regen) {
      n.nul = 1; n.nulIdle = 0;
      E.fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 30, r: 40, color: "#cfe6ff", n: 8, t: 0.4, life: 0.4 });
    }
  }
  if (advOf(h)?.id === "elf" && h.down <= 0 && h.hp < h.max && !E.safe(h.map)) {   // 숲의 숨결 — 싸우는 중에도 차오른다 · 쉬면 두 배
    const P = ADV_BY_ID.elf.passive;
    h.hp = Math.min(h.max, h.hp + h.max * P.regen * (h.calm >= E.calmT ? P.calm : 1) * dt);
  }
  const a = h.as;
  if (!a) return;
  a.cd = Math.max(0, a.cd - dt);
  a.gT = Math.max(0, a.gT - dt); a.gGap = Math.max(0, a.gGap - dt);
  a.pT = Math.max(0, a.pT - dt);
  a.slT = Math.max(0, a.slT - dt); a.mgT = Math.max(0, a.mgT - dt);
  a.tcd = Math.max(0, (a.tcd || 0) - dt); a.esT = Math.max(0, (a.esT || 0) - dt); a.mvT = Math.max(0, (a.mvT || 0) - dt);
  a.ut = Math.max(0, (a.ut || 0) - dt); a.rush = Math.max(0, (a.rush || 0) - dt); a.wdT = Math.max(0, (a.wdT || 0) - dt);
  if (a.rl > 0 && (a.rl -= dt) <= 0) { a.rl = 0; a.ammo = ADV_BY_ID.gunner.reload.mag; }   // 장전 끝 — 탄창 가득
  if (a.fh && g.t - (a.fhT || 0) > 5) {             // 첫 일격 기록 — 오래된 것은 지운다
    a.fhT = g.t;
    const gap = ADV_BY_ID.assassin.passive.gap;
    Object.keys(a.fh).forEach((k) => { if (g.t - a.fh[k] >= gap) delete a.fh[k]; });
  }
  if (a.rsT > 0 && (a.rsT -= dt) <= 0) { a.rsT = 0; a.rs = 0; }   // 원소 공명이 흩어진다
  a.mqB = Math.min(ADV_MASTERY.perMin, (a.mqB ?? ADV_MASTERY.perMin) + (ADV_MASTERY.perMin / 60) * dt);   // 숙련도 통이 1분에 perMin 만큼 다시 찬다
  if (a.stT > 0 && (a.stT -= dt) <= 0) { a.stT = 0; if (h.advClass === "gladiator" || h.advClass === "gunner") a.st = 0; }
  a.gcT = Math.max(0, (a.gcT || 0) - dt);
  if (a.blT > 0) {                                 // 수호의 축복 — tick 초마다 최대 체력의 regen 만큼
    a.blT = Math.max(0, a.blT - dt);
    if ((a.blTk -= dt) <= 0 && h.down <= 0) {
      a.blTk += ADV_BY_ID.healer.active.tick;
      healHero(E, g, g.heroes[a.blBy] || null, h, h.max * a.blReg, true);
    }
  }
  if (a.ucd > 0) a.ucd = Math.max(0, a.ucd - dt);
  if (a.gi) tickGiant(E, g, h, a, dt);
  if (!a.sps || !a.sps.length) return;
  if (h.down > 0 || E.safe(h.map)) { a.sps = []; return; }
  a.sps = a.sps.filter((sp) => (sp.t -= dt) > 0);
  const n = a.sps.length;
  a.sps.forEach((sp, i) => spiritAct(E, g, h, a, sp, i, n, dt));
}
function spiritAct(E, g, h, a, sp, i, n, dt) {
  const [hx, hy] = spiritSpot(h, i, n), k = Math.min(1, dt * 6);
  if (sp.map !== h.map) { sp.x = hx; sp.y = hy; sp.map = h.map; }
  sp.x += (hx - sp.x) * k; sp.y += (hy - sp.y) * k;
  if ((sp.cd -= dt) > 0) return;
  const A = ADV_BY_ID.summoner.active;
  const [o] = E.near(g, h, h.x, h.y, A.range, 1);
  if (!o) { sp.cd = 0.25; return; }
  sp.cd = A.every;
  const map = h.map, el = E.elem(h);
  E.fx(g, map, { kind: "sk_adv_spshot", x: sp.x, y: sp.y, x0: sp.x, y0: sp.y, x1: o.x, y1: o.y - 28, elem: el, t: A.fly, life: A.fly });
  const dmg = E.base(h, A.dmg) * A.mul;
  E.later(g, A.fly, () => {
    if (!(a.sps || []).includes(sp) || !E.alive(g, h, o, map)) return;
    E.noProc(() => withCap(h, sp.cap, () => E.strike(g, h, o, dmg)));
    const k2 = keyOf(o);
    sp.lk = k2; sp.lt = g.t;
    if (a.lk === k2 && g.t - a.lt <= ADV_BY_ID.summoner.passive.win && advOf(h)) soulLink(E, g, h, o);
  });
}

/* ── 스냅샷 줄 53 — [전직, 시험 전직, 시험 진행, 쿨타임, 중첩, 철벽 방어 남은 초, 정령 가장 긴 남은 초, 파티 보호 남은 초, 노출 여부, 목록 시험의 종류마다 수(없으면 0), 정령마다 남은 초, 축복 남은 초,
   치유 시험 남은 몫, 치유 평타, 전직 숙련도(14), 전투 특성 대기(15), 정밀 사격 준비(16), 기동 사격 남은 초(17), 원소 공명(18), 공명 남은 초(19)] — 뒤에만 더한다 ── */
export function packAdv(h) {
  const a = h.as, ci = ADV_IDS.indexOf(h.advClass), qi = h.advQ ? ADV_IDS.indexOf(h.advQ.c) : -1;
  if (ci < 0 && qi < 0 && !a) return 0;
  const sps = (a && a.sps) || [];
  return [ci, qi, h.advQ ? h.advQ.n : 0, a ? r1(a.cd) : 0, a ? a.st : 0, a ? r1(a.gT) : 0,
    sps.length ? r1(Math.max(...sps.map((sp) => sp.t))) : 0, a ? r1(a.pT) : 0, a && a.ex ? 1 : 0, h.advQ && h.advQ.m ? h.advQ.m.slice() : 0,
    sps.length ? sps.map((sp) => r1(sp.t)) : 0, a ? r1(a.blT || 0) : 0, h.advQ && h.advQ.r ? h.advQ.r : 0, h.healMode ? 1 : 0,
    h.advClass ? cleanAdvM(h.advM) : 0, a ? r1(a.tcd || 0) : 0, a && a.pr ? 1 : 0, a ? r1(a.mvT || 0) : 0, a ? a.rs || 0 : 0, a ? r1(a.rsT || 0) : 0,
    a && a.nul ? 1 : 0, a ? r1(a.nulIdle || 0) : 0,   // 20 · 21 기사 무효화 방어막(있음 · 쉰 초)
    a ? r1(a.ut || 0) : 0, a ? r1(a.rush || 0) : 0, a ? r1(a.wdT || 0) : 0, a ? a.ammo ?? -1 : -1, a ? r1(a.rl || 0) : 0,   // 22~26 암살자 지정 불가 · 질주 / 엘프 바람 걸음 / 총사 탄창 · 장전(10월 30일)
    a ? r1(a.ucd || 0) : 0, a && a.gi ? [Math.round(a.gi.hp), a.gi.mhp, r1(a.gi.t), Math.round(a.gi.x), Math.round(a.gi.y)] : 0];   // 27 · 28 소환술사 궁극기 대기 · 거대 정령 [체력, 최대 체력, 남은 초](10월 31일)
}
export function applyAdv(h, v) {
  if (!Array.isArray(v)) { h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; return; }
  const [ci, qi, qn, cd, st, gT, spT, pT, ex] = v.slice(0, 9).map((x) => Number(x) || 0);
  h.advClass = ADV_IDS[ci] || "";
  h.advQ = ADV_IDS[qi] ? cleanAdvQ({ c: ADV_IDS[qi], n: qn, v: ADV.trialVer, m: v[9], r: v[12] }) : null;   // 방장이 보낸 진행은 지금 판
  const a = asOf(h);
  a.cd = cd; a.st = st; a.gT = gT; a.pT = pT; a.ex = ex ? "on" : "";
  // 정령마다 남은 초 — 옛 방장 화면은 줄 끝이 없어 가장 긴 초 하나로 한 마리
  a.blT = Number(v[11]) || 0;
  if (a.blT > 0 && !a.blCut) { const A = ADV_BY_ID.healer.active; a.blCut = A.cut; a.blReg = A.regen; a.blTk = A.tick; a.blAtk = A.atk; }
  h.healMode = !!v[13];   // 방장이 되면 남은 축복을 그대로 잇는다
  h.advM = h.advClass ? cleanAdvM(v[14]) : 0;     // 전직 숙련도 — 손님은 방장이 보낸 값만 쓴다(저장 · 방장 승계도 이 값)
  a.tcd = Number(v[15]) || 0; a.pr = v[16] ? 1 : 0; a.mvT = Number(v[17]) || 0;
  a.rs = Math.max(0, Math.min(ADV_TRAITS.archmage.max, Math.floor(Number(v[18]) || 0))); a.rsT = a.rs ? Number(v[19]) || 0 : 0;
  if (v.length > 20) { a.nul = v[20] ? 1 : 0; a.nulIdle = Number(v[21]) || 0; }   // 옛 방장은 줄 끝이 없다 — 방장이 되면 처음 값으로
  if (v.length > 27) {                              // 소환술사 궁극기 — 옛 방장은 줄 끝이 없다
    a.ucd = Number(v[27]) || 0;
    const G = v[28];
    if (Array.isArray(G) && G[2] > 0) { const gi = a.gi || (a.gi = { x: h.x, y: h.y, map: h.map, cd: 0, cap: { raw: 0, adv: 1 } }); gi.hp = Number(G[0]) || 0; gi.mhp = Number(G[1]) || 1; gi.t = Number(G[2]) || 0;
      if (G.length > 4) { gi.sx = Number(G[3]); gi.sy = Number(G[4]); if (!Number.isFinite(gi.x) || Math.hypot(gi.x - gi.sx, gi.y - gi.sy) > 700) { gi.x = gi.sx; gi.y = gi.sy; } } }
    else a.gi = null;
  }
  if (v.length > 22) { a.ut = Number(v[22]) || 0; a.rush = Number(v[23]) || 0; a.wdT = Number(v[24]) || 0; a.ammo = Number(v[25] ?? -1); a.rl = Number(v[26]) || 0; }
  const ts = Array.isArray(v[10]) ? v[10].map((x) => Number(x) || 0).filter((x) => x > 0) : spT > 0 ? [spT] : [];
  const sps = a.sps || (a.sps = []);
  sps.length = Math.min(sps.length, ts.length);
  ts.forEach((t, i) => { if (!sps[i]) sps[i] = newSpirit(h, t, i, ts.length); sps[i].t = t; });
}
// 손님 화면 — 정령이 주인을 따라 떠다닌다(그림만. 공격 · 피해는 방장이 보낸 연출)
export function stepAdvVisual(h, dt) {
  if (h.as && h.as.blT > 0) h.as.blT = Math.max(0, h.as.blT - dt);   // 축복 고리 — 스냅샷 사이에도 줄어든다
  if (h.as) { const a = h.as; a.tcd = Math.max(0, (a.tcd || 0) - dt); a.mvT = Math.max(0, (a.mvT || 0) - dt); a.rsT = Math.max(0, (a.rsT || 0) - dt); }   // 전투 특성 칸 — 스냅샷 사이에도
  if (h.as) { const a = h.as; a.ut = Math.max(0, (a.ut || 0) - dt); a.rush = Math.max(0, (a.rush || 0) - dt); a.wdT = Math.max(0, (a.wdT || 0) - dt); a.rl = Math.max(0, (a.rl || 0) - dt); }   // 걷는 속도 · 비침 — 스냅샷 사이에도
  if (h.as && h.as.ucd > 0) h.as.ucd = Math.max(0, h.as.ucd - dt);
  const gi = h.as && h.as.gi;                      // 거대 정령 — 주인 앞으로 따라온다(그림만)
  if (gi) {
    gi.t = Math.max(0, gi.t - dt);
    if (Number.isFinite(gi.sx)) { const k = Math.min(1, dt * 8); gi.x += (gi.sx - gi.x) * k; gi.y += (gi.sy - gi.y) * k; }   // 방장이 보낸 자리로 부드럽게
  }
  const sps = h.as && h.as.sps;
  if (!sps || !sps.length) return;
  if (h.as.cd > 0) h.as.cd = Math.max(0, h.as.cd - dt);
  const n = sps.length, k = Math.min(1, dt * 6);
  sps.forEach((sp, i) => {
    const [hx, hy] = spiritSpot(h, i, n);
    if (Math.hypot(hx - sp.x, hy - sp.y) > 400) { sp.x = hx; sp.y = hy; }
    sp.x += (hx - sp.x) * k; sp.y += (hy - sp.y) * k;
  });
}
