/* ── 히든 직업 BLOOD-001 판정 — 혈량 · 혈흔 · 적혈탄(11월 14일 1단계) ─────────────
   수치는 bloodJobData.js. 방장 · 전용 서버만 판정한다. 화면은 스냅샷 영웅 줄 56(packBloodJob)과 연출(fx)만 그린다.
   피해는 기존 strikeAny 를 거치므로 결투(duelBalance.js 시전별 상한) · 사냥터 PvP 상한이 그대로 걸린다. 한 시전의 모든 타가 같은 시전 객체를 쓴다.
   크림슨 레퀴엠(bloodGunCombat.js) 혈흔과는 따로 센다 — 여기 혈흔은 h.bd.mk 에만 있고 주인 화면에만 보인다.
   저장 값 bag.bd = { on 해금, lv 직업 레벨, xp, tr [[연마 레벨, 경험치] × 3], b 혈량 }. 필드는 뒤에만 더한다.
   E(엔진, rpg.js bloodJobEngine): fx · say · sys · near · strike · alive · base · face · aim · locked · fight(싸울 수 있는지 까닭) ·
   squash · blocks · cast(새 시전 객체) · dummy · cdOff */
import { BLOOD, BLOOD_SHOT as S, BLOOD_TINT, TRAIN_UNLOCK, TRAIN_NAMES, BLOOD_NAME } from "./bloodJobData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));

/* ── 저장 값 ───────────────────────────────────────── */
export function cleanBd(d) {
  if (!d || typeof d !== "object" || !d.on) return d && typeof d === "object" && d.lv ? { ...cleanBdCore(d), on: 0 } : null;
  return { ...cleanBdCore(d), on: 1 };
}
function cleanBdCore(d) {
  const lv = clampN(d.lv, 1, BLOOD.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, BLOOD.train.max);
    return [l, l >= BLOOD.train.max ? 0 : clampN(q[1], 0, trainNeed(l) - 1)];
  });
  return { lv, xp: lv >= BLOOD.maxLv ? 0 : clampN(d.xp, 0, jobNeed(lv) - 1), tr, b: Math.max(0, Math.min(BLOOD.abs, Math.round(Number(d.b) || 0))) };
}
export const bloodOn = (h) => !!(h && h.bag && h.bag.bd && h.bag.bd.on);
export const jobNeed = (lv) => BLOOD.xp.base + BLOOD.xp.per * lv;
export const trainNeed = (l) => BLOOD.train.base + BLOOD.train.per * l;
export const stableCap = (lv) => Math.min(BLOOD.capMax, BLOOD.capBase + Math.max(1, lv) - 1);
// 영구 연마 합계와 색 — 과충전의 임시 레벨(3단계)은 넣지 않는다
export const trainSum = (bd) => (bd ? bd.tr.reduce((s, q) => s + q[0], 0) : 0);
export const bloodTint = (sum) => BLOOD_TINT.find((t) => sum >= t.from).id;
// 해금한 연마인가(직업 레벨)
export const trainOpen = (bd, i) => !!bd && bd.lv >= TRAIN_UNLOCK[i];

// 해금 — 1차 전직을 비우고(사용자 결정) 직업 레벨 1 · 혈량 50 으로 시작한다. 예전에 해금했던 기록(되돌린 뒤 다시)은 레벨 · 연마를 그대로 쓴다
export function unlockBlood(h) {
  const old = h.bag.bd;
  h.bag.bd = old ? { ...cleanBdCore(old), on: 1 } : { on: 1, lv: 1, xp: 0, tr: [[0, 0], [0, 0], [0, 0]], b: BLOOD.start };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null;
  h.bag.v += 1;
}
// 전직 초기화 물약 — BLOOD-001 을 끈다. 직업 레벨 · 연마는 남긴다(다시 해금하면 이어서)
export function dropBlood(h) {
  if (!h.bag.bd) return;
  h.bag.bd = { ...cleanBdCore(h.bag.bd), on: 0 };
  h.bd = null;
  h.bag.v += 1;
}

/* ── 싸우는 동안의 상태 h.bd ───────────────────────── */
function st(h) {
  return h.bd || (h.bd = { cd: { shot: 0, conv: 0 }, ch: null, mk: {}, sh: [], gT: -1, xm: [0, 0], q: 0 });
}
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
export const bloodAmt = (h) => (bloodOn(h) ? h.bag.bd.b : 0);
export const bloodCap = (h) => (bloodOn(h) ? stableCap(h.bag.bd.lv) : 0);

// 혈량을 얻는다 — 안정 상한까지(over 는 혈역 증폭, 3단계). 이미 상한 이상이면 새 몫만 버린다. 실제로 늘어난 양을 돌려준다
export function gainBlood(h, n, over = false) {
  if (!bloodOn(h) || !(n > 0)) return 0;
  const bd = h.bag.bd, top = over ? BLOOD.abs : stableCap(bd.lv);
  if (bd.b >= top) return 0;
  const got = Math.min(n, top - bd.b);
  bd.b += got;
  return got;
}
function spend(h, n) { const bd = h.bag.bd; bd.b = Math.max(0, bd.b - n); }

/* ── 경험치 ─────────────────────────────────────────── */
// 직업 레벨 — 1분 perMin 까지. 오르면 bag.v 를 올려 손님 가방에도 간다
function jobXp(E, g, h, n) {
  const bd = h.bag.bd, s = st(h);
  if (bd.lv >= BLOOD.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, BLOOD.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n;
  bd.xp += n;
  let up = 0;
  while (bd.lv < BLOOD.maxLv && bd.xp >= jobNeed(bd.lv)) { bd.xp -= jobNeed(bd.lv); bd.lv += 1; up = 1; }
  if (bd.lv >= BLOOD.maxLv) bd.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${BLOOD_NAME} 직업 레벨 ${bd.lv}`, color: "#E53945", t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
  TRAIN_UNLOCK.forEach((at, i) => { if (bd.lv === at && i > 0) E.sys(g, h.pi, `${TRAIN_NAMES[i]} 연마가 열렸습니다.`); });
}
// 연마 경험치 — 해금한 연마만. 시전당 한 번(부른 쪽이 센다)
export function trainXp(E, g, h, i, n) {
  const bd = h.bag.bd;
  if (!trainOpen(bd, i) || !(n > 0)) return;
  const q = bd.tr[i];
  if (q[0] >= BLOOD.train.max) return;
  q[1] += n;
  let up = 0;
  while (q[0] < BLOOD.train.max && q[1] >= trainNeed(q[0])) { q[1] -= trainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= BLOOD.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${TRAIN_NAMES[i]} 연마 ${q[0]}`, color: "#ff9aa4", t: 1.2, life: 1.2, who: h.pi });
}
// 몹을 잡았다 — 친 사람 가운데 BLOOD-001 인 사람마다. 허수아비 · 소환물은 세지 않는다
export function bloodJobKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? BLOOD.xp.raid : BLOOD.xp.boss) : BLOOD.xp.mob;
  for (const h of got) if (bloodOn(h)) jobXp(E, g, h, n);
}
export const bloodRaidKill = (E, g, h) => { if (bloodOn(h)) jobXp(E, g, h, BLOOD.xp.raid); };

/* ── 혈흔 · 평타 ───────────────────────────────────── */
// 평타가 맞았다(weaponOnHit basic) — 공격 한 번에 혈량 +2 한 번 · 맞은 대상마다 혈흔 1중첩(최대 5 · 10초, 새로 부여하면 갱신)
export function bloodJobOnHit(E, g, h, o, { basic, side }) {
  if (!basic || side || !o || !bloodOn(h)) return;
  const s = st(h);
  if (s.gT !== g.t) { s.gT = g.t; gainBlood(h, BLOOD.basicGain); }
  const k = keyOf(o), m = s.mk[k] || (s.mk[k] = [0, 0]);
  m[0] = Math.min(BLOOD.mark.max, m[0] + 1); m[1] = BLOOD.mark.dur;
}
// 혈흔 거두기 — 첫 유효 적중의 피해를 셈한 뒤 모두 소비하고 중첩당 혈량 +3. 실이 돌아오는 연출(그림만)
function reap(E, g, h, o) {
  const s = st(h), k = keyOf(o), m = s.mk[k];
  if (!m) return 0;
  delete s.mk[k];
  const got = gainBlood(h, m[0] * BLOOD.mark.back);
  E.fx(g, h.map, { kind: "sk_bj_reap", x: o.x, y: o.y, x1: h.x, y1: h.y, n: m[0], got, pi: h.pi, t: 0.45, life: 0.45, who: h.pi });
  return m[0];
}
const markBonus = (h, o) => { const m = st(h).mk[keyOf(o)]; return m ? Math.min(BLOOD.mark.max, m[0]) * BLOOD.mark.per : 0; };

/* ── 적혈탄 ─────────────────────────────────────────── */
const pressLv = (h) => h.bag.bd.tr[0][0];
// 누른 시간 t 와 지금 혈량으로 쏠 단계(못 쏘면 -1)
export function shotTier(t, b) {
  let tier = -1;
  S.tiers.forEach((q, i) => { if (t + 1e-6 >= q.at && b >= q.cost) tier = i; });
  return tier;
}
// 누른 시간만 본 단계 — 혈량이 모자라 낮은 단계로 쏘게 되면 화면이 "혈량 부족 — 1단계 발사" 를 보인다
export const shotTimeTier = (t) => S.tiers.reduce((a, q, i) => (t + 1e-6 >= q.at ? i : a), 0);

function why(E, g, h) {
  if (!bloodOn(h)) return "BLOOD-001 만 쓸 수 있습니다";
  if (h.down > 0 || E.locked(h)) return "-";
  return E.fight(h) || "";
}
function shotPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.ch) return;                                  // 한 번 누름에 한 번
  if (s.cd.shot > 0) return void E.say(g, h.map, h.x, h.y - 90, `${S.name} ${Math.ceil(s.cd.shot)}초`, "#f0dcb4");
  if (h.bag.bd.b < S.need) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const [ax, ay] = E.face(h);
  s.ch = { s: "shot", t: 0, ax: r2(ax), ay: r2(ay), ptr: h.inputAim ? 1 : 0, hT: 0, tier: 0 };
  s.q += 1;
  E.fx(g, h.map, { kind: "sk_bj_charge", x: h.x, y: h.y, pi: h.pi, ax, ay, u: 0, tier: 0, t: S.hint + 0.08, life: S.hint + 0.08, snd: "bloodCharge" });
}
function aimTo(h, c, a) {
  c.ax = r2(a[0]); c.ay = r2(a[1]);
  if (c.ax) h.dir = c.ax < 0 ? -1 : 1;
  h.face = c.ay < -0.5 ? 2 : Math.abs(c.ax) > 0.35 ? 1 : 0;
  h.look = [c.ax, c.ay]; h.lookF = h.face;
}
// 놓았다 — 누른 시간과 혈량을 모두 만족하는 가장 높은 단계로 쏜다(그 단계 비용만)
function shotRelease(E, g, h, cancel) {
  const s = st(h), c = s.ch;
  if (!c || c.s !== "shot") return;
  if (cancel) return void cancelCharge(E, g, h);
  if (c.ptr && h.inputAim) aimTo(h, c, h.inputAim);
  fireShot(E, g, h);
}
export function cancelCharge(E, g, h, quiet = false) {
  const s = h.bd; if (!s || !s.ch) return;
  if (!quiet) E.fx(g, h.map, { kind: "sk_bj_fizz", x: h.x, y: h.y, ax: s.ch.ax, ay: s.ch.ay, pi: h.pi, t: 0.35, life: 0.35 });
  s.ch = null;
}
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 본탄은 벽을 뚫지 않는다
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
function fireShot(E, g, h) {
  const s = st(h), c = s.ch, bd = h.bag.bd;
  s.ch = null;
  const tier = shotTier(c.t, bd.b);
  if (tier < 0) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const T = S.tiers[tier], lv = pressLv(h);
  const [ax, ay] = c.ptr ? [c.ax, c.ay] : E.aim(g, h, T.range);   // 포인터로 겨눈 시전은 놓는 순간의 방향 그대로
  // 공격 보너스는 발동 직전 값으로 확정한 뒤 비용을 낸다(연출및세부사항)
  const strAdd = tier > 0 ? S.strPer * lv : 0;
  const sp1 = tier > 0 && lv >= S.sp1, sp2 = tier === 2 && lv >= S.sp2;
  const shot = {
    fid: `bj${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), d: 0, max: wallCut(E, h, ax, ay, T.range), v: sp1 ? S.vFast : S.v,
    left: sp1 ? S.pierce : 1, hit: [], tier, mul: T.mul, add: strAdd * S.strDmg, burst: sp2 ? 1 : 0, cast: E.cast(h), base: E.base(h), xp: 0, map: h.map,
  };
  spend(h, T.cost);
  s.cd.shot = S.cd;
  s.sh.push(shot);
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_bj_shot", x: h.x, y: h.y, x0: h.x, y0: h.y - S.lift, ax: shot.ax, ay: shot.ay, len: shot.max, v: shot.v, tier, fast: sp1 ? 1 : 0, pierce: sp1 ? 1 : 0,
    fid: shot.fid, pi: h.pi, t: shot.max / shot.v + 0.12, life: shot.max / shot.v + 0.12, snd: "bloodShot" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: tier ? `${S.name} ${tier}단계` : S.name, color: "#E53945", who: h.pi, t: 0.7, life: 0.7 });
}
function strike(E, g, h, shot, o, mul) {
  const prev = h.cast; h.cast = shot.cast;
  try { E.strike(g, h, o, shot.base * mul); } finally { h.cast = prev; }
  if (!E.dummy(o)) shot.xp = 1;                      // 유효 적중 — 훈련용 대상은 연마 경험치를 주지 않는다
}
function burst(E, g, h, shot, x, y) {
  const R = S.burstR * (1 + ampBonus(h));
  E.near(g, h, x, y, R).forEach((o) => { if (E.alive(g, h, o, shot.map)) strike(E, g, h, shot, o, S.burstMul); });
  g.shake = Math.max(g.shake || 0, 0.25);
  E.fx(g, h.map, { kind: "sk_bj_burst", x, y, r: R, pi: h.pi, t: 0.4, life: 0.4, snd: "bloodBoom" });
}
// 증폭형 연마 — 1레벨당 혈수 강타 폭 · 적혈탄 팽창 반경 +0.5%(최대 +25%)
const ampBonus = (h) => h.bag.bd.tr[1][0] * 0.005;
// 날아가는 본탄 — 한 틱 동안 지나간 길에 닿은 적을 가까운 차례로(대상당 한 번)
function stepShot(E, g, h, shot, dt) {
  const from = shot.d, to = Math.min(shot.max, shot.d + shot.v * dt);
  shot.d = to;
  const list = E.near(g, h, shot.x, shot.y, to + 60).filter((o) => E.alive(g, h, o, shot.map) && !shot.hit.includes(keyOf(o))).map((o) => {
    const dx = o.x - shot.x, dy = (o.y - shot.y) / E.squash;
    return { o, along: dx * shot.ax + dy * shot.ay, side: Math.abs(dx * shot.ay - dy * shot.ax) };
  }).filter((q) => q.along >= from - 20 && q.along <= to + 4 && q.side <= S.dia / 2 + (q.o.rad || 16) * 0.5).sort((a, b) => a.along - b.along);
  for (const { o, along } of list) {
    if (shot.left <= 0) break;
    const k = keyOf(o);
    shot.hit.push(k);
    shot.left -= 1;
    strike(E, g, h, shot, o, shot.mul * (1 + shot.add + markBonus(h, o)));   // 혈흔 보너스는 맞기 직전 중첩으로
    reap(E, g, h, o);
    E.fx(g, h.map, { kind: "sk_bj_hit", x: o.x, y: o.y, pi: h.pi, tier: shot.tier, t: 0.3, life: 0.3, snd: shot.hit.length === 1 ? "bloodHit" : undefined });
    if (shot.burst && shot.hit.length === 1) burst(E, g, h, shot, o.x, o.y);   // 첫 적중 자리에서만 · 두 번째 관통 대상에서는 다시 터지지 않는다
    if (shot.left <= 0) { shot.d = Math.max(from, Math.min(to, along)); break; }
  }
  return shot.left > 0 && shot.d < shot.max;
}

/* ── 혈량 전환 ─────────────────────────────────────── */
function convert(E, g, h) {
  if (!bloodOn(h) || h.down > 0) return;
  const s = st(h), bd = h.bag.bd;
  if (s.cd.conv > 0) return;
  if (bd.b >= stableCap(bd.lv)) return void E.say(g, h.map, h.x, h.y - 90, "혈량이 안정 상한입니다", "#d9c9a6");
  const cost = Math.ceil(h.max * BLOOD.convert.hp);
  if (h.hp - cost < 1) return void E.say(g, h.map, h.x, h.y - 90, "체력이 모자랍니다", "#ff8a8a");
  h.hp -= cost;
  const got = gainBlood(h, BLOOD.convert.gain);
  s.cd.conv = BLOOD.convert.cd;
  E.fx(g, h.map, { kind: "sk_bj_conv", x: h.x, y: h.y, pi: h.pi, hp: cost, got, t: 0.6, life: 0.6, snd: "bloodCharge", who: h.pi });
}

/* ── 입력 — req = { op: "press" | "release" | "cancel", s: "shot" } · { op: "convert" } · { op: "aim" } ── */
export function bloodJobInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object") return false;
  if (req.op === "convert") return void convert(E, g, h);
  if (!bloodOn(h)) return void E.sys(g, pi, `${BLOOD_NAME} 만 쓸 수 있습니다.`);
  if (req.s !== "shot") return false;
  if (req.op === "press") return void shotPress(E, g, h);
  if (req.op === "release" || req.op === "cancel") return void shotRelease(E, g, h, req.op === "cancel");
  if (req.op === "aim") { const c = h.bd && h.bd.ch; if (c && c.ptr && h.inputAim) aimTo(h, c, h.inputAim); }
  return false;
}
// 차징 중 마우스 포인터 방향(waim) — 크림슨 레퀴엠과 같은 입력을 함께 쓴다
export function bloodJobAim(h) { const c = h && h.bd && h.bd.ch; if (c && c.ptr && h.inputAim) aimTo(h, c, h.inputAim); }
export const bloodJobAimLock = (h) => !!(h && h.bd && h.bd.ch && h.bd.ch.ptr);
export const bloodJobSlow = (h) => (h && h.bd && h.bd.ch ? 1 - S.slow : 1);

/* ── 시간 ─────────────────────────────────────────── */
export function tickBloodJob(E, g, h, dt) {
  if (h.bdv) h.bdv = null;                           // 손님이던 세계가 판정 세계가 됐다(방장 승계) — 화면 값은 판정 상태에서 읽는다
  if (!bloodOn(h)) { if (h.bd) h.bd = null; return; }
  const s = st(h);
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  for (const k of Object.keys(s.mk)) {                 // 혈흔 — 시간 만료 · 대상이 사라지면 지운다(회수 없음)
    const m = s.mk[k], o = find(g, k);
    m[1] -= dt;
    if (m[1] <= 0 || !o || (o.type ? o.dead || o.map !== h.map : o.down > 0 || o.map !== h.map)) delete s.mk[k];
  }
  const c = s.ch;
  if (c) {
    if (h.down > 0 || E.locked(h) || E.fight(h)) cancelCharge(E, g, h);
    else {
      c.t += dt;
      if (c.ptr) aimTo(h, c, [c.ax, c.ay]);
      const tier = shotTier(c.t, h.bag.bd.b), ping = tier > c.tier;
      c.hT -= dt;
      if (ping || c.hT <= 0) {
        c.hT = S.hint; c.tier = Math.max(c.tier, tier);
        E.fx(g, h.map, { kind: "sk_bj_charge", x: h.x, y: h.y, pi: h.pi, ax: c.ax, ay: c.ay, u: r2(Math.min(1, c.t / S.full)), tier: Math.max(0, tier),
          t: S.hint + 0.08, life: S.hint + 0.08, ...(ping ? { ping: tier, snd: tier >= 2 ? "bloodBoom" : "bloodHit" } : {}) });
      }
      if (c.t >= S.full) fireShot(E, g, h);          // 최대 1.6초 — 자동 발사(계속 누르고 있어도 다시 쏘지 않는다)
    }
  }
  if (s.sh.length) {
    s.sh = s.sh.filter((shot) => {
      if (shot.map !== h.map) return false;          // 맵을 옮기면 사라진다 — 쓰러져도 이미 쏜 탄은 날아간다
      const going = stepShot(E, g, h, shot, dt);
      if (!going) {
        E.fx(g, shot.map, { kind: "cut", ref: shot.fid });
        if (shot.left > 0) E.fx(g, shot.map, { kind: "sk_bj_end", x: shot.x + shot.ax * shot.d, y: shot.y + shot.ay * shot.d * E.squash, pi: h.pi, t: 0.25, life: 0.25 });
        if (shot.xp) trainXp(E, g, h, 0, BLOOD.train.cast);   // 압축형 — 본탄 · 팽창이 유효 적중하면 시전당 +10
      }
      return going;
    });
  }
}
// 쓰러졌다 — 상태를 풀고 혈량 0(이미 쏜 탄은 그대로 날아간다)
export function bloodJobDown(E, g, h) {
  if (!bloodOn(h)) return;
  const s = st(h);
  s.ch = null; s.mk = {};
  h.bag.bd.b = 0;
}
// 훈련장 · 테스트 서버 "스택 가득" — 혈량을 안정 상한까지
export function bloodJobFill(h) { if (bloodOn(h)) h.bag.bd.b = Math.max(h.bag.bd.b, stableCap(h.bag.bd.lv)); }

/* ── 스냅샷 줄 56 — [혈량, 직업 레벨, 경험치, 연마 [l, x] × 3 펼침, 대기 [적혈탄, 전환], 차징 [단계 시간, x, y] | 0, 혈흔 [[키, 중첩, 남은 초]]] ── */
export function packBloodJob(h) {
  if (!bloodOn(h)) return 0;
  const bd = h.bag.bd, s = h.bd;
  return [Math.round(bd.b), bd.lv, bd.xp, bd.tr.flat(), s ? [r1(s.cd.shot), r1(s.cd.conv)] : [0, 0],
    s && s.ch ? [r2(s.ch.t), s.ch.ax, s.ch.ay] : 0,
    s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], r1(m[1])]) : []];
}
// 손님 — 화면에 쓰는 값만 h.bdv 로(판정 상태 h.bd 는 건드리지 않는다)
export function applyBloodJob(h, a) {
  if (!Array.isArray(a)) { h.bdv = null; return; }
  if (h.bag && h.bag.bd) h.bag.bd.b = Math.max(0, Math.min(BLOOD.abs, Number(a[0]) || 0));   // 방장 승계 때 지금 혈량을 이어받는다
  const tr = Array.isArray(a[3]) ? a[3] : [];
  h.bdv = { b: Number(a[0]) || 0, lv: Number(a[1]) || 1, xp: Number(a[2]) || 0, tr: [[tr[0] | 0, tr[1] | 0], [tr[2] | 0, tr[3] | 0], [tr[4] | 0, tr[5] | 0]],
    cd: Array.isArray(a[4]) ? { shot: +a[4][0] || 0, conv: +a[4][1] || 0 } : { shot: 0, conv: 0 },
    ch: Array.isArray(a[5]) ? { t: +a[5][0] || 0, ax: +a[5][1] || 0, ay: +a[5][2] || 0 } : null,
    mk: Array.isArray(a[6]) ? a[6].filter((m) => Array.isArray(m) && typeof m[0] === "string").map((m) => [m[0], m[1] | 0, +m[2] || 0]) : [], at: Date.now() };
}
// 화면 값 — 방장(판정 세계)은 h.bag.bd · h.bd 에서, 손님은 h.bdv 에서 같은 모양으로
export function bloodView(h) {
  if (!h) return null;
  if (h.bdv) return h.bdv;
  if (!bloodOn(h)) return null;
  const bd = h.bag.bd, s = h.bd;
  return { b: bd.b, lv: bd.lv, xp: bd.xp, tr: bd.tr, cd: s ? s.cd : { shot: 0, conv: 0 }, ch: s && s.ch ? { t: s.ch.t, ax: s.ch.ax, ay: s.ch.ay } : null,
    mk: s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], m[1]]) : [] };
}
