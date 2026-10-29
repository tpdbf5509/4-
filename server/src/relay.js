/* ── 방 중계 — Supabase Realtime 채널이 하던 일(접속자 목록 · 방송)을 Durable Object 하나가 한다 ─────────────
   방어전 방 · 관리 채널(adm-RPG1 …) · 방장 브라우저가 판정하는 예전 RPG 방이 쓴다(화면은 src/net/relay.js).
   말은 JSON 한 줄이다.
   - 받는 말: { t: "msg", k, d }  방 모두에게(나만 빼고) · { t: "to", to, k, d } 한 사람에게 · { t: "track", p } 내 소식(접속자 목록) 고치기 · { t: "ping" }
   - 보내는 말: { t: "msg", k, d, from } · { t: "peers", peers: [{ id, ...소식 }] } 접속자가 바뀔 때마다 · { t: "pong" }
   같은 id 로 다시 붙으면 옛 연결을 닫고 잇는다(탭 새로 고침 · 끊겼다 다시 붙기). 아무도 없으면 Durable Object 가 알아서 사라진다 */
const MSG_MAX = 262144;        // 한 말의 최대 크기(바이트) — 방어전 스냅샷보다 넉넉하게
const PEERS_MAX = 24;          // 한 방의 최대 인원
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const CLOSE = { replaced: 4000, full: 4002 };

export class Relay {
  constructor(ctx) {
    this.ctx = ctx;
    this.peers = new Map();        // id → { ws, p: 소식 }
  }

  fetch(req) {
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "");
    if (!ID.test(id)) return new Response("id", { status: 400 });
    const name = String(url.searchParams.get("name") || "").slice(0, 16);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(id, name, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  attach(id, name, ws) {
    const old = this.peers.get(id);
    if (!old && this.peers.size >= PEERS_MAX) { try { ws.close(CLOSE.full, "full"); } catch { /* 이미 닫혔다 */ } return; }
    if (old) { try { old.ws.close(CLOSE.replaced, "replaced"); } catch { /* 이미 닫혔다 */ } }
    const peer = { ws, p: { name, at: Date.now() } };
    this.peers.set(id, peer);
    ws.addEventListener("message", (e) => this.onRaw(id, peer, e.data));
    const bye = () => {
      if (this.peers.get(id) !== peer) return;       // 새 연결로 바뀐 옛 연결이 늦게 닫힌 것
      this.peers.delete(id);
      this.publish();
    };
    ws.addEventListener("close", bye);
    ws.addEventListener("error", bye);
    this.publish();
  }

  onRaw(id, peer, raw) {
    if (typeof raw !== "string" || raw.length > MSG_MAX || this.peers.get(id) !== peer) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== "string") return;
    if (m.t === "msg" && typeof m.k === "string") {
      const out = JSON.stringify({ t: "msg", k: m.k, d: m.d, from: id });
      this.peers.forEach((o, oid) => { if (oid !== id) this.sendRaw(o, out); });
    } else if (m.t === "to" && typeof m.k === "string" && typeof m.to === "string") {
      const o = this.peers.get(m.to);
      if (o) this.sendRaw(o, JSON.stringify({ t: "msg", k: m.k, d: m.d, from: id }));
    } else if (m.t === "track" && m.p && typeof m.p === "object" && !Array.isArray(m.p)) {
      peer.p = { ...m.p, at: Date.now() };
      this.publish();
    } else if (m.t === "ping") {
      this.sendRaw(peer, JSON.stringify({ t: "pong" }));
    }
  }

  sendRaw(peer, text) {
    try { peer.ws.send(text); } catch { /* 끊긴 연결은 close 가 치운다 */ }
  }
  publish() {
    const peers = [...this.peers].map(([id, v]) => ({ id, ...v.p }));
    const out = JSON.stringify({ t: "peers", peers });
    this.peers.forEach((v) => this.sendRaw(v, out));
  }
}
