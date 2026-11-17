# RQ-0 전용 도트 원화. 96×128, 세 단계 발광과 쓰러진 몸. 외부 그림 없이 재생성한다.
from PIL import Image, ImageDraw
from pathlib import Path
out=Path('public/assets/game/rpg/requiem');out.mkdir(parents=True,exist_ok=True)
frames=[]
for phase in range(4):
 im=Image.new('RGBA',(96,128));d=ImageDraw.Draw(im)
 edge='#100f17'; dark='#22212c'; mid='#3b3b46'; lit='#61616a'; red=['#b73545','#d54851','#ff6970','#36232e'][phase]
 def poly(p,c):d.polygon(p,fill=c);d.line(p+[p[0]],fill=edge,width=2)
 # 뒤쪽 유압관·등뼈
 for x in [33,59]:
  d.line([(x,35),(x-4,52),(x+2,85)],fill='#11111b',width=7);d.line([(x,35),(x-4,52),(x+2,85)],fill=lit,width=2)
 # 다리 분절과 발
 for flip in [False,True]:
  def pts(p):return [(95-x if flip else x,y) for x,y in p]
  def plate(p,c):poly(pts(p),c)
  plate([(30,76),(44,78),(44,96),(38,101),(26,95)],dark)
  plate([(29,91),(42,93),(43,115),(34,121),(22,116)],mid)
  plate([(23,114),(41,114),(44,123),(17,123),(17,119)],dark)
  plate([(22,114),(27,97),(31,96),(28,115)],lit)
  for y in [100,104,108]:d.line(pts([(33,y),(41,y+1)]),fill=edge,width=2)
  d.line(pts([(35,82),(33,92),(29,99),(28,112)]),fill=red,width=2)
 # 갑옷 가슴·허리
 poly([(28,35),(46,30),(65,36),(69,52),(59,76),(37,78),(25,56)],mid)
 poly([(32,39),(46,35),(61,40),(59,56),(48,67),(35,57)],dark)
 for y in [67,73,79]:poly([(35,y),(58,y),(60,y+5),(47,y+8),(33,y+4)],dark)
 # 거대한 어깨·팔·세 갈래 기계 손톱
 for flip in [False,True]:
  def pts(p):return [(95-x if flip else x,y) for x,y in p]
  poly(pts([(24,30),(34,37),(29,55),(12,57),(7,45),(13,32)]),mid)
  poly(pts([(12,31),(24,28),(30,33),(24,38),(8,44)]),lit)
  poly(pts([(12,55),(25,53),(26,70),(19,77),(9,72)]),dark)
  poly(pts([(8,70),(24,69),(29,88),(18,98),(3,91)]),mid)
  d.line(pts([(18,41),(15,49),(19,60),(15,74),(19,84)]),fill=red,width=2)
  for x,y in [(5,88),(12,94),(21,92)]:
   poly(pts([(x,y),(x+5,y),(x+7,y+10),(x+4,y+20),(x,y+11)]),lit)
   d.line(pts([(x+2,y+3),(x+4,y+11),(x+3,y+16)]),fill=red)
  for x,y in [(15,39),(24,41),(16,79)]:d.rectangle([*pts([(x,y)])[0],*pts([(x+1,y+1)])[0]] if not flip else [(95-x-1,y),(95-x,y+1)],fill='#9a8c87')
 # 얼굴은 단일 붉은 눈과 분할 마스크
 poly([(36,17),(47,12),(58,18),(60,32),(52,40),(40,36),(33,28)],dark)
 poly([(35,19),(46,15),(57,19),(55,23),(36,23)],lit)
 d.rectangle((39,24,54,28),fill=edge);d.rectangle((43,25,51,27),fill=red)
 d.point((47,26),fill='#ffe3c4' if phase<3 else red)
 for x in [41,46,51]:d.line([(x,31),(x+1,35)],fill=lit)
 # 흉부 동력핵, 방사형 장갑과 혈관 회로
 poly([(47,43),(55,48),(55,56),(47,62),(39,56),(39,48)],edge)
 poly([(47,46),(52,50),(52,55),(47,59),(42,55),(42,50)],red)
 if phase<3:d.rectangle((46,49,48,55),fill='#ffd6bd')
 for p in [[(41,51),(33,48),(28,40)],[(53,51),(62,47),(65,39)],[(47,60),(48,70),(42,75)]]:d.line(p,fill=red,width=2)
 if phase==3:im=im.rotate(76,resample=Image.Resampling.NEAREST,expand=False)
 frames.append(im)
sheet=Image.new('RGBA',(384,128))
for i,im in enumerate(frames):sheet.paste(im,(i*96,0))
sheet.save(out/'rq0.webp',lossless=True)
# 시설 문·핵·사슬·유리관: 별도의 도트 자산
for name in ['door','core','chain','tube']:
 im=Image.new('RGBA',(96,128));d=ImageDraw.Draw(im)
 if name=='door':
  d.polygon([(14,12),(80,12),(89,24),(89,126),(7,126),(7,24)],fill='#19191f',outline='#66574d')
  for x in [17,49]:
   d.rectangle((x,25,x+29,122),fill='#37323a',outline='#797069')
   for y in range(30,119,15):d.line((x+4,y,x+25,y),fill='#4e454c')
  d.rectangle((44,65,52,77),fill='#b68b57');d.rectangle((9,46,13,54),fill='#c83743')
 elif name=='core':
  d.polygon([(48,35),(66,54),(62,79),(48,91),(32,78),(30,53)],fill='#511326',outline='#ed8a87')
  d.polygon([(48,39),(56,59),(48,86),(39,62)],fill='#dc4656');d.line((48,44,48,75),fill='#ffd0aa',width=2)
 elif name=='chain':
  for y in range(14,108,10):d.rounded_rectangle((40 if y%20 else 44,y,55 if y%20 else 51,y+15),radius=3,fill='#211e29',outline='#b98882',width=2)
  d.rectangle((33,64,63,85),fill='#3b2630',outline='#b88c5b');d.rectangle((45,68,51,80),fill='#e74d5a')
 else:
  d.ellipse((20,10,76,30),fill='#40363a',outline='#9e8c77',width=2)
  d.rectangle((20,20,76,112),fill='#44333b80',outline='#c6a096')
  d.line((26,25,26,104),fill='#b8c6c5',width=2);d.line((70,29,70,105),fill='#7b989a')
  d.ellipse((15,100,81,125),fill='#302a30',outline='#8c7766',width=3)
  for x in [29,47,65]:d.rectangle((x,111,x+3,116),fill='#ce4755')
 im.save(out/(name+'.webp'),lossless=True)
