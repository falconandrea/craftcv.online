"use client";

/**
 * PDF Generator Utility
 *
 * Handles PDF generation and download functionality.
 * Uses @react-pdf/renderer to create ATS-optimized PDFs.
 */

import { pdf } from "@react-pdf/renderer";
import { CVDocument } from "@/components/pdf/cv-document";
import type { CVState } from "@/state/types";
import { trackAnalyticsEvent } from "@/lib/analytics";

/**
 * Generate and download the CV as a PDF file
 *
 * @param cv - The CV state to generate the PDF from
 * @param filename - Optional filename (defaults to "cv.pdf")
 */
export async function generateAndDownloadPDF(
  cv: CVState,
  filename: string = "cv.pdf",
): Promise<void> {
  let failureStage: "generation" | "download_start" = "generation";
  let url: string | undefined;
  let link: HTMLAnchorElement | undefined;

  try {
    // Create the PDF document
    const doc = <CVDocument cv={cv} />;

    // Generate the PDF blob
    const blob = await pdf(doc).toBlob();
    failureStage = "download_start";

    // Create a download link
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    trackAnalyticsEvent({ name: "pdf_export" });
  } catch (error) {
    trackAnalyticsEvent({ name: "pdf_export_failed", failure_stage: failureStage });
    console.error("Failed to generate PDF:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  } finally {
    // Cleanup failures must not turn a successfully started download into a failure event.
    try {
      link?.remove();
    } catch {
      // The download has already been initiated.
    }
    try {
      if (url) URL.revokeObjectURL(url);
    } catch {
      // The download has already been initiated.
    }
  }
}
