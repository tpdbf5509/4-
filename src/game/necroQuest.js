/* ── 히든 직업 Necromancer 004 획득 루트 「그림자 군주」 판정(11월 20일, 사용자 기획안 「획득루트 최종수정안」) ─────────────
   수치 · 자리 · 대사는 necroQuestData.js. 판정은 방장 · 전용 서버만 하고, 화면(NecroQuestPanel.jsx)은 같은 함수로 조사 칸을 띄운다.
   Engineer 003 「최초의 설계자」(engineerQuest.js)와 같은 틀이다.
   진행은 가방 bag.nu = { f: [깃발 비트 24개씩], d: { 장치 값 }, t: 왕궁 시험 체크포인트 } — 저장된다.
   싸우는 동안 · 퍼즐 중간 값은 h.nqRun(저장하지 않는다) = { seq, mim, tr: 시험, R: 마지막 결과, hz, ask, still }.
   시험은 캐릭터 레벨 · 장비 · 직업과 관계없이 시험 체력 100 · 시험 기술(NQ_SKILLS)만 쓴다. 시험 적 · 병사는 몹 목록(g.mobs)에 넣지 않고 tr 안에만 둔다.
   화면에 보낼 것은 영웅 줄 61(packNq) — 손님 화면 값 h.nqv.
   입력 kind "nq": { op: 'act', id, v } · { op: 'skill', s } · { op: 'cmd', c } · { op: 'glyph', v } · { op: 'contract', yes }.
   E(엔진, rpg.js nqEngine): fx · say · sys · goMap · place · face · bagRoom · gear */
import { NQ_FLAGS, NQ_SPOTS, NQ_HAZARDS, NQ_GAUGE, NQ_MIMIC as MI, NQ_TEST as TS, NQ_SKILLS as SK, NQ_CMDS, NQ_FOES as FO, NQ_ALLY as AL,
  NQ_TRIALS, NQ_TRIAL_IDS, NQ_STAGES as STAGES, NQ_SEALS, NQ_SEAL_NAMES, NQ_FIRST_SEAL, NQ_BLOCKS, NQ_MAP_W, NQ_MAP_H, NQ_MAPS, nqMap, nqSpotMap } from './necroQuestData.js';
import { NECRO as NC, NECRO_ID, NECRO_NAME, NC_WEAPON_ITEM } from './necroData.js';
import { unlockNecro, necroOn } from './necroJob.js';
import { hiddenEnforced, hiddenTaken, hiddenTakenMsg, hiddenAsk, hiddenReply } from './hiddenUnique.js';

export const NQ_STAGE_LIST = STAGES;
const SQ = 0.78;
const VIO = '#cdb8f0', WARN = '#f0c98a', RED = '#ff8a8a';
const CH = 24;                                          // 깃발 한 칸에 담는 비트 수
const FI = Object.fromEntries(NQ_FLAGS.map((n, i) => [n, i]));
const DIAL_KEYS = ['dir', 'tq', 'rs', 'rb', 'rp', 'ro'];
const SPOT_I = Object.fromEntries(NQ_SPOTS.map((s, i) => [s.id, i]));
export const nqSpotById = (id) => NQ_SPOTS[SPOT_I[id]] || null;
export const nqSpotIndex = (id) => (id in SPOT_I ? SPOT_I[id] : -1);
const MIMICS = NQ_SPOTS.filter((s) => s.act.k === 'mimic');
export const NQ_MIMIC_IDS = MIMICS.map((s) => s.act.mid);
const MAP_OF = Object.fromEntries(NQ_MAPS.map((m) => [m.id, m]));
// 이름 없는 묘역 의식(1장) — 묘비 둘레 · 바른 방향(0 북) · 횃불 셋을 모두 끔 · 이만큼 가만히(정한 값)
export const NQ_RITUAL = { near: 190, dir: 0, torches: 3, still: 8, startDir: 2 };

/* ── 저장 값 ─────────────────────────────── */
export function cleanNu(d) {
  if (!d || typeof d !== 'object') return null;
  const n = Math.ceil(NQ_FLAGS.length / CH), f = [];
  for (let i = 0; i < n; i++) f.push(Math.max(0, Math.floor(Number(Array.isArray(d.f) ? d.f[i] : 0) || 0)) & 0xffffff);
  const dd = {};
  if (d.d && typeof d.d === 'object') for (const k of DIAL_KEYS) { const v = Number(d.d[k]); if (Number.isFinite(v) && v >= 0 && v <= 99) dd[k] = Math.round(v); }
  const t = Math.max(0, Math.min(3, Math.floor(Number(d.t) || 0)));
  if (!f.some(Boolean) && !Object.keys(dd).length && !t) return null;
  return { f, d: dd, t };
}
// 테스트 서버 전용 「퍼즐 건너뛰기」(도구 창 토글, h.trn.skip) — 실제 게임에서는 g.test 가 아니라 늘 꺼져 있다
// 테스트 서버 전용 발테른 시험 조정(11월 22일 사용자 — 실제 게임에는 넣지 않는다): 미끼 그림자 대기 12 → 8초, 적이 오는 간격 ×1.25(4 → 5초)
const nqTest = (g) => !!(g && g.test);
const NQ_TEST_TUNE = { cd: { decoy: 8 }, gapMul: 1.25 };
const nqSkip = (g, h) => !!(g && g.test && h.trn && h.trn.skip);
const nu = (h) => h.bag.nu || (h.bag.nu = { f: [0, 0, 0, 0], d: {}, t: 0 });
export function nqHas(h, name) {
  const i = FI[name];
  if (i == null || !h || !h.bag || !h.bag.nu) return false;
  return !!(((h.bag.nu.f || [])[Math.floor(i / CH)] || 0) & (1 << (i % CH)));
}
function setFlag(h, name) {
  const i = FI[name];
  if (i == null || nqHas(h, name)) return false;
  const u = nu(h), c = Math.floor(i / CH);
  while (u.f.length <= c) u.f.push(0);
  u.f[c] |= 1 << (i % CH);
  return true;
}
const save = (h) => { h.bag.v = (h.bag.v || 0) + 1; };
const setAll = (h, names) => { let any = false; for (const n of [].concat(names || [])) if (n && setFlag(h, n)) any = true; if (any) save(h); return any; };
export const nqDial = (h, key) => { const d = h && h.bag && h.bag.nu && h.bag.nu.d; const v = d ? d[key] : undefined; return v == null ? (key === 'dir' ? NQ_RITUAL.startDir : 0) : v; };
export const nqTorchLit = (h, i) => !(nqDial(h, 'tq') & (1 << i));
export const nqSealCount = (h) => NQ_SEALS.filter((n) => nqHas(h, n)).length;

// 조건 — 깃발 이름 배열('!이름' 은 없어야) 또는 함수(u, has)
export function nqCond(h, c) {
  if (!c) return true;
  const has = (n) => nqHas(h, n);
  if (typeof c === 'function') return !!c(h.bag && h.bag.nu, has);
  return c.every((n) => (n[0] === '!' ? !has(n.slice(1)) : has(n)));
}
// 잠김 대사 — 배열 또는 함수(u, has)
export const nqLock = (h, a) => (typeof a.lock === 'function' ? a.lock(h.bag && h.bag.nu, (n) => nqHas(h, n)) : a.lock || []);
const owns = (h) => necroOn(h);
export const nqOn = () => !!NC.live;

/* ── 조사 자리 ───────────────────────────── */
const dist = (h, at) => Math.hypot(h.x - at[0], (h.y - at[1]) / SQ);
export function nqSpotShown(h, s) {
  if (!nqOn() || !h || !h.bag || h.map !== s.map) return false;
  if (s.act.k === 'mimic' && nqHas(h, s.act.seal) && s.look) return true;
  return nqCond(h, s.show);
}
export function nqSpotNear(h) {
  if (!h || !h.bag || h.down > 0 || !nqOn()) return null;
  if (!nqSpotMap(h.map)) return null;
  let best = null, bd = 1e9;
  for (const s of NQ_SPOTS) {
    if (s.map !== h.map) continue;
    const d = dist(h, s.at);
    if (d <= s.r && d < bd && nqSpotShown(h, s)) { best = s; bd = d; }
  }
  return best;
}
// 이 장군 자리에서 지금 할 차례(steps 중 아직 세우지 않은 첫 것) — 화면 창도 같은 함수
export function nqGenStep(h, a) {
  if (!a.steps) return null;
  for (const st of a.steps) if (!nqHas(h, st.flag)) return { ...st, quiz: st.quiz || (st.flag === 'quiz' && !!a.quiz) };
  return null;
}
const genDone = (h, a) => a.steps.every((st) => nqHas(h, st.flag)) && (!a.reward || a.reward.every((n) => nqHas(h, n)));
// 말풍선 한 줄 — [글, 단추]
export function nqSpotLine(h, s) {
  const a = s.act, k = a.k;
  if (k === 'gate') return [s.name, nqCond(h, a.need) ? '들어가기' : '살펴보기'];
  if (k === 'torch') return [`철 횃불 — ${nqTorchLit(h, a.i) ? '불이 타오른다' : '꺼져 있다'}`, nqTorchLit(h, a.i) ? '불 끄기' : '불 붙이기'];
  if (k === 'trialGen') return [s.name, a.gen ? '이야기하기' : '살펴보기'];
  if (k === 'throne') return [s.name, '다가가기'];
  return [s.name, '살펴보기'];
}

/* ── 결과 — 화면 창이 읽는다(영웅 줄 61 의 0~2 칸) ── 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 힌트 · 6 이미 함 */
const run = (h) => h.nqRun || (h.nqRun = { seq: {}, mim: null, tr: null, R: [-1, 0, 0], hz: 0, ask: null, still: 0, sx: 0, sy: 0 });
function res(h, s, code) { const r = run(h); r.R = [s ? nqSpotIndex(s.id) : -1, code, (r.R[2] + 1) % 1000]; }
const tell = (E, g, h, text, color) => (color ? E.say(g, h.map, h.x, h.y - 100, text, color) : E.sys(g, h.pi, text));
const call = (E, g, h, text, life = 1.4, snd = 'eqBeep') => E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text, color: VIO, t: life, life, snd, who: h.pi });

/* ── 입력 ───────────────────────────────── */
export function nqInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!nqOn() || !h || !h.loaded || !h.bag || h.down > 0 || !req || typeof req !== 'object') return;
  if (req.op === 'skill') return void trialSkill(E, g, h, req.s);
  if (req.op === 'cmd') return void trialCmd(E, g, h, req.c);
  if (req.op === 'glyph') return void trialGlyph(E, g, h, req.v);
  if (req.op === 'contract') return void contract(E, g, h, !!req.yes);
  if (req.op !== 'act') return;
  const s = nqSpotById(req.id);
  if (!s || s.map !== h.map || !nqSpotShown(h, s) || dist(h, s.at) > s.r * 1.6) return;
  act(E, g, h, s, req.v);
}

function act(E, g, h, s, v) {
  const a = s.act, k = a.k;
  if (k !== 'trialGen' && k !== 'throne' && k !== 'gate' && a.need && !nqCond(h, a.need)) return void res(h, s, 3);
  const done = a.set && nqHas(h, a.set);
  if (k === 'talk' || k === 'clock') { if (a.set) setAll(h, a.set); return void res(h, s, 1); }
  if (k === 'ask') {
    const o = Number.isInteger(v) && a.opts[v];
    if (!o) return;
    if (o.set) setAll(h, o.set);
    return void res(h, s, 1);
  }
  if (k === 'take' || k === 'record') {
    if (done) return void res(h, s, 6);
    setAll(h, a.set); sealFx(E, g, h, a.set);
    if (k === 'take') E.fx(g, h.map, { kind: 'sk_eq_snd', x: h.x, y: h.y, t: 0.1, life: 0.1, snd: 'eqClank', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'gate') {
    if (!nqCond(h, a.need)) return void res(h, s, 3);
    if (v !== 1) return void res(h, s, 4);                      // 첫 말(first)을 보여 준 뒤 「들어가기」로 다시 보낸다
    if (a.firstSet) setAll(h, a.firstSet);
    if (inTrial(h)) endTrial(h);
    E.goMap(g, h, a.to, a.back);
    return void res(h, s, 1);
  }
  if (k === 'torch') {
    const u = nu(h); u.d.tq = (nqDial(h, 'tq') ^ (1 << a.i)) & 7; save(h);
    run(h).still = 0;
    E.fx(g, h.map, { kind: 'sk_eq_snd', x: h.x, y: h.y, t: 0.1, life: 0.1, snd: 'eqClank', who: h.pi });
    return void res(h, s, 1);
  }
  if (k === 'dial') {
    if (!a.opts.includes(v)) return;
    nu(h).d[a.key] = v; save(h);
    run(h).still = 0;
    return void res(h, s, 1);
  }
  if (k === 'gauge') return void res(h, s, 1);
  if (k === 'seq') return void seq(E, g, h, s);
  if (k === 'pick') {
    if (done) return void res(h, s, 6);
    if (v !== a.ans) return void res(h, s, 2);
    setAll(h, a.set); return void res(h, s, 1);
  }
  if (k === 'dials') {
    if (done) return void res(h, s, 6);
    if (!Array.isArray(v) || v.length !== a.items.length) return;
    if (!a.items.every((it, i) => v[i] === it.ans)) return void res(h, s, 2);
    setAll(h, a.set); call(E, g, h, '장치가 맞물렸다', 1.2, 'eqClank');
    return void res(h, s, 1);
  }
  if (k === 'order') {
    if (done) return void res(h, s, 6);
    if (!orderOk(a, v)) return void res(h, s, 2);
    setAll(h, a.set); sealFx(E, g, h, a.set);
    return void res(h, s, 1);
  }
  if (k === 'mimic') return void mimic(E, g, h, s, v);
  if (k === 'trialGen') return void gen(E, g, h, s, v);
  if (k === 'throne') {
    if (!nqCond(h, a.need)) return void res(h, s, 3);
    if (hiddenTaken(g, h, NECRO_ID) && !owns(h)) { tell(E, g, h, '왕좌 위의 그림자가 고개를 젓는다. 「군단은 이미 새로운 주인을 섬기고 있다.」'); return void res(h, s, 3); }
    return void res(h, s, 1);
  }
}
// 차례 맞추기 — pickN 이면 그만큼만 골라 차례대로, 아니면 모두
function orderOk(a, v) {
  const n = a.pickN || a.ans.length;
  if (!Array.isArray(v) || v.length !== n || new Set(v).size !== n || !v.every((i) => Number.isInteger(i) && i >= 0 && i < a.items.length)) return false;
  return v.every((x, i) => x === a.ans[i]);
}
function sealFx(E, g, h, flag) {
  if (flag === 'seal0') return void call(E, g, h, NQ_FIRST_SEAL, 2.4, 'lvup');
  const i = NQ_SEALS.indexOf(flag);
  if (i >= 0) call(E, g, h, `${NQ_SEAL_NAMES[i]} — ${nqSealCount(h)}/7`, 2, 'lvup');
}

// 차례 누르기(수문) — 무리 g 의 i 번째를 눌러야 다음으로. 틀리면 처음부터. gauge 면 압력계 안전 구간에만
export const nqGaugeSafe = (t) => { const p = ((t % NQ_GAUGE.period) + NQ_GAUGE.period) % NQ_GAUGE.period; return p >= NQ_GAUGE.safe[0] && p < NQ_GAUGE.safe[1]; };
export const nqGaugeOf = (t) => ((t % NQ_GAUGE.period) + NQ_GAUGE.period) % NQ_GAUGE.period;
function seq(E, g, h, s) {
  const a = s.act;
  if (nqHas(h, a.set)) return void res(h, s, 6);
  const r = run(h), q = r.seq[a.g] || (r.seq[a.g] = []);
  if (a.gauge && !nqGaugeSafe(nqClock(g))) { r.seq[a.g] = []; tell(E, g, h, '압력이 너무 높다. 물이 역류해 수문이 모두 닫혔다.', WARN); return void res(h, s, 2); }
  if (q.includes(a.i)) return void res(h, s, 4);
  if (a.i !== q.length) { r.seq[a.g] = []; return void res(h, s, 2); }
  q.push(a.i);
  if (q.length < a.n) { E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 110, text: `${q.length}/${a.n}`, color: VIO, t: 0.8, life: 0.8, snd: 'eqBeep', who: h.pi }); return void res(h, s, 4); }
  r.seq[a.g] = [];
  setAll(h, a.set);
  call(E, g, h, '물이 빠졌다', 1.2, 'eqClank');
  res(h, s, 1);
}
export const nqSeqOf = (h, g0) => (h && h.nqRun && h.nqRun.seq[g0]) || [];

/* ── 장군 자리 — 차례(steps)대로 문답 · 차례 맞추기 · 장치 확인 · 시험. 다 끝나면 보상 깃발 ── */
function gen(E, g, h, s, v) {
  const a = s.act;
  if (genDone(h, a)) return void res(h, s, 6);
  const st = nqGenStep(h, a);
  if (!st) { finishGen(E, g, h, s); return void res(h, s, 1); }
  if (a.need && !nqCond(h, a.need)) return void res(h, s, 3);
  const sk = nqSkip(g, h);
  if (st.quiz) {
    if (!sk) {
      if (v == null) return void res(h, s, 4);
      const items = a.quiz.items;
      if (!Array.isArray(v) || v.length !== items.length) return;
      if (!items.every((it, i) => v[i] === it.ans)) return void res(h, s, 2);
    }
    setAll(h, st.flag);
  } else if (st.order) {
    if (!sk) {
      if (v == null) return void res(h, s, 4);
      if (!Array.isArray(v) || v.length !== a.order.ans.length || !v.every((x, i) => x === a.order.ans[i])) return void res(h, s, 2);
    }
    setAll(h, st.flag);
  } else if (st.check) {
    const d = nu(h).d;
    if (!sk && !Object.entries(a.check.keys).every(([key, want]) => (d[key] || 0) === want)) return void res(h, s, 2);
    setAll(h, st.flag);
  } else if (st.trial) {
    if (v !== 'start') return void res(h, s, 4);
    return void trialStart(E, g, h, s, st.trial);
  } else return void res(h, s, 3);                              // 앞 단계(퍼즐)를 먼저 풀어야 한다
  if (!nqGenStep(h, a)) finishGen(E, g, h, s);
  res(h, s, 1);
}
function finishGen(E, g, h, s) {
  const a = s.act;
  if (a.reward && a.reward.length) {
    const seal = a.reward.find((n) => NQ_SEALS.includes(n));
    setAll(h, a.reward);
    if (seal) sealFx(E, g, h, seal);
  }
}

/* ── 미믹 — 깨어나면 내 자리에 예고 원 → 물리면 밀려난다(피해 없음) ── */
function mimic(E, g, h, s, v) {
  const a = s.act;
  if (nqHas(h, a.seal)) return void res(h, s, 6);
  if (v === 0) {
    run(h).mim = { mid: a.mid, sid: s.id, t: 0, next: 0.6, warn: null };
    E.fx(g, h.map, { kind: 'call', x: s.at[0], y: s.at[1] - 120, text: '미믹이다!', color: RED, t: 1.2, life: 1.2, snd: 'eqClank', who: h.pi });
    return void res(h, s, 2);
  }
  if (v === 2) { if (a.pokeSeal) setAll(h, a.seal); return void res(h, s, a.pokeSeal ? 1 : 5); }
  res(h, s, 4);
}
function tickMimic(E, g, h, dt) {
  const r = h.nqRun, m = r && r.mim;
  if (!m) return;
  const s = nqSpotById(m.sid);
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

/* ── 위험 장치 — 관측소 빛 띠(피해 없음, 걸리면 입구로). 박자는 벽시계(서버 · 화면이 같이 센다) ── */
export const nqClock = (g) => (g && g.eqClock ? g.eqClock() : Date.now() / 1000);
// 띠 하나의 지금 상태 — { on: 쓰는 중, warn: 곧 } (화면도 같은 함수)
export function nqLaneState(z, lane, t) {
  const p = (((t - lane.off) % z.period) + z.period) % z.period;
  return { on: p < z.on, warn: p >= z.period - z.warn };
}
function tickHazards(E, g, h, dt) {
  const r = run(h);
  if (r.hz > 0) { r.hz -= dt; return; }
  const t = nqClock(g);
  for (const z of NQ_HAZARDS) {
    if (z.map !== h.map || (z.off && nqCond(h, z.off))) continue;
    for (const lane of z.lanes) {
      if (h.y < lane.y0 || h.y >= lane.y1 || !nqLaneState(z, lane, t).on) continue;
      E.place(g, h, z.back[0], z.back[1]);
      r.hz = 1.2;
      return void tell(E, g, h, z.msg, WARN);
    }
  }
}
// 빛 띠를 지나 관측소 안쪽(에레보스 앞)까지 오면 다음부터 띠가 꺼진다(정한 해석 — 한 번 건넌 길)
function tickLightPass(h) {
  if (h.map !== 'necro_observatory' || nqHas(h, 'lightOk')) return;
  const z = NQ_HAZARDS[0], top = Math.min(...z.lanes.map((l) => l.y0));
  if (h.y < top - 10) setAll(h, 'lightOk');
}

/* ── 1장 의식 — 묘비를 고향(북)으로 · 횃불 셋을 모두 끔 · 묘비 곁에서 가만히 8초 → 계단이 열린다 ── */
function tickRitual(E, g, h, dt) {
  if (h.map !== 'necro_nameless_graves' || nqHas(h, 'steps')) return;
  const r = run(h), grave = nqSpotById('g-grave');
  const moved = Math.hypot(h.x - r.sx, h.y - r.sy) > 2 || h.swing > 0;
  r.sx = h.x; r.sy = h.y;
  const ok = dist(h, grave.at) <= NQ_RITUAL.near && nqDial(h, 'dir') === NQ_RITUAL.dir && nqDial(h, 'tq') === (1 << NQ_RITUAL.torches) - 1;
  if (!ok || moved) { r.still = 0; return; }
  if ((r.still += dt) < NQ_RITUAL.still) return;
  r.still = 0;
  setAll(h, 'steps');
  E.fx(g, h.map, { kind: 'call', x: grave.at[0], y: grave.at[1] - 150, text: '돌이 갈리는 소리', color: VIO, t: 2, life: 2, snd: 'eqClank', who: h.pi });
  tell(E, g, h, '어둠 속에서 묘비가 낮게 울린다. 무덤 옆 석판이 내려앉으며 아래로 내려가는 계단이 드러났다.');
}

/* ── 시험 ─────────────────────────────────── */
export const inTrial = (h) => !!(h && h.nqRun && h.nqRun.tr);
export const nqInTrial = inTrial;
const TI = (id) => NQ_TRIALS[id];
const tdist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / SQ);
const pt = (p) => ({ x: p[0], y: p[1] });
const top = (map) => (MAP_OF[map] ? MAP_OF[map].top : 0);
const clampXY = (map, o) => { o.x = Math.max(60, Math.min(NQ_MAP_W - 60, o.x)); o.y = Math.max(top(map) + 20, Math.min(NQ_MAP_H - 40, o.y)); };
function step(o, tx, ty, spd, dt) {
  const dx = tx - o.x, dy = (ty - o.y) / SQ, L = Math.hypot(dx, dy);
  if (L < 1) return 0;
  const m = Math.min(L, spd * dt);
  o.x += (dx / L) * m; o.y += (dy / L) * m * SQ; o.ax = dx < 0 ? -1 : 1;
  return L;
}
function endTrial(h) { if (h.nqRun) h.nqRun.tr = null; }

function newTrial(id, sid, h) {
  const T = TI(id);
  const tr = { id, sid, t: 0, hp: TS.hp, ph: 0, cd: { strike: 0, shield: 0, dash: 0, decoy: 0, call: 0 }, msh: 0, al: [], fo: [], wn: [], i: 0, n: 1.5, kill: 0,
    alt: 0, altSh: 0, trail: [], decoy: null, gl: 0, glT: 0, steal: 0, spawned: 0, warnT: T.warn ? T.warn.gap : 0 };
  if (id === 'guard' || id === 'shield') tr.al = T.allies.map((p) => ({ x: p[0], y: p[1], hp: AL.hp, sh: 0, mode: 'hold', cd: 0 }));
  if (id === 'escort') tr.al = T.allies.map((p) => ({ x: p[0], y: p[1], hp: AL.hp, sh: 0, mode: 'escort', cd: 0 }));
  if (id === 'seal') tr.fo = [foe('chaser', T.chaser[0], T.chaser[1])];
  if (id === 'drill') spawnPosts(tr, 0);
  if (id === 'palace') {
    tr.ph = Math.max(1, (h.bag.nu && h.bag.nu.t) || 1);
    palacePhase(tr);
  }
  return tr;
}
function palacePhase(tr) {
  const P = TI('palace');
  tr.t = 0; tr.fo = []; tr.wn = []; tr.kill = 0; tr.spawned = 0; tr.gl = 0; tr.glT = 0; tr.n = 2; tr.al = [];
  if (tr.ph === 1) { tr.alt = P.altar.hp; tr.altSh = 0; }
  if (tr.ph === 3) {
    for (const p of P.p3.pylons) tr.fo.push(foe('pylon', p[0], p[1]));
    tr.fo.push(foe('lord', P.p3.lord[0], P.p3.lord[1]));
    tr.warnT = P.p3.warn.gap; tr.steal = P.p3.steal[1];
  }
}
const foe = (k, x, y) => ({ k, x, y, hp: FO[k].hp, max: FO[k].hp, cd: FO[k].gap, ax: 1 });
function spawnPosts(tr, i) { tr.i = i; tr.fo = TI('drill').stages[i].posts.map((p) => foe('post', p[0], p[1])); }
function edgePoint(map) {
  const side = Math.floor(Math.random() * 3), t0 = top(map) + 40;
  if (side === 0) return [120 + Math.random() * (NQ_MAP_W - 240), t0];
  return [side === 1 ? 90 : NQ_MAP_W - 90, t0 + Math.random() * (NQ_MAP_H - t0 - 120)];
}
function spawnWave(tr, map, W) {
  const n = W.n[0] + Math.floor(Math.random() * (W.n[1] - W.n[0] + 1));
  for (let i = 0; i < n; i++) { const [x, y] = edgePoint(map); tr.fo.push(foe(W.kinds[Math.floor(Math.random() * W.kinds.length)], x, y)); }
  return n;
}

function trialStart(E, g, h, s, id) {
  const T = TI(id);
  if (!T || h.map !== T.map) return void res(h, s, 3);
  if (inTrial(h)) return void res(h, s, 6);
  if (id === 'palace' && hiddenTaken(g, h, NECRO_ID) && !owns(h)) { tell(E, g, h, '제단의 수정이 꺼진 채 울리지 않는다. 군단은 이미 새로운 주인을 섬기고 있다.'); return void res(h, s, 3); }
  const r = run(h);
  r.tr = newTrial(id, s.id, h);
  E.place(g, h, T.start[0], T.start[1]);
  tell(E, g, h, `${T.name} — 시험 체력 ${TS.hp}. 레벨 · 장비 · 직업은 시험에 영향을 주지 않는다.`);
  res(h, s, 1);
}
function fail(E, g, h, why) {
  const tr = h.nqRun.tr, T = TI(tr.id);
  const fresh = newTrial(tr.id, tr.sid, h);
  h.nqRun.tr = fresh;
  E.place(g, h, T.start[0], T.start[1]);
  tell(E, g, h, `${why} ${T.name}${tr.id === 'palace' ? ` ${fresh.ph}단계` : ''}을(를) 처음부터 다시 한다.`, RED);
}
function win(E, g, h) {
  const tr = h.nqRun.tr, s = nqSpotById(tr.sid);
  h.nqRun.tr = null;
  if (tr.id === 'palace') { nu(h).t = 0; save(h); }
  const st = s && nqGenStep(h, s.act);
  if (st && st.trial === tr.id) setAll(h, st.flag);
  call(E, g, h, `${TI(tr.id).name} 통과`, 2, 'lvup');
  if (s && !nqGenStep(h, s.act)) finishGen(E, g, h, s);
  res(h, s, 1);
}
// 시험 체력 — 보호막이 있으면 한 번 막는다
function hurt(E, g, h, tr, n) {
  if (tr.msh) { tr.msh = 0; return void E.say(g, h.map, h.x, h.y - 90, '보호막이 막았다', VIO); }
  tr.hp -= n;
  E.say(g, h.map, h.x, h.y - 90, `시험 체력 ${Math.max(0, tr.hp)}`, RED);
}

/* 시험 기술 — strike · shield · dash · decoy */
function trialSkill(E, g, h, k) {
  const tr = h.nqRun && h.nqRun.tr;
  if (!tr || !SK[k] || !TI(tr.id).skills.includes(k) || tr.cd[k] > 0) return;
  const T = TI(tr.id);
  tr.cd[k] = nqTest(g) && tr.id === 'shield' && NQ_TEST_TUNE.cd[k] != null ? NQ_TEST_TUNE.cd[k] : SK[k].cd;
  if (k === 'strike') {
    E.fx(g, h.map, { kind: 'sk_eq_wave', x: h.x, y: h.y, r: SK.strike.r, t: 0.3, life: 0.3, snd: 'eqClank' });
    if (tr.id === 'seal') return void sealStrike(E, g, h, tr, T);
    const lordShielded = tr.fo.some((f) => f.k === 'pylon');
    for (const f of tr.fo) {
      if (tdist(f, h) > SK.strike.r + FO[f.k].rad || f.k === 'chaser') continue;
      if (f.k === 'post') { E.say(g, h.map, f.x, f.y - 80, '말뚝은 그림자만 쓰러뜨릴 수 있다', WARN); continue; }
      if (f.k === 'lord' && (lordShielded || tr.gl)) { E.say(g, h.map, f.x, f.y - 120, lordShielded ? '보호막 — 기둥을 먼저 부숴라' : '잔영이 문양을 기다린다', VIO); continue; }
      f.hp -= SK.strike.dmg;
    }
    return void sweep(E, g, h, tr);
  }
  if (k === 'shield') {
    tr.msh = 1;
    for (const a of tr.al) if (tdist(a, h) <= SK.shield.r) a.sh = 1;
    if (tr.id === 'palace' && tr.ph === 1 && tdist(pt(T.altar.at), h) <= SK.shield.r + T.altar.r) tr.altSh = 1;
    return void E.fx(g, h.map, { kind: 'ring', x: h.x, y: h.y - 10, r: SK.shield.r, color: VIO, t: 0.5, life: 0.5 });
  }
  if (k === 'dash') {
    const [ax, ay] = E.face ? E.face(h) : [h.dir || 1, 0];
    const blocks = NQ_BLOCKS[h.map] || [];
    let x = h.x, y = h.y;
    for (let d = 20; d <= SK.dash.len; d += 20) {
      const nx = h.x + ax * d, ny = h.y + ay * d * SQ;
      if (blocks.some((b) => Math.hypot(nx - b.x, (ny - b.y) / SQ) < b.r)) break;
      x = nx; y = ny;
    }
    E.place(g, h, x, y);
    return void E.fx(g, h.map, { kind: 'ring', x: h.x, y: h.y - 10, r: 40, color: VIO, t: 0.3, life: 0.3 });
  }
  if (k === 'decoy') {
    tr.decoy = { x: h.x, y: h.y, t: SK.decoy.dur };
    E.fx(g, h.map, { kind: 'ring', x: h.x, y: h.y - 10, r: 60, color: VIO, t: 0.4, life: 0.4 });
  }
}
// 쓰러진 적 치우기 · 셈
function sweep(E, g, h, tr) {
  const left = [];
  for (const f of tr.fo) {
    if (f.hp > 0) { left.push(f); continue; }
    if (f.k === 'hound' || f.k === 'knight') tr.kill++;
    E.fx(g, h.map, { kind: 'sk_eq_boom', x: Math.round(f.x), y: Math.round(f.y), r: FO[f.k].rad + 30, t: 0.4, life: 0.4 });
  }
  tr.fo = left;
}
function sealStrike(E, g, h, tr, T) {
  if (tdist(pt(T.morken), h) <= SK.strike.r + 60) { tr.i = 0; tr.sk = []; return void tell(E, g, h, '모르켄|나를 베려 하지 마라. 쇠사슬이 다시 조인다.', RED); }
  const j = T.stones.findIndex((p) => tdist(pt(p), h) <= T.stoneR);
  if (nqSkip(g, h)) {                                            // 테스트 서버 퍼즐 건너뛰기 — 차례 상관없이 아직 안 친 돌만 세고 쫓기는 부분은 그대로
    tr.sk = tr.sk || [];
    if (j < 0 || tr.sk.includes(j)) return;
    tr.sk.push(j); tr.i = tr.sk.length;
    return void E.fx(g, h.map, { kind: 'call', x: T.stones[j][0], y: T.stones[j][1] - 110, text: `봉인 ${tr.i}/${T.stones.length}`, color: VIO, t: 1, life: 1, snd: 'eqBeep', who: h.pi });
  }
  if (j < 0 || j < tr.i) return;
  if (j !== tr.i) { tr.i = 0; return void tell(E, g, h, '봉인석이 거꾸로 빛나며 쇠사슬이 다시 조여든다. 벽화의 차례를 떠올리자.', RED); }
  tr.i++;
  E.fx(g, h.map, { kind: 'call', x: T.stones[j][0], y: T.stones[j][1] - 110, text: `봉인 ${tr.i}/${T.stones.length}`, color: VIO, t: 1, life: 1, snd: 'eqBeep', who: h.pi });
}

/* 그림자 명령 — 연습장(drill) · 왕궁(palace)에서만. 소집 · 집결 · 방어 · 공격 · 귀환 */
export const nqCap = (tr) => (tr.id === 'drill' ? TI('drill').stages[Math.min(tr.i, 2)].cap : tr.id === 'palace' ? TI('palace')[`p${tr.ph}`].cap : 0);
function trialCmd(E, g, h, c) {
  const tr = h.nqRun && h.nqRun.tr;
  if (!tr || !TI(tr.id).cmd || !NQ_CMDS.includes(c)) return;
  if (c === 'call') {
    if (tr.cd.call > 0) return;
    tr.cd.call = SK.call.cd;
    const cap = nqCap(tr);
    for (let i = tr.al.length; i < cap; i++) {
      const a = (i / Math.max(1, cap)) * Math.PI * 2;
      tr.al.push({ x: h.x + Math.cos(a) * 70, y: h.y + Math.sin(a) * 50, hp: AL.hp, sh: 0, mode: 'follow', cd: 0 });
    }
    return void E.fx(g, h.map, { kind: 'ring', x: h.x, y: h.y - 10, r: 120, color: VIO, t: 0.5, life: 0.5, snd: 'eqBeep' });
  }
  if (c === 'recall') { tr.al = []; return; }
  const mode = { gather: 'follow', guard: 'guard', attack: 'attack' }[c];
  for (const a of tr.al) a.mode = mode;
  E.say(g, h.map, h.x, h.y - 110, SK[c].name, VIO);
}
// 왕궁 3단계 마지막 — 일곱 문양을 장군과 맞춘다
function trialGlyph(E, g, h, v) {
  const tr = h.nqRun && h.nqRun.tr;
  if (!tr || tr.id !== 'palace' || !tr.gl) return;
  const G = TI('palace').glyphs;
  if (!Array.isArray(v) || v.length !== G.ans.length) return;
  if (G.ans.every((x, i) => v[i] === x)) return void win(E, g, h);
  const lord = tr.fo.find((f) => f.k === 'lord');
  tr.gl = 0; if (lord) lord.hp = Math.round(lord.max * 0.4);
  tell(E, g, h, '문양이 어긋나자 잔영이 힘을 되찾는다.', RED);
}

function tickTrial(E, g, h, dt) {
  const r = h.nqRun, tr = r && r.tr;
  if (!tr) return;
  const T = TI(tr.id);
  if (h.map !== T.map || h.down > 0) return void endTrial(h);
  tr.t += dt;
  for (const k in tr.cd) tr.cd[k] = Math.max(0, tr.cd[k] - dt);
  if (tr.decoy && (tr.decoy.t -= dt) <= 0) tr.decoy = null;
  tickWarns(E, g, h, tr, T, dt);
  if (!h.nqRun.tr) return;
  if (tr.hp <= 0) return void fail(E, g, h, '시험 체력이 다했다.');
  ({ path: tickPath, guard: tickGuard, shield: tickGuard, escort: tickEscort, echo: tickEcho, seal: tickSeal, drill: tickDrill, palace: tickPalace })[tr.id](E, g, h, tr, T, dt);
}
// 예고 공격 — 내 자리에 원 → d 초 뒤 터진다. 호위 시험은 무너지는 다리(나 · 병사)
function tickWarns(E, g, h, tr, T, dt) {
  const W = tr.id === 'palace' ? (tr.ph === 3 && !tr.gl ? T.p3.warn : null) : T.warn || T.fall;
  for (const w of tr.wn) w.t += dt;
  const boom = tr.wn.filter((w) => w.t >= w.d);
  tr.wn = tr.wn.filter((w) => w.t < w.d);
  for (const w of boom) {
    E.fx(g, h.map, { kind: 'sk_eq_wave', x: w.x, y: w.y, r: w.r, t: 0.4, life: 0.4, snd: 'eqClank' });
    if (tr.id === 'escort') {
      if (tdist(w, h) <= w.r || tr.al.some((a) => tdist(w, a) <= w.r)) return void fail(E, g, h, '발밑의 다리가 무너졌다.');
      continue;
    }
    if (tdist(w, h) <= w.r) hurt(E, g, h, tr, TS.hit);
  }
  if (!W || (tr.warnT -= dt) > 0) return;
  tr.warnT = W.gap;
  const at = tr.id === 'escort' && tr.al.length && Math.random() < 0.5 ? tr.al[Math.floor(Math.random() * tr.al.length)] : h;
  const w = { x: Math.round(at.x), y: Math.round(at.y), r: W.r, d: W.d, t: 0 };
  tr.wn.push(w);
  E.fx(g, h.map, { kind: 'sk_eq_warn', x: w.x, y: w.y, r: w.r, d: w.d, pi: h.pi, t: w.d, life: w.d });
}
function tickPath(E, g, h, tr, T) {
  const p = T.pads[tr.i];
  if (!p || tdist(pt(p), h) > 70) return;
  tr.i++;
  E.fx(g, h.map, { kind: 'call', x: p[0], y: p[1] - 100, text: `${tr.i}/${T.pads.length}`, color: VIO, t: 0.8, life: 0.8, snd: 'eqBeep', who: h.pi });
  if (tr.i >= T.pads.length) win(E, g, h);
}
// 적 한 마리 — 노리는 것 쪽으로 걷고 닿으면 친다(보호막은 한 번 막는다)
function tickFoe(E, g, h, tr, f, targets, dt) {
  const F = FO[f.k];
  f.cd = Math.max(0, f.cd - dt);
  if (!F.spd || !targets.length) return;
  let best = null, bd = 1e9;
  for (const o of targets) { const d = tdist(f, o); if (d < bd) { bd = d; best = o; } }
  if (bd > F.rad + (best.rad || 24) + 8) { step(f, best.x, best.y, F.spd, dt); clampXY(h.map, f); return; }
  if (f.cd > 0 || !F.dmg) return;
  f.cd = F.gap;
  E.fx(g, h.map, { kind: 'sk_eq_bite', x: Math.round(best.x), y: Math.round(best.y), r: 30, t: 0.25, life: 0.25 });
  if (best.decoy) return;
  if (best.altar) { if (tr.altSh) tr.altSh = 0; else tr.alt -= F.dmg * 5; return; }
  if (best === h) return void hurt(E, g, h, tr, F.dmg * 10);
  if (best.sh) { best.sh = 0; return; }
  best.hp -= F.dmg;
}
const decoyT = (tr, f) => (tr.decoy && tdist(tr.decoy, f) <= SK.decoy.r ? [{ x: tr.decoy.x, y: tr.decoy.y, decoy: 1, rad: 20 }] : null);
// 병사 — 명령에 따라 따르기 · 둘레 지키기 · 공격(가까운 적을 친다)
function tickAllies(E, g, h, tr, dt) {
  tr.al = tr.al.filter((a) => a.hp > 0);
  tr.al.forEach((a, i) => {
    a.cd = Math.max(0, a.cd - dt);
    if (a.mode === 'hold' || a.mode === 'escort') return;
    const foes = tr.fo.filter((f) => f.k !== 'chaser' && !(f.k === 'lord' && (tr.fo.some((q) => q.k === 'pylon') || tr.gl)));
    let tgt = null, bd = 1e9;
    for (const f of foes) { const d = tdist(a, f); if (d < bd) { bd = d; tgt = f; } }
    const reach = AL.reach + (tgt ? FO[tgt.k].rad : 0);
    const free = a.mode === 'attack' || (tgt && bd <= (a.mode === 'guard' ? 200 : 140));
    if (tgt && free) {
      if (bd > reach) step(a, tgt.x, tgt.y, AL.spd, dt);
      else if (a.cd <= 0) { a.cd = AL.gap; tgt.hp -= AL.dmg; }
      return;
    }
    const ang = (i / Math.max(1, tr.al.length)) * Math.PI * 2, rr = a.mode === 'guard' ? 110 : 70;
    if (tdist(a, h) > rr + 30) step(a, h.x + Math.cos(ang) * rr, h.y + Math.sin(ang) * rr * SQ, AL.spd, dt);
  });
  sweep(E, g, h, tr);
}
function tickGuard(E, g, h, tr, T, dt) {
  if ((tr.n -= dt) <= 0) { tr.n = T.waves.gap * (nqTest(g) && tr.id === 'shield' ? NQ_TEST_TUNE.gapMul : 1); spawnWave(tr, h.map, T.waves); }
  const alive = tr.al.filter((a) => a.hp > 0);
  for (const f of tr.fo) tickFoe(E, g, h, tr, f, decoyT(tr, f) || alive, dt);
  const before = tr.al.length;
  tr.al = tr.al.filter((a) => a.hp > 0);
  if (tr.al.length < before) tell(E, g, h, `병사가 쓰러졌다 — 남은 병사 ${tr.al.length}`, RED);
  if (tr.al.length < T.need) return void fail(E, g, h, '지켜야 할 병사가 너무 많이 쓰러졌다.');
  if (tr.t >= T.dur) win(E, g, h);
}
function tickEscort(E, g, h, tr, T, dt) {
  const tp = tr.trail;
  if (!tp.length || Math.hypot(h.x - tp[tp.length - 1][0], h.y - tp[tp.length - 1][1]) > 18) tp.push([h.x, h.y]);
  if (tp.length > 60) tp.shift();
  tr.al.forEach((a, i) => {
    const q = tp[Math.max(0, tp.length - 1 - (i + 1) * 4)];
    if (q && Math.hypot(a.x - q[0], a.y - q[1]) > 8) step(a, q[0], q[1], AL.spd, dt);
  });
  const far = tr.al.some((a) => tdist(a, h) > T.leash);
  if (far && !tr.lost) { tr.lost = 1; tell(E, g, h, '병사들이 뒤처졌다. 너무 앞서 가지 마라.', WARN); }
  if (!far) tr.lost = 0;
  const goal = pt(T.goal.at);
  if (tdist(h, goal) <= T.goal.r && tr.al.every((a) => tdist(a, goal) <= T.goal.r + 40)) win(E, g, h);
}
// 잔상 — 3초 전의 나(trail)와 지금의 나
export function nqGhost(tr, delay) {
  const want = tr.t - delay;
  if (want < 0) return null;
  for (let i = tr.trail.length - 1; i >= 0; i--) if (tr.trail[i][0] <= want) return { x: tr.trail[i][1], y: tr.trail[i][2] };
  return null;
}
function tickEcho(E, g, h, tr, T) {
  tr.trail.push([tr.t, h.x, h.y]);
  while (tr.trail.length > 2 && tr.trail[1][0] < tr.t - T.delay - 0.5) tr.trail.shift();
  const gh = nqGhost(tr, T.delay), sc = T.scenes[tr.i];
  if (!gh || !sc) return;
  const on = (o, j) => tdist(o, pt(T.plates[j])) <= T.plateR;
  if (!((on(h, sc[0]) && on(gh, sc[1])) || (on(h, sc[1]) && on(gh, sc[0])))) return;
  tr.i++;
  call(E, g, h, `장면 ${tr.i}/${T.scenes.length}`, 1.2, 'eqClank');
  if (tr.i >= T.scenes.length) win(E, g, h);
}
function tickSeal(E, g, h, tr, T, dt) {
  const c = tr.fo[0];
  if (c) {
    step(c, h.x, h.y, FO.chaser.spd, dt); clampXY(h.map, c);
    if (tdist(c, h) <= FO.chaser.rad + 20) {
      hurt(E, g, h, tr, TS.hit);
      E.place(g, h, T.start[0], T.start[1]);
      c.x = T.chaser[0]; c.y = T.chaser[1];
    }
  }
  if (tr.i >= T.stones.length) win(E, g, h);
}
function tickDrill(E, g, h, tr, T, dt) {
  tickAllies(E, g, h, tr, dt);
  if (tr.fo.length) return;
  if (tr.i + 1 >= T.stages.length) return void win(E, g, h);
  spawnPosts(tr, tr.i + 1);
  call(E, g, h, `말뚝 ${T.stages[tr.i].posts.length}개 — 소집 한도 ${T.stages[tr.i].cap}`, 1.6);
}
function tickPalace(E, g, h, tr, T, dt) {
  const P = T, altar = { x: P.altar.at[0], y: P.altar.at[1], altar: 1, rad: P.altar.r };
  if (tr.ph === 1) {
    if ((tr.n -= dt) <= 0) { tr.n = P.p1.waves.gap; spawnWave(tr, h.map, P.p1.waves); }
    for (const f of tr.fo) tickFoe(E, g, h, tr, f, decoyT(tr, f) || [altar], dt);
    tickAllies(E, g, h, tr, dt);
    if (tr.alt <= 0) return void fail(E, g, h, '제단이 부서졌다.');
    if (tr.t >= P.p1.dur) return void nextPalace(E, g, h, tr, '2단계 — 군단 지휘. 적 서른을 쓰러뜨려라. 소집 한도 15.');
    return;
  }
  const mine = [h, ...tr.al];
  for (const f of tr.fo) tickFoe(E, g, h, tr, f, decoyT(tr, f) || mine, dt);
  tickAllies(E, g, h, tr, dt);
  if (!h.nqRun.tr) return;
  if (tr.ph === 2) {
    const live = tr.fo.length;
    if (!live && tr.spawned < P.p2.total) {
      const n = P.p2.waves[Math.min(P.p2.waves.length - 1, Math.floor(tr.spawned / P.p2.waves[0]))];
      for (let i = 0; i < n; i++) { const [x, y] = edgePoint(h.map); tr.fo.push(foe(P.p2.kinds[i % P.p2.kinds.length], x, y)); }
      tr.spawned += n;
    }
    if (tr.kill >= P.p2.total) return void nextPalace(E, g, h, tr, '3단계 — 최초의 군주 잔영. 기둥을 부숴 보호막을 걷어 내라. 잔영은 그림자를 빼앗는다.');
    return;
  }
  // 3단계 — 기둥 · 잔영 · 그림자 빼앗기 · 마지막 문양
  if (tr.spawned < P.p3.foes && tr.fo.filter((f) => f.k === 'hound' || f.k === 'knight').length < 5) {
    const [x, y] = edgePoint(h.map); tr.fo.push(foe(Math.random() < 0.5 ? 'hound' : 'knight', x, y)); tr.spawned++;
  }
  const lord = tr.fo.find((f) => f.k === 'lord');
  if (!lord) return void win(E, g, h);
  if (!tr.gl && (tr.steal -= dt) <= 0) {
    tr.steal = P.p3.steal[1];
    if (tr.al.length && Math.random() < P.p3.steal[0]) {
      const a = tr.al.splice(Math.floor(Math.random() * tr.al.length), 1)[0];
      tr.fo.push(foe('hound', a.x, a.y));
      E.say(g, h.map, a.x, a.y - 80, '잔영이 그림자를 빼앗았다', RED);
    }
  }
  if (!tr.gl && lord.hp <= lord.max * P.p3.stop) {
    if (nqSkip(g, h)) return void win(E, g, h);                  // 테스트 서버 퍼즐 건너뛰기 — 문양 맞추기는 건너뛴다
    tr.gl = 1; tr.glT = P.p3.glyphTime; lord.hp = Math.max(1, lord.hp);
    tr.fo = tr.fo.filter((f) => f.k === 'lord');
    tell(E, g, h, '잔영이 무릎을 꿇는다. 제단에 일곱 문양이 떠오른다 — 제단을 조사해 문양마다 그 장군을 맞춰라.', VIO);
  }
  if (tr.gl && (tr.glT -= dt) <= 0) return void fail(E, g, h, '문양이 흩어졌다.');
}
function nextPalace(E, g, h, tr, text) {
  tr.ph++;
  nu(h).t = tr.ph; save(h);
  palacePhase(tr);
  call(E, g, h, `${tr.ph - 1}단계 통과`, 1.6, 'lvup');
  tell(E, g, h, text, VIO);
}

/* ── 계승 — 유일 규칙(hiddenUnique.js)을 거쳐 해금 ── */
function contract(E, g, h, yes) {
  if (!nqHas(h, 'heir') || nqHas(h, 'claim') || h.map !== 'necro_palace') return;
  const s = nqSpotById('p-throne');
  if (dist(h, s.at) > s.r * 1.6) return;
  if (!yes) { setAll(h, 'later'); return void tell(E, g, h, '왕의 잔영|서두를 필요는 없다. 군단은 기다리는 데 익숙하니.'); }
  if (owns(h)) return;
  if (!hiddenEnforced(g, h)) return void finish(E, g, h);
  if (hiddenTaken(g, h, NECRO_ID)) return void tell(E, g, h, hiddenTakenMsg(NECRO_ID));
  run(h).ask = { t: 0 };
  hiddenAsk(g, h, NECRO_ID);
}
function tickAsk(E, g, h, dt) {
  const r = h.nqRun, a = r && r.ask;
  if (!a) return;
  const rep = hiddenReply(h, NECRO_ID);
  if (rep) {
    r.ask = null;
    if (rep.ok) return void finish(E, g, h);
    if (rep.err === 'taken') return void tell(E, g, h, hiddenTakenMsg(NECRO_ID));
    if (rep.err === 'account') return void tell(E, g, h, `서버 계정이 없는 캐릭터는 ${NECRO_NAME} 를 계승할 수 없다.`);
    return void tell(E, g, h, '계승을 확인하지 못했다. 잠시 뒤 다시 시도해 주세요.');
  }
  if ((a.t += dt) > 10) { r.ask = null; tell(E, g, h, '계승을 확인하지 못했다. 잠시 뒤 다시 시도해 주세요.'); }
}
function finish(E, g, h) {
  setAll(h, 'claim');
  unlockNecro(h);
  // 전용 무기 그림자 낫 — 가방에 자리가 있으면 넣고 손에 든다(가득 차면 다음에 왕좌에서 다시 받는다)
  if (E.bagRoom && E.gear && !h.bag.w.some((w) => w.sp === NC_WEAPON_ITEM.id) && E.bagRoom(h)) E.gear(h, NC_WEAPON_ITEM.id);
  const w = h.bag.w.find((q) => q.sp === NC_WEAPON_ITEM.id);
  if (w) { h.bag.e = w.u; save(h); }
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 150, text: `${NECRO_NAME} 계승`, color: VIO, t: 2.4, life: 2.4, snd: 'lvup', who: h.pi });
  const J = h.bag.hj.jobs[NECRO_ID];
  tell(E, g, h, `잊힌 군단의 지휘권을 계승했다. ${NECRO_NAME} — 1차 전직은 사라졌다. ${w ? `${NC_WEAPON_ITEM.name}을 손에 들었다. ` : `가방이 가득 차 ${NC_WEAPON_ITEM.name}을 받지 못했다 — 무기 칸을 비우고 왕좌를 다시 조사하자. `}${J.lv > 1 ? `예전 기록(직업 레벨 ${J.lv})에서 이어 간다.` : '직업 레벨 1 부터 시작한다.'}`);
}
// 왕좌를 다시 조사 — 계승했는데 낫이 없으면(가방이 가득 찼던 때) 다시 준다
function regive(E, g, h) {
  if (!owns(h) || h.bag.w.some((w) => w.sp === NC_WEAPON_ITEM.id) || !E.bagRoom || !E.bagRoom(h)) return;
  E.gear(h, NC_WEAPON_ITEM.id);
  const w = h.bag.w.find((q) => q.sp === NC_WEAPON_ITEM.id);
  if (w) { h.bag.e = w.u; save(h); tell(E, g, h, `${NC_WEAPON_ITEM.name}을 받았다.`); }
}

/* ── 시간 — 영웅마다(rpg.js 영웅 반복) ── */
export function tickNq(E, g, h, dt) {
  if (!h || !h.bag) return;
  if (!h.nqRun) { if (nqMap(h.map)) run(h); else return; }
  const r = h.nqRun;
  if (r.tr) tickTrial(E, g, h, dt);
  tickAsk(E, g, h, dt);
  if (h.down > 0) return;
  tickMimic(E, g, h, dt);
  if (!nqMap(h.map)) { if (!r.ask && !r.mim) h.nqRun = null; return; }
  tickHazards(E, g, h, dt);
  tickLightPass(h);
  tickRitual(E, g, h, dt);
  if (h.map === 'necro_palace' && nqHas(h, 'claim') && !r.regive) { r.regive = 1; regive(E, g, h); }
}

/* ── 관리자 /네크로맨서 <이름> 루트 <단계> — 그 단계 앞까지 깃발을 세운다 ── */
export function nqAdminStage(h, st) {
  const i = STAGES.findIndex((q) => q.name === st || q.name.replace(/\s/g, '') === String(st).replace(/\s/g, ''));
  const n = i >= 0 ? i : Math.max(0, Math.min(STAGES.length - 1, Math.floor(Number(st) || 0)));
  h.bag.nu = { f: [0, 0, 0, 0], d: {}, t: 0 };
  for (let k = 1; k <= n; k++) for (const f of STAGES[k].set) setFlag(h, f);
  if (n >= 1) Object.assign(h.bag.nu.d, { dir: 0, tq: 7 });
  if (n >= 8) Object.assign(h.bag.nu.d, { rs: 1, rb: 2, rp: 2, ro: 1 });
  h.nqRun = null;
  save(h);
  return STAGES[n].name;
}

/* 테스트 서버 전용 — 여섯 장군의 시험(발테른 · 세리온 · 라에딘 · 오르벤 · 모르켄 · 에레보스) 앞으로 바로 간다.
   앞 단계 깃발을 채우고(다른 단계의 시험은 이미 끝낸 것으로) 그 장군 곁에 세운다. 테스트 방은 저장하지 않으니 가방은 이번 접속에만 바뀐다 */
export const NQ_TEST_GENERALS = [
  { id: 't-valtern', name: '방패 · 발테른', stage: 3, need: ['gates'] }, { id: 'a-room', name: '기록 · 세리온', stage: 4, need: ['books'] }, { id: 's-raedin', name: '날개 · 라에딘', stage: 5, need: ['statue'] },
  { id: 'f-orben', name: '시간 · 오르벤', stage: 6, need: ['clocks'] }, { id: 'r-morken', name: '경계 · 모르켄', stage: 7, need: ['mirror'], dials: { rs: 1, rb: 2, rp: 2, ro: 1 } }, { id: 'ob-erebos', name: '침묵 · 에레보스', stage: 8, need: ['plates'] },
];
export function nqTestGeneral(h, n) {
  const G = NQ_TEST_GENERALS[n];
  if (!G) return false;
  nqAdminStage(h, G.stage);
  for (const f of G.need) setFlag(h, f);
  if (G.dials) Object.assign(h.bag.nu.d, G.dials);
  const sp = nqSpotById(G.id);
  h.map = sp.map; h.x = sp.at[0]; h.y = Math.min(NQ_MAP_H - 60, sp.at[1] + 150);
  h.hold = []; h.dest = null; h.dash = 0; h.gateCd = 1.5; h.nqRun = null;
  return true;
}

/* ── 스냅샷 영웅 줄 61 ── 0 이면 아무것도 없다 */
const r1 = (v) => Math.round(v * 10) / 10;
const FOE_KINDS = Object.keys(FO);
const MODES = ['hold', 'escort', 'follow', 'guard', 'attack'];
export function packNq(h) {
  const r = h.nqRun;
  if (!r) return 0;
  const m = r.mim ? NQ_MIMIC_IDS.indexOf(r.mim.mid) : -1;
  const t = r.tr;
  let tr = 0;
  if (t) {
    const gh = t.id === 'echo' ? nqGhost(t, TI('echo').delay) : null;
    tr = [NQ_TRIAL_IDS.indexOf(t.id), r1(t.t), Math.max(0, Math.round(t.hp)), t.ph, ['strike', 'shield', 'dash', 'decoy', 'call'].map((k) => r1(t.cd[k])), t.msh,
      t.al.flatMap((a) => [Math.round(a.x), Math.round(a.y), Math.max(0, a.hp), a.sh, MODES.indexOf(a.mode)]),
      t.fo.flatMap((f) => [FOE_KINDS.indexOf(f.k), Math.round(f.x), Math.round(f.y), Math.max(0, Math.round(f.hp)), f.ax < 0 ? 1 : 0]),
      t.wn.flatMap((w) => [w.x, w.y, w.r, r1(w.d - w.t), w.d]),
      t.i, t.kill, Math.max(0, Math.round(t.alt)), t.altSh, gh ? [Math.round(gh.x), Math.round(gh.y)] : 0, t.decoy ? [Math.round(t.decoy.x), Math.round(t.decoy.y)] : 0,
      t.gl, r1(t.glT), t.spawned];
  }
  const sq = Object.entries(r.seq).filter(([, q]) => q.length).map(([k, q]) => [k, q.slice()]);
  return [r.R[0], r.R[1], r.R[2], m, tr, sq.length ? sq : 0, r.ask ? 1 : 0, r1(r.still)];
}
const chunk = (a, n) => { const out = []; if (Array.isArray(a)) for (let i = 0; i + n <= a.length; i += n) out.push(a.slice(i, i + n)); return out; };
export function applyNq(h, a) {
  if (!a) { h.nqv = null; return; }
  const [ri, rc, rn, m, tr, sq, ask, still] = a;
  h.nqv = { R: [ri, rc, rn], mim: m, ask, still: still || 0, seq: sq ? Object.fromEntries(sq) : {},
    tr: Array.isArray(tr) ? { id: NQ_TRIAL_IDS[tr[0]], t: tr[1], hp: tr[2], ph: tr[3], cd: Object.fromEntries(['strike', 'shield', 'dash', 'decoy', 'call'].map((k, i) => [k, (tr[4] || [])[i] || 0])), msh: tr[5],
      al: chunk(tr[6], 5).map(([x, y, hp, sh, md]) => ({ x, y, hp, sh, mode: MODES[md] })),
      fo: chunk(tr[7], 5).map(([k, x, y, hp, ax]) => ({ k: FOE_KINDS[k], x, y, hp, max: (FO[FOE_KINDS[k]] || {}).hp || 1, ax: ax ? -1 : 1 })),
      wn: chunk(tr[8], 5).map(([x, y, r, left, d]) => ({ x, y, r, left, d })),
      i: tr[9], kill: tr[10], alt: tr[11], altSh: tr[12], ghost: tr[13] ? { x: tr[13][0], y: tr[13][1] } : null, decoy: tr[14] ? { x: tr[14][0], y: tr[14][1] } : null,
      gl: tr[15], glT: tr[16], spawned: tr[17] } : null };
}
// 화면 값 — 손님은 스냅샷(h.nqv), 방장 브라우저는 판정 값에서 바로 만든다
export function nqView(h) {
  if (!h) return null;
  if (h.nqRun) { const o = {}; applyNq(o, packNq(h)); return o.nqv; }
  return h.nqv || null;
}
