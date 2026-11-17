/* 전용 도트 시트. 반복 입자는 시트 한 장으로 재생하며 실시간 입자 객체를 만들지 않는다. */
import {RQ,RQ_ART as A,rqMap,rqSealed} from './requiemData.js';
const cache={};
function img(name){if(!cache[name]){const i=new Image();i.src=`${A.root}${name}.webp`;cache[name]=i;}return cache[name];}
function sprite(ctx,name,x,y,k=2,frame=0){const i=img(name);if(!i.complete||!i.naturalWidth)return;ctx.imageSmoothingEnabled=false;ctx.drawImage(i,frame*A.w,0,A.w,A.h,Math.round(x-A.w/2*k),Math.round(y-A.pivot*k),A.w*k,A.h*k);}
function effect(ctx,name,x,y,t,k=2){const i=img(name);if(!i.complete||!i.naturalWidth)return;const f=Math.min(A.frames-1,Math.max(0,Math.floor(t*A.frames)));ctx.drawImage(i,f*A.fxW,0,A.fxW,A.fxH,Math.round(x-A.fxW/2*k),Math.round(y-A.fxH/2*k),A.fxW*k,A.fxH*k);}
function text(ctx,s,x,y){ctx.fillStyle='#dfbc88';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText(s,x,y);}
export function drawRqMob(ctx,m,time){
 if(m.rq==='boss'){
  sprite(ctx,'rq0',m.x,m.y,2,Math.max(0,(m.rqPhase||1)-1));
  if(m.rqShield>0&&m.rqPhase===1){ctx.strokeStyle='#ef8a87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(m.x+(m.ax||1)*65,m.y-100,35,100,0,-Math.PI/2,Math.PI/2);ctx.stroke();}
  if(m.rqWarn)effect(ctx,'converge',m.x,m.y-130,(time%1),1);
 }else sprite(ctx,m.rq==='core'?'core':'chain',m.x,m.y,1);
}
export function drawRqGround(ctx,g,M,h,time){
 if(!h)return;
 if(M.id==='bloodlab'&&h.bag?.rq&&!h.bag.rq.rewarded){
  const d=h.rqRun?.door||0;ctx.save();ctx.beginPath();ctx.rect(RQ.door.x-100,RQ.door.y-240,200,260);ctx.clip();
  sprite(ctx,'door',RQ.door.x-Math.max(0,d-2.5)*75,RQ.door.y,2);ctx.restore();text(ctx,'RQ-0',RQ.door.x,RQ.door.y+28);
  if(d>0){ctx.fillStyle=Math.floor(d*8)%2?'#ff8a82':'#8c2539';ctx.fillRect(RQ.door.x-78,RQ.door.y-148,6,12);ctx.fillStyle='#d3af79';ctx.fillRect(RQ.door.x-8+Math.min(1,Math.max(0,d-2))*20,RQ.door.y-112,16,10);}
 }
 if(!rqMap(M.id))return;
 const q=h.bag?.rq,s=h.rqRun,t=s?.reveal||0;
 // 바닥과 벽: 고정 격자·격리 구획. 기존 맵 좌표를 그대로 쓴다.
 ctx.fillStyle='#211b21';ctx.fillRect(80,170,1640,1100);
 ctx.strokeStyle='#44333a';ctx.lineWidth=1;
 for(let x=80;x<1720;x+=80){ctx.beginPath();ctx.moveTo(x,170);ctx.lineTo(x,1270);ctx.stroke();}
 for(let y=170;y<1270;y+=80){ctx.beginPath();ctx.moveTo(80,y);ctx.lineTo(1720,y);ctx.stroke();}
 ctx.fillStyle='#15131a';ctx.fillRect(80,560,660,35);ctx.fillRect(1060,560,660,35);
 if(!rqSealed(q)){sprite(ctx,'door',900,605,2);text(ctx,'세 봉인을 해제하세요',900,640);}else if(!g.mobs.some(m=>m.rq==='boss'&&m.map===M.id&&!m.dead))text(ctx,'봉인 해제 · 유리관을 조사하세요',900,605);
 for(const b of s?.breaks||[])effect(ctx,'fracture',b.x,b.y-35,b.t,1);
 const f=RQ.field;ctx.strokeStyle=q?.b?'#b39464':'#a74e59';ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.78,0,0,Math.PI*2);ctx.stroke();
 if(s?.field>0&&!q?.b)effect(ctx,'veins',f.x,f.y,(time%1),2);
 text(ctx,q?.b?'혈액 증폭 · 해제':'혈역 증폭을 2초 유지',f.x,f.y+65);
 text(ctx,q?.a?'혈액 압축 · 해제':'적혈탄 2단계',RQ.core.x,RQ.core.y+35);
 text(ctx,'혈검으로 사슬을 공격',1350,1090);
 if(t<1.5)sprite(ctx,'tube',RQ.tube.x,RQ.tube.y,2);
 if(t>=1&&t<1.5){ctx.strokeStyle='#ecb4a6';ctx.beginPath();ctx.moveTo(900,100);ctx.lineTo(886,165);ctx.lineTo(918,209);ctx.lineTo(893,290);ctx.stroke();}
 if(t>=1.5&&t<2.5)effect(ctx,'fracture',900,250,t-1.5,3);
 if(t>0)sprite(ctx,'rq0',1100,430,2,3);
 if(t<1.5||t>=2){
  const gun=cache.gun||(cache.gun=new Image());if(!gun.src)gun.src='/assets/game/rpg/weapons/blood_gun.webp';
  const y=t<1.5?230:t>=5.5?h.y-70:260-Math.sin(Math.min(1,(t-2)/.5)*Math.PI/2)*45;
  if(gun.complete&&gun.naturalWidth)ctx.drawImage(gun,Math.round(t>=5.5?h.x-65:835),y,130,85);
  if(t>=3.5&&t<5.5){const u=Math.min(1,(t-3.5)/1.0);effect(ctx,'converge',h.x+(900-h.x)*u,h.y-45+(y+80-h.y)*u,(t-3.5)%1,2);}
  if(t>=4.5&&t<5.5)effect(ctx,'veins',900,y+35,(t-4.5)%1,1);
 }
 for(const m of g.mobs){if(m.map!==M.id||m.rq!=='boss'||!m.rqWarn)continue;
  const a=RQ.attacks[(m.rqPhase||1)-1],w=m.rqWarn;ctx.fillStyle='rgba(155,25,45,.16)';ctx.strokeStyle='#ed747d';ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(w.x,w.y,a.r,a.r*.78,0,0,Math.PI*2);ctx.fill();ctx.stroke();effect(ctx,m.rqPhase===3?'fracture':'shock',w.x,w.y,1-w.t/a.warn,Math.max(1,Math.round(a.r/90)));
 }
}
