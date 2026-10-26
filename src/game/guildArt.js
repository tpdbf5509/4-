/* 길드 성전과 세 보스의 전용 그림. 캐릭터 스킬 연출은 재사용하지 않는다. */
import {GUILD_BOSS_BY_TYPE,GUILD_BOSSES,GUILD_BOSS_ART as ART,GUILD_HALL as HALL,GUILD_STATUE_ART as STATUE} from './guildData.js';
import {guildRunOf} from './guild.js';
import {bloom,ring,sparks} from './combatFx.js';
const TAU=Math.PI*2;
let atlas;
let statue;
export function warmGuildArt(){
 if(typeof Image==='undefined')return null;
 if(atlas===undefined){atlas=new Image();atlas.onerror=()=>{atlas=null;};atlas.src=ART.path;}
 warmStatueArt();
 return atlas;
}
// 여신 조각상 그림 — RPG 진입 때 보스 그림과 함께 미리 읽는다
export function warmStatueArt(){
 if(typeof Image==='undefined')return null;
 if(statue===undefined){statue=new Image();statue.onerror=()=>{statue=null;};statue.src=STATUE.path;}
 return statue;
}
export const guildBossTop=()=>ART.size*.94;
export function drawGuildStatue(ctx,g,n,time){
 const {x,y}=n,level=g.heroes[g.mySeat]?.guild?.level||0,im=warmStatueArt();
 if(im?.complete&&im.naturalWidth){   // 그림(날개 단 여신 · 검과 방패) — 발밑이 기준점에 오게. 성전 레벨이 오를수록 둘레 빛이 짙어진다
  const h=STATUE.h,w=h*im.naturalWidth/im.naturalHeight,top=STATUE.foot-h;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(18,13,9,.3)';ctx.beginPath();ctx.ellipse(0,STATUE.foot-4,w*.5,16,0,0,TAU);ctx.fill();
  bloom(ctx,0,top+h*.45,h*.55,'#e6d6a0',.16+level/350);
  ctx.drawImage(im,-w/2,top,w,h);
  bloom(ctx,0,top+h*.12,26+4*Math.sin(time*2.4),'#fff0c4',.45);   // 머리 뒤 빛고리
  for(let i=0;i<6;i++){const a=time*.6+i*TAU/6;ctx.fillStyle='#f7eac3';ctx.fillRect(Math.cos(a)*w*.42-2,top+h*.55+Math.sin(a)*h*.18,4,4);}
  ctx.fillStyle='#372819';ctx.strokeStyle='#ad915b';ctx.lineWidth=2;ctx.fillRect(-72,top-40,144,29);ctx.strokeRect(-72,top-40,144,29);
  ctx.font="20px 'Do Hyeon',sans-serif";ctx.fillStyle='#f1dfb8';ctx.textAlign='center';ctx.fillText('여신 조각상',0,top-19);ctx.restore();
  return;
 }
 ctx.save();ctx.translate(x,y);bloom(ctx,0,-60,105,'#e6d6a0',.2+level/350);
 ctx.fillStyle='#544533';ctx.fillRect(-67,0,134,18);ctx.fillStyle='#c0b998';ctx.fillRect(-53,-18,106,20);ctx.fillStyle='#817d6b';ctx.fillRect(-39,-37,78,20);
 ctx.fillStyle='#ded8bd';ctx.strokeStyle='#706f5d';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,-130);ctx.lineTo(-14,-113);ctx.lineTo(-38,-38);ctx.lineTo(35,-38);ctx.lineTo(13,-113);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(0,-145,16,0,TAU);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-11,-112);ctx.lineTo(-39,-81);ctx.lineTo(-50,-120);ctx.moveTo(11,-112);ctx.lineTo(39,-81);ctx.lineTo(50,-120);ctx.stroke();
 ring(ctx,0,-147,30,.5,'#f4dd9b',.75,3);ring(ctx,0,9,80,.27,'#e9d7a2',.5,1);
 for(let i=0;i<6;i++){const a=time*.6+i*TAU/6;ctx.fillStyle='#f7eac3';ctx.fillRect(Math.cos(a)*62-2,-68+Math.sin(a)*35,4,4);}
 ctx.fillStyle='#372819';ctx.strokeStyle='#ad915b';ctx.fillRect(-72,-211,144,29);ctx.strokeRect(-72,-211,144,29);ctx.font="20px 'Do Hyeon',sans-serif";ctx.fillStyle='#f1dfb8';ctx.textAlign='center';ctx.fillText('여신 조각상',0,-190);ctx.restore();
}
// 문 하나 — 돌 아치 · 안쪽 빛 · 위 이름판. 광장의 길드 문과 길드 광장의 토벌전 문이 같이 쓴다
export function drawArchDoor(ctx,x,y,time,label,sub,color,inner){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(18,13,9,.35)';ctx.beginPath();ctx.ellipse(0,8,80,22,0,0,TAU);ctx.fill();
 bloom(ctx,0,-80,95,color,.28+.08*Math.sin(time*2));
 ctx.fillStyle='#5b4c3a';ctx.strokeStyle='#2e241a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(-66,6);ctx.lineTo(-66,-110);ctx.arc(0,-110,66,Math.PI,0);ctx.lineTo(66,6);ctx.lineTo(44,6);ctx.lineTo(44,-108);ctx.arc(0,-108,44,0,Math.PI,true);ctx.lineTo(-44,6);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.save();ctx.beginPath();ctx.moveTo(-44,6);ctx.lineTo(-44,-108);ctx.arc(0,-108,44,Math.PI,0);ctx.lineTo(44,6);ctx.closePath();ctx.clip();
 ctx.fillStyle=inner;ctx.fillRect(-46,-156,92,164);
 for(let i=0;i<6;i++){const p=(i/6+time*.18)%1;ctx.globalAlpha=(1-p)*.7;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-60,6+p*40,10+p*70,0,0,TAU);ctx.stroke();}
 ctx.restore();
 ctx.fillStyle='#8c7a5c';for(let i=0;i<5;i++){const a=Math.PI+i*Math.PI/4;ctx.fillRect(Math.cos(a)*55-5,-110+Math.sin(a)*55-5,10,10);}
 ctx.fillStyle='#372819';ctx.strokeStyle='#ad915b';ctx.lineWidth=2;ctx.fillRect(-78,-214,156,29);ctx.strokeRect(-78,-214,156,29);
 ctx.font="20px 'Do Hyeon',sans-serif";ctx.textAlign='center';ctx.fillStyle='#f1dfb8';ctx.fillText(label,0,-193);
 if(sub){ctx.font="14px 'Do Hyeon',sans-serif";ctx.fillStyle=color;ctx.fillText(sub,0,36);}
 ctx.restore();
}
export function drawGuildDoor(ctx,g,n,time){
 const me=g.heroes[g.mySeat];drawArchDoor(ctx,n.x,n.y,time,'길드 문',me?.guild?.id?'내 길드 광장으로':'길드 찾기','#e6c98f','#2c2440');
}
export function drawGuildRaidDoor(ctx,g,n,time){
 const me=g.heroes[g.mySeat],raid=me?.guild?.raid;drawArchDoor(ctx,n.x,n.y,time,'토벌전 문',raid?'토벌 진행 중':'보스 선택','#e79a7a','#3a1f22');
}
export function drawGuildBoss(ctx,m,time){
 const B=GUILD_BOSS_BY_TYPE[m.type];if(!B)return;
 ctx.save();ctx.translate(m.x,m.y);ctx.fillStyle='rgba(10,10,12,.3)';ctx.beginPath();ctx.ellipse(0,4,110,32,0,0,TAU);ctx.fill();ctx.strokeStyle='#342c2b';ctx.lineWidth=5;
 const bob=Math.sin(time*2)*5;ctx.translate(0,bob);
 const im=warmGuildArt();
 if(im?.complete&&im.naturalWidth){
   const col=GUILD_BOSSES.indexOf(B),row=m.pose?1:0,cw=im.naturalWidth/ART.cols,ch=im.naturalHeight/ART.rows;
   ctx.imageSmoothingEnabled=false;ctx.drawImage(im,col*cw,row*ch,cw,ch,-ART.size/2,-ART.size*ART.feet[row][col],ART.size,ART.size);ctx.restore();return;
 }

 if(B.id==='slime'){
   ctx.fillStyle='#86b967';ctx.beginPath();ctx.moveTo(-116,-12);ctx.quadraticCurveTo(-133,-81,-75,-120);ctx.quadraticCurveTo(-14,-194,55,-133);ctx.quadraticCurveTo(135,-103,117,-12);ctx.quadraticCurveTo(0,26,-116,-12);ctx.fill();ctx.stroke();
   ctx.fillStyle='#cfe7ab';ctx.fillRect(-65,-113,33,13);ctx.fillStyle='#dbcf99';ctx.fillRect(-90,-139,180,20);ctx.fillRect(-73,-163,18,24);ctx.fillRect(-10,-175,20,36);ctx.fillRect(55,-163,18,24);
   ctx.fillStyle='#292b20';ctx.fillRect(-40,-77,14,25);ctx.fillRect(27,-77,14,25);ctx.fillRect(-12,-38,25,7);
 }else if(B.id==='siren'){
   ctx.fillStyle='#5f8da6';ctx.beginPath();ctx.moveTo(-18,-87);ctx.quadraticCurveTo(100,-48,75,-6);ctx.lineTo(129,-47);ctx.lineTo(135,10);ctx.lineTo(77,18);ctx.quadraticCurveTo(-18,45,-32,-41);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#bcd8d5';ctx.fillRect(-29,-130,56,64);ctx.beginPath();ctx.arc(0,-160,29,0,TAU);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#346577';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-30,-176);ctx.quadraticCurveTo(-75,-117,-43,-79);ctx.moveTo(22,-176);ctx.quadraticCurveTo(69,-121,45,-65);ctx.stroke();
   ctx.strokeStyle='#a3d9db';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-22,-117);ctx.lineTo(-91,-65);ctx.moveTo(22,-117);ctx.lineTo(90,-75);ctx.stroke();
   ctx.strokeStyle='#e3dba7';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(93,-30);ctx.lineTo(93,-193);ctx.moveTo(72,-193);ctx.lineTo(72,-216);ctx.moveTo(93,-193);ctx.lineTo(93,-226);ctx.moveTo(114,-193);ctx.lineTo(114,-216);ctx.moveTo(72,-193);ctx.lineTo(114,-193);ctx.stroke();
   ctx.fillStyle='#f1e2ae';ctx.fillRect(-18,-194,36,8);ctx.fillRect(-5,-208,10,14);
 }else{
   for(const k of [-1,1]){ctx.fillStyle='#d77a45';ctx.beginPath();ctx.moveTo(k*13,-119);ctx.lineTo(k*158,-196-Math.sin(time*4)*15);ctx.lineTo(k*130,-97);ctx.lineTo(k*62,-41);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.strokeStyle='#f5cc79';ctx.lineWidth=6;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(k*(27+i*16),-110);ctx.lineTo(k*(65+i*29),-150+i*14);ctx.stroke();}ctx.strokeStyle='#342c2b';}
   ctx.fillStyle='#e8a357';ctx.beginPath();ctx.ellipse(0,-110,33,69,0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-183,26,0,TAU);ctx.fill();ctx.stroke();
   ctx.fillStyle='#ffe1a2';ctx.beginPath();ctx.moveTo(16,-185);ctx.lineTo(59,-170);ctx.lineTo(20,-164);ctx.fill();ctx.beginPath();ctx.moveTo(-16,-216);ctx.lineTo(0,-253);ctx.lineTo(19,-214);ctx.fill();
   for(let i=0;i<5;i++){ctx.strokeStyle=i%2?'#f4d27d':'#d77345';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,-62);ctx.quadraticCurveTo((i-2)*30,-15,(i-2)*42,25+Math.sin(time*3+i)*15);ctx.stroke();}
 }
 ctx.restore();
}
function shape(ctx,s){ctx.beginPath();if(s.shape==='line'){ctx.rotate(s.a);ctx.rect(-40,-s.width,s.len+40,s.width*2);}else{ctx.arc(0,0,s.r,0,TAU);if(s.shape==='ring')ctx.arc(0,0,s.inner,0,TAU,true);}}
function paint(ctx,s,color,alpha){ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,.78);shape(ctx,s);ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.fill('evenodd');ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=color;ctx.stroke();ctx.restore();}
export function drawGuildGround(ctx,g,map){
 if(typeof map==='string'&&map.startsWith('guildhall-'))return drawHallFloor(ctx);
 const r=guildRunOf(g,{map});if(!r?.attack)return;const a=r.attack,p=1-Math.max(0,a.t)/a.life;
 a.areas.forEach(s=>paint(ctx,s,'#edbb79',.12+p*.2));ctx.save();ctx.font="24px 'Do Hyeon',sans-serif";ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#382b21';ctx.fillStyle='#f6e5b9';const text=`${a.name} · ${Math.max(0,a.t).toFixed(1)}초`;ctx.strokeText(text,r.x,r.y+80);ctx.fillText(text,r.x,r.y+80);ctx.restore();
}
// 길드 광장 바닥 — 조각상을 가운데 둔 둥근 돌바닥과 문 셋을 잇는 붉은 길(코드로 그린다)
function drawHallFloor(ctx){
 const {statue:S,raidDoor:R,exit:E}=HALL,sq=.78;
 ctx.save();
 const road=(x0,y0,x1,y1)=>{ctx.strokeStyle='#8a7a62';ctx.lineWidth=96;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
   ctx.strokeStyle='#7a3f3a';ctx.lineWidth=54;ctx.stroke();ctx.strokeStyle='rgba(230,200,140,.55)';ctx.lineWidth=2;ctx.setLineDash([14,10]);ctx.stroke();ctx.setLineDash([]);};
 road(E.x,E.y,S.x,S.y+170);road(S.x,S.y+170,R.x,R.y+40);
 ctx.translate(S.x,S.y+60);ctx.scale(1,sq);
 ctx.fillStyle='#b9ae98';ctx.beginPath();ctx.arc(0,0,330,0,TAU);ctx.fill();ctx.strokeStyle='#8d826c';ctx.lineWidth=6;ctx.stroke();
 ctx.strokeStyle='rgba(120,108,88,.55)';ctx.lineWidth=2;
 for(const r of [110,200,270]){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}
 for(let i=0;i<16;i++){const a=i*TAU/16;ctx.beginPath();ctx.moveTo(Math.cos(a)*110,Math.sin(a)*110);ctx.lineTo(Math.cos(a)*330,Math.sin(a)*330);ctx.stroke();}
 ctx.fillStyle='rgba(230,214,160,.35)';ctx.beginPath();ctx.arc(0,0,105,0,TAU);ctx.fill();
 ctx.restore();
}
export function drawGuildFx(ctx,f,p,q){
 if(f.kind!=='sk_guild_hit')return false;
 const tone=f.boss==='siren'?['#356778','#8de4e7','#e5fbf4']:f.boss==='slime'?['#507947','#b4e77c','#f4ffc8']:['#9b492f','#f4ad5d','#fff0bd'];
 const s=f.area;paint(ctx,s,tone[1],(1-p)*.25);
 if(s.shape==='line'){
   ctx.save();ctx.strokeStyle=tone[2];ctx.globalAlpha=1-p;ctx.lineWidth=s.width*(1-p);ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+Math.cos(s.a)*s.len,s.y+Math.sin(s.a)*s.len*.78);ctx.stroke();ctx.restore();
 }else{ring(ctx,f.x,f.y,s.r*(.6+p*.4),.78,tone[1],1-p,6);if(s.inner)ring(ctx,f.x,f.y,s.inner,.78,tone[2],1-p,3);}
 const n=Math.round(14*q);for(let i=0;i<n;i++){const a=i*TAU/n,d=(s.r||220)*(.2+p*.6),x=f.x+Math.cos(a)*d,y=f.y+Math.sin(a)*d*.78;
   ctx.save();ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=tone[1];ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(i)*15,y-95*Math.sin(p*Math.PI));ctx.stroke();ctx.restore();}
 bloom(ctx,f.x,f.y-30,120,tone[1],.5*(1-p));sparks(ctx,f.x,f.y,240,p,tone,q,22,3);return true;
}
