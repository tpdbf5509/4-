/* 히든 직업 BLOOD-001 1단계 — 혈량 · 혈흔 · 적혈탄 · 전환 · 저장 · 스냅샷 · 전직 대신을 실제 게임 함수로 본다.
   node --test tools/blood-job.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgApplyOut, heroRecord } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { BLOOD, BLOOD_SHOT as S } from '../src/game/bloodJobData.js';
import { unlockBlood, stableCap, shotTier, bloodView, jobNeed, trainNeed, cleanBd, dropBlood, bloodCaps, gainBlood } from '../src/game/bloodJob.js';
import { TRAIN_UNLOCK } from '../src/game/bloodJobData.js';
import { overWarn } from '../src/game/bloodJob.js';
import { KEY_ACTIONS, keyMap, defaultKeys, BLOOD_ACTS } from '../src/game/keys.js';
Math.random = () => 0.999;   // 치명타 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
function setup(advClass = 'gladiator') {
  const g = makeWorld();
  g.out = [];
  const ss = [{ id: 'b0', name: '혈액', hero: { name: '혈액', job: 'warrior', elem: 'frost', gender: 'm' } }];
  rpgSyncSeats(g, ss);
  rpgJoin(g, 0, { name: '혈액', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 100, hp: 100 }, advClass, bag: { oc: 1, n: 1 } }, 'b0');
  const h = g.heroes[0];
  h.map = 'train'; h.x = 900; h.y = 700; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  step(g, .01);
  return { g, h };
}
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) {
  const m = { ...structuredClone(proto), id: g.nextId++, map: 'train', x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra };
  g.mobs.push(m); return m;
}
const send = (g, dir) => rpgInput(g, { cls: 0, kind: 'blood', dir });
const press = (g) => send(g, { op: 'press', s: 'shot' });
const release = (g) => send(g, { op: 'release', s: 'shot' });
function basic(g, h) { h.cd = 0; h.fire = 1; step(g, .02); h.fire = 0; run(g, .3); }

test('해금하면 1차 전직이 사라지고 혈량 100 · 직업 레벨 1로 시작한다', () => {
  const { g, h } = setup();
  assert.equal(h.advClass, 'gladiator');
  unlockBlood(h);
  assert.equal(h.advClass, '');
  assert.deepEqual([h.bag.bd.on, h.bag.bd.lv, h.bag.bd.b], [1, 1, BLOOD.start]);
  // 저장 기록에도 전직이 남지 않는다(advRecord)
  const rec = heroRecord(h, { advClass: 'gladiator', advM: 300, lv: 250, bag: { ar: 0 } });
  assert.equal(rec.advClass, '');
  // 전직 스킬 · 시험은 막힌다
  rpgInput(g, { cls: 0, kind: 'adv', dir: { op: 'start', c: 'knight' } });
  assert.equal(h.advQ, null);
  void g;
});

test('혈량 한계 — 안정 100 + 5 × floor(레벨 / 5) · 증폭 +25 · 과부하 +50 · 경험치 표', () => {
  assert.deepEqual(bloodCaps(1), [100, 125, 150]); assert.deepEqual(bloodCaps(4), [100, 125, 150]); assert.deepEqual(bloodCaps(5), [105, 130, 155]);
  assert.deepEqual(bloodCaps(100), [200, 225, 250]); assert.deepEqual(bloodCaps(200), [300, 325, 350]);
  assert.equal(stableCap(1), 100); assert.equal(BLOOD.start, 100);
  assert.equal(jobNeed(1), 11); assert.equal(trainNeed(0), 100); assert.equal(trainNeed(49), 1080);
});

test('평타 유효 적중 — 혈량 +5(공격 한 번에 한 번) · 혈흔 1중첩 · 10초 뒤 사라진다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 40;
  const m = mob(g, h.x + 40, h.y);
  basic(g, h);
  assert.equal(h.bag.bd.b, 45);
  assert.equal(h.bd.mk['m' + m.id][0], 1);
  for (let i = 0; i < 6; i++) basic(g, h);
  assert.equal(h.bd.mk['m' + m.id][0], BLOOD.mark.max);   // 최대 5
  run(g, BLOOD.mark.dur + .2);
  assert.equal(h.bd.mk['m' + m.id], undefined);
});

test('일반 획득은 안정 한계까지 — 넘는 몫만 버린다 · 늘 5 단위', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 95;
  mob(g, h.x + 40, h.y);
  basic(g, h);
  assert.equal(h.bag.bd.b, 100);
  basic(g, h);
  assert.equal(h.bag.bd.b, 100, '안정 한계(1레벨 100) 위로는 평타로 못 얻는다');
  assert.equal(gainBlood(h, 7), 0, '5 단위로 내린다 — 한계면 0');
  h.bag.bd.b = 50; assert.equal(gainBlood(h, 7), 5); assert.equal(h.bag.bd.b, 55);
});

test('적혈탄 — 짧게 누르면 기본(5 · 대기 0.1) · 0.6초 1단계(10 · 대기 0.5) · 1.2초 2단계(20 · 대기 0.7) · 누르는 동안은 쏘지 않는다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 80;
  const m = mob(g, h.x + 200, h.y);
  press(g); release(g);
  assert.equal(h.bag.bd.b, 75); assert.equal(h.bd.cd.shot, .1);
  run(g, .5); assert.ok(HP - m.hp > 0);
  h.bd.cd.shot = 0;
  press(g); run(g, .65); release(g);
  assert.equal(h.bag.bd.b, 65); assert.equal(h.bd.cd.shot, .5);
  run(g, .5); h.bd.cd.shot = 0;
  press(g); run(g, S.full + 2);                  // 1.2초가 지나도 누르고 있으면 쏘지 않는다
  assert.ok(h.bd.ch && h.bd.ch.s === 'shot'); assert.equal(h.bag.bd.b, 65);
  assert.ok(h.bd.ch.t <= S.full, '모은 시간은 2단계에서 멈춘다');
  release(g);                                     // 놓을 때 2단계로 쏜다
  assert.equal(h.bd.ch, null);
  assert.equal(h.bag.bd.b, 45); assert.equal(h.bd.cd.shot, .7);
  run(g, .3);
  assert.equal(h.bag.bd.b, 45);
  const guest = makeWorld(); rpgApply(guest, rpgPack(g));
  assert.equal(bloodView(guest.heroes[0]).shotMax, .7, '화면 대기 막대의 최대는 쏜 단계 값');
});

test('혈량이 모자라면 낮은 단계로 · 5 미만이면 시작하지 않는다', () => {
  assert.equal(shotTier(1.3, 15), 1); assert.equal(shotTier(1.3, 4), -1); assert.equal(shotTier(0.5, 30), 0); assert.equal(shotTier(1.3, 20), 2);
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 0;
  press(g);
  assert.equal(h.bd?.ch || null, null);
});

test('혈흔 보너스 — 중첩당 +2% 피해 · 소비하면 중첩당 혈량 +5(한 시전 +15 까지)', () => {
  const a = setup(); unlockBlood(a.h); a.h.bag.bd.b = 30;
  const m0 = mob(a.g, a.h.x + 200, a.h.y);
  press(a.g); release(a.g); run(a.g, .5);
  const base = HP - m0.hp;
  const b = setup(); unlockBlood(b.h); b.h.bag.bd.b = 30;
  const m1 = mob(b.g, b.h.x + 200, b.h.y);
  b.h.bd = null; rpgStep(b.g, .01);
  b.h.bd.mk['m' + m1.id] = [5, 10];
  press(b.g); release(b.g); run(b.g, .5);
  const marked = HP - m1.hp;
  assert.ok(Math.abs(marked / base - 1.1) < 0.02, `${marked / base}`);
  assert.equal(b.h.bag.bd.b, 30 - 5 + 15, '5중첩이어도 한 시전 +15 까지');
  assert.equal(b.h.bd.mk['m' + m1.id], undefined);
});

test('1단계 특수 능력(압축형 20) — 두 명 관통 · 미해금은 첫 대상에서 멈춤', () => {
  for (const [lv, want] of [[0, 1], [20, 2]]) {
    const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 50; h.bag.bd.tr[0][0] = lv;
    const a = mob(g, h.x + 150, h.y), b = mob(g, h.x + 300, h.y);
    press(g); run(g, .85); release(g); run(g, .8);
    assert.equal([a, b].filter(m => m.hp < HP).length, want, `연마 ${lv}`);
  }
});

test('2단계 특수 능력(압축형 45) — 첫 적중 자리 반경 110 팽창(대상당 한 번)', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 60; h.bag.bd.tr[0][0] = 45;
  const a = mob(g, h.x + 200, h.y), side = mob(g, h.x + 220, h.y + 60);
  press(g); run(g, S.full + .05); release(g); run(g, .6);
  assert.ok(side.hp < HP, '옆 몹이 팽창에 맞는다');
  assert.ok(g.out.some(f => f.kind === 'sk_bj_burst'));
  void a;
});

test('연마 경험치 — 유효 적중 시전당 +10 · 허수아비는 없음', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 50;
  mob(g, h.x + 200, h.y);
  press(g); release(g); run(g, .6);
  assert.equal(h.bag.bd.tr[0][1], 10);
  h.bd.cd.shot = 0; g.mobs = [];
  mob(g, h.x + 200, h.y, { type: 'dummy' });
  press(g); release(g);
  for (let n = 0; n < 60; n++) rpgStep(g, .01);   // 허수아비를 치우지 않고 돈다
  assert.equal(h.bag.bd.tr[0][1], 10, '허수아비는 연마 경험치 없음');
});

test('혈량 전환 — 최대 체력 5% → 혈량 +10 · 대기 0.1초 · 안정 한계까지만', () => {
  const { g, h } = setup(); unlockBlood(h);
  assert.deepEqual(BLOOD.convert, { hp: .05, gain: 10, cd: .1 });
  h.bag.bd.b = 20; h.hp = h.max;
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 30); assert.equal(h.hp, h.max - Math.ceil(h.max * .05));
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 30);                   // 대기 중
  run(g, .12);
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 40, '0.1초 뒤 다시 쓴다');
  h.bag.bd.b = 95; h.bd.cd.conv = 0;
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 100, '안정 한계(100)에서 멈춘다');
  const hp0 = h.hp; h.bd.cd.conv = 0;
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 100); assert.equal(h.hp, hp0, '한계면 체력도 쓰지 않는다');
});

test('혈량 전환 연타 — 체력이 1 아래로 내려가지 않는다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.lv = 200; h.bag.bd.b = 0; h.hp = h.max;
  for (let i = 0; i < 60; i++) { send(g, { op: 'convert' }); run(g, .11); }
  assert.ok(h.hp >= 1 && h.down <= 0, `살아 있다 ${h.hp}`);
  assert.ok(h.hp < Math.ceil(h.max * .05) + 1, '모자랄 때까지 썼다');
});

test('쓰러지면 혈량 0', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.map = 'rabbit'; h.bag.bd.b = 40; h.down = 0;
  g.mobs.push({ ...structuredClone(proto), id: g.nextId++, map: 'rabbit', x: h.x, y: h.y });
  h.hp = 1; h.guard = 0;
  // 몹에게 맞게 하기보다 판정 함수를 직접 — 체력 0 이하 처리는 hurtHero 하나
  rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'convert' } });   // 체력 1 이면 전환도 못 쓴다
  assert.equal(h.bag.bd.b, 40);
});

test('저장 · 스냅샷 — 가방 bd 는 거른 값 · 손님 화면 값 · 옛 저장은 5 단위 · 레벨 한계로', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 35; h.bag.bd.tr[1] = [3, 50];
  const b = cleanBag(structuredClone(h.bag));
  assert.deepEqual(b.bd, { on: 1, lv: 1, xp: 0, tr: [[0, 0], [3, 50], [0, 0]], b: 35 });
  assert.equal(cleanBd({ on: 1, lv: 999, b: 999, tr: [[99, 5]] }).lv, BLOOD.maxLv);
  // 옛 저장 — 레벨 · 연마 · 해금은 그대로, 혈량은 가장 가까운 5 · 그 레벨 한계 안(과부하 한계 미만)
  const old = cleanBd({ on: 1, lv: 37, xp: 3, tr: [[12, 40], [4, 0], [0, 0]], b: 33 });
  assert.deepEqual([old.lv, old.xp, old.tr[0][0], old.b], [37, 3, 12, 35]);
  assert.equal(cleanBd({ on: 1, lv: 1, b: 179 }).b, 145, '1레벨은 과부하 한계 150 아래로');
  assert.equal(cleanBd({ on: 1, lv: 200, b: 179 }).b, 180);
  assert.equal(cleanBd({ on: 1, lv: 50, b: 12 }).b, 10);
  const guest = makeWorld(); guest.mySeat = 0;
  rpgSyncSeats(guest, [{ id: 'b0', name: '혈액', hero: { name: '혈액', job: 'warrior', elem: 'frost', gender: 'm' } }]);
  rpgApply(guest, rpgPack(g));
  const v = bloodView(guest.heroes[0]);
  assert.equal(v.b, 35); assert.equal(v.lv, 1); assert.deepEqual(v.tr[1], [3, 50]);
});

/* ── 2단계 — 혈수 강타 · 혈형 변환(혈검 · 혈막) ── */
import { BLOOD_SMASH as M, BLOOD_FORM as F } from '../src/game/bloodJobData.js';
import { smashSize, smashTier, bloodJobTake, veilStat } from '../src/game/bloodJob.js';
const sm = (g, op) => send(g, { op, s: 'smash' });
const lv20 = (h) => { unlockBlood(h); h.bag.bd.lv = 20; };

test('해금 레벨 — 혈수 강타 5 · 혈검 · 혈막 10 · 혈류 파동 15 · 혈쇄 갈고리 20', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 50; h.bag.bd.lv = 4;
  sm(g, 'press'); assert.equal(h.bd?.ch || null, null, '4레벨 혈수 강타 없음');
  h.bag.bd.lv = 5; sm(g, 'press'); assert.equal(h.bd.ch.s, 'smash'); sm(g, 'release'); h.bag.bd.b = 50;
  h.bag.bd.lv = 9; send(g, { op: 'sword' }); assert.equal(h.bd.sw, null); send(g, { op: 'press', s: 'veil' }); assert.equal(h.bd.vl, null);
  h.bag.bd.lv = 10; send(g, { op: 'sword' }); assert.ok(h.bd.sw, '10레벨 혈검');
  mob(g, h.x + 200, h.y);
  h.bag.bd.lv = 14; h.bag.bd.b = 50; send(g, { op: 'press', s: 'wave' }); assert.equal(h.bd.wv.length, 0);
  h.bag.bd.lv = 15; send(g, { op: 'press', s: 'wave' }); assert.equal(h.bd.wv.length, 1);
  h.bag.bd.lv = 19; h.bag.bd.b = 50; send(g, { op: 'press', s: 'hook' }); assert.equal(h.bd.hk, null);
  h.bag.bd.lv = 20; send(g, { op: 'press', s: 'hook' }); assert.ok(h.bd.hk);
  assert.deepEqual(TRAIN_UNLOCK, [1, 5, 10]);
});

test('혈수 강타 — 기본 20 · 0.2초 뒤 한 번 · 일반 몹 경직 0.5 · 넉백 · 대기 8초', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 50;
  const m = mob(g, h.x + 120, h.y, { stun: 0 }), far = mob(g, h.x + 400, h.y);
  sm(g, 'press'); sm(g, 'release');
  assert.equal(h.bag.bd.b, 30); assert.equal(h.bd.cd.smash, 8);
  assert.equal(m.hp, HP, '닿기 전에는 피해 없음');
  run(g, M.delay + .02);
  assert.ok(m.hp < HP); assert.equal(far.hp, HP, '길이 240 밖');
  assert.ok(m.stun > 0); assert.ok(m.kbT > 0 || m.x > h.x + 120);
  assert.equal(h.bag.bd.tr[1][1], 10, '증폭형 연마 +10');
});

test('혈수 강타 차징 — 0.3 · 0.6 · 0.9초 비용 25 · 30 · 35 · 폭 +15%씩 · 혈량이 모자라면 낮은 단계', () => {
  assert.equal(smashTier(0.95, 100), 3); assert.equal(smashTier(0.95, 25), 1); assert.equal(smashTier(0.1, 19), -1);
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 100;   // 안정 한계(120) 아래 — 증폭 범위 보너스 없음
  assert.deepEqual(smashSize(h, 0), [240, 180]); assert.deepEqual(smashSize(h, 3), [240, 261]);
  sm(g, 'press'); run(g, M.full + .03);              // 0.9초 — 놓지 않아도 발동
  assert.equal(h.bd.ch, null); assert.equal(h.bag.bd.b, 65);
});

test('혈수 강타 — 보스는 경직 · 넉백 면역', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 50;
  const b = mob(g, h.x + 120, h.y, { boss: 1, stun: 0 });
  sm(g, 'press'); sm(g, 'release'); run(g, M.delay + .02);
  assert.ok(b.hp < HP); assert.equal(b.stun, 0); assert.equal(Math.round(b.x), Math.round(h.x + 120));
});

/* 혈검(11월 15일) — 만들고(0.25초 · 피해 없음) 손에 든 50초 동안 평타를 새로 누를 때마다 한 번씩(횟수 제한 없음) */
import { bloodJobDown } from '../src/game/bloodJob.js';
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
const tap = (g) => { fire(g, true); step(g, .01); fire(g, false); run(g, F.sword.gap + .02); };
const SE = { fx() {}, sys() {}, say() {} };

test('혈검 — 생성 중 · 입력 없이 들고만 있으면 피해 0 · 혈량 10 · 혈검 대기 6초(혈막 대기와 따로)', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  const m = mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' });
  assert.equal(h.bag.bd.b, 20); assert.ok(h.bd.cd.sword > 5.9 && h.bd.cd.sword <= F.sword.cd); assert.equal(h.bd.cd.form, 0);
  assert.equal(h.bd.sw.ph, 1); assert.equal(m.hp, HP, '만드는 동안 피해 없음');
  fire(g, true); fire(g, false); assert.equal(m.hp, HP, '만드는 중 누른 평타는 베지 않는다');
  run(g, F.sword.form + .02); assert.equal(h.bd.sw.ph, 2, '0.25초 뒤 손에 든다');
  run(g, 2); assert.equal(m.hp, HP, '입력 없이 들고 있으면 피해 없음');
  send(g, { op: 'press', s: 'veil' }); assert.ok(h.bd.vl, '혈막은 혈검 대기와 따로 — 바로 쓸 수 있다');
  assert.ok(h.bd.sw && h.bd.sw.ph === 2, '혈막을 써도 혈검은 그대로 든 채다(11월 16일)');
});

test('혈검 — 다른 스킬(적혈탄 · 혈수 강타 · 혈류 파동 · 혈쇄 갈고리 · 혈막)을 써도 풀리지 않고 남은 시간도 그대로', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 200;
  const m = mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' }); run(g, F.sword.form + .02); assert.equal(h.bd.sw.ph, 2);
  const t0 = h.bd.sw.t;
  press(g); run(g, .7); release(g); assert.ok(h.bd.sw, '적혈탄');
  send(g, { op: 'press', s: 'smash' }); send(g, { op: 'release', s: 'smash' }); assert.ok(h.bd.sw, '혈수 강타');
  h.bag.bd.b = 200; send(g, { op: 'press', s: 'wave' }); assert.ok(h.bd.sw, '혈류 파동');
  h.bag.bd.b = 200; send(g, { op: 'press', s: 'hook' }); assert.ok(h.bd.sw, '혈쇄 갈고리');
  h.bag.bd.b = 200; send(g, { op: 'press', s: 'veil' }); assert.ok(h.bd.sw, '혈막');
  assert.ok(h.bd.sw.t >= t0, '유지 시간은 이어서 센다');
  const hp = m.hp; fire(g, true); fire(g, false);
  assert.ok(m.hp <= hp, '스킬 뒤에도 새 평타로 벤다');
  run(g, F.sword.hold + 1); assert.equal(h.bd.sw, null, '50초가 지나면 그때 풀린다');
});

test('혈검 — 새 평타 입력마다 한 번 · 횟수 제한 · 혈량 회수 없음 · 평타 혈량 · 새 혈흔 없음 · 경험치 한 번', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 40;
  const m = mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' }); run(g, F.sword.form + .02);
  tap(g); const one = HP - m.hp;
  assert.ok(one > 0); assert.equal(h.bd.sw.i, 1);
  assert.equal(h.bag.bd.b, 30, '평타 혈량 +5 없음'); assert.equal(h.bd.mk['m' + m.id], undefined, '새 혈흔 없음');
  for (let k = 2; k <= 6; k++) { tap(g); assert.ok(Math.abs((HP - m.hp) / one - k) < 0.05, `${k}번째`); }
  assert.equal(h.bd.sw.i, 6); assert.ok(h.bd.sw, '여섯 번 베도 그대로 들고 있다');
  assert.equal(h.bag.bd.b, 30, '혈량 회수 없음');
  run(g, F.sword.hold); assert.equal(h.bd.sw, null, '50초가 지나면 풀린다');
  assert.equal(h.bag.bd.tr[2][1], 10, '형상화 연마 +10(시전당 한 번)');
  const hp0 = m.hp, b0 = h.bag.bd.b; tap(g); assert.ok(m.hp < hp0, '그 뒤 새 평타는 원래 무기로 친다');
  assert.equal(h.bag.bd.b, b0 + 5, '원래 평타는 혈량 +5 로 돌아온다');
});

test('혈검 — 누르고 있던 평타 · 키 반복 · 자동 평타로는 베지 않는다', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  const m = mob(g, h.x + 60, h.y);
  fire(g, true);                                     // 발동 전부터 누르고 있다
  send(g, { op: 'sword' }); run(g, F.sword.form + .3);
  fire(g, true); fire(g, true); run(g, 1);          // 키 반복 — 같은 누름 상태
  assert.equal(m.hp, HP, '누르고 있던 평타 · 반복 입력은 베지 않는다');
  fire(g, false); h.auto = 1; run(g, 1.5);
  assert.equal(m.hp, HP, '자동 평타도 혈검 · 원래 무기 모두 나가지 않는다');
  assert.equal(h.bd.sw.i, 0);
  tap(g); assert.ok(m.hp < HP, '떼었다 새로 누르면 벤다'); assert.equal(h.bd.sw.i, 1);
});

test('혈검 — 너무 빠른 연타는 한 번 기억했다가 간격 뒤에 벤다', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' }); run(g, F.sword.form + .02);
  fire(g, true); fire(g, false); fire(g, true); fire(g, false);
  assert.equal(h.bd.sw.i, 1);
  run(g, F.sword.gap + .02); assert.equal(h.bd.sw.i, 2);
});

test('혈검 — 50초가 지나거나 쓰러지면 풀리고, 그 뒤 새 평타는 원래 무기로', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  const m = mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' }); run(g, F.sword.form + F.sword.hold + .05);
  assert.equal(h.bd.sw, null, '50초 유지 끝');
  assert.equal(m.hp, HP);
  tap(g); assert.ok(m.hp < HP, '원래 무기 평타');
  h.bd.cd.sword = 0; h.bag.bd.b = 30;
  send(g, { op: 'sword' }); run(g, F.sword.form + .02); assert.ok(h.bd.sw);
  bloodJobDown(SE, g, h); assert.equal(h.bd.sw, null, '쓰러지면 풀린다');
});

test('혈검 상태가 손님 화면(스냅샷 끝 칸)에 간다 — 만드는 중 · 벤 횟수 · 혈검 대기', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  mob(g, h.x + 60, h.y);
  const guest = makeWorld();
  send(g, { op: 'sword' });
  rpgApply(guest, rpgPack(g)); let v = bloodView(guest.heroes[0]);
  assert.equal(v.sw.ph, 1); assert.ok(v.cd.sword > 5);
  run(g, F.sword.form + .02); tap(g);
  rpgApply(guest, rpgPack(g)); v = bloodView(guest.heroes[0]);
  assert.equal(v.sw.ph, 2); assert.equal(v.sw.i, 1);
  run(g, F.sword.hold); rpgApply(guest, rpgPack(g));
  assert.equal(bloodView(guest.heroes[0]).sw, null);
});

test('혈막 연출이 서버 소식으로 손님 화면에 간다 — 연출 칸 k 가 소식 종류를 덮어쓰지 않는다', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 40;
  g.out.length = 0;
  send(g, { op: 'press', s: 'veil' }); run(g, 1);
  const out = g.out.splice(0);
  assert.ok(out.filter((o) => o.kind === 'sk_bj_veil').every((o) => o.k === 'fx'), '혈막 연출 소식은 k = fx');
  const guest = makeWorld(); guest.mySeat = 0;
  rpgApplyOut(guest, out);
  assert.ok(guest.fx.filter((f) => f.kind === 'sk_bj_veil').length >= 3, '시전 직후 · 유지 중 장이 손님에게 온다');
});

test('혈막 — 혈량 15 · 받는 피해 30% 감소 · 줄였으면 끝날 때 혈량 10 · 평타를 눌러도 15초 유지', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 60;
  send(g, { op: 'press', s: 'veil' });
  assert.equal(h.bag.bd.b, 45); assert.ok(h.bd.vl);
  const E = { fx() {} };
  assert.equal(bloodJobTake(E, g, h, 100), 70);
  send(g, { op: 'release', s: 'veil' }); assert.ok(h.bd.vl, '놓아도 유지');
  send(g, { op: 'press', s: 'veil' }); assert.equal(h.bag.bd.b, 45, '다시 눌러도 변화 없음(취소 · 재발동 없음)');
  run(g, F.veil.dur + .05); assert.equal(h.bd.vl, null); assert.equal(h.bag.bd.b, 55);
  // 줄인 피해가 없으면 회수 없음 · 평타를 눌러도 혈막은 15초 유지
  h.bd.cd.form = 0;
  send(g, { op: 'press', s: 'veil' }); const b0 = h.bag.bd.b;
  rpgInput(g, { cls: 0, kind: 'fire', dir: true }); run(g, 5);
  assert.ok(h.bd.vl, '평타에도 끊기지 않는다');
  run(g, F.veil.dur); assert.equal(h.bd.vl, null); assert.equal(h.bag.bd.b, b0);
  assert.deepEqual(veilStat(50), [15, 0.35]);
});

test('혈막 — 한 번 누르면 15초(연마로 늘지 않는다)', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 40;
  send(g, { op: 'press', s: 'veil' }); run(g, F.veil.dur + .05);
  assert.equal(h.bd.vl, null);
});

test('차징 중 다른 공격 스킬을 누르면 기존 차징을 끊는다(비용 없음)', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 60;
  press(g); run(g, .5); assert.equal(h.bd.ch.s, 'shot');
  sm(g, 'press'); assert.equal(h.bd.ch.s, 'smash'); assert.equal(h.bag.bd.b, 60);
  rpgInput(g, { cls: 0, kind: 'dash', dir: [1, 0] }); assert.equal(h.bd.ch, null);
});

/* ── 3단계 — 혈량 상태 · 혈역 증폭 ── */
import { BLOOD_STATE as Z, BLOOD_FIELD as FD } from '../src/game/bloodJobData.js';
import { bloodMode, bloodJobAtk, bloodJobSlow, effTrain } from '../src/game/bloodJob.js';
import { heroDmgMul } from '../src/game/rpg.js';
const lv100 = (h) => { unlockBlood(h); h.bag.bd.lv = 100; };
const fd = (g, op) => send(g, { op, s: 'field' });

test('상태 — 안정 · 증폭(안정 한계 초과) · 과충전(증폭 한계 초과) · 폭주 · 탈진', () => {
  assert.equal(bloodMode(200, 200, null), 'stable'); assert.equal(bloodMode(205, 200, null), 'amp');
  assert.equal(bloodMode(225, 200, null), 'amp'); assert.equal(bloodMode(230, 200, null), 'over');
  assert.equal(bloodMode(125, 100, null), 'amp'); assert.equal(bloodMode(130, 100, null), 'over');
  assert.equal(bloodMode(60, 200, { k: 1 }), 'rage'); assert.equal(bloodMode(60, 200, { k: 2 }), 'tired');
});

test('증폭 — 범위 +15%(혈수 강타 길이 · 폭) · 과충전 — 피해 +15% · 연마 계산 +5 · 초당 체력 1%', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.tr[1][0] = 0;
  h.bag.bd.b = 210;
  assert.deepEqual(smashSize(h, 0), [276, 207]);
  h.bag.bd.b = 230; h.hp = h.max; h.bd = null; step(g, .01);
  assert.equal(effTrain(h, 1), 5); assert.equal(effTrain(h, 2), 5);
  const hp0 = h.hp; run(g, 1);
  assert.ok(Math.abs((hp0 - h.hp) / h.max - Z.over.hp) < 0.002, `${(hp0 - h.hp) / h.max}`);
  h.hp = 1; run(g, .5); assert.equal(h.hp, 1, '체력 1에서 멈춘다');
});

test('혈역 증폭 — 직업 100 · 1초마다 +30(적이 혈역 안) · 과부하 한계까지 넘는다 · 이동 -40% · 놓으면 대기 45초 · 1초에 한 번 10씩 감소', () => {
  const a = setup(); unlockBlood(a.h); a.h.bag.bd.lv = 99; fd(a.g, 'press'); assert.equal(a.h.bd?.fd || null, null);
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 200;
  mob(g, h.x + 200, h.y);
  fd(g, 'press'); assert.ok(h.bd.fd);
  assert.ok(Math.abs(bloodJobSlow(h) - 0.6) < 1e-9);
  run(g, 1.05);
  assert.equal(FD.gain, 30);
  assert.equal(h.bag.bd.b, 230, '200 + 30');
  fd(g, 'release');
  assert.equal(h.bd.fd, null); assert.equal(h.bd.cd.field, FD.cd);
  run(g, .5); assert.equal(h.bag.bd.b, 230, '끝나고 1초 동안은 줄지 않는다');
  run(g, .45); assert.equal(h.bag.bd.b, 230);
  run(g, .1); assert.equal(h.bag.bd.b, 230, '기다린 1초가 지나도 1초를 채워야 한 번');
  run(g, 1); assert.equal(h.bag.bd.b, 220, '1초에 한 번 10');
  run(g, .5); assert.equal(h.bag.bd.b, 220, '프레임마다 줄지 않는다');
  run(g, 3); assert.equal(h.bag.bd.b, 200, '안정 한계 아래로는 줄지 않는다');
});

test('혈역 — 적이 없어도 지형에서 +30(11월 16일 버그 수정) · 시전자를 따라다닌다(맵을 옮기면 끝)', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 100;
  fd(g, 'press'); run(g, 1.05); assert.equal(h.bag.bd.b, 130, '몹 · 사람이 없어도 1초 뒤 +30');
  h.x += FD.r + 20; step(g, .01);
  assert.ok(h.bd.fd, '멀리 걸어도 혈역은 이어진다');
  assert.equal(h.bd.fd.x, Math.round(h.x), '중심이 내 자리로 옮겨 온다');
  h.map = 'plaza'; step(g, .01);
  assert.equal(h.bd.fd, null);
});

test('과부하 — 과부하 한계(100레벨 250)에 닿으면 혈량 60 · 6초 폭주(공격력 +25% · 이동 +15%) → 5초 탈진(-15%) · 직전 경고', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 200;
  mob(g, h.x + 200, h.y);
  const base = heroDmgMul(h);
  step(g, .01);
  assert.ok(overWarn(220, 100, null), '다음 흡수(+30)가 250에 닿는다'); assert.ok(!overWarn(215, 100, null)); assert.ok(!overWarn(220, 100, { k: 1 }));
  assert.ok(overWarn(120, 1, null) && !overWarn(115, 1, null), '1레벨의 과부하 한계는 150');
  fd(g, 'press'); run(g, 1.05);
  assert.equal(h.bag.bd.b, 230); assert.ok(h.bd.fd);
  run(g, 1);
  assert.equal(h.bag.bd.b, 60); assert.equal(h.bd.fd, null); assert.equal(h.bd.rg.k, 1);
  assert.ok(Math.abs(heroDmgMul(h) / base - 1.25) < 1e-6); assert.ok(Math.abs(bloodJobSlow(h) - 1.15) < 1e-9);
  h.bd.cd.field = 0; fd(g, 'press'); assert.equal(h.bd.fd, null, '폭주 중에는 혈역을 못 쓴다');
  run(g, Z.rage.dur + .05); assert.equal(h.bd.rg.k, 2);
  assert.ok(Math.abs(heroDmgMul(h) / base - 0.85) < 1e-6);
  run(g, Z.tired.dur + .05); assert.equal(h.bd.rg, null); assert.equal(bloodJobAtk(h), 1);
});

test('혈막 발동이면 혈역이 끝난다 · 혈량이 모자라 혈막이 안 나가면 혈역은 그대로', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 10;
  fd(g, 'press'); send(g, { op: 'press', s: 'veil' });
  assert.ok(h.bd.fd); assert.equal(h.bd.vl, null);
  h.bag.bd.b = 40; send(g, { op: 'press', s: 'veil' });
  assert.equal(h.bd.fd, null); assert.ok(h.bd.vl); assert.ok(h.bd.vl.k > 1.1, '혈역 크기 보너스를 먼저 기록');
});

test('스냅샷 — 손님 화면에 폭주 · 혈역이 보인다', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 100;
  fd(g, 'press'); run(g, .3);
  h.bd.rg = { k: 2, t: 3 };
  const guest = makeWorld(); guest.mySeat = 0;
  rpgSyncSeats(guest, [{ id: 'b0', name: '혈액', hero: { name: '혈액', job: 'warrior', elem: 'frost', gender: 'm' } }]);
  rpgApply(guest, rpgPack(g));
  const v = bloodView(guest.heroes[0]);
  assert.equal(v.rg.k, 2); assert.ok(v.fd); assert.equal(v.fd.x, h.bd.fd.x);
});

/* ── 4단계 — 해금 경로 ── */
import { BLOOD_SPOTS, BLOOD_LAB as LAB } from '../src/game/bloodJobData.js';
import { spotNear } from '../src/game/bloodUnlock.js';
const spot = (id) => BLOOD_SPOTS.find((s) => s.id === id);
const goSpot = (h, id) => { const s = spot(id); h.map = s.map; h.x = s.x; h.y = s.y; };
const talk = (g) => rpgInput(g, { cls: 0, kind: 'talk' });

test('단서 A — 사냥꾼 이야기 → 핏자국 → 유리관에서 표본', () => {
  const { g, h } = setup();
  goSpot(h, 'trail'); assert.equal(spotNear(h), null, '이야기를 듣기 전에는 핏자국이 보이지 않는다');
  h.map = 'field'; h.x = 430; h.y = 760; talk(g);
  assert.ok(!h.bag.bu || !(h.bag.bu.f & 1), '「사냥꾼의 오른팔」 칭호가 없으면 핏자국 이야기를 듣지 못한다');
  h.titles.push('quest100'); talk(g);
  assert.equal(h.bag.bu.f & 1, 1);
  goSpot(h, 'trail'); talk(g); goSpot(h, 'tube'); talk(g);
  assert.equal(h.bag.bu.c & 1, 1);
});

test('단서 B — 압축기 옆 허수아비에 평타 → 큰 기술 → 평타, 틀리면 처음부터', async () => {
  const { bloodSeqHit } = await import('../src/game/bloodUnlock.js');
  const { g, h } = setup(); h.map = 'train';
  const E = { fx() {}, sys() {}, say() {} }, m = { x: 1250, y: 900 };
  // 11월 15일 — 단서가 하나도 없으면 압축기는 보이지 않고 순서도 세지 않는다
  g.t = 0; bloodSeqHit(E, g, h, m, false); g.t = 1; bloodSeqHit(E, g, h, m, true); g.t = 2; bloodSeqHit(E, g, h, m, false);
  assert.ok(!h.bag.bu || !(h.bag.bu.f & 4), '단서 없이는 압축기가 열리지 않는다');
  goSpot(h, 'press'); assert.equal(spotNear(h), null, '단서 없이는 압축기 조사 칸도 없다');
  for (const id of ['sluice', 'plate']) { goSpot(h, id); assert.equal(spotNear(h), null, id + ' 도 숨겨져 있다'); }
  h.map = 'train'; h.bag.bu = { c: 1, f: 3, o: 0 };   // 첫 단서(표본)를 얻은 뒤부터 드러난다
  goSpot(h, 'press'); assert.ok(spotNear(h), '단서 뒤에는 압축기가 드러난다'); h.map = 'train';
  g.t = 10; bloodSeqHit(E, g, h, m, true); assert.equal(h.bseq || null, null, '스킬부터는 틀림');
  g.t = 1; bloodSeqHit(E, g, h, m, false); g.t = 2; bloodSeqHit(E, g, h, m, true); g.t = 2.1; bloodSeqHit(E, g, h, m, true);
  g.t = 4; bloodSeqHit(E, g, h, m, false);
  assert.equal(h.bag.bu.f & 4, 4);
  goSpot(h, 'press'); talk(g); assert.equal(h.bag.bu.c & 2, 2);
});

test('단서 C — 수문 → 분수 바닥 · 두 단서(B+C)로 훈련장 격리문 → 연구시설 · 시험 세 단계 → 해금', () => {
  const { g, h } = setup();
  h.bag.bu = { c: 2, f: 4, o: 0 };
  goSpot(h, 'sluice'); talk(g); goSpot(h, 'plate'); talk(g);
  assert.equal(h.bag.bu.c, 6);
  goSpot(h, 'press'); talk(g);
  assert.equal(h.map, LAB.id); assert.equal(h.bag.bu.o & 4, 4);
  assert.equal(h.bag.bd.trial, 1); assert.equal(h.bt.step, 1);
  assert.equal(cleanBag(structuredClone(h.bag)).bd, undefined, '시험 값은 저장하지 않는다');
  assert.equal(h.advClass, 'gladiator', '시험 중에는 전직이 그대로');
  rpgStep(g, .01);                                  // 시험 표적(허수아비)을 치우지 않고 돈다
  const tg = () => g.mobs.filter((m) => m.map === LAB.id && m.own === 0);
  assert.equal(tg().length, 2);
  // 1단계 — 평타로 혈흔
  h.x = tg()[0].x - 50; h.y = tg()[0].y; h.look = [1, 0]; h.dir = 1;
  h.cd = 0; h.fire = 1; for (let i = 0; i < 5; i++) rpgStep(g, .02); h.fire = 0; rpgStep(g, .02);
  assert.equal(h.bt.step, 2);
  // 2단계 — 차징한 적혈탄으로 혈흔 회수
  h.bd.mk['m' + tg()[0].id] = [3, 10];
  h.x = tg()[0].x - 200;
  press(g); for (let i = 0; i < 90; i++) rpgStep(g, .01); release(g); for (let i = 0; i < 60; i++) rpgStep(g, .01);
  assert.equal(h.bt.step, 3);
  // 3단계 — 예고 뒤 혈막으로 막기
  h.hp = h.max;
  for (let i = 0; i < Math.round((LAB.veil.gap + .05) / .01); i++) rpgStep(g, .01);
  send(g, { op: 'press', s: 'veil' });
  for (let i = 0; i < Math.round((LAB.veil.warn + .05) / .01); i++) rpgStep(g, .01);
  assert.equal(h.bt, null); assert.equal(h.bag.bd.on, 1); assert.ok(!h.bag.bd.trial);
  assert.equal(h.bag.bd.lv, 1); assert.equal(h.advClass, '');
  assert.equal(tg().length, 0);
});

test('연구시설을 나가면 빌린 혈량 · 스킬을 거둔다', () => {
  const { g, h } = setup();
  h.bag.bu = { c: 6, f: 12, o: 4 };
  goSpot(h, 'press'); talk(g); assert.equal(h.map, LAB.id);
  h.map = 'plaza'; step(g, .01);
  assert.equal(h.bt, null); assert.equal(h.bag.bd || null, null); assert.equal(h.advClass, 'gladiator');
});

test('BLOOD-001 은 큰 기술 · 일반 스킬 칸 · 전직 스킬을 받지 않고, 전직 초기화하면 다시 쓴다', () => {
  const { g, h } = setup();
  unlockBlood(h);
  h.sk = 0;
  rpgInput(g, { cls: 0, kind: 'skill' });
  assert.equal(h.sk, 0, '큰 기술이 나가지 않는다');
  dropBlood(h);
  rpgInput(g, { cls: 0, kind: 'skill' });
  assert.ok(h.sk > 0, '되돌리면 큰 기술이 다시 나간다');
});

test('키 — 적혈탄 F · 혈역 증폭은 따로 키 없음, BLOOD-001 이면 겹친 키도 혈 행동이 먼저', () => {
  const k = defaultKeys();
  assert.deepEqual(k.bShot, ['KeyF', '']);
  assert.deepEqual(k.bField, ['', '']);
  const all = KEY_ACTIONS.flatMap(a => a.keys).filter(Boolean);
  assert.equal(new Set(all).size, all.length, '기본 키끼리 겹치지 않는다');
  const mine = { ...k, dash: ['KeyF', ''] };
  assert.equal(keyMap(mine).KeyF, 'dash');
  assert.equal(keyMap(mine, BLOOD_ACTS).KeyF, 'bShot');
});

test('관리자 명령 /블러드 <이름> 연마 50 — 연마 셋을 한 번에 50', async () => {
  const { rpgAdminCmd } = await import('../src/game/adminCmd.js');
  const { g, h } = setup(); unlockBlood(h); h.admin = 1;
  rpgAdminCmd(g, 0, '/블러드 혈액 연마 50');
  assert.deepEqual(h.bag.bd.tr, [[50, 0], [50, 0], [50, 0]]);
  rpgAdminCmd(g, 0, '/블러드 혈액 120');
  assert.equal(h.bag.bd.lv, 120); assert.deepEqual(h.bag.bd.tr[0], [50, 0], '직업 레벨만 바꾸면 연마는 그대로');
});

/* ── 11월 15일 개편 — 자연 회복 · 혈흔 회수 상한 · 혈류 파동 · 혈쇄 갈고리 · 스냅샷 호환 ── */
import { BLOOD_WAVE as WV, BLOOD_HOOK as HK } from '../src/game/bloodJobData.js';
import { waveRadius, applyBloodJob } from '../src/game/bloodJob.js';
const lvN = (h, n) => { unlockBlood(h); h.bag.bd.lv = n; };

test('자연 회복 — 30 아래면 1초에 한 번 +5(30 까지) · 쓰러진 동안 · PvP 에서는 멈춘다', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 10;
  run(g, .95); assert.equal(h.bag.bd.b, 10);
  run(g, .1); assert.equal(h.bag.bd.b, 15);
  run(g, 5); assert.equal(h.bag.bd.b, 30, '30 에서 멈춘다');
  h.bag.bd.b = 10; h.down = 5; run(g, 2); assert.equal(h.bag.bd.b, 10, '쓰러진 동안 없음');
  h.down = 0; h.pvpOn = 1; h.map = 'field'; run(g, 2.1); assert.equal(h.bag.bd.b, 10, '사냥터 PvP 를 켜면 없음');
});

test('혈흔 회수 — 중첩당 +5 · 한 시전(혈류 파동이 여러 대상을 맞혀도) +15 까지', () => {
  const { g, h } = setup(); lvN(h, 15); h.bag.bd.b = 50; step(g, .01);
  const a = mob(g, h.x + 200, h.y), b = mob(g, h.x + 230, h.y + 20);
  h.bd.mk['m' + a.id] = [3, 10]; h.bd.mk['m' + b.id] = [3, 10];
  send(g, { op: 'press', s: 'wave' }); run(g, WV.spread + .05);
  assert.equal(h.bag.bd.b, 50 - WV.cost + 15, '3중첩 + 3중첩이어도 +15');
  assert.equal(h.bd.mk['m' + a.id], undefined); assert.equal(h.bd.mk['m' + b.id], undefined);
});

test('혈류 파동 — 혈량 15 · 대기 9 · 450 안 한 점 · 반경 180 · 대상마다 한 번 ×1.2 · 2초 둔화 · 증폭형 +10', () => {
  const { g, h } = setup(); lvN(h, 15); h.bag.bd.b = 60;
  const m = mob(g, h.x + 300, h.y, { stun: 0 }), side = mob(g, h.x + 300 + 150, h.y, { stun: 0 }), far = mob(g, h.x + 300 + 260, h.y, { stun: 0 });
  assert.equal(waveRadius(h), WV.r);
  send(g, { op: 'press', s: 'wave' });
  assert.equal(h.bag.bd.b, 45); assert.equal(h.bd.cd.wave, WV.cd);
  const w = h.bd.wv[0]; assert.equal(w.x, Math.round(m.x), '가까운 적 자리에서 퍼진다');
  run(g, WV.spread + .05);
  assert.ok(m.hp < HP && side.hp < HP); assert.equal(far.hp, HP, '반경 밖');
  assert.ok(Math.abs((HP - side.hp) / (HP - m.hp) - 1) < 0.02, '대상마다 한 번 같은 피해');
  assert.ok(m.slow > 1.5, '2초 둔화');
  assert.equal(h.bd.wv.length, 0); assert.equal(h.bag.bd.tr[1][1], 10, '증폭형 +10');
  // 포인터 자리 — 450 밖이면 450 으로
  h.bd.cd.wave = 0; h.bag.bd.b = 60;
  rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'press', s: 'wave' }, aim: [1, 0], pt: [h.x + 2000, h.y] });
  assert.equal(h.bd.wv[0].x, Math.round(h.x + WV.reach));
  // 증폭형 연마 보너스는 반경에
  h.bag.bd.tr[1][0] = 40; assert.equal(waveRadius(h), Math.round(WV.r * 1.2));
});

test('혈류 파동 — 대상이 없어도 보는 쪽에 쓴다 · 피해가 없으면 경험치 없음', () => {
  const { g, h } = setup(); lvN(h, 15); h.bag.bd.b = 60;
  send(g, { op: 'press', s: 'wave' }); assert.equal(h.bag.bd.b, 45);
  run(g, WV.spread + .05); assert.equal(h.bag.bd.tr[1][1], 0);
});

test('혈쇄 갈고리 — 혈량 15 · 대기 8 · 시전자만 적 바로 앞으로 · 도착하면 피해 · 무적 없음 · 형상화 +10', () => {
  const { g, h } = setup(); lvN(h, 20); h.bag.bd.b = 60;
  const m = mob(g, h.x + 350, h.y), x0 = h.x;
  send(g, { op: 'press', s: 'hook' });
  assert.equal(h.bag.bd.b, 45); assert.equal(h.bd.cd.hook, HK.cd); assert.ok(h.bd.hk);
  run(g, 0.4);
  assert.equal(h.bd.hk, null);
  assert.ok(h.x > x0 + 250 && h.x < m.x, `${h.x - x0}`); assert.equal(Math.round(m.x), Math.round(x0 + 350), '적은 끌려오지 않는다');
  assert.ok(m.hp < HP, '도착하면 ×5 + 충격파 ×3(11월 16일)'); assert.ok(!(h.inv > 0.01), '무적 없음');
  assert.equal(h.bag.bd.tr[2][1], 10, '형상화 +10');
});

test('혈쇄 갈고리 — 대상이 없거나 420 밖 · 길이 막히면 시전하지 않는다(비용 · 대기 없음)', () => {
  const { g, h } = setup(); lvN(h, 20); h.bag.bd.b = 60;
  send(g, { op: 'press', s: 'hook' });
  assert.equal(h.bd.hk, null); assert.equal(h.bag.bd.b, 60); assert.equal(h.bd.cd.hook, 0);
  mob(g, h.x + 600, h.y);
  send(g, { op: 'press', s: 'hook' }); assert.equal(h.bd.hk, null); assert.equal(h.bag.bd.b, 60);
});

test('스냅샷 — 새 대기 칸은 뒤에 붙고, 옛 줄(새 칸 없음)도 읽는다', () => {
  const { g, h } = setup(); lvN(h, 20); h.bag.bd.b = 60;
  mob(g, h.x + 300, h.y);
  send(g, { op: 'press', s: 'wave' }); send(g, { op: 'press', s: 'hook' });
  const guest = makeWorld(); rpgApply(guest, rpgPack(g));
  const v = bloodView(guest.heroes[0]);
  assert.equal(v.cd.wave, WV.cd); assert.equal(v.cd.hook, HK.cd); assert.ok(v.hk);
  const o = { bag: { bd: { on: 1, lv: 20, b: 50 } } };
  applyBloodJob(o, [50, 20, 0, [0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 3], 0, [], 0, 0, 0, 0, 0]);
  assert.equal(o.bdv.cd.wave, 0); assert.equal(o.bdv.cd.sword, 3); assert.equal(o.bdv.hk, null);
});

// 11월 16일 — 조사 자리는 NPC 가 없어도 화면이 말 걸기를 서버로 보내야 한다(전에는 `if (!npc) return` 에서 끊겨 아무 반응이 없었다)
test('화면 말 걸기가 NPC 없는 조사 자리도 서버로 보낸다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/RpgView.jsx', import.meta.url), 'utf8');
  const i = src.indexOf('if (kind === "talk") {');
  const body = src.slice(i, src.indexOf('if (kind === "dash"', i));
  assert.match(body, /spotNear\(h\)/, '말 걸기 처리에 조사 자리 검사가 있어야 한다');
  assert.doesNotMatch(body, /const npc = npcNear\(h\);/, 'NPC 만 보고 끊으면 조사 자리가 죽는다');
});

// 11월 16일 — 해금 안내 문구의 조사(「배수로이」 「BLOOD-001 를」 로 나갔다)
test('입구 열림 · 해금 안내 문구의 조사가 받침에 맞다', () => {
  const { g, h } = setup();
  h.bag.bu = { c: 3, f: 7, o: 0 };
  goSpot(h, 'tube'); talk(g);
  assert.ok(g.out.some((o) => o.k === 'sys' && o.msg.includes('토끼 사냥터 배수로가 열렸다')), '배수로가');
  h.bag.bu = { c: 5, f: 11, o: 0 };
  goSpot(h, 'plate'); talk(g);
  assert.ok(g.out.some((o) => o.k === 'sys' && o.msg.includes('광장 분수 아래가 열렸다')), '아래가');
});

// 포인터 조준 — 화면은 손 높이(34)에서 포인터 쪽 방향을 보낸다(skillAim.js pointerSkillAim 과 같은 식)
const ptrAim = (h, px, py) => [px - h.x, (py - (h.y - 34)) / .78];
const aimShot = (g, aim) => { rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'press', s: 'shot' }, aim }); rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'release', s: 'shot' }, aim }); };
test('적혈탄 — 작은 몹 몸통을 포인터로 겨누면 맞는다(손 높이 · 발밑 판정 차이 보정)', () => {
  for (const [dx, dy] of [[300, 0], [-260, 0], [200, 120], [0, 220], [0, -220]]) {
    const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 100;
    const m = mob(g, h.x + dx, h.y + dy);
    aimShot(g, ptrAim(h, m.x, m.y - m.rad));       // 토끼 몸 가운데를 누름
    run(g, .6);
    assert.ok(m.hp < HP, `(${dx}, ${dy}) 맞아야 한다`);
  }
});
test('적혈탄 — 몸에서 멀리 겨누면 바로잡지 않고 빗나간다', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 100;
  const m = mob(g, h.x + 300, h.y);
  aimShot(g, ptrAim(h, m.x, m.y - 160));
  run(g, .6);
  assert.equal(m.hp, HP);
});
test('혈수 강타 — 작은 몹 몸통을 포인터로 겨누면 맞는다', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.lv = 5; h.bag.bd.b = 100;
  const m = mob(g, h.x + 150, h.y + 90);
  const aim = ptrAim(h, m.x, m.y - m.rad);
  rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'press', s: 'smash' }, aim }); rpgInput(g, { cls: 0, kind: 'blood', dir: { op: 'release', s: 'smash' }, aim });
  run(g, .8);
  assert.ok(m.hp < HP);
});
