// 장소별 캐릭터 크기 · 카메라 당김(bodyScale.js) — 화면 → 땅 좌표가 그리기와 같은 배율을 쓰는지
import test from "node:test";
import assert from "node:assert/strict";
import { heroScale, camZoom } from "../src/game/bodyScale.js";
import { canvasToWorld } from "../src/game/mouseMove.js";
import { pointerSkillPt } from "../src/game/skillAim.js";
import { W, H } from "../src/game/world.js";

test("실내 · 이야기 맵만 키우고 사냥터는 그대로", () => {
  assert.ok(heroScale({ eq: 1, story: 1 }) > heroScale({ village: 1 }));
  assert.equal(heroScale({ id: "plaza" }), 1);
  assert.equal(camZoom({ id: "field" }), 1);
  assert.ok(camZoom({ library: 1 }) < 1);
});
test("카메라를 당긴 맵에서 화면 오른쪽 아래 끝은 W/z · H/z 만큼 떨어진 땅", () => {
  const cam = { x: 100, y: 50, z: 0.8 }, rect = { left: 0, top: 0, width: W, height: H };
  assert.deepEqual(canvasToWorld(W, H, rect, cam), { x: 100 + W / 0.8, y: 50 + H / 0.8 });
  const h = { map: "a" };
  assert.deepEqual(pointerSkillPt(h, cam, { map: "a", x: 80, y: 40 }), [200, 100]);
});
