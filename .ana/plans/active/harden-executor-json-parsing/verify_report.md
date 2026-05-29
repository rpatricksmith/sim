# Verify Report: Harden JSON parsing and error visibility in executor handlers

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-28
**Spec:** .ana/plans/active/harden-executor-json-parsing/spec.md
**Branch:** feature/harden-executor-json-parsing

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/harden-executor-json-parsing/contract.yaml
  Seal: INTACT (hash sha256:aa433b845665351edf12a9cdc57252b58553a5a133bb5893ed59ba28d3124c09)
```

Tests: 171 passed, 0 failed (handler scope). 3 suites failed with pre-existing PostCSS config error (agent-handler, function-handler, workflow-handler — unrelated to this build). Build: N/A (build-only verification not required). Lint: passed — "Checked 7678 files in 2s. No fixes applied."

## Contract Compliance
| ID   | Says                                           | Status       | Evidence |
|------|------------------------------------------------|--------------|----------|
| A001 | Response handler uses parseJSON instead of bare JSON.parse | ✅ SATISFIED | `response-handler.ts:59` — `parseJSON(inputs.data, inputs.data)`. Zero `JSON.parse` in file (grep confirmed). |
| A002 | HITL handler uses parseJSON instead of bare JSON.parse | ✅ SATISFIED | `human-in-the-loop-handler.ts:256` — `parseJSON(inputs.data, inputs.data)`. Zero `JSON.parse` in file. |
| A003 | Router handler uses parseJSON/parseJSONOrThrow, zero bare JSON.parse | ✅ SATISFIED | `router-handler.ts:285` — `parseJSONOrThrow(result.content)`, `router-handler.ts:378` — `parseJSON(input, [])`. Zero `JSON.parse` in file (grep confirmed). |
| A004 | API handler uses parseJSON for body parsing | ✅ SATISFIED | `api-handler.ts:59` — `parseJSON(trimmedBody, processedInputs.body)`. Zero `JSON.parse` in file. |
| A005 | Generic handler uses parseJSON for field parsing | ✅ SATISFIED | `generic-handler.ts:48` — `parseJSON(value, value)`. Zero `JSON.parse` in file. |
| A006 | Router handler logs warning when legacy error response can't be parsed | ✅ SATISFIED | `router-handler.ts:123` — `logger.warn('Failed to parse error response body', { error })` |
| A007 | Router V2 handler logs warning when error response can't be parsed | ✅ SATISFIED | `router-handler.ts:274` — `logger.warn('Failed to parse error response body', { error })` |
| A008 | Response handler test: canHandle returns true for response blocks | ✅ SATISFIED | `response-handler.test.ts:49-51` — `@ana A008`, asserts `handler.canHandle(mockBlock)` toBe `true` where mockBlock.metadata.id === BlockType.RESPONSE |
| A009 | Response handler test: canHandle returns false for non-response blocks | ✅ SATISFIED | `response-handler.test.ts:53-60` — `@ana A009`, asserts `handler.canHandle(nonResponseBlock)` toBe `false` where metadata.id === 'other-block' |
| A010 | Response handler test: successful execution returns status 200 | ✅ SATISFIED | `response-handler.test.ts:63-75` — `@ana A010`, asserts `result.status` toBe `200` with structured data inputs |
| A011 | Malformed JSON input to response handler falls back to original string | ✅ SATISFIED | `response-handler.test.ts:101-111` — `@ana A011`, asserts `result.data` toBe `'{invalid json}'` |
| A012 | Response handler returns error object on execution failure | ✅ SATISFIED | `response-handler.test.ts:126-143` — `@ana A012`, mocks `convertBuilderDataToJson` to throw, asserts `result.status` toBe `500` |
| A013 | HITL handler test: canHandle returns true for HITL blocks | ✅ SATISFIED | `human-in-the-loop-handler.test.ts:83-85` — `@ana A013`, asserts canHandle toBe `true` |
| A014 | HITL handler test: canHandle returns false for non-HITL blocks | ✅ SATISFIED | `human-in-the-loop-handler.test.ts:88-94` — `@ana A014`, asserts canHandle toBe `false` |
| A015 | HITL handler test: successful execution with human operation | ✅ SATISFIED | `human-in-the-loop-handler.test.ts:97-115` — `@ana A015`, asserts `result.response.status` toBe `200`, checks operation, responseStructure, inputFormat, submission, pauseKind |
| A016 | Malformed JSON input to HITL handler falls back to original string | ✅ SATISFIED | `human-in-the-loop-handler.test.ts:118-130` — `@ana A016`, asserts `result.response.data` toBe `'{invalid json}'` (stronger than contract's `exists` matcher) |
| A017 | HITL handler returns error object on execution failure | ✅ SATISFIED | `human-in-the-loop-handler.test.ts:145-162` — `@ana A017`, mocks `mapNodeMetadataToPauseScopes` to throw, asserts `result.response.status` toBe `500` |
| A018 | Router handles provider errors with non-JSON error response | ✅ SATISFIED | `router-handler.test.ts:236-250` — `@ana A018`, mocks fetch with `{ ok: false, status: 502, json: () => Promise.reject() }`, asserts thrown message contains `'Provider API request failed with status 502'` |
| A019 | Router V2 handles provider errors with non-JSON error response | ✅ SATISFIED | `router-handler.test.ts:593-612` — `@ana A019`, mocks fetch with `{ ok: false, status: 503, json: () => Promise.reject() }`, asserts thrown message contains `'Provider API request failed with status 503'` |
| A020 | Router V2 treats invalid JSON routes as empty and rejects | ✅ SATISFIED | `router-handler.test.ts:615-626` — `@ana A020`, passes `'{invalid json routes'` as routes, asserts thrown message contains `'No routes defined for router'` |
| A021 | API handler keeps original body string when JSON-like input fails to parse | ✅ SATISFIED | `api-handler.test.ts:199-212` — `@ana A021`, passes body `'{invalid json body'`, asserts executeTool called with `body: '{invalid json body'` via objectContaining |
| A022 | Generic handler keeps original string when JSON field cannot be parsed | ✅ SATISFIED | `generic-handler.test.ts:150-182` — `@ana A022`, mocks getBlock with `inputs: { data: { type: 'json' } }`, passes `'{not valid json'`, asserts executeTool called with `data: '{not valid json'` |
| A023 | All existing tests continue to pass | ✅ SATISFIED | `bun vitest run executor/handlers` — 171 tests passed across 12 suites. 3 suites failed with pre-existing PostCSS error (not introduced by this build). |
| A024 | Linter reports no new warnings | ✅ SATISFIED | `bun run lint` — "Checked 7678 files in 2s. No fixes applied." |

## Independent Findings

**Prediction resolution:**

1. **"Builder probably left a bare JSON.parse somewhere"** — Not found. Grep across all 5 target files confirmed zero bare `JSON.parse`. Clean sweep.
2. **"`toError` import probably still there in generic-handler"** — Not found. Import was properly removed — `toError` does not appear in the file.
3. **"HITL handler test probably has weak assertions on malformed JSON"** — Partially confirmed. The test (A016) asserts the specific value `'{invalid json}'` which is good, but the contract itself uses the weak `exists` matcher instead of `equals`. The test is stronger than the contract requires.
4. **"Router parseRoutes probably still has old try-catch wrapper"** — Not found. `parseRoutes` at lines 374-384 is clean: `parseJSON(input, [])` + array check + logging. No redundant try-catch.
5. **"New test files probably miss mocking a dependency"** — Not found. Both new test files pass. HITL test properly mocks `@/lib/core/utils/urls`, `@/executor/human-in-the-loop/utils`, `@/executor/utils/builder-data`, and `@/executor/utils/block-data`.

**Production risk resolution:**
- Router `logger.warn` at lines 123/274 logs `{ error }` — the error is a SyntaxError from `JSON.parse` failure, not the response body content. No PII risk from the error object itself, though worth monitoring.
- Generic-handler lost its `logger.warn` on field parse failure (prediction confirmed as observation). The field retains its original value, so data isn't lost — but there's now zero signal when a field that looks like JSON can't parse. The spec explicitly acknowledged this tradeoff.

**Over-building check:**
- No extra functions, exports, parameters, or code paths beyond what the spec requires.
- No YAGNI violations — all new imports are used, no unused exports.
- The catch-all blocks in response-handler (line 41) and HITL handler (line 236) were correctly left untouched per the spec constraint.

## AC Walkthrough

- [x] **AC1: No bare JSON.parse in handler files** — ✅ PASS. Grep confirmed zero `JSON.parse` in all 5 target files. All use `parseJSON` or `parseJSONOrThrow` from `@/executor/utils/json`.
- [x] **AC2: No empty catch blocks in handler files** — ✅ PASS. Multiline grep for `catch\s*\([^)]*\)\s*\{\s*\}` found zero matches in handler source files. Router handler catches at lines 122-124 and 273-275 now have `logger.warn`.
- [x] **AC3: response-handler.test.ts exists with required coverage** — ✅ PASS. File exists with 9 tests: canHandle (positive/negative), structured data mode, JSON data mode, object data mode, malformed JSON (fallback), default status, default data, catch-all error path.
- [x] **AC4: human-in-the-loop-handler.test.ts exists with required coverage** — ✅ PASS. File exists with 7 tests: canHandle (positive/negative), human operation execution, malformed JSON in API mode, valid JSON in API mode, catch-all error path, resume links.
- [x] **AC5: router-handler.test.ts has new test cases** — ✅ PASS. Three new tests added: `@ana A018` (legacy non-JSON error), `@ana A019` (V2 non-JSON error), `@ana A020` (invalid JSON routes string).
- [x] **AC6: api-handler.test.ts has malformed body test** — ✅ PASS. Test `@ana A021` at line 199 passes body `'{invalid json body'` and verifies tool receives original string.
- [x] **AC7: generic-handler.test.ts has malformed json field test** — ✅ PASS. Test `@ana A022` at line 150 mocks block config with `inputs: { data: { type: 'json' } }`, passes `'{not valid json'`, verifies tool receives original string.
- [x] **AC8: All existing tests continue to pass** — ✅ PASS. 171 handler tests passed. 3 pre-existing failures (PostCSS config issue in agent-handler, function-handler, workflow-handler) are unrelated.
- [x] **AC9: Lint passes** — ✅ PASS. "Checked 7678 files in 2s. No fixes applied."

## Blockers

No blockers. All 24 contract assertions satisfied, all 9 ACs pass, no regressions. Checked for: unused exports in new code (none — no new exports added), unused parameters in modified functions (none), unhandled error paths (all catches either log, return error objects, or re-throw), external assumptions that could differ (none — changes are internal to parsing logic), spec gaps requiring implementation decisions (none — spec was precise about each change).

## Findings

- **Code — Removed logging on JSON parse failure in generic-handler field processing:** `apps/sim/executor/handlers/generic/generic-handler.ts:48` — The old code had `logger.warn('Failed to parse JSON field...')` with `toError(error)`. Now `parseJSON(value, value)` handles failures silently. The field retains its original string value either way, so behavior is identical. But a field that looks like JSON (`{something}`) but isn't will now produce zero log signal. The spec explicitly accepted this tradeoff. Severity: observation.

- **Upstream — Contract A016 uses weak `exists` matcher:** Contract assertion A016 specifies `matcher: exists` for HITL malformed JSON fallback, while sibling assertion A011 (response-handler) correctly uses `matcher: equals, value: {invalid json}`. The builder's test is stronger than the contract requires — it asserts the specific value. On next contract revision, A016 should use `equals` with the expected fallback value. Severity: observation.

- **Code — Bare `JSON.parse` remains in 5 non-target handler files:** `apps/sim/executor/handlers/shared/response-format.ts` (3 calls), `apps/sim/executor/handlers/mothership/mothership-handler.ts` (1 call), `apps/sim/executor/handlers/agent/agent-handler.ts` (1 call), `apps/sim/executor/handlers/variables/variables-handler.ts` (1 call), `apps/sim/executor/handlers/condition/condition-handler.ts` (1 call). These are out of scope for this build but represent incomplete migration. Severity: debt.

- **Test — response-handler.test.ts uses dynamic import to access mock mid-test:** `apps/sim/executor/handlers/response/response-handler.test.ts:133` — `const { convertBuilderDataToJson } = await import('@/executor/utils/builder-data')` is used to access the already-mocked module and change its behavior for the error test. This isn't the forbidden `vi.resetModules() + vi.doMock()` anti-pattern — it's accessing an existing mock. But the pattern could confuse future developers who see `await import()` and think it's the slow pattern. An alternative would be extracting the mock function via `vi.mocked()` at the top level. Severity: observation.

- **Code — Router logger.warn logs error object on parse failure:** `apps/sim/executor/handlers/router/router-handler.ts:123` and `:274` — `logger.warn('Failed to parse error response body', { error })` logs the SyntaxError from the failed JSON parse. The error object contains the parse error message, not the response body content, so PII risk is low. Worth monitoring in production log review. Severity: observation.

## Deployer Handoff

Minimal-risk change. All modifications are internal to the executor's JSON parsing pipeline — no API surface changes, no database changes, no new dependencies. The only observable behavior change is that router handler empty catches now emit `logger.warn` entries when provider error responses can't be parsed as JSON. All other changes are implementation-level (swapping `JSON.parse` for `parseJSON`/`parseJSONOrThrow`) with identical happy-path and fallback behavior. Pre-existing test failures in agent-handler, function-handler, and workflow-handler are caused by a PostCSS/Tailwind configuration issue unrelated to this PR.

## Verdict
**Shippable:** YES

All 24 contract assertions satisfied. All 9 acceptance criteria pass. No regressions. The changes are focused, minimal, and follow the existing project patterns for JSON parsing utilities. Five findings documented — all observations or debt, none blocking. The remaining bare `JSON.parse` calls in other handler files are out of scope and documented for future work.
