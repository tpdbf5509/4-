import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV_BY_ID } from '../src/game/advData.js';
import { advSpeedMul, advCanExecute, packAdv, applyAdv } from '../src/game/advance.js';
import { buffLeft } from '../src/game/shop.js';

// 11월 2일 — 암살자 처형(13%) · 스킬로 쓰러뜨리면 질주 · 투명화. 실행: node --test tools/assassin-exec.test.mjs
const X = ADV_BY_ID.assassin.execute, A = ADV_BY_ID.assassin.active;
function world(people) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, people.map((p, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: p.job || 'warrior', elem: 'flame', gender: 'm' } })));
  people.forEach((p, i) => rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: 300, ts: 0, coins: 0,
    stats: { str: 200, int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1 }, advClass: p.c }, `p${i}`));
  g.mobs = [];
  g.heroes.forEach((h) => { if (h) { h.map = 'skeletal'; h.x = 1000; h.y = 900; h.auto = 0; } });
  return g;
}
const TEMPLATE = makeWorld().mobs.find((q) => q.map === 'skeletal' && !q.boss);
function mob(g, x, y, extra = {}) {
  const m = { ...TEMPLATE, dmg: 0 };
  Object.assign(m, { id: g.nextId++, map: 'skeletal', x, y, hx: x, hy: y, lv: 220, hp: 1e9, max: 1e9, gi: -1, tgt: -1, state: 'idle', stun: 0, slow: 0, freeze: 0, burn: 0, poison: 0, shred: 0, shredAmt: 0, bdps: 0, pdps: 0, hitBy: [], ...extra });
  g.mobs.push(m);
  return m;
}
const send = (g, pi, kind, dir) => rpgInput(g, { cls: pi, kind, dir });
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) rpgStep(g, 0.02); };
function noCrit(fn) { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } }

test('처형 — 그림자 일섬이 맞은 뒤 13% 이하면 쓰러진다 · 그보다 많으면 남는다', () => {
  noCrit(() => {
    const g = world([{ c: 'assassin' }]);
    const h = g.heroes[0];
    const m = mob(g, 1150, 900, { hp: 0.5e9 });
    send(g, 0, 'adv', { op: 'use' });
    run(g, A.at + 0.05);
    assert(!m.dead && m.hp > X.pct * m.max, '절반 체력은 처형하지 않는다');
    h.as.cd = 0; g.t += 10;
    m.hp = Math.round(X.pct * m.max) + 10;          // 한 방 뒤면 13% 아래로 내려간다
    send(g, 0, 'adv', { op: 'use' });
    run(g, A.at + 0.05);
    assert(m.dead, `처형 ${m.hp}`);
  });
});

test('스킬로 쓰러뜨리면 질주 · 투명화(몹이 놓친다) · 스냅샷으로 손님에게 간다', () => {
  noCrit(() => {
    const g = world([{ c: 'assassin' }]);
    const h = g.heroes[0];
    const m = mob(g, 1150, 900, { hp: 10, max: 10 });
    const other = mob(g, 1500, 900); other.tgt = 0;
    send(g, 0, 'adv', { op: 'use' });
    run(g, A.at + 0.05);
    assert(m.dead);
    assert(h.as.kr > 0, '질주');
    assert(buffLeft(h, 'hide'), '투명화');
    assert(Math.abs(h.bf.hide.t - X.hide) < 0.2);
    assert.equal(other.tgt, -1, '다른 몹도 놓친다');
    assert.equal(advSpeedMul(h), X.spd, '처치 뒤 속도');
    const copy = { job: 'warrior' }; applyAdv(copy, packAdv(h));
    assert(Math.abs(copy.as.kr - h.as.kr) < 0.11, '손님도 같은 속도');
    run(g, X.run + 0.1);
    assert.equal(h.as.kr, 0);
    assert(advSpeedMul(h) < X.spd);
  });
});

test('던전 보스 · 허수아비 · 평타 · 다른 직업은 처형하지 않는다 · 직업 스킬은 한다', () => {
  const g = world([{ c: 'assassin' }, { c: 'gladiator' }]);
  const [as, gl] = g.heroes;
  const m = { type: 'skeleton', hp: 10, max: 100 };
  as.cast = { raw: 0 };
  assert.equal(advCanExecute(as, m, 10, 100), false, '평타 · 다른 스킬');
  as.cast = { raw: 0, job: 1 };
  assert.equal(advCanExecute(as, m, 10, 100), true, '직업 스킬');
  assert.equal(advCanExecute(as, m, 14, 100), false, '14%');
  assert.equal(advCanExecute(as, { ...m, boss: 1, gi: -1 }, 10, 100), false, '던전 보스');
  assert.equal(advCanExecute(as, { ...m, boss: 1, gi: 3 }, 10, 100), true, '사냥터 보스');
  assert.equal(advCanExecute(as, { ...m, type: 'dummy' }, 10, 100), false, '허수아비');
  gl.cast = { raw: 0, adv: 1 };
  assert.equal(advCanExecute(gl, m, 10, 100), false, '검투사');
});

test('PvP — 상대 체력이 13% 이하로 내려가면 처형', () => {
  noCrit(() => {
    const g = world([{ c: 'assassin' }, { c: 'gladiator' }]);
    const [as, gl] = g.heroes;
    as.pvpOn = gl.pvpOn = true;
    gl.x = 1150;
    gl.hp = Math.round(gl.max * X.pct) + 1;
    send(g, 0, 'adv', { op: 'use' });
    run(g, A.at + 0.05);
    assert(gl.down > 0, `쓰러졌다 ${gl.hp}/${gl.max}`);
    assert(as.as.kr > 0, '질주');
  });
});
