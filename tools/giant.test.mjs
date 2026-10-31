import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV_BY_ID } from '../src/game/advData.js';

// 10월 31일 — 소환술사 궁극기 거대 정령. 실행: node --test tools/giant.test.mjs
const U = ADV_BY_ID.summoner.ultimate;
function world(c = 'summoner') {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name: '시험0', hero: { name: '시험0', job: 'mage', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '시험0', rs: RESET.id, gift: GIFT.id, lv: 300, ts: 0, coins: 0, stats: { int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1 }, advClass: c }, 'p0');
  g.mobs = [];
  const h = g.heroes[0]; h.map = 'skeletal'; h.x = 1000; h.y = 900; h.auto = 0;
  return g;
}
const TEMPLATE = makeWorld().mobs.find((q) => q.map === 'skeletal' && !q.boss);
function mob(g, x, y, extra = {}) {
  const m = { ...TEMPLATE, dmg: 0 };
  Object.assign(m, { id: g.nextId++, map: 'skeletal', x, y, hx: x, hy: y, lv: 220, hp: 1e9, max: 1e9, gi: -1, tgt: -1, state: 'idle', stun: 0, slow: 0, freeze: 0, burn: 0, poison: 0, shred: 0, shredAmt: 0, bdps: 0, pdps: 0, hitBy: [], ...extra });
  g.mobs.push(m);
  return m;
}
const ult = (g) => rpgInput(g, { cls: 0, kind: 'adv', dir: { op: 'ult' } });
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) rpgStep(g, 0.02); };

test('부르면 체력이 있는 거대 정령이 서고 대기가 돈다', () => {
  const g = world(), h = g.heroes[0];
  ult(g);
  const gi = h.as.gi;
  assert(gi && gi.hp === Math.round(h.max * U.hpMul) && gi.t === U.life);
  assert.equal(h.as.ucd, U.cd);
  ult(g);                                           // 대기 중에는 다시 못 부른다
  assert.equal(h.as.gi, gi);
});

test('소환술사만 쓴다 · 결투에서는 못 쓴다', () => {
  const g = world('healer'); g.heroes[0].job = 'mage';
  ult(g); assert(!g.heroes[0].as || !g.heroes[0].as.gi);
});

test('받는 피해의 share 몫을 정령이 대신 맞고 체력이 다하면 사라진다', () => {
  const g = world(), h = g.heroes[0];
  ult(g);
  const gi = h.as.gi, hp0 = gi.hp;
  mob(g, 1040, 900, { dmg: 100, tgt: 0, state: 'chase' });
  const before = h.hp;
  // 한 대 맞는 값을 직접 재려고 몹 한 마리가 걸어와 친다 — 정령이 맞은 만큼 + 내가 맞은 만큼 비율이 share 대 1-share
  run(g, 3);
  const took = before - h.hp, giTook = hp0 - gi.hp;
  assert(took > 0 && giTook > 0, `정령 ${giTook} · 나 ${took}`);
  assert(Math.abs(giTook / (giTook + took) - U.share) < 0.05, `정령 ${giTook} · 나 ${took}`);
  gi.hp = 1; h.as.gi = gi;                          // 거의 다 닳았다 — 한 번 맞으면 부서진다
  h.hp = h.max;
  run(g, 3);
  assert(!h.as.gi || h.as.gi.hp > 0);
});

test('every 초마다 둘레 적을 모두 치고 기절시킨다 · 멀리 있는 적은 안 친다', () => {
  const g = world(), h = g.heroes[0];
  const a = mob(g, 1100, 900), b = mob(g, 1140, 930), far = mob(g, 1000 + U.roam + U.r + 300, 900);
  ult(g);
  run(g, 1.6);
  assert(a.hp < a.max && b.hp < b.max, '둘레 적 모두 맞는다');
  assert.equal(far.hp, far.max);
  assert(a.stun > 0 || a.hp < a.max);
});

test('시간이 다하면 사라지고 손님 스냅샷에 체력 · 남은 초 · 대기가 간다', () => {
  const g = world(), h = g.heroes[0];
  ult(g); run(g, 1);
  const g2 = world(); g2.mySeat = 0;
  rpgApply(g2, JSON.parse(JSON.stringify(rpgPack(g))));
  const a2 = g2.heroes[0].as;
  assert(a2.gi && a2.gi.mhp === h.as.gi.mhp && Math.abs(a2.gi.t - h.as.gi.t) < 0.2);
  assert(Math.abs(a2.ucd - h.as.ucd) < 0.2);
  run(g, U.life + 0.5);
  assert.equal(h.as.gi, null);
});

test('쓰러지면 정령도 돌아간다', () => {
  const g = world(), h = g.heroes[0];
  ult(g);
  h.as.gi.hp = 1e12; h.hp = 1;
  mob(g, 1020, 900, { dmg: 1e9, tgt: 0, state: 'chase' });
  run(g, 4);
  if (h.down > 0) assert.equal(h.as.gi, null);
});

test('돌아다닌다 — 가까운 적에게 가고 주인 둘레 roam 을 넘지 않는다', () => {
  const g = world(), h = g.heroes[0];
  ult(g);
  const gi = h.as.gi;
  mob(g, 1000 + 400, 900, { stun: 99, hp: 1e12, max: 1e12 });                          // 처음 자리(앞 130)에서 멀리 있는 적
  const x0 = gi.x;
  run(g, 2);
  assert(gi.x > x0 + 100, `적 쪽으로 걸었다 ${x0} → ${gi.x}`);
  g.mobs = [];
  run(g, 8);
  assert(Math.abs(gi.x - h.x) <= U.roam + 1, '범위 안');
});

test('광장 — 공격 없는 작은 펫으로 멀찍이 따라다닌다', () => {
  const g = world(), h = g.heroes[0];
  h.map = 'plaza'; h.x = 1000; h.y = 900;
  ult(g);
  const gi = h.as.gi;
  assert(gi && gi.pet === 1, '광장에서도 부를 수 있고 펫이다');
  const d0 = Math.hypot(gi.x - h.x, (gi.y - h.y) / 0.78);
  assert(Math.abs(d0 - U.petNear) < 5, `처음 거리 ${d0}`);
  const m = mob(g, 1100, 900); m.map = 'plaza';
  run(g, 3);
  assert.equal(m.hp, m.max, '펫은 공격하지 않는다');
  h.x = 1800; run(g, 4);                            // 멀리 가면 따라온다
  const d = Math.hypot(gi.x - h.x, (gi.y - h.y) / 0.78);
  assert(d <= U.petFar + 30 && d >= U.petNear - 30, `따라온 거리 ${d}`);
  assert(U.petSize < 100, '캐릭터보다 작다');
});

test('광장 펫이 사냥터에 나가면 다시 싸운다', () => {
  const g = world(), h = g.heroes[0];
  h.map = 'plaza';
  ult(g);
  h.map = 'skeletal'; h.x = 1000; h.y = 900;
  const m = mob(g, 1040, 900);
  run(g, 3);
  assert.equal(h.as.gi.pet, 0);
  assert(m.hp < m.max, '사냥터에서는 내려친다');
});

test('펫 상태가 손님 스냅샷에 간다', () => {
  const g = world(), h = g.heroes[0];
  h.map = 'plaza'; ult(g); run(g, 0.5);
  const g2 = world();
  rpgApply(g2, JSON.parse(JSON.stringify(rpgPack(g))));
  assert.equal(g2.heroes[0].as.gi.pet, 1);
});

test('광장 펫은 시간도 대기도 쓰지 않고 싸우는 곳에 들어가면 30초와 대기가 돈다', () => {
  const g = world(), h = g.heroes[0];
  h.map = 'plaza'; ult(g);
  const gi = h.as.gi;
  assert.equal(U.life, 30);
  assert(!(h.as.ucd > 0), '광장에서는 대기를 쓰지 않는다');
  run(g, 40);
  assert(h.as.gi === gi && gi.t === U.life, '광장에서는 시간이 가지 않는다');
  h.map = 'skeletal'; h.x = 1000; h.y = 900;
  run(g, 1);
  assert.equal(gi.pet, 0);
  assert(h.as.ucd > U.cd - 2 && h.as.ucd <= U.cd, `대기가 돈다 ${h.as.ucd}`);
  assert(gi.t < U.life && gi.t > U.life - 2, `시간이 돈다 ${gi.t}`);
  run(g, 30);
  assert.equal(h.as.gi, null, '30초 뒤 사라진다');
});
