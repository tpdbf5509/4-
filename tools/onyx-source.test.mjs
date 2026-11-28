import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { RACE } from '../src/game/raceData.js';
import { OX_DAILY, OX_WB, oxOf, protectOx } from '../src/game/onyxData.js';
import { oxCount, oxToday, claimOxDaily, whyOxDaily, raceHeads, raceOnyx, rollWbOnyx, giveWbOnyx } from '../src/game/onyxSource.js';
import { rollWorldBossReward } from '../src/game/worldBoss.js';
import { netKey } from '../server/src/room.js';

// 오닉스 얻는 곳(11월 27일) — 일일 의뢰 · 레이스 우승 · 월드보스. 실행: node --test tools/onyx-source.test.mjs
const day = oxToday();

test('일일 의뢰 — 전용 서버만 · 다 채워야 · 하루 한 번 · 셋 다 받으면 보너스', () => {
  const bag = {};
  const [K, B, R] = OX_DAILY.tasks;
  for (let i = 0; i < K.need; i++) oxCount(bag, 'k', day);
  assert.equal(claimOxDaily(bag, 0, false, day).ok, false);          // 방장 브라우저 방식은 주지 않는다
  assert.equal(claimOxDaily(bag, 0, true, day).n, K.ox);
  assert.equal(claimOxDaily(bag, 0, true, day).ok, false);           // 두 번은 안 된다
  assert.ok(whyOxDaily(bag, 1, day));                                // 보스를 아직 안 잡았다
  assert.ok(whyOxDaily(bag, 3, day));                                // 보너스는 셋을 받은 뒤
  for (let i = 0; i < B.need; i++) oxCount(bag, 'b', day);
  for (let i = 0; i < R.need; i++) oxCount(bag, 'r', day);
  assert.ok(claimOxDaily(bag, 1, true, day).ok);
  assert.ok(claimOxDaily(bag, 2, true, day).ok);
  assert.equal(claimOxDaily(bag, 3, true, day).n, OX_DAILY.bonus);
  assert.equal(claimOxDaily(bag, 3, true, day).ok, false);
  assert.equal(oxOf(bag), K.ox + B.ox + R.ox + OX_DAILY.bonus);
  assert.equal(claimOxDaily(bag, 0, true, '2099-01-01').ok, false);   // 다음 날은 새로 센다
});

test('화면 저장으로 오늘 칸을 지우거나 늘릴 수 없다', () => {
  const old = { bag: { ox: 5, oxd: { d: day, k: 3, b: 0, r: 0, q: 1, w: 4 } } };
  const out = protectOx({ bag: { ox: 99, oxd: { d: day, k: 999, b: 999, r: 999, q: 0, w: 0 } } }, old);
  assert.deepEqual(out.bag.oxd, old.bag.oxd);
  assert.equal(out.bag.ox, 5);
  assert.equal(protectOx({ bag: { oxd: { d: day, k: 999 } } }).bag.oxd, undefined);   // 새 계정
});

test('레이스 인원 — 같은 주소는 한 명 · 2명 0 · 3명 3 · 4명 10 · 5명 10', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(raceOnyx), [0, 0, 0, 3, 10, 10]);
  assert.equal(raceHeads(['a', 'a', 'b', ''], (x) => x), 2);
  assert.equal(netKey('2001:db8:1:2:aaaa::1'), netKey('2001:db8:1:2:bbbb::9'));
  assert.notEqual(netKey('1.2.3.4'), netKey('1.2.3.5'));
});

function world(n) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: 'warrior', elem: 'flame', gender: 'm' } })));
  for (let i = 0; i < n; i++) rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: 50, ts: 0, coins: 0, stats: {}, bag: { oc: 1, w: [], n: 1 } }, `p${i}`);
  g.heroes.forEach((h) => { if (h) { h.map = 'plaza'; h.x = RACE.npc.x; h.y = RACE.npc.y + 60; } });
  return g;
}
const run = (g, sec) => { for (let i = 0; i < sec * 30; i++) rpgStep(g, 1 / 30); };
function race(n, ips, server = true) {
  const g = world(n);
  g.server = server; g.netOf = (who) => ips[Number(who.slice(1))] || '';
  for (let i = 0; i < n; i++) rpgInput(g, { cls: i, kind: 'race', dir: { op: 'join', m: 'wolf' } });
  run(g, RACE.openT + RACE.readyT + 1);
  rpgInput(g, { cls: 0, kind: 'rgo', dir: true, q: 1 });           // 0번만 질주 — 우승
  run(g, 55);
  const win = g.heroes.findIndex((h) => h && h.coins === RACE.prize[0]);
  return { g, win, ox: win >= 0 ? oxOf(g.heroes[win].bag) : -1 };
}

test('레이스 우승 오닉스 — 서버가 센 인원 · 같은 주소는 하나 · 방장 방식은 없음', () => {
  assert.equal(race(4, ['a', 'b', 'c', 'd']).ox, 10);
  assert.equal(race(4, ['a', 'a', 'a', 'd']).ox, 0);                    // 한 집 세 캐릭터 → 2명
  assert.equal(race(4, ['a', 'a', 'c', 'd']).ox, 3);                    // 한 집 두 캐릭터 → 3명
  assert.equal(race(3, ['a', 'b', 'c']).ox, 3);
  assert.equal(race(2, ['a', 'b']).ox, 0);
  assert.equal(race(4, ['a', 'b', 'c', 'd'], false).ox, 0);             // 방장 브라우저 방식
  assert.equal(race(4, ['', '', '', '']).ox, 0);                        // 계정 없는 캐릭터
  const { g, win } = race(4, ['a', 'b', 'c', 'd']);
  assert.equal(g.heroes.filter((h, i) => h && i !== win && oxOf(h.bag)).length, 0);   // 우승자만
});

test('월드보스 오닉스 — 0.5% 1~3개 · 하루 최대', () => {
  assert.equal(rollWbOnyx(() => 0.5), 0);
  assert.equal(rollWbOnyx(() => 0), OX_WB.n[0]);
  const seq = [0, 0.99];
  assert.equal(rollWbOnyx(() => seq.shift()), OX_WB.n[1]);
  let hits = 0;
  for (let i = 0; i < 40000; i++) { const n = rollWbOnyx(); if (n) { hits++; assert.ok(n >= 1 && n <= 3); } }
  assert.ok(hits > 120 && hits < 290);
  assert.ok('ox' in rollWorldBossReward('dragon'));
  const bag = {};
  let got = 0;
  for (let i = 0; i < 6; i++) got += giveWbOnyx(bag, 3, day);
  assert.equal(got, OX_WB.dayMax);
  assert.equal(giveWbOnyx(bag, 3, '2099-01-01'), 3);
});
