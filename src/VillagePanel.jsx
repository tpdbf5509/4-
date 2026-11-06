import {useEffect, useRef, useState} from 'react';
import {VILLAGE_DIALOGUES, villageArtPath} from './game/villageData.js';
import {STORY_DIALOGUES, STORY_PEOPLE, storyArtPath} from './game/storyData.js';
import {STORY_STEP_BY_ID, STORY_STEPS} from './game/storyQuestData.js';

/* 기존 상점 틀을 쓴다. 평소에는 소개 대화만 보여 준다.
   메인 스토리 1부에서 지금 이 대상과 이야기할 차례면 이야기 장면을 보여 주고, 선택지를 고르게 한다(storyQuestData.js).
   장면을 끝까지 보고 마지막 칸을 닫으면 진행을 보낸다(onStory → storyQuest.js rpgStory). */
const shown = (l, tags) => !l.if || tags.includes(l.if) ? !l.not || !tags.includes(l.not) : false;

export default function VillagePanel({npcId, onClose, story, myName, onStory}) {
  const npc = VILLAGE_DIALOGUES[npcId] || STORY_DIALOGUES[npcId], dialog = useRef(null);
  const returnFocus = useRef(null);
  // 이야기 차례인지 — 창을 여는 순간의 진행으로 정한다(대화 중에 진행이 바뀌어도 장면은 그대로)
  const [step] = useState(() => (story && !story.done && story.targets.includes(npcId) ? STORY_STEP_BY_ID[story.id] : null));
  const scene = step ? (step.scenes?.[npcId] || step.scene) : null;
  const [seq, setSeq] = useState(() => scene || [npc?.intro, ...(npc?.lines || [])].map((t) => ({s: '', t})));
  const [tags, setTags] = useState(() => (story?.c || []).slice());
  const [picked, setPicked] = useState([]);
  const skip = (from, list = seq, t = tags) => { let k = from; while (k < list.length && !shown(list[k], t)) k++; return k; };
  const [at, setAt] = useState(() => skip(0));
  const [trail, setTrail] = useState([]);       // 지나온 칸(이전 버튼) — 선택지를 고른 뒤에는 그 앞으로 되돌아가지 않는다
  const [end, setEnd] = useState(false);
  useEffect(() => {
    returnFocus.current = document.activeElement; dialog.current?.focus();
    return () => returnFocus.current?.focus?.();
  }, []);
  if (!npc) return null;
  const line = seq[at];
  const pick = line?.pick;
  const left = seq.slice(at + 1).filter((l) => shown(l, tags)).length;

  const finish = () => {
    if (step && end) onStory?.({op: 'done', id: npcId, step: step.id, tags: picked});
    onClose();
  };
  const advance = () => {
    if (pick) return;
    if (end) return finish();
    const k = skip(at + 1);
    if (k < seq.length) { setTrail((t) => [...t, at]); setAt(k); return; }
    if (step) { setEnd(true); return; }
    onClose();
  };
  const back = () => { if (end) { setEnd(false); return; } const t = trail.at(-1); if (t === undefined) return; setTrail(trail.slice(0, -1)); setAt(t); };
  const choose = (p) => {
    const next = [...seq.slice(0, at), {s: 'me', t: p.t}, ...(p.then || []), ...seq.slice(at + 1)];
    const t2 = p.tag ? [...tags, p.tag] : tags;
    if (p.tag) { setTags(t2); setPicked((x) => [...x, p.tag]); }
    setSeq(next); setTrail([]); setAt(at);        // 고른 내 대사 칸부터 이어 간다
    dialog.current?.focus();
  };

  // 말하는 사람 — 이름 · 역할 · 초상화
  const who = (() => {
    if (!step || end) return {name: npc.name, role: npc.role, img: npc.portrait || villageArtPath(npc.size ? npc.art : `portrait-${npc.art}`), sight: npc.art === 'bell' || npc.art === 'memorial' || !!(npc.portrait && npc.size)};
    const s = line?.s;
    if (s === 'me') return {name: myName || '나', role: '나', img: null};
    if (s === 'sys') return {name: line.n || npc.name, role: '음성', img: npc.size ? npc.portrait : null, sight: true};
    if (s === 'nar' || pick) return {name: npc.name, role: npc.role, img: npc.size ? npc.portrait : (npc.portrait || null), sight: !!npc.size};
    if (s === 'soeun') { const v = VILLAGE_DIALOGUES['dawn-archivist']; return {name: v.name, role: v.role, img: villageArtPath(`portrait-${v.art}`)}; }
    const p = STORY_PEOPLE[s];
    return p ? {name: p.name, role: p.role, img: storyArtPath('portraits', s)} : {name: npc.name, role: npc.role, img: null};
  })();
  const next = step ? STORY_STEPS[step.i + 1] : null;
  const multi = step?.need ? step.need.length : 0;
  const lastOfStep = !multi || (story?.got || 0) + 1 >= multi;

  const trap = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { finish(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === dialog.current) { e.preventDefault(); advance(); return; }
    if (!pick && /^[1-4]$/.test(e.key)) return;
    if (pick && /^[1-4]$/.test(e.key) && pick[+e.key - 1]) { e.preventDefault(); choose(pick[+e.key - 1]); return; }
    if (e.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    const firstB = buttons[0], lastB = buttons.at(-1);
    if (e.shiftKey && (document.activeElement === firstB || document.activeElement === dialog.current)) { e.preventDefault(); lastB?.focus(); }
    else if (!e.shiftKey && (document.activeElement === lastB || document.activeElement === dialog.current)) { e.preventDefault(); firstB?.focus(); }
  };
  return <>
    <div className="rpg-menu-back" onClick={finish}/>
    <section className={`shop village-panel${step ? ' story' : ''}`} role="dialog" aria-modal="true" aria-labelledby="village-dialog-title" ref={dialog} tabIndex={-1} onKeyDown={trap}>
      {who.img && <img key={who.img} className={`village-portrait${who.sight ? ' sight' : ''}`} src={who.img} alt="" onError={(e) => { e.currentTarget.hidden = true; }}/>}
      <header className="shop-top">
        <div className="shop-title"><b id="village-dialog-title">{who.name}</b><span>{who.role}</span></div>
        {step && <span className="story-tag">{step.ch}장 · {step.q}</span>}
        <button type="button" className="shop-x" aria-label="대화 닫기" onClick={finish}>×</button>
      </header>
      {end ? (
        <div className="story-end" aria-live="polite">
          <span className="story-end-k">{lastOfStep ? (step.end ? '장 완료' : '이야기 진행') : '조사 완료'}</span>
          <b>{step.goal}{multi ? ` ${(story?.got || 0) + 1}/${multi}` : ''} ✓</b>
          {lastOfStep && <span>{step.end || (next ? `다음 · ${next.goal}` : '')}</span>}
          {lastOfStep && step.go && <span className="story-end-go">닫으면 {step.go === 'dawnwood' ? '에르덴 마을' : '다음 장소'}(으)로 옮겨 갑니다</span>}
        </div>
      ) : pick ? (
        <div className="story-picks" role="group" aria-label="대답 고르기">
          {pick.map((p, k) => (
            <button type="button" key={k} className="story-pick" onClick={() => choose(p)}>
              <em>{k + 1}</em>{p.t}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className={`village-dialogue-line${line?.s === 'nar' ? ' nar' : ''}${line?.s === 'me' ? ' me' : ''}`} onClick={advance} aria-label="대사 넘기기">
          <span aria-live="polite">{line?.t}</span>
          <span className="village-dialogue-cue" aria-hidden="true">▾</span>
        </button>
      )}
      <footer className="village-dialogue-actions">
        <span>{step ? (end ? '' : pick ? '대답을 고르세요' : `남은 대사 ${left}`) : `${trail.length + 1} / ${seq.length}`}</span>
        {!pick && <button type="button" className="shop-btn" disabled={!end && !trail.length} onClick={back}>이전</button>}
        {pick ? null : end ? <button type="button" className="shop-btn main" onClick={finish}>확인</button>
          : <button type="button" className="shop-btn main" onClick={advance}>{left || step ? '다음' : '대화 마치기'}</button>}
      </footer>
    </section>
  </>;
}
