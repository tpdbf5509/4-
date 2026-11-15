import numpy as np, json, sys
from PIL import Image
s=np.load('small.npy'); H,W=s.shape[:2]
PAL=["#14040a","#3a0a14","#650b17","#a8152a","#d82a3e","#ff4f60","#ff9ca4","#ffe6e8",   # 0~7 혈 팔레트(6 · 7 밝은 외곽)
     "#1d0a10","#544a4f","#8a7f85","#c2b8bd",                                            # 8~11 금속 회색
     "#ffd36a","#e0a23a","#8a6a20"]                                                       # 12~14 노란 빛
P=np.array([[int(h[i:i+2],16) for i in (1,3,5)] for h in PAL],float)
out=np.full((H,W),-1,int)
for y in range(H):
  for x in range(W):
    if s[y,x,3]<110: continue
    c=s[y,x,:3]
    d=((P-c)**2*[0.35,0.5,0.15]).sum(1)
    out[y,x]=int(d.argmin())
rows=["".join("." if v<0 else "0123456789abcde"[v] for v in r) for r in out]
json.dump({"pal":PAL,"rows":rows},open('spr.json','w'))
print("\n".join(rows))
img=Image.new('RGBA',(W,H),(40,46,36,255))
for y in range(H):
  for x in range(W):
    if out[y,x]>=0: img.putpixel((x,y),tuple(int(v) for v in P[out[y,x]])+(255,))
img.resize((W*10,H*10),Image.NEAREST).save('q.png')
