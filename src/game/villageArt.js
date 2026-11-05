import {VILLAGE as V, VILLAGE_BUILDINGS, VILLAGE_NPCS, VILLAGE_SIGHTS, VILLAGE_PROPS, VILLAGE_ROADS, VILLAGE_SQUARE as SQ, VILLAGE_FIELDS, villageArtPath} from './villageData.js';

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

// 바닥은 한 번 그려 캐시한다. 길·광장·밭은 villageData 의 좌표를 따른다.
// 꺾인 점 사이를 중간점 곡선으로 이어 길이 부드럽게 휘게 한다.
function curve(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(...pts[pts.length - 1]);
}
export function paintVillage(ctx) {
  ctx.fillStyle='#637d48';ctx.fillRect(0,0,V.w,V.h);
  let seed=1707;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5200;i++){
    ctx.fillStyle=i%3?'rgba(222,225,165,.07)':'rgba(29,62,31,.06)';
    ctx.beginPath();ctx.ellipse(rnd()*V.w,rnd()*V.h,8+rnd()*28,3+rnd()*10,0,0,Math.PI*2);ctx.fill();
  }
  ctx.lineCap='round';ctx.lineJoin='round';
  // 테두리를 먼저 모두 깔고 속을 덮어 갈림길 이음매가 보이지 않게 한다.
  const square=(grow)=>{ctx.beginPath();ctx.ellipse(SQ.x,SQ.y,SQ.rx+grow,SQ.ry+grow,0,0,Math.PI*2);};
  ctx.strokeStyle='#867c60';VILLAGE_ROADS.forEach(r=>{ctx.lineWidth=r.w+12;curve(ctx,r.pts);ctx.stroke();});
  ctx.fillStyle='#867c60';square(6);ctx.fill();
  ctx.strokeStyle='#c2b493';VILLAGE_ROADS.forEach(r=>{ctx.lineWidth=r.w;curve(ctx,r.pts);ctx.stroke();});
  ctx.fillStyle='#c2b493';square(0);ctx.fill();
  // 광장 포석 고리와 큰길 포석
  ctx.strokeStyle='rgba(109,95,69,.38)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(SQ.x,SQ.y,SQ.rx-14,SQ.ry-12,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(SQ.x,SQ.y+4,SQ.rx*.45,SQ.ry*.45,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(245,232,196,.26)';
  for(let y=650;y<1640;y+=37){
    if(Math.abs(y-SQ.y)<SQ.ry+10)continue;
    for(let x=1062;x<=1130;x+=34){ctx.beginPath();ctx.roundRect(x+(Math.round(y/37)%2)*10,y,24,13,3);ctx.fill();}
  }
  // 약초밭과 풍차 텃밭. 둘레길 옆에서 살펴볼 수 있는 생활 풍경이다.
  for(const [x,y] of VILLAGE_FIELDS){
    ctx.fillStyle='#7b6649';ctx.beginPath();ctx.roundRect(x-80,y-40,160,95,10);ctx.fill();
    for(let i=0;i<5;i++)for(let j=0;j<4;j++){
      ctx.fillStyle=(i+j)%2?'#91a95c':'#c1b969';ctx.beginPath();ctx.ellipse(x-60+i*30,y-24+j*24,9,5,-.3,0,Math.PI*2);ctx.fill();
    }
  }
  // 낮은 울타리. 남쪽 귀환 문 자리는 비운다.
  ctx.strokeStyle='#ad9670';ctx.lineWidth=5;
  for(let x=100;x<V.w-80;x+=60){
    if(Math.abs(x-V.exit.x)<130)continue;
    const fy=V.exit.y-20;   // 귀환 문 기둥 높이에 맞춘다
    ctx.beginPath();ctx.moveTo(x,fy);ctx.lineTo(x,fy-33);ctx.moveTo(x,fy-20);ctx.lineTo(x+60,fy-20);ctx.stroke();
  }
}

// y 정렬에 참여시켜 건물·주민·플레이어의 앞뒤가 자연스럽게 겹친다.
export const villageObjects = [...VILLAGE_BUILDINGS.map(n=>({...n,building:1})),...VILLAGE_PROPS];
// 숲 마을답게 둘레를 나무로 감싼다. 길·광장·건물·밭·사람 자리는 비운다(그리드 + 흔들림, 정해진 씨앗).
function nearRoad(x, y, pad) {
  return VILLAGE_ROADS.some(r => r.pts.some((p, i) => {
    const q = r.pts[i + 1]; if (!q) return false;
    const dx = q[0]-p[0], dy = q[1]-p[1], t = Math.max(0, Math.min(1, ((x-p[0])*dx + (y-p[1])*dy) / (dx*dx + dy*dy)));
    return Math.hypot(x - p[0] - dx*t, y - p[1] - dy*t) < r.w/2 + pad;
  }));
}
function treeSpot(x, y) {
  if (nearRoad(x, y, 70)) return false;
  if (((x-SQ.x)/(SQ.rx+110))**2 + ((y-SQ.y)/(SQ.ry+110))**2 < 1) return false;
  if (VILLAGE_BUILDINGS.some(b => Math.abs(x-b.x) < b.size*.58 && y > b.y - b.size*.75 && y < b.y + 70)) return false;
  if (VILLAGE_FIELDS.some(([fx,fy]) => Math.abs(x-fx) < 140 && Math.abs(y-fy) < 100)) return false;
  if ([...VILLAGE_NPCS, ...VILLAGE_SIGHTS, ...VILLAGE_PROPS].some(n => Math.hypot(x-n.x, y-n.y) < 110)) return false;
  if (Math.abs(x-V.exit.x) < 200 && y > V.exit.y - 160) return false;
  return y < V.exit.y - 60;
}
export const villageTrees = (() => {
  let seed = 4242; const rnd = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
  const out = [];
  for (let y = 215; y < V.h - 100; y += 92) for (let x = 60; x < V.w - 40; x += 104) {
    const tx = x + (rnd()-.5)*60 + (Math.round(y/92)%2)*52, ty = y + (rnd()-.5)*40, keep = rnd();
    if (!treeSpot(tx, ty)) continue;
    const edge = tx < 260 || tx > V.w - 260 || ty < 420;          // 둘레는 빽빽하게, 안쪽은 듬성듬성
    if (!edge && keep > .45) continue;
    out.push({x: tx, y: ty, s: 1.05 + rnd()*.3, pine: rnd() < .4 ? 1 : 0, seed: 600 + out.length});
  }
  return out;
})();
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
