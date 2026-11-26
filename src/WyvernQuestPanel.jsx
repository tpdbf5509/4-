import { useEffect, useRef, useState } from 'react';
import { wqSpotById, wqSpotIndex, wqHas, wqView, wqStep, wqLock, wqCond } from './game/wyvernQuest.js';
import { WQ_LOG, WQ_DESK, WQ_TRIAL, WQ_LOOKS, WQ_LOOK_NAMES, WQ_FOUND, WQ_NAME, AQ_LOG, AQ_LOOKS, AQ_LOOK_NAMES, AQ_LINE, AQ_TITLE } from './game/wyvernQuestData.js';
import sfx from './game/sfx.js';

/* Wyvern Knight 006 획득 루트 조사 창 — 마술사 루트 조사 창과 같은 마을 대화 틀(.shop.village-panel.eq-panel)을 쓴다.
   대사를 보여 주고, 자리마다 입력(고르기 · 들어가기)을 받아 서버에 보낸다(onAct → 입력 kind "wq").
   판정은 서버가 하고 결과는 영웅 줄 66(wqView R = [자리 차례, 결과, 번호])로 돌아온다. 1 됨 · 2 틀림 · 3 잠김 · 4 한 단계 · 5 더 알아봄 · 6 이미 함.
   「옛 날개의 기록」은 본 것만 보여 준다(정답 · 다음 목표는 적지 않는다) */
const split = (l) => { const i = l.indexOf('|'); return i >= 0 && i < 12 ? [l.slice(0, i), l.slice(i + 1)] : ['', l]; };
const NONE = ['|아직 할 수 있는 일이 없다.'];

export default function WyvernQuestPanel({ spotId, getHero, tick, onAct, onContract, onClose }) {
  const s = wqSpotById(spotId), a = s.act, k = a.k, si = wqSpotIndex(spotId);
  const box = useRef(null);
  const [lines, setLines] = useState([]);
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState('read');          // read · input · wait
  const [after, setAfter] = useState(null);
  const [note, setNote] = useState('');
  const [log, setLog] = useState(false);
  const waitN = useRef(-1), pend = useRef(null);
  const h0 = () => getHero();
  const has = (n) => wqHas(h0(), n);
  const read = (ls, next) => { setNote(''); setLines(ls); setAt(0); setMode(ls.length ? 'read' : next ? 'input' : 'read'); setAfter(() => next || null); if (!ls.length && !next) onClose(); };
  const send = (val, then) => { waitN.current = (wqView(h0())?.R?.[2] ?? -1); setMode('wait'); pend.current = then || null; onAct(spotId, val); };

  // 잠든 신전 세 곳 — 이번에 처음 보는 곳이면 대사 끝에 진행(n/3)이나 다음 단계 안내를 붙인다
  const lookTail = (flag) => {
    if (AQ_LOOKS.includes(flag) && !has(flag)) {                     // 귀환로의 흔적 셋(아르카디온 획득)
      const n = AQ_LOOKS.filter(has).length + 1;
      return n >= AQ_LOOKS.length ? ['|세 흔적을 모두 살폈다. 쓰러진 표지석을 읽을 수 있다.'] : [`|조사한 곳 ${n}/${AQ_LOOKS.length} — ${AQ_LOOK_NAMES}`];
    }
    if (!WQ_LOOKS.includes(flag) || has(flag)) return [];
    const n = WQ_LOOKS.filter(has).length + 1;
    return n >= WQ_LOOKS.length ? WQ_FOUND : [`|조사한 곳 ${n}/${WQ_LOOKS.length} — ${WQ_LOOK_NAMES}`];
  };
  function stepNext(pre = []) {
    const st = wqStep(h0(), a);
    if (!st) return read([...pre, ...(a.done || [])]);
    return read([...pre, ...(st.lines || [])], st.k);
  }
  useEffect(() => {
    const h = h0();
    if (a.tr && wqView(h)?.tr) { onAct(spotId); return onClose(); }   // 귀환로 시련 중 — 표식 지시 · 붙들기 · 잠그기는 바로 보낸다
    if (a.need && k !== 'gate' && !wqCond(h, a.need)) return read(wqLock(a));
    if (k === 'aqDoor') return read(['|바위벽에 숨어 있던 돌문이 열려 있다. 붉은 선이 문틈 안으로 이어진다.', `${WQ_NAME}|따라와.`], 'aqIn');
    if (k === 'anchor') {
      if (has(`a_lock${a.n + 1}`)) return read(['|고정쇠가 단단히 잠겨 돌판을 붙들고 있다.']);
      if (a.n > 0 && !has(`a_lock${a.n}`)) return read([`|돌판이 흔들린다. ${a.n}번 고정쇠부터 잠가야 한다.`]);
      return read(['|돌판 아래 고정쇠가 풀려 있다. 옛 기사의 잔영이 돌판 위를 서성인다.', '|잔영이 내려찍을 자리가 붉은 원으로 보이면, 아스라를 다른 표식으로 부른다(표식 앞에서 상호작용).', '|빗나간 뒤 4초 안에 고정쇠를 잠근다. 끝 돌판은 기울어지니 아스라에게 붙들게 한 뒤 잠근다.'], 'aqTrial');
    }
    if (k === 'home') {
      if (has('a_return')) return read(AQ_LINE.back);
      return read([`|귀환로 머리. 바깥 발판 끝에서 ${WQ_NAME}가 이쪽을 보고 있다.`], 'aqHome');
    }
    if (k === 'sword') {
      if (has('a_got')) return read(['|검을 뽑아낸 자리에 두 줄 홈만 남았다.']);
      if (!has('a_return')) return read(['|끝 돌판 아래 검날이 박혀 돌판을 받치고 있다. 검날이 팽팽하게 떨린다.', '|지금 뽑으면 돌판이 무너진다. 길을 먼저 고정해야 한다.']);
      return read(['|장력이 풀린 검날이 조용하다. 손잡이에 붉은 천이 감겨 있다.'], 'aqSword');
    }
    if (k === 'talk') { const tail = lookTail(a.set); onAct(spotId); return read([...a.lines, ...tail]); }
    if (k === 'steps') return stepNext(a.intro || []);
    if (k === 'gate') {
      if (!wqCond(h, a.need)) return read(wqLock(a));
      if (a.first) { onAct(spotId, 0); return read(a.first, 'go'); }
      onAct(spotId, 1); return onClose();
    }
    if (k === 'rock') {
      if (has('passage_open')) return read(['|가운데 바위 아래 돌 틈에서 바깥으로 바람이 빠져나온다. 몸을 옆으로 돌리면 들어갈 수 있다.'], 'rockGo');
      if (!has('book_read')) return read(['|다른 바위보다 조금 깨끗한 바위다. 틈에서 종처럼 울리는 바람 소리가 난다.', '|그냥 산바람이겠지.']);
      return read(['|멀리서는 양옆 바위와 비슷해 보였다. 가까이서 보니 이끼가 없다.', '|바위 아래 돌 틈만 먼지가 쓸려 나가 깨끗하다. 종처럼 울리는 바람 소리가 들린다.'], 'rock');
    }
    if (k === 'door') {
      if (!has('threshold_found')) { onAct(spotId); return read(['|자갈이 쌓여 있다.', '|그냥 비탈의 바위벽이다.']); }
      if (!has('temple_open')) return read(['|계단의 방향과 맞닿는 곳에 금속 경첩이 보인다.', '|경첩 위로 눈이 두껍게 쌓인 돌판이 벽처럼 서 있다.'], 'door');
      return read(['|눈 쌓인 돌문이 열려 있다. 안쪽에서 따뜻한 바람이 새어 나온다.'], 'enter');
    }
    if (k === 'altar') {
      if (has('awakened')) return read(['|제단 홈에 석등이 걸려 있다. 불씨가 와이번의 숨결 곁에서 타고 있다.']);
      if (has('ember_got')) return read(['|제단 홈에 손잡이 달린 석등이 꼭 맞을 것 같다.', '|「큰 용이 남긴 불은 오래 식지 않는다. 그 불을 숨 곁에 두어라.」'], 'altar');
      const tail = lookTail('look_altar');
      onAct(spotId);
      return read([...['|제단 가운데 구슬 같은 것이 빠진 둥근 홈이 있다. 손잡이를 걸던 쇠고리도 남았다.', '|글이 새겨져 있다. 「큰 용이 남긴 불은 오래 식지 않는다. 그 불을 숨 곁에 두어라.」'], ...tail]);
    }
    if (k === 'trial') {
      if (wqView(h)?.tr) { onAct(spotId); return onClose(); }
      if (has(`trial_${a.id}`)) return read([...a.lines, '|이미 지난 시련이다. 문이 열려 있다.']);
      return read([...a.lines, '|레벨 · 장비 · 직업은 시련에 영향을 주지 않는다. 쓰러지지 않고, 실패하면 그 구간만 다시 한다.'], 'trial');
    }
    if (k === 'duel') return read(['|성에가 다 떨어졌다. 와이번이 앞발을 디디고 머리를 든다.', `와이번|그 불을 들고 여기까지 왔나. 그럼 내 앞에서 버텨 봐라.`, '와이번|내 날개가 어디를 향하는지 네 눈으로 보면서.'], 'duel');
    if (k === 'desk') return has('claimed') ? read(['|와이번이 날개 아래 자리를 비워 둔다. 서약은 이미 나눴다.']) : read(WQ_DESK.intro, 'contract');
    return read(NONE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 서버 결과를 기다린다
  useEffect(() => {
    if (mode !== 'wait') return;
    const R = wqView(h0())?.R;
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
  const st = k === 'steps' ? wqStep(h, a) : null;
  const pickStep = (i) => send(i, (c) => {
    if (c === 1) return stepNext(st.ok || []);
    if (c === 5) return read(st.opts[i].info || NONE, 'pick');
    setNote((st.badBy && st.badBy[i]) || st.bad || '그건 아닌 것 같다.'); setMode('input'); setAfter(() => 'pick');
  });
  // 고르기 단추 — 컴포넌트로 두면 손님 화면이 스냅샷마다(초당 20번) 새로 그려 누르는 사이 단추가 바뀌어 클릭이 사라진다(11월 25일)
  const choice = (items) => <div className="story-picks" role="group" aria-label={s.name}>
    {items.map(([t, fn]) => <button type="button" key={t} className="story-pick" onClick={fn}>{t}</button>)}
  </div>;
  // 아르카디온 획득 — 지금 단계 한 줄
  const aqNote = () => has('a_got') ? '아르카디온을 얻었다' : has('a_return') ? '검날의 장력이 풀렸다' : has('a_lock3') ? '귀환 지점에서 아스라를 부르자'
    : has('a_latch') ? `고정쇠 ${[1, 2, 3].filter((i) => has(`a_lock${i}`)).length}/3` : has('a_stone') ? '위쪽 표식 · 아래쪽 걸쇠'
    : has('a_start') ? `흔적 ${AQ_LOOKS.filter(has).length}/${AQ_LOOKS.length}` : AQ_TITLE;
  void tick;
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className="shop village-panel eq-panel nq-panel wq-panel" role="dialog" aria-modal="true" aria-labelledby="wq-dialog-title" ref={box} tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); else if ((e.key === 'Enter' || e.key === ' ') && mode === 'read' && !log) { e.preventDefault(); next(); } }}>
      <header className="shop-top">
        <div className="shop-title"><b id="wq-dialog-title">{s.name}</b><span>{s.id.startsWith('ra-') || s.id === 'br-door' ? aqNote() : has('ember_got') && !has('awakened') ? '용심 불씨를 지녔다' : has('wyvern_found') && !has('ember_got') ? '다음 — 와이번을 깨울 불씨' : s.map === 'wq_sanctum' && !has('wyvern_found') ? `조사 ${WQ_LOOKS.filter(has).length}/${WQ_LOOKS.length}` : '조사'}</span></div>
        <button type="button" className="shop-x" aria-label="창 닫기" onClick={onClose}>×</button>
      </header>
      {log && <div className="story-log" role="region" aria-label="옛 날개의 기록">
        {WQ_LOG.filter((q) => has(q.f)).map((q) => <p key={q.f}>{q.t}</p>)}
        {AQ_LOG.some((q) => has(q.f)) && <p><b>「{AQ_TITLE}」</b></p>}
        {AQ_LOG.filter((q) => has(q.f)).map((q) => <p key={q.f}>{q.t}</p>)}
        {![...WQ_LOG, ...AQ_LOG].some((q) => has(q.f)) && <p>아직 적어 둔 것이 없다.</p>}
      </div>}
      {!log && mode === 'read' && line && (
        <button type="button" className={`village-dialogue-line${line[0] ? '' : ' nar'}`} onClick={next} aria-label="대사 넘기기">
          {line[0] && <b className="eq-who">{line[0]}</b>}{line[1]}<span className="village-dialogue-cue" aria-hidden="true">▾</span>
        </button>
      )}
      {!log && mode === 'wait' && <div className="village-dialogue-line nar" aria-live="polite">…</div>}
      {!log && input === 'pick' && st && <div className="story-picks" role="group" aria-label={st.q || '고르기'}>
        {st.q && <p className="eq-q">{st.q}</p>}
        {st.opts.map((o, i) => <button type="button" key={i} className="story-pick" onClick={() => pickStep(i)}>{typeof o === 'string' ? o : o.t}</button>)}
        {note && <p className="eq-note">{note}</p>}
      </div>}
      {!log && input === 'rock' && choice([
        ['틈에 손을 대 본다', () => send(0, () => read(['|손바닥에 차가운 바람이 닿는다.', '|들어오는 바람이 아니라 바깥으로 나가는 바람이다. 안쪽 어딘가가 뚫려 있다.'], 'rock'))],
        ['돌 틈을 따라 들어간다', () => send(1, (c) => (c === 1 ? onClose() : read(['|틈은 어두워 어디로 이어지는지 알 수 없다. 바람이 어느 쪽으로 부는지 먼저 느껴 보자.'], 'rock')))],
        ['그만둔다', onClose]])}
      {!log && input === 'rockGo' && choice([['돌 틈으로 들어간다', () => { onAct(spotId, 1); onClose(); }], ['그만둔다', onClose]])}
      {!log && input === 'door' && choice([['눈 쌓인 돌문을 당긴다', () => send(0, () => read(['|경첩이 끼익 돌며 눈이 쏟아진다. 벽처럼 서 있던 돌판이 문처럼 열린다.', '|안쪽에 다리가 놓인 깊은 골짜기가 보인다.'], 'enter'))], ['그만둔다', onClose]])}
      {!log && input === 'enter' && choice([
        ['들어가기', () => { onAct(spotId, 1); onClose(); }],
        ...(has('wyvern_found') ? [['최종 신전으로 곧장 간다', () => { onAct(spotId, 2); onClose(); }]] : []),
        ['그만둔다', onClose]])}
      {!log && input === 'altar' && choice([['불씨를 숨결 가까이에 둔다', () => send(0, () => read(['|석등을 제단 홈에 건다. 불씨가 와이번의 숨결 쪽으로 기운다.', '|성에가 바닥으로 떨어진다. 와이번이 앞발부터 일으킨다.']))], ['나중에', onClose]])}
      {!log && input === 'aqIn' && choice([['들어가기', () => { onAct(spotId, 1); onClose(); }], ['그만둔다', onClose]])}
      {!log && input === 'aqTrial' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => { onAct(spotId); onClose(); }}>시련 시작 — 끊어진 귀환로</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && input === 'aqHome' && choice([[`${WQ_NAME}를 부른다`, () => { onAct(spotId); onClose(); }], ['나중에', onClose]])}
      {!log && input === 'aqSword' && choice([['아르카디온을 뽑는다', () => send(0, (c) => (c === 1 ? read(['|아르카디온을 뽑았다. 무기 가방에 넣었다.', `${WQ_NAME}|그 검은 이제 네 길을 버틸 거다.`])
        : c === 7 ? read([`|${AQ_LINE.full}`], 'aqSword') : c === 8 ? read(['|이미 지닌 아르카디온이 검날과 같은 결로 울린다. 기록을 마쳤다.']) : read([])))], ['나중에', onClose]])}
      {!log && input === 'go' && <div className="eq-row eq-end"><button type="button" className="shop-btn main" onClick={() => { onAct(spotId, 1); onClose(); }}>들어가기</button></div>}
      {!log && input === 'trial' && <div className="eq-row eq-end">
        <button type="button" className="shop-btn main" onClick={() => { onAct(spotId); onClose(); }}>시련 시작 — {WQ_TRIAL.names[a.id]}</button>
        <button type="button" className="shop-btn" onClick={onClose}>나중에</button>
      </div>}
      {!log && input === 'duel' && choice([['결투를 받아들인다', () => { onAct(spotId, 1); onClose(); }], ['준비하고 돌아온다', () => { onAct(spotId, 0); onClose(); }]])}
      {!log && input === 'contract' && <div className="eq-contract" role="group" aria-label={WQ_DESK.title}>
        <b>{WQ_DESK.title}</b>
        {WQ_DESK.notes.map((n) => <p key={n} className="eq-note">{n}</p>)}
        <div className="eq-row">
          <button type="button" className="shop-btn main" onClick={() => { onContract(true); onClose(); }}>{WQ_DESK.yes}</button>
          <button type="button" className="shop-btn" onClick={() => { onContract(false); onClose(); }}>{WQ_DESK.no}</button>
        </div>
      </div>}
      <footer className="village-dialogue-actions">
        {[...WQ_LOG, ...AQ_LOG].some((q) => has(q.f)) && <button type="button" className="shop-btn" aria-pressed={log} onClick={() => setLog(!log)}>{log ? '돌아가기' : '옛 날개의 기록'}</button>}
        {!log && mode === 'read' && <button type="button" className="shop-btn main" onClick={next}>{at + 1 < lines.length || after ? '다음' : '닫기'}</button>}
        {(log || mode !== 'read') && <button type="button" className="shop-btn" onClick={onClose}>닫기</button>}
      </footer>
    </section>
  </>;
}
