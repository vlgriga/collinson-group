import type { TestApp } from '../app.js';

export const ACTIVITY_RANKING = /* GraphQL */ `
  query ActivityRanking($city: String!) {
    activityRanking(city: $city) {
      location {
        name
        country
        countryCode
        admin1
        latitude
        longitude
        elevation
        timezone
      }
      activities {
        activity
        score
        bestDay
        days {
          date
          score
          rating
          reasons
        }
      }
    }
  }
`;

/** The answer to ACTIVITY_RANKING, as the schema shapes it. */
export type ActivityRankingResponse = {
  data?: {
    activityRanking: {
      location: {
        name: string;
        country: string;
        countryCode: string;
        admin1: string | null;
        latitude: number;
        longitude: number;
        elevation: number | null;
        timezone: string;
      };
      activities: {
        activity: string;
        score: number | null;
        bestDay: string | null;
        days: { date: string; score: number; rating: string; reasons: string[] }[];
      }[];
    };
  } | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

/** Sends ACTIVITY_RANKING the way a client does, over HTTP to /graphql. */
export async function requestActivityRanking(
  app: TestApp,
  variables: { city: string },
): Promise<ActivityRankingResponse> {
  const response = await app.yoga.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: ACTIVITY_RANKING, variables }),
  });
  return (await response.json()) as ActivityRankingResponse;
}
