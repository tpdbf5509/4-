/* 의뢰 · 퀘스트 창 맨 위의 메인 이야기 칸 — 지금 장 · 퀘스트 · 할 일 · 길 안내 · 1부 진행도(storyQuest.js storyView) */
export default function StoryCard({st, onGo}) {
  if (st.done) return (
    <div className="story-card">
      <div className="story-card-head"><b>메인 이야기 · 1부</b><span>{st.total} / {st.total}</span></div>
      <div className="story-card-bar"><i style={{width: '100%'}}/></div>
      <p className="story-card-goal">1부 「깨어나는 기계들」을 모두 마쳤습니다.</p>
      <p className="story-card-where">2부는 다음 업데이트에서 이어집니다.</p>
    </div>
  );
  return (
    <div className="story-card">
      <div className="story-card-head"><b>메인 이야기 · 1부</b><span>{st.i} / {st.total} 단계</span></div>
      <div className="story-card-bar" aria-hidden="true"><i style={{width: `${Math.round(st.i / st.total * 100)}%`}}/></div>
      <div className="story-card-ch">{st.ch}장 · {st.chName}</div>
      <ul className="story-card-qs">
        {st.quests.map((q) => <li key={q.q} className={q.done ? 'done' : q.q === st.q ? 'on' : ''}>{q.done ? '✓ ' : q.q === st.q ? '▸ ' : ''}{q.q}</li>)}
      </ul>
      <p className="story-card-goal">{st.goal}{st.need ? ` · ${st.got}/${st.need}` : ''}</p>
      <p className="story-card-where">{st.where}</p>
      {st.canGo && <button type="button" className="rpg-win-btn" onClick={onGo}>{st.mapName}(으)로 가기</button>}
    </div>
  );
}
