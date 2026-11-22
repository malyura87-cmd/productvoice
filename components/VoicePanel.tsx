"use client";

import { useEffect, useState } from "react";
import type { Alignment, Voice } from "@/lib/elevenlabs";

export type VoiceAudio = {
  url: string; // blob-URL mp3
  alignment: Alignment | null;
};

type Props = {
  text: string;
  audio: VoiceAudio | null;
  onAudio: (audio: VoiceAudio | null) => void;
};

function base64ToBlobUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
}

export default function VoicePanel({ text, audio, onAudio }: Props) {
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voiceId, setVoiceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/voice")
      .then((r) => r.json())
      .then((data: { voices: Voice[] }) => {
        setVoices(data.voices);
        if (data.voices[0]) setVoiceId(data.voices[0].id);
      })
      .catch(() => setVoices([]));
  }, []);

  // Звільняємо пам'ять від попереднього аудіо
  useEffect(() => {
    return () => {
      if (audio) URL.revokeObjectURL(audio.url);
    };
  }, [audio]);

  async function speak() {
    if (loading || !voiceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.audioBase64) {
        setError(data?.error ?? "Щось пішло не так. Спробуйте ще раз.");
        return;
      }
      onAudio({ url: base64ToBlobUrl(data.audioBase64), alignment: data.alignment ?? null });
    } catch {
      setError("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  if (voices === null) return null;

  if (voices.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400 sm:p-8">
        Озвучка зараз недоступна.
      </section>
    );
  }

  const tooLong = text.length > 600;

  return (
    <section className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl sm:p-8">
      <h2 className="text-xl font-bold">Озвучка</h2>

      <div
        role="radiogroup"
        aria-label="Голос"
        className="grid gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
        style={{ gridTemplateColumns: `repeat(${voices.length}, minmax(0, 1fr))` }}
      >
        {voices.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={voiceId === v.id}
            onClick={() => setVoiceId(v.id)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              voiceId === v.id ? "bg-violet-500 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={speak}
        disabled={loading || tooLong || !text.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {loading ? "Озвучую…" : audio ? "Озвучити ще раз" : "Озвучити"}
      </button>

      {tooLong && (
        <p className="text-sm text-amber-300">
          Сценарій задовгий для озвучки ({text.length}/600 символів) — скоротіть текст.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {audio && (
        <div className="space-y-3">
          <audio controls src={audio.url} className="w-full" />
          <a
            href={audio.url}
            download="productvoice.mp3"
            className="block w-full rounded-xl border border-white/15 px-6 py-3 text-center text-base font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Завантажити mp3
          </a>
        </div>
      )}
    </section>
  );
}
