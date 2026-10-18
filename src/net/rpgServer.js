/* ── RPG 전용 서버 연결(server/) — 방장 없이 서버가 판정한다 ─────────────
   room.js 의 joinRoom 과 같은 모양(send · on · setPresence · leave · code)이라 App · RpgView 는 손님 경로를 그대로 쓴다.
   끊기면 RETRY 초 간격으로 다시 붙는다(서버는 GRACE 초 동안 자리를 남겨 둔다).

   어느 서버로 붙을지 — 주소 ?srv=cf 로 켜고 ?srv=off 로 끈다(이 기기에 기억한다).
   개발 중 ?srv=local 이면 내 컴퓨터의 서버(wrangler dev, 127.0.0.1:8787)로 붙는다 */
// 배포된 서버 주소 — Cloudflare 워커 이름(server/wrangler.toml name) + 계정의 workers.dev 주소. 바꿀 때는 Vercel 환경 변수 VITE_RPG_SERVER 로 덮어쓴다
const SRV_URL = import.meta.env.VITE_RPG_SERVER || "wss://four-lane-rpg.four-lane.workers.dev";
const LOCAL_URL = "ws://127.0.0.1:8787";
const PICK_KEY = "flg:srv";
const RETRY = [0.5, 1, 2, 4];   // 다시 붙는 간격(초) — 끝까지 가면 마지막 값으로 계속

// 이 기기가 전용 서버를 쓰는가 — 주소의 ?srv= 를 기억해 둔다
export function rpgServerUrl() {
  let pick = "";
  try {
    const q = new URLSearchParams(location.search).get("srv");
    if (q === "cf" || q === "local") localStorage.setItem(PICK_KEY, q);
    if (q === "off") localStorage.removeItem(PICK_KEY);
    pick = localStorage.getItem(PICK_KEY) || "";
  } catch { /* 저장이 막혀 있으면 쓰지 않는다 */ }
  if (pick === "local" && import.meta.env.DEV) return LOCAL_URL;
  if (pick === "cf" && SRV_URL) return SRV_URL;
  return "";
}

export function joinRpgServer(base, code, { id, onPeers, onStatus }) {
  const handlers = new Map();
  let ws = null, gone = false, tries = 0, timer = null, wasOpen = false;
  const open = () => {
    if (gone) return;
    ws = new WebSocket(`${base}/rpg/${encodeURIComponent(code)}?id=${encodeURIComponent(id)}`);
    ws.onopen = () => {
      tries = 0;
      wasOpen = true;
      onPeers?.([]);
      onStatus?.("SUBSCRIBED");
    };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m && typeof m.k === "string") handlers.get(m.k)?.(m.d, m.from);
    };
    ws.onclose = () => {
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
    send(k, d) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ k, d })); },
    on(k, fn) { handlers.set(k, fn); return () => { if (handlers.get(k) === fn) handlers.delete(k); }; },
    setPresence() { /* 서버가 자리를 안다 */ },
    leave() {
      gone = true;
      clearTimeout(timer);
      try { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ k: "bye" })); ws && ws.close(1000); } catch { /* 이미 닫혔다 */ }
      handlers.clear();
    },
    viaServer: true,
  };
}
