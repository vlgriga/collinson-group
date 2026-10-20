// How days are scored: tuning, not deployment (docs/architecture/configuration.md). Every value
// carries the reason for it, and scorers hold no numbers of their own (N7). The scores computed
// from these are never stored, so a change applies to the next request (ADR 0004).

/** Where a factor's value earns `score`, 0–1. */
export type CurvePoint = { readonly at: number; readonly score: number };

/** Points in rising `at` order; linear between two of them, flat beyond the first and the last. */
export type Curve = readonly [CurvePoint, ...CurvePoint[]];

/**
 * The lowest score of each rating; below `fair` a day is POOR. Equal 20-point bands above 40, so
 * a day short of 40 — under half of what is possible, on a curve that forgives a lot — is POOR.
 */
export const RATING_THRESHOLDS = { fair: 40, good: 60, excellent: 80 } as const;

export type Factor = {
  /** The share of the day's score the factor decides; an activity's weights add up to 1. */
  readonly weight: number;
  readonly curve: Curve;
};

export const OUTDOOR_SIGHTSEEING = {
  factors: {
    precipitation: {
      // Rain spoils a day of walking between sights more than anything else does.
      weight: 0.35,
      // In mm a day: a trace up to 0.5 mm goes unnoticed; 5 mm is rain on and off all day.
      curve: [
        { at: 0.5, score: 1 },
        { at: 5, score: 0 },
      ],
    },
    apparentTemperature: {
      // What it feels like decides how long one stays out.
      weight: 0.25,
      // The day's maximum, in °C: 15–25 is comfortable in a coat or a shirt; at freezing or at
      // 35 nobody walks for pleasure.
      curve: [
        { at: 0, score: 0 },
        { at: 15, score: 1 },
        { at: 25, score: 1 },
        { at: 35, score: 0 },
      ],
    },
    sunshine: {
      // Sun makes a day out, but an overcast dry day is still a fine one.
      weight: 0.2,
      // The share of daylight with sunshine: sun for half the day is as good as it gets.
      curve: [
        { at: 0, score: 0 },
        { at: 0.5, score: 1 },
      ],
    },
    wind: {
      // A nuisance more than a danger, until it is a gale.
      weight: 0.1,
      // The day's maximum, in km/h: up to 20 is a breeze (Beaufort 3); from 50 walking is hard
      // (Beaufort 7).
      curve: [
        { at: 20, score: 1 },
        { at: 50, score: 0 },
      ],
    },
    uv: {
      // Sunburn risk, on a day spent outside.
      weight: 0.1,
      // The day's maximum UV index: up to 5 is moderate (WHO); from 11 it is extreme.
      curve: [
        { at: 5, score: 1 },
        { at: 11, score: 0 },
      ],
    },
  },
} as const satisfies { factors: Record<string, Factor> };
