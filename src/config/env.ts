import { z } from 'zod';

import { ValidationError } from '../shared/index.js';

// The defaults are the ones docs/architecture/logging.md#configuration documents.
const DEFAULT_PORT = 4000;
const DEFAULT_LOG_FILE_RETENTION_DAYS = 30;
const MAX_PORT = 65_535;

const LOG_LEVEL = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'off']);

/** Digits only: Number() alone would also read `0x1F90`, `4e3` and ` 7 `. */
function positiveWhole(max = Number.MAX_SAFE_INTEGER) {
  return z
    .string()
    .regex(/^\d+$/, 'Expected a whole number')
    .transform(Number)
    .pipe(z.number().min(1).max(max));
}

const ENV = z
  .object({
    // A host is required: without one, pg would quietly fall back to localhost.
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, hostname: /./ }),
    PORT: positiveWhole(MAX_PORT).default(DEFAULT_PORT),
    LOG_TERMINAL_LEVEL: LOG_LEVEL.default('info'),
    LOG_FILE_LEVEL: LOG_LEVEL.default('info'),
    LOG_FILE_DIR: z.string().default('./logs'),
    LOG_FILE_RETENTION_DAYS: positiveWhole().default(DEFAULT_LOG_FILE_RETENTION_DAYS),
    LOG_OTLP_LEVEL: LOG_LEVEL.default('off'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
  })
  .refine((env) => env.LOG_OTLP_LEVEL === 'off' || env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined, {
    path: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
    message: 'Required when LOG_OTLP_LEVEL is not off',
  });

export type LogLevel = z.infer<typeof LOG_LEVEL>;
export type Env = z.infer<typeof ENV>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  // `NAME=` in a .env file is an unset variable, not an empty value.
  const set = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = ENV.safeParse(set);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new ValidationError(`Invalid environment: ${problems.join('; ')}`);
  }
  return result.data;
}
