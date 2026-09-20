import { supabase, netReady } from "./room.js";

/* ────────────────────────────────────────────────────────────
   게임에 대한 의견을 적어 보내는 곳.
   Supabase 의 feedback 표에 한 줄씩 쌓인다.

   적는 것만 열려 있고 읽는 것은 막혀 있다(RLS). 그래서 남이 쓴 글은
   게임 안에서 볼 수 없고, 받은 사람이 대시보드에서 본다.
   표를 만드는 문은 supabase/feedback.sql 에 두었다.
   ──────────────────────────────────────────────────────────── */

export const FEEDBACK_MAX = 500;      // 한 번에 적을 수 있는 글자 수
const GAP = 15000;                    // 연달아 보내는 사이 간격
const DRAFT = "flg.feedback.draft";   // 못 보낸 글은 다음에 다시 꺼내 준다

let lastAt = 0;

export function loadDraft() {
  try { return localStorage.getItem(DRAFT) || ""; } catch { return ""; }
}

export function saveDraft(text) {
  try {
    if (text) localStorage.setItem(DRAFT, text.slice(0, FEEDBACK_MAX));
    else localStorage.removeItem(DRAFT);
  } catch { /* 사파리 비공개 창처럼 저장이 막힌 곳도 있다 */ }
}

const cut = (v, n) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
const num = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(500, Math.round(v))) : null);

/* 보낸 결과를 { ok, why } 로 돌려준다. why 는 그대로 화면에 띄울 말이다. */
export async function sendFeedback(note = {}) {
  const body = (note.body || "").trim();
  if (!body) return { ok: false, why: "적을 내용을 넣어 주세요." };
  if (body.length > FEEDBACK_MAX) return { ok: false, why: `${FEEDBACK_MAX}자 안으로 줄여 주세요.` };
  if (!netReady) return { ok: false, why: "서버가 연결되지 않았습니다." };

  const wait = GAP - (Date.now() - lastAt);
  if (lastAt && wait > 0) {
    return { ok: false, why: `${Math.ceil(wait / 1000)}초 뒤에 다시 보낼 수 있습니다.` };
  }

  const row = {
    body,
    name: cut(note.name, 40),
    room: cut(note.room, 8),
    result: ["lobby", "play", "clear", "over", "wipe"].includes(note.result) ? note.result : "lobby",
    wave: num(note.wave),
    total: num(note.total),
    diff: cut(note.diff, 16),
    cls: cut(note.cls, 16),
  };

  try {
    const { error } = await supabase().from("feedback").insert(row);
    if (error) throw error;
  } catch {
    saveDraft(body);                 // 적은 글은 잃지 않게 남겨 둔다
    return { ok: false, why: "보내지 못했습니다. 적은 글은 남겨 두었으니 잠시 뒤 다시 눌러 주세요." };
  }
  lastAt = Date.now();
  saveDraft("");
  return { ok: true, why: "보냈습니다. 고맙습니다." };
}
