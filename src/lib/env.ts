import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4"),
  SCRAPER_MAX_PLACES: z.coerce.number().int().min(1).max(100).default(30),
  SCRAPER_TIMEOUT_MS: z.coerce.number().int().min(10000).default(60000),
  APP_PASSWORD: z.string().optional(),
  RATE_LIMIT_SCRAPER: z.coerce.number().int().default(5),
  RATE_LIMIT_OPENAI: z.coerce.number().int().default(30),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] Variáveis inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Configuração de ambiente inválida. Verifique o arquivo .env.");
  }
  cached = parsed.data;
  return cached;
}

export function requireOpenAIKey(): string {
  const env = getEnv();
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina a variável no arquivo .env."
    );
  }
  return key;
}
