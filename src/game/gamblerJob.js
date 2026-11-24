/* ── 히든 직업 Gambler 002(도박꾼) 판정 — 베팅 칩 · 풀 베팅 · 스킬 8종(11월 16일) ─────────────
   수치는 gamblerData.js. 판정 쪽(방장 · 전용 서버 꼴)만 셈한다. 화면은 연출(fx)과 gamblerView 값만 그린다.
   11월 16일 사용자 결정 — 격자 연습장에서 확인한 뒤 실제 게임에 넣었다. 저장은 shop.js cleanBag 이 cleanHj 로 싣고,
   손님 화면 값은 스냅샷 영웅 줄 57(packGambler → h.gmv)로 간다. 해금 경로는 gamblerUnlock.js, 관리자 명령어는 adminCmd.js /도박꾼.
   피해는 기존 strikeAny · 평타 판정을 거쳐 결투 시전별 상한 · 사냥터 PvP 상한이 그대로 걸린다. 한 시전의 모든 타가 같은 시전 객체를 쓴다.
   저장 꼴(기획안 최종 추천안) bag.hj = { active: "gambler", jobs: { gambler: { lv, xp, tr: [[연마 레벨, 경험치] × 3] } }, version: 1 }.
   해금 시험 중에는 { …, trial: 1, prev: 원래 값 } 으로 빌려준다 — 저장(cleanHj)은 늘 prev 를 쓴다.
   싸우는 동안의 상태 h.gm — 칩 · 대기 · 보호막 · 불운 보정 · 직전 공격 · 날아가는 것들. 칩은 저장하지 않는다(스냅샷으로만 이어받는다).
   E(엔진, rpg.js gamblerEngine): fx · say · sys · near · strike · basic · alive · base · face · locked · fight · squash · blocks ·
   cast(h, sid) · dummy · cdOff · rand(g) · allies · shield · shieldAmt · boss */
import { faceAim } from './faceDir.js';
import { cleanEnJob } from './engineerJob.js';   // Engineer 003(11월 19일 실제 게임) — 같은 bag.hj 칸에 함께 저장한다
import { ENGINEER_ID } from './engineerData.js';
import { cleanNcJob } from './necroJob.js';   // Necromancer 004(11월 20일 실제 게임) — 같은 bag.hj 칸에 함께 저장한다
import { NECRO_ID } from './necroData.js';
import { cleanIlJob } from './illusionJob.js';   // Illusionist 005(11월 23일 실제 게임) — 같은 bag.hj 칸에 함께 저장한다
import { ILLUSION_ID } from './illusionData.js';
import { cleanWyJob } from './wyvernJob.js';   // Wyvern Knight 006(11월 24일 실제 게임 — 관리자 명령어) — 같은 bag.hj 칸에 함께 저장한다
import { WYVERN_ID } from './wyvernData.js';
import { GAMBLER as GM, GAMBLER_ID, GAMBLER_NAME, GAMBLER_TINT, GM_TRAIN_NAMES, GM_BET as BET, GM_LUCK as LUCK, GM_CHIP as CH, GM_VEIL as VL,
  GM_DICE as DC, GM_RAIN as RN, GM_DD as DD, GM_TABLE as TB, GM_EDGE as EG, GM_JACK as JK, GM_SKILLS } from "./gamblerData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const GOLD = "#F2DFA6", DIM = "#d9c9a6", WARN = "#f0dcb4";

/* ── 저장 값 ───────────────────────────────────────── */
export const gmJobNeed = (lv) => GM.xp.base + GM.xp.per * lv;
export const gmTrainNeed = (l) => GM.train.base + GM.train.per * l;
// 직업 한 칸 — 레벨 · 경험치 · 연마를 범위 안으로
export function cleanGmJob(d) {
  d = d && typeof d === "object" ? d : {};
  const lv = clampN(d.lv, 1, GM.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, GM.train.max);
    return [l, l >= GM.train.max ? 0 : clampN(q[1], 0, gmTrainNeed(l) - 1)];
  });
  return { lv, xp: lv >= GM.maxLv ? 0 : clampN(d.xp, 0, gmJobNeed(lv) - 1), tr };
}
/* 가방 칸 bag.hj 저장 검사 — 시험 중 빌린 값은 원래 값(prev)으로. 아는 직업(gambler)만 싣는다.
   bdOn: BLOOD-001 이 켜져 있다 — 히든 직업은 한 번에 하나라 둘 다 켜진 기록은 먼저 있던 BLOOD-001 을 남기고 이쪽을 끈다(직업 레벨 · 연마는 남는다) */
// 실제 게임에 열린 직업만 싣는다(연습장 전용 직업은 저장하지 않는다). 뒤에만 더한다
const SAVED_JOBS = { [GAMBLER_ID]: cleanGmJob, [ENGINEER_ID]: (d) => cleanEnJob(d), [NECRO_ID]: (d) => cleanNcJob(d), [ILLUSION_ID]: (d) => cleanIlJob(d), [WYVERN_ID]: (d) => cleanWyJob(d) };
export function cleanHj(d, bdOn) {
  if (d && typeof d === "object" && d.trial) return cleanHj(d.prev, bdOn);
  if (!d || typeof d !== "object" || !d.jobs || typeof d.jobs !== "object") return null;
  const jobs = {};
  for (const id of Object.keys(SAVED_JOBS)) if (d.jobs[id]) jobs[id] = SAVED_JOBS[id](d.jobs[id]);
  if (!Object.keys(jobs).length) return null;
  return { active: jobs[d.active] && !bdOn ? d.active : "", jobs, version: 1 };
}
// 이 직업인가 — 판정은 가방 값으로만 본다. GAMBLER.live 를 끄면 연습장(g.test 의 sandbox 맵)에서만 켜진다
export const gamblerOn = (h) => !!(h && h.bag && h.bag.hj && h.bag.hj.active === GAMBLER_ID && h.bag.hj.jobs && h.bag.hj.jobs[GAMBLER_ID] && (GM.live || h.map === "sandbox"));
// 그림 · 화면 — 손님은 남의 가방이 늦게 올 수 있어 스냅샷 값(h.gmv)도 본다
export const gamblerLook = (h) => !!(h && (h.gmv || gamblerOn(h)));
const jobOf = (h) => h.bag.hj.jobs[GAMBLER_ID];
export const gmTrainSum = (J) => (J ? J.tr.reduce((n, q) => n + q[0], 0) : 0);
export const gamblerTint = (sum) => GAMBLER_TINT.find((t) => sum >= t.from).id;
export const gmContract = (J) => gmTrainSum(J) >= GM.contract;   // 황금 계약 — 연마 합계 150
// 스킬 잠김 까닭(빈 글이면 열림)
export const gmLock = (J, sk) => (!J ? "잠김" : J.lv < GM.unlock[sk] ? `직업 레벨 ${GM.unlock[sk]}에 열립니다` : "");

/* 켜기 — 1차 전직 · BLOOD-001 과 함께 쓰지 못한다(한 번에 하나). 든 무기는 내려놓는다(지우지 않는다).
   init 이 있으면 그 레벨 · 연마로(연습장), 없으면 예전 기록을 잇거나 직업 레벨 1 부터 */
export function unlockGambler(h, init) {
  const old = h.bag.hj && h.bag.hj.jobs ? h.bag.hj.jobs : {};
  h.bag.hj = { active: GAMBLER_ID, jobs: { ...old, [GAMBLER_ID]: cleanGmJob(init || old[GAMBLER_ID]) }, version: 1 };
  h.gmv = null;
  if (h.bag.bd && h.bag.bd.on) h.bag.bd = { ...h.bag.bd, on: 0 };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null;
  h.bag.e = 0;
  h.gm = null;
  h.bag.v = (h.bag.v || 0) + 1;
}
// 끄기 — 직업 레벨 · 연마는 남긴다(다시 켜면 이어서)
export function dropGambler(h) {
  if (!h.bag || !h.bag.hj) return;
  const hj = h.bag.hj.trial ? h.bag.hj.prev : h.bag.hj;   // 시험 중이었다면 빌린 값부터 거둔다
  if (hj) h.bag.hj = { ...hj, active: "" }; else delete h.bag.hj;
  h.gm = null; h.gmv = null; h.gt = null; h.nc = null; h.ncv = null; h.wy = null; h.wyv = null;
  h.bag.v = (h.bag.v || 0) + 1;
}

/* ── 싸우는 동안의 상태 h.gm ───────────────────────── */
const NO_CD = { veil: 0, dice: 0, rain: 0, dd: 0, table: 0, edge: 0, jack: 0 };
function st(h) {
  return h.gm || (h.gm = { chips: 0, cd: { ...NO_CD }, sh: null, shT: 0, luck: 0, last: null, coins: [], bet: [], dice: [], rain: [], dd: [],
    tbl: null, edge: 0, edgeT: 0, jk: [], xm: [0, 0], q: 0 });
}
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
// 해금 시험(gamblerUnlock.js h.gt) — 시험 중에만 무엇을 해냈는지 적는다. o 가 있으면 내 시험 표적일 때만
const mark = (h, k, o) => { if (h.gt && (!o || o.own === h.pi)) h.gt[k] = 1; };
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
const no = (E, g, h, text, color = DIM) => void E.say(g, h.map, h.x, h.y - 90, text, color);
const call = (E, g, h, text) => E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text, color: GOLD, who: h.pi, t: 0.7, life: 0.7 });
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 탄 · 지점 스킬이 벽 너머로 가지 않는다
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
// (x, y) 둘레 R 안의 유효한 적 — 몸 반지름 절반까지 닿으면 맞는다
const inCircle = (E, g, h, x, y, R, map) => E.near(g, h, x, y, R + 60).filter((o) => E.alive(g, h, o, map) && sq(E, x, y, o) - (o.rad || 16) * 0.5 <= R);
// 지점 스킬이 떨어질 자리 — 포인터 자리(reach 밖이면 reach 로 줄인다) · 없으면 가까운 적 · 없으면 보는 쪽 near
function pointAt(E, g, h, reach, near) {
  let dx, dy;
  if (h.inputPt) { dx = h.inputPt[0] - h.x; dy = (h.inputPt[1] - h.y) / E.squash; }
  else {
    const o = E.near(g, h, h.x, h.y, reach).filter((q) => E.alive(g, h, q, h.map)).sort((a, b) => sq(E, h.x, h.y, a) - sq(E, h.x, h.y, b))[0];
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

/* ── 베팅 칩 ───────────────────────────────────────── */
export const gmChips = (h) => (gamblerOn(h) && h.gm ? h.gm.chips : 0);
// 칩을 얻는다 — 7개까지. 하우스 엣지 중에는 얻을 때마다 +1 더. 7개가 되는 순간 풀 베팅 알림 한 번
function gainChip(E, g, h, n = 1) {
  const s = st(h);
  if (s.chips >= GM.chips) return 0;
  const got = Math.min(n + (s.edge > 0 ? EG.chip : 0), GM.chips - s.chips);
  s.chips += got;
  if (s.chips >= GM.chips) {
    E.fx(g, h.map, { kind: "sk_gm_full", x: h.x, y: h.y, pi: h.pi, t: 0.6, life: 0.6, snd: "gmFull" });
    E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 124, text: "풀 베팅", color: GOLD, who: h.pi, t: 0.9, life: 0.9 });
  }
  return got;
}
/* 한 대 — src 는 그 공격(시전 객체 cast · 기준 피해 base · basic 평타 · noBet 풀 베팅을 일으키지 않음). coin 이면 하우스 엣지 +60%.
   공격 스킬(평타 · 추가 코인 · 다시 낸 공격 제외)의 첫 유효 적중이고 칩이 7개면 풀 베팅을 쓴다 */
function strike(E, g, h, src, o, mul, coin = false) {
  const s = st(h), k = mul * (coin && s.edge > 0 ? 1 + EG.dmg : 1);
  const prev = h.cast; h.cast = src.cast;
  try { (src.basic ? E.basic : E.strike)(g, h, o, src.base * k); } finally { h.cast = prev; }
  if (!E.dummy(o)) src.xp = 1;                        // 유효 적중 — 훈련용 대상은 연마 경험치를 주지 않는다
  if (!src.basic && !src.noBet && s.chips >= GM.chips) fullBet(E, g, h, src, o);
}
// 풀 베팅 — 칩을 모두 쓰고 그 대상에게 추가 코인 7발(같은 시전 · 칩을 다시 얻지 않는다). 황금 계약이면 한 발 ×4
function fullBet(E, g, h, src, o) {
  const s = st(h), top = gmContract(jobOf(h));
  s.chips = 0;
  mark(h, "bet", o);
  s.bet.push({ k: keyOf(o), i: 0, t: 0, mul: top ? BET.mulContract : BET.mul, cast: src.cast, base: src.base, map: src.map, noBet: 1, xp: 0 });
  E.fx(g, h.map, { kind: "sk_gm_bet", x: h.x, y: h.y, x1: o.x, y1: o.y, n: BET.coins, gap: BET.gap, d: BET.fly, top: top ? 1 : 0, pi: h.pi,
    t: BET.fly + BET.gap * BET.coins + 0.2, life: BET.fly + BET.gap * BET.coins + 0.2, snd: "gmCoin" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 124, text: top ? "풀 베팅 — 황금 계약" : "풀 베팅 발동", color: GOLD, who: h.pi, t: 0.9, life: 0.9 });
}
function tickBet(E, g, h, b, dt) {
  b.t += dt;
  while (b.i < BET.coins && b.t >= BET.fly + b.i * BET.gap) {
    b.i += 1;
    const o = find(g, b.k);
    if (!o || !E.alive(g, h, o, b.map)) continue;      // 이미 사라진 대상 — 남은 코인은 헛돈다
    strike(E, g, h, b, o, b.mul, true);
    E.fx(g, b.map, { kind: "sk_gm_hit", x: o.x, y: o.y, pi: h.pi, sm: 1, t: 0.25, life: 0.25, snd: b.i === 1 ? "gmChip" : undefined });
  }
  return b.i < BET.coins;
}

/* ── 경험치 ─────────────────────────────────────────── */
function jobXp(E, g, h, n) {
  const J = jobOf(h), s = st(h);
  if (J.lv >= GM.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, GM.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n;
  J.xp += n;
  let up = 0;
  while (J.lv < GM.maxLv && J.xp >= gmJobNeed(J.lv)) { J.xp -= gmJobNeed(J.lv); J.lv += 1; up = 1; }
  if (J.lv >= GM.maxLv) J.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${GAMBLER_NAME} 직업 레벨 ${J.lv}`, color: GOLD, t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
}
// 연마 경험치 — 시전당 한 번(부른 쪽이 센다). i: 0 금화 · 1 방어 · 2 행운
function trainXp(E, g, h, i, n = GM.train.cast) {
  const q = jobOf(h).tr[i];
  if (q[0] >= GM.train.max || !(n > 0)) return;
  q[1] += n;
  let up = 0;
  while (q[0] < GM.train.max && q[1] >= gmTrainNeed(q[0])) { q[1] -= gmTrainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= GM.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${GM_TRAIN_NAMES[i]} ${q[0]}`, color: GOLD, t: 1.2, life: 1.2, who: h.pi });
}
// 몹을 잡았다 — 친 사람 가운데 도박꾼마다. 허수아비는 세지 않는다
export function gamblerKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? GM.xp.raid : GM.xp.boss) : GM.xp.mob;
  for (const h of got) if (gamblerOn(h)) jobXp(E, g, h, n);
}
export const gamblerRaidKill = (E, g, h) => { if (gamblerOn(h)) jobXp(E, g, h, GM.xp.raid); };

/* ── 쓸 수 있나 ─────────────────────────────────────── */
function why(E, g, h) {
  if (h.down > 0 || E.locked(h)) return "-";
  return E.fight(h) || "";
}
// 공통 검사 — 못 쓰면 까닭을 말하고 true
function blocked(E, g, h, sk) {
  const s = st(h), D = GM_SKILLS[sk], w = why(E, g, h);
  if (w) { if (w !== "-") no(E, g, h, w); return true; }
  const lock = gmLock(jobOf(h), sk);
  if (lock) { no(E, g, h, lock); return true; }
  if (s.cd[sk] > 0) { no(E, g, h, `${D.name} ${Math.ceil(s.cd[sk])}초`, WARN); return true; }
  return false;
}

/* ── 기본 공격 — 황금 칩 ─────────────────────────────
   s.coins = [{ fid, x, y 시작, ax, ay, d 지난 거리, max 벽까지, v, wait 손에서 떠나기까지, cast, base, basic, map, xp }] */
export function gamblerBasic(E, g, h, force) {
  if (!gamblerOn(h)) return false;
  const s = st(h);
  const o = E.near(g, h, h.x, h.y, CH.range).filter((q) => E.alive(g, h, q, h.map)).sort((a, b) => sq(E, h.x, h.y, a) - sq(E, h.x, h.y, b))[0];
  if (!o && !force) return false;
  let ax, ay;
  if (o) { const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
  else [ax, ay] = E.face(h);
  faceAim(h, ax, ay);                              // 치는 쪽을 본다(예전엔 늘 앞)
  const coin = { fid: `gc${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), d: 0, max: wallCut(E, h, ax, ay, CH.range), v: CH.v, wait: CH.wind,
    cast: E.cast(h, "basic"), base: E.base(h), basic: 1, map: h.map, xp: 0 };
  s.coins.push(coin);
  const life = CH.wind + coin.max / coin.v + 0.1;
  E.fx(g, h.map, { kind: "sk_gm_chip", x: h.x, y: h.y, x0: h.x, y0: h.y - GM.lift, ax: coin.ax, ay: coin.ay, len: coin.max, v: coin.v, d: CH.wind, e: s.edge > 0 ? 1 : 0,
    fid: coin.fid, pi: h.pi, t: life, life, snd: "gmChip" });
  return true;
}
// 날아가는 칩 — 한 틱 동안 지나간 길에 처음 닿은 적 하나
function stepCoin(E, g, h, c, dt) {
  if (c.wait > 0) { c.wait -= dt; if (c.wait > 0) return true; dt = -c.wait; }
  const from = c.d, to = Math.min(c.max, c.d + c.v * dt);
  c.d = to;
  const hit = E.near(g, h, c.x, c.y, to + 60).filter((o) => E.alive(g, h, o, c.map)).map((o) => {
    const dx = o.x - c.x, dy = (o.y - c.y) / E.squash;
    return { o, along: dx * c.ax + dy * c.ay, side: Math.abs(dx * c.ay - dy * c.ax) };
  }).filter((q) => q.along >= from - 20 && q.along <= to + 4 && q.side <= CH.dia / 2 + (q.o.rad || 16) * 0.5).sort((a, b) => a.along - b.along)[0];
  if (!hit) return c.d < c.max;
  const o = hit.o;
  strike(E, g, h, c, o, CH.mul, true);
  gainChip(E, g, h, CH.gain);                          // 공격 한 번에 한 번
  if (c.xp) trainXp(E, g, h, 0);                       // 금화 연마 — 기본 칩 실제 적중
  E.fx(g, c.map, { kind: "cut", ref: c.fid });
  E.fx(g, c.map, { kind: "sk_gm_hit", x: o.x, y: o.y, pi: h.pi, t: 0.3, life: 0.3, snd: "gmHit" });
  return false;
}

/* ── 칩 장막 ─────────────────────────────────────────
   s.sh = { v 남은 보호막, max, t 지난 초, dur, did 실제로 막았나, hT 다음 유지 연출까지 } */
export function veilStat(J) {
  const l = J ? J.tr[1][0] : 0;
  return { self: l >= VL.sp50 ? VL.self50 : VL.self, ally: l >= VL.sp50 ? VL.ally50 : VL.ally, dur: VL.dur + (l >= VL.sp25 ? VL.durAdd : 0) };
}
function veilUse(E, g, h) {
  if (blocked(E, g, h, "veil")) return;
  const s = st(h), V = veilStat(jobOf(h));
  const amt = Math.round(E.shieldAmt(h, h.max * V.self));   // 결투에서는 만들 때 60%
  const v = Math.max(amt, s.sh ? s.sh.v : 0);              // 더하지 않고 큰 쪽으로
  s.sh = { v, max: v, t: 0, dur: V.dur, did: 0, hT: VL.hint };
  s.cd.veil = VL.cd;
  for (const a of E.allies(g, h, VL.r)) {                   // 아군 — 이 게임의 기존 보호막 칸(이미 더 크면 그대로)
    if (E.shield(a, a.max * V.ally, V.dur)) E.fx(g, h.map, { kind: "sk_gm_veilally", x: a.x, y: a.y, pi: a.pi, t: 0.8, life: 0.8 });
  }
  E.fx(g, h.map, { kind: "sk_gm_veil", x: h.x, y: h.y, pi: h.pi, u: 0, k: 1, start: 1, t: VL.hint + 0.45, life: VL.hint + 0.45, snd: "gmShield" });
  call(E, g, h, VL.name);
}
function endVeil(E, g, h, why) {
  const s = h.gm, v = s && s.sh;
  if (!v) return;
  s.sh = null;
  if (v.did && why !== "down") trainXp(E, g, h, 1);         // 방어 연마 — 실제로 막은 장막 하나에 한 번
  E.fx(g, h.map, { kind: "sk_gm_veilend", x: h.x, y: h.y, pi: h.pi, br: why === "break" ? 1 : 0, t: 0.45, life: 0.45, snd: why === "break" ? "gmHit" : undefined });
}
/* 받는 피해(hurtHero) — 내 칩 장막이 먼저 받는다. 실제로 막았으면 칩 +1(0.8초에 한 번 — 지속 피해 틱마다 세지 않는다).
   회피 · 무적이 아니다. 다 쓰면 깨진다 */
export function gamblerTake(E, g, h, dmg, src) {
  const s = h && h.gm, v = s && s.sh;
  if (!v || !(dmg > 0) || !(v.v > 0)) return dmg;
  const a = Math.min(v.v, dmg);
  v.v -= a; v.did = 1;
  if (src && src.gmTrial) mark(h, "blk");
  if (s.shT <= 0) {
    s.shT = VL.chipGap;
    gainChip(E, g, h, 1);
    const ang = src && Number.isFinite(src.x) && Number.isFinite(src.y) && (src.x !== h.x || src.y !== h.y) ? Math.atan2(src.y - h.y, src.x - h.x) : (h.dir < 0 ? Math.PI : 0);
    E.fx(g, h.map, { kind: "sk_gm_block", x: h.x, y: h.y, a: r2(ang), pi: h.pi, t: 0.3, life: 0.3, snd: "gmBlock" });
  }
  if (v.v <= 0) endVeil(E, g, h, "break");
  return dmg - a;
}
function tickVeil(E, g, h, s, dt) {
  const v = s.sh;
  v.t += dt;
  if (v.t >= v.dur) return void endVeil(E, g, h, "time");
  if ((v.hT -= dt) <= 0) {
    v.hT = VL.hint;
    E.fx(g, h.map, { kind: "sk_gm_veil", x: h.x, y: h.y, pi: h.pi, u: r2(v.t / v.dur), k: r2(v.v / v.max), t: VL.hint + 0.45, life: VL.hint + 0.45 });
  }
}

/* ── 도박 결과 — 판정 쪽만 정한다 ─────────────────────
   실패(운명의 눈 1~2 · 777 낮은 결과)가 need 번 이어지면 다음 결과를 최고로 고정한다. 최고 결과가 나오면 0.
   정한 해석 — 실패가 아닌 결과(눈 3~5 · 777 당첨)도 "연속"을 끊는다 */
export const luckNeed = (J) => (J && J.tr[2][0] >= LUCK.sp50 ? LUCK.need50 : LUCK.need);
function gamble(E, g, h, kind) {
  const s = st(h), forced = s.luck >= luckNeed(jobOf(h));
  let r, fail;
  if (kind === "dice") { r = forced ? 6 : 1 + Math.min(5, Math.floor(E.rand(g) * 6)); fail = r <= DC.fail; }
  else { const x = E.rand(g); r = forced ? 2 : x < JK.odds[0] ? 0 : x < JK.odds[0] + JK.odds[1] ? 1 : 2; fail = r === 0; }
  s.luck = fail ? s.luck + 1 : 0;
  return [r, forced ? 1 : 0];
}

/* ── 운명의 눈 ───────────────────────────────────────
   s.dice = [{ t, x, y, n 눈, mul, cast, base, map, xp }] — 0.28초에 반경 100 안을 한 번 */
export const diceCd = (J) => (J && J.tr[2][0] >= DC.sp25 ? DC.cd25 : DC.cd);
function diceUse(E, g, h) {
  if (blocked(E, g, h, "dice")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, DC.reach, DC.near), [n, forced] = gamble(E, g, h, "dice");
  s.cd.dice = diceCd(jobOf(h));
  s.dice.push({ t: 0, x, y, n, mul: DC.muls[n - 1], cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_gm_dice", x: h.x, y: h.y, x1: x, y1: y, n, r: DC.r, d: DC.stop, hit: DC.hit, lucky: forced, pi: h.pi, t: DC.hit + 0.5, life: DC.hit + 0.5, snd: "gmDice" });
  call(E, g, h, forced ? `${DC.name} — 불운 보정` : DC.name);
}
function tickDice(E, g, h, d, dt) {
  d.t += dt;
  if (d.t < DC.hit) return true;
  for (const o of inCircle(E, g, h, d.x, d.y, DC.r, d.map)) { strike(E, g, h, d, o, d.mul); mark(h, o.far ? "far" : "dice", o); }
  if (d.n >= 5) g.shake = Math.max(g.shake || 0, d.n === 6 ? 0.3 : 0.18);
  E.fx(g, d.map, { kind: "sk_gm_dicehit", x: d.x, y: d.y, r: DC.r, n: d.n, pi: h.pi, t: 0.45, life: 0.45, snd: d.n === 6 ? "gmBoom" : "gmHit" });
  E.fx(g, d.map, { kind: "call", x: d.x, y: d.y - 70, text: `${d.n} — ×${d.mul}`, color: d.n === 6 ? "#E3B5D8" : GOLD, who: h.pi, t: 0.9, life: 0.9 });
  st(h).last = { k: "dice", x: d.x, y: d.y, r: DC.r, mul: d.mul, n: d.n, map: d.map };
  if (d.xp) trainXp(E, g, h, 2);                        // 행운 연마 — 도박 스킬로 유효 피해
  return false;
}

/* ── 코인 폭우 ───────────────────────────────────────
   s.rain = [{ t, i 떨어진 수, n, x, y, cast, base, map, xp }] — 0.15초부터 0.12초 간격으로 반경 160 안을 n 번 */
export const rainCount = (J) => { const l = J ? J.tr[0][0] : 0; return l >= RN.sp50 ? RN.n50 : l >= RN.sp25 ? RN.n25 : RN.n; };
function rainUse(E, g, h) {
  if (blocked(E, g, h, "rain")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, RN.reach, RN.near), n = rainCount(jobOf(h));
  s.cd.rain = RN.cd;
  s.rain.push({ t: 0, i: 0, n, x, y, cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 });
  h.swing = 0.25;
  const life = RN.first + RN.gap * n + RN.tail;
  E.fx(g, h.map, { kind: "sk_gm_rain", x, y, r: RN.r, n, d: RN.first, gap: RN.gap, pi: h.pi, t: life, life, snd: "gmCoin" });
  call(E, g, h, RN.name);
}
function tickRain(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < q.n && q.t >= RN.first + q.i * RN.gap) {
    q.i += 1;
    for (const o of inCircle(E, g, h, q.x, q.y, RN.r, q.map)) strike(E, g, h, q, o, RN.mul, true);
  }
  if (q.i < q.n) return true;
  st(h).last = { k: "rain", x: q.x, y: q.y, r: RN.r, mul: RN.mul * q.n, n: q.n, map: q.map };
  if (q.xp) trainXp(E, g, h, 0);                        // 금화 연마 — 코인 공격 실제 적중(시전당 한 번)
  return false;
}

/* ── 더블 다운 ───────────────────────────────────────
   직전 직접 공격 스킬(s.last — 운명의 눈 · 코인 폭우)의 70% 를 그 자리에서 대상마다 한 번. 새 시전 · 칩 · 풀 베팅 · 더블 다운을 다시 일으키지 않는다 */
function ddUse(E, g, h) {
  if (blocked(E, g, h, "dd")) return;
  const s = st(h), L = s.last;
  if (!L || L.map !== h.map) return void no(E, g, h, "다시 낼 공격이 없습니다");      // 비용 · 대기 없음
  if (s.chips < DD.cost) return void no(E, g, h, `칩 ${DD.cost}개가 필요합니다`, "#ff8a8a");
  s.chips -= DD.cost;
  s.cd.dd = DD.cd;
  s.dd.push({ t: 0, k: L.k, x: L.x, y: L.y, r: L.r, mul: L.mul * DD.k, cast: E.cast(h), base: E.base(h), map: L.map, noBet: 1, xp: 0 });
  h.swing = 0.25;
  E.fx(g, h.map, { kind: "sk_gm_dd", x: L.x, y: L.y, r: L.r, sk: L.k, n: L.n, d: DD.at, pi: h.pi, t: DD.at + 0.5, life: DD.at + 0.5, snd: "gmCoin" });
  call(E, g, h, DD.name);
}
function tickDd(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < DD.at) return true;
  for (const o of inCircle(E, g, h, q.x, q.y, q.r, q.map)) strike(E, g, h, q, o, q.mul, q.k === "rain");
  g.shake = Math.max(g.shake || 0, 0.18);
  if (q.xp) trainXp(E, g, h, 2);                        // 행운 연마
  return false;
}

/* ── 황금 테이블 ─────────────────────────────────────
   s.tbl = { fid, t, n 친 횟수, x, y, cast, base, map, xp } — 처음 놓은 자리에 고정. 1초마다 ×3(8번) · 끝날 때 ×16 */
function tableUse(E, g, h) {
  if (blocked(E, g, h, "table")) return;
  const s = st(h);
  if (s.tbl) endTable(E, g, h, false);
  s.cd.table = TB.cd;
  s.tbl = { fid: `gt${h.pi}.${++s.q}`, t: 0, n: 0, x: Math.round(h.x), y: Math.round(h.y), cast: E.cast(h), base: E.base(h), map: h.map, xp: 0 };
  E.fx(g, h.map, { kind: "sk_gm_table", x: s.tbl.x, y: s.tbl.y, r: TB.r, d: TB.open, dur: TB.dur, fid: s.tbl.fid, pi: h.pi, t: TB.dur + 0.1, life: TB.dur + 0.1, snd: "gmShield" });
  call(E, g, h, TB.name);
}
// 테이블 끝 — boom 이면 가장자리가 접히며 터진다(×16). 쓰러짐 · 맵 이동이면 조용히 걷는다
function endTable(E, g, h, boom) {
  const s = h.gm, a = s && s.tbl;
  if (!a) return;
  s.tbl = null;
  E.fx(g, a.map, { kind: "cut", ref: a.fid });
  if (boom) {
    for (const o of inCircle(E, g, h, a.x, a.y, TB.r, a.map)) strike(E, g, h, a, o, TB.endMul);
    g.shake = Math.max(g.shake || 0, 0.35);
  }
  E.fx(g, a.map, { kind: "sk_gm_tableend", x: a.x, y: a.y, r: TB.r, boom: boom ? 1 : 0, pi: h.pi, t: 0.6, life: 0.6, snd: boom ? "gmBoom" : undefined });
  if (a.xp) trainXp(E, g, h, 0);                        // 금화 연마 — 칩 충돌 실제 적중(시전당 한 번)
}
function tickTable(E, g, h, s, dt) {
  const a = s.tbl;
  if (h.down > 0 || a.map !== h.map) return void endTable(E, g, h, false);
  a.t += dt;
  while (a.n < Math.round(TB.dur / TB.tick) && a.t >= (a.n + 1) * TB.tick) {
    a.n += 1;
    const list = inCircle(E, g, h, a.x, a.y, TB.r, a.map);
    for (const o of list) strike(E, g, h, a, o, TB.mul, true);
    E.fx(g, a.map, { kind: "sk_gm_tabletick", x: a.x, y: a.y, r: TB.r, i: a.n, pi: h.pi, t: 0.4, life: 0.4, snd: list.length ? "gmChip" : undefined });
  }
  if (s.tbl === a && a.t >= TB.dur) endTable(E, g, h, true);
}

/* ── 하우스 엣지 ───────────────────────────────────── */
function edgeUse(E, g, h) {
  if (blocked(E, g, h, "edge")) return;
  const s = st(h);
  s.cd.edge = EG.cd;                                    // 대기는 누르는 순간부터
  s.edge = EG.dur; s.edgeT = EG.hint;
  E.fx(g, h.map, { kind: "sk_gm_edge", x: h.x, y: h.y, pi: h.pi, u: 0, start: 1, t: EG.hint + 0.4, life: EG.hint + 0.4, snd: "gmShield" });
  call(E, g, h, EG.name);
}
function tickEdge(E, g, h, s, dt) {
  s.edge = Math.max(0, s.edge - dt);
  if (s.edge <= 0) return void E.fx(g, h.map, { kind: "sk_gm_edgeend", x: h.x, y: h.y, pi: h.pi, t: 0.4, life: 0.4 });
  if ((s.edgeT -= dt) <= 0) { s.edgeT = EG.hint; E.fx(g, h.map, { kind: "sk_gm_edge", x: h.x, y: h.y, pi: h.pi, u: r2(1 - s.edge / EG.dur), t: EG.hint + 0.4, life: EG.hint + 0.4 }); }
}

/* ── 777 종결식 ──────────────────────────────────────
   s.jk = [{ t, i 코인 수, x, y, res 0 낮음 · 1 당첨 · 2 잭팟, cast(sid "ult"), base, map, xp, shock 황금 계약 충격파, sk 충격파를 냈나 }] */
function jackUse(E, g, h) {
  if (blocked(E, g, h, "jack")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, JK.reach, JK.near), [res, forced] = gamble(E, g, h, "jack");
  s.cd.jack = JK.cd;
  s.jk.push({ t: 0, i: 0, x, y, res, cast: E.cast(h, "ult"), base: E.base(h), map: h.map, xp: 0, shock: res === 2 && gmContract(jobOf(h)) ? 1 : 0, sk: 0 });
  h.swing = 0.3;
  const life = JK.end + JK.tail;
  E.fx(g, h.map, { kind: "sk_gm_777", x, y, r: JK.r, res, lucky: forced, n: JK.coins, d: JK.first, gap: JK.gap, show: JK.show, end: JK.end, pi: h.pi, t: life, life, snd: "gmSlot" });
  call(E, g, h, forced ? `${JK.name} — 불운 보정` : JK.name);
}
function tickJack(E, g, h, q, dt) {
  q.t += dt;
  while (q.i < JK.coins && q.t >= JK.first + q.i * JK.gap) {
    q.i += 1;
    for (const o of inCircle(E, g, h, q.x, q.y, JK.r, q.map)) strike(E, g, h, q, o, JK.coinMul, true);
    g.shake = Math.max(g.shake || 0, 0.12);
  }
  if (q.shock && !q.sk && q.t >= JK.shockAt) {         // 황금 계약 — 최고 잭팟이면 마지막 폭발 앞에 ×25 충격파(같은 시전)
    q.sk = 1;
    for (const o of inCircle(E, g, h, q.x, q.y, JK.r, q.map)) strike(E, g, h, q, o, JK.shockMul);
    E.fx(g, q.map, { kind: "sk_gm_shock", x: q.x, y: q.y, r: JK.r, pi: h.pi, t: 0.35, life: 0.35, snd: "gmHit" });
  }
  if (q.t < JK.end) return true;
  for (const o of inCircle(E, g, h, q.x, q.y, JK.r, q.map)) strike(E, g, h, q, o, JK.ends[q.res]);
  g.shake = Math.max(g.shake || 0, 0.3 + 0.12 * q.res);
  E.fx(g, q.map, { kind: "sk_gm_777end", x: q.x, y: q.y, r: JK.r, res: q.res, pi: h.pi, t: 0.8, life: 0.8, snd: "gmBoom" });
  E.fx(g, q.map, { kind: "call", x: q.x, y: q.y - 110, text: `${JK.names[q.res]} — ×${JK.ends[q.res]}`, color: q.res === 2 ? "#E3B5D8" : GOLD, who: h.pi, t: 1.2, life: 1.2 });
  if (q.xp) trainXp(E, g, h, 2);                        // 행운 연마
  return false;
}

/* ── 입력 — req = { op: "use", s: "veil" | "dice" | "rain" | "dd" | "table" | "edge" | "jack" }. 한 번 누르면 바로 ── */
const USE = { veil: veilUse, dice: diceUse, rain: rainUse, dd: ddUse, table: tableUse, edge: edgeUse, jack: jackUse };
export function gamblerInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object" || !gamblerOn(h)) return false;   // 이 직업이 아니면 조용히 넘긴다
  if (req.op === "use" && Object.prototype.hasOwnProperty.call(USE, req.s)) USE[req.s](E, g, h);
  return false;
}

/* ── 시간 ─────────────────────────────────────────── */
export function tickGambler(E, g, h, dt) {
  if (!gamblerOn(h)) { if (h.gm) h.gm = null; if (h.gmv) h.gmv = null; return; }
  const s = st(h);
  if (h.gmv) { s.chips = clampN(h.gmv.chips, 0, GM.chips); s.luck = clampN(h.gmv.luck, 0, 9); h.gmv = null; }   // 손님이던 세계가 판정 세계가 됐다(방장 승계) — 칩 · 불운 보정을 이어받는다
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  s.shT = Math.max(0, s.shT - dt);
  const here = (q) => q.map === h.map;                 // 맵을 옮기면 남은 것은 걷는다
  s.coins = s.coins.filter((c) => here(c) && stepCoin(E, g, h, c, dt));
  s.dice = s.dice.filter((q) => here(q) && tickDice(E, g, h, q, dt));
  s.rain = s.rain.filter((q) => here(q) && tickRain(E, g, h, q, dt));
  s.dd = s.dd.filter((q) => here(q) && tickDd(E, g, h, q, dt));
  s.jk = s.jk.filter((q) => here(q) && tickJack(E, g, h, q, dt));
  s.bet = s.bet.filter((q) => here(q) && tickBet(E, g, h, q, dt));
  if (s.tbl) tickTable(E, g, h, s, dt);
  if (s.sh) tickVeil(E, g, h, s, dt);
  if (s.edge > 0) tickEdge(E, g, h, s, dt);
}
// 쓰러졌다 — 보호막 · 테이블 · 하우스 엣지를 걷고 칩을 비운다(정한 값 — 기획안에 없음). 이미 날아간 칩 · 코인은 그대로 간다
export function gamblerDown(E, g, h) {
  if (!gamblerOn(h) || !h.gm) return;
  const s = h.gm;
  if (s.sh) endVeil(E, g, h, "down");
  if (s.tbl) endTable(E, g, h, false);
  if (s.edge > 0) { s.edge = 0; E.fx(g, h.map, { kind: "sk_gm_edgeend", x: h.x, y: h.y, pi: h.pi, t: 0.4, life: 0.4 }); }
  s.chips = 0;
}
// 훈련장 · 연습장 "스택 가득" — 칩을 7개까지
export function gamblerFill(h) { if (gamblerOn(h)) st(h).chips = GM.chips; }

/* ── 스냅샷 영웅 줄 57 — 이 직업이 아니면 0. 칸 수는 고정이고 뒤에만 더한다 ──
   [0 칩, 1 직업 레벨, 2 경험치, 3 연마 [레벨, 경험치] × 3 을 편 것, 4 대기 [장막, 눈, 폭우, 더블 다운, 테이블, 엣지, 777],
    5 보호막 [남은 양, 최대, 남은 초] | 0, 6 하우스 엣지 남은 초, 7 테이블 남은 초, 8 불운 보정 연속 실패, 9 직전 공격(0 없음 · 1 운명의 눈 · 2 코인 폭우), 10 해금 시험 단계(0 없음)] */
const CD_KEYS = ["veil", "dice", "rain", "dd", "table", "edge", "jack"], LAST = ["", "dice", "rain"];
export function packGambler(h) {
  if (!gamblerOn(h)) return 0;
  const J = jobOf(h), s = h.gm;
  return [s ? s.chips : 0, J.lv, J.xp, J.tr.flat(), CD_KEYS.map((k) => (s ? r1(s.cd[k]) : 0)),
    s && s.sh ? [Math.round(s.sh.v), Math.round(s.sh.max), r1(Math.max(0, s.sh.dur - s.sh.t))] : 0,
    s ? r1(s.edge) : 0, s && s.tbl ? r1(Math.max(0, TB.dur - s.tbl.t)) : 0, s ? s.luck : 0, s && s.last ? Math.max(0, LAST.indexOf(s.last.k)) : 0, h.gt ? h.gt.step : 0];
}
// 손님 — 화면에 쓰는 값만 h.gmv 로(판정 상태 h.gm 은 건드리지 않는다). 모양은 gamblerView 와 같다
export function applyGambler(h, a) {
  if (!Array.isArray(a)) { h.gmv = null; return; }
  const t = Array.isArray(a[3]) ? a[3] : [], J = cleanGmJob({ lv: a[1], xp: a[2], tr: [[t[0], t[1]], [t[2], t[3]], [t[4], t[5]]] });
  const cd = Array.isArray(a[4]) ? a[4] : [];
  h.gmv = viewOf(J, clampN(a[0], 0, GM.chips), Object.fromEntries(CD_KEYS.map((k, i) => [k, +cd[i] || 0])),
    Array.isArray(a[5]) ? { v: +a[5][0] || 0, max: +a[5][1] || 0, left: +a[5][2] || 0 } : null, +a[6] || 0, +a[7] || 0, a[8] | 0, LAST[a[9]] || "", a[10] | 0);
}
const viewOf = (J, chips, cd, sh, edge, tbl, luck, last, trial) => ({ chips, max: GM.chips, lv: J.lv, xp: J.xp, tr: J.tr, cd,
  cdMax: { veil: VL.cd, dice: diceCd(J), rain: RN.cd, dd: DD.cd, table: TB.cd, edge: EG.cd, jack: JK.cd },
  sh, edge, tbl, luck, need: luckNeed(J), last, contract: gmContract(J), tint: gamblerTint(gmTrainSum(J)), trial });

/* ── 화면 값 — 칩 · 직업 레벨 · 연마 · 대기 · 보호막 · 하우스 엣지 · 불운 보정. 방장(판정 세계)은 h.bag.hj · h.gm 에서, 손님은 h.gmv 에서 같은 모양으로 ── */
export function gamblerView(h) {
  if (!h) return null;
  if (h.gmv) return h.gmv;
  if (!gamblerOn(h)) return null;
  const J = jobOf(h), s = h.gm;
  return viewOf(J, s ? s.chips : 0, s ? { ...s.cd } : { ...NO_CD },
    s && s.sh ? { v: Math.round(s.sh.v), max: s.sh.max, left: r1(Math.max(0, s.sh.dur - s.sh.t)) } : null,
    s ? r1(s.edge) : 0, s && s.tbl ? r1(Math.max(0, TB.dur - s.tbl.t)) : 0, s ? s.luck : 0, s && s.last ? s.last.k : "", h.gt ? h.gt.step : 0);
}
