import { useEffect, useRef, useState } from 'react';
import { eqSpotById, eqSpotIndex, eqHas, eqView, eqDollParts, eqTravelOpen, eqRecCount } from './game/engineerQuest.js';
import { EQ_TRAVEL, EQ_CONTRACT, EQ_TRIAL, EQ_REC, EQ_REC_NAMES } from './game/engineerQuestData.js';
import { ENGINEER_NAME } from './game/engineerData.js';
import sfx from './game/sfx.js';

/* Engineer 003 획득 루트 조사 창 — 기존 마을 대화 틀(.shop.village-panel)을 쓴다.
   대사를 보여 주고, 자리마다 퍼즐 입력(숫자판 · 고르기 · 차례 · 다이얼)을 받아 서버에 보낸다(onAct → 입력 kind "eq").
   판정은 서버가 하고, 결과는 영웅 줄 60(eqView R = [자리 차례, 결과, 번호])으로 돌아온다. 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 힌트 · 6 이미 함 */
const split = (l) => { const i = l.indexOf('|'); return i > 0 && i < 12 ? [l.slice(0, i), l.slice(i + 1)] : ['', l]; };
const DOLL_FIRST = ['가슴 판에 「003」이 새겨진 정비 자동인형이 쓰러져 있다.', '동력 전지 · 기억 장치 · 관절 · 제어 회로가 빠져 있다.', '조립대 옆 기록에 고치는 방법이 남아 있을지 모른다.'];
const DOLL_UP = ['003|…동력 확인. 기억 장치 연결. 관절 정상.', '003|당신이 저를 깨웠습니까?', '003|저는 정비 자동인형 003. 관리자의 귀환을 기다리고 있었습니다.',
  '003|벽의 정비망 지도를 읽을 수 있게 되었습니다. 흩어진 설계 기록 여섯을 모으면 숨겨진 도시로 갈 수 있습니다.', '자동인형 003 이 곁을 따라오기 시작했다.'];
const CODE_HINT = '희미한 기억이 떠오른다 — 숫자는 작업 순서표대로 읽는다. 장인이 모이고 → 동력이 돌고 → 톱날이 움직이고 → 작업이 끝난다.';
const TRIAL_INTRO = ['중앙 단말기|관리자 후보를 확인했습니다.', '중앙 단말기|최종 병기 시험 — 제어 장치 방어 · E-003 제압 · 과부하 제어.', `중앙 단말기|시험 동안 ${ENGINEER_NAME} 의 기술을 빌려드립니다. 레벨과 장비는 영향을 주지 않습니다.`];

export default function EngineerQuestPanel({ spotId, getHero, tick, onAct, onTravel, onContract, onCmd, onVillage, onClose }) {
  const s = eqSpotById(spotId), a = s.act, k = a.k, si = eqSpotIndex(spotId);
  const h = getHero(), v0 = eqView(h);
  const box = useRef(null);
  const [lines, setLines] = useState([]);
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState('read');          // read · input · wait · end
  const [after, setAfter] = useState(null);          // 대사를 다 읽으면 할 일
  const [code, setCode] = useState('');
  const [sel, setSel] = useState([]);
  const [dials, setDials] = useState(() => (a.items ? a.items.map(() => 0) : []));
  const [note, setNote] = useState('');
  const waitN = useRef(-1);
  const has = (n) => eqHas(getHero(), n);
  const read = (ls, next) => { setLines(ls); setAt(0); setMode(ls.length ? 'read' : next ? 'input' : 'end'); setAfter(() => next || null); };
  const send = (val, then) => { waitN.current = (eqView(getHero())?.R?.[2] ?? -1); setMode('wait'); onAct(spotId, val); pend.current = then || null; };
  const pend = useRef(null);

  // 처음 열 때 — 자리 종류마다 무엇을 보여 줄지
  useEffect(() => {
    const need = a.need && !needOk();
    if (need) { onAct(spotId); return read(a.lock || ['아직 할 수 있는 일이 없다.']); }
    if (k === 'talk') { onAct(spotId); return read(a.lines); }
    if (k === 'ask') return read(a.intro, 'ask');
    if (k === 'code') { onAct(spotId); return has(a.set) ? read(a.done) : read([...a.intro, ...(has('hint3') ? [CODE_HINT] : [])], 'code'); }
    if (k === 'gate') {
      if (a.first && !has('metro')) return read(a.first, 'go');
      onAct(spotId); return onClose();
    }
    if (k === 'mimic') return has(a.seal) ? read(a.sealed) : read(a.intro, 'mimic');
    if (k === 'seal') return has(a.set) ? read(['이미 잠가 두었다.']) : send(undefined, (c) => read(c === 1 ? a.lines : a.idle || []));
    if (k === 'dial') return read([], 'dial');
    if (k === 'pick' || k === 'multi' || k === 'dials') return has(a.set) ? read(a.ok) : read(a.intro || [], k);
    if (k === 'order') return has(a.set) ? (a.go ? (onAct(spotId), onClose()) : read(a.ok)) : read(a.intro || [], 'order');
    if (k === 'travel') return read([], 'travel');
    if (k === 'doll') {
      if (!has('doll')) { onAct(spotId); return read(DOLL_FIRST); }
      if (has('doll3')) return read(['003|관리자님, 정비망 지도로 다음 기록을 찾으십시오.']);
      const n = eqDollParts(getHero());
      if (n < 4) return read([`부품 ${n}/4 — ${['pCell', 'pMem', 'pJoint', 'pCtrl'].filter((f) => !has(f)).map((f) => ({ pCell: '동력 전지', pMem: '기억 장치', pJoint: '관절', pCtrl: '제어 회로' })[f]).join(' · ')} 가 아직 없다.`]);
      return send(undefined, (c) => read(c === 1 ? DOLL_UP : []));
    }
    if (k === 'mount') return has(a.set) ? read(['중앙 동력핵이 힘차게 돈다.']) : send(undefined, (c) => read(c === 1 ? a.ok : [a.bad]));
    if (k === 'trial') {
      const tr = v0 && v0.tr;
      if (has('claim')) return read(['중앙 단말기|관리자 권한은 이미 계승되었습니다.']);
      if (has('won')) return read(['중앙 단말기|관리자 후보의 판단을 확인했습니다.'], 'contract');
      if (tr && tr.ph === 3 && tr.open) return read([], 'cmd');
      if (tr) return read([`중앙 단말기|시험 ${tr.ph}단계 진행 중입니다.`]);
      return read(TRIAL_INTRO, 'trial');
    }
    // check · take · record · seq — 바로 보내고 결과만
    return send(undefined, (c) => read(resultLines(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function needOk() { const need = a.need; return !need || need.every((n) => (n[0] === '!' ? !has(n.slice(1)) : has(n))); }
  function resultLines(c) {
    if (c === 1) return a.ok || a.lines || ['됐다.'];
    if (c === 2) return [a.bad || '아무 일도 일어나지 않았다.'];
    if (c === 3) return a.lock || ['아직 할 수 있는 일이 없다.'];
    if (c === 4) { const q = eqView(getHero())?.seq?.[a.g] || []; return [`딸깍 — 불이 하나 들어왔다(${q.length}/${a.n}).${a.tag ? ` 바늘을 ${a.tag} 에 맞췄다.` : ''}`]; }
    if (c === 6) return a.done || ['이미 해 두었다.'];
    return [];
  }

  // 서버 결과를 기다린다
  useEffect(() => {
    if (mode !== 'wait') return;
    const R = eqView(getHero())?.R;
    if (!R || R[2] === waitN.current || R[0] !== si) return;
    const c = R[1], f = pend.current; pend.current = null;
    if (c === 1) sfx.play('eqBeep');
    if (f) f(c); else read(resultLines(c));
  });
  useEffect(() => { box.current?.focus(); }, [mode, at]);

  const next = () => {
    if (mode !== 'read') return;
    if (at + 1 < lines.length) return setAt(at + 1);
    if (after) { setMode('input'); return; }
    onClose();
  };
  const line = lines[at] ? split(lines[at]) : null;
  const tail = (ls) => read(ls);
  const choose = (i) => {               // ask · pick · mimic
    if (k === 'ask') { const o = a.opts[i]; onAct(spotId, i); return tail(o.lines); }
    if (k === 'mimic') {
      if (i === 0) { send(0, () => read(['보관함이 이빨을 드러내며 덮쳐 온다! 바닥의 붉은 원을 피해 물러나자.'])); return; }
      if (i === 1) return tail(['천천히 뒤로 물러났다. 굳이 열어 볼 필요는 없다.']);
      return send(2, () => read(a.poke));
    }
    send(i, (c) => read(resultLines(c)));
  };

  const input = mode === 'input' ? after : null;
  const travelList = EQ_TRAVEL.map((t) => ({ ...t, open: eqTravelOpen(getHero(), t), got: has(t.rec) }));
  const trialNow = eqView(getHero())?.tr;
  void tick;
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className="shop village-panel eq-panel" role="dialog" aria-modal="true" aria-labelledby="eq-dialog-title" ref={box} tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); else if ((e.key === 'Enter' || e.key === ' ') && mode === 'read') { e.preventDefault(); next(); } }}>
      <header className="shop-top">
        <div className="shop-title"><b id="eq-dialog-title">{s.name}</b><span>{EQ_REC.some((r) => has(r)) ? `설계 기록 ${eqRecCount(getHero())}/6` : '조사'}</span></div>
        <button type="button" className="shop-x" aria-label="창 닫기" onClick={onClose}>×</button>
      </header>
      {mode === 'read' && line && (
        <button type="button" className={`village-dialogue-line${line[0] ? '' : ' nar'}`} onClick={next} aria-label="대사 넘기기">
          {line[0] && <b className="eq-who">{line[0]}</b>}{line[1]}<span className="village-dialogue-cue" aria-hidden="true">▾</span>
        </button>
      )}
      {mode === 'wait' && <div className="village-dialogue-line nar" aria-live="polite">…</div>}
      {input === 'ask' && <div className="story-picks" role="group" aria-label="물어보기">
        {a.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => choose(i)}>{o.t}</button>)}
        {s.npc && onVillage && <button type="button" className="story-pick" onClick={onVillage}><em>다른 이야기를 한다</em></button>}
      </div>}
      {(input === 'pick' || input === 'mimic') && <div className="story-picks" role="group" aria-label={a.q || '고르기'}>
        {a.q && <p className="eq-q">{a.q}</p>}
        {a.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => choose(i)}>{o}</button>)}
      </div>}
      {input === 'code' && <div className="eq-pad" role="group" aria-label="네 자리 숫자판">
        <output className="eq-code">{(code + '____').slice(0, a.len).split('').join(' ')}</output>
        <div className="eq-keys">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => <button type="button" key={d} className="shop-btn" disabled={code.length >= a.len} onClick={() => setCode(code + d)}>{d}</button>)}
          <button type="button" className="shop-btn" onClick={() => setCode('')}>지움</button>
          <button type="button" className="shop-btn main" disabled={code.length !== a.len} onClick={() => send(code, (c) => { setCode(''); if (c === 1) read(a.ok); else { setNote(c === 5 ? CODE_HINT : a.bad); setMode('input'); setAfter(() => 'code'); } })}>입력</button>
        </div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {input === 'dial' && <div className="story-picks" role="group" aria-label={s.name}>
        <p className="eq-q">{a.note || '값을 고른다.'} 지금 {getHero().bag.eu?.d?.[a.key] ?? '—'}{a.unit}</p>
        <div className="eq-row">{a.opts.map((o) => <button type="button" key={o} className={`shop-btn${getHero().bag.eu?.d?.[a.key] === o ? ' main' : ''}`} onClick={() => send(o, () => read([`${s.name}를 ${o}${a.unit}에 맞췄다.`]))}>{o}{a.unit}</button>)}</div>
      </div>}
      {input === 'multi' && <div className="story-picks" role="group" aria-label={a.q}>
        <p className="eq-q">{a.q} ({sel.length}/{a.n})</p>
        <div className="eq-row">{a.opts.map((o, i) => <button type="button" key={i} aria-pressed={sel.includes(i)} className={`shop-btn${sel.includes(i) ? ' main' : ''}`} onClick={() => setSel(sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < a.n ? [...sel, i] : sel)}>{o}</button>)}</div>
        <div className="eq-row"><button type="button" className="shop-btn main" disabled={sel.length !== a.n} onClick={() => send(sel, (c) => { setSel([]); if (c === 1) read(a.ok); else { setNote(a.bad); setMode('input'); setAfter(() => 'multi'); } })}>조립하기</button></div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {input === 'order' && <div className="story-picks" role="group" aria-label="차례 정하기">
        <p className="eq-q">차례대로 고른다: {sel.map((i) => a.items[i]).join(' → ') || '—'}</p>
        <div className="eq-row">{a.items.map((o, i) => <button type="button" key={i} className="shop-btn" disabled={sel.includes(i)} onClick={() => setSel([...sel, i])}>{o}</button>)}</div>
        <div className="eq-row">
          <button type="button" className="shop-btn" onClick={() => setSel([])}>다시</button>
          <button type="button" className="shop-btn main" disabled={sel.length !== a.items.length} onClick={() => send(sel, (c) => { setSel([]); if (c === 1) read(a.ok, a.go ? 'go' : null); else { setNote(a.bad); setMode('input'); setAfter(() => 'order'); } })}>연결하기</button>
        </div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {input === 'dials' && <div className="story-picks" role="group" aria-label={a.q}>
        <p className="eq-q">{a.q}</p>
        {a.items.map((it, i) => <div className="eq-row" key={i}><span className="eq-label">{it.n}</span>
          {it.opts.map((o, j) => <button type="button" key={j} className={`shop-btn${dials[i] === j ? ' main' : ''}`} onClick={() => setDials(dials.map((x, q) => (q === i ? j : x)))}>{o}</button>)}</div>)}
        <div className="eq-row"><button type="button" className="shop-btn main" onClick={() => send(dials, (c) => { if (c === 1) read(a.ok); else { setNote(a.bad); setMode('input'); setAfter(() => 'dials'); } })}>맞추기</button></div>
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {input === 'travel' && <div className="story-picks" role="group" aria-label="정비망 지도">
        {!has('doll3') ? <p className="eq-q">{a.lock[0]}</p> : travelList.map((t) => (
          <button type="button" key={t.to} className="story-pick" disabled={!t.open} onClick={() => { onTravel(t.to); onClose(); }}>
            {t.name}<em>{t.got ? `기록 ${EQ_REC_NAMES[EQ_REC.indexOf(t.rec)]} 찾음` : t.open ? '아직 기록이 남아 있다' : '기록 다섯을 모으면 열린다'}</em>
          </button>))}
      </div>}
      {input === 'go' && <div className="eq-row eq-end"><button type="button" className="shop-btn main" onClick={() => { onAct(spotId); onClose(); }}>내려가기</button></div>}
      {input === 'trial' && <div className="eq-row eq-end"><button type="button" className="shop-btn main" onClick={() => { onAct(spotId); onClose(); }}>시험 시작</button><button type="button" className="shop-btn" onClick={onClose}>나중에</button></div>}
      {input === 'cmd' && <div className="story-picks" role="group" aria-label="최종 명령">
        <p className="eq-q">최종 명령을 차례로 넣는다. 지금 {trialNow ? trialNow.cmd : 0}/{EQ_TRIAL.last.ans.length}</p>
        <div className="eq-row">{EQ_TRIAL.last.cmd.map((c, i) => <button type="button" key={i} className="shop-btn" onClick={() => onCmd(i)}>{c}</button>)}</div>
      </div>}
      {input === 'contract' && <div className="eq-contract" role="group" aria-label={EQ_CONTRACT.title}>
        <b>{EQ_CONTRACT.title}</b>
        <p>{EQ_CONTRACT.q}</p>
        <p className="eq-note">계승하면 1차 전직은 사라지고 무기를 내려놓는다. 히든 직업은 게임 전체에서 한 명만 가질 수 있다.</p>
        <div className="eq-row">
          <button type="button" className="shop-btn main" onClick={() => { onContract(true); onClose(); }}>{EQ_CONTRACT.yes}</button>
          <button type="button" className="shop-btn" onClick={() => { onContract(false); onClose(); }}>{EQ_CONTRACT.no}</button>
        </div>
      </div>}
      <footer className="village-dialogue-actions">
        {mode === 'read' && <button type="button" className="shop-btn main" onClick={next}>{at + 1 < lines.length || after ? '다음' : '닫기'}</button>}
        {mode !== 'read' && <button type="button" className="shop-btn" onClick={onClose}>닫기</button>}
      </footer>
    </section>
  </>;
}
