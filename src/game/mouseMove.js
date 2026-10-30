/* 마우스 오른쪽 클릭 이동의 화면 쪽 도구 — 규칙(목적지로 걷기)은 rpg.js 의 rpgMove · rpgWalk 에 있고,
   여기는 클릭한 곳을 땅 좌표로 바꾸고 NPC · 포탈을 고르고 다가설 자리를 정하는 일만 한다. 서버 · 방장 판정과는 상관없다 */
import { MAPS, RPG } from "./rpg.js";
import { WORLD_BOSS } from "./worldBossData.js";
import { W, H } from "./world.js";

export const MV_UI = {
  gap: 100,        // 누른 채 끌 때 이만큼(ms)에 한 번만 보낸다 — 메시지를 아낀다
  min: 20,         // 마지막으로 보낸 점에서 이만큼(px) 넘게 움직여야 다시 보낸다
  talkWait: 12000, // NPC 앞으로 가는 길이 이만큼(ms) 넘게 걸리면 대화를 포기한다
  stopGap: 10,     // NPC 곁에 설 때 말을 걸 수 있는 거리(RPG.talkR 등)보다 이만큼(px) 안쪽에 선다
  body: 8,         // 막힌 곳(노점 · 문) 곁에 설 때 몸 반지름(20) 밖으로 더 두는 여유(px)
  near: 44,        // 막힌 곳이 없는 NPC 곁에 서는 거리(px)
  hit: { w: 56, up: 110, down: 26 },         // 일반 NPC 를 누른 것으로 보는 상자 — NPC 자리 기준 좌우 · 위 · 아래(px)
  hitBig: { w: 80, up: 150, down: 30 },      // 노점 · 문처럼 큰 그림
};

// 화면(캔버스 안 비율)의 점을 땅 좌표로 — 그리기와 같은 카메라(반올림)를 쓴다
export function canvasToWorld(clientX, clientY, rect, cam) {
  if (!rect || !rect.width || !rect.height || !cam) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * W + Math.round(cam.x),
    y: ((clientY - rect.top) / rect.height) * H + Math.round(cam.y),
  };
}

// 월드보스 포탈 — 왼쪽 클릭이 쓰는 상자와 같다(RpgView 캔버스 onClick)
export const portalHit = (x, y) =>
  Math.abs(x - WORLD_BOSS.portal.x) < 90 && y < WORLD_BOSS.portal.y + 30 && y > WORLD_BOSS.portal.y - 230;

// 누른 곳에 있는 NPC · 포탈 — 여럿이면 NPC 자리에 가장 가까운 것
export function pickNpc(mapId, x, y) {
  const M = MAPS[mapId];
  if (!M) return null;
  let best = null, bestD = Infinity;
  for (const n of M.npcs) {
    const box = n.worldBoss ? null : (n.shop || n.deep || n.guildDoor || n.guild || n.guildRaidDoor || n.dungeon) ? MV_UI.hitBig : MV_UI.hit;
    const inside = n.worldBoss
      ? mapId === "plaza" && portalHit(x, y)
      : Math.abs(x - n.x) <= box.w && y >= n.y - box.up && y <= n.y + box.down;
    if (!inside) continue;
    const d = Math.hypot(x - n.x, y - n.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

// 말을 걸 수 있는 거리(rpg.js npcNear · worldBossPortalNear 와 같다)
export const talkReach = (npc) => (npc.worldBoss ? WORLD_BOSS.portal.reach : RPG.talkR);

// NPC 곁에 설 자리 — 지금 내 쪽에서 다가가는 길 위의 한 점. 노점 · 문은 몸이 못 들어가는 둘레(블록) 바로 밖에 선다
export function npcStopPoint(h, npc) {
  const M = MAPS[h.map], sq = RPG.squash;
  const blk = M.blocks.find((b) => Math.hypot(b.x - npc.x, (b.y - npc.y) / sq) < 14);   // 그 NPC 의 막힌 곳(노점 · 문 · 포탈)
  const need = blk ? blk.r + 20 + MV_UI.body : MV_UI.near;
  const s = Math.min(talkReach(npc) - MV_UI.stopGap, need);
  let dx = h.x - npc.x, dy = (h.y - npc.y) / sq, d = Math.hypot(dx, dy);
  if (d < 1) { dx = 0; dy = 1; d = 1; }              // 같은 자리면 아래쪽에 선다
  return { x: npc.x + (dx / d) * s, y: npc.y + (dy / d) * s * sq };
}
