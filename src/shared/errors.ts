// The failures the domain knows about, one class per kind (docs/architecture/error-handling.md).

/** Input from outside — GraphQL arguments, the environment — that breaks a rule of the boundary. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}

/** A name the geocoder knows no place by, in the country asked for if one was. */
export class LocationNotFoundError extends Error {
  override readonly name = 'LocationNotFoundError';
}

/** Open-Meteo could not be reached, answered with an error, or answered with what it should not. */
export class UpstreamUnavailableError extends Error {
  override readonly name = 'UpstreamUnavailableError';
}
