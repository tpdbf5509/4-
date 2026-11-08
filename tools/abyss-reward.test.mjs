import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgLooks, heroRecord, abyssLookOf } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT, MAT_MAX, matMax } from '../src/game/itemData.js';
import { ABYSS, ABYSS_SHOP, ABYSS_BOXES, ABYSS_FIRST, ABYSS_LOOKS, LOOK_BY_ID, ABYSS_RANK, SHARD, SEAL, ABYSS_CUR_MAX, rankReward, abyssWeek, prevWeek } from '../src/game/abyssData.js';
import { boxRoll, buyLeft, cleanAb, firstState, rankClaim, lookBits } from '../src/game/abyssReward.js';
import { TITLES, TITLE_BITS, TITLE_CHUNKS, TITLE_BY_ID } from '../src/game/socialData.js';
import { cleanBag, addMat } from '../src/game/shop.js';
import { tradeExchange } from '../server/src/ledger-trade.js';
import { LedgerCore } from '../server/src/ledger.js';
import { fakeD1 } from './fake-d1.mjs';

// 심연의 탑 보상 개편(11월 9일). 실행: node --test tools/abyss-reward.test.mjs
const MON = Date.parse('2026-11-09T00:00:00+09:00');   // 한국 시간 월요일 0시
const DAY = 86400e3;
function world(people, clock = { t: MON + 3600e3 }, server = true) {
  const g = makeWorld(); g.mySeat = 0; g.out = []; g.nowMs = () => clock.t; g.server = server;
  const seats = people.map((p, i) => ({ id: `p${i}`, name: `보상${i}`, hero: { name: `보상${i}`, job: p.job || 'warrior', elem: 'flame', gender: p.gender || 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: `보상${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 1200, ts: 0, coins: p.coins ?? 100000, stats: {},
    rec: p.rec || {}, titles: p.titles || [], bag: { oc: 1, w: [], n: 1, m: p.m || {}, ...(p.ab ? { ab: p.ab } : {}), ...(p.aw ? { aw: p.aw } : {}) } }, `p${i}`));
  g.heroes.forEach((h) => { if (h) { h.map = 'plaza'; h.x = ABYSS.gate.x; h.y = ABYSS.gate.y + 50; } });
  return { g, seats, clock };
}
let ridN = 0;
const rid = () => `t${(ridN++).toString(36).padStart(4, '0')}`;
const buy = (g, pi, id, pick, r = rid()) => rpgInput(g, { cls: pi, kind: 'abyss', dir: { op: 'buy', id, pick, rid: r } });
const open = (g, pi, id, pick) => rpgInput(g, { cls: pi, kind: 'abyss', dir: { op: 'open', id, pick, rid: rid() } });
const first = (g, pi, i) => rpgInput(g, { cls: pi, kind: 'abyss', dir: { op: 'first', id: i, rid: rid() } });
const last = (g, pi) => g.out.filter((o) => o.k === 'sys' && o.who === pi).map((o) => o.msg).at(-1);
const m = (h, id) => h.bag.m[id] || 0;

test('1~4 · 23. 화폐 한도 — 파편 · 인장 99,999, 다른 재료 999, 옛 999 기록 · 초과 없이 정리', () => {
  assert.equal(matMax(SHARD), 99999); assert.equal(matMax(SEAL), 99999); assert.equal(matMax('heart'), MAT_MAX); assert.equal(MAT_MAX, 999);
  const { g } = world([{ m: { [SHARD]: 999, [SEAL]: 3, heart: 999 } }]);
  const h = g.heroes[0];
  assert.equal(m(h, SHARD), 999, '옛 999 기록 그대로');
  assert.equal(addMat(h.bag, SHARD, 5000), 5000, '1,000 넘게 받는다');
  assert.equal(m(h, SHARD), 5999);
  assert.equal(addMat(h.bag, SHARD, 200000), ABYSS_CUR_MAX - 5999, '99,999 에서 멈춘다');
  assert.equal(m(h, SHARD), 99999);
  assert.equal(addMat(h.bag, 'heart', 5), 0, '다른 재료는 999');
  assert.equal(cleanBag({ m: { [SHARD]: 123456, [SEAL]: 50000, heart: 5000 } }).m[SHARD], 99999);
  assert.equal(cleanBag({ m: { [SEAL]: 50000 } }).m[SEAL], 50000, '인장도 999 를 넘어 남는다');
  assert.equal(cleanBag({ m: { heart: 5000 } }).m.heart, 999);
  // 저장 → 다시 싣기에서도 그대로
  const rec = heroRecord(h, {});
  const w2 = world([{}]);
  rpgJoin(w2.g, 0, { ...rec, ts: 1 }, 'p0');
  assert.equal(m(w2.g.heroes[0], SHARD), 99999);
  // 거래 장부 — 파편은 99,999 까지 받고, 다른 재료는 999 에서 막힌다
  const data = { coins: 0, bag: { m: { [SHARD]: 900, heart: 990 } } };
  assert.equal(tradeExchange(data, { coins: 0, items: [] }, { coins: 0, items: [{ k: 'm', u: SHARD, n: 5000 }] }).bag.m[SHARD], 5900);
  assert.throws(() => tradeExchange(data, { coins: 0, items: [] }, { coins: 0, items: [{ k: 'm', u: 'heart', n: 10 }] }), /trade_capacity/);
});

test('5. 예전 교환 넷 — id · 값 · 효과 그대로', () => {
  const { g } = world([{ m: { [SHARD]: 700, [SEAL]: 5 } }], undefined, false);   // 예전 넷은 브라우저 방장 방식에서도 된다
  const h = g.heroes[0], gd = h.bag.gd;
  buy(g, 0, 'guard5'); buy(g, 0, 'ticket'); buy(g, 0, 't_walk'); buy(g, 0, 't_king');
  assert.equal(h.bag.gd, gd + 5); assert.equal(m(h, 'dungeon_ticket'), 1); assert.equal(h.rec.atb, 1); assert.equal(h.rec.aking, 1);
  assert.equal(m(h, SHARD), 50); assert.equal(m(h, SEAL), 0);
  assert.deepEqual(ABYSS_SHOP.slice(0, 4).map((x) => [x.id, x.cost]), [['guard5', [SHARD, 20]], ['ticket', [SHARD, 30]], ['t_walk', [SHARD, 600]], ['t_king', [SEAL, 5]]]);
});

test('6 · 11. 새 교환 여덟 — 실제 지급 · 값 빼기, 모자라면 아무것도 빼지 않는다', () => {
  const { g } = world([{ m: { [SHARD]: 90000, [SEAL]: 50 }, coins: 0 }]);
  const h = g.heroes[0];
  const before = () => ({ s: m(h, SHARD), e: m(h, SEAL), heart: m(h, 'heart'), eye: m(h, 'eye'), blue: m(h, 'blue'), t: m(h, 'dungeon_ticket'), c: h.coins });
  const diff = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, b[k] - a[k]]).filter(([, v]) => v));
  let a = before(); buy(g, 0, 'abyss_stone_select', 0); assert.deepEqual(diff(a, before()), { s: -80, blue: 50 });
  a = before(); buy(g, 0, 'abyss_stone_select', 1); assert.deepEqual(diff(a, before()), { s: -80, eye: 20 });
  a = before(); buy(g, 0, 'abyss_stone_select', 2); assert.deepEqual(diff(a, before()), { s: -80, heart: 8 });
  a = before(); buy(g, 0, 'abyss_stone_advanced'); assert.deepEqual(diff(a, before()), { s: -180, heart: 20, eye: 20, blue: 30 });
  a = before(); buy(g, 0, 'abyss_treasure'); const tr = diff(a, before());
  assert.equal(tr.s, -250); assert(([[25, 100000], [40, 200000], [60, 400000]]).some(([x, c]) => tr.heart === x && tr.c === c), JSON.stringify(tr));
  a = before(); buy(g, 0, 'abyss_world_supply'); assert.deepEqual(diff(a, before()), { s: -450, heart: 30, t: 3 });
  a = before(); buy(g, 0, 'abyss_essence_supply'); assert.deepEqual(diff(a, before()), { s: -500, e: -1, heart: 80, eye: 40 });
  a = before(); buy(g, 0, 'abyss_core_supply'); assert.deepEqual(diff(a, before()), { s: -700, e: -1, heart: 120, t: 3, c: 300000 });
  a = before(); buy(g, 0, 'abyss_wings'); assert.deepEqual(diff(a, before()), { s: -1500, e: -5 });
  assert(h.bag.ab.own & (1 << LOOK_BY_ID.abyss_wings.i));
  a = before(); buy(g, 0, 'abyss_title_beyond'); assert.deepEqual(diff(a, before()), { s: -2000, e: -8 });
  rpgStep(g, 0.6);
  assert(h.titles.includes('abyss_title_beyond'), '칭호를 얻는다');
  assert.deepEqual(TITLE_BY_ID.abyss_title_beyond.up, { atk: 4 });
  assert.equal(h.bag.ab.lr.id, 'abyss_title_beyond', '마지막 결과가 가방에 남아 창이 보여 준다');
  // 파편이 모자라면 — 아무것도 빼지 않는다
  const poor = world([{ m: { [SHARD]: 79 } }]);
  buy(poor.g, 0, 'abyss_stone_select', 0);
  assert.equal(m(poor.g.heroes[0], SHARD), 79); assert.equal(m(poor.g.heroes[0], 'blue'), 0);
  assert.match(last(poor.g, 0), /모자랍니다/);
  const noSeal = world([{ m: { [SHARD]: 5000 } }]);
  buy(noSeal.g, 0, 'abyss_essence_supply');
  assert.equal(m(noSeal.g.heroes[0], SHARD), 5000, '인장이 없으면 파편도 빼지 않는다');
  // 브라우저 방장 방식(전용 서버가 아님)에서는 새 여덟을 판정하지 않는다
  const local = world([{ m: { [SHARD]: 5000 } }], undefined, false);
  buy(local.g, 0, 'abyss_stone_advanced');
  assert.equal(m(local.g.heroes[0], SHARD), 5000);
  assert.match(last(local.g, 0), /새 서버/);
  // 선택 상자는 고르지 않으면 열지 않는다
  const nopick = world([{ m: { [SHARD]: 5000 } }]);
  buy(nopick.g, 0, 'abyss_stone_select');
  assert.equal(m(nopick.g.heroes[0], SHARD), 5000);
});

test('7. 상자 확률 — 50 · 35 · 15, 경계값과 20만 번 뽑기', () => {
  const at = (r) => boxRoll('abyss_treasure', undefined, () => r);
  assert.equal(at(0).m.heart, 25); assert.equal(at(0.4999).m.heart, 25);
  assert.equal(at(0.5).m.heart, 40); assert.equal(at(0.8499).m.heart, 40);
  assert.equal(at(0.85).m.heart, 60); assert.equal(at(0.99999).coins, 400000);
  const n = 200000, c = { 25: 0, 40: 0, 60: 0 };
  for (let i = 0; i < n; i++) c[boxRoll('abyss_treasure').m.heart]++;
  assert(Math.abs(c[25] / n - 0.5) < 0.01 && Math.abs(c[40] / n - 0.35) < 0.01 && Math.abs(c[60] / n - 0.15) < 0.01, JSON.stringify(c));
  assert.equal(ABYSS_BOXES.abyss_treasure.roll.reduce((s, x) => s + x.w, 0), 100);
  assert.deepEqual(ABYSS_BOXES.abyss_world_supply.give, { m: { dungeon_ticket: 3, heart: 30 } }, '월드보스 전설 장비 없음');
});

test('8 · 9 · 10. 횟수 — 하루 3 · 주 3 · 주 2 · 주 1 · 평생 1, 한국 0시 · 월요일 0시에 갈린다', () => {
  const { g, clock } = world([{ m: { [SHARD]: 99999, [SEAL]: 99999 } }]);
  const h = g.heroes[0];
  for (let i = 0; i < 4; i++) buy(g, 0, 'abyss_stone_select', 0);
  assert.equal(m(h, 'blue'), 150, '하루 3번');
  assert.match(last(g, 0), /오늘은 더/);
  clock.t = MON + DAY - 1; buy(g, 0, 'abyss_stone_select', 0); assert.equal(m(h, 'blue'), 150, '23시 59분도 같은 날');
  clock.t = MON + DAY; buy(g, 0, 'abyss_stone_select', 0); assert.equal(m(h, 'blue'), 200, '한국 0시에 새로');
  const weekly = { abyss_stone_advanced: 3, abyss_treasure: 2, abyss_world_supply: 1, abyss_essence_supply: 2, abyss_core_supply: 1 };
  for (const [id, n] of Object.entries(weekly)) {
    const it = ABYSS_SHOP.find((x) => x.id === id);
    for (let i = 0; i < n + 1; i++) buy(g, 0, id);
    assert.equal(buyLeft(it, h.bag.ab, clock.t), 0, id);
    assert.equal(h.bag.ab.b[id][3], n, `${id} 주 ${n}번`);
  }
  clock.t = MON + 7 * DAY - 1;
  buy(g, 0, 'abyss_treasure'); assert.equal(h.bag.ab.b.abyss_treasure[3], 2, '일요일 23시 59분은 같은 주');
  clock.t = MON + 7 * DAY;
  for (const id of Object.keys(weekly)) assert(buyLeft(ABYSS_SHOP.find((x) => x.id === id), h.bag.ab, clock.t) > 0, `${id} 월요일 0시에 새로`);
  buy(g, 0, 'abyss_treasure'); assert.equal(h.bag.ab.b.abyss_treasure[3], 1);
  // 평생 — 날개 · 칭호는 두 번 사지 못한다
  buy(g, 0, 'abyss_wings'); const s1 = m(h, SHARD);
  buy(g, 0, 'abyss_wings'); assert.equal(m(h, SHARD), s1, '날개 두 번째는 값을 빼지 않는다');
  clock.t += 30 * DAY; buy(g, 0, 'abyss_wings'); assert.equal(m(h, SHARD), s1, '한 달 뒤에도');
  buy(g, 0, 'abyss_title_beyond'); const s2 = m(h, SHARD);
  buy(g, 0, 'abyss_title_beyond'); assert.equal(m(h, SHARD), s2);
});

test('12. 넣을 자리가 없으면 — 재화를 그대로 두고 막는다(확률 상자는 가장 큰 몫까지 본다)', () => {
  const { g } = world([{ m: { [SHARD]: 9000, heart: 940, blue: 999 }, ab: { bx: { abyss_treasure: 1 } } }]);
  const h = g.heroes[0];
  buy(g, 0, 'abyss_treasure');
  assert.equal(m(h, SHARD), 9000, '940 + 60 > 999 라 막는다(25가 나와도 들어갈 자리가 있지만 뽑기 전에 막는다)');
  assert.equal(m(h, 'heart'), 940);
  assert.match(last(g, 0), /심장결정을 더 가질 수 없습니다/);
  buy(g, 0, 'abyss_stone_select', 0);
  assert.equal(m(h, SHARD), 9000, '파랑 강화석이 가득');
  buy(g, 0, 'abyss_stone_select', 2);
  assert.equal(m(h, SHARD), 8920, '심장결정 8개는 들어간다');
  open(g, 0, 'abyss_treasure');
  assert.equal(h.bag.ab.bx.abyss_treasure, 1, '보관함 상자도 그대로');
  h.coins = 999999999999 - 1000;
  h.bag.m.heart = 0;
  open(g, 0, 'abyss_treasure');
  assert.equal(h.bag.ab.bx.abyss_treasure, 1, '코인 한도도 본다');
});

test('같은 요청 id 는 한 번만 — 망이 끊겨 다시 보내도 두 번 주지 않는다', () => {
  const { g } = world([{ m: { [SHARD]: 5000 } }]);
  const h = g.heroes[0], r = rid();
  buy(g, 0, 'abyss_stone_advanced', undefined, r);
  buy(g, 0, 'abyss_stone_advanced', undefined, r);
  assert.equal(m(h, SHARD), 5000 - 180);
  // 저장 → 다시 불러와도 처리한 id 를 기억한다
  const w2 = world([{}]);
  rpgJoin(w2.g, 0, { ...heroRecord(h, {}), ts: 1 }, 'p0');
  buy(w2.g, 0, 'abyss_stone_advanced', undefined, r);
  assert.equal(m(w2.g.heroes[0], SHARD), 5000 - 180);
  buy(w2.g, 0, 'abyss_stone_advanced', undefined, '<bad id>');
  assert.equal(m(w2.g.heroes[0], SHARD), 5000 - 180, '이상한 id 는 받지 않는다');
});

test('13 · 14. 생애 최초 돌파 — 소급 · 차례 · 한 번만 · 자리가 없으면 확정하지 않는다', () => {
  const { g } = world([{ rec: { atop: 26 } }]);
  const h = g.heroes[0];
  assert.deepEqual(ABYSS_FIRST.map((_, i) => firstState(h, i)).slice(0, 4), ['ready', 'wait', 'lock', 'lock']);
  first(g, 0, 1); assert.match(last(g, 0), /아래 층 보상부터/);
  first(g, 0, 0); assert.equal(h.bag.ab.bx.abyss_stone_select, 2);
  first(g, 0, 0); assert.equal(h.bag.ab.bx.abyss_stone_select, 2, '두 번 받지 않는다');
  first(g, 0, 1); assert.equal(h.bag.ab.bx.abyss_treasure, 1);
  first(g, 0, 2); assert.match(last(g, 0), /30층을 깨면/);
  assert.deepEqual(ABYSS_FIRST.map((_, i) => firstState(h, i)).slice(0, 3), ['got', 'got', 'lock']);
  // 보관함 상자를 연다 — 교환 횟수를 쓰지 않는다
  open(g, 0, 'abyss_stone_select', 2); open(g, 0, 'abyss_stone_select', 2);
  assert.equal(m(h, 'heart'), 16); assert(!h.bag.ab.bx.abyss_stone_select);
  assert.equal(buyLeft(ABYSS_SHOP.find((x) => x.id === 'abyss_stone_select'), h.bag.ab, Date.now()), 3);
  // 예전 100층 기록 — 열 개 모두 소급, 60층 칭호 · 80 · 90 · 100층 외형
  const old = world([{ rec: { atop: 137 } }]);
  const o = old.g.heroes[0];
  for (let i = 0; i < ABYSS_FIRST.length; i++) first(old.g, 0, i);
  assert.equal(o.bag.ab.fc, (1 << ABYSS_FIRST.length) - 1);
  rpgStep(old.g, 0.6);
  assert(o.titles.includes('abyss_title_conqueror'));
  for (const id of ['abyss_weapon', 'abyss_halo', 'abyss_shadow']) assert(o.bag.ab.own & (1 << LOOK_BY_ID[id].i), id);
  assert.deepEqual(o.bag.ab.bx, { abyss_stone_select: 2, abyss_treasure: 3, abyss_stone_advanced: 2, abyss_essence_supply: 1, abyss_core_supply: 1 });
  // 보관함이 가득(99)이면 받지 않고 이력도 남기지 않는다
  const full = world([{ rec: { atop: 12 }, ab: { bx: { abyss_stone_select: 98 } } }]);
  first(full.g, 0, 0);
  assert.equal(full.g.heroes[0].bag.ab.fc, 0);
  assert.equal(full.g.heroes[0].bag.ab.bx.abyss_stone_select, 98);
});

test('19 · 21. 저장 · 재접속 · 남의 화면 — 외형 · 칭호 · 보관함이 남는다, 시즌 후광은 기간 안만', () => {
  const { g, seats, clock } = world([{ m: { [SHARD]: 9999, [SEAL]: 99 }, rec: { atop: 100 } }, { job: 'mage', gender: 'f' }]);
  const h = g.heroes[0];
  buy(g, 0, 'abyss_wings'); buy(g, 0, 'abyss_title_beyond');
  for (let i = 0; i < ABYSS_FIRST.length; i++) first(g, 0, i);
  rpgInput(g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_wings', on: 1 } });
  rpgInput(g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_halo', on: 1 } });
  rpgInput(g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_shadow', on: 1 } });
  rpgInput(g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_halo_season', on: 1 } });
  assert.match(last(g, 0), /기간이 끝난|아직/, '시즌 후광은 받기 전에 못 낀다');
  rpgStep(g, 0.6);
  const bits = lookBits(h.bag, clock.t);
  assert.equal(bits, (1 << LOOK_BY_ID.abyss_wings.i) | (1 << LOOK_BY_ID.abyss_halo.i) | (1 << LOOK_BY_ID.abyss_shadow.i));
  // 남의 화면 — 스냅샷 extra.al 로 그린다 · 63번째 칭호도 셋째 숫자로
  const guest = makeWorld(); guest.mySeat = 1; rpgLooks(guest, seats);
  rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
  assert.equal(guest.heroes[0].alook, bits);
  assert.equal(abyssLookOf(guest.heroes[0]), bits);
  assert(guest.heroes[0].titles.includes('abyss_title_beyond') && guest.heroes[0].titles.includes('abyss_title_conqueror'));
  assert.equal(TITLES.findIndex((t) => t.id === 'abyss_title_conqueror'), 62, '63번째 칭호');
  assert(TITLES.length <= TITLE_BITS * TITLE_CHUNKS);
  // 저장 · 재접속
  const w2 = world([{}]);
  rpgJoin(w2.g, 0, { ...heroRecord(h, {}), ts: 1 }, 'p0');
  const h2 = w2.g.heroes[0];
  assert.equal(lookBits(h2.bag, clock.t), bits);
  assert(h2.titles.includes('abyss_title_beyond') && h2.titles.includes('abyss_title_conqueror'));
  assert.equal(h2.bag.ab.fc, h.bag.ab.fc);
  assert.deepEqual(h2.bag.ab.bx, h.bag.ab.bx);
  // 벗기 · 같은 자리는 하나만
  rpgInput(w2.g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_wings', on: 0 } });
  assert.equal(lookBits(h2.bag, clock.t) & (1 << LOOK_BY_ID.abyss_wings.i), 0);
  // 시즌 후광 — 1위 보상으로 받은 주가 끝날 때까지
  const r = rankClaim(h2, '2026-11-09', 1, MON + 7 * DAY + 3600e3);
  assert.equal(r.ok, true);
  const now = MON + 7 * DAY + 7200e3;
  rpgInput(w2.g, { cls: 0, kind: 'abyss', dir: { op: 'look', id: 'abyss_halo_season', on: 1 } });
  assert(lookBits(h2.bag, now) & (1 << LOOK_BY_ID.abyss_halo_season.i));
  assert.equal(lookBits(h2.bag, now) & (1 << LOOK_BY_ID.abyss_halo.i), 0, '머리 위 자리는 하나만');
  assert.equal(lookBits(h2.bag, MON + 14 * DAY) & (1 << LOOK_BY_ID.abyss_halo_season.i), 0, '다음 주 월요일 0시에 끝난다');
  assert.equal(ABYSS_LOOKS.length, 5);
  assert.deepEqual(cleanAb({ own: 9999, eq: -1, fc: 99999 }).own, 31);
});

test('외형은 능력치를 바꾸지 않는다', () => {
  const { g } = world([{ m: { [SHARD]: 9999, [SEAL]: 99 }, rec: { atop: 100 } }]);
  const h = g.heroes[0];
  rpgStep(g, 0.6);
  const before = [h.max, h.st.str];
  buy(g, 0, 'abyss_wings');
  for (let i = 0; i < 10; i++) first(g, 0, i);
  for (const id of ['abyss_wings', 'abyss_weapon', 'abyss_halo', 'abyss_shadow']) rpgInput(g, { cls: 0, kind: 'abyss', dir: { op: 'look', id, on: 1 } });
  rpgStep(g, 0.05);
  // 칭호 둘(정복자 체력 +3점)을 빼면 같다
  const conq = TITLE_BY_ID.abyss_title_conqueror.up.hp * 22;
  assert.equal(h.max - before[0] <= Math.ceil(conq * 3), true);
  assert.equal(h.st.str, before[1]);
});

test('주간 보상 규칙 — 새 표 · 예전 표 · 한 번만 · 자리', () => {
  assert.deepEqual(rankReward(1, '2026-11-02'), { shard: 300, seal: 3 }, '배포 전에 끝난 주는 예전 표');
  assert.equal(rankReward(11, '2026-11-02'), null);
  assert.deepEqual(rankReward(1, '2026-11-09'), { shard: 600, seal: 5, bx: { abyss_treasure: 3 }, look: 'abyss_halo_season' });
  assert.deepEqual(rankReward(3, '2026-11-09'), { shard: 450, seal: 4, bx: { abyss_treasure: 2 } });
  assert.deepEqual(rankReward(10, '2026-11-09'), { shard: 300, seal: 3, bx: { abyss_treasure: 1 } });
  assert.deepEqual(rankReward(20, '2026-11-09'), { shard: 180, seal: 1, bx: { abyss_stone_select: 2 } });
  assert.deepEqual(rankReward(50, '2026-11-09'), { shard: 100, seal: 0, bx: { abyss_stone_select: 1 } });
  assert.equal(rankReward(51, '2026-11-09'), null);
  const { g } = world([{ m: { [SHARD]: 99950 }, aw: { w: '2026-11-09', cl: '2026-11-02' } }]);
  const h = g.heroes[0];
  assert.equal(rankClaim(h, '2026-11-02', 1, MON + 3600e3).err, 'claimed', '예전 방식으로 받은 주');
  assert.equal(rankClaim(h, '2026-11-09', 5, MON + 7 * DAY).err, 'capacity', '파편 99,999 를 넘으면');
  assert.equal(m(h, SHARD), 99950);
});

/* ── 장부 — 50위 · 관리자 · 10층 · 굳힌 순위 · 수령 기록 · 동시 요청 ── */
async function ledgerWorld(n, clockT) {
  const d1 = fakeD1(), clock = { t: clockT };
  const core = new LedgerCore(d1, { now: () => clock.t });
  const who = {};
  const mk = async (name, aw, extra = {}) => {
    const r = await core.call('rpg_create', { p_name: name, p_code: '13579', p_data: { name, lv: 1200, rs: RESET.id, coins: 0, ts: 0, bag: { aw, m: extra.m || {} }, rec: {} } });
    who[name] = { name, tok: r.token };
    if (extra.admin) await d1.prepare('UPDATE chars SET admin = 1 WHERE name = ?').bind(name).run();
  };
  for (let i = 0; i < n; i++) await mk(`순위${String(i).padStart(2, '0')}`, { w: '2026-11-09', top: 100 - i, at: 1000 + i });
  return { d1, core, clock, who, mk };
}
const claim = (core, w) => core.call('rpg_abyss_claim', { p_name: w.name, p_token: w.tok });
const dataOf = async (d1, name) => JSON.parse((await d1.prepare('SELECT data FROM chars WHERE name = ?').bind(name).first()).data);

test('15 · 16 · 17 · 18. 장부 순위 — 50위까지 · 관리자 제외 · 10층 미만 제외 · 한 번만', async () => {
  const W = await ledgerWorld(55, MON + 2 * DAY);
  await W.mk('관리', { w: '2026-11-09', top: 999, at: 1 }, { admin: true });
  await W.mk('낮은층', { w: '2026-11-09', top: 9, at: 1 });
  await W.mk('같은층먼저', { w: '2026-11-09', top: 100, at: 999 });   // 100층 동점 — 먼저 닿았다
  const cur = await W.core.call('rpg_abyss_top', { p_name: '순위00' });
  assert.equal(cur.top.length, 50, '이번 주 상위 50');
  assert.equal(cur.top[0].name, '같은층먼저', '동점이면 먼저 닿은 쪽');
  assert(!cur.top.some((x) => x.name === '관리'), '관리자 제외');
  // 다음 주 — 지난주(11월 9일 주) 순위로 받는다. 0시 10분 전에는 굳히지 않는다
  W.clock.t = MON + 7 * DAY + 5 * 60e3;
  assert.equal((await claim(W.core, W.who['순위00'])).err, 'wait');
  W.clock.t = MON + 7 * DAY + 11 * 60e3;
  const top = await W.core.call('rpg_abyss_top', { p_name: '순위48' });
  assert.equal(top.fixed, true);
  assert.equal(top.last.length, 50);
  assert.deepEqual(top.me.prev, 50, '같은층먼저가 1위라 순위48 은 50위');
  const r1 = await claim(W.core, W.who['같은층먼저']);
  assert.equal(r1.ok, true); assert.equal(r1.rank, 1);
  const d = await dataOf(W.d1, '같은층먼저');
  assert.equal(d.bag.m[SHARD], 600); assert.equal(d.bag.m[SEAL], 5); assert.equal(d.bag.ab.bx.abyss_treasure, 3);
  assert(d.bag.ab.sh > W.clock.t, '시즌 후광');
  assert.equal(d.rec.awin, 1); assert.equal(d.rec.awk, 1);
  assert.equal(d.ts, 1, '기록 차례가 올라 늦은 저장은 stale');
  assert.equal((await claim(W.core, W.who['같은층먼저'])).err, 'claimed', '두 번 받지 않는다');
  assert.equal((await W.core.call('rpg_srv_save', { p_name: '같은층먼저', p_token: W.who['같은층먼저'].tok, p_data: { ...d, ts: 0, bag: { ...d.bag, m: {} } } })).err, 'stale', '보상 앞의 10초 저장은 막힌다');
  assert.equal((await claim(W.core, W.who['순위49'])).err, 'reward', '51위');
  assert.equal((await claim(W.core, W.who['낮은층'])).err, 'reward', '10층 미만');
  assert.equal((await W.core.call('rpg_abyss_claim', { p_name: '관리', p_token: W.who['관리'].tok })).err, 'reward', '관리자');
  const r20 = await claim(W.core, W.who['순위18']);   // 20위
  assert.equal(r20.rank, 20);
  assert.deepEqual((await dataOf(W.d1, '순위18')).bag.ab.bx, { abyss_stone_select: 2 });
  // 굳힌 뒤 기록이 바뀌어도 순위는 그대로
  await W.d1.prepare('UPDATE chars SET data = ? WHERE name = ?').bind(JSON.stringify({ name: '순위48', lv: 1200, rs: RESET.id, coins: 0, ts: 0, bag: { aw: { w: '2026-11-09', top: 999, at: 1 } } }), '순위48').run();
  W.core.abyssMemo = new Map();
  const again = await W.core.call('rpg_abyss_top', { p_name: '순위48' });
  assert.equal(again.me.prev, 50, '굳힌 순위');
  const rows = await W.d1.prepare('SELECT COUNT(*) AS n FROM abyss_claims').first();
  assert.equal(rows.n, 2);
});

test('18 · 20. 예전 주는 예전 표 · 예전에 받은 주는 다시 안 줌 · 다른 서버 동시 요청도 한 번', async () => {
  const W = await ledgerWorld(12, MON + 3600e3);   // 지금 11월 9일 주 → 지난주 11월 2일 주(예전 표)
  for (let i = 0; i < 12; i++) await W.d1.prepare('UPDATE chars SET data = ? WHERE name = ?')
    .bind(JSON.stringify({ name: `순위${String(i).padStart(2, '0')}`, lv: 1200, rs: RESET.id, coins: 0, ts: 0,
      bag: { aw: { w: '2026-11-02', top: 30 - i, at: 5 + i, ...(i === 1 ? { cl: '2026-11-02' } : {}) } } }), `순위${String(i).padStart(2, '0')}`).run();
  const r = await claim(W.core, W.who['순위00']);
  assert.equal(r.ok, true);
  assert.deepEqual([r.shard, r.seal], [300, 3], '예전 표');
  assert.equal((await dataOf(W.d1, '순위00')).bag.ab.bx.abyss_treasure, undefined, '예전 표에는 상자가 없다');
  assert.equal((await claim(W.core, W.who['순위01'])).err, 'claimed', '배포 전에 예전 방식으로 받은 캐릭터');
  assert.equal((await claim(W.core, W.who['순위10'])).err, 'reward', '예전 표는 10위까지');
  // 서로 다른 서버에서 같은 캐릭터 요청이 동시에 — 하나만 된다
  const both = await Promise.all([claim(W.core, W.who['순위02']), claim(W.core, W.who['순위02'])]);
  assert.equal(both.filter((x) => x.ok).length, 1, JSON.stringify(both));
  assert.equal((await dataOf(W.d1, '순위02')).bag.m[SHARD], 200);
});

test('20. 다른 서버에서 같은 캐릭터로 교환 — 나중에 들어온 곳만 저장된다(중복 지급 없음)', async () => {
  const W = await ledgerWorld(0, MON + 3600e3);
  await W.mk('양쪽', { w: '2026-11-09' }, { m: { [SHARD]: 1600, [SEAL]: 5 } });
  const a = await W.core.call('rpg_login', { p_name: '양쪽', p_code: '13579' });
  const b = await W.core.call('rpg_login', { p_name: '양쪽', p_code: '13579' });
  const load = await W.core.call('rpg_srv_load', { p_name: '양쪽', p_token: b.token });
  const one = world([{}]), two = world([{}]);
  for (const w of [one, two]) { rpgJoin(w.g, 0, { ...load.data, ts: 1, name: '보상0' }, 'p0'); w.g.heroes[0].ts = 0; buy(w.g, 0, 'abyss_wings'); }
  assert.equal((await W.core.call('rpg_srv_save', { p_name: '양쪽', p_token: a.token, p_data: { ...heroRecord(one.g.heroes[0], load.data), name: '양쪽' } })).err, 'token', '먼저 들어온 서버는 저장하지 못한다');
  const ok = await W.core.call('rpg_srv_save', { p_name: '양쪽', p_token: b.token, p_data: { ...heroRecord(two.g.heroes[0], load.data), name: '양쪽' } });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  const d = await dataOf(W.d1, '양쪽');
  assert.equal(d.bag.m[SHARD], 100); assert.equal(d.bag.ab.b.abyss_wings[4], 1);
  assert.equal(ABYSS_RANK.top, 50);
  assert.equal(prevWeek(abyssWeek(MON + 7 * DAY)), '2026-11-09');
});
