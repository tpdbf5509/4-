/* 입구 — /rpg/<서버>?id=<접속 id> 로 WebSocket 을 열면 그 서버(RPG1~RPG5)의 방(Durable Object)으로 넘긴다.
   방은 처음 만들어진 곳에 계속 머문다. 처음 접속한 사람이 미국에 있으면 방도 미국에 생겨 한국에서 0.2초씩 늦었다.
   그래서 아시아에 만들라고 알려 주고(ROOM.hint), 이름에 차례(ROOM.gen)를 붙여 옛 방(미국)은 버리고 새로 만든다 */
import { RPG_SERVERS } from "../../src/game/rpg.js";
export { RpgRoom } from "./room.js";

const ROOM = { gen: "a2", hint: "apac" };   // 방을 옮겨야 하면 gen 을 바꾼다(그 서버의 방이 새로 생긴다 — 사람이 없을 때 배포)
// 배포 점검(smoke.mjs)만 쓰는 방 — 게임 방(RPG1~5)을 미국의 점검 기계가 먼저 만들지 않게 따로 둔다
const CHECK = "CHECK";
const known = (name) => RPG_SERVERS.includes(name) || name === CHECK;

const roomOf = (env, name) => env.RPG_ROOM.get(env.RPG_ROOM.idFromName(`${name}@${ROOM.gen}`), { locationHint: ROOM.hint });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    // 방이 실제로 어디서 도는지 — 점검용(smoke.mjs)
    const w = url.pathname.match(/^\/where\/([A-Z0-9]+)$/);
    if (w && known(w[1])) return roomOf(env, w[1]).fetch(new Request(`${url.origin}/where`));
    const m = url.pathname.match(/^\/rpg\/([A-Z0-9]+)$/);
    if (!m || !known(m[1])) return new Response("not found", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
    return roomOf(env, m[1]).fetch(req);
  },
};
