import { joinRelay } from "./relay.js";

/* ────────────────────────────────────────────────────────────
   방 연결. Cloudflare 워커의 방 중계(Relay) 하나를 방 하나로 쓴다.
   - 접속자 목록: 지금 방에 누가 있는지
   - 방송: 로비 상태 · 입력 · 게임 상태
   판정은 방장(호스트) 한 명만 하고 나머지는 결과를 받아 그린다.
   (예전에는 Supabase Realtime 이었으나 무료 한도를 넘어 2026-10-28 에 옮겼다)
   ──────────────────────────────────────────────────────────── */

export const netReady = true;

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

/* ── 방장에게만 가는 통로(개발용 ?net=local 에서만) ─────────────────────
   Cloudflare 중계는 방 채널로 보내는 입력도 메시지 한도에 걸리지 않아 따로 통로를 두지 않는다
   (그래서 중계 방은 toHost · hostInbox 가 없고 RpgView 가 방 채널로 보낸다). */
function makePipes(code, id, handlers, open) {
  let mine = null;
  const inbox = new Map();
  const deliver = (m) => { if (m && typeof m.k === "string") handlers.get(m.k)?.(m.d, m.from); };
  return {
    toHost(k, d, fallback) {
      if (!mine) mine = open(`${code}:in:${id}`, () => {});
      if (mine.ready()) mine.send({ k, d, from: id });
      else fallback(k, d);
    },
    hostInbox(ids) {
      const want = new Set((ids || []).filter((x) => x && x !== id));
      for (const [gid, p] of inbox) if (!want.has(gid)) { p.close(); inbox.delete(gid); }
      for (const gid of want) if (!inbox.has(gid)) inbox.set(gid, open(`${code}:in:${gid}`, deliver));
    },
    close() {
      mine?.close();
      mine = null;
      for (const p of inbox.values()) p.close();
      inbox.clear();
    },
  };
}

const localPipe = (topic, onMsg) => {
  const bc = new BroadcastChannel(`flg-local:${topic}`);
  bc.onmessage = ({ data }) => onMsg(data);
  let open = true;
  return { ready: () => open, send: (m) => { if (open) bc.postMessage(m); }, close: () => { open = false; bc.close(); } };
};

/* 개발 중 같은 브라우저의 여러 탭으로 손쉽게 확인하려고 쓰는 전송 (?net=local) */
function wantsLocal() {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(location.search).get("net") === "local";
}

function joinLocal(code, { id, name, onPeers, onStatus, onHeard }) {
  const bc = new BroadcastChannel(`flg-local:${code}`);
  const handlers = new Map();
  const peers = new Map();
  let mine = { id, name, at: Date.now() };
  let closed = false;                    // 나간 뒤 늦게 도는 타이머가 닫힌 채널에 보내지 않게

  const pushPeers = () => onPeers?.([...peers.values()]);
  const announce = () => { if (!closed) bc.postMessage({ t: "here", p: mine }); };

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
      onHeard?.(data.k, data.from);
      handlers.get(data.k)?.(data.d, data.from);
    }
  };

  peers.set(id, mine);
  setTimeout(() => { onStatus?.("SUBSCRIBED"); announce(); pushPeers(); }, 60);
  const beat = setInterval(announce, 1500);
  const pipes = makePipes(code, id, handlers, localPipe);

  return {
    code,
    send(k, d) { if (!closed) bc.postMessage({ t: "msg", k, d, from: id }); },
    toHost(k, d) { if (!closed) pipes.toHost(k, d, (k2, d2) => bc.postMessage({ t: "msg", k: k2, d: d2, from: id })); },
    hostInbox(ids) { if (!closed) pipes.hostInbox(ids); },
    on(k, fn) { handlers.set(k, fn); return () => handlers.delete(k); },
    setPresence(patch) { mine = { ...mine, ...patch }; announce(); },
    leave() {
      if (closed) return;
      closed = true;
      clearInterval(beat);
      pipes.close();
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
  return joinRelay(code, opts);
}
