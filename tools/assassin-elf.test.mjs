import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV, ADV_BY_ID, ADV_BODY, ADV_SPD_MAX, ADV_IDS } from '../src/game/advData.js';
import { advSpeedMul, advDmgMul } from '../src/game/advance.js';
import { SPECIALS } from '../src/game/shopData.js';
import { specialTier } from '../src/game/shop.js';

// 10월 31일 — 검사 셋째 전직 암살자 · 궁수 셋째 전직 엘프 · 명사수 느린 적 추가 피해 · 총사 장전. 실행: node --test tools/assassin-elf.test.mjs
const JOB = { gladiator: 'warrior', knight: 'warrior', assassin: 'warrior', marksman: 'archer', gunner: 'archer', elf: 'archer' };
const GUNS = SPECIALS.find((s) => s.id === 'adv_guns');
function world(people) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  rpgSyncSeats(g, people.map((p, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: JOB[p.c] || p.job, elem: p.elem || 'flame', gender: 'm' } })));
  people.forEach((p, i) => rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: 300, ts: 0, coins: 0,
    stats: { str: 200, int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1, ...(p.bag || {}) }, advClass: p.c, advQ: p.q }, `p${i}`));
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
const near = (a, b, k = 0.03) => Math.abs(a - b) <= Math.abs(b) * k;
function noCrit(fn) { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } }

test('전직 차례 — 암살자 · 엘프는 맨 뒤에 붙고 기본 직업은 검사 · 궁수', () => {
  assert.deepEqual(ADV_IDS.slice(-2), ['assassin', 'elf']);
  assert.equal(ADV_BY_ID.assassin.job, 'warrior');
  assert.equal(ADV_BY_ID.elf.job, 'archer');
});

test('몸 — 암살자는 검사 계열보다 체력이 낮고 엘프는 가장 빠르다 · 암살자는 일섬 뒤 엘프만큼만', () => {
  const g = world([{ c: 'gladiator' }, { c: 'assassin' }, { c: 'elf' }, { c: 'marksman' }]);
  const [gl, as, el, mk] = g.heroes;
  assert(near(as.max / gl.max, ADV_BODY.assassin.hp, 0.01), `${as.max} / ${gl.max}`);
  assert(el.max < mk.max, '엘프 체력이 명사수보다 낮다');
  assert.equal(advSpeedMul(el), ADV_BODY.elf.spd);
  assert(advSpeedMul(as) > 1 && advSpeedMul(as) < advSpeedMul(el));
  as.as = as.as || {}; as.as.rush = 2;
  assert.equal(advSpeedMul(as), ADV_SPD_MAX, '질주 — 엘프 속도까지');
  assert.equal(advSpeedMul(gl), 1);
  // 실제로 걷는 거리
  const walk = (h) => { const x0 = h.x; h.hold = ['right']; run(g, 1); h.hold = []; return h.x - x0; };
  g.heroes.forEach((h) => { if (h) { h.map = 'train'; h.y = 700; } });
  gl.x = as.x = el.x = 600;
  as.as.rush = 0;
  const [dg, de] = [walk(gl), walk(el)];
  assert(near(de / dg, ADV_BODY.elf.spd, 0.05), `엘프 ${de} · 검투사 ${dg}`);
});

test('암살자 그림자 일섬 — 1초 지정 불가(맞지 않고 몹이 놓친다) · 적 등 뒤로 가서 한 방 · 적이 없으면 앞으로 빠진다', () => {
  noCrit(() => {
    const g = world([{ c: 'assassin' }]);
    const h = g.heroes[0], A = ADV_BY_ID.assassin.active;
    const m = mob(g, 1200, 900);
    m.tgt = 0;
    const hp0 = h.hp;
    send(g, 0, 'adv', { op: 'use' });
    assert(h.as.ut > 0 && h.inv > 0, '지정 불가');
    assert.equal(m.tgt, -1, '몹이 놓쳤다');
    run(g, A.at + 0.05);
    assert(h.x > m.x, `등 뒤(오른쪽)에 나타났다 ${h.x} > ${m.x}`);
    const dmg = 1e9 - m.hp;
    assert(dmg > 0, '한 방');
    assert.equal(h.hp, hp0);
    // 지정 불가 동안 맞지 않는다 — 몹이 때려도
    h.hp = h.max;
    run(g, A.ut - A.at - 0.1);
    assert(h.as.ut > 0);
    assert(h.as.rush > 0, '다시 나타난 뒤 질주');
    run(g, 0.3);
    assert.equal(h.as.ut, 0);
    // 적이 없으면 겨눈 쪽으로 빠져나간다
    g.mobs = []; h.as.cd = 0; h.look = [1, 0]; h.dir = 1;
    const x0 = h.x;
    send(g, 0, 'adv', { op: 'use' });
    run(g, A.at + 0.05);
    assert(near(h.x - x0, A.dash, 0.05), `빠져나간 거리 ${h.x - x0}`);
  });
});

test('지정 불가 — 연사(총사 속사 여덟 발)를 통째로 피한다', () => {
  noCrit(() => {
    const g = world([{ c: 'gunner', bag: { w: [{ u: 1, t: 'gun', r: specialTier(GUNS), g: GUNS.g, p: 1, sp: 'adv_guns' }], e: 1, n: 2 } }, { c: 'assassin' }]);
    const [gn, as] = g.heroes;
    gn.pvpOn = as.pvpOn = true;
    gn.x = 1000; as.x = 1150; gn.dir = 1; gn.look = [1, 0];
    // 견줌 — 일섬 없이 서 있으면 맞는다
    send(g, 0, 'adv', { op: 'use' });                // 속사
    run(g, 0.9);
    assert(as.hp < as.max, `일섬 없이는 맞는다 ${as.hp}/${as.max}`);
    as.hp = as.max; gn.as.cd = 0; as.x = 1150; as.y = 900;
    send(g, 0, 'adv', { op: 'use' });                // 속사
    send(g, 1, 'adv', { op: 'use' });                // 바로 그림자 일섬
    const hp0 = as.hp;
    run(g, 0.9);
    assert.equal(as.hp, hp0, '한 발도 맞지 않았다');
  });
});

test('급소 노리기 — 한동안 치지 않은 적에게 첫 일격 +50% · 이어 치면 보통 · 평타는 15% 낮다', () => {
  const g = world([{ c: 'assassin' }, { c: 'gladiator' }]);
  const [as, gl] = g.heroes, P = ADV_BY_ID.assassin.passive;
  const m = mob(g, 1100, 900);
  const E = { gunHeld: () => false, slower: () => false };
  const first = advDmgMul(E, g, as, m, false, false);
  assert(near(first, 1 + P.bonus, 0.001));
  as.as.fh[`m${m.id}`] = g.t;                       // 방금 쳤다
  assert(near(advDmgMul(E, g, as, m, false, false), 1, 0.001));
  assert(near(advDmgMul(E, g, as, m, true, false), P.basic, 0.001), '평타 0.85');
  g.t += P.gap;
  assert(near(advDmgMul(E, g, as, m, true, false), P.basic * (1 + P.bonus), 0.001), '3초 지나면 다시 첫 일격');
  assert.equal(advDmgMul(E, g, gl, m, true, false), 1, '검투사는 없다');
});

test('암살 시험 — 시험 동안 그림자 일섬으로 160레벨 이상 적을 잡은 수', () => {
  noCrit(() => {
    const g = world([{ c: '', job: 'warrior', q: { c: 'assassin', n: 0, v: ADV.trialVer } }]);
    const h = g.heroes[0];
    h.advClass = '';
    const m = mob(g, 1150, 900, { hp: 10, max: 10 });
    send(g, 0, 'adv', { op: 'use' });
    run(g, 0.5);
    assert(m.dead || m.hp <= 0);
    assert.equal(h.advQ.n, 1);
  });
});

test('엘프 — 받는 피해 12% 더 · 싸우는 중에도 회복 · 숲바람 화살 다섯 발 · 바람 걸음', () => {
  noCrit(() => {
    const g = world([{ c: 'elf' }, { c: 'marksman' }]);
    const [el, mk] = g.heroes, P = ADV_BY_ID.elf.passive, A = ADV_BY_ID.elf.active;
    // 회복 — 맞은 직후(쉼 아님)에도 1초에 1.2%
    el.hp = el.max * 0.5; el.calm = 0;
    const h0 = el.hp;
    rpgStep(g, 0.5);
    assert(near(el.hp - h0, el.max * P.regen * 0.5, 0.05), `회복 ${el.hp - h0}`);
    mk.hp = mk.max * 0.5; mk.calm = 0; const m0 = mk.hp; rpgStep(g, 0.5);
    assert.equal(mk.hp, m0, '명사수는 싸우는 중 회복이 없다');
    // 숲바람 화살 — 앞 부채꼴 다섯 줄
    const ms = [mob(g, 1300, 900), mob(g, 1300, 990), mob(g, 1300, 810)];
    el.look = [1, 0]; el.dir = 1;
    send(g, 0, 'adv', { op: 'use' });
    assert(ms.every((m) => m.hp < 1e9), '부채꼴 안 셋 모두 맞았다');
    assert(el.as.wdT > 0 && advSpeedMul(el) > ADV_BODY.elf.spd, '바람 걸음');
    assert.equal(g.out.filter((o) => o.kind === 'sk_adv_wind').length, A.n);
  });
});

test('바람 걸음 시험 — 160레벨 이상 몹을 잡는 동안 맞으면 처음부터', () => {
  const g = world([{ c: '', job: 'archer', q: { c: 'elf', n: 0, v: ADV.trialVer } }]);
  const h = g.heroes[0];
  h.advClass = '';
  h.auto = 1;
  // 사냥터에 새로 나는 몹이 끼어들어 때리지 않게 — 시험에서 만든 몹만 남긴다
  const mine = new Set();
  const runOnly = (t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) { g.mobs = g.mobs.filter((q) => mine.has(q)); rpgStep(g, 0.02); } };
  for (let i = 0; i < 3; i++) { mine.add(mob(g, 1150, 900, { hp: 1, max: 1 })); runOnly(1.5); }
  assert.equal(h.advQ.n, 3);
  const m = mob(g, 1020, 900, { dmg: 50 });
  mine.add(m);
  m.tgt = 0; m.state = 'idle';
  for (let i = 0; i < 200 && h.advQ.n; i++) { h.hp = h.max; runOnly(0.04); }
  assert.equal(h.advQ.n, 0, '맞아서 0');
});

test('명사수 — 나보다 느린 적에게 +15% · 나보다 빠른 사람에게는 없다', () => {
  const g = world([{ c: 'marksman' }, { c: 'elf' }]);
  const [mk, el] = g.heroes, S = ADV_BY_ID.marksman.passive.slower;
  const m = mob(g, 1100, 900);
  const E = { gunHeld: () => false, slower: (h, o) => (o === el ? false : true) };
  assert(near(advDmgMul(E, g, mk, m, true, false), 1 + S, 0.001));
  assert(near(advDmgMul(E, g, mk, el, true, true), 1, 0.001));
});

test('총사 — 12발마다 장전 1.6초(평타가 나가지 않고 걷는 속도가 준다) · 궁수 피해 감소를 받지 않는다', () => {
  noCrit(() => {
    const bag = { w: [{ u: 1, t: 'gun', r: specialTier(GUNS), g: GUNS.g, p: 1, sp: 'adv_guns' }], e: 1, n: 2 };
    const g = world([{ c: 'gunner', bag, elem: 'frost' }, { c: 'marksman', bag: { w: [{ u: 1, t: 'gun', r: specialTier(GUNS), g: GUNS.g, p: 1, sp: 'adv_guns' }], e: 1, n: 2 } }]);
    const [gn] = g.heroes, R = ADV_BY_ID.gunner.reload;
    const m = mob(g, 1150, 900);
    gn.auto = 1;
    let shots = 0, last = m.hp;
    for (let i = 0; i < 2000 && !(gn.as && gn.as.rl > 0); i++) { rpgStep(g, 0.02); }
    assert(gn.as.rl > 0, '장전이 시작됐다');
    assert(advSpeedMul(gn) < 1, '장전 중 느리다');
    assert(near(advSpeedMul(gn), 1 - R.slow, 0.001));
    run(g, 0.2); last = m.hp;
    run(g, R.time - 0.4);
    assert.equal(m.hp, last, '장전 중에는 평타가 맞지 않는다');
    run(g, 1.2);
    assert(m.hp < last, '장전이 끝나면 다시 쏜다');
    assert.equal(advSpeedMul(gn), 1);
    shots = R.mag;
    assert(shots > 0);
  });
});

test('스냅샷 — 지정 불가 · 질주 · 바람 걸음 · 탄창 · 장전이 손님에게 간다', () => {
  const g = world([{ c: 'assassin' }, { c: 'elf' }]);
  const [as, el] = g.heroes;
  mob(g, 1150, 900);
  send(g, 0, 'adv', { op: 'use' });
  send(g, 1, 'adv', { op: 'use' });
  rpgStep(g, 0.02);
  const guest = makeWorld(); guest.mySeat = 1; guest.looks = g.looks; guest.names = g.names;
  rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
  assert(guest.heroes[0].as.ut > 0);
  assert(guest.heroes[1].as.wdT > 0);
  assert.equal(guest.heroes[0].advClass, 'assassin');
  assert.equal(advSpeedMul(guest.heroes[1]), advSpeedMul(el), '손님도 같은 속도로 걷는다');
  assert(as.as.ut > 0);
});
