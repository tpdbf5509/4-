import {useState} from 'react';
import {storyJournal} from './game/storyGuide.js';

/* 의뢰 · 퀘스트 창 맨 위의 메인 이야기 칸 — storyQuest.js storyView
   퀘스트 · 상황 · 목표 · 이유 · 확인할 것 · 길 안내. 「이야기 기록」을 누르면 같은 칸이 장 기록으로 바뀐다(storyGuide.js storyJournal).
   기록은 저장 값 없이 진행(단계 · 끝낸 대상 · 꼬리표)으로 그때그때 만든다. 끝낸 장 · 찾은 단서만 보여 스포일러가 없다 */
function Journal({st}) {
  const j = storyJournal({i: st.i, n: st.n, c: st.c, t: st.t});
  if (!j.chapters.length) return <p className="story-card-where">아직 기록이 없습니다. 에르덴 마을의 리아에게 말을 걸어 시작합니다.</p>;
  return (
    <div className="story-journal">
      {j.trust.length > 0 && <p className="story-journal-trust"><em>지금 관계</em>{j.trust.map((p) => `${p.name} ${p.word}`).join(' · ')}</p>}
      {j.chapters.map((c, k) => (
        <details key={c.ch} open={k === 0}>
          <summary><b>{c.ch}장 · {c.name}</b><span>{c.done ? '마침' : '진행 중'}</span></summary>
          {c.sum && <p className="story-journal-sum">{c.sum}</p>}
          {c.facts.length > 0 && <><em>확인한 사실</em><ul>{c.facts.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {!c.done && !c.facts.length && <p className="story-journal-none">이번 장에서 아직 확인한 사실이 없습니다.</p>}
          {c.open.length > 0 && <><em>남은 의문</em><ul className="q">{c.open.map((o, i) => <li key={i} className={o.a ? 'solved' : ''}>{o.q}{o.a && <span>→ {o.a}</span>}</li>)}</ul></>}
          {c.bond.length > 0 && <><em>관계 변화</em><ul>{c.bond.map((b, i) => <li key={i}>{b}</li>)}</ul></>}
          {c.next && <p className="story-journal-next"><em>다음으로</em>{c.next}</p>}
        </details>
      ))}
    </div>
  );
}

export default function StoryCard({st, onGo}) {
  const [book, setBook] = useState(false);
  const toggle = <button type="button" className={`rpg-win-btn ghost story-card-book${book ? ' on' : ''}`} aria-pressed={book} onClick={() => setBook(!book)}>{book ? '진행으로 돌아가기' : '이야기 기록'}</button>;
  if (st.done) return (
    <div className="story-card">
      <div className="story-card-head"><b>메인 이야기 · 완결</b><span>{st.total} / {st.total}</span></div>
      <div className="story-card-bar"><i style={{width: '100%'}}/></div>
      {book ? <Journal st={st}/> : <>
        <p className="story-card-goal">30장 「네 갈래 방어선」까지 모두 마쳤습니다.</p>
        <p className="story-card-where">누구도 혼자 세계를 지키지 않았습니다.</p>
      </>}
      {toggle}
    </div>
  );
  return (
    <div className="story-card">
      <div className="story-card-head"><b>메인 이야기 · {st.part}부 {st.partName}</b><span>{st.i} / {st.total} 단계</span></div>
      <div className="story-card-bar" aria-hidden="true"><i style={{width: `${Math.round(st.i / st.total * 100)}%`}}/></div>
      <div className="story-card-ch">{st.ch}장 · {st.chName}</div>
      {book ? <Journal st={st}/> : <>
        <ul className="story-card-qs">
          {st.quests.map((q) => <li key={q.q} className={q.done ? 'done' : q.q === st.q ? 'on' : ''}>{q.done ? '✓ ' : q.q === st.q ? '▸ ' : ''}{q.q}</li>)}
        </ul>
        <dl className="story-card-info">
          <dt>퀘스트</dt><dd>{st.q}</dd>
          {st.sit && <><dt>상황</dt><dd>{st.sit}</dd></>}
          <dt>목표</dt><dd className="goal">{st.goal}{st.need ? ` · ${st.got}/${st.need}` : ''}</dd>
          {st.why && <><dt>이유</dt><dd>{st.why}</dd></>}
          {st.checks.length > 0 && !st.hidden && !st.order && <><dt>확인할 것</dt><dd><ul className="story-card-checks">
            {st.checks.map((c) => <li key={c.id} className={c.done ? 'done' : c.id === st.locked ? 'lock' : ''}>{c.done ? '✓' : c.id === st.locked ? '·' : '○'} {c.name}{c.id === st.locked ? ' (단서를 모두 본 뒤)' : ''}</li>)}
          </ul></dd></>}
          <dt>길</dt><dd className="where">{st.where}</dd>
        </dl>
        {st.canGo && <button type="button" className="rpg-win-btn" onClick={onGo}>{st.mapName}(으)로 가기</button>}
      </>}
      {toggle}
    </div>
  );
}
