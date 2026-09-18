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

export function ClassIcon({ i }) {
  // 0 궁수 · 1 서리 · 2 대포 · 3 보급 · 4 번개 · 5 독
  if (i === 0) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20L20 4M20 4h-6M20 4v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M4 20l1.5-4.5L8.5 18 4 20z" fill="#fff" />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
        </g>
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="14" r="7" fill="#fff" />
        <path d="M16 8l3-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="20" cy="4" r="2" fill="#fff" />
      </svg>
    );
  }
  if (i === 3) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 8h8l2.5 11h-13L8 8z" fill="#fff" />
        <path d="M9.5 8V6a2.5 2.5 0 015 0v2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (i === 4) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 2L5 13.5h5L9.5 22 19 10h-5.5L13.5 2z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3h4v4.2l3.8 8.3A3 3 0 0115.1 20H8.9a3 3 0 01-2.7-4.5L10 7.2V3z" fill="#fff" />
      <g fill="#6d7a3a">
        <circle cx="12" cy="15.5" r="1.6" />
        <circle cx="9.4" cy="17.6" r="1" />
        <circle cx="14.4" cy="17.8" r="1.1" />
      </g>
    </svg>
  );
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
