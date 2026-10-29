"""뇌조 생성 원화를 기본·공격 준비 512px 두 칸의 투명 WebP로 자른다."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'design/bosses/thunderbird.png').convert('RGBA')
# 생성 원화의 날개를 따라 칸을 나눈다. 균등하게 자르면 기본 자세의 오른쪽 날개가 잘린다.
split = round(source.width * .558)
sheet = Image.new('RGBA', (1024, 512))
for index, bounds in enumerate([(0, 0, split, source.height), (split, 0, source.width, source.height)]):
    cell = source.crop(bounds)
    cell.thumbnail((456, 456), Image.Resampling.LANCZOS)
    sheet.alpha_composite(cell, (index * 512 + (512 - cell.width) // 2, (512 - cell.height) // 2))
sheet.save(root / 'public/assets/game/rpg/boss/thunderbird.webp', quality=94, method=6)
