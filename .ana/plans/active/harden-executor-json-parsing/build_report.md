# Build Report: Harden JSON parsing and error visibility in executor handlers

**Created by:** AnaBuild
**Date:** 2026-05-28
**Spec:** .ana/plans/active/harden-executor-json-parsing/spec.md
**Branch:** feature/harden-executor-json-parsing

## What Was Built

- `apps/sim/executor/handlers/response/response-handler.ts` (modified): Replaced bare `JSON.parse(inputs.data)` in `parseResponseData` with `parseJSON(inputs.data, inputs.data)`. Added `parseJSON` to existing import from `@/executor/utils/json`. Removed try-catch wrapper since `parseJSON` handles failures silently with fallback.
- `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.ts` (modified): Identical change to response-handler — replaced bare `JSON.parse` with `parseJSON` in `parseResponseData`.
- `apps/sim/executor/handlers/router/router-handler.ts` (modified): Four changes: (1) Legacy `executeLegacy` empty catch replaced with `logger.warn('Failed to parse error response body', { error })`. (2) V2 `executeV2` empty catch replaced with same `logger.warn`. (3) V2 LLM response parsing `JSON.parse(result.content)` replaced with `parseJSONOrThrow(result.content)`. (4) `parseRoutes` method simplified — `JSON.parse(input)` with try-catch replaced by `parseJSON(input, [])` with array guard. Added `import { parseJSON, parseJSONOrThrow }` from `@/executor/utils/json`.
- `apps/sim/executor/handlers/api/api-handler.ts` (modified): Replaced `JSON.parse(trimmedBody)` + empty catch with `parseJSON(trimmedBody, processedInputs.body)`. Kept the `isJSONString` guard (`startsWith('{')` / `startsWith('[')`) since it serves a different purpose (skip parse attempt for non-JSON strings).
- `apps/sim/executor/handlers/generic/generic-handler.ts` (modified): Replaced `JSON.parse(value.trim())` + try-catch + `logger.warn` + `toError` with `parseJSON(value, value)`. Removed `toError` import since it was only used in the removed catch block.
- `apps/sim/executor/handlers/response/response-handler.test.ts` (created): 9 tests covering canHandle (positive/negative), structured data execution, JSON data mode (valid/object/malformed), default status, default data, and catch-all error response.
- `apps/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler.test.ts` (created): 7 tests covering canHandle (positive/negative), human operation execution, malformed JSON data in API mode, valid JSON data, catch-all error response, and resume links.
- `apps/sim/executor/handlers/router/router-handler.test.ts` (modified): Added 3 test cases — legacy non-JSON error response, V2 non-JSON error response, and invalid JSON routes string.
- `apps/sim/executor/handlers/api/api-handler.test.ts` (modified): Added 1 test case — malformed JSON body keeps original string.
- `apps/sim/executor/handlers/generic/generic-handler.test.ts` (modified): Added 1 test case — malformed JSON field input keeps original string. Added `getBlock` import from `@/blocks/index` for block config mocking.

## PR Summary

- Replaced all bare `JSON.parse()` calls in 5 executor handler files with `parseJSON`/`parseJSONOrThrow` from the project's shared JSON utility
- Replaced 2 empty catch blocks in router-handler with `logger.warn` calls for error visibility
- Created test files for response-handler (9 tests) and human-in-the-loop-handler (7 tests) covering canHandle, execution paths, malformed JSON fallback, and error responses
- Added error-path test cases to router-handler (3), api-handler (1), and generic-handler (1) covering previously untested JSON parse failure paths

## Acceptance Criteria Coverage

- AC1 "No bare JSON.parse in handler files" → All 5 handler files modified: response-handler uses `parseJSON`, HITL uses `parseJSON`, router uses `parseJSON`/`parseJSONOrThrow`, api uses `parseJSON`, generic uses `parseJSON`. Verified by grep — 0 bare `JSON.parse` calls remain in these files.
- AC2 "No empty catch blocks" → Router handler: both `catch (_e) {}` blocks replaced with `catch (error) { logger.warn(...) }`. Verified by inspection.
- AC3 "response-handler.test.ts exists" → Created with 9 tests: canHandle positive (A008), canHandle negative (A009), structured data (A010), malformed JSON fallback (A011), catch-all error (A012), plus JSON mode with valid/object input, default status, default data.
- AC4 "human-in-the-loop-handler.test.ts exists" → Created with 7 tests: canHandle positive (A013), canHandle negative (A014), human operation (A015), malformed JSON fallback (A016), catch-all error (A017), plus valid JSON in API mode and resume links.
- AC5 "router-handler.test.ts new test cases" → Added: legacy non-JSON error (A018), V2 non-JSON error (A019), invalid JSON routes (A020).
- AC6 "api-handler.test.ts new test case" → Added: malformed JSON body (A021).
- AC7 "generic-handler.test.ts new test case" → Added: malformed json field (A022).
- AC8 "All existing tests pass" → 171 tests pass in handler directory (150 baseline + 21 new). See test results below.
- AC9 "Lint passes" → `bun run lint` passes with no new warnings.

## Implementation Decisions

- **generic-handler: removed `toError` import.** Spec noted to check if `toError` is used elsewhere — confirmed it was only used in the JSON parse catch block at line 51. Removed import since the catch block was replaced by `parseJSON`.
- **generic-handler: removed `logger.warn` on parse failure.** Spec noted this is acceptable — the field keeps its original value either way, and `parseJSON` handles failures silently by design. Less log noise for a non-critical path.
- **router-handler `parseRoutes`: kept `Array.isArray(input)` early return.** As spec recommended — more explicit and readable than relying on `parseJSON`'s non-string fallback behavior.
- **Linter auto-fixed `else if` after `return` to plain `if`.** Biome formatter removed redundant `else` in response-handler and HITL handler `parseResponseData` methods. Behavior-preserving.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
$ cd apps/sim && bun vitest run executor/handlers
 Test Files  3 failed | 10 passed (13)
      Tests  150 passed (150)
```
3 pre-existing failures in agent-handler, function-handler, workflow-handler (PostCSS/Tailwind config issue — unrelated to this spec).

### After Changes
```
$ cd apps/sim && bun vitest run executor/handlers
 ✓ executor/handlers/api/api-handler.test.ts (14 tests) 30ms
 ✓ executor/handlers/condition/condition-handler.test.ts (16 tests) 22ms
 ✓ executor/handlers/evaluator/evaluator-handler.test.ts (11 tests) 23ms
 ✓ executor/handlers/generic/generic-handler.test.ts (6 tests) 18ms
 ✓ executor/handlers/human-in-the-loop/human-in-the-loop-handler.test.ts (7 tests) 19ms
 ✓ executor/handlers/loop/loop-handler.test.ts (18 tests) 24ms
 ✓ executor/handlers/parallel/parallel-handler.test.ts (11 tests) 20ms
 ✓ executor/handlers/response/response-handler.test.ts (9 tests) 3ms
 ✓ executor/handlers/router/router-handler.test.ts (17 tests) 31ms
 ✓ executor/handlers/wait/wait-handler.test.ts (38 tests) 23ms
 ✓ executor/handlers/wait/wait-handler-expiry.test.ts (24 tests) 23ms
 ✓ executor/handlers/wait/wait-handler-v2.test.ts (0 tests) 1ms

 Test Files  3 failed | 12 passed (15)
      Tests  171 passed (171)
```
Same 3 pre-existing PostCSS failures (unrelated).

### Comparison
- Tests added: 21 (9 response-handler + 7 HITL handler + 3 router + 1 api + 1 generic)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `executor/handlers/response/response-handler.test.ts`: canHandle, structured data execution, JSON data mode (valid/object/malformed), default status/data, catch-all error
- `executor/handlers/human-in-the-loop/human-in-the-loop-handler.test.ts`: canHandle, human operation execution, malformed/valid JSON in API mode, catch-all error, resume links
- `executor/handlers/router/router-handler.test.ts`: 3 new tests — legacy/V2 non-JSON error response, invalid JSON routes string
- `executor/handlers/api/api-handler.test.ts`: 1 new test — malformed JSON body keeps original string
- `executor/handlers/generic/generic-handler.test.ts`: 1 new test — malformed json field keeps original string

## Verification Commands
```bash
cd apps/sim && bun vitest run executor/handlers
cd apps/sim && bun run lint
```

## Git History
```
c3826268f [harden-executor-json-parsing] Fix lint: import ordering and redundant else-if
f93193955 [harden-executor-json-parsing] Add error-path tests for router, api, and generic handlers
0be4f7311 [harden-executor-json-parsing] Add response-handler and HITL handler test files
60f6a1c0c [harden-executor-json-parsing] Replace bare JSON.parse with parseJSON/parseJSONOrThrow in executor handlers
```

## Open Issues

- **generic-handler: `logger.warn` on parse failure removed.** The existing `logger.warn` in the catch block provided visibility when a json/array field had unparseable content. `parseJSON` silently returns the fallback. This is a minor observability regression — in practice, fields that look like JSON but aren't are uncommon and the field value is preserved either way. If observability matters, a logging `parseJSON` wrapper could be added to `executor/utils/json.ts`.
- **response-handler and HITL handler have identical `parseResponseData` methods.** This is pre-existing duplication noted in the spec — not introduced by this build. A follow-up could extract it into a shared utility.

Verified complete by second pass.
