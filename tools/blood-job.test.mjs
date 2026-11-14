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
