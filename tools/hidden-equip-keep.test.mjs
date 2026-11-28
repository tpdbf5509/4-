/* 히든 직업 — 나갔다 들어와도(저장 → 다시 읽기 · cleanBag) 전용 무기 장착이 풀리지 않는다(11월 28일 사용자 신고).
   node --test tools/hidden-equip-keep.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep } from '../src/game/rpg.js';
import { cleanBag, equipped } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { unlockWyvern } from '../src/game/wyvernJob.js';
import { unlockNecro } from '../src/game/necroJob.js';
import { unlockBlood } from '../src/game/bloodJob.js';
import { unlockGambler } from '../src/game/gamblerJob.js';
import { WY_WEAPON_ITEM } from '../src/game/wyvernData.js';
import { NC_WEAPON_ITEM } from '../src/game/necroData.js';
import { BLOOD_GUN_ITEM } from '../src/game/bloodGunData.js';

function hero() {
  const g = makeWorld(); g.out = []; g.test = 1; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'w0', name: '시험', hero: { name: '시험', job: 'warrior', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '시험', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [] } });
  const h = g.heroes[0]; rpgStep(g, .01); return h;
}
const give = (h, it) => { const u = (h.bag.n = (h.bag.n || 1) + 1); h.bag.w.push({ u, t: it.t, r: 4, g: it.g, p: 0, sp: it.id }); h.bag.e = u; return u; };
// 저장(JSON) → 다시 읽기를 두 번 — 접속 · 서버 이동 때마다 cleanBag 을 지나간다
const reload = (bag) => cleanBag(cleanBag(JSON.parse(JSON.stringify(bag))));

test('와이번 나이트 — 아르카디온을 든 채 다시 접속해도 그대로', () => {
  const h = hero(); unlockWyvern(h, { lv: 30 }); const u = give(h, WY_WEAPON_ITEM);
  assert.equal(reload(h.bag).e, u); assert.equal(equipped(reload(h.bag)).sp, WY_WEAPON_ITEM.id);
});
test('네크로맨서 — 그림자 낫 유지', () => {
  const h = hero(); unlockNecro(h, { lv: 30 }); const u = give(h, NC_WEAPON_ITEM);
  assert.equal(reload(h.bag).e, u);
});
test('BLOOD-001 — 크림슨 레퀴엠 유지', () => {
  const h = hero(); unlockBlood(h); const u = give(h, BLOOD_GUN_ITEM);
  assert.equal(reload(h.bag).e, u);
});
test('무기를 들지 않는 히든 직업(도박꾼)은 접속하면 맨손', () => {
  const h = hero(); unlockGambler(h); give(h, WY_WEAPON_ITEM);
  assert.equal(reload(h.bag).e, 0);
});
test('와이번 나이트가 다른 무기를 들고 있었다면 내려놓는다', () => {
  const h = hero(); unlockWyvern(h, { lv: 30 }); h.bag.w.push({ u: 9, t: 'sword', r: 0, g: 0, p: 0 }); h.bag.e = 9;
  assert.equal(reload(h.bag).e, 0);
});
