/* 강화 마법진은 발밑의 실제 범위를 그대로 보여 준다. 겹쳐도 효과는 한 번이다. */
export function drawPowerCircles(ctx,g,map){
  for(const c of g.powerCircles||[]){if(c.map!==map||c.t<=0)continue;
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,.78);ctx.globalAlpha=Math.min(1,c.t)*.75;
    ctx.fillStyle='rgba(147,173,215,.12)';ctx.strokeStyle='#b6cee9';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,c.r*.83,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4+g.t*.12,x=Math.cos(a)*c.r*.91,y=Math.sin(a)*c.r*.91;
      ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x,y-7);ctx.lineTo(x+4,y);ctx.lineTo(x,y+7);ctx.closePath();ctx.stroke();}
    ctx.restore();
  }
}
