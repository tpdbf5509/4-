/* 오닉스 · 황금 진열장 상점(11월 27일 사용자 기획) — 값 · 판정 · 저장 보호 · 상자 확률을 실제 함수로 본다.
   node --test tools/onyx.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, heroRecord, cleanLook } from '../src/game/rpg.js';
import { rpgShop, cleanBag, boxShares, BOX_ONYX, whyOxBuy } from '../src/game/shop.js';
import { SHOPS, BOX, POTIONS } from '../src/game/shopData.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { TITLES, TITLE_BY_ID } from '../src/game/socialData.js';
import { ONYX, OX_ACC, OX_TITLES, OX_GOODS, OX_ACC_BIT, protectOx, oxOf, accWorn } from '../src/game/onyxData.js';

const shop = SHOPS.find((s) => s.id === 'onyx');
function world(ox = 0, extra = {}) {
  const g = makeWorld(); g.mySeat = 0; g.out = []; g.server = true;
  rpgSyncSeats(g, [{ id: 'p0', name: '오닉스', hero: { name: '오닉스', job: 'warrior', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '오닉스', rs: RESET.id, gift: GIFT.id, lv: 50, ts: 0, coins: 1000, stats: {}, bag: { oc: 1, w: [], n: 1, ox, ...(extra.bag || {}) } }, 'p0');
  const h = g.heroes[0];
  Object.assign(h, { map: 'plaza', x: shop.x, y: shop.y + 30 });
  return { g, h };
}

test('사용자 표 그대로 — 장신구 4 · 칭호 16 · 성전환 물약 420 · 상자 오닉스 확률', () => {
  assert.deepEqual(OX_ACC.map((a) => [a.name, a.price]), [['흑옥 브로치', 3], ['황금 진열장의 단골', 6], ['밤빛 벨벳 망토', 8], ['은화 발자국', 10]]);
  assert.deepEqual(OX_TITLES.map((t) => [t.name, t.ox]), [['비무는 예약제', 120], ['무림고수', 200], ['지나가던 절대고수', 280], ['흑련', 400], ['천뢰', 440], ['참월', 480],
    ['백금서의 서명', 520], ['단천', 560], ['왕관에 박힌 새벽', 600], ['일검무쌍', 640], ['자정 경매의 낙찰자', 680], ['무림절정', 720], ['일곱 번째 왕관', 760],
    ['흑금관의 주인', 840], ['천하제일', 1000], ['왕실의 마지막 인장', 1000]]);
  assert.deepEqual(OX_GOODS, [{ id: 'gender_swap', ox: 420 }]);
  assert.deepEqual(BOX.onyx, { 10: 3, 25: 1.5, 75: 0.4, 200: 0.1 });
  assert.ok(Math.abs(BOX_ONYX - 0.05) < 1e-12);
  // 칭호 보너스 점수 — 값 구간(1점 ~280 · 2점 400~560 · 3점 600~760 · 4점 840~)
  for (const t of OX_TITLES) {
    const pts = Object.values(t.up)[0], want = t.ox <= 280 ? 1 : t.ox <= 560 ? 2 : t.ox <= 760 ? 3 : 4;
    assert.equal(pts, want, t.name);
  }
  assert.ok(TITLES.length <= 93, '칭호 비트 세 칸(93개) 안');
  for (const t of OX_TITLES) assert.equal(TITLE_BY_ID[t.id], t);
});

test('상자 — 확률 합 100% · 모든 물약이 들어간다(성전환 물약은 상점 전용) · 오닉스는 물약 몫에서 뺐다', () => {
  for (const lv of [1, 100, 400]) {
    const s = boxShares(lv);
    assert.ok(Math.abs(s.special + s.weapon + s.onyx + s.potion - 1) < 1e-9);
  }
  const ids = Object.keys(BOX.potions);
  assert.deepEqual(POTIONS.filter((p) => !p.ox).map((p) => p.id).sort(), [...ids].sort());
  assert.ok(Math.abs(Object.values(BOX.potions).reduce((a, b) => a + b, 0) - 45) < 1e-9);
});

test('사기 — 전용 서버만 · 값만큼 빠지고 · 모자라면 거절 · 산 장신구 · 칭호는 바로 단다', () => {
  const { g, h } = world(20);
  g.server = false;
  assert.equal(rpgShop(g, 0, { op: 'oxbuy', kind: 'acc', id: 'brooch' }).ok, false, '방장 브라우저 판정은 거절');
  g.server = true;
  assert.ok(rpgShop(g, 0, { op: 'oxbuy', kind: 'acc', id: 'brooch' }).ok);
  assert.equal(oxOf(h.bag), 17);
  assert.equal(accWorn(h.bag), OX_ACC_BIT.brooch);
  assert.equal(rpgShop(g, 0, { op: 'oxbuy', kind: 'acc', id: 'brooch' }).ok, false, '두 번 사지 못한다');
  assert.ok(rpgShop(g, 0, { op: 'oxbuy', kind: 'acc', id: 'silver' }).ok);
  assert.equal(oxOf(h.bag), 7);
  assert.equal(rpgShop(g, 0, { op: 'oxbuy', kind: 'acc', id: 'cape' }).ok, false, '7 < 8');
  assert.ok(whyOxBuy(h, 'acc', 'cape').some((t) => t.includes('부족')));
  assert.ok(rpgShop(g, 0, { op: 'oxwear', id: 'silver', on: false }).ok);
  assert.equal(accWorn(h.bag), OX_ACC_BIT.brooch);
  assert.equal(rpgShop(g, 0, { op: 'oxwear', id: 'cape', on: true }).ok, false, '없는 장신구는 달 수 없다');
  const far = world(1000); far.h.x += 900;
  assert.equal(rpgShop(far.g, 0, { op: 'oxbuy', kind: 'title', id: 'ox_bimu' }).ok, false, '상점 가까이 가야 한다');
  const w = world(1000);
  assert.ok(rpgShop(w.g, 0, { op: 'oxbuy', kind: 'title', id: 'ox_first' }).ok);
  assert.equal(oxOf(w.h.bag), 0);
  assert.ok(w.h.titles.includes('ox_first')); assert.equal(w.h.title, 'ox_first');
  const p = world(420);
  assert.ok(rpgShop(p.g, 0, { op: 'oxbuy', kind: 'good', id: 'gender_swap' }).ok);
  assert.equal(p.h.bag.p.gender_swap, 1);
  assert.ok(rpgShop(p.g, 0, { op: 'puse', id: 'gender_swap' }).ok);
  assert.equal(p.h.gender, 'f');
  assert.ok(p.g.out.some((o) => o.k === 'relook' && o.gender === 'f'));
  const rec = heroRecord(p.h, { picked: 1 }, cleanLook({ name: '오닉스', job: 'warrior', gender: 'm' }));
  assert.equal(rec.gender, 'f', '바뀐 성별이 저장된다');
});

test('저장 보호 — 화면이 보낸 저장은 오닉스 · 산 장신구 · 오닉스 칭호 · 성전환 물약을 늘리지 못한다', () => {
  const old = { bag: { ox: 50, oa: OX_ACC_BIT.brooch, p: { gender_swap: 1 } }, titles: ['ox_bimu'] };
  const fake = { bag: { ox: 99999, oa: 15, ow: 15, p: { gender_swap: 9, heal_s: 3 } }, titles: ['ox_bimu', 'ox_first', 'rookie'], title: 'ox_first' };
  const out = protectOx(fake, old);
  assert.equal(out.bag.ox, 50);
  assert.equal(out.bag.oa, OX_ACC_BIT.brooch);
  assert.equal(out.bag.ow, OX_ACC_BIT.brooch);
  assert.equal(out.bag.p.gender_swap, 1);
  assert.equal(out.bag.p.heal_s, 3, '다른 물약은 그대로');
  assert.deepEqual(out.titles, ['ox_bimu', 'rookie']);
  assert.equal(out.title, '');
  const spent = protectOx({ bag: { ox: 10 }, titles: [] }, old);
  assert.equal(spent.bag.ox, 10, '줄어든 것은 그대로 받는다');
  const fresh = protectOx(fake, null);
  assert.equal(fresh.bag.ox, undefined, '새 계정은 0');
  assert.equal(fresh.bag.oa, undefined);
  const b = cleanBag({ ox: 1e12, oa: 99, ow: 99 });
  assert.equal(b.ox, ONYX.max); assert.equal(b.oa, 15); assert.equal(b.ow, 15);
});
