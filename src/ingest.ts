/**
 * Ingest — scan multiple sources and write sanitized, pre-refinement corpus to
 * clone-workspace/raw/. Sensitive values are redacted in memory before the
 * first write.
 */

import { appendFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { type CloneConfig, resolveSourcePath } from "./config.js";
import {
  parseCCDir,
  parseCodexDir,
  parseGeminiDir,
  parseMarkdownDir,
  parseArticlesDir,
  type CorpusEntry,
  type ParseResult,
} from "./parsers.js";
import { sanitizeCorpusEntries } from "./sanitize.js";

export interface IngestOptions {
  /** Persist sanitized pre-refinement entries to raw/. Defaults to true. */
  writeRaw?: boolean;
}

export interface IngestSummary {
  sources: Record<string, { files: number; entries: number; errors: string[] }>;
  totalEntries: number;
  totalFiles: number;
  outputDir: string;
  sensitiveValuesRedacted: number;
  rawArtifactsWritten: boolean;
}

const SOURCE_PARSERS: Record<string, (dir: string) => ParseResult> = {
  cc: parseCCDir,
  codex: parseCodexDir,
  gemini: parseGeminiDir,
  memory: parseMarkdownDir,
  articles: parseArticlesDir,
};

export function ingest(
  config: CloneConfig,
  sourceFilter?: string,
  options: IngestOptions = {},
): IngestSummary {
  const rawDir = join(config.workspace, "raw");
  const writeRaw = options.writeRaw !== false;
  if (writeRaw) mkdirSync(rawDir, { recursive: true });

  const summary: IngestSummary = {
    sources: {},
    totalEntries: 0,
    totalFiles: 0,
    outputDir: rawDir,
    sensitiveValuesRedacted: 0,
    rawArtifactsWritten: false,
  };

  const sourcesToProcess = sourceFilter && sourceFilter !== "all"
    ? [sourceFilter]
    : Object.keys(SOURCE_PARSERS);

  for (const source of sourcesToProcess) {
    const parser = SOURCE_PARSERS[source];
    if (!parser) {
      console.log(`  Unknown source: ${source}, skipping`);
      continue;
    }

    const path = resolveSourcePath(config, source);
    if (!path) {
      console.log(`  ${source}: no path found or disabled, skipping`);
      summary.sources[source] = { files: 0, entries: 0, errors: [`No path configured or directory not found`] };
      continue;
    }

    console.log(`  ${source}: scanning ${path}...`);
    const result = parser(path);
    const sanitized = sanitizeCorpusEntries(result.entries);

    // The serialized payload is constructed only from in-memory sanitized
    // entries. Plaintext source content is never staged and overwritten.
    if (writeRaw && sanitized.value.length > 0) {
      const outPath = join(rawDir, `${source}.jsonl`);
      const lines = sanitized.value.map((entry) => JSON.stringify(entry));
      writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
      summary.rawArtifactsWritten = true;
    }

    summary.sources[source] = {
      files: result.filesScanned,
      entries: result.entries.length,
      errors: result.errors,
    };
    summary.totalEntries += result.entries.length;
    summary.totalFiles += result.filesScanned;
    summary.sensitiveValuesRedacted += sanitized.count;

    console.log(`  ${source}: ${result.filesScanned} files, ${result.entries.length} entries, ${sanitized.count} sensitive values redacted`);
    if (result.errors.length > 0) {
      console.log(`  ${source}: ${result.errors.length} errors`);
    }
  }

  return summary;
}

/**
 * Import external files as sanitized pre-refinement entries (Mentor Mode).
 */
export function importDir(
  config: CloneConfig,
  importPath: string,
  options: IngestOptions = {},
): IngestSummary {
  const rawDir = join(config.workspace, "raw");
  const writeRaw = options.writeRaw !== false;
  if (writeRaw) mkdirSync(rawDir, { recursive: true });

  const result = parseArticlesDir(importPath);
  const sanitized = sanitizeCorpusEntries(
    result.entries.map((entry) => ({ ...entry, source: "articles" as const })),
  );

  if (writeRaw && sanitized.value.length > 0) {
    const outPath = join(rawDir, "imported.jsonl");
    const lines = sanitized.value.map((entry) => JSON.stringify(entry));

    // Append if file exists
    if (existsSync(outPath)) {
      appendFileSync(outPath, lines.join("\n") + "\n", "utf-8");
    } else {
      writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
    }
  }

  return {
    sources: { imported: { files: result.filesScanned, entries: result.entries.length, errors: result.errors } },
    totalEntries: result.entries.length,
    totalFiles: result.filesScanned,
    outputDir: rawDir,
    sensitiveValuesRedacted: sanitized.count,
    rawArtifactsWritten: writeRaw && sanitized.value.length > 0,
  };
}
