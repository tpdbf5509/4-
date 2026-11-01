// 스킬 상점 스킬 연출(pixelfx 시트) — 스킬마다 새 연출이 나오고, 판정(피해)은 그대로인지 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SKILLS } from '../src/game/shopData.js';
import { SKILL_PX_SHEETS, SKILL_PX_LOOK, SKILL_PX_ELEMS } from '../src/game/skillPxData.js';

function setup(job, id) {
  const g = makeWorld(); g.out = []; g.mySeat = 0;
  rpgSyncSeats(g, [{ id: 'px', name: '연출시험', hero: { name: '연출시험', job, elem: 'flame', gender: 'm' } }]);
  const job1 = id.startsWith('j_');
  rpgJoin(g, 0, { name: '연출시험', rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, stats: { str: 200, int: 200, hp: 200 },
    bag: { e: 0, n: 0, w: [], s: { [id]: 1 }, ks: { job: job1 ? id : '', g: job1 ? ['', ''] : [id, ''] } } }, 'px');
  const h = g.heroes[0]; h.auto = 0; h.map = 'train'; h.dir = 1;
  rpgStep(g, 0.01);
  const m = g.mobs.find((q) => q.map === 'train' && q.hp > 0);
  h.x = m.x - 90; h.y = m.y;
  if (id === 'aid') h.hp = h.max * 0.5;
  g.out = [];
  return { g, h };
}
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) rpgStep(g, 0.02); };

const WANT = {
  smash: ['warrior', ['sk_px_smash']], burst: ['mage', ['sk_px_burst']], pierce: ['warrior', ['sk_px_pierce']], aid: ['warrior', ['sk_px_aid']],
  j_rush: ['warrior', ['sk_px_rush', 'sk_px_spin']], j_cleave: ['warrior', ['sk_px_cleave']], j_iron: ['warrior', ['sk_px_iron']],
  j_pierce: ['archer', ['sk_px_arrow', 'sk_px_spark']], j_volley: ['archer', ['sk_px_arrow', 'sk_px_spark']], j_leap: ['archer', ['sk_px_spark_ice', 'sk_px_arrow_ice']],
  j_orb: ['mage', ['sk_px_orb', 'sk_px_boom']], j_chain: ['mage', ['sk_px_chain']], j_shield: ['mage', ['sk_px_circle']],
};

test('스킬 상점의 액티브 스킬이 모두 새 연출 목록에 있다', () => {
  const act = SKILLS.filter((s) => s.kind === 'active').map((s) => s.id).sort();
  assert.deepEqual(act, Object.keys(WANT).sort());
});

test('연출 시트 파일이 모두 있다', () => {
  for (const [k, look] of Object.entries(SKILL_PX_LOOK)) {
    const names = look.elem ? SKILL_PX_ELEMS.map((e) => `${k}_${e}`) : [k];
    for (const n of names) {
      assert.ok(SKILL_PX_SHEETS[n], n);
      assert.ok(existsSync(`public/assets/game/rpg/effects/skill-px/${n}.webp`), n);
    }
  }
});

for (const [id, [job, kinds]] of Object.entries(WANT)) {
  test(`${id} — pixelfx 연출이 나오고 판정은 그대로`, () => {
    const { g, h } = setup(job, id);
    const hp0 = h.hp;
    rpgInput(g, { cls: 0, kind: 'use', dir: id });
    run(g, 1.2);
    const fx = g.out.filter((f) => f.k === 'fx');
    for (const k of kinds) assert.ok(fx.some((f) => f.kind === k), `${k} 없음: ${fx.map((f) => f.kind).join(',')}`);
    for (const f of fx.filter((q) => q.kind.startsWith('sk_px_'))) {
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), f.kind);
      const look = SKILL_PX_LOOK[f.kind.slice(6)];
      assert.ok(look, f.kind);
      if (look.mode !== 'at') assert.ok([f.x0, f.y0, f.x1, f.y1].every(Number.isFinite), f.kind);
      assert.ok(f.by === 0, `${f.kind} 주인(by) 없음`);   // 남의 연출 덜어내기(CROWD)가 볼 수 있게
    }
    if (id === 'aid') assert.ok(h.hp > hp0);
    else if (!['j_iron', 'j_shield'].includes(id)) assert.ok((h.trn?.tot || 0) > 0, '피해가 들어가야 한다');
  });
}
