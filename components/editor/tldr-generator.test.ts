// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TldrGenerator } from "./tldr-generator";

const fetchMock = vi.fn();

beforeEach(() => {
  window.sessionStorage.clear();
  window.dataLayer = [];
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ tldr: "Current summary" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

async function generateProposal(currentValue: string) {
  const onApply = vi.fn();
  render(React.createElement(TldrGenerator, {
    inputId: "tldr",
    value: currentValue,
    kind: "experience",
    title: "Role",
    role: "Engineer",
    description: "Built a product.",
    language: "en",
    onApply,
  }));

  fireEvent.click(screen.getByRole("button", { name: "Generate TL;DR" }));
  await screen.findByText("Suggested TL;DR");
  fireEvent.click(screen.getByRole("button", { name: "Use this TL;DR" }));

  return onApply;
}

describe("TL;DR proposal application tracking", () => {
  it("does not count a proposal identical to the current value as applied", async () => {
    const onApply = await generateProposal("Current summary");

    expect(onApply).not.toHaveBeenCalled();
    expect(window.dataLayer).not.toContainEqual(expect.objectContaining({ event: "ai_proposal_applied" }));
    expect(window.dataLayer).not.toContainEqual(expect.objectContaining({ event: "editor_started" }));
  });

  it("counts a proposal that changes the current value", async () => {
    const onApply = await generateProposal("A different summary");

    expect(onApply).toHaveBeenCalledWith("Current summary");
    expect(window.dataLayer).toContainEqual({
      event: "ai_proposal_applied",
      function_type: "experience_tldr",
    });
    expect(window.dataLayer).toContainEqual({ event: "editor_started" });
  });
});
