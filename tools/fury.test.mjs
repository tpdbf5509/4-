/* 적룡 지팡이 「용의 격노」 — 판정 시각 · 패시브 · 얻는 곳 제외를 실제 게임 함수로 본다. node --test tools/fury.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill } from '../src/game/rpg.js';
import { WEAPON_SKILLS } from '../src/game/skillData.js';
import { SPECIALS } from '../src/game/shopData.js';
import { specialsFor, whySpecialBuy, specialTier } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';

const SP = SPECIALS.find((s) => s.id === 'fury_staff'), S = WEAPON_SKILLS.fury_staff.skill;
function setup() {
  const g = makeWorld(); g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name: '용시험', hero: { name: '용시험', job: 'mage', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '용시험', rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 0, stats: { int: 100 },
    bag: { oc: 1, w: [{ u: 1, t: 'staff', r: specialTier(SP), g: 4, p: 100, sp: 'fury_staff' }], e: 1, n: 2 } }, 'p0');
  const h = g.heroes[0];
  h.map = 'train'; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  rpgStep(g, 0.01);
  const d = g.mobs.find((m) => m.map === 'train' && m.hp > 0);
  h.x = d.x - S.burst.ahead; h.y = d.y;            // 허수아비가 폭발 자리에 선다 — 베기 · 폭발 · 광선 모두 닿는다
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / 0.01); n++) rpgStep(g, 0.01); };

test('용의 격노 — 베기 · 폭발 · 광선이 영상의 순서대로 차례로 맞는다', () => {
  const { g, h } = setup();
  rpgWeaponSkill(g, 0);
  assert.equal(h.ws.wcd, S.cd);
  assert.equal(g.out.filter((o) => o.kind === 'sk_fury').length, 1, '연출 한 통');
  const hits = [];
  let now = 0;
  for (const t of [S.slash.at, S.burst.at, S.beam.at]) {
    const before = h.trn?.tot || 0;
    run(g, t + 0.03 - now); now = t + 0.03;
    hits.push((h.trn?.tot || 0) - before);
  }
  hits.forEach((d, i) => assert(d > 0, `${i + 1}단계 피해`));
  assert(hits[2] > hits[0], '광선이 베기보다 세다');
});

test('용의 불씨 — 평타가 맞으면 대기 시간이 준다', () => {
  const { g, h } = setup();
  rpgWeaponSkill(g, 0);
  run(g, 1);
  const cd = h.ws.wcd;
  h.x = g.mobs.find((m) => m.map === 'train').x - 60;
  h.auto = 1;
  run(g, 1.5);
  assert(h.ws.wcd < cd - 1.5 - 0.3, `평타로 줄었다 ${cd} → ${h.ws.wcd}`);
});

test('얻는 곳을 정하기 전 — 상점 · 특가 목록에 없고 살 수 없다', () => {
  assert(SP.hold);
  assert(!specialsFor(800).some((s) => s.id === 'fury_staff'));
  assert(whySpecialBuy({ lv: 800, coins: 1e9, bag: { w: [] } }, 'fury_staff').some((w) => /정해지지/.test(w)));
});
