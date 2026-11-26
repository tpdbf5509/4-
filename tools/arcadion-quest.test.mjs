/* 아르카디온 획득 「돌아올 길을 지킨 검」(11월 27일) — 실제 게임 함수로 칼등 정상 시작 · 귀환로 · 고정쇠 셋 · 보상을 처음부터 끝까지 지나간다.
   node --test tools/arcadion-quest.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, MAPS, SNAP_ORDER } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { whyEquip, cleanBag, specialTier } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { WY_WEAPON_ITEM, WY_CONTRACT as CT, WYVERN as WV } from '../src/game/wyvernData.js';
import { unlockWyvern, wyLock, wySummitFree } from '../src/game/wyvernJob.js';
import { wqHas, wqSpotById, wqSpotShown, wqSpotNear, packWq, applyWq, wqStage, cleanAu, aqMarkAt } from '../src/game/wyvernQuest.js';
import { AQ, AQ_FLAGS, WQ_SPOTS, WQ_STAGES, WQ_EXITS, WQ_BLOCKS } from '../src/game/wyvernQuestData.js';
import { weaponCap } from '../src/game/shopData.js';

Math.random = () => 0.1;   // 첫 돌판 내려찍기는 위 표식(0)
const step = (g, dt = 0.05) => rpgStep(g, dt);
const run = (g, t) => { for (let n = 0; n < Math.round(t / 0.05); n++) step(g); };
function setup(jobLv = 5, map = 'blade-ridge', at = AQ.summit.at) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'w0', name: '용기사', hero: { name: '용기사', job: 'warrior', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '용기사', rs: RESET.id, gift: GIFT.id, lv: 150, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, t: 'sword', r: 0, g: 0, p: 0 }], e: 1 } }, 'w0');
  const h = g.heroes[0];
  h.map = map; [h.x, h.y] = at; h.auto = 0; h.dir = 1;
  if (jobLv) unlockWyvern(h, { lv: jobLv });
  step(g);
  return { g, h };
}
const go = (h, id) => { const s = wqSpotById(id); h.map = s.map; [h.x, h.y] = s.at; return s; };
const act = (g, h, id, v) => { go(h, id); rpgInput(g, { cls: 0, kind: 'wq', dir: { op: 'act', id, v } }); step(g); return h.wqRun ? h.wqRun.R[1] : -1; };
const summon = (g) => { rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s: 'contract' } }); step(g); };
const hint = WQ_SPOTS.find((s) => s.npc === 'ridge-summit' && s.act.lines && s.act.lines[0].includes('날개를 부르면'));

test('맵은 MAP_IDS 끝 · 안전 지역 · 출구가 있는 맵으로 간다', () => {
  assert.equal(SNAP_ORDER.maps.at(-1), 'wq_return');
  assert.ok(MAPS.wq_return.safe);
  for (const q of WQ_EXITS.filter((e) => e.map === 'wq_return')) assert.ok(MAPS[q.to]);
  assert.ok(WQ_BLOCKS.wq_return.length > 20);
});

test('정상 조사 문구 — 와이번 나이트 직업 레벨 5 부터만, 다른 직업 · 레벨 4 는 원래 문구', () => {
  const lv4 = setup(4).h, lv5 = setup(5).h, none = setup(0).h;
  assert.equal(wqSpotShown(lv4, hint), false);
  assert.equal(wqSpotShown(none, hint), false);
  assert.equal(wqSpotShown(lv5, hint), true);
});

test('정상 범위 안에서만 안전 지역 제한 · 용혈 30 을 면제한다. 레벨 · 대기 · 한 마리 제한은 그대로', () => {
  const { g, h } = setup(5);
  assert.equal(MAPS['blade-ridge'].safe, true);
  assert.equal(h.wy.blood, 0);
  assert.equal(wySummitFree(h), true);
  summon(g);
  assert.ok(h.wy.u, '용혈 0 · 안전 지역이어도 정상에서는 나온다');
  assert.equal(h.wy.blood, 0);
  assert.equal(wqHas(h, 'a_start'), true, '실제 소환 뒤 시작을 먼저 기록');
  const u = h.wy.u; summon(g);
  assert.equal(h.wy.u, u, '두 번째 소환은 안 된다');
  // 범위 밖(같은 안전 지역)에서는 원래대로 막힌다
  const o = setup(5); o.h.x = AQ.summit.at[0] - 400; o.h.y = 640;
  assert.equal(wySummitFree(o.h), false);
  summon(o.g); assert.equal(o.h.wy.u, null);
  assert.equal(wqHas(o.h, 'a_start'), false);
  // 직업 레벨 4 — 계약이 잠겨 있다
  const four = setup(4); summon(four.g); assert.equal(four.h.wy.u, null); assert.equal(wqHas(four.h, 'a_start'), false);
  // 대기 중 — 와이번이 사라진 뒤 대기(15초)가 끝나기 전에는 다시 안 된다
  const c = setup(5); summon(c.g); run(c.g, 1); c.h.wy.u.t = c.h.wy.u.dur; step(c.g);
  assert.equal(c.h.wy.u, null); assert.ok(c.h.wy.cd.contract > 0);
  summon(c.g); assert.equal(c.h.wy.u, null);
  run(c.g, CT.cd + 0.2); summon(c.g); assert.ok(c.h.wy.u);
});

test('시작 장면 — 아스라가 바위 옆에 앉고 끝나면 풀린다. 다른 맵으로 가도 돌문에서 이어간다', () => {
  const { g, h } = setup(5);
  summon(g);
  run(g, AQ.scene.sit + 0.5);
  assert.deepEqual([Math.round(h.wy.u.x), Math.round(h.wy.u.y)], AQ.sit);
  const v = {}; applyWq(v, packWq(h));
  assert.equal(v.wqv.sc.k, 'summit');
  run(g, AQ.scene.end);
  assert.equal(h.wy.u.pin, null);
  assert.equal(h.wqRun ? h.wqRun.sc : null, null);
  const door = wqSpotById('br-door');
  assert.equal(wqSpotShown(h, door), true);
  // 문은 마술사 「능선 위 운반함」(정상 가운데 r 100)과 겹치지 않는다
  assert.ok(Math.hypot(AQ.door[0] - AQ.summit.at[0], (AQ.door[1] - AQ.summit.at[1]) / 0.78) > 100 + door.r);
  act(g, h, 'br-door', 1);
  assert.equal(h.map, 'wq_return');
});

test('귀환로 처음부터 아르카디온까지 — 조사 셋 · 표지석 · 점화 · 걸쇠 · 고정쇠 셋 · 귀환 · 보상 한 번', () => {
  const { g, h } = setup(5);
  summon(g); run(g, AQ.scene.end + 0.2);
  act(g, h, 'br-door', 1);
  assert.equal(wqSpotShown(h, wqSpotById('ra-stone')), false);
  // 걸쇠는 점화 전에는 닿지 않는다(판정도 거절)
  assert.equal(act(g, h, 'ra-latch', 0), 3);
  for (const id of ['ra-chain', 'ra-claw', 'ra-groove']) act(g, h, id);
  assert.equal(wqSpotShown(h, wqSpotById('ra-stone')), true);
  act(g, h, 'ra-stone');
  assert.equal(wqHas(h, 'a_stone'), true);
  assert.equal(act(g, h, 'ra-mark', 0), 1); assert.equal(wqHas(h, 'a_fire'), true);
  assert.equal(act(g, h, 'ra-mark', 0), 6, '같은 행동은 다시 하지 않는다');
  assert.equal(act(g, h, 'ra-gate', 1), 3, '걸쇠 전에는 귀환로가 닫혀 있다');
  act(g, h, 'ra-latch', 0); assert.equal(wqHas(h, 'a_latch'), true);
  act(g, h, 'ra-gate', 1); assert.equal(h.y, 570);
  // 보상 — 귀환 전에는 못 뽑는다
  assert.notEqual(act(g, h, 'ra-sword', 0), 1);
  // 고정쇠 1 — 시련 시작 → 돌판 위로 → 예고(위 표식) → 아스라를 아래 표식으로 → 빗나감 → 잠금
  act(g, h, 'ra-anchor0');
  const tr = () => h.wqRun.tr;
  assert.equal(tr().id, 'anchor');
  run(g, 0.2); assert.equal(tr().ph, 1); assert.equal(tr().side, 0);
  act(g, h, 'ra-mk01');
  assert.equal(tr().wy, 1);
  go(h, 'ra-anchor0'); run(g, AQ.warn + 0.1);
  assert.equal(tr().ph, 2);
  act(g, h, 'ra-anchor0');
  assert.equal(wqHas(h, 'a_lock1'), true);
  // 고정쇠 2 — 직전에 쓴 표식(아래)을 노린다 → 위로 옮긴다
  go(h, 'ra-anchor1'); run(g, AQ.grace + 0.1);
  assert.equal(tr().n, 1); assert.equal(tr().side, 1, '직전에 쓴 표식이 공격 범위');
  act(g, h, 'ra-mk10'); go(h, 'ra-anchor1'); run(g, AQ.warn + 0.1);
  act(g, h, 'ra-anchor1'); assert.equal(wqHas(h, 'a_lock2'), true);
  // 고정쇠 3 — 빗나간 뒤 돌판이 기운다. 붙들기 전에는 잠기지 않는다
  go(h, 'ra-anchor2'); run(g, AQ.grace + 0.1);
  act(g, h, 'ra-mk21'); go(h, 'ra-anchor2'); run(g, AQ.warn + 0.1);
  act(g, h, 'ra-anchor2'); assert.equal(wqHas(h, 'a_lock3'), false, '기운 돌판 — 붙들기 먼저');
  act(g, h, 'ra-hold'); act(g, h, 'ra-anchor2');
  assert.equal(wqHas(h, 'a_lock3'), true);
  assert.equal(h.wqRun.tr, null, '시련 끝');
  // 귀환 — 부르면 기록을 먼저 남기고 아스라가 건너온다
  act(g, h, 'ra-home');
  assert.equal(wqHas(h, 'a_return'), true);
  run(g, AQ.walk + 1);
  assert.equal(h.wqRun.sc, null);
  // 보상 — 한 자루, 연타해도 한 번
  const n0 = h.bag.w.length;
  assert.equal(act(g, h, 'ra-sword', 0), 1);
  for (let i = 0; i < 4; i++) act(g, h, 'ra-sword', 0);
  assert.equal(h.bag.w.filter((w) => w.sp === WY_WEAPON_ITEM.id).length, 1);
  assert.equal(h.bag.w.length, n0 + 1);
  assert.equal(wqHas(h, 'a_got'), true);
  // 재접속 — 저장 값을 거쳐도 기록이 남는다(다시 받을 수 없다)
  const saved = cleanBag(JSON.parse(JSON.stringify(h.bag)), h);
  assert.deepEqual(saved.au, h.bag.au);
  assert.ok(saved.wu === undefined || saved.wu !== saved.au);
});

test('실패 — 내려찍기에 아스라 · 내가 맞거나 시간을 놓치면 그 고정쇠만 다시. 잠근 고정쇠는 남는다', () => {
  const { g, h } = setup(5, 'wq_return', [1200, 570]);
  wqStage(h, WQ_STAGES.length + 3);   // A4 고정쇠
  h.map = 'wq_return'; h.x = 1200; h.y = 570;
  act(g, h, 'ra-anchor0'); run(g, 0.2);
  // 아스라를 옮기지 않으면(가운데) 맞는다
  run(g, AQ.warn + 0.1);
  assert.equal(h.wqRun.tr.ph, 0); assert.equal(h.wqRun.tr.wy, -1);
  // 내가 붉은 원 안에 서 있으면 맞는다
  go(h, 'ra-anchor0'); run(g, AQ.grace + 0.1);
  act(g, h, 'ra-mk01'); [h.x, h.y] = aqMarkAt(0, h.wqRun.tr.side); run(g, AQ.warn + 0.1);
  assert.equal(h.wqRun.tr.ph, 0); assert.equal(h.wqRun.tr.wy, -1, '잘못된 조작은 처음으로');
  // 시간을 놓치면 다시
  go(h, 'ra-anchor0'); run(g, AQ.grace + 0.1);
  act(g, h, 'ra-mk01'); go(h, 'ra-anchor0'); run(g, AQ.warn + 0.1);
  assert.equal(h.wqRun.tr.ph, 2);
  run(g, AQ.open + 0.1);
  assert.equal(h.wqRun.tr.ph, 0);
  // 한 번 잠근 고정쇠는 다시 나가도 남는다
  go(h, 'ra-anchor0'); run(g, AQ.grace + 0.1);
  act(g, h, 'ra-mk01'); go(h, 'ra-anchor0'); run(g, AQ.warn + 0.1); act(g, h, 'ra-anchor0');
  assert.equal(wqHas(h, 'a_lock1'), true);
  h.map = 'blade-ridge'; step(g);
  assert.equal(h.wqRun ? h.wqRun.tr : null, null);
  assert.equal(wqHas(h, 'a_lock1'), true);
});

test('무기 가방이 가득 차면 받지 않고 다시 수령할 수 있다 · 이미 가진 아르카디온은 확인만', () => {
  const { g, h } = setup(5, 'wq_return');
  wqStage(h, WQ_STAGES.length + 4);
  h.bag.au.f[0] |= 1 << AQ_FLAGS.indexOf('a_return');
  while (h.bag.w.length < weaponCap(h)) h.bag.w.push({ u: h.bag.n++, t: 'sword', r: 0, g: 0, p: 0 });
  assert.equal(act(g, h, 'ra-sword', 0), 7);
  assert.equal(wqHas(h, 'a_got'), false);
  h.bag.w.pop();
  assert.equal(act(g, h, 'ra-sword', 0), 1);
  assert.equal(h.bag.w.filter((w) => w.sp === WY_WEAPON_ITEM.id).length, 1);
  // 관리자 지급으로 이미 가진 캐릭터
  const o = setup(5, 'wq_return');
  wqStage(o.h, WQ_STAGES.length + 4);
  o.h.bag.au.f[0] |= 1 << AQ_FLAGS.indexOf('a_return');
  o.h.bag.w.push({ u: o.h.bag.n++, t: 'sword', r: 0, g: 4, p: 0, sp: WY_WEAPON_ITEM.id });
  assert.equal(act(o.g, o.h, 'ra-sword', 0), 8);
  assert.equal(wqHas(o.h, 'a_got'), true);
  assert.equal(o.h.bag.w.filter((w) => w.sp === WY_WEAPON_ITEM.id).length, 1);
});

test('진행은 bag.au 에 따로 — 「잠든 날개의 서약」 단계 도구가 지우지 않는다 · 스냅샷 줄 66 에 시련이 실린다', () => {
  const { g, h } = setup(5, 'wq_return', [1200, 570]);
  wqStage(h, WQ_STAGES.length + 3);
  wqStage(h, 2);                      // 서약 단계로 바꿔도
  assert.equal(wqHas(h, 'a_latch'), true);
  assert.equal(cleanAu({ f: [0] }), null);
  h.map = 'wq_return'; [h.x, h.y] = [1200, 570];
  act(g, h, 'ra-anchor0'); run(g, 0.2);
  const v = {}; applyWq(v, packWq(h));
  assert.equal(v.wqv.tr.id, 'anchor'); assert.equal(v.wqv.tr.ph, 1);
  // 손님 화면 — 시련 중에는 표식 자리가 보이고 평소에는 숨는다
  assert.equal(wqSpotShown({ ...h, wqRun: null, wqv: v.wqv }, wqSpotById('ra-mk00')), true);
  assert.equal(wqSpotShown({ ...h, wqRun: null, wqv: null }, wqSpotById('ra-mk00')), false);
  assert.ok(wqSpotNear(h));
});

test('장착 · X 기술 — 캐릭터 레벨 100 부터 들고, 직업 레벨 125 부터 용참섬멸', () => {
  const { h } = setup(5);
  const w = { u: 99, t: WY_WEAPON_ITEM.t, r: specialTier(WY_WEAPON_ITEM), g: 4, p: 0, sp: WY_WEAPON_ITEM.id };
  h.bag.w.push(w);
  h.lv = 99; assert.ok(whyEquip(h, w.u).length > 0);
  h.lv = 100; assert.deepEqual(whyEquip(h, w.u), []);
  assert.ok(wyLock({ lv: 124 }, 'arcadion')); assert.equal(wyLock({ lv: 125 }, 'arcadion'), '');
  assert.equal(WV.unlock.arcadion, 125);
});
