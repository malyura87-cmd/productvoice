import { GoogleGenAI } from "@google/genai";

export type Script = {
  hook: string;
  body: string;
  cta: string;
};

const SYSTEM_INSTRUCTION = `Ти — копірайтер коротких відео для інтернет-магазину.
Напиши сценарій озвучки на 20–30 секунд (60–80 слів) українською.
Структура:
- hook: одне речення про проблему або бажання покупця;
- body: як саме цей товар вирішує проблему, 2–3 конкретні переваги;
- cta: короткий заклик до дії.
Пиши живо, без канцеляризмів і без вигаданих характеристик —
тільки те, що випливає з назви й опису.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string", description: "Одне речення: проблема або бажання покупця" },
    body: { type: "string", description: "Як товар вирішує проблему, 2–3 переваги" },
    cta: { type: "string", description: "Короткий заклик до дії" },
  },
  required: ["hook", "body", "cta"],
  propertyOrdering: ["hook", "body", "cta"],
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function generateScript(name: string, description: string): Promise<Script> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const prompt = description
    ? `Товар: ${name}\nОпис і характеристики: ${description}`
    : `Товар: ${name}`;

  const response = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? "") as Partial<Script>;
  const script: Script = {
    hook: String(parsed.hook ?? "").trim(),
    body: String(parsed.body ?? "").trim(),
    cta: String(parsed.cta ?? "").trim(),
  };

  if (!script.hook || !script.body || !script.cta) {
    throw new Error("Incomplete script from model");
  }
  return script;
}
