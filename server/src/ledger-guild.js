/* ── 길드 — supabase/guild.sql 의 rpg_guild_week · rpg_guild_rank · rpg_guild_view · rpg_guild_action 을 그대로 옮긴 것 ──
   오류 이름 · 답 모양은 guild.sql 과 같다(화면 useGuild.js 의 ERR 표가 그대로 맞는다). 주(week)는 한국 시간 월요일 0시에 갈린다.
   행 잠금은 장부(Durable Object 하나)가 요청을 한 줄로 세워서 대신한다. 쓰기는 D1 batch 한 번으로 모아 반만 반영되는 일이 없다 */
import { rpgKey, isObj, txt, lvOf, iso } from "./ledger-util.js";

const KST_MS = 9 * 3600 * 1000;
const DAY_MS = 86400000;
const MEMBER_MAX = 4;                           // 길드 정원
const LEVEL_MAX = 70;                           // 성전 최고 단계
const USED_MAX = 40;                            // 코어로 올릴 수 있는 횟수(공속 0.5% × 40 = 20%)
const CREATE_LV = 50;                           // 길드를 만들 수 있는 레벨
const CREATE_COINS = 50000;                     // 길드 생성비
const RAIDS_PER_DAY = 3;                        // 길드 전체가 하루에 시작할 수 있는 토벌
const RAID_MS = 10 * 60 * 1000;                 // 토벌 제한 시간
const RAID_EARLY_MS = 3000;                     // 시작하고 이 안에 처치로 보고하면 early
const REQUEST_MS = DAY_MS;                      // 초대 · 가입 신청이 남는 시간
const TICKET_MAX = 999;                         // 던전 입장권 한 칸 최대
const BOSSES = { slime: { pts: 100, stones: 20 }, siren: { pts: 180, stones: 35 }, phoenix: { pts: 300, stones: 50 } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const err = (e) => ({ ok: false, err: e });

/* ── 한국 시간 날짜 ── */
const addDays = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
export const kstDay = (ms) => new Date(ms + KST_MS).toISOString().slice(0, 10);
export function guildWeek(ms) {
  const k = new Date(ms + KST_MS), mon = (k.getUTCDay() + 6) % 7;       // 월요일이 0
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - mon)).toISOString().slice(0, 10);
}
const kstStart = (day) => Date.parse(`${day}T00:00:00Z`) - KST_MS;      // 그 날 한국 시간 0시의 순간

export const guildMethods = {
  // 주간 순위 — 점수 높은 순, 동점은 공동 순위(rank())
  async guildRank(week) {
    const rows = await this.rows("SELECT s.guild_id AS guild_id, g.name AS name, s.points AS points FROM guild_scores s JOIN guilds g ON g.id = s.guild_id WHERE s.week = ? AND s.points > 0 ORDER BY s.points DESC", week);
    return rows.map((r) => ({ ...r, rank: 1 + rows.filter((x) => x.points > r.points).length }));
  },

  async guildView(key) {
    const now = this.now(), wk = guildWeek(now), prev = addDays(wk, -7), today = kstDay(now);
    const mem = await this.first("SELECT guild_id FROM guild_members WHERE char_key = ?", key);
    const gid = mem ? mem.guild_id : null;
    const g = gid ? await this.first("SELECT * FROM guilds WHERE id = ?", gid) : null;
    const w = await this.first("SELECT * FROM guild_wallets WHERE char_key = ?", key);
    const prevRank = await this.guildRank(prev);
    const mine = (await this.rows("SELECT guild_id FROM guild_credits WHERE week = ? AND char_key = ?", prev, key)).map((r) => prevRank.find((x) => x.guild_id === r.guild_id)).filter(Boolean);
    const best = mine.length ? Math.min(...mine.map((x) => x.rank)) : null;
    const me = await this.first("SELECT trade_seq FROM chars WHERE name_key = ?", key);
    let guild = null;
    if (g) {
      const members = (await this.rows("SELECT m.char_key AS key, c.name AS name, c.data AS data FROM guild_members m JOIN chars c ON c.name_key = m.char_key WHERE m.guild_id = ? ORDER BY m.joined_at, m.rowid", gid))
        .map((m) => ({ key: m.key, name: m.name, lv: lvOf(JSON.parse(m.data)), server: this.liveOf(m.key)?.srv ?? null }));
      const requests = g.leader === key
        ? await this.rows("SELECT q.char_key AS key, c.name AS name FROM guild_requests q JOIN chars c ON c.name_key = q.char_key WHERE q.guild_id = ? AND q.kind = 'apply' AND q.expires > ?", gid, now)
        : [];
      const used = (await this.first("SELECT COUNT(*) AS n FROM guild_raids WHERE guild_id = ? AND started_at >= ?", gid, kstStart(today))).n;
      const r = await this.first("SELECT * FROM guild_raids WHERE guild_id = ? AND state = 'fight' AND expires > ?", gid, now);
      const pts = await this.first("SELECT points FROM guild_scores WHERE week = ? AND guild_id = ?", wk, gid);
      guild = {
        id: g.id, name: g.name, leader: g.leader, level: g.level, exp: g.exp, members, requests, used,
        raid: r ? { id: r.id, guild: r.guild_id, boss: r.boss, server: r.server, members: JSON.parse(r.participants), expires: r.expires } : null,
        points: pts ? pts.points : 0,
      };
    }
    const invites = await this.rows("SELECT x.id AS id, x.name AS name FROM guild_requests q JOIN guilds x ON x.id = q.guild_id WHERE q.char_key = ? AND q.kind = 'invite' AND q.expires > ? AND x.disbanded = 0", key, now);
    const directory = await this.rows("SELECT x.id AS id, x.name AS name, x.level AS level, (SELECT COUNT(*) FROM guild_members m WHERE m.guild_id = x.id) AS members FROM guilds x WHERE x.disbanded = 0 ORDER BY x.created_at DESC LIMIT 30");
    const ranks = (await this.guildRank(wk)).sort((x, y) => x.rank - y.rank || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0)).slice(0, 30);
    return {
      ok: true, charTs: me ? me.trade_seq : 0, week: wk, reset: iso(kstStart(addDays(wk, 7))),
      wallet: { stones: w ? w.stones : 0, cores: w ? w.cores : 0, used: w ? w.used : 0, checked: !!w && w.attendance === today },
      guild, invites, directory, ranks,
      reward: best === null ? null : { week: prev, rank: best, claimed: !!(await this.first("SELECT 1 AS x FROM guild_claims WHERE week = ? AND char_key = ?", prev, key)) },
    };
  },

  async fn_rpg_guild_action(a) {
    const op = a.p_op || "get", args = isObj(a.p_args) ? a.p_args : {};
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return err("token");
    const k = c.name_key, now = this.now();
    const lv = this.liveOf(k);
    if (!lv || lv.sid !== a.p_sid || !/^RPG[1-4]$/.test(lv.srv)) return err("live");
    if (op === "get") return this.guildView(k);
    if (op === "finish" || op === "apply") if (!UUID.test(txt(args.id) || "")) return err("data");
    // 거래 중에는 쓰지 못한다
    if (c.trade_id && await this.first("SELECT 1 AS x FROM trades WHERE id = ? AND state IN ('invite','open') AND until > ?", c.trade_id, now)) return err("busy");
    await this.run("UPDATE guild_raids SET state = 'fail', finished_at = ? WHERE state = 'fight' AND expires <= ?", now, now);
    const wk = guildWeek(now), day = kstDay(now);
    const mem = await this.first("SELECT guild_id FROM guild_members WHERE char_key = ?", k);
    let gid = mem ? mem.guild_id : null;
    let g = gid ? await this.first("SELECT * FROM guilds WHERE id = ?", gid) : null;
    await this.run("INSERT OR IGNORE INTO guild_wallets (char_key) VALUES (?)", k);
    const wallet = await this.first("SELECT * FROM guild_wallets WHERE char_key = ?", k);
    const target = rpgKey(txt(args.name) || "");
    const w = [];                                     // 이 동작의 쓰기 — 끝에 한 번에 보낸다
    const count = async (id) => (await this.first("SELECT COUNT(*) AS n FROM guild_members WHERE guild_id = ?", id)).n;
    const active = async () => !!(await this.first("SELECT 1 AS x FROM guild_raids WHERE guild_id = ? AND state = 'fight'", gid));
    let changed = false;

    if (op === "create") {
      const nm = String(txt(args.name) || "").trim().replace(/\s+/g, " ");
      if ([...nm].length < 2 || [...nm].length > 12 || /[\u0000-\u001f\u007f-\u009f]/.test(nm)) return err("name");
      if (gid) return err("member");
      if (lvOf(c.data) < CREATE_LV) return err("level");
      const coins = Number(c.data.coins) || 0;
      if (coins < CREATE_COINS) return err("funds");
      const id = crypto.randomUUID();
      w.push(
        this.q("INSERT INTO guilds (id, name, name_key, leader, created_at) VALUES (?, ?, ?, ?, ?)", id, nm, rpgKey(nm), k, now),
        this.q("INSERT INTO guild_members (char_key, guild_id, joined_at) VALUES (?, ?, ?)", k, id, now),
        this.q("UPDATE chars SET data = ?, trade_seq = trade_seq + 1, updated_at = ? WHERE name_key = ?", JSON.stringify({ ...c.data, coins: coins - CREATE_COINS, ts: c.trade_seq + 1 }), now, k),
      );
      changed = true;
    } else if (op === "apply") {
      if (gid) return err("member");
      const x = await this.first("SELECT * FROM guilds WHERE id = ? AND disbanded = 0", args.id);
      if (!x) return err("missing");
      if (await count(x.id) >= MEMBER_MAX) return err("full");
      w.push(this.q("INSERT INTO guild_requests (char_key, guild_id, kind, expires) VALUES (?, ?, 'apply', ?) ON CONFLICT (char_key) DO UPDATE SET guild_id = excluded.guild_id, kind = 'apply', expires = excluded.expires", k, x.id, now + REQUEST_MS));
    } else if (op === "invite") {
      if (!gid || g.leader !== k) return err("leader");
      if (!(await this.first("SELECT 1 AS x FROM chars WHERE name_key = ?", target))) return err("account");
      if (await this.first("SELECT 1 AS x FROM guild_members WHERE char_key = ?", target)) return err("member");
      if (await count(gid) >= MEMBER_MAX) return err("full");
      w.push(this.q("INSERT INTO guild_requests (char_key, guild_id, kind, expires) VALUES (?, ?, 'invite', ?) ON CONFLICT (char_key) DO UPDATE SET guild_id = excluded.guild_id, kind = 'invite', expires = excluded.expires", target, gid, now + REQUEST_MS));
    } else if (op === "join" || op === "approve") {
      const who = op === "join" ? k : target;
      if (op === "approve" && (!gid || g.leader !== k)) return err("leader");
      const req = await this.first("SELECT * FROM guild_requests WHERE char_key = ? AND expires > ? AND kind = ?", who, now, op === "join" ? "invite" : "apply");
      if (!req || (op === "approve" && req.guild_id !== gid)) return err("request");
      const x = await this.first("SELECT * FROM guilds WHERE id = ? AND disbanded = 0", req.guild_id);
      if (!x) return err("missing");
      if (await this.first("SELECT 1 AS x FROM guild_members WHERE char_key = ?", who)) return err("member");
      if (await count(x.id) >= MEMBER_MAX) return err("full");
      w.push(this.q("INSERT INTO guild_members (char_key, guild_id, joined_at) VALUES (?, ?, ?)", who, x.id, now), this.q("DELETE FROM guild_requests WHERE char_key = ?", who));
    } else if (op === "leave" || op === "kick" || op === "transfer" || op === "disband") {
      if (!gid) return err("member");
      if (await active()) return err("raid_busy");
      if (op === "leave") {
        if (g.leader === k && await count(gid) > 1) return err("transfer");
        w.push(this.q("DELETE FROM guild_members WHERE char_key = ?", k));
        if (g.leader === k) w.push(this.q("UPDATE guilds SET disbanded = 1 WHERE id = ?", gid));
      } else {
        if (g.leader && g.leader !== k) return err("leader");
        if (op === "disband") w.push(this.q("UPDATE guilds SET disbanded = 1 WHERE id = ?", gid), this.q("DELETE FROM guild_members WHERE guild_id = ?", gid));
        else {
          if (target === k || !(await this.first("SELECT 1 AS x FROM guild_members WHERE char_key = ? AND guild_id = ?", target, gid))) return err("target");
          w.push(op === "kick" ? this.q("DELETE FROM guild_members WHERE char_key = ?", target) : this.q("UPDATE guilds SET leader = ? WHERE id = ?", target, gid));
        }
      }
    } else if (op === "attendance") {
      if (!gid) return err("member");
      if (wallet.attendance === day) return err("daily");
      w.push(this.q("UPDATE guild_wallets SET stones = stones + 10, attendance = ? WHERE char_key = ?", day, k));
    } else if (op === "donate") {
      if (!gid) return err("member");
      if (!/^[1-9][0-9]{0,5}$/.test(txt(args.n) || "")) return err("amount");
      if (g.level >= LEVEL_MAX) return err("max");
      // 최고 단계까지 남은 몫을 넘는 봉헌은 잘라 낸다(초과분은 지갑에 남는다)
      const n = Math.min(Number(txt(args.n)), Math.trunc((LEVEL_MAX - g.level) * (20 + g.level * 10 + (20 + (LEVEL_MAX - 1) * 10)) / 2) - g.exp);
      if (wallet.stones < n) return err("stones");
      let exp = g.exp + n, level = g.level;
      while (level < LEVEL_MAX && exp >= 20 + level * 10) { exp -= 20 + level * 10; level += 1; }
      w.push(this.q("UPDATE guild_wallets SET stones = stones - ? WHERE char_key = ?", n, k), this.q("UPDATE guilds SET exp = ?, level = ? WHERE id = ?", exp, level, gid));
    } else if (op === "core") {
      if (wallet.used >= USED_MAX) return err("max");
      if (wallet.cores < 1) return err("cores");
      w.push(this.q("UPDATE guild_wallets SET cores = cores - 1, used = used + 1 WHERE char_key = ?", k));
    } else if (op === "start") {
      if (!gid) return err("member");
      if (!Object.hasOwn(BOSSES, txt(args.boss) || "")) return err("boss");
      if (await active()) return err("raid_busy");
      if ((await this.first("SELECT COUNT(*) AS n FROM guild_raids WHERE guild_id = ? AND started_at >= ?", gid, kstStart(day))).n >= RAIDS_PER_DAY) return err("raids");
      const members = (await this.rows("SELECT char_key FROM guild_members WHERE guild_id = ? ORDER BY joined_at, rowid", gid)).map((m) => m.char_key);
      const participants = members.filter((m) => this.liveOf(m)?.srv === lv.srv);
      w.push(this.q("INSERT INTO guild_raids (id, guild_id, boss, server, participants, started_at, expires) VALUES (?, ?, ?, ?, ?, ?, ?)", crypto.randomUUID(), gid, args.boss, lv.srv, JSON.stringify(participants), now, now + RAID_MS));
    } else if (op === "finish") {
      const raid = await this.first("SELECT * FROM guild_raids WHERE id = ?", args.id);
      const parts = raid ? JSON.parse(raid.participants) : [];
      if (!raid || !parts.includes(k) || raid.server !== lv.srv) return err("target");
      if (raid.state !== "fight") return { ...(await this.guildView(k)), settled: true, already: true };
      const outcome = txt(args.outcome);
      if (outcome !== "clear" && outcome !== "fail") return err("state");
      if (outcome === "clear" && now < raid.started_at + RAID_EARLY_MS) return err("early");
      const by = args.contributors;
      if (outcome === "clear" && (!Array.isArray(by) || !by.length || !by.every((x) => parts.includes(x)))) return err("target");
      w.push(this.q("UPDATE guild_raids SET state = ?, finished_at = ? WHERE id = ?", outcome, now, raid.id));
      if (outcome === "clear" && raid.expires > now) {
        const boss = BOSSES[raid.boss];
        // 처치가 확정된 주에 집계해 끝난 주의 보상이 바뀌지 않는다
        w.push(this.q("INSERT INTO guild_scores (week, guild_id, points) VALUES (?, ?, ?) ON CONFLICT (week, guild_id) DO UPDATE SET points = points + excluded.points", wk, raid.guild_id, boss.pts));
        // 실제 전투에 기여한 최초 참여자만 받는다. 중복 보고는 raid.state 로 막는다
        for (const who of parts) {
          if (!by.includes(who) || !(await this.first("SELECT 1 AS x FROM guild_members WHERE char_key = ? AND guild_id = ?", who, raid.guild_id))) continue;
          w.push(
            this.q("INSERT INTO guild_wallets (char_key, stones) VALUES (?, ?) ON CONFLICT (char_key) DO UPDATE SET stones = stones + excluded.stones", who, boss.stones),
            this.q("INSERT OR IGNORE INTO guild_credits (week, char_key, guild_id) VALUES (?, ?, ?)", wk, who, raid.guild_id),
          );
        }
      }
    } else if (op === "claim") {
      const last = addDays(wk, -7);
      const rank = await this.guildRank(last);
      const credits = (await this.rows("SELECT guild_id FROM guild_credits WHERE week = ? AND char_key = ?", last, k)).map((r) => rank.find((x) => x.guild_id === r.guild_id)).filter(Boolean);
      if (!credits.length) return err("reward");
      if (await this.first("SELECT 1 AS x FROM guild_claims WHERE week = ? AND char_key = ?", last, k)) return err("claimed");
      const rnk = Math.min(...credits.map((x) => x.rank));
      const cores = rnk === 1 ? 5 : rnk <= 3 ? 3 : rnk <= 10 ? 2 : 1;
      const coin = rnk === 1 ? 150000 : rnk <= 3 ? 100000 : rnk <= 10 ? 70000 : 50000;
      const stones = rnk === 1 ? 100 : rnk <= 3 ? 70 : rnk <= 10 ? 50 : 30;
      const tickets = rnk <= 3 ? 3 : 1;
      const bag = isObj(c.data.bag) ? c.data.bag : {}, m = isObj(bag.m) ? bag.m : {};
      const have = Number(m.dungeon_ticket) || 0;
      if (have + tickets > TICKET_MAX) return err("capacity");
      const data = { ...c.data, coins: (Number(c.data.coins) || 0) + coin, ts: c.trade_seq + 1, bag: { ...bag, m: { ...m, dungeon_ticket: have + tickets } } };
      w.push(
        this.q("INSERT INTO guild_claims (week, char_key, rank) VALUES (?, ?, ?)", last, k, rnk),
        this.q("UPDATE guild_wallets SET cores = cores + ?, stones = stones + ? WHERE char_key = ?", cores, stones, k),
        this.q("UPDATE chars SET data = ?, trade_seq = trade_seq + 1, updated_at = ? WHERE name_key = ?", JSON.stringify(data), now, k),
      );
      changed = true;
    } else return err("op");

    if (w.length) {
      try { await this.batch(w); }
      catch (e) {
        if (/UNIQUE|constraint/i.test(String(e && e.message))) return err("taken");
        throw e;
      }
    }
    return { ...(await this.guildView(k)), changed, settled: op === "finish" };
  },
};
