// The seams the use case needs, implemented outside this module (docs/architecture/ports.md).

/** Says what time it is, so that "now" is the same instant for everything a request does. */
export interface Clock {
  now(): Date;
}

/** A city or town as the geocoder knows it. */
export type Location = {
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  /** The first-level region, when the geocoder knows one. */
  admin1: string | null;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  /** IANA, such as Europe/Paris: the calendar the place's days are counted in. */
  timezone: string;
};

/** Turns the name a client sent into one place. */
export interface LocationResolver {
  resolve(request: { city: string }): Promise<Location>;
}
