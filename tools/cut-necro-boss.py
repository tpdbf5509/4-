"""히든 직업 Necromancer 004 — 보스 그림자 그림(11월 20일 사용자가 직접 만든 그림) 을 게임 그림으로 옮긴다.
   원본은 사용자 컴퓨터 「네갈래 방어선 RPG 이미지/그림자」 폴더(저장소에 넣지 않는다 — 한 장 1~2MB).
   흰 바탕 그림(불사조 · 그라모르 · 아그라스 · 모르가스 · 기계형)은 테두리에서 이어진 밝은 자리만 투명하게 바꾼다
   (흰색을 알파로 — 연기 가장자리는 반투명 검정으로 남는다. 몸 안의 밝은 빛은 테두리와 이어지지 않아 그대로).
   결과: public/assets/game/rpg/effects/hidden-jobs/necromancer/boss/<몹 종류>.webp — 그림 상자로 자르고 높이 BOX_H · 너비 BOX_W 안으로 줄인다.
   파일 이름 → 몹 종류 대응은 FILES. necroBossArt.js NC_BOSS_ART 와 같아야 한다(tools/necro.test.mjs 가 본다).
   실행: python3 tools/cut-necro-boss.py <원본 폴더>"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/assets/game/rpg/effects/hidden-jobs/necromancer/boss")
BOX_H, BOX_W = 320, 480          # 게임 그림자 판(높이 160 · 너비 236) 의 2배 — 명부 창 초상도 이 그림을 쓴다
LIGHT, FAINT, RING_SAT = 185, 20, 45   # 바탕으로 볼 밝기(세 색 모두 이 값 위) · 버릴 옅은 알파 · 갇힌 밝은 자리 둘레 채도(아래면 바탕)

FILES = {
    "광전사 바르카논(그림자).png": "barkanon",
    "질풍의 망령 세르카(그림자).png": "serka",
    "길드토벌/강화된 슬라임(그림자).png": "guild_slime",
    "길드토벌/바다세이렌(그림자).png": "guild_siren",
    "길드토벌/불사조(그림자).png": "guild_phoenix",
    "던전/강철 파괴자 그라모르(그림자).png": "gramor",
    "던전/대지의 재앙 아그라스(그림자).png": "argas",
    "던전/불멸의 군주 모르가스(그림자).png": "morgas",
    "심연의 탑/녹슨 심판관(그림자).png": "tg_corrode",
    "심연의 탑/뇌운 파수꾼(그림자).png": "tg_bolt",
    "심연의 탑/썩은 연꽃의 마녀(그림자).png": "tg_poison",
    "심연의 탑/얼어붙은 사제(그림자).png": "tg_frost",
    "심연의 탑/재의 용기사(그림자).png": "tg_fire",
    "심연의 탑/틈새의 거신.png": "tg_gravity",
    "월드보스/거대 뱀 괴수(그림자).png": "world_serpent",
    "월드보스/고대 번개 기계형 괴수(그림자).png": "world_machine",
    "월드보스/공허의 관측자 괴수(그림자).png": "world_void",
    "월드보스/뇌조 괴수(그림자).png": "world_thunderbird",
    "월드보스/드래곤 괴수 (그림자).png": "world_dragon",
}
FLIP = {"world_thunderbird"}     # 왼쪽을 보는 그림 — 게임 몹은 오른쪽을 보므로 뒤집어 둔다
ALL_LIGHT = {"guild_phoenix"}    # 날개 사이를 연보라 흰 빛이 채운 그림 — 밝은 자리를 모두 흰색 → 알파로(빛은 옅은 보라로 남는다)

def unwhite(a, every=False):
    """테두리에서 이어진 밝은 자리(흰 바탕) 를 흰색 → 알파로 바꾼다"""
    rgb = a[..., :3].astype(np.float32)
    light = (rgb.min(axis=2) > LIGHT) & (a[..., 3] > 0)
    lab, n = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    # 몸 사이에 갇힌 흰 바탕(다리 · 날개 사이) 도 바탕이다 — 둘레가 무채색이면 바탕, 둘레가 색이 짙으면(푸른 구슬 · 보라 불빛의 흰 속) 빛이라 남긴다
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if i in edge: continue
        y0, y1 = max(0, sl[0].start - 4), sl[0].stop + 4
        x0, x1 = max(0, sl[1].start - 4), sl[1].stop + 4
        part = lab[y0:y1, x0:x1] == i
        ring = ndimage.binary_dilation(part, iterations=3) & ~part & ~light[y0:y1, x0:x1]
        if ring.any() and sat[y0:y1, x0:x1][ring].mean() < RING_SAT:
            edge.add(i)
    bg = light if every else np.isin(lab, list(edge))
    bg = ndimage.binary_dilation(bg, iterations=2) & (rgb.min(axis=2) > 120)   # 가장자리 번짐도 함께
    al = (255 - rgb.min(axis=2)) / 255.0                                       # 흰색에서 먼 만큼 남긴다
    keep = np.clip(al, 1e-3, 1)[..., None]
    col = np.clip((rgb - 255 * (1 - keep)) / keep, 0, 255)
    out = a.copy()
    out[..., :3] = np.where(bg[..., None], col, rgb).astype(np.uint8)
    out[..., 3] = np.where(bg, (al * a[..., 3]).astype(np.uint8), a[..., 3])
    return out

def main(src):
    os.makedirs(OUT, exist_ok=True)
    for name, kind in FILES.items():
        im = Image.open(os.path.join(src, name)).convert("RGBA")
        a = np.asarray(im).copy()
        if (a[..., 3] > 0).all():                    # 알파가 없는 그림 = 흰 바탕
            a = unwhite(a, kind in ALL_LIGHT)
        a[..., 3] = np.where(a[..., 3] < FAINT, 0, a[..., 3])
        ys, xs = np.where(a[..., 3] > 0)
        im = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")
        if kind in FLIP:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        k = min(1, BOX_H / im.height, BOX_W / im.width)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        im.save(os.path.join(OUT, f"{kind}.webp"), "WEBP", quality=90, method=6)
        print(kind, im.size)

if __name__ == "__main__":
    main(sys.argv[1])
