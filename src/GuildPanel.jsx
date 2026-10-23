import {drawGuildBoss,drawGuildStatue} from './game/guildArt.js';
import {useEffect,useRef,useState} from 'react';
import {GUILD as C,GUILD_BOSSES,templeCost} from './game/guildData.js';
const won=n=>(n||0).toLocaleString('ko-KR');
const tabs=[['home','길드'],['temple','성전'],['raid','토벌전'],['rank','주간 순위']];
function GuildPortrait({boss}){
 const canvas=useRef(null);
 useEffect(()=>{const ctx=canvas.current.getContext('2d');ctx.clearRect(0,0,360,320);ctx.save();ctx.translate(180,280);ctx.scale(.85,.85);
   if(boss)drawGuildBoss(ctx,{type:boss.type,x:0,y:0},0);else drawGuildStatue(ctx,{mySeat:0,heroes:[]},{x:0,y:0},0);ctx.restore();},[boss]);
 return <canvas ref={canvas} width={360} height={320} className="guild-portrait" aria-hidden="true"/>;
}
export function GuildHud({run,onLeave}){
 if(!run)return null;
 return <div className="wb-hud guild-hud"><b>길드 토벌 · {GUILD_BOSSES.find(b=>b.id===run.boss)?.name}</b>
 <div><span>{run.phase==='fight'?`남은 시간 ${Math.floor(run.t/60)}분 ${Math.floor(run.t%60)}초`:run.phase==='clear'?'토벌 완료':'토벌 종료'}</span><span>{Math.ceil(run.hp/run.max*100)}%</span></div>
 <progress value={run.hp} max={run.max} aria-label="길드 보스 체력"/>
 <div><span>{won(Math.ceil(run.hp))} / {won(run.max)}</span></div>
 {run.attack&&<div className="wb-pattern"><b>{run.attack.name}</b><span>{run.attack.t.toFixed(1)}초</span></div>}
 <button type="button" className="rpg-win-btn" onClick={onLeave}>광장으로</button></div>;
}
export default function GuildPanel({api,self,selfName,onClose}){
 const [tab,setTab]=useState('home'),[name,setName]=useState(''),[invite,setInvite]=useState(''),[amount,setAmount]=useState('10'),[confirm,setConfirm]=useState('');
 const box=useRef(null),refresh=api.refresh;
 useEffect(()=>{const prev=document.activeElement;box.current?.focus();refresh();return()=>prev?.focus?.();},[refresh]);
 const key=e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){
   const nodes=[...box.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=nodes[0],last=nodes.at(-1);
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===box.current)){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }};
 const s=api.state,g=s?.guild,w=s?.wallet||{},myKey=selfName.normalize('NFKC').trim().toLowerCase(),leader=g&&(g.leader===myKey||!g.leader);
 const ready=self?.loaded&&self.down<=0&&self.map==='plaza'&&self.dvs<0&&!self.trade&&!api.busy;
 const doAct=(op,args)=>{setConfirm('');return api.action(op,args);};
 const dangerous=(id,op,args,label)=>confirm===id?<span className="guild-confirm"><b>{label}하시겠습니까?</b><button type="button" className="rpg-win-btn" disabled={!ready} onClick={()=>doAct(op,args)}>확정</button><button type="button" className="rpg-win-btn" onClick={()=>setConfirm('')}>취소</button></span>:<button type="button" className="rpg-win-btn" disabled={!ready||!!g?.raid} onClick={()=>setConfirm(id)}>{label}</button>;
 return <><div className="rpg-menu-back" onClick={onClose}/><section ref={box} tabIndex={-1} className="shop guild-panel" role="dialog" aria-modal="true" aria-labelledby="guild-title" onKeyDown={key}>
 <header className="shop-top"><div className="shop-title"><b id="guild-title">{g?g.name:'길드 성전'}</b><span>{g?`${g.members.length}/4명 · 성전 Lv ${g.level}`:'네 명이 함께 키우는 길드'}</span></div><button type="button" className="rpg-win-btn" onClick={onClose}>닫기 ×</button></header>
 <nav className="shop-tabs" aria-label="길드 화면">{tabs.map(([id,label])=><button type="button" key={id} className={tab===id?'on':''} aria-pressed={tab===id} onClick={()=>{setTab(id);setConfirm('');}}>{label}</button>)}</nav>
 <div className="shop-body guild-content" aria-busy={api.busy}>
 {api.error&&<p role="alert" className="guild-error">{api.error}</p>}
 {!s?<p>길드 기록을 불러오는 중입니다. 서버 계정으로 접속해 주세요.<button type="button" className="rpg-win-btn" onClick={api.refresh}>다시 불러오기</button></p>:<>
 <div className="guild-wallet"><span>길드석 <b>{won(w.stones)}</b></span><span>제어 불능 코어 <b>{w.cores||0}</b></span><span>공격속도 <b>+{((w.used||0)*.5).toFixed(1)}%</b></span></div>
 {!ready&&<p className="wb-rule">길드 관리는 광장에서 가능합니다. 거래·전투 중에는 먼저 마쳐 주세요.</p>}
 {tab==='home'&&(!g?<>
 <h3>새 길드 만들기</h3><p>50레벨 이상 · 생성비 50,000코인 · 정원 4명</p>
 <form onSubmit={e=>{e.preventDefault();doAct('create',{name});}} className="guild-form"><label>길드 이름<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={12} required placeholder="2~12글자"/></label><button type="submit" className="rpg-win-btn wb-primary" disabled={!ready||self.lv<50||self.coins<C.fee}>5만 코인으로 생성</button></form>
 {s.invites?.length>0&&<><h3>받은 초대</h3>{s.invites.map(x=><article className="guild-row" key={x.id}><b>{x.name}</b><button type="button" className="rpg-win-btn" disabled={!ready} onClick={()=>doAct('join')}>가입하기</button></article>)}</>}
 <h3>모험가들의 길드</h3><p className="wb-rule">가입 신청은 한 곳만 유지됩니다. 길드장이 승인하면 가입합니다.</p>
 {s.directory.map(x=><article key={x.id} className="guild-row"><span><b>{x.name}</b><small>성전 Lv {x.level} · {x.members}/4명</small></span><button type="button" className="rpg-win-btn" disabled={!ready||x.members>=4} onClick={()=>doAct('apply',{id:x.id})}>가입 신청</button></article>)}
 </>:<>
 <h3>길드원</h3>{g.members.map(m=><article className="guild-row" key={m.key}><span><b>{m.name}{g.leader===m.key?' · 길드장':''}</b><small>Lv {m.lv} · {m.server?`서버 ${m.server.slice(3)}`:'오프라인'}</small></span>{leader&&m.key!==myKey&&<div>{dangerous(`transfer:${m.key}`,'transfer',{name:m.key},'길드장 위임')}{dangerous(`kick:${m.key}`,'kick',{name:m.key},'내보내기')}</div>}</article>)}
 <div className="guild-row"><span>오늘의 길드 활동<small>출석으로 길드석 10개를 받습니다.</small></span><button type="button" className="rpg-win-btn" disabled={!ready||w.checked} onClick={()=>doAct('attendance')}>{w.checked?'오늘 출석 완료':'길드 출석'}</button></div>
 {leader&&<><h3>길드원 초대</h3><form className="guild-form" onSubmit={e=>{e.preventDefault();doAct('invite',{name:invite});}}><label>캐릭터 이름<input value={invite} maxLength={8} required onChange={e=>setInvite(e.target.value)}/></label><button type="submit" className="rpg-win-btn" disabled={!ready||g.members.length>=4}>초대 보내기</button></form>
 {g.requests.map(x=><article className="guild-row" key={x.key}><b>{x.name} · 가입 신청</b><button type="button" className="rpg-win-btn" disabled={!ready||g.members.length>=4} onClick={()=>doAct('approve',{name:x.key})}>가입 승인</button></article>)}</>}
 <div className="guild-actions">{dangerous('leave','leave',{},'길드 탈퇴')}{leader&&dangerous('disband','disband',{},'길드 해산')}</div><p className="wb-rule">해산하면 성전 성장은 복구되지 않습니다. 이미 획득한 개인 길드석·코어와 주간 참여 기록은 유지합니다.</p>
 </>)}
 {tab==='temple'&&<>
 <GuildPortrait/><h3>여신의 성전 · Lv {g?.level||0} / 70</h3>
 <p>성전 레벨마다 길드원의 공격력과 최대 체력이 0.5%씩 증가합니다. 현재 <b>+{((g?.level||0)*.5).toFixed(1)}%</b></p>
 {g?<><progress max={templeCost(g.level)} value={g.level===70?templeCost(70):g.exp} aria-label="다음 성전 레벨까지 봉헌량"/><p>{g.level===70?'최대 레벨입니다':`${won(g.exp)} / ${won(templeCost(g.level))} 길드석`}</p>
 <form className="guild-form" onSubmit={e=>{e.preventDefault();doAct('donate',{n:Math.floor(Number(amount))});}}><label>봉헌할 길드석<input type="number" min="1" max="999999" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><button type="submit" className="rpg-win-btn wb-primary" disabled={!ready||g.level>=70||w.stones<1}>길드석 봉헌</button></form></>:<p>길드에 가입하면 성전을 성장시킬 수 있습니다.</p>}
 <h3>제어 불능 코어</h3><p>1개 사용 시 공격속도 +0.5%. 누적 최대 +20%입니다. 길드를 옮겨도 사용한 효과는 유지합니다.</p><button type="button" className="rpg-win-btn" disabled={!ready||!w.cores||w.used>=40} onClick={()=>doAct('core')}>코어 1개 사용 · {(w.used||0)/2}% → {Math.min(20,((w.used||0)+1)/2)}%</button>
 </>}
 {tab==='raid'&&<>
 <h3>길드 토벌전</h3><p>길드원끼리 같은 서버에서 도전합니다. 토벌은 길드 전체 하루 3회 · 제한 10분입니다. 시작하면 실패해도 횟수를 씁니다.</p><p className="wb-rule">전투는 해당 서버에 유지됩니다. 방장 승계는 지원하며 모두 퇴장하거나 시간 초과면 실패합니다. 실제 피해를 준 최초 참여자에게 길드석을 지급합니다. 토벌 중 새로 가입한 길드원은 다음 토벌부터 참여합니다.</p>
 <p>오늘 사용 {g?.used||0}/3회 · 이번 주 {won(g?.points)}점</p>
 {g?.raid&&<article className="guild-row"><b>토벌 진행 중 · 서버 {g.raid.server.slice(3)}</b><button type="button" className="rpg-win-btn wb-primary" disabled={!ready||g.raid.server!==self.server||!g.raid.members.includes(myKey)} onClick={api.joinRaid}>토벌 합류</button></article>}
 <div className="wb-bosses">{GUILD_BOSSES.map(b=><article key={b.id}><GuildPortrait boss={b}/><h3>{b.name}</h3><p>체력 {won(b.hp)}</p><p>처치 +{b.points}점<br/>참여자마다 길드석 {b.stones}개</p><button type="button" className="rpg-win-btn" disabled={!ready||!g||!!g.raid||g.used>=3} onClick={()=>doAct('start',{boss:b.id})}>토벌 시작</button></article>)}</div>
 </>}
 {tab==='rank'&&<>
 <h3>주간 길드 토벌 순위</h3><p>한국 시간 매주 월요일 0시 초기화 · 동점은 공동 순위입니다.</p><p className="wb-rule">다음 초기화 전 지난주 보상을 받아 주세요. 다음 집계: {new Date(s.reset).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p>
 {s.reward?<div className="guild-row"><span><b>지난주 {s.reward.rank}위 보상</b><small>지난주 토벌에 기여한 길드 기준 · 캐릭터당 한 번</small></span><button type="button" className="rpg-win-btn wb-primary" disabled={!ready||s.reward.claimed} onClick={()=>doAct('claim')}>{s.reward.claimed?'수령 완료':'주간 보상 받기'}</button></div>:<p>지난주 토벌 참여 보상이 없습니다.</p>}
 <table className="guild-table"><caption>순위별 주간 보상</caption><thead><tr><th>순위</th><th>코어</th><th>코인</th><th>길드석</th><th>입장권</th></tr></thead><tbody>{[['1위',5,'15만',100,3],['2~3위',3,'10만',70,3],['4~10위',2,'7만',50,1],['그 외',1,'5만',30,1]].map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table>
 {s.ranks.length?s.ranks.map(x=><article className="guild-row" key={x.guild_id}><b>{x.rank}위 · {x.name}</b><span>{won(x.points)}점</span></article>):<p>이번 주 첫 토벌에 도전해 보세요.</p>}
 </>}
 </>}
 </div></section></>;
}
