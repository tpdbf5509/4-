# 병과 캐릭터 원본

`*-sheet.webp` 는 병과 캐릭터의 원본 디자인 시트입니다. 바꾸지 마세요.

게임에서 쓰는 그림은 이 시트에서 캐릭터만 따로 떼어 낸 `public/assets/characters/*.webp` 입니다.
원본 해상도 그대로이고, WebP 품질 92로 저장했습니다. 원본과 평균 1~2단계 차이라 눈으로는 구별되지 않고,
알파(오려 낸 테두리)는 한 픽셀도 달라지지 않습니다. 손실 없는 잘라내기 원본은 `*-cut.webp` 로 이 폴더에 둡니다.
얼굴·머리·모자·옷·무기·색은 원본 그대로이며, 시트의 제목 글씨와 배경 장식만 걷어냈습니다.

| 병과 | 원본 시트 | 게임 그림 | 걷어낸 것 |
| --- | --- | --- | --- |
| 궁수탑 | archer-tower-sheet.webp | archer-tower.webp · 788×983 · 128KB | 제목·문구·연초록 붓질·발밑 그림자 |
| 대포탑 | cannon-tower-sheet.webp | cannon-tower.webp · 747×1042 · 197KB | 제목·문구·연기 구름·발밑 그림자 |
| 서리탑 | frost-tower-sheet.webp | frost-tower.webp · 745×983 · 142KB | 제목·문구·배경 하늘색 |
| 저격탑 | sniper-tower-sheet.webp | sniper-tower.webp · 742×1042 · 112KB | 제목·문구·배경 도시 실루엣·조준선·후광 |
| 번개탑 | bolt-tower-sheet.webp | bolt-tower.webp · 721×1049 · 148KB | 제목·문구·멀리 뻗은 번개 |

서리탑은 흰 머리와 흰 옷이 연한 하늘색 배경과 색이 거의 같습니다.
그래서 색이 아니라 윤곽선을 벽으로 삼아 배경을 흘려 채우는 방식으로 떼어 냈습니다.

번개탑은 머리카락과 배경 번개가 같은 노란색이라 색으로는 나눌 수 없었습니다.
서리탑과 같은 윤곽선 방식으로 떼어 내고, 몸에서 멀리 떨어진 번개만 덜어 냈습니다.
몸을 감싼 번개는 남겼습니다. 작게 줄였을 때 번개탑임을 알려 주는 것이 그 번개입니다.

저격탑은 배경에 도시 실루엣과 조준선이 그려져 있어 배경만 흘려 채우면 같이 딸려옵니다.
대신 캐릭터가 온통 어둡다는 점을 이용해 어두운 부분(밝기 140 미만)만 남기고,
그 안에 생긴 구멍은 색을 보고 판단했습니다. 살갗·흰 부분은 메우고, 푸르스름한 배경 틈은 비웠습니다.

새 병과 캐릭터를 넣을 때
1. 원본 시트를 이 폴더에 둡니다.
2. 캐릭터만 딴 그림을 `public/assets/characters/<병과id>-tower.webp` 로 저장합니다.
3. `src/ui/chars.jsx` 의 `TOWER_CHARACTERS` 에 한 줄 더합니다.

저장은 이렇게 합니다.

```python
im.save("public/assets/characters/<id>-tower.webp", "WEBP", quality=92, method=6)
im.save("design/characters/<id>-tower-cut.webp", "WEBP", lossless=True, method=6, exact=True)
```
