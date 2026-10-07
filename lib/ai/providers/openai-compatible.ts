import OpenAI from "openai";
import type { AiProvider } from "./types";

export function createOpenAICompatibleProvider(config: {
  apiKey: string; baseURL: string; model: string;
}): AiProvider {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return {
    name: "openai_compatible",
    async generate({ system, messages, maxOutputTokens }) {
      const response = await client.chat.completions.create({
        model: config.model, max_tokens: maxOutputTokens, temperature: 0.3,
        messages: [{ role: "system", content: system }, ...messages],
      });
      const choice = response.choices[0];
      const text = choice?.message.content ?? "";
      return {
        text, inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        complete: choice?.finish_reason === "stop" && !!text.trim() && !choice.message.refusal,
        refused: choice?.finish_reason === "content_filter" || !!choice?.message.refusal,
        stopReason: choice?.finish_reason ?? "missing_finish_reason",
      };
    },
  };
}
