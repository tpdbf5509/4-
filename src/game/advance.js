/* ── RPG 1차 전직 규칙 (방장만 판정) ─────────────────────────────
   수치는 advData.js. E 는 rpg.js 의 대상 고르기 · 피해 · 연출 함수(advEngine) — 피해 · 결투 한도 · 원소는 기존 판정을 그대로 거친다.
   영구 기록: h.advClass(전직 id) · h.advQ({ c, n } 시험). 싸우는 동안만: h.as(쿨타임 · 중첩 · 철벽 · 정령) — 스냅샷 줄 53 으로 손님에게 간다.
   클라이언트 예측은 쓰지 않는다 — 손님 화면은 방장이 보낸 연출과 상태만 그린다 */
import { ADV, ADV_BY_ID, ADV_IDS } from "./advData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const keyOf = (o) => (o.type !== undefined ? `m${o.id}` : `h${o.pi}`);
const isHero = (o) => !!o && o.type === undefined;
export const asOf = (h) => h.as || (h.as = { cd: 0, st: 0, stT: 0, fk: "", fn: 0, ex: "", gT: 0, gN: 0, gGap: 0, pT: 0, pCut: 0,
  sp: null, lb: -9, lk: "", lt: -9, slT: 0, mgT: 0, bT: 0 });

// 지금 전직 — 기본 직업과 맞을 때만(관리자가 직업을 바꾸면 맞지 않는 전직은 없는 것으로 본다)
export const advOf = (h) => { const c = h && ADV_BY_ID[h.advClass]; return c && c.job === h.job ? c : null; };
// 시험 중인 전직 — 아직 전직하지 않았고 기본 직업이 맞을 때
export const trialOf = (h) => { const c = h && !h.advClass && h.advQ && ADV_BY_ID[h.advQ.c]; return c && c.job === h.job ? c : null; };
export const trialDone = (h) => { const c = trialOf(h); return !!c && h.advQ.n >= c.trial.n; };
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
  if (req.op === "start") {
    const why = whyAdvStart(h, req.c, E.dist);
    if (why.length) return void E.sys(g, pi, why[0]);
    h.advQ = { c: req.c, n: 0 };
    asOf(h).sp = null;                              // 다른 시험의 임시 정령은 돌려보낸다
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "전직 시험 시작", color: "#ffe08a", t: 1, life: 1, snd: "build", who: pi });
    E.sys(g, pi, `${ADV_BY_ID[req.c].trial.name}을 시작했습니다. ${ADV_BY_ID[req.c].trial.note}.`);
    return true;
  }
  if (req.op === "drop") {
    if (!h.advQ) return false;
    h.advQ = null; asOf(h).sp = null;
    E.sys(g, pi, "전직 시험을 그만두었습니다. 진행은 처음으로 돌아갑니다.");
    return true;
  }
  if (req.op === "confirm") {
    const c = ADV_BY_ID[req.c];
    const why = whyAdvConfirm(h, req.c, E.dist, E.bagRoom(h));
    if (why.length) return void E.sys(g, pi, why[0]);
    h.advClass = req.c; h.advQ = null;
    h.as = null;                                    // 시험 정령 · 중첩을 비운다
    if (c.gear) E.gear(h, c.gear);
    E.fx(g, h.map, { kind: "lvup", x: h.x, y: h.y, text: `전직 — ${c.name}`, t: 2, life: 2, snd: "lvup", who: pi });
    E.sys(g, pi, `${c.name}(으)로 전직했습니다. 전직 스킬 「${c.active.name}」은 전직 스킬 키(기본 Z)로 씁니다.${c.gear ? " 전직 무기를 가방에 넣었습니다." : ""}`);
    return true;
  }
  if (req.op === "reset" && h.admin) {             // 관리자 시험용 — 전직 · 시험을 비운다
    h.advClass = ""; h.advQ = null; h.as = null;
    E.sys(g, pi, "관리자 — 전직을 비웠습니다.");
    return true;
  }
  return false;
}

/* ── 시험 진행 ─────────────────────────────────────────── */
// 시험에 세는 몹 — 허수아비는 빼고 160레벨 이상 · 던전 · 월드보스
const trialMob = (E, o) => !!o && !isHero(o) && o.type !== "dummy" && (o.lv >= ADV.trialLv || E.bigMap(o.map));
function trialAdd(E, g, h, cid) {
  const c = trialOf(h);
  if (!c || c.id !== cid || h.advQ.n >= c.trial.n) return;
  h.advQ.n += 1;
  if (h.advQ.n >= c.trial.n) {
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "전직 시험 완료!", color: "#ffd873", t: 1.6, life: 1.6, snd: "clear", who: h.pi });
    E.sys(g, h.pi, `${c.trial.name}을 마쳤습니다. 광장의 전직 교관에게서 「${c.name}」 전직을 확정하세요.`);
  }
}

/* ── 맞혔을 때 (rpg.js hitMob · hitFoe 가 부른다 — 패시브가 낳은 피해(procOff)는 부르지 않는다) ── */
export function advOnHit(E, g, h, o, basic, side) {
  if (!h || !o) return;
  const a = asOf(h), k = keyOf(o), cast = h.cast, T = trialOf(h);
  // 시험
  if (T && trialMob(E, o)) {
    if (T.id === "gladiator") {
      if (basic) a.lb = g.t;
      else if (cast && cast.job && !cast.tq && g.t - a.lb <= T.trial.win) { cast.tq = 1; trialAdd(E, g, h, "gladiator"); }
    } else if (T.id === "marksman" && basic && !side && o.moving && E.dist(h.x, h.y, o.x, o.y) >= T.trial.far) trialAdd(E, g, h, "marksman");
    else if (T.id === "gunner" && basic && !side && h.hold && h.hold.length) trialAdd(E, g, h, "gunner");
    else if (T.id === "archmage" && !basic && cast && !cast.tq) {
      (cast.tset || (cast.tset = new Set())).add(k);
      if (cast.tset.size >= T.trial.many) { cast.tq = 1; trialAdd(E, g, h, "archmage"); }
    }
  }
  const c = advOf(h);
  if (!c) return;
  const P = c.passive;
  if (c.id === "gladiator") {                     // 전투 본능 — 평타는 0.2초에 한 번 · 직업 스킬은 한 번 쓸 때 한 번
    let add = 0;
    if (basic && g.t - (a.bT || -9) >= 0.2) { a.bT = g.t; add = P.basic; }
    else if (!basic && cast && cast.job && !cast.ab) { cast.ab = 1; add = P.job; }
    if (add) { a.st = Math.min(P.max, a.st + add); a.stT = P.fade; }
  } else if (c.id === "marksman") {               // 약점 포착 — 같은 적을 이어 맞히면 노출
    if (side) return;
    if (a.fk === k) a.fn += 1; else { a.fk = k; a.fn = 1; }
    if (a.fn >= P.need) { a.ex = k; a.fn = 0; E.say(g, h.map, o.x, o.y - 70, "약점 노출", "#9ff0e6"); }
    a.st = a.ex ? P.need : a.fn;
  } else if (c.id === "gunner") {                 // 탄도 숙련 — 같은 적에게 이어 맞히면 다음 탄환이 세진다
    const shot = (!basic && cast && cast.adv) || (basic && E.gunHeld(h));
    if (!shot || side) return;
    if (a.fk === k) a.st = Math.min(P.max, a.st + 1); else { a.fk = k; a.st = 1; }
    a.stT = P.fade;
  } else if (c.id === "archmage") {               // 마력 순환 — 마법 공격이 맞으면 마력(화상 · 독 틱은 세지 않는다)
    if (a.mgT > 0) return;
    a.mgT = P.gap; a.st = Math.min(P.max, a.st + 1);
  } else if (c.id === "summoner") {               // 영혼 연결 — 정령이 2초 안에 친 적을 내가 치면
    a.lk = k; a.lt = g.t;
    const sp = a.sp;
    if (sp && sp.t > 0 && !sp.trial && sp.lk === k && g.t - sp.lt <= P.win) soulLink(E, g, h, o);
  }
}
function soulLink(E, g, h, o) {
  const a = asOf(h), c = ADV_BY_ID.summoner, P = c.passive;
  if (a.slT > 0 || !E.alive(g, h, o, h.map)) return;
  a.slT = P.gap;
  const dmg = E.base(h, c.active.dmg) * P.mul;
  E.noProc(() => withCap(h, a.sp && a.sp.cap, () => E.strike(g, h, o, dmg)));
  E.fx(g, h.map, { kind: "sk_adv_link", x: o.x, y: o.y - 30, x0: h.x, y0: h.y - 40, elem: E.elem(h), t: 0.45, life: 0.45, snd: "zap" });
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
  const c = advOf(h);
  if (!c || !o) return 1;
  const a = asOf(h), k = keyOf(o), cast = h.cast;
  let bonus = 0;
  if (c.id === "marksman") {
    if (a.ex === k) { bonus += c.passive.bonus; a.ex = ""; a.st = 0; }
    if (o.wkBy === h.pi && o.wkUntil > g.t && (basic || !(cast && cast.adv))) { bonus += c.passive.bonus; o.wkUntil = 0; }   // 관통 저격의 표식 — 다음 공격(평타 · 직업 스킬)이 터뜨린다
  } else if (c.id === "gunner") {
    if ((!basic && cast && cast.adv) || (basic && E.gunHeld(h))) bonus += a.st * c.passive.per;   // h.cast 는 스킬 뒤에도 남아 있어 평타는 basic 으로 가른다
  }
  return 1 + Math.min(bonus, pvp ? ADV.pvpBonusMax : ADV.pveBonusMax);
}

/* 받는 피해 감소 — 직업 철벽(ironCut)과 철벽 방어 · 불굴의 의지 · 파티 보호를 곱해 합친다.
   전직 감소가 하나라도 있으면 합계는 기사 cap(70%)을 넘지 않는다(직업 철벽만이면 예전 그대로) */
export function advTakeCut(h, ironCut) {
  const a = h.as;
  const K = ADV_BY_ID.knight;
  const parts = [];
  if (a && a.gT > 0 && advOf(h) === K) parts.push(K.active.cut);
  if (advOf(h) === K && h.hp <= h.max * K.passive.hp) parts.push(K.passive.cut);
  if (a && a.pT > 0) parts.push(a.pCut);
  if (!parts.length) return ironCut || 0;
  const keep = [ironCut || 0, ...parts].reduce((v, c) => v * (1 - c), 1);
  return Math.min(K.cap, 1 - keep);
}
// 맞았다(피해가 들어갔다) — 철벽 방어 반격 · 기사 시험
export function advHurt(E, g, h) {
  const a = h.as, c = advOf(h);
  if (c && c.id === "knight" && a && a.gT > 0 && a.gN > 0 && a.gGap <= 0) {
    const A = c.active;
    a.gN -= 1; a.gGap = A.gap;
    const dmg = E.base(h, A.dmg) * A.mul;
    const cap = a.gCap || (a.gCap = { raw: 0, adv: 1 });
    withCap(h, cap, () => E.near(g, h, h.x, h.y, A.r).forEach((o) => E.strike(g, h, o, dmg)));
    E.fx(g, h.map, { kind: "sk_adv_hex", x: h.x, y: h.y - 30, r: A.r, t: 0.45, life: 0.45, snd: "boom" });
  }
  const T = trialOf(h);
  if (T && T.id === "knight" && E.bigMap(h.map) && !E.pvpMap(h.map)) trialAdd(E, g, h, "knight");
}
// 쓰러졌다 — 기사 시험은 처음부터 · 정령은 돌아간다
export function advDown(E, g, h) {
  const T = trialOf(h);
  if (T && T.id === "knight" && h.advQ.n > 0 && h.advQ.n < T.trial.n) { h.advQ.n = 0; E.sys(g, h.pi, "쓰러져서 생존 시험이 처음으로 돌아갔습니다."); }
  if (h.as) h.as.sp = null;
}
// 몹이 쓰러졌다 — 정령이 친 몹이면 소환술사 시험
export function advOnKill(E, g, m) {
  (m.spBy || []).forEach((pi) => {
    const h = g.heroes[pi];
    if (h && trialMob(E, m) && h.map === m.map) trialAdd(E, g, h, "summoner");
  });
}

/* ── 전직 액티브 (키 adv · 기본 Z) ───────────────────────────── */
export function advUse(E, g, h) {
  const c = advOf(h), map = h.map;
  if (h.down > 0 || E.locked(h)) return false;
  if (!c) return void E.say(g, map, h.x, h.y - 90, `${ADV.lv}레벨에 전직하면 쓸 수 있다`, "#d9c9a6");
  if (E.safe(map)) return void E.say(g, map, h.x, h.y - 90, "광장에서는 쓸 수 없다", "#d9c9a6");
  const a = asOf(h), A = c.active;
  if (a.cd > 0) return void E.say(g, map, h.x, h.y - 90, `${A.name} ${Math.ceil(a.cd)}초`, "#f0dcb4");
  if (E.pvpMap(map) && h.dph !== 2) return void E.say(g, map, h.x, h.y - 90, "곧 시작합니다", "#d9c9a6");
  const cast = E.newCast(h);
  cast.adv = 1;
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
    E.fx(g, map, { kind: "sk_adv_guard", x: h.x, y: h.y - 34, r: 70, t: 0.7, life: 0.7, snd: "bless" });
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
    E.fx(g, map, { kind: "sk_adv_snipe", x: h.x, y: h.y - 34, x0: h.x, y0: h.y - 34, x1, y1: y1 - 34, aim: A.aim, t: A.aim + 0.35, life: A.aim + 0.35, snd: "shot" });
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
      const side = i % 2 ? 1 : -1;
      E.fx(g, map, { kind: "sk_adv_shot", x: h.x, y: h.y - 34, x0: h.x + side * 8, y0: h.y - 36 + side * 3, x1: tx, y1: ty - 30, side, t: A.fly + 0.12, life: A.fly + 0.12, snd: i % 2 ? undefined : "shot" });
      h.swing = 0.12;
      if (!o) return;
      E.later(g, A.fly, () => {
        if (!E.alive(g, h, o, map)) return;
        withCap(h, cast, () => E.strike(g, h, o, base * A.mul));
        if (i === A.n - 1 && !isHero(o)) E.soak(g, h, o, 0);   // 원소는 마지막 한 발만 — 여덟 번 겹치지 않게
      });
    });
  } else if (c.id === "archmage") {
    const P = c.passive, n = a.st;
    a.st = 0;
    const [o] = E.near(g, h, h.x, h.y, A.reach, 1);
    const [tx, ty] = o ? [o.x, o.y] : E.aimAt(h, A.aim);
    if (o && Math.abs(o.x - h.x) > 1) h.dir = o.x < h.x ? -1 : 1;
    const r = A.r + P.grow * n, mul = A.mul * (1 + P.per * n), el = E.elem(h);
    E.fx(g, map, { kind: "sk_adv_circle", x: tx, y: ty, r, elem: el, t: A.delay + 0.25, life: A.delay + 0.25 });
    E.later(g, A.delay, () => {
      if (h.map !== map || h.down > 0) return;
      const X = A.elem[el] || {};
      withCap(h, cast, () => E.near(g, h, tx, ty, r).forEach((q) => {
        E.strike(g, h, q, base * mul);
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
    });
    if (n) E.say(g, map, h.x, h.y - 120, `마력 ${n}`, "#d8c8ff");
  } else if (c.id === "summoner") {
    if (a.sp && a.sp.t > 0) E.fx(g, map, { kind: "poof", x: a.sp.x, y: a.sp.y, t: 0.4, life: 0.4, color: "rgba(200,220,255,1)" });   // 있던 정령은 돌려보낸다
    a.sp = newSpirit(h, A.life, 0);
    E.fx(g, map, { kind: "sk_adv_summon", x: h.x, y: h.y, r: 80, elem: E.elem(h), t: 0.9, life: 0.9, snd: "bless" });
  }
  a.cd = A.cd;
  h.swing = Math.max(h.swing || 0, 0.35);
  E.fx(g, map, { kind: "call", x: h.x, y: h.y - 104, text: A.name, color: "#ffd873", t: 0.8, life: 0.8, who: h.pi });
  return true;
}
const SPIRIT_HOVER = { x: 44, y: 66 };            // 정령이 떠 있는 자리 — 주인 뒤쪽 위
const newSpirit = (h, life, trial) => ({ t: life, trial: trial ? 1 : 0, x: h.x - (h.dir || 1) * SPIRIT_HOVER.x, y: h.y - SPIRIT_HOVER.y,
  cd: 0.5, cap: { raw: 0, adv: 1 }, lk: "", lt: -9 });
export const spiritSpot = (h) => [h.x - (h.dir || 1) * SPIRIT_HOVER.x, h.y - SPIRIT_HOVER.y];

/* ── 시간 (방장 · stepHeroes) ─────────────────────────────── */
export function tickAdv(E, g, h, dt) {
  const a = h.as, T = trialOf(h);
  // 소환술사 시험 — 160레벨 이상 사냥터 · 던전에서는 임시 정령이 따라온다
  if (T && T.id === "summoner" && h.down <= 0 && E.bigMap(h.map) && h.advQ.n < T.trial.n) {
    const b = asOf(h);
    if (!b.sp) b.sp = newSpirit(h, 1e6, 1);
  } else if (a && a.sp && a.sp.trial) a.sp = null;
  if (!a) return;
  a.cd = Math.max(0, a.cd - dt);
  a.gT = Math.max(0, a.gT - dt); a.gGap = Math.max(0, a.gGap - dt);
  a.pT = Math.max(0, a.pT - dt);
  a.slT = Math.max(0, a.slT - dt); a.mgT = Math.max(0, a.mgT - dt);
  if (a.stT > 0 && (a.stT -= dt) <= 0) { a.stT = 0; if (h.advClass === "gladiator" || h.advClass === "gunner") a.st = 0; }
  const sp = a.sp;
  if (!sp) return;
  if (h.down > 0 || E.safe(h.map) || (sp.t -= dt) <= 0) { if (!sp.trial || h.down > 0) a.sp = null; return; }
  const [hx, hy] = spiritSpot(h), k = Math.min(1, dt * 6);
  if (sp.map !== h.map) { sp.x = hx; sp.y = hy; sp.map = h.map; }
  sp.x += (hx - sp.x) * k; sp.y += (hy - sp.y) * k;
  if ((sp.cd -= dt) > 0) return;
  const A = ADV_BY_ID.summoner.active;
  const [o] = E.near(g, h, h.x, h.y, A.range, 1);
  if (!o) { sp.cd = 0.25; return; }
  sp.cd = A.every;
  const map = h.map, el = E.elem(h);
  E.fx(g, map, { kind: "sk_adv_spshot", x: sp.x, y: sp.y, x0: sp.x, y0: sp.y, x1: o.x, y1: o.y - 28, elem: el, t: A.fly, life: A.fly });
  const dmg = E.base(h, A.dmg) * A.mul * (sp.trial ? ADV_BY_ID.summoner.trial.trialMul : 1);
  E.later(g, A.fly, () => {
    if (a.sp !== sp || !E.alive(g, h, o, map)) return;
    if (!isHero(o) && !(o.spBy || (o.spBy = [])).includes(h.pi)) o.spBy.push(h.pi);
    E.noProc(() => withCap(h, sp.cap, () => E.strike(g, h, o, dmg)));
    const k2 = keyOf(o);
    sp.lk = k2; sp.lt = g.t;
    if (!sp.trial && a.lk === k2 && g.t - a.lt <= ADV_BY_ID.summoner.passive.win && advOf(h)) soulLink(E, g, h, o);
  });
}

/* ── 스냅샷 줄 53 — [전직, 시험 전직, 시험 진행, 쿨타임, 중첩, 철벽 방어 남은 초, 정령 남은 초(시험 정령 -1), 파티 보호 남은 초, 노출 여부] ── */
export function packAdv(h) {
  const a = h.as, ci = ADV_IDS.indexOf(h.advClass), qi = h.advQ ? ADV_IDS.indexOf(h.advQ.c) : -1;
  if (ci < 0 && qi < 0 && !a) return 0;
  const sp = a && a.sp;
  return [ci, qi, h.advQ ? h.advQ.n : 0, a ? r1(a.cd) : 0, a ? a.st : 0, a ? r1(a.gT) : 0,
    sp ? (sp.trial ? -1 : r1(sp.t)) : 0, a ? r1(a.pT) : 0, a && a.ex ? 1 : 0];
}
export function applyAdv(h, v) {
  if (!Array.isArray(v)) { h.advClass = ""; h.advQ = null; h.as = null; return; }
  const [ci, qi, qn, cd, st, gT, spT, pT, ex] = v.map((x) => Number(x) || 0);
  h.advClass = ADV_IDS[ci] || "";
  h.advQ = ADV_IDS[qi] ? { c: ADV_IDS[qi], n: qn } : null;
  const a = asOf(h);
  a.cd = cd; a.st = st; a.gT = gT; a.pT = pT; a.ex = ex ? "on" : "";
  if (spT) {
    if (!a.sp) { const [x, y] = spiritSpot(h); a.sp = { x, y, cd: 0.5, cap: { raw: 0, adv: 1 }, lk: "", lt: -9 }; }
    a.sp.t = spT < 0 ? 1e6 : spT; a.sp.trial = spT < 0 ? 1 : 0;
  } else a.sp = null;
}
// 손님 화면 — 정령이 주인을 따라 떠다닌다(그림만. 공격 · 피해는 방장이 보낸 연출)
export function stepAdvVisual(h, dt) {
  const sp = h.as && h.as.sp;
  if (!sp) return;
  if (h.as.cd > 0) h.as.cd = Math.max(0, h.as.cd - dt);
  const [hx, hy] = spiritSpot(h), k = Math.min(1, dt * 6);
  if (Math.hypot(hx - sp.x, hy - sp.y) > 400) { sp.x = hx; sp.y = hy; }
  sp.x += (hx - sp.x) * k; sp.y += (hy - sp.y) * k;
}
