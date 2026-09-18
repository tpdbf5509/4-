export function Shield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l8 3v7c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V5l8-3z" fill="#c9d4dd" stroke="#6d798a" strokeWidth="1.4" />
      <path d="M12 4.2L6 6.4V12c0 3.8 2.4 6.7 6 7.9V4.2z" fill="#eaf1f6" />
      <path d="M12 7v9" stroke="#8d99a8" strokeWidth="1.2" />
    </svg>
  );
}

export function Coin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#c79320" />
      <circle cx="12" cy="11" r="8" fill="#f0c04a" />
      <circle cx="12" cy="11" r="5" fill="none" stroke="#c79320" strokeWidth="1.6" />
      <ellipse cx="9" cy="7.6" rx="2" ry="1.3" fill="rgba(255,255,255,0.65)" transform="rotate(-30 9 7.6)" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l9 8h-2.5v9h-5v-5.5h-3V20h-5v-9H3l9-8z" fill="currentColor" />
    </svg>
  );
}

export function ClassIcon({ i }) {
  // TOWERS 차례: 궁수 저격 대포 번개 화염 독 서리 중력 보급 부식 성기사
  const S = [
    // 궁수 — 화살
    <>
      <path d="M4 20L20 4M20 4h-6M20 4v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M4 20l1.5-4.5L8.5 18 4 20z" fill="#fff" />
    </>,
    // 저격 — 조준경
    <>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" strokeWidth="2" />
      <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
      </g>
      <circle cx="12" cy="12" r="2.2" fill="#fff" />
    </>,
    // 대포 — 포신
    <>
      <circle cx="11" cy="14" r="7" fill="#fff" />
      <path d="M16 8l3-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="4" r="2" fill="#fff" />
    </>,
    // 번개
    <path d="M13.5 2L5 13.5h5L9.5 22 19 10h-5.5L13.5 2z" fill="#fff" />,
    // 화염
    <>
      <path d="M12 2.5c3 3.6 1 5.4 2.6 7 1.3 1.3 2.6-.3 2.6-.3 1.4 2 1.3 4.2 1.3 5C18.5 18.6 15.6 21.5 12 21.5S5.5 18.6 5.5 14.2c0-3.4 2.4-5.2 3.6-7.4C10.4 4.4 11 3.2 12 2.5z" fill="#fff" />
    </>,
    // 독 — 약병
    <>
      <path d="M10 3h4v4.2l3.8 8.3A3 3 0 0115.1 20H8.9a3 3 0 01-2.7-4.5L10 7.2V3z" fill="#fff" />
      <g fill="#6d7a3a">
        <circle cx="12" cy="15.5" r="1.6" />
        <circle cx="9.4" cy="17.6" r="1" />
        <circle cx="14.4" cy="17.8" r="1.1" />
      </g>
    </>,
    // 서리 — 눈 결정
    <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
    </g>,
    // 중력 — 소용돌이
    <>
      <path d="M12 3a9 9 0 109 9 7 7 0 01-7 7 5.5 5.5 0 01-5.5-5.5A4.2 4.2 0 0112.7 9a3.2 3.2 0 013.2 3.2 2.4 2.4 0 01-2.4 2.4"
        fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </>,
    // 보급 — 자루
    <>
      <path d="M8 8h8l2.5 11h-13L8 8z" fill="#fff" />
      <path d="M9.5 8V6a2.5 2.5 0 015 0v2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>,
    // 부식 — 떨어지는 방울
    <>
      <path d="M6 3h12v3H6z" fill="#fff" />
      <path d="M9 6h6l-1 6H10L9 6z" fill="#fff" opacity="0.8" />
      <path d="M12 13.5c2.4 3 3.6 4.4 3.6 6.1A3.6 3.6 0 1 1 8.4 19.6c0-1.7 1.2-3.1 3.6-6.1z" fill="#fff" />
    </>,
    // 성기사 — 방패
    <>
      <path d="M12 2.5l7.5 2.8v6.2c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V5.3L12 2.5z" fill="#fff" />
      <path d="M12 7v9M8.5 10.5h7" stroke="#5a7fa0" strokeWidth="2.2" strokeLinecap="round" />
    </>,
  ];
  return <svg viewBox="0 0 24 24" aria-hidden="true">{S[i] || S[0]}</svg>;
}

/* 보스 보상 능력 아이콘 */
export function PerkIcon({ kind }) {
  const P = {
    attack: (
      <>
        <path d="M13 3l8 8-3 3-8-8 3-3z" fill="#fff" />
        <path d="M10 6l8 8-8 7-5-5 8-7-3-3z" fill="#fff" opacity="0.72" />
      </>
    ),
    range: (
      <>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.6" fill="#fff" />
      </>
    ),
    speed: (
      <>
        <circle cx="12" cy="13" r="8" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M12 8.5V13l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M9 2.5h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    crit: (
      <>
        <path d="M12 2l2.6 6.2L21 9.2l-4.7 4.3 1.3 6.5-5.6-3.2-5.6 3.2 1.3-6.5L3 9.2l6.4-1z" fill="#fff" />
      </>
    ),
    frost: (
      <>
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
        </g>
      </>
    ),
    gold: (
      <>
        <ellipse cx="12" cy="16.5" rx="8" ry="3.6" fill="#fff" opacity="0.7" />
        <ellipse cx="12" cy="12.5" rx="8" ry="3.6" fill="#fff" opacity="0.85" />
        <ellipse cx="12" cy="8.5" rx="8" ry="3.6" fill="#fff" />
      </>
    ),
    build: (
      <>
        <path d="M14.5 3a5 5 0 00-4.2 7.7L3.6 17.4a2 2 0 102.8 2.8l6.7-6.7A5 5 0 1014.5 3z" fill="#fff" />
      </>
    ),
    skill: (
      <>
        <path d="M13.5 2L5 13.5h5L9.5 22 19 10h-5.5L13.5 2z" fill="#fff" />
      </>
    ),
    chest: (
      <>
        <path d="M3.5 9.5h17V19a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V9.5z" fill="#fff" opacity="0.85" />
        <path d="M3.5 9.5A4.5 4.5 0 018 5h8a4.5 4.5 0 014.5 4.5h-17z" fill="#fff" />
        <rect x="10.5" y="11" width="3" height="5" rx="1.2" fill="#3b2c1b" />
      </>
    ),
    flag: (
      <>
        <path d="M6 2v20" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M7.5 3.5h11l-2.6 4.2L18.5 12h-11V3.5z" fill="#fff" />
      </>
    ),
    flame: (
      <>
        <path d="M12 2.5c3 3.6 1 5.4 2.6 7 1.3 1.3 2.6-.3 2.6-.3 1.4 2 1.3 4.2 1.3 5C18.5 18.6 15.6 21.5 12 21.5S5.5 18.6 5.5 14.2c0-3.4 2.4-5.2 3.6-7.4C10.4 4.4 11 3.2 12 2.5z" fill="#fff" />
        <path d="M12 21c-1.9 0-3.4-1.6-3.4-3.6 0-2 1.6-2.7 2.3-4.3.5-1 .6-1.8 1.1-2.4 1.6 2 .6 3 1.5 4 .7.8 1.5-.2 1.5-.2.8 1.2.4 2.6.4 3-.1 2-1.5 3.5-3.4 3.5z" fill="#f0a13c" />
      </>
    ),
    arc: (
      <>
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M3 17l4-4 3 3 4-6 3 3 4-5" />
        </g>
        <circle cx="3.5" cy="17" r="2" fill="#fff" />
        <circle cx="20.5" cy="8" r="2" fill="#fff" />
      </>
    ),
    pierce: (
      <>
        <path d="M2 12h16" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M22 12l-7-4.5v9L22 12z" fill="#fff" />
        <g fill="#fff" opacity="0.5">
          <circle cx="7" cy="6" r="1.8" /><circle cx="13" cy="18" r="1.8" />
        </g>
      </>
    ),
    blast: (
      <>
        <path d="M12 2l2.4 5.6L20 5l-2.6 5.6L23 12l-5.6 1.4L20 19l-5.6-2.6L12 22l-2.4-5.6L4 19l2.6-5.6L1 12l5.6-1.4L4 5l5.6 2.6z" fill="#fff" />
        <circle cx="12" cy="12" r="3" fill="#f0a13c" />
      </>
    ),
    mark: (
      <>
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" strokeWidth="2" />
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
        </g>
        <circle cx="12" cy="12" r="2.2" fill="#fff" />
      </>
    ),
    execute: (
      <>
        <path d="M3 3l10 10-3 3L3 9V3z" fill="#fff" />
        <path d="M21 3L11 13l3 3L21 9V3z" fill="#fff" opacity="0.72" />
        <path d="M12 16.5l3 5h-6l3-5z" fill="#fff" />
      </>
    ),
    rage: (
      <>
        <path d="M4 4l5 3.5L12 2l3 5.5L20 4l-1.5 8.5H5.5L4 4z" fill="#fff" />
        <rect x="5" y="14.5" width="14" height="6" rx="2" fill="#fff" opacity="0.72" />
      </>
    ),
    last: (
      <>
        <path d="M12 2.5l7.5 2.8v6.2c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V5.3L12 2.5z" fill="#fff" />
        <path d="M12 7c1.6 1.9 1 2.9 1.8 3.7.7.7 1.4-.2 1.4-.2.7 1.1.7 2.3.7 2.7 0 2.4-1.6 4.1-3.6 4.1S8.4 15.7 8.4 13.2c0-1.8 1.2-2.8 1.9-4C11 8 11.4 7.4 12 7z" fill="#e0603a" />
      </>
    ),
    drop: (
      <>
        <path d="M12 2.5c4 5 6.5 7.6 6.5 11A6.5 6.5 0 1 1 5.5 13.5c0-3.4 2.5-6 6.5-11z" fill="#fff" />
        <path d="M9 14a3 3 0 003 4" stroke="#c0392b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    ),
    luck: (
      <>
        <circle cx="12" cy="12" r="9" fill="#fff" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#c79320" strokeWidth="1.8" />
        <path d="M12 8.5v7M10 10h3.2a1.6 1.6 0 010 3.2h-2.4" stroke="#c79320" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    ),
    note: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2.4" fill="#fff" />
        <g stroke="#3b2c1b" strokeWidth="1.6" strokeLinecap="round">
          <path d="M7 9.5h10M7 13h7" />
        </g>
      </>
    ),
    ration: (
      <>
        <path d="M4 7.5h16l-1.2 12.2a1.6 1.6 0 01-1.6 1.3H6.8a1.6 1.6 0 01-1.6-1.3L4 7.5z" fill="#fff" />
        <path d="M8.5 7.5V6a3.5 3.5 0 017 0v1.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M9.5 12h5M12 9.5v5" stroke="#6d7a3a" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    swift: (
      <>
        <path d="M14.5 2a5 5 0 00-4.2 7.7L3.6 16.4a2 2 0 102.8 2.8l6.7-6.7A5 5 0 1014.5 2z" fill="#fff" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <path d="M17 17l4 4M14 20l2 2" />
        </g>
      </>
    ),
    amp: (
      <>
        <path d="M12 2l2.2 6.2L20.5 10l-5 4 1.4 6.5L12 17l-4.9 3.5L8.5 14l-5-4 6.3-1.8z" fill="#fff" />
        <circle cx="12" cy="12" r="2" fill="#7b6389" />
      </>
    ),
    echo: (
      <>
        <path d="M5 12a7 7 0 0111.6-5.3l1.9-1.9V11h-6l2.2-2.2A5 5 0 007 12H5z" fill="#fff" />
        <path d="M19 12a7 7 0 01-11.6 5.3l-1.9 1.9V13h6l-2.2 2.2A5 5 0 0017 12h2z" fill="#fff" />
      </>
    ),
    guard: (
      <>
        <path d="M12 2.5l7.5 2.8v6.2c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V5.3L12 2.5z" fill="none" stroke="#fff" strokeWidth="2.2" />
        <path d="M8.5 12l2.4 2.6 4.6-5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    wall: (
      <>
        <g fill="#fff">
          <rect x="3" y="5" width="18" height="4.5" rx="1" />
          <rect x="3" y="10.5" width="8" height="4.5" rx="1" />
          <rect x="12" y="10.5" width="9" height="4.5" rx="1" />
          <rect x="3" y="16" width="18" height="4.5" rx="1" />
        </g>
      </>
    ),
    heal: (
      <>
        <path d="M12 20.5S3.5 15.2 3.5 9.4A4.9 4.9 0 0112 6.6a4.9 4.9 0 018.5 2.8c0 5.8-8.5 11.1-8.5 11.1z" fill="#fff" />
        <path d="M9.5 11h5M12 8.5v5" stroke="#4e9e5a" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    repair: (
      <>
        <path d="M12 2.5l7.5 2.8v6.2c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V5.3L12 2.5z" fill="#fff" />
        <path d="M9.5 11h5M12 8.5v5" stroke="#4e9e5a" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2.5l7.5 2.8v6.2c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V5.3L12 2.5z" fill="#fff" />
        <path d="M12 5.2v13.6c-3-1.3-5-3.8-5-7.3V6.9l5-1.7z" fill="#3b2c1b" opacity="0.28" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">{P[kind] || P.attack}</svg>
  );
}
