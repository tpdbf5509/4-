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
        <circle cx="11" cy="14" r="7" fill="#fff" />
        <path d="M16 8l3-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="20" cy="4" r="2" fill="#fff" />
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8l2.5 11h-13L8 8z" fill="#fff" />
      <path d="M9.5 8V6a2.5 2.5 0 015 0v2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
