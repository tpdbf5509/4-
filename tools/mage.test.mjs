import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, JOB_DMG, DOT_STACK } from '../src/game/rpg.js';
import { RESET, GIFT } from '../src/game/itemData.js';

// 마법사 피해 배율(JOB_DMG) · 지속 피해 중첩(DOT_STACK) — 자동 평타로 사냥터 몹 하나를 치게 해 잰다
function setup(job, elem) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  const seats = [{ id: 'm0', name: '시험', hero: { name: '시험', job, elem, gender: 'm' } }];
  rpgSyncSeats(g, seats);
  rpgJoin(g, 0, { name: '시험', rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 0, stats: { int: 100, str: 100 }, bag: { oc: 1, w: [], n: 1 } }, 'm0');
  const h = g.heroes[0], m = g.mobs.find((q) => q.map === 'field' && !q.boss);
  g.mobs = [m];                                   // 이 몹 하나만 친다
  h.map = 'field'; h.x = m.x - 60; h.y = m.y; h.auto = 1;
  m.hp = m.max = 1e9; m.pin = [m.x, m.y];
  return { g, h, m };
}
// 토끼는 맞으면 달아나니 걸음마다 제자리에 둔다
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) { rpgStep(g, 0.02); g.mobs.forEach((m) => { if (m.pin) { [m.x, m.y] = m.pin; m.state = 'idle'; } }); } };
// 치명타 · 흩어짐이 같도록 난수를 고정한다
function fixedRandom(fn) { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } }
function dealt(job, elem, mul) {
  const keep = JOB_DMG.mage; JOB_DMG.mage = mul;
  try { return fixedRandom(() => { const { g, m } = setup(job, elem); run(g, 6); return 1e9 - m.hp; }); }
  finally { JOB_DMG.mage = keep; }
}

test('마법사 피해는 몹에게 5% 더 들어간다', () => {
  assert.equal(JOB_DMG.mage, 1.05);
  const base = dealt('mage', 'frost', 1), up = dealt('mage', 'frost', 1.05);
  assert(base > 0);
  const ratio = up / base;
  assert(ratio > 1.03 && ratio < 1.07, `비율 ${ratio}`);   // 피해는 정수로 반올림하니 근사
});

test('마법사의 화상 · 독은 최대 3겹까지 쌓이고 전사는 쌓이지 않는다', () => {
  fixedRandom(() => {
    for (const elem of ['flame', 'poison']) {
      const key = elem === 'flame' ? 'bst' : 'pst';
      const mage = setup('mage', elem); run(mage.g, 8);
      assert.equal(mage.m[key], DOT_STACK.max, `마법사 ${elem} 겹 ${mage.m[key]}`);
      const war = setup('warrior', elem); run(war.g, 8);
      assert.equal(war.m[key], 1, `전사 ${elem} 겹 ${war.m[key]}`);
    }
  });
});

test('겹이 쌓이면 지속 피해도 겹만큼 커지고 다 풀리면 처음으로 돌아간다', () => {
  fixedRandom(() => {
    const { g, h, m } = setup('mage', 'flame');
    run(g, 8); assert.equal(m.bst, 3);
    h.auto = 0; const dps = m.bdps;
    const before = m.hp; run(g, 1); const tick = before - m.hp;      // 1초 = 틱 두 번
    assert(Math.abs(tick - dps * 3 * JOB_DMG.mage) <= 3, `틱 ${tick} · 기대 ${dps * 3 * JOB_DMG.mage}`);
    run(g, 7); assert.equal(m.burn, 0); assert.equal(m.bst, 0);
  });
});
