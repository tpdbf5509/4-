"""생성 원화에서 영상 무기 셋을 자른다. 실행: python3 tools/cut-storm-weapons.py

원본의 투명도를 유지한다. 쌍검은 같은 칼을 양손에 나눠 들고 가방에서는 교차한다.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
source = Image.open(ROOT / 'design/weapons/storm-generated.png').convert('RGBA')
dest = ROOT / 'public/assets/game/rpg/weapons'
names = ['storm_staff', 'violet_bow', 'azure_dual']
sprites = []
for index, name in enumerate(names):
    cell = source.crop((index * source.width // 3, 0, (index + 1) * source.width // 3, source.height))
    bounds = cell.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    item = cell.crop(bounds)
    item.thumbnail((112, 112), Image.Resampling.LANCZOS)
    sprite = Image.new('RGBA', (128, 128))
    sprite.alpha_composite(item, ((128 - item.width) // 2, (128 - item.height) // 2))
    sprites.append(sprite)
    if name != 'azure_dual':
        sprite.save(dest / f'{name}.webp', quality=95, method=6)

held = Image.new('RGBA', (256, 128))
held.alpha_composite(sprites[2], (0, 0))
held.alpha_composite(sprites[2], (128, 0))
held.save(dest / 'azure-dual-held.webp', quality=95, method=6)
icon = Image.new('RGBA', (128, 128))
blade = sprites[2].resize((108, 108), Image.Resampling.LANCZOS)
for angle in [-26, 26]:
    rotated = blade.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    icon.alpha_composite(rotated, ((128 - rotated.width) // 2, (128 - rotated.height) // 2))
icon.save(dest / 'azure_dual.webp', quality=95, method=6)
