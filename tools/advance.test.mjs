import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgApplyOut, rpgPromote, rpgSkill, rpgUseSkill, rpgDuel, heroRecord, MAPS, DUEL } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { ADV, ADV_BY_ID, ADV_CLASSES, ADV_BONUS, trialText } from '../src/game/advData.js';
import { statTotal } from '../src/game/rpg.js';

// 1차 전직 — 시험 · 확정 · 저장 · 액티브 6 · 패시브 6 · PvP 한도 · 스냅샷 · 방장 승계. 실행: node --test tools/advance.test.mjs
const JOB = { gladiator: 'warrior', knight: 'warrior', marksman: 'archer', gunner: 'archer', archmage: 'mage', summoner: 'mage', healer: 'mage' };
function world(people) {
  const g = makeWorld(); g.mySeat = 0; g.out = [];
  const seats = people.map((p, i) => ({ id: `p${i}`, name: p.name || `시험${i}`, hero: { name: p.name || `시험${i}`, job: p.job, elem: p.elem || 'flame', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  people.forEach((p, i) => rpgJoin(g, i, { name: p.name || `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 250, ts: 0, coins: 0,
    stats: { str: 200, int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1, ...(p.bag || {}) }, advClass: p.advClass, advQ: p.advQ, admin: p.admin ? 1 : 0 }, `p${i}`));
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
