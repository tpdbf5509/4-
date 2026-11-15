import numpy as np, sys
from PIL import Image
L=int(sys.argv[1]) if len(sys.argv)>1 else 68
im=np.array(Image.open('/root/.claude/uploads/3fe72766-48e5-5b88-9b9f-e27cfc2cef0e/f5cc7746-blood-sword-reference.jpg').convert('RGB')).astype(float)
mn=im.min(2); a=np.clip((250-mn)/30,0,1)            # 흰 바탕 → 투명
ys,xs=np.nonzero(a>0.5)
# 축 — PCA
P=np.stack([xs,ys],1).astype(float); c=P.mean(0); u,s,vt=np.linalg.svd(P-c,full_matrices=False); d=vt[0]
proj=(P-c)@d
# 칼끝은 아래 왼쪽(y 큰 쪽)이 +x 가 되게
if d[1]<0: d=-d; proj=-proj
ang=np.degrees(np.arctan2(d[1],d[0]))
rgba=np.dstack([im,a*255]).astype(np.uint8)
img=Image.fromarray(rgba,'RGBA')
# 미리 곱한 알파로 돌려 테두리 흰 번짐을 막는다
pm=np.array(img).astype(float); pm[...,:3]*=pm[...,3:4]/255
big=Image.fromarray(pm.astype(np.uint8),'RGBA').rotate(ang,resample=Image.BICUBIC,expand=True)
bb=big.getbbox(); big=big.crop(bb)
k=L/big.width; small=big.resize((L,max(1,round(big.height*k))),Image.LANCZOS)
s=np.array(small).astype(float); al=s[...,3:4]; s[...,:3]=np.where(al>0,s[...,:3]*255/np.maximum(al,1),0)
np.save('small.npy',s); Image.fromarray(s.clip(0,255).astype(np.uint8),'RGBA').resize((L*8,small.height*8),Image.NEAREST).save('small.png')
print(ang, small.size)
