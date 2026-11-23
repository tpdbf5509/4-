/* ── 히든 직업 Illusionist 005 획득 루트 「존재하지 않았던 공연」 판정(11월 23일, 사용자 기획서 8장) ─────────────
   수치 · 자리 · 대사는 illusionQuestData.js. 판정은 방장 · 전용 서버만 하고, 화면(IllusionQuestPanel.jsx)은 같은 함수로 조사 칸을 띄운다.
   Necromancer 004 「이름 없는 군단」(necroQuest.js)과 같은 틀이다.
   진행은 가방 bag.iu = { f: [깃발 비트 24개씩], d: { fk: 숲길 구간, wh: 물레 추 고정 } } — 저장된다.
   퍼즐 중간 값 · 시험은 h.iqRun(저장하지 않는다) = { R: 마지막 결과, w: 틀린 수, tr: 시험 }.
   공개: IQ_ROUTE.live 가 false 면 테스트 서버(g.test)에서만 — 판정이 h.ilt 를 세우고 영웅 줄 64 로 화면에 알린다.
   화면에 보낼 것은 영웅 줄 64(packIq) — 손님 화면 값 h.iqv.
   입력 kind "iq": { op: 'act', id, v } · { op: 'skill', s } · { op: 'quit' } · { op: 'contract', yes }.
   E(엔진, rpg.js iqEngine): fx · say · sys · goMap · place · face */
import { IQ_ROUTE, IQ_FLAGS, IQ_SPOTS, IQ_FOREST as FO, IQ_TRIAL as T, IQ_EVIDENCE, IQ_STAGES, IQ_DESK, IQ_TRAVEL, IQ_MAPS, iqMap, iqSpotMap } from './illusionQuestData.js';
import { IL_SHUFFLE, IL_SLASH, IL_PRISON, IL_BLINK, IL_FIST, IL_MIRROR, IL_FINAL } from './illusionData.js';

export const IQ_STAGE_LIST = IQ_STAGES;
const SQ = 0.78;
const LIL = '#d9c9f2', WARN = '#f0c98a', RED = '#ff8a8a';
const CH = 24;
const FI = Object.fromEntries(IQ_FLAGS.map((n, i) => [n, i]));
const DIAL_KEYS = ['fk', 'wh'];
const SPOT_I = Object.fromEntries(IQ_SPOTS.map((s, i) => [s.id, i]));
export const iqSpotById = (id) => IQ_SPOTS[SPOT_I[id]] || null;
export const iqSpotIndex = (id) => (id in SPOT_I ? SPOT_I[id] : -1);
const MAP_OF = Object.fromEntries(IQ_MAPS.map((m) => [m.id, m]));

/* ── 공개 — 실제 게임은 IQ_ROUTE.live, 그 전에는 테스트 서버만(판정이 h.ilt 를 세운다) ── */
export const iqOn = (h) => !!(IQ_ROUTE.live || (h && h.ilt));

/* ── 저장 값 ─────────────────────────────── */
export function cleanIu(d) {
  if (!d || typeof d !== 'object') return null;
  const n = Math.ceil(IQ_FLAGS.length / CH), f = [];
  for (let i = 0; i < n; i++) f.push(Math.max(0, Math.floor(Number(Array.isArray(d.f) ? d.f[i] : 0) || 0)) & 0xffffff);
  const dd = {};
  if (d.d && typeof d.d === 'object') for (const k of DIAL_KEYS) { const v = Number(d.d[k]); if (Number.isFinite(v) && v >= 0 && v <= 9) dd[k] = Math.round(v); }
  if (!f.some(Boolean) && !Object.keys(dd).length) return null;
  return { f, d: dd };
}
const iu = (h) => h.bag.iu || (h.bag.iu = { f: [0, 0], d: {} });
export function iqHas(h, name) {
  const i = FI[name];
  if (i == null || !h || !h.bag || !h.bag.iu) return false;
  return !!(((h.bag.iu.f || [])[Math.floor(i / CH)] || 0) & (1 << (i % CH)));
}
function setFlag(h, name) {
  const i = FI[name];
  if (i == null || iqHas(h, name)) return false;
  const u = iu(h), c = Math.floor(i / CH);
  while (u.f.length <= c) u.f.push(0);
  u.f[c] |= 1 << (i % CH);
  return true;
}
const save = (h) => { h.bag.v = (h.bag.v || 0) + 1; };
const setAll = (h, names) => { let any = false; for (const n of [].concat(names || [])) if (n && setFlag(h, n)) any = true; if (any) save(h); return any; };
export const iqDial = (h, key) => { const d = h && h.bag && h.bag.iu && h.bag.iu.d; return (d && d[key]) || 0; };
export const iqCardCount = (h) => ['card_curtain', 'card_lamp', 'card_hand', 'card_mirror', 'card_seat'].filter((n) => iqHas(h, n)).length;

// 조건 — 깃발 이름 배열('!이름' 은 없어야)
export function iqCond(h, c) {
  if (!c) return true;
  return [].concat(c).every((n) => (n[0] === '!' ? !iqHas(h, n.slice(1)) : iqHas(h, n)));
}
// 잠김 대사 — 'cards' 면 모은 카드 수
export const iqLock = (h, a) => (a.lock === 'cards' ? [`|카드 다섯 장이 있어야 한다. 지금 ${iqCardCount(h)}장.`] : a.lock || ['|아직 할 수 있는 일이 없다.']);
// 증언 대조에서 고를 수 있는 증거(가진 것만)
export const iqEvidence = (h) => IQ_EVIDENCE.map((e, i) => ({ ...e, i })).filter((e) => iqHas(h, e.need));

/* ── 조사 자리 ───────────────────────────── */
const dist = (h, at) => Math.hypot(h.x - at[0], (h.y - at[1]) / SQ);
// 조사 자리가 보이는가 — 같은 맵 · 조건. 시험 중에는 시험 자리만
export function iqSpotShown(h, s) {
  if (!iqOn(h) || !h || !h.bag || h.map !== s.map) return false;
  if (inTrial(h) && s.act.k !== 'trial') return false;
  return iqCond(h, s.show);
}
// 가까운 조사 자리 — npcOk 면 원래 주민 · 풍경에 붙은 단추도
export function iqSpotNear(h, npcOk) {
  if (!h || !h.bag || h.down > 0 || !iqOn(h) || !iqSpotMap(h.map)) return null;
  let best = null, bd = 1e9;
  for (const s of IQ_SPOTS) {
    if (s.map !== h.map || (s.npc && !npcOk)) continue;
    const d = dist(h, s.at);
    if (d <= s.r && d < bd && iqSpotShown(h, s)) { best = s; bd = d; }
  }
  return best;
}
// 지금 할 차례(steps 중 아직 세우지 않은 첫 것) — 화면 창도 같은 함수
export function iqStep(h, a) {
  if (!a.steps) return null;
  return a.steps.find((st) => !iqHas(h, st.flag)) || null;
}
// 열고 닫히는 구조물(문 · 거울문 · 막 · 유리함)이 지금 열렸나 — 그림도 같은 함수
export function iqOpen(h, s) {
  const a = s.act;
  if (s.id === 'r-door' || s.id === 'r-b') return iqHas(h, 'mirror_latch');
  if (s.id === 'm-east') return true;
  if (s.id === 'rd-box' || s.id === 'rd-box2') return iqHas(h, 'card_seat');
  if (a.k === 'gate') return iqCond(h, a.need);
  return false;
}
// 말풍선 한 줄 — [글, 단추]
export function iqSpotLine(h, s) {
  const a = s.act, k = a.k;
  if (s.npc) return [`${s.name}`, s.btn];
  if (k === 'gate') return [s.name, iqCond(h, a.need) ? '들어가기' : '살펴보기'];
  if (k === 'door') return [s.name, iqOpen(h, s) ? '들어가기' : '살펴보기'];
  if (k === 'fork') return [FO.sign[Math.min(2, iqDial(h, 'fk'))][a.dir], '이 길로 간다'];
  if (k === 'trial') return [s.name, inTrial(h) ? '시험 포기' : '시험 시작'];
  if (k === 'desk') return [s.name, '다가가기'];
  if (k === 'ask' && s.look === 'guide') return [s.name, '말 걸기'];
  return [s.name, '살펴보기'];
}

/* ── 결과 — 화면 창이 읽는다(영웅 줄 64 의 0~2 칸) ── 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 힌트 · 6 이미 함 */
const run = (h) => h.iqRun || (h.iqRun = { R: [-1, 0, 0], w: {}, tr: null });
function res(h, s, code) { const r = run(h); r.R = [s ? iqSpotIndex(s.id) : -1, code, (r.R[2] + 1) % 1000]; }
const tell = (E, g, h, text, color) => (color ? E.say(g, h.map, h.x, h.y - 100, text, color) : E.sys(g, h.pi, text));
const call = (E, g, h, text, life = 1.4, snd = 'eqBeep') => E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text, color: LIL, t: life, life, snd, who: h.pi });
const go = (E, g, h, to, at) => { endTrial(h); E.goMap(g, h, to, at); };
// 틀린 수 — 세 번째부터 창이 힌트를 보인다
export const iqWrong = (h, id) => (h && h.iqRun && h.iqRun.w[id]) || 0;
function wrong(h, s) { const w = run(h).w; w[s.id] = (w[s.id] || 0) + 1; res(h, s, 2); }

/* ── 입력 ───────────────────────────────── */
export function iqInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !h.bag || h.down > 0 || !req || typeof req !== 'object') return;
  h.ilt = g.test ? 1 : 0;
  if (!iqOn(h)) return;
  if (req.op === 'skill') return void trialSkill(E, g, h, req.s);
  if (req.op === 'quit') return void quitTrial(E, g, h);
  if (req.op === 'contract') return void contract(E, g, h, !!req.yes);
  if (req.op !== 'act') return;
  const s = iqSpotById(req.id);
  if (!s || s.map !== h.map || !iqSpotShown(h, s) || dist(h, s.at) > s.r * 1.6) return;
  act(E, g, h, s, req.v);
}

function act(E, g, h, s, v) {
  const a = s.act, k = a.k;
  if (a.need && k !== 'gate' && !iqCond(h, a.need)) return void res(h, s, 3);
  if (a.visit) setAll(h, a.visit);                                // 원래 장소의 보관처에 다녀왔다(소품실 「방문한 보관처」)
  if (k === 'talk') { if (a.set) setAll(h, a.set); return void res(h, s, 1); }
  if (k === 'ask') {
    const o = Number.isInteger(v) && a.opts[v];
    if (!o) return;
    if (o.set) setAll(h, o.set);
    if (o.go) return void go(E, g, h, o.go.to, o.go.at);
    return void res(h, s, 1);
  }
  if (k === 'steps') return void steps(E, g, h, s, v);
  if (k === 'gate') {
    if (!iqCond(h, a.need)) return void res(h, s, 3);
    if (v !== 1) return void res(h, s, 4);                        // 첫 말(first)을 보여 준 뒤 「들어가기」로 다시 보낸다
    return void go(E, g, h, a.to, a.back);
  }
  if (k === 'door') {
    if (!iqOpen(h, s)) return void res(h, s, 3);
    if (v !== 1) return void res(h, s, 4);
    return void go(E, g, h, 'iq_store', [1200, 1380]);
  }
  if (k === 'tree' || k === 'trace') return void res(h, s, 1);   // 흠집 수 · 바닥 흔적은 창이 구간(fk)으로 보여 준다
  if (k === 'fork') return void fork(E, g, h, s);
  if (k === 'latch') {
    if (v === 0) { iu(h).d.wh = 1; save(h); call(E, g, h, '고정', 1, 'eqClank'); return void res(h, s, 1); }
    return void res(h, s, 2);
  }
  if (k === 'ribbon') {
    if (iqHas(h, 'card_seat')) return void res(h, s, 6);
    if (v === 1) return void res(h, s, 5);                        // 유리를 깼다 — 가짜 유리만 흩어진다
    if (v !== 0) return;
    if (!iqDial(h, 'wh')) return void res(h, s, 2);               // 추가 흔들려 함이 제자리로
    setAll(h, ['card_seat', 'visited_ridge']); call(E, g, h, '빈 의자 카드', 1.6, 'lvup');
    return void res(h, s, 1);
  }
  if (k === 'travel') {
    const t = Number.isInteger(v) && IQ_TRAVEL[v];
    if (!t || !iqHas(h, t.f)) return void res(h, s, 3);
    return void go(E, g, h, t.to, t.at);
  }
  if (k === 'trial') {
    if (inTrial(h)) return void quitTrial(E, g, h);
    if (iqHas(h, 'trial_passed')) return void res(h, s, 6);
    return void trialStart(E, g, h, s);
  }
  if (k === 'desk') return void res(h, s, 1);
}

// 차례 맞추기 — pickN 이면 그만큼만 골라 차례대로
function orderOk(st, v) {
  const n = st.pickN || st.ans.length;
  if (!Array.isArray(v) || v.length !== n || new Set(v).size !== n || !v.every((i) => Number.isInteger(i) && i >= 0 && i < st.items.length)) return false;
  return v.every((x, i) => x === st.ans[i]);
}
// 한 자리의 여러 단계 — 지금 차례 하나만 받는다. v: 'open'(처음 열기) · 'go'(다 끝낸 뒤 이동) · 대답
function steps(E, g, h, s, v) {
  const a = s.act, st = iqStep(h, a);
  if (v === 'open') return void res(h, s, 4);
  if (!st) {
    if (v === 'go' && a.go) return void go(E, g, h, a.go.to, a.go.at);
    return void res(h, s, 6);
  }
  let ok = false, extra = null;
  if (st.k === 'read') ok = true;
  else if (st.k === 'pick') {
    if (!Number.isInteger(v)) return;
    if (st.opts === 'evidence') {
      const e = IQ_EVIDENCE[v];
      if (!e || !iqHas(h, e.need)) return;
      if (e.info && v !== st.ans) return void res(h, s, 5);
      ok = v === st.ans;
    } else {
      const o = st.opts[v];
      if (o == null) return;
      if (o.info) return void res(h, s, 5);                       // 더 알아보는 대답 — 틀린 것으로 세지 않는다
      ok = Array.isArray(st.ans) ? st.ans.includes(v) : v === st.ans;
      if (ok && o.set) extra = o.set;
    }
  } else if (st.k === 'order') ok = orderOk(st, v);
  else if (st.k === 'dials') ok = Array.isArray(v) && v.length === st.items.length && st.items.every((it, i) => v[i] === it.ans);
  if (!ok) return void wrong(h, s);
  setAll(h, [st.flag, ...[].concat(st.set || []), ...[].concat(extra || [])]);
  if (st.flag.startsWith('card_')) call(E, g, h, `카드 ${iqCardCount(h)}/5`, 1.6, 'lvup');
  res(h, s, 1);
}

/* ── 2장 숲길 — 같은 갈림길을 세 번. 맞는 길이면 구간이 오르고(나무 흠집), 틀리면 그대로 갈림길 한가운데로 돌아온다 ── */
const FORK_BACK = [1200, 1100];
function fork(E, g, h, s) {
  if (iqHas(h, 'route_solved')) return void res(h, s, 6);
  const fk = iqDial(h, 'fk');
  if (s.act.dir !== FO.ans[fk]) {
    E.place(g, h, FORK_BACK[0], FORK_BACK[1]);
    return void wrong(h, s);
  }
  iu(h).d.fk = fk + 1; save(h);
  if (fk + 1 >= FO.ans.length) {
    setAll(h, 'route_solved');
    res(h, s, 1);
    return void go(E, g, h, 'iq_seats', [1200, 1380]);
  }
  E.place(g, h, FORK_BACK[0], FORK_BACK[1]);
  call(E, g, h, FO.ok[fk], 1.8, 'eqClank');
  res(h, s, 1);
}

/* ── 8장 최종 시험 ─────────────────────────── */
export const inTrial = (h) => !!(h && h.iqRun && h.iqRun.tr);
const ACT_FLAGS = ['trial_card_done', 'trial_space_done', 'trial_mirror_done', 'trial_self_done'];
const tdist = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) / SQ);
const here = (h) => [h.x, h.y];
function endTrial(h) { if (h.iqRun) h.iqRun.tr = null; }
function quitTrial(E, g, h) {
  if (!inTrial(h)) return;
  endTrial(h);
  E.place(g, h, T.start[0], T.start[1] + 120);
  tell(E, g, h, '시험을 멈췄다. 끝낸 막은 남는다. 무대 중앙에서 다시 시작할 수 있다.');
}
function newAct(h, act) {
  return { act, step: 0, t: 0, hp: T.hp, cd: {}, hit: [0, 0, 0], lit: [0, 0], slashT: 0, task: [0, 0, 0], bind: 0, ang: 0, rainT: T.rain.gap, wn: [],
    house: null, claps: 0, real: Math.floor(Math.random() * T.clones.length), base: here(h) };
}
function trialStart(E, g, h, s) {
  const act = ACT_FLAGS.findIndex((f) => !iqHas(h, f));
  if (act < 0) return void res(h, s, 6);
  E.place(g, h, T.start[0], T.start[1]);
  run(h).tr = newAct(h, act);
  if (act === 0) h.iqRun.tr.step = 0;
  tell(E, g, h, `${T.names[act]} — 시험 체력 ${T.hp}. 레벨 · 장비 · 직업은 시험에 영향을 주지 않는다.`, LIL);
  res(h, s, 1);
}
function fail(E, g, h, why) {
  const tr = h.iqRun.tr;
  E.place(g, h, T.start[0], T.start[1]);
  h.iqRun.tr = newAct(h, tr.act);
  tell(E, g, h, `${why} ${T.names[tr.act]}을 처음부터 다시 한다.`, RED);
}
function hurt(E, g, h, tr, n, why) {
  tr.hp -= n;
  E.say(g, h.map, h.x, h.y - 90, `${why} 시험 체력 ${Math.max(0, tr.hp)}`, RED);
}
function actDone(E, g, h) {
  const tr = h.iqRun.tr;
  setAll(h, ACT_FLAGS[tr.act]);
  call(E, g, h, `${T.names[tr.act].split(' — ')[0]} 통과`, 2, 'lvup');
  if (tr.act + 1 < ACT_FLAGS.length) {
    E.place(g, h, T.start[0], T.start[1]);
    h.iqRun.tr = newAct(h, tr.act + 1);
    return void tell(E, g, h, T.names[tr.act + 1], LIL);
  }
  endTrial(h);
  setAll(h, ['trial_passed', 'story_complete']);
  tell(E, g, h, '박수가 두 번 들린다. 한 번은 객석에서, 한 번은 무대 뒤에서. 무대 오른쪽 계승대에 빛이 들어왔다.', LIL);
}

// 겨누기 — 바라보는 쪽 반원 안에서 가장 가까운 표적. 없으면 바라보는 쪽 앞 자리
function face(E, h) { const f = E.face ? E.face(h) : [h.dir || 1, 0]; const L = Math.hypot(f[0], f[1]) || 1; return [f[0] / L, f[1] / L]; }
function aimAt(E, h, pts, reach) {
  const [ax, ay] = face(E, h);
  let best = -1, bd = 1e9;
  pts.forEach((p, i) => {
    if (!p) return;
    const dx = p[0] - h.x, dy = (p[1] - h.y) / SQ, d = Math.hypot(dx, dy);
    if (d > reach || (d > 40 && (dx * ax + dy * ay) / d < 0.35)) return;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
const ahead = (E, h, len) => { const [ax, ay] = face(E, h); return [Math.round(h.x + ax * len), Math.round(h.y + ay * len * SQ)]; };
// 선분(a→b)과 점 p 의 거리
function segDist(a, b, p) {
  const vx = b[0] - a[0], vy = (b[1] - a[1]) / SQ, wx = p[0] - a[0], wy = (p[1] - a[1]) / SQ, L2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / L2));
  return Math.hypot(wx - vx * t, wy - vy * t);
}
// 최종막 — 분신 자리(가짜 셋은 내 움직임을 좌우로 뒤집어 따라 한다)
export function iqClones(tr, hx, hy) {
  return T.clones.map((c, i) => [Math.round(c[0] + (i === tr.real ? 1 : -1) * (hx - tr.base[0])), Math.round(c[1] + (hy - tr.base[1]) * 0.5)]);
}
export function iqDoll(tr) { const D = T.doll; return [Math.round(D.at[0] + Math.cos(tr.ang) * D.orbit), Math.round(D.at[1] + Math.sin(tr.ang) * D.orbit * SQ * 0.6)]; }

const FX = (E, g, h, o) => E.fx(g, h.map, { pi: h.pi, ...o });
function trialSkill(E, g, h, k) {
  const tr = h.iqRun && h.iqRun.tr;
  if (!tr || !T.skills[tr.act].includes(k) || (tr.cd[k] || 0) > 0) return;
  tr.cd[k] = T.cd[k];
  const R = T.reach[k];
  const [ax, ay] = face(E, h);
  if (k === 'card') {
    const life = 0.45;
    if (tr.act === 0 && tr.step === 0) {
      const pts = [...T.real.map((p, i) => (tr.hit[i] ? null : p)), ...T.fake];
      const i = aimAt(E, h, pts, R);
      const to = i >= 0 ? pts[i] : ahead(E, h, R);
      FX(E, g, h, { kind: 'sk_il_card', x: h.x, y: h.y, x0: h.x, y0: h.y - 40, ax, ay, len: Math.round(tdist(here(h), to)), v: 1400, d: 0.09, t: life, life, snd: 'ilCard' });
      if (i < 0) return;
      FX(E, g, h, { kind: 'sk_il_hit', x: to[0], y: to[1], ax, ay, t: 0.32, life: 0.32, snd: 'ilHit' });
      if (i >= T.real.length) return void hurt(E, g, h, tr, T.fakeHit, '반사다 — 카드가 그림을 통과했다.');
      tr.hit[i] = 1;
      if (tr.hit.every(Boolean)) { tr.step = 1; call(E, g, h, '판지 표적을 모두 맞혔다 — 이제 모인 카드 묶음', 2); }
      return;
    }
    if (tr.act === 2) return void clapAt(E, g, h, tr, R, 'card');
    if (tr.act === 3) {
      const pts = iqClones(tr, h.x, h.y);
      const i = aimAt(E, h, pts, R);
      const to = i >= 0 ? pts[i] : ahead(E, h, R);
      FX(E, g, h, { kind: 'sk_il_card', x: h.x, y: h.y, x0: h.x, y0: h.y - 40, ax, ay, len: Math.round(tdist(here(h), to)), v: 1400, d: 0.09, t: life, life, snd: 'ilCard' });
      if (i < 0) return;
      if (i !== tr.real) { tr.real = Math.floor(Math.random() * T.clones.length); return void hurt(E, g, h, tr, T.selfHit, '거울 속 나였다. 분신들이 자리를 바꾼다.'); }
      FX(E, g, h, { kind: 'sk_il_hit', x: to[0], y: to[1], ax, ay, t: 0.32, life: 0.32, snd: 'ilHit' });
      return void actDone(E, g, h);
    }
    return void FX(E, g, h, { kind: 'sk_il_card', x: h.x, y: h.y, x0: h.x, y0: h.y - 40, ax, ay, len: R, v: 1400, d: 0.09, t: life, life, snd: 'ilCard' });
  }
  if (k === 'shuffle' || k === 'final') {
    const S = k === 'shuffle' ? IL_SHUFFLE : IL_FINAL;
    const want = tr.act === 0 && tr.step === 1 ? [T.bundle.at] : tr.act === 1 ? [iqDoll(tr)] : tr.act === 2 ? [T.target] : [];
    const i = aimAt(E, h, want, R);
    const to = i >= 0 ? want[i] : ahead(E, h, R * 0.6);
    if (k === 'shuffle') FX(E, g, h, { kind: 'sk_il_shuffle', x: to[0], y: to[1], x0: Math.round(h.x), y0: Math.round(h.y) - 40, r: S.r, n: S.n, first: S.first, last: S.last, fly: S.fly, end: S.end, t: S.end + 0.3, life: S.end + 0.3, snd: 'ilShuffle' });
    else FX(E, g, h, { kind: 'sk_il_final', x: to[0], y: to[1], r: S.r, n: S.n, first: S.first, gap: S.gap, mirror: S.mirror, end: S.end, t: S.end + 0.5, life: S.end + 0.5, snd: 'ilFinal' });
    if (i < 0) return;
    if (tr.act === 0 && tr.step === 1) { tr.step = 2; E.place(g, h, T.padStart[0], T.padStart[1]); return void call(E, g, h, '카드가 흩어지며 길이 끊겼다 — 덱 슬래시로 두 틈을 건너라', 2.2); }
    if (tr.act === 2 && k === 'final') {
      if (tr.claps < T.claps) return void tell(E, g, h, '박수가 한 번뿐이다. 거울 집 안에서 표적을 먼저 맞혀라.', WARN);
      return void actDone(E, g, h);
    }
    if (tr.act === 2) return void clapAt(E, g, h, tr, R, 'shuffle');
    return;
  }
  if (k === 'slash') {
    const from = here(h), to = ahead(E, h, R);
    E.place(g, h, to[0], to[1]);
    const end = here(h);
    FX(E, g, h, { kind: 'sk_il_slash', x: Math.round(from[0]), y: Math.round(from[1]), ax: Math.round(ax * 100) / 100, ay: Math.round(ay * 100) / 100, len: Math.round(tdist(from, end)), w: IL_SLASH.w, d: IL_SLASH.start, seg: IL_SLASH.seg, t: 0.6, life: 0.6, snd: 'ilSlash' });
    if (tr.act !== 0 || tr.step !== 2) return;
    tr.slashT = T.slashGap;
    const j = tr.lit.findIndex((v) => !v);
    if (j >= 0 && segDist(from, end, T.pads[j]) <= T.padR) {
      tr.lit[j] = 1;
      E.fx(g, h.map, { kind: 'call', x: T.pads[j][0], y: T.pads[j][1] - 90, text: `틈 ${j + 1}/2`, color: LIL, t: 0.9, life: 0.9, snd: 'eqBeep', who: h.pi });
      if (tr.lit.every(Boolean)) actDone(E, g, h);
    }
    return;
  }
  if (k === 'prison') {
    const doll = tr.act === 1 ? iqDoll(tr) : null;
    const i = doll ? aimAt(E, h, [doll], R) : -1;
    const to = i >= 0 ? doll : ahead(E, h, R * 0.6);
    FX(E, g, h, { kind: 'sk_il_prison', x: to[0], y: to[1], r: IL_PRISON.r, form: IL_PRISON.form, hits: IL_PRISON.hits, end: IL_PRISON.end, t: IL_PRISON.end + 0.3, life: IL_PRISON.end + 0.3, snd: 'ilBox' });
    if (i < 0) return;
    tr.bind = T.prisonT; tr.task[0] = 1;
    call(E, g, h, '종이 인형을 묶었다', 1.4);
    return void spaceCheck(E, g, h, tr);
  }
  if (k === 'blink') {
    const from = here(h), to = ahead(E, h, R);
    E.place(g, h, to[0], to[1]);
    FX(E, g, h, { kind: 'sk_il_blink', x: Math.round(from[0]), y: Math.round(from[1]), x1: Math.round(h.x), y1: Math.round(h.y), r: IL_BLINK.r, jump: IL_BLINK.jump, boom: IL_BLINK.boom, t: 0.6, life: 0.6, snd: 'ilBlink' });
    if (tr.act !== 1) return;
    if (tdist(from, T.blinkFrom) <= T.blinkR && tdist(here(h), T.blinkTo) <= T.blinkR) { tr.task[1] = 1; call(E, g, h, '남겨 둔 자리에 닿았다', 1.4); spaceCheck(E, g, h, tr); }
    else if (tdist(here(h), T.blinkTo) <= T.blinkR) tell(E, g, h, '출발 원에서 카드 블링크를 써야 한다.', WARN);
    return;
  }
  if (k === 'fist') {
    const to = ahead(E, h, R);
    FX(E, g, h, { kind: 'sk_il_fist', x: Math.round(h.x), y: Math.round(h.y), x0: Math.round(h.x), y0: Math.round(h.y) - 40, ax: Math.round(ax * 100) / 100, ay: Math.round(ay * 100) / 100, len: R, w: IL_FIST.w, form: IL_FIST.form, hit: IL_FIST.hit, t: 1.05, life: 1.05, snd: 'ilFist' });
    if (tr.act !== 1 || segDist(here(h), to, T.panel) > IL_FIST.w / 2 + T.rad) return;
    tr.task[2] = 1; call(E, g, h, '걸쇠 판이 풀렸다', 1.4);
    return void spaceCheck(E, g, h, tr);
  }
  if (k === 'mirror') {
    if (tr.act !== 2 || tdist(here(h), T.mirror) > 220) { tr.cd.mirror = 1; return void tell(E, g, h, '거울 집을 세울 자리가 아니다. 무대 가운데 거울 곁에서.', WARN); }
    tr.house = { x: Math.round(h.x), y: Math.round(h.y), t: T.houseT }; tr.claps = 0;
    FX(E, g, h, { kind: 'sk_il_mirror', x: tr.house.x, y: tr.house.y, r: IL_MIRROR.r, rise: IL_MIRROR.rise, t: T.houseT, life: T.houseT, snd: 'ilMirror' });
  }
}
// 3막 — 거울 집 안에서 표적을 맞히면 박수가 두 번(내 카드 + 거울 속 카드)
function clapAt(E, g, h, tr, R, k) {
  const i = aimAt(E, h, [T.target], R);
  const [ax, ay] = face(E, h);
  if (k === 'card') FX(E, g, h, { kind: 'sk_il_card', x: h.x, y: h.y, x0: h.x, y0: h.y - 40, ax, ay, len: i >= 0 ? Math.round(tdist(here(h), T.target)) : R, v: 1400, d: 0.09, t: 0.45, life: 0.45, snd: 'ilCard' });
  if (i < 0) return;
  if (!tr.house || tdist([tr.house.x, tr.house.y], here(h)) > IL_MIRROR.r) return void tell(E, g, h, '박수가 한 번만 들린다. 거울 집 안에서 맞혀야 메아리가 따라온다.', WARN);
  FX(E, g, h, { kind: 'sk_il_ghost', x: T.target[0], y: T.target[1], m: 1, t: 0.45, life: 0.45, snd: 'ilGlass' });
  tr.claps = Math.min(T.claps, tr.claps + 1);
  call(E, g, h, `박수 ${tr.claps * 2}번`, 1.2);
  if (tr.claps >= T.claps) tell(E, g, h, '두 번 들리는 박수 — 이제 최후의 셔플로 막을 내려라.', LIL);
}
function spaceCheck(E, g, h, tr) { if (tr.task.every(Boolean)) actDone(E, g, h); }

function tickTrial(E, g, h, dt) {
  const tr = h.iqRun.tr;
  if (h.map !== 'iq_stage' || h.down > 0) return void endTrial(h);
  tr.t += dt;
  for (const k in tr.cd) tr.cd[k] = Math.max(0, tr.cd[k] - dt);
  if (tr.act === 0 && tr.step === 2 && tr.slashT > 0 && (tr.slashT -= dt) <= 0 && tr.lit.some(Boolean) && !tr.lit.every(Boolean)) {
    tr.lit = [0, 0]; E.place(g, h, T.padStart[0], T.padStart[1]); tell(E, g, h, '카드 길이 흩어졌다. 처음 자리에서 다시 건넌다.', WARN);
  }
  if (tr.act === 1) {
    if (tr.bind > 0) tr.bind = Math.max(0, tr.bind - dt); else tr.ang += T.doll.spd * dt;
    // 카드 비 — 내 자리에 예고 → 터지면 시험 체력이 준다
    for (const w of tr.wn) w.t += dt;
    for (const w of tr.wn.filter((q) => q.t >= T.rain.warn)) {
      FX(E, g, h, { kind: 'sk_eq_wave', x: w.x, y: w.y, r: T.rain.r, t: 0.4, life: 0.4, snd: 'eqClank' });
      if (tdist([w.x, w.y], here(h)) <= T.rain.r) hurt(E, g, h, tr, T.rain.dmg, '카드 비에 맞았다.');
    }
    tr.wn = tr.wn.filter((q) => q.t < T.rain.warn);
    if ((tr.rainT -= dt) <= 0) {
      tr.rainT = T.rain.gap;
      const w = { x: Math.round(h.x), y: Math.round(h.y), t: 0 };
      tr.wn.push(w);
      FX(E, g, h, { kind: 'sk_eq_warn', x: w.x, y: w.y, r: T.rain.r, d: T.rain.warn, t: T.rain.warn, life: T.rain.warn });
    }
  }
  if (tr.act === 2 && tr.house && (tr.house.t -= dt) <= 0) { tr.house = null; if (tr.claps < T.claps) tr.claps = 0; }
  if (tr.hp <= 0) fail(E, g, h, '시험 체력이 다했다.');
}

/* ── 계승 — 계승대(sg-desk) ── */
function contract(E, g, h, yes) {
  if (!iqHas(h, 'trial_passed') || iqHas(h, 'claimed') || h.map !== 'iq_stage') return;
  const s = iqSpotById('sg-desk');
  if (dist(h, s.at) > s.r * 1.6) return;
  if (!yes) { setAll(h, 'inherit_later'); return void tell(E, g, h, IQ_DESK.later.replace('이안|', '이안: ')); }
  // shortcut: 실제 게임에 열 때(IQ_ROUTE.live) 유일 규칙(hiddenAsk/hiddenReply) · HIDDEN_JOBS 등록 · unlockIllusion 을 붙인다.
  //           지금은 마술사 직업 자체가 격자 연습장 전용(ILLUSION.live = false)이라 계승 기록만 남긴다.
  setAll(h, 'claimed');
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 150, text: 'Illusionist 005 계승', color: LIL, t: 2.4, life: 2.4, snd: 'lvup', who: h.pi });
  tell(E, g, h, '카드를 받았다. 은빛 장막 극단의 마지막 공연이 기록에 남았다. 마술사 기술은 아직 공개 전이라 격자 연습장에서 써 볼 수 있다.');
  if (iqHas(h, 'apology_requested')) tell(E, g, h, IQ_DESK.apology);
}

/* ── 시간 — 영웅마다(rpg.js 영웅 반복) ── */
export function tickIq(E, g, h, dt) {
  if (!h || !h.bag) return;
  h.ilt = g.test ? 1 : 0;
  if (!h.iqRun) { if (iqMap(h.map)) run(h); else return; }
  if (h.iqRun.tr) tickTrial(E, g, h, dt);
  if (!iqMap(h.map) && !h.iqRun.tr) h.iqRun = null;
}

/* ── 단계 건너뛰기 — 관리자 · 테스트 서버 「도구」. 그 장 앞까지 깃발을 세우고 시작 자리에 선다 ── */
export function iqStage(h, n) {
  const k = Math.max(0, Math.min(IQ_STAGES.length - 1, Math.floor(Number(n) || 0)));
  h.bag.iu = { f: [0, 0], d: {} };
  for (let i = 0; i <= k; i++) for (const f of IQ_STAGES[i].set) setFlag(h, f);
  if (k >= 2) h.bag.iu.d.fk = 3;
  if (k >= 6) h.bag.iu.d.wh = 1;
  h.iqRun = null;
  save(h);
  const S = IQ_STAGES[k];
  h.map = S.map; h.x = S.at[0]; h.y = S.at[1];
  h.hold = []; h.dest = null; h.dash = 0; h.gateCd = 1.5;
  return S.name;
}

/* ── 스냅샷 영웅 줄 64 ── 0 이면 아무것도 없다 */
const r1 = (v) => Math.round(v * 10) / 10;
const SKS = ['card', 'shuffle', 'slash', 'prison', 'blink', 'fist', 'mirror', 'final'];
export function packIq(h) {
  const r = h.iqRun;
  if (!r && !h.ilt) return 0;
  const t = r && r.tr;
  const tr = t ? [t.act, t.step, Math.max(0, Math.round(t.hp)), SKS.map((k) => r1(t.cd[k] || 0)), t.hit, t.lit, t.task, r1(t.bind), r1(t.ang),
    t.house ? [t.house.x, t.house.y, r1(t.house.t)] : 0, t.claps, t.real, t.base, t.wn.map((w) => [w.x, w.y, r1(T.rain.warn - w.t)])] : 0;
  return [h.ilt ? 1 : 0, r ? r.R : 0, tr, r ? Object.entries(r.w).map(([k, n]) => [k, n]) : 0];
}
export function applyIq(h, a) {
  if (!a) { h.iqv = null; return; }
  const [ilt, R, tr, w] = a;
  h.ilt = ilt;   // 손님 화면 — 테스트 서버에서 열렸는지
  h.iqv = { R: R || [-1, 0, 0], w: w ? Object.fromEntries(w) : {},
    tr: Array.isArray(tr) ? { act: tr[0], step: tr[1], hp: tr[2], cd: Object.fromEntries(SKS.map((k, i) => [k, (tr[3] || [])[i] || 0])), hit: tr[4], lit: tr[5], task: tr[6], bind: tr[7], ang: tr[8],
      house: tr[9] ? { x: tr[9][0], y: tr[9][1], t: tr[9][2] } : null, claps: tr[10], real: tr[11], base: tr[12], wn: (tr[13] || []).map(([x, y, left]) => ({ x, y, left })) } : null };
}
// 화면 값 — 손님은 스냅샷(h.iqv), 방장 브라우저는 판정 값에서 바로 만든다
export function iqView(h) {
  if (!h) return null;
  if (h.iqRun || (h.ilt && !h.iqv)) { const o = {}; applyIq(o, packIq(h)); return o.iqv; }
  return h.iqv || null;
}
export const IQ_TRIAL_SKILLS = SKS;
export const iqTopOf = (map) => (MAP_OF[map] ? MAP_OF[map].top : 0);
