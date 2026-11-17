/* ── 히든 직업 「유일」 장부(11월 17일 사용자 지시) — 규칙 설명은 src/game/hiddenUnique.js ──
   함수 하나 rpg_hidden(p_op: claim · sync · list). 전용 서버(RpgRoom)만 부른다(index.js PUBLIC_RPC 에 없다).
   표 hidden_jobs(job, char_key): 그 히든 직업을 가진 캐릭터. 같은 장부 Durable Object 가 요청을 한 줄로 세우므로 두 사람이 동시에 해금해도 한 명만 먼저 적힌다.
   - claim(p_job): 해금 시험을 통과한 순간. 다른 보유자가 없거나 내가 이미 보유자면 ok, 아니면 err "taken".
   - sync(p_held): 방이 가방을 보고 맞춘다 — 가진 직업은 적고(이미 있으면 그대로), 더는 안 가진 직업은 지운다. 관리자 명령어로 받은 사람 · 전직 초기화 물약 · 다른 히든 직업으로 바꾼 사람이 여기로 정리된다.
   - list: 보유자 열쇠 목록만.
   - 관리자 캐릭터는 자리를 쓰지 않는다(claim 은 늘 ok, 적히지 않는다).
   - 기록이 되돌려졌거나(서버 초기화 · 한 사람 되돌리기) 캐릭터가 지워진 보유자는 자리를 잃는다: 저장된 기록에 그 직업이 없고
     적은 지 HIDDEN_GRACE_MS 가 지난 줄은 claim · list 때 치운다(저장이 10초 늦을 수 있어 갓 적은 줄은 두고 본다).
   - 이 규칙이 생기기 전부터 가진 사람은 장부가 처음 이 표를 만들 때 한 번 훑어 모두 적는다(내쫓지 않는다 — 한 명이 남아 있는 동안은 새 해금이 막힌다) */
import { RESET } from "../../src/game/itemData.js";
import { HIDDEN_IDS, holds } from "../../src/game/hiddenUnique.js";
import { isObj, txt } from "./ledger-util.js";

export const HIDDEN_GRACE_MS = 5 * 60 * 1000;
const SEED = "~seed";                       // 처음 훑었다는 표시 줄(job 칸)
// 표는 schema.sql 에도 있다. 이미 돌던 D1 에 없을 수 있어 장부가 처음 부를 때 한 번 만든다(IF NOT EXISTS)
export const HIDDEN_SQL = [
  "CREATE TABLE IF NOT EXISTS hidden_jobs (job TEXT NOT NULL, char_key TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (job, char_key))",
];
// 저장된 기록이 그 직업을 켜 두었나 — 서버 초기화 전 기록은 접속하면 처음으로 돌아가므로 세지 않는다
const heldInData = (d, id) => isObj(d) && txt(d.rs) === RESET.id && holds(d.bag, id);

export const hiddenMethods = {
  async hiddenReady() {
    if (this.hiddenMade) return;
    await this.batch(HIDDEN_SQL.map((s) => this.q(s)));
    if (!(await this.first("SELECT 1 AS x FROM hidden_jobs WHERE job = ?", SEED))) {
      const now = this.now(), w = [];
      for (const r of await this.rows("SELECT name_key, data, admin FROM chars")) {
        if (r.admin) continue;
        let d = null;
        try { d = JSON.parse(r.data); } catch { continue; }
        for (const id of HIDDEN_IDS) if (heldInData(d, id)) w.push(this.q("INSERT OR IGNORE INTO hidden_jobs (job, char_key, at) VALUES (?, ?, ?)", id, r.name_key, now - HIDDEN_GRACE_MS - 1));
      }
      w.push(this.q("INSERT OR IGNORE INTO hidden_jobs (job, char_key, at) VALUES (?, '~', ?)", SEED, now));
      await this.batch(w);
    }
    this.hiddenMade = true;
  },
  // 사라졌거나 기록에서 직업이 빠진 보유자 줄을 치운다
  async hiddenHeal() {
    const now = this.now(), gone = [];
    for (const r of await this.rows("SELECT job, char_key, at FROM hidden_jobs WHERE job != ?", SEED)) {
      const c = await this.charRow(r.char_key);
      if (!c || c.admin || (!heldInData(c.data, r.job) && r.at < now - HIDDEN_GRACE_MS)) gone.push(this.q("DELETE FROM hidden_jobs WHERE job = ? AND char_key = ?", r.job, r.char_key));
    }
    if (gone.length) await this.batch(gone);
  },
  async hiddenHold() {
    const out = Object.fromEntries(HIDDEN_IDS.map((id) => [id, []]));
    for (const r of await this.rows("SELECT job, char_key FROM hidden_jobs WHERE job != ? ORDER BY at, char_key", SEED)) if (out[r.job]) out[r.job].push(r.char_key);
    return out;
  },
  async fn_rpg_hidden(a) {
    const c = await this.authChar(a.p_name, a.p_token);
    if (!c) return { ok: false, err: "token" };
    await this.hiddenReady();
    const op = String(a.p_op || "list"), k = c.name_key, now = this.now();
    if (op === "claim") {
      const id = String(a.p_job || "");
      if (!HIDDEN_IDS.includes(id)) return { ok: false, err: "job" };
      if (c.admin) return { ok: true, hold: await this.hiddenHold() };   // 관리자는 자리를 쓰지 않는다
      await this.hiddenHeal();
      const rows = await this.rows("SELECT char_key FROM hidden_jobs WHERE job = ?", id);
      const mine = rows.some((r) => r.char_key === k);
      if (!mine && rows.length) return { ok: false, err: "taken", hold: await this.hiddenHold() };
      if (!mine) await this.run("INSERT OR IGNORE INTO hidden_jobs (job, char_key, at) VALUES (?, ?, ?)", id, k, now);
      return { ok: true, hold: await this.hiddenHold() };
    }
    if (op === "sync") {
      const held = Array.isArray(a.p_held) ? a.p_held.filter((x) => HIDDEN_IDS.includes(x)) : [];
      const mine = new Set((await this.rows("SELECT job FROM hidden_jobs WHERE char_key = ?", k)).map((r) => r.job));
      const w = [];
      for (const id of HIDDEN_IDS) {
        const want = !c.admin && held.includes(id);
        if (want && !mine.has(id)) w.push(this.q("INSERT OR IGNORE INTO hidden_jobs (job, char_key, at) VALUES (?, ?, ?)", id, k, now));
        else if (!want && mine.has(id)) w.push(this.q("DELETE FROM hidden_jobs WHERE job = ? AND char_key = ?", id, k));
      }
      if (w.length) await this.batch(w);
      return { ok: true, changed: w.length > 0, hold: await this.hiddenHold() };
    }
    if (op === "list") {
      await this.hiddenHeal();
      return { ok: true, hold: await this.hiddenHold() };
    }
    return { ok: false, err: "op" };
  },
};
