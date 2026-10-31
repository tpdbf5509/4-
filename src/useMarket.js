/* 광장 장터 게시판 — 장부(server/src/ledger-market.js)와 주고받는다. 창을 열 때와 "새로 보기"를 누를 때만 읽는다(자동으로 다시 읽지 않는다).
   올리기 · 사기 · 내리기 · 받기는 거래처럼 지금 가방을 먼저 남기고(trades.flush) 장부가 고친 기록을 다시 불러온다(trades.recover) */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadChar, ownHero } from './game/rpg.js';
import { MARKET } from './game/marketData.js';
import { marketAction } from './net/rpgSave.js';

const ERR = {
  token: '접속 정보를 확인하지 못했습니다. 다시 로그인해 주세요.', live: '현재 서버 접속 상태를 확인해 주세요.', place: '광장에서 이용할 수 있습니다.',
  busy: '거래가 끝난 뒤 이용해 주세요.', admin: '관리자 캐릭터는 물건을 올릴 수 없습니다.', price: `값은 ${MARKET.priceMin}~${MARKET.priceMax.toLocaleString('ko-KR')}코인으로 적어 주세요.`,
  slots: `한 사람이 ${MARKET.slots}개까지 올릴 수 있습니다.`, box: '보관함을 먼저 비워 주세요.', gone: '이미 팔렸거나 내려간 물건입니다.',
  own: '내 물건은 살 수 없습니다.', changed: '값이 바뀌었습니다. 목록을 다시 확인해 주세요.', rate: '잠시 뒤 다시 눌러 주세요.',
  trade_funds: '코인이 모자랍니다.', trade_capacity: '가방이 가득 찼습니다.', trade_item: '물품이나 수량이 바뀌었습니다.',
  trade_equipped: '장착 중인 물품은 올릴 수 없습니다.', trade_offer: '올릴 물품을 확인해 주세요.', net: '연결을 확인하지 못했습니다. 다시 시도해 주세요.',
};
const DONE = { post: '게시판에 올렸습니다', buy: '샀습니다. 가방을 확인해 주세요', cancel: '물건을 내렸습니다', claim: '보관함에서 받았습니다' };
export const marketError = (r) => ERR[r?.err] || ERR.net;
// 전용 서버 방이면 서버가 입장권으로 장부를 부른다(room.ledger). 예전 방식은 화면이 직접 부른다
const remote = (o, c, op, args) => (o.room?.viaServer ? o.room.ledger('market', { op, args }) : marketAction(c.name, c.tok, o.seats[o.seat]?.id, op, args));

export function useMarket(options) {
  const current = useRef(options);
  useEffect(() => { current.current = options; });
  const [state, setState] = useState(null), [busy, setBusy] = useState(false), [note, setNote] = useState(null);
  const working = useRef(false);
  const account = () => { const c = loadChar(); return c?.linked && c.tok && c.name === current.current.selfName ? c : null; };
  const say = (ok, msg) => setNote({ ok, msg, at: Date.now() });
  const refresh = useCallback(async () => {
    const c = account(), o = current.current;
    if (!c) { say(false, '서버 계정으로 접속한 캐릭터만 장터를 쓸 수 있습니다.'); return; }
    if (working.current || !o.g.heroes[o.seat]?.loaded) return;
    working.current = true; setBusy(true);
    try {
      const r = await remote(o, c, 'get', {});
      if (r?.ok) setState(r); else say(false, marketError(r));
    } finally { working.current = false; setBusy(false); }
  }, []);
  const action = useCallback(async (op, args = {}) => {
    const c = account(), o = current.current, h = o.g.heroes[o.seat];
    if (!c) { say(false, '서버 계정으로 접속한 캐릭터만 장터를 쓸 수 있습니다.'); return { ok: false }; }
    if (working.current || o.trades.trade || o.trades.busy) return { ok: false };
    working.current = true; setBusy(true);
    try {
      await o.trades.flush();                       // 장부가 보는 가방이 지금 가방이어야 한다(거래와 같은 잠금)
      const r = await remote(o, c, op, args);
      if (account()?.tok !== c.tok) throw Error(ERR.token);
      if (!r?.ok) throw Error(marketError(r));
      if (r.changed && h && ownHero(h, o.seats[o.seat]?.id) && (r.charTs || 0) > (h.ts || 0) && !await o.trades.recover())
        throw Error('최신 캐릭터 기록을 다시 확인하고 있습니다.');
      setState(r);
      say(true, op === 'cancel' && r.boxed ? '가방이 가득 차 보관함으로 보냈습니다' : op === 'claim' && r.left ? `받았습니다. 가방이 가득 차 ${r.left}건은 남겨 두었습니다` : DONE[op] || '반영했습니다');
      return r;
    } catch (e) { say(false, e.message); return { ok: false }; }
    finally { o.trades.lock(false); working.current = false; setBusy(false); }
  }, []);
  return { state, busy, note, refresh, action };
}
