// 월드보스 등장 연출 — 화면에만 흐르는 상태가 한 번씩만 켜지고, 공격 · 퇴장 · 처치에 곧바로 정리되며, 세계(판정 상태)는 건드리지 않는지 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import { tickWbIntro, wbIntroScene, wbIntroState, wbInCombat, wbBarHidden, resetWbIntro } from '../src/game/worldBossIntro.js';
import { WB_INTRO as I, WB_INTRO_SCENE, WB_INTRO_LINE } from '../src/game/worldBossIntroData.js';
import { WORLD_BOSS as C, WORLD_BOSSES } from '../src/game/worldBossData.js';

const world = (map, active, others = []) => ({ mySeat: 0, heroes: [{ map, x: 900, y: 950, loaded: true }, ...others], wb: { active }, shake: 0 });
const boss = (key, extra = {}) => ({ id: 'dragon', key, phase: 'fight', attack: null, stun: 0, pools: [], hp: 100, max: 100, x: 1250, y: 1100, ...extra });
const rec = () => { const snd = []; return { snd, play: (n) => snd.push(n) }; };

test('보스 5종 모두 전용 장면 · 소리 · 문구가 있고, 4초 흐름(어둠 0.5 → 고유 효과 → 문구 1.5 → 이름 2.5 → 사라짐 3.3)을 따른다', () => {
  const sounds = new Set();
  for (const B of WORLD_BOSSES) {
    const sc = WB_INTRO_SCENE[B.id];
    assert.ok(sc, `${B.id} 장면`);
    assert.ok(WB_INTRO_LINE[B.id], `${B.id} 소개`);
    assert.ok(sc.peak >= I.beat[1] && sc.peak <= I.life, `${B.id} 강한 순간`);
    assert.ok(sc.cues.some(([t]) => t === sc.peak), `${B.id} 강조음은 강한 순간에`);
    sounds.add(sc.cues[0][1]);
    assert.ok(sc.cry && sc.cry.length <= 24, `${B.id} 등장 문구`);
    assert.ok(sc.shake <= 1.0, `${B.id} 흔들림은 과하지 않게`);
    assert.ok(Math.abs(I.lead + sc.peak - I.cryAt) < 1e-9, `${B.id} 문구는 가장 강한 순간에`);
  }
  assert.equal(sounds.size, WORLD_BOSSES.length, '첫 소리가 보스마다 다르다');
  assert.equal(WB_INTRO_SCENE.void.shake, 0, '공허는 조용하게 — 흔들림 없음');
  assert.deepEqual([I.lead, I.cryAt, I.nameAt, I.fadeAt, I.total], [0.5, 1.5, 2.5, 3.3, 4.0]);
  assert.equal(I.cry, '#E53935');
});

test('접속 때 이미 있던 보스는 예고하지 않고, 새로 나온 보스만 뿔피리를 분다', () => {
  resetWbIntro(); const { snd, play } = rec();
  const g = world('plaza', boss('a'));
  tickWbIntro(g, true, play, 0);
  assert.deepEqual(snd, []);
  g.wb.active = boss('b'); tickWbIntro(g, true, play, 1);
  assert.deepEqual(snd, ['wbHorn']);
  tickWbIntro(g, true, play, 2);
  assert.deepEqual(snd, ['wbHorn'], '같은 출현은 한 번만');
});

test('불러오기 중에는 기다리고, 걷히면 보스 장면 · 소리가 때맞춰 나온다. 체력바는 3.3초에 나온다', () => {
  for (const B of WORLD_BOSSES) {
    resetWbIntro(); const { snd, play } = rec();
    const g = world(C.map, boss('k', { id: B.id }));
    const before = JSON.stringify(g.wb);
    tickWbIntro(g, false, play, 0);
    assert.equal(wbIntroState(), null, '가림막이 있는 동안은 시작하지 않는다');
    tickWbIntro(g, true, play, 10);
    const sc = WB_INTRO_SCENE[B.id];
    assert.equal(wbIntroScene(B.id, 10.5).id, B.id);
    assert.equal(wbIntroState().tagAt, Infinity, '전체 연출은 왼쪽 아래 이름표 대신 가운데 이름');
    assert.ok(wbBarHidden(10 + I.fadeAt - 0.05) && !wbBarHidden(10 + I.fadeAt + 0.01), '체력바는 문구가 사라질 때');
    tickWbIntro(g, true, play, 10 + I.lead - 0.01);
    assert.deepEqual(snd, ['wbDuck', ...sc.cues.filter(c => c[0] < 0).map(c => c[1])], '첫 0.5초는 다른 소리만 작아진다');
    for (let t = 10; t <= 10 + I.lead + I.life + 0.01; t += 0.05) tickWbIntro(g, true, play, t);
    assert.deepEqual(snd, ['wbDuck', ...sc.cues.map(c => c[1])], `${B.id} 소리 순서`);
    if (sc.shake) assert.ok(g.shake > 0);
    assert.equal(JSON.stringify(g.wb), before, '판정 상태는 그대로');
    tickWbIntro(g, true, play, 10 + I.lead + I.life + I.trail + 0.01);
    assert.equal(wbIntroScene(B.id, 10 + I.lead + I.life + I.trail + 0.01), null, '장면이 끝나면 몸 · 땅 효과는 사라진다');
    assert.ok(wbIntroState().big, '문구는 더 남는다');
    tickWbIntro(g, true, play, 10 + I.fadeAt + 0.01);
    assert.equal(snd.at(-1), 'wbUnduck', '문구가 사라지기 시작하면 다른 소리를 되돌린다');
    tickWbIntro(g, true, play, 10 + I.total + 0.01);
    assert.equal(wbIntroState(), null, '4초 뒤에는 모두 사라진다');
  }
});

test('같은 출현에 다시 들어오면 소리 없이 이름표만, 새 출현에는 전체 연출을 다시 본다', () => {
  resetWbIntro(); const { snd, play } = rec();
  const g = world(C.map, boss('k'));
  tickWbIntro(g, true, play, 0);
  g.heroes[0].map = 'plaza'; tickWbIntro(g, true, play, 0.3);
  assert.equal(wbIntroState(), null, '나가면 곧바로 지운다');
  assert.ok(snd.includes('wbStop'), '나가면 울리던 연출 소리도 멈춘다');
  snd.length = 0;
  g.heroes[0].map = C.map; tickWbIntro(g, true, play, 5);
  assert.deepEqual(snd, [], '두 번째는 소리 없음');
  assert.equal(wbIntroScene('dragon', 5.5), null);
  assert.equal(wbIntroState().tagAt, 5, '이름표는 곧바로');
  // 새 출현
  g.heroes[0].map = 'plaza'; tickWbIntro(g, true, play, 10);
  g.wb.active = boss('k2'); tickWbIntro(g, true, play, 11);
  g.heroes[0].map = C.map; tickWbIntro(g, true, play, 12);
  assert.ok(wbIntroScene('dragon', 12.5), '새 출현에는 전체 연출');
});

test('싸우는 중에 들어오면 이름표만 — 공격 준비 · 기절 · 웅덩이 · 다른 사람이 깎은 체력', () => {
  const me = { map: C.map, loaded: true }, other = { map: C.map, loaded: true };
  const g = { heroes: [me, other] };
  assert.equal(wbInCombat(g, boss('a'), me), false, '다른 사람이 있어도 체력이 그대로면 아직 시작 전');
  assert.equal(wbInCombat(g, boss('a', { hp: 90 }), me), true);
  assert.equal(wbInCombat({ heroes: [me] }, boss('a', { hp: 90 }), me), false, '혼자면 남은 체력만으로 싸우는 중이 아니다');
  assert.equal(wbInCombat({ heroes: [me] }, boss('a', { attack: { kind: 'cone' } }), me), true);
  assert.equal(wbInCombat({ heroes: [me] }, boss('a', { stun: 2 }), me), true);
  assert.equal(wbInCombat({ heroes: [me] }, boss('a', { pools: [{ r: 80 }] }), me), true);

  resetWbIntro(); const { snd, play } = rec();
  const h = world(C.map, boss('z', { attack: { kind: 'cone' } }));
  tickWbIntro(h, true, play, 0);
  assert.equal(wbIntroScene('dragon', 0.5), null, '공격 준비 중에는 몸 연출이 없다');
  assert.deepEqual(snd, []);
  assert.equal(wbIntroState().tagAt, 0, '이름표만 곧바로');

  resetWbIntro();
  const f = world(C.map, boss('y', { hp: 50 }), [{ map: C.map, loaded: true }]);
  tickWbIntro(f, true, play, 0);
  assert.equal(wbIntroScene('dragon', 0.5), null, '다른 사람이 싸우는 중이면 이름표만');
});

test('연출 중 공격 예고가 들어오면 몸 · 땅 효과 · 남은 강조음을 곧바로 끊고, 공격이 끝나도 다시 시작하지 않는다', () => {
  resetWbIntro(); const { snd, play } = rec();
  const g = world(C.map, boss('k', { id: 'machine' }));
  tickWbIntro(g, true, play, 0);
  tickWbIntro(g, true, play, 1.0);
  assert.ok(wbIntroScene('machine', 1.0));
  g.wb.active.attack = { kind: 'cross', t: 2, life: 2 };
  tickWbIntro(g, true, play, 1.05);
  assert.equal(wbIntroScene('machine', 1.05), null, '공격이 오면 등장 그림이 곧바로 사라진다');
  assert.ok(snd.includes('wbStop'));
  assert.ok(!snd.includes('wbMachineBoot'), '예약된 강조음은 나지 않는다');
  assert.equal(wbIntroState().tagAt, 1.05, '이름표만 남는다');
  assert.equal(wbBarHidden(1.1), false, '체력바도 곧바로 보인다');
  assert.equal(wbIntroState().big, false, '붉은 문구 · 화면 효과도 끊는다');
  g.wb.active.attack = null;
  for (let t = 1.1; t < 4; t += 0.05) tickWbIntro(g, true, play, t);
  assert.ok(!snd.includes('wbMachineBoot'), '공격이 끝나도 다시 시작하지 않는다');
  assert.equal(wbIntroScene('machine', 1.5), null);
  // 기절(합동 공격 성공)도 실제 상태라 끊는다
  resetWbIntro();
  const s = world(C.map, boss('q'));
  tickWbIntro(s, true, play, 0); s.wb.active.stun = 3; tickWbIntro(s, true, play, 0.2);
  assert.equal(wbIntroScene('dragon', 0.2), null);
  // 본 연출이 끝난 뒤 문구만 남은 때 공격이 와도 문구를 지운다
  resetWbIntro();
  const w = world(C.map, boss('w'));
  for (let t = 0; t <= I.nameAt + 0.05; t += 0.05) tickWbIntro(w, true, play, t);
  assert.equal(wbIntroState().big, true);
  w.wb.active.attack = { kind: 'cone' }; tickWbIntro(w, true, play, I.nameAt + 0.1);
  assert.equal(wbIntroState().big, false, '문구가 떠 있을 때 공격이 와도 곧바로 지운다');
});

test('처치 · 다른 출현 · 보스 없는 성역에서는 연출을 정리하거나 틀지 않는다', () => {
  resetWbIntro(); const { snd, play } = rec();
  const g = world(C.map, boss('k'));
  tickWbIntro(g, true, play, 0);
  g.wb.active.phase = 'clear'; tickWbIntro(g, true, play, 0.3);
  assert.equal(wbIntroState(), null, '처치되면 곧바로 지운다');
  assert.ok(snd.includes('wbStop'));

  resetWbIntro();
  const h = world(C.map, boss('k'));
  tickWbIntro(h, true, play, 0);
  h.wb.active = boss('k9', { id: 'serpent' }); tickWbIntro(h, true, play, 0.3);
  assert.equal(wbIntroState(), null, '출현이 바뀌면 지운다');

  resetWbIntro();
  const e = world(C.map, null);
  tickWbIntro(e, true, play, 0);
  e.wb.active = boss('late'); tickWbIntro(e, true, play, 0.5);
  assert.equal(wbIntroState(), null, '보스 없는 성역에 있다가 뒤늦게 켜지지 않는다');
});
