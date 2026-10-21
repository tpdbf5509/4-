import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgApply, rpgPack, noteSent, SYNC, predictDash, predictLunge } from '../src/game/rpg.js';

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

test('pre-dash snapshot cannot schedule a backwards correction during prediction', () => {
  const { g, h, row } = fixture();
  g.t = 1; noteSent(g, 1); row[42] = 1;
  h.hist = [{ t: 1.1, x: 700, y: 500 }]; h.x = 730;
  h.predict = 0.5; h.fixX = -40; row[43] = 100;
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.x, 730); assert.equal(h.fixX, 0); assert.equal(g.netFix || 0, 0);
});

test('prediction grace is bounded: rejected movement is corrected afterwards', () => {
  const { g, h, row } = fixture();
  g.t = 1; noteSent(g, 1); row[42] = 1;
  h.x = 730; h.hist = [{ t: 1.7, x: 730, y: 500 }];
  h.predict = 0; row[43] = 700;
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.fixX, -230); assert.equal(g.netFix, 1);
});

test('starting a successful dash or lunge cancels a pending smooth correction', () => {
  const { g, h } = fixture();
  h.fixX = -80; h.fixY = 20; h.dashCd = 0;
  assert.equal(predictDash(h), true);
  assert.equal(h.fixX, 0); assert.equal(h.fixY, 0);
  h.dash = 0; h.map = 'train'; h.bag.s.pierce = 1; h.bag.ks.g = ['pierce', ''];
  h.fixX = -80; h.fixY = 20;
  assert.equal(predictLunge(g, h, 'pierce'), true);
  assert.equal(h.fixX, 0); assert.equal(h.fixY, 0);
});

test('prediction grace still applies map changes, damage and death state', () => {
  const { g, h, row } = fixture(); h.predict = 0.5;
  row[10] = 1; row[0] = 200; row[3] = 0; row[5] = 5;
  rpgApply(g, { h: [row], m: [] });
  assert.equal(h.x, 200); assert.equal(h.hp, 0); assert.equal(h.down, 5);
});

test('a rejected local prediction does not erase an existing correction', () => {
  const { g, h } = fixture(); h.dashCd = 2; h.fixX = -80;
  assert.equal(predictDash(h), false); assert.equal(h.fixX, -80);
  h.map = 'plaza';
  assert.equal(predictLunge(g, h, 'pierce'), false); assert.equal(h.fixX, -80);
});
