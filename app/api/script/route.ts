import { generateScriptGemini, isGeminiConfigured } from "@/lib/gemini";
import { generateScriptOpenAI, isOpenAIConfigured } from "@/lib/openai";
import type { Provider } from "@/lib/prompt";
import { LIMIT_MESSAGE, checkLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Які моделі налаштовані — щоб фронт показав лише доступні
export async function GET() {
  return Response.json({ gemini: isGeminiConfigured(), openai: isOpenAIConfigured() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Некоректний запит.", 400);
  }

  const { name, description, provider } = (body ?? {}) as {
    name?: unknown;
    description?: unknown;
    provider?: unknown;
  };
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";
  const cleanProvider: Provider = provider === "openai" ? "openai" : "gemini";

  if (cleanName.length < 2 || cleanName.length > 120) {
    return error("Назва товару має містити від 2 до 120 символів.", 400);
  }
  if (cleanDescription.length > 1000) {
    return error("Опис занадто довгий — максимум 1000 символів.", 400);
  }

  const configured = cleanProvider === "openai" ? isOpenAIConfigured() : isGeminiConfigured();
  if (!configured) {
    return error("Ця модель зараз недоступна. Оберіть іншу.", 400);
  }

  const limit = await checkLimit(request, "script");
  if (!limit.ok) return error(LIMIT_MESSAGE, 429);

  try {
    const script =
      cleanProvider === "openai"
        ? await generateScriptOpenAI(cleanName, cleanDescription)
        : await generateScriptGemini(cleanName, cleanDescription);
    return Response.json(script);
  } catch (e) {
    // У лог — лише текст помилки провайдера, без ключів і деталей запиту
    await limit.release(); // невдала генерація не з'їдає ліміт
    console.error(`script generation failed (${cleanProvider}):`, e instanceof Error ? e.message : "unknown");
    return error("Не вдалося згенерувати сценарій. Спробуйте ще раз за хвилину.", 502);
  }
}
