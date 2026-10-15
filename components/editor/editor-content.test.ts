// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCVStore } from "@/state/store";
import { EditorContent } from "./editor-content";

vi.mock("@/components/editor/personal-info-form", () => ({ PersonalInfoForm: () => null }));
vi.mock("@/components/editor/summary-form", () => ({ SummaryForm: () => null }));
vi.mock("@/components/editor/experience-form", () => ({ ExperienceForm: () => null }));
vi.mock("@/components/editor/skills-form", () => ({ SkillsForm: () => null }));
vi.mock("@/components/editor/certifications-form", () => ({ CertificationsForm: () => null }));
vi.mock("@/components/editor/projects-form", () => ({ ProjectsForm: () => null }));
vi.mock("@/components/editor/education-form", () => ({ EducationForm: () => null }));
vi.mock("@/components/editor/languages-form", () => ({ LanguagesForm: () => null }));
vi.mock("@/components/editor/custom-section-form", () => ({ CustomSectionForm: () => null }));
vi.mock("@/components/editor/EditorTopNav", () => ({ EditorTopNav: () => null }));

beforeEach(() => {
  useCVStore.getState().resetCV();
  window.sessionStorage.clear();
  window.dataLayer = [];
});

afterEach(() => {
  cleanup();
});

function renderEditorContent() {
  render(React.createElement(EditorContent, { activeTab: "personal", onTabChange: () => {} }));
  fireEvent.click(screen.getByRole("button", { name: "RESET_ALL" }));
  fireEvent.click(screen.getByRole("button", { name: "EXECUTE_RESET" }));
}

describe("editor reset tracking", () => {
  it("does not count resetting an already empty CV as an editor start", () => {
    renderEditorContent();

    expect(window.dataLayer).toEqual([]);
  });

  it("counts a reset that actually changes CV data", () => {
    useCVStore.getState().setSummary("Resume content");

    renderEditorContent();

    expect(useCVStore.getState().summary).toBe("");
    expect(window.dataLayer).toEqual([{ event: "editor_started" }]);
  });
});
