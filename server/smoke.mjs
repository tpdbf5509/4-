/* 배포 뒤 확인 — GitHub Actions 가 돌린다(node 22 의 WebSocket).
   ① /health ② RPG5 에 붙어 대기실(lobby)을 받는다 ③ 없는 계정으로 자리를 부탁해 deny 를 받는다
   ③이 오면 서버가 Supabase 에 비밀 키로 닿았다는 뜻이다(키가 틀리면 저장소에 닿지 못해 아무 답이 없다) */
const BASE = process.argv[2] || "https://four-lane-rpg.four-lane.workers.dev";
const fail = (m) => { console.error("실패:", m); process.exit(1); };
const health = await fetch(`${BASE}/health`).then((r) => r.text()).catch((e) => String(e));
if (health !== "ok") fail(`health ${health}`);
console.log("① health ok");
const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/rpg/RPG5?id=smoke${Date.now()}`);
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
  ws.onopen = () => ws.send(JSON.stringify({ k: "hello", d: { name: "점검" } }));
  ws.onerror = () => fail("websocket error");
});
await Promise.race([done, new Promise((r) => setTimeout(r, 15000))]);
ws.send(JSON.stringify({ k: "bye" }));
ws.close();
if (!got.has("lobby")) fail("lobby 를 받지 못했다");
if (!got.has("deny")) fail("deny 를 받지 못했다 — SUPABASE_SECRET_KEY 를 확인");
console.log("모두 통과");
process.exit(0);
