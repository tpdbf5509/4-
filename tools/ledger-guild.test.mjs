import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerCore } from '../server/src/ledger.js';
import { guildWeek, kstDay } from '../server/src/ledger-guild.js';
import { fakeD1 } from './fake-d1.mjs';

/* 길드 — tools/guild-db.test.mjs(Postgres)의 장면을 장부(JS · D1)로 그대로 다시 한다.
   장부는 Durable Object 가 요청을 한 줄로 세우니 여기서도 하나씩 차례로 부른다 */
const NAMES = ['길드가', '길드나', '길드다', '길드라', '길드마'];
const setup = async () => {
  const d1 = fakeD1(), clock = { t: Date.parse('2026-10-28T03:00:00Z') };   // 한국 시간 수요일 정오
  const core = new LedgerCore(d1, { now: () => clock.t });
  const who = {};
  for (const [i, n] of NAMES.entries()) {
    const r = await core.call('rpg_create', { p_name: n, p_code: '13579', p_data: { name: n, lv: 50, ts: 0, coins: 100000, bag: { m: {}, w: [], a: [], ae: {}, n: 1 } } });
    assert.equal(r.ok, true);
    who[n] = { name: n, tok: r.token, sid: `g${i}` };
    await core.call('rpg_live', { p_name: n, p_token: r.token, p_sid: `g${i}`, p_srv: 'RPG1' });
  }
  const act = (me, op = 'get', args = {}, over = {}) =>
    core.call('rpg_guild_action', { p_name: me.name, p_token: me.tok, p_sid: me.sid, p_op: op, p_args: args, ...over });
  const sql = (q, ...p) => d1.db.prepare(q).run(...p);
  const get = (q, ...p) => d1.db.prepare(q).get(...p);
  const [g0, g1, g2, g3, g4] = NAMES.map((n) => who[n]);
  const create = async () => { const r = await act(g0, 'create', { name: '시험길드' }); assert.equal(r.ok, true, JSON.stringify(r)); return r.guild.id; };
  return { d1, clock, core, act, sql, get, g0, g1, g2, g3, g4, create };
};

test('주(week)는 한국 시간 월요일 0시에 바뀐다', () => {
  assert.equal(guildWeek(Date.parse('2026-10-25T14:59:59Z')), '2026-10-19');
  assert.equal(guildWeek(Date.parse('2026-10-25T15:00:00Z')), '2026-10-26');
  assert.equal(kstDay(Date.parse('2026-10-25T15:00:00Z')), '2026-10-26');
});

test('입장권 · 창 · 접속을 검사한다', async () => {
  const t = await setup();
  assert.equal((await t.act(t.g0, 'get', {}, { p_token: 'wrong' })).err, 'token');
  assert.equal((await t.act(t.g0, 'get', {}, { p_sid: 'wrong' })).err, 'live');
  assert.equal((await t.act(t.g0)).ok, true);
  t.clock.t += 31000;                                      // 접속 표시가 30초 지나 풀린다
  assert.equal((await t.act(t.g0)).err, 'live');
});

test('생성은 50레벨 · 5만 코인을 검증하며 중복 생성과 옛 저장을 거절한다', async () => {
  const t = await setup();
  const set = (patch) => { const d = JSON.parse(t.get('SELECT data FROM chars WHERE name_key = ?', '길드가').data); t.sql('UPDATE chars SET data = ? WHERE name_key = ?', JSON.stringify({ ...d, ...patch }), '길드가'); };
  set({ lv: 49 });
  assert.equal((await t.act(t.g0, 'create', { name: '시험길드' })).err, 'level');
  set({ lv: 50, coins: 49999 });
  assert.equal((await t.act(t.g0, 'create', { name: '시험길드' })).err, 'funds');
  set({ coins: 100000 });
  assert.equal((await t.act(t.g0, 'create', { name: '가' })).err, 'name');
  await t.create();
  const c = t.get('SELECT data, trade_seq FROM chars WHERE name_key = ?', '길드가');
  assert.equal(JSON.parse(c.data).coins, 50000);
  assert.equal(c.trade_seq, 1);
  assert.equal((await t.act(t.g0, 'create', { name: '다른길드' })).err, 'member');
  const r = await t.core.call('rpg_save', { p_name: t.g0.name, p_token: t.g0.tok, p_data: { ...JSON.parse(c.data), ts: 0, coins: 100000 } });
  assert.equal(r.err, 'stale');
  assert.equal((await t.act(t.g1, 'create', { name: '시험길드' })).err, 'taken', '같은 이름은 거절');
});

test('초대를 모두 수락해도 길드 정원 4명을 넘지 않는다', async () => {
  const t = await setup();
  await t.create();
  for (const g of [t.g1, t.g2, t.g3, t.g4]) assert.equal((await t.act(t.g0, 'invite', { name: g.name })).ok, true);
  const joined = [];
  for (const g of [t.g1, t.g2, t.g3, t.g4]) joined.push(await t.act(g, 'join'));
  assert.equal(joined.filter((x) => x.ok).length, 3);
  assert.equal(joined.at(-1).err, 'full');
  assert.equal((await t.act(t.g0)).guild.members.length, 4);
});

test('가입 승인 · 위임 · 추방 · 탈퇴는 권한을 검사하고 이름이 바뀌어도 소속을 보존한다', async () => {
  const t = await setup();
  const id = await t.create();
  assert.equal((await t.act(t.g1, 'apply', { id })).ok, true);
  assert.equal((await t.act(t.g2, 'approve', { name: t.g1.name })).err, 'leader');
  assert.equal((await t.act(t.g0, 'approve', { name: t.g1.name })).ok, true);
  assert.equal((await t.act(t.g0, 'leave')).err, 'transfer');
  assert.equal((await t.act(t.g0, 'transfer', { name: t.g1.name })).ok, true);
  assert.equal((await t.act(t.g0, 'kick', { name: t.g1.name })).err, 'leader');
  // 관리자가 이름을 바꿔도 길드 장부가 따라간다
  t.sql('UPDATE chars SET admin = 1 WHERE name_key = ?', '길드마');
  t.core.live.delete('길드나');
  const rn = await t.core.call('rpg_admin_rename', { p_name: '길드마', p_code: '13579', p_target: '길드나', p_new_name: '변경이름' });
  assert.equal(rn.ok, true, JSON.stringify(rn));
  const login = await t.core.call('rpg_login', { p_name: '변경이름', p_code: '13579' });
  await t.core.call('rpg_live', { p_name: '변경이름', p_token: login.token, p_sid: 'g9', p_srv: 'RPG1' });
  const me = { name: '변경이름', tok: login.token, sid: 'g9' };
  const s = await t.act(me);
  assert.equal(s.guild.leader, '변경이름');
  assert.ok(s.guild.members.some((m) => m.key === '변경이름'));
  assert.equal((await t.act(me, 'kick', { name: t.g0.name })).ok, true);
  assert.equal((await t.act(t.g0)).guild, null);
});

test('출석은 하루 한 번이며 봉헌은 원자적으로 소비하고 최대 70 이후 초과분을 돌려준다', async () => {
  const t = await setup();
  await t.create();
  assert.equal((await t.act(t.g0, 'attendance')).ok, true);
  assert.equal((await t.act(t.g0, 'attendance')).err, 'daily');
  assert.equal((await t.act(t.g0, 'donate', { n: -1 })).err, 'amount');
  assert.equal((await t.act(t.g0, 'donate', { n: 11 })).err, 'stones');
  let r = await t.act(t.g0, 'donate', { n: 10 });
  assert.equal(r.wallet.stones, 0);
  assert.equal(r.guild.exp, 10);
  t.sql('UPDATE guild_wallets SET stones = 100000 WHERE char_key = ?', '길드가');
  r = await t.act(t.g0, 'donate', { n: 999999 });
  assert.equal(r.guild.level, 70);
  assert.equal(r.guild.exp, 0);
  assert.equal(r.wallet.stones, 100000 - (25550 - 10));
  assert.equal((await t.act(t.g0, 'donate', { n: 1 })).err, 'max');
  t.clock.t += 24 * 3600 * 1000;                           // 다음 날 다시 출석(접속 표시도 다시 남긴다)
  await t.core.call('rpg_live', { p_name: t.g0.name, p_token: t.g0.tok, p_sid: t.g0.sid, p_srv: 'RPG1' });
  assert.equal((await t.act(t.g0, 'attendance')).ok, true);
});

test('토벌은 같은 서버 참여자 · 하루 3회 · 동시 한 건을 검사하고 점수와 보상을 한 번만 준다', async () => {
  const t = await setup();
  await t.create();
  await t.act(t.g0, 'invite', { name: t.g1.name });
  await t.act(t.g1, 'join');
  await t.core.call('rpg_live', { p_name: t.g1.name, p_token: t.g1.tok, p_sid: t.g1.sid, p_srv: 'RPG2' });
  const r = await t.act(t.g0, 'start', { boss: 'slime' });
  const id = r.guild.raid.id;
  assert.deepEqual(r.guild.raid.members, [t.g0.name]);
  assert.equal((await t.act(t.g0, 'start', { boss: 'phoenix' })).err, 'raid_busy');
  assert.equal((await t.act(t.g0, 'disband')).err, 'raid_busy');
  assert.equal((await t.act(t.g1, 'finish', { id, outcome: 'clear', contributors: [t.g1.name] })).err, 'target');
  assert.equal((await t.act(t.g0, 'finish', { id, outcome: 'clear', contributors: [t.g0.name] })).err, 'early');
  t.clock.t += 4000;
  assert.equal((await t.act(t.g0, 'finish', { id, outcome: 'clear', contributors: [t.g1.name] })).err, 'target');
  const clear = await t.act(t.g0, 'finish', { id, outcome: 'clear', contributors: [t.g0.name] });
  assert.equal(clear.ok, true);
  assert.equal(clear.guild.points, 100);
  assert.equal(clear.wallet.stones, 20);
  const dup = await t.act(t.g0, 'finish', { id, outcome: 'clear', contributors: [t.g0.name] });
  assert.equal(dup.guild.points, 100);
  assert.equal(dup.wallet.stones, 20);
  assert.ok(dup.already);
  for (let n = 0; n < 2; n++) {
    const s = await t.act(t.g0, 'start', { boss: 'siren' });
    assert.equal(s.ok, true);
    t.clock.t += 4000;
    await t.act(t.g0, 'finish', { id: s.guild.raid.id, outcome: 'fail' });
  }
  assert.equal((await t.act(t.g0, 'start', { boss: 'slime' })).err, 'raids');
  assert.equal((await t.act(t.g0, 'start', { boss: 'dragon' })).err, 'boss');
  assert.equal((await t.act(t.g0, 'finish', { id: 'not-a-uuid', outcome: 'fail' })).err, 'data');
});

test('토벌 제한 시간이 지나면 실패로 닫히고 보상이 없다', async () => {
  const t = await setup();
  await t.create();
  const r = await t.act(t.g0, 'start', { boss: 'slime' });
  const id = r.guild.raid.id;
  t.clock.t += 10 * 60 * 1000 + 1000;
  await t.core.call('rpg_live', { p_name: t.g0.name, p_token: t.g0.tok, p_sid: t.g0.sid, p_srv: 'RPG1' });
  const done = await t.act(t.g0, 'finish', { id, outcome: 'clear', contributors: [t.g0.name] });
  assert.equal(done.already, true);
  assert.equal(done.guild.points, 0);
  assert.equal(done.guild.raid, null);
});

test('지난주 참여자에게 한 번만 네 종류 보상을 준다', async () => {
  const t = await setup();
  const id = await t.create();
  const prev = guildWeek(t.clock.t - 7 * 86400000);
  t.sql('INSERT INTO guild_scores (week, guild_id, points) VALUES (?, ?, 100)', prev, id);
  assert.equal((await t.act(t.g0, 'claim')).err, 'reward');
  t.sql('INSERT INTO guild_credits (week, char_key, guild_id) VALUES (?, ?, ?)', prev, '길드가', id);
  const set = (n) => { const d = JSON.parse(t.get('SELECT data FROM chars WHERE name_key = ?', '길드가').data); d.bag.m.dungeon_ticket = n; t.sql('UPDATE chars SET data = ? WHERE name_key = ?', JSON.stringify(d), '길드가'); };
  set(999);
  assert.equal((await t.act(t.g0, 'claim')).err, 'capacity');
  assert.equal((await t.act(t.g0)).wallet.cores, 0);
  set(0);
  const r = await t.act(t.g0, 'claim');
  assert.equal(r.ok, true);
  assert.equal(r.reward.rank, 1);
  assert.ok(r.reward.claimed);
  assert.equal(r.wallet.cores, 5);
  assert.equal(r.wallet.stones, 100);
  const c = t.get('SELECT data, trade_seq FROM chars WHERE name_key = ?', '길드가');
  const d = JSON.parse(c.data);
  assert.equal(d.coins, 200000);
  assert.equal(d.bag.m.dungeon_ticket, 3);
  assert.equal(c.trade_seq, 2);
  assert.equal(d.ts, 2);
  assert.equal((await t.act(t.g0, 'claim')).err, 'claimed');
});

test('순위는 동점을 공동 순위로 센다', async () => {
  const t = await setup();
  const id = await t.create();
  const wk = guildWeek(t.clock.t);
  const other = 'aaaaaaaa-0000-4000-8000-000000000001', third = 'aaaaaaaa-0000-4000-8000-000000000002';
  t.sql('INSERT INTO guilds (id, name, name_key, leader, created_at) VALUES (?, ?, ?, NULL, 1), (?, ?, ?, NULL, 2)', other, '둘째길드', '둘째길드', third, '셋째길드', '셋째길드');
  t.sql('INSERT INTO guild_scores (week, guild_id, points) VALUES (?, ?, 300), (?, ?, 300), (?, ?, 100)', wk, id, wk, other, wk, third);
  const r = await t.act(t.g0);
  assert.deepEqual(r.ranks.map((x) => x.rank), [1, 1, 3]);
  assert.equal(r.ranks[0].name, '둘째길드');            // 동점이면 이름순
  assert.equal(r.directory.length, 3);
});

test('코어는 가방 저장과 분리해 소비하며 공격속도 누적 20%를 넘기지 않는다', async () => {
  const t = await setup();
  await t.create();
  await t.act(t.g0, 'attendance');
  t.sql('UPDATE guild_wallets SET cores = 45 WHERE char_key = ?', '길드가');
  for (let i = 0; i < 40; i++) assert.equal((await t.act(t.g0, 'core')).ok, true);
  const r = await t.act(t.g0);
  assert.equal(r.wallet.used, 40);
  assert.equal(r.wallet.cores, 5);
  assert.equal((await t.act(t.g0, 'core')).err, 'max');
  await t.act(t.g0, 'disband');
  const after = await t.act(t.g0);
  assert.equal(after.guild, null);
  assert.equal(after.wallet.used, 40);
});

test('거래 중에는 길드를 쓸 수 없다', async () => {
  const t = await setup();
  await t.create();
  const r = await t.core.call('rpg_trade_open', { p_name: t.g0.name, p_token: t.g0.tok, p_target: t.g1.name, p_sid: t.g0.sid });
  assert.equal(r.ok, true);
  assert.equal((await t.act(t.g0, 'attendance')).err, 'busy');
  assert.equal((await t.act(t.g0)).ok, true);                // 읽기는 된다
});
