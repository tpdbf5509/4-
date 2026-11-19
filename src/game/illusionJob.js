/* ── 히든 직업 Illusionist 005(마술사) 판정 — 트릭 · 연계 · 잔상 · 스킬 8종(11월 17일) ─────────────
   수치는 illusionData.js. 판정 쪽(방장 · 전용 서버 꼴)만 셈한다. 화면은 연출(fx)과 illusionView 값만 그린다.
   이전 히든 직업과 같은 흐름 — 획득 방법 없이 격자 연습장에만(ILLUSION.live = false). 저장 · 스냅샷 · 관리자 명령어도 아직 없다.
   피해는 기존 strikeAny · 평타 판정을 거쳐 결투 시전별 상한 · 사냥터 PvP 상한이 그대로 걸린다.
   한 스킬의 모든 타격 · 트릭 잔상 · 미러 하우스 잔상은 그 스킬의 시전 객체를 함께 쓴다(잔상이 상한을 새로 열지 않는다).
   켜는 꼴은 Gambler 002 와 같은 bag.hj = { active: "illusionist", jobs: { illusionist: { lv, xp, tr } }, version: 1 }.
   싸우는 동안의 상태 h.il — 트릭 · 대기 · 연계 기록 · 날아가는 카드 · 진행 중인 스킬 · 잔상 · 거울 집. 저장하지 않는다.
   E(엔진, rpg.js illusionEngine): engineerEngine 것(keep · open) + stop(걷기 멈춤) */
import { faceAim } from './faceDir.js';
import { ILLUSION as IL, ILLUSION_ID, ILLUSION_NAME, ILLUSION_TINT, IL_TRAIN_NAMES, IL_TRICK as TK, IL_CARD as CD, IL_SHUFFLE as SH, IL_SLASH as SL,
  IL_PRISON as PR, IL_BLINK as BL, IL_FIST as FI, IL_MIRROR as MR, IL_FINAL as FN, IL_SKILLS, IL_TRICKED, IL_ATTACKS } from "./illusionData.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const SQUASH = 0.78;   // 땅 비율(RPG.squash) — 화면 값의 "거울 집 안" 표시에만 쓴다
const TEXT = "#EDE6F7", DIM = "#c9d6d0", WARN = "#f0dcb4", PURPLE = "#C9B5F0";

/* ── 직업 칸 ───────────────────────────────────────── */
export const ilJobNeed = (lv) => IL.xp.base + IL.xp.per * lv;
export const ilTrainNeed = (l) => IL.train.base + IL.train.per * l;
export function cleanIlJob(d) {
  d = d && typeof d === "object" ? d : {};
  const lv = clampN(d.lv, 1, IL.maxLv) || 1;
  const tr = [0, 1, 2].map((i) => {
    const q = Array.isArray(d.tr) && Array.isArray(d.tr[i]) ? d.tr[i] : [0, 0];
    const l = clampN(q[0], 0, IL.train.max);
    return [l, l >= IL.train.max ? 0 : clampN(q[1], 0, ilTrainNeed(l) - 1)];
  });
  return { lv, xp: lv >= IL.maxLv ? 0 : clampN(d.xp, 0, ilJobNeed(lv) - 1), tr };
}
// 이 직업인가 — 가방 값으로만 본다. ILLUSION.live 가 false 면 격자 연습장 맵에서만 켜진다
export const illusionOn = (h) => !!(h && h.bag && h.bag.hj && h.bag.hj.active === ILLUSION_ID && h.bag.hj.jobs && h.bag.hj.jobs[ILLUSION_ID] && (IL.live || h.map === "sandbox"));
export const illusionLook = (h) => illusionOn(h);
const jobOf = (h) => h.bag.hj.jobs[ILLUSION_ID];
export const ilTrainSum = (J) => (J ? J.tr.reduce((n, q) => n + q[0], 0) : 0);
export const illusionTint = (sum) => ILLUSION_TINT.find((t) => sum >= t.from).id;
export const ilEncore = (J) => ilTrainSum(J) >= IL.encore;   // 끝없는 앙코르 — 연마 합계 150
export const ilLock = (J, sk) => (!J ? "잠김" : J.lv < IL.unlock[sk] ? `직업 레벨 ${IL.unlock[sk]}에 열립니다` : "");
// 연마로 바뀌는 값
export const shuffleCards = (J) => SH.n + (J && J.tr[0][0] >= SH.sp25 ? SH.add25 : 0);
export const fistMul = (J) => (J && J.tr[0][0] >= FI.sp50 ? FI.mul50 : FI.mul);
export const blinkLen = (J) => (J && J.tr[1][0] >= BL.sp25 ? BL.len25 : BL.len);
export const blinkR = (J) => (J && J.tr[1][0] >= BL.sp50 ? BL.r50 : BL.r);
export const chainWindow = (J) => (J && J.tr[2][0] >= TK.sp25 ? TK.window25 : TK.window);
export const trickGhost = (J) => (J && J.tr[2][0] >= TK.sp50 ? TK.ghost50 : TK.ghost);

/* 켜기 — 1차 전직 · BLOOD-001 · 다른 히든 직업과 함께 쓰지 못한다(한 번에 하나). 든 무기는 내려놓는다(지우지 않는다).
   init 이 있으면 그 레벨 · 연마로(연습장) */
export function unlockIllusion(h, init) {
  const old = h.bag.hj && h.bag.hj.jobs ? h.bag.hj.jobs : {};
  h.bag.hj = { active: ILLUSION_ID, jobs: { ...old, [ILLUSION_ID]: cleanIlJob(init || old[ILLUSION_ID]) }, version: 1 };
  h.env = null; h.gm = null; h.gmv = null; h.en = null; h.nc = null;
  if (h.bag.bd && h.bag.bd.on) h.bag.bd = { ...h.bag.bd, on: 0 };
  h.advClass = ""; h.advQ = null; h.advM = 0; h.as = null; h.healMode = false;
  h.bd = null;
  h.bag.e = 0;
  h.il = null;
  h.bag.v = (h.bag.v || 0) + 1;
}
export function dropIllusion(h) {
  if (!h.bag || !h.bag.hj || h.bag.hj.active !== ILLUSION_ID) return;
  h.bag.hj = { ...h.bag.hj, active: "" };
  h.il = null;
  h.bag.v = (h.bag.v || 0) + 1;
}

/* ── 싸우는 동안의 상태 h.il ───────────────────────── */
const NO_CD = { shuffle: 0, slash: 0, prison: 0, blink: 0, fist: 0, mirror: 0, final: 0 };
function st(h) {
  return h.il || (h.il = { trick: 0, cd: { ...NO_CD }, cards: [], acts: [], ghosts: [], house: null, chain: null, calm: 0, xm: [0, 0], q: 0 });
}
const sq = (E, x, y, o) => Math.hypot(o.x - x, (o.y - y) / E.squash);
const no = (E, g, h, text, color = DIM) => void E.say(g, h.map, h.x, h.y - 90, text, color);
const call = (E, g, h, text, color = TEXT) => E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 104, text, color, who: h.pi, t: 0.7, life: 0.7 });
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === "m" ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
// 막힌 곳(벽 · 나무 · 가게)까지의 거리 — 카드 · 돌진 · 주먹이 벽 너머로 가지 않는다
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
// 곧은 띠(폭 w) 안의 대상 — 덱 슬래시 · 팬텀 피스트
function band(E, g, h, x0, y0, ax, ay, len, w, map) {
  return E.near(g, h, x0, y0, len + 60).filter((o) => {
    if (!E.alive(g, h, o, map)) return false;
    const dx = o.x - x0, dy = (o.y - y0) / E.squash, along = dx * ax + dy * ay;
    return along >= -10 && along <= len + 10 && Math.abs(dx * ay - dy * ax) <= w / 2 + (o.rad || 16) * 0.5;
  });
}
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

/* ── 경험치 ─────────────────────────────────────────── */
function jobXp(E, g, h, n) {
  const J = jobOf(h), s = st(h);
  if (J.lv >= IL.maxLv || !(n > 0)) return;
  if (g.t - s.xm[0] >= 60) s.xm = [g.t, 0];
  n = Math.min(n, IL.xp.perMin - s.xm[1]);
  if (n <= 0) return;
  s.xm[1] += n; J.xp += n;
  let up = 0;
  while (J.lv < IL.maxLv && J.xp >= ilJobNeed(J.lv)) { J.xp -= ilJobNeed(J.lv); J.lv += 1; up = 1; }
  if (J.lv >= IL.maxLv) J.xp = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${ILLUSION_NAME} 직업 레벨 ${J.lv}`, color: TEXT, t: 1.4, life: 1.4, snd: "lvup", who: h.pi });
}
// 연마 경험치 — 시전당 한 번(부른 쪽이 센다). i: 0 카드 · 1 공간 · 2 트릭
function trainXp(E, g, h, i, n = IL.train.cast) {
  const q = jobOf(h).tr[i];
  if (q[0] >= IL.train.max || !(n > 0)) return;
  q[1] += n;
  let up = 0;
  while (q[0] < IL.train.max && q[1] >= ilTrainNeed(q[0])) { q[1] -= ilTrainNeed(q[0]); q[0] += 1; up = 1; }
  if (q[0] >= IL.train.max) q[1] = 0;
  if (!up) return;
  h.bag.v += 1;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 160, text: `${IL_TRAIN_NAMES[i]} ${q[0]}`, color: TEXT, t: 1.2, life: 1.2, who: h.pi });
}
export function illusionKill(E, g, m, got) {
  if (!m || m.type === "dummy") return;
  const n = m.boss ? (m.dg || m.raid ? IL.xp.raid : IL.xp.boss) : IL.xp.mob;
  for (const h of got) if (illusionOn(h)) jobXp(E, g, h, n);
}
export const illusionRaidKill = (E, g, h) => { if (illusionOn(h)) jobXp(E, g, h, IL.xp.raid); };

/* ── 트릭 ───────────────────────────────────────────── */
function gainTrick(E, g, h, n) {
  const s = st(h);
  if (s.trick >= TK.max) return 0;
  const got = Math.min(n, TK.max - s.trick);
  s.trick += got;
  if (s.trick >= TK.cost && s.trick - got < TK.cost) E.fx(g, h.map, { kind: "sk_il_ready", x: h.x, y: h.y, pi: h.pi, t: 0.6, life: 0.6, snd: "ilReady" });
  return got;
}
// 거울 집 안인가 — 시전 순간 시전자가 반지름 안에 있어야 한다
const inHouse = (E, h, s) => !!(s.house && s.house.map === h.map && s.house.t < MR.dur && sq(E, s.house.x, s.house.y, h) <= MR.r);

/* 시전 객체 하나 — sk 스킬 이름 · first 첫 타격 배율. 트릭 3개 이상이면 자동 강화(3개를 쓴다) · 거울 집 안이면 미러 잔상.
   src = { sk, cast, base, map, firstMul, trick, mirror, big, hit 첫 적중 처리됨, xp } */
function makeSrc(E, h, s, sk, firstMul, sid, follow) {
  const J = jobOf(h);
  const src = { sk, cast: E.cast(h, sid || "il"), base: E.base(h), map: h.map, firstMul, trick: 0, mirror: 0, big: 0, hit: 0, xp: 0 };
  if (!follow && IL_TRICKED.includes(sk) && s.trick >= TK.cost) { s.trick -= TK.cost; src.trick = 1; }
  if (IL_ATTACKS.includes(sk) && inHouse(E, h, s)) { src.mirror = 1; src.big = ilEncore(J) ? 1 : 0; }
  return src;
}

/* ── 한 대 — src 는 그 공격(시전 객체 cast · 기준 피해 base · basic 평타 · ghost 잔상) ── */
function strike(E, g, h, src, o, mul) {
  const prev = h.cast; h.cast = src.cast;
  try { (src.basic ? E.basic : E.strike)(g, h, o, src.base * mul); } finally { h.cast = prev; }
  const s = st(h);
  s.calm = 0;                                          // 유효 공격 — 연계 시간을 새로 센다
  if (!E.dummy(o)) src.xp = 1;                         // 유효 적중 — 훈련용 대상은 연마 경험치를 주지 않는다
  if (!src.ghost && !src.basic && !src.hit) { src.hit = 1; firstHit(E, g, h, src, o); }
}
// 공격 스킬의 첫 유효 적중 — 연계(다른 이름이면 트릭 +1) · 트릭 잔상 · 미러 잔상(각 한 번, 같은 시전 객체)
function firstHit(E, g, h, src, o) {
  const s = st(h), J = jobOf(h);
  if (s.chain && s.chain !== src.sk) {
    if (gainTrick(E, g, h, TK.chain)) E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 124, text: "연계 +1", color: PURPLE, who: h.pi, t: 0.7, life: 0.7 });
    if (!E.dummy(o) && !src.chainXp) { src.chainXp = 1; trainXp(E, g, h, 2); }
  }
  s.chain = src.sk;
  const k = keyOf(o);
  if (src.trick) s.ghosts.push({ k, t: 0, mul: src.firstMul * trickGhost(J), cast: src.cast, base: src.base, map: src.map, ghost: 1, big: src.big, kind: 0 });
  if (src.mirror) s.ghosts.push({ k, t: -0.12, mul: src.firstMul * MR.ghost, cast: src.cast, base: src.base, map: src.map, ghost: 1, big: src.big, kind: 1 });
}
function tickGhost(E, g, h, q, dt) {
  q.t += dt;
  if (q.t < TK.ghostDelay) return true;
  const o = find(g, q.k);
  if (!o || !E.alive(g, h, o, q.map)) return false;     // 이미 사라진 대상 — 잔상은 헛돈다
  strike(E, g, h, q, o, q.mul);
  E.fx(g, q.map, { kind: "sk_il_ghost", x: Math.round(o.x), y: Math.round(o.y), m: q.kind, big: q.big, pi: h.pi, t: 0.45, life: 0.45, snd: q.kind ? "ilGlass" : "ilGhost" });
  return false;
}

/* ── 쓸 수 있나 ─────────────────────────────────────── */
function blocked(E, g, h, sk) {
  const s = st(h), D = IL_SKILLS[sk];
  if (h.down > 0 || E.locked(h)) return true;
  const w = E.fight(h);
  if (w) { if (w !== "-") no(E, g, h, w); return true; }
  const lock = ilLock(jobOf(h), sk);
  if (lock) { no(E, g, h, lock); return true; }
  if (s.cd[sk] > 0) { no(E, g, h, `${D.name} ${Math.ceil(s.cd[sk])}초`, WARN); return true; }
  return false;
}
// 시전 알림 — 트릭 강화 · 거울 집이면 글자를 붙인다
function announce(E, g, h, D, src) {
  const tags = [src.trick && "트릭", src.mirror && "거울"].filter(Boolean);
  call(E, g, h, tags.length ? `${D.name} · ${tags.join(" · ")}` : D.name, src.trick || src.mirror ? PURPLE : TEXT);
  if (src.trick) E.fx(g, h.map, { kind: "sk_il_spend", x: h.x, y: h.y, pi: h.pi, t: 0.5, life: 0.5 });
}

/* ── 기본 공격 — 절단 카드 ───────────────────────────
   s.cards = [{ fid, x, y 시작, ax, ay, d 지난 거리, max 벽까지, v, wait, cast, base, basic, map }] */
export function illusionBasic(E, g, h, force) {
  if (!illusionOn(h)) return false;
  const s = st(h);
  const o = nearest(E, g, h, h.x, h.y, CD.range, h.map);
  if (!o && !force) return false;
  let ax, ay;
  if (o) { const dx = o.x - h.x, dy = (o.y - h.y) / E.squash, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; }
  else [ax, ay] = E.face(h);
  faceAim(h, ax, ay);                              // 치는 쪽을 본다(예전엔 늘 앞)
  const c = { fid: `ic${h.pi}.${++s.q}`, x: h.x, y: h.y, ax: r2(ax), ay: r2(ay), d: 0, max: wallCut(E, h, ax, ay, CD.range), v: CD.v, wait: CD.wind,
    cast: E.cast(h, "basic"), base: E.base(h), basic: 1, map: h.map };
  s.cards.push(c);
  const life = CD.wind + c.max / c.v + 0.1;
  E.fx(g, h.map, { kind: "sk_il_card", x: h.x, y: h.y, x0: h.x, y0: h.y - IL.lift, ax: c.ax, ay: c.ay, len: c.max, v: c.v, d: CD.wind, fid: c.fid, pi: h.pi, t: life, life, snd: "ilCard" });
  return true;
}
function stepCard(E, g, h, c, dt) {
  if (c.wait > 0) { c.wait -= dt; if (c.wait > 0) return true; dt = -c.wait; }
  const from = c.d, to = Math.min(c.max, c.d + c.v * dt);
  c.d = to;
  const hit = E.near(g, h, c.x, c.y, to + 60).filter((o) => E.alive(g, h, o, c.map)).map((o) => {
    const dx = o.x - c.x, dy = (o.y - c.y) / E.squash;
    return { o, along: dx * c.ax + dy * c.ay, side: Math.abs(dx * c.ay - dy * c.ax) };
  }).filter((q) => q.along >= from - 20 && q.along <= to + 4 && q.side <= CD.w / 2 + (q.o.rad || 16) * 0.5).sort((a, b) => a.along - b.along)[0];
  if (!hit) return c.d < c.max;
  const o = hit.o;
  strike(E, g, h, c, o, CD.mul);
  gainTrick(E, g, h, TK.basic);                        // 유효 적중 — 한 장에 한 번
  E.fx(g, c.map, { kind: "cut", ref: c.fid });
  E.fx(g, c.map, { kind: "sk_il_hit", x: Math.round(o.x), y: Math.round(o.y), ax: c.ax, ay: c.ay, pi: h.pi, t: 0.32, life: 0.32, snd: "ilHit" });
  return false;
}

/* ── 폭렬 셔플 — 카드가 차례로 겨눈 자리를 치고 0.70초에 같은 자리 폭발 ── */
function shuffleUse(E, g, h) {
  if (blocked(E, g, h, "shuffle")) return;
  const s = st(h), J = jobOf(h), [x, y] = pointAt(E, g, h, SH.reach, SH.near), n = shuffleCards(J);
  const src = makeSrc(E, h, s, "shuffle", SH.mul);
  s.cd.shuffle = SH.cd;
  s.acts.push({ k: "shuffle", t: 0, x, y, n, i: 0, src });
  h.swing = 0.3;
  const life = SH.end + SH.tail;
  E.fx(g, h.map, { kind: "sk_il_shuffle", x, y, x0: Math.round(h.x), y0: Math.round(h.y) - IL.lift, r: SH.r, n, first: SH.first, last: SH.last, fly: SH.fly, end: SH.end, tk: src.trick, pi: h.pi, t: life, life, snd: "ilShuffle" });
  announce(E, g, h, SH, src);
}
function tickShuffle(E, g, h, q) {
  const gap = q.n > 1 ? (SH.last - SH.first) / (q.n - 1) : 0;
  while (q.i < q.n && q.t >= SH.first + q.i * gap + SH.fly) {
    q.i += 1;
    for (const o of foes(E, g, h, q.x, q.y, SH.r, q.src.map)) strike(E, g, h, q.src, o, SH.mul);
  }
  if (q.t < SH.end) return true;
  for (const o of foes(E, g, h, q.x, q.y, SH.r, q.src.map)) strike(E, g, h, q.src, o, SH.endMul);
  if (q.src.xp) trainXp(E, g, h, 0);
  return false;
}

/* ── 덱 슬래시 — 두 번 전진하며 벤다. 지나간 띠(폭 110)를 각 전진 끝에 한 번씩 친다 ── */
function slashUse(E, g, h) {
  if (blocked(E, g, h, "slash")) return;
  const s = st(h);
  if (s.acts.some((q) => q.k === "slash")) return;           // 앞 돌진이 끝나야 다음 번을 쓴다
  const [ax, ay] = aimDir(E, g, h, SL.len), len = wallCut(E, h, ax, ay, SL.len);
  const follow = !!s.sl, src = makeSrc(E, h, s, "slash", SL.mul, undefined, follow);
  const life = SL.start + SL.seg * 2 + SL.tail, n = (s.sl ? s.sl.n : 0) + 1;
  if (n >= SL.charges) { s.sl = null; s.cd.slash = SL.cd; }   // 마지막 번 — 이제 대기
  else s.sl = { n, t: life + SL.chainGap };                   // 대기 없이 이어 쓸 수 있는 동안
  s.acts.push({ k: "slash", t: 0, ax, ay, seg: len / 2, i: 0, at: null, src });
  h.swing = 0.5;
  E.fx(g, h.map, { kind: "sk_il_slash", x: Math.round(h.x), y: Math.round(h.y), ax: r2(ax), ay: r2(ay), len: Math.round(len), w: SL.w, d: SL.start, seg: SL.seg, tk: src.trick, pi: h.pi, t: life, life, snd: "ilSlash" });
  announce(E, g, h, SL, src);
}
function tickSlash(E, g, h, q) {
  if (h.down > 0) return false;
  // 전진 시작 — 대쉬와 같은 걸음으로 seg 만큼(벽은 시전 때 잘랐다 · 맵 밖은 keepIn)
  if (q.at === null && q.i < 2 && q.t >= SL.start + q.i * SL.seg) {
    q.at = [h.x, h.y];
    h.dvx = (q.ax * q.seg) / SL.seg; h.dvy = (q.ay * q.seg) / SL.seg; h.dash = SL.seg;
    h.hold = [];
  }
  if (q.at && q.t >= SL.start + (q.i + 1) * SL.seg) {
    const [x0, y0] = q.at;
    for (const o of band(E, g, h, x0, y0, q.ax, q.ay, q.seg, SL.w, q.src.map)) strike(E, g, h, q.src, o, SL.mul);
    E.fx(g, q.src.map, { kind: "sk_il_cut", x: Math.round(x0 + q.ax * q.seg / 2), y: Math.round(y0 + q.ay * q.seg / 2 * E.squash), ax: r2(q.ax), ay: r2(q.ay), len: Math.round(q.seg), w: SL.w, m: q.i, pi: h.pi, t: 0.3, life: 0.3, snd: q.i ? "ilSlash2" : undefined });
    q.at = null; q.i += 1;
    if (q.i >= 2) { if (q.src.xp) trainXp(E, g, h, 1); return false; }
  }
  return true;
}

/* ── 카드 프리즌 — 상자로 가두고 네 번 · 접히며 최종 ── */
function prisonUse(E, g, h) {
  if (blocked(E, g, h, "prison")) return;
  const s = st(h), [x, y] = pointAt(E, g, h, PR.reach, PR.near);
  const src = makeSrc(E, h, s, "prison", PR.mul);
  s.cd.prison = PR.cd;
  s.acts.push({ k: "prison", t: 0, x, y, i: 0, bound: 0, src });
  h.swing = 0.3;
  const life = PR.end + PR.tail;
  E.fx(g, h.map, { kind: "sk_il_prison", x, y, r: PR.r, form: PR.form, hits: PR.hits, end: PR.end, tk: src.trick, pi: h.pi, t: life, life, snd: "ilBox" });
  announce(E, g, h, PR, src);
}
function tickPrison(E, g, h, q) {
  if (!q.bound && q.t >= PR.form) {
    q.bound = 1;
    const hold = PR.end - PR.form;
    for (const o of foes(E, g, h, q.x, q.y, PR.r, q.src.map)) {
      if (!o.type) E.cc(g, h, o, { bind: PR.pvpBind });          // 사람 — 최대 0.5초 속박(판정은 서버)
      else if (E.boss(o)) E.cc(g, h, o, { slow: PR.bossSlow });    // 보스 — 짧은 둔화만
      else if (o.type !== "dummy") E.cc(g, h, o, { bind: hold });  // 일반 몹 — 최종 폭발까지 묶는다
    }
  }
  while (q.i < PR.hits.length && q.t >= PR.hits[q.i]) {
    q.i += 1;
    for (const o of foes(E, g, h, q.x, q.y, PR.r, q.src.map)) strike(E, g, h, q.src, o, PR.mul);
  }
  if (q.t < PR.end) return true;
  for (const o of foes(E, g, h, q.x, q.y, PR.r, q.src.map)) strike(E, g, h, q.src, o, PR.endMul);
  g.shake = Math.max(g.shake || 0, 0.15);
  if (q.src.xp) trainXp(E, g, h, 2);
  return false;
}

/* ── 카드 블링크 — 합법 자리를 먼저 찾는다. 없으면 아무것도 쓰지 않는다 ── */
function blinkSpot(E, g, h, len) {
  const [ax, ay] = aimDir(E, g, h, len);
  // 겨눈 끝에서 시전자 쪽으로 10씩 돌아오며 막히지 않은 첫 자리(맵 안으로 끌어온 뒤) — 가장 가까운 합법 자리
  for (let d = len; d >= 20; d -= 10) {
    const p = { x: h.x + ax * d, y: h.y + ay * d * E.squash };
    E.keep(p, h.map);                                    // 맵 · 결투 칸 안으로, 막힌 곳 밖으로
    const [W, H, top] = E.bounds(h.map);
    if (p.x < 0 || p.x > W || p.y < top || p.y > H) continue;   // 막힌 곳에서 밀려 맵 밖으로 나간 자리는 쓰지 않는다
    if (Math.hypot(p.x - h.x, (p.y - h.y) / E.squash) < 20) continue;
    if (E.open(p.x, p.y, h.map)) return [Math.round(p.x), Math.round(p.y)];
  }
  return null;
}
function blinkUse(E, g, h) {
  if (blocked(E, g, h, "blink")) return;
  const s = st(h), J = jobOf(h), to = blinkSpot(E, g, h, blinkLen(J));
  if (!to) return void no(E, g, h, "옮겨 갈 자리가 없습니다", WARN);
  const src = makeSrc(E, h, s, "blink", BL.mul);
  s.cd.blink = BL.cd;
  const x0 = Math.round(h.x), y0 = Math.round(h.y), r = blinkR(J);
  s.acts.push({ k: "blink", t: 0, x0, y0, x1: to[0], y1: to[1], r, jumped: 0, src });
  const life = BL.boom + BL.tail;
  E.fx(g, h.map, { kind: "sk_il_blink", x: x0, y: y0, x1: to[0], y1: to[1], r, jump: BL.jump, boom: BL.boom, tk: src.trick, pi: h.pi, t: life, life, snd: "ilBlink" });
  announce(E, g, h, BL, src);
}
function tickBlink(E, g, h, q) {
  if (!q.jumped && q.t >= BL.jump) {
    q.jumped = 1;
    if (h.down <= 0 && h.map === q.src.map) {
      const moved = Math.hypot(q.x1 - h.x, (q.y1 - h.y) / E.squash);
      h.x = q.x1; h.y = q.y1; h.dash = 0; E.stop(h);
      if (moved >= BL.minMove) trainXp(E, g, h, 1);   // 공간 연마 — 유효 이동
    }
  }
  if (q.t < BL.boom) return true;
  for (const o of foes(E, g, h, q.x0, q.y0, q.r, q.src.map)) strike(E, g, h, q.src, o, BL.mul);
  return false;
}

/* ── 팬텀 피스트 — 0.50초에 앞 460 · 폭 200 을 한 번 ── */
function fistUse(E, g, h) {
  if (blocked(E, g, h, "fist")) return;
  const s = st(h), J = jobOf(h), [ax, ay] = aimDir(E, g, h, FI.len), len = wallCut(E, h, ax, ay, FI.len), mul = fistMul(J);
  const src = makeSrc(E, h, s, "fist", mul);
  s.cd.fist = FI.cd;
  s.acts.push({ k: "fist", t: 0, x: h.x, y: h.y, ax, ay, len, mul, src });
  h.swing = 0.5;
  const life = FI.hit + FI.tail;
  E.fx(g, h.map, { kind: "sk_il_fist", x: Math.round(h.x), y: Math.round(h.y), x0: Math.round(h.x), y0: Math.round(h.y) - IL.lift, ax: r2(ax), ay: r2(ay), len: Math.round(len), w: FI.w,
    form: FI.form, hit: FI.hit, tk: src.trick, pi: h.pi, t: life, life, snd: "ilFist" });
  announce(E, g, h, FI, src);
}
function tickFist(E, g, h, q) {
  if (q.t < FI.hit) return true;
  for (const o of band(E, g, h, q.x, q.y, q.ax, q.ay, q.len, FI.w, q.src.map)) strike(E, g, h, q.src, o, q.mul);
  g.shake = Math.max(g.shake || 0, 0.25);
  if (q.src.xp) trainXp(E, g, h, 0);
  return false;
}

/* ── 미러 하우스 — 쓴 자리에 8초(공격 아님 · 트릭 0) ── */
function mirrorUse(E, g, h) {
  if (blocked(E, g, h, "mirror")) return;
  const s = st(h);
  s.cd.mirror = MR.cd;
  s.house = { x: Math.round(h.x), y: Math.round(h.y), t: 0, map: h.map };
  E.fx(g, h.map, { kind: "sk_il_mirror", x: s.house.x, y: s.house.y, r: MR.r, rise: MR.rise, pi: h.pi, t: MR.dur, life: MR.dur, snd: "ilMirror" });
  call(E, g, h, MR.name, PURPLE);
}

/* ── 최후의 셔플 — 트릭 전부. 열두 번 · 거울 · 최종 · (앙코르) 거울 파쇄 ── */
function finalUse(E, g, h) {
  if (blocked(E, g, h, "final")) return;
  const s = st(h), J = jobOf(h), [x, y] = pointAt(E, g, h, FN.reach, FN.near);
  const full = s.trick >= TK.max, used = s.trick;
  s.trick = 0;
  const src = makeSrc(E, h, s, "final", FN.mul, "ult");
  s.cd.final = FN.cd;
  const enc = ilEncore(J) ? 1 : 0;
  s.acts.push({ k: "final", t: 0, x, y, i: 0, done: 0, k2: full ? 1 + FN.full : 1, enc, src });
  h.swing = 0.4;
  const life = (enc ? FN.encore : FN.end) + FN.tail;
  E.fx(g, h.map, { kind: "sk_il_final", x, y, r: FN.r, n: FN.n, first: FN.first, gap: FN.gap, mirror: FN.mirror, end: FN.end, enc, encore: FN.encore, full: full ? 1 : 0, pi: h.pi, t: life, life, snd: "ilFinal" });
  call(E, g, h, used ? `${FN.name} · 트릭 ${used}` : FN.name, full ? "#FFF4E6" : PURPLE);
}
function tickFinal(E, g, h, q) {
  while (q.i < FN.n && q.t >= FN.first + q.i * FN.gap) {
    q.i += 1;
    for (const o of foes(E, g, h, q.x, q.y, FN.r, q.src.map)) strike(E, g, h, q.src, o, FN.mul);
  }
  if (!q.done && q.t >= FN.end) {
    q.done = 1;
    for (const o of foes(E, g, h, q.x, q.y, FN.r, q.src.map)) strike(E, g, h, q.src, o, FN.endMul * q.k2);
    g.shake = Math.max(g.shake || 0, 0.45);
    E.fx(g, q.src.map, { kind: "call", x: q.x, y: q.y - 130, text: `×${Math.round(FN.endMul * q.k2)}`, color: "#FFF4E6", who: h.pi, t: 1.1, life: 1.1, snd: "ilGlass" });
    if (!q.enc) return false;
  }
  if (q.enc && q.t >= FN.encore) {
    for (const o of foes(E, g, h, q.x, q.y, FN.r, q.src.map)) strike(E, g, h, q.src, o, FN.encoreMul);
    g.shake = Math.max(g.shake || 0, 0.3);
    return false;
  }
  return true;
}

/* ── 입력 — req = { op: "use", s: "shuffle" | "slash" | "prison" | "blink" | "fist" | "mirror" | "final" } ── */
const USE = { shuffle: shuffleUse, slash: slashUse, prison: prisonUse, blink: blinkUse, fist: fistUse, mirror: mirrorUse, final: finalUse };
export function illusionInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !req || typeof req !== "object" || !illusionOn(h)) return false;
  if (req.op === "use" && Object.prototype.hasOwnProperty.call(USE, req.s)) USE[req.s](E, g, h);
  return false;
}

/* ── 시간 ─────────────────────────────────────────── */
const TICK = { shuffle: tickShuffle, slash: tickSlash, prison: tickPrison, blink: tickBlink, fist: tickFist, final: tickFinal };
export function tickIllusion(E, g, h, dt) {
  if (!illusionOn(h)) { if (h.il) h.il = null; return; }
  const s = st(h);
  for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
  if (s.sl && (s.sl.t -= dt) <= 0) { s.sl = null; s.cd.slash = SL.cd; }   // 덱 슬래시 — 이어 쓸 시간이 지났다
  if (E.cdOff(g, h)) for (const k in s.cd) s.cd[k] = 0;
  s.calm += dt;
  if (s.chain && s.calm >= chainWindow(jobOf(h))) s.chain = null;   // 연계 시간 동안 유효 공격이 없으면 연계 기록을 지운다
  if (s.house) { s.house.t += dt; if (s.house.t >= MR.dur || s.house.map !== h.map) s.house = null; }
  const here = (q) => (q.src ? q.src.map : q.map) === h.map;
  s.cards = s.cards.filter((c) => here(c) && stepCard(E, g, h, c, dt));
  s.acts = s.acts.filter((q) => { if (!here(q)) return false; q.t += dt; return TICK[q.k](E, g, h, q); });
  s.ghosts = s.ghosts.filter((q) => here(q) && tickGhost(E, g, h, q, dt));
}
// 쓰러졌다 — 진행 중인 스킬 · 잔상 · 거울 집을 걷고 트릭을 비운다(정한 값 — 트릭은 전투 상태)
export function illusionDown(E, g, h) {
  if (!illusionOn(h) || !h.il) return;
  const s = h.il;
  s.acts = []; s.ghosts = []; s.cards = []; s.house = null; s.chain = null; s.trick = 0; s.sl = null;
}
// 훈련장 · 연습장 "스택 가득" — 트릭 5
export function illusionFill(h) { if (illusionOn(h)) st(h).trick = TK.max; }

/* ── 화면 값 ── */
export function illusionView(h) {
  if (!h || !illusionOn(h)) return null;
  const J = jobOf(h), s = h.il;
  return { trick: s ? s.trick : 0, max: TK.max, cost: TK.cost, lv: J.lv, xp: J.xp, tr: J.tr, cd: s ? { ...s.cd } : { ...NO_CD },
    cdMax: { shuffle: SH.cd, slash: SL.cd, prison: PR.cd, blink: BL.cd, fist: FI.cd, mirror: MR.cd, final: FN.cd },
    house: s && s.house ? { x: s.house.x, y: s.house.y, left: r1(MR.dur - s.house.t), in: s.house.map === h.map && Math.hypot(h.x - s.house.x, (h.y - s.house.y) / SQUASH) <= MR.r } : null,
    chain: s && s.chain ? { sk: s.chain, name: IL_SKILLS[s.chain].name, left: r1(Math.max(0, chainWindow(J) - s.calm)) } : null,
    slash: s && s.sl ? { n: s.sl.n, max: SL.charges, left: r1(Math.max(0, s.sl.t)) } : null,
    encore: ilEncore(J), tint: illusionTint(ilTrainSum(J)), ghost: trickGhost(J) };
}
