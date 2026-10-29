/* 세 영상 스킬의 연출. 무작위 상태를 저장하지 않고 같은 시간에는 같은 모양을 그린다. */
import { STORM_SKILLS, STORM_PALETTE as C, stormSpot } from './stormWeaponData.js';
const TAU=Math.PI*2, clamp=x=>Math.max(0,Math.min(1,x));
const noise=(i,s=0)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
const fade=(t,a,b)=>clamp((t-a)/.04)*clamp((b-t)/Math.min(.35,(b-a)*.6));
const sprites=new Map();
function glow(ctx,x,y,r,color,alpha=1,squash=1){
  if(r<=0||alpha<=0)return;
  let im=sprites.get(color);
  if(!im && typeof document!=='undefined'){
    im=document.createElement('canvas');im.width=im.height=96;const q=im.getContext('2d');
    const g=q.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,color);g.addColorStop(.22,color+'c0');g.addColorStop(1,color+'00');
    q.fillStyle=g;q.fillRect(0,0,96,96);sprites.set(color,im);
  }
  ctx.save();ctx.globalAlpha*=alpha;
  if(im)ctx.drawImage(im,x-r,y-r*squash,r*2,r*2*squash);
  else {const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  ctx.restore();
}
function path(ctx,points,width,color){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function bolt(ctx,x0,y0,x1,y1,seed,width=3,tone=C.violet,quality=1){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,steps=Math.max(5,Math.round(len/13));
  const pts=[];
  for(let i=0;i<=steps;i++){
    const u=i/steps,j=(i===0||i===steps)?0:(noise(i,seed)-.5)*Math.min(40,len*.28);
    pts.push([x0+dx*u-dy/len*j,y0+dy*u+dx/len*j]);
  }
  path(ctx,pts,width*5,tone+'25');path(ctx,pts,width*2.2,tone+'85');path(ctx,pts,width,C.ice);
  if(quality>.5)path(ctx,pts,width*.32,C.core);
  if(quality>.6)for(let i=2;i<pts.length-2;i+=4){const p=pts[i],sgn=i%3?1:-1;path(ctx,[p,[p[0]+sgn*17,p[1]-13],[p[0]+sgn*30,p[1]-25]],width*.5,tone);}
}
function ring(ctx,x,y,r,sy,a,width,color,start=0,span=TAU){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(1,sy);ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();ctx.arc(0,0,Math.max(.01,r),start,start+span);ctx.stroke();ctx.restore();
}
function spark(ctx,x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-r,y);ctx.quadraticCurveTo(x-2,y-2,x,y-r*.8);
  ctx.quadraticCurveTo(x+2,y-2,x+r,y);ctx.quadraticCurveTo(x+2,y+2,x,y+r*.8);ctx.quadraticCurveTo(x-2,y+2,x-r,y);ctx.fill();
}
function discharge(ctx,x,y,r,t,seed,q){
  const pulse=clamp(1-t/.36),step=Math.floor(t*27);
  ctx.save();ctx.globalAlpha*=pulse;
  glow(ctx,x,y,r*1.25,C.blue,.65,.55);glow(ctx,x,y,r*.68,C.ice,.9,.5);
  ring(ctx,x,y,r*(.6+t),.42,0,2,C.ice);
  const n=Math.max(6,Math.round(14*q));
  for(let i=0;i<n;i++){
    const a=i/n*TAU,rr=r*(.6+noise(i,seed)*.5),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.46;
    bolt(ctx,x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.2,xx,yy,seed+i+step,1.4,C.violet,q);
    if(i%3===0)spark(ctx,xx,yy,8*pulse,C.ice);
  }
  bolt(ctx,x-10,y-235,x,y-8,seed+step,5,C.blue,q);
  bolt(ctx,x+28,y-180,x,y,seed+step+40,2.4,C.violet,q);
  glow(ctx,x,y-65,55,C.blue,.5,1.8);
  ctx.restore();
}
function staff(ctx,f,t,sq,q){
  const S=STORM_SKILLS.storm_staff.skill,c={ox:f.x,oy:f.y,ax:f.ax,ay:f.ay};
  for(let i=0;i<S.spots.length;i++){
    const age=t-S.delay-i*S.gap;if(age<0||age>S.residual+S.boltLife)continue;
    const [x,y]=stormSpot(c,S.spots[i],sq);
    if(age<S.boltLife)discharge(ctx,x,y,S.r,age,i*19,q);
    const k=clamp(1-(age-S.boltLife)/S.residual);ctx.save();ctx.globalAlpha*=k*.7;
    if(age>.16){
      // 보랏빛 잔류 전류는 바닥에 조각으로 흩어지고 바깥의 회색 압력 고리는 먼저 사라진다.
      for(let j=0;j<Math.max(3,Math.round(6*q));j++){
        const a=j/6*TAU+i,rr=S.r*(.25+noise(j,i)*.6),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*sq;
        bolt(ctx,xx,yy,xx+Math.cos(a+1)*28,yy+Math.sin(a+1)*18,i+j+Math.floor(age*16),1.2,C.violet,q);
      }
      ctx.globalAlpha*=.22;ring(ctx,x,y,S.r*(1+age*.5),sq,0,3,'#b7d9d0');
    }
    ctx.restore();
  }
}
function bow(ctx,f,t,sq,q){
  const S=STORM_SKILLS.violet_bow.skill,a=Math.atan2(f.ay*sq,f.ax),len=S.len*Math.hypot(f.ax,f.ay*sq);
  ctx.save();ctx.translate(f.x,f.y-32);ctx.rotate(a);
  if(t<.24){ctx.save();ctx.globalAlpha*=fade(t,0,.24);glow(ctx,0,0,95,C.violet,.6);spark(ctx,0,0,90,C.blue);spark(ctx,0,0,68,C.core);ctx.restore();}
  if(t>=S.charge){
    const u=clamp((t-S.charge)/S.flight),x=len*u,alpha=clamp((S.life-t)/S.fade);
    ctx.globalAlpha*=alpha;
    // 발사 자리에는 넓고 흐린 압력 고리. 머리에는 수직으로 선 보랏빛 고리 세 겹.
    for(let i=0;i<3;i++){
      ctx.save();ctx.globalAlpha*=clamp(1-(t-S.charge-i*.08)/.7)*.27;
      ring(ctx,i*35,0,52+(t-S.charge)*55,.52,Math.PI/2,3,'#b7d6d2');ctx.restore();
    }
    const tail=Math.max(0,x-190);
    bolt(ctx,tail,0,x,0,Math.floor(t*30),3,C.violet,q);
    path(ctx,[[Math.max(0,x-150),-13],[x-25,-3],[x+33,0]],1,'#161c38');
    glow(ctx,x,0,58,C.violet,.5);
    for(let i=0;i<3;i++){
      const spin=t*12+i*1.4;
      ring(ctx,x-i*16,0,38-i*6,.48,Math.PI/2+i*.22,3,C.violet,spin,TAU*.82);
      ring(ctx,x-i*16,0,37-i*6,.48,Math.PI/2+i*.22,1,C.ice,spin,TAU*.65);
    }
    for(let i=0;i<Math.max(3,Math.round(7*q));i++){
      const u=i/7,xx=x-90*u,yy=Math.sin(t*22-u*8)*24*(1-u*.5);
      bolt(ctx,xx,yy,xx-20,yy+Math.sin(i*4+t*19)*18,i+Math.floor(t*24),1.3,C.violet,q);
    }
    spark(ctx,x+12,0,15,C.core);
  }
  ctx.restore();
}
function feather(ctx,x,y,size,side,alpha){
  ctx.save();ctx.translate(x,y);ctx.scale(1,side);ctx.globalAlpha*=alpha;
  ctx.beginPath();ctx.moveTo(-size*.8,4);ctx.quadraticCurveTo(-size*.15,-size*.1,size*.12,-size);
  ctx.lineTo(size*.42,-size*.5);ctx.lineTo(size*.38,-size*1.15);ctx.quadraticCurveTo(size*.9,-size*.25,size*.6,5);ctx.closePath();
  ctx.fillStyle=C.teal;ctx.fill();ctx.strokeStyle=C.cyan;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-size*.5,2);ctx.quadraticCurveTo(size*.4,-size*.4,size*.22,-size*.88);ctx.quadraticCurveTo(size*.7,-size*.3,size*.43,2);ctx.closePath();ctx.fillStyle=C.ice;ctx.fill();ctx.restore();
}
function dash(ctx,f,t,sq,q,g){
  const S=STORM_SKILLS.azure_dual.skill,a=Math.atan2(f.ay*sq,f.ax);
  const owner=g?.heroes?.[f.pi],c=owner?.ws?.storm;
  const length=c?.token===f.token?Math.hypot((c.finishX??owner.x)-f.x,(c.finishY??owner.y)-f.y):S.distance*Math.hypot(f.ax,f.ay*sq)*clamp(t/S.dash);
  ctx.save();ctx.translate(f.x,f.y-25);ctx.rotate(a);
  const alpha=clamp(1-(t-S.dash)/1.05);ctx.globalAlpha*=alpha;
  for(let i=0;i<Math.max(4,Math.round(10*q));i++){
    const x=length*i/10,age=t-S.dash*i/10,env=clamp(1-age/.5);
    if(age<0)continue;
    feather(ctx,x,-12,52+(i%3)*7,-1,env);feather(ctx,x,12,52+(i%3)*7,1,env);
  }
  if(length>2){
    glow(ctx,length*.5,0,Math.max(20,length*.6),C.teal,.2,.16);
    bolt(ctx,0,0,length,0,Math.floor(t*26),3,C.cyan,q);
    for(let i=0;i<Math.max(5,Math.round(15*q));i++){
      const u=noise(i,8),x=length*u,y=(noise(i,3)-.5)*60;
      spark(ctx,x,y,3+noise(i,1)*5,C.ice);
    }
  }
  if(t<S.dash){glow(ctx,length,0,58,C.cyan,.8);spark(ctx,length,0,36,C.core);}
  ctx.restore();
}
function finish(ctx,f,t){
  const life=f.life,a=Math.atan2(f.ay*.78,f.ax),r=100,env=clamp(1-t/life);
  ctx.save();ctx.translate(f.x,f.y-28);ctx.rotate(a);ctx.globalAlpha*=env;
  if(t<.45){
    glow(ctx,0,0,r*(.7+t),C.cyan,clamp(1-t/.5),.8);
    for(let i=0;i<4;i++)ring(ctx,0,0,r*(.5+t*.7),.45+i*.14,i*.8+t*7,3,C.ice,i,4.3);
    if(t<.07){ctx.fillStyle='#071a2c';ctx.beginPath();ctx.arc(0,0,38,0,TAU);ctx.fill();spark(ctx,0,0,70,C.core);}
  }
  // 끝자리의 얇은 V자 교차 흔적. 폭발보다 오래 남아 청록색 안개와 함께 사라진다.
  glow(ctx,18,0,95,C.teal,env*.25,.5);
  path(ctx,[[60,-65],[0,0],[55,62]],5,C.cyan+'36');path(ctx,[[60,-65],[0,0],[55,62]],1.5,C.ice);
  if(t<.6)for(let i=0;i<10;i++){const ang=i/10*TAU; spark(ctx,Math.cos(ang)*(45+t*110),Math.sin(ang)*(45+t*110),3,C.ice);}
  ctx.restore();
}
export function drawStormFx(ctx,f,p,sq,g,q=1){
  if(!['sk_storm_staff','sk_storm_bow','sk_storm_dash','sk_storm_finish'].includes(f.kind))return false;
  const h=g?.heroes?.[f.pi];
  if(f.token && g && (!h || h.down>0 || h.ws?.storm?.token!==f.token))return true;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const t=clamp(p)*f.life;
  if(f.kind==='sk_storm_staff')staff(ctx,f,t,sq,q);
  else if(f.kind==='sk_storm_bow')bow(ctx,f,t,sq,q);
  else if(f.kind==='sk_storm_dash')dash(ctx,f,t,sq,q,g);
  else finish(ctx,f,t);
  ctx.restore();return true;
}
export function drawStormCharge(ctx,h,time,q=1){
  const c=h.ws?.storm;if(c?.id!=='azure_dual'||c.phase!=='charge')return;
  const r=46+Math.sin(time*12)*2;
  ctx.save();ctx.globalCompositeOperation='lighter';
  glow(ctx,h.x,h.y-17,r*1.4,C.cyan,.7,.72);glow(ctx,h.x,h.y-19,r*.6,C.ice,.8,.8);
  ring(ctx,h.x,h.y-10,r,.6,0,2,C.cyan,time*3,TAU*.8);
  ring(ctx,h.x,h.y-20,r*.65,.8,.6,2,C.ice,-time*5,TAU*.7);
  for(let i=0;i<Math.round(8*q);i++){const a=i/8*TAU+time*2;spark(ctx,h.x+Math.cos(a)*r*.6,h.y-20+Math.sin(a)*r*.4,3,C.core);}
  ctx.restore();
}
// 영상의 돌진 끝 두 프레임은 명암이 뒤집힌다. 내 스킬의 게임 화면에만 짧게 적용한다.
export function drawStormScreenFlash(ctx,g,w,h){
  const flash=g.fx.find(f=>f.kind==='sk_storm_dash' && f.pi===g.mySeat && f.life-f.t>=.24 && f.life-f.t<.30);
  if(!flash || g.heroes[g.mySeat]?.ws?.storm?.token!==flash.token)return;
  ctx.save();ctx.globalCompositeOperation='difference';ctx.globalAlpha=.94;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.restore();
}
