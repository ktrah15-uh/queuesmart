# QueueSmart API Contract

Base URL: `http://localhost:4000/api`
All requests and responses are JSON. Each owner fills in their own section.

## Conventions (apply to every endpoint)

**Auth header** — protected routes need:
`Authorization: Bearer <token>`
The acting user is `req.user` (`{ id, role }`). Never read a `userId` from the body.

**Validation** — use `validateBody(schema)` from `src/utils/validate.js`,
then read `req.data` in your handler (trimmed and type-coerced), NOT `req.body`.

**Errors** — never format by hand. Call:
`next(new ApiError(404, 'NOT_FOUND', 'Service not found'))`

Every error response looks like:

    { "error": { "code": "NOT_FOUND", "message": "Service not found" } }

Validation failures add a per-field map:

    { "error": { "code": "VALIDATION_ERROR",
                 "message": "One or more fields are invalid",
                 "fields": { "email": "email must be a valid email address" } } }

**Status codes**

| Code | When |
|------|------|
| 200 | Successful read or update |
| 201 | Resource created |
| 400 | VALIDATION_ERROR — bad or missing fields |
| 401 | UNAUTHORIZED — missing/invalid token |
| 403 | FORBIDDEN — logged in, wrong role |
| 404 | NOT_FOUND |
| 409 | CONFLICT — e.g. already in queue, email taken |

**Naming** — camelCase in JSON (`expectedDuration`, `serviceId`, `joinedAt`).
Timestamps are ISO strings.

---

## Auth — Killian (done)

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/auth/register` | none | `name, email, password, role?` | 201 `{ user, token }` |
| POST | `/auth/login` | none | `email, password` | 200 `{ user, token }` |
| GET | `/auth/me` | Bearer | — | 200 `{ user }` |

`user` object (identical everywhere it appears — `passwordHash` is always stripped):

    { "id": 1,
      "name": "Test User",
      "email": "test@example.com",
      "role": "user",
      "emailVerified": false,
      "createdAt": "2026-07-24T14:02:11.000Z" }

`id` is a **number**. `email` is lowercased on save. `role` is `user` or `admin`.

Rules: name 2–100 chars, email valid + max 254, password 8–128 chars.

Errors:
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | bad or missing fields |
| 409 | `EMAIL_TAKEN` | email already registered |
| 401 | `INVALID_CREDENTIALS` | wrong email *or* wrong password (same message either way, deliberately) |
| 404 | `NOT_FOUND` | `/auth/me` with a token for a deleted user |

## Services — Andres

TODO

## Queue — Alan

See also `src/modules/queue/Queue Documentation.md`

## Queue — Alan (implemented)
*(Drafted by Killian from Alan's pushed code — Alan, correct anything wrong here.)*
Fuller notes: `src/modules/queue/Queue Documentation.md`

| Method | Path | Auth | Input | Success |
|--------|------|------|-------|---------|
| POST | `/queue/join` | Bearer | body `{ serviceId }` (integer) | 201 join result |
| POST | `/queue/leave` | Bearer | body `{ queueEntryId }` (integer) | 200 |
| GET | `/queue/status/:queueEntryId` | Bearer | URL param | 200 status + wait estimate |
| GET | `/queue/admin/:serviceId` | Bearer + **admin** | URL param | 200 array of tickets |
| POST | `/queue/admin/:serviceId/serve` | Bearer + **admin** | URL param | 200 `{ message, ticket }` |

Acting user comes from the token (`req.user.id`) — never send a userId.

Ticket object:

    { "id": 12345, "userId": 1, "serviceId": 1, "status": "waiting",
      "joinedAt": "2026-07-23T22:59:14.000Z", "priority": "high" }

`status` is `waiting` | `left` | `served`.

Service functions for Andres to call directly:
- `getQueueForService(serviceId)` → array of tickets, oldest first, empty array if none
- `serveNext(serviceId)` → `{ message, ticket }`; throws 404 if the line is empty

Wait-time estimate (A3): `peopleAhead * service.expectedDuration`.

## Notifications & History — David

TODO