import { describe, it, expect } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { Link, Svg, Text, View } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CVDocument } from "@/components/pdf/cv-document";
import { defaultCVState, type CVState } from "@/state/types";
import { runAllChecks, extractBullets, checkGitHub } from "./ats-rules";

function findPdfLinkTexts(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(findPdfLinkTexts);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];

  const { children } = node.props;
  if (node.type === Link) {
    return typeof children === "string" ? [children] : [];
  }

  return findPdfLinkTexts(children);
}

/** @react-pdf host components — never invoked while walking the tree */
const PDF_HOST_TYPES = new Set<unknown>([Link, Text, View, Svg]);

/**
 * Expands custom function components (e.g. the contact icon components) by
 * invoking them once, so nested Svg/Text/Link nodes become walkable.
 */
function expandNode(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.flatMap(expandNode);
  if (!isValidElement(node)) return node;
  if (typeof node.type === "function" && !PDF_HOST_TYPES.has(node.type)) {
    const render = node.type as (props: unknown) => ReactNode;
    return expandNode(render(node.props));
  }
  return node;
}

interface PdfLink {
  src: string;
  text: string;
}

function findPdfLinks(node: ReactNode): PdfLink[] {
  const expanded = expandNode(node);
  if (Array.isArray(expanded)) return expanded.flatMap(findPdfLinks);
  if (!isValidElement<{ children?: ReactNode; src?: string }>(expanded)) return [];

  const { children, src } = expanded.props;
  if (expanded.type === Link) {
    return typeof children === "string" && typeof src === "string"
      ? [{ src, text: children }]
      : [];
  }

  return findPdfLinks(children);
}

function countSvgs(node: ReactNode): number {
  const expanded = expandNode(node);
  if (Array.isArray(expanded)) {
    return expanded.reduce((sum, child) => sum + countSvgs(child), 0);
  }
  if (!isValidElement<{ children?: ReactNode }>(expanded)) return 0;
  if (expanded.type === Svg) return 1;
  return countSvgs(expanded.props.children);
}

type StyleRecord = Record<string, unknown>;

/**
 * Finds wrap groups: Views whose direct children (elements only) satisfy the
 * predicate. Used to prove separator+item grouping in the header rows.
 */
function findViewGroups(
  node: ReactNode,
  predicate: (child: ReactNode) => boolean,
): ReactNode[][] {
  const expanded = expandNode(node);
  if (Array.isArray(expanded)) return expanded.flatMap((child) => findViewGroups(child, predicate));
  if (!isValidElement<{ children?: ReactNode }>(expanded)) return [];

  const children = Array.isArray(expanded.props.children)
    ? expanded.props.children
    : expanded.props.children
      ? [expanded.props.children]
      : [];
  if (expanded.type === View && children.some(predicate)) {
    return [children];
  }
  return children.flatMap((child) => findViewGroups(child, predicate));
}

function styleEntries(node: ReactNode): StyleRecord[] {
  if (!isValidElement<{ style?: unknown }>(node)) return [];
  const style = node.props.style;
  if (Array.isArray(style)) return style.filter(Boolean) as StyleRecord[];
  return style ? [style as StyleRecord] : [];
}

/**
 * Flattens the document into an ordered outline of section titles and
 * dividers, preserving render order — used to prove divider adjacency.
 */
function collectOutline(node: ReactNode): Array<string | "DIVIDER"> {
  const expanded = expandNode(node);
  if (Array.isArray(expanded)) return expanded.flatMap(collectOutline);
  if (!isValidElement<{ children?: ReactNode }>(expanded)) return [];

  const outline: Array<string | "DIVIDER"> = [];

  if (expanded.type === Text) {
    const isTitle = styleEntries(expanded).some((s) => s.textTransform === "uppercase");
    if (isTitle && typeof expanded.props.children === "string") {
      outline.push(expanded.props.children);
    }
  }
  if (expanded.type === View) {
    const isDivider = styleEntries(expanded).some((s) => s.borderBottomWidth === 1);
    if (isDivider) outline.push("DIVIDER");
  }

  return [...outline, ...collectOutline(expanded.props.children)];
}

function stringLeaves(node: ReactNode): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(stringLeaves);
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return stringLeaves(node.props.children);
  }
  return [];
}

function findPdfTexts(node: ReactNode): string[] {
  const expanded = expandNode(node);
  if (Array.isArray(expanded)) return expanded.flatMap(findPdfTexts);
  if (!isValidElement<{ children?: ReactNode }>(expanded)) return [];
  if (expanded.type === Text) return stringLeaves(expanded.props.children);
  return findPdfTexts(expanded.props.children);
}

/** Representative CV matching the checked-in pdf-parse fixture. */
function representativeCV(): CVState {
  return {
    ...defaultCVState,
    personalInfo: {
      fullName: "Mario Rossi",
      location: "Milan, Italy",
      email: "mario.rossi@gmail.com",
      phone: "+39 333 123 4567",
      timezone: "CET (UTC+1)",
      links: [
        "https://linkedin.com/in/mariorossi",
        "https://github.com/mariorossi",
        "https://mariorossi.dev",
      ],
    },
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020-01",
        endDate: null,
        location: "Milan, Italy",
        description:
          "• Led a team of 6 engineers to rebuild the billing pipeline, cutting processing time by 40%\n• Designed and deployed a Kafka-based event bus handling 12M events per day for the platform\n• Mentored 4 junior developers through structured code review and pairing sessions each week",
      },
    ],
    projects: [
      {
        name: "Kafka Lens",
        role: "Creator",
        link: "https://github.com/mariorossi/kafka-lens",
        description:
          "Open-source observability dashboard for Apache Kafka clusters with consumer lag alerting and throughput dashboards.",
      },
    ],
  };
}

/**
 * Regression suite against REAL extracted text.
 *
 * `lib/__fixtures__/craftcv-export.txt` is the verbatim output of
 * `PDFParse().getText()` on a PDF rendered by this project's own
 * `components/pdf/cv-document.tsx`. Every other rule test uses hand-authored
 * strings, which hide the thing that actually breaks these checks: how
 * pdf-parse splits lines, glues bullet glyphs to words and flattens headers.
 *
 * To refresh it: render a CV with CVDocument, run the buffer through
 * PDFParse().getText() and paste the result here unchanged.
 */
const exportedText = readFileSync(
  resolve(process.cwd(), "lib/__fixtures__/craftcv-export.txt"),
  "utf8",
);

describe("CVDocument rendered links and contacts", () => {
  it("renders the GitHub domain so the ATS check detects the exported profile", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        ...defaultCVState.personalInfo,
        links: ["https://github.com/mariorossi"],
      },
    };
    const document = CVDocument({ cv });
    const linkText = findPdfLinkTexts(document).find(text => text.includes("mariorossi"));

    expect(linkText).toBe("github.com/mariorossi");
    expect(checkGitHub(linkText ?? "").status).toBe("passed");
  });

  it("shows every link as a readable domain but points at an absolute destination", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        ...defaultCVState.personalInfo,
        links: ["https://www.github.com/mariorossi", "linkedin.com/in/mariorossi"],
      },
    };
    const links = findPdfLinks(CVDocument({ cv }));

    expect(links).toEqual([
      { src: "https://www.github.com/mariorossi", text: "github.com/mariorossi" },
      { src: "https://linkedin.com/in/mariorossi", text: "linkedin.com/in/mariorossi" },
    ]);
  });

  it("renders non-HTTP link schemes as plain text, never as clickable links", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        ...defaultCVState.personalInfo,
        links: [
          "https://github.com/mariorossi",
          "mailto:me@example.com",
          "javascript:alert(1)",
          "not a url",
        ],
      },
    };
    const document = CVDocument({ cv });

    expect(findPdfLinks(document)).toEqual([
      { src: "https://github.com/mariorossi", text: "github.com/mariorossi" },
    ]);
    // Unsupported values stay visible as information, without a Link wrapper
    const texts = findPdfTexts(document);
    expect(texts).toContain("mailto:me@example.com");
    expect(texts).toContain("javascript:alert(1)");
    expect(texts).toContain("not a url");
  });

  it("groups each separator with its following link so they wrap together", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        ...defaultCVState.personalInfo,
        links: [
          "https://github.com/mariorossi",
          "https://linkedin.com/in/mariorossi",
          "https://mariorossi.dev",
        ],
      },
    };
    const document = CVDocument({ cv });

    // Groups = Views whose direct children contain a Link
    const groups = findViewGroups(document, (child) =>
      isValidElement(child) && child.type === Link,
    );
    expect(groups).toHaveLength(3);

    // Every group after the first starts with its own "•" separator; the
    // separator can never be stranded at the end of a wrapped line.
    groups.forEach((children, index) => {
      const elements = children.filter(isValidElement);
      if (index === 0) {
        expect(elements).toHaveLength(1);
        expect(elements[0].type).toBe(Link);
      } else {
        expect(elements).toHaveLength(2);
        expect(elements[0].type).toBe(Text);
        expect((elements[0].props as { children?: unknown }).children).toBe("•");
        expect(elements[1].type).toBe(Link);
      }
    });
  });

  it("renders direct-contact icons only — links never carry icons", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        ...defaultCVState.personalInfo,
        location: "Milan, Italy",
        email: "mario@example.com",
        phone: "+39 333 123 4567",
        timezone: "CET (UTC+1)",
        links: [
          "https://github.com/mariorossi",
          "https://linkedin.com/in/mariorossi",
          "https://mariorossi.dev",
          "https://medium.com/@mariorossi",
        ],
      },
    };
    // 4 contact icons (location, email, phone, timezone) regardless of link count
    expect(countSvgs(CVDocument({ cv }))).toBe(4);
  });

  it("renders project links with the same display and destination rules", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: { ...defaultCVState.personalInfo },
      projects: [
        {
          name: "Kafka Lens",
          role: "Creator",
          link: "github.com/mariorossi/kafka-lens",
          description: "Dashboard.",
        },
        {
          name: "Bad Scheme",
          role: "Contributor",
          link: "javascript:alert(1)",
          description: "Never clickable.",
        },
        {
          name: "Empty Link",
          role: "Contributor",
          link: "   ",
          description: "No link.",
        },
      ],
    };
    const document = CVDocument({ cv });

    expect(findPdfLinks(document)).toEqual([
      { src: "https://github.com/mariorossi/kafka-lens", text: "github.com/mariorossi/kafka-lens" },
    ]);
    // The unsupported project link stays visible but produces no Link node
    expect(findPdfTexts(document)).toContain("javascript:alert(1)");
  });
});

describe("CVDocument section polish", () => {
  it("uses the singular English EXPERIENCE heading", () => {
    const outline = collectOutline(CVDocument({ cv: representativeCV() }));
    expect(outline).toContain("Experience");
    expect(outline).not.toContain("Experiences");
  });

  it("renders exactly one divider between Languages and a custom section when Skills is empty", () => {
    const cv: CVState = {
      ...defaultCVState,
      education: [
        { degree: "MSc", institution: "Poli", location: "Milan", year: "2016" },
      ],
      languages: [{ language: "English", proficiency: "Fluent" }],
      skills: [],
      customSection: { title: "Interests", content: "Open source" },
      certifications: [{ title: "AWS", issuer: "Amazon", year: "2021" }],
    };
    const outline = collectOutline(CVDocument({ cv }));

    expect(outline).toEqual([
      "Education",
      "DIVIDER",
      "Languages",
      "DIVIDER",
      "Interests",
      "DIVIDER",
      "Certifications",
    ]);
  });

  it("keeps dividers between consecutive visible sections without doubles or edges", () => {
    const allBottomSections: CVState = {
      ...defaultCVState,
      languages: [{ language: "English", proficiency: "Fluent" }],
      skills: ["Go"],
      customSection: { title: "Interests", content: "Open source" },
      certifications: [{ title: "AWS", issuer: "Amazon", year: "2021" }],
    };
    const outline = collectOutline(CVDocument({ cv: allBottomSections }));

    expect(outline).toEqual([
      "Languages",
      "DIVIDER",
      "Skills",
      "DIVIDER",
      "Interests",
      "DIVIDER",
      "Certifications",
    ]);

    const customOnly: CVState = {
      ...defaultCVState,
      customSection: { title: "Interests", content: "Open source" },
    };
    expect(collectOutline(CVDocument({ cv: customOnly }))).toEqual(["Interests"]);
  });
});

describe("real pdf-parse output from a CraftCV export", () => {
  it("finds the section headings that survive extraction", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    const sections = result.checks.find(c => c.id === "S01")!;
    expect(sections.status).toBe("passed");
    // "EXPERIENCE" (singular, uppercase) must still count as Experience.
    expect(sections.message).toContain("Experience");
  });

  it("counts exactly the seven real bullets and no metadata lines", () => {
    const bullets = extractBullets(exportedText);
    expect(bullets).toHaveLength(7);
    expect(bullets.some(b => b.includes("@"))).toBe(false);
    expect(bullets.some(b => /Present/.test(b))).toBe(false);
    expect(bullets.some(b => /^Politecnico/.test(b))).toBe(false);
  });

  it("reads the timeline without inventing a gap", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    expect(result.checks.find(c => c.id === "S03")!.status).toBe("passed");
    expect(result.checks.find(c => c.id === "S04")!.status).toBe("passed");
  });

  it("does not flag the page footer or the bullet glyph as problematic characters", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    expect(result.checks.find(c => c.id === "A01")!.status).toBe("passed");
  });

  it("returns a clean location detail, not a fragment spanning two lines", () => {
    const location = runAllChecks(exportedText).checks.find(c => c.id === "D08")!;
    expect(location.status).toBe("passed");
    expect(location.details).toBe("Milan, Italy");
  });

  it("passes the phone, LinkedIn, GitHub and location ATS contact checks", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    const byId = (id: string) => result.checks.find(c => c.id === id)!;

    expect(byId("D02").status).toBe("passed");
    expect(byId("D02").details).toBe("+39 333 123 4567");
    expect(byId("D03").status).toBe("passed");
    expect(byId("D04").status).toBe("passed");
    expect(byId("D08").status).toBe("passed");
  });

  it("extracts link text as full domains without protocols", () => {
    expect(exportedText).toContain("linkedin.com/in/mariorossi");
    expect(exportedText).toContain("github.com/mariorossi");
    expect(exportedText).toContain("mariorossi.dev");
    expect(exportedText).not.toMatch(/https?:\/\//);
  });

  it("scores the export highly with every deterministic check passing", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    const notPassed = result.checks.filter(c => c.status !== "passed").map(c => c.id);
    expect(notPassed).toEqual([]);
    expect(result.lintScore).toBeGreaterThanOrEqual(90);
  });
});
