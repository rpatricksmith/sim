# Scope: Harden JSON parsing and error visibility in executor handlers

**Created by:** Ana
**Date:** 2026-05-28

## Intent

Replace bare `JSON.parse()` calls across executor handlers with the project's own `parseJSON` / `parseJSONOrThrow` utilities from `executor/utils/json.ts`, and add logging to empty catch blocks that currently swallow errors silently. Add test coverage for error paths in the two handlers that have no tests at all (response-handler, human-in-the-loop-handler), and add error-path test cases to the three handlers that already have test files (router, api, generic).

The goal is a contribution PR that demonstrates deep understanding of the codebase — specifically that the utility layer exists and handlers aren't using it, and that the engine's error contract expects handlers to throw but some swallow errors instead.

## Complexity Assessment

- **Kind:** fix
- **Size:** small — mechanical replacements across 5 handler files + 2 new test files + 3 test case additions
- **Surface:** sim
- **Files affected:**
  - `apps/sim/executor/handlers/response/response-handler.ts` (line 60: bare JSON.parse)
  - `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.ts` (line 257: bare JSON.parse)
  - `apps/sim/executor/handlers/router/router-handler.ts` (lines 121, 270: empty catch; line 280: bare JSON.parse; line 372: bare JSON.parse)
  - `apps/sim/executor/handlers/api/api-handler.ts` (line 59: bare JSON.parse; line 61: empty catch)
  - `apps/sim/executor/handlers/generic/generic-handler.ts` (line 49: bare JSON.parse)
  - `apps/sim/executor/handlers/response/response-handler.test.ts` (NEW)
  - `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.test.ts` (NEW)
  - `apps/sim/executor/handlers/router/router-handler.test.ts` (add error-path cases)
  - `apps/sim/executor/handlers/api/api-handler.test.ts` (add error-path cases)
  - `apps/sim/executor/handlers/generic/generic-handler.test.ts` (add error-path cases)
- **Blast radius:** Low. All changes are in catch blocks or parse sites. Happy-path behavior is unchanged. The only observable difference is that errors that were previously silent now produce log entries, and JSON parsing uses the same utility the rest of the executor uses.
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no

## Approach

Use the existing `parseJSON(value, fallback)` utility from `executor/utils/json.ts` wherever handlers currently do `try { JSON.parse(x) } catch { return fallback }`. Use `parseJSONOrThrow(value)` where parse failure should propagate. Replace empty `catch (_e) {}` blocks with `catch (error) { logger.warn(...) }` — the logger is already instantiated in every handler file.

This is "Follow the Pattern, Don't Invent a New One" — the pattern already exists, handlers just drifted from it.

Do NOT change the error-swallowing behavior in response-handler (line 41-51) or human-in-the-loop-handler (line 236-247). Those catch-all blocks intentionally return error response objects instead of throwing. Changing that would alter execution semantics and belongs in a separate discussion with maintainers. This PR is strictly about JSON parse safety and error visibility.

## Acceptance Criteria

- AC1: No bare `JSON.parse()` calls remain in any executor handler file — all use `parseJSON` or `parseJSONOrThrow` from `executor/utils/json.ts`
- AC2: No empty catch blocks (`catch (_e) {}` / `catch (e) {}`) remain in any executor handler file — all catch blocks either log or re-throw
- AC3: `response-handler.test.ts` exists with tests covering: canHandle, successful execution, malformed JSON data input (graceful fallback), structured data mode, and the catch-all error path
- AC4: `human-in-the-loop-handler.test.ts` exists with tests covering: canHandle, successful execution with human operation, malformed JSON data input, and the catch-all error path
- AC5: `router-handler.test.ts` has new test cases for: provider API error response parsing (the empty catch at line 121/270), and malformed router JSON response (line 280)
- AC6: `api-handler.test.ts` has a new test case for: malformed request body JSON (the empty catch at line 61)
- AC7: `generic-handler.test.ts` has a new test case for: malformed json/array field input (line 49)
- AC8: All existing tests continue to pass — `bun run test` in apps/sim
- AC9: `bun run lint` passes with no new warnings

## Edge Cases & Risks

- `parseJSON(value, fallback)` trims whitespace before parsing. The existing bare `JSON.parse()` calls in response-handler and HITL handler do NOT trim. This is a minor behavior difference but should be safe — leading/trailing whitespace in JSON is already ignored by the JSON spec. The `trimmedBody` in api-handler already trims manually before parsing, so using `parseJSON` there is strictly equivalent.
- Router handler line 372 (`parseRoutes`) currently returns `[]` on parse failure. Using `parseJSON(input, [])` preserves this behavior exactly.
- Router handler line 280 currently falls back to `result.content.trim()` on parse failure. This is a structured fallback, not a simple default — `parseJSON` alone doesn't capture it. Use a targeted try-catch with `parseJSONOrThrow` and the existing fallback logic, or keep the try-catch but use the utility for the parse call.
- The api-handler empty catch at line 61 is for optional body parsing — if the body looks like JSON but isn't valid, the handler intentionally falls through and sends the raw string. `parseJSON(trimmedBody, undefined)` would achieve this, but the fallback needs to be "keep the original string body" not "undefined." Handle with care.

## Rejected Approaches

- **Creating a new utility function** (e.g., `parseJSONWithLogging`): Unnecessary. `parseJSON` already handles the fallback pattern. For cases needing logging, keep a targeted catch block that calls the utility inside it. Adding a new function to json.ts for this PR would be inventing a pattern rather than following the existing one.
- **Fixing the error-swallowing catch-alls**: Response-handler (line 41-51) and HITL handler (line 236-247) catch ALL errors and return error response objects instead of throwing. The engine expects handlers to throw. This is the deeper architectural issue but changing it would alter execution semantics. Separate PR, separate discussion.
- **Typing the `any` parameters**: Multiple handlers use `Record<string, any>` for inputs and `error: any` in catch blocks. Worth fixing, but it's a different concern and would inflate the diff. Keep the PR focused on JSON parsing and error visibility.

## Open Questions

None — all details are resolved. The utility exists, the handlers are identified, the test patterns are established.

## Exploration Findings

### Patterns Discovered

- `executor/utils/json.ts` (lines 7-17): `parseJSON<T>(value, fallback)` — returns fallback on parse failure, trims input
- `executor/utils/json.ts` (lines 19-25): `parseJSONOrThrow(value)` — throws with enriched error message using `getErrorMessage`
- `executor/utils/json.ts` (lines 49-70): `parseObjectStrings(data)` — recursively parses stringified JSON in objects (already used by response-handler and HITL handler for builder data)
- Handler test convention: `import '@sim/testing/mocks/executor'` first, then `vi.mock()` for handler-specific deps, `beforeEach` with `vi.clearAllMocks()`, structure as canHandle → execute → error handling

### Constraints Discovered

- [TYPE-VERIFIED] `parseJSON` signature (executor/utils/json.ts:7) — generic `<T>`, returns `T`, takes `unknown` input
- [TYPE-VERIFIED] `parseJSONOrThrow` signature (executor/utils/json.ts:19) — returns `any`, takes `string` input, throws `Error`
- [OBSERVED] Response handler and HITL handler have identical `parseResponseData` methods — same code duplicated across both files
- [OBSERVED] Both `parseResponseData` methods already import `parseObjectStrings` from `executor/utils/json` — the json.ts import path is already established in these files

### Test Infrastructure

- `@sim/testing/mocks/executor` — shared mock setup for all handler tests (logger, blocks, tools, providers, HTTP utils, env config)
- `@sim/testing` — exports `inputValidationMock`, `authOAuthUtilsMock`, `urlsMock`, `createMockRequest`, and executor context factories
- Existing handler tests follow identical structure: import executor mocks → vi.mock handler-specific deps → create handler/block/context in beforeEach → test canHandle → test execute → test error paths
- response-handler has NO test file
- human-in-the-loop-handler has NO test file
- router-handler, api-handler, generic-handler all have test files following the standard pattern

## For AnaPlan

### Structural Analog

`apps/sim/executor/handlers/generic/generic-handler.test.ts` — closest structural match for the new test files. Clean, uses standard executor mock setup, tests canHandle + execute + error paths. The generic handler is the simplest handler, making its test the clearest template.

### Relevant Code Paths

- `apps/sim/executor/utils/json.ts` — the utility file handlers should be importing from. Already imported by response-handler and HITL handler for `parseObjectStrings`.
- `apps/sim/executor/handlers/response/response-handler.ts` — 110 lines, simple handler. `parseResponseData` at line 54 has the bare JSON.parse. Catch-all at line 41.
- `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.ts` — 520 lines, complex handler. `parseResponseData` at line 251 is identical to response-handler's. Catch-all at line 236. Also has `executeNotificationTools` with its own catch blocks (line 507) — those are fine, they log and return failure objects.
- `apps/sim/executor/handlers/router/router-handler.ts` — 400+ lines. Empty catches at lines 121 and 270 (error response parsing). `JSON.parse(result.content)` at line 280 (LLM response). `parseRoutes` at line 369 with JSON.parse.
- `apps/sim/executor/handlers/api/api-handler.ts` — 166 lines. Bare JSON.parse at line 59 with empty catch at line 61 (request body).
- `apps/sim/executor/handlers/generic/generic-handler.ts` — 125 lines. JSON.parse at line 49 in input field parsing. Already uses `toError` from `@sim/utils/errors`.

### Patterns to Follow

- `generic-handler.test.ts` for new test file structure
- `router-handler.test.ts` for how to mock `fetch` and test provider API interactions
- `api-handler.test.ts` for how to use `inputValidationMock` and test tool execution error paths
- Import `parseJSON` alongside existing `parseObjectStrings` import where the import path is already present

### Known Gotchas

- Response-handler line 60 and HITL handler line 257: The fallback on JSON.parse failure is "return the original string" — when using `parseJSON`, the fallback must be `inputs.data` (the original), not a static default.
- Router handler line 280: The fallback is `result.content.trim()` — this is a structured fallback that assigns to `chosenRouteId`. Can't just use `parseJSON` with a simple default; need to preserve the routing logic.
- Api-handler line 59: The parse is conditional — only runs if `trimmedBody.startsWith('{') || trimmedBody.startsWith('[')`. The `parseJSON` utility doesn't have this guard, so either keep the guard or use `isJSONString` from the same utility file (line 40-43).
- HITL handler test needs to mock `@/lib/core/utils/urls` (for `getBaseUrl`), `@/tools` (for `executeTool`), and `@/executor/human-in-the-loop/utils` — these are handler-specific dependencies beyond the standard executor mocks.

### Things to Investigate

- Whether router-handler line 280 is better served by keeping the explicit try-catch with `JSON.parse` inside (for the structured fallback) or by using `parseJSON` with `null` fallback and a conditional. This is a style judgment — the planner should read the surrounding routing logic and decide which reads more clearly.
