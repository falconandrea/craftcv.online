"use client";

/**
 * Personal Information Form Component
 *
 * Form for editing personal information section of the CV.
 * Uses controlled inputs connected to Zustand store.
 */

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState, KeyboardEvent } from "react";
import { ensureHttpDestination } from "@/lib/url";

export function PersonalInfoForm() {
  const { personalInfo, setPersonalInfo } = useCVStore();
  const [newLink, setNewLink] = useState("");

  // `?? ""` keeps inputs controlled for legacy persisted state hydrated
  // before the phone/timezone keys existed.
  const handleChange = (field: keyof typeof personalInfo, value: string) => {
    setPersonalInfo({
      ...personalInfo,
      [field]: value,
    });
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...personalInfo.links];
    newLinks[index] = value;
    setPersonalInfo({
      ...personalInfo,
      links: newLinks,
    });
  };

  // Normalize to an absolute destination on blur only — never mid-typing.
  const handleLinkBlur = (index: number) => {
    const current = personalInfo.links[index] ?? "";
    const normalized = ensureHttpDestination(current);
    if (normalized !== current) {
      const newLinks = [...personalInfo.links];
      newLinks[index] = normalized;
      setPersonalInfo({
        ...personalInfo,
        links: newLinks,
      });
    }
  };

  const handleRemoveLink = (index: number) => {
    setPersonalInfo({
      ...personalInfo,
      links: personalInfo.links.filter((_, i) => i !== index),
    });
  };

  const handleAddLink = () => {
    const trimmedLink = newLink.trim();
    if (trimmedLink) {
      setPersonalInfo({
        ...personalInfo,
        links: [...personalInfo.links, ensureHttpDestination(trimmedLink)],
      });
      setNewLink("");
    }
  };

  const handleLinkKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={personalInfo.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="John Doe"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={personalInfo.location}
          onChange={(e) => handleChange("location", e.target.value)}
          placeholder="Rome, Italy"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={personalInfo.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="john@example.com"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={personalInfo.phone ?? ""}
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="+39 333 123 4567"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-zinc-500">
          International prefix recommended (e.g. +39)
        </p>
      </div>

      <div>
        <Label htmlFor="timezone">Timezone (optional)</Label>
        <Input
          id="timezone"
          value={personalInfo.timezone ?? ""}
          onChange={(e) => handleChange("timezone", e.target.value)}
          placeholder="CET (UTC+1)"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Manual label — useful for remote roles, e.g. CET (UTC+1)
        </p>
      </div>

      <div>
        <Label>Links (GitHub, LinkedIn, Portfolio, etc.)</Label>
        <div className="mt-1 space-y-2">
          {personalInfo.links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => handleLinkChange(index, e.target.value)}
                onBlur={() => handleLinkBlur(index)}
                placeholder="https://github.com/username"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleRemoveLink(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder="https://github.com/username"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddLink}
              disabled={!newLink.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
