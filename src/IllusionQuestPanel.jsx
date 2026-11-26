import { useEffect, useRef, useState } from 'react';
import { iqSpotById, iqSpotIndex, iqHas, iqView, iqStep, iqLock, iqCond, iqDial, iqOpen, iqEvidence, iqCardCount } from './game/illusionQuest.js';
import { IQ_LOG, IQ_FOREST as FO, IQ_RIDGE, IQ_DESK, IQ_TRAVEL, IQ_TRIAL } from './game/illusionQuestData.js';
import sfx from './game/sfx.js';

/* Illusionist 005 획득 루트 조사 창 — Necromancer 004 조사 창과 같은 마을 대화 틀(.shop.village-panel.eq-panel)을 쓴다.
   대사를 보여 주고, 자리마다 입력(고르기 · 차례 · 다이얼 · 증거)을 받아 서버에 보낸다(onAct → 입력 kind "iq").
   판정은 서버가 하고 결과는 영웅 줄 64(iqView R = [자리 차례, 결과, 번호])로 돌아온다. 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 더 알아봄 · 6 이미 함.
   「낡은 공연 기록」은 본 것만 보여 준다(정답 · 다음 목표는 적지 않는다 — 기획서 3.2). 같은 퍼즐을 세 번째 틀리면 힌트 한 줄 */
const split = (l) => { const i = l.indexOf('|'); return i >= 0 && i < 12 ? [l.slice(0, i), l.slice(i + 1)] : ['', l]; };
const NONE = ['|아직 할 수 있는 일이 없다.'];

export default function IllusionQuestPanel({ spotId, getHero, tick, onAct, onContract, onClose }) {
  const s = iqSpotById(spotId), a = s.act, k = a.k, si = iqSpotIndex(spotId);
  const box = useRef(null);
  const [lines, setLines] = useState([]);
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState('read');          // read · input · wait
  const [after, setAfter] = useState(null);
  const [sel, setSel] = useState([]);
  const [dials, setDials] = useState([]);
  const [note, setNote] = useState('');
  const [log, setLog] = useState(false);
  const waitN = useRef(-1), pend = useRef(null);
  const h0 = () => getHero();
  const has = (n) => iqHas(h0(), n);
  const read = (ls, next) => { setNote(''); setLines(ls); setAt(0); setMode(ls.length ? 'read' : next ? 'input' : 'read'); setAfter(() => next || null); if (!ls.length && !next) onClose(); };
  const send = (val, then) => { waitN.current = (iqView(h0())?.R?.[2] ?? -1); setMode('wait'); pend.current = then || null; onAct(spotId, val); };
  const wrongN = () => (iqView(h0())?.w?.[spotId]) || 0;
  const retry = (m, bad, hint) => { setNote(`${bad}${hint && wrongN() >= 2 ? ` — 힌트: ${hint}` : ''}`); setMode('input'); setAfter(() => m); };

  // 여러 단계 자리 — 지금 차례를 띄운다
  function stepNext(pre = []) {
    const st = iqStep(h0(), a);
    if (!st) return read([...pre, ...(a.done || [])], a.go ? 'go2' : null);
    if (st.k === 'read') return send(0, () => stepNext([...pre, ...st.lines]));
    if (st.k === 'dials') setDials(st.items.map(() => -1));
    if (st.k === 'order') setSel([]);
    return read(pre, st.k);
  }
  useEffect(() => {
    const h = h0();
    if (a.need && k !== 'gate' && !iqCond(h, a.need)) return read(iqLock(h, a));
    if (k === 'talk') { onAct(spotId); return read(a.lines); }
    if (k === 'ask') return read(a.intro, 'ask');
    if (k === 'steps') { if (a.visit) onAct(spotId, 'open'); return stepNext(a.intro || []); }
    if (k === 'gate') {
      if (!iqCond(h, a.need)) return read(iqLock(h, a));
      if (a.first) return read(a.first, 'go');
      onAct(spotId, 1); return onClose();
    }
    if (k === 'door') return iqOpen(h, s) ? read(['|빗장이 풀려 있다. 문 너머로 소품 냄새가 난다.'], 'go') : read(['|문이 잠겨 있다. 빗장은 반대편에 걸려 있는 것 같다.']);
    if (k === 'tree') { const n = iqDial(h, 'fk'); return read([n ? `|나무 껍질에 칼로 그은 흠집이 ${n}개 있다.` : '|껍질이 매끈하다. 아무 흠집도 없다.', '|같은 길을 돌아와도 이 나무는 늘 이 자리에 있다.']); }
    if (k === 'trace') { onAct(spotId); return read([`|${FO.trace[Math.min(2, iqDial(h, 'fk'))][a.dir]}`]); }
    if (k === 'fork') {
      if (has('route_solved')) return a.dir === FO.ans[FO.ans.length - 1] ? read(['|접혔던 길이 곧게 펴져 있다. 이 길 끝이 사라진 야외 객석이다.'], 'go') : read(['|길이 다시 접혀 갈림길 한가운데로 돌아온다. 객석은 북쪽 길 끝에 있다.']);
      const fk = Math.min(2, iqDial(h, 'fk'));
      return read([`|${FO.sign[fk][a.dir]}`, ...(has('guide_seam') ? [] : [FO.guide[fk]])], 'fork');
    }
    if (k === 'latch') return read([`|${IQ_RIDGE.wheelQ}`, ...(iqDial(h, 'wh') ? ['|추는 이미 걸쇠에 고정되어 있다.'] : [])], iqDial(h, 'wh') ? null : 'latch');
    if (k === 'ribbon') return has('card_seat') ? read(['|리본은 이미 풀려 있다.']) : read(['|리본대에 붉은 매듭이 묶여 있다. 줄은 유리함 쪽으로 이어진다.'], 'ribbon');
    if (k === 'travel') return read(['|벽 지도에 다녀온 보관처가 핀으로 꽂혀 있다. 소품실 뒷문으로 곧장 갈 수 있다.'], 'travel');
    if (k === 'trial') {
      if (iqView(h)?.tr) { onAct(spotId); return onClose(); }
      if (has('trial_passed')) return read(['|무대는 고요하다. 계승대에 빛이 들어와 있다.']);
      return read(['|복원된 무대 한가운데 선다. 시험 체력 100 — 레벨 · 장비 · 직업은 시험에 영향을 주지 않는다.', '|막이 바뀔 때마다 쓸 수 있는 기술이 늘어난다. 끝낸 막은 남는다.'], 'trial');
    }
    if (k === 'desk') return has('claimed') ? read(['|계승대 위에 카드 한 장의 자국만 남아 있다.']) : read(IQ_DESK.intro, 'contract');
    return read(NONE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 서버 결과를 기다린다
  useEffect(() => {
    if (mode !== 'wait') return;
    const R = iqView(h0())?.R;
    if (!R || R[2] === waitN.current || R[0] !== si) return;
    const c = R[1], f = pend.current; pend.current = null;
    if (c === 1) sfx.play('eqBeep');
    if (f) f(c); else read([]);
  });
  useEffect(() => { box.current?.focus(); }, [mode, at]);

  const next = () => {
    if (mode !== 'read') return;
    if (at + 1 < lines.length) return setAt(at + 1);
    if (after) { setNote(''); setMode('input'); return; }
    onClose();
  };
  const line = lines[at] ? split(lines[at]) : null;
  const input = mode === 'input' ? after : null;
  const h = h0();
  const st = k === 'steps' ? iqStep(h, a) : null;
  const stOpts = st && st.k === 'pick' ? (st.opts === 'evidence' ? iqEvidence(h).map((e) => ({ t: e.t, i: e.i })) : st.opts.map((o, i) => ({ t: typeof o === 'string' ? o : o.t, i }))) : [];
  // 고르기 · 증거 — 맞으면 다음 차례, 더 알아본 대답은 그 말만, 틀리면 다시
  const pickStep = (i) => send(i, (c) => {
    if (c === 1) { const by = st.okBy ? st.okBy[st.ans.indexOf(i)] || [] : []; return stepNext([...by, ...(st.ok || [])]); }
    if (c === 5) { const o = st.opts === 'evidence' ? iqEvidenceInfo(i) : st.opts[i]; return read(o.info || NONE, 'pick'); }
    retry('pick', st.bad || '그건 아닌 것 같다.', st.hint);
  });
  const iqEvidenceInfo = (i) => iqEvidence(h0()).find((e) => e.i === i) || {};
  void tick;
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className="shop village-panel eq-panel nq-panel" role="dialog" aria-modal="true" aria-labelledby="iq-dialog-title" ref={box} tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); else if ((e.key === 'Enter' || e.key === ' ') && mode === 'read' && !log) { e.preventDefault(); next(); } }}>
      <header className="shop-top">
        <div className="shop-title"><b id="iq-dialog-title">{s.name}</b><span>{has('dispatch_found') ? `카드 ${iqCardCount(h)}/5` : '조사'}</span></div>
        <button type="button" className="shop-x" aria-label="창 닫기" onClick={onClose}>×</button>
      </header>
      {log && <div className="story-log" role="region" aria-label="낡은 공연 기록">
        {IQ_LOG.filter((q) => has(q.f)).map((q) => <p key={q.f}>{q.t}</p>)}
        {!IQ_LOG.some((q) => has(q.f)) && <p>아직 적어 둔 것이 없다.</p>}
      </div>}
      {!log && mode === 'read' && line && (
        <button type="button" className={`village-dialogue-line${line[0] ? '' : ' nar'}`} onClick={next} aria-label="대사 넘기기">
          {line[0] && <b className="eq-who">{line[0]}</b>}{line[1]}<span className="village-dialogue-cue" aria-hidden="true">▾</span>
        </button>
      )}
      {!log && mode === 'wait' && <div className="village-dialogue-line nar" aria-live="polite">…</div>}
      {!log && input === 'ask' && <div className="story-picks" role="group" aria-label="고르기">
        {a.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => { onAct(spotId, i); if (o.go) return onClose(); read(o.lines); }}>{o.t}</button>)}
      </div>}
      {!log && input === 'pick' && st && <div className="story-picks" role="group" aria-label={st.q || '고르기'}>
        {st.q && <p className="eq-q">{st.q}</p>}
        {stOpts.map((o) => <button type="button" key={o.i} className="story-pick" onClick={() => pickStep(o.i)}>{o.t}</button>)}
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {!log && input === 'order' && st && (() => { const n = st.pickN || st.ans.length; return <div className="story-picks" role="group" aria-label="차례 정하기">
        <p className="eq-q">{st.q}{st.pickN ? ` (${n}개)` : ''}</p>
        {st.play && <p className="eq-note">{st.play.join(' · ')}</p>}
        <p className="eq-q">{sel.map((i) => st.items[i]).join(' → ') || '—'}</p>
        <div className="eq-row">{st.items.map((it, i) => <button type="button" key={i} className="shop-btn" disabled={sel.includes(i) || sel.length >= n} onClick={() => setSel([...sel, i])}>{it}</button>)}</div>
        <div className="eq-row">
          <button type="button" className="shop-btn" onClick={() => setSel([])}>다시</button>
          <button type="button" className="shop-btn main" disabled={sel.length !== n} onClick={() => { const v = sel; setSel([]); send(v, (c) => (c === 1 ? stepNext(st.ok) : retry('order', st.bad, st.hint))); }}>놓기</button>
        </div>
        {note && <p className="eq-note">{note}</p>}
      </div>; })()}
      {!log && input === 'dials' && st && <div className="story-picks" role="group" aria-label={st.q || s.name}>
        {st.q && <p className="eq-q">{st.q}</p>}
        {st.items.map((it, i) => <div className="eq-row" key={i}><span className="eq-label">{it.n}</span>
          {it.opts.map((o, j) => <button type="button" key={j} aria-pressed={dials[i] === j} className={`shop-btn${dials[i] === j ? ' main' : ''}`} onClick={() => setDials(dials.map((x, z) => (z === i ? j : x)))}>{o}</button>)}</div>)}
        <div className="eq-row"><button type="button" className="shop-btn main" disabled={dials.some((x) => x < 0)} onClick={() => send(dials, (c) => (c === 1 ? stepNext(st.ok) : retry('dials', st.bad, st.hint)))}>맞추기</button></div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {!log && input === 'fork' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => send(undefined, (c) => (c === 1 ? read([`|${FO.ok[Math.max(0, iqDial(h0(), 'fk') - 1)]}`]) : read([`|${FO.wrong}`, ...(wrongN() >= 3 ? [`|${FO.hint3}`] : [])])))}>이 길로 간다</button>
        <button type="button" className="shop-btn" onClick={onClose}>그만두기</button>
      </div>}
      {!log && input === 'latch' && <div className="story-picks" role="group" aria-label="물레">
        {IQ_RIDGE.wheel.map((t, i) => <button type="button" key={i} className="story-pick" onClick={() => send(i, (c) => read([`|${c === 1 ? IQ_RIDGE.fixed : IQ_RIDGE.spun}`]))}>{t}</button>)}
      </div>}
      {!log && input === 'ribbon' && <div className="story-picks" role="group" aria-label="리본대">
        {IQ_RIDGE.ribbon.map((t, i) => <button type="button" key={i} className="story-pick" onClick={() => send(i, (c) => read(c === 1 ? IQ_RIDGE.ok : [`|${c === 5 ? IQ_RIDGE.glass : IQ_RIDGE.early}`]))}>{t}</button>)}
      </div>}
      {!log && input === 'travel' && <div className="story-picks" role="group" aria-label="방문한 보관처">
        {IQ_TRAVEL.map((t, i) => has(t.f) && <button type="button" key={i} className="story-pick" onClick={() => { onAct(spotId, i); onClose(); }}>{t.name}</button>)}
        {!IQ_TRAVEL.some((t) => has(t.f)) && <p className="eq-note">아직 다녀온 보관처가 없다. 장부의 지명을 직접 찾아가자.</p>}
      </div>}
      {!log && input === 'go' && <div className="eq-row eq-end"><button type="button" className="shop-btn main" onClick={() => { onAct(spotId, 1); onClose(); }}>들어가기</button></div>}
      {!log && input === 'go2' && a.go && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => { onAct(spotId, 'go'); onClose(); }}>{a.go.t}</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && input === 'trial' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => { onAct(spotId); onClose(); }}>시험 시작 — {IQ_TRIAL.names[Math.max(0, ['trial_card_done', 'trial_space_done', 'trial_mirror_done', 'trial_self_done'].findIndex((f) => !has(f)))]}</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && input === 'contract' && <div className="eq-contract" role="group" aria-label={IQ_DESK.title}>
        <b>{IQ_DESK.title}</b>
        {IQ_DESK.notes.map((n) => <p key={n} className="eq-note">{n}</p>)}
        <div className="eq-row">
          <button type="button" className="shop-btn main" onClick={() => { onContract(true); onClose(); }}>{IQ_DESK.yes}</button>
          <button type="button" className="shop-btn" onClick={() => { onContract(false); onClose(); }}>{IQ_DESK.no}</button>
        </div>
      </div>}
      <footer className="village-dialogue-actions">
        {IQ_LOG.some((q) => has(q.f)) && <button type="button" className="shop-btn" aria-pressed={log} onClick={() => setLog(!log)}>{log ? '돌아가기' : '낡은 공연 기록'}</button>}
        {!log && mode === 'read' && <button type="button" className="shop-btn main" onClick={next}>{at + 1 < lines.length || after ? '다음' : '닫기'}</button>}
        {(log || mode !== 'read') && <button type="button" className="shop-btn" onClick={onClose}>닫기</button>}
      </footer>
    </section>
  </>;
}
