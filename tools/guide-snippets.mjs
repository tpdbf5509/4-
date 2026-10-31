/* 관리 화면 코드 가이드의 실제 코드 줄 — codeGuideData.js 의 GUIDE_AT 가 가리키는 줄을 읽어 src/game/codeGuideSnippets.json 으로 쓴다.
   빌드 앞(prebuild)에 돌고, 못 찾은 항목은 경고만 하고 빈 칸으로 둔다(빌드를 막지 않는다). 실행: node tools/guide-snippets.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import { GUIDE, GUIDE_AT } from "../src/game/codeGuideData.js";

const out = {};
const cache = {};
const lines = (f) => cache[f] || (cache[f] = readFileSync(new URL(`../${f}`, import.meta.url), "utf8").split("\n"));
for (const e of GUIDE) {
  const blocks = [];
  for (const [find, n, file] of GUIDE_AT[e.title] || []) {
    const f = file || e.file, all = lines(f), i = all.findIndex((l) => l.includes(find));
    if (i < 0) { console.warn(`[guide] 못 찾음: ${e.title} — ${f} 의 "${find}"`); continue; }
    blocks.push({ file: f, from: i + 1, code: all.slice(i, i + n).map((l) => l.replace(/\s+$/, "")) });
  }
  if (blocks.length) out[e.title] = blocks;
}
writeFileSync(new URL("../src/game/codeGuideSnippets.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`[guide] 코드 줄 ${Object.keys(out).length}/${GUIDE.length}개`);
