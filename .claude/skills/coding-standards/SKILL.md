---
name: coding-standards
description: "Invoke when implementing features, writing code, or reviewing code quality. Contains project-specific naming conventions, error handling patterns, import style, and deviations from standard practices."
---

# Coding Standards

## Detected
- Language: TypeScript with Next.js (7422 source files)
- Functions: camelCase (75%, 1255 sampled)
- Classes: PascalCase (71%)
- Files: kebab-case (76%, 750 sampled)
- Imports: relative (100%)
- Indentation: spaces, 2 wide
- Error handling: exceptions (nextjs)
- Data fetching: react-query
- State management: zustand (incidental)
- Form handling: react-hook-form
- UI: shadcn/ui (Tailwind)

### Library Rules
- No `.js` extensions on imports. The codebase does not use them (0% ratio).
- Use `import type` for type-only imports, separate from value imports. Prevents runtime imports of pure types.
- Default to Server Components. Only add `"use client"` when the component needs browser APIs, event handlers, or useState/useEffect. Data fetching belongs in Server Components — no useEffect waterfalls.

## Rules
- Prefer named exports. Default exports only where the framework requires them (e.g., Next.js pages, layouts).
- Always use absolute imports via `@/` alias. Never use relative imports — `import { x } from '@/lib/utils'` not `import { x } from '../../lib/utils'`.
- Avoid `any` — use `unknown` and narrow with type guards. `any` is acceptable only for untyped third-party boundaries. Define an interface for complex types — don't escape the type system.
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable. Use `getErrorMessage(error, 'fallback')` from `@sim/utils/errors` to extract error messages — never write `e instanceof Error ? e.message : 'fallback'`.
- Never hardcode API keys, secrets, database URLs, or credentials. Use environment variables or a secrets manager.
- Avoid disabling lint rules inline. When necessary, add a comment explaining why the disable is required.
- Explicit return types on all exported functions. Internal helpers can use inference.
- ID generation: use `generateId()` (UUID v4) or `generateShortId()` from `@sim/utils/id`. Never use `crypto.randomUUID()`, `nanoid`, or `uuid` package directly.
- Common utilities: use `sleep(ms)` from `@sim/utils/helpers`, `toError(e)` and `getErrorMessage(e)` from `@sim/utils/errors`, `omit()`/`filterUndefined()` from `@sim/utils/object`, `truncate()` from `@sim/utils/string`. Never reimplement these inline.
- Logging: import `createLogger` from `@sim/logger`. Use `logger.info`, `logger.warn`, `logger.error` — never `console.log`. Inside routes wrapped with `withRouteHandler`, loggers automatically include request ID.

## Gotchas
- Next.js App Router components are Server Components by default. Add `'use client'` only when the component needs browser APIs, event handlers, or React hooks like useState/useEffect.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
