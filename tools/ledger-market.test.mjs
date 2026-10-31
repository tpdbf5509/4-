import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerCore } from '../server/src/ledger.js';
import { MARKET, marketNet } from '../src/game/marketData.js';
import { fakeD1 } from './fake-d1.mjs';

/* 광장 장터 게시판 — 올리기 · 사기 · 수수료 · 보관함 · 기간 끝 · 막이 */
const base = {
  lv: 10, coins: 1000, rs: '2026-10-19', ts: 0,
  bag: { w: [{ u: 1, t: 'sword', r: 0, g: 0, p: 100 }, { u: 2, t: 'axe', r: 0, g: 0, p: 90 }], a: [], ae: {}, e: 2, n: 3, v: 1, p: { heal_s: 5 }, m: { fur: 10 }, wp: 5, gd: 2, pg: [] },
};
const setup = async (names = ['QA장터가', 'QA장터나']) => {
  const d1 = fakeD1(), clock = { t: 1_000_000_000_000 };
  const core = new LedgerCore(d1, { now: () => clock.t });
  const who = {};
  for (const n of names) {
    const r = await core.call('rpg_create', { p_name: n, p_code: '13579', p_data: { ...structuredClone(base), name: n } });
    who[n] = { name: n, tok: r.token, sid: `s${Object.keys(who).length}` };
    await core.call('rpg_live', { p_name: n, p_token: r.token, p_sid: who[n].sid, p_srv: 'RPG1' });
  }
  const live = async () => { for (const w of Object.values(who)) await core.call('rpg_live', { p_name: w.name, p_token: w.tok, p_sid: w.sid, p_srv: 'RPG1' }); };
  const mk = (me, op = 'get', args = {}) => { clock.t += MARKET.rateMs + 1; return core.call('rpg_market', { p_name: me.name, p_token: me.tok, p_sid: me.sid, p_op: op, p_args: args }); };
  const row = (n) => core.charRow(n.toLowerCase());
  return { d1, clock, core, who, mk, row, live };
};

test('올리기 · 사기 · 대금 받기', async () => {
  const t = await setup();
  const [a, b] = Object.values(t.who);
  assert.equal((await t.mk(a, 'post', { k: 'w', u: '2', price: 100 })).err, 'trade_equipped', '장착한 무기는 못 올린다');
  assert.equal((await t.mk(a, 'post', { k: 'w', u: '1', price: 0 })).err, 'price');
  let r = await t.mk(a, 'post', { k: 'w', u: '1', price: 400 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.changed, true);
  assert.equal(r.mine.length, 1);
  let d = (await t.row(a.name)).data;
  assert.equal(d.bag.w.length, 1, '가방에서 빠졌다');
  assert.equal(d.ts, 1);
  // 옛 차례의 저장은 막힌다(물건이 되살아나지 않게)
  assert.equal((await t.core.call('rpg_save', { p_name: a.name, p_token: a.tok, p_data: { ...base, name: a.name } })).err, 'stale');
  r = await t.mk(a, 'post', { k: 'p', u: 'heal_s', n: 3, price: 50 });
  assert.equal(r.ok, true);
  assert.equal((await t.row(a.name)).data.bag.p.heal_s, 2);
  // 산다
  r = await t.mk(b, 'get');
  assert.equal(r.list.length, 2);
  const sword = r.list.find((x) => x.k === 'w');
  assert.equal(sword.seller, a.name);
  assert.equal((await t.mk(a, 'buy', { id: sword.id, price: 400 })).err, 'own');
  assert.equal((await t.mk(b, 'buy', { id: sword.id, price: 300 })).err, 'changed');
  r = await t.mk(b, 'buy', { id: sword.id, price: 400 });
  assert.equal(r.ok, true, JSON.stringify(r));
  d = (await t.row(b.name)).data;
  assert.equal(d.coins, 600);
  assert.equal(d.bag.w.length, 3);
  assert.equal(d.bag.w[2].u, 3, '받는 가방에서 새 번호');
  assert.equal(d.bag.w[2].p, 100);
  assert.equal((await t.mk(b, 'buy', { id: sword.id, price: 400 })).err, 'gone', '두 번 못 산다');
  // 판매자는 기록이 그대로이고 보관함에 대금이 있다
  assert.equal((await t.row(a.name)).data.coins, 1000);
  r = await t.mk(a, 'get');
  assert.equal(r.box.length, 1);
  assert.equal(r.box[0].coins, marketNet(400));
  assert.equal(marketNet(400), 380, '수수료 5%');
  r = await t.mk(a, 'claim');
  assert.equal(r.ok, true);
  assert.equal(r.box.length, 0);
  assert.equal((await t.row(a.name)).data.coins, 1380);
});

test('코인 부족 · 칸 한도 · 관리자 · 취소 · 기간 끝', async () => {
  const t = await setup();
  const [a, b] = Object.values(t.who);
  let r = await t.mk(a, 'post', { k: 'm', u: 'fur', n: 1, price: 5000 });
  assert.equal((await t.mk(b, 'buy', { id: r.mine[0].id, price: 5000 })).err, 'trade_funds');
  for (let i = 1; i < MARKET.slots; i++) assert.equal((await t.mk(a, 'post', { k: 'm', u: 'fur', n: 1, price: 10 })).ok, true);
  assert.equal((await t.mk(a, 'post', { k: 'm', u: 'fur', n: 1, price: 10 })).err, 'slots');
  // 취소하면 가방으로
  r = await t.mk(a, 'get');
  const furBefore = (await t.row(a.name)).data.bag.m.fur;
  r = await t.mk(a, 'cancel', { id: r.mine[0].id });
  assert.equal(r.ok, true);
  assert.equal((await t.row(a.name)).data.bag.m.fur, furBefore + 1);
  // 기간이 지나면 보관함으로 — 받으면 가방에
  t.clock.t += MARKET.hours * 3600e3 + 1;
  await t.live();
  r = await t.mk(a, 'get');
  assert.equal(r.mine.length, 0);
  assert.equal(r.box.length, MARKET.slots - 1);
  assert.ok(r.box.every((x) => x.why === 'expired' && x.give));
  r = await t.mk(a, 'claim');
  assert.equal((await t.row(a.name)).data.bag.m.fur, 10);
  // 관리자는 올리지 못한다
  t.d1.db.prepare('UPDATE chars SET admin = 1 WHERE name_key = ?').run(b.name.toLowerCase());
  assert.equal((await t.mk(b, 'post', { k: 'm', u: 'fur', n: 1, price: 10 })).err, 'admin');
  // 접속 표시가 없으면 못 쓴다
  t.clock.t += 60e3;
  assert.equal((await t.mk(a, 'get')).err, 'live');
});

test('목록 보기는 D1 에 쓰지 않는다', async () => {
  const t = await setup();
  const [a] = Object.values(t.who);
  await t.mk(a, 'get');
  let writes = 0;
  const orig = t.d1.batch.bind(t.d1);
  t.d1.batch = async (l) => { writes += 1; return orig(l); };
  const prep = t.d1.prepare;
  t.d1.prepare = (sql) => { if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) writes += 1; return prep(sql); };
  for (let i = 0; i < 5; i++) await t.mk(a, 'get');
  assert.equal(writes, 0);
});
