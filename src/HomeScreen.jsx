import {useCallback,useEffect,useRef,useState} from 'react';
import {loadChar} from './game/rpg.js';
import {loadDraft,saveDraft,sendFeedback,FEEDBACK_MAX} from './net/feedback.js';
import './ui/home.css';

// 첫 화면에는 게임에서 실제 사용하는 캐릭터를 그대로 세운다.
const adventurers=[['warrior','m','검사'],['mage','f','마법사'],['archer','m','궁수'],['gladiator','m','검투사'],['knight','f','기사'],['marksman','f','명사수'],['gunner','m','총사'],['archmage','f','마도사'],['summoner','m','소환술사'],['healer','f','치유사']];
const hero=(job,gender)=>`/assets/characters/rpg/${job}-${gender}/front.webp`;
function HomeDialog({title,onClose,children}){
  const ref=useRef(null);
  useEffect(()=>{
    const prev=document.activeElement,box=ref.current;box?.focus();
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const nodes=[...box.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')],first=nodes[0],last=nodes.at(-1);
        if(e.shiftKey&&(document.activeElement===first||!box.contains(document.activeElement)||document.activeElement===box)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!box.contains(document.activeElement))){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);prev?.focus?.();};
  },[onClose]);
  return <div className="front-modal-back" onClick={onClose}><section className="front-dialog" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="front-dialog-title" onClick={e=>e.stopPropagation()}>
    <header><h2 id="front-dialog-title">{title}</h2><button type="button" className="btn-ghost" onClick={onClose} aria-label="창 닫기">닫기 ×</button></header>{children}
  </section></div>;
}
function HomeInquiry({name,onClose}){
  const [text,setText]=useState(loadDraft),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
  const submit=async e=>{e.preventDefault();if(busy||!text.trim())return;setBusy(true);
    const r=await sendFeedback({body:text,name,room:'HOME',result:'lobby'});setResult(r);setBusy(false);if(r.ok)setText('');
  };
  return <HomeDialog title="문의하기" onClose={onClose}><form onSubmit={submit} className="front-inquiry">
    <label htmlFor="home-inquiry">불편한 점이나 궁금한 내용을 남겨 주세요.</label>
    <textarea id="home-inquiry" className="say-box" rows={6} maxLength={FEEDBACK_MAX} value={text} onChange={e=>{setText(e.target.value);saveDraft(e.target.value);setResult(null);}} placeholder="오류라면 언제, 어디서, 무엇을 했는지 알려 주세요."/>
    <div className="say-foot"><span>{text.length} / {FEEDBACK_MAX}</span><button type="submit" className="btn-main" disabled={busy||!text.trim()}>{busy?'보내는 중…':'문의 보내기'}</button></div>
    {result&&<p role="status" className={result.ok?'say-ok':'say-bad'}>{result.why}</p>}
  </form></HomeDialog>;
}
export default function HomeScreen({name,setName,code,setCode,error,needPw,testPw,setTestPw,onCreate,onEnterRpg,onJoin,onUpdates,hasNews}){
  const [mine]=useState(loadChar),[dialog,setDialog]=useState(()=>code.length===4?'defense':null);
  const close=useCallback(()=>setDialog(null),[]);
  return <main className="page front-page"><section className="front-scene" aria-label="네 갈래 방어선 모드 선택">
    <nav className="front-nav" aria-label="소식과 문의"><button type="button" onClick={onUpdates}>업데이트{hasNews&&<span className="front-news-dot" aria-label="새 소식"/>}</button><button type="button" onClick={()=>setDialog('inquiry')}>문의</button></nav>
    <header className="front-title"><span className="front-sign-nail left"/><h1>네 갈래 <span>방어선</span></h1><span className="front-sign-nail right"/></header>
    <div className="front-modes">
      <article className="front-mode"><h2>RPG</h2><p className="front-mode-note">함께 떠나는 모험</p>
        <img className="front-preview" src="/assets/home/rpg.webp" width="1160" height="760" alt="광장 분수에 모인 검사, 마법사, 궁수의 실제 RPG 화면"/>
        <button type="button" className="front-enter" aria-label="RPG 입장" onClick={onEnterRpg}>입장 <span aria-hidden="true">›</span></button>
        <p className="front-save">{mine?`${mine.name} · Lv.${mine.lv}`:'나만의 캐릭터로 시작하세요'}</p>
      </article>
      <article className="front-mode"><h2 className="front-defense-title">Tower <span>defence</span></h2><p className="front-mode-note">네 갈래 길을 함께 지켜요</p>
        <img className="front-preview" src="/assets/home/defense.webp" width="1160" height="760" alt="성채를 둘러싼 네 갈래 길에서 탑들이 몬스터를 막는 실제 타워 디펜스 화면"/>
        <button type="button" className="front-enter" aria-label="타워 디펜스 입장" onClick={()=>setDialog('defense')}>입장 <span aria-hidden="true">›</span></button>
        <p className="front-save">최대 4명이 함께하는 방어전</p>
      </article>
    </div>
    <div className="front-decor" aria-hidden="true">
      <img className="front-monster" src="/assets/characters/enemies/grunt.webp" alt=""/>
      <img className="front-warrior" src={hero('warrior','m')} alt=""/>
      <div className="front-tower"><img src="/assets/game/defense/towers/archer-1.webp" alt=""/><img className="front-turret" src="/assets/game/defense/towers/archer-1-turret.webp" alt=""/></div>
      <img className="front-archer" src="/assets/characters/players/archer/portrait.webp" alt=""/>
    </div>
    <div className="front-party" aria-label="RPG의 여러 직업 캐릭터"><div className="front-party-line">{adventurers.map(([job,gender,label])=><img key={job} src={hero(job,gender)} alt={label} title={label} width="70" height="105"/>)}</div></div>
    {dialog==='defense'&&<HomeDialog title="타워 디펜스 입장" onClose={close}>
      <form onSubmit={e=>{e.preventDefault();onCreate();}}><label className="field" htmlFor="nick"><span>수비대원 이름</span><input id="nick" value={name} maxLength={8} placeholder="수비대원" onChange={e=>setName(e.target.value)}/></label><button type="submit" className="btn-main wide">새 방 만들기</button></form>
      <div className="or"><span>친구의 방 코드로 입장</span></div>
      <form onSubmit={e=>{e.preventDefault();if(code.length===4&&(!needPw||testPw))onJoin();}}><label className="front-code-label" htmlFor="code">방 코드</label><div className="join-row"><input id="code" className="code-input" value={code} maxLength={4} placeholder="ABCD" onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/><button type="submit" className="btn-ghost tall" disabled={code.length!==4||(needPw&&!testPw)}>코드로 입장</button></div>
      {needPw&&<label className="field test-pw" htmlFor="test-pw"><span>테스트 서버 비밀번호</span><input id="test-pw" type="password" value={testPw} maxLength={32} autoComplete="off" onChange={e=>setTestPw(e.target.value)}/></label>}</form>
      {error&&<p className="err" role="alert">{error}</p>}
    </HomeDialog>}
    {dialog==='inquiry'&&<HomeInquiry name={mine?.name||name} onClose={close}/>}
  </section></main>;
}
