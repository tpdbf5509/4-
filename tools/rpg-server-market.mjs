/* RPG 전용 서버 장터 게시판 시험 — 내 컴퓨터 서버(wrangler dev)에 WebSocket 으로 붙어 본다.
   먼저: cd server && npx wrangler d1 execute four-lane --local --file=schema.sql && npx wrangler dev --port 8787
   돌리기: node tools/rpg-server-market.mjs [ws://127.0.0.1:8787]
   A 가 가죽을 올리고 B 가 산다 → A 가 보관함에서 대금을 받는다. 10초 저장이 돌아도 결과가 되돌아가지 않는다 */
import { createHash, randomBytes } from "node:crypto";

const BASE = process.argv[2] || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
const run = Date.now().toString(36).slice(-4);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "통과" : "실패"} — ${msg}`); if (!ok) failed++; };
const rpc = (fn, args) => fetch(`${HTTP}/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }).then((r) => r.json());
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(50); } return false; };

const health = await fetch(`${HTTP}/health`).then((r) => r.text()).catch((e) => String(e));
if (health !== "ok") { console.error(`서버가 없습니다(${health}). 먼저 cd server && npx wrangler dev --port 8787`); process.exit(1); }

const base = { lv: 60, coins: 60000, rs: "2026-10-19", ts: 0, bag: { w: [], a: [], ae: {}, e: 0, n: 1, v: 1, p: { heal_s: 5 }, m: { fur: 10 }, wp: 0, gd: 0, pg: [] } };

// 사람 하나 — 계정을 만들고 접속 중 표시를 남긴 뒤 서버에 붙어 앉는다
async function person(label, tag) {
  const name = `${label}${run}`.slice(0, 8), id = `${tag}${run}x1`;
  const made = await rpc("rpg_create", { p_name: name, p_code: "13579", p_data: { ...base, name } });
  if (!made.ok) throw new Error(`계정 ${name}: ${JSON.stringify(made)}`);
  const tok = made.token;
  const live = await rpc("rpg_live", { p_name: name, p_token: tok, p_sid: id, p_srv: "RPG1" });
  if (!live.ok) throw new Error(`live ${JSON.stringify(live)}`);
  const p = { name, id, tok, lobby: null, asks: new Map(), n: 0 };
  p.beat = setInterval(() => rpc("rpg_live", { p_name: name, p_token: tok, p_sid: id, p_srv: "RPG1" }), 10000);   // 화면이 10초마다 남기는 접속 중 표시
  const ws = new WebSocket(`${BASE}/rpg/RPG1?id=${id}`);
  p.ws = ws;
  p.opened = new Promise((res, rej) => {
    ws.onopen = () => {
      ws.send(JSON.stringify({ k: "auth", d: { s: randomBytes(32).toString("hex") } }));
      ws.send(JSON.stringify({ k: "hello", d: { name } }));
      res();
    };
    ws.onerror = () => rej(new Error("연결 실패"));
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.k === "lobby") p.lobby = m.d;
    if (m.k === "ledger") { const f = p.asks.get(m.d.rid); if (f) { p.asks.delete(m.d.rid); f(m.d.res); } }
  };
  p.ask = (fn, args = {}) => new Promise((done) => {
    const rid = ++p.n;
    p.asks.set(rid, done);
    ws.send(JSON.stringify({ k: "ledger", d: { rid, fn, args } }));
    setTimeout(() => { if (p.asks.delete(rid)) done({ ok: false, err: "시간 초과" }); }, 15000);
  });
  p.seat = () => (p.lobby ? p.lobby.seats.findIndex((s) => s && s.id === id) : -1);
  p.stored = async () => (await rpc("rpg_load", { p_name: name, p_token: tok })).data;
  await p.opened;
  ws.send(JSON.stringify({ k: "pick", d: { hero: { name, job: "warrior", elem: "flame", gender: "m" }, acct: { name, tok } } }));
  return p;
}
const A = await person("가", "ma"), B = await person("나", "mb");
check(await until(() => A.seat() >= 0 && B.seat() >= 0), "두 사람이 계정으로 자리를 받는다");
check((await A.ask("flush")).ok === true, "flush 가 통한다");
let r = await A.ask("market", { op: "get" });
check(r.ok === true && Array.isArray(r.list), `게시판을 읽는다 ${JSON.stringify(r).slice(0, 80)}`);
r = await A.ask("market", { op: "post", args: { k: "m", u: "fur", n: 3, price: 1000 } });
check(r.ok === true && r.mine.length === 1, `A 가 가죽 3개를 1,000코인에 올린다 ${r.err || ""}`);
await wait(300);
check((await A.stored()).bag.m.fur === 7, "A 가방에서 빠졌다");
const id = r.mine[0].id;
await wait(1600);
r = await B.ask("market", { op: "buy", args: { id, price: 1000 } });
check(r.ok === true, `B 가 산다 ${r.err || ""}`);
await wait(300);
await B.ask("flush");
const b1 = await B.stored();
check(b1.coins === 59000 && b1.bag.m.fur === 13, `B 코인 ${b1.coins} · 가죽 ${b1.bag.m.fur}`);
await wait(1600);
r = await A.ask("market", { op: "get" });
check(r.box.length === 1 && r.box[0].coins === 950, `A 보관함에 수수료 5%를 뗀 950코인 ${JSON.stringify(r.box).slice(0, 80)}`);
r = await A.ask("market", { op: "claim" });
check(r.ok === true && r.box.length === 0, `A 가 받는다 ${r.err || ""}`);
await wait(300);
await A.ask("flush");
const a1 = await A.stored();
check(a1.coins === 60950, `A 코인 ${a1.coins}`);
await wait(11000);
const a2 = await A.stored(), b2 = await B.stored();
check(a2.coins === 60950 && a2.bag.m.fur === 7 && b2.coins === 59000 && b2.bag.m.fur === 13, "10초 저장 뒤에도 그대로");
for (const p of [A, B]) { clearInterval(p.beat); try { p.ws.send(JSON.stringify({ k: "bye" })); p.ws.close(1000); } catch { /* 닫혔다 */ } }
console.log(failed ? `${failed}개 실패` : "모두 통과");
process.exit(failed ? 1 : 0);
