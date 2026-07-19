import { describe, expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CloneConfig } from "../src/config.js";
import { importDir } from "../src/ingest.js";
import { refine } from "../src/refine.js";
import {
  assessCorpusReadiness,
  CORPUS_READINESS_REPORT,
} from "../src/readiness.js";
import { assessQuality } from "../src/quality.js";
import { sanitizeCorpusEntry, sanitizeSensitiveText } from "../src/sanitize.js";
import { generateDeployGuide, generateTestCases } from "../src/templates.js";

const fixturesDir = join(import.meta.dir, "fixtures");

function assembled(...parts: string[]): string {
  return parts.join("");
}

function makePrivacySource(): { dir: string; secrets: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "digital-clone-source-"));
  const secrets = [
    "fixture.owner@example.test",
    assembled("sk", "-", "proj-1234567890abcdefghijklmnopqrstuvwxyz"),
    assembled("github", "_pat_", "11AA22BB33CC44DD55EE66FF77GG88HH"),
    assembled("xox", "b-", "1234567890-abcdefghijklmnop"),
    assembled("AK", "IA", "IOSFODNN7EXAMPLE"),
    assembled("eyJhbGciOiJIUzI1NiJ9", ".", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", ".",
      "ZmFrZXNpZ25hdHVyZTEyMzQ1Njc4OTA"),
    assembled("AI", "za", "SyD1234567890abcdefghijklmnopqrst"),
    assembled("-----BEGIN ", "PRIVATE", " KEY-----\n", "ZmFrZS1rZXktbGluZS0x\n",
      "-----END ", "PRIVATE", " KEY-----"),
    "fixture-password-12345",
    "fixtureBearerToken1234567890",
    "url-user",
    "url-password",
  ];
  const content = [
    "# Synthetic privacy regression fixture",
    "This file is deliberately long enough to become an article corpus entry.",
    `Contact ${secrets[0]} if needed.`,
    `api_key = ${secrets[1]}`,
    secrets[2],
    secrets[3],
    secrets[4],
    secrets[5],
    secrets[6],
    secrets[7],
    `password：${secrets[8]}`,
    `Authorization: Bearer ${secrets[9]}`,
    `https://${secrets[10]}:${secrets[11]}@example.test/repo.git`,
  ].join("\n");
  writeFileSync(join(dir, `transcript-${secrets[0]}.md`), content, "utf-8");
  return { dir, secrets };
}

function workspaceConfig(workspace: string): CloneConfig {
  return {
    target: "Regression Fixture",
    mode: "self",
    workspace,
    sources: {
      cc: { path: "", enabled: false },
      codex: { path: "", enabled: false },
      gemini: { path: "", enabled: false },
      memory: { path: "", enabled: false },
      articles: { path: "", enabled: false },
    },
  };
}

describe("privacy-safe ingest", () => {
  test("redacts secrets before writing raw artifacts", () => {
    const workspace = mkdtempSync(join(tmpdir(), "digital-clone-privacy-"));
    const source = makePrivacySource();
    const summary = importDir(
      workspaceConfig(workspace),
      source.dir,
    );

    const rawPath = join(workspace, "raw", "imported.jsonl");
    const written = readFileSync(rawPath, "utf-8");

    expect(summary.rawArtifactsWritten).toBe(true);
    expect(summary.sensitiveValuesRedacted).toBeGreaterThanOrEqual(source.secrets.length);
    for (const secret of source.secrets) expect(written).not.toContain(secret);
    expect(written).toContain("[EMAIL_REDACTED]");
    expect(written).toContain("[API_KEY_REDACTED]");
    expect(written).toContain("[GITHUB_TOKEN_REDACTED]");
    expect(written).toContain("[SLACK_TOKEN_REDACTED]");
    expect(written).toContain("[AWS_ACCESS_KEY_REDACTED]");
    expect(written).toContain("[JWT_REDACTED]");
    expect(written).toContain("[GOOGLE_API_KEY_REDACTED]");
    expect(written).toContain("[PRIVATE_KEY_REDACTED]");
    expect(written).toContain("[SECRET_REDACTED]");
    expect(written).toContain("[TOKEN_REDACTED]");
    expect(written).toContain("[URL_CREDENTIALS_REDACTED]");
  });

  test("no-raw mode does not create raw corpus artifacts", () => {
    const workspace = mkdtempSync(join(tmpdir(), "digital-clone-no-raw-"));
    const source = makePrivacySource();
    const summary = importDir(
      workspaceConfig(workspace),
      source.dir,
      { writeRaw: false },
    );

    expect(summary.rawArtifactsWritten).toBe(false);
    expect(summary.sensitiveValuesRedacted).toBeGreaterThanOrEqual(source.secrets.length);
    expect(existsSync(join(workspace, "raw"))).toBe(false);
  });

  test("sanitizes metadata fields as well as body text", () => {
    const githubToken = assembled("gh", "p_", "1234567890abcdefghijklmnopqrstuv");
    const result = sanitizeCorpusEntry({
      text: "This is safe corpus text with enough length.",
      role: "user",
      timestamp: "",
      sessionId: githubToken,
      source: "codex",
      file: "owner@example.test.jsonl",
    });

    expect(result.value.sessionId).toBe("[GITHUB_TOKEN_REDACTED]");
    expect(result.value.file).toBe("[EMAIL_REDACTED]");
  });

  test("does not redact phone-shaped substrings inside longer numeric identifiers", () => {
    const text = "timestamp=1758176000000 order=1380013800012";
    const result = sanitizeSensitiveText(text);

    expect(result.value).toBe(text);
    expect(result.count).toBe(0);
  });

  test("still redacts standalone Chinese and North American phone numbers", () => {
    const result = sanitizeSensitiveText("call 13800138000 or +1 (415) 555-2671");

    expect(result.value).toBe("call [PHONE_REDACTED] or [PHONE_REDACTED]");
    expect(result.count).toBe(2);
  });
});

describe("template generation", () => {
  test("creates an uninitialized workspace before writing templates", () => {
    const parent = mkdtempSync(join(tmpdir(), "digital-clone-templates-"));
    const testWorkspace = join(parent, "tests-not-yet-initialized", "clone-workspace");
    const deployWorkspace = join(parent, "deploy-not-yet-initialized", "clone-workspace");

    const testCases = generateTestCases(testWorkspace, "Test Target");
    const deployGuide = generateDeployGuide(deployWorkspace, "Test Target", "generic");

    expect(existsSync(testCases)).toBe(true);
    expect(existsSync(deployGuide)).toBe(true);
  });
});

describe("full-content deduplication", () => {
  test("keeps distinct tails while removing an exact normalized-content duplicate", () => {
    const workspace = mkdtempSync(join(tmpdir(), "digital-clone-dedup-"));
    const rawDir = join(workspace, "raw");
    mkdirSync(rawDir, { recursive: true });
    copyFileSync(
      join(fixturesDir, "dedup", "raw", "codex.jsonl"),
      join(rawDir, "codex.jsonl"),
    );

    const result = refine(workspace);
    const entries = readFileSync(join(workspace, "refined", "codex.jsonl"), "utf-8")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    expect(result.totalInput).toBe(3);
    expect(result.duplicatesRemoved).toBe(1);
    expect(entries).toHaveLength(2);
    expect(entries.some((entry) => entry.text.includes("distinct alpha tail"))).toBe(true);
    expect(entries.some((entry) => entry.text.includes("distinct beta tail"))).toBe(true);
  });
});

describe("corpus-readiness naming", () => {
  test("writes the readiness report without creating a quality report", () => {
    const workspace = mkdtempSync(join(tmpdir(), "digital-clone-readiness-"));
    const refinedDir = join(workspace, "refined");
    mkdirSync(refinedDir, { recursive: true });
    copyFileSync(
      join(fixturesDir, "dedup", "raw", "codex.jsonl"),
      join(refinedDir, "codex.jsonl"),
    );

    const report = assessCorpusReadiness(workspace);
    const legacyReport = assessQuality(workspace);
    const reportPath = join(workspace, CORPUS_READINESS_REPORT);
    const written = readFileSync(reportPath, "utf-8");

    expect(report.readiness).toBe("insufficient");
    expect(legacyReport.readiness).toBe("insufficient");
    expect(legacyReport.overall).toBe("insufficient");
    expect(written).toStartWith("# Corpus Readiness Report");
    expect(written).toContain("does not score the quality or fidelity of a generated clone");
    expect(existsSync(join(workspace, "quality-report.md"))).toBe(false);
  });
});
