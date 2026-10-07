import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { defaultCVState, type AiMessage } from "@/state/types";
import type { GroundingReport } from "@/lib/ai/grounding/types";
import { ChatMessage } from "./ChatMessage";

const { buttons, setOpen } = vi.hoisted(() => ({
  buttons: [] as Array<{ label: string; onClick?: () => void }>, setOpen: vi.fn(),
}));
vi.mock("react", async importOriginal => {
  const original = await importOriginal<typeof import("react")>();
  return { ...original, useState: (initial: unknown) => [initial, setOpen] };
});
vi.mock("@/state/store", () => ({ useCVStore: () => defaultCVState }));
vi.mock("./AiDiffModal", () => ({ AiDiffModal: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
  buttons.push({ label: renderToStaticMarkup(React.createElement("span", null, children)), onClick });
  return React.createElement("button", null, children);
} }));
beforeEach(() => { vi.stubGlobal("React", React); buttons.length = 0; setOpen.mockClear(); });
afterEach(() => { vi.unstubAllGlobals(); });

const cleanReport: GroundingReport = {
  appliedCount: 1, flaggedInventions: [], needsVerification: [], rejectedVerifiedEdits: [], styleWarnings: [],
};
const baseMessage: AiMessage = {
  id: "proposal", role: "assistant", content: "Suggested rewrite", changeStatus: "pending",
  proposedChanges: { summary: "Backend engineer." },
};
function renderAndApply(report?: GroundingReport) {
  const onApply = vi.fn();
  renderToStaticMarkup(React.createElement(ChatMessage, { message: { ...baseMessage, groundingReport: report }, onApply }));
  const action = buttons.find(button => /APPLY|REVIEW/.test(button.label));
  expect(action).toBeDefined();
  action?.onClick?.();
  return onApply;
}

describe("ChatMessage apply/review actions", () => {
  it("applies clean proposals directly", () => {
    expect(renderAndApply(cleanReport)).toHaveBeenCalledWith(baseMessage.proposedChanges);
    expect(setOpen).not.toHaveBeenCalled();
  });
  it("preserves direct apply for legacy responses with no report", () => {
    expect(renderAndApply()).toHaveBeenCalledWith(baseMessage.proposedChanges);
  });
  it.each([
    { ...cleanReport, flaggedInventions: [{ term: "Kubernetes", category: "skill", message: "Unsupported" }] },
    { ...cleanReport, needsVerification: [{ original: null, proposed: "40%", message: "Verify" }] },
    { ...cleanReport, rejectedVerifiedEdits: [{ fact: { value: "2020", type: "temporal" as const, sourcePath: "experience[0].startDate" }, proposed: "2019", message: "Protected" }] },
    { ...cleanReport, styleWarnings: [{ original: "Built", proposed: "Responsible for", message: "Review opener" }] },
  ])("opens review without applying when grounding flags exist: %j", report => {
    expect(renderAndApply(report)).not.toHaveBeenCalled();
    expect(setOpen).toHaveBeenCalledWith(true);
  });
  it("shows an actionable warning and no apply actions for a failed validation, even if a patch is present", () => {
    const onApply = vi.fn();
    const html = renderToStaticMarkup(React.createElement(ChatMessage, {
      message: { ...baseMessage, groundingStatus: "failed" }, onApply,
    }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Review the advice manually or retry.");
    expect(buttons).toHaveLength(0);
    expect(onApply).not.toHaveBeenCalled();
  });

});
