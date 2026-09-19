import numpy as np

def rgb_to_hsv(arr):
    r,g,b = arr[...,0],arr[...,1],arr[...,2]
    mx=arr.max(axis=2); mn=arr.min(axis=2); d=mx-mn
    dd=np.where(d==0,1,d)
    h=np.where(mx==r, ((g-b)/dd)%6, np.where(mx==g,(b-r)/dd+2,(r-g)/dd+4))*60
    h=np.where(d==0,0,h)
    s=np.where(mx>0, d/np.maximum(mx,1e-9),0)
    return h,s,mx

def hsv_to_rgb(h,s,v):
    h=h%360; c=v*s; x=c*(1-np.abs((h/60)%2-1)); mm=v-c
    z=np.zeros_like(h)
    i=(h//60).astype(int)
    r=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[c,x,z,z,x,c])
    g=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[x,c,c,x,z,z])
    b=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[z,z,x,c,c,x])
    return np.stack([r+mm,g+mm,b+mm],axis=-1)

def recolor(rgb01, src_hue, dst_hue, s_lo, s_hi, s_scale=1.0):
    """주황 계열만 목표 색상으로 돌린다. 채도가 낮은 살갗·흰색은 거의 그대로 둔다."""
    h,s,v = rgb_to_hsv(rgb01)
    shift = (dst_hue - src_hue) % 360
    near = np.minimum(np.abs(h-src_hue), 360-np.abs(h-src_hue))   # 주황에서 얼마나 떨어졌나
    hue_w = np.clip(1 - (near-35)/35, 0, 1)                       # 색상각 35도 안은 온전히, 70도 밖은 제외
    sat_w = np.clip((s - s_lo)/(s_hi - s_lo), 0, 1)               # 채도가 낮으면 덜 바꾼다
    wgt = hue_w * sat_w
    h2 = (h + shift*wgt) % 360
    s2 = np.clip(s * (1 + (s_scale-1)*wgt), 0, 1)
    return np.clip(hsv_to_rgb(h2, s2, v), 0, 1), wgt
