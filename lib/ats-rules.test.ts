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
  it("warns when personal URL is just a domain", () => {
    const result = checkWebsite("Visit mariorossi.dev");
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
    expect(result.lintScore).toBeGreaterThanOrEqual(70);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("returns low lint score for empty text", () => {
    const result = runAllChecks("");
    expect(result.lintScore).toBeLessThanOrEqual(30);
  });

  it("returns all checks passed for a CraftCV-style PDF", () => {
    const result = runAllChecks(goodCv, "Mario_Rossi_CV_2026.pdf");
    const passed = result.checks.filter(c => c.status === "passed");
    expect(passed.length).toBeGreaterThan(result.checks.length * 0.6);
  });
});
