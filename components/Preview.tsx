"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Alignment } from "@/lib/elevenlabs";
import { buildCues, cueAt } from "@/lib/subtitles";
import { pickMimeType, renderVideo } from "@/lib/renderVideo";

type Props = {
  photoUrl: string | null;
  productName: string;
  audioUrl: string;
  alignment: Alignment;
};

const ZOOM = 0.12; // Ken Burns: наближення від 100% до 112% за час ролика

export default function Preview({ photoUrl, productName, audioUrl, alignment }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const cues = useMemo(() => buildCues(alignment), [alignment]);
  const cue = cueAt(cues, time);
  const progress = duration ? Math.min(time / duration, 1) : 0;

  // Час беремо з аудіо на кожному кадрі — субтитри йдуть точно під голос
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a) setTime(a.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Звільняємо пам'ять від попереднього відео
  useEffect(() => {
    return () => {
      if (video) URL.revokeObjectURL(video.url);
    };
  }, [video]);

  function download(url: string, ext: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `productvoice.${ext}`;
    a.click();
  }

  async function exportVideo() {
    if (rendering) return;
    if (!pickMimeType()) {
      setRenderError("Цей браузер не вміє записувати відео. Спробуйте Chrome на комп'ютері або Safari на iPhone.");
      return;
    }
    audioRef.current?.pause();
    setRendering(true);
    setRenderProgress(0);
    setRenderError(null);
    try {
      const { blob, ext } = await renderVideo({
        photoUrl,
        productName,
        audioUrl,
        cues,
        onProgress: setRenderProgress,
      });
      const url = URL.createObjectURL(blob);
      setVideo({ url, ext });
      download(url, ext);
    } catch {
      setRenderError("Не вдалося зібрати відео. Спробуйте ще раз або в іншому браузері.");
    } finally {
      setRendering(false);
    }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      if (a.ended) a.currentTime = 0;
      a.play();
    } else {
      a.pause();
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl sm:p-8">
      <h2 className="mb-5 text-xl font-bold">Прев&apos;ю</h2>

      <div className="mx-auto w-full max-w-[340px]">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Відтворити"}
          className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- локальний blob-URL
            <img
              src={photoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{ transform: `scale(${1 + ZOOM * progress})` }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-start justify-center bg-gradient-to-br pt-[22%] from-fuchsia-700 via-violet-800 to-indigo-900 p-8 text-center text-2xl font-extrabold text-white/90"
              style={{ transform: `scale(${1 + ZOOM * progress})` }}
            >
              {productName}
            </div>
          )}

          {/* Затемнення знизу, щоб субтитри читались на будь-якому фото */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

          {cue && (
            <p
              className="absolute inset-x-4 bottom-[14%] text-center text-[26px] font-black uppercase leading-tight text-white"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.6)" }}
            >
              {cue.text}
            </p>
          )}

          {/* Прогрес */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <div className="h-full bg-fuchsia-400" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Play / Pause */}
          <span
            className={`absolute inset-0 flex items-center justify-center transition ${
              playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-3xl text-white backdrop-blur">
              {playing ? "❚❚" : "▶"}
            </span>
          </span>
        </button>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={(e) => {
            setPlaying(false);
            setTime(e.currentTarget.duration);
          }}
        />
      </div>

      <div className="mx-auto mt-6 w-full max-w-[340px] space-y-3">
        <button
          type="button"
          onClick={exportVideo}
          disabled={rendering}
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait"
        >
          {rendering && (
            <span
              className="absolute inset-y-0 left-0 bg-white/20 transition-[width]"
              style={{ width: `${renderProgress * 100}%` }}
            />
          )}
          <span className="relative">
            {rendering
              ? `Збираю відео… ${Math.round(renderProgress * 100)}%`
              : video
                ? "Зібрати відео ще раз"
                : "Завантажити відео"}
          </span>
        </button>

        {rendering && (
          <p className="text-center text-xs text-zinc-500">
            Відео записується в реальному часі — не закривайте вкладку і не блокуйте екран.
          </p>
        )}

        {video && !rendering && (
          <a
            href={video.url}
            download={`productvoice.${video.ext}`}
            className="block w-full rounded-xl border border-white/15 px-6 py-3 text-center text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Готово: productvoice.{video.ext} — завантажити ще раз
          </a>
        )}

        {renderError && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {renderError}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-zinc-300">
        <span className="text-zinc-500">Як це зроблено: </span>
        Gemini / ChatGPT → ElevenLabs → прев&apos;ю
      </div>
    </section>
  );
}
