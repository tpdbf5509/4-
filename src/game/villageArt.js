import {STORY_VILLAGE} from './storyData.js';
import {VILLAGE as V, VILLAGE_BUILDINGS, VILLAGE_NPCS, VILLAGE_SIGHTS, VILLAGE_PROPS, VILLAGE_ROADS, VILLAGE_SQUARE as SQ, VILLAGE_FIELDS, VILLAGE_BROOK, villageArtPath} from './villageData.js';

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
  ctx.fillStyle='#86a05f';ctx.fillRect(0,0,V.w,V.h);   // 숲 녹색보다 밝고 따뜻한 들판 색
  let seed=1707;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5200;i++){
    ctx.fillStyle=i%3?'rgba(235,232,170,.09)':'rgba(60,92,48,.05)';
    ctx.beginPath();ctx.ellipse(rnd()*V.w,rnd()*V.h,8+rnd()*28,3+rnd()*10,0,0,Math.PI*2);ctx.fill();
  }
  ctx.lineCap='round';ctx.lineJoin='round';
  // 테두리를 먼저 모두 깔고 속을 덮어 갈림길 이음매가 보이지 않게 한다.
  const square=(grow)=>{ctx.beginPath();ctx.ellipse(SQ.x,SQ.y,SQ.rx+grow,SQ.ry+grow,0,0,Math.PI*2);};
  ctx.strokeStyle='#867c60';VILLAGE_ROADS.forEach(r=>{ctx.lineWidth=r.w+12;curve(ctx,r.pts);ctx.stroke();});
  ctx.fillStyle='#867c60';square(6);ctx.fill();
  ctx.strokeStyle='#c2b493';VILLAGE_ROADS.forEach(r=>{ctx.lineWidth=r.w;curve(ctx,r.pts);ctx.stroke();});
  ctx.fillStyle='#c2b493';square(0);ctx.fill();
  // 개울 — 길 위로 흐르고 다리가 덮는다
  ctx.strokeStyle='#5f7f78';ctx.lineWidth=40;curve(ctx,VILLAGE_BROOK);ctx.stroke();
  ctx.strokeStyle='#8fb3b0';ctx.lineWidth=28;curve(ctx,VILLAGE_BROOK);ctx.stroke();
  ctx.strokeStyle='rgba(235,245,235,.35)';ctx.lineWidth=3;ctx.setLineDash([14,22]);curve(ctx,VILLAGE_BROOK);ctx.stroke();ctx.setLineDash([]);
  // 광장 포석 고리와 큰길 포석
  ctx.strokeStyle='rgba(109,95,69,.38)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(SQ.x,SQ.y,SQ.rx-14,SQ.ry-12,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(SQ.x,SQ.y+4,SQ.rx*.45,SQ.ry*.45,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(245,232,196,.26)';
  for(let y=650;y<1640;y+=37){
    if(Math.abs(y-SQ.y)<SQ.ry+10)continue;
    for(let x=1062;x<=1130;x+=34){ctx.beginPath();ctx.roundRect(x+(Math.round(y/37)%2)*10,y,24,13,3);ctx.fill();}
  }
  // 들꽃 점
  for(let i=0;i<260;i++){const x=rnd()*V.w,y=V.top+60+rnd()*(V.h-V.top-160);
    if(nearRoad(x,y,40))continue;ctx.fillStyle=['#f1e4a8','#e9c6c0','#d8cbe6','#fffaf0'][i%4];ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();}
  // 밭 — 밭고랑 줄. 약초밭 · 풍차 텃밭 · 마을 바깥 들판
  for(const [x,y] of VILLAGE_FIELDS){
    ctx.fillStyle='#6f5a3f';ctx.beginPath();ctx.roundRect(x-84,y-44,168,101,10);ctx.fill();
    ctx.fillStyle='#8a7350';ctx.beginPath();ctx.roundRect(x-80,y-40,160,93,8);ctx.fill();
    for(let j=0;j<4;j++){
      const crop=(x*7+y*3)%3;ctx.fillStyle=crop===0?'#9bb45e':crop===1?'#d2c374':'#7fa05a';
      for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(x-60+i*20,y-24+j*24,7,5,-.3,0,Math.PI*2);ctx.fill();}
    }
  }
  // 마을 둘레 울타리 — 윗변 · 좌우 · 아랫변. 남쪽 귀환 문 자리는 비운다.
  const post=(x,y)=>{ctx.fillStyle='#8f7a55';ctx.fillRect(x-4,y-34,8,36);ctx.fillStyle='#c8b184';ctx.fillRect(x-4,y-34,3,36);};
  const rail=(x1,y1,x2,y2)=>{ctx.strokeStyle='#a68f66';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x1,y1-24);ctx.lineTo(x2,y2-24);ctx.moveTo(x1,y1-11);ctx.lineTo(x2,y2-11);ctx.stroke();};
  const fy=V.exit.y-20, top=V.top+45, L=62, R=V.w-62;
  for(let x=L;x<R;x+=64){rail(x,top,x+64,top);post(x,top);}
  post(R,top);
  for(let y=top;y<fy;y+=64){rail(L,y,L,y+64);post(L,y);rail(R,y,R,y+64);post(R,y);}
  for(let x=L;x<R;x+=64){
    if(Math.abs(x-V.exit.x)<130)continue;
    rail(x,fy,x+64,fy);post(x,fy);
  }
}

// y 정렬에 참여시켜 건물·주민·플레이어의 앞뒤가 자연스럽게 겹친다.
export const villageObjects = [...VILLAGE_BUILDINGS.map(n=>({...n,building:1})),...VILLAGE_PROPS.filter(n=>!n.ground)];
// 다리처럼 사람이 위로 지나가는 소품은 앞뒤 정렬 없이 땅에 먼저 깐다.
const villageGround = VILLAGE_PROPS.filter(n=>n.ground);
export function drawVillageGround(ctx){ villageGround.forEach(n=>drawVillageObject(ctx,n)); }
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
  if (x < 130 || x > V.w - 130 || y < V.top + 120) return false;   // 울타리 안쪽 가장자리
  if (((x-SQ.x)/(SQ.rx+110))**2 + ((y-SQ.y)/(SQ.ry+110))**2 < 1) return false;
  if ([...VILLAGE_BUILDINGS, ...STORY_VILLAGE.buildings].some(b => Math.abs(x-b.x) < b.size*.58 && y > b.y - b.size*.75 && y < b.y + 70)) return false;
  if (VILLAGE_FIELDS.some(([fx,fy]) => Math.abs(x-fx) < 140 && Math.abs(y-fy) < 100)) return false;
  if ([...VILLAGE_NPCS, ...VILLAGE_SIGHTS, ...VILLAGE_PROPS, ...STORY_VILLAGE.npcs].some(n => Math.hypot(x-n.x, y-n.y) < 110)) return false;
  if (Math.abs(x-V.exit.x) < 200 && y > V.exit.y - 160) return false;
  return y < V.exit.y - 60;
}
export const villageTrees = (() => {
  let seed = 4242; const rnd = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
  const out = [];
  for (let y = 215; y < V.h - 100; y += 92) for (let x = 60; x < V.w - 40; x += 104) {
    const tx = x + (rnd()-.5)*60 + (Math.round(y/92)%2)*52, ty = y + (rnd()-.5)*40, keep = rnd();
    if (!treeSpot(tx, ty)) continue;
    const edge = tx < 260 || tx > V.w - 260 || ty < 420;          // 마을답게 — 둘레도 듬성듬성, 안쪽은 거의 없다
    if (keep > (edge ? .24 : .05)) continue;
    out.push({x: tx, y: ty, s: 1.05 + rnd()*.3, pine: rnd() < .15 ? 1 : 0, seed: 600 + out.length});
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
