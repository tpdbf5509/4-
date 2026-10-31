/* ── RPG 캐릭터 서버 저장 ─────────────────────────────────────
   이름 + 숫자 5자리 코드로 어느 기기에서든 이어 한다. 표는 server/schema.sql, 함수는 server/src/ledger.js(옛 supabase/rpg.sql 과 같은 규칙).
   - 만들기 · 이어 하기를 하면 서버가 입장권(token)을 준다. 이 기기에 저장해 두고 저장할 때 같이 보낸다.
   - 다른 기기에서 이어 하기를 하면 입장권이 새로 나와, 먼저 있던 기기의 저장은 'token' 으로 거절된다.
   - 저장은 SAVE_EVERY 초마다 바뀐 것이 있을 때 한 번, 그리고 나갈 때 한 번 보낸다.
   틀린 횟수 · 잠금 시간은 서버(rpg_login)가 정하고 결과에 담아 준다. */
import { ledger } from "./api.js";

export const CODE_LEN = 5;
export const SAVE_EVERY = 10;          // 서버에 저장하는 간격(초)

// 숫자 5자리 코드 검사 — 서버(rpg_code_ok)와 같은 규칙. 문제가 없으면 ""
export function codeProblem(code) {
  const c = String(code || "");
  if (!new RegExp(`^[0-9]{${CODE_LEN}}$`).test(c)) return `숫자 ${CODE_LEN}자리를 넣어 주세요.`;
  if (/^(\d)\1+$/.test(c)) return "같은 숫자만 반복한 코드는 쓸 수 없습니다.";
  if ("0123456789".includes(c) || "9876543210".includes(c)) return "12345 · 54321 같은 연속 숫자는 쓸 수 없습니다.";
  return "";
}
// 입력 칸 — 숫자만 남긴다
export const onlyDigits = (v) => String(v || "").replace(/\D/g, "").slice(0, CODE_LEN);

// 장부 호출(워커 /rpc/<함수>) — 연결이 안 되면 { ok:false, err:"net" }
const rpc = ledger;

// 서버 결과 → 화면 문구
export function errText(res) {
  if (!res || res.ok) return "";
  switch (res.err) {
    case "taken": return "이미 쓰는 이름입니다. 다른 이름을 정해 주세요.";
    case "code": return "쓸 수 없는 코드입니다. 같은 숫자 반복이나 연속 숫자는 피해 주세요.";
    case "name": return "이름은 1~8글자입니다.";
    case "wrong": return `이름이나 코드가 맞지 않습니다. ${res.left}번 더 틀리면 잠시 막힙니다.`;
    case "locked": return `여러 번 틀려 잠시 막혔습니다. ${Math.max(1, Math.ceil((res.wait || 0) / 60))}분 뒤에 다시 해 주세요.`;
    case "token": return "다른 기기에서 이 캐릭터로 들어왔습니다. 이어 하려면 코드를 다시 넣어 주세요.";
    case "live": return `이 캐릭터는 지금 ${srvLabel(res.srv)}에 접속 중입니다. 한 캐릭터는 한 곳에서만 할 수 있습니다.${res.wait ? ` 그 창을 닫았다면 ${Math.max(1, res.wait)}초 뒤에 다시 해 주세요.` : ""}`;
    case "guard": return "기록이 다른 캐릭터와 섞인 것 같아 저장을 멈췄습니다. 코드를 다시 넣으면 서버 기록으로 이어 합니다.";
    case "stale": case "moved": return "거래 뒤의 서버 기록을 다시 불러오는 중입니다.";
    case "busy": return "거래 확인 중에는 저장을 잠시 기다립니다.";
    case "data": return "저장할 내용이 너무 큽니다.";
    case "maint": return "이 기능은 서버를 옮기는 중이라 잠시 쓸 수 없습니다. 곧 다시 열립니다.";
    default: return "서버에 연결하지 못했습니다. 잠시 뒤 다시 해 주세요.";
  }
}

export async function nameFree(name) {
  const r = await rpc("rpg_name_free", { p_name: name });
  return typeof r === "boolean" ? { ok: true, free: r } : r;
}
export const createAccount = (name, code, data) => rpc("rpg_create", { p_name: name, p_code: code, p_data: data });
export const login = (name, code) => rpc("rpg_login", { p_name: name, p_code: code });
export const deleteRemote = (name, token) => rpc("rpg_delete", { p_name: name, p_token: token });
// 명예 순위 — 서버에 저장된 캐릭터 가운데 명예가 높은 순. [{ name, honor, lv, job }]
export async function honorTop(limit = 20) {
  const r = await rpc("rpg_honor_top", { p_limit: limit });
  return Array.isArray(r) ? { ok: true, list: r } : { ok: false, ...(r || {}) };
}

/* ── 접속 중 표시 — 한 캐릭터는 한 곳(한 서버 · 한 창)에서만 ───────────────
   서버에 들어갈 때 rpg_live 로 "이 창(sid)이 이 서버에 있다"를 남기고 LIVE_BEAT 초마다 다시 남긴다.
   다른 창이 LIVE 초 안에 남긴 표시가 있으면 들어가지 못한다(이어 하기 rpg_login 도 막힌다).
   창을 그냥 닫으면 LIVE 초 뒤에 풀린다. 숫자는 supabase/rpg.sql rpg_live_secs 와 맞춘다 */
export const LIVE_BEAT = 10;           // 접속 중 표시를 다시 남기는 간격(초)
const srvLabel = (s) => (/^RPG\d$/.test(s || "") ? `서버 ${s.slice(3)}` : "다른 곳");
export const liveEnter = (name, tok, sid, srv) => rpc("rpg_live", { p_name: name, p_token: tok, p_sid: sid, p_srv: srv });
export const liveLeave = (name, tok, sid) => rpc("rpg_unlive", { p_name: name, p_token: tok, p_sid: sid });

/* ── 게임 중 저장 — 마지막 기록만 들고 있다가 간격마다 보낸다 ── */
let pending = null;        // { name, tok, data }
let sentKey = "";
let inFlight = null;
let onRecover = null;
let timer = null;
let onKick = null;

// 보낼 기록을 바꿔 둔다 — 입장권이 없으면(서버에 연결되지 않은 캐릭터) 보내지 않는다
export function cloudQueue(name, tok, data) {
  if (!name || !tok || !data) return;
  pending = { name, tok, data: structuredClone(data) };
}
export async function cloudFlush() {
  if (inFlight) { await inFlight; return cloudFlush(); }
  if (!pending) return { ok: true };
  const job = pending;
  const key = JSON.stringify(job.data);
  if (key === sentKey) return { ok: true };
  inFlight = rpc("rpg_save", { p_name: job.name, p_token: job.tok, p_data: job.data });
  const r = await inFlight;
  inFlight = null;
  if (r?.ok) { sentKey = key; return r; }
  if (r?.err === "stale" || r?.err === "moved") {
    if (pending === job) pending = null;
    if (onRecover) await onRecover();
  }
  if (r && (r.err === "token" || r.err === "guard")) {
    pending = null;
    if (onKick) onKick(r.err);
  }
  return r || { ok: false, err: "net" };
}
export const loadRemote = (name, tok) => rpc("rpg_load", { p_name: name, p_token: tok });
export const tradeOpen = (name, tok, target, sid) => rpc("rpg_trade_open", { p_name: name, p_token: tok, p_target: target, p_sid: sid });
export const tradeAction = (name, tok, sid, id = null, op = "get", offer = null, hash = null) =>
  rpc("rpg_trade_action", { p_name: name, p_token: tok, p_sid: sid, p_id: id, p_op: op, p_offer: offer, p_hash: hash });
// DB 확정 뒤의 옛 대기 저장을 버린다. 진행 중 요청은 DB의 차례 검사로 막힌다.
export function cloudReset() { pending = null; sentKey = ""; }
// 게임 화면이 열려 있는 동안 간격마다 보낸다. 닫으면 남은 것을 한 번 보낸다
export function cloudStart(kick, recover) {
  onRecover = recover;
  onKick = kick;
  clearInterval(timer);
  timer = setInterval(cloudFlush, SAVE_EVERY * 1000);
  const bye = () => { cloudFlush(); };
  window.addEventListener("pagehide", bye);
  const hide = () => { if (document.visibilityState === "hidden") cloudFlush(); };
  document.addEventListener("visibilitychange", hide);
  return () => {
    clearInterval(timer);
    window.removeEventListener("pagehide", bye);
    document.removeEventListener("visibilitychange", hide);
    onKick = null; onRecover = null;
    cloudFlush();
  };
}

export const guildAction=(name,tok,sid,op='get',args={})=>rpc('rpg_guild_action',{p_name:name,p_token:tok,p_sid:sid,p_op:op,p_args:args});
// 광장 장터 게시판(server/src/ledger-market.js) — 예전 방식(방장 브라우저)일 때 화면이 직접 부른다
export const marketAction = (name, tok, sid, op = 'get', args = {}) => rpc('rpg_market', { p_name: name, p_token: tok, p_sid: sid, p_op: op, p_args: args });
