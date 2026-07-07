'use client';

// components/ExamTimer.tsx — a visible countdown for the timed exam runner.
//
// M2 scope: render a running MM:SS countdown from a minutes budget and fire
// onExpire() at zero (the M5 runner uses that to auto-submit). No persistence or
// grading here — this is the display + tick. Kept self-contained so the M5
// integration can drop it into the runner page unchanged.

import { useEffect, useRef, useState } from 'react';

export function ExamTimer({
  minutes,
  onExpire,
  running = true,
}: {
  minutes: number;
  onExpire?: () => void;
  running?: boolean;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round(minutes * 60)));
  const firedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const low = remaining <= 60;

  return (
    <div
      role="timer"
      aria-live="off"
      className={`rounded border px-3 py-1 font-mono text-lg tabular-nums ${
        low ? 'border-red-300 bg-red-50 text-red-700' : 'border-neutral-300 bg-white text-neutral-800'
      }`}
    >
      {mm}:{ss}
    </div>
  );
}

export default ExamTimer;
