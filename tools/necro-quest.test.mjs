/* Necromancer 004 획득 루트 「그림자 군주」(11월 20일, 사용자 기획안 「획득루트 최종수정안」) — 저장 · 의식 · 퍼즐 · 미믹 · 빛 띠 · 시험 · 계승 · 유일 규칙.
   node --test tools/necro-quest.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgTrain, MAPS, SNAP_ORDER } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag, whyEquip } from '../src/game/shop.js';
import { rpgAdminCmd } from '../src/game/adminCmd.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { NQ_SPOTS, NQ_MAPS, NQ_FLAGS, NQ_TRIALS, NQ_HAZARDS, NQ_STAGES, NQ_GAUGE, NQ_SEALS } from '../src/game/necroQuestData.js';
import { nqHas, cleanNu, nqSpotNear, nqSpotShown, nqInTrial, nqView, nqGhost, nqLaneState } from '../src/game/necroQuest.js';
import { necroOn, necroView } from '../src/game/necroJob.js';
import { holds } from '../src/game/hiddenUnique.js';
import { NC_WEAPON_ITEM } from '../src/game/necroData.js';
const MAP_IDS = SNAP_ORDER.maps;

function setup(extra = {}) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'g0', name: '망자', hero: { name: '망자', job: 'mage', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '망자', admin: !extra.plain, rs: RESET.id, gift: GIFT.id, lv: 1, ts: 0, coins: 10, stats: {}, bag: { oc: 1, n: 1, w: [], e: 0, ...(extra.bag || {}) } }, 'g0');
  const h = g.heroes[0]; h.auto = 0; h.cd = 0; g.eqClock = () => g.t;
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / .05); n++) rpgStep(g, .05); };
const spot = (id) => NQ_SPOTS.find((s) => s.id === id);
const at = (h, id) => { const s = spot(id); h.map = s.map; h.x = s.at[0]; h.y = s.at[1]; };
const act = (g, id, v) => { at(g.heroes[0], id); rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'act', id, v } }); return g.heroes[0].nqRun?.R[1]; };
const skill = (g, s) => rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'skill', s } });
const cmd = (g, c) => rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'cmd', c } });

test('맵 · 그림 — 탐험 맵 13곳은 MAP_IDS 끝 · 모두 안전 지역 · 바닥 그림 · 사냥터 출구 없음 · 마을에 새 문이 없다', () => {
  const at = MAP_IDS.indexOf(NQ_MAPS[0].id);   // 11월 22일부터 뒤에 바깥 장소(별이슬숲 …)가 붙는다
  assert.deepEqual(MAP_IDS.slice(at, at + NQ_MAPS.length), NQ_MAPS.map((m) => m.id));
  assert.equal(MAP_IDS[at + NQ_MAPS.length], 'dew-forest');
  for (const m of NQ_MAPS) {
    assert.ok(MAPS[m.id].safe, m.id);
    assert.ok(existsSync(`public/assets/game/rpg/story/ground/${m.id}.webp`), m.id);
    assert.ok(!MAPS[m.id].gates.some((q) => MAPS[q.to]?.zone), '사냥터로 가는 출구가 없다');
  }
  for (const f of ['props', 'generals']) assert.ok(existsSync(`public/assets/game/rpg/necro-quest/${f}.webp`), f);
  assert.ok(!MAPS.dawnwood.gates.some((q) => String(q.to).startsWith('necro_')), '마을에는 빛나는 문 · 이름표를 두지 않는다');
  for (const s of NQ_SPOTS) if (s.map !== 'dawnwood') assert.ok(s.at[0] > 0 && s.at[0] < 2400 && s.at[1] >= MAPS[s.map].top && s.at[1] < 1600, `${s.id} 자리`);
  assert.ok(NQ_FLAGS.length <= 4 * 24);
  for (const st of NQ_STAGES) assert.ok(st.set.every((f) => NQ_FLAGS.includes(f)), st.name);
});

test('저장 — bag.nu 를 싣고 이상한 값은 버린다', () => {
  const b = cleanBag({ oc: 1, nu: { f: [5, -1], d: { dir: 0, tq: 7, zz: 3, rs: 999 }, t: 9 } });
  assert.deepEqual(b.nu.f.slice(0, 2), [5, 0]); assert.deepEqual(b.nu.d, { dir: 0, tq: 7 }); assert.equal(b.nu.t, 3);
  assert.equal(cleanBag({ oc: 1 }).nu, undefined);
  assert.equal(cleanNu({ f: [0], d: {} }), null);
});

test('1장 — 쪽문 · 묘비를 북으로 · 횃불 셋을 끄고 8초 가만히 → 계단 · 검을 돌려 첫 인장', () => {
  const { g, h } = setup();
  h.map = 'dawnwood'; h.x = 845; h.y = 1745;
  assert.equal(nqSpotNear(h)?.id, 'v-gate');
  assert.equal(act(g, 'v-gate'), 4, '먼저 첫 말을 보여 준다');
  act(g, 'v-gate', 1); assert.equal(h.map, 'necro_nameless_graves'); assert.ok(nqHas(h, 'walk'));
  assert.equal(nqSpotShown(h, spot('g-stair')), false);
  act(g, 'g-dial', 0);
  for (const i of [0, 1, 2]) act(g, `g-t${i}`);
  at(h, 'g-grave'); run(g, 4);
  h.x += 30; run(g, 5);                            // 움직이면 처음부터
  assert.ok(!nqHas(h, 'steps'));
  run(g, 4);
  assert.ok(nqHas(h, 'steps'), '의식');
  act(g, 'g-stair', 1); assert.equal(h.map, 'necro_catacomb');
  assert.equal(act(g, 'c-statue'), 3);
  act(g, 'c-sword'); assert.equal(act(g, 'c-statue'), 1); assert.ok(nqHas(h, 'seal0'));
  assert.equal(act(g, 'c-seven'), 3, '일곱 인장이 없으면 잠김');
  act(g, 'c-wall', 1); assert.equal(h.map, 'necro_old_graves');
});

test('2장 — 유품 다섯 · 차례 · 미믹은 피해 없이 밀어내고 인장 빛으로 봉인', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 1');
  for (const r of ['o-r0', 'o-r1', 'o-r2', 'o-r3', 'o-r4']) act(g, r);
  assert.equal(act(g, 'o-gate', [1, 0, 2, 3, 4]), 2);
  assert.equal(act(g, 'o-gate', [0, 1, 2, 3, 4]), 1); assert.ok(nqHas(h, 'banner'));
  const hp = h.hp;
  act(g, 'o-cof1', 0); run(g, 3);
  assert.ok(h.hp >= hp, '미믹은 피해가 없다');
  act(g, 'o-cof1', 2); assert.ok(nqHas(h, 'cofMimic'));
});

test('4장 — 수문은 왼쪽 → 오른쪽 → 압력계 안전 구간의 가운데', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 3');
  act(g, 'rv-grate', 1); assert.equal(h.map, 'necro_sunken_temple');
  act(g, 't-gL'); act(g, 't-gR');
  g.t = 0;                                          // 위험 구간
  assert.equal(act(g, 't-gC'), 2); assert.ok(!nqHas(h, 'gates'));
  act(g, 't-gL'); act(g, 't-gR');
  g.t = NQ_GAUGE.safe[0] + 0.5;
  assert.equal(act(g, 't-gC'), 1); assert.ok(nqHas(h, 'gates'));
});

test('시험 — 검의 길 · 병사를 지켜라 · 실패는 그 시험만 다시', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 2');
  for (const id of ['b-roll', 'b-sw0', 'b-sw1', 'b-socket']) act(g, id);
  assert.equal(act(g, 'b-kardon', [1, 1, 0]), 2);
  assert.equal(act(g, 'b-kardon', [1, 1, 1]), 1); assert.ok(nqHas(h, 'quiz'));
  act(g, 'b-kardon', 'start'); assert.ok(nqInTrial(h));
  const T = NQ_TRIALS.path;
  for (const p of T.pads) { h.nqRun.tr.hp = 100; [h.x, h.y] = p; run(g, .1); }
  assert.ok(nqHas(h, 'pathT'), '검의 길');
  act(g, 'b-kardon', 'start');
  assert.equal(h.nqRun.tr.id, 'guard');
  h.nqRun.tr.hp = 0; run(g, .1);
  assert.equal(h.nqRun.tr.hp, 100, '실패하면 시험만 처음부터');
  for (let i = 0; i < 70; i++) { for (const f of h.nqRun.tr?.fo || []) f.hp = 0; skill(g, 'strike'); h.nqRun.tr && (h.nqRun.tr.cd.strike = 0); run(g, 1); }
  assert.ok(nqHas(h, 'sSword') && nqHas(h, 'm1'), '검의 인장');
  assert.ok(!nqInTrial(h));
});

test('시험 — 잔상 · 명령 연습(말뚝은 그림자만)', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 6');
  at(h, 'f-coffin');
  assert.equal(act(g, 'f-coffin', [0, 1, 2, 3, 4]), 3);
  for (let i = 0; i < 6; i++) act(g, `f-k${i}`);
  assert.equal(act(g, 'f-coffin', [0, 1, 2, 3, 4]), 2, '가짜 장면(밤 잔치)은 뺀다');
  assert.equal(act(g, 'f-coffin', [0, 1, 2, 4, 5]), 1);
  act(g, 'f-orben', 'start');
  const T = NQ_TRIALS.echo;
  for (const [a, b] of T.scenes) { [h.x, h.y] = T.plates[b]; run(g, T.delay + .3); [h.x, h.y] = T.plates[a]; run(g, .2); }
  assert.ok(nqHas(h, 'sTime'), '잔상 세 장면');
  const w = setup();
  rpgAdminCmd(w.g, 0, '/네크로맨서 망자 루트 10');
  act(w.g, 'k-drill', 'start'); const tr = () => w.h.nqRun.tr;
  [w.h.x, w.h.y] = tr().fo[0] ? [tr().fo[0].x, tr().fo[0].y] : [w.h.x, w.h.y];
  skill(w.g, 'strike'); assert.equal(tr().fo[0].hp, 3, '말뚝은 시험 기술로 쓰러지지 않는다');
  for (let i = 0; i < 80 && tr(); i++) { cmd(w.g, 'call'); cmd(w.g, 'attack'); if (tr()) tr().cd.call = 0; run(w.g, 1); }
  assert.ok(nqHas(w.h, 'drill'), '말뚝 1 → 3 → 6');
});

test('관측소 빛 띠 — 띠 위에 서 있다 쓸리면 입구로', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 8');
  const z = NQ_HAZARDS[0], lane = z.lanes[0];
  h.map = 'necro_observatory'; h.x = 700; h.y = (lane.y0 + lane.y1) / 2;
  g.t = lane.off + 0.2; assert.ok(nqLaneState(z, lane, g.t).on);
  run(g, .1);
  assert.deepEqual([Math.round(h.x), Math.round(h.y)], z.back.map(Math.round));
});

test('왕궁 · 계승 — 세 단계 · 문양 · 계승하면 직업 · 그림자 낫(1레벨도 든다) · 저장', () => {
  const { g, h } = setup({ plain: 1 });
  h.admin = true; rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 11'); h.admin = false;
  act(g, 'p-altar', 'start');
  const tr = () => h.nqRun.tr, P = NQ_TRIALS.palace;
  assert.equal(tr().ph, 1);
  for (let i = 0; i < 200 && tr().ph === 1; i++) { tr().alt = 100; tr().hp = 100; tr().fo = []; run(g, 1); }
  assert.equal(tr().ph, 2); assert.equal(h.bag.nu.t, 2, '체크포인트');
  for (let i = 0; i < 100 && tr().ph === 2; i++) { tr().hp = 100; for (const f of tr().fo) f.hp = 0; [h.x, h.y] = P.start; skill(g, 'strike'); tr().cd.strike = 0; run(g, .5); }
  assert.equal(tr().ph, 3);
  for (const f of tr().fo.filter((q) => q.k === 'pylon')) f.hp = 0; skill(g, 'strike'); tr().cd.strike = 0;
  const lord = tr().fo.find((f) => f.k === 'lord'); lord.hp = 5; tr().hp = 100; run(g, .1);
  assert.equal(tr().gl, 1, '문양 단계');
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'glyph', v: [1, 0, 2, 3, 4, 5, 6] } });
  assert.equal(tr().gl, 0, '틀리면 잔영이 힘을 되찾는다');
  tr().fo.find((f) => f.k === 'lord').hp = 5; run(g, .1);
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'glyph', v: [0, 1, 2, 3, 4, 5, 6] } });
  assert.ok(nqHas(h, 'heir')); assert.ok(!nqInTrial(h)); assert.equal(h.bag.nu.t, 0);
  at(h, 'p-throne');
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'contract', yes: false } });
  assert.ok(nqHas(h, 'later')); assert.ok(!necroOn(h));
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'contract', yes: true } });
  assert.ok(necroOn(h)); assert.ok(nqHas(h, 'claim'));
  const w = h.bag.w.find((q) => q.sp === NC_WEAPON_ITEM.id);
  assert.ok(w); assert.equal(h.bag.e, w.u, '그림자 낫을 손에 든다');
  assert.deepEqual(whyEquip(h, w.u), [], '1레벨이어도 든다');
  const b = cleanBag(h.bag); assert.equal(b.hj.active, 'necromancer'); assert.equal(b.e, w.u);
  assert.ok(holds(b, 'necromancer'));
});

test('유일 규칙 — 다른 보유자가 있으면 왕궁 시험 · 왕좌가 열리지 않는다', () => {
  const { g, h } = setup({ plain: 1 });
  g.server = 1; h.loaded = 1; g.names = ['망자']; g.hjHold = { necromancer: ['다른사람'] };
  h.admin = true; rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 11'); h.admin = false;
  act(g, 'p-altar', 'start');
  assert.ok(!nqInTrial(h));
});

test('스냅샷 줄 61 · 62 — 손님 화면이 시험 · 직업 값을 받는다', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/네크로맨서 망자 루트 2');
  for (const id of ['b-roll', 'b-sw0', 'b-sw1', 'b-socket']) act(g, id);
  act(g, 'b-kardon', [1, 1, 1]); act(g, 'b-kardon', 'start');
  run(g, 0.5);
  const c = makeWorld(); c.mySeat = 0; rpgApply(c, structuredClone(rpgPack(g)));
  const v = nqView(c.heroes[0]);
  assert.equal(v.tr.id, 'path'); assert.equal(v.tr.hp, 100);
  rpgAdminCmd(g, 0, '/네크로맨서 망자 30');
  run(g, .2);
  const c2 = makeWorld(); c2.mySeat = 0; rpgApply(c2, structuredClone(rpgPack(g)));
  const nv = necroView(c2.heroes[0]);
  assert.equal(nv.lv, 30); assert.ok(Array.isArray(nv.sh));
  assert.equal(nqGhost({ t: 1, trail: [] }, 3), null);
  assert.equal(NQ_SEALS.length, 7);
});

test('병사를 지켜라 — 병사 셋은 정삼각형(세 변 길이가 같다)', () => {
  const [a, b, c] = NQ_TRIALS.guard.allies, d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  assert.ok(Math.abs(d(a, b) - d(b, c)) < 3 && Math.abs(d(b, c) - d(c, a)) < 3);
});

test('테스트 서버 — 여섯 장군 시험 앞으로 바로 가서 시험에 들어갈 수 있다 · 일반 서버는 거절', () => {
  const ids = ['t-valtern', 'a-room', 's-raedin', 'f-orben', 'r-morken', 'ob-erebos'];
  ids.forEach((id, i) => {
    const { g, h } = setup({ plain: 1 }); g.test = 1;
    assert.ok(rpgTrain(g, 0, { op: 'nq', n: i }), id);
    assert.equal(h.map, spot(id).map, id);
    if (['t-valtern', 's-raedin', 'f-orben', 'r-morken'].includes(id)) { act(g, id, 'start'); assert.ok(nqInTrial(h), `${id} 시험에 들어간다`); }
  });
  const { g } = setup({ plain: 1 });
  assert.equal(rpgTrain(g, 0, { op: 'nq', n: 0 }), false);
});

test('테스트 서버 — 퍼즐 건너뛰기 토글: 세리온 · 에레보스 문답 · 모르켄 봉인석 차례를 건너뛴다 · 일반 서버는 소용없다', () => {
  const on = (g) => { rpgTrain(g, 0, { op: 'skip' }); assert.ok(g.heroes[0].trn.skip); };
  { const { g, h } = setup({ plain: 1 }); g.test = 1; rpgTrain(g, 0, { op: 'nq', n: 1 });
    assert.equal(act(g, 'a-room', [9, 9, 9, 9, 9]), 2, '켜기 전에는 틀린 답이 막힌다'); on(g);
    act(g, 'a-room', null); assert.ok(nqHas(h, 'sRecord'), '켜면 차례 맞추기를 건너뛴다'); }
  { const { g, h } = setup({ plain: 1 }); g.test = 1; rpgTrain(g, 0, { op: 'nq', n: 5 }); on(g);
    act(g, 'ob-erebos', null); assert.ok(nqHas(h, 'sSilence'), '문답을 건너뛴다'); }
  { const { g, h } = setup({ plain: 1 }); g.test = 1; rpgTrain(g, 0, { op: 'nq', n: 4 }); on(g);
    act(g, 'r-morken', 'start'); const T = NQ_TRIALS.seal; assert.ok(nqInTrial(h));
    const tr = h.nqRun.tr;
    for (const j of [3, 1, 0]) { h.x = T.stones[j][0]; h.y = T.stones[j][1]; tr.cd.strike = 0; skill(g, 'strike'); run(g, 0.1); }
    assert.equal(tr.i, 3, '차례가 달라도 센다');
    assert.ok(nqInTrial(h), '아직 하나 남았다'); }
  { const { g, h } = setup({ plain: 1 }); h.trn = { skip: 1, log: [] }; rpgTrain(g, 0, { op: 'nq', n: 1 }); at(h, 'a-room');
    act(g, 'a-room', [9, 9, 9, 9, 9]); assert.ok(!nqHas(h, 'sRecord'), '테스트 서버가 아니면 건너뛰지 않는다'); }
});

test('시험 포기 — 진행 중인 시험만 끝내고 장군 곁으로 돌아온다 · 깃발은 그대로', () => {
  const { g, h } = setup({ plain: 1 }); g.test = 1; rpgTrain(g, 0, { op: 'nq', n: 0 });
  act(g, 't-valtern', 'start'); assert.ok(nqInTrial(h));
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'quit' } });
  assert.ok(!nqInTrial(h)); assert.equal(h.map, spot('t-valtern').map); assert.ok(nqHas(h, 'gates'));
  rpgInput(g, { cls: 0, kind: 'nq', dir: { op: 'quit' } });   // 시험 중이 아니면 아무 일 없다
  act(g, 't-valtern', 'start'); assert.ok(nqInTrial(h), '다시 도전할 수 있다');
});
