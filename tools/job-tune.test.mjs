import test from 'node:test';
import assert from 'node:assert/strict';
import { heroRange, JOB_DMG } from '../src/game/rpg.js';
import { JOB_TUNE, classCut, damageKind, mageHpBonus } from '../src/game/jobTuneData.js';
import { advTakeCut, advNullShield, tickAdv, packAdv, applyAdv } from '../src/game/advance.js';

const near = (a, b, msg) => assert(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);
const E = { fx: () => {}, say: () => {} };

test('검사는 기본 방어력 3% · 기사는 피해 감소 10%와 저항력 10%를 곱해 받는다', () => {
  near(classCut({ job: 'warrior' }, '', 'phys'), 0.03, '검사');
  near(classCut({ job: 'mage' }, '', 'phys'), 0, '마법사');
  near(classCut({ job: 'warrior' }, 'knight', 'magic'), 1 - 0.97 * 0.9 * 0.9, '기사 마법');
  near(classCut({ job: 'warrior' }, 'knight', 'phys'), 1 - 0.97 * 0.9 * 0.9, '기사 물리');
  assert.equal(damageKind({ hero: { job: 'mage' } }), 'magic');
  assert.equal(damageKind({ hero: { job: 'archer' } }), 'phys');
  assert.equal(damageKind({ type: 'necro' }), 'magic');
  assert.equal(damageKind({ type: 'wolf' }), 'phys');
});

test('기본 감소만 있으면 상한 없이 곱하고 전직 감소와 겹치면 기사 상한 70% 를 넘지 않는다', () => {
  const h = { job: 'warrior', advClass: 'knight', hp: 1000, max: 1000, as: null };
  const base = classCut(h, 'knight', 'phys');
  near(advTakeCut(h, 0, base), base, '기본만');
  near(advTakeCut(h, 0.5, base), 1 - 0.5 * (1 - base), '직업 철벽과 곱함');
  h.as = { gT: 10 }; h.hp = 100;                   // 철벽 방어 + 불굴의 의지까지
  near(advTakeCut(h, 0.5, base), 0.7, '상한');
  near(advTakeCut({ job: 'mage', as: null }, 0, 0), 0, '감소 없음');
});

test('기사 무효화 방어막은 한 대를 막고 20초 쉬면 다시 생긴다', () => {
  const g = { t: 0, heroes: [] };
  const h = { job: 'warrior', advClass: 'knight', hp: 1000, max: 1000, down: 0, map: 'field', x: 0, y: 0 };
  assert.equal(advNullShield(E, g, h), true, '처음 한 대는 막는다');
  assert.equal(advNullShield(E, g, h), false, '깨진 뒤는 맞는다');
  tickAdv(E, g, h, JOB_TUNE.knight.nullShield.regen - 1);
  assert.equal(h.as.nul, 0, '19초에는 아직');
  advNullShield(E, g, h);                          // 맞으면 쉰 시간이 처음부터
  tickAdv(E, g, h, JOB_TUNE.knight.nullShield.regen - 1);
  assert.equal(h.as.nul, 0, '맞은 뒤 다시 19초');
  tickAdv(E, g, h, 1.01);
  assert.equal(h.as.nul, 1, '20초 쉬면 다시 생긴다');
  const copy = { job: 'warrior' }; applyAdv(copy, packAdv(h));
  assert.equal(copy.as.nul, 1, '스냅샷으로 손님에게 간다');
  const mage = { job: 'mage', advClass: '', hp: 1, max: 1 };
  assert.equal(advNullShield(E, g, mage), false, '기사가 아니면 없다');
});

test('마법사는 최대 체력 1% 를 더하되 한 대 피해의 25% 까지', () => {
  near(mageHpBonus(1000, 10000), 100, '작은 몹');
  near(mageHpBonus(1000, 1e9), 250, '보스는 한도');
});

test('궁수는 피해 0.9배 · 사거리 1.15배', () => {
  assert.equal(JOB_DMG.archer, 0.9);
  near(heroRange({ job: 'archer' }) / heroRange({ job: 'warrior' }), (158 * 1.15) / 72, '사거리');
});
