# 낙뢰 · 독 시트 손질 — 장면을 어둡게 하는 반투명 그늘 · 검은 땅 자국을 지우고, 땅에 남는 주황 불티를 보스 빛깔 쪽으로 돌린다
# 쓰는 법: python3 post.py 원본.png 결과.webp '#보스빛깔'
import sys
from PIL import Image
src,dst,tone=sys.argv[1],sys.argv[2],sys.argv[3]
T=tuple(int(tone[i:i+2],16) for i in (1,3,5))
im=Image.open(src).convert('RGBA'); px=im.load()
for y in range(im.height):
  for x in range(im.width):
    r,g,b,a=px[x,y]
    if a==0: continue
    l=(r*3+g*6+b)/10
    if (a<200 and l<70) or l<40: px[x,y]=(0,0,0,0); continue
    if r>b+30 and r>g+10:
      px[x,y]=(int((r+T[0]*2)/3),int((g+T[1]*2)/3),int((b+T[2]*2)/3),a)
im.save(dst,lossless=True,method=6)
