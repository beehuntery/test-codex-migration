import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const rootDir = process.cwd();
const defaultEnvPath = path.resolve(rootDir, '.env');
if (fs.existsSync(defaultEnvPath)) {
  loadEnv({ path: defaultEnvPath });
}

if (process.env.NODE_ENV === 'test') {
  const testEnvPath = path.resolve(rootDir, '.env.test');
  if (fs.existsSync(testEnvPath)) {
    loadEnv({ path: testEnvPath, override: true });
  }
}

const booleanFromEnv = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}, z.boolean());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    DATA_STORE: z.enum(['json', 'prisma']).default('json'),
    JSON_DATA_ROOT: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    PRISMA_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
    PRISMA_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(150),
    PRISMA_SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().min(0).default(500),
    PRISMA_LOG_DIAGNOSTICS: booleanFromEnv.optional(),
    PRISMA_RETRY_WRITES: booleanFromEnv.optional()
  })
  .transform((value) => ({
    env: value.NODE_ENV,
    port: value.PORT,
    dataStore: value.DATA_STORE,
    jsonDataRoot: value.JSON_DATA_ROOT ? path.resolve(rootDir, value.JSON_DATA_ROOT) : undefined,
    databaseUrl: value.DATABASE_URL,
    prisma: {
      maxRetries: value.PRISMA_MAX_RETRIES,
      retryDelayMs: value.PRISMA_RETRY_DELAY_MS,
      slowQueryThresholdMs: value.PRISMA_SLOW_QUERY_THRESHOLD_MS,
      logDiagnostics: value.PRISMA_LOG_DIAGNOSTICS ?? true,
      retryWrites: value.PRISMA_RETRY_WRITES ?? false
    }
  }));

const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  const formattedErrors = parseResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${formattedErrors}`);
}

export type AppConfig = z.infer<typeof EnvSchema>;

export const appConfig = parseResult.data;
