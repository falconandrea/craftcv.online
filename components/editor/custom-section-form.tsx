"use client";

/**
 * Custom Section Form Component
 *
 * Form for editing a custom free-text section with an editable title.
 * Default title: "Interests". The section is hidden in the PDF when content is empty.
 */

import { useCVStore } from "@/state/store";
import { markEditorStarted } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function CustomSectionForm() {
  const { customSection, setCustomSection } = useCVStore();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="custom-section-title">Section Title</Label>
        <Input
          id="custom-section-title"
          value={customSection.title}
          onChange={(e) => {
            markEditorStarted();
            setCustomSection({ ...customSection, title: e.target.value });
          }}
          placeholder="Interests"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-section-content">Content</Label>
        <Textarea
          id="custom-section-content"
          value={customSection.content}
          onChange={(e) => {
            markEditorStarted();
            setCustomSection({ ...customSection, content: e.target.value });
          }}
          placeholder="Enter your content here... (leave empty to hide this section from the PDF)"
          rows={5}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          This section will only appear in the PDF if the content is not empty.
        </p>
      </div>
    </div>
  );
}
