/* 공통 광원과 궤적. 광원은 한 번 만들어 캐시하고 알갱이 수만 품질에 맞춘다. */
const TAU = Math.PI * 2;
const lights = new Map();
export const FX_TONES = {
  dragon: ['#8c092e', '#ff315a', '#ffd5ca'], fire: ['#9b2812', '#ff873c', '#fff0b5'],
  poison: ['#274f39', '#8fdc78', '#e7ffb6'], bolt: ['#17496a', '#54c8ff', '#e8fcff'],
  holy: ['#8a5a24', '#edc971', '#fff8dd'], shadow: ['#43234f', '#bd6be1', '#f7ddff'],
  ice: ['#28576f', '#8ad9f3', '#efffff'], star: ['#493e7e', '#bba6ff', '#f3eeff'],
};
export function bloom(ctx, x, y, r, color, alpha = 1) {
  if (!(r > 0) || alpha <= 0 || typeof document === 'undefined') return;
  let im = lights.get(color);
  if (!im) {
    if (lights.size >= 48) return;
    im = document.createElement('canvas'); im.width = im.height = 96;
    const c = im.getContext('2d'), g = c.createRadialGradient(48,48,0,48,48,48);
    g.addColorStop(0,color); g.addColorStop(.16,color); g.addColorStop(1,'transparent');
    c.fillStyle=g; c.fillRect(0,0,96,96); lights.set(color,im);
  }
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha*=alpha;
  ctx.drawImage(im,x-r,y-r,r*2,r*2); ctx.restore();
}
export function sparks(ctx, x, y, r, p, tone, quality = 1, count = 18, seed = 0) {
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  const n=Math.max(3,Math.round(count*quality)),fade=(1-p)**1.6;
  for(let i=0;i<n;i++) {
    const a=i*2.39996+seed, speed=.3+((i*37)%100)/100, d=r*(.15+p*speed), len=(4+12*speed)*(1-p);
    ctx.globalAlpha=fade*(.35+speed*.5); ctx.strokeStyle=i%3?tone[1]:tone[2];ctx.lineWidth=i%4?1.2:2.3;
    ctx.beginPath();ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d*.66);
    ctx.lineTo(x+Math.cos(a)*(d+len),y+Math.sin(a)*(d+len)*.66);ctx.stroke();
  }
  ctx.restore();
}
// 끝이 가늘어지는 띠에 외곽·색·밝은 심지를 겹쳐 참격을 만든다.
export function ribbon(ctx, r, angle, span, width, tone, quality = 1) {
  const n=Math.max(12,Math.round(28*quality));
  for(const [scale,color,alpha]of [[1.35,tone[0],.9],[1,tone[1],.95],[.24,tone[2],1]]) {
    ctx.save();ctx.fillStyle=color;ctx.globalAlpha*=alpha;
    ctx.beginPath();
    for(let i=0;i<=n;i++) {const t=i/n,a=angle+span*t,w=width*Math.sin(Math.PI*t)**.65*scale;
      const rr=r+w*.5; const x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
    for(let i=n;i>=0;i--){const t=i/n,a=angle+span*t,w=width*Math.sin(Math.PI*t)**.65*scale;
      ctx.lineTo(Math.cos(a)*(r-w*.5),Math.sin(a)*(r-w*.5));}
    ctx.closePath();ctx.fill();ctx.restore();
  }
}
export function ring(ctx, x, y, r, squash, color, alpha = 1, width = 2) {
  ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();ctx.ellipse(x,y,r,Math.max(1,r*squash),0,0,TAU);ctx.stroke();ctx.restore();
}
export function bolt(ctx, x0, y0, x1, y1, tone, p, width = 3, seed = 0) {
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,n=9;
  ctx.save();ctx.lineJoin='miter';
  for(const [w,col,a]of [[width*4,tone[0],.4],[width*2,tone[1],.8],[width*.6,tone[2],1]]) {
    ctx.globalAlpha=(1-p)*a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);
    for(let i=1;i<=n;i++){const t=i/n,j=i===n?0:Math.sin(i*7.7+seed)*Math.min(22,len*.09);
      ctx.lineTo(x0+dx*t-dy/len*j,y0+dy*t+dx/len*j);}
    ctx.stroke();
  }ctx.restore();
}
// 기존 직업·전설 스킬도 같은 광원과 불티를 쓴다. 고유한 형태는 유지한다.
export function skillAccent(ctx,f,p,quality){
  if(f.kind.startsWith('sk_wb_') || f.kind.startsWith('sk_m') || ['sk_ice','sk_ember','sk_rift','sk_bind'].includes(f.kind))return;
  const k=`${f.kind} ${f.tone||f.style||''}`,tone=/fire|blaze|flam|tornado|lava/.test(k)?FX_TONES.fire:/shadow|doom/.test(k)?FX_TONES.shadow:
    /ice/.test(k)?FX_TONES.ice:/holy|halo|wing/.test(k)?FX_TONES.holy:/zap|thunder/.test(k)?FX_TONES.bolt:FX_TONES.star;
  const projectile=f.kind==='sk_missile',beam=/pierce|beam/.test(k),x=projectile?f.x0+(f.x1-f.x0)*p:f.x,y=projectile?f.y0+(f.y1-f.y0)*p:f.y;
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const r=Math.min(170,f.r||f.w||55);
  bloom(ctx,x,y,r*.65,tone[1],Math.min(.32,(1-p)*.45));
  if(beam && Number.isFinite(f.x1))bolt(ctx,f.x0,f.y0,f.x1,f.y1,tone,p,1.2,2);
  if(!projectile && f.life<1.8)sparks(ctx,x,y,r*1.1,p,tone,quality,10,f.x*.01);
}
