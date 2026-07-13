"use client";

/**
 * JSON Handler Utility
 *
 * Handles JSON export and import functionality for CV data.
 * Validates imported data structure against CV schema.
 */

import type { CVState } from "@/state/types";

/**
 * Validate imported data structure
 *
 * @param data - The data to validate
 * @returns true if valid, false otherwise
 */
function validateCVData(data: unknown): data is CVState {
  if (!data || typeof data !== "object") {
    return false;
  }

  const cvData = data as Partial<CVState>;

  // Check required top-level properties
  if (
    typeof cvData.personalInfo !== "object" ||
    typeof cvData.summary !== "string" ||
    !Array.isArray(cvData.experience) ||
    !Array.isArray(cvData.skills) ||
    !Array.isArray(cvData.certifications) ||
    !Array.isArray(cvData.projects) ||
    !Array.isArray(cvData.education)
  ) {
    return false;
  }

  // Validate personalInfo structure
  if (
    typeof cvData.personalInfo?.fullName !== "string" ||
    typeof cvData.personalInfo?.location !== "string" ||
    typeof cvData.personalInfo?.email !== "string" ||
    !Array.isArray(cvData.personalInfo?.links)
  ) {
    return false;
  }

  return true;
}

/**
 * Clean text by normalizing line breaks
 * Replaces literal \n with actual line breaks and removes extra whitespace
 */
function cleanTextForJSON(text: string): string {
  return text
    .replace(/\\n/g, "\n") // Replace literal \n with actual line breaks
    .replace(/\n\s*\n/g, "\n") // Remove empty lines
    .trim();
}

/**
 * Export CV data as JSON file
 *
 * @param cv - The CV state to export
 * @param filename - Optional filename (defaults to "cv-data.json")
 */
export function exportCVAsJSON(
  cv: CVState,
  filename: string = "cv-data.json",
): void {
  try {
    // Clean text fields before exporting
    const cleanedCV = {
      ...cv,
      personalInfo: {
        ...cv.personalInfo,
        fullName: cleanTextForJSON(cv.personalInfo.fullName),
        location: cleanTextForJSON(cv.personalInfo.location),
        email: cleanTextForJSON(cv.personalInfo.email),
        links: cv.personalInfo.links.map((link) => cleanTextForJSON(link)),
      },
      summary: cleanTextForJSON(cv.summary),
      experience: cv.experience.map((entry) => ({
        ...entry,
        company: cleanTextForJSON(entry.company),
        role: cleanTextForJSON(entry.role),
        location: entry.location ? cleanTextForJSON(entry.location) : undefined,
        description: cleanTextForJSON(entry.description),
        tldr: entry.tldr ? cleanTextForJSON(entry.tldr) : undefined,
      })),
      skills: cv.skills.map((skill) => cleanTextForJSON(skill)),
      certifications: cv.certifications.map((cert) => ({
        ...cert,
        title: cleanTextForJSON(cert.title),
        issuer: cleanTextForJSON(cert.issuer),
        year: cert.year ? cleanTextForJSON(cert.year) : undefined,
      })),
      projects: cv.projects.map((project) => ({
        ...project,
        name: cleanTextForJSON(project.name),
        role: cleanTextForJSON(project.role),
        link: cleanTextForJSON(project.link),
        description: cleanTextForJSON(project.description),
        tldr: project.tldr ? cleanTextForJSON(project.tldr) : undefined,
      })),
      education: cv.education.map((edu) => ({
        ...edu,
        degree: cleanTextForJSON(edu.degree),
        institution: cleanTextForJSON(edu.institution),
        location: cleanTextForJSON(edu.location),
        year: cleanTextForJSON(edu.year),
      })),
      cvLanguage: cv.cvLanguage || "en",
    };

    // Convert CV data to JSON string
    const jsonString = JSON.stringify(cleanedCV, null, 2);

    // Create a blob
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export CV as JSON:", error);
    throw new Error("Failed to export CV data. Please try again.");
  }
}

/**
 * Import CV data from JSON file
 *
 * @param file - The JSON file to import
 * @param setCVData - Function to update CV state
 */
export async function importCVFromJSON(
  file: File,
  setCVData: (data: CVState) => void,
): Promise<void> {
  try {
    // Read file as text
    const text = await file.text();

    // Parse JSON
    const data = JSON.parse(text);

    // Validate data structure
    if (!validateCVData(data)) {
      throw new Error(
        "Invalid CV data structure. Please ensure the file is a valid CV export.",
      );
    }

    // Update CV state
    setCVData(data);
  } catch (error) {
    console.error("Failed to import CV from JSON:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON file. Please check the file format.");
    }
    throw error;
  }
}
