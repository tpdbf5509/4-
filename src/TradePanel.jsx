import { useEffect, useRef, useState } from 'react';
import { weaponName, POTION_BY_ID } from './game/shop.js';
import { MATERIALS } from './game/itemData.js';
import { armorName } from './game/armorData.js';
import { TRADE } from './game/tradeData.js';
import { tradeError } from './useTrade.js';

const label = (x) => x.k === 'w' ? weaponName(x.item) : x.k === 'a' ? armorName(x.item.s, x.item.g)
  : x.k === 'p' ? POTION_BY_ID[x.u]?.name || x.u : x.k === 'm' ? MATERIALS.find((m) => m.id === x.u)?.name || x.u
    : x.k === 'wp' ? '워프권' : '하락 방지권';
const identity = (x) => `${x.k}:${x.u || ''}`;
export default function TradePanel({ api, self }) {
  const t = api.trade;
  if (!t) return api.error ? <div className="rpg-talk trade-toast" role="status"><span className="rpg-talk-line">{api.error}</span></div> : null;
  return <TradeDialog key={`${t.id}/${t.revision}`} api={api} self={self} />;
}
function TradeDialog({ api, self }) {
  const t = api.trade, mine = t.offers[t.side];
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keys = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!api.busy) api.cancel(); }
    if (e.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus(); }
  };
  const [coins, setCoins] = useState(String(mine.coins)), [items, setItems] = useState(mine.items);
  const [selected, setSelected] = useState(''), [count, setCount] = useState('1');
  const other = t.side === 0 ? t.b : t.a;
  const theirs = t.offers[1 - t.side];
  const b = self?.bag;
  const choices = b ? [
    ...b.w.filter((w) => w.u !== b.e).map((w) => ({ k: 'w', u: String(w.u), item: w })),
    ...b.a.filter((a) => !Object.values(b.ae || {}).includes(a.u)).map((a) => ({ k: 'a', u: String(a.u), item: a })),
    ...Object.entries(b.p).filter(([, n]) => n > 0).map(([u, max]) => ({ k: 'p', u, max })),
    ...Object.entries(b.m).filter(([, n]) => n > 0).map(([u, max]) => ({ k: 'm', u, max })),
    ...(b.wp ? [{ k: 'wp', u: '', max: b.wp }] : []), ...(b.gd ? [{ k: 'gd', u: '', max: b.gd }] : []),
  ] : [];
  const changed = Number(coins) !== mine.coins || JSON.stringify(items) !== JSON.stringify(mine.items);
  const validCoins = /^\d{1,12}$/.test(coins) && Number(coins) <= (self?.coins || 0);
  const add = () => {
    const x = choices.find((c) => identity(c) === selected);
    if (!x || items.length >= TRADE.maxItems || items.some((i) => identity(i) === selected)) return;
    if (x.max && (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > x.max)) return;
    setItems([...items, x.max ? { k: x.k, u: x.u, n: Number(count) } : { k: x.k, u: x.u, item: x.item }]);
  };
  const offered = (o) => <><p className="shop-price">{o.coins.toLocaleString('ko-KR')}코인</p>{o.items.length ? <ul className="trade-items">{o.items.map((x) => <li className="shop-item" key={identity(x)}><span className="shop-name">{label(x)}{x.n ? ` × ${x.n}` : ''}</span></li>)}</ul> : <p className="shop-empty">물품 없음</p>}</>;
  return <>
    <div className="rpg-menu-back" />
    <section ref={dialog} tabIndex={-1} onKeyDown={keys} className="shop trade-panel" role="dialog" aria-modal="true" aria-label="개인 거래">
      <header className="shop-top"><div className="shop-title"><b>개인 거래</b><span>{other}님과 교환합니다</span></div><button type="button" className="shop-btn" disabled={api.busy} onClick={api.cancel}>거래 취소</button></header>
      <div className="shop-body">
      {t.state === 'invite' ? <>
        <p className="shop-note">{t.side === 0 ? '상대의 수락을 기다리고 있습니다.' : `${other}님이 거래를 신청했습니다.`}</p>
        {t.side === 1 && <button type="button" className="shop-btn main" disabled={api.busy} onClick={api.join}>수락</button>}
      </> : <>
        <p className="shop-note">물품과 코인을 등록한 뒤 확인해 주세요. 거래 중에는 이동과 가방 변경이 잠깁니다.</p>
        <div className="trade-columns">
          <section><h3 className="shop-h">내가 주는 것 {t.accepted[t.side] ? '· 확인함' : ''}</h3>
            <label className="shop-bet trade-field">코인<input aria-label="거래 코인" inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} disabled={api.busy} /></label>
            <p className="shop-note">보유 {(self?.coins || 0).toLocaleString('ko-KR')}코인</p>
            <ul className="trade-items">{items.map((x) => <li className="shop-item" key={identity(x)}><span className="shop-name">{label(x)}{x.n ? ` × ${x.n}` : ''}</span><button type="button" className="shop-btn" disabled={api.busy} aria-label={`${label(x)} 빼기`} onClick={() => setItems(items.filter((i) => identity(i) !== identity(x)))}>빼기</button></li>)}</ul>
            <label className="shop-bet trade-field">물품<select aria-label="거래 물품" value={selected} onChange={(e) => setSelected(e.target.value)} disabled={api.busy}>
              <option value="">물품 선택</option>{choices.filter((x) => !items.some((i) => identity(i) === identity(x))).map((x) => <option key={identity(x)} value={identity(x)}>{label(x)}{x.max ? ` (${x.max}개)` : ''}</option>)}
            </select></label>
            <label className="shop-bet trade-field">개수<input aria-label="거래 물품 개수" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} disabled={api.busy} /></label>
            <button type="button" className="shop-btn" disabled={api.busy || !selected || items.length >= TRADE.maxItems} onClick={add}>물품 추가</button>
            <button type="button" className="shop-btn" disabled={api.busy || !changed || !validCoins} onClick={() => api.change({ coins: Number(coins), items })}>등록 내용 반영</button>
          </section>
          <section><h3 className="shop-h">상대가 주는 것 {t.accepted[1 - t.side] ? '· 확인함' : ''}</h3>{offered(theirs)}</section>
        </div>
        <p className="shop-note">내용이 바뀌면 양쪽 확인이 풀립니다. 가방이 가득 차면 거래가 취소됩니다.</p>
        <button type="button" className="shop-btn main" disabled={api.busy || changed || t.accepted[t.side]} onClick={api.confirm}>{api.busy ? '확인 중…' : t.accepted[t.side] ? '상대 확인을 기다리는 중' : '내용 확인 · 거래 확정'}</button>
      </>}
      {api.error && <p className="shop-why solo" role="alert">{api.error}</p>}
      {t.state === 'fail' && <p className="shop-why solo" role="alert">{tradeError(t)}</p>}
      </div>
    </section>
  </>;
}
