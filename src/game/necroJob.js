/* ── 히든 직업 Necromancer 004(그림자 군주) 판정 — 영혼 · 그림자 명부 · 스킬 8종(11월 17일) ─────────────
   수치는 necroData.js. 판정 쪽(방장 · 전용 서버 꼴)만 셈한다. 화면은 연출(fx)과 necroView · necroShadows 값만 그린다.
   11월 17일 사용자 결정 — 격자 연습장에만 넣는다(획득 방법 · 저장 · 스냅샷 · 명령어는 아직 없다). NECRO.live 가 false 면 sandbox 맵에서만 켜진다.
   피해는 기존 strikeAny · 평타 판정을 거쳐 결투 시전별 상한 · 사냥터 PvP 상한이 그대로 걸린다(기획안 3부 3장).
   - 그림자 소집으로 나온 그림자들의 평소 공격은 소집 시전 하나를 함께 쓴다. 일제 진군 · 영혼 소각 · 무명의 군세는 저마다 새 시전.
   저장 꼴(기획안 최종 추천안) bag.hj = { active: "necromancer", jobs: { necromancer: { lv, xp, tr: [[연마 레벨, 경험치] × 3], roster: [...] } }, version: 1 }.
   명부 한 칸 roster[i] = { t: 몹 종류, n: 이름, g: 등급 1~5, x: 다음 승급까지 모은 재추출 수 }.
   싸우는 동안의 상태 h.nc — 영혼 · 대기 · 흔적 · 그림자 · 예약 타격 · 영역. 영혼은 저장하지 않는다.
   그림자는 몹 목록(g.mobs)에 섞지 않는다(기획안 3부 5장) — 몹이 노리지 않고 맞지도 않는다(정한 해석: 그림자 체력 수치가 기획안에 없다).
   E(엔진, rpg.js necroEngine): fx · say · near · strike · basic · alive · base · face · locked · fight · squash · blocks · bounds ·
   cast(h, sid) · dummy · cdOff · boss · trace(m) · mobName(m) */
import { NECRO as NC, NECRO_ID, NECRO_NAME, NECRO_TINT, NC_TRAIN_NAMES, NC_SOUL as SOUL, NC_ROSTER as RS, NC_TRACE as TR, NC_KINDS, NC_KIND_OF,
  NC_SCYTHE as SC, NC_EXTRACT as EX, NC_SUMMON as SM, NC_AI as AI, NC_SWAP as SW, NC_DOMAIN as DM, NC_MARCH as MC, NC_BURN as BN, NC_LEGION as LG,
  NC_ETERNAL as ET, NC_SKILLS } from "./necroData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const LIGHT = "#D9CCF0", DIM = "#c9bfd9", WARN = "#e6d6f2", RED = "#ff9a9a";

/* ── 저장 값 ───────────────────────────────────────── */
export const ncJobNeed = (lv) => NC.xp.base + NC.xp.per * lv;
export const ncTrainNeed = (l) => NC.train.base + NC.train.per * l;
export const kindOf = (type) => {
  if (NC_KIND_OF[type]) return NC_KIND_OF[type];
  const base = Object.keys(NC_KIND_OF).filter((k) => String(type).startsWith(k)).sort((a, b) => b.length - a.length)[0];   // 800~1200 정예 · 소환 id 는 지역 id 로 시작한다
  return base ? NC_KIND_OF[base] : "knight";
};
function cleanRoster(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set(), out = [];
  for (const q of list) {
    if (!q || typeof q.t !== "string" || !q.t || seen.has(q.t) || out.length >= RS.slots25) continue;
    seen.add(q.t);
    out.push({ t: q.t.slice(0, 40), n: String(q.n || q.t).slice(0, 24), g: clampN(q.g, 1, RS.grades) || 1, x: clampN(q.x, 0, 99) });
  }
  return out;
}
// 직업 한 칸 — 레벨 · 경험치 · 연마 · 명부를 범위 안으로
export function cleanNcJob(d) {
  d = d && typeof d === "object" ? d : {};
  const lv = clampN(d.lv, 1, NC.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, NC.train.max);
    return [l, l >= NC.train.max ? 0 : clampN(q[1], 0, ncTrainNeed(l) - 1)];
  });
  return { lv, xp: lv >= NC.maxLv ? 0 : clampN(d.xp, 0, ncJobNeed(lv) - 1), tr, roster: cleanRoster(d.roster) };
}
// 이 직업인가 — 판정은 가방 값으로만 본다. NECRO.live 를 끄면 연습장(sandbox 맵)에서만 켜진다
export const necroOn = (h) => !!(h && h.bag && h.bag.hj && h.bag.hj.active === NECRO_ID && h.bag.hj.jobs && h.bag.hj.jobs[NECRO_ID] && (NC.live || h.map === "sandbox"));
export const necroLook = (h) => !!(h && (h.ncv || necroOn(h)));
const jobOf = (h) => h.bag.hj.jobs[NECRO_ID];
export const ncTrainSum = (J) => (J ? J.tr.reduce((n, q) => n + q[0], 0) : 0);
export const necroTint = (sum) => NECRO_TINT.find((t) => sum >= t.from).id;
export const ncEternal = (J) => ncTrainSum(J) >= NC.eternal;
export const ncLock = (J, sk) => (!J ? "잠김" : J.lv < NC.unlock[sk] ? `직업 레벨 ${NC.unlock[sk]}에 열립니다` : "");
export const rosterSlots = (J) => (J && J.tr[0][0] >= RS.sp25 ? RS.slots25 : RS.slots);
// 다음 등급까지 드는 재추출 수(5등급이 되는 값은 추출 연마 50 이면 20% 줄어든다). 이미 5등급이면 0
export function gradeCost(J, g) {
  if (g >= RS.grades) return 0;
  const c = RS.cost[g - 1];
  return g === RS.grades - 1 && J && J.tr[0][0] >= RS.sp50 ? Math.round(c * (1 - RS.cut50)) : c;
}

/* 켜기 — 1차 전직 · 다른 히든 직업과 함께 쓰지 못한다(한 번에 하나). 든 무기는 내려놓는다(지우지 않는다).
   init 이 있으면 그 레벨 · 연마 · 명부로(연습장), 없으면 예전 기록을 잇거나 직업 레벨 1 부터 */
export function unlockNecro(h, init) {
  const old = h.bag.hj && h.bag.hj.jobs ? h.bag.hj.jobs : {};
  h.bag.hj = { active: NECRO_ID, jobs: { ...old, [NECRO_ID]: cleanNcJob(init || old[NECRO_ID]) }, version: 1 };
  h.ncv = null;
  if (h.bag.bd && h.bag.bd.on) h.bag.bd = { ...h.bag.bd, on: 0 };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null; h.gm = null;
  h.bag.e = 0;
  h.nc = null;
  h.bag.v = (h.bag.v || 0) + 1;
}
// 끄기 — 직업 레벨 · 연마 · 명부는 남긴다
export function dropNecro(h) {
  if (!h.bag || !h.bag.hj || h.bag.hj.active !== NECRO_ID) return;
  h.bag.hj = { ...h.bag.hj, active: "" };
  h.nc = null; h.ncv = null;
  h.bag.v = (h.bag.v || 0) + 1;
}

/* ── 싸우는 동안의 상태 h.nc ───────────────────────── */
const NO_CD = { extract: 0, summon: 0, swap: 0, domain: 0, march: 0, burn: 0, legion: 0 };
function st(h) {
  return h.nc || (h.nc = { soul: 0, cd: { ...NO_CD }, reaps: [], traces: [], sh: [], blows: [], ex: [], swaps: [], marches: [], burns: [], legions: [],
    dom: null, boss: {}, lock: {}, xm: [0, 0], q: 0 });
}
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
const sqd = (E, x0, y0, x1, y1) => Math.hypot(x1 - x0, (y1 - y0) / E.squash);
const no = (E, g, h, text, color = DIM) => void E.say(g, h.map, h.x, h.y - 90, text, color);
const call = (E, g, h, text) => E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text, color: LIGHT, who: h.pi, t: 0.7, life: 0.7 });
function wallCut(E, h, ax, ay, len) {
  let cut = len;
  for (const b of E.blocks(h.map)) {
    const dx = b.x - h.x, dy = (b.y - h.y) / E.squash, along = dx * ax + dy * ay;
    if (along <= 0 || along > cut) continue;
    const side = Math.abs(dx * ay - dy * ax), r = b.r + 4;
    if (side > r) continue;
    cut = Math.min(cut, Math.max(0, along - Math.sqrt(r * r - side * side)));
  }
  return cut;
}
const inBlock = (E, map, x, y) => E.blocks(map).some((b) => Math.hypot(b.x - x, (b.y - y) / E.squash) < b.r);
const inCircle = (E, g, h, x, y, R, map) => E.near(g, h, x, y, R + 60).filter((o) => E.alive(g, h, o, map) && sq(E, x, y, o) - (o.rad || 16) * 0.5 <= R);
const nearest = (E, g, h, x, y, R, map) => E.near(g, h, x, y, R + 40).filter((o) => E.alive(g, h, o, map) && sq(E, x, y, o) <= R).sort((a, b) => sq(E, x, y, a) - sq(E, x, y, b))[0];
// 지점 스킬이 떨어질 자리 — 포인터 자리(reach 밖이면 줄인다) · 없으면 가까운 적 · 없으면 보는 쪽 near
function pointAt(E, g, h, reach, near) {
  let dx, dy;
  if (h.inputPt) { dx = h.inputPt[0] - h.x; dy = (h.inputPt[1] - h.y) / E.squash; }
  else {
    const o = nearest(E, g, h, h.x, h.y, reach, h.map);
    if (o) { dx = o.x - h.x; dy = (o.y - h.y) / E.squash; }
    else { const [ax, ay] = E.face(h); dx = ax * near; dy = ay * near; }
  }
  let d = Math.hypot(dx, dy);
  if (d < 1) return [Math.round(h.x), Math.round(h.y)];
  const ux = dx / d, uy = dy / d;
  d = Math.min(d, reach, wallCut(E, h, ux, uy, Math.min(d, reach)));
  if (Math.abs(ux) > 0.05) h.dir = ux < 0 ? -1 : 1;
  return [Math.round(h.x + ux * d), Math.round(h.y + uy * d * E.squash)];
}
// 맵 안으로
function inMap(E, map, x, y) {
  const [w, hh, top] = E.bounds(map);
  return [Math.max(40, Math.min(w - 40, x)), Math.max(top + 20, Math.min(hh - 30, y))];
}

/* ── 영혼 ─────────────────────────────────────────── */
export const ncSoul = (h) => (necroOn(h) && h.nc ? h.nc.soul : 0);
const gainSoul = (h, n) => { const s = st(h); s.soul = Math.min(NC.soul, s.soul + n); };
/* 한 대 — src 는 그 공격(시전 객체 cast · 기준 피해 base · basic 평타). 보스에게 유효 피해 10번마다 영혼 +10(보스마다 3초에 한 번) */
function strike(E, g, h, src, o, mul) {
  const prev = h.cast; h.cast = src.cast;
  try { (src.basic ? E.basic : E.strike)(g, h, o, src.base * mul); } finally { h.cast = prev; }
  if (E.dummy(o)) return;
  src.xp = 1;                                           // 유효 적중 — 허수아비는 연마 경험치를 주지 않는다
  if (!E.boss(o)) return;
  const s = st(h), k = keyOf(o), b = s.boss[k] || (s.boss[k] = { n: 0, at: -99 });
  b.n += 1;
  if (b.n >= SOUL.bossHits && g.t - b.at >= SOUL.bossGap) { b.n = 0; b.at = g.t; gainSoul(h, SOUL.boss); }
}

/* ── 경험치 ─────────────────────────────────────────── */
function jobXp(E, g, h, n) {
  const J = jobOf(h), s = st(h);
  if (J.lv >= NC.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, NC.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n;
  J.xp += n;
  let up = 0;
  while (J.lv < NC.maxLv && J.xp >= ncJobNeed(J.lv)) { J.xp -= ncJobNeed(J.lv); J.lv += 1; up = 1; }
  if (J.lv >= NC.maxLv) J.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${NECRO_NAME} 직업 레벨 ${J.lv}`, color: LIGHT, t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
}
// 연마 경험치 — 시전당 한 번(부른 쪽이 센다). i: 0 추출 · 1 지휘 · 2 군주
function trainXp(E, g, h, i, n = NC.train.cast) {
  const q = jobOf(h).tr[i];
  if (q[0] >= NC.train.max || !(n > 0)) return;
  q[1] += n;
  let up = 0;
  while (q[0] < NC.train.max && q[1] >= ncTrainNeed(q[0])) { q[1] -= ncTrainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= NC.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${NC_TRAIN_NAMES[i]} ${q[0]}`, color: LIGHT, t: 1.2, life: 1.2, who: h.pi });
}
/* 몹이 쓰러졌다(rpg.js killMob) — 처치에 기여한 그림자 군주마다 직업 경험치 · 영혼 +10(일반 몹) · 추출 가능 흔적 8초.
   흔적은 일반 몹만(E.trace — 보스 · 월드보스 · 길드보스 · 허수아비 · 소환물 제외). 그림자의 타격도 주인의 기여로 센다(hitMob 의 친 사람이 주인) */
export function necroKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? NC.xp.raid : NC.xp.boss) : NC.xp.mob;
  for (const h of got) {
    if (!necroOn(h)) continue;
    jobXp(E, g, h, n);
    if (m.boss) continue;
    gainSoul(h, SOUL.kill);
    if (!E.trace(m)) continue;
    const s = st(h);
    s.traces.push({ id: ++s.q, t: m.type, n: E.mobName(m), x: Math.round(m.x), y: Math.round(m.y), map: m.map, left: TR.life });
    if (s.traces.length > TR.max) s.traces.shift();
  }
}
export const necroRaidKill = (E, g, h) => { if (necroOn(h)) jobXp(E, g, h, NC.xp.raid); };

/* ── 쓸 수 있나 ─────────────────────────────────────── */
function why(E, g, h) {
  if (h.down > 0 || E.locked(h)) return "-";
  return E.fight(h) || "";
}
// 공통 검사 — 못 쓰면 까닭을 말하고 true. 영혼은 여기서 보기만 하고 쓰는 것은 각 스킬이 다 확인한 뒤
function blocked(E, g, h, sk) {
  const s = st(h), D = NC_SKILLS[sk], w = why(E, g, h);
  if (w) { if (w !== "-") no(E, g, h, w); return true; }
  const lock = ncLock(jobOf(h), sk);
  if (lock) { no(E, g, h, lock); return true; }
  if (s.cd[sk] > 0) { no(E, g, h, `${D.name} ${Math.ceil(s.cd[sk])}초`, WARN); return true; }
  if (s.soul < D.cost) { no(E, g, h, `영혼 ${D.cost}이 필요합니다`, RED); return true; }
  return false;
}
const pay = (E, g, h, sk) => { const s = st(h), D = NC_SKILLS[sk]; s.soul -= D.cost; s.cd[sk] = D.cd; };

/* ── 기본 공격 — 그림자 낫(근접 · 11월 17일 사용자) ─────
   s.reaps = [{ w 맞기까지, ax, ay 휘두른 쪽, cast, base, basic, map }] — wind 초 뒤 앞쪽 부채꼴 안을 한 번에 벤다 */
export function necroBasic(E, g, h, force) {
  if (!necroOn(h)) return false;
  const s = st(h), o = nearest(E, g, h, h.x, h.y, SC.reach + 20, h.map);
  if (!o && !force) return false;
  let ax, ay;
  if (o) { const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
  else [ax, ay] = E.face(h);
  if (Math.abs(ax) > 0.05) h.dir = ax < 0 ? -1 : 1;
  h.face = 0;
  s.reaps.push({ w: SC.wind, ax: r2(ax), ay: r2(ay), cast: E.cast(h, "basic"), base: E.base(h), basic: 1, map: h.map });
  E.fx(g, h.map, { kind: "sk_nc_reap", x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), r: SC.reach, pi: h.pi, t: SC.swing, life: SC.swing, snd: "ncReap" });
  return true;
}
function stepReap(E, g, h, c, dt) {
  c.w -= dt;
  if (c.w > 0) return true;
  const cosA = Math.cos(SC.arc);
  const hits = E.near(g, h, h.x, h.y, SC.reach + 60).filter((o) => E.alive(g, h, o, c.map)).map((o) => {
    const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy);
    return { o, d, dot: d > 0 ? (dx * c.ax + dy * c.ay) / d : 1 };
  }).filter((q) => q.d <= SC.reach + (q.o.rad || 16) * 0.5 && (q.d < 24 || q.dot >= cosA)).sort((a, b) => a.d - b.d).slice(0, SC.max);
  hits.forEach((q, i) => {
    strike(E, g, h, c, q.o, SC.mul);
    E.fx(g, c.map, { kind: "sk_nc_hit", x: q.o.x, y: q.o.y, pi: h.pi, t: 0.32, life: 0.32, ...(i ? {} : { snd: "ncHit" }) });
  });
  if (hits.length) gainSoul(h, SOUL.hit);               // 맞히면 영혼 +5(한 번 휘두를 때 한 번 · 허수아비도 — 연습 대상에서 스킬을 써 볼 수 있게)
  return false;
}

/* ── 흔적 추출 ───────────────────────────────────────
   s.ex = [{ t, tr 흔적, map }] — 0.5초에 명부에 등록. 등록하면 새 종류 · 재추출(승급 경험치 +1) */
function extractUse(E, g, h) {
  if (blocked(E, g, h, "extract")) return;
  const s = st(h);
  const tr = s.traces.filter((q) => q.map === h.map && sqd(E, h.x, h.y, q.x, q.y) <= EX.r).sort((a, b) => sqd(E, h.x, h.y, a.x, a.y) - sqd(E, h.x, h.y, b.x, b.y))[0];
  if (!tr) return void no(E, g, h, "가까이에 추출할 흔적이 없습니다");   // 영혼 · 대기를 쓰지 않는다
  const J = jobOf(h);
  if (!J.roster.some((q) => q.t === tr.t) && J.roster.length >= rosterSlots(J)) return void no(E, g, h, `명부가 가득 찼습니다(${rosterSlots(J)}종)`, RED);
  pay(E, g, h, "extract");
  s.traces = s.traces.filter((q) => q !== tr);
  s.ex.push({ t: 0, tr, map: h.map });
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_nc_extract", x: tr.x, y: tr.y, x1: h.x, y1: h.y, rise: EX.rise, d: EX.done, pi: h.pi, t: EX.done + 0.2, life: EX.done + 0.2, snd: "ncExtract" });
  call(E, g, h, EX.name);
}
function tickExtract(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < EX.done) return true;
  const J = jobOf(h), tr = q.tr;
  let e = J.roster.find((r) => r.t === tr.t), text;
  if (!e) {
    if (J.roster.length >= rosterSlots(J)) { no(E, g, h, "명부가 가득 찼습니다", RED); return false; }
    e = { t: tr.t, n: tr.n, g: 1, x: 0 };
    J.roster.push(e);
    text = `그림자 등록 — ${tr.n}(${NC_KINDS[kindOf(tr.t)].name})`;
  } else if (e.g >= RS.grades) text = `${tr.n} — 이미 최고 등급`;
  else {
    e.x += 1;
    const need = gradeCost(J, e.g);
    if (e.x >= need) { e.x = 0; e.g += 1; text = `${tr.n} — ${e.g}등급 승급`; }
    else text = `${tr.n} 승급 ${e.x}/${need}`;
  }
  h.bag.v = (h.bag.v || 0) + 1;
  trainXp(E, g, h, 0);                                  // 추출 연마 — 추출 성공 · 같은 종류 재추출 성공
  E.fx(g, h.map, { kind: "sk_nc_absorb", x: h.x, y: h.y, pi: h.pi, t: 0.4, life: 0.4 });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 124, text, color: LIGHT, who: h.pi, t: 1.2, life: 1.2 });
  return false;
}

/* ── 그림자 ───────────────────────────────────────────
   s.sh = [{ id, t 몹 종류, n 이름, k 종류, g 등급, x, y, dir, born 나온 뒤 초, life 남은 초, cd 다음 공격까지, atk 공격 자세 남은 초,
             tgt 노리는 대상 열쇠, prio 일제 진군 대상, first 영원의 명령 첫 그림자, walk 걸음 누적, mv 걷는 중 }] */
export const necroShadows = (h) => (h && h.nc ? h.nc.sh : h && h.ncv ? h.ncv.sh || [] : []);
const aggroOf = (J) => AI.aggro * (J && J.tr[1][0] >= AI.sp25 ? 1 + AI.aggro25 : 1);
const domainOn = (s, h, x, y, E) => !!(s.dom && sqd(E, h.x, h.y, x, y) <= DM.r);
const domainDmg = (J) => (J && J.tr[2][0] >= DM.sp50 ? DM.dmg50 : DM.dmg);
// 그림자 한 대 세기(×) — 등급 · 영역 · 영원의 명령 첫 그림자
function shadowMul(E, h, s, sd, base) {
  const J = jobOf(h);
  return base * (1 + RS.gradeDmg * (sd.g - 1)) * (domainOn(s, h, sd.x, sd.y, E) ? 1 + domainDmg(J) : 1) * (sd.first ? 1 + ET.first : 1);
}
function summonUse(E, g, h) {
  if (blocked(E, g, h, "summon")) return;
  const s = st(h), J = jobOf(h);
  const pick = J.roster.filter((q) => !(s.lock[q.t] > 0)).map((q, i) => ({ q, i })).sort((a, b) => b.q.g - a.q.g || a.i - b.i).slice(0, SM.max).map((o) => o.q);
  if (!pick.length) return void no(E, g, h, J.roster.length ? "부를 수 있는 그림자가 없습니다" : "명부에 그림자가 없습니다 — 흔적 추출로 등록하세요");
  pay(E, g, h, "summon");
  for (const sd of s.sh) E.fx(g, h.map, { kind: "sk_nc_fade", x: Math.round(sd.x), y: Math.round(sd.y), k: sd.k, dir: sd.dir, pi: h.pi, t: 0.4, life: 0.4 });
  s.sh = [];
  s.cast = E.cast(h);                                   // 소집 시전 — 이번 그림자들의 평소 공격이 모두 함께 쓴다
  s.base = E.base(h);
  const eternal = ncEternal(J);
  pick.forEach((q, i) => {
    const a = (i / pick.length) * Math.PI * 2 + 0.6, d = SM.r * (0.55 + 0.45 * ((i * 37) % 10) / 10);
    const [x, y] = inMap(E, h.map, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d * E.squash);
    s.sh.push({ id: ++s.q, t: q.t, n: q.n, k: kindOf(q.t), g: q.g, x: Math.round(x), y: Math.round(y), dir: h.dir, born: 0, life: SM.dur, cd: SM.ready - SM.rise + 0.2 * i,
      atk: 0, tgt: "", prio: "", first: eternal && i === 0 ? 1 : 0, walk: 0, mv: 0 });
  });
  h.swing = 0.3;
  E.fx(g, h.map, { kind: "sk_nc_summon", x: h.x, y: h.y, r: SM.r, n: pick.length, pi: h.pi, t: SM.ready + 0.1, life: SM.ready + 0.1, snd: "ncSummon" });
  call(E, g, h, `${SM.name} — ${pick.length}기`);
}
function moveTo(E, h, s, sd, x, y, dt, slow = 1) {
  const dx = x - sd.x, dy = (y - sd.y) / E.squash, d = Math.hypot(dx, dy);
  const v = NC_KINDS[sd.k].spd * (domainOn(s, h, sd.x, sd.y, E) ? 1 + DM.spd : 1) * slow, step = Math.min(d, v * dt);
  if (d < 1) { sd.mv = 0; return d; }
  sd.x += (dx / d) * step; sd.y += (dy / d) * step * E.squash;
  [sd.x, sd.y] = inMap(E, h.map, sd.x, sd.y);
  if (Math.abs(dx) > 2) sd.dir = dx < 0 ? -1 : 1;
  sd.walk += step; sd.mv = 1;
  return d - step;
}
function shadowAttack(E, g, h, s, sd, o, src, mul) {
  const K = NC_KINDS[sd.k];
  sd.atk = 0.42;
  if (Math.abs(o.x - sd.x) > 2) sd.dir = o.x < sd.x ? -1 : 1;
  s.blows.push({ t: 0, at: K.at, k: keyOf(o), x: o.x, y: o.y, r: K.r, sk: sd.k, mul, cast: src.cast, base: src.base, map: h.map });
  const life = K.at + 0.3;
  E.fx(g, h.map, { kind: "sk_nc_strike", x: Math.round(sd.x), y: Math.round(sd.y), x1: Math.round(o.x), y1: Math.round(o.y), sk: sd.k, d: K.at, r: K.r, dir: sd.dir, pi: h.pi, t: life, life,
    snd: K.fly ? "ncShot" : "ncSlash" });
}
function tickShadow(E, g, h, s, sd, i, dt) {
  sd.born += dt; sd.life -= dt; sd.atk = Math.max(0, sd.atk - dt);
  if (sd.life <= 0) {
    E.fx(g, h.map, { kind: "sk_nc_fade", x: Math.round(sd.x), y: Math.round(sd.y), k: sd.k, dir: sd.dir, pi: h.pi, t: 0.4, life: 0.4 });
    return false;
  }
  if (sd.born < SM.rise) return true;
  if (sd.hold > 0) { sd.hold -= dt; sd.mv = 0; return true; }
  if (sqd(E, h.x, h.y, sd.x, sd.y) > AI.leash) {        // 너무 멀다 — 주인 곁으로
    const [x, y] = inMap(E, h.map, h.x - h.dir * AI.back, h.y + (i - 2) * AI.spread * E.squash);
    E.fx(g, h.map, { kind: "sk_nc_fade", x: Math.round(sd.x), y: Math.round(sd.y), k: sd.k, dir: sd.dir, pi: h.pi, t: 0.3, life: 0.3 });
    sd.x = x; sd.y = y; sd.tgt = ""; sd.prio = "";
    return true;
  }
  sd.cd = Math.max(0, sd.cd - dt);
  const K = NC_KINDS[sd.k], aggro = aggroOf(jobOf(h));
  let o = sd.prio ? find(g, sd.prio) : null;
  if (!o || !E.alive(g, h, o, h.map)) { sd.prio = ""; o = null; }
  if (!o && sd.tgt) { o = find(g, sd.tgt); if (!o || !E.alive(g, h, o, h.map) || sq(E, h.x, h.y, o) > aggro + 120) o = null; }
  if (!o) o = nearest(E, g, h, sd.x, sd.y, aggro, h.map);
  sd.tgt = o ? keyOf(o) : "";
  if (o) {
    const reach = K.reach + (o.rad || 16) * 0.5;
    if (sq(E, sd.x, sd.y, o) > reach) { if (sd.atk <= 0) moveTo(E, h, s, sd, o.x - Math.sign(o.x - sd.x || 1) * K.reach * 0.6, o.y, dt); }
    else { sd.mv = 0; if (Math.abs(o.x - sd.x) > 2) sd.dir = o.x < sd.x ? -1 : 1; }
    if (sd.cd <= 0 && sd.atk <= 0 && sq(E, sd.x, sd.y, o) <= reach && sd.born >= SM.ready) {
      sd.cd = SM.gap;
      shadowAttack(E, g, h, s, sd, o, s, shadowMul(E, h, s, sd, SM.mul));
    }
    return true;
  }
  // 따라가기 — 주인 뒤에 줄지어
  const n = s.sh.length, off = (i - (n - 1) / 2) * AI.spread;
  const fx = h.x - h.dir * (AI.back + (i % 2) * 24), fy = h.y + off * E.squash;
  if (sqd(E, sd.x, sd.y, fx, fy) > 18) moveTo(E, h, s, sd, fx, fy, dt);
  else { sd.mv = 0; sd.dir = h.dir; }
  return true;
}
// 예약 타격 — 근접은 맞는 순간, 원거리는 날아가 닿는 순간. 범위면 그 대상 자리(이미 없으면 노린 자리) 둘레
function tickBlow(E, g, h, b, dt) {
  b.t += dt;
  if (b.t < b.at) return true;
  const o = find(g, b.k), alive = o && E.alive(g, h, o, b.map);
  const x = alive ? o.x : b.x, y = alive ? o.y : b.y;
  const list = b.r > 0 ? inCircle(E, g, h, x, y, b.r, b.map) : alive ? [o] : [];
  for (const q of list) strike(E, g, h, b, q, b.mul);
  const s = st(h);
  if (b.xp && s.dom) s.dom.hit = 1;                    // 군주 연마 — 영역 중 그림자 공격 유효 적중
  if (b.r > 0) E.fx(g, b.map, { kind: "sk_nc_pop", x: Math.round(x), y: Math.round(y), r: b.r, sk: b.sk, pi: h.pi, t: 0.4, life: 0.4, snd: b.sk === "giant" ? "ncSlam" : undefined });
  else if (list.length) E.fx(g, b.map, { kind: "sk_nc_hit", x: Math.round(x), y: Math.round(y), sm: 1, pi: h.pi, t: 0.25, life: 0.25 });
  return false;
}

/* ── 그림자 교환 ─────────────────────────────────────
   포인터에 가장 가까운 내 그림자(600 안). 0.18초에 자리를 바꾼다(피해 없음) */
function swapUse(E, g, h) {
  if (blocked(E, g, h, "swap")) return;
  const s = st(h);
  const [px, py] = h.inputPt ? h.inputPt : [h.x + h.dir * 200, h.y];
  const sd = s.sh.filter((q) => q.born >= SM.rise && sqd(E, h.x, h.y, q.x, q.y) <= SW.reach).sort((a, b) => sqd(E, px, py, a.x, a.y) - sqd(E, px, py, b.x, b.y))[0];
  if (!sd) return void no(E, g, h, s.sh.length ? "600 안에 바꿀 그림자가 없습니다" : "나와 있는 그림자가 없습니다");
  if (inBlock(E, h.map, sd.x, sd.y)) return void no(E, g, h, "그 자리로 갈 수 없습니다");
  pay(E, g, h, "swap");
  sd.hold = SW.at + 0.05;                               // 바꿀 때까지 그 자리에 선다(세로선이 그 자리에서 솟는다)
  s.swaps.push({ t: 0, id: sd.id, map: h.map });
  E.fx(g, h.map, { kind: "sk_nc_swap", x: Math.round(h.x), y: Math.round(h.y), x1: Math.round(sd.x), y1: Math.round(sd.y), d: SW.at, l: SW.lines, pi: h.pi, t: SW.at + 0.3, life: SW.at + 0.3, snd: "ncSwap" });
  call(E, g, h, SW.name);
}
function tickSwap(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < SW.at) return true;
  const s = st(h), sd = s.sh.find((o) => o.id === q.id);
  if (!sd || inBlock(E, h.map, sd.x, sd.y) || h.down > 0) return false;   // 그 사이 사라졌으면 바꾸지 않는다(영혼 · 대기는 이미 썼다)
  const hx = h.x, hy = h.y;
  h.x = sd.x; h.y = sd.y; sd.x = hx; sd.y = hy;
  if (E.stop) E.stop(h);
  return false;
}

/* ── 군주의 영역 ─────────────────────────────────────
   s.dom = { t, dur, hT, hit 이번 영역 중 그림자 공격이 맞았나 } — 나를 따라다닌다 */
const domainDur = (J) => (J && J.tr[2][0] >= DM.sp25 ? DM.dur25 : DM.dur);
function domainUse(E, g, h) {
  if (blocked(E, g, h, "domain")) return;
  const s = st(h);
  pay(E, g, h, "domain");
  if (s.dom) endDomain(E, g, h, true);
  s.dom = { t: 0, dur: domainDur(jobOf(h)), hT: DM.hint, hit: 0 };
  E.fx(g, h.map, { kind: "sk_nc_domain", x: h.x, y: h.y, r: DM.r, u: 0, start: 1, d: DM.open, pi: h.pi, t: DM.hint + 0.5, life: DM.hint + 0.5, snd: "ncDomain" });
  call(E, g, h, DM.name);
}
function endDomain(E, g, h, quiet) {
  const s = h.nc, d = s && s.dom;
  if (!d) return;
  s.dom = null;
  if (d.hit) trainXp(E, g, h, 2);                       // 군주 연마 — 영역 중 그림자 공격 적중(영역 하나에 한 번)
  if (!quiet) E.fx(g, h.map, { kind: "sk_nc_domainend", x: h.x, y: h.y, r: DM.r, pi: h.pi, t: 0.45, life: 0.45 });
}
function tickDomain(E, g, h, s, dt) {
  const d = s.dom;
  d.t += dt;
  if (d.t >= d.dur) return void endDomain(E, g, h);
  if ((d.hT -= dt) <= 0) {
    d.hT = DM.hint;
    E.fx(g, h.map, { kind: "sk_nc_domain", x: h.x, y: h.y, r: DM.r, u: r2(d.t / d.dur), pi: h.pi, t: DM.hint + 0.5, life: DM.hint + 0.5 });
  }
}

/* ── 일제 진군 ───────────────────────────────────────
   550 안의 지점에서 가장 가까운 적 하나. 나와 있는 그림자가 차례로(0.30~0.65초) 달려가 친다 */
function marchUse(E, g, h) {
  if (blocked(E, g, h, "march")) return;
  const s = st(h), live = s.sh.filter((q) => q.born >= SM.rise);
  if (!live.length) return void no(E, g, h, "나와 있는 그림자가 없습니다");
  const [x, y] = pointAt(E, g, h, MC.reach, MC.near);
  const o = nearest(E, g, h, x, y, MC.reach, h.map);
  if (!o || sq(E, h.x, h.y, o) > MC.reach + 80) return void no(E, g, h, "명령할 대상이 없습니다");
  pay(E, g, h, "march");
  const J = jobOf(h), mc = { cast: E.cast(h), base: E.base(h), xp: 0, k: keyOf(o), t: 0, n: live.length, ids: live.map((q) => q.id), done: 0, map: h.map };
  for (const sd of live) { sd.prio = mc.k; sd.tgt = mc.k; }
  mc.mul = J.tr[1][0] >= MC.sp50 ? MC.mul50 : MC.mul;
  s.marches.push(mc);
  E.fx(g, h.map, { kind: "sk_nc_mark", x: Math.round(o.x), y: Math.round(o.y), k: mc.k, pi: h.pi, t: MC.last + 0.35, life: MC.last + 0.35, snd: "ncMarch" });
  call(E, g, h, `${MC.name} — ${live.length}기`);
}
function tickMarch(E, g, h, mc, dt) {
  mc.t += dt;
  const s = st(h), o = find(g, mc.k), alive = o && E.alive(g, h, o, mc.map);
  const live = mc.ids.map((id) => s.sh.find((q) => q.id === id)).filter(Boolean);
  // 0.15초부터 그림자들이 대상 쪽으로 달려간다(판정은 그림자 자리와 상관없이 시각대로 — 기획안 "충돌 순서대로")
  if (alive && mc.t >= MC.turn) for (const sd of live) { if (sq(E, sd.x, sd.y, o) > NC_KINDS[sd.k].reach) moveTo(E, h, s, sd, o.x - Math.sign(o.x - sd.x || 1) * 40, o.y, dt, 2.2); }
  const n = mc.n, span = n > 1 ? (MC.last - MC.first) / (n - 1) : 0;
  while (mc.done < n && mc.t >= MC.first + mc.done * span) {
    const sd = live.find((q) => q.id === mc.ids[mc.done]);
    mc.done += 1;
    if (!sd || !alive) continue;                        // 그 사이 사라진 그림자 · 대상 — 그 몫은 헛친다
    strike(E, g, h, mc, o, shadowMul(E, h, s, sd, mc.mul));
    sd.atk = 0.3; sd.cd = Math.max(sd.cd, 0.6);
    if (Math.abs(o.x - sd.x) > 2) sd.dir = o.x < sd.x ? -1 : 1;
    E.fx(g, mc.map, { kind: "sk_nc_hit", x: Math.round(o.x + (mc.done - 3) * 6), y: Math.round(o.y), pi: h.pi, t: 0.3, life: 0.3, snd: "ncSlash" });
  }
  if (mc.done < n) return true;
  if (mc.xp) trainXp(E, g, h, 1);                       // 지휘 연마 — 명령한 그림자가 유효 적중(시전당 한 번)
  return false;
}

/* ── 영혼 소각 ───────────────────────────────────────
   나와 있는 그림자를 모두(최대 5기) 겨눈 자리로 돌진시켜 터뜨린다. 반경 280 · 1기당 ×15. 쓴 종류는 8초 동안 다시 부르지 못한다 */
function burnUse(E, g, h) {
  if (blocked(E, g, h, "burn")) return;
  const s = st(h), live = s.sh.filter((q) => q.born >= SM.rise).slice(0, SM.max);
  if (!live.length) return void no(E, g, h, "나와 있는 그림자가 없습니다");
  pay(E, g, h, "burn");
  const [x, y] = pointAt(E, g, h, BN.reach, BN.near);
  const bn = { t: 0, x, y, n: live.length, done: 0, cast: E.cast(h), base: E.base(h), xp: 0, map: h.map,
    from: live.map((q) => [Math.round(q.x), Math.round(q.y), q.k, q.dir]) };
  for (const sd of live) s.lock[sd.t] = BN.lock;
  s.sh = s.sh.filter((q) => !live.includes(q));
  s.burns.push(bn);
  E.fx(g, h.map, { kind: "sk_nc_burn", x, y, r: BN.r, from: bn.from, d: BN.dash, boom: BN.boom, gap: BN.gap, pi: h.pi, t: BN.boom + BN.gap * bn.n + 0.5, life: BN.boom + BN.gap * bn.n + 0.5, snd: "ncCrack" });
  call(E, g, h, `${BN.name} — ${live.length}기`);
}
function tickBurn(E, g, h, bn, dt) {
  bn.t += dt;
  while (bn.done < bn.n && bn.t >= BN.boom + bn.done * BN.gap) {
    bn.done += 1;
    for (const o of inCircle(E, g, h, bn.x, bn.y, BN.r, bn.map)) strike(E, g, h, bn, o, BN.mul);
    g.shake = Math.max(g.shake || 0, 0.2);
  }
  if (bn.done < bn.n) return true;
  if (bn.xp) trainXp(E, g, h, 2);                       // 군주 연마 — 영혼 소각 유효 적중
  return false;
}

/* ── 무명의 군세 ─────────────────────────────────────
   s.legions = [{ t, i 파동 수, x, y, cast(sid "ult"), base, map, xp, sp 가시 연출을 냈나 }] */
function legionUse(E, g, h) {
  if (blocked(E, g, h, "legion")) return;
  const s = st(h);
  pay(E, g, h, "legion");
  const [x, y] = pointAt(E, g, h, LG.reach, LG.near);
  s.legions.push({ t: 0, i: 0, x, y, cast: E.cast(h, "ult"), base: E.base(h), map: h.map, xp: 0, end: ncEternal(jobOf(h)) ? LG.endMul150 : LG.endMul });
  h.swing = 0.4;
  const life = LG.end + LG.tail;
  E.fx(g, h.map, { kind: "sk_nc_legion", x, y, x0: Math.round(h.x), y0: Math.round(h.y), dir: h.dir, r: LG.r, n: LG.waves, sigil: LG.sigil, first: LG.first, gap: LG.gap, spike: LG.spike, end: LG.end,
    pi: h.pi, t: life, life, snd: "ncLegion" });
  call(E, g, h, LG.name);
}
function tickLegion(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < LG.waves && q.t >= LG.first + q.i * LG.gap) {
    q.i += 1;
    for (const o of inCircle(E, g, h, q.x, q.y, LG.r, q.map)) strike(E, g, h, q, o, LG.mul);
    g.shake = Math.max(g.shake || 0, 0.1);
  }
  if (q.t < LG.end) return true;
  for (const o of inCircle(E, g, h, q.x, q.y, LG.r, q.map)) strike(E, g, h, q, o, q.end);
  g.shake = Math.max(g.shake || 0, 0.45);
  E.fx(g, q.map, { kind: "sk_nc_legionend", x: q.x, y: q.y, r: LG.r, pi: h.pi, t: 0.8, life: 0.8, snd: "ncBoom" });
  E.fx(g, q.map, { kind: "call", x: q.x, y: q.y - 120, text: `${LG.name} — ×${q.end}`, color: LIGHT, who: h.pi, t: 1.1, life: 1.1 });
  return false;
}

/* ── 입력 — req = { op: "use", s: "extract" | "summon" | "swap" | "domain" | "march" | "burn" | "legion" } ── */
const USE = { extract: extractUse, summon: summonUse, swap: swapUse, domain: domainUse, march: marchUse, burn: burnUse, legion: legionUse };
export function necroInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object" || !necroOn(h)) return false;
  if (req.op === "use" && Object.prototype.hasOwnProperty.call(USE, req.s)) USE[req.s](E, g, h);
  return false;
}

/* ── 시간 ─────────────────────────────────────────── */
export function tickNecro(E, g, h, dt) {
  if (!necroOn(h)) { if (h.nc) h.nc = null; return; }
  const s = st(h);
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  for (const k in s.lock) { s.lock[k] -= dt; if (s.lock[k] <= 0) delete s.lock[k]; }
  const here = (q) => q.map === h.map;                  // 맵을 옮기면 남은 것은 걷는다
  s.traces = s.traces.filter((q) => (q.left -= dt) > 0);
  if (s.sh.length && h.down > 0) s.sh = [];
  s.reaps = s.reaps.filter((c) => here(c) && stepReap(E, g, h, c, dt));
  s.ex = s.ex.filter((q) => here(q) && tickExtract(E, g, h, q, dt));
  s.swaps = s.swaps.filter((q) => here(q) && tickSwap(E, g, h, q, dt));
  if (s.sh.length && s.shMap && s.shMap !== h.map) s.sh = [];   // 맵이 바뀌면 그림자를 곧바로 치운다
  s.shMap = h.map;
  s.sh = s.sh.filter((sd, i) => tickShadow(E, g, h, s, sd, i, dt));
  s.blows = s.blows.filter((q) => here(q) && tickBlow(E, g, h, q, dt));
  s.marches = s.marches.filter((q) => here(q) && tickMarch(E, g, h, q, dt));
  s.burns = s.burns.filter((q) => here(q) && tickBurn(E, g, h, q, dt));
  s.legions = s.legions.filter((q) => here(q) && tickLegion(E, g, h, q, dt));
  if (s.dom) tickDomain(E, g, h, s, dt);
}
// 쓰러졌다 — 그림자 · 영역을 걷고 영혼을 비운다(정한 값). 이미 휘두른 낫 · 예약 타격은 그대로 간다
export function necroDown(E, g, h) {
  if (!necroOn(h) || !h.nc) return;
  const s = h.nc;
  for (const sd of s.sh) E.fx(g, h.map, { kind: "sk_nc_fade", x: Math.round(sd.x), y: Math.round(sd.y), k: sd.k, dir: sd.dir, pi: h.pi, t: 0.4, life: 0.4 });
  s.sh = [];
  if (s.dom) endDomain(E, g, h);
  s.soul = 0;
}
// 훈련장 · 연습장 "스택 가득" — 영혼을 100까지
export function necroFill(h) { if (necroOn(h)) st(h).soul = NC.soul; }
// 연습장 — 명부를 grade 등급으로 채운다(그림자 종류 다섯을 하나씩 · 몹 이름 nameOf). 저장하지 않는 연습장에서만 쓴다
export function necroFillRoster(h, grade, nameOf) {
  if (!necroOn(h)) return;
  const J = jobOf(h), want = [["goblin", "knight"], ["wolf", "assassin"], ["skeletal", "archer"], ["necro", "caster"], ["ogre", "giant"]];
  for (const [t] of want) {
    const e = J.roster.find((q) => q.t === t);
    if (e) e.g = clampN(grade, 1, RS.grades);
    else if (J.roster.length < rosterSlots(J)) J.roster.push({ t, n: nameOf ? nameOf(t) : t, g: clampN(grade, 1, RS.grades), x: 0 });
  }
}

/* ── 화면 값 — 영혼 · 직업 레벨 · 연마 · 대기 · 명부 · 흔적 · 그림자. 지금은 판정 세계(연습장)만 — 손님 화면 값(h.ncv)은 실제 게임에 넣을 때 스냅샷 줄과 함께 ── */
export function necroView(h) {
  if (!h) return null;
  if (h.ncv) return h.ncv;
  if (!necroOn(h)) return null;
  const J = jobOf(h), s = h.nc;
  return { soul: s ? s.soul : 0, max: NC.soul, lv: J.lv, xp: J.xp, tr: J.tr, roster: J.roster, slots: rosterSlots(J),
    cd: s ? { ...s.cd } : { ...NO_CD }, cdMax: Object.fromEntries(Object.entries(NC_SKILLS).map(([k, v]) => [k, v.cd])),
    sh: s ? s.sh : [], traces: s ? s.traces.filter((q) => q.map === h.map) : [], dom: s && s.dom ? r1(Math.max(0, s.dom.dur - s.dom.t)) : 0,
    lock: s ? { ...s.lock } : {}, eternal: ncEternal(J), tint: necroTint(ncTrainSum(J)), costs: Object.fromEntries(Object.entries(NC_SKILLS).map(([k, v]) => [k, v.cost])) };
}
