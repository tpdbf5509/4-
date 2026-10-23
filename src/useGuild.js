import {useCallback,useEffect,useRef,useState} from 'react';
import {loadChar,ownHero} from './game/rpg.js';
import {guildReport} from './game/guild.js';
import {guildAction} from './net/rpgSave.js';
const ERR={token:'접속 정보를 확인하지 못했습니다. 다시 로그인해 주세요.',live:'현재 서버 접속 상태를 확인해 주세요.',busy:'거래가 끝난 뒤 이용해 주세요.',
 name:'길드 이름은 2~12글자로 적어 주세요.',member:'길드 소속이 바뀌었습니다. 목록을 확인해 주세요.',level:'길드 생성은 50레벨부터 가능합니다.',funds:'길드 생성에 5만 코인이 필요합니다.',
 taken:'이미 사용 중인 길드 이름이거나 처리한 요청입니다.',full:'길드 정원 4명이 가득 찼습니다.',leader:'길드장만 할 수 있습니다.',account:'서버 계정이 있는 이름을 넣어 주세요.',
 missing:'길드를 찾을 수 없습니다.',request:'가입 요청이나 초대가 만료되었습니다.',raid_busy:'진행 중인 토벌이 끝난 뒤 이용해 주세요.',transfer:'다른 길드원에게 길드장을 위임해 주세요.',
 target:'대상 또는 토벌 참여 정보가 바뀌었습니다.',daily:'오늘 출석 보상은 이미 받았습니다.',amount:'봉헌할 길드석 개수를 확인해 주세요.',max:'최대 단계에 도달했습니다.',
 stones:'길드석이 모자랍니다.',cores:'제어 불능 코어가 없습니다.',raids:'오늘 길드 토벌 3회를 모두 사용했습니다.',reward:'지난주 토벌 참여 보상이 없습니다.',claimed:'이번 주 보상을 이미 받았습니다.',
 capacity:'던전 입장권 공간을 비운 뒤 다시 받아 주세요.',early:'토벌 결과를 확인하고 있습니다.',net:'연결을 확인하지 못했습니다. 다시 시도해 주세요.'};
const SUCCESS={create:'길드가 생성되었습니다',apply:'가입 신청을 보냈습니다',invite:'길드 초대를 보냈습니다',join:'길드에 가입했습니다',approve:'가입을 승인했습니다',leave:'길드에서 탈퇴했습니다',kick:'길드원을 내보냈습니다',transfer:'길드장을 위임했습니다',disband:'길드를 해산했습니다',attendance:'길드석 10개 획득',donate:'길드석 봉헌 완료',core:'공격속도가 0.5% 증가했습니다',claim:'주간 길드 보상을 받았습니다'};
export function useGuild(options){
 const current=useRef(options);useEffect(()=>{current.current=options;});
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(null);
 const working=useRef(false),synced=useRef(''),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!notice&&!error)return;const t=setTimeout(()=>{setNotice(null);setError('');},5000);return()=>clearTimeout(t);},[notice,error]);
 const account=()=>{const o=current.current,c=loadChar();return c?.linked&&c.tok&&c.name===o.selfName&&!o.room?.viaServer?c:null;};
 const receive=useCallback(async(r)=>{
   if(!r?.ok)return;
   const o=current.current,h=o.g.heroes[o.seat];if(!h||!ownHero(h,o.seats[o.seat]?.id)||!account())return;
   if(r.charTs>(h.ts||0)&&!await o.trades.recover())throw Error('최신 캐릭터 기록을 다시 확인하고 있습니다.');
   const s={id:r.guild?.id||null,name:r.guild?.name||'',level:r.guild?.level||0,used:r.wallet?.used||0,raid:r.guild?.raid||null};
   const key=JSON.stringify([o.hostId,o.isHost,o.seat,s]);
   if(key!==synced.current){o.act('guild',{op:'sync',state:s});synced.current=key;}
   if(mounted.current)setState(r);
 },[]);
 const refresh=useCallback(async()=>{
   const c=account(),o=current.current;if(!c||working.current||!o.g.heroes[o.seat]?.loaded)return;
   working.current=true;
   try{const r=await guildAction(c.name,c.tok,o.seats[o.seat]?.id);if(account()?.tok===c.tok)await receive(r);if(!r?.ok&&mounted.current)setError(ERR[r?.err]||ERR.net);}
   catch(e){if(mounted.current)setError(e.message);}finally{working.current=false;}
 },[receive]);
 const action=useCallback(async(op,args={})=>{
   const c=account(),o=current.current,h=o.g.heroes[o.seat];if(!c){setError('서버 계정으로 접속한 뒤 길드를 이용해 주세요.');return {ok:false};}
   if(working.current||o.trades.trade||o.trades.busy)return {ok:false};
   working.current=true;setBusy(true);setError('');
   try{
     if(op!=='finish')await o.trades.flush();
     const r=await guildAction(c.name,c.tok,o.seats[o.seat]?.id,op,args);
     if(account()?.tok!==c.tok)throw Error(ERR.token);
     if(!r?.ok)throw Error(ERR[r?.err]||ERR.net);
     await receive(r);
     if(op==='start'){
       o.trades.lock(false);
       const until=Date.now()+6000;while(h.trade&&Date.now()<until)await new Promise(r=>setTimeout(r,100));
       if(h.trade)throw Error('방장 응답을 기다리고 있습니다. 토벌 합류를 눌러 주세요.');
       o.act('guild',{op:'enter'});o.closeAll();
     }else if(op==='finish'){
       o.act('guild',{op:'settled',id:args.id});
       if(args.outcome==='clear'&&!r.already)setNotice({title:'길드 토벌 보상 반영',text:'길드 점수와 참여자의 길드석을 저장했습니다.',success:true});
     }else if(SUCCESS[op])setNotice({title:SUCCESS[op],success:true});
     return r;
   }catch(e){if(mounted.current)setError(e.message);return {ok:false};}
   finally{if(op!=='finish')o.trades.lock(false);working.current=false;if(mounted.current)setBusy(false);if(h&&h.map==='plaza')h.fire=0;}
 },[receive]);
 useEffect(()=>{
   let stopped=false,timer;const tick=async()=>{
     const o=current.current,h=o.g.heroes[o.seat],reports=h?guildReport(o.g,h):[];
     if(reports.length&&!working.current)await action('finish',reports[0]);
     if(!stopped)timer=setTimeout(tick,1000);
   };tick();return()=>{stopped=true;clearTimeout(timer);};
 },[action]);
 useEffect(()=>{refresh();const t=setInterval(refresh,15000);return()=>clearInterval(t);},[refresh]);
 return {state,busy,error,notice,action,refresh,joinRaid:()=>{current.current.act('guild',{op:'enter'});current.current.closeAll();}};
}
