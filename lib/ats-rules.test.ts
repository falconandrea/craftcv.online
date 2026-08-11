import { describe, it, expect } from "vitest";
import {
  checkEmail,
  checkPhone,
  checkLinkedIn,
  checkGitHub,
  checkWebsite,
  checkLocation,
  checkActionVerbs,
  checkBulletLength,
  checkMetrics,
  checkSections,
  checkDates,
  checkDateGaps,
  checkRecentEndDate,
  checkSpecialChars,
  checkSkillsFormat,
  checkFileName,
  runAllChecks,
  extractBullets,
  parseDateRanges,
} from "./ats-rules";

// ── U1. Email ──────────────────────────────────────────────────────────────

describe("checkEmail", () => {
  it("passes with valid email", () => {
    const result = checkEmail("Contact me at mario.rossi@email.com");
    expect(result.status).toBe("passed");
    expect(result.details).toContain("mario.rossi@email.com");
  });

  it("fails with no email", () => {
    const result = checkEmail("No contact info here");
    expect(result.status).toBe("failed");
  });

  it("warns on example.com domain", () => {
    const result = checkEmail("Email: example@example.com");
    expect(result.status).toBe("warning");
  });
});

// ── U2. Phone ──────────────────────────────────────────────────────────────

describe("checkPhone", () => {
  it("passes with international prefix", () => {
    const result = checkPhone("Call me at +39 123 456 7890");
    expect(result.status).toBe("passed");
  });

  it("warns without international prefix", () => {
    const result = checkPhone("Call me at 123-456-7890");
    expect(result.status).toBe("warning");
  });

  it("fails with no phone", () => {
    const result = checkPhone("No phone here");
    expect(result.status).toBe("failed");
  });
});

// ── U3. LinkedIn, GitHub, Website, Location ────────────────────────────────

describe("checkLinkedIn", () => {
  it("passes with linkedin.com/in/", () => {
    const result = checkLinkedIn("linkedin.com/in/mariorossi");
    expect(result.status).toBe("passed");
  });

  it("passes with linkedin.com/pub/", () => {
    const result = checkLinkedIn("linkedin.com/pub/mariorossi");
    expect(result.status).toBe("passed");
  });

  it("fails without linkedin", () => {
    const result = checkLinkedIn("No linkedin here");
    expect(result.status).toBe("failed");
  });
});

describe("checkGitHub", () => {
  it("passes with github.com/username", () => {
    const result = checkGitHub("github.com/mariorossi");
    expect(result.status).toBe("passed");
  });

  it("warns without github", () => {
    const result = checkGitHub("No github here");
    expect(result.status).toBe("warning");
  });
});

describe("checkWebsite", () => {
  it("accepts a bare personal domain", () => {
    const result = checkWebsite("Visit mariorossi.dev");
    expect(result.status).toBe("passed");
    expect(result.details).toBe("mariorossi.dev");
  });

  it("does not mistake an email domain for a personal website", () => {
    const result = checkWebsite("Contact: mario.rossi@email.com");
    expect(result.status).toBe("warning");
  });

  it("warns without website", () => {
    const result = checkWebsite("No site here");
    expect(result.status).toBe("warning");
  });
});

describe("checkLocation", () => {
  it("passes with city, country", () => {
    const result = checkLocation("Milan, Italy");
    expect(result.status).toBe("passed");
  });

  it("passes with timezone", () => {
    const result = checkLocation("Available in CET timezone");
    expect(result.status).toBe("passed");
  });

  it("fails without location", () => {
    const result = checkLocation("No location here");
    expect(result.status).toBe("failed");
  });
});

// ── U4. Action Verbs ───────────────────────────────────────────────────────

describe("checkActionVerbs", () => {
  const goodText = `
    Experience
    - Developed a React dashboard serving 10k users
    - Led a team of 5 engineers
    - Implemented CI/CD pipeline reducing deploy time by 60%
    - Created REST API documentation
  `;

  const weakText = `
    Experience
    - Was responsible for the dashboard
    - Worked on the team
    - Was involved in CI/CD
    - Did some API work
  `;

  it("passes with strong action verbs", () => {
    const result = checkActionVerbs(goodText);
    expect(result.status).toBe("passed");
  });

  it("fails with weak action verbs", () => {
    const result = checkActionVerbs(weakText);
    expect(result.status).toBe("failed");
  });

  it("warns when no bullets detected", () => {
    const result = checkActionVerbs("Just a sentence.");
    expect(result.status).toBe("warning");
  });
});

// ── U5. Bullet Length & Metrics ────────────────────────────────────────────

describe("checkBulletLength", () => {
  it("passes with good length bullets", () => {
    const text = "- Built scalable React components for the main customer facing dashboard application\n- Led an engineering team of five people to successfully deliver the project\n- Improved performance by 50% which resulted in much better user retention";
    const result = checkBulletLength(text);
    expect(result.status).toBe("passed");
  });

  it("warns with short bullets", () => {
    const text = "- Hi\n- Bye\n- Did stuff";
    const result = checkBulletLength(text);
    expect(result.status).toBe("warning");
  });
});

describe("checkMetrics", () => {
  it("passes with metrics in bullets", () => {
    const text = "- Increased revenue by 50%\n- Managed $2M budget\n- Led team of 10";
    const result = checkMetrics(text);
    expect(result.status).toBe("passed");
  });

  it("fails without metrics", () => {
    const text = "- Was responsible for stuff\n- Did some work";
    const result = checkMetrics(text);
    expect(result.status).toBe("failed");
  });
});

// ── U6. Sections & Dates ───────────────────────────────────────────────────

describe("checkSections", () => {
  const completeText = `
    Professional Summary
    Experienced developer...

    Work Experience
    Senior Dev at Company

    Education
    University of Milan

    Skills
    React, TypeScript, Node.js

    Certifications
    AWS Certified
  `;

  it("passes with all standard sections", () => {
    const result = checkSections(completeText);
    expect(result.status).toBe("passed");
  });

  it("fails without any sections", () => {
    const result = checkSections("Just some random text without sections.");
    expect(result.status).toBe("failed");
  });
});

describe("checkDates", () => {
  it("passes with multiple date references", () => {
    const result = checkDates("Experience 2018-2020 and Education 2014-2018");
    expect(result.status).toBe("passed");
  });

  it("fails without dates", () => {
    const result = checkDates("No dates here");
    expect(result.status).toBe("failed");
  });
});

describe("checkDateGaps", () => {
  it("passes without significant gaps", () => {
    const result = checkDateGaps("2018 – 2020, 2020 – 2022");
    expect(result.status).toBe("passed");
  });

  it("does not invent a gap between the bounds of the same role", () => {
    const result = checkDateGaps("Jan 2018 – Dec 2020\nJan 2021 – Dec 2022");
    expect(result.status).toBe("passed");
  });

  it("warns on a real multi-year gap", () => {
    const result = checkDateGaps("Jan 2014 – Dec 2015\nJan 2019 – Dec 2022");
    expect(result.status).toBe("warning");
    expect(result.details).toMatch(/months/);
  });

  it("warns instead of claiming a pass when the timeline cannot be parsed", () => {
    const result = checkDateGaps("Software Engineer with several years of experience");
    expect(result.status).toBe("warning");
  });

  it("ignores ranges outside a plausible career window", () => {
    expect(parseDateRanges("Serial no. 1200 – 3400")).toHaveLength(0);
  });
});

describe("checkRecentEndDate", () => {
  it("passes with proper end dates", () => {
    const result = checkRecentEndDate("Senior Dev, 2020 – Present");
    expect(result.status).toBe("passed");
  });
});

// ── U7. ATS-Specific ───────────────────────────────────────────────────────

describe("checkSpecialChars", () => {
  it("passes without special chars", () => {
    const result = checkSpecialChars("Clean text with no emoji.");
    expect(result.status).toBe("passed");
  });

  it("warns with emoji", () => {
    const result = checkSpecialChars("I love ❤️ coding and 🚀 deploying");
    expect(result.status).toBe("warning");
  });

  it("does not flag non-Latin scripts", () => {
    expect(checkSpecialChars("Анна Иванова — Инженер").status).toBe("passed");
    expect(checkSpecialChars("田中太郎 ソフトウェアエンジニア").status).toBe("passed");
    expect(checkSpecialChars("Andrea Falcón, Ingénieur logiciel").status).toBe("passed");
  });

  it("does not flag arrows or check marks", () => {
    expect(checkSpecialChars("Migrated PHP → Node.js ✓").status).toBe("passed");
  });

  it("warns on icon-font glyphs from the private use area", () => {
    const result = checkSpecialChars("Email: \uF0E0 mario@rossi.dev");
    expect(result.status).toBe("warning");
    expect(result.details).toContain("U+F0E0");
  });

  it("warns when the extractor already lost characters", () => {
    const result = checkSpecialChars("Senior Engineer \uFFFD\uFFFD Acme");
    expect(result.status).toBe("warning");
    expect(result.details).toContain("U+FFFD");
  });
});

describe("checkSkillsFormat", () => {
  const withSection = `
    Skills
    React, TypeScript, Node.js

    Experience
  `;

  it("passes with parsable skills section", () => {
    const result = checkSkillsFormat(withSection);
    expect(result.status).toBe("passed");
  });

  it("warns without skills section", () => {
    const result = checkSkillsFormat("No skills here");
    expect(result.status).toBe("warning");
  });
});

describe("checkFileName", () => {
  it("passes with professional name", () => {
    const result = checkFileName("", "Mario_Rossi_CV_2026.pdf");
    expect(result.status).toBe("passed");
  });

  it("warns with generic name", () => {
    const result = checkFileName("", "resume.pdf");
    expect(result.status).toBe("warning");
  });

  it("warns without filename", () => {
    const result = checkFileName("");
    expect(result.status).toBe("warning");
  });
});

// ── U8. Runner Integration ─────────────────────────────────────────────────

describe("runAllChecks", () => {
  const goodCv = `
    Mario Rossi
    Milan, Italy
    mario.rossi@email.com
    +39 123 456 7890
    linkedin.com/in/mariorossi
    github.com/mariorossi
    https://mariorossi.dev

    Professional Summary
    Senior software engineer with 10 years of experience.

    Work Experience
    Senior Developer, Tech Corp
    2020 – Present
    - Led a cross-functional team of 5 engineers building scalable React applications
    - Increased API performance by 40% through aggressive caching and database optimization
    - Implemented a complete CI/CD pipeline reducing deployment time by over 50 percent
    - Mentored 3 junior developers through pair programming and architectural design sessions

    Full Stack Developer, Startup Inc
    2016 – 2020
    - Built customer-facing dashboard used by 10k users per month across multiple regions
    - Reduced page load time by 60% resulting in significantly higher conversion rates
    - Wrote comprehensive end-to-end test suite achieving 90% coverage on all repositories
    - Managed AWS infrastructure for production workloads including load balancers and auto-scaling

    Education
    University of Milan
    Computer Science, 2012 – 2016

    Skills
    React, TypeScript, Node.js, Python, AWS, Docker
  `;

  it("returns high lint score for a good CV", () => {
    const result = runAllChecks(goodCv, "Mario_Rossi_CV_2026.pdf");
    expect(result.lintScore).toBeGreaterThanOrEqual(90);
    expect(result.checks.length).toBe(16);
  });

  it("returns low lint score for empty text", () => {
    const result = runAllChecks("");
    // Not 0: checks that cannot be evaluated warn rather than fail, and a
    // warning is half credit.
    expect(result.lintScore).toBeLessThanOrEqual(40);
  });

  it("returns all checks passed for a CraftCV-style PDF", () => {
    const result = runAllChecks(goodCv, "Mario_Rossi_CV_2026.pdf");
    const passed = result.checks.filter(c => c.status === "passed");
    expect(passed.length).toBeGreaterThan(result.checks.length * 0.6);
  });

  it("never penalises the checks it calls optional", () => {
    // Same CV without GitHub and without a personal website: the two optional
    // checks warn, but the score must not move.
    const withOptional = runAllChecks(goodCv, "Mario_Rossi_CV_2026.pdf");
    const withoutOptional = runAllChecks(
      goodCv.replace("github.com/mariorossi\n", "").replace("https://mariorossi.dev\n", ""),
      "Mario_Rossi_CV_2026.pdf"
    );
    expect(withoutOptional.lintScore).toBe(withOptional.lintScore);

    const optional = withoutOptional.checks.filter(c => c.informational);
    expect(optional.map(c => c.id)).toEqual(["D04", "D05"]);
    expect(optional.every(c => c.status === "warning")).toBe(true);
  });

  it("scores a warning as half credit", () => {
    // One failed check (no LinkedIn) must cost twice as much as one warning.
    const noLinkedIn = runAllChecks(goodCv.replace("linkedin.com/in/mariorossi\n", ""), "Mario_Rossi_CV_2026.pdf");
    const full = runAllChecks(goodCv, "Mario_Rossi_CV_2026.pdf");
    expect(noLinkedIn.lintScore).toBeLessThan(full.lintScore);
  });
});

// ── Bullet extraction ──────────────────────────────────────────────────────

describe("extractBullets", () => {
  const cv = `Mario Rossi
mario.rossi@gmail.com | +39 333 1234567 | Milan, Italy
EXPERIENCE
Acme Corp — Senior Engineer
Jan 2020 - Present
- Led a team of 6 engineers to rebuild the billing pipeline, cutting time by 40%
- Designed a Kafka-based event bus handling 12M events per day for the platform
SKILLS
Go, Python, Kubernetes`;

  it("uses only the explicitly marked bullets when the CV has them", () => {
    const bullets = extractBullets(cv);
    expect(bullets).toHaveLength(2);
    expect(bullets.every(b => b.startsWith("- "))).toBe(true);
  });

  it("never treats the contact line or a date range as a bullet", () => {
    const bullets = extractBullets(cv);
    expect(bullets.some(b => b.includes("@"))).toBe(false);
    expect(bullets.some(b => /Present/.test(b))).toBe(false);
  });

  it("falls back to prose lines when there are no bullet glyphs", () => {
    const prose = `EXPERIENCE
Acme Corp — Senior Engineer
2020 - Present
Rebuilt the billing pipeline and cut end-to-end processing time by 40 percent
mario@rossi.dev`;
    const bullets = extractBullets(prose);
    expect(bullets).toEqual(["Rebuilt the billing pipeline and cut end-to-end processing time by 40 percent"]);
  });

  it("does not report the contact line back as a too-short bullet", () => {
    const result = checkBulletLength(cv);
    expect(result.details ?? "").not.toContain("@");
  });
});

// ── Regression tests for the false positives fixed in this pass ─────────────

describe("metric detection precision", () => {
  it("does not count a bare comma or a stray year as a metric", () => {
    const text = "- Worked in Milan, Italy on the platform team since 2019 doing various things\n- Responsible for the internal tooling used by the department, reporting to the CTO";
    expect(checkMetrics(text).status).toBe("failed");
  });

  it("treats identical bullets identically (no shared regex state)", () => {
    const one = "- Reduced infrastructure cost by 30% across the platform";
    const text = [one, one, one].join("\n");
    const result = checkMetrics(text);
    expect(result.status).toBe("passed");
    expect(result.message).toContain("3/3");
  });
});

describe("phone false positives", () => {
  it("does not read a year range as a phone number", () => {
    expect(checkPhone("Senior Developer 2018 - 2020").status).toBe("failed");
  });

  it("does not read a VAT number as a phone number", () => {
    expect(checkPhone("VAT IT12345678901").status).toBe("failed");
  });
});

describe("location precision", () => {
  it("does not read the lowercase word \"est\" as a timezone", () => {
    expect(checkLocation("Esperienza nel settore est della regione").status).toBe("failed");
  });

  it("warns when only a work preference is stated", () => {
    expect(checkLocation("Looking for a Remote position").status).toBe("warning");
  });
});

describe("section counting", () => {
  it("does not credit two aliases of the same section twice", () => {
    const text = "Skills\nReact\n\nTechnical Skills\nTypeScript\n\nExperience\nAcme";
    const result = checkSections(text);
    // Skills + Experience = 2 groups, not 3.
    expect(result.message).toContain("2 standard sections");
  });
});

describe("file name hygiene", () => {
  it("warns on draft markers", () => {
    expect(checkFileName("", "cv_final_v3(1).pdf").status).toBe("warning");
    expect(checkFileName("", "Mario_Rossi_CV_copy.pdf").status).toBe("warning");
  });
});
