"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import ScriptView from "@/components/ScriptView";
import VoicePanel, { type VoiceAudio } from "@/components/VoicePanel";
import type { Provider, Script } from "@/lib/prompt";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 МБ

export default function ProductForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceAudio, setVoiceAudio] = useState<VoiceAudio | null>(null);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [available, setAvailable] = useState<Record<Provider, boolean>>({ gemini: true, openai: false });
  const fileInput = useRef<HTMLInputElement>(null);

  // Які моделі налаштовані на сервері
  useEffect(() => {
    fetch("/api/script")
      .then((r) => r.json())
      .then((data: Record<Provider, boolean>) => {
        setAvailable(data);
        if (!data.gemini && data.openai) setProvider("openai");
      })
      .catch(() => {});
  }, []);

  // Звільняємо пам'ять від попереднього blob-URL
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Підтримуються лише JPG, PNG або WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setPhotoError("Фото завелике — максимум 5 МБ.");
      e.target.value = "";
      return;
    }

    // Фото лишається в браузері — на сервер не відправляється
    setPhotoUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoUrl(null);
    setPhotoError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), provider }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Щось пішло не так. Спробуйте ще раз.");
        return;
      }
      setScript(data as Script);
      setVoiceAudio(null);
    } catch {
      setError("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    generate();
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl sm:p-8"
      >
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-300">
            Назва товару <span className="text-fuchsia-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад: шампунь для блиску волосся"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-zinc-300">
            Опис або характеристики{" "}
            <span className="font-normal text-zinc-500">(необов&apos;язково)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Склад, об'єм, для кого, чим відрізняється…"
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-300">Фото товару</span>

          {photoUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- локальний blob-URL */}
              <img
                src={photoUrl}
                alt="Прев'ю фото товару"
                className="h-40 w-32 rounded-xl border border-white/10 object-cover sm:h-48 sm:w-36"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
                >
                  Замінити
                </button>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
                >
                  Видалити
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 px-4 py-10 text-center transition hover:border-violet-400/60 hover:bg-white/[0.03]"
            >
              <span className="text-3xl">📷</span>
              <span className="mt-2 text-sm text-zinc-300">Натисніть, щоб вибрати фото</span>
              <span className="mt-1 text-xs text-zinc-500">JPG, PNG або WEBP, до 5 МБ</span>
            </label>
          )}

          <input
            ref={fileInput}
            id="photo"
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handlePhoto}
            className="sr-only"
          />

          {photoError && (
            <p role="alert" className="mt-2 text-sm text-rose-400">
              {photoError}
            </p>
          )}
        </div>

        {available.gemini && available.openai && (
          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-300">Модель для сценарію</span>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {(
                [
                  ["gemini", "Gemini"],
                  ["openai", "ChatGPT"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={provider === value}
                  onClick={() => setProvider(value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    provider === value
                      ? "bg-violet-500 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={name.trim().length < 2 || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {loading ? "Пишу сценарій…" : "Згенерувати"}
        </button>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}
      </form>

      {script && (
        <>
          <ScriptView
            script={script}
            onChange={(next) => {
              setScript(next);
              setVoiceAudio(null); // текст змінився — стара озвучка вже не відповідає
            }}
            onRegenerate={generate}
            loading={loading}
          />
          <VoicePanel
            text={[script.hook, script.body, script.cta].map((t) => t.trim()).join(" ")}
            audio={voiceAudio}
            onAudio={setVoiceAudio}
          />
        </>
      )}
    </>
  );
}
