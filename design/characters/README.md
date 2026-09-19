# 병과 캐릭터 원본

`archer-tower-sheet.webp` 는 궁수탑 캐릭터의 원본 디자인 시트입니다. 바꾸지 마세요.

게임에서 쓰는 그림은 이 시트에서 캐릭터만 따로 떼어 낸
`public/assets/characters/archer-tower.png` 입니다.
원본 해상도(1254px 시트 → 788×983 잘라내기) 그대로이고, 다시 압축하지 않았습니다.
얼굴·머리·두건·옷·활·색은 원본 그대로이며, 시트의 제목 글씨와 배경 장식만 걷어냈습니다.

새 병과 캐릭터를 넣을 때
1. 원본 시트를 이 폴더에 둡니다.
2. 캐릭터만 딴 그림을 `public/assets/characters/<병과id>-tower.png` 로 저장합니다.
3. `src/ui/chars.jsx` 의 `TOWER_CHARACTERS` 에 한 줄 더합니다.
