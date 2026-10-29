import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './fake-d1.mjs';
import { LedgerCore, rpgKey, codeOk, jeq } from '../server/src/ledger.js';
import { RESET } from '../src/game/itemData.js';

const setup = () => {
  const d1 = fakeD1(), clock = { t: 1_000_000_000_000 };
  const core = new LedgerCore(d1, { now: () => clock.t });
  return { d1, clock, core, call: (fn, a) => core.call(fn, a) };
};
const rec = (o = {}) => ({ v: 3, name: '용사', lv: 10, xp: 0, coins: 100, quest: { on: false, n: 0 }, rs: RESET.id, bag: {}, ...o });
const mk = async (t, name = '용사', code = '13579', data = rec({ name })) => {
  const r = await t.call('rpg_create', { p_name: name, p_code: code, p_data: data });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.token;
};

test('이름 열쇠 · 코드 규칙은 Postgres 함수와 같다', () => {
  assert.equal(rpgKey('  Ab   Cd '), 'ab cd');
  assert.equal(codeOk('13579'), true);
  for (const c of ['00000', '12345', '54321', '1234', '1234a', '', null]) assert.equal(codeOk(c), false, String(c));
  assert.equal(jeq({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }), true);
  assert.equal(jeq({ a: 1 }, { a: 2 }), false);
});

test('만들기 · 이름 중복 · 이어 하기', async () => {
  const t = setup();
  assert.equal(await t.call('rpg_name_free', { p_name: '용사' }), true);
  const tok = await mk(t);
  assert.match(tok, /^[0-9a-f]{32}$/);
  assert.equal(await t.call('rpg_name_free', { p_name: ' 용사 ' }), false);
  assert.deepEqual((await t.call('rpg_create', { p_name: '용사', p_code: '13579', p_data: rec() })), { ok: false, err: 'taken' });
  assert.equal((await t.call('rpg_create', { p_name: '', p_code: '13579', p_data: rec() })).err, 'name');
  assert.equal((await t.call('rpg_create', { p_name: '아홉글자이름이다요', p_code: '13579', p_data: rec() })).err, 'name');
  assert.equal((await t.call('rpg_create', { p_name: '가', p_code: '11111', p_data: rec() })).err, 'code');
  const login = await t.call('rpg_login', { p_name: '용사', p_code: '13579' });
  assert.equal(login.ok, true);
  assert.notEqual(login.token, tok);
  assert.equal(login.data.lv, 10);
  // 먼저 있던 입장권은 무효
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec() })).err, 'token');
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: login.token, p_data: rec({ lv: 11 }) })).ok, true);
});

test('Postgres(pgcrypto)가 만든 bcrypt 해시로도 이어 할 수 있다', async () => {
  const t = setup();
  const now = t.clock.t;
  t.d1.db.prepare("INSERT INTO chars (name_key, name, code_hash, data, created_at, updated_at) VALUES ('옛사람', '옛사람', ?, ?, ?, ?)")
    .run('$2a$08$3gk92NXZbWu04ajdUyZFnOTXu1DE2E3LRorMYO5kkk6770ELeXQoW', JSON.stringify(rec({ name: '옛사람' })), now, now);
  assert.equal((await t.call('rpg_login', { p_name: '옛사람', p_code: '13579' })).ok, true);
  assert.equal((await t.call('rpg_login', { p_name: '옛사람', p_code: '13570' })).err, 'wrong');
});

test('코드를 5번 틀리면 10분 막고 시간이 지나면 풀린다', async () => {
  const t = setup();
  await mk(t);
  for (let i = 1; i <= 4; i++) {
    const r = await t.call('rpg_login', { p_name: '용사', p_code: '99998' });
    assert.deepEqual(r, { ok: false, err: 'wrong', left: 5 - i });
  }
  const lock = await t.call('rpg_login', { p_name: '용사', p_code: '99998' });
  assert.deepEqual(lock, { ok: false, err: 'locked', wait: 600 });
  assert.equal((await t.call('rpg_login', { p_name: '용사', p_code: '13579' })).err, 'locked');   // 맞는 코드도 막힌다
  t.clock.t += 601_000;
  assert.equal((await t.call('rpg_login', { p_name: '용사', p_code: '13579' })).ok, true);
  assert.equal((await t.call('rpg_login', { p_name: '없는사람', p_code: '13579' })).err, 'wrong');   // 없는 이름도 똑같이 센다
});

test('접속 중 표시 — 다른 창은 막고 창을 닫으면 풀린다', async () => {
  const t = setup();
  const tok = await mk(t);
  assert.equal((await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'AAA', p_srv: 'RPG1' })).err, 'bad');
  assert.equal((await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'aaa', p_srv: 'RPG1' })).ok, true);
  assert.equal((await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'aaa', p_srv: 'RPG2' })).ok, true);   // 같은 창의 서버 이동
  const other = await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'bbb', p_srv: 'RPG1' });
  assert.equal(other.err, 'live'); assert.equal(other.srv, 'RPG2');
  assert.equal((await t.call('rpg_login', { p_name: '용사', p_code: '13579' })).err, 'live');
  await t.call('rpg_unlive', { p_name: '용사', p_token: tok, p_sid: 'bbb' });         // 다른 창의 해제는 듣지 않는다
  assert.equal((await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'bbb', p_srv: 'RPG1' })).err, 'live');
  await t.call('rpg_unlive', { p_name: '용사', p_token: tok, p_sid: 'aaa' });
  assert.equal((await t.call('rpg_live', { p_name: '용사', p_token: tok, p_sid: 'bbb', p_srv: 'RPG1' })).ok, true);
  t.clock.t += 31_000;                                                                 // 창을 그냥 닫았다
  assert.equal((await t.call('rpg_login', { p_name: '용사', p_code: '13579' })).ok, true);
});

test('저장 지킴 — 이름이 다르거나 레벨이 내려가거나 너무 뛰면 막고 입장권을 지운다', async () => {
  for (const [bad, why] of [[rec({ name: '남' }), 'name'], [rec({ lv: 5 }), 'down'], [rec({ lv: 40 }), 'jump']]) {
    const t = setup();
    const tok = await mk(t);
    const r = await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: bad });
    assert.deepEqual(r, { ok: false, err: 'guard', why });
    assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec() })).err, 'token');   // 입장권이 지워졌다
    const log = await t.d1.db.prepare('SELECT * FROM save_blocks').all();
    assert.equal(log.length, 1); assert.equal(log[0].why, why);
  }
  // 시간이 지나면 더 오를 수 있다 · 서버 초기화(rs 바뀜)는 레벨이 내려가도 받는다
  const t = setup();
  const tok = await mk(t);
  t.clock.t += 10 * 60_000;
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 35 }) })).ok, true);
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 1, rs: 'next' }) })).ok, true);
  // 한 사람 되돌리기(bag.pg 새 id)
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 1, rs: 'next', bag: { pg: ['x'] } }) })).ok, true);
});

test('코인이 너무 늘면 막지 않고 기록만 남긴다 · 크기 한도', async () => {
  const t = setup();
  const tok = await mk(t);
  const r = await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ coins: 5_000_000 }) });
  assert.equal(r.ok, true);
  const log = t.d1.db.prepare('SELECT * FROM save_blocks').all();
  assert.equal(log.length, 1); assert.equal(log[0].why, 'coins'); assert.equal(log[0].coins_old, 100); assert.equal(log[0].coins_new, 5_000_000);
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ coins: 'many' }) })).ok, true);   // 숫자가 아니어도 기록만
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ pad: 'x'.repeat(30001) }) })).err, 'data');
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: null })).err, 'data');
});

test('관리자는 저장 지킴을 받지 않는다 · 불러오기에 ts 가 실린다', async () => {
  const t = setup();
  const tok = await mk(t, '관리');
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '관리'").run();
  assert.equal((await t.call('rpg_save', { p_name: '관리', p_token: tok, p_data: rec({ name: '관리', lv: 800, coins: 1e12 }) })).ok, true);
  const l = await t.call('rpg_load', { p_name: '관리', p_token: tok });
  assert.equal(l.ok, true); assert.equal(l.admin, true); assert.equal(l.ts, 0); assert.equal(l.data.ts, 0); assert.equal(l.data.lv, 800);
  assert.equal((await t.call('rpg_load', { p_name: '관리', p_token: 'x' })).err, 'token');
});

test('거래 막이 — 옛 차례(ts)의 저장 · 확인한 거래 중 저장 · 옮긴 장비가 되살아나는 저장', async () => {
  const t = setup();
  const tok = await mk(t);
  t.d1.db.prepare("UPDATE chars SET trade_seq = 3 WHERE name_key = '용사'").run();
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 11 }) })).err, 'stale');   // ts 없음(0) ≠ 3
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 11, ts: 3 }) })).ok, true);
  // 확인한 거래 중
  const now = t.clock.t;
  t.d1.db.prepare("INSERT INTO trades (id, a, b, server, state, offers, accepted, created_at, until) VALUES ('t1', '용사', '남', 'RPG1', 'open', '[]', '[true,false]', ?, ?)").run(now, now + 60000);
  t.d1.db.prepare("UPDATE chars SET trade_id = 't1' WHERE name_key = '용사'").run();
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 12, ts: 3 }) })).err, 'busy');
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 11, ts: 3 }) })).ok, true);   // 바뀐 것이 없으면 막이를 건너뛴다
  t.d1.db.prepare("UPDATE trades SET accepted = '[false,false]' WHERE id = 't1'").run();
  // 거래로 옮긴 장비
  const item = { u: 7, id: 'sword' };
  t.d1.db.prepare("INSERT INTO trade_moves (trade_id, owner, receiver, kind, u, item, reset_id, rollback_ids, at) VALUES ('t1', '용사', '남', 'w', 7, ?, ?, '[]', ?)").run(JSON.stringify(item), RESET.id, now);
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 12, ts: 3, bag: { w: [{ id: 'sword', u: 7 }] } }) })).err, 'moved');
  assert.equal(t.d1.db.prepare("SELECT why FROM save_blocks WHERE why = 'moved'").all().length, 1);
  assert.equal((await t.call('rpg_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 12, ts: 3, bag: { w: [] } }) })).ok, true);
});

test('RPG 전용 서버의 불러오기 · 저장', async () => {
  const t = setup();
  const tok = await mk(t);
  const l = await t.call('rpg_srv_load', { p_name: '용사', p_token: tok });
  assert.equal(l.ok, true); assert.equal(l.data.lv, 10); assert.equal(l.admin, false);
  assert.equal((await t.call('rpg_srv_load', { p_name: '용사', p_token: 'x' })).err, 'token');
  assert.equal((await t.call('rpg_srv_save', { p_name: '용사', p_token: tok, p_data: rec({ lv: 99 }) })).ok, true);   // 서버는 지킴 없이 판정 결과를 저장한다
  assert.equal((await t.call('rpg_srv_save', { p_name: '용사', p_token: 'x', p_data: rec() })).err, 'token');
  assert.equal((await t.call('rpg_load', { p_name: '용사', p_token: tok })).data.lv, 99);
});

test('삭제 · 명예 순위', async () => {
  const t = setup();
  const a = await mk(t, '가가', '13579', rec({ name: '가가', honor: 50, lv: 20 }));
  await mk(t, '나나', '13579', rec({ name: '나나', honor: 80, lv: 30 }));
  await mk(t, '다다', '13579', rec({ name: '다다', honor: 90, rs: 'old' }));    // 서버 초기화 전 기록 — 뺀다
  await mk(t, '라라', '13579', rec({ name: '라라', honor: 0 }));
  const top = await t.call('rpg_honor_top', { p_limit: 20 });
  assert.deepEqual(top, [{ name: '나나', honor: 80, lv: 30 }, { name: '가가', honor: 50, lv: 20 }]);
  assert.equal((await t.call('rpg_honor_top', { p_limit: 1 })).length, 1);
  assert.equal((await t.call('rpg_delete', { p_name: '가가', p_token: 'x' })).err, 'token');
  assert.equal((await t.call('rpg_delete', { p_name: '가가', p_token: a })).ok, true);
  assert.equal(await t.call('rpg_name_free', { p_name: '가가' }), true);
});

test('관리 화면 — 확인 · 명령 표 · 계정 · 로그 · 이름 변경', async () => {
  const t = setup();
  const adm = await mk(t, '운영', '24680', rec({ name: '운영', lv: 800 }));
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '운영'").run();
  const u = await mk(t, '유저', '13579', rec({ name: '유저', coins: 7, job: 'mage' }));
  assert.equal((await t.call('rpg_admin_ok', { p_name: '운영', p_code: '24680' })).ok, true);
  assert.equal((await t.call('rpg_admin_ok', { p_name: '유저', p_code: '13579' })).err, 'wrong');   // 관리자가 아니면 틀림으로 센다
  // 명령 표
  assert.equal((await t.call('rpg_admin_ticket', { p_name: '운영', p_code: '24680', p_server: 'RPG9', p_act: 'host', p_target: 'ab' })).err, 'bad');
  const tk = await t.call('rpg_admin_ticket', { p_name: '운영', p_code: '24680', p_server: 'RPG1', p_act: 'host', p_target: 'ab12' });
  assert.equal(tk.ok, true);
  assert.equal(await t.call('rpg_admin_redeem', { p_nonce: 'x', p_server: 'RPG1', p_act: 'host', p_target: 'ab12' }), false);
  assert.equal(await t.call('rpg_admin_redeem', { p_nonce: tk.nonce, p_server: 'RPG1', p_act: 'host', p_target: 'ab12' }), true);
  assert.equal(await t.call('rpg_admin_redeem', { p_nonce: tk.nonce, p_server: 'RPG1', p_act: 'host', p_target: 'ab12' }), false);   // 한 번만
  const tk2 = await t.call('rpg_admin_ticket', { p_name: '운영', p_code: '24680', p_server: 'RPG1', p_act: 'kick', p_target: 'ab12' });
  t.clock.t += 61_000;
  assert.equal(await t.call('rpg_admin_redeem', { p_nonce: tk2.nonce, p_server: 'RPG1', p_act: 'kick', p_target: 'ab12' }), false);   // 60초가 지났다
  // 계정 목록
  await t.call('rpg_live', { p_name: '유저', p_token: u, p_sid: 'aa', p_srv: 'RPG3' });
  const acc = await t.call('rpg_admin_accounts', { p_name: '운영', p_code: '24680' });
  assert.equal(acc.ok, true); assert.equal(acc.list.length, 2);
  const me = acc.list.find((x) => x.name === '유저');
  assert.deepEqual({ ...me, made: 0, saved: 0 }, { name: '유저', admin: false, lv: 10, job: 'mage', coins: 7, honor: 0, made: 0, saved: 0, live: 'RPG3' });
  assert.match(me.made, /^\d{4}-\d\d-\d\dT/);
  assert.equal((await t.call('rpg_admin_accounts', { p_name: '운영', p_code: 'bad00' })).err, 'wrong');
  // 이름 변경 — 접속 중이면 막고, 풀리면 기록 · 코드를 지키며 바꾼다. 입장권은 지운다
  assert.equal((await t.call('rpg_admin_rename', { p_name: '운영', p_code: '24680', p_target: '유저', p_new_name: '새유저' })).err, 'live');
  await t.call('rpg_unlive', { p_name: '유저', p_token: u, p_sid: 'aa' });
  assert.equal((await t.call('rpg_admin_rename', { p_name: '운영', p_code: '24680', p_target: '유저', p_new_name: '운영' })).err, 'taken');
  assert.equal((await t.call('rpg_admin_rename', { p_name: '운영', p_code: '24680', p_target: '없음', p_new_name: '가나' })).err, 'missing');
  const rn = await t.call('rpg_admin_rename', { p_name: '운영', p_code: '24680', p_target: '유저', p_new_name: '새유저' });
  assert.deepEqual(rn, { ok: true, name: '새유저' });
  assert.equal((await t.call('rpg_save', { p_name: '새유저', p_token: u, p_data: rec({ name: '새유저' }) })).err, 'token');
  const lg = await t.call('rpg_login', { p_name: '새유저', p_code: '13579' });
  assert.equal(lg.ok, true); assert.equal(lg.data.name, '새유저'); assert.equal(lg.data.coins, 7);
  // 로그
  await t.call('rpg_save', { p_name: '새유저', p_token: lg.token, p_data: rec({ name: '새유저', lv: 3 }) });
  const bl = await t.call('rpg_admin_blocks', { p_name: '운영', p_code: '24680' });
  assert.equal(bl.list.length, 1); assert.equal(bl.list[0].why, 'down'); assert.equal(bl.list[0].old, 10); assert.equal(bl.list[0].new, 3);
  assert.equal((await t.call('rpg_admin_trades', { p_name: '운영', p_code: '24680' })).list.length, 0);
  void adm;
});

test('의견 남기기 · 관리 화면 문의 탭', async () => {
  const t = setup();
  await mk(t, '운영', '24680', rec({ name: '운영' }));
  t.d1.db.prepare("UPDATE chars SET admin = 1 WHERE name_key = '운영'").run();
  assert.equal((await t.call('feedback_insert', { body: '  ' })).err, 'body');
  assert.equal((await t.call('feedback_insert', { body: 'x'.repeat(2001) })).err, 'body');
  assert.equal((await t.call('feedback_insert', { body: ' 재미있어요 ', name: '손님', room: 'ABCD', result: 'clear', wave: 12, total: 20, diff: 'hard', cls: 'archer' })).ok, true);
  assert.equal((await t.call('feedback_insert', { body: '두 번째', result: 'weird', wave: 9999 })).ok, true);
  const fb = await t.call('rpg_admin_feedback', { p_name: '운영', p_code: '24680' });
  assert.equal(fb.list.length, 2);
  assert.equal(fb.list[0].body, '두 번째'); assert.equal(fb.list[0].result, null); assert.equal(fb.list[0].wave, null);
  assert.deepEqual({ ...fb.list[1], at: 0 }, { id: 1, at: 0, body: '재미있어요', name: '손님', room: 'ABCD', result: 'clear', wave: 12, total: 20, diff: 'hard', cls: 'archer' });
});

test('모르는 함수 · 이상한 받는 값', async () => {
  const t = setup();
  assert.equal((await t.call('nope', {})).err, 'op');
  assert.equal((await t.call('rpg_login', null)).ok, false);
  assert.equal((await t.call('rpg_save', { p_name: 1, p_token: {}, p_data: [] })).err, 'data');
});
