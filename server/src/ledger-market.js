/* ── 광장 장터 게시판 — 올려 두면 나중에 팔리는 칸(1:1 거래와 따로) ──
   함수 하나 rpg_market(p_op: get · post · buy · cancel · claim). 수치는 src/game/marketData.js 의 MARKET 한 곳.
   - 올리기: 물건을 가방에서 빼 market 표에 둔다. 사기: 산 사람 가방에 넣고 대금(수수료를 뗀 값)은 판매자 보관함(market_box)에 쌓는다.
     판매자 기록은 팔리는 순간 건드리지 않는다 — 접속 중인 판매자의 10초 저장과 겹치지 않게. 판매자가 게시판에서 "받기"로 가져간다
   - 기간이 지난 물건 · 취소했는데 가방이 가득 찬 물건도 보관함으로 간다
   - 기록을 고치는 동작은 거래처럼 trade_seq 를 올린다 — 그 전 차례의 늦은 저장은 stale 로 막히고 화면 · 서버가 다시 불러온다
   - D1 쓰기는 동작이 있을 때만 한다(목록 보기는 읽기만). 행 잠금은 장부 DO 가 요청을 한 줄로 세워서 대신한다 */
import { isObj, txt } from "./ledger-util.js";
import { tradeOffer, tradeExchange } from "./ledger-trade.js";
import { MARKET, MARKET_KINDS, marketNet } from "../../src/game/marketData.js";

const HOUR_MS = 60 * 60 * 1000;
const NONE = { coins: 0, items: [] };
// 표는 schema.sql 에도 있다. 이미 돌던 D1 에 표가 없을 수 있어 장부가 처음 부를 때 한 번 만든다(IF NOT EXISTS)
export const MARKET_SQL = [
  `CREATE TABLE IF NOT EXISTS market (
    id TEXT PRIMARY KEY, seller TEXT NOT NULL, seller_name TEXT NOT NULL, kind TEXT NOT NULL, u TEXT, n INTEGER NOT NULL DEFAULT 1,
    item TEXT, price INTEGER NOT NULL, created_at INTEGER NOT NULL, until INTEGER NOT NULL)`,
  "CREATE INDEX IF NOT EXISTS market_until ON market(until)",
  "CREATE INDEX IF NOT EXISTS market_seller ON market(seller)",
  `CREATE TABLE IF NOT EXISTS market_box (
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, why TEXT NOT NULL, coins INTEGER NOT NULL DEFAULT 0,
    kind TEXT, u TEXT, n INTEGER NOT NULL DEFAULT 0, item TEXT, price INTEGER NOT NULL DEFAULT 0, give INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)`,
  "CREATE INDEX IF NOT EXISTS market_box_owner ON market_box(owner)",
];

const priceOf = (v) => {
  const s = txt(v);
  if (s === null || !/^[0-9]{1,10}$/.test(s)) return 0;
  const n = Number(s);
  return n >= MARKET.priceMin && n <= MARKET.priceMax ? n : 0;
};
// 표의 한 줄 → 가방에 넣을 모양(tradeExchange 의 inn.items 한 칸)
const goods = (r) => (r.kind === "w" || r.kind === "a" ? { k: r.kind, u: txt(r.u), item: JSON.parse(r.item) } : { k: r.kind, u: r.u || "", n: r.n });
const listView = (r) => ({
  id: r.id, seller: r.seller_name, k: r.kind, u: r.u || "", n: r.n, item: r.item ? JSON.parse(r.item) : null, price: r.price, until: r.until,
});
const boxView = (r) => ({
  id: r.id, why: r.why, coins: r.coins, k: r.kind, u: r.u || "", n: r.n, item: r.item ? JSON.parse(r.item) : null, price: r.price, give: !!r.give, at: r.at,
});

export const marketMethods = {
  async marketReady() {
    if (this.marketMade) return;
    await this.batch(MARKET_SQL.map((s) => this.q(s)));
    this.marketMade = true;
  },
  // 기간이 지난 물건을 판매자 보관함으로 옮긴다 — 지난 것이 있을 때만 쓴다
  async marketSweep(now) {
    const old = await this.rows("SELECT * FROM market WHERE until <= ? LIMIT 50", now);
    if (!old.length) return;
    const w = [];
    for (const r of old) {
      w.push(this.q("INSERT INTO market_box (owner, why, coins, kind, u, n, item, price, give, at) VALUES (?, 'expired', 0, ?, ?, ?, ?, ?, 1, ?)",
        r.seller, r.kind, r.u, r.n, r.item, r.price, now));
      w.push(this.q("DELETE FROM market WHERE id = ?", r.id));
    }
    await this.batch(w);
  },
  // 기록을 고치는 쓰기 — 거래처럼 차례(ts)를 올린다
  charWrite(c, data, now) {
    return this.q("UPDATE chars SET data = ?, trade_seq = trade_seq + 1, updated_at = ? WHERE name_key = ?",
      JSON.stringify({ ...data, ts: (c.trade_seq || 0) + 1 }), now, c.name_key);
  },
  async marketState(k, now) {
    const list = await this.rows("SELECT * FROM market WHERE until > ? ORDER BY created_at DESC LIMIT ?", now, MARKET.pageMax);
    const mine = await this.rows("SELECT * FROM market WHERE seller = ? ORDER BY created_at DESC", k);
    const box = await this.rows("SELECT * FROM market_box WHERE owner = ? ORDER BY id", k);
    return { list: list.map(listView), mine: mine.map(listView), box: box.map(boxView) };
  },

  async fn_rpg_market(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const k = c.name_key, now = this.now();
    const lv = this.liveOf(k);
    if (!lv || lv.sid !== a.p_sid || !/^RPG[1-4]$/.test(lv.srv)) return { ok: false, err: "live" };
    await this.marketReady();
    await this.marketSweep(now);
    const op = a.p_op || "get", args = isObj(a.p_args) ? a.p_args : {};
    // charTs — 장부 기록의 거래 차례. 화면은 제 영웅의 ts 가 이보다 낮으면 다시 불러온다(useMarket)
    const done = async (extra = {}) => ({ ok: true, ...extra, charTs: (c.trade_seq || 0) + (extra.changed ? 1 : 0), ...(await this.marketState(k, now)) });
    if (op === "get") return done();
    if (!this.mrate) this.mrate = new Map();
    if ((this.mrate.get(k) || 0) > now - MARKET.rateMs) return { ok: false, err: "rate" };
    this.mrate.set(k, now);
    // 1:1 거래가 열린 동안에는 가방이 잠겨 있다
    if (c.trade_id && await this.first("SELECT 1 AS x FROM trades WHERE id = ? AND state IN ('invite','open') AND until > ?", c.trade_id, now)) return { ok: false, err: "busy" };

    if (op === "post") {
      if (c.admin) return { ok: false, err: "admin" };
      const kind = txt(args.k), price = priceOf(args.price);
      if (!MARKET_KINDS.includes(kind)) return { ok: false, err: "trade_offer" };
      if (!price) return { ok: false, err: "price" };
      const n = kind === "w" || kind === "a" ? 1 : Math.floor(Number(args.n));
      if (!(n >= 1 && n <= MARKET.stackMax)) return { ok: false, err: "trade_offer" };
      const { x: cnt } = await this.first("SELECT COUNT(*) AS x FROM market WHERE seller = ?", k);
      if (cnt >= MARKET.slots) return { ok: false, err: "slots" };
      const { x: boxed } = await this.first("SELECT COUNT(*) AS x FROM market_box WHERE owner = ?", k);
      if (boxed >= MARKET.boxMax) return { ok: false, err: "box" };
      let out, data;
      try {
        out = tradeOffer(c.data, { coins: "0", items: [kind === "w" || kind === "a" ? { k: kind, u: txt(args.u) } : { k: kind, u: txt(args.u), n: String(n) }] });
        data = tradeExchange(c.data, out, NONE);
      } catch (e) { return { ok: false, err: /^trade_/.test(e.message) ? e.message : "trade_offer" }; }
      const x = out.items[0], id = crypto.randomUUID();
      const w = [
        this.charWrite(c, data, now),
        this.q("INSERT INTO market (id, seller, seller_name, kind, u, n, item, price, created_at, until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          id, k, c.name, x.k, x.u == null ? "" : String(x.u), x.item ? 1 : x.n, x.item ? JSON.stringify(x.item) : null, price, now, now + MARKET.hours * HOUR_MS),
      ];
      // 게시판에 올린 장비가 늦은 저장으로 되살아나지 않게(거래의 trade_moves 와 같은 막이)
      if (x.item) {
        const bag = isObj(c.data.bag) ? c.data.bag : {};
        w.push(this.q("INSERT INTO trade_moves (trade_id, owner, receiver, kind, u, item, reset_id, rollback_ids, at) VALUES (?, ?, 'market', ?, ?, ?, ?, ?, ?)",
          id, k, x.k, Number(x.u), JSON.stringify(x.item), txt(c.data.rs), JSON.stringify(Array.isArray(bag.pg) ? bag.pg : []), now));
      }
      await this.batch(w);
      return done({ changed: true, id });
    }

    const r = typeof args.id === "string" || typeof args.id === "number" ? await this.first("SELECT * FROM market WHERE id = ?", String(args.id)) : null;
    if (op === "buy") {
      if (!r || r.until <= now) return { ok: false, err: "gone" };
      if (r.seller === k) return { ok: false, err: "own" };
      if (priceOf(args.price) !== r.price) return { ok: false, err: "changed" };   // 화면이 본 값과 다르면 사지 않는다
      let data;
      try { data = tradeExchange(c.data, { coins: r.price, items: [] }, { coins: 0, items: [goods(r)] }); }
      catch (e) { return { ok: false, err: /^trade_/.test(e.message) ? e.message : "trade_offer" }; }
      await this.batch([
        this.charWrite(c, data, now),
        this.q("DELETE FROM market WHERE id = ?", r.id),
        this.q("INSERT INTO market_box (owner, why, coins, kind, u, n, item, price, give, at) VALUES (?, 'sold', ?, ?, ?, ?, ?, ?, 0, ?)",
          r.seller, marketNet(r.price), r.kind, r.u, r.n, r.item, r.price, now),
      ]);
      return done({ changed: true });
    }
    if (op === "cancel") {
      if (!r || r.seller !== k) return { ok: false, err: "gone" };
      let data = null;
      try { data = tradeExchange(c.data, NONE, { coins: 0, items: [goods(r)] }); } catch { data = null; }   // 가방이 가득 차면 보관함으로
      await this.batch(data
        ? [this.charWrite(c, data, now), this.q("DELETE FROM market WHERE id = ?", r.id)]
        : [this.q("INSERT INTO market_box (owner, why, coins, kind, u, n, item, price, give, at) VALUES (?, 'cancel', 0, ?, ?, ?, ?, ?, 1, ?)",
          k, r.kind, r.u, r.n, r.item, r.price, now), this.q("DELETE FROM market WHERE id = ?", r.id)]);
      return done({ changed: !!data, boxed: !data });
    }
    if (op === "claim") {
      const rows = await this.rows("SELECT * FROM market_box WHERE owner = ? ORDER BY id", k);
      let data = c.data;
      const took = [];
      for (const b of rows) {
        try {
          data = tradeExchange(data, NONE, { coins: b.coins, items: b.give ? [goods(b)] : [] });
          took.push(b.id);
        } catch { /* 가방이 가득 찼다 — 이 줄은 보관함에 남긴다 */ }
      }
      if (!took.length) return rows.length ? { ok: false, err: "trade_capacity" } : done();
      await this.batch([this.charWrite(c, data, now), ...took.map((id) => this.q("DELETE FROM market_box WHERE id = ?", id))]);
      return done({ changed: true, left: rows.length - took.length });
    }
    return { ok: false, err: "op" };
  },
};
