/* 히든 직업 Illusionist 005(11월 17일, 격자 연습장에만) 전투 규칙 — 실제 게임 함수로 트릭 · 연계 · 잔상 · 스킬 배율 · 무기 금지를 본다.
   node --test tools/illusion.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, MAPS } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { whyEquip } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { ILLUSION as IL, IL_TRICK as TK, IL_CARD as CD, IL_SHUFFLE as SH, IL_SLASH as SL, IL_PRISON as PR, IL_BLINK as BL, IL_FIST as FI, IL_MIRROR as MR, IL_FINAL as FN, IL_SLOTS } from '../src/game/illusionData.js';
import { unlockIllusion, dropIllusion, illusionOn, illusionView, illusionDown } from '../src/game/illusionJob.js';
import { hiddenHeld } from '../src/game/hiddenUnique.js';
import { KEY_ACTIONS } from '../src/game/keys.js';
import { hiddenSkillInfo } from '../src/game/hiddenSkillInfo.js';
import { readFileSync, existsSync } from 'node:fs';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.02, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
function setup(lv = 200, tr = [0, 0, 0], map = SANDBOX.id) {
  const g = makeWorld(); g.out = []; g.test = 1; g.high = true; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'i0', name: '마술', hero: { name: '마술', job: 'archer', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '마술', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, t: 'bow', r: 0, g: 0, p: 0 }], e: 1 } }, 'i0');
  const h = g.heroes[0];
  h.map = map; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  unlockIllusion(h, { lv, tr: tr.map(l => [l, 0]) });
  step(g, .01);
  h.cd = 0;
  return { g, h };
}
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const use = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
// 기준 — 절단 카드(×2.0) 한 장 피해
function unit() { const { g, h } = setup(); const m = mob(g, h.x + 200, h.y); fire(g, true); step(g, .01); fire(g, false); run(g, .4); return (HP - m.hp) / CD.mul; }
const U = unit();
const dmg = (m) => (HP - m.hp) / U;

test('연습장 맵에서만 켜진다 — 실제 게임 · 획득 방법 · 키 설정 창에 드러나지 않는다', () => {
  assert.equal(IL.live, false);
  const { g, h } = setup(200, [0, 0, 0], 'field');
  assert.ok(!illusionOn(h), '사냥터에서는 꺼져 있다');
  assert.equal(illusionView(h), null);
  const m = mob(g, h.x + 200, h.y, { map: 'field' });
  use(g, 'fist'); run(g, .8);
  assert.equal(m.hp, HP);
  assert.deepEqual(hiddenHeld(h), [], '유일 규칙 장부에 적히지 않는다');
  assert.ok(!KEY_ACTIONS.some(a => /illusion|마술/i.test(a.id + a.name)));
  assert.ok(IL_SLOTS.every(q => KEY_ACTIONS.some(a => a.id === q.act)), '기존 행동 키를 빌린다');
  const notes = readFileSync('src/game/updates.js', 'utf8') + readFileSync('src/game/bookData.js', 'utf8');
  assert.ok(!/Illusionist|마술사/.test(notes), '업데이트 노트 · 패치노트 책에 적지 않는다');
});

test('켜면 무기를 내려놓고(지우지 않는다) 무기 · 일반 스킬 입력을 받지 않는다 · 끄면 직업 레벨은 남는다', () => {
  const { g, h } = setup(37);
  assert.ok(illusionOn(h));
  assert.equal(h.bag.e, 0); assert.equal(h.bag.w.length, 1);
  assert.ok(whyEquip(h, 1).some(t => t.includes('무기를 들 수 없습니다')));
  const m = mob(g, h.x + 150, h.y);
  rpgInput(g, { cls: 0, kind: 'skill' }); rpgInput(g, { cls: 0, kind: 'wskill' }); run(g, 1);
  assert.equal(m.hp, HP);
  dropIllusion(h);
  assert.ok(!illusionOn(h));
  assert.equal(h.bag.hj.jobs.illusionist.lv, 37);
});

test('절단 카드 — ×2.0 · 맞히면 트릭 +1 · 최대 5 · 간격 0.5초', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 300, h.y);
  for (let i = 0; i < 7; i++) { h.cd = 0; fire(g, true); step(g, .01); fire(g, false); run(g, .4); }
  near(dmg(m), CD.mul * 7);
  assert.equal(h.il.trick, TK.max);
  assert.equal(CD.gap, 0.5);
});

test('폭렬 셔플 — 카드 5장 ×3 + 0.70초 폭발 ×6(합 ×21) · 카드 연마 25 → 7장', () => {
  for (const [tr, n] of [[0, 5], [25, 7]]) {
    const { g, h } = setup(200, [tr, 0, 0]);
    const m = mob(g, h.x + 300, h.y);
    use(g, 'shuffle', [m.x, m.y]);
    run(g, SH.end - 0.02);
    near(dmg(m), SH.mul * n, 0.02, '폭발 전');
    run(g, 0.1);
    near(dmg(m), SH.mul * n + SH.endMul, 0.02, `카드 ${n}장`);
  }
});

test('덱 슬래시 — 두 번 전진하며 지나간 길을 ×7 씩(합 ×14) · 320 만큼 나아간다', () => {
  const { g, h } = setup();
  const x0 = h.x, m = mob(g, h.x + 120, h.y), far = mob(g, h.x + 260, h.y);
  use(g, 'slash', [h.x + 500, h.y]);
  run(g, SL.start + SL.seg * 2 + 0.1);
  near(dmg(m), SL.mul, 0.02, '첫 전진 길');
  near(dmg(far), SL.mul, 0.02, '두 번째 전진 길');
  assert.ok(Math.abs(h.x - x0 - SL.len) < 12, `이동 ${h.x - x0}`);
});

test('덱 슬래시 — 대기 없이 세 번 이어 쓰고 세 번째 뒤에 대기 · 이어 쓸 시간이 지나도 대기', () => {
  const { g, h } = setup();
  use(g, 'slash', [h.x + 500, h.y]); use(g, 'slash', [h.x + 500, h.y]);
  assert.equal(h.il.acts.filter((q) => q.k === 'slash').length, 1, '앞 돌진 중에는 다음 번이 나가지 않는다');
  run(g, SL.start + SL.seg * 2 + 0.05);
  assert.equal(h.il.cd.slash, 0); assert.equal(h.il.sl.n, 1);
  use(g, 'slash', [h.x + 500, h.y]); run(g, SL.start + SL.seg * 2 + 0.05);
  assert.equal(h.il.cd.slash, 0); assert.equal(h.il.sl.n, 2);
  use(g, 'slash', [h.x + 500, h.y]);
  assert.equal(h.il.sl, null); assert.ok(h.il.cd.slash > SL.cd - 0.1, '세 번째에 대기가 시작된다');
  run(g, SL.start + SL.seg * 2 + 0.05);
  const n = h.il.acts.length; use(g, 'slash', [h.x + 500, h.y]); assert.equal(h.il.acts.length, n, '대기 중에는 못 쓴다');
  const { g: g2, h: h2 } = setup();
  use(g2, 'slash', [h2.x + 500, h2.y]); run(g2, SL.start + SL.seg * 2 + SL.chainGap + 1);
  assert.equal(h2.il.sl, null); assert.ok(h2.il.cd.slash > 0, '이어 쓸 시간이 지나면 대기');
});

test('카드 프리즌 — 네 번 ×4 + 1.70초 ×10(합 ×26) · 일반 몹은 묶고 보스는 둔화만', () => {
  const { g, h } = setup();
  const m = mob(g, h.x + 300, h.y, { stun: 0 }), b = mob(g, h.x + 320, h.y + 20, { stun: 0, boss: 1 });
  use(g, 'prison', [m.x, m.y]);
  run(g, PR.form + 0.05);
  assert.ok(m.bind > 1, '일반 몹은 최종까지 묶인다');
  assert.ok(!(b.bind > 0) && b.slow > 0, '보스는 둔화만');
  run(g, PR.end);
  near(dmg(m), PR.mul * 4 + PR.endMul);
});

test('카드 블링크 — 0.12초에 옮기고 0.22초에 원래 자리 분신 ×9 · 막혔으면 아무것도 쓰지 않는다', () => {
  let { g, h } = setup();
  const x0 = h.x, m = mob(g, h.x + 60, h.y);
  use(g, 'blink', [h.x - 600, h.y]);
  run(g, BL.boom + 0.05);
  assert.ok(Math.abs(x0 - h.x - BL.len) < 2, `이동 ${x0 - h.x}`);
  near(dmg(m), BL.mul);
  ({ g, h } = setup(200, [0, 25, 0]));
  const x1 = h.x; use(g, 'blink', [h.x - 600, h.y]); run(g, .3);
  assert.ok(Math.abs(x1 - h.x - BL.len25) < 2, '공간 연마 25 — 400');
  // 막힌 맵 — 큰 바위로 둘레를 모두 막는다
  ({ g, h } = setup());
  const M = MAPS[SANDBOX.id], keep = { train: M.train, blocks: M.blocks };
  try {
    M.train = 0; M.blocks = [{ x: h.x, y: h.y, r: 2000 }];
    h.il.trick = 4; use(g, 'blink', [h.x - 600, h.y]);
    assert.equal(h.il.cd.blink, 0, '대기 없음');
    assert.equal(h.il.trick, 4, '트릭 그대로');
    assert.equal(h.il.acts.length, 0);
  } finally { Object.assign(M, keep); }
});

test('팬텀 피스트 — 0.50초 앞 460 · 폭 200 ×40(카드 연마 50 → ×55)', () => {
  for (const [tr, mul] of [[0, FI.mul], [50, FI.mul50]]) {
    const { g, h } = setup(200, [tr, 0, 0]);
    const a = mob(g, h.x + 150, h.y), b = mob(g, h.x + 440, h.y + 40);
    use(g, 'fist', [h.x + 500, h.y]);
    run(g, FI.hit - 0.05); assert.equal(a.hp, HP, '0.50초 전에는 맞지 않는다');
    run(g, 0.1);
    near(dmg(a), mul); near(dmg(b), mul, 0.02, '관통');
  }
});

test('트릭 3개 이상 — 공격 스킬이 3개를 쓰고 첫 적중 대상에게 잔상 60%(트릭 연마 50 → 100%) 한 번 · 같은 시전 객체', () => {
  for (const [tr, k] of [[0, TK.ghost], [50, TK.ghost50]]) {
    const { g, h } = setup(200, [0, 0, tr]);
    const m = mob(g, h.x + 300, h.y);
    h.il.trick = 4;
    use(g, 'fist', [h.x + 500, h.y]);
    assert.equal(h.il.trick, 1, '3개를 쓴다');
    run(g, FI.hit + 0.02);
    assert.equal(h.il.ghosts.length, 1);
    assert.equal(h.il.ghosts[0].cast, h.il.acts.length ? null : h.il.ghosts[0].cast);
    run(g, 0.3);
    near(dmg(m), FI.mul * (1 + k), 0.02, `잔상 ${k}`);
  }
  const { g, h } = setup();
  mob(g, h.x + 300, h.y);
  h.il.trick = 2; use(g, 'fist', [h.x + 500, h.y]);
  assert.equal(h.il.trick, 2, '3개 미만이면 쓰지 않는다');
});

test('연계 — 다른 이름의 공격 스킬을 4초 안에 이어 맞히면 트릭 +1 · 같은 스킬 반복은 없음 · 트릭 연마 25 → 6초', () => {
  let { g, h } = setup();
  mob(g, h.x + 300, h.y);
  use(g, 'fist', [h.x + 500, h.y]); run(g, 0.6);
  assert.equal(h.il.trick, 0);
  use(g, 'shuffle', [h.x + 300, h.y]); run(g, 0.8);
  assert.equal(h.il.trick, 1, '다른 스킬 — +1');
  h.il.cd.shuffle = 0; use(g, 'shuffle', [h.x + 300, h.y]); run(g, 0.8);
  assert.equal(h.il.trick, 1, '같은 스킬 — 없음');
  run(g, TK.window + 0.1);
  assert.equal(h.il.chain, null, '4초 동안 유효 공격이 없으면 지운다');
  ({ g, h } = setup(200, [0, 0, 25]));
  mob(g, h.x + 300, h.y);
  use(g, 'fist', [h.x + 500, h.y]); run(g, 0.6 + 5);
  use(g, 'shuffle', [h.x + 300, h.y]); run(g, 0.8);
  assert.equal(h.il.trick, 1, '6초 안');
});

test('미러 하우스 — 안에서 쓴 공격 스킬은 첫 적중 대상에게 40% 잔상 한 번 · 밖이면 없음', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 300, h.y);
  use(g, 'mirror');
  use(g, 'fist', [h.x + 500, h.y]); run(g, 1);
  near(dmg(m), FI.mul * (1 + MR.ghost));
  ({ g, h } = setup());
  m = mob(g, h.x + 300, h.y);
  use(g, 'mirror'); h.x -= MR.r + 50; m.x = h.x + 300;
  use(g, 'fist', [h.x + 900, h.y]); run(g, 1);
  near(dmg(m), FI.mul, 0.02, '거울 집 밖');
  run(g, MR.dur);
  assert.equal(h.il.house, null, '8초 뒤 사라진다');
});

test('최후의 셔플 — 12번 ×8 + 최종 ×90(합 ×186) · 트릭 5개면 최종 +50%(×231) · 앙코르 ×30 · 트릭을 모두 쓴다', () => {
  let { g, h } = setup();
  let m = mob(g, h.x + 300, h.y);
  use(g, 'final', [m.x, m.y]); run(g, FN.end + 0.05);
  near(dmg(m), FN.n * FN.mul + FN.endMul);
  ({ g, h } = setup());
  m = mob(g, h.x + 300, h.y);
  h.il.trick = 5; use(g, 'final', [m.x, m.y]);
  assert.equal(h.il.trick, 0);
  run(g, FN.end + 0.05);
  near(dmg(m), 231);
  ({ g, h } = setup(200, [50, 50, 50]));
  m = mob(g, h.x + 300, h.y);
  use(g, 'final', [m.x, m.y]); run(g, FN.encore + 0.05);
  near(dmg(m), FN.n * FN.mul + FN.endMul + FN.encoreMul, 0.02, '끝없는 앙코르');
});

test('잠긴 스킬은 레벨을 알려 준다 · 쓰러지면 트릭 · 진행 중인 스킬을 걷는다', () => {
  const { g, h } = setup(60);
  use(g, 'fist');
  assert.equal(h.il.acts.length, 0);
  assert.ok(g.fx.some(f => f.text && f.text.includes('직업 레벨 100')));
  h.il.trick = 4; use(g, 'blink', [h.x + 500, h.y]);
  assert.equal(h.il.acts.length, 1);
  illusionDown({}, g, h);
  assert.equal(h.il.acts.length, 0); assert.equal(h.il.trick, 0);
});

test('스킬 설명 창 — 마술사 칸을 만든다(수치는 데이터 파일에서)', () => {
  const info = hiddenSkillInfo('illusionist');
  assert.ok(info && info.skills.length === 7 && info.basic.name === CD.name);
  assert.ok(info.skills.find(q => q.s === 'final').ult);
});

test('그림 규격 — 시트 · 아이콘 · 연출 덜어내기 · 바닥 연출 · 입자 상한', async () => {
  const { ILLUSION_PX, ILLUSION_ICON } = await import('../src/game/illusionPxData.js');
  const { ILLUSION_CAP, ILLUSION_GROUND, IL_BITS } = await import('../src/game/illusionArt.js');
  const { GROUND_FX } = await import('../src/game/skillArt.js');
  const man = JSON.parse(readFileSync(new URL('../design/effects/illusionist/manifest.json', import.meta.url)));
  assert.deepEqual(ILLUSION_PX, man, 'make.py 가 낸 규격과 같다');
  for (const [k, T] of Object.entries(ILLUSION_PX)) {
    const path = new URL(`../public/assets/game/rpg/effects/hidden-jobs/illusionist/px/${k}.webp`, import.meta.url);
    assert.ok(existsSync(path), k);
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8L', k);
    const size = bytes.readUInt32LE(21);
    assert.equal((size & 0x3fff) + 1, T.w * T.cols, `${k} 가로`);
    assert.equal(((size >>> 14) & 0x3fff) + 1, T.h * Math.ceil(T.n / T.cols) * (T.rows || 1), `${k} 세로`);
  }
  assert.equal(Object.keys(ILLUSION_ICON).length, ILLUSION_PX.il_icons.n);
  assert.ok(Object.keys(ILLUSION_CAP).every(k => k.startsWith('sk_il_')));
  assert.ok([...ILLUSION_GROUND].every(k => GROUND_FX.has(k)));
  assert.ok(IL_BITS.perFx > 0 && IL_BITS.perFx <= 64 && IL_BITS.perFrame <= 400, '입자 수 상한');
});
