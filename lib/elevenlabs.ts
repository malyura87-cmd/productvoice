// ElevenLabs Text to Speech with timestamps — REST, без SDK

export type Voice = { id: string; label: string };

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type VoiceResult = {
  audioBase64: string;
  alignment: Alignment | null;
};

const DEFAULT_LABELS = ["Жіночий", "Чоловічий", "Голос 3"];

/**
 * ELEVENLABS_VOICE_IDS: "id1,id2" (жіночий, чоловічий)
 * або з підписами: "Жіночий:id1,Чоловічий:id2"
 */
export function getVoices(): Voice[] {
  const raw = process.env.ELEVENLABS_VOICE_IDS ?? "";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part, i) => {
      const sep = part.lastIndexOf(":");
      return sep > 0
        ? { label: part.slice(0, sep).trim(), id: part.slice(sep + 1).trim() }
        : { label: DEFAULT_LABELS[i], id: part };
    });
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY) && getVoices().length > 0;
}

export async function synthesize(text: string, voiceId: string): Promise<VoiceResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const modelId = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: modelId }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    audio_base64?: string;
    alignment?: Alignment | null;
    detail?: { status?: string; message?: string } | string;
  };

  if (!res.ok || !data.audio_base64) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : [data.detail?.status, data.detail?.message].filter(Boolean).join(" — ");
    throw new Error(`ElevenLabs ${res.status}: ${detail || "no audio"}`);
  }

  return { audioBase64: data.audio_base64, alignment: data.alignment ?? null };
}
