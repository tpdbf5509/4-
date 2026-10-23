import { createClient } from "@supabase/supabase-js";

/* ────────────────────────────────────────────────────────────
   방 연결. Supabase Realtime 채널 하나를 방 하나로 쓴다.
   - presence : 지금 방에 누가 있는지
   - broadcast: 로비 상태 · 입력 · 게임 상태
   판정은 방장(호스트) 한 명만 하고 나머지는 결과를 받아 그린다.
   ──────────────────────────────────────────────────────────── */

// 브라우저에 노출되는 공개 값이라 기본값으로 둔다.
// (publishable 키는 노출을 전제로 만들어진 키이고, 이 프로젝트엔 테이블 없이 실시간 채널만 있다)
// 다른 Supabase 프로젝트를 쓰고 싶으면 환경변수로 덮어쓰면 된다.
const URL = import.meta.env.VITE_SUPABASE_URL || "https://jgxtbtpxmnsfghqmtsnq.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_lwm7FIU-HhslF5ofSikbtQ_G4BNXh9u";

export const netReady = Boolean(URL && KEY);

let client = null;
export function supabase() {
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

/* ── 방장에게만 가는 통로 ─────────────────────────────────────
   방 채널로 보내면 방 안의 모두가 받고, Supabase 는 받는 사람마다 한 통으로 센다.
   그런데 손님의 키 입력은 방장만 쓴다. 13명이면 입력 한 번이 12통이 되어 무료 한도(초당 100통)를 넘었다(10월 19일 기록 섞임 사고).
   그래서 손님마다 방장과 둘만 있는 통로(<코드>:in:<손님 id>)를 하나씩 둔다. 입력 한 번이 1통이 되고, 웹소켓이라 빠르기는 같다.
   (보내기만 하는 REST 길은 120~280ms 더 느려 쓰지 않는다)
   - 손님: toHost(k, d, fallback) — 통로가 아직 붙지 않았으면 fallback(방 채널)으로 보낸다
   - 방장: hostInbox(ids) — 지금 손님들의 통로에 붙는다. 받은 말은 방 채널과 같은 handlers 로 간다 */
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

const realtimePipe = (topic, onMsg) => {
  const sb = supabase();
  let ok = false, gone = false, ch = null;
  const start = () => {
    if (gone) return;
    ch = sb.channel(`flg:${topic}`, { config: { broadcast: { self: false, ack: false } } });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => onMsg(payload));
    ch.subscribe((s) => { ok = !gone && s === "SUBSCRIBED"; });
  };
  // 같은 이름의 채널이 닫히는 중이면(방장이 바뀌어 다시 붙을 때) 다 치운 뒤에 새로 연다
  const old = sb.getChannels().find((c) => c.topic === `realtime:flg:${topic}`);
  if (old) sb.removeChannel(old).catch(() => {}).finally(start);
  else start();
  return {
    ready: () => ok,
    send: (m) => ch?.send({ type: "broadcast", event: "msg", payload: m }),
    close: () => { gone = true; ok = false; if (ch) sb.removeChannel(ch); },
  };
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
  return joinRealtime(code, opts);
}

// onHeard(k, from) — 받은 말마다 부른다(방장이 살아 있는지 스냅샷으로도 알아채려고, App.jsx)
function joinRealtime(code, { id, name, onPeers, onStatus, onHeard }) {
  const sb = supabase();
  const topic = `realtime:flg:${code}`;
  const handlers = new Map();
  let ch = null;
  let gone = false;

  const open = () => {
    if (gone) return;
    ch = sb.channel(`flg:${code}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: id },
      },
    });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      onHeard?.(payload.k, payload.from);
      const fn = handlers.get(payload.k);
      if (fn) fn(payload.d, payload.from);
    });
    ch.on("presence", { event: "sync" }, () => {
      const raw = ch.presenceState();
      const peers = Object.entries(raw).map(([key, arr]) => ({ id: key, ...(arr[0] || {}) }));
      onPeers?.(peers);
    });
    ch.subscribe(async (status) => {
      if (gone) return;
      onStatus?.(status);
      // 끊겼다가 다시 붙을 때도 접속자 목록에 나를 다시 올린다
      if (status === "SUBSCRIBED") await ch.track({ name, at: Date.now() });
    });
  };

  /* 같은 이름의 채널이 아직 남아 있으면(방금 나간 RPG 서버처럼) 라이브러리가 그 채널을 그대로 돌려준다.
     닫히는 중인 채널을 다시 쓰면 붙지 못하므로, 다 치운 뒤에 새로 연다. */
  const old = sb.getChannels().find((c) => c.topic === topic);
  if (old) {
    sb.removeChannel(old).catch(() => {}).finally(() => {
      if (sb.getChannels().includes(old)) sb.realtime?._remove?.(old);
      open();
    });
  } else {
    open();
  }

  const pipes = makePipes(code, id, handlers, realtimePipe);
  const send = (k, d) => ch?.send({ type: "broadcast", event: "msg", payload: { k, d, from: id } });

  return {
    code,
    send,
    toHost(k, d) { if (!gone) pipes.toHost(k, d, send); },
    hostInbox(ids) { if (!gone) pipes.hostInbox(ids); },
    on(k, fn) {
      handlers.set(k, fn);
      return () => handlers.delete(k);
    },
    setPresence(patch) {
      return ch?.track({ name, at: Date.now(), ...patch });
    },
    leave() {
      gone = true;
      pipes.close();
      handlers.clear();
      if (ch) sb.removeChannel(ch);
    },
  };
}
