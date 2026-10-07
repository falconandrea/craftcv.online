// Explicit manual invocation only. Requires an already running local deployment.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
if (process.env.AI_OPTIMIZE_PROVIDER !== "anthropic" || !process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
  throw new Error("Set AI_OPTIMIZE_PROVIDER=anthropic, ANTHROPIC_API_KEY and ANTHROPIC_MODEL before starting the server and this command.");
}
const url = new URL(process.env.AI_SMOKE_URL ?? "http://localhost:3000/api/ai/optimize");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Run this smoke test against a local server configured for Anthropic.");
}
const cvData = {
  personalInfo: { fullName: "Example Engineer", email: "example@example.com", location: "London", phone: "", timezone: "", links: [] },
  summary: "Backend engineer. I build services with TypeScript and PostgreSQL.",
  experience: [], education: [], certifications: [], projects: [],
  skills: ["TypeScript", "PostgreSQL"], languages: [],
  customSection: { title: "Interests", content: "" }, cvLanguage: "en",
};
const response = await fetch(url, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cvData, messages: [{ role: "user", content: "Rewrite only my summary as one polished sentence using only the facts already present. Return a non-empty proposedChanges.summary patch and a brief message." }] }),
});
if (!response.ok) throw new Error(`Optimize returned HTTP ${response.status}`);
const result = await response.json();
if (result.groundingStatus !== "validated" || !result.proposedChanges?.summary?.trim() || !result.groundingReport || !result.content?.trim()) {
  throw new Error("Smoke test failed: expected a complete, parsed, validated summary proposal and grounding report.");
}
console.log("PASS: Anthropic connection, complete response, JSON proposal, common validator and groundingStatus=validated.");
