import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | null;
  /** formatter applied to the animated value */
  format?: (v: number | null) => string;
  durationMs?: number;
  className?: string;
}

/** Counts from the previous value to the new one whenever `value` changes. */
export function AnimatedNumber({ value, format, durationMs = 700, className }: Props) {
  const [display, setDisplay] = useState<number | null>(value);
  const fromRef = useRef<number>(value ?? 0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplay(null);
      return;
    }
    const from = fromRef.current ?? 0;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const text = format ? format(display) : display === null ? "—" : String(Math.round(display));
  return <span className={className}>{text}</span>;
}
