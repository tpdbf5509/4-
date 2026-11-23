// Illusionist 005 획득 루트 「존재하지 않았던 공연」 — 테스트 서버에서 처음부터 계승까지 한 번에 지나가는지 본다.
//   node --test tools/illusion-quest.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { iqInput, tickIq, iqHas, iqSpotById, iqSpotNear, cleanIu, packIq, applyIq, iqStage, iqClones, iqDoll } from '../src/game/illusionQuest.js';
import { illusionOn, packIllusion, applyIllusion } from '../src/game/illusionJob.js';
import { cleanHj } from '../src/game/gamblerJob.js';
import { holds } from '../src/game/hiddenUnique.js';
import { IQ_ROUTE, IQ_TRIAL as T, IQ_EVIDENCE, IQ_FLAGS, IQ_STAGES } from '../src/game/illusionQuestData.js';

function world(test) {
  const h = { pi: 0, loaded: true, down: 0, map: 'dawnwood', x: 0, y: 0, dir: 1, bag: { v: 0 } };
  const g = { test, heroes: [h] };
  const said = [];
  const E = {
    fx: () => {}, say: (g0, m, x, y, t) => said.push(t), sys: (g0, pi, t) => said.push(t),
    place: (g0, hh, x, y) => { hh.x = x; hh.y = y; },
    goMap: (g0, hh, to, at) => { hh.map = to; [hh.x, hh.y] = at; },
    face: (hh) => hh.face || [1, 0],
  };
  return { g, h, E, said };
}
// 그 자리에 서서 조사 — 화면 창이 보내는 값과 같은 것
function at(w, id) { const s = iqSpotById(id); assert.ok(s, id); w.h.map = s.map; w.h.x = s.at[0]; w.h.y = s.at[1]; tickIq(w.E, w.g, w.h, 0.05); return s; }
const act = (w, id, v) => { at(w, id); iqInput(w.E, w.g, 0, { op: 'act', id, v }); return w.h.iqRun ? w.h.iqRun.R[1] : -1; };
// 여러 단계 자리 — 차례마다 정답을 넣는다
function solve(w, id) {
  const s = at(w, id);
  for (const st of s.act.steps) {
    if (iqHas(w.h, st.flag)) continue;
    const v = st.k === 'read' ? 0 : st.k === 'pick' ? (Array.isArray(st.ans) ? st.ans[0] : st.ans) : st.k === 'order' ? st.ans : st.items.map((it) => it.ans);
    assert.equal(act(w, id, v), 1, `${id} ${st.flag}`);
  }
}

test('11월 23일부터 실제 게임(테스트 서버가 아님)에도 자리가 보이고 받는다', () => {
  assert.equal(IQ_ROUTE.live, true);
  const w = world(false);
  w.h.map = 'dawnwood'; w.h.x = 1460; w.h.y = 1345;
  tickIq(w.E, w.g, w.h, 0.05);
  iqInput(w.E, w.g, 0, { op: 'act', id: 'v-bench', v: 1 });
  assert.equal(iqHas(w.h, 'ticket_found'), true);
});

test('테스트 서버 — 1장부터 계승까지', () => {
  const w = world(true), h = w.h;
  // 1장 벤치 · 주민 · 연못
  assert.equal(act(w, 'v-bench', 1), 1);
  assert.ok(iqHas(h, 'ticket_found'));
  solve(w, 'o-dew-pond-3');
  act(w, 'o-dew-pond-3', 'go');
  assert.equal(h.map, 'iq_fork');
  // 2장 숲길 — 틀린 길은 구간이 그대로, 동 → 서 → 북
  assert.equal(act(w, 'f-n', undefined), 2);
  for (const id of ['f-e', 'f-w', 'f-n']) assert.equal(act(w, id), 1);
  assert.ok(iqHas(h, 'route_solved')); assert.equal(h.map, 'iq_seats');
  // 3장 객석 · 조명 · 거울문
  assert.equal(act(w, 's-seat', [0, 3]), 2);
  solve(w, 's-seat'); solve(w, 's-device');
  act(w, 's-gate', 1); assert.equal(h.map, 'iq_real');
  // 4장 — 서문은 거울 쪽 고리를 돌려야 열린다
  assert.equal(act(w, 'r-door', 1), 3);
  act(w, 'r-a', 1); assert.equal(h.map, 'iq_mirror');
  solve(w, 'm-ring');
  act(w, 'r-door', 1); assert.equal(h.map, 'iq_store');
  act(w, 'st-ledger'); assert.ok(iqHas(h, 'dispatch_found'));
  // 5장 다섯 보관처
  solve(w, 'o-luen-inn-npc-4'); solve(w, 'o-lantern-pass-6');
  act(w, 'o-scree-field-7', 1); assert.equal(h.map, 'iq_scree'); solve(w, 'sc-merchant');
  act(w, 'o-frost-summit-8', 1); solve(w, 'fr-board');
  act(w, 'o-ridge-summit-9', 1);
  assert.equal(act(w, 'rd-ribbon', 0), 2);            // 추를 먼저 고정해야 한다
  act(w, 'rd-wheel', 0); assert.equal(act(w, 'rd-ribbon', 0), 1);
  for (const f of ['visited_luen', 'visited_lantern', 'visited_scree', 'visited_frost', 'visited_ridge', 'card_curtain', 'card_lamp', 'card_hand', 'card_mirror', 'card_seat']) assert.ok(iqHas(h, f), f);
  solve(w, 's-slot');
  act(w, 's-theatre', 1); assert.equal(h.map, 'iq_theatre');
  // 6장 증언 — 가진 증거만 고를 수 있다
  assert.equal(IQ_EVIDENCE.length, 5);
  solve(w, 'th-aud');
  act(w, 'th-under', 1); assert.equal(h.map, 'iq_under');
  for (const id of ['u-ledger', 'u-mirror', 'u-roster']) act(w, id);
  solve(w, 'u-table');
  solve(w, 'th-ian');
  act(w, 'th-stage', 1); assert.equal(h.map, 'iq_stage');
  // 8장 시험
  act(w, 'sg-start');
  const tr = () => h.iqRun.tr;
  const use = (s) => { iqInput(w.E, w.g, 0, { op: 'skill', s }); for (const k in tr()?.cd || {}) tr().cd[k] = 0; };
  const aimTo = (p) => { const dx = p[0] - h.x, dy = (p[1] - h.y) / 0.78, L = Math.hypot(dx, dy); h.face = [dx / L, dy / L]; };
  // 1막 — 반사 표적은 체력만 깎는다
  h.x = 950; h.y = 900; aimTo(T.fake[0]); use('card');
  assert.equal(tr().hp, T.hp - T.fakeHit);
  for (const p of T.real) { h.x = p[0]; h.y = p[1] + 200; aimTo(p); use('card'); }
  assert.equal(tr().step, 1);
  h.x = T.bundle.at[0]; h.y = T.bundle.at[1] + 200; aimTo(T.bundle.at); use('shuffle');
  assert.equal(tr().step, 2);
  h.face = [1, 0]; use('slash'); use('slash'); use('slash');
  assert.equal(tr().act, 1);
  // 2막
  { const d = iqDoll(tr()); h.x = d[0]; h.y = d[1] + 200; aimTo(d); use('prison'); }
  h.x = T.blinkFrom[0]; h.y = T.blinkFrom[1]; h.face = [1, 0]; use('blink');
  h.x = T.panel[0]; h.y = T.panel[1] + 300; h.face = [0, -1]; use('fist');
  assert.equal(tr().act, 2, JSON.stringify(tr().task));
  // 3막
  h.x = T.mirror[0]; h.y = T.mirror[1] + 100; use('mirror');
  aimTo(T.target); use('final');
  assert.equal(tr().act, 2, '박수 두 번 전에는 막을 내리지 못한다');
  use('card'); use('card'); use('final');
  assert.equal(tr().act, 3);
  // 최종막 — 좌우가 뒤집히지 않은 분신이 진짜
  h.x += 120;
  const cl = iqClones(tr(), h.x, h.y);
  aimTo(cl[tr().real]); h.x = cl[tr().real][0] - 100; h.y = cl[tr().real][1]; h.face = [1, 0];
  // 움직였으니 다시 계산해 가장 가까운 진짜를 겨눈다
  const real = iqClones(tr(), h.x, h.y)[tr().real]; h.x = real[0] - 60; h.y = real[1]; h.face = [1, 0];
  const r2 = iqClones(tr(), h.x, h.y)[tr().real]; aimTo(r2); use('card');
  assert.ok(iqHas(h, 'trial_passed') || tr()?.act === 3);
  if (!iqHas(h, 'trial_passed')) { for (let i = 0; i < 20 && !iqHas(h, 'trial_passed'); i++) { const c = iqClones(tr(), h.x, h.y); aimTo(c[tr().real]); use('card'); } }
  assert.ok(iqHas(h, 'trial_passed') && iqHas(h, 'story_complete'));
  // 계승 — 장부가 없는 방이라 유일 규칙 없이 바로 직업을 얻는다
  at(w, 'sg-desk');
  iqInput(w.E, w.g, 0, { op: 'contract', yes: true });
  assert.ok(iqHas(h, 'claimed'));
  assert.ok(illusionOn(h), '계승하면 마술사가 켜진다');
  assert.equal(h.bag.hj.active, 'illusionist');
  // 저장 값 · 스냅샷
  const iu = cleanIu(JSON.parse(JSON.stringify(h.bag.iu)));
  assert.deepEqual(iu.f, h.bag.iu.f);
  const o = {}; applyIq(o, packIq(h)); assert.equal(o.ilt, 1);
});

test('깃발은 뒤에만 더한다 — 기획서 표 차례 그대로', () => {
  assert.equal(IQ_FLAGS[0], 'ticket_found'); assert.equal(IQ_FLAGS[35], 'apology_requested');
  assert.equal(new Set(IQ_FLAGS).size, IQ_FLAGS.length);
});

test('테스트 도구 — 장마다 바로 가면 그 장 자리가 보인다', () => {
  IQ_STAGES.forEach((S, i) => {
    const w = world(true);
    iqStage(w.h, i); w.h.ilt = 1;
    assert.equal(w.h.map, S.map);
  });
});

test('마술사 — 저장 · 유일 규칙 · 손님 화면 값', () => {
  const hj = cleanHj({ active: 'illusionist', jobs: { illusionist: { lv: 12, xp: 3, tr: [[5, 1], [0, 0], [0, 0]] } } });
  assert.equal(hj.active, 'illusionist');
  assert.equal(hj.jobs.illusionist.lv, 12);
  assert.ok(holds({ hj }, 'illusionist'));
  const h = { map: 'dawnwood', bag: { hj }, il: { trick: 4, cd: { shuffle: 2.5 }, house: null, chain: 'slash', calm: 0.4, sl: { n: 1, t: 0.2 } } };
  const row = packIllusion(h);
  const o = { map: 'dawnwood', bag: { hj } };
  applyIllusion(o, JSON.parse(JSON.stringify(row)));
  assert.equal(o.ilv.trick, 4); assert.equal(o.ilv.cd.shuffle, 2.5); assert.equal(o.ilv.chain, 'slash');
  assert.equal(packIllusion({ map: 'dawnwood', bag: {} }), 0);
});
