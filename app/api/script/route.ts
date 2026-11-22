import { generateScript } from "@/lib/gemini";

export const maxDuration = 30;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Некоректний запит.", 400);
  }

  const { name, description } = (body ?? {}) as { name?: unknown; description?: unknown };
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";

  if (cleanName.length < 2 || cleanName.length > 120) {
    return error("Назва товару має містити від 2 до 120 символів.", 400);
  }
  if (cleanDescription.length > 1000) {
    return error("Опис занадто довгий — максимум 1000 символів.", 400);
  }

  try {
    const script = await generateScript(cleanName, cleanDescription);
    return Response.json(script);
  } catch (e) {
    // У лог — лише тип помилки, без ключів і деталей запиту
    console.error("script generation failed:", e instanceof Error ? e.message : "unknown");
    return error("Не вдалося згенерувати сценарій. Спробуйте ще раз за хвилину.", 502);
  }
}
