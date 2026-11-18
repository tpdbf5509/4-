/* Engineer 003 획득 루트 「최초의 설계자」(11월 19일, 사용자 기획안 v1.0) — 저장 · 퍼즐 · 미믹 · 위험 장치 · 시험 3단계 · 계약 · 유일 규칙.
   node --test tools/engineer-quest.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, MAPS, SNAP_ORDER } from '../src/game/rpg.js';
const MAP_IDS = SNAP_ORDER.maps;
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag } from '../src/game/shop.js';
import { rpgAdminCmd } from '../src/game/adminCmd.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { EQ_SPOTS, EQ_MAPS, EQ_FLAGS, EQ_TRIAL as TR, EQ_HAZARDS, EQ_STAGES } from '../src/game/engineerQuestData.js';
import { eqHas, cleanEu, eqSpotNear, eqSpotShown, eqHazardState, eqInTrial, eqView, eqMobHit } from '../src/game/engineerQuest.js';
import { engineerOn } from '../src/game/engineerJob.js';
import { existsSync } from 'node:fs';
Math.random = () => 0.999;

function setup(extra = {}) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'g0', name: '설계', hero: { name: '설계', job: 'archer', gender: 'f' } }]);
  rpgJoin(g, 0, { name: '설계', admin: !extra.plain, rs: RESET.id, gift: GIFT.id, lv: 3, ts: 0, coins: 10, stats: {}, bag: { oc: 1, n: 1, w: [], e: 0, ...(extra.bag || {}) } }, 'g0');
  const h = g.heroes[0]; h.auto = 0; h.cd = 0; g.eqClock = () => g.t;
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / .05); n++) rpgStep(g, .05); };
const spot = (id) => EQ_SPOTS.find((s) => s.id === id);
const at = (h, id) => { const s = spot(id); h.map = s.map; h.x = s.at[0]; h.y = s.at[1]; };
const act = (g, id, v) => { at(g.heroes[0], id); rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'act', id, v } }); return g.heroes[0].eqRun?.R[1]; };
const say = (g) => g.out.filter((o) => o.kind === 'sys' || o.text).map((o) => o.text || o.msg).join(' / ');

test('맵 · 그림 — 탐험 맵 16곳은 MAP_IDS 끝 · 안전 지역(시험장만 싸움) · 바닥 그림이 있다', () => {
  const tail = MAP_IDS.slice(-EQ_MAPS.length);
  assert.deepEqual(tail, EQ_MAPS.map((m) => m.id));
  for (const m of EQ_MAPS) {
    assert.equal(!!MAPS[m.id].safe, m.id !== 'eng-trial', m.id);
    assert.ok(existsSync(`public/assets/game/rpg/story/ground/${m.id}.webp`), m.id);
    assert.ok(!MAPS[m.id].gates.some((q) => MAPS[q.to]?.zone), '사냥터로 가는 출구가 없다');
  }
  for (const f of ['automaton', 'mimic', 'e003', 'bots', 'props']) assert.ok(existsSync(`public/assets/game/rpg/engineer-quest/${f}.webp`), f);
  assert.ok(MAPS.dawnwood.gates.some((q) => q.to === 'eng-oak'), '마을 목공소 문');
  for (const s of EQ_SPOTS) if (s.map !== 'dawnwood') assert.ok(s.at[0] > 0 && s.at[0] < 2400 && s.at[1] >= MAPS[s.map].top && s.at[1] < 1600, `${s.id} 자리`);
});

test('저장 — bag.eu 를 싣고 이상한 값은 버린다', () => {
  const b = cleanBag({ oc: 1, eu: { f: [7, -1, 'x'], d: { temp: 18, zzz: 4, tw: 9999 }, w: 99, t: 7 } });
  assert.deepEqual(b.eu.f.slice(0, 3), [7, 0, 0]);
  assert.deepEqual(b.eu.d, { temp: 18 }); assert.equal(b.eu.w, 9); assert.equal(b.eu.t, 3);
  assert.equal(cleanBag({ oc: 1 }).eu, undefined);
  assert.equal(cleanEu({ f: [0], d: {} }), null);
  assert.ok(EQ_FLAGS.length <= 4 * 24);
});

test('1~3장 — 미나 · 목공소 코드 3174(틀리면 세 번째에 힌트) · 미믹은 피해 없이 밀어내고 레버로 봉인 · 통로 위험 장치', () => {
  const { g, h } = setup();
  h.map = 'dawnwood'; h.x = 890; h.y = 1570;
  assert.equal(eqSpotNear(h, true)?.id, 'mina-ask');
  assert.equal(act(g, 'mina-ask', 2), 1); assert.ok(eqHas(h, 'mina'));
  assert.equal(eqSpotShown(h, spot('mina-ask')), false, '들은 뒤에는 미나에게 따로 묻지 않는다');
  act(g, 'oak-pad');
  assert.ok(eqHas(h, 'pad'));
  assert.equal(act(g, 'oak-pad', '1111'), 2); act(g, 'oak-pad', '2222');
  assert.equal(act(g, 'oak-pad', '3333'), 5); assert.ok(eqHas(h, 'hint3'), '세 번 틀리면 힌트');
  assert.equal(act(g, 'oak-wall'), 3, '코드 전에는 벽이 잠겨 있다');
  assert.equal(act(g, 'oak-pad', '3174'), 1); assert.ok(eqHas(h, 'oak'));
  // 미믹 — 깨우면 예고 원 → 물리면 밀려남, 체력은 그대로
  const hp = h.hp;
  assert.equal(act(g, 'oak-chest-2', 0), 2);
  const s = spot('oak-chest-2'); h.x = s.at[0] + 30; h.y = s.at[1] + 40;
  run(g, 1.8);
  assert.ok(Math.hypot(h.x - s.at[0], h.y - s.at[1]) > 200, '물려 밀려났다'); assert.ok(h.hp >= hp, '피해 없음');
  act(g, 'oak-lever'); assert.ok(eqHas(h, 'oakMimic')); assert.equal(h.eqRun.mim, null);
  act(g, 'oak-wall'); assert.equal(h.map, 'eng-cellar');
  act(g, 'cellar-hatch'); assert.equal(h.map, 'eng-tunnel');
  // 누전 바닥 — 배전함 둘을 내리기 전에는 안전핀 자리에서 밀려난다
  const z = EQ_HAZARDS.find((q) => q.id === 'spark');
  assert.ok(eqHazardState(h, z, 0)?.on);
  at(h, 'tun-pin'); run(g, .2);
  assert.ok(Math.hypot(h.x - z.back[0], h.y - z.back[1]) < 30, '안전한 자리로');
  act(g, 'tun-brkA'); act(g, 'tun-brkB');
  assert.equal(eqHazardState(h, z, 0), null);
  act(g, 'tun-pin'); act(g, 'tun-cell'); h.eqRun.hz = 0;
  g.t = 0.5; act(g, 'tun-gear');
  assert.ok(eqHas(h, 'gear') && eqHas(h, 'pin') && eqHas(h, 'cell'));
  assert.equal(act(g, 'tun-lift', [0, 1, 2]), 2, '도면 순서가 아니면 실패');
  assert.equal(act(g, 'tun-lift', [2, 0, 1]), 1); act(g, 'tun-lift');
  assert.equal(h.map, 'eng-lab');
});

test('4~5장 — 자동인형 부품 넷 · 정비망 지도 · 여섯 설계 기록', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 2');
  act(g, 'lab-doll'); assert.ok(eqHas(h, 'doll'));
  assert.equal(act(g, 'lab-doll'), 3, '부품이 모자라다');
  act(g, 'lab-swA'); assert.equal(act(g, 'lab-swB'), 2, 'A → C → B 가 아니면 처음부터');
  act(g, 'lab-swA'); act(g, 'lab-swC'); act(g, 'lab-swB'); assert.ok(eqHas(h, 'pCell'));
  assert.equal(act(g, 'lab-drawer', 1), 2); act(g, 'lab-drawer', 2);
  act(g, 'lab-parts', [0, 2, 4]); assert.ok(eqHas(h, 'pJoint'));
  act(g, 'lab-ctrl', [1, 2, 3]); assert.ok(eqHas(h, 'pCtrl'));
  act(g, 'lab-doll'); assert.ok(eqHas(h, 'doll3'));
  at(h, 'lab-map'); rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'travel', to: 'eng-origin' } });
  assert.equal(h.map, 'eng-lab', '최초의 명령실은 기록 다섯 뒤');
  rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'travel', to: 'eng-forest' } }); assert.equal(h.map, 'eng-forest');
  act(g, 'eco-v1', 18); act(g, 'eco-v2', 60); act(g, 'eco-v3', 50);
  assert.equal(act(g, 'eco-tower'), 2); act(g, 'eco-v3', 40); act(g, 'eco-tower'); act(g, 'eco-house'); assert.ok(eqHas(h, 'rec2'));
  act(g, 'scr-cabI'); act(g, 'scr-cabF'); act(g, 'scr-cabG'); act(g, 'scr-ctrl', [1, 2, 0]); act(g, 'scr-room'); assert.ok(eqHas(h, 'rec1'));
  act(g, 'sig-w', 2); act(g, 'sig-n', 4); act(g, 'sig-e', 1); act(g, 'sig-c', 3); act(g, 'sig-cut'); act(g, 'sig-hall'); assert.ok(eqHas(h, 'rec3'));
  ['clk-h3', 'clk-h1', 'clk-h4', 'clk-h2'].forEach((id) => act(g, id)); act(g, 'clk-vault'); assert.ok(eqHas(h, 'rec4'));
  assert.equal(act(g, 'bio-term', 0), 2); act(g, 'bio-term', 2); assert.ok(eqHas(h, 'rec5'));
  h.map = 'eng-lab'; at(h, 'lab-map'); rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'travel', to: 'eng-origin' } }); assert.equal(h.map, 'eng-origin');
  act(g, 'ori-term', [2, 4, 0, 3, 1]); assert.ok(eqHas(h, 'rec6'));
  act(g, 'lab-lift'); assert.equal(h.map, 'eng-metro'); assert.ok(eqHas(h, 'metro'));
});

test('6~8장 — 출입증 · 진실 · 관찰실 냉각 구간 · 재가동', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 4');
  act(g, 'met-gate'); act(g, 'fac-line', [0, 1, 2]); assert.ok(eqHas(h, 'factory'));
  assert.equal(act(g, 'arc-term', 2), 3, '세 단서 전에는 결론을 낼 수 없다');
  act(g, 'arc-cit'); act(g, 'arc-vid'); act(g, 'arc-note'); act(g, 'arc-term', 2); assert.ok(eqHas(h, 'truth') && eqHas(h, 'coreDoc'));
  g.t = 1; assert.equal(act(g, 'anx-t1'), 2, '충전 중에는 받지 않는다');
  g.t = 6; act(g, 'anx-t1'); act(g, 'anx-t2'); act(g, 'anx-t3'); assert.ok(eqHas(h, 'annexOn'));
  act(g, 'anx-arm'); act(g, 'fac-cool', 1); assert.ok(eqHas(h, 'coreFix'));
  ['pow-g0', 'pow-g1', 'pow-g2', 'pow-g3'].forEach((id) => act(g, id)); act(g, 'fac-dist', [2, 1, 4]); assert.ok(eqHas(h, 'dist'));
  act(g, 'pow-cool', 40); assert.equal(act(g, 'pow-core'), 2);
  act(g, 'pow-cool', 20); act(g, 'pow-core'); assert.ok(eqHas(h, 'restart'));
  act(g, 'pow-ctrl'); assert.equal(h.map, 'eng-trial');
});

test('9~10장 — 시험은 엔지니어 기술을 빌려주고 레벨과 관계없다 · 3단계 · 계약', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 6');
  h.map = 'eng-trial';
  act(g, 'trl-console');
  assert.ok(eqInTrial(h)); assert.ok(engineerOn(h), '빌린 기술'); assert.equal(h.bag.hj.trial, 1);
  run(g, TR.first + .1);
  const bots = g.mobs.filter((m) => m.eq && m.own === 0);
  assert.equal(bots.length, TR.wave[0][0]);
  // 1단계 — 봇이 장치에 닿으면 장치 체력이 준다
  run(g, 40);
  assert.ok(h.eqRun.tr.dev < TR.device.hp, '돌격 봇이 장치를 쳤다');
  // 봇을 모두 치우며 6웨이브
  const E = { say() {}, fx() {}, sys() {} };
  for (let i = 0; i < 600 && h.eqRun.tr.ph === 1; i++) { for (const m of g.mobs.filter((q) => q.eq && q.own === 0)) eqMobHit(E, g, h, m, 1e9); h.eqRun.tr.dev = TR.device.hp; run(g, 1); }
  assert.equal(h.eqRun.tr.ph, 2); assert.equal(h.bag.eu.t, 2, '체크포인트');
  const boss = () => g.mobs.find((m) => m.eq === 'boss');
  assert.ok(boss()); assert.equal(h.eqRun.tr.sh, 4);
  assert.equal(eqMobHit(E, g, h, boss(), 500), 0, '방어막');
  for (const m of g.mobs.filter((q) => q.eq === 'term')) eqMobHit(E, g, h, m, 1e9);
  assert.equal(h.eqRun.tr.sh, 0);
  eqMobHit(E, g, h, boss(), boss().max * 0.75); run(g, .1);
  assert.equal(h.eqRun.tr.ph, 3);
  // 3단계 — 과열 · 냉각 차례 · 90초 뒤 명령
  run(g, 10);
  const heat = h.eqRun.tr.heat; assert.ok(heat > 10);
  const cool = (i) => { [h.x, h.y] = TR.last.cool[i]; rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'cool', i } }); };
  cool(1); assert.ok(h.eqRun.tr.heat > heat, '틀린 차례면 열이 오른다');
  cool(0); assert.ok(h.eqRun.tr.heat < heat);
  for (let i = 0; i < 100 && !h.eqRun.tr.open; i++) { h.eqRun.tr.heat = 0; h.eqRun.tr.dur = TR.dur; run(g, 1); }
  assert.equal(h.eqRun.tr.open, 1);
  at(h, 'trl-console');
  const cmd = (i) => rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'cmd', i } });
  cmd(0); assert.equal(h.eqRun.tr.cmd, 0);
  cmd(1); cmd(2); cmd(0);
  assert.ok(eqHas(h, 'won')); assert.ok(!eqInTrial(h)); assert.ok(!engineerOn(h), '빌린 기술은 거둔다');
  assert.ok(!g.mobs.some((m) => m.eq));
});

test('시험 — 시험장을 나가면 빌린 기술을 거둔다', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 6');
  h.map = 'eng-trial'; act(g, 'trl-console'); run(g, 5);
  h.map = 'eng-power'; run(g, .2);
  assert.ok(!eqInTrial(h)); assert.ok(!engineerOn(h)); assert.ok(!g.mobs.some((m) => m.eq));
});

test('계약 — 승리 뒤 권한을 계승하면 해금 · 다른 사람이 가졌으면 안내만', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 7');
  h.map = 'eng-trial'; at(h, 'trl-console');
  rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'contract', yes: false } });
  assert.ok(eqHas(h, 'later')); assert.ok(!engineerOn(h));
  rpgInput(g, { cls: 0, kind: 'eq', dir: { op: 'contract', yes: true } });
  assert.ok(engineerOn(h)); assert.ok(eqHas(h, 'claim'));
  const b = cleanBag(h.bag); assert.equal(b.hj.active, 'engineer');
  // 유일 규칙 — 전용 서버 방 · 다른 보유자
  const w = setup(); w.g.server = 1; w.h.loaded = 1; w.g.names = ['설계']; w.g.hjHold = { engineer: ['다른사람'] };
  rpgAdminCmd(w.g, 0, '/엔지니어 설계 루트 6');
  w.h.admin = false; w.h.map = 'eng-trial'; at(w.h, 'trl-console');
  rpgInput(w.g, { cls: 0, kind: 'eq', dir: { op: 'act', id: 'trl-console' } });
  assert.ok(!eqInTrial(w.h), '보유자가 있으면 시험을 열지 않는다');
});

test('스냅샷 줄 60 — 손님 화면이 결과 · 시험 값을 받는다', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/엔지니어 설계 루트 6');
  h.map = 'eng-trial'; act(g, 'trl-console'); run(g, TR.first + .2);
  const snap = rpgPack(g);
  const c = makeWorld(); c.mySeat = 0; rpgApply(c, structuredClone(snap));
  const v = eqView(c.heroes[0]);
  assert.equal(v.tr.ph, 1); assert.equal(v.tr.dev, TR.device.hp);
  assert.ok(c.mobs.some((m) => m.eq === 'rush' && m.own === 0));
  for (const st of EQ_STAGES) assert.ok(st.set.every((f) => EQ_FLAGS.includes(f)), st.name);
});
