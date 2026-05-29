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
- Prompts live inline with their handlers — each block handler constructs prompts with the relevant context (tool schema, user input, block config). This is intentional; prompts are tightly coupled to handler logic. Don't centralize them into a separate directory.
- Validate all LLM output with a schema before using it in business logic. Use `generateObject()` or `response_format: { type: "json_object" }` for structured data extraction. Never regex-parse free-text LLM responses — the format changes between runs.

## Rules
- All LLM calls through centralized provider wrappers in `providers/`. Each provider has a `core.ts` with client config, retry (`maxRetries`), and error handling. Don't create ad-hoc SDK clients.
- Never interpolate raw user input into system prompts. User content goes in user messages with clear role boundaries. System instructions stay immutable.
- Treat all LLM output as untrusted. Validate and sanitize before using in database queries, HTML rendering, or business logic.
- Handle LLM errors by type: retry rate limits with backoff, truncate input for context overflow, log content filter triggers, fail gracefully for API outages.
- Use structured output: native if the model supports it (`supportsNativeStructuredOutputs`), else inject schema into system prompt via `generateSchemaInstructions()`. Never regex-parse free-text LLM responses.
- Prompts live inline with handlers — each handler constructs its prompt with relevant context. Don't centralize prompts into a separate directory. Copilot/Mothership prompts are the exception — those live on the external service (`copilot.sim.ai`), not in this repo.
- Model capabilities vary: check `supportsAdaptiveThinking()` before setting thinking params. Opus 4.8/4.7 use adaptive thinking; Opus 4.6/Sonnet 4.6 support both modes; Opus 4.5 uses `budget_tokens`.
- The model catalog in `providers/models.ts` (84KB) tracks pricing, capabilities, and context windows for all providers. Use it for provider/model selection — don't hardcode model names.
- Log model, token count, and latency per LLM call. You can't optimize cost or debug quality without knowing what each request consumed.

## Gotchas
- Anthropic SDK supports `maxRetries` in the client constructor. Configure it to handle transient rate limits automatically instead of building custom retry logic.
- OpenAI SDK supports `maxRetries` in the client constructor. Use `response_format: { type: 'json_object' }` for structured output instead of parsing free text.

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
