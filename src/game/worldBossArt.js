/* 월드보스 전용 그림과 위험지역. 기존 캐릭터 스킬 효과는 재사용하지 않는다. */
import {WORLD_BOSS as C,WORLD_BOSSES,WORLD_BOSS_BY_TYPE} from './worldBossData.js';
import {bloom,sparks} from './combatFx.js';
let atlas;
export function warmWorldBossArt(){
  if(typeof Image==='undefined')return null;
  if(atlas===undefined){atlas=new Image();atlas.onerror=()=>{atlas=null;};atlas.src=C.art;}
  return atlas?.complete&&atlas.naturalWidth?atlas:null;
}
function path(ctx,s){
  ctx.beginPath();
  if(s.shape==='ring'){ctx.arc(0,0,s.r,0,Math.PI*2);ctx.arc(0,0,s.inner,0,Math.PI*2,true);}
  else if(s.shape==='circle')ctx.arc(0,0,s.r,0,Math.PI*2);
  else if(s.shape==='cone'){ctx.moveTo(0,0);ctx.arc(0,0,s.len,s.a-s.arc,s.a+s.arc);ctx.closePath();}
  else{ctx.rotate(s.a);ctx.rect(-40,-s.width,s.len+40,s.width*2);}
}
function paintArea(ctx,s,color,alpha,dashed=false){
  ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,C.squash);path(ctx,s);
  ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.fill('evenodd');ctx.globalAlpha/=Math.max(.01,alpha);ctx.strokeStyle=color;ctx.lineWidth=3;
  if(dashed)ctx.setLineDash([12,8]);ctx.stroke();ctx.restore();
}
export function drawWorldBossGround(ctx,g,map){
  if(map!==C.map||!g.wb?.active)return;
  const a=g.wb.active,B=WORLD_BOSSES.find(b=>b.id===a.id);
  a.pools.forEach(p=>paintArea(ctx,p,'#9563b2',.28));
  if(a.attack){
    const p=1-a.attack.t/a.attack.life;
    a.attack.areas.forEach(s=>paintArea(ctx,s,'#f7b267',.12+p*.22,true));
    ctx.save();ctx.fillStyle='#fff0c2';ctx.strokeStyle='#2d1b13';ctx.lineWidth=5;ctx.font="bold 24px 'Do Hyeon',sans-serif";ctx.textAlign='center';
    const label=`${B.sub.split(' · ')[(a.seq-1)%2]} · ${Math.max(0,a.attack.t).toFixed(1)}초`;
    ctx.strokeText(label,a.x,a.y+54);ctx.fillText(label,a.x,a.y+54);ctx.restore();
  }
}
export function drawWorldBossSprite(ctx,m,time){
  const B=WORLD_BOSS_BY_TYPE[m.type];if(!B)return false;
  const im=warmWorldBossArt(),col=WORLD_BOSSES.indexOf(B),row=m.pose?1:0;
  const size=C.artSize,bob=m.pose?0:Math.sin(time*2)*3;
  ctx.save();ctx.translate(m.x,m.y+bob);
  ctx.fillStyle='rgba(15,10,10,.3)';ctx.beginPath();ctx.ellipse(0,0,105,28,0,0,Math.PI*2);ctx.fill();
  if(im){const cw=im.naturalWidth/C.artCols,ch=im.naturalHeight/C.artRows;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,col*cw,row*ch,cw,ch,-size*.5,-size*C.artFeet[row][col],size,size);}
  else{ctx.fillStyle=B.color;ctx.strokeStyle='#362315';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-110,105,110,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff2bb';ctx.fillRect(-50,-155,20,10);ctx.fillRect(30,-155,20,10);ctx.beginPath();ctx.moveTo(-80,-185);ctx.lineTo(-100,-260);ctx.lineTo(-30,-205);ctx.moveTo(80,-185);ctx.lineTo(100,-260);ctx.lineTo(30,-205);ctx.fill();}
  ctx.restore();return true;
}
export function drawWorldBossFx(ctx,f,p,quality){
  if(f.kind!=='sk_raid_hit')return false;
  const color=WORLD_BOSSES.find(b=>b.id===f.tone)?.color||'#ffe2a0';
  if(f.area)paintArea(ctx,f.area,color,(1-p)*.4);
  bloom(ctx,f.x,f.y-25,100,color,.65*(1-p));
  sparks(ctx,f.x,f.y-25,170,p,[color,'#fff0be','#bf7544'],quality,18,2);
  return true;
}
