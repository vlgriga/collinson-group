// The failures the domain knows about, one class per kind (docs/architecture/error-handling.md).

/** Input from outside — GraphQL arguments, the environment — that breaks a rule of the boundary. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}
