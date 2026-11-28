/* 히든 직업 Wyvern Knight 006(11월 17일, 격자 연습장에만) 전투 규칙 — 실제 게임 함수로 용혈 · 와이번 · 스킬 배율 · 역린 해방 · 무기 금지를 본다.
   node --test tools/wyvern.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgSandboxHit, rpgPack, rpgApply, advArtPath } from '../src/game/rpg.js';
import { rpgAdminCmd } from '../src/game/adminCmd.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { whyEquip, cleanBag } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { WYVERN as WV, WY_BLOOD as BL, WY_CLAW as CL, WY_CONTRACT as CT, WY_ROAR as RO, WY_DIVE as DV, WY_SCALE as SC, WY_SKY as SK, WY_AWAKE as AW,
  WY_ULT as UL, WY_ASSAULT as AS, WY_ARCADION as AR, WY_SLOTS, WY_BITS, WY_WEAPON_ITEM } from '../src/game/wyvernData.js';
import { SPECIALS } from '../src/game/shopData.js';
import { unlockWyvern, dropWyvern, wyvernOn, wyvernView, diveR, wyvernTake, wyvernLook, packWyvern } from '../src/game/wyvernJob.js';
import { hiddenHeld } from '../src/game/hiddenUnique.js';
import { KEY_ACTIONS } from '../src/game/keys.js';
import { hiddenSkillInfo, HIDDEN_SKILL_JOBS } from '../src/game/hiddenSkillInfo.js';
import { readFileSync, existsSync } from 'node:fs';
import { WYVERN_PX, WYVERN_ICON } from '../src/game/wyvernPxData.js';
import { WYVERN_CAP, WYVERN_GROUND } from '../src/game/wyvernArt.js';
import { GROUND_FX } from '../src/game/skillArt.js';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.02, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function setup(lv = 200, tr = [0, 0, 0], map = SANDBOX.id) {
  const g = makeWorld(); g.out = []; g.test = 1; g.high = true; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'w0', name: '용기사', hero: { name: '용기사', job: 'warrior', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '용기사', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, t: 'sword', r: 0, g: 0, p: 0 }], e: 1 } }, 'w0');
  const h = g.heroes[0];
  h.map = map; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  unlockWyvern(h, { lv, tr: tr.map(l => [l, 0]) });
  step(g, .01);
  h.cd = 0;
  return { g, h };
}
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const use = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g) => { rpgInput(g, { cls: 0, kind: 'fire', dir: true }); step(g, .01); rpgInput(g, { cls: 0, kind: 'fire', dir: false }); };
const full = (h) => { h.wy.blood = WV.blood; };
// 기준 — 용조격(×2.5) 한 번 피해
function unit() { const { g, h } = setup(); const m = mob(g, h.x + 100, h.y); fire(g); run(g, .3); return (HP - m.hp) / CL.mul; }
const U = unit();

test('실제 게임에 이었다(11월 24일 — 관리자 명령어로만) · 키는 기존 행동 키를 빌린다', () => {
  assert.equal(WV.live, true);
  const { h } = setup(200, [0, 0, 0], 'field');
  assert.ok(wyvernOn(h)); assert.ok(wyvernView(h));
  assert.deepEqual(hiddenHeld(h), ['wyvern'], '유일 규칙 장부에 적힌다');
  assert.ok(!KEY_ACTIONS.some(a => /wyvern|와이번/i.test(a.id + a.name)), '키 설정 창에 따로 칸이 없다');
  assert.ok(WY_SLOTS.every(q => KEY_ACTIONS.some(a => a.id === q.act)), '기존 행동 키를 그대로 쓴다');
  assert.equal(new Set(WY_SLOTS.map(q => q.act)).size, WY_SLOTS.length, '키 칸이 겹치지 않는다');
});

test('스냅샷 줄 65 — 손님 화면이 용혈 · 대기 · 와이번 · 해방을 받고 와이번 그림을 쓴다. 이 직업이 아니면 0', () => {
  const { g, h } = setup(200, [0, 0, 0], 'field');
  h.x = 1500; h.y = 700; run(g, .1); full(h); use(g, 'contract'); run(g, .5);
  const snap = rpgPack(g), row = snap.h[0];
  assert.equal(row.length, 67); assert.ok(Array.isArray(row[65]));
  const guest = makeWorld(); rpgApply(guest, snap);
  const q = guest.heroes[0], v = wyvernView(q), hv = wyvernView(h);
  assert.ok(q.wyv && wyvernLook(q));
  assert.equal(v.blood, hv.blood); assert.ok(v.u && Math.abs(v.u.x - hv.u.x) < 1); assert.equal(v.cd.contract, hv.cd.contract); assert.equal(v.cdMax.contract, CT.cd);
  assert.match(advArtPath(q, 'front'), /\/wyvern-[mf]\/front\.webp$/);
  q.map = 'field'; rpgStep(guest, .02); assert.equal(q.wyv, null, '판정을 맡으면 스냅샷 값을 버린다');
  dropWyvern(h); rpgApply(guest, rpgPack(g)); assert.equal(packWyvern(h), 0); assert.equal(guest.heroes[0].wyv, null);
});

test('관리자 명령어 /와이번나이트 — 켜기 · 직업 레벨 · 연마 · 끄기 · 아르카디온은 주지 않는다', () => {
  const { g, h } = setup(); dropWyvern(h); h.map = 'field';
  rpgAdminCmd(g, 0, '/와이번나이트 나'); assert.ok(!wyvernOn(h), '관리자만');
  h.admin = 1; h.advClass = 'ranger';
  assert.equal(rpgAdminCmd(g, 0, '/와이번나이트 나'), true);
  assert.ok(wyvernOn(h)); assert.equal(h.advClass, ''); assert.equal(h.bag.e, 0);
  assert.ok(!h.bag.w.some(w => w.sp === 'wy_arcadion'), 'hold 무기는 자동으로 주지 않는다');
  rpgAdminCmd(g, 0, '/와이번나이트 나 아르카디온');
  const aw = h.bag.w.filter(w => w.sp === 'wy_arcadion'); assert.equal(aw.length, 1); assert.equal(h.bag.e, aw[0].u, '받고 바로 든다');
  rpgAdminCmd(g, 0, '/와이번나이트 나 아르카디온'); assert.equal(h.bag.w.filter(w => w.sp === 'wy_arcadion').length, 1, '두 번 줘도 하나');
  assert.equal(whyEquip(h, aw[0].u).length, 0);
  rpgAdminCmd(g, 0, '/와이번나이트 나 150'); assert.equal(h.bag.hj.jobs.wyvern.lv, 150);
  rpgAdminCmd(g, 0, '/와이번 나 연마 50'); assert.deepEqual(h.bag.hj.jobs.wyvern.tr, [[50, 0], [50, 0], [50, 0]]); assert.equal(h.bag.hj.jobs.wyvern.lv, 150);
  rpgAdminCmd(g, 0, '/와이번나이트 나 끄기'); assert.ok(!wyvernOn(h)); assert.equal(h.bag.hj.jobs.wyvern.lv, 150, '끈 뒤에도 기록은 남는다');
  rpgAdminCmd(g, 0, '/와이번나이트 나'); assert.ok(wyvernOn(h));
  assert.deepEqual(cleanBag(JSON.parse(JSON.stringify(h.bag))).hj.jobs.wyvern, h.bag.hj.jobs.wyvern, '저장 때 직업 칸이 남는다');
  const before = g.out.length; rpgAdminCmd(g, 0, '/도움');
  assert.ok(JSON.stringify(g.out.slice(before)).includes('/와이번나이트'), '/도움 목록에 나온다');
});

test('켜면 다른 무기를 내려놓고 아르카디온만 든다 · 무기 · 일반 스킬 입력을 받지 않는다 · 끄면 직업 레벨은 남는다', () => {
  const { g, h } = setup(37);
  assert.ok(wyvernOn(h)); assert.equal(h.bag.e, 0); assert.equal(h.bag.w.length, 1);
  assert.ok(whyEquip(h, 1).some(t => t.includes('아르카디온만 들 수 있습니다')));
  h.bag.w.push({ u: 2, sp: WY_WEAPON_ITEM.id, p: 0 });
  assert.deepEqual(whyEquip(h, 2), [], '아르카디온은 든다');
  // 전용 무기 — 상점 · 상자 · 관리자 목록에 없다(hold · hj)
  const sp = SPECIALS.find(q => q.id === WY_WEAPON_ITEM.id);
  assert.ok(sp && sp.hold && sp.hj === 'wyvern');
  assert.match(readFileSync('src/game/adminCmd.js', 'utf8'), /SPECIALS\.filter\(\(sp\) => !sp\.hj\)/);
  assert.ok(existsSync('public/assets/game/rpg/weapons/wy_arcadion.webp'), '가방 그림');
  const m = mob(g, h.x + 100, h.y);
  rpgInput(g, { cls: 0, kind: 'skill' }); rpgInput(g, { cls: 0, kind: 'wskill' }); run(g, 1);
  assert.equal(m.hp, HP);
  dropWyvern(h);
  assert.ok(!wyvernOn(h)); assert.equal(h.bag.hj.jobs.wyvern.lv, 37);
});

test('용조격 — ×2.5 · 앞 부채꼴 95°(등 뒤는 맞지 않는다) · 맞히면 용혈 +6 · 처음 용혈 0', () => {
  const { g, h } = setup();
  assert.equal(h.wy.blood, 0);
  const a = mob(g, h.x + 100, h.y), b = mob(g, h.x - 100, h.y);
  fire(g); run(g, .3);
  near(HP - a.hp, U * CL.mul);
  assert.equal(b.hp, HP, '등 뒤');
  assert.equal(h.wy.blood, BL.claw);
  assert.equal(CL.gap, 0.55);
});

test('비룡의 계약 — 용혈 30 · 한 마리만 · 1.5초마다 ×3.0 · 맞히면 용혈 +2 · 30초 뒤 사라지고 그때부터 15초 대기', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 200, h.y);
  h.wy.blood = 19; use(g, 'contract'); step(g, .01);   // 200레벨은 30 → 20(11월 28일 소모 감소)
  assert.equal(h.wy.u, null, '20 아래면 못 쓴다');
  h.wy.blood = 20; use(g, 'contract'); step(g, .01);
  assert.ok(h.wy.u); assert.equal(h.wy.blood, 0);
  h.wy.blood = 60; use(g, 'contract'); step(g, .01);
  assert.equal(h.wy.blood, 60, '이미 있으면 다시 부르지 않는다');
  run(g, CT.appear + 3.6);   // 0.45 · 1.95 · 3.45 세 번(날아가는 0.3초)
  near(HP - m.hp, U * CT.mul * 3, 0.02, '자동 공격 세 번');
  assert.equal(h.wy.blood, 60 + BL.wyvern * 3);
  // 따라온다 — 멀리 가면 주인 뒤로 다시 놓는다
  h.x += 1000; step(g, .02);
  assert.ok(Math.abs(h.wy.u.x - h.x) <= CT.back[1] + 10, `재배치 ${h.wy.u.x} ${h.x}`);
  run(g, CT.dur);
  assert.equal(h.wy.u, null);
  assert.ok(h.wy.cd.contract > CT.cd - 5 && h.wy.cd.contract <= CT.cd, `대기 ${h.wy.cd.contract}`);
});

test('조련 연마 — 25 자동 공격 ×4 · 50 유지 40초', () => {
  const { g, h } = setup(200, [50, 0, 0]);
  const m = mob(g, h.x + 200, h.y);
  full(h); use(g, 'contract'); run(g, CT.appear + 0.5);
  near(HP - m.hp, U * CT.mul25);
  assert.equal(h.wy.u.dur, CT.dur50);
});

test('용염 포효 — 5번 ×3.0 · 용혈 +10 한 번 · 와이번이 있으면 두 번째 갈래 ×8 한 번', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 200, h.y);
  h.wy.blood = 10; use(g, 'roar'); run(g, 1.2);   // 200레벨은 15 → 10
  near(HP - m.hp, U * RO.mul * RO.n);
  assert.equal(h.wy.blood, BL.roar);
  ({ g, h } = setup());
  full(h); use(g, 'contract'); run(g, .2);   // 와이번이 첫 공격 전(0.45초)
  m = mob(g, h.x + 150, h.y);
  h.wy.u.cd = 99; full(h); use(g, 'roar'); run(g, 1.2);
  near(HP - m.hp, U * (RO.mul * RO.n + RO.sub.mul), 0.02, '두 번째 갈래');
});

test('비룡 급강하 — 520 안으로 착지 · 반경 220 ×26 · 와이번 동행 ×39(용혈 더 안 씀) · 역린 중 추가 폭발 ×10 · 천공 50 날개 폭풍 ×12', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 400, h.y);
  h.wy.blood = 30; use(g, 'dive'); run(g, 1);
  near(HP - m.hp, U * DV.mul);
  assert.ok(Math.abs(h.x - m.x) < 2, `착지 ${h.x}`);
  ({ g, h } = setup());
  full(h); use(g, 'contract'); run(g, .2); h.wy.u.cd = 99;
  m = mob(g, h.x + 400, h.y);
  h.wy.blood = 20; use(g, 'dive'); run(g, 1);   // 200레벨은 30 → 20
  near(HP - m.hp, U * DV.mulJoint, 0.02, '합동');
  assert.equal(h.wy.blood, 0, '합동이어도 한 번 값만');
  ({ g, h } = setup(200, [0, 0, 50]));
  m = mob(g, h.x + 400, h.y);
  full(h); use(g, 'contract'); run(g, .05); full(h); use(g, 'awake'); run(g, .1); full(h);
  use(g, 'dive'); run(g, 1);
  near(HP - m.hp, U * (DV.mul + DV.extraMul + DV.stormMul) * (1 + AW.dmg), 0.02, '추가 폭발 · 날개 폭풍');
  assert.equal(diveR(h.bag.hj.jobs.wyvern), DV.r * 1.2);
  // 너무 멀면 520 까지만
  ({ g, h } = setup());
  full(h); use(g, 'dive', [h.x + 2000, h.y]); run(g, 1);
  assert.ok(Math.abs(h.x - 900 - DV.reach) < 3, `최대 거리 ${h.x}`);
});

test('용린 수호 — 6초 PvE 피해 35% 감소 · 반격 최대 2번 ×5', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 150, h.y);
  full(h); use(g, 'scale'); step(g, .01);
  assert.ok(h.wy.sc, '켜져 있다');
  const E = { near: () => [m], alive: () => true, squash: 0.78, strike: (gg, hh, o, d) => { o.hp -= d; }, basic: () => {}, dummy: () => false, fx: () => {} };
  const before = m.hp;
  assert.equal(wyvernTake(E, g, h, 100, {}), 65);
  assert.ok(m.hp < before, '반격');
  h.wy.sc.gap = 0; wyvernTake(E, g, h, 100, {}); h.wy.sc.gap = 0;
  const after2 = m.hp; wyvernTake(E, g, h, 100, {});
  assert.equal(m.hp, after2, '세 번째는 반격하지 않는다');
  assert.equal(wyvernTake(E, g, h, 100, { hero: {} }), 100, '사람에게 받은 피해는 그대로');
});

test('천공 지배 — 6번 ×7(합 ×42) · 역린 중 10번 · 영역 안 적을 따라 떨어진다', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 300, h.y + 60);
  h.wy.blood = 40; use(g, 'sky', [h.x + 200, h.y]); run(g, 2.4);
  near(HP - m.hp, U * SK.mul * SK.n);
  ({ g, h } = setup());
  m = mob(g, h.x + 300, h.y);
  full(h); use(g, 'contract'); run(g, .05); full(h); use(g, 'awake'); run(g, .1); full(h);
  use(g, 'sky'); run(g, 2.4);
  near(HP - m.hp, U * SK.mul * SK.nAwake * (1 + AW.dmg));
});

test('역린 해방 — 용혈 소모 없음 · 15초(용혈 연마 50 → 20초) · 기술 +70% · 걷는 빠르기 +25% · 평타는 그대로', () => {
  let { g, h } = setup();
  h.wy.blood = 100; use(g, 'awake'); step(g, .01);
  assert.equal(h.wy.aw, 0, '와이번이 없으면 못 쓴다');
  assert.equal(h.wy.blood, 100, '용혈도 그대로');
  full(h); use(g, 'contract'); run(g, .05);
  h.wy.blood = 0; use(g, 'awake'); step(g, .01);
  assert.ok(h.wy.aw > 0, '용혈이 0 이어도 쓴다(11월 28일)');
  assert.equal(h.wy.blood, 0, '용혈을 쓰지 않는다'); assert.ok(h.wy.aw > AW.dur - 0.1 && h.wy.aw <= AW.dur);
  assert.equal(AW.cost, 0);
  assert.equal(h.wy.u, null, '와이번은 몸에 흡수된다');
  h.wy.cd.contract = 0; full(h); use(g, 'contract'); step(g, .01);
  assert.equal(h.wy.u, null, '해방 중엔 다시 부르지 않는다');
  const m = mob(g, h.x + 100, h.y);
  fire(g); run(g, .3);
  near(HP - m.hp, U * CL.mul, 0.02, '용조격은 그대로');
  h.hold = ['right']; const x0 = h.x; run(g, .5); const sp = h.x - x0; h.hold = [];
  run(g, AW.dur);
  assert.equal(h.wy.aw, 0);
  h.hold = ['right']; const x1 = h.x; run(g, .5); const sp2 = h.x - x1; h.hold = [];
  near(sp / sp2, 1 + AW.spd, 0.05, '빠르기');
  ({ g, h } = setup(200, [0, 50, 0]));
  full(h); use(g, 'contract'); run(g, .05); full(h); use(g, 'awake'); step(g, .01);
  assert.ok(h.wy.aw > AW.dur50 - 0.1);
});

test('종언의 용성 — 궁극기 · ×65 + 5 × ×15 + ×65 = ×205 · 역린 중 ×1.7(×348.5) · 진룡 동조 화염 균열 ×30 · 와이번 없이도 쓴다', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 400, h.y);
  use(g, 'ult'); run(g, 3);
  near(HP - m.hp, U * 205);
  assert.equal(UL.firstMul + UL.bMul * UL.n + UL.lastMul, 205);
  ({ g, h } = setup(200, [50, 50, 50]));
  m = mob(g, h.x + 400, h.y);
  full(h); use(g, 'contract'); run(g, .05); full(h); use(g, 'awake'); run(g, .1);
  use(g, 'ult'); run(g, 3);
  near(HP - m.hp, U * (205 + 30) * 1.7, 0.02, '진룡 동조 + 역린');
});

test('천공강습 · 아르카디온 — 1부 요약 두 기술(정한 수치) · 아르카디온을 들어야 X 기술', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 240, h.y);
  h.wy.blood = AS.cost; use(g, 'assault'); run(g, 1);
  near(HP - m.hp, U * AS.mul * AS.n);
  assert.ok(h.x > 900 + AS.len - 20, `돌진 ${h.x}`);
  ({ g, h } = setup());
  m = mob(g, h.x + 250, h.y);
  h.wy.blood = AR.cost; use(g, 'arcadion'); run(g, 1.2);
  assert.equal(m.hp, HP, '맨손이면 쓰지 못한다');
  assert.equal(h.wy.blood, AR.cost);
  h.bag.w.push({ u: 2, sp: WY_WEAPON_ITEM.id, p: 0 }); h.bag.e = 2;
  assert.equal(wyvernView(h).arm, 1);
  const base = (() => { const t = setup(); t.h.bag.w.push({ u: 2, sp: WY_WEAPON_ITEM.id, p: 0 }); t.h.bag.e = 2; const q = mob(t.g, t.h.x + 100, t.h.y); fire(t.g); run(t.g, .3); return (HP - q.hp) / CL.mul; })();
  ({ g, h } = setup()); h.bag.w.push({ u: 2, sp: WY_WEAPON_ITEM.id, p: 0 }); h.bag.e = 2;
  m = mob(g, h.x + 250, h.y);
  h.wy.blood = AR.cost; use(g, 'arcadion'); run(g, 0.05);
  assert.ok(wyvernView(h).sw, '대검을 휘두른다(그림 값)');
  run(g, 1.2);
  near(HP - m.hp, base * (AR.hits[0].mul + AR.hits[1].mul), 0.02, '든 무기 공격력이 기준 피해에 들어간다');
});

test('잠긴 스킬 · 용혈 부족은 쓰지 않는다 · 쓰러지면 용혈 0 · 와이번 정리', () => {
  const { g, h } = setup(20);
  const m = mob(g, h.x + 200, h.y);
  full(h); use(g, 'dive'); run(g, 1);
  assert.equal(m.hp, HP, '직업 레벨 30 전');
  assert.equal(h.wy.blood, 100);
  use(g, 'contract'); run(g, .1);
  assert.ok(h.wy.u);
  h.trn = null; h.hp = 1; h.inv = 0; rpgSandboxHit(g, 0, 0.3);
  assert.ok(h.down > 0, '쓰러짐');
  assert.equal(h.wy.blood, 0); assert.equal(h.wy.u, null);
});

test('스킬 설명 창 · 연습장 연결', () => {
  assert.ok(HIDDEN_SKILL_JOBS.includes('wyvern'));
  const info = hiddenSkillInfo('wyvern');
  assert.equal(info.skills.length, WY_SLOTS.length);
  assert.ok(info.skills.find(q => q.s === 'ult').ult);
  const sb = readFileSync('src/Sandbox.jsx', 'utf8');
  assert.match(sb, /WyvernBar/);
  assert.ok(!readFileSync('src/game/updates.js', 'utf8').includes('와이번'), '업데이트 노트에 적지 않는다');
  assert.ok(!readFileSync('src/game/bookData.js', 'utf8').includes('와이번 나이트'), '패치노트 책에 적지 않는다');
  assert.ok(WY_BITS.perFx > 0 && WY_BITS.perFx <= 64 && WY_BITS.perFrame <= 420, '입자 수 상한');
  assert.ok(existsSync('src/game/wyvernArt.js'));
});

test('그림 규격 — 시트 · 아이콘 · 연출 덜어내기 · 바닥 연출 목록', () => {
  const man = JSON.parse(readFileSync(new URL('../design/effects/wyvern/manifest.json', import.meta.url)));
  assert.deepEqual(WYVERN_PX, man, 'make.py 가 낸 규격과 같다');
  for (const [k, T] of Object.entries(WYVERN_PX)) {
    const path = new URL(`../public/assets/game/rpg/effects/hidden-jobs/wyvern/px/${k}.webp`, import.meta.url);
    assert.ok(existsSync(path), k);
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8L', k);
    const size = bytes.readUInt32LE(21);
    assert.equal((size & 0x3fff) + 1, T.w * T.cols, `${k} 가로`);
    assert.equal(((size >>> 14) & 0x3fff) + 1, T.h * Math.ceil(T.n / T.cols) * (T.rows || 1), `${k} 세로`);
  }
  assert.equal(Object.keys(WYVERN_ICON).length, WYVERN_PX.wy_icons.n);
  assert.ok(Object.keys(WYVERN_CAP).every(k => k.startsWith('sk_wy_')));
  assert.ok([...WYVERN_GROUND].every(k => GROUND_FX.has(k)));
});

test('용혈 소모 감소(11월 28일) — 직업 레벨 25 단위 8단계 · 최대 30% · 5 단위 · 해방 중 무소모 · 화면과 서버가 같은 함수', async () => {
  const { WY_COST_CUT, wyCost, wyCostCut, WY_SKILLS } = await import('../src/game/wyvernData.js');
  const eq = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m} ${a} ${b}`);
  assert.equal(WY_COST_CUT.steps.length, 8); eq(wyCostCut(24), 0, '24');
  WY_COST_CUT.steps.forEach((lv, i) => { eq(wyCostCut(lv), 0.0375 * (i + 1), `${lv}`); eq(wyCostCut(lv - 1), 0.0375 * i, `${lv - 1}`); });
  eq(wyCostCut(200), 0.3, '200');
  assert.equal(wyCost('contract', 24), 30); assert.equal(wyCost('contract', 200), 20); assert.equal(wyCost('sky', 200), 30);
  assert.equal(wyCost('roar', 200), 10); assert.equal(wyCost('roar', 25), 15);
  assert.equal(wyCost('awake', 200), 0); assert.equal(wyCost('ult', 200), 0);
  assert.equal(wyCost('sky', 200, true), 0, '해방 중');
  for (let lv = 1; lv <= 200; lv++) for (const k of Object.keys(WY_SKILLS)) {
    const n = WY_SKILLS[k].cost, c = wyCost(k, lv);
    if (!n) { assert.equal(c, 0); continue; }
    assert.ok(c >= 5 && c % 5 === 0 && c <= n, `${lv} ${k} ${c}`);
    if (lv < 200) assert.ok(wyCost(k, lv + 1) <= c);
  }
  // 판정 — 200레벨은 줄어든 값만 쓰고 모자라면 못 쓴다
  let { g, h } = setup(200);
  h.wy.blood = 19; use(g, 'contract'); step(g, .01); assert.equal(h.wy.u, null, '20 미만이면 못 쓴다');
  h.wy.blood = 20; use(g, 'contract'); step(g, .01); assert.ok(h.wy.u); assert.equal(h.wy.blood, 0);
  // 레벨 24 는 줄지 않는다
  ({ g, h } = setup(24));
  h.wy.blood = 29; use(g, 'contract'); step(g, .01); assert.equal(h.wy.u, null);
  // 해방 중 스킬은 용혈을 쓰지 않는다
  ({ g, h } = setup(200));
  full(h); use(g, 'contract'); run(g, .05); h.wy.blood = 0; use(g, 'awake'); step(g, .01); assert.ok(h.wy.aw > 0);
  h.wy.blood = 0; h.cd = 0; mob(g, h.x + 300, h.y);
  use(g, 'roar'); run(g, .1); assert.ok(h.wy.cd.roar > 0, '용혈 0 이어도 해방 중엔 쓴다');
  assert.ok(h.wy.blood >= 0);
});
