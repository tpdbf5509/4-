import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, heroRecord } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT, MAT_BY_ID, MATERIALS } from '../src/game/itemData.js';
import { SHOPS, POTIONS, POTION, CLASS_POTION_PRICE } from '../src/game/shopData.js';
import { cleanBag, whyPotionBuy, todayKey } from '../src/game/shop.js';
import { ALCH, ALCH_MATS, RECIPES, RECIPE_BY_ID, HERBS, HERBS_BY_MAP, GATHER, ALCH_REQ, needCraftXp, SPECIAL_POTIONS } from '../src/game/alchemyData.js';
import { cleanAl, craftXp, addCraftXp, craftOnce, craftMany, greatChance, rollAlchReq, reqPool, newAl } from '../src/game/alchemy.js';
import { TITLE_BY_ID, REC_IDS } from '../src/game/socialData.js';
import { MAPS } from '../src/game/rpg.js';

// 물약 제작 · 연금술 개편(11월 9일). 실행: node --test tools/alchemy.test.mjs
const POT = SHOPS.find((s) => s.id === 'potion');
function world(people = [{}], server = true) {
  const g = makeWorld(); g.mySeat = 0; g.out = []; g.server = server;
  const seats = people.map((p, i) => ({ id: `p${i}`, name: `약사${i}`, hero: { name: `약사${i}`, job: 'warrior', elem: 'flame', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: `약사${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 50, ts: 0, coins: p.coins ?? 100000, stats: {},
    rec: {}, titles: [], bag: { oc: 1, w: [], n: 1, pg: p.conv ? [] : ['pc-2026-11-09'], m: p.m || {}, p: p.p || {}, ...(p.al ? { al: p.al } : {}) } }, `p${i}`));
  g.heroes.forEach((h) => { if (h) { h.map = 'plaza'; h.x = POT.x; h.y = POT.y + 40; } });
  return g;
}
const shop = (g, pi, req) => rpgInput(g, { cls: pi, kind: 'shop', dir: req });
const lastNote = (g, pi) => g.notes.filter((n) => n.who === pi).at(-1);
const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

test('1 · 14. 새 캐릭터 · 옛 캐릭터 모두 제작 Lv 1 · 경험치 0 에서 시작하고 기존 가방은 그대로', () => {
  const b = cleanBag({ p: { heal_s: 7, hide2: 3, reset: 1 }, m: { heart: 5 } });
  assert.deepEqual([b.al.lv, b.al.xp], [1, 0]);
  assert.equal(b.p.heal_s, 7); assert.equal(b.p.hide2, 3); assert.equal(b.p.reset, 1); assert.equal(b.m.heart, 5);
  const g = world([{}]);
  assert.deepEqual([g.heroes[0].bag.al.lv, g.heroes[0].bag.al.xp], [1, 0]);
  assert.deepEqual(cleanAl({ lv: 99, xp: 5 }), { lv: 50, xp: 0, n: 0 }, '50을 넘지 않는다');
  assert.equal(cleanAl({ lv: 3, xp: 99999 }).xp, needCraftXp(3) - 1, '경험치는 그 레벨 몫을 넘지 않는다');
});

test('경험치 공식 · 연속 레벨업 · 50레벨 정지 · 레벨 차이 감소', () => {
  assert.equal(needCraftXp(1), 80); assert.equal(needCraftXp(2), 100); assert.equal(needCraftXp(49), 1040);
  const al = newAl();
  assert.equal(addCraftXp(al, 80 + 100 + 120 + 5), 3, '한 번에 여러 레벨');
  assert.deepEqual([al.lv, al.xp], [4, 5]);
  const top = { lv: 49, xp: 0, n: 0 };
  addCraftXp(top, 999999);
  assert.deepEqual([top.lv, top.xp], [50, 0], '50에서 멈추고 더 쌓지 않는다');
  assert.equal(addCraftXp(top, 500), 0);
  const r = RECIPE_BY_ID.heal_s;   // 해금 1 · 경험치 10
  assert.equal(craftXp(15, r), 10); assert.equal(craftXp(16, r), 5, '차이 15 → 50%'); assert.equal(craftXp(26, r), 0, '차이 25 → 0');
  assert.equal(craftXp(16, RECIPE_BY_ID.heal_m), 18, '차이 11 → 그대로');
  assert.equal(craftXp(20, RECIPE_BY_ID.heal_m), 9, '18 × 0.5 = 9 정수');
  assert.deepEqual([1, 19, 20, 39, 40, 49, 50].map(greatChance), [0.03, 0.03, 0.05, 0.05, 0.08, 0.08, 0.1]);
});

test('2 · 3. 제작 — 재료 소모 · 경험치 지급 · 서버 판정(약사 곁에서만)', () => {
  const g = world([{ m: { herb: 5, water: 3 } }]);
  const h = g.heroes[0];
  shop(g, 0, { op: 'craft', id: 'heal_s', n: 1 });
  assert.equal(lastNote(g, 0).ok, true, lastNote(g, 0).msg);
  assert.equal(h.bag.m.herb, 3); assert.equal(h.bag.m.water, 2);
  assert.ok(h.bag.p.heal_s >= 1);
  assert.equal(h.bag.al.xp, 10);
  h.x = 100; h.y = 900;   // 멀리
  shop(g, 0, { op: 'craft', id: 'heal_s', n: 1 });
  assert.equal(lastNote(g, 0).ok, false, '상점 곁이 아니면 막는다');
  assert.equal(h.bag.m.herb, 3);
  h.x = POT.x; h.y = POT.y + 40;
  shop(g, 0, { op: 'craft', id: 'heal_m', n: 1 });
  assert.match(lastNote(g, 0).msg, /제작 레벨 5 필요/, '레벨 조건');
  shop(g, 0, { op: 'craft', id: 'nope', n: 1 });
  assert.equal(lastNote(g, 0).ok, false);
  // 화면이 보낸 결과 · 경험치 · 수량은 쓰지 않는다
  shop(g, 0, { op: 'craft', id: 'heal_s', n: 1, xp: 99999, got: 50, great: true });
  assert.equal(h.bag.al.xp, 20);
});

test('4. 제작으로 50레벨에 닿으면 칭호 「마스터 연금술사」를 한 번 받는다', () => {
  const g = world([{ al: { lv: 49, xp: needCraftXp(49) - 5 }, m: { shadow_grass: 50, pure_water: 50 } }]);
  const h = g.heroes[0];
  shop(g, 0, { op: 'craft', id: 'hide2', n: 1 });
  assert.equal(h.bag.al.lv, 50);
  for (let i = 0; i < 4; i++) rpgStep(g, 0.2);
  assert.equal(h.rec.alch, 1);
  assert.ok(h.titles.includes('alch50'));
  assert.equal(h.titles.filter((t) => t === 'alch50').length, 1);
  assert.ok(TITLE_BY_ID.alch50 && TITLE_BY_ID.alch50.name === '마스터 연금술사');
  assert.equal(REC_IDS.at(-1), 'alch');
});

test('5 · 6 · 7. Lv 49 는 일반 물약을 못 사고(서버도) Lv 50 은 산다 · 특별 물약은 늘 산다', () => {
  const g = world([{ al: { lv: 49 } }, { al: { lv: 50 } }]);
  const [a, b] = g.heroes;
  const gen = POTIONS.filter((p) => !SPECIAL_POTIONS.includes(p.id));
  gen.forEach((p) => assert.deepEqual(whyPotionBuy(a, p.id), ['물약 제작 레벨 50부터 구매할 수 있습니다.'], p.id));
  const c0 = a.coins;
  shop(g, 0, { op: 'pbuy', id: 'heal_s' });
  assert.equal(lastNote(g, 0).ok, false); assert.equal(a.coins, c0); assert.ok(!(a.bag.p.heal_s > 0), '서버가 막는다');
  shop(g, 1, { op: 'pbuy', id: 'heal_s' });
  assert.equal(lastNote(g, 1).ok, true); assert.equal(b.bag.p.heal_s, 1); assert.equal(b.coins, 100000 - 30, '값은 그대로 30');
  shop(g, 0, { op: 'pbuy', id: 'reset' });
  assert.equal(lastNote(g, 0).ok, true, '스탯 초기화 물약은 제작 레벨과 상관없다'); assert.equal(a.bag.p.reset, 1);
  a.coins = CLASS_POTION_PRICE;
  shop(g, 0, { op: 'pbuy', id: 'adv_reset' });
  assert.equal(lastNote(g, 0).ok, true); assert.equal(a.coins, 0, '전직 초기화 150만 그대로');
  assert.deepEqual(POTIONS.map((p) => [p.id, p.price]), [['heal_s', 30], ['heal_m', 80], ['heal_l', 200], ['buff_str', 150], ['buff_int', 150], ['buff_crit', 200], ['reset', 5000],
    ['speed1', 300], ['speed2', 900], ['hide1', 1750], ['hide2', 3000], ['adv_reset', 1500000], ['elem_swap', 1500000]], '가격 그대로');
});

test('8. 가진 물약은 제작 레벨과 상관없이 마신다 · 효과 그대로', () => {
  const g = world([{ p: { heal_s: 2, buff_str: 1 } }]);
  const h = g.heroes[0];
  h.hp = 1;
  shop(g, 0, { op: 'puse', id: 'heal_s' });
  assert.equal(lastNote(g, 0).ok, true);
  assert.equal(h.bag.p.heal_s, 1);
  assert.ok(h.hp > 1);
  shop(g, 0, { op: 'puse', id: 'buff_str' });
  assert.equal(h.bf.str.t, 60); assert.ok([20, 40].includes(h.bf.str.a));
  assert.deepEqual(POTIONS.filter((p) => p.kind === 'heal').map((p) => p.pct), [0.25, 0.5, 0.8]);
  assert.equal(POTION.greatChance, 0.05); assert.equal(POTION.stackMax, 99);
});

test('9 · 10. 대성공은 하나 더(경험치 한 번) · 재료 절약은 실제로 덜 쓰고 모든 재료는 1개 이상 쓴다', () => {
  const h = { bag: { p: {}, m: { herb: 10, water: 10 }, v: 0, al: { lv: 1, xp: 0, n: 0 } } };
  const r = craftOnce(h, 'heal_s', seq(0.01));          // 절약은 45레벨부터 — 첫 값은 대성공 판정
  assert.equal(r.great, true); assert.equal(h.bag.p.heal_s, 2); assert.equal(r.xp, 10);
  assert.deepEqual([h.bag.m.herb, h.bag.m.water], [8, 9], '재료는 한 번 몫만');
  const h2 = { bag: { p: {}, m: { herb: 10, life_flower: 5 }, v: 0, al: { lv: 45, xp: 0, n: 0 } } };
  const r2 = craftOnce(h2, 'heal_l', seq(0.01, 0.9, 0.99));   // 절약 터짐 → 고르기 → 대성공 아님
  assert.equal(r2.saved, 'herb', '2개 이상 드는 재료만 줄인다');
  assert.deepEqual([h2.bag.m.herb, h2.bag.m.life_flower], [10 - 5, 4], '약초 6 → 5, 생명의 꽃 1 그대로');
  const h3 = { bag: { p: {}, m: { herb: 10, life_flower: 5 }, v: 0, al: { lv: 44, xp: 0, n: 0 } } };
  assert.equal(craftOnce(h3, 'heal_l', seq(0.01, 0.9, 0.99)).saved, '', '44레벨은 절약 없음');
  // 가방 한도 — 98개면 대성공이어도 99까지
  const h4 = { bag: { p: { heal_s: 98 }, m: { herb: 10, water: 10 }, v: 0, al: { lv: 1, xp: 0, n: 0 } } };
  craftOnce(h4, 'heal_s', seq(0.01));
  assert.equal(h4.bag.p.heal_s, 99);
  assert.equal(craftOnce(h4, 'heal_s'), null, '99개면 만들지 않는다');
});

test('11. 연속 제작 — 한 번마다 따지고 실제로 만든 만큼만 · 재료를 겹쳐 빼지 않는다', () => {
  const h = { bag: { p: {}, m: { herb: 9, water: 10 }, v: 0, al: { lv: 1, xp: 0, n: 0 } } };
  const r = craftMany(h, 'heal_s', 10, () => 0.99);
  assert.equal(r.done, 4, '약초 9 → 4번');
  assert.deepEqual([h.bag.m.herb, h.bag.m.water, h.bag.p.heal_s, r.xp], [1, 6, 4, 40]);
  assert.match(r.stop[0], /약초 1개 부족/);
  const g = world([{ m: { herb: 100, water: 100 }, p: { heal_s: 95 } }]);
  shop(g, 0, { op: 'craft', id: 'heal_s', n: 10 });
  const b = g.heroes[0].bag;
  assert.equal(b.p.heal_s, 99, '가방 한도에서 멈춘다');
  assert.ok(b.m.herb >= 100 - 2 * 4 && b.m.herb <= 100 - 2 * 2, `만든 만큼만 썼다 (${b.m.herb})`);
  shop(g, 0, { op: 'craft', id: 'heal_s', n: 37 });   // 10번 말고는 한 번
  assert.equal(lastNote(g, 0).ok, false, '99개라 막는다');
});

test('물 · 정제수는 제작 레벨과 상관없이 산다', () => {
  const g = world([{ coins: 1000 }]);
  const h = g.heroes[0];
  shop(g, 0, { op: 'abuy', id: 'water', n: 10 });
  assert.equal(h.bag.m.water, 10); assert.equal(h.coins, 900);
  shop(g, 0, { op: 'abuy', id: 'pure_water', n: 1 });
  assert.equal(h.bag.m.pure_water, 1); assert.equal(h.coins, 840);
  shop(g, 0, { op: 'abuy', id: 'herb', n: 1 });
  assert.equal(lastNote(g, 0).ok, false, '약초는 팔지 않는다');
  shop(g, 0, { op: 'abuy', id: 'water', n: 1000 });
  assert.equal(lastNote(g, 0).ok, false);
});

test('12. 채집 — 거리 · 1초 · 이동 취소 · 60초 재생성 · 동시에 해도 하나만 받는다', () => {
  const g = world([{}, {}]);
  const [a, b] = g.heroes;
  const n = HERBS_BY_MAP.field.find((x) => x.kind === 'herb');
  [a, b].forEach((h, k) => { h.map = 'field'; h.x = n.x + 30 + k * 10; h.y = n.y; });
  rpgInput(g, { cls: 0, kind: 'herb', dir: { op: 'go', i: n.i } });
  rpgInput(g, { cls: 1, kind: 'herb', dir: { op: 'go', i: n.i } });
  assert.ok(a.gath && b.gath);
  rpgStep(g, 0.5);
  assert.ok(!(a.bag.m.herb > 0), '1초 전에는 받지 않는다');
  rpgStep(g, 0.6);
  const got = [a.bag.m.herb || 0, b.bag.m.herb || 0];
  assert.equal(got.filter((x) => x > 0).length, 1, `한 사람만 받는다 ${got}`);
  assert.ok(got.every((x) => x <= 3) && got.some((x) => x >= 1));
  assert.ok(g.herbs[n.i] > 59, '자리가 비었다');
  rpgInput(g, { cls: 0, kind: 'herb', dir: { op: 'go', i: n.i } });
  assert.ok(!a.gath, '빈 자리는 채집하지 못한다');
  // 스냅샷으로 손님에게 간다
  const s = rpgPack(g), c = makeWorld(); c.mySeat = 1;
  rpgApply(c, JSON.parse(JSON.stringify(s)));
  assert.ok(c.herbs[n.i] > 0, '손님도 빈 자리를 안다');
  for (let t = 0; t < 61; t += 0.25) rpgStep(g, 0.25);
  assert.ok(!g.herbs[n.i], '60초 뒤 다시 난다');
  // 멀면 막고, 움직이면 취소
  a.x = n.x + GATHER.reach + 20;
  rpgInput(g, { cls: 0, kind: 'herb', dir: { op: 'go', i: n.i } });
  assert.ok(!a.gath, '100px 밖');
  a.x = n.x + 50;
  rpgInput(g, { cls: 0, kind: 'herb', dir: { op: 'go', i: n.i } });
  assert.ok(a.gath);
  rpgInput(g, { cls: 0, kind: 'hold', dir: ['right'] });
  rpgStep(g, 0.3); rpgStep(g, 0.3);
  assert.equal(a.gath, null, '움직이면 취소');
  assert.ok(!g.herbs[n.i], '취소하면 자리는 그대로');
});

test('채집물 자리 — 문 · 도착 자리 · NPC · 몹 구간 앞 · 맵 안, 초보 사냥터에 약초', () => {
  assert.ok(HERBS_BY_MAP.field.some((n) => n.kind === 'herb'), '토끼 사냥터에 약초');
  ALCH_MATS.filter((m) => !m.price).forEach((m) => assert.ok(HERBS.some((n) => n.kind === m.id), `${m.name} 이 어딘가에 난다`));
  HERBS.forEach((n) => {
    const M = MAPS[n.map];
    assert.ok(M, n.map);
    assert.ok(n.y > M.top + 40 && n.y < M.h - 40 && n.x > 0 && n.x < M.w, `${n.map} 맵 안`);
    M.gates.forEach((q) => assert.ok(Math.hypot(q.x - n.x, q.y - n.y) > q.r + 120, `${n.map} 문과 떨어짐`));
    assert.ok(Math.hypot(M.spawn[0] - n.x, M.spawn[1] - n.y) > 200, `${n.map} 도착 자리와 떨어짐`);
    M.npcs.forEach((p) => assert.ok(Math.hypot(p.x - n.x, p.y - n.y) > 150, `${n.map} NPC 와 떨어짐`));
    (M.blocks || []).forEach((bk) => assert.ok(Math.hypot(bk.x - n.x, bk.y - n.y) > bk.r + 30, `${n.map} 장애물`));
    assert.ok(n.x < 500, `${n.map} 몹이 몰리는 가운데가 아닌 입구 쪽`);
  });
  assert.ok(MATERIALS.some((m) => m.id === 'water') && MAT_BY_ID.herb.sell === 0, '재료 목록 끝에 붙고 되팔 수 없다');
});

test('13. 제작 의뢰 — 하루 3개 · 한국 자정에 새로 · 레벨에 맞는 것 · 납품하면 물약을 빼고 한 번만 받는다', () => {
  assert.deepEqual(reqPool(1).map((r) => r.id), ['heal_s'], '초보는 회복 물약 (소)');
  assert.ok(reqPool(30).every((r) => r.lv <= 30 && 30 - r.lv <= ALCH_REQ.range));
  const bag = { v: 0, al: { lv: 1, xp: 0, n: 0 } };
  const day1 = Date.parse('2026-11-09T23:59:00+09:00'), day2 = Date.parse('2026-11-10T00:00:30+09:00');
  assert.equal(rollAlchReq(bag, day1), true);
  assert.equal(bag.al.q.l.length, 3); assert.equal(bag.al.q.d, '2026-11-09');
  const first = JSON.stringify(bag.al.q);
  assert.equal(rollAlchReq(bag, day1 + 30e3), false, '같은 날은 그대로');
  assert.equal(JSON.stringify(bag.al.q), first);
  assert.equal(rollAlchReq(bag, day2), true, '한국 자정에 새로');
  assert.equal(bag.al.q.d, '2026-11-10');

  const g = world([{ p: { heal_s: 10 } }]);
  const h = g.heroes[0];
  shop(g, 0, { op: 'aday' });
  assert.equal(h.bag.al.q.d, todayKey());
  const it = h.bag.al.q.l[0];
  assert.equal(it.r, 'heal_s');
  shop(g, 0, { op: 'areq', i: 0 });
  assert.equal(lastNote(g, 0).ok, true, lastNote(g, 0).msg);
  assert.equal(h.bag.p.heal_s, 10 - it.n, '제출한 물약을 뺀다');
  assert.equal(h.bag.al.xp, it.x, '경험치');
  assert.equal(h.bag.m.herb, 2, '재료 보상(약초 2)');
  shop(g, 0, { op: 'areq', i: 0 });
  assert.match(lastNote(g, 0).msg, /이미 보상을 받았습니다/);
  assert.equal(h.bag.p.heal_s, 10 - it.n, '두 번 빼지 않는다');
});

test('15 · 16. 저장 · 재접속 · 서버를 옮겨도 제작 레벨 · 경험치 · 의뢰가 남는다', () => {
  const g = world([{ al: { lv: 12, xp: 33, n: 7 }, m: { herb: 4 } }]);
  const h = g.heroes[0];
  shop(g, 0, { op: 'aday' });
  const rec = heroRecord(h, {}, {});
  assert.deepEqual([rec.bag.al.lv, rec.bag.al.xp, rec.bag.al.n], [12, 33, 7]);
  const saved = JSON.parse(JSON.stringify(rec));
  const g2 = makeWorld(); g2.out = []; g2.server = true;   // 다른 서버
  rpgSyncSeats(g2, [{ id: 'q0', name: '약사0', hero: { name: '약사0', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g2, 0, { ...saved, name: '약사0' }, 'q0');
  const h2 = g2.heroes[0];
  assert.deepEqual([h2.bag.al.lv, h2.bag.al.xp, h2.bag.al.n], [12, 33, 7]);
  assert.equal(h2.bag.al.q.d, h.bag.al.q.d);
  assert.deepEqual(h2.bag.al.q.l, h.bag.al.q.l);
  assert.equal(h2.bag.m.herb, 4);
});

test('레시피 표는 기획대로', () => {
  assert.deepEqual(RECIPES.map((r) => [r.id, r.lv, r.mats, r.xp]), [
    ['heal_s', 1, { herb: 2, water: 1 }, 10], ['heal_m', 5, { herb: 4, water: 2 }, 18],
    ['buff_str', 10, { herb_red: 3, water: 2 }, 22], ['buff_int', 10, { herb_blue: 3, water: 2 }, 22],
    ['heal_l', 15, { herb: 6, life_flower: 1 }, 30], ['buff_crit', 15, { herb_blue: 4, pure_water: 1 }, 30],
    ['speed1', 20, { wind_grass: 3, water: 2 }, 35], ['speed2', 25, { wind_grass: 6, pure_water: 2 }, 50],
    ['hide1', 25, { shadow_grass: 4, pure_water: 2 }, 55], ['hide2', 35, { shadow_grass: 7, pure_water: 3 }, 70]]);
  assert.equal(ALCH.maxLv, 50); assert.equal(ALCH.buyLv, 50);
  RECIPES.forEach((r) => assert.ok(!SPECIAL_POTIONS.includes(r.id)));
});

// 제작 개편 전 보유 물약 정리 — 종류마다 15개 남기고 초과분 1개당 1만 코인, 캐릭터마다 한 번
import { POTION_CONVERT } from '../src/game/alchemyData.js';
import { convertOldPotions } from '../src/game/alchemy.js';
test('예전 물약 정리: 15개 남기고 코인 전환, 특별 물약 제외, 한 번만', () => {
  const g = world([{ conv: true, coins: 500, p: { heal_s: 99, heal_m: 15, hide2: 20, reset: 5, adv_reset: 3 } }]);
  const h = g.heroes[0];
  assert.equal(h.bag.p.heal_s, 15); assert.equal(h.bag.p.hide2, 15); assert.equal(h.bag.p.heal_m, 15);
  assert.equal(h.bag.p.reset, 5); assert.equal(h.bag.p.adv_reset, 3);
  assert.equal(h.coins, 500 + (84 + 5) * POTION_CONVERT.rate);
  assert.ok(h.bag.pg.includes(POTION_CONVERT.id));
  assert.ok(g.sys.some((n) => n.who === 0 && /바꿔 드렸습니다/.test(n.text || n.msg || '')));
  h.bag.p.heal_s = 40; const c = h.coins;       // 이후 만든 물약은 건드리지 않는다
  assert.equal(convertOldPotions(h), null); assert.equal(h.bag.p.heal_s, 40); assert.equal(h.coins, c);
});
test('예전 물약 정리: 코인 한도를 넘지 않는다', () => {
  const h = { coins: 999999999999 - 25000, bag: { p: { heal_s: 99, heal_m: 99 }, pg: [], v: 0 } };
  const r = convertOldPotions(h);
  assert.equal(r.n, 2); assert.equal(h.coins, 999999999999 - 5000); assert.equal(r.left, 168 - 2);
  assert.equal(h.bag.p.heal_s, 97); assert.equal(h.bag.p.heal_m, 99);
});
