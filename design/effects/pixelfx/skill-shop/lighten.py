# 밝은 사냥터에서 검댕처럼 보이는 잿빛 먼지 · 연기를 흙빛으로 밝힌다(아주 어두운 테두리와 색 있는 불빛은 그대로)
import sys
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGBA'); px=im.load()
DUST=(214,200,174)
for y in range(im.height):
  for x in range(im.width):
    r,g,b,a=px[x,y]
    if a==0: continue
    l=(r*3+g*6+b)/10
    if (a<235 and l<150) or (40<=l<175 and max(r,g,b)-min(r,g,b)<48):
      k=0.75 if a>=235 else min(1,(175-l)/130)
      px[x,y]=(int(r+(DUST[0]-r)*k),int(g+(DUST[1]-g)*k),int(b+(DUST[2]-b)*k),a)
im.save(dst,lossless=True,method=6)
