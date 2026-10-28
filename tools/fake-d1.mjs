import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export /* D1 흉내 — node:sqlite 위에 prepare · bind · first · all · run · batch 만 얹는다 */
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, p = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...p) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...p).map((r) => ({ ...r })) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...p).changes) } }),
    _run: () => db.prepare(sql).run(...p),
  });
  return {
    db,
    prepare: (sql) => stmt(sql),
    async batch(list) {
      db.exec('BEGIN');
      try { const out = list.map((s) => ({ meta: { changes: Number(s._run().changes) } })); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}
