/**
 * The Geocoding searches the recordings here answer, and the name their files are kept under:
 * scripts/record-fixtures.ts records them, the Open-Meteo fake serves them. A search with
 * `forecast: false` finds a place another search has the forecast of.
 */
export const SEARCHES: readonly {
  name: string;
  countryCode?: string;
  file: string;
  forecast?: false;
}[] = [
  { name: 'Chamonix', file: 'chamonix' },
  // The same place as Chamonix, by another name.
  { name: 'Chamonix Mont Blanc', file: 'chamonix-mont-blanc', forecast: false },
  // Some of its lower-ranked matches have no country.
  { name: 'Victoria', file: 'victoria' },
  { name: 'Paris', file: 'paris' },
  // Paris, Texas: the country code changes the top match.
  { name: 'Paris', countryCode: 'US', file: 'paris-us' },
  // A ski resort with snow on the ground that changes within a day.
  { name: 'Val Thorens', file: 'val-thorens' },
];
