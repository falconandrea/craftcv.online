import { createAnthropicProvider } from "./anthropic";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { AiProvider } from "./types";

export class AiConfigurationError extends Error {}

export function resolveOptimizeProvider(env: NodeJS.ProcessEnv = process.env): AiProvider {
  const provider = env.AI_OPTIMIZE_PROVIDER ?? "openai_compatible";
  if (provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY;
    const model = env.ANTHROPIC_MODEL;
    if (!apiKey?.trim() || !model?.trim()) {
      throw new AiConfigurationError("AI Optimize is not configured. Please set ANTHROPIC_API_KEY and ANTHROPIC_MODEL.");
    }
    return createAnthropicProvider({ apiKey, model });
  }
  if (provider === "openai_compatible") {
    const baseURL = env.AI_PROVIDER_BASE_URL;
    const apiKey = env.AI_PROVIDER_API_KEY;
    const model = env.AI_PROVIDER_MODEL;
    if (!baseURL?.trim() || !apiKey?.trim() || !model?.trim()) {
      throw new AiConfigurationError("AI provider is not configured. Please set AI_PROVIDER_BASE_URL, AI_PROVIDER_API_KEY, and AI_PROVIDER_MODEL in your .env.local file.");
    }
    return createOpenAICompatibleProvider({ baseURL, apiKey, model });
  }
  throw new AiConfigurationError("Invalid AI_OPTIMIZE_PROVIDER. Use openai_compatible or anthropic.");
}
