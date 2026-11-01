import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgPromote, rpgUseSkill, rpgDash, rpgSkill, physMul } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ABYSS, SHARD, ABYSS_REWARD } from '../src/game/abyssData.js';
import { CARDS, CARD_BY_N, GRACE, ELITE, eliteCount, cardText, tierVal } from '../src/game/abyssCardData.js';
import { acAtkMul, acTake, V } from '../src/game/abyssCards.js';

// 심연의 탑 강화 카드(abyssCardData.js · abyssCards.js). 실행: node --test tools/abyss-cards.test.mjs
function world(people, job = 'warrior') {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  const seats = people.map((p, i) => ({ id: `p${i}`, name: `탑${i}`, hero: { name: `탑${i}`, job: p.job || job, elem: 'flame', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: `탑${i}`, rs: RESET.id, gift: GIFT.id, lv: 800, ts: 0, coins: 1e6, stats: {}, bag: { oc: 1, w: [], n: 1, m: {} } }, `p${i}`));
  g.heroes.forEach((h) => { if (h) { h.pty = people.length > 1 ? 1 : 0; h.map = 'plaza'; h.x = ABYSS.gate.x; h.y = ABYSS.gate.y + 50; } });
  return g;
}
const send = (g, pi, dir) => rpgInput(g, { cls: pi, kind: 'abyss', dir });
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.05); i++) rpgStep(g, 0.05); };
// 층을 깬다 — 탑은 카드 단계(pick)로 멈춘다
const clearFloor = (g, r) => { g.mobs.forEach((m) => { if (m.map === r.map) m.dead = true; }); run(g, 0.1); };
// 남은 선택을 모두 고르고(카드 첫 장 · 저주 거절) 다음 층이 열릴 때까지
function pickRest(g) {
  for (let k = 0; k < 9; k++) g.heroes.forEach((h) => { if (h && h.ac && h.ac.o.length) send(g, h.pi, h.ac.ok ? { op: 'curse', i: -1 } : { op: 'card', i: 0 }); });
  run(g, GRACE.startWait + 0.2);
}
const advance = (g, r) => { clearFloor(g, r); pickRest(g); };

test('수치 — 200장 · 번호 · 등급 값(브론즈 1/3 · 골드 2/3 · 다이아 그대로)', () => {
  assert.equal(CARDS.length, 200);
  for (let n = 1; n <= 200; n++) assert(CARD_BY_N[n], `카드 ${n}`);
  assert.deepEqual(CARD_BY_N[1].tv, [3, 5, 8]);
  assert.deepEqual(CARD_BY_N[6].tv, [5, 10, 15]);
  assert.deepEqual(CARD_BY_N[61].tv, [0.3, 0.7, 1]);
  assert.equal(tierVal(12, 1), 4);
  assert.equal(CARDS.filter((c) => c.curse).length, 30);
  for (const c of CARDS) for (const t of [1, 2, 3]) { const s = cardText(c.n, t); assert(s && !s.includes('{v}') && !s.includes('undefined') && !s.includes('NaN'), `${c.n} ${s}`); }
  assert.equal(eliteCount(1), 0);
  assert.equal(eliteCount(ELITE.from), 1);
  assert.equal(eliteCount(300), ELITE.max);
});

test('고르기 — 들어가면 한 장, 같은 카드를 다시 고르면 브론즈 → 골드 → 다이아, 다이아는 더 나오지 않는다', () => {
  const g = world([{}]);
  const h = g.heroes[0];
  send(g, 0, { op: 'enter' });
  assert(h.ac, '탑에 들어가면 카드 상태가 생긴다');
  assert.equal(h.ac.o.length, GRACE.offer);
  assert.equal(h.ac.ok, 0);
  const n = h.ac.o[0];
  send(g, 0, { op: 'card', i: 0 });
  assert.equal(h.ac.c[n], 1);
  assert.equal(h.ac.o.length, 0, '남은 고르기가 없으면 선택지가 비어 있다');
  for (let t = 2; t <= 3; t++) { h.ac.q = 1; h.ac.o = [n, ...h.ac.o.slice(1)]; send(g, 0, { op: 'card', i: 0 }); assert.equal(h.ac.c[n], t); }
  h.ac.q = 1; h.ac.o = []; h.ac.v++;
  for (let k = 0; k < 40; k++) {                  // 다이아가 된 카드는 선택지에 나오지 않는다
    h.ac.o = []; h.ac.q = 1;
    send(g, 0, { op: 'reroll' }); // 새로고침 0회면 아무 일도 없다
    h.ac.rr = 1; h.ac.o = [1]; send(g, 0, { op: 'reroll' });
    assert(!h.ac.o.includes(n));
  }
});

test('층을 깨면 카드 한 장 · 5층마다 저주 선택, 저주를 받으면 한 장 더 · 거절하면 그대로', () => {
  const g = world([{}]);
  const h = g.heroes[0];
  send(g, 0, { op: 'enter' });
  pickRest(g);
  const r = g.aruns[0];
  assert.equal(r.f, 1);
  for (let f = 1; f <= 4; f++) { clearFloor(g, r); assert.equal(h.ac.ok, 0); assert.equal(h.ac.o.length, GRACE.offer); pickRest(g); }
  clearFloor(g, r);                                // 5층 — 저주가 먼저
  assert.equal(h.ac.ok, 1);
  assert.equal(h.ac.o.length, GRACE.curseOffer);
  const curse = h.ac.o[1];
  send(g, 0, { op: 'curse', i: 1 });
  assert.equal(h.ac.c[curse], 1);
  assert(CARD_BY_N[curse].curse);
  assert.equal(h.ac.ok, 0);
  assert.equal(h.ac.q, 2, '층 카드 1 + 저주 보너스 1');
  pickRest(g);
  for (let f = 6; f <= 9; f++) advance(g, r);
  clearFloor(g, r);
  assert.equal(h.ac.ok, 1, '10층 저주');
  const before = h.ac.q;
  send(g, 0, { op: 'curse', i: -1 });
  assert.equal(h.ac.q, before, '거절하면 더 고르지 않는다');
  assert.equal(h.ac.ok, 0);
});

test('카드 단계 — 모두 고를 때까지 멈추고, 20초가 지나면 무작위로 고르고, 다 고르면 3초 뒤 시작', () => {
  const g = world([{}, {}]);
  const [a, b] = g.heroes;
  send(g, 0, { op: 'enter' });
  const r = g.aruns[0];
  assert.equal(r.phase, 'pick');
  assert(a.ac.o.length && b.ac.o.length);
  send(g, 0, { op: 'card', i: 0 });
  run(g, 10);
  assert.equal(r.phase, 'pick', '한 사람이 남아 있으면 멈춰 있다');
  assert.equal(r.f, 0);
  assert(g.mobs.every((m) => m.map !== r.map), '몹도 나오지 않는다');
  run(g, GRACE.pickTime - 10 + 0.2);
  assert.equal(Object.keys(b.ac.c).length, 1, '시간이 지나 무작위로 골랐다');
  assert.equal(r.phase, 'next');
  run(g, GRACE.startWait - 0.5);
  assert.equal(r.f, 0, '3초가 되기 전에는 시작하지 않는다');
  run(g, 0.7);
  assert.equal(r.f, 1);
  assert.equal(r.phase, 'go');
  clearFloor(g, r);
  assert.equal(r.phase, 'pick');
  const t1 = r.t;
  run(g, 5);
  assert.equal(r.t, t1, '멈춘 동안 층 시간도 흐르지 않는다');
  pickRest(g);
  // 저주는 시간이 지나면 거절한다
  while (!(a.ac.ok === 1)) advance(g, r);
  const had = Object.keys(a.ac.c).length;
  send(g, 1, b.ac.ok ? { op: 'curse', i: -1 } : { op: 'card', i: 0 });
  run(g, GRACE.pickTime + 0.2);
  assert.equal(Object.keys(a.ac.c).length, had, '저주는 받지 않았다');
});

test('카드 단계 — 탑 안의 몹이 남아 있어도 움직이거나 때리지 못하고, 3초 대기가 끝나야 다시 움직인다', () => {
  const g = world([{}, {}]);
  const [a] = g.heroes;
  send(g, 0, { op: 'enter' });
  const r = g.aruns[0];
  pickRest(g);
  assert.equal(r.phase, 'go');
  const src = g.mobs.find((m) => m.map === r.map);
  const keep = { ...src, id: 99999, x: a.x + 30, y: a.y, state: 'idle', t: 0, dmg: (src.dmg || 1) * 10 };
  clearFloor(g, r);
  assert.equal(r.phase, 'pick');
  g.mobs.push(keep);                               // 고르는 동안 몹이 남았다고 친다
  const hp = a.hp, x = keep.x, y = keep.y;
  run(g, 5);
  assert.equal(a.hp, hp, '고르는 동안 피해를 받지 않는다');
  assert.equal(keep.x, x); assert.equal(keep.y, y);
  g.heroes.forEach((h) => { if (h && h.ac && h.ac.o.length) send(g, h.pi, h.ac.ok ? { op: 'curse', i: -1 } : { op: 'card', i: 0 }); });
  run(g, 0.1);
  assert.equal(r.phase, 'next');
  run(g, GRACE.startWait - 0.5);
  assert.equal(a.hp, hp, '3초 대기 동안에도 멈춰 있다');
  assert.equal(keep.x, x);
});

test('효과 — 공격력 · 받는 피해 · 체력 비율 유지 · 탑을 나오면 사라진다', () => {
  const g = world([{}]);
  const h = g.heroes[0];
  send(g, 0, { op: 'enter' });
  const base = physMul(h);
  h.ac.c[1] = 3; h.ac.c[171] = 1;                 // +8% · -3%
  assert(Math.abs(acAtkMul(h) - 1.05) < 1e-9);
  assert(Math.abs(physMul(h) / base - 1.05) < 1e-6);
  h.ac.c = { 43: 3 };
  assert(Math.abs(acTake(g, h, 1000, null) - 950) < 1e-6);
  h.ac.c = { 42: 3 };                             // 방어력 +12% → ÷1.12
  assert(Math.abs(acTake(g, h, 1120, null) - 1000) < 1e-6);
  h.ac.c = { 178: 3 };                            // 방어력 -20% → ×1.2
  assert(Math.abs(acTake(g, h, 1000, null) - 1200) < 1e-6);
  h.ac.c = { 59: 3 };
  assert(acTake(g, h, h.max * 9, null) <= h.max * 0.4 + 1e-6);
  const max0 = h.max;
  h.hp = Math.round(max0 / 2);
  h.ac.c = {}; h.ac.q = 1; h.ac.o = [41]; h.ac.ok = 0;
  send(g, 0, { op: 'card', i: 0 });
  assert(h.max > max0);
  assert(Math.abs(h.hp / h.max - 0.5) < 0.01, '현재 체력 비율 유지');
  send(g, 0, { op: 'leave' });
  run(g, 0.1);
  assert.equal(h.ac, null);
  assert.equal(h.max, max0);
});

test('정예 · 층 파편 카드', () => {
  const g = world([{}]);
  const h = g.heroes[0];
  send(g, 0, { op: 'enter' });
  pickRest(g);
  const r = g.aruns[0];
  // 정예
  while (r.f < ELITE.from) advance(g, r);
  assert.equal(g.mobs.filter((m) => !m.dead && m.map === r.map && m.elite).length, eliteCount(r.f));
  // 층계 수당 다이아 +15% — 소수는 확률로 끊는다
  h.ac.c = { 162: 3 };
  const s0 = h.bag.m[SHARD] || 0, f = r.f;
  advance(g, r);
  const got = h.bag.m[SHARD] - s0, n = ABYSS_REWARD.floor(f);
  assert(got >= Math.floor(n * 1.15) && got <= Math.ceil(n * 1.15), `${got}`);
});

test('스냅샷 — 손님이 카드 · 선택지 · 정예를 받고, 방장이 바뀌어도 이어진다', () => {
  const g = world([{}, {}]);
  send(g, 0, { op: 'enter' });
  const h = g.heroes[0];
  pickRest(g);
  while (g.aruns[0].f < ELITE.from) advance(g, g.aruns[0]);
  clearFloor(g, g.aruns[0]); pickRest(g);
  advance(g, g.aruns[0]);
  h.ac.c[5] = 2; h.ac.c[172] = 1; h.ac.sh = 120; h.ac.shT = 5;
  const s = JSON.parse(JSON.stringify(rpgPack(g)));
  const c = makeWorld(); c.mySeat = 1;
  rpgSyncSeats(c, [{ id: 'p0', name: '탑0', hero: { name: '탑0', job: 'warrior', elem: 'flame', gender: 'm' } }, { id: 'p1', name: '탑1', hero: { name: '탑1', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgApply(c, s);
  const gh = c.heroes[0];
  assert(gh.ac);
  assert.equal(gh.ac.c[5], 2);
  assert.equal(gh.ac.c[172], 1);
  assert.deepEqual(gh.ac.o, h.ac.o);
  assert.equal(gh.ac.sh, 120);
  assert(c.mobs.some((m) => m.elite), '정예가 손님에게도');
  rpgPromote(c);
  assert(c.heroes[0].ac && c.heroes[0].ac.c[5] === 2);
  assert(c.mobs.some((m) => m.elite && m.max > 100), '방장 승계 뒤에도 정예');
  const s2 = rpgPack(g); delete s2.ac;            // 옛 방장(ac 줄 없음)
  rpgApply(c, s2);
  assert(c.heroes[0].ac, 'ac 줄이 없으면 그대로 둔다');
});

test('200장을 모두 다이아로 들고 싸워도 멈추지 않는다 — 직업 셋', () => {
  for (const job of ['warrior', 'mage', 'archer']) {
    const g = world([{}, {}], job);
    send(g, 0, { op: 'enter' });
    pickRest(g);
    const r = g.aruns[0];
    for (const h of g.heroes.filter(Boolean)) { h.ac.c = Object.fromEntries(CARDS.map((c) => [c.n, 3])); h.auto = true; h.ac.ch = 1; }
    for (let k = 0; k < 6; k++) {
      const h = g.heroes[0];
      const m = g.mobs.find((q) => !q.dead && q.map === r.map);
      if (m) { h.x = m.x - 60; h.y = m.y; }
      g.mobs.forEach((q) => { if (q.map === r.map) q.dmg = 1; });   // 쓰러지면 광장으로 나가 카드가 사라진다 — 몹을 약하게
      run(g, 1.5);
      rpgSkill(g, 0); rpgDash(g, 0, [1, 0]); rpgDash(g, 0, [-1, 0]);
      for (const id of Object.keys(h.scd || {})) rpgUseSkill(g, 0, id);
      if (k % 2) advance(g, r);
    }
    for (const h of g.heroes.filter(Boolean)) { assert(Number.isFinite(h.hp) && Number.isFinite(h.max), `${job} 체력 ${h.hp}/${h.max}`); assert(V(h, 1) === 8); }
    for (const m of g.mobs) assert(Number.isFinite(m.hp), `${job} 몹 체력`);
  }
});
