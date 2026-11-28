/* BLOOD-001 최종 강화 · 버그 수정(11월 16일 사용자 기획) — 실제 게임 함수로 배율 · 신규 스킬 · 각성 · 결투 · 혈역을 본다.
   node --test tools/blood-final.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgDuel, rpgFire, physMul, startDash, predictDash, JOBS, DUEL } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { BLOOD, BLOOD_SHOT as S, BLOOD_SMASH as M, BLOOD_FORM as F, BLOOD_FIELD as FD, BLOOD_WAVE as WV, BLOOD_HOOK as HK,
  BLOOD_PIERCE as PC, BLOOD_SEA as SEA, BLOOD_LEGION as LG, BLOOD_ORIGIN as OG, BLOOD_AWAKE as AW, BLOOD_KEYS } from '../src/game/bloodJobData.js';
import { stableCap, unlockBlood, bloodView, bloodJobDown, applyBloodJob, bloodCost, costCut, shotTier, newLock, awakeLock, overCap, bloodTired, bloodJobSlow } from '../src/game/bloodJob.js';
import { KEY_ACTIONS, defaultKeys, BLOOD_ACTS } from '../src/game/keys.js';
import { highTake } from '../src/game/highCombat.js';
import { duelHealing, healCut } from '../src/game/duelBalance.js';
import { BLOOD_COST_CUT, BLOOD_STATE } from '../src/game/bloodJobData.js';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.02, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
function setup() {
  const g = makeWorld(); g.out = [];
  rpgSyncSeats(g, [{ id: 'b0', name: '혈액', hero: { name: '혈액', job: 'warrior', elem: 'frost', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '혈액', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 100, hp: 100 }, bag: { oc: 1, n: 1 } }, 'b0');
  const h = g.heroes[0];
  h.map = 'train'; h.x = 900; h.y = 700; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  step(g, .01);
  unlockBlood(h); step(g, .01);
  return { g, h };
}
// 직업 레벨 · 영구 연마 [압축, 증폭, 형상화] · 혈량
function job(h, lv, tr = [0, 0, 0], b = stableCap(lv)) { h.bag.bd.lv = lv; tr.forEach((l, i) => { h.bag.bd.tr[i][0] = l; }); h.bag.bd.b = b; }   // 기본 혈량은 안정 한계(증폭 · 과충전 보너스가 끼지 않게)
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: 'train', x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const send = (g, dir) => rpgInput(g, { cls: 0, kind: 'blood', dir });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
const tap = (g) => { fire(g, true); step(g, .01); fire(g, false); run(g, F.sword.gap + .02); };
const shot0 = (g) => { send(g, { op: 'press', s: 'shot' }); send(g, { op: 'release', s: 'shot' }); };
// 기준 — 기본 적혈탄(×2.5) 한 발 피해. 이 값으로 다른 배율을 잰다
function unit() { const { g, h } = setup(); job(h, 1); const m = mob(g, h.x + 200, h.y); shot0(g); run(g, .5); return (HP - m.hp) / S.tiers[0].mul; }
const U = unit();

/* ── 기존 스킬 상향 ── */
test('적혈탄 — 기본 ×2.5 · 1단계 ×5.5 · 2단계 ×11 · 대기 0.1 · 0.5 · 0.7초', () => {
  assert.deepEqual(S.tiers.map(q => [q.mul, q.at, q.cd]), [[2.5, 0, .1], [5.5, 0.6, .5], [11, 1.2, .7]]);
  const { g, h } = setup(); job(h, 1);
  const m = mob(g, h.x + 200, h.y);
  send(g, { op: 'press', s: 'shot' }); run(g, S.full + .02); send(g, { op: 'release', s: 'shot' }); run(g, .6);
  near(HP - m.hp, U * 11, 0.02, '2단계');
});

test('적혈탄 압축형 45 — 팽창 ×3(110) · 압축형 50 — 팽창 ×5 · 반경 150 · 혈흔 대상 +20% · 2단계 최대 ×16', () => {
  for (const [lv, R, mul] of [[45, 110, 3], [50, 150, 5]]) {
    const { g, h } = setup(); job(h, 1, [lv, 0, 0]);
    const a = mob(g, h.x + 200, h.y), side = mob(g, h.x + 200, h.y + (R - 20) * 0.78), out = mob(g, h.x + 200, h.y + (R + 30) * 0.78);
    send(g, { op: 'press', s: 'shot' }); run(g, S.full + .02); send(g, { op: 'release', s: 'shot' }); run(g, .6);
    near(HP - side.hp, U * mul, 0.02, `연마 ${lv} 팽창`);
    assert.equal(out.hp, HP, `연마 ${lv} 반경 밖`);
    const str = 1 + S.strDmg * S.strPer * lv;          // 압축 강도 보너스는 본탄에만
    near(HP - a.hp, U * (11 * str + mul), 0.02, `연마 ${lv} 본탄 + 팽창`);
  }
  const { g, h } = setup(); job(h, 1, [50, 0, 0]);
  const m = mob(g, h.x + 200, h.y); h.bd.mk['m' + m.id] = [1, 10];
  shot0(g); run(g, .5);
  near(HP - m.hp, U * 2.5 * (1 + 0.02 + 0.2), 0.02, '혈흔 1중첩 + 20%');
});

test('혈수 강타 — ×9 · 최대 차징 ×11 + 지면 폭발 ×4 · 증폭형 50 최대 차징 ×15 + 4 = ×19 · 범위 +50% · 보스 경직 없음', () => {
  { const { g, h } = setup(); job(h, 20); const m = mob(g, h.x + 120, h.y);
    send(g, { op: 'press', s: 'smash' }); send(g, { op: 'release', s: 'smash' }); run(g, 1); near(HP - m.hp, U * 9, 0.02, '기본'); }
  { const { g, h } = setup(); job(h, 20); const m = mob(g, h.x + 120, h.y);
    send(g, { op: 'press', s: 'smash' }); run(g, M.full + .05);
    run(g, M.delay - .02); near(HP - m.hp, U * 11, 0.02, '주먹');
    run(g, M.blast.delay + .05); near(HP - m.hp, U * 15, 0.02, '주먹 + 지면 폭발'); }
  { const { g, h } = setup(); job(h, 20, [0, 50, 0]); const m = mob(g, h.x + 120, h.y), far = mob(g, h.x + 240 * 1.3, h.y, { boss: 1 });
    send(g, { op: 'press', s: 'smash' }); run(g, M.full + 1);
    near(HP - m.hp, U * 19, 0.02, '증폭형 50 최대 차징 합');
    assert.ok(far.hp < HP, '길이 +50% — 240 너머도 맞는다');
    assert.ok(far.stun > 990 && far.stun < 999.01, '보스에게 경직 · 넉백을 새로 걸지 않는다'); }
});

test('혈검 — ×1.5 · 형상화 25 ×2 · 50 ×3 · 50 은 세 번째 참격마다 참격파 ×4(사거리 300) · 다시 만들면 횟수 0', () => {
  for (const [lv, mul] of [[0, 1.5], [25, 2], [50, 3]]) {
    const { g, h } = setup(); job(h, 20, [0, 0, lv]);
    const m = mob(g, h.x + 60, h.y);
    send(g, { op: 'sword' }); run(g, F.sword.form + .02); tap(g);
    near(HP - m.hp, U * mul, 0.02, `형상화 ${lv}`);
  }
  const { g, h } = setup(); job(h, 20, [0, 0, 50]);
  const m = mob(g, h.x + 60, h.y), far = mob(g, h.x + 250, h.y);
  send(g, { op: 'sword' }); run(g, F.sword.form + .02);
  tap(g); tap(g); assert.equal(far.hp, HP, '두 번째까지는 참격파 없음');
  tap(g); run(g, .3);
  near(HP - far.hp, U * 4, 0.02, '세 번째 참격파');
  near(HP - m.hp, U * (3 * 3 + 4), 0.02, '가까운 대상은 참격과 참격파 모두');
  h.bd.sw = null; h.bd.cd.sword = 0; send(g, { op: 'sword' }); run(g, F.sword.form + .02);
  assert.equal(h.bd.sw.i, 0, '혈검을 다시 만들면 횟수 0');
});

test('혈막 — 형상화 50 은 PvE 50% · 사람 피해는 35% · 가시 반격 ×4(1초 간격 · 3번)', async () => {
  const { bloodJobTake } = await import('../src/game/bloodJob.js');
  const E = { fx() {}, say() {} };
  const { g, h } = setup(); job(h, 20, [0, 0, 50]);
  const m = mob(g, h.x + 80, h.y);
  send(g, { op: 'press', s: 'veil' });
  assert.equal(bloodJobTake(E, g, h, 100, m), 50, 'PvE 50%');
  assert.equal(bloodJobTake(E, g, h, 100, { hero: g.heroes[0] }), 65, '사람 35%');
  run(g, .05); near(HP - m.hp, U * 4, 0.02, '가시 한 번');
  for (let i = 0; i < 6; i++) { bloodJobTake(E, g, h, 100, m); run(g, 1.02); }
  near(HP - m.hp, U * 12, 0.02, '혈막 하나에 3번까지');
  const b = setup(); job(b.h, 20, [0, 0, 49]); send(b.g, { op: 'press', s: 'veil' });
  assert.equal(bloodJobTake(E, b.g, b.h, 100, null), 100 * (1 - Math.min(F.veil.redMax, F.veil.red + 49 * F.veil.redPer)), '49 는 예전 그대로');
});

test('혈류 파동 — ×5 · 증폭형 50 은 0.3초 뒤 두 번째 파동 ×4(같은 대상 · 합 ×9)', () => {
  { const { g, h } = setup(); job(h, 20); const m = mob(g, h.x + 300, h.y); send(g, { op: 'press', s: 'wave' }); run(g, 1); near(HP - m.hp, U * 5); }
  const { g, h } = setup(); job(h, 20, [0, 50, 0]); const m = mob(g, h.x + 300, h.y);
  send(g, { op: 'press', s: 'wave' }); run(g, .2); near(HP - m.hp, U * 5, 0.02, '첫 파동');
  run(g, 1); near(HP - m.hp, U * 9, 0.02, '두 번째 파동');
});

test('혈쇄 갈고리 — 도착 ×5 + 반경 100 충격파 ×3 · 형상화 50 ×8 · 대상이 죽으면 추가 피해 없음', () => {
  for (const [lv, mul] of [[0, 5], [50, 8]]) {
    const { g, h } = setup(); job(h, 20, [0, 0, lv]);
    const m = mob(g, h.x + 350, h.y), side = mob(g, h.x + 350, h.y + 70 * 0.78), out = mob(g, h.x + 350, h.y + 160 * 0.78);
    send(g, { op: 'press', s: 'hook' }); run(g, .5);
    near(HP - m.hp, U * (mul + 3), 0.02, `형상화 ${lv}`); near(HP - side.hp, U * 3, 0.02, '충격파'); assert.equal(out.hp, HP);
  }
  const { g, h } = setup(); job(h, 20);
  const m = mob(g, h.x + 350, h.y);
  send(g, { op: 'press', s: 'hook' }); run(g, .25); m.dead = true; m.hp = 0; run(g, .4);
  assert.equal(m.hp, 0, '죽은 대상에는 추가 피해 없음');
});

/* ── 신규 스킬 ── */
test('신규 스킬 해금 — 직업 레벨 + 영구 연마 · 원초적 지배는 직업 200 + 연마 합계 150', () => {
  const bd = { lv: 79, tr: [[50, 0], [50, 0], [50, 0]] };
  assert.match(newLock(bd, PC), /직업 레벨 80/);
  bd.lv = 80; bd.tr[0][0] = 34; assert.match(newLock(bd, PC), /압축형 연마 35/);
  bd.tr[0][0] = 35; assert.equal(newLock(bd, PC), '');
  assert.match(newLock({ lv: 130, tr: [[0], [39], [0]] }, SEA), /증폭형 연마 40/);
  assert.match(newLock({ lv: 170, tr: [[0], [0], [44]] }, LG), /형상화 연마 45/);
  assert.match(newLock({ lv: 200, tr: [[50], [50], [49]] }, OG), /형상화 연마 50/);
  assert.match(awakeLock({ lv: 200, tr: [[50], [50], [49]] }), /연마 합계 150/);
  assert.equal(awakeLock({ lv: 200, tr: [[50], [50], [50]] }), '');
  const { g, h } = setup(); job(h, 79, [50, 50, 50]); mob(g, h.x + 200, h.y);
  send(g, { op: 'press', s: 'pierce' }); assert.equal(h.bd.cd.pierce, 0); assert.equal(h.bag.bd.b, stableCap(79), '잠겨 있으면 비용 · 대기 없음');
});

test('흑혈 관통 — 혈량 50 · 대기 12 · 본탄 ×18 → 잔상 3 × ×5 → 혈흔 5중첩 ×9 · 합 ×42 · 혈흔은 마지막에 소비 · 줄 위 모두 관통', () => {
  const { g, h } = setup(); job(h, 80, [35, 0, 0]);
  const m = mob(g, h.x + 300, h.y), back = mob(g, h.x + 600, h.y);
  h.bd.mk['m' + m.id] = [5, 10];
  send(g, { op: 'press', s: 'pierce' });
  assert.equal(h.bag.bd.b, stableCap(80) - bloodCost(false, 50, 80)); assert.equal(h.bd.cd.pierce, PC.cd);   // 80레벨 — 레벨 감소 11.25%(11월 28일): 50 → 45
  run(g, PC.charge + .2); near(HP - m.hp, U * 18, 0.02, '본탄');
  assert.equal(h.bd.mk['m' + m.id][0], 5, '혈흔은 아직 남는다');
  run(g, 1.5);
  near(HP - m.hp, U * 42, 0.02, '합');
  near(HP - back.hp, U * 33, 0.02, '뒤의 대상도 관통(혈흔 없음 18 + 15)');
  assert.equal(h.bd.mk['m' + m.id], undefined, '마지막 잔상에서 혈흔 소비');
  assert.equal(highTake({ hshT: 1, hshCut: 0.5 }, 1000, 0.3), 650, '보스 강철 방패 감소 30% 무시');
});

test('혈해 개문 — 혈량 70 · 대기 30 · 1초마다 ×5 × 8 + 끝 폭발 ×25 = ×65 · 안에서 다른 혈액 스킬 +40% · 중복 설치 불가', () => {
  const { g, h } = setup(); job(h, 130, [0, 40, 0]);
  const m = mob(g, h.x + 300, h.y);
  send(g, { op: 'press', s: 'sea' });
  assert.equal(h.bag.bd.b, stableCap(130) - bloodCost(false, 70, 130)); assert.equal(h.bd.cd.sea, SEA.cd); assert.ok(h.bd.sea);   // 70 → 55
  h.bd.cd.sea = 0; send(g, { op: 'press', s: 'sea' }); assert.equal(h.bag.bd.b, stableCap(130) - bloodCost(false, 70, 130), '열려 있으면 다시 못 연다');
  run(g, 1.02); near(HP - m.hp, U * 5, 0.02, '첫 틱(혈해 보너스 없음)');
  const before = m.hp; shot0(g); run(g, .4);
  near(before - m.hp, U * 2.5 * 1.4, 0.02, '혈해 안 적혈탄 +40%');
  run(g, SEA.dur);
  near(HP - m.hp, U * (65 + 2.5 * 1.4), 0.02, '합');
  assert.equal(h.bd.sea, null);
});

test('혈형 군단 — 혈량 90 · 대기 45 · 분신 3 × 5번 × ×4 + 끝 합동 ×20 = 단일 ×80 · 본체가 친 적을 먼저 쫓는다', () => {
  const { g, h } = setup(); job(h, 170, [0, 0, 45]);
  const m = mob(g, h.x + 200, h.y), other = mob(g, h.x - 120, h.y);
  h.bd.lt = 'm' + m.id;                              // 본체가 마지막으로 친 적
  send(g, { op: 'press', s: 'legion' });
  assert.equal(h.bag.bd.b, stableCap(170) - bloodCost(false, 90, 170)); assert.equal(h.bd.cd.legion, LG.cd); assert.equal(h.bd.lg.c.length, 3);
  run(g, LG.dur + .1);
  near(HP - m.hp, U * 80, 0.02, '단일 대상 최대');
  assert.equal(other.hp, HP, '가까운 다른 적보다 본체가 친 적을 먼저');
  assert.equal(h.bd.lg, null);
  const b = setup(); job(b.h, 170, [0, 0, 45]); mob(b.g, b.h.x + 200, b.h.y);
  send(b.g, { op: 'press', s: 'legion' }); run(b.g, 1); bloodJobDown({ fx() {}, sys() {}, say() {} }, b.g, b.h);
  assert.equal(b.h.bd.lg, null, '쓰러지면 분신이 사라진다');
});

test('원초의 혈맥 — 1.2초 차징 · 혈량 120 · 대기 90 · 창 12 × ×6 + 폭발 ×75 = ×147 · 보스 최대 체력 8%(최대 600만) 한 번', () => {
  const { g, h } = setup(); job(h, 200, [50, 50, 50], 300);
  const m = mob(g, h.x + 300, h.y);
  send(g, { op: 'press', s: 'origin' });
  assert.ok(h.bd.og); assert.equal(h.bag.bd.b, 300, '차징 중에는 아직 내지 않는다');
  run(g, OG.full + .02); assert.equal(h.bag.bd.b, 300 - bloodCost(false, 120, 200)); assert.ok(h.bd.cd.origin > OG.cd - 0.1);
  run(g, 2); near(HP - m.hp, U * 147, 0.02, '공격력 기반 합');
  const b = setup(); job(b.h, 200, [50, 50, 50], 300);
  const boss = mob(b.g, b.h.x + 300, b.h.y, { boss: 1 });
  send(b.g, { op: 'press', s: 'origin' }); run(b.g, OG.full + 2.1);
  near(HP - boss.hp, U * 147 + OG.bossMax, 0.02, '보스 — 600만 상한');
  const c = setup(); job(c.h, 200, [50, 50, 50], 300);
  const small = mob(c.g, c.h.x + 300, c.h.y, { boss: 1, hp: 5e7, max: 5e7 });
  send(c.g, { op: 'press', s: 'origin' }); run(c.g, OG.full + 2.1);
  near(5e7 - small.hp, U * 147 + 5e7 * OG.bossPct, 0.02, '보스 — 최대 체력 8%(400만)');
  const d = setup(); job(d.h, 200, [50, 50, 50], 300); mob(d.g, d.h.x + 300, d.h.y);
  send(d.g, { op: 'press', s: 'origin' }); run(d.g, .5); d.h.cc = { stun: 1 }; run(d.g, .2);
  assert.equal(d.h.bd.og, null, '기절하면 끊긴다'); assert.equal(d.h.bag.bd.b, 300, '비용 없음');
});

test('원초적 지배 — 15초 · 대기 120 · 피해 +100% · 소모 -50% · 평타 혈흔 3 · 시전마다 잔상 60% 한 번 · 탈진 없음 · 끝날 때 과부하 정리', () => {
  const { g, h } = setup(); job(h, 200, [50, 50, 50], 200);
  const m = mob(g, h.x + 200, h.y);
  send(g, { op: 'press', s: 'awake' });
  assert.ok(h.bd.aw); assert.equal(h.bd.cd.awake, AW.cd);
  assert.equal(bloodCost(true, 20), 10); assert.equal(bloodCost(true, 5), 5); assert.equal(bloodCost(true, 35), 20);
  const b0 = h.bag.bd.b;
  send(g, { op: 'press', s: 'shot' }); run(g, S.full + .02); send(g, { op: 'release', s: 'shot' }); run(g, .6);
  assert.equal(h.bag.bd.b, b0 - bloodCost(true, 20, 200), '2단계 20 → 지배 10 → 200레벨 감소까지 5');
  const str = 1 + S.strDmg * S.strPer * 50;
  near(HP - m.hp, U * ((11 * str) * 2 * (1 + AW.echo) + 5 * 2), 0.03, '피해 +100% · 첫 적중(본탄)에만 잔상 60% 한 번');
  // 평타 — 혈흔 3중첩
  delete h.bd.mk['m' + m.id]; m.x = h.x + 40; h.bd.sw = null; h.cd = 0; fire(g, true); step(g, .02); fire(g, false); run(g, .3);
  assert.equal(h.bd.mk['m' + m.id][0], 3);
  // 폭주가 끝나도 탈진하지 않는다
  h.bd.rg = { k: 1, t: .05 }; run(g, .1); assert.equal(h.bd.rg, null);
  // 끝날 때 과부하 한계 이상이면 기존 과부하 규칙
  run(g, AW.dur - h.bd.aw.t - 0.05); h.bag.bd.b = overCap(200); run(g, 0.1);
  assert.equal(h.bd.aw, null); assert.equal(h.bd.rg.k, 1, '과부하 → 폭주'); assert.equal(h.bag.bd.b, 60);
});

/* ── 혈역 증폭 ── */
test('혈역 증폭 — 적 없는 곳에서도 1초마다 +30 · 경험치는 적이 있을 때만 · 증폭형 50 은 혈역 안 혈액 스킬 +30%', () => {
  const { g, h } = setup(); job(h, 100, [0, 0, 0], 0);
  send(g, { op: 'press', s: 'field' }); run(g, 1.02);
  assert.equal(h.bag.bd.b, 30, '혈량 0 에서 1초 뒤 +30');
  run(g, 3); assert.equal(h.bag.bd.b, 120);
  send(g, { op: 'release', s: 'field' }); assert.equal(h.bag.bd.tr[1][1], 0, '적이 없으면 증폭형 경험치 없음');
  run(g, 1); assert.equal(h.bag.bd.b, 120, '취소하면 더 오르지 않는다');
  const b = setup(); job(b.h, 100, [0, 50, 0], 100);
  const m = mob(b.g, b.h.x + 200, b.h.y);
  send(b.g, { op: 'press', s: 'field' }); shot0(b.g); run(b.g, .4);
  near(HP - m.hp, U * 2.5 * 1.3, 0.02, '증폭형 50 혈역 +30%');
  const c = setup(); job(c.h, 100, [0, 0, 0], 100); c.h.map = 'plaza';
  send(c.g, { op: 'press', s: 'field' }); assert.equal(c.h.bd.fd, null, '광장에서는 못 쓴다');
});

/* ── 결투 ── */
function duel(job = 'warrior') {
  const g = makeWorld(); g.out = [];
  const seats = [0, 1].map(i => ({ id: `d${i}`, name: `결투${i}`, hero: { name: `결투${i}`, job: i ? 'mage' : job, elem: 'frost', gender: 'm' } }));
  rpgSyncSeats(g, seats);
  seats.forEach((s, i) => rpgJoin(g, i, { name: s.name, rs: RESET.id, gift: GIFT.id, lv: 400, ts: 0, stats: { str: 100, int: 100, hp: 200 }, bag: { oc: 1, w: [], n: 1 } }, s.id));
  g.mobs = [];
  const [h, o] = g.heroes;
  [h, o].forEach(q => { q.auto = 0; q.inv = 0; q.fire = 0; });
  assert(rpgDuel(g, 0, { op: 'ask', to: 1, size: 1 })); assert(rpgDuel(g, 1, { op: 'accept' }));
  run(g, DUEL.ready + .02);
  [h, o].forEach((q, i) => { q.map = 'arena'; q.x = 1000 + i * 60; q.y = 900; q.inv = 0; q.calm = 0; q.look = [1, 0]; q.dir = 1; });
  return { g, h, o };
}
test('결투 — 혈검은 참격마다 새 시전이라 50초 동안 계속 피해(예전 버그: 상한을 다 쓴 뒤 0) · 참격마다 18% 상한', () => {
  const { g, h, o } = duel(); unlockBlood(h); job(h, 20, [0, 0, 50], 300);
  h.buff = 100; h.buffAmt = 1e6;                     // 한 참격이 상한에 닿을 만큼 세게
  send(g, { op: 'sword' }); run(g, F.sword.form + .02);
  for (let i = 0; i < 6; i++) {
    o.hp = o.max; const before = o.hp; tap(g);
    assert.ok(before - o.hp > 0, `${i + 1}번째 참격 피해`);
    assert.ok(before - o.hp <= o.max * DUEL.skillPct * (i % 3 === 2 ? 1 : 1) + 1, '참격(+참격파)은 한 시전 18% 상한');
  }
  run(g, 40); o.hp = o.max; const late = o.hp; tap(g);
  assert.ok(late - o.hp > 0, '40초 뒤 후반 참격도 피해');
});
test('결투 — BLOOD-001 결투 피해 ×2(평타 기준) · 다른 직업은 그대로 · 혈수 강타 · 혈류 파동 · 적혈탄도 체력이 준다', () => {
  { const { g, h, o } = duel(); const before = o.hp; h.cd = 0; rpgFire(g, 0, true); rpgStep(g, .01); rpgFire(g, 0, false);
    near(before - o.hp, JOBS[0].dmg * physMul(h) * DUEL.dmgMul, 1e-6, '일반 직업'); }
  { const { g, h, o } = duel(); unlockBlood(h); job(h, 20); const before = o.hp; h.cd = 0; rpgFire(g, 0, true); rpgStep(g, .01); rpgFire(g, 0, false); for (let i = 0; i < 25; i++) rpgStep(g, .01);   // 레퀴엠 사격 — 탄이 닿을 때까지(11월 20일 히든 계열)
    near(before - o.hp, JOBS[0].dmg * physMul(h) * DUEL.dmgMul * DUEL.bloodMul, 1e-6, 'BLOOD-001 ×2');
    assert.ok(h.bd.mk['h1'], '상대에게도 혈흔'); }
  for (const s of ['smash', 'wave', 'shot']) {
    const { g, h, o } = duel(); unlockBlood(h); job(h, 20); o.x = h.x + 100;
    const before = o.hp; send(g, { op: 'press', s }); send(g, { op: 'release', s }); run(g, 1);
    assert.ok(before - o.hp > 0, `${s} 피해`);
  }
});
test('결투 — 원초의 혈맥은 궁극기 상한 25% · 체력 비례 피해 없음 · 혈해 다단 히트도 한 시전 18%', () => {
  { const { g, h, o } = duel(); unlockBlood(h); job(h, 200, [50, 50, 50], 300); h.buff = 100; h.buffAmt = 1e7; o.x = h.x + 200;
    const before = o.hp; send(g, { op: 'press', s: 'origin' }); run(g, OG.full + 2.2);
    assert.ok(before - o.hp > 0); assert.ok(before - o.hp <= o.max * DUEL.ultPct + 1, `${(before - o.hp) / o.max}`); }
  { const { g, h, o } = duel(); unlockBlood(h); job(h, 130, [0, 40, 0], 300); h.buff = 100; h.buffAmt = 1e7;
    const before = o.hp; send(g, { op: 'press', s: 'sea' }); run(g, SEA.dur + .2);
    assert.ok(before - o.hp > 0); assert.ok(before - o.hp <= o.max * DUEL.skillPct + 1, `${(before - o.hp) / o.max}`); }
  { const { g, h } = duel(); unlockBlood(h); job(h, 100); h.dph = 1; send(g, { op: 'press', s: 'field' }); assert.equal(h.bd?.fd || null, null, '결투 시작 전에는 혈역 없음'); }
});

/* ── 저장 · 화면 · 키 ── */
test('스냅샷 — 새 대기 · 각성 · 혈해 · 차징 칸은 뒤에 붙고 옛 줄도 읽는다', () => {
  const { g, h } = setup(); job(h, 200, [50, 50, 50], 300); mob(g, h.x + 200, h.y);
  send(g, { op: 'press', s: 'awake' }); send(g, { op: 'press', s: 'sea' });
  const guest = makeWorld(); rpgApply(guest, rpgPack(g));
  const v = bloodView(guest.heroes[0]);
  assert.equal(v.cd.awake, AW.cd); assert.equal(v.cd.sea, SEA.cd); assert.ok(v.aw && v.aw.left > 14); assert.ok(v.sea);
  const o = { bag: { bd: { on: 1, lv: 20, b: 50 } } };
  applyBloodJob(o, [50, 20, 0, [0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 3, 0, 0, 0], 0, [], 0, 0, 0, 0, 0, 0]);
  assert.equal(o.bdv.cd.pierce, 0); assert.equal(o.bdv.aw, null); assert.equal(o.bdv.sea, null);
});
test('키 — 신규 다섯 칸은 다른 기본 키와 겹치지 않는다', () => {
  const keys = defaultKeys(), used = new Map();
  KEY_ACTIONS.forEach(a => keys[a.id].filter(Boolean).forEach(k => { assert.ok(!used.has(k), `${k} ${a.id} · ${used.get(k)}`); used.set(k, a.id); }));
  for (const id of ['bPierce', 'bSea', 'bLegion', 'bOrigin', 'bAwake']) assert.ok(BLOOD_ACTS.includes(id));
  assert.deepEqual([keys.bPierce[0], keys.bSea[0], keys.bLegion[0], keys.bOrigin[0], keys.bAwake[0]], [BLOOD_KEYS.pierce, BLOOD_KEYS.sea, BLOOD_KEYS.legion, BLOOD_KEYS.origin, BLOOD_KEYS.awake]);
});
test('쓰러지면 혈해 · 분신 · 차징 · 각성이 모두 걷힌다', () => {
  const { g, h } = setup(); job(h, 200, [50, 50, 50], 340); mob(g, h.x + 200, h.y);
  ['awake', 'sea', 'legion', 'origin'].forEach(s => send(g, { op: 'press', s }));
  assert.ok(h.bd.aw && h.bd.sea && h.bd.lg && h.bd.og);
  bloodJobDown({ fx() {}, sys() {}, say() {} }, g, h);
  assert.deepEqual([h.bd.aw, h.bd.sea, h.bd.lg, h.bd.og], [null, null, null, null]);
});

/* ── 11월 28일 — 레벨별 혈량 소모 감소 · 탈진 디버프 ── */
test('혈량 소모 감소 — 직업 레벨 25 · 50 … 200 에서 단계당 3.75% · 최대 30% · 5 단위 · 0 아래로 내려가지 않는다', () => {
  assert.equal(BLOOD_COST_CUT.steps.length, 8); assert.equal(costCut(24), 0);
  const eq = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m} ${a} ${b}`);
  BLOOD_COST_CUT.steps.forEach((lv, i) => { eq(costCut(lv), 0.0375 * (i + 1), `${lv}레벨`); eq(costCut(lv - 1), 0.0375 * i, `${lv - 1}레벨`); });
  eq(costCut(200), 0.3, '200');
  assert.equal(bloodCost(false, 50, 0), 50, '레벨 감소가 없으면 그대로'); assert.equal(bloodCost(false, 50, 24), 50);
  assert.equal(bloodCost(false, 50, 200), 35); assert.equal(bloodCost(false, 120, 200), 85); assert.equal(bloodCost(false, 20, 200), 15);
  assert.equal(bloodCost(true, 50, 200), 20, '지배 -50% 와 곱한다 — 50 × 0.7 × 0.5 = 17.5 → 5 단위 반올림 20');
  for (let lv = 1; lv <= 200; lv++) for (const n of [5, 10, 15, 20, 25, 30, 35, 50, 70, 90, 120]) for (const aw of [false, true]) {
    const c = bloodCost(aw, n, lv);
    assert.ok(c >= 5 && c % 5 === 0 && c <= n, `${lv}레벨 ${n} → ${c}`);
    if (lv < 200) assert.ok(bloodCost(aw, n, lv + 1) <= c, '레벨이 오르면 소모는 늘지 않는다');
  }
});
test('혈량 소모 감소 — 줄어든 값으로 차징 단계가 열리고 실제로 그만큼 쓴다', () => {
  assert.equal(shotTier(1.3, 15, false, 0), 1); assert.equal(shotTier(1.3, 15, false, 200), 2, '200레벨 2단계 20 → 15');
  const { g, h } = setup(); job(h, 200, [0, 0, 0], 100); mob(g, h.x + 200, h.y);
  send(g, { op: 'press', s: 'shot' }); run(g, S.full + .02); send(g, { op: 'release', s: 'shot' }); run(g, .2);
  assert.equal(h.bag.bd.b, 100 - 15, '200레벨 적혈탄 2단계 20 → 15');
});
test('탈진 — 25초 · 피해 -90% · 이동 -85% · 체력 회복 -95%, 폭주 10초 · 회복 길이 모두 같은 값', () => {
  assert.equal(BLOOD_STATE.tired.dur, 25); assert.equal(BLOOD_STATE.rage.dur, 10);
  const h = { bd: { rg: { k: 2, t: 25 } } };
  near(healCut(h), 0.05, 1e-9); near(duelHealing({ ...h, map: 'plaza' }, 1000), 50, 1e-6, '물약 · 응급 처치 · 치유 · 흡혈이 지나는 길');
  assert.equal(healCut({ bd: { rg: { k: 1, t: 5 } } }), 1, '폭주 중에는 그대로'); assert.equal(healCut({}), 1); assert.equal(healCut(null), 1);
});

/* ── 11월 28일 — 탈진 중 대쉬 금지 · 손님 걷기 감속 ── */
test('탈진 중에는 대쉬하지 못한다 — 서버 판정 · 손님 먼저 그리기 모두, 폭주 · 평소에는 된다', () => {
  const { g, h } = setup(); job(h, 100);
  h.bd.rg = { k: 2, t: 20 }; assert.ok(bloodTired(h));
  const x0 = h.x; rpgInput(g, { cls: 0, kind: 'dash', dir: [1, 0] }); run(g, .3);
  assert.ok(!(h.dash > 0), '대쉬 시간이 켜지지 않는다'); assert.equal(h.dashCd || 0, 0, '대기도 돌지 않는다'); assert.ok(Math.abs(h.x - x0) < 5, '제자리');
  assert.ok(JSON.stringify(g.fx).includes('탈진 중에는 대쉬할 수 없습니다'), '짧은 안내');
  assert.equal(startDash(h, [1, 0]), false); assert.equal(predictDash(h), false);
  h.bd.rg = { k: 1, t: 5 }; assert.ok(!bloodTired(h)); rpgInput(g, { cls: 0, kind: 'dash', dir: [1, 0] }); assert.ok(h.dash > 0, '폭주 중에는 대쉬된다');
  run(g, .5); h.bd.rg = null; h.dashCd = 0; rpgInput(g, { cls: 0, kind: 'dash', dir: [1, 0] }); assert.ok(h.dash > 0, '탈진이 끝나면 대쉬된다');
});
test('손님 화면도 탈진 감속 · 폭주 가속으로 걷는다(h.bdv) — 방장 자리로 되돌려지며 빨라 보이던 것', () => {
  const { h } = setup();
  const host = (rg) => { h.bd.rg = rg; return bloodJobSlow(h); };
  const guest = (rg) => { const bd = h.bd; h.bd = null; h.bdv = { rg, ch: null, fd: null, og: null }; const v = bloodJobSlow(h); h.bd = bd; h.bdv = null; return v; };
  for (const rg of [null, { k: 1, t: 5 }, { k: 2, t: 20 }]) assert.equal(guest(rg), host(rg));
  near(guest({ k: 2, t: 20 }), 0.15, 1e-6, '탈진 이동 -85%'); near(guest({ k: 1, t: 5 }), 1.15, 1e-6);
});
