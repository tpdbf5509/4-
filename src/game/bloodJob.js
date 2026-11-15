/* ── 히든 직업 BLOOD-001 판정 — 혈량 · 혈흔 · 적혈탄(11월 14일 1단계) ─────────────
   수치는 bloodJobData.js. 방장 · 전용 서버만 판정한다. 화면은 스냅샷 영웅 줄 56(packBloodJob)과 연출(fx)만 그린다.
   피해는 기존 strikeAny 를 거치므로 결투(duelBalance.js 시전별 상한) · 사냥터 PvP 상한이 그대로 걸린다. 한 시전의 모든 타가 같은 시전 객체를 쓴다.
   크림슨 레퀴엠(bloodGunCombat.js) 혈흔과는 따로 센다 — 여기 혈흔은 h.bd.mk 에만 있고 주인 화면에만 보인다.
   저장 값 bag.bd = { on 해금, lv 직업 레벨, xp, tr [[연마 레벨, 경험치] × 3], b 혈량 }. 필드는 뒤에만 더한다.
   E(엔진, rpg.js bloodJobEngine): fx · say · sys · near · arc · strike · alive · base · face · aim · locked · fight(싸울 수 있는지 까닭) ·
   squash · blocks · cast(새 시전 객체) · dummy · cdOff · cc(경직 · 넉백) · boss(제압 면역)
   3단계(11월 14일): 혈량 상태(증폭 · 과충전 · 폭주 h.bd.rg · 탈진) · 혈역 증폭(h.bd.fd). 공격력은 rpg.js heroDmgMul 이 bloodJobAtk 를 곱한다
   2단계(11월 14일): 혈수 강타(h.bd.sm 내려칠 손) · 혈형 변환 — 혈검(h.bd.sw 생성 → 손에 들고 새 평타마다 베기, 11월 15일) · 혈막(h.bd.vl 받는 피해 감소, hurtHero → bloodJobTake) */
import { BLOOD, BLOOD_SHOT as S, BLOOD_SMASH as M, BLOOD_FORM as F, BLOOD_STATE as Z, BLOOD_FIELD as FD, BLOOD_WAVE as WV, BLOOD_HOOK as HK, BLOOD_TINT, TRAIN_UNLOCK, TRAIN_NAMES, BLOOD_NAME } from "./bloodJobData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));

/* ── 저장 값 ───────────────────────────────────────── */
export function cleanBd(d) {
  if (d && typeof d === "object" && d.trial) return cleanBd(d.prev);   // 연구시설 시험 중 — 빌린 값은 저장하지 않는다(bloodUnlock.js)
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
  // 혈량 — 가장 가까운 5 로 맞추고 이 레벨의 한계(0 ~ 과부하 한계 - 5) 안으로(11월 15일 개편 — 예전 저장 값도 레벨 · 연마 · 해금은 그대로)
  return { lv, xp: lv >= BLOOD.maxLv ? 0 : clampN(d.xp, 0, jobNeed(lv) - 1), tr, b: Math.max(0, Math.min(overCap(lv) - BLOOD.unit, roundB(d.b))) };
}
const roundB = (v) => Math.round((Number(v) || 0) / BLOOD.unit) * BLOOD.unit;
export const bloodOn = (h) => !!(h && h.bag && h.bag.bd && h.bag.bd.on);
export const jobNeed = (lv) => BLOOD.xp.base + BLOOD.xp.per * lv;
export const trainNeed = (l) => BLOOD.train.base + BLOOD.train.per * l;
// 혈량 한계(11월 15일 개편) — 안정 = 100 + 5 × floor(레벨 / 5) · 증폭 = 안정 + 25 · 과부하 = 안정 + 50. 화면 구분선 · 경고 · 저장 검사가 모두 이 함수를 쓴다
export const stableCap = (lv) => BLOOD.cap.base + BLOOD.cap.per * Math.floor(Math.max(1, Math.min(BLOOD.maxLv, lv | 0)) / BLOOD.cap.step);
export const ampCap = (lv) => stableCap(lv) + BLOOD.cap.amp;
export const overCap = (lv) => stableCap(lv) + BLOOD.cap.over;
export const bloodCaps = (lv) => [stableCap(lv), ampCap(lv), overCap(lv)];
// '다음 혈역 획득 시 폭주' 경고 — 다음 흡수가 과부하 한계에 닿는다(폭주 · 탈진 중에는 없음). 화면 경고와 판정 알림이 같은 셈을 쓴다
export const overWarn = (b, lv, rg) => !rg && b + FD.gain >= overCap(lv);
// 영구 연마 합계와 색 — 과충전의 임시 레벨(3단계)은 넣지 않는다
export const trainSum = (bd) => (bd ? bd.tr.reduce((s, q) => s + q[0], 0) : 0);
export const bloodTint = (sum) => BLOOD_TINT.find((t) => sum >= t.from).id;
// 해금한 연마인가(직업 레벨)
export const trainOpen = (bd, i) => !!bd && bd.lv >= TRAIN_UNLOCK[i];

// 해금 — 1차 전직을 비우고(사용자 결정) 직업 레벨 1 · 혈량 100 으로 시작한다. 예전에 해금했던 기록(되돌린 뒤 다시)은 레벨 · 연마를 그대로 쓴다
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
  if (!s.sm) { s.sm = []; s.sw = null; s.vl = null; s.cd.smash = s.cd.smash || 0; s.cd.form = s.cd.form || 0; }
  if (s.cd.sword === undefined) s.cd.sword = 0;      // 혈검 대기(11월 15일 — 혈막 대기 cd.form 과 따로)   // 2단계 상태(앞선 판에서 만든 h.bd 에도 채운다)
  if (s.cd.field === undefined) { s.cd.field = 0; s.fd = null; s.rg = null; s.dw = 0; s.dA = 0; s.wo = 0; s.w175 = 0; }   // 3단계 상태
  if (s.cd.wave === undefined) { s.cd.wave = 0; s.cd.hook = 0; s.wv = []; s.hk = null; s.rT = 0; }   // 11월 15일 — 혈류 파동 · 혈쇄 갈고리 · 자연 회복
  return s;
}
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
export const bloodAmt = (h) => (bloodOn(h) ? h.bag.bd.b : 0);
export const bloodCap = (h) => (bloodOn(h) ? stableCap(h.bag.bd.lv) : 0);

// 혈량을 얻는다 — 안정 한계까지(over 는 혈역 증폭만 — 과부하 한계까지). 이미 한계 이상이면 새 몫만 버린다. 실제로 늘어난 양을 돌려준다.
// 늘 5 단위(11월 15일 개편) — 들어온 양도 5 의 배수로 내린다. 폭주 · 탈진 중에는 안정 한계를 넘지 못한다
export function gainBlood(h, n, over = false) {
  if (!bloodOn(h) || !(n > 0)) return 0;
  const bd = h.bag.bd, top = over && !(h.bd && h.bd.rg) ? overCap(bd.lv) : stableCap(bd.lv);
  n = Math.floor(n / BLOOD.unit) * BLOOD.unit;
  if (bd.b >= top || n <= 0) return 0;
  const got = Math.min(n, top - bd.b);
  bd.b += got;
  return got;
}
function spend(h, n) { const bd = h.bag.bd; bd.b = Math.max(0, bd.b - n); }

/* ── 혈량 상태 — 안정 · 증폭 · 과충전 · 폭주 · 탈진 ───────────────── */
// rg = { k: 1 폭주 · 2 탈진, t: 남은 초 }
// cap 은 안정 한계 — 증폭 한계는 cap + 25(BLOOD.cap.amp)
export function bloodMode(b, cap, rg) {
  if (rg && rg.k === 1) return "rage";
  if (rg && rg.k === 2) return "tired";
  if (b > cap + BLOOD.cap.amp) return "over";
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
// 과부하 — 넘는 몫을 버리고 혈역 · 차징을 끊은 뒤 혈량 60 · 6초 폭주
function overload(E, g, h) {
  const s = st(h), bd = h.bag.bd;
  if (s.ch) cancelCharge(E, g, h, true);
  if (s.fd) endField(E, g, h, "over");
  bd.b = Z.rage.settle;
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
// 평타가 맞았다(weaponOnHit basic) — 공격 한 번에 혈량 +5 한 번 · 맞은 대상마다 혈흔 1중첩(최대 5 · 10초, 새로 부여하면 갱신)
export function bloodJobOnHit(E, g, h, o, { basic, side }) {
  if (!basic || side || !o || !bloodOn(h)) return;
  const s = st(h);
  if (s.gT !== g.t) { s.gT = g.t; gainBlood(h, BLOOD.basicGain); }
  const k = keyOf(o), m = s.mk[k] || (s.mk[k] = [0, 0]);
  m[0] = Math.min(BLOOD.mark.max, m[0] + 1); m[1] = BLOOD.mark.dur;
}
// 혈흔 거두기 — 첫 유효 적중의 피해를 셈한 뒤 모두 소비하고 중첩당 혈량 +5. 한 시전(c — 그 시전 객체) 전체에서 +15 까지(11월 15일 개편)
function reap(E, g, h, o, c) {
  const s = st(h), k = keyOf(o), m = s.mk[k];
  if (!m) return 0;
  delete s.mk[k];
  const room = c ? Math.max(0, BLOOD.mark.backMax - (c.rp || 0)) : BLOOD.mark.backMax;
  const got = gainBlood(h, Math.min(room, m[0] * BLOOD.mark.back));
  if (c) c.rp = (c.rp || 0) + got;
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
  if (tier >= 0) endSword(E, g, h, "skill");         // 다른 공격 스킬 발동 — 든 혈검이 풀린다
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
  s.cd.shot = T.cd;                                  // 쏜 단계의 대기 2 · 3 · 5초(11월 15일 개편)
  s.cdMax = s.cdMax || {}; s.cdMax.shot = T.cd;
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
    if (reap(E, g, h, o, shot) && h.bt && h.bt.step === 2 && shot.tier >= 1) h.bt.hit2 = 1;   // 해금 시험 2단계 — 차징한 탄으로 혈흔 회수
    E.fx(g, h.map, { kind: "sk_bj_hit", x: o.x, y: o.y, pi: h.pi, tier: shot.tier, t: 0.3, life: 0.3, snd: shot.hit.length === 1 ? "bloodHit" : undefined });
    if (shot.burst && shot.hit.length === 1) burst(E, g, h, shot, o.x, o.y);   // 첫 적중 자리에서만 · 두 번째 관통 대상에서는 다시 터지지 않는다
    if (shot.left <= 0) { shot.d = Math.max(from, Math.min(to, along)); break; }
  }
  return shot.left > 0 && shot.d < shot.max;
}

/* ── 2단계 공통 ───────────────────────────────────── */
const shapeLv = (h) => effTrain(h, 2);
const lvLock = (h, at) => (h.bag.bd.lv < at ? `직업 레벨 ${at}에 열립니다` : "");
const shapeLock = (h) => lvLock(h, BLOOD.unlock.shape);   // 혈검 · 혈막(10)
// 새 공격 · 스킬을 누르면 — 다른 스킬 차징은 끊는다(비용 · 대기 없음). 혈막은 끊지 않는다
function breakFor(E, g, h, sk) {
  const s = st(h);
  if (s.ch && s.ch.s !== sk) cancelCharge(E, g, h);
}
// 이 게임의 다른 입력(큰 기술 · 스킬 칸 · 무기 스킬 · 전직 스킬 · 대쉬 · 평타)이 들어왔다 — rpgInput 이 판정 앞에 부른다
export function bloodJobBreak(E, g, h, kind) {
  if (!bloodOn(h) || !h.bd) return;
  const s = h.bd;
  if (kind === "fire") return;                         // 혈막은 평타 · 다른 스킬에도 끊기지 않는다(11월 15일) — 15초가 다 되어야 끝난다
  if (s.ch) cancelCharge(E, g, h);
  if (kind !== "dash") endSword(E, g, h, "skill");   // 혈검은 들고 다니는 검이라 대쉬로는 풀리지 않는다(11월 15일)
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
  const lock = lvLock(h, BLOOD.unlock.smash);
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
  endSword(E, g, h, "skill");
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
    reap(E, g, h, o, sm);
    if (E.boss(o)) imm = imm || o;
    else E.cc(g, h, o, { stun: M.stun, kb: [sm.ax, sm.ay, M.kb] });
  }
  g.shake = Math.max(g.shake || 0, 0.3);
  const cx = sm.x + sm.ax * sm.L * 0.62, cy = sm.y + sm.ay * sm.L * 0.62 * E.squash;
  E.fx(g, sm.map, { kind: "sk_bj_slam", x: cx, y: cy, ax: sm.ax, ay: sm.ay, W: sm.W, pi: h.pi, t: 0.45, life: 0.45, snd: "bloodBoom" });
  if (imm) E.say(g, sm.map, imm.x, imm.y - (imm.rad || 30) * 2 - 30, "제압 면역", "#f0dcb4");
  if (sm.xp) trainXp(E, g, h, 1, BLOOD.train.cast);   // 증폭형 — 혈수 강타 유효 적중 시전당 +10
}

/* ── 혈형 변환 · 혈검(11월 15일 — 손에 들고 새 평타마다 벤다) ─────
   h.bd.sw = { ph 1 만드는 중 · 2 든 검, t 그 단계에서 지난 초, left 늘 1(옛 화면 호환 — 횟수 제한 없음), i 벤 횟수, ax · ay 마지막 베기 방향, sT 마지막 베기 뒤 초,
               gap 다음 베기까지, qd 기다리는 누름, R · add · cast · base · xp · map } */
const SW = F.sword;
function swordWhy(E, g, h) {
  const s = st(h), lock = shapeLock(h);
  if (lock) return lock;
  if (s.cd.sword > 0) return `${SW.name} ${Math.ceil(s.cd.sword)}초`;
  if (h.bag.bd.b < SW.cost) return "혈량 부족";
  return "";
}
function swordUse(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.sw) return;                                  // 이미 들고 있다(만드는 중 포함)
  breakFor(E, g, h, "sword");
  const no = swordWhy(E, g, h);
  if (no) return void E.say(g, h.map, h.x, h.y - 90, no, no === "혈량 부족" ? "#ff8a8a" : "#f0dcb4");
  const [ax, ay] = E.face(h);
  spend(h, SW.cost);                                 // 생성 시작에 혈량 10 · 혈검 대기 6초
  s.cd.sword = SW.cd;
  s.sw = { ph: 1, t: 0, left: 1, i: 0, ax: r2(ax), ay: r2(ay), sT: 9, gap: 0, qd: 0,
    R: Math.round(SW.r * (1 + rangeAdd(h))), add: dmgAdd(h), cast: E.cast(h), base: E.base(h), xp: 0, map: h.map, n: ++s.q };   // 범위 · 피해 보너스는 생성 순간 값
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: SW.name, color: "#E53945", who: h.pi, t: 0.6, life: 0.6, snd: "bloodCharge" });
}
// 혈검이 있으면 평타 입력을 혈검이 받는다 — fresh 는 평타 버튼을 새로 누른 것(누르고 있던 것 · 키 반복은 false). 혈검이 받았으면 true
export function bloodSwordPress(E, g, h, fresh) {
  const sw = h && h.bd && h.bd.sw;
  if (!sw || !bloodOn(h)) return false;
  if (!fresh || sw.ph !== 2) return true;           // 만드는 중 · 새 누름이 아니면 아무것도 하지 않는다
  if (sw.gap > 0) { sw.qd = 1; return true; }        // 너무 빠른 연타 — 한 번 기억했다가 간격이 지나면 벤다
  swordHit(E, g, h, sw);
  return true;
}
// 혈검을 들고 있나(만드는 중 포함) — 평타 · 자동 평타가 원래 무기로 나가지 않게
export const bloodSwordOn = (h) => !!(h && h.bd && h.bd.sw);
// 한 번 베기 — 지금 내 자리 중심 · 누른 순간 겨눈 방향 · 반경 R · 100도. 대상별 한 번. 횟수 제한 없이 위 → 아래 · 아래 → 위를 번갈아 벤다
function swordHit(E, g, h, sw) {
  const i = sw.i++;
  sw.qd = 0; sw.gap = SW.gap; sw.sT = 0;
  const [ax, ay] = E.aim(g, h, sw.R);
  sw.ax = r2(ax); sw.ay = r2(ay);
  const list = E.arc(g, h, sw.ax, sw.ay, sw.R, (SW.arc / 2) * Math.PI / 180).filter((o) => E.alive(g, h, o, sw.map) && !walled(E, sw.map, h.x, h.y, o));
  let hit = 0;
  const one = {};                                    // 혈흔 회수 상한은 베기 한 번마다(새 누름 = 한 시전)
  for (const o of list) {
    strike(E, g, h, sw, o, SW.mul * (1 + sw.add + markBonus(h, o)));   // 형상화 스킬 피해 — 혈흔은 첫 유효 적중에서 쓴다
    reap(E, g, h, o, one);
    if (!E.dummy(o)) hit = 1;
  }
  h.swing = 0.22;
  E.fx(g, h.map, { kind: "sk_bj_sword", x: h.x, y: h.y, ax: sw.ax, ay: sw.ay, r: sw.R, i: i % 2, pi: h.pi, t: 0.24, life: 0.24, snd: list.length ? "bloodHit" : "slash" });
  if (hit) sw.xp = 1;
}
// 혈검 끝 — 칼날이 피로 풀린다. 형상화 경험치는 유효 적중이 있었으면 시전당 한 번
export function endSword(E, g, h, why) {
  const s = h && h.bd, sw = s && s.sw;
  if (!sw) return;
  s.sw = null;
  if (sw.xp && why !== "down") trainXp(E, g, h, 2, BLOOD.train.cast);
  E.fx(g, sw.map, { kind: "sk_bj_swend", x: h.x, y: h.y, ax: sw.ax, ay: sw.ay, pi: h.pi, ph: sw.ph, t: 0.4, life: 0.4 });
}
function tickSword(E, g, h, s, dt) {
  const sw = s.sw;
  if (h.down > 0 || E.locked(h) || sw.map !== h.map) return void endSword(E, g, h, h.down > 0 ? "down" : "stop");
  sw.t += dt; sw.sT += dt; sw.gap = Math.max(0, sw.gap - dt);
  if (sw.ph === 1) { if (sw.t >= SW.form) { sw.ph = 2; sw.t = 0; } return; }
  if (sw.qd && sw.gap <= 0) swordHit(E, g, h, sw);
  if (s.sw === sw && sw.t >= SW.hold) endSword(E, g, h, "time");
}

/* ── 혈형 변환 · 혈막 ───────────────────────────────── */
function formWhy(E, g, h, cost) {                   // 혈막 — 대기 15초(cd.form)
  const s = st(h), lock = shapeLock(h);
  if (lock) return lock;
  if (s.cd.form > 0) return `${F.veil.name} ${Math.ceil(s.cd.form)}초`;
  if (h.bag.bd.b < cost) return "혈량 부족";
  return "";
}
export const veilStat = (lv) => [Math.min(F.veil.durMax, F.veil.dur + F.veil.durPer * lv), Math.min(F.veil.redMax, F.veil.red + F.veil.redPer * lv)];
// 혈막 연출 한 장의 길이 — 0.25초마다 새로 내고 넉넉히 겹치게 둔다(손님 화면은 스냅샷이 늦게 와도 끊기지 않게, 11월 15일).
// 겹친 장은 그림에서 한 사람당 한 장만 그린다(bloodJobArt.js veilSeen)
const VEIL_LIFE = 0.7;
// 혈막 연출 크기는 sz 로 싣는다 — k 로 실으면 서버 소식({ k: "fx", ...연출 })의 k 를 덮어써 손님 화면에 혈막이 오지 않았다(11월 15일)
function veilPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.vl) return;
  const k = r2(1 + rangeAdd(h) + (inField(h) ? FD.size : 0));   // 혈막 크기(보이는 것만) — 혈역 조건은 발동 직전에 본다
  breakFor(E, g, h, "veil");
  const no = formWhy(E, g, h, F.veil.cost);
  if (no) return void E.say(g, h.map, h.x, h.y - 90, no, no === "혈량 부족" ? "#ff8a8a" : "#f0dcb4");   // 못 쓰면 혈역은 그대로
  if (s.fd) endField(E, g, h, "veil");
  endSword(E, g, h, "veil");                         // 혈막으로 바꾸면 든 혈검이 풀린다
  const [max, red] = veilStat(shapeLv(h));
  spend(h, F.veil.cost);
  s.cd.form = F.cd;
  s.vl = { t: 0, max: r2(max), red: Math.round(red * 1000) / 1000, did: 0, hT: F.veil.hint, rT: 0, k };
  E.fx(g, h.map, { kind: "sk_bj_veil", x: h.x, y: h.y, pi: h.pi, u: 0, max: s.vl.max, sz: k, start: 1, t: VEIL_LIFE, life: VEIL_LIFE, snd: "bloodCharge" });
}
// 혈막 끝 — 실제로 피해를 줄였다면 혈량 10(사망으로 끝나면 없음). 형상화 경험치는 줄였으면 시전당 +10
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
export function bloodJobTake(E, g, h, dmg, src) {
  const v = h && h.bd && h.bd.vl;
  if (!v || !(dmg > 0)) return dmg;
  v.did = 1;
  // 맞은 쪽 — 때린 것의 자리를 알면 그쪽 판이 움푹 들어간다(모르면 보는 쪽)
  const a = src && Number.isFinite(src.x) && Number.isFinite(src.y) && (src.x !== h.x || src.y !== h.y) ? Math.atan2((src.y - h.y), src.x - h.x) : (h.dir < 0 ? Math.PI : 0);
  if (v.rT <= 0) { v.rT = F.veil.ripple; E.fx(g, h.map, { kind: "sk_bj_ripple", x: h.x, y: h.y, a: r2(a), pi: h.pi, t: 0.35, life: 0.35, snd: "hit" }); }
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
// 1초마다 — 나와 유효한 적이 모두 혈역 안일 때만 혈량을 얻는다(과부하 한계까지). 못 얻은 회차는 넘어간다(쌓이지 않는다)
function fieldTick(E, g, h, f) {
  const foes = E.near(g, h, f.x, f.y, FD.r + 40).filter((o) => E.alive(g, h, o, f.map) && Math.hypot(o.x - f.x, (o.y - f.y) / E.squash) <= FD.r);
  if (!foes.length || !inField(h)) { f.none = 1; return; }
  f.none = 0;
  const got = gainBlood(h, FD.gain, true);
  if (got > 0 && foes.some((o) => !E.dummy(o))) f.xp += FD.xp;
  if (got > 0) E.fx(g, h.map, { kind: "sk_bj_absorb", x: f.x, y: f.y, x1: h.x, y1: h.y, got, pi: h.pi, t: 0.6, life: 0.6, snd: "bloodHit", who: h.pi });
  if (h.bag.bd.b >= overCap(h.bag.bd.lv)) overload(E, g, h);
}


/* ── 혈류 파동(11월 15일 개편 · 증폭 · 직업 레벨 15) ────────────────
   s.wv = [{ fid, x, y, R 끝 반경, t, hit [대상 키], cast, base, add, xp, map, rp 혈흔 회수 }] — 가장자리가 지나간 대상마다 한 번 */
export const waveRadius = (h) => Math.round(WV.r * (1 + (bloodOn(h) ? ampBonus(h) + rangeAdd(h) : 0)));
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
// 파동 중심 — 포인터 자리(450 밖이면 450 으로 줄인다) · 없으면 가까운 적 · 없으면 보는 쪽 near. 내 자리에서 벽 너머로는 가지 않는다
function wavePoint(E, g, h) {
  let dx, dy;
  if (h.inputPt) { dx = h.inputPt[0] - h.x; dy = (h.inputPt[1] - h.y) / E.squash; }
  else {
    const o = E.near(g, h, h.x, h.y, WV.reach).filter((q) => E.alive(g, h, q, h.map)).sort((a, b) => sq(E, h.x, h.y, a) - sq(E, h.x, h.y, b))[0];
    if (o) { dx = o.x - h.x; dy = (o.y - h.y) / E.squash; }
    else { const [ax, ay] = E.face(h); dx = ax * WV.near; dy = ay * WV.near; }
  }
  let d = Math.hypot(dx, dy);
  if (d < 1) return [h.x, h.y];
  const ux = dx / d, uy = dy / d;
  d = Math.min(d, WV.reach, wallCut(E, h, ux, uy, Math.min(d, WV.reach)));
  return [Math.round(h.x + ux * d), Math.round(h.y + uy * d * E.squash)];
}
function wavePress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  breakFor(E, g, h, "wave");
  const lock = lvLock(h, BLOOD.unlock.wave);
  if (lock) return void E.say(g, h.map, h.x, h.y - 90, lock, "#d9c9a6");
  if (s.cd.wave > 0) return void E.say(g, h.map, h.x, h.y - 90, `${WV.name} ${Math.ceil(s.cd.wave)}초`, "#f0dcb4");
  if (h.bag.bd.b < WV.cost) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const [x, y] = wavePoint(E, g, h);
  const R = waveRadius(h);                           // 반경 · 피해 보너스는 발동 순간 값
  endSword(E, g, h, "skill");
  spend(h, WV.cost);
  s.cd.wave = WV.cd;
  const wv = { fid: `bw${h.pi}.${++s.q}`, x, y, R, t: 0, hit: [], cast: E.cast(h), base: E.base(h), add: dmgAdd(h), xp: 0, map: h.map };
  s.wv.push(wv);
  h.swing = 0.25;
  if (Math.abs(x - h.x) > 1) h.dir = x < h.x ? -1 : 1;
  E.fx(g, h.map, { kind: "sk_bj_wave", x, y, r: R, d: WV.spread, x1: h.x, y1: h.y, fid: wv.fid, pi: h.pi, t: WV.spread + 0.45, life: WV.spread + 0.45, snd: "bloodBoom" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: WV.name, color: "#E53945", who: h.pi, t: 0.6, life: 0.6 });
}
// 한 틱 — 지금 반경(가장자리)이 닿은 대상에게 한 번. 벽 뒤 대상은 빠진다. 다 퍼지면 끝(돌려주는 값 false)
function stepWave(E, g, h, wv, dt) {
  wv.t += dt;
  const r = wv.R * Math.min(1, wv.t / WV.spread);
  const list = E.near(g, h, wv.x, wv.y, wv.R + 60).filter((o) => E.alive(g, h, o, wv.map) && !wv.hit.includes(keyOf(o))
    && sq(E, wv.x, wv.y, o) - (o.rad || 16) * 0.5 <= r && !walled(E, wv.map, wv.x, wv.y, o));
  for (const o of list) {
    wv.hit.push(keyOf(o));
    strike(E, g, h, wv, o, WV.mul * (1 + wv.add + markBonus(h, o)));
    reap(E, g, h, o, wv);
    E.cc(g, h, o, { slow: WV.slow, slowAmt: WV.slowAmt });   // 보스 · 사람은 기존 제압 규칙(ccAny) 그대로
    E.fx(g, wv.map, { kind: "sk_bj_hit", x: o.x, y: o.y, pi: h.pi, tier: 0, t: 0.3, life: 0.3, snd: wv.hit.length === 1 ? "bloodHit" : undefined });
  }
  return wv.t < WV.spread;
}

/* ── 혈쇄 갈고리(11월 15일 개편 · 형상화 · 직업 레벨 20) ──────────────
   s.hk = { fid, ph 1 날아가는 중 · 2 끌려가는 중, t, fly 날아가는 초, k 대상 키, x0 · y0 시작 자리, ax · ay, map } — 피해 · 무적 없음 */
// 겨눈 방향 420 안의 첫 유효한 적과 그 앞 자리 — 대상이 없거나 길이 벽에 막히면 null
function hookTarget(E, g, h) {
  const [ax, ay] = E.aim(g, h, HK.reach);
  const list = E.near(g, h, h.x, h.y, HK.reach + 40).filter((o) => E.alive(g, h, o, h.map)).map((o) => {
    const dx = o.x - h.x, dy = (o.y - h.y) / E.squash;
    return { o, along: dx * ax + dy * ay, side: Math.abs(dx * ay - dy * ax) };
  }).filter((q) => q.along > 0 && q.along <= HK.reach + (q.o.rad || 16) * 0.5 && q.side <= HK.width + (q.o.rad || 16) * 0.5).sort((a, b) => a.along - b.along);
  const q = list[0];
  if (!q) return null;
  const o = q.o, dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1, rr = (o.rad || 16) * 0.5;
  if (walled(E, h.map, h.x, h.y, o)) return null;      // 길이 벽에 막혔다
  return { o, ux: dx / d, uy: dy / d, d, go: Math.max(0, d - rr - HK.gap) };
}
function hookPress(E, g, h) {
  const s = st(h), w = why(E, g, h);
  if (w) { if (w !== "-") E.say(g, h.map, h.x, h.y - 90, w, "#d9c9a6"); return; }
  if (s.hk) return;
  breakFor(E, g, h, "hook");
  const lock = lvLock(h, BLOOD.unlock.hook);
  if (lock) return void E.say(g, h.map, h.x, h.y - 90, lock, "#d9c9a6");
  if (s.cd.hook > 0) return void E.say(g, h.map, h.x, h.y - 90, `${HK.name} ${Math.ceil(s.cd.hook)}초`, "#f0dcb4");
  if (h.bag.bd.b < HK.cost) return void E.say(g, h.map, h.x, h.y - 90, "혈량 부족", "#ff8a8a");
  const q = hookTarget(E, g, h);
  if (!q) return void E.say(g, h.map, h.x, h.y - 90, "걸 대상이 없습니다", "#d9c9a6");   // 시전하지 않는다 — 비용 · 대기 없음
  endSword(E, g, h, "skill");
  spend(h, HK.cost);
  s.cd.hook = HK.cd;
  const fly = r2(Math.max(0.08, q.d / HK.fly));
  s.hk = { fid: `bk${h.pi}.${++s.q}`, ph: 1, t: 0, fly, k: keyOf(q.o), x0: Math.round(h.x), y0: Math.round(h.y), ax: r2(q.ux), ay: r2(q.uy), map: h.map };
  if (Math.abs(q.ux) > 0.05) h.dir = q.ux < 0 ? -1 : 1;
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_bj_hook", x: h.x, y: h.y, x1: q.o.x, y1: q.o.y, ax: s.hk.ax, ay: s.hk.ay, d: fly, fid: s.hk.fid, pi: h.pi, t: fly + 0.03, life: fly + 0.03, snd: "bloodCharge" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text: HK.name, color: "#E53945", who: h.pi, t: 0.6, life: 0.6 });
}
// 갈고리 끝 — 움직였으면 형상화 경험치 +10(시전당 한 번). 사슬은 핏방울로 흩어진다
function endHook(E, g, h, moved) {
  const s = h.bd, k = s && s.hk;
  if (!k) return;
  s.hk = null;
  s.hkT = 0.5;                                       // 끝난 뒤 잠깐 — 손님 화면이 끌려간 자리를 한 번에 옮기지 않고 나눠 옮기게(스냅샷 12번 칸 3)
  if (moved) trainXp(E, g, h, 2, BLOOD.train.cast);
  E.fx(g, k.map, { kind: "sk_bj_hookend", x: h.x, y: h.y, ax: k.ax, ay: k.ay, pi: h.pi, t: 0.4, life: 0.4 });
}
function tickHook(E, g, h, s, dt) {
  const k = s.hk;
  if (h.down > 0 || E.locked(h) || k.map !== h.map) { if (k.ph === 2) h.dash = 0; return void endHook(E, g, h, false); }
  k.t += dt;
  if (k.ph === 1) {
    if (k.t < k.fly) return;
    const o = find(g, k.k);                           // 걸렸다 — 그 순간 자리로 끌려간다(대상이 사라졌거나 벽 뒤로 갔으면 풀린다)
    if (!o || !E.alive(g, h, o, k.map) || walled(E, h.map, h.x, h.y, o)) return void endHook(E, g, h, false);
    const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const go = Math.min(Math.max(0, d - (o.rad || 16) * 0.5 - HK.gap), wallCut(E, h, ux, uy, d));   // 벽 앞에서 멈춘다
    k.ph = 2; k.t = 0; k.ax = r2(ux); k.ay = r2(uy); k.x0 = Math.round(h.x); k.y0 = Math.round(h.y);
    if (go < 1) return void endHook(E, g, h, false);
    E.move(h, { x: h.x + ux * go, y: h.y + uy * go * E.squash }, HK.move);
    E.fx(g, h.map, { kind: "sk_bj_hookpull", x: h.x, y: h.y, x1: o.x, y1: o.y, d: HK.move, fid: k.fid, pi: h.pi, t: HK.move + 0.1, life: HK.move + 0.1, snd: "bloodHit" });
    return;
  }
  if (k.t >= HK.move) endHook(E, g, h, Math.hypot(h.x - k.x0, (h.y - k.y0) / E.squash) >= HK.minMove);
}

/* ── 혈량 전환 ─────────────────────────────────────── */
function convert(E, g, h) {
  if (!bloodOn(h) || h.down > 0) return;
  const s = st(h), bd = h.bag.bd;
  if (s.cd.conv > 0) return;
  if (bd.b >= stableCap(bd.lv)) return void E.say(g, h.map, h.x, h.y - 90, "혈량이 안정 한계입니다", "#d9c9a6");   // 안정 한계까지만(11월 15일 개편 — 넘는 것은 혈역 증폭뿐)
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
  if (req.s === "wave") { if (req.op === "press") wavePress(E, g, h); return false; }   // 한 번 누르면 바로(11월 15일)
  if (req.s === "hook") { if (req.op === "press") hookPress(E, g, h); return false; }
  if (req.op === "cancel") {                         // 창을 벗어났다 · 채팅 — 차징 · 유지 입력을 모두 푼다
    if (h.bd && h.bd.ch) cancelCharge(E, g, h);
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
    // 한 번 누르면 켜지고 15초 뒤에 끝난다 — 놓기 · 다시 누르기는 아무 일도 없다(취소 없음)
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
      if (c.t >= S.full) fireShot(E, g, h);          // 최대 1.2초 — 자동 발사(계속 누르고 있어도 다시 쏘지 않는다)
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
  if (s.sw) tickSword(E, g, h, s, dt);
  if (s.hk) tickHook(E, g, h, s, dt);
  else if (s.hkT > 0) s.hkT -= dt;               // 혈쇄 갈고리 — 날아감 → 끌려감(기절 · 사망 · 맵 이동이면 풀린다)
  if (s.wv.length) s.wv = s.wv.filter((wv) => {      // 혈류 파동 — 맵을 옮기면 사라진다 · 쓰러져도 이미 퍼진 파동은 간다
    if (wv.map !== h.map) { E.fx(g, wv.map, { kind: "cut", ref: wv.fid }); return false; }
    const going = stepWave(E, g, h, wv, dt);
    if (!going && wv.xp) trainXp(E, g, h, 1, BLOOD.train.cast);   // 증폭형 — 피해가 들어간 시전이면 +10
    return going;
  });              // 혈검 — 생성 · 유지 · 기다린 누름 · 풀림(기절 · 사망 · 맵 이동이면 풀린다)
  if (s.vl) {
    const v = s.vl;
    v.t += dt; v.rT -= dt; v.hT -= dt;
    if (h.down > 0) endVeil(E, g, h, "down");
    else if (E.locked(h) || E.fight(h)) endVeil(E, g, h, "break");
    else if (v.t >= v.max) endVeil(E, g, h, "time");
    else if (v.hT <= 0) {
      v.hT = F.veil.hint;
      E.fx(g, h.map, { kind: "sk_bj_veil", x: h.x, y: h.y, pi: h.pi, u: r2(v.t / v.max), max: v.max, sz: v.k, t: VEIL_LIFE, life: VEIL_LIFE });
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
  if (overWarn(bd.b, bd.lv, s.rg) && !s.w175) { s.w175 = 1; E.sys(g, h.pi, `혈량 ${bd.b} — 다음 혈역 획득 시 폭주합니다.`); }   // 한 번
  if (!overWarn(bd.b, bd.lv, null)) s.w175 = 0;
  const f = s.fd;
  if (f) {
    f.t += dt;
    if (h.down > 0 || E.locked(h) || E.fight(h)) endField(E, g, h, "stop");
    else if (f.map !== h.map) endField(E, g, h, "out");   // 맵을 옮기면 끝
    else {
      f.x = Math.round(h.x); f.y = Math.round(h.y);   // 혈역은 시전자를 따라다닌다(11월 14일 사용자 요청) — 판정 중심도 늘 지금 내 자리
      while (s.fd === f && f.n < FD.dur / FD.tick && f.t + 1e-6 >= f.next) { f.n += 1; f.next += FD.tick; fieldTick(E, g, h, f); }
      if (s.fd === f && f.t >= FD.dur) endField(E, g, h, "time");
      else if (s.fd === f && (f.hT -= dt) <= 0) {
        f.hT = FD.hint;
        E.fx(g, h.map, { kind: "sk_bj_field", x: f.x, y: f.y, r: FD.r, pi: h.pi, u: r2(f.t / FD.dur), none: f.none, t: FD.hint + 0.08, life: FD.hint + 0.08 });
      }
    }
  }
  if (!s.fd && bd.b > cap) {                         // 혈역이 끝나고 1초 뒤부터 1초에 한 번 10씩(한계 아래로는 줄지 않는다, 11월 15일 — 프레임마다 1 이 아니라 1초에 한 번)
    if (s.dw > 0) s.dw -= dt;
    else { s.dA += dt; if (s.dA >= 1) { s.dA -= 1; bd.b = Math.max(cap, bd.b - FD.decay); } }
  } else s.dA = 0;
  // PvE 자연 회복 — 30 아래면 1초에 한 번 +5(30 까지). 쓰러진 동안 · PvP 에서는 멈춘다(11월 15일 개편)
  const R = BLOOD.regen;
  if (bd.b < R.below && h.down <= 0 && !(E.pvp && E.pvp(g, h))) {
    s.rT += dt;
    if (s.rT >= R.gap) { s.rT -= R.gap; bd.b = Math.min(R.below, bd.b + R.gain); }
  } else s.rT = 0;
}
// 쓰러졌다 — 상태를 풀고 혈량 0(이미 쏜 탄은 그대로 날아간다)
export function bloodJobDown(E, g, h) {
  if (!bloodOn(h)) return;
  const s = st(h);
  if (s.vl) endVeil(E, g, h, "down");
  if (s.fd) endField(E, g, h, "down");
  endSword(E, g, h, "down");
  if (s.hk) endHook(E, g, h, false);
  s.ch = null; s.mk = {}; s.rg = null;
  h.bag.bd.b = 0;
}
// 훈련장 · 테스트 서버 "스택 가득" — 혈량을 안정 상한까지
export function bloodJobFill(h) { if (bloodOn(h)) h.bag.bd.b = Math.max(h.bag.bd.b, stableCap(h.bag.bd.lv)); }

/* ── 스냅샷 줄 56 — [혈량, 직업 레벨, 경험치, 연마 [l, x] × 3 펼침, 대기 [적혈탄, 전환, 혈수 강타, 혈형 변환], 차징 [단계 시간, x, y, 스킬 0 적혈탄 · 1 혈수 강타] | 0,
   혈흔 [[키, 중첩, 남은 초]], 혈막 [지난 초, 최대 초] | 0, 폭주 · 탈진 [1 | 2, 남은 초] | 0, 혈역 [x, y, 지난 초, 흡수 대상 없음 1] | 0]
   대기 칸 5번째는 혈역 증폭 · 6번째는 혈검(11월 15일). 10번 해금 시험 단계(0 없음).
   11번 혈검 [1 만드는 중 · 2 든 검, 그 단계 지난 초, 남은 베기, 방향 x, y, 벤 횟수, 마지막 베기 뒤 초] | 0(11월 15일). 칸은 뒤에만 더한다.
   11월 15일 개편 — 대기 칸 7 · 8번째 혈류 파동 · 혈쇄 갈고리, 9번째 적혈탄 지금 대기의 최대(쏜 단계 2 · 3 · 5초). 12번 갈고리 [단계 1 날아감 · 2 끌려감 · 3 막 끝남(0.5초), 지난 초] | 0 ── */
export function packBloodJob(h) {
  if (!bloodOn(h)) return 0;
  const bd = h.bag.bd, s = h.bd;
  return [Math.round(bd.b), bd.lv, bd.xp, bd.tr.flat(), s ? [r1(s.cd.shot), r1(s.cd.conv), r1(s.cd.smash || 0), r1(s.cd.form || 0), r1(s.cd.field || 0), r1(s.cd.sword || 0), r1(s.cd.wave || 0), r1(s.cd.hook || 0), (s.cdMax && s.cdMax.shot) || 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0],
    s && s.ch ? [r2(s.ch.t), s.ch.ax, s.ch.ay, s.ch.s === "smash" ? 1 : 0] : 0,
    s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], r1(m[1])]) : [],
    s && s.vl ? [r2(s.vl.t), s.vl.max] : 0,
    s && s.rg ? [s.rg.k, r1(s.rg.t)] : 0,
    s && s.fd ? [s.fd.x, s.fd.y, r2(s.fd.t), s.fd.none] : 0,
    h.bt ? h.bt.step : 0,
    s && s.sw ? [s.sw.ph, r2(s.sw.t), s.sw.left, s.sw.ax, s.sw.ay, s.sw.i, r2(Math.min(9, s.sw.sT))] : 0,
    s && s.hk ? [s.hk.ph, r2(s.hk.t)] : s && s.hkT > 0 ? [3, 0] : 0];
}
// 손님 — 화면에 쓰는 값만 h.bdv 로(판정 상태 h.bd 는 건드리지 않는다)
export function applyBloodJob(h, a) {
  if (!Array.isArray(a)) { h.bdv = null; return; }
  if (h.bag && h.bag.bd) h.bag.bd.b = Math.max(0, Math.min(overCap(h.bag.bd.lv), Number(a[0]) || 0));   // 방장 승계 때 지금 혈량을 이어받는다
  const tr = Array.isArray(a[3]) ? a[3] : [];
  h.bdv = { b: Number(a[0]) || 0, lv: Number(a[1]) || 1, xp: Number(a[2]) || 0, tr: [[tr[0] | 0, tr[1] | 0], [tr[2] | 0, tr[3] | 0], [tr[4] | 0, tr[5] | 0]],
    cd: Array.isArray(a[4]) ? { shot: +a[4][0] || 0, conv: +a[4][1] || 0, smash: +a[4][2] || 0, form: +a[4][3] || 0, field: +a[4][4] || 0, sword: +a[4][5] || 0, wave: +a[4][6] || 0, hook: +a[4][7] || 0 } : { ...NO_CD },
    shotMax: Array.isArray(a[4]) ? +a[4][8] || 0 : 0,
    ch: Array.isArray(a[5]) ? { t: +a[5][0] || 0, ax: +a[5][1] || 0, ay: +a[5][2] || 0, s: a[5][3] === 1 ? "smash" : "shot" } : null,
    mk: Array.isArray(a[6]) ? a[6].filter((m) => Array.isArray(m) && typeof m[0] === "string").map((m) => [m[0], m[1] | 0, +m[2] || 0]) : [],
    vl: Array.isArray(a[7]) ? { t: +a[7][0] || 0, max: +a[7][1] || 0 } : null,
    rg: Array.isArray(a[8]) ? { k: a[8][0] === 2 ? 2 : 1, t: +a[8][1] || 0 } : null,
    fd: Array.isArray(a[9]) ? { x: +a[9][0] || 0, y: +a[9][1] || 0, t: +a[9][2] || 0, none: a[9][3] ? 1 : 0 } : null, bt: Number(a[10]) || 0,
    sw: Array.isArray(a[11]) ? { ph: a[11][0] === 1 ? 1 : 2, t: +a[11][1] || 0, left: a[11][2] | 0, ax: +a[11][3] || 0, ay: +a[11][4] || 0, i: a[11][5] | 0, sT: +a[11][6] || 0 } : null,
    hk: Array.isArray(a[12]) && a[12][0] !== 3 ? { ph: a[12][0] === 2 ? 2 : 1, t: +a[12][1] || 0 } : null, at: Date.now() };
}
const NO_CD = { shot: 0, conv: 0, smash: 0, form: 0, field: 0, sword: 0, wave: 0, hook: 0 };
// 화면 값 — 방장(판정 세계)은 h.bag.bd · h.bd 에서, 손님은 h.bdv 에서 같은 모양으로
export function bloodView(h) {
  if (!h) return null;
  if (h.bdv) return h.bdv;
  if (!bloodOn(h)) return null;
  const bd = h.bag.bd, s = h.bd;
  return { b: bd.b, lv: bd.lv, xp: bd.xp, tr: bd.tr, cd: s ? { ...NO_CD, ...s.cd } : { ...NO_CD }, shotMax: (s && s.cdMax && s.cdMax.shot) || 0,
    ch: s && s.ch ? { t: s.ch.t, ax: s.ch.ax, ay: s.ch.ay, s: s.ch.s } : null,
    mk: s ? Object.entries(s.mk).map(([k, m]) => [k, m[0], m[1]]) : [], vl: s && s.vl ? { t: s.vl.t, max: s.vl.max } : null,
    rg: s && s.rg ? { k: s.rg.k, t: s.rg.t } : null, fd: s && s.fd ? { x: s.fd.x, y: s.fd.y, t: s.fd.t, none: s.fd.none } : null, bt: h.bt ? h.bt.step : 0,
    sw: s && s.sw ? { ph: s.sw.ph, t: s.sw.t, left: s.sw.left, ax: s.sw.ax, ay: s.sw.ay, i: s.sw.i, sT: s.sw.sT } : null,
    hk: s && s.hk ? { ph: s.hk.ph, t: s.hk.t } : null };
}
