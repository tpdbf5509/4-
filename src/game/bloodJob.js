/* ── 히든 직업 BLOOD-001 판정 — 혈량 · 혈흔 · 적혈탄(11월 14일 1단계) ─────────────
   수치는 bloodJobData.js. 방장 · 전용 서버만 판정한다. 화면은 스냅샷 영웅 줄 56(packBloodJob)과 연출(fx)만 그린다.
   피해는 기존 strikeAny 를 거치므로 결투(duelBalance.js 시전별 상한) · 사냥터 PvP 상한이 그대로 걸린다. 한 시전의 모든 타가 같은 시전 객체를 쓴다.
   크림슨 레퀴엠(bloodGunCombat.js) 혈흔과는 따로 센다 — 여기 혈흔은 h.bd.mk 에만 있고 주인 화면에만 보인다.
   저장 값 bag.bd = { on 해금, lv 직업 레벨, xp, tr [[연마 레벨, 경험치] × 3], b 혈량 }. 필드는 뒤에만 더한다.
   E(엔진, rpg.js bloodJobEngine): fx · say · sys · near · arc · strike · alive · base · face · aim · locked · fight(싸울 수 있는지 까닭) ·
   squash · blocks · cast(새 시전 객체) · dummy · cdOff · cc(경직 · 넉백) · boss(제압 면역)
   3단계(11월 14일): 혈량 상태(증폭 · 과충전 · 폭주 h.bd.rg · 탈진) · 혈역 증폭(h.bd.fd). 공격력은 rpg.js heroDmgMul 이 bloodJobAtk 를 곱한다
   2단계(11월 14일): 혈수 강타(h.bd.sm 내려칠 손) · 혈형 변환 — 혈검(h.bd.sw 세 번 베기) · 혈막(h.bd.vl 받는 피해 감소, hurtHero → bloodJobTake) */
import { BLOOD, BLOOD_SHOT as S, BLOOD_SMASH as M, BLOOD_FORM as F, BLOOD_STATE as Z, BLOOD_FIELD as FD, BLOOD_TINT, TRAIN_UNLOCK, TRAIN_NAMES, BLOOD_NAME } from "./bloodJobData.js";

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
  const s = h.bd || (h.bd = { cd: { shot: 0, conv: 0 }, ch: null, mk: {}, sh: [], gT: -1, xm: [0, 0], q: 0 });
  if (!s.sm) { s.sm = []; s.sw = null; s.vl = null; s.cd.smash = s.cd.smash || 0; s.cd.form = s.cd.form || 0; }   // 2단계 상태(앞선 판에서 만든 h.bd 에도 채운다)
  if (s.cd.field === undefined) { s.cd.field = 0; s.fd = null; s.rg = null; s.dw = 0; s.dA = 0; s.wo = 0; s.w175 = 0; }   // 3단계 상태
  return s;
}
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
export const bloodAmt = (h) => (bloodOn(h) ? h.bag.bd.b : 0);
export const bloodCap = (h) => (bloodOn(h) ? stableCap(h.bag.bd.lv) : 0);

// 혈량을 얻는다 — 안정 상한까지(over 는 혈역 증폭, 3단계). 이미 상한 이상이면 새 몫만 버린다. 실제로 늘어난 양을 돌려준다
export function gainBlood(h, n, over = false) {
  if (!bloodOn(h) || !(n > 0)) return 0;
  const bd = h.bag.bd, top = over && !(h.bd && h.bd.rg) ? BLOOD.abs : stableCap(bd.lv);   // 폭주 · 탈진 중에는 넘지 못한다
  if (bd.b >= top) return 0;
  const got = Math.min(n, top - bd.b);
  bd.b += got;
  return got;
}
function spend(h, n) { const bd = h.bag.bd; bd.b = Math.max(0, bd.b - n); }

/* ── 혈량 상태 — 안정 · 증폭 · 과충전 · 폭주 · 탈진 ───────────────── */
// rg = { k: 1 폭주 · 2 탈진, t: 남은 초 }
export function bloodMode(b, cap, rg) {
  if (rg && rg.k === 1) return "rage";
  if (rg && rg.k === 2) return "tired";
  if (b > Z.over.from) return "over";
  if (b > cap) return "amp";
  return "stable";
}
export const MODE_NAMES = { stable: "안정", amp: "증폭", over: "과충전", rage: "폭주", tired: "탈진" };
const modeOf = (h) => (bloodOn(h) ? bloodMode(h.bag.bd.b, stableCap(h.bag.bd.lv), h.bd && h.bd.rg) : "stable");
// 범위 · 피해 보너스(기본 배율에 더한다) — 발동 직전 값으로 정해 그 시전 끝까지 쓴다
const rangeAdd = (h) => { const m = modeOf(h); return m === "amp" ? Z.amp.range : m === "over" ? Z.over.range : 0; };
const dmgAdd = (h) => (modeOf(h) === "over" ? Z.over.dmg : 0);
// 계산용 연마 레벨 — 과충전이면 해금한 연마마다 +5(50까지). 특수 능력 해금은 영구 레벨(h.bag.bd.tr)만 본다
export const effTrain = (h, i) => { const bd = h.bag.bd, l = bd.tr[i][0]; return modeOf(h) === "over" && trainOpen(bd, i) ? Math.min(BLOOD.train.max, l + Z.over.train) : l; };
// 공격력 배율 — 폭주 +25% · 탈진 -15%(rpg.js heroDmgMul 이 곱한다: 평타 · 모든 스킬)
export const bloodJobAtk = (h) => { const rg = h && h.bd && h.bd.rg; return !rg ? 1 : 1 + (rg.k === 1 ? Z.rage.atk : Z.tired.atk); };
// 과부하 — 넘는 몫을 버리고 혈역 · 차징을 끊은 뒤 혈량 min(60, 안정 상한) · 6초 폭주
function overload(E, g, h) {
  const s = st(h), bd = h.bag.bd;
  if (s.ch) cancelCharge(E, g, h, true);
  if (s.fd) endField(E, g, h, "over");
  bd.b = Math.min(Z.rage.settle, stableCap(bd.lv));
  s.rg = { k: 1, t: Z.rage.dur };
  s.wo = 0; s.w175 = 0;
  g.shake = Math.max(g.shake || 0, 0.35);
  E.fx(g, h.map, { kind: "sk_bj_rage", x: h.x, y: h.y, pi: h.pi, start: 1, t: 0.6, life: 0.6, snd: "bloodBoom" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 120, text: "과부하 — 폭주", color: "#E53945", t: 1.2, life: 1.2 });
}

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
const pressLv = (h) => h.bag.bd.tr[0][0];           // 영구 레벨 — 특수 능력 해금
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
  if (s.ch && s.ch.s === "shot") return;            // 한 번 누름에 한 번
  breakFor(E, g, h, "shot");                         // 다른 차징 · 혈막을 먼저 끊고 새 스킬 조건을 본다
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
function shotRelease(E, g, h, cancel, sk = "shot") {
  const s = st(h), c = s.ch;
  if (!c || c.s !== sk) return;
  if (cancel) return void cancelCharge(E, g, h);
  if (c.ptr && h.inputAim) aimTo(h, c, h.inputAim);
  (sk === "smash" ? fireSmash : fireShot)(E, g, h);
}
export function cancelCharge(E, g, h, quiet = false) {
  const s = h.bd; if (!s || !s.ch) return;
  if (!quiet) E.fx(g, h.map, { kind: "sk_bj_fizz", x: h.x, y: h.y, ax: s.ch.ax, ay: s.ch.ay, pi: h.pi, sk: s.ch.s === "smash" ? 1 : 0, t: 0.35, life: 0.35 });
  s.ch = null;
}
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 본탄은 벽을 뚫지 않는다
// 가운데(x, y)에서 o 까지 벽이 막고 있나 — 혈수 강타 · 혈검은 벽 뒤로 피해가 넘어가지 않는다
function walled(E, map, x, y, o) {
  const dx = o.x - x, dy = (o.y - y) / E.squash, d = Math.hypot(dx, dy);
  return d > 8 && wallCut(E, { map, x, y }, dx / d, dy / d, d) < d - (o.rad || 16) * 0.5;
}
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
  if (tier >= 0) s.sw = null;                        // 다른 공격 스킬 발동 — 혈검의 남은 타격 취소
  if (tier < 0) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const T = S.tiers[tier], lv = pressLv(h);
  const [ax, ay] = c.ptr ? [c.ax, c.ay] : E.aim(g, h, T.range);   // 포인터로 겨눈 시전은 놓는 순간의 방향 그대로
  // 공격 보너스는 발동 직전 값으로 확정한 뒤 비용을 낸다(연출및세부사항)
  const strAdd = tier > 0 ? S.strPer * effTrain(h, 0) : 0;   // 과충전의 임시 +5 는 강도에만
  const sp1 = tier > 0 && lv >= S.sp1, sp2 = tier === 2 && lv >= S.sp2;
  const shot = {
    fid: `bj${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), d: 0, max: wallCut(E, h, ax, ay, T.range * (1 + rangeAdd(h))), v: sp1 ? S.vFast : S.v,
    left: sp1 ? S.pierce : 1, hit: [], tier, mul: T.mul, add: strAdd * S.strDmg + dmgAdd(h), burst: sp2 ? 1 : 0, bR: S.burstR * (1 + ampBonus(h) + rangeAdd(h)), cast: E.cast(h), base: E.base(h), xp: 0, map: h.map,
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
  const R = shot.bR || S.burstR;
  E.near(g, h, x, y, R).forEach((o) => { if (E.alive(g, h, o, shot.map)) strike(E, g, h, shot, o, S.burstMul); });
  g.shake = Math.max(g.shake || 0, 0.25);
  E.fx(g, h.map, { kind: "sk_bj_burst", x, y, r: R, pi: h.pi, t: 0.4, life: 0.4, snd: "bloodBoom" });
}
// 증폭형 연마 — 1레벨당 혈수 강타 폭 · 적혈탄 팽창 반경 +0.5%(최대 +25%)
const ampBonus = (h) => effTrain(h, 1) * 0.005;
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
    strike(E, g, h, shot, o, shot.mul * (1 + shot.add + markBonus(h, o)));   // 혈흔 보너스는 맞기 직전 중첩으로(팽창은 burstMul 만 — 혈흔 제외)
    reap(E, g, h, o);
    E.fx(g, h.map, { kind: "sk_bj_hit", x: o.x, y: o.y, pi: h.pi, tier: shot.tier, t: 0.3, life: 0.3, snd: shot.hit.length === 1 ? "bloodHit" : undefined });
    if (shot.burst && shot.hit.length === 1) burst(E, g, h, shot, o.x, o.y);   // 첫 적중 자리에서만 · 두 번째 관통 대상에서는 다시 터지지 않는다
    if (shot.left <= 0) { shot.d = Math.max(from, Math.min(to, along)); break; }
  }
  return shot.left > 0 && shot.d < shot.max;
}

/* ── 2단계 공통 ───────────────────────────────────── */
const shapeLv = (h) => effTrain(h, 2);
const shapeLock = (h) => (h.bag.bd.lv < BLOOD.unlock.shape ? `직업 레벨 ${BLOOD.unlock.shape}에 열립니다` : "");
// 새 공격 · 스킬을 누르면 — 다른 스킬 차징은 끊고(비용 · 대기 없음) 혈막은 먼저 끝낸다(연출및세부사항)
function breakFor(E, g, h, sk) {
  const s = st(h);
  if (s.ch && s.ch.s !== sk) cancelCharge(E, g, h);
  if (s.vl && sk !== "veil") endVeil(E, g, h, "break");
}
// 이 게임의 다른 입력(큰 기술 · 스킬 칸 · 무기 스킬 · 전직 스킬 · 대쉬 · 평타)이 들어왔다 — rpgInput 이 판정 앞에 부른다
export function bloodJobBreak(E, g, h, kind) {
  if (!bloodOn(h) || !h.bd) return;
  const s = h.bd;
  if (kind === "fire") { if (s.vl) endVeil(E, g, h, "break"); return; }
  if (s.ch) cancelCharge(E, g, h);
  if (s.vl) endVeil(E, g, h, "break");
  s.sw = null;
}

/* ── 혈수 강타 ─────────────────────────────────────── */
export function smashTier(t, b) {
  let tier = -1;
  M.tiers.forEach((q, i) => { if (t + 1e-6 >= q.at && b >= q.cost) tier = i; });
  return tier;
}
export const smashTimeTier = (t) => M.tiers.reduce((a, q, i) => (t + 1e-6 >= q.at ? i : a), 0);
// 실제 길이 · 폭 — 추가 소모 · 증폭형 연마(그리고 3단계의 상태 · 혈역 보너스)를 기본 폭 기준으로 더한다. 길이는 늘지 않는다
export function smashSize(h, tier) {
  if (!bloodOn(h)) return [M.len, Math.round(M.wid * (1 + M.tiers[Math.max(0, tier)].wide))];
  const r = rangeAdd(h), f = inField(h) ? FD.size : 0;   // 상태 범위는 길이 · 폭 모두, 혈역 크기 +20% 도 둘 다 · 추가 소모 · 증폭형은 폭만
  return [Math.round(M.len * (1 + r + f)), Math.round(M.wid * (1 + M.tiers[Math.max(0, tier)].wide + ampBonus(h) + r + f))];
}
function smashPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.ch && s.ch.s === "smash") return;
  breakFor(E, g, h, "smash");
  const lock = shapeLock(h);
  if (lock) return void E.say(g, h.map, h.x, h.y - 90, lock, "#d9c9a6");
  if (s.cd.smash > 0) return void E.say(g, h.map, h.x, h.y - 90, `${M.name} ${Math.ceil(s.cd.smash)}초`, "#f0dcb4");
  if (h.bag.bd.b < M.tiers[0].cost) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const [ax, ay] = E.face(h);
  s.ch = { s: "smash", t: 0, ax: r2(ax), ay: r2(ay), ptr: h.inputAim ? 1 : 0, hT: 0, tier: 0 };
  s.q += 1;
  smashHint(E, g, h, s.ch, 0, false);
}
function smashHint(E, g, h, c, tier, ping) {
  const [L, W] = smashSize(h, tier);
  E.fx(g, h.map, { kind: "sk_bj_smc", x: h.x, y: h.y, pi: h.pi, ax: c.ax, ay: c.ay, u: r2(Math.min(1, c.t / M.full)), tier, L, W,
    t: M.hint + 0.06, life: M.hint + 0.06, ...(ping ? { ping: tier, snd: "bloodHit" } : tier === 0 && c.t === 0 ? { snd: "bloodCharge" } : {}) });
}
function fireSmash(E, g, h) {
  const s = st(h), c = s.ch, bd = h.bag.bd;
  s.ch = null;
  const tier = smashTier(c.t, bd.b);
  if (tier < 0) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const [ax, ay] = c.ptr ? [c.ax, c.ay] : E.aim(g, h, M.len);
  const [L, W] = smashSize(h, tier);                 // 방향 · 범위는 발동 순간 확정
  s.sw = null;
  const sm = { fid: `bs${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), L, W, t: M.delay, tier, cast: E.cast(h), base: E.base(h), add: dmgAdd(h), xp: 0, map: h.map };
  spend(h, M.tiers[tier].cost);
  s.cd.smash = M.cd;
  s.sm.push(sm);
  h.swing = 0.3;
  E.fx(g, h.map, { kind: "sk_bj_smash", x: h.x, y: h.y, ax: sm.ax, ay: sm.ay, L, W, tier, fid: sm.fid, pi: h.pi, d: M.delay, t: M.delay + 0.45, life: M.delay + 0.45, snd: "bloodCharge" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: tier ? `${M.name} +${tier * 10}` : M.name, color: "#E53945", who: h.pi, t: 0.7, life: 0.7 });
}
// 주먹이 닿았다 — 표시한 직사각형 안에만 한 번. 벽 뒤는 빠진다. 일반 몹 경직 · 넉백, 보스는 '제압 면역' 한 번
function landSmash(E, g, h, sm) {
  const list = E.near(g, h, sm.x, sm.y, sm.L + sm.W).filter((o) => {
    if (!E.alive(g, h, o, sm.map)) return false;
    const dx = o.x - sm.x, dy = (o.y - sm.y) / E.squash, along = dx * sm.ax + dy * sm.ay, side = Math.abs(dx * sm.ay - dy * sm.ax), rr = (o.rad || 16) * 0.5;
    return along >= -rr && along <= sm.L + rr && side <= sm.W / 2 + rr && !walled(E, sm.map, sm.x, sm.y, o);
  });
  let imm = null;
  for (const o of list) {
    strike(E, g, h, sm, o, M.mul * (1 + sm.add + markBonus(h, o)));
    reap(E, g, h, o);
    if (E.boss(o)) imm = imm || o;
    else E.cc(g, h, o, { stun: M.stun, kb: [sm.ax, sm.ay, M.kb] });
  }
  g.shake = Math.max(g.shake || 0, 0.3);
  const cx = sm.x + sm.ax * sm.L * 0.62, cy = sm.y + sm.ay * sm.L * 0.62 * E.squash;
  E.fx(g, sm.map, { kind: "sk_bj_slam", x: cx, y: cy, ax: sm.ax, ay: sm.ay, W: sm.W, pi: h.pi, t: 0.45, life: 0.45, snd: "bloodBoom" });
  if (imm) E.say(g, sm.map, imm.x, imm.y - (imm.rad || 30) * 2 - 30, "제압 면역", "#f0dcb4");
  if (sm.xp) trainXp(E, g, h, 1, BLOOD.train.cast);   // 증폭형 — 혈수 강타 유효 적중 시전당 +10
}

/* ── 혈형 변환 · 혈검 ───────────────────────────────── */
function formWhy(E, g, h, cost) {
  const s = st(h);
  const lock = shapeLock(h);
  if (lock) return lock;
  if (s.cd.form > 0) return `${F.name} ${Math.ceil(s.cd.form)}초`;
  if (h.bag.bd.b < cost) return "혈량 부족";
  return "";
}
function swordUse(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  breakFor(E, g, h, "sword");
  const no = formWhy(E, g, h, F.sword.cost);
  if (no) return void E.say(g, h.map, h.x, h.y - 90, no, no === "혈량 부족" ? "#ff8a8a" : "#f0dcb4");
  const [ax, ay] = E.aim(g, h, F.sword.r);
  spend(h, F.sword.cost);
  s.cd.form = F.cd;
  s.sw = { t: 0, i: 0, ax: r2(ax), ay: r2(ay), R: Math.round(F.sword.r * (1 + rangeAdd(h))), add: dmgAdd(h), cast: E.cast(h), base: E.base(h), xp: 0, map: h.map, n: ++s.q };   // 범위 보너스는 반경에만 · 각도 고정
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: F.sword.name, color: "#E53945", who: h.pi, t: 0.6, life: 0.6 });
  swordHit(E, g, h, s.sw);
}
// 한 번 베기 — 지금 내 자리 중심 · 발동 때 고정한 방향 · 반경 R · 100도. 타격마다 대상별 한 번
function swordHit(E, g, h, sw) {
  const i = sw.i++;
  const list = E.arc(g, h, sw.ax, sw.ay, sw.R, (F.sword.arc / 2) * Math.PI / 180).filter((o) => E.alive(g, h, o, sw.map) && !walled(E, sw.map, h.x, h.y, o));
  let hit = 0;
  for (const o of list) {
    strike(E, g, h, sw, o, F.sword.mul * (1 + sw.add + markBonus(h, o)));   // 첫 유효 적중에서 혈흔을 쓰고 나면 다음 타격에는 보너스가 없다
    reap(E, g, h, o);
    hit = 1;
  }
  h.swing = 0.18;
  E.fx(g, h.map, { kind: "sk_bj_sword", x: h.x, y: h.y, ax: sw.ax, ay: sw.ay, r: sw.R, i, pi: h.pi, t: 0.22, life: 0.22, snd: hit ? "bloodHit" : undefined });
  if (i < F.sword.hits.length - 1) return;
  // 마지막 타격 — 유효 적중이면 혈량 8(시전당 한 번), 빗나가면 칼날이 흩어진다
  const tipX = h.x + sw.ax * sw.R * 0.7, tipY = h.y + sw.ay * sw.R * 0.7 * E.squash;
  if (hit) { const got = gainBlood(h, F.sword.back); E.fx(g, h.map, { kind: "sk_bj_reap", x: tipX, y: tipY + 30, x1: h.x, y1: h.y, n: 3, got, pi: h.pi, t: 0.4, life: 0.4, who: h.pi }); }
  else E.fx(g, h.map, { kind: "sk_bj_end", x: tipX, y: tipY + S.lift, pi: h.pi, t: 0.3, life: 0.3 });
  if (sw.xp) trainXp(E, g, h, 2, BLOOD.train.cast);   // 형상화 — 혈검 유효 적중 시전당 +10
  st(h).sw = null;
}

/* ── 혈형 변환 · 혈막 ───────────────────────────────── */
export const veilStat = (lv) => [Math.min(F.veil.durMax, F.veil.dur + F.veil.durPer * lv), Math.min(F.veil.redMax, F.veil.red + F.veil.redPer * lv)];
function veilPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.vl) return;
  const k = r2(1 + rangeAdd(h) + (inField(h) ? FD.size : 0));   // 혈막 크기(보이는 것만) — 혈역 조건은 발동 직전에 본다
  breakFor(E, g, h, "veil");
  s.sw = null;
  const no = formWhy(E, g, h, F.veil.cost);
  if (no) return void E.say(g, h.map, h.x, h.y - 90, no, no === "혈량 부족" ? "#ff8a8a" : "#f0dcb4");   // 못 쓰면 혈역은 그대로
  if (s.fd) endField(E, g, h, "veil");
  const [max, red] = veilStat(shapeLv(h));
  spend(h, F.veil.cost);
  s.cd.form = F.cd;
  s.vl = { t: 0, max: r2(max), red: Math.round(red * 1000) / 1000, did: 0, hT: F.veil.hint, rT: 0, k };
  E.fx(g, h.map, { kind: "sk_bj_veil", x: h.x, y: h.y, pi: h.pi, u: 0, max: s.vl.max, k, start: 1, t: F.veil.hint + 0.08, life: F.veil.hint + 0.08, snd: "bloodCharge" });
}
// 혈막 끝 — 실제로 피해를 줄였다면 혈량 12(사망으로 끝나면 없음). 형상화 경험치는 줄였으면 시전당 +10
function endVeil(E, g, h, why) {
  const s = h.bd, v = s && s.vl;
  if (!v) return;
  s.vl = null;
  const ok = !!v.did && why !== "down";
  const got = ok ? gainBlood(h, F.veil.back) : 0;
  if (v.did) trainXp(E, g, h, 2, BLOOD.train.cast);
  E.fx(g, h.map, { kind: "sk_bj_veilend", x: h.x, y: h.y, pi: h.pi, ok: ok ? 1 : 0, got, t: 0.4, life: 0.4, who: h.pi });
}
// 받는 피해(hurtHero) — 혈막이면 감소율만큼 줄인다. 정면 · 후면 구분 없음 · 회피 · 무적 아님. 실제로 줄인 피해가 있으면 회수 조건을 채운다
export function bloodJobTake(E, g, h, dmg) {
  const v = h && h.bd && h.bd.vl;
  if (!v || !(dmg > 0)) return dmg;
  v.did = 1;
  if (v.rT <= 0) { v.rT = F.veil.ripple; E.fx(g, h.map, { kind: "sk_bj_ripple", x: h.x, y: h.y, pi: h.pi, t: 0.3, life: 0.3, snd: "hit" }); }
  return dmg * (1 - v.red);
}

/* ── 혈역 증폭 ─────────────────────────────────────── */
export function inField(h) {
  const f = h && h.bd && h.bd.fd;
  if (!f || f.map !== h.map) return false;
  return Math.hypot(h.x - f.x, (h.y - f.y) / FD_SQ) <= FD.r;
}
let FD_SQ = 0.78;                                    // 땅 비율 — 엔진 값으로 맞춘다(tickBloodJob)
function fieldPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.fd) return;
  if (h.bag.bd.lv < BLOOD.unlock.field) return void E.say(g, h.map, h.x, h.y - 90, `직업 레벨 ${BLOOD.unlock.field}에 열립니다`, "#d9c9a6");
  if (s.rg) return void E.say(g, h.map, h.x, h.y - 90, `${MODE_NAMES[s.rg.k === 1 ? "rage" : "tired"]} 중에는 쓸 수 없습니다`, "#f0dcb4");
  if (s.cd.field > 0) return void E.say(g, h.map, h.x, h.y - 90, `${FD.name} ${Math.ceil(s.cd.field)}초`, "#f0dcb4");
  s.fd = { x: Math.round(h.x), y: Math.round(h.y), t: 0, n: 0, next: FD.tick, xp: 0, none: 0, hT: 0, map: h.map };
  s.dw = FD.decayWait;
  E.fx(g, h.map, { kind: "sk_bj_field", x: s.fd.x, y: s.fd.y, r: FD.r, pi: h.pi, u: 0, start: 1, t: FD.hint + 0.08, life: FD.hint + 0.08, snd: "bloodCharge" });
}
// 혈역 끝 — 대기 45초는 끝난 때부터. 1초 뒤부터 넘는 혈량이 줄어든다
function endField(E, g, h, why) {
  const s = h.bd, f = s && s.fd;
  if (!f) return;
  s.fd = null;
  s.cd.field = FD.cd;
  s.dw = FD.decayWait;
  if (f.xp) trainXp(E, g, h, 1, Math.min(FD.xpMax, f.xp));   // 증폭형 — 실제로 혈량을 얻은 1초마다 +1(시전당 10까지)
  E.fx(g, f.map, { kind: "sk_bj_fieldend", x: f.x, y: f.y, r: FD.r, pi: h.pi, over: why === "over" ? 1 : 0, t: 0.5, life: 0.5 });
}
// 1초마다 — 나와 유효한 적이 모두 혈역 안일 때만 +5(넘는 몫은 180까지). 못 얻은 회차는 넘어간다(쌓이지 않는다)
function fieldTick(E, g, h, f) {
  const foes = E.near(g, h, f.x, f.y, FD.r + 40).filter((o) => E.alive(g, h, o, f.map) && Math.hypot(o.x - f.x, (o.y - f.y) / E.squash) <= FD.r);
  if (!foes.length || !inField(h)) { f.none = 1; return; }
  f.none = 0;
  const got = gainBlood(h, FD.gain, true);
  if (got > 0 && foes.some((o) => !E.dummy(o))) f.xp += FD.xp;
  if (got > 0) E.fx(g, h.map, { kind: "sk_bj_absorb", x: f.x, y: f.y, x1: h.x, y1: h.y, got, pi: h.pi, t: 0.6, life: 0.6, snd: "bloodHit", who: h.pi });
  if (h.bag.bd.b >= BLOOD.abs) overload(E, g, h);
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
  if (!bloodOn(h) && req.op === "cancel") return false;   // 창을 벗어날 때 누구나 보낸다 — 조용히 넘긴다
  if (!bloodOn(h)) return void E.sys(g, pi, `${BLOOD_NAME} 만 쓸 수 있습니다.`);
  if (req.op === "aim") { const c = h.bd && h.bd.ch; if (c && c.ptr && h.inputAim) aimTo(h, c, h.inputAim); return false; }
  if (req.op === "sword") return void swordUse(E, g, h);
  if (req.op === "cancel") {                         // 창을 벗어났다 · 채팅 — 차징 · 유지 입력을 모두 푼다
    if (h.bd && h.bd.ch) cancelCharge(E, g, h);
    if (h.bd && h.bd.vl) endVeil(E, g, h, "release");
    if (h.bd && h.bd.fd) endField(E, g, h, "release");
    return false;
  }
  if (req.s === "field") {
    if (req.op === "press") fieldPress(E, g, h);
    else if (req.op === "release") endField(E, g, h, "release");
    return false;
  }
  if (req.s === "veil") {
    if (req.op === "press") veilPress(E, g, h);
    else if (req.op === "release") endVeil(E, g, h, "release");
    return false;
  }
  if (req.s !== "shot" && req.s !== "smash") return false;
  if (req.op === "press") return void (req.s === "smash" ? smashPress : shotPress)(E, g, h);
  if (req.op === "release") return void shotRelease(E, g, h, false, req.s);
  return false;
}
// 차징 중 마우스 포인터 방향(waim) — 크림슨 레퀴엠과 같은 입력을 함께 쓴다
export function bloodJobAim(h) { const c = h && h.bd && h.bd.ch; if (c && c.ptr && h.inputAim) aimTo(h, c, h.inputAim); }
export const bloodJobAimLock = (h) => !!(h && h.bd && h.bd.ch && h.bd.ch.ptr);
// 이동 배율 — 차징 -30% · 혈역 -40% 가 겹치면 가장 큰 하나만. 폭주 +15% · 탈진 -15% 는 따로 곱한다
export function bloodJobSlow(h) {
  const s = h && h.bd;
  if (!s) return 1;
  const slow = Math.max(s.ch ? (s.ch.s === "smash" ? M.slow : S.slow) : 0, s.fd ? FD.slow : 0);
  const rg = s.rg ? 1 + (s.rg.k === 1 ? Z.rage.spd : Z.tired.spd) : 1;
  return (1 - slow) * rg;
}

/* ── 시간 ─────────────────────────────────────────── */
export function tickBloodJob(E, g, h, dt) {
  if (h.bdv) h.bdv = null;                           // 손님이던 세계가 판정 세계가 됐다(방장 승계) — 화면 값은 판정 상태에서 읽는다
  if (!bloodOn(h)) { if (h.bd) h.bd = null; return; }
  const s = st(h);
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  FD_SQ = E.squash;
  stepState(E, g, h, s, dt);
  for (const k of Object.keys(s.mk)) {                 // 혈흔 — 시간 만료 · 대상이 사라지면 지운다(회수 없음)
    const m = s.mk[k], o = find(g, k);
    m[1] -= dt;
    if (m[1] <= 0 || !o || (o.type ? o.dead || o.map !== h.map : o.down > 0 || o.map !== h.map)) delete s.mk[k];
  }
  const c = s.ch;
  if (c && c.s === "smash") {
    if (h.down > 0 || E.locked(h) || E.fight(h)) cancelCharge(E, g, h);
    else {
      c.t += dt;
      if (c.ptr) aimTo(h, c, [c.ax, c.ay]);
      const tier = smashTier(c.t, h.bag.bd.b), ping = tier > c.tier;
      c.hT -= dt;
      if (ping || c.hT <= 0) { c.hT = M.hint; c.tier = Math.max(c.tier, tier); smashHint(E, g, h, c, Math.max(0, tier), ping); }
      if (c.t >= M.full) fireSmash(E, g, h);         // 최대 0.9초 — 자동 발동
    }
  } else if (c) {
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
  const stop = h.down > 0 || E.locked(h);           // 기절 · 사망 — 닿기 전 강타 · 남은 혈검 타격은 취소(비용은 돌려주지 않는다)
  if (s.sm.length) {
    s.sm = s.sm.filter((sm) => {
      if (stop || sm.map !== h.map) { E.fx(g, sm.map, { kind: "cut", ref: sm.fid }); return false; }
      sm.t -= dt;
      if (sm.t > 0) return true;
      landSmash(E, g, h, sm);
      return false;
    });
  }
  if (s.sw) {
    const sw = s.sw;
    if (stop || sw.map !== h.map) s.sw = null;
    else { sw.t += dt; while (s.sw === sw && sw.i < F.sword.hits.length && sw.t + 1e-6 >= F.sword.hits[sw.i]) swordHit(E, g, h, sw); }
  }
  if (s.vl) {
    const v = s.vl;
    v.t += dt; v.rT -= dt; v.hT -= dt;
    if (h.down > 0) endVeil(E, g, h, "down");
    else if (E.locked(h) || E.fight(h)) endVeil(E, g, h, "break");
    else if (v.t >= v.max) endVeil(E, g, h, "time");
    else if (h.fire) endVeil(E, g, h, "break");    // 평타를 누르면 혈막을 먼저 끝낸다
    else if (v.hT <= 0) {
      v.hT = F.veil.hint;
      E.fx(g, h.map, { kind: "sk_bj_veil", x: h.x, y: h.y, pi: h.pi, u: r2(v.t / v.max), max: v.max, k: v.k, t: F.veil.hint + 0.08, life: F.veil.hint + 0.08 });
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
/* 상태 · 혈역 시간 — 폭주 → 탈진 → 끝 · 과충전 · 폭주 체력 감소(방어 · 혈막 무시, 체력 1에서 멈춤) · 혈역 회차 · 넘는 혈량 줄이기 */
function stepState(E, g, h, s, dt) {
  const bd = h.bag.bd, cap = stableCap(bd.lv);
  if (s.rg) {
    s.rg.t -= dt;
    if (s.rg.t <= 0) {
      if (s.rg.k === 1) { s.rg = { k: 2, t: Z.tired.dur }; E.fx(g, h.map, { kind: "sk_bj_tired", x: h.x, y: h.y, pi: h.pi, t: 0.8, life: 0.8 }); }
      else s.rg = null;
    } else if (s.rg.k === 1) {
      s.rg.hT = (s.rg.hT || 0) - dt;
      if (s.rg.hT <= 0) { s.rg.hT = 0.5; E.fx(g, h.map, { kind: "sk_bj_rage", x: h.x, y: h.y, pi: h.pi, t: 0.58, life: 0.58 }); }   // 남에게도 보이는 폭주 기운
    }
  }
  const mode = bloodMode(bd.b, cap, s.rg), drain = mode === "rage" ? Z.rage.hp : mode === "over" ? Z.over.hp : 0;
  if (drain && h.down <= 0 && !E.god(g, h)) h.hp = Math.max(Math.min(h.hp, 1), h.hp - h.max * drain * dt);
  if (mode === "over" && !s.wo) { s.wo = 1; E.say(g, h.map, h.x, h.y - 110, "과충전", "#ff9aa4"); }
  if (mode !== "over") s.wo = 0;
  if (bd.b >= Z.warn && !s.rg && !s.w175) { s.w175 = 1; E.sys(g, h.pi, "혈량 175 — 다음 혈역 획득 시 폭주합니다."); }
  if (bd.b < Z.warn) s.w175 = 0;
  const f = s.fd;
  if (f) {
    f.t += dt;
    if (h.down > 0 || E.locked(h) || E.fight(h)) endField(E, g, h, "stop");
    else if (!inField(h)) endField(E, g, h, "out");   // 경계를 넘으면 끝 — 다시 들어와도 이어지지 않는다
    else {
      while (s.fd === f && f.n < FD.dur / FD.tick && f.t + 1e-6 >= f.next) { f.n += 1; f.next += FD.tick; fieldTick(E, g, h, f); }
      if (s.fd === f && f.t >= FD.dur) endField(E, g, h, "time");
      else if (s.fd === f && (f.hT -= dt) <= 0) {
        f.hT = FD.hint;
        E.fx(g, h.map, { kind: "sk_bj_field", x: f.x, y: f.y, r: FD.r, pi: h.pi, u: r2(f.t / FD.dur), none: f.none, t: FD.hint + 0.08, life: FD.hint + 0.08 });
      }
    }
  }
  if (!s.fd && bd.b > cap) {                         // 혈역이 끝나고 1초 뒤부터 초당 10씩(상한 아래로는 줄지 않는다)
    if (s.dw > 0) s.dw -= dt;
    else { s.dA += FD.decay * dt; const n = Math.floor(s.dA); if (n > 0) { s.dA -= n; bd.b = Math.max(cap, bd.b - n); } }
  } else s.dA = 0;
}
// 쓰러졌다 — 상태를 풀고 혈량 0(이미 쏜 탄은 그대로 날아간다)
export function bloodJobDown(E, g, h) {
  if (!bloodOn(h)) return;
  const s = st(h);
  if (s.vl) endVeil(E, g, h, "down");
  if (s.fd) endField(E, g, h, "down");
  s.ch = null; s.mk = {}; s.sw = null; s.rg = null;
  h.bag.bd.b = 0;
}
// 훈련장 · 테스트 서버 "스택 가득" — 혈량을 안정 상한까지
export function bloodJobFill(h) { if (bloodOn(h)) h.bag.bd.b = Math.max(h.bag.bd.b, stableCap(h.bag.bd.lv)); }

/* ── 스냅샷 줄 56 — [혈량, 직업 레벨, 경험치, 연마 [l, x] × 3 펼침, 대기 [적혈탄, 전환, 혈수 강타, 혈형 변환], 차징 [단계 시간, x, y, 스킬 0 적혈탄 · 1 혈수 강타] | 0,
   혈흔 [[키, 중첩, 남은 초]], 혈막 [지난 초, 최대 초] | 0, 폭주 · 탈진 [1 | 2, 남은 초] | 0, 혈역 [x, y, 지난 초, 흡수 대상 없음 1] | 0]
   대기 칸 5번째는 혈역 증폭. 칸은 뒤에만 더한다 ── */
export function packBloodJob(h) {
  if (!bloodOn(h)) return 0;
  const bd = h.bag.bd, s = h.bd;
  return [Math.round(bd.b), bd.lv, bd.xp, bd.tr.flat(), s ? [r1(s.cd.shot), r1(s.cd.conv), r1(s.cd.smash || 0), r1(s.cd.form || 0), r1(s.cd.field || 0)] : [0, 0, 0, 0, 0],
    s && s.ch ? [r2(s.ch.t), s.ch.ax, s.ch.ay, s.ch.s === "smash" ? 1 : 0] : 0,
    s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], r1(m[1])]) : [],
    s && s.vl ? [r2(s.vl.t), s.vl.max] : 0,
    s && s.rg ? [s.rg.k, r1(s.rg.t)] : 0,
    s && s.fd ? [s.fd.x, s.fd.y, r2(s.fd.t), s.fd.none] : 0];
}
// 손님 — 화면에 쓰는 값만 h.bdv 로(판정 상태 h.bd 는 건드리지 않는다)
export function applyBloodJob(h, a) {
  if (!Array.isArray(a)) { h.bdv = null; return; }
  if (h.bag && h.bag.bd) h.bag.bd.b = Math.max(0, Math.min(BLOOD.abs, Number(a[0]) || 0));   // 방장 승계 때 지금 혈량을 이어받는다
  const tr = Array.isArray(a[3]) ? a[3] : [];
  h.bdv = { b: Number(a[0]) || 0, lv: Number(a[1]) || 1, xp: Number(a[2]) || 0, tr: [[tr[0] | 0, tr[1] | 0], [tr[2] | 0, tr[3] | 0], [tr[4] | 0, tr[5] | 0]],
    cd: Array.isArray(a[4]) ? { shot: +a[4][0] || 0, conv: +a[4][1] || 0, smash: +a[4][2] || 0, form: +a[4][3] || 0, field: +a[4][4] || 0 } : { shot: 0, conv: 0, smash: 0, form: 0, field: 0 },
    ch: Array.isArray(a[5]) ? { t: +a[5][0] || 0, ax: +a[5][1] || 0, ay: +a[5][2] || 0, s: a[5][3] === 1 ? "smash" : "shot" } : null,
    mk: Array.isArray(a[6]) ? a[6].filter((m) => Array.isArray(m) && typeof m[0] === "string").map((m) => [m[0], m[1] | 0, +m[2] || 0]) : [],
    vl: Array.isArray(a[7]) ? { t: +a[7][0] || 0, max: +a[7][1] || 0 } : null,
    rg: Array.isArray(a[8]) ? { k: a[8][0] === 2 ? 2 : 1, t: +a[8][1] || 0 } : null,
    fd: Array.isArray(a[9]) ? { x: +a[9][0] || 0, y: +a[9][1] || 0, t: +a[9][2] || 0, none: a[9][3] ? 1 : 0 } : null, at: Date.now() };
}
// 화면 값 — 방장(판정 세계)은 h.bag.bd · h.bd 에서, 손님은 h.bdv 에서 같은 모양으로
export function bloodView(h) {
  if (!h) return null;
  if (h.bdv) return h.bdv;
  if (!bloodOn(h)) return null;
  const bd = h.bag.bd, s = h.bd;
  return { b: bd.b, lv: bd.lv, xp: bd.xp, tr: bd.tr, cd: s ? { smash: 0, form: 0, field: 0, ...s.cd } : { shot: 0, conv: 0, smash: 0, form: 0, field: 0 },
    ch: s && s.ch ? { t: s.ch.t, ax: s.ch.ax, ay: s.ch.ay, s: s.ch.s } : null,
    mk: s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], m[1]]) : [], vl: s && s.vl ? { t: s.vl.t, max: s.vl.max } : null,
    rg: s && s.rg ? { k: s.rg.k, t: s.rg.t } : null, fd: s && s.fd ? { x: s.fd.x, y: s.fd.y, t: s.fd.t, none: s.fd.none } : null };
}
