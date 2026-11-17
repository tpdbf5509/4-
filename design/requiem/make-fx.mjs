// 외부 pixelfx는 검토한 scratchpad 경로로 전달한다. 기존 연출의 색상 교체가 아닌 전용 형상이다.
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const root=process.argv[2];
const {createFrame,painterFor,hex}=await import(pathToFileURL(`${root}/src/core/index.js`));
const {canvas,save}=await import(pathToFileURL(`${root}/tools/lib/fxlib.mjs`));
const C=['#401420','#85283c','#d44959','#f2a09a','#ffe0bd'].map(hex), W=200,H=90,N=8;
for(const name of ['converge','fracture','veins','shock']){
 const sheet=canvas(W*N,H,[0,0,0,0]);
 for(let i=0;i<N;i++){
  const u=i/(N-1),f=createFrame(W,H),p=painterFor(f).place(W/2,H/2,false,0);
  if(name==='converge')for(let k=0;k<32;k++){
   const a=k*2.399+u*1.8,r=(1-u)*(25+k*1.7),x=Math.cos(a)*r,y=Math.sin(a)*r*.45;
   p.line(x,y,x-Math.cos(a)*5,y-Math.sin(a)*2,C[k%4]);p.rect(x,y,2,2,C[3]);
  }
  if(name==='fracture')for(let k=0;k<24;k++){
   const a=k*2.399,r=8+u*(20+k*3),x=Math.cos(a)*r,y=Math.sin(a)*r*.4+u*u*14;
   p.line(x,y,x+5*Math.cos(a+.7),y+8*Math.sin(a+.7),C[k%4]);p.line(x,y,x-3,y+5,C[4]);
  }
  if(name==='veins')for(let k=0;k<12;k++){
   const a=k*Math.PI/6;
   for(let j=0;j<9;j++){
    const r=(9-j)*9*(1-u*.65),aa=a+Math.sin(j*1.7)*.07;
    p.line(Math.cos(aa)*r,Math.sin(aa)*r*.4,Math.cos(a)*(r-8),Math.sin(a)*(r-8)*.4,C[(j+i)%5]);
   }
  }
  if(name==='shock')for(let k=0;k<64;k++){
   const a=k*Math.PI/32,r=12+u*80,w=4*(1-u)+1,x=Math.cos(a)*r,y=Math.sin(a)*r*.4;
   p.line(x,y,Math.cos(a+.065)*r,Math.sin(a+.065)*r*.4,C[k%3+1]);p.rect(x,y-w,w,w,C[k%4]);
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const c=f.color[y*W+x]>>>0,j=(y*W*N+i*W+x)*4;
   sheet.data[j]=c&255;sheet.data[j+1]=(c>>>8)&255;sheet.data[j+2]=(c>>>16)&255;sheet.data[j+3]=c>>>24;
  }
 }
 save(`/tmp/rq-${name}.png`,sheet.png());
}
writeFileSync('design/requiem/fx-manifest.json',JSON.stringify({width:W,height:H,frames:N,libraryCommit:'5294518'},null,2)+'\n');
