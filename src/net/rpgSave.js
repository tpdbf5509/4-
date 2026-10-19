/* ── RPG 캐릭터 서버 저장 ─────────────────────────────────────
   이름 + 숫자 5자리 코드로 어느 기기에서든 이어 한다. 표와 함수는 supabase/rpg.sql.
   - 만들기 · 이어 하기를 하면 서버가 입장권(token)을 준다. 이 기기에 저장해 두고 저장할 때 같이 보낸다.
   - 다른 기기에서 이어 하기를 하면 입장권이 새로 나와, 먼저 있던 기기의 저장은 'token' 으로 거절된다.
   - 저장은 SAVE_EVERY 초마다 바뀐 것이 있을 때 한 번, 그리고 나갈 때 한 번 보낸다.
   틀린 횟수 · 잠금 시간은 서버(rpg_login)가 정하고 결과에 담아 준다. */
import { supabase } from "./room.js";

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

async function rpc(fn, args) {
  try {
    const { data, error } = await supabase().rpc(fn, args);
    if (error) return { ok: false, err: "net", detail: error.message };
    return data;
  } catch (e) {
    return { ok: false, err: "net", detail: String(e && e.message) };
  }
}

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
    case "guard": return "기록이 다른 캐릭터와 섞인 것 같아 저장을 멈췄습니다. 코드를 다시 넣으면 서버 기록으로 이어 합니다.";
    case "data": return "저장할 내용이 너무 큽니다.";
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

/* ── 게임 중 저장 — 마지막 기록만 들고 있다가 간격마다 보낸다 ── */
let pending = null;        // { name, tok, data }
let sentKey = "";
let busy = false;
let timer = null;
let onKick = null;

// 보낼 기록을 바꿔 둔다 — 입장권이 없으면(서버에 연결되지 않은 캐릭터) 보내지 않는다
export function cloudQueue(name, tok, data) {
  if (!name || !tok || !data) return;
  pending = { name, tok, data };
}
export async function cloudFlush() {
  if (busy || !pending) return;
  const job = pending;
  const key = JSON.stringify(job.data);
  if (key === sentKey) return;
  busy = true;
  const r = await rpc("rpg_save", { p_name: job.name, p_token: job.tok, p_data: job.data });
  busy = false;
  if (r && r.ok) { sentKey = key; return; }
  if (r && (r.err === "token" || r.err === "guard")) {   // 다른 기기가 나중에 들어왔다 · 서버가 섞인 기록을 막았다 — 이 기기의 저장은 멈춘다
    pending = null;
    if (onKick) onKick(r.err);
  }
}
// 게임 화면이 열려 있는 동안 간격마다 보낸다. 닫으면 남은 것을 한 번 보낸다
export function cloudStart(kick) {
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
    onKick = null;
    cloudFlush();
  };
}
