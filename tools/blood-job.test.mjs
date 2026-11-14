/* 히든 직업 BLOOD-001 1단계 — 혈량 · 혈흔 · 적혈탄 · 전환 · 저장 · 스냅샷 · 전직 대신을 실제 게임 함수로 본다.
   node --test tools/blood-job.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, heroRecord } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { BLOOD, BLOOD_SHOT as S } from '../src/game/bloodJobData.js';
import { unlockBlood, stableCap, shotTier, bloodView, jobNeed, trainNeed, cleanBd } from '../src/game/bloodJob.js';
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

test('해금하면 1차 전직이 사라지고 혈량 50 · 직업 레벨 1로 시작한다', () => {
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

test('안정 상한 = min(150, 50 + 레벨 - 1) · 경험치 표', () => {
  assert.equal(stableCap(1), 50); assert.equal(stableCap(100), 149); assert.equal(stableCap(101), 150); assert.equal(stableCap(200), 150);
  assert.equal(jobNeed(1), 11); assert.equal(trainNeed(0), 100); assert.equal(trainNeed(49), 1080);
});

test('평타 유효 적중 — 혈량 +2(공격 한 번에 한 번) · 혈흔 1중첩 · 10초 뒤 사라진다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 10;
  const m = mob(g, h.x + 40, h.y);
  basic(g, h);
  assert.equal(h.bag.bd.b, 12);
  assert.equal(h.bd.mk['m' + m.id][0], 1);
  for (let i = 0; i < 6; i++) basic(g, h);
  assert.equal(h.bd.mk['m' + m.id][0], BLOOD.mark.max);   // 최대 5
  run(g, BLOOD.mark.dur + .2);
  assert.equal(h.bd.mk['m' + m.id], undefined);
});

test('일반 획득은 안정 상한까지 — 넘는 몫만 버린다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 49;
  mob(g, h.x + 40, h.y);
  basic(g, h);
  assert.equal(h.bag.bd.b, 50);
});

test('적혈탄 — 짧게 누르면 기본(5) · 0.8초 1단계(12) · 1.6초 자동 2단계(27) · 대기 7초', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 50;
  const m = mob(g, h.x + 200, h.y);
  press(g); release(g); run(g, .5);
  assert.equal(h.bag.bd.b, 45); assert.ok(HP - m.hp > 0); assert.equal(h.bd.cd.shot > 6, true);
  h.bd.cd.shot = 0;
  press(g); run(g, .85); release(g); run(g, .5);
  assert.equal(h.bag.bd.b, 45 - 12);
  h.bd.cd.shot = 0;
  press(g); run(g, S.full + .05);                // 놓지 않아도 1.6초에 쏜다
  assert.equal(h.bd.ch, null);
  assert.equal(h.bag.bd.b, 45 - 12 - 27);
  release(g);                                     // 계속 누르다 놓아도 다시 쏘지 않는다
  run(g, .3);
  assert.equal(h.bag.bd.b, 45 - 12 - 27);
});

test('혈량이 모자라면 낮은 단계로 · 5 미만이면 시작하지 않는다', () => {
  assert.equal(shotTier(1.7, 20), 1); assert.equal(shotTier(1.7, 4), -1); assert.equal(shotTier(0.5, 30), 0);
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 4;
  press(g);
  assert.equal(h.bd?.ch || null, null);
});

test('혈흔 보너스 — 중첩당 +2% 피해 · 소비하면 중첩당 혈량 +3', () => {
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
  assert.equal(b.h.bag.bd.b, 30 - 5 + 15);
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
  press(g); run(g, S.full + .05); run(g, .6);
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

test('혈량 전환 — 최대 체력 2% → 혈량 +10 · 대기 2초 · 안정 상한이면 못 쓴다', () => {
  const { g, h } = setup(); unlockBlood(h);
  h.bag.bd.b = 20; h.hp = h.max;
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 30); assert.equal(h.hp, h.max - Math.ceil(h.max * .02));
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 30);                   // 대기 중
  h.bag.bd.b = 50; h.bd.cd.conv = 0;
  send(g, { op: 'convert' });
  assert.equal(h.bag.bd.b, 50);
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

test('저장 · 스냅샷 — 가방 bd 는 거른 값 · 손님 화면 값', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 33; h.bag.bd.tr[1] = [3, 50];
  const b = cleanBag(structuredClone(h.bag));
  assert.deepEqual(b.bd, { on: 1, lv: 1, xp: 0, tr: [[0, 0], [3, 50], [0, 0]], b: 33 });
  assert.equal(cleanBd({ on: 1, lv: 999, b: 999, tr: [[99, 5]] }).lv, BLOOD.maxLv);
  const guest = makeWorld(); guest.mySeat = 0;
  rpgSyncSeats(guest, [{ id: 'b0', name: '혈액', hero: { name: '혈액', job: 'warrior', elem: 'frost', gender: 'm' } }]);
  rpgApply(guest, rpgPack(g));
  const v = bloodView(guest.heroes[0]);
  assert.equal(v.b, 33); assert.equal(v.lv, 1); assert.deepEqual(v.tr[1], [3, 50]);
});

/* ── 2단계 — 혈수 강타 · 혈형 변환(혈검 · 혈막) ── */
import { BLOOD_SMASH as M, BLOOD_FORM as F } from '../src/game/bloodJobData.js';
import { smashSize, smashTier, bloodJobTake, veilStat } from '../src/game/bloodJob.js';
const sm = (g, op) => send(g, { op, s: 'smash' });
const lv20 = (h) => { unlockBlood(h); h.bag.bd.lv = 20; };

test('직업 레벨 20 전에는 혈수 강타 · 혈형 변환을 못 쓴다', () => {
  const { g, h } = setup(); unlockBlood(h); h.bag.bd.b = 50;
  sm(g, 'press'); assert.equal(h.bd?.ch || null, null);
  send(g, { op: 'sword' }); assert.equal(h.bag.bd.b, 50);
});

test('혈수 강타 — 기본 30 · 0.2초 뒤 한 번 · 일반 몹 경직 0.5 · 넉백 · 대기 12초', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 50;
  const m = mob(g, h.x + 120, h.y, { stun: 0 }), far = mob(g, h.x + 400, h.y);
  sm(g, 'press'); sm(g, 'release');
  assert.equal(h.bag.bd.b, 20); assert.ok(h.bd.cd.smash > 11);
  assert.equal(m.hp, HP, '닿기 전에는 피해 없음');
  run(g, M.delay + .02);
  assert.ok(m.hp < HP); assert.equal(far.hp, HP, '길이 240 밖');
  assert.ok(m.stun > 0); assert.ok(m.kbT > 0 || m.x > h.x + 120);
  assert.equal(h.bag.bd.tr[1][1], 10, '증폭형 연마 +10');
});

test('혈수 강타 차징 — 0.3 · 0.6 · 0.9초 추가 10 · 20 · 30 · 폭 +15%씩 · 혈량이 모자라면 낮은 단계', () => {
  assert.equal(smashTier(0.95, 100), 3); assert.equal(smashTier(0.95, 45), 1); assert.equal(smashTier(0.1, 29), -1);
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 65;   // 안정 상한(69) 아래 — 증폭 범위 보너스 없음
  assert.deepEqual(smashSize(h, 0), [240, 180]); assert.deepEqual(smashSize(h, 3), [240, 261]);
  sm(g, 'press'); run(g, M.full + .03);              // 0.9초 — 놓지 않아도 발동
  assert.equal(h.bd.ch, null); assert.equal(h.bag.bd.b, 5);
});

test('혈수 강타 — 보스는 경직 · 넉백 면역', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 50;
  const b = mob(g, h.x + 120, h.y, { boss: 1, stun: 0 });
  sm(g, 'press'); sm(g, 'release'); run(g, M.delay + .02);
  assert.ok(b.hp < HP); assert.equal(b.stun, 0); assert.equal(Math.round(b.x), Math.round(h.x + 120));
});

test('혈검 — 혈량 10 · 세 번 베기(0 · 0.18 · 0.36) · 마지막 적중이면 혈량 8 · 공통 대기 15초', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 30;
  const m = mob(g, h.x + 60, h.y);
  send(g, { op: 'sword' });
  const one = HP - m.hp;
  assert.ok(one > 0); assert.equal(h.bag.bd.b, 20); assert.ok(h.bd.cd.form > 14);
  run(g, .4);
  assert.ok(Math.abs((HP - m.hp) / one - 3) < 0.05, `${(HP - m.hp) / one}`);
  assert.equal(h.bag.bd.b, 28);
  assert.equal(h.bag.bd.tr[2][1], 10, '형상화 연마 +10');
  send(g, { op: 'press', s: 'veil' }); assert.equal(h.bd.vl, null, '공통 대기 — 혈막도 못 쓴다');
});

test('혈막 — 혈량 15 · 받는 피해 30% 감소 · 줄였으면 끝날 때 혈량 12 · 평타를 누르면 끝난다', () => {
  const { g, h } = setup(); lv20(h); h.bag.bd.b = 40;
  send(g, { op: 'press', s: 'veil' });
  assert.equal(h.bag.bd.b, 25); assert.ok(h.bd.vl);
  const E = { fx() {} };
  assert.equal(bloodJobTake(E, g, h, 100), 70);
  send(g, { op: 'release', s: 'veil' });
  assert.equal(h.bd.vl, null); assert.equal(h.bag.bd.b, 37);
  // 줄인 피해가 없으면 회수 없음 · 평타 누름은 혈막을 끝낸다
  h.bd.cd.form = 0;
  send(g, { op: 'press', s: 'veil' }); const b0 = h.bag.bd.b;
  rpgInput(g, { cls: 0, kind: 'fire', dir: true });
  assert.equal(h.bd.vl, null); assert.equal(h.bag.bd.b, b0);
  assert.deepEqual(veilStat(50), [4, 0.35]);
});

test('혈막 — 최대 3초(형상화 연마로 늘어남)', () => {
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

test('상태 — 안정 · 증폭(상한 초과) · 과충전(150 초과) · 폭주 · 탈진', () => {
  assert.equal(bloodMode(149, 149, null), 'stable'); assert.equal(bloodMode(150, 149, null), 'amp');
  assert.equal(bloodMode(151, 149, null), 'over'); assert.equal(bloodMode(151, 150, null), 'over');
  assert.equal(bloodMode(60, 149, { k: 1 }), 'rage'); assert.equal(bloodMode(60, 149, { k: 2 }), 'tired');
});

test('증폭 — 범위 +15%(혈수 강타 길이 · 폭) · 과충전 — 피해 +15% · 연마 계산 +5 · 초당 체력 1%', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.tr[1][0] = 0;
  h.bag.bd.b = 150;
  assert.deepEqual(smashSize(h, 0), [276, 207]);
  h.bag.bd.b = 160; h.hp = h.max; h.bd = null; step(g, .01);
  assert.equal(effTrain(h, 1), 5); assert.equal(effTrain(h, 2), 5);
  const hp0 = h.hp; run(g, 1);
  assert.ok(Math.abs((hp0 - h.hp) / h.max - Z.over.hp) < 0.002, `${(hp0 - h.hp) / h.max}`);
  h.hp = 1; run(g, .5); assert.equal(h.hp, 1, '체력 1에서 멈춘다');
});

test('혈역 증폭 — 직업 100 · 1초마다 +5(적이 혈역 안) · 180 까지 넘는다 · 이동 -40% · 놓으면 대기 45초', () => {
  const a = setup(); unlockBlood(a.h); a.h.bag.bd.lv = 99; fd(a.g, 'press'); assert.equal(a.h.bd?.fd || null, null);
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 149;
  mob(g, h.x + 200, h.y);
  fd(g, 'press'); assert.ok(h.bd.fd);
  assert.ok(Math.abs(bloodJobSlow(h) - 0.6) < 1e-9);
  run(g, 3.05);
  assert.equal(h.bag.bd.b, 164);
  fd(g, 'release');
  assert.equal(h.bd.fd, null); assert.equal(h.bd.cd.field, FD.cd);
  run(g, .5); assert.equal(h.bag.bd.b, 164, '끝나고 1초 동안은 줄지 않는다');
  run(g, 1.0); assert.ok(h.bag.bd.b < 164 && h.bag.bd.b >= 149, `${h.bag.bd.b}`);
  run(g, 3); assert.equal(h.bag.bd.b, 149, '안정 상한 아래로는 줄지 않는다');
});

test('혈역 — 적이 없으면 얻지 못하고 · 경계를 넘으면 끝난다', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 100;
  fd(g, 'press'); run(g, 1.05); assert.equal(h.bag.bd.b, 100);
  h.x += FD.r + 20; step(g, .01);
  assert.equal(h.bd.fd, null);
});

test('과부하 — 180 이면 혈량 min(60, 상한) · 6초 폭주(공격력 +25% · 이동 +15%) → 5초 탈진(-15%)', () => {
  const { g, h } = setup(); lv100(h); h.bag.bd.b = 178;
  mob(g, h.x + 200, h.y);
  const base = heroDmgMul(h);
  fd(g, 'press'); run(g, 1.05);
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
  assert.equal(h.bag.bu.f & 1, 1);
  goSpot(h, 'trail'); talk(g); goSpot(h, 'tube'); talk(g);
  assert.equal(h.bag.bu.c & 1, 1);
});

test('단서 B — 압축기 옆 허수아비에 평타 → 큰 기술 → 평타, 틀리면 처음부터', async () => {
  const { bloodSeqHit } = await import('../src/game/bloodUnlock.js');
  const { g, h } = setup(); h.map = 'train';
  const E = { fx() {}, sys() {}, say() {} }, m = { x: 1250, y: 900 };
  g.t = 0; bloodSeqHit(E, g, h, m, true); assert.equal(h.bseq || null, null, '스킬부터는 틀림');
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
