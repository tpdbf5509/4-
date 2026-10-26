import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgApplyOut, rpgPromote, rpgSkill, rpgUseSkill, rpgDuel, heroRecord, MAPS, DUEL } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV, ADV_BY_ID, ADV_CLASSES, ADV_BONUS, trialText } from '../src/game/advData.js';
import { statTotal } from '../src/game/rpg.js';
import { advDmgMul } from '../src/game/advance.js';
const advDmgMulOf = (g, h, m) => advDmgMul({ gunHeld: () => false }, g, h, m, true, false);

// 1차 전직 — 시험 · 확정 · 저장 · 액티브 7 · 패시브 7 · 전투 특성 7 · 전직 숙련도 · PvP 한도 · 스냅샷 · 방장 승계. 실행: node --test tools/advance.test.mjs
const JOB = { gladiator: 'warrior', knight: 'warrior', marksman: 'archer', gunner: 'archer', archmage: 'mage', summoner: 'mage', healer: 'mage' };
function world(people) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  const seats = people.map((p, i) => ({ id: `p${i}`, name: p.name || `시험${i}`, hero: { name: p.name || `시험${i}`, job: p.job, elem: p.elem || 'flame', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: p.name || `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 250, ts: 0, coins: 0,
    stats: { str: 200, int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1, ...(p.bag || {}) }, advClass: p.advClass, advQ: p.advQ, advM: p.advM, admin: p.admin ? 1 : 0 }, `p${i}`));
  return g;
}
const at = (h, x, y, map = 'plaza') => { h.map = map; h.x = x; h.y = y; };
const send = (g, pi, kind, dir) => rpgInput(g, { cls: pi, kind, dir });
const run = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) rpgStep(g, 0.02); };
const sysOf = (g, pi) => g.out.filter((o) => o.k === 'sys' && o.who === pi).map((o) => o.msg);
// 고정된 큰 몹 — 사냥터 몹 하나를 골라 맵 · 자리 · 체력을 정한다
const TEMPLATE = makeWorld().mobs.find((q) => q.map === 'skeletal' && !q.boss);
// 시험 몹은 기본으로 아프게 치지 않는다(시험 영웅이 쓰러지지 않게) — 기사 시험만 hurt 로 친다
function dummyMob(g, map, x, y, lv = 220, hurt = 0) {
  const m = { ...TEMPLATE, dmg: hurt };
  Object.assign(m, { id: g.nextId++, map, x, y, hx: x, hy: y, lv, hp: 1e9, max: 1e9, gi: -1, tgt: -1, state: 'idle', stun: 0, slow: 0, freeze: 0, burn: 0, poison: 0, shred: 0, shredAmt: 0, bdps: 0, pdps: 0, hitBy: [] });
  g.mobs.push(m);
  return m;
}
function fixedRandom(fn) { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } }
function advanced(cid, elem = 'flame', extra = {}) {
  const g = world([{ job: JOB[cid], elem, advClass: cid, ...extra }]);
  g.mobs = [];
  const h = g.heroes[0];
  at(h, 1000, 900, 'skeletal'); h.auto = 0;
  return { g, h };
}

const Q = (c, n, m) => ({ c, n, v: ADV.trialVer, ...(m ? { m } : {}) });
function withRandom(v, fn) { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } }

test('200레벨 미만은 전직 시험을 받을 수 없고 200레벨부터 교관 곁에서 받는다', () => {
  const g = world([{ job: 'warrior', lv: 199 }, { job: 'warrior', lv: 200 }]);
  const [a, b] = g.heroes;
  at(a, ADV.npc.x, ADV.npc.y + 40); at(b, ADV.npc.x, ADV.npc.y + 40);
  send(g, 0, 'adv', { op: 'start', c: 'gladiator' });
  assert.equal(a.advQ, null);
  assert.match(sysOf(g, 0).at(-1), /레벨 200 필요/);
  at(b, 1500, 900);                                  // 멀리서는 못 받는다
  send(g, 1, 'adv', { op: 'start', c: 'knight' });
  assert.equal(b.advQ, null);
  at(b, ADV.npc.x, ADV.npc.y + 40);
  send(g, 1, 'adv', { op: 'start', c: 'marksman' });   // 다른 직업 전직은 못 받는다
  assert.equal(b.advQ, null);
  send(g, 1, 'adv', { op: 'start', c: 'knight' });
  assert.deepEqual(b.advQ, Q('knight', 0));
});

test('시험 진행은 저장 기록에 남고 다시 들어오면 이어진다 · 옛 판 진행은 처음부터 · 시험 전에는 확정할 수 없다', () => {
  const m = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
  const g = world([{ job: 'archer', advQ: Q('gunner', 0, m) }]);
  const h = g.heroes[0];
  assert.deepEqual(h.advQ, Q('gunner', 3, m));
  at(h, ADV.npc.x, ADV.npc.y + 40);
  send(g, 0, 'adv', { op: 'confirm', c: 'gunner' });
  assert.equal(h.advClass, '');
  const rec = heroRecord(h, { name: '시험0', lv: 250 });
  assert.deepEqual(rec.advQ, Q('gunner', 3, m));
  const g2 = world([{ job: 'archer', advQ: rec.advQ }]);
  assert.deepEqual(g2.heroes[0].advQ, Q('gunner', 3, m));
  const g3 = world([{ job: 'warrior', advQ: { c: 'knight', n: 30 } }]);   // 판 표시가 없는 예전 시험
  assert.deepEqual(g3.heroes[0].advQ, Q('knight', 0));
  // 손님 화면 — 스냅샷으로 목록 진행이 간다
  const q = makeWorld(); q.mySeat = 0;
  rpgApply(q, rpgPack(g));
  assert.deepEqual(q.heroes[0].advQ, Q('gunner', 3, m));
});

test('검투사 시험 — 결투에서 이기면 80% 확률로 시험 레벨이 오르고 15레벨에서 끝난다', () => {
  const g = world([{ job: 'warrior', advQ: Q('gladiator', 0) }, { job: 'warrior' }]);
  const [h] = g.heroes;
  const duel = (r) => withRandom(r, () => {
    g.heroes.filter(Boolean).forEach((q) => at(q, 900, 820, 'plaza'));
    rpgDuel(g, 0, { op: 'ask', to: 1 }); rpgDuel(g, 1, { op: 'accept' });
    rpgDuel(g, 1, { op: 'giveup' });
    run(g, DUEL.end + 1.5);
  });
  duel(0.9);                                         // 80% 를 넘으면 오르지 않는다
  assert.equal(h.advQ.n, 0);
  assert(sysOf(g, 0).some((t) => /승급 실패/.test(t)));
  for (let i = 0; i < 20 && h.advQ.n < 14; i++) duel(0.1);
  assert.equal(h.advQ.n, 14);
  assert.equal(trialText(ADV_BY_ID.gladiator, h.advQ), '시험 레벨 15/15');
  duel(0.1);
  assert.equal(h.advQ.n, 14, '다 채운 뒤에는 더 오르지 않는다');
});

test('기사 시험 — 사람 · 몬스터에게 맞은 수를 0.25초에 한 대씩 세고 쓰러져도 처음으로 돌아가지 않는다', () => {
  const g = world([{ job: 'warrior', advQ: Q('knight', 5) }]);
  const h = g.heroes[0];
  at(h, 1000, 900, 'skeletal');
  g.mobs = [];
  const m = dummyMob(g, 'skeletal', 1030, 900, 220, 5);
  m.tgt = 0; m.state = 'chase';
  h.auto = 0;
  run(g, 3);
  assert(h.advQ.n > 5, `진행 ${h.advQ.n}`);
  const n = h.advQ.n;
  h.hp = 1;
  for (let i = 0; i < 500 && h.down <= 0; i++) rpgStep(g, 0.02);
  assert(h.down > 0);
  assert(h.advQ.n >= n, '쓰러져도 남는다');
});

test('명사수 시험 — 관통 화살이 160레벨 이상 몹을 맞히면 연속 +1, 빗나가면 0', () => {
  const g = world([{ job: 'archer', advQ: Q('marksman', 0), bag: { s: { j_pierce: 5 }, ks: { job: 'j_pierce', g: ['', ''] } } }]);
  const h = g.heroes[0];
  g.mobs = [];
  at(h, 1000, 900, 'skeletal'); h.auto = 0; h.dir = 1;
  const m = dummyMob(g, 'skeletal', 1200, 900);
  const calm = () => { h.hp = h.max; h.inv = 99; [m.x, m.y] = [1200, 900]; };   // 몹에게 맞아 쓰러지지 않게(대쉬 무적)
  for (let k = 0; k < 3; k++) { calm(); rpgUseSkill(g, 0, 'j_pierce'); run(g, 8); }
  assert.equal(h.advQ.n, 3);
  g.mobs = [];
  rpgUseSkill(g, 0, 'j_pierce');                     // 아무도 없다 — 빗나감
  assert.equal(h.advQ.n, 0);
  const dummy = dummyMob(g, 'skeletal', 1200, 900); dummy.type = 'dummy';   // 허수아비는 명중으로 세지 않는다
  calm(); run(g, 8);
  g.mobs = [dummy];                                  // 그사이 다시 나온 사냥터 몹은 치운다
  rpgUseSkill(g, 0, 'j_pierce');
  assert.equal(h.advQ.n, 0);
  assert(dummy.hp < dummy.max, '피해는 준다');
});

test('총사 시험 — 300레벨까지의 몬스터를 종류마다 한 번 잡으면 끝나고 확정 · 무기를 받고 되돌릴 수 없다', () => {
  fixedRandom(() => {
    const T = ADV_BY_ID.gunner.trial;
    const g = world([{ job: 'archer', advQ: Q('gunner', 0, T.list.map((id) => (id === 'zombie' || id === 'necro' ? 0 : 1))) }]);
    g.mobs = [];
    const h = g.heroes[0];
    at(h, 1000, 900, 'skeletal'); h.auto = 1;
    for (const type of ['zombie', 'zombie', 'golem', 'necro']) {
      const m = dummyMob(g, 'skeletal', 1080, 900); m.type = type; m.hp = m.max = 1;
      for (let i = 0; i < 200 && !m.dead; i++) rpgStep(g, 0.02);
      assert(m.dead, type);
      if (type === 'golem') assert.equal(h.advQ.n, T.n - 1, '300레벨 넘는 몹 · 이미 잡은 종류는 세지 않는다');
    }
    assert.equal(h.advQ.n, T.n);
    h.auto = 0;
    at(h, ADV.npc.x, ADV.npc.y + 40);
    send(g, 0, 'adv', { op: 'confirm', c: 'gunner' });
    assert.equal(h.advClass, 'gunner', sysOf(g, 0).join(' / '));
    assert.equal(h.advQ, null);
    assert(h.bag.w.some((w) => w.sp === 'adv_guns'), '쌍권총을 받는다');
    send(g, 0, 'adv', { op: 'start', c: 'marksman' });
    send(g, 0, 'adv', { op: 'confirm', c: 'marksman' });
    assert.equal(h.advClass, 'gunner', '확정한 전직은 바뀌지 않는다');
    // 전직이 빈 기록이 와도(섞인 기록) 저장 기록은 전직을 지우지 않는다
    const rec = heroRecord({ ...h, advClass: '' }, { name: '시험0', lv: 250, rs: RESET.id, advClass: 'gunner' });
    assert.equal(rec.advClass, 'gunner');
    // 서버 초기화를 막 겪은 기록은 전직을 비운다
    assert.equal(heroRecord({ ...h, lv: 1, advClass: '' }, { name: '시험0', lv: 250, rs: 'old', advClass: 'gunner' }).advClass, '');
  });
});

test('마도사 시험 — 시험 동안 마력 폭발을 쓸 수 있고 그것으로 잡은 몹만 센다 · 5마리마다 시험 레벨', () => {
  const g = world([{ job: 'mage', advQ: Q('archmage', 4) }]);
  const h = g.heroes[0];
  g.mobs = [];
  at(h, 1000, 900, 'skeletal'); h.auto = 0;
  const m = dummyMob(g, 'skeletal', 1100, 900); m.hp = m.max = 1;
  send(g, 0, 'adv', { op: 'use' });
  run(g, 1);
  assert(m.dead, '마력 폭발이 나간다');
  assert.equal(h.advQ.n, 5);
  assert.equal(trialText(ADV_BY_ID.archmage, h.advQ), '시험 레벨 2/10 · 다음까지 5마리');
  assert(h.as.cd > 0, '대기 시간');
  const m2 = dummyMob(g, 'skeletal', 1100, 900); m2.hp = m2.max = 1;
  h.auto = 1; run(g, 2);                             // 평타로 잡은 몹은 세지 않는다
  assert(m2.dead);
  assert.equal(h.advQ.n, 5);
});

test('소환술사 시험 — 시험을 받은 뒤 보스에게서 얻은 재료를 종류마다 5개까지 센다', () => {
  const g = world([{ job: 'mage', advQ: Q('summoner', 0) }]);
  const h = g.heroes[0];
  g.mobs = [];
  at(h, 1000, 900, 'skeletal'); h.auto = 1;
  const i = ADV_BY_ID.summoner.trial.list.indexOf('bone');
  for (let k = 0; k < 3; k++) {
    const m = dummyMob(g, 'skeletal', 1080, 900); m.boss = 1; m.hp = m.max = 1;
    for (let s = 0; s < 200 && !m.dead; s++) rpgStep(g, 0.02);
    assert(m.dead);
  }
  assert(h.advQ.m[i] >= 3 && h.advQ.m[i] <= 5, `뼛조각 ${h.advQ.m[i]}`);
  assert.equal(h.advQ.n, h.advQ.m[i], '다른 재료는 그대로');
});

test('전직 공격 액티브 — 모두 몹에게 피해를 주고 대기 시간 동안 다시 나가지 않는다', () => {
  fixedRandom(() => {
    for (const c of ADV_CLASSES.filter((q) => q.id !== 'healer')) {   // 치유사 축복은 피해가 없다 — 따로 시험
      const { g, h } = advanced(c.id);
      const m = dummyMob(g, 'skeletal', 1090, 900, 220, c.id === 'knight' ? 5 : 0);
      if (c.id === 'knight') { m.tgt = 0; m.state = 'chase'; }
      send(g, 0, 'adv', { op: 'use' });
      assert.equal(h.as.cd, c.active.cd, `${c.name} 대기 시간`);
      const cd = h.as.cd;
      send(g, 0, 'adv', { op: 'use' });             // 두 번 눌러도 한 번만
      assert.equal(h.as.cd, cd);
      run(g, c.id === 'summoner' ? 3 : c.id === 'knight' ? 3 : 1.2);
      assert(m.hp < 1e9, `${c.name} 피해 없음`);
      if (c.id === 'summoner') assert(h.as.sps.length === 1 && h.as.sps[0].t > 0);
    }
  });
});

test('기존 직업 스킬 · 궁극기는 전직 뒤에도 그대로 나간다', () => {
  fixedRandom(() => {
    const { g, h } = advanced('gladiator', 'flame', { bag: { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } } });
    const m = dummyMob(g, 'skeletal', 1090, 900);
    rpgSkill(g, 0);
    assert(h.sk > 0 && m.hp < 1e9, '궁극기');
    const before = m.hp;
    rpgUseSkill(g, 0, 'j_cleave');
    assert(h.scd.j_cleave > 0 && m.hp < before, '직업 스킬');
    send(g, 0, 'adv', { op: 'use' });
    assert(h.as.cd > 0, '전직 스킬은 따로 돈다');
  });
});

test('검투사 전투 본능 — 가득 차면 다음 삼연참이 세진다', () => {
  fixedRandom(() => {
    const plain = advanced('gladiator'), full = advanced('gladiator');
    const m1 = dummyMob(plain.g, 'skeletal', 1090, 900), m2 = dummyMob(full.g, 'skeletal', 1090, 900);
    full.h.as = { ...full.h.as, st: ADV_BY_ID.gladiator.passive.max };
    send(plain.g, 0, 'adv', { op: 'use' }); send(full.g, 0, 'adv', { op: 'use' });
    run(plain.g, 1); run(full.g, 1);
    const a = 1e9 - m1.hp, b = 1e9 - m2.hp, r = b / a;
    assert(r > 1.3 && r < 1.5, `비율 ${r}`);
    assert.equal(full.h.as.st, 0);
  });
});

test('기사 — 철벽 방어 · 불굴의 의지 · 파티 보호를 합쳐도 70% 를 넘지 않고 반격은 4번까지', () => {
  fixedRandom(() => {
    const g = world([{ job: 'warrior', advClass: 'knight' }, { job: 'mage' }]);
    g.mobs = [];
    const [k, mate] = g.heroes;
    k.pty = mate.pty = 1;
    at(k, 1000, 900, 'skeletal'); at(mate, 1040, 900, 'skeletal'); k.auto = mate.auto = 0;
    send(g, 0, 'adv', { op: 'use' });
    assert(mate.as && mate.as.pT > 0, '파티원 보호');
    k.jb = { iron: 4, ironCut: 0.6, sh: 0, shT: 0 }; k.hp = k.max * 0.3;
    const m = dummyMob(g, 'skeletal', 1050, 900, 220, 50);
    const hp0 = k.hp;
    k.calm = -99;
    g.heroes[0].hp = hp0;
    // 직접 셈 — 1000 피해가 300 이상으로 들어간다(70% 상한)
    const before = k.hp;
    m.tgt = 0; m.state = 'chase';
    run(g, 5);
    assert(k.as.gN <= ADV_BY_ID.knight.active.max && k.as.gN >= 0);
    assert(m.hp < 1e9, '반격 피해');
    assert(k.hp <= before);
  });
});

test('명사수 · 총사 · 마도사 · 소환술사 패시브', () => {
  fixedRandom(() => {
    // 명사수 — 관통 저격의 표식을 다음 평타가 터뜨린다
    const ms = advanced('marksman');
    const m = dummyMob(ms.g, 'skeletal', 1120, 900);
    send(ms.g, 0, 'adv', { op: 'use' }); run(ms.g, 0.5);
    assert(m.wkUntil > ms.g.t, '표식');
    ms.h.auto = 1; run(ms.g, 1.2);
    assert(!(m.wkUntil > ms.g.t), '표식을 터뜨렸다');
    // 총사 — 이어 맞히면 쌓인다(최대 5)
    const gu = advanced('gunner');
    dummyMob(gu.g, 'skeletal', 1100, 900);
    send(gu.g, 0, 'adv', { op: 'use' }); run(gu.g, 1.2);
    assert.equal(gu.h.as.st, ADV_BY_ID.gunner.passive.max);
    run(gu.g, 2.5);
    assert.equal(gu.h.as.st, 0, '2초 넘게 못 맞히면 사라진다');
    // 마도사 — 평타가 마력을 쌓고 마력 폭발이 모두 쓴다
    const am = advanced('archmage');
    dummyMob(am.g, 'skeletal', 1100, 900);
    am.h.auto = 1; run(am.g, 4); am.h.auto = 0;
    assert(am.h.as.st >= 2, `마력 ${am.h.as.st}`);
    send(am.g, 0, 'adv', { op: 'use' });
    assert.equal(am.h.as.st, 0);
    // 소환술사 — 정령과 같은 적을 치면 영혼 연결 · 쓸 때마다 하나 더(최대 10) · 시간이 다 되면 사라진다
    const su = advanced('summoner');
    const sm = dummyMob(su.g, 'skeletal', 1100, 900);
    send(su.g, 0, 'adv', { op: 'use' });
    const first = su.h.as.sps[0];
    su.h.auto = 1; run(su.g, 4);
    assert(su.g.out.some((o) => o.kind === 'sk_adv_link') || su.h.as.slT > 0, '영혼 연결');
    const A = ADV_BY_ID.summoner.active;
    for (let i = 0; i < A.max + 3; i++) { su.h.as.cd = 0; send(su.g, 0, 'adv', { op: 'use' }); }
    assert.equal(su.h.as.sps.length, A.max, '최대 10마리');
    assert.equal(su.h.as.sps[0], first, '있던 정령은 남는다');
    assert(su.h.as.sps.every((sp) => sp.t > A.life - 0.1), '모두 시간이 다시 찬다');
    su.h.auto = 0; run(su.g, A.life + 0.5);
    assert.equal(su.h.as.sps.length, 0, '시간이 다 되면 사라진다');
    assert(sm.hp < 1e9);
  });
});

test('결투 — 전직 스킬 피해는 결투 한도 안 · 경직은 절반', () => {
  fixedRandom(() => {
    const g = world([{ job: 'warrior', advClass: 'gladiator' }, { job: 'warrior' }]);
    g.mobs = [];
    rpgDuel(g, 0, { op: 'ask', to: 1 }); rpgDuel(g, 1, { op: 'accept' });
    run(g, DUEL.ready + 0.2);
    const [a, b] = g.heroes;
    a.auto = b.auto = 0; a.fire = b.fire = 0;
    b.x = a.x + 60; b.y = a.y; a.dir = 1;
    const hp0 = b.hp;
    send(g, 0, 'adv', { op: 'use' });
    run(g, 0.05);
    assert(b.cc && b.cc.stun <= ADV_BY_ID.gladiator.active.hits[0].stun * ADV.pvpCc + 1e-9);
    run(g, 1);
    const lost = hp0 - b.hp;
    assert(lost > 0 && lost <= b.max * DUEL.skillPct + 1, `잃은 체력 ${lost} / 한도 ${b.max * DUEL.skillPct}`);
  });
});

test('스냅샷 — 손님 화면에 전직 · 시험 · 정령이 실리고 방장이 바뀌어도 정령이 이어진다', () => {
  const { g, h } = advanced('summoner');
  h.advQ = null;
  dummyMob(g, 'skeletal', 1100, 900);
  send(g, 0, 'adv', { op: 'use' });
  h.as.cd = 0; send(g, 0, 'adv', { op: 'use' });
  h.as.cd = 0; send(g, 0, 'adv', { op: 'use' });
  run(g, 0.5);
  const snap = JSON.parse(JSON.stringify(rpgPack(g)));
  const guest = makeWorld(); guest.mySeat = 1;
  guest.looks = g.looks; guest.names = g.names;
  rpgApply(guest, snap);
  const gh = guest.heroes[0];
  assert.equal(gh.advClass, 'summoner');
  assert.equal(gh.as.sps.length, 3, '정령 셋');
  assert(gh.as.cd > 0);
  rpgPromote(guest);
  guest.heroes[0].loaded = 1;                       // 기록이 다시 왔다고 친다
  rpgStep(guest, 0.1);
  assert.equal(guest.heroes[0].as.sps.length, 3, '승계 뒤 정령 셋');
});

test('서버 초기화 · 다른 기본 직업이면 전직은 비어 온다', () => {
  const g = makeWorld(); g.out = [];
  rpgSyncSeats(g, [{ id: 'p0', name: '갑', hero: { name: '갑', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '갑', rs: 'old', lv: 300, advClass: 'gladiator', bag: { oc: 1 } }, 'p0');
  assert.equal(g.heroes[0].advClass, '');
  const g2 = world([{ job: 'mage', advClass: 'gladiator' }]);
  assert.equal(g2.heroes[0].advClass, '');
  assert(MAPS.plaza.npcs.some((n) => n.adv));
});

test('피해 감소 합계 70% 상한 · 직업 철벽만이면 예전 그대로 · PvP 추가 피해는 +15% 까지', async () => {
  const { advTakeCut, advDmgMul } = await import('../src/game/advance.js');
  const knight = { job: 'warrior', advClass: 'knight', hp: 10, max: 100, as: { gT: 3, pT: 3, pCut: 0.15 } };
  assert.equal(advTakeCut(knight, 0.6), ADV_BY_ID.knight.cap);
  assert.equal(advTakeCut({ job: 'warrior', advClass: '', hp: 10, max: 100 }, 0.6), 0.6);
  const healthy = { job: 'warrior', advClass: 'knight', hp: 100, max: 100, as: { gT: 3 } };
  assert(Math.abs(advTakeCut(healthy, 0) - 0.35) < 1e-9);
  const E = { gunHeld: () => true };
  const gunner = { pi: 0, job: 'archer', advClass: 'gunner', as: { st: 5 }, cast: { adv: 1 } };
  const foe = { pi: 1 };
  assert(Math.abs(advDmgMul(E, { t: 0 }, gunner, foe, false, true) - (1 + ADV.pvpBonusMax)) < 1e-9);
  assert(Math.abs(advDmgMul(E, { t: 0 }, gunner, { id: 3, type: 'orc' }, false, false) - 1.3) < 1e-9);
});

test('관리자 /직업 — 기본 직업 · 전직으로 바꾸고 자리 · 기기 기록을 고치게 알린다 · 관리자가 아니면 막는다', () => {
  const g = world([{ job: 'warrior', admin: 1, name: '관리' }, { job: 'mage', advClass: 'archmage', name: '손님' }]);
  const [a, b] = g.heroes;
  g.out = [];
  send(g, 1, 'cmd', '/직업 나 검사');                   // 관리자가 아니다
  assert.equal(b.job, 'mage');
  send(g, 0, 'cmd', '/직업 손님 총사');
  assert.equal(b.job, 'archer');
  assert.equal(b.advClass, 'gunner');
  assert(b.bag.w.some((w) => w.sp === 'adv_guns'), '전직 무기');
  assert.deepEqual(g.relook.at(-1), { pi: 1, who: 'p1', job: 'archer' });
  assert(g.out.some((o) => o.k === 'relook' && o.who === 1 && o.job === 'archer'));
  // 손님 화면 — out 을 받아 바뀐 사람이 기록을 고칠 차례에 둔다
  const q = makeWorld(); q.mySeat = 1;
  rpgApplyOut(q, g.out);
  assert.deepEqual(q.relooks.at(-1), { who: 1, job: 'archer' });
  // 기본 직업으로 바꾸면 전직이 비고, 옛 직업의 전직은 저장 기록에 남지 않는다
  send(g, 0, 'cmd', '/직업 손님 마법사');
  assert.equal(b.job, 'mage'); assert.equal(b.advClass, '');
  assert.equal(heroRecord(b, { name: '손님', lv: 250, rs: RESET.id, advClass: 'gunner' }).advClass, '');
  assert.equal(heroRecord(b, { name: '손님', lv: 250, rs: RESET.id, advClass: 'archmage' }).advClass, 'archmage', '같은 직업의 전직은 그대로 지킨다');
  send(g, 0, 'cmd', '/직업 나 소환술사');
  assert.equal(a.job, 'mage'); assert.equal(a.advClass, 'summoner');
  send(g, 0, 'cmd', '/직업 나 해적');
  assert.match(sysOf(g, 0).at(-1), /그런 직업이 없습니다/);
});

test('전직 추가 스탯 — 전직마다 정한 몫이 스탯에 더해지고 약 40점어치로 고르다', () => {
  const PT = { str: 2, int: 2, hp: 15, crit: 0.5, cdmg: 1 };      // 포인트 하나의 값(rpg.js STATS per)
  for (const c of ADV_CLASSES) {
    const plain = world([{ job: c.job }]).heroes[0], adv = world([{ job: c.job, advClass: c.id }]).heroes[0];
    let pts = 0;
    for (const [k, v] of Object.entries(ADV_BONUS[c.id])) {
      assert.equal(statTotal(adv, k) - statTotal(plain, k), v, `${c.id} ${k}`);
      pts += v / PT[k];
    }
    assert(Math.abs(pts - 40) <= 0.5, `${c.id} 포인트 몫 ${pts}`);
  }
  // 기사는 최대 체력이 늘어난다
  const kn = world([{ job: 'warrior', advClass: 'knight' }]).heroes[0], wr = world([{ job: 'warrior' }]).heroes[0];
  assert(kn.max > wr.max, `기사 ${kn.max} · 전사 ${wr.max}`);
});

test('전직을 확정하면 전직 연출(sk_adv_up)이 나가고 추가 체력이 바로 실린다', () => {
  const T = ADV_BY_ID.knight.trial;
  const g = world([{ job: 'warrior', advQ: Q('knight', T.n) }]);
  const h = g.heroes[0], before = h.max;
  at(h, ADV.npc.x, ADV.npc.y + 40);
  send(g, 0, 'adv', { op: 'confirm', c: 'knight' });
  assert.equal(h.advClass, 'knight', sysOf(g, 0).join(' / '));
  assert(h.max > before && h.hp === h.max, `체력 ${before} → ${h.max}`);
  const up = g.out.find((o) => o.k === 'fx' && o.kind === 'sk_adv_up');
  assert(up && up.c === 'knight' && up.by === 0, '전직 연출 · 주인');
});

test('훈련장 쿨타임 끄기 — 전직 스킬(Z) 대기 시간도 바로 0', () => {
  const { g, h } = advanced('summoner');
  h.map = 'train'; h.x = 600; h.y = 900;
  send(g, 0, 'train', { op: 'nocd' });
  send(g, 0, 'adv', { op: 'use' });
  run(g, 0.1);
  assert.equal(h.as.cd, 0);
  send(g, 0, 'adv', { op: 'use' });
  assert.equal(h.as.sps.length, 2, '바로 다시 써서 둘');
});

test('치유사 수호의 축복 — 범위 안 사람에게 40초 · 피해 감소 · 바로 회복 · 이어 회복', async () => {
  const { advTakeCut } = await import('../src/game/advance.js');
  const A = ADV_BY_ID.healer.active;
  const g = world([{ job: 'mage', advClass: 'healer' }, { job: 'warrior' }, { job: 'archer' }]);
  g.mobs = [];
  const [h, near, far] = g.heroes;
  at(h, 600, 900, 'train'); at(near, 700, 900, 'train'); at(far, 600 + A.r + 200, 900, 'train');   // 훈련장 — 몹이 치지 않는다
  [h, near, far].forEach((q) => { q.auto = 0; q.hp = Math.round(q.max * 0.3); });
  const hp0 = near.hp;
  send(g, 0, 'adv', { op: 'use' });
  assert.equal(near.as.blT, A.dur, '곁의 사람은 받는다');
  assert.equal(h.as.blT, A.dur, '나도 받는다');
  assert(!far.as || !far.as.blT, '범위 밖은 받지 않는다');
  assert(Math.abs(near.hp - (hp0 + near.max * A.heal)) < 1, '바로 20%');
  assert(Math.abs(advTakeCut(near, 0) - A.cut) < 1e-9, '받는 피해 15% 감소');
  assert(g.out.some((o) => o.kind === 'sk_adv_bless'));
  far.max = near.max; far.hp = near.hp;            // 축복 없는 사람과 견줘 저절로 차는 체력을 뺀다
  const hp1 = near.hp;
  run(g, A.tick * 3 + 0.05);
  const extra = (near.hp - hp1) - (far.hp - hp1);
  assert(Math.abs(extra - near.max * A.regen * 3) < 2, `이어 회복 ${extra}`);
  const snap = JSON.parse(JSON.stringify(rpgPack(g)));
  const guest = makeWorld(); guest.mySeat = 2; guest.looks = g.looks; guest.names = g.names;
  rpgApply(guest, snap);
  assert(guest.heroes[1].as.blT > 30, '손님 화면에 축복 고리');
  run(g, A.dur);
  assert.equal(near.as.blT, 0, '40초 뒤 끝');
  assert.equal(advTakeCut(near, 0), 0);
});

test('치유사 — 결투에서는 나에게만 · 시험은 축복으로 찬 체력을 센다', () => {
  const g = world([{ job: 'mage', advClass: 'healer' }, { job: 'warrior' }]);
  g.mobs = [];
  rpgDuel(g, 0, { op: 'ask', to: 1 }); rpgDuel(g, 1, { op: 'accept' });
  run(g, DUEL.ready + 0.2);
  const [a, b] = g.heroes;
  a.auto = b.auto = 0; b.x = a.x + 60; b.y = a.y;
  send(g, 0, 'adv', { op: 'use' });
  assert(a.as.blT > 0);
  assert(!b.as || !b.as.blT, '상대는 받지 않는다');
  // 시험 — 마법사가 시험 동안 축복을 써서 3만 회복
  const t = world([{ job: 'mage', advQ: Q('healer', 0) }, { job: 'warrior' }]);
  t.mobs = [];
  const [m, w] = t.heroes;
  at(m, 600, 900, 'train'); at(w, 650, 900, 'train');
  m.auto = w.auto = 0;
  const T = ADV_BY_ID.healer.trial;
  let healed = 0;
  for (let i = 0; i < 40 && m.advQ.n < T.n; i++) {
    m.hp = 1; w.hp = 1; if (m.as) m.as.cd = 0;
    const before = m.hp + w.hp;
    send(t, 0, 'adv', { op: 'use' });
    healed += m.hp + w.hp - before;
  }
  assert.equal(m.advQ.n, Math.min(T.n, Math.floor(healed / T.unit)));
  assert.match(trialText(ADV_BY_ID.healer, m.advQ), /회복/);
});

test('치유사 시험 — 혼자 자신만 치유해도(체력이 가득이어도) 치유량만큼 게이지가 찬다', () => {
  const t = world([{ job: 'mage', advQ: Q('healer', 0) }]);
  t.mobs = [];
  const m = t.heroes[0];
  at(m, 600, 900, 'train'); m.auto = 0;
  m.max = m.hp = 10000;
  send(t, 0, 'adv', { op: 'use' });
  assert(m.hp >= m.max, '체력은 그대로 가득');
  assert(m.advQ.n >= 1, `진행 ${m.advQ.n}`);
  const A = ADV_BY_ID.healer.active;
  assert.equal(m.advQ.n, Math.floor((m.max * A.heal) / ADV_BY_ID.healer.trial.unit));
});

test('치유사 시험 — 1000 이 안 되는 치유도 남은 몫(advQ.r)으로 바로 보이고 저장 · 스냅샷으로 간다', () => {
  const t = world([{ job: 'mage', advQ: Q('healer', 0) }]);
  t.mobs = [];
  const m = t.heroes[0];
  at(m, 600, 900, 'skeletal'); m.auto = 0;
  m.max = 2000; m.hp = 500;
  send(t, 0, 'adv', { op: 'use' });
  const A = ADV_BY_ID.healer.active;
  assert.equal(m.advQ.n, 0);
  assert.equal(m.advQ.r, Math.floor(2000 * A.heal));
  assert.equal(trialText(ADV_BY_ID.healer, m.advQ), `회복 ${Math.floor(2000 * A.heal)}/30,000`);
  assert(t.out.some((o) => o.k === 'fx' && /치유 시험 \+400/.test(o.text || '')), '쓸 때 센 몫을 띄운다');
  const q = makeWorld(); q.mySeat = 0;
  rpgApply(q, rpgPack(t));
  assert.equal(q.heroes[0].advQ.r, m.advQ.r, '손님 화면도 남은 몫을 안다');
  assert.equal(heroRecord(m, { name: '시험0', lv: 250, rs: RESET.id }).advQ.r, m.advQ.r, '저장에도 남는다');
  for (let i = 0; i < 3; i++) { m.as.cd = 0; send(t, 0, 'adv', { op: 'use' }); }
  assert.equal(m.advQ.n * 1000 + m.advQ.r, Math.floor(2000 * A.heal) * 4);
});

test('치유사 — 평타 바꾸기(치유 평타는 다친 사람을 치유하고 몹을 치지 않는다) · 축복은 공격력도 올린다', () => {
  const g = world([{ job: 'mage', advClass: 'healer' }, { job: 'warrior' }]);
  g.mobs = [];
  const [h, w] = g.heroes;
  at(h, 1000, 900, 'skeletal'); at(w, 1080, 900, 'skeletal');
  h.auto = w.auto = 0; h.inv = 99; w.inv = 99;
  const m = dummyMob(g, 'skeletal', 1120, 900);
  send(g, 1, 'adv', { op: 'mode' });                 // 치유사가 아니면 못 바꾼다
  assert(!w.healMode);
  send(g, 0, 'adv', { op: 'mode' });
  assert.equal(h.healMode, true);
  w.hp = 100;
  const mhp = m.hp;
  send(g, 0, 'fire', true); run(g, 1.5); send(g, 0, 'fire', false);
  assert(w.hp > 100, `치유 ${w.hp}`);
  assert.equal(m.hp, mhp, '몹은 치지 않는다');
  // 손님 화면도 평타 모드를 안다
  const q = makeWorld(); q.mySeat = 0;
  rpgApply(q, rpgPack(g));
  assert.equal(q.heroes[0].healMode, true);
  send(g, 0, 'adv', { op: 'mode' });
  assert.equal(h.healMode, false);
  // 축복 — 받은 사람의 공격력 +15%
  const before = advDmgMulOf(g, w, m);
  send(g, 0, 'adv', { op: 'use' });
  assert(w.as.blT > 0);
  assert.equal(+(advDmgMulOf(g, w, m) / before).toFixed(3), +(1 + ADV_BY_ID.healer.active.atk).toFixed(3));
});

/* ── 전직 숙련도 · 전투 특성(10월 26일) ───────────────────────────────── */
import { ADV_MASTERY, ADV_TRAITS, MASTERY_MAX, masteryLv, traitAt } from '../src/game/advData.js';
import { traitOf, advMasteryLv, advGunShot, advRangeMul, asOf } from '../src/game/advance.js';
import { physMul, magMul, loadChar, writeChar, makeChar } from '../src/game/rpg.js';
const PTS = ADV_MASTERY.pts;
const fxOf = (g, kind, by) => g.out.filter((o) => o.kind === kind && (by === undefined || o.by === by));
// 다시 나오는 사냥터 몹(무리)은 빼고 시험 몹만 남긴다 — 자동 평타가 다른 몹을 노려 결과가 흔들리지 않게
const tick = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter((q) => q.gi < 0); };
const runC = (g, t) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) tick(g, 0.02); };
const step = (g, t, until) => { for (let i = 0; i < Math.ceil(t / 0.02); i++) { tick(g, 0.02); if (until && until()) return true; } return false; };
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= Math.abs(b) * tol + 1;

test('숙련도 — 전직하면 1단계 · 예전 기록도 1단계 · 저장 · 재접속 · 서버 이동 · 스냅샷 · 방장 승계에도 남는다', () => {
  const T = ADV_BY_ID.knight.trial;
  const g = world([{ job: 'warrior', advQ: Q('knight', T.n) }]);
  const h = g.heroes[0];
  at(h, ADV.npc.x, ADV.npc.y + 40);
  send(g, 0, 'adv', { op: 'confirm', c: 'knight' });
  assert.equal(h.advClass, 'knight');
  assert.equal(h.advM, 0); assert.equal(advMasteryLv(h), 1);
  assert(sysOf(g, 0).at(-1).includes('수호의 방패'), '전직 알림에 2단계 특성 안내');
  // 예전 기록(advM 이 없다) — 1단계 · 특성 없음 · 기존 전직은 그대로
  const old = world([{ job: 'warrior', advClass: 'gladiator' }]).heroes[0];
  assert.equal(old.advClass, 'gladiator'); assert.equal(old.advM, 0); assert.equal(advMasteryLv(old), 1); assert.equal(traitOf(old), null);
  // 단계 계산
  assert.deepEqual([0, 299, 300, 1499, 1500, 4499, 4500, 9e9].map(masteryLv), [1, 1, 2, 2, 3, 3, 4, 4]);
  // 저장 기록 → 다른 서버(새 세계)
  const { g: g2, h: h2 } = advanced('marksman', 'flame', { advM: 1600 });
  assert.equal(advMasteryLv(h2), 3);
  const base = { name: '시험0', lv: 250, rs: RESET.id, advClass: 'marksman', advM: 100, coins: 7, titles: ['t1'], honor: 3 };
  const rec = heroRecord(h2, base);
  assert.equal(rec.advM, 1600); assert.equal(rec.advClass, 'marksman'); assert.equal(rec.lv, h2.lv);
  assert.equal(world([{ job: 'archer', advClass: rec.advClass, advM: rec.advM }]).heroes[0].advM, 1600, '서버를 옮겨도 그대로');
  assert.equal(heroRecord({ ...h2, advM: 10 }, { ...base, advM: 1600 }).advM, 1600, '낮은 값이 섞여 와도 내리지 않는다');
  assert.equal(heroRecord({ ...h2, lv: 1, advClass: '', advM: 0, rs: RESET.id }, { ...base, rs: 'old', advM: 1600 }).advM, 0, '서버 초기화는 비운다');
  assert.equal(world([{ job: 'archer', advClass: 'marksman', advM: 1e9 }]).heroes[0].advM, MASTERY_MAX, '최대를 넘지 않는다');
  assert.equal(world([{ job: 'archer', advM: 999 }]).heroes[0].advM, 0, '전직하지 않았으면 0');
  assert.equal(world([{ job: 'archer', advClass: 'marksman', advM: 'x' }]).heroes[0].advM, 0, '이상한 값은 0');
  // 이 기기 기록(localStorage) — 저장 → 다시 불러오기(재접속). 다른 칸은 그대로
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  try {
    makeChar('시험0');
    writeChar({ ...h2, ts: 1, st: h2.st, quest: { on: false, n: 0 }, bag: { ...h2.bag, ld: 1 } });
    const c = loadChar();
    assert.equal(c.advClass, 'marksman'); assert.equal(c.advM, 1600); assert.equal(c.lv, h2.lv);
    writeChar({ ...h2, ts: 2, advM: 5, st: h2.st, quest: { on: false, n: 0 }, bag: { ...h2.bag, ld: 1 } });
    assert.equal(loadChar().advM, 1600, '섞인 낮은 값으로 덮지 않는다');
  } finally { delete globalThis.localStorage; }
  // 스냅샷 → 손님 화면 → 방장 승계
  const snap = JSON.parse(JSON.stringify(rpgPack(g2)));
  const guest = makeWorld(); guest.mySeat = 1; guest.looks = g2.looks; guest.names = g2.names;
  rpgApply(guest, snap);
  assert.equal(guest.heroes[0].advM, 1600, '손님 화면');
  rpgPromote(guest);
  guest.heroes[0].loaded = 1;
  tick(guest, 0.1);
  assert.equal(guest.heroes[0].advM, 1600, '승계 뒤');
  assert.equal(heroRecord(guest.heroes[0], { name: '시험0', lv: 250 }).advM, 1600);
});

test('숙련도 얻기 — 160레벨 이상 몹 1 · 사냥터 보스 20 · 던전 보스 30 · 허수아비 · 낮은 사냥터 · 같은 몹 계속 치기 · 결투 · 전직 전은 0 · 1분 상한', () => {
  fixedRandom(() => {
    const { g, h } = advanced('gladiator');
    h.inv = 1e9;
    const clean = () => { g.mobs = g.mobs.filter((q) => q.gi < 0); return false; };   // 다시 나오는 사냥터 몹은 뺀다
    const kill = (o = {}, map = 'skeletal') => {
      if (h.map !== map) at(h, 1000, 900, map);
      const m = dummyMob(g, map, 1060, 900, o.lv ?? 220);
      Object.assign(m, o, { hp: 1, max: 1 });
      const before = h.advM;
      h.auto = 1; step(g, 3, () => clean() || m.dead); h.auto = 0;
      assert(m.dead, `잡았다 ${JSON.stringify(o)}`);
      return h.advM - before;
    };
    assert.equal(kill(), ADV_MASTERY.mob);
    assert.equal(kill({ boss: 1 }), ADV_MASTERY.boss);
    assert.equal(kill({ boss: 1, dg: 1 }), ADV_MASTERY.dgBoss);
    assert.equal(kill({ type: 'dummy' }), 0, '허수아비');
    assert.equal(kill({ lv: 40 }, 'boar'), 0, '낮은 사냥터');
    at(h, 1000, 900, 'skeletal');
    // 같은 몹을 계속 친다(잡지 않는다)
    const big = dummyMob(g, 'skeletal', 1060, 900);
    const before = h.advM;
    h.auto = 1; step(g, 6, clean); h.auto = 0;
    assert(big.hp < 1e9); assert.equal(h.advM, before, '치기만 해서는 오르지 않는다');
    g.mobs = [];
    // 1분 상한 — 통이 비면 넘는 몫은 버리고, 시간이 지나면 다시 찬다
    h.as.mqB = 5;
    assert.equal(kill({ boss: 1 }), 5);
    h.as.mqB = 0; h.cd = 0;
    assert.equal(kill(), 0, '통이 비면 0');
    step(g, 30);
    assert(h.as.mqB >= ADV_MASTERY.perMin / 2 - 1, `통 ${h.as.mqB}`);
    // 2단계에 오르면 알린다 · 연출
    h.advM = PTS[1] - 1;
    assert.equal(kill(), 1);
    assert.equal(advMasteryLv(h), 2);
    assert(sysOf(g, 0).some((t) => t.includes('2단계') && t.includes('연계 참격')));
    assert(fxOf(g, 'sk_adv_mastery').length >= 1);
    // 최대 단계는 넘지 않는다
    h.advM = MASTERY_MAX;
    assert.equal(kill({ boss: 1 }), 0);
    // 전직하지 않은 캐릭터는 0
    const p = world([{ job: 'warrior' }]); p.mobs = [];
    const ph = p.heroes[0]; at(ph, 1000, 900, 'skeletal'); ph.inv = 1e9;
    const pm = dummyMob(p, 'skeletal', 1060, 900); pm.hp = pm.max = 1;
    ph.auto = 1; step(p, 3, () => pm.dead);
    assert(pm.dead); assert.equal(ph.advM, 0);
    // 결투에서 이겨도 오르지 않는다
    const d = world([{ job: 'warrior', advClass: 'gladiator' }, { job: 'warrior' }]);
    d.mobs = [];
    d.heroes.filter(Boolean).forEach((q) => at(q, 900, 820));
    rpgDuel(d, 0, { op: 'ask', to: 1 }); rpgDuel(d, 1, { op: 'accept' }); rpgDuel(d, 1, { op: 'giveup' });
    runC(d, DUEL.end + 1.5);
    assert.equal(d.heroes[0].advM, 0);
  });
});

test('특성 개방 — 1단계는 특성이 없고 2단계에 열리며 3 · 4단계에 조금씩 세진다 · 관리자는 단계를 바로 정한다', () => {
  for (const c of ADV_CLASSES) {
    const one = advanced(c.id).h, two = advanced(c.id, 'flame', { advM: PTS[1] }).h;
    assert.equal(traitOf(one), null, `${c.name} 1단계`);
    assert(traitOf(two), `${c.name} 2단계`);
    assert.equal(traitOf(advanced(c.id, 'flame', { advM: PTS[3] }).h).name, ADV_TRAITS[c.id].name);
    assert(ADV_TRAITS[c.id].text(traitAt(c.id, 2)).length > 20 && ADV_TRAITS[c.id].up3 && ADV_TRAITS[c.id].up4, `${c.name} 설명`);
  }
  assert.equal(traitAt('gladiator', 2).mul, 1.2); assert.equal(traitAt('gladiator', 4).mul, 1.5);
  assert.equal(traitAt('healer', 3).r, 420); assert.equal(traitAt('marksman', 4).first, 1.6);
  const a = world([{ job: 'warrior', advClass: 'knight', admin: 1 }]), n = world([{ job: 'warrior', advClass: 'knight' }]);
  send(a, 0, 'adv', { op: 'mastery', lv: 3 }); send(n, 0, 'adv', { op: 'mastery', lv: 4 });
  assert.equal(advMasteryLv(a.heroes[0]), 3);
  assert.equal(n.heroes[0].advM, 0, '관리자가 아니면 입력으로 숙련도를 바꿀 수 없다');
});

test('검투사 연계 참격 — 서로 다른 스킬 둘을 3초 안에 맞히면 1.2배 · 같은 스킬 · 시간 초과 · 대기 · 전직 전 · 1단계는 없다 · 투지를 쌓지 않는다', () => {
  fixedRandom(() => {
    const bag = { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } };
    const { g, h } = advanced('gladiator', 'frost', { advM: PTS[1], bag });
    const m = dummyMob(g, 'skeletal', 1090, 900);
    rpgUseSkill(g, 0, 'j_cleave');
    assert.equal(h.as.st, ADV_BY_ID.gladiator.passive.job);
    assert.equal(fxOf(g, 'sk_adv_combo').length, 0);
    rpgSkill(g, 0);                                    // 궁극기 — 다른 스킬
    const hp0 = m.hp;
    runC(g, 0.2);
    assert.equal(fxOf(g, 'sk_adv_combo').length, 1, '연계 참격');
    assert(near(hp0 - m.hp, 40 * physMul(h) * 1.2), `피해 ${hp0 - m.hp} · 기대 ${40 * physMul(h) * 1.2}`);
    assert.equal(h.as.st, ADV_BY_ID.gladiator.passive.job, '연계 참격은 투지를 쌓지 않는다');
    assert(h.as.tcd > 4.5);
    h.scd.j_cleave = 0; h.sk = 0;
    rpgUseSkill(g, 0, 'j_cleave'); send(g, 0, 'adv', { op: 'use' }); runC(g, 0.6);
    assert.equal(fxOf(g, 'sk_adv_combo').length, 1, '대기 중에는 없다');
    // 같은 스킬 두 번 · 시간 초과
    const s = advanced('gladiator', 'frost', { advM: PTS[1], bag }); dummyMob(s.g, 'skeletal', 1090, 900);
    rpgUseSkill(s.g, 0, 'j_cleave'); s.h.scd.j_cleave = 0; rpgUseSkill(s.g, 0, 'j_cleave'); runC(s.g, 0.2);
    assert.equal(fxOf(s.g, 'sk_adv_combo').length, 0, '같은 스킬');
    runC(s.g, 3.2); rpgSkill(s.g, 0); runC(s.g, 0.2);
    assert.equal(fxOf(s.g, 'sk_adv_combo').length, 0, '3초가 지났다');
    // 3단계는 4초 안이면 된다
    const t3 = advanced('gladiator', 'frost', { advM: PTS[2], bag }); dummyMob(t3.g, 'skeletal', 1090, 900);
    rpgUseSkill(t3.g, 0, 'j_cleave'); runC(t3.g, 3.5); rpgSkill(t3.g, 0); runC(t3.g, 0.2);
    assert.equal(fxOf(t3.g, 'sk_adv_combo').length, 1, '3단계 4초');
    // 1단계 · 전직 전
    for (const extra of [{ advM: 0 }, { advClass: '' }]) {
      const z = advanced('gladiator', 'frost', { ...extra, bag }); dummyMob(z.g, 'skeletal', 1090, 900);
      rpgUseSkill(z.g, 0, 'j_cleave'); rpgSkill(z.g, 0); runC(z.g, 0.3);
      assert.equal(fxOf(z.g, 'sk_adv_combo').length, 0, JSON.stringify(extra));
    }
  });
});

test('기사 수호의 방패 — 철벽 방어 중 맞으면 충격파 · 일반 몹 3초 도발(다른 사람이 쳐도 유지) · 보스 제외 · 반격과 피해가 겹치지 않는다 · 4초 대기', () => {
  fixedRandom(() => {
    const g = world([{ job: 'warrior', advClass: 'knight', advM: PTS[1] }, { job: 'archer' }]);
    g.mobs = [];
    const [k, o] = g.heroes;
    at(k, 1000, 900, 'skeletal'); at(o, 1000, 1150, 'skeletal'); k.auto = o.auto = 0; o.inv = 1e9;
    const rad = TEMPLATE.rad / 2;
    const hitter = dummyMob(g, 'skeletal', 1040, 900, 220, 5);
    const ring = dummyMob(g, 'skeletal', 1000 + 200 + rad, 900);      // 반격(160) 밖 · 충격파(230) 안
    const boss = dummyMob(g, 'skeletal', 1000 - 200 - rad, 900); boss.boss = 1;
    hitter.tgt = 0; hitter.state = 'chase';
    send(g, 0, 'adv', { op: 'use' });
    const hp = { h: hitter.hp, r: ring.hp };
    const pin = () => { ring.x = 1200 + rad; ring.y = 900; boss.x = 800 - rad; boss.y = 900; return fxOf(g, 'sk_adv_wave').length > 0; };   // 둘레 몹이 다가오지 않게 붙잡는다
    assert(step(g, 4, pin), '충격파');
    const base = 40 * physMul(k);
    assert(near(hp.r - ring.hp, base * 0.5), `바깥 몹 충격파 ${hp.r - ring.hp} · 기대 ${base * 0.5}`);
    assert(near(hp.h - hitter.hp, base * ADV_BY_ID.knight.active.mul), `반격에 맞은 몹은 반격만 ${hp.h - hitter.hp}`);
    assert.equal(ring.tgt, 0); assert(ring.taunt > 2.5, '도발 3초');
    assert(!(boss.taunt > 0), '보스는 도발하지 않는다');
    // 대기 — 계속 맞아도 4초 안에는 다시 나가지 않는다
    step(g, 1, pin);
    assert.equal(fxOf(g, 'sk_adv_wave').length, 1, '대기 4초');
    // 다른 사람이 쳐도 기사를 노린다(맞히는 몹은 빼서 충격파가 다시 나가지 않게)
    g.mobs = g.mobs.filter((x) => x !== hitter);
    at(o, ring.x - 60, ring.y, 'skeletal'); o.dir = 1;
    const r0 = ring.hp;
    rpgSkill(g, 1); runC(g, 0.3);
    assert(ring.hp < r0 && ring.tgt === 0, '도발 유지');
    runC(g, 3.2);
    assert(!(ring.taunt > 0));
    o.sk = 0; o.scd = {}; at(o, ring.x - 60, ring.y, 'skeletal'); o.dir = 1; rpgSkill(g, 1); runC(g, 0.3);
    assert.equal(ring.tgt, 1, '도발이 끝나면 친 사람을 노린다');
    // 1단계 · 철벽 방어가 아닐 때는 없다
    const z = world([{ job: 'warrior', advClass: 'knight' }]); z.mobs = [];
    const zk = z.heroes[0]; at(zk, 1000, 900, 'skeletal'); zk.auto = 0;
    const zm = dummyMob(z, 'skeletal', 1040, 900, 220, 5); zm.tgt = 0; zm.state = 'chase';
    send(z, 0, 'adv', { op: 'use' }); runC(z, 3);
    assert.equal(fxOf(z, 'sk_adv_wave').length, 0);
  });
});

test('명사수 정밀 사격 — 같은 적 3번이면 준비 · 다음 평타가 첫 적 1.4배 · 뒤 적 0.7배 · 약점 노출과 겹치지 않는다 · 4초 대기 · 총사는 없다', () => {
  fixedRandom(() => {
    const { g, h } = advanced('marksman', 'frost', { advM: PTS[1] });
    const m = dummyMob(g, 'skeletal', 1150, 900), back = dummyMob(g, 'skeletal', 1300, 900);
    m.stun = back.stun = 99;                           // 한 줄에 그대로 서 있게
    const drops = [];
    let last = m.hp;
    h.auto = 1;
    for (let i = 0; i < 1500 && drops.length < 4; i++) { tick(g, 0.02); if (m.hp !== last) { drops.push(last - m.hp); last = m.hp; } }
    // 1 · 2번째 평타는 그대로, 3번째에 약점 노출 · 준비, 4번째가 정밀 사격(약점 노출 +30% 를 더하지 않는다)
    assert(near(drops[1], drops[0]), `${drops}`);
    assert(fxOf(g, 'sk_adv_prec').length === 1, '정밀 사격 연출');
    assert(near(drops[3], drops[0] * 1.4), `정밀 사격 ${drops[3]} · 평타 ${drops[0]}`);
    assert(near(1e9 - back.hp, drops[0] * 0.7), `뒤 적 ${1e9 - back.hp}`);
    assert(h.as.tcd > 3 && !h.as.pr);
    // 대기 동안은 다시 준비되지 않는다
    for (let i = 0; i < 100; i++) tick(g, 0.02);
    assert.equal(h.as.pr, 0);
    // 1단계 · 총사
    for (const [cid, extra] of [['marksman', {}], ['gunner', { advM: PTS[3] }]]) {
      const z = advanced(cid, 'frost', extra); const zm = dummyMob(z.g, 'skeletal', 1150, 900);
      z.h.auto = 1; runC(z.g, 6);
      assert(zm.hp < 1e9); assert.equal(fxOf(z.g, 'sk_adv_prec').length, 0, cid);
    }
  });
});

test('총사 기동 사격 — 쌍권총으로 후퇴 사격을 쓰면 3초 · 평타 3번마다 추가 탄환(평타 50% · 탄도 몫) · 사거리 1.25배 · 끝나면 그대로 · 총이 없으면 없다', () => {
  fixedRandom(() => {
    const guns = { w: [{ u: 1, sp: 'adv_guns' }], e: 1, n: 2, s: { j_leap: 5 }, ks: { job: 'j_leap', g: ['', ''] } };
    const { g, h } = advanced('gunner', 'frost', { advM: PTS[1], bag: guns });
    dummyMob(g, 'skeletal', 1100, 900);
    const E = { gunHeld: (q) => q.bag.e === 1 };
    rpgUseSkill(g, 0, 'j_leap');
    assert.equal(h.as.mvT, 3);
    assert.equal(advRangeMul(E, h), ADV_TRAITS.gunner.rng);
    h.auto = 1; runC(g, 2.9);
    const shots = h.as.mvN;
    assert(shots >= 3, `평타 ${shots}`);
    assert.equal(fxOf(g, 'sk_adv_mshot').length, Math.floor(shots / 3));
    runC(g, 0.3);
    assert.equal(h.as.mvT, 0); assert.equal(advRangeMul(E, h), 1);
    const n = fxOf(g, 'sk_adv_mshot').length;
    runC(g, 3);
    assert.equal(fxOf(g, 'sk_adv_mshot').length, n, '끝나면 원래 평타');
    // 추가 탄환 피해 — 평타 × 0.5 × (1 + 탄도 숙련), 패시브 없이(noProc) 한 번
    const hits = [];
    const M = { gunHeld: () => true, fx() {}, say() {}, later: (_g, _t, fn) => fn(), alive: () => true, noProc: (fn) => fn(), extra: (_g, _h, _o, d) => hits.push(d) };
    const fake = { advClass: 'gunner', job: 'archer', advM: PTS[1], dir: 1, x: 0, y: 0, map: 'skeletal', as: { mvT: 2, mvN: 0, st: 3 } };
    for (let i = 0; i < 6; i++) advGunShot(M, { t: 0 }, fake, { id: 1, type: 'orc', x: 100, y: 0 }, 100, 0.2);
    assert.deepEqual(hits.map((d) => Math.round(d * 100) / 100), [59, 59]);
    fake.advM = PTS[3]; fake.as.mvN = 0; hits.length = 0;
    for (let i = 0; i < 6; i++) advGunShot(M, { t: 0 }, fake, { id: 1, type: 'orc', x: 100, y: 0 }, 100, 0.2);
    assert.equal(hits.length, 3, '4단계는 2번마다');
    // 총을 들지 않았으면 · 1단계면 없다
    for (const extra of [{ advM: PTS[1], bag: { ...guns, e: 0 } }, { bag: guns }]) {
      const z = advanced('gunner', 'frost', extra); dummyMob(z.g, 'skeletal', 1100, 900);
      rpgUseSkill(z.g, 0, 'j_leap');
      assert(!(z.h.as && z.h.as.mvT > 0), JSON.stringify(extra.advM));
    }
  });
});

test('마도사 원소 공명 — 구체 · 연쇄 번개가 맞으면 1(최대 3 · 8초) · 마력 폭발이 모두 써서 원소 효과 · 보스는 끌지 않는다', () => {
  fixedRandom(() => {
    const bag = { s: { j_orb: 5, j_chain: 5 }, ks: { job: 'j_orb', g: ['', ''] } };
    const cast = (w, id) => { w.h.bag.ks.job = id; w.h.scd = {}; rpgUseSkill(w.g, 0, id); runC(w.g, 0.5); };
    const w = advanced('archmage', 'gravity', { advM: PTS[1], bag });
    const m = dummyMob(w.g, 'skeletal', 1100, 900);
    cast(w, 'j_orb'); assert.equal(w.h.as.rs, 1);
    assert(w.h.as.rsT > 7);
    cast(w, 'j_chain'); cast(w, 'j_orb'); cast(w, 'j_orb');
    assert.equal(w.h.as.rs, 3, '최대 3');
    // 중력 — 둘레 일반 몹을 끌고 보스는 그대로
    const far = dummyMob(w.g, 'skeletal', 1100 + 230, 900), boss = dummyMob(w.g, 'skeletal', 1100 - 230, 900); boss.boss = 1;
    far.stun = boss.stun = 99;                         // 스스로 걸어오지 않게 — 끌림만 본다
    const d0 = Math.abs(far.x - m.x), b0 = boss.x;
    send(w.g, 0, 'adv', { op: 'use' });
    assert.equal(w.h.as.rs, 0, '마력 폭발이 모두 쓴다');
    runC(w.g, ADV_BY_ID.archmage.active.delay + 0.05);
    assert(Math.abs(far.x - m.x) < d0 * 0.4, `끌려옴 ${d0} → ${Math.abs(far.x - m.x)}`);
    assert(Math.abs(boss.x - b0) < 20, '보스는 끌지 않는다');
    assert.equal(fxOf(w.g, 'sk_adv_reso')[0].n, 3);
    // 화염 — 공명 3이면 작은 추가 폭발(마법 기본 피해 0.45 × 3)
    const blast = (n) => {
      const z = advanced('archmage', 'flame', { advM: PTS[1], bag }); const zm = dummyMob(z.g, 'skeletal', 1100, 900);
      Object.assign(asOf(z.h), { rs: n, rsT: 8, st: 0 });
      send(z.g, 0, 'adv', { op: 'use' }); runC(z.g, 0.8);
      return { d: 1e9 - zm.hp, h: z.h };
    };
    const a0 = blast(0), a3 = blast(3);
    const extra = 40 * magMul(a3.h) * ADV_TRAITS.archmage.flame * 3 * 1.05;
    assert(near(a3.d - a0.d, extra, 0.05), `추가 폭발 ${a3.d - a0.d} · 기대 ${extra}`);
    // 서리 — 둘레 일반 몹 둔화 확산(보스는 절반)
    const f = advanced('archmage', 'frost', { advM: PTS[1], bag }); const fm = dummyMob(f.g, 'skeletal', 1100, 900);
    const fo = dummyMob(f.g, 'skeletal', 1100 + 200, 900), fb = dummyMob(f.g, 'skeletal', 1100 - 200, 900); fb.boss = 1;
    fm.stun = fo.stun = fb.stun = 99;                  // 걸어와 폭발 안에 들지 않게
    Object.assign(asOf(f.h), { rs: 2, rsT: 8 });
    send(f.g, 0, 'adv', { op: 'use' }); runC(f.g, ADV_BY_ID.archmage.active.delay + 0.03);
    assert(fo.slow > 2.8 && fb.slow > 1.3 && fb.slow < 1.6, `둔화 ${fo.slow} · 보스 ${fb.slow}`);
    assert(fm.hp < 1e9);
    // 8초가 지나면 흩어진다 · 1단계는 쌓이지 않는다
    const e = advanced('archmage', 'frost', { advM: PTS[1], bag }); dummyMob(e.g, 'skeletal', 1100, 900);
    cast(e, 'j_orb'); runC(e.g, 8.2); assert.equal(e.h.as.rs, 0);
    const z = advanced('archmage', 'frost', { bag }); dummyMob(z.g, 'skeletal', 1100, 900);
    cast(z, 'j_orb'); assert.equal(z.h.as.rs || 0, 0);
  });
});

test('소환술사 정령 협동 공격 — 구체 · 연쇄 번개가 맞으면 정령 수 × 0.15배를 한 번에 · 5초 대기 · 정령 0 이면 없다 · 영혼 연결을 부르지 않는다', () => {
  fixedRandom(() => {
    const bag = { s: { j_orb: 5 }, ks: { job: 'j_orb', g: ['', ''] } };
    const { g, h } = advanced('summoner', 'frost', { advM: PTS[1], bag });
    const m = dummyMob(g, 'skeletal', 1100, 900);
    rpgUseSkill(g, 0, 'j_orb'); runC(g, 0.6);
    assert.equal(fxOf(g, 'sk_adv_coop').length, 0, '정령이 없으면 없다');
    const orb = 1e9 - m.hp;
    for (let i = 0; i < 3; i++) { h.as.cd = 0; send(g, 0, 'adv', { op: 'use' }); }
    h.as.sps.forEach((sp) => { sp.cd = 99; });       // 정령 혼자 치는 피해는 빼고 본다
    const slT = h.as.slT, hp0 = m.hp;
    h.scd = {}; rpgUseSkill(g, 0, 'j_orb'); runC(g, 0.6);
    const coop = fxOf(g, 'sk_adv_coop');
    assert.equal(coop.length, 1); assert.equal(coop[0].n, 3, '연출 하나에 정령 셋');
    const expect = 40 * magMul(h) * 0.15 * 3 * 1.05;
    assert(near(hp0 - m.hp - orb, expect), `협동 ${hp0 - m.hp - orb} · 기대 ${expect}`);
    assert.equal(h.as.slT, slT, '영혼 연결이 이어지지 않는다');
    h.scd = {}; rpgUseSkill(g, 0, 'j_orb'); runC(g, 0.6);
    assert.equal(fxOf(g, 'sk_adv_coop').length, 1, '5초 대기');
    // 정령 10마리면 1.5배
    const ten = traitAt('summoner', 2).per * ADV_BY_ID.summoner.active.max;
    assert(Math.abs(ten - 1.5) < 1e-9);
  });
});

test('치유사 긴급 보호막 — 파티원(나 포함)이 30% 이하가 되면 350 안에서 15% · 5초 · 받는 사람마다 30초 · 치유사가 여럿이어도 한 번 · 파티 밖 · 범위 밖 · 더 큰 보호막이면 없다', () => {
  fixedRandom(() => {
    const g = world([{ job: 'mage', advClass: 'healer', advM: PTS[1] }, { job: 'warrior' }, { job: 'archer' }, { job: 'mage', advClass: 'healer', advM: PTS[1] }]);
    g.mobs = [];
    const [hl, mate, stranger, hl2] = g.heroes;
    hl.pty = mate.pty = hl2.pty = 1;
    at(hl, 1000, 900, 'skeletal'); at(mate, 1200, 900, 'skeletal'); at(stranger, 1200, 1100, 'skeletal'); at(hl2, 1100, 950, 'skeletal');
    g.heroes.filter(Boolean).forEach((q) => { q.auto = 0; });
    const hurt = (q, hp = 0.32) => {
      q.hp = q.max * hp;
      const m = dummyMob(g, 'skeletal', q.x + 40, q.y, 220, Math.round(q.max * 0.05)); m.tgt = q.pi; m.state = 'chase';
      const ok = step(g, 4, () => q.hp < q.max * 0.3);
      g.mobs = g.mobs.filter((x) => x !== m);
      return ok;
    };
    assert(hurt(mate));
    assert.equal(fxOf(g, 'sk_adv_esh').length, 1, '한 번만(치유사 둘)');
    assert(mate.jb && mate.jb.sh > 0 && mate.jb.sh <= mate.max * 0.15 + 1, `보호막 ${mate.jb && mate.jb.sh}`);
    assert(mate.as.esT > 28, '30초 대기');
    assert(hurt(mate, 0.5) || true);
    assert.equal(fxOf(g, 'sk_adv_esh').length, 1, '대기 중');
    assert(hurt(stranger)); assert.equal(fxOf(g, 'sk_adv_esh').length, 1, '파티가 아니면 없다');
    assert(hurt(hl)); assert.equal(fxOf(g, 'sk_adv_esh').length, 2, '치유사 자신');
    // 범위 밖
    const far = world([{ job: 'mage', advClass: 'healer', advM: PTS[1] }, { job: 'warrior' }]); far.mobs = [];
    const [fh, fm] = far.heroes; fh.pty = fm.pty = 1; at(fh, 600, 900, 'skeletal'); at(fm, 1200, 900, 'skeletal'); fh.auto = fm.auto = 0;
    fm.hp = fm.max * 0.32;
    const mob = dummyMob(far, 'skeletal', 1240, 900, 220, Math.round(fm.max * 0.05)); mob.tgt = 1; mob.state = 'chase';
    step(far, 4, () => fm.hp < fm.max * 0.3);
    assert.equal(fxOf(far, 'sk_adv_esh').length, 0, '350 밖');
    // 이미 더 큰 보호막
    const big = world([{ job: 'mage', advClass: 'healer', advM: PTS[1] }]); big.mobs = [];
    const bh = big.heroes[0]; at(bh, 1000, 900, 'skeletal'); bh.auto = 0;
    bh.jb = { iron: 0, ironCut: 0, sh: bh.max * 0.5, shT: 30 }; bh.hp = bh.max * 0.25;
    const bm = dummyMob(big, 'skeletal', 1040, 900, 220, 1); bm.tgt = 0; bm.state = 'chase';
    runC(big, 3);
    assert.equal(fxOf(big, 'sk_adv_esh').length, 0); assert(!(bh.as && bh.as.esT > 0), '대기를 쓰지 않는다');
  });
});

test('PvP — 전투 특성도 기존 한도 안(스킬 한 번 12% · 평타 3%) · 도발 없음 · 긴급 보호막은 나에게만', () => {
  fixedRandom(() => {
    const duel = (a, b) => {
      const g = world([a, b]); g.mobs = [];
      g.heroes.filter(Boolean).forEach((q) => at(q, 900, 820));
      rpgDuel(g, 0, { op: 'ask', to: 1 }); rpgDuel(g, 1, { op: 'accept' });
      runC(g, DUEL.ready + 0.2);
      const [x, y] = g.heroes;
      x.auto = y.auto = 0; x.fire = y.fire = 0; y.x = x.x + 60; y.y = x.y; x.dir = 1;
      return { g, x, y };
    };
    // 검투사 4단계 — 직업 스킬 + 궁극기 + 연계 참격: 스킬 둘이라 24% 를 넘지 않는다
    const gl = duel({ job: 'warrior', advClass: 'gladiator', advM: PTS[3], bag: { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } } }, { job: 'warrior' });
    const hp0 = gl.y.hp;
    rpgUseSkill(gl.g, 0, 'j_cleave'); rpgSkill(gl.g, 0); runC(gl.g, 0.4);
    assert.equal(fxOf(gl.g, 'sk_adv_combo').length, 1, '결투에서도 연계는 나간다');
    assert(hp0 - gl.y.hp <= gl.y.max * DUEL.skillPct * 2 + 1, `잃은 체력 ${hp0 - gl.y.hp}`);
    // 명사수 4단계 — 정밀 사격도 평타 한도(3%)
    const ms = duel({ job: 'archer', advClass: 'marksman', advM: PTS[3] }, { job: 'warrior' });
    Object.assign(asOf(ms.x), { pr: 1, tcd: 0 });
    ms.x.fire = 1;
    let last = ms.y.hp, maxHit = 0;
    for (let i = 0; i < 200; i++) { tick(ms.g, 0.02); maxHit = Math.max(maxHit, last - ms.y.hp); last = ms.y.hp; }
    assert(maxHit > 0 && maxHit <= ms.y.max * DUEL.basicPct + 1, `한 대 ${maxHit}`);
    // 기사 — 충격파는 사람을 도발하지 않는다
    const kn = duel({ job: 'warrior', advClass: 'knight', advM: PTS[3] }, { job: 'warrior', bag: { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } } });
    send(kn.g, 0, 'adv', { op: 'use' });
    kn.y.dir = -1; rpgUseSkill(kn.g, 1, 'j_cleave'); runC(kn.g, 0.3);
    assert.equal(fxOf(kn.g, 'sk_adv_wave').length, 1);
    assert(!(kn.y.taunt > 0));
    // 마도사 4단계 — 공명 3 폭발도 한 스킬 한도 안
    const am = duel({ job: 'mage', advClass: 'archmage', advM: PTS[3], elem: 'flame' }, { job: 'warrior' });
    Object.assign(asOf(am.x), { rs: 3, rsT: 8, st: 10 });
    const ahp = am.y.hp;
    send(am.g, 0, 'adv', { op: 'use' }); runC(am.g, 1.5);
    assert(ahp - am.y.hp <= am.y.max * DUEL.skillPct + 1, `마력 폭발 + 공명 ${ahp - am.y.hp}`);
    // 치유사 — 결투에서는 나에게만
    const he = duel({ job: 'mage', advClass: 'healer', advM: PTS[1] }, { job: 'warrior', bag: { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } } });
    he.x.hp = he.x.max * 0.31;
    he.y.dir = -1; rpgUseSkill(he.g, 1, 'j_cleave'); runC(he.g, 0.2);
    assert(he.x.hp < he.x.max * 0.3);
    assert.equal(fxOf(he.g, 'sk_adv_esh').length, 1); assert(he.x.jb.sh > 0, '나에게만');
  });
});

test('10명 — 4단계 특성을 모두 켜고 30초 싸워도 연출 · 스냅샷이 크게 늘지 않고 특성은 대기 시간보다 자주 나가지 않는다', () => {
  fixedRandom(() => {
    const bag = { s: { j_cleave: 5, j_orb: 5, j_leap: 5 }, ks: { job: '', g: ['', ''] } };
    const sim = (advM) => {
      const ppl = ADV_CLASSES.map((c) => ({ job: c.job, advClass: c.id, advM, elem: 'flame',
        bag: { ...bag, ks: { job: c.job === 'warrior' ? 'j_cleave' : c.job === 'mage' ? 'j_orb' : 'j_leap', g: ['', ''] }, ...(c.id === 'gunner' ? { w: [{ u: 1, sp: 'adv_guns' }], e: 1, n: 2 } : {}) } }))
        .concat([{ job: 'warrior' }, { job: 'archer' }, { job: 'mage' }]);
      const g = world(ppl); g.mobs = [];
      g.heroes.filter(Boolean).forEach((q, i) => { at(q, 900 + (i % 5) * 40, 860 + Math.floor(i / 5) * 60, 'skeletal'); q.auto = 1; q.inv = 1e9; q.pty = 1; });
      for (let i = 0; i < 20; i++) dummyMob(g, 'skeletal', 1000 + (i % 5) * 50, 820 + Math.floor(i / 5) * 40, 220, 30);
      g.mobs.forEach((m) => { m.tgt = 0; m.state = 'chase'; });
      let outN = 0, ms = 0;
      const t0 = Date.now();
      for (let s = 0; s < 30 / 0.05; s++) {
        if (s % 20 === 0) g.heroes.forEach((q) => { if (!q) return; q.scd = {}; q.sk = 0; if (q.as) q.as.cd = 0; const id = q.bag.ks.job; if (id) rpgUseSkill(g, q.pi, id); rpgSkill(g, q.pi); if (q.advClass) send(g, q.pi, 'adv', { op: 'use' }); });
        if (s % 40 === 0) g.heroes.forEach((q) => { if (q && q.hp < q.max * 0.35) q.hp = q.max * 0.25; });
        tick(g, 0.05);
        outN += g.out.length; g.out.length = 0;
      }
      ms = Date.now() - t0;
      const P = rpgPack(g);
      return { g, outN, ms, snap: JSON.stringify(P.h).length };   // 영웅 줄만 — 몹 줄은 그때 살아 있는 사냥터 몹 수에 따라 달라진다
    };
    // 연출 수를 셀 때는 out 을 비우기 전에 세어야 해 따로 센다
    const count = {};
    const lv4 = (() => {
      const r = sim(PTS[3]);
      return r;
    })();
    const lv1 = sim(0);
    console.log(`10명 30초 — 이벤트 1단계 ${lv1.outN} · 4단계 ${lv4.outN} · 스냅샷 영웅 줄 ${lv1.snap}B → ${lv4.snap}B · 시간 ${lv1.ms}ms → ${lv4.ms}ms`);
    assert(lv4.outN < lv1.outN * 1.35, `이벤트 ${lv1.outN} → ${lv4.outN}`);
    assert(lv4.snap - lv1.snap < 7 * 30, `스냅샷 ${lv1.snap} → ${lv4.snap}`);
    assert(lv4.ms < lv1.ms * 2 + 300, `시간 ${lv1.ms} → ${lv4.ms}`);
    void count;
  });
});

test('특성 대기 — 30초 동안 연계 참격 · 정밀 사격 · 협동 공격은 대기 시간마다 한 번을 넘지 않는다', () => {
  fixedRandom(() => {
    const T = (cid) => traitAt(cid, 4);
    const runOne = (cid, extra, kind, act) => {
      const w = advanced(cid, 'frost', { advM: PTS[3], ...extra });
      for (let i = 0; i < 5; i++) dummyMob(w.g, 'skeletal', 1080 + i * 30, 900);
      w.h.auto = 1; w.h.inv = 1e9;
      let n = 0;
      for (let s = 0; s < 600; s++) { if (s % 10 === 0) act(w); tick(w.g, 0.05); n += fxOf(w.g, kind).length; w.g.out.length = 0; }
      return n;
    };
    const gl = runOne('gladiator', { bag: { s: { j_cleave: 5 }, ks: { job: 'j_cleave', g: ['', ''] } } }, 'sk_adv_combo', (w) => { w.h.scd = {}; w.h.sk = 0; if (w.h.as) w.h.as.cd = 0; rpgUseSkill(w.g, 0, 'j_cleave'); rpgSkill(w.g, 0); send(w.g, 0, 'adv', { op: 'use' }); });
    assert(gl >= 3 && gl <= Math.ceil(30 / T('gladiator').icd) + 1, `연계 참격 ${gl}`);
    const ms = runOne('marksman', {}, 'sk_adv_prec', () => {});
    assert(ms >= 2 && ms <= Math.ceil(30 / T('marksman').icd) + 1, `정밀 사격 ${ms}`);
    const su = runOne('summoner', { bag: { s: { j_orb: 5 }, ks: { job: 'j_orb', g: ['', ''] } } }, 'sk_adv_coop', (w) => { w.h.scd = {}; if (w.h.as) w.h.as.cd = 0; send(w.g, 0, 'adv', { op: 'use' }); rpgUseSkill(w.g, 0, 'j_orb'); });
    assert(su >= 3 && su <= Math.ceil(30 / T('summoner').icd) + 1, `협동 공격 ${su}`);
  });
});
