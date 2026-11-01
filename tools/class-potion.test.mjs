import test from 'node:test';
import assert from 'node:assert/strict';
// 11월 1일 — 원소는 마법사만 · 전직 초기화 물약 · 원소 전환 물약. 실행: node --test tools/class-potion.test.mjs
import { makeWorld, rpgSyncSeats, rpgJoin, cleanLook, elemOf, skillName, heroRecord, ELEMS, hasElem } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { rpgShop, whyPotionUse } from '../src/game/shop.js';
import { POTIONS, CLASS_POTION_PRICE, SHOPS } from '../src/game/shopData.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV } from '../src/game/advData.js';
import { traitOf } from '../src/game/advance.js';

const potion = SHOPS.find((s) => s.id === 'potion');
function world(job, elem, extra = {}) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name: '물약시험', hero: { name: '물약시험', job, elem, gender: 'm' } }]);
  rpgJoin(g, 0, { name: '물약시험', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 5e6, stats: {}, bag: { oc: 1, w: [], n: 1, ...(extra.bag || {}) },
    advClass: extra.advClass, advM: extra.advM }, 'p0');
  const h = g.heroes[0];
  Object.assign(h, { map: 'plaza', x: potion.x, y: potion.y + 30 });
  return { g, h };
}

test('검사 · 궁수는 원소가 없고 마법사만 원소를 갖는다 — 예전 기록의 원소는 읽을 때 지운다', () => {
  assert.deepEqual(['warrior', 'archer', 'mage'].map(hasElem), [false, false, true]);
  assert.equal(cleanLook({ name: '검', job: 'warrior', elem: 'flame', gender: 'm' }).elem, 'none');
  assert.equal(cleanLook({ name: '궁', job: 'archer', elem: 'frost', gender: 'f' }).elem, 'none');
  assert.equal(cleanLook({ name: '마', job: 'mage', elem: 'bolt', gender: 'f' }).elem, 'bolt');
  assert.equal(cleanLook({ name: '마', job: 'mage', elem: 'none', gender: 'f' }).elem, ELEMS[0].id);   // 원소 없는 마법사는 첫 원소
  assert.equal(skillName({ job: 'warrior', elem: 'flame' }), '회오리');
  assert.equal(skillName({ job: 'mage', elem: 'frost' }), '서리 폭발');
  const { h } = world('archer', 'poison');
  assert.equal(h.elem, 'none'); assert.equal(elemOf(h).id, 'none');
});

test('두 물약은 150만 코인이고 물약 칸에는 넣지 못한다', () => {
  const ids = POTIONS.filter((p) => p.price === CLASS_POTION_PRICE).map((p) => p.id);
  assert.deepEqual(ids, ['adv_reset', 'elem_swap']);
  assert.equal(CLASS_POTION_PRICE, 1500000);
  const { g, h } = world('mage', 'flame');
  assert(rpgShop(g, 0, { op: 'pbuy', id: 'elem_swap' }).ok);
  assert.equal(h.coins, 5e6 - CLASS_POTION_PRICE);
  assert.equal(rpgShop(g, 0, { op: 'qset', i: 0, id: 'elem_swap' }).ok, false);
});

test('원소 전환 물약 — 마법사만 마시고 고른 원소로 바뀌며 자리 소식 · 저장 기록에도 실린다', () => {
  const w = world('warrior', 'flame', { bag: { p: { elem_swap: 1 } } });
  assert(whyPotionUse(w.h, 'elem_swap', 'frost').length > 0);   // 검사는 못 마신다
  const { g, h } = world('mage', 'flame', { bag: { p: { elem_swap: 2 } } });
  assert.equal(rpgShop(g, 0, { op: 'puse', id: 'elem_swap', el: 'flame' }).ok, false);   // 같은 원소
  assert.equal(rpgShop(g, 0, { op: 'puse', id: 'elem_swap', el: 'none' }).ok, false);    // 없는 원소
  const r = rpgShop(g, 0, { op: 'puse', id: 'elem_swap', el: 'gravity' });
  assert(r.ok, r.msg);
  assert.equal(h.elem, 'gravity'); assert.equal(h.bag.p.elem_swap, 1);
  assert.deepEqual(g.relook.at(-1), { pi: 0, who: 'p0', elem: 'gravity' });
  assert(g.out.some((o) => o.k === 'relook' && o.elem === 'gravity'));
  const rec = heroRecord(h, { picked: 1 }, cleanLook({ name: '물약시험', job: 'mage', elem: 'flame', gender: 'm' }));
  assert.equal(rec.elem, 'gravity');
});

test('전직 초기화 물약 — 전직 · 숙련도 · 전투 특성이 사라지고 시험 없이 다른 전직으로 바꾼다', () => {
  const { g, h } = world('warrior', 'none', { advClass: 'gladiator', advM: 99999, bag: { p: { adv_reset: 1 } } });
  assert.equal(h.advClass, 'gladiator'); assert(traitOf(h));
  const base = heroRecord(h, {}, null);                     // 마시기 전 저장 기록
  const r = rpgShop(g, 0, { op: 'puse', id: 'adv_reset' });
  assert(r.ok, r.msg);
  assert.equal(h.advClass, ''); assert.equal(h.advM, 0); assert.equal(traitOf(h), null);
  assert.equal(h.bag.ar, 1); assert.equal(h.bag.af, 1);
  // 저장 — 비운 전직이 남겨 둔 전직에 덮이지 않는다
  const saved = heroRecord(h, base, null);
  assert.equal(saved.advClass, ''); assert.equal(saved.advM, 0);
  // 시험 없이 다른 전직(기사)을 확정한다
  Object.assign(h, { x: ADV.npc.x, y: ADV.npc.y + 40 });
  rpgInput(g, { cls: 0, kind: 'adv', dir: { op: 'confirm', c: 'knight' } });
  assert.equal(h.advClass, 'knight'); assert.equal(h.advM, 0); assert.equal(h.bag.af, 0);
  const again = heroRecord(h, base, null);                  // 같은 저장 창 안에서 바로 다시 전직해도 옛 숙련도가 돌아오지 않는다
  assert.equal(again.advClass, 'knight'); assert.equal(again.advM, 0);
  // 면제는 한 번만 — 다음 전직은 다시 물약이 있어야 한다
  assert.equal(rpgShop(g, 0, { op: 'puse', id: 'adv_reset' }).ok, false);
});

test('전직 전에는 전직 초기화 물약을 마실 수 없다 · 옛 스냅샷의 빈 전직은 여전히 전직을 지우지 못한다', () => {
  const { h } = world('archer', 'none', { bag: { p: { adv_reset: 1 } } });
  assert(whyPotionUse(h, 'adv_reset').some((x) => x.includes('전직한 뒤')));
  const w = world('archer', 'none', { advClass: 'marksman', advM: 500 });
  const base = heroRecord(w.h, {}, null);
  w.h.advClass = ''; w.h.advM = 0;                          // 물약 없이 비워진 기록(섞인 스냅샷)
  assert.equal(heroRecord(w.h, base, null).advClass, 'marksman');
});
