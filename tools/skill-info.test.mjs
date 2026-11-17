/* 실제 게임 스킬 설명 창(11월 17일) — 일반 직업 · 전직 · BLOOD-001 · Gambler 002 설명이 비지 않고, 엔지니어 · 네크로맨서는 만들지 않는다.
   node --test tools/skill-info.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, JOBS } from '../src/game/rpg.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV_CLASSES } from '../src/game/advData.js';
import { unlockGambler } from '../src/game/gamblerJob.js';
import { unlockBlood } from '../src/game/bloodJob.js';
import { gameSkillInfo } from '../src/game/gameSkillInfo.js';
import { defaultKeys, keyMap } from '../src/game/keys.js';

function hero(job, bag = {}) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'p0', name: '시험', hero: { name: '시험', job, gender: 'm', elem: 'flame' } }]);
  rpgJoin(g, 0, { name: '시험', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 },
    bag: { oc: 1, n: 2, w: [], e: 0, ...bag } }, 'p0');
  return { g, h: g.heroes[0] };
}
const clean = (r, tag) => {
  for (const q of [r.info.basic, ...r.info.skills]) {
    assert.ok(q.name && Array.isArray(q.desc) && Array.isArray(q.stats), `${tag} ${q.s}`);
    assert.ok(!/undefined|NaN|null/.test(JSON.stringify(q)), `${tag} ${q.s} ${JSON.stringify(q)}`);
  }
};

test('일반 직업 셋 · 전직 모두 — 큰 기술 · 평타 · 배운 스킬이 보이고 빈 값이 없다', () => {
  for (const j of JOBS) {
    const ks = { job: j.id === 'warrior' ? 'j_rush' : j.id === 'mage' ? 'j_orb' : 'j_pierce', g: ['smash', 'aid'] };
    const s = { smash: 3, aid: 1, might: 2, [ks.job]: 5 };
    const { h } = hero(j.id, { s, ks });
    const r = gameSkillInfo(h);
    assert.equal(r.info.id, j.id); assert.equal(r.lv, 0);
    assert.ok(r.info.skills.some((q) => q.act === 'skill'));
    assert.ok(r.info.skills.some((q) => q.act === 'use5' && q.lvText === '스킬 레벨 5/5'));
    assert.ok(r.info.skills.some((q) => q.s === 'might'));
    clean(r, j.id);
    for (const c of ADV_CLASSES.filter((c) => c.job === j.id)) {
      h.advClass = c.id;
      const a = gameSkillInfo(h);
      assert.equal(a.info.name, c.name);
      assert.ok(a.info.skills.some((q) => q.act === 'adv'), c.id);
      if (c.ultimate) assert.ok(a.info.skills.some((q) => q.act === 'advUlt'), c.id);
      clean(a, c.id);
    }
  }
});

test('BLOOD-001 · Gambler 002 — 각 직업 설명 · 레벨 · 잠김', () => {
  const b = hero('archer');
  unlockBlood(b.h);
  const rb = gameSkillInfo(b.h);
  assert.equal(rb.info.id, 'blood'); assert.ok(rb.lv >= 1);
  assert.ok(rb.info.skills.find((q) => q.act === 'bAwake').lock);
  assert.ok(!rb.info.skills.find((q) => q.act === 'bShot').lock);
  clean(rb, 'blood');
  const m = hero('archer');
  unlockGambler(m.h);
  const rg = gameSkillInfo(m.h);
  assert.equal(rg.info.id, 'gambler'); assert.ok(rg.lv >= 1);
});

test('엔지니어 · 네크로맨서는 실제 게임 설명에 나오지 않는다', () => {
  const { h } = hero('mage', { hj: { active: 'engineer', jobs: { engineer: { lv: 10, xp: 0, tr: [[0, 0], [0, 0], [0, 0]] } }, version: 1 } });
  assert.ok(!['engineer', 'necromancer'].includes(gameSkillInfo(h).info.id));
  const n = hero('mage'); n.h.bag.hj = { active: 'necromancer', jobs: { necromancer: { lv: 10, xp: 0, tr: [[0, 0], [0, 0], [0, 0]], roster: [] } }, version: 1 };
  assert.equal(gameSkillInfo(n.h).info.id, 'mage');
});

test('M 키 — 기본 키는 스킬 설명이고 다른 행동과 겹치지 않는다', () => {
  const k = defaultKeys();
  assert.deepEqual(k.skills, ['KeyM', '']);
  assert.equal(Object.entries(k).filter(([, v]) => v.includes('KeyM')).length, 1);
  assert.equal(keyMap(k).KeyM, 'skills');
});
