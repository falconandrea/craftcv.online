// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { markEditorStarted, trackAnalyticsEvent } from "@/lib/analytics";

afterEach(() => {
  window.sessionStorage.clear();
  window.dataLayer = [];
});

describe("analytics event tracking", () => {
  it("pushes only the named event and its categorical parameters", () => {
    trackAnalyticsEvent({
      name: "ats_analysis_completed",
      ai_status: "unavailable",
      job_description_used: true,
    });

    expect(window.dataLayer).toEqual([
      {
        event: "ats_analysis_completed",
        ai_status: "unavailable",
        job_description_used: true,
      },
    ]);
  });

  it("emits editor_started only once per browser-tab session", () => {
    markEditorStarted();
    markEditorStarted();

    expect(window.dataLayer).toEqual([{ event: "editor_started" }]);
  });
});
