/* RPG 전용 서버 거래 · 길드 시험 — 내 컴퓨터 서버(wrangler dev)에 WebSocket 으로 붙어 본다.
   먼저: cd server && npx wrangler d1 execute four-lane --local --file=schema.sql && npx wrangler dev --port 8787
   돌리기: node tools/rpg-server-trade.mjs [ws://127.0.0.1:8787]
   (a) 두 사람이 계정으로 RPG1 에 앉는다 (b) A 가 거래를 신청 → B 가 받고 → 등록 → 서로 확인 → 확정
   (c) 확정 뒤 장부의 코인이 옮겨졌고, 서버가 영웅을 다시 불러와 저장해도 되돌아가지 않는다
   (d) A 가 길드를 만든다(50레벨 · 5만 코인) — 생성비가 장부에 빠지고 영웅에도 반영된다 */
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

const A = await person("가", "ta"), B = await person("나", "tb");
check(await until(() => A.seat() >= 0 && B.seat() >= 0), "(a) 두 사람이 계정으로 자리를 받는다");

// 서버가 장부에 한 번 저장하게 하고 시작 코인을 본다
check((await A.ask("flush")).ok === true, "flush 가 통한다");
const a0 = (await A.stored()).coins, b0 = (await B.stored()).coins;
check(a0 === 60000 && b0 === 60000, `시작 코인 ${a0} / ${b0}`);

// (b) 거래
check((await B.ask("trade_action", {})).trade === null, "받은 신청이 없으면 서버가 장부까지 묻지 않고 null 을 준다");
const opened = await A.ask("trade_open", { target: B.name });
check(opened.ok === true && opened.id, `A 가 거래를 신청한다 ${JSON.stringify(opened).slice(0, 80)}`);
let got = await B.ask("trade_action", {});            // id 없이 — 서버가 받은 신청을 안다
check(got.ok && got.trade && got.trade.id === opened.id && got.trade.state === "invite", "B 는 id 없이도 받은 신청을 본다");
got = await B.ask("trade_action", { id: opened.id, op: "join" });
check(got.ok && got.trade.state === "open", "B 가 받는다");
got = await A.ask("trade_action", { id: opened.id, op: "offer", offer: { coins: 1500, items: [] } });
check(got.ok && got.trade.hash, "A 가 코인 1,500 을 올린다");
got = await B.ask("trade_action", { id: opened.id, op: "offer", offer: { coins: 0, items: [{ k: "m", u: "fur", n: 4 }] } });
check(got.ok && got.trade.hash, "B 가 가죽 4개를 올린다");
const hash = got.trade.hash;
got = await A.ask("trade_action", { id: opened.id, op: "accept", hash });
check(got.ok && got.trade.accepted[0] === true, "A 확인");
got = await B.ask("trade_action", { id: opened.id, op: "accept", hash });
check(got.ok && got.trade.state === "done", `B 확인 → 확정(${got.trade && got.trade.state}${got.trade && got.trade.error ? " " + got.trade.error : ""})`);

// (c) 장부와 영웅이 같은 값이다 — 서버가 다시 저장해도 되돌리지 않는다
await wait(300);
await A.ask("flush"); await B.ask("flush");
const a1 = await A.stored(), b1 = await B.stored();
check(a1.coins === a0 - 1500 && b1.coins === b0 + 1500, `코인이 옮겨졌다(A ${a1.coins} · B ${b1.coins})`);
check((a1.bag.m.fur || 0) === 10 + 4 && (b1.bag.m.fur || 0) === 10 - 4, `가죽이 옮겨졌다(A ${a1.bag.m.fur} · B ${b1.bag.m.fur})`);
check(a1.ts > 0 && a1.ts === b1.ts, `거래 차례가 올랐다(ts ${a1.ts})`);
await wait(11000);                                       // 서버의 10초 저장이 한 번 돈다
const a2 = await A.stored();
check(a2.coins === a1.coins && a2.ts === a1.ts, "10초 저장 뒤에도 거래 결과 그대로");
const again = await A.ask("trade_action", { id: opened.id });
check(again.ok && again.trade && again.trade.state === "done", `끝난 거래는 done 으로 남는다 ${JSON.stringify(again).slice(0, 80)}`);
check((await A.ask("trade_action", {})).trade === null, "끝난 뒤 서버의 신청 기억은 비었다");

// (d) 길드
let g = await A.ask("guild_action", { op: "get", args: {} });
check(g.ok === true && !g.guild, "길드가 없는 상태로 읽힌다");
g = await A.ask("guild_action", { op: "create", args: { name: `시험${run}` } });
check(g.ok === true && g.guild && g.guild.id, `A 가 길드를 만든다 ${JSON.stringify(g).slice(0, 100)}`);
await wait(300);
await A.ask("flush");
const a3 = await A.stored();
check(a3.coins === a1.coins - 50000, `생성비 5만 코인이 빠졌다(${a3.coins})`);
await wait(11000);
check((await A.stored()).coins === a3.coins, "10초 저장 뒤에도 생성비가 되돌아오지 않는다");
g = await B.ask("guild_action", { op: "apply", args: { id: g.guild.id } });
check(g.ok === true, `B 가입 신청이 서버를 거쳐 장부까지 간다(${g.err || "ok"})`);

for (const p of [A, B]) { clearInterval(p.beat); try { p.ws.send(JSON.stringify({ k: "bye" })); p.ws.close(1000); } catch { /* 닫혔다 */ } }
console.log(failed ? `${failed}개 실패` : "모두 통과");
process.exit(failed ? 1 : 0);
