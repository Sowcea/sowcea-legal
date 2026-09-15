interface Props {
  /** seconds since the last rollup tick, null when unknown */
  secondsAgo: number | null;
}

export function LivePill({ secondsAgo }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#effafa] bg-[#effafa] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00807e]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00b6b4]" />
      LIVE
      {secondsAgo !== null && (
        <span className="font-normal normal-case tracking-normal text-[#00807e]/70">
          · updated {secondsAgo}s ago
        </span>
      )}
    </span>
  );
}
