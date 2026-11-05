import {useEffect, useRef, useState} from 'react';
import {VILLAGE_DIALOGUES, villageArtPath} from './game/villageData.js';

/* 기존 상점 틀을 쓴다. 대화는 탐방용이며 퀘스트·보상·저장 상태를 바꾸지 않는다. */
export default function VillagePanel({npcId, onClose}) {
  const npc=VILLAGE_DIALOGUES[npcId], [page,setPage]=useState(0), dialog=useRef(null);
  const returnFocus=useRef(null);
  useEffect(()=>{
    returnFocus.current=document.activeElement;dialog.current?.focus();
    return ()=>returnFocus.current?.focus?.();
  },[]);
  if(!npc)return null;
  const lines=[npc.intro,...npc.lines];
  const advance=()=>{if(page<lines.length-1)setPage(p=>p+1);else onClose();};
  const trap=e=>{
    e.stopPropagation();
    if(e.key==='Escape'){onClose();return;}
    if((e.key==='Enter'||e.key===' ')&&e.target===dialog.current){e.preventDefault();advance();return;}
    if(e.key!=='Tab')return;
    const buttons=[...dialog.current.querySelectorAll('button:not(:disabled)')];
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){e.preventDefault();first?.focus();}
  };
  return <>
    <div className="rpg-menu-back" onClick={onClose}/>
    <section className="shop village-panel" role="dialog" aria-modal="true" aria-labelledby="village-dialog-title" ref={dialog} tabIndex={-1} onKeyDown={trap}>
      <img className={`village-portrait${npc.art === 'bell' || npc.art === 'memorial' ? ' sight' : ''}`} src={villageArtPath(npc.size ? npc.art : `portrait-${npc.art}`)} alt="" onError={e=>{e.currentTarget.hidden=true;}}/>
      <header className="shop-top">
        <div className="shop-title"><b id="village-dialog-title">{npc.name}</b><span>{npc.role}</span></div>
        <button type="button" className="shop-x" aria-label="대화 닫기" onClick={onClose}>×</button>
      </header>
      <button type="button" className="village-dialogue-line" onClick={advance} aria-label="대사 넘기기">
        <span aria-live="polite">{lines[page]}</span>
        <span className="village-dialogue-cue" aria-hidden="true">▾</span>
      </button>
      <footer className="village-dialogue-actions">
        <span>{page+1} / {lines.length}</span>
        <button type="button" className="shop-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button>
        {page<lines.length-1?<button type="button" className="shop-btn main" onClick={()=>setPage(p=>p+1)}>다음 이야기</button>:<button type="button" className="shop-btn main" onClick={onClose}>대화 마치기</button>}
      </footer>
    </section>
  </>;
}
