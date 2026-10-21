import { describe, expect, it } from 'vitest';

import { parseActivityRankingArgs } from '../../src/graphql/index.js';
import { ValidationError } from '../../src/shared/index.js';

describe('parseActivityRankingArgs', () => {
  it('drops the spaces around the city', () => {
    // When
    const request = parseActivityRankingArgs({ city: '  Le Havre ', days: 7 });

    // Then
    expect(request.city).toBe('Le Havre');
  });

  it.each([
    { length: 1, city: 'a' },
    { length: 100, city: 'a'.repeat(100) },
  ] as const)('takes a city of $length characters', ({ city }) => {
    // When
    const request = parseActivityRankingArgs({ city, days: 7 });

    // Then
    expect(request.city).toBe(city);
  });

  it('takes a city of 100 characters with spaces around it, counting it without them', () => {
    // When
    const request = parseActivityRankingArgs({ city: ` ${'a'.repeat(100)} `, days: 7 });

    // Then
    expect(request.city).toBe('a'.repeat(100));
  });

  it.each([
    { input: 'an empty city', city: '' },
    { input: 'a city of spaces only', city: '   ' },
    { input: 'a city of 101 characters', city: 'a'.repeat(101) },
  ] as const)('refuses $input', ({ city }) => {
    // When / Then
    expect(() => parseActivityRankingArgs({ city, days: 7 })).toThrow(ValidationError);
  });

  it('upper-cases the country code', () => {
    // When
    const request = parseActivityRankingArgs({ city: 'Paris', countryCode: 'us', days: 7 });

    // Then
    expect(request.countryCode).toBe('US');
  });

  it.each([
    { input: 'no country code', args: { city: 'Paris', days: 7 } },
    { input: 'a null country code', args: { city: 'Paris', countryCode: null, days: 7 } },
  ] as const)('limits the match to no country for $input', ({ args }) => {
    // When
    const request = parseActivityRankingArgs(args);

    // Then
    expect(request.countryCode).toBeNull();
  });

  it.each(['', 'U', 'USA', 'U1'] as const)('refuses the country code "%s"', (countryCode) => {
    // When / Then
    expect(() => parseActivityRankingArgs({ city: 'Paris', countryCode, days: 7 })).toThrow(
      ValidationError,
    );
  });

  it.each([1, 7] as const)('takes %i days', (days) => {
    // When
    const request = parseActivityRankingArgs({ city: 'Paris', days });

    // Then
    expect(request.days).toBe(days);
  });

  it.each([0, 8] as const)('refuses %i days', (days) => {
    // When / Then
    expect(() => parseActivityRankingArgs({ city: 'Paris', days })).toThrow(ValidationError);
  });
});
