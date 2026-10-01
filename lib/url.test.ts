import { describe, it, expect } from "vitest";
import {
  displayUrl,
  absoluteUrl,
  ensureHttpDestination,
  normalizeImportedUrl,
  normalizeImportedPersonalInfo,
} from "./url";

describe("displayUrl — readable label without protocol noise", () => {
  it("strips http and https protocols", () => {
    expect(displayUrl("http://example.com")).toBe("example.com");
    expect(displayUrl("https://example.com")).toBe("example.com");
  });

  it("strips a leading www. after (or without) a protocol", () => {
    expect(displayUrl("https://www.github.com/user")).toBe("github.com/user");
    expect(displayUrl("www.portfolio.dev/path")).toBe("portfolio.dev/path");
  });

  it("preserves hosts, nested paths, query strings and trailing slashes", () => {
    expect(displayUrl("https://github.com/user?tab=repos")).toBe("github.com/user?tab=repos");
    expect(displayUrl("https://portfolio.dev/projects/1/")).toBe("portfolio.dev/projects/1/");
    expect(displayUrl("https://sub.example.co.uk/a/b?x=1&y=2")).toBe("sub.example.co.uk/a/b?x=1&y=2");
  });

  it("keeps bare domains and non-HTTP schemes untouched apart from the protocol", () => {
    expect(displayUrl("mariorossi.dev")).toBe("mariorossi.dev");
    expect(displayUrl("mailto:name@example.com")).toBe("mailto:name@example.com");
  });

  it("trims surrounding whitespace and returns empty string for empty input", () => {
    expect(displayUrl("  https://github.com/user  ")).toBe("github.com/user");
    expect(displayUrl("   ")).toBe("");
    expect(displayUrl("")).toBe("");
  });

  it("never throws on malformed input", () => {
    expect(() => displayUrl("not a url at all")).not.toThrow();
    expect(displayUrl("not a url at all")).toBe("not a url at all");
    expect(displayUrl("http://")).toBe("");
  });
});

describe("absoluteUrl — clickable absolute destination", () => {
  it("keeps existing http and https destinations unchanged", () => {
    expect(absoluteUrl("http://example.com")).toBe("http://example.com");
    expect(absoluteUrl("https://github.com/user")).toBe("https://github.com/user");
  });

  it("prepends https:// to domain-like values stored without a protocol", () => {
    expect(absoluteUrl("github.com/user")).toBe("https://github.com/user");
    expect(absoluteUrl("www.portfolio.dev/path")).toBe("https://www.portfolio.dev/path");
  });

  it("preserves paths and query strings", () => {
    expect(absoluteUrl("portfolio.dev/path?q=1")).toBe("https://portfolio.dev/path?q=1");
  });

  it("never makes non-HTTP schemes clickable", () => {
    expect(absoluteUrl("mailto:name@example.com")).toBeNull();
    expect(absoluteUrl("javascript:alert(1)")).toBeNull();
    expect(absoluteUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(absoluteUrl("ftp://files.example.com")).toBeNull();
  });

  it("rejects malformed HTTP URLs via URL parsing", () => {
    expect(absoluteUrl("http://")).toBeNull();
    expect(absoluteUrl("https://")).toBeNull();
    expect(absoluteUrl("HTTPS://")).toBeNull();
    expect(absoluteUrl("https://example.com:bad")).toBeNull();
    expect(absoluteUrl("http://:8080/")).toBeNull();
  });

  it("accepts well-formed HTTP URLs with ports, paths and credentials", () => {
    expect(absoluteUrl("https://example.com:8080/path?q=1")).toBe("https://example.com:8080/path?q=1");
    expect(absoluteUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(absoluteUrl("https://user:secret@example.com/p")).toBe("https://user:secret@example.com/p");
    expect(absoluteUrl("https://example.com:443/x")).toBe("https://example.com:443/x");
  });

  it("never makes malformed input clickable", () => {
    expect(absoluteUrl("not a url at all")).toBeNull();
    expect(absoluteUrl("http://bad destination with spaces")).toBeNull();
    expect(absoluteUrl(":::broken")).toBeNull();
  });

  it("returns null for empty input and never throws", () => {
    expect(absoluteUrl("")).toBeNull();
    expect(absoluteUrl("   ")).toBeNull();
  });
});

describe("ensureHttpDestination — editing boundary normalization", () => {
  it("keeps values that already carry a scheme", () => {
    expect(ensureHttpDestination("https://github.com/user")).toBe("https://github.com/user");
    expect(ensureHttpDestination("http://example.com")).toBe("http://example.com");
  });

  it("keeps unsupported schemes editable without rewriting them", () => {
    expect(ensureHttpDestination("mailto:name@example.com")).toBe("mailto:name@example.com");
  });

  it("adds https:// to domain-like values", () => {
    expect(ensureHttpDestination("github.com/user")).toBe("https://github.com/user");
    expect(ensureHttpDestination("my-site.dev")).toBe("https://my-site.dev");
  });

  it("leaves free text and empty values untouched while the user is typing", () => {
    expect(ensureHttpDestination("still typing")).toBe("still typing");
    expect(ensureHttpDestination("")).toBe("");
    expect(ensureHttpDestination("   ")).toBe("");
  });
});

describe("normalizeImportedUrl — shared PDF/JSON import heuristic", () => {
  it("keeps absolute http(s) URLs", () => {
    expect(normalizeImportedUrl("https://github.com/user")).toBe("https://github.com/user");
    expect(normalizeImportedUrl(" http://example.com ")).toBe("http://example.com");
  });

  it("expands abbreviated LinkedIn paths", () => {
    expect(normalizeImportedUrl("/in/mariorossi")).toBe("https://linkedin.com/in/mariorossi");
  });

  it("expands bare usernames to GitHub profiles", () => {
    expect(normalizeImportedUrl("mariorossi")).toBe("https://github.com/mariorossi");
  });

  it("adds https:// to domain-like values stored without a protocol", () => {
    expect(normalizeImportedUrl("mariorossi.dev")).toBe("https://mariorossi.dev");
    expect(normalizeImportedUrl("github.com/user")).toBe("https://github.com/user");
  });

  it("keeps only well-formed absolute http(s) URLs", () => {
    expect(normalizeImportedUrl("https://github.com/user")).toBe("https://github.com/user");
    expect(normalizeImportedUrl("http://")).toBeNull();
    expect(normalizeImportedUrl("https://example.com:bad")).toBeNull();
  });

  it("drops empty values, non-web schemes, root-relative paths and garbage", () => {
    expect(normalizeImportedUrl("")).toBeNull();
    expect(normalizeImportedUrl("   ")).toBeNull();
    expect(normalizeImportedUrl("/projects")).toBeNull();
    expect(normalizeImportedUrl("not a url with spaces")).toBeNull();
    expect(normalizeImportedUrl("mailto:me@example.com")).toBeNull();
    expect(normalizeImportedUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeImportedUrl("data:text/html,x")).toBeNull();
  });
});

describe("normalizeImportedPersonalInfo — contact shape boundary", () => {
  it("fills missing phone/timezone with empty strings", () => {
    const normalized = normalizeImportedPersonalInfo({
      fullName: "Mario Rossi",
      location: "Milan, Italy",
      email: "mario@example.com",
      links: [],
    });
    expect(normalized.phone).toBe("");
    expect(normalized.timezone).toBe("");
    expect(normalized.fullName).toBe("Mario Rossi");
  });

  it("preserves provided phone and timezone", () => {
    const normalized = normalizeImportedPersonalInfo({
      phone: "+39 333 123 4567",
      timezone: "CET (UTC+1)",
    });
    expect(normalized.phone).toBe("+39 333 123 4567");
    expect(normalized.timezone).toBe("CET (UTC+1)");
  });

  it("normalizes links and tolerates a missing links array", () => {
    const normalized = normalizeImportedPersonalInfo({
      fullName: "Mario",
      links: ["mariorossi", "mariorossi.dev", "  ", "mailto:me@example.com"],
    });
    expect(normalized.links).toEqual([
      "https://github.com/mariorossi",
      "https://mariorossi.dev",
    ]);

    const noLinks = normalizeImportedPersonalInfo(undefined);
    expect(noLinks.links).toEqual([]);
    expect(noLinks.fullName).toBe("");
  });
});
