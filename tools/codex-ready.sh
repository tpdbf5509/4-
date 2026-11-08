#!/bin/bash
# Codex 그림 생성 준비 점검 — 새 세션(새 컨테이너)에서는 Codex 로그인이 비어 있다. 그림 만들기 전에 한 번 돌린다.
#   bash tools/codex-ready.sh        # 준비되면 0, 아니면 1 과 할 일을 적는다
echo "== Codex 준비 점검 =="
if ! command -v codex >/dev/null 2>&1; then
  echo "✗ codex 명령이 없다 → npm install -g @openai/codex"; exit 1
fi
echo "✓ $(codex --version 2>&1 | head -1)"
st=$(codex login status 2>&1)
if echo "$st" | grep -q "^Logged in"; then
  echo "✓ $(echo "$st" | grep "^Logged in" | head -1)"; echo "준비됨 — codex-image 스킬 순서대로 진행한다."; exit 0
fi
echo "✗ Codex 에 로그인이 되어 있지 않다(새 컨테이너는 ~/.codex/auth.json 이 비어 있다. 그림 요청이 401 Unauthorized 로 끝난다)."
code=$(curl -s -o /dev/null -m 8 -w "%{http_code}" https://auth.openai.com/ 2>/dev/null)
if [ "$code" = "000" ] || [ -z "$code" ]; then
  echo "✗ auth.openai.com 에 닿지 않는다 → 환경의 네트워크 허용 목록에 auth.openai.com · chatgpt.com · api.openai.com 을 더해야 한다(update_environment)."
else
  echo "✓ auth.openai.com 응답 $code"
fi
echo
echo "할 일: 백그라운드로 'codex login --device-auth' 를 실행해 나오는 주소와 코드를 사용자에게 알린다."
echo "      사용자가 그 주소에서 코드를 넣고 ChatGPT 계정으로 승인하면 로그인된다. 다시 이 점검을 돌려 확인한다."
exit 1
