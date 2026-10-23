import {useState} from 'react';
/* 기존 던전 보스바와 같은 붉은 실제 체력 · 주황 피해 잔상. 갱신은 게임 프레임 루프가 맡는다. */
export default function BossHealthBar({name,hp=0,max=1,realRef,ghostRef,numRef,trackRef}){
 const [ratio]=useState(()=>Math.max(0,Math.min(1,hp/Math.max(1,max))));
 const value=Math.max(0,Math.ceil(hp)),total=Math.max(1,Math.round(max));
 return <div className="rpg-dg-boss"><span title={name}>{name}</span><b ref={numRef}>{value.toLocaleString('ko-KR')} / {total.toLocaleString('ko-KR')}</b>
 <i ref={trackRef} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
 <s ref={ghostRef} style={{width:`${ratio*100}%`}}/><em ref={realRef} style={{width:`${ratio*100}%`}}/>
 </i></div>;
}
