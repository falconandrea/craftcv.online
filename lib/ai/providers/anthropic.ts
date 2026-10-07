import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "./types";

export function createAnthropicProvider(config: {
  apiKey: string; model: string;
}): AiProvider {
  const client = new Anthropic({ apiKey: config.apiKey });
  return {
    name: "anthropic",
    async generate({ system, messages, maxOutputTokens }) {
      // Leave thinking at the model default; never send sampling or prefill.
      const response = await client.messages.create({
        model: config.model, system, messages, max_tokens: maxOutputTokens,
      });
      const text = response.content
        .filter(block => block.type === "text")
        .map(block => block.text).join("\n");
      return {
        text, inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        complete: response.stop_reason === "end_turn" && !!text.trim(),
        refused: response.stop_reason === "refusal",
        stopReason: response.stop_reason ?? "missing_stop_reason",
      };
    },
  };
}
