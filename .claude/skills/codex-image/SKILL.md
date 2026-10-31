---
name: codex-image
description: Codex CLI 로 게임 그림(캐릭터 시트 · 몹 · 정령 · 스킬 효과 · 아이콘)을 생성해 투명 WebP 로 게임에 넣는다. 사용자가 "이미지 뽑아서 만들어줘", "코덱스에서 이미지 불러와서", "이펙트 그림 만들어줘" 처럼 그림 생성을 요청할 때 쓴다.
---

# Codex 로 게임 그림 만들기

이 프로젝트의 그림은 Codex CLI(imagegen)로 만든다. 순서를 지키면 매번 같은 품질로 나온다.

## 1. 먼저 정한다
- **무엇을 몇 장** 만들지, **기존 그림 중 따라 할 것**이 어느 파일인지(화풍 기준). 기존 캐릭터는 스타일을 유지하고 특징 · 머리 모양만 새로 뽑는다. 사용자가 정한 조건(예: 푼 머리)은 프롬프트에 분명히 적는다.
- 종류에 따라 바탕색이 다르다.
  - 캐릭터 · 몹 · 정령 · 무기: **초록 `#00FF00` 바탕** → 나중에 지워 투명 WebP.
  - 빛 효과(마법진 · 폭발 · 검기): **검은 `#000000` 바탕** → 지우지 않고 게임에서 `lighter` 로 더해 그린다.
- 시트 모양(열 × 행 · 칸 크기)은 `public/assets/game/README.md` 의 비슷한 시트를 따른다. 새 시트면 README 표에 한 줄 더한다.

## 2. 기준 그림 준비 (작업 폴더는 scratchpad)
기존 투명 그림은 바탕색을 깔아 PNG 로 만든다(Codex 가 잘 읽는다).
```python
from PIL import Image
im = Image.open("public/assets/game/....webp").convert("RGBA")
bg = Image.new("RGBA", im.size, (0, 255, 0, 255))   # 효과 시트는 (0,0,0,255)
bg.alpha_composite(im); bg.convert("RGB").save("ref.png")
```

## 3. 생성 (여러 장은 동시에, 백그라운드로)
```bash
cd <scratchpad 작업 폴더>
(codex exec --skip-git-repo-check -s workspace-write --image ref.png -- "프롬프트. Save the result as 이름.png in the current directory." < /dev/null > j1.log 2>&1 &)
```
- 명령 끝의 `< /dev/null` 을 꼭 붙인다(입력 대기로 멈춘다).
- 파일이 생기면 끝난 것이다(`ls`). 로그가 길어도 실패가 아니다. 보통 1~3분.
- **프롬프트 틀**: `Reference image: <기준 설명>. Make a <C> columns x <R> rows sheet (<가로>x<세로>, each cell <N>x<N>) of <무엇>, same style as the reference. <칸마다 내용>. Flat solid #00FF00 green background (또는 pure black #000000, glowing light-only effects), no shadows on the ground, no text, no grid lines, <여백>px margin.` 영어로 쓴다.
- **쓰러뜨리지 말 것**: `pkill -f` 같은 이름 매칭 종료는 내 셸까지 죽인다. 서버를 띄웠다면 `timeout 120 npx vite ...` 처럼 시간 제한을 둔다.
- 결과는 반드시 `Read` 로 눈으로 본다. 칸 수 · 위치 · 화풍 · 요청한 조건(머리 · 색)이 맞는지 확인하고 틀리면 프롬프트를 고쳐 다시 뽑는다.

## 4. 바탕 지우기 (초록 시트만)
```bash
python3 tools/key-green.py 이름.png public/assets/game/.../이름.webp --cols 3 --rows 2            # 기본 strict
# 몸이 초록 · 연두 · 노랑인 칸(독 정령 · 숲 옷)은 칸마다: --mode "3:edge,4:pocket" (나머지는 strict)
```
- 방식: `strict`(기본 — 갇힌 초록 틈까지 모두 지움, 몸에 초록이 없을 때) · `pocket`(노랑 · 연두 몸) · `edge`(몸이 초록이어도 안전, 갇힌 틈은 남을 수 있다). 실제로 독 정령은 `edge`, 부식 정령은 `pocket`, 나머지는 `strict` 로 맞았다.
- 끝나면 `이름-check.png`(어두운 바탕 위)를 `Read` 로 본다. **초록 틈이 남았는지, 몸이 파였는지** 둘 다 확인하고 칸마다 방식을 바꿔 다시 돌린다. 누끼 때 흰 깃털 · 옷이 지워지지 않아야 한다.
- 그림이 칸 밖으로 나갔거나(칼 · 날개) 칸마다 위치가 들쭉날쭉하면 `python3 tools/relayout-sheet.py 지운것.webp 출력.webp` 로 칸 가운데 · 발밑에 다시 앉힌다(위쪽 상수 `FOOT` · `CELL` · `COLS` · `ROWS` 를 시트에 맞춘다). 만들어진 `-layout.png` 를 본다.
- 효과 시트(검은 바탕)는 `python3 tools/key-green.py 이름.png 출력.webp --black --size 1024x256`.
- 캐릭터 시트의 4방향 자르기 · 무기 지우기는 기존 스크립트: `tools/cut-adv-classes.py` · `tools/bare-adv.py` · `tools/recut-character.py` · `tools/cut-weapons.py`.

## 5. 게임에 넣기
- 원본 PNG 는 `design/<분야>/` 에 WebP 로 줄여 둔다(PNG 는 크다). 게임이 직접 쓰지 않는다.
- 결과는 `public/assets/game/rpg/...` 에 WebP. 경로를 `src/game/*Data.js` 의 `*_ART` 에 칸 크기 · 열 수와 함께 적고, 그리기는 `*Art.js`. **그림을 못 불러와도 깨지지 않는 코드 그림**을 남긴다.
- 효과는 알갱이 수에 `nq()`, 남의 연출은 `CROWD` 규칙을 지킨다(CLAUDE.md 6장).
- `public/assets/game/README.md` 표에 파일 · 크기 · 칸 구성 · 바탕(투명/검정 lighter)을 적는다.

## 6. 확인하고 끝낸다
1. 게임 화면에서 직접 본다: `timeout 120 npx vite --port 5199` 를 띄우고 Playwright 로 캔버스에 그려 스크린샷(`/opt/pw-browsers`, `playwright install` 금지).
2. `npm run build` · `npm run lint` · 관련 시험.
3. 업데이트 노트 · 패치노트 · 커밋(한국어 한 줄) · push · 배포 READY 확인(CLAUDE.md 2 · 7장).
4. 보고에 **무엇을 만들었는지 · 어떤 조건으로 뽑았는지 · 화면으로 본 것과 못 본 것**을 적는다.
