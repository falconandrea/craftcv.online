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
import { displayUrl, absoluteUrl } from "@/lib/url";

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
  // Separator + following item wrapped as one unit so line breaks never
  // leave an orphan bullet at the end of a row
  contactGroup: {
    flexDirection: "row",
    alignItems: "center",
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
  linksRow: {
    marginTop: 2,
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

interface PdfSection {
  key: string;
  visible: boolean;
  node: React.ReactNode;
}

/**
 * Translations for PDF Section Headers and UI elements
 */
const translations = {
  en: {
    summary: "Summary",
    experience: "Experience",
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

// ── Contact Icons (SVG, 8×8pt, ATS-safe, direct-contact row only) ──────────
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

const IconPhone = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24">
    <Path
      fill="#555555"
      d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
    />
  </Svg>
);

const IconClock = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24">
    <Path
      fill="#555555"
      d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
    />
  </Svg>
);

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

  // Direct-contact row: fixed order, compact icons, no empty placeholders
  const location = cv.personalInfo.location.trim();
  const email = cv.personalInfo.email.trim();
  const phone = (cv.personalInfo.phone ?? "").trim();
  const timezone = (cv.personalInfo.timezone ?? "").trim();
  const contactItems = [
    location && { key: "location", icon: <IconPin />, text: location },
    email && { key: "email", icon: <IconEmail />, text: email },
    phone && { key: "phone", icon: <IconPhone />, text: phone },
    timezone && { key: "timezone", icon: <IconClock />, text: timezone },
  ].filter((item): item is { key: string; icon: React.ReactElement; text: string } => Boolean(item));

  // Professional-links row: no icons, readable full-domain labels, clickable
  const links = cv.personalInfo.links
    .map((link) => link.trim())
    .filter((link) => link.length > 0);

  const sections: PdfSection[] = [
    {
      key: "summary",
      visible: Boolean(cv.summary?.trim()),
      node: (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.summary}</Text>
          <Text style={styles.entryDescription}>{cv.summary}</Text>
        </View>
      ),
    },
    {
      key: "experience",
      visible: cv.experience.length > 0,
      node: (
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
      ),
    },
    {
      key: "projects",
      visible: cv.projects.length > 0,
      node: (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.projects}</Text>
          {cv.projects.map((project, index) => {
            const projectLink = project.link.trim();
            // http(s) destinations become clickable links; anything else
            // (mailto:, javascript:, malformed) stays plain, non-clickable text
            const projectDest = absoluteUrl(projectLink);
            return (
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
                  {projectLink && (
                    <Text>
                      {" • "}
                      {projectDest ? (
                        <Link src={projectDest} style={styles.link}>
                          {displayUrl(projectLink)}
                        </Link>
                      ) : (
                        displayUrl(projectLink)
                      )}
                    </Text>
                  )}
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
            );
          })}
        </View>
      ),
    },
    {
      key: "education",
      visible: cv.education.length > 0,
      node: (
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
      ),
    },
    {
      key: "languages",
      visible: cv.languages.length > 0,
      node: (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.languages}</Text>
          <Text style={styles.entryDescription}>
            {cv.languages
              .map((lang) => `${lang.language} (${lang.proficiency})`)
              .join(", ")}
          </Text>
        </View>
      ),
    },
    {
      key: "skills",
      visible: cv.skills.length > 0,
      node: (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.skills}</Text>
          <Text style={styles.skillsList}>{cv.skills.join(", ")}</Text>
        </View>
      ),
    },
    {
      key: "custom",
      visible: Boolean(cv.customSection?.content?.trim()),
      node: (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {(!cv.customSection.title || cv.customSection.title === "Interests") ? t.interests : cv.customSection.title}
          </Text>
          <Text style={styles.entryDescription}>{cv.customSection.content}</Text>
        </View>
      ),
    },
    {
      key: "certifications",
      visible: cv.certifications.length > 0,
      node: (
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
      ),
    },
  ];

  // One divider between each pair of consecutive visible sections — never a
  // leading/trailing one and never a double, even when middle sections are empty
  const visibleSections = sections.filter((section) => section.visible);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Personal Information Section */}
        <View style={styles.header}>
          <Text style={styles.name}>{cv.personalInfo.fullName}</Text>
          {contactItems.length > 0 && (
            <View style={styles.contactInfo}>
              {contactItems.map((item, index) => (
                <View key={item.key} style={styles.contactGroup}>
                  {index > 0 && (
                    <Text style={styles.contactSeparator}>•</Text>
                  )}
                  <View style={styles.contactInfoItem}>
                    {item.icon}
                    <Text style={styles.contactItem}>{item.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {links.length > 0 && (
            <View
              style={
                contactItems.length > 0
                  ? [styles.contactInfo, styles.linksRow]
                  : styles.contactInfo
              }
            >
              {links.map((link, index) => {
                // http(s) destinations become clickable links; anything else
                // (mailto:, javascript:, malformed) stays plain, non-clickable text
                const dest = absoluteUrl(link);
                return (
                  <View key={`${link}-${index}`} style={styles.contactGroup}>
                    {index > 0 && (
                      <Text style={styles.contactSeparator}>•</Text>
                    )}
                    {dest ? (
                      <Link src={dest} style={styles.contactItem}>
                        {displayUrl(link)}
                      </Link>
                    ) : (
                      <Text style={styles.contactItem}>{displayUrl(link)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {visibleSections.map((section, index) => (
          <React.Fragment key={section.key}>
            {index > 0 && <View style={styles.divider} />}
            {section.node}
          </React.Fragment>
        ))}
      </Page>
    </Document>
  );
}
