/**
 * Refine — clean, deduplicate, and sanitize raw corpus.
 * Outputs refined text files ready for personality extraction.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { CorpusEntry } from "./parsers.js";
import { sanitizeCorpusEntry } from "./sanitize.js";

export interface RefineResult {
  totalInput: number;
  totalOutput: number;
  duplicatesRemoved: number;
  piiRedacted: number;
  outputDir: string;
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Normalize the complete text before hashing. No prefixes are used: entries
 * with identical openings but different tails remain distinct.
 */
export function normalizeContentForHash(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .trim()
    .replace(/\s+/gu, " ");
}

export function normalizedContentHash(text: string): string {
  return createHash("sha256").update(normalizeContentForHash(text), "utf8").digest("hex");
}

export function deduplicateEntries(entries: CorpusEntry[]): { kept: CorpusEntry[]; removed: number } {
  const seenHashes = new Set<string>();
  const kept: CorpusEntry[] = [];
  let removed = 0;

  for (const entry of entries) {
    const hash = normalizedContentHash(entry.text);
    if (seenHashes.has(hash)) {
      removed++;
      continue;
    }

    seenHashes.add(hash);
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

  // Normalize + sanitize before hashing so dedup reflects the content that is
  // actually emitted. This is also a second safety pass for legacy raw files.
  const prepared: CorpusEntry[] = [];
  for (const entry of allEntries) {
    let preparedEntry = { ...entry, text: normalizeText(entry.text) };

    if (!options.skipSanitize) {
      const sanitized = sanitizeCorpusEntry(preparedEntry);
      preparedEntry = sanitized.value;
      result.piiRedacted += sanitized.count;
    }

    if (preparedEntry.text.length > 10) {
      prepared.push(preparedEntry);
    }
  }

  const { kept: refined, removed } = deduplicateEntries(prepared);
  result.duplicatesRemoved = removed;
  console.log(`  Dedup: removed ${removed}, kept ${refined.length}`);

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
