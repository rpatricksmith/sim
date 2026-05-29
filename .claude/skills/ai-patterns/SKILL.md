---
name: ai-patterns
description: "Invoke when building features that call LLM APIs, handling AI responses, managing prompts, or integrating AI SDKs. Contains error handling, security, prompt management, and observability patterns."
---

# AI Patterns

## Detected
- AI SDK: Anthropic
- Also detected: OpenAI, Groq

### Library Rules
- Handle Anthropic API errors explicitly: rate limits (429) need exponential backoff, overloaded (529) needs retry with delay, auth errors (401) need immediate fail. The SDK retries automatically on 429/529 — configure `maxRetries` rather than wrapping in retry logic.
- Centralize prompt templates in dedicated files, not inline in handler code. Prompts are configuration — they change independently of logic, need review, and benefit from version control visibility.
- Validate all LLM output with a schema before using it in business logic. Use `generateObject()` or `response_format: { type: "json_object" }` for structured data extraction. Never regex-parse free-text LLM responses — the format changes between runs.

## Rules
- All LLM calls through a centralized client wrapper. Configure retry, timeout, and error handling once — not per-call.
- Never interpolate raw user input into system prompts. User content goes in user messages with clear role boundaries. System instructions stay immutable.
- Treat all LLM output as untrusted. Validate and sanitize before using in database queries, HTML rendering, or business logic.
- Handle LLM errors by type: retry rate limits with backoff, truncate input for context overflow, log content filter triggers, fail gracefully for API outages.
- Use structured output (JSON mode, tool_use) for data extraction. Never regex-parse free-text LLM responses for application data.
- Centralize prompt templates — don't scatter prompt strings across business logic. Prompts should be versionable, testable, and reviewable independently.
- Log model, token count, and latency per LLM call. You can't optimize cost or debug quality without knowing what each request consumed.

## Gotchas
- Anthropic SDK supports `maxRetries` in the client constructor. Configure it to handle transient rate limits automatically instead of building custom retry logic.
- OpenAI SDK supports `maxRetries` in the client constructor. Use `response_format: { type: 'json_object' }` for structured output instead of parsing free text.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
