# 암흑검 내려치기 — 밝은 사냥터에서 검댕처럼 보이는 어두운 먼지를 옅은 라벤더 잿빛으로 밝힌다(색 있는 빛 · 아주 어두운 테두리는 그대로)
import sys
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGBA'); px=im.load()
DUST=(196,186,214)
for y in range(im.height):
  for x in range(im.width):
    r,g,b,a=px[x,y]
    if a==0: continue
    l=(r*3+g*6+b)/10
    if (a<235 and l<150) or (40<=l<175 and max(r,g,b)-min(r,g,b)<56):
      k=0.7 if a>=235 else min(1,(175-l)/130)
      px[x,y]=(int(r+(DUST[0]-r)*k),int(g+(DUST[1]-g)*k),int(b+(DUST[2]-b)*k),int(a*0.6))   # 먼지는 옅게(진하면 얼룩처럼 보였다)
im.save(dst,lossless=True,method=6)
