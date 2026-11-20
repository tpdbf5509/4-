/* 히든 계열 · 전용 사거리(11월 20일 사용자 "히든 직업은 히든직업이고, 전용 사거리를 만들어줘").
   node --test tools/hidden-family.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, offHand, heroAttackRange, hiddenOf } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { HIDDEN_RANGE, hiddenRange } from '../src/game/hiddenFamilyData.js';
import { GM_CHIP } from '../src/game/gamblerData.js';
import { EN_PULSE } from '../src/game/engineerData.js';
import { NC_SCYTHE } from '../src/game/necroData.js';
import { IL_CARD } from '../src/game/illusionData.js';
import { WY_CLAW } from '../src/game/wyvernData.js';
import { unlockNecro } from '../src/game/necroJob.js';
import { unlockBlood } from '../src/game/bloodJob.js';
Math.random = () => 0.999;

function hero(job, sp) {
  const g = makeWorld(); g.out = []; g.test = 1; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'n0', name: 'a', hero: { name: 'a', job, gender: 'm' } }]);
  rpgJoin(g, 0, { name: 'a', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 100, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, sp, p: 0 }], e: 1 } }, 'n0');
  const h = g.heroes[0]; h.map = SANDBOX.id; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  return { g, h };
}
const proto = makeWorld().mobs.find((m) => m.type === 'rabbit' && !m.boss);
function hit(g, h, dx) {
  rpgStep(g, .01); g.mobs = g.mobs.filter((m) => m.type !== 'dummy'); h.cd = 0;
  const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x: h.x + dx, y: h.y, hp: 1e9, max: 1e9, stun: 999, dead: false };
  g.mobs.push(m);
  rpgInput(g, { cls: 0, kind: 'fire', dir: true }); rpgStep(g, .01); rpgInput(g, { cls: 0, kind: 'fire', dir: false });
  for (let i = 0; i < 45; i++) rpgStep(g, .01);
  return 1e9 - m.hp;
}

test('직업 평타가 히든 계열 표의 사거리를 쓴다(판정 값은 그대로)', () => {
  assert.equal(GM_CHIP.range, HIDDEN_RANGE.gambler); assert.equal(GM_CHIP.range, 480);
  assert.equal(EN_PULSE.range, 520); assert.equal(NC_SCYTHE.reach, 140); assert.equal(IL_CARD.range, 550); assert.equal(WY_CLAW.reach, 160);
  assert.equal(hiddenRange('없는직업'), HIDDEN_RANGE.base, '자기 값이 없으면 공통 값');
});

test('그림자 낫 — 바탕 직업이 달라도 사거리 원은 140, 다른 무기 고정 피해(40)를 받지 않는다', () => {
  for (const job of ['warrior', 'mage', 'archer']) {
    const { g, h } = hero(job, 'nc_scythe');
    unlockNecro(h, { lv: 200, tr: [[0, 0], [0, 0], [0, 0]], roster: [] });
    assert.equal(hiddenOf(h), 'necromancer');
    assert.equal(offHand(h), '');
    assert.equal(heroAttackRange(h), 140);
    assert.ok(hit(g, h, 100) > 1000, `${job} 바탕도 제 피해`);
  }
});

test('BLOOD-001 — 바탕 직업과 상관없이 사거리 230 · 레퀴엠 한 발 · 고정 피해 없음', () => {
  for (const job of ['warrior', 'mage', 'archer']) {
    const { g, h } = hero(job, 'blood_gun');
    unlockBlood(h); h.bag.e = 1;
    assert.equal(hiddenOf(h), 'blood');
    assert.equal(offHand(h), '', `${job} 바탕 — 총(활 묶음)이어도 다른 무기가 아니다`);
    assert.equal(heroAttackRange(h), HIDDEN_RANGE.blood);
    assert.ok(hit(g, h, 200) > 1000, `${job} 바탕 — 200 거리 적을 쏜다`);
    assert.equal(hit(g, h, 300), 0, '사거리 밖은 자동으로 겨누지 않는다');
  }
});

test('히든 직업이 아니면 예전 그대로 — 검사가 활을 들면 고정 피해', () => {
  const { h } = hero('warrior', null);
  h.bag.w = [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }]; h.bag.e = 1;
  assert.equal(hiddenOf(h), '');
  assert.equal(offHand(h), 'bow');
  assert.equal(Math.round(heroAttackRange(h)), 90);
});
