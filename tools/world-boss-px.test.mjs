// 월드보스 연출(pixelfx 시트) — 시트가 모두 있고, 실제 토벌 · 공격이 연출을 보내며 판정은 그대로인지 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgWorldBoss, rpgStep } from '../src/game/rpg.js';
import { WORLD_BOSS as C, WORLD_BOSSES } from '../src/game/worldBossData.js';
import { worldBossHit, worldBossKilled } from '../src/game/worldBoss.js';
import { WB_PX_SHEETS } from '../src/game/worldBossPxData.js';
import { RESET, GIFT } from '../src/game/itemData.js';

// WebP 가로 · 세로(VP8L 무손실 · VP8X)
function webpSize(p) {
  const b = readFileSync(p), kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

test('월드보스 연출 시트가 모두 있고 칸 수가 맞다', () => {
  for (const [n, S] of Object.entries(WB_PX_SHEETS)) {
    const f = `public/assets/game/rpg/effects/world-boss/${n}.webp`;
    assert.ok(existsSync(f), n);
    const [w, h] = webpSize(f);
    assert.equal(w, S.cols * S.w, `${n} 가로`);
    assert.equal(h, Math.ceil(S.n / S.cols) * S.h, `${n} 세로`);
    for (const k of ['warn', 'hit']) if (S[k]) assert.ok(S[k][0] >= 0 && S[k][1] < S.n, `${n} ${k}`);
  }
});

const seats = Array.from({ length: 3 }, (_, i) => ({ id: `px${i}`, name: `연출${i}`, hero: { name: `연출${i}`, job: 'archer', elem: 'frost', gender: 'm' } }));
function setup() {
  const g = makeWorld(); g.mySeat = 0; g.wb.lastHour = Math.floor(g.wb.clock / C.period); g.out = [];
  rpgSyncSeats(g, seats);
  for (let i = 0; i < 3; i++) rpgJoin(g, i, { name: seats[i].name, rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 300000, stats: { str: 100, hp: 100 }, bag: { oc: 1, w: [], e: 1, n: 2 } }, seats[i].id);
  g.heroes.forEach((h) => { if (h) { h.auto = 0; h.x = C.portal.x; h.y = C.portal.y + 70; } });
  return g;
}

for (const B of WORLD_BOSSES) {
  test(`${B.name} — 공격이 맞는 순간 보스 빛깔의 sk_raid_hit 를 보낸다`, () => {
    const g = setup(); rpgWorldBoss(g, 0, { op: 'summon', id: B.id }); rpgWorldBoss(g, 0, { op: 'enter' });
    const a = g.wb.active, m = g.mobs.find((q) => q.id === a.mob), h = g.heroes[0];
    h.x = m.x + 150; h.y = m.y; a.cd = 0; g.out = [];
    for (let i = 0; i < 400 && !g.out.some((f) => f.kind === 'sk_raid_hit'); i++) { rpgStep(g, 0.02); h.hp = h.max; h.down = 0; }
    const f = g.out.find((q) => q.kind === 'sk_raid_hit');
    assert.ok(f, '공격 연출이 있어야 한다');
    assert.equal(f.tone, B.id);
    assert.ok(f.area && Number.isFinite(f.x) && Number.isFinite(f.y));
  });
}

test('토벌하면 쓰러진 자리에 sk_raid_end 빛기둥을 보낸다', () => {
  const g = setup(); rpgWorldBoss(g, 0, { op: 'summon', id: 'dragon' });
  const a = g.wb.active, m = g.mobs.find((q) => q.id === a.mob), h = g.heroes[0], got = [];
  worldBossHit(g, m, h, m.hp);
  worldBossKilled({ notice() {}, fx: (_g, map, f) => got.push({ map, ...f }) }, g, m);
  assert.equal(a.phase, 'clear');
  const end = got.find((f) => f.kind === 'sk_raid_end');
  assert.ok(end, '토벌 연출이 있어야 한다');
  assert.equal(end.map, C.map);
  assert.deepEqual([end.x, end.y], [m.x, m.y]);
});
