/* 입구 — /rpg/<서버>?id=<접속 id> 로 WebSocket 을 열면 그 서버(RPG1~RPG4)의 방(Durable Object)으로 넘긴다.
   방은 처음 만들어진 곳에 계속 머문다. 처음 접속한 사람이 미국에 있으면 방도 미국에 생겨 한국에서 0.2초씩 늦었다.
   그래서 아시아에 만들라고 알려 주고(ROOM.hint), 이름에 차례(ROOM.gen)를 붙여 옛 방(미국)은 버리고 새로 만든다 */
import { RPG_SERVERS } from "../../src/game/rpg.js";
export { RpgRoom } from "./room.js";
export { Ledger } from "./ledger-do.js";
export { Relay } from "./relay.js";

const ROOM = { gen: "a2", hint: "apac" };   // 방을 옮겨야 하면 gen 을 바꾼다(그 서버의 방이 새로 생긴다 — 사람이 없을 때 배포)
// 서버마다 쓰는 방 이름 끝 — 아시아 안에서도 Cloudflare 가 고르는 곳이 달라(홍콩 · 싱가포르 · 도쿄 · 서울) 서울에 생긴 이름을 골라 둔다.
// 없으면 ROOM.gen. 고르는 법: /place/<서버>/<이름끝> 으로 만들어 보고 ICN 이 나온 이름끝을 여기에 적는다
const GENS = { RPG1: "p15", RPG2: "p4", RPG3: "p3", RPG4: "p12" };   // 모두 서울(ICN) — 2026-10-18 고름. 서버는 RPG_SERVERS(rpg.js) 넷
// 배포 점검(smoke.mjs)만 쓰는 방 — 게임 방(RPG1~4)을 미국의 점검 기계가 먼저 만들지 않게 따로 둔다
const CHECK = "CHECK";
// 화면이 /rpc/<함수> 로 부를 수 있는 장부 함수 — rpg_srv_* 는 RPG 서버(RpgRoom)만 쓰므로 열지 않는다
const PUBLIC_RPC = new Set([
  "rpg_name_free", "rpg_create", "rpg_login", "rpg_delete", "rpg_honor_top", "rpg_abyss_top", "rpg_live", "rpg_unlive", "rpg_save", "rpg_load",
  "rpg_trade_open", "rpg_trade_action", "rpg_guild_action", "rpg_market", "rpg_admin_ok", "rpg_admin_ticket", "rpg_admin_redeem",
  "rpg_admin_accounts", "rpg_admin_blocks", "rpg_admin_rename", "rpg_admin_trades", "rpg_admin_feedback", "feedback_insert",
]);
const RPC_BODY_MAX = 65536;          // 요청 크기 한도(바이트) — 기록 한도 30000 + 여유
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
const rpcJson = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json", ...CORS } });
const known = (name) => RPG_SERVERS.includes(name) || name === CHECK;

const roomOf = (env, name, gen) => env.RPG_ROOM.get(env.RPG_ROOM.idFromName(`${name}@${gen || GENS[name] || ROOM.gen}`), { locationHint: ROOM.hint });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    // 이 기기가 들어온 Cloudflare 입구(데이터센터) — 연결 진단 칸이 묻는다. 방(서울)과 멀면 그 사이를 오가느라 늦다
    if (url.pathname === "/edge") return new Response(String((req.cf && req.cf.colo) || "?"), { headers: { "Access-Control-Allow-Origin": "*" } });
    // 방이 실제로 어디서 도는지 — 점검용(smoke.mjs)
    const w = url.pathname.match(/^\/where\/([A-Z0-9]+)$/);
    if (w && known(w[1])) {                         // 화면의 연결 진단 칸도 묻는다(다른 주소라 CORS 를 연다)
      const r = await roomOf(env, w[1]).fetch(new Request(`${url.origin}/where`));
      return new Response(await r.text(), { headers: { "Access-Control-Allow-Origin": "*" } });
    }
    // 방 자리 고르기 — 그 이름끝으로 방을 만들어(이미 있으면 그대로) 도는 곳을 알려 준다. 게임 방 이름끝에는 "p" 를 붙인 것만 받는다
    const pl = url.pathname.match(/^\/place\/([A-Z0-9]+)\/(p[0-9]{1,3})$/);
    if (pl && known(pl[1])) return roomOf(env, pl[1], pl[2]).fetch(new Request(`${url.origin}/where`));
    // 장부(계정 · 저장 · 관리 · 의견) — Supabase 의 rpc 와 같은 모양: POST /rpc/<함수> 에 { p_... } 를 보내면 결과 JSON 이 온다
    const rpc = url.pathname.match(/^\/rpc\/([a-z_]+)$/);
    if (rpc) {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      if (req.method !== "POST" || !PUBLIC_RPC.has(rpc[1])) return rpcJson({ ok: false, err: "op" }, 404);
      const body = await req.text();
      if (body.length > RPC_BODY_MAX) return rpcJson({ ok: false, err: "data" }, 413);
      const r = await env.LEDGER.get(env.LEDGER.idFromName("main"), { locationHint: ROOM.hint }).fetch(`https://ledger/${rpc[1]}`, { method: "POST", body });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "application/json", ...CORS } });
    }
    // 방 중계(방어전 · 관리 채널 · 방장 브라우저가 판정하는 방) — 웹소켓 /room/<방 이름>?id=<접속 id>&name=<이름>
    const rm = url.pathname.match(/^\/room\/([A-Za-z0-9_-]{1,24})$/);
    if (rm) {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
      return env.RELAY.get(env.RELAY.idFromName(rm[1]), { locationHint: ROOM.hint }).fetch(req);
    }
    const m = url.pathname.match(/^\/rpg\/([A-Z0-9]+)$/);
    if (!m || !known(m[1])) return new Response("not found", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
    return roomOf(env, m[1]).fetch(req);
  },
};
