# 병과 캐릭터 원본

`*-sheet.webp` 는 병과 캐릭터의 원본 디자인 시트입니다. 바꾸지 마세요.

게임에서 쓰는 그림은 이 시트에서 캐릭터만 따로 떼어 낸 `public/assets/characters/*.png` 입니다.
원본 해상도 그대로이고, 다시 압축하지 않았습니다.
얼굴·머리·모자·옷·무기·색은 원본 그대로이며, 시트의 제목 글씨와 배경 장식만 걷어냈습니다.

| 병과 | 원본 시트 | 게임 그림 | 걷어낸 것 |
| --- | --- | --- | --- |
| 궁수탑 | archer-tower-sheet.webp | archer-tower.png · 788×983 | 제목·문구·연초록 붓질·발밑 그림자 |
| 대포탑 | cannon-tower-sheet.webp | cannon-tower.png · 747×1042 | 제목·문구·연기 구름·발밑 그림자 |
| 서리탑 | frost-tower-sheet.webp | frost-tower.png · 745×983 | 제목·문구·배경 하늘색 |

서리탑은 흰 머리와 흰 옷이 연한 하늘색 배경과 색이 거의 같습니다.
그래서 색이 아니라 윤곽선을 벽으로 삼아 배경을 흘려 채우는 방식으로 떼어 냈습니다.

새 병과 캐릭터를 넣을 때
1. 원본 시트를 이 폴더에 둡니다.
2. 캐릭터만 딴 그림을 `public/assets/characters/<병과id>-tower.png` 로 저장합니다.
3. `src/ui/chars.jsx` 의 `TOWER_CHARACTERS` 에 한 줄 더합니다.
