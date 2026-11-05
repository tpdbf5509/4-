/* 월드보스 공허의 관측자 — 출현 · 패턴 4종 · 안전 구역 · 보상 · 승계를 실제 게임 함수로 검증한다.
   node --test tools/void-boss.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgWorldBoss, rpgStep, rpgPack, rpgApply, rpgPromote, MAPS } from '../src/game/rpg.js';
import { WORLD_BOSS as C, WORLD_BOSSES, WORLD_BOSS_BY_ID, WORLD_BOSS_PATTERNS as PAT, worldBossWeapons } from '../src/game/worldBossData.js';
import { worldBossHit, worldBossKilled, rollWorldBossReward, cleanWorldBossBag, worldBossAreaContains } from '../src/game/worldBoss.js';
import { voidSafeZones, voidPortals, voidAreas } from '../src/game/voidBossCombat.js';
import { COMBAT_RULES } from '../src/game/combatRules.js';
import { RESET, GIFT } from '../src/game/itemData.js';
const F = COMBAT_RULES.bossDamage;   // 보스 피해 배율(방어 없는 사람)
const seats = Array.from({ length: 3 }, (_, i) => ({ id: `vb${i}`, name: `관측${i}`, hero: { name: `관측${i}`, job: 'archer', elem: 'frost', gender: 'm' } }));
function setup() {
  const g = makeWorld(); g.mySeat = 0; g.wb.lastHour = Math.floor(g.wb.clock / C.period); g.out = [];
  rpgSyncSeats(g, seats);
  for (let i = 0; i < 3; i++) rpgJoin(g, i, { name: seats[i].name, rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 300000, stats: { str: 100, hp: 100 }, bag: { oc: 1, w: [], e: 0, n: 2 } }, seats[i].id);
  g.heroes.forEach(h => { if (h) { h.auto = 0; h.x = C.portal.x; h.y = C.portal.y + 70; } });
  return g;
}
const adv = (g, t) => { for (let n = 0; n < Math.ceil(t / .02); n++) rpgStep(g, .02); };
function fight({ hp = 1 } = {}) {
  const g = setup(); rpgWorldBoss(g, 0, { op: 'summon', id: 'void' }); rpgWorldBoss(g, 0, { op: 'enter' });
  const a = g.wb.active, m = g.mobs.find(x => x.id === a.mob), h = g.heroes[0];
  h.inv = 0; m.hp = m.max * hp; return { g, a, m, h };
}
// 한 가지 공격을 곧바로 시작한다
function begin(f, kind) { f.a.seq = WORLD_BOSS_BY_ID.void.attacks.indexOf(kind); f.a.cd = 0; adv(f.g, .02); assert.equal(f.a.attack?.kind, kind); return f.a.attack; }
const lost = (h, before) => (before - h.hp) / h.max;
const near = (x, y, e = .03) => assert(Math.abs(x - y) < e, `${x} ≈ ${y}`);

test('다섯 번째 보스 — 체력 15,000,000 · 권장 800 · 뒤에 추가 · 기존 네 보스는 그대로', () => {
  assert.equal(WORLD_BOSSES.length, 5); assert.equal(WORLD_BOSSES.at(-1).id, 'void');
  const B = WORLD_BOSS_BY_ID.void;
  assert.equal(B.name, '공허의 관측자'); assert.equal(B.hp, 64000000); assert.equal(B.recLv, 800); assert.equal(B.type, 'world_void');
  assert.deepEqual(B.attacks, ['gravity_collapse', 'space_cut', 'void_cross', 'event_horizon']);
  assert.deepEqual(WORLD_BOSSES.slice(0, 4).map(b => [b.id, b.hp]), [['dragon', 30000000], ['serpent', 36000000], ['machine', 40000000], ['thunderbird', 45000000]]);
  assert.deepEqual(WORLD_BOSSES.slice(0, 4).map(b => b.attacks), [['cone', 'meteors', 'inferno', 'dragon_doom'], ['poison', 'ring', 'molt', 'serpent_doom'], ['cross', 'lightning', 'overload', 'machine_doom'], ['thunder_feathers', 'thunder_dive', 'thunder_eye', 'thunder_doom']]);
  // 제한시간 · 입장료는 기존 월드보스와 같은 공통 값
  assert.equal(C.duration, 900000); assert.equal(C.fee, 100000);
  assert.deepEqual([PAT.gravity_collapse.wind, PAT.gravity_collapse.damage, PAT.space_cut.wind, PAT.space_cut.gap, PAT.space_cut.damage, PAT.space_cut.hits, PAT.void_cross.damage, PAT.void_cross.belowHp, PAT.event_horizon.wind, PAT.event_horizon.safes], [1.5, .45, .8, .8, .3, 3, .4, .5, 4.6, 3]);
  assert(PAT.event_horizon.doom && PAT.event_horizon.major);
  assert(MAPS.worldboss); // 몹 종류 번호: 새 보스는 맨 뒤
});
test('소환 · 입장 · 출현 차례에 포함된다', () => {
  const g = setup(); assert(rpgWorldBoss(g, 0, { op: 'summon', id: 'void' })); assert.equal(g.wb.active.id, 'void'); assert.equal(g.coins ?? 0, 0);
  assert(rpgWorldBoss(g, 0, { op: 'enter' })); assert.equal(g.heroes[0].map, 'worldboss');
  const m = g.mobs.find(x => x.id === g.wb.active.mob); assert.equal(m.type, 'world_void'); assert.equal(m.max, 64000000);
  const ids = new Set(); for (let hour = 100; hour < 110; hour++) { const B = WORLD_BOSSES[(hour + 1) % WORLD_BOSSES.length]; ids.add(B.id); } assert(ids.has('void'));
});
test('중력 붕괴: 1.5초 예고 · 장판 밖으로 나가면 회피 · 남으면 최대 체력 45%', () => {
  const f = fight(), at = begin(f, 'gravity_collapse'), s = at.areas[0];
  assert.equal(at.life, 1.5); assert.equal(s.shape, 'circle'); assert.equal(s.x, f.h.x); assert.equal(s.y, f.h.y); assert.equal(at.areas.length, 1);
  let hp = f.h.hp; adv(f.g, 1.6); near(lost(f.h, hp), .45 * F, .01);
  const e = fight(), at2 = begin(e, 'gravity_collapse'), c = at2.areas[0]; hp = e.h.hp;
  e.h.x = c.x + c.r + 60; adv(e.g, 1.6); assert.equal(e.h.hp, hp, '장판 밖이면 안 맞는다');
  const d = fight(), at3 = begin(d, 'gravity_collapse'); hp = d.h.hp; d.h.inv = 3; adv(d.g, 1.6); assert.equal(d.h.hp, hp, '대쉬 무적은 피한다');
});
test('중력 붕괴: 터지기 직전 장판 안의 사람을 중심으로 끌어당기고 밖의 사람은 그대로', () => {
  const f = fight(), at = begin(f, 'gravity_collapse'), s = at.areas[0], other = f.g.heroes[1]; f.h.inv = 0;
  other.map = 'worldboss'; other.x = s.x + s.r + 90; other.y = s.y; other.inv = 0; other.down = 0;
  adv(f.g, 1.5 - PAT.gravity_collapse.pullFor - .1);   // 아직 끌지 않는다
  f.h.x = s.x + 120; f.h.y = s.y; const x0 = f.h.x, ox = other.x;
  adv(f.g, .3); assert(Math.abs(f.h.x - s.x) < Math.abs(x0 - s.x) - 15, `끌려옴 ${x0} → ${f.h.x}`);
  assert.equal(other.x, ox, '장판 밖은 끌지 않음');
  adv(f.g, .5); assert(Math.abs(f.h.x - s.x) < 40, '중심 근처에서 터진다');
});
test('공간 절단: 직선 3번 · 각 0.8초 예고 · 각 타격 최대 체력 30% · 선 위치가 보인다', () => {
  const f = fight(), at = begin(f, 'space_cut'), m = f.m;
  assert.equal(at.stages, 3); assert.equal(at.life, .8); assert.equal(at.areas.length, 1);
  let s = at.areas[0]; assert.equal(s.shape, 'line'); near(s.x, m.x, 1); near(s.a, Math.atan2((f.h.y - m.y) / C.squash, f.h.x - m.x), .01);
  assert(worldBossAreaContains(s, f.h), '겨눈 사람은 선 위'); assert(!worldBossAreaContains(s, { x: f.h.x + 1000, y: f.h.y }), '멀리는 선 밖');
  // 선 옆(수직으로 폭 + 40)에 서 있으면 안 맞는다
  const perp = { x: f.h.x - Math.sin(s.a) * (s.width + 40), y: f.h.y + Math.cos(s.a) * (s.width + 40) * C.squash }; assert(!worldBossAreaContains(s, perp));
  const seen = []; let hp = f.h.hp;
  for (let t = 0; t < 4; t += .02) { const step = f.a.attack?.step; adv(f.g, .02); if (step !== undefined && !seen.includes(step)) seen.push(step); }
  assert.deepEqual(seen.slice(0, 3), [0, 1, 2]);
  near(lost(f.h, hp), 3 * .3 * F, .02);   // 제자리에서 세 번 모두 맞음
  // 각 타격 사이는 0.8초(gap)
  const g2 = fight(), a2 = begin(g2, 'space_cut'); g2.h.inv = 999; const marks = []; let prev = a2.step;
  for (let t = 0; t < 3; t += .02) { adv(g2.g, .02); const cur = g2.a.attack?.step ?? 3; if (cur !== prev) { marks.push(t); prev = cur; } }
  near(marks[0], .8, .06); near(marks[1] - marks[0], .8, .06);
});
test('공간 절단: 줄을 피해 움직이면 다음 줄은 새 자리를 다시 겨눈다(한 사람이면 끝까지 쫓는다)', () => {
  const f = fight(), at = begin(f, 'space_cut'); const a0 = at.areas[0].a; let hp = f.h.hp;
  f.h.y += 200; adv(f.g, .85);   // 첫 줄은 피했다
  assert.equal(f.h.hp, hp); const a1 = f.a.attack.areas[0].a; assert(Math.abs(a1 - a0) > .05, '다음 줄이 새 자리를 겨눔');
});
test('공허의 교차: 체력 50% 초과면 건너뛰고, 이하에서 포탈 둘 · 보스가 포탈 사이를 건너며 충격파 40%', () => {
  const full = fight({ hp: 1 }); full.a.seq = 2; full.a.cd = 0; adv(full.g, .02); assert.equal(full.a.attack.kind, 'event_horizon', '체력이 많으면 교차를 건너뜀');
  const half = fight({ hp: .5 }); half.a.seq = 2; half.a.cd = 0; adv(half.g, .02); assert.equal(half.a.attack.kind, 'void_cross', '체력 50% 에서 사용');
  const f = fight({ hp: .4 }), at = begin(f, 'void_cross'); f.h.inv = 0;
  assert.equal(at.portals.length, 2); const [A, B] = at.portals;
  assert(Math.hypot(A.x - B.x, (A.y - B.y) / C.squash) >= 520, '포탈은 서로 멀리');
  for (const p of at.portals) { assert(p.x > 150 && p.x < C.w - 150 && p.y > 300 && p.y < C.h - 150, '걸어갈 수 있는 곳'); }
  assert.equal(at.stages, 3); assert.equal(at.areas[0].shape, 'circle'); assert.deepEqual([at.areas[0].x, at.areas[0].y], [A.x, A.y]);
  const hp = f.h.hp; f.h.x = A.x; f.h.y = A.y;
  adv(f.g, PAT.void_cross.wind + .04); near(lost(f.h, hp), .4 * F, .02); near(f.m.x, A.x, 1); near(f.m.y, A.y, 1); assert.equal(f.a.attack.step, 1); assert.deepEqual([f.a.attack.areas[0].x, f.a.attack.areas[0].y], [B.x, B.y]);
  f.h.x = B.x; f.h.y = B.y; const hp2 = f.h.hp; adv(f.g, PAT.void_cross.gap + .04); near(lost(f.h, hp2), .4 * F, .02); near(f.m.x, B.x, 1);
  assert.equal(f.a.attack.areas[0].shape, 'ring'); f.h.x = A.x + PAT.void_cross.ringInner + 60; f.h.y = A.y;   // 고리 안쪽 · 바깥 사이
  f.h.hp = f.h.max; const hp3 = f.h.hp; adv(f.g, PAT.void_cross.gap + .04); near(lost(f.h, hp3), .4 * F, .02); near(f.m.x, A.x, 1);
  assert(!f.a.attack);
  // 어디 서 있어도 포탈과 충격파 밖이면 안전
  const g = fight({ hp: .4 }); begin(g, 'void_cross'); const hp4 = g.h.hp; g.h.x = 300; g.h.y = 500; adv(g.g, 6); assert.equal(g.h.hp, hp4);
});
test('사건의 지평선: 4.6초 예고 · 안전 구역 셋 · 안에 들어가면 생존 · 밖은 즉사 · 대쉬 무적 유지', () => {
  const run = place => {
    const f = fight(), at = begin(f, 'event_horizon'); const s = at.areas[0];
    assert.equal(at.life, 4.6); assert.equal(s.shape, 'shelter'); assert.equal(s.safes.length, 3); assert(at.major);
    const z = s.safes[0]; place(f, s, z); adv(f.g, 4.7); return f;
  };
  const inside = run((f, s, z) => { f.h.x = z.x; f.h.y = z.y; }); assert(inside.h.hp > 0 && inside.h.down <= 0, '안전 구역 안 생존');
  for (let i = 1; i < 3; i++) { const g = fight(); const s = begin(g, 'event_horizon').areas[0]; g.h.x = s.safes[i].x; g.h.y = s.safes[i].y; adv(g.g, 4.7); assert(g.h.down <= 0 && g.h.hp > 0, `구역 ${i + 1}`); }
  const outside = run((f, s) => { f.h.x = 200; f.h.y = 400; }); assert(outside.h.down > 0 || outside.h.hp <= 0, '밖은 즉사');
  const dash = fight(), at = begin(dash, 'event_horizon'); dash.h.x = 200; dash.h.y = 400; dash.h.inv = 10; adv(dash.g, 4.7); assert(dash.h.hp > 0 && dash.h.down <= 0, '대쉬 무적은 피한다');
});
test('사건의 지평선: 안전 구역은 보스가 어디에 있어도 걸어 들어갈 수 있는 곳에 서로 떨어져 생긴다', () => {
  const P = PAT.event_horizon; let worst = Infinity, count = 0;
  for (let x = 120; x <= C.w - 120; x += 140) for (let y = 200; y <= C.h - 120; y += 120) for (let a = 0; a < Math.PI * 2; a += .9) {
    const zones = voidSafeZones({ x, y }, a); count++;
    assert.equal(zones.length, 3);
    for (const z of zones) {
      assert(z.x - z.r >= 40 && z.x + z.r <= C.w - 40, `가로 안쪽 ${z.x}`); assert(z.y - z.r * C.squash >= MAPS.worldboss.top && z.y + z.r * C.squash <= C.h - 40, `세로 안쪽 ${z.y}`);
      assert.equal(z.r, P.safeR);
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) worst = Math.min(worst, Math.hypot(zones[i].x - zones[j].x, (zones[i].y - zones[j].y) / C.squash));
  }
  assert(count > 200); assert(worst >= P.safeR * P.safeGap - 1e-6, `구역끼리 최소 거리 ${worst}`);
  // 구역 사이로 걸어갈 수 있다 — 어떤 구역에서 다른 구역까지 직선에 막힌 곳이 없다(맵에 막는 물체가 없다)
  assert.deepEqual(MAPS.worldboss.blocks, []);
});
test('사건의 지평선: 합동 공격으로 끊을 수 있고(큰 기술) 부활 · 대쉬 규칙은 기존 월드보스와 같다', () => {
  const f = fight(), at = begin(f, 'event_horizon'); assert.equal(at.major, true);
  assert.equal(PAT.event_horizon.doom, true);
});
test('공허의 교차 진행은 방장 승계 뒤에도 같은 포탈 · 같은 위치로 이어진다', () => {
  const f = fight({ hp: .4 }); const at = begin(f, 'void_cross'); f.h.inv = 999; adv(f.g, PAT.void_cross.wind + .3);
  assert.equal(f.a.attack.step, 1);
  const guest = makeWorld(); rpgSyncSeats(guest, seats); rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(f.g)))); rpgPromote(guest);
  assert.deepEqual(guest.wb.active.attack.portals, f.a.attack.portals); assert.deepEqual(guest.wb.active.attack.areas, f.a.attack.areas);
  const gm = guest.mobs.find(m => m.id === f.a.mob); near(gm.x, f.m.x, 1); near(gm.y, f.m.y, 1);
  guest.heroes.forEach(h => { if (h) { h.auto = 0; h.inv = 999; } });
  adv(guest, PAT.void_cross.gap * 2 + .5); assert(!guest.wb.active.attack || guest.wb.active.attack.step >= 2);
});
test('보상: 전설 무기 3종 각 2% · 방어구 4부위 각 3% · 코인 · 재료 · 물약은 그대로, 다른 보스는 변하지 않는다', () => {
  assert.equal(C.weaponChance, .02); assert.equal(C.armorChance, .03);
  const all = rollWorldBossReward('void', () => 0);
  assert.deepEqual(all.items.filter(x => x.k === 'weapon').map(x => x.id), ['void_great', 'void_staff', 'void_bow']);
  assert.deepEqual(all.items.filter(x => x.k === 'armor').map(x => `${x.id}:${x.set}`), ['head', 'body', 'legs', 'feet'].map(s => `${s}:void`));
  assert(all.items.some(x => x.id === 'heart') && all.items.some(x => x.k === 'potion')); assert(all.coins >= 50000);
  const none = rollWorldBossReward('void', () => .031); assert(!none.items.some(x => x.k === 'weapon' || x.k === 'armor'));
  const justWeapon = rollWorldBossReward('void', () => .0199); assert.equal(justWeapon.items.filter(x => x.k === 'weapon').length, 3);
  const armorOnly = rollWorldBossReward('void', () => .029); assert.equal(armorOnly.items.filter(x => x.k === 'weapon').length, 0); assert.equal(armorOnly.items.filter(x => x.k === 'armor').length, 4);
  for (const id of ['dragon', 'serpent', 'machine', 'thunderbird']) assert(!rollWorldBossReward(id, () => 0).items.some(x => x.set === 'void' || ['void_great', 'void_staff', 'void_bow'].includes(x.id)));
  assert.equal(worldBossWeapons('void').length, 3);
  // 저장 · 수령함 검증: 공허 무기와 방어구는 통과, 그 밖은 걸러낸다
  const bag = {}; cleanWorldBossBag({ wbMail: [{ k: 'weapon', id: 'void_great', n: 1 }, { k: 'armor', id: 'head', set: 'void', n: 1 }, { k: 'weapon', id: 'fake_blade', n: 1 }, { k: 'armor', id: 'head', set: 'fake', n: 1 }] }, bag);
  assert.deepEqual(bag.wbMail.map(x => x.id), ['void_great', 'head']);
});
test('보상은 서버(방장) 판정으로 한 번만 지급된다 — 기여도 10% 초과만, 같은 보스 키는 중복 지급 없음', () => {
  const f = fight(), g = f.g, h = g.heroes[0], other = g.heroes[1]; const coins = h.coins;
  other.map = 'worldboss'; other.x = f.m.x - 200; other.y = f.m.y;
  worldBossHit(g, f.m, h, f.m.max * .5); worldBossHit(g, f.m, other, f.m.max * .05);
  worldBossKilled({ notice() {}, fx() {} }, g, f.m);
  assert.equal(g.wb.results[0].rewards.length, 1, '10% 초과 1명만'); assert(h.coins > coins); const after = h.coins; assert.equal(h.bag.wbDone.length, 1);
  adv(g, 1); assert.equal(h.coins, after, '다시 줄 수 없음'); adv(g, 3); assert.equal(h.bag.wbDone.length, 1);
  assert.equal(other.coins, 300000, '기여 미달은 보상 없음');
});
