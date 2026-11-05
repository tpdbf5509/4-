import {VILLAGE as V, VILLAGE_BUILDINGS, VILLAGE_NPCS, VILLAGE_SIGHTS, VILLAGE_PROPS, villageArtPath} from './villageData.js';

const images = new Map();
const ART_IDS = [...new Set(['gate', ...VILLAGE_BUILDINGS.map(n=>n.art), ...VILLAGE_NPCS.map(n=>n.art), ...VILLAGE_SIGHTS.map(n=>n.art), ...VILLAGE_PROPS.map(n=>n.art)])];
function villageImage(id) {
  if (typeof Image === 'undefined') return null;
  if (!images.has(id)) {
    const im = new Image(); images.set(id, im);
    im.onerror = () => images.set(id, null);
    im.src = villageArtPath(id);
  }
  const im = images.get(id);
  return im?.complete && im.naturalWidth ? im : null;
}
export function warmVillageArt(all = false) { (all ? ART_IDS : ['gate']).forEach(villageImage); }
export function drawVillageImage(ctx, id, x, y, size) {
  const im = villageImage(id); if (!im) return false;
  const k = size / V.art.size;
  ctx.drawImage(im, x - V.art.feet[0]*k, y - V.art.feet[1]*k, size, size);
  return true;
}
function label(ctx, text, x, y, color='#f6e5bb') {
  ctx.save(); ctx.font="14px 'Do Hyeon', sans-serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width+20;
  ctx.fillStyle='rgba(48,37,24,.88)'; ctx.beginPath(); ctx.roundRect(x-w/2,y-11,w,22,6); ctx.fill();
  ctx.fillStyle=color; ctx.fillText(text,x,y); ctx.restore();
}
export function drawVillageGate(ctx, gate, time) {
  if (!drawVillageImage(ctx,'gate',gate.x,gate.y,180)) {
    ctx.save();ctx.strokeStyle='#b0a18b';ctx.lineWidth=17;
    ctx.beginPath();ctx.moveTo(gate.x-58,gate.y);ctx.lineTo(gate.x-58,gate.y-80);ctx.arc(gate.x,gate.y-80,58,Math.PI,0);ctx.lineTo(gate.x+58,gate.y);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.strokeStyle=`rgba(231,216,161,${.3+Math.sin(time*2)*.1})`;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(gate.x,gate.y-2,45,15,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  label(ctx,gate.label,gate.x,gate.y-166);
}

export function drawVillageApproach(ctx) {
  // 명예판을 옮기지 않고 오른쪽으로 돌아 문에 닿는 길을 낸다.
  ctx.save();ctx.fillStyle='#4f6e34';ctx.beginPath();ctx.ellipse(900,135,160,85,0,0,Math.PI*2);ctx.fill();
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#b9ab8a';ctx.lineWidth=42;
  ctx.beginPath();ctx.moveTo(1030,340);ctx.lineTo(1030,230);ctx.lineTo(900,180);ctx.stroke();ctx.restore();
}

// 바닥은 한 번 그려 캐시한다. 길·장식은 충돌 데이터의 빈 구간을 따른다.
export function paintVillage(ctx) {
  ctx.fillStyle='#637d48';ctx.fillRect(0,0,V.w,V.h);
  let seed=1707;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5200;i++){
    ctx.fillStyle=i%3?'rgba(222,225,165,.07)':'rgba(29,62,31,.06)';
    ctx.beginPath();ctx.ellipse(rnd()*V.w,rnd()*V.h,8+rnd()*28,3+rnd()*10,0,0,Math.PI*2);ctx.fill();
  }
  const road=pts=>{
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle='#867c60';ctx.lineWidth=108;ctx.stroke();ctx.strokeStyle='#c2b493';ctx.lineWidth=96;ctx.stroke();
  };
  road([[1100,1600],[1100,1330],[1100,1080],[1100,670],[1100,530]]);
  road([[480,650],[650,780],[830,930],[1100,1000],[1480,1000],[1740,950]]);
  road([[470,1150],[700,1260],[1100,1330],[1460,1360],[1730,1390]]);
  road([[1100,670],[1360,620],[1560,580],[1710,470]]);
  ctx.fillStyle='#c2b493';ctx.beginPath();ctx.ellipse(1100,980,260,150,0,0,Math.PI*2);ctx.fill();
  // 작은 포석은 빈 길 위에만 놓는다.
  ctx.fillStyle='rgba(245,232,196,.26)';
  for(let y=730;y<1500;y+=37)for(let x=1070;x<=1130;x+=32){ctx.beginPath();ctx.roundRect(x+(y%2)*8,y,24,13,3);ctx.fill();}
  ctx.strokeStyle='rgba(109,95,69,.38)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(1100,980,247,138,0,0,Math.PI*2);ctx.stroke();
  // 풍차 옆 텃밭과 약초밭. 걸어서 살펴볼 수 있는 생활 풍경이다.
  for(const [x,y] of [[1870,1430],[270,1220]]){
    ctx.fillStyle='#7b6649';ctx.beginPath();ctx.roundRect(x-65,y-30,130,75,9);ctx.fill();
    for(let i=0;i<4;i++)for(let j=0;j<3;j++){
      ctx.fillStyle=i%2?'#91a95c':'#c1b969';ctx.beginPath();ctx.ellipse(x-47+i*31,y-16+j*23,9,5,-.3,0,Math.PI*2);ctx.fill();
    }
  }
  // 낮은 울타리. 남쪽 귀환 문 자리는 비운다.
  ctx.strokeStyle='#ad9670';ctx.lineWidth=5;
  for(let x=100;x<V.w-80;x+=60){
    if(Math.abs(x-V.exit.x)<160)continue;
    ctx.beginPath();ctx.moveTo(x,V.h-85);ctx.lineTo(x,V.h-118);ctx.moveTo(x,V.h-105);ctx.lineTo(x+60,V.h-105);ctx.stroke();
  }
}

// y 정렬에 참여시켜 건물·주민·플레이어의 앞뒤가 자연스럽게 겹친다.
export const villageObjects = [...VILLAGE_BUILDINGS.map(n=>({...n,building:1})),...VILLAGE_PROPS];
export const villageTrees = [
  ...Array.from({length:24},(_,i)=>({x:70+i*90,y:210+(i%3)*30,s:1.1+(i%3)*.1,pine:i%2,seed:600+i})),
  ...Array.from({length:20},(_,i)=>({x:i%2?2130:80,y:400+Math.floor(i/2)*120,s:1.2,pine:i%3===0,seed:800+i})),
];
export function drawVillageObject(ctx,n) {
  if(!drawVillageImage(ctx,n.art,n.x,n.y,n.size)) {
    ctx.save();ctx.fillStyle=n.building?'#ede0bd':'#bca47b';ctx.strokeStyle='#6e533a';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(n.x-n.size*.3,n.y-n.size*.45,n.size*.6,n.size*.45,8);ctx.fill();ctx.stroke();
    if(n.building){ctx.fillStyle='#657d68';ctx.beginPath();ctx.moveTo(n.x-n.size*.36,n.y-n.size*.45);ctx.lineTo(n.x,n.y-n.size*.74);ctx.lineTo(n.x+n.size*.36,n.y-n.size*.45);ctx.closePath();ctx.fill();ctx.fillStyle='#775c41';ctx.fillRect(n.x-14,n.y-48,28,48);}
    ctx.restore();
  }
  if(n.building)label(ctx,n.name,n.x,n.y+20);
}
export function drawVillageNpc(ctx,n,time) {
  if(n.sight){drawVillageObject(ctx,n);label(ctx,n.name,n.x,n.y+18,'#e6d6a1');return;}
  const y=n.y+Math.sin(time*2+n.x)*1.2;
  ctx.save();ctx.fillStyle='rgba(25,32,20,.2)';ctx.beginPath();ctx.ellipse(n.x,n.y+1,18,5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  if(!drawVillageImage(ctx,n.art,n.x,y,V.art.npcSize)){
    ctx.fillStyle='#af9a76';ctx.fillRect(n.x-12,y-40,24,40);ctx.fillStyle='#edceac';ctx.beginPath();ctx.arc(n.x,y-49,12,0,Math.PI*2);ctx.fill();
  }
  label(ctx,n.name,n.x,n.y+17);
  ctx.save();ctx.fillStyle='#f0dfb1';ctx.font="13px 'Do Hyeon', sans-serif";ctx.textAlign='center';ctx.fillText('···',n.x,n.y-86);ctx.restore();
}
