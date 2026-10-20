// The seams the use case needs, implemented outside this module (docs/architecture/ports.md).

/** Says what time it is, so that "now" is the same instant for everything a request does. */
export interface Clock {
  now(): Date;
}
