import { getVoices, isElevenLabsConfigured, synthesize } from "@/lib/elevenlabs";
import { LIMIT_MESSAGE, checkLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

const MAX_TEXT = 600;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Список голосів для кнопок на фронті (id голосів — не секрет)
export async function GET() {
  if (!isElevenLabsConfigured()) return Response.json({ voices: [] });
  return Response.json({ voices: getVoices() });
}

export async function POST(request: Request) {
  if (!isElevenLabsConfigured()) {
    return error("Озвучка зараз недоступна.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Некоректний запит.", 400);
  }

  const { text, voiceId } = (body ?? {}) as { text?: unknown; voiceId?: unknown };
  const cleanText = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

  if (!cleanText) return error("Немає тексту для озвучки.", 400);
  if (cleanText.length > MAX_TEXT) {
    return error(`Сценарій задовгий для озвучки — максимум ${MAX_TEXT} символів.`, 400);
  }

  // Озвучуємо лише голосами з налаштувань
  const voice = getVoices().find((v) => v.id === voiceId);
  if (!voice) {
    // Найчастіше — список голосів змінили, а сторінка ще зі старим
    return Response.json(
      { error: "Список голосів оновився — спробуйте ще раз.", voices: getVoices() },
      { status: 409 },
    );
  }

  const limit = await checkLimit(request, "voice");
  if (!limit.ok) return error(LIMIT_MESSAGE, 429);

  try {
    const result = await synthesize(cleanText, voice.id);
    return Response.json(result);
  } catch (e) {
    await limit.release(); // невдала озвучка не з'їдає ліміт
    console.error("voice generation failed:", e instanceof Error ? e.message : "unknown");
    return error("Не вдалося озвучити сценарій. Спробуйте ще раз за хвилину.", 502);
  }
}
