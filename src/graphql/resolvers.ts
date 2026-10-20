import type { RankingService } from '../ranking/index.js';
import type { Resolvers } from './generated/resolvers.js';

export function createResolvers(ranking: RankingService): Resolvers {
  return {
    Query: {
      activityRanking: async (_parent, { city, countryCode, days }) => {
        const { location, activities } = await ranking.rank({
          city,
          countryCode: countryCode ?? null,
          days,
        });
        const { elevationM, ...place } = location;
        return { location: { ...place, elevation: elevationM }, activities };
      },
    },
  };
}
