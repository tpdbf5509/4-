import { drawDragonFlightFx } from "./dragonFlightArt.js";
/* 월드보스 무기 연출 — 예고·궤적·명중·잔광을 나눈다. 광원은 캐시하고 품질에 따라 마디 수를 줄인다. */
import { FX_TONES, bloom, sparks, ribbon, ring, bolt } from './combatFx.js';
const TAU=Math.PI*2;
function impact(ctx,x,y,r,p,tone,q){
  bloom(ctx,x,y,r*1.25,tone[1],.65*(1-p));
  bloom(ctx,x,y,r*.5,tone[2],.7*Math.max(0,1-p*4));
  ring(ctx,x,y,r*(.25+p),.55,tone[1],(1-p)**2,4*(1-p)+1);
  ring(ctx,x,y,r*(.1+p*.8),.55,tone[2],(1-p)**2,1.5);
  sparks(ctx,x,y,r*1.5,p,tone,q,24,x*.013);
}
function beast(ctx,f,p,time,q){
  const tone=f.dragon?FX_TONES.dragon:FX_TONES.poison;
  const x=f.x0+(f.x1-f.x0)*p,y=f.y0+(f.y1-f.y0)*p;
  ctx.translate(x,y);ctx.rotate(Math.atan2(f.y1-f.y0,f.x1-f.x0));
  const size=f.dragon?1.8:1.15;ctx.scale(size,size);
  bloom(ctx,0,0,72,tone[1],.55);ctx.lineJoin='round';
  // 빛나는 척추와 길게 휘어지는 꼬리
  for(const [w,col,a]of [[27,tone[0],.7],[17,tone[1],.85],[4,tone[2],.95]]){
    ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(30,0);
    ctx.bezierCurveTo(3,-12,-30,16,-78,Math.sin(time*16)*14);ctx.stroke();
  }
  if(f.dragon)for(const sign of [-1,1]){
    ctx.globalAlpha=.9;ctx.fillStyle=tone[0];ctx.strokeStyle=tone[1];ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(7,sign*4);ctx.bezierCurveTo(4,sign*25,-7,sign*51,-36,sign*56);
    ctx.lineTo(-23,sign*28);ctx.lineTo(-48,sign*36);ctx.lineTo(-25,sign*7);ctx.closePath();ctx.fill();ctx.stroke();
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(5,sign*5);ctx.lineTo(-14-i*11,sign*(46-i*9));ctx.stroke();}
  }
  ctx.globalAlpha=1;ctx.fillStyle=tone[1];ctx.strokeStyle=tone[2];ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(42,0);ctx.lineTo(22,-12);ctx.lineTo(9,-10);ctx.lineTo(2,-21);ctx.lineTo(-2,-8);
  ctx.lineTo(-12,1);ctx.lineTo(18,13);ctx.lineTo(32,7);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff7dd';ctx.fillRect(23,-5,6,3);
  sparks(ctx,-45,0,55,p,tone,q,8,2);
}
function dualSpin(ctx,f,p,time,q,g){
  const h=g?.heroes[f.pi],x=h?.map===f.map?h.x:f.x,y=(h?.map===f.map?h.y:f.y)-30;
  ctx.translate(x,y);const T=FX_TONES.dragon,r=f.r||105;
  bloom(ctx,0,0,r*1.3,T[0],.7);bloom(ctx,0,0,r*.8,T[1],.4);
  ring(ctx,0,30,r*.78,.38,T[1],.55,2);
  for(let i=0;i<4;i++){
    ctx.save();ctx.rotate((i%2?.7:-.7)+(i>1?Math.PI/2:0));ctx.scale(1,i%2?.52:.72);
    const a=p*TAU*(i%2?-1:1)*1.3+i*1.9;
    ribbon(ctx,r*(.72+i*.075),a,Math.PI*1.35,r*.22,T,q);ctx.restore();
  }
  sparks(ctx,0,0,r*1.3,p,T,q,20,1);
}
function dualDash(ctx,f,p,q,g){
  const T=FX_TONES.dragon,h=g?.heroes[f.pi],elapsed=f.life*(1-f.t/f.life);
  const live=h?.map===f.map && elapsed<=f.duration+.06;
  const travel=Math.min(1,elapsed/f.duration),x=live?h.x:f.x0+(f.x1-f.x0)*travel,y=(live?h.y:f.y0+(f.y1-f.y0)*travel)-30;
  const dx=x-f.x0,dy=y-(f.y0-30),len=Math.max(1,Math.hypot(dx,dy)),fade=Math.min(1,(1-p)*3);
  ctx.translate(f.x0,f.y0-30);ctx.rotate(Math.atan2(dy,dx));ctx.globalAlpha*=fade;
  // 돌진의 이중 나선 검광. 가운데를 비워 캐릭터가 보이게 한다.
  for(const sign of [-1,1])for(const [width,col,a]of [[23,T[0],.7],[13,T[1],.9],[3,T[2],1]]){
    ctx.strokeStyle=col;ctx.lineWidth=width;ctx.globalAlpha=fade*a;ctx.beginPath();
    const n=Math.max(12,Math.round(26*q));
    for(let i=0;i<=n;i++){const t=i/n,wave=Math.sin(t*Math.PI*4-p*9)*7*(.3+t);
      const xx=len*t,yy=sign*(wave+6)*(1-t*.4);if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.stroke();
  }
  ctx.globalAlpha=fade;
  // 가운데는 끝으로 갈수록 달아오르는 직선 참격이다.
  for(const [w,col,a]of [[16,T[0],.45],[7,T[1],.8],[1.8,T[2],.95]]){
    ctx.globalAlpha=fade*a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(len*.15,0);ctx.lineTo(len,0);ctx.stroke();
  }
  ctx.globalAlpha=fade;
  for(let i=0;i<2;i++){
    ctx.save();ctx.translate(len-i*28,0);ctx.scale(1,.62);
    ribbon(ctx,48-i*7,-Math.PI*.65,Math.PI*1.3,13,T,q);ctx.restore();
  }
  bloom(ctx,len,0,75,T[1],.75*fade);sparks(ctx,len,0,70,p,T,q,12,2);
}
function meteor(ctx,f,p,q){
  const T=FX_TONES.fire,r=f.r||110,fall=1-p,x=f.x+fall*95,y=f.y-fall*360;
  ctx.save();ctx.translate(x,y);ctx.rotate(-.28);
  bloom(ctx,0,0,r*.8,T[1],.65);
  for(let i=0;i<3;i++){
    ctx.fillStyle=i===0?T[0]:i===1?T[1]:T[2];ctx.globalAlpha=i===0?.6:i===1?.8:1;
    const w=r*(.32-i*.075);ctx.beginPath();ctx.moveTo(-w,0);ctx.quadraticCurveTo(-w*.5,-r*1.3,15,-r*2.5);
    ctx.quadraticCurveTo(w*.5,-r,w,0);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#492820';ctx.strokeStyle=T[1];ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<9;i++){const a=i*TAU/9,d=r*(.24+((i*7)%5)*.018);if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);}
  ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=T[2];ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-r*.2,-5);ctx.lineTo(4,3);ctx.lineTo(-3,r*.23);ctx.stroke();
  sparks(ctx,0,-r*.4,r*.6,p,T,q,8,3);ctx.restore();
}
function pool(ctx,f,p,time,squash,q){
  const T=FX_TONES.poison,r=f.r;
  bloom(ctx,f.x,f.y,r,T[1],.24);ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,squash);
  ctx.fillStyle='#17362c';ctx.globalAlpha=.7*(1-p);ctx.beginPath();
  const n=Math.max(18,Math.round(32*q));for(let i=0;i<=n;i++){const a=i*TAU/n,d=r*(.94+.05*Math.sin(a*7+time*3));if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);}
  ctx.closePath();ctx.fill();ring(ctx,0,0,r,1,T[1],.7,2);
  for(let i=0;i<3;i++){ctx.save();ctx.rotate(time*(i%2?1:-1)+i);ribbon(ctx,r*(.35+i*.24),i*2,Math.PI*1.4,3,T,q);ctx.restore();}
  ctx.restore();ctx.save();ctx.translate(f.x,f.y);ctx.strokeStyle=T[1];ctx.lineWidth=11;ctx.lineCap='round';
  const lift=Math.sin(Math.min(1,p*2)*Math.PI)*45;ctx.beginPath();ctx.moveTo(-15,0);ctx.bezierCurveTo(40,-20,-38,-45-lift,13,-60-lift);ctx.stroke();
  ctx.strokeStyle=T[2];ctx.lineWidth=2;ctx.stroke();bloom(ctx,14,-60-lift,19,T[1],.7);
  ctx.fillStyle='#e2f9ba';ctx.beginPath();ctx.ellipse(18,-61-lift,14,7,-.2,0,TAU);ctx.fill();ctx.fillStyle='#a454c9';ctx.fillRect(23,-65-lift,4,3);ctx.restore();
  sparks(ctx,f.x,f.y,r,p,T,q,12,4);
}
function grid(ctx,f,p,time,squash,q){
  const T=FX_TONES.bolt,r=f.r;ctx.save();ctx.translate(f.x,f.y);
  bloom(ctx,0,0,r*.9,T[1],.16);ring(ctx,0,0,r,squash,T[1],.5,1.5);
  const pts=Array.from({length:4},(_,i)=>{const a=i*Math.PI/2+Math.PI/4;return [Math.cos(a)*r,Math.sin(a)*r*squash];});
  for(let i=0;i<4;i++){
    const [x,y]=pts[i],[x1,y1]=pts[(i+1)%4];bolt(ctx,x,y-24,x1,y1-24,T,p,2,i+Math.floor(time*12));
    ctx.fillStyle='#6c5b39';ctx.strokeStyle='#ddc68c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x-5,y-33);ctx.lineTo(x,y-43);ctx.lineTo(x+5,y-33);ctx.lineTo(x+7,y);ctx.closePath();ctx.fill();ctx.stroke();
    bloom(ctx,x,y-36,24,T[1],.8);ctx.fillStyle=T[2];ctx.fillRect(x-2,y-38,4,9);
  }
  ctx.restore();sparks(ctx,f.x,f.y,r,p,T,q,10,5);
}
function lightning(ctx,f,p,q){
  const T=FX_TONES.bolt,r=f.r;
  bloom(ctx,f.x,f.y-80,r*.8,T[1],.3*(1-p));
  bolt(ctx,f.x+24,f.y-250,f.x,f.y,T,p,6,4);
  for(let i=0;i<3;i++){const a=i*2.1+.4;bolt(ctx,f.x+10,f.y-135,f.x+Math.cos(a)*r*.7,f.y-35+Math.sin(a)*r*.3,T,p,2,i*7);}
  impact(ctx,f.x,f.y,r,p,T,q);
}
function volley(ctx,f,p,q,squash){
  const T=FX_TONES.dragon,angle=Math.atan2(f.ay*squash,f.ax),dist=f.len*Math.min(1,p*1.6);
  ctx.save();ctx.translate(f.x0,f.y0);ctx.rotate(angle);
  for(let i=0;i<f.arrows;i++){
    const a=(i-(f.arrows-1)/2)*f.spread;ctx.save();ctx.rotate(a);
    bloom(ctx,dist,0,18,T[1],.5);
    for(const [w,col]of [[7,T[0]],[3,T[1]],[1,T[2]]]){
      ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.max(0,dist-110),0);ctx.lineTo(dist,0);ctx.stroke();}
    ctx.fillStyle=T[2];ctx.beginPath();ctx.moveTo(dist+12,0);ctx.lineTo(dist-2,-5);ctx.lineTo(dist+1,0);ctx.lineTo(dist-2,5);ctx.closePath();ctx.fill();ctx.restore();
  }ctx.restore();if(q>.6)sparks(ctx,f.x0,f.y0,28,p,T,q,5,1);
}
function rail(ctx,f,p,q){
  const T=FX_TONES.bolt,dx=f.x1-f.x0,dy=f.y1-f.y0,len=Math.hypot(dx,dy);
  ctx.save();ctx.translate(f.x0,f.y0);ctx.rotate(Math.atan2(dy,dx));ctx.globalAlpha*=Math.max(0,1-p);
  for(const [w,col,a]of [[f.w*2,T[0],.5],[f.w,T[1],.8],[Math.max(2,f.w*.15),T[2],1]]){
    ctx.globalAlpha=(1-p)*a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();}
  for(let i=1;i<=4;i++){ctx.save();ctx.translate(len*i/5,0);ctx.scale(.25,1);ring(ctx,0,0,25+35*p,1,T[2],1-p,2);ctx.restore();}
  ctx.restore();bloom(ctx,f.x0,f.y0,75,T[1],.5*(1-p));sparks(ctx,f.x1,f.y1,90,p,T,q,14,3);
}
export function drawWorldWeaponFx(ctx,f,p,time,squash,g,quality=1){
  if(!f.kind.startsWith('sk_wb_'))return false;
  if(drawDragonFlightFx(ctx,f,p,g,quality))return true;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  const T=FX_TONES.dragon,r=f.r||100;
  if(f.kind==='sk_wb_dual_charge'){
    bloom(ctx,f.x,f.y-24,r,T[0],.5);ring(ctx,f.x,f.y,r*(1-p*.75),squash,T[1],.7,2);
    sparks(ctx,f.x,f.y-20,r,1-p,T,quality,14,3);
  }else if(f.kind==='sk_wb_dual_spin')dualSpin(ctx,f,p,time,quality,g);
  else if(f.kind==='sk_wb_dual_dash')dualDash(ctx,f,p,quality,g);
  else if(f.kind==='sk_wb_beast')beast(ctx,f,p,time,quality);
  else if(f.kind==='sk_wb_cross'){
    ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha*=(1-p)**1.4;
    const reach=r*Math.min(1,.25+p*5);
    for(const angle of [-.6,.6]){
      ctx.save();ctx.rotate(angle);
      for(const [width,color]of [[r*.22,T[0]],[r*.12,T[1]],[r*.025,T[2]]]){
        ctx.fillStyle=color;ctx.beginPath();
        for(let i=0;i<=24;i++){const t=i/24,x=(t*2-1)*reach,w=Math.sin(Math.PI*t)*width*(1-p*.7);if(i)ctx.lineTo(x,-w);else ctx.moveTo(x,-w);}
        for(let i=24;i>=0;i--){const t=i/24;ctx.lineTo((t*2-1)*reach,Math.sin(Math.PI*t)*width*(1-p*.7));}
        ctx.closePath();ctx.fill();
      }ctx.restore();
    }
    ctx.restore();impact(ctx,f.x,f.y,r,p,T,quality);
  }else if(f.kind==='sk_wb_impact')impact(ctx,f.x,f.y,r,p,FX_TONES[f.tone]||FX_TONES.fire,quality);
  else if(f.kind==='sk_wb_venom_slash'){
    const V=FX_TONES.poison;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a||0);ctx.scale(1,.7);
    ctx.globalAlpha*=(1-p)**.7;
    ribbon(ctx,r*.8,-1.25+(f.dir||1)*p*.7,2.5,r*.2,V,quality);
    // 칼날 끝에 송곳니 세 개를 남긴다.
    for(let i=0;i<3;i++){const a=-.6+i*.6;ctx.save();ctx.rotate(a);ctx.fillStyle=V[2];ctx.beginPath();ctx.moveTo(r*.68,-4);ctx.lineTo(r*(.9+p*.15),0);ctx.lineTo(r*.68,5);ctx.fill();ctx.restore();}
    ctx.restore();sparks(ctx,f.x,f.y,r,p,V,quality,12,4);
  }else if(f.kind==='sk_wb_fracture'){
    const B=FX_TONES.bolt;ctx.save();ctx.translate(f.x0,f.y0);ctx.rotate(Math.atan2(f.y1-f.y0,f.x1-f.x0));
    const len=Math.hypot(f.x1-f.x0,f.y1-f.y0);ctx.globalAlpha*=1-p*.7;
    for(const [width,col]of [[18,'#17262e'],[7,B[1]],[1.5,B[2]]]){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,0);for(let i=1;i<=12;i++)ctx.lineTo(len*i/12,Math.sin(i*7.1)*8);ctx.stroke();}
    for(let i=1;i<6;i++){const x=len*i/6;ctx.strokeStyle=B[1];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+14,-25);ctx.lineTo(x+26,-30);ctx.stroke();}
    ctx.restore();
  }else if(f.kind==='sk_wb_arc'){
    bolt(ctx,f.x0,f.y0,f.x1,f.y1,FX_TONES.bolt,p,3,7);
    bloom(ctx,f.x1,f.y1,32,FX_TONES.bolt[1],.6*(1-p));
  }else if(f.kind==='sk_wb_venom_mark'){
    const V=FX_TONES.poison;ring(ctx,f.x,f.y,r*(.5+p),.8,V[1],1-p,2);
    ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha*=1-p;
    for(const side of [-1,1]){ctx.fillStyle=V[2];ctx.beginPath();ctx.moveTo(side*17,-15);ctx.quadraticCurveTo(side*8,10,side*3,15);ctx.lineTo(side*4,-9);ctx.closePath();ctx.fill();}ctx.restore();
    sparks(ctx,f.x,f.y,r,p,V,quality,8,3);
  }else if(f.kind==='sk_wb_set_discharge'){
    const B=FX_TONES.bolt;ring(ctx,f.x,f.y,r*(.3+p),.6,B[1],1-p,3);
    for(let i=0;i<6;i++){const a=i*TAU/6;bolt(ctx,f.x,f.y-15,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r*.6-15,B,p,2,i);}
    bloom(ctx,f.x,f.y-15,r*.6,B[2],.4*(1-p));
  }
  else if(f.kind==='sk_wb_meteor')meteor(ctx,f,p,quality);
  else if(f.kind==='sk_wb_pool')pool(ctx,f,p,time,squash,quality);
  else if(f.kind==='sk_wb_grid')grid(ctx,f,p,time,squash,quality);
  else if(f.kind==='sk_wb_lightning')lightning(ctx,f,p,quality);
  else if(f.kind==='sk_wb_volley')volley(ctx,f,p,quality,squash);
  else if(f.kind==='sk_wb_rail')rail(ctx,f,p,quality);
  else if(f.kind==='sk_wb_warn'){
    const col=f.color||FX_TONES.bolt[1];bloom(ctx,f.x,f.y,r*.7,col,.13);
    ring(ctx,f.x,f.y,r,squash,col,.65,2);ring(ctx,f.x,f.y,r*(1-p*.75),squash,col,.5,1);
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,squash);ctx.strokeStyle=col;ctx.lineWidth=2;
    for(let i=0;i<12;i++){const a=i*TAU/12;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.88,Math.sin(a)*r*.88);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}ctx.restore();
  }
  ctx.restore();return true;
}
