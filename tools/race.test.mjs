import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, MAPS } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { RACE, RACE_MOUNTS, MOUNT_BY_ID } from '../src/game/raceData.js';
import { RACE_MAP, raceOf } from '../src/game/race.js';
import { todayKey } from '../src/game/shop.js';

// 광장 몹 레이스(raceData.js · race.js). 실행: node --test tools/race.test.mjs
function world(n) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: 'warrior', elem: 'flame', gender: 'm' } })));
  for (let i = 0; i < n; i++) rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: 50, ts: 0, coins: 0, stats: {}, bag: { oc: 1, w: [], n: 1 } }, `p${i}`);
  g.heroes.forEach((h) => { if (h) { h.map = 'plaza'; h.x = RACE.npc.x; h.y = RACE.npc.y + 60; } });
  return g;
}
const send = (g, pi, kind, dir, q) => rpgInput(g, { cls: pi, kind, dir, q });
const run = (g, sec) => { for (let i = 0; i < sec * 30; i++) rpgStep(g, 1 / 30); };
// 잘 나눠 쓰는 사람 — 체력이 바닥나기 직전까지 질주하고 다시 찬다
function pace(M) {
  let x = 0, v = 0, st = M.st, tired = false, t = 0; const dt = 1 / 30;
  while (x < RACE.finishX - RACE.startX && t < 120) {
    const go = st > 0.04 && !tired, tg = tired ? M.cruise * RACE.tired : go ? M.sprint : M.cruise;
    v += (tg - v) * Math.min(1, M.acc * dt); x += v * dt;
    if (go) { st -= dt; if (st <= 0) { st = 0; tired = true; } } else { st = Math.min(M.st, st + M.regen * dt); if (tired && st >= M.st * RACE.tiredBack) tired = false; }
    t += dt;
  }
  return t;
}

test('탈것 여섯 종 — 잘 나눠 쓰면 기록 차이가 3% 안', () => {
  const times = RACE_MOUNTS.map(pace), lo = Math.min(...times), hi = Math.max(...times);
  assert.equal(RACE_MOUNTS.length, 6);
  assert.ok(hi / lo < 1.03, times.map((t) => t.toFixed(2)).join(' '));
  assert.ok(lo > 18 && hi < 26);
});

test('광장 관리인 · 트랙 맵이 있다', () => {
  assert.ok(MAPS.plaza.npcs.some((n) => n.race));
  assert.ok(MAPS[RACE_MAP].safe && MAPS[RACE_MAP].race);
});

test('참가 → 모집 → 출발 → 질주한 사람이 이기고 보상을 받는다 → 광장으로 돌아온다', () => {
  const g = world(2);
  send(g, 0, 'race', { op: 'join', m: 'wolf' });
  send(g, 1, 'race', { op: 'join', m: 'wolf' });
  assert.equal(g.race.ph, 'open');
  run(g, RACE.openT + 0.2);
  assert.equal(g.race.ph, 'ready');
  assert.equal(g.heroes[0].map, RACE_MAP);
  run(g, RACE.readyT + 0.2);
  assert.equal(g.race.ph, 'run');
  send(g, 0, 'rgo', true, 1);                      // 0번은 질주를 누르고 있다(지쳐도 계속) · 1번은 그냥 달린다
  // 걸어도 위치는 레이스가 정한다
  send(g, 1, 'hold', ['left']);
  run(g, 40);
  const [a, b] = [raceOf(g, g.heroes[0]) || {}, raceOf(g, g.heroes[1]) || {}];
  assert.ok(g.race.ph === 'end' || g.race.ph === 'idle');
  assert.equal(g.race.last[0].nm, '시험0');
  assert.equal(g.race.last[0].pl, 1);
  assert.ok(a || b);
  assert.equal(g.heroes[0].coins, RACE.prize[0]);
  assert.equal(g.heroes[1].coins, RACE.prize[1]);
  assert.equal(g.heroes[0].bag.day.race, 1);
  run(g, RACE.endT + 1);
  assert.equal(g.race.ph, 'idle');
  assert.equal(g.heroes[0].map, 'plaza');
  assert.equal(g.heroes[1].map, 'plaza');
});

test('혼자 달리면 연습 — 보상이 없다. 하루 보상 횟수를 넘기면 코인이 없다', () => {
  const g = world(2);
  send(g, 0, 'race', { op: 'join', m: 'boar' });
  run(g, RACE.openT + RACE.readyT + 0.5);
  send(g, 0, 'rgo', true, 1);
  run(g, 45);
  assert.equal(g.heroes[0].coins, 0);
  assert.equal(g.race.last.length, 1);
  run(g, RACE.endT + 1);
  g.heroes[0].bag.day = { ...g.heroes[0].bag.day, d: todayKey(), race: RACE.daily };
  send(g, 0, 'race', { op: 'join', m: 'boar' }); send(g, 1, 'race', { op: 'join', m: 'rabbit' });
  run(g, RACE.openT + RACE.readyT + 50);
  assert.equal(g.heroes[0].coins, 0);              // 오늘 보상을 다 쓴 사람은 0
  assert.ok(g.heroes[1].coins > 0);
});

test('모집 중 취소 · 달리는 중 포기 · 늦게 온 옛 질주 뗌은 버린다', () => {
  const g = world(2);
  send(g, 0, 'race', { op: 'join', m: 'spider' });
  send(g, 0, 'race', { op: 'leave' });
  assert.equal(g.race.ph, 'idle');
  send(g, 0, 'race', { op: 'join', m: 'spider' }); send(g, 1, 'race', { op: 'join', m: 'gorilla' });
  run(g, RACE.openT + RACE.readyT + 0.5);
  send(g, 0, 'rgo', true, 5);
  send(g, 0, 'rgo', false, 4);                     // 순서가 뒤바뀌어 온 옛 뗌
  assert.equal(raceOf(g, g.heroes[0]).sp, 1);
  send(g, 1, 'race', { op: 'quit' });
  assert.equal(g.heroes[1].map, 'plaza');
  run(g, 30);
  assert.equal(g.race.last.find((r) => r.nm === '시험1').pl, 0);
});

test('스냅샷으로 레이스 상태가 손님에게 간다', () => {
  const g = world(2);
  send(g, 0, 'race', { op: 'join', m: 'chimera' });
  const c = makeWorld(); c.mySeat = 1;
  rpgApply(c, rpgPack(g));
  assert.equal(c.race.ph, 'open');
  assert.equal(c.race.rs[0].m, 'chimera');
  assert.ok(MOUNT_BY_ID[c.race.rs[0].m]);
});
