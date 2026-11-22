// 이야기 컷신 — 대사에 건 컷신이 모두 있고, 그림 파일이 있고, 장면 시각 계산이 맞는지 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {CUTSCENES, cutLength, shotAt, cutImages} from '../src/game/cutsceneData.js';
import {STORY_STEPS} from '../src/game/storyQuestData.js';

const lines = (x) => (Array.isArray(x) ? x.flatMap(lines) : x && typeof x === 'object' ? [x, ...(x.pick || []).flatMap((p) => lines(p.then || []))] : []);

test('대사에 건 컷신은 모두 정의돼 있고 장면 설명이 있다', () => {
  const used = STORY_STEPS.flatMap((s) => lines([s.scene || [], ...Object.values(s.scenes || {})])).filter((l) => l.cut);
  assert.ok(used.length >= 2);
  for (const l of used) { assert.ok(CUTSCENES[l.cut], l.cut); assert.ok(l.t, `${l.cut} 기록 문장`); }
});

test('컷신 그림 파일이 있다', () => {
  for (const id of Object.keys(CUTSCENES)) for (const src of cutImages(id)) assert.ok(existsSync(`public${src}`), src);
});

test('장면 시각 계산', () => {
  const id = 'c1-wagon', all = cutLength(id), first = CUTSCENES[id][0].ms;
  assert.equal(shotAt(id, 0).i, 0);
  assert.equal(shotAt(id, first).i, 1);
  assert.equal(shotAt(id, all), null);
  for (const s of Object.values(CUTSCENES).flat()) { assert.ok(s.ms > 0 && s.cam.length === 2); }
});
