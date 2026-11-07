/* 메인 이야기를 마친 뒤 — 마을 후일담 대사와 기념 기록서(문서 30-05 · 34장 "분기 결과 후일담이 마을에 남는지").
   후일담: 30-05 를 마친 사람이 마을 인물에게 말을 걸면 평소 소개 대신 이 줄을 본다(VillagePanel).
     줄 조건은 이야기 대사와 같다(if / not 꼬리표 · tr 관계, storyQuestData.js storyLineShown).
   기념 기록서: 가방 "책" 탭에 완결한 사람에게만 보인다. 내가 고른 큰 선택을 차례대로 적는다(ShopPanel Books). */
import {storyFlag} from './storyQuestData.js';

export const STORY_AFTER = {
  lia: [
    {t: '아빠가 요즘 수송로 표지판을 새로 세워요. 이번엔 제 이름도 같이 적었어요.'},
    {t: '그날 아빠 이야기를 바로 해 줘서 고마워요. 무서웠지만 기다리는 게 덜 힘들었어요.', if: 'S1_LIA_TRUTH:tell'},
    {t: '아빠 일은 나중에 들었어요. 그래도 그때 곁에 있어 준 건 알아요.', if: 'S1_LIA_TRUTH:defer'},
    {t: '여관에 모험가님 의자 비워 뒀어요. 제로가 옆에 의자를 하나 더 놨더라고요.', if: 'c30_stay'},
    {t: '어디 가든 북문 종이 울리면 생각나요. 다녀오세요.', if: 'c30_travel'},
    {t: '게시판 글 보셨어요? 언제든 돌아올 곳이요. 제가 붙였어요.', if: 'c30_return'},
  ],
  hangyeol: [
    {t: '남문은 오늘도 조용합니다. 이제는 그 조용함을 믿어도 될 것 같습니다.'},
    {t: '물자창고를 지킨 그날 판단, 지금도 장부에 남아 있습니다.', if: 'S1_RESCUE:supply'},
    {t: '다친 주민부터 구한 그날 판단, 지금도 마을 사람들이 이야기합니다.', if: 'S1_RESCUE:civilian'},
    {t: '공동 의회 회의 날짜로 카엘과 또 다퉜습니다. 저녁 식사는 지켰습니다.', if: 'S29_FUTURE:council'},
    {t: '연합 연락선 점검표가 늘었습니다. 세라가 매일 들고 옵니다.', if: 'S29_FUTURE:federation'},
    {t: '저녁 약속, 잊지 않으셨지요?', tr: {hangyeol: 1}},
  ],
  mina: [
    {t: '새 방어 장치는 아직 고장이 많아. 오늘도 손댈 게 산더미야.'},
    {t: '이리온이랑 기록 보관소 복구 장치를 같이 고치고 있어. 말은 여전히 어렵게 해.', if: 'S14_IRION:hear'},
    {t: '이리온은 재판을 기다리면서도 아이들한테 책을 읽어 줘. 나도 가끔 들으러 가.', if: 'S14_IRION:arrest'},
    {t: '아르카의 격리 기록, 아직 내가 지켜보고 있어.', if: 'S4_ARKA:isolate'},
    {t: '모르는 건 모른다고 말할게. 대신 끝까지 같이 찾아보자.', tr: {mina: 1}},
  ],
  bori: [
    {t: '전쟁 명령서 원본이 아직도 제 가판 밑에 있어요. 비매품이에요.'},
    {t: '지하 도서관 자료가 모두에게 열리고 나서 손님이 늘었어요.', if: 'S8_ARCHIVE:open'},
    {t: '지하 도서관 자료는 위험한 부분만 빼고 열렸어요. 그래도 줄이 길어요.', if: 'S8_ARCHIVE:restrict'},
    {t: '무명해역 좌표 사본이 도시마다 돌아요. 저도 한 장 구했어요.', if: 'S21_MAP:share'},
    {t: '무명해역 이야기는 아직 소문뿐이에요. 누가 지켜 주고 있대요.', if: 'S21_MAP:hide'},
  ],
  'dawn-archivist': [
    {t: '기록관에 새 칸을 만들었어요. 당신이 고른 것들이 같은 크기로 적혀 있어요.'},
    {t: '당신의 실패 기록도 이름과 함께 공개해 뒀어요. 숨기지 않아서 고마워요.', if: 'S18_PUBLIC_WORD:admit'},
    {t: '전쟁 명령의 진위를 조사하는 의뢰가 아직 열려 있어요.', if: 'S18_PUBLIC_WORD:investigate'},
    {t: '실종자 명단에는 아직 찾는 중이라는 글이 남아 있어요.', if: 'S18_PUBLIC_WORD:promise'},
    {t: '가방의 책 칸에 기념 기록서를 넣어 두었어요. 천천히 읽어 보세요.'},
  ],
};

// 큰 선택 — 기록서에 적는 문장. 고르지 않은 것은 적지 않는다
const BOOK_FLAGS = [
  ['1장', 'S1_RESCUE', {supply: '물자창고를 먼저 지켰다.', civilian: '다친 주민부터 구했다.'}],
  ['1장', 'S1_LIA_TRUTH', {tell: '리아에게 아직 찾지 못했다고 솔직히 말했다.', defer: '리아에게 곧 돌아오실 거라고 달랬다.'}],
  ['2장', 'S2_ZERO', {free: '제로의 구속을 풀었다.', contain: '안전을 위해 제로에게 수갑을 채웠다.'}],
  ['3장', 'S3_SEAL_ORDER', {evacuation: '봉인보다 주민 대피를 먼저 도왔다.', core: '봉인 제어실로 먼저 갔다.'}],
  ['4장', 'S4_ARKA', {isolate: '아르카의 코어를 격리해 보존했다.', destroy: '아르카의 코어를 완전히 파괴했다.'}],
  ['8장', 'S8_ARCHIVE', {open: '해독 결과를 공공 기록관에 공개했다.', restrict: '위험한 구동부만 빼고 공개했다.'}],
  ['12장', 'S12_EVIDENCE', {publish: '첫 거짓말의 원본을 모두 공개했다.', secure: '증거를 검증하고 보관한 뒤 공개했다.'}],
  ['14장', 'S14_IRION', {hear: '이리온의 이야기를 듣고 함께 구했다.', arrest: '이리온을 무장 해제하고 체포했다.'}],
  ['16장', 'S16_ALLIANCE', {joint: '인간과 기계의 합동 분대를 꾸렸다.', separate: '두 진영이 구역을 따로 맡게 했다.'}],
  ['18장', 'S18_TRIAL', {trial: '공개 재판으로 위법 행위를 심사했다.', military: '군 지휘권을 해제하고 조사했다.'}],
  ['18장', 'S18_PUBLIC_WORD', {admit: '내 판단이 늦었다고 공개적으로 인정했다.', investigate: '누가 명령을 바꿨는지 밝히겠다고 했다.', promise: '찾는 일을 멈추지 않겠다고 약속했다.'}],
  ['21장', 'S21_MAP', {share: '무명해역 좌표를 도시 대표들과 나눴다.', hide: '생존자가 안전할 때까지 좌표를 숨겼다.'}],
  ['24장', 'S24_OBSERVER', {disconnect: '도시를 들여다보는 연결을 끊었다.', trace: '관측자 본체로 가는 경로를 남겼다.'}],
  ['24장', 'S24_RECORD_READING', {cycle: '세 기록을 다른 주기의 영상으로 읽었다.', forgery: '세 기록에 조작이 있다고 읽었다.', unknown: '세 기록의 결론을 내리지 않았다.'}],
  ['27장', 'S27_ZERO_MEMORY', {restore: '제로가 원해 기억을 한 단계씩 되살렸다.', respect: '제로의 지금 뜻을 먼저 따랐다.'}],
  ['29장', 'S29_FUTURE', {council: '네 도시 대표가 함께 승인하는 의회를 골랐다.', federation: '도시마다 독립 권한을 가진 연합을 골랐다.'}],
];
const TRUST_NAME = {mina: '미나', zero: '제로', sera: '세라', irion: '이리온', kael: '카엘', hangyeol: '한결'};
const trustWord = (v) => (v >= 2 ? '깊이 믿는다' : v === 1 ? '믿는 편이다' : v === 0 ? '아직 알아 가는 중' : v === -1 ? '조금 거리가 있다' : '많이 멀어졌다');

export const STORY_BOOK_ID = 'story-memorial';
// 기념 기록서 — 고른 꼬리표(c) · 관계(t)로 쪽을 만든다
export function storyBook(c, t) {
  const picks = BOOK_FLAGS.map(([ch, key, said]) => { const v = storyFlag(c, key); return v && said[v] ? `${ch} · ${said[v]}` : null; }).filter(Boolean);
  const half = Math.ceil(picks.length / 2);
  return {
    id: STORY_BOOK_ID, title: '네 갈래 방어선 기념 기록서', sub: '메인 이야기를 마친 사람의 기록', color: '#b8a6c9',
    pages: [
      {h: '네 갈래 방어선', p: ['에르덴 기록관 소은이 엮은 기록입니다.', '1장 사라진 수송대부터 30장 네 갈래 방어선까지를 지나온 사람의 선택을 적었습니다.', '누구도 혼자 세계를 지키지 않았습니다.']},
      {h: '고른 길 · 앞', p: picks.slice(0, half).length ? picks.slice(0, half) : ['적힌 선택이 없습니다.']},
      ...(picks.length > half ? [{h: '고른 길 · 뒤', p: picks.slice(half)}] : []),
      {h: '함께 걸은 사람들', p: Object.entries(TRUST_NAME).map(([k, n]) => `${n} · ${trustWord(Math.round(Number(t?.[k]) || 0))}`)},
      {h: '남은 질문', p: ['세계가 왜 만들어졌는지는 아직 모릅니다.', '관측자가 선했는지 악했는지도 정하지 않았습니다.', '기록이 어디서 왔는지는 열린 질문으로 남겨 둡니다.']},
    ],
  };
}
