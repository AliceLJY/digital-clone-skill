/**
 * Refine — clean, deduplicate, and sanitize raw corpus.
 * Outputs refined text files ready for personality extraction.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import type { CorpusEntry } from "./parsers.js";

export interface RefineResult {
  totalInput: number;
  totalOutput: number;
  duplicatesRemoved: number;
  piiRedacted: number;
  outputDir: string;
}

// ============================================================================
// PII Patterns
// ============================================================================

const PII_PATTERNS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[EMAIL_REDACTED]", label: "email" },
  { regex: /(?:1[3-9]\d{9})/g, replacement: "[PHONE_REDACTED]", label: "cn_phone" },
  { regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: "[PHONE_REDACTED]", label: "us_phone" },
  { regex: /(?:sk-|pk-|api[_-]?key[_=:]\s*)[a-zA-Z0-9_-]{20,}/gi, replacement: "[API_KEY_REDACTED]", label: "api_key" },
  { regex: /(?:token|secret|password|passwd|pwd)[_=:]\s*["']?[^\s"']{8,}/gi, replacement: "[SECRET_REDACTED]", label: "secret" },
  { regex: /\b\d{1,5}\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/gi, replacement: "[ADDRESS_REDACTED]", label: "address" },
];

function sanitizePII(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    const matches = result.match(regex);
    if (matches) {
      count += matches.length;
      result = result.replace(regex, replacement);
    }
  }
  return { text: result, count };
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Simple dedup: exact match after normalization + near-duplicate detection.
 * Near-duplicate: if first 100 chars match, treat as duplicate.
 */
function dedup(entries: CorpusEntry[]): { kept: CorpusEntry[]; removed: number } {
  const seen = new Set<string>();
  const prefixSeen = new Set<string>();
  const kept: CorpusEntry[] = [];
  let removed = 0;

  for (const entry of entries) {
    const normalized = entry.text.trim().replace(/\s+/g, " ");

    // Exact match
    if (seen.has(normalized)) {
      removed++;
      continue;
    }

    // Near-duplicate: first 100 chars
    const prefix = normalized.slice(0, 100);
    if (prefix.length >= 50 && prefixSeen.has(prefix)) {
      removed++;
      continue;
    }

    seen.add(normalized);
    if (prefix.length >= 50) prefixSeen.add(prefix);
    kept.push(entry);
  }

  return { kept, removed };
}

// ============================================================================
// Format Normalization
// ============================================================================

function normalizeText(text: string): string {
  return text
    // Normalize unicode whitespace
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Trim lines
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

// ============================================================================
// Main Refine
// ============================================================================

export function refine(workspaceDir: string, options: { skipSanitize?: boolean } = {}): RefineResult {
  const rawDir = join(workspaceDir, "raw");
  const refinedDir = join(workspaceDir, "refined");
  mkdirSync(refinedDir, { recursive: true });

  const result: RefineResult = {
    totalInput: 0,
    totalOutput: 0,
    duplicatesRemoved: 0,
    piiRedacted: 0,
    outputDir: refinedDir,
  };

  if (!existsSync(rawDir)) {
    console.log("  No raw/ directory found. Run ingest first.");
    return result;
  }

  // Read all raw entries
  const allEntries: CorpusEntry[] = [];
  const rawFiles = readdirSync(rawDir).filter((f) => f.endsWith(".jsonl"));

  for (const file of rawFiles) {
    const lines = readFileSync(join(rawDir, file), "utf-8").split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        allEntries.push(JSON.parse(line));
      } catch { /* skip */ }
    }
  }

  result.totalInput = allEntries.length;
  console.log(`  Raw entries: ${allEntries.length}`);

  // Dedup
  const { kept, removed } = dedup(allEntries);
  result.duplicatesRemoved = removed;
  console.log(`  Dedup: removed ${removed}, kept ${kept.length}`);

  // Sanitize + Normalize
  const refined: CorpusEntry[] = [];
  for (const entry of kept) {
    let text = normalizeText(entry.text);

    if (!options.skipSanitize) {
      const { text: sanitized, count } = sanitizePII(text);
      text = sanitized;
      result.piiRedacted += count;
    }

    if (text.length > 10) {
      refined.push({ ...entry, text });
    }
  }

  result.totalOutput = refined.length;
  console.log(`  PII redacted: ${result.piiRedacted} instances`);
  console.log(`  Final output: ${refined.length} entries`);

  // Group by source and write
  const bySource: Record<string, CorpusEntry[]> = {};
  for (const entry of refined) {
    const key = entry.source;
    if (!bySource[key]) bySource[key] = [];
    bySource[key].push(entry);
  }

  for (const [source, entries] of Object.entries(bySource)) {
    // Write user-side text only (for personality extraction)
    const userEntries = entries.filter((e) => e.role === "user");
    const assistantEntries = entries.filter((e) => e.role === "assistant");

    if (userEntries.length > 0) {
      const userText = userEntries.map((e) => e.text).join("\n\n---\n\n");
      writeFileSync(join(refinedDir, `${source}-user.md`), userText, "utf-8");
    }

    if (assistantEntries.length > 0) {
      const assistantText = assistantEntries.map((e) => e.text).join("\n\n---\n\n");
      writeFileSync(join(refinedDir, `${source}-assistant.md`), assistantText, "utf-8");
    }

    // Also write combined jsonl for downstream tools
    const jsonlPath = join(refinedDir, `${source}.jsonl`);
    writeFileSync(jsonlPath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");

    console.log(`  ${source}: ${userEntries.length} user / ${assistantEntries.length} assistant entries`);
  }

  return result;
}
