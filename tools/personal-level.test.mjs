import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStat, statLeft } from '../src/game/rpg.js';
import { RESET, GIFT } from '../src/game/itemData.js';

const mk = (name, lv, stats = {}) => {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name, hero: { name, job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name, rs: RESET.id, gift: GIFT.id, lv, ts: 0, coins: 0, stats, bag: { oc: 1, w: [], n: 1, m: {} } }, 'p0');
  return g;
};
test('놀기는 200레벨로 오르고 한 번만 받는다', () => {
  const g = mk('놀기', 50);
  const h = g.heroes[0];
  assert.equal(h.lv, 200);
  assert.ok(h.bag.pg.includes('pl-2026-11-06-1'));
  assert.ok(statLeft(h) > 300);
  assert.equal(rpgStat(g, 0, { atk: 7, hp: 3 }), true);
});
test('다른 이름이나 이미 높은 레벨은 그대로', () => {
  assert.equal(mk('다른사람', 50).heroes[0].lv, 50);
  assert.equal(mk('놀기', 300).heroes[0].lv, 300);
});
