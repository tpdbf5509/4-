/* ── 히든 직업 Wyvern Knight 006(와이번 나이트) 판정 — 용혈 · 와이번 계약 · 스킬 9종(11월 17일, 격자 연습장에만) ─────────────
   수치는 wyvernData.js. 판정 쪽(방장 · 전용 서버 꼴)만 셈한다. 화면은 연출(fx)과 wyvernView 값만 그린다.
   피해는 기존 strikeAny · 평타 판정을 거쳐 결투 시전별 상한 · 사냥터 PvP 상한이 그대로 걸린다.
   한 시전의 모든 타격(다단 · 추가 폭발 · 날개 폭풍 · 화염 균열)은 그 시전 객체를 함께 쓴다. 와이번 자동 공격은 계약 시전 객체를 쓴다.
   켜는 꼴은 Gambler 002 와 같은 bag.hj = { active: "wyvern", jobs: { wyvern: { lv, xp, tr } }, version: 1 }.
   싸우는 동안의 상태 h.wy — 용혈 · 대기 · 와이번 하나 · 예약 타격 · 변신 · 용린. 저장하지 않는다(연습장 전용이라 스냅샷 줄도 아직 없다).
   고도는 따로 Z 축 없이 s.air(오르는 높이 — 그림에서만 위로 띄운다)로만 둔다. 실제 자리는 땅의 x · y 하나다.
   E(엔진, rpg.js wyvernEngine): engineerEngine 것 + stop(걷기 멈춤) */
import { WYVERN as WV, WYVERN_ID, WYVERN_NAME, WYVERN_TINT, WY_TRAIN_NAMES, WY_BLOOD as BL, WY_CLAW as CL, WY_CONTRACT as CT, WY_ROAR as RO,
  WY_DIVE as DV, WY_SCALE as SC, WY_SKY as SK, WY_AWAKE as AW, WY_ULT as UL, WY_ASSAULT as AS, WY_ARCADION as AR, WY_SKILLS, WY_WEAPON_ITEM } from "./wyvernData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const TEXT = "#F4D9C6", DIM = "#c9d6d0", WARN = "#f0dcb4", RED = "#ff8a8a", FIRE = "#EF9757";

/* ── 직업 칸 ───────────────────────────────────────── */
export const wyJobNeed = (lv) => WV.xp.base + WV.xp.per * lv;
export const wyTrainNeed = (l) => WV.train.base + WV.train.per * l;
export function cleanWyJob(d) {
  d = d && typeof d === "object" ? d : {};
  const lv = clampN(d.lv, 1, WV.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, WV.train.max);
    return [l, l >= WV.train.max ? 0 : clampN(q[1], 0, wyTrainNeed(l) - 1)];
  });
  return { lv, xp: lv >= WV.maxLv ? 0 : clampN(d.xp, 0, wyJobNeed(lv) - 1), tr };
}
// 이 직업인가 — 가방 값으로만 본다. WYVERN.live 가 false 면 격자 연습장 맵에서만 켜진다
export const wyvernOn = (h) => !!(h && h.bag && h.bag.hj && h.bag.hj.active === WYVERN_ID && h.bag.hj.jobs && h.bag.hj.jobs[WYVERN_ID] && (WV.live || h.map === "sandbox"));
export const wyvernLook = (h) => wyvernOn(h);
// 아르카디온(11월 18일 사용자 "레퀴엠처럼 장착하는 무기") — 이 직업은 아르카디온만 든다 · 들고 있어야 X 기술
export const wyWeaponOk = (w) => !w || w.sp === WY_WEAPON_ITEM.id;
const heldSp = (h) => { if (!h) return ""; if (h.wsp !== undefined) return h.wsp; const b = h.bag, w = b && b.e && b.w ? b.w.find((q) => q.u === b.e) : null; return (w && w.sp) || ""; };
export const wyArmed = (h) => heldSp(h) === WY_WEAPON_ITEM.id;
const jobOf = (h) => h.bag.hj.jobs[WYVERN_ID];
export const wyTrainSum = (J) => (J ? J.tr.reduce((n, q) => n + q[0], 0) : 0);
export const wyvernTint = (sum) => WYVERN_TINT.find((t) => sum >= t.from).id;
export const wySync = (J) => wyTrainSum(J) >= WV.sync;   // 진룡 동조 — 연마 합계 150
export const wyLock = (J, sk) => (!J ? "잠김" : J.lv < WV.unlock[sk] ? `직업 레벨 ${WV.unlock[sk]}에 열립니다` : "");
// 연마로 바뀌는 값
export const wyvernMul = (J) => (J && J.tr[0][0] >= CT.sp25 ? CT.mul25 : CT.mul);
export const wyvernDur = (J) => (J && J.tr[0][0] >= CT.sp50 ? CT.dur50 : CT.dur);
export const bloodGainK = (J) => (J && J.tr[1][0] >= BL.sp25 ? 1 + BL.gain25 : 1);
export const awakeDur = (J) => (J && J.tr[1][0] >= AW.sp50 ? AW.dur50 : AW.dur);
export const diveR = (J) => DV.r * (J && J.tr[2][0] >= DV.sp25 ? 1 + DV.r25 : 1);
export const diveStorm = (J) => !!(J && J.tr[2][0] >= DV.sp50);

/* 켜기 — 1차 전직 · BLOOD-001 · 다른 히든 직업과 함께 쓰지 못한다(한 번에 하나). 든 무기는 내려놓는다(지우지 않는다).
   init 이 있으면 그 레벨 · 연마로(연습장) */
export function unlockWyvern(h, init) {
  const old = h.bag.hj && h.bag.hj.jobs ? h.bag.hj.jobs : {};
  h.bag.hj = { active: WYVERN_ID, jobs: { ...old, [WYVERN_ID]: cleanWyJob(init || old[WYVERN_ID]) }, version: 1 };
  h.env = null; h.gm = null; h.gmv = null; h.en = null; h.nc = null;
  if (h.bag.bd && h.bag.bd.on) h.bag.bd = { ...h.bag.bd, on: 0 };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null;
  if (!wyArmed(h)) h.bag.e = 0;                     // 아르카디온이 아니면 내려놓는다
  h.wy = null;
  h.bag.v = (h.bag.v || 0) + 1;
}
export function dropWyvern(h) {
  if (!h.bag || !h.bag.hj || h.bag.hj.active !== WYVERN_ID) return;
  h.bag.hj = { ...h.bag.hj, active: "" };
  h.wy = null;
  h.bag.v = (h.bag.v || 0) + 1;
}

/* ── 싸우는 동안의 상태 h.wy ───────────────────────── */
const NO_CD = { contract: 0, roar: 0, dive: 0, scale: 0, sky: 0, awake: 0, ult: 0, assault: 0, arcadion: 0 };
function st(h) {
  return h.wy || (h.wy = { blood: WV.bloodStart, cd: { ...NO_CD }, u: null, claws: [], roars: [], dives: [], skies: [], ults: [], dashes: [], arcs: [],
    sc: null, aw: 0, awMax: 0, awXp: 0, air: null, xm: [0, 0], q: 0, sw: null });
}
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
const no = (E, g, h, text, color = DIM) => void E.say(g, h.map, h.x, h.y - 90, text, color);
const call = (E, g, h, text, color = TEXT) => E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text, color, who: h.pi, t: 0.7, life: 0.7 });
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 돌진 · 착지가 벽 너머로 가지 않는다
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
// 부채꼴 안 — (x, y) 에서 방향 (ax, ay) · 반각 arc · 반지름 R
function inFan(E, g, h, x, y, ax, ay, R, arc, map) {
  const cosA = Math.cos(arc);
  return E.near(g, h, x, y, R + 60).filter((o) => E.alive(g, h, o, map)).map((o) => {
    const dx = o.x - x, dy = (o.y - y) / E.squash, d = Math.hypot(dx, dy);
    return { o, d, dot: d > 0 ? (dx * ax + dy * ay) / d : 1 };
  }).filter((q) => q.d <= R + (q.o.rad || 16) * 0.5 && (q.d < 24 || q.dot >= cosA)).sort((a, b) => a.d - b.d);
}
// 지점 스킬이 떨어질 자리 — 포인터 자리(reach 밖이면 reach 로 줄인다) · 없으면 가까운 적 · 없으면 보는 쪽 near. 벽 앞에서 멈춘다
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
  const p = { x: h.x + ux * d, y: h.y + uy * d * E.squash };
  E.keep(p, h.map);
  return [Math.round(p.x), Math.round(p.y)];
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

/* ── 한 대 — src 는 그 공격(시전 객체 cast · 기준 피해 base · basic 평타 · k 역린 해방 배율) ── */
function strike(E, g, h, src, o, mul) {
  const prev = h.cast; h.cast = src.cast;
  try { (src.basic ? E.basic : E.strike)(g, h, o, src.base * mul * (src.k || 1)); } finally { h.cast = prev; }
  if (!E.dummy(o)) { src.xp = 1; if (h.wy && h.wy.aw > 0) h.wy.awXp = 1; }   // 유효 적중 — 훈련용 대상은 연마 경험치를 주지 않는다
  return true;
}
// 역린 해방 중 시전한 기술 — 피해 +70%(시전 때 정한다)
const skillK = (s) => (s.aw > 0 ? 1 + AW.dmg : 1);
function gainBlood(h, n) {
  const s = st(h);
  s.blood = Math.min(WV.blood, s.blood + n * bloodGainK(jobOf(h)));
}

/* ── 경험치 ─────────────────────────────────────────── */
function jobXp(E, g, h, n) {
  const J = jobOf(h), s = st(h);
  if (J.lv >= WV.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, WV.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n; J.xp += n;
  let up = 0;
  while (J.lv < WV.maxLv && J.xp >= wyJobNeed(J.lv)) { J.xp -= wyJobNeed(J.lv); J.lv += 1; up = 1; }
  if (J.lv >= WV.maxLv) J.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${WYVERN_NAME} 직업 레벨 ${J.lv}`, color: TEXT, t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
}
// 연마 경험치 — 시전당 한 번(부른 쪽이 센다). i: 0 조련 · 1 용혈 · 2 천공
function trainXp(E, g, h, i, n = WV.train.cast) {
  const q = jobOf(h).tr[i];
  if (q[0] >= WV.train.max || !(n > 0)) return;
  q[1] += n;
  let up = 0;
  while (q[0] < WV.train.max && q[1] >= wyTrainNeed(q[0])) { q[1] -= wyTrainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= WV.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${WY_TRAIN_NAMES[i]} ${q[0]}`, color: TEXT, t: 1.2, life: 1.2, who: h.pi });
}
export function wyvernKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? WV.xp.raid : WV.xp.boss) : WV.xp.mob;
  for (const h of got) if (wyvernOn(h)) jobXp(E, g, h, n);
}
export const wyvernRaidKill = (E, g, h) => { if (wyvernOn(h)) jobXp(E, g, h, WV.xp.raid); };

/* ── 쓸 수 있나 ─────────────────────────────────────── */
function blocked(E, g, h, sk) {
  const s = st(h), D = WY_SKILLS[sk];
  if (h.down > 0 || E.locked(h)) return true;
  const w = E.fight(h);
  if (w) { if (w !== "-") no(E, g, h, w); return true; }
  const lock = wyLock(jobOf(h), sk);
  if (lock) { no(E, g, h, lock); return true; }
  if (s.cd[sk] > 0) { no(E, g, h, `${D.name} ${Math.ceil(s.cd[sk])}초`, WARN); return true; }
  if (s.blood < D.cost) { no(E, g, h, `용혈이 부족합니다 (${D.cost})`, RED); return true; }
  return false;
}
const spend = (s, sk) => { s.blood = Math.max(0, s.blood - WY_SKILLS[sk].cost); };
// 손에 든 아르카디온 휘두르기(그림만) — k 종류 · t 흐른 시간 · d 길이 · 겨눈 쪽
const swingOf = (s, k, d, ax, ay) => { s.sw = { k, t: 0, d, ax: r2(ax), ay: r2(ay) }; };
const hold = (E, h, t) => { E.stop(h); h.dvx = 0; h.dvy = 0; h.dash = Math.max(h.dash || 0, t); };   // 그 자리에 붙든다(걷지 않는다)

/* ── 기본 공격 — 용조격 ───────────────────────────────
   s.claws = [{ w 남은 예비 시간, ax, ay, cast, base, basic, map }] — 0.12초에 앞 부채꼴 한 번 */
export function wyvernBasic(E, g, h, force) {
  if (!wyvernOn(h)) return false;
  const s = st(h), o = nearest(E, g, h, h.x, h.y, CL.reach + 20, h.map);
  if (!o && !force) return false;
  let ax, ay;
  if (o) { const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
  else [ax, ay] = E.face(h);
  if (Math.abs(ax) > 0.05) h.dir = ax < 0 ? -1 : 1;
  h.face = 0;
  s.q += 1;
  s.claws.push({ w: CL.wind, ax: r2(ax), ay: r2(ay), cast: E.cast(h, "basic"), base: E.base(h), basic: 1, map: h.map });
  swingOf(s, s.q % 2 ? "c1" : "c2", 0.3, ax, ay);
  E.fx(g, h.map, { kind: "sk_wy_claw", x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), r: CL.reach, arc: r2(CL.arc), d: CL.wind, fl: s.q % 2, pi: h.pi, t: 0.34, life: 0.34, snd: "wyClaw" });
  return true;
}
function stepClaw(E, g, h, c, dt) {
  c.w -= dt;
  if (c.w > 0) return true;
  const hits = inFan(E, g, h, h.x, h.y, c.ax, c.ay, CL.reach, CL.arc, c.map).slice(0, CL.max);
  hits.forEach((q, i) => {
    strike(E, g, h, c, q.o, CL.mul);
    E.fx(g, c.map, { kind: "sk_wy_hit", x: Math.round(q.o.x), y: Math.round(q.o.y), pi: h.pi, t: 0.32, life: 0.32, ...(i ? {} : { snd: "wyHit" }) });
  });
  if (hits.length) gainBlood(h, BL.claw);            // 휘두를 때 한 번
  if (c.xp) trainXp(E, g, h, 1);                     // 용혈 연마 — 용조격 적중
  return false;
}

/* ── 비룡의 계약 — 와이번 하나 ───────────────────────
   s.u = { t, dur, x, y 땅 자리, cd 다음 공격까지, tg, seek, f 마지막 공격 뒤, fl 왼쪽을 봄, dv 급강하 동행 { t, x0, y0, x1, y1, at }, cast, base, map, xp, balls } */
function contractUse(E, g, h) {
  const s = st(h);
  if (s.u) return void no(E, g, h, "와이번이 이미 곁에 있습니다", WARN);   // 동시 한 마리
  if (blocked(E, g, h, "contract")) return;
  spend(s, "contract");
  const side = h.dir < 0 ? 1 : -1, x = h.x + side * 90, y = h.y - 8;
  s.u = { t: 0, dur: wyvernDur(jobOf(h)), x, y, cd: 0, tg: "", seek: 0, f: 9, fl: h.dir < 0 ? 1 : 0, dv: null,
    cast: E.cast(h), base: E.base(h), map: h.map, xp: 0, balls: [] };
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_wy_sum", x: Math.round(x), y: Math.round(y), pi: h.pi, t: 0.9, life: 0.9, snd: "wyCry" });
  call(E, g, h, CT.name);
}
function endWyvern(E, g, h, s, why) {
  const u = s.u; if (!u) return;
  s.u = null;
  if (u.xp && why !== "down" && why !== "map") trainXp(E, g, h, 0);   // 조련 연마 — 이 계약 동안 자동 공격 유효 적중(시전당 한 번)
  s.cd.contract = CT.cd;                              // 대기는 끝난 때부터
  if (why !== "map") E.fx(g, u.map, { kind: "sk_wy_gone", x: Math.round(u.x), y: Math.round(u.y), fl: u.fl, pi: h.pi, t: 0.5, life: 0.5 });
}
function target(E, g, h, u) {
  let o = u.tg ? find(g, u.tg) : null;
  if (o && (!E.alive(g, h, o, u.map) || sq(E, u.x, u.y, o) - (o.rad || 16) * 0.5 > CT.seek)) { o = null; u.tg = ""; }
  if (o && E.boss(o)) return o;
  if (u.seek > 0) return o;
  u.seek = 0.2;
  const n = nearest(E, g, h, u.x, u.y, CT.seek, u.map);
  if (n) u.tg = keyOf(n);
  return n || o;
}
function tickWyvern(E, g, h, s, dt) {
  const u = s.u;
  if (u.map !== h.map) return void endWyvern(E, g, h, s, "map");
  u.t += dt; u.f += dt; u.seek = Math.max(0, u.seek - dt);
  if (u.dv) {                                         // 급강하 동행 — 주인과 함께 착지 자리로
    const d = u.dv; d.t += dt;
    const k = Math.min(1, Math.max(0, (d.t - DV.up) / (DV.land - DV.up)));
    u.x = d.x0 + (d.x1 - d.x0) * k; u.y = d.y0 + (d.y1 - d.y0) * k;
    if (d.t >= DV.end) u.dv = null;
  } else {
    const px = u.x, py = u.y;
    // 주인 뒤 60~120 — 보는 쪽 반대편, 살짝 위. 650 넘게 떨어지면 주인 뒤로 다시 놓는다
    const side = h.dir < 0 ? 1 : -1, back = (CT.back[0] + CT.back[1]) / 2;
    const wx = h.x + side * back, wy = h.y - 10;
    if (sq(E, h.x, h.y, u) > CT.far) {
      u.x = wx; u.y = wy;
      E.fx(g, u.map, { kind: "sk_wy_sum", x: Math.round(wx), y: Math.round(wy), quick: 1, pi: h.pi, t: 0.45, life: 0.45 });
    } else {
      const dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy), near = sq(E, h.x, h.y, u);
      const slack = near >= CT.back[0] && near <= CT.back[1] + 20 ? 0.35 : 1;   // 자리 안이면 느긋하게
      if (d > 2) { const k = Math.min(1, (CT.spd * slack * dt) / d); u.x += dx * k; u.y += dy * k; }
      if (Math.abs(dx) > 6) u.fl = dx < 0 ? 1 : 0;
    }
    u.still = Math.hypot(u.x - px, u.y - py) > CT.sit.speed * dt ? 0 : (u.still || 0) + dt;   // 앉기 — 멈춰 있던 시간
  }
  const sitWant = !u.dv && u.t >= CT.appear && (u.still || 0) >= CT.sit.wait ? 1 : 0;
  u.land = (u.land || 0) + Math.max(-dt / CT.sit.time, Math.min(dt / CT.sit.time, sitWant - (u.land || 0)));
  // 날아가는 화염탄 — 닿을 때 맞는다(공격 한 번에 용혈 +2 한 번)
  u.balls = u.balls.filter((b) => {
    b.t += dt;
    if (b.t < b.tt) return true;
    const o = find(g, b.tg);
    if (o && E.alive(g, h, o, u.map)) {
      strike(E, g, h, u, o, b.mul);
      gainBlood(h, BL.wyvern);
      E.fx(g, u.map, { kind: "sk_wy_hit", x: Math.round(o.x), y: Math.round(o.y), big: 1, pi: h.pi, t: 0.36, life: 0.36, snd: "wyFire" });
    }
    return false;
  });
  if (u.t < CT.appear || u.dv) return;
  u.cd -= dt;
  const o = target(E, g, h, u);
  if (o && Math.abs(o.x - u.x) > 6) u.fl = o.x < u.x ? 1 : 0;
  if (!o || u.cd > 0) return;
  u.cd = CT.gap; u.f = 0;
  const J = jobOf(h), sync = s.aw > 0 && wySync(J) ? 1 + AW.syncWyvern : 1;
  const [mdx, mdy] = mouthOf(u), x0 = u.x + (u.fl ? -mdx : mdx), y0 = u.y + mdy, tt = Math.max(0.12, Math.hypot(o.x - x0, o.y - 22 - y0) / CT.v);
  u.balls.push({ t: 0, tt, tg: keyOf(o), mul: wyvernMul(J) * sync });
  E.fx(g, u.map, { kind: "sk_wy_ball", x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(o.x), y1: Math.round(o.y) - 22, pi: h.pi, t: tt + 0.05, life: tt + 0.05, snd: "wyBreath" });
}

/* ── 용염 포효 — 포탈에서 용의 머리가 나와 앞으로 불을 뿜는다 ── */
function roarUse(E, g, h) {
  if (blocked(E, g, h, "roar")) return;
  const s = st(h), [ax, ay] = aimDir(E, g, h, RO.reach), arc = Math.min(Math.PI * 0.95, RO.arc * (s.aw > 0 ? 1 + RO.awakeArc : 1));
  spend(s, "roar"); s.cd.roar = RO.cd;
  const u = s.u, sub = u && !u.dv ? { x: Math.round(h.x), y: Math.round(h.y), wx: Math.round(u.x), wy: Math.round(u.y), hz: CT.hz, fl: u.fl ? 1 : 0, m: mouthOf(u) } : null;   // 갈래는 시전자 앞 — 와이번이 그쪽으로 뿜는다
  s.roars.push({ t: 0, i: 0, x: h.x, y: h.y, ax, ay, arc, cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0, got: 0, sub, subDone: 0, subXp: 0 });
  h.swing = 0.3;
  const life = RO.first + RO.gap * (RO.n - 1) + RO.tail;
  E.fx(g, h.map, { kind: "sk_wy_roar", x: Math.round(h.x), y: Math.round(h.y), ax: r2(ax), ay: r2(ay), r: RO.reach, arc: r2(arc), n: RO.n, d: RO.first, gap: RO.gap,
    sub: sub ? { x: sub.x, y: sub.y, wx: sub.wx, wy: sub.wy, hz: sub.hz, fl: sub.fl, m: sub.m, r: RO.sub.reach, arc: r2(RO.sub.arc), at: RO.sub.at } : 0, aw: s.aw > 0 ? 1 : 0, pi: h.pi, t: life, life, snd: "wyRoar" });
  call(E, g, h, RO.name);
}
function tickRoar(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < RO.n && q.t >= RO.first + q.i * RO.gap) {
    q.i += 1;
    const hit = inFan(E, g, h, q.x, q.y, q.ax, q.ay, RO.reach, q.arc, q.map);
    for (const p of hit) strike(E, g, h, q, p.o, RO.mul);
    if (hit.length && !q.got) { q.got = 1; gainBlood(h, BL.roar); }   // 시전당 한 번
  }
  if (q.sub && !q.subDone && q.t >= RO.sub.hit) {   // 와이번 쪽 두 번째 화염 갈래 — 대상마다 ×8 한 번(같은 시전)
    q.subDone = 1;
    const sub = { ...q, xp: 0 };
    for (const p of inFan(E, g, h, q.sub.x, q.sub.y, q.ax, q.ay, RO.sub.reach, RO.sub.arc, q.map)) strike(E, g, h, sub, p.o, RO.sub.mul);
    if (sub.xp) { q.xp = 1; q.subXp = 1; }
  }
  if (q.i < RO.n || (q.sub && !q.subDone)) return true;
  if (q.xp) trainXp(E, g, h, 1);                     // 용혈 연마 — 용염 포효 적중
  if (q.subXp) trainXp(E, g, h, 0);                  // 조련 연마 — 합동 스킬 적중
  return false;
}

/* ── 비룡 급강하 — 오른 뒤 지정한 자리로 떨어진다 ── */
function diveUse(E, g, h) {
  if (blocked(E, g, h, "dive")) return;
  const s = st(h), J = jobOf(h), [x, y] = pointAt(E, g, h, DV.reach, DV.near);
  spend(s, "dive"); s.cd.dive = DV.cd;
  const joint = !!(s.u && !s.u.dv), r = Math.round(diveR(J));
  if (joint) s.u.dv = { t: 0, x0: s.u.x, y0: s.u.y, x1: x - (h.dir < 0 ? -40 : 40), y1: y - 6 };
  s.dives.push({ t: 0, x0: h.x, y0: h.y, x, y, r, joint, aw: s.aw > 0, storm: diveStorm(J), cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0,
    moved: 0, landed: 0, extra: 0, stormed: 0 });
  h.inv = Math.max(h.inv || 0, DV.inv);                // 처음 0.15초 회피
  hold(E, h, DV.up);
  s.air = { k: "dive", t: 0 };
  E.fx(g, h.map, { kind: "sk_wy_dive", x, y, x0: Math.round(h.x), y0: Math.round(h.y), r, joint: joint ? 1 : 0, ex: s.aw > 0 ? 1 : 0, storm: diveStorm(J) ? 1 : 0,
    pi: h.pi, t: DV.end + 0.45, life: DV.end + 0.45, snd: "wyDive" });
  call(E, g, h, joint ? `${DV.name} · 합동` : DV.name);
}
function tickDive(E, g, h, q, dt) {
  q.t += dt;
  if (!q.moved && q.t >= DV.up) { q.moved = 1; E.move(h, { x: q.x, y: q.y }, DV.land - DV.up); }
  if (!q.landed && q.t >= DV.land) {
    q.landed = 1;
    h.x = q.x; h.y = q.y; h.dash = 0;                 // 착지 자리는 판정이 정한 그 자리
    for (const o of foes(E, g, h, q.x, q.y, q.r, q.map)) strike(E, g, h, q, o, q.joint ? DV.mulJoint : DV.mul);
    g.shake = Math.max(g.shake || 0, q.joint ? 0.35 : 0.25);
  }
  if (q.aw && !q.extra && q.t >= DV.extra) {          // 역린 해방 — 종료 폭발 한 번 더(같은 시전)
    q.extra = 1;
    for (const o of foes(E, g, h, q.x, q.y, q.r, q.map)) strike(E, g, h, q, o, DV.extraMul);
  }
  if (q.storm && !q.stormed && q.t >= DV.end) {       // 천공 연마 50 — 날개 폭풍
    q.stormed = 1;
    for (const o of foes(E, g, h, q.x, q.y, q.r, q.map)) strike(E, g, h, q, o, DV.stormMul);
  }
  if (q.t < DV.end) return true;
  if (q.xp) { trainXp(E, g, h, 2); if (q.joint) trainXp(E, g, h, 0); }   // 천공 연마 · 와이번 동행이면 조련 연마
  return false;
}

/* ── 용린 수호 — 받는 PvE 피해 감소 · 반격 ─────────── */
function scaleUse(E, g, h) {
  if (blocked(E, g, h, "scale")) return;
  const s = st(h);
  spend(s, "scale"); s.cd.scale = SC.cd;
  s.sc = { t: 0, n: 0, gap: 0, cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0 };
  E.fx(g, h.map, { kind: "sk_wy_scale", x: h.x, y: h.y, pi: h.pi, t: SC.dur + 0.4, life: SC.dur + 0.4, snd: "wyScale" });
  call(E, g, h, SC.name);
}
function endScale(E, g, h, s) {
  if (!s.sc) return;
  if (s.sc.xp) trainXp(E, g, h, 1);                  // 반격이 맞으면 용혈 연마(정한 해석 — 기획안 연마 표에 없다)
  s.sc = null;
  E.fx(g, h.map, { kind: "sk_wy_scaleoff", x: h.x, y: h.y, pi: h.pi, t: 0.45, life: 0.45 });
}
// 받는 피해 — rpg.js hurtHero 가 부른다. 사람에게 받은 피해(결투 · 사냥터 PvP)는 그대로
export function wyvernTake(E, g, h, dmg, src) {
  const s = h && h.wy, v = s && s.sc;
  if (!v || !(dmg > 0) || (src && src.hero)) return dmg;
  if (v.n < SC.counters && v.gap <= 0) {
    const o = nearest(E, g, h, h.x, h.y, SC.reach, h.map);
    if (o) {
      v.n += 1; v.gap = SC.gap;
      strike(E, g, h, v, o, SC.mul);
      const a = Math.atan2((o.y - h.y) / E.squash, o.x - h.x);
      E.fx(g, h.map, { kind: "sk_wy_spike", x: Math.round(h.x), y: Math.round(h.y), x1: Math.round(o.x), y1: Math.round(o.y), a: r2(a), pi: h.pi, t: 0.42, life: 0.42, snd: "wyFire" });
    }
  }
  return dmg * (1 - SC.cut);
}

/* ── 천공 지배 — 추적 지점에 화염 폭격 ───────────────── */
function skyUse(E, g, h) {
  if (blocked(E, g, h, "sky")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, SK.reach, SK.near), n = s.aw > 0 ? SK.nAwake : SK.n;
  spend(s, "sky"); s.cd.sky = SK.cd;
  s.skies.push({ t: 0, i: 0, w: 0, x, y, n, gap: (SK.last - SK.first) / (n - 1), drops: [], cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0 });
  h.swing = 0.3;
  const life = SK.last + SK.tail;
  E.fx(g, h.map, { kind: "sk_wy_sky", x, y, r: SK.r, n, wy: s.u ? 0 : 1, pi: h.pi, t: life, life, snd: "wyCry" });
  call(E, g, h, n > SK.n ? `${SK.name} ×${n}` : SK.name);
}
function tickSky(E, g, h, q, dt) {
  q.t += dt;
  // 예고 — 떨어지기 warn 초 전에 그때 영역 안 가장 가까운 적 자리를 잡는다(없으면 정해진 무늬로 영역 안)
  while (q.w < q.n && q.t >= SK.first + q.w * q.gap - SK.warn) {
    const o = nearest(E, g, h, q.x, q.y, SK.r, q.map);
    let px, py;
    if (o) { px = o.x; py = o.y; }
    else { const a = q.w * 2.39996, d = SK.r * 0.75 * Math.sqrt((q.w + 0.5) / q.n); px = q.x + Math.cos(a) * d; py = q.y + Math.sin(a) * d * E.squash; }
    q.drops.push({ x: Math.round(px), y: Math.round(py) });
    E.fx(g, q.map, { kind: "sk_wy_drop", x: Math.round(px), y: Math.round(py), r: SK.blast, d: SK.warn, i: q.w, pi: h.pi, t: SK.warn + 0.5, life: SK.warn + 0.5, ...(q.w % 2 ? {} : { snd: "wyBoom" }) });
    q.w += 1;
  }
  while (q.i < q.w && q.t >= SK.first + q.i * q.gap) {
    const p = q.drops[q.i]; q.i += 1;
    for (const o of foes(E, g, h, p.x, p.y, SK.blast, q.map)) strike(E, g, h, q, o, SK.mul);
    g.shake = Math.max(g.shake || 0, 0.12);
  }
  if (q.i < q.n) return true;
  if (q.xp) trainXp(E, g, h, 2);                     // 천공 연마
  return false;
}

/* ── 역린 해방 — 반룡 변신 ─────────────────────────── */
function awakeUse(E, g, h) {
  const s = st(h);
  if (s.aw > 0) return void no(E, g, h, "이미 반룡입니다", WARN);
  if (blocked(E, g, h, "awake")) return;
  if (s.blood < WV.blood) return void no(E, g, h, `용혈이 ${WV.blood} 이어야 합니다`, RED);
  s.blood = 0; s.cd.awake = AW.cd;                   // 용혈 100 을 모두
  s.aw = s.awMax = awakeDur(jobOf(h)); s.awXp = 0;
  E.fx(g, h.map, { kind: "sk_wy_awake", x: h.x, y: h.y, pi: h.pi, t: AW.form + 0.3, life: AW.form + 0.3, snd: "wyAwake" });
  call(E, g, h, AW.name, FIRE);
}
function endAwake(E, g, h, s, quiet) {
  if (!(s.aw > 0)) return;
  s.aw = 0;
  if (s.awXp) trainXp(E, g, h, 1);                   // 용혈 연마 — 역린 해방 중 유효 피해(변신 한 번에 한 번)
  s.awXp = 0;
  if (!quiet) E.fx(g, h.map, { kind: "sk_wy_scaleoff", x: h.x, y: h.y, big: 1, pi: h.pi, t: 0.5, life: 0.5 });
}
// 걷는 빠르기 배율 — rpg.js 걷기 식이 곱한다
export const wyvernSpd = (h) => (h && h.wy && h.wy.aw > 0 && wyvernOn(h) ? 1 + AW.spd : 1);

/* ── 종언의 용성 — 궁극기 ─────────────────────────── */
function ultUse(E, g, h) {
  if (blocked(E, g, h, "ult")) return;
  const s = st(h), J = jobOf(h), [x, y] = pointAt(E, g, h, UL.reach, UL.near);
  spend(s, "ult"); s.cd.ult = UL.cd;
  const k = s.aw > 0 ? UL.awakeK : 1, sync = wySync(J);
  if (s.u && !s.u.dv) s.u.dv = { t: DV.up - (UL.rise - 0.05), x0: s.u.x, y0: s.u.y, x1: x + (h.dir < 0 ? 50 : -50), y1: y - 8 };   // 와이번도 함께 내려온다(그림만)
  s.ults.push({ t: 0, i: 0, x, y, k, sync, cast: E.cast(h, "ult"), base: E.base(h), map: h.map, xp: 0, moved: 0, first: 0, last: 0, crack: 0 });
  hold(E, h, UL.rise);
  s.air = { k: "ult", t: 0 };
  const life = (sync ? UL.crack : UL.last) + UL.tail;
  E.fx(g, h.map, { kind: "sk_wy_ult", x, y, x0: Math.round(h.x), y0: Math.round(h.y), r: UL.r, temp: s.u ? 0 : 1, sync: sync ? 1 : 0, aw: k > 1 ? 1 : 0,
    pi: h.pi, t: life, life, snd: "wyUlt" });
  call(E, g, h, k > 1 ? `${UL.name} ×${k}` : UL.name, FIRE);
}
function tickUlt(E, g, h, q, dt) {
  q.t += dt;
  const hitAll = (mul) => { for (const o of foes(E, g, h, q.x, q.y, UL.r, q.map)) strike(E, g, h, q, o, mul); };
  if (!q.moved && q.t >= UL.rise) { q.moved = 1; E.move(h, { x: q.x, y: q.y }, UL.first - UL.rise); }
  if (!q.first && q.t >= UL.first) { q.first = 1; h.x = q.x; h.y = q.y; h.dash = 0; hitAll(UL.firstMul); g.shake = Math.max(g.shake || 0, 0.4); }
  while (q.i < UL.n && q.t >= UL.b0 + q.i * UL.bGap) { q.i += 1; hitAll(UL.bMul); g.shake = Math.max(g.shake || 0, 0.15); }
  if (!q.last && q.t >= UL.last) { q.last = 1; hitAll(UL.lastMul); g.shake = Math.max(g.shake || 0, 0.55);
    E.fx(g, q.map, { kind: "call", x: q.x, y: q.y - 130, text: `×${r1((UL.firstMul + UL.bMul * UL.n + UL.lastMul) * q.k)}`, color: FIRE, who: h.pi, t: 1.1, life: 1.1 }); }
  if (q.sync && !q.crack && q.t >= UL.crack) { q.crack = 1; hitAll(UL.crackMul); }   // 진룡 동조 — 화염 균열 한 번(같은 시전)
  if (!q.last || (q.sync && !q.crack)) return true;
  if (q.xp) trainXp(E, g, h, 2);                     // 천공 연마(정한 해석)
  return false;
}

/* ── 천공강습 — 돌진하며 둘레를 벤다(1부 요약, 수치는 정한 값) ── */
function assaultUse(E, g, h) {
  if (blocked(E, g, h, "assault")) return;
  const s = st(h), [ax, ay] = aimDir(E, g, h, AS.len), len = Math.max(0, wallCut(E, h, ax, ay, AS.len) - 10);
  spend(s, "assault"); s.cd.assault = AS.cd;
  const p = { x: h.x + ax * len, y: h.y + ay * len * E.squash }; E.keep(p, h.map);
  E.stop(h); E.move(h, p, AS.time);
  s.dashes.push({ t: 0, i: 0, cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0 });
  swingOf(s, "spin", AS.time + 0.1, ax, ay);
  h.swing = AS.time;
  E.fx(g, h.map, { kind: "sk_wy_assault", x: Math.round(h.x), y: Math.round(h.y), x0: Math.round(h.x), y0: Math.round(h.y), x1: Math.round(p.x), y1: Math.round(p.y),
    r: AS.r, n: AS.n, d: AS.time, pi: h.pi, t: AS.time + 0.4, life: AS.time + 0.4, snd: "wyDash" });
  call(E, g, h, AS.name);
}
function tickDash(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < AS.n && q.t >= (q.i + 1) * (AS.time / AS.n)) {
    q.i += 1;
    for (const o of foes(E, g, h, h.x, h.y, AS.r, q.map)) {
      strike(E, g, h, q, o, AS.mul);
      E.fx(g, q.map, { kind: "sk_wy_hit", x: Math.round(o.x), y: Math.round(o.y), pi: h.pi, t: 0.3, life: 0.3 });
    }
  }
  if (q.i < AS.n) return true;
  if (q.xp) trainXp(E, g, h, 2);                     // 천공 연마(정한 해석)
  return false;
}

/* ── 아르카디온 · 용참섬멸 — 두 번 돌진해 가로로 벤다(1부 요약, 수치는 정한 값) ── */
function arcadionUse(E, g, h) {
  if (!wyArmed(h)) { no(E, g, h, "아르카디온을 들어야 합니다", RED); return; }   // 11월 18일 사용자 — 손에 드는 무기
  if (blocked(E, g, h, "arcadion")) return;
  const s = st(h), [ax, ay] = aimDir(E, g, h, AR.hits[0].go + AR.hits[1].go);
  spend(s, "arcadion"); s.cd.arcadion = AR.cd;
  s.arcs.push({ t: 0, i: 0, sw: 0, ax, ay, cast: E.cast(h), base: E.base(h), k: skillK(s), map: h.map, xp: 0 });
  E.fx(g, h.map, { kind: "sk_wy_blade", x: Math.round(h.x), y: Math.round(h.y), ax: r2(ax), ay: r2(ay), pi: h.pi, t: AR.hits[1].at + AR.hits[1].time + AR.tail, life: AR.hits[1].at + AR.hits[1].time + AR.tail, snd: "wyBlade" });
  call(E, g, h, AR.name, FIRE);
}
function tickArc(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < AR.hits.length && q.t >= AR.hits[q.i].at) {   // 돌진 시작
    const H = AR.hits[q.i], ahead = inFan(E, g, h, h.x, h.y, q.ax, q.ay, H.go + H.r, AR.arc * 0.5, q.map)[0];   // 앞에 적이 있으면 그 앞까지만
    const stop = ahead ? Math.max(0, ahead.d * ahead.dot - AR.stop) : H.go, go = Math.max(0, Math.min(H.go, stop, wallCut(E, h, q.ax, q.ay, H.go) - 10));
    const p = { x: h.x + q.ax * go, y: h.y + q.ay * go * E.squash }; E.keep(p, h.map);
    E.stop(h); E.move(h, p, H.time);
    h.swing = H.time + 0.1;
    swingOf(st(h), q.i ? "a2" : "a1", H.time + 0.16, q.ax, q.ay);
    q.i += 1;
  }
  while (q.sw < q.i && q.t >= AR.hits[q.sw].at + AR.hits[q.sw].time) {   // 돌진 끝에 가로 베기
    const H = AR.hits[q.sw]; q.sw += 1;
    for (const p of inFan(E, g, h, h.x, h.y, q.ax, q.ay, H.r, AR.arc, q.map)) {
      strike(E, g, h, q, p.o, H.mul);
      E.fx(g, q.map, { kind: "sk_wy_hit", x: Math.round(p.o.x), y: Math.round(p.o.y), big: q.sw > 1 ? 1 : 0, pi: h.pi, t: 0.32, life: 0.32 });
    }
    E.fx(g, q.map, { kind: "sk_wy_arc", x: Math.round(h.x), y: Math.round(h.y), ax: r2(q.ax), ay: r2(q.ay), r: H.r, arc: r2(AR.arc), i: q.sw, pi: h.pi, t: 0.4, life: 0.4, snd: q.sw > 1 ? "wyBoom" : "wyClaw" });
    g.shake = Math.max(g.shake || 0, q.sw > 1 ? 0.22 : 0.1);
  }
  if (q.sw < AR.hits.length) return true;
  if (q.xp) trainXp(E, g, h, 1);                     // 용혈 연마(정한 해석 — 용혈로 빚은 칼)
  return false;
}

/* ── 입력 — req = { op: "use", s: 스킬 } ────────────── */
const USE = { contract: contractUse, roar: roarUse, dive: diveUse, scale: scaleUse, sky: skyUse, awake: awakeUse, ult: ultUse, assault: assaultUse, arcadion: arcadionUse };
export function wyvernInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object" || !wyvernOn(h)) return false;
  if (req.op === "use" && Object.prototype.hasOwnProperty.call(USE, req.s)) USE[req.s](E, g, h);
  return false;
}

/* ── 시간 ─────────────────────────────────────────── */
export function tickWyvernJob(E, g, h, dt) {
  if (!wyvernOn(h)) { if (h.wy) h.wy = null; return; }
  const s = st(h);
  for (const k in s.cd) if (k !== "contract" || !s.u) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  if (s.sw) { s.sw.t += dt; if (s.sw.t >= s.sw.d) s.sw = null; }
  if (s.air) { s.air.t += dt; if (s.air.t >= (s.air.k === "ult" ? UL.first : DV.land)) s.air = null; }
  if (s.aw > 0) { s.aw = Math.max(0, s.aw - dt); if (s.aw <= 0) { s.aw = 0.0001; endAwake(E, g, h, s); } }
  if (s.sc) { s.sc.t += dt; s.sc.gap = Math.max(0, s.sc.gap - dt); if (s.sc.t >= SC.dur) endScale(E, g, h, s); }
  const here = (q) => q.map === h.map;
  s.claws = s.claws.filter((c) => here(c) && stepClaw(E, g, h, c, dt));
  s.roars = s.roars.filter((q) => here(q) && tickRoar(E, g, h, q, dt));
  s.dives = s.dives.filter((q) => here(q) && tickDive(E, g, h, q, dt));
  s.skies = s.skies.filter((q) => here(q) && tickSky(E, g, h, q, dt));
  s.ults = s.ults.filter((q) => here(q) && tickUlt(E, g, h, q, dt));
  s.dashes = s.dashes.filter((q) => here(q) && tickDash(E, g, h, q, dt));
  s.arcs = s.arcs.filter((q) => here(q) && tickArc(E, g, h, q, dt));
  if (s.u) {
    tickWyvern(E, g, h, s, dt);
    if (s.u && s.u.t >= s.u.dur) endWyvern(E, g, h, s, "time");
  }
}
// 쓰러졌다 — 용혈 0 · 와이번 · 변신 · 용린 · 예약 타격을 걷는다(기획안 "사망 시 0 · 와이번 정리")
export function wyvernDown(E, g, h) {
  if (!wyvernOn(h) || !h.wy) return;
  const s = h.wy;
  endWyvern(E, g, h, s, "down");
  endAwake(E, g, h, s, true);
  s.sc = null; s.blood = 0; s.air = null;
  s.claws = []; s.roars = []; s.dives = []; s.skies = []; s.ults = []; s.dashes = []; s.arcs = [];
}
// 훈련장 · 연습장 "스택 가득" — 용혈을 가득
export function wyvernFill(h) { if (wyvernOn(h)) st(h).blood = WV.blood; }

/* ── 화면 값 — 그림 · 칸이 쓰는 모양 ── */
const airOf = (s) => {
  const a = s && s.air; if (!a) return 0;
  if (a.k === "dive") return a.t < DV.up ? DV.rise * (a.t / DV.up) : DV.rise * Math.max(0, 1 - ((a.t - DV.up) / (DV.land - DV.up)) ** 2);
  if (a.t < UL.rise) return 0;
  const u = (a.t - UL.rise) / (UL.first - UL.rise);
  return u < 0.55 ? 200 * (u / 0.55) : 200 * Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2);
};
// 입 자리(땅 기준) — 나는 중이면 날개 시트 입, 앉았으면 앉은 시트 입(반쯤 넘으면 앉은 그림)
const mouthOf = (u) => (u.land || 0) >= 0.5 ? [CT.sit.mouth[0], CT.sit.mouth[1] - Math.round(CT.hz * (1 - u.land))] : [CT.mouth[0], CT.mouth[1] - Math.round(CT.hz * (1 - (u.land || 0)))];
const unitView = (u) => {
  let hz = CT.hz, x = u.x, y = u.y;
  if (u.t < CT.appear) hz = CT.hz * (0.4 + 0.6 * (u.t / CT.appear));
  if (u.dv) {
    const t = u.dv.t;
    hz = t < DV.up ? CT.hz + 90 * (t / DV.up) : t < DV.land ? (CT.hz + 90) * (1 - (t - DV.up) / (DV.land - DV.up)) + 10 : 10 + (CT.hz - 10) * Math.min(1, (t - DV.land) / (DV.end - DV.land));
  }
  hz *= 1 - (u.land || 0);   // 내려앉는 만큼 낮게(앉은 그림의 기준점은 땅)
  return { x, y, hz: Math.round(hz), sit: Math.round((u.land || 0) * 100) / 100, t: r1(u.t), left: r1(Math.max(0, u.dur - u.t)), f: r1(Math.min(9, u.f)), fl: u.fl, dv: u.dv ? 1 : 0 };
};
export function wyvernView(h) {
  if (!h || !wyvernOn(h)) return null;
  const J = jobOf(h), s = h.wy, sum = wyTrainSum(J);
  return { blood: s ? s.blood : WV.bloodStart, max: WV.blood, lv: J.lv, xp: J.xp, tr: J.tr, cd: s ? { ...s.cd } : { ...NO_CD },
    cdMax: Object.fromEntries(Object.keys(NO_CD).map((k) => [k, WY_SKILLS[k].cd])),
    u: s && s.u ? unitView(s.u) : null, aw: s ? r1(s.aw) : 0, awMax: s ? s.awMax : 0, sc: s && s.sc ? { left: r1(SC.dur - s.sc.t), n: SC.counters - s.sc.n } : null,
    air: Math.round(airOf(s)), sync: sum >= WV.sync, wing: sum >= WV.tint.wing, tint: wyvernTint(sum),
    arm: wyArmed(h) ? 1 : 0, sw: s && s.sw ? { k: s.sw.k, u: r2(Math.min(1, s.sw.t / s.sw.d)), ax: s.sw.ax, ay: s.sw.ay } : null };
}
