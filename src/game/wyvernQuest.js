/* ── 히든 직업 Wyvern Knight 006 획득 루트 「잠든 날개의 서약」 판정(11월 23일, 사용자 기획안) ─────────────
   수치 · 자리 · 대사는 wyvernQuestData.js. 판정은 방장 · 전용 서버만 하고, 화면(WyvernQuestPanel.jsx)은 같은 함수로 조사 칸을 띄운다.
   Illusionist 005 「존재하지 않았던 공연」(illusionQuest.js)과 같은 틀이다.
   진행은 가방 bag.wu = { f: [깃발 비트 24개씩] } — 저장된다. 시련 · 결투 중간 값은 h.wqRun(저장하지 않는다) = { R: 마지막 결과, w: 틀린 수, tr: 시련 }.
   공개: WQ_ROUTE.live 가 false 면 테스트 서버(g.test)에서만 — 판정이 h.wyt 를 세우고 영웅 줄 66 으로 화면에 알린다.
   입력 kind "wq": { op: 'act', id, v } · { op: 'skill', s } · { op: 'quit' } · { op: 'contract', yes } · { op: 'read' }(루엔 도서관에서 책을 덮었다).
   E(엔진, rpg.js eqEngine): fx · say · sys · goMap · place · face */
import { WQ_ROUTE, WQ_FLAGS, WQ_SPOTS, WQ_TRIAL as T, WQ_STAGES, WQ_DESK, WQ_MAPS, WQ_LOOKS, WQ_NAME, WQ_FOUND, wqMap, wqSpotMap,
  AQ, AQ_FLAGS, AQ_LOOKS, AQ_LINE, AQ_TITLE, AQ_STAGES } from './wyvernQuestData.js';
import { WYVERN, WYVERN_ID, WYVERN_NAME, WY_WEAPON_ITEM } from './wyvernData.js';
import { unlockWyvern, wyvernOn } from './wyvernJob.js';
import { hiddenEnforced, hiddenTaken, hiddenAsk, hiddenReply } from './hiddenUnique.js';

export const WQ_STAGE_LIST = [...WQ_STAGES, ...AQ_STAGES];   // 테스트 서버 「도구」 — 앞은 「잠든 날개의 서약」, 뒤는 아르카디온 획득
const SQ = 0.78;
const GOLD = '#f2c48a', WARN = '#f0c98a', RED = '#ff8a8a';
const CH = 24;
// 깃발 자리 — 「잠든 날개의 서약」은 bag.wu, 아르카디온 획득(a_*)은 bag.au(두 퀘스트 값이 서로 덮이지 않는다)
const FI = Object.fromEntries([...WQ_FLAGS.map((n, i) => [n, ['wu', i]]), ...AQ_FLAGS.map((n, i) => [n, ['au', i]])]);
const SPOT_I = Object.fromEntries(WQ_SPOTS.map((s, i) => [s.id, i]));
export const wqSpotById = (id) => WQ_SPOTS[SPOT_I[id]] || null;
export const wqSpotIndex = (id) => (id in SPOT_I ? SPOT_I[id] : -1);
const MAP_OF = Object.fromEntries(WQ_MAPS.map((m) => [m.id, m]));

/* ── 공개 — 실제 게임은 WQ_ROUTE.live, 그 전에는 테스트 서버만(판정이 h.wyt 를 세운다) ── */
export const wqOn = (h) => !!(WQ_ROUTE.live || (h && h.wyt));

/* ── 저장 값 ─────────────────────────────── */
export const cleanWu = (d) => cleanBits(d, WQ_FLAGS);
export const cleanAu = (d) => cleanBits(d, AQ_FLAGS);   // 아르카디온 획득 진행(11월 27일)
function cleanBits(d, FL) {
  if (!d || typeof d !== 'object') return null;
  const n = Math.ceil(FL.length / CH), f = [];
  for (let i = 0; i < n; i++) f.push(Math.max(0, Math.floor(Number(Array.isArray(d.f) ? d.f[i] : 0) || 0)) & 0xffffff);
  if (!f.some(Boolean)) return null;
  return { f };
}
const wu = (h, k) => h.bag[k] || (h.bag[k] = { f: [0] });
export function wqHas(h, name) {
  const q = FI[name];
  if (q == null || !h || !h.bag || !h.bag[q[0]]) return false;
  const i = q[1];
  return !!(((h.bag[q[0]].f || [])[Math.floor(i / CH)] || 0) & (1 << (i % CH)));
}
function setFlag(h, name) {
  const q = FI[name];
  if (q == null || wqHas(h, name)) return false;
  const i = q[1], u = wu(h, q[0]), c = Math.floor(i / CH);
  while (u.f.length <= c) u.f.push(0);
  u.f[c] |= 1 << (i % CH);
  return true;
}
const save = (h) => { h.bag.v = (h.bag.v || 0) + 1; };
function setAll(h, names) {
  let any = false;
  for (const n of [].concat(names || [])) if (n && setFlag(h, n)) any = true;
  if (WQ_LOOKS.every((n) => wqHas(h, n)) && setFlag(h, 'wyvern_found')) any = true;   // 화상 · 발자국 · 제단을 모두 보면 「잠든 와이번 발견」
  if (any) save(h);
  return any;
}

// 아르카디온 획득 조건 — 지금 켜진 직업이 와이번 나이트 · 직업 레벨 AQ.lv 이상(일반 해금 · 관리자 명령어 모두)
export const aqReady = (h) => wyvernOn(h) && (h.bag.hj.jobs[WYVERN_ID].lv || 0) >= AQ.lv;
// 조건 — 깃발 이름 배열('!이름' 은 없어야, '@wy5' 는 aqReady)
export function wqCond(h, c) {
  if (!c) return true;
  return [].concat(c).every((n) => (n === '@wy5' ? aqReady(h) : n[0] === '!' ? !wqHas(h, n.slice(1)) : wqHas(h, n)));
}
export const wqLock = (a) => a.lock || ['|아직 할 수 있는 일이 없다.'];

/* ── 조사 자리 ───────────────────────────── */
const dist = (h, at) => Math.hypot(h.x - at[0], (h.y - at[1]) / SQ);
export function wqSpotShown(h, s) {
  if (!wqOn(h) || !h || !h.bag || h.map !== s.map) return false;
  const tr = trOf(h);
  if (tr) return ((s.act.k === 'trial' && s.act.id === tr.id) || s.act.tr === tr.id) && wqCond(h, s.show);
  if (s.act.tr && s.act.k !== 'anchor') return false;              // 표식 · 붙들기 자리는 시련 중에만
  return wqCond(h, s.show);
}
// 지금 시련 — 판정 세계는 h.wqRun, 손님 화면은 스냅샷 값(h.wqv)
const trOf = (h) => (h.wqRun ? h.wqRun.tr : h.wqv ? h.wqv.tr : null);
export function wqSpotNear(h, npcOk) {
  if (!h || !h.bag || h.down > 0 || !wqOn(h) || !wqSpotMap(h.map)) return null;
  let best = null, bd = 1e9;
  for (const s of WQ_SPOTS) {
    if (s.map !== h.map || (s.npc && !npcOk)) continue;
    const d = dist(h, s.at);
    if (d <= s.r && d < bd && wqSpotShown(h, s)) { best = s; bd = d; }
  }
  return best;
}
export function wqStep(h, a) {
  if (!a.steps) return null;
  return a.steps.find((st) => !wqHas(h, st.flag)) || null;
}
// 열고 닫히는 구조물이 지금 열렸나 — 그림도 같은 함수
export function wqOpen(h, s) {
  if (s.id === 'rg-door') return wqHas(h, 'temple_open');
  if (s.id === 'fp-rock-m') return wqHas(h, 'passage_open');
  if (s.id === 'sn-altar') return wqHas(h, 'awakened');
  if (s.id === 'br-door') return wqHas(h, 'a_start');
  if (s.act.k === 'gate') return wqCond(h, s.act.need);
  return false;
}
// 말풍선 한 줄 — [글, 단추]
export function wqSpotLine(h, s) {
  const a = s.act, k = a.k;
  if (s.npc) return [s.name, s.btn];
  if (k === 'gate') return [s.name, wqCond(h, a.need) ? '들어가기' : '살펴보기'];
  if (k === 'door') return [s.name, wqHas(h, 'temple_open') ? '들어가기' : '살펴보기'];
  if (k === 'rock') return [s.name, wqHas(h, 'passage_open') ? '돌 틈으로' : '살펴보기'];
  if (k === 'trial') return [s.name, inTrial(h) ? '시련 멈추기' : wqHas(h, `trial_${a.id}`) ? '비문 읽기' : '시련 시작'];
  if (k === 'duel') return [s.name, '말 걸기'];
  if (k === 'desk' || s.id.startsWith('sn-ask') || s.id === 'sn-story') return [s.name, '말 걸기'];
  if (k === 'aqDoor') return [s.name, '들어가기'];
  if (k === 'anchor') return [s.name, trOf(h) ? '잠그기' : wqHas(h, `a_lock${a.n + 1}`) ? '살펴보기' : '시련 시작'];
  if (k === 'marker') return [s.name, '아스라를 부른다'];
  if (k === 'hold') return [s.name, '붙들게 한다'];
  if (k === 'home') return [s.name, s.id === 'ra-asura' ? '말 걸기' : '아스라를 부른다'];
  if (k === 'sword') return [s.name, wqHas(h, 'a_return') && !wqHas(h, 'a_got') ? '아르카디온을 뽑는다' : '살펴보기'];
  return [s.name, '살펴보기'];
}

/* ── 결과 — 화면 창이 읽는다(영웅 줄 66 의 R) ── 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 더 알아봄 · 6 이미 함 */
const run = (h) => h.wqRun || (h.wqRun = { R: [-1, 0, 0], w: {}, tr: null });
// 결과는 KEEP 초 동안 지우지 않는다 — 전용 맵 밖(서리봉 바위)에서는 다음 틱이 h.wqRun 을 지워 화면이 결과를 못 받고 「…」에 멈췄다(11월 25일)
const KEEP = 3;
function res(h, s, code) { const r = run(h); r.R = [s ? wqSpotIndex(s.id) : -1, code, (r.R[2] + 1) % 1000]; r.keep = KEEP; }
const tell = (E, g, h, text, color) => (color ? E.say(g, h.map, h.x, h.y - 100, text, color) : E.sys(g, h.pi, text));
const call = (E, g, h, text, life = 1.4, snd = 'eqBeep') => E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 130, text, color: GOLD, t: life, life, snd, who: h.pi });
const go = (E, g, h, to, at) => { endTrial(h); E.goMap(g, h, to, at); };
export const wqWrong = (h, id) => (h && h.wqRun && h.wqRun.w[id]) || 0;
function wrong(h, s) { const w = run(h).w; w[s.id] = (w[s.id] || 0) + 1; res(h, s, 2); }

/* ── 입력 ───────────────────────────────── */
export function wqInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !h.bag || h.down > 0 || !req || typeof req !== 'object') return;
  h.wyt = g.test ? 1 : 0;
  if (!wqOn(h)) return;
  if (req.op === 'read') return void readBook(h);
  if (req.op === 'skill') return void trialSkill(E, g, h, req.s);
  if (req.op === 'quit') return void quitTrial(E, g, h);
  if (req.op === 'contract') return void contract(E, g, h, !!req.yes);
  if (req.op !== 'act') return;
  const s = wqSpotById(req.id);
  if (!s || s.map !== h.map || !wqSpotShown(h, s) || dist(h, s.at) > s.r * 1.6) return;
  act(E, g, h, s, req.v);
}
// 루엔 도서관에서 「북쪽으로 사라진 발자국」을 끝까지 읽고 덮었다 — 아무 안내 없이 기록만 남긴다(기획안 1장)
function readBook(h) {
  if (h.map !== 'luen-library' && h.map !== 'luen-library-2') return;
  setAll(h, 'book_read');
}

function act(E, g, h, s, v) {
  const a = s.act, k = a.k;
  if (a.need && k !== 'gate' && !wqCond(h, a.need)) return void res(h, s, 3);
  if (k === 'talk') {
    const n0 = looks(h), a0 = AQ_LOOKS.filter((n) => wqHas(h, n)).length;
    if (a.set) setAll(h, a.set);
    lookNote(E, g, h, n0, a0);
    if (a.set === 'a_stone') tell(E, g, h, `다음 목표 — ${AQ_LINE.goal2}`);
    return void res(h, s, 1);
  }
  if (k === 'steps') return void steps(E, g, h, s, v);
  if (k === 'gate') {
    if (!wqCond(h, a.need)) return void res(h, s, 3);
    if (a.set) setAll(h, a.set);
    if (v !== 1) return void res(h, s, 4);                        // 첫 말(first)을 보여 준 뒤 「들어가기」로 다시 보낸다
    return void go(E, g, h, a.to, a.back);
  }
  if (k === 'rock') return void rock(E, g, h, s, v);
  if (k === 'door') return void door(E, g, h, s, v);
  if (k === 'altar') return void altar(E, g, h, s, v);
  if (k === 'trial') {
    if (inTrial(h)) return void quitTrial(E, g, h);
    if (wqHas(h, `trial_${a.id}`)) return void res(h, s, 6);
    return void trialStart(E, g, h, s, a.id);
  }
  if (k === 'duel') {
    if (v === 1) { if (inTrial(h)) return; return void trialStart(E, g, h, s, 'duel'); }
    return void res(h, s, 1);                                      // 「준비하고 돌아온다」
  }
  if (k === 'desk') return void res(h, s, 1);
  if (k === 'aqDoor') { if (v === 1) return void go(E, g, h, 'wq_return', [980, 280]); return void res(h, s, 1); }
  if (k === 'anchor') return void anchorAct(E, g, h, s, a.n);
  if (k === 'marker') return void markerAct(E, g, h, a.n, a.m);
  if (k === 'hold') return void holdAct(E, g, h);
  if (k === 'home') return void homeAct(E, g, h, s);
  if (k === 'sword') return void swordAct(E, g, h, s, v);
}
// 여러 단계 자리 — 지금 차례 하나만 받는다. v: 'open'(처음 열기) · 대답
function steps(E, g, h, s, v) {
  const a = s.act, st = wqStep(h, a);
  if (v === 'open') return void res(h, s, 4);
  if (!st) return void res(h, s, 6);
  let ok = false;
  if (st.k === 'read') ok = true;
  else if (st.k === 'pick') {
    if (!Number.isInteger(v)) return;
    const o = st.opts[v];
    if (o == null) return;
    if (o.info) return void res(h, s, 5);                         // 더 알아보는 대답 — 틀린 것으로 세지 않는다
    ok = v === st.ans;
  }
  if (!ok) return void wrong(h, s);
  setAll(h, [st.flag, ...[].concat(st.set || [])]);
  if (st.flag === 'ember_got') call(E, g, h, '꺼지지 않은 용심 불씨', 1.8, 'lvup');
  if (st.flag === 'a_fire') {                                      // 아스라가 위쪽 표식에 불을 뿜는다
    const [ax, ay] = AQ.seat;
    E.fx(g, h.map, { kind: 'sk_wy_ball', x0: ax - 60, y0: ay - 70, x1: s.at[0], y1: s.at[1] - 40, pi: h.pi, t: 0.5, life: 0.5, snd: 'wyBreath' });
    call(E, g, h, '숨은 돌계단이 드러났다', 1.8, 'eqClank');
  }
  if (st.flag === 'a_latch') call(E, g, h, '귀환로가 열렸다', 1.8, 'eqClank');
  res(h, s, 1);
}
/* 2 가운데 바위 — v 0 틈에 손을 대 본다 · 1 돌 틈을 따라 들어간다. 책을 읽어야 손이 간다 */
function rock(E, g, h, s, v) {
  if (wqHas(h, 'passage_open')) { if (v === 1) return void go(E, g, h, 'wq_ridge', [1200, 1400]); return void res(h, s, 6); }
  if (!wqHas(h, 'book_read')) return void res(h, s, 3);
  if (v === 0) { setAll(h, 'rock_wind'); return void res(h, s, 1); }
  if (v === 1) {
    if (!wqHas(h, 'rock_wind')) return void res(h, s, 2);        // 바람 방향을 먼저 느껴 봐야 한다
    setAll(h, 'passage_open');
    res(h, s, 1);
    return void go(E, g, h, 'wq_ridge', [1200, 1400]);
  }
}
/* 3 빈 벽 — 문턱을 찾아야 경첩이 보인다. v 0 돌문을 당긴다 · 1 들어가기 · 2 최종 신전으로 곧장(와이번을 본 뒤) */
function door(E, g, h, s, v) {
  if (!wqHas(h, 'threshold_found')) return void res(h, s, 3);
  if (!wqHas(h, 'temple_open')) {
    if (v !== 0) return void res(h, s, 4);
    setAll(h, 'temple_open'); call(E, g, h, '돌문이 열렸다', 1.6, 'eqClank');
    return void res(h, s, 1);
  }
  if (v === 1) return void go(E, g, h, 'wq_bridge', [1200, 1460]);
  if (v === 2 && wqHas(h, 'wyvern_found')) return void go(E, g, h, 'wq_sanctum', [1200, 1380]);
  res(h, s, 6);
}
/* 5 · 7 제단 — 처음 보면 글 · 불씨를 가지고 오면 v 0 「불씨를 숨결 가까이에 둔다」 */
function altar(E, g, h, s, v) {
  if (wqHas(h, 'awakened')) return void res(h, s, 6);
  if (wqHas(h, 'ember_got') && v === 0) {
    setAll(h, 'awakened');
    E.fx(g, h.map, { kind: 'call', x: T.duel.at[0], y: T.duel.at[1] - 200, text: '와이번이 깨어난다', color: GOLD, t: 2.4, life: 2.4, snd: 'lvup', who: h.pi });
    return void res(h, s, 1);
  }
  const n0 = looks(h);
  setAll(h, 'look_altar');
  lookNote(E, g, h, n0);
  res(h, s, 1);
}
// 잠든 신전 세 곳 — 하나 볼 때마다 「조사 n/3」, 다 보면 새 단계 안내(머리 위 글 + 채팅 한 줄)
const looks = (h) => WQ_LOOKS.filter((n) => wqHas(h, n)).length;
function lookNote(E, g, h, n0, a0) {
  const an = AQ_LOOKS.filter((n) => wqHas(h, n)).length;          // 귀환로의 흔적 셋 — 조사 n/3, 다 보면 표지석
  if (a0 != null && an !== a0) {
    if (an < AQ_LOOKS.length) return void call(E, g, h, `조사 ${an}/${AQ_LOOKS.length}`, 1.6);
    return void call(E, g, h, '쓰러진 표지석을 읽을 수 있다', 2.2, 'lvup');
  }
  const n = looks(h);
  if (n === n0) return;
  if (n < WQ_LOOKS.length) return void call(E, g, h, `조사 ${n}/${WQ_LOOKS.length}`, 1.6);
  call(E, g, h, '새 단계 — 와이번을 깨울 불씨', 2.6, 'lvup');
  tell(E, g, h, WQ_FOUND.map((l) => l.slice(l.indexOf('|') + 1)).join(' '));
}

/* ── 시련 · 결투 — 시험 체력과 자리만 본다(레벨 · 장비 · 직업 무관). 표적은 몹 목록에 넣지 않는다 ── */
export const inTrial = (h) => !!(h && h.wqRun && h.wqRun.tr);
const tdist = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) / SQ);
const here = (h) => [h.x, h.y];
function endTrial(h) { if (h.wqRun) h.wqRun.tr = null; }
const TRIAL_MAP = { bridge: 'wq_bridge', gallery: 'wq_gallery', oath: 'wq_oath', duel: 'wq_sanctum', anchor: 'wq_return' };
function quitTrial(E, g, h) {
  if (!inTrial(h)) return;
  const id = h.wqRun.tr.id;
  endTrial(h);
  if (id === 'anchor') return void tell(E, g, h, '귀환로 시련을 멈췄다. 잠근 고정쇠는 그대로 남는다. 다음 고정쇠에서 다시 시작할 수 있다.');
  if (id !== 'duel') E.place(g, h, T[id].start[0], T[id].start[1]);
  tell(E, g, h, id === 'duel' ? '결투를 멈췄다. 깨어 있는 와이번에게 다시 말을 걸면 도전할 수 있다.' : '시련을 멈췄다. 비문 앞에서 다시 시작할 수 있다.');
}
function newTrial(id) {
  if (id === 'bridge') return { id, t: 0, ph: 0, pt: 0, got: 0 };
  if (id === 'gallery') return { id, t: 0, round: 0, pt: -1.0, mark: -1, roar: 0 };
  if (id === 'oath') return { id, t: 0, ph: 0, pt: 0, hits: 0, slam: null, cd: 0 };
  if (id === 'anchor') return { id, t: 0, n: 0, ph: 0, pt: 0, side: -1, wy: -1, base: -1, hold: 0 };
  return { id, t: 0, hp: T.duel.hp, me: T.duel.me, shown: 0, pat: -1, ph: 0, pt: -T.duel.idle, cd: 0, wind: 0, aim: [0, 1], land: null, at: [...T.duel.at], hz: T.duel.hover };
}
function trialStart(E, g, h, s, id) {
  const tr = newTrial(id);
  run(h).tr = tr;
  if (id === 'anchor') {                                         // 귀환로 — 자리를 옮기지 않고 아직 안 잠근 첫 고정쇠부터
    tr.n = [0, 1, 2].find((i) => !wqHas(h, `a_lock${i + 1}`)) ?? 0;
    tr.pt = AQ.grace;
    tell(E, g, h, `끊어진 귀환로 — ${tr.n + 1}번 돌판에 올라서면 잔영이 움직인다. 붉은 원을 보고 아스라를 다른 표식으로 부르자.`, GOLD);
    return void res(h, s, 1);
  }
  const P = T[id];
  E.place(g, h, P.start[0], P.start[1]);
  if (id === 'gallery') tr.mark = Math.floor(Math.random() * 3);
  tell(E, g, h, id === 'duel' ? `${WQ_NAME}: “내 날개가 어디를 향하는지 네 눈으로 보면서 버텨 봐라.”` : `${T.names[id]} — 시작. 레벨 · 장비 · 직업은 시련에 영향을 주지 않는다.`, GOLD);
  res(h, s, 1);
}
function pass(E, g, h, flag, text) {
  endTrial(h);
  setAll(h, flag);
  call(E, g, h, text, 2, 'lvup');
}

/* 바람다리 — 깃발(ph 0 처짐 · 1 들림 · 2 강풍). 강풍 순간 홈 밖이면 지난 홈(없으면 출발점)으로 밀린다 */
const B = T.bridge;
function tickBridge(E, g, h, tr, dt) {
  const len = [B.calm, B.lift, B.gust][tr.ph];
  B.grooves.forEach((p, i) => { if (i === tr.got && tdist(here(h), p) <= B.r) { tr.got = i + 1; E.fx(g, h.map, { kind: 'call', x: p[0], y: p[1] - 80, text: `홈 ${i + 1}/3`, color: GOLD, t: 0.9, life: 0.9, snd: 'eqBeep', who: h.pi }); } });
  if (tr.got >= B.grooves.length && tdist(here(h), B.goal) <= B.goalR) return void pass(E, g, h, 'trial_bridge', '바람다리를 건넜다');
  if ((tr.pt += dt) < len) return;
  tr.pt = 0; tr.ph = (tr.ph + 1) % 3;
  if (tr.ph === 2) {                                              // 강풍이 분다 — 홈 안이면 버틴다
    const safe = B.grooves.some((p) => tdist(here(h), p) <= B.r);
    if (!safe) {
      const back = tr.got > 0 ? B.grooves[tr.got - 1] : B.start;
      E.place(g, h, back[0], back[1]);
      tell(E, g, h, tr.got > 0 ? '강풍에 밀려 마지막 홈으로 돌아왔다. 지나온 홈은 남는다.' : '강풍에 밀려 다리 앞으로 돌아왔다.', RED);
    }
  }
}
/* 비늘의 회랑 — 회차마다 발톱 자국(예고 warn) → 포효. 자국 난 석상 앞 부채꼴 안이면 그 회차를 다시, 발판 밖이어도 다시 */
const GL = T.gallery;
export function wqInFan(i, x, y) {
  const [sx, sy] = GL.statues[i], dx = x - sx, dy = (y - sy) / SQ, d = Math.hypot(dx, dy);
  if (d > GL.reach || dy <= 0) return false;
  return Math.abs(Math.atan2(dx, dy)) <= GL.arc;
}
function tickGallery(E, g, h, tr, dt) {
  tr.pt += dt;
  if (tr.roar > 0) { tr.roar = Math.max(0, tr.roar - dt); return; }
  if (tr.pt < GL.warn) return;
  // 포효 — 셋이 함께 울지만 발톱은 하나만
  tr.roar = GL.gap; tr.pt = 0;
  for (let i = 0; i < 3; i++) E.fx(g, h.map, { kind: 'call', x: GL.statues[i][0], y: GL.statues[i][1] - 230, text: '크르릉', color: i === tr.mark ? RED : WARN, t: 0.8, life: 0.8, snd: i ? undefined : 'eqClank', who: h.pi });
  const hit = wqInFan(tr.mark, h.x, h.y), onPlate = GL.plates.some((p, i) => i !== tr.mark && tdist(here(h), p) <= GL.plateR);
  if (hit || !onPlate) {
    E.place(g, h, GL.start[0], GL.start[1]);
    tell(E, g, h, hit ? `발톱 자국이 난 ${tr.mark + 1}번째 석상 앞에 서 있었다. 붉은 부채꼴이 맞은 자리다. 이 회차를 다시 한다.` : '포효 순간 빈 발판 위에 있지 않았다. 이 회차를 다시 한다.', RED);
  } else if (++tr.round >= GL.rounds) return void pass(E, g, h, 'trial_gallery', '비늘의 회랑을 지났다');
  else call(E, g, h, `회차 ${tr.round}/${GL.rounds} 통과`, 1.2);
  let m = Math.floor(Math.random() * 3);
  if (m === tr.mark) m = (m + 1 + Math.floor(Math.random() * 2)) % 3;   // 다음 회차에는 공격 방향이 바뀐다
  tr.mark = m;
}
/* 맹세의 문 — ph 0 날개 닫힘 · 1 내려찍기 예고 · 2 숨 고르기(날개 펼침). 적중 수로만 판정 */
const OA = T.oath;
function tickOath(E, g, h, tr, dt) {
  tr.cd = Math.max(0, tr.cd - dt);
  const len = [OA.closed, OA.warn, OA.open][tr.ph];
  if ((tr.pt += dt) < len) return;
  tr.pt = 0;
  if (tr.ph === 0) { tr.ph = 1; tr.slam = [Math.round(h.x), Math.round(h.y)]; return; }
  if (tr.ph === 1) {
    E.fx(g, h.map, { kind: 'sk_eq_wave', x: tr.slam[0], y: tr.slam[1], r: OA.slamR, t: 0.4, life: 0.4, snd: 'eqClank' });
    if (tdist(here(h), tr.slam) <= OA.slamR) { E.place(g, h, OA.start[0], OA.start[1]); tell(E, g, h, '석상의 내려찍기에 밀려났다. 맞힌 횟수는 남는다.', RED); }
    tr.slam = null; tr.ph = 2; call(E, g, h, '날개를 편다 — 지금 다리를!', 1.2);
    return;
  }
  tr.ph = 0;
}
/* 결투 — 패턴 차례 0 날갯바람 · 1 용염 포효 · 2 비룡 급강하(+ 숨 고르기). ph 0 쉼 · 1 예고 · 2 숨 고르기(급강하 뒤) */
const DU = T.duel;
function tickDuel(E, g, h, tr, dt) {
  tr.cd = Math.max(0, tr.cd - dt);
  tr.pt += dt;
  if (tr.ph === 0) {
    tr.hz += (DU.hover - tr.hz) * Math.min(1, dt * 4);             // 낮게 떠서 날갯짓 — 일격이 닿는 높이(급강하 때만 높이 솟는다)
    if (tr.pt < 0) return;
    tr.pat = (tr.pat + 1) % 3; tr.ph = 1; tr.pt = 0;
    if (tr.pat === 0) tr.wind = Math.random() < 0.5 ? -1 : 1;
    if (tr.pat === 1) { const dx = h.x - tr.at[0], dy = (h.y - tr.at[1]) / SQ, L = Math.hypot(dx, dy) || 1; tr.aim = [dx / L, dy / L]; }
    if (tr.pat === 2) tr.land = null;
    return;
  }
  if (tr.ph === 1) {
    const P = tr.pat === 0 ? DU.wind : tr.pat === 1 ? DU.roar : DU.dive;
    if (tr.pat === 2) {
      if (tr.pt < P.rise) { tr.hz = DU.hover + 260 * (tr.pt / P.rise); return; }
      if (!tr.land) tr.land = [Math.round(h.x), Math.round(h.y)];   // 위에서 그림자가 멎는다 — 착지 원
      if (tr.pt < P.rise + P.warn) return;
      tr.at = [...tr.land]; tr.hz = 0;
      E.fx(g, h.map, { kind: 'sk_eq_wave', x: tr.land[0], y: tr.land[1], r: P.r, t: 0.45, life: 0.45, snd: 'eqClank' });
      if (tdist(here(h), tr.land) <= P.r) hurt(E, g, h, tr, P.dmg, '급강하에 깔렸다.');
      tr.shown = Math.max(tr.shown, 3); tr.ph = 2; tr.pt = 0;
      return void call(E, g, h, '숨을 고른다 — 지금!', 1.2);
    }
    if (tr.pt < P.warn) return;
    if (tr.pat === 0) {
      E.fx(g, h.map, { kind: 'sk_eq_wave', x: h.x, y: h.y, r: 90, t: 0.35, life: 0.35, snd: 'eqClank' });
      if (!DU.wind.holes.some((p) => tdist(here(h), p) <= P.r)) {
        E.place(g, h, Math.max(200, Math.min(2200, h.x + tr.wind * P.push)), h.y);
        hurt(E, g, h, tr, P.dmg, '날갯바람에 휩쓸렸다.');
      }
      tr.shown = Math.max(tr.shown, 1);
    } else {
      E.fx(g, h.map, { kind: 'sk_eq_wave', x: tr.at[0], y: tr.at[1], r: 120, t: 0.35, life: 0.35, snd: 'eqClank' });
      if (wqInRoar(tr, h.x, h.y)) hurt(E, g, h, tr, P.dmg, '용염 포효에 맞았다.');
      tr.shown = Math.max(tr.shown, 2);
    }
    tr.ph = 0; tr.pt = -DU.idle;
    return;
  }
  // 숨 고르기 — 다 지나면 날아올라 제자리로
  if (tr.pt >= DU.dive.rest) { tr.ph = 0; tr.pt = -DU.idle; tr.at = [...DU.at]; tr.hz = 30; }
}
export function wqInRoar(tr, x, y) {
  const dx = x - tr.at[0], dy = (y - tr.at[1]) / SQ, d = Math.hypot(dx, dy);
  if (d > DU.roar.reach) return false;
  if (d < 40) return true;
  return (dx * tr.aim[0] + dy * tr.aim[1]) / d >= Math.cos(DU.roar.arc);
}
function hurt(E, g, h, tr, n, why) {
  tr.me -= n;
  E.say(g, h.map, h.x, h.y - 90, `${why} 시험 체력 ${Math.max(0, tr.me)}`, RED);
  if (tr.me > 0) return;
  endTrial(h);
  E.place(g, h, DU.start[0], DU.start[1]);
  tell(E, g, h, `${WQ_NAME}: “아직이다.” 결투 입구로 물러났다. 깨어 있는 와이번에게 다시 말을 걸면 재도전할 수 있다.`, RED);
}

// 공격 — 평타 키 하나(시련 전용). 맹세의 문 · 결투에서만 쓴다
function trialSkill(E, g, h, k) {
  const tr = h.wqRun && h.wqRun.tr;
  if (!tr || k !== 'strike' || tr.cd > 0) return;
  tr.cd = T.strikeCd;
  const fa = E.face ? E.face(h) : [h.dir || 1, 0];
  E.fx(g, h.map, { kind: 'sk_wy_claw', x: h.x, y: h.y, ax: Math.round(fa[0] * 100) / 100, ay: Math.round(fa[1] * 100) / 100, r: 140, d: 0.05, arc: 0.8, t: 0.3, life: 0.3, pi: h.pi, snd: 'hit' });
  if (tr.id === 'oath') {
    const near = OA.legs.some((p) => tdist(here(h), p) <= OA.reach);
    if (!near) return;
    if (tr.ph !== 2) {
      E.place(g, h, h.x, Math.min(OA.start[1], h.y + OA.back));
      return void tell(E, g, h, '날개가 닫혀 있다 — 칼이 튕겨 나왔다.', WARN);
    }
    tr.hits++;
    E.fx(g, h.map, { kind: 'call', x: OA.statue[0], y: OA.statue[1] - 120, text: `${tr.hits}/${OA.hits}`, color: GOLD, t: 0.8, life: 0.8, snd: 'eqBeep', who: h.pi });
    if (tr.hits >= OA.hits) pass(E, g, h, 'trial_oath', '맹세의 문이 열렸다');
    return;
  }
  if (tr.id === 'duel') {
    if (tr.hz > 60 || tdist(here(h), tr.at) > DU.reach) return;
    const floor = DU.floor[Math.min(tr.shown, DU.floor.length - 1)];
    const dmg = tr.ph === 2 ? DU.restHit : DU.hit;
    tr.hp = Math.max(floor, tr.hp - dmg);
    E.fx(g, h.map, { kind: 'sk_wy_hit', x: tr.at[0], y: tr.at[1] - 60, t: 0.3, life: 0.3, pi: h.pi });
    if (tr.hp <= DU.end) {
      endTrial(h);
      setAll(h, 'duel_won');
      tell(E, g, h, `${WQ_NAME}: “…그만. 네 눈은 내 날개를 놓치지 않았다.” 와이번이 날개를 접는다.`, GOLD);
      call(E, g, h, '결투 끝', 2, 'lvup');
    }
  }
}

function tickTrial(E, g, h, dt) {
  const tr = h.wqRun.tr;
  if (h.map !== TRIAL_MAP[tr.id] || h.down > 0) return void endTrial(h);
  tr.t += dt;
  if (tr.id === 'bridge') tickBridge(E, g, h, tr, dt);
  else if (tr.id === 'gallery') tickGallery(E, g, h, tr, dt);
  else if (tr.id === 'oath') tickOath(E, g, h, tr, dt);
  else if (tr.id === 'anchor') tickAnchor(E, g, h, tr, dt);
  else tickDuel(E, g, h, tr, dt);
}

/* ── 아르카디온 획득 「돌아올 길을 지킨 검」 — 귀환로 고정쇠 셋(11월 27일) ─────────────
   tr = { n 지금 고정쇠, ph 0 기다림 · 1 내려찍기 예고 · 2 빗나간 뒤 조작, pt, side 내려찍는 표식(0 위 · 1 아래), wy 아스라 자리(-1 가운데 · 0 · 1), base 이 고정쇠를 시작할 때 아스라 자리, hold 끝 돌판을 붙듦 }
   적 체력 · 공격력 대신 예고 확인 → 아스라 지시 → 고정쇠 잠금으로 진행한다(레벨 · 장비 무관). 실패하면 그 고정쇠만 다시(잠근 고정쇠는 남는다) */
export const aqMarkAt = (n, m) => [1200, AQ.slabs[n] + (m ? AQ.mark : -AQ.mark)];
export const aqWyAt = (tr) => (tr.hold ? [AQ.holdX + 40, AQ.slabs[tr.n] + 10] : tr.wy < 0 ? [1200, AQ.slabs[tr.n]] : aqMarkAt(tr.n, tr.wy));
const pick2 = () => (Math.random() < 0.5 ? 0 : 1);
function anchorFail(E, g, h, tr, why) {
  tr.wy = tr.base; tr.hold = 0; tr.side = -1; tr.ph = 0; tr.pt = 0;   // 잘못된 조작은 처음으로
  E.place(g, h, 1200, AQ.slabs[tr.n] - 110);                      // 이 돌판 앞 안전한 자리로
  tell(E, g, h, `${why} ${tr.n + 1}번 고정쇠를 다시 한다. 잠근 고정쇠는 그대로다.`, RED);
}
function tickAnchor(E, g, h, tr, dt) {
  const y = AQ.slabs[tr.n];
  tr.pt += dt;
  if (tr.ph === 0) {
    if (tr.pt < AQ.grace || Math.abs(h.y - y) > AQ.band) return;
    // 첫 돌판은 아무 쪽 · 다음 돌판부터는 직전에 쓴 표식(아스라가 서 있는 쪽)을 노린다(계획서 2.4)
    tr.side = tr.wy >= 0 ? tr.wy : pick2(); tr.ph = 1; tr.pt = 0;
    return void call(E, g, h, '잔영이 칼을 든다 — 붉은 원을 보라', 1.4, 'eqClank');
  }
  if (tr.ph === 1) {
    if (tr.pt < AQ.warn) return;
    const [mx, my] = aqMarkAt(tr.n, tr.side);
    E.fx(g, h.map, { kind: 'sk_eq_wave', x: mx, y: my, r: AQ.slamR, t: 0.45, life: 0.45, snd: 'eqClank' });
    const wyHit = tr.wy < 0 || tr.wy === tr.side, meHit = tdist(here(h), [mx, my]) <= AQ.slamR;
    if (wyHit || meHit) return void anchorFail(E, g, h, tr, wyHit ? `잔영의 칼이 ${WQ_NAME}를 덮쳤다.` : '잔영의 칼에 맞았다.');
    tr.ph = 2; tr.pt = 0;
    return void call(E, g, h, tr.n === 2 ? '돌판이 기운다 — 아스라에게 붙들게!' : '빗나갔다 — 지금 고정쇠를!', 1.4);
  }
  if (tr.pt >= AQ.open) anchorFail(E, g, h, tr, '고정쇠를 잠글 때를 놓쳤다.');
}
function anchorAct(E, g, h, s, n) {
  const tr = inTrial(h) ? h.wqRun.tr : null;
  if (!tr) {
    if (wqHas(h, `a_lock${n + 1}`)) return void res(h, s, 6);
    if (n > 0 && !wqHas(h, `a_lock${n}`)) return void res(h, s, 3);
    return void trialStart(E, g, h, s, 'anchor');
  }
  if (tr.id !== 'anchor') return;
  if (tr.n !== n) return void tell(E, g, h, `지금은 ${tr.n + 1}번 고정쇠 차례다.`, WARN);
  if (tr.ph !== 2) return void tell(E, g, h, '잔영이 아직 이 돌판을 노리고 있다. 내려찍기를 먼저 넘기자.', WARN);
  if (n === 2 && !tr.hold) return void tell(E, g, h, `돌판이 기울어 고정쇠가 맞물리지 않는다. ${WQ_NAME}에게 돌판을 붙들게 하자.`, WARN);
  setAll(h, `a_lock${n + 1}`);
  call(E, g, h, `고정쇠 ${n + 1}/3`, 1.4, 'eqClank');
  if (n === 2) {
    endTrial(h);
    E.fx(g, h.map, { kind: 'sk_wy_gone', x: aqWyAt(tr)[0], y: aqWyAt(tr)[1], fl: 0, pi: h.pi, t: 0.5, life: 0.5 });
    return void tell(E, g, h, `세 고정쇠를 모두 잠갔다. ${WQ_NAME}가 바깥 발판으로 날아간다. 귀환로 머리의 귀환 지점이나 바깥 발판의 ${WQ_NAME}에게 가서 부르자.`, GOLD);
  }
  tr.n += 1; tr.ph = 0; tr.pt = 0; tr.side = -1; tr.hold = 0; tr.base = tr.wy;   // 아스라는 쓰던 표식 쪽 그대로 다음 돌판으로
}
function markerAct(E, g, h, n, m) {
  const tr = inTrial(h) ? h.wqRun.tr : null;
  if (!tr || tr.id !== 'anchor' || tr.n !== n) return;
  if (tr.ph !== 1) return void tell(E, g, h, tr.ph === 0 ? '잔영이 아직 움직이지 않았다.' : '지금은 고정쇠를 잠글 때다.', WARN);
  tr.wy = m;
  call(E, g, h, `${WQ_NAME} → ${m ? '아래' : '위'} 표식`, 0.9);
}
function holdAct(E, g, h) {
  const tr = inTrial(h) ? h.wqRun.tr : null;
  if (!tr || tr.id !== 'anchor' || tr.n !== 2 || tr.ph !== 2 || tr.hold) return;
  tr.hold = 1;
  call(E, g, h, `${WQ_NAME}가 돌판을 붙든다`, 1.2, 'eqClank');
}
/* 2.5 귀환 — 세 고정쇠를 잠근 뒤 귀환 지점에서 부르면 아스라가 바깥 발판에서 돌길을 건너온다. 기록을 먼저 남기고 장면은 그 뒤 */
function homeAct(E, g, h, s) {
  if (!wqHas(h, 'a_lock3')) return void res(h, s, 3);
  if (wqHas(h, 'a_return')) return void res(h, s, 6);
  setAll(h, 'a_return');
  run(h).sc = { k: 'return', t: 0, n: ((h.wqRun.sc && h.wqRun.sc.n) || 0) + 1 };
  res(h, s, 1);
}
/* 보상 — 아르카디온 한 자루. 가방이 차면 받지 않고(다시 수령 가능), 이미 가졌으면(관리자 지급) 확인만 하고 끝낸다. 연타 · 재접속은 a_got 깃발이 막는다 */
function swordAct(E, g, h, s, v) {
  if (wqHas(h, 'a_got')) return void res(h, s, 6);
  if (!wqHas(h, 'a_return') || v !== 0) return void res(h, s, 4);
  const b = h.bag;
  if (!b.w.some((w) => w.sp === WY_WEAPON_ITEM.id)) {
    if (!E.bagRoom || !E.bagRoom(h)) { tell(E, g, h, AQ_LINE.full, WARN); return void res(h, s, 7); }
    E.gear(h, WY_WEAPON_ITEM.id);
    if (!b.w.some((w) => w.sp === WY_WEAPON_ITEM.id)) return void res(h, s, 7);
    setAll(h, 'a_got');                                            // 무기와 수령 기록을 같은 저장(b.v)으로
    call(E, g, h, `${WY_WEAPON_ITEM.name} 획득`, 2.4, 'lvup');
    tell(E, g, h, `${WY_WEAPON_ITEM.name}을 가방에 넣었다. 캐릭터 레벨 ${WY_WEAPON_ITEM.lv}부터 들 수 있다.`, GOLD);
    return void res(h, s, 1);
  }
  setAll(h, 'a_got');
  tell(E, g, h, `이미 지닌 ${WY_WEAPON_ITEM.name}이 검날과 같은 결로 울린다. 돌판 아래 검은 그대로 두었다.`, GOLD);
  res(h, s, 8);
}

/* 2.1 칼등 정상 — 본인의 비룡의 계약이 실제로 나오면(wyvernJob.js 가 와이번에 summit 표시) 시작을 먼저 기록하고 장면을 튼다.
   장면 · 문은 그 사람에게만(외침 mine · 조사 자리는 내 화면에만). 장면 중 와이번은 바위 옆에 앉힌다(u.pin) */
function tickAqScene(E, g, h, dt) {
  const u = h.wy && h.wy.u;
  if (u && u.summit === 1) {
    u.summit = 2;
    if (wqOn(h) && aqReady(h) && !wqHas(h, 'a_start')) { setAll(h, 'a_start'); run(h).sc = { k: 'summit', t: 0, n: 1 }; }
  }
  const sc = h.wqRun && h.wqRun.sc;
  if (!sc) return;
  const t0 = sc.t; sc.t += dt;
  const at = (x) => t0 < x && sc.t >= x;
  if (sc.k === 'summit') {
    const P = AQ.scene;
    if (h.map !== AQ.summit.map) { if (u) u.pin = null; h.wqRun.sc = null; return void tell(E, g, h, `돌문은 칼등 정상에 남아 있다. ${AQ_LINE.goal}`); }
    if (u && sc.t >= P.sit && sc.t < P.end) u.pin = [AQ.sit[0], AQ.sit[1], 0];
    if (at(P.dust)) E.fx(g, h.map, { kind: 'call', x: AQ.door[0], y: AQ.door[1] - 170, text: '…', color: WARN, t: 1, life: 1, snd: 'eqClank', who: h.pi, mine: 1 });
    if (at(P.say)) { E.fx(g, h.map, { kind: 'call', x: AQ.sit[0], y: AQ.sit[1] - 190, text: '저 검집은 기억난다', color: GOLD, t: 2, life: 2, snd: 'wyCry', who: h.pi, mine: 1 }); tell(E, g, h, AQ_LINE.memory.replace('|', ': “') + '”'); }
    if (at(P.title)) { E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 160, text: AQ_TITLE, color: GOLD, t: 2.6, life: 2.6, snd: 'lvup', who: h.pi, mine: 1 }); tell(E, g, h, `「${AQ_TITLE}」 — ${AQ_LINE.goal}`, GOLD); }
    if (sc.t >= P.end) { if (u) u.pin = null; h.wqRun.sc = null; }
    return;
  }
  if (sc.k === 'return') {
    if (h.map !== 'wq_return') { h.wqRun.sc = null; return; }
    if (at(AQ.walk * 0.72)) E.fx(g, h.map, { kind: 'call', x: AQ.sword[0], y: AQ.sword[1] - 120, text: '검날의 장력이 풀린다', color: GOLD, t: 1.8, life: 1.8, snd: 'eqClank', who: h.pi, mine: 1 });
    if (at(AQ.walk)) AQ_LINE.back.forEach((l) => tell(E, g, h, l.replace('|', ': “') + '”'));
    if (sc.t >= AQ.walk + 0.6) { h.wqRun.sc = null; tell(E, g, h, `다음 — 끝 돌판 아래 검날에서 ${WY_WEAPON_ITEM.name}을 뽑는다.`, GOLD); }
  }
}
// 아스라가 지금 어디 있나(그림) — 안쪽 방 자리 · 시련 · 바깥 발판 · 건너오는 길. 없으면 null
export function aqWyvernAt(h, v) {
  if (!h || h.map !== 'wq_return' || !aqReady(h)) return null;
  const tr = v && v.tr && v.tr.id === 'anchor' ? v.tr : null;
  if (tr) return { x: aqWyAt(tr)[0], y: aqWyAt(tr)[1], hz: tr.hold ? 0 : 20, fl: 0 };
  const sc = v && v.sc && v.sc.k === 'return' ? v.sc : null;
  if (sc) {
    const k = Math.min(1, sc.t / AQ.walk), y0 = AQ.footing[1], y1 = AQ.home[1] + 70;
    return { x: 1200, y: y0 + (y1 - y0) * k, hz: k < 1 ? 26 : 0, fl: 0, walk: k < 1 };
  }
  if (wqHas(h, 'a_return')) return { x: AQ.home[0] + 110, y: AQ.home[1] + 70, hz: 0, fl: 1 };
  if (wqHas(h, 'a_lock3')) return { x: AQ.footing[0], y: AQ.footing[1], hz: 0, fl: 1 };
  if (wqHas(h, 'a_latch')) return { x: 1200, y: AQ.slabs[[0, 1, 2].find((i) => !wqHas(h, `a_lock${i + 1}`)) ?? 0], hz: 20, fl: 0 };
  return { x: AQ.seat[0], y: AQ.seat[1], hz: 0, fl: 1 };
}

/* ── 계승 — 유일 규칙(hiddenUnique.js)을 거쳐 해금(마술사 루트와 같은 흐름). 테스트 서버에서는 직업이 아직 연습장 전용이라 기록만 남긴다 ── */
function contract(E, g, h, yes) {
  if (!wqHas(h, 'answer_done') || wqHas(h, 'claimed') || h.map !== 'wq_sanctum') return;
  const s = wqSpotById('sn-desk');
  if (dist(h, s.at) > s.r * 1.6) return;
  if (!yes) { setAll(h, 'inherit_later'); return void tell(E, g, h, WQ_DESK.later); }
  if (!WYVERN.live) { setAll(h, 'claimed'); return void tell(E, g, h, WQ_DESK.test, GOLD); }   // shortcut: 직업이 연습장 전용(WYVERN.live false)이라 깃발만 — 실제 게임에 열 때 저장 · 스냅샷 · 칸을 붙인다
  if (run(h).ask) return;
  if (!hiddenEnforced(g, h)) return void finish(E, g, h);
  if (hiddenTaken(g, h, WYVERN_ID)) return void tell(E, g, h, WQ_DESK.taken);
  run(h).ask = { t: 0 };
  hiddenAsk(g, h, WYVERN_ID);
}
function tickAsk(E, g, h, dt) {
  const r = h.wqRun, a = r && r.ask;
  if (!a) return;
  const rep = hiddenReply(h, WYVERN_ID);
  if (rep) {
    r.ask = null;
    if (rep.ok) return void finish(E, g, h);
    if (rep.err === 'taken') return void tell(E, g, h, WQ_DESK.taken);
    if (rep.err === 'account') return void tell(E, g, h, `서버 계정이 없는 캐릭터는 ${WYVERN_NAME} 를 계승할 수 없다.`);
    return void tell(E, g, h, WQ_DESK.error);
  }
  if ((a.t += dt) > 10) { r.ask = null; tell(E, g, h, WQ_DESK.error); }
}
function finish(E, g, h) {
  setAll(h, 'claimed');
  unlockWyvern(h);
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 150, text: `${WYVERN_NAME} 계승`, color: GOLD, t: 2.4, life: 2.4, snd: 'lvup', who: h.pi });
  const J = h.bag.hj.jobs[WYVERN_ID];
  tell(E, g, h, `${WQ_NAME}와 서약을 나눴다. ${WYVERN_NAME} — 1차 전직은 사라졌다. ${J.lv > 1 ? `예전 기록(직업 레벨 ${J.lv})에서 이어 간다.` : '직업 레벨 1 용조격부터 시작한다. 와이번 소환은 직업 레벨 5 에 열린다.'}`);
}

/* ── 시간 — 영웅마다(rpg.js 영웅 반복) ── */
export function tickWq(E, g, h, dt) {
  if (!h || !h.bag) return;
  h.wyt = g.test ? 1 : 0;
  if (h.wy && h.wy.u && h.wy.u.summit === 1) run(h);              // 칼등 정상 소환 — 아르카디온 획득 시작
  if (!h.wqRun) { if (wqMap(h.map)) run(h); else return; }
  if (h.wqRun.tr) tickTrial(E, g, h, dt);
  tickAsk(E, g, h, dt);
  tickAqScene(E, g, h, dt);
  const r = h.wqRun;
  if (!wqMap(h.map) && !r.tr && !r.ask && !r.sc && !((r.keep = (r.keep || 0) - dt) > 0)) h.wqRun = null;
}

/* ── 단계 건너뛰기 — 테스트 서버 「도구」. 그 단계 앞까지 깃발을 세우고 그 자리에 선다 ── */
export function wqStage(h, n) {
  const kk = Math.floor(Number(n) || 0);
  if (kk >= WQ_STAGES.length) return aqStage(h, kk - WQ_STAGES.length);
  const k = Math.max(0, Math.min(WQ_STAGES.length - 1, kk));
  h.bag.wu = { f: [0, 0] };
  for (let i = 0; i <= k; i++) for (const f of WQ_STAGES[i].set) setFlag(h, f);
  h.wqRun = null;
  save(h);
  const S = WQ_STAGES[k];
  h.map = S.map; h.x = S.at[0]; h.y = S.at[1];
  h.hold = []; h.dest = null; h.dash = 0; h.gateCd = 1.5;
  return S.name;
}

// 아르카디온 단계 — bag.au 만 다시 채운다(「잠든 날개의 서약」 진행은 그대로)
function aqStage(h, n) {
  const k = Math.max(0, Math.min(AQ_STAGES.length - 1, n));
  h.bag.au = { f: [0] };
  for (let i = 0; i <= k; i++) for (const f of AQ_STAGES[i].set) setFlag(h, f);
  h.wqRun = null;
  save(h);
  const S = AQ_STAGES[k];
  h.map = S.map; h.x = S.at[0]; h.y = S.at[1];
  h.hold = []; h.dest = null; h.dash = 0; h.gateCd = 1.5;
  return S.name;
}

/* ── 스냅샷 영웅 줄 66 ── 0 이면 아무것도 없다 */
const r1 = (v) => Math.round(v * 10) / 10;
function packTr(t) {
  if (!t) return 0;
  if (t.id === 'bridge') return ['bridge', t.ph, r1(t.pt), t.got];
  if (t.id === 'gallery') return ['gallery', t.round, r1(t.pt), t.mark, r1(t.roar)];
  if (t.id === 'oath') return ['oath', t.ph, r1(t.pt), t.hits, t.slam || 0];
  if (t.id === 'anchor') return ['anchor', t.n, t.ph, r1(t.pt), t.side, t.wy, t.hold];
  return ['duel', t.hp, t.me, t.shown, t.pat, t.ph, r1(t.pt), t.wind, [Math.round(t.aim[0] * 100) / 100, Math.round(t.aim[1] * 100) / 100], t.land || 0, t.at, Math.round(t.hz)];
}
function unpackTr(a) {
  if (!Array.isArray(a)) return null;
  const id = a[0];
  if (id === 'bridge') return { id, ph: a[1], pt: a[2], got: a[3] };
  if (id === 'gallery') return { id, round: a[1], pt: a[2], mark: a[3], roar: a[4] };
  if (id === 'oath') return { id, ph: a[1], pt: a[2], hits: a[3], slam: a[4] || null };
  if (id === 'anchor') return { id, n: a[1], ph: a[2], pt: a[3], side: a[4], wy: a[5], hold: a[6] };
  if (id === 'duel') return { id, hp: a[1], me: a[2], shown: a[3], pat: a[4], ph: a[5], pt: a[6], wind: a[7], aim: a[8], land: a[9] || null, at: a[10], hz: a[11] };
  return null;
}
export function packWq(h) {
  const r = h.wqRun;
  if (!r && !h.wyt) return 0;
  const sc = r && r.sc ? [r.sc.k, r1(r.sc.t), r.sc.n] : 0;          // 아르카디온 획득 장면(정상 · 귀환)
  return [h.wyt ? 1 : 0, r ? r.R : 0, packTr(r && r.tr), r ? Object.entries(r.w).map(([k, n]) => [k, n]) : 0, sc];
}
export function applyWq(h, a) {
  if (!a) { h.wqv = null; h.wyt = 0; return; }
  const [wyt, R, tr, w, sc] = a;
  h.wyt = wyt;   // 손님 화면 — 테스트 서버에서 열렸는지
  h.wqv = { R: R || [-1, 0, 0], w: w ? Object.fromEntries(w) : {}, tr: unpackTr(tr), sc: Array.isArray(sc) ? { k: sc[0], t: sc[1], n: sc[2] } : null };
}
// 화면 값 — 손님은 스냅샷(h.wqv), 방장 브라우저는 판정 값에서 바로 만든다
export function wqView(h) {
  if (!h) return null;
  if (h.wqRun || (h.wyt && !h.wqv)) { const o = {}; applyWq(o, packWq(h)); return o.wqv; }
  return h.wqv || null;
}
export const wqTopOf = (map) => (MAP_OF[map] ? MAP_OF[map].top : 0);
