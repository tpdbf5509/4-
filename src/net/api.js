/* ── Cloudflare 워커 주소와 장부 호출 ─────────────────────────────
   예전에 Supabase 가 하던 일(계정 · 저장 · 관리 · 의견 · 방 중계)을 워커 하나(server/)가 한다.
   장부 함수는 Supabase 의 rpc 와 같은 모양이다 — POST /rpc/<함수> 에 { p_... } 를 보내면 결과 JSON 이 온다.
   주소는 Vercel 환경 변수 VITE_RPG_SERVER(wss://…)로 덮어쓸 수 있다. 개발 중 ?srv=local 이면 내 컴퓨터의 wrangler dev 로 붙는다 */
export const SRV_WS = import.meta.env.VITE_RPG_SERVER || "wss://four-lane-rpg.four-lane.workers.dev";
const LOCAL_WS = "ws://127.0.0.1:8787";

function wantsLocalSrv() {
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem("flg:srv") === "local"; } catch { return false; }
}
// 웹소켓 주소(wss://…) — 방 중계(/room)와 RPG 서버(/rpg)가 쓴다
export const wsBase = () => (wantsLocalSrv() ? LOCAL_WS : SRV_WS);
// 장부 호출 주소(https://…)
export const httpBase = () => wsBase().replace(/^ws/, "http");

/* 장부 함수 부르기 — 결과 JSON 을 그대로 돌려준다. 연결이 안 되면 { ok:false, err:"net" } */
export async function ledger(fn, args) {
  try {
    const res = await fetch(`${httpBase()}/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
      keepalive: true,           // 창을 닫는 순간의 저장도 보낸다
    });
    const out = await res.json();
    return out;
  } catch (e) {
    return { ok: false, err: "net", detail: String(e && e.message) };
  }
}
