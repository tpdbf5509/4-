/* 배포 뒤 확인 — GitHub Actions 가 돌린다(node 22 의 WebSocket).
   ① /health ② 점검 방(CHECK)에 붙어 대기실(lobby)을 받는다 ③ 없는 계정으로 자리를 부탁해 deny 를 받는다
   ③이 오면 서버가 장부(D1)에 닿았다는 뜻이다(닿지 못하면 아무 답이 없다)
   ④ 장부 함수(/rpc) ⑤ 방 중계(/room) 두 사람이 서로의 말을 받는다 */
const BASE = process.argv[2] || "https://four-lane-rpg.four-lane.workers.dev";
const fail = (m) => { console.error("실패:", m); process.exit(1); };
const health = await fetch(`${BASE}/health`).then((r) => r.text()).catch((e) => String(e));
if (health !== "ok") fail(`health ${health}`);
console.log("① health ok");
// 게임 방(RPG1~4)은 건드리지 않는다 — 처음 부른 곳 가까이에 방이 생기므로 한국 사람이 먼저 만들게 둔다. 점검은 CHECK 방으로
console.log("   점검 방 위치:", await fetch(`${BASE}/where/CHECK`).then((r) => r.text()).catch(() => "?"));
const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/rpg/CHECK?id=smoke${Date.now()}`);
const got = new Set();
const done = new Promise((resolve) => {
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.k === "lobby" && !got.has("lobby")) {
      got.add("lobby");
      console.log("② lobby — 방장", m.d.hostId, "· 자리", m.d.seats.length);
      ws.send(JSON.stringify({ k: "pick", d: { hero: { name: "점검", job: "warrior", elem: "flame", gender: "m" }, acct: { name: "없는계정점검", tok: "0" } } }));
    }
    if (m.k === "deny") { got.add("deny"); console.log("③ deny — 저장소 연결 ok"); resolve(); }
  };
  // 첫 말은 비밀값(auth) — 없으면 서버가 끊는다(room.js auth)
  const s = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  ws.onopen = () => { ws.send(JSON.stringify({ k: "auth", d: { s } })); ws.send(JSON.stringify({ k: "hello", d: { name: "점검" } })); };
  ws.onerror = () => fail("websocket error");
});
await Promise.race([done, new Promise((r) => setTimeout(r, 15000))]);
ws.send(JSON.stringify({ k: "bye" }));
ws.close();
if (!got.has("lobby")) fail("lobby 를 받지 못했다");
if (!got.has("deny")) fail("deny 를 받지 못했다 — 장부(D1) 연결을 확인");
// ④ 장부 — 없는 이름은 "비어 있음"(true)이어야 한다
const free = await fetch(`${BASE}/rpc/rpg_name_free`, { method: "POST", body: JSON.stringify({ p_name: "점검없는이름" }) }).then((r) => r.json()).catch((e) => String(e));
if (free !== true) fail(`rpg_name_free ${JSON.stringify(free)}`);
console.log("④ 장부 ok");
// ⑤ 중계 — 두 접속이 서로의 방송을 받는다
const room = `check${Date.now().toString(36)}`;
const wsBase = BASE.replace(/^http/, "ws");
const a = new WebSocket(`${wsBase}/room/${room}?id=smokeA&name=A`);
const b = new WebSocket(`${wsBase}/room/${room}?id=smokeB&name=B`);
const heard = new Promise((resolve) => {
  b.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === "msg" && m.k === "hi" && m.from === "smokeA") resolve(true); };
  a.onopen = () => setTimeout(() => a.send(JSON.stringify({ t: "msg", k: "hi", d: 1 })), 800);
});
if (!(await Promise.race([heard, new Promise((r) => setTimeout(() => r(false), 8000))]))) fail("방 중계가 말을 전하지 못했다");
a.close(); b.close();
console.log("⑤ 중계 ok");
console.log("모두 통과");
process.exit(0);
