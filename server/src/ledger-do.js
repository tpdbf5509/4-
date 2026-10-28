/* 장부 Durable Object — 하나(이름 "main")만 둔다. 요청을 한 줄로 세워 처리해서 같은 캐릭터를 동시에 고치지 못하게 한다
   (Postgres 의 행 잠금이 하던 일). 길은 POST /<함수 이름> — 이 객체는 바인딩으로만 닿는다. 밖에 열 함수는 index.js 가 고른다 */
import { LedgerCore } from "./ledger.js";

const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

export class Ledger {
  constructor(ctx, env) {
    this.core = new LedgerCore(env.DB);
    this.chain = Promise.resolve();
  }
  async fetch(req) {
    const m = new URL(req.url).pathname.match(/^\/([a-z_]+)$/);
    if (!m || req.method !== "POST") return json({ ok: false, err: "op" }, 404);
    let args;
    try { args = await req.json(); } catch { return json({ ok: false, err: "bad" }, 400); }
    const run = this.chain.then(() => this.core.call(m[1], args));
    this.chain = run.catch(() => {});
    try {
      return json(await run);
    } catch (e) {
      console.warn(`장부 오류 ${m[1]}: ${e && e.message}`);
      return json({ ok: false, err: "net" }, 500);
    }
  }
}
