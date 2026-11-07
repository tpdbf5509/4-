/* 메인 스토리 대사 한 줄을 만드는 짧은 함수 — storySteps*.js 가 같이 쓴다.
   {s: 말하는 사람, t: 대사, if / not: 꼬리표 조건, tr: 관계 조건}
   s — STORY_PEOPLE id · 'me'(내 캐릭터) · 'soeun'(기록관 소은) · 'sys'(장치 · 시설 음성, n 에 이름) · 'nar'(장면 설명) */
export const L = (s, t, o) => ({s, t, ...o});
export const me = (t, o) => L('me', t, o);
export const sys = (n, t, o) => ({s: 'sys', n, t, ...o});
export const nar = (t, o) => ({s: 'nar', t, ...o});

/* 보스 결전 한 박자 — 시간 안에 맞는 대응을 고른다. 틀리거나 늦으면 같은 질문으로 돌아온다(막다른 길 없음).
   ok: 맞는 대응, bads: 틀린 대응 [[대사, 장면]], hit: 늦었을 때 장면, okAt: 맞는 대응의 자리(0부터) */
export const beat = (sec, ok, okThen, bads, hit, okAt = 0) => {
  const pick = bads.map(([t, why]) => ({t, wrong: true, then: [nar(why)]}));
  pick.splice(Math.min(okAt, pick.length), 0, {t: ok, then: [nar(okThen)]});
  return {timer: sec, late: {t: '…!', then: [nar(hit)]}, pick};
};
