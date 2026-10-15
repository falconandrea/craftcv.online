// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { SettingsDialog } from "./settings-dialog";
import { useCVStore } from "@/state/store";

interface SelectDoubleProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
  }>({ value: "", onValueChange: () => {} });

  const Select = ({ value = "", onValueChange, children }: SelectDoubleProps) =>
    React.createElement(
      SelectContext.Provider,
      { value: { value, onValueChange: onValueChange ?? (() => {}) } },
      children,
    );

  const SelectTrigger = ({ children }: SelectDoubleProps) =>
    React.createElement(React.Fragment, null, children);

  const SelectValue = () =>
    React.createElement(
      SelectContext.Consumer,
      null,
      (ctx: { value: string }) =>
        React.createElement(
          "span",
          { "data-testid": "draft-language-value" },
          ctx.value,
        ),
    );

  const SelectContent = ({ children }: SelectDoubleProps) =>
    React.createElement(
      SelectContext.Consumer,
      null,
      (ctx: { value: string; onValueChange: (value: string) => void }) =>
        React.createElement(
          "select",
          {
            "data-testid": "draft-language",
            value: ctx.value,
            onChange: (event: { target: { value: string } }) =>
              ctx.onValueChange(event.target.value),
          },
          children,
        ),
    );

  const SelectItem = ({ value = "", children }: SelectDoubleProps) =>
    React.createElement("option", { value }, children);

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

function ToolbarHarness() {
  const [open, setOpen] = React.useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { onClick: () => setOpen(true) }, "SETTINGS"),
    React.createElement(SettingsDialog, { open, onOpenChange: setOpen }),
  );
}

function openFromToolbar() {
  fireEvent.click(screen.getByRole("button", { name: "SETTINGS" }));
}

function draftValue(): string {
  const select = screen.getByTestId("draft-language") as HTMLSelectElement;
  return select.value;
}

function changeDraftTo(language: string) {
  fireEvent.change(screen.getByTestId("draft-language"), {
    target: { value: language },
  });
}

function expectDialog(open: boolean) {
  const dialog = screen.queryByRole("dialog");
  expect(!!dialog).toBe(open);
}

beforeEach(() => {
  useCVStore.setState({ cvLanguage: "it" });
  window.sessionStorage.clear();
  window.dataLayer = [];
});

afterEach(() => {
  cleanup();
});

describe("SettingsDialog open/discard/save flow (toolbar wiring)", () => {
  it("seeds the draft from the current store language on every parent-driven open", () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    expectDialog(true);
    expect(draftValue()).toBe("it");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expectDialog(false);

    useCVStore.setState({ cvLanguage: "en" });
    openFromToolbar();
    expectDialog(true);
    expect(draftValue()).toBe("en");
  });

  it("Cancel discards the draft and reopening shows the saved language", () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    changeDraftTo("en");
    expect(draftValue()).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expectDialog(false);
    expect(useCVStore.getState().cvLanguage).toBe("it");

    openFromToolbar();
    expect(draftValue()).toBe("it");
  });

  it("Escape discards the draft and reopening shows the saved language", () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    changeDraftTo("en");

    fireEvent.keyDown(document, { key: "Escape" });
    expectDialog(false);
    expect(useCVStore.getState().cvLanguage).toBe("it");

    openFromToolbar();
    expect(draftValue()).toBe("it");
  });

  it("outside pointerdown discards the draft and reopening shows the saved language", async () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    changeDraftTo("en");
    // Radix registers its outside-pointerdown listener in a setTimeout(0)
    // after the layer mounts, so wait one macrotask before dismissing.
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.pointerDown(document.body);
    expectDialog(false);
    expect(useCVStore.getState().cvLanguage).toBe("it");

    openFromToolbar();
    expect(draftValue()).toBe("it");
  });

  it("Save commits the draft to the store and reopening shows the saved language", () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    changeDraftTo("en");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expectDialog(false);
    expect(useCVStore.getState().cvLanguage).toBe("en");
    expect(window.dataLayer).toEqual([{ event: "editor_started" }]);

    openFromToolbar();
    expect(draftValue()).toBe("en");
  });

  it("Save does not count an unchanged language as an editor modification", () => {
    render(React.createElement(ToolbarHarness));

    openFromToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(useCVStore.getState().cvLanguage).toBe("it");
    expect(window.dataLayer).toEqual([]);
  });
});
