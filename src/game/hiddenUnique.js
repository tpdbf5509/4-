/* ── 히든 직업 「유일」 규칙(11월 17일 사용자 지시) ─────────────────────────────
   히든 직업(BLOOD-001 · Gambler 002 …)은 관리자를 빼고 **게임 전체에서 한 명만** 가질 수 있다. 먼저 해금한 사람이 갖는다.
   서버(RPG1~RPG4)와 상관없이 캐릭터 장부가 하나라 장부 표 hidden_jobs(server/src/ledger-hidden.js)가 보유자를 기억한다 —
   보유자가 접속 중이 아니어도 자리는 그대로다. 해금 시험을 통과하는 순간에만 자리를 묻고(claim), 나머지는 방이 가방 상태를 따라 맞춘다(sync).
   - 전용 서버 방(g.server)에서만 지킨다. 테스트 방 · 연습장(g.test) · 방장 브라우저 방식(?srv=off)은 장부에 쓸 수 없어 지키지 않는다.
   - 관리자 캐릭터(h.admin) · 관리자 명령어(/블러드 · /도박꾼)로 받은 사람은 해금을 막지 않는다. 명령어로 받은 사람도 보유자로 적힌다(방이 sync).
   - 새 히든 직업은 HIDDEN_JOBS 에 한 줄을 더하고 holds 에 가방 판별을 더한다(장부 · 방 · 해금 경로가 모두 이 파일을 본다).
   방(room.js)과 해금 경로(bloodUnlock.js · gamblerUnlock.js)가 주고받는 것:
     g.hjq   해금 시험을 막 통과해 자리를 묻는 요청 [{ pi, id }] — 방이 비우며 장부에 묻는다
     h.hjr   방이 돌려준 답 { id, ok, err? } — 해금 경로가 한 번 읽고 지운다
     g.hjHold 지금 보유자 이름 열쇠 { 직업 id: [열쇠…] } — 시험 문을 열기 전에 미리 안내하는 데 쓴다(장부의 답을 방이 주기적으로 받아 둔다) */

// id 는 장부 표에 적히는 값이라 바꾸지 않는다. 새 직업은 뒤에만 더한다
export const HIDDEN_JOBS = [
  { id: "blood", name: "BLOOD-001" },
  { id: "gambler", name: "Gambler 002" },
  { id: "engineer", name: "Engineer 003" },   // 11월 19일 실제 게임에 열었다
  { id: "necromancer", name: "Necromancer 004" },   // 11월 20일 획득 루트와 함께 실제 게임에 열었다
];
export const HIDDEN_IDS = HIDDEN_JOBS.map((j) => j.id);
export const hiddenName = (id) => (HIDDEN_JOBS.find((j) => j.id === id) || { name: "히든 직업" }).name;

// 가방(bag)이 이 히든 직업을 켜 두었나 — 해금 시험 중 빌린 값(trial)은 세지 않는다. 저장된 기록(data.bag)에도 같은 모양이다
export function holds(bag, id) {
  if (!bag || typeof bag !== "object") return false;
  if (id === "blood") return !!(bag.bd && bag.bd.on && !bag.bd.trial);
  if (id === "gambler" || id === "engineer" || id === "necromancer") return !!(bag.hj && bag.hj.active === id && !bag.hj.trial && bag.hj.jobs && bag.hj.jobs[id]);
  return false;
}
export const hiddenHeld = (h) => (h && h.bag ? HIDDEN_IDS.filter((id) => holds(h.bag, id)) : []);

// 장부 이름 열쇠(ledger-util.js rpgKey)와 같은 규칙
export const nameKey = (n) => String(n == null ? "" : n).trim().replace(/\s+/g, " ").toLowerCase();

// 이 영웅에게 유일 규칙을 거는가 — 전용 서버의 일반 방(장부가 있는 방, g.hjOff 가 아닌) · 관리자가 아닌 캐릭터
export const hiddenEnforced = (g, h) => !!(g && g.server && !g.test && !g.hjOff && h && h.loaded && !h.admin);
// 다른 사람이 이미 가졌다고 알고 있나(미리 안내용 — 늦은 값이라 해금 순간에는 장부가 다시 정한다)
export function hiddenTaken(g, h, id) {
  if (!hiddenEnforced(g, h)) return false;
  const me = nameKey(g.names && g.names[h.pi]);
  return ((g.hjHold && g.hjHold[id]) || []).some((k) => k !== me);
}
export const hiddenTakenMsg = (id) => `${hiddenName(id)} 는 이미 다른 사람이 계약했다. 히든 직업은 게임 전체에서 한 명만 가질 수 있다.`;

// 해금 시험을 통과했다 — 방에 자리를 묻는다(답은 h.hjr). 같은 요청을 겹쳐 쌓지 않는다
export function hiddenAsk(g, h, id) {
  const q = g.hjq || (g.hjq = []);
  if (!q.some((r) => r.pi === h.pi && r.id === id)) q.push({ pi: h.pi, id });
}
// 방이 돌려준 답을 한 번 읽는다(없으면 null)
export function hiddenReply(h, id) {
  const r = h.hjr;
  if (!r || r.id !== id) return null;
  h.hjr = null;
  return r;
}
