/* 마지막 진혼곡 — 기존 해금 시험과 분리된 전용 무기 획득 경로. */
export const RQ = {
  name: '마지막 진혼곡', book: 'red-river', weapon: 'blood_gun', level: 100, job: 100, train: 20,
  // 물리력 100포인트 = 310: 기본 피해 1,240, 압축20의 2단 적혈탄 15,004 / 1.9초.
  // 고릴라 왕(110레벨) 15만/420과 비교. 전용 직업의 강화 피해와 혈량 회복 시간을 반영한 약 90초 목표.
  hp: 600000, shield: 36000, frontCut: .7, vulnerable: 1.4, stun: 4,
  attacks: [{gap:3.6,warn:1.2,r:150,dmg:240}, {gap:3.2,warn:1.4,r:230,dmg:320,drain:30}, {gap:2.2,warn:1.3,r:290,dmg:420}],
  bossAt:{x:1050,y:480}, speed:70, reveal:5.5, doorTime:3.5, fieldTime:2,
  door:{x:1100,y:330,r:125}, core:{x:420,y:850}, field:{x:900,y:850,r:55},
  chains:[{x:1250,y:730},{x:1450,y:850},{x:1250,y:1000}], tube:{x:900,y:340,r:130}, spawn:[900,1120],
};
export const RQ_MAPS=Array.from({length:16},(_,i)=>`requiem-${i}`);
export const rqMap=map=>RQ_MAPS.includes(map);
export const RQ_LINES=['생체 반응 확인','식별 번호 001','폐기 명령이 이행되지 않았습니다','마지막 실험을 재개합니다'];
export const RQ_CLUE=['책장을 덮으려던 순간, 손끝에서 한 방울의 피가 떨어졌다.','오래된 종이에 붉은 문장이 떠올랐다.','「첫 번째 피는 아직 마지막 노래를 찾지 못했다.」'];
export function cleanRq(d) {
  if (!d || !d.started) return null;
  const a=d.a?1:0,b=d.b?1:0,c=Math.max(0,Math.min(7,Number(d.c)|0)),killed=a&&b&&c===7&&d.killed?1:0;
  return {started:1,clue:1,a,b,c,killed,rewarded:killed&&d.rewarded?1:0};
}
export const rqEligible=h=>!!(h?.bag?.bd?.on&&!h.bag.bd.trial&&h.lv>=RQ.level&&h.bag.bd.lv>=RQ.job&&h.bag.bd.tr[0][0]>=RQ.train);
export const rqSealed=q=>!!q&&q.a&&q.b&&q.c===7;
export function rqGoal(h) {
  const q=h?.bag?.rq;if(!q)return '';
  if(q.rewarded)return '크림슨 레퀴엠과 동기화했습니다.';
  if(q.killed)return '제3격리실 봉인된 유리관에서 보상을 수령하세요.';
  if(rqSealed(q))return '제3격리실 중앙 문 너머 봉인된 유리관을 조사하세요.';
  if(!rqMap(h.map))return '폐쇄 연구시설을 다시 조사하세요. 광장 분수의 수문으로 내려갑니다.';
  return `봉인 해제: 압축 ${q.a?'완료':'2단계 적혈탄'} · 증폭 ${q.b?'완료':'장치 위 혈역 2초'} · 형상화 ${[1,2,4].filter(b=>q.c&b).length}/3`;
}
// 화면의 저장·계정 생성으로 서버 전용 보상을 만들 수 없다. 서버 장부에 이미 있는 기록만 보존한다.
export function protectRq(data, old) {
  if (!data || typeof data!=='object') return data;
  const b=data.bag&&typeof data.bag==='object'?data.bag:{};
  const saved=old?.bag||{}, weapons=(Array.isArray(b.w)?b.w:[]).filter(w=>w?.sp!=='blood_gun');
  const kept=(Array.isArray(saved.w)?saved.w:[]).filter(w=>w?.sp==='blood_gun');
  // 클라이언트가 다른 무기에 같은 u를 사용해도 기존 레퀴엠을 덮지 않는다.
  const w=weapons.filter(w=>!kept.some(k=>k.u===w.u)).concat(kept);
  const bag={...b,w,n:Math.max(Number(b.n)||1,...w.map(v=>(Number(v.u)||0)+1))};
  if(saved.rq)bag.rq=cleanRq(saved.rq);else delete bag.rq;
  return {...data,bag};
}

export const RQ_ART={root:"/assets/game/rpg/requiem/",w:96,h:128,pivot:120,fxW:200,fxH:90,frames:8};
