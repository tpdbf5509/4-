import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerCore } from '../server/src/ledger.js';
import { fakeD1 } from './fake-d1.mjs';

/* 개인 거래 — supabase/tests/trade.sql(Postgres)의 장면을 장부(JS · D1)로 그대로 다시 한다 */
const base = {
  lv: 10, coins: 1000, rs: '2026-10-19', ts: 0,
  bag: { w: [{ u: 1, t: 'sword', r: 0, g: 0, p: 100 }], a: [], ae: {}, e: 0, n: 2, v: 1, p: { heal_s: 5 }, m: { fur: 10 }, wp: 5, gd: 2, pg: [] },
};
const setup = async (names = ['QA거래가', 'QA거래나', 'QA거래다']) => {
  const d1 = fakeD1(), clock = { t: 1_000_000_000_000 };
  const core = new LedgerCore(d1, { now: () => clock.t });
  const who = {};
  for (const n of names) {
    const r = await core.call('rpg_create', { p_name: n, p_code: '13579', p_data: { ...structuredClone(base), name: n } });
    assert.equal(r.ok, true, JSON.stringify(r));
    who[n] = { name: n, tok: r.token, sid: `s${Object.keys(who).length}` };
    assert.equal((await core.call('rpg_live', { p_name: n, p_token: r.token, p_sid: who[n].sid, p_srv: 'RPG1' })).ok, true);
  }
  const open = (me, target) => core.call('rpg_trade_open', { p_name: me.name, p_token: me.tok, p_target: target.name, p_sid: me.sid });
  const act = (me, id, op = 'get', offer = null, hash = null) =>
    core.call('rpg_trade_action', { p_name: me.name, p_token: me.tok, p_sid: me.sid, p_id: id, p_op: op, p_offer: offer, p_hash: hash });
  const save = (me, data) => core.call('rpg_save', { p_name: me.name, p_token: me.tok, p_data: data });
  const row = (n) => core.charRow(n.toLowerCase());
  return { d1, clock, core, who, open, act, save, row };
};

test('거래 한 판 — 신청 · 등록 · 확인 · 확정과 보호 장치', async () => {
  const t = await setup();
  const [a, b, c] = Object.values(t.who);
  assert.equal((await t.open({ ...a, tok: 'wrong' }, b)).err, 'token');
  let r = await t.open(a, b);
  assert.equal(r.ok, true);
  const tid = r.id;
  assert.equal((await t.open(c, b)).err, 'busy', '동시 거래 차단');
  assert.equal((await t.act(c, tid)).trade, null, '제삼자는 거래 열람 불가');
  r = await t.act(b, tid, 'join');
  assert.equal(r.trade.state, 'open');
  r = await t.act(a, tid, 'offer', { coins: 0, items: [{ k: 'w', u: '1' }, { k: 'w', u: '1' }] });
  assert.equal(r.err, 'trade_offer', '중복 품목 차단');
  r = await t.act(a, tid, 'offer', { coins: 100, items: [{ k: 'w', u: '1' }, { k: 'p', u: 'heal_s', n: 2 }] });
  let h = r.trade.hash;
  assert.ok(h);
  r = await t.act(a, tid, 'accept', null, h);
  assert.equal(r.trade.accepted[0], true);
  r = await t.save(a, { ...base, name: a.name, coins: 900 });
  assert.equal(r.err, 'busy', '확인 뒤 저장 잠금');
  r = await t.act(b, tid, 'offer', { coins: 20, items: [{ k: 'm', u: 'fur', n: 3 }] });
  assert.deepEqual(r.trade.accepted, [false, false], '변경하면 양쪽 확인 해제');
  r = await t.act(a, tid, 'accept', null, h);
  assert.equal(r.err, 'changed', '옛 내용 확인 차단');
  r = await t.act(a, tid);
  h = r.trade.hash;
  await t.act(a, tid, 'accept', null, h);
  r = await t.act(b, tid, 'accept', null, h);
  assert.equal(r.trade.state, 'done', JSON.stringify(r));

  let d = (await t.row(a.name)).data;
  assert.equal(d.coins, 920);
  assert.equal(d.bag.m.fur, 13);
  assert.equal(d.bag.w.length, 0, '준 쪽 수량');
  d = (await t.row(b.name)).data;
  assert.equal(d.coins, 1080);
  assert.equal(d.bag.p.heal_s, 7);
  assert.equal(d.bag.w.length, 2, '받은 쪽 수량');
  assert.equal(d.bag.w[1].u, 2, '받는 가방에서 새 장비 번호');

  await t.act(b, tid, 'accept', null, h);
  assert.equal((await t.row(b.name)).trade_seq, 1, '중복 실행 방지');
  r = await t.save(a, { ...base, name: a.name });
  assert.equal(r.err, 'stale', '늦은 저장 차단');
  r = await t.save(a, { ...base, name: a.name, ts: 1 });
  assert.equal(r.err, 'moved', '넘긴 장비 되살아남 차단');
  r = await t.core.call('rpg_load', { p_name: a.name, p_token: a.tok });
  assert.equal(r.data.ts, 1, '재입장 복구');

  // 가방 용량 — 받는 사람이 무기 30칸이 차 있으면 교환 전체를 되돌린다
  d = (await t.row(b.name)).data;
  d.bag.w = Array.from({ length: 30 }, (_, i) => ({ u: i + 1, t: 'sword', r: 0, g: 0, p: 100 }));
  d.bag.n = 31;
  await t.d1.prepare('UPDATE chars SET data = ? WHERE name_key = ?').bind(JSON.stringify(d), b.name.toLowerCase()).run();
  t.clock.t += 6000;                                       // 신청 사이 5초 제한
  r = await t.open(c, b);
  const tid2 = r.id;
  assert.ok(tid2);
  await t.act(b, tid2, 'join');
  r = await t.act(c, tid2, 'offer', { coins: 10, items: [{ k: 'w', u: '1' }] });
  h = r.trade.hash;
  const before = (await t.row(c.name)).data;
  await t.act(c, tid2, 'accept', null, h);
  r = await t.act(b, tid2, 'accept', null, h);
  assert.equal(r.trade.state, 'fail');
  assert.equal(r.trade.error, 'trade_capacity', '가방 용량 초과');
  const after = await t.row(c.name);
  assert.deepEqual(after.data, before);
  assert.equal(after.trade_seq, 0, '실패하면 양쪽 모두 롤백');

  // 일반 계정의 신청을 관리자가 수락하고 양쪽 물품 · 코인을 교환한다
  await t.d1.prepare('UPDATE chars SET admin = 1 WHERE name_key = ?').bind(c.name.toLowerCase()).run();
  t.clock.t += 6000;
  r = await t.open(b, c);
  assert.equal(r.ok, true, '관리자에게 거래 신청');
  const tid3 = r.id;
  await t.act(c, tid3, 'join');
  await t.act(b, tid3, 'offer', { coins: 5, items: [] });
  r = await t.act(c, tid3, 'offer', { coins: 10, items: [{ k: 'p', u: 'heal_s', n: 1 }] });
  h = r.trade.hash;
  await t.act(b, tid3, 'accept', null, h);
  r = await t.act(c, tid3, 'accept', null, h);
  assert.equal(r.trade.state, 'done', '관리자 거래 확정');
  const rc = await t.row(c.name), rb = await t.row(b.name);
  assert.ok(rc.admin && rc.trade_seq === 1 && rc.data.coins === 995 && rc.data.bag.p.heal_s === 4, '관리자 기록과 보유량');
  assert.ok(!rb.admin && rb.trade_seq === 2 && rb.data.coins === 1085 && rb.data.bag.p.heal_s === 8, '일반 계정은 받은 물품만 반영');

  // 관리자가 신청했다가 취소
  t.clock.t += 6000;
  r = await t.open(c, a);
  assert.equal(r.ok, true, '관리자가 거래 신청');
  const tid4 = r.id;
  r = await t.act(c, tid4, 'cancel');
  assert.equal(r.trade.state, 'cancel');

  // 장착품 차단과 접속 만료 취소는 관리자에게도 똑같이 적용한다
  const dc = (await t.row(c.name)).data;
  dc.bag.e = 1;
  await t.d1.prepare('UPDATE chars SET data = ? WHERE name_key = ?').bind(JSON.stringify(dc), c.name.toLowerCase()).run();
  t.clock.t += 6000;
  // 관리자 가방에 무기 1번이 없어졌으니 하나 만들어 둔다(받은 쪽 번호가 1이 되도록)
  dc.bag.w = [{ u: 1, t: 'sword', r: 0, g: 0, p: 100 }];
  await t.d1.prepare('UPDATE chars SET data = ? WHERE name_key = ?').bind(JSON.stringify(dc), c.name.toLowerCase()).run();
  r = await t.open(b, c);
  const tid5 = r.id;
  assert.ok(tid5);
  await t.act(c, tid5, 'join');
  r = await t.act(c, tid5, 'offer', { coins: 0, items: [{ k: 'w', u: '1' }] });
  assert.equal(r.err, 'trade_equipped', '장착품 차단');
  t.clock.t += 31000;                                      // 접속 표시가 30초 지났다
  r = await t.act(b, tid5);
  assert.equal(r.trade.state, 'cancel', '접속 만료 취소');
  assert.equal((await t.row(b.name)).trade_id, null, '취소 뒤 잠금 해제');
});

test('거래 제한 — 시간 · 같은 서버 · 빠른 재신청 · 빈 거래', async () => {
  const t = await setup(['거래갑', '거래을']);
  const [a, b] = Object.values(t.who);
  let r = await t.open(a, b);
  const tid = r.id;
  assert.equal((await t.open(a, b)).err, 'busy');
  assert.equal((await t.act(a, tid, 'offer', { coins: 1, items: [] })).err, 'state', '수락 전에는 등록할 수 없다');
  await t.act(b, tid, 'join');
  r = await t.act(a, tid, 'offer', { coins: 5000, items: [] });
  assert.equal(r.err, 'trade_funds', '코인이 모자라면 거절');
  r = await t.act(a, tid, 'offer', { coins: 0, items: [] });
  const h = r.trade.hash;
  await t.act(a, tid, 'accept', null, h);
  r = await t.act(b, tid, 'accept', null, h);
  assert.equal(r.trade.state, 'fail');
  assert.equal(r.trade.error, 'trade_empty', '빈 거래는 확정하지 않는다');
  assert.equal((await t.open(a, b)).err, 'rate', '5초 안의 재신청');
  t.clock.t += 6000;
  // 다른 서버에 있으면 신청할 수 없다
  await t.core.call('rpg_live', { p_name: b.name, p_token: b.tok, p_sid: b.sid, p_srv: 'RPG2' });
  assert.equal((await t.open(a, b)).err, 'live');
  await t.core.call('rpg_live', { p_name: b.name, p_token: b.tok, p_sid: b.sid, p_srv: 'RPG1' });
  r = await t.open(a, b);
  assert.equal(r.ok, true);
  t.clock.t += 3 * 60 * 1000 + 1000;                       // 3분이 지났다
  await t.core.call('rpg_live', { p_name: a.name, p_token: a.tok, p_sid: a.sid, p_srv: 'RPG1' });
  await t.core.call('rpg_live', { p_name: b.name, p_token: b.tok, p_sid: b.sid, p_srv: 'RPG1' });
  r = await t.act(a, r.id);
  assert.equal(r.trade.state, 'cancel');
  assert.equal(r.trade.error, 'expired');
  assert.equal((await t.open(a, a)).err, 'account', '자기 자신과는 거래할 수 없다');
  assert.equal((await t.open(a, { name: '없는사람' })).err, 'account');
  assert.equal((await t.core.call('rpg_admin_ok', { p_name: a.name, p_code: '13579' })).ok, false);
});

test('관리 화면 거래 탭은 거래를 최근 순으로 읽는다', async () => {
  const t = await setup(['거래병', '거래정']);
  const [a, b] = Object.values(t.who);
  await t.d1.prepare('UPDATE chars SET admin = 1 WHERE name_key = ?').bind(a.name.toLowerCase()).run();
  await t.open(a, b);
  const r = await t.core.call('rpg_admin_trades', { p_name: a.name, p_code: '13579' });
  assert.equal(r.ok, true);
  assert.equal(r.list.length, 1);
  assert.equal(r.list[0].state, 'invite');
  assert.deepEqual(r.list[0].accepted, [false, false]);
});
