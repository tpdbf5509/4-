/* 병과를 한눈에 알아보게 해 주는 캐릭터 그림.
   돌판 위의 타워와 같은 색을 쓰고, 작게 줄여도 들고 있는 무기가 먼저 보이게 그린다. */

/* 궁수탑 — 두건을 쓰고 활을 당기는 아이 */
function Archer() {
  return (
    <svg viewBox="6 5 54 54" xmlns="http://www.w3.org/2000/svg">
      {/* 등에 멘 화살통 */}
      <g transform="translate(-2.5,6)" strokeLinecap="round">
        <path d="M13 30l2.2-8" stroke="#cbb68c" strokeWidth="1.4" />
        <path d="M16.6 30l1.4-8" stroke="#cbb68c" strokeWidth="1.4" />
        <path d="M15.2 22.2l-2.4 1M15.2 22.2l1.7 1.8" stroke="#cfe0b4" strokeWidth="1.4" />
        <path d="M18 22.2l-2.4 1M18 22.2l1.7 1.8" stroke="#cfe0b4" strokeWidth="1.4" />
        <rect x="9.5" y="28" width="11" height="17" rx="4" fill="#8a5c33" stroke="none" />
        <path d="M9.5 33h11" stroke="#674222" strokeWidth="2.4" />
      </g>

      {/* 망토를 두른 몸 */}
      <path d="M27 32c-8.5 0-12.5 9-13.5 24h27c-1-15-5-24-13.5-24z" fill="#4e9e5a" />
      <path d="M13.8 52c-.1 1.3-.2 2.6-.3 4h27c-.1-1.4-.2-2.7-.3-4z" fill="#2f6b39" />

      {/* 얼굴과 두건 */}
      <ellipse cx="27" cy="22" rx="10.5" ry="10" fill="#f3d3ab" />
      <path d="M27 7c-8 0-13.5 5.4-13.5 12.5 0 1.3.2 2.5.5 3.6 1.2-4.4 3.5-6.3 5.8-7 2.2-.7 4.8-.6 7.2-.6s5 0 7.2.6c2.3.7 4.6 2.6 5.8 7 .3-1.1.5-2.3.5-3.6C40.5 12.4 35 7 27 7z" fill="#4e9e5a" />
      <path d="M27 7c-8 0-13.5 5.4-13.5 12.5h2.9c0-5.8 4.4-10 10.6-10s10.6 4.2 10.6 10h2.9C40.5 12.4 35 7 27 7z" fill="#78c283" />
      <path d="M38 10c4.5-2.4 9-1.2 9-1.2s-2.2 4.4-6.7 5.6c-2.6.7-3.3.4-3.3.4z" fill="#78c283" />

      {/* 눈, 볼, 입 */}
      <ellipse cx="23" cy="23" rx="2.1" ry="2.7" fill="#33251a" />
      <ellipse cx="32" cy="23" rx="2.1" ry="2.7" fill="#33251a" />
      <circle cx="23.7" cy="22" r=".85" fill="#fff" />
      <circle cx="32.7" cy="22" r=".85" fill="#fff" />
      <ellipse cx="18.8" cy="26.5" rx="2.2" ry="1.4" fill="#e39182" opacity=".55" />
      <ellipse cx="36.2" cy="26.5" rx="2.2" ry="1.4" fill="#e39182" opacity=".55" />
      <path d="M25.6 27.4c.9 1.1 3 1.1 3.9 0" stroke="#33251a" strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* 당긴 활과 화살 */}
      <g transform="translate(1,7)">
        <path d="M48 12c6.5 6 6.5 22 0 28" stroke="#8a5c33" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M48 12c6.5 6 6.5 22 0 28" stroke="#b9843f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M48 12L41 26l7 14" stroke="#efe3c8" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        <path d="M37 26h19" stroke="#e8d7b0" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M58.5 26l-5-3v6z" fill="#cfd8dd" />
        <path d="M38.6 26l-2.4-2M38.6 26l-2.4 2" stroke="#e7f0d4" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="40.5" cy="26" r="3.4" fill="#f3d3ab" />
      </g>
    </svg>
  );
}

/* 병과 번호 → 캐릭터. 아직 없는 병과는 빈칸으로 둔다. */
const CHARS = [Archer];

export const hasChar = (i) => !!CHARS[i];

export function TowerChar({ i }) {
  const C = CHARS[i];
  return C ? <C /> : null;
}
