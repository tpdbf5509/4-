import {useState} from 'react';
import {RQ,rqGoal,rqMap,RQ_LINES} from './game/requiemData.js';
import {BLOOD_GUN_ITEM,BLOOD_SKILLS} from './game/bloodGunData.js';
import {GRADES} from './game/shopData.js';
import './requiem.css';
export default function RequiemHud({hero:h}) {
  const [closed,setClosed]=useState(false);
  const q=h.bag?.rq, s=h.rqRun, b=h.rqBoss;
  if(!q)return null;
  const t=s?.reveal||0, reward=q.rewarded&&t>=RQ.reveal&&!closed;
  const line=t>=4.5?'크림슨 레퀴엠의 봉인이 해제됩니다.':t>=2.5?'[폐기 명령 취소]\n실험체 001의 생존을 확인했습니다.\n무기 동기화가 시작됩니다.':'';
  return <>
    {!q.rewarded&&<aside className="rq-guide"><b>{RQ.name}</b><p>{rqGoal(h)}</p>{rqMap(h.map)&&<small>장치: 왼쪽 핵 · 중앙 원 · 오른쪽 사슬<br/>E 키 또는 조사 단추로 문과 유리관을 조사합니다.</small>}</aside>}
    {b&&<div className="rq-boss" role="status"><b>봉인 감시자 RQ-0 · {b.phase}페이즈</b><progress value={b.hp} max={b.max}/><small>{Math.ceil(b.hp).toLocaleString()} / {b.max.toLocaleString()}{b.shield>0&&b.phase===1?' · 전면 방패 활성':''}</small></div>}
    {!!s?.door&&<div className="rq-caption">{RQ_LINES[Math.min(3,Math.floor(s.door/.65))]}</div>}
    {t>0&&t<RQ.reveal&&rqMap(h.map)&&<div className="rq-cinema" style={{background:t>=.5?'rgba(8,2,4,.65)':'transparent'}}><div className="rq-caption">{line}</div></div>}
    {reward&&<section className="shop rq-reward" role="dialog" aria-label="전설 무기 획득"><header className="shop-top"><b>전설 무기 획득</b><button className="shop-x" onClick={()=>setClosed(true)}>×</button></header><div className="shop-body"><img src="/assets/game/rpg/weapons/blood_gun.webp" alt="크림슨 레퀴엠"/><h2>{BLOOD_GUN_ITEM.name}</h2><p>등급: {GRADES[BLOOD_GUN_ITEM.g].name} · 전용 직업: BLOOD-001</p><p>물리력 +{BLOOD_GUN_ITEM.amt}</p><p>전용 스킬: {BLOOD_SKILLS.blood_gun.name}</p><p>피로 태어난 자에게 마지막 노래를 바친다.</p><button className="shop-btn main" onClick={()=>setClosed(true)}>확인</button></div></section>}
  </>;
}
