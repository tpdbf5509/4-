import {useEffect, useRef, useState} from 'react';
import {CUT, CUTSCENES, cutImages, cutLength, shotAt} from './game/cutsceneData.js';
import {drawCut} from './game/cutsceneArt.js';
import sfx from './game/sfx.js';

/* 이야기 컷신 재생 — 게임 화면을 덮는 캔버스. 끝나거나 건너뛰면 onDone.
   그림을 다 불러오거나 CUT.loadMax 가 지나면 시작한다. Esc · 건너뛰기 단추로 넘긴다. */
export default function Cutscene({id, onDone}) {
  const cv = useRef(null), done = useRef(onDone);
  done.current = onDone;
  const [ready, setReady] = useState(false);
  const imgs = useRef({});
  useEffect(() => {
    if (!CUTSCENES[id]) { done.current(); return undefined; }
    const list = cutImages(id); let left = list.length;
    const go = () => setReady(true);
    const id0 = setTimeout(go, CUT.loadMax);
    if (!left) go();
    for (const src of list) {
      const im = new Image();
      im.onload = im.onerror = () => { if (--left <= 0) go(); };
      im.src = src; imgs.current[src] = im;
    }
    return () => clearTimeout(id0);
  }, [id]);
  useEffect(() => {
    if (!ready) return undefined;
    const c = cv.current; if (!c) return undefined;
    const ctx = c.getContext('2d');
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now(), all = cutLength(id);
    let raf = 0, lastShot = -1, played = new Set();
    const frame = () => {
      const ms = performance.now() - t0;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ms >= all || !drawCut(ctx, W, H, id, ms, imgs.current, {still})) { done.current(); return; }
      // 소리 — 장면 안의 정한 때에 한 번씩
      const at = shotAt(id, ms);
      if (at.i !== lastShot) { lastShot = at.i; played = new Set(); }
      for (const [sec, name] of at.shot.snd || []) {
        if (!played.has(name + sec) && at.t >= sec * 1000) { played.add(name + sec); try { sfx.play(name); } catch { /* 무음 */ } }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready, id]);
  const skipRef = useRef(null), born = useRef(0);
  useEffect(() => { born.current = performance.now(); skipRef.current?.focus(); }, []);
  // 대사를 넘기던 Enter · 스페이스가 이어져 바로 건너뛰지 않게 처음 잠깐은 받지 않는다
  const skip = () => { if (performance.now() - born.current > CUT.skipLock) done.current(); };
  const key = (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); skip(); } };
  return (
    <div className="cutscene" role="dialog" aria-modal="true" aria-label="이야기 장면" onKeyDown={key}>
      <canvas ref={cv}/>
      <button type="button" ref={skipRef} className="cutscene-skip" onClick={skip}>건너뛰기 ›</button>
    </div>
  );
}
