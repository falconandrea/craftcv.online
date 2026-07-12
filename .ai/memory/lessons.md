# Lessons Learned

> **PURPOSE**: Document mistakes, bugs, and their solutions so AI never repeats them.

> **CRITICAL**: AI must read this file at session start and check it before making changes.

---

## 📚 Lessons Log

- [2026-03-15] [Deployment/Dependencies] DOMMatrix reference error in pdf-parse in Docker production — Node 20 lacks DOMMatrix and Next.js standalone output strips dynamic imports. Fixed by upgrading to Node 22, installing @napi-rs/canvas, and explicitly COPY-ing @napi-rs, pdf-parse, and pdfjs-dist into the Docker image. Refs: [Dockerfile](../../Dockerfile), [package.json](../../package.json)
- [2026-02-26] [AI Integration] AI returned false-positive "changes" identical to current CV data — system prompt schema encouraged full-object returns and frontend lacked deep equality check. Fixed by instructing the LLM to emit only modified fields and adding a getEffectivePatch filter in the UI. Refs: [route.ts](../../app/api/ai/optimize/route.ts), [ChatMessage.tsx](../../components/ai/ChatMessage.tsx)
