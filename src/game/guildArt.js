/* 길드 성전과 세 보스의 전용 그림. 캐릭터 스킬 연출은 재사용하지 않는다. */
import {GUILD_BOSS_BY_TYPE} from './guildData.js';
import {guildRunOf} from './guild.js';
import {bloom,ring,sparks} from './combatFx.js';
const TAU=Math.PI*2;
export function drawGuildStatue(ctx,g,n,time){
 const {x,y}=n,level=g.heroes[g.mySeat]?.guild?.level||0;
 ctx.save();ctx.translate(x,y);bloom(ctx,0,-60,105,'#e6d6a0',.2+level/350);
 ctx.fillStyle='#544533';ctx.fillRect(-67,0,134,18);ctx.fillStyle='#c0b998';ctx.fillRect(-53,-18,106,20);ctx.fillStyle='#817d6b';ctx.fillRect(-39,-37,78,20);
 ctx.fillStyle='#ded8bd';ctx.strokeStyle='#706f5d';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,-130);ctx.lineTo(-14,-113);ctx.lineTo(-38,-38);ctx.lineTo(35,-38);ctx.lineTo(13,-113);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(0,-145,16,0,TAU);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-11,-112);ctx.lineTo(-39,-81);ctx.lineTo(-50,-120);ctx.moveTo(11,-112);ctx.lineTo(39,-81);ctx.lineTo(50,-120);ctx.stroke();
 ring(ctx,0,-147,30,.5,'#f4dd9b',.75,3);ring(ctx,0,9,80,.27,'#e9d7a2',.5,1);
 for(let i=0;i<6;i++){const a=time*.6+i*TAU/6;ctx.fillStyle='#f7eac3';ctx.fillRect(Math.cos(a)*62-2,-68+Math.sin(a)*35,4,4);}
 ctx.fillStyle='#372819';ctx.strokeStyle='#ad915b';ctx.fillRect(-72,-211,144,29);ctx.strokeRect(-72,-211,144,29);ctx.font="20px 'Do Hyeon',sans-serif";ctx.fillStyle='#f1dfb8';ctx.textAlign='center';ctx.fillText('길드 성전',0,-190);ctx.restore();
}
export function drawGuildBoss(ctx,m,time){
 const B=GUILD_BOSS_BY_TYPE[m.type];if(!B)return;
 ctx.save();ctx.translate(m.x,m.y);ctx.fillStyle='rgba(10,10,12,.3)';ctx.beginPath();ctx.ellipse(0,4,110,32,0,0,TAU);ctx.fill();ctx.strokeStyle='#342c2b';ctx.lineWidth=5;
 const bob=Math.sin(time*2)*5;ctx.translate(0,bob);
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
 const r=guildRunOf(g,{map});if(!r?.attack)return;const a=r.attack,p=1-Math.max(0,a.t)/a.life;
 a.areas.forEach(s=>paint(ctx,s,'#edbb79',.12+p*.2));ctx.save();ctx.font="24px 'Do Hyeon',sans-serif";ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#382b21';ctx.fillStyle='#f6e5b9';const text=`${a.name} · ${Math.max(0,a.t).toFixed(1)}초`;ctx.strokeText(text,r.x,r.y+80);ctx.fillText(text,r.x,r.y+80);ctx.restore();
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
