// Wyvern Knight 006 획득 루트 「잠든 날개의 서약」 — 테스트 서버에서 처음부터 서약까지 한 번에 지나가는지 본다.
//   node --test tools/wyvern-quest.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { wqInput, tickWq, wqHas, wqSpotById, wqSpotNear, cleanWu, packWq, applyWq, wqStage, wqView, wqInFan, wqInRoar } from '../src/game/wyvernQuest.js';
import { WQ_ROUTE, WQ_TRIAL as T, WQ_FLAGS, WQ_STAGES, WQ_SPOTS, WQ_MAPS, WQ_EXITS, WQ_BOOK } from '../src/game/wyvernQuestData.js';
import { libBooksFor, LIB_BOOK_BY_ID } from '../src/game/libraryBooks.js';
import { MAPS, SNAP_ORDER } from '../src/game/rpg.js';
const MAP_IDS = SNAP_ORDER.maps;

function world(test) {
  const h = { pi: 0, loaded: true, down: 0, map: 'luen-library-2', x: 0, y: 0, dir: 1, bag: { v: 0 } };
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
const spot = (id) => wqSpotById(id) || WQ_SPOTS.find((s) => s.npc === id && wqSpotById(s.id));
// 그 자리에 서서 조사 — 화면 창이 보내는 값과 같은 것. 주민 단추는 지금 보이는 것을 고른다
function at(w, id) {
  const cands = wqSpotById(id) ? [wqSpotById(id)] : WQ_SPOTS.filter((s) => s.npc === id);
  w.h.map = cands[0].map; w.h.x = cands[0].at[0]; w.h.y = cands[0].at[1];
  tickWq(w.E, w.g, w.h, 0.05);
  const s = cands.find((q) => wqSpotNear(w.h, true) === q) || cands[0];
  return s;
}
const act = (w, id, v) => { const s = at(w, id); wqInput(w.E, w.g, 0, { op: 'act', id: s.id, v }); return w.h.wqRun ? w.h.wqRun.R[1] : -1; };
const tick = (w, sec) => { for (let t = 0; t < sec; t += 0.05) tickWq(w.E, w.g, w.h, 0.05); };

test('실제 게임에도 열렸다(11월 25일) — 테스트 서버가 아니어도 책 · 바위가 보인다', () => {
  assert.equal(WQ_ROUTE.live, true);
  const w = world(false);
  assert.equal(libBooksFor({ map: 'luen-library', wyt: 0 }).some((b) => b.id === WQ_BOOK), true);
  wqInput(w.E, w.g, 0, { op: 'read', book: WQ_BOOK });
  assert.equal(wqHas(w.h, 'book_read'), true);
});

test('책은 루엔 도서관에만, 테스트 서버에서만 꽂힌다', () => {
  assert.ok(LIB_BOOK_BY_ID[WQ_BOOK]);
  assert.equal(libBooksFor({ map: 'luen-library-2', wyt: 1 }).some((b) => b.id === WQ_BOOK), true);
  assert.equal(libBooksFor({ map: 'erden-library-2', wyt: 1 }).some((b) => b.id === WQ_BOOK), false);
  const w = world(false);
  w.h.map = 'erden-library-2';
  wqInput(w.E, w.g, 0, { op: 'read' });
  assert.equal(wqHas(w.h, 'book_read'), false);
});

test('맵 7곳은 MAP_IDS 끝에 붙고 안전 지역이다', () => {
  const ids = WQ_MAPS.map((m) => m.id);
  assert.deepEqual(MAP_IDS.slice(-ids.length), ids);
  for (const id of ids) { assert.ok(MAPS[id].safe); assert.ok(MAPS[id].story); }
  for (const q of WQ_EXITS) assert.ok(MAPS[q.to], q.to);
});

test('테스트 서버 — 도서관부터 서약까지', () => {
  const w = world(true), h = w.h;
  // 1 책 · 주민 증언
  wqInput(w.E, w.g, 0, { op: 'read', book: WQ_BOOK });
  assert.ok(wqHas(h, 'book_read'));
  for (const id of ['luen-librarian', 'luen-elder-npc', 'luen-inn-npc']) assert.equal(act(w, id), 1, id);
  assert.ok(wqHas(h, 'ask_seoha') && wqHas(h, 'ask_maru') && wqHas(h, 'ask_saebom'));
  // 2 바위 — 바람을 먼저 느껴야 틈으로 간다
  assert.equal(act(w, 'fp-rock-m', 1), 2);
  assert.equal(act(w, 'fp-rock-m', 0), 1);
  act(w, 'fp-rock-m', 1);
  assert.equal(h.map, 'wq_ridge');
  // 3 바람등성이 — 문턱을 찾아야 돌문이 열린다
  assert.equal(act(w, 'rg-door', 0), 3);
  act(w, 'rg-pillar'); act(w, 'rg-sill');
  assert.equal(act(w, 'rg-door', 0), 1);
  act(w, 'rg-door', 1); assert.equal(h.map, 'wq_bridge');
  // 4-1 바람다리 — 강풍에 홈 밖이면 밀린다, 홈을 차례로 밟으면 통과
  act(w, 'br-stone');
  assert.equal(wqView(h).tr.id, 'bridge');
  h.x = 1200; h.y = 1000; tick(w, T.bridge.calm + T.bridge.lift + 0.1);
  assert.deepEqual([h.x, h.y], T.bridge.start);
  for (const p of T.bridge.grooves) { [h.x, h.y] = p; tick(w, 0.1); }
  [h.x, h.y] = T.bridge.goal; tick(w, 0.1);
  assert.ok(wqHas(h, 'trial_bridge'));
  act(w, 'br-gate', 1); assert.equal(h.map, 'wq_gallery');
  // 4-2 회랑 — 자국 난 석상 앞이 아닌 발판에서 세 회차
  act(w, 'ga-stone');
  for (let r = 0; r < T.gallery.rounds; r++) {
    const tr = h.wqRun.tr, p = T.gallery.plates.find((q, i) => i !== tr.mark && !wqInFan(tr.mark, q[0], q[1]));
    [h.x, h.y] = p;
    tick(w, T.gallery.warn + 0.1);
    tick(w, T.gallery.gap + 0.1);
  }
  assert.ok(wqHas(h, 'trial_gallery'));
  act(w, 'ga-gate', 1); assert.equal(h.map, 'wq_oath');
  // 4-3 맹세의 문 — 날개가 닫혔을 때 치면 튕기고, 펼쳤을 때 세 번
  act(w, 'oa-stone');
  [h.x, h.y] = T.oath.legs[0];
  wqInput(w.E, w.g, 0, { op: 'skill', s: 'strike' });
  assert.equal(h.wqRun.tr.hits, 0);
  while (!wqHas(h, 'trial_oath')) {
    tick(w, 0.1);
    if (h.wqRun.tr && h.wqRun.tr.ph === 1) [h.x, h.y] = [T.oath.legs[1][0] + 200, T.oath.legs[1][1] + 300];   // 내려찍기 피하기
    if (h.wqRun.tr && h.wqRun.tr.ph === 2) { [h.x, h.y] = T.oath.legs[0]; wqInput(w.E, w.g, 0, { op: 'skill', s: 'strike' }); }
  }
  act(w, 'oa-gate', 0); act(w, 'oa-gate', 1); assert.equal(h.map, 'wq_sanctum');
  // 5 잠든 신전 — 셋을 보면 발견
  act(w, 'sn-neck'); act(w, 'sn-prints');
  assert.equal(wqHas(h, 'wyvern_found'), false);
  act(w, 'sn-altar', 0);
  assert.ok(wqHas(h, 'wyvern_found'));
  // 6 봉화대 — 단서 · 피난길 · 통풍구(첫째는 틀림)
  act(w, 'luen-smith-npc'); act(w, 'lantern-pass');
  act(w, 'frost-summit', 1); assert.equal(h.map, 'wq_trail');
  act(w, 'tr-burnt'); act(w, 'tr-cairn', 0); act(w, 'tr-cairn', 1); assert.equal(h.map, 'wq_beacon');
  act(w, 'bc-memo');
  assert.equal(act(w, 'bc-lamp', 0), 2);
  assert.equal(act(w, 'bc-lamp', 1), 1);
  assert.equal(act(w, 'bc-lamp', 0), 1);
  assert.ok(wqHas(h, 'ember_got'));
  // 7 각성 · 결투 — 보여 준 패턴만큼만 체력이 깎인다
  act(w, 'sn-altar', 0); assert.ok(wqHas(h, 'awakened'));
  act(w, 'sn-duel', 1);
  const tr = h.wqRun.tr; assert.equal(tr.id, 'duel');
  [h.x, h.y] = [T.duel.at[0], T.duel.at[1] + 100];
  for (let i = 0; i < 40; i++) { tr.cd = 0; wqInput(w.E, w.g, 0, { op: 'skill', s: 'strike' }); }
  assert.equal(tr.hp, T.duel.floor[0]);
  tr.shown = 3;
  for (let i = 0; i < 40 && h.wqRun.tr; i++) { h.wqRun.tr.cd = 0; wqInput(w.E, w.g, 0, { op: 'skill', s: 'strike' }); }
  assert.ok(wqHas(h, 'duel_won'));
  // 8 사건 조사 · 대답 · 서약
  act(w, 'sn-story');
  act(w, 'sn-prints2'); act(w, 'sn-shield'); act(w, 'sn-mark');
  assert.equal(act(w, 'sn-ask', 1), 5);
  assert.equal(act(w, 'sn-ask', 0), 1);
  at(w, 'sn-desk');
  wqInput(w.E, w.g, 0, { op: 'contract', yes: true });
  assert.ok(wqHas(h, 'claimed'));
  assert.equal(h.bag.hj.active, 'wyvern', '계승하면 직업이 실제로 켜진다');
});

test('결투 — 포효 부채꼴 · 피해로 체력이 다하면 입구로', () => {
  const tr = { at: [1000, 800], aim: [1, 0] };
  assert.equal(wqInRoar(tr, 1300, 800), true);
  assert.equal(wqInRoar(tr, 700, 800), false);
});

test('저장 · 스냅샷 · 단계 건너뛰기', () => {
  assert.equal(cleanWu({ f: [0, 0] }), null);
  assert.deepEqual(cleanWu({ f: [5, -1, 'x'] }).f.slice(0, 1), [5]);
  assert.ok(WQ_FLAGS.length <= 48);
  const w = world(true);
  tickWq(w.E, w.g, w.h, 0.05);
  WQ_STAGES.forEach((S, i) => {
    wqStage(w.h, i);
    assert.equal(w.h.map, S.map, S.name);
    for (const f of S.set) assert.ok(wqHas(w.h, f), `${S.name} ${f}`);
  });
  const o = {}; applyWq(o, packWq(w.h)); assert.equal(o.wyt, 1);
  applyWq(o, 0); assert.equal(o.wyt, 0);
});
