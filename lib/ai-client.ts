import type { CVState } from "@/state/types";
import type { GroundingReport } from "@/lib/ai/grounding/types";
import { maskPii } from "@/lib/pii-masker";

export interface ApiMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AiOptimizeResponse {
    content: string;
    proposedChanges?: object;
    groundingReport?: GroundingReport;
    error?: string;
}

let pendingRequest: Promise<AiOptimizeResponse> | null = null;

export async function sendAiMessage(
    messages: ApiMessage[],
    cvData: CVState
): Promise<AiOptimizeResponse> {
    if (pendingRequest) {
        return pendingRequest;
    }

    const maskedCv = maskPii(cvData);

    const fetchPromise = (async () => {
        try {
            const res = await fetch("/api/ai/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, cvData: maskedCv }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { content: "", error: data.error ?? "Unknown error from AI provider." };
            }

            return data as AiOptimizeResponse;
        } finally {
            pendingRequest = null;
        }
    })();

    pendingRequest = fetchPromise;
    return fetchPromise;
}
