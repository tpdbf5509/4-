# CLAUDE.md — 「네 갈래 방어선」 작업 지침

새 세션을 시작하면 이 파일부터 읽고 방향을 맞춘다. 꼭 필요한 것만 둔다.
- 기능마다의 상세 규칙 · 함수 이름 · 스냅샷 줄 번호 · 지난 사고 경위: `docs/작업-상세-기록.md`
- 기능 명세: `docs/기능-명세서.md` · 그림 지도: `ASSETS.md` · `public/assets/game/README.md`

이 파일과 코드가 다르면 **코드가 맞다**. 다른 점을 찾으면 이 파일도 함께 고친다.

---

## 1. 사용자와 대화하는 법

- **항상 한국어 존댓말**로 답한다. 짧고 명확하게. 근거 없이 지어내지 않는다.
- 사용자는 기획자이자 플레이 테스터다. 밸런스 숫자를 자주 바꿔 달라고 한다("60% 줄여보자" → "55%로"). 숫자는 한 곳의 상수만 고치면 되게 유지한다.
- 요청이 애매하면 하나만 짧게 묻는다. 뻔한 것은 정하고 진행한 뒤 무엇을 정했는지 알린다.
- 끝나면 **무엇을 바꿨는지 · 어떻게 확인했는지 · 배포 상태**를 짧게 보고한다. 확인 못 한 것은 못 했다고 말한다.
- 화면 문구 · 업데이트 노트 · 문서는 짧은 문장, 쉼표 적게, 괄호 영어는 꼭 필요할 때만.
- **지연 해결책으로 "손님 화면에서 내 스킬 · 공격 · 이동을 먼저 그리기(클라이언트 예측)"를 추천하지 않는다.** 사용자 결정 — 먼저 보여도 실제 판정은 늦어 어긋나고 렉처럼 보인다. 지연은 서버 위치 · 왕복 시간을 줄이는 쪽으로만 푼다.
- **RPG 새 창은 기존 상점·가방(`.shop`)이나 파티(`.rpg-stat`)의 틀과 공통 버튼을 재사용한다.** 갈색 바탕 · 금빛 강조 · 기존 글꼴, 게임 화면 안에 둔다. 기능마다 다른 색상 체계나 브라우저 전체 고정 창을 만들지 않는다.
- 디자인 취향: 톤다운 · 파스텔 색, 배경 60 : 글자 30 : 포인트 10, 왼쪽 정렬, 1px 얇은 선, 강조는 한 곳. 한글 제목은 자간을 살짝 줄인다.

## 2. 브랜치 · 배포

- 저장소 `tpdbf5509/4-`, 기본 브랜치 **`claude/4-player-coop-defense-1x89l5`**. 세션이 다른 브랜치를 정해 주면 거기서 커밋 · `git push -u origin <브랜치>` 하고 기본 브랜치로 합친다.
- **Vercel 프로젝트는 `four-lane` 하나만** 쓴다. 주소 https://four-lane.vercel.app. 다른 프로젝트 · 미리보기 주소로 배포하거나 안내하지 않는다.
  - 기본 브랜치에 push 되면 자동 배포된다. 보통 1~3분 안에 READY.
  - Vercel MCP `list_deployments` 는 **projectId 만** 넘긴다. teamId 를 넣으면 403 이 난다.
- 모든 작업은 끝나면 바로 four-lane 에 반영하고 READY 를 확인해 알린다.
- push 가 거절되면 `git fetch origin <브랜치>` 후 merge 한다(리베이스 · 강제 push 금지). 다시 빌드 · 확인 후 push.
- **RPG 전용 서버**(`server/`, Cloudflare Workers + Durable Objects, 이름 `four-lane-rpg`)는 GitHub Actions(`.github/workflows/rpg-server.yml`)가 push 때 배포한다. 저장소 비밀값 `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID`. 주소 `wss://four-lane-rpg.four-lane.workers.dev`(`src/net/api.js`, Vercel 환경 변수 `VITE_RPG_SERVER` 로 덮어씀). 내 컴퓨터 시험은 `cd server && npx wrangler dev --port 8787` + 화면 주소 `?srv=local`.
- 사용자가 요청하지 않으면 PR 을 만들지 않는다(세션 지시로 PR 을 거쳐 합치는 경우는 예외).
- 커밋 메시지는 한국어 한 줄, "무엇을 어떻게 한다" 꼴. 예: `궁수탑 4단계 공격력을 55% 낮추고 강화 비용을 260으로 올린다`

## 3. 게임 한눈에

- **네 갈래 방어선**. 북 · 동 · 남 · 서 네 길로 오는 적을 **최대 4명이 협동**해 막는 실시간 웹 디펜스. 설치 없이 브라우저(PC · 휴대폰).
- 모드 ① **방어전**: 대기실 → 웨이브 → 중간중간 **보스 결전**(각자 캐릭터로 보스를 친다) → 능력 카드 → 결과. 방 코드 4글자, `TEST` 는 테스트 서버.
  - 병과(= 탑) 11종 `archer` `sniper` `cannon` `bolt` `flame` `poison` `frost` `gravity` `supply` `corrode` `paladin`, 1~4단계. 난이도 쉬움 · 보통 · 어려움 · 지옥.
  - **방장 전용**: 시작 · 난이도 · 라운드 · 일시정지(결전 중에도) · 속도. 손님 화면에서는 버튼이 비활성.
- 모드 ② **RPG**: 서버 RPG1~RPG4(서버당 10명 `RPG_SERVER_CAP`). 광장 · 에르덴 마을(옛 새벽숲, id `dawnwood`, 광장 북쪽 문 · 메인 이야기 시작지) · 사냥터 21곳(1~400) · 계몽의 문 뒤 400~800 사냥터 8곳 · 타락한 천궁 오른쪽 800~1200 사냥터 8곳(`highData.js`) · 던전 · 심연의 탑(400레벨 · 끝없는 층 · 주간 순위 · 강화 카드 200종 `abyssCardData.js`) · 월드보스 · 길드 · 결투 · 거래 · 장터 게시판 · 의뢰 · 광장 미니게임 몹 레이스(`raceData.js`). 최고 1200레벨(`LV_MAX`, 11월 8일 800 → 1200), 200레벨 1차 전직, 스탯 5종(하나에 1200 `STAT_MAX`).

## 4. 기술 구조

| 구분 | 내용 |
|---|---|
| 화면 | React 19 + Vite 8. 판은 `<canvas>` 에 직접 그린다 |
| 실시간 | Cloudflare 워커 `four-lane-rpg`(2026-10-28 Supabase 한도 초과로 옮김). 방어전 방 · 관리 채널은 `Relay` DO(`/room/<코드>`), RPG 는 서버 방 `RpgRoom`(`/rpg/<서버>`) |
| 판정 | 방어전은 **방장 브라우저**가 판정하고 손님은 입력만 보낸다. RPG 는 기본이 **전용 서버 판정**, `?srv=off` 면 방장 브라우저 방식. 규칙 코드는 `src/game/` 을 서버도 그대로 묶어 쓴다 |
| 장부(계정 · 저장) | D1 `four-lane` + 장부 DO `Ledger`(`server/src/ledger*.js`, 함수 이름 · 인자 `p_*` 는 옛 Supabase rpc 와 같다). 화면은 `ledger(fn, args)`(`src/net/api.js`), 전용 서버 방에서는 방 웹소켓의 `ledger` 말로 서버에 부탁한다. 표는 `server/schema.sql` |
| 저장 | RPG 캐릭터는 이름 + 숫자 5자리 코드로 장부와 localStorage 둘 다. 홈 이름 · 설정은 localStorage |
| 소리 | 효과음은 웹오디오 합성. RPG 배경음악은 `public/assets/audio/bakery-morning.mp3`. ☰ 설정에서 전체 음량과 음소거를 조절한다 |

### 파일 찾는 법

- **수치는 데이터 파일 한 곳**, 규칙은 짝 파일, 그림은 `*Art.js`, 창은 `src/*Panel.jsx`.
  - 방어전: `world.js`(상수 · `TOWERS` · `DIFFS` · `makeGame`) · `logic.js`(규칙, 위쪽에 밸런스 상수, 스냅샷 `packSnapshot`/`applySnapshot`) · `art.js`.
  - RPG: `rpg.js`(규칙 본체) · `rpgArt.js` · `src/RpgView.jsx`(화면 · 입력). 기능별 수치는 `*Data.js`(item · shop · junk · armor · dungeon · abyss · skill · skillPx(스킬 상점 스킬 pixelfx 연출) · worldBossPx(월드보스 pixelfx 연출) · adv · deep · fieldLook · train · request · social · book · guild · worldBoss · worldEquipment · stormWeapon · jobTune · combatRules · duelBalance …).
- `src/game/towerInfo.js`: 탑 설명 숫자를 손으로 적은 곳 — logic.js 를 고치면 같이 고친다.
- `src/game/updates.js`: 대기실 업데이트 노트 · `RPG_NOTICE`. `bookData.js`: RPG 패치노트 책.
- `src/App.jsx`: 화면 흐름 · 방 연결 · 방장 권한 · 테스트 패널. `src/net/`: 방 연결 · 전용 서버 · 장부 호출 · 버전 확인(`version.js`).
- `server/src/`: `room.js`(RPG 방) · `relay.js` · `ledger*.js` · `save.js` · `index.js`.
- `tools/`: 시험(`*.test.mjs`)과 그림 자르기 스크립트. `design/`: 원본 그림(게임이 직접 쓰지 않음).
- `.claude/skills/`: `codex-image`(Codex 로 그림 생성 — 새 세션은 Codex 로그인이 비어 있다, `bash tools/codex-ready.sh` 로 먼저 점검) · `pixelfx`(외부 MIT 라이브러리로 픽셀 연출 시트 뽑기, 외부 코드는 scratchpad 에 받아 확인 후 실행).
  · `watch`(올린 영상에서 장면을 뽑아 보기).

## 5. 바꿀 때 사용자 확인이 필요한 규칙

### 방어전
- **강화 비용**: 1→2, 2→3 은 `건설비 × UP_MUL[1.8, 3]`. 3→4 는 탑마다 `def.up4`, **300 을 넘지 않는다**. 지금 값: 서리 · 중력 · 화염 · 대포 · 저격 300 / 독 280 / 번개 · 궁수 260 / 보급소 220 / 부식 200 / 성기사 120.
- **궁수 4단계**: 공격 속도 약 17배, 한 발 피해 `ARCHER_LV4_DMG_MUL = 0.14 * 0.45`.
- **4단계 탑 한도**: 한 사람당 1개(지옥 2개, `DIFFS[].cap`). 테스트 서버도 기본 적용, 테스트 패널 스위치(`g.testCapOff`)로만 푼다.
- **서리 4단계**는 3초 "얼림"(효과는 기절, 그림은 얼음). 기절 연출 코드는 지우지 않는다.
- **중력탑**: 가장 뒤의 적을 쏘고 맞은 자리에 중력장. **어시스트 골드**: 서리 · 중력이 건 적을 4초 안에 다른 탑이 잡으면 처치 골드의 30%.
- **성기사**: 성채 피해 감소 단계당 6%(합쳐 최대 45%), 결전 스킬은 아군 체력 60% 보호막.
- **대군주**: 체력 ×0.7, 사람이 주는 피해 ×1.4(`ARENA.titanHp` · `titanDmg`).
- **결전 중 성채 체력**: 맞은 피해를 바로 깎지 않고 **쓰러질 때** 성채에서 깎는다. 결전이 끝나면 줄어든 체력만큼 정산, 0 이면 패배.

### RPG — 깨면 기록 · 저장이 망가지는 것
- **스냅샷 차례 목록은 뒤에만 더한다**: `MAP_IDS` · `MOB_TYPES` · `REC_IDS` · `TITLES` · `BUFF_KEYS` · `REQUESTS` · `ADV_IDS` · `SHOPS` NPC 등. 몹 종류를 더하면 `REC_IDS` 에도 꼭 더한다.
- **손님에게 보여야 하는 새 상태는 스냅샷에 넣는다.** 넣지 않으면 방장 승계 · 서버 재접속 뒤 사라진다. 영웅 줄 끝 번호는 `docs/작업-상세-기록.md` 에서 확인한다.
- **DB(장부)를 직접 고치지 않는다.** 접속 중 10초 저장이 덮어쓴다. 대신 쓰는 것:
  - 모두에게 선물 `GIFT.id` · 한 사람 선물 `PERSONAL_GIFTS` · 한 사람 되돌리기 `PERSONAL_ROLLBACKS` · 서버 초기화 `RESET.id`(모두 `itemData.js`).
- **숨은 칭호(이스터에그)**: 직업과 다른 묶음 무기로 얻는 칭호는 얻기 전 칭호 창에 보이지 않고, **업데이트 노트 · 공지 · 화면 문구 어디에도 미리 적지 않는다.**
- **적룡 지팡이 · 크림슨 레퀴엠 · 영상 무기 등 `hold` 무기의 얻는 곳은 사용자가 정한다.** 그때까지 상점 · 특가 · 상자 · 관리자 자동 지급에서 뺀다.
- **월드보스 신규 무기 스킬은 기존 스킬 연출을 재사용하지 않는다**(전용 `sk_wb_*`).
- **원소는 마법사만**(`ELEM_JOBS`). 전직 초기화 · 원소 전환 물약은 150만 코인(`CLASS_POTION_PRICE`). 전직은 이 물약으로만 비운다.
- 서버별 월드보스 · 서버 정원 10명 · 길드 수치 · 거래 품목 12개 · 3분 · 장터 게시판(5칸 · 48시간 · 수수료 5% · 서버 공용)은 사용자 결정이다. 바꿀 때 묻는다.

### RPG — 업데이트할 때마다
- 패치노트 책: `bookData.js` `PATCH_RAW` **맨 위에 한 권**(같은 날 책은 `PATCH_BOOKS` 가 한 권으로 묶어 보인다). 밸런스 수치를 바꾸면 전후 값을 적는다.
- 패치노트 · 업데이트 노트 문장(11월 22일 사용자, AI 티 점검): 플레이어가 느끼는 변화만 짧게. 만든 도구 이름(픽셀 이펙트 · pixelfx · Codex)과 내부 방식(스냅샷 · 판정 선)은 쓰지 않는다. 「그대로입니다」는 오해가 생길 때만. 가운뎃점은 셋 이상 늘어놓을 때만, 둘이면 「와 · 과」로 잇는다.
- 스킬 설명(`note`)에는 눈으로 보이는 동작(앞으로 · 둘레를 · 화살을 쏜다)을 적지 않는다. 숫자 칸에 없는 조건 · 숨은 효과만 남긴다(11월 22일 사용자).
- 접속 때 안내 창이 필요하면 `RPG_NOTICE`(`updates.js`) id 를 바꾼다.

기능별 상세 규칙(심연의 탑 · 관리자 캐릭터 · 명령어, 보스 재료 · 강화, 방어구, 던전, 스킬 칸, 직업 · 무기 스킬, 전직 · 숙련도, 400~800 사냥터, 사냥터 PvP, 월드보스, 길드, 거래, 의뢰 · 퀘스트 마스터, 장터 게시판, 결투, 경험치, 방장 승계 · 넘기기, 한 캐릭터 한 곳, 마우스 이동, 잡동산이 상점, 직업 능력 조정)은 `docs/작업-상세-기록.md` 5장과 끝의 "10월 30일" 장들에 있다. 그 기능을 고치기 전에 해당 항목을 먼저 읽는다.

### RPG — 결투 밸런스 (11월 4일)
- 결투 전용 수치는 `duelBalance.js`의 `DUEL` 한 곳. 피해 ×0.03 뒤 평타 4% · 스킬 18% · 궁극기 25% 상한을 적용하고 상대 방어·보호막으로 넘긴다.
- 지연 타격·다단히트·투사체·장판·지속 피해·추가타는 원래 시전 객체를 보관하고 대상별로 상한을 나눠 쓴다.
- 회복 50%는 한 번만. 보호막은 생성량만 60%. 자동 회복은 피해 없이 7초 뒤 초당 1%이며 회복 50%를 다시 곱하지 않는다.
- **차단 · 신청 간격(11월 7일)**: 차단 목록은 가방 `bag.bk`(캐릭터 이름, 50명 `BLOCK.max`, `block.js`), 입력 `block {op:add|del,name}`. 결투 신청 · 파티 초대는 판정에서 막고(나를 차단한 사람에게는 이유를 숨긴다) 채팅 · 말풍선은 화면(`RpgView.jsx` chat)에서 거른다. 거래 요청은 아직 막지 않는다. 결투 신청은 `DUEL.askGap` 5초 · 같은 사람 `reaskGap` 20초, 받아들여지면 간격을 지운다(`h.duelAsk`). 시험 `tools/block.test.mjs`.
- 사냥터 PvP는 `rpg.js`의 `FIELD_PVP`(×0.3 · 평타 3% · 스킬 12% 완만한 상한)로 유지한다. 시험: `node --test tools/duel-balance.test.mjs`.

## 6. 작업할 때 지킬 것

- 밸런스 숫자는 **이름 붙은 상수**로 두고, 바로 옆에 한국어 주석으로 이유를 적는다. 매직 넘버를 흩뿌리지 않는다.
- 코드 주석 · 화면 문구는 한국어. 주변 코드의 말투와 밀도를 따른다.
- 탑 수치를 바꾸면 함께 고칠 곳: `world.js`/`logic.js` → `towerInfo.js` → (필요하면) `updates.js` → `docs/기능-명세서.md`.
- **업데이트 노트**(`updates.js`): 새 소식은 맨 위에 더한다. `id` 는 순서용이라 이미 나간 것은 고치지 않는다. 화면에 보이는 `date` 는 **실제 한국 날짜**. 사용자에게 보이는 변경은 노트에 남긴다.
- **그림**: 경로 · 파일 이름은 그대로 두고 그림만 바꾼다. WebP, 투명 배경, 크기 · 기준점은 `public/assets/game/README.md`. 못 불러와도 깨지지 않게 코드 대체 그림을 남긴다. 누끼는 흰 깃털 · 옷이 지워지지 않게 색 조건을 좁힌다.
- 테스트 서버 비밀번호는 해시(`TEST_HASH`, `App.jsx`)로만 둔다. **평문을 저장소에 적지 않는다.** 시험은 `localStorage["flg:test"] = TEST_HASH`.
- 새 영웅 필드를 더할 때는 `grep` 으로 이름이 비었는지 먼저 본다(`h.inv` 겹침 사고).
- 자주 보내는 "마지막 상태" 메시지를 더할 때는 차례 번호 `q` 를 싣는다(같은 사람 메시지도 순서가 바뀌어 온다). 워커 · DO 요청 수와 D1 쓰기 한도(하루 10만)를 먼저 셈한다.
- 새 연출은 알갱이 수에 `nq()` 를 쓰고, 남의 연출은 `CROWD` 규칙으로 줄어드는지 본다. 그리기 시간은 `getImageData` 로 칠하기까지 재야 정확하다.
- 새 요청 종류 · 새 맵은 옛 화면(옛 방장)이 모른다. `version.js` 가 새로 고치지만 이 점을 기억한다.

### 코드 작성 원칙 — ponytail (11월 19일 사용자 지시로 적용)
- 코드 작업은 `.claude/skills/ponytail` 규칙(기본 단계 full)을 따른다. 원본 `DietrichGebert/ponytail`(MIT) 의 프롬프트만 옮겼고 훅 · 스크립트 · 의존성은 넣지 않았다.
- 짜기 전에 사다리를 순서대로 본다: 꼭 필요한가 → 이 저장소에 이미 있나(공통 함수 · `.shop` 틀 · 데이터 파일) → 표준 · 브라우저 기능 → 이미 깐 의존성 → 한 줄 → 그래도 안 되면 최소 코드. 몇 줄 때문에 새 의존성을 더하지 않는다.
- 버그를 고칠 때는 고치는 함수의 호출처를 모두 `grep` 하고 공통 코드에서 한 번 고친다. 가지 · 반복 · 판정 · 돈(코인) · 보안이 든 새 규칙은 작은 시험 하나를 남긴다(`tools/*.test.mjs`).
- 일부러 줄인 곳은 `// shortcut: <한계>, <언제 고칠지>` 주석을 단다. 보고 끝에 건너뛴 것 · 확인 못 한 것 · 위험을 한두 줄 적는다.
- 줄이지 않는 것: 입력 검증 · 저장 손실 방지 · 보안 · 사용자가 기획한 기능과 연출. CLAUDE.md 의 다른 규칙과 부딪치면 CLAUDE.md 가 먼저다.
- 리뷰는 `ponytail-review`(바뀐 코드), 저장소 전체 점검은 `ponytail-audit`. 결과는 한국어로 낸다.

### 영상 보기 — watch (11월 22일 사용자 지시로 적용)
- 사용자가 올린 플레이 영상(`/mnt/project-files/*.mp4`)은 `.claude/skills/watch` 로 장면을 뽑아 직접 본다(원본 `bradautomates/claude-video`, MIT). 기본 local 엔진, 처음 한 번 `pip install -q yt-dlp`. 영상을 구글로 올리는 Gemini 엔진은 사용자가 원할 때만.

## 7. 확인 절차 (push 전에 꼭)

```bash
npm install            # 처음 한 번
npm run build          # 빌드가 통과해야 한다
npm run lint           # oxlint — no-undef 로 import 누락을 잡는다(빌드는 통과해도 화면이 흰색이 된다)
npx vite --port 5199   # 백그라운드로 띄운다. 자주 죽으니 연결 거부가 나면 다시 띄운다
```

- 고친 기능의 시험을 돌린다: `node --test tools/<기능>.test.mjs`. 서버 접속 시험은 wrangler dev 를 먼저 띄운다.
- 화면 확인은 Playwright(크로미움이 `/opt/pw-browsers` 에 있음, `playwright install` 하지 말 것).
- 규칙 변경은 페이지 안에서 `makeGame` 과 logic 함수를 직접 불러 숫자로 검증한다.
- 여러 명 동작(방장 · 손님)은 브라우저 컨텍스트 둘을 띄워 같은 방 코드로 들어가 본다.
- 끝나면 push → Vercel 배포 READY 확인 → 사용자에게 보고.

## 8. 겪었던 함정 (한 줄 교훈, 경위는 상세 기록)

- 업데이트 노트 날짜를 id 그대로 적었다 → `date` 는 실제 날짜.
- 테스트 서버가 4단계 한도를 무시해 "버그" 보고 → 기본 적용, 스위치로만 끈다. 좁은 칸 문구는 짧게.
- 결전 중 일시정지가 안 됐다 → 일시정지 처리에서 결전 상태도 허용한다.
- 남의 기록이 다른 캐릭터에 덮어써졌다 → 기록을 실을 때 자리 주인 id(`who` · `sw`)와 캐릭터 이름이 맞는지 본다. 레벨이 내려간 기록은 저장하지 않는다.
- 방장이 잠깐 둘이 되어 기록이 섞였다 · 세계가 되돌아갔다 → 손님은 지금 방장 스냅샷만 받고, 더 큰 ep 를 들은 방장은 물러난다.
- 전용 서버가 미국 · 홍콩에 생겨 느렸다 → DO 는 처음 생긴 곳에 머문다. 아시아(서울) 위치 힌트 · `GENS` 를 쓰고 점검은 `CHECK` 방으로 한다.
- 스킬을 몰아 쓰면 버벅였다 → 판정이 아니라 그리기가 무거웠다. 연출 수 · 알갱이를 줄인다.
- 가방을 열면 흰 화면 → import 누락. `npm run lint` 로 잡는다.
- "알 수 없는 요청입니다" → 옛 화면이 판정하고 있었다.
- 세션 브랜치와 기본 브랜치에 같은 커밋을 동시에 push 하면 Vercel 이 미리보기만 만들고 운영 배포를 건너뛸 수 있다 → 운영 배포가 안 생기면 기본 브랜치에 커밋을 하나 더 올린다(미리보기를 운영으로 올리지 않는다 — 환경 변수가 다르다).

### 새벽숲 마을 (11월 5일)
- `villageData.js`가 위치·인물·대화·충돌·길·그림 규격을 관리하고 `villageArt.js`가 바닥·건물·주민을 그린다. `dawnwood`는 `MAP_IDS` 맨 뒤에 추가했다.
- 광장 북쪽 문 ↔ 마을 남쪽 문. 안전 지역이며 기존 상점·의뢰를 복제하지 않는다. 메인 스토리·보상·진행 저장은 아직 없다. 장소·NPC id는 이후 이야기에서도 유지한다.
- `VillagePanel.jsx`는 기존 `.shop` 틀에 큰 초상화를 두고, 11월 19일부터 자막형(`.village-panel.talk`: 아래 어둠 띠 가운데 이름 · 대사, 오른쪽 알약 선택지, 왼쪽 아래 기록 단추 — 사용자 참고 사진)으로 보인다. 엔지니어 조사 창(`eq-panel`)은 예전 상자 그대로. 클릭·Enter·스페이스로 넘기고 Esc로 닫는다. 상세 기획·참고 출처는 `docs/새벽숲-마을.md`. 시험은 `tools/village.test.mjs`.

### 메인 스토리 1부 맵 · 인물 (11월 6일, 정식 그림)
- `storyData.js`가 1~6장 맵 10곳(`convoy` `lab7` `ruin-*` 4 `core` `relay` `mine` `vault`, `MAP_IDS` 마을 뒤) · 인물 7명 · 마을에 더한 시설 3과 인물 4를 관리한다. `storyArt.js`가 그림(없으면 임시 도형)을 그리고 `public/assets/game/rpg/story/` 에 같은 이름의 그림이 있으면 그림을 쓴다(그림 자리 표는 그 폴더 README).
- 에르덴 마을 가장자리 문 6곳(`storyData.js STORY_GATES`)으로 이야기 맵에 간다. 이야기를 그 장소까지 진행해야 열린다(`storyGateOpen`, 관리자는 늘 열림). 봉인 유적은 `RUIN_CHAIN` 순서로 이어지고 서쪽 유적 → 중앙 제어 시설. 관리자 `/이동` · 대화 끝 `go` · 퀘스트 창 "가기"도 그대로다. 안전 지역. 마을 화면 이름은 에르덴, 기록관 주민은 소은(설계자 세린과 구분). 상세는 `docs/메인스토리-1부-맵.md`, 시험은 `tools/story.test.mjs`.

### 메인 스토리 1~30장 (11월 7일 v3.0 전면 개편 · 11월 8일 v4.0)
- 기준 문서: 프로젝트 `notes/메인스토리-1-30장-수정본-v5.md`(11월 22일 — v4 의 반복 연출 지시를 「0.5 공통 연출 규칙」으로 모음. 사건 · 대사는 v4 와 같다). 공통 연출은 게임에 만들었다: 수치 `storyLines.js STORY_FX`(장면 시작 카메라 `g.camFocus` → `rpgArt.js follow` · 배경음악만 낮추기 `sfx.musicTo` · 말하는 사람이 바뀌면 반 박자 · 결과 뒤 쉼 · 시간 제한 경고음, `VillagePanel.jsx`). 옛 기준: `notes/메인스토리-1-30장-수정본-v4.md`(v3 에 장면마다 추가 대화 · 연출 지시를 더한 판, 사건 · 선택지는 v3 와 같다). 상세는 `docs/메인스토리-1-30장.md`.
- v4 추가 대화 90개는 말하는 인물이 있는 단계에 넣었다(옮긴 표는 상세 문서). 대화 창 「기록」 단추가 이번 대화의 지난 대사를 보여 준다(`.story-log`).
- 단계 · 대사는 부마다 `storySteps1~5.js`, 묶음 · 공통 함수는 `storyQuestData.js`, 줄 도우미(`L` `me` `sys` `nar` `beat`)는 `storyLines.js`, 규칙은 `storyQuest.js`. **단계 차례는 저장 값이라 뒤에만 더한다.**
- 진행은 가방 `bag.sq = {r: 판(STORY_REV=2), i, n, c: 꼬리표, t: 관계 -2~+2}`. 판이 다른 옛 진행은 `OLD_STEP_CH` 로 같은 장 처음에 옮기고 옛 꼬리표는 버린다.
- 장기 분기는 쌍점 꼬리표(`S1_RESCUE:supply`, 문서 플래그 16개)로 한 번만 확정된다. 줄 조건 `if` / `not` / `tr`(관계).
- **서버 권위**: 화면은 고른 대답 번호 `picks` 만 보내고 서버가 `storyPicks` 로 장면을 다시 따라가 꼬리표 · 관계를 정한다. 맞지 않으면 진행하지 않는다.
- 이야기 맵 23곳(1부 10 + `STORY_MAPS_2` 13, `PLACE()` 로 배치, 그림은 임시 도형). 대화 창 `VillagePanel.jsx`, 진행 칸 `StoryCard.jsx`(부 · 장 표시), 기믹(`order` · `hidden` · `wrong` · `timer`)은 그대로다.
- 완결 보상(30-05 `STORY_CLEAR_ID`): 기록 `rec.story`(REC_IDS 끝) → 칭호 `story30` 「네 갈래의 증인」(체력 +2점) · 단 칭호의 발밑 네 갈래 빛(`rpgArt.js STORY_TITLE`) · 가방 책 탭의 기념 기록서(내 선택으로 만든다). 완결 뒤 마을 인물은 후일담 대사(`storyAfter.js STORY_AFTER`). 칭호 비트는 11월 9일 세 칸(93개)으로 늘었다.
- **전달 개선(11월 8일)**: 단계 `look`(단서를 다 봐야 `at` 이 열림, 서버도 거절) · 줄 `key` · `fx` · `boss`(체력 줄은 보여 주기만). 의뢰 칸 상황 · 이유 `storyGuide.js`, 알게 된 것 · 장 요약 · 마을 말 `storyRecap.js`, 이야기 기록 `storyJournal`(저장 값 없음, 찾은 것만). 시험 `tools/story-guide.test.mjs`.
- **컷신(11월 22일 사용자 「동영상처럼 클로즈업 등 짧은 영화처럼」 · 참고 영상은 다른 게임 컷신)**: 대사 줄 `cut(id, 기록 문장)`(`storyLines.js`)에 닿으면 `VillagePanel` 이 `Cutscene.jsx` 를 게임 화면 위에 틀고 끝나면 다음 줄로 간다(이미 본 컷신은 기록 문장 한 줄). 장면 수치 `cutsceneData.js CUTSCENES`(가상 무대 1600 × 900 · 카메라 밀고 당김 · 색 warm/cold/mono · 흑백 위 강조 한 곳 · 알갱이 · 자막 · 소리), 그리기 `cutsceneArt.js`(바탕은 코드 그림, 인물은 기존 초상 · 몸 그림). 지금은 1-01 첫머리 `c1-open` · 빈 마차 `c1-wagon` 둘. 판정 · 진행과 상관없다. 시험 `tools/cutscene.test.mjs`.
- 보스 실제 전투는 아직 없다(보스는 시간 제한 선택 대화). 광장의 의뢰 NPC 한결 · 보리 · 미나는 이름만 같은 다른 인물이다. 시험은 `tools/story-quest.test.mjs` · `tools/story.test.mjs`.

### 에르덴 도서관 (11월 16일)
- `libraryData.js` 한 곳(건물 자리 · 문 · 두 층 · 조사물 · 사서 · 가구 막힘 `LIBRARY_BLOCKS`). 이야기 맵과 같은 틀이라 `storyData.js PLACE_MAPS`(= `STORY_MAPS` + 도서관)로 찾는다. `STORY_MAPS` 에는 넣지 않는다(맵 차례 · 이야기 문 판정).
- 맵 `erden-library` · `erden-library-2` 는 `MAP_IDS` 맨 뒤(BLOOD_LAB 다음). 늘 열림(이야기 진행 무관), 안전 지역, `top: 300`(벽 띠). 마을 문(건물 앞 계단 아래) ↔ 1층 ↔ 오른쪽 계단 ↔ 2층. 문 그림은 `libGate`(바닥 빛 · 이름표만, `villageArt.js`).
- 바닥 그림에 가구가 그려져 있어 조사물은 `bg: 1`(그림 없음 · 이름표만). `books: 'patch'` 는 대화 창 「책 펼치기」로 가방 책 탭을 연다(`BagPanel book0`). 보상 · 이야기 진행은 없다. 그림 원본 `design/library/`, 시험 `tools/library.test.mjs`.
- **장서(사용자 기획 · 원고 11권)**: `shelf: 탭` 조사물(1층 「에르덴 장서」 · 2층 「옛이야기 서가」)은 대화 대신 `LibraryPanel.jsx`(책장 → 펼친 책)를 연다. 원고 · 탭 · 책 종류 · 열람 시점은 `libraryBooks.js` 한 곳(`LIB_OPEN_AFTER` 7 · 8 은 1장, 9 · 10 은 4장 뒤). 꽂이 책은 고를 수 없다. 펼친 책 바탕은 공용 그림 `rpg/library/book-open.webp`, 본문은 글자로 놓는다(넓으면 두 쪽, 720px 아래 한 쪽). **붉은 강 설화(BLOOD-001)의 001 단서는 오른쪽 쪽 마지막 문장에만** 둔다(시험이 지킨다). 저장 값 없음.

### 에르덴 바깥 장소 여섯 곳 (11월 22일, 실제 게임에 열림)
- 사용자 요청 여섯 곳(숲 셋 별이슬숲 · 등불고개 숲 · 너덜재 숲, 마을 루엔, 산 둘 서리봉 · 칼등산) 을 모두 만들었다. 연결(내가 정함): 에르덴 동쪽 문 → 별이슬숲 → 북 `lantern-forest` → `luen` → `frost-peak` / 동 `scree-forest` → `blade-ridge`. 구성안 · 연결 지도는 프로젝트 `notes/에르덴-바깥-여섯-장소-구성안.md`.
- 수치 `wildsData.js`(`WILD_MAPS` · 나무 종류 `WILD_PLANTS` · 마을 문 `WILD_VILLAGE_GATE`). 이야기 맵 틀(`PLACE_MAPS`)이라 바닥 그림 · 소품 앞뒤 정렬 · 막힘을 그대로 쓴다. 맵 `dew-forest` · `lantern-forest` · `scree-forest` · `luen` · `frost-peak` · `blade-ridge` · `luen-library` · `luen-library-2` 는 `MAP_IDS` 맨 뒤. 출구는 맵마다 `exits`. 숲마다 나무 묶음 `WILD_SETS`(시트 한 장 → `cut-trees.py SETS`), 심기 설정은 `plant.py MAPS`(길 색 규칙 · 비울 원 · 등불).
- **사용자 지시: 배경과 나무를 한 장에 같이 뽑지 않는다.** 바닥(나무 없는 흙길 · 연못)과 나무 낱장을 따로 Codex 로 뽑고, `design/wilds/plant.py` 가 바닥 그림의 흙길을 비워 나무 자리 `wildsPlant.js` 를 만든다(손으로 고치지 않는다). 내 캐릭터가 나무 뒤 잎 안에 들어가면 그 나무를 반투명(`WILD_FADE`), 그림자는 땅 층(`drawWildShadows`).
- `WILDS.live = true`(11월 22일 사용자 "실제 게임에 적용해줘"). false 로 되돌리면 마을 동쪽 문은 테스트 서버(`g.test`)에서만 보인다(`gatesOf` 의 `wild`). 마을 길 `VILLAGE_ROADS` 끝 줄이 문까지 잇는다. 몬스터 · 보상 · 상점은 정하지 않았다. 시험 `tools/wilds.test.mjs`.
- 루엔 마을(사용자 추가 지시): 에르덴과 같은 구성, 길 · 건물은 새로. 도서관은 사서 이름 · 그림만 바꾸고 장서는 같게, 2층 큰 유리창은 새로. 건물 · 주민 `wildsData.js LUEN`(그림 `design/wilds/cut-luen.py`), 인물 `WILD_PEOPLE`. 도서관은 `LUEN_LIBRARY_MAPS` 가 `LIBRARY_MAPS` 를 본떠 id 만 바꾼다(조사물 `luen-` 접두, 사서 서하, 2층 창 `LUEN_WINDOW` 서리 무늬 창). 붉은 강 진혼곡 · 네크로맨서 단서는 에르덴 도서관에만 있다.
- 서리봉은 위쪽 바위 봉우리를 `top` 700 으로 막고 산자락에만 드문드문 심는다(`plant.py` `floor` · `sparse`). 칼등산은 밝은 능선만 걷는다 — `plant.py ridge()` 가 능선 밖 가장자리에 보이지 않는 막힘 `RIDGE_BLOCKS` 를 깐다. 바닥 그림을 바꾸면 `python3 design/wilds/plant.py` 로 다시 만든다.

### 건물 안 캐릭터 크기 · 카메라 · 걷기 속도 (11월 19일)
- `bodyScale.js BODY_SCALE` 한 곳. `library`(도서관 1 · 2층) 화면 키 1.0 · 주민 1.0 · `indoor`(`eng-oak` 목공소, `HOUSE_EQ`) 화면 키 `screen` 1.9 · `under`(나머지 `eng-*` 지하 · 기계 맵) 1.2 · 주민 0.75 · 걷기 `spd` 도서관 1.5 · 나머지 3. 카메라는 방 전체가 한 화면에 들어오게 자동(`camZoom` = min(W/맵 폭, H/맵 높이)), 몸 배율 = screen / 카메라. 대상 밖(에르덴 마을 · 이야기 장소 등)은 그대로(사용자 "마을에서는 바꾸면 안 돼").
- 그림은 발밑을 축으로만 키운다. 카메라 `cam.z` — 화면 → 땅은 화면/z + cam(`mouseMove.js` · `skillAim.js` · `guideArt.js`). 이름표는 `textUp` 으로 원래 글자 크기. 걷기는 판정 `rpg.js rpgWalk` · `walkTo` 의 `mapSpeed`(`heroSpeed` 는 다른 데 쓰는 비교값이라 여기만 고치면 안 걷는다), 빠른 걸음은 `stepWalk` 가 16px 씩 나눠 막힘을 건너뛰지 않고, 목적지 걷기는 `rpgWalk` 가 틱을 배율만큼 나눠 돌아가기 판단을 보통 간격으로 돌린다. 시험 `tools/body-scale.test.mjs`.

### 빈 맵 멈춤 · 맵 불러오기 화면 (11월 7일)
- `rpgStep`은 사람이 있는 맵(`mapsAwake`)의 몹만 돌리고, 빈 맵은 다시 나오기 대기 시간도 멈춘다. 월드보스 · 길드 토벌 보스는 예외로 늘 돈다. 훈련장 허수아비는 빈 훈련장에서 치운다. 전용 서버 방은 원래 아무도 없으면 통째로 멈춘다. 시험 `tools/map-idle.test.mjs`.
- 화면은 내 맵이 바뀌면 `mapLoad.js` 가림막을 띄운다. 새로 부른 그림(`new Image()`의 src)을 세어 다 오면 걷는다(최소 1.2초 · 최대 8초, `MAP_LOAD`, 진행 줄은 최소 시간에 맞춰 찬다). 가림막 동안 걷기 · 공격 · 스킬 · 말 걸기는 보내지 않는다(`loadBlocks`). 판정은 서버라 그 사이 몸은 이미 새 맵에 있다.

### 월드보스 등장 연출 (11월 8일, 보스 5종 전용 · 4초 · 등장 문구)
- 수치 `worldBossIntroData.js`(`WB_INTRO` 공통 시간표 · `WB_INTRO_SCENE` 보스마다 장면 · 문구 `cry` · 화면 효과 `screen` · 소리 차례), 재생 상태 · 화면 효과 · 문구 `worldBossIntro.js`(화면에만, 이 기기 시계, 스냅샷에 싣지 않음), 보스 몸 · 땅 효과 `worldBossArt.js`(`introBody` `introGround` `introOver`), 소리 `sfx.js INTRO_SND`. RpgView 루프가 `tickWbIntro`(drawRpg 앞) · `drawWbIntroHud`(뒤)를 부른다. 판정 · 위치 · 공격 시간은 그대로.
- 사용자 기획 시간표(약 4초): 0~0.5 가장자리 어둠 · 다른 소리 작게(`wbDuck`) → 0.5~1.5 보스 고유 효과(장면 시각 = 입장 − `lead`) → 1.5 붉은 문구(#E53935, 약하게 커지며) → 2.5 문구 아래 이름(회백색) → 3.3~4.0 문구가 사라지고 체력바가 나온다(`wbBarHidden`, `WorldBossPanel.jsx .rpg-wb-bar`). 문구는 화면 폭에 맞춰 줄인다. 흔들림 · 섬광은 과하지 않게, 공허는 흔들림 · 섬광 없이 조용하게.
- 새 출현은 다른 맵에서 가장자리 빛 + `wbHorn`. 출현(`a.key`)마다 첫 입장 한 번, 다시 들어오면 왼쪽 아래 이름표만. 싸우는 중(`wbInCombat`: 공격 · 기절 · 웅덩이, 또는 다른 사람이 있고 체력이 깎임)이어도 이름표만. 연출 중 `a.attack` · `a.stun` 이 생기면 모든 연출을 걷고 `wbStop`(소리 멈춤 · 다른 소리 되돌림), 다시 틀지 않는다. 퇴장 · 처치 · 다른 출현이면 곧바로 지운다. 소리는 정한 때에 tick 이 부른다(미리 예약하지 않음). 화면 알갱이는 `setWbIntroQuality`(rpgArt lod.q)로 줄인다.
- **연출 중 공격 금지(판정)**: 성역 입장(`worldBossInput` enter) 때 싸우는 중이 아니면 `a.cd` 를 `WORLD_BOSS.introGrace`(4.2초) 이상으로 늘린다. 연출 길이를 바꾸면 이 값도 맞춘다. 소환비 `WORLD_BOSS.fee` 35만(11월 8일 사용자 결정, 화면 문구는 이 값에서 만든다).
- 새 보스를 더하면 `WB_INTRO_SCENE`(+ `SCREEN` 효과) · `WB_INTRO_LINE` · `worldBossArt.js` 장면을 더한다. 시험 `tools/world-boss-intro.test.mjs`.

### RPG 테스트 모드 `?test` (11월 7일)
- 주소 `four-lane.vercel.app/?test` 에서만 켜진다(`src/net/testMode.js TEST_MODE`). 일반 주소에는 버튼도 없다. 방어전 테스트 서버(방 코드 TEST · 비밀번호)와 다른 것이다.
- RPG 는 테스트 전용 서버 방 `RPGT`(`testData.js TEST_SERVER`)에만 들어간다. 이 방은 캐릭터를 장부에서 **읽기만** 하고 저장하지 않는다(`room.js this.test`). 거래 · 길드 · 장터 · 탑 주간 보상은 `err:"test"`. 화면도 기기 기록을 고치지 않고, 계정 만들기 · 지우기 · 저장 · 접속 표시 장부 요청을 보내기 전에 막는다(`TEST_BLOCK_RPC`). 접속 중 표시를 남기지 않아 일반 서버와 함께 켤 수 있다.
- 기능은 훈련장 기능(`h.trn`)을 테스트 방(`g.test`)에서 모든 맵으로 넓힌 것: 무적(`hurtHero` 첫머리 — 즉사기도 막음) · 쿨타임 끄기 · 스택 가득 · 모든 몹 초당 피해 · 장소 이동(`rpgTrain` op `go`, `testSpots` — 던전 · 결투장 · 레이스 · 길드 칸 제외). 창은 오른쪽 위 「테스트 서버」 칸의 「도구」와 ☰ 메뉴. 시험 `tools/test-mode.test.mjs`.
- 사용자가 "이건 테스트 서버에 먼저 적용하자"라고 말한 작업만 테스트 서버에 먼저 넣고, 사용자가 확인한 뒤 실제 게임에 넣는다. 그 말이 없으면 바로 배포한다.

### 최고 레벨 1200 · 800~1200 사냥터 8곳 (11월 8일, 실제 게임에 열림)
- `highData.js` 한 곳(지역 · 몹 · 정예 · 보스 기술 · 재료 · 그림 규격). 규칙 `highCombat.js`, 그림 `highArt.js` · `highFxArt.js`, 시험 `tools/high.test.mjs`.
- 테스트 서버에서 먼저 확인한 뒤 `HIGH.live = true` 로 모든 서버에 열었다. live 를 false 로 되돌리면 테스트 서버(`g.test` · `g.high`)에서만 열린다(`highOn(g)`, 문은 `gatesOf(g, M)`). 장부 순위 레벨 검사는 네 자리(`ledger.js` `{1,4}`).
- 맵 · 몹 · 기록은 기존 목록 끝에만 붙였다. 모든 공격은 바닥 예고(`sk_hi_warn`)와 판정이 같은 모양. 그림 규격 `docs/고레벨-사냥터-그림-규격.md`, 상세는 `docs/작업-상세-기록.md` 끝.

### 심연의 탑 보상 개편 (11월 9일)
- 수치 `abyssData.js`(교환 · 상자 · 돌파 · 순위 · 외형), 규칙 `abyssReward.js`, 외형 그림 `abyssLookArt.js`(코드 그림). 상세 `docs/심연의-탑-보상-개편.md`, 시험 `tools/abyss-reward.test.mjs`, 난이도 측정 `tools/abyss-floor-balance.mjs`.
- 파편 · 인장 상한 99,999 — 재료 상한은 늘 `matMax(id)` 로 본다(`MAT_MAX` 를 직접 쓰지 않는다).
- 새 물품 · 상자 · 돌파 보상은 전용 서버만 판정하고 요청 id(`rid`)로 두 번 처리를 막는다. 가방 `bag.ab` 에 저장. 외형 · 돌파 차례는 뒤에만 더한다.
- 주간 순위 수령은 장부 `abyss_claims`(캐릭터 · 주 PK) · 굳힌 순위표 `abyss_boards`. `ABYSS_RANK.v2From` 앞선 주는 예전 표.
- 칭호는 63개, 비트 묶음 셋(`TITLE_CHUNKS`, 스냅샷 row[54].t3).

### 물약 제작 · 연금술 (11월 9일)
- 수치 `alchemyData.js` · 규칙 `alchemy.js` · 그림 `alchemyArt.js` · 창 `AlchemyPanel.jsx`. 상세 `docs/작업-상세-기록.md` 끝, 시험 `tools/alchemy.test.mjs`.
- 제작 레벨 1~50은 가방 `bag.al`. 일반 물약은 제작 레벨 50부터 산다(`whyPotionBuy` · 서버도 같은 함수). 특별 물약 셋(`SPECIAL_POTIONS`)은 그대로.
- 채집물은 `HERBS`(차례가 번호 — 새 사냥터는 `TIERS` 뒤에만). 판정은 서버, 스냅샷 `hb` · row[54].ga. 재료 8종은 `MATERIALS` 끝(되팔기 0).

### 히든 직업 BLOOD-001 (11월 14일, 단계 작업 중)
- 1차 전직을 대신한다(사용자 결정). 1단계 적혈탄 · 혈량 전환, 2단계 혈수 강타 · 혈검 · 혈막(직업 레벨 20), 3단계 혈량 상태(증폭 · 과충전 · 폭주 · 탈진) · 혈역 증폭(직업 레벨 100), 4단계 해금 경로(단서 셋 → 입구 → 맵 `bloodlab` 1인 시험, `bloodUnlock.js`, 가방 `bag.bu`). 수치 `bloodJobData.js` · 규칙 `bloodJob.js` · 그림 `bloodJobArt.js` · 화면 `BloodHud.jsx`. 저장 `bag.bd`, 스냅샷 영웅 줄 56. 시험 `tools/blood-job.test.mjs`. 상세 `docs/작업-상세-기록.md` 끝 · 프로젝트 `notes/블러드001-설계-정리.md`.
- 그림(UI 등)은 Codex, 이펙트는 pixelfx 로 만든다.
- **연출은 pixelfx 시트(`blood-job/px/`, `bloodJobPxData.js`)만 쓴다.** Codex 이펙트 레이어는 지웠다. 코드로 그리는 것은 1px 범위 예고선 · 남은 시간 띠 · 글자 · 표식뿐(11월 14일 사용자 지시). Codex 는 UI 그림(오른쪽 판)에만 썼다.
- **혈검(11월 15일 사용자 지시)**: 누르면 0.25초 생성(피해 없음) → 50초 손에 들고 **평타를 새로 누를 때만**(`rpgFire` 의 `fresh`, `bloodSwordPress`) 한 번씩, 횟수 제한 · 혈량 회수 없이 위아래 번갈아 벤다(11월 15일 사용자 — 5초 · 3번 · 3타 회수 10 에서 바꿈). 누르고 있던 평타 · 키 반복 · 자동 평타는 베지 않고, 든 동안은 원래 무기 평타도 막는다(`bloodSwordOn`). 대기 `BLOOD_FORM.sword.cd` 6초는 혈막 대기(`cd.form` 15초)와 따로. 상태 `h.bd.sw` → 스냅샷 줄 56 의 11번 칸, 대기는 4번 칸 6번째. 손에 든 검은 `rpgArt.js drawHero` 가 `bloodJobArt.js drawBloodBlade` 로 그린다. 형상화 연출 시트(`bj_sw_*` · `bj_arc*` · `bj_vl_*` · `bj_hd_*`)는 `design/effects/pixelfx/blood-job/blood-form.js`(새 pixelfx 이펙트) · `make-form.mjs` 로 뽑고, 밝은 외곽은 `_rim` 시트로 따로 그린다.
- **혈량 · 스킬 개편(11월 15일 사용자 기획)**: 한계는 직업 레벨을 따른다 — 안정 `100 + 5 × floor(lv/5)` · 증폭 +25 · 과부하 +50(`BLOOD.cap`, `stableCap`/`bloodCaps`, 화면 구분선 · 경고 `overWarn` · 저장 검사가 같은 함수). 혈량은 늘 5 단위(`BLOOD.unit`, `gainBlood` 가 내림), 처음 100, 과부하면 60 으로 폭주. 안정 한계를 넘는 것은 혈역 증폭(+10/초)뿐, 넘친 몫은 1초에 한 번 10씩 준다. 30 아래 PvE 자연 회복(`BLOOD.regen`, 엔진 `E.pvp` 에서 멈춤). 해금 레벨 `BLOOD.unlock`(적혈탄 1 · 혈수 강타 5 · 혈검 · 혈막 10 · 혈류 파동 15 · 혈쇄 갈고리 20 · 혈역 100), 연마 `TRAIN_UNLOCK` 1 · 5 · 10. 적혈탄 대기는 쏜 단계별(`tiers[].cd` 0.1 · 0.5 · 0.7초, 11월 16일). 적혈탄은 누르는 동안 모으기만 하고(1.2초에 2단계로 멈춤) 뗄 때만 쏜다 — 자동 발사 없음(11월 16일 사용자). 차징 구슬은 `bj_core`(blood-form.js core, 2배 · 화면 지름 약 22px). 새 스킬 `BLOOD_WAVE`(포인터 자리 `inputPt`, 가장자리가 지나간 대상마다 한 번) · `BLOOD_HOOK`(대상 · 길이 없으면 시전 안 함, `E.move` 로 시전자만 이동, 손님 화면은 줄 56 의 12번 칸이 있으면 큰 보정도 나눠 옮긴다 — `rpg.js` 스냅샷 적용). 키 H · J(`bWave` · `bHook`). 스킬 판 5 × 2, 아이콘 시트 4 × 3. 연출 `bj_wave`(반지름마다 한 칸 — 판정 반경에 가장 가까운 칸) · `bj_hk_*`. 시험 `tools/blood-job.test.mjs`.
- **BLOOD-001 이면 일반 스킬 칸(1 · 2 · R) · 큰 기술 · 전직 스킬을 쓰지 않는다**(판정 `rpgInput.js` · 화면은 단추를 숨김). 큰 기술 키(Shift · 터치 스킬 단추)가 혈역 증폭이다(11월 14일 사용자 결정). 전직 초기화하면 다시 열린다. 혈 키는 다른 행동과 겹쳐도 이 직업일 때 먼저 잡힌다(`keys.js BLOOD_ACTS` · `keyMap(binds, first)`, 키 판 3).
- 캐릭터 외형은 사용자가 준 시트(`design/blood-job/char/`)를 `tools/cut-blood-char.py` 로 자른 `characters/rpg/blood-<m|f>/`. `advArtPath` 가 이 직업(`bloodOn` · 손님은 `h.bdv`)이면 이 그림을 준다.
- 넓은 화면 · 마우스 기기는 스킬 · 물약 칸이 판 오른쪽 판(`.rpg-side`, Codex 그림 `rpg/ui/side-panel.webp`)에 있다. 좁은 화면 · 터치는 판 안 아래(`RpgView.jsx useSidePanel`).
- **최종 강화(11월 16일 사용자 기획)**: 기존 피해 상향(적혈탄 ×2.5 · 5.5 · 11 · 혈수 강타 ×9 / 최대 차징 ×11 · 증폭형 50 ×15 + 지면 폭발 ×4 · 혈검 ×1.5 · 형상화 25 ×2 · 50 ×3 · 혈류 파동 ×5 · 갈고리 도착 ×5 + 충격파 ×3)과 연마 50 효과. 신규 `BLOOD_PIERCE` 흑혈 관통 K · `BLOOD_SEA` 혈해 개문 L · `BLOOD_LEGION` 혈형 군단 U · `BLOOD_ORIGIN` 원초의 혈맥 Y(궁극기 `sid "ult"` · 보스 최대 체력 8% 는 `E.flat` = rpg.js `flatMobHit`) · `BLOOD_AWAKE` 원초적 지배 O. 해금은 직업 레벨 + **영구** 연마(`newLock` · `awakeLock`). 피해 강화 순서 `bloodBoost`: × (1 + 혈해 0.4) × (1 + 혈역 증폭형 50 0.3) × (1 + 각성 1.0). 각성 잔상은 시전 객체 `cast.echo` 로 한 번. 줄 탄 `s.ln`(참격파 · 관통) · 분신은 연출 `sk_bj_clone`(0.2초마다, 스냅샷에 자리 없음). 스냅샷 줄 56 의 대기 칸 10~14 · 13~16번 칸을 뒤에 더했다. 시험 `tools/blood-final.test.mjs`.
- **혈량 전환 · 조준 보정(11월 16일 사용자)**: 전환은 최대 체력 5% → 혈량 10 · 대기 0.1초(체력 1 아래면 못 씀). 화면은 손 높이(34)에서 포인터 쪽 방향을 보내고 판정은 발밑 선이라 작은 몹이 빗나갔다 → `snapAim`(`BLOOD_AIM`)이 손 높이 화면 선이 그림 속 몸을 지나가는 가장 앞 적의 발밑 쪽으로 방향을 바로잡는다(적혈탄 · 혈수 강타 · 갈고리 · 흑혈 관통). 적혈탄 충돌 지름 16 → 28.
- **무기 · 레퀴엠 회복(11월 16일 사용자)**: BLOOD-001 은 크림슨 레퀴엠(`BLOOD_WEAPON`)만 든다 — `whyEquip` 거절 · `unlockBlood` · `cleanBag` 가 다른 무기 장착을 푼다(`bloodWeaponOk`). 레퀴엠 평타 · 혈계 추격(무기 시전)이 맞을 때마다 최대 체력 1%(`passive.heal`, `bloodLifeOnHit`, 튄 피해 · 지속 피해 제외, 결투 50%).
- **결투(11월 16일)**: 혈검은 **참격마다 새 시전**(예전엔 생성 시전 하나를 50초 내내 써서 18% 상한을 다 쓰면 피해 0). BLOOD-001 결투 피해는 `DUEL.bloodMul` ×2(상한 · 방어 그대로). 혈역 증폭은 적이 없어도 1초마다 +30(경험치만 적이 있을 때). 신규 다섯 아이콘은 11월 18일 `design/ui/skill-icons/make-blood-new.py` 가 직접 그린 도트로 `skill-icons.webp` 넷째 줄(칸 10~14, 시트 4 × 4)에 더했다.

### 히든 직업 Gambler 002 도박꾼 (11월 16일, 실제 게임에 열림)
- 사용자 기획 「히든직업 002~006 통합기획안」의 002 만. 연습장에서 먼저 확인한 뒤 11월 16일 사용자 지시("이제 실제 게임에 적용해줘, 그리고 명령어도 같이")로 실제 게임에 이었다(`GAMBLER.live = true`, false 로 되돌리면 연습장에서만 켜진다 — `gamblerOn`). 1차 전직을 대신하고 BLOOD-001 과 함께 켜지지 않는다(`unlockGambler` · `unlockBlood` 가 서로 끈다, `cleanHj`). 전직 초기화 물약으로 끄고 직업 레벨 · 연마는 남는다. **히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.**
- 수치 `gamblerData.js` · 규칙 `gamblerJob.js`(엔진 `rpg.js gamblerEngine`, 입력 `hidden {op:"use", s}`) · 해금 `gamblerUnlock.js` · 그림 `gamblerArt.js` · 시트 규격 `gamblerPxData.js` · 화면 `GamblerHud.jsx`(칩 줄 · 스킬 칸 · 스탯 창, BLOOD-001 틀 재사용) · 연습장 칸 `Sandbox.jsx GamblerBar`. 시험 `tools/gambler.test.mjs` · `tools/gambler-live.test.mjs`.
- **저장 · 스냅샷**: `bag.hj = { active, jobs: { gambler: { lv, xp, tr } }, version }`(`shop.js cleanBag` → `cleanHj`, 시험 대여 `trial` 은 저장하지 않고 `prev` 로 되돌린다) · 해금 진행 `bag.gu = { c: 단서 비트, f: 본 것 · 주사위, o: 문 }`(`cleanGu`). 영웅 줄 **57** = `packGambler`(도박꾼이 아니면 0, 칸은 뒤에만 더한다). 손님 화면 값은 `h.gmv`(`gamblerView` · `gamblerLook`).
- **해금 경로(내가 정한 자리 · 방식)**: 단서 셋 중 둘(`GM_CLUE_NEED`) — A 광장 카지노 좌판 옆 「낡은 칩 상자」 · B 에르덴 여관 앞 「빛바랜 계약서」 · C 훈련장 「망가진 주사위 기계」(살펴본 뒤 허수아비 셋을 한 번씩 친다). 자리 `GM_SPOTS`, 상자를 본 뒤에야 나머지가 보인다(`gmSpotShown`). 둘을 모으면 상자가 문이 되어 맵 `casino`(「황금 카지노 뒷방」, `MAP_IDS` 맨 뒤, 1인 시험)로 간다. 시험은 직업 레벨 15 를 빌려 준다(`GM_CASINO.lv`): ① 칩 장막으로 예고 타격 막기 ② 칩 7개 풀 베팅 맞히기 ③ 운명의 눈으로 먼 표적 맞히기 → 해금. 나가면 빌린 직업을 돌려놓는다. 자리 그림은 `gm_props`(직접 그린 도트 5칸).
- **관리자 명령어**: `/도박꾼 <이름> [직업레벨 | 끄기 | 연마 <0~50>]`(별칭 `/갬블러`, `adminCmd.js`). 인자가 없으면 해금만, 숫자는 직업 레벨 1~200, `연마 N` 은 연마 셋을 모두 N, `끄기` 는 `dropGambler`. 거래 · 결투 · 시험 중인 사람에게는 거절한다.
- 화면 키는 새 칸 없이 기존 행동 키를 빌린다(`GM_SLOTS` · RpgView `GM_FIRST`). 키 설정 창에는 따로 칸이 없다.
- 외형 키는 11월 22일 사용자 "키가 너무 작아"로 1.0 → 1.25배(`cut-gambler-char.py SCALE`, 관리자 스킨과 같은 키). 체력 줄은 rpgArt `tallK` 로 머리 위.
- **이펙트는 pixelfx 를 쓰지 않는다**(사용자 지시 "직접 만들어줘"). `design/effects/gambler/make.py` 가 한 칸씩 직접 그린 도트 시트 17장(`rpg/effects/hidden-jobs/gambler/px/gm_*.webp`, 해금 자리 그림 `gm_props` 포함)만 쓰고, 코드로 그리는 것은 1px 범위 선뿐. 시트를 고치면 `python3 design/effects/gambler/make.py` → `manifest.json` 값을 `gamblerPxData.js` 에 옮긴다(시험이 같은지 본다).
- 무기를 들지 않는다(`whyEquip` 거절 · 맨손 그림). 일반 스킬 칸 · 큰 기술 · 전직 스킬 · 무기 스킬 입력은 `rpgInput.js` 가 버린다. 키는 기존 행동 키를 빌린다(`GM_SLOTS`: 1 · 2 · 3 · 4 · R · Z · Shift, 평타 = 황금 칩).
- 칩 7개 = 풀 베팅(다음 공격 스킬의 첫 유효 적중에 금화 7발). 시전 객체 — 평타 `basic` · 777 `sid "ult"` · 나머지 18% 상한, 풀 베팅 · 여러 타격은 원래 시전을 함께 쓴다. 내가 정한 해석 목록은 `docs/작업-상세-기록.md` 끝.

### 히든 직업 Engineer 003 엔지니어 (11월 17일 연습장 → 11월 19일 실제 게임 · 획득 루트)
- 11월 19일 사용자 지시 "엔지니어와 획득 루트 적용해줘" + 기획안 v1.0(프로젝트 `notes/엔지니어003-획득루트-기획안-v1.md`)으로 실제 게임에 열었다(`ENGINEER.live = true`). **히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.** 저장 `bag.hj`(`cleanHj` 가 gambler · engineer 를 함께 싣는다) · `HIDDEN_JOBS` 등록(유일 규칙) · 관리자 `/엔지니어 <이름> [직업레벨 | 끄기 | 연마 N | 루트 0~7]`.
- **획득 루트 「최초의 설계자」**: 수치 · 자리 · 대사 `engineerQuestData.js` · 판정 `engineerQuest.js`(입력 kind `eq`, 엔진 `rpg.js eqEngine`) · 그림 `engineerQuestArt.js` · 조사 창 `EngineerQuestPanel.jsx`(마을 대화 틀) · 시험 `tools/engineer-quest.test.mjs`. 진행 `bag.eu = {f: 깃발 비트(EQ_FLAGS 차례 — 뒤에만), d: 다이얼, w: 코드 틀린 수, t: 시험 체크포인트}`. 영웅 줄 **60** = `packEq`(결과 · 미믹 · 시험, 손님 `h.eqv`), 몹 줄 끝 **21** = 시험 몹 `[종류, 주인]`.
- 맵 16곳(`eng-*`, `MAP_IDS` 끝, 이야기 틀 `story: 1` · 바닥 그림 `story/ground/eng-*.webp`) — 모두 안전 지역이고 시험장(`eng-trial`)만 싸운다. 사냥터 출구 없음. 에르덴 마을 참나무 목공소 앞 문으로 들어간다. 레벨 제한 없음.
- **출구(11월 19일)**: 문 · 계단 · 사다리는 바닥 그림에 그려진 자리에 판정을 맞춘다(`EQ_EXITS` · `EQ_SITE_EXIT.at` 맵마다 · 조사 문 `gate`). 밟는 출구는 바닥 빛 + 이름표만(`eqGate`, 마을 돌문 그림을 쓰지 않는다). 그림에 문이 없는 곳은 `hatch` 로 정비망 승강판을 코드로 그린다(`engineerQuestArt.js drawEqExits`). 도착 자리는 출구 반지름 밖에 둔다.
- 위험 장치 · 미믹은 피해 없이 밀어낸다. 박자는 벽시계(`eqClock`)로 서버 · 화면이 같이 센다. 최종 시험은 엔지니어 직업 레벨 55 를 빌려주고(Gambler 002 시험과 같은 `trial` 가방) 기준 피해를 `EQ_TRIAL.base` 로 고정한다(`engineerEngine.base`). 시험 몹은 `m.eq`(허수아비 몸) — `hitMob` 이 `eqMobHit` 로 넘겨 배율 없이 깎는다. 계약은 `hiddenAsk`/`hiddenReply` 를 거친다.
- 실제 게임 화면: 스킬 칸 `EngineerHud.jsx EngineerBar`(연습장과 같이 씀) · 키는 `EN_SLOTS` 로 기존 행동 키를 빌린다(RpgView `EN_FIRST`) · 스킬 설명 `gameSkillInfo` engineer. 내가 정한 해석은 `docs/작업-상세-기록.md` 끝.
- 수치 `engineerData.js` · 규칙 `engineerJob.js`(엔진 `rpg.js engineerEngine`, 입력 `hidden {op:"use", s}` 를 `rpgHidden` 이 켜진 직업으로 보낸다) · 그림 `engineerArt.js`(연출 + 설치물 몸 `drawEngineerUnit`, rpgArt 가 발 높이로 줄 세움) · 시트 규격 `engineerPxData.js` · 연습장 칸 `Sandbox.jsx EngineerBar`. 시험 `tools/engineer.test.mjs`.
- 설치물(터렛 · 드론 · 수호자)은 몹 목록과 따로 `h.en.units`. 스냅샷 영웅 줄 **58** = `packEngineer`(아니면 0, 칸은 뒤에만). 손님 화면 값 `h.env`.
- 이펙트는 Gambler 002 처럼 직접 그린 도트 시트(`design/effects/engineer/make.py` → `hidden-jobs/engineer/px/en_*.webp` 21장 · `manifest.json` 값을 `engineerPxData.js` 에 옮긴다, 시험이 같은지 본다). 코드로는 1px 예고 · 범위 선만.
- 외형은 사용자 그림(남 · 여 한 벌씩)을 `tools/cut-engineer-char.py` 로 자른 `characters/rpg/engineer-<m|f>/`(원본 `design/engineer-job/char/engineer-<m|f>-*-sheet.png`). `advArtPath` 가 `engineerLook` 이면 이 그림, 걷는 그림 4장은 Gambler 002 와 같은 규칙.
- 내가 정한 해석 목록은 `docs/작업-상세-기록.md` 끝.
- 11월 17일 연출 보강: 조립·충전·추진기·조준 회로 시트 4장 추가. 총구·명중·포격·광선·충격파 시트를 보강했다. `drawEngineerFx`·`drawEngineerUnit`이 품질 값을 받아 장식 잔상을 줄인다. 판정·전력·대기·스냅샷은 그대로며 패치노트에는 적지 않는다.
- 11월 17일 밀도 보강(사용자 "범위는 큰데 이펙트가 비어 보인다"): 작은 입자 시트 `en_bits`(스파크 청록·금빛 · 불씨 · 금속 파편 · 연기 · 전류 줄기)를 `engineerArt.js bits()` 가 범위 안에 뿌린다. 자리는 연출마다 정해진 씨앗이라 프레임마다 이어진다. 상한 `EN_BITS`(한 연출 56 · 한 프레임 360), `DETAIL` 로 줄어든다. 궤도 포격 · 광선 · 펄스 · 명중 그림도 한 단계 키웠다.
- 11월 21일 빛 연출(사용자 "빛나는 이펙트를 넣어줘" → "pixelfx를 통해서 이팩트만 바꿔봐"): 이 셋만 pixelfx(MIT) 시트 — 바닥 진 `en_pf_rune`(rune-circle) · 빛 기둥 `en_pf_cast`(magic-circle-cast) · 번짐 `en_pf_burst`(collect-burst). 연마 색 셋을 줄로 묶음(`design/effects/pixelfx/engineer/pack.py` → `engineerPxData.js ENGINEER_PFX`, 시험이 본다). 빛 더하기(`lighter`)로 얹고 3배(`GLOW_K`)까지. 판정 그대로, 패치노트에 적지 않는다.
- 11월 21일 사용자 "pixelfx로 새롭게 다시 그려줘": 스킬 본체 연출(펄스 · 명중 · 사격 · 자기장 · 레일포 끝 · 착지 · 주먹 · 폭발 · 오버클럭 · 궤도 번개 · 마지막 폭발)도 pixelfx 시트 `en_pf_*` 11장(`ENGINEER_PFX`)으로 그린다. 손 그림은 설치물 몸 · 아이콘 · 레이저 · 레일포 띠 · 과열 · 입자 · 1px 예고선만 남았다. 판정 그대로.
- 11월 21일 사용자 "빛이 은은하게 퍼지는 이펙트 추가": 부드러운 빛 번짐 시트 `en_pf_halo`(pack.py 가 numpy 로 만든 둥근 빛 · 세로 빛 두 칸, 연마 색 셋 줄)를 `engineerArt.js halo`(`HALO`, 부드럽게 늘림 · 천천히 숨쉬듯)로 펄스 · 사격 · 폭발 · 자기장 · 빛 기둥 · 오버클럭 · 궤도 포격 둘레에 깐다. 판정 그대로, 패치노트에 적지 않는다.
- 11월 21일 사용자 "센트리 터렛이 작은 레일포를 쏘게": 터렛 한 발이 겨눈 적 쪽으로 사거리 끝까지(벽 앞에서 멈춤) 관통하는 작은 레일포가 됐다(폭 `EN_TURRET.railW` 20, 줄 위 적마다 ×3.0). 줄 판정은 레일포와 같은 `onLine`, 연출 `sk_en_mrail`(큰 레일포 띠를 줄인 것). 같이 고친 것: 터렛 · 드론 사격 연출에 `x` · `y` 가 없어 레이저가 그려지지 않던 것. 패치노트에 적지 않는다.

### 관리자 전용 스킨 (11월 22일)
- 사용자가 직접 그린 그림(`design/admin-skin/`)을 `tools/cut-admin-skin.py` 로 자른 `characters/rpg/admin-skin/`. `rpg.js adminLook(h)` = `h.admin`(스냅샷 줄 23 이라 다른 사람 화면에도 보인다)이면 `advArtPath` 가 직업 · 전직 · 히든 직업 외형보다 먼저 이 그림을 준다.
- 무기를 든 그림이 아니라 빈손으로 그리고(`bareHands`), 전설 방어구 겹쳐 그리기는 뺀다. 걷기 4장 · 체력 줄 높이는 히든 직업과 같은 규칙.
- 걷기는 `admin-walk-sheet-v2.png`(둘레 번짐은 알파 `HALO` 150 아래를 지운다). 서기는 흰 바탕 `admin-standing-v2.png`(가장자리에서 이어진 흰 점만 지운다), 시트는 칸 4등분이 아니라 덩어리로 나눈다(옆모습 발 잘림). 걷기는 한 줄 네 장을 같은 창으로 자르고 슈트 중심 · 진한 발바닥으로 기준을 맞춘다(움찔거림). 그림을 바꾸면 `python3 tools/cut-admin-skin.py`.

### 히든 계열 · 전용 사거리 (11월 20일)
- 히든 직업은 검사 · 마법사 · 궁수 묶음 밖의 「히든」 계열이다. 평타 사거리는 `hiddenFamilyData.js HIDDEN_RANGE` 한 곳(공통 `base` 230 · BLOOD-001 230 · 도박꾼 480 · 엔지니어 520 · 네크로맨서 140 · 마술사 550 · 와이번 160). 판별 `rpg.js hiddenOf`, `heroRange` · 사거리 원 · 스킬 설명이 이 값을 쓴다.
- 전용 무기는 묶음이 달라도 다른 무기 고정 피해(`offHand`)를 받지 않는다. BLOOD-001 평타는 바탕 직업과 상관없이 레퀴엠 한 발(`basicJob`). 피해 스탯 · 직업 피해 배율은 아직 바탕 직업. 새 히든 직업은 `hiddenOf` 와 표에 한 줄씩 더한다. 시험 `tools/hidden-family.test.mjs`.

### 히든 직업 유일 규칙 (11월 17일)
- 히든 직업(BLOOD-001 · Gambler 002 …)은 **관리자를 빼고 게임 전체에서 한 명만** 가진다. 먼저 해금한 사람이 갖고, 보유자가 있으면 시험 문(입구 · 카지노 상자)을 열 때 안내가 나오고 해금은 막힌다. 서버 RPG1~4 는 캐릭터 장부가 하나라 서버가 달라도 한 명이다.
- 규칙 · 판별 `src/game/hiddenUnique.js`(`HIDDEN_JOBS` — id 는 장부 표에 적히니 바꾸지 않고 뒤에만 더한다), 장부 표 `hidden_jobs`(`server/src/ledger-hidden.js`, 함수 `rpg_hidden` claim · sync · list, 전용 서버만 부른다), 방 `room.js hiddenTick`(시험 통과 요청 `g.hjq` → 장부 → 답 `h.hjr`, 가방이 바뀌면 sync). 시험 `tools/hidden-unique.test.mjs`.
- 자리는 보유자가 접속하지 않아도 장부에 남는다. 자리를 돌려주는 때: 직업을 끔(전직 초기화 물약 · 명령어 `끄기` · 다른 히든 직업으로 바꿈) · 캐릭터 삭제 · 서버 초기화로 기록에서 직업이 사라짐(저장된 기록에 직업이 없고 적은 지 5분이 지난 줄은 claim · list 때 치운다).
- 관리자 캐릭터는 자리를 쓰지 않고 막히지도 않는다. 관리자 명령어(`/블러드` · `/도박꾼`)는 제한을 무시하고 받은 사람도 보유자로 적힌다(둘 이상이 될 수 있다).
- 이 규칙이 생기기 전부터 가진 사람은 장부가 표를 처음 만들 때 한 번 훑어 모두 적는다(내쫓지 않는다). 여러 명이면 한 명만 남을 때까지 새 해금은 막힌다.
- 서버 계정이 없는 캐릭터(기기에만 있는)는 해금 순간 거절한다. 테스트 방 · 장부가 없는 방(`g.hjOff`) · 방장 브라우저 방식(`?srv=off`) · 연습장은 지키지 않는다. 새 히든 직업을 더하면 해금 끝에서 `hiddenAsk`/`hiddenReply` 를 거치게 한다(`gamblerUnlock.js settle` 참고).
- 히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.

### 히든 직업 Necromancer 004 그림자 군주 (11월 17일 연습장 → 11월 20일 실제 게임 · 획득 루트)
- 사용자 기획 「히든직업 002~006 통합기획안」 3장. 11월 20일 사용자 지시 "Necromancer 004 추가 · 단서를 대놓고 마을 · 광장에 건축물로 두지 말고 모두 상호작용으로"와 기획안 「Necromancer_004_획득루트_최종수정안」(12장)으로 실제 게임에 열었다(`NECRO.live = true`). **업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.** 저장 `bag.hj.jobs.necromancer`(`SAVED_JOBS`) · `HIDDEN_JOBS` 등록(유일 규칙) · 스냅샷 영웅 줄 **62** = `packNecro`(그림자 이름 `nm` 은 싣지 않는다 — 주인 화면은 자기 가방 명부에서 찾는다) · 관리자 `/네크로맨서 <이름> [직업레벨 | 끄기 | 연마 N | 루트 0~12]`(별칭 `/그림자군주`).
- **획득 루트 「이름 없는 군단」**: 수치 · 자리 · 대사 `necroQuestData.js` · 판정 `necroQuest.js`(입력 kind `nq`, 엔진 `rpg.js nqEngine`) · 그림 `necroQuestArt.js` · 조사 창 `NecroQuestPanel.jsx`(마을 대화 틀 `.eq-panel.nq-panel`, 「탐험 기록」) · 시험 `tools/necro-quest.test.mjs`. 진행 `bag.nu = {f: 깃발 비트(NQ_FLAGS 차례 — 뒤에만), d: 다이얼 · 횃불 등, t: 왕궁 체크포인트}`(`cleanNu`), 영웅 줄 **61** = `packNq`. 실행 상태 `h.nqRun`(스냅샷에 싣는 것만 손님이 본다).
- 맵 13곳(`necro_*`, `MAP_IDS` 끝, 바닥 그림 Codex `story/ground/necro_*.webp`, 소품 · 장군 `rpg/necro-quest/props.webp` · `generals.webp`). 모두 안전 지역, 레벨 1로 끝까지 갈 수 있다. 시험은 정규화된 몸 · 전용 키(평타 공격 · 대시 · 1 방패 · 2 미끼 · R 호출 · Shift 집결 · Z 수비 · X 공격)로 `tr` 안의 자기 몸들(아군 · 적 · 예고)만 쓴다(몹 목록과 따로). 실패해도 진행은 남는다.
- **마을 · 광장에 새 건물 · 표식 없음**: 입구는 에르덴 약초밭의 원래 울타리 쪽문(`v-gate`, 가까이 가야 이름표만), 단서는 도서관 2층 낮은 책장 사이의 떨어진 책(`l-book` → 깃발 `book`) · 약초사 루미 · 숲지기 유안의 대사 한 줄. 전용 맵 밖 조사 자리는 `NQ_OUT_MAPS` 에만 둔다.
- **테스트 서버 도구(11월 22일 사용자)**: `?test` 의 「도구」 창 「네크로맨서 장군 시험」 단추 여섯(발테른 · 세리온 · 라에딘 · 오르벤 · 모르켄 · 에레보스)이 앞 단계를 끝낸 것으로 깃발을 채우고 그 장군 곁에 세운다(`necroQuest.js nqTestGeneral` · `NQ_TEST_GENERALS`, 입력 `train {op:"nq", n}`, `rpg.js testNq` — `g.test` 에서만). 모르켄은 거울 퍼즐을 끝낸 상태로 봉인 시험부터. 테스트 방은 저장하지 않는다. 같은 도구 창의 토글 「장군 시험 퍼즐 건너뛰기」(`h.trn.skip`, 스냅샷 줄 47 의 7번 칸, `nqSkip` — `g.test` 에서만 듣는다)를 켜면 세리온 차례 맞추기 · 에레보스 문답 · 거울 다이얼 확인이 답 없이 풀리고, 모르켄 봉인석은 차례 없이 세며(쫓기는 부분은 그대로), 왕궁 3단계 문양 맞추기는 바로 통과한다. 실제 게임에는 없다. 발테른 시험 조정(병사 4명 · 통과 3명 이상 · 적 간격 7초 · 미끼 대기 8초 · 지속 8초)과 시험 중 카메라 줌아웃은 11월 22일 사용자 지시로 본 서버에도 적용했다(`necroQuestData.js` `NQ_TRIALS.shield` · `SK.decoy`, `rpgArt.js follow`).
- 계승은 `hiddenAsk`/`hiddenReply` 를 거쳐 `unlockNecro` 후 그림자 낫을 주고 든다(가방이 차면 왕궁에서 다시 받는다). 내가 정한 해석은 `docs/작업-상세-기록.md` 끝.
- 수치 `necroData.js` · 규칙 `necroJob.js`(엔진 `rpg.js necroEngine`, 입력 `hidden {op:"use", s}`) · 그림 `necroArt.js` · 시트 규격 `necroPxData.js` · 연습장 칸 `Sandbox.jsx NecroBar` · 시험 `tools/necro.test.mjs`. 가방 `bag.hj.jobs.necromancer = {lv, xp, tr, roster}`.
- 그림자는 몹이 아니라 `h.nc.sh` 에 있고 피해를 받지 않는다. 몹을 잡으면 흔적(`h.nc.tr`, 8초)이 남고 추출로 명부에 넣는다. 연습장 허수아비는 죽지 않아 「추출 연습 몹 세우기」(`rpg.js sandboxMobs`)를 쓴다.
- **평타는 근접 그림자 낫**(11월 17일 사용자 — 흑영탄을 뺐다, `NC_SCYTHE` 앞쪽 부채꼴 · 여럿을 한 번에, 손에 든 낫 `drawNecroScythe`). 그림자 병사는 사용자 참고 그림 색(검은 몸 · 보라 윤곽 빛 · 번개 줄기 · 빛나는 눈과 가슴 문양, make.py `glow`)이고 소환 번개 · 뒤 기운 · 걸을 때 연기 · 번개 타격 · 영역 안 번개를 더했다. 같은 날 "범위에 비해 비어 보인다"는 말에 알갱이(`motes` — 불씨 · 파편 · 번개 조각 · 연기 시트, 한 프레임 `PMAX` 420 개 · 연출 품질 Q 를 곱함)로 범위를 채우고 큰 형상(타격 · 폭발 · 표적)을 3배로 키웠다. 그림자 병사는 **쓰러뜨린 몹의 원래 그림을 그림자화**해 쓴다(사용자 "각 몹마다 그림자화된 이미지") — rpgArt 가 `setNecroMobPainter` 로 `MOB_DRAW` 를 넘기고 necroArt `shade` 가 검보라 몸 · 보라 윤곽 · 번개 · 눈을 입혀 종류 · 칸 · 색 줄마다 둔다. 못 만들면 공통 병사 시트. 같은 날 "현재 존재하는 모든 몹 전부" — 허수아비를 뺀 몹 62종 모두 그림자가 나온다(큰 판에 그려 높이 160 · 너비 236 안으로 줄이고 아주 작은 몹은 키운다, `fitMob`; 그림 파일이 늦게 오는 월드보스는 4초가 지나야 굳힌다). `NC_KIND_OF` 도 모든 몹에 짝을 정했고, 연습장 「명부에 넣기」로 어떤 몹이든 명부 맨 앞에 넣는다(`necroPutRoster`, 게임에는 이 길이 없다). 11월 23일 사용자 "보스 그림자가 안 떨어진다"로 게임에서도 보스 · 던전 · 탑 · 길드 · 월드보스가 흔적을 남긴다(`rpg.js necroEngine.trace`, 월드 · 길드 보스는 `necroRaidKill`).
- **보스 그림자 그림(11월 20일 사용자 그림)**: 보스 19종(던전 5 · 길드 3 · 탑 6 · 월드보스 5, 해골은 사용자 지시로 뺐다)은 코드 그림자 대신 사용자 그림 `necromancer/boss/<종류>.webp`(`tools/cut-necro-boss.py`, 목록 `necroPxData.js NC_BOSS_ART`). 무기를 든 7종(바르카논 · 세르카 · 모르가스 · 재의 용기사 · 녹슨 심판관 · 얼어붙은 사제 · 바다세이렌)은 `tools/cut-necro-arm.py` 가 팔 + 무기(`-arm<i>`)와 몸(`-body`)으로 나누고, 공격할 때 어깨 관절(`NC_BOSS_ARM`)로 들어 올렸다 내려벤다(`NC_BOSS_SWING`). 판정 그대로.
- **보스 그림자 기술(11월 20일 사용자 "각 보스몹들 자기 스킬들을 사용하게, 월드보스는 즉사기는 빼고")**: 보스 그림자는 평소 공격 사이에 원래 보스의 피해 기술을 쓴다(`necroData.js NC_BOSS_SKILL` · `NC_BOSS_SK`). 던전 · 탑은 `BOSS_AI` · `GUARDIANS` 의 slam · multi · charge 값을 그대로 읽고(철벽 · 광폭화 · 잔상 · 소환 · 흡수는 뺐다), 길드 · 월드보스는 원래 모양 · 이름에 크기 ×0.45 · 피해 비율 ×3 · 대기 10초 · 간격 ×0.6, 즉사기는 없다. 판정 `necroJob.js bossCast` · `bossStep`(기술마다 새 시전), 연출 `sk_nc_bwarn`(땅 예고 1px 점선) · `sk_nc_boss`.
- **그림자 낫 전용 무기(11월 20일 사용자 "낫도 전용무기로 만들자")**: 아르카디온과 같은 방식 — `necroData.js NC_WEAPON_ITEM`(`nc_scythe`, hold · `hj`, 지능 260 · 100레벨 · 4등급) · `SPECIALS` 에 더함. 이 직업은 이것만 들고(`ncWeaponOk`, `whyEquip`) 다른 직업은 못 든다. 들어야 평타 그림자 낫을 휘두르고 손 그림도 그린다(`ncArmed`, 맨손이면 조용히 휘두르지 않는다(안내 문구 없음)). 가방 그림 `rpg/weapons/nc_scythe.webp` 는 `tools/make-nc-scythe-icon.py`. 그림은 11월 20일 사용자 그림(`design/necro-job/ref/scythe-user.jpg` → `tools/cut-nc-scythe.py` 가 초록 바탕을 지운 `scythe-clean.png`)이다 — 손에 든 시트 `nc_scythe` 는 make.py `scythe_cells` 가 위아래를 뒤집어 예전 자루 방향에 맞추고 길이는 예전의 절반(`SCY_SIZE` 0.5, 사용자 "캐릭터보다 무기가 너무 커")으로 2배 해상도로 뽑고(`NC_SCY_K` 1), 가방 그림은 전체를 줄인다. 초록 · 청록 기운은 `tools/nc_unteal.py` 가 원본 · 줄인 시트 · 가방 그림 모두에서 보라 회색으로 바꾼다(초록이 빨강 · 파랑보다 높은 점 0개). 연습장은 이 직업을 고르면 무기 칸이 그림자 낫으로 정해진다.
- **그림자 이름(11월 20일 사용자 "처음 추출한 몬스터에 이름 · 어딜가도 유지 · 다른 사람들에게는 아무 이름도 안 보이게")**: 처음 등록하면 판정이 `h.nc.ask` 를 세우고 화면이 알림창 `NecroRosterPanel.jsx NecroNamer` 를 띄운다(명부 창 「이름」 단추로도). 입력 `hidden {op:"name", t, n}` · `{op:"name", skip:1}`. 명부 칸 `nm`(`cleanNcName`, 8자 · 금지어 `NC_NAME.ban`), `necroView` 는 보이는 이름을 `n` · 몹 이름을 `base` 로 준다. 연습장은 이 기기 `flg:ncNames` → `h.ncNames` 로 같은 종류에 다시 붙인다. 그림자 이름표(등급 점 위)는 주인 화면에만(`drawNecroShadowOf` mine), 이름이 든 외침은 `mine: 1`(rpgArt 가 남의 화면에서 뺀다). 실제 게임에 열 때 스냅샷에 `nm` 을 싣지 않는다.
- **그림자 소환(11월 20일 사용자 — 옛 이름 「그림자 소집」)**: 명부 창에서 고르면 그 하나만, 군단 편성이 있으면 편성한 그림자만, 없으면 등급 높은 순 5기(`summonPick`).
- **그림자 명부 창(11월 17일 사용자, 참고 그림 두 장)**: `src/NecroRosterPanel.jsx`(연습장 「그림자 명부」 단추, 판 위에 겹쳐 띄움, 검은 바탕 · 보라 `.ncw-*`, 720px 아래는 정보가 목록 위). 탭 소환 목록(카드 · 소환 정보) · 군단 편성(소집 차례 5칸 `J.party`, 남은 칸은 등급 순 — `summonPick`) · 승급. 입력 `hidden` op `use`+`t`(고른 그림자를 맨 앞에 두고 그림자 소집) · `recall`(그 그림자만 거둠) · `party`. 「강화」는 연습장 도구 `necroSandboxRefine`(재추출 한 번으로 셈). 등급을 레벨 자리에, 그림자는 체력 · 방어력이 없어 공격 세기 · 거리 · 속도 · 범위를 보인다(정한 해석). 초상은 `drawNecroPortrait`.
- **11월 19일 사용자 "캐릭터가 너무 작아 · 낫을 든 포즈로"**: 몸 그림 1.4배(`cut-necro-char.py SCALE`, 체력 줄은 rpgArt `tallK`). 낫 시트 `nc_scythe` 를 다시 그려 가슴 높이에서 자루를 비스듬히 쥐고 큰 날이 몸 앞 아래에서 위로 솟는다(손 자리 · 든 자세 회전 `necroArt.js NC_HAND`, 참고 그림은 자세만 본다). 같은 날 "휘두를 때 모션이 이상해" — 베기는 손에 든 낫이 한 덩어리로 들어 올림 → 내려벰 → 돌아옴(`NC_SWING`, 날 잔상 셋)으로 그린다. 휘두르는 동안은 날을 자루 축으로 뒤집어(`NC_SHAFT`) 날 끝이 아래를 향한다(사용자 "칼날 끝이 아래로 가게"). 옆(왼쪽 · 오른쪽)을 볼 때는 서 있을 때도 자루를 세우고 날을 머리 위에서 뒤집어 날 끝이 앞 아래로 늘어진다(`NC_HAND` side 넷째 값, 11월 20일 사용자). 같은 날 사용자 사진대로 옆 자세 자루를 33° 더 기울여(회전 2.39 → 2.99) 자루 아래 끝은 발 뒤 · 위 끝은 머리 앞 위, 날은 머리 위에서 뒤로 뻗는다(길이 그대로). 큰 반달 `nc_reap` 은 그대로 그린다(사용자 "반달은 되돌려"). 판정 그대로. 11월 21일 사용자 영상 "낫 휘두르는 모션이 이상해" — 실제 게임은 스냅샷이 `h.swing` 을 0.05초마다 0.2 로 다시 채워 그림이 매번 내려벤 끝에서 새로 시작했다(들어 올림 · 내려벰이 안 보이고 멈췄다 돌아오기만). `necroArt.js necroSwingClock` 이 휘두름 하나에 한 번만 처음부터 그린다(평타 간격 × `NC_SWING_RENEW` 안의 재충전은 같은 휘두름). 연습장만 보고 고치면 이 문제가 안 보인다. 같은 까닭으로 칠 때 몸 기울이기(`rpgArt.js heroMotion`, 모든 캐릭터)도 0.05초마다 튀어 떨렸다 — 친 때부터 지난 시간(`LUNGE_T`)으로 그린다. 같은 날 사용자 그림(검은 · 빨간 · 파란 선)으로 앞 모습 베기만 따로 그린다(`NC_SWING_FRONT` · `frontRot`): 든 자세 → 왼쪽 위로 부드럽게 들어 올림 → 몸 앞 아래를 지나 오른쪽으로 빠르게 → 오른쪽에서 머리 위를 지나 왼쪽으로 천천히 → 든 자세, 화면 반시계 한 바퀴. 옆 · 뒤 · 돌아보기(`turn`)는 예전 길.
- **외형(11월 17일 사용자 그림 남 · 여)**: `tools/cut-necro-char.py` 가 `design/necro-job/char/necro-<m|f>-*-sheet.png` 를 `characters/rpg/necro-<m|f>/` 로 자른다(엔지니어와 같은 규칙 · 걷기 4장). `advArtPath` 는 `necroLook` 이면 이 그림.
- 이펙트는 pixelfx 없이 `design/effects/necromancer/make.py` 가 직접 그린 도트 시트(`rpg/effects/hidden-jobs/necromancer/px/nc_*.webp`). 11월 20일 사용자 "보라색보다 검정에 가깝게 · 곳곳에 빛나는 보라 하이라이트" — make.py `darken` 이 연출 시트 전체를 검보라 4단(`DARK`)으로 누르고 밝던 자리 일부만 빛나는 보라(`GLOW`, 몫 `DARK_RATE` · 가장자리 `DARK_EDGE`)로 남긴다. 그림자 병사 · 아이콘 · 손에 든 낫은 빼고(`DARK_SKIP`), 영혼 소각의 붉은 색도 누른다. 같은 날 "장판 밀도가 부족해" — 군주의 영역 바닥을 반투명 검정(`DOMAIN_FILL` 0.55)으로 먼저 채우고 무늬도 촘촘히. 같은 날 "pixelfx로 보완해줘" — 영역에 pixelfx(MIT)를 검보라 + 보라 팔레트로 뽑아 깐다 — 발밑 `arcane/rune-circle` 룬 원 · 곳곳에서 엇갈려 솟고 자리를 바꾸는 `shadow/grasping-hands` 팔 · `spawn/spawn-portal` 균열(사용자 "불 같은 건 어울리지 않아"로 `shadow-flames` · "촉수 빼자"로 `shadow-tendrils` 는 뺐다). 이어 "원 끝을 딱 자르지 말고 그림자 불꽃으로 마감" — 바닥 채움이 `DOMAIN_SOFT`(0.72)부터 흩어져 사라지고 또렷한 테두리 고리를 뺐으며(펼칠 때만 1px), 끝은 make.py `domain_edge_cells` 가 그린 누운 그림자 `nc_domain_edge`(원 0.8 에서 바깥 `EDGE_OUT` 1.2 까지 물결치며 옆으로 흐름, 12칸 반복 · 한 바퀴 `NC_EDGE_SPIN` 2.4초)가 덮는다 — 세운 불꽃은 사용자 "위로 솟은 불꽃 말고"로 뺐다(`nc_pf_*`, 규격 `necroPxData.js NECRO_PFX` · 수 · 배수 `NC_DOMAIN_PFX`, 다시 묶기 `design/effects/pixelfx/necromancer/pack.py`, 그리기 `necroArt.js domainPfx`). 고치면 make.py → `manifest.json` 값을 `necroPxData.js` 로(시험이 본다). 키는 기존 행동 키를 빌린다(`NC_SLOTS`). 내가 정한 해석은 `docs/작업-상세-기록.md` 끝.

### 히든 직업 Wyvern Knight 006 와이번 나이트 (11월 17일, 격자 연습장에만)
- 사용자 기획 「히든직업 002~006 통합기획안」 1부 요약 · 2부 5장. **획득 방법 없이 `?sandbox` 에서만**(`WYVERN.live = false`, `wyvernOn`). 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다. 저장 · 스냅샷 · 관리자 명령어 · 유일 규칙에는 아직 잇지 않았다 — 실제 게임에 열 때 Gambler 002 처럼 붙인다.
- 수치 `wyvernData.js` · 규칙 `wyvernJob.js`(엔진 `rpg.js wyvernEngine`, 입력 `hidden {op:"use", s}`) · 그림 `wyvernArt.js` · 시트 규격 `wyvernPxData.js` · 연습장 칸 `Sandbox.jsx WyvernBar` · 스킬 설명 `hiddenSkillInfo.js` · 시험 `tools/wyvern.test.mjs`. 가방 `bag.hj.jobs.wyvern = {lv, xp, tr}`, 상태 `h.wy`.
- 스킬 열 개(2부 표 여덟 + 1부의 천공강습 F · 아르카디온 X). **아르카디온은 손에 드는 전용 무기**(11월 18일 사용자 "레퀴엠처럼 장착하는 무기") — `WY_WEAPON_ITEM`(`wy_arcadion`, hold · `hj`, 관리자 /지급 목록에서도 뺀다). 이 직업은 아르카디온만 들고(`wyWeaponOk`), 들어야 X 기술을 쓴다(`wyArmed`). 손 그림은 `drawWyvernHero`(혈검 손 자리 `BLADE_HAND`), 휘두르기는 `h.wy.sw`. 와이번은 `h.wy.u`(몹 아님 · 피해 없음), 높이는 그림자와 그림의 화면 차이로만. 급강하 · 용성 중 시전자 그림을 띄운다(`wyvernAir`).
- 이펙트는 pixelfx 없이 `design/effects/wyvern/make.py` 가 직접 그린 도트 시트(`hidden-jobs/wyvern/px/wy_*.webp`). 고치면 make.py → `manifest.json` 값을 `wyvernPxData.js` 로(시험이 본다). 외형은 11월 18일 사용자 그림(남 · 여)을 `tools/cut-wyvern-char.py` 로 자른 `characters/rpg/wyvern-<m|f>/`(원본 `design/wyvern-job/char/`, 서기 + 4방향 걷기, `advArtPath` 의 `wyvernLook`, 여성 그림은 같은 날 사용자 새 그림(은발 · 붉은 망토)으로 바꿨다). 아르카디온 손 그림 `wy_blade` 는 사용자 그림 `design/wyvern-job/ref/arcadion-ref.png` 를 make.py 가 눕혀 도트로 옮긴다(`ARC_LEN` 76). 11월 18일 사용자 "캐릭터 크기 좀 키우자 · 검 들고있는것도 어색해" — 몸 그림 1.3배(`cut-wyvern-char.py SCALE`), 손 자리는 전용 표 `wyvernArt.js WY_HAND`(칼끝을 앞 아래로 늘어뜨림), 날개 · 비늘 방벽은 몸 높이에 맞춰 커지고(`BODY_H`), 체력 줄은 머리 위로 올렸다(rpgArt `tallK`). 와이번 몸(`wy_wyvern` 날기 · `wy_sit` 앉기)은 11월 18일 사용자 자세 참고 그림 3장(날개 위 · 아래로 친 옆모습 · 날개 접고 앉음)을 따라 `design/effects/wyvern/pose.py` 가 뼈대(머리 · 목 · 몸통 · 꼬리 · 다리 · 날개 손가락)로 그린다. 참고 그림은 자세만 보고 베끼지 않는다. 색은 사용자 와이번 그림(`wyvern-ref.jpg`)의 녹슨 붉은 갈색. 같은 날 사용자 "앉아있는 자세 다시 · 얼굴 와이번처럼"(참고 그림 둘) — 지상 대기(앉기)는 사용자 기획(2번 사진 좌우 반전 윤곽)대로 목을 어깨에서 오른쪽 앞으로 길게 뻗고 머리는 어깨보다 조금 높게 · 뿔은 뒤로 눕힘(`head lay`), 가슴 · 배를 땅 가까이 · 꼬리는 왼쪽으로 길게 눕혀 가늘게, 앞발 없이 접은 날개(`folded_wing`: 날개팔이 팔꿈치로 솟았다 손목이 가슴 앞 땅을 짚고 손가락뼈가 몸 옆을 덮으며 뒤로 휨, 뼈 짙게 · 막 밝게), 머리는 사용자 참고 그림(울부짖는 용 얼굴)대로 매부리 갈고리 주둥이 · 크게 벌어지는 아래턱과 턱 끝 갈고리 · 위아래 송곳니 줄 · 머리 위 · 뒤 가시 갈기(`pose.py head`, 크기 `HEAD_K` 0.8 — 사용자 "머리가 너무 커 비율 생각하면서"). 11월 18일 사용자 얼굴 기획(앉기 · 날기 모두) — 머리는 `pose.py head_rest` 하나를 대기 · 날기가 함께 쓴다(2번 사진 좌우 반전 옆얼굴: 길고 낮은 주둥이 · 코끝에서 윗턱 · 아래턱이 같은 높이로 맞물림 · 코끝 바로 뒤 콧구멍 · 코끝 쪽 얇고 눈 아래로 두꺼워지는 아래턱 · 턱관절까지 입선 · 턱관절 뒤 목 쪽 파임 · 뒤통수에서 목을 따라 긴 뿔 하나 · 짙은 눈썹뼈 아래 호박색 눈, `bare=True` 면 윤곽만). 날기 목 가시는 낮췄다(`spk` 0.45). 같은 날 사용자가 직접 그린 머리(`design/wyvern-job/ref/head-user.png`)로 바꿨다 — `design/effects/wyvern/head_prep.py` 가 바둑판 바탕을 지우고 초록을 갈색으로 옮겨 돌리고 줄인 `head.png` 를 `head_rest` 가 그대로 붙인다(`HEAD_SPRITE`, 없으면 코드 머리). 각도 `ROT` · 크기 `SCALE` · 목 · 입 · 눈 자리는 head_prep.py 위쪽 상수. 아래턱은 떼어(`JAW` · `HINGE`) 날갯짓 · 숨쉬기 칸은 다문 입(`head-shut.png`, `JAW_SHUT` 30°), 불 뿜기 칸만 벌린 입. 입 불빛은 얼굴 뒤(빈 칸에만, make.py `pose_sheet`). 몸 크기는 `pose.py BK`(11월 18일 사용자 "용 크기를 좀 키워줘" 1 → 1.3 · "머리가 캐릭터 위에 있을 정도" 2.0, 뜬 높이 `WY_CONTRACT.hz` 74 → 110) — 좌표는 그대로 두고 그릴 때 곱해 시트 크기 · 기준점 · 입 · 눈 자리가 함께 커진다. 날갯짓 때 머리 오르내림은 `hl` 로 줄여 눈이 칸마다 1px 안에서만 움직인다. 옛 `head` 는 쓰지 않는다. 여러 참고 그림을 섞어 날개에 핏줄 · 해진 가장자리, 지느러미가 줄지어 난 긴 꼬리(`fin_tail`), 날 때 먼 날개가 머리 쪽으로 펼쳐진다. 작은 눈빛은 32색으로 묶을 때 사라져 make.py 가 다시 찍는다(`im.eye`). 입 자리는 시트 `mouth` = `WY_CONTRACT.mouth` · `sit.mouth`. 멈추면 앉는다(`WY_CONTRACT.sit`). 11월 18일 연출 전면 개편 — 굵은 참격(`slash_arc`) · 별빛 타격 · 비늘 방벽 · 어깨 사이 날개(1배, `top + hh × 0.36`, 아래 11월 18일 해방 날개로 바뀜) · 불꼬리 · 충격파 · 솟는 불길(`wy_trail` `wy_wave` `wy_flare`). 내가 정한 해석은 `docs/작업-상세-기록.md` 끝.
- **역린 해방 날개 · 꼬리(11월 18일 사용자)**: 해방 전에는 날개 · 꼬리가 없고 해방 중(`v.aw > 0`)에만 붙는다(연마 합계로 보이던 평소 보라 날개는 뺐다). 사용자 그림 `design/wyvern-job/ref/awake-wings-tail.png` 를 make.py `awake_parts` 가 뿌리(날개 관절 · 꼬리 밑동)를 축으로 도트로 옮긴 `wy_hwing`(줄 0 왼쪽 · 1 오른쪽, 0~2 펼침 · 3~6 날갯짓) · `wy_htail`(0~1 자람 · 2~5 흔들림). 그리기 `wyvernArt.js drawAwakeBack` — 처음 0.45초 펼침, 옆 배치는 `side` 그림일 때만(왼쪽을 보다 아래로 돌린 `turn` 은 앞 그림이라 앞 배치 — 11월 18일 사용자 신고), 앞 · 옆은 몸 뒤 · 뒤를 볼 때 몸 앞, 연마 합계 `tint.wing` 이상이면 날개 잔상. 옛 `wy_awake` 시트는 더 쓰지 않는다. **와이번이 곁에 있어야 쓴다**(11월 18일 사용자 — 없으면 「와이번을 먼저 소환해야 합니다」, 급강하 동행 중도 거절). 쓰면 와이번을 몸에 흡수해 계약이 끝나고(조련 연마 · 계약 대기 15초는 흡수 때부터), 해방 중엔 다시 소환할 수 없다. 연출 `sk_wy_awake` 가 와이번 자리(`wx` `wy` `hz` `fl`)를 받아 `WY_AWAKE.absorb` 0.8초 흡수(`absorbFx`, 작아지며 빨려 듦 · 보라 잔상 · 모이는 불씨) → 원래 변신 → 날개 · 꼬리는 흡수 뒤 `wing` 0.45초에 돋는다(어깨 · 허리 비늘 조각). 효과 · 지속은 누른 때부터.
### 히든 직업 Illusionist 005 마술사 (11월 17일, 격자 연습장에만)
- 사용자 기획 「히든직업 002~006 통합기획안」 4장. 획득 방법 · 실제 게임 연결 · 관리자 명령어 · 패치노트 없음(`ILLUSION.live = false`, `illusionOn` 은 맵 `sandbox` 에서만). 저장 · 스냅샷 · `HIDDEN_JOBS` 에도 아직 잇지 않았다.
- 수치 `illusionData.js` · 규칙 `illusionJob.js`(엔진 `rpg.js illusionEngine`, 입력 `hidden {op:"use", s}`) · 그림 `illusionArt.js` · 시트 규격 `illusionPxData.js` · 연습장 칸 `Sandbox.jsx IllusionBar` · 스킬 설명 `hiddenSkillInfo.js illusion()` · 시험 `tools/illusion.test.mjs`. 전투 상태 `h.il`(스냅샷 없음).
- 트릭 최대 5 · 트릭 3 소모 강화 · 잔상 · 연계는 `IL_TRICK`. 스킬 8개 수치는 `IL_CARD` ~ `IL_FINAL` 한 곳. 키는 기존 행동 키를 빌린다(`IL_SLOTS`). 무기를 들지 않는다.
- 이펙트는 pixelfx 없이 `design/effects/illusionist/make.py` 가 직접 그린 도트 시트 14장(`hidden-jobs/illusionist/px/il_*.webp`). 고치면 make.py → `manifest.json` 값을 `illusionPxData.js` 로(시험이 본다). 입자 상한 `IL_BITS`(연출 64 · 프레임 380). 여성 외형은 11월 23일 사용자 그림(`design/illusion-job/char/`)을 `tools/cut-illusion-char.py` 로 자른 `characters/rpg/illusion-f/`(`advArtPath` 의 `illusionLook` + 여성, 걷기 4장 · 키는 도박꾼과 같은 1.25배, 머리카락 사이 갇힌 흰 틈도 지운다). 남성은 아직 기본 그림. 정한 해석은 `docs/작업-상세-기록.md` 끝.
- 연습장 M 키: 키 행동 「스킬 설명」(기본 M)이 생긴 뒤로 연습장에서 M 이 안 열리던 것을 고쳤다(모든 히든 직업).

- **획득 루트 「존재하지 않았던 공연」(11월 23일, 테스트 서버 전용)**: 사용자 상세기획서 v2.0. 수치 · 자리 · 대사 `illusionQuestData.js` · 판정 `illusionQuest.js`(입력 kind `iq`, 엔진 `eqEngine`) · 그림 `illusionQuestArt.js` · 창 `IllusionQuestPanel.jsx`(`.eq-panel.nq-panel` 틀) · 시험 `tools/illusion-quest.test.mjs`. `IQ_ROUTE.live = false` — `g.test` 에서만 `h.ilt`, 스냅샷 영웅 줄 64(63 은 빈 자리). 진행 `bag.iu`(깃발 차례 뒤에만). 마을 · 광장에 새 물건 없이 원래 벤치 · 인물에 단추만 겹친다. 전용 맵 11곳 `iq_*`(`MAP_IDS` 끝, 바닥 Codex `story/ground/iq_*.webp`), 문 · 구조물은 열림 · 닫힘 낱장 `rpg/illusion-quest/doors.webp`. 시험은 빌린 기술을 `tr` 안에서만 흉내 내고, 계승은 아직 `claimed` 깃발만(직업이 연습장 전용). 테스트 도구 「마술사」 단추로 장마다 바로 간다. 정한 해석은 상세 기록 끝.

### 격자 연습장 `?sandbox` (11월 16일)
- 주소 `four-lane.vercel.app/?sandbox`(`main.jsx` 가 `Sandbox.jsx` 를 따로 불러온다). 게임에 넣기 전 캐릭터(직업 · 성별 · 원소 · 전직 · 숙련 단계 · BLOOD-001 직업 레벨 · 연마 · 레벨 · 스탯 · 무기(미공개 hold 포함) · 스킬 칸)를 골라 격자 바닥에서 움직이고 스킬을 써 본다.
- 직업 체험(`JobTrial.jsx`)처럼 이 기기에서만 도는 세계다. 서버 · 장부 · 기기 캐릭터 기록과 이어지지 않고 아무것도 저장하지 않는다. `g.test` 로 훈련장 기능(무적 · 쿨타임 끄기 · 스택 가득 · 초당 피해)을 쓰고, 월드보스는 나오지 않게 막았다.
- **스킬 설명 창(11월 17일 사용자 "m키를 누르면 스킬들 상세설명")**: 히든 직업(도박꾼 · 엔지니어 · 네크로맨서)일 때 M 키 또는 도구 줄 「스킬 설명」 단추로 연다(`SkillInfoPanel.jsx`, `.ncw` 틀 + `.skw-*`, 색은 직업마다 `.skw-<직업 id>` — 도박꾼 금빛 · 엔지니어 청록 · 네크로맨서 보라). M 이 다른 행동에 묶여 있으면 그 행동이 먼저. 내용은 `game/hiddenSkillInfo.js` 가 각 데이터 상수에서 만든다 — 수치를 바꾸면 설명도 따라간다. 새 히든 직업은 `MAKERS` 에 더한다. 연습장에서만, 패치노트에 적지 않는다.
- **실제 게임 스킬 설명 창(11월 17일 사용자 "실제 게임에 스킬 상세설명 적용해줘")**: 같은 `SkillInfoPanel.jsx` 를 RpgView 가 띄운다. 키 행동 `skills`(기본 M, 키 설정 「창」 묶음 — 이미 M 을 다른 행동에 쓴 사람은 빈 칸) · 레벨 칸 「스킬 설명」 단추(휴대폰). 입력 칸에서는 열리지 않는다. 내용은 `game/gameSkillInfo.js` — 일반 직업 · 1차 전직 · 배운 스킬(칸 · 패시브) · 무기 스킬 · BLOOD-001 · Gambler 002. 엔지니어 · 네크로맨서도 `hiddenSkillInfo` 로 나온다(11월 22일 네크로맨서 추가 — 마술사 · 와이번은 연습장 전용). 큰 기술 수치는 `rpg.js BIG_SKILL` 한 곳. 색 `.skw-warrior` · `-mage` · `-archer` · `-blood`. 시험 `tools/skill-info.test.mjs`.
- **자동 평타 · 키 설정(11월 18일 사용자)**: 도구 줄 「자동 평타 켬/끔」(`rpgAuto`, 이 기기 `flg:sbAuto`, 처음부터 · 설정을 바꿔도 잇는다) · 「키 설정」(`SandboxKeys.jsx`, 실제 게임 창 틀 · `keyScope.js keyLayout` 에 `who.sandbox` · `who.hidden` 을 넘겨 고른 직업 행동만, 물약 · 창 키는 뺀다). 연습장 키는 `keys.js SANDBOX_KEYS`(`flg:sbKeys`)에 따로 저장하고 처음엔 게임 키에서 시작한다 — 게임 키는 바뀌지 않는다. 패치노트에 적지 않는다.
- 맵 `sandbox` 는 `MAPS` 에만 있고 **`MAP_IDS` 에는 넣지 않는다**(스냅샷 · 서버로 갈 일이 없다). `grid` 면 `rpgArt.js drawGridFloor` 가 바닥을 칸으로 그린다. 한 칸 = 게임 거리 50, 세로는 `RPG.squash` 만큼 눌러 그린다. 허수아비 배치 · 색은 `sandboxData.js`, 다시 세우기는 `rpg.js sandboxDummies`. 시험 `tools/sandbox.test.mjs`.

### 마지막 진혼곡 — 크림슨 레퀴엠 전용 획득 (11월 17일)
- BLOOD-001 활성·캐릭터100·직업100·영구 압축20 이상이 도서관 2층 「붉은 강이 거꾸로 흐른 밤」 마지막 쪽을 읽고 덮으면 시작. **이번 변경은 사용자 지시로 패치노트·공지·패치노트 책에 올리지 않는다.**
- `requiemData.js` 수치·저장 정리, `requiem.js` 서버 판정, `requiemArt.js` 도트 자산 재생, `RequiemHud.jsx` 안내·보상. 자세한 진행·검증은 `docs/마지막-진혼곡.md`.
- `bag.rq={started,clue,a,b,c,killed,rewarded}`. 사슬 c는 비트3개. 퀘스트는 기존 `bag.bu` 각성 시험과 별개. `MAP_IDS` 끝에 `requiem-0`~`requiem-15`, 영웅 스냅샷 끝 59, 몹 줄 끝20에 전용 상태를 추가했다. 접속자 슬롯과 소유자 둘 다 검증.
- RQ-0 체력60만·방패36,000. 공격240/320/420, 2페이즈 혈량30 강탈. 무기 공격 성능·혈량 스킬 수치는 그대로. 크림슨 레퀴엠은 BLOOD-001만 장착, 초기화 시 해제, 거래·장터·NPC 판매 금지, 강화 허용.
- 클라이언트 저장·계정 생성·게스트 기록으로 퀘스트/레퀴엠을 추가할 수 없다(`protectRq`). 처치 후5.5초 연출→무기와 완료 기록을 함께 변경→기존 서버 저장. 가방 부족은 보류, 유리관 재조사로 수령.
