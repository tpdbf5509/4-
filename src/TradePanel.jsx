import { useEffect, useRef, useState } from 'react';
import { weaponName, weaponArt, POTION_BY_ID } from './game/shop.js';
import { MATERIALS } from './game/itemData.js';
import { armorName, armorArt } from './game/armorData.js';
import { TRADE } from './game/tradeData.js';
import { tradeError } from './useTrade.js';

const label = (x) => x.k === 'w' ? weaponName(x.item) : x.k === 'a' ? armorName(x.item.s, x.item.g)
  : x.k === 'p' ? POTION_BY_ID[x.u]?.name || x.u : x.k === 'm' ? MATERIALS.find((m) => m.id === x.u)?.name || x.u
    : x.k === 'wp' ? '워프권' : '하락 방지권';
const identity = (x) => `${x.k}:${x.u || ''}`;
// 주문서·물약·재료는 Google Flow에서 생성한 그림을 받은 뒤 여기에 등록한다.
const ITEM_ART = {};
const artOf = (x) => x.k === 'w' ? weaponArt(x.item) : x.k === 'a' ? armorArt(x.item.s, x.item.g) : ITEM_ART[identity(x)];
const categories = [['scroll', '주문서'], ['item', '아이템'], ['potion', '물약']];
const category = (x) => x.k === 'p' ? 'potion' : ['wp', 'gd'].includes(x.k) ? 'scroll' : 'item';

function ItemTile({ item, selected, onClick, disabled }) {
  const [failed, setFailed] = useState(false);
  const name = label(item), src = artOf(item), amount = item.n || item.max;
  return <button type="button" className={`trade-slot${selected ? ' selected' : ''}`} disabled={disabled}
    aria-label={`${name}${amount ? ` ${amount}개` : ''}`} aria-pressed={onClick ? !!selected : undefined}
    title={name} onClick={onClick}>
    {src && !failed ? <img src={src} alt="" draggable={false} onError={() => setFailed(true)} /> : <span className="trade-slot-name">{name}</span>}
    {amount > 0 && <small className="trade-slot-count">{amount}</small>}
    {item.item?.up > 0 && <small className="trade-slot-up">+{item.item.up}</small>}
  </button>;
}
function SlotGrid({ items, onChoose, selected, busy, name, minimum = 9 }) {
  return <div className="trade-grid" role="group" aria-label={name}>
    {Array.from({ length: Math.max(minimum, items.length) }, (_, i) => items[i]
      ? <ItemTile key={identity(items[i])} item={items[i]} selected={selected === identity(items[i])}
          disabled={busy || !onChoose} onClick={onChoose ? () => onChoose(items[i]) : undefined} />
      : <span key={`empty-${i}`} className="trade-slot empty" aria-hidden="true" />)}
  </div>;
}
export default function TradePanel({ api, self }) {
  const t = api.trade;
  const [tab, setTab] = useState('scroll');
  if (!t) return api.error ? <div className="rpg-talk trade-toast" role="status"><span className="rpg-talk-line">{api.error}</span></div> : null;
  return <TradeDialog key={`${t.id}/${t.revision}`} api={api} self={self} tab={tab} setTab={setTab} />;
}
function TradeDialog({ api, self, tab, setTab }) {
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
  const available = choices.filter((x) => !items.some((i) => identity(i) === identity(x)));
  const chosen = available.find((x) => identity(x) === selected);
  const canAdd = !!chosen && items.length < TRADE.maxItems && (!chosen.max || (/^[0-9]+$/.test(count) && Number(count) > 0 && Number(count) <= chosen.max));
  return <>
    <div className="rpg-menu-back" />
    <section ref={dialog} tabIndex={-1} onKeyDown={keys} className="shop trade-panel" role="dialog" aria-modal="true" aria-label="개인 거래">
      <header className="shop-top"><div className="shop-title"><b>개인 거래</b><span>{other}님과 교환합니다</span></div><button type="button" className="shop-btn" disabled={api.busy} onClick={api.cancel}>거래 취소</button></header>
      <div className="shop-body">
        {t.state === 'invite' ? <>
          <p className="shop-note">{t.side === 0 ? '상대의 수락을 기다리고 있습니다.' : `${other}님이 거래를 신청했습니다.`}</p>
          {t.side === 1 && <button type="button" className="shop-btn main" disabled={api.busy} onClick={api.join}>수락</button>}
        </> : <>
          <div className="trade-layout">
            <section className="trade-inventory" aria-label="내 가방">
              <div className="shop-tabs" role="tablist" aria-label="물품 종류">
                {categories.map(([id, name]) => <button key={id} type="button" role="tab" id={`trade-tab-${id}`}
                  aria-selected={tab === id} aria-controls="trade-inventory" className={tab === id ? 'on' : ''}
                  onClick={() => { setTab(id); setSelected(''); setCount('1'); }}>{name}</button>)}
              </div>
              <div id="trade-inventory" role="tabpanel" aria-labelledby={`trade-tab-${tab}`}>
                <SlotGrid items={available.filter((x) => category(x) === tab)} name="가방 물품" selected={selected} busy={api.busy}
                  onChoose={(x) => { setSelected(identity(x)); setCount('1'); }} />
              </div>
              <div className="trade-picker">
                <p className="shop-note">{chosen ? label(chosen) : '올릴 물품을 골라 주세요'}</p>
                {chosen?.max > 0 && <label className="shop-bet">개수<input aria-label="거래 물품 개수" inputMode="numeric" value={count}
                  onChange={(e) => setCount(e.target.value)} disabled={api.busy} /></label>}
                <button type="button" className="shop-btn" disabled={api.busy || !canAdd} onClick={add}>거래에 올리기</button>
              </div>
            </section>
            <section className="trade-exchange" aria-label="교환 물품">
              <section className="trade-offer"><h3 className="shop-h">상대방 물품 <small>{t.accepted[1 - t.side] ? '확인함' : '확인 전'}</small></h3>
                <SlotGrid items={theirs.items} name="상대방 물품" minimum={3} />
                <p className="shop-price">{theirs.coins.toLocaleString('ko-KR')}코인</p>
              </section>
              <div className="trade-arrows" aria-hidden="true">↓ ↑</div>
              <section className="trade-offer"><h3 className="shop-h">내 물품 <small>{t.accepted[t.side] ? '확인함' : `${items.length}/${TRADE.maxItems}`}</small></h3>
                <SlotGrid items={items} name="내 거래 물품" minimum={3} busy={api.busy}
                  onChoose={(x) => setItems(items.filter((i) => identity(i) !== identity(x)))} />
                <label className="shop-bet trade-coins">코인<input aria-label="거래 코인" inputMode="numeric" value={coins}
                  onChange={(e) => setCoins(e.target.value)} disabled={api.busy} /></label>
                <p className="shop-note">보유 {(self?.coins || 0).toLocaleString('ko-KR')}코인 · 물품을 누르면 뺍니다</p>
              </section>
            </section>
          </div>
          <div className="trade-footer">
            <p className="shop-note">내용을 바꾸면 양쪽 확인이 풀립니다.</p>
            <div className="shop-btns">
              <button type="button" className="shop-btn" disabled={api.busy || !changed || !validCoins} onClick={() => api.change({ coins: Number(coins), items })}>등록 내용 반영</button>
              <button type="button" className="shop-btn main" disabled={api.busy || changed || t.accepted[t.side]} onClick={api.confirm}>
                {api.busy ? '확인 중…' : t.accepted[t.side] ? '상대 확인을 기다리는 중' : '내용 확인 · 거래 확정'}</button>
            </div>
          </div>
        </>}
        {api.error && <p className="shop-why solo" role="alert">{api.error}</p>}
        {t.state === 'fail' && <p className="shop-why solo" role="alert">{tradeError(t)}</p>}
      </div>
    </section>
  </>;
}
