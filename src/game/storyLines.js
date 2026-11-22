/* 메인 스토리 대사 한 줄을 만드는 짧은 함수 — storySteps*.js 가 같이 쓴다.
   {s: 말하는 사람, t: 대사, if / not: 꼬리표 조건, tr: 관계 조건}
   s — STORY_PEOPLE id · 'me'(내 캐릭터) · 'soeun'(기록관 소은) · 'sys'(장치 · 시설 음성, n 에 이름) · 'nar'(장면 설명) */
export const L = (s, t, o) => ({s, t, ...o});
export const me = (t, o) => L('me', t, o);
export const sys = (n, t, o) => ({s: 'sys', n, t, ...o});
export const nar = (t, o) => ({s: 'nar', t, ...o});
// 결전 한 구간 — 장면 설명과 함께 대화 창 위쪽 체력 막대를 hp(%)로 바꾼다. 실제 전투 수치와 상관없는 연출이다
export const boss = (name, hp, t, o) => nar(t, {boss: [name, hp], ...o});
// 컷신 — 대화 창이 이 자리에서 짧은 영상(cutsceneData.js)을 틀고 끝나면 다음 줄로 넘어간다.
// t 는 기록 창 · 다시 볼 때(이전 단추) 보이는 장면 설명이다
export const cut = (id, t, o) => nar(t, {cut: id, ...o});

/* 보스 결전 한 박자 — 시간 안에 맞는 대응을 고른다. 틀리거나 늦으면 같은 질문으로 돌아온다(막다른 길 없음).
   ok: 맞는 대응, bads: 틀린 대응 [[대사, 장면]], hit: 늦었을 때 장면, okAt: 맞는 대응의 자리(0부터) */
export const beat = (sec, ok, okThen, bads, hit, okAt = 0) => {
  const pick = bads.map(([t, why]) => ({t, wrong: true, then: [nar(why)]}));
  pick.splice(Math.min(okAt, pick.length), 0, {t: ok, then: [nar(okThen)]});
  return {timer: sec, late: {t: '…!', then: [nar(hit)]}, pick};
};

/* 이야기 장면 공통 연출(11월 22일 사용자 「연출은 실제로 제작해」) — v4 문서에 장면마다 복사돼 있던 공통 지시를 한 곳에서 만든다.
   VillagePanel(배경음 · 반 박자 · 결과 뒤 쉼 · 시간 제한 경고음)과 RpgView(장면 시작 카메라)가 읽는다. 시간은 초 */
export const STORY_FX = {
  focus: 1.5,     // 장면 시작 — 카메라가 나와 상대 사이를 화면 가운데에 둔다
  lift: 0.15,     // 그때 아래 자막 띠에 가리지 않게 화면 높이의 이만큼 위로 올려 보인다
  duck: 0.35,     // 장면 동안 배경음악 크기(몫). 효과음은 그대로
  back: 2,        // 두 번째 대사가 끝나면 배경음악이 이만큼에 걸쳐 돌아온다
  turn: 0.35,     // 말하는 사람이 바뀌면 듣는 쪽이 반 박자 멈춘다(넘기기 잠금을 더 둔다)
  settle: 1.2,    // 결과가 확정된 뒤 다음 목표(알게 된 것 · 닫기)를 보여 주기 전 쉼
};
