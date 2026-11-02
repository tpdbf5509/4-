/* 암흑검 「종말의 연격」 — 한 번 누를 때마다 한 타 · 헛베어도 연계가 이어지는지를 실제 게임 함수로 본다. node --test tools/shadow-sword.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill } from '../src/game/rpg.js';
import { WEAPON_SKILLS } from '../src/game/skillData.js';
import { SPECIALS } from '../src/game/shopData.js';
import { specialTier } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SKILL_PX_SHEETS, SKILL_PX_LOOK } from '../src/game/skillPxData.js';

const SP = SPECIALS.find((s) => s.id === 'shadow'), S = WEAPON_SKILLS.shadow.skill;
function setup() {
  const g = makeWorld(); g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name: '암흑시험', hero: { name: '암흑시험', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '암흑시험', rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 0, stats: { str: 100 },
    bag: { oc: 1, w: [{ u: 1, t: 'great', r: specialTier(SP), g: 4, p: 100, sp: 'shadow' }], e: 1, n: 2 } }, 'p0');
  const h = g.heroes[0];
  h.map = 'train'; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  rpgStep(g, 0.01);
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / 0.01); n++) rpgStep(g, 0.01); };
const farAway = (g, h) => { h.x = 200; h.y = 200; g.mobs.forEach((m) => { if (m.map === 'train') { m.x = 1500; m.y = 1500; } }); };   // 닿는 거리 안에 적이 없다
const fxKinds = (g) => g.out.filter((o) => o.k === 'fx').map((o) => o.kind);

test('적이 하나도 없어도 한 번 누르면 1타가 나가고 다시 누르면 2타 · 마무리가 나간다', () => {
  const { g, h } = setup();
  farAway(g, h);
  rpgWeaponSkill(g, 0);
  assert.ok(fxKinds(g).includes('sk_px_shcut1'), '1타 연출: ' + fxKinds(g));
  assert.equal(h.ws.cmb?.st, 2, '헛베어도 연계가 2타 입력으로 이어진다');
  assert.equal(h.ws.wcd, S.cd);
  g.out = [];
  run(g, 0.2);
  rpgWeaponSkill(g, 0);
  assert.ok(fxKinds(g).includes('sk_px_shcut2'), '2타 연출: ' + fxKinds(g));
  assert.equal(h.ws.cmb?.st, 3, '헛베어도 마무리 입력으로 이어진다');
  g.out = [];
  run(g, S.perfect[0] + 0.05);
  rpgWeaponSkill(g, 0);
  run(g, 0.3);
  assert.ok(fxKinds(g).includes('sk_px_shslam'), '마무리 연출: ' + fxKinds(g));
  assert.equal(h.ws.cmb, null, '마무리 뒤 연계가 끝난다');
});

test('다음 입력이 없으면 정해진 시간 뒤에 연계가 끝난다', () => {
  const { g, h } = setup();
  farAway(g, h);
  rpgWeaponSkill(g, 0);
  run(g, S.gap + 0.1);
  assert.equal(h.ws.cmb, null);
  const { g: g2, h: h2 } = setup();
  farAway(g2, h2);
  rpgWeaponSkill(g2, 0); run(g2, 0.1); rpgWeaponSkill(g2, 0);
  run(g2, S.finGap + 0.1);
  assert.equal(h2.ws.cmb, null);
});

test('맞히면 전처럼 1타 경직 · 2타 밀어내기 · 마무리 피해가 들어간다', () => {
  const { g, h } = setup();
  const d = g.mobs.find((m) => m.map === 'train' && m.hp > 0);
  h.x = d.x - 70; h.y = d.y;
  let tot = h.trn?.tot || 0;
  const step = () => { const t = h.trn?.tot || 0; const dt = t - tot; tot = t; return dt; };
  rpgWeaponSkill(g, 0); run(g, 0.05); assert.ok(step() > 0, '1타 피해');
  assert.equal(h.ws.cmb?.st, 2);
  run(g, 0.2); h.x = d.x - 70; h.y = d.y;
  rpgWeaponSkill(g, 0); run(g, 0.05); assert.ok(step() > 0, '2타 피해');
  assert.equal(h.ws.cmb?.st, 3);
  run(g, S.perfect[0] + 0.05); h.x = d.x - 70; h.y = d.y;
  rpgWeaponSkill(g, 0); run(g, 0.4); assert.ok(step() > 0, '마무리 피해');
});

test('새 연출 시트가 있고 그리는 법이 적혀 있다', () => {
  for (const k of ['shcut1', 'shcut2', 'shslam']) {
    const look = SKILL_PX_LOOK[k];
    assert.ok(look && SKILL_PX_SHEETS[look.sheet], k);
    assert.ok(existsSync(`public/assets/game/rpg/effects/skill-px/${look.sheet}.webp`), k);
  }
});
