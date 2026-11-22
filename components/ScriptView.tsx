"use client";

import type { Script } from "@/lib/prompt";

type Props = {
  script: Script;
  onChange: (script: Script) => void;
  onRegenerate: () => void;
  loading: boolean;
};

const FIELDS: { key: keyof Script; label: string; rows: number }[] = [
  { key: "hook", label: "Hook", rows: 2 },
  { key: "body", label: "Основне", rows: 5 },
  { key: "cta", label: "Заклик", rows: 2 },
];

export default function ScriptView({ script, onChange, onRegenerate, loading }: Props) {
  const words = [script.hook, script.body, script.cta]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <section className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl sm:p-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Сценарій</h2>
        <span className="text-xs text-zinc-500">{words} слів</span>
      </div>

      {FIELDS.map(({ key, label, rows }) => (
        <div key={key}>
          <label
            htmlFor={`script-${key}`}
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-violet-300"
          >
            {label}
          </label>
          <textarea
            id={`script-${key}`}
            rows={rows}
            value={script[key]}
            onChange={(e) => onChange({ ...script, [key]: e.target.value })}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base leading-relaxed text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="w-full rounded-xl border border-white/15 px-6 py-3 text-base font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Пишу сценарій…" : "Інший варіант"}
      </button>
    </section>
  );
}
