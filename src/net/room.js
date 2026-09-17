import { createClient } from "@supabase/supabase-js";

/* ────────────────────────────────────────────────────────────
   방 연결. Supabase Realtime 채널 하나를 방 하나로 쓴다.
   - presence : 지금 방에 누가 있는지
   - broadcast: 로비 상태 · 입력 · 게임 상태
   판정은 방장(호스트) 한 명만 하고 나머지는 결과를 받아 그린다.
   ──────────────────────────────────────────────────────────── */

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

export const netReady = Boolean(URL && KEY);

let client = null;
function supabase() {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 40 } },
    });
  }
  return client;
}

// 헷갈리는 글자(0/O, 1/I)는 뺀다
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(n = 4) {
  let s = "";
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

// 탭마다 다른 사람으로 본다. 같은 브라우저에서 창을 두 개 띄워도 서로 다른 참가자가 된다
export function myId() {
  const KEY_ID = "flg:id";
  let v = sessionStorage.getItem(KEY_ID);
  if (!v) {
    v = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(KEY_ID, v);
  }
  return v;
}

/* 개발 중 같은 브라우저의 여러 탭으로 손쉽게 확인하려고 쓰는 전송 (?net=local) */
function wantsLocal() {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(location.search).get("net") === "local";
}

function joinLocal(code, { id, name, onPeers, onStatus }) {
  const bc = new BroadcastChannel(`flg-local:${code}`);
  const handlers = new Map();
  const peers = new Map();
  let mine = { id, name, at: Date.now() };

  const pushPeers = () => onPeers?.([...peers.values()]);
  const announce = () => bc.postMessage({ t: "here", p: mine });

  bc.onmessage = ({ data }) => {
    if (data.t === "here") {
      const known = peers.has(data.p.id);
      peers.set(data.p.id, data.p);
      pushPeers();
      if (!known) announce();            // 새로 온 사람에게 나를 알린다
    } else if (data.t === "gone") {
      peers.delete(data.p);
      pushPeers();
    } else if (data.t === "msg" && data.from !== id) {
      handlers.get(data.k)?.(data.d, data.from);
    }
  };

  peers.set(id, mine);
  setTimeout(() => { onStatus?.("SUBSCRIBED"); announce(); pushPeers(); }, 60);
  const beat = setInterval(announce, 1500);

  return {
    code,
    send(k, d) { bc.postMessage({ t: "msg", k, d, from: id }); },
    on(k, fn) { handlers.set(k, fn); return () => handlers.delete(k); },
    setPresence(patch) { mine = { ...mine, ...patch }; announce(); },
    leave() {
      clearInterval(beat);
      bc.postMessage({ t: "gone", p: id });
      handlers.clear();
      bc.close();
    },
  };
}

/**
 * 방에 접속한다.
 * @returns {{ send, on, setPresence, leave, code }}
 */
export function joinRoom(code, opts) {
  if (wantsLocal()) return joinLocal(code, opts);
  return joinRealtime(code, opts);
}

function joinRealtime(code, { id, name, onPeers, onStatus }) {
  const ch = supabase().channel(`flg:${code}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: id },
    },
  });

  const handlers = new Map();

  ch.on("broadcast", { event: "msg" }, ({ payload }) => {
    const fn = handlers.get(payload.k);
    if (fn) fn(payload.d, payload.from);
  });

  ch.on("presence", { event: "sync" }, () => {
    const raw = ch.presenceState();
    const peers = Object.entries(raw).map(([key, arr]) => ({ id: key, ...(arr[0] || {}) }));
    onPeers?.(peers);
  });

  let joined = false;
  ch.subscribe(async (status) => {
    onStatus?.(status);
    if (status === "SUBSCRIBED" && !joined) {
      joined = true;
      await ch.track({ name, at: Date.now() });
    }
  });

  return {
    code,
    send(k, d) {
      ch.send({ type: "broadcast", event: "msg", payload: { k, d, from: id } });
    },
    on(k, fn) {
      handlers.set(k, fn);
      return () => handlers.delete(k);
    },
    setPresence(patch) {
      return ch.track({ name, at: Date.now(), ...patch });
    },
    leave() {
      handlers.clear();
      supabase().removeChannel(ch);
    },
  };
}
