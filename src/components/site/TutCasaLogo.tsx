/** The demo's header logo mark — svg + word, verbatim markup. */
export function TutCasaMark({ gradientId = "sg" }: { gradientId?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4326B" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      <path d="M22 62 A34 34 0 1 1 78 62" stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round" />
      <path d="M30 60 L46 34 L58 60 Z" fill="#F5A623" />
      <path d="M52 60 L52 46 H72 V60 Z M56 46 V40 H68 V46" fill="none" stroke="#E8703A" strokeWidth="4" />
      <path d="M16 60 Q30 52 50 60 T84 60 A36 36 0 0 1 16 60 Z" fill="#57B8DF" />
      <path d="M28 74 Q46 84 62 74" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <g stroke="#2E9E6B" strokeWidth="5" strokeLinecap="round">
        <path d="M84 30 Q80 18 70 14" />
        <path d="M84 30 Q88 18 96 16" />
        <path d="M84 30 Q84 16 84 8" />
      </g>
    </svg>
  );
}

export function LogoWord({ className = "logo-word" }: { className?: string }) {
  return (
    <span className={className}>
      TUT CASA<small>A king in your own house</small>
    </span>
  );
}
