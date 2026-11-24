/* 히든 직업 Gambler 002 실제 게임 연결(11월 16일 사용자 결정) — 저장 · 스냅샷 줄 57 · 관리자 명령어 · 해금 경로 · 다른 직업과의 관계.
   전투 규칙은 tools/gambler.test.mjs. node --test tools/gambler-live.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, rpgApplyOut, heroRecord, advArtPath, MAPS, SNAP_ORDER } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { cleanBag, whyEquip } from '../src/game/shop.js';
import { rpgAdminCmd } from '../src/game/adminCmd.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { TRAIN } from '../src/game/trainData.js';
import { GAMBLER as GM, GAMBLER_ID, GM_SPOTS, GM_CASINO as CA, GM_CLUE, GM_VEIL as VL } from '../src/game/gamblerData.js';
import { unlockGambler, dropGambler, gamblerOn, gamblerLook, gamblerView, cleanHj, packGambler } from '../src/game/gamblerJob.js';
import { gmSpotNear, gmSpotLine, gmSpotShown, cleanGu, gamblerDummyHit } from '../src/game/gamblerUnlock.js';
import { unlockBlood, bloodOn } from '../src/game/bloodJob.js';
import { BLOOD_SPOTS } from '../src/game/bloodJobData.js';
import { GAMBLER_PX, GAMBLER_PROP } from '../src/game/gamblerPxData.js';
import { GAMBLER_CAP } from '../src/game/gamblerArt.js';
import { existsSync } from 'node:fs';
Math.random = () => 0.999;

function setup(extra = {}) {
  const g = makeWorld(); g.out = []; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'g0', name: '도박', hero: { name: '도박', job: 'archer', gender: 'f' } }]);
  rpgJoin(g, 0, { name: '도박', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 },
    bag: { oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1, ...(extra.bag || {}) }, ...(extra.rec || {}) }, 'g0');
  const h = g.heroes[0];
  h.auto = 0; h.cd = 0;
  return { g, h };
}
const run = (g, t) => { for (let n = 0; n < Math.round(t / .02); n++) rpgStep(g, .02); };
const talk = (g) => rpgInput(g, { cls: 0, kind: 'talk' });
const use = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
const spot = (id) => GM_SPOTS.find((s) => s.id === id);
const goSpot = (h, id) => { const s = spot(id); h.map = s.map; h.x = s.x; h.y = s.y + 10; };
const J200 = { lv: 200, xp: 0, tr: [[50, 0], [50, 0], [50, 0]] };

test('저장 — 가방 정리가 bag.hj 를 싣는다 · 범위 밖 값은 줄인다 · 켜져 있으면 무기를 내려놓는다', () => {
  assert.equal(GM.live, true);
  const b = cleanBag({ oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1, hj: { active: 'gambler', jobs: { gambler: { lv: 999, xp: -4, tr: [[70, 0], [3, 99999], [0, 0]] }, other: { lv: 3 } }, version: 7 } });
  assert.deepEqual(b.hj, { active: 'gambler', jobs: { gambler: { lv: 200, xp: 0, tr: [[50, 0], [3, 159], [0, 0]] } }, version: 1 });
  assert.equal(b.e, 0, '무기는 내려놓는다'); assert.equal(b.w.length, 1, '가방에는 남는다');
  assert.ok(gamblerOn({ bag: b }));
  assert.equal(cleanBag({ oc: 1 }).hj, undefined, '없던 캐릭터에는 칸이 생기지 않는다');
  assert.equal(cleanBag({ oc: 1, hj: { active: 'gambler', jobs: {} } }).hj, undefined);
  const off = cleanBag({ oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1, hj: { active: '', jobs: { gambler: J200 } } });
  assert.equal(off.hj.active, ''); assert.equal(off.e, 1, '꺼져 있으면 무기는 그대로'); assert.equal(off.hj.jobs.gambler.lv, 200, '끈 뒤에도 직업 레벨 · 연마는 남는다');
});

test('저장 — 시험 중 빌린 값은 원래 값으로 · BLOOD-001 과 둘 다 켜진 기록은 Gambler 002 를 끈다 · 해금 진행은 bag.gu 에 따로', () => {
  assert.equal(cleanHj({ active: 'gambler', jobs: { gambler: { lv: 15 } }, trial: 1, prev: null }), null, '처음 시험하던 사람은 아무것도 남지 않는다');
  assert.equal(cleanHj({ active: 'gambler', jobs: { gambler: { lv: 15 } }, trial: 1, prev: { active: '', jobs: { gambler: J200 } } }).jobs.gambler.lv, 200);
  const both = cleanBag({ oc: 1, bd: { on: 1, lv: 10, xp: 0, tr: [[0, 0], [0, 0], [0, 0]], b: 100 }, hj: { active: 'gambler', jobs: { gambler: J200 } } });
  assert.equal(both.bd.on, 1); assert.equal(both.hj.active, '', '먼저 있던 BLOOD-001 을 남긴다'); assert.equal(both.hj.jobs.gambler.lv, 200);
  assert.deepEqual(cleanGu({ c: 99, f: 999, o: 5 }), { c: 7, f: 31, o: 1 });
  assert.equal(cleanGu({ c: 0, f: 0, o: 0 }), null);
  const b = cleanBag({ oc: 1, gu: { c: 3, f: 3, o: 1 }, bu: { c: 1, f: 3, o: 0 } });
  assert.deepEqual(b.gu, { c: 3, f: 3, o: 1 }); assert.deepEqual(b.bu, { c: 1, f: 3, o: 0 }, 'BLOOD-001 진행과 섞이지 않는다');
});

test('다시 접속 — 저장한 기록으로 들어오면 직업 레벨 · 연마가 그대로고 1차 전직은 비어 있다', () => {
  const { g, h } = setup(); h.advClass = 'ranger'; h.advM = 3;
  unlockGambler(h, J200);
  const rec = heroRecord(h, { lv: 250, advClass: 'ranger', advM: 3 }, null);
  assert.equal(rec.advClass, '', '저장 기록에 옛 전직이 되살아나지 않는다'); assert.equal(rec.bag.hj.active, 'gambler');
  const g2 = makeWorld(); g2.out = []; g2.wb.lastHour = Infinity;
  rpgSyncSeats(g2, [{ id: 'g0', name: '도박', hero: { name: '도박', job: 'archer', gender: 'f' } }]);
  rpgJoin(g2, 0, JSON.parse(JSON.stringify({ ...rec, name: '도박', rs: RESET.id, gift: GIFT.id })), 'g0');
  const h2 = g2.heroes[0];
  assert.ok(gamblerOn(h2)); assert.deepEqual(h2.bag.hj.jobs.gambler, J200); assert.equal(h2.advClass, ''); assert.equal(h2.bag.e, 0);
});

test('스냅샷 줄 57 — 손님 화면이 칩 · 직업 레벨 · 대기 · 보호막을 받고 도박꾼 그림을 쓴다. 이 직업이 아니면 0', () => {
  const { g, h } = setup();
  let row = rpgPack(g).h[0];
  assert.equal(row.length, 67, '영웅 줄은 뒤에만 늘었다(58 — Engineer 003 · 59 진혼곡 · 60 엔지니어 루트 · 61 · 62 Necromancer 004 · 63 · 64 Illusionist 005 · 65 · 66 Wyvern Knight 006)'); assert.equal(row[58], 0, '엔지니어가 아니면 0'); assert.equal(row[57], 0); assert.ok(row[56] === 0, 'BLOOD-001 칸(56)은 그대로');
  unlockGambler(h, J200); h.map = 'field'; h.x = 1500; h.y = 700;
  run(g, .1); h.gm.chips = 5; h.gm.luck = 2; use(g, 'veil'); run(g, .1);
  const snap = rpgPack(g); row = snap.h[0];           // 가방은 바뀐 때만 실린다 — 같은 스냅샷을 손님에게 준다
  assert.equal(row[57].length, 11, '칸 수는 고정'); assert.equal(row[57][0], 5); assert.equal(row[57][1], 200);
  const guest = makeWorld(); rpgApply(guest, snap);
  const q = guest.heroes[0], v = gamblerView(q);
  assert.ok(q.gmv && gamblerLook(q));
  assert.equal(v.chips, 5); assert.equal(v.lv, 200); assert.deepEqual(v.tr, J200.tr); assert.equal(v.luck, 2); assert.equal(v.tint, 'plum'); assert.ok(v.contract);
  assert.ok(v.cd.veil > VL.cd - 1 && v.cdMax.veil === VL.cd); assert.ok(v.sh && v.sh.v > 0 && v.sh.left > 0);
  assert.match(advArtPath(q, 'front'), /\/gambler-[mf]\/front\.webp$/);
  assert.ok(existsSync('public/assets/characters/rpg/gambler-f/front.webp') && existsSync('public/assets/characters/rpg/gambler-m/walk-side-0.webp'));
  // 방장 승계 — 손님이던 세계가 판정을 맡으면 칩 · 불운 보정을 이어받는다
  q.map = 'field'; rpgStep(guest, .02);
  assert.equal(q.gmv, null); assert.equal(q.gm.chips, 5); assert.equal(q.gm.luck, 2);
  dropGambler(h); rpgApply(guest, rpgPack(g));
  assert.equal(guest.heroes[0].gmv, null, '끄면 손님 화면 값도 사라진다');
  assert.equal(packGambler(h), 0);
});

test('관리자 명령어 /도박꾼 — 켜기 · 직업 레벨 · 연마 · 끄기. 관리자가 아니면 듣지 않는다', () => {
  const { g, h } = setup();
  rpgAdminCmd(g, 0, '/도박꾼 나'); assert.ok(!gamblerOn(h), '관리자만');
  h.admin = 1; h.advClass = 'ranger';
  assert.equal(rpgAdminCmd(g, 0, '/도박꾼 나'), true);
  assert.ok(gamblerOn(h)); assert.equal(h.bag.hj.jobs.gambler.lv, 1); assert.equal(h.advClass, ''); assert.equal(h.bag.e, 0);
  rpgAdminCmd(g, 0, '/도박꾼 도박 200'); assert.equal(h.bag.hj.jobs.gambler.lv, 200);
  rpgAdminCmd(g, 0, '/도박꾼 나 연마 50'); assert.deepEqual(h.bag.hj.jobs.gambler.tr, [[50, 0], [50, 0], [50, 0]]); assert.equal(h.bag.hj.jobs.gambler.lv, 200, '연마만 바꾸면 직업 레벨은 그대로');
  rpgAdminCmd(g, 0, '/도박꾼 나 999'); assert.equal(h.bag.hj.jobs.gambler.lv, GM.maxLv);
  rpgAdminCmd(g, 0, '/도박꾼 나 끄기'); assert.ok(!gamblerOn(h)); assert.equal(h.bag.hj.jobs.gambler.lv, GM.maxLv, '끈 뒤에도 기록은 남는다');
  rpgAdminCmd(g, 0, '/도박꾼 나'); assert.ok(gamblerOn(h)); assert.equal(h.bag.hj.jobs.gambler.lv, GM.maxLv, '다시 켜면 이어서');
  assert.equal(rpgAdminCmd(g, 0, '/도박꾼 없는사람'), undefined);
  const before = g.out.length; rpgAdminCmd(g, 0, '/도움');
  assert.ok(JSON.stringify(g.out.slice(before)).includes('/도박꾼'), '/도움 목록에 나온다');
});

test('히든 직업은 한 번에 하나 — BLOOD-001 을 켜면 Gambler 002 가 꺼지고, 반대도 같다. 전직 초기화 물약도 끈다', () => {
  const { g, h } = setup();
  unlockGambler(h, J200); unlockBlood(h);
  assert.ok(bloodOn(h) && !gamblerOn(h)); assert.equal(h.bag.hj.jobs.gambler.lv, 200);
  unlockGambler(h);
  assert.ok(gamblerOn(h) && !bloodOn(h)); assert.equal(h.bag.hj.jobs.gambler.lv, 200, '예전 기록을 잇는다');
  assert.ok(whyEquip(h, 1).some((t) => t.includes('무기를 들 수 없습니다')));
  h.bag.p = { ...(h.bag.p || {}), class_reset: 1 };
  const id = Object.keys(h.bag.p).find((k) => k === 'class_reset');
  rpgInput(g, { cls: 0, kind: 'shop', dir: { op: 'puse', id } });
  if (h.bag.p.class_reset === 0 || !h.bag.p.class_reset) assert.ok(!gamblerOn(h), '전직 초기화 물약이 끈다');
  rpgInput(g, { cls: 0, kind: 'adv', dir: { op: 'start', c: 'ranger' } });
});

test('해금 경로 — 칩 상자(단서 A)를 살펴야 계약서 · 주사위 기계가 보인다. 단서 둘이면 상자가 문이 된다', () => {
  const { g, h } = setup();
  assert.equal(spot('box').map, 'plaza'); assert.equal(spot('deed').map, 'dawnwood'); assert.equal(spot('machine').map, 'train');
  for (const s of GM_SPOTS) {                              // 자리 — 맵 안 · 막힌 곳 · NPC · 문 · BLOOD-001 조사 자리와 겹치지 않는다
    const M = MAPS[s.map];
    assert.ok(s.x > 60 && s.x < M.w - 60 && s.y > M.top + 40 && s.y < M.h - 40, s.id + ' 맵 안');
    for (const b of M.blocks) assert.ok(Math.hypot(b.x - s.x, b.y - s.y) > b.r + 20, `${s.id} 막힌 곳과 떨어져 있다 (${b.x},${b.y})`);
    for (const n of M.npcs) assert.ok(Math.hypot(n.x - s.x, n.y - s.y) > 120, s.id + ' NPC 와 떨어져 있다');
    for (const t of M.gates) assert.ok(Math.hypot(t.x - s.x, t.y - s.y) > t.r + s.r, s.id + ' 문과 떨어져 있다');
    for (const q of BLOOD_SPOTS) if (q.map === s.map) assert.ok(Math.hypot(q.x - s.x, q.y - s.y) > q.r + s.r + 40, s.id + ' BLOOD-001 자리와 떨어져 있다');
  }
  goSpot(h, 'deed'); assert.equal(gmSpotNear(h), null, '상자를 살피기 전에는 계약서가 없다');
  goSpot(h, 'machine'); assert.equal(gmSpotNear(h), null);
  assert.ok(gmSpotShown(h, spot('box')) && !gmSpotShown(h, spot('deed')));
  goSpot(h, 'box'); assert.equal(gmSpotLine(h, spot('box'))[1], '살펴보기'); talk(g);
  assert.deepEqual(h.bag.gu, { c: GM_CLUE.A, f: 1, o: 0 });
  assert.equal(gmSpotLine(h, spot('box')).length, 1, '빈 상자 — 단추 없이 한 줄만');
  talk(g); assert.equal(h.map, 'plaza', '단서 하나로는 문이 열리지 않는다');
  goSpot(h, 'deed'); assert.ok(gmSpotNear(h)); talk(g);
  assert.equal(h.bag.gu.c, GM_CLUE.A | GM_CLUE.B); assert.equal(gmSpotNear(h), null, '얻은 단서 자리는 다시 뜨지 않는다');
  goSpot(h, 'box'); assert.equal(gmSpotLine(h, spot('box'))[1], '들어가기');
});

test('단서 C — 기계를 살핀 뒤 훈련장 허수아비 셋을 한 번씩 치면 주사위가 빠지고, 끼워 넣으면 단서', () => {
  const { g, h } = setup(); h.bag.gu = { c: GM_CLUE.A, f: 1, o: 0 };
  const E = { fx() {}, sys() {}, say() {} }, at = (i) => ({ x: TRAIN.dummies[i][0], y: TRAIN.dummies[i][1] });
  h.map = 'train';
  gamblerDummyHit(E, g, h, at(0)); assert.equal(h.bag.gu.f, 1, '기계를 살피기 전에는 세지 않는다');
  goSpot(h, 'machine'); talk(g); assert.equal(h.bag.gu.f & 2, 2);
  gamblerDummyHit(E, g, h, at(0)); gamblerDummyHit(E, g, h, at(0)); assert.equal(h.bag.gu.f, 1 | 2 | 4, '같은 허수아비는 한 번만');
  gamblerDummyHit(E, g, h, { x: 300, y: 300 }); assert.equal(h.bag.gu.f, 7, '다른 자리의 허수아비는 세지 않는다');
  talk(g); assert.equal(h.bag.gu.c & GM_CLUE.C, 0, '셋을 다 모으기 전에는 끼울 수 없다');
  gamblerDummyHit(E, g, h, at(1)); gamblerDummyHit(E, g, h, at(2)); assert.equal(h.bag.gu.f, 31);
  assert.equal(gmSpotLine(h, spot('machine'))[1], '끼워 넣기'); talk(g);
  assert.equal(h.bag.gu.c, GM_CLUE.A | GM_CLUE.C);
  // 실제 타격으로도 — 훈련장 허수아비를 평타로 치면 센다
  const { g: g2, h: h2 } = setup(); h2.bag.gu = { c: 1, f: 3, o: 0 }; h2.map = 'train'; h2.x = TRAIN.dummies[0][0] - 120; h2.y = TRAIN.dummies[0][1]; h2.dir = 1;
  run(g2, .1); fire(g2, true); run(g2, 1.5); fire(g2, false);
  assert.equal(h2.bag.gu.f & 4, 4, '평타로 친 허수아비에서 주사위가 빠진다');
});

test('카지노 뒷방 시험 — 스킬 셋을 빌려 세 단계를 지나면 해금. 직업 레벨 1 · 1차 전직 없음 · 무기 내려놓음', () => {
  const { g, h } = setup(); h.advClass = 'ranger'; h.bag.gu = { c: GM_CLUE.A | GM_CLUE.B, f: 1, o: 0 };
  goSpot(h, 'box'); talk(g);
  assert.equal(h.map, CA.id); assert.equal(h.bag.gu.o, 1, '문은 한 번 열면 열려 있다');
  assert.ok(gamblerOn(h) && h.bag.hj.trial, '시험용으로 빌린 값'); assert.equal(h.bag.hj.jobs.gambler.lv, CA.lv); assert.equal(h.gt.step, 1);
  assert.equal(cleanBag(h.bag).hj, undefined, '시험 중 저장에는 남지 않는다'); assert.equal(h.bag.e, 1, '시험 중에는 무기를 그대로 둔다');
  assert.equal(g.mobs.filter((m) => m.map === CA.id && m.own === 0).length, CA.targets.length);
  assert.equal(rpgPack(g).h[0][57][10], 1, '시험 단계가 화면으로 간다');
  // 1단계 — 장막 없이 맞으면 그대로
  run(g, CA.veil.gap + CA.veil.warn + .1); assert.equal(h.gt.step, 1); assert.ok(h.hp < h.max, '예고 타격을 맞았다');
  run(g, CA.veil.gap + .2); use(g, 'veil'); run(g, CA.veil.warn + .1);
  assert.equal(h.gt.step, 2, '칩 장막으로 막으면 통과');
  // 2단계 — 표적에 칩 7개 → 운명의 눈이 맞으면 풀 베팅
  const [tx, ty] = CA.targets[0]; h.x = tx - 200; h.y = ty; h.dir = 1; h.gm.chips = 0;
  fire(g, true); run(g, 4.2); fire(g, false);
  assert.equal(gamblerView(h).chips, GM.chips, '평타로 칩 7개');
  use(g, 'dice', [tx, ty]); run(g, 1);
  assert.equal(h.gt.step, 3, '풀 베팅이 터지면 통과'); assert.equal(h.gm.cd.dice, 0, '다음 단계를 바로 해 볼 수 있다');
  assert.equal(g.mobs.filter((m) => m.map === CA.id && m.own === 0).length, CA.targets.length + 1, '멀리 선 표적이 하나 더');
  // 3단계 — 가까운 표적을 맞혀서는 통과하지 않는다
  use(g, 'dice', [tx, ty]); run(g, .6); assert.equal(h.gt.step, 3);
  h.gm.cd.dice = 0; use(g, 'dice', CA.far); run(g, .6);
  assert.equal(h.gt, null); assert.ok(gamblerOn(h) && !h.bag.hj.trial, '해금');
  assert.deepEqual(h.bag.hj.jobs.gambler, { lv: 1, xp: 0, tr: [[0, 0], [0, 0], [0, 0]] }, '직업 레벨 1 부터');
  assert.equal(h.advClass, ''); assert.equal(h.bag.e, 0);
  assert.equal(g.mobs.filter((m) => m.map === CA.id).length, 0, '표적을 치운다');
  goSpot(h, 'box'); assert.equal(gmSpotNear(h), null, '해금한 뒤에는 조사 자리가 없다');
});

test('시험 도중 뒷방을 나가면 빌린 값을 거둔다 — 예전 기록 · 전직 · 무기는 그대로, 다시 들어가면 처음부터', () => {
  const { g, h } = setup(); h.advClass = 'ranger'; h.bag.gu = { c: 3, f: 1, o: 1 };
  h.bag.hj = { active: '', jobs: { gambler: J200 }, version: 1 };      // 예전에 해금했다가 끈 사람
  goSpot(h, 'box'); talk(g); run(g, .1);
  assert.equal(h.bag.hj.jobs.gambler.lv, CA.lv); assert.equal(h.bag.hj.prev.jobs.gambler.lv, 200);
  h.map = 'plaza'; [h.x, h.y] = CA.plazaAt; run(g, .1);
  assert.ok(!gamblerOn(h)); assert.equal(h.gt, null); assert.deepEqual(h.bag.hj, { active: '', jobs: { gambler: J200 }, version: 1 });
  assert.equal(h.advClass, 'ranger'); assert.equal(h.bag.e, 1); assert.equal(g.mobs.filter((m) => m.map === CA.id).length, 0);
  goSpot(h, 'box'); talk(g); assert.equal(h.gt.step, 1);
  // BLOOD-001 캐릭터가 시험을 통과하면 BLOOD-001 은 꺼지고 기록은 남는다
  const { g: g3, h: b } = setup(); unlockBlood(b); b.bag.bd.lv = 77; b.bag.gu = { c: 3, f: 1, o: 1 };
  goSpot(b, 'box'); talk(g3);
  assert.ok(gamblerOn(b) && bloodOn(b), '시험 중에는 둘 다 켜져 있지만');
  assert.equal(advArtPath(b, 'front'), '/assets/characters/rpg/gambler-f/front.webp', '그림 · 조작은 도박꾼이 먼저다');
  assert.equal(cleanBag(b.bag).bd.on, 1, '시험 중 저장은 BLOOD-001 그대로');
});

test('맵 차례 · 그림 — 카지노 뒷방은 맵 차례 맨 뒤(도서관 다음) · 조사물 시트와 예고 연출이 있다', () => {
  const maps = SNAP_ORDER.maps;
  const ci = maps.indexOf(CA.id); assert.equal(maps[ci - 1], 'erden-library-2'); assert.equal(maps.indexOf('bloodlab'), ci - 3);   // 뒤에 진혼곡 · 엔지니어 · 네크로맨서 맵이 붙는다
  assert.ok(MAPS[CA.id] && !MAPS[CA.id].safe, '싸울 수 있는 곳'); assert.equal(MAPS[CA.id].gates[0].to, 'plaza');
  assert.equal(GAMBLER_PX.gm_props.n, Object.keys(GAMBLER_PROP).length);
  assert.ok(existsSync('public/assets/game/rpg/effects/hidden-jobs/gambler/px/gm_props.webp'));
  assert.ok(GAMBLER_CAP.sk_gm_warn > 0);
  assert.equal(GAMBLER_ID, 'gambler');
});

test('연출 자체의 k 값이 소식 봉투 종류를 덮지 않는다 — 칩 장막 연출이 손님 · 전용 서버 화면에 도착한다', () => {
  const { g, h } = setup(); h.map = 'field'; h.x = 900; h.y = 900;
  unlockGambler(h, J200); run(g, .1); g.out = [];
  use(g, 'veil'); run(g, .3);
  const o = g.out.filter((q) => q.kind === 'sk_gm_veil');
  assert.ok(o.length > 0 && o.every((q) => q.k === 'fx' && q.fk !== undefined), '봉투는 fx · 연출 값은 fk');
  const guest = makeWorld(); guest.fx = []; rpgApplyOut(guest, o);
  assert.equal(guest.fx.length, o.length); assert.equal(guest.fx[0].k, 1, '손님 쪽에서 연출 k 가 되돌아온다'); assert.equal(guest.fx[0].fk, undefined);
});
