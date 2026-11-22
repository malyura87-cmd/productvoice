# ProductVoice

AI-відеоопис товару за 30 секунд: вводиш назву товару й фото — сервіс пише рекламний сценарій (Gemini), озвучує його (ElevenLabs) і показує вертикальне прев'ю 9:16 із субтитрами.

> Статус: **Етап 1** — каркас, форма, прев'ю фото. План розробки — у [`TZ.md`](./TZ.md).

## Стек

Next.js (App Router) · TypeScript · Tailwind CSS · Vercel

## Локальний запуск

```bash
npm install
cp .env.example .env.local   # ключі знадобляться з Етапу 2
npm run dev
```

Відкрити http://localhost:3000
