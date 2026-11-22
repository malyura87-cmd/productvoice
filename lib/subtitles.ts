import type { Alignment } from "./elevenlabs";

export type Cue = {
  text: string;
  start: number; // секунди
  end: number;
};

type Word = { text: string; start: number; end: number };

const MIN_WORDS = 3;
const MAX_WORDS = 6;

/** Склеює посимвольні таймінги ElevenLabs у слова */
function toWords(a: Alignment): Word[] {
  const words: Word[] = [];
  let text = "";
  let start = 0;
  let end = 0;

  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (text) words.push({ text, start, end });
      text = "";
      return;
    }
    if (!text) start = a.character_start_times_seconds[i];
    text += ch;
    end = a.character_end_times_seconds[i];
  });
  if (text) words.push({ text, start, end });
  return words;
}

/**
 * Групує слова у субтитри по 3–6 слів.
 * Розрив — після розділового знака (якщо вже ≥3 слова) або на 6-му слові.
 */
export function buildCues(a: Alignment): Cue[] {
  const words = toWords(a);
  const cues: Cue[] = [];
  let group: Word[] = [];

  const flush = () => {
    if (!group.length) return;
    cues.push({
      text: group.map((w) => w.text).join(" "),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
    group = [];
  };

  words.forEach((w, i) => {
    group.push(w);
    const left = words.length - i - 1;
    const punct = /[.,!?…:;—–]$/.test(w.text);
    // Не лишаємо «хвіст» з 1–2 слів у кінці
    if (group.length >= MAX_WORDS || (punct && group.length >= MIN_WORDS && (left === 0 || left >= MIN_WORDS - 1))) {
      flush();
    }
  });
  flush();

  // Субтитр тримається на екрані до початку наступного — без миготіння в паузах
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = cues[i + 1].start;
  return cues;
}

export function cueAt(cues: Cue[], time: number): Cue | null {
  return cues.find((c) => time >= c.start && time < c.end) ?? null;
}
