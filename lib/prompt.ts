export type Script = {
  hook: string;
  body: string;
  cta: string;
};

export type Provider = "gemini" | "openai";

export const SYSTEM_INSTRUCTION = `Ти — копірайтер коротких відео для інтернет-магазину.
Напиши сценарій озвучки на 20–30 секунд (60–80 слів) українською.
Структура:
- hook: одне речення про проблему або бажання покупця;
- body: як саме цей товар вирішує проблему, 2–3 конкретні переваги;
- cta: короткий заклик до дії.
Пиши живо, без канцеляризмів і без вигаданих характеристик —
тільки те, що випливає з назви й опису.

Як писати добре:
- звертайся до глядача на «ти», як подруга, що радить знахідку;
- hook — це ситуація з життя, яку глядач впізнає (ранок, дзеркало, поспіх), а не загальна фраза;
- у body назви товар і бери конкретику з опису: інгредієнти, ефект, як застосовувати;
- короткі речення по 5–12 слів — текст читатиме диктор;
- без штампів: «ідеальний вибір», «не втрачай шансу», «справжнє диво», «твій найкращий друг»;
- без цін, знижок і обіцянок, яких немає в описі;
- без емодзі, хештегів і переліків через крапку з комою.`;

export const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string", description: "Одне речення: проблема або бажання покупця" },
    body: { type: "string", description: "Як товар вирішує проблему, 2–3 переваги" },
    cta: { type: "string", description: "Короткий заклик до дії" },
  },
  required: ["hook", "body", "cta"],
  additionalProperties: false,
};

export function buildPrompt(name: string, description: string): string {
  return description
    ? `Товар: ${name}\nОпис і характеристики: ${description}`
    : `Товар: ${name}`;
}

export function parseScript(raw: string | undefined): Script {
  const parsed = JSON.parse(raw ?? "") as Partial<Script>;
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
