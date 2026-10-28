/* 장부가 나눠 쓰는 작은 도구 — ledger.js · ledger-trade.js · ledger-guild.js 가 같이 쓴다(서로를 부르면 돌고 돌아서 따로 뒀다) */
export const rpgKey = (name) => String(name == null ? "" : name).trim().replace(/\s+/g, " ").toLowerCase();
export const len = (s) => [...s].length;
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (t) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))));
export const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
export const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// jsonb 의 ->> 처럼 글자로(없거나 null 이면 null)
export const txt = (v) => (v == null ? null : typeof v === "object" ? JSON.stringify(v) : String(v));
// jsonb 끼리 견주기 — 열쇠 차례와 상관없이 같은가
export function jeq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => jeq(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && jeq(a[k], b[k]));
}
// 기록의 레벨 — 숫자 1~4자리가 아니면 1(rpg_lv)
export const lvOf = (p) => { const s = txt(p && p.lv); return s !== null && /^[0-9]{1,4}$/.test(s) ? parseInt(s, 10) : 1; };
