/* RPG 전용 서버 자리 지킴 시험 — 내 컴퓨터 서버(wrangler dev)에 WebSocket 으로 붙어 본다.
   먼저 띄운다: cd server && npx wrangler dev --port 8787   (저장소 비밀 키가 없으면 저장 없이 돈다)
   돌리기:      node tools/rpg-server-seat.mjs [ws://127.0.0.1:8787] [서버 이름 RPG1~RPG4]
   (a) 남의 접속 id 로 붙기 → 4003 으로 거절 · 원래 연결은 그대로
   (b) 본인(같은 id + 같은 비밀값) 다시 붙기 → 옛 연결 4000 · 새 연결이 자리를 잇는다
   (c) 11번째 입장 → 자리를 받지 못한다(동시에 여럿이 들어와도 10명)
   그 밖에 — 첫 말이 비밀값이 아니면 4003 · 아무 말 없으면 5초 뒤 4001 · 남에게는 접속 id 대신 "~" id 만 보임 */
import { randomBytes } from "node:crypto";
import { RPG_SERVER_CAP } from "../src/game/rpg.js";

const BASE = process.argv[2] || "ws://127.0.0.1:8787";
const ROOM = process.argv[3] || "RPG4";
const run = Date.now().toString(36).slice(-4);       // 시험마다 다른 id — 같은 방을 다시 써도 섞이지 않게
const sec = () => randomBytes(32).toString("hex");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "통과" : "실패"} — ${msg}`); if (!ok) failed++; };

// 붙기 — 첫 말로 비밀값(auth)을 보내고 인사(hello)한다. 받은 lobby · rsnap · chat 을 남겨 둔다
function connect(id, secret, { auth = true, quiet = false } = {}) {
  const ws = new WebSocket(`${BASE}/rpg/${ROOM}?id=${id}`);
  const c = { id, ws, lobby: null, snap: null, chats: [], closed: null };
  c.opened = new Promise((res, rej) => {
    ws.onopen = () => {
      if (auth) ws.send(JSON.stringify({ k: "auth", d: { s: secret } }));
      if (!quiet) ws.send(JSON.stringify({ k: "hello", d: { name: id.slice(0, 8) } }));
      res();
    };
    ws.onerror = () => rej(new Error(`연결 실패 ${id}`));
  });
  c.done = new Promise((res) => { ws.onclose = (e) => { c.closed = e.code; res(e.code); }; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.k === "lobby") c.lobby = m.d;
    if (m.k === "rsnap") c.snap = m.d;
    if (m.k === "chat") c.chats.push({ ...m.d, from: m.from });
  };
  c.send = (k, d) => ws.send(JSON.stringify({ k, d }));
  c.pick = (name) => c.send("pick", { hero: { name, job: "warrior", elem: "flame", gender: "m" } });
  c.seat = () => (c.lobby ? c.lobby.seats.findIndex((s) => s && s.id === id) : -1);
  c.close = () => { try { ws.send(JSON.stringify({ k: "bye" })); ws.close(1000); } catch { /* 이미 닫혔다 */ } };
  return c;
}
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await wait(50); } return false; };
const seated = (lobby) => (lobby ? lobby.seats.filter(Boolean).length : 0);

const health = await fetch(`${BASE.replace(/^ws/, "http")}/health`).then((r) => r.text()).catch((e) => String(e));
if (health !== "ok") { console.error(`서버가 없습니다(${health}). 먼저 cd server && npx wrangler dev --port 8787`); process.exit(1); }

// (a) 남의 id 로 붙기
const aId = `a${run}x01`, aSec = sec();
const A = connect(aId, aSec);
await A.opened;
A.pick("가나");
check(await until(() => A.seat() >= 0), "A 가 자리를 받는다");
const W = connect(`w${run}x01`, sec());                 // 구경꾼 — 남의 id 가 보이는지 본다
await W.opened;
await until(() => W.lobby && seated(W.lobby) >= 1 && W.snap);
const shown = W.lobby.seats.find(Boolean);
check(shown && shown.id !== aId && shown.id.startsWith("~"), `남의 대기실에는 접속 id 대신 "${shown && shown.id}" 가 보인다`);
check(W.snap && !JSON.stringify(W.snap).includes(aId), "남의 스냅샷에도 A 의 접속 id 가 없다");
check(A.snap && A.snap.w[A.seat()] === aId, "A 자신의 스냅샷 자리 주인(w)은 제 접속 id 그대로다");
const T = connect(aId, sec());                           // A 의 id 를 알아낸 사람
await T.opened;
const tCode = await Promise.race([T.done, wait(3000).then(() => null)]);
check(tCode === 4003, `다른 비밀값으로 같은 id 에 붙으면 4003 으로 끊긴다(받은 값 ${tCode})`);
check(A.closed === null && A.ws.readyState === 1, "원래 연결 A 는 닫히지 않는다");
const aSnapAt = A.snap && A.snap.q;
await wait(400);
check(A.snap && A.snap.q !== aSnapAt, "A 는 계속 스냅샷을 받는다");
T.send("bye"); T.send("chat", { t: "탈취" });           // 끊긴 연결이라 서버에 닿지 않는다
await wait(300);
A.send("chat", { t: "안녕" });
check(await until(() => W.chats.some((x) => x.t === "안녕")), "A 의 채팅이 구경꾼에게 간다");
const chat = W.chats.find((x) => x.t === "안녕");
check(chat && chat.from === shown.id, `채팅 보낸 사람도 같은 "~" id 로 온다(${chat && chat.from})`);

// (b) 본인 다시 붙기
const A2 = connect(aId, aSec);
await A2.opened;
const aCode = await Promise.race([A.done, wait(3000).then(() => null)]);
check(aCode === 4000, `같은 비밀값이면 옛 연결이 4000(replaced)으로 닫힌다(받은 값 ${aCode})`);
check(await until(() => A2.seat() >= 0), "새 연결 A2 가 같은 자리를 잇는다");
check(A2.seat() === A.seat(), "자리 번호가 그대로다");

// 비밀값 없이 붙기 — 첫 말이 auth 가 아니면 바로, 아무 말도 없으면 5초 뒤 끊긴다
const N = connect(`n${run}x01`, "", { auth: false });
await N.opened;
N.pick("무명");
const nCode = await Promise.race([N.done, wait(3000).then(() => null)]);
check(nCode === 4003, `첫 말이 비밀값이 아니면 4003 으로 끊긴다(받은 값 ${nCode})`);
const Q = connect(`q${run}x01`, "", { auth: false, quiet: true });
await Q.opened;
const qCode = await Promise.race([Q.done, wait(7000).then(() => null)]);
check(qCode === 4001, `아무 말도 보내지 않으면 5초 뒤 4001 로 끊긴다(받은 값 ${qCode})`);
check(!W.lobby.seats.some((s) => s && s.hero && s.hero.name === "무명"), "비밀값 없는 연결은 자리를 받지 못한다");

// (c) 정원 — 지금 A2 하나. 나머지 9 + 1 명이 한꺼번에 부탁한다
const crowd = Array.from({ length: RPG_SERVER_CAP }, (_, i) => connect(`c${run}x${String(i).padStart(2, "0")}`, sec()));
await Promise.all(crowd.map((c) => c.opened));
crowd.forEach((c, i) => c.pick(`손님${i}`));
await until(() => crowd.every((c) => c.lobby && (c.seat() >= 0 || seated(c.lobby) >= RPG_SERVER_CAP)), 6000);
await wait(500);
const got = crowd.filter((c) => c.seat() >= 0).length;
check(got === RPG_SERVER_CAP - 1, `동시에 ${crowd.length}명이 부탁하면 ${RPG_SERVER_CAP - 1}명만 앉는다(앉은 수 ${got})`);
check(seated(A2.lobby) === RPG_SERVER_CAP, `대기실 인원이 ${RPG_SERVER_CAP}명에서 멈춘다(${seated(A2.lobby)})`);
const late = crowd.find((c) => c.seat() < 0);
if (late) {
  late.pick("늦은손님");
  await wait(800);
  check(late.seat() < 0 && seated(late.lobby) === RPG_SERVER_CAP, "11번째는 다시 부탁해도 자리를 받지 못하고 가득 찬 대기실을 받는다");
}
// 한 명이 나가면 자리가 난다
A2.close();
await A2.done;
if (late) {
  await wait(300);
  late.pick("늦은손님");
  check(await until(() => late.seat() >= 0), "한 명이 나가면 기다리던 사람이 앉는다");
}

[W, ...crowd].forEach((c) => c.close());
await wait(300);
console.log(failed ? `실패 ${failed}개` : "모두 통과");
process.exit(failed ? 1 : 0);
