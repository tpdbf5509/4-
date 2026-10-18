/* 입구 — /rpg/<서버>?id=<접속 id> 로 WebSocket 을 열면 그 서버(RPG1~RPG5)의 방(Durable Object)으로 넘긴다 */
import { RPG_SERVERS } from "../../src/game/rpg.js";
export { RpgRoom } from "./room.js";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");
    const m = url.pathname.match(/^\/rpg\/([A-Z0-9]+)$/);
    if (!m || !RPG_SERVERS.includes(m[1])) return new Response("not found", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
    const stub = env.RPG_ROOM.get(env.RPG_ROOM.idFromName(m[1]));
    return stub.fetch(req);
  },
};
