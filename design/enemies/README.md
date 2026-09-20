# 적 그림 원본

`enemy-sheet.webp` 는 다섯 적의 원본 디자인 시트입니다. 바꾸지 마세요.

게임에서 쓰는 그림은 시트에서 한 마리씩 떼어 낸 `public/assets/enemies/*.webp` 입니다.
배경(남색)만 걷어 냈고 색은 그대로입니다. `*-cut.webp` 는 줄이기 전의 손실 없는 원본입니다.

| 적 | 파일 | 화면 높이 | 파일 크기 |
| --- | --- | --- | --- |
| 오크 보병 | grunt.webp | 46px | 7KB |
| 고블린 척후 | rusher.webp | 36px | 5KB |
| 중장갑 트롤 | armor.webp | 61px | 12KB |
| 오우거 지휘관 | boss.webp | 101px | 28KB |
| 대군주 | titan.webp | 162px | 63KB |

화면 높이는 `world.js` 의 `ENEMY[].r` 과 `art.js` 의 `ENEMY_ART[].h` 로 정해집니다.
파일은 그 높이의 2.2배로 저장해, 화면 배율이 높아도 흐려지지 않게 했습니다.

`art.js` 의 `drawEnemy` 가 이 그림을 그립니다. 아직 안 왔거나 못 불러오면
예전의 손으로 그린 모습(`drawOrc`·`drawGoblin`·`drawTroll`·`drawOgre`·`drawTitan`)으로 돌아갑니다.
불타기·독·얼음·장갑 깎기 표시와 체력 막대는 그림 위에 따로 그리므로 그대로 동작합니다.

시트에는 작은 자세 변화 그림도 세 개씩 들어 있습니다. 걷는 동작을 넣고 싶으면 그것을 쓰면 됩니다.
