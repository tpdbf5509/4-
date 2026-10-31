import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgPromote, rpgLooks, heroRecord, abyssClaim, MAPS, MOB } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT, MAT_BY_ID } from '../src/game/itemData.js';
import { ABYSS, ABYSS_REWARD, GUARDIANS, SHARD, SEAL, floorHp, floorMobs, floorMob, floorGuard, abyssWeek, prevWeek, rankReward, rollAw, cleanAw } from '../src/game/abyssData.js';
import { TITLES, TITLE_BITS, REC_IDS } from '../src/game/socialData.js';
import { ACHIEVES, CODEX_IDS } from '../src/game/codexData.js';
import { cleanBag } from '../src/game/shop.js';
import { LedgerCore } from '../server/src/ledger.js';
import { fakeD1 } from './fake-d1.mjs';

// 심연의 탑(abyssData.js). 실행: node --test tools/abyss.test.mjs
const MON = Date.parse('2026-10-26T00:00:00+09:00');   // 한국 시간 월요일 0시
function world(people, clock = { t: MON + 3600e3 }) {
  const g = makeWorld(); g.mySeat = 0; g.out = []; g.nowMs = () => clock.t;
  const seats = people.map((p, i) => ({ id: `p${i}`, name: `탑${i}`, hero: { name: `탑${i}`, job: 'warrior', elem: 'flame', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: `탑${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 800, ts: 0, coins: p.coins ?? 100000, stats: {},
    bag: { oc: 1, w: [], n: 1, m: p.m || {}, ...(p.aw ? { aw: p.aw } : {}) } }, `p${i}`));
  g.heroes.forEach((h) => { if (h) { h.pty = people.length > 1 ? 1 : 0; atGate(h); } });
  return { g, seats, clock };
}
const atGate = (h) => { h.map = 'plaza'; h.x = ABYSS.gate.x; h.y = ABYSS.gate.y + 50; };
const send = (g, pi, kind, dir) => rpgInput(g, { cls: pi, kind, dir });
const sysOf = (g, pi) => g.out.filter((o) => o.k === 'sys' && o.who === pi).map((o) => o.msg);
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.05); i++) rpgStep(g, 0.05); };
const killAll = (g, map) => g.mobs.forEach((m) => { if (m.map === map) { m.dead = true; } });
// 지금 층을 깨고 다음 층이 열릴 때까지
function clearFloor(g, r) { killAll(g, r.map); run(g, 0.1); run(g, ABYSS.gap + 0.1); }

test('수치 — 층 배율 · 몹 수 상한 · 몹 돌려 쓰기 · 수호자 차례', () => {
  assert.equal(floorHp(1), 1);
  assert(Math.abs(floorHp(36) - 1.06 ** 35) < 1e-9);
  assert.equal(floorMobs(1), 8);
  assert.equal(floorMobs(200), 24, '상한');
  assert.equal(floorMob(1).type, 'fspirit');
  assert.equal(floorMob(11).type, 'lavagolem');
  assert.equal(floorMob(81).type, 'fspirit', '8구역 뒤로 다시 처음');
  assert.equal(floorGuard(10).type, GUARDIANS[0].type);
  assert.equal(floorGuard(60).type, GUARDIANS[5].type);
  assert.equal(floorGuard(70).type, GUARDIANS[0].type, '60층 뒤로 다시 처음');
  for (const q of GUARDIANS) { assert(MOB[q.type], q.type); assert(REC_IDS.includes(q.type)); assert(CODEX_IDS.includes(q.type)); }
  assert(TITLES.length <= TITLE_BITS * 2, '칭호 비트 두 칸 안');
  assert(MAT_BY_ID[SHARD] && MAT_BY_ID[SEAL]);
  for (const a of ACHIEVES.filter((x) => x.group === '심연의 탑')) assert(a.coin > 0);
});

test('들어가기 — 입구 곁 · 400레벨 · 입장료 · 파티가 함께, 400 미만 파티원은 빠진다', () => {
  const { g } = world([{ lv: 800 }, { lv: 500 }, { lv: 300 }]);
  const [a, b, c] = g.heroes;
  a.x = 200;
  send(g, 0, 'abyss', { op: 'enter' });
  assert.equal(a.map, 'plaza');
  assert.match(sysOf(g, 0).at(-1), /입구 곁/);
  atGate(a);
  send(g, 0, 'abyss', { op: 'enter' });
  assert.equal(a.map, 'abyss-0');
  assert.equal(b.map, 'abyss-0');
  assert.equal(c.map, 'plaza', '300레벨은 남는다');
  assert.equal(a.coins, 100000 - ABYSS.fee);
  assert.equal(b.coins, 100000, '들어가는 사람만 낸다');
  const low = world([{ lv: 399 }]);
  send(low.g, 0, 'abyss', { op: 'enter' });
  assert.equal(low.g.heroes[0].map, 'plaza');
});

test('층 진행 — 모두 잡으면 다음 층, 파편 · 이번 주 기록 · 최고 층', () => {
  const { g } = world([{}]);
  const h = g.heroes[0];
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  const r = g.aruns[0];
  assert.equal(r.f, 1);
  assert.equal(r.phase, 'go');
  assert.equal(g.mobs.filter((m) => !m.dead && m.map === r.map).length, floorMobs(1));
  clearFloor(g, r);
  assert.equal(r.f, 2);
  assert.equal(h.bag.m[SHARD], ABYSS_REWARD.floor(1));
  assert.equal(h.bag.aw.top, 1);
  assert.equal(h.rec.atop, 1);
  const m2 = g.mobs.find((m) => !m.dead && m.map === r.map);
  const m1hp = MOB[floorMob(1).type].hp(m2.lv) * r.hpScale;
  assert(m2.max > m1hp, '2층 몹이 더 단단하다');
});

test('수호자 층 — 10층에 수호자 하나, 첫 돌파 보너스는 한 주에 한 번만', () => {
  const { g, clock } = world([{}]);
  const h = g.heroes[0];
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  const r = g.aruns[0];
  for (let f = 1; f < 10; f++) clearFloor(g, r);
  assert.equal(r.f, 10);
  const alive = g.mobs.filter((m) => !m.dead && m.map === r.map);
  assert.equal(alive.length, 1);
  assert.equal(alive[0].type, GUARDIANS[0].type);
  assert.equal(alive[0].boss, 1);
  assert(Math.abs(r.t - ABYSS.guardTime) < 1);
  const before = h.bag.m[SHARD];
  clearFloor(g, r);
  assert.equal(h.bag.m[SHARD] - before, ABYSS_REWARD.guard(10) + ABYSS_REWARD.weekBonus(10));
  assert.equal(h.bag.aw.fc, 10);
  // 다시 들어가 10층을 또 깨도 보너스는 없다
  send(g, 0, 'abyss', { op: 'leave' });
  run(g, 0.2);
  atGate(h);
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  const r2 = g.aruns[0];
  for (let f = 1; f < 10; f++) clearFloor(g, r2);
  const b2 = h.bag.m[SHARD];
  clearFloor(g, r2);
  assert.equal(h.bag.m[SHARD] - b2, ABYSS_REWARD.guard(10), '보너스 없이 수호자 몫만');
  // 다음 주에는 다시 받는다 · 이번 주 기록은 지난주 칸으로
  clock.t += 7 * 86400e3;
  send(g, 0, 'abyss', { op: 'leave' });
  run(g, 0.2);
  atGate(h);
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  const r3 = g.aruns[0];
  for (let f = 1; f < 10; f++) clearFloor(g, r3);
  const b3 = h.bag.m[SHARD];
  clearFloor(g, r3);
  assert.equal(h.bag.m[SHARD] - b3, ABYSS_REWARD.guard(10) + ABYSS_REWARD.weekBonus(10));
  assert.equal(h.bag.aw.pw, '2026-10-26');
  assert.equal(h.bag.aw.ptop, 10);
});

test('시간이 다 되면 · 모두 쓰러지면 도전이 끝나고 광장으로 돌아간다', () => {
  const a = world([{}]);
  send(a.g, 0, 'abyss', { op: 'enter' });
  run(a.g, 2);
  const r = a.g.aruns[0];
  r.t = 0.1;
  run(a.g, 0.2);
  assert.equal(r.phase, 'fail');
  assert.match(sysOf(a.g, 0).at(-1), /시간이 다 되었습니다/);
  run(a.g, ABYSS.failWait + 0.2);
  assert.equal(a.g.aruns.length, 0);
  assert.equal(a.g.heroes[0].map, 'plaza');
  const b = world([{}, {}]);
  send(b.g, 0, 'abyss', { op: 'enter' });
  run(b.g, 2);
  b.g.heroes.forEach((h) => { if (h) { h.down = 30; h.hp = 0; } });
  run(b.g, 0.1);
  assert.equal(b.g.aruns[0].phase, 'fail');
  assert.match(sysOf(b.g, 1).at(-1), /모두 쓰러졌습니다/);
});

test('칸은 셋까지 — 넷째 무리는 기다린다', () => {
  const { g } = world([{}, {}, {}, {}]);
  g.heroes.forEach((h) => { if (h) h.pty = 0; });
  for (let i = 0; i < 3; i++) send(g, i, 'abyss', { op: 'enter' });
  assert.deepEqual(g.aruns.map((r) => r.slot).sort(), [0, 1, 2]);
  send(g, 3, 'abyss', { op: 'enter' });
  assert.equal(g.heroes[3].map, 'plaza');
  assert.match(sysOf(g, 3).at(-1), /칸이 차 있습니다/);
});

test('스냅샷 왕복 · 방장 승계 — 층 · 시간 · 수호자 체력이 이어진다', () => {
  const { g, seats } = world([{}]);
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  const r = g.aruns[0];
  for (let f = 1; f < 10; f++) clearFloor(g, r);
  const boss = g.mobs.find((m) => !m.dead && m.map === r.map);
  boss.hp = Math.round(boss.max * 0.4);
  const guest = makeWorld(); guest.mySeat = 0; rpgLooks(guest, seats);
  rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
  assert.equal(guest.aruns.length, 1);
  assert.equal(guest.aruns[0].f, 10);
  assert.equal(guest.aruns[0].phase, 'go');
  rpgPromote(guest);
  const b2 = guest.mobs.find((m) => m.map === r.map && m.boss);
  assert(b2, '수호자가 이어진다');
  assert.equal(b2.max, boss.max, '같은 층 세기로 다시 세운다');
  assert(Math.abs(b2.hp / b2.max - 0.4) < 0.02);
  assert.equal(guest.aruns[0].f, 10);
});

test('가방의 탑 기록은 저장 · 가방 정리 뒤에도 남는다', () => {
  const { g } = world([{}]);
  const h = g.heroes[0];
  send(g, 0, 'abyss', { op: 'enter' });
  run(g, 2);
  clearFloor(g, g.aruns[0]);
  const b = cleanBag(heroRecord(h, {}).bag);
  assert.equal(b.aw.top, 1);
  assert.equal(b.aw.w, '2026-10-26');
  assert(b.aw.at > 0);
  assert.deepEqual(cleanAw({ top: 'x', w: 'bad' }).w, '');
});

test('주 경계 — 한국 시간 월요일 0시', () => {
  assert.equal(abyssWeek(MON), '2026-10-26');
  assert.equal(abyssWeek(MON - 1), '2026-10-19');
  assert.equal(abyssWeek(MON + 7 * 86400e3 - 1), '2026-10-26');
  assert.equal(prevWeek('2026-10-26'), '2026-10-19');
  const aw = rollAw({ ...cleanAw(null), w: '2026-10-19', top: 12, at: 5 }, '2026-10-26');
  assert.deepEqual([aw.w, aw.top, aw.pw, aw.ptop], ['2026-10-26', 0, '2026-10-19', 12]);
  const gap = rollAw({ ...cleanAw(null), w: '2026-10-05', top: 12 }, '2026-10-26');
  assert.equal(gap.ptop, 0, '한 주 넘게 쉬면 지난주도 비운다');
});

test('파편 교환 — 방지권 · 입장권 · 칭호(한 번만)', () => {
  const { g } = world([{ m: { [SHARD]: 700, [SEAL]: 5 } }]);
  const h = g.heroes[0];
  const gd = h.bag.gd;
  send(g, 0, 'abyss', { op: 'buy', id: 'guard5' });
  assert.equal(h.bag.gd, gd + 5);
  send(g, 0, 'abyss', { op: 'buy', id: 'ticket' });
  assert.equal(h.bag.m.dungeon_ticket, 1);
  send(g, 0, 'abyss', { op: 'buy', id: 't_walk' });
  assert.equal(h.rec.atb, 1);
  assert.equal(h.bag.m[SHARD], 700 - 20 - 30 - 600);
  send(g, 0, 'abyss', { op: 'buy', id: 't_walk' });
  assert.equal(h.bag.m[SHARD], 50, '두 번 받지 않는다');
  send(g, 0, 'abyss', { op: 'buy', id: 't_king' });
  assert.equal(h.rec.aking, 1);
  assert(!h.bag.m[SEAL]);
  run(g, 1);
  assert(h.titles.includes('atb') && h.titles.includes('aking'));
  h.x = 300;
  send(g, 0, 'abyss', { op: 'buy', id: 'guard5' });
  assert.match(sysOf(g, 0).at(-1), /입구 곁/);
});

test('주간 보상 — 지난주 순위대로 한 번만, 1위는 칭호 기록', () => {
  const { g } = world([{}]);
  const h = g.heroes[0];
  assert.equal(abyssClaim(g, 0, '2026-10-19', 11).err, 'reward');
  const r = abyssClaim(g, 0, '2026-10-19', 1);
  assert.equal(r.ok, true);
  assert.equal(h.bag.m[SHARD], rankReward(1).shard);
  assert.equal(h.bag.m[SEAL], rankReward(1).seal);
  assert.equal(h.rec.awk, 1);
  assert.equal(h.rec.awin, 1);
  assert.equal(abyssClaim(g, 0, '2026-10-19', 1).err, 'claimed');
  run(g, 1);
  assert(h.titles.includes('awin') && h.titles.includes('awk'));
});

test('장부 순위 — 이번 주 · 지난주, 동점은 먼저 닿은 쪽 · 관리자 제외', async () => {
  const d1 = fakeD1(), clock = { t: MON + 3 * 86400e3 };
  const core = new LedgerCore(d1, { now: () => clock.t });
  const mk = async (name, aw, admin = false) => {
    await core.call('rpg_create', { p_name: name, p_code: '13579', p_data: { name, lv: 800, rs: RESET.id, coins: 0, ts: 0, bag: { aw } } });
    if (admin) await d1.prepare('UPDATE chars SET admin = 1 WHERE name = ?').bind(name).run();
  };
  await mk('가', { w: '2026-10-26', top: 30, at: 200 });
  await mk('나', { w: '2026-10-26', top: 30, at: 100 });
  await mk('다', { w: '2026-10-26', top: 12, at: 50, pw: '2026-10-19', ptop: 40, pat: 9 });
  await mk('라', { w: '2026-10-19', top: 25, at: 9 });
  await mk('관리', { w: '2026-10-26', top: 99, at: 1 }, true);
  const r = await core.call('rpg_abyss_top', { p_name: '라' });
  assert.equal(r.ok, true);
  assert.equal(r.week, '2026-10-26');
  assert.deepEqual(r.top.map((x) => [x.name, x.floor]), [['나', 30], ['가', 30], ['다', 12]]);
  assert.deepEqual(r.last.map((x) => [x.name, x.floor]), [['다', 40], ['라', 25]]);
  assert.deepEqual(r.me, { now: 0, prev: 2 });
});
