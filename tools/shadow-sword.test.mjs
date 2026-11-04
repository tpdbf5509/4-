/* 암흑검 「종말의 연격」 — 한 번 누르면 10초 동안 평타마다 연격이 나가고 공격 속도가 오르는지를 실제 게임 함수로 본다(11월 4일). node --test tools/shadow-sword.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill, heroRange, heroAttackRange } from '../src/game/rpg.js';
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
const order = (g) => fxKinds(g).filter((k) => k.startsWith('sk_px_sh'));

test('한 번 누르면 지속 시간 동안 평타마다 1타 · 2타 · 3타가 차례로 나간다(헛베어도)', () => {
  const { g, h } = setup();
  farAway(g, h);
  rpgWeaponSkill(g, 0);
  assert.equal(h.ws.cmb?.sp, 'shadow');
  assert.equal(h.ws.cmb?.st, 1);
  assert.equal(h.ws.cmb?.t, S.dur);
  g.out = [];
  h.fire = 1;                                     // 평타 키를 누르고 있다 — 허공을 벤다
  run(g, 2);
  const seq = order(g);
  assert.deepEqual(seq.slice(0, 3), ['sk_px_shcut1', 'sk_px_shcut2', 'sk_px_shslam'], '순서: ' + seq);
  assert.ok(seq.length >= 5, '2초 동안 여러 번 나간다: ' + seq.length);
  rpgWeaponSkill(g, 0);                           // 지속 중 다시 눌러도 바뀌지 않는다
  assert.equal(h.ws.cmb?.st, 1);
});

test('지속 중에는 공격 속도가 오르고 끝나면 그때부터 대기 시간을 센다', () => {
  const count = (buff) => {
    const { g, h } = setup();
    farAway(g, h);
    if (buff) rpgWeaponSkill(g, 0);
    g.out = []; h.fire = 1;
    run(g, 3);
    return fxKinds(g).filter((k) => k === 'slash').length;
  };
  const plain = count(false), fast = count(true);
  console.log('평타 수 3초', plain, '→', fast);
  assert.ok(fast >= plain * (1 + S.aspd) - 1.5, `평타 수 ${plain} → ${fast}`);
  const { g, h } = setup();
  farAway(g, h);
  rpgWeaponSkill(g, 0);
  run(g, S.dur + 0.05);
  assert.equal(h.ws.cmb, null, '지속이 끝났다');
  assert.ok(h.ws.wcd > S.cd - 0.2, '대기 시간은 끝난 뒤부터: ' + h.ws.wcd);
  rpgWeaponSkill(g, 0);
  assert.equal(h.ws.cmb, null, '대기 중에는 다시 쓸 수 없다');
});

test('맞히면 평타 피해에 연격 피해가 더해진다', () => {
  const dealt = (buff) => {
    const { g, h } = setup();
    const d = g.mobs.find((m) => m.map === 'train' && m.hp > 0);
    if (buff) rpgWeaponSkill(g, 0);
    h.fire = 1;
    const t0 = h.trn?.tot || 0;
    for (let n = 0; n < 200; n++) { h.x = d.x - 70; h.y = d.y; rpgStep(g, 0.01); }
    return (h.trn?.tot || 0) - t0;
  };
  const plain = dealt(false), buffed = dealt(true);
  console.log('2초 피해', Math.round(plain), '→', Math.round(buffed));
  assert.ok(buffed > plain * 1.8, `피해 ${Math.round(plain)} → ${Math.round(buffed)}`);
});

test('새 연출 시트가 있고 그리는 법이 적혀 있다', () => {
  for (const k of ['shcut1', 'shcut2', 'shslam']) {
    const look = SKILL_PX_LOOK[k];
    assert.ok(look && SKILL_PX_SHEETS[look.sheet], k);
    assert.ok(existsSync(`public/assets/game/rpg/effects/skill-px/${look.sheet}.webp`), k);
  }
});

test('연격 중 평타는 기존 사거리 밖의 적을 자동으로 치고 종료·무기 교체 시 원래대로다', () => {
  for (const mode of ['plain', 'active', 'expired', 'switched']) {
    const {g,h} = setup();
    const d = g.mobs.find(m => m.map === 'train');
    farAway(g,h);d.x=h.x+heroRange(h)*1.3;d.y=h.y;d.rad=0;
    if (mode !== 'plain') rpgWeaponSkill(g,0);
    if (mode === 'expired') { h.ws.cmb.t=.01;run(g,.02); }
    if (mode === 'switched') h.bag.e=0;
    assert.equal(heroAttackRange(h),heroRange(h)*(mode==='active'?1.5:1),mode+' 표시 반지름');
    h.cd=0;h.auto=1;const before=h.trn?.tot||0;run(g,.05);
    assert.equal((h.trn?.tot||0)>before,mode==='active',mode);
  }
});
