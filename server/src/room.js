/* ── RPG 서버 한 곳(RPG1~RPG4) — 예전 "방장" 브라우저가 하던 일을 서버가 한다 ─────────────
   - 접속: 붙은 뒤 첫 말(auth)로 이 창만 아는 비밀값을 보낸다. 같은 접속 id 로 다시 붙으면 비밀값이 맞을 때만 옛 연결을 잇는다.
     남에게는 접속 id 대신 따로 만든 id(pub)만 보인다 — id 를 알아도 남의 자리로 붙을 수 없게
   - 자리: 들어온 사람에게 차례로 자리를 준다(App.jsx seatRpg 와 같은 규칙, 정원 RPG_SERVER_CAP) · 떠나면 GRACE 초 뒤 뺀다(잠깐 끊겼다 다시 붙으면 그대로)
   - 판정: 사람이 있는 동안만 TICK_MS 마다 rpgStep 을 돈다. 아무도 없으면 멈춘다(요금이 붙지 않는다)
   - 스냅샷: 사람마다 제 맵 몹 · 연출만 골라 SNAP_HZ 번 보낸다(받는 메시지는 요금에 셈하지 않는다)
   - 저장: 서버 계정(이름 + 입장권)이 있는 캐릭터는 서버가 불러오고 SAVE_EVERY 초마다 · 떠날 때 저장한다.
     계정이 없는(이 기기에만 있는) 캐릭터는 예전처럼 화면이 보낸 기록을 싣고 저장하지 않는다
   화면과 주고받는 말은 예전 방장과 같다 — lobby · rsnap · chat 을 보내고 hello · pick · rjoin · input · chat 을 받는다(서버만의 말: auth) */
import {
  RPG_CREW_MAX, RPG_SERVER_CAP, makeWorld, rpgStep, rpgSyncSeats, rpgJoin, rpgPack, cleanLook, heroRecord, mapIdx,
} from "../../src/game/rpg.js";
import { rpgInput } from "../../src/game/rpgInput.js";
import { CHAT } from "../../src/game/socialData.js";
import { loadChar, saveChar, saveOn } from "./save.js";

const TICK_MS = 25;          // 판정 간격 — 입력은 받자마자 규칙에 넘기고, 결과는 다음 스냅샷으로 간다
const STEP_MAX = 0.05;
const SNAP_HZ = 20;          // 초당 스냅샷 — 서버는 받는 사람 수로 셈하는 한도가 없다(한 통 0.5KB 안팎). 많을수록 스킬 · 걷기가 덜 늦다
const OUT_PER_SNAP = 120;    // 스냅샷 한 통에 싣는 연출 수(RpgView.jsx 와 같은 값)
const OUT_KEEP = 240;
const GRACE = 6;             // 끊긴 사람의 자리를 남겨 두는 초 — 휴대폰이 잠깐 끊겼다 붙어도 그대로 잇는다
const SAVE_EVERY = 10;       // 서버 저장 간격(초)
const SRV_ID = "srv";        // 대기실의 방장 id — 화면은 이 값으로 "내가 방장이 아니다"를 안다
const STOP_SAVE = ["stale", "busy", "moved"];   // 거래 트리거(trade.sql)가 막은 저장 — 다시 보내지 않는다(save.js 가 옛 400 답도 이 이름으로 바꾼다)
const RUSH_MS = 15;          // 입력 때 바로 보내는 스냅샷 사이 최소 간격 — 여럿이 한꺼번에 눌러도 이보다 자주 보내지 않는다
const AUTH_MS = 5000;        // 붙은 뒤 이 안에 비밀값(auth)을 보내지 않으면 끊는다
const AUTH_WAIT = 20;        // 비밀값을 확인하는 동안 쌓아 두는 말 수 — 넘으면 버린다
const SECRET = /^[0-9a-f]{32,128}$/;   // 비밀값 모양(rpgServer.js mySecret — 32바이트 16진수)
const ID = /^[A-Za-z0-9_-]{1,40}$/;    // 접속 id 모양(room.js myId — 8글자)
// 끊는 까닭 — 화면은 다시 붙기를 그대로 한다(옛 연결이 떠나면 그 id 가 풀린다)
const CLOSE = { replaced: 4000, noAuth: 4001, badAuth: 4003 };

const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))]
  .map((b) => b.toString(16).padStart(2, "0")).join("");
// 남에게 보이는 id — 접속 id(8글자 base36)와 겹치지 않게 "~" 로 시작한다
const newPub = () => "~" + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => (b % 36).toString(36)).join("");
// 스냅샷 안의 접속 id 를 pub 으로 바꾼다(월드보스 합동 공격 owner 처럼 깊이 들어 있는 것까지)
function mask(v, pubs) {
  if (typeof v === "string") return pubs.get(v) ?? v;
  if (Array.isArray(v)) return v.map((x) => mask(x, pubs));
  if (v && typeof v === "object") {
    const o = {};
    for (const k in v) o[k] = mask(v[k], pubs);
    return o;
  }
  return v;
}

export class RpgRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.conns = new Map();          // 접속 id → { id, ws, name, chatAt, gone } — 비밀값을 확인한 연결만
    this.keys = new Map();           // 접속 id → { hash 처음 붙은 연결의 비밀값 해시, pub 남에게 보이는 id } — 자리를 빼면 지운다
    this.seats = new Array(RPG_CREW_MAX).fill(null);   // { id, name, hero }
    this.accts = new Map();          // 접속 id → { name, tok, base, admin, look, savedKey, dead }
    this.loading = new Set();        // 계정을 불러오는 중인 접속 id
    this.g = null;
    this.timer = null;
    this.last = 0;
    this.sinceSnap = 0;
    this.sinceSave = 0;
    this.rushAt = 0;
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/where") {               // 이 방이 도는 곳(Cloudflare 데이터센터) — 점검용
      const t = await fetch("https://www.cloudflare.com/cdn-cgi/trace").then((r) => r.text()).catch(() => "");
      return new Response((t.match(/colo=(\w+)/) || [])[1] || "?");
    }
    const id = String(url.searchParams.get("id") || "");
    if (!ID.test(id)) return new Response("id", { status: 400 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(id, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /* ── 접속 ─────────────────────────────────────────── */
  // 붙었다 — 첫 말(auth)의 비밀값을 확인할 때까지는 자리 · 판정에 끼우지 않는다
  attach(id, ws) {
    const c = { id, ws, name: "", chatAt: 0, gone: 0, ok: false, checking: false, closed: false, queue: [] };
    ws.addEventListener("message", (e) => this.onRaw(c, e.data));
    const bye = () => {
      c.closed = true;
      if (this.conns.get(id) === c) c.gone = Date.now();
    };
    ws.addEventListener("close", bye);
    ws.addEventListener("error", bye);
    c.timer = setTimeout(() => { if (!c.ok) this.refuse(c, CLOSE.noAuth, "auth"); }, AUTH_MS);
  }
  refuse(c, code, why) {
    c.closed = true;
    clearTimeout(c.timer);
    try { c.ws.close(code, why); } catch { /* 이미 닫혔다 */ }
  }
  onRaw(c, raw) {
    if (c.ok) return this.onMessage(c, raw);
    if (c.closed) return;
    if (c.checking) { if (c.queue.length < AUTH_WAIT) c.queue.push(raw); return; }   // 확인 중에 온 말(hello 등)은 끝나면 처리한다
    c.checking = true;
    this.auth(c, raw);
  }
  // 비밀값 확인 — 이 id 를 처음 본다면 해시를 기억하고, 이미 있으면 같을 때만 옛 연결을 닫고 잇는다. 틀리면 이 연결만 닫는다
  async auth(c, raw) {
    let m = null;
    try { m = typeof raw === "string" && raw.length < 1000 ? JSON.parse(raw) : null; } catch { /* 아래에서 거절 */ }
    const secret = m && m.k === "auth" && m.d && typeof m.d.s === "string" ? m.d.s : "";
    if (!SECRET.test(secret)) return this.refuse(c, CLOSE.badAuth, "auth");
    const hash = await sha256(secret);
    if (c.closed) return;                            // 확인하는 사이에 끊겼다
    const key = this.keys.get(c.id);
    if (key && key.hash !== hash) return this.refuse(c, CLOSE.badAuth, "auth");   // 남의 id — 기존 연결은 그대로 둔다
    if (!key) this.keys.set(c.id, { hash, pub: this.freshPub() });
    clearTimeout(c.timer);
    const old = this.conns.get(c.id);
    if (old && old.ws !== c.ws) { try { old.ws.close(CLOSE.replaced, "replaced"); } catch { /* 이미 닫혔다 */ } }
    c.ok = true;
    this.conns.set(c.id, c);
    this.start();
    for (const r of c.queue.splice(0)) this.onMessage(c, r);
  }
  freshPub() {
    const used = new Set([...this.keys.values()].map((k) => k.pub));
    let p = newPub();
    while (used.has(p)) p = newPub();
    return p;
  }
  pubOf(id) { const k = this.keys.get(id); return k ? k.pub : "~"; }
  send(c, k, d, from = SRV_ID) {
    if (!c || c.gone) return;
    try { c.ws.send(JSON.stringify({ k, d, from })); } catch { c.gone = c.gone || Date.now(); }
  }
  // 보는 사람마다 — 제 자리만 접속 id 그대로(화면이 내 자리를 찾는다), 남의 자리는 pub
  lobbyFor(c) {
    const seats = this.seats.map((s) => (s ? { ...s, id: s.id === c.id ? s.id : this.pubOf(s.id) } : null));
    return { hostId: SRV_ID, seats, waves: 0, diff: "normal", mode: "rpg" };
  }
  filled() { return this.seats.filter(Boolean).length; }
  publish() {
    this.conns.forEach((c) => this.send(c, "lobby", this.lobbyFor(c)));
    if (this.g) rpgSyncSeats(this.g, this.seats);
  }

  onMessage(c, raw) {
    if (this.conns.get(c.id) !== c) return;          // 새 연결로 바뀐 옛 연결이 늦게 보낸 말
    if (typeof raw !== "string" || raw.length > 40000) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.k !== "string") return;
    const d = m.d;
    if (m.k === "hello") { c.name = String((d && d.name) || "").slice(0, 8); this.send(c, "lobby", this.lobbyFor(c)); }
    else if (m.k === "pick") this.pick(c, d);
    else if (m.k === "rjoin") this.rjoin(c, d);
    else if (m.k === "input") {                   // 남의 자리 입력은 받지 않는다
      if (this.seatOf(c.id) !== (d && d.cls)) return;
      if (d.kind === "trade") return; // 전용 서버에서는 개인 거래를 지원하지 않는다
      rpgInput(this.g, d);
      this.now();                                   // 받자마자 판정하고 결과를 보낸다 — 다음 스냅샷 때까지 기다리지 않는다
    }
    else if (m.k === "chat") this.chat(c, d);
    else if (m.k === "bye") this.drop(c.id);
    else if (m.k === "ping") this.send(c, "pong", d);   // 왕복 시간 재기
  }
  seatOf(id) { return this.seats.findIndex((s) => s && s.id === id); }

  // 자리를 부탁했다 — 서버 계정이 있으면 불러온 뒤 자리를 준다. 정원이 찼으면 불러오지도 않는다
  pick(c, d) {
    if (!d || this.seatOf(c.id) >= 0 || this.filled() >= RPG_SERVER_CAP) return this.send(c, "lobby", this.lobbyFor(c));
    const look = cleanLook(d.hero);
    if (!look) return;
    const acct = d.acct && typeof d.acct.name === "string" && typeof d.acct.tok === "string" ? d.acct : null;
    if (acct && saveOn(this.env)) {
      if (this.accts.has(c.id)) return this.seat(c, this.accts.get(c.id).look || look);
      if (this.loading.has(c.id)) return;
      this.loading.add(c.id);
      loadChar(this.env, acct.name, acct.tok).then((r) => {
        this.loading.delete(c.id);
        if (!this.conns.has(c.id) || this.conns.get(c.id).gone) return;
        if (r && r.ok && r.data) {
          const base = r.data;
          // 직업 · 원소 · 성별은 한 번 정하면 바꿀 수 없다 — 관리자만 고른 모습 그대로
          const kept = base.picked && !r.admin ? cleanLook({ ...base, name: r.name }) : null;
          const use = kept || { ...look, name: r.name };
          this.accts.set(c.id, { name: r.name, tok: acct.tok, base, admin: !!r.admin, look: use, savedKey: "", dead: false });
          this.seat(c, use);
        } else if (r && r.err === "token") this.send(c, "deny", {});   // 다른 기기가 나중에 들어왔다 — 화면은 입장권을 비우고 이 기기 기록으로 다시 부탁한다
        // 저장소에 닿지 못했으면 — 화면이 1.5초마다 다시 부탁한다
      });
      return;
    }
    this.seat(c, look);
  }
  // 자리를 준다 — 정원(RPG_SERVER_CAP)을 여기서 센다. 불러오기가 여럿 겹쳐 끝나도 한 번에 하나씩 앉으니 정원을 넘지 않는다
  seat(c, look) {
    if (this.seatOf(c.id) >= 0) return;
    const free = this.seats.findIndex((s) => !s);
    if (free < 0 || this.filled() >= RPG_SERVER_CAP) return this.send(c, "lobby", this.lobbyFor(c));   // 가득 찼다 — 화면이 다음 서버로 넘어간다
    this.seats[free] = { id: c.id, name: look.name, hero: look };
    this.publish();
  }
  // 들어온 사람의 기록 — 서버 계정이면 불러온 기록을 싣고, 화면이 보낸 것은 자동 평타 · 누르는 방향만 쓴다
  rjoin(c, d) {
    if (!d || this.seatOf(c.id) !== d.cls) return;
    const a = this.accts.get(c.id);
    const data = d.data && typeof d.data === "object" ? d.data : {};
    const use = a ? { ...a.base, admin: a.admin, auto: data.auto, hold: data.hold } : { ...data, admin: false };   // 계정 없는 캐릭터는 관리자가 될 수 없다
    rpgJoin(this.g, d.cls, use, c.id);
  }
  chat(c, d) {
    if (!d || typeof d.t !== "string" || this.seatOf(c.id) < 0) return;
    const now = Date.now();
    if (now - c.chatAt < CHAT.gap * 1000 * 0.8) return;
    c.chatAt = now;
    const out = { t: d.t.slice(0, CHAT.max), s: d.s === "party" ? "party" : "all", p: Number(d.p) || 0 };
    const from = this.pubOf(c.id);
    this.conns.forEach((o) => { if (o !== c) this.send(o, "chat", out, from); });
  }
  // 떠났다 — 저장하고 자리를 뺀다
  drop(id) {
    const c = this.conns.get(id);
    this.saveOne(id);
    this.accts.delete(id);
    this.loading.delete(id);
    if (c) { try { c.ws.close(1000, "bye"); } catch { /* 이미 닫혔다 */ } }
    this.conns.delete(id);
    this.keys.delete(id);                          // 자리를 뺐다 — 이 id 는 다음에 처음 붙는 연결의 것이 된다
    const pi = this.seatOf(id);
    if (pi >= 0) { this.seats[pi] = null; this.publish(); }
  }

  /* ── 저장 ─────────────────────────────────────────── */
  saveOne(id) {
    const a = this.accts.get(id);
    const pi = this.seatOf(id);
    if (!a || a.dead || pi < 0 || !this.g) return;
    const rec = heroRecord(this.g.heroes[pi], a.base, a.look);
    if (!rec) return;
    const key = JSON.stringify(rec);
    if (key === a.savedKey) return;               // 바뀐 것이 없다
    a.savedKey = key;
    a.base = rec;
    saveChar(this.env, a.name, a.tok, rec).then((r) => {
      if (r && r.err === "token") {                 // 다른 기기가 나중에 들어왔다 — 이 접속은 더 저장하지 않는다
        a.dead = true;
        this.send(this.conns.get(id), "kick", {});
      } else if (r && STOP_SAVE.includes(r.err)) {  // 거래 트리거가 막았다 — 다시 보내도 똑같이 막힌다. 한 번 남기고 이 접속은 저장을 멈춘다
        a.dead = true;
        console.warn(`저장 멈춤 ${a.name}: ${r.err}`);
      } else if (!r || !r.ok) a.savedKey = "";        // 다음에 다시
    });
  }

  /* ── 판정 루프 ────────────────────────────────────── */
  start() {
    if (this.timer) return;
    if (!this.g) { this.g = makeWorld(); this.g.mySeat = -1; this.g.out = []; rpgSyncSeats(this.g, this.seats); }
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
  // 입력을 받았다 — 지금까지 흐른 만큼 판정을 돌리고 곧바로 스냅샷을 보낸다(평타 · 스킬 연출 · 소리가 덜 늦다)
  now() {
    if (!this.timer || !this.g) return;
    const t = Date.now();
    if (t - this.rushAt < RUSH_MS) return;
    this.rushAt = t;
    this.tick(true);
  }
  tick(rush) {
    const now = Date.now();
    const real = Math.min(0.25, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    // 끊긴 사람 — GRACE 초 안에 다시 붙지 않으면 뺀다
    this.conns.forEach((c, id) => { if (c.gone && now - c.gone > GRACE * 1000) this.drop(id); });
    if (!this.conns.size) {                         // 아무도 없다 — 멈추고 세계도 버린다(다음 사람이 오면 새로 연다)
      this.stop();
      this.g = null;
      this.seats = new Array(RPG_CREW_MAX).fill(null);
      return;
    }
    const g = this.g;
    for (let left = real; left > 0; left -= STEP_MAX) rpgStep(g, Math.min(left, STEP_MAX));
    this.sinceSnap += real;
    if (rush) { this.sinceSnap = 0; this.snap(); }
    else if (this.sinceSnap >= 1 / SNAP_HZ) {
      this.sinceSnap = Math.min(this.sinceSnap - 1 / SNAP_HZ, 1 / SNAP_HZ);
      this.snap();
    }
    this.sinceSave += real;
    if (this.sinceSave >= SAVE_EVERY) {
      this.sinceSave = 0;
      this.accts.forEach((_, id) => this.saveOne(id));
    }
  }
  // 사람마다 제 맵 몹 · 연출만 — 영웅 · 가방 · 던전은 모두에게 같다
  snap() {
    const g = this.g;
    const base = rpgPack(g);
    base.q = Date.now();
    base.ver = "srv";
    // 자리 주인 id(w) · 월드보스 · 길드 상태 안의 접속 id 는 pub 으로 — 보내기 직전 제 것만 되돌린다(아래 mine)
    const pubs = new Map();
    this.seats.forEach((st) => { if (st) pubs.set(st.id, this.pubOf(st.id)); });
    base.w = base.w.map((x) => (x ? pubs.get(x) || "~" : ""));
    for (const k of ["wb", "gr", "grr"]) if (base[k]) base[k] = mask(base[k], pubs);
    const out = g.out.splice(0, OUT_PER_SNAP);
    if (g.out.length > OUT_KEEP) g.out.splice(0, g.out.length - OUT_KEEP);
    const byMap = new Map();
    this.conns.forEach((c) => {
      if (c.gone) return;
      const pi = this.seatOf(c.id);
      const h = pi >= 0 ? g.heroes[pi] : null;
      const map = h ? h.map : "plaza";
      let msg = byMap.get(map);
      if (!msg) {
        const mi = mapIdx(map);
        const o = out.filter((it) => it.k !== "fx" || !it.map || it.map === map);
        msg = JSON.stringify({ k: "rsnap", d: { ...base, m: base.m.filter((r) => r[1] === mi), ...(o.length ? { o } : {}) }, from: SRV_ID });
        byMap.set(map, msg);
      }
      // 내 자리 주인 id 는 접속 id 그대로 — 화면이 제 영웅인지 견준다(ownHero)
      const mine = h ? msg.split(JSON.stringify(this.pubOf(c.id))).join(JSON.stringify(c.id)) : msg;
      try { c.ws.send(mine); } catch { c.gone = c.gone || Date.now(); }
    });
  }
}
