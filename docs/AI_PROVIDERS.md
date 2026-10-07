# AI Optimize providers

## Scope and configuration

Only `/api/ai/optimize` resolves `AI_OPTIMIZE_PROVIDER`. No UI selector is provided.
The other AI pipelines keep their existing OpenAI-compatible SDK/configuration.

| Selector | Configuration | Result |
| --- | --- | --- |
| Unset | `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_MODEL` | Legacy OpenAI-compatible path |
| `openai_compatible` | Same three variables | OpenAI-compatible path |
| `anthropic` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Native Anthropic Messages API |
| Any other value, including empty | None | HTTP 503; no fallback |

All selected-provider variables are mandatory and whitespace-only values are rejected.
`claude-sonnet-5-5` is an example model configuration, not a business-logic default.
No workspace override is implemented; use a workspace-specific API key.
No client-visible key or `NEXT_PUBLIC_` variable is introduced.

## Server architecture

`lib/ai/providers/types.ts` defines the minimal generation input/result.
`config.ts` validates deployment configuration and constructs the selected provider.
`openai-compatible.ts` retains the OpenAI SDK, custom base URL, `max_tokens: 4000`
and `temperature: 0.3`. `anthropic.ts` uses the official native SDK, top-level
`system`, user/assistant history and `max_tokens: 4000`. The route appends its JSON
reminder before calling either provider. No assistant prefill is added.

Anthropic sends no sampling or thinking parameters. Sonnet 5.5 therefore uses its
default adaptive thinking; only `text` content blocks are joined for application output.
The 4000-token budget includes output reasoning usage and may need evaluation during
live testing. There is no prompt cache configuration, advanced tool use or fallback.

The common pipeline remains context → provider → completion gate →
`parseModelResponse()` → `validatePatch()` → grounding report → existing review UI.
Only Anthropic `end_turn` or OpenAI `stop`, with nonempty text and no refusal,
passes the completion gate. All other statuses, missing text and refusals return a
safe explanatory message without a patch/report. Raw incomplete output is never parsed.
Validator exceptions preserve advice but remove patches/reports and set
`groundingStatus: failed`. Telemetry errors cannot change validation results.

Provider usage maps to the existing `ai_optimize_prompt_tokens` and
`ai_optimize_completion_tokens` counters. Anthropic output usage includes reasoning,
not just visible text. Estimates remain estimates and are not model-specific tokenizers.
Logs contain only selected provider, generic error category/numeric HTTP status or
stop reason; no SDK object, headers, request/response body, key or CV text is logged
by the Optimize route. Other AI routes' logging is outside this change's scope.

## Explicit manual live smoke test (paid)

1. Set the following in `.env.local` (never commit credentials):

   ```env
   AI_OPTIMIZE_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your-real-key
   ANTHROPIC_MODEL=claude-sonnet-5-5
   ```

2. Start a fresh local server with that configuration, or restart an existing one:

   ```bash
   npm run dev -- --port 3000
   ```

3. In another terminal, from the repository root, explicitly run:

   ```bash
   npm run smoke:optimize:anthropic
   ```

   This sends one HTTP request containing a synthetic CV through the real Optimize
   route. The SDK may retry transient failures against the same provider; no other
   provider is used. The command requires Anthropic configuration and a local URL.
   Ensure the server was started with the same configuration: the script does not
   inspect another process's environment. For a different local port:

   ```bash
   AI_SMOKE_URL=http://localhost:3100/api/ai/optimize npm run smoke:optimize:anthropic
   ```

4. Success prints `PASS` after checking a nonempty summary proposal, advice,
   grounding report and `groundingStatus=validated`. That proves the API call
   completed, model JSON was parsed and the common validator ran. Refusal,
   truncation, missing proposal or failed validation makes the command fail.

The command is not imported by any tests and is absent from CI/build hooks. Merely
setting an API key never invokes it. This is a pipeline smoke check, not a claim of
CV quality or absence of all unsupported statements; inspect the review UI and
measure latency/token usage separately before changing landing claims.

## References

- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [Sonnet 5.5 defaults and stop behavior](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5)
