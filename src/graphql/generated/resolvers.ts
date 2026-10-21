import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A calendar day in the place's own timezone, written YYYY-MM-DD. */
  Date: { input: string; output: string; }
  /** An instant, written in ISO 8601 in UTC, such as 2026-10-18T09:00:00.000Z. */
  DateTime: { input: string; output: string; }
};

/** What the days are scored for. */
export type Activity =
  | 'OUTDOOR_SIGHTSEEING'
  | 'SKIING';

/** How good the coming days are for one activity. */
export type ActivityForecast = {
  __typename?: 'ActivityForecast';
  /** The activity scored. */
  activity: Activity;
  /** The day with the highest score; the earliest of them on a tie. */
  bestDay?: Maybe<Scalars['Date']['output']>;
  /** Today and the days after it, in date order. */
  days: Array<DayScore>;
  /** The weekly score, 0–100: the mean of the days' scores. */
  score?: Maybe<Scalars['Int']['output']>;
};

/** The coming days of one place, scored per activity. */
export type ActivityRanking = {
  __typename?: 'ActivityRanking';
  /**
   * Each activity with its days and its weekly score, the best weekly score first; on a tie, in
   * the order of Activity.
   */
  activities: Array<ActivityForecast>;
  /**
   * When the forecast the days are scored from was fetched from Open-Meteo: the latest successful
   * fetch for the place.
   */
  forecastFetchedAt: Scalars['DateTime']['output'];
  /** The place the city was taken to mean. */
  location: Location;
};

/** How good one day is for an activity, and why. */
export type DayScore = {
  __typename?: 'DayScore';
  /** The day, in the place's timezone. */
  date: Scalars['Date']['output'];
  /** The score in words. */
  rating: Rating;
  /** What decided the score, most influential first, in English and metric units. */
  reasons: Array<Scalars['String']['output']>;
  /** 0–100, higher is better. */
  score: Scalars['Int']['output'];
};

/** A city or town as the geocoder knows it. */
export type Location = {
  __typename?: 'Location';
  /** The first-level region, such as a state or province, when the geocoder knows one. */
  admin1?: Maybe<Scalars['String']['output']>;
  /** The country's name, in English. */
  country: Scalars['String']['output'];
  /** ISO 3166-1 alpha-2. */
  countryCode: Scalars['String']['output'];
  /** Metres above sea level, when the geocoder knows it. */
  elevation?: Maybe<Scalars['Float']['output']>;
  /** Degrees, WGS 84. */
  latitude: Scalars['Float']['output'];
  /** Degrees, WGS 84. */
  longitude: Scalars['Float']['output'];
  /** The place's name. */
  name: Scalars['String']['output'];
  /** The IANA timezone the days are counted in, such as Europe/Paris. */
  timezone: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** How good each of the coming days is for each activity in a city or town. */
  activityRanking: ActivityRanking;
};


export type QueryActivityRankingArgs = {
  city: Scalars['String']['input'];
  countryCode?: InputMaybe<Scalars['String']['input']>;
  days?: Scalars['Int']['input'];
};

/** A day's score in words: below 40 POOR, 40–59 FAIR, 60–79 GOOD, 80 and above EXCELLENT. */
export type Rating =
  | 'EXCELLENT'
  | 'FAIR'
  | 'GOOD'
  | 'POOR';



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Activity: Activity;
  ActivityForecast: ResolverTypeWrapper<ActivityForecast>;
  ActivityRanking: ResolverTypeWrapper<ActivityRanking>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DayScore: ResolverTypeWrapper<DayScore>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Location: ResolverTypeWrapper<Location>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Rating: Rating;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  ActivityForecast: ActivityForecast;
  ActivityRanking: ActivityRanking;
  Boolean: Scalars['Boolean']['output'];
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DayScore: DayScore;
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  Location: Location;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
};

export type ActivityForecastResolvers<ContextType = any, ParentType extends ResolversParentTypes['ActivityForecast'] = ResolversParentTypes['ActivityForecast']> = {
  activity?: Resolver<ResolversTypes['Activity'], ParentType, ContextType>;
  bestDay?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  days?: Resolver<Array<ResolversTypes['DayScore']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ActivityRankingResolvers<ContextType = any, ParentType extends ResolversParentTypes['ActivityRanking'] = ResolversParentTypes['ActivityRanking']> = {
  activities?: Resolver<Array<ResolversTypes['ActivityForecast']>, ParentType, ContextType>;
  forecastFetchedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  location?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DayScoreResolvers<ContextType = any, ParentType extends ResolversParentTypes['DayScore'] = ResolversParentTypes['DayScore']> = {
  date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Rating'], ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type LocationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  admin1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  country?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  elevation?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  activityRanking?: Resolver<ResolversTypes['ActivityRanking'], ParentType, ContextType, RequireFields<QueryActivityRankingArgs, 'city' | 'days'>>;
};

export type Resolvers<ContextType = any> = {
  ActivityForecast?: ActivityForecastResolvers<ContextType>;
  ActivityRanking?: ActivityRankingResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DayScore?: DayScoreResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

