"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  /** Справжній прогрес 0–1. Якщо не задано — орієнтовний за expectedSeconds */
  value?: number;
  /** Скільки зазвичай триває дія — для орієнтовного прогресу */
  expectedSeconds?: number;
  /** Додатковий текст праворуч, напр. «лишилось 12 с» */
  hint?: string;
};

/**
 * Орієнтовний прогрес плавно наближається до 95% і не «зависає» на 100%,
 * поки не прийде відповідь — тоді компонент просто зникає.
 */
export default function ProgressBar({ label, value, expectedSeconds = 8, hint }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (value !== undefined) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(id);
  }, [value]);

  const progress =
    value !== undefined ? Math.min(Math.max(value, 0), 1) : 0.95 * (1 - Math.exp(-elapsed / (expectedSeconds / 2)));
  const percent = Math.round(progress * 100);

  return (
    <div className="space-y-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="shrink-0 tabular-nums text-zinc-400">
          {hint ? `${hint} · ` : ""}
          {percent}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400 transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
