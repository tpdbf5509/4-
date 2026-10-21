import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgApply, rpgPack, noteSent, SYNC } from '../src/game/rpg.js';

function fixture() {
  const g = makeWorld(); g.mySeat = 0;
  const row = new Array(50).fill(0);
  row[0] = 500; row[1] = 500; row[4] = 190; row[6] = 1;
  rpgApply(g, { h: [row], m: [] });
  g.netSyncMiss = 0;
  return { g, h: g.heroes[0], row };
}

test('keep acknowledged hold anchor when a new input follows a long hold', () => {
  const { g, h, row } = fixture();
  g.t = 1; noteSent(g, 1); row[42] = 1;
  h.hist = [{ t: 1, x: 500, y: 500 }]; rpgApply(g, { h: [row], m: [] });
  g.t = 10; noteSent(g, 2);
  assert.equal(g.sentQ[1], 1);
  // An in-flight snapshot still acknowledges 1, but describes a recent position.
  h.x = 800; h.hist = [{ t: 9, x: 700, y: 500 }];
  row[0] = 700; row[43] = 8000;
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.x, 800);
});

test('modern snapshot without matching history cannot snap current position backwards', () => {
  for (const missing of ['sequence', 'history']) {
    const { g, h, row } = fixture();
    g.t = 10; h.x = 850; h.hold = ['right'];
    noteSent(g, 2); row[42] = missing === 'sequence' ? 1 : 2;
    h.hist = [{ t: 11, x: 850, y: 500 }];
    rpgApply(g, { h: [row], m: [] });
    assert.equal(h.x, 850, missing);
    assert.equal(g.netSyncMiss, 1);
  }
});

test('valid history corrects real error and map transitions still apply immediately', () => {
  const { g, h, row } = fixture();
  g.t = 1; noteSent(g, 1); row[42] = 1;
  h.hist = [{ t: 1, x: 400, y: 500 }];
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.fixX, 100); assert.equal(g.netFix, 1);
  row[10] = 1; row[0] = 200;
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.x, 200); assert.equal(h.fixX, 0);
});

test('legacy snapshots retain distance fallback', () => {
  const { g, h, row } = fixture(); h.x = 900;
  rpgApply(g, { h: [row.slice(0, 42)], m: [] });
  assert.equal(h.x, 500);
});

test('host hold age includes inputs received at simulation time zero', () => {
  const { g, h } = fixture(); h.inq = { hold: 1 }; h.inqAt = 0; g.t = 1;
  assert.equal(rpgPack(g).h[0][43], 1000);
});

test('obsolete unacknowledged anchors expire', () => {
  const { g } = fixture(); noteSent(g, 1); g.t = SYNC.hist + 2; noteSent(g, 2);
  assert.equal(g.sentQ[1], undefined);
});
