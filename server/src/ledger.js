/* ── 장부 — Supabase(supabase/rpg.sql · feedback.sql)의 함수를 Cloudflare 에서 그대로 한다 ─────────────
   표는 D1(server/schema.sql). 함수 이름 · 받는 값(p_...) · 돌려주는 모양은 Supabase 때와 같아서 화면은 주소만 바꿨다.
   LedgerCore 는 D1 의 prepare · bind · first · all · run · batch 만 쓴다 — 시험(tools/ledger.test.mjs)은 node:sqlite 로 같은 모양을 흉내 낸다.
   Postgres 가 행 잠금으로 막던 동시 실행은 Ledger(Durable Object 하나)가 요청을 한 줄로 세워 처리해서 막는다(index.js).
   접속 중 표시(live)는 메모리에만 둔다 — 배포로 장부가 다시 뜨면 비지만 화면이 10초마다 다시 남긴다 */
import bcrypt from "bcryptjs";
import { RESET } from "../../src/game/itemData.js";

export const LIVE_SECS = 30;           // 창을 그냥 닫으면 이만큼 뒤에 풀린다(rpg_live_secs)
const LIVE_MS = LIVE_SECS * 1000;
const FAIL_MAX = 5;                    // 코드를 이만큼 틀리면
const FAIL_LOCK_MS = 10 * 60 * 1000;   // 이만큼 막는다
const DATA_MAX = 30000;                // 기록 크기 한도(바이트)
const JUMP = 15;                       // 저장 사이에 오를 수 있는 레벨(rpg_save c_jump)
const JUMP_MIN = 1;                    // 지난 저장 뒤 1분마다 더 오를 수 있는 레벨
// 코인 저장 지킴 — 지난 저장 뒤 늘 수 있는 코인 = 한 번에 몰려 드는 몫 100만 + 1분마다 50만(rpg.sql rpg_coin_cap)
const coinCap = (mins) => 1000000 + 500000 * Math.min(Math.max(Number(mins) || 0, 0), 1000000);
const COIN_BLOCK = false;              // false — 막지 않고 save_blocks 에 why 'coins' 로 남기기만 한다

/* ── 작은 도구 ─────────────────────────────────────── */
export const rpgKey = (name) => String(name == null ? "" : name).trim().replace(/\s+/g, " ").toLowerCase();
const cleanName = (name) => String(name == null ? "" : name).trim().replace(/\s+/g, " ");
const len = (s) => [...s].length;
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (t) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))));
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).length;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// jsonb 의 ->> 처럼 글자로(없거나 null 이면 null)
const txt = (v) => (v == null ? null : typeof v === "object" ? JSON.stringify(v) : String(v));
// jsonb 끼리 견주기 — 열쇠 차례와 상관없이 같은가
export function jeq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => jeq(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && jeq(a[k], b[k]));
}
export const codeOk = (c) => typeof c === "string" && /^[0-9]{5}$/.test(c) && !/^([0-9])\1{4}$/.test(c) && !"0123456789".includes(c) && !"9876543210".includes(c);
// 기록의 레벨 — 숫자 1~4자리가 아니면 1(rpg_lv)
const lvOf = (p) => { const s = txt(p && p.lv); return s !== null && /^[0-9]{1,4}$/.test(s) ? parseInt(s, 10) : 1; };
// 기록의 코인 — 없으면 0. 숫자가 아니면 null 로 돌려 저장 지킴이 걸리게 한다(rpg_coins)
const coinsOf = (p) => {
  const v = p && p.coins;
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Math.max(Math.floor(v), 0);
  return null;
};
const num = (s, re) => { const t = txt(s); return t !== null && re.test(t) ? Number(t) : 0; };

export class LedgerCore {
  constructor(db, { now = () => Date.now() } = {}) {
    this.db = db;
    this.now = now;
    this.live = new Map();             // name_key → { sid, srv, at }
  }

  /* ── D1 도우미 ── */
  q(sql, ...p) { return this.db.prepare(sql).bind(...p); }
  first(sql, ...p) { return this.q(sql, ...p).first(); }
  async rows(sql, ...p) { return (await this.q(sql, ...p).all()).results || []; }
  run(sql, ...p) { return this.q(sql, ...p).run(); }
  batch(list) { return this.db.batch(list); }

  async charRow(key) {
    const r = await this.first("SELECT * FROM chars WHERE name_key = ?", key);
    return r ? this.parse(r) : null;
  }
  parse(r) { return { ...r, data: JSON.parse(r.data), admin: !!r.admin }; }
  // 이름 + 입장권이 맞는 캐릭터
  async authChar(name, token) {
    const c = await this.charRow(rpgKey(name));
    if (!c || !c.token_hash || c.token_hash !== (await sha256(String(token == null ? "" : token)))) return null;
    return c;
  }
  liveOf(key) {
    const l = this.live.get(key);
    return l && l.at > this.now() - LIVE_MS ? l : null;
  }
  async call(fn, a) {
    const h = this[`fn_${fn}`];
    if (typeof h !== "function") return { ok: false, err: "op" };
    return h.call(this, isObj(a) ? a : {});
  }

  /* ── 틀린 횟수 — 이름마다. rpg_login · rpg_admin_ok 가 같이 쓴다 ── */
  async lockedFor(key) {
    const f = await this.first("SELECT * FROM fails WHERE name_key = ?", key);
    const now = this.now();
    return f && f.until && f.until > now ? { ok: false, err: "locked", wait: Math.ceil((f.until - now) / 1000) } : null;
  }
  async countFail(key) {
    await this.run("INSERT INTO fails (name_key, n, until) VALUES (?, 1, NULL) ON CONFLICT (name_key) DO UPDATE SET n = n + 1, until = NULL", key);
    const { n } = await this.first("SELECT n FROM fails WHERE name_key = ?", key);
    if (n >= FAIL_MAX) {
      await this.run("UPDATE fails SET n = 0, until = ? WHERE name_key = ?", this.now() + FAIL_LOCK_MS, key);
      return { ok: false, err: "locked", wait: FAIL_LOCK_MS / 1000 };
    }
    return { ok: false, err: "wrong", left: FAIL_MAX - n };
  }
  codeMatches(char, code) {
    try { return bcrypt.compareSync(String(code == null ? "" : code), char.code_hash); } catch { return false; }
  }

  /* ── 계정 ──────────────────────────────────────── */
  async fn_rpg_name_free(a) {
    return !(await this.first("SELECT 1 AS x FROM chars WHERE name_key = ?", rpgKey(a.p_name)));
  }
  // 새 캐릭터 — 입장권을 돌려준다
  async fn_rpg_create(a) {
    const name = cleanName(a.p_name);
    if (len(name) < 1 || len(name) > 8) return { ok: false, err: "name" };
    if (!codeOk(a.p_code)) return { ok: false, err: "code" };
    if (!isObj(a.p_data) || bytes(a.p_data) > DATA_MAX) return { ok: false, err: "data" };
    const tok = randHex(16), now = this.now();
    const r = await this.run(
      "INSERT INTO chars (name_key, name, code_hash, token_hash, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (name_key) DO NOTHING",
      rpgKey(name), name, bcrypt.hashSync(a.p_code, 8), await sha256(tok), JSON.stringify(a.p_data), now, now);
    if (!r.meta.changes) return { ok: false, err: "taken" };
    return { ok: true, token: tok, name };
  }
  // 이어 하기 — 맞으면 새 입장권과 저장된 기록을 준다. 먼저 들어와 있던 기기의 입장권은 이때 무효가 된다
  async fn_rpg_login(a) {
    const key = rpgKey(a.p_name);
    const lock = await this.lockedFor(key);
    if (lock) return lock;
    const c = await this.charRow(key);
    if (c && this.codeMatches(c, a.p_code)) {
      await this.run("UPDATE fails SET n = 0, until = NULL WHERE name_key = ?", key);
      // 다른 창 · 기기가 지금 접속 중이면 입장권을 바꾸지 않는다(바꾸면 그쪽 저장이 끊긴다)
      const l = this.liveOf(key);
      if (l) return { ok: false, err: "live", srv: l.srv, wait: Math.ceil((l.at + LIVE_MS - this.now()) / 1000) };
      const tok = randHex(16);
      await this.run("UPDATE chars SET token_hash = ? WHERE name_key = ?", await sha256(tok), key);
      return { ok: true, token: tok, name: c.name, data: c.data, admin: c.admin };
    }
    return this.countFail(key);   // 이름이 없어도 똑같이 "틀림"으로 센다
  }
  async fn_rpg_delete(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const k = c.name_key;
    await this.batch([
      this.q("DELETE FROM chars WHERE name_key = ?", k), this.q("DELETE FROM fails WHERE name_key = ?", k),
      this.q("DELETE FROM guild_members WHERE char_key = ?", k), this.q("DELETE FROM guild_wallets WHERE char_key = ?", k),
      this.q("DELETE FROM guild_requests WHERE char_key = ?", k), this.q("DELETE FROM guild_credits WHERE char_key = ?", k),
      this.q("DELETE FROM guild_claims WHERE char_key = ?", k), this.q("UPDATE guilds SET leader = NULL WHERE leader = ?", k),
    ]);
    this.live.delete(k);
    return { ok: true };
  }
  // 명예 순위 — 저장된 기록(data)의 honor 가 높은 순. 서버 초기화(itemData.js RESET) 뒤 아직 들어오지 않은 캐릭터의 옛 명예는 뺀다. 관리자는 늘 보인다
  async fn_rpg_honor_top(a) {
    const lim = Math.min(Math.max(Math.floor(Number(a.p_limit)) || 20, 1), 50);
    const out = [];
    for (const r of await this.rows("SELECT name, data, admin, updated_at FROM chars")) {
      const d = JSON.parse(r.data), honor = num(d.honor, /^[0-9]{1,9}$/);
      if (!(honor > 0) || !(r.admin || txt(d.rs) === RESET.id)) continue;
      out.push({ name: r.name, honor, lv: num(d.lv, /^[0-9]{1,3}$/) || 1, at: r.updated_at });
    }
    out.sort((x, y) => y.honor - x.honor || x.at - y.at);
    return out.slice(0, lim).map(({ name, honor, lv }) => ({ name, honor, lv }));
  }

  /* ── 접속 중 표시 — 한 캐릭터는 한 곳(한 서버 · 한 창)에서만 ── */
  async fn_rpg_live(a) {
    if (!/^[a-z0-9]{1,16}$/.test(String(a.p_sid || "")) || !/^[A-Z0-9]{1,8}$/.test(String(a.p_srv || ""))) return { ok: false, err: "bad" };
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const l = this.liveOf(c.name_key);
    if (l && l.sid !== a.p_sid) return { ok: false, err: "live", srv: l.srv, wait: Math.ceil((l.at + LIVE_MS - this.now()) / 1000) };
    this.live.set(c.name_key, { sid: a.p_sid, srv: a.p_srv, at: this.now() });
    return { ok: true, ts: c.trade_seq || 0 };
  }
  async fn_rpg_unlive(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    const l = c && this.live.get(c.name_key);
    if (l && l.sid === a.p_sid) this.live.delete(c.name_key);
    return { ok: true };
  }

  /* ── 거래 장부와 맞물린 저장 막이(trade.sql rpg_trade_save_guard) ──
     기록이 바뀔 때만 건다. 거래 뒤에는 이전 차례(ts)의 저장을 받지 않고, 확인한 거래 중에는 막고, 거래로 옮긴 장비가 되살아나는 저장도 막는다 */
  async fence(c, next) {
    if (jeq(next, c.data)) return null;
    if (String(next.ts == null ? "0" : next.ts) !== String(c.trade_seq || 0)) return "stale";
    if (c.trade_id) {
      const t = await this.first("SELECT * FROM trades WHERE id = ?", c.trade_id);
      if (t) {
        const i = t.a === c.name_key ? 0 : 1;
        if (t.state === "open" && t.until > this.now() && JSON.parse(t.accepted)[i] === true) return "busy";
      }
    }
    const pg = Array.isArray(next.bag && next.bag.pg) ? next.bag.pg : [];
    for (const m of await this.rows("SELECT * FROM trade_moves WHERE owner = ?", c.name_key)) {
      if (txt(m.reset_id) !== txt(next.rs) || !jeq(m.rollback_ids == null ? [] : JSON.parse(m.rollback_ids), pg)) continue;
      const list = next.bag && Array.isArray(next.bag[m.kind]) ? next.bag[m.kind] : [];
      const item = JSON.parse(m.item);
      if (list.some((x) => x && String(x.u) === String(m.u) && jeq(x, item))) return "moved";
    }
    return null;
  }
  // 막이에 걸렸을 때의 답. moved 는 로그에 남긴다
  async fenceFail(err, name) {
    if (err === "moved") await this.run("INSERT INTO save_blocks (at, name, why) VALUES (?, ?, 'moved')", this.now(), String(name == null ? "" : name));
    return { ok: false, err };
  }

  /* ── 저장 ──────────────────────────────────────── */
  // 입장권이 맞아야 한다. 다른 기기가 나중에 들어왔으면 'token' 으로 거절한다.
  // 저장 지킴(관리자 제외): 렉으로 방장이 여럿 생기면 남의 영웅이 내 자리에 실려 저장될 수 있다(10월 19일 13명 사고).
  //   기록 이름이 다르거나, 레벨이 내려가거나(서버 초기화 · 한 사람 되돌리기 제외), 지난 저장보다 너무 많이 뛰면 막는다.
  //   막으면 save_blocks 에 남기고 이 기기의 입장권을 지운다 — 코드를 다시 넣으면 서버 기록으로 이어 한다
  async fn_rpg_save(a) {
    const p = a.p_data;
    if (!isObj(p) || bytes(p) > DATA_MAX) return { ok: false, err: "data" };
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const now = this.now();
    let note = null;                                   // 막지 않고 남기기만 하는 기록(코인)
    if (!c.admin) {
      const old = c.data, vOld = lvOf(old), vNew = lvOf(p);
      const oldPg = Array.isArray(old.bag && old.bag.pg) ? old.bag.pg.filter((x) => typeof x === "string") : [];
      const newPg = Array.isArray(p.bag && p.bag.pg) ? p.bag.pg : [];
      // 서버 초기화(rs) · 한 사람 되돌리기(bag.pg 새 id) — 기록이 일부러 바뀌었다
      const fresh = txt(p.rs) !== txt(old.rs) || newPg.some((x) => !oldPg.includes(String(x)));
      const cOld = coinsOf(old) ?? 0, cNew = coinsOf(p);
      const cShown = cNew !== null ? Math.min(cNew, 9e18) : null;
      const mins = (now - c.updated_at) / 60000;
      let why = null;
      if (Object.hasOwn(p, "name") && rpgKey(txt(p.name)) !== c.name_key) why = "name";
      else if (vNew < vOld && !fresh) why = "down";
      else if (vNew > vOld + JUMP + Math.floor(mins * JUMP_MIN)) why = "jump";
      else if (!fresh && (cNew === null || cNew > cOld + coinCap(mins))) {
        if (COIN_BLOCK) why = "coins";
        else note = ["coins", c.name, vOld, vNew, txt(p.name) == null ? "" : txt(p.name).slice(0, 16), cOld, cShown];
      }
      if (why) {
        await this.batch([
          this.q("INSERT INTO save_blocks (at, name, why, lv_old, lv_new, sent, coins_old, coins_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            now, c.name, why, vOld, vNew, txt(p.name) == null ? "" : txt(p.name).slice(0, 16), why === "coins" ? cOld : null, why === "coins" ? cShown : null),
          this.q("UPDATE chars SET token_hash = NULL WHERE name_key = ?", c.name_key),
        ]);
        return { ok: false, err: "guard", why };
      }
    }
    const bad = await this.fence(c, p);
    if (bad) return this.fenceFail(bad, a.p_name);
    const list = [this.q("UPDATE chars SET data = ?, updated_at = ? WHERE name_key = ?", JSON.stringify(p), now, c.name_key)];
    if (note) list.unshift(this.q("INSERT INTO save_blocks (at, name, why, lv_old, lv_new, sent, coins_old, coins_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", now, note[1], note[0], note[2], note[3], note[4], note[5], note[6]));
    await this.batch(list);
    return { ok: true };
  }
  // 거래 뒤 기록을 다시 불러온다 — 입장권은 싣지 않는다
  async fn_rpg_load(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    return { ok: true, name: c.name, admin: c.admin, ts: c.trade_seq || 0, data: { ...c.data, ts: c.trade_seq || 0 } };
  }
  /* RPG 전용 서버(RpgRoom)만 부르는 불러오기 · 저장 — 밖에서 들어오는 길(/rpc)에는 열지 않는다(index.js) */
  async fn_rpg_srv_load(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    return { ok: true, name: c.name, data: c.data, admin: c.admin };
  }
  async fn_rpg_srv_save(a) {
    const p = a.p_data;
    if (!isObj(p) || bytes(p) > DATA_MAX) return { ok: false, err: "data" };
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const bad = await this.fence(c, p);
    if (bad) return this.fenceFail(bad, a.p_name);
    await this.run("UPDATE chars SET data = ?, updated_at = ? WHERE name_key = ?", JSON.stringify(p), this.now(), c.name_key);
    return { ok: true };
  }

  /* ── 의견 남기기 — 적는 것만 열려 있다(feedback 표의 검사와 같다) ── */
  async fn_feedback_insert(a) {
    const body = String(a.body == null ? "" : a.body).trim();
    const cut = (v, n) => (v == null ? null : String(v).slice(0, n));
    const small = (v) => (Number.isFinite(v) && v >= 0 && v <= 500 ? Math.round(v) : null);
    if (len(body) < 1 || len(body) > 2000) return { ok: false, err: "body" };
    const result = ["lobby", "play", "clear", "over", "wipe"].includes(a.result) ? a.result : null;
    await this.run("INSERT INTO feedback (created_at, body, name, room, result, wave, total, diff, cls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      this.now(), body, cut(a.name, 40), cut(a.room, 8), result, small(a.wave), small(a.total), cut(a.diff, 16), cut(a.cls, 16));
    return { ok: true };
  }

  /* ── 관리 화면(?admin) — 관리자 이름 + 코드로만 열린다 ───────────── */
  // 틀린 횟수는 이어 하기와 같은 표로 센다(5번 틀리면 10분)
  async fn_rpg_admin_ok(a) {
    const key = rpgKey(a.p_name);
    const lock = await this.lockedFor(key);
    if (lock) return lock;
    const c = await this.charRow(key);
    if (c && c.admin && this.codeMatches(c, a.p_code)) {
      await this.run("UPDATE fails SET n = 0, until = NULL WHERE name_key = ?", key);
      return { ok: true, name: c.name };
    }
    return this.countFail(key);
  }
  // 명령 표 만들기 — 60초 안에 한 번만 쓸 수 있다
  async fn_rpg_admin_ticket(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    if (!/^RPG[1-5]$/.test(String(a.p_server || "")) || !["host", "kick"].includes(a.p_act) || !/^[a-z0-9]{1,16}$/.test(String(a.p_target || ""))) return { ok: false, err: "bad" };
    const nonce = randHex(16);
    await this.run(
      "INSERT INTO admin_tickets (server, nonce_hash, act, target, until, used) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT (server) DO UPDATE SET nonce_hash = excluded.nonce_hash, act = excluded.act, target = excluded.target, until = excluded.until, used = 0",
      a.p_server, await sha256(nonce), a.p_act, a.p_target, this.now() + 60000);
    return { ok: true, nonce };
  }
  // 명령 표 쓰기 — 방장 화면이 부른다. 맞으면 true, 그 뒤로는 다시 쓸 수 없다
  async fn_rpg_admin_redeem(a) {
    const r = await this.run("UPDATE admin_tickets SET used = 1 WHERE server = ? AND nonce_hash = ? AND act = ? AND target = ? AND used = 0 AND until > ?",
      a.p_server ?? null, await sha256(String(a.p_nonce == null ? "" : a.p_nonce)), a.p_act ?? null, a.p_target ?? null, this.now());
    return r.meta.changes > 0;
  }
  // 저장 지킴에 막힌 기록(최근 100개)
  async fn_rpg_admin_blocks(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    const list = (await this.rows("SELECT * FROM save_blocks ORDER BY id DESC LIMIT 100")).map((b) => ({
      at: iso(b.at), name: b.name, why: b.why, old: b.lv_old, new: b.lv_new, sent: b.sent, cold: b.coins_old, cnew: b.coins_new,
    }));
    return { ok: true, list };
  }
  // "계정" 탭 — 모든 캐릭터(최근 저장 순). 코드 · 입장권은 싣지 않는다
  async fn_rpg_admin_accounts(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    const list = (await this.rows("SELECT * FROM chars ORDER BY updated_at DESC LIMIT 2000")).map((r) => {
      const d = JSON.parse(r.data), l = this.liveOf(r.name_key);
      return {
        name: r.name, admin: !!r.admin, lv: lvOf(d), job: txt(d.job),
        coins: num(d.coins, /^[0-9]{1,12}$/), honor: num(d.honor, /^[0-9]{1,9}$/),
        made: iso(r.created_at), saved: iso(r.updated_at), live: l ? l.srv : null,
      };
    });
    return { ok: true, list };
  }
  // 관리자 계정 이름 변경 — 계정 기록 · 코드 · 관리자 권한을 보존한다. 길드 표의 이름 열쇠도 같이 고친다
  async fn_rpg_admin_rename(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    const name = cleanName(a.p_new_name), key = rpgKey(name);
    if (len(name) < 1 || len(name) > 8 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) return { ok: false, err: "name" };
    const c = await this.charRow(rpgKey(a.p_target));
    if (!c) return { ok: false, err: "missing" };
    if (c.name === name) return { ok: false, err: "same" };
    if (this.liveOf(c.name_key)) return { ok: false, err: "live" };
    if (key !== c.name_key && (await this.first("SELECT 1 AS x FROM chars WHERE name_key = ?", key))) return { ok: false, err: "taken" };
    const old = c.name_key;
    await this.batch([
      this.q("UPDATE chars SET name_key = ?, name = ?, data = ?, token_hash = NULL WHERE name_key = ?", key, name, JSON.stringify({ ...c.data, name }), old),
      this.q("DELETE FROM fails WHERE name_key IN (?, ?)", old, key),
      this.q("UPDATE guild_members SET char_key = ? WHERE char_key = ?", key, old),
      this.q("UPDATE guild_wallets SET char_key = ? WHERE char_key = ?", key, old),
      this.q("UPDATE guild_requests SET char_key = ? WHERE char_key = ?", key, old),
      this.q("UPDATE guild_credits SET char_key = ? WHERE char_key = ?", key, old),
      this.q("UPDATE guild_claims SET char_key = ? WHERE char_key = ?", key, old),
      this.q("UPDATE guilds SET leader = ? WHERE leader = ?", key, old),
    ]);
    this.live.delete(old);
    return { ok: true, name };
  }
  // "문의" 탭 — 받은 글을 최근 순으로(최근 300개)
  async fn_rpg_admin_feedback(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    const list = (await this.rows("SELECT * FROM feedback ORDER BY id DESC LIMIT 300")).map((f) => ({
      id: f.id, at: iso(f.created_at), body: f.body, name: f.name, room: f.room, result: f.result, wave: f.wave, total: f.total, diff: f.diff, cls: f.cls,
    }));
    return { ok: true, list };
  }
  // "거래" 탭 — 최근 100건
  async fn_rpg_admin_trades(a) {
    const ok = await this.fn_rpg_admin_ok(a);
    if (!ok.ok) return ok;
    const list = (await this.rows("SELECT * FROM trades ORDER BY created_at DESC LIMIT 100")).map((t) => ({
      ...t, offers: JSON.parse(t.offers), accepted: JSON.parse(t.accepted),
      created_at: iso(t.created_at), until: iso(t.until), finished_at: iso(t.finished_at),
    }));
    return { ok: true, list };
  }

  /* ── 거래 · 길드 — 2단계에서 옮긴다(지금은 점검 중으로 답한다) ── */
  async fn_rpg_trade_open() { return { ok: false, err: "maint" }; }
  async fn_rpg_trade_action() { return { ok: false, err: "maint" }; }
  async fn_rpg_guild_action() { return { ok: false, err: "maint" }; }
}
