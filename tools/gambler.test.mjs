/* 히든 직업 Gambler 002(11월 16일, 격자 연습장에만) — 실제 게임 함수로 칩 · 풀 베팅 · 스킬 배율 · 불운 보정 · 보호막 · 무기 금지를 본다.
   node --test tools/gambler.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgTrain, rpgSandboxHit, SNAP_ORDER } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag, whyEquip } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { GAMBLER as GM, GM_BET as BET, GM_CHIP as CH, GM_VEIL as VL, GM_DICE as DC, GM_RAIN as RN, GM_DD as DD, GM_TABLE as TB, GM_EDGE as EG, GM_JACK as JK, GM_LUCK as LUCK, GM_SLOTS } from '../src/game/gamblerData.js';
import { unlockGambler, dropGambler, gamblerOn, gamblerView, gamblerKill, cleanGmJob, gmJobNeed, gmTrainNeed, veilStat, rainCount, diceCd, luckNeed, gmContract } from '../src/game/gamblerJob.js';
import { KEY_ACTIONS } from '../src/game/keys.js';
import { GAMBLER_PX, GAMBLER_ICON } from '../src/game/gamblerPxData.js';
import { GAMBLER_CAP, GAMBLER_GROUND } from '../src/game/gamblerArt.js';
import { GROUND_FX } from '../src/game/skillArt.js';
import { readFileSync, existsSync } from 'node:fs';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.02, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
function setup(lv = 200, tr = [0, 0, 0]) {
  const g = makeWorld(); g.out = []; g.test = 1; g.high = true; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'g0', name: '도박', hero: { name: '도박', job: 'archer', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '도박', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1 } }, 'g0');
  const h = g.heroes[0];
  h.map = SANDBOX.id; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  unlockGambler(h, { lv, tr: tr.map(l => [l, 0]) });
  step(g, .01);
  h.cd = 0;                                          // 막 들어온 캐릭터의 첫 평타 대기를 비운다
  return { g, h };
}
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const use = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
// 기준 — 황금 칩(×2.0) 한 발 피해
function unit() { const { g, h } = setup(); const m = mob(g, h.x + 200, h.y); fire(g, true); step(g, .01); fire(g, false); run(g, .45); return (HP - m.hp) / CH.mul; }
const U = unit();

test('실제 게임에는 넣지 않았다 — live 꺼짐 · 가방 정리가 bag.hj 를 싣지 않는다 · 키 설정 창 · 스냅샷 맵에 새 칸이 없다', () => {
  assert.equal(GM.live, false);
  const b = cleanBag({ oc: 1, hj: { active: 'gambler', jobs: { gambler: { lv: 200, xp: 0, tr: [[50, 0], [50, 0], [50, 0]] } } } });
  assert.equal(b.hj, undefined, '실제 게임 캐릭터에는 히든 직업 값이 남지 않는다');
  assert.ok(!gamblerOn({ bag: b }));
  assert.ok(!KEY_ACTIONS.some(a => /gambler|도박/i.test(a.id + a.name)), '키 설정 창에 드러나지 않는다');
  assert.ok(GM_SLOTS.every(q => KEY_ACTIONS.some(a => a.id === q.act)), '기존 행동 키를 그대로 쓴다');
  assert.ok(!SNAP_ORDER.maps.includes('casino'));
  const { g, h } = setup(); dropGambler(h);
  const m = mob(g, h.x + 200, h.y);
  use(g, 'dice'); run(g, .5);
  assert.equal(m.hp, HP, '직업이 꺼져 있으면 hidden 입력은 아무 일도 하지 않는다');
});

test('켜면 무기를 내려놓고(지우지 않는다) 장착 · 무기 스킬 · 일반 스킬 입력을 받지 않는다', () => {
  const { g, h } = setup();
  assert.equal(h.bag.e, 0);
  assert.equal(h.bag.w.length, 1, '가방의 무기는 남는다');
  assert.ok(whyEquip(h, 1).some(t => t.includes('무기를 들 수 없습니다')));
  const m = mob(g, h.x + 150, h.y);
  rpgInput(g, { cls: 0, kind: 'skill' }); rpgInput(g, { cls: 0, kind: 'wskill' }); run(g, 1);
  assert.equal(m.hp, HP, '큰 기술 · 무기 스킬은 나가지 않는다');
  assert.equal(h.advClass, '');
});

test('황금 칩 — ×2.0 · 0.5초 간격 · 사거리 480 · 맞으면 칩 +1(7개까지)', () => {
  assert.deepEqual([CH.mul, CH.gap, CH.range, CH.dia], [2, .5, 480, 26]);
  const { g, h } = setup();
  const m = mob(g, h.x + 300, h.y);
  fire(g, true); run(g, 2.4); fire(g, false); run(g, .5);
  const hits = Math.round((HP - m.hp) / (U * CH.mul));
  assert.equal(hits, 5, '2.4초 동안 5발(0 · 0.5 · 1 · 1.5 · 2초)');
  assert.equal(gamblerView(h).chips, 5);
  fire(g, true); run(g, 3); fire(g, false); run(g, .5);
  assert.equal(gamblerView(h).chips, GM.chips, '7개를 넘지 않는다');
  const far = setup(); const m2 = mob(far.g, far.h.x + 560, far.h.y);
  fire(far.g, true); run(far.g, 1); fire(far.g, false); run(far.g, .6);
  assert.equal(m2.hp, HP, '사거리 밖은 맞지 않는다');
});

test('풀 베팅 — 칩 7개에서 다음 공격 스킬의 첫 적중에 추가 코인 7발(합 ×14 · 황금 계약 ×28) · 칩을 다시 얻지 않는다', () => {
  for (const [tr, sum] of [[[0, 0, 0], BET.mul * BET.coins], [[50, 50, 50], BET.mulContract * BET.coins]]) {
    const { g, h } = setup(200, tr);
    g.gmRand = () => 0;                               // 눈 1(×5)
    const m = mob(g, h.x + 300, h.y);
    h.gm.chips = GM.chips;
    use(g, 'dice', [m.x, m.y]); run(g, 1.2);
    near(HP - m.hp, U * (DC.muls[0] + sum), 0.02, `연마 ${tr[0]}`);
    assert.equal(gamblerView(h).chips, 0, '칩을 모두 쓴다 · 추가 코인은 칩을 주지 않는다');
  }
  assert.equal(BET.mul * BET.coins, 14); assert.equal(BET.mulContract * BET.coins, 28);
  // 평타는 풀 베팅을 쓰지 않는다
  const { g, h } = setup(); const m = mob(g, h.x + 200, h.y);
  h.gm.chips = GM.chips; fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  near(HP - m.hp, U * CH.mul); assert.equal(gamblerView(h).chips, GM.chips);
});

test('운명의 눈 — 눈마다 ×5 · 7 · 10 · 13 · 16 · 24 · 반경 100 · 0.28초에 한 번 · 대기 8초(행운 25 → 6초)', () => {
  assert.deepEqual(DC.muls, [5, 7, 10, 13, 16, 24]);
  DC.muls.forEach((mul, i) => {
    const { g, h } = setup();
    g.gmRand = () => (i + 0.5) / 6;
    const a = mob(g, h.x + 300, h.y), b = mob(g, h.x + 300 + DC.r - 10, h.y), c = mob(g, h.x + 300 + DC.r + 40, h.y);
    use(g, 'dice', [a.x, a.y]); run(g, DC.hit - .03);
    assert.equal(a.hp, HP, '0.28초 전에는 피해가 없다');
    run(g, .2);
    near(HP - a.hp, U * mul, 0.02, `눈 ${i + 1}`); near(HP - b.hp, U * mul);
    assert.equal(c.hp, HP, '반경 밖');
  });
  assert.equal(diceCd(cleanGmJob({ lv: 200, tr: [[0, 0], [0, 0], [25, 0]] })), 6);
  assert.equal(diceCd(cleanGmJob({ lv: 200 })), 8);
  const { g, h } = setup(); use(g, 'dice'); step(g, .01);
  near(gamblerView(h).cd.dice, 8, 0.02);
});

test('불운 보정 — 실패(눈 1~2 · 777 낮은 결과) 3번 연속이면 다음은 최고 · 행운 50 이면 2번 · 최고가 나오면 0', () => {
  for (const [luck, need] of [[0, LUCK.need], [50, LUCK.need50]]) {
    const { g, h } = setup(200, [0, 0, luck]);
    rpgTrain(g, 0, { op: 'nocd' });
    assert.equal(luckNeed(h.bag.hj.jobs.gambler), need);
    g.gmRand = () => 0;                               // 늘 눈 1
    const m = mob(g, h.x + 300, h.y);
    for (let i = 0; i < need; i++) { use(g, 'dice', [m.x, m.y]); run(g, .6); }
    assert.equal(gamblerView(h).luck, need);
    const before = m.hp;
    use(g, 'dice', [m.x, m.y]); run(g, .6);
    near(before - m.hp, U * DC.muls[5], 0.02, '보정된 눈 6');
    assert.equal(gamblerView(h).luck, 0);
  }
  // 777 낮은 결과도 실패로 세고, 보정이 차면 777 도 최고가 된다
  const { g, h } = setup(); rpgTrain(g, 0, { op: 'nocd' }); g.gmRand = () => 0;
  const m = mob(g, h.x + 300, h.y);
  use(g, 'dice', [m.x, m.y]); run(g, .6); use(g, 'dice', [m.x, m.y]); run(g, .6);
  use(g, 'jack', [m.x, m.y]); run(g, JK.end + .3);
  assert.equal(gamblerView(h).luck, 3);
  const before = m.hp;
  use(g, 'jack', [m.x, m.y]); run(g, JK.end + .3);
  near(before - m.hp, U * (JK.coins * JK.coinMul + JK.ends[2]), 0.02, '보정된 잭팟');
  // 실패가 아닌 결과는 연속을 끊는다
  const q = setup(); rpgTrain(q.g, 0, { op: 'nocd' });
  q.g.gmRand = () => 0; use(q.g, 'dice'); run(q.g, .6); use(q.g, 'dice'); run(q.g, .6);
  q.g.gmRand = () => 0.5; use(q.g, 'dice'); run(q.g, .6);
  assert.equal(gamblerView(q.h).luck, 0);
});

test('코인 폭우 — 8번 ×2.5(합 ×20) · 금화 25 → 10번 · 50 → 12번 · 반경 160', () => {
  for (const [gold, n] of [[0, RN.n], [25, RN.n25], [50, RN.n50]]) {
    const { g, h } = setup(200, [gold, 0, 0]);
    assert.equal(rainCount(h.bag.hj.jobs.gambler), n);
    const a = mob(g, h.x + 300, h.y), c = mob(g, h.x + 300 + RN.r + 50, h.y);
    use(g, 'rain', [a.x, a.y]); run(g, RN.first + RN.gap * n + .3);
    near(HP - a.hp, U * RN.mul * n, 0.02, `금화 ${gold}`);
    assert.equal(c.hp, HP);
  }
  assert.equal(RN.mul * RN.n, 20);
});

test('더블 다운 — 칩 3개 · 직전 운명의 눈 · 코인 폭우의 70% 를 대상마다 한 번 · 칩이 모자라거나 직전 공격이 없으면 쓰지 않는다', () => {
  const { g, h } = setup();
  g.gmRand = () => 0.99;                              // 눈 6
  const m = mob(g, h.x + 300, h.y);
  use(g, 'dd'); run(g, .5);
  assert.equal(m.hp, HP); assert.equal(gamblerView(h).cd.dd, 0, '직전 공격이 없으면 대기도 없다');
  use(g, 'dice', [m.x, m.y]); run(g, .6);
  use(g, 'dd'); run(g, .5);
  near(HP - m.hp, U * DC.muls[5], 0.02, '칩이 모자라면 나가지 않는다');
  h.gm.chips = 5;
  use(g, 'dd'); run(g, .6);
  near(HP - m.hp, U * DC.muls[5] * (1 + DD.k), 0.02, '70% 한 번');
  assert.equal(gamblerView(h).chips, 2);
  assert.ok(gamblerView(h).cd.dd > DD.cd - 1);
  // 코인 폭우는 합의 70% · 풀 베팅을 일으키지 않는다
  const r = setup(); const m2 = mob(r.g, r.h.x + 300, r.h.y);
  use(r.g, 'rain', [m2.x, m2.y]); run(r.g, 1.6);
  r.h.gm.chips = GM.chips; r.h.gm.cd.dd = 0;
  const before = m2.hp; use(r.g, 'dd'); run(r.g, 1.2);
  near(before - m2.hp, U * RN.mul * RN.n * DD.k, 0.02);
  assert.equal(gamblerView(r.h).chips, GM.chips - DD.cost, '다시 낸 공격은 풀 베팅을 쓰지 않는다');
  // 777 은 다시 내지 않는다
  const j = setup(); const m3 = mob(j.g, j.h.x + 300, j.h.y);
  use(j.g, 'jack', [m3.x, m3.y]); run(j.g, 2); j.h.gm.chips = 5;
  const b3 = m3.hp; use(j.g, 'dd'); run(j.g, .6);
  assert.equal(m3.hp, b3);
});

test('황금 테이블 — 반경 280 · 1초마다 ×3(8번) + 끝 ×16 = ×40 · 처음 자리에 고정', () => {
  const { g, h } = setup();
  const a = mob(g, h.x + TB.r - 20, h.y), c = mob(g, h.x + TB.r + 60, h.y);
  const x0 = h.x;
  use(g, 'table'); run(g, 1.05);
  near(HP - a.hp, U * TB.mul, 0.02, '1초에 첫 틱');
  h.x += 400; run(g, TB.dur);
  near(HP - a.hp, U * (TB.mul * 8 + TB.endMul), 0.02, '합 ×40');
  assert.equal(TB.mul * 8 + TB.endMul, 40);
  assert.equal(c.hp, HP);
  assert.ok(x0 !== h.x);
});

test('하우스 엣지 — 12초 동안 코인 공격 +60% · 칩을 얻을 때마다 +1 더 · 운명의 눈은 그대로', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 200, h.y);
  use(g, 'edge'); step(g, .01);
  fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  near(HP - m.hp, U * CH.mul * (1 + EG.dmg), 0.02, '황금 칩 +60%');
  assert.equal(gamblerView(h).chips, 1 + EG.chip);
  g.gmRand = () => 0; const b = m.hp;
  use(g, 'dice', [m.x, m.y]); run(g, .6);
  near(b - m.hp, U * DC.muls[0], 0.02, '운명의 눈은 코인 공격이 아니다');
  run(g, EG.dur);
  assert.equal(gamblerView(h).edge, 0);
  assert.ok(gamblerView(h).cd.edge > 0 && gamblerView(h).cd.edge < EG.cd - EG.dur + 1, '대기는 누른 순간부터');
});

test('777 종결식 — 코인 7번 ×10 + 마지막 ×60 · 100 · 170(50 · 35 · 15%) · 황금 계약 최고 잭팟은 ×25 충격파 · 궁극기 시전', () => {
  assert.deepEqual([JK.ends, JK.odds], [[60, 100, 170], [.5, .35, .15]]);
  for (const [r, res] of [[0.1, 0], [0.6, 1], [0.9, 2]]) {
    const { g, h } = setup();
    g.gmRand = () => r;
    const m = mob(g, h.x + 300, h.y);
    use(g, 'jack', [m.x, m.y]); run(g, JK.first - .05);
    assert.equal(m.hp, HP, '0.5초 전에는 피해가 없다');
    run(g, 1.3);
    near(HP - m.hp, U * (70 + JK.ends[res]), 0.02, `결과 ${res}`);
  }
  assert.deepEqual(JK.ends.map(e => 70 + e), [130, 170, 240]);
  const { g, h } = setup(200, [50, 50, 50]);
  assert.ok(gmContract(h.bag.hj.jobs.gambler));
  g.gmRand = () => 0.99; const m = mob(g, h.x + 300, h.y);
  use(g, 'jack', [m.x, m.y]); run(g, 2);
  near(HP - m.hp, U * (240 + JK.shockMul), 0.02, '황금 계약');
});

test('칩 장막 — 최대 체력 18%(방어 50 → 26%) · 7초(방어 25 → 9초) · 실제로 막으면 칩 +1(0.8초에 한 번) · 다 쓰면 깨진다', () => {
  assert.deepEqual(veilStat(cleanGmJob({ tr: [[0, 0], [0, 0], [0, 0]] })), { self: .18, ally: .12, dur: 7 });
  assert.deepEqual(veilStat(cleanGmJob({ tr: [[0, 0], [25, 0], [0, 0]] })), { self: .18, ally: .12, dur: 9 });
  assert.deepEqual(veilStat(cleanGmJob({ tr: [[0, 0], [50, 0], [0, 0]] })), { self: .26, ally: .17, dur: 9 });
  const { g, h } = setup();
  use(g, 'veil'); step(g, .01);
  const v = gamblerView(h);
  near(v.sh.v, h.max * VL.self, 0.01);
  const hp = h.hp;
  rpgSandboxHit(g, 0, 0.05); step(g, .01);
  assert.equal(h.hp, hp, '보호막이 다 받는다');
  assert.equal(gamblerView(h).chips, 1);
  rpgSandboxHit(g, 0, 0.02); step(g, .01);
  assert.equal(gamblerView(h).chips, 1, '0.8초 안에는 다시 얻지 않는다');
  run(g, VL.chipGap);
  rpgSandboxHit(g, 0, 0.02); step(g, .01);
  assert.equal(gamblerView(h).chips, 2);
  rpgSandboxHit(g, 0, 0.3); step(g, .01);
  assert.equal(gamblerView(h).sh, null, '다 쓰면 깨진다');
  assert.ok(h.hp < hp, '넘친 피해는 몸이 받는다');
  // 시간이 다 되면 사라진다 · 장막이 없으면 맞아도 칩이 없다
  const q = setup(); use(q.g, 'veil'); run(q.g, VL.dur + .1);
  assert.equal(gamblerView(q.h).sh, null);
  rpgSandboxHit(q.g, 0, 0.05); assert.equal(gamblerView(q.h).chips, 0);
});

test('직업 레벨 해금 — 5 · 15 · 30 · 55 · 100 · 150 · 200 전에는 쓰지 못한다', () => {
  assert.deepEqual(GM.unlock, { chip: 1, veil: 5, dice: 15, rain: 30, dd: 55, table: 100, edge: 150, jack: 200 });
  const { g, h } = setup(14);
  const m = mob(g, h.x + 200, h.y);
  use(g, 'dice', [m.x, m.y]); run(g, .6);
  assert.equal(m.hp, HP);
  use(g, 'veil'); step(g, .01);
  assert.ok(gamblerView(h).sh, '칩 장막은 5레벨부터');
  h.bag.hj.jobs.gambler.lv = 15;
  use(g, 'dice', [m.x, m.y]); run(g, .6);
  assert.ok(m.hp < HP);
});

test('성장 — 직업 경험치 10 + 레벨 · 연마 100 + 20 × 레벨 · 유효 적중 시전당 +10 · 허수아비는 연마를 주지 않는다', () => {
  assert.equal(gmJobNeed(1), 11); assert.equal(gmTrainNeed(0), 100); assert.equal(gmTrainNeed(49), 1080);
  const { g, h } = setup(1);
  const J = h.bag.hj.jobs.gambler;
  mob(g, h.x + 200, h.y);
  fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  assert.deepEqual(J.tr[0], [0, 10], '황금 칩 적중 — 금화 +10');
  gamblerKill({ fx() {} }, g, { type: 'rabbit' }, [h]);
  assert.equal(J.xp, 1);
  for (let i = 0; i < 10; i++) gamblerKill({ fx() {} }, g, { type: 'rabbit' }, [h]);
  assert.equal(J.lv, 2);
  // 허수아비
  const d = setup(1); d.g.mobs.push({ ...structuredClone(proto), id: d.g.nextId++, type: 'dummy', map: SANDBOX.id, x: d.h.x + 200, y: d.h.y, hp: HP, max: HP, dead: false });
  rpgInput(d.g, { cls: 0, kind: 'fire', dir: true }); for (let i = 0; i < 45; i++) rpgStep(d.g, .01);
  assert.deepEqual(d.h.bag.hj.jobs.gambler.tr[0], [0, 0]);
  assert.equal(gamblerView(d.h).chips, 1, '허수아비도 칩은 준다(써 보려고)');
});

test('쓰러지면 보호막 · 테이블 · 하우스 엣지 · 칩이 풀린다', () => {
  const { g, h } = setup();
  use(g, 'veil'); use(g, 'table'); use(g, 'edge'); h.gm.chips = 4; step(g, .01);
  rpgTrain(g, 0, { op: 'god' }); if (h.trn.god) rpgTrain(g, 0, { op: 'god' });
  h.hp = 1; h.gm.sh.v = 0.5; rpgSandboxHit(g, 0, 0.3); step(g, .01);
  assert.ok(h.down > 0);
  const v = gamblerView(h);
  assert.deepEqual([v.chips, v.sh, v.edge, v.tbl], [0, null, 0, 0]);
});

test('도트 시트 — 규격이 직접 그린 스크립트(make.py)의 manifest 와 같고 파일이 있다 · pixelfx 를 쓰지 않는다', () => {
  const man = JSON.parse(readFileSync(new URL('../design/effects/gambler/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(GAMBLER_PX)), man);
  for (const k of Object.keys(GAMBLER_PX)) assert.ok(existsSync(new URL(`../public/assets/game/rpg/effects/hidden-jobs/gambler/px/${k}.webp`, import.meta.url)), k);
  assert.equal(Object.keys(GAMBLER_ICON).length, GAMBLER_PX.gm_icons.n);
  const art = readFileSync(new URL('../src/game/gamblerArt.js', import.meta.url), 'utf8'), make = readFileSync(new URL('../design/effects/gambler/make.py', import.meta.url), 'utf8');
  assert.ok(!/import[^\n]*pixelfx/i.test(art) && !/import[^\n]*pixelfx/i.test(make));
});

test('연출 — 규칙이 내는 sk_gm_* 종류는 모두 그리는 곳이 있고, 쓰는 소리는 sfx.js 에 있다', () => {
  const job = readFileSync(new URL('../src/game/gamblerJob.js', import.meta.url), 'utf8'), sfx = readFileSync(new URL('../src/game/sfx.js', import.meta.url), 'utf8');
  const kinds = new Set([...job.matchAll(/kind: "(sk_gm_\w+)"/g)].map(m => m[1]));
  assert.ok(kinds.size >= 20, `종류 ${kinds.size}`);
  for (const k of kinds) assert.ok(GAMBLER_CAP[k] > 0, `${k} 그리는 곳`);
  for (const k of GAMBLER_GROUND) assert.ok(GROUND_FX.has(k) && GAMBLER_CAP[k] > 0, k);
  const snds = new Set([...job.matchAll(/"(gm[A-Z]\w+)"/g)].map(m => m[1]));
  assert.ok(snds.size >= 9);
  for (const n of snds) assert.ok(sfx.includes(`name === "${n}"`), `소리 ${n}`);
});
