import { useEffect, useRef, useState } from "react";
import { sendFeedback, loadDraft, saveDraft, FEEDBACK_MAX } from "./net/feedback.js";

/* RPG 문의하기 창 — ☰ 메뉴에서 연다. 상점 · 가방과 같은 .shop 틀을 쓰고, 글은 의견 남기기와 같은 feedback 표로 간다.
   이름 · 서버 · 직업이 같이 실려 받는 쪽이 누구의 글인지 알 수 있다. 못 보낸 글은 초안으로 남는다 */
export default function InquiryPanel({ name, server, job, onClose }) {
  const dialog = useRef(null);
  const [text, setText] = useState(() => loadDraft());
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState(null);
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  const change = (e) => { const v = e.target.value.slice(0, FEEDBACK_MAX); setText(v); setSaid(null); saveDraft(v); };
  const send = async () => {
    setBusy(true);
    const r = await sendFeedback({ body: `[RPG 문의] ${text}`.slice(0, FEEDBACK_MAX + 10), name, room: server, cls: job });
    setBusy(false); setSaid(r);
    if (r.ok) setText("");
  };
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="shop adv-panel" role="dialog" aria-modal="true" aria-labelledby="inq-title"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
        <header className="shop-top">
          <div className="shop-title"><b id="inq-title">문의하기</b><span>불편한 곳 · 궁금한 것 · 오류</span></div>
          <button type="button" className="shop-x" aria-label="문의 창 닫기" onClick={onClose}>×</button>
        </header>
        <div className="shop-body">
          <textarea className="say-box" value={text} onChange={change} rows={6} maxLength={FEEDBACK_MAX}
            placeholder="문의 내용을 적어 주세요. 오류라면 언제 · 어디서 · 무엇을 했는지 같이 적어 주세요." />
          <div className="say-foot">
            <span className="say-left">{FEEDBACK_MAX - text.length}자 남음</span>
            <button type="button" className="shop-btn main" onClick={send} disabled={busy || !text.trim()}>{busy ? "보내는 중…" : "보내기"}</button>
          </div>
          {said && <p className={said.ok ? "say-ok" : "say-bad"}>{said.ok ? "문의를 보냈습니다. 감사합니다." : said.why}</p>}
          <p className="say-note">캐릭터 이름 · 서버 · 직업이 글과 함께 갑니다.</p>
        </div>
      </section>
    </>
  );
}
