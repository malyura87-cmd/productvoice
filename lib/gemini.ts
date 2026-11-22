import { GoogleGenAI } from "@google/genai";
import { SCRIPT_SCHEMA, SYSTEM_INSTRUCTION, buildPrompt, parseScript, type Script } from "./prompt";

let client: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function generateScriptGemini(name: string, description: string): Promise<Script> {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const response = await getClient().models.generateContent({
    model,
    contents: buildPrompt(name, description),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      // additionalProperties потрібен лише OpenAI strict-режиму
      responseJsonSchema: { ...SCRIPT_SCHEMA, additionalProperties: undefined },
    },
  });

  return parseScript(response.text);
}
