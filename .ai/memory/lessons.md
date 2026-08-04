# Lessons Learned

> **PURPOSE**: Document mistakes, bugs, and their solutions so AI never repeats them.

> **CRITICAL**: AI must read this file at session start and check it before making changes.

---

## Entry Format

Each entry must be exactly **one line** following a git-log style format. Do not write multiple paragraphs or blocks. Keep details of the fix or decisions inside PRs, Task files, or Architectural Decision Records (ADRs), and link to them.

**Concision is mandatory.** A reader should grasp the lesson in <2 seconds. If you can't fit it in one line, the lesson is too generic — narrow it or drop it.

Format:
`- [YYYY-MM-DD] [[Category]] [One-line summary of mistake and fix]. Refs: [file-name](relative/path/to/file), [PR #ID], or [ADR-name](relative/path/to/adr)`

### What NOT to log (drop these)
- Generic framework knowledge anyone can google ("eager load to avoid N+1", "use transactions for atomic writes", "type your props").
- Bugs that were typos, one-off mistakes, or already-fixed-by-tooling (caught by Pint/PHPStan/ESLint).
- Vague entries without a concrete trigger ("be careful with timestamps").
- Entries older than 12 months with no living Refs.

### Good examples
`- [2026-07-12] [Laravel] Eager load 'profile' to prevent N+1 in /users index (only happens when profile is shown in table). Refs: [tasks-user.md](.ai/features/user/tasks-user.md), [PR #45]`
`- [2026-07-10] [Next] Don't import 'lodash' in Server Components — pulls 70KB into the bundle. Refs: [PR #43]`

---

## 📚 Lessons Log

- [2026-07-14] [AI Integration] Prevent array patch summaries from reporting unchanged items by comparing each item with currentCV before rendering. Refs: [summarize-changes.ts](../../lib/ai/summarize-changes.ts), [summarize-changes.test.ts](../../lib/ai/summarize-changes.test.ts)
- [2026-07-14] [AI Integration] Prevent destructive AI patches by including every editable field in the snapshot, forbidding non-empty-to-empty changes, and stripping blanked fields server-side. Refs: [quick-reference.ts](../../lib/cv/quick-reference.ts), [route.ts](../../app/api/ai/optimize/route.ts), [validate-patch.ts](../../lib/ai/grounding/validate-patch.ts)
- [2026-07-14] [AI Integration] Avoid assistant-prefill tricks on generic OpenAI-compatible endpoints; use balanced-brace parsing to recover JSON with provider-specific garbage. Refs: [parse-model-response.ts](../../lib/ai/parse-model-response.ts), [route.ts](../../app/api/ai/optimize/route.ts)
- [2026-03-15] [Deployment/Dependencies] Fix DOMMatrix errors in production PDF parsing by upgrading to Node 22, installing @napi-rs/canvas, and explicitly copying required packages into the Docker image. Refs: [Dockerfile](../../Dockerfile), [package.json](../../package.json)
- [2026-02-26] [AI Integration] Filter no-op AI changes with getEffectivePatch after instructing the model to emit modified fields only. Refs: [route.ts](../../app/api/ai/optimize/route.ts), [ChatMessage.tsx](../../components/ai/ChatMessage.tsx)
