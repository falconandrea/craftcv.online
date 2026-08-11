import React from "react";
/**
 * CV Document Component
 *
 * Generates an ATS-optimized PDF from CV state using @react-pdf/renderer.
 * Matches preview layout for consistency.
 *
 * ATS Rules (from the authoring section of ATS_RULES.md — the lint engine
 * section further down that doc documents lib/ats-rules.ts, not this file):
 * - No tables, columns, icons, images
 * - Clear section headers
 * - Consistent date formats
 * - Simple bullet points
 * - Left-aligned text
 *
 * PDF Requirements (from ROADMAP.md Phase 5 & Phase 10):
 * - Standard fonts: Helvetica (primary), Arial (fallback)
 * - Automatic page breaks
 * - Section grouping
 * - Multi-page support
 * - Enhanced typography and spacing (Phase 10)
 */

import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
  Link,
  Svg,
  Path,
} from "@react-pdf/renderer";
import type { CVState } from "@/state/types";

// Register standard fonts
Font.register({
  family: "Helvetica",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@0.0.4/dist/Roboto-Regular.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@0.0.4/dist/Roboto-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.3,
    color: "#000000",
  },
  header: {
    marginBottom: 8,
    textAlign: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  contactInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  contactItem: {
    fontSize: 9.5,
    color: "#333333",
  },
  contactSeparator: {
    fontSize: 9.5,
    color: "#999999",
    marginHorizontal: 2,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 6,
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    marginBottom: 1,
  },
  entryTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 1,
  },
  entryCompany: {
    fontSize: 9.5,
    color: "#444444",
    marginBottom: 1,
  },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  entryDate: {
    fontSize: 9.5,
    color: "#666666",
  },
  entryLocation: {
    fontSize: 9.5,
    marginBottom: 1,
    color: "#666666",
  },
  entryDescription: {
    fontSize: 9.5,
    lineHeight: 1.3,
    textAlign: "justify",
  },
  bulletList: {
    marginLeft: 0,
  },
  bulletItem: {
    fontSize: 9.5,
    marginBottom: 0,
    lineHeight: 1.3,
  },
  skillsList: {
    fontSize: 9.5,
    lineHeight: 1.3,
  },
  link: {
    color: "#000000",
    textDecoration: "none",
  },
});

interface CVDocumentProps {
  cv: CVState;
}

/**
 * Translations for PDF Section Headers and UI elements
 */
const translations = {
  en: {
    summary: "Summary",
    experience: "Experiences",
    projects: "Projects",
    education: "Education",
    languages: "Languages",
    skills: "Skills",
    certifications: "Certifications",
    interests: "Interests",
    present: "Present",
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
  },
  it: {
    summary: "Profilo",
    experience: "Esperienze Lavorative",
    projects: "Progetti",
    education: "Istruzione",
    languages: "Lingue",
    skills: "Competenze",
    certifications: "Certificazioni",
    interests: "Interessi",
    present: "Presente",
    months: [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ],
  },
};

/**
 * Format date for display based on selected language
 * Returns localized "Present" if endDate is null
 * Formats date as localized "Month Year" (e.g., "Febbraio 2020")
 */
function formatDate(date: string | null, lang: "en" | "it" = "en"): string {
  const t = translations[lang];
  if (!date) return t.present;

  // Parse date in format YYYY-MM or YYYY-MM-DD
  const [year, month] = date.split("-");

  // Remove leading zero from month
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = t.months[monthIndex] || month;

  return `${monthName} ${year}`;
}

/**
 * Clean description text by removing bullet points added by user
 * Removes "-", "•", "*" at the beginning of lines
 */
function cleanDescription(description: string): string {
  if (!description) return "";
  return description
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Clean URL by removing http:// or https://
 */
function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

// ── Contact Icons (SVG, 8×8pt, ATS-safe) ──────────────────────────────────
const IconPin = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24">
    <Path
      fill="#555555"
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
    />
  </Svg>
);

const IconEmail = () => (
  <Svg width={9} height={7} viewBox="0 0 24 18">
    <Path
      fill="#555555"
      d="M20 0H4C2.9 0 2 .9 2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V2l8 5 8-5v2z"
    />
  </Svg>
);

const IconGitHub = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24">
    <Path
      fill="#555555"
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
    />
  </Svg>
);

const IconLinkedIn = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24">
    <Path
      fill="#555555"
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    />
  </Svg>
);

function getLinkDisplay(url: string): { icon: React.ReactElement | null; text: string } {
  if (url.includes("github.com")) {
    const username = url.replace(/https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
    return { icon: <IconGitHub />, text: username };
  }
  if (url.includes("linkedin.com")) {
    const path = url.replace(/https?:\/\/(www\.)?linkedin\.com/, "").replace(/\/$/, "");
    return { icon: <IconLinkedIn />, text: path };
  }
  return { icon: null, text: cleanUrl(url) };
}

/**
 * CV Document Component
 *
 * Renders complete CV as a PDF document.
 * Uses automatic page breaks and supports multi-page output.
 * Enhanced layout with improved typography and spacing (Phase 10).
 */
export function CVDocument({ cv }: CVDocumentProps) {
  const lang = cv.cvLanguage || "en";
  const t = translations[lang];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Personal Information Section */}
        <View style={styles.header}>
          <Text style={styles.name}>{cv.personalInfo.fullName}</Text>
          <View style={styles.contactInfo}>
            {cv.personalInfo.location && (
              <View style={styles.contactInfoItem}>
                <IconPin />
                <Text style={styles.contactItem}>{cv.personalInfo.location}</Text>
              </View>
            )}
            {cv.personalInfo.location &&
              (cv.personalInfo.email || cv.personalInfo.links.length > 0) && (
                <Text style={styles.contactSeparator}>•</Text>
              )}
            {cv.personalInfo.email && (
              <View style={styles.contactInfoItem}>
                <IconEmail />
                <Text style={styles.contactItem}>{cv.personalInfo.email}</Text>
              </View>
            )}
            {cv.personalInfo.links.map((link, index) => {
              const { icon, text } = getLinkDisplay(link);
              return (
                <>
                  <Text key={`sep-${index}`} style={styles.contactSeparator}>•</Text>
                  <View key={index} style={styles.contactInfoItem}>
                    {icon}
                    <Link src={link} style={styles.contactItem}>
                      {text}
                    </Link>
                  </View>
                </>
              );
            })}
          </View>
        </View>

        {/* Summary Section */}
        {cv.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.summary}</Text>
            <Text style={styles.entryDescription}>{cv.summary}</Text>
          </View>
        )}

        {/* Divider */}
        {cv.summary && cv.experience.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Experience Section */}
        {cv.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.experience}</Text>
            {cv.experience.map((entry, index) => (
              <View
                key={index}
                style={[
                  styles.entry,
                  index === cv.experience.length - 1 ? { marginBottom: 0 } : {}
                ]}
              >
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>{entry.role}</Text>
                  <View
                    style={{ flexDirection: "row", alignItems: "baseline" }}
                  >
                    <Text style={styles.entryDate}>
                      {formatDate(entry.startDate, lang)} –{" "}
                      {formatDate(entry.endDate, lang)}
                    </Text>
                    {entry.location && (
                      <Text style={styles.entryLocation}>
                        {" "}
                        • {entry.location}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.entryCompany}>{entry.company}</Text>
                <View style={styles.bulletList}>
                  {cleanDescription(entry.description)
                    .split("\n")
                    .map((line, i) => (
                      <Text key={i} style={styles.bulletItem}>
                        • {line}
                      </Text>
                    ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        {cv.experience.length > 0 && cv.projects.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Projects Section */}
        {cv.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.projects}</Text>
            {cv.projects.map((project, index) => (
              <View
                key={index}
                style={[
                  styles.entry,
                  index === cv.projects.length - 1 ? { marginBottom: 0 } : {}
                ]}
              >
                <Text style={styles.entryTitle}>{project.name}</Text>
                <Text style={styles.entryLocation}>
                  {project.role}
                  {project.link && <Text> • {cleanUrl(project.link)}</Text>}
                </Text>
                <View style={styles.bulletList}>
                  {cleanDescription(project.description)
                    .split("\n")
                    .map((line, i) => (
                      <Text key={i} style={styles.bulletItem}>
                        • {line}
                      </Text>
                    ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        {cv.projects.length > 0 && cv.education.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Education Section */}
        {cv.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.education}</Text>
            {cv.education.map((edu, index) => (
              <View
                key={index}
                style={[
                  styles.entry,
                  index === cv.education.length - 1 ? { marginBottom: 0 } : {}
                ]}
              >
                <Text style={styles.entryTitle}>{edu.degree}</Text>
                <Text style={styles.entryDescription}>
                  {edu.institution} • {edu.location} • {edu.year}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        {cv.education.length > 0 && cv.languages.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Languages Section */}
        {cv.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.languages}</Text>
            <Text style={styles.entryDescription}>
              {cv.languages
                .map((lang) => `${lang.language} (${lang.proficiency})`)
                .join(", ")}
            </Text>
          </View>
        )}

        {/* Divider */}
        {cv.languages.length > 0 && cv.skills.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Skills Section */}
        {cv.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.skills}</Text>
            <Text style={styles.skillsList}>{cv.skills.join(", ")}</Text>
          </View>
        )}

        {/* Divider */}
        {cv.skills.length > 0 && cv.customSection?.content?.trim() && (
          <View style={styles.divider} />
        )}

        {/* Custom Section */}
        {cv.customSection?.content?.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {(!cv.customSection.title || cv.customSection.title === "Interests") ? t.interests : cv.customSection.title}
            </Text>
            <Text style={styles.entryDescription}>{cv.customSection.content}</Text>
          </View>
        )}

        {/* Divider */}
        {(cv.skills.length > 0 || cv.customSection?.content?.trim() || cv.languages.length > 0) && cv.certifications.length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Certifications Section */}
        {cv.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.certifications}</Text>
            {cv.certifications.map((cert, index) => (
              <View
                key={index}
                style={[
                  styles.entry,
                  index === cv.certifications.length - 1 ? { marginBottom: 0 } : {}
                ]}
              >
                <Text style={styles.entryTitle}>{cert.title}</Text>
                <Text style={styles.entryDescription}>
                  {cert.issuer}
                  {cert.year && ` - ${cert.year}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
