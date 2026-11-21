/* ── 히든 직업 Engineer 003(엔지니어) 판정 — 전력 · 과열 · 설치물 · 스킬 8종(11월 17일) ─────────────
   수치는 engineerData.js. 판정 쪽(방장 · 전용 서버 꼴)만 셈한다. 화면은 연출(fx)과 engineerView 값만 그린다.
   11월 17일 사용자 결정 — 해금 경로 없이 격자 연습장에만(ENGINEER.live = false). 저장 · 관리자 명령어도 아직 없다.
   피해는 기존 strikeAny · 평타 판정을 거쳐 결투 시전별 상한 · 사냥터 PvP 상한이 그대로 걸린다.
   한 기계의 모든 공격은 그 기계를 놓은 시전 객체를 함께 쓴다(오버클럭이 상한을 새로 열지 않는다).
   켜는 꼴은 Gambler 002 와 같은 bag.hj = { active: "engineer", jobs: { engineer: { lv, xp, tr } }, version: 1 }.
   싸우는 동안의 상태 h.en — 전력 · 과열 · 대기 · 설치물 · 날아가는 펄스 · 예고 중인 스킬. 저장하지 않는다(스냅샷으로만 이어받는다).
   E(엔진, rpg.js engineerEngine): gamblerEngine 것 + keep(맵 안으로) · open(막힌 곳이 아닌가) */
import { faceAim } from './faceDir.js';
import { ENGINEER as EN, ENGINEER_ID, ENGINEER_NAME, ENGINEER_TINT, EN_TRAIN_NAMES, EN_PULSE as PU, EN_TURRET as TU, EN_DRONE as DR,
  EN_MAGNET as MG, EN_RAIL as RL, EN_MECH as MC, EN_OC as OC, EN_ORBIT as OB, EN_SKILLS, EN_UNIT } from "./engineerData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const TEXT = "#CFEFF3", DIM = "#c9d6d0", WARN = "#f0dcb4", RED = "#ff8a8a";

/* ── 직업 칸 ───────────────────────────────────────── */
export const enJobNeed = (lv) => EN.xp.base + EN.xp.per * lv;
export const enTrainNeed = (l) => EN.train.base + EN.train.per * l;
export function cleanEnJob(d) {
  d = d && typeof d === "object" ? d : {};
  const lv = clampN(d.lv, 1, EN.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, EN.train.max);
    return [l, l >= EN.train.max ? 0 : clampN(q[1], 0, enTrainNeed(l) - 1)];
  });
  return { lv, xp: lv >= EN.maxLv ? 0 : clampN(d.xp, 0, enJobNeed(lv) - 1), tr };
}
// 이 직업인가 — 가방 값으로만 본다. ENGINEER.live 가 false 면 격자 연습장 맵에서만 켜진다
export const engineerOn = (h) => !!(h && h.bag && h.bag.hj && h.bag.hj.active === ENGINEER_ID && h.bag.hj.jobs && h.bag.hj.jobs[ENGINEER_ID] && (EN.live || h.map === "sandbox"));
// 그림 · 화면 — 손님은 스냅샷 값(h.env)도 본다
export const engineerLook = (h) => !!(h && (h.env || engineerOn(h)));
const jobOf = (h) => h.bag.hj.jobs[ENGINEER_ID];
export const enTrainSum = (J) => (J ? J.tr.reduce((n, q) => n + q[0], 0) : 0);
export const engineerTint = (sum) => ENGINEER_TINT.find((t) => sum >= t.from).id;
export const enCentral = (J) => enTrainSum(J) >= EN.central;   // 중앙 제어 — 연마 합계 150
export const enLock = (J, sk) => (!J ? "잠김" : J.lv < EN.unlock[sk] ? `직업 레벨 ${EN.unlock[sk]}에 열립니다` : "");
// 연마로 바뀌는 값
export const turretRange = (J) => TU.range * (J && J.tr[0][0] >= TU.sp25 ? 1 + TU.range25 : 1);
export const turretMax = (J) => (J && J.tr[0][0] >= TU.sp50 ? TU.max50 : TU.max);
export const unitCap = (J) => (J && J.tr[0][0] >= TU.sp50 ? EN.units50 : EN.units);
export const droneMul = (J) => (J && J.tr[1][0] >= DR.sp50 ? DR.mul50 : DR.mul);
export const droneSpd = (J) => DR.spd * (J && J.tr[1][0] >= DR.sp25 ? 1 + DR.spd25 : 1);
export const railWidth = (J) => RL.w * (J && J.tr[2][0] >= RL.sp25 ? 1 + RL.w25 : 1);
export const heatRate = (J) => (J && J.tr[2][0] >= OC.sp50 ? OC.heat50 : OC.heat);

/* 켜기 — 1차 전직 · BLOOD-001 · 다른 히든 직업과 함께 쓰지 못한다(한 번에 하나). 든 무기는 내려놓는다(지우지 않는다).
   init 이 있으면 그 레벨 · 연마로(연습장) */
export function unlockEngineer(h, init) {
  const old = h.bag.hj && h.bag.hj.jobs ? h.bag.hj.jobs : {};
  h.bag.hj = { active: ENGINEER_ID, jobs: { ...old, [ENGINEER_ID]: cleanEnJob(init || old[ENGINEER_ID]) }, version: 1 };
  h.env = null; h.gm = null; h.gmv = null;
  if (h.bag.bd && h.bag.bd.on) h.bag.bd = { ...h.bag.bd, on: 0 };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null;
  h.bag.e = 0;
  h.en = null;
  h.bag.v = (h.bag.v || 0) + 1;
}
export function dropEngineer(h) {
  if (!h.bag || !h.bag.hj || h.bag.hj.active !== ENGINEER_ID) return;
  h.bag.hj = { ...h.bag.hj, active: "" };
  h.en = null; h.env = null;
  h.bag.v = (h.bag.v || 0) + 1;
}

/* ── 싸우는 동안의 상태 h.en ───────────────────────── */
const NO_CD = { turret: 0, drone: 0, magnet: 0, rail: 0, mech: 0, oc: 0, orbit: 0 };
function st(h) {
  return h.en || (h.en = { power: EN.powerStart, heat: 0, oc: 0, ocT: 0, ocXp: 0, lock: 0, cd: { ...NO_CD }, units: [], pulses: [], mag: [], rail: [], orb: [], xm: [0, 0], q: 0, uid: 0 });
}
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
const no = (E, g, h, text, color = DIM) => void E.say(g, h.map, h.x, h.y - 90, text, color);
const call = (E, g, h, text, color = TEXT) => E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text, color, who: h.pi, t: 0.7, life: 0.7 });
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 탄 · 지점 스킬이 벽 너머로 가지 않는다
function wallCut(E, h, ax, ay, len, x0 = h.x, y0 = h.y) {
  let cut = len;
  for (const b of E.blocks(h.map)) {
    const dx = b.x - x0, dy = (b.y - y0) / E.squash, along = dx * ax + dy * ay;
    if (along <= 0 || along > cut) continue;
    const side = Math.abs(dx * ay - dy * ax), r = b.r + 4;
    if (side > r) continue;
    cut = Math.min(cut, Math.max(0, along - Math.sqrt(r * r - side * side)));
  }
  return cut;
}
const foes = (E, g, h, x, y, R, map) => E.near(g, h, x, y, R + 60).filter((o) => E.alive(g, h, o, map) && sq(E, x, y, o) - (o.rad || 16) * 0.5 <= R);
const nearest = (E, g, h, x, y, R, map) => foes(E, g, h, x, y, R, map).sort((a, b) => sq(E, x, y, a) - sq(E, x, y, b))[0] || null;
// 지점 스킬이 떨어질 자리 — 포인터 자리(reach 밖이면 reach 로 줄인다) · 없으면 가까운 적 · 없으면 보는 쪽 near
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
// 조준 방향 — 포인터 쪽 · 없으면 가까운 적 · 없으면 보는 쪽
function aimDir(E, g, h, range) {
  let dx, dy;
  if (h.inputPt) { dx = h.inputPt[0] - h.x; dy = (h.inputPt[1] - h.y) / E.squash; }
  else { const o = nearest(E, g, h, h.x, h.y, range, h.map); if (o) { dx = o.x - h.x; dy = (o.y - h.y) / E.squash; } else [dx, dy] = E.face(h); }
  const d = Math.hypot(dx, dy) || 1, ax = dx / d, ay = dy / d;
  if (Math.abs(ax) > 0.05) h.dir = ax < 0 ? -1 : 1;
  return [ax, ay];
}

/* ── 한 대 — src 는 그 공격(시전 객체 cast · 기준 피해 base · basic 평타) ── */
function strike(E, g, h, src, o, mul) {
  const prev = h.cast; h.cast = src.cast;
  try { (src.basic ? E.basic : E.strike)(g, h, o, src.base * mul); } finally { h.cast = prev; }
  if (!E.dummy(o)) src.xp = 1;                         // 유효 적중 — 훈련용 대상은 연마 경험치를 주지 않는다
}
// 기계 피해 배율 — 중앙 제어면 오버클럭 중 +50%(과열 잠김이면 오버클럭이 이미 꺼져 있다)
const unitBoost = (h, s) => (s.oc > 0 && enCentral(jobOf(h)) ? 1 + OC.central : 1);
const unitSpeed = (s) => (s.oc > 0 ? OC.spd : 1);

/* ── 경험치 ─────────────────────────────────────────── */
function jobXp(E, g, h, n) {
  const J = jobOf(h), s = st(h);
  if (J.lv >= EN.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, EN.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n; J.xp += n;
  let up = 0;
  while (J.lv < EN.maxLv && J.xp >= enJobNeed(J.lv)) { J.xp -= enJobNeed(J.lv); J.lv += 1; up = 1; }
  if (J.lv >= EN.maxLv) J.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${ENGINEER_NAME} 직업 레벨 ${J.lv}`, color: TEXT, t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
}
// 연마 경험치 — 시전당 한 번(부른 쪽이 센다). i: 0 포탑 · 1 드론 · 2 동기화
function trainXp(E, g, h, i, n = EN.train.cast) {
  const q = jobOf(h).tr[i];
  if (q[0] >= EN.train.max || !(n > 0)) return;
  q[1] += n;
  let up = 0;
  while (q[0] < EN.train.max && q[1] >= enTrainNeed(q[0])) { q[1] -= enTrainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= EN.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${EN_TRAIN_NAMES[i]} ${q[0]}`, color: TEXT, t: 1.2, life: 1.2, who: h.pi });
}
export function engineerKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? EN.xp.raid : EN.xp.boss) : EN.xp.mob;
  for (const h of got) if (engineerOn(h)) jobXp(E, g, h, n);
}
export const engineerRaidKill = (E, g, h) => { if (engineerOn(h)) jobXp(E, g, h, EN.xp.raid); };

/* ── 쓸 수 있나 ─────────────────────────────────────── */
function blocked(E, g, h, sk) {
  const s = st(h), D = EN_SKILLS[sk];
  if (h.down > 0 || E.locked(h)) return true;
  const w = E.fight(h);
  if (w) { if (w !== "-") no(E, g, h, w); return true; }
  const lock = enLock(jobOf(h), sk);
  if (lock) { no(E, g, h, lock); return true; }
  if (s.cd[sk] > 0) { no(E, g, h, `${D.name} ${Math.ceil(s.cd[sk])}초`, WARN); return true; }
  if (s.power < D.cost) { no(E, g, h, `전력이 부족합니다 (${D.cost})`, RED); return true; }
  return false;
}
const spend = (s, sk) => { s.power = Math.max(0, s.power - EN_SKILLS[sk].cost); };

/* ── 기본 공격 — 펄스 발진 ───────────────────────────
   s.pulses = [{ fid, x, y 시작, ax, ay, d 지난 거리, max 벽까지, v, wait, cast, base, basic, map }] */
export function engineerBasic(E, g, h, force) {
  if (!engineerOn(h)) return false;
  const s = st(h);
  const o = nearest(E, g, h, h.x, h.y, PU.range, h.map);
  if (!o && !force) return false;
  let ax, ay;
  if (o) { const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
  else [ax, ay] = E.face(h);
  faceAim(h, ax, ay);                              // 치는 쪽을 본다(예전엔 늘 앞)
  const p = { fid: `ep${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), d: 0, max: wallCut(E, h, ax, ay, PU.range), v: PU.v, wait: PU.wind,
    cast: E.cast(h, "basic"), base: E.base(h), basic: 1, map: h.map };
  s.pulses.push(p);
  const life = PU.wind + p.max / p.v + 0.1;
  E.fx(g, h.map, { kind: "sk_en_pulse", x: h.x, y: h.y, x0: h.x, y0: h.y - EN.lift, ax: p.ax, ay: p.ay, len: p.max, v: p.v, d: PU.wind, fid: p.fid, pi: h.pi, t: life, life, snd: "enPulse" });
  return true;
}
function stepPulse(E, g, h, c, dt) {
  if (c.wait > 0) { c.wait -= dt; if (c.wait > 0) return true; dt = -c.wait; }
  const from = c.d, to = Math.min(c.max, c.d + c.v * dt);
  c.d = to;
  const hit = E.near(g, h, c.x, c.y, to + 60).filter((o) => E.alive(g, h, o, c.map)).map((o) => {
    const dx = o.x - c.x, dy = (o.y - c.y) / E.squash;
    return { o, along: dx * c.ax + dy * c.ay, side: Math.abs(dx * c.ay - dy * c.ax) };
  }).filter((q) => q.along >= from - 20 && q.along <= to + 4 && q.side <= PU.dia / 2 + (q.o.rad || 16) * 0.5).sort((a, b) => a.along - b.along)[0];
  if (!hit) return c.d < c.max;
  const o = hit.o, s = st(h);
  strike(E, g, h, c, o, PU.mul);
  s.power = Math.min(EN.power, s.power + PU.gain);     // 유효 적중 — 공격 한 번에 한 번(기계 공격은 전력을 주지 않는다)
  E.fx(g, c.map, { kind: "cut", ref: c.fid });
  E.fx(g, c.map, { kind: "sk_en_hit", x: o.x, y: o.y, pi: h.pi, t: 0.3, life: 0.3, snd: "enHit" });
  return false;
}

/* ── 설치물 ───────────────────────────────────────────
   s.units = [{ id, k 종류, x, y, t 나이, dur, n 쏜 수, cd 다음 공격까지, tg 목표 키, seek, a 겨눈 각, f 마지막 공격 뒤 초, cast, base, map, xp,
                드론: slot · ph 순찰 각 · hz 높이 · 수호자: mv 걷는 중 } */
const countOf = (s, k) => s.units.filter((u) => u.k === k).length;
// 하나 더 놓을 자리 — 같은 종류가 상한이면 그 종류에서, 합계가 상한이면 전체에서 가장 오래된 것을 걷는다(정한 해석)
function makeRoom(E, g, h, s, k, max) {
  const J = jobOf(h);
  while (countOf(s, k) >= max) removeUnit(E, g, h, s, s.units.find((u) => u.k === k), "swap");
  while (s.units.length >= unitCap(J)) removeUnit(E, g, h, s, s.units[0], "swap");
}
function removeUnit(E, g, h, s, u, why) {
  if (!u) return;
  s.units = s.units.filter((q) => q !== u);
  // 포탑 · 수호자 → 포탑 연마, 드론 → 드론 연마. 시전당 한 번 — 드론 둘은 시전 객체 하나를 함께 쓰니 거기에 적는다
  if (u.xp && why !== "down" && why !== "map" && !u.cast.enXp) { u.cast.enXp = 1; trainXp(E, g, h, u.k === "drone" ? 1 : 0); }
  if (why === "map" || (why === "time" && u.k !== "drone")) return;   // 터렛은 몸이 이미 접혔고 수호자는 끝 폭발이 대신한다
  E.fx(g, u.map, { kind: "sk_en_fold", x: Math.round(u.x), y: Math.round(u.y), k: EN_UNIT[u.k], hz: u.hz || 0, pi: h.pi, t: 0.4, life: 0.4 });
}
// 막힌 곳이면 시전자 쪽으로 물러선다 · 맵 안으로
function settle(E, h, x, y) {
  const p = { x, y };
  for (let i = 0; i < 12 && !E.open(p.x, p.y, h.map); i++) { p.x += (h.x - p.x) * 0.2; p.y += (h.y - p.y) * 0.2; }
  E.keep(p, h.map);
  return [Math.round(p.x), Math.round(p.y)];
}
// 목표 — 지금 목표가 살아 있고 사거리 안이면 그대로(보스는 놓지 않는다), 아니면 0.2초마다 가장 가까운 적
function target(E, g, h, u, x, y, R) {
  let o = u.tg ? find(g, u.tg) : null;
  if (o && (!E.alive(g, h, o, u.map) || sq(E, x, y, o) - (o.rad || 16) * 0.5 > R)) { o = null; u.tg = ""; }
  if (o && E.boss(o)) return o;
  if (u.seek > 0) return o;
  u.seek = EN.seek;
  const n = nearest(E, g, h, x, y, R, u.map);
  if (n) u.tg = keyOf(n);
  return n || o;
}
function turretUse(E, g, h) {
  if (blocked(E, g, h, "turret")) return;
  const s = st(h), J = jobOf(h);
  let [x, y] = pointAt(E, g, h, TU.reach, TU.near);
  [x, y] = settle(E, h, x, y);
  makeRoom(E, g, h, s, "turret", turretMax(J));
  spend(s, "turret"); s.cd.turret = TU.cd;
  s.units.push({ id: ++s.uid, k: "turret", x, y, t: 0, dur: TU.dur, n: 0, cd: 0, tg: "", seek: 0, a: h.dir < 0 ? Math.PI : 0, f: 9, cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_en_place", x, y, pi: h.pi, t: 0.45, life: 0.45, snd: "enBuild" });
  call(E, g, h, TU.name);
}
function droneUse(E, g, h) {
  if (blocked(E, g, h, "drone")) return;
  const s = st(h);
  // 드론 둘은 한 번에 — 이미 있으면 둘 다 바꾼다(같은 종류 상한 2)
  makeRoom(E, g, h, s, "drone", DR.max - DR.n + 1);
  while (s.units.length + DR.n > unitCap(jobOf(h))) removeUnit(E, g, h, s, s.units[0], "swap");
  spend(s, "drone"); s.cd.drone = DR.cd;
  const cast = E.cast(h), base = E.base(h), ids = [++s.uid, ++s.uid];
  DR.orbit.slice(0, DR.n).forEach((o, i) => {
    const [cx, hz] = o, x = h.x + cx * (h.dir < 0 ? -1 : 1), y = h.y;
    s.units.push({ id: ids[i], k: "drone", slot: i, ph: i * Math.PI, x, y, hz: -hz, t: 0, dur: DR.dur, n: 0, cd: DR.appear + i * 0.5, tg: "", seek: 0,
      a: 0, f: 9, cast, base, map: h.map, xp: 0 });
    E.fx(g, h.map, { kind: "sk_en_hexsum", x: Math.round(x), y: Math.round(y), pi: h.pi, t: 0.5, life: 0.5, snd: i ? undefined : "enDrone" });
  });
  call(E, g, h, DR.name);
}
function mechUse(E, g, h) {
  if (blocked(E, g, h, "mech")) return;
  const s = st(h);
  makeRoom(E, g, h, s, "mech", MC.max);
  spend(s, "mech"); s.cd.mech = MC.cd;
  const [x, y] = settle(E, h, h.x + (h.dir < 0 ? -1 : 1) * 70, h.y + 6);
  s.units.push({ id: ++s.uid, k: "mech", x, y, t: 0, dur: MC.dur, n: 0, cd: 0, tg: "", seek: 0, a: h.dir < 0 ? Math.PI : 0, f: 9, mv: 0, cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  E.fx(g, h.map, { kind: "sk_en_pad", x, y, d: MC.land, pi: h.pi, t: MC.land + 0.5, life: MC.land + 0.5, snd: "enBuild" });
  call(E, g, h, MC.name);
}
// 한 기계의 공격 — 오버클럭 중이면 2배 빠르다. 오버클럭 중 명중은 동기화 연마(그 오버클럭 한 번에 한 번)
function unitHit(E, g, h, s, u, o, mul) {
  strike(E, g, h, u, o, mul * unitBoost(h, s));
  if (s.oc > 0 && !E.dummy(o)) s.ocXp = 1;
}
function tickTurret(E, g, h, s, u, dt) {
  if (u.t < TU.ready || u.n >= TU.shots) return;
  u.cd -= dt * unitSpeed(s);
  const R = turretRange(jobOf(h)), o = target(E, g, h, u, u.x, u.y, R);
  if (o) u.a = Math.atan2((o.y - u.y) / E.squash, o.x - u.x);
  if (!o || u.cd > 0) return;
  u.cd = TU.gap; u.n += 1; u.f = 0;
  // 작은 레일포 — 겨눈 적 쪽으로 사거리 끝까지(벽 앞에서 멈춤) 관통
  const dx = o.x - u.x, dy = (o.y - u.y) / E.squash, d = Math.hypot(dx, dy) || 1, ax = dx / d, ay = dy / d;
  const len = wallCut(E, h, ax, ay, R, u.x, u.y);
  for (const m of onLine(E, g, h, u.x, u.y, ax, ay, len, TU.railW, u.map)) unitHit(E, g, h, s, u, m, TU.mul);
  E.fx(g, u.map, { kind: "sk_en_mrail", x: Math.round(u.x), y: Math.round(u.y), x0: Math.round(u.x), y0: Math.round(u.y), ax: r2(ax), ay: r2(ay), len: Math.round(len), w: TU.railW, d: 0, a: r2(u.a),
    pi: h.pi, oc: s.oc > 0 ? 1 : 0, t: TU.railLife, life: TU.railLife, snd: "enZap" });
}
function tickDrone(E, g, h, s, u, dt) {
  const J = jobOf(h), o0 = DR.orbit[u.slot] || DR.orbit[0], spd = droneSpd(J), side = h.dir < 0 ? -1 : 1;
  u.ph += dt * Math.PI * 2 / o0[3] * (spd / DR.spd);
  const wx = h.x + o0[0] * side + Math.cos(u.ph) * o0[2], wy = h.y + Math.sin(u.ph) * o0[2] * 0.5 * E.squash;
  const dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy), step = spd * dt;
  if (d > 1) { const k = Math.min(1, step / d); u.x += dx * k; u.y += dy * k; }
  if (Math.abs(dx) > 3) u.fl = dx < 0 ? 1 : 0;
  if (u.n >= DR.shots) return;
  u.cd -= dt * unitSpeed(s);
  const o = target(E, g, h, u, u.x, u.y, DR.range);
  if (!o || u.cd > 0) return;
  u.cd = DR.gap; u.n += 1; u.f = 0;
  u.a = Math.atan2((o.y - u.y) / E.squash, o.x - u.x);
  unitHit(E, g, h, s, u, o, droneMul(J));
  E.fx(g, u.map, { kind: "sk_en_zap", x: Math.round(u.x), y: Math.round(u.y), x0: Math.round(u.x), y0: Math.round(u.y) + u.hz, x1: Math.round(o.x), y1: Math.round(o.y), k: 1, pi: h.pi, oc: s.oc > 0 ? 1 : 0, t: 0.18, life: 0.18, snd: "enClick" });
}
function tickMech(E, g, h, s, u, dt) {
  u.mv = 0;
  if (u.t < MC.go) return;
  u.cd -= dt * unitSpeed(s);
  const o = u.n < MC.hits ? target(E, g, h, u, u.x, u.y, MC.seek) : null;
  let gx, gy, stop;
  if (o) { gx = o.x; gy = o.y; stop = MC.reach + (o.rad || 16) * 0.5; }
  else { gx = h.x + (h.dir < 0 ? 1 : -1) * 70; gy = h.y; stop = 60; }   // 칠 것이 없으면 주인 곁으로(정한 값)
  const dx = gx - u.x, dy = (gy - u.y) / E.squash, d = Math.hypot(dx, dy);
  if (Math.abs(dx) > 4) u.a = dx < 0 ? Math.PI : 0;
  if (d > stop) {
    const k = Math.min(1, (MC.spd * dt) / d), nx = u.x + dx * k, ny = u.y + dy * k * E.squash;
    if (E.open(nx, ny, u.map)) { u.x = nx; u.y = ny; const p = { x: u.x, y: u.y }; E.keep(p, u.map); u.x = p.x; u.y = p.y; u.mv = 1; }
    return;
  }
  if (!o || u.cd > 0) return;
  u.cd = MC.gap; u.n += 1; u.f = 0;
  unitHit(E, g, h, s, u, o, MC.mul);
  E.fx(g, u.map, { kind: "sk_en_punch", x: Math.round(o.x), y: Math.round(o.y), pi: h.pi, t: 0.3, life: 0.3, snd: "enPunch" });
}
// 수호자 끝 — 코어가 한 번 터진다(같은 시전)
function mechEnd(E, g, h, s, u) {
  for (const o of foes(E, g, h, u.x, u.y, MC.endR, u.map)) strike(E, g, h, u, o, MC.endMul * unitBoost(h, s));
  g.shake = Math.max(g.shake || 0, 0.25);
  E.fx(g, u.map, { kind: "sk_en_boom", x: Math.round(u.x), y: Math.round(u.y), r: MC.endR, pi: h.pi, t: 0.6, life: 0.6, snd: "enBoom" });
}
function tickUnits(E, g, h, s, dt) {
  for (const u of s.units.slice()) {
    if (u.map !== h.map) { removeUnit(E, g, h, s, u, "map"); continue; }
    u.t += dt; u.f += dt; u.seek = Math.max(0, u.seek - dt);
    if (u.k === "turret") tickTurret(E, g, h, s, u, dt);
    else if (u.k === "drone") tickDrone(E, g, h, s, u, dt);
    else tickMech(E, g, h, s, u, dt);
    if (u.t >= u.dur) { if (u.k === "mech") mechEnd(E, g, h, s, u); removeUnit(E, g, h, s, u, "time"); }
  }
}

/* ── 자기장 포획 ───────────────────────────────────── */
function magnetUse(E, g, h) {
  if (blocked(E, g, h, "magnet")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, MG.reach, MG.near);
  spend(s, "magnet"); s.cd.magnet = MG.cd;
  s.mag.push({ t: 0, x, y, cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_en_magnet", x, y, r: MG.r, hit: MG.hit, pi: h.pi, t: MG.hit + 0.35, life: MG.hit + 0.35, snd: "enField" });
  call(E, g, h, MG.name);
}
function tickMag(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < MG.hit) return true;
  for (const o of foes(E, g, h, q.x, q.y, MG.r, q.map)) {
    strike(E, g, h, q, o, MG.mul);
    if (o.type && !E.boss(o)) E.cc(g, h, o, { bind: MG.bind });   // 일반 몹만 묶는다
  }
  if (q.xp) trainXp(E, g, h, 2);
  return false;
}

/* ── 직선 레일포 — 0.25초 예고 뒤 같은 줄을 한 번 ───── */
function railUse(E, g, h) {
  if (blocked(E, g, h, "rail")) return;
  const s = st(h), J = jobOf(h), [ax, ay] = aimDir(E, g, h, RL.len), len = wallCut(E, h, ax, ay, RL.len), w = railWidth(J);
  spend(s, "rail"); s.cd.rail = RL.cd;
  s.rail.push({ t: 0, x: h.x, y: h.y, ax, ay, len, w, cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  h.swing = 0.3;
  E.fx(g, h.map, { kind: "sk_en_rail", x: Math.round(h.x), y: Math.round(h.y), x0: Math.round(h.x), y0: Math.round(h.y) - EN.lift, ax: r2(ax), ay: r2(ay), len: Math.round(len), w: Math.round(w),
    d: RL.warn, pi: h.pi, t: RL.warn + RL.tail, life: RL.warn + RL.tail, snd: "enCharge" });
  call(E, g, h, RL.name);
}
// 줄 위의 적 — 레일포 · 터렛 작은 레일포가 함께 쓴다
function onLine(E, g, h, x, y, ax, ay, len, w, map) {
  return E.near(g, h, x, y, len + 60).filter((o) => {
    if (!E.alive(g, h, o, map)) return false;
    const dx = o.x - x, dy = (o.y - y) / E.squash, along = dx * ax + dy * ay;
    return along >= -10 && along <= len + 10 && Math.abs(dx * ay - dy * ax) <= w / 2 + (o.rad || 16) * 0.5;
  });
}
function tickRail(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < RL.warn) return true;
  const s = st(h), k = s.oc > 0 ? 1 + RL.ocDmg : 1;
  for (const o of onLine(E, g, h, q.x, q.y, q.ax, q.ay, q.len, q.w, q.map)) strike(E, g, h, q, o, RL.mul * k);
  g.shake = Math.max(g.shake || 0, 0.15);
  if (q.xp) trainXp(E, g, h, 2);
  return false;
}

/* ── 오버클럭 · 과열 ───────────────────────────────── */
function ocUse(E, g, h) {
  const s = st(h);
  if (s.lock > 0 && !(h.down > 0)) return void no(E, g, h, `과열 — ${Math.ceil(s.lock)}초`, RED);
  if (blocked(E, g, h, "oc")) return;
  spend(s, "oc"); s.cd.oc = OC.cd;                      // 대기는 누르는 순간부터
  s.oc = OC.dur; s.ocT = OC.hint; s.ocXp = 0;
  E.fx(g, h.map, { kind: "sk_en_oc", x: h.x, y: h.y, pi: h.pi, start: 1, t: 0.6, life: 0.6, snd: "enOc" });
  call(E, g, h, OC.name);
}
function endOc(E, g, h, s, hot) {
  s.oc = 0;
  if (s.ocXp) trainXp(E, g, h, 2);                      // 동기화 연마 — 오버클럭 중 설치물 명중(한 번에 한 번)
  s.ocXp = 0;
  if (hot) {
    s.lock = OC.lock;
    E.fx(g, h.map, { kind: "sk_en_heat", x: h.x, y: h.y, pi: h.pi, t: 0.8, life: 0.8, snd: "enAlarm" });
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 124, text: "과열", color: RED, who: h.pi, t: 0.9, life: 0.9 });
  }
}
function tickHeat(E, g, h, s, dt) {
  s.lock = Math.max(0, s.lock - dt);
  if (s.oc > 0) {
    s.heat = Math.min(EN.heatMax, s.heat + heatRate(jobOf(h)) * dt);
    s.oc = Math.max(0, s.oc - dt);
    if (s.heat >= EN.heatMax) return void endOc(E, g, h, s, true);
    if (s.oc <= 0) return void endOc(E, g, h, s, false);
  } else s.heat = Math.max(0, s.heat - OC.cool * dt);
}

/* ── 궤도 섬멸 명령 ──────────────────────────────────── */
function orbitUse(E, g, h) {
  if (blocked(E, g, h, "orbit")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, OB.reach, OB.near);
  const bonus = Math.min(OB.perMax, OB.per * s.units.length);   // 시전 순간의 설치물 수로 정한다
  spend(s, "orbit"); s.cd.orbit = OB.cd;
  s.orb.push({ t: 0, i: 0, x, y, k: 1 + bonus, cast: E.cast(h, "ult"), base: E.base(h), map: h.map, xp: 0, done: 0 });
  h.swing = 0.3;
  const life = OB.end + OB.tail;
  E.fx(g, h.map, { kind: "sk_en_orbit", x, y, r: OB.r, n: OB.n, d: OB.first, gap: OB.gap, beam: OB.beam, end: OB.end, guide: enCentral(jobOf(h)) ? 1 : 0,
    ax: x - h.x, ay: y - h.y, pi: h.pi, t: life, life, snd: "enOrbit" });
  call(E, g, h, bonus > 0 ? `${OB.name} +${Math.round(bonus * 100)}%` : OB.name, "#FFD37A");
}
function tickOrbit(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < OB.n && q.t >= OB.first + q.i * OB.gap) {
    q.i += 1;
    for (const o of foes(E, g, h, q.x, q.y, OB.r, q.map)) strike(E, g, h, q, o, OB.mul);
    g.shake = Math.max(g.shake || 0, 0.12);
  }
  if (q.t < OB.end) return true;
  for (const o of foes(E, g, h, q.x, q.y, OB.r, q.map)) strike(E, g, h, q, o, OB.endMul * q.k);
  g.shake = Math.max(g.shake || 0, 0.45);
  E.fx(g, q.map, { kind: "call", x: q.x, y: q.y - 120, text: `×${Math.round(OB.endMul * q.k)}`, color: "#FFD37A", who: h.pi, t: 1.1, life: 1.1 });
  return false;
}

/* ── 입력 — req = { op: "use", s: "turret" | "drone" | "magnet" | "rail" | "mech" | "oc" | "orbit" } ── */
const USE = { turret: turretUse, drone: droneUse, magnet: magnetUse, rail: railUse, mech: mechUse, oc: ocUse, orbit: orbitUse };
export function engineerInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object" || !engineerOn(h)) return false;
  if (req.op === "use" && Object.prototype.hasOwnProperty.call(USE, req.s)) USE[req.s](E, g, h);
  return false;
}

/* ── 시간 ─────────────────────────────────────────── */
export function tickEngineer(E, g, h, dt) {
  if (!engineerOn(h)) { if (h.en) h.en = null; if (h.env) h.env = null; return; }
  const s = st(h);
  if (h.env) { s.power = clampN(h.env.power, 0, EN.power); s.heat = clampN(h.env.heat, 0, EN.heatMax); h.env = null; }   // 방장 승계 — 전력 · 과열을 이어받는다
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  if (h.down <= 0 && !E.fight(h)) s.power = Math.min(EN.power, s.power + EN.regen * dt);
  tickHeat(E, g, h, s, dt);
  const here = (q) => q.map === h.map;
  s.pulses = s.pulses.filter((c) => here(c) && stepPulse(E, g, h, c, dt));
  s.mag = s.mag.filter((q) => here(q) && tickMag(E, g, h, q, dt));
  s.rail = s.rail.filter((q) => here(q) && tickRail(E, g, h, q, dt));
  s.orb = s.orb.filter((q) => here(q) && tickOrbit(E, g, h, q, dt));
  tickUnits(E, g, h, s, dt);
}
// 쓰러졌다 — 설치물 · 소환물을 걷고 오버클럭을 끈다(기획안 "시전자 사망 · 맵 이동 시 정리"). 전력은 남긴다(정한 값)
export function engineerDown(E, g, h) {
  if (!engineerOn(h) || !h.en) return;
  const s = h.en;
  for (const u of s.units.slice()) removeUnit(E, g, h, s, u, "down");
  if (s.oc > 0) endOc(E, g, h, s, false);
}
// 훈련장 · 연습장 "스택 가득" — 전력을 가득
export function engineerFill(h) { if (engineerOn(h)) st(h).power = EN.power; }

/* ── 스냅샷 영웅 줄 58 — 이 직업이 아니면 0. 칸 수는 고정이고 뒤에만 더한다 ──
   [0 전력, 1 과열, 2 직업 레벨, 3 경험치, 4 연마 편 것, 5 대기 [터렛, 드론, 자기장, 레일, 수호자, 오버클럭, 궤도],
    6 오버클럭 남은 초, 7 과열 잠김 남은 초, 8 설치물 [[종류, x, y, 나이, 남은 초, 겨눈 각, 마지막 공격 뒤, 높이, 뒤집기 · 걷기]]] */
const CD_KEYS = ["turret", "drone", "magnet", "rail", "mech", "oc", "orbit"];
const packUnit = (u) => [EN_UNIT[u.k], Math.round(u.x), Math.round(u.y), r1(u.t), r1(Math.max(0, u.dur - u.t)), r2(u.a || 0), r1(Math.min(9, u.f)), u.hz || 0, (u.fl ? 1 : 0) | (u.mv ? 2 : 0)];
export function packEngineer(h) {
  if (!engineerOn(h)) return 0;
  const J = jobOf(h), s = h.en;
  return [s ? Math.round(s.power) : EN.powerStart, s ? Math.round(s.heat) : 0, J.lv, J.xp, J.tr.flat(), CD_KEYS.map((k) => (s ? r1(s.cd[k]) : 0)),
    s ? r1(s.oc) : 0, s ? r1(s.lock) : 0, s ? s.units.map(packUnit) : []];
}
const KINDS = Object.keys(EN_UNIT);
const unitView = (a) => ({ k: KINDS[a[0]] || "turret", x: +a[1] || 0, y: +a[2] || 0, t: +a[3] || 0, left: +a[4] || 0, a: +a[5] || 0, f: +a[6] || 0, hz: +a[7] || 0, fl: a[8] & 1, mv: (a[8] & 2) >> 1 });
export function applyEngineer(h, a) {
  if (!Array.isArray(a)) { h.env = null; return; }
  const t = Array.isArray(a[4]) ? a[4] : [], J = cleanEnJob({ lv: a[2], xp: a[3], tr: [[t[0], t[1]], [t[2], t[3]], [t[4], t[5]]] });
  const cd = Array.isArray(a[5]) ? a[5] : [];
  h.env = viewOf(J, +a[0] || 0, +a[1] || 0, Object.fromEntries(CD_KEYS.map((k, i) => [k, +cd[i] || 0])), +a[6] || 0, +a[7] || 0,
    (Array.isArray(a[8]) ? a[8] : []).filter(Array.isArray).map(unitView));
}
const viewOf = (J, power, heat, cd, oc, lock, units) => ({ power, max: EN.power, heat, heatMax: EN.heatMax, hot: heat >= OC.hot, lv: J.lv, xp: J.xp, tr: J.tr, cd,
  cdMax: { turret: TU.cd, drone: DR.cd, magnet: MG.cd, rail: RL.cd, mech: MC.cd, oc: OC.cd, orbit: OB.cd },
  oc, lock, units, cap: unitCap(J), central: enCentral(J), tint: engineerTint(enTrainSum(J)) });

/* ── 화면 값 — 방장(판정 세계)은 h.bag.hj · h.en 에서, 손님은 h.env 에서 같은 모양으로 ── */
export function engineerView(h) {
  if (!h) return null;
  if (h.env) return h.env;
  if (!engineerOn(h)) return null;
  const J = jobOf(h), s = h.en;
  return viewOf(J, s ? s.power : EN.powerStart, s ? s.heat : 0, s ? { ...s.cd } : { ...NO_CD }, s ? r1(s.oc) : 0, s ? r1(s.lock) : 0,
    s ? s.units.map((u) => unitView(packUnit(u))) : []);
}
