import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, heroRecord, needNow } from '../src/game/rpg.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ACHIEVES, ACHIEVE_BY_ID, CODEX_IDS, CODEX_FIELD_IDS } from '../src/game/codexData.js';
import { TITLES, TITLE_BY_ID, REC_IDS } from '../src/game/socialData.js';
import { cleanBag } from '../src/game/shop.js';

function setup(rec = {}) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, [{ id: 'c', name: '도감시험', hero: { name: '도감시험', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '도감시험', rs: RESET.id, gift: GIFT.id, lv: 10, ts: 0, coins: 0, stats: {}, rec, bag: { oc: 1, w: [], n: 1 } }, 'c');
  return { g, h: g.heroes[0] };
}
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.05); i++) rpgStep(g, 0.05); };

test('도감 몹은 모두 기록 열쇠이고 업적 칭호는 같은 조건의 칭호가 있다', () => {
  for (const k of CODEX_IDS) assert(REC_IDS.includes(k), k);
  for (const a of ACHIEVES.filter((x) => x.title)) assert.deepEqual(TITLE_BY_ID[a.title].need, a.need, a.id);
  assert(TITLES.length <= 62);                     // 칭호 비트 두 숫자(31 + 31)
  assert.equal(new Set(ACHIEVES.map((a) => a.id)).size, ACHIEVES.length);
});

test('조건을 채운 업적만 코인을 한 번 준다', () => {
  const { g, h } = setup({ rabbit: 3, wolf: 1, boar: 1, gorilla: 1, goblin: 1, dg: 1 });
  assert.equal(needNow(h, 'dex'), 5);
  run(g, 1);
  const want = ACHIEVE_BY_ID.dex5.coin + ACHIEVE_BY_ID.dg1.coin;
  assert.equal(h.coins, want);
  assert.deepEqual([...h.bag.ac].sort(), ['dex5', 'dg1']);
  run(g, 1);
  assert.equal(h.coins, want);                     // 다시 주지 않는다
});

test('받은 업적은 저장 · 스냅샷 · 가방 정리 뒤에도 남는다', () => {
  const { g, h } = setup({ dg: 10 });
  run(g, 1);
  assert(h.bag.ac.includes('dg10'));
  assert.deepEqual(cleanBag(heroRecord(h, {}).bag).ac, h.bag.ac);
  const other = makeWorld(); rpgApply(other, rpgPack(g));
  assert(other.heroes[0].bag.ac.includes('dg10'));
});

test('도감을 모두 채우면 칭호와 코인을 받는다', () => {
  const rec = Object.fromEntries(CODEX_IDS.map((k) => [k, CODEX_FIELD_IDS.includes(k) ? 100 : 1]));
  const { g, h } = setup(rec);
  run(g, 1);
  assert(h.titles.includes('dexall'));
  assert(h.titles.includes('dex100'));
  assert(h.bag.ac.includes('dexall') && h.bag.ac.includes('dex100_all'));
});
