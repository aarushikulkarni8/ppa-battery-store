/** Brand mark: a charge bolt on a battery-yellow tile. */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#FFC629" />
      <path d="M22.8 6.5 11.5 22.3h7.4L16.6 33.5l12-16.4h-7.5z" fill="#14213D" />
    </svg>
  );
}

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className={`leading-tight ${compact ? 'hidden sm:block' : ''}`}>
        <span className={`block whitespace-nowrap text-[15px] font-bold tracking-tight sm:text-[17px] ${light ? 'text-white' : 'text-ink'}`}>
          Prashant &amp; Prashant
        </span>
        <span className={`block whitespace-nowrap text-[11.5px] font-medium ${light ? 'text-white/65' : 'text-graphite'}`}>
          Associates, Hubballi
        </span>
      </span>
    </span>
  );
}
