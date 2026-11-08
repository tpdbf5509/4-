/* 공허의 관측자 무기 셋 · 방어구 세트 — 실제 게임 함수로 판정 · 저장 · 승계 · 결투 상한 · 밸런스를 검증한다.
   node --test tools/void-weapons.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill, rpgFire, rpgPack, rpgApply, rpgPromote, rpgUseSkill, RPG, DUEL } from '../src/game/rpg.js';
import { SPECIALS } from '../src/game/shopData.js';
import { WEAPON_SKILLS } from '../src/game/skillData.js';
import { specialTier, specialsFor, whySpecialBuy, cleanBag, rpgShop } from '../src/game/shop.js';
import { VOID_WEAPONS, WORLD_SETS, WORLD_EQUIPMENT, worldArtCell, worldArt } from '../src/game/worldEquipmentData.js';
import { VOID_SKILLS, voidTotals } from '../src/game/voidWeaponData.js';
import { worldCooldownMul, worldVoidCd, worldVoidRift, worldArmorTick, worldSetCount, wearOf, packArmor, applyArmor } from '../src/game/armor.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { worldBossWeapons } from '../src/game/worldBossData.js';
Math.random = () => 0.999;   // 치명타 없음 — 피해가 같은 수치로 나온다
const JOB = { sword: 'warrior', great: 'warrior', staff: 'mage', bow: 'archer' };
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
function setup(id, { pvp = false } = {}) {
  const sp = SPECIALS.find(s => s.id === id), g = makeWorld();
  g.out = [];
  const ss = [{ id: 'v0', name: '공허시험', hero: { name: '공허시험', job: JOB[sp.t], elem: 'frost', gender: 'm' } }, { id: 'v1', name: '상대', hero: { name: '상대', job: 'warrior', elem: 'frost', gender: 'f' } }];
  rpgSyncSeats(g, ss);
  ss.forEach((s, i) => rpgJoin(g, i, { name: s.name, rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 100000, stats: { str: 100, int: 100, hp: 100 },
    bag: { oc: 1, w: i ? [] : [{ u: 1, t: sp.t, r: specialTier(sp), g: 4, p: 100, sp: id }], e: i ? 0 : 1, n: 2 } }, s.id));
  const h = g.heroes[0];
  h.map = 'train'; h.x = 900; h.y = 700; h.auto = 0; h.look = [1, 0]; h.dir = 1; g.heroes[1].auto = 0;
  rpgStep(g, .01);
  g.mobs = g.mobs.filter(m => m.map !== 'train');
  return { g, h, ss };
}
// 제자리에 서 있는 시험용 몬스터(기절 상태) — 맞은 양은 HP 에서 읽는다
function mob(g, x, y, extra = {}) {
  const m = { ...structuredClone(proto), id: g.nextId++, map: 'train', x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra };
  g.mobs.push(m); return m;
}
const dealt = m => HP - m.hp;
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) rpgStep(g, .01); };
// 한 대상이 가운데 서 있을 때 맞은 첫 타로 "배율 1" 의 피해를 알아낸다
function unitOf(id, firstMul) {
  const { g, h } = setup(id), m = mob(g, h.x + 40, h.y);
  const S = VOID_SKILLS[id].skill, spot = id === 'void_great' ? 0 : 0;
  rpgWeaponSkill(g, 0); run(g, id === 'void_great' ? .02 : id === 'void_bow' ? S.start + .02 : S.first + .02);
  assert(dealt(m) > 0, `${id} 첫 타가 들어가야 함`); return dealt(m) / firstMul;
}

test('무기 셋 데이터 — 사용자 지정 수치와 월드보스 전설 무기 능력치 체계', () => {
  const G = VOID_SKILLS.void_great, B = VOID_SKILLS.void_bow, S = VOID_SKILLS.void_staff;
  assert.deepEqual(voidTotals, { void_great: 5.6, void_bow: 5.6, void_staff: 6 });
  assert.deepEqual([G.skill.cd, G.skill.r, G.skill.slashes, G.skill.dur, G.passive.need, G.passive.r], [15, 200, 6, .9, 3, 170]);
  assert.deepEqual([B.skill.cd, B.skill.reach, B.skill.r, B.skill.arrows, B.skill.span + B.skill.start, B.passive.need, B.passive.r], [17, 600, 230, 8, 1.5, 4, 130]);
  assert.deepEqual([S.skill.cd, S.skill.reach, S.skill.r, S.skill.ticks, S.skill.burstAt, S.passive.need, S.passive.r], [19, 500, 250, 5, 2, 5, 140]);
  assert.equal(VOID_WEAPONS.length, 3);
  for (const w of VOID_WEAPONS) {
    assert.equal(w.lv, WORLD_EQUIPMENT.level); assert.equal(w.g, WORLD_EQUIPMENT.grade); assert.equal(w.amt, WORLD_EQUIPMENT.stat); assert(w.world);
    assert(WEAPON_SKILLS[w.id].skill && WEAPON_SKILLS[w.id].passive);
    assert(!specialsFor(800).some(s => s.id === w.id)); assert(!SPECIALS.filter(s => !s.world && !s.adv && !s.hold).some(s => s.id === w.id));
    assert.notEqual(worldArtCell(worldArt(w.id)), null);
  }
  assert.deepEqual(worldBossWeapons('void').map(w => w.id), ['void_great', 'void_staff', 'void_bow']);
  assert.deepEqual(VOID_WEAPONS.map(w => worldArtCell(worldArt(w.id))), [28, 29, 30]);
  assert.equal(WEAPON_SKILLS.flame.skill.cd, 14); assert.equal(WEAPON_SKILLS.flame.skill.hits * WEAPON_SKILLS.flame.skill.mul, 5.04);   // 화염검은 그대로
  assert(whySpecialBuy(setup('void_great').h, 'void_great').includes('월드보스 전용 장비입니다'));
});
test('공허의 대검: 6번 베기 + 마지막 폭발이 총 5.6배를 넘지 않고, 0.9초 안에 끝난다', () => {
  const unit = unitOf('void_great', .7), S = VOID_SKILLS.void_great.skill;
  const { g, h } = setup('void_great'), near = mob(g, h.x + 40, h.y), edge = mob(g, h.x + 190, h.y), out = mob(g, h.x + 260, h.y);
  rpgWeaponSkill(g, 0); assert(Math.abs(h.ws.wcd - 15) < .01);
  run(g, .08); assert(dealt(near) > 0 && dealt(near) < unit * 1.2, '첫 타는 한 번만');
  run(g, .9 - .08 - .02); const beforeBurst = dealt(near); assert(Math.abs(beforeBurst / unit - 4.2) < .06, `6타 합 ${beforeBurst / unit}`);
  run(g, .2);
  const total = dealt(near) / unit; assert(Math.abs(total - 5.6) < .06, `총 ${total}`);
  assert(dealt(edge) > 0 && Math.abs(dealt(edge) / unit - 5.6) < .06, '반경 200 안쪽 끝도 모두 맞음');
  assert.equal(dealt(out), 0, '반경 200 밖은 맞지 않음');
  assert(g.out.some(f => f.kind === 'sk_void_slash') && g.out.every(f => !f.kind?.startsWith('sk_') || f.kind.startsWith('sk_void')), '전용 연출만 사용');
  run(g, 1); assert.equal(h.ws.void.cast, null); const after = dealt(near); run(g, 1); assert.equal(dealt(near), after);
});
test('공허의 장궁: 가장 몰린 자리에 균열, 화살 8발 · 1.5초 · 한 대상 최대 5.6배', () => {
  const unit = unitOf('void_bow', .7), S = VOID_SKILLS.void_bow.skill;
  const { g, h } = setup('void_bow');
  const cluster = [mob(g, h.x + 420, h.y), mob(g, h.x + 440, h.y + 10), mob(g, h.x + 400, h.y - 10), mob(g, h.x + 430, h.y + 20)];
  const far = mob(g, h.x + 700, h.y);   // 시전 사거리 600 밖의 외톨이
  rpgWeaponSkill(g, 0);
  const rift = g.out.find(f => f.kind === 'sk_void_rain'); assert(rift); assert(Math.hypot(rift.x - (h.x + 420), 0) < 60, '몰린 쪽에 균열');
  run(g, 1.6);
  for (const m of cluster) { const t = dealt(m) / unit; assert(t > 0 && t <= 5.6 + .06, `한 대상 ${t}`); }
  assert.equal(dealt(far), 0);
  assert(Math.abs(Math.max(...cluster.map(dealt)) / unit - 5.6) < .06, '가운데 대상은 8발 모두');
  assert(S.arrows * S.arrowMul === 5.6);
});
test('공허의 지팡이: 몬스터를 끌어당기고 2초 5번 + 폭발이 총 6.0배, 보스급은 끌지 않는다', () => {
  const unit = unitOf('void_staff', .8), S = VOID_SKILLS.void_staff.skill;
  const { g, h } = setup('void_staff');
  const a = mob(g, h.x + 300, h.y), b = mob(g, h.x + 400, h.y + 30), c = mob(g, h.x + 330, h.y - 30);
  const boss = mob(g, h.x + 360, h.y + 5, { boss: 1 });
  const x0 = a.x, bx = boss.x;
  rpgWeaponSkill(g, 0); run(g, 1.0);
  const center = g.out.find(f => f.kind === 'sk_void_hole');
  assert(center && Math.hypot(a.x - center.x, (a.y - center.y) / RPG.squash) < Math.hypot(x0 - center.x, 0) - 5 || Math.abs(a.x - center.x) < 10, '끌려 들어옴');
  assert.equal(boss.x, bx, '보스급은 끌려오지 않음');
  run(g, .7);   // 1.7초 — 네 번째 피해까지(0.8 × 4 = 3.2). 5번째 피해와 폭발은 아직
  for (const m of [a, b, c]) assert(dealt(m) / unit <= 3.2 + .06, `폭발 전 ${dealt(m) / unit}`);
  run(g, .9);
  // 총 6.0배 + (패시브 중력 공명이 터졌다면 한 번에 1.2배 — 패시브는 따로 센다)
  for (const m of [a, b, c]) { const t = dealt(m) / unit, extra = t - 6.0; assert(t > 4.5, `끌려와 대부분 맞음 ${t}`); assert(extra < .06 && extra > -1.7 || Math.abs(extra - 1.2) < .06, `한 대상 ${t}`); }
  assert(g.out.filter(f => f.kind === 'sk_void_hole').length === 1);
  assert(Math.max(...[a, b, c].map(dealt)) / unit >= 6.0 - .1);
});
test('블랙홀은 사람(결투·사냥터 PvP)을 끌지 않고 사람에게 쓸 때도 시전 한 번의 상한을 지킨다', () => {
  for (const id of ['void_great', 'void_bow', 'void_staff']) {
    const { g, h } = setup(id), o = g.heroes[1];
    h.map = o.map = 'field'; h.x = 600; h.y = 600; o.x = 640; o.y = 600; h.pvpOn = o.pvpOn = 1; h.pty = o.pty = 0; g.mobs = []; h.calm = o.calm = -100; h.auto = o.auto = 0; o.inv = 0;
    h.buff = 100; h.buffAmt = 100000;
    const before = o.hp, ox = o.x;
    rpgWeaponSkill(g, 0); run(g, 3);
    assert(o.hp < before, `${id} 맞아야 함`); assert(before - o.hp <= o.max * .12 + 1, `${id} 누적 ${before - o.hp} 는 최대 체력 12% 이하`);
    assert(Math.abs(o.x - ox) < 2, '사람은 끌려가지 않음');
  }
});
test('결투장: 시전 한 번의 피해는 duelBalance 스킬 상한(18%)을 넘지 않는다', () => {
  for (const id of ['void_great', 'void_bow', 'void_staff']) {
    const { g, h, ss } = setup(id), o = g.heroes[1];
    g.mobs = []; h.map = o.map = 'arena'; h.dvs = o.dvs = 1; h.dph = o.dph = 2; o.ring = h.ring = 0; h.x = 1000; h.y = 900; o.x = 1040; o.y = 900; h.pvpOn = o.pvpOn = 1; o.inv = 0; h.buff = 100; h.buffAmt = 100000;
    const before = o.hp; rpgWeaponSkill(g, 0); run(g, 3);
    assert(before - o.hp <= o.max * DUEL.skillPct + 1, `${id} 결투 누적 ${before - o.hp} / ${o.max * DUEL.skillPct}`);
  }
});
test('대검 패시브: 몬스터 3마리 처치 → 다음 평타에 반경 170 참격, 그 참격의 처치는 충전에 세지 않는다', () => {
  const { g, h } = setup('void_great');
  const weak = [0, 1, 2].map(i => mob(g, h.x + 40 + i * 30, h.y, { hp: 1, max: 1 }));
  const far = [0, 1, 2, 3].map(i => mob(g, h.x + 400, h.y + 100 + i * 10, { hp: 1, max: 1 }));   // 평타 · 참격 거리 안쪽(170)에는 없다
  rpgWeaponSkill(g, 0); run(g, 1.3);
  assert(weak.every(m => m.dead || m.hp <= 0), '셋 모두 처치');
  assert.equal(h.ws.void.charge, 1, '3마리 → 충전 1'); assert.equal(h.ws.void.kills, 0);
  // 평타 한 번에 공간 참격(170) — 가까운 둘이 걸려 죽어도 충전은 늘지 않는다
  const prey = [60, 80, 100, 120, 140, 160].map((d, i) => mob(g, h.x + d, h.y + (i % 2 ? 6 : -6), { hp: 1, max: 1 }));
  g.out = []; h.cd = 0; h.fire = 1; rpgStep(g, .02); h.fire = 0;
  assert(g.out.some(f => f.kind === 'sk_void_slash_pas'), '공간 참격 연출');
  const dead = prey.filter(m => m.dead || m.hp <= 0).length;
  assert(dead >= 4, `평타 + 참격이 여럿을 쓸어 담음 ${dead}`);
  assert.equal(h.ws.void.charge + 0, h.ws.void.charge); assert(h.ws.void.charge <= 1, '충전은 소모');
  assert(h.ws.void.kills + h.ws.void.charge * 3 < dead, `참격이 잡은 몹은 충전에 세지 않음 — 연쇄 없음 (죽은 ${dead} · 센 ${h.ws.void.kills + h.ws.void.charge * 3})`);
  assert(far.every(m => !m.dead));
});
test('장궁 패시브: 평타 4번 적중마다 반경 130 화살 폭발(연쇄 없음)', () => {
  const { g, h } = setup('void_bow'), main = mob(g, h.x + 180, h.y), side = mob(g, h.x + 230, h.y + 20);
  let bursts = 0;
  for (let i = 0; i < 8; i++) { g.out = []; h.cd = 0; h.fire = 1; rpgStep(g, .02); h.fire = 0; run(g, .05); bursts += g.out.filter(f => f.kind === 'sk_void_arrow_pas').length; if (i === 2) assert.equal(bursts, 0, '3번까지는 없음'); }
  assert(bursts >= 1 && bursts <= 2, `8번 중 폭발 ${bursts}`);
  assert(h.ws.void.hits < 4);
});
test('지팡이 패시브: 공격 스킬 5번 적중마다 반경 140 중력 폭발, 간격 안에는 겹치지 않는다', () => {
  const { g, h } = setup('void_staff'), a = mob(g, h.x + 200, h.y), b = mob(g, h.x + 260, h.y + 20);
  rpgWeaponSkill(g, 0); run(g, 2.6);
  const bursts = g.out.filter(f => f.kind === 'sk_void_grav_pas').length;
  assert(bursts >= 1 && bursts <= 2, `한 번의 블랙홀에 중력 폭발 ${bursts}번`);
  const spent = a.hp; g.out = []; run(g, 1); assert.equal(a.hp, spent, '시전이 끝나면 더 때리지 않음');
});
test('같은 시전의 판정은 스냅샷 · 방장 승계 뒤에도 이어지고 이미 맞은 타를 다시 치지 않는다', () => {
  for (const id of ['void_great', 'void_bow', 'void_staff']) {
    const { g, h, ss } = setup(id);
    const m = mob(g, h.x + 40, h.y); rpgWeaponSkill(g, 0); run(g, .5);
    const guest = makeWorld(); rpgSyncSeats(guest, ss); rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
    const copy = guest.heroes[0]; assert(copy.ws.void.cast, `${id} 시전 상태가 손님에게 감`);
    assert.equal(copy.ws.void.cast.cap.id, h.ws.void.cast.cap.id);
    rpgPromote(guest); copy.loaded = 1; copy.auto = 0; guest.heroes[1].auto = 0;
    const gm = mob(guest, m.x, m.y); gm.hp = m.hp;
    run(guest, 3); assert.equal(copy.ws.void.cast, null);
    assert(HP - gm.hp <= (HP - m.hp) + 7 * HP, '시험 보호');
    h.bag.e = 0; run(g, .05); assert.equal(h.ws.void?.cast ?? null, null, '장비를 바꾸면 중단');
  }
});
test('월드보스(단일 대상)와 몬스터 무리를 따로 잰다 — 화염검 대비', () => {
  const rows = {};
  for (const id of ['flame', 'void_great', 'void_bow', 'void_staff']) {
    const { g, h } = setup(id);
    const crowd = []; for (let i = 0; i < 30; i++) { const a = i * 2.4, d = Math.sqrt(i / 30) * 240; crowd.push(mob(g, h.x + 60 + Math.cos(a) * d, h.y + Math.sin(a) * d * RPG.squash)); }
    rpgWeaponSkill(g, 0); run(g, 3);
    const solo = setup(id), boss = mob(solo.g, solo.h.x + 40, solo.h.y);
    rpgWeaponSkill(solo.g, 0); run(solo.g, 3);
    const cd = solo.h.ws.wcd, cdFull = { flame: 14, void_great: 15, void_bow: 17, void_staff: 19 }[id];
    rows[id] = { crowd: crowd.reduce((s, m) => s + dealt(m), 0), boss: dealt(boss), cd: cdFull };
  }
  const dps = id => rows[id].boss / rows[id].cd;
  // 단일 대상: 같은 직업 기준이 아니라 직업 기본 공격력이 달라 배율(총배율/쿨타임)로 견준다
  const mulDps = { flame: 5.04 / 14, void_great: 5.6 / 15, void_bow: 5.6 / 17, void_staff: 6 / 19 };
  for (const id of ['void_great', 'void_bow', 'void_staff']) {
    const r = mulDps[id] / mulDps.flame; assert(r > .8 && r < 1.2, `${id} 단일 대상 배율 DPS 가 화염검의 ±20% 안 — ${r.toFixed(2)}`);
  }
  // 광역: 무리(30마리, 반경 240) 한 번 시전 합계가 화염검의 0.8배 이상이어야 "견줄 만하다"
  for (const id of ['void_great', 'void_bow', 'void_staff']) assert(rows[id].crowd >= rows.flame.crowd * .8, `${id} 광역 ${rows[id].crowd} vs 화염검 ${rows.flame.crowd}`);
  assert(rows.void_staff.crowd > 0 && rows.void_great.boss > 0);
});
// ── 방어구 세트 ───────────────────────────────────────────
const wear = (h, set, slots = ['head', 'body', 'legs', 'feet']) => { h.bag.a = slots.map((s, i) => ({ u: 10 + i, s, g: 3, set })); h.bag.ae = Object.fromEntries(h.bag.a.map(a => [a.s, a.u])); };
test('차원의 지배자: 4부위 · 2세트 재사용 대기 8% 감소(무기·직업 스킬)', () => {
  const V = WORLD_SETS.find(s => s.id === 'void'); assert(V && V.name === '차원의 지배자');
  const { g, h } = setup('void_great');
  assert.equal(worldVoidCd(h), 1); wear(h, 'void', ['head']); assert.equal(worldVoidCd(h), 1, '1부위는 효과 없음');
  wear(h, 'void', ['head', 'body']); assert.equal(worldVoidCd(h), .92); assert.equal(worldCooldownMul(h), .92);
  mob(g, h.x + 40, h.y); rpgWeaponSkill(g, 0); assert(Math.abs(h.ws.wcd - 15 * .92) < .01, `무기 스킬 ${h.ws.wcd}`);
  assert.deepEqual(wearOf(h)?.length, 3);
  // 기계 세트와 섞어도 곱으로 합쳐진다
  h.bag.a.push({ u: 12, s: 'legs', g: 3, set: 'machine' }, { u: 13, s: 'feet', g: 3, set: 'machine' }); h.bag.ae.legs = 12; h.bag.ae.feet = 13;
  assert(Math.abs(worldCooldownMul(h) - .92 * .9) < 1e-9);
});
test('차원의 지배자 4세트: 스킬 적중 시 반경 180 공간 폭발 · 기본 스킬 피해 1.2배 · 10초마다 · 평타와 지속 피해는 아님', () => {
  const { h } = setup('void_great'); wear(h, 'void');
  const V = WORLD_SETS.find(s => s.id === 'void');
  assert.equal(V.radius, 180); assert.equal(V.mul, 1.2); assert.equal(V.cooldown, 10); assert.equal(V.slow, 2); assert.equal(V.slowAmt, .2);
  assert.equal(worldVoidRift(h, { basic: true }), false, '평타는 아님');
  assert.equal(worldVoidRift(h, { dot: true, skill: true }), false, '지속 피해는 아님');
  assert.equal(worldVoidRift(h, { skill: true }), true);
  const arm = packArmor(h), other = { arm: null, bag: h.bag }; applyArmor(other, JSON.parse(JSON.stringify(arm))); assert(other.arm.sets.dimCd > 0, '대기가 스냅샷으로 전해짐');
  assert.equal(worldVoidRift(h, { skill: true }), false, '10초마다 — 아직 대기');
  worldArmorTick(h, V.cooldown + .01); assert.equal(worldVoidRift(h, { skill: true }), true, '대기 뒤 다시');
  worldArmorTick(h, V.cooldown + .01); wear(h, 'void', ['head', 'body', 'legs']); assert.equal(worldVoidRift(h, { skill: true }), false, '3부위는 효과 없음');
});
test('4세트 공간 폭발 — 둘레 몬스터에게 기본 스킬 피해 1.2배 · 2초 동안 이동 속도 20% 감소', () => {
  const hitBy = set => {
    const { g, h } = setup('void_great'); if (set) wear(h, 'void');
    const a = mob(g, h.x + 40, h.y), far = mob(g, h.x + 40 + 170, h.y), out = mob(g, h.x + 40 + 400, h.y);
    rpgWeaponSkill(g, 0); rpgStep(g, .01);
    return { g, h, a, far, out };
  };
  const off = hitBy(false), on = hitBy(true);
  assert.equal(dealt(off.far), 0, '세트 없으면 바깥 몬스터는 안 맞는다');
  assert(dealt(on.far) > 0, '반경 180 안의 몬스터가 폭발에 맞는다');
  assert.equal(dealt(on.out), 0, '반경 밖은 안 맞는다');
  assert(on.far.vslow > 1.9 && on.far.vslow <= 2, `둔화 ${on.far.vslow}`);
  run(on.g, 2.1); assert(!(on.far.vslow > 0), '2초 뒤 둔화 끝');
});
test('관리자 시험 지급과 저장 — 차원의 지배자 무기 3종 · 방어구 4종', () => {
  const { g, h } = setup('void_great'); h.admin = 1; h.bag.w = []; h.bag.a = [];
  rpgShop(g, 0, { op: 'wbgive', set: 'void' }); assert.equal(h.bag.w.length, 3); assert.equal(h.bag.a.length, 4);
  assert(h.bag.a.every(a => a.set === 'void' && a.g === 3));
  const clean = cleanBag(JSON.parse(JSON.stringify(h.bag)), true);
  assert.deepEqual(clean.w.map(w => w.sp).sort(), ['void_bow', 'void_great', 'void_staff']); assert.equal(clean.a.filter(a => a.set === 'void').length, 4);
  for (const slot of ['head', 'body', 'legs', 'feet']) assert.notEqual(worldArtCell(worldArt(`void:${slot}`)), null);
  assert.deepEqual(['head', 'body', 'legs', 'feet'].map(s => worldArtCell(worldArt(`void:${s}`))), [31, 32, 33, 34]);
});
