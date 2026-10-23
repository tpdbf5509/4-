/* 거래 통신은 DB RPC로만 한다. 실시간 방에는 잠금 상태와 확정 뒤 자기 기록만 보낸다. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { adoptChar, charRecord, loadChar, rpgJoin, writeChar, ownHero } from './game/rpg.js';
import { rpgTrade } from './game/trade.js';
import { TRADE, lockPlace } from './game/tradeData.js';
import { cloudFlush, cloudQueue, cloudReset, loadRemote, tradeAction, tradeOpen } from './net/rpgSave.js';

const ACTION_WAIT_MS = 50; // 상태 조회가 끝나기를 기다릴 때 버튼 입력을 버리지 않는 간격
const NOTICE_MS = 5000; // 거래 결과와 오류는 읽을 시간을 준 뒤 화면에서 지운다

export const tradeError = (r) => ({
  changed: '내용이 바뀌었습니다. 다시 확인해 주세요.', account: '서버 계정이 있는 캐릭터끼리 거래할 수 있습니다.',
  live: '같은 서버에 접속한 사람과 거래할 수 있습니다.', busy: '이미 진행 중인 거래가 있습니다.', rate: '잠시 뒤 다시 신청해 주세요.',
  token: '접속 정보를 확인하지 못했습니다. 다시 로그인해 주세요.', trade_equipped: '장착 중인 물품은 올릴 수 없습니다.',
  trade_item: '물품이나 수량이 바뀌었습니다.', trade_capacity: '받을 사람의 가방이 가득 찼습니다.',
  trade_funds: '코인이 모자랍니다.', trade_empty: '물품이나 코인을 올려 주세요.', state: '거래 상태가 바뀌었습니다.',
}[r?.err || r?.error] || '연결을 확인하지 못했습니다. 다시 시도해 주세요.');

export function useTrade(options) {
  const current = useRef(options);
  useEffect(() => { current.current = options; });
  const [trade, setTrade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  const active = useRef(null), working = useRef(false), lastQ = useRef(0), seenDone = useRef(''), syncRecord = useRef(null);
  const account = () => {
    const c = loadChar();
    return c?.linked && c.tok && c.name === current.current.selfName ? c : null;
  };
  const lock = useCallback((on) => {
    const o = current.current, h = o.g.heroes[o.seat];
    if (!h) return 0;
    const q = lastQ.current = Math.max(lastQ.current + 1, Date.now());
    const d = { op: on ? 'lock' : 'clear', q };
    h.tradeLocal = on || !!syncRecord.current;
    if (on) { h.hold = []; h.fire = 0; h.dash = 0; }
    if (o.isHost) rpgTrade(o.g, o.seat, d);
    else o.sendInput({ cls: o.seat, kind: 'trade', dir: d, q: o.nextSeq() });
    return q;
  }, []);
  const recover = useCallback(async () => {
    const c = account();
    if (!c) return false;
    const r = await loadRemote(c.name, c.tok);
    if (!r?.ok) { setError(tradeError(r)); return false; }
    const o = current.current, h = o.g.heroes[o.seat];
    if (account()?.tok !== c.tok) return false;
    if (!h || !ownHero(h, o.seats[o.seat]?.id)) return false;
    if ((r.data.ts || 0) < (h.ts || 0)) return false;
    cloudReset();
    if (!adoptChar(r.name, r.data, c.tok, r.admin)) { setError('기기에 기록을 저장하지 못했습니다.'); return false; }
    const data = { ...r.data, admin: r.admin };
    // 높은 거래 차례만 rpgJoin이 받는다. 같은 차례는 이미 반영한 기록이다.
    if ((h.ts || 0) === (r.data.ts || 0)) h.loaded = 0;
    rpgJoin(o.g, o.seat, data, o.seats[o.seat]?.id);
    if (!o.isHost) {
      syncRecord.current = { cls: o.seat, who: o.seats[o.seat]?.id, data };
      h.tradeLocal = true;
      o.room?.send('rjoin', syncRecord.current);
    }
    return true;
  }, []);
  const receive = useCallback(async (r) => {
    if (!r?.ok) { setError(tradeError(r)); return; }
    const t = r.trade;
    if (t?.state === 'done' && seenDone.current !== t.id) {
      lock(true);
      if (!await recover()) return; // 불확실하면 잠금을 유지하고 다음 읽기에서 다시 복구한다
      seenDone.current = t.id;
      setError('');
      setNotice({ title: '거래 완료', text: '물품과 코인을 교환했습니다.', success: true });
    }
    if (t && ['invite', 'open'].includes(t.state)) {
      if (t.state === 'open' || t.side === 0) lock(true);
      active.current = t; setTrade(t);
    } else {
      if (t?.state === 'fail') setError(tradeError(t));
      if (t?.state === 'cancel' && active.current) setNotice({ title: '거래 취소', text: t.error === 'expired' ? '시간이 지나거나 접속이 끊겨 취소되었습니다.' : '거래를 취소했습니다.' });
      if (active.current) lock(false);
      active.current = null; setTrade(null);
    }
  }, [lock, recover]);
  const call = useCallback(async (op, offer, hash) => {
    const c = account(), o = current.current;
    if (!c) return { ok: false, err: 'token' };
    // 상태를 읽는 중에 누른 버튼도 버리지 않고 읽기가 끝난 뒤 처리한다.
    const deadline = Date.now() + TRADE.lockMs;
    while (working.current && Date.now() < deadline) await new Promise((r) => setTimeout(r, ACTION_WAIT_MS));
    if (working.current) return { ok: false, err: 'net' };
    working.current = true; setBusy(true); setError('');
    try {
      const id = active.current?.id;
      const r = await tradeAction(c.name, c.tok, o.seats[o.seat]?.id, id, op, offer, hash);
      await receive(r);
      return r;
    } finally { working.current = false; setBusy(false); }
  }, [receive]);
  // hall: 길드 동작은 길드 광장에서도 저장한다(거래 자체는 광장에서만)
  const flush = useCallback(async ({ hall = false } = {}) => {
    const c = account(), o = current.current, h = o.g.heroes[o.seat];
    if (!c || !h?.loaded || !ownHero(h, o.seats[o.seat]?.id)) throw Error('기록을 불러오는 중입니다. 잠시 뒤 다시 해 주세요.');
    if (!lockPlace(h.map, hall)) throw Error(hall ? '광장이나 길드 광장에서 할 수 있습니다.' : '거래는 광장에서만 할 수 있습니다.');
    if (h.down > 0) throw Error('쓰러진 동안에는 할 수 없습니다.');
    if (h.dvs >= 0) throw Error('결투 중에는 할 수 없습니다.');
    if (!o.isHost && !o.g.tradeVersion) throw Error('방장 화면이 옛 버전입니다. 잠시 뒤 다시 해 주세요.');
    const q = lock(true);
    // 손님은 방장이 잠근 것을 확인한 다음 저장한다.
    if (!o.isHost) {
      const until = Date.now() + 6000;
      while ((h.tradeAck || 0) < q && Date.now() < until) await new Promise((r) => setTimeout(r, 100));
      if ((h.tradeAck || 0) < q) throw Error('방장 응답을 기다리고 있습니다. 다시 시도해 주세요.');
    }
    writeChar(h); cloudQueue(c.name, c.tok, charRecord());
    const r = await cloudFlush();
    if (!r?.ok) throw Error(tradeError(r));
  }, [lock]);
  const request = useCallback(async (target) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      const c = account(), o = current.current;
      if (!c || o.room?.viaServer) throw Error('서버 계정이 있는 캐릭터끼리 거래할 수 있습니다.');
      await flush();
      const r = await tradeOpen(c.name, c.tok, target, o.seats[o.seat]?.id);
      if (!r?.ok) throw Error(tradeError(r));
      const state = await tradeAction(c.name, c.tok, o.seats[o.seat]?.id, r.id);
      if (!state?.ok) throw Error(tradeError(state));
      await receive(state);
      o.closeAll();
    } catch (e) { setError(e.message); lock(false); }
    finally { working.current = false; setBusy(false); }
  }, [flush, lock, receive]);
  const confirm = useCallback(async () => {
    if (!active.current) return { ok: false };
    // 확인 후 물품을 바꾸면 다시 저장한다. 이미 확인한 쪽은 서버 저장이 잠겨 있으므로 재확인은 읽기만 한다.
    try {
      if (!active.current.accepted[active.current.side]) await flush();
      return await call('accept', null, active.current.hash);
    } catch (e) { setError(e.message); return { ok: false }; }
  }, [call, flush]);
  useEffect(() => {
    let stop = false, timer;
    const tick = async () => {
      const c = account(), o = current.current;
      if (syncRecord.current) {
        const h = o.g.heroes[o.seat];
        if (o.isHost || (h?.serverTs || 0) >= syncRecord.current.data.ts) {
          syncRecord.current = null;
          if (h) h.tradeLocal = !!active.current;
        } else o.room?.send('rjoin', syncRecord.current);
      }
      if (!working.current && c && !o.room?.viaServer && o.g.heroes[o.seat]?.loaded) {
        working.current = true;
        try {
          const r = await tradeAction(c.name, c.tok, o.seats[o.seat]?.id, active.current?.id);
          if (!stop && (r?.ok || active.current)) await receive(r);
        }
        finally { working.current = false; }
      }
      if (!stop) timer = setTimeout(tick, (active.current || syncRecord.current) ? TRADE.pollMs : TRADE.inboxMs);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [receive]);
  return { trade, busy, error, notice, request, recover, lock, confirm, flush,
    join: async () => { try { await flush(); await call('join'); } catch (e) { setError(e.message); lock(false); } }, cancel: () => call('cancel'),
    change: async (offer) => {
      try {
        // 첫 확인 전 최신 가방을 DB에 먼저 남긴다. 확인한 뒤 변경할 때는 DB의 잠긴 기록을 쓴다.
        if (!active.current?.accepted[active.current.side]) await flush();
        return await call('offer', offer);
      } catch (e) { setError(e.message); return { ok: false }; }
    } };
}
