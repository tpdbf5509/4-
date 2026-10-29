/* ── 개인 거래 — supabase/trade.sql 의 rpg_trade_open · rpg_trade_action · rpg_trade_offer · rpg_trade_exchange 를 그대로 옮긴 것 ──
   오류 이름(trade_offer · trade_funds · trade_item · trade_equipped · trade_capacity · trade_changed · trade_empty)과 답 모양은 trade.sql 과 같다.
   행 잠금은 장부(Durable Object 하나)가 요청을 한 줄로 세워서 대신한다. 확정은 D1 batch 한 번이라 반만 반영되는 일이 없다 */
import { rpgKey, sha256, jeq, isObj, txt, iso } from "./ledger-util.js";

export const TRADE_MS = 3 * 60 * 1000;          // 거래 한 건의 제한 시간(tradeData.js TRADE.lockMs 와 같은 3분)
const RATE_MS = 5000;                           // 같은 사람이 이 안에 또 신청하면 rate
const ITEM_MAX = 12;                            // 한 쪽이 올릴 수 있는 품목
const BAG_MAX = 30;                             // 받는 사람의 무기 · 방어구 가방 칸(일반 캐릭터 기준 — trade.sql 과 같다)
const STACK_MAX = { p: 99, gd: 99 };            // 개수 물품의 한 칸 최대(나머지는 999)
const STACK_DEFAULT = 999;
const EMPTY = [{ coins: 0, items: [] }, { coins: 0, items: [] }];
const KINDS = ["w", "a", "p", "m", "wp", "gd"];  // 무기 · 방어구 · 물약 · 재료 · 워프권 · 하락 방지권

const fail = (m) => { throw new Error(m); };
const bagOf = (d) => (d && isObj(d.bag) ? d.bag : {});
const intOf = (v) => { const n = Number(txt(v)); return Number.isSafeInteger(n) ? n : 0; };
// 개수 물품이 가방에 있는 수 — 물약 · 재료는 bag[k][u], 워프권 · 방지권은 bag[k]
const held = (b, k, u) => (k === "wp" || k === "gd" ? intOf(b[k]) : isObj(b[k]) ? intOf(b[k][u]) : 0);

// 선택 항목은 저장된 실제 물품으로 바꾼다. 장착품 · 중복 · 음수 · 없는 수량은 거절한다
export function tradeOffer(data, offer) {
  const b = bagOf(data);
  if (!isObj(offer) || !/^[0-9]{1,12}$/.test(txt(offer.coins) || "") || !Array.isArray(offer.items) || offer.items.length > ITEM_MAX) fail("trade_offer");
  const coins = Number(txt(offer.coins));
  if (coins > (Number(data && data.coins) || 0)) fail("trade_funds");
  const items = [], seen = new Set();
  for (const x of offer.items) {
    const k = isObj(x) ? txt(x.k) : null, u = isObj(x) ? txt(x.u) : null;
    if (!KINDS.includes(k)) fail("trade_offer");
    const tag = `${k}:${u == null ? "" : u}`;
    if (seen.has(tag)) fail("trade_offer");
    seen.add(tag);
    if (k === "w" || k === "a") {
      if (!/^[1-9][0-9]{0,11}$/.test(u || "")) fail("trade_offer");
      const item = (Array.isArray(b[k]) ? b[k] : []).find((v) => v && txt(v.u) === u);
      if (!item) fail("trade_item");
      if ((k === "w" && txt(b.e) === u) || (k === "a" && Object.values(isObj(b.ae) ? b.ae : {}).some((v) => txt(v) === u))) fail("trade_equipped");
      items.push({ k, u, item });
    } else {
      if (!/^[1-9][0-9]{0,3}$/.test(txt(x.n) || "")) fail("trade_offer");
      const n = Number(txt(x.n));
      if (((k === "p" || k === "m") && (!u || u.length > 40)) || n > held(b, k, u)) fail("trade_item");
      items.push({ k, u: u == null ? "" : u, n });
    }
  }
  return { coins, items };
}

// 받는 가방에서 새 번호를 매긴다. 용량을 넘으면 교환 전체를 되돌린다
export function tradeExchange(data, out, inn) {
  const d = JSON.parse(JSON.stringify(data));
  const b = isObj(d.bag) ? d.bag : {};
  const coins = (Number(d.coins) || 0) - out.coins + inn.coins;
  if (coins < 0 || coins > 999999999999) fail("trade_funds");
  for (const x of out.items) {
    if (x.k === "w" || x.k === "a") b[x.k] = (Array.isArray(b[x.k]) ? b[x.k] : []).filter((v) => txt(v.u) !== x.u);
    else if (x.k === "wp" || x.k === "gd") b[x.k] = intOf(b[x.k]) - x.n;
    else if (isObj(b[x.k])) b[x.k][x.u] = intOf(b[x.k][x.u]) - x.n;
  }
  const all = (Array.isArray(b.w) ? b.w : []).concat(Array.isArray(b.a) ? b.a : []);
  let seq = Math.max(intOf(b.n) || 1, all.length ? Math.max(...all.map((v) => intOf(v.u))) + 1 : 1);
  for (const x of inn.items) {
    if (x.k === "w" || x.k === "a") {
      const arr = (Array.isArray(b[x.k]) ? b[x.k] : []).concat([{ ...x.item, u: seq }]);
      if (arr.length > BAG_MAX) fail("trade_capacity");
      b[x.k] = arr;
      seq += 1;
    } else {
      const n = held(b, x.k, x.u) + x.n;
      if (n > (STACK_MAX[x.k] || STACK_DEFAULT)) fail("trade_capacity");
      if (x.k === "wp" || x.k === "gd") b[x.k] = n;
      else { if (!isObj(b[x.k])) b[x.k] = {}; b[x.k][x.u] = n; }
    }
  }
  b.n = seq;
  b.v = intOf(b.v) + 1;
  return { ...d, bag: b, coins };
}

const tradeView = (t, arow, brow, side, st) => ({
  id: t.id, a: arow.name, b: brow.name, side, state: st.state, offers: st.offers, accepted: st.accepted,
  hash: st.hash, revision: st.revision, error: st.error, until: iso(t.until),
});
const fenceHash = (id, rev, offers) => sha256(JSON.stringify({ id, rev, offers }));

export const tradeMethods = {
  async fn_rpg_trade_open(a) {
    const k = rpgKey(a.p_name), target = rpgKey(a.p_target);
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const o = await this.charRow(target);
    if (!o || k === target) return { ok: false, err: "account" };
    // 같은 서버(RPG1~4)에 둘 다 최근에 접속해 있어야 한다
    const lc = this.liveOf(k), lo = this.liveOf(target);
    if (!lc || !lo || lc.sid !== a.p_sid || lc.srv !== lo.srv || !/^RPG[1-4]$/.test(lc.srv)) return { ok: false, err: "live" };
    const now = this.now();
    const ids = [c.trade_id, o.trade_id].filter(Boolean);
    if (ids.length && await this.first(`SELECT 1 AS x FROM trades WHERE id IN (${ids.map(() => "?").join(",")}) AND state IN ('invite','open') AND until > ?`, ...ids, now)) return { ok: false, err: "busy" };
    if (await this.first("SELECT 1 AS x FROM trades WHERE a = ? AND created_at > ?", k, now - RATE_MS)) return { ok: false, err: "rate" };
    const id = crypto.randomUUID();
    await this.batch([
      this.q("INSERT INTO trades (id, a, b, server, state, offers, accepted, revision, hash, created_at, until) VALUES (?, ?, ?, ?, 'invite', ?, '[false,false]', 0, '', ?, ?)",
        id, k, target, lc.srv, JSON.stringify(EMPTY), now, now + TRADE_MS),
      this.q("UPDATE chars SET trade_id = ? WHERE name_key IN (?, ?)", id, k, target),
    ]);
    return { ok: true, id };
  },

  // 거래 읽기 · 수락 · 등록 · 확인 · 취소
  async fn_rpg_trade_action(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    const k = c.name_key, now = this.now();
    const tid = a.p_id || c.trade_id;
    const t = tid ? await this.first("SELECT * FROM trades WHERE id = ?", tid) : null;
    if (!t || (t.a !== k && t.b !== k)) return { ok: true, trade: null };
    const arow = await this.charRow(t.a), brow = await this.charRow(t.b);
    const lv = this.live.get(k);
    if (!lv || lv.sid !== a.p_sid) return { ok: false, err: "token" };
    const i = k === t.a ? 0 : 1, op = a.p_op || "get";
    const st = { state: t.state, offers: JSON.parse(t.offers), accepted: JSON.parse(t.accepted), revision: t.revision, hash: t.hash, error: t.error };
    const writes = [];
    if (st.state === "invite" || st.state === "open") {
      const la = this.liveOf(t.a), lb = this.liveOf(t.b);
      if (t.until <= now || arow.trade_id !== t.id || brow.trade_id !== t.id || !la || !lb || la.srv !== t.server || lb.srv !== t.server) {
        st.state = "cancel"; st.error = "expired";
      } else if (op === "cancel") st.state = "cancel";
      else if (op === "join" && i === 1 && st.state === "invite") st.state = "open";
      else if (op === "offer" && st.state === "open") {
        try { st.offers[i] = tradeOffer(c.data, a.p_offer); }
        catch (e) { return { ok: false, err: /^trade_/.test(e.message) ? e.message : "trade_offer" }; }
        st.accepted = [false, false]; st.revision += 1;
      } else if (op === "accept" && st.state === "open") {
        if ((a.p_hash ?? null) !== t.hash || t.hash === "") return { ok: false, err: "changed" };
        st.accepted[i] = true;
        if (st.accepted[0] && st.accepted[1]) {
          try {
            if (!jeq(tradeOffer(arow.data, st.offers[0]), st.offers[0]) || !jeq(tradeOffer(brow.data, st.offers[1]), st.offers[1])) fail("trade_changed");
            if (jeq(st.offers, EMPTY)) fail("trade_empty");
            const da = { ...tradeExchange(arow.data, st.offers[0], st.offers[1]), ts: arow.trade_seq + 1 };
            const db = { ...tradeExchange(brow.data, st.offers[1], st.offers[0]), ts: brow.trade_seq + 1 };
            writes.push(
              this.q("UPDATE chars SET data = ?, trade_seq = trade_seq + 1, trade_id = NULL, updated_at = ? WHERE name_key = ?", JSON.stringify(da), now, t.a),
              this.q("UPDATE chars SET data = ?, trade_seq = trade_seq + 1, trade_id = NULL, updated_at = ? WHERE name_key = ?", JSON.stringify(db), now, t.b),
            );
            // 넘어간 장비를 되살리는 늦은 저장을 막으려고 옮긴 장비를 남긴다(fence 의 moved)
            [[0, t.a, t.b, arow], [1, t.b, t.a, brow]].forEach(([side, owner, receiver, row]) => {
              for (const x of st.offers[side].items) {
                if (x.k !== "w" && x.k !== "a") continue;
                writes.push(this.q("INSERT INTO trade_moves (trade_id, owner, receiver, kind, u, item, reset_id, rollback_ids, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  t.id, owner, receiver, x.k, Number(x.u), JSON.stringify(x.item), txt(row.data.rs), JSON.stringify(Array.isArray(bagOf(row.data).pg) ? bagOf(row.data).pg : []), now));
              }
            });
            st.state = "done";
          } catch (e) {
            writes.length = 0;                        // 반쯤 만든 쓰기는 버린다 — 양쪽 모두 그대로
            st.state = "fail"; st.error = e.message;
          }
        }
      } else if (op !== "get" && op !== "join") return { ok: false, err: "state" };
      st.hash = await fenceHash(t.id, st.revision, st.offers);
      if (st.state === "cancel" || st.state === "fail") writes.push(this.q("UPDATE chars SET trade_id = NULL WHERE name_key IN (?, ?) AND trade_id = ?", t.a, t.b, t.id));
      // 읽기만 했으면 쓰지 않는다 — 거래 창이 계속 읽어 와도 D1 쓰기 한도(하루 10만 줄)를 아낀다
      const offersTxt = JSON.stringify(st.offers), acceptedTxt = JSON.stringify(st.accepted);
      if (writes.length || st.state !== t.state || offersTxt !== t.offers || acceptedTxt !== t.accepted || st.revision !== t.revision || st.hash !== t.hash || (st.error ?? null) !== t.error) {
        writes.push(this.q("UPDATE trades SET state = ?, offers = ?, accepted = ?, revision = ?, hash = ?, error = ?, finished_at = ? WHERE id = ?",
          st.state, offersTxt, acceptedTxt, st.revision, st.hash, st.error ?? null,
          st.state === "done" || st.state === "cancel" || st.state === "fail" ? now : null, t.id));
        await this.batch(writes);
      }
    }
    return { ok: true, trade: tradeView(t, arow, brow, i, st) };
  },
};
