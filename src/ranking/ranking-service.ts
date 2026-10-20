import type { Location, LocationResolver } from './ports.js';

export type RankingRequest = {
  city: string;
};

export type Ranking = {
  location: Location;
  activities: [];
};

/** Answers a ranking request: the place a city resolves to, and its coming days per activity. */
export class RankingService {
  readonly #locations: LocationResolver;

  constructor({ locations }: { locations: LocationResolver }) {
    this.#locations = locations;
  }

  async rank(request: RankingRequest): Promise<Ranking> {
    const location = await this.#locations.resolve(request);
    return { location, activities: [] };
  }
}
