export type AnalyticsEvent =
  | { name: "editor_started" }
  | { name: "resume_import_completed"; import_source: "pdf" | "json" }
  | {
      name: "ats_analysis_completed";
      ai_status: "available" | "unavailable";
      job_description_used: boolean;
    }
  | {
      name: "ai_assistance_completed";
      function_type: "editor_chat" | "experience_tldr" | "project_tldr";
    }
  | {
      name: "ai_proposal_applied";
      function_type: "editor_chat" | "experience_tldr" | "project_tldr";
    }
  | { name: "pdf_export" }
  | {
      name: "pdf_export_failed";
      failure_stage: "generation" | "download_start";
    };

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const EDITOR_STARTED_KEY = "craftcv:editor_started";
let editorStartedInMemory = false;

/** Push only typed, content-free product events to the GTM data layer. */
export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = window.dataLayer ?? [];
    const { name, ...parameters } = event;
    window.dataLayer.push({ event: name, ...parameters });
  } catch {
    // Analytics must never interrupt the user's current action.
  }
}

/** Count the first real editor change once in this browser-tab session. */
export function markEditorStarted(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.sessionStorage.getItem(EDITOR_STARTED_KEY) === "1") return;
    window.sessionStorage.setItem(EDITOR_STARTED_KEY, "1");
  } catch {
    if (editorStartedInMemory) return;
    editorStartedInMemory = true;
  }

  trackAnalyticsEvent({ name: "editor_started" });
}
