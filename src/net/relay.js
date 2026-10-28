/* ── 방 중계 연결 — 워커의 Relay(server/src/relay.js)에 붙는다 ─────────────
   room.js 의 joinRoom 과 같은 모양(send · on · setPresence · leave · code)이다.
   - 접속자 목록: 서버가 바뀔 때마다 { t:"peers" } 로 모두에게 보낸다(예전 presence)
   - 방송: send(k, d) 는 나를 뺀 방 모두에게 간다
   끊기면 RETRY 초 간격으로 다시 붙는다. 같은 id 로 다시 붙으면 서버가 옛 연결을 닫는다 */
import { wsBase } from "./api.js";

const RETRY = [0.5, 1, 2, 4];      // 다시 붙는 간격(초) — 끝까지 가면 마지막 값으로 계속
const BEAT = 25;                   // 조용할 때 연결이 닫히지 않게 보내는 간격(초)

export function joinRelay(code, { id, name, onPeers, onStatus, onHeard }) {
  const handlers = new Map();
  let ws = null, gone = false, tries = 0, timer = null, beat = null, wasOpen = false;
  let mine = { name };

  const sendRaw = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
  const open = () => {
    if (gone) return;
    ws = new WebSocket(`${wsBase()}/room/${encodeURIComponent(code)}?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name || "")}`);
    ws.onopen = () => {
      tries = 0;
      wasOpen = true;
      sendRaw({ t: "track", p: { ...mine, at: Date.now() } });   // 끊겼다 다시 붙을 때도 소식을 다시 올린다
      clearInterval(beat);
      beat = setInterval(() => sendRaw({ t: "ping" }), BEAT * 1000);
      onStatus?.("SUBSCRIBED");
    };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (!m) return;
      if (m.t === "peers") onPeers?.(m.peers || []);
      else if (m.t === "msg" && typeof m.k === "string") {
        onHeard?.(m.k, m.from);
        handlers.get(m.k)?.(m.d, m.from);
      }
    };
    ws.onclose = () => {
      clearInterval(beat);
      if (gone) return;
      onStatus?.(wasOpen ? "CHANNEL_ERROR" : "TIMED_OUT");
      const wait = RETRY[Math.min(tries++, RETRY.length - 1)];
      timer = setTimeout(open, wait * 1000);
    };
    ws.onerror = () => { /* onclose 가 뒤따른다 */ };
  };
  open();

  return {
    code,
    send(k, d) { sendRaw({ t: "msg", k, d }); },
    on(k, fn) { handlers.set(k, fn); return () => { if (handlers.get(k) === fn) handlers.delete(k); }; },
    setPresence(patch) {
      mine = { ...mine, ...patch };
      sendRaw({ t: "track", p: { ...mine, at: Date.now() } });
    },
    leave() {
      gone = true;
      clearTimeout(timer);
      clearInterval(beat);
      try { ws && ws.close(1000); } catch { /* 이미 닫혔다 */ }
      handlers.clear();
    },
  };
}
