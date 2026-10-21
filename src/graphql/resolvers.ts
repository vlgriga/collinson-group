import type { RankingService } from '../ranking/index.js';
import { toResponseError } from './errors.js';
import type { Resolvers } from './generated/resolvers.js';
import { parseActivityRankingArgs } from './input.js';

export function createResolvers(ranking: RankingService): Resolvers {
  return {
    Query: {
      activityRanking: async (_parent, args) => {
        try {
          const { location, forecastFetchedAt, activities } = await ranking.rank(
            parseActivityRankingArgs(args),
          );
          const { elevationM, ...place } = location;
          return {
            location: { ...place, elevation: elevationM },
            forecastFetchedAt: forecastFetchedAt.toISOString(),
            activities,
          };
        } catch (error) {
          throw toResponseError(error);
        }
      },
    },
  };
}
