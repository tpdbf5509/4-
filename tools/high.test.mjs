import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgPack, rpgApply, heroRecord, MAPS, MOB, SPAWNS, LV_MAX, STAT_MAX, LV_TOP, STAT_TOP, lvCap, statCap,
  statEarned, needXp, FAR_EASE, xpOf, coinOf, SNAP_ORDER, gatesOf, highOn, highEngine, rpgStat, STATS, CRIT_MAX, MOB_REGEN } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { RESET, GIFT, MAT_BY_ID, DROPS, MATERIALS, MAT_MAX } from '../src/game/itemData.js';
import { DEEP } from '../src/game/deepData.js';
import { HIGH, HIGH_MAPS, HIGH_IDS, HIGH_ELITE_IDS, HIGH_SPAWN, HIGH_MATS, HIGH_SUMMON_IDS, HIGH_CAP, HIGH_MOVES, eliteId } from '../src/game/highData.js';
import { highTest, isHighMob } from '../src/game/highCombat.js';
import { REC_IDS, TITLES, NEED_NAME } from '../src/game/socialData.js';
import { CODEX_IDS, CODEX_FIELD_IDS, CODEX_GROUPS } from '../src/game/codexData.js';
import { REQUESTS, REQ_NPCS } from '../src/game/requestData.js';
import { ADV_IDS } from '../src/game/advData.js';
import { BUFF_KEYS, whyWarp } from '../src/game/shop.js';
import { SHOPS, WARP } from '../src/game/shopData.js';
import { floorMob } from '../src/game/abyssData.js';
import { WORLD_BOSSES } from '../src/game/worldBossData.js';
import { GUILD_BOSSES } from '../src/game/guildData.js';
import { COMBAT_RULES } from '../src/game/combatRules.js';
import { TEST_GROUPS } from '../src/game/testData.js';

/* 800~1200레벨 사냥터 · 최고 레벨 1200(highData.js · highCombat.js). 실행: node --test tools/high.test.mjs
   기준 파일 high-baseline-1108.json — 작업 전 코드(11월 8일 ad05d30)에서 뽑은 스냅샷 차례 · 몹 수치 · 탑 층 몹 */
const BASE = JSON.parse(readFileSync(new URL('./high-baseline-1108.json', import.meta.url), 'utf8'));

function world(people, test = true) {
  const g = makeWorld(); g.mySeat = 0; g.out = []; g.test = test;
  rpgSyncSeats(g, people.map((p, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: p.job || 'warrior', elem: 'flame', gender: 'm' } })));
  people.forEach((p, i) => rpgJoin(g, i, { name: `시험${i}`, rs: RESET.id, gift: GIFT.id, lv: p.lv ?? 800, xp: p.xp ?? 0, ts: 0, coins: 0, stats: p.stats || {},
    admin: p.admin ? 1 : 0, bag: { oc: 1, w: [], n: 1, m: p.m || {} } }, `p${i}`));
  return g;
}
const step = (g, sec, dt = 0.05) => { for (let t = 0; t < sec; t += dt) rpgStep(g, dt); };
const godOn = (h) => { h.trn = { nocd: 0, stack: 0, tot: 0, hits: 0, log: [], ...(h.trn || {}), god: 1 }; };
// 몹 하나를 한 대에 쓰러뜨린다 — 사람 곁에 두고 체력 1. 자동 평타가 잡는다
function killNear(g, h, pred) {
  const m = g.mobs.find((q) => !q.dead && q.map === h.map && pred(q));
  assert(m, '잡을 몹');
  m.hp = 1; m.x = h.x + 40; m.y = h.y; m.hshT = 0; m.hbar = 0;
  h.cd = 0; h.auto = 1;
  for (let i = 0; i < 80 && !m.dead; i++) rpgStep(g, 0.05);
  assert(m.dead, '쓰러짐');
  return m;
}
// 닫혀 있던 때(HIGH.live false — 11월 8일 테스트 서버만 열었던 동안)의 일반 서버를 다시 본다
const closed = (fn) => { const was = HIGH.live; HIGH.live = false; try { return fn(); } finally { HIGH.live = was; } };
const onMap = (h, id) => { h.map = id; [h.x, h.y] = MAPS[id].spawn; h.gateCd = 0; };

test('15. 스냅샷 차례 — 예전 목록은 그대로이고 새 것은 끝에만', () => {
  const O = BASE.order, pre = (now, old, name) => assert.deepEqual(now.slice(0, old.length), old, `${name} 앞쪽이 그대로`);
  pre(SNAP_ORDER.maps, O.maps, 'MAP_IDS');
  pre(SNAP_ORDER.mobs, O.mobs, 'MOB_TYPES');
  pre(REC_IDS, O.rec, 'REC_IDS');
  pre(TITLES.map((t) => t.id), O.titles, 'TITLES');
  pre(BUFF_KEYS, O.buff, 'BUFF_KEYS');
  pre(ADV_IDS, O.adv, 'ADV_IDS');
  pre(SHOPS.map((s) => s.id), O.shops, 'SHOPS');
  REQ_NPCS.forEach((n) => pre((REQUESTS[n.id] || []).map((q) => JSON.stringify(q)), O.requests[n.id] || [], `REQUESTS.${n.id}`));
  assert.deepEqual(SNAP_ORDER.maps.slice(O.maps.length), [...HIGH_IDS, 'bloodlab'], '새 맵 8곳 · BLOOD-001 연구시설(11월 14일)만 끝에');
  assert.deepEqual(SNAP_ORDER.mobs.slice(O.mobs.length), [...HIGH_IDS, ...HIGH_ELITE_IDS, ...HIGH_SUMMON_IDS], '새 몹만 끝에');
  assert.deepEqual(REC_IDS.slice(O.rec.length), [...HIGH_IDS, ...HIGH_ELITE_IDS, 'abeyond', 'aconq', 'alch'], '11월 9일 심연의 탑 칭호 기록 둘 · 연금술 기록 alch 도 끝에');
  assert.equal(new Set(SNAP_ORDER.mobs).size, SNAP_ORDER.mobs.length, '몹 종류 겹침 없음');
  assert.equal(new Set(SNAP_ORDER.maps).size, SNAP_ORDER.maps.length, '맵 겹침 없음');
});

test('14. 1~800 사냥터 몹 수치 · 경험치 · 스탯 효과는 그대로', () => {
  const S = BASE.old.stats;
  Object.entries(S).forEach(([k, v]) => {
    const [type, lv] = k.split(':'), T = MOB[type];
    if (lv === 'boss') assert.deepEqual(T.boss, v, k);
    else assert.deepEqual([T.hp(+lv), T.dmg(+lv), T.xp(+lv), T.coin(+lv), T.size(+lv)], v, k);
  });
  assert.deepEqual([1, 400, 799, 800].map(needXp), BASE.old.xp, 'needXp = 30 × 레벨');
  assert.deepEqual([1, 400, 800].map(statEarned), BASE.old.pts, '800레벨 2,000포인트');
  assert.deepEqual(STATS.map((s) => s.per), BASE.old.per, '포인트당 효과');
  assert.equal(CRIT_MAX, BASE.old.crit);
  assert.equal(FAR_EASE.dmg, 0.75); assert.deepEqual(MOB_REGEN, { calm: 5, rate: 0.08 });
  assert.equal(COMBAT_RULES.highStatLevel, 400); assert.equal(COMBAT_RULES.highStatPoints, 3);
  BASE.old.mats.forEach(([id, sell]) => assert.equal(MAT_BY_ID[id].sell, sell, `${id} 재료 값`));
  Object.entries(BASE.old.drops).forEach(([k, d]) => assert.deepEqual(DROPS[k], d, `${k} 드롭`));
});

test('12. 심연의 탑 층 몹 · 월드보스 · 길드 보스 그대로', () => {
  assert.deepEqual(Array.from({ length: 120 }, (_, i) => JSON.stringify(floorMob(i + 1))), BASE.old.abyss, '탑 1~120층 몹 순환');
  assert.deepEqual(WORLD_BOSSES.map((b) => [b.id, b.hp]), BASE.old.wb);
  assert.deepEqual(GUILD_BOSSES.map((b) => [b.type, b.hp]), BASE.old.gb);
});

test('레벨 · 스탯 상한 — 실제 게임에 열었다(11월 8일): 모든 서버 1200. 닫으면 일반 서버는 800', () => {
  assert.equal(HIGH.live, true, '실제 게임에 열었다');
  assert.equal(LV_MAX, 1200); assert.equal(STAT_MAX, 1200);
  assert.equal(LV_TOP, 1200); assert.equal(STAT_TOP, 1200);
  assert.equal(lvCap({}), 1200); assert.equal(statCap({}), 1200);
  closed(() => {
    assert.equal(lvCap({}), 800); assert.equal(lvCap({ test: 1 }), 1200); assert.equal(lvCap({ high: true }), 1200);
    assert.equal(statCap({}), 800); assert.equal(statCap({ test: 1 }), 1200);
  });
  assert.equal(statEarned(800), 2000); assert.equal(statEarned(1200), 3200); assert.equal(statEarned(1000), 2600);
});

test('1 · 2. 800레벨 캐릭터 — 테스트 서버에서 0 XP 부터 801 · 1000 · 1200 으로 자라고 1200 에서 멈춘다. 일반 서버는 800 그대로', () => {
  closed(() => {
    const live = world([{ lv: 800 }], false), lh = live.heroes[0];
    onMap(lh, 'fallen'); godOn(lh); live.test = false;
    assert.equal(lh.lv, 800); assert.equal(lh.xp, 0);
    killNear(live, lh, (q) => q.type === 'fallen' && !q.boss);
    assert.equal(lh.lv, 800, '닫혀 있으면 일반 서버는 800 에서 멈춘다'); assert.equal(lh.xp, 0);
  });
  { // 열린 뒤 일반 서버 — 800 에서 경험치가 쌓인다
    const live = world([{ lv: 800 }], false), lh = live.heroes[0];
    onMap(lh, 'fallen'); godOn(lh);
    killNear(live, lh, (q) => q.type === 'fallen' && !q.boss);
    assert(lh.xp > 0, '일반 서버도 800 에서 경험치가 쌓인다');
  }

  const g = world([{ lv: 800, stats: { str: 800, int: 400, hp: 400, crit: 200, cdmg: 200 } }]), h = g.heroes[0];
  godOn(h); onMap(h, 'scrapyard');
  assert.equal(h.lv, 800); assert.equal(h.xp, 0, '지난 경험치를 더 주지 않는다');
  assert.deepEqual(h.st, { str: 800, int: 400, hp: 400, crit: 200, cdmg: 200 }, '찍은 스탯 그대로');
  const m = killNear(g, h, (q) => q.type === 'scrapyard' && !q.boss);
  assert(h.xp > 0 && h.lv === 800, `경험치가 쌓인다 (${h.xp})`);
  assert.equal(m.xp, xpOf(Math.round(11.5 * m.lv)));
  h.xp = needXp(800) - 1;
  killNear(g, h, (q) => q.type === 'scrapyard' && !q.boss);
  assert.equal(h.lv, 801, '801레벨');
  assert.equal(statEarned(801) - statEarned(800), 3, '레벨당 3포인트');
  h.lv = 999; h.xp = needXp(999) - 1; onMap(h, 'rift_boundary');
  killNear(g, h, (q) => q.type === 'rift_boundary' && !q.boss);
  assert.equal(h.lv, 1000);
  h.lv = 1199; h.xp = needXp(1199) - 1; onMap(h, 'origin_command');
  killNear(g, h, (q) => q.type === 'origin_command' && !q.boss);
  assert.equal(h.lv, 1200); assert.equal(h.xp, 0);
  killNear(g, h, (q) => q.type === 'origin_command' && !q.boss);
  assert.equal(h.lv, 1200, '1200 을 넘지 않는다'); assert.equal(h.xp, 0, '1200 에서는 경험치가 쌓이지 않는다');
  // 스탯 — 한 스탯 1200 까지, 합은 받은 포인트까지
  assert(rpgStat(g, 0, { str: 400 }), '800 → 1200');
  assert.equal(h.st.str, 1200);
  assert.equal(rpgStat(g, 0, { str: 1 }), false, '1200 을 넘지 못한다');
  const left = statEarned(1200) - Object.values(h.st).reduce((a, b) => a + b, 0);
  assert.equal(rpgStat(g, 0, { int: left + 1 }), false, '받은 포인트를 넘지 못한다');
  assert(rpgStat(g, 0, { int: left }));
  // 일반 서버에서는 한 스탯 800 을 넘지 못한다
  closed(() => { const l2 = world([{ lv: 800, stats: { str: 800 } }], false); assert.equal(rpgStat(l2, 0, { str: 1 }), false); });
  { const l3 = world([{ lv: 800, stats: { str: 800 } }], false); assert(rpgStat(l3, 0, { str: 1 }), '열린 뒤 일반 서버는 800 을 넘는다'); }
});

test('관리자 — 테스트 서버 1200레벨 · 스탯 모두 1200, 일반 서버는 800', () => {
  const t = world([{ admin: 1 }]).heroes[0], l = world([{ admin: 1 }], false).heroes[0];
  assert.equal(t.lv, 1200); assert(Object.values(t.st).every((v) => v === 1200));
  assert.equal(l.lv, 1200, '열린 뒤 일반 서버도 1200'); assert(Object.values(l.st).every((v) => v === 1200));
  closed(() => { const c = world([{ admin: 1 }], false).heroes[0]; assert.equal(c.lv, 800); assert(Object.values(c.st).every((v) => v === 800)); });
});

test('11. 저장 기록 → 다시 들어오기 — 레벨 · 경험치 · 스탯이 그대로', () => {
  const g = world([{ lv: 1000, xp: 1234, stats: { str: 900, hp: 1200, crit: 300 } }]), h = g.heroes[0];
  const rec = heroRecord(h, {}, { name: '시험0', job: 'warrior', elem: 'none', gender: 'm' });
  assert.equal(rec.lv, 1000);
  const g2 = makeWorld(); g2.test = true;
  rpgSyncSeats(g2, [{ id: 'p0', name: '시험0', hero: { name: '시험0', job: 'warrior', elem: 'flame', gender: 'm' } }]);
  rpgJoin(g2, 0, { ...rec, ts: rec.ts + 1 }, 'p0');
  const h2 = g2.heroes[0];
  assert.equal(h2.lv, 1000); assert.equal(h2.xp, 1234); assert.deepEqual(h2.st, h.st);
});

test('3 · 7. 새 사냥터 8곳 — 타락한 천궁 오른쪽에서 이어지고 왕복 · 마지막은 광장 귀환. 일반 서버에서는 문이 없다', () => {
  assert.equal(HIGH_MAPS.length, 8);
  const fallenGate = MAPS.fallen.gates.find((q) => q.high);
  assert.equal(fallenGate.to, 'scrapyard');
  assert.equal(gatesOf({}, MAPS.fallen).some((q) => q.high), true, '열린 뒤 일반 서버에도 보인다');
  closed(() => assert.equal(gatesOf({}, MAPS.fallen).some((q) => q.high), false, '닫혀 있으면 안 보인다'));
  assert.equal(gatesOf({ high: true }, MAPS.fallen).some((q) => q.high), true);
  const pass = (g, h, from, to) => {
    const q = MAPS[from].gates.find((x) => x.to === to);
    onMap(h, from); h.x = q.x; h.y = q.y; h.gateCd = 0;
    rpgStep(g, 0.05);
    return h.map;
  };
  const g = world([{ lv: 800 }]), h = g.heroes[0]; godOn(h);
  assert.equal(pass(g, h, 'fallen', 'scrapyard'), 'scrapyard');
  HIGH_MAPS.forEach((d, i) => {
    const next = HIGH_MAPS[i + 1];
    if (next) { assert.equal(pass(g, h, d.id, next.id), next.id, `${d.id} → ${next.id}`); assert.equal(pass(g, h, next.id, d.id), d.id, `${next.id} → ${d.id}`); }
    assert(MAPS[d.id].gates[0].label && MAPS[d.id].high);
  });
  assert.equal(pass(g, h, 'scrapyard', 'fallen'), 'fallen', '첫 지역 왼쪽은 타락한 천궁');
  assert.equal(pass(g, h, 'origin_command', 'plaza'), 'plaza', '마지막 지역 오른쪽은 광장');
  assert.match(MAPS.fallen.gates.find((q) => q.high).label, /800~850레벨/, '권장 레벨 표시');
  // 일반 서버 — 타락한 천궁 오른쪽 끝에 가도 넘어가지 않는다
  closed(() => { const live = world([{ lv: 800 }], false), lh = live.heroes[0]; assert.equal(pass(live, lh, 'fallen', 'scrapyard'), 'fallen'); });
  { const live = world([{ lv: 800 }], false), lh = live.heroes[0]; assert.equal(pass(live, lh, 'fallen', 'scrapyard'), 'scrapyard', '열린 뒤 일반 서버'); }
  // 레벨 800 아래는 첫 지역에 못 들어간다(기존 사냥터는 그대로)
  const low = world([{ lv: 799 }]), lo = low.heroes[0];
  assert.equal(pass(low, lo, 'fallen', 'scrapyard'), 'fallen');
  assert.equal(pass(low, lo, 'fallen', 'voidmage'), 'voidmage');
});

test('3. 지역 워프권 — 목록 끝에 8곳, 테스트 서버(열림)에서만 · 800레벨 · 계몽의 눈', () => {
  assert.deepEqual(WARP.maps.slice(-8), HIGH_IDS);
  const g = world([{ lv: 800, m: { [DEEP.eye]: 1 } }, { lv: 790, m: { [DEEP.eye]: 1 } }]);
  const [a, b] = g.heroes; a.bag.wp = 3; b.bag.wp = 3;
  assert.deepEqual(whyWarp(a, 'scrapyard', false), ['갈 수 없는 지역입니다']);
  assert.deepEqual(whyWarp(a, 'scrapyard', true), []);
  assert(whyWarp(b, 'scrapyard', true).some((w) => /레벨 800/.test(w)));
  rpgInput(g, { cls: 0, kind: 'shop', dir: { op: 'warp', to: 'observer_hall' } });
  assert.equal(a.map, 'observer_hall');
  closed(() => {
    const live = world([{ lv: 800, m: { [DEEP.eye]: 1 } }], false); live.heroes[0].bag.wp = 3;
    rpgInput(live, { cls: 0, kind: 'shop', dir: { op: 'warp', to: 'observer_hall' } });
    assert.notEqual(live.heroes[0].map, 'observer_hall', '닫혀 있으면 일반 서버는 막는다');
  });
  assert(TEST_GROUPS.some((q) => q.name === '사냥터 800~1200'));
});

test('4 · 5 · 6 · 7 · 8. 지역마다 일반 22 · 정예 2 · 보스 2 — 체력 · 공격력 · 경험치 · 코인', () => {
  const g = makeWorld();
  HIGH_MAPS.forEach((d) => {
    const here = g.mobs.filter((m) => m.map === d.id);
    assert.equal(here.filter((m) => m.type === d.id && !m.boss).length, HIGH_SPAWN.n, `${d.id} 일반`);
    assert.equal(here.filter((m) => m.type === eliteId(d.id)).length, HIGH_SPAWN.eliteN, `${d.id} 정예`);
    assert.equal(here.filter((m) => m.boss).length, HIGH_SPAWN.bossN, `${d.id} 보스`);
    const N = MOB[d.id], E = MOB[eliteId(d.id)], [l0, l1] = d.lv;
    assert.equal(N.hp(l0), d.mob.hp[0]); assert.equal(N.hp(l1), d.mob.hp[1]);
    assert.equal(N.dmg(l0), Math.round(d.mob.dmg[0] * 0.75)); assert.equal(N.dmg(l1), Math.round(d.mob.dmg[1] * 0.75));
    assert.equal(N.boss.hp, d.boss.hp); assert.equal(N.boss.dmg, Math.round(d.boss.dmg * 0.75)); assert.equal(N.boss.lv, d.boss.lv);
    for (const lv of [l0, Math.round((l0 + l1) / 2), l1]) {
      assert.equal(E.hp(lv), N.hp(lv) * 2, '정예 체력 2배');
      assert.equal(E.dmg(lv), Math.round(N.dmg(lv) * 1.2), '정예 공격 1.2배');
      assert.equal(E.xp(lv), N.xp(lv) * 2); assert.equal(E.coin(lv), N.coin(lv) * 2);
      assert.equal(N.xp(lv), Math.round(d.mob.xp * lv)); assert.equal(N.coin(lv), Math.round(d.mob.coin * lv));
    }
    const sp = SPAWNS.filter((s) => s.map === d.id);
    assert.deepEqual(sp.map((s) => [s.type, s.n, s.respawn, !!s.boss]), [[d.id, 22, 4.5, false], [eliteId(d.id), 2, 20, false], [d.id, 2, 30, true]]);
    const m = here.find((q) => q.type === d.id && !q.boss);
    assert.equal(m.xp, xpOf(N.xp(m.lv))); assert.equal(m.coin, coinOf(N.coin(m.lv)));
  });
  // 요청의 예시 값
  assert.equal(MOB.scrapyard.dmg(800), 5288);
  assert.equal(MOB.origin_command.dmg(1200), 11625);
  assert.equal(MOB.origin_command.boss.dmg, 12750);
  assert.equal(MOB.scrapyard.hp(800), 150000); assert.equal(MOB.origin_command.hp(1200), 230000);
});

test('6 · 9 · 10. 보스 처치 — 재료(DROP_ROLL) · 기록 · 도감. 정예는 보스 재료 없음', () => {
  const g = world([{ lv: 1200 }]), h = g.heroes[0]; godOn(h);
  HIGH_MAPS.forEach((d) => {
    onMap(h, d.id);
    const before = h.bag.m[d.drop] || 0, rb = h.rec[d.id] || 0;
    killNear(g, h, (q) => q.type === d.id && q.boss);
    const got = (h.bag.m[d.drop] || 0) - before;
    assert(got >= 1 && got <= 5, `${d.id} 보스 재료 ${got}`);
    assert.equal(h.rec[d.id], rb + 1, '처치 기록');
    const ebefore = JSON.stringify(h.bag.m), er = h.rec[eliteId(d.id)] || 0;
    killNear(g, h, (q) => q.type === eliteId(d.id));
    step(g, 1.5);                                   // 정예 쓰러짐 효과(폭발 · 강화)가 끝날 때까지
    assert.equal(JSON.stringify(h.bag.m), ebefore, '정예는 재료가 없다');
    assert.equal(h.rec[eliteId(d.id)], er + 1, '정예는 따로 센다');
  });
  HIGH_MATS.forEach((m) => { assert(MAT_BY_ID[m.id]); assert.equal(DROPS[HIGH_MAPS.find((d) => d.drop === m.id).id].roll, 1); });
  assert.deepEqual(HIGH_MATS.map((m) => m.sell), [14000, 15500, 17000, 18500, 20000, 22000, 24000, 26000]);
  assert.equal(new Set(MATERIALS.map((m) => m.id)).size, MATERIALS.length, '재료 id 겹침 없음');
  assert.equal(MAT_MAX, 999);
  [...HIGH_IDS, ...HIGH_ELITE_IDS].forEach((id) => { assert(REC_IDS.includes(id)); assert(NEED_NAME[id], id); });
  assert(CODEX_GROUPS.some((c) => c.high && c.mobs.length === 16));
  assert(!CODEX_IDS.some((id) => HIGH_IDS.includes(id)) && !CODEX_FIELD_IDS.some((id) => HIGH_ELITE_IDS.includes(id)), '업적 셈은 그대로');
});

test('8. 보스 패턴 — 모든 지역 보스가 기술을 쓰고, 예고(sk_hi_warn) 없이 맞히지 않는다 · 소환 상한 · 맵 안', () => {
  HIGH_MAPS.forEach((d) => {
    const g = world([{ lv: 1200 }, { lv: 1200 }, { lv: 1200 }]);
    g.heroes.filter(Boolean).forEach((h, i) => { godOn(h); onMap(h, d.id); h.x = d.w - 900 + i * 60; h.y = 920 + i * 40; h.auto = 0; });
    const bosses = g.mobs.filter((m) => m.map === d.id && m.boss);
    bosses.forEach((b, i) => { b.x = d.w - 700 - i * 80; b.y = 900; });
    let kinds = new Set(), maxSum = 0, out = 0;
    for (let t = 0; t < 60; t += 0.05) {
      rpgStep(g, 0.05);
      g.out.forEach((o) => { if (o.k === 'fx' && o.kind.startsWith('sk_hi_')) kinds.add(o.kind); });
      g.out.length = 0;
      const sums = g.mobs.filter((m) => !m.dead && m.map === d.id && m.sum);
      maxSum = Math.max(maxSum, sums.length);
      g.mobs.filter((m) => m.map === d.id && isHighMob(m)).forEach((m) => { if (m.x < 0 || m.x > d.w || m.y < MAPS[d.id].top - 1 || m.y > 1800) out++; });
      if (t > 20 && t < 20.06 && d.id === 'origin_command') bosses.forEach((b) => { b.hp = b.max * 0.6; });
      if (t > 35 && t < 35.06 && d.id === 'origin_command') bosses.forEach((b) => { b.hp = b.max * 0.4; });
      if (t > 45 && t < 45.06) bosses.forEach((b) => { b.hp = b.max * 0.2; });
    }
    assert(kinds.has('sk_hi_warn'), `${d.id} 예고`);
    assert(maxSum <= HIGH_CAP.summonPerMap, `${d.id} 소환 상한 ${maxSum}`);
    assert.equal(out, 0, `${d.id} 몹이 맵 밖으로`);
    if (d.id === 'origin_command') assert(bosses.some((b) => b.hph === 3), '알파 4단계까지');
    if (d.id === 'forbidden_lab') assert(bosses.some((b) => b.hform === 1), '오메가 형태 변화');
  });
});

test('8. 예고 범위 = 피해 범위 — 원 · 줄 · 부채꼴 경계에서 안은 맞고 밖은 안 맞는다', () => {
  const { inCircle, inLine, inSector } = highTest, sq = 0.78;
  assert(inCircle({ x: 100, y: 0 }, 0, 0, 100)); assert(!inCircle({ x: 101, y: 0 }, 0, 0, 100));
  assert(inCircle({ x: 0, y: 100 * sq }, 0, 0, 100)); assert(!inCircle({ x: 0, y: 100 * sq + 1 }, 0, 0, 100));
  assert(!inCircle({ x: 10, y: 0 }, 0, 0, 100, 20), '안쪽 안전 원');
  assert(inLine({ x: 300, y: 35 * sq }, 0, 0, 1, 0, 400, 70)); assert(!inLine({ x: 300, y: 36 * sq }, 0, 0, 1, 0, 400, 70)); assert(!inLine({ x: 401, y: 0 }, 0, 0, 1, 0, 400, 70));
  assert(inSector({ x: 100, y: 0 }, 0, 0, 1, 0, 200, 0.5)); assert(!inSector({ x: 0, y: 150 * sq }, 0, 0, 1, 0, 200, 0.5));
  // 실제 원 기술 — 예고 중에 원 밖으로 나가면 맞지 않는다
  const g = world([{ lv: 1200 }, { lv: 1200 }]), [a, b] = g.heroes;
  onMap(a, 'clock_tower'); onMap(b, 'clock_tower'); a.x = 3000; a.y = 900; b.x = 3000; b.y = 900;
  const m = g.mobs.find((q) => q.map === 'clock_tower' && q.type === 'clock_tower' && !q.boss);
  m.x = 3200; m.y = 900; m.tgt = 0;
  g.mobs.filter((q) => q !== m && q.map === 'clock_tower').forEach((q) => { q.x = 300; q.y = 300; q.hbusy = 99; q.hact = null; });
  const mv = HIGH_MOVES.clock_tower.mob[0];
  highTest.startMove(highEngine, g, m, { ...mv, n: 1 }, a);
  b.x = 3000 - mv.r - 30;                          // b 는 바로 비켜 선다(몹 반대쪽 — 다가오는 몹의 평타에 맞지 않게)
  const ha = a.hp, hb = b.hp; a.auto = b.auto = 0;
  step(g, mv.warn + 0.1);
  assert(a.hp < ha, '안에 남은 사람은 맞는다'); assert.equal(b.hp, hb, '비킨 사람은 맞지 않는다');
});

test('13 · 11. 여러 명 — 판정 세계 · 손님 화면이 스냅샷으로 같은 몹 · 상태 비트를 받는다', () => {
  const g = world([{ lv: 1100 }, { lv: 1150 }, { lv: 900, job: 'mage' }, { lv: 1000, job: 'archer' }]);
  g.heroes.filter(Boolean).forEach((h, i) => { godOn(h); onMap(h, i < 2 ? 'origin_command' : 'scrapyard'); });
  const boss = g.mobs.find((m) => m.map === 'scrapyard' && m.boss); boss.hshT = 3; boss.hshCut = 0.7;
  step(g, 3);
  const snap = rpgPack(g);
  const c = makeWorld(); c.mySeat = 2; c.mobs = []; c.high = true;
  rpgSyncSeats(c, g.heroes.filter(Boolean).map((h, i) => ({ id: `p${i}`, name: `시험${i}`, hero: { name: `시험${i}`, job: 'warrior', elem: 'flame', gender: 'm' } })));
  rpgApply(c, JSON.parse(JSON.stringify(snap)));
  const busy = new Set(g.heroes.filter(Boolean).map((h) => h.map));
  assert.equal(c.mobs.length, g.mobs.filter((m) => busy.has(m.map)).length);
  assert.deepEqual(new Set(c.mobs.map((m) => m.map)), busy);
  const cb = c.mobs.find((m) => m.id === boss.id);
  if (boss.hshT > 0) assert.equal(cb.hs & 1, 1, '강철 방패 비트');
  assert.equal(c.heroes[0].lv, 1100); assert.equal(c.heroes[0].map, 'origin_command');
  assert(c.mobs.some((m) => m.type === eliteId('scrapyard')), '정예 종류가 손님에게도');
  assert(highOn(c));
});

test('성장 속도 — 400~800 과 견준 한 레벨 마릿수(보고용 수치)', () => {
  const per = (lvs, typeOf) => lvs.map((lv) => needXp(lv) / xpOf(MOB[typeOf(lv)].xp(lv)));
  const deepIds = ['fspirit', 'lavagolem', 'firedrake', 'ifrit', 'wraith', 'abyss', 'voidmage', 'fallen'];
  const deepAt = (lv) => deepIds[Math.min(7, Math.floor((lv - 400) / 50))], highAt = (lv) => HIGH_IDS[Math.min(7, Math.floor((lv - 800) / 50))];
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const old = per(Array.from({ length: 400 }, (_, i) => 400 + i), deepAt), now = per(Array.from({ length: 400 }, (_, i) => 800 + i), highAt);
  const r = { oldKills: Math.round(sum(old)), newKills: Math.round(sum(now)), old400: old[0].toFixed(1), old799: old[399].toFixed(1), new800: now[0].toFixed(1), new1199: now[399].toFixed(1) };
  console.log('# 성장', JSON.stringify(r));
  assert(r.newKills > r.oldKills * 0.5 && r.newKills < r.oldKills * 1.5, '400~800 과 비슷한 길이');
});

test('3. 계몽의 문 — 테스트 서버에서는 800~1200 사냥터로 바로 들어가고, 일반 서버에서는 막힌다', () => {
  for (const open of [true, false]) closed(() => {
    const g = world([{ lv: 800, m: { [DEEP.eye]: 1 } }, { lv: 799, m: { [DEEP.eye]: 1 } }], open), [a, b] = g.heroes;
    [a, b].forEach((h) => { h.map = 'plaza'; h.x = DEEP.door.x; h.y = DEEP.door.y + 40; });
    rpgInput(g, { cls: 0, kind: 'deep', dir: { op: 'enter', to: 'high' } }); rpgInput(g, { cls: 1, kind: 'deep', dir: { op: 'enter', to: 'high' } });
    assert.equal(a.map, open ? HIGH_MAPS[0].id : 'plaza', open ? '800레벨은 들어간다' : '일반 서버는 막힌다');
    assert.equal(b.map, 'plaza', '799레벨은 막힌다');
    rpgInput(g, { cls: 1, kind: 'deep', dir: { op: 'enter' }, q: 9 });
    assert.notEqual(b.map, 'plaza', '400~800 입장은 그대로');
  });
});
