export function Logo({ size = 28, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <rect width="64" height="64" rx="16" fill="#141310" />
        <path d="M32 12a20 20 0 1 1-14.14 5.86" stroke="#d99a45" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M13 10v10h10" stroke="#d99a45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="6" fill="#e8b364" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-cream-100">
          Revora
        </span>
      )}
    </div>
  );
}
