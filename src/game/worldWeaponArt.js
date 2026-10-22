/* 월드보스 무기 연출. 외곽선과 단순 도형을 사용해 여러 명이 써도 부담을 줄인다. */
export function drawWorldWeaponFx(ctx,f,p,time,squash){
  if(!f.kind.startsWith('sk_wb_'))return false;
  ctx.save();ctx.globalAlpha*=Math.min(1,(1-p)*3);ctx.lineJoin='round';
  const col=f.color||'#a6e7ff',r=f.r||80;
  if(f.kind==='sk_wb_beast'){
    const x=f.x0+(f.x1-f.x0)*p,y=f.y0+(f.y1-f.y0)*p;
    ctx.translate(x,y);ctx.rotate(Math.atan2(f.y1-f.y0,f.x1-f.x0));
    ctx.fillStyle=col;ctx.strokeStyle='#352418';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(36,0);ctx.lineTo(16,-12);ctx.lineTo(8,-9);ctx.lineTo(-2,-18);ctx.lineTo(-24,-8);ctx.lineTo(-50,Math.sin(time*15)*10);ctx.lineTo(-25,8);ctx.lineTo(6,12);ctx.lineTo(16,7);ctx.closePath();ctx.fill();ctx.stroke();
    if(f.dragon){for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(0,sign*5);ctx.lineTo(-15,sign*44);ctx.lineTo(-22,sign*24);ctx.lineTo(-42,sign*34);ctx.lineTo(-27,sign*5);ctx.closePath();ctx.fill();ctx.stroke();}}
    ctx.fillStyle='#fff8cb';ctx.fillRect(18,-5,5,3);
  }else if(f.kind==='sk_wb_cross'){
    ctx.translate(f.x,f.y);ctx.strokeStyle=col;ctx.lineWidth=10*(1-p)+2;
    for(const a of [-.6,.6]){ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(-r*.7,0);ctx.lineTo(r*.7,0);ctx.stroke();ctx.restore();}
  }else if(f.kind==='sk_wb_meteor'){
    ctx.translate(f.x,f.y);ctx.fillStyle='#e9793e';ctx.strokeStyle='#ffdb94';ctx.lineWidth=4;
    const fall = -220*(1-p);
    ctx.beginPath();ctx.moveTo(15,fall-65);ctx.lineTo(-15,fall);ctx.lineTo(22,fall+14);ctx.lineTo(40,fall-60);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffdf9a';ctx.fillRect(-8,fall-12,25,20);
  }else if(f.kind==='sk_wb_pool'){
    ctx.translate(f.x,f.y);ctx.fillStyle='#375a3688';ctx.strokeStyle='#b4d87c';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,r,r*squash,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // 독 웅덩이 중앙에서 솟아오르는 뱀
    ctx.strokeStyle='#91ba65';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-15,0);ctx.bezierCurveTo(40,-20,-35,-55,12,-70-10*Math.sin(p*Math.PI));ctx.stroke();
    ctx.fillStyle='#c9e698';ctx.fillRect(2,-80-10*Math.sin(p*Math.PI),28,14);ctx.fillStyle='#a36aca';ctx.fillRect(19,-78-10*Math.sin(p*Math.PI),5,4);
  }else if(f.kind==='sk_wb_grid'){
    ctx.translate(f.x,f.y);ctx.scale(1,squash);ctx.strokeStyle='#92d9ec';ctx.lineWidth=3;
    const pts=[[-r*.7,-r*.7],[r*.7,-r*.7],[r*.7,r*.7],[-r*.7,r*.7]];
    ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
    for(const [x,y]of pts){ctx.fillStyle='#a38a54';ctx.fillRect(x-7,y-20,14,30);ctx.fillStyle='#c0f5ff';ctx.fillRect(x-4,y-25,8,10);ctx.beginPath();ctx.moveTo(x,y-20);ctx.lineTo(0,Math.sin(time*18)*10);ctx.stroke();}
  }else if(f.kind==='sk_wb_lightning'){
    ctx.translate(f.x,f.y);ctx.strokeStyle='#c6f6ff';ctx.lineWidth=8*(1-p)+2;
    ctx.beginPath();ctx.moveTo(20,-190);ctx.lineTo(-12,-110);ctx.lineTo(12,-110);ctx.lineTo(-7,-45);ctx.lineTo(8,-45);ctx.lineTo(0,0);ctx.stroke();
    ctx.strokeStyle='#73cbef';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,r*(.2+.8*p),r*(.2+.8*p)*squash,0,0,Math.PI*2);ctx.stroke();
  }else if(f.kind==='sk_wb_warn'){
    ctx.translate(f.x,f.y);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.setLineDash([8,6]);
    ctx.beginPath();ctx.ellipse(0,0,r,r*squash,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();return true;
}
