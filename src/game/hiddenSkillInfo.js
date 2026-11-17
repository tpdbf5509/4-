/* 히든 직업 스킬 설명(11월 17일 사용자 "m키를 누르면 스킬들 상세설명 보여주는 탭 만들어줘") — 격자 연습장 설명 창(SkillInfoPanel.jsx)이 쓴다.
   숫자는 모두 각 직업 데이터 파일 상수에서 만든다(수치를 바꾸면 설명도 따라 바뀐다). 설명 문장은 데이터 파일 주석을 짧게 옮긴 것.
   히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에는 적지 않는다 */
import { GAMBLER, GAMBLER_NAME, GAMBLER_TITLE, GM_SLOTS, GM_TRAIN_NAMES, GM_CHIP, GM_BET, GM_LUCK, GM_VEIL, GM_DICE, GM_RAIN, GM_DD, GM_TABLE, GM_EDGE, GM_JACK } from "./gamblerData.js";
import { ENGINEER, ENGINEER_NAME, ENGINEER_TITLE, EN_SLOTS, EN_TRAIN_NAMES, EN_PULSE, EN_TURRET, EN_DRONE, EN_MAGNET, EN_RAIL, EN_MECH, EN_OC, EN_ORBIT } from "./engineerData.js";
import { NECRO, NECRO_NAME, NECRO_TITLE, NC_SLOTS, NC_TRAIN_NAMES, NC_SCYTHE, NC_SOUL, NC_ROSTER, NC_EXTRACT, NC_SUMMON, NC_SWAP, NC_DOMAIN, NC_MARCH, NC_BURN, NC_LEGION } from "./necroData.js";
import { ILLUSION, ILLUSION_NAME, ILLUSION_TITLE, IL_SLOTS, IL_TRAIN_NAMES, IL_TRICK, IL_CARD, IL_SHUFFLE, IL_SLASH, IL_PRISON, IL_BLINK, IL_FIST, IL_MIRROR, IL_FINAL } from "./illusionData.js";

const pct = (v) => `${Math.round(v * 100)}%`;
const x = (v) => `×${Number(v.toFixed(1))}`;
const deg = (rad) => `${Math.round((rad * 360) / Math.PI)}°`;   // 반각 → 부채꼴 전체 각도

/* 한 스킬 = { s, act(키 칸, 평타는 "fire"), name, lv 해금 직업 레벨, ult 궁극기, desc 설명 줄들, stats [[이름, 값]], train 연마 효과 줄들 } */
function gambler() {
  const U = GAMBLER.unlock;
  return {
    id: "gambler", name: GAMBLER_NAME, title: GAMBLER_TITLE, res: "칩", trainNames: GM_TRAIN_NAMES,
    rules: [
      `적중으로 칩을 모읍니다. 칩 ${GM_BET.coins}개가 되면 풀 베팅 — 다음 공격 스킬의 첫 적중에 금화 ${GM_BET.coins}발(한 발 ${x(GM_BET.mul)}, 합 ${x(GM_BET.mul * GM_BET.coins)})이 더 나갑니다.`,
      `실패(운명의 눈 ${GM_DICE.fail} 이하 · 777 낮은 결과)가 ${GM_LUCK.need}번 이어지면 다음 결과는 최고입니다(행운 연마 ${GM_LUCK.sp50} — ${GM_LUCK.need50}번).`,
      `연마 합계 ${GAMBLER.contract} — 황금 계약: 풀 베팅 한 발 ${x(GM_BET.mulContract)} · 777 잭팟 앞 충격파 ${x(GM_JACK.shockMul)}.`,
    ],
    basic: { s: "chip", act: "fire", name: GM_CHIP.name, lv: U.chip,
      desc: ["황금 칩을 던지는 기본 공격입니다.", `맞히면 칩 +${GM_CHIP.gain}(한 번 던질 때 한 번).`],
      stats: [["피해", x(GM_CHIP.mul)], ["공격 간격", `${GM_CHIP.gap}초`], ["사거리", GM_CHIP.range], ["탄 지름", GM_CHIP.dia]] },
    skills: GM_SLOTS.map((q) => ({ ...q, ...{
      veil: { name: GM_VEIL.name, lv: U.veil, desc: [`내 둘레 아군에게 보호막을 씌웁니다.`, "내 장막이 실제 피해를 막으면 칩 +1.", "다시 쓰면 더하지 않고 큰 쪽으로 바꿉니다."],
        stats: [["대기", `${GM_VEIL.cd}초`], ["범위", `반지름 ${GM_VEIL.r}`], ["보호막", `나 최대 체력 ${pct(GM_VEIL.self)} · 아군 ${pct(GM_VEIL.ally)}`], ["지속", `${GM_VEIL.dur}초`]],
        train: [`방어 연마 ${GM_VEIL.sp25} — 지속 +${GM_VEIL.durAdd}초`, `방어 연마 ${GM_VEIL.sp50} — 나 ${pct(GM_VEIL.self50)} · 아군 ${pct(GM_VEIL.ally50)}`] },
      dice: { name: GM_DICE.name, lv: U.dice, desc: ["겨눈 자리에 주사위를 던져 터뜨립니다.", `눈 1~6 이 같은 확률로 나와 ${GM_DICE.muls.map(x).join(" · ")}.`],
        stats: [["대기", `${GM_DICE.cd}초`], ["사거리", GM_DICE.reach], ["폭발", `반지름 ${GM_DICE.r}`], ["판정", `${GM_DICE.hit}초 뒤 한 번`]],
        train: [`행운 연마 ${GM_DICE.sp25} — 대기 ${GM_DICE.cd25}초`] },
      rain: { name: GM_RAIN.name, lv: U.rain, desc: ["겨눈 자리에 금화를 쏟아붓습니다.", `${GM_RAIN.gap}초 간격으로 ${GM_RAIN.n}번 떨어집니다.`],
        stats: [["대기", `${GM_RAIN.cd}초`], ["사거리", GM_RAIN.reach], ["범위", `반지름 ${GM_RAIN.r}`], ["피해", `${x(GM_RAIN.mul)} × ${GM_RAIN.n} = ${x(GM_RAIN.mul * GM_RAIN.n)}`]],
        train: [`금화 연마 ${GM_RAIN.sp25} — ${GM_RAIN.n25}번`, `금화 연마 ${GM_RAIN.sp50} — ${GM_RAIN.n50}번`] },
      dd: { name: GM_DD.name, lv: U.dd, desc: [`직전 공격 스킬(운명의 눈 · 코인 폭우)을 그 자리에서 ${pct(GM_DD.k)} 세기로 한 번 더 냅니다.`, "다시 낸 공격은 칩 · 풀 베팅을 일으키지 않습니다."],
        stats: [["대기", `${GM_DD.cd}초`], ["비용", `칩 ${GM_DD.cost}`], ["세기", pct(GM_DD.k)]] },
      table: { name: GM_TABLE.name, lv: U.table, desc: ["내 자리에 황금 테이블을 펼칩니다. 처음 놓은 자리에 고정됩니다.", `${GM_TABLE.tick}초마다 칩이 부딪히고 끝날 때 폭발합니다.`],
        stats: [["대기", `${GM_TABLE.cd}초`], ["범위", `반지름 ${GM_TABLE.r}`], ["지속", `${GM_TABLE.dur}초`], ["피해", `${x(GM_TABLE.mul)} × ${GM_TABLE.dur} + 끝 ${x(GM_TABLE.endMul)}`]] },
      edge: { name: GM_EDGE.name, lv: U.edge, desc: ["코인 공격이 세지고 칩을 더 얻습니다.", "코인 공격 — 황금 칩 · 풀 베팅 · 코인 폭우 · 테이블 칩 · 777 코인."],
        stats: [["대기", `${GM_EDGE.cd}초`], ["지속", `${GM_EDGE.dur}초`], ["코인 피해", `+${pct(GM_EDGE.dmg)}`], ["칩", `얻을 때마다 +${GM_EDGE.chip}`]] },
      jack: { name: GM_JACK.name, lv: U.jack, ult: 1, desc: [`겨눈 자리에 코인 ${GM_JACK.coins}번을 떨어뜨린 뒤 결과에 따라 마지막 폭발이 터집니다.`,
        GM_JACK.names.map((n, i) => `${n} ${pct(GM_JACK.odds[i])} ${x(GM_JACK.ends[i])}`).join(" · ")],
        stats: [["대기", `${GM_JACK.cd}초`], ["사거리", GM_JACK.reach], ["범위", `반지름 ${GM_JACK.r}`], ["코인", `${x(GM_JACK.coinMul)} × ${GM_JACK.coins}`]] },
    }[q.s] })),
  };
}

function engineer() {
  const U = ENGINEER.unlock;
  return {
    id: "engineer", name: ENGINEER_NAME, title: ENGINEER_TITLE, res: "전력", trainNames: EN_TRAIN_NAMES,
    rules: [
      `펄스 발진을 맞혀 전력을 모으고 기계를 놓습니다. 설치물은 합쳐 ${ENGINEER.units}기까지(포탑 연마 50 — ${ENGINEER.units50}기).`,
      `연마 합계 ${ENGINEER.central} — 중앙 제어: 오버클럭 중 모든 설치물 피해 +${pct(EN_OC.central)}.`,
    ],
    basic: { s: "pulse", act: "fire", name: EN_PULSE.name, lv: U.pulse,
      desc: ["손목에서 펄스를 쏘는 기본 공격입니다.", `맞히면 전력 +${EN_PULSE.gain}(한 번 쏠 때 한 번).`],
      stats: [["피해", x(EN_PULSE.mul)], ["공격 간격", `${EN_PULSE.gap}초`], ["사거리", EN_PULSE.range], ["탄 지름", EN_PULSE.dia]] },
    skills: EN_SLOTS.map((q) => ({ ...q, ...{
      turret: { name: EN_TURRET.name, lv: U.turret, desc: ["겨눈 자리에 터렛을 세웁니다.", `${EN_TURRET.gap}초마다 쏘고 터렛 하나가 ${EN_TURRET.shots}번까지 쏩니다.`],
        stats: [["비용", `전력 ${EN_TURRET.cost}`], ["대기", `${EN_TURRET.cd}초`], ["설치 거리", EN_TURRET.reach], ["피해", x(EN_TURRET.mul)], ["사거리", EN_TURRET.range], ["지속", `${EN_TURRET.dur}초`], ["동시", `${EN_TURRET.max}기`]],
        train: [`포탑 연마 ${EN_TURRET.sp25} — 사거리 +${pct(EN_TURRET.range25)}`, `포탑 연마 ${EN_TURRET.sp50} — 동시 ${EN_TURRET.max50}기`] },
      drone: { name: EN_DRONE.name, lv: U.drone, desc: [`드론 ${EN_DRONE.n}기가 나를 따라다니며 쏩니다.`, `드론 하나가 ${EN_DRONE.shots}번까지 쏩니다.`],
        stats: [["비용", `전력 ${EN_DRONE.cost}`], ["대기", `${EN_DRONE.cd}초`], ["피해", `${x(EN_DRONE.mul)} · ${EN_DRONE.gap}초마다`], ["사거리", EN_DRONE.range], ["지속", `${EN_DRONE.dur}초`]],
        train: [`드론 연마 ${EN_DRONE.sp25} — 이동 속도 +${pct(EN_DRONE.spd25)}`, `드론 연마 ${EN_DRONE.sp50} — 한 번 ${x(EN_DRONE.mul50)}`] },
      magnet: { name: EN_MAGNET.name, lv: U.magnet, desc: ["겨눈 자리에 자기장을 터뜨립니다.", `일반 몹은 ${EN_MAGNET.bind}초 묶입니다. 보스 · 사람은 묶지 않습니다.`],
        stats: [["비용", `전력 ${EN_MAGNET.cost}`], ["대기", `${EN_MAGNET.cd}초`], ["사거리", EN_MAGNET.reach], ["범위", `반지름 ${EN_MAGNET.r}`], ["피해", x(EN_MAGNET.mul)]] },
      rail: { name: EN_RAIL.name, lv: U.rail, desc: [`${EN_RAIL.warn}초 예고 뒤 곧게 꿰뚫는 레일포를 쏩니다.`, "벽에 닿으면 그 앞에서 멈춥니다."],
        stats: [["비용", `전력 ${EN_RAIL.cost}`], ["대기", `${EN_RAIL.cd}초`], ["길이", EN_RAIL.len], ["폭", EN_RAIL.w], ["피해", x(EN_RAIL.mul)]],
        train: [`동기화 연마 ${EN_RAIL.sp25} — 폭 +${pct(EN_RAIL.w25)}`, `오버클럭 중 피해 +${pct(EN_RAIL.ocDmg)}`] },
      mech: { name: EN_MECH.name, lv: U.mech, desc: ["강철 수호자가 내려와 가까운 적을 쫓아 칩니다.", `끝날 때 반지름 ${EN_MECH.endR} 폭발.`],
        stats: [["비용", `전력 ${EN_MECH.cost}`], ["대기", `${EN_MECH.cd}초`], ["피해", `${x(EN_MECH.mul)} · ${EN_MECH.gap}초마다(최대 ${EN_MECH.hits}번)`], ["끝 폭발", x(EN_MECH.endMul)], ["지속", `${EN_MECH.dur}초`]] },
      oc: { name: EN_OC.name, lv: U.oc, desc: [`기계 공격 속도 ${EN_OC.spd}배 · 레일포 피해 +${pct(EN_RAIL.ocDmg)}.`,
        `켜진 동안 과열이 초당 +${EN_OC.heat} 오릅니다. 100 이 되면 꺼지고 ${EN_OC.lock}초 동안 다시 켤 수 없습니다.`],
        stats: [["비용", `전력 ${EN_OC.cost}`], ["대기", `${EN_OC.cd}초`], ["지속", `최대 ${EN_OC.dur}초`], ["식기", `초당 −${EN_OC.cool}`]],
        train: [`동기화 연마 ${EN_OC.sp50} — 과열 초당 +${EN_OC.heat50}`] },
      orbit: { name: EN_ORBIT.name, lv: U.orbit, ult: 1, desc: [`겨눈 자리에 궤도 포격 ${EN_ORBIT.n}번 뒤 광선이 내려옵니다.`,
        `시전 순간 설치물 1기마다 마지막 피해 +${pct(EN_ORBIT.per)}(최대 +${pct(EN_ORBIT.perMax)}).`],
        stats: [["비용", `전력 ${EN_ORBIT.cost}`], ["대기", `${EN_ORBIT.cd}초`], ["사거리", EN_ORBIT.reach], ["범위", `반지름 ${EN_ORBIT.r}`], ["피해", `${x(EN_ORBIT.mul)} × ${EN_ORBIT.n} + 마지막 ${x(EN_ORBIT.endMul)}`]] },
    }[q.s] })),
  };
}

function necro() {
  const U = NECRO.unlock;
  return {
    id: "necromancer", name: NECRO_NAME, title: NECRO_TITLE, res: "영혼", trainNames: NC_TRAIN_NAMES,
    rules: [
      `영혼 — 평타 적중 +${NC_SOUL.hit} · 처치에 기여한 일반 몹 +${NC_SOUL.kill} · 보스에게 유효 피해 ${NC_SOUL.bossHits}번마다 +${NC_SOUL.boss}.`,
      `쓰러뜨린 몹 자리에 흔적이 남고 흔적 추출로 그림자 명부에 넣습니다. 명부 ${NC_ROSTER.slots}종(추출 연마 ${NC_ROSTER.sp25} — ${NC_ROSTER.slots25}종) · 등급 1~${NC_ROSTER.grades}.`,
      `등급마다 그림자 공격 +${pct(NC_ROSTER.gradeDmg)}. 그림자는 피해를 받지 않습니다.`,
    ],
    basic: { s: "reap", act: "fire", name: NC_SCYTHE.name, lv: U.reap,
      desc: ["앞쪽 부채꼴을 낫으로 베는 근접 기본 공격입니다.", `한 번에 가까운 ${NC_SCYTHE.max}명까지. 맞히면 영혼 +${NC_SOUL.hit}.`],
      stats: [["피해", x(NC_SCYTHE.mul)], ["공격 간격", `${NC_SCYTHE.gap}초`], ["거리", NC_SCYTHE.reach], ["각도", deg(NC_SCYTHE.arc)]] },
    skills: NC_SLOTS.map((q) => ({ ...q, ...{
      extract: { name: NC_EXTRACT.name, lv: U.extract, desc: ["가장 가까운 흔적을 그림자로 명부에 넣습니다.", "이미 있는 종류면 승급 재추출로 셉니다. 흔적이 없으면 영혼 · 대기를 쓰지 않습니다."],
        stats: [["비용", `영혼 ${NC_EXTRACT.cost}`], ["대기", `${NC_EXTRACT.cd}초`], ["범위", `반지름 ${NC_EXTRACT.r}`], ["승급", `재추출 ${NC_ROSTER.cost.join(" · ")}`]] },
      summon: { name: NC_SUMMON.name, lv: U.summon, desc: [`명부의 그림자를 최대 ${NC_SUMMON.max}기 부릅니다.`, "군단 편성 차례 → 남은 칸은 등급 높은 순서. 이미 나와 있으면 거두고 새로 부릅니다."],
        stats: [["비용", `영혼 ${NC_SUMMON.cost}`], ["대기", `${NC_SUMMON.cd}초`], ["피해", `${x(NC_SUMMON.mul)} · ${NC_SUMMON.gap}초마다`], ["지속", `${NC_SUMMON.dur}초`]] },
      swap: { name: NC_SWAP.name, lv: U.swap, desc: ["포인터에 가장 가까운 내 그림자와 자리를 바꿉니다.", "피해는 없습니다."],
        stats: [["비용", `영혼 ${NC_SWAP.cost}`], ["대기", `${NC_SWAP.cd}초`], ["거리", NC_SWAP.reach]] },
      domain: { name: NC_DOMAIN.name, lv: U.domain, desc: ["나를 따라다니는 영역을 펼칩니다.", `안의 그림자 피해 +${pct(NC_DOMAIN.dmg)} · 걷는 빠르기 +${pct(NC_DOMAIN.spd)}.`],
        stats: [["비용", `영혼 ${NC_DOMAIN.cost}`], ["대기", `${NC_DOMAIN.cd}초`], ["범위", `반지름 ${NC_DOMAIN.r}`], ["지속", `${NC_DOMAIN.dur}초`]],
        train: [`군주 연마 ${NC_DOMAIN.sp25} — ${NC_DOMAIN.dur25}초`, `군주 연마 ${NC_DOMAIN.sp50} — 피해 +${pct(NC_DOMAIN.dmg50)}`] },
      march: { name: NC_MARCH.name, lv: U.march, desc: ["겨눈 자리에서 가장 가까운 적을 모든 그림자가 차례로 칩니다.", "그 뒤 그림자는 그 적을 먼저 노립니다."],
        stats: [["비용", `영혼 ${NC_MARCH.cost}`], ["대기", `${NC_MARCH.cd}초`], ["거리", NC_MARCH.reach], ["피해", `그림자마다 ${x(NC_MARCH.mul)}`]],
        train: [`지휘 연마 ${NC_MARCH.sp50} — 그림자마다 ${x(NC_MARCH.mul50)}`] },
      burn: { name: NC_BURN.name, lv: U.burn, desc: ["나와 있는 그림자를 모두 겨눈 자리로 돌진시켜 터뜨립니다.", `명부는 그대로이고 쓴 종류는 ${NC_BURN.lock}초 동안 부르지 못합니다.`],
        stats: [["비용", `영혼 ${NC_BURN.cost}`], ["대기", `${NC_BURN.cd}초`], ["거리", NC_BURN.reach], ["범위", `반지름 ${NC_BURN.r}`], ["피해", `그림자마다 ${x(NC_BURN.mul)}(최대 ${x(NC_BURN.mul * NC_SUMMON.max)})`]] },
      legion: { name: NC_LEGION.name, lv: U.legion, ult: 1, desc: [`겨눈 자리에 군세 파동 ${NC_LEGION.waves}번 뒤 검은 가시와 마지막 폭발.`, `영원의 명령이면 마지막 폭발 ${x(NC_LEGION.endMul150)}.`],
        stats: [["비용", `영혼 ${NC_LEGION.cost}`], ["대기", `${NC_LEGION.cd}초`], ["거리", NC_LEGION.reach], ["범위", `반지름 ${NC_LEGION.r}`], ["피해", `${x(NC_LEGION.mul)} × ${NC_LEGION.waves} + 마지막 ${x(NC_LEGION.endMul)}`]] },
    }[q.s] })),
  };
}

function illusion() {
  const U = ILLUSION.unlock, T = IL_TRICK;
  return {
    id: "illusionist", name: ILLUSION_NAME, title: ILLUSION_TITLE, res: "트릭", trainNames: IL_TRAIN_NAMES,
    rules: [
      `트릭 최대 ${T.max}. 절단 카드 적중 +${T.basic} · 다른 이름의 공격 스킬을 ${T.window}초 안에 이어 맞히면 +${T.chain}(같은 스킬 반복은 없음).`,
      `트릭 ${T.cost}개 이상에서 공격 스킬을 쓰면 ${T.cost}개를 쓰고 첫 적중 대상에게 잔상 한 번 — 그 스킬 첫 타격의 ${pct(T.ghost)}(트릭 연마 ${T.sp50} — ${pct(T.ghost50)}).`,
      `${T.window}초 동안 유효 공격이 없으면 연계 기록이 지워집니다(트릭 연마 ${T.sp25} — ${T.window25}초). 잔상은 트릭을 만들지 않습니다.`,
      `연마 합계 ${ILLUSION.encore} — 끝없는 앙코르: 미러 하우스 안 잔상이 ${pct(IL_MIRROR.encore)} 커지고 최후의 셔플 끝에 거울 파쇄 ${x(IL_FINAL.encoreMul)}.`,
    ],
    basic: { s: "card", act: "fire", name: IL_CARD.name, lv: U.card,
      desc: ["날카로운 카드를 던지는 기본 공격입니다.", `맞히면 트릭 +${T.basic}.`],
      stats: [["피해", x(IL_CARD.mul)], ["공격 간격", `${IL_CARD.gap}초`], ["사거리", IL_CARD.range], ["폭", IL_CARD.w]] },
    skills: IL_SLOTS.map((q) => ({ ...q, ...{
      shuffle: { name: IL_SHUFFLE.name, lv: U.shuffle, desc: ["겨눈 자리로 카드를 차례로 던지고 마지막에 터뜨립니다.", "폭발 반지름과 판정 범위가 같습니다."],
        stats: [["대기", `${IL_SHUFFLE.cd}초`], ["사거리", IL_SHUFFLE.reach], ["범위", `반지름 ${IL_SHUFFLE.r}`], ["피해", `${x(IL_SHUFFLE.mul)} × ${IL_SHUFFLE.n} + 폭발 ${x(IL_SHUFFLE.endMul)}`]],
        train: [`카드 연마 ${IL_SHUFFLE.sp25} — 카드 +${IL_SHUFFLE.add25}장`] },
      slash: { name: IL_SLASH.name, lv: U.slash, desc: ["카드를 두른 채 두 번 돌진하며 벱니다.", "벽 앞에서 멈춥니다."],
        stats: [["대기", `${IL_SLASH.cd}초`], ["돌진", IL_SLASH.len], ["폭", IL_SLASH.w], ["피해", `${x(IL_SLASH.mul)} × 2`]] },
      prison: { name: IL_PRISON.name, lv: U.prison, desc: ["카드 상자로 가두고 네 번 친 뒤 접히며 터집니다.", `일반 몹은 묶고 보스는 둔화만 · 사람은 최대 ${IL_PRISON.pvpBind}초.`],
        stats: [["대기", `${IL_PRISON.cd}초`], ["사거리", IL_PRISON.reach], ["범위", `반지름 ${IL_PRISON.r}`], ["피해", `${x(IL_PRISON.mul)} × 4 + 최종 ${x(IL_PRISON.endMul)}`]] },
      blink: { name: IL_BLINK.name, lv: U.blink, desc: ["겨눈 쪽으로 순간이동하고 원래 자리의 카드 분신이 터집니다.", "도착 자리가 막혔으면 가장 가까운 자리로. 자리가 없으면 쓰지 않습니다."],
        stats: [["대기", `${IL_BLINK.cd}초`], ["이동", IL_BLINK.len], ["폭발", `반지름 ${IL_BLINK.r}`], ["피해", x(IL_BLINK.mul)]],
        train: [`공간 연마 ${IL_BLINK.sp25} — 이동 ${IL_BLINK.len25}`, `공간 연마 ${IL_BLINK.sp50} — 폭발 반지름 ${IL_BLINK.r50}`] },
      fist: { name: IL_FIST.name, lv: U.fist, desc: ["카드 다발을 큰 주먹으로 뭉쳐 앞으로 내지릅니다.", "곧은 띠 안을 모두 칩니다."],
        stats: [["대기", `${IL_FIST.cd}초`], ["거리", IL_FIST.len], ["폭", IL_FIST.w], ["피해", x(IL_FIST.mul)]],
        train: [`카드 연마 ${IL_FIST.sp50} — ${x(IL_FIST.mul50)}`] },
      mirror: { name: IL_MIRROR.name, lv: U.mirror, desc: ["쓴 자리에 거울 집을 세웁니다.", `안에서 쓴 공격 스킬은 첫 적중 대상에게 ${pct(IL_MIRROR.ghost)} 잔상을 한 번 더 줍니다.`],
        stats: [["대기", `${IL_MIRROR.cd}초`], ["범위", `반지름 ${IL_MIRROR.r}`], ["지속", `${IL_MIRROR.dur}초`], ["트릭", "0"]] },
      final: { name: IL_FINAL.name, lv: U.final, ult: 1, desc: [`카드 ${IL_FINAL.n}장이 원으로 서서 연달아 치고 큰 거울이 부서집니다.`, `트릭을 모두 씁니다. ${T.max}개면 최종 +${pct(IL_FINAL.full)}.`],
        stats: [["대기", `${IL_FINAL.cd}초`], ["사거리", IL_FINAL.reach], ["범위", `반지름 ${IL_FINAL.r}`], ["피해", `${x(IL_FINAL.mul)} × ${IL_FINAL.n} + 최종 ${x(IL_FINAL.endMul)}`]] },
    }[q.s] })),
  };
}

const MAKERS = { gambler, engineer, necromancer: necro, illusionist: illusion };
export const HIDDEN_SKILL_JOBS = Object.keys(MAKERS);
export const hiddenSkillInfo = (id) => (MAKERS[id] ? MAKERS[id]() : null);
