/* 월드보스 전용 그림과 위험지역. 기존 캐릭터 스킬 효과는 재사용하지 않는다. */
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_TYPE,WORLD_BOSS_PATTERNS} from './worldBossData.js';
import {bloom,sparks,ring,bolt} from './combatFx.js';
import {worldBossCoopOpen} from './worldBoss.js';
const TAU=Math.PI*2;
const TONES={dragon:['#96351d','#ff873b','#fff1bf'],serpent:['#48315e','#a9e66e','#f2ffd4'],machine:['#235476','#68dafa','#f0fcff'],thunderbird:['#403879','#a7a2ff','#e6fbff']};
let atlas;
const bossImages={};
function bossImage(src){
  if(typeof Image==='undefined')return null;
  if(bossImages[src]===undefined){const im=bossImages[src]=new Image();im.onerror=()=>{bossImages[src]=null;};im.src=src;}
  const im=bossImages[src];return im?.complete&&im.naturalWidth?im:null;
}
export function warmWorldBossArt(){
  if(typeof Image==='undefined')return null;
  WORLD_BOSSES.forEach(b=>{if(b.art)bossImage(b.art.src);});
  if(atlas===undefined){atlas=new Image();atlas.onerror=()=>{atlas=null;};atlas.src=C.art;}
  return atlas?.complete&&atlas.naturalWidth?atlas:null;
}
function path(ctx,s){
  ctx.beginPath();
  if(s.shape==='ring'){ctx.arc(0,0,s.r,0,Math.PI*2);ctx.arc(0,0,s.inner,0,Math.PI*2,true);}
  else if(s.shape==='outside'){ctx.rect(-s.x,-s.y/C.squash,C.w,C.h/C.squash);ctx.moveTo(s.r,0);ctx.arc(0,0,s.r,0,TAU,true);}
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
export function drawWorldBossGround(ctx,g,map,quality=1){
  if(map!==C.map||!g.wb?.active)return;
  const a=g.wb.active,t=g.t,tone=TONES[a.id];
  a.pools.forEach((p,j)=>{paintArea(ctx,p,'#9563b2',.3);const n=Math.max(3,Math.round(8*quality));ctx.save();ctx.strokeStyle=tone[1];ctx.lineWidth=2;ctx.globalAlpha=.55;
    for(let i=0;i<n;i++){const angle=i*2.39996+j,d=p.r*(.2+.65*((i*17%29)/29));ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*d,p.y+Math.sin(angle)*d*C.squash-Math.sin(t*3+i)*7,3+(i%3),0,TAU);ctx.stroke();}ctx.restore();});
  if(a.stun>0){runeHalo(ctx,a.x,a.y,130,t,'#ffe19a',quality);return;}
  if(a.attack){
    const attack=a.attack,p=Math.max(0,Math.min(1,1-attack.t/attack.life)),open=worldBossCoopOpen(a);
    attack.areas.forEach((s,i)=>{
      paintArea(ctx,s,open?'#ffe49c':attack.major?'#ee956e':'#f7b267',.12+p*.2,true);
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
        if(a.id==='dragon'&&p>.35)fallingRock(ctx,s.x,s.y,(p-.35)/.65,attack.major?28:19,tone);
        if(a.id==='machine'||a.id==='thunderbird')bolt(ctx,s.x+18,s.y-170,s.x,s.y-15,tone,1-p,2,i);
      }
    });
    if(attack.major&&attack.step===0){
      const color=open?'#ffe49c':tone[1];runeHalo(ctx,a.x,a.y,130+45*p,t,color,quality);
      bloom(ctx,a.x,a.y-150,150,color,.18+p*.3);
    }
    ctx.save();ctx.fillStyle=open?'#ffe49c':'#fff0c2';ctx.strokeStyle='#2d1b13';ctx.lineWidth=5;ctx.font="bold 24px 'Do Hyeon',sans-serif";ctx.textAlign='center';
    const P=WORLD_BOSS_PATTERNS[attack.kind],hint=attack.kind==='thunder_dive'&&attack.step?P.landHint:P?.hint;
    const label=open?`약점 노출! 함께 공격 ${(attack.coop||[]).length}/${C.coop.players}`:`${attack.name||'공격 준비'} ${attack.step+1}/${attack.stages} · ${attack.diving?'급강하!':`${Math.max(0,attack.t).toFixed(1)}초`}`;
    ctx.strokeText(label,a.x,a.y+65);ctx.fillText(label,a.x,a.y+65);ctx.restore();
    if(hint&&!open){ctx.save();ctx.textAlign='center';ctx.font="18px 'Do Hyeon',sans-serif";ctx.lineWidth=4;ctx.strokeStyle='#211b2b';ctx.fillStyle='#d7f5ff';ctx.strokeText(hint,a.x,a.y+91);ctx.fillText(hint,a.x,a.y+91);ctx.restore();}
  }
}
export function drawWorldBossSprite(ctx,m,time,state,quality=1){
  const B=WORLD_BOSS_BY_TYPE[m.type];if(!B)return false;
  const shared=warmWorldBossArt(),row=m.pose?1:0;
  const im=B.art?bossImage(B.art.src):shared,col=B.art?row:WORLD_BOSSES.indexOf(B);
  const size=B.art?.size||C.artSize,bob=m.pose?0:Math.sin(time*2)*3;
  ctx.save();ctx.translate(m.x,m.y+bob);
  ctx.fillStyle='rgba(15,10,10,.3)';ctx.beginPath();ctx.ellipse(0,0,105,28,0,0,Math.PI*2);ctx.fill();
  if(B.id==='thunderbird'&&state?.attack?.kind==='thunder_dive'&&!state.attack.step){
    const attack=state.attack,p=Math.max(0,Math.min(1,1-attack.t/attack.life));
    const lift=attack.diving?80*(1-p):80*p;ctx.translate(0,-lift);
    if(attack.diving){const s=attack.areas[0];ctx.save();ctx.scale(1,C.squash);ctx.rotate(s.a);
      for(const side of [-1,1]){ctx.strokeStyle='#a7eaff';ctx.lineWidth=4;ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(-160,side*40);ctx.lineTo(30,side*22);ctx.stroke();}ctx.restore();}
  }
  if(im){const cw=im.naturalWidth/(B.art?.cols||C.artCols),ch=im.naturalHeight/(B.art?.rows||C.artRows);
    const feet=B.art?B.art.feet[row]:C.artFeet[row][col];ctx.imageSmoothingEnabled=false;
    ctx.drawImage(im,col*cw,(B.art?0:row)*ch,cw,ch,-size*.5,-size*feet,size,size);}
  else if(B.id==='thunderbird')drawThunderbirdFallback(ctx,m.pose);
  else{ctx.fillStyle=B.color;ctx.strokeStyle='#362315';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-110,105,110,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff2bb';ctx.fillRect(-50,-155,20,10);ctx.fillRect(30,-155,20,10);ctx.beginPath();ctx.moveTo(-80,-185);ctx.lineTo(-100,-260);ctx.lineTo(-30,-205);ctx.moveTo(80,-185);ctx.lineTo(100,-260);ctx.lineTo(30,-205);ctx.fill();}
  ctx.restore();
  if(state?.stun>0){
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
  if(f.kind==='sk_raid_break'){
    const tone=['#9d6f2c','#ffe09a','#fff9de'];
    bloom(ctx,f.x,f.y,230,tone[1],.8*(1-p));ring(ctx,f.x,f.y,40+p*210,.75,tone[2],1-p,5);
    sparks(ctx,f.x,f.y,290,p,tone,quality,36,5);return true;
  }
  if(f.kind!=='sk_raid_hit')return false;
  const tone=TONES[f.tone]||TONES.dragon;
  ctx.save();if(f.area&&f.area.shape!=='outside')paintArea(ctx,f.area,tone[1],(1-p)*.23);
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
