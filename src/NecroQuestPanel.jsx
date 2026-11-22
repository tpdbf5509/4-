import { useEffect, useRef, useState } from 'react';
import { nqSpotById, nqSpotIndex, nqHas, nqView, nqGenStep, nqLock, nqTorchLit, nqDial, nqSealCount, nqGaugeOf, nqGaugeSafe } from './game/necroQuest.js';
import { NQ_THRONE, NQ_LOG, NQ_TRIALS, NQ_SEALS } from './game/necroQuestData.js';
import sfx from './game/sfx.js';

/* Necromancer 004 획득 루트 조사 창 — Engineer 003 조사 창과 같은 마을 대화 틀(.shop.village-panel.eq-panel)을 쓴다.
   대사를 보여 주고, 자리마다 퍼즐 입력(고르기 · 차례 · 다이얼 · 문답)을 받아 서버에 보낸다(onAct → 입력 kind "nq").
   판정은 서버가 하고, 결과는 영웅 줄 61(nqView R = [자리 차례, 결과, 번호])로 돌아온다. 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 힌트 · 6 이미 함.
   「탐험 기록」은 지금까지 본 것만 원문 그대로 보여 준다(다음 목표 · 정답은 적지 않는다 — 기획안 2장) */
const split = (l) => { const i = l.indexOf('|'); return i > 0 && i < 12 ? [l.slice(0, i), l.slice(i + 1)] : ['', l]; };
const NONE = ['아직 할 수 있는 일이 없다.'];
// 인장 확인은 기존 진행 플래그만 읽는다. 퍼즐 힌트는 해당 인장을 얻은 뒤에만 공개한다.
const SEAL_INSPECTION = [
  { name: '검의 인장', description: '카르돈의 검 문양이 새겨져 있다. 물에 잠긴 전장과 세 기둥의 기억이 희미하게 비친다.' },
  { name: '방패의 인장', description: '발테른의 방패 안쪽에 새겨진 세 문양: 「달 · 저울 · 나무」. 순서대로 놓인 문양 아래에 서고의 분류 표식이 있다.' },
  { name: '기록의 인장', description: '세리온의 기록 문양이 있다. 지워진 왕의 이름과 검은 깃털이 흩날리는 절벽의 기억이 남아 있다.' },
  { name: '날개의 인장', description: '라에딘의 날개 문양이 새겨져 있다. 옆에는 낡은 회중시계의 형상이 남아 있다.' },
  { name: '시간의 인장', description: '오르벤의 모래시계 문양이 새겨져 있다. 멈춰 버린 장례 행렬의 기억이 떠오른다.' },
  { name: '경계의 인장', description: '모르켄의 경계문 문양이 새겨져 있다. 서로 마주 보는 두 세계의 조형물이 비친다.' },
  { name: '침묵의 인장', description: '에레보스의 감은 눈 문양이 새겨져 있다. 일곱 맹세는 첫 무덤에서 끝난다는 문구가 보인다.' },
];

export default function NecroQuestPanel({ spotId, getHero, tick, onAct, onGlyph, onContract, onClose }) {
  const s = nqSpotById(spotId), a = s.act, k = a.k, si = nqSpotIndex(spotId);
  const box = useRef(null);
  const [lines, setLines] = useState([]);
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState('read');          // read · input · wait
  const [after, setAfter] = useState(null);          // 대사를 다 읽으면 할 입력
  const [sel, setSel] = useState([]);
  const [dials, setDials] = useState([]);
  const [note, setNote] = useState('');
  const [log, setLog] = useState(false);
  const [sealsOpen, setSealsOpen] = useState(false);
  const waitN = useRef(-1), pend = useRef(null);
  const h0 = () => getHero();
  const has = (n) => nqHas(h0(), n);
  const read = (ls, next) => { setNote(''); setLines(ls); setAt(0); setMode(ls.length ? 'read' : next ? 'input' : 'read'); setAfter(() => next || null); if (!ls.length && !next) onClose(); };
  const ask = (next) => { setNote(''); setMode('input'); setAfter(() => next); };
  const send = (val, then) => { waitN.current = (nqView(h0())?.R?.[2] ?? -1); setMode('wait'); pend.current = then || null; onAct(spotId, val); };
  const condOk = (c) => !c || (typeof c === 'function' ? c(h0().bag.nu, has) : c.every((n) => (n[0] === '!' ? !has(n.slice(1)) : has(n))));
  const lockLines = () => { const l = nqLock(h0(), a); return l.length ? l : NONE; };

  // 장군 자리 — 다음 차례를 보여 준다(문답 · 차례 맞추기 · 장치 확인 · 시험 · 다 끝남)
  function genNext(pre = []) {
    const st = nqGenStep(h0(), a);
    if (!st) return send(undefined, () => read([...pre, ...(a.done || [])]));
    if (st.quiz) { setDials(a.quiz.items.map(() => -1)); return read([...pre, ...(a.quiz.q ? [a.quiz.q] : [])], 'quiz'); }
    if (st.order) { setSel([]); return read(pre, 'order'); }
    if (st.check) return read(pre, 'check');
    if (st.trial) return read([...pre, `시험 — ${NQ_TRIALS[st.trial].name}`], 'trial');
    return read([...pre, ...lockLines()]);
  }
  // 처음 열 때 — 자리 종류마다 무엇을 보여 줄지
  useEffect(() => {
    const h = h0(), tr = nqView(h)?.tr;
    if (k === 'gate') {
      if (!condOk(a.need)) return read(lockLines());
      if (a.first && !(a.firstSet && has(a.firstSet))) return read(a.first, 'go');
      onAct(spotId, 1); return onClose();
    }
    if (k !== 'trialGen' && k !== 'throne' && a.need && !condOk(a.need)) return read(lockLines());
    if (k === 'talk' || k === 'clock') { onAct(spotId); return read(a.lines); }
    if (k === 'ask') return read(a.intro, 'ask');
    if (k === 'take' || k === 'record') return has(a.set) ? read(a.done || ['이미 해 두었다.']) : send(undefined, (c) => read(c === 1 ? a.ok || a.lines : lockLines()));
    if (k === 'torch') { const lit = nqTorchLit(h, a.i); return send(undefined, () => read([lit ? '횃불을 껐다. 주위가 한층 어두워진다.' : '횃불에 다시 불을 붙였다.'])); }
    if (k === 'dial') return ask('dial');
    if (k === 'gauge') {
      const p = nqGaugeOf(Date.now() / 1000), safe = nqGaugeSafe(Date.now() / 1000);
      return read([`압력계 바늘이 ${safe ? '푸른 칸' : '붉은 칸'}에 있다(${Math.floor(p)}).`, '바늘은 여덟을 세고 한 바퀴 돈다. 푸른 칸은 끝의 셋뿐이다.']);
    }
    if (k === 'seq') return send(undefined, (c) => read(c === 1 ? a.ok : c === 4 ? [`수문 하나가 열렸다(${(nqView(h0())?.seq?.[a.g] || []).length}/${a.n}).`] : c === 6 ? ['이미 물이 빠졌다.'] : [a.bad]));
    if (k === 'pick' || k === 'dials') { if (k === 'dials') setDials(a.items.map(() => 0)); return has(a.set) ? read(a.ok) : read(a.intro || [], k); }
    if (k === 'order') return has(a.set) ? read(a.ok) : read(a.intro || [], 'order');
    if (k === 'mimic') return has(a.seal) ? read(a.sealed) : read(a.intro, 'mimic');
    if (k === 'trialGen') {
      if (tr && tr.id === 'palace' && tr.gl && s.id === 'p-altar') { setDials(NQ_TRIALS.palace.glyphs.items.map(() => -1)); return read(['제단 둘레에 일곱 문양이 떠 있다. 문양마다 그 장군의 이름을 맞춘다.'], 'glyph'); }
      if (tr) return read([`${NQ_TRIALS[tr.id].name} 진행 중이다.`]);
      if (a.steps.every((q) => has(q.flag)) && (!a.reward || a.reward.every((n) => has(n)))) return read(a.done ? a.done.slice(0, 1) : ['이미 끝났다.']);
      if (a.need && !condOk(a.need)) return read(lockLines());
      const st = nqGenStep(h, a);
      if (st && !st.quiz && !st.order && !st.check && !st.trial) return read(lockLines());
      return genNext(a.intro || []);
    }
    if (k === 'throne') {
      if (has('claim')) return send(undefined, () => read(['왕좌 위의 그림자가 고개를 숙인다. 군단은 새 주인을 기억한다.']));
      return send(undefined, (c) => (c === 1 ? read(NQ_THRONE.intro, 'throne') : read(lockLines())));
    }
    return read(NONE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 서버 결과를 기다린다
  useEffect(() => {
    if (mode !== 'wait') return;
    const R = nqView(h0())?.R;
    if (!R || R[2] === waitN.current || R[0] !== si) return;
    const c = R[1], f = pend.current; pend.current = null;
    if (c === 1) sfx.play('eqBeep');
    if (f) f(c); else read([]);
  });
  useEffect(() => { box.current?.focus(); }, [mode, at]);

  const next = () => {
    if (mode !== 'read') return;
    if (at + 1 < lines.length) return setAt(at + 1);
    if (after) return ask(after);
    onClose();
  };
  const line = lines[at] ? split(lines[at]) : null;
  const retry = (m, bad) => { setNote(bad); setMode('input'); setAfter(() => m); };
  const choose = (i) => {               // ask · pick · mimic · throne
    if (k === 'ask') { const o = a.opts[i]; onAct(spotId, i); return read(o.lines); }
    if (k === 'mimic') {
      if (i === 0) return send(0, () => read(['그것이 이빨을 드러내며 덮쳐 온다! 바닥의 붉은 원을 피해 물러나자.']));
      if (i === 1) return read(['천천히 뒤로 물러났다. 굳이 건드릴 필요는 없다.']);
      return send(2, () => read(a.poke));
    }
    if (k === 'throne') return read([...NQ_THRONE.opts[i].lines, ...NQ_THRONE.after], 'contract');
    send(i, (c) => (c === 1 ? read(a.ok) : retry(k, a.bad)));
  };
  const genSend = (val, okLines, m, bad) => send(val, (c) => (c === 1 ? genNext(okLines) : retry(m, bad)));
  const input = mode === 'input' ? after : null;
  const h = h0(), tr = nqView(h)?.tr;
  const ord = k === 'trialGen' && a.order ? a.order : a;
  const ordIdx = ord.shuffle || (ord.items || []).map((_, i) => i);
  const ordN = ord.pickN || (ord.ans || []).length;
  void tick;
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className="shop village-panel eq-panel nq-panel" role="dialog" aria-modal="true" aria-labelledby="nq-dialog-title" ref={box} tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); else if ((e.key === 'Enter' || e.key === ' ') && mode === 'read' && !log && !sealsOpen) { e.preventDefault(); next(); } }}>
      <header className="shop-top">
        <div className="shop-title"><b id="nq-dialog-title">{s.name}</b><span>{NQ_SEALS.some((n) => has(n)) ? `인장 ${nqSealCount(h)}/7` : '조사'}</span></div>
        <button type="button" className="shop-x" aria-label="창 닫기" onClick={onClose}>×</button>
      </header>
      {sealsOpen && <div className="story-log" role="region" aria-label="획득한 인장 확인">
        <p><b>획득한 인장 {nqSealCount(h)}/7</b></p>
        {NQ_SEALS.map((flag, i) => (
          <div key={flag} style={{ marginBottom: 12 }}>
            <b>{has(flag) ? '◆' : '◇'} {SEAL_INSPECTION[i].name}</b>
            <p>{has(flag) ? SEAL_INSPECTION[i].description : '아직 획득하지 않은 인장입니다.'}</p>
          </div>
        ))}
      </div>}
      {log && !sealsOpen && <div className="story-log" role="region" aria-label="탐험 기록">
        {NQ_LOG.filter((q) => has(q.f)).map((q) => <p key={q.f}>{q.t}</p>)}
        {!NQ_LOG.some((q) => has(q.f)) && <p>아직 적어 둔 것이 없다.</p>}
      </div>}
      {!log && !sealsOpen && mode === 'read' && line && (
        <button type="button" className={`village-dialogue-line${line[0] ? '' : ' nar'}`} onClick={next} aria-label="대사 넘기기">
          {line[0] && <b className="eq-who">{line[0]}</b>}{line[1]}<span className="village-dialogue-cue" aria-hidden="true">▾</span>
        </button>
      )}
      {!log && !sealsOpen && mode === 'wait' && <div className="village-dialogue-line nar" aria-live="polite">…</div>}
      {!log && !sealsOpen && input === 'ask' && <div className="story-picks" role="group" aria-label="물어보기">
        {a.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => choose(i)}>{o.t}</button>)}
      </div>}
      {!log && !sealsOpen && (input === 'pick' || input === 'mimic') && <div className="story-picks" role="group" aria-label={a.q || '고르기'}>
        {a.q && <p className="eq-q">{a.q}</p>}
        {a.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => choose(i)}>{o}</button>)}
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {!log && !sealsOpen && input === 'throne' && <div className="story-picks" role="group" aria-label="대답">
        {NQ_THRONE.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => choose(i)}>{o.t}</button>)}
      </div>}
      {!log && !sealsOpen && input === 'dial' && <div className="story-picks" role="group" aria-label={s.name}>
        <p className="eq-q">{a.note || '값을 고른다.'} 지금 {a.names[nqDial(h, a.key)]}{a.unit}</p>
        <div className="eq-row">{a.opts.map((o) => <button type="button" key={o} className={`shop-btn${nqDial(h, a.key) === o ? ' main' : ''}`}
          onClick={() => send(o, () => read([`${a.names[o]}${a.unit}으로 맞췄다.`]))}>{a.names[o]}{a.unit}</button>)}</div>
      </div>}
      {!log && !sealsOpen && (input === 'order') && <div className="story-picks" role="group" aria-label="차례 정하기">
        <p className="eq-q">차례대로 고른다{ord.pickN ? `(${ordN}개)` : ''}: {sel.map((i) => ord.items[i]).join(' → ') || '—'}</p>
        <div className="eq-row">{ordIdx.map((i) => <button type="button" key={i} className="shop-btn" disabled={sel.includes(i) || sel.length >= ordN} onClick={() => setSel([...sel, i])}>{ord.items[i]}</button>)}</div>
        <div className="eq-row">
          <button type="button" className="shop-btn" onClick={() => setSel([])}>다시</button>
          <button type="button" className="shop-btn main" disabled={sel.length !== ordN} onClick={() => { const v = sel; setSel([]); if (k === 'trialGen') genSend(v, [], 'order', ord.bad); else send(v, (c) => (c === 1 ? read(a.ok) : retry('order', a.bad))); }}>놓기</button>
        </div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {!log && !sealsOpen && (input === 'dials' || input === 'quiz' || input === 'glyph') && (() => {
        const q = input === 'quiz' ? a.quiz : input === 'glyph' ? { items: NQ_TRIALS.palace.glyphs.items.map((n) => ({ n, opts: NQ_TRIALS.palace.glyphs.opts })) } : a;
        return <div className="story-picks" role="group" aria-label={q.q || s.name}>
          {input === 'dials' && a.q && <p className="eq-q">{a.q}</p>}
          {input === 'glyph' && tr && <p className="eq-q">남은 {Math.max(0, Math.ceil(tr.glT))}초</p>}
          {q.items.map((it, i) => <div className="eq-row" key={i}><span className="eq-label">{it.n}</span>
            {it.opts.map((o, j) => <button type="button" key={j} aria-pressed={dials[i] === j} className={`shop-btn${dials[i] === j ? ' main' : ''}`} onClick={() => setDials(dials.map((x, z) => (z === i ? j : x)))}>{o}</button>)}</div>)}
          <div className="eq-row"><button type="button" className="shop-btn main" disabled={dials.some((x) => x < 0)} onClick={() => {
            if (input === 'glyph') { onGlyph(dials); return onClose(); }
            if (input === 'quiz') return genSend(dials, a.quiz.ok || [], 'quiz', a.quiz.bad);
            send(dials, (c) => (c === 1 ? read(a.ok) : retry('dials', a.bad)));
          }}>{input === 'quiz' ? '대답하기' : '맞추기'}</button></div>
          {note && <p className="eq-note">{note}</p>}
        </div>;
      })()}
      {!log && !sealsOpen && input === 'check' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => send(undefined, (c) => (c === 1 ? genNext(a.check.ok) : read(a.check.bad)))}>쇠사슬을 살핀다</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && !sealsOpen && input === 'go' && <div className="eq-row eq-end"><button type="button" className="shop-btn main" onClick={() => { onAct(spotId, 1); onClose(); }}>들어가기</button></div>}
      {!log && !sealsOpen && input === 'trial' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => { onAct(spotId, 'start'); onClose(); }}>시험 시작</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && !sealsOpen && input === 'contract' && <div className="eq-contract" role="group" aria-label={NQ_THRONE.title}>
        <b>{NQ_THRONE.title}</b>
        <p>{NQ_THRONE.q}</p>
        <p className="eq-note">계승하면 1차 전직은 사라지고 그림자 낫만 들 수 있다. 히든 직업은 게임 전체에서 한 명만 가질 수 있다.</p>
        <div className="eq-row">
          <button type="button" className="shop-btn main" onClick={() => { onContract(true); onClose(); }}>{NQ_THRONE.yes}</button>
          <button type="button" className="shop-btn" onClick={() => { onContract(false); onClose(); }}>{NQ_THRONE.no}</button>
        </div>
      </div>}
      <footer className="village-dialogue-actions">
        {NQ_SEALS.some(has) && <button type="button" className="shop-btn" aria-pressed={sealsOpen} onClick={() => { setSealsOpen(!sealsOpen); setLog(false); }}>{sealsOpen ? '돌아가기' : '인장 확인'}</button>}
        {NQ_LOG.some((q) => has(q.f)) && <button type="button" className="shop-btn" aria-pressed={log} onClick={() => { setLog(!log); setSealsOpen(false); }}>{log ? '돌아가기' : '탐험 기록'}</button>}
        {!log && !sealsOpen && mode === 'read' && <button type="button" className="shop-btn main" onClick={next}>{at + 1 < lines.length || after ? '다음' : '닫기'}</button>}
        {(log || sealsOpen || mode !== 'read') && <button type="button" className="shop-btn" onClick={onClose}>닫기</button>}
      </footer>
    </section>
  </>;
}
