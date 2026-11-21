/* 히든 직업 Necromancer 004 그림자 군주(11월 17일, 격자 연습장에만) — 실제 게임 함수로 영혼 · 흔적 · 명부 · 그림자 · 스킬 배율 · 연습장 제한을 본다.
   node --test tools/necro.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgTrain, sandboxMobs } from '../src/game/rpg.js';
import { rpgInput } from '../src/game/rpgInput.js';
import { whyEquip } from '../src/game/shop.js';
import { RESET, GIFT } from '../src/game/itemData.js';
import { SANDBOX } from '../src/game/sandboxData.js';
import { NECRO as NC, NC_SCYTHE as SC, NC_SOUL as SOUL, NC_EXTRACT as EX, NC_SUMMON as SM, NC_SWAP as SW, NC_DOMAIN as DM, NC_MARCH as MC, NC_BURN as BN, NC_LEGION as LG,
  NC_ROSTER as RS, NC_SLOTS } from '../src/game/necroData.js';
import { unlockNecro, necroOn, necroView, cleanNcJob, gradeCost, rosterSlots, kindOf, ncEternal } from '../src/game/necroJob.js';
import { holds } from '../src/game/hiddenUnique.js';
import { cleanHj } from '../src/game/gamblerJob.js';
import { KEY_ACTIONS } from '../src/game/keys.js';
import { NECRO_PX, NECRO_ICON, NECRO_PFX } from '../src/game/necroPxData.js';
import { NECRO_CAP, NECRO_GROUND, necroSwingClock } from '../src/game/necroArt.js';
import { GROUND_FX } from '../src/game/skillArt.js';
import { readFileSync, existsSync } from 'node:fs';
Math.random = () => 0.999;   // 치명타 · 회피 없음
const proto = (() => { const g = makeWorld(); return structuredClone(g.mobs.find(m => m.type === 'rabbit' && !m.boss)); })();
const HP = 1e9;
const near = (a, b, eps = 0.03, msg = '') => assert.ok(Math.abs(a / b - 1) < eps, `${msg} ${a} / ${b} = ${a / b}`);
function setup(lv = 200, tr = [0, 0, 0], roster = []) {
  const g = makeWorld(); g.out = []; g.test = 1; g.high = true; g.wb.lastHour = Infinity;
  rpgSyncSeats(g, [{ id: 'n0', name: '군주', hero: { name: '군주', job: 'mage', gender: 'm' } }]);
  rpgJoin(g, 0, { name: '군주', rs: RESET.id, gift: GIFT.id, lv: 250, ts: 0, coins: 1000, stats: { str: 100, int: 40, hp: 100 }, bag: { oc: 1, n: 2, w: [{ u: 1, sp: 'nc_scythe', p: 0 }], e: 1 } }, 'n0');   // 전용 무기 그림자 낫을 든다(11월 20일)
  const h = g.heroes[0];
  h.map = SANDBOX.id; h.x = 900; h.y = 900; h.auto = 0; h.look = [1, 0]; h.dir = 1;
  unlockNecro(h, { lv, tr: tr.map(l => [l, 0]), roster });
  step(g, .01);
  h.cd = 0;
  return { g, h };
}
const step = (g, dt) => { rpgStep(g, dt); g.mobs = g.mobs.filter(m => m.type !== 'dummy'); };
const run = (g, t) => { for (let n = 0; n < Math.round(t / .01); n++) step(g, .01); };
function mob(g, x, y, extra = {}) { const m = { ...structuredClone(proto), id: g.nextId++, map: SANDBOX.id, x, y, hp: HP, max: HP, stun: 999, dead: false, ...extra }; g.mobs.push(m); return m; }
const cast = (g, s, pt) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'use', s }, ...(pt ? { aim: [1, 0], pt } : {}) });
const fire = (g, on) => rpgInput(g, { cls: 0, kind: 'fire', dir: on });
const soul = (h, n) => { h.nc.soul = n; };
const FIVE = [{ t: 'goblin', n: '고블린', g: 1, x: 0 }, { t: 'wolf', n: '늑대', g: 1, x: 0 }, { t: 'skeletal', n: '스켈레톤', g: 1, x: 0 }, { t: 'necro', n: '언데드 마법사', g: 1, x: 0 }, { t: 'ogre', n: '오우거', g: 1, x: 0 }];
// 기준 — 그림자 낫 한 번 피해(×mul)
function unit() { const { g, h } = setup(); const m = mob(g, h.x + 100, h.y); fire(g, true); step(g, .01); fire(g, false); run(g, .45); return (HP - m.hp) / SC.mul; }
const U = unit();

test('실제 게임 — live 가 켜져 연습장 밖에서도 직업이 켜진다(11월 20일 획득 루트) · 키 설정 창에 칸을 만들지 않는다', () => {
  assert.equal(NC.live, true, '11월 20일 — 획득 루트와 함께 실제 게임에 열었다');
  const { g, h } = setup();
  assert.ok(necroOn(h));
  h.map = 'field'; assert.ok(necroOn(h), '연습장 밖에서도 켜진다');
  h.map = SANDBOX.id;
  assert.ok(!KEY_ACTIONS.some(a => /necro|네크로|그림자 군주/i.test(a.id + a.name)));
  assert.ok(NC_SLOTS.every(q => KEY_ACTIONS.some(a => a.id === q.act)));
  assert.ok(!holds(h.bag, 'gambler') && !holds(h.bag, 'blood') && holds(h.bag, 'necromancer'), '유일 규칙은 이 직업으로 센다');
  assert.equal(cleanHj(h.bag.hj, false).active, 'necromancer', '저장(cleanHj)이 이 직업을 싣는다');
  assert.equal(h.bag.e, 1, '전용 무기 그림자 낫은 그대로 든다(11월 20일 — 다른 무기는 내려놓는다)');
  const m = mob(g, h.x + 150, h.y);
  rpgInput(g, { cls: 0, kind: 'skill' }); rpgInput(g, { cls: 0, kind: 'wskill' }); run(g, .5);
  assert.equal(m.hp, HP, '큰 기술 · 무기 스킬은 나가지 않는다');
});

test('그림자 낫 — 근접 부채꼴 · 여럿을 한 번에 · 맞히면 영혼 +5(한 번) · 뒤 · 먼 곳은 맞지 않는다', () => {
  const { g, h } = setup();
  h.dir = 1;
  const a = mob(g, h.x + 100, h.y), b = mob(g, h.x + 90, h.y + 40), back = mob(g, h.x - 100, h.y), far = mob(g, h.x + SC.reach + 80, h.y);
  fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  near(HP - a.hp, U * SC.mul); near(HP - b.hp, U * SC.mul);
  assert.equal(back.hp, HP, '등 뒤는 베지 않는다'); assert.equal(far.hp, HP, '닿지 않는 곳은 베지 않는다');
  assert.equal(necroView(h).soul, SOUL.hit, '여럿을 베어도 영혼은 한 번');
  const none = setup(); const m2 = mob(none.g, none.h.x + 400, none.h.y);
  none.h.auto = 1; run(none.g, 1);
  assert.equal(m2.hp, HP, '자동 평타는 닿는 적이 없으면 휘두르지 않는다');
});

test('처치 — 영혼 +10 · 직업 경험치 · 8초짜리 흔적. 흔적 추출로 명부 등록 → 재추출로 승급', () => {
  const { g, h } = setup(5);
  sandboxMobs(g, SANDBOX.id, [[h.x + 100, h.y, 'goblin']]);
  const m = g.mobs.find(q => q.sb);
  m.hp = 1;
  fire(g, true); step(g, .01); fire(g, false); run(g, .5);
  assert.ok(m.dead);
  const v = necroView(h);
  assert.equal(v.soul, SOUL.hit + SOUL.kill);
  assert.equal(v.traces.length, 1);
  assert.equal(kindOf('goblin'), 'knight');
  soul(h, 100);
  cast(g, 'extract'); run(g, EX.done + .05);
  assert.deepEqual(necroView(h).roster.map(q => [q.t, q.g]), [['goblin', 1]]);
  assert.equal(necroView(h).soul, 100 - EX.cost);
  // 흔적이 없으면 영혼 · 대기를 쓰지 않는다
  h.nc.cd.extract = 0; cast(g, 'extract'); run(g, .1);
  assert.equal(necroView(h).soul, 100 - EX.cost); assert.equal(h.nc.cd.extract, 0);
  // 같은 종류 두 번 더 → 2등급(비용 2)
  for (let i = 0; i < 2; i++) {
    sandboxMobs(g, SANDBOX.id, [[h.x + 150, h.y, 'goblin']]);
    const q = g.mobs.find(o => o.sb && !o.dead); q.hp = 1; h.cd = 0;
    fire(g, true); step(g, .01); fire(g, false); run(g, .5);
    h.nc.cd.extract = 0; soul(h, 100); cast(g, 'extract'); run(g, EX.done + .05);
  }
  assert.equal(necroView(h).roster[0].g, 2);
  // 흔적은 8초 뒤 사라진다
  sandboxMobs(g, SANDBOX.id, [[h.x + 150, h.y, 'wolf']]);
  const w = g.mobs.find(o => o.sb && !o.dead); w.hp = 1; h.cd = 0;
  fire(g, true); step(g, .01); fire(g, false); run(g, .5);
  assert.equal(necroView(h).traces.length, 1);
  run(g, 8);
  assert.equal(necroView(h).traces.length, 0);
});

test('명부 — 12종(추출 연마 25 → 15종) · 승급 비용 2 · 4 · 7 · 10(추출 연마 50 → 5등급 8) · 저장 꼴 검사', () => {
  assert.equal(rosterSlots(cleanNcJob({ tr: [[24, 0], [0, 0], [0, 0]] })), RS.slots);
  assert.equal(rosterSlots(cleanNcJob({ tr: [[25, 0], [0, 0], [0, 0]] })), RS.slots25);
  const J0 = cleanNcJob({}), J50 = cleanNcJob({ tr: [[50, 0], [0, 0], [0, 0]] });
  assert.deepEqual([1, 2, 3, 4, 5].map(gg => gradeCost(J0, gg)), [2, 4, 7, 10, 0]);
  assert.equal(gradeCost(J50, 4), 8);
  const J = cleanNcJob({ lv: 999, roster: [{ t: 'wolf', g: 9 }, { t: 'wolf', g: 1 }, { t: '', g: 1 }, ...Array.from({ length: 20 }, (_, i) => ({ t: `m${i}` }))] });
  assert.equal(J.lv, NC.maxLv);
  assert.equal(J.roster[0].g, RS.grades);
  assert.equal(J.roster.filter(q => q.t === 'wolf').length, 1, '같은 종류는 한 칸');
  assert.equal(J.roster.length, RS.slots25);
});

test('그림자 소환 — 영혼 30 · 등급 높은 순 5기 · 20초 · 1.4초마다 ×3.0(등급 +10%씩)', () => {
  const { g, h } = setup(200, [0, 0, 0], [...FIVE, { t: 'orc', n: '오크', g: 3, x: 0 }]);
  soul(h, 100);
  const m = mob(g, h.x + 60, h.y);
  cast(g, 'summon');
  assert.equal(h.nc.sh.length, SM.max);
  assert.equal(h.nc.sh[0].t, 'orc', '등급 높은 것부터');
  assert.equal(necroView(h).soul, 100 - SM.cost);
  run(g, SM.dur + 1);
  assert.equal(h.nc.sh.length, 0, '20초 뒤 사라진다');
  const dealt = HP - m.hp;
  // 이론 상한: 1기당 최대 14번 × 3.0 × (1 + 0.1 × (등급 − 1))
  const cap = U * SM.mul * Math.floor(SM.dur / SM.gap + 1) * (1.2 + 4);
  assert.ok(dealt > U * SM.mul * 5 * 8, `여러 번 쳤다 ${dealt / U}`);
  assert.ok(dealt <= cap * 1.001, `상한 안 ${dealt / U} <= ${cap / U}`);
});

test('명부가 비면 소집하지 않는다 · 쓰러지면 그림자 · 영혼을 걷는다 · 맵을 옮기면 그림자가 사라진다', () => {
  const { g, h } = setup();
  soul(h, 100); cast(g, 'summon');
  assert.equal(h.nc.sh.length, 0); assert.equal(necroView(h).soul, 100);
  const b = setup(200, [0, 0, 0], FIVE);
  soul(b.h, 100); cast(b.g, 'summon'); run(b.g, .6);
  assert.equal(b.h.nc.sh.length, 5);
  b.h.map = 'field';
  run(b.g, .05);
  assert.equal(b.h.nc.sh.length, 0, '맵을 옮기면 그림자가 사라진다');
});

test('그림자 교환 — 포인터에 가까운 내 그림자와 0.18초에 자리를 바꾼다(피해 없음)', () => {
  const { g, h } = setup(200, [0, 0, 0], FIVE);
  soul(h, 100); cast(g, 'summon'); run(g, .6);
  const sd = h.nc.sh[2]; sd.x = h.x + 400; sd.y = h.y; const at = [sd.x, sd.y], from = [h.x, h.y];
  cast(g, 'swap', [sd.x, sd.y]);
  run(g, SW.at + .02);
  assert.ok(Math.abs(h.x - at[0]) < 2 && Math.abs(h.y - at[1]) < 2, `캐릭터가 그림자 자리로 ${h.x},${h.y}`);
  assert.ok(Math.hypot(sd.x - from[0], sd.y - from[1]) < 40, '그림자는 캐릭터 자리 곁으로');
});

test('일제 진군 — 살아 있는 그림자마다 ×7(지휘 연마 50 → ×11) · 0.65초 안에 끝 · 한 시전', () => {
  for (const [tr, mul] of [[0, MC.mul], [50, MC.mul50]]) {
    const { g, h } = setup(200, [0, tr, 0], FIVE);
    soul(h, 100); cast(g, 'summon'); run(g, .6);
    const m = mob(g, h.x + 1400, h.y);           // 그림자가 평소에는 닿지 않는 곳
    const far = mob(g, h.x + 300, h.y);
    for (const sd of h.nc.sh) sd.cd = 99;        // 평소 공격은 막아 진군 피해만 잰다
    cast(g, 'march', [far.x, far.y]); run(g, MC.last + .05);
    const grades = h.nc.sh.reduce((n, q) => n + (1 + RS.gradeDmg * (q.g - 1)), 0);
    near(HP - far.hp, U * mul * grades, .03, `연마 ${tr}`);
    assert.equal(m.hp, HP);
  }
});

test('군주의 영역 — 10초(군주 연마 25 → 12초) · 안의 그림자 피해 +40%(50 → +70%)', () => {
  for (const [tr, add, dur] of [[0, DM.dmg, DM.dur], [50, DM.dmg50, DM.dur25]]) {
    const { g, h } = setup(200, [0, 0, tr], [FIVE[0]]);
    soul(h, 100); cast(g, 'summon'); run(g, .6);
    const sd = h.nc.sh[0]; sd.cd = 99;
    const m = mob(g, h.x + 200, h.y);
    cast(g, 'domain'); step(g, .01);
    sd.x = m.x - 40; sd.y = m.y; sd.cd = 0; const hp0 = m.hp;
    run(g, .5);
    near(hp0 - m.hp, U * SM.mul * (1 + add), .03, `군주 연마 ${tr}`);
    run(g, dur - .6); assert.ok(h.nc.dom, '아직 영역'); run(g, .3); assert.equal(h.nc.dom, null, `${dur}초 뒤 끝`);
  }
});

test('영혼 소각 — 나와 있는 그림자를 모두 써서 1기당 ×15 · 쓴 종류는 8초 동안 다시 부르지 못한다', () => {
  const { g, h } = setup(200, [0, 0, 0], FIVE);
  soul(h, 100); cast(g, 'summon'); run(g, .6);
  for (const sd of h.nc.sh) sd.cd = 99;
  const m = mob(g, h.x + 300, h.y);
  soul(h, 100); cast(g, 'burn', [m.x, m.y]);
  assert.equal(h.nc.sh.length, 0);
  run(g, BN.boom + BN.gap * 5 + .05);
  near(HP - m.hp, U * BN.mul * 5);
  assert.equal(necroView(h).roster.length, 5, '명부는 그대로');
  h.nc.cd.summon = 0; soul(h, 100); cast(g, 'summon');
  assert.equal(h.nc.sh.length, 0, '8초 동안은 부르지 못한다');
  run(g, BN.lock); h.nc.cd.summon = 0; soul(h, 100); cast(g, 'summon');
  assert.equal(h.nc.sh.length, 5);
});

test('무명의 군세 — 영혼 70 · 파동 10번 ×12 + 마지막 ×100(영원의 명령 ×140) · 궁극기 한 시전', () => {
  for (const tr of [0, 50]) {
    const { g, h } = setup(200, [tr, tr, tr]);
    soul(h, 100);
    const m = mob(g, h.x + 300, h.y);
    cast(g, 'legion', [m.x, m.y]);
    assert.equal(necroView(h).soul, 100 - LG.cost);
    run(g, LG.end + .05);
    near(HP - m.hp, U * (LG.waves * LG.mul + (ncEternal(cleanNcJob({ tr: [[tr, 0], [tr, 0], [tr, 0]] })) ? LG.endMul150 : LG.endMul)));
  }
});

test('레벨 해금 · 영혼 부족 · 스택 가득(영혼 100)', () => {
  const { g, h } = setup(14, [0, 0, 0], FIVE);
  soul(h, 100); cast(g, 'summon');
  assert.equal(h.nc.sh.length, 0, '직업 레벨 15 전에는 잠김');
  const b = setup(200, [0, 0, 0], FIVE);
  soul(b.h, SM.cost - 1); cast(b.g, 'summon');
  assert.equal(b.h.nc.sh.length, 0, '영혼이 모자라면 쓰지 않는다');
  rpgTrain(b.g, 0, { op: 'stack' }); run(b.g, .05);
  assert.equal(necroView(b.h).soul, NC.soul);
});

test('도트 시트 — manifest 와 규격이 같고 파일이 있다 · 연출 종류마다 상한 · 땅 연출 등록', () => {
  const man = JSON.parse(readFileSync(new URL('../design/effects/necromancer/manifest.json', import.meta.url)));
  assert.deepEqual(Object.keys(man).sort(), Object.keys(NECRO_PX).sort());
  for (const [k, v] of Object.entries(man)) {
    assert.deepEqual(NECRO_PX[k], v, k);
    assert.ok(existsSync(new URL(`../public/assets/game/rpg/effects/hidden-jobs/necromancer/px/${k}.webp`, import.meta.url)), k);
  }
  assert.equal(Object.keys(NECRO_ICON).length, NECRO_PX.nc_icons.n);
  const pf = JSON.parse(readFileSync(new URL('../design/effects/pixelfx/necromancer/manifest.json', import.meta.url)));
  assert.deepEqual(pf, NECRO_PFX);   // pixelfx 보강 시트(군주의 영역)
  for (const k of Object.keys(pf)) assert.ok(existsSync(new URL(`../public/assets/game/rpg/effects/hidden-jobs/necromancer/px/${k}.webp`, import.meta.url)), k);
  for (const k of NECRO_GROUND) assert.ok(GROUND_FX.has(k), k);
  const src = readFileSync(new URL('../src/game/necroJob.js', import.meta.url), 'utf8');
  for (const k of new Set(src.match(/sk_nc_\w+/g))) assert.ok(NECRO_CAP[k], `상한 ${k}`);
});

test("모든 몹 종류가 그림자 종류 짝을 가진다(허수아비 제외)", async () => {
  const { MOB } = await import("../src/game/rpg.js");
  const { NC_KIND_OF } = await import("../src/game/necroData.js");
  const miss = Object.keys(MOB).filter((t) => t !== "dummy" && !NC_KIND_OF[t]);
  assert.deepEqual(miss, []);
});

test("명부 창 — 편성 차례 · 고른 그림자 먼저 소환 · 회수", async () => {
  const { summonPick, necroInput, necroSandboxRefine } = await import("../src/game/necroJob.js");
  const roster = [{ t: "a", n: "a", g: 1, x: 0 }, { t: "b", n: "b", g: 3, x: 0 }, { t: "c", n: "c", g: 2, x: 0 }, { t: "d", n: "d", g: 5, x: 0 }, { t: "e", n: "e", g: 1, x: 0 }, { t: "f", n: "f", g: 4, x: 0 }];
  assert.deepEqual(summonPick({ roster, party: [] }, {}).map((q) => q.t), ["d", "f", "b", "c", "a"]);
  assert.deepEqual(summonPick({ roster, party: ["e", "a"] }, {}).map((q) => q.t), ["e", "a"]);
  assert.deepEqual(summonPick({ roster, party: ["e"] }, { e: 3 }, "c").map((q) => q.t), ["c"]);
  assert.equal(typeof necroInput, "function");
  assert.equal(typeof necroSandboxRefine, "function");
});

test('보스 그림자 그림 — 자르기 스크립트 목록과 같고 파일이 있다 · 모두 있는 몹 종류', async () => {
  const { NC_BOSS_ART } = await import('../src/game/necroPxData.js');
  const py = readFileSync(new URL('./cut-necro-boss.py', import.meta.url), 'utf8');
  const kinds = [...py.matchAll(/": "([a-z_]+)",/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(NC_BOSS_ART).sort(), kinds);
  for (const k of kinds) assert.ok(existsSync(new URL(`../public/assets/game/rpg/effects/hidden-jobs/necromancer/boss/${k}.webp`, import.meta.url)), k);
});

test('보스 그림자 휘두르기 — 팔 자르기 목록과 같고 몸 · 팔 그림이 있다', async () => {
  const { NC_BOSS_ARM, NC_BOSS_ART } = await import('../src/game/necroPxData.js');
  const py = readFileSync(new URL('./cut-necro-arm.py', import.meta.url), 'utf8');
  const kinds = [...py.matchAll(/^    "([a-z_]+)": \[/gm)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(NC_BOSS_ARM).sort(), kinds);
  const dir = '../public/assets/game/rpg/effects/hidden-jobs/necromancer/boss/';
  for (const [k, arms] of Object.entries(NC_BOSS_ARM)) {
    assert.ok(k in NC_BOSS_ART, k);
    assert.ok(existsSync(new URL(`${dir}${k}-body.webp`, import.meta.url)), k);
    arms.forEach((a, i) => { assert.ok(existsSync(new URL(`${dir}${k}-arm${i}.webp`, import.meta.url)), `${k} ${i}`); assert.ok(a[2] === 1 || a[2] === -1); });
  }
});

test('보스 그림자 기술 — 보스마다 원래 피해 기술(즉사기 · 방어 기술 없음) · 준비 뒤 범위 안 몹을 기술 배수로 친다', async () => {
  const { NC_BOSS_SKILL, NC_BOSS_SK } = await import('../src/game/necroData.js');
  const { NC_BOSS_ART } = await import('../src/game/necroPxData.js');
  const { WORLD_BOSS_PATTERNS } = await import('../src/game/worldBossData.js');
  const doom = Object.values(WORLD_BOSS_PATTERNS).filter((p) => p.doom).map((p) => p.name);
  for (const t of Object.keys(NC_BOSS_ART)) {
    const L = NC_BOSS_SKILL[t];
    assert.ok(L && L.length, `${t} 기술이 있다`);
    for (const q of L) {
      assert.ok(!doom.includes(q.name), `${t} 즉사기 ${q.name} 은 뺀다`);
      assert.ok(q.mul > 0 && q.n >= 1 && q.cd > 0 && q.range > 0 && q.steps.length && q.steps.every((s) => s.length), `${t} ${q.name} 꼴`);
    }
  }
  // 그라모르 그림자 — 대지 강타(r 240 · ×1.8)가 거수형 평타 거리 밖 몹도 친다
  const { g, h } = setup(200, [0, 0, 0], [{ t: 'gramor', n: '그라모르', g: 1, x: 0 }]);
  soul(h, 100);
  const a = mob(g, h.x + 150, h.y), b = mob(g, h.x + 150, h.y + 150 * 0.62);
  cast(g, 'summon');
  const S = NC_BOSS_SKILL.gramor[0];
  run(g, S.cd * NC_BOSS_SK.first - 0.2);
  assert.ok(!g.out.some((f) => f.kind === 'sk_nc_boss'), '대기 전에는 쓰지 않는다');
  const hpB = b.hp;
  run(g, 0.4 + S.wind + 0.3);
  assert.ok(g.out.some((f) => f.kind === 'sk_nc_bwarn') && g.out.some((f) => f.kind === 'sk_nc_boss'), '예고 → 타격 연출');
  assert.ok(g.out.some((f) => f.kind === 'call' && f.text === S.name), '기술 이름');
  assert.ok(hpB > b.hp, '범위 안 몹이 맞았다');
  assert.ok(a.hp < HP);
});

test('그림자 이름 — 처음 등록하면 묻고 · 내린 이름이 명부 · 소환에 쓰인다 · 금지어 · 8자 · 이 기기 이름은 다시 묻지 않는다 · 남에게는 외침을 숨긴다', async () => {
  const { cleanNcName } = await import('../src/game/necroJob.js');
  const kill = (g, h, t) => {
    sandboxMobs(g, SANDBOX.id, [[h.x + 100, h.y, t]]);
    const m = g.mobs.find(q => q.sb && !q.dead); m.hp = 1; h.cd = 0;
    fire(g, true); step(g, .01); fire(g, false); run(g, .5);
    h.nc.cd.extract = 0; soul(h, 100); cast(g, 'extract'); run(g, EX.done + .05);
  };
  const name = (g, d) => rpgInput(g, { cls: 0, kind: 'hidden', dir: { op: 'name', ...d } });
  const { g, h } = setup(200);
  kill(g, h, 'goblin');
  assert.deepEqual(necroView(h).ask, { t: 'goblin', n: necroView(h).roster[0].base, g: 1 }, '처음 등록 — 이름을 묻는다');
  name(g, { t: 'goblin', n: '시 발놈' });
  assert.ok(!necroView(h).roster[0].nm && necroView(h).ask, '금지어는 거절(띄어 쓰기를 빼고 본다)');
  name(g, { t: 'goblin', n: '  베르 그림자 군단장님 ' });
  const e = necroView(h).roster[0];
  assert.equal(e.nm, '베르 그림자 군'); assert.equal(e.n, e.nm); assert.ok(e.base && e.base !== e.nm);
  assert.equal(necroView(h).ask, null);
  assert.ok(g.out.some(f => f.kind === 'call' && f.mine && f.text.includes('베르')), '이름이 든 외침은 주인에게만');
  assert.equal(cleanNcRoster(h), '베르 그림자 군', '저장 꼴에도 남는다');
  kill(g, h, 'goblin');
  assert.equal(necroView(h).ask, null, '재추출은 묻지 않는다');
  soul(h, 100); cast(g, 'summon');
  assert.equal(h.nc.sh[0].n, '베르 그림자 군'); assert.equal(h.nc.sh[0].nm, 1);
  name(g, { t: 'goblin', n: '' });
  assert.ok(!necroView(h).roster[0].nm, '비우면 몹 이름으로');
  // 이 기기에 둔 이름(연습장 h.ncNames)은 다시 묻지 않고 붙는다
  const b = setup(200); b.h.ncNames = { wolf: '이그리트' };
  kill(b.g, b.h, 'wolf');
  assert.equal(necroView(b.h).ask, null); assert.equal(necroView(b.h).roster[0].nm, '이그리트');
  name(b.g, { skip: 1 });
  assert.equal(cleanNcName('<b>a\nb</b>'), 'bab/b', '꺾쇠 · 줄바꿈을 지운다');
});
function cleanNcRoster(h) { return cleanNcJob(h.bag.hj.jobs.necromancer).roster[0].nm; }

test('그림자 낫 전용 무기 — 이 직업만 · 이것만 들고 · 들어야 평타 · 숨은 무기(hold · hj) · 가방 그림', async () => {
  const { NC_WEAPON_ITEM } = await import('../src/game/necroData.js');
  const { SPECIALS } = await import('../src/game/shopData.js');
  const { ncArmed } = await import('../src/game/necroJob.js');
  const sp = SPECIALS.find(q => q.id === NC_WEAPON_ITEM.id);
  assert.ok(sp && sp.hold && sp.hj === 'necromancer');
  assert.ok(existsSync('public/assets/game/rpg/weapons/nc_scythe.webp'), '가방 그림');
  const { g, h } = setup();
  assert.ok(ncArmed(h), '들고 있다');
  h.bag.w.push({ u: 2, t: 'staff', r: 0, g: 0, p: 0 });
  assert.ok(whyEquip(h, 2).some(t => t.includes('그림자 낫만')), '다른 무기는 못 든다');
  assert.deepEqual(whyEquip(h, 1), [], '그림자 낫은 든다');
  // 맨손이면 평타가 나가지 않는다
  h.bag.e = 0; const m = mob(g, h.x + 100, h.y);
  fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  assert.equal(m.hp, HP, '맨손 — 휘두르지 못한다');
  h.bag.e = 1; h.cd = 0; fire(g, true); step(g, .01); fire(g, false); run(g, .45);
  assert.ok(m.hp < HP, '들면 휘두른다');
  // 다른 직업은 못 든다
  const b = setup(); b.h.bag.hj.active = '';
  assert.ok(whyEquip(b.h, 1).some(t => t.includes('Necromancer 004 만')));
});

test('낫 휘두르기 그림 — 스냅샷이 h.swing 을 다시 채워도 한 번만 처음부터 그린다(11월 21일)', () => {
  // 전용 서버 손님 화면: 서버 휘두름 0.34초 동안 0.05초마다 h.swing = 0.2 로 다시 채운다
  const r = { last: 0, at: -99, rot: 0 }, dt = 1 / 60;
  let sw = 0, seen = [], next = 0.1;
  for (let now = 0; now < 1.6; now += dt) {
    if (now >= next && ((now >= 0.1 && now < 0.45) || (now >= 0.75 && now < 1.1))) { sw = 0.2; next = now + 0.05; }
    else if (now >= next) next = now + 0.05;
    sw = Math.max(0, sw - dt);
    seen.push([now, necroSwingClock(r, sw, now)]);
  }
  const starts = seen.filter(([, t], i) => t >= 0 && (i === 0 || seen[i - 1][1] < 0 || t < seen[i - 1][1]));
  assert.equal(starts.length, 2, '휘두름 둘 — 다시 채울 때마다 새로 시작하지 않는다');
  starts.forEach(([, t]) => assert.ok(t < 0.02, '처음(들어 올림)부터 그린다'));
});
