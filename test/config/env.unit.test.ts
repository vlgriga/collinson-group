import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../src/config/index.js';
import { ValidationError } from '../../src/shared/index.js';

const DATABASE_URL = 'postgres://activity:activity@localhost:5432/activity';

describe('parseEnv', () => {
  it('reads a complete environment into typed configuration', () => {
    // Given
    const source = {
      DATABASE_URL,
      PORT: '4100',
      LOG_TERMINAL_LEVEL: 'debug',
      LOG_FILE_LEVEL: 'warn',
      LOG_FILE_DIR: '/var/log/activity',
      LOG_FILE_RETENTION_DAYS: '7',
      LOG_OTLP_LEVEL: 'info',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
    };

    // When
    const env = parseEnv(source);

    // Then
    expect(env).toEqual({
      DATABASE_URL,
      PORT: 4100,
      LOG_TERMINAL_LEVEL: 'debug',
      LOG_FILE_LEVEL: 'warn',
      LOG_FILE_DIR: '/var/log/activity',
      LOG_FILE_RETENTION_DAYS: 7,
      LOG_OTLP_LEVEL: 'info',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
    });
  });

  it('applies the documented defaults when only DATABASE_URL is set', () => {
    // Given
    const source = { DATABASE_URL };

    // When
    const env = parseEnv(source);

    // Then
    expect(env).toEqual({
      DATABASE_URL,
      PORT: 4000,
      LOG_TERMINAL_LEVEL: 'info',
      LOG_FILE_LEVEL: 'info',
      LOG_FILE_DIR: './logs',
      LOG_FILE_RETENTION_DAYS: 30,
      LOG_OTLP_LEVEL: 'off',
    });
  });

  it('refuses an environment without DATABASE_URL, naming it', () => {
    // Given
    const source = { PORT: '4000' };

    // When / Then
    expect(() => parseEnv(source)).toThrow(refusalNaming('DATABASE_URL'));
  });

  it.each([
    { variable: 'DATABASE_URL', value: 'not a url' },
    { variable: 'PORT', value: '0' },
    { variable: 'PORT', value: '65536' },
    { variable: 'PORT', value: '4000.5' },
    { variable: 'PORT', value: 'abc' },
    { variable: 'PORT', value: '0x1F90' },
    { variable: 'PORT', value: '4e3' },
    { variable: 'LOG_TERMINAL_LEVEL', value: 'verbose' },
    { variable: 'LOG_FILE_LEVEL', value: 'verbose' },
    { variable: 'LOG_FILE_RETENTION_DAYS', value: '0' },
    { variable: 'LOG_FILE_RETENTION_DAYS', value: '1.5' },
    { variable: 'LOG_FILE_RETENTION_DAYS', value: ' 7 ' },
    { variable: 'LOG_OTLP_LEVEL', value: 'verbose' },
    { variable: 'OTEL_EXPORTER_OTLP_ENDPOINT', value: 'not a url' },
  ] as const)('refuses $variable=$value, naming the variable', ({ variable, value }) => {
    // Given
    const source = { DATABASE_URL, [variable]: value };

    // When / Then
    expect(() => parseEnv(source)).toThrow(refusalNaming(variable));
  });

  it.each([
    {
      variable: 'DATABASE_URL',
      value: 'postgresql://localhost/activity',
      parsed: 'postgresql://localhost/activity',
    },
    { variable: 'PORT', value: '1', parsed: 1 },
    { variable: 'PORT', value: '65535', parsed: 65535 },
    { variable: 'LOG_FILE_RETENTION_DAYS', value: '1', parsed: 1 },
  ] as const)('accepts $variable=$value', ({ variable, value, parsed }) => {
    // Given
    const source = { DATABASE_URL, [variable]: value };

    // When
    const env = parseEnv(source);

    // Then
    expect(env[variable]).toBe(parsed);
  });

  it('refuses an OTLP level without OTEL_EXPORTER_OTLP_ENDPOINT, naming the endpoint', () => {
    // Given
    const source = { DATABASE_URL, LOG_OTLP_LEVEL: 'info' };

    // When / Then
    expect(() => parseEnv(source)).toThrow(refusalNaming('OTEL_EXPORTER_OTLP_ENDPOINT'));
  });

  it.each([
    { variable: 'PORT', parsed: 4000 },
    { variable: 'OTEL_EXPORTER_OTLP_ENDPOINT', parsed: undefined },
  ] as const)('treats an empty $variable as unset', ({ variable, parsed }) => {
    // Given
    const source = { DATABASE_URL, [variable]: '' };

    // When
    const env = parseEnv(source);

    // Then
    expect(env[variable]).toBe(parsed);
  });
});

function refusalNaming(variable: string): unknown {
  return expect.toSatisfy(
    (error: unknown) => error instanceof ValidationError && error.message.includes(variable),
    `a ValidationError naming ${variable}`,
  ) as unknown;
}
