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

/** The WMO weather interpretation codes Open-Meteo reports a thunderstorm with. */
const WMO_THUNDERSTORM = { slightOrModerate: 95, withSlightHail: 96, withHeavyHail: 99 } as const;

/** A condition that limits a day's score, however good its factors are. */
type Cap = { readonly maxScore: number };

type OutdoorSightseeingRules = {
  readonly factors: Record<
    'precipitation' | 'apparentTemperature' | 'sunshine' | 'wind' | 'uv',
    Factor
  >;
  readonly caps: {
    readonly thunderstorm: Cap & { readonly weatherCodes: readonly number[] };
    readonly heavyPrecipitation: Cap & { readonly fromMm: number };
  };
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
  caps: {
    thunderstorm: {
      // Lightning makes open squares, towers and viewpoints unsafe, however pleasant the rest of
      // the day.
      weatherCodes: Object.values(WMO_THUNDERSTORM),
      maxScore: 10,
    },
    heavyPrecipitation: {
      // 10 mm a day is the "heavy precipitation day" of the ETCCDI climate indices: rain or snow
      // that keeps people indoors whatever else the day offers.
      fromMm: 10,
      maxScore: 20,
    },
  },
} as const satisfies OutdoorSightseeingRules;

type IndoorSightseeingRules = {
  /**
   * The score on a perfect day outside, and on one outdoor sightseeing cannot rate: the least
   * indoor sightseeing scores.
   */
  readonly baseScore: number;
  /**
   * The share, 0–1, of each point the day falls short of 100 outside that indoor sightseeing
   * gains. baseScore + 100 × the share is the most indoor sightseeing scores, so at most 100.
   */
  readonly outdoorShortfallShare: number;
};

/** Indoor sightseeing scores higher the worse the day is for outdoor sightseeing. */
export const INDOOR_SIGHTSEEING = {
  // Museums and galleries are worth a visit on any day, but on a perfect one outside they are
  // not its best use: FAIR, not GOOD.
  baseScore: 50,
  // Half, so that the worst day outside makes the most of indoor sights, and indoor outranks
  // outdoor once outdoor falls below about 67, a GOOD day included.
  outdoorShortfallShare: 0.5,
} as const satisfies IndoorSightseeingRules;

/**
 * The wave height in m past which only experts go out, and rescue is hard. Where the wave height
 * curve ends and its cap begins, so that the two cannot drift apart.
 */
const DANGEROUS_WAVES_M = 4;

type SurfingRules = {
  readonly factors: Record<'waveHeight' | 'swellPeriod' | 'wind' | 'temperature', Factor>;
  readonly caps: {
    readonly dangerousWaves: Cap & { readonly overM: number };
    readonly thunderstorm: Cap & { readonly weatherCodes: readonly number[] };
  };
};

export const SURFING = {
  factors: {
    waveHeight: {
      // Without waves to ride there is no session, so they weigh the most.
      weight: 0.35,
      // The day's highest significant wave height, in m: at 0.3 m, ankle-high, there is nothing
      // to ride; from 1 m, waist-high, to 2.5 m, overhead, most surfers have a good day; nothing
      // is left of the factor where the waves turn dangerous.
      curve: [
        { at: 0.3, score: 0 },
        { at: 1, score: 1 },
        { at: 2.5, score: 1 },
        { at: DANGEROUS_WAVES_M, score: 0 },
      ],
    },
    swellPeriod: {
      // The period decides whether the waves break clean and with power, or as a jumble.
      weight: 0.3,
      // The day's longest, in s: at 6 s it is local wind chop; from 12 s it is a groundswell,
      // lined up and powerful.
      curve: [
        { at: 6, score: 0 },
        { at: 12, score: 1 },
      ],
    },
    wind: {
      // Wind roughens the face of the waves; its direction against the coast is not known, so
      // any wind counts against the day (docs/prd.md#out-of-scope).
      weight: 0.25,
      // The day's maximum, in km/h: up to 10 (Beaufort 2) the sea stays glassy; at 30 (Beaufort
      // 5) whitecaps chop it up.
      curve: [
        { at: 10, score: 1 },
        { at: 30, score: 0 },
      ],
    },
    temperature: {
      // A wetsuit keeps the water bearable; the air decides how long one waits on the beach.
      weight: 0.1,
      // The day's highest air temperature, in °C: at 5 a session is short even in a hood; from
      // 20 it is comfortable out of the water too.
      curve: [
        { at: 5, score: 0 },
        { at: 20, score: 1 },
      ],
    },
  },
  caps: {
    dangerousWaves: {
      // Big-wave surfers still go out, as some lifts still run in a gale; nobody else should.
      overM: DANGEROUS_WAVES_M,
      maxScore: 10,
    },
    thunderstorm: {
      // A surfer is the highest point on a flat sea that conducts: nobody should be in the water.
      weatherCodes: Object.values(WMO_THUNDERSTORM),
      maxScore: 0,
    },
  },
} as const satisfies SurfingRules;

/**
 * The least snow on the ground there is anything to ski on, in cm: under it grass and rocks show
 * through. Where the no-snow cap stops and the snow depth curve starts, so that the two cannot
 * drift apart.
 */
const SKIABLE_SNOW_CM = 10;

/**
 * The gusts in km/h past which lifts start to stop. Where the gusts curve ends and their cap
 * begins, so that the two cannot drift apart.
 */
const LIFT_STOPPING_GUSTS_KMH = 60;

type SkiingRules = {
  readonly factors: Record<
    'snowDepth' | 'freshSnow' | 'temperature' | 'gusts' | 'sunshine',
    Factor
  >;
  readonly caps: {
    readonly noSnow: Cap & { readonly belowCm: number };
    readonly gusts: Cap & { readonly overKmh: number };
  };
};

export const SKIING = {
  factors: {
    snowDepth: {
      // Without a base to ski on nothing else matters, so it weighs the most.
      weight: 0.4,
      // The day's deepest, in cm: from a bare cover to a metre, where every run, off-piste
      // included, has enough.
      curve: [
        { at: SKIABLE_SNOW_CM, score: 0 },
        { at: 100, score: 1 },
      ],
    },
    freshSnow: {
      // Powder makes a great day, but groomed runs without it are still a good one.
      weight: 0.2,
      // The day's snowfall, in cm: 10 cm is a powder day.
      curve: [
        { at: 0, score: 0 },
        { at: 10, score: 1 },
      ],
    },
    temperature: {
      // The snow and the skier both suffer in a thaw or a deep frost.
      weight: 0.15,
      // The day's highest air temperature, in °C, wind left to its own factor: from -10 to 0 the
      // snow stays firm and the cold bearable; at 10 it is slush, at -20 frostbite cuts the day
      // short.
      curve: [
        { at: -20, score: 0 },
        { at: -10, score: 1 },
        { at: 0, score: 1 },
        { at: 10, score: 0 },
      ],
    },
    gusts: {
      // Gusts, not the mean wind, are what rock a chairlift and blow skiers about.
      weight: 0.15,
      // The day's strongest, in km/h: up to 30 the lifts hardly notice; nothing is left of the
      // factor where they start to stop.
      curve: [
        { at: 30, score: 1 },
        { at: LIFT_STOPPING_GUSTS_KMH, score: 0 },
      ],
    },
    sunshine: {
      // Sun shows the slope's bumps that flat light under cloud hides.
      weight: 0.1,
      // The share of daylight with sunshine: sun for half the day is as good as it gets.
      curve: [
        { at: 0, score: 0 },
        { at: 0.5, score: 1 },
      ],
    },
  },
  caps: {
    noSnow: {
      // Nothing to ski on, whatever the sky.
      belowCm: SKIABLE_SNOW_CM,
      maxScore: 0,
    },
    gusts: {
      // Past it chairlifts and gondolas stop for safety, and what runs is exposed.
      overKmh: LIFT_STOPPING_GUSTS_KMH,
      maxScore: 10,
    },
  },
} as const satisfies SkiingRules;
