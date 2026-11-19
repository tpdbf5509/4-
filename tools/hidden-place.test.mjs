import test from "node:test";
import assert from "node:assert/strict";
import { hiddenPlace, shownMapName } from "../src/game/hiddenPlace.js";
import { MAPS } from "../src/game/rpg.js";

test("히든 장소는 일반 사냥터 이름으로 바뀌고 일정 시간 같다", () => {
  for (const id of ["eng-cellar", "eng-tunnel", "eng-trial", "bloodlab", "requiem-3", "casino"]) {
    assert.ok(hiddenPlace(id), id);
    const n = shownMapName(id, 2, 1e12);
    assert.ok(/사냥터/.test(n) && !/지하|연구|통로|카지노|격리/.test(n), n);
    assert.equal(n, shownMapName(id, 2, 1e12 + 30000));
  }
  assert.equal(shownMapName("plaza", 0), MAPS.plaza.name);
  assert.equal(shownMapName("dawnwood", 0), MAPS.dawnwood.name);
  assert.equal(shownMapName("wolf", 0), MAPS.wolf.name);
});
