# Error handling

> Related: [Architecture](README.md) · [Logging](logging.md) · [Style guide](../styleguide.md#errors)

## The errors

Failures the domain knows about are typed errors in `src/shared/errors.ts`, one per kind:
`ValidationError`, `LocationNotFoundError`, `UpstreamUnavailableError`. Anything else is a defect.

## The response

The GraphQL layer is the one place an error becomes a response. A domain error maps to its
`extensions.code` (`BAD_USER_INPUT`, `LOCATION_NOT_FOUND`, `UPSTREAM_UNAVAILABLE`). Anything else
becomes `INTERNAL_SERVER_ERROR`: its details are logged and never sent to the client.

## Rules per layer

| Layer | Does |
|---|---|
| Boundary (HTTP clients, GraphQL input, environment) | Turns invalid or failed input into a domain error |
| Services and adapters | Throw; don't catch what they cannot handle, and don't log |
| GraphQL layer | Maps the error to a response and logs it |
| Job handlers | Log the failure and let the queue retry it |

- Nothing is swallowed. An error is handled with a documented fallback — such as serving stored
  data — or it is rethrown.
- A failure is logged once, where it is handled ([logging.md](logging.md#rules)).
