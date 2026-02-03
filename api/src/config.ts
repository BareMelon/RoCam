import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  DASHBOARD_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(30),
  DEV_API_KEY: z.string().optional(),
  DEV_GAME_ID: z.string().optional(),
  DASHBOARD_TOKEN: z.string().optional(),
  DASHBOARD_ACCOUNT_ID: z.string().optional(),
  BETA_ACCESS_REQUIRED: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => issue.message).join(", ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV ?? "development",
  host: parsed.data.HOST,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  dashboardOrigin: parsed.data.DASHBOARD_ORIGIN,
  rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
  devApiKey: parsed.data.DEV_API_KEY,
  devGameId: parsed.data.DEV_GAME_ID,
  dashboardToken: parsed.data.DASHBOARD_TOKEN,
  dashboardAccountId: parsed.data.DASHBOARD_ACCOUNT_ID,
  betaAccessRequired: parsed.data.BETA_ACCESS_REQUIRED === "true" || parsed.data.BETA_ACCESS_REQUIRED === "1"
};
