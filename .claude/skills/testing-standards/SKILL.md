---
name: testing-standards
description: "Invoke when writing tests, reviewing test quality, or setting up test infrastructure. Contains project-specific testing framework conventions, fixture patterns, and coverage expectations."
---

# Testing Standards

## Detected
- Framework: Vitest, Testing Library (481 test files)
- Test command: bun run test -- --run
- Testing patterns: vitest
- Test location: co-located with source

### Library Rules
- Always pass `--run` flag when invoking Vitest in CI or non-interactive contexts. Vitest defaults to watch mode, which hangs pipelines waiting for input.

## Rules
- Test behavior, not implementation. Assert on what the code returns or produces — not which internal functions it calls. Tests should survive refactoring when behavior is unchanged.
- Prefer real implementations over mocks. Mock only what you can't control: network calls, time, randomness. Every mock is a lie about how the system actually behaves.
- Cover the error path, not just the happy path. For each feature test, write at least one test for invalid input, missing data, or service failure.
- Assert on specific expected values from real inputs. `expect(status).toBe(200)` not `expect(status).toBeDefined()`. A test that passes regardless of whether the feature works catches nothing. Never write tautological tests — `expect(true).toBe(true)` proves nothing. If you can't determine the specific expected value, read the contract's `matcher`/`value` fields before falling back to a weak assertion.
- Never weaken a test to make it pass. If a test fails, fix the code or fix the expectation — never broaden assertions or catch exceptions to force green.
- Use `vi.hoisted()` + `vi.mock()` + static imports. NEVER use `vi.resetModules()` + `vi.doMock()` + dynamic `await import()` — it causes tests to hang and is significantly slower.
- Use centralized mocks from `@sim/testing`: `createMockRequest`, `authMock`, `dbChainMock`. Only use `vi.hoisted()` for mocking modules not covered by `@sim/testing`.
- Mock heavy deps not under test: `@/blocks`, `@/tools/registry`, `@/triggers`. These are large registries that slow test startup.
- Default to `@vitest-environment node`. Only use `jsdom` when the test needs `window`, `document`, or DOM APIs. Node environment is significantly faster.
- NEVER use `mockAuth()`, `mockConsoleLogger()`, `setupCommonApiMocks()` from `@sim/testing` — they use `vi.doMock()` internally.
- `beforeEach(() => vi.clearAllMocks())` for test isolation. Don't use redundant `afterEach` cleanup.

## Gotchas
- Vitest defaults to watch mode. Always pass `--run` in CI and non-interactive environments (e.g., `pnpm run test -- --run`).

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
