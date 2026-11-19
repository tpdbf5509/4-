// 장소별 캐릭터 크기 · 카메라 당김(bodyScale.js) — 화면 → 땅 좌표가 그리기와 같은 배율을 쓰는지
import test from "node:test";
import assert from "node:assert/strict";
import { heroScale, camZoom, mapSpeed } from "../src/game/bodyScale.js";
import { canvasToWorld } from "../src/game/mouseMove.js";
import { pointerSkillPt } from "../src/game/skillAim.js";
import { W, H } from "../src/game/world.js";

test("실내 · 이야기 맵만 키우고 사냥터는 그대로", () => {
  assert.ok(heroScale({ eq: 1, story: 1, w: 2400, h: 1600 }) > 1);
  assert.equal(heroScale({ village: 1 }), 1);
  assert.equal(heroScale({ story: 1 }), 1);
  assert.ok(mapSpeed({ library: 1, story: 1 }) > 1);
  assert.ok(mapSpeed({ eq: 1, id: "eng-lab" }) > 1);
  assert.ok(heroScale({ eq: 1, id: "eng-lab", w: 2400, h: 1600 }) < heroScale({ eq: 1, id: "eng-oak", w: 2400, h: 1600 }));
  assert.equal(mapSpeed({ village: 1 }), 1);
  assert.equal(heroScale({ id: "plaza" }), 1);
  assert.equal(camZoom({ id: "field" }), 1);
  assert.ok(camZoom({ library: 1, w: 2400, h: 1600 }) < 1);
  assert.ok(camZoom({ eq: 1, w: 2400, h: 1600 }) * 1600 <= H);   // 방 전체가 한 화면에
});
test("카메라를 당긴 맵에서 화면 오른쪽 아래 끝은 W/z · H/z 만큼 떨어진 땅", () => {
  const cam = { x: 100, y: 50, z: 0.8 }, rect = { left: 0, top: 0, width: W, height: H };
  assert.deepEqual(canvasToWorld(W, H, rect, cam), { x: 100 + W / 0.8, y: 50 + H / 0.8 });
  const h = { map: "a" };
  assert.deepEqual(pointerSkillPt(h, cam, { map: "a", x: 80, y: 40 }), [200, 100]);
});
test("건물 안 10배로 걸어도 가구 막힘을 건너뛰지 않는다", async () => {
  const R = await import("../src/game/rpg.js");
  const M = R.MAPS["erden-library"];
  const b = M.blocks.find((q) => q.r >= 70);
  const g = R.makeWorld(); g.mySeat = 0;
  R.rpgSyncSeats(g, Array.from({ length: R.RPG_CREW_MAX }, (_, i) => (i ? null : { id: "x", name: "시험", hero: { name: "시험", job: "warrior", elem: "fire", gender: "f" } })));
  R.rpgJoin(g, 0, { name: "시험", ts: 1, lv: 10, gift: 0, rs: 0, bag: { oc: 1, n: 2, w: [], e: 0, s: {} } }, "sandbox");
  const h = g.heroes[0]; h.map = M.id; h.x = b.x - b.r - 40; h.y = b.y;
  h.hold = ["right"];
  const x0 = h.x;
  for (let i = 0; i < 6; i++) R.rpgWalk(h, 1 / 10);   // 한 틱 250px — 가구 지름(140)보다 길다
  assert.ok(h.x > x0, "걷지 못했다");
  assert.ok(h.x < b.x, `막힘 ${b.x} 를 건너뜀: ${h.x}`);
  h.x = 300; h.y = M.h - 200; h.hold = ["right"]; R.rpgWalk(h, 1 / 10);
  assert.ok(Math.abs(h.x - 300 - R.RPG.spd * 10 / 10) < 1, "10배로 걷는다");
});
