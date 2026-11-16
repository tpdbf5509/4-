import {useEffect, useRef, useState} from 'react';
import {LIB_ART, LIB_TABS, LIB_BOOKS, LIB_LOOKS, shelfRows, libBookOpen, libLockWhy} from './game/libraryBooks.js';
import sfx from './game/sfx.js';

/* 에르덴 도서관 책장 → 펼친 책(11월 16일, 사용자 기획). 상점 틀(.shop)과 금빛 강조를 그대로 쓰고 게임 화면 가운데에 연다.
   책장: 탭 셋 · 책등 위에 마우스를 올리면 앞으로 나오고, 누르면 아래에 제목 · 저자 · 읽기.
   책: 공용 펼친 책 그림(LIB_ART.open) 위에 본문을 글자로 놓는다. 넓은 화면은 두 쪽, 좁으면 한 쪽씩. Esc 로 책을 닫으면 고른 책으로 돌아온다. */
const NARROW = 720;   // 이보다 좁으면 한 쪽씩
const useNarrow = () => {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.innerWidth < NARROW);
  useEffect(() => {
    const on = () => setN(window.innerWidth < NARROW);
    window.addEventListener('resize', on); return () => window.removeEventListener('resize', on);
  }, []);
  return n;
};
const play = (s) => { try { sfx.play(s); } catch { /* 소리를 못 내도 괜찮다 */ } };

function Block({b}) {
  if (typeof b === 'string') return <p>{b}</p>;
  if (b.say) return <p className="lib-say">{b.say}</p>;
  if (b.hand) return <p className="lib-hand">{b.hand}</p>;
  if (b.end) return <p className="lib-end">{b.end}</p>;
  if (b.check) return <p className="lib-check"><i aria-hidden="true">✓</i><span>{b.check[0]}</span><em>{b.check[1]}</em></p>;
  if (b.scrape) return <span className="lib-scrape" aria-label="긁어낸 자국">{Array.from({length: b.scrape}, (_, k) => <i key={k}/>)}</span>;
  if (b.ill) return <img className={`lib-ill ${b.ill}`} src={LIB_ART.ill[b.ill]} alt="" onError={(e) => { e.currentTarget.hidden = true; }}/>;
  return null;
}

function Reader({book, onClose}) {
  const narrow = useNarrow();
  const [pg, setPg] = useState(0);
  const pages = book.pages;
  const shown = narrow ? [pg] : [0, 1].map((k) => pg + k).filter((k) => k < pages.length);
  const step = narrow ? 1 : 2;
  const page = (k, side) => (
    <div key={k} className={`lib-page ${side}`}>
      {/* 두 쪽 보기 첫 장은 오른쪽에도 같은 높이의 빈 머리를 두어 양쪽 본문 첫 줄을 맞춘다 */}
      {(k === 0 || (!narrow && k === 1)) && <header className={`lib-page-h${k ? ' ghost' : ''}`} aria-hidden={k ? true : undefined}><b>{book.title}</b><small>{book.by}</small></header>}
      <div className="lib-text">{pages[k].map((b, i) => <Block key={i} b={b}/>)}</div>
      <span className="lib-no">{k + 1}</span>
    </div>
  );
  return (
    <div className={`lib-read lk-${book.look}${narrow ? ' one' : ''}`} role="document" aria-label={book.title}>
      <div className="lib-stage">
        <div className={`lib-book${narrow && pg % 2 ? ' r' : ''}`} style={{'--open': `url(${LIB_ART.open})`}}>
          {narrow ? page(pg, pg % 2 ? 'right' : 'left') : shown.map((k, i) => page(k, i ? 'right' : 'left'))}
        </div>
      </div>
      <div className="lib-read-nav">
        <button type="button" className="shop-btn" disabled={pg === 0} onClick={() => { setPg(Math.max(0, pg - step)); play('page'); }} aria-label="앞 쪽">◀</button>
        <span>{shown.map((k) => k + 1).join(' · ')} / {pages.length}</span>
        <button type="button" className="shop-btn" disabled={pg + step >= pages.length} onClick={() => { setPg(pg + step); play('page'); }} aria-label="다음 쪽">▶</button>
        <button type="button" className="shop-btn main" onClick={onClose}>책 덮기</button>
      </div>
    </div>
  );
}

export default function LibraryPanel({tab0 = 'village', story, admin, onClose}) {
  const [tab, setTab] = useState(tab0);
  const [pick, setPick] = useState(null);      // 고른 책 id — 아래에 제목 · 저자 · 읽기
  const [reading, setReading] = useState(null);
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, [reading]);
  const book = LIB_BOOKS.find((b) => b.id === pick);
  const open = book && libBookOpen(book, story, admin);
  const read = () => { if (!open) return; setReading(book.id); play('page'); };
  // 키는 창 어디에 초점이 있든 받는다(쪽 넘김 단추가 비활성이 되며 초점을 잃어도). Esc 는 책 → 책장 → 닫기 차례이고, 게임 쪽 Esc(창 모두 닫기)보다 먼저 잡는다
  const keyRef = useRef(null);
  useEffect(() => { keyRef.current = (e) => {
    if (e.key === 'Escape') { if (reading) setReading(null); else onClose(); return true; }
    if (reading && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      box.current?.querySelector(`.lib-read-nav button[aria-label="${e.key === 'ArrowLeft' ? '앞 쪽' : '다음 쪽'}"]`)?.click(); return true;
    }
    if (!reading && e.key === 'Enter' && book && open && !(e.target instanceof HTMLButtonElement)) { read(); return true; }
    return false;
  }; });
  useEffect(() => {
    const on = (e) => { if (keyRef.current?.(e)) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, []);
  const rows = shelfRows(tab);
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className={`shop lib-panel${reading ? ' reading' : ''}`} role="dialog" aria-modal="true" aria-label="에르덴 도서관" tabIndex={-1} ref={box} onKeyDown={(e) => e.stopPropagation()}>
      <header className="shop-top">
        <div className="shop-title"><b>에르덴 도서관</b><span>{reading ? 'Esc 로 책을 덮고 책장으로 돌아갑니다' : '책등을 골라 꺼냅니다'}</span></div>
        <button type="button" className="shop-x" aria-label="도서관 닫기" onClick={onClose}>×</button>
      </header>
      {reading ? <Reader key={reading} book={LIB_BOOKS.find((b) => b.id === reading)} onClose={() => setReading(null)}/> : <div className="shop-body lib-body">
        <div className="shop-tabs" role="tablist">
          {LIB_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); setPick(null); }}>
              {t.name}<small>{LIB_BOOKS.filter((b) => b.tab === t.id).length}</small>
            </button>
          ))}
        </div>
        <div className="lib-shelf">
          {rows.map((row, r) => (
            <div key={`${tab}-${r}`} className="lib-row">
              {row.map((s, k) => {
                if (s.fill) return <i key={k} className={`lib-spine fill${s.band ? ' band' : ''}`} style={{'--c': s.c, width: s.w, height: s.h}} aria-hidden="true">{s.m && <em>{s.m}</em>}</i>;
                const b = s.book, L = LIB_LOOKS[b.look], ok = libBookOpen(b, story, admin);
                return (
                  <button key={k} type="button" className={`lib-spine book lk-${b.look}${pick === b.id ? ' on' : ''}${ok ? '' : ' locked'}`}
                    style={{'--c': L.spine, '--band': L.band}} aria-pressed={pick === b.id} aria-label={ok ? b.title : `잠긴 책 · ${b.title}`}
                    onClick={() => { setPick(b.id); play('page'); }} onDoubleClick={() => { if (ok) { setPick(b.id); setReading(b.id); } }}>
                    <em aria-hidden="true">{L.mark}</em><span>{b.spine}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="lib-pick" aria-live="polite">
          {book ? <>
            <div><b>{book.title}</b><span>{open ? book.by : libLockWhy(book)}</span></div>
            <button type="button" className="shop-btn main" disabled={!open} onClick={read}>읽기</button>
          </> : <span className="lib-hint">빛나는 책등만 꺼낼 수 있습니다. 책등에 마우스를 올려 보세요.</span>}
        </div>
      </div>}
    </section>
  </>;
}
