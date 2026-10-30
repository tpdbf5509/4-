import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, MAPS, MOB, SPAWNS, LV_MAX, STAT_MAX, statEarned, FAR_EASE } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT, MAT_BY_ID, DROPS } from '../src/game/itemData.js';
import { DEEP, DEEP_MAPS } from '../src/game/deepData.js';
import { TITLES, TITLE_BITS, REC_IDS } from '../src/game/socialData.js';

// 400~800레벨 사냥터 · 계몽의 문(deepData.js). 실행: node --test tools/deep.test.mjs
function world(people) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, people.map((p, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: 'warrior', elem: 'flame', gender: 'm' } })));
  people.forEach((p, i) => rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 400, ts: 0, coins: 0, stats: {},
    bag: { oc: 1, w: [], n: 1, m: p.m || {} } }, `p${i}`));
  return g;
}
const send = (g, pi, kind, dir) => rpgInput(g, { cls: pi, kind, dir });
const sysOf = (g, pi) => g.out.filter((o) => o.k === 'sys' && o.who === pi).map((o) => o.msg);
const atDoor = (h) => { h.map = 'plaza'; h.x = DEEP.door.x + 40; h.y = DEEP.door.y + 20; };
const full = () => Object.fromEntries(DEEP.recipe.map(([id, n]) => [id, n + 3]));

test('최고 레벨 800 · 스탯 상한 800 — 400레벨 이후 3포인트로 총 2000', () => {
  assert.equal(LV_MAX, 800);
  assert.equal(STAT_MAX, 800);
  assert.equal(statEarned(800), 2000);
});

test('사냥터 8곳 · 몹 · 보스 수치 — 체력은 표 값 그대로(400레벨 11만 → 800레벨 15만), 공격은 FAR_EASE', () => {
  assert.equal(DEEP_MAPS.length, 8);
  const d = DEEP_MAPS[0], m = MOB[d.id];
  assert.equal(m.hp(400), 110000);
  assert.equal(MOB.wraith.hp(600), 130000);
  assert.equal(MOB.fallen.hp(800), 150000);
  assert(Math.abs(MOB.spider.hp(400) - m.hp(400)) < 1000, '200~400 끝과 이어진다');
  assert.equal(m.dmg(400), Math.round(2450 * FAR_EASE.dmg));
  assert.equal(MOB.fallen.boss.hp, 2380000);
  DEEP_MAPS.forEach((z, i) => {
    assert(MAPS[z.id], z.id);
    assert(SPAWNS.some((s) => s.map === z.id && !s.boss) && SPAWNS.some((s) => s.map === z.id && s.boss), `${z.id} 무리`);
    assert(MAT_BY_ID[DROPS[z.id].id], `${z.id} 보스 재료`);
    assert(REC_IDS.includes(z.id), `${z.id} 잡은 수`);
    if (i) assert(MOB[z.id].hp(z.lv[0]) > MOB[DEEP_MAPS[i - 1].id].hp(DEEP_MAPS[i - 1].lv[0]), '구역마다 단단해진다');
  });
  assert.deepEqual(MAPS.fspirit.gates.map((q) => q.to), ['plaza', 'lavagolem']);
  assert.deepEqual(MAPS.fallen.gates.map((q) => q.to), ['voidmage']);
  assert(TITLES.length <= TITLE_BITS * 2, '칭호 비트 두 칸 안');
});

test('계몽의 눈 — 재료가 모자라면 못 만들고, 다 있으면 재료를 빼고 하나 만든다', () => {
  const g = world([{ m: { silk: 10 } }]);
  const h = g.heroes[0];
  atDoor(h);
  send(g, 0, 'deep', { op: 'craft' });
  assert(!h.bag.m[DEEP.eye]);
  assert.match(sysOf(g, 0).at(-1), /모자랍니다/);
  DEEP.recipe.forEach(([id, n]) => { h.bag.m[id] = n + 3; });
  h.x = 1500;                                        // 문에서 멀면 안 된다
  send(g, 0, 'deep', { op: 'craft' });
  assert(!h.bag.m[DEEP.eye]);
  atDoor(h);
  send(g, 0, 'deep', { op: 'craft' });
  assert.equal(h.bag.m[DEEP.eye], 1);
  DEEP.recipe.forEach(([id]) => assert.equal(h.bag.m[id], 3, `${id} 빠짐`));
  send(g, 0, 'deep', { op: 'craft' });               // 이미 있으면 또 만들지 않는다
  assert.equal(h.bag.m[DEEP.eye], 1);
});

test('입장 — 400레벨 · 계몽의 눈이 있어야 들어가고, 들어가도 눈은 남는다', () => {
  const g = world([{ lv: 399, m: { ...full(), [DEEP.eye]: 1 } }, { lv: 400 }, { lv: 450, m: { [DEEP.eye]: 1 } }]);
  const [a, b, c] = g.heroes;
  [a, b, c].forEach(atDoor);
  send(g, 0, 'deep', { op: 'enter' });
  assert.equal(a.map, 'plaza');
  assert.match(sysOf(g, 0).at(-1), /레벨 400 필요/);
  send(g, 1, 'deep', { op: 'enter' });
  assert.equal(b.map, 'plaza');
  assert.match(sysOf(g, 1).at(-1), /계몽의 눈/);
  send(g, 2, 'deep', { op: 'enter' });
  assert.equal(c.map, DEEP_MAPS[0].id);
  assert.equal(c.bag.m[DEEP.eye], 1, '열쇠라 쓰지 않는다');
  // 첫 맵 왼쪽 문으로 광장의 문 옆에 나온다
  c.x = MAPS[c.map].gates[0].x; c.y = MAPS[c.map].gates[0].y; c.gateCd = 0;
  rpgStep(g, 0.05);
  assert.equal(c.map, 'plaza');
  assert.deepEqual([c.x, c.y], DEEP.exitAt);
});

test('스냅샷 — 새 사냥터의 몹 종류 · 맵이 손님 화면에 그대로 간다', () => {
  const g = world([{ lv: 500, m: { [DEEP.eye]: 1 } }]);
  const h = g.heroes[0];
  atDoor(h); send(g, 0, 'deep', { op: 'enter' });
  h.map = 'fallen'; h.x = 3000; h.y = 920;
  rpgStep(g, 0.05);
  const guest = makeWorld(); guest.mySeat = 1; guest.looks = g.looks; guest.names = g.names;
  rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
  assert.equal(guest.heroes[0].map, 'fallen');
  const mobs = guest.mobs.filter((m) => m.map === 'fallen');
  assert(mobs.length > 0 && mobs.every((m) => m.type === 'fallen'), '타락천사');
  assert(mobs.some((m) => m.boss), '타락천사장');
});
