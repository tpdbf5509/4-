import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_ID} from './game/worldBossData.js';
import {WORLD_WEAPONS,worldArmorName} from './game/worldEquipmentData.js';
import {MAT_BY_ID} from './game/itemData.js';
import {POTIONS} from './game/shopData.js';
import {useEffect,useRef} from 'react';
import {RPG_SERVER_CAP} from './game/rpg.js';
const left=ms=>{const n=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const lootName=x=>x.k==='weapon'?WORLD_WEAPONS.find(w=>w.id===x.id)?.name:x.k==='armor'?worldArmorName(x.id,x.set):x.k==='potion'?POTIONS.find(p=>p.id===x.id)?.name:MAT_BY_ID[x.id]?.name;
export function WorldBossHud({state,map,onOpen,onLeave}){
  const a=state?.active;if(!a||map!==C.map)return null;
  return <div className="wb-hud"><div><b>{WORLD_BOSS_BY_ID[a.id].name}</b><span>{a.phase==='fight'?`남은 시간 ${left(a.expires-state.clock)}`:a.phase==='clear'?'토벌 완료':'토벌 종료'}</span></div>
    <progress aria-label="월드보스 체력" max={a.max} value={a.hp}/><div><span>{Math.ceil(a.hp).toLocaleString('ko-KR')} / {a.max.toLocaleString('ko-KR')}</span><strong>내 기여도 {(a.damage/a.max*100).toFixed(1)}%</strong></div>
    <div><button type="button" className="rpg-win-btn" onClick={onOpen}>보상 확인</button><button type="button" className="rpg-win-btn" onClick={onLeave}>광장으로</button></div></div>;
}
export default function WorldBossPanel({state,self,act,onClose}){
  const dialog=useRef(null);
  useEffect(()=>{const previous=document.activeElement;dialog.current?.focus();return()=>previous?.focus?.();},[]);
  const keys=e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose();}
    if(e.key!=='Tab')return;
    const nodes=[...dialog.current.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  const a=state?.active,clock=state?.clock||0,mail=state?.mail||[];
  const ready=self?.loaded&&self.down<=0&&!state?.tradeBlocked&&self.dvs<0,atPlaza=self?.map==='plaza';
  return <><div className="rpg-menu-back" onClick={onClose}/><section ref={dialog} tabIndex={-1} onKeyDown={keys} className="shop wb-panel" role="dialog" aria-modal="true" aria-labelledby="wb-title">
    <header className="shop-top"><div className="shop-title"><b id="wb-title">월드보스</b><span>함께 도전하는 거대 괴수</span></div><button type="button" className="rpg-win-btn" aria-label="월드보스 창 닫기" onClick={onClose}>닫기 ×</button></header>
    <div className="shop-body wb-content"><p>서버별 공동 토벌 · 첫 시험</p><p aria-live="polite">{a?`${WORLD_BOSS_BY_ID[a.id].name} · ${a.phase==='fight'?`전투 중 ${left(a.expires-clock)}`:a.phase==='clear'?'토벌 완료':'종료 대기'}`:`다음 자연 출현까지 ${left((Math.floor(clock/C.period)+1)*C.period-clock)}`}</p>
      {a?.phase==='fight'&&<button type="button" className="rpg-win-btn wb-primary" disabled={!ready||!atPlaza} onClick={()=>{act('wb',{op:'enter'});onClose();}}>월드보스 성역 입장</button>}
      <p className="wb-rule">광장에서 입장 · 별도 입장 정원 없음 · 서버 정원 {RPG_SERVER_CAP}명<br/>매시간 정각에 한 마리 출현 · 토벌 제한 15분<br/>소환 중에는 추가 소환할 수 없습니다. 모두 서버를 떠나면 진행 중인 전투가 끝납니다.</p>
      <div className="wb-bosses">{WORLD_BOSSES.map((b,i)=><article key={b.id}>
        <div className="wb-portrait" style={{backgroundImage:`url(${C.art})`,backgroundPosition:`${8.3333+i*41.6667}% 14.2857%`}}/>
        <h3>{b.name}</h3><p>{b.sub}</p><p>체력 {b.hp.toLocaleString('ko-KR')}</p>
        <button type="button" className="rpg-win-btn" disabled={!ready||!atPlaza||!!a||self.coins<C.fee} onClick={()=>act('wb',{op:'summon',id:b.id})}>10만 코인으로 소환</button>
      </article>)}</div>
      {!atPlaza&&<p className="wb-rule">소환과 입장은 광장에서 가능합니다.</p>}
      <h3>토벌 보상</h3><p>보스 총 체력의 10%를 초과해 피해를 준 모험가가 받습니다. 10%는 제외합니다. 같은 캐릭터의 기여도는 재입장해도 합산합니다.</p>
      <p>확정: 심장결정 10~20개 · 코인 5만~15만 (100 단위)</p><p>각 무기 2% · 각 방어구 3% · 던전 입장권 30%<br/>대형 회복 물약 65% · 힘·지혜 물약 각25% · 집중 물약 20%</p>
      <p className="wb-rule">추가 보상은 종류별로 독립 추첨합니다. 여러 종류를 함께 얻을 수 있습니다. 총 피해 비율 기준이므로 보상 대상은 최대 9명입니다.</p>
      <h3>보상 수령함 {mail.reduce((n,x)=>n+x.n,0)}개</h3><p>가방에 들어가지 못한 보상은 여기에 보관됩니다.</p>
      {mail.length>0&&<><ul>{mail.map((x,i)=><li key={i}>{lootName(x)} ×{x.n}</li>)}</ul><button type="button" className="rpg-win-btn wb-primary" disabled={!ready} onClick={()=>act('wb',{op:'collect'})}>빈 가방 칸으로 받기</button></>}
    </div></section></>;
}
