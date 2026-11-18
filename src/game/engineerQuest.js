/* ── 히든 직업 Engineer 003 획득 루트 「최초의 설계자」 판정(11월 19일, 사용자 기획안 v1.0) ─────────────
   수치 · 자리 · 대사는 engineerQuestData.js. 판정은 방장 · 전용 서버만 하고, 화면(EngineerQuestPanel.jsx)은 같은 함수로 조사 칸을 띄운다.
   진행은 가방 bag.eu = { f: [깃발 비트 24개씩], d: { 다이얼 값 }, w: 코드 틀린 수, t: 시험 체크포인트 1~3 } — 저장된다.
   싸우는 동안 · 퍼즐 중간 값은 h.eqRun(저장하지 않는다) = { seq: 무리별 누른 차례, mim: 깨어난 미믹, tr: 시험, R: 마지막 결과, hz: 위험 장치 대기 }.
   화면에 보낼 것은 영웅 줄 60(packEq) — 손님 화면 값 h.eqv.
   입력 kind "eq": { op: 'act', id: 조사 자리 id, v: 값 } · { op: 'travel', to } · { op: 'cool', i } · { op: 'cmd', i } · { op: 'contract', yes }.
   E(엔진, rpg.js eqEngine): fx · say · sys · goMap · dummyAt · keep */
import { EQ_FLAGS, EQ_SPOTS, EQ_TRAVEL, EQ_HAZARDS, EQ_BEAST, EQ_MIMIC as MI, EQ_TRIAL as TR, EQ_STAGES as STAGES, EQ_REC, eqMap } from './engineerQuestData.js';
import { ENGINEER as EN, ENGINEER_ID, ENGINEER_NAME } from './engineerData.js';
import { unlockEngineer, engineerOn, cleanEnJob } from './engineerJob.js';
import { hiddenEnforced, hiddenTaken, hiddenTakenMsg, hiddenAsk, hiddenReply } from './hiddenUnique.js';

export const EQ_STAGES = STAGES;
const SQ = 0.78;
const TEAL = '#9fe3ea', WARN = '#f0c98a', RED = '#ff8a8a';
const CH = 24;                                          // 깃발 한 칸에 담는 비트 수
const FI = Object.fromEntries(EQ_FLAGS.map((n, i) => [n, i]));
const DIAL_KEYS = ['temp', 'humid', 'light', 'tw', 'tn', 'te', 'tc', 'coolT'];
const SPOT_I = Object.fromEntries(EQ_SPOTS.map((s, i) => [s.id, i]));
export const eqSpotById = (id) => EQ_SPOTS[SPOT_I[id]] || null;
export const eqSpotIndex = (id) => (id in SPOT_I ? SPOT_I[id] : -1);
const MIMICS = EQ_SPOTS.filter((s) => s.act.k === 'mimic');
export const EQ_MIMIC_IDS = MIMICS.map((s) => s.act.mid);

/* ── 저장 값 ─────────────────────────────── */
export function cleanEu(d) {
  if (!d || typeof d !== 'object') return null;
  const n = Math.ceil(EQ_FLAGS.length / CH), f = [];
  for (let i = 0; i < n; i++) f.push(Math.max(0, Math.floor(Number(Array.isArray(d.f) ? d.f[i] : 0) || 0)) & 0xffffff);
  const dd = {};
  if (d.d && typeof d.d === 'object') for (const k of DIAL_KEYS) { const v = Number(d.d[k]); if (Number.isFinite(v) && v >= 0 && v <= 999) dd[k] = Math.round(v); }
  const w = Math.max(0, Math.min(9, Math.floor(Number(d.w) || 0))), t = Math.max(0, Math.min(3, Math.floor(Number(d.t) || 0)));
  if (!f.some(Boolean) && !Object.keys(dd).length && !w && !t) return null;
  return { f, d: dd, w, t };
}
const eu = (h) => h.bag.eu || (h.bag.eu = { f: [0, 0, 0, 0], d: {}, w: 0, t: 0 });
export function eqHas(h, name) {
  const i = FI[name];
  if (i == null || !h || !h.bag || !h.bag.eu) return false;
  return !!(((h.bag.eu.f || [])[Math.floor(i / CH)] || 0) & (1 << (i % CH)));
}
function setFlag(h, name) {
  const i = FI[name];
  if (i == null || eqHas(h, name)) return false;
  const u = eu(h), c = Math.floor(i / CH);
  while (u.f.length <= c) u.f.push(0);
  u.f[c] |= 1 << (i % CH);
  return true;
}
const save = (h) => { h.bag.v = (h.bag.v || 0) + 1; };
const setAll = (h, names) => { let any = false; for (const n of [].concat(names || [])) if (n && setFlag(h, n)) any = true; if (any) save(h); return any; };
export const eqRecCount = (h) => EQ_REC.filter((n) => eqHas(h, n)).length;

// 조건 — 깃발 이름 배열('!이름' 은 없어야) 또는 함수(u, has)
export function eqCond(h, c) {
  if (!c) return true;
  const has = (n) => eqHas(h, n);
  if (typeof c === 'function') return !!c(h.bag && h.bag.eu, has);
  return c.every((n) => (n[0] === '!' ? !has(n.slice(1)) : has(n)));
}
// 이 직업을 이미 가졌나(시험 중 빌린 값은 아니다)
const owns = (h) => engineerOn(h) && !h.bag.hj.trial;
export const eqOn = () => !!EN.live;

/* ── 조사 자리 ───────────────────────────── */
const dist = (h, at) => Math.hypot(h.x - at[0], (h.y - at[1]) / SQ);
// 보이는가 — 마을 자리(미나 · 촌장)는 그 대답을 들을 때까지만
export function eqSpotShown(h, s) {
  if (!eqOn() || !h || !h.bag || h.map !== s.map) return false;
  if (s.map === 'dawnwood' && (eqHas(h, 'claim') || owns(h) || eqHas(h, s.id === 'mina-ask' ? 'mina' : 'cElder'))) return false;
  if (s.act.k === 'mimic' && eqHas(h, s.act.seal) && s.look) return true;
  return eqCond(h, s.show);
}
export function eqSpotNear(h, npcOk) {
  if (!h || !h.bag || h.down > 0 || !eqOn()) return null;
  if (h.map !== 'dawnwood' && !eqMap(h.map)) return null;
  let best = null, bd = 1e9;
  for (const s of EQ_SPOTS) {
    if (s.map !== h.map || (s.npc && !npcOk)) continue;
    const d = dist(h, s.at);
    if (d <= s.r && d < bd && eqSpotShown(h, s)) { best = s; bd = d; }
  }
  return best;
}
// 말풍선 한 줄 — [글, 단추]
export function eqSpotLine(h, s) {
  const k = s.act.k;
  if (k === 'gate') return [eqCond(h, s.act.need) ? `${s.name} — 다른 곳으로 이어진다.` : `${s.name}`, eqCond(h, s.act.need) ? '들어가기' : '살펴보기'];
  if (k === 'trial') return [eqHas(h, 'won') ? '중앙 단말기가 새 관리자를 기다린다.' : '중앙 단말기가 낮게 울린다.', eqHas(h, 'won') ? '권한 확인' : '살펴보기'];
  if (k === 'doll') return ['멈춰 있는 정비 자동인형이다.', '살펴보기'];
  if (s.npc) return [`${s.name}에게 물어볼 것이 있다.`, '이야기하기'];
  return [`${s.name}`, '살펴보기'];
}

/* ── 결과 — 화면 창이 읽는다(영웅 줄 60 의 0~2 칸) ── 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 힌트 · 6 이미 함 */
const run = (h) => h.eqRun || (h.eqRun = { seq: {}, mim: null, tr: null, R: [-1, 0, 0], hz: 0, ask: null });
function res(h, s, code) { const r = run(h); r.R = [s ? eqSpotIndex(s.id) : -1, code, (r.R[2] + 1) % 1000]; }
const tell = (E, g, h, text, color) => (color ? E.say(g, h.map, h.x, h.y - 100, text, color) : E.sys(g, h.pi, text));

/* ── 입력 ───────────────────────────────── */
export function eqInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!eqOn() || !h || !h.loaded || !h.bag || h.down > 0 || !req || typeof req !== 'object') return;
  if (req.op === 'travel') return void travel(E, g, h, req.to);
  if (req.op === 'cool') return void trialCool(E, g, h, req.i);
  if (req.op === 'cmd') return void trialCmd(E, g, h, req.i);
  if (req.op === 'contract') return void contract(E, g, h, !!req.yes);
  if (req.op !== 'act') return;
  const s = eqSpotById(req.id);
  if (!s || s.map !== h.map || !eqSpotShown(h, s) || dist(h, s.at) > s.r * 1.6) return;
  act(E, g, h, s, req.v);
}

function act(E, g, h, s, v) {
  const a = s.act, k = a.k;
  if (s.need && !eqCond(h, s.need)) return void res(h, s, 3);
  if (a.need && !eqCond(h, a.need)) {
    if (a.lockSet && setAll(h, a.lockSet)) tell(E, g, h, '새 단서를 수첩에 적었다.', TEAL);
    return void res(h, s, 3);
  }
  const done = a.set && eqHas(h, a.set);
  if (k === 'talk') { if (a.set) setAll(h, a.set); if (a.snd) E.fx(g, h.map, { kind: 'sk_eq_snd', x: h.x, y: h.y, t: 0.1, life: 0.1, snd: a.snd, who: h.pi }); return void res(h, s, 1); }
  if (k === 'ask') {
    const o = Number.isInteger(v) && a.opts[v];
    if (!o) return;
    if (o.set) setAll(h, o.set);
    return void res(h, s, 1);
  }
  if (k === 'code') {
    if (v == null) { if (a.mark) setAll(h, a.mark); return void res(h, s, 1); }
    if (done) return void res(h, s, 6);
    if (String(v) === a.ans) { setAll(h, [a.set, a.mark]); E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 120, text: '숫자판이 풀렸다', color: TEAL, t: 1.2, life: 1.2, snd: 'eqClank', who: h.pi }); return void res(h, s, 1); }
    const u = eu(h); u.w = Math.min(9, (u.w || 0) + 1); save(h);
    if (u.w >= a.hint) { setAll(h, 'hint3'); return void res(h, s, 5); }
    return void res(h, s, 2);
  }
  if (k === 'seq') return void seq(E, g, h, s);
  if (k === 'dial') {
    if (!a.opts.includes(v)) return;
    eu(h).d[a.key] = v; save(h);
    return void res(h, s, 1);
  }
  if (k === 'check') {
    if (done) return void res(h, s, 6);
    const d = eu(h).d, ok = Object.entries(a.keys).every(([key, want]) => d[key] === want);
    if (!ok) return void res(h, s, 2);
    setAll(h, a.set); E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 120, text: a.set.startsWith('rec') ? '설계 기록을 찾았다' : '장치가 깨어났다', color: TEAL, t: 1.4, life: 1.4, snd: 'eqBeep', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'pick') {
    if (done) return void res(h, s, 6);
    if (v !== a.ans) return void res(h, s, 2);
    setAll(h, [a.set, a.also]); recFx(E, g, h, a.set);
    return void res(h, s, 1);
  }
  if (k === 'multi') {
    if (done) return void res(h, s, 6);
    if (!Array.isArray(v) || v.length !== a.n || new Set(v).size !== a.n || !v.every((i) => Number.isInteger(i) && a.opts[i])) return;
    const want = a.ans.map((i) => a.opts[i]).sort().join('|'), got = v.map((i) => a.opts[i]).sort().join('|');
    if (want !== got) return void res(h, s, 2);
    setAll(h, a.set); return void res(h, s, 1);
  }
  if (k === 'dials') {
    if (done) return void res(h, s, 6);
    if (!Array.isArray(v) || v.length !== a.items.length) return;
    if (!a.items.every((it, i) => v[i] === it.ans)) return void res(h, s, 2);
    setAll(h, a.set); E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 120, text: '회로가 맞물렸다', color: TEAL, t: 1.2, life: 1.2, snd: 'eqBeep', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'order') {
    if (done) {
      if (a.go) { E.goMap(g, h, a.go.to, a.go.back); return void res(h, s, 6); }
      return void res(h, s, 6);
    }
    if (!Array.isArray(v) || v.length !== a.ans.length || !v.every((x, i) => x === a.ans[i])) return void res(h, s, 2);
    setAll(h, a.set); recFx(E, g, h, a.set);
    return void res(h, s, 1);
  }
  if (k === 'take' || k === 'record') {
    if (done) return void res(h, s, 6);
    setAll(h, [a.set, a.also]); recFx(E, g, h, a.set);
    if (k === 'take') E.fx(g, h.map, { kind: 'sk_eq_snd', x: h.x, y: h.y, t: 0.1, life: 0.1, snd: 'eqClank', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'gate') {
    if (a.first && !eqHas(h, 'metro') && a.to === 'eng-metro') setAll(h, 'metro');
    E.goMap(g, h, a.to, a.back);
    return void res(h, s, 1);
  }
  if (k === 'mimic') return void mimic(E, g, h, s, v);
  if (k === 'seal') {
    if (eqHas(h, a.set)) return void res(h, s, 6);
    setAll(h, a.set);
    const r = run(h); if (r.mim && r.mim.mid === a.mid) r.mim = null;
    E.fx(g, h.map, { kind: 'sk_eq_snd', x: h.x, y: h.y, t: 0.1, life: 0.1, snd: 'eqClank', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'travel') return void res(h, s, 1);
  if (k === 'doll') return void doll(E, g, h, s);
  if (k === 'mount') {
    if (done) return void res(h, s, 6);
    const d = eu(h).d;
    if (!Object.entries(a.keys).every(([key, [lo, hi]]) => d[key] >= lo && d[key] <= hi)) return void res(h, s, 2);
    setAll(h, ['cool', a.set]);
    E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text: '중앙 시스템 재가동', color: TEAL, t: 2, life: 2, snd: 'eqBeep', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'trial') return void trialStart(E, g, h, s);
}
function recFx(E, g, h, flag) {
  const i = EQ_REC.indexOf(flag);
  if (i < 0) return;
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text: `설계 기록 ${eqRecCount(h)}/6`, color: TEAL, t: 1.6, life: 1.6, snd: 'eqBeep', who: h.pi });
}

// 차례 누르기 — 무리 g 의 i 번째를 눌러야 다음으로. 틀리면 처음부터
function seq(E, g, h, s) {
  const a = s.act;
  if (eqHas(h, a.set)) return void res(h, s, 6);
  if (a.cool && beastPhase(eqClock(g)) !== 'cool') { run(h).seq[a.g] = []; tell(E, g, h, '전기가 튀어 단말기가 꺼졌다. 냉각 구간에만 조작해야 한다.', WARN); return void res(h, s, 2); }
  const r = run(h), q = r.seq[a.g] || (r.seq[a.g] = []);
  if (q.includes(a.i)) return void res(h, s, 4);
  if (a.i !== q.length) { r.seq[a.g] = []; return void res(h, s, 2); }
  q.push(a.i);
  if (q.length < a.n) { E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 110, text: `${q.length}/${a.n}`, color: TEAL, t: 0.8, life: 0.8, snd: 'eqBeep', who: h.pi }); return void res(h, s, 4); }
  r.seq[a.g] = [];
  setAll(h, a.set);
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 120, text: '장치가 맞물렸다', color: TEAL, t: 1.2, life: 1.2, snd: 'eqClank', who: h.pi });
  res(h, s, 1);
}
// 화면 — 이 무리에서 지금까지 누른 차례(퍼즐 표시등)
export const eqSeqOf = (h, g0) => (h && h.eqRun && h.eqRun.seq[g0]) || [];

/* ── 자동인형 003 ── 처음 보면 doll · 부품 넷이 모이면 doll3(동료가 된다) */
const PARTS = ['pCell', 'pMem', 'pJoint', 'pCtrl'];
export const eqDollParts = (h) => PARTS.filter((n) => eqHas(h, n)).length;
function doll(E, g, h, s) {
  if (!eqHas(h, 'doll')) { setAll(h, 'doll'); return void res(h, s, 1); }
  if (eqHas(h, 'doll3')) return void res(h, s, 6);
  if (eqDollParts(h) < 4) return void res(h, s, 3);
  setAll(h, 'doll3');
  E.fx(g, h.map, { kind: 'call', x: s.at[0], y: s.at[1] - 160, text: '자동인형 003 재가동', color: TEAL, t: 2, life: 2, snd: 'eqBeep', who: h.pi });
  res(h, s, 1);
}

/* ── 정비망 지도 — 연구소에서 여섯 지역으로 ── */
export const eqTravelOpen = (h, t) => eqHas(h, 'doll3') && (!t.after || EQ_REC.slice(0, 5).every((n) => eqHas(h, n)));
function travel(E, g, h, to) {
  if (h.map !== 'eng-lab') return;
  const t = EQ_TRAVEL.find((q) => q.to === to);
  if (!t || !eqTravelOpen(h, t)) return;
  const spot = eqSpotById('lab-map');
  if (!spot || dist(h, spot.at) > spot.r * 1.8) return;
  E.goMap(g, h, to, E.spawnOf(to));
}

/* ── 미믹 — 깨어나면 내 자리에 예고 원 → 물리면 밀려난다(피해 없음) ── */
function mimic(E, g, h, s, v) {
  const a = s.act;
  if (eqHas(h, a.seal)) return void res(h, s, 6);
  if (v === 0) {
    const r = run(h);
    r.mim = { mid: a.mid, sid: s.id, t: 0, next: 0.6, warn: null };
    E.fx(g, h.map, { kind: 'call', x: s.at[0], y: s.at[1] - 120, text: '미믹이다!', color: RED, t: 1.2, life: 1.2, snd: 'eqClank', who: h.pi });
    return void res(h, s, 2);
  }
  if (v === 2) { if (a.pokeSeal) setAll(h, a.seal); return void res(h, s, a.pokeSeal ? 1 : 5); }
  res(h, s, 4);
}
function tickMimic(E, g, h, dt) {
  const r = h.eqRun, m = r && r.mim;
  if (!m) return;
  const s = eqSpotById(m.sid);
  if (!s || h.map !== s.map || (m.t += dt) > MI.dur) { r.mim = null; return; }
  if (m.warn) {
    if ((m.warn.t += dt) < MI.warn) return;
    const w = m.warn; m.warn = null; m.next = MI.gap;
    E.fx(g, h.map, { kind: 'sk_eq_bite', x: w.x, y: w.y, r: MI.r, t: 0.4, life: 0.4, snd: 'eqClank', who: h.pi });
    if (Math.hypot(h.x - w.x, (h.y - w.y) / SQ) <= MI.r) {
      const dx = h.x - s.at[0], dy = (h.y - s.at[1]) / SQ, L = Math.hypot(dx, dy) || 1;
      E.place(g, h, h.x + (dx / L) * MI.push, h.y + (dy / L) * MI.push * SQ);
      tell(E, g, h, '미믹에게 물려 튕겨 나갔다!', RED);
    }
    return;
  }
  if ((m.next -= dt) <= 0) {
    m.warn = { x: h.x, y: h.y, t: 0 };
    E.fx(g, h.map, { kind: 'sk_eq_warn', x: h.x, y: h.y, r: MI.r, d: MI.warn, pi: h.pi, t: MI.warn, life: MI.warn });
  }
}

/* ── 위험 장치 — 피해 없음, 걸리면 안전한 자리로 ──
   박자는 벽시계(초)로 센다 — 판정 세계 시각(g.t)은 화면에 오지 않아, 서버와 화면이 같은 박자를 보려면 둘 다 아는 시계를 써야 한다 */
export const eqClock = (g) => (g && g.eqClock ? g.eqClock() : Date.now() / 1000);
export function beastPhase(t) {
  const c = EQ_BEAST.charge + EQ_BEAST.burst + EQ_BEAST.cool, p = ((t % c) + c) % c;
  return p < EQ_BEAST.charge ? 'charge' : p < EQ_BEAST.charge + EQ_BEAST.burst ? 'burst' : 'cool';
}
// 지금 위험 장치 상태 — 화면도 같은 함수로 그린다. { on: 막는 중, warn: 곧, x, y }
export function eqHazardState(h, z, t) {
  if (z.need && !eqCond(h, z.need)) return null;
  if (z.off && eqCond(h, z.off)) return null;
  if (z.kind === 'press') { const p = t % z.period; return { x: z.at[0], y: z.at[1], on: p >= z.on[0] && p < z.on[1], warn: p >= z.on[0] - z.warn && p < z.on[0] }; }
  if (z.kind === 'spark') return { x: z.at[0], y: z.at[1], on: true };
  if (z.kind === 'drone') {
    const p = (t % z.period) / z.period, k = p < 0.5 ? p * 2 : 2 - p * 2;
    const [a, b] = z.pts; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, on: true };
  }
  if (z.kind === 'beast') { const ph = beastPhase(t); return { x: z.at[0], y: z.at[1], on: ph === 'burst', warn: ph === 'charge', ph }; }
  return null;
}
function tickHazards(E, g, h, dt) {
  const r = run(h);
  if (r.hz > 0) { r.hz -= dt; return; }
  for (const z of EQ_HAZARDS) {
    if (z.map !== h.map) continue;
    const s = eqHazardState(h, z, eqClock(g));
    if (!s || !s.on || Math.hypot(h.x - s.x, (h.y - s.y) / SQ) > z.r) continue;
    E.place(g, h, z.back[0], z.back[1]);
    r.hz = 1.2;
    tell(E, g, h, z.msg, WARN);
    return;
  }
}

/* ── 최종 병기 시험(기획안 9장) ─────────────── */
const TRIAL_MAP = 'eng-trial';
const trialMobs = (g, h) => g.mobs.filter((m) => m.eq && m.own === h.pi && !m.dead);
function clearTrialMobs(g, h) { g.mobs = g.mobs.filter((m) => !(m.eq && m.own === h.pi)); }
function borrow(h) {
  if (h.bag.hj && h.bag.hj.trial) return;
  const prev = h.bag.hj || null;
  h.bag.hj = { active: ENGINEER_ID, jobs: { [ENGINEER_ID]: cleanEnJob({ lv: TR.lv }) }, version: 1, trial: 1, prev };
  h.en = null; save(h);
}
function giveBack(h) {
  const hj = h.bag.hj;
  if (hj && hj.trial) { if (hj.prev) h.bag.hj = hj.prev; else delete h.bag.hj; h.en = null; h.env = null; save(h); }
}
export const eqInTrial = (h) => !!(h && h.eqRun && h.eqRun.tr);
function trialStart(E, g, h, s) {
  if (eqHas(h, 'won')) return void res(h, s, 6);                      // 계약 창은 화면이 연다
  if (owns(h)) return void res(h, s, 6);
  if (hiddenTaken(g, h, ENGINEER_ID)) { tell(E, g, h, '중앙 단말기: 「관리자 권한은 이미 다른 계승자에게 넘어갔습니다.」 단말기가 조용히 꺼진다.'); return void res(h, s, 3); }
  if (h.bd && h.bag.bd && h.bag.bd.on) { /* BLOOD-001 은 시험 동안 잠시 쉰다 — 빌린 엔지니어 판정이 먼저 */ }
  if (eqInTrial(h)) return void res(h, s, 6);
  setAll(h, 'cand');
  borrow(h);
  const ph = Math.max(1, eu(h).t || 1);
  run(h).tr = newPhase(ph);
  clearTrialMobs(g, h);
  spawnPhase(E, g, h);
  tell(E, g, h, `최종 병기 시험 — ${ph}단계. 시험 동안 ${ENGINEER_NAME} 의 기술(직업 레벨 ${TR.lv})을 빌려준다. 레벨과 장비는 시험에 영향을 주지 않는다.`);
  res(h, s, 1);
}
const newPhase = (ph) => ({ ph, t: 0, dev: TR.device.hp, dur: TR.dur, wave: 0, next: TR.first, sh: 0, shT: 0, heat: 0, cool: 0, cmd: 0, atk: TR.boss.gap, warn: null, open: 0 });
function spawnPhase(E, g, h) {
  const t = h.eqRun.tr;
  if (t.ph >= 2) {
    const b = bot(E, g, h, 'boss', TR.boss.at[0], TR.boss.at[1]);
    b.hp = b.max = TR.base * TR.boss.hp * (t.ph === 3 ? TR.boss.phase3 : 1);
    if (t.ph === 2) raiseTerms(E, g, h);
  }
}
function bot(E, g, h, kind, x, y) {
  const m = E.dummyAt(g, TRIAL_MAP, x, y);
  const B = TR.bots[kind];
  Object.assign(m, { eq: kind, own: h.pi, eqOwner: h.who, eqf: 0, shot: B && B.gap ? B.gap : 0 });
  if (B) { m.hp = m.max = TR.base * B.hp; m.rad = B.rad; }
  if (kind === 'term') { m.hp = m.max = TR.base * 20; m.rad = 30; }
  return m;
}
function raiseTerms(E, g, h) {
  for (const [x, y] of TR.boss.terms) bot(E, g, h, 'term', x, y);
  h.eqRun.tr.sh = TR.boss.terms.length;
}
// 시험 몹을 쳤다 — 레벨 · 장비와 관계없이 받은 값 그대로(치명타 · 배율 없음). rpg.js hitMob 이 먼저 부른다
export function eqMobHit(E, g, h, m, raw) {
  if (!h || m.own !== h.pi || m.eqOwner !== h.who || m.map !== h.map || !eqInTrial(h)) return 0;
  const t = h.eqRun.tr;
  if (m.eq === 'boss' && (t.sh > 0 || t.ph === 3)) {
    if (!(m.numT > 0)) { E.say(g, m.map, m.x, m.y - 120, t.ph === 3 ? '과부하 — 공격이 통하지 않는다' : '방어막 — 외곽 단말기를 부숴라', TEAL); m.numT = 0.8; }
    return 0;
  }
  const dmg = Math.max(1, Math.round(raw));
  m.hp -= dmg; m.flash = 0.12;
  m.numAcc = (m.numAcc || 0) + dmg;
  if (!(m.numT > 0)) { E.say(g, m.map, m.x, m.y - 70, String(Math.round(m.numAcc)), '#ffe9bd'); m.numAcc = 0; m.numT = 0.25; }
  if (m.hp > 0) return dmg;
  m.hp = 0; m.dead = true;
  g.mobs = g.mobs.filter((q) => q !== m);
  E.fx(g, m.map, { kind: 'sk_eq_boom', x: m.x, y: m.y, r: m.eq === 'boss' ? 160 : 70, t: 0.5, life: 0.5, snd: 'eqClank' });
  if (m.eq === 'term') { t.sh = Math.max(0, t.sh - 1); if (!t.sh) { t.shT = TR.boss.recharge; tell(E, g, h, `방어막이 꺼졌다! ${TR.boss.recharge}초 안에 E-003 을 쳐라.`, TEAL); } }
  return dmg;
}
const tdist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / SQ);
function fail(E, g, h, why) {
  const ph = h.eqRun.tr.ph;
  clearTrialMobs(g, h);
  h.eqRun.tr = newPhase(ph);
  spawnPhase(E, g, h);
  if (h.en) h.en.power = EN.power;
  tell(E, g, h, `${why} ${ph}단계를 처음부터 다시 시작한다.`);
}
function nextPhase(E, g, h) {
  const t = h.eqRun.tr, ph = t.ph + 1;
  clearTrialMobs(g, h);
  eu(h).t = ph; save(h);
  h.eqRun.tr = newPhase(ph);
  spawnPhase(E, g, h);
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text: `시험 ${ph - 1}단계 통과`, color: TEAL, t: 1.6, life: 1.6, snd: 'eqBeep', who: h.pi });
  tell(E, g, h, ph === 2 ? '2단계 — 최종 병기 E-003 이 깨어났다. 외곽 단말기 넷을 부숴 방어막을 걷어 내라.'
    : '3단계 — E-003 이 과부하 상태다. 냉각 장치 셋을 차례로 돌려 열을 낮추고, 90초를 버틴 뒤 중앙 단말기에 명령을 넣어라.');
}
function tickTrial(E, g, h, dt) {
  const r = h.eqRun, t = r && r.tr;
  const hj = h.bag.hj;
  if (!t) { if (hj && hj.trial && hj.active === ENGINEER_ID) giveBack(h); return; }
  if (h.map !== TRIAL_MAP) { r.tr = null; clearTrialMobs(g, h); giveBack(h); return; }
  if (!(hj && hj.trial)) borrow(h);
  t.t += dt;
  if (h.en) h.en.power = Math.min(EN.power, h.en.power + (TR.regen - EN.regen) * dt);   // 시험 전력 회복 초당 3(엔지니어 기본 2 + 1)
  const mobs = trialMobs(g, h);
  for (const m of mobs) if (m.numT > 0) m.numT -= dt;
  if (t.ph === 1) {
    const dev = { x: TR.device.at[0], y: TR.device.at[1] };
    if (t.wave < TR.waves && ((t.next -= dt) <= 0 || (!mobs.length && t.wave > 0 && t.next > 10))) {
      const [a, b, c] = TR.wave[t.wave];
      const edge = (i, n) => { const side = (t.wave + i) % 3; return side === 0 ? [120 + (2160 * (i + 1)) / (n + 1), 560] : side === 1 ? [80, 700 + i * 120] : [2320, 700 + i * 120]; };
      for (let i = 0; i < a; i++) bot(E, g, h, 'rush', ...edge(i, a));
      for (let i = 0; i < b; i++) { const m = bot(E, g, h, 'flank', ...(i % 2 ? [80, 1450] : [2320, 1450])); m.side = i % 2 ? -1 : 1; }
      for (let i = 0; i < c; i++) bot(E, g, h, 'shoot', ...(i % 2 ? [300, 600] : [2100, 600]));
      t.wave++; t.next = TR.gap;
      tell(E, g, h, `${t.wave}/${TR.waves} 웨이브 — 제어 장치를 지켜라.`, WARN);
    }
    for (const m of mobs) {
      const B = TR.bots[m.eq]; if (!B) continue;
      let tx = dev.x, ty = dev.y;
      if (m.eq === 'flank' && tdist(m, dev) > TR.device.r + 130) { tx = dev.x + m.side * (TR.device.r + 190); ty = dev.y + 320; }
      const d = tdist(m, dev);
      if (m.eq === 'shoot' && d <= B.r) {
        if ((m.shot -= dt) <= 0) { m.shot = B.gap; t.dev -= B.dmg; E.fx(g, TRIAL_MAP, { kind: 'sk_eq_shot', x: m.x, y: m.y, tx: dev.x, ty: dev.y, t: 0.3, life: 0.3, snd: 'eqBeep' }); }
        continue;
      }
      if (d < TR.device.r) { t.dev -= B.dmg; m.dead = true; g.mobs = g.mobs.filter((q) => q !== m); E.fx(g, TRIAL_MAP, { kind: 'sk_eq_boom', x: m.x, y: m.y, r: 60, t: 0.4, life: 0.4, snd: 'eqClank' }); continue; }
      const dx = tx - m.x, dy = (ty - m.y) / SQ, L = Math.hypot(dx, dy) || 1;
      const sp = B.spd * (m.slow > 0 ? 0.5 : 1) * (m.stun > 0 || m.freeze > 0 ? 0 : 1);
      m.x += (dx / L) * sp * dt; m.y += (dy / L) * sp * dt * SQ; m.ax = dx < 0 ? -1 : 1;
      if (m.slow > 0) m.slow -= dt; if (m.stun > 0) m.stun -= dt; if (m.freeze > 0) m.freeze -= dt;
    }
    if (t.dev <= 0) return void fail(E, g, h, '제어 장치가 부서졌다.');
    if (t.wave >= TR.waves && !trialMobs(g, h).length) return void nextPhase(E, g, h);
    return;
  }
  const boss = mobs.find((m) => m.eq === 'boss');
  if (t.ph === 2) {
    if (!boss) return void nextPhase(E, g, h);
    if (boss.hp <= boss.max * TR.boss.phase3) return void nextPhase(E, g, h);
    if (!t.sh && t.shT > 0 && (t.shT -= dt) <= 0) { raiseTerms(E, g, h); tell(E, g, h, 'E-003 이 외곽 단말기를 다시 세웠다.', WARN); }
  }
  if (t.ph === 3) {
    if (!t.open) {
      t.heat += TR.last.heat * dt;
      if (t.heat >= 100) return void fail(E, g, h, '과열로 시험장이 멈췄다.');
      if (t.t >= TR.last.time) { t.open = 1; tell(E, g, h, '버텼다! 중앙 단말기에 명령을 넣어라 — 정지 → 안전 확인 → 재가동.', TEAL); }
    }
  }
  if (boss && !t.open) bossAttack(E, g, h, t, boss, dt);
  if (t.dur <= 0) return void fail(E, g, h, '시험 내구도가 바닥났다.');
}
function bossAttack(E, g, h, t, boss, dt) {
  const B = TR.boss;
  if (t.warn) {
    if ((t.warn.t += dt) < t.warn.d) return;
    const w = t.warn; t.warn = null;
    let hit;
    if (w.k === 'laser') {
      const ax = w.dx, ay = w.dy, px = h.x - w.x, py = (h.y - w.y) / SQ, along = px * ax + py * ay, side = Math.abs(px * ay - py * ax);
      hit = along > 0 && along < B.laser.len && side < B.laser.w / 2;
      E.fx(g, TRIAL_MAP, { kind: 'sk_eq_laser', x: w.x, y: w.y, dx: ax, dy: ay, len: B.laser.len, w: B.laser.w, t: 0.4, life: 0.4, snd: 'eqBeep' });
      if (hit) t.dur -= B.laser.dmg;
    } else {
      hit = Math.hypot(h.x - w.x, (h.y - w.y) / SQ) <= B.wave.r;
      E.fx(g, TRIAL_MAP, { kind: 'sk_eq_wave', x: w.x, y: w.y, r: B.wave.r, t: 0.5, life: 0.5, snd: 'eqClank' });
      if (hit) t.dur -= B.wave.dmg;
    }
    if (hit) tell(E, g, h, `시험 내구도 ${Math.max(0, Math.round(t.dur))}`, RED);
    return;
  }
  if ((t.atk -= dt) > 0) return;
  t.atk = B.gap * (t.ph === 3 ? 1.3 : 1);
  const laser = (t.k = (t.k || 0) + 1) % 2 === 1;
  if (laser) {
    const dx = h.x - boss.x, dy = (h.y - boss.y) / SQ, L = Math.hypot(dx, dy) || 1;
    t.warn = { k: 'laser', x: boss.x, y: boss.y, dx: dx / L, dy: dy / L, t: 0, d: B.laser.warn };
    E.fx(g, TRIAL_MAP, { kind: 'sk_eq_lwarn', x: boss.x, y: boss.y, dx: dx / L, dy: dy / L, len: B.laser.len, w: B.laser.w, d: B.laser.warn, t: B.laser.warn, life: B.laser.warn });
  } else {
    t.warn = { k: 'wave', x: boss.x, y: boss.y, t: 0, d: B.wave.warn };
    E.fx(g, TRIAL_MAP, { kind: 'sk_eq_warn', x: boss.x, y: boss.y, r: B.wave.r, d: B.wave.warn, t: B.wave.warn, life: B.wave.warn });
  }
}
// 냉각 장치 — 3단계에서 차례대로(왼쪽 → 오른쪽 → 아래). 틀린 차례면 열이 오른다
function trialCool(E, g, h, i) {
  const t = h.eqRun && h.eqRun.tr;
  if (!t || t.ph !== 3 || t.open || !Number.isInteger(i) || !TR.last.cool[i]) return;
  const at = TR.last.cool[i];
  if (dist(h, at) > 130) return;
  if (i !== t.cool) { t.heat = Math.min(99, t.heat + 10); return void tell(E, g, h, '순서가 틀렸다 — 열이 올랐다.', RED); }
  t.heat = Math.max(0, t.heat - TR.last.coolBy); t.cool = (t.cool + 1) % TR.last.cool.length;
  E.fx(g, TRIAL_MAP, { kind: 'call', x: at[0], y: at[1] - 110, text: `냉각 −${TR.last.coolBy}`, color: TEAL, t: 1, life: 1, snd: 'eqBeep', who: h.pi });
}
// 마지막 명령 — 정지 → 안전 확인 → 재가동(cmd 의 차례 ans)
function trialCmd(E, g, h, i) {
  const t = h.eqRun && h.eqRun.tr;
  if (!t || t.ph !== 3 || !t.open || !Number.isInteger(i)) return;
  const s = eqSpotById('trl-console');
  if (dist(h, s.at) > s.r * 1.6) return;
  if (i !== TR.last.ans[t.cmd]) { t.cmd = 0; return void tell(E, g, h, '명령 순서가 맞지 않는다. 처음부터 다시 넣어라.', RED); }
  t.cmd++;
  if (t.cmd < TR.last.ans.length) return;
  clearTrialMobs(g, h);
  h.eqRun.tr = null; giveBack(h);
  eu(h).t = 0; setAll(h, ['trial', 'won']);
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 140, text: '최종 병기 시험 통과', color: TEAL, t: 2, life: 2, snd: 'lvup', who: h.pi });
  tell(E, g, h, 'E-003 이 무릎을 꿇는다. 「관리자 후보의 판단을 확인했습니다.」 중앙 단말기에 계약 창이 떠올랐다.');
}

/* ── 계약 — 유일 규칙(hiddenUnique.js)을 거쳐 해금 ── */
function contract(E, g, h, yes) {
  if (!eqHas(h, 'won') || eqHas(h, 'claim') || h.map !== TRIAL_MAP) return;
  const s = eqSpotById('trl-console');
  if (dist(h, s.at) > s.r * 1.6) return;
  if (!yes) { setAll(h, 'later'); return void tell(E, g, h, '「언제든 돌아오십시오. 단말기는 계승자를 기다립니다.」'); }
  if (owns(h)) return;
  if (!hiddenEnforced(g, h)) return void finish(E, g, h);
  if (hiddenTaken(g, h, ENGINEER_ID)) return void tell(E, g, h, '중앙 단말기: 「관리자 권한은 이미 다른 계승자에게 넘어갔습니다.」');
  run(h).ask = { t: 0 };
  hiddenAsk(g, h, ENGINEER_ID);
}
function tickAsk(E, g, h, dt) {
  const r = h.eqRun, a = r && r.ask;
  if (!a) return;
  const rep = hiddenReply(h, ENGINEER_ID);
  if (rep) {
    r.ask = null;
    if (rep.ok) return void finish(E, g, h);
    if (rep.err === 'taken') return void tell(E, g, h, hiddenTakenMsg(ENGINEER_ID));
    if (rep.err === 'account') return void tell(E, g, h, `서버 계정이 없는 캐릭터는 ${ENGINEER_NAME} 를 해금할 수 없다.`);
    return void tell(E, g, h, '계약을 확인하지 못했다. 잠시 뒤 다시 시도해 주세요.');
  }
  if ((a.t += dt) > 10) { r.ask = null; tell(E, g, h, '계약을 확인하지 못했다. 잠시 뒤 다시 시도해 주세요.'); }
}
function finish(E, g, h) {
  if (h.bag.hj && h.bag.hj.trial) giveBack(h);
  setAll(h, 'claim');
  unlockEngineer(h);
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 150, text: `${ENGINEER_NAME} 계승`, color: TEAL, t: 2.4, life: 2.4, snd: 'lvup', who: h.pi });
  const J = h.bag.hj.jobs[ENGINEER_ID];
  tell(E, g, h, `고대 기계 문명의 관리자 권한을 계승했다. ${ENGINEER_NAME} — 1차 전직은 사라지고 무기는 내려놓았다. ${J.lv > 1 ? `예전 기록(직업 레벨 ${J.lv})에서 이어 간다.` : '직업 레벨 1 · 펄스 발진부터 시작한다.'}`);
}

/* ── 시간 — 영웅마다(rpg.js 영웅 반복) ── */
export function tickEq(E, g, h, dt) {
  if (!h || !h.bag) return;
  const hj = h.bag.hj;
  if (!h.eqRun && !(hj && hj.trial && hj.active === ENGINEER_ID)) { if (!eqMap(h.map)) return; }
  if (h.eqRun || (hj && hj.trial)) tickTrial(E, g, h, dt);
  if (!h.eqRun) { if (eqMap(h.map)) run(h); else return; }
  tickAsk(E, g, h, dt);
  if (h.down > 0) return;
  tickMimic(E, g, h, dt);
  if (eqMap(h.map)) tickHazards(E, g, h, dt);
}

/* ── 관리자 /엔지니어 <이름> 루트 <단계> — 그 단계 앞까지 깃발을 세운다 ── */
export function eqAdminStage(h, st) {
  const i = STAGES.findIndex((q) => q.name === st || q.name.replace(/\s/g, '') === String(st).replace(/\s/g, ''));
  const n = i >= 0 ? i : Math.max(0, Math.min(STAGES.length - 1, Math.floor(Number(st) || 0)));
  h.bag.eu = { f: [0, 0, 0, 0], d: {}, w: 0, t: 0 };
  for (let k = 1; k <= n; k++) for (const f of STAGES[k].set) setFlag(h, f);
  if (n >= 5) Object.assign(h.bag.eu.d, { coolT: 20 });
  h.eqRun = null;
  save(h);
  return STAGES[n].name;
}

/* ── 스냅샷 영웅 줄 60 ── 0 이면 아무것도 없다 */
const r1 = (v) => Math.round(v * 10) / 10;
export function packEq(h) {
  const r = h.eqRun;
  if (!r) return 0;
  const m = r.mim ? EQ_MIMIC_IDS.indexOf(r.mim.mid) : -1;
  const t = r.tr;
  const tr = t ? [t.ph, r1(t.t), Math.max(0, Math.round(t.dev)), Math.max(0, Math.round(t.dur)), t.wave, t.sh, r1(t.shT), Math.round(t.heat), t.cool, t.cmd, t.open] : 0;
  const sq = Object.entries(r.seq).filter(([, q]) => q.length).map(([k, q]) => [k, q.slice()]);
  return [r.R[0], r.R[1], r.R[2], m, tr, sq.length ? sq : 0, r.ask ? 1 : 0];
}
export function applyEq(h, a) {
  if (!a) { h.eqv = null; return; }
  const [ri, rc, rn, m, tr, sq, ask] = a;
  h.eqv = { R: [ri, rc, rn], mim: m, ask,
    tr: tr ? { ph: tr[0], t: tr[1], dev: tr[2], dur: tr[3], wave: tr[4], sh: tr[5], shT: tr[6], heat: tr[7], cool: tr[8], cmd: tr[9], open: tr[10] } : null,
    seq: sq ? Object.fromEntries(sq) : {} };
}
// 화면 값 — 손님은 스냅샷(h.eqv), 방장 브라우저는 판정 값에서 바로 만든다
export function eqView(h) {
  if (!h) return null;
  if (h.eqRun) { const o = {}; applyEq(o, packEq(h)); return o.eqv; }
  return h.eqv || null;
}
