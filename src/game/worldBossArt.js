/* 월드보스 전용 그림과 위험지역. 기존 캐릭터 스킬 효과는 재사용하지 않는다.
   공격 · 독 웅덩이 · 기절 · 합동 공격 · 토벌 연출은 pixelfx 픽셀 시트(worldBossPxArt.js)로 먼저 그리고, 못 불러오면 아래 코드 그림으로 그린다. */
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_TYPE,WORLD_BOSS_PATTERNS} from './worldBossData.js';
import {bloom,sparks,ring,bolt} from './combatFx.js';
import {worldBossCoopOpen} from './worldBoss.js';
import {VOID_TONE,drawVoidGround,drawVoidImpact,drawVoidSigil} from './voidBossArt.js';
import {wbIntroScene} from './worldBossIntro.js';
import {WB_INTRO as I} from './worldBossIntroData.js';
import {warmWorldBossPx,drawWbWarnPx,drawWbPoolPx,drawWbStunPx,drawWbHitPx,drawWbBreakPx,drawWbFallPx,drawWbDoomSigilPx} from './worldBossPxArt.js';
const TAU=Math.PI*2;
const TONES={dragon:['#96351d','#ff873b','#fff1bf'],serpent:['#48315e','#a9e66e','#f2ffd4'],machine:['#235476','#68dafa','#f0fcff'],thunderbird:['#403879','#a7a2ff','#e6fbff'],void:VOID_TONE};
let atlas;
const bossImages={};
function bossImage(src){
  if(typeof Image==='undefined')return null;
  if(bossImages[src]===undefined){const im=bossImages[src]=new Image();im.onerror=()=>{bossImages[src]=null;};im.src=src;}
  const im=bossImages[src];return im?.complete&&im.naturalWidth?im:null;
}
export function warmWorldBossArt(){
  if(typeof Image==='undefined')return null;
  WORLD_BOSSES.forEach(b=>{if(b.art)bossImage(b.art.src);});warmWorldBossPx();
  if(atlas===undefined){atlas=new Image();atlas.onerror=()=>{atlas=null;};atlas.src=C.art;}
  return atlas?.complete&&atlas.naturalWidth?atlas:null;
}
function path(ctx,s){
  ctx.beginPath();
  if(s.shape==='ring'){ctx.arc(0,0,s.r,0,Math.PI*2);ctx.arc(0,0,s.inner,0,Math.PI*2,true);}
  else if(s.shape==='outside'){ctx.rect(-s.x,-s.y/C.squash,C.w,C.h/C.squash);ctx.moveTo(s.r,0);ctx.arc(0,0,s.r,0,TAU,true);}
  else if(s.shape==='shelter'){ctx.rect(-s.x,-s.y/C.squash,C.w,C.h/C.squash);s.safes.forEach(z=>{const x=z.x-s.x,y=(z.y-s.y)/C.squash;ctx.moveTo(x+z.r,y);ctx.arc(x,y,z.r,0,TAU,true);});}
  else if(s.shape==='circle')ctx.arc(0,0,s.r,0,Math.PI*2);
  else if(s.shape==='cone'){ctx.moveTo(0,0);ctx.arc(0,0,s.len,s.a-s.arc,s.a+s.arc);ctx.closePath();}
  else{ctx.rotate(s.a);ctx.rect(-40,-s.width,s.len+40,s.width*2);}
}
function paintArea(ctx,s,color,alpha,dashed=false){
  ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);path(ctx,s);
  ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.fill('evenodd');ctx.globalAlpha/=Math.max(.01,alpha);ctx.strokeStyle=color;ctx.lineWidth=3;
  if(dashed)ctx.setLineDash([12,8]);ctx.stroke();ctx.restore();
}
function runeHalo(ctx,x,y,r,t,color,quality=1){
  ring(ctx,x,y,r,C.squash,color,.7,2);ring(ctx,x,y,r*.82,C.squash,color,.4,1);
  const n=Math.max(6,Math.round(14*quality));ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;
  for(let i=0;i<n;i++){const a=i*TAU/n+t*.45,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*C.squash;
    ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(0,-8);ctx.lineTo(6,0);ctx.lineTo(0,8);ctx.closePath();ctx.stroke();ctx.restore();}
  ctx.restore();
}
function fallingRock(ctx,x,y,progress,r,tone){
  const dy=380*(1-progress),px=x+dy*.32,py=y-dy;
  ctx.save();ctx.globalAlpha*=Math.min(1,progress*3);ctx.strokeStyle=tone[1];ctx.lineCap='round';
  for(let i=0;i<5;i++){ctx.lineWidth=10-i*1.5;ctx.globalAlpha*=.85;ctx.beginPath();ctx.moveTo(px+i*5,py-i*5);ctx.lineTo(px+55+i*8,py-140-i*13);ctx.stroke();}
  ctx.globalAlpha=1;ctx.fillStyle=tone[0];ctx.strokeStyle=tone[2];ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<7;i++){const a=i*TAU/7,rr=r*(i%2?.7:1);if(i)ctx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr);else ctx.moveTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();
  bloom(ctx,px,py,r*2,tone[1],.6);ctx.restore();
}
/* 즉사 기술 — 칠한 자리는 톤다운 장밋빛, 피할 자리는 다른 경고와 같은 청록 고리 · '안전지대' 글자로 보인다 */
const DOOM_COLOR='#c46a7e',SAFE='#96f7ec';
function safeLabel(ctx,x,y){ctx.save();ctx.fillStyle='#b9fff0';ctx.strokeStyle='#203333';ctx.lineWidth=4;ctx.textAlign='center';ctx.font="18px 'Do Hyeon',sans-serif";ctx.strokeText('안전지대',x,y);ctx.fillText('안전지대',x,y);ctx.restore();}
function drawDoomSafe(ctx,s,a,p){
  const pulse=.75+.25*Math.sin(p*TAU*3);
  if(s.shape==='shelter')s.safes.forEach(z=>{ring(ctx,z.x,z.y,z.r,C.squash,SAFE,.95*pulse,4);ring(ctx,z.x,z.y,z.r*.86,C.squash,SAFE,.4,1);safeLabel(ctx,z.x,z.y+7);});
  else if(s.shape==='ring'){ring(ctx,s.x,s.y,s.inner,C.squash,SAFE,.95*pulse,4);safeLabel(ctx,s.x,s.y+s.inner*C.squash+26);}
  else if(s.shape==='circle'){ring(ctx,s.x,s.y,s.r,C.squash,DOOM_COLOR,.95,4);ring(ctx,s.x,s.y,s.r+24,C.squash,SAFE,.7*pulse,2);}
  else if(s.shape==='cone'){
    // 등 뒤 안전 부채꼴 — 가장자리 두 줄과 글자
    const back=s.a+Math.PI,half=Math.PI-s.arc,r=260;
    ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);ctx.strokeStyle=SAFE;ctx.globalAlpha=.9*pulse;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,back-half,back+half);ctx.closePath();ctx.stroke();ctx.restore();
    safeLabel(ctx,s.x+Math.cos(back)*r*.7,s.y+Math.sin(back)*r*.7*C.squash+7);
  }
}
export function drawWorldBossGround(ctx,g,map,quality=1){
  if(map!==C.map||!g.wb?.active)return;
  const a=g.wb.active,t=g.t,tone=TONES[a.id];
  introGround(ctx,a,tone,quality);   // 등장 연출 — 보스마다 다른 바닥 효과(본 연출 중에만, 공격 예고가 오면 곧바로 꺼진다)
  a.pools.forEach((p,j)=>{paintArea(ctx,p,'#9563b2',.3);if(drawWbPoolPx(ctx,p,t))return;const n=Math.max(3,Math.round(8*quality));ctx.save();ctx.strokeStyle=tone[1];ctx.lineWidth=2;ctx.globalAlpha=.55;
    for(let i=0;i<n;i++){const angle=i*2.39996+j,d=p.r*(.2+.65*((i*17%29)/29));ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*d,p.y+Math.sin(angle)*d*C.squash-Math.sin(t*3+i)*7,3+(i%3),0,TAU);ctx.stroke();}ctx.restore();});
  if(a.stun>0){runeHalo(ctx,a.x,a.y,130,t,'#ffe19a',quality);return;}
  if(a.attack){
    const attack=a.attack,p=Math.max(0,Math.min(1,1-attack.t/attack.life)),open=worldBossCoopOpen(a),doom=WORLD_BOSS_PATTERNS[attack.kind]?.doom;
    attack.areas.forEach((s,i)=>{
      paintArea(ctx,s,open?'#ffe49c':doom?DOOM_COLOR:a.id==='void'?tone[1]:attack.major?'#ee956e':'#f7b267',doom?.16+p*.26:.12+p*.2,true);
      if(doom){drawDoomSafe(ctx,s,a,p);return;}
      if(s.shape==='outside'){
        ring(ctx,s.x,s.y,s.r,C.squash,'#96f7ec',.95,4);
        ring(ctx,s.x,s.y,s.r*.88,C.squash,'#96f7ec',.4,1);
        ctx.save();ctx.fillStyle='#b9fff0';ctx.strokeStyle='#203333';ctx.lineWidth=4;ctx.textAlign='center';ctx.font="18px 'Do Hyeon',sans-serif";
        ctx.strokeText('안전지대',s.x,s.y+12);ctx.fillText('안전지대',s.x,s.y+12);ctx.restore();
      }
      if(a.id==='thunderbird'&&s.shape==='line'){
        ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);ctx.rotate(s.a);
        // 화살촉과 깃털 표식으로 경로 방향을 표시한다.
        ctx.strokeStyle=tone[2];ctx.lineWidth=2;ctx.globalAlpha=.5+p*.5;
        const n=attack.kind==='thunder_feathers'?3:5;
        for(let j=1;j<=n;j++){const x=s.len*j/(n+1);ctx.beginPath();ctx.moveTo(x-12,-9);ctx.lineTo(x,0);ctx.lineTo(x-12,9);ctx.stroke();}
        ctx.restore();
      }
      if(s.shape==='circle'){
        ring(ctx,s.x,s.y,s.r*(.2+.8*p),C.squash,tone[1],.65,2);
        if(drawWbWarnPx(ctx,a.id,s,p))return;
        if(a.id==='dragon'&&p>.35)fallingRock(ctx,s.x,s.y,(p-.35)/.65,attack.major?28:19,tone);
        if(a.id==='machine'||a.id==='thunderbird')bolt(ctx,s.x+18,s.y-170,s.x,s.y-15,tone,1-p,2,i);
      }
    });
    if(a.id==='void')drawVoidGround(ctx,a,attack,p,t,quality);   // 중력장 소용돌이 · 공간 절단 눈금 · 포탈
    if(attack.major&&attack.step===0){
      const color=open?'#ffe49c':doom?DOOM_COLOR:tone[1];runeHalo(ctx,a.x,a.y,130+45*p,t,color,quality);
      bloom(ctx,a.x,a.y-150,150,color,.18+p*.3);
    }
    ctx.save();ctx.fillStyle=open?'#ffe49c':'#fff0c2';ctx.strokeStyle='#2d1b13';ctx.lineWidth=5;ctx.font="bold 24px 'Do Hyeon',sans-serif";ctx.textAlign='center';
    const P=WORLD_BOSS_PATTERNS[attack.kind],hint=attack.kind==='thunder_dive'&&attack.step?P.landHint:P?.hint;
    const label=open?`약점 노출! 함께 공격 ${(attack.coop||[]).length}/${C.coop.players}`:`${doom?'즉사 · ':''}${attack.name||'공격 준비'} ${attack.step+1}/${attack.stages} · ${attack.diving?'급강하!':`${Math.max(0,attack.t).toFixed(1)}초`}`;
    ctx.strokeText(label,a.x,a.y+65);ctx.fillText(label,a.x,a.y+65);ctx.restore();
    if(hint&&!open){ctx.save();ctx.textAlign='center';ctx.font="18px 'Do Hyeon',sans-serif";ctx.lineWidth=4;ctx.strokeStyle='#211b2b';ctx.fillStyle='#d7f5ff';ctx.strokeText(hint,a.x,a.y+91);ctx.fillText(hint,a.x,a.y+91);ctx.restore();}
  }
}
export function drawWorldBossSprite(ctx,m,time,state,quality=1){
  const B=WORLD_BOSS_BY_TYPE[m.type];if(!B)return false;
  const shared=warmWorldBossArt(),row=m.pose?1:0;
  const im=B.art?bossImage(B.art.src):shared,col=B.art?row:WORLD_BOSSES.indexOf(B);
  const size=B.art?.size||C.artSize,bob=m.pose?0:Math.sin(time*2)*3;
  const feet=B.art?B.art.feet[row]:C.artFeet[row][col];
  const draw=c=>{
    if(im){const cw=im.naturalWidth/(B.art?.cols||C.artCols),ch=im.naturalHeight/(B.art?.rows||C.artRows);
      c.imageSmoothingEnabled=false;c.drawImage(im,col*cw,(B.art?0:row)*ch,cw,ch,-size*.5,-size*feet,size,size);}
    else if(B.id==='thunderbird')drawThunderbirdFallback(c,m.pose);
    else{c.fillStyle=B.color;c.strokeStyle='#362315';c.lineWidth=5;c.beginPath();c.ellipse(0,-110,105,110,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#fff2bb';c.fillRect(-50,-155,20,10);c.fillRect(30,-155,20,10);c.beginPath();c.moveTo(-80,-185);c.lineTo(-100,-260);c.lineTo(-30,-205);c.moveTo(80,-185);c.lineTo(100,-260);c.lineTo(30,-205);c.fill();}
  };
  // 등장 연출 — 보스마다 다른 모습으로 나타난다(worldBossIntro.js). 판정 위치는 그대로, 그림만 옮기고 가린다
  const sc=wbIntroScene(B.id),body=sc&&sc.e<I.life?sc:null;
  ctx.save();ctx.translate(m.x,m.y+bob);
  ctx.fillStyle='rgba(15,10,10,.3)';ctx.beginPath();
  const sh=body?introShadow(body):1;ctx.ellipse(0,0,105*sh,28*sh,0,0,Math.PI*2);ctx.fill();
  if(B.id==='thunderbird'&&state?.attack?.kind==='thunder_dive'&&!state.attack.step){
    const attack=state.attack,p=Math.max(0,Math.min(1,1-attack.t/attack.life));
    const lift=attack.diving?80*(1-p):80*p;ctx.translate(0,-lift);
    if(attack.diving){const s=attack.areas[0];ctx.save();ctx.scale(1,C.squash);ctx.rotate(s.a);
      for(const side of [-1,1]){ctx.strokeStyle='#a7eaff';ctx.lineWidth=4;ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(-160,side*40);ctx.lineTo(30,side*22);ctx.stroke();}ctx.restore();}
  }
  if(body)introBody(ctx,body,draw,size);else draw(ctx);
  ctx.restore();
  if(sc)introOver(ctx,m,sc,TONES[B.id]||TONES.dragon,size,quality);
  // 즉사 기술 예고 — 보스 머리 위 저주 문양(그림 위에 보이게 몸 다음에 그린다)
  const doomAt=state?.attack&&WORLD_BOSS_PATTERNS[state.attack.kind]?.doom;
  if(doomAt&&!worldBossCoopOpen(state)){const dp=Math.max(0,Math.min(1,1-state.attack.t/state.attack.life));if(B.id==='void')drawVoidSigil(ctx,m.x,m.y,dp,time);else drawWbDoomSigilPx(ctx,m.x,m.y,dp);}
  if(state?.stun>0){
    if(drawWbStunPx(ctx,m.x,m.y,time))return true;
    ctx.save();ctx.strokeStyle='#ffe6a3';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y-290,70,20,0,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++){const a=time*3+i*TAU/4,x=m.x+Math.cos(a)*70,y=m.y-290+Math.sin(a)*20;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#ffe6a3';ctx.beginPath();for(let j=0;j<10;j++){const r=j%2?4:10,theta=j*Math.PI/5;ctx.lineTo(Math.cos(theta)*r,Math.sin(theta)*r);}ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();
  }else if(worldBossCoopOpen(state)){
    const y=m.y-150;runeHalo(ctx,m.x,y,55,time*2,'#ffe19a',quality);bloom(ctx,m.x,y,65,'#fff1bc',.65);
    ctx.save();ctx.strokeStyle='#fff5cf';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(m.x-18,y);ctx.lineTo(m.x+18,y);ctx.moveTo(m.x,y-18);ctx.lineTo(m.x,y+18);ctx.stroke();ctx.restore();
  }
  return true;
}
// 원화 로딩 실패 시에도 새 실루엣을 알아볼 수 있게 날개·부리·꼬리를 남긴다.
function drawThunderbirdFallback(ctx,charged){
  ctx.fillStyle='#444975';ctx.strokeStyle='#9adfff';ctx.lineWidth=3;
  for(const sign of [-1,1]){
    ctx.beginPath();ctx.moveTo(sign*35,-140);ctx.lineTo(sign*225,charged?-330:-210);
    ctx.lineTo(sign*190,-120);ctx.lineTo(sign*150,-150);ctx.lineTo(sign*100,-90);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(-28,-75);ctx.lineTo(-50,10);ctx.lineTo(0,-10);ctx.lineTo(40,10);ctx.lineTo(25,-75);ctx.fill();
  ctx.fillStyle='#7581b5';ctx.beginPath();ctx.ellipse(0,-110,45,75,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(-5,-185,32,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#e4faff';ctx.beginPath();ctx.moveTo(-25,-190);ctx.lineTo(-65,-174);ctx.lineTo(-28,-165);ctx.fill();
  ctx.fillStyle='#b7ffff';ctx.fillRect(-21,-194,11,5);
}
function fireImpact(ctx,f,p,q,tone){
  const s=f.area;if(!s)return;
  if(s.shape==='cone'){
    ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);const n=Math.max(7,Math.round(20*q));ctx.lineCap='round';
    for(let i=0;i<n;i++){const a=s.a-s.arc+s.arc*2*i/(n-1),d=s.len*(.2+.8*p),w=(1-p)*(12+i%4*3);
      ctx.strokeStyle=i%3?tone[1]:tone[2];ctx.lineWidth=Math.max(1,w);ctx.globalAlpha=(1-p)*.8;ctx.beginPath();ctx.moveTo(Math.cos(a)*d*.2,Math.sin(a)*d*.2);ctx.quadraticCurveTo(Math.cos(a+.08)*d*.65,Math.sin(a+.08)*d*.65,Math.cos(a)*d,Math.sin(a)*d);ctx.stroke();}ctx.restore();
  }else{
    const r=s.r||170;ring(ctx,f.x,f.y,r*(.2+p),C.squash,tone[1],1-p,6*(1-p)+1);
    if(s.shape==='ring')ring(ctx,f.x,f.y,s.inner||100,C.squash,tone[2],1-p,4);
    bloom(ctx,f.x,f.y-25,r*.85,tone[1],.65*(1-p));
    ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=(1-p)**1.5;ctx.strokeStyle=tone[2];ctx.lineWidth=2;
    const n=Math.max(6,Math.round(14*q));for(let i=0;i<n;i++){const a=i*TAU/n,d=r*(.2+p*.8);ctx.beginPath();ctx.moveTo(Math.cos(a)*d*.3,Math.sin(a)*d*.3*C.squash);ctx.lineTo(Math.cos(a+.1)*d*.7,Math.sin(a+.1)*d*.7*C.squash);ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d*C.squash);ctx.stroke();}ctx.restore();
  }
}
function poisonImpact(ctx,f,p,q,tone){
  const r=Math.min(520,f.area?.r||150);ring(ctx,f.x,f.y,r*(.4+p*.6),C.squash,tone[1],1-p,5);
  if(f.area?.shape==='ring')ring(ctx,f.x,f.y,f.area.inner,C.squash,tone[2],1-p,3);
  const n=Math.max(5,Math.round(12*q));ctx.save();ctx.globalAlpha=(1-p)**1.4;
  for(let i=0;i<n;i++){const a=i*TAU/n,d=r*(.3+p*.5),x=f.x+Math.cos(a)*d,y=f.y+Math.sin(a)*d*C.squash;
    ctx.fillStyle=i%2?tone[1]:tone[2];ctx.beginPath();ctx.moveTo(x-8,y);ctx.quadraticCurveTo(x+Math.sin(a)*18,y-110*(1-p),x+20,y-150*(1-p));ctx.quadraticCurveTo(x+14,y-20,x+8,y+8);ctx.closePath();ctx.fill();}ctx.restore();
}
function electricImpact(ctx,f,p,q,tone){
  const s=f.area;if(s?.shape==='line'){
    const dx=Math.cos(s.a)*s.len,dy=Math.sin(s.a)*s.len*C.squash;
    for(const [width,color,alpha]of [[s.width*2,tone[0],.4],[s.width*.65,tone[1],.7],[s.width*.12,tone[2],1]]){
      ctx.save();ctx.globalAlpha=(1-p)*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+dx,s.y+dy);ctx.stroke();ctx.restore();}
    bolt(ctx,s.x,s.y,s.x+dx,s.y+dy,tone,p,4,f.seed);
  }else{
    const r=s?.r||150;
    bolt(ctx,f.x+25,f.y-550,f.x,f.y,tone,p,f.major?8:5,f.seed);
    ring(ctx,f.x,f.y,r*(.2+p*.8),C.squash,tone[1],1-p,5);
    const n=Math.max(4,Math.round(8*q));for(let i=0;i<n;i++){const a=i*TAU/n;bolt(ctx,f.x,f.y,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r*C.squash,tone,p,2,i);}
  }
}
function thunderbirdImpact(ctx,f,p,q,tone){
  const s=f.area;
  if(f.pattern==='thunder_feathers'&&s?.shape==='line'){
    ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);ctx.rotate(s.a);
    const x=s.len,fade=(1-p)**.7;
    ctx.globalAlpha=fade;ctx.strokeStyle=tone[1];ctx.lineWidth=s.width*1.2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(x,0);ctx.stroke();
    // 깃털의 뾰족한 끝이 예고한 좁은 경로를 따라 날아간다.
    ctx.fillStyle=tone[2];
    for(let j=1;j<=3;j++){const at=x*Math.min(1,j*.28+p*.12);ctx.beginPath();ctx.moveTo(at+22,0);ctx.lineTo(at-30,-12);ctx.lineTo(at-8,0);ctx.lineTo(at-30,12);ctx.closePath();ctx.fill();}ctx.restore();
  }else if(s?.shape==='outside'){
    // 안전 원 안에는 낙뢰를 그리지 않는다. 폭풍은 안전 경계 밖에서 번쩍인다.
    const n=Math.max(4,Math.round(10*q));
    for(let i=0;i<n;i++){const a=i*TAU/n,r=s.r+100+(i%3)*85,x=s.x+Math.cos(a)*r,y=s.y+Math.sin(a)*r*C.squash;
      if(f.nextSafe&&Math.hypot(x-f.nextSafe.x,(y-f.nextSafe.y)/C.squash)<f.nextSafe.r+40)continue;
      bolt(ctx,x+10,y-220,x,y,tone,p,3,i);}
  }else if(s?.shape==='ring'){
    ring(ctx,s.x,s.y,s.r,C.squash,tone[1],1-p,6);
    ring(ctx,s.x,s.y,s.inner,C.squash,tone[2],1-p,3);
    const n=Math.max(4,Math.round(12*q));
    for(let i=0;i<n;i++){const a=i*TAU/n,r=(s.r+s.inner)/2;
      const x=s.x+Math.cos(a)*r,y=s.y+Math.sin(a)*r*C.squash;bolt(ctx,x,y-70,x,y,tone,p,2,i);}
  }else electricImpact(ctx,f,p,q,tone);
}
export function drawWorldBossFx(ctx,f,p,quality){
  if(f.kind==='sk_raid_end')return drawWbFallPx(ctx,f,p);
  if(f.kind==='sk_raid_break'){
    if(drawWbBreakPx(ctx,f,p))return true;
    const tone=['#9d6f2c','#ffe09a','#fff9de'];
    bloom(ctx,f.x,f.y,230,tone[1],.8*(1-p));ring(ctx,f.x,f.y,40+p*210,.75,tone[2],1-p,5);
    sparks(ctx,f.x,f.y,290,p,tone,quality,36,5);return true;
  }
  if(f.kind!=='sk_raid_hit')return false;
  const tone=TONES[f.tone]||TONES.dragon;
  ctx.save();if(f.area&&f.area.shape!=='outside')paintArea(ctx,f.area,tone[1],(1-p)*.23);
  if(f.tone==='void'){drawVoidImpact(ctx,f,p,quality);ctx.restore();return true;}
  if(drawWbHitPx(ctx,f,p,quality)){ctx.restore();return true;}
  if(f.tone==='serpent')poisonImpact(ctx,f,p,quality,tone);
  else if(f.tone==='thunderbird')thunderbirdImpact(ctx,f,p,quality,tone);
  else if(f.tone==='machine')electricImpact(ctx,f,p,quality,tone);
  else fireImpact(ctx,f,p,quality,tone);
  if(f.tone!=='thunderbird'||!['outside','ring'].includes(f.area?.shape)){
    bloom(ctx,f.x,f.y-25,f.major?160:90,tone[1],.6*(1-p));
    sparks(ctx,f.x,f.y-25,f.major?260:170,p,tone,quality,f.major?28:18,f.seed||2);
  }
  ctx.restore();return true;
}

// 광장의 성역 포탈. 보스 출현 여부를 문 안의 빛과 팻말로 표시한다.
export function drawWorldBossPortal(ctx,g,n,time){
  const a=g.wb?.active,open=a?.phase==='fight',color=open?'#f3ce7c':'#8fb6c8',{x,y}=n;
  ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(18,13,9,.35)';ctx.beginPath();ctx.ellipse(0,8,85,25,0,0,TAU);ctx.fill();
  bloom(ctx,0,-90,110,color,open?.55:.3);
  ctx.fillStyle='#3b2b24';ctx.strokeStyle='#b5965a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-93,66,99,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.save();ctx.beginPath();ctx.ellipse(0,-93,56,89,0,0,TAU);ctx.clip();ctx.fillStyle='#172d3a';ctx.fillRect(-60,-190,120,200);
  for(let i=0;i<8;i++){const p=(i/8+time*.1)%1;ctx.strokeStyle=i%2?color:'#afdfe8';ctx.globalAlpha=.2+(1-p)*.6;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(Math.sin(time+i)*10,-93,8+p*53,12+p*80,Math.sin(time)*.2,0,TAU);ctx.stroke();}ctx.restore();
  ctx.fillStyle='#746244';ctx.strokeStyle='#c3a16a';ctx.lineWidth=2;
  for(const k of [-1,1]){ctx.fillRect(k*72-12,-105,24,120);ctx.strokeRect(k*72-12,-105,24,120);for(let i=0;i<3;i++){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(k*72-5,-82+i*32);ctx.lineTo(k*72+5,-75+i*32);ctx.lineTo(k*72-5,-68+i*32);ctx.stroke();}}
  ctx.font="15px 'Do Hyeon',sans-serif";ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(open?'보스 출현 · 입장 가능':'400레벨 3인 이상 도전',0,40);ctx.restore();
}

/* ── 월드보스 등장 연출 그림(보스마다) ─────────────────────────────────────
   재생 상태는 worldBossIntro.js(wbIntroScene), 수치는 worldBossIntroData.js.
   보스 판정 위치 · 공격은 건드리지 않는다. 몸은 그림만 옮기고(뱀 · 뇌조) 실루엣 · 빛 · 틈으로 가린다.
   공격 경고는 점선 테두리라 등장 효과는 테두리 없는 옅은 빛 · 알갱이로만 그린다. */
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const eo=p=>1-(1-p)**3;
const hash=i=>{const x=Math.sin(i*127.1+11.7)*43758.5453;return x-Math.floor(x);};
// 실루엣 · 빛을 몸에만 입히려고 따로 그리는 캔버스(보스 한 마리, 1.4초 동안만 쓴다)
let introOff;const OFF_W=900,OFF_H=900,OX=450,OY=680;
function offCanvas(){
  if(introOff!==undefined)return introOff;
  if(typeof document==='undefined')return introOff=null;
  const c=document.createElement('canvas');c.width=OFF_W;c.height=OFF_H;return introOff={c,x:c.getContext('2d')};
}
// draw 로 몸을 그린 뒤 shade 로 몸 위에만(source-atop) 그늘 · 빛을 칠해 옮긴다
function shadeBody(ctx,draw,shade){
  const o=offCanvas();if(!o){draw(ctx);return;}
  const c=o.x;c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(0,0,OFF_W,OFF_H);
  c.translate(OX,OY);draw(c);c.globalCompositeOperation='source-atop';shade(c);
  c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;
  ctx.drawImage(o.c,-OX,-OY);
}
const focusOf=(s,size)=>[s.sc.focus[0]*size/700,s.sc.focus[1]*size/700];
// 발밑 그림자 크기 — 뇌조는 내려오면서 커진다
function introShadow(s){
  if(s.id!=='thunderbird')return 1;
  const [b0,b1]=I.beat;return .25+.75*eo(cl((s.e-b0*.5)/(b1-b0*.5)));
}
function introBody(ctx,s,draw,size){
  const {e,sc}=s,[b0,b1]=I.beat,[fx,fy]=focusOf(s,size);
  ctx.save();
  if(s.id==='dragon'){
    // 불씨 뒤로 윤곽이 드러나고 얼굴 · 목이 달아오른다
    const vis=eo(cl((e-.3)/.5)),dark=1-cl((e-.5)/.55),heat=cl((e-b0)/(b1-b0))*(1-cl((e-sc.peak-.15)/.25));
    if(vis<=0){ctx.restore();return;}
    ctx.globalAlpha=vis;
    shadeBody(ctx,draw,c=>{
      c.fillStyle=`rgba(24,9,5,${.92*dark})`;c.fillRect(-OX,-OY,OFF_W,OFF_H);
      const gr=c.createRadialGradient(fx,fy,0,fx,fy,150);gr.addColorStop(0,`rgba(255,168,84,${.6*heat})`);gr.addColorStop(1,'rgba(255,120,50,0)');
      c.fillStyle=gr;c.fillRect(-OX,-OY,OFF_W,OFF_H);
    });
  }else if(s.id==='serpent'){
    // 옆에서 스쳐 들어오고 머리 쪽(위)부터 선명해진다
    const p=cl((e-.3)/(b1-.3)),dx=-s.side*(1-eo(p))*sc.slide,r=cl((e-b0)/(b1-b0))*1.35;
    if(p<=0){ctx.restore();return;}
    ctx.globalAlpha=cl(p*2.5);ctx.translate(dx,0);
    shadeBody(ctx,draw,c=>{
      const top=-size*.8,gr=c.createLinearGradient(0,top,0,size*.3);
      gr.addColorStop(cl(r-.3),'rgba(10,16,10,0)');gr.addColorStop(cl(r),'rgba(10,16,10,.9)');
      c.fillStyle=gr;c.fillRect(-OX,-OY,OFF_W,OFF_H);
    });
  }else if(s.id==='machine'){
    // 어두운 병기 → 중심 불빛이 켜지고 밝음이 중심에서 밖으로 번진다
    const p=cl((e-b0)/(b1-b0)),R=520,core=cl((e-b0)/.25)*(1-cl((e-sc.peak-.1)/.3)*.5);
    ctx.globalAlpha=cl(e/.15);
    shadeBody(ctx,draw,c=>{
      const gr=c.createRadialGradient(fx,fy,0,fx,fy,R),rr=eo(p)*1.2;
      gr.addColorStop(cl(rr-.2),'rgba(6,10,18,0)');gr.addColorStop(cl(rr),'rgba(6,10,18,.88)');
      c.fillStyle=gr;c.fillRect(-OX,-OY,OFF_W,OFF_H);
      const gl=c.createRadialGradient(fx,fy,0,fx,fy,110);gl.addColorStop(0,`rgba(232,252,255,${.85*core})`);gl.addColorStop(.35,`rgba(104,218,250,${.5*core})`);gl.addColorStop(1,'rgba(104,218,250,0)');
      c.fillStyle=gl;c.fillRect(-OX,-OY,OFF_W,OFF_H);
    });
  }else if(s.id==='thunderbird'){
    // 위쪽에서 실제 자리까지 빠르게 내려온다(높이만 바꾼다)
    const p=cl((e-b0)/(b1-b0));
    if(e<b0){ctx.restore();return;}
    ctx.globalAlpha=cl(p*4);ctx.translate(0,-sc.drop*(1-p)**2);draw(ctx);
  }else if(s.id==='void'){
    // 틈이 가로로 벌어지며 검은 실루엣 → 눈이 켜지는 순간 본래 빛깔
    if(e<b0){ctx.restore();return;}
    const open=eo(cl((e-b0)/(b1-b0))),lit=cl((e-sc.peak)/.15);
    const rx=sc.slit*(.55+.75*open),ry=4+size*.55*open;
    if(lit<1){ctx.beginPath();ctx.ellipse(fx,fy,rx+lit*400,ry+lit*400,0,0,TAU);ctx.clip();}
    shadeBody(ctx,draw,c=>{
      c.fillStyle=`rgba(8,4,16,${.94*(1-lit)})`;c.fillRect(-OX,-OY,OFF_W,OFF_H);
      const gl=c.createRadialGradient(fx,fy,0,fx,fy,120),k=lit*(1-cl((e-sc.peak-.2)/.4));
      gl.addColorStop(0,`rgba(250,236,255,${.8*k})`);gl.addColorStop(1,'rgba(200,150,255,0)');
      c.fillStyle=gl;c.fillRect(-OX,-OY,OFF_W,OFF_H);
    });
  }else draw(ctx);
  ctx.restore();
}
/* 바닥 효과(월드 좌표, 보스 발밑) — 몸보다 먼저 그린다 */
function introGround(ctx,a,tone,q){
  const s=wbIntroScene(a.id);if(!s)return;
  const {e,sc}=s,[b0,b1]=I.beat,L=I.life,x=a.x,y=a.y,k=Math.max(4,Math.round(sc.bits*q));
  const after=cl((e-sc.peak)/(L-sc.peak+I.trail));
  ctx.save();
  if(s.id==='dragon'){
    // 앞쪽 좁은 부채꼴 열기 — 테두리 없이 옅게(삼연 화염 숨결 방향)
    const {arc,len}=sc.fan,heat=cl(e/b0)*(1-cl((e-L)/I.trail));
    ctx.translate(x,y);ctx.scale(1,C.squash);
    const gr=ctx.createRadialGradient(0,0,30,0,0,len);
    gr.addColorStop(0,'rgba(255,140,64,.34)');gr.addColorStop(.55,'rgba(240,110,48,.12)');gr.addColorStop(1,'rgba(240,110,48,0)');
    ctx.globalAlpha=heat;ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,len,s.ang-arc,s.ang+arc);ctx.closePath();ctx.fill();
    // 불씨 — 낮게 흘러나오다 가장 강한 순간 앞으로 한 번 퍼진다
    for(let i=0;i<k;i++){
      const r=hash(i),an=s.ang+(r-.5)*arc*1.7;let d,al;
      if(e<sc.peak){const ph=(e*.9+i/k)%1;d=50+ph*len*.5;al=(1-ph)*cl(e/.2)*.9;}
      else{d=50+(i/k)*len*.5+eo(after)*len*.85;al=(1-after)*.95;}
      ctx.globalAlpha=al;ctx.fillStyle=i%3?tone[1]:tone[2];
      ctx.beginPath();ctx.arc(Math.cos(an)*d,Math.sin(an)*d-(i%4)*3,2+(i%3),0,TAU);ctx.fill();
    }
  }else if(s.id==='serpent'){
    // 낮고 긴 물결이 옆으로 가로지른다
    const wv=cl(e/.15)*(1-cl((e-b1)/.35));
    if(wv>0){ctx.lineCap='round';
      for(let j=0;j<3;j++){const oy=(j-1)*46,front=-s.side*600+s.side*1300*eo(cl(e/.75));
        ctx.globalAlpha=wv*(.5-j%2*.15);ctx.strokeStyle=j===1?tone[1]:'#6f8f58';ctx.lineWidth=j===1?3:2;ctx.beginPath();
        for(let xx=-560;xx<=560;xx+=20){const reach=s.side>0?xx<=front:xx>=front;if(!reach)continue;
          const yy=y+oy+Math.sin(xx*.022-s.side*e*10+j)*9;ctx.lineTo(x+xx,yy);}
        ctx.stroke();}
    }
    // 몸 뒤 안개 — 가로로 긴 띠(둥근 독 웅덩이와 다른 모양)가 옆으로 한 번 쓸린다
    const mist=cl((e-.6)/.4)*(1-after);
    if(mist>0)for(let i=0;i<Math.max(3,Math.round(k*.5));i++){
      const r=hash(i+7),mx=x+(r-.5)*360+s.side*eo(after)*320,my=y-50-(i%3)*26;
      ctx.globalAlpha=mist*.2;ctx.fillStyle=i%2?'#cfdcc0':'#a9bf98';
      ctx.beginPath();ctx.ellipse(mx,my,120+r*60,18+(i%3)*6,0,0,TAU);ctx.fill();
    }
  }else if(s.id==='machine'){
    // 발밑 청백 빛 — 몸체 가까이에만
    const p=cl((e-b0)/(b1-b0))*(1-cl((e-L)/I.trail));
    if(p>0)ring(ctx,x,y,sc.reach*(.4+.5*p),C.squash,tone[1],.35*p,2);
  }else if(s.id==='thunderbird'){
    // 넓은 날개 그림자가 바닥을 빠르게 가로지른다
    const p=cl(e/.5);
    if(p<1){const cx=x-s.side*(1-2*p)*1000,cy=y-30;
      ctx.globalAlpha=.32*Math.sin(p*Math.PI);ctx.fillStyle='#0d0b1a';ctx.translate(cx,cy);ctx.scale(1,C.squash);
      ctx.beginPath();ctx.ellipse(0,0,70,40,0,0,TAU);ctx.fill();
      for(const d of [-1,1]){ctx.beginPath();ctx.moveTo(0,-10);ctx.quadraticCurveTo(d*180,-90,d*320,-40);ctx.quadraticCurveTo(d*200,-10,d*60,30);ctx.closePath();ctx.fill();}}
  }else if(s.id==='void'){
    // 주변을 잠깐 어둡게 — 보스 자리만 남기고 바깥을 누른다
    const dim=sc.dim*cl((e-b0*.5)/.4)*(1-cl((e-sc.peak)/.4));
    if(dim>0){const gr=ctx.createRadialGradient(x,y-120,140,x,y-120,1000);gr.addColorStop(0,'rgba(8,4,16,0)');gr.addColorStop(1,'rgba(8,4,16,1)');
      ctx.globalAlpha=dim;ctx.fillStyle=gr;ctx.fillRect(x-1100,y-1200,2200,2200);}
  }
  ctx.restore();
}
/* 몸 위에 겹치는 효과 — 전류 · 깃털 · 틈 · 끌려가는 먼지 */
function introOver(ctx,m,s,tone,size,q){
  const {e,sc}=s,[b0,b1]=I.beat,L=I.life,[fx,fy]=focusOf(s,size),x=m.x+fx,y=m.y+fy,k=Math.max(4,Math.round(sc.bits*q));
  const after=cl((e-sc.peak)/(L-sc.peak+I.trail));
  ctx.save();
  if(s.id==='dragon'){
    if(e>=sc.peak)bloom(ctx,x,y,130,tone[1],.45*(1-after));
  }else if(s.id==='machine'){
    // 전류가 중심에서 밖으로 차례대로 흐른다. 마지막 줄기가 맞물리면 짧게 번쩍인다
    const p=cl((e-b0)/(b1-b0));
    for(let i=0;i<k;i++){
      const on=cl((p-i/k)*k*.8);if(on<=0)continue;
      const an=i*TAU/k+.3,r=sc.reach*(.35+.65*on);
      bolt(ctx,x,y,x+Math.cos(an)*r,y+Math.sin(an)*r*.7,tone,.25+.75*after,1.4,i+Math.floor(e*18));
    }
    if(e>=sc.peak){bloom(ctx,x,y,150,tone[1],.6*(1-after));ring(ctx,x,y,40+sc.reach*eo(after),.7,tone[2],.6*(1-after),2);}
  }else if(s.id==='thunderbird'){
    // 내려오는 동안 위로 남는 바람 줄, 내려앉으면 깃털이 바깥으로 흩어진다
    const p=cl((e-b0)/(b1-b0));
    if(e>=b0&&p<1){ctx.strokeStyle=tone[2];ctx.lineWidth=2;
      for(let i=0;i<5;i++){const lx=m.x+(i-2)*70,top=m.y-260-sc.drop*(1-p)**2-120;ctx.globalAlpha=.35*(1-p);ctx.beginPath();ctx.moveTo(lx,top-160);ctx.lineTo(lx,top);ctx.stroke();}}
    if(e>=sc.peak){
      for(let i=0;i<k;i++){const an=i*TAU/k+hash(i)*.4,d=50+eo(after)*(180+hash(i+3)*140),px=m.x+Math.cos(an)*d,py=m.y-40+Math.sin(an)*d*C.squash-after*30;
        ctx.save();ctx.translate(px,py);ctx.rotate(an+after*4);ctx.globalAlpha=(1-after)*.9;ctx.fillStyle=i%2?tone[2]:tone[1];
        ctx.beginPath();ctx.ellipse(0,0,9,3,0,0,TAU);ctx.fill();ctx.restore();}
    }
  }else if(s.id==='void'){
    // 가느다란 보라 틈 — 눈이 켜질 때까지
    if(e<sc.peak+.15){
      const open=eo(cl((e-b0)/(b1-b0))),grow=eo(cl(e/b0)),fade=1-cl((e-sc.peak)/.15);
      const rx=sc.slit*(.55*grow+.75*open),ry=2+size*.55*open;
      const rim=fade*(1-open*.85);   // 벌어질수록 테두리는 옅게 — 큰 고리로 보이지 않게
      ctx.globalAlpha=.9*rim;ctx.strokeStyle=tone[1];ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,Math.max(2,rx),Math.max(1.5,ry),0,0,TAU);ctx.stroke();
      ctx.globalAlpha=.6*rim;ctx.strokeStyle=tone[2];ctx.lineWidth=1;ctx.stroke();
      bloom(ctx,x,y,Math.min(rx,ry+80)*.8,tone[1],.35*fade);
    }
    // 흩어져 있던 먼지가 틈 쪽으로 끌려가다 눈이 켜지면 사라진다(중력 붕괴)
    if(e<sc.peak){
      const pull=cl(e/sc.peak)**1.6;
      for(let i=0;i<k;i++){const an=i*2.39996,d0=220+hash(i)*300,d=d0*(1-pull*.92),px=x+Math.cos(an+pull*.6)*d,py=y+Math.sin(an+pull*.6)*d*.6;
        ctx.globalAlpha=.85*cl(e/.15);ctx.fillStyle=i%3?'#c9b8ec':tone[2];ctx.fillRect(px-2,py-2,4,4);}
    }else if(e<L)bloom(ctx,x,y,150,tone[2],.6*(1-cl((e-sc.peak)/.4)));
  }
  ctx.restore();
}
