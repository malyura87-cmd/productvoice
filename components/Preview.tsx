"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Alignment } from "@/lib/elevenlabs";
import { buildCues, cueAt } from "@/lib/subtitles";

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

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-zinc-300">
        <span className="text-zinc-500">Як це зроблено: </span>
        Gemini / ChatGPT → ElevenLabs → прев&apos;ю
      </div>
    </section>
  );
}
