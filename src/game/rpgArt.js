import {drawPowerCircles} from './combatRulesArt.js';
import {drawGuildStatue,drawGuildBoss,drawGuildGround,warmGuildArt,guildBossTop,drawGuildDoor,drawGuildRaidDoor,drawArchDoor} from './guildArt.js';
import { DEEP, DEEP_MAPS, DEEP_DOOR_ART } from './deepData.js';
import { MARKET } from "./marketData.js";
import {warmWorldBossArt,drawWorldBossSprite,drawWorldBossGround,drawWorldBossPortal} from "./worldBossArt.js";
import { warmDragonFlightArt } from "./dragonFlightArt.js";
import { warmFuryArt } from "./furyArt.js";
import { drawStormScreenFlash } from './stormWeaponArt.js';
import { ADV_BY_ID } from "./advData.js";
import { warmAdvArt, drawAdvGiant, drawAdvHero, drawAdvHeldItem, drawAdvShield, drawAdvMob, drawAdvNpc } from "./advArt.js";
import { WORLD_EQUIPMENT, WORLD_WEAPON_SKILLS, worldArtCell } from "./worldEquipmentData.js";
import { warmAbyssArt, drawAbyssGate, drawGuardian } from "./abyssArt.js";
import { GUARD_IDS } from "./abyssData.js";
/* RPG 모드 그리기 — 광장과 사냥터, 영웅, 토끼, 사냥꾼, 문.
   맵은 화면보다 넓다. 내 영웅을 따라 화면(카메라)이 움직인다. */
import { W, H } from "./world.js";
import {
  roundRect, shadow, mulberry32, drawRock, drawBush,
  drawFx, drawBanner, fxWarmUp, FX_ART, mapImg, mapImgFailed,
  sprite, drawSprite, ANIM_T, SR, CR, DR, drawTreeArt, drawTree,
} from "./art.js";
import { RPG, MAPS, QUEST, MOB, SPAWNS, mobSize, dist, heroRange, elemOf, heroArtPath, advArtPath, mobName, titleName, heldSpecial, whyReqDone, fieldPvpMap } from "./rpg.js";
import { REQ_BY_NPC, REQUESTS } from "./requestData.js";
import { DG_LOOKS, DUNGEON } from "./dungeonData.js";
import { paintFieldLook, fieldTrails } from "./fieldArt.js";
import { FIELD_LOOKS, FIELD_TRAIL } from "./fieldLookData.js";
import { drawSkillFx, drawHeroSkill, drawCcMark, liftOf, GROUND_FX, setFxQuality } from "./skillArt.js";
import { SHOP_BY_ID, SPECIAL_BY_ID, specialArt } from "./shop.js";

/* 캐릭터 그림은 시트 배율 그대로 줄인다 — 방향마다 그림 크기가 달라도 키가 같게 보인다.
   원본 시트에서 캐릭터 키는 대략 280px 이고, 그림 아래에 6px 여백이 있다. */
const HERO_K = 66 / 280;
const HERO_PAD = 6;
const heroCache = {};
function heroImg(h, view) { return artImg(heroArtPath(h, view)); }
// 전직한 캐릭터는 전직 그림(무기를 든 그림)으로 — 못 불러오면 null, 원래 그림 길로 그린다
function advBody(h, view) { const src = advArtPath(h, view); return src ? artImg(src) : null; }
function artImg(src) {
  if (typeof Image === "undefined") return null;
  let im = heroCache[src];
  if (im === undefined) {
    im = heroCache[src] = new Image();
    im.onerror = () => { heroCache[src] = null; };
    im.src = src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
/* 전사가 장착한 특별 무기를 손에 든다 — 칼을 지운 그림(<보기>-bare.webp, tools/bare-warrior.py)에 무기 그림을 얹는다.
   WARRIOR_HAND: 성별 · 보기마다 손 [x, y]와 칼날 방향(도) — 원래 그림 크기 기준, bare-warrior.py 가 출력한 값.
   WEAPON_GRIP: 무기 그림(128px)의 손잡이 [x, y] → 칼끝 [x, y]. 손잡이를 손에 맞추고 칼끝을 칼날 방향으로 돌린다 */
const WARRIOR_HAND = {
  m: { front: [60, 213, 124], turn: [122, 201, 48], side: [72, 194, 134], back: [103, 188, 59] },
  f: { front: [94, 205, 123], turn: [71, 197, 133], side: [46, 197, 125], back: [95, 198, 62] },
};
// 쌍검의 반대 손. 몸 그림의 실제 장갑 위치에 맞추며 먼 손의 단검은 몸 뒤에서 그린다.
const DUAL_OFF_HAND = {
  m: { front: [139, 209, 55], turn: [40, 194, 125], side: [112, 181, 45], back: [30, 188, 125] },
  f: { front: [166, 198, 55], turn: [138, 187, 55], side: [92, 181, 45], back: [27, 190, 125] },
};
const DUAL_HELD = {
  src: '/assets/game/rpg/items/dragon-dual-held.webp',
  grips: [[64, 107, 64, 5], [64, 107, 64, 44]], lengths: [32, 22],
};
const AZURE_HELD = { src: '/assets/game/rpg/weapons/azure-dual-held.webp', grips: [[64,99,64,8],[64,99,64,8]], lengths: [33,33] };
const dualSpec = sp => sp?.dual ? AZURE_HELD : DUAL_HELD;
const WEAPON_GRIP = {
  // 생성 원화의 손잡이 → 끝. 활줄은 왼쪽에 놓인다.
  storm_staff: [63,98,64,12], violet_bow: [73,64,45,10], azure_dual: [64,99,64,8],
  dragon_dual: [26, 104, 109, 15], dragon_staff: [64, 100, 65, 16], dragon_bow: [66, 67, 60, 12],
  serpent_sword: [24, 108, 108, 20], serpent_staff: [62, 100, 62, 15], serpent_bow: [62, 64, 75, 14],
  machine_sword: [25, 105, 100, 20], machine_staff: [62, 100, 62, 15], machine_bow: [63, 64, 76, 14],
  clockwork: [28, 26, 122, 122], coral: [26, 102, 120, 4], flame: [97, 94, 4, 4], forest: [95, 104, 12, 6],
  frost: [100, 100, 6, 4], holy: [92, 94, 12, 10], shadow: [104, 108, 12, 6], star: [102, 102, 6, 6],
  thunder: [24, 100, 120, 6], viper: [36, 44, 122, 118],
  // 지팡이 — 손잡이 → 머리, 활 — 손잡이 → 위쪽 끝
  moon_staff: [64, 72, 63, 8], ice_staff: [55, 68, 112, 10], skull_staff: [70, 66, 12, 10], flame_staff: [52, 50, 104, 104],
  thunder_staff: [68, 78, 24, 34], galaxy_staff: [64, 78, 64, 10], holy_staff: [50, 68, 96, 20], fury_staff: [64, 80, 64, 18],
  thunder_bow: [56, 64, 10, 8], lava_bow: [71, 64, 23, 8], shadow_bow: [66, 56, 22, 10], star_bow: [66, 60, 16, 12], gold_bow: [71, 52, 12, 12],
};
// 활 그림에서 활줄이 놓인 쪽 — 손잡이 → 위쪽 끝을 보고 왼쪽(-1) · 오른쪽(1). 손에 든 쪽과 다르면 뒤집어 활줄이 몸 쪽을 향하게 한다
const BOW_STRING = { violet_bow: -1, thunder_bow: -1, lava_bow: 1, shadow_bow: 1, star_bow: -1, gold_bow: -1, dragon_bow: 1, serpent_bow: 1, machine_bow: 1 };
/* 마법사는 특별 지팡이, 궁수는 특별 활을 장착하면 원래 무기를 지운 그림(<보기>-bare.webp, tools/bare-holders.py)에 그 무기를 손에 들려 그린다.
   HOLDER_HAND: 직업 · 성별 · 보기마다 손 [x, y]와 무기 방향(도, 손 → 지팡이 머리 · 활 위쪽 끝)과 그 길이(px) — 원래 그림 크기 기준.
   무기가 몸에 가려 보이지 않는 보기(마법사 옆 · 뒤 등)는 원래 그림을 그대로 쓴다 */
const HOLDER = { mage: "staff", archer: "bow" };     // 직업 → 손에 드는 무기 종류
const ADV_HELD = { gun: "archer", grim: "mage" };    // 전직 무기 종류 → 드는 직업(shopData.js WEAPON_TYPES adv)
const HOLDER_HAND = {
  mage: {
    m: { front: [148, 200, -72, 76], turn: [40, 200, -92, 62] },
    f: { front: [152, 193, -69, 70], turn: [37, 186, -103, 59] },
  },
  archer: {
    // 다섯째 값 — 활줄이 놓여야 할 쪽(몸 쪽). 몸 오른쪽에 든 활은 -1, 왼쪽에 든 활은 1
    m: { front: [126, 196, -65, 84, -1], turn: [117, 194, -70, 79, -1] },
    f: { front: [150, 190, -72, 86, -1], turn: [26, 176, -102, 57, 1], side: [34, 160, -110, 69, 1], back: [22, 168, -99, 61, 1] },
  },
};
const HELD_LEN = 30;                                  // 손잡이 → 칼끝 길이(화면 px). 원래 칼은 약 22
const BASIC_LEN = 23;                                 // 특별 무기가 없을 때 코드로 그리는 기본 검 길이
// 검 휘두르기 — 공격하면 t 초 동안: 머리 위로 들어 올렸다가(0~up) 앞으로 내리치고(~hit) 제자리로(~1).
// 전사 평타는 친 순간 바로 맞고 베기 연출(slash)도 0.24초라, 거의 바로 올려 0.1초 안에 내리치고 0.24초에 끝낸다(평타 간격 0.55초보다 짧게).
// 각도는 오른쪽을 보는 모습 기준(도). 왼쪽을 보는 그림(turn · side)은 좌우로 뒤집어 쓴다
const SWING = { t: 0.24, up: 0.12, hit: 0.5, raise: 245, strike: 385 };
const HELD_TYPE = { dagger: 0.8, great: 1.15 };        // 단검은 짧게, 대검은 길게
const weaponCache = {};
function weaponImg(sp, part = 0) {
  if (typeof Image === "undefined") return null;
  const dual = sp.id === 'dragon_dual' || !!sp.dual;
  const src = dual ? dualSpec(sp).src : sp.world ? WORLD_EQUIPMENT.atlas : specialArt(sp);
  let im = weaponCache[src];
  if (im === undefined) {
    im = weaponCache[src] = new Image();
    im.onerror = () => { weaponCache[src] = null; };
    im.src = src;
  }
  if (!(im && im.complete && im.naturalWidth)) return null;
  if (!sp.world && !dual) return im;
  const cell = dual ? part : worldArtCell(specialArt(sp)), cacheKey = `world:${sp.id}:${part}`;
  if (!weaponCache[cacheKey]) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const columns = dual ? 2 : WORLD_EQUIPMENT.columns, rows = dual ? 1 : WORLD_EQUIPMENT.rows;
    const cw = im.naturalWidth / columns, ch = im.naturalHeight / rows;
    ctx.drawImage(im, (cell % columns) * cw, Math.floor(cell / columns) * ch, cw, ch, 0, 0, 128, 128);
    weaponCache[cacheKey] = c;
  }
  return weaponCache[cacheKey];
}
/* 전직 캐릭터가 특별 무기를 장착하면 — 무기를 지운 전직 그림(<보기>-bare.webp, tools/bare-adv.py)에 그 무기를 손에 들린다.
   ADV_HAND: 전직 · 성별 · 보기마다 빈 주먹 [x, y](지운 그림 크기 기준, bare-adv.py 가 찾은 자홍 점). 손이 몸에 가린 보기는 없다 — 전직 그림 그대로.
   무기 방향 · 길이는 기본 직업 손(WARRIOR_HAND · HOLDER_HAND)의 같은 보기 값, 없으면 ADV_HOLD */
const ADV_HAND = {
  gladiator: { m: { front: [30, 197], side: [72, 178], turn: [31, 180] }, f: { front: [60, 177], side: [68, 170], turn: [71, 171] } },
  knight: { m: { front: [23, 212], side: [36, 191], turn: [26, 194] }, f: { front: [53, 188], side: [29, 179], turn: [61, 189] } },
  marksman: { m: { front: [42, 200], side: [23, 188], turn: [35, 190] }, f: { front: [41, 184], side: [26, 176], turn: [73, 176] } },
  gunner: { m: { front: [168, 187], side: [47, 160], back: [29, 198], turn: [153, 173] }, f: { front: [188, 155], side: [34, 150], back: [46, 192], turn: [183, 149] } },
  archmage: { m: { front: [60, 172], side: [42, 162], turn: [50, 165] }, f: { front: [65, 165], side: [44, 166], turn: [56, 158] } },
  summoner: { m: { front: [42, 171], side: [18, 152], turn: [50, 159] }, f: { front: [44, 156], side: [19, 147], turn: [66, 155] } },
  healer: { m: { front: [165, 187], side: [26, 173], back: [139, 170], turn: [25, 171] }, f: { front: [175, 169], side: [21, 164], turn: [24, 165] } },
  assassin: { m: { front: [24, 205], side: [28, 189], back: [154, 187], turn: [32, 190] }, f: { front: [54, 190], side: [20, 180], turn: [51, 182] } },   // 10월 31일
  elf: { m: { front: [42, 204], side: [26, 188], turn: [37, 193] }, f: { front: [62, 186], side: [26, 174], turn: [181, 183] } },
};
// 검투사 쌍검의 반대 손 [x, y](지운 그림 크기 기준). 전직 그림은 반대 손이 몸에 가려 자홍 점이 없어, 몸 바깥쪽 허리 둘레에 맞춘다.
// 먼 손이라 몸 뒤에서 그리므로 칼날이 몸 밖으로 나오는 자리에 둔다. 방향은 주 손 반대쪽(좌우 대칭)
const ADV_OFF_HAND = {
  gladiator: { m: { front: [122, 190], side: [92, 172], turn: [104, 186] }, f: { front: [132, 186], side: [96, 168], turn: [126, 182] } },
};
const ADV_HOLD = { mage: { front: [-72, 74], turn: [-95, 60], side: [-100, 62], back: [-85, 62] }, archer: { front: [-68, 84], turn: [-86, 70], side: [-110, 69], back: [-99, 61] } };
const ADV_OWN = { gunner: "gun", summoner: "grim" };   // 전직 그림에 이미 든 전직 무기 — 이 무기면 그림 그대로
// 무기 방향을 몸 바깥쪽으로 — 기본 직업과 전직 그림은 무기를 든 손이 반대편일 수 있다(몸을 가로지르지 않게 좌우로 뒤집는다)
const outward = (deg, onLeft) => (Math.cos((deg * Math.PI) / 180) > 0 === onLeft ? 180 - deg : deg);
function advHeld(h, view) {
  const g = h.gender === "f" ? "f" : "m", xy = ADV_HAND[h.advClass]?.[g]?.[view];
  const sp = SPECIAL_BY_ID[heldSpecial(h)];
  if (!xy || !sp || ADV_OWN[h.advClass] === sp.t) return null;
  const body = artImg(advArtPath(h, `${view}-bare`));
  if (!body) return null;                           // 못 불러오면 전직 그림(그림 속 무기) 그대로
  const left = view === "turn" || view === "side" || view === "back";
  if (ADV_HELD[sp.t] === h.job) return { body, hand: xy, adv: sp.t, still: true, left };   // 총사가 아닌 궁수 전직의 총 · 소환술사가 아닌 마법사 전직의 소환서
  const grip = (sp.id === "dragon_dual" || sp.dual) ? dualSpec(sp).grips[0] : WEAPON_GRIP[sp.art];
  const wpn = grip && weaponImg(sp);
  if (!wpn) return null;
  if (HOLDER[h.job]) {
    if (sp.t !== HOLDER[h.job]) return null;
    const [ang0, len] = HOLDER_HAND[h.job][g][view]?.slice(2, 4) || ADV_HOLD[h.job][view];
    const onLeft = xy[0] < body.naturalWidth / 2, ang = outward(ang0, onLeft);
    const str = onLeft ? 1 : -1;                     // 몸 오른쪽에 든 활은 활줄이 왼쪽(몸 쪽)
    const mirror = !!BOW_STRING[sp.art] && str !== BOW_STRING[sp.art];
    return { body, hand: [xy[0], xy[1], ang, len, str], wpn, grip, len: len * HERO_K, still: true, mirror };
  }
  if (h.job !== "warrior") return null;
  const ang = outward(WARRIOR_HAND[g][view][2], xy[0] < body.naturalWidth / 2);   // 쌍검은 한 손 단검만(전직 그림에 반대 손 자리가 없다)
  const len = (sp.id === "dragon_dual" || sp.dual) ? dualSpec(sp).lengths[0] : HELD_LEN * (HELD_TYPE[sp.t] || 1);
  const held = { body, hand: [xy[0], xy[1], ang], wpn, grip, len, left: view === "turn" || view === "side" };
  const oxy = (sp.id === "dragon_dual" || sp.dual) && ADV_OFF_HAND[h.advClass]?.[g]?.[view];
  if (oxy) {                                         // 쌍검 — 반대 손에도 단검 한 자루
    const oang = 180 - ang;
    held.off = { hand: [oxy[0], oxy[1], oang], wpn: weaponImg(sp, 1), grip: dualSpec(sp).grips[1], len: dualSpec(sp).lengths[1], left: Math.cos((oang * Math.PI) / 180) < 0 };
  }
  return held;
}
// 전사가 손에 든 검 — 칼 지운 몸 그림이 있으면 늘 이 길로 그린다(휘두를 수 있게).
// 특별 무기를 장착했고 그 그림이 있으면 그 무기, 아니면 코드로 그린 기본 검
function heldWeapon(h, view) {
  if (HOLDER[h.job]) {
    const sp = SPECIAL_BY_ID[heldSpecial(h)];
    // 전직 무기 — 총사가 총을, 소환술사가 소환서를 들면 원래 무기를 지운 그림에 그것을 들린다(advArt.js). 지운 그림이 없는 보기는 원래 그림
    if (sp && ADV_HELD[sp.t] === h.job) {
      const hand = HOLDER_HAND[h.job][h.gender === "f" ? "f" : "m"][view];
      const body = hand && heroImg(h, `${view}-bare`);
      return body ? { body, hand, adv: sp.t, still: true, left: view === "turn" || view === "side" || view === "back" } : null;
    }
    const hand = sp && sp.t === HOLDER[h.job] && HOLDER_HAND[h.job][h.gender === "f" ? "f" : "m"][view];
    const grip = hand && WEAPON_GRIP[sp.art];
    const wpn = grip && weaponImg(sp);
    const body = wpn && heroImg(h, `${view}-bare`);
    if (!body) return null;                         // 그림이 없으면 원래 그림(원래 무기)을 그대로
    const mirror = !!hand[4] && !!BOW_STRING[sp.art] && hand[4] !== BOW_STRING[sp.art];
    return { body, hand, wpn, grip, len: hand[3] * HERO_K, still: true, mirror };
  }
  if (h.job !== "warrior") return null;
  const hand = WARRIOR_HAND[h.gender === "f" ? "f" : "m"][view];
  const body = hand && heroImg(h, `${view}-bare`);
  if (!body) return null;
  const sp = SPECIAL_BY_ID[heldSpecial(h)];
  if (sp?.id === 'dragon_dual' || sp?.dual) {
    for (const v of ['front','turn','side','back']) heroImg(h, `${v}-bare`);
    const offHand = DUAL_OFF_HAND[h.gender === 'f' ? 'f' : 'm'][view];
    return { body, hand, wpn: weaponImg(sp), grip: dualSpec(sp).grips[0], len: dualSpec(sp).lengths[0],
      left: view === 'turn' || view === 'side',
      off: { hand: offHand, wpn: weaponImg(sp, 1), grip: dualSpec(sp).grips[1], len: dualSpec(sp).lengths[1], left: offHand[2] > 90 } };
  }
  const grip = sp && WEAPON_GRIP[sp.art];
  const wpn = grip ? weaponImg(sp) : null;
  return { body, hand, wpn, grip, len: wpn ? HELD_LEN * (HELD_TYPE[sp.t] || 1) : BASIC_LEN,
    left: view === "turn" || view === "side" };
}
// 공격할 때 검 각도(도) — 휘두르는 중이 아니면 null
function swingAngle(h, held, time) {
  const cast = h.ws?.storm;
  if (cast?.id === "azure_dual" && (cast.phase === "charge" || cast.phase === "dash")) return { ang: held.left ? 235 : 305, trail: cast.phase === "dash" ? .7 : 0 };
  const a = h.anim;
  if (!a || held.still) return null;               // 지팡이 · 활은 휘두르지 않는다
  if (h.swing > 0 && !(a.sw > 0)) a.swAt = time;    // 새로 쳤다
  a.sw = h.swing;
  const p = a.swAt === undefined ? 1 : (time - a.swAt) / SWING.t;
  if (p < 0 || p >= 1) return null;
  const f = (d) => (held.left ? 180 - d : d);
  const rest = held.hand[2], up = f(SWING.raise), hit = f(SWING.strike);
  const back = held.left ? rest - 360 : rest + 360;
  const ease = (x) => 1 - (1 - x) * (1 - x);
  if (p < SWING.up) return { ang: rest + (up - rest) * ease(p / SWING.up), trail: 0 };
  if (p < SWING.hit) {
    const q = (p - SWING.up) / (SWING.hit - SWING.up);
    return { ang: up + (hit - up) * ease(q), from: up, trail: 1 - q * 0.4 };
  }
  const q = (p - SWING.hit) / (1 - SWING.hit);
  return { ang: hit + (back - hit) * q, from: up, to: hit, trail: (1 - q) * 0.6 };
}
// 코드로 그린 기본 검 — +x 쪽으로 뻗는다. 원래 그림의 칼처럼 옅은 회색 날 · 갈색 손잡이
function drawBasicSword(ctx, len) {
  ctx.lineJoin = "round";
  ctx.fillStyle = "#6b4a32"; ctx.strokeStyle = "rgba(34,24,18,0.9)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(-4, -1.3, 7, 2.6, 1); ctx.fill(); ctx.stroke();          // 손잡이
  ctx.beginPath(); ctx.roundRect(2.6, -3.6, 1.8, 7.2, 0.8); ctx.fill(); ctx.stroke();      // 날밑
  ctx.fillStyle = "#e8e4dc";
  ctx.beginPath();
  ctx.moveTo(4.4, -1.6); ctx.lineTo(len - 3.2, -1.6); ctx.lineTo(len, 0); ctx.lineTo(len - 3.2, 1.6); ctx.lineTo(4.4, 1.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(5.5, -0.5); ctx.lineTo(len - 4, -0.5); ctx.stroke();
}
function drawHeld(ctx, held, ww, top, sw, col) {
  const { wpn, grip, hand, len } = held;
  const deg = sw ? sw.ang : hand[2];
  ctx.save();
  ctx.translate(-ww / 2 + hand[0] * HERO_K, top + hand[1] * HERO_K);
  if (sw && sw.trail > 0 && sw.from !== undefined) {   // 휘두른 자리에 남는 빛 자국
    const a0 = (sw.from * Math.PI) / 180, a1 = ((sw.to ?? sw.ang) * Math.PI) / 180;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 * sw.trail;
    ctx.strokeStyle = col || "#fff1c8";
    ctx.lineCap = "round";
    [[len * 0.95, 4], [len * 0.7, 2.5]].forEach(([r, w]) => {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(0, 0, r, a0, a1, held.left); ctx.stroke();
    });
    ctx.restore();
  }
  ctx.rotate((deg * Math.PI) / 180);
  if (held.mirror) ctx.scale(1, -1);               // 무기 축을 따라 뒤집는다(활줄을 몸 쪽으로)
  if (wpn) {
    const [gx, gy, tx, ty] = grip;
    const k = len / Math.hypot(tx - gx, ty - gy);
    ctx.rotate(-Math.atan2(ty - gy, tx - gx));
    ctx.scale(k, k);
    ctx.drawImage(wpn, -gx, -gy);
  } else {
    drawBasicSword(ctx, len);
  }
  ctx.restore();
}

/* 보는 쪽에 맞는 그림 — 앞 그림은 오른쪽을, turn 은 왼쪽을 비스듬히 본다. 옆 그림은 왼쪽을 본다.
   flip 은 좌우로 뒤집어 그릴지 */
function heroView(h) {
  const c=h.ws?.world?.cast;
  const dual = WORLD_WEAPON_SKILLS.dragon_dual.skill;
  if(c?.id==='dragon_dual' && c.t>=dual.delay && c.t<dual.delay+dual.gap*dual.surgeAt){
    // 회전 중 보는 방향만 바꾼다. 좌표와 피해는 받은 판정 그대로 쓴다.
    const phase=Math.floor((c.t-dual.delay)/(dual.gap/2))%4;
    return {view:['front','side','back','turn'][phase],flip:phase===1&&h.dir>0};
  }
  if (h.face === 2) return { view: "back", flip: false };
  if (h.face === 1) return { view: "side", flip: h.dir > 0 };
  return { view: h.dir < 0 ? "turn" : "front", flip: false };
}

/* ── 이미지 그림 ─────────────────────────────────────────────
   광장 · 사냥터 바탕과 분수 · 문 · 사냥꾼 · 토끼 같은 것들은 public/assets/game/rpg 의 그림 파일을 얹는다.
   못 불러오면 예전처럼 코드로 그린다. 크기 · 기준점은 public/assets/game/README.md 에 있다. */
const RPG_ART = "/assets/game/rpg";
export const rpgFile = (name) => `${RPG_ART}/${name}.webp`;
// 논리 좌표 기준 크기(w, h)와 기준점(ox, oy = 발밑 · 바닥 가운데)
export const RFRAME = {
  fountain: { w: 220, h: 185, ox: 110, oy: 95 },      // 기준점 = 분수 가운데(900, 620)
  lamp: { w: 64, h: 120, ox: 32, oy: 108 },
  bench: { w: 96, h: 44, ox: 48, oy: 30 },
  gate: { w: 130, h: 190, ox: 65, oy: 138 },          // 기준점 = 문이 서는 자리
  hunter: { w: 84, h: 100, ox: 42, oy: 80 },
  rabbit: { w: 64, h: 56, ox: 32, oy: 46 },
};
let rpgWarm = 0;
export function warmRpgArt() {
  warmDragonFlightArt();warmWorldBossArt();warmGuildArt();warmAdvArt();warmFuryArt();warmAbyssArt();
  if (rpgWarm) return;
  rpgWarm = 1;
  ["plaza", "field", "lamp", "bench", "hunter", "rabbit", "rabbit-frozen"].forEach((n) => mapImg(rpgFile(n)));
  sprite("rpg/fountain"); sprite("rpg/gate");
}

/* ── 바탕 — 맵마다 한 번만 그려 둔다 ───────────────────────── */
function grass(ctx, M, seed, tone) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = tone[0];
  ctx.fillRect(0, 0, M.w, M.h);
  for (let i = 0; i < M.w * M.h / 9000; i++) {
    const x = rnd() * M.w, y = rnd() * M.h;
    ctx.fillStyle = rnd() < 0.5 ? tone[1] : tone[2];
    ctx.beginPath(); ctx.ellipse(x, y, 30 + rnd() * 70, 12 + rnd() * 26, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(170,210,120,0.22)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < M.w * M.h / 2600; i++) {
    const x = rnd() * M.w, y = rnd() * M.h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 + rnd() * 4, y - 5 - rnd() * 4); ctx.stroke();
  }
}

function treeLine(ctx, M, seed) {
  const rnd = mulberry32(seed);
  const trees = [];
  for (let x = -20; x < M.w + 40; x += 34 + rnd() * 20) {
    trees.push({ x: x + (rnd() - 0.5) * 16, y: 60 + rnd() * (M.top - 70), s: 1.1 + rnd() * 0.6, pine: rnd() < 0.55, seed: rnd() * 999 });
  }
  trees.sort((a, b) => a.y - b.y).forEach((t) => drawTree(ctx, t.x, t.y, t.s, t.pine, t.seed));
  const sh = ctx.createLinearGradient(0, M.top - 30, 0, M.top + 24);
  sh.addColorStop(0, "rgba(20,30,14,0.35)");
  sh.addColorStop(1, "rgba(20,30,14,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, M.top - 30, M.w, 54);
}

function dirtPath(ctx, pts, w, col = ["#8a7148", "#b39868"]) {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = col[0]; ctx.lineWidth = w + 8;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = col[1]; ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function paintPlaza(ctx) {
  const M = MAPS.plaza;
  const rnd = mulberry32(711);
  grass(ctx, M, 31, ["#4f6e34", "rgba(120,160,80,0.10)", "rgba(40,60,26,0.10)"]);
  // 사냥문으로 가는 길
  dirtPath(ctx, [[1380, 690], [1560, 670], [1700, 660]], 70);
  // 돌 바닥 — 분수를 가운데 둔 둥근 광장
  const cx = 900, cy = 640;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, RPG.squash);
  ctx.fillStyle = "#b8ad97";
  ctx.beginPath(); ctx.arc(0, 0, 560, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8d826c"; ctx.lineWidth = 6;
  ctx.stroke();
  // 돌을 동심원으로 깐다
  for (let r = 150; r < 560; r += 44) {
    const n = Math.round((Math.PI * 2 * r) / 52);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + r * 0.01, a1 = a0 + (Math.PI * 2) / n - 0.02;
      ctx.fillStyle = ["#c7bca5", "#bdb29b", "#cfc5ae", "#b3a891"][Math.floor(rnd() * 4)];
      ctx.beginPath();
      ctx.arc(0, 0, r + 40, a0, a1);
      ctx.arc(0, 0, r + 2, a1, a0, true);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(110,98,78,0.35)"; ctx.lineWidth = 2;
  for (let r = 150; r < 560; r += 44) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // 꽃밭 — 광장 둘레
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const x = cx + Math.cos(a) * 640, y = cy + Math.sin(a) * 640 * RPG.squash;
    if (x > 1450 && Math.abs(y - 670) < 120) continue;        // 문으로 가는 길은 비운다
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 0.6);
    ctx.fillStyle = "#5d4630"; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e8f42"; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 16; k++) {
      ctx.fillStyle = ["#f0b8c8", "#f6e3a0", "#e8a0a8", "#fff2f2"][k % 4];
      ctx.beginPath(); ctx.arc((rnd() - 0.5) * 60, (rnd() - 0.5) * 60, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // 가장자리 덤불과 돌
  for (let i = 0; i < 26; i++) {
    const side = rnd() < 0.5;
    const x = side ? 20 + rnd() * 60 : M.w - 20 - rnd() * 60;
    const y = M.top + rnd() * (M.h - M.top - 30);
    if (!side && Math.abs(y - 660) < 140) continue;
    if (rnd() < 0.5) drawRock(ctx, x, y, 0.8 + rnd() * 0.5); else drawBush(ctx, x, y, 0.9 + rnd() * 0.5, rnd() < 0.4);
  }
  for (let x = 30; x < M.w; x += 60 + rnd() * 40) drawBush(ctx, x, M.h - 18, 0.9 + rnd() * 0.4, rnd() < 0.3);
  treeLine(ctx, M, 77);
}

function paintField(ctx, M) {
  const rnd = mulberry32(919);
  grass(ctx, M, 53, ["#557a37", "rgba(130,170,90,0.10)", "rgba(40,64,26,0.12)"]);
  // 광장으로 돌아가는 길
  dirtPath(ctx, [[60, 920], [240, 920], [420, 860], [600, 880]], 64);
  // 들꽃
  for (let i = 0; i < 420; i++) {
    const x = rnd() * M.w, y = M.top + rnd() * (M.h - M.top);
    ctx.fillStyle = ["#f6f0d8", "#f2d27a", "#e7a8c8", "#bcd8f0"][Math.floor(rnd() * 4)];
    ctx.beginPath(); ctx.arc(x, y, 1.8 + rnd() * 1.4, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * M.w, y = M.top + 40 + rnd() * (M.h - M.top - 60);
    if (x < 700 && Math.abs(y - 880) < 160) continue;
    if (rnd() < 0.45) drawRock(ctx, x, y, 0.8 + rnd() * 0.7); else drawBush(ctx, x, y, 0.9 + rnd() * 0.6, rnd() < 0.35);
  }
  for (let x = 30; x < M.w; x += 60 + rnd() * 40) drawBush(ctx, x, M.h - 18, 0.9 + rnd() * 0.4, rnd() < 0.3);
  treeLine(ctx, M, 99);
}

// 사냥터 가운데 드문드문 선 나무 — 사람보다 앞뒤로 겹쳐 그린다. 늘어난 끝쪽까지 심고, 늑대 사냥터는 소나무가 빽빽하다.
function plantTrees(seed, n, x0, x1, pineRate, skip) {
  const rnd = mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), y = 320 + rnd() * 1250;
    const t = { x, y, s: 1.2 + rnd() * 0.6, pine: rnd() < pineRate, seed: rnd() * 999 };
    if (!skip || !skip(t)) out.push(t);
  }
  return out;
}
const nearGate = (M) => (t) => M.gates.some((q) => Math.hypot(t.x - q.x, t.y - q.y) < 240);
const MAP_TREES = {
  field: [...plantTrees(4401, 22, 700, 2500, 0.5), ...plantTrees(4402, 12, 2500, 3500, 0.55, nearGate(MAPS.field))],
  wolf: plantTrees(4403, 46, 500, 3450, 0.8, nearGate(MAPS.wolf)),
  boar: plantTrees(4404, 40, 500, 4050, 0.3, nearGate(MAPS.boar)),    // 멧돼지 사냥터 — 둥근 나무가 많다
  gorilla: plantTrees(4405, 62, 500, 4500, 0.12, nearGate(MAPS.gorilla)),   // 고릴라 사냥터 — 빽빽한 활엽수 밀림
  goblin: plantTrees(4406, 34, 500, 4450, 0.25, nearGate(MAPS.goblin)),     // 고블린 늪지 — 듬성듬성
  orc: plantTrees(4407, 24, 500, 4650, 0.7, nearGate(MAPS.orc)),            // 오크 언덕 — 바늘잎나무가 드물다
  ogre: plantTrees(4408, 40, 500, 4850, 0.9, nearGate(MAPS.ogre)),          // 오우거 골짜기 — 어두운 바늘잎나무
  skeletal: plantTrees(4409, 18, 500, 4850, 0.95, nearGate(MAPS.skeletal)),     // 스켈레톤 무덤 — 앙상한 바늘잎나무가 드물다
  zombie: plantTrees(4410, 26, 500, 5050, 0.2, nearGate(MAPS.zombie)),          // 좀비 늪 — 활엽수가 듬성듬성
  necro: plantTrees(4411, 16, 500, 5250, 0.8, nearGate(MAPS.necro)),            // 마법사 폐허 — 거의 비어 있다
  golem: plantTrees(4412, 12, 500, 5450, 0.6, nearGate(MAPS.golem)),            // 골렘 채석장 — 거의 맨땅
  chimera: plantTrees(4413, 20, 500, 5650, 0.85, nearGate(MAPS.chimera)),       // 키메라 협곡
  spider: plantTrees(4414, 50, 500, 5850, 0.9, nearGate(MAPS.spider)),          // 포식거미 숲 — 빽빽하고 어둡다
  // 400~800레벨(deepData.js) — 화염 쪽은 그을린 나무가 드문드문, 심연 쪽은 조금 더 짙게
  ...Object.fromEntries(DEEP_MAPS.map((d, i) => [d.id, plantTrees(4500 + i, i < 4 ? 10 : 22, 500, d.w - 150, 0.85, nearGate(MAPS[d.id]))])),
};
const PLAZA_PROPS = [
  { k: "lamp", x: 560, y: 470 }, { k: "lamp", x: 1240, y: 470 }, { k: "lamp", x: 560, y: 820 }, { k: "lamp", x: 1240, y: 820 },
  { k: "bench", x: 1100, y: 900 }, { k: "bench", x: 700, y: 360 }, { k: "bench", x: 1100, y: 360 },   // 왼쪽 아래 의자(700, 900)는 던전 입구 아치가 덮어 뺐다
];

function drawFieldTree(ctx, t) { drawTreeArt(ctx, t.x, t.y, t.s, t.pine, t.seed); }


/* ── 던전 바닥 — 그림 파일 없이 코드로 그린다(빛깔은 dungeonData.js DG_LOOKS) ─────────────
   위쪽은 벽돌 벽과 기둥 · 횃불 받침, 바닥은 엇갈린 돌 타일 · 금 · 빛나는 틈 · 돌 부스러기, 가장자리는 어둡게.
   던전마다 한 번 그려 두고(한 번에 하나만 남긴다), 횃불 불꽃만 매 프레임 흔들어 그린다(drawTorches) */
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const TORCH_GAP = 400;                                  // 벽의 횃불 간격
// 이끼 — 바닥 줄눈 · 벽돌 틈에 낀 작은 덩어리. 빛깔은 DG_LOOKS[].moss(없으면 이 색), 수는 바닥 · 벽
const DG_MOSS = { col: ["#323c23", "#42502f", "#4e5e36"], floor: 170, wall: 40 };   // 너무 밝다는 의견으로 어두운 올리브빛 이끼 색으로
function mossClump(ctx, rnd, x, y, len, along, cols) {
  const n = 5 + Math.floor(rnd() * 7);
  for (let i = 0; i < n; i++) {
    const t = (rnd() - 0.5) * len;                       // 틈을 따라 길게 퍼진다
    const px = x + (along ? t : (rnd() - 0.5) * 6), py = y + (along ? (rnd() - 0.5) * 5 : t * 0.6);
    ctx.globalAlpha = 0.55 + rnd() * 0.35;
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.beginPath(); ctx.ellipse(px, py, 2 + rnd() * 4, 1.5 + rnd() * 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.8; ctx.fillStyle = cols[cols.length - 1];   // 밝은 잎 점
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * len * 0.6, y + (rnd() - 0.5) * 4, 1, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
export function paintDungeon(M) {
  const L = DG_LOOKS[M.dungeon] || DG_LOOKS.stone1;
  const c = document.createElement("canvas");
  c.width = M.w; c.height = M.h;
  const ctx = c.getContext("2d");
  const rnd = mulberry32(7000 + (M.slot || 0) * 13 + M.dungeon.length * 101);
  ctx.fillStyle = L.floor; ctx.fillRect(0, 0, M.w, M.h);
  // 바닥 돌 타일 — 줄마다 반 칸씩 엇갈린다
  const TW = 120, TH = 62;
  for (let r = 0, y = M.top; y < M.h; r++, y += TH) {
    for (let x = (r % 2 ? -TW / 2 : 0); x < M.w; x += TW) {
      ctx.fillStyle = shade(L.tile, 0.86 + rnd() * 0.24);
      roundRect(ctx, x + 2, y + 2, TW - 4, TH - 4, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x + 6, y + 4, TW - 12, 2);   // 윗면 빛
    }
  }
  ctx.strokeStyle = L.line; ctx.lineWidth = 2;
  for (let y = M.top; y < M.h; y += TH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(M.w, y); ctx.stroke(); }
  // 금 · 빛나는 틈
  const crack = () => {
    let x = rnd() * M.w, y = M.top + 30 + rnd() * (M.h - M.top - 60);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  };
  ctx.strokeStyle = shade(L.line, 0.9); ctx.lineWidth = 1.2;
  for (let i = 0; i < 45; i++) crack();
  ctx.save();
  ctx.strokeStyle = L.glow; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.shadowColor = L.glow; ctx.shadowBlur = 10;
  for (let i = 0; i < 16; i++) crack();
  ctx.restore();
  // 얼룩 · 돌 부스러기
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(rnd() * M.w, M.top + rnd() * (M.h - M.top), 30 + rnd() * 80, 10 + rnd() * 24, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = rnd() * M.w, y = rnd() < 0.5 ? M.top + 6 + rnd() * 40 : M.top + rnd() * (M.h - M.top);
    ctx.fillStyle = shade(L.tile, 0.6 + rnd() * 0.5);
    ctx.beginPath(); ctx.ellipse(x, y, 3 + rnd() * 7, 2 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // 바닥 이끼 — 타일 사이 줄눈(가로줄 · 세로 틈)에 낀다
  const moss = L.moss || DG_MOSS.col;
  for (let i = 0; i < DG_MOSS.floor; i++) {
    const r = Math.floor(rnd() * ((M.h - M.top) / TH)), y0 = M.top + r * TH;
    if (rnd() < 0.5) mossClump(ctx, rnd, rnd() * M.w, y0, 24 + rnd() * 30, true, moss);           // 가로 줄눈
    else {
      const c = Math.floor(rnd() * (M.w / TW)), x0 = c * TW + (r % 2 ? -TW / 2 : 0);
      mossClump(ctx, rnd, x0, y0 + 8 + rnd() * (TH - 16), 18 + rnd() * 16, false, moss);         // 세로 틈
    }
  }
  // 위쪽 벽 — 벽돌 · 기둥 · 횃불 받침
  ctx.fillStyle = L.wall; ctx.fillRect(0, 0, M.w, M.top);
  const BW = 64, BH = 26;
  for (let r = 0, y = 0; y < M.top - 8; r++, y += BH) {
    for (let x = (r % 2 ? -BW / 2 : 0); x < M.w; x += BW) {
      ctx.fillStyle = shade(L.wall, 1.05 + rnd() * 0.3);
      ctx.fillRect(x + 2, y + 2, BW - 4, BH - 4);
    }
  }
  for (let i = 0; i < DG_MOSS.wall; i++) {                // 벽돌 틈 이끼 — 아래쪽(축축한 곳)에 더 많이
    const r = Math.floor(Math.pow(rnd(), 0.6) * Math.floor((M.top - 8) / BH));
    mossClump(ctx, rnd, rnd() * M.w, r * BH + 1, 14 + rnd() * 18, true, moss);
  }
  for (let x = TORCH_GAP / 2 - 200; x < M.w + 100; x += TORCH_GAP) {   // 기둥 — 횃불 사이
    ctx.fillStyle = shade(L.wall, 1.5); ctx.fillRect(x - 22, 0, 44, M.top + 10);
    ctx.fillStyle = shade(L.wall, 0.8); ctx.fillRect(x + 14, 0, 8, M.top + 10);
    ctx.fillStyle = shade(L.wall, 1.8); ctx.fillRect(x - 28, M.top - 4, 56, 14);
  }
  for (let x = TORCH_GAP / 2; x < M.w; x += TORCH_GAP) {              // 횃불 받침
    ctx.fillStyle = "#2a1e14"; ctx.fillRect(x - 3, M.top - 64, 6, 26);
    ctx.fillStyle = "#4a3624"; ctx.fillRect(x - 9, M.top - 70, 18, 8);
  }
  const wallShade = ctx.createLinearGradient(0, M.top - 6, 0, M.top + 60);   // 벽 밑 그늘
  wallShade.addColorStop(0, "rgba(0,0,0,0.55)"); wallShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wallShade; ctx.fillRect(0, M.top - 6, M.w, 66);
  // 가장자리를 어둡게
  const edge = (x0, y0, x1, y1, w, h) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
  };
  edge(0, 0, 160, 0, 160, M.h); edge(M.w, 0, M.w - 160, 0, 160, M.h); edge(0, M.h, 0, M.h - 140, M.w, 140);
  return c;
}
// 던전 어둠 — 내 캐릭터 둘레는 밝고 멀수록 어둡다(피해 숫자 · 연출은 이 위에 그려 가리지 않는다)
const DG_DARK = { near: 260, far: 760, alpha: 0.5 };
function drawDungeonDark(ctx, me, cam) {               // 월드 좌표로 그린다(카메라만큼 옮겨진 상태)
  const x = me ? me.x : cam.x + W / 2, y = me ? me.y - 40 : cam.y + H / 2;
  const g = ctx.createRadialGradient(x, y, DG_DARK.near, x, y, DG_DARK.far);
  g.addColorStop(0, "rgba(6,4,2,0)"); g.addColorStop(1, `rgba(6,4,2,${DG_DARK.alpha})`);
  ctx.fillStyle = g; ctx.fillRect(cam.x - 20, cam.y - 20, W + 40, H + 40);
}
// 횃불 불꽃 — 흔들리는 불과 둘레 빛
function drawTorches(ctx, M, cam, time) {
  const L = DG_LOOKS[M.dungeon] || DG_LOOKS.stone1;
  for (let x = TORCH_GAP / 2; x < M.w; x += TORCH_GAP) {
    if (x < cam.x - 120 || x > cam.x + W + 120) continue;
    const y = M.top - 76, f = Math.sin(time * 11 + x) * 0.5 + Math.sin(time * 17 + x * 0.3) * 0.5;
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 120 + f * 8);
    glow.addColorStop(0, `${L.fire}55`); glow.addColorStop(1, `${L.fire}00`);
    ctx.fillStyle = glow; ctx.fillRect(x - 130, y - 130, 260, 260);
    ctx.fillStyle = L.fire;
    ctx.beginPath(); ctx.ellipse(x, y - 4 - f, 6, 12 + f * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff4d0";
    ctx.beginPath(); ctx.ellipse(x, y - 1, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function paintMap(id) {
  const M = MAPS[id];
  const c = document.createElement("canvas");
  c.width = M.w; c.height = M.h;
  const ctx = c.getContext("2d");
  if (id === "plaza") paintPlaza(ctx); else paintField(ctx, M);
  return c;
}

/* ── 광장의 던전 입구 — 그림 파일 없이 코드로 그린다(자리 · 크기는 dungeonData.js DUNGEON.gate) ─────
   땅에는 아래로 내려가는 돌계단 구덩이(drawDgPit, 사람보다 먼저), 그 위에 돌기둥 둘과 아치 · 횃불(drawDgGate, 앞뒤 차례로).
   계단 밑은 보랏빛으로 일렁이고 빛 알갱이가 올라온다 */
const DG_GATE = { stone: "#8f8779", dark: "#3e3830", steps: 6, rune: "#b89ae0", fire: "#ffae5a" };
function drawDgPit(ctx, time) {
  const { x, y, w } = DUNGEON.gate, S = DG_GATE, deep = S.steps * 16;
  ctx.save();
  // 바깥 돌 테두리
  ctx.fillStyle = shade(S.stone, 0.92); ctx.strokeStyle = "rgba(40,32,24,0.55)"; ctx.lineWidth = 1;
  roundRect(ctx, x - w / 2 - 16, y - 10, w + 32, deep + 18, 6); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 7; i++) {                          // 테두리 돌 줄눈
    const bx = x - w / 2 - 16 + (i + 0.5) * ((w + 32) / 7);
    ctx.beginPath(); ctx.moveTo(bx, y - 10); ctx.lineTo(bx, y - 2); ctx.stroke();
  }
  // 구덩이 안 — 아래로 갈수록 어둡다
  const hole = ctx.createLinearGradient(0, y, 0, y + deep);
  hole.addColorStop(0, "#4a443c"); hole.addColorStop(1, "#0e0b14");
  ctx.fillStyle = hole; ctx.fillRect(x - w / 2, y - 2, w, deep + 2);
  // 계단 — 아랫단일수록 좁고 어둡다
  for (let i = 0; i < S.steps; i++) {
    const k = 1 - i / S.steps, sw = w * (1 - i * 0.05), sy = y + i * 16;
    ctx.fillStyle = shade("#a69c8b", 0.35 + 0.65 * k); ctx.fillRect(x - sw / 2, sy, sw, 6);       // 디딤판
    ctx.fillStyle = shade("#6e665a", 0.3 + 0.6 * k); ctx.fillRect(x - sw / 2, sy + 6, sw, 10);     // 챌판
    ctx.fillStyle = `rgba(20,14,10,${0.25 + 0.3 * (1 - k)})`; ctx.fillRect(x - sw / 2, sy + 6, sw, 1);
  }
  // 양옆 벽 그늘
  ctx.fillStyle = "rgba(10,8,12,0.55)";
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - 2); ctx.lineTo(x - w / 2 + 12, y - 2); ctx.lineTo(x - w * 0.36, y + deep); ctx.lineTo(x - w / 2, y + deep); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w / 2, y - 2); ctx.lineTo(x + w / 2 - 12, y - 2); ctx.lineTo(x + w * 0.36, y + deep); ctx.lineTo(x + w / 2, y + deep); ctx.fill();
  // 계단 밑 보랏빛
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.2);
  const glow = ctx.createRadialGradient(x, y + deep, 4, x, y + deep, w * 0.7);
  glow.addColorStop(0, `rgba(160,120,220,${0.55 * pulse})`); glow.addColorStop(1, "rgba(160,120,220,0)");
  ctx.fillStyle = glow; ctx.fillRect(x - w / 2, y - 2, w, deep + 2);
  // 올라오는 빛 알갱이
  for (let i = 0; i < 9; i++) {
    const t = (time * 0.35 + i / 9) % 1;
    const px = x + Math.sin(i * 2.7 + time * 0.8) * w * 0.3, py = y + deep - t * (deep + 30);
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8; ctx.fillStyle = S.rune;
    ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 테두리에 낀 이끼 · 굴러다니는 돌
  const rnd = mulberry32(7301);
  for (let i = 0; i < 6; i++) mossClump(ctx, rnd, x - w / 2 - 10 + rnd() * (w + 20), y - 6 + (rnd() < 0.5 ? 0 : deep + 4), 18, true, DG_MOSS.col);
  [[-w / 2 - 34, 10, 7], [w / 2 + 30, 30, 6], [-w / 2 - 26, deep - 4, 5], [w / 2 + 40, deep - 14, 8]].forEach(([dx, dy, r]) => {
    ctx.fillStyle = "#7d766b"; ctx.strokeStyle = "rgba(40,32,24,0.5)";
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}
function drawDgGate(ctx, time) {
  const { x, y, w, h } = DUNGEON.gate, S = DG_GATE, px = w / 2 + 16;
  ctx.save();
  [-1, 1].forEach((k) => {
    const cx = x + k * px;
    shadow(ctx, cx, y + 2, 24, 7, 0.35);
    ctx.fillStyle = shade(S.stone, 0.8); ctx.strokeStyle = "rgba(36,28,20,0.6)"; ctx.lineWidth = 1;
    ctx.fillRect(cx - 19, y - 14, 38, 14); ctx.strokeRect(cx - 19, y - 14, 38, 14);           // 받침
    for (let j = 0; j < 4; j++) {                                                               // 기둥 돌 네 덩이
      const by = y - 14 - (j + 1) * ((h - 26) / 4), bh = (h - 26) / 4;
      ctx.fillStyle = shade(S.stone, 0.95 - (j % 2) * 0.08);
      ctx.fillRect(cx - 14, by, 28, bh); ctx.strokeRect(cx - 14, by, 28, bh);
      ctx.fillStyle = "rgba(255,245,225,0.12)"; ctx.fillRect(cx - 14, by + 1, 5, bh - 2);       // 왼쪽 밝은 면
    }
    ctx.fillStyle = shade(S.stone, 0.85); ctx.fillRect(cx - 18, y - h, 36, 12); ctx.strokeRect(cx - 18, y - h, 36, 12);   // 머리돌
    ctx.strokeStyle = "rgba(36,28,20,0.5)";                                                     // 금
    ctx.beginPath(); ctx.moveTo(cx + k * 6, y - 60); ctx.lineTo(cx + k * 2, y - 52); ctx.lineTo(cx + k * 8, y - 44); ctx.stroke();
    // 바깥쪽 횃불
    const tx = cx + k * 24, ty = y - 72, f = Math.sin(time * 11 + k * 3) * 0.5 + Math.sin(time * 17 + k) * 0.5;
    ctx.strokeStyle = "#3a3026"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + k * 14, ty + 10); ctx.lineTo(tx, ty + 4); ctx.stroke();
    ctx.fillStyle = "#4a3c2c"; ctx.fillRect(tx - 4, ty - 2, 8, 9);
    const gl = ctx.createRadialGradient(tx, ty - 6, 2, tx, ty - 6, 70 + f * 6);
    gl.addColorStop(0, `${S.fire}66`); gl.addColorStop(1, `${S.fire}00`);
    ctx.fillStyle = gl; ctx.fillRect(tx - 80, ty - 86, 160, 160);
    ctx.fillStyle = S.fire; ctx.beginPath(); ctx.ellipse(tx, ty - 8 - f, 5, 10 + f * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff2cc"; ctx.beginPath(); ctx.ellipse(tx, ty - 5, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill();
  });
  // 아치 — 기둥 머리돌 사이를 잇는 돌 띠
  const ay = y - h, R = px, band = 20;
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(36,28,20,0.6)";
  for (let i = 0; i < 9; i++) {
    const a0 = Math.PI + (i / 9) * Math.PI, a1 = Math.PI + ((i + 1) / 9) * Math.PI;
    ctx.fillStyle = shade(S.stone, 0.88 + (i % 2) * 0.08);
    ctx.beginPath(); ctx.arc(x, ay, R + band / 2, a0, a1); ctx.arc(x, ay, R - band / 2, a1, a0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // 이맛돌 — 빛나는 룬
  const ky = ay - R, pulse = 0.6 + 0.4 * Math.sin(time * 2.2);
  ctx.fillStyle = shade(S.stone, 0.78);
  ctx.beginPath(); ctx.moveTo(x - 13, ky - 14); ctx.lineTo(x + 13, ky - 14); ctx.lineTo(x + 9, ky + 14); ctx.lineTo(x - 9, ky + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowColor = S.rune; ctx.shadowBlur = 10 * pulse;
  ctx.strokeStyle = S.rune; ctx.globalAlpha = 0.5 + 0.5 * pulse; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, ky - 9); ctx.lineTo(x, ky + 9); ctx.moveTo(x - 5, ky - 3); ctx.lineTo(x, ky + 2); ctx.lineTo(x + 5, ky - 3); ctx.stroke();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  // 아치 위 덩굴 · 이끼
  const rnd = mulberry32(7302);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.15 + rnd() * 0.7);
    mossClump(ctx, rnd, x + Math.cos(a) * (R + 6), ay + Math.sin(a) * (R + 6), 14, true, DG_MOSS.col);
  }
  // 걸린 돌 현판
  ctx.strokeStyle = "#3a3026"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 16, ky + 14); ctx.lineTo(x - 18, ky + 26); ctx.moveTo(x + 16, ky + 14); ctx.lineTo(x + 18, ky + 26); ctx.stroke();
  ctx.fillStyle = "rgba(34,26,20,0.88)"; roundRect(ctx, x - 30, ky + 26, 60, 20, 4); ctx.fill();
  ctx.strokeStyle = "rgba(240,200,150,0.5)"; ctx.stroke();
  ctx.font = "13px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0c896"; ctx.fillText("던전", x, ky + 36.5);
  ctx.restore();
}

/* ── 움직이는 것들 ─────────────────────────────────────── */
function drawFountain(ctx, time) {
  const fs = sprite("rpg/fountain");
  if (fs) drawSprite(ctx, fs, 900 - RFRAME.fountain.ox, 620 - RFRAME.fountain.oy, RFRAME.fountain.w, RFRAME.fountain.h, time);
  else drawFountainBody(ctx, time);
}

// 분수 몸통 — 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawFountainBody(ctx, time) {
  const x = 900, y = 620;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, RPG.squash);
  ctx.fillStyle = "#8d826c"; ctx.beginPath(); ctx.arc(0, 8, 100, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d9d0bd"; ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.fill();
  const wg = ctx.createRadialGradient(0, 0, 10, 0, 0, 82);
  wg.addColorStop(0, "#8fd0ea"); wg.addColorStop(1, "#4d93b8");
  ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(0, 0, 82, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const r = (((time * (160 / ANIM_T) + i * 27) % 80) + 80) % 80;     // 물결 하나가 한 바퀴에 두 번 퍼진다
    ctx.globalAlpha = 1 - r / 80;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // 가운데 기둥과 솟는 물
  ctx.fillStyle = "#cfc5ae";
  roundRect(ctx, x - 10, y - 58, 20, 58, 5); ctx.fill();
  ctx.fillStyle = "#e6ddca";
  ctx.beginPath(); ctx.ellipse(x, y - 58, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(190,230,250,0.85)";
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + time * SR(1);
    const p = (time * CR(1.2) + i * 0.1) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 26 * p, y - 64 - Math.sin(p * Math.PI) * 34 + p * 30, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProp(ctx, o) {
  const pim = mapImg(rpgFile(o.k));
  if (pim) {
    const F = RFRAME[o.k];
    ctx.drawImage(pim, o.x - F.ox, o.y - F.oy, F.w, F.h);
  } else drawPropBody(ctx, o);
}

// 가로등 · 벤치 몸통 — 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawPropBody(ctx, o) {
  if (o.k === "lamp") {
    shadow(ctx, o.x, o.y + 2, 10, 4, 0.25);
    ctx.fillStyle = "#3a3024"; roundRect(ctx, o.x - 3, o.y - 70, 6, 72, 2); ctx.fill();
    ctx.fillStyle = "#2c241b"; roundRect(ctx, o.x - 9, o.y - 86, 18, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffe7a0"; roundRect(ctx, o.x - 6, o.y - 83, 12, 12, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,231,160,0.16)"; ctx.beginPath(); ctx.arc(o.x, o.y - 77, 26, 0, Math.PI * 2); ctx.fill();
  } else if (o.k === "bench") {
    shadow(ctx, o.x, o.y + 3, 40, 6, 0.25);
    ctx.fillStyle = "#6b4a2c"; roundRect(ctx, o.x - 38, o.y - 22, 76, 8, 3); ctx.fill();
    ctx.fillStyle = "#7d5733"; roundRect(ctx, o.x - 38, o.y - 12, 76, 8, 3); ctx.fill();
    ctx.fillStyle = "#3a3024";
    ctx.fillRect(o.x - 32, o.y - 6, 5, 8); ctx.fillRect(o.x + 27, o.y - 6, 5, 8);
  }
}

// 문 몸통 — 바닥 빛 · 문틀 · 안쪽 소용돌이. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawGateBody(ctx, gt, time) {
  const { x, y } = gt;
  // 둥글게 빛나는 문 자리
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, RPG.squash);
  const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, gt.r);
  gl.addColorStop(0, "rgba(190,230,255,0.55)");
  gl.addColorStop(1, "rgba(120,180,230,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, gt.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(200,235,255,0.7)"; ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]); ctx.lineDashOffset = -time * DR(20, 16);
  ctx.beginPath(); ctx.arc(0, 0, gt.r * 0.9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
  // 나무 문틀
  ctx.fillStyle = "#5d4128";
  roundRect(ctx, x - 50, y - 118, 12, 120, 4); ctx.fill();
  roundRect(ctx, x + 38, y - 118, 12, 120, 4); ctx.fill();
  ctx.fillStyle = "#6f4e30";
  roundRect(ctx, x - 60, y - 130, 120, 18, 6); ctx.fill();
  // 문 안쪽의 소용돌이
  ctx.save();
  ctx.globalAlpha = 0.75;
  const pg = ctx.createLinearGradient(x, y - 112, x, y);
  pg.addColorStop(0, "rgba(150,210,255,0.2)");
  pg.addColorStop(1, "rgba(150,210,255,0.6)");
  ctx.fillStyle = pg;
  ctx.fillRect(x - 38, y - 112, 76, 112);
  ctx.strokeStyle = "rgba(230,245,255,0.8)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const p = (time * CR(0.6) + i / 4) % 1;
    ctx.globalAlpha = 0.8 * (1 - p);
    ctx.beginPath(); ctx.ellipse(x, y - 56, 34 * p + 4, 50 * p + 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawGate(ctx, gt, time) {
  const { x, y } = gt;
  const gs = sprite("rpg/gate");
  if (gs) drawSprite(ctx, gs, x - RFRAME.gate.ox, y - RFRAME.gate.oy, RFRAME.gate.w, RFRAME.gate.h, time);
  else drawGateBody(ctx, gt, time);
  // 팻말
  ctx.save();
  ctx.font = "15px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(gt.label).width + 22;
  ctx.fillStyle = "#3b2c1b"; roundRect(ctx, x - w / 2, y - 158, w, 24, 7); ctx.fill();
  ctx.strokeStyle = "#8a6a3f"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#f6e5bb";
  ctx.fillText(gt.label, x, y - 145);
  ctx.restore();
}

// 사냥꾼 몸통 — 그림자와 활 · 망토 · 얼굴 · 모자. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawNpcBody(ctx, x, y, bob) {
  shadow(ctx, x, y + 2, 18, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  // 활 — 등에 멘다
  ctx.strokeStyle = "#7d5733"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(-6, -34, 20, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = "rgba(240,230,210,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6 + Math.cos(-1.2) * 20, -34 + Math.sin(-1.2) * 20); ctx.lineTo(-6 + Math.cos(1.2) * 20, -34 + Math.sin(1.2) * 20); ctx.stroke();
  // 망토와 몸
  ctx.fillStyle = "#4d6b3a";
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-12, -38); ctx.lineTo(12, -38); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7a5634"; ctx.fillRect(-12, -18, 24, 4);
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-9, -2, 6, 4); ctx.fillRect(3, -2, 6, 4);
  // 얼굴과 모자
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.5, -46, 1.4, 0, Math.PI * 2); ctx.arc(3.5, -46, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6b4a2c";
  ctx.beginPath(); ctx.ellipse(0, -54, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -54); ctx.lineTo(-5, -66); ctx.lineTo(8, -64); ctx.lineTo(9, -54); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c9433b"; ctx.fillRect(-9, -57, 18, 3);
  ctx.restore();
}

/* 광장 상점 — 그림 파일이 아직 없어 코드로 그린 노점이다. 차양 색은 shopData.js 의 color.
   발밑 가운데가 (x, y). 위에 상점 이름, 아래에 주인 이름을 단다. */
function drawShop(ctx, n, time) {
  const { x, y } = n;
  const c = (SHOP_BY_ID[n.shop] || {}).color || "#b9a07a";
  shadow(ctx, x, y + 4, 62, 12, 0.28);
  ctx.save();
  ctx.translate(x, y);
  // 기둥과 판매대
  ctx.fillStyle = "#6b4e33";
  ctx.fillRect(-54, -92, 5, 92); ctx.fillRect(49, -92, 5, 92);
  ctx.fillStyle = "#8a6a46"; roundRect(ctx, -58, -30, 116, 30, 4); ctx.fill();
  ctx.strokeStyle = "rgba(40,26,14,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  // 주인 — 판매대 뒤에서 살짝 흔들린다
  const bob = Math.sin(time * 2 + x) * 1.2;
  ctx.fillStyle = c; ctx.fillRect(-11, -50 + bob, 22, 22);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -58 + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3, -58 + bob, 1.3, 0, Math.PI * 2); ctx.arc(3, -58 + bob, 1.3, 0, Math.PI * 2); ctx.fill();
  // 줄무늬 차양
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#efe6d2" : c;
    ctx.beginPath();
    ctx.moveTo(-62 + i * 20.7, -92); ctx.lineTo(-62 + (i + 1) * 20.7, -92);
    ctx.lineTo(-62 + (i + 1) * 20.7, -78); ctx.quadraticCurveTo(-62 + (i + 0.5) * 20.7, -70, -62 + i * 20.7, -78);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = "rgba(40,26,14,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-62, -100, 124, 8);
  ctx.fillStyle = c; ctx.fillRect(-62, -100, 124, 8);
  // 간판 — 상점 이름
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "15px 'Do Hyeon', sans-serif";
  const w = ctx.measureText(n.name).width + 20;
  ctx.fillStyle = "rgba(30,22,14,0.86)"; roundRect(ctx, -w / 2, -128, w, 24, 6); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#f6e5bb"; ctx.fillText(n.name, 0, -116);
  // 주인 이름
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.keeper).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, -w2 / 2, 8, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.keeper, 0, 16.5);
  ctx.restore();
}

/* 계몽의 문(deepData.js) — 생성한 문 그림(DEEP_DOOR_ART) · 문 안쪽이 숨 쉬듯 빛나고 이름판 · 안내 글. 그림을 못 불러오면 길드 문과 같은 돌 아치 */
function drawDeepDoor(ctx, g, n, time) {
  const me = g.heroes[g.mySeat], eye = me && (me.admin || (me.bag && me.bag.m && me.bag.m[DEEP.eye] > 0));
  const sub = eye ? "400~800레벨 사냥터" : "계몽의 눈 필요", door = artImg(DEEP_DOOR_ART.src);
  if (door) {
    const A = DEEP_DOOR_ART, H = A.h, W = (H * door.naturalWidth) / door.naturalHeight, top = n.y - H * A.foot;
    shadow(ctx, n.x, n.y + 4, W * 0.46, 14, 0.3);
    ctx.drawImage(door, n.x - W / 2, top, W, H);
    const px = n.x - W / 2 + W * A.portal[0], py = top + H * A.portal[1], pr = W * A.portal[2];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(px, py, 0, px, py, pr * 1.6);
    gl.addColorStop(0, `rgba(210,180,255,${(eye ? 0.32 : 0.16) + 0.1 * Math.sin(time * 2)})`); gl.addColorStop(1, "rgba(120,80,200,0)");
    ctx.fillStyle = gl; ctx.fillRect(px - pr * 1.6, py - pr * 1.6, pr * 3.2, pr * 3.2);
    for (let i = 0; i < 6; i++) {                     // 문 안에서 떠오르는 빛 알갱이
      const k = (time * 0.35 + i / 6) % 1, x = px + Math.sin(i * 2.4 + time) * pr * 0.6, y = py + pr * 1.1 - k * pr * 2.4;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8; ctx.fillStyle = "#f2e6ff";
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.font = "18px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lw = ctx.measureText("계몽의 문").width + 22;
    ctx.fillStyle = "rgba(34,24,18,0.86)"; ctx.strokeStyle = "#b99a62"; ctx.lineWidth = 1;
    roundRect(ctx, n.x - lw / 2, top - 30, lw, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f1dfb8"; ctx.fillText("계몽의 문", n.x, top - 18);
    ctx.font = "13px 'Do Hyeon', sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(24,16,30,0.85)";
    ctx.strokeText(sub, n.x, n.y + 30); ctx.fillStyle = eye ? "#e2d0ff" : "#c9a8f0"; ctx.fillText(sub, n.x, n.y + 30);
    ctx.restore();
    return;
  }
  drawArchDoor(ctx, n.x, n.y, time, "계몽의 문", sub, "#c9a8f0", "#1e1636");
  const im = artImg(DEEP.img), bob = Math.sin(time * 2.2) * 4, s = 58;
  ctx.save();
  ctx.globalAlpha = eye ? 1 : 0.55;
  if (im) ctx.drawImage(im, n.x - s / 2, n.y - 92 - s / 2 + bob, s, s);
  else { ctx.fillStyle = "rgba(220,200,255,0.6)"; ctx.beginPath(); ctx.ellipse(n.x, n.y - 92 + bob, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawNpc(ctx, g, n, time) {
  if (n.deep) return drawDeepDoor(ctx, g, n, time);
  if (n.abyss) return drawAbyssGate(ctx, g, n, time, ABYSS_T);   // 심연의 탑 입구(abyssArt.js)
  if(n.guild)return drawGuildStatue(ctx,g,n,time);
  if(n.guildDoor)return drawGuildDoor(ctx,g,n,time);
  if(n.guildRaidDoor)return drawGuildRaidDoor(ctx,g,n,time);
  if(n.worldBoss)return drawWorldBossPortal(ctx,g,n,time);
  if (n.shop) return drawShop(ctx, n, time);
  if (n.board) return drawHonorBoard(ctx, n, time);
  if (n.market) return drawMarketBoard(ctx, n, time);
  if (n.req) return drawReqNpc(ctx, g, n, time);
  if (n.dungeon) return drawDungeonNpc(ctx, n, time);
  if (n.adv) return drawAdvNpc(ctx, g, n, time, roundRect, shadow);   // 광장 전직 교관(advArt.js)
  const { x, y } = n;
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const bob = Math.sin(time * 2) * 1.2;
  const him = mapImg(rpgFile("hunter"));
  if (him) ctx.drawImage(him, x - RFRAME.hunter.ox, y + bob - RFRAME.hunter.oy, RFRAME.hunter.w, RFRAME.hunter.h);
  else drawNpcBody(ctx, x, y, bob);

  // 머리 위 표시 — 받을 퀘스트가 있으면 느낌표, 하는 중이면 몇 마리 잡았는지
  const q = me ? me.quest : null;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (q && q.on) {
    ctx.font = "13px 'Do Hyeon', sans-serif";
    const t = `토끼 ${q.n}/${QUEST.need}`;
    const w = ctx.measureText(t).width + 16;
    ctx.fillStyle = "rgba(20,14,10,0.78)"; roundRect(ctx, x - w / 2, y - 100, w, 20, 8); ctx.fill();
    ctx.fillStyle = "#e8dcc0"; ctx.fillText(t, x, y - 90);
  } else {
    const jump = Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "28px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
    ctx.strokeText("!", x, y - 94 + jump);
    ctx.fillStyle = "#ffd873"; ctx.fillText("!", x, y - 94 + jump);
  }
  // 이름
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#ffe08a"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

// 토끼 몸통 — 꼬리 · 몸 · 머리 · 귀. 발밑이 원점이고 오른쪽을 본다. 그림 파일을 뽑을 때와 파일이 없을 때 쓴다.
export function drawRabbitBody(ctx, frozen) {
  const fur = frozen ? "#cfe8f6" : "#f3ede0";
  const shade = frozen ? "#a8cde4" : "#d9cfbd";
  // 꼬리 · 몸
  ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(-13, -9, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-2, -9, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(-3, -4, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  // 머리 · 귀
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.arc(9, -15, 7, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(7, -20); ctx.rotate(-0.25);
  ctx.beginPath(); ctx.ellipse(0, -8, 3, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2b9c4"; ctx.beginPath(); ctx.ellipse(0, -8, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(11, -20); ctx.rotate(0.2); ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, -8, 3, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2b9c4"; ctx.beginPath(); ctx.ellipse(0, -8, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#2a1f13"; ctx.beginPath(); ctx.arc(11, -16, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e88a9c"; ctx.beginPath(); ctx.arc(15.5, -14, 1.3, 0, Math.PI * 2); ctx.fill();
}

function drawRabbit(ctx, m, time) {
  const k = m.size || 1;
  const hop = m.moving ? Math.abs(Math.sin(m.age * (m.boss ? 9 : 13))) * 7 * Math.sqrt(k) : 0;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 13 * grow * k, 4 * grow * k, 0.25);
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  const rim = mapImg(rpgFile(m.freeze > 0 ? "rabbit-frozen" : "rabbit"));
  if (rim) ctx.drawImage(rim, -RFRAME.rabbit.ox, -RFRAME.rabbit.oy, RFRAME.rabbit.w, RFRAME.rabbit.h);
  else drawRabbitBody(ctx, m.freeze > 0);
  if (m.boss) {                                         // 대왕 토끼 — 작은 왕관
    ctx.fillStyle = "#f3c94f"; ctx.strokeStyle = "#8a6420"; ctx.lineWidth = 1.2 / k;
    ctx.beginPath();
    ctx.moveTo(1, -38); ctx.lineTo(3, -46); ctx.lineTo(7, -41); ctx.lineTo(10, -48); ctx.lineTo(13, -41);
    ctx.lineTo(17, -46); ctx.lineTo(18, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(1, -11, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 44 * k + hop);
}

/* 늑대 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 걸을 때 다리를 번갈아 내딛는다.
   우두머리는 털빛이 짙고 목갈기와 붉은 눈을 가진다. */
export function drawWolfBody(ctx, ph, moving, boss, frozen, bite) {
  const fur = frozen ? "#bcd6e6" : boss ? "#4e4953" : "#8d9099";
  const dark = frozen ? "#8fb3c9" : boss ? "#2f2b33" : "#5e616b";
  const belly = frozen ? "#e2f0f8" : boss ? "#8e8792" : "#d8d4cb";
  const line = "rgba(30,24,20,0.85)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 1.6;
  const leg = (lx, off, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line;
    ctx.beginPath(); ctx.roundRect(lx - 3.5 + off, -16, 7, 16, 3); ctx.fill(); ctx.stroke();
  };
  // 뒤쪽 다리 (어둡게)
  leg(-18, -sw, dark); leg(14, sw, dark);
  // 꼬리
  ctx.save(); ctx.translate(-24, -26); ctx.rotate(-0.7 + (moving ? Math.sin(ph * 0.5) * 0.15 : 0));
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-12, 0, 14, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(-22, 0, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 몸통 · 배
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-2, -25, 27, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(2, -17, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-6, -34, 16, 4, -0.05, 0, Math.PI * 2); ctx.fill();   // 등줄기
  // 앞쪽 다리
  leg(-12, sw, fur); leg(20, -sw, fur);
  // 머리 — 물 때는 앞으로 내민다
  ctx.save();
  ctx.translate(bite > 0 ? 4 : 0, 0);
  if (boss) {                                           // 목갈기
    ctx.fillStyle = "#e9e4dc";
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -2.2 + i * 0.55, r = i % 2 ? 11 : 17;
      ctx.lineTo(18 + Math.cos(a) * r, -30 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  // 귀
  [[17, -44, 20, -58, 26, -45], [24, -45, 30, -58, 32, -42]].forEach(([a, b, c, d, e, f]) => {
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "#c79a9a";
  ctx.beginPath(); ctx.moveTo(20, -46); ctx.lineTo(21, -53); ctx.lineTo(24, -46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.arc(24, -35, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 주둥이 · 코 · 입
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(35, -30, 9, 5.5, 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#231c1c"; ctx.beginPath(); ctx.arc(43, -31.5, 2.4, 0, Math.PI * 2); ctx.fill();
  if (bite > 0) {
    ctx.fillStyle = "#7a2a2a"; ctx.beginPath(); ctx.ellipse(36, -25.5, 6, 2.6, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(33, -27); ctx.lineTo(34, -24); ctx.lineTo(35, -27); ctx.fill();
  }
  // 눈
  ctx.fillStyle = boss ? "#ff5b4a" : "#f2c14e";
  ctx.beginPath(); ctx.ellipse(28, -38, 2.4, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1c1414"; ctx.beginPath(); ctx.arc(28.6, -38, 1.1, 0, Math.PI * 2); ctx.fill();
  if (boss) {                                           // 흉터
    ctx.strokeStyle = "rgba(240,220,210,0.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(22, -44); ctx.lineTo(27, -33); ctx.stroke();
  }
  ctx.restore();
}

function drawWolf(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 9 : 11);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2.5 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 30 * grow * k, 7 * grow * k, 0.28);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawWolfBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(6, -28, 34, 16, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 60 * k + bob);
}

/* 멧돼지 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 등에 뻣뻣한 갈기, 주둥이 옆에 엄니.
   멧돼지 왕은 털빛이 짙고 엄니가 크며 눈이 붉다. low 가 켜지면(몸을 낮춤 · 들이받음) 머리를 숙인다. */
export function drawBoarBody(ctx, ph, moving, boss, frozen, low) {
  const fur = frozen ? "#bcd6e6" : boss ? "#4a3428" : "#7a5a40";
  const dark = frozen ? "#8fb3c9" : boss ? "#2c1e16" : "#563e2b";
  const snout = frozen ? "#e2f0f8" : boss ? "#8a6a5a" : "#c09a80";
  const line = "rgba(30,20,14,0.85)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 1.6;
  const leg = (lx, off, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line;
    ctx.beginPath(); ctx.roundRect(lx - 4 + off, -14, 8, 14, 3); ctx.fill(); ctx.stroke();
  };
  leg(-16, -sw, dark); leg(12, sw, dark);
  // 꼬리
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-27, -24); ctx.quadraticCurveTo(-34, -30, -31, -20); ctx.stroke();
  ctx.lineWidth = 1.6;
  // 몸통 — 둥글고 두툼하다
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(-2, -24, 28, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 등 갈기
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-22, -32);
  for (let i = 0; i <= 8; i++) ctx.lineTo(-22 + i * 5.2, -38 - (i % 2 ? 6 : 1));
  ctx.lineTo(20, -32); ctx.closePath(); ctx.fill();
  leg(-10, sw, fur); leg(18, -sw, fur);
  // 머리 — 숙이면 앞으로 내려간다
  ctx.save();
  ctx.translate(low > 0 ? 3 : 0, low > 0 ? 5 : 0);
  ctx.rotate(low > 0 ? 0.18 : 0);
  ctx.fillStyle = fur; ctx.strokeStyle = line;
  ctx.beginPath(); ctx.ellipse(24, -26, 13, 11, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 귀
  ctx.beginPath(); ctx.moveTo(17, -34); ctx.lineTo(16, -45); ctx.lineTo(24, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 주둥이 · 콧구멍
  ctx.fillStyle = snout;
  ctx.beginPath(); ctx.ellipse(37, -22, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2a1c16";
  ctx.beginPath(); ctx.arc(38, -24, 1.2, 0, Math.PI * 2); ctx.arc(38, -20, 1.2, 0, Math.PI * 2); ctx.fill();
  // 엄니
  const tk = boss ? 1.5 : 1;
  ctx.fillStyle = "#f4ead6"; ctx.strokeStyle = line; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(32, -17); ctx.quadraticCurveTo(36 + 4 * tk, -18, 34 + 5 * tk, -26 - 4 * tk); ctx.lineTo(34, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 눈
  ctx.fillStyle = boss ? "#ff5b4a" : "#1c1410";
  ctx.beginPath(); ctx.arc(27, -30, boss ? 2.2 : 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoar(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 10 : 12);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2.2 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 32 * grow * k, 8 * grow * k, 0.3);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawBoarBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(4, -26, 36, 18, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, 54 * k + bob);
}

/* 고릴라 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다. 평소에는 주먹을 땅에 짚고 걷는다.
   up 이 켜지면(가슴 두드리기) 일어서서 두 주먹으로 가슴을 번갈아 친다. 고릴라 왕은 등이 은빛이고 눈이 붉다. */
export function drawGorillaBody(ctx, ph, moving, boss, frozen, up) {
  const fur = frozen ? "#bcd6e6" : boss ? "#2f2b2d" : "#423c39";
  const dark = frozen ? "#8fb3c9" : boss ? "#1b181a" : "#2a2522";
  const skin = frozen ? "#e2f0f8" : boss ? "#6a5d58" : "#7c6b61";
  const silver = frozen ? "#eef7fb" : "#bdb8b1";
  const line = "rgba(16,12,10,0.9)";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const limb = (x0, y0, x1, y1, w, col) => {
    ctx.strokeStyle = line; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  const blob = (x, y, rx, ry, rot, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = line; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const face = (hx, hy) => {
    blob(hx, hy, 11, 10, 0, fur);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 8, 9, 5, 0, Math.PI, Math.PI * 2); ctx.fill();   // 정수리
    blob(hx + 5, hy + 2, 6.5, 6.5, 0, skin);
    ctx.strokeStyle = line; ctx.lineWidth = 2;                                                            // 툭 튀어나온 눈썹
    ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + 10, hy - 3); ctx.stroke();
    ctx.fillStyle = boss ? "#ff5b4a" : "#120c0a";
    ctx.beginPath(); ctx.arc(hx + 6, hy - 0.5, boss ? 1.9 : 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1210";
    ctx.beginPath(); ctx.arc(hx + 9, hy + 4, 1, 0, Math.PI * 2); ctx.arc(hx + 6.5, hy + 4.3, 1, 0, Math.PI * 2); ctx.fill();
  };
  if (up > 0) {                                     // 일어서서 가슴을 친다
    const beat = Math.sin(ph * 3);
    limb(-7, -20, -9, 0, 10, dark); limb(7, -20, 9, 0, 10, fur);
    blob(0, -38, 18, 24, 0, fur);
    if (boss) { ctx.fillStyle = silver; ctx.beginPath(); ctx.ellipse(-8, -40, 6, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    blob(4, -34, 10, 13, 0, skin);                  // 가슴
    limb(-12, -50, 0 + beat * 3, -38 - beat * 3, 10, dark);
    limb(14, -50, 8 - beat * 3, -40 + beat * 3, 11, fur);
    blob(1 + beat * 3, -38 - beat * 3, 5.5, 5, 0, dark);
    blob(8 - beat * 3, -40 + beat * 3, 6, 5.5, 0, fur);
    face(4, -64);
    return;
  }
  // 주먹을 땅에 짚고 걷는다 — 먼 쪽 다리 · 팔, 몸통, 가까운 쪽 다리 · 팔, 머리 순서
  limb(-16, -22, -18 - sw, 0, 9, dark);
  limb(10, -40, 16 - sw, -2, 10, dark);
  blob(16 - sw, -2, 5, 4, 0, dark);
  blob(-2, -30, 25, 18, -0.28, fur);
  if (boss) { ctx.fillStyle = silver; ctx.beginPath(); ctx.ellipse(-8, -40, 15, 6, -0.28, 0, Math.PI * 2); ctx.fill(); }
  limb(-10, -20, -8 + sw, 0, 10, fur);
  limb(15, -38, 22 + sw, -2, 11, fur);
  blob(22 + sw, -2, 6, 4.5, 0, fur);
  face(24, -46);
}

function drawGorilla(ctx, m, time) {
  const k = m.size || 1;
  const grow = Math.min(1, (m.age || 0) / 0.35);
  const ph = (m.age || 0) * (m.boss ? 7 : 8);
  const bob = m.moving ? Math.abs(Math.sin(ph)) * 2 * k : 0;
  const x = m.x, y = m.y;
  shadow(ctx, x, y + 2, 30 * grow * k, 8 * grow * k, 0.32);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
  drawGorillaBody(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
  if (m.flash > 0) {
    ctx.globalAlpha = Math.min(0.6, m.flash * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(2, -34, 28, 24, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawMobMarks(ctx, m, time, (m.bite > 0 ? 78 : 60) * k + bob);
}

/* ── 고블린 · 오크 · 오우거 — 코드로 그린다. 오른쪽을 보고, (0, 0)이 발밑이다 ─────────────
   up 이 켜지면 고블린은 단검을 찌르고, 오크 · 오우거는 무기를 머리 위로 치켜든다(곧 내려친다). */
const lineCol = "rgba(18,14,10,0.9)";
function limbOf(ctx) {
  return (x0, y0, x1, y1, w, col) => {
    ctx.strokeStyle = lineCol; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
}
function blobOf(ctx) {
  return (x, y, rx, ry, rot, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = lineCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
}
function poly(ctx, pts, col) {
  ctx.fillStyle = col; ctx.strokeStyle = lineCol; ctx.lineWidth = 1.4;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// 고블린 — 작은 초록 몸, 큰 귀, 등에 멘 자루와 허리춤 주머니. 고블린 대장은 붉은 두건과 금 귀걸이
export function drawGoblinBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#cfe6f2" : boss ? "#6f9a4a" : "#86a95c";
  const dark = frozen ? "#9dc0d6" : boss ? "#4c6e30" : "#5e7d3e";
  const vest = frozen ? "#b9d3e2" : "#6b5638";
  const sack = frozen ? "#dcecf4" : "#b8956a";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-3, -14, -5 - sw, 0, 5, dark);                         // 먼 다리
  blob(-12, -27, 8, 10, -0.2, sack);                          // 등에 멘 자루
  ctx.strokeStyle = "#7a5b36"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-15, -36); ctx.lineTo(-8, -36); ctx.stroke();
  limb(3, -14, 5 + sw, 0, 5, skin);                           // 가까운 다리
  blob(0, -23, 9, 11, 0, vest);                               // 조끼
  ctx.strokeStyle = "#3e2e1c"; ctx.lineWidth = 3;             // 허리띠
  ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(9, -16); ctx.stroke();
  [[-6, -13, 4.5], [5, -12, 5]].forEach(([x, y, r]) => {      // 허리춤 주머니
    blob(x, y, r, r * 0.9, 0, frozen ? "#e2eff6" : "#a3794a");
    ctx.fillStyle = frozen ? "#c4dcea" : "#7c5732"; ctx.fillRect(x - r * 0.8, y - r * 0.9, r * 1.6, 2);
  });
  // 단검 든 팔 — 찌를 때 앞으로 뻗는다
  const hx = up > 0 ? 18 : 11, hy = up > 0 ? -25 : -19;
  limb(4, -28, hx, hy, 4, skin);
  ctx.strokeStyle = lineCol; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (up > 0 ? 14 : 9), hy - (up > 0 ? 1 : 5)); ctx.stroke();
  ctx.strokeStyle = frozen ? "#f2fbff" : "#d9dde2"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.lineTo(hx + (up > 0 ? 14 : 9), hy - (up > 0 ? 1 : 5)); ctx.stroke();
  // 머리 · 귀
  poly(ctx, [[-1, -41], [-15, -50], [-2, -35]], skin);
  blob(4, -39, 9, 8.5, 0, skin);
  poly(ctx, [[9, -43], [19, -50], [11, -37]], skin);
  if (boss) { blob(3, -46, 9, 4, 0, frozen ? "#e8f4fa" : "#b8483c"); ctx.fillStyle = "#e7c35a"; ctx.beginPath(); ctx.arc(-3, -33, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = boss ? "#ff7a4a" : "#f2e27a";
  ctx.beginPath(); ctx.arc(8, -40, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.arc(8.6, -40, 1, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [[11, -38], [16, -36], [11, -35]], skin);         // 뾰족한 코
  ctx.strokeStyle = lineCol; ctx.lineWidth = 1.2;              // 씩 웃는 입
  ctx.beginPath(); ctx.moveTo(6, -33); ctx.quadraticCurveTo(9, -31, 12, -33); ctx.stroke();
}

/* ── 200~400레벨 몹 — 언데드(스켈레톤 · 좀비 · 언데드 마법사)와 인조 몬스터(골렘 · 키메라 · 포식거미). 코드로 그린다 ───────────── */
// 스켈레톤 — 해골 몸에 쇠투구 · 어깨갑옷 · 푸른 눈빛. 스켈레톤 킹은 금관과 붉은 망토
export function drawSkeletalBody(ctx, ph, moving, boss, frozen, up) {
  const poly_ = (pts, col) => poly(ctx, pts, col);
  const steel = frozen ? "#d6e8f2" : "#59606b";
  drawSkeletonBody(ctx, ph, moving, boss, frozen, up);
  const blob = blobOf(ctx);
  if (boss) poly_([[-2, -36], [-14, -14], [-6, -12], [2, -30]], frozen ? "#e8f4fa" : "#8a2f3a");   // 망토
  blob(-2, -34, 6, 4, -0.3, steel);                           // 어깨갑옷
  blob(3.5, -45, 9.5, 6.5, 0, steel);                         // 투구
  ctx.fillStyle = frozen ? "#bfe6ff" : "#8fd0ff";             // 푸른 눈빛
  ctx.beginPath(); ctx.arc(1.4, -42, 1.3, 0, Math.PI * 2); ctx.arc(7.9, -42, 1.3, 0, Math.PI * 2); ctx.fill();
  if (boss) { poly_([[-3, -51], [-1, -58], [2, -52], [5, -59], [8, -52], [11, -58], [12, -51]], frozen ? "#fff6dc" : "#e7c35a"); }
}

// 좀비 — 구부정한 회녹색 몸, 찢어진 옷, 앞으로 뻗은 두 팔. 좀비 군주는 썩은 갑옷 조각과 붉은 눈
export function drawZombieBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#d3e6ee" : boss ? "#6f8a58" : "#82996a";
  const dark = frozen ? "#a6c4d6" : "#56684a";
  const rag = frozen ? "#c6dbe7" : "#5e5646";
  const sw = moving ? Math.sin(ph) * 3 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-4, -16, -6 - sw, 0, 6, dark);
  limb(4, -16, 6 + sw, 0, 6, skin);
  blob(0, -26, 10, 13, 0.18, rag);                            // 구부정한 몸통
  poly(ctx, [[-8, -14], [-5, -8], [-1, -13], [3, -7], [8, -14]], rag);   // 찢어진 옷자락
  if (boss) blob(-1, -32, 8, 6, 0, frozen ? "#bcd2e0" : "#6a6258");   // 썩은 어깨갑옷
  const reach = up > 0 ? 8 : 0;                               // 덮칠 때 팔이 더 앞으로
  limb(4, -33, 15 + reach, -29, 4.5, skin);
  limb(-1, -33, 12 + reach, -24, 4.5, dark);
  blob(5, -41, 8, 8, 0.1, skin);                              // 머리 — 앞으로 숙였다
  ctx.fillStyle = boss ? "#ff5b4a" : "#e8e3a0";
  ctx.beginPath(); ctx.arc(8, -42, 1.7, 0, Math.PI * 2); ctx.arc(3, -42, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = lineCol; ctx.lineWidth = 1.2;             // 벌어진 입
  ctx.beginPath(); ctx.moveTo(5, -37); ctx.lineTo(10, -37); ctx.stroke();
}

// 언데드 마법사 — 해진 보랏빛 로브 · 두건 아래 해골 얼굴 · 영혼구슬 지팡이. 리치 대마법사는 뼈 왕관과 큰 구슬
export function drawNecroBody(ctx, ph, moving, boss, frozen, up) {
  const robe = frozen ? "#cbd9ec" : boss ? "#4a2e6e" : "#5a3d80";
  const trim = frozen ? "#e2eef8" : "#8e6cc0";
  const bone = frozen ? "#e2f0f8" : "#ddd6c2";
  const glow = frozen ? "#bfe6ff" : boss ? "#e08bff" : "#b79be0";
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const sway = moving ? Math.sin(ph) * 2 : 0;
  poly(ctx, [[-11 + sway, 0], [-8, -30], [8, -30], [12 - sway, 0]], robe);   // 로브
  ctx.strokeStyle = trim; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-11 + sway, -1); ctx.lineTo(12 - sway, -1); ctx.stroke();
  // 지팡이 든 팔 — 구슬을 치켜들면 곧 터뜨린다
  const hx = up > 0 ? 12 : 13, hy = up > 0 ? -44 : -24;
  limb(5, -30, hx, hy, 3.5, robe);
  limb(hx, hy + 14, hx + 1, hy - 24, 2.5, frozen ? "#d9ebf4" : "#6e5236");
  const ox = hx + 1, oy = hy - 28, or_ = up > 0 ? (boss ? 11 : 8.5) : boss ? 8 : 6;
  const gr = ctx.createRadialGradient(ox, oy, 1, ox, oy, or_ * 2.4);
  gr.addColorStop(0, glow); gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr; ctx.fillRect(ox - or_ * 2.4, oy - or_ * 2.4, or_ * 4.8, or_ * 4.8);
  ctx.fillStyle = "#f4ecff"; ctx.beginPath(); ctx.arc(ox, oy, or_ * 0.6, 0, Math.PI * 2); ctx.fill();
  blob(0, -36, 9, 9.5, 0, robe);                              // 두건
  blob(3, -34, 5.5, 6, 0, bone);                              // 해골 얼굴
  ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.arc(1.5, -35, 1.6, 0, Math.PI * 2); ctx.arc(6, -35, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(1.7, -35, 0.8, 0, Math.PI * 2); ctx.arc(6.2, -35, 0.8, 0, Math.PI * 2); ctx.fill();
  if (boss) poly(ctx, [[-5, -43], [-3, -50], [0, -44], [3, -51], [6, -44], [9, -50], [9, -43]], frozen ? "#fff6dc" : "#e3dcc6");   // 뼈 왕관
}

// 골렘 — 이끼 낀 바위 덩어리 몸, 큰 주먹, 가슴의 빛나는 핵. 고대 골렘은 금빛 룬이 박힌다
export function drawGolemBody(ctx, ph, moving, boss, frozen, up) {
  const rock = frozen ? "#d3e4ee" : boss ? "#8b8070" : "#8f8a80";
  const dark = frozen ? "#a2c0d2" : boss ? "#625848" : "#66625a";
  const moss = frozen ? "#dcecf4" : "#6f8a5a";
  const core = frozen ? "#bfe6ff" : boss ? "#ffcf6a" : "#ff9a5a";
  const sw = moving ? Math.sin(ph) * 3 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-8, -22, -10 - sw, 0, 13, dark);
  limb(8, -22, 10 + sw, 0, 13, rock);
  blob(0, -42, 20, 22, 0, rock);                              // 몸통
  poly(ctx, [[-16, -52], [-8, -64], [-2, -54]], dark);
  blob(-9, -60, 8, 4, 0, moss);                               // 어깨의 이끼
  const ay = up > 0 ? -82 : -34;                              // 팔 — 치켜들면 곧 내려찍는다
  limb(-17, -52, -26, up > 0 ? -76 : -30, 11, dark);
  blob(-26, up > 0 ? -78 : -28, 8, 8, 0, dark);
  limb(15, -52, 28, ay, 11, rock);
  blob(28, ay - 2, 9, 9, 0, rock);
  blob(4, -64, 8, 7.5, 0, rock);                              // 머리
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(8, -65, 2.2, 0, Math.PI * 2); ctx.arc(1, -65, 1.8, 0, Math.PI * 2); ctx.fill();
  const gr = ctx.createRadialGradient(2, -44, 1, 2, -44, 14);   // 가슴 핵
  gr.addColorStop(0, core); gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr; ctx.fillRect(-12, -58, 28, 28);
  ctx.fillStyle = "#fff2cc"; ctx.beginPath(); ctx.arc(2, -44, 3, 0, Math.PI * 2); ctx.fill();
  if (boss) { ctx.strokeStyle = core; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-10, -34); ctx.lineTo(-4, -28); ctx.lineTo(0, -34); ctx.moveTo(8, -34); ctx.lineTo(13, -28); ctx.stroke(); }   // 룬
}

// 키메라 — 사자 몸에 사자 머리와 염소 머리, 뱀 꼬리. 키메라 왕은 박쥐 날개가 돋는다
export function drawChimeraBody(ctx, ph, moving, boss, frozen, up) {
  const fur = frozen ? "#e2eef6" : boss ? "#c98a4e" : "#d49a5e";
  const dark = frozen ? "#a8c6d8" : "#8a5a34";
  const goat = frozen ? "#e8f2f8" : "#cfc6b4";
  const snake = frozen ? "#c0dcea" : "#5f8a4a";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (boss) poly(ctx, [[-4, -36], [-24, -62], [-16, -40], [-30, -46], [-18, -30]], frozen ? "#c6dbe7" : "#5a3a4a");   // 날개
  limb(-16, -20, -18 - sw, 0, 6, dark);                       // 뒷다리
  limb(14, -20, 16 + sw, 0, 6, dark);                         // 앞다리
  limb(-10, -20, -10 + sw, 0, 6, fur);
  limb(20, -20, 24 - sw, 0, 6, fur);
  blob(0, -28, 24, 12, 0, fur);                               // 몸통
  // 뱀 꼬리
  ctx.strokeStyle = lineCol; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-22, -30); ctx.quadraticCurveTo(-36, -44 + sw, -30, -54); ctx.stroke();
  ctx.strokeStyle = snake; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-22, -30); ctx.quadraticCurveTo(-36, -44 + sw, -30, -54); ctx.stroke();
  blob(-30, -56, 3.5, 3, 0, snake);
  // 염소 머리(등 쪽) · 사자 머리
  blob(6, -46, 6, 6, 0, goat);
  poly(ctx, [[3, -50], [-2, -60], [6, -52]], frozen ? "#fff" : "#7a6a52");
  poly(ctx, [[9, -50], [13, -60], [11, -51]], frozen ? "#fff" : "#7a6a52");
  const bite = up > 0 ? 4 : 0;
  blob(26 + bite, -36, 10, 9.5, 0, dark);                     // 갈기
  blob(28 + bite, -34, 7.5, 7, 0, fur);
  ctx.fillStyle = boss ? "#ff5b4a" : "#2a1a10";
  ctx.beginPath(); ctx.arc(31 + bite, -37, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = lineCol; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(31 + bite, -31); ctx.lineTo(36 + bite, up > 0 ? -28 : -31); ctx.stroke();
  poly(ctx, [[33 + bite, -31], [34 + bite, -27], [35.5 + bite, -31]], "#f6efe0");
}

// 포식거미 — 검은 몸 · 붉은 눈 여럿 · 여덟 다리. 포식거미 여왕은 등의 붉은 무늬와 큰 몸집
export function drawSpiderBody(ctx, ph, moving, boss, frozen, up) {
  const body = frozen ? "#d6e6f0" : boss ? "#2a2036" : "#2c2a36";
  const leg = frozen ? "#a8c6d8" : "#1c1a24";
  const mark = frozen ? "#f2fbff" : "#d8483c";
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (let k = 0; k < 4; k++) {                               // 다리 — 앞뒤 번갈아 걷는다
    const sw = moving ? Math.sin(ph + k * 1.6) * 4 : 0;
    const bx = -10 + k * 8, kx = bx + (k < 2 ? -10 : 8) + sw, tipx = bx + (k < 2 ? -18 : 16) + sw * 1.4;
    limb(bx, -22, kx, -40, 3, leg); limb(kx, -40, tipx, 0, 3, leg);       // 가까운 쪽
    limb(bx + 3, -22, kx + 4, -34, 2.4, leg); limb(kx + 4, -34, tipx + 5, 0, 2.4, leg);   // 먼 쪽
  }
  blob(-9, -24, 13, 11, 0, body);                             // 배
  if (boss) { poly(ctx, [[-14, -28], [-8, -36], [-2, -28], [-8, -20]], mark); }
  else { ctx.fillStyle = mark; ctx.beginPath(); ctx.arc(-9, -26, 2.4, 0, Math.PI * 2); ctx.fill(); }
  blob(8, -24, 8, 7.5, 0, body);                              // 머리가슴
  const bite = up > 0 ? 4 : 0;
  poly(ctx, [[14 + bite, -20], [19 + bite, -14], [15 + bite, -17]], frozen ? "#fff" : "#c9c2b4");   // 독니
  poly(ctx, [[11 + bite, -19], [15 + bite, -12], [12 + bite, -16]], frozen ? "#fff" : "#c9c2b4");
  ctx.fillStyle = frozen ? "#bfe6ff" : "#ff5b4a";             // 눈 여럿
  [[11, -28, 1.6], [7, -29, 1.3], [13.5, -25, 1.2], [9, -26, 1], [5, -26, 1]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
}

/* ── 400~800레벨 몹 — 화염(불정령 · 용암골렘 · 화염룡 · 이프리트)과 심연(망령기사 · 심해괴수 · 공허술사 · 타락천사). 코드로 그린다 ─────
   그라데이션은 쓰지 않는다(한 프레임에 수십 마리 — 둥근 빛은 반투명 원 겹으로) */
const glowDot = (ctx, x, y, r, col, a) => {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
  [1, 0.65, 0.35].forEach((k) => { ctx.beginPath(); ctx.arc(x, y, r * k, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
};
// 불정령 — 떠 있는 불꽃 몸 · 일렁이는 머리 불길 · 하얀 눈. 군주는 불꽃 왕관과 큰 불길
export function drawFspiritBody(ctx, ph, moving, boss, frozen, up) {
  const outer = frozen ? "#cfe4f0" : boss ? "#e2502c" : "#f07a3a", inner = frozen ? "#eef8fc" : "#ffc46a", core = frozen ? "#fff" : "#fff2c8";
  const fl = Math.sin(ph * 1.6) * 2, lift = -8 + Math.sin(ph * 0.8) * 2;
  glowDot(ctx, 0, -30 + lift, 22, inner, 0.18);
  poly(ctx, [[-11, -14 + lift], [-14, -32 + lift], [-8 + fl, -50 + lift], [-2, -40 + lift], [3 - fl, -60 + lift], [8, -42 + lift], [13 + fl, -52 + lift], [14, -30 + lift], [10, -14 + lift], [0, -6 + lift]], outer);
  poly(ctx, [[-6, -16 + lift], [-8, -30 + lift], [-2, -38 + lift], [3, -46 + lift], [7, -34 + lift], [7, -18 + lift], [0, -12 + lift]], inner);
  const reach = up > 0 ? 6 : 0;                                 // 던질 때 불덩이를 앞으로
  glowDot(ctx, 14 + reach, -28 + lift, 6, core, 0.9);
  ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(-1, -30 + lift, 2, 2.8, 0, 0, Math.PI * 2); ctx.ellipse(5, -30 + lift, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  if (boss) poly(ctx, [[-7, -52 + lift], [-5, -62 + lift], [-1, -55 + lift], [3, -64 + lift], [6, -55 + lift], [10, -62 + lift], [11, -52 + lift]], frozen ? "#fff6dc" : "#ffd36a");
}
// 용암골렘 — 검게 굳은 용암 바위 몸 · 갈라진 틈의 붉은 빛 · 큰 주먹. 거신은 등의 화산 봉우리
export function drawLavagolemBody(ctx, ph, moving, boss, frozen, up) {
  const rock = frozen ? "#d3e4ee" : boss ? "#3c2c28" : "#4a3a34", dark = frozen ? "#a2c0d2" : "#2a1e1a", lava = frozen ? "#bfe6ff" : "#ff7a3a";
  const sw = moving ? Math.sin(ph) * 3 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-8, -22, -10 - sw, 0, 13, dark); limb(8, -22, 10 + sw, 0, 13, rock);
  if (boss) poly(ctx, [[-16, -56], [-10, -74], [-4, -70], [0, -80], [6, -60]], dark);
  blob(0, -42, 20, 22, 0, rock);
  ctx.strokeStyle = lava; ctx.lineWidth = 2.2;                  // 갈라진 틈
  ctx.beginPath(); ctx.moveTo(-12, -52); ctx.lineTo(-4, -44); ctx.lineTo(-8, -34); ctx.moveTo(6, -56); ctx.lineTo(10, -46); ctx.lineTo(4, -36); ctx.lineTo(9, -26); ctx.stroke();
  if (boss) glowDot(ctx, 0, -78, 7, lava, 0.7);
  const ay = up > 0 ? -84 : -34;                                // 치켜들면 곧 던진다
  limb(-17, -52, -26, -30, 11, dark); blob(-26, -28, 8, 8, 0, dark);
  limb(15, -52, 26, ay, 11, rock); blob(26, ay - 2, 9, 9, 0, rock);
  if (up > 0) glowDot(ctx, 26, ay - 14, 9, lava, 0.85);
  blob(4, -64, 8, 7.5, 0, rock);
  ctx.fillStyle = lava; ctx.beginPath(); ctx.arc(8, -65, 2.2, 0, Math.PI * 2); ctx.arc(1, -65, 1.8, 0, Math.PI * 2); ctx.fill();
}
// 화염룡 — 붉은 비늘 · 날개 · 긴 목과 뿔. 숨결을 준비하면 입이 빛난다. 왕은 금빛 뿔과 큰 날개
export function drawFiredrakeBody(ctx, ph, moving, boss, frozen, up) {
  const scale = frozen ? "#e2eef6" : boss ? "#a8302a" : "#c44a32", belly = frozen ? "#f2f8fc" : "#f0b070", wing = frozen ? "#c6dbe7" : "#7a2a2a";
  const horn = frozen ? "#fff" : boss ? "#e7c35a" : "#e8dcc4";
  const sw = moving ? Math.sin(ph) * 5 : 0, flap = Math.sin(ph * 0.9) * 6;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  poly(ctx, [[-6, -34], [-30, -66 - flap], [-22, -46], [-38, -52 - flap], [-20, -32]], wing);   // 날개
  limb(-14, -18, -16 - sw, 0, 6, scale); limb(12, -18, 14 + sw, 0, 6, scale);
  ctx.strokeStyle = lineCol; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-20, -26); ctx.quadraticCurveTo(-36, -22, -40, -10 + sw * 0.4); ctx.stroke();   // 꼬리
  ctx.strokeStyle = scale; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-20, -26); ctx.quadraticCurveTo(-36, -22, -40, -10 + sw * 0.4); ctx.stroke();
  blob(0, -26, 22, 12, 0, scale); blob(2, -21, 14, 5, 0, belly);
  limb(16, -32, 24, -48, 7, scale);                             // 목
  blob(28, -50, 9, 7, 0.2, scale);                              // 머리
  poly(ctx, [[24, -55], [18, -66], [27, -57]], horn); poly(ctx, [[29, -56], [27, -68], [32, -57]], horn);
  ctx.fillStyle = "#ffd36a"; ctx.beginPath(); ctx.arc(30, -52, 1.5, 0, Math.PI * 2); ctx.fill();
  if (up > 0) glowDot(ctx, 37, -48, 8, "#ffc46a", 0.8);
  if (boss) poly(ctx, [[2, -34], [28, -78 - flap], [20, -52], [36, -60 - flap], [14, -36]], wing);   // 큰 날개 한 쌍 더
}
// 이프리트 — 아래가 불꽃으로 흩어지는 붉은 몸 · 금 팔찌 · 뿔. 대군주는 불꽃 왕관과 금 목걸이
export function drawIfritBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#d6e8f2" : boss ? "#b8402a" : "#d0583a", fire = frozen ? "#eef8fc" : "#ffb04a", gold = frozen ? "#fff6dc" : "#e7c35a";
  const fl = Math.sin(ph * 1.7) * 2, lift = Math.sin(ph * 0.7) * 2 - 4;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  poly(ctx, [[-10, -24 + lift], [-8 + fl, -6 + lift], [-2, -12 + lift], [2 - fl, 0 + lift], [6, -12 + lift], [10 + fl, -4 + lift], [10, -24 + lift]], fire);   // 불꽃 하반신
  blob(0, -34 + lift, 12, 14, 0, skin);
  const hy = up > 0 ? -66 : -30;                                // 팔을 치켜들면 불기둥
  limb(-10, -42 + lift, -18, hy + lift, 5, skin); limb(10, -42 + lift, 18, hy + lift, 5, skin);
  blob(-18, hy + lift, 3.5, 2.5, 0, gold); blob(18, hy + lift, 3.5, 2.5, 0, gold);
  if (up > 0) { glowDot(ctx, -18, hy - 8 + lift, 7, fire, 0.8); glowDot(ctx, 18, hy - 8 + lift, 7, fire, 0.8); }
  blob(2, -54 + lift, 8, 8, 0, skin);
  poly(ctx, [[-3, -59 + lift], [-8, -70 + lift], [-1, -61 + lift]], gold); poly(ctx, [[6, -60 + lift], [10, -71 + lift], [8, -60 + lift]], gold);
  ctx.fillStyle = "#fff2c8"; ctx.beginPath(); ctx.arc(1, -55 + lift, 1.6, 0, Math.PI * 2); ctx.arc(6, -55 + lift, 1.6, 0, Math.PI * 2); ctx.fill();
  if (boss) { poly(ctx, [[-4, -63 + lift], [-1, -74 + lift + fl], [2, -64 + lift], [5, -76 + lift - fl], [8, -63 + lift]], fire); blob(1, -44 + lift, 7, 2.5, 0, gold); }
}
// 망령기사 — 금이 간 검은 갑옷 · 투구 틈의 푸른 혼불 · 낡은 망토 · 긴 검. 기사단장은 깃털 장식과 푸른 갑옷 테
export function drawWraithBody(ctx, ph, moving, boss, frozen, up) {
  const plate = frozen ? "#d6e6f0" : boss ? "#2e3448" : "#3a4052", trim = frozen ? "#fff" : boss ? "#8fb0e8" : "#6a7488";
  const cloak = frozen ? "#c6dbe7" : "#22283a", soul = frozen ? "#e8f8ff" : "#9fd0ff";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  poly(ctx, [[-4, -40], [-16 - sw * 0.5, -4], [-6, -8], [-2, -2], [2, -30]], cloak);   // 망토
  limb(-3, -16, -5 - sw, 0, 5, plate); limb(3, -16, 5 + sw, 0, 5, plate);
  blob(0, -28, 9, 14, 0, plate);
  ctx.strokeStyle = trim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(6, -22); ctx.stroke();
  // 검 — 치켜들면 곧 검기를 날린다
  const a = up > 0 ? -1.9 : -0.5, hx = 9, hy = up > 0 ? -44 : -28;
  limb(5, -36, hx, hy, 4, plate);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  ctx.fillStyle = frozen ? "#fff" : "#c8d4e8"; ctx.strokeStyle = lineCol; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(30, -1.5); ctx.lineTo(33, 0); ctx.lineTo(30, 1.5); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = trim; ctx.fillRect(-2, -5, 3, 10);
  ctx.restore();
  if (up > 0) glowDot(ctx, hx + Math.cos(a) * 26, hy + Math.sin(a) * 26, 6, soul, 0.6);
  blob(2, -48, 7.5, 8, 0, plate);                               // 투구
  ctx.fillStyle = "#0c0e14"; ctx.fillRect(1, -50, 8, 2.6);
  ctx.fillStyle = soul; ctx.beginPath(); ctx.arc(3, -49, 1.2, 0, Math.PI * 2); ctx.arc(7, -49, 1.2, 0, Math.PI * 2); ctx.fill();
  if (boss) poly(ctx, [[-2, -55], [-10, -70], [-4, -66], [-6, -76], [2, -58]], frozen ? "#fff" : "#8fb0e8");   // 깃털 장식
}
// 심해괴수 — 푸른 아귀 몸 · 머리의 등불 촉수 · 큰 입과 이빨 · 지느러미 다리. 레비아탄은 등지느러미와 큰 몸
export function drawAbyssBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#d6e8f2" : boss ? "#24486a" : "#2e5a7a", belly = frozen ? "#f2f8fc" : "#7aa8c0", lure = frozen ? "#fff" : "#bff0ff";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-12, -14, -16 - sw, 0, 7, skin); limb(10, -14, 14 + sw, 0, 7, skin);
  poly(ctx, [[-24, -30], [-36, -42 + sw * 0.5], [-34, -20 + sw * 0.5]], skin);   // 꼬리지느러미
  if (boss) poly(ctx, [[-14, -44], [-8, -60], [-2, -48], [4, -62], [10, -46]], frozen ? "#c6dbe7" : "#1a3a58");
  blob(0, -30, 24, 17, 0, skin); blob(4, -22, 16, 7, 0, belly);
  const gape = up > 0 ? 7 : 2;                                  // 뱉을 때 입을 크게 벌린다
  poly(ctx, [[14, -32], [28, -36 - gape], [28, -26 + gape], [14, -24]], "#1a1418");
  ctx.fillStyle = "#f4ecd8";
  [0, 1, 2].forEach((i) => { poly(ctx, [[17 + i * 4, -33 - gape * 0.6], [18.5 + i * 4, -29], [20 + i * 4, -33 - gape * 0.6]], "#f4ecd8"); });
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -46); ctx.quadraticCurveTo(18, -62, 26, -54); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(8, -46); ctx.quadraticCurveTo(18, -62, 26, -54); ctx.stroke();
  glowDot(ctx, 26, -52, 5 + Math.sin(ph) * 0.8, lure, 0.85);
  ctx.fillStyle = "#e8f6ff"; ctx.beginPath(); ctx.arc(10, -38, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0c1018"; ctx.beginPath(); ctx.arc(10.6, -38, 1.1, 0, Math.PI * 2); ctx.fill();
}
// 공허술사 — 검보랏빛 로브 · 얼굴 대신 빈 어둠 속 두 눈 · 떠도는 공허 구슬. 대현자는 떠 있는 고리와 큰 구슬
export function drawVoidmageBody(ctx, ph, moving, boss, frozen, up) {
  const robe = frozen ? "#cbd9ec" : boss ? "#24163a" : "#2e1e48", trim = frozen ? "#e2eef8" : "#9a7ae8", eye = frozen ? "#e8f8ff" : "#d8c8ff";
  const sway = moving ? Math.sin(ph) * 2 : 0, lift = Math.sin(ph * 0.8) * 1.5;
  const blob = blobOf(ctx);
  poly(ctx, [[-12 + sway, 0], [-8, -32], [8, -32], [13 - sway, 0], [6, -4], [0, 2], [-6, -4]], robe);
  ctx.strokeStyle = trim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-1, -2); ctx.moveTo(4, -30); ctx.lineTo(3, -2); ctx.stroke();
  blob(0, -40, 9.5, 10, 0, robe);                               // 두건
  ctx.fillStyle = "#06040c"; ctx.beginPath(); ctx.ellipse(3, -38, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(1.5, -39, 1.2, 0, Math.PI * 2); ctx.arc(5.5, -39, 1.2, 0, Math.PI * 2); ctx.fill();
  const r = up > 0 ? (boss ? 10 : 8) : boss ? 7 : 5.5, ox = 16, oy = (up > 0 ? -58 : -36) + lift;   // 공허 구슬 — 치켜들면 곧 터뜨린다
  glowDot(ctx, ox, oy, r * 2, "#7a5ad8", 0.35);
  ctx.fillStyle = "#0a0614"; ctx.beginPath(); ctx.arc(ox, oy, r * 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, r * 0.75, 0, Math.PI * 2); ctx.stroke();
  if (boss) { ctx.strokeStyle = trim; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(1, -54 + lift, 12, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
}
// 타락천사 — 검게 물든 날개 · 깨진 후광 · 잿빛 갑옷 · 붉은 눈. 천사장은 여섯 날개와 금이 간 금빛 후광
export function drawFallenBody(ctx, ph, moving, boss, frozen, up) {
  const wing = frozen ? "#d6e6f0" : boss ? "#2a1e2e" : "#3a2c3e", feather = frozen ? "#fff" : "#6a5070", armor = frozen ? "#e2eef6" : "#8a8494";
  const skin = frozen ? "#e8f2f8" : "#e6d2c8", halo = frozen ? "#fff6dc" : boss ? "#e7c35a" : "#b8a8a0";
  const flap = Math.sin(ph * 0.9) * 5, sw = moving ? Math.sin(ph) * 3 : 0, lift = -4 + Math.sin(ph * 0.7) * 2;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const wingAt = (dy, k) => {
    poly(ctx, [[-2, -40 + lift + dy], [-26 * k, -70 - flap + lift + dy], [-20 * k, -56 + lift + dy], [-34 * k, -58 - flap + lift + dy], [-18 * k, -42 + lift + dy], [-28 * k, -36 + lift + dy], [-6, -30 + lift + dy]], wing);
    ctx.strokeStyle = feather; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -40 + lift + dy); ctx.lineTo(-24 * k, -60 - flap + lift + dy); ctx.stroke();
  };
  if (boss) wingAt(-10, 1.15);
  wingAt(0, 1);
  limb(-3, -16 + lift, -5 - sw, 0 + lift, 4.5, armor); limb(3, -16 + lift, 5 + sw, 0 + lift, 4.5, armor);
  blob(0, -30 + lift, 9, 13, 0, armor);
  const hx = up > 0 ? 16 : 10, hy = up > 0 ? -50 : -26;        // 깃털을 날리려 팔을 든다
  limb(5, -38 + lift, hx, hy + lift, 3.5, skin);
  if (up > 0) glowDot(ctx, hx, hy - 4 + lift, 6, "#c8a0d8", 0.7);
  blob(2, -48 + lift, 7, 7.5, 0, skin);
  ctx.fillStyle = "#3a2a2a"; ctx.beginPath(); ctx.arc(-1, -52 + lift, 7, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();   // 머리카락
  ctx.fillStyle = "#e0484a"; ctx.beginPath(); ctx.arc(5, -48 + lift, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = halo; ctx.lineWidth = 1.8;                 // 깨진 후광
  ctx.beginPath(); ctx.ellipse(1, -60 + lift, 8, 2.6, 0, 0.3, Math.PI * 1.6); ctx.stroke();
}

// 해골 — 모르가스가 부르는 졸개. 빛바랜 뼈 · 갈비뼈 · 녹슨 칼 · 초록 눈빛(모르가스와 같은 빛)
export function drawSkeletonBody(ctx, ph, moving, boss, frozen, up) {
  const bone = frozen ? "#e2f0f8" : "#ddd6c2";
  const shade = frozen ? "#b4d0e0" : "#a69d86";
  const sw = moving ? Math.sin(ph) * 4 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-3, -14, -5 - sw, 0, 3, shade);                        // 먼 다리
  limb(3, -14, 5 + sw, 0, 3, bone);                           // 가까운 다리
  blob(0, -14, 6, 3, 0, shade);                               // 골반
  ctx.strokeStyle = bone; ctx.lineWidth = 2.6;                // 등뼈
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -34); ctx.stroke();
  ctx.lineWidth = 2;                                           // 갈비뼈
  for (let k = 0; k < 4; k++) {
    const y = -31 + k * 4, w = 8 - k;
    ctx.beginPath(); ctx.moveTo(-w, y + 1.5); ctx.quadraticCurveTo(0, y - 2.5, w, y + 1.5); ctx.stroke();
  }
  // 칼 든 팔 — 칠 때 앞으로 뻗는다
  const hx = up > 0 ? 17 : 10, hy = up > 0 ? -27 : -20;
  limb(3, -32, hx, hy, 2.6, bone);
  ctx.strokeStyle = frozen ? "#f2fbff" : "#8a6a4a"; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (up > 0 ? 16 : 10), hy - (up > 0 ? 2 : 12)); ctx.stroke();
  ctx.strokeStyle = frozen ? "#ffffff" : "#b8b2a4"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hx + 1, hy); ctx.lineTo(hx + (up > 0 ? 16 : 10), hy - (up > 0 ? 2 : 12)); ctx.stroke();
  // 머리 — 해골 · 턱 · 초록 눈빛
  blob(3, -42, 8.5, 8, 0, bone);
  blob(5, -35.5, 5, 2.6, 0, shade);
  ctx.fillStyle = "#1a1612";
  ctx.beginPath(); ctx.arc(1, -42, 2.4, 0, Math.PI * 2); ctx.arc(7.5, -42, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = frozen ? "#bfe6ff" : "#7fe0a0";
  ctx.beginPath(); ctx.arc(1.4, -42, 1.1, 0, Math.PI * 2); ctx.arc(7.9, -42, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1612"; ctx.lineWidth = 0.8;           // 이빨 줄
  ctx.beginPath(); ctx.moveTo(2, -36.5); ctx.lineTo(9, -36.5); ctx.stroke();
}

// 오크 — 회녹색 근육, 아래 엄니, 도끼. 오크 족장은 뿔 투구와 붉은 전투 무늬
export function drawOrcBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#cfe3ee" : boss ? "#6f8058" : "#7f9268";
  const dark = frozen ? "#a2c2d4" : "#4a3c30";
  const strap = frozen ? "#c0d7e4" : "#5d4630";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-6, -20, -8 - sw, 0, 8, dark);
  limb(-10, -42, -16, up > 0 ? -66 : -24, 7, skin);           // 먼 팔
  limb(6, -20, 8 + sw, 0, 8, dark);
  blob(0, -34, 16, 18, 0, skin);                              // 몸통
  ctx.strokeStyle = strap; ctx.lineWidth = 4;                 // 어깨끈
  ctx.beginPath(); ctx.moveTo(-12, -46); ctx.lineTo(12, -22); ctx.stroke();
  ctx.fillStyle = dark; ctx.fillRect(-14, -21, 28, 6);        // 허리
  if (boss) { ctx.strokeStyle = "#b5473c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(4, -36); ctx.moveTo(-6, -34); ctx.lineTo(4, -30); ctx.stroke(); }
  // 도끼 — 평소에는 비스듬히 들고, 치켜들면 머리 위로
  const hx = up > 0 ? 4 : 18, hy = up > 0 ? -76 : -28;
  const tx = up > 0 ? -12 : 24, ty = up > 0 ? -104 : -64;
  limb(10, -44, hx, hy, 8, skin);
  limb(hx, hy, tx, ty, 3.5, frozen ? "#d6e8f2" : "#6e5236");
  const a = Math.atan2(ty - hy, tx - hx);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
  poly(ctx, [[-4, 0], [-10, 13], [6, 14], [4, 0]], frozen ? "#eef8fc" : "#b9bcc0");
  ctx.restore();
  blob(hx, hy, 4.5, 4.5, 0, skin);
  // 머리 — 엄니 · 눈썹 · 상투(족장은 뿔 투구)
  blob(8, -56, 11, 10.5, 0, skin);
  if (boss) {
    blob(7, -63, 11, 6, 0, frozen ? "#e6f2f8" : "#5a5550");
    poly(ctx, [[-2, -66], [-9, -80], [2, -69]], "#e8dcc6"); poly(ctx, [[14, -67], [22, -80], [16, -64]], "#e8dcc6");
  } else {
    ctx.fillStyle = "#2a221c"; ctx.beginPath(); ctx.ellipse(3, -66, 4, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(8, -59); ctx.lineTo(17, -58); ctx.stroke();
  ctx.fillStyle = boss ? "#ff5b4a" : "#2a1a10"; ctx.beginPath(); ctx.arc(13, -56, 1.7, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [[12, -50], [13.5, -55], [15, -50]], "#f4ecd8");
  poly(ctx, [[16, -50], [17.5, -54.5], [19, -50.5]], "#f4ecd8");
}

// 오우거 — 큰 배, 작은 머리, 가시 몽둥이. 오우거 왕은 왕관과 붉은 눈
export function drawOgreBody(ctx, ph, moving, boss, frozen, up) {
  const skin = frozen ? "#d5e6ef" : boss ? "#9a7a5e" : "#b59a78";
  const dark = frozen ? "#a6c4d6" : boss ? "#6e5440" : "#87705a";
  const cloth = frozen ? "#c6dbe7" : "#5f4a36";
  const wood = frozen ? "#d9ebf4" : "#7a5a3a";
  const sw = moving ? Math.sin(ph) * 5 : 0;
  const limb = limbOf(ctx), blob = blobOf(ctx);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  limb(-9, -18, -11 - sw, 0, 11, dark);
  limb(-16, -48, up > 0 ? -18 : -24, up > 0 ? -76 : -24, 10, dark);   // 먼 팔
  limb(9, -18, 11 + sw, 0, 11, skin);
  blob(0, -36, 23, 23, 0, skin);                              // 큰 배
  blob(4, -30, 12, 11, 0, frozen ? "#e2eef5" : "#c9b08e");
  poly(ctx, [[-20, -20], [20, -20], [14, -6], [-14, -6]], cloth);   // 허리 두른 천
  // 몽둥이 — 평소에는 땅에 끌고, 치켜들면 머리 위로
  const hx = up > 0 ? 6 : 24, hy = up > 0 ? -82 : -30;
  const tx = up > 0 ? -16 : 40, ty = up > 0 ? -116 : -2;
  limb(14, -50, hx, hy, 11, skin);
  const a = Math.atan2(ty - hy, tx - hx), len = Math.hypot(tx - hx, ty - hy);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  poly(ctx, [[0, -3], [len, -8], [len + 4, 0], [len, 8], [0, 3]], wood);
  ctx.fillStyle = frozen ? "#f2fbff" : "#d8d0c0";
  [0.55, 0.75, 0.92].forEach((t) => {
    ctx.beginPath(); ctx.moveTo(len * t, -6 * t - 2); ctx.lineTo(len * t + 2, -6 * t - 7); ctx.lineTo(len * t + 4, -6 * t - 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(len * t, 6 * t + 2); ctx.lineTo(len * t + 2, 6 * t + 7); ctx.lineTo(len * t + 4, 6 * t + 2); ctx.fill();
  });
  ctx.restore();
  blob(hx, hy, 6, 6, 0, skin);
  // 작은 머리 — 아래턱이 나온 얼굴
  blob(12, -63, 10, 9.5, 0, skin);
  blob(16, -57, 7, 4.5, 0, dark);
  if (boss) poly(ctx, [[4, -70], [6, -79], [10, -73], [13, -80], [16, -73], [20, -78], [20, -69]], "#e2c063");
  ctx.fillStyle = boss ? "#ff5b4a" : "#1c120c";
  ctx.beginPath(); ctx.arc(17, -65, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, -68); ctx.lineTo(20, -67); ctx.stroke();
  poly(ctx, [[15, -59], [16, -63], [17.5, -59]], "#f4ecd8");
}

// 셋을 같은 틀로 그린다 — 크기 · 그림자 · 맞았을 때 반짝임 · 머리 위 표시. top 은 머리 높이(크기 1 기준)
function bruteDrawer(body, shadowR, top, upTop) {
  return (ctx, m, time) => {
    const k = m.size || 1;
    const grow = Math.min(1, (m.age || 0) / 0.35);
    const ph = (m.age || 0) * (m.boss ? 8 : 9);
    const bob = m.moving ? Math.abs(Math.sin(ph)) * 2 * k : 0;
    shadow(ctx, m.x, m.y + 2, shadowR * grow * k, shadowR * 0.28 * grow * k, 0.32);
    ctx.save();
    ctx.translate(m.x, m.y - bob);
    ctx.scale((m.ax < 0 ? -1 : 1) * grow * k, grow * k);
    body(ctx, ph, m.moving, m.boss, m.freeze > 0, m.bite);
    if (m.flash > 0) {
      ctx.globalAlpha = Math.min(0.6, m.flash * 5);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(2, -top * 0.5, shadowR, top * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    drawMobMarks(ctx, m, time, (m.bite > 0 ? upTop : top) * k + bob);
  };
}
const drawGoblin = bruteDrawer(drawGoblinBody, 16, 52, 52);
const drawOrc = bruteDrawer(drawOrcBody, 22, 72, 100);
const drawOgre = bruteDrawer(drawOgreBody, 28, 76, 112);
const drawSkeleton = bruteDrawer(drawSkeletonBody, 15, 52, 52);
const drawSkeletal = bruteDrawer(drawSkeletalBody, 17, 60, 60);
const drawZombie = bruteDrawer(drawZombieBody, 18, 54, 62);
const drawNecro = bruteDrawer(drawNecroBody, 16, 66, 78);
const drawGolem = bruteDrawer(drawGolemBody, 30, 76, 100);
const drawChimera = bruteDrawer(drawChimeraBody, 32, 66, 66);
const drawSpider = bruteDrawer(drawSpiderBody, 26, 46, 50);
const drawFspirit = bruteDrawer(drawFspiritBody, 14, 66, 70);
const drawLavagolem = bruteDrawer(drawLavagolemBody, 30, 76, 100);
const drawFiredrake = bruteDrawer(drawFiredrakeBody, 30, 64, 70);
const drawIfrit = bruteDrawer(drawIfritBody, 16, 70, 80);
const drawWraith = bruteDrawer(drawWraithBody, 16, 60, 64);
const drawAbyss = bruteDrawer(drawAbyssBody, 30, 56, 62);
const drawVoidmage = bruteDrawer(drawVoidmageBody, 16, 56, 70);
const drawFallen = bruteDrawer(drawFallenBody, 16, 68, 74);

/* 던전 보스 — 그림 시트에서 자른 자세(tools/cut-bosses.py)를 같은 배율로 발밑 가운데에 맞춰 그린다.
   idle · move 는 프레임 목록(돌아가며), 기술 자세(slam · charge · attack)는 있는 보스만. 그림을 못 불러오면 오우거 몸을 크게 그려 대신한다.
   pose 비트는 rpg.js stepDgBoss — 1 기술 준비(warnR 둘레) · 2 돌진 준비 · 4 돌진 · 8 철벽 · 16 광폭화 · 32 잔상 */
const frames = (name, n) => Array.from({ length: n }, (_, i) => `${name}${i}`);
const BOSS_ART = {
  gramor: { scale: 2.2, idle: ["idle"], move: ["idle", "move"], slam: "slam", charge: "charge", attack: "attack" },
  argas: { scale: 1.25, idle: ["idle"], move: frames("walk", 4), glow: "#ff9a50" },   // 방패 기사(bosses-3 가운데 줄)
  morgas: { scale: 0.95, idle: frames("idle", 4), move: frames("walk", 4), glow: "#7fe0a0" },
  barkanon: { scale: 1.15, idle: ["idle"], move: frames("walk", 4), glow: "#ff7a50" },
  serka: { scale: 1.12, idle: ["idle"], move: frames("walk", 4), glow: "#8fc8ff" },
};
const bossImg = (type, pose) => mapImg(`${RPG_ART}/boss/${type}-${pose}.webp`);
function drawDungeonBoss(ctx, m, time) {
  const A = BOSS_ART[m.type] || BOSS_ART.gramor;
  const grow = Math.min(1, (m.age || 0) / 0.5);
  const pose = m.pose || 0;
  const x = m.x, y = m.y;
  // 대지 강타 준비 — 내려칠 둘레를 붉게 깜빡인다
  if (pose & 1) {
    const p = 0.5 + 0.5 * Math.sin(time * 14);
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, RPG.squash);
    ctx.fillStyle = `rgba(230,90,50,${0.12 + 0.12 * p})`;
    ctx.strokeStyle = `rgba(255,150,90,${0.5 + 0.4 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, m.warnR || 200, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  shadow(ctx, x, y + 2, 70 * grow, 20 * grow, 0.35);
  // 맞을 때는 자세를 바꾸지 않고 밝게만(쉴 새 없이 맞아 깜빡이지 않게)
  const list = m.moving ? A.move : A.idle;
  const name = (pose & 4 && A.charge) || (pose & 1 && A.slam) || ((pose & 2 || m.bite > 0) && A.attack)
    || list[Math.floor(time * (m.moving ? 6 : 3)) % list.length];
  const img = bossImg(m.type, name) || bossImg(m.type, A.idle[0]);
  // 잔상 — 뒤로 흐린 그림 둘
  if (pose & 32 && img) {
    const w = img.width * A.scale, h = img.height * A.scale;
    [-1, 1].forEach((k) => {
      ctx.save(); ctx.globalAlpha = 0.28;
      ctx.translate(x + k * 46 + Math.sin(time * 9 + k) * 6, y);
      ctx.scale(m.ax < 0 ? -1 : 1, 1);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
    });
  }
  // 기술 준비 · 광폭화 — 몸 둘레 빛(그림에 기술 자세가 없는 보스)
  if ((pose & 16 || (pose & 3 && !A.slam)) && img) {
    const h = img.height * A.scale;
    ctx.save();
    const glow = pose & 16 ? "rgba(255,80,60,0.42)" : A.glow || "#ffb070";
    const gr = ctx.createRadialGradient(x, y - h * 0.45, 10, x, y - h * 0.45, h * 0.6);
    gr.addColorStop(0, pose & 16 ? glow : `${glow}66`); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.fillRect(x - h * 0.6, y - h * 1.05, h * 1.2, h * 1.2);
    ctx.restore();
  }
  const breathe = m.moving ? 0 : Math.sin(time * 2.2) * 0.012;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((m.ax < 0 ? -1 : 1) * grow, grow * (1 + breathe));
  let top = 230;
  if (img) {
    const w = img.width * A.scale, h = img.height * A.scale;
    ctx.drawImage(img, -w / 2, -h, w, h);
    top = h;
    if (m.flash > 0) {                               // 맞으면 잠깐 밝게
      ctx.globalAlpha = Math.min(0.35, m.flash * 3);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
  } else {
    ctx.scale(2.2, 2.2);
    drawOgreBody(ctx, (m.age || 0) * 8, m.moving, 1, m.freeze > 0, m.bite);
  }
  ctx.restore();
  // 철벽 자세 — 금빛 고리
  if (pose & 8) {
    const p = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save();
    ctx.translate(x, y - top * 0.45);
    ctx.strokeStyle = `rgba(255,196,110,${0.55 + 0.3 * p})`; ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(255,170,80,0.9)"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(0, 0, top * 0.62, top * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  drawMobMarks(ctx, m, time, top * grow);
}
/* 허수아비 더미(훈련장) — 땅에 박힌 나무 기둥, 짚을 감은 몸 · 가로 막대 팔 · 자루 머리 · 가슴의 과녁.
   맞으면(m.flash) 뒤로 기우뚱 흔들린다 */
function drawDummy(ctx, m, time) {
  const { x, y } = m;
  shadow(ctx, x, y + 2, 20, 6, 0.32);
  const wob = m.flash > 0 ? Math.sin(time * 60) * 0.12 * (m.flash / 0.12) : Math.sin(time * 1.5 + x) * 0.015;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.fillStyle = "#7a5634"; ctx.strokeStyle = "rgba(40,26,14,0.7)"; ctx.lineWidth = 1;
  ctx.fillRect(-3.5, -40, 7, 40); ctx.strokeRect(-3.5, -40, 7, 40);          // 기둥
  ctx.fillRect(-26, -50, 52, 6); ctx.strokeRect(-26, -50, 52, 6);           // 팔 막대
  ctx.fillStyle = "#d9c08a";                                                 // 짚 몸
  ctx.beginPath(); ctx.ellipse(0, -46, 14, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(150,110,50,0.8)";                                  // 묶은 끈
  [-58, -36].forEach((yy) => { ctx.beginPath(); ctx.moveTo(-12, yy); ctx.lineTo(12, yy); ctx.stroke(); });
  ctx.fillStyle = "#e9dfc6"; ctx.strokeStyle = "rgba(40,26,14,0.6)";        // 자루 머리
  ctx.beginPath(); ctx.arc(0, -74, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(90,70,40,0.8)"; ctx.lineWidth = 1.4;               // 꿰맨 눈
  ctx.beginPath(); ctx.moveTo(-5, -77); ctx.lineTo(-2, -74); ctx.moveTo(-2, -77); ctx.lineTo(-5, -74);
  ctx.moveTo(2, -77); ctx.lineTo(5, -74); ctx.moveTo(5, -77); ctx.lineTo(2, -74); ctx.stroke();
  [[8, "#c8574a"], [5, "#f3ead6"], [2.4, "#c8574a"]].forEach(([r, c]) => {   // 과녁
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -46, r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  drawMobMarks(ctx, m, time, 90);
}
function drawWorldBoss(ctx,m,time,g){drawWorldBossSprite(ctx,m,time,g?.wb?.active,lod.q);drawMobMarks(ctx,m,time,340);}
function guildBossDraw(ctx,m,time){drawGuildBoss(ctx,m,time);drawMobMarks(ctx,m,time,guildBossTop(m));}
const MOB_DRAW = {guild_slime:guildBossDraw,guild_siren:guildBossDraw,guild_phoenix:guildBossDraw,world_dragon:drawWorldBoss,world_serpent:drawWorldBoss,world_machine:drawWorldBoss, world_thunderbird:drawWorldBoss, dummy: drawDummy, wolf: drawWolf, boar: drawBoar, gorilla: drawGorilla, goblin: drawGoblin, orc: drawOrc, ogre: drawOgre, gramor: drawDungeonBoss, argas: drawDungeonBoss, morgas: drawDungeonBoss, barkanon: drawDungeonBoss, serka: drawDungeonBoss, skeleton: drawSkeleton,
  skeletal: drawSkeletal, zombie: drawZombie, necro: drawNecro, golem: drawGolem, chimera: drawChimera, spider: drawSpider,
  fspirit: drawFspirit, lavagolem: drawLavagolem, firedrake: drawFiredrake, ifrit: drawIfrit, wraith: drawWraith, abyss: drawAbyss, voidmage: drawVoidmage, fallen: drawFallen };
// 심연의 탑 수호자 · 입구(abyssArt.js)에 넘기는 그리기 도구 — 그림이 없을 때는 같은 원소 느낌의 몹 몸으로 대신한다
const ABYSS_T = { shadow, roundRect, marks: (ctx, m, time, top) => drawMobMarks(ctx, m, time, top),
  fallback: (ctx, m, time) => (MOB_DRAW[m.type] || drawRabbit)(ctx, m, time, null) };
GUARD_IDS.forEach((id) => { MOB_DRAW[id] = (ctx, m, time) => drawGuardian(ctx, m, time, ABYSS_T); });
/* 도감 그림 — 몹 하나를 넓은 판에 그린 뒤 그려진 곳만 잘라 둔다(몹마다 크기가 달라서). 한 번 그리면 기억한다.
   그림 파일이 아직 덜 불러와졌으면 다음에 다시 그린다 */
const ICON_PAD = 320, ICON_FOOT = 0.78;                  // 넓은 판 한 변(px) · 발밑 높이(판 높이의 몫)
const iconMemo = new Map();
function mobIconSheet(type, boss) {
  const key = `${type}:${boss ? 1 : 0}`;
  const kept = iconMemo.get(key);
  if (kept && (kept.done || performance.now() - kept.at < 800)) return kept;
  const c = document.createElement("canvas");
  c.width = c.height = ICON_PAD;
  const x = c.getContext("2d");
  const def = MOB[type];
  let box = null;
  if (def) {
    const sp = SPAWNS.find((q) => q.type === type && q.lv);   // 몹 크기는 레벨을 따른다 — 사냥터 가운데 레벨로 그린다
    const sz = Math.max(0.3, mobSize(type, sp ? (sp.lv[0] + sp.lv[1]) / 2 : 1, boss) || 1);
    const m = { type, id: 0, x: ICON_PAD / 2, y: ICON_PAD * ICON_FOOT, size: sz, age: 9, moving: false, hp: 1, max: 1, lv: 1,
      boss: boss ? 1 : 0, ax: 1, pose: 0, freeze: 0, flash: 0, portrait: 1 };
    try {
      const fit = Math.min(1, 1 / Math.max(1, sz * 0.9));   // 큰 보스는 판에 들어오게 줄여 그린다
      x.save(); x.translate(m.x, m.y); x.scale(fit, fit); x.translate(-m.x, -m.y);
      (MOB_DRAW[type] || drawRabbit)(x, m, 0, null);
      x.restore();
      const px = x.getImageData(0, 0, ICON_PAD, ICON_PAD).data;
      let l = ICON_PAD, t = ICON_PAD, r = -1, b = -1;
      for (let yy = 0; yy < ICON_PAD; yy++) for (let xx = 0; xx < ICON_PAD; xx++) {
        if (px[(yy * ICON_PAD + xx) * 4 + 3] < 90) continue;   // 옅은 그림자는 빼고 잰다
        if (xx < l) l = xx; if (xx > r) r = xx; if (yy < t) t = yy; if (yy > b) b = yy;
      }
      if (r >= l) box = { l, t, w: r - l + 1, h: b - t + 1 };
    } catch { box = null; }
  }
  const out = { c, box, at: performance.now(), done: !!box && !!kept && !!kept.box && kept.box.w === box.w && kept.box.h === box.h };   // 두 번 같게 그려지면(그림 파일까지 불러옴) 끝
  iconMemo.set(key, out);
  return out;
}
// 도감 칸에 몹을 그린다 — hide 면 아직 못 잡은 몹이라 검은 그림자만
export function drawMobIcon(ctx, type, w, h, hide, boss) {
  ctx.clearRect(0, 0, w, h);
  const s = mobIconSheet(type, boss);
  if (!s.box) return;
  const k = Math.min((w * 0.86) / s.box.w, (h * 0.86) / s.box.h, 2.2);
  const dw = s.box.w * k, dh = s.box.h * k;
  ctx.save();
  ctx.drawImage(s.c, s.box.l, s.box.t, s.box.w, s.box.h, (w - dw) / 2, h - dh - h * 0.07, dw, dh);
  if (hide) { ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = "#1b140d"; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}
const MOB_LABEL = { boar: "#f2b48a", gorilla: "#d9d0c4", wolf: "#f0c9a8", goblin: "#c9dca8", orc: "#cfd6b8", ogre: "#e4cfb4", skeleton: "#cfe6d4",
  skeletal: "#c9d6e6", zombie: "#bfd6a8", necro: "#d2bcf0", golem: "#d6ccb8", chimera: "#f0c9a0", spider: "#d8d0e8",
  fspirit: "#ffc896", lavagolem: "#f0a080", firedrake: "#f0a888", ifrit: "#ffc080", wraith: "#b8c8e8", abyss: "#a8d0e8", voidmage: "#c8b8f0", fallen: "#dcc0e0" };

/* 던전 관리인 — 짙은 망토에 등불을 든 사람. 머리 위에 칼 모양 표시 */
function drawDungeonNpc(ctx, n, time) {
  const { x, y } = n;
  const bob = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y + 2, 17, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "#5e4a52"; ctx.strokeStyle = "rgba(30,20,12,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-11, -38); ctx.lineTo(11, -38); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-8, -2, 6, 3); ctx.fillRect(2, -2, 6, 3);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.3, -46, 1.3, 0, Math.PI * 2); ctx.arc(3.3, -46, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5e4a52"; ctx.beginPath(); ctx.arc(0, -49, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  // 등불
  ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(18, -30); ctx.stroke();
  const glow = 0.7 + 0.3 * Math.sin(time * 5);
  ctx.fillStyle = `rgba(255,190,100,${glow})`; ctx.fillRect(15, -24, 7, 9);
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const jump = Math.abs(Math.sin(time * 3)) * -4;
  ctx.font = "22px 'Do Hyeon', sans-serif";
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
  ctx.strokeText("⚔", x, y - 86 + jump);
  ctx.fillStyle = "#f0b28a"; ctx.fillText("⚔", x, y - 86 + jump);
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

/* 광장 의뢰 NPC — 망토 두른 마을 사람. 망토 색은 requestData.js 의 color.
   머리 위: 받을 수 있으면 느낌표, 맡은 의뢰를 끝냈으면 금빛 물음표, 하는 중이면 흐린 물음표 */
function drawReqNpc(ctx, g, n, time) {
  const { x, y } = n;
  const def = REQ_BY_NPC[n.req] || {};
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const bob = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y + 2, 17, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  const col = def.color || "#9a8a70";
  ctx.fillStyle = col; ctx.strokeStyle = "rgba(30,20,12,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-11, -38); ctx.lineTo(11, -38); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,240,215,0.25)"; ctx.fillRect(-1, -36, 2, 34);
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-8, -2, 6, 3); ctx.fillRect(2, -2, 6, 3);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -46, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.3, -46, 1.3, 0, Math.PI * 2); ctx.arc(3.3, -46, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -49, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();   // 두건
  ctx.restore();
  // 머리 위 표시
  const list = REQUESTS[n.req] || [];
  const cur = me && me.reqs && me.reqs[n.req];
  const ready = cur && !whyReqDone(me, n.req).length;
  const mark = cur ? "?" : me && list.some((q) => me.lv >= q.lv) ? "!" : "";
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (mark) {
    const jump = cur && !ready ? 0 : Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "26px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
    ctx.strokeText(mark, x, y - 88 + jump);
    ctx.fillStyle = cur && !ready ? "#b9ad98" : "#ffd873";
    ctx.fillText(mark, x, y - 88 + jump);
  }
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}

const BOSS_HP_COL = "#d8645a", BOSS_GHOST_COL = "#f0b052";   // 보스 체력 칸 · 피해 잔상(던전 위 칸과 같은 색 — style.css .rpg-dg-boss)
/* 몹 머리 위 — 걸린 것(불 · 독 · 기절), 체력, 레벨. top 은 발밑에서 머리 꼭대기까지의 높이 */
function drawMobMarks(ctx, m, time, top) {
  if (m.portrait) return;                               // 도감 그림 — 체력 · 이름표 없이 몸만
  const x = m.x, y = m.y;
  if (m.burn > 0 || m.poison > 0) {
    ctx.fillStyle = m.burn > 0 ? "rgba(245,140,40,0.8)" : "rgba(150,220,90,0.7)";
    for (let k = 0; k < 3; k++) {
      const p = (time * 1.5 + k / 3) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.arc(x + (k - 1) * 6, y - top * 0.35 - p * 16, 2.2 + p * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (m.stun > 0) {
    ctx.fillStyle = "#ffe27a";
    for (let k = 0; k < 3; k++) {
      const a = time * 5 + (k / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, y - top + 6 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const boss = !!m.boss;
  const tagY = y - top - 10;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // 체력 — 보스는 늘 보이고, 나머지는 다쳤을 때만
  let barY = tagY;
  if (boss || m.hp < m.max) {
    const bw = boss ? 70 : 28, r = Math.max(0, Math.min(1, m.hp / m.max));
    barY = tagY - 1;
    ctx.fillStyle = "rgba(20,16,12,0.75)"; roundRect(ctx, x - bw / 2 - 1, tagY + 6, bw + 2, boss ? 6 : 5, 2); ctx.fill();
    // 보스 — 실제 칸 뒤에 주황 잔상(bossBar.js, 화면 루프가 m.hpFx 를 돌린다)
    const ghost = boss && m.hpFx ? Math.max(r, m.hpFx.ghost) : r;
    if (ghost > r) { ctx.fillStyle = BOSS_GHOST_COL; roundRect(ctx, x - bw / 2, tagY + 7, bw * ghost, 4, 1.5); ctx.fill(); }
    ctx.fillStyle = boss ? BOSS_HP_COL : r > 0.5 ? "#8fd07f" : "#e5a93e";
    if (r > 0) { roundRect(ctx, x - bw / 2, tagY + 7, Math.max(1.5, bw * r), boss ? 4 : 3, 1.5); ctx.fill(); }
  }
  // 레벨 — 보스는 이름도 붙인다
  const label = boss ? `Lv${m.lv} ${mobName(m)}` : `Lv${m.lv}`;
  ctx.font = boss ? "12px 'Do Hyeon', sans-serif" : "10px 'Do Hyeon', sans-serif";
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = boss ? "rgba(70,20,16,0.82)" : "rgba(20,14,10,0.62)";
  roundRect(ctx, x - w / 2, barY - 7, w, 13, 6); ctx.fill();
  ctx.fillStyle = boss ? "#ffd873" : MOB_LABEL[m.type] || "#f2ead6";
  ctx.fillText(label, x, barY);
  ctx.restore();
}

/* ── 움직임 — 그림은 방향마다 한 장이라, 몸 전체를 튀기고 기울이고 눌러서 걷는 것처럼 보이게 한다 ──
   걸을 때: 한 걸음마다 통통 튀고, 좌우로 살짝 흔들리고, 발이 닿을 때 눌렸다 펴진다(흙먼지도 인다).
   서 있을 때: 천천히 숨을 쉰다. 칠 때: 치는 쪽으로 몸을 기울였다 돌아온다.
   그리기에만 쓰는 값이라 h.anim 에 두고 주고받지 않는다 — 방장 · 손님 화면 모두 제 화면에서 계산한다. */
const STRIDE = 24;            // 한 걸음에 가는 거리
function heroMotion(g, h, time) {
  const a = h.anim || (h.anim = { x: h.x, y: h.y, t: time, ph: 0, walk: 0, land: 0 });
  const dt = Math.min(0.1, Math.max(0, time - a.t));
  const moved = Math.hypot(h.x - a.x, (h.y - a.y) / RPG.squash);
  a.x = h.x; a.y = h.y; a.t = time;
  // 문을 지나거나 위치를 맞추느라 한 번에 크게 옮긴 것은 걸음으로 치지 않는다
  const going = dt > 0 && moved / dt > 30 && moved < 80;
  a.walk += ((going ? 1 : 0) - a.walk) * Math.min(1, dt * 12);     // 걷기와 서기 사이를 부드럽게
  if (going) {
    const step = Math.floor(a.ph / Math.PI);
    a.ph += (moved / STRIDE) * Math.PI;
    if (Math.floor(a.ph / Math.PI) !== step) { a.land = 1; kickDust(g, h); }   // 발이 닿았다
  } else if (a.walk < 0.05) {
    a.ph = 0;
  }
  a.land = Math.max(0, a.land - dt * 7);
  const w = a.walk;
  const s = Math.abs(Math.sin(a.ph));
  const breath = Math.sin(time * 2.4 + h.pi * 1.3) * (1 - w);
  const sq = a.land * 0.08 * w;
  let lean = 0, lunge = 0;
  if (h.swing > 0) {
    const k = Math.sin(Math.min(1, h.swing / 0.25) * Math.PI);
    lean = 0.15 * k; lunge = 5 * k;
  }
  return {
    hop: -s * 6 * w,                                  // 걸음마다 튀어 오른다
    tilt: Math.sin(a.ph) * 0.09 * w,                  // 좌우로 흔들린다
    sx: 1 - breath * 0.012 + sq * 0.8,
    sy: 1 + breath * 0.018 + s * 0.03 * w - sq,       // 숨쉬기 · 떠오를 때 늘고 닿을 때 눌린다
    lean, lunge, lift: s * w,
  };
}

/* 발밑 흙먼지 — 그리기만 하는 것이라 이 화면에만 남긴다 */
function kickDust(g, h) {
  const list = g.dust || (g.dust = []);
  if (list.length > 40) list.shift();
  list.push({ map: h.map, x: h.x - h.dir * 6 + (Math.random() - 0.5) * 6, y: h.y + 1, t: 0, life: 0.38,
    vx: -h.dir * (8 + Math.random() * 8) });
}
function drawDust(ctx, g, map, time) {
  const list = g.dust;
  if (!list || !list.length) return;
  const dt = Math.min(0.1, Math.max(0, time - (g.dustT ?? time)));
  g.dustT = time;
  ctx.save();
  g.dust = list.filter((d) => {
    d.t += dt;
    if (d.t >= d.life || d.map !== map) return false;
    const p = d.t / d.life;
    ctx.globalAlpha = (1 - p) * 0.4;
    ctx.fillStyle = map === "plaza" ? "#e9e1cf" : "#d8c9a4";
    ctx.beginPath();
    ctx.ellipse(d.x + d.vx * d.t, d.y - p * 5, 3 + p * 6, 1.6 + p * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
  ctx.restore();
}

function drawHero(ctx, g, h, time) {
  const pi = h.pi;
  const col = elemOf(h);
  const mine = g.mySeat === pi;
  const down = h.down > 0;
  const { view, flip } = heroView(h);
  const advIm = advBody(h, view);                    // 전직 그림은 무기 · 방패를 이미 들고 있다 — 특별 무기를 끼면 무기 지운 그림에 그 무기를 들린다
  const held = advIm ? advHeld(h, view) : heldWeapon(h, view);
  const im = held ? held.body : advIm || heroImg(h, view) || heroImg(h, "front");
  const mo = down ? null : heroMotion(g, h, time);

  ctx.save();
  ctx.translate(h.x, h.y + 2);
  ctx.scale(1, 0.36);
  ctx.globalAlpha = mine ? 0.55 : 0.35;
  ctx.strokeStyle = col.light;
  ctx.lineWidth = mine ? 5 : 3.5;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  if (mine) {
    ctx.globalAlpha = 0.2; ctx.fillStyle = col.key; ctx.fill();
    const full = 1 - Math.min(1, h.sk / RPG.skillCd);
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = h.sk > 0 ? col.key : "#ffe08a";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * full); ctx.stroke();
  }
  ctx.restore();
  if (h.guard > 0) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ffeec2"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 28, 22, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  ctx.save();
  const lift = mo ? mo.lift : 0;                     // 떠오르면 그림자가 작고 옅어진다
  shadow(ctx, h.x, h.y + 3, 15 * (1 - lift * 0.18), 5 * (1 - lift * 0.18), 0.3 * (1 - lift * 0.3));
  ctx.translate(h.x, h.y + (mo ? mo.hop : 0));
  if (down) { h.anim = null; ctx.rotate(-0.9 * h.dir); ctx.translate(0, 10); ctx.globalAlpha = 0.5; }
  else if (h.as && h.as.ut > 0) ctx.globalAlpha = h.as.ut > ADV_BY_ID.assassin.active.ut - ADV_BY_ID.assassin.active.at ? 0.18 : 0.7;   // 암살자 그림자 일섬 — 사라진 동안 거의 안 보이고 · 등 뒤에 내려앉으면 또렷이 비친다(지정 불가는 그대로)
  else if (h.bf && h.bf.hide && h.bf.hide.t > 0) ctx.globalAlpha = 0.45;   // 투명화 물약 — 비쳐 보인다
  if (mo) {                                          // 발밑을 축으로 기울이고 누른다
    ctx.translate(h.dir * mo.lunge, 0);
    ctx.rotate(mo.tilt + h.dir * mo.lean);
    ctx.scale(mo.sx, mo.sy);
  }
  if (flip) ctx.scale(-1, 1);
  if (im) {
    const ww = im.naturalWidth * HERO_K, hh = im.naturalHeight * HERO_K;
    const top = -hh + HERO_PAD * HERO_K;
    const sw = held && !down ? swingAngle(h, held, time) : null;
    if (held?.off) {
      // 두 검은 각각 자기 손을 축으로 반대 방향으로 벤다. 몸을 먼저 관통해 보이지 않게 먼 손은 뒤에 둔다.
      const off = held.off, counter = a => off.hand[2] - (a - held.hand[2]);
      const offSwing = sw ? { ...sw, ang: counter(sw.ang), from: sw.from === undefined ? undefined : counter(sw.from),
        to: sw.to === undefined ? undefined : counter(sw.to), trail: sw.trail * 0.7 } : null;
      if (!advIm) drawHeld(ctx, off, ww, top, offSwing, col.light);
      else held.offSwing = offSwing;
    }
    const shield = !advIm && h.advClass === "knight" && h.job === "warrior" ? DUAL_OFF_HAND[h.gender === "f" ? "f" : "m"][view] : null;   // 기사 방패
    if (shield && view === "back") drawAdvShield(ctx, shield, ww, top, HERO_K);
    if (held?.adv) drawAdvHeldItem(ctx, held, ww, top, HERO_K, true);
    ctx.drawImage(im, -ww / 2, top, ww, hh);
    if (held?.adv) drawAdvHeldItem(ctx, held, ww, top, HERO_K, false);
    else if (held) {
      if (held.off && advIm) drawHeld(ctx, held.off, ww, top, held.offSwing, col.light);   // 전직 그림은 반대 손이 몸 앞 허리에 있다
      drawHeld(ctx, held, ww, top, sw, col.light);
    }
    if (shield && view !== "back") drawAdvShield(ctx, shield, ww, top, HERO_K);
    if (h.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.5, h.flash * 3);
      ctx.drawImage(im, -ww / 2, top, ww, hh);
    }
  } else {
    ctx.fillStyle = col.key; roundRect(ctx, -9, -34, 18, 34, 7); ctx.fill();
  }
  ctx.restore();

  // 체력 · 레벨 · 이름
  const bw = 40, byy = h.y - 66 - 12;
  const r = Math.max(0, Math.min(1, h.hp / (h.max || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(18,12,8,0.8)"; roundRect(ctx, h.x - bw / 2 - 1, byy - 1, bw + 2, 6, 3); ctx.fill();
  ctx.fillStyle = down ? "#6a5a52" : r > 0.5 ? "#8fd07f" : r > 0.25 ? "#e8c05e" : "#ef8b7c";
  roundRect(ctx, h.x - bw / 2, byy, Math.max(1.5, bw * r), 4, 2); ctx.fill();
  ctx.font = "10.5px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const nm = `Lv${h.lv} ${(g.names && g.names[pi]) || "모험가"}`;
  const wdt = ctx.measureText(nm).width + 12;
  // 내 파티원은 이름표 테두리를 연두빛으로
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const mate = me && me.pty && h.pty === me.pty && h !== me;
  ctx.fillStyle = "rgba(20,14,10,0.72)"; roundRect(ctx, h.x - wdt / 2, h.y + 6, wdt, 15, 7); ctx.fill();
  if (mate) { ctx.strokeStyle = "#a9d99a"; ctx.lineWidth = 1; ctx.stroke(); }
  else if (MAPS[h.map].pvp && me && h !== me && me.dvs === h.pi) { ctx.strokeStyle = "#e9a08a"; ctx.lineWidth = 1; ctx.stroke(); }   // 내 결투 상대
  else if (h.pvpOn && fieldPvpMap(h.map)) { ctx.strokeStyle = "#e08a7a"; ctx.lineWidth = 1; ctx.stroke(); }   // 사냥터 PvP 를 켠 사람
  ctx.fillStyle = down ? "#a89a90" : col.light; ctx.fillText(nm, h.x, h.y + 14);
  if (h.title) {                                  // 칭호 — 이름 아래
    ctx.font = "10px 'Jua', sans-serif";
    ctx.fillStyle = "rgba(233,211,154,0.92)";
    ctx.fillText(`「${titleName(h.title)}」`, h.x, h.y + 29);
  }
  if (down) {
    ctx.fillStyle = "#ffbdb2"; ctx.font = "11px 'Jua', sans-serif";
    ctx.fillText(`${Math.ceil(h.down)}초 뒤 광장에서`, h.x, byy - 10);
  }
  ctx.restore();
}

/* 결투장 바닥 — 칸(rings)마다 모래 원형 경기장 · 돌 테두리 · 네 귀퉁이 깃발. 결투 중인 사람은 제 칸 밖으로 못 나간다 */
function drawArenaFloor(ctx, M) {
  ctx.save();
  (M.rings || []).forEach(({ x: cx, y: cy, rx, ry }, k) => {
    ctx.fillStyle = "rgba(222,196,150,0.55)";
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(120,98,72,0.85)"; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(240,226,196,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 12, ry - 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(150,112,80,0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy, 130, 86, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - ry + 30); ctx.lineTo(cx, cy + ry - 30); ctx.stroke();
    [[cx - rx * 0.72, cy - ry * 0.72], [cx + rx * 0.72, cy - ry * 0.72], [cx - rx * 0.72, cy + ry * 0.72], [cx + rx * 0.72, cy + ry * 0.72]].forEach(([x, y], i) => {
      ctx.fillStyle = "rgba(60,44,30,0.35)";
      ctx.beginPath(); ctx.ellipse(x, y + 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6b5440"; ctx.fillRect(x - 3, y - 70, 6, 72);
      ctx.fillStyle = i % 2 ? "#c98d7a" : "#8fa9c4";
      ctx.beginPath(); ctx.moveTo(x + 3, y - 68); ctx.lineTo(x + 34, y - 58); ctx.lineTo(x + 3, y - 46); ctx.closePath(); ctx.fill();
    });
    ctx.font = "15px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(90,66,44,0.7)";
    ctx.fillText(`${k + 1}번 결투장`, cx, cy - ry - 16);
  });
  ctx.restore();
}

/* 명예 순위판 — 광장 위쪽 가운데. 나무 판에 금빛 글씨, 가까이 가면 E 로 연다 */
function drawHonorBoard(ctx, n, time) {
  const { x, y } = n;
  ctx.save();
  shadow(ctx, x, y + 2, 46, 9, 0.3);
  ctx.fillStyle = "#6b4f36"; ctx.fillRect(x - 40, y - 46, 7, 48); ctx.fillRect(x + 33, y - 46, 7, 48);
  ctx.fillStyle = "#8a6646"; ctx.strokeStyle = "rgba(40,26,16,0.9)"; ctx.lineWidth = 2;
  roundRect(ctx, x - 58, y - 108, 116, 66, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f3e2bd"; roundRect(ctx, x - 50, y - 100, 100, 50, 4); ctx.fill();
  ctx.fillStyle = "#c79a3e";
  ctx.beginPath(); ctx.moveTo(x, y - 124); ctx.lineTo(x + 9, y - 108); ctx.lineTo(x - 9, y - 108); ctx.closePath(); ctx.fill();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.fillStyle = "#5a3f22"; ctx.fillText("명예 순위", x, y - 86);
  ctx.strokeStyle = "rgba(90,63,34,0.35)"; ctx.lineWidth = 1;
  [0, 1].forEach((i) => { ctx.beginPath(); ctx.moveTo(x - 36, y - 72 + i * 9); ctx.lineTo(x + 36, y - 72 + i * 9); ctx.stroke(); });
  const glow = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.globalAlpha = 0.5 + glow * 0.4;
  ctx.fillStyle = "#ffd873"; ctx.font = "16px 'Do Hyeon', sans-serif";
  ctx.fillText("★", x, y - 134 - glow * 3);
  ctx.restore();
}

/* 장터 게시판 — 그림(MARKET.img, 128 × 128 · 아래 가운데 기준)이 있으면 그것을, 없으면 나무판에 쪽지를 붙인 코드 그림 */
function drawMarketBoard(ctx, n, time) {
  const { x, y } = n;
  const im = artImg(rpgFile(MARKET.img));
  ctx.save();
  shadow(ctx, x, y + 2, 50, 10, 0.3);
  if (im) ctx.drawImage(im, x - 64, y - 124, 128, 128);
  else {
    ctx.fillStyle = "#6b4f36"; ctx.fillRect(x - 46, y - 52, 8, 54); ctx.fillRect(x + 38, y - 52, 8, 54);
    ctx.fillStyle = "#8a6646"; ctx.strokeStyle = "rgba(40,26,16,0.9)"; ctx.lineWidth = 2;
    roundRect(ctx, x - 62, y - 112, 124, 66, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#7a5a3c"; roundRect(ctx, x - 68, y - 122, 136, 14, 5); ctx.fill();
    // 붙여 둔 쪽지 — 톤을 낮춘 종이 색
    [["#efe2c4", -44, -100, -0.08], ["#e3d6ea", -14, -102, 0.05], ["#dbe7d6", 16, -99, -0.04], ["#efd9cc", -30, -76, 0.06], ["#efe2c4", 4, -77, -0.05]]
      .forEach(([c, dx, dy, r]) => {
        ctx.save(); ctx.translate(x + dx + 13, y + dy + 10); ctx.rotate(r);
        ctx.fillStyle = c; ctx.fillRect(-13, -10, 26, 20);
        ctx.strokeStyle = "rgba(90,63,34,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(8, -3); ctx.moveTo(-8, 3); ctx.lineTo(4, 3); ctx.stroke();
        ctx.fillStyle = "#b0715a"; ctx.beginPath(); ctx.arc(0, -8, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
  }
  const bob = Math.sin(time * 2.4) * 2;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "16px 'Do Hyeon', sans-serif";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,26,10,0.85)"; ctx.strokeText("장터", x, y - 136 + bob);
  ctx.fillStyle = "#ffd873"; ctx.fillText("장터", x, y - 136 + bob);
  ctx.restore();
}

/* 채팅 말풍선 — 14글자씩 끊어 세 줄까지. 아랫변 가운데에 꼬리 */
function drawBubble(ctx, x, y, text, alpha) {
  const lines = [];
  for (let i = 0; i < text.length && lines.length < 3; i += 14) lines.push(text.slice(i, i + 14));
  if (text.length > 42) lines[2] = `${lines[2].slice(0, 13)}…`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "12px 'Jua', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, lh = 15, hh = lines.length * lh + 8;
  const top = y - hh;
  ctx.fillStyle = "rgba(250,244,230,0.94)";
  roundRect(ctx, x - w / 2, top, w, hh, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(120,96,64,0.6)"; ctx.lineWidth = 1;
  roundRect(ctx, x - w / 2, top, w, hh, 8); ctx.stroke();
  ctx.fillStyle = "#3a2c1c";
  lines.forEach((l, i) => ctx.fillText(l, x, top + 4 + lh / 2 + i * lh));
  ctx.restore();
}

/* 바탕 그림 — 그림 한 장이 가로 tile 만큼을 덮는다. 맵이 더 넓으면 좌우로 뒤집어 이어 붙여 이음새가 보이지 않게 한다 */
function drawTiled(ctx, im, M, cam) {
  const TW = M.tile || M.w;
  const kx = (im.naturalWidth || im.width) / TW, ky = (im.naturalHeight || im.height) / M.h;   // 그림 파일 · 캔버스 모두
  const sy = cam.y * ky, sh = H * ky;
  for (let k = Math.floor(cam.x / TW); k * TW < cam.x + W; k++) {
    const x0 = k * TW;
    const v0 = Math.max(cam.x, x0), v1 = Math.min(cam.x + W, x0 + TW);
    if (v1 <= v0) continue;
    const dx = v0 - cam.x, dw = v1 - v0;
    if (k % 2 === 0) {
      ctx.drawImage(im, (v0 - x0) * kx, sy, dw * kx, sh, dx, 0, dw, H);
    } else {
      ctx.save();
      ctx.translate(dx + dw, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, (TW - (v1 - x0)) * kx, sy, dw * kx, sh, 0, 0, dw, H);
      ctx.restore();
    }
  }
}

/* 내 영웅을 따라가는 화면 — 맵 끝에 닿으면 멈춘다 */
function follow(g, M) {
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const tx = me ? me.x - W / 2 : (M.w - W) / 2;
  const ty = me ? me.y - H / 2 - 20 : (M.h - H) / 2;
  const cx = Math.max(0, Math.min(M.w - W, tx));
  const cy = Math.max(0, Math.min(M.h - H, ty));
  if (!g.cam || g.cam.map !== M.id) g.cam = { x: cx, y: cy, map: M.id };
  else { g.cam.x += (cx - g.cam.x) * 0.2; g.cam.y += (cy - g.cam.y) * 0.2; }
  return g.cam;
}

/* 연출 덜어내기 — 여러 사람이 스킬을 몰아 쓰면 그리기가 무거워져 화면이 끊긴다.
   ① 프레임 간격(평균)이 slow ms 를 넘으면 알갱이 · 마디를 low 몫만 그리고, fast 아래로 내려오면 되돌린다(skillArt.js setFxQuality)
   ② 같은 종류 스킬 연출은 최근 cap 개만 그린다(덜어낼 때는 그 절반) ③ 화면 밖 연출은 그리지 않는다 */
const FX_LOD = { slow: 24, fast: 18, low: 0.5, ease: 0.1,
  cap: {sk_storm_staff:6,sk_storm_bow:10,sk_storm_dash:8,sk_storm_finish:8,sk_guild_hit:12, sk_raid_hit:16,sk_raid_break:4, sk_wb_dragon_flight: 10, sk_wb_dragon_hit: 12, sk_wb_dual_spin: 10, sk_wb_dual_dash: 10, sk_wb_cross: 10, sk_wb_impact: 12, sk_wb_lightning: 12, sk_wb_volley: 14, sk_wb_meteor: 12, sk_fireslash: 6, sk_blaze: 4, sk_fury: 4, sk_fury_hit: 10, sk_missile: 14, sk_icespike: 2, sk_halo: 3, sk_flamer: 3, sk_meteor: 10, sk_tornado: 3 } };
const lod = { at: 0, ms: 16, q: 1 };
/* 사람이 많은 화면 — 월드보스처럼 한 맵에 모이면 손님 기기마다 남의 연출을 모두 그려 휴대폰에서 초당 화면이 반으로 떨어졌다.
   (실측: 월드보스 무기 연출 하나가 휴대폰 속도에서 3~5ms. 남의 것이 스무 개 넘게 겹친다)
   같은 맵에 heroes 명 이상이면(또는 설정의 "연출 줄이기") 남의 스킬 연출은 최근 budget 개 · 종류마다 kind 개 · 알갱이 q 몫만 그리고,
   남이 주고받은 피해 숫자 · 남의 스킬 이름은 숨긴다. 내 것은 그대로. 주인(by)은 rpg.js fx 가 싣는다.
   주인이 없는 연출(보스 경고 · 몹 기술)은 피해야 하는 것이라 줄이지 않는다 */
const CROWD = { heroes: 5, budget: 6, kind: 2, q: 0.5,
  low: { budget: 3, kind: 1, q: 0.35, mine: 0.6 } };   // 연출 줄이기 — 남의 것은 더 덜고 내 것도 알갱이를 줄인다
let lowFx = false;
export const setLowFx = (on) => { lowFx = !!on; };
function stepLod() {
  const now = performance.now(), d = lod.at ? Math.min(100, now - lod.at) : 16;
  lod.at = now;
  lod.ms += (d - lod.ms) * FX_LOD.ease;
  const q = lod.ms > FX_LOD.slow ? FX_LOD.low : lod.ms < FX_LOD.fast ? 1 : lod.q;
  if (q !== lod.q) { lod.q = q; setFxQuality(q); }
}
// 그릴 스킬 연출 — 종류마다 최근 것부터 cap 개까지
const othersFx = (f, crowd, mySeat) => crowd && f.by !== undefined && f.by !== mySeat;
function pickSkillFx(list, crowd, mySeat) {
  const seen = {}, keep = new Set(), C = lowFx ? CROWD.low : CROWD;
  let others = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i], other = othersFx(f, crowd, mySeat);
    if (other && ++others > C.budget) continue;   // 남의 연출은 최근 몇 개만
    let cap = FX_LOD.cap[f.kind];
    if (other) cap = Math.min(cap || C.kind, C.kind);
    if (!cap) { keep.add(f); continue; }
    const key = other ? f.kind + "/o" : f.kind;
    const n = (seen[key] = (seen[key] || 0) + 1);
    if (n <= (lod.q < 1 ? Math.ceil(cap / 2) : cap)) keep.add(f);
  }
  return keep;
}
// 남의 연출은 알갱이를 덜 — 그리는 동안만 품질을 낮췄다가 되돌린다
function drawSkillTuned(ctx, f, time, g, crowd) {
  const C = lowFx ? CROWD.low : CROWD;
  const q = !crowd && !lowFx ? lod.q : Math.min(lod.q, othersFx(f, crowd, g.mySeat) ? C.q : f.by === g.mySeat && lowFx ? C.mine : 1);
  if (q === lod.q) return drawSkillFx(ctx, f, time, g);
  setFxQuality(q);
  try { drawSkillFx(ctx, f, time, g); } finally { setFxQuality(lod.q); }
}

/* 마우스 오른쪽 클릭 이동의 도착 표시 — 땅에 얇은 고리 하나가 천천히 오므라들고 가운데 작은 점이 있다. 도착하면 fade 초 동안 흐려진다.
   g.moveMark = { map, x, y, t 누른 때 } 는 RpgView 가 누를 때 만들고, 서버가 보정한 목적지(me.dest)를 따라간다 */
const MOVE_MARK = { r0: 7, r1: 16, pulse: 1.1, fade: 0.35, dot: 1.6, alpha: 0.85, width: 1 };
function drawMoveMark(ctx, g, me, time) {
  const m = g.moveMark;
  if (!m) return;
  if (!me || m.map !== me.map) { g.moveMark = null; return; }
  if (me.dest) { m.x = me.dest.x; m.y = me.dest.y; m.end = undefined; }
  else if (m.end === undefined) m.end = time;
  const gone = m.end === undefined ? 0 : (time - m.end) / MOVE_MARK.fade;
  if (gone >= 1) { g.moveMark = null; return; }
  const k = (((time - m.t) % MOVE_MARK.pulse) + MOVE_MARK.pulse) % MOVE_MARK.pulse / MOVE_MARK.pulse;   // 0 → 1 로 오므라든다
  const light = elemOf(me).light;
  ctx.save();
  ctx.strokeStyle = light; ctx.fillStyle = light; ctx.lineWidth = MOVE_MARK.width;
  const r = MOVE_MARK.r1 - (MOVE_MARK.r1 - MOVE_MARK.r0) * k;
  ctx.globalAlpha = MOVE_MARK.alpha * (1 - gone) * (0.4 + 0.6 * (1 - k));
  ctx.beginPath(); ctx.ellipse(m.x, m.y, r, r * RPG.squash, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = MOVE_MARK.alpha * (1 - gone);
  ctx.beginPath(); ctx.ellipse(m.x, m.y, MOVE_MARK.dot, MOVE_MARK.dot * RPG.squash, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawRpg(ctx, g, bgs) {
  fxWarmUp();
  stepLod();
  const time = g.t;
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const M = MAPS[me ? me.map : "plaza"];
  const cam = follow(g, M);
  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 6;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  warmRpgArt();
  const bgName = M.bg || M.id;
  const look = !M.dungeon && FIELD_LOOKS[M.id];        // 사냥터 — 맵마다 다른 바탕(fieldLookData.js)
  const bim = M.dungeon || look ? null : mapImg(rpgFile(bgName));
  // 코드로 그린 큰 바탕은 한 장만 남긴다(던전 · 사냥터 합쳐)
  const bigBg = (key, paint) => {
    let bg = bgs && bgs[key];
    if (bgs && !bg) {
      Object.keys(bgs).forEach((k) => { if (k.startsWith("dg:") || k.startsWith("fl:")) delete bgs[k]; });
      bg = bgs[key] = paint();
    }
    return bg;
  };
  if (M.dungeon) {                                    // 던전 — 코드로 그린 바닥(던전마다 하나만 남긴다)
    const bg = bigBg(`dg:${M.dungeon}`, () => paintDungeon(M));
    if (bg) ctx.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
    else { ctx.fillStyle = (DG_LOOKS[M.dungeon] || DG_LOOKS.stone1).floor; ctx.fillRect(0, 0, W, H); }
  } else if (look) {
    const bg = bigBg(`fl:${M.id}`, () => paintFieldLook(M));
    if (bg) drawTiled(ctx, bg, M, cam);
    else { ctx.fillStyle = look.ground[0]; ctx.fillRect(0, 0, W, H); }
  } else if (bim) {
    drawTiled(ctx, bim, M, cam);
    if (M.tint) { ctx.fillStyle = M.tint; ctx.fillRect(0, 0, W, H); }
  } else if (mapImgFailed(rpgFile(bgName))) {          // 파일이 없을 때만 예전처럼 코드로 그린다
    const bg = (bgs && bgs[M.id]) || (bgs && (bgs[M.id] = paintMap(M.id)));
    if (bg) ctx.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
  } else { ctx.fillStyle = M.id === "plaza" ? "#4f6e34" : "#557a37"; ctx.fillRect(0, 0, W, H); }
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  if (look) fieldTrails(M, FIELD_TRAIL).forEach((pts) => dirtPath(ctx, pts, 60, look.path));
  else (M.paths || []).forEach((pts) => dirtPath(ctx, pts, 64));
  if (M.dungeon) drawTorches(ctx, M, cam, time);
  if (M.pvp) drawArenaFloor(ctx, M);
  const inView = (x, y, pad = 160) => x > cam.x - pad && x < cam.x + W + pad && y > cam.y - pad && y < cam.y + H + pad;

  drawPowerCircles(ctx,g,M.id);
  drawWorldBossGround(ctx,g,M.id,lod.q);drawGuildGround(ctx,g,M.id);
  // 내 사거리 — 토끼가 들어오면 또렷해진다
  if (me && me.down <= 0 && !M.safe) {
    const rr = heroRange(me);
    const foe = M.pvp && me.dvs >= 0 ? g.heroes[me.dvs] : null;
    const on = M.pvp
      ? !!(foe && foe.map === M.id && foe.down <= 0 && dist(me.x, me.y, foe.x, foe.y) <= rr)
      : g.mobs.some((m) => m.map === M.id && dist(me.x, me.y, m.x, m.y) <= rr);
    ctx.save();
    ctx.translate(me.x, me.y); ctx.scale(1, RPG.squash);
    ctx.globalAlpha = on ? 0.09 : 0.04; ctx.fillStyle = elemOf(me).key;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.5 : 0.25; ctx.strokeStyle = elemOf(me).light; ctx.lineWidth = 1.4;
    ctx.setLineDash(on ? [] : [8, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawMoveMark(ctx, g, me, time);                      // 클릭한 곳 표시 — 땅 위, 몸 아래
  const here = (f) => !f.map || f.map === M.id;
  g.fx.forEach((f) => { if (here(f) && f.kind === "art" && !(FX_ART[f.art] || {}).over) drawFx(ctx, f); });
  // 스킬 연출 — 화면 안 · 종류마다 최근 것만(FX_LOD)
  const fxSeen = (f) => inView(f.x, f.y, 320) || (f.x1 !== undefined && inView(f.x1, f.y1, 320));
  const crowd = lowFx || g.heroes.filter((h) => h && h.map === M.id).length >= CROWD.heroes;
  const skFx = pickSkillFx(g.fx.filter((f) => here(f) && f.kind.startsWith("sk_") && fxSeen(f)), crowd, g.mySeat);
  g.fx.forEach((f) => { if (skFx.has(f) && GROUND_FX.has(f.kind)) drawSkillTuned(ctx, f, time, g, crowd); });   // 빙판길 · 잔화 · 균열 — 땅에 깔린다

  // 앞뒤로 겹치게 — 위에 선 것부터 그린다
  const order = [];
  M.gates.forEach((gt) => order.push({ y: gt.y - 4, gate: gt }));
  M.npcs.forEach((n) => order.push({ y: n.y, npc: n }));
  if (M.id === "plaza") {
    order.push({ y: 620, fountain: 1 });
    order.push({ y: DUNGEON.gate.y, dgGate: 1 });
    PLAZA_PROPS.forEach((o) => order.push({ y: o.y, prop: o }));
  } else {
    (MAP_TREES[M.id] || []).forEach((t) => { if (inView(t.x, t.y)) order.push({ y: t.y, tree: t }); });
  }
  g.mobs.forEach((m) => { if (!m.dead && m.map === M.id && inView(m.x, m.y)) order.push({ y: m.y, m }); });
  g.heroes.forEach((h) => { if (h && h.map === M.id) order.push({ y: h.y, h }); });
  g.heroes.forEach((h) => { const gi = h && h.map === M.id && h.as && h.as.gi; if (gi && gi.t > 0 && Number.isFinite(gi.y)) order.push({ y: gi.y, giant: h }); });   // 거대 정령 — 제 발 높이로 줄을 선다
  if (M.id === "plaza") drawDgPit(ctx, time);
  drawDust(ctx, g, M.id, time);
  order.sort((a, b) => a.y - b.y);
  order.forEach((o) => {
    // 띄움에 걸린 것은 위로 떠서 그린다 · 걸린 표시(경직 · 속박 · 낙인)는 그 위에
    const who = o.m || o.h, lift = who ? liftOf(who, 1 / 60) : 0;
    if (lift) { ctx.save(); ctx.translate(0, -lift); }
    if (o.m) { (MOB_DRAW[o.m.type] || drawRabbit)(ctx, o.m, time,g); drawAdvMob(ctx, o.m, time, (o.m.rad || 16) * 1.5 + 24); }   // 명사수 약점 표식
    else if (o.h) { drawHero(ctx, g, o.h, time); drawHeroSkill(ctx, o.h, time); drawAdvHero(ctx, o.h, time); }
    if (lift) ctx.restore();
    if (who && (o.m || o.h.cc)) drawCcMark(ctx, who, time);
    else if (o.gate) drawGate(ctx, o.gate, time);
    else if (o.npc) drawNpc(ctx, g, o.npc, time);
    else if (o.giant) drawAdvGiant(ctx, o.giant, time);
    else if (o.fountain) drawFountain(ctx, time);
    else if (o.dgGate) drawDgGate(ctx, time);
    else if (o.prop) drawProp(ctx, o.prop);
    else if (o.tree) drawFieldTree(ctx, o.tree);
  });

  if (M.dungeon) drawDungeonDark(ctx, me, cam);
  g.fx.forEach((f) => {
    if (!here(f) || GROUND_FX.has(f.kind)) return;
    if (f.kind.startsWith("sk_")) { if (skFx.has(f)) drawSkillTuned(ctx, f, time, g, crowd); }   // 직업 · 무기 스킬 연출(skillArt.js)
    else if (crowd && f.kind === "dmg" && f.by >= 0 && f.by !== g.mySeat) return;   // 남이 주고받은 피해 숫자 — 보스 체력바로 본다
    else if (crowd && f.kind === "call" && f.who >= 0 && f.who !== g.mySeat) return;   // 남의 스킬 이름 외침
    else if (f.kind !== "art" || (FX_ART[f.art] || {}).over) drawFx(ctx, f);
  });
  ctx.globalAlpha = 1;
  // 채팅 말풍선 — 모든 것 위에
  if (g.bubbles) {
    const now = performance.now();
    g.heroes.forEach((h, pi) => {
      const b = g.bubbles[pi];
      if (!h || !b || h.map !== M.id) return;
      if (now > b.until) { delete g.bubbles[pi]; return; }
      drawBubble(ctx, h.x, h.y - 96, b.text, Math.min(1, (b.until - now) / 400));
    });
  }
  ctx.restore();
  drawStormScreenFlash(ctx,g,W,H);
  if (g.banner) drawBanner(ctx, g.banner);
  const raidNotice=g.fx.findLast(f=>f.kind==="raid_notice"&&(f.who===-1||f.who===g.mySeat));
  if(raidNotice){ctx.save();ctx.translate(0,170);drawBanner(ctx,raidNotice);ctx.restore();}
}
