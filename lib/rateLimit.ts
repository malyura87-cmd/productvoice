// Денний ліміт генерацій з одного IP. Лічильник — в Upstash Redis через REST (без бібліотек).
// Якщо Redis не налаштований — ліміт вимкнено, сайт працює як звичайно.

export type LimitKind = "script" | "voice";

export type LimitResult = {
  ok: boolean;
  /** Повертає спробу назад, якщо генерація не вдалась з нашого боку */
  release: () => Promise<void>;
};

const NOOP: LimitResult = { ok: true, release: async () => {} };

function redisConfig() {
  // Vercel Marketplace створює KV_REST_API_*, пряме підключення Upstash — UPSTASH_REDIS_REST_*
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function dailyLimit(): number {
  const n = Number(process.env.DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function redis(commands: (string | number)[][]): Promise<{ result?: unknown }[]> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis is not configured");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return res.json();
}

export async function checkLimit(request: Request, kind: LimitKind): Promise<LimitResult> {
  if (!redisConfig()) return NOOP;

  const day = new Date().toISOString().slice(0, 10); // доба за UTC
  const key = `pv:${kind}:${day}:${clientIp(request)}`;

  try {
    const [incr] = await redis([
      ["INCR", key],
      ["EXPIRE", key, 60 * 60 * 26],
    ]);
    const count = Number(incr?.result ?? 0);
    const release = async () => {
      await redis([["DECR", key]]).catch(() => {});
    };
    if (count > dailyLimit()) {
      await release(); // перевищені спроби не накопичуємо
      return { ok: false, release: async () => {} };
    }
    return { ok: true, release };
  } catch (e) {
    // Redis недоступний — не блокуємо користувачів
    console.error("rate limit unavailable:", e instanceof Error ? e.message : "unknown");
    return NOOP;
  }
}

export const LIMIT_MESSAGE = "Демо-ліміт на сьогодні вичерпано, спробуйте завтра.";
