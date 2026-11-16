# 에르덴 도서관 원본 (11월 16일, Codex)

- `library-src.webp` 건물(초록 바탕 원본) → `tools/key-green.py --size 512x512` → `public/assets/game/rpg/village/library.webp`
- `floor1-src.webp` · `floor2-src.webp` 1층 · 2층 바닥(1536×1024) → `public/assets/game/rpg/story/ground/erden-library(-2).webp`
- `librarian-src.webp` · `librarian-portrait-src.webp` 사서 하윤 → `rpg/story/people · portraits/librarian.webp`

바닥 그림을 다시 뽑으면 `src/game/libraryData.js` 의 조사물 자리와 `LIBRARY_BLOCKS`(가구 · 난간 막힘)를 그림에 맞춘다.
그림 좌표 × 1.5625 = 맵 좌표. 1층 계단은 오른쪽(그림 x 1175~1445 · y 150~560), 2층 계단 구멍은 오른쪽(그림 x 1160~1450 · y 180~535).
