/* 히든 직업 「유일」 규칙(11월 17일) — 게임 전체에서 한 명만. 관리자 · 관리자 명령어는 제외.
   ① 장부 표 hidden_jobs(claim · sync · list · 치우기 · 처음 훑기 · 이름 바꾸기)  ② 해금 경로(미리 안내 · 장부의 답에 따른 해금 · 거절)  ③ 방(room.js)이 장부와 주고받는 것.
   node --test tools/hidden-unique.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerCore } from '../server/src/ledger.js';
import { HIDDEN_GRACE_MS } from '../server/src/ledger-hidden.js';
import { RpgRoom } from '../server/src/room.js';
import { fakeD1 } from './fake-d1.mjs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { GM_SPOTS, GM_CASINO as CA, GM_CLUE } from '../src/game/gamblerData.js';
import { BLOOD_SPOTS, BLOOD_LAB } from '../src/game/bloodJobData.js';
import { gamblerOn, unlockGambler } from '../src/game/gamblerJob.js';
import { bloodOn, unlockBlood } from '../src/game/bloodJob.js';
import { HIDDEN_IDS, holds, hiddenHeld, hiddenTaken, hiddenEnforced, nameKey } from '../src/game/hiddenUnique.js';
Math.random = () => 0.999;

/* ── ① 장부 ─────────────────────────────────────── */
const base = (extra = {}) => ({ lv: 10, coins: 0, rs: RESET.id, ts: 0, bag: {}, ...extra });
const hjData = { active: 'gambler', jobs: { gambler: { lv: 5, xp: 0, tr: [[0, 0], [0, 0], [0, 0]] } }, version: 1 };
const bdData = { on: 1, lv: 5, xp: 0, tr: [[0, 0], [0, 0], [0, 0]], b: 100 };
async function ledger(names = ['가', '나', '다'], data = {}) {
  const d1 = fakeD1(), clock = { t: 1_000_000_000_000 };
  const core = new LedgerCore(d1, { now: () => clock.t });
  const who = {};
  for (const n of names) {
    const r = await core.call('rpg_create', { p_name: n, p_code: '13579', p_data: { ...base(), name: n, ...(data[n] || {}) } });
    who[n] = { name: n, tok: r.token };
  }
  const call = (w, op, extra = {}) => core.call('rpg_hidden', { p_name: w.name, p_token: w.tok, p_op: op, ...extra });
  return { d1, clock, core, who, call, rows: () => d1.db.prepare("SELECT job, char_key FROM hidden_jobs WHERE job != '~seed' ORDER BY job, char_key").all().map((r) => `${r.job}:${r.char_key}`) };
}

test('장부 — 먼저 해금한 사람이 갖고 다른 사람은 taken · 같은 사람은 몇 번이든 ok · 직업마다 따로', async () => {
  const t = await ledger();
  const { 가, 나 } = t.who;
  let r = await t.call(가, 'claim', { p_job: 'gambler' });
  assert.equal(r.ok, true); assert.deepEqual(r.hold.gambler, ['가']);
  assert.equal((await t.call(나, 'claim', { p_job: 'gambler' })).err, 'taken');
  assert.equal((await t.call(가, 'claim', { p_job: 'gambler' })).ok, true, '내가 이미 보유자');
  assert.equal((await t.call(나, 'claim', { p_job: 'blood' })).ok, true, '다른 직업은 따로 센다');
  assert.equal((await t.call(가, 'claim', { p_job: 'nothing' })).err, 'job');
  assert.deepEqual(t.rows(), ['blood:나', 'gambler:가']);
  assert.equal((await t.core.call('rpg_hidden', { p_name: '가', p_token: 'x', p_op: 'claim', p_job: 'gambler' })).err, 'token');
});

test('장부 — 보유자가 접속하지 않아도(저장된 기록과 무관하게) 자리는 그대로 · 같은 순간에 둘이 해금해도 한 명만', async () => {
  const t = await ledger();
  const [a, b] = await Promise.all([t.call(t.who.가, 'claim', { p_job: 'blood' }), t.call(t.who.나, 'claim', { p_job: 'blood' })]);
  assert.equal([a, b].filter((r) => r.ok).length, 1, '한 명만 받는다');
  const winner = a.ok ? '가' : '나';
  t.d1.db.prepare("UPDATE chars SET data = ? WHERE name_key = ?").run(JSON.stringify({ ...base(), name: winner, bag: { bd: bdData } }), winner);   // 방이 저장한 기록 — 직업을 가진 채 접속하지 않는다
  t.clock.t += 365 * 24 * 3600 * 1000;                                 // 1년이 지나도
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'blood' })).err, 'taken');
});

test('장부 — sync: 가진 직업은 적고 안 가진 직업은 지운다 · 바뀐 것이 없으면 쓰지 않는다 · 관리자 명령어로 받은 사람도 적힌다', async () => {
  const t = await ledger();
  const { 가, 나 } = t.who;
  assert.equal((await t.call(가, 'sync', { p_held: ['gambler'] })).changed, true);
  assert.equal((await t.call(가, 'sync', { p_held: ['gambler'] })).changed, false);
  // 관리자 명령어로 다른 사람이 같은 직업을 받았다 — 제한 제외라 둘 다 적힌다
  assert.equal((await t.call(나, 'sync', { p_held: ['gambler', 'nothing'] })).changed, true);
  assert.deepEqual(t.rows(), ['gambler:가', 'gambler:나']);
  // 직업을 껐다(전직 초기화 물약 · 관리자 끄기) — 자리를 돌려준다
  const r = await t.call(가, 'sync', { p_held: [] });
  assert.equal(r.changed, true); assert.deepEqual(r.hold.gambler, ['나']);
  assert.deepEqual(t.rows(), ['gambler:나']);
  assert.equal((await t.call(나, 'sync', { p_held: [] })).ok, true);
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).ok, true, '자리가 비면 다음 사람이 받는다');
});

test('장부 — 관리자 캐릭터는 자리를 쓰지 않고 막히지도 않는다', async () => {
  const t = await ledger();
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '가'").run();
  assert.equal((await t.call(t.who.가, 'claim', { p_job: 'gambler' })).ok, true);
  assert.equal((await t.call(t.who.가, 'sync', { p_held: ['gambler', 'blood'] })).changed, false);
  assert.deepEqual(t.rows(), [], '관리자는 표에 적히지 않는다');
  assert.equal((await t.call(t.who.나, 'claim', { p_job: 'gambler' })).ok, true);
});

test('장부 — 지워진 캐릭터 · 직업이 빠진 기록 · 서버 초기화 전 기록은 자리를 잃는다(갓 적은 줄은 두고 본다)', async () => {
  const t = await ledger(['가', '나', '다'], { 가: { bag: { hj: hjData } }, 나: { bag: { bd: bdData } } });
  assert.deepEqual((await t.call(t.who.다, 'list')).hold, { blood: ['나'], gambler: ['가'] }, '처음 부를 때 이미 가진 사람을 훑어 적는다(내쫓지 않는다)');
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).err, 'taken');
  // 가 — 기록이 서버 초기화 전 것으로 바뀜(직업이 없어졌다)
  t.d1.db.prepare("UPDATE chars SET data = ? WHERE name_key = '가'").run(JSON.stringify({ ...base({ rs: 'old' }), name: '가', bag: { hj: hjData } }));
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).ok, true, '기록에 직업이 없으면 자리를 치운다');
  // 나 — 캐릭터를 지웠다
  assert.equal((await t.core.call('rpg_delete', { p_name: '나', p_token: t.who.나.tok })).ok, true);
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'blood' })).ok, true);
  assert.deepEqual(t.rows(), ['blood:다', 'gambler:다']);
  // 갓 적은 줄은 저장이 늦을 수 있어 두고 본다 — 기록에 직업이 없어도 5분 안에는 자리가 그대로
  const t2 = await ledger();
  await t2.call(t2.who.가, 'claim', { p_job: 'gambler' });
  assert.equal((await t2.call(t2.who.나, 'claim', { p_job: 'gambler' })).err, 'taken');
  t2.clock.t += HIDDEN_GRACE_MS + 1;
  assert.equal((await t2.call(t2.who.나, 'claim', { p_job: 'gambler' })).ok, true, '5분이 지나도 기록에 직업이 없으면 비운다');
});

test('장부 — 처음 훑을 때 이미 여러 명이 가졌으면 모두 적고 새 해금은 막는다 · 관리자 · 초기화 전 기록은 적지 않는다', async () => {
  const t = await ledger(['가', '나', '다', '라'], {
    가: { bag: { hj: hjData } }, 나: { bag: { hj: hjData } }, 다: { rs: 'old', bag: { hj: hjData } },
  });
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '라'").run();
  assert.deepEqual((await t.call(t.who.라, 'list')).hold, { blood: [], gambler: ['가', '나'] });
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).err, 'taken');
  assert.equal((await t.call(t.who.가, 'claim', { p_job: 'gambler' })).ok, true, '이미 가진 사람은 그대로');
  await t.call(t.who.가, 'sync', { p_held: [] });
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).err, 'taken', '한 명이 남아 있는 동안은 막힌다');
  await t.call(t.who.나, 'sync', { p_held: [] });
  assert.equal((await t.call(t.who.다, 'claim', { p_job: 'gambler' })).ok, true);
});

test('장부 — 관리자가 이름을 바꿔도 보유자 줄이 따라간다', async () => {
  const t = await ledger(['가', '나']);
  await t.core.call('rpg_create', { p_name: '운영', p_code: '24680', p_data: { ...base(), name: '운영' } });
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '운영'").run();
  await t.call(t.who.가, 'claim', { p_job: 'blood' });
  const r = await t.core.call('rpg_admin_rename', { p_name: '운영', p_code: '24680', p_target: '가', p_new_name: '새이름' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(t.rows(), ['blood:새이름']);
});

/* ── ② 해금 경로 ───────────────────────────────── */
function setup(extra = {}) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'g0', name: '도박', hero: { name: '도박', job: 'archer', gender: 'f' } }]);
  rpgJoin(g, 0, { name: '도박', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 },
    bag: { oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1, ...(extra.bag || {}) } }, 'g0');
  const h = g.heroes[0];
  h.auto = 0; h.cd = 0;
  g.server = true;                                         // 전용 서버 방 — 유일 규칙이 켜진다
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / .02); n++) rpgStep(g, .02); };
const talk = (g) => rpgInput(g, { cls: 0, kind: 'talk' });
const goSpot = (h, s) => { h.map = s.map; h.x = s.x; h.y = s.y + 10; };
const box = GM_SPOTS.find((s) => s.id === 'box');
const labSpot = BLOOD_SPOTS.find((s) => s.id === 'press');

test('유틸 — 가방 판별 · 시험 중 빌린 값은 세지 않는다 · 이름 열쇠 · 적용 조건', () => {
  assert.deepEqual(HIDDEN_IDS, ['blood', 'gambler']);
  assert.ok(holds({ bd: { on: 1 } }, 'blood')); assert.ok(!holds({ bd: { on: 1, trial: 1 } }, 'blood')); assert.ok(!holds({ bd: { on: 0 } }, 'blood'));
  assert.ok(holds({ hj: hjData }, 'gambler')); assert.ok(!holds({ hj: { ...hjData, trial: 1 } }, 'gambler')); assert.ok(!holds({ hj: { ...hjData, active: '' } }, 'gambler'));
  assert.equal(nameKey('  ABC  가 '), 'abc 가');
  const { g, h } = setup();
  assert.ok(hiddenEnforced(g, h)); h.admin = 1; assert.ok(!hiddenEnforced(g, h), '관리자는 제외'); h.admin = 0;
  g.test = 1; assert.ok(!hiddenEnforced(g, h), '테스트 방'); g.test = 0;
  g.server = false; assert.ok(!hiddenEnforced(g, h), '방장 브라우저 방식'); g.server = true;
  g.hjOff = true; assert.ok(!hiddenEnforced(g, h), '장부가 없는 방'); g.hjOff = false;
  unlockGambler(h); assert.deepEqual(hiddenHeld(h), ['gambler']);
  unlockBlood(h); assert.deepEqual(hiddenHeld(h), ['blood'], '히든 직업은 한 번에 하나');
});

test('미리 안내 — 이미 보유자가 있으면 카지노 뒷방 문을 열지 않는다 · 내가 보유자이거나 목록이 없으면 연다', () => {
  const { g, h } = setup({ bag: { gu: { c: GM_CLUE.A | GM_CLUE.B, f: 1, o: 0 } } });
  g.hjHold = { blood: [], gambler: ['다른사람'] };
  goSpot(h, box); talk(g);
  assert.equal(h.map, 'plaza', '들어가지 못한다'); assert.equal(h.bag.gu.o, 0, '문도 열리지 않는다'); assert.ok(!h.gt && !h.bag.hj);
  assert.ok(hiddenTaken(g, h, 'gambler'));
  g.hjHold = { gambler: ['도박'] }; assert.ok(!hiddenTaken(g, h, 'gambler'), '내가 보유자면 막지 않는다');
  g.hjHold = undefined; talk(g); assert.equal(h.map, CA.id, '목록을 아직 못 받았으면 장부가 해금 순간에 정한다');
});

test('해금 순간 — 시험을 통과해도 장부의 답이 올 때까지 해금하지 않는다 · ok 면 해금 · taken 이면 시험을 거두고 광장으로', () => {
  const mk = () => {
    const s = setup({ bag: { gu: { c: GM_CLUE.A | GM_CLUE.B, f: 1, o: 0 } } });
    goSpot(s.h, box); talk(s.g); assert.equal(s.h.gt.step, 1);
    s.h.gt.step = 3; s.h.gt.far = 1;                      // 3단계를 해냈다
    return s;
  };
  let { g, h } = mk();
  run(g, .2);
  assert.deepEqual(g.hjq, [{ pi: 0, id: 'gambler' }], '방에 자리를 묻는다 — 겹쳐 쌓지 않는다'); assert.ok(h.gt && h.bag.hj.trial, '답을 기다리는 동안은 시험 중');
  assert.ok(!(gamblerOn(h) && !h.bag.hj.trial));
  g.hjq.length = 0; h.hjr = { id: 'gambler', ok: true, err: '' }; run(g, .1);
  assert.ok(gamblerOn(h) && !h.bag.hj.trial && h.gt === null, '받았으면 해금'); assert.equal(h.hjr, null);
  ({ g, h } = mk());
  run(g, .1); g.hjq.length = 0; h.hjr = { id: 'gambler', ok: false, err: 'taken' }; run(g, .1);
  assert.ok(!gamblerOn(h) && !h.bag.hj && h.gt === null, '먼저 계약한 사람이 있다 — 해금하지 않고 빌린 값을 거둔다');
  assert.equal(h.map, 'plaza'); assert.ok(g.mobs.filter((m) => m.map === CA.id).length === 0);
  assert.equal(h.bag.e, 1, '무기는 그대로');
  ({ g, h } = mk());
  run(g, .1); g.hjq.length = 0; h.hjr = { id: 'gambler', ok: false, err: 'net' }; run(g, 1);
  assert.ok(h.gt && !g.hjq.length, '닿지 못하면 잠시 쉬고'); run(g, 3); assert.equal(g.hjq.length, 1, '다시 묻는다');
  ({ g, h } = mk());
  run(g, .1); g.hjq.length = 0; run(g, 11); assert.equal(g.hjq.length, 1, '답이 없어도 다시 묻는다');
});

test('관리자 · 관리자가 아닌 방(방장 브라우저 · 테스트 방)은 장부를 거치지 않고 바로 해금한다', () => {
  for (const mod of [(g, h) => { h.admin = 1; }, (g) => { g.server = false; }, (g) => { g.test = 1; }]) {
    const { g, h } = setup({ bag: { gu: { c: GM_CLUE.A | GM_CLUE.B, f: 1, o: 0 } } });
    mod(g, h);
    goSpot(h, box); talk(g); h.gt.step = 3; h.gt.far = 1; run(g, .1);
    assert.ok(gamblerOn(h) && !h.bag.hj.trial, '바로 해금'); assert.equal((g.hjq || []).length, 0);
  }
});

test('BLOOD-001 도 같은 규칙 — 미리 안내 · 시험 통과 뒤 장부의 답으로 해금 / 거절', () => {
  const mk = () => {
    const s = setup({ bag: { bu: { c: 6, f: 4, o: 4 } } });
    s.h.advClass = 'gladiator';
    return s;
  };
  let { g, h } = mk();
  g.hjHold = { blood: ['다른사람'], gambler: [] };
  goSpot(h, labSpot); talk(g);
  assert.notEqual(h.map, BLOOD_LAB.id, '이미 각성한 사람이 있으면 연구시설로 내려가지 못한다'); assert.ok(!h.bt);
  const toStep3 = () => {
    ({ g, h } = mk());
    goSpot(h, labSpot); talk(g); assert.equal(h.map, BLOOD_LAB.id);
    h.bt.step = 3; h.hp = h.max;
    run(g, BLOOD_LAB.veil.gap + .05);
    rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'press', s: 'veil' } });
    run(g, BLOOD_LAB.veil.warn + .1);
  };
  toStep3();
  assert.deepEqual(g.hjq, [{ pi: 0, id: 'blood' }], '장부에 자리를 묻는다'); assert.ok(h.bt && h.bag.bd.trial, '답을 기다리는 동안은 시험 중'); assert.equal(h.advClass, 'gladiator');
  g.hjq.length = 0; h.hjr = { id: 'blood', ok: true, err: '' }; run(g, .1);
  assert.ok(bloodOn(h) && !h.bag.bd.trial && h.bt === null && h.advClass === '', '받았으면 해금');
  toStep3();
  g.hjq.length = 0; h.hjr = { id: 'blood', ok: false, err: 'taken' }; run(g, .1);
  assert.ok(!bloodOn(h) && h.bt === null && !h.bag.bd, '먼저 각성한 사람이 있다 — 해금하지 않는다'); assert.equal(h.map, 'plaza'); assert.equal(h.advClass, 'gladiator', '전직은 그대로');
});

/* ── ③ 방(room.js) ─────────────────────────────── */
const ledgerEnv = (core, log = []) => ({ LEDGER: { idFromName: () => 1, get: () => ({ fetch: async (url, init) => {
  const fn = String(url).split('/').pop(), a = JSON.parse(init.body);
  log.push(fn + ':' + (a.p_op || ''));
  return new Response(JSON.stringify(await core.call(fn, a)), { status: 200 });
} }) } });
const settle = () => new Promise((res) => setTimeout(res, 30));
async function roomOf(core, who, log) {
  const r = new RpgRoom({}, ledgerEnv(core, log));
  r.start(); r.stop();
  who.forEach((w, i) => {
    const id = `id${i}aaaaaa`;
    r.seats[i] = { id, name: w.name, hero: { name: w.name, job: 'warrior', elem: 'flame', gender: 'm' } };
    r.accts.set(id, { name: w.name, tok: w.tok, base: { name: w.name, lv: 1 }, admin: false, look: r.seats[i].hero, savedKey: '', dead: false });
    r.conns.set(id, { id, ws: { send() {} }, gone: 0 });
  });
  r.publish();
  who.forEach((w, i) => r.rjoin(r.conns.get(`id${i}aaaaaa`), { cls: i, data: {} }));
  r.g.names = who.map((w) => w.name);
  return r;
}

test('방 — 시험 통과 요청(g.hjq)을 장부에 묻고 답을 영웅에게 돌려준다 · 먼저 받은 사람만 ok', async () => {
  const t = await ledger(['가', '나']);
  const log = [];
  const r = await roomOf(t.core, [t.who.가, t.who.나], log);
  const g = r.g;
  assert.ok(g.heroes[0].loaded && g.heroes[1].loaded);
  g.hjq = [{ pi: 0, id: 'blood' }, { pi: 1, id: 'blood' }];
  r.hiddenTick(g, 0.016); await settle();
  assert.deepEqual(g.heroes[0].hjr, { id: 'blood', ok: true, err: '' });
  assert.deepEqual(g.heroes[1].hjr, { id: 'blood', ok: false, err: 'taken' });
  assert.deepEqual(g.hjHold.blood, ['가'], '보유자 목록도 받아 둔다');
  assert.equal(g.hjq.length, 0);
});

test('방 — 가방이 바뀔 때만 sync · 해금을 마치기 전에는 "안 가졌다"고 알리지 않는다 · 비우면 자리를 돌려준다', async () => {
  const t = await ledger(['가', '나']);
  const log = [];
  const r = await roomOf(t.core, [t.who.가, t.who.나], log);
  const g = r.g, [a, b] = g.heroes;
  r.hiddenTick(g, 2.1); await settle();
  assert.equal(log.filter((x) => x === 'rpg_hidden:sync').length, 2, '처음 한 번씩 맞춘다');
  r.hiddenTick(g, 2.1); await settle();
  assert.equal(log.filter((x) => x === 'rpg_hidden:sync').length, 2, '바뀐 것이 없으면 다시 쓰지 않는다');
  // 가 — 시험을 통과해 자리를 받았다. 해금 전에 sync 가 돌아도 자리를 지운다고 알리지 않는다
  g.hjq = [{ pi: 0, id: 'gambler' }]; r.hiddenTick(g, 0.016); await settle();
  r.hiddenTick(g, 2.1); await settle();
  assert.deepEqual(t.rows(), ['gambler:가'], '해금을 마치기 전 sync 가 자리를 지우지 않는다');
  unlockGambler(a); r.hiddenTick(g, 2.1); await settle();
  assert.deepEqual(t.rows(), ['gambler:가']);
  // 나 — 관리자 명령어로 같은 직업을 받았다 → 제한 없이 적힌다
  unlockGambler(b); r.hiddenTick(g, 2.1); await settle();
  assert.deepEqual(t.rows(), ['gambler:가', 'gambler:나']);
  // 가 — 전직 초기화 물약으로 비웠다 → 자리를 돌려준다
  const { dropGambler } = await import('../src/game/gamblerJob.js');
  dropGambler(a); r.hiddenTick(g, 2.1); await settle();
  assert.deepEqual(t.rows(), ['gambler:나']);
});

test('방 — 테스트 방 · 장부가 없는 방은 지키지 않고 요청은 바로 ok 로 돌려준다 · 계정이 없는 캐릭터는 거절', async () => {
  const t = await ledger(['가']);
  const test = new RpgRoom({}, ledgerEnv(t.core)); test.test = true; test.start(); test.stop();
  test.hiddenTick(test.g, 1); assert.equal(test.g.hjOff, true);
  const off = new RpgRoom({}, {}); off.start(); off.stop();
  off.g.hjq = [{ pi: 0, id: 'blood' }]; off.hiddenTick(off.g, 1); assert.equal(off.g.hjOff, true); assert.equal(off.g.hjq.length, 0);
  const r = await roomOf(t.core, [t.who.가], []);
  r.accts.clear();                                        // 서버 계정이 없는 캐릭터
  r.g.hjq = [{ pi: 0, id: 'blood' }]; r.hiddenTick(r.g, 0.016); await settle();
  assert.deepEqual(r.g.heroes[0].hjr, { id: 'blood', ok: false, err: 'account' });
});
