/* 캐릭터 불러오기 · 저장 — 장부(ledger.js)의 rpg_srv_load · rpg_srv_save. 장부 Durable Object 를 바인딩(LEDGER)으로만 부른다.
   바인딩이 없으면(내 컴퓨터 시험에서 장부를 안 띄웠을 때) 저장 없이 돌린다 */
const stub = (env) => env.LEDGER.get(env.LEDGER.idFromName("main"), { locationHint: "apac" });
async function call(env, fn, args) {
  if (!env.LEDGER) return { ok: false, err: "off" };
  try {
    const res = await stub(env).fetch(`https://ledger/${fn}`, { method: "POST", body: JSON.stringify(args) });
    return await res.json();
  } catch (e) {
    return { ok: false, err: "net", detail: String(e && e.message) };
  }
}
export const loadChar = (env, name, tok) => call(env, "rpg_srv_load", { p_name: name, p_token: tok });
export const saveChar = (env, name, tok, data) => call(env, "rpg_srv_save", { p_name: name, p_token: tok, p_data: data });
export const saveOn = (env) => !!env.LEDGER;
