import {useEffect, useRef, useState} from 'react';
import {VILLAGE_DIALOGUES, villageArtPath} from './game/villageData.js';
import {STORY_DIALOGUES, STORY_PEOPLE, storyArtPath} from './game/storyData.js';
import {STORY_STEP_BY_ID, STORY_STEPS, STORY_CLEAR_AT, sceneOf, storyLineShown, addPick, stepTargets} from './game/storyQuestData.js';
import {STORY_AFTER} from './game/storyAfter.js';
import {storyFact, storyMoodFor} from './game/storyGuide.js';
import sfx from './game/sfx.js';

/* 기존 상점 틀을 쓴다. 평소에는 소개 대화만 보여 준다.
   메인 스토리에서 지금 이 대상과 이야기할 차례면 이야기 장면을 보여 주고, 선택지를 고르게 한다(storyQuestData.js).
   장면을 끝까지 보고 마지막 칸을 닫으면 진행을 보낸다(onStory → storyQuest.js rpgStory). */
// 대사 한 줄을 최소 이만큼 보여 준 뒤에 넘어간다 — 연타 · 키 누름 반복으로 휙휙 지나가지 않게.
// 짧은 줄 1초, 글자가 많으면 한 글자당 0.02초씩 늘어 최대 2초
const LINE_WAIT = {min: 1, perChar: 0.02, max: 2};
const lineWait = (t) => Math.min(LINE_WAIT.max, LINE_WAIT.min + (t || '').length * LINE_WAIT.perChar) * 1000;
// 줄 연출(storyQuestData.js 머리말 fx) — 화면 효과 이름 · 소리(sfx.js). 짧게 한 번만 낸다
const LINE_FX = {hit: {cls: 'fx-hit', snd: 'boom', ms: 420}, alarm: {cls: 'fx-alarm', snd: 'boss', ms: 900}, flash: {cls: 'fx-flash', snd: 'zap', ms: 520}, chime: {cls: 'fx-chime', snd: 'bless', ms: 900}};

// 시간 제한 질문 — 줄어드는 막대. 다 줄면 onEnd(시간 초과 답)
function PickTimer({sec, onEnd}) {
  const end = useRef(onEnd); end.current = onEnd;
  const [left, setLeft] = useState(sec);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, sec - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); end.current(); }
    }, 100);
    return () => clearInterval(id);
  }, [sec]);
  return <div className="story-timer" role="timer" aria-label={`남은 시간 ${Math.ceil(left)}초`}><i style={{width: `${left / sec * 100}%`}}/><span>{Math.ceil(left)}초</span></div>;
}


export default function VillagePanel({npcId, onClose, story, myName, onStory}) {
  const npc = VILLAGE_DIALOGUES[npcId] || STORY_DIALOGUES[npcId], dialog = useRef(null);
  const returnFocus = useRef(null);
  // 이야기 차례인지 — 창을 여는 순간의 진행으로 정한다(대화 중에 진행이 바뀌어도 장면은 그대로)
  const [step] = useState(() => (story && !story.done && story.targets.includes(npcId) ? STORY_STEP_BY_ID[story.id] : null));
  // 순서 퍼즐에서 차례가 아닌 대상을 고르면 틀린 장면을 보여 준다(서버가 진행을 처음으로 되돌린다)
  const [wrongOrder] = useState(() => !!(step?.order && story?.nextId && story.nextId !== npcId));
  const scene = step ? sceneOf(step, npcId, wrongOrder) : null;
  // 메인 이야기를 마쳤으면 마을 인물은 소개 대신 후일담을 말한다(storyAfter.js) — 고른 꼬리표 · 관계로 줄을 고른다
  const after = !step && story && (story.done || story.i >= STORY_CLEAR_AT) ? STORY_AFTER[npcId] : null;
  // 단서를 다 보기 전의 이야기 상대 — 소개 대신 무엇을 먼저 살펴야 하는지 알려 준다(storyQuest.js storyView locked)
  const locked = !step && story && !story.done && story.locked === npcId;
  // 이야기 사건 뒤 마을 주민의 말 · 기록관 소은의 지난 이야기 정리(storyGuide.js storyMoodFor)
  const mood = !step && !after && !locked && story && !story.done ? storyMoodFor(npcId, {i: story.i, c: story.c}) : null;
  const [seq, setSeq] = useState(() => scene || (after ? after.map((l) => ({s: '', ...l}))
    : locked ? [{s: '', t: npc?.intro}, {s: '', t: `먼저 주변을 더 살펴봐야 할 것 같습니다. 남은 단서: ${story.lookLeft.join(' · ')}`}]
    : [npc?.intro, ...(mood || npc?.lines || [])].map((t) => ({s: '', t}))));
  // 고른 대답 — 꼬리표 · 관계는 화면에서 미리 따라가 대사를 고르고, 서버에는 번호(picked)만 보낸다(storyQuest.js storyPicks)
  const [mind, setMind] = useState(() => ({tags: (story?.c || []).slice(), trust: {...(story?.t || {})}}));
  const [picked, setPicked] = useState([]);
  const shown = (l, m = mind) => storyLineShown(l, m.tags, m.trust);
  const skip = (from, list = seq, m = mind) => { let k = from; while (k < list.length && !shown(list[k], m)) k++; return k; };
  const [at, setAt] = useState(() => skip(0));
  const [trail, setTrail] = useState([]);       // 지나온 칸(이전 버튼) — 선택지를 고른 뒤에는 그 앞으로 되돌아가지 않는다
  const [end, setEnd] = useState(false);
  const [log, setLog] = useState(false);        // 지난 대사 기록 보기(v4 구현 메모 — 대화 기록 재확인)
  // 지금 줄을 넘길 수 있는지 — 줄이 바뀌면 lineWait 동안 잠근다
  const lineKey = `${at}/${seq.length}/${end}`;
  const [readyKey, setReadyKey] = useState(null);
  const ready = readyKey === lineKey;
  useEffect(() => {
    const id = setTimeout(() => setReadyKey(lineKey), end ? 400 : lineWait(seq[at]?.t));
    return () => clearTimeout(id);
  }, [lineKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // 줄 연출 — 이 줄에 fx 가 있으면 창을 잠깐 흔들거나 번쩍이고 소리를 낸다. 같은 줄은 한 번만
  const [fxOn, setFxOn] = useState(null);
  const fxLine = !end ? seq[at] : null;
  useEffect(() => {
    const f = fxLine?.fx && LINE_FX[fxLine.fx];
    if (!f) return undefined;
    setFxOn(f.cls); try { sfx.play(f.snd); } catch { /* 소리를 못 내도 괜찮다 */ }
    const id = setTimeout(() => setFxOn(null), f.ms);
    return () => clearTimeout(id);
  }, [fxLine]);
  useEffect(() => {
    returnFocus.current = document.activeElement; dialog.current?.focus();
    return () => returnFocus.current?.focus?.();
  }, []);
  if (!npc) return null;
  const say = (t) => (t || '').replaceAll('{playerName}', myName || '모험가');   // 대사 속 내 이름
  const line = seq[at];
  const pick = line?.pick;
  const left = seq.slice(at + 1).filter((l) => shown(l)).length;

  const finish = () => {
    if (step && end) onStory?.({op: 'done', id: npcId, step: step.id, picks: picked});
    onClose();
  };
  const advance = () => {
    if (pick || !ready) return;
    if (end) return finish();
    const k = skip(at + 1);
    if (k < seq.length) { setTrail((t) => [...t, at]); setAt(k); return; }
    if (step) { setEnd(true); return; }
    onClose();
  };
  const back = () => { if (end) { setEnd(false); return; } const t = trail.at(-1); if (t === undefined) return; setTrail(trail.slice(0, -1)); setAt(t); };
  const choose = (p, k) => {
    // 틀린 답 · 시간 초과 — 이어지는 대사를 본 뒤 같은 질문으로 돌아온다. 고른 틀린 답은 흐려진다
    const again = p.wrong || p.late ? [{...line, tried: [...(line.tried || []), k]}] : [];
    const next = [...seq.slice(0, at), {s: 'me', t: p.t}, ...(p.then || []), ...again, ...seq.slice(at + 1)];
    if (!p.wrong && !p.late) {                      // 맞는 대답만 번호를 남긴다 — 서버가 같은 장면을 따라가 확정한다
      const m2 = {tags: [...mind.tags], trust: {...mind.trust}}; addPick(p, m2.tags, m2.trust);
      setMind(m2); setPicked((x) => [...x, k]);
    }
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
  const multi = step && stepTargets(step).length > 1 ? stepTargets(step).length : 0;
  const lastOfStep = !multi || (story?.got || 0) + 1 >= multi;
  const isClue = !!step?.look?.includes(npcId);
  // 알게 된 것 — 이번 대화로 확인한 사실(storyRecap.js). 서버도 같은 문장을 알림으로 남긴다
  const fact = step && end && !wrongOrder ? storyFact(step, npcId, mind.tags, lastOfStep) : '';
  // 결전 체력 막대 — 지금 줄까지 본 boss 표시 중 마지막 것(storyLines.js boss)
  const bossNow = step ? seq.slice(0, end ? seq.length : at + 1).filter((l) => l.boss && shown(l)).at(-1)?.boss : null;

  // 지금까지 본 대사 — 고른 대답 · 틀린 답 장면까지 지나온 순서대로(seq 는 고를 때마다 이어 붙는다)
  const nameOf = (l) => (l.s === 'me' ? (myName || '나') : l.s === 'sys' ? (l.n || npc.name) : l.s === 'nar' ? '' : l.s === 'soeun' ? VILLAGE_DIALOGUES['dawn-archivist'].name : STORY_PEOPLE[l.s]?.name || npc.name);
  const seen = step ? seq.slice(0, end ? seq.length : at + 1).filter((l) => !l.pick && shown(l)) : [];

  const trap = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { if (log) { setLog(false); dialog.current?.focus(); return; } finish(); return; }
    if (log) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLog(false); dialog.current?.focus(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === dialog.current) { e.preventDefault(); if (!e.repeat) advance(); return; }
    if (!pick && /^[1-4]$/.test(e.key)) return;
    if (pick && /^[1-4]$/.test(e.key) && pick[+e.key - 1] && !line.tried?.includes(+e.key - 1)) { e.preventDefault(); choose(pick[+e.key - 1], +e.key - 1); return; }
    if (e.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    const firstB = buttons[0], lastB = buttons.at(-1);
    if (e.shiftKey && (document.activeElement === firstB || document.activeElement === dialog.current)) { e.preventDefault(); lastB?.focus(); }
    else if (!e.shiftKey && (document.activeElement === lastB || document.activeElement === dialog.current)) { e.preventDefault(); firstB?.focus(); }
  };
  return <>
    <div className="rpg-menu-back" onClick={finish}/>
    <section className={`shop village-panel${step ? ' story' : ''}${fxOn ? ` ${fxOn}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="village-dialog-title" ref={dialog} tabIndex={-1} onKeyDown={trap}>
      {who.img && <img key={who.img} className={`village-portrait${who.sight ? ' sight' : ''}`} src={who.img} alt="" onError={(e) => { e.currentTarget.hidden = true; }}/>}
      <header className="shop-top">
        <div className="shop-title"><b id="village-dialog-title">{who.name}</b><span>{who.role}</span></div>
        {step && <span className="story-tag">{step.ch}장 · {step.q}</span>}
        <button type="button" className="shop-x" aria-label="대화 닫기" onClick={finish}>×</button>
      </header>
      {bossNow && !log && (
        <div className={`story-boss${bossNow[1] <= 0 ? ' down' : ''}`} role="meter" aria-label={`${bossNow[0]} 남은 체력`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bossNow[1]}>
          <b>{bossNow[0]}</b><i><s style={{width: `${bossNow[1]}%`}}/></i><span>{bossNow[1] > 0 ? `${bossNow[1]}%` : '멈춤'}</span>
        </div>
      )}
      {log ? (
        <ol className="story-log" aria-label="지난 대사" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
          {seen.map((l, k) => <li key={k} className={`${l.s === 'nar' ? 'nar' : l.s === 'me' ? 'me' : ''}${l.key ? ' key' : ''}`}>{nameOf(l) && <b>{nameOf(l)}</b>}<span>{say(l.t)}</span></li>)}
        </ol>
      ) : end ? (
        <div className="story-end" aria-live="polite">
          {wrongOrder ? <>
            <span className="story-end-k">순서가 틀렸습니다</span>
            <b>{step.goal} — 처음부터 다시</b>
            <span>{step.where}</span>
          </> : <>
          <span className="story-end-k">{lastOfStep ? (step.end ? '장 완료' : '이야기 진행') : isClue ? '단서 확인' : '조사 완료'}</span>
          <b>{isClue ? npc.name : step.goal}{multi ? ` ${(story?.got || 0) + 1}/${multi}` : ''} ✓</b>
          {fact && <p className="story-end-fact"><em>알게 된 것</em>{fact}</p>}
          {lastOfStep ? <span>{step.end || (next ? `다음 · ${next.goal}` : '')}</span>
            : step.look && (story?.got || 0) + 1 >= step.look.length ? <span>단서를 모두 찾았습니다. 이제 {STORY_DIALOGUES[step.at]?.name || '이야기 상대'}에게 갑니다.</span> : null}
          </>}
          {!wrongOrder && lastOfStep && step.go && <span className="story-end-go">닫으면 {step.go === 'dawnwood' ? '에르덴 마을' : '다음 장소'}(으)로 옮겨 갑니다</span>}
        </div>
      ) : pick ? (
        <div className="story-picks" role="group" aria-label="대답 고르기">
          {pick.map((p, k) => (
            <button type="button" key={k} className={`story-pick${line.tried?.includes(k) ? ' tried' : ''}`} disabled={line.tried?.includes(k)} onClick={() => choose(p, k)}>
              <em>{k + 1}</em>{say(p.t)}
            </button>
          ))}
          {line.timer && <PickTimer key={`${at}/${seq.length}`} sec={line.timer} onEnd={() => choose({...line.late, late: true}, -1)}/>}
        </div>
      ) : (
        <button type="button" className={`village-dialogue-line${line?.s === 'nar' ? ' nar' : ''}${line?.s === 'me' ? ' me' : ''}${line?.key ? ' key' : ''}`} onClick={advance} aria-label="대사 넘기기">
          <span aria-live="polite">{say(line?.t)}</span>
          <span className={`village-dialogue-cue${ready ? '' : ' wait'}`} aria-hidden="true">▾</span>
        </button>
      )}
      <footer className="village-dialogue-actions">
        <span>{log ? `지난 대사 ${seen.length}` : step ? (end ? '' : pick ? '대답을 고르세요' : `남은 대사 ${left}`) : `${trail.length + 1} / ${trail.length + 1 + left}`}</span>
        {step && seen.length > 1 && <button type="button" className={`shop-btn${log ? ' main' : ''}`} aria-pressed={log} onClick={() => { setLog(!log); dialog.current?.focus(); }}>{log ? '돌아가기' : '기록'}</button>}
        {log ? null : !pick && <button type="button" className="shop-btn" disabled={!end && !trail.length} onClick={back}>이전</button>}
        {log || pick ? null : end ? <button type="button" className="shop-btn main" onClick={finish}>확인</button>
          : <button type="button" className="shop-btn main" aria-disabled={!ready} onClick={advance}>{left || step ? '다음' : '대화 마치기'}</button>}
      </footer>
    </section>
  </>;
}
