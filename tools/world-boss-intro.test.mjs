// 월드보스 등장 연출 — 화면에만 흐르는 상태가 한 번씩만 켜지고, 세계(판정 상태)는 건드리지 않는지 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import { tickWbIntro, wbIntroRise, resetWbIntro } from '../src/game/worldBossIntro.js';
import { WB_INTRO as I } from '../src/game/worldBossIntroData.js';
import { WORLD_BOSS as C } from '../src/game/worldBossData.js';

const world = (map, active) => ({ mySeat: 0, heroes: [{ map }], wb: { active }, shake: 0 });
const boss = (key, extra = {}) => ({ id: 'dragon', key, phase: 'fight', attack: null, ...extra });

test('접속 때 이미 있던 보스는 예고하지 않고, 새로 나온 보스만 뿔피리를 분다', () => {
  resetWbIntro(); const snd = [], play = (n) => snd.push(n);
  const g = world('plaza', boss('a'));
  tickWbIntro(g, true, play, 0);
  assert.deepEqual(snd, []);
  g.wb.active = boss('b'); tickWbIntro(g, true, play, 1);
  assert.deepEqual(snd, ['wbHorn']);
  tickWbIntro(g, true, play, 2);
  assert.deepEqual(snd, ['wbHorn'], '같은 출현은 한 번만');
});

test('들어가면 땅울림 → 포효 · 흔들림, 몸이 올라온다. 불러오기 중에는 기다린다', () => {
  resetWbIntro(); const snd = [], play = (n) => snd.push(n);
  const g = world(C.map, boss('k'));
  const before = JSON.stringify(g.wb);
  tickWbIntro(g, false, play, 0);
  assert.deepEqual(snd, [], '가림막이 있는 동안은 시작하지 않는다');
  tickWbIntro(g, true, play, 10);
  assert.deepEqual(snd, ['wbRise']);
  const r = wbIntroRise('dragon', 10 + (I.rise[0] + I.rise[1]) / 2);
  assert.ok(r > 0 && r < 1);
  tickWbIntro(g, true, play, 10 + I.roar + 0.01);
  assert.deepEqual(snd, ['wbRise', 'wbRoar']);
  assert.ok(g.shake > 0);
  assert.equal(JSON.stringify(g.wb), before, '판정 상태는 그대로');
  assert.equal(wbIntroRise('dragon', 10 + I.rise[1] + 0.1), null);
});

test('같은 보스에 다시 들어오면 소리 없이 이름표만, 공격 준비 중이면 올라오는 장면을 건너뛴다', () => {
  resetWbIntro(); const snd = [], play = (n) => snd.push(n);
  const g = world(C.map, boss('k'));
  tickWbIntro(g, true, play, 0);
  g.heroes[0].map = 'plaza'; tickWbIntro(g, true, play, 1);
  g.heroes[0].map = C.map; tickWbIntro(g, true, play, 2);
  assert.deepEqual(snd, ['wbRise'], '두 번째는 소리 없음');
  assert.equal(wbIntroRise('dragon', 2.5), null);
  resetWbIntro();
  const h = world(C.map, boss('z', { attack: { kind: 'cone' } }));
  tickWbIntro(h, true, play, 0);
  assert.equal(wbIntroRise('dragon', 0.5), null, '공격 준비 중에는 올라오지 않는다');
});
