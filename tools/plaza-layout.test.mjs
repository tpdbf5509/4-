/* 광장 새 배치(11월 28일, src/game/plazaLayout.js) — 테스트 서버(?test)에서 먼저 쓴다.
   차례 · id 는 지금 배치와 같고, 돌아오는 자리가 막힘 · 문 안에 있지 않고, 대화 상대끼리 너무 붙지 않는지 본다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const ids = (flag) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
  `globalThis.__PLAZA_NEW__=${flag};const {MAPS}=await import('./src/game/rpg.js');console.log(JSON.stringify({n:MAPS.plaza.npcs.map(n=>n.id),g:MAPS.plaza.gates.map(g=>g.to)}))`], { encoding: 'utf8' }).trim().split('\n').pop());

globalThis.__PLAZA_NEW__ = true;
const { MAPS, RPG, dist } = await import('../src/game/rpg.js');
const { PLAZA_NEW } = await import('../src/game/plazaLayout.js');
const { TRAIN } = await import('../src/game/trainData.js');
const { DEEP } = await import('../src/game/deepData.js');
const { ABYSS } = await import('../src/game/abyssData.js');
const { RACE } = await import('../src/game/raceData.js');
const { VILLAGE } = await import('../src/game/villageData.js');
const { GM_CASINO, GM_SPOTS } = await import('../src/game/gamblerData.js');
const { SHOPS } = await import('../src/game/shopData.js');
const M = MAPS.plaza;
const inside = (x, y, c) => Math.hypot(x - c.x, (y - c.y) / RPG.squash) < c.r;

test('새 배치가 켜지고 NPC · 문 차례는 지금 배치와 같다', () => {
  assert.equal(PLAZA_NEW, true);
  assert.deepEqual(ids(true), ids(false));
  assert.equal(M.npcs.length, 21);
  assert.deepEqual(M.gates.find((g) => g.to === 'field') && [M.gates[0].x, M.gates[0].y], [1700, 780]);
});

test('돌아오는 자리는 막힘 · 문 밖이다', () => {
  const back = { spawn: M.spawn, train: TRAIN.plazaAt, deep: DEEP.exitAt, abyss: ABYSS.exitAt, race: RACE.backAt,
    village: VILLAGE.plazaAt, casino: GM_CASINO.plazaAt, field: MAPS.field.gates[0].at };
  for (const [k, [x, y]] of Object.entries(back)) {
    assert.ok(!M.blocks.some((b) => inside(x, y, b)), `${k} 가 막힘 안`);
    assert.ok(!M.gates.some((g) => inside(x, y, g)), `${k} 가 문 안`);
    assert.ok(x > 40 && x < M.w - 40 && y > M.top && y < M.h - 20, `${k} 가 맵 밖`);
  }
});

test('대화 상대끼리 붙지 않고 모두 맵 안이다 · 칩 상자는 도박장 곁', () => {
  for (const n of M.npcs) assert.ok(n.x > 40 && n.x < M.w - 40 && n.y > M.top && n.y < M.h - 20, n.id);
  for (let i = 0; i < M.npcs.length; i++) for (let j = i + 1; j < M.npcs.length; j++) {
    const a = M.npcs[i], b = M.npcs[j];
    assert.ok(dist(a.x, a.y, b.x, b.y) >= 130, `${a.id} · ${b.id}`);
  }
  for (const g of M.gates) assert.ok(!M.blocks.some((b) => Math.hypot(g.x - b.x, (g.y - b.y) / RPG.squash) < g.r + b.r), g.label);
  const box = GM_SPOTS.find((s) => s.id === 'box'), casino = SHOPS.find((s) => s.id === 'casino');
  assert.ok(dist(box.x, box.y, casino.x, casino.y) < 160);
});
