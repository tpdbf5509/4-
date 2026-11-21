/* 히든 직업 Engineer 003(11월 17일, 격자 연습장에만) 전투 규칙 — 실제 게임 함수로 전력 · 설치물 · 스킬 배율 · 오버클럭 과열 · 무기 금지를 본다.
   node --test tools/engineer.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgApply, rpgPack, advArtPath } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { whyEquip } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { ENGINEER as EN, EN_PULSE as PU, EN_TURRET as TU, EN_DRONE as DR, EN_MAGNET as MG, EN_RAIL as RL, EN_MECH as MC, EN_OC as OC, EN_ORBIT as OB, EN_SLOTS } from '../src/game/engineerData.js';
import { unlockEngineer, dropEngineer, engineerOn, engineerView, unitCap, turretRange } from '../src/game/engineerJob.js';
import { hiddenHeld } from '../src/game/hiddenUnique.js';
import { KEY_ACTIONS } from '../src/game/keys.js';
import { ENGINEER_PX, ENGINEER_ICON, ENGINEER_PFX } from '../src/game/engineerPxData.js';
import { ENGINEER_CAP, ENGINEER_GROUND } from '../src/game/engineerArt.js';
import { GROUND_FX } from '../src/game/skillArt.js';
import { readFileSync, existsSync } from 'node:fs';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.02, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
function setup(lv = 200, tr = [0, 0, 0], map = SANDBOX.id) {
  const g = makeWorld(); g.out = []; g.test = 1; g.high = true; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'e0', name: '기계', hero: { name: '기계', job: 'archer', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '기계', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1 } }, 'e0');
  const h = g.heroes[0];
  h.map = map; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  unlockEngineer(h, { lv, tr: tr.map(l => [l, 0]) });
  step(g, .01);
  h.cd = 0;
  return { g, h };
}
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const use = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
const full = (h) => { h.en.power = EN.power; };
// 기준 — 펄스 발진(×2.0) 한 발 피해
function unit() { const { g, h } = setup(); const m = mob(g, h.x + 200, h.y); fire(g, true); step(g, .01); fire(g, false); run(g, .4); return (HP - m.hp) / PU.mul; }
const U = unit();

test('실제 게임에 열림(11월 19일 사용자 지시) — 사냥터에서도 켜지고 장부 보유자로 적힌다 · 키 설정 창에 따로 칸은 없다', () => {
  assert.equal(EN.live, true);
  const { h } = setup(200, [0, 0, 0], 'field');
  assert.ok(engineerOn(h), '사냥터에서도 켜진다');
  assert.deepEqual(hiddenHeld(h), ['engineer'], '히든 직업 유일 규칙 보유자');
  assert.ok(!KEY_ACTIONS.some(a => /engineer|엔지니어/i.test(a.id + a.name)), '키 설정 창에 드러나지 않는다');
  assert.ok(EN_SLOTS.every(q => KEY_ACTIONS.some(a => a.id === q.act)), '기존 행동 키를 그대로 쓴다');
});

test('켜면 무기를 내려놓고(지우지 않는다) 무기 · 일반 스킬 입력을 받지 않는다 · 끄면 직업 레벨은 남는다', () => {
  const { g, h } = setup(37);
  assert.ok(engineerOn(h));
  assert.equal(h.bag.e, 0); assert.equal(h.bag.w.length, 1);
  assert.ok(whyEquip(h, 1).some(t => t.includes('무기를 들 수 없습니다')));
  const m = mob(g, h.x + 150, h.y);
  rpgInput(g, { cls: 0, kind: 'skill' }); rpgInput(g, { cls: 0, kind: 'wskill' }); run(g, 1);
  assert.equal(m.hp, HP);
  dropEngineer(h);
  assert.ok(!engineerOn(h));
  assert.equal(h.bag.hj.jobs.engineer.lv, 37);
});

test('펄스 발진 — ×2.0 · 맞히면 전력 +6 · 간격 0.45초', () => {
  const { g, h } = setup();
  h.en.power = 50;
  const m = mob(g, h.x + 200, h.y);
  fire(g, true); step(g, .01); fire(g, false); run(g, .3);
  near(HP - m.hp, U * PU.mul);
  assert.ok(h.en.power >= 56 && h.en.power < 58, `전력 ${h.en.power}`);
  assert.ok(Math.abs(h.cd) < 0.5 && PU.gap === 0.45);
});

test('센트리 터렛 — 전력 25 · 1.2초마다 ×3.0 · 12초 · 최대 10번 · 동시 2기(연마 50 → 3기)', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 300, h.y);
  const p0 = h.en.power;
  use(g, 'turret', [h.x + 100, h.y]);
  assert.equal(h.en.power, p0 - TU.cost);
  assert.equal(h.en.units.length, 1);
  run(g, TU.dur + 0.2);
  assert.equal(h.en.units.length, 0, '12초 뒤 사라진다');
  near(HP - m.hp, U * TU.mul * TU.shots, 0.03, '10번');
  const r = setup();
  for (let i = 0; i < 3; i++) { r.h.en.cd.turret = 0; full(r.h); use(r.g, 'turret', [r.h.x + 100 + i * 30, r.h.y]); }
  assert.equal(r.h.en.units.length, TU.max, '세 번째는 가장 오래된 것을 바꾼다');
  const q = setup(200, [50, 0, 0]);
  for (let i = 0; i < 3; i++) { q.h.en.cd.turret = 0; full(q.h); use(q.g, 'turret', [q.h.x + 100 + i * 30, q.h.y]); }
  assert.equal(q.h.en.units.length, TU.max50);
  assert.equal(unitCap({ tr: [[50, 0], [0, 0], [0, 0]] }), EN.units50);
  near(turretRange({ tr: [[25, 0], [0, 0], [0, 0]] }), TU.range * 1.15);
});

test('센트리 터렛 작은 레일포(11월 21일 사용자) — 겨눈 적 뒤 같은 줄의 적도 관통 · 줄 밖은 맞지 않는다', () => {
  const { g, h } = setup();
  const a = mob(g, h.x + 250, h.y), b = mob(g, h.x + 450, h.y), off = mob(g, h.x + 350, h.y + 120);
  use(g, 'turret', [h.x + 100, h.y]);
  run(g, TU.ready + 0.05);
  near(HP - a.hp, U * TU.mul, 0.03, '앞 적');
  near(HP - b.hp, U * TU.mul, 0.03, '뒤 적(관통)');
  assert.equal(off.hp, HP, '줄 밖');
});

test('지원 드론 — 두 기 · 1초마다 ×2.0(드론 연마 50 → ×3) · 10초 · 시전자를 따라온다', () => {
  for (const [tr, mul] of [[[0, 0, 0], DR.mul], [[0, 50, 0], DR.mul50]]) {
    const { g, h } = setup(200, tr);
    const m = mob(g, h.x + 200, h.y);
    use(g, 'drone');
    assert.equal(h.en.units.filter(u => u.k === 'drone').length, 2);
    run(g, DR.dur + 0.3);
    near(HP - m.hp, U * mul * DR.shots * 2, 0.03, `드론 연마 ${tr[1]}`);
  }
  const { g, h } = setup();
  use(g, 'drone'); h.x += 300; run(g, 2);
  assert.ok(h.en.units.every(u => Math.abs(u.x - h.x) < 160), '시전자 곁으로 따라온다');
});

test('설치물 합계 5기 — 넘치면 가장 오래된 것부터 바꾼다', () => {
  const { g, h } = setup();
  use(g, 'turret', [h.x + 100, h.y]); h.en.cd.turret = 0; full(h);
  use(g, 'turret', [h.x + 140, h.y]); full(h);
  use(g, 'drone'); full(h);
  use(g, 'mech'); full(h);
  assert.equal(h.en.units.length, 5);
  h.en.cd.drone = 0; use(g, 'drone');
  assert.ok(h.en.units.length <= unitCap(h.bag.hj.jobs.engineer));
});

test('자기장 포획 · 직선 레일포 — ×10 + 일반 몹 속박 · 0.25초 예고 뒤 ×25 관통(오버클럭 중 +40%)', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 300, h.y, { stun: 0 });
  use(g, 'magnet', [m.x, m.y]); run(g, MG.hit - 0.05);
  assert.equal(m.hp, HP, '0.30초 전에는 맞지 않는다');
  run(g, 0.1);
  near(HP - m.hp, U * MG.mul);
  assert.ok(m.bind > 0, '속박');
  ({ g, h } = setup());
  const a = mob(g, h.x + 200, h.y), b = mob(g, h.x + 500, h.y);
  use(g, 'rail', [h.x + 600, h.y]); run(g, RL.warn - 0.05);
  assert.equal(a.hp, HP);
  run(g, 0.1);
  near(HP - a.hp, U * RL.mul); near(HP - b.hp, U * RL.mul, 0.02, '관통');
  ({ g, h } = setup());
  const c = mob(g, h.x + 200, h.y);
  use(g, 'oc'); full(h); use(g, 'rail', [h.x + 600, h.y]); run(g, 0.3);
  near(HP - c.hp, U * RL.mul * (1 + RL.ocDmg));
});

test('강철 수호자 — 다가가 1.5초마다 ×6 · 끝날 때 ×20 폭발', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 400, h.y);
  use(g, 'mech');
  run(g, MC.dur + 0.2);
  assert.equal(h.en.units.length, 0);
  const got = (HP - m.hp) / U;
  assert.ok(got >= MC.mul * 8 + MC.endMul - 0.5 && got <= MC.mul * MC.hits + MC.endMul + 0.5, `수호자 배율 ${got}`);
});

test('오버클럭 — 기계 공격 2배 빠름 · 과열 초당 12(동기화 50 → 8) · 100 이면 꺼지고 3초 잠김', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 300, h.y);
  use(g, 'turret', [h.x + 100, h.y]); full(h);
  use(g, 'oc');
  run(g, 4);
  near(HP - m.hp, U * TU.mul * 7, 0.05, '0.3초 뒤부터 0.6초마다');
  near(h.en.heat, OC.heat * 4, 0.05, '과열');
  h.en.heat = 99; run(g, 0.2);
  assert.equal(h.en.oc, 0, '과열 100 이면 꺼진다');
  assert.ok(h.en.lock > 2.5);
  h.en.cd.oc = 0; full(h); use(g, 'oc');
  assert.equal(h.en.oc, 0, '잠긴 동안은 다시 켜지 않는다');
  const s = setup(200, [0, 0, 50]);
  use(s.g, 'oc'); run(s.g, 2);
  near(s.h.en.heat, OC.heat50 * 2, 0.05);
});

test('궤도 섬멸 명령 — 궁극기 · 5번 ×15 + 최종 ×110 · 설치물 1기당 +10%(최대 +50%)', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 300, h.y);
  use(g, 'orbit', [m.x, m.y]); run(g, OB.end + 0.1);
  near(HP - m.hp, U * (OB.n * OB.mul + OB.endMul));
  ({ g, h } = setup(200, [50, 0, 0]));
  for (let i = 0; i < 3; i++) { h.en.cd.turret = 0; full(h); use(g, 'turret', [h.x - 300 - i * 20, h.y - 200]); }
  full(h); use(g, 'drone'); full(h); use(g, 'mech');
  assert.equal(h.en.units.length, 6);
  m = mob(g, h.x + 600, h.y + 300);
  for (const u of h.en.units) u.n = 99;   // 기계 피해를 빼고 본다
  use(g, 'orbit', [m.x, m.y]); run(g, OB.end + 0.1);
  near(HP - m.hp, U * (OB.n * OB.mul + OB.endMul * 1.5), 0.03, '최대 +50%');
});

test('전력이 모자라면 쓰지 않는다 · 자연 회복 초당 2 · 잠긴 스킬은 레벨을 알려 준다', () => {
  const { g, h } = setup(60);
  h.en.power = 10; use(g, 'turret');
  assert.equal(h.en.units.length, 0);
  run(g, 2);
  near(h.en.power, 14, 0.03);
  full(h); use(g, 'mech');
  assert.equal(h.en.units.length, 0, '직업 레벨 100 전에는 잠김');
  assert.ok(g.fx.some(f => f.text && f.text.includes('직업 레벨 100')));
});

test('쓰러지면 · 맵을 옮기면 설치물을 걷는다 · 스냅샷 줄 58 로 손님 화면이 같은 값을 본다', () => {
  const { g, h } = setup();
  use(g, 'turret', [h.x + 100, h.y]); full(h); use(g, 'drone');
  const snap = rpgPack(g);
  const row = snap.h[0];
  assert.ok(Array.isArray(row[58]) && row[58][8].length === 3);
  const guest = makeWorld();
  rpgSyncSeats(guest, [{ id: 'e0', name: '기계', hero: { name: '기계', job: 'archer', gender: 'm' } }]);
  rpgApply(guest, snap);
  const v = engineerView(guest.heroes[0]);
  assert.equal(v.units.length, 3); assert.equal(v.lv, 200);
  h.down = 0; h.map = 'field'; run(g, 0.05); h.map = SANDBOX.id;
  assert.equal((h.en ? h.en.units : []).length, 0, '맵을 옮기면 사라진다');
});

test('그림 규격 — 시트 · 아이콘 · 연출 덜어내기 · 바닥 연출 목록', () => {
  const man = JSON.parse(readFileSync(new URL('../design/effects/engineer/manifest.json', import.meta.url)));
  assert.deepEqual(ENGINEER_PX, man, 'make.py 가 낸 규격과 같다');
  const pf = JSON.parse(readFileSync(new URL('../design/effects/pixelfx/engineer/manifest.json', import.meta.url)));
  assert.deepEqual(ENGINEER_PFX, pf, 'pixelfx 빛 연출 시트 — pack.py 가 낸 규격과 같다');
  for (const [k, T] of Object.entries(ENGINEER_PX)) {
    const path = new URL(`../public/assets/game/rpg/effects/hidden-jobs/engineer/px/${k}.webp`, import.meta.url);
    assert.ok(existsSync(path), k);
    // 무손실 WebP 헤더의 실제 크기를 확인한다. 메타데이터만 맞고 옛 시트가 남는 경우를 잡는다.
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8L', k);
    assert.equal(bytes[20], 0x2f, k);
    const size = bytes.readUInt32LE(21);
    assert.equal((size & 0x3fff) + 1, T.w * T.cols, `${k} 가로`);
    assert.equal(((size >>> 14) & 0x3fff) + 1, T.h * Math.ceil(T.n / T.cols) * (T.rows || 1), `${k} 세로`);
  }
  assert.equal(Object.keys(ENGINEER_ICON).length, ENGINEER_PX.en_icons.n);
  assert.ok(Object.keys(ENGINEER_CAP).every(k => k.startsWith('sk_en_')));
  assert.ok([...ENGINEER_GROUND].every(k => GROUND_FX.has(k)));
});

test('외형 — 남 · 여 사용자 그림을 따로 쓴다(서 있는 그림 · 걷는 그림 4장)', () => {
  const { h } = setup();
  for (const gd of ['m', 'f']) {
    h.gender = gd;
    assert.equal(advArtPath(h, 'front'), `/assets/characters/rpg/engineer-${gd}/front.webp`);
    for (const v of ['front', 'back', 'side', 'turn']) for (const s of ['', '-bare']) assert.ok(existsSync(`public/assets/characters/rpg/engineer-${gd}/${v}${s}.webp`), `${gd} ${v}${s}`);
    for (const v of ['front', 'back', 'side']) for (let i = 0; i < 4; i++) assert.ok(existsSync(`public/assets/characters/rpg/engineer-${gd}/walk-${v}-${i}.webp`), `${gd} walk ${v} ${i}`);
  }
  assert.match(readFileSync('src/game/rpgArt.js', 'utf8'), /engineer-\[mf\]/, '걷는 그림을 쓴다');
  assert.notDeepEqual(readFileSync('public/assets/characters/rpg/engineer-m/front.webp'), readFileSync('public/assets/characters/rpg/engineer-f/front.webp'), '남녀 그림이 다르다');
});

test('밀도 보강 — 작은 입자 시트(en_bits)와 그리기 상한', async () => {
  assert.ok(ENGINEER_PX.en_bits && ENGINEER_PX.en_bits.rows === 6, '입자 다섯 종류 + 전류 줄기');
  assert.ok(existsSync('public/assets/game/rpg/effects/hidden-jobs/engineer/px/en_bits.webp'));
  const { EN_BITS } = await import('../src/game/engineerArt.js');
  assert.ok(EN_BITS.perFx > 0 && EN_BITS.perFx <= 64 && EN_BITS.perFrame <= 400, '입자 수 상한');
});
