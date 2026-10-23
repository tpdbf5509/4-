import {useState} from 'react';
/* 기존 던전 보스바와 같은 붉은 실제 체력 · 주황 피해 잔상. 갱신은 게임 프레임 루프가 맡는다. */
export default function BossHealthBar({name,hp=0,max=1,realRef,ghostRef,numRef,trackRef}){
 // 처음 값 — 체력을 아직 모르면(NaN) 가득 찬 칸으로 시작한다. 예전엔 너비가 NaN% 가 되어 칸이 비어 보였다
 const [ratio]=useState(()=>{const r=Number(hp)/Math.max(1,Number(max)||1);return Number.isFinite(r)?Math.max(0,Math.min(1,r)):1;});
 const value=Math.max(0,Math.ceil(Number(hp)||0)),total=Math.max(1,Math.round(Number(max)||1));
 return <div className="rpg-dg-boss"><span title={name}>{name}</span><b ref={numRef}>{value.toLocaleString('ko-KR')} / {total.toLocaleString('ko-KR')}</b>
 <i ref={trackRef} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
 <s ref={ghostRef} style={{width:`${ratio*100}%`}}/><em ref={realRef} style={{width:`${ratio*100}%`}}/>
 </i></div>;
}
