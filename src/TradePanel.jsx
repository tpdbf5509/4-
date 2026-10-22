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
// 내장 이미지 생성 도구로 만든 6×6 물품 그림. 칸 차례는 생성 기록과 함께 보존한다.
const ATLAS = '/assets/game/rpg/items/trade-icons.webp';
const ITEM_ART = {
  'wp:': 0, 'gd:': 1,
  'p:heal_s': 2, 'p:heal_m': 3, 'p:heal_l': 4, 'p:buff_str': 5,
  'p:buff_int': 6, 'p:buff_crit': 7, 'p:reset': 8, 'p:speed1': 9, 'p:speed2': 10, 'p:hide1': 11, 'p:hide2': 12,
  'm:fur': 13, 'm:fang': 14, 'm:tusk': 15, 'm:hide': 16, 'm:blue': 17,
  'm:eye': 18, 'm:heart': 19, 'm:bone': 20, 'm:rot': 21, 'm:soul': 22, 'm:core': 23, 'm:mane': 24, 'm:silk': 25,
};
const WEAPON_ART = { sword: 26, axe: 27, staff: 28, tome: 29, dagger: 30, great: 31, bow: 32 };
const artOf = (x) => x.k === 'w' ? weaponArt(x.item) : x.k === 'a' ? armorArt(x.item.s, x.item.g) : null;
const atlasOf = (x) => x.k === 'w' && !weaponArt(x.item) ? WEAPON_ART[x.item.t] : ITEM_ART[identity(x)];
const categories = [['scroll', '주문서'], ['item', '아이템'], ['potion', '물약']];
const category = (x) => x.k === 'p' ? 'potion' : ['wp', 'gd'].includes(x.k) ? 'scroll' : 'item';

function ItemTile({ item, onClick, disabled, action }) {
  const [failed, setFailed] = useState(false);
  const name = label(item), src = artOf(item), cell = atlasOf(item), amount = item.n || item.max;
  return <button type="button" className="trade-slot" disabled={disabled}
    aria-label={`${name}${amount ? ` ${amount}개` : ''}${action ? ` · ${action}` : ''}`}
    title={name} onClick={onClick}>
    <span className="trade-slot-visual">{cell !== undefined && !failed ? <span className="trade-slot-atlas" aria-hidden="true">
      <img src={ATLAS} alt="" draggable={false} style={{ left: `${-(cell % 6) * 100}%`, top: `${-Math.floor(cell / 6) * 100}%` }} onError={() => setFailed(true)} />
    </span> : src && !failed ? <img src={src} alt="" draggable={false} onError={() => setFailed(true)} /> : null}</span>
    <span className="trade-slot-name">{name}</span>
    {amount > 0 && <small className="trade-slot-count">{amount}</small>}
    {item.item?.up > 0 && <small className="trade-slot-up">+{item.item.up}</small>}
  </button>;
}
function SlotGrid({ items, onChoose, busy, name, minimum = 9, action }) {
  return <div className="trade-grid" role="group" aria-label={name}>
    {Array.from({ length: Math.max(minimum, items.length) }, (_, i) => items[i]
      ? <ItemTile key={identity(items[i])} item={items[i]} action={action}
          disabled={busy || !onChoose} onClick={onChoose ? () => onChoose(items[i]) : undefined} />
      : <span key={`empty-${i}`} className="trade-slot empty" aria-hidden="true" />)}
  </div>;
}
export default function TradePanel({ api, self }) {
  const t = api.trade;
  const [tab, setTab] = useState('scroll');
  if (!t) {
    const notice = api.error ? { title: '거래 불가', text: api.error } : api.notice;
    return notice ? <div className={`trade-result ${notice.success ? 'success' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      <strong>{notice.success && '✓ '}{notice.title}</strong><span>{notice.text}</span>
    </div> : null;
  }
  return <TradeDialog key={t.id} api={api} self={self} tab={tab} setTab={setTab} />;
}
function TradeDialog({ api, self, tab, setTab }) {
  const t = api.trade, mine = t.offers[t.side], theirs = t.offers[1 - t.side];
  const dialog = useRef(null), changing = useRef(false);
  const [coinDraft, setCoinDraft] = useState(null), [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false), [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const other = t.side === 0 ? t.b : t.a;
  const mineReady = !!t.accepted[t.side], otherReady = !!t.accepted[1 - t.side];
  const busy = saving || confirming || api.busy;
  const coins = coinDraft ?? String(mine.coins);
  const b = self?.bag;
  const choices = b ? [
    ...b.w.filter((w) => w.u !== b.e).map((w) => ({ k: 'w', u: String(w.u), item: w })),
    ...b.a.filter((a) => !Object.values(b.ae || {}).includes(a.u)).map((a) => ({ k: 'a', u: String(a.u), item: a })),
    ...Object.entries(b.p).filter(([, n]) => n > 0).map(([u, max]) => ({ k: 'p', u, max })),
    ...Object.entries(b.m).filter(([, n]) => n > 0).map(([u, max]) => ({ k: 'm', u, max })),
    ...(b.wp ? [{ k: 'wp', u: '', max: b.wp }] : []), ...(b.gd ? [{ k: 'gd', u: '', max: b.gd }] : []),
  ] : [];
  const items = mine.items.map((x) => quantities[identity(x)] === undefined ? x : { ...x, n: Number(quantities[identity(x)]) });
  const validCoins = /^[0-9]{1,12}$/.test(coins) && Number(coins) <= (self?.coins || 0);
  const validItems = items.every((x) => !('n' in x) || (Number.isInteger(x.n) && x.n > 0 && x.n <= (choices.find((c) => identity(c) === identity(x))?.max || 0)));
  const dirty = Number(coins) !== mine.coins || items.some((x, i) => x.n !== mine.items[i].n);
  const available = choices.filter((x) => !mine.items.some((i) => identity(i) === identity(x)));
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keys = (e) => {
    e.stopPropagation(); // 거래 창의 Enter·Space·방향키가 게임 조작으로 넘어가지 않게 한다
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!busy) api.cancel(); }
    if (e.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),input:not(:disabled)')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus(); }
  };
  const changeTab = (e, id) => {
    const at = categories.findIndex(([k]) => k === id);
    const next = e.key === 'ArrowRight' ? (at + 1) % categories.length : e.key === 'ArrowLeft' ? (at + categories.length - 1) % categories.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? categories.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    const key = categories[next][0]; setTab(key);
    dialog.current.querySelector(`#trade-tab-${key}`)?.focus();
  };
  const update = async (nextItems = items, message = '') => {
    if (changing.current) return false;
    if (!validCoins || !validItems) { setError('코인과 물품 수량을 확인해 주세요.'); return false; }
    changing.current = true; setSaving(true); setError('');
    try {
      const r = await api.change({ coins: Number(coins), items: nextItems });
      if (!r?.ok) { setError('내용을 반영하지 못했습니다. 다시 눌러 주세요.'); return false; }
      setCoinDraft(null); setQuantities({}); setNotice(message || '거래 내용을 반영했습니다. 양쪽 모두 다시 확인해 주세요.');
      if (document.activeElement === document.body) dialog.current?.querySelector('[aria-label="가방 물품"] button:not(:disabled)')?.focus();
      return true;
    } finally { changing.current = false; setSaving(false); }
  };
  const add = (x) => {
    if (busy || changing.current) return;
    if (mine.items.length >= TRADE.maxItems) { setError(`물품은 ${TRADE.maxItems}종류까지 올릴 수 있습니다.`); return; }
    const item = x.max ? { k: x.k, u: x.u, n: 1 } : { k: x.k, u: x.u, item: x.item };
    update([...items, item], `${label(x)}${x.max ? ' 1개를' : '을(를)'} 거래에 올렸습니다.`);
  };
  const confirm = async () => {
    if (busy || changing.current) return;
    setError('');
    if (dirty && !await update()) return;
    if (!validCoins || !validItems) { setError('코인과 물품 수량을 확인해 주세요.'); return; }
    setConfirming(true);
    try { await api.confirm(); } finally { setConfirming(false); }
  };
  const blur = (e) => {
    // 확인 버튼을 누를 때는 확인 동작이 수량/코인을 먼저 반영한다.
    if (e.relatedTarget?.closest('.trade-footer') || !dirty || busy) return;
    update();
  };
  const status = dirty ? '수량이나 코인이 바뀌었습니다. 확인하면 함께 반영합니다.' : mineReady
    ? '내 확인이 완료됐습니다. 상대의 확인을 기다립니다.' : otherReady
      ? '상대가 확인했습니다. 내용을 살펴보고 거래 내용을 확인해 주세요.' : '물품을 클릭하면 바로 올라갑니다. 양쪽이 확인하면 교환합니다.';
  const badge = (ready) => <span className={`trade-state ${ready ? 'ready' : ''}`}>{ready ? '✓ 확인 완료' : '확인 전'}</span>;
  return <>
    <div className="rpg-menu-back" />
    <section ref={dialog} tabIndex={-1} onKeyDown={keys} className="shop trade-panel" role="dialog" aria-modal="true" aria-label="개인 거래" aria-busy={busy}>
      <header className="shop-top"><div className="shop-title"><b>개인 거래</b><span>{other}님과 교환합니다</span></div><button type="button" className="shop-btn" disabled={busy} onClick={api.cancel}>거래 취소</button></header>
      <div className="shop-body">
        {t.state === 'invite' ? <>
          <p className="shop-note">{t.side === 0 ? '상대의 수락을 기다리고 있습니다.' : `${other}님이 거래를 신청했습니다.`}</p>
          {t.side === 1 && <button type="button" className="shop-btn main" disabled={busy} onClick={api.join}>수락</button>}
        </> : <>
          <div className="trade-layout">
            <section className="trade-inventory" aria-label="내 가방">
              <div className="shop-tabs" role="tablist" aria-label="물품 종류">
                {categories.map(([id, name]) => <button key={id} type="button" role="tab" id={`trade-tab-${id}`} tabIndex={tab === id ? 0 : -1}
                  aria-selected={tab === id} aria-controls="trade-inventory" className={tab === id ? 'on' : ''}
                  onKeyDown={(e) => changeTab(e, id)} onClick={() => setTab(id)}>{name}</button>)}
              </div>
              <p className="shop-note trade-help">물품 클릭 → 바로 등록</p>
              <div id="trade-inventory" role="tabpanel" aria-labelledby={`trade-tab-${tab}`}>
                <SlotGrid items={available.filter((x) => category(x) === tab)} name="가방 물품" busy={busy} onChoose={add} action="거래에 바로 올리기" />
              </div>
            </section>
            <section className="trade-exchange" aria-label="교환 물품">
              <section className={`trade-offer ${otherReady ? 'confirmed' : ''}`}><h3 className="shop-h">상대방 물품 {badge(otherReady)}</h3>
                <SlotGrid items={theirs.items} name="상대방 물품" minimum={3} />
                <p className="shop-price">{theirs.coins.toLocaleString('ko-KR')}코인</p>
              </section>
              <div className="trade-arrows" aria-hidden="true">↓ ↑</div>
              <section className={`trade-offer ${mineReady && !dirty ? 'confirmed' : ''}`}><h3 className="shop-h">내 물품 {badge(mineReady && !dirty)}</h3>
                <SlotGrid items={mine.items} name="내 거래 물품" minimum={3} busy={busy} action="거래에서 빼기"
                  onChoose={(x) => update(items.filter((i) => identity(i) !== identity(x)), `${label(x)}을(를) 거래에서 뺐습니다.`)} />
                {mine.items.filter((x) => 'n' in x).map((x) => <label className="trade-quantity" key={identity(x)}>
                  <span>{label(x)}</span><input aria-label={`${label(x)} 거래 수량`} type="number" inputMode="numeric" min={1}
                    max={choices.find((c) => identity(c) === identity(x))?.max || 1} disabled={busy}
                    value={quantities[identity(x)] ?? x.n} onChange={(e) => setQuantities({ ...quantities, [identity(x)]: e.target.value })}
                    onBlur={blur} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); update(); } }} /><span>개</span>
                </label>)}
                <label className="shop-bet trade-coins">코인<input aria-label="거래 코인" inputMode="numeric" value={coins}
                  onChange={(e) => setCoinDraft(e.target.value)} disabled={busy} onBlur={blur}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); update(); } }} /></label>
                <p className="shop-note">보유 {(self?.coins || 0).toLocaleString('ko-KR')}코인 · 물품 클릭으로 빼기</p>
              </section>
            </section>
          </div>
        </>}
      </div>
      {t.state === 'open' && <footer className="trade-footer">
        <div className="trade-checks" aria-live="polite"><span>나 {badge(mineReady && !dirty)}</span><span>상대 {badge(otherReady)}</span></div>
        <p className="trade-status" role="status">{saving ? '물품과 코인을 반영하고 있습니다…' : confirming ? '내 확인을 전달하고 있습니다…' : status}</p>
        <button type="button" className={`shop-btn main trade-confirm ${mineReady && !dirty ? 'complete' : ''}`} disabled={busy || !validCoins || !validItems || (mineReady && !dirty)} onClick={confirm}>
          {saving ? '물품 반영 중…' : confirming || api.busy ? '확인 중…' : mineReady && !dirty ? '✓ 내 확인 완료 · 상대를 기다립니다' : '거래 내용 확인'}
        </button>
        <span className="trade-sr-only" role="status">{notice}</span>
      </footer>}
      {(error || api.error) && <p className="shop-why solo trade-error" role="alert">{error || api.error}</p>}
      {t.state === 'fail' && <p className="shop-why solo trade-error" role="alert">{tradeError(t)}</p>}
    </section>
  </>;
}
