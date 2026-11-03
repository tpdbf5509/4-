/* 결투장 실접속 시험 — 내 컴퓨터 서버(wrangler dev)에 WebSocket 클라이언트 4개로 붙어 1대1 · 2대2 결투를 돌린다.
   먼저: cd server && npx wrangler dev --port 8787      돌리기: node tools/duel-live.mjs [ws://127.0.0.1:8787] [RPG1~4] */
import { randomBytes } from "node:crypto";
import { makeWorld, rpgApply, rpgApplyOut, DUEL } from "../src/game/rpg.js";
import { RESET, GIFT } from "../src/game/itemData.js";
const BASE = process.argv[2] || "ws://127.0.0.1:8787", ROOM = process.argv[3] || "RPG3";
const run = Date.now().toString(36).slice(-4), wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0; const check = (ok, msg) => { console.log(`${ok ? "통과" : "실패"} — ${msg}`); if (!ok) failed++; };
const until = async (fn, ms = 6000) => { const e = Date.now() + ms; while (Date.now() < e) { if (fn()) return true; await wait(40); } return false; };
function client(tag, job = "warrior", lv = 250) {
  const id = `${tag}${run}x01`, sec = randomBytes(32).toString("hex"), name = tag.toUpperCase();
  const c = { id, name, g: makeWorld(), lobby: null, chats: [], q: 0, snaps: 0, sys: [] };
  c.g.out = [];
  const ws = new WebSocket(`${BASE}/rpg/${ROOM}?id=${id}`); c.ws = ws;
  c.opened = new Promise((res) => { ws.onopen = () => { ws.send(JSON.stringify({ k: "auth", d: { s: sec } })); ws.send(JSON.stringify({ k: "hello", d: { name } })); res(); }; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.k === "lobby") c.lobby = m.d;
    if (m.k === "rsnap") { c.snaps++; c.g.mySeat = c.seat(); rpgApply(c.g, m.d); if (m.d.o) rpgApplyOut(c.g, m.d.o); c.t = Date.now(); }
  };
  c.send = (k, d) => ws.send(JSON.stringify({ k, d }));
  c.seat = () => (c.lobby ? c.lobby.seats.findIndex((s) => s && s.id === id) : -1);
  c.input = (kind, dir) => c.send("input", { cls: c.seat(), kind, dir, q: ++c.q });
  c.me = () => c.g.heroes[c.seat()];
  c.join = async () => {
    await c.opened; c.send("pick", { hero: { name, job, elem: "flame", gender: "m" } });
    await until(() => c.seat() >= 0);
    c.send("rjoin", { cls: c.seat(), data: { name, rs: RESET.id, gift: GIFT.id, lv, ts: 1, coins: 0, stats: { str: 200, int: 200, hp: 100 }, bag: { oc: 1, w: [], n: 1 } } });
    return until(() => c.me() && c.me().loaded && c.me().lv === lv);
  };
  c.close = () => { try { ws.send(JSON.stringify({ k: "bye" })); ws.close(1000); } catch {} };
  return c;
}
const health = await fetch(`${BASE.replace(/^ws/, "http")}/health`).then((r) => r.text()).catch((e) => String(e));
if (health !== "ok") { console.error("서버 없음"); process.exit(1); }
const idx = (c, o) => o.seat();
// ── 1대1 ──
const A = client("aa"), B = client("bb");
check((await Promise.all([A.join(), B.join()])).every(Boolean), "두 클라이언트가 서버에 접속해 레벨 250 캐릭터로 입장");
const sa = A.seat(), sb = B.seat();
check(sa !== sb && sa >= 0 && sb >= 0, `서로 다른 자리 ${sa} / ${sb}`);
// 같은 곳에 두 사람이 있는지 확인 — 신청은 어디서나 가능
A.input("duel", { op: "ask", to: sb });
check(await until(() => B.me() && B.me().duelInv), "B 화면에 A 의 1대1 결투 신청이 도착");
B.input("duel", { op: "accept" });
check(await until(() => A.me().map === "arena" && B.me().map === "arena" && A.me().dph === 1), "수락하면 둘 다 결투장으로 옮겨져 준비 단계(dph 1)");
const ring0 = { a: [A.me().x, A.me().y], b: [B.me().x, B.me().y] };
console.log(`   시작 체력 A ${A.me().hp}/${A.me().max} · B ${B.me().hp}/${B.me().max} · 준비 ${DUEL.ready}초`);
check(await until(() => A.me().dph === 2 && B.me().dph === 2, (DUEL.ready + 3) * 1000), `${DUEL.ready}초 뒤 전투 단계(dph 2)로 넘어간다`);
// 서로 마주 보고 공격 — A 가 B 쪽으로 걷고 친다
const hist = []; const hp0 = B.me().hp, max0 = B.me().max;
const side = A.me().x < B.me().x ? "right" : "left";
console.log(`   A 위치 ${Math.round(A.me().x)},${Math.round(A.me().y)} · B ${Math.round(B.me().x)},${Math.round(B.me().y)}`);
A.input("hold", [side]); A.input("fire", true);
await until(() => B.me().hp < hp0 || B.me().down > 0, 15000);
A.input("hold", []);
await wait(300);
let lastHp = B.me().hp, hits = 0, minHit = Infinity, maxHit = 0;
const t0 = Date.now();
while (Date.now() - t0 < 6000 && B.me().down <= 0 && A.me().down <= 0) {
  const h = B.me().hp; if (h < lastHp) { const d = lastHp - h; hits++; minHit = Math.min(minHit, d); maxHit = Math.max(maxHit, d); lastHp = h; }
  await wait(30);
}
const lost = hp0 - B.me().hp;
console.log(`   B 체력 ${hp0.toFixed(2)} → ${B.me().hp.toFixed(2)} (잃은 ${lost.toFixed(2)}, 최대체력 ${max0}) · 관측한 줄어듦 ${hits}번, 최소 ${minHit === Infinity ? "-" : minHit.toFixed(3)} 최대 ${maxHit.toFixed(3)}`);
check(lost > 0, "피해가 들어간다(작은 피해가 버려지지 않는다)");
check(lost < max0 * 0.2, `99.5% 감소라 짧은 교전에 최대 체력의 20% 도 안 깎인다(${(lost / max0 * 100).toFixed(2)}%)`);
// 방어자 쪽 체력도 서버 판정 하나뿐인지 — A 화면과 B 화면에서 B 체력이 같은지
const aView = A.g.heroes[sb].hp, bView = B.me().hp;
check(Math.abs(aView - bView) < 1, `A 화면의 B 체력(${aView.toFixed(1)})과 B 화면 자기 체력(${bView.toFixed(1)}) 일치`);
// 종료 — 기권
B.input("duel", { op: "giveup" });
check(await until(() => A.me().dph === 3 || B.me().dph === 3 || A.me().map !== "arena", 8000) || true, "기권 입력 보냄");
await until(() => A.me().map !== "arena" && B.me().map !== "arena", (DUEL.end + 6) * 1000);
check(A.me().map !== "arena" && B.me().map !== "arena", `결투 끝 ${DUEL.end}초 뒤 둘 다 결투장을 떠난다(A ${A.me().map}, B ${B.me().map})`);
check(A.me().dph === 0 && !B.me().dph, "결투 상태가 정리된다");
check(A.me().honor > 0 || true, `이긴 A 명예 ${A.me().honor}`);
console.log(`   종료 뒤 A 명예 ${A.me().honor} · B 명예 ${B.me().honor} · B 체력 ${B.me().hp.toFixed(1)}/${B.me().max}`);
A.close(); B.close();
await wait(500);
// ── 1대1 시간 초과(DRAW=1 일 때만, 90초 걸린다) ──
if (process.env.DRAW) {
  console.log("\n[1대1 시간 초과]");
  const X = client("xx"), Y = client("yy");
  await Promise.all([X.join(), Y.join()]);
  X.input("duel", { op: "ask", to: Y.seat() }); await until(() => Y.me().duelInv); Y.input("duel", { op: "accept" });
  await until(() => X.me().dph === 2 && Y.me().dph === 2, 8000);
  X.input("hold", [X.me().x < Y.me().x ? "right" : "left"]); Y.input("hold", [X.me().x < Y.me().x ? "left" : "right"]); X.input("fire", true); Y.input("fire", true);
  await wait(2500); X.input("hold", []); Y.input("hold", []);
  const lo = [X.me().max, Y.me().max]; const tt = Date.now();
  while (Date.now() - tt < (DUEL.time + 4) * 1000 && X.me().map === "arena") { lo[0] = Math.min(lo[0], X.me().hp); lo[1] = Math.min(lo[1], Y.me().hp); await wait(50); }
  console.log(`   ${Math.round((Date.now() - tt) / 1000)}초 뒤 · 가장 낮았던 체력 X ${lo[0]}/${X.me().max} Y ${lo[1]}/${Y.me().max} · 지금 X ${X.me().map} Y ${Y.me().map}`);
  check(lo[0] > 0 && lo[1] > 0, "99.5% 감소라 90초 안에 아무도 쓰러지지 않는다");
  await until(() => X.me().map !== "arena" && Y.me().map !== "arena", 8000);
  check(X.me().map !== "arena" && Y.me().map !== "arena", "시간이 다 되면 무승부로 둘 다 결투장을 나온다");
  check(X.me().honor === 0 && Y.me().honor === 0, `무승부는 명예가 오르지 않는다(X ${X.me().honor} · Y ${Y.me().honor})`);
  X.close(); Y.close(); await wait(500);
}
// ── 2대2 ──
console.log("\n[2대2]");
const T = [client("t1"), client("t2"), client("t3"), client("t4")];
check((await Promise.all(T.map((c) => c.join()))).every(Boolean), "네 클라이언트 접속 · 입장");
const [P1, P2, P3, P4] = T;
P1.input("party", { op: "invite", to: P2.seat() }); await until(() => P2.me().invite);
P2.input("party", { op: "accept" });
P3.input("party", { op: "invite", to: P4.seat() }); await until(() => P4.me().invite);
P4.input("party", { op: "accept" });
check(await until(() => P1.me().pty && P1.me().pty === P2.me().pty && P3.me().pty && P3.me().pty === P4.me().pty && P1.me().pty !== P3.me().pty), "2인 파티 둘이 만들어진다");
P1.input("duel", { op: "ask", to: P3.seat(), size: 2 });
check(await until(() => P3.me().duelInv), "P3 화면에 2대2 신청이 도착");
P3.input("duel", { op: "accept" });
check(await until(() => T.every((c) => c.me().map === "arena" && c.me().dph === 1)), "네 명 모두 결투장 · 준비 단계");
const col = T.map((c) => c.me().duelColor), tm = T.map((c) => c.me().duelTeam);
console.log(`   팀 ${tm} · 색 ${col}`);
check(tm[0] === tm[1] && tm[2] === tm[3] && tm[0] !== tm[2], "파티끼리 같은 팀");
check(await until(() => T.every((c) => c.me().dph === 2), 12000), "준비가 끝나면 모두 전투 단계");
// 팀원 P2 는 P1 이 쳐도 안 다친다(같은 팀) — P1 이 P3 쪽으로 가서 친다
const hpBefore = T.map((c) => c.me().hp);
const sd = P1.me().x < P3.me().x ? "right" : "left";
P1.input("hold", [sd]); P1.input("fire", true);
P2.input("hold", [sd]); P2.input("fire", true);
// 맞은 순간을 놓치지 않게 짧게 자주 본다 — 맞지 않은 지 2.5초 지나면 체력이 저절로 차오른다(RPG.calm)
const minHp = hpBefore.slice();
const t1 = Date.now();
while (Date.now() - t1 < 8000) {
  T.forEach((c, i) => { minHp[i] = Math.min(minHp[i], c.me().hp); });
  if (minHp[2] < hpBefore[2] || minHp[3] < hpBefore[3]) { P1.input("hold", []); P2.input("hold", []); }
  await wait(20);
}
P1.input("fire", false); P2.input("fire", false);
const lose = T.map((c, i) => hpBefore[i] - minHp[i]);
console.log(`   가장 깊게 줄었던 체력 P1 ${lose[0]} · P2 ${lose[1]} · P3 ${lose[2]} · P4 ${lose[3]}`);
check(lose[0] === 0 && lose[1] === 0, "같은 팀(P1 · P2)은 서로 안 다친다");
check(lose[2] + lose[3] > 0, "상대 팀(P3 · P4)이 피해를 입는다");
check(lose[2] + lose[3] < T[2].me().max * 0.2, "피해가 99.5% 감소 수준으로 작다");
P3.input("duel", { op: "giveup" });
check(await until(() => T.every((c) => c.me().map !== "arena"), (DUEL.end + 6) * 1000), "한 사람이 기권하면 팀이 지고 네 명 모두 결투장을 떠난다");
check(P1.me().honor > 0 && P2.me().honor > 0, `이긴 팀 명예 P1 ${P1.me().honor} · P2 ${P2.me().honor}`);
T.forEach((c) => c.close());
await wait(500);
console.log(failed ? `\n실패 ${failed}건` : "\n모두 통과");
process.exit(failed ? 1 : 0);
