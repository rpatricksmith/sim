---
name: data-access
description: "Invoke when working with database queries, schema changes, migrations, or data models. Contains project-specific ORM conventions and data access patterns."
---

# Data Access

## Detected
- Database: Drizzle
- Schema: drizzle → postgresql, 99 models, packages/db/schema.ts

## Rules
- Import the database client from `@sim/db`. Never instantiate new clients in route handlers or service functions — each instance opens its own connection pool.
- Use `DbOrTx` type annotation for functions that accept either the database client or a transaction context. This enables composable service functions.
- Wrap multi-step mutations in a transaction: `db.transaction(async (tx) => { ... })`. If any step can fail, partial writes corrupt data.
- Soft deletes: filter by `isNull(archivedAt)` in queries. Don't use hard deletes unless explicitly required.
- Avoid querying the database inside loops — use eager loading or joins for related data. Each loop iteration is a separate round trip.
- Always scope data queries to the authorized context. Filter by workspace, user, or organization — a missing `where` clause is an IDOR vulnerability.
- Schema changes: edit `packages/db/schema.ts`, then run `cd packages/db && bun run db:push` (dev) or `bun run db:migrate` (prod). Schema changes update TypeScript types immediately but NOT the database.
- No raw SQL. Keep everything in Drizzle query builder for type safety.

## Gotchas
- Drizzle schema changes update TypeScript types immediately, but the database is NOT synced automatically. Run `npx drizzle-kit push` (development) or `drizzle-kit generate` + `drizzle-kit migrate` (production) after schema changes.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
