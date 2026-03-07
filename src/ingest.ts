/**
 * Ingest — scan multiple sources and write raw corpus to clone-workspace/raw/
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
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

export interface IngestSummary {
  sources: Record<string, { files: number; entries: number; errors: string[] }>;
  totalEntries: number;
  totalFiles: number;
  outputDir: string;
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
): IngestSummary {
  const rawDir = join(config.workspace, "raw");
  mkdirSync(rawDir, { recursive: true });

  const summary: IngestSummary = {
    sources: {},
    totalEntries: 0,
    totalFiles: 0,
    outputDir: rawDir,
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

    // Write entries to raw/ as jsonl
    if (result.entries.length > 0) {
      const outPath = join(rawDir, `${source}.jsonl`);
      const lines = result.entries.map((e) => JSON.stringify(e));
      writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
    }

    summary.sources[source] = {
      files: result.filesScanned,
      entries: result.entries.length,
      errors: result.errors,
    };
    summary.totalEntries += result.entries.length;
    summary.totalFiles += result.filesScanned;

    console.log(`  ${source}: ${result.filesScanned} files, ${result.entries.length} entries`);
    if (result.errors.length > 0) {
      console.log(`  ${source}: ${result.errors.length} errors`);
    }
  }

  return summary;
}

/**
 * Import external files into raw/ (for Mentor Mode).
 * Copies files from a user-specified directory.
 */
export function importDir(
  config: CloneConfig,
  importPath: string,
): IngestSummary {
  const rawDir = join(config.workspace, "raw");
  mkdirSync(rawDir, { recursive: true });

  const result = parseArticlesDir(importPath);
  if (result.entries.length > 0) {
    const outPath = join(rawDir, "imported.jsonl");
    const lines = result.entries.map((e) => JSON.stringify({ ...e, source: "articles" }));

    // Append if file exists
    const { appendFileSync } = require("node:fs");
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
  };
}
