export type ProviderName = "openai_compatible" | "anthropic";

export interface GenerateInput {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxOutputTokens: number;
}

export interface GenerateResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  complete: boolean;
  refused: boolean;
  stopReason: string;
}

export interface AiProvider {
  name: ProviderName;
  generate(input: GenerateInput): Promise<GenerateResult>;
}

// Never serialize SDK errors, messages, headers, or request/response bodies.
export function safeErrorMetadata(error: unknown) {
  const status = error && typeof error === "object" && "status" in error
    && typeof error.status === "number" ? error.status : undefined;
  return { errorType: status ? "provider_api_error" : "internal_error", status };
}
