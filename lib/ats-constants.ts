/**
 * Shared limits for the ATS score flow.
 *
 * The server route enforces these on upload and the Dropzone mirrors them for
 * client-side validation (file too large, JD too long). Keeping them in one
 * place removes the "kept in sync" comment that used to live in Dropzone —
 * drift between the two was silent.
 */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_JD_CHARS = 8000;
