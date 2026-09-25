/* 병과를 대표하는 캐릭터 그림.
   그림 파일은 public/assets/characters/players/<병과id>/portrait.webp 에 두고, 병과 id로 찾아 쓴다.
   새 병과 캐릭터가 나오면 그 폴더에 portrait.webp · arena.webp 를 넣고 아래 표에 한 줄만 더하면 된다. */

export const TOWER_CHARACTERS = {
  archer: {
    src: "/assets/characters/players/archer/portrait.webp",
    alt: "궁수탑 캐릭터 — 활을 당기는 초록 두건의 궁수",
  },
  cannon: {
    src: "/assets/characters/players/cannon/portrait.webp",
    alt: "대포탑 캐릭터 — 대포를 쏘는 주황 머리의 포병",
  },
  sniper: {
    src: "/assets/characters/players/sniper/portrait.webp",
    alt: "저격탑 캐릭터 — 저격총을 겨눈 검은 두건의 저격수",
  },
  bolt: {
    src: "/assets/characters/players/bolt/portrait.webp",
    alt: "번개탑 캐릭터 — 번개를 두른 금발의 번개 마법사",
  },
  flame: {
    src: "/assets/characters/players/flame/portrait.webp",
    alt: "화염탑 캐릭터 — 불덩이를 든 붉은 머리의 불꽃 전사",
  },
  poison: {
    src: "/assets/characters/players/poison/portrait.webp",
    alt: "독탑 캐릭터 — 독병을 든 보라 머리의 독 연금술사",
  },
  gravity: {
    src: "/assets/characters/players/gravity/portrait.webp",
    alt: "중력탑 캐릭터 — 중력 구슬을 띄운 보랏빛 두건의 술사",
  },
  supply: {
    src: "/assets/characters/players/supply/portrait.webp",
    alt: "보급소 캐릭터 — 지팡이와 물약을 든 분홍 차림의 보급병",
  },
  paladin: {
    src: "/assets/characters/players/paladin/portrait.webp",
    alt: "성기사탑 캐릭터 — 검과 방패를 든 금발의 성기사",
  },
  corrode: {
    src: "/assets/characters/players/corrode/portrait.webp",
    alt: "부식탑 캐릭터 — 산성 액체를 두른 검은 두건의 부식술사",
  },
  frost: {
    src: "/assets/characters/players/frost/portrait.webp",
    alt: "서리탑 캐릭터 — 눈송이를 띄우는 흰 머리의 얼음 마법사",
  },
};

export const charOf = (id) => TOWER_CHARACTERS[id] || null;

/* 그림은 잘리지 않게 통째로 담는다(object-fit: contain). */
export function TowerChar({ id, className = "" }) {
  const c = charOf(id);
  if (!c) return null;
  return <img className={`tower-char ${className}`.trim()} src={c.src} alt={c.alt} draggable="false" />;
}
