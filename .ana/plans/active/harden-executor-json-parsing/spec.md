# Spec: Harden JSON parsing and error visibility in executor handlers

**Created by:** AnaPlan
**Date:** 2026-05-28
**Scope:** .ana/plans/active/harden-executor-json-parsing/scope.md

## Approach

Replace bare `JSON.parse()` calls across five executor handler files with the project's own `parseJSON` / `parseJSONOrThrow` utilities from `executor/utils/json.ts`. Add `logger.warn` calls to the two empty catch blocks in the router handler. Create two new test files (response-handler, human-in-the-loop-handler) and add error-path test cases to three existing test files.

The utilities already exist and are already imported by some of these files (response-handler and HITL handler both import `parseObjectStrings` from the same module). This is strictly "follow the pattern, don't invent a new one."

**Critical constraint:** Do NOT touch the catch-all blocks in response-handler (line 41) or HITL handler (line 236). Those intentionally return error response objects instead of throwing. Changing them would alter execution semantics.

## Output Mockups

No user-facing output changes. The only observable difference is:

1. Router handler empty catches now produce log entries:
   ```
   [WARN] RouterBlockHandler: Failed to parse error response body { error: <SyntaxError details> }
   ```

2. All `JSON.parse` calls now go through utilities that trim whitespace before parsing (JSON spec–compatible, strictly more tolerant).

## File Changes

### `apps/sim/executor/handlers/response/response-handler.ts` (modify)
**What changes:** Replace bare `JSON.parse(inputs.data)` in `parseResponseData` (line 60) with `parseJSON(inputs.data, inputs.data)`. The fallback is the original `inputs.data` — identical to the current behavior where parse failure returns the original string. The existing `logger.warn` on failure is already there in the current code, but with `parseJSON` handling failures silently, the try-catch wrapper is replaced by a single expression. Add `parseJSON` to the existing import from `@/executor/utils/json`.
**Pattern to follow:** The import path `@/executor/utils/json` is already in this file (for `parseObjectStrings`). Add `parseJSON` to the same import.
**Why:** Bare `JSON.parse` bypasses the project's error-enrichment and whitespace-trimming utility.

### `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.ts` (modify)
**What changes:** Identical change to response-handler — replace bare `JSON.parse(inputs.data)` in `parseResponseData` (line 257) with `parseJSON(inputs.data, inputs.data)`. Add `parseJSON` to the existing import from `@/executor/utils/json`.
**Pattern to follow:** Same as response-handler — the `parseResponseData` method is duplicated between these two files.
**Why:** Same reason as response-handler. These two files have identical `parseResponseData` methods.

### `apps/sim/executor/handlers/router/router-handler.ts` (modify)
**What changes:** Four changes:
1. **Lines 117-121 (legacy `executeLegacy` error response parsing):** Replace `catch (_e) {}` with `catch (error) { logger.warn('Failed to parse error response body', { error }) }`.
2. **Lines 263-270 (V2 `executeV2` error response parsing):** Same change as #1 — replace empty catch with `logger.warn`.
3. **Line 280 (`executeV2` LLM response parsing):** Replace `JSON.parse(result.content)` with `parseJSONOrThrow(result.content)`. Keep the existing try-catch structure — the catch block has a structured fallback that sets `chosenRouteId = result.content.trim()` and logs. The `parseJSONOrThrow` utility trims internally and enriches the error message — but the catch already handles the fallback correctly, so just swap the parse call.
4. **`parseRoutes` method (line 372):** Replace `JSON.parse(input)` with `parseJSON(input, [])`. The existing catch returns `[]`, so this is an exact behavioral match. The try-catch wrapper can be simplified — `parseJSON` handles the fallback internally. Keep the array check and the logging on parse failure.

Add `import { parseJSON, parseJSONOrThrow } from '@/executor/utils/json'` — this file doesn't currently import from json.ts.
**Pattern to follow:** The logging pattern in empty catches should match the style already used in the handler: `logger.warn('message', { error })` or `logger.error('message:', { input, error })`.
**Why:** Empty catches silently swallow errors, making debugging production failures harder.

### `apps/sim/executor/handlers/api/api-handler.ts` (modify)
**What changes:** Replace the bare `JSON.parse(trimmedBody)` + empty catch at lines 59-61. The current pattern: if body starts with `{` or `[`, try to parse, else leave as string. On parse failure, leave body as original string. Replace with: `parseJSON(trimmedBody, processedInputs.body)`. The `isJSONString` guard (`trimmedBody.startsWith('{') || trimmedBody.startsWith('[')`) stays — it serves a different purpose (skip parse attempt for non-JSON strings like `"plain text"`). Add `import { parseJSON } from '@/executor/utils/json'`.
**Pattern to follow:** The `isJSONString` utility exists in `executor/utils/json.ts` but using it here would be a separate refactor. Keep the inline guard for now.
**Why:** Empty catch block silently swallows parse errors with no visibility.

### `apps/sim/executor/handlers/generic/generic-handler.ts` (modify)
**What changes:** Replace `JSON.parse(value.trim())` at line 49 with `parseJSON(value, value)`. The `parseJSON` utility trims internally, so the manual `.trim()` is redundant. On parse failure, the field retains its original string value — identical to current behavior where the catch block logs but doesn't reassign. The existing try-catch wrapper and `logger.warn` + `toError` can be removed since `parseJSON` handles failures silently. Add `parseJSON` to the imports from `@/executor/utils/json` (the file doesn't currently import from there, but it does import `toError` from `@sim/utils/errors` — that import stays since it's used elsewhere, or can be removed if `toError` is only used for this catch block).
**Pattern to follow:** Check whether `toError` is used elsewhere in the file before removing the import.
**Why:** Uses the project's standard JSON parsing utility instead of bare `JSON.parse`.

### `apps/sim/executor/handlers/response/response-handler.test.ts` (create)
**What changes:** New test file covering: `canHandle` (positive and negative), successful execution with structured data mode, successful execution with JSON data mode, malformed JSON data input (verifies graceful fallback to original string), and the catch-all error path (verifies error response object shape).
**Pattern to follow:** `generic-handler.test.ts` — import `@sim/testing/mocks/executor` first, then vitest imports, then handler-specific mocks. Use `vi.clearAllMocks()` in `beforeEach`.
**Why:** No test coverage exists for this handler.

### `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.test.ts` (create)
**What changes:** New test file covering: `canHandle`, successful execution with human operation (mock `getBaseUrl`, `generatePauseContextId`, `mapNodeMetadataToPauseScopes`), malformed JSON data input (verifies graceful fallback), and the catch-all error path. This handler has more dependencies than response-handler.
**Pattern to follow:** `generic-handler.test.ts` for structure. Additionally mock `@/lib/core/utils/urls` (use `urlsMock` from `@sim/testing`), `@/tools` (already in executor mocks), and `@/executor/human-in-the-loop/utils`.
**Why:** No test coverage exists for this handler.

### `apps/sim/executor/handlers/router/router-handler.test.ts` (modify)
**What changes:** Add test cases for:
1. Legacy router: provider API returns non-JSON error response — verify the handler still throws with the status-based error message (tests the empty catch that now logs).
2. V2 router: provider API returns non-JSON error response — same as above.
3. V2 router: `parseRoutes` with invalid JSON string input — verify it returns empty routes and throws "No routes defined."
**Pattern to follow:** Existing tests in the same file — mock `fetch` to return `{ ok: false, json: () => Promise.reject() }` for the error response tests.
**Why:** Error paths for provider API response parsing were untested.

### `apps/sim/executor/handlers/api/api-handler.test.ts` (modify)
**What changes:** Add a test case for malformed JSON body: provide a body string that starts with `{` but is invalid JSON. Verify the tool receives the original string body (not parsed, not undefined).
**Pattern to follow:** Existing "should parse JSON string body correctly" and "should keep non-JSON string body as string" tests in the same file.
**Why:** The empty catch path for body parsing was untested.

### `apps/sim/executor/handlers/generic/generic-handler.test.ts` (modify)
**What changes:** Add a test case for malformed json/array field input: set up a block with `inputs: { data: { type: 'json' } }` and provide a non-parseable string. Verify the tool receives the original string value (not parsed, not thrown). Need to mock `getBlock` to return a block config with an `inputs` definition that has a `json` type field.
**Pattern to follow:** Existing tests in the same file for tool execution.
**Why:** The JSON parse failure path in input field processing was untested.

## Acceptance Criteria

- [ ] AC1: No bare `JSON.parse()` calls remain in any executor handler file — all use `parseJSON` or `parseJSONOrThrow` from `executor/utils/json.ts`
- [ ] AC2: No empty catch blocks (`catch (_e) {}` / `catch (e) {}`) remain in any executor handler file — all catch blocks either log or re-throw
- [ ] AC3: `response-handler.test.ts` exists with tests covering: canHandle, successful execution, malformed JSON data input (graceful fallback), structured data mode, and the catch-all error path
- [ ] AC4: `human-in-the-loop-handler.test.ts` exists with tests covering: canHandle, successful execution with human operation, malformed JSON data input, and the catch-all error path
- [ ] AC5: `router-handler.test.ts` has new test cases for: provider API error response with non-JSON body (both legacy and V2), and malformed routes JSON string
- [ ] AC6: `api-handler.test.ts` has a new test case for: malformed request body JSON (body starts with `{` but is invalid)
- [ ] AC7: `generic-handler.test.ts` has a new test case for: malformed json/array field input
- [ ] AC8: All existing tests continue to pass — `(cd 'apps/sim' && bun run test)`
- [ ] AC9: `(cd 'apps/sim' && bun run lint)` passes with no new warnings

## Testing Strategy

- **Unit tests (new files):** response-handler.test.ts and human-in-the-loop-handler.test.ts following generic-handler.test.ts structure. Import `@sim/testing/mocks/executor` for shared mocks.
- **Unit tests (additions):** Add error-path cases to router-handler.test.ts, api-handler.test.ts, generic-handler.test.ts.
- **Edge cases:**
  - Malformed JSON that starts with `{` but is invalid (e.g., `{invalid json}`)
  - Valid JSON that happens to be a string (e.g., `"hello"`) — should still parse
  - Empty string input to parseResponseData
  - Non-JSON body in api-handler (e.g., `"plain text"`) — should stay as string (NOT go through parse attempt since it doesn't start with `{` or `[`)
  - Provider API returning non-JSON error response (e.g., HTML error page) — router should still throw with status-based error message

## Dependencies

- `executor/utils/json.ts` must export `parseJSON` and `parseJSONOrThrow` — verified, it does.
- `@sim/testing/mocks/executor` must be available — verified, it exists at `packages/testing/src/mocks/executor.mock.ts`.

## Constraints

- Do NOT modify the catch-all error blocks in response-handler (line 41-51) or HITL handler (line 236-247). Those intentionally return error response objects instead of throwing.
- Do NOT change handler behavior beyond JSON parsing — happy-path output must remain identical.
- Do NOT type-narrow `any` parameters (e.g., `Record<string, any>`, `error: any`) — that's a separate concern.

## Gotchas

- **Response handler and HITL handler have identical `parseResponseData` methods.** Make the same change in both. Don't try to deduplicate — that's a separate refactor.
- **`parseJSON` trims whitespace.** The existing bare `JSON.parse()` calls don't. This is a minor behavior difference but safe — JSON spec ignores leading/trailing whitespace. The api-handler already trims manually (`trimmedBody`), so `parseJSON` there is strictly equivalent.
- **generic-handler: removing the try-catch loses the existing `logger.warn` on parse failure.** This is acceptable — the field keeps its original value either way, and the utility handles failures silently by design. The tradeoff is less noise in logs for a non-critical path (a string field that looks like JSON but isn't).
- **generic-handler: check if `toError` import can be removed.** Only remove if it's not used elsewhere in the file. Currently `toError` is imported at line 2 and used only in the JSON parse catch at line 51 — so it can be removed when the catch is removed.
- **HITL handler test needs more mocks than other handler tests.** It imports from `@/lib/core/utils/urls` (use `urlsMock` from `@sim/testing`), `@/executor/human-in-the-loop/utils` (mock `generatePauseContextId` and `mapNodeMetadataToPauseScopes`), and `@/executor/utils/builder-data` (mock `convertBuilderDataToJson`). The executor mock setup already handles `@/tools`, `@sim/logger`, and `@/blocks`.
- **Router handler `parseRoutes` simplification:** When replacing with `parseJSON(input, [])`, the method can be simplified but keep the `Array.isArray(input)` early return — `parseJSON` only handles string inputs and returns the fallback for non-strings, which is correct, but the array passthrough is more explicit and readable.
- **`validateModelProvider` in router-handler:** This import from `@/ee/access-control/utils/permission-check` is not explicitly mocked in the existing tests but works because its transitive deps (`@sim/db`, `@sim/logger`, feature flags) are globally mocked. Don't add a new mock for it.

## Build Brief

### Rules That Apply
- No bare `JSON.parse()` — use `parseJSON` / `parseJSONOrThrow` from `@/executor/utils/json`
- Every catch block must do something deliberate: re-throw, return a typed error, or log with context. Empty catch blocks are never acceptable.
- Use absolute imports via `@/` alias
- Use `@vitest-environment node` for test files (no DOM needed)
- Import `@sim/testing/mocks/executor` at the very top of handler test files, before all other imports
- Use `vi.hoisted()` + `vi.mock()` + static imports — never `vi.resetModules()` + `vi.doMock()`
- `vi.clearAllMocks()` in `beforeEach`
- No `any` — but don't fix pre-existing `any` usage in handler signatures (that's a separate concern)

### Pattern Extracts

**generic-handler.test.ts structure (lines 1-14) — follow for new test files:**
```typescript
import '@sim/testing/mocks/executor'

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { BlockType } from '@/executor/constants'
import { GenericBlockHandler } from '@/executor/handlers/generic/generic-handler'
import type { ExecutionContext } from '@/executor/types'
import type { SerializedBlock } from '@/serializer/types'
import { executeTool } from '@/tools'
import type { ToolConfig } from '@/tools/types'
import { getTool } from '@/tools/utils'

const mockGetTool = vi.mocked(getTool)
const mockExecuteTool = executeTool as Mock
```

**generic-handler.test.ts mockContext shape (lines 37-46) — reuse in new tests:**
```typescript
mockContext = {
  workflowId: 'test-workflow-id',
  blockStates: new Map(),
  blockLogs: [],
  metadata: { duration: 0 },
  environmentVariables: {},
  decisions: { router: new Map(), condition: new Map() },
  loopExecutions: new Map(),
  executedBlocks: new Set(),
  activeExecutionPath: new Set(),
  completedLoops: new Set(),
}
```

**parseJSON usage (executor/utils/json.ts lines 7-17) — the utility being adopted:**
```typescript
export function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') {
    return fallback
  }

  try {
    return JSON.parse(value.trim())
  } catch (error) {
    return fallback
  }
}
```

**parseJSONOrThrow usage (executor/utils/json.ts lines 19-25):**
```typescript
export function parseJSONOrThrow(value: string): any {
  try {
    return JSON.parse(value.trim())
  } catch (error) {
    throw new Error(`Invalid JSON: ${getErrorMessage(error, 'Parse error')}`)
  }
}
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After modifying the 5 handler files: `(cd 'apps/sim' && bun vitest run executor/handlers)` — Expected: all existing 216 tests pass
- After adding new test files and cases: `(cd 'apps/sim' && bun vitest run executor/handlers)` — Expected: 216 + new tests pass
- After all changes: `(cd 'apps/sim' && bun vitest run)` — Expected: 7137+ tests pass (458+ files)
- Lint: `(cd 'apps/sim' && bun run lint)`

### Build Baseline
- Current tests: 7137 passed in 458 files (1 pre-existing failure in auth.test.ts — env config issue, unrelated)
- Handler tests: 216 passed in 13 files
- Command used: `cd /Users/rsmith/Projects/contributions/sim/apps/sim && bun vitest run`
- After build: expected 7137 + ~20-30 new tests
- Regression focus: existing tests in router-handler.test.ts, api-handler.test.ts, generic-handler.test.ts — changes to parse behavior could affect happy-path assertions
