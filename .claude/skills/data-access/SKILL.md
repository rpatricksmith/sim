---
name: data-access
description: "Invoke when working with database queries, schema changes, migrations, or data models. Contains project-specific ORM conventions and data access patterns."
---

# Data Access

## Detected
- Database: Drizzle
- Schema: drizzle → postgresql, 99 models, packages/db/schema.ts

## Rules
- Import the database client from a single shared module. Avoid instantiating new clients in route handlers or service functions — each instance opens its own connection pool.
- Wrap multi-step mutations in a transaction. If any step can fail, partial writes corrupt data — all steps succeed or all roll back.
- Avoid querying the database inside loops — use eager loading or joins for related data. Each loop iteration is a separate round trip.
- Select only the fields you need. Avoid fetching entire records when the consumer needs a few columns.
- Always scope data queries to the authorized context. Filter by the authenticated user, organization, or tenant — don't rely solely on API-layer checks to prevent unauthorized access. A missing `where` clause is an IDOR vulnerability.

## Gotchas
- Drizzle schema changes update TypeScript types immediately, but the database is NOT synced automatically. Run `npx drizzle-kit push` (development) or `drizzle-kit generate` + `drizzle-kit migrate` (production) after schema changes.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
