/* 비룡육연사 전용: 실제 용 그림의 비행 프레임 + 꼬리 에너지. 다른 스킬 그림을 가져다 쓰지 않는다. */
import { DRAGON_FLIGHT_ART as ART } from './worldEquipmentData.js';
import { bloom, sparks, ring } from './combatFx.js';
const TONE=['#731e22','#e67438','#ffe5a0'];
let sheet;
export function warmDragonFlightArt(){
  if(typeof Image==='undefined')return null;
  if(sheet===undefined){
    sheet=new Image();sheet.onerror=()=>{sheet=null;};sheet.src=ART.src;
  }
  return sheet?.complete && sheet.naturalWidth ? sheet : null;
}
function destination(f,g){
  const key=f.target;
  const o=!key?null:key[0]==='m'?g?.mobs.find(m=>m.id===Number(key.slice(1))):g?.heroes[Number(key.slice(1))];
  const owner=o?.who||o?.sw;
  return o && o.map===f.map && !o.dead && !(o.down>0) && (!f.targetOwner || f.targetOwner===owner)
    ? [o.x,o.y-30] : [f.x1,f.y1];
}
function point(f,g,p){
  const [tx,ty]=destination(f,g);
  return [f.x0+(tx-f.x0)*p,f.y0+(ty-f.y0)*p];
}
function drawFrame(ctx,im,frame,size){
  const cw=im.naturalWidth/ART.columns,ch=im.naturalHeight/ART.rows;
  const [headX,headY]=ART.anchors[frame];
  ctx.drawImage(im,(frame%ART.columns)*cw,Math.floor(frame/ART.columns)*ch,cw,ch,-headX*size,-headY*size,size,size);
}
function fallback(ctx,size,p){
  // 파일을 읽지 못한 기기에서도 발사 방향과 용의 몸은 확인할 수 있게 한다.
  const s=size/230;ctx.save();ctx.scale(s,s);ctx.fillStyle='#ac302a';ctx.strokeStyle='#e5aa53';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-10,-8);ctx.quadraticCurveTo(-45,-35,-90,-12);ctx.quadraticCurveTo(-135,17,-170,-20);
  ctx.quadraticCurveTo(-135,40,-75,20);ctx.lineTo(-20,12);ctx.closePath();ctx.fill();ctx.stroke();
  const flap=Math.sin(p*Math.PI*2)*25;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-55,0);ctx.lineTo(-90,side*(35+flap));ctx.lineTo(-45,side*(60+flap));ctx.lineTo(-25,0);ctx.fill();ctx.stroke();}
  ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-12,-15);ctx.lineTo(-30,-12);ctx.lineTo(-40,-24);ctx.lineTo(-36,10);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff0b3';ctx.fillRect(-12,-9,4,3);ctx.restore();
}
function drawFlight(ctx,f,p,g,quality){
  const im=warmDragonFlightArt(),[x,y]=point(f,g,p),[tx,ty]=destination(f,g),angle=Math.atan2(ty-f.y0,tx-f.x0);
  const reveal=.62+.38*Math.min(1,p*7),fade=Math.min(1,(1-p)*12),size=ART.size*reveal;
  const frame=Math.min(ART.frames-1,Math.floor(p*ART.frames));
  // 잔상을 옅게 두어 본체의 비늘과 얼굴을 가리지 않는다.
  if(im)for(let i=quality>.7?2:1;i>=1;i--){
    const before=Math.max(0,p-i*.045),[px,py]=point(f,g,before);
    ctx.save();ctx.translate(px,py);ctx.rotate(angle);if(Math.cos(angle)<0)ctx.scale(1,-1);
    ctx.globalAlpha*=.08/i*fade;drawFrame(ctx,im,Math.max(0,frame-i),size);ctx.restore();
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);if(Math.cos(angle)<0)ctx.scale(1,-1);ctx.globalAlpha*=fade;
  const tailX=-size*.64,tailY=-size*.04;
  bloom(ctx,tailX,tailY,size*.33,TONE[1],.35);
  // 꼬리에만 빛을 흘린다. 몸과 날개는 원래 색을 유지한다.
  for(const [w,col,a]of [[7,TONE[0],.55],[3,TONE[1],.7],[1,TONE[2],.8]]){
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(tailX+22,tailY+i*3);ctx.bezierCurveTo(tailX-12,tailY-8+i*16,tailX-45,tailY+Math.sin(p*12+i)*12,tailX-85-i*16,tailY+i*5);ctx.stroke();}ctx.restore();
  }
  sparks(ctx,tailX-22,tailY,60,p,TONE,quality,10,f.x0*.01);
  if(im){ctx.imageSmoothingEnabled=false;drawFrame(ctx,im,frame,size);}else fallback(ctx,size,p);
  ctx.restore();
  if(p<.2)bloom(ctx,f.x0,f.y0,55,TONE[2],.18*(1-p/.2));
}
function drawHit(ctx,f,p,quality){
  const r=f.r||100;
  bloom(ctx,f.x,f.y,r*.85,TONE[1],.6*(1-p));
  bloom(ctx,f.x,f.y,r*.28,TONE[2],.8*Math.max(0,1-p*5));
  ring(ctx,f.x,f.y,r*(.25+p*.7),.62,TONE[1],(1-p)**1.5,3);
  // 명중점에서 송곳니 모양의 빛 조각이 퍼진다.
  ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha*=(1-p)**1.4;
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7+.3,d=r*p*.8;ctx.save();ctx.rotate(a);ctx.translate(d,0);
    ctx.fillStyle=i%2?TONE[1]:TONE[2];ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(22*(1-p),0);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();ctx.restore();
  }ctx.restore();sparks(ctx,f.x,f.y,r*1.4,p,TONE,quality,22,4);
}
export function drawDragonFlightFx(ctx,f,p,g,quality){
  if(f.kind!=='sk_wb_dragon_flight'&&f.kind!=='sk_wb_dragon_hit')return false;
  ctx.save();
  if(f.kind==='sk_wb_dragon_flight')drawFlight(ctx,f,p,g,quality);else drawHit(ctx,f,p,quality);
  ctx.restore();return true;
}
