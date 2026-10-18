/* 캐릭터 불러오기 · 저장 — Supabase 함수 rpg_srv_load · rpg_srv_save(supabase/rpg.sql). 서버 비밀 키로만 부를 수 있다.
   비밀값이 없으면(내 컴퓨터 시험) 저장 없이 돌린다 */
async function rpc(env, fn, args) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return { ok: false, err: "off" };
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
      body: JSON.stringify(args),
    });
    if (!res.ok) return { ok: false, err: "net", detail: `${res.status}` };
    return await res.json();
  } catch (e) {
    return { ok: false, err: "net", detail: String(e && e.message) };
  }
}
export const loadChar = (env, name, tok) => rpc(env, "rpg_srv_load", { p_name: name, p_token: tok });
export const saveChar = (env, name, tok, data) => rpc(env, "rpg_srv_save", { p_name: name, p_token: tok, p_data: data });
export const saveOn = (env) => !!(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
