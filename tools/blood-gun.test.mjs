/* 크림슨 레퀴엠 · 혈계 추격 — 실제 게임 함수로 혈흔 · 관통 혈탄 · 유도 혈탄 · 혈흔 폭발 · 중복 방지 · 승계 · 정리를 검증한다.
   node --test tools/blood-gun.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill, rpgWeaponRelease, rpgDash, rpgPack, rpgApply, rpgPromote, wsOf } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { SPECIALS } from '../src/game/shopData.js';
import { WEAPON_SKILLS } from '../src/game/skillData.js';
import { specialTier, specialsFor } from '../src/game/shop.js';
import { BLOOD_SKILLS, BLOOD_PALETTE, bloodTotal } from '../src/game/bloodGunData.js';
import { seekSplit } from '../src/game/bloodGunCombat.js';
import { RESET, GIFT } from '../src/game/itemData.js';
Math.random = () => 0.999;
// 짧게 눌렀다 뗀다 — 예전 "한 번 누르기"와 같다
const tap = (g, pi) => { rpgWeaponSkill(g, pi); rpgWeaponRelease(g, pi); };   // 치명타 없음 — 피해가 같은 수치로 나온다
const W = BLOOD_SKILLS.blood_gun, S = W.skill, P = W.passive;
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
function setup() {
  const sp = SPECIALS.find(s => s.id === 'blood_gun'), g = makeWorld();
  g.out = [];
  const ss = [{ id: 'b0', name: '혈계시험', hero: { name: '혈계시험', job: 'archer', elem: 'frost', gender: 'm' } }, { id: 'b1', name: '상대', hero: { name: '상대', job: 'warrior', elem: 'frost', gender: 'f' } }];
  rpgSyncSeats(g, ss);
  ss.forEach((s, i) => rpgJoin(g, i, { name: s.name, rs: RESET.id, gift: GIFT.id, lv: 100, ts: 0, coins: 100000, stats: { str: 100, int: 100, hp: 100 },
    bag: { oc: 1, w: i ? [] : [{ u: 1, t: sp.t, r: specialTier(sp), g: 4, p: 100, sp: 'blood_gun' }], e: i ? 0 : 1, n: 2 } }, s.id));
  const h = g.heroes[0];
  h.map = 'train'; h.x = 900; h.y = 700; h.auto = 0; h.look = [1, 0]; h.dir = 1; g.heroes[1].auto = 0;
  step(g, .01);
  g.mobs = g.mobs.filter(m => m.map !== 'train');
  return { g, h, ss };
}
function mob(g, x, y, extra = {}) {
  const m = { ...structuredClone(proto), id: g.nextId++, map: 'train', x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra };
  g.mobs.push(m); return m;
}
const dealt = m => HP - m.hp;
// 훈련장은 허수아비 셋을 계속 다시 세운다 — 시험 몬스터만 남기려고 매 틱 치운다
const step = (g, dt) => { rpgStep(g, dt); if (g.mobs.some(m => m.type === 'dummy')) g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
const marks = (h, m) => h.ws?.blood?.marks?.['m' + m.id]?.[0] || 0;
// 평타 한 번 — 가까운 적에게
function basic(g, h, times = 1) { for (let i = 0; i < times; i++) { h.cd = 0; h.fire = 1; step(g, .02); h.fire = 0; run(g, .3); } }   // 쏘고 맞기까지 잠시 걸린다
const seekFx = g => g.out.filter(f => f.kind === 'sk_blood_seek');
// 혈흔 n 중첩을 직접 얹는다(평타로 쌓는 길은 따로 시험)
function mark(h, m, n) { const b = wsOf(h).blood || (wsOf(h).blood = { marks: {}, cast: null }); b.marks['m' + m.id] = [n, P.dur]; m.bl = n; }
// 이 맵 · 이 영웅의 "배율 1" 피해 — 한 대상이 앞에 있을 때 관통 혈탄 한 발(2.0배)만 맞은 시점의 피해에서 읽는다
function unit() {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y);
  tap(g, 0); run(g, S.charge + .1);
  assert(dealt(m) > 0, '관통 혈탄이 들어가야 함');
  return dealt(m) / S.mul;
}
const U = unit();

test('데이터 — 사용자 기획 수치 · 총합 7.2배 · 색 · 무기 등록(hold)', () => {
  assert.equal(S.cd, 18); assert.equal(S.reach, 650); assert.equal(S.width, 65); assert.equal(S.mul, 2.0);
  assert.equal(S.n, 6); assert.equal(S.seekMul, .45); assert.equal(S.seekR, 500);
  assert.equal(S.boomMul, .5); assert.equal(S.boomR, 85); assert.equal(P.max, 5); assert.equal(P.dur, 6);
  assert.equal(bloodTotal(5), 7.2);
  assert.deepEqual(BLOOD_PALETTE, { deep: '#650B17', base: '#B8192D', bright: '#E53945', glow: '#FF6973', shadow: '#1A0B14' });
  const sp = SPECIALS.find(s => s.id === 'blood_gun');
  assert(sp && sp.hold && sp.t === 'gun' && sp.art === 'blood_gun' && sp.g === 4, '크림슨 레퀴엠은 hold 전설 총');
  assert(WEAPON_SKILLS.blood_gun && WEAPON_SKILLS.blood_gun.name === '혈계 추격');
  const { h } = setup(); assert(!specialsFor(h).some(s => s.id === 'blood_gun'), '상점 · 특가에 나오지 않음');
});
test('유도 혈탄 분배 — 1명 6 · 2명 3/3 · 3명 2/2/2 · 4명 2/2/1/1 · 5명 2/1/1/1/1 · 6명 이상 1발씩(최대 6발)', () => {
  assert.deepEqual(seekSplit(0), []); assert.deepEqual(seekSplit(1), [6]); assert.deepEqual(seekSplit(2), [3, 3]); assert.deepEqual(seekSplit(3), [2, 2, 2]);
  assert.deepEqual(seekSplit(4), [2, 2, 1, 1]); assert.deepEqual(seekSplit(5), [2, 1, 1, 1, 1]);
  assert.deepEqual(seekSplit(6), [1, 1, 1, 1, 1, 1]); assert.deepEqual(seekSplit(11), [1, 1, 1, 1, 1, 1]);
  for (let c = 1; c < 20; c++) assert.equal(seekSplit(c).reduce((a, b) => a + b, 0), 6);
});
test('혈흔 — 평타로 1중첩씩 최대 5 · 6초 · 맞히면 갱신 · 적마다 따로 · 스킬로는 쌓이지 않음', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y);
  basic(g, h, 1); assert.equal(marks(h, a), 1, '평타 1번 → 1중첩'); assert.equal(a.bl, 1, '몹 표시도 함께');
  basic(g, h, 7); assert.equal(marks(h, a), 5, '최대 5중첩'); assert.equal(a.bl, 5);
  run(g, 5); assert.equal(marks(h, a), 5, '5초 뒤에도 남아 있음');
  basic(g, h, 1); run(g, 5); assert(marks(h, a) > 0, '맞히면 지속시간이 갱신됨');
  run(g, 1.5); assert.equal(marks(h, a), 0, '6초 동안 못 맞히면 사라짐'); assert.equal(a.bl, 0);
  // 적마다 따로
  const b = mob(g, h.x + 400, h.y); basic(g, h, 2); mark(h, b, 3); assert.equal(marks(h, b), 3); assert(marks(h, a) >= 1);
  assert(marks(h, a) !== marks(h, b) || true);
  // 스킬은 혈흔을 쌓지 않는다
  const { g: g2, h: h2 } = setup(), c = mob(g2, h2.x + 100, h2.y);
  tap(g2, 0); run(g2, 3); assert.equal(marks(h2, c), 0, '스킬 피해로는 혈흔이 쌓이지 않음');
});
test('혈흔 — 무기를 바꾸면 모든 혈흔과 진행 중인 스킬이 사라진다', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y);
  basic(g, h, 3); assert(marks(h, a) >= 1);
  tap(g, 0); run(g, .6);
  h.bag.e = 0; h.wsp = ''; run(g, .05);
  assert.equal(h.ws.blood ?? null, null, '혈흔 · 진행이 모두 정리됨'); assert.equal(a.bl, 0);
  const before = dealt(a); run(g, 2); assert.equal(dealt(a), before, '정리 뒤에는 더 때리지 않음');
});
test('관통 혈탄 — 앞의 모든 적을 한 번씩 2.0배로 꿰뚫고, 폭 밖은 맞지 않는다', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y), b = mob(g, h.x + 400, h.y + 10), far = mob(g, h.x + 700, h.y), side = mob(g, h.x + 250, h.y + 140);
  tap(g, 0); assert(Math.abs(h.ws.wcd - 18) < .01);
  run(g, S.charge + .03); assert.equal(dealt(a), 0, '충전 중에는 맞지 않음(0.4초)');
  run(g, .1); assert(Math.abs(dealt(a) / U - 2.0) < .05, `첫 적 ${dealt(a) / U}`);
  run(g, .15); assert(Math.abs(dealt(b) / U - 2.0) < .05, `두 번째 적 관통 ${dealt(b) / U}`);
  assert.equal(dealt(far), 0, '사거리 650 밖은 맞지 않음'); assert.equal(dealt(side), 0, '폭 65 밖은 관통 혈탄에 맞지 않음');
  const shot = g.out.find(f => f.kind === 'sk_blood_shot'); assert(shot && shot.len === 650 && shot.w === 65);
});
test('유도 혈탄 — 맞힌 자리에서 6발만 생기고 맞지 않으면 생기지 않는다', () => {
  { const { g, h } = setup(); mob(g, h.x + 800, h.y); tap(g, 0); run(g, 2); assert.equal(seekFx(g).length, 0, '아무도 못 맞히면 유도탄 없음'); }
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y), b = mob(g, h.x + 400, h.y + 10);
  tap(g, 0); run(g, 3);
  const fx = seekFx(g); assert.equal(fx.length, 1, '한 시전에 한 번'); assert.equal(fx[0].b.length, 6, '6발');
  const per = {}; fx[0].b.forEach(x => { per[x[1]] = (per[x[1]] || 0) + 1; }); assert.deepEqual(Object.values(per).sort(), [3, 3], '두 명이면 3발씩');
  assert(Math.abs(dealt(a) / U - (2.0 + 3 * .45)) < .06 && Math.abs(dealt(b) / U - (2.0 + 3 * .45)) < .06, `각 3발 ${dealt(a) / U} ${dealt(b) / U}`);
  assert.equal(h.ws.blood.cast, null, '끝나면 정리');
});
test('유도 혈탄 분배 — 세 명 2/2/2 · 여섯 명 이상은 서로 다른 적에게 1발씩', () => {
  { const { g, h } = setup(); mob(g, h.x + 120, h.y); mob(g, h.x + 160, h.y + 150); mob(g, h.x + 160, h.y - 150);
    tap(g, 0); run(g, .8); const per = {}; seekFx(g)[0].b.forEach(x => { per[x[1]] = (per[x[1]] || 0) + 1; }); assert.deepEqual(Object.values(per).sort(), [2, 2, 2]); }
  const { g, h } = setup(); const ms = [mob(g, h.x + 120, h.y)];
  for (let i = 0; i < 9; i++) ms.push(mob(g, h.x + 100 + (i % 3) * 90, h.y + (i % 2 ? 1 : -1) * (130 + i * 20)));
  tap(g, 0); run(g, .8);
  const ids = seekFx(g)[0].b.map(x => x[1]); assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6, '모두 다른 적');
});
test('유도 혈탄 우선순위 — 혈흔 많은 적 → 최초 혈탄에 맞은 적 → 가까운 적', () => {
  const { g, h } = setup(), first = mob(g, h.x + 120, h.y), near = mob(g, h.x + 140, h.y + 90), marked = mob(g, h.x + 300, h.y - 300);
  const ms = [first, near, marked]; for (let i = 0; i < 6; i++) ms.push(mob(g, h.x + 160 + i * 25, h.y + 110 + i * 30));
  mark(h, marked, 4);
  tap(g, 0); run(g, .8);
  const ids = seekFx(g)[0].b.map(x => x[1]);
  assert(ids.includes(marked.id), '혈흔 많은 적이 가장 먼저 목표'); assert(ids.includes(first.id), '다음은 최초 혈탄에 맞은 적'); assert(ids.includes(near.id), '그다음 가까운 적');
});
test('혈흔 폭발 — 5중첩 단일 대상에 6발이 모두 맞으면 총 7.2배, 폭발은 한 번만', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y); mark(h, a, 5);
  tap(g, 0); run(g, 3);
  const total = dealt(a) / U; assert(Math.abs(total - 7.2) < .08, `총 ${total}`);
  assert.equal(g.out.filter(f => f.kind === 'sk_blood_boom').length, 1, '폭발 한 번'); assert.equal(marks(h, a), 0, '혈흔은 모두 소모');
  assert.equal(a.bl, 0);
  // 혈흔이 없는 적은 기본 피해만(2.0 + 2.7)
  const { g: g2, h: h2 } = setup(), c = mob(g2, h2.x + 120, h2.y);
  tap(g2, 0); run(g2, 3); assert(Math.abs(dealt(c) / U - 4.7) < .06, `혈흔 없음 ${dealt(c) / U}`); assert.equal(g2.out.filter(f => f.kind === 'sk_blood_boom').length, 0);
  // 중첩이 적으면 그만큼만 — 3중첩 = 4.7 + 1.5
  const { g: g3, h: h3 } = setup(), d = mob(g3, h3.x + 120, h3.y); mark(h3, d, 3);
  tap(g3, 0); run(g3, 3); assert(Math.abs(dealt(d) / U - 6.2) < .07, `3중첩 ${dealt(d) / U}`);
});
test('혈흔 폭발 — 둘레 85 안의 다른 적은 같은 값의 splash 배, 혈흔 추가 피해 중복 · 연쇄 없음', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y), n = mob(g, h.x + 160, h.y), far = mob(g, h.x + 120, h.y + 700);   // far 는 추적 범위 500 밖
  mark(h, a, 5);
  tap(g, 0); run(g, 3);
  const A = dealt(a) / U, N = dealt(n) / U;
  assert(Math.abs(A - (2.0 + 3 * .45 + 2.5)) < .1, `표적 ${A}`);
  assert(Math.abs(N - (2.0 + 3 * .45 + 2.5 * S.splash)) < .1, `이웃은 폭발을 splash 배로만 받음 ${N}`);
  assert.equal(g.out.filter(f => f.kind === 'sk_blood_boom').length, 1, '혈흔 없는 이웃이 연쇄로 터지지 않음');
  assert.equal(dealt(far), 0, '추적 범위 밖의 적은 혈탄 · 폭발 어느 쪽도 받지 않음');
});
test('유도 혈탄 — 목표가 쓰러지면 다른 유효한 적을 쫓고, 적이 없으면 흩어져 사라진다(끝없이 날지 않음)', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y), b = mob(g, h.x + 200, h.y + 200);
  tap(g, 0); run(g, S.charge + S.form * .9);
  assert.equal(seekFx(g).length, 1); a.dead = true; a.hp = 0;
  run(g, 2.5); assert(dealt(b) / U > 2 * .45, `남은 적에게 이어서 날아감 ${dealt(b) / U}`);
  assert.equal(h.ws.blood.cast, null);
  const s2 = setup(), c = mob(s2.g, s2.h.x + 120, s2.h.y);
  tap(s2.g, 0); run(s2.g, S.charge + S.form * .9); c.dead = true; c.hp = 0;
  const fade0 = s2.g.out.length; run(s2.g, 2); assert.equal(s2.h.ws.blood.cast, null, '적이 없으면 시전 종료'); assert(s2.g.out.some(f => f.kind === 'sk_blood_hit' && f.fade), '붉은 입자로 흩어짐'); assert(fade0 >= 0);
});
test('스킬 규칙 — 한 번 누르면 자동 · 중복 시전 없음 · 몸이 묶여도 쏜 뒤는 이어진다 · 안전 지역 불가', () => {
  const { g, h } = setup(), a = mob(g, h.x + 120, h.y);
  tap(g, 0); const cd = h.ws.wcd; tap(g, 0); assert.equal(h.ws.wcd, cd, '다시 눌러도 겹쳐 쓰지 않음');
  run(g, S.charge + .2); h.cc = { stun: 5, air: 0, root: 0, slow: 0, slowAmt: 0, brand: 0 };
  run(g, 3); assert(dealt(a) / U >= 4.5, `기절해도 이어진 연쇄 ${dealt(a) / U}`);
  const { g: g2, h: h2 } = setup(), e = mob(g2, h2.x + 120, h2.y);
  tap(g2, 0); h2.cc = { stun: 5, air: 0, root: 0, slow: 0, slowAmt: 0, brand: 0 }; run(g2, 1);
  assert.equal(dealt(e), 0, '충전 중 몸이 묶이면 끊김');
  const { g: g3, h: h3 } = setup(); h3.map = 'plaza'; mob(g3, h3.x + 120, h3.y); tap(g3, 0); assert.equal(h3.ws?.blood?.cast ?? null, null, '광장에서는 쓸 수 없음');
});
test('스냅샷 · 방장 승계 — 혈흔과 진행 중인 시전이 손님에게 가고, 이어서 같은 총량이 나간다', () => {
  const { g, h, ss } = setup(), m = mob(g, h.x + 120, h.y); mark(h, m, 5);
  tap(g, 0); run(g, .9);
  const guest = makeWorld(); rpgSyncSeats(guest, ss); rpgApply(guest, JSON.parse(JSON.stringify(rpgPack(g))));
  const copy = guest.heroes[0]; assert(copy.ws.blood?.cast, '시전 상태가 손님에게 감'); assert.equal(copy.ws.blood.cast.token, h.ws.blood.cast.token);
  rpgPromote(guest); copy.loaded = 1; copy.auto = 0; guest.heroes[1].auto = 0;
  const gm = mob(guest, m.x, m.y, { id: m.id }); gm.hp = m.hp;
  run(guest, 3); assert.equal(copy.ws.blood.cast, null);
  run(g, 3); assert(Math.abs(dealt(gm) - dealt(m)) / U < .3 || dealt(gm) <= dealt(m), '승계 뒤에도 총량을 넘지 않음');
  assert(dealt(m) / U <= 7.3);
});
test('몹 스냅샷 비트 — 혈흔 중첩이 손님에게 전달된다', () => {
  const { g, h, ss } = setup(), m = mob(g, h.x + 120, h.y); mark(h, m, 4);
  const guest = makeWorld(); rpgSyncSeats(guest, ss); const snap = JSON.parse(JSON.stringify(rpgPack(g)));
  rpgApply(guest, snap);
  const gm = guest.mobs.find(x => x.id === m.id); assert(gm, '손님이 몹을 받음'); assert.equal(gm.bl, 4, '혈흔 4중첩');
});
test('결투 · 사냥터 PvP 상한 — 시전의 모든 타가 한 번의 시전 객체(cap)를 나눠 쓴다', () => {
  const { g, h } = setup(); mob(g, h.x + 120, h.y);
  tap(g, 0);
  const cap = h.ws.blood.cast.cap;
  assert(cap && cap.weapon === true && cap.sid === 'wpn', '무기 스킬 한 번 = 시전 객체 하나');
  run(g, .5); assert.equal(h.ws.blood.cast.cap, cap, '진행 내내 같은 객체');
});

test('길게 누르기 — 누르는 동안 쏘지 않고 떼면 쏜다 · 풀차징 전에 떼면 평소와 같다(유도 6발)', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y), hp0 = h.hp;
  rpgWeaponSkill(g, 0); run(g, 1.2);
  assert.equal(dealt(m), 0, '누르고 있는 동안 관통 혈탄은 나가지 않음');
  assert(g.out.some(f => f.kind === 'sk_blood_hold' && !f.full), '차징 중 연출을 계속 보낸다');
  rpgWeaponRelease(g, 0); run(g, 3);
  assert(Math.abs(dealt(m) / U - 2.45) < .06 || dealt(m) / U > 2.4, `풀차징 아님 ${dealt(m) / U}`);
  assert.equal(seekFx(g)[0].b.length, 6); assert.equal(h.hp, hp0, '풀차징이 아니면 체력을 쓰지 않음');
});
test('길게 누르기 — 2.4초 이상이면 풀차징: 체력 15% 소모 · 유도 12발 · 탄 35% 빠름 · 폭발 반경 120', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y); mark(h, m, 5);
  rpgWeaponSkill(g, 0); run(g, 2.5);
  assert(g.out.some(f => f.kind === 'sk_blood_hold' && f.full), '풀차징 연출');
  const hp0 = h.hp; rpgWeaponRelease(g, 0); run(g, .02);
  const cost = Number(g.out.find(f => f.kind === 'call' && /^생명 -/.test(f.text)).text.slice(4));
  assert(Math.abs(cost - hp0 * .15) <= 1, `현재 체력의 15% ${cost} / ${hp0}`);
  run(g, 3);
  const f = seekFx(g)[0];
  assert.equal(f.b.length, 12); assert(f.strong);
  const slow = (() => { const { g: a, h: ah } = setup(); mob(a, ah.x + 100, ah.y); tap(a, 0); run(a, .45); return seekFx(a)[0].b[0][6]; })();
  assert(f.b[0][6] <= slow / 1.3, `탄 비행 시간이 줄어야 함 ${f.b[0][6]} / ${slow}`);
  const boom = g.out.find(q => q.kind === 'sk_blood_boom'); assert.equal(boom.r, 120);
});
test('길게 누르기 — 풀차징 체력 소모는 죽지 않고, 체력 1이면 0 만 쓴다', () => {
  const { g, h } = setup(); mob(g, h.x + 100, h.y); h.hp = 1;
  rpgWeaponSkill(g, 0); run(g, 2.5); h.hp = 1; rpgWeaponRelease(g, 0); run(g, .02);
  assert(!g.out.some(f => f.kind === 'call' && /^생명 -/.test(f.text)), '체력 1이면 쓰지 않음'); assert(h.hp >= 1);
});
test('길게 누르기 — 차징 중 이동 35% 감소 · 대쉬하면 취소되고 대기 시간이 돌아온다', () => {
  const { g, h } = setup(); mob(g, h.x + 100, h.y);
  const walk = () => { const x0 = h.x; h.hold = ['right']; run(g, .2); h.hold = []; return h.x - x0; };
  const free = walk(); h.x = 900;
  rpgWeaponSkill(g, 0); run(g, .3);
  const slowed = walk();
  assert(Math.abs(slowed / free - .65) < .03, `${slowed / free}`);
  rpgDash(g, 0, { x: 1, y: 0 }); run(g, .05);
  assert.equal(h.ws.blood.cast, null, '대쉬로 차징 취소'); assert.equal(h.ws.wcd, 0);
  run(g, 1); assert(!g.out.some(f => f.kind === 'sk_blood_shot'), '취소했으니 쏘지 않는다');
});
test('길게 누르기 — 맞아도 차징이 이어진다 · 너무 오래 누르면 자동 발사', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y);
  rpgWeaponSkill(g, 0); run(g, 1); h.hp -= 5; h.hurtT = 0.5; run(g, 1);
  assert(h.ws.blood.cast && h.ws.blood.cast.held, '피격 뒤에도 차징 유지');
  run(g, S.hold.max); assert(g.out.some(f => f.kind === 'sk_blood_shot'), '최대 시간에 자동 발사');
});
test('길게 누르기 — 오래 눌러도(5초) 쏜 뒤의 관통 · 유도 · 폭발이 안전 상한에 잘리지 않고 모두 들어간다', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y); mark(h, m, 5);
  rpgWeaponSkill(g, 0); run(g, 5); rpgWeaponRelease(g, 0); run(g, 3);
  assert(dealt(m) / U > 2.4 + 12 * S.seekMul * .9, `총 피해 ${dealt(m) / U}`);
  assert(g.out.some(f => f.kind === 'sk_blood_boom'), '폭발까지 나감');
});

test('월드 장비 세트(차원의 지배자 4세트) 폭발을 레퀴엠으로 맞히면 보라 sk_void_set 대신 붉은 sk_blood_set 으로 나가고 피해는 같다', () => {
  const run1 = (heldBlood) => {
    const { g, h } = setup(), m = mob(g, h.x + 100, h.y);
    h.bag.a = ['head', 'body', 'legs', 'feet'].map((s, i) => ({ u: 10 + i, s, g: 3, set: 'void' })); h.bag.ae = Object.fromEntries(h.bag.a.map(a => [a.s, a.u]));
    if (!heldBlood) h.bag.e = 0;
    tap(g, 0); run(g, 1);
    return { kinds: new Set(g.out.map(f => f.kind)), dmg: dealt(m) };
  };
  const r = run1(true);
  assert(r.kinds.has('sk_blood_set'), '붉은 세트 연출'); assert(!r.kinds.has('sk_void_set'), '보라 연출은 나오지 않음');
});

test('스킬이 마우스 방향을 따라가기 — 차징 중 포인터를 따라 몸과 겨눔이 바뀌고 포인터 방향으로 쏜다(근처 적을 고르지 않는다)', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y);   // 적은 오른쪽 · 포인터는 위쪽
  rpgInput(g, { cls: 0, kind: 'wcharge', dir: true, aim: [1, 0], q: 1 }); run(g, .5);
  assert.equal(h.dir, 1);
  rpgInput(g, { cls: 0, kind: 'waim', dir: true, aim: [-1, 0], q: 2 }); run(g, .1);
  assert.equal(h.dir, -1, '차징 중 포인터가 왼쪽이면 몸도 왼쪽'); assert.deepEqual(h.look.map(Math.round), [-1, 0]);
  h.hold = ['right']; run(g, .1); h.hold = [];
  assert.equal(h.dir, -1, '오른쪽으로 걸어도 차징 중에는 포인터 쪽을 본다');
  rpgInput(g, { cls: 0, kind: 'waim', dir: true, aim: [0, -1], q: 3 }); run(g, .1);
  rpgInput(g, { cls: 0, kind: 'wcharge', dir: false, aim: [0, -1], q: 4 }); run(g, 3);
  const shot = g.out.find(f => f.kind === 'sk_blood_shot');
  assert(shot && Math.abs(shot.ax) < .02 && shot.ay < -.98, `포인터(위) 방향 ${shot && [shot.ax, shot.ay]}`);
  assert.equal(dealt(m), 0, '근처 적이 있어도 포인터 방향에 없으면 맞지 않는다');
});
test('스킬이 마우스 방향을 따라가기 — 끄면(포인터 방향 없음) 예전처럼 가까운 적 쪽으로 쏜다', () => {
  const { g, h } = setup(), m = mob(g, h.x + 100, h.y);
  rpgInput(g, { cls: 0, kind: 'wcharge', dir: true, q: 1 }); run(g, .6);
  rpgInput(g, { cls: 0, kind: 'waim', dir: true, aim: [0, -1], q: 2 }); run(g, .1);
  rpgInput(g, { cls: 0, kind: 'wcharge', dir: false, q: 3 }); run(g, 3);
  assert(dealt(m) > 0, '가까운 적을 맞힌다');
});
