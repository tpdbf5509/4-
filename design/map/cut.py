"""
길 타일·관문·상단 UI 원본 시트에서 게임이 실제로 쓰는 낱장을 오려내는 스크립트.

원본 5장(사용자가 준 목업/시트)은 이 폴더에 그대로 있다:
  source-path-tiles.jpg     ← 길 타일 7종이 모여 있는 시트
  source-gate-front.jpg     ← 관문 정면 2장(문양만 / 문양+길)
  source-gate-angles.jpg    ← 관문을 왼쪽·뒤·오른쪽에서 본 3장
  source-sound-buttons.jpg  ← 소리 켜기/끄기 단추 2장
  source-hud-panel.jpg      ← 상단 체력·웨이브 판 목업(글자가 그림에 박혀 있어 방패 아이콘만 씀)

낱장을 뗄 때는 배경(흰 바탕)과의 밝기 차이로 마스크를 만들고
scipy.ndimage.label로 서로 떨어진 조각을 찾아 조각마다 바운딩 박스로 자른다.
결과는 public/assets/map/tiles/, public/assets/map/gates/, public/assets/ui/ 에 저장한다.
정확한 픽셀 좌표(크롭 범위, 굽이 그림의 회전 중심 등)는 그림마다 눈으로 확인하며 정했으므로
이 스크립트는 "어떻게 했는지"의 기록이며, 다른 시트에 그대로 돌리면 좌표를 다시 맞춰야 한다.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = __file__.rsplit("/", 1)[0]


def cut_components(src_path, out_paths, bg_thresh=18, pad=6):
    """흰 배경 시트에서 서로 떨어진 그림 조각을 찾아 각각 파일로 저장한다.
    out_paths는 왼쪽 위부터 읽는 순서(줄 단위)로 조각에 대응시킬 이름 목록이다."""
    im = Image.open(src_path).convert("RGB")
    arr = np.array(im).astype(int)
    bg = np.median(arr[:8, :8].reshape(-1, 3), axis=0)  # 왼쪽 위 모서리로 배경색을 어림잡는다
    dist = np.abs(arr - bg).sum(axis=2)
    mask = dist > bg_thresh
    mask = ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=2)
    mask = ndi.binary_fill_holes(mask)
    labels, n = ndi.label(mask)
    boxes = ndi.find_objects(labels)
    # 줄(row) 단위로 먼저 묶고 그 안에서 왼쪽부터 정렬 — 시트가 격자로 배치돼 있어서다
    items = []
    for i, sl in enumerate(boxes, start=1):
        if sl is None:
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        items.append((y0, x0, x1, y0, y1))
    items.sort(key=lambda t: (round(t[0] / 80), t[1]))  # 80px 단위로 줄을 묶는다
    rgba = np.dstack([arr, np.where(mask, 255, 0)]).astype("uint8")
    out_im = Image.fromarray(rgba, "RGBA")
    for (name, (_, x0, x1, y0, y1)) in zip(out_paths, items):
        if name is None:
            continue
        crop = out_im.crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))
        crop.save(name)
        print(name, crop.size)


def crop_straight_mid(src, dst, left=65, right=1005):
    """긴 직선 타일은 양 끝이 둥글게 막혀 있어(통나무 기둥까지 있는 마감), 그대로 늘리면
    구간 중간에 막다른 길처럼 보인다. 양 끝의 둥근 마감을 잘라내 가운데의 늘려 쓸 수 있는
    부분만 남긴다(경계 좌표는 열 단위 알파 폭을 스캔해 마감이 끝나는 자리를 눈으로 확인했다)."""
    im = Image.open(src).convert("RGBA")
    im.crop((left, 0, right, im.height)).save(dst)


if __name__ == "__main__":
    # 1) 길 타일 7종 — 흰 배경에 격자로 놓여 있어 연결 성분으로 그대로 떨어진다
    cut_components(f"{HERE}/source-path-tiles.jpg", [
        f"{HERE}/../../public/assets/map/tiles/straight-long.png",
        f"{HERE}/../../public/assets/map/tiles/corner.png",
        f"{HERE}/../../public/assets/map/tiles/t-junction.png",
        f"{HERE}/../../public/assets/map/tiles/s-curve.png",
        f"{HERE}/../../public/assets/map/tiles/cross.png",
        f"{HERE}/../../public/assets/map/tiles/u-turn.png",
        f"{HERE}/../../public/assets/map/tiles/straight-short.png",
    ])
    crop_straight_mid(
        f"{HERE}/../../public/assets/map/tiles/straight-long.png",
        f"{HERE}/../../public/assets/map/tiles/straight-mid.png",
    )

    # 2) 관문 정면 2장, 3) 관문 옆·뒤 3장 — 아래쪽의 글자 알약(label pill)은 잘라내고 받았다
    cut_components(f"{HERE}/source-gate-front.jpg", [
        f"{HERE}/../../public/assets/map/gates/front.png",
        f"{HERE}/../../public/assets/map/gates/front-path.png",
    ])
    cut_components(f"{HERE}/source-gate-angles.jpg", [
        f"{HERE}/../../public/assets/map/gates/left.png",
        f"{HERE}/../../public/assets/map/gates/back.png",
        f"{HERE}/../../public/assets/map/gates/right.png",
    ])

    # 4) 소리 켜기/끄기 단추
    cut_components(f"{HERE}/source-sound-buttons.jpg", [
        f"{HERE}/../../public/assets/ui/sound-on.png",
        f"{HERE}/../../public/assets/ui/sound-off.png",
    ])

    # 5) 상단 HUD 목업 — "100"/"Lv.1"/웨이브 숫자가 그림에 직접 박혀 있어 그대로는 못 쓴다.
    #    글자가 없는 방패 아이콘만 파란색/밝기 기준으로 따로 오려서 crest 아이콘으로 쓴다.
    #    (나머지 판 디자인은 src/ui/style.css의 기존 .crest/.wave-box 배경을 그대로 둔다)
