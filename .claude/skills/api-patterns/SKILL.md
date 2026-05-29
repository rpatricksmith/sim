---
name: api-patterns
description: "Invoke when implementing API routes, request handling, middleware, or error responses. Contains validation, error format, route architecture, and authorization patterns."
---

# API Patterns

## Detected
- Framework: Next.js
- Validation: zod (95%)
- Auth: Better Auth

### Library Rules
- Verify Stripe webhook signatures using `stripe.webhooks.constructEvent()` with the raw body and signing secret. Never trust webhook payloads without signature verification — they can be forged.
- Use `.safeParse()` instead of `.parse()` for user input validation. `.parse()` throws on invalid input — `.safeParse()` returns a result object with typed errors, enabling structured error responses.
- Server Components fetch data directly from service functions or the database. Route Handlers are for EXTERNAL clients (webhooks, mobile apps, third-party integrations). Never call your own Route Handlers from Server Components — that adds an unnecessary network hop.

## Rules
- All route handlers must be wrapped with `withRouteHandler` from `@/lib/core/utils/with-route-handler`. Never export bare `async function GET/POST` — always `export const METHOD = withRouteHandler(...)`.
- Define contracts in `lib/api/contracts/` — one file per resource family. Use `defineRouteContract()` with Zod schemas. Routes and clients share the same contract.
- Validate with `parseRequest(contract, request, context)`. Never import Zod directly in route files or use raw `request.json()`. Check `parsed.success` and return `parsed.response` on failure.
- Auth runs BEFORE validation: `const session = await getSession(); if (!session) return createErrorResponse('Unauthorized', 401)`. Per-route auth, not middleware-based.
- Return consistent shapes: `createSuccessResponse({ data })` for success, `createErrorResponse(message, statusCode)` for errors. Never leak stack traces or internal paths.
- Keep route handlers thin: validate → service call → response. Business logic lives in `lib/` service modules, not inline in routes.
- Verify the requesting user owns the requested resource. Filter by workspace/user — don't rely solely on API-layer checks.
- Routes under `apps/sim/app/api/v1/**` use shared middleware in `apps/sim/app/api/v1/middleware.ts` for auth, rate-limit, and workspace access. Don't reimplement per-route.
- `bun run check:api-validation` must pass — enforces boundary policy (no route Zod imports, no route-local schemas, no raw `request.json()`).

## Gotchas
- Don't call Route Handlers from Server Components. Call the data function directly — the Route Handler is for external clients, not internal server-side calls.
- Always verify webhook signatures before processing Stripe events. Use `stripe.webhooks.constructEvent()` with the raw body — never trust the payload without verification.
- Use `.safeParse()` in route handlers, not `.parse()`. `.parse()` throws on invalid input — use `.safeParse()` and return a 400 with validation error details.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
