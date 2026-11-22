import { SCRIPT_SCHEMA, SYSTEM_INSTRUCTION, buildPrompt, parseScript, type Script } from "./prompt";

// OpenAI Responses API через REST — без додаткових бібліотек

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

type ResponsesOutput = {
  output?: { type: string; content?: { type: string; text?: string }[] }[];
  error?: { message?: string };
};

export async function generateScriptOpenAI(name: string, description: string): Promise<Script> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const body: Record<string, unknown> = {
    model,
    instructions: SYSTEM_INSTRUCTION,
    input: buildPrompt(name, description),
    text: {
      format: { type: "json_schema", name: "script", schema: SCRIPT_SCHEMA, strict: true },
    },
  };
  // Для reasoning-моделей короткий текст не потребує довгих роздумів
  if (/^(gpt-5|o\d)/.test(model)) body.reasoning = { effort: "low" };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as ResponsesOutput;
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${data.error?.message ?? "unknown error"}`);
  }

  const text = data.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((c) => c.type === "output_text")?.text;

  return parseScript(text);
}
