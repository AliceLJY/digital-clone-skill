#!/usr/bin/env bun
/**
 * Digital Clone MCP Server
 *
 * Exposes corpus management tools so any MCP-compatible AI client
 * can drive the data pipeline (ingest, refine, quality).
 * Soul Forging stays in the Skill — tools handle the mechanical work.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { ingest, importDir } from "./ingest.js";
import { refine } from "./refine.js";
import { assessQuality } from "./quality.js";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const config = loadConfig();

const server = new McpServer({
  name: "digital-clone",
  version: "2.0.0",
});

// --- clone_ingest ---
server.tool(
  "clone_ingest",
  "Scan and collect corpus from configured sources (cc, codex, gemini, memory, articles, or all)",
  {
    source: z.enum(["cc", "codex", "gemini", "memory", "articles", "all"]).default("all").describe("Source to scan"),
  },
  async ({ source }) => {
    const summary = ingest(config, source);
    const lines = [
      `Ingest complete: ${summary.totalFiles} files, ${summary.totalEntries} entries`,
      "",
      "By source:",
      ...Object.entries(summary.sources).map(([src, data]) =>
        `  ${src}: ${data.files} files, ${data.entries} entries${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ""}`,
      ),
    ];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
);

// --- clone_refine ---
server.tool(
  "clone_refine",
  "Clean, deduplicate, and sanitize raw corpus. Run after ingest.",
  {
    skip_sanitize: z.boolean().default(false).describe("Skip PII sanitization (useful for own corpus)"),
  },
  async ({ skip_sanitize }) => {
    const result = refine(config.workspace, { skipSanitize: skip_sanitize });
    return {
      content: [{
        type: "text" as const,
        text: [
          `Refine complete: ${result.totalInput} → ${result.totalOutput} entries`,
          `Duplicates removed: ${result.duplicatesRemoved}`,
          `PII redacted: ${result.piiRedacted}`,
        ].join("\n"),
      }],
    };
  },
);

// --- clone_quality ---
server.tool(
  "clone_quality",
  "Assess corpus quality and generate quality-report.md",
  {},
  async () => {
    const report = assessQuality(config.workspace);
    return {
      content: [{
        type: "text" as const,
        text: [
          `Quality: ${report.overall.toUpperCase()}`,
          `Volume: ${report.volume.totalEntries} entries, ~${report.volume.totalTokensEstimate.toLocaleString()} tokens`,
          `Purity: ${(report.purity.ratio * 100).toFixed(1)}% first-hand`,
          `Coverage: ${report.coverage.topicCount} topics`,
          `Date range: ${report.recency.dateRange}`,
          report.coverage.blindSpots.length > 0 ? `Blind spots: ${report.coverage.blindSpots.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
      }],
    };
  },
);

// --- clone_stats ---
server.tool(
  "clone_stats",
  "Show corpus statistics (raw + refined counts)",
  {},
  async () => {
    const rawDir = join(config.workspace, "raw");
    const refinedDir = join(config.workspace, "refined");
    const lines: string[] = [];

    if (existsSync(rawDir)) {
      const rawFiles = readdirSync(rawDir).filter((f) => f.endsWith(".jsonl"));
      let rawEntries = 0;
      for (const f of rawFiles) {
        rawEntries += readFileSync(join(rawDir, f), "utf-8").split("\n").filter((l) => l.trim()).length;
      }
      lines.push(`Raw: ${rawFiles.length} files, ${rawEntries} entries`);
    } else {
      lines.push("Raw: not yet ingested");
    }

    if (existsSync(refinedDir)) {
      const refinedFiles = readdirSync(refinedDir);
      let refinedEntries = 0;
      let totalSize = 0;
      for (const f of refinedFiles) {
        const fp = join(refinedDir, f);
        totalSize += statSync(fp).size;
        if (f.endsWith(".jsonl")) {
          refinedEntries += readFileSync(fp, "utf-8").split("\n").filter((l) => l.trim()).length;
        }
      }
      lines.push(`Refined: ${refinedFiles.length} files, ${refinedEntries} entries, ${(totalSize / 1024).toFixed(1)}KB`);
    } else {
      lines.push("Refined: not yet refined");
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
);

// --- clone_read_corpus ---
server.tool(
  "clone_read_corpus",
  "Read a slice of the refined corpus (for AI to do personality extraction / Soul Forging)",
  {
    source: z.string().optional().describe("Source filter: cc, codex, gemini, memory, articles"),
    role: z.enum(["user", "assistant", "both"]).default("user").describe("Filter by role"),
    offset: z.number().default(0).describe("Start index"),
    limit: z.number().min(1).max(100).default(20).describe("Max entries to return"),
  },
  async ({ source, role, offset, limit }) => {
    const refinedDir = join(config.workspace, "refined");
    if (!existsSync(refinedDir)) {
      return { content: [{ type: "text" as const, text: "No refined corpus found. Run clone_refine first." }] };
    }

    // Load entries
    const allEntries: Array<{ text: string; role: string; source: string }> = [];
    const files = readdirSync(refinedDir).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      if (source && !f.startsWith(source)) continue;
      const lines = readFileSync(join(refinedDir, f), "utf-8").split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (role !== "both" && entry.role !== role) continue;
          allEntries.push(entry);
        } catch { /* skip */ }
      }
    }

    const slice = allEntries.slice(offset, offset + limit);
    if (slice.length === 0) {
      return { content: [{ type: "text" as const, text: `No entries found (total: ${allEntries.length}, offset: ${offset})` }] };
    }

    const text = slice.map((e, i) => `[${offset + i}] [${e.source}/${e.role}] ${e.text}`).join("\n\n---\n\n");
    return {
      content: [{
        type: "text" as const,
        text: `Showing ${slice.length} of ${allEntries.length} entries (offset ${offset}):\n\n${text}`,
      }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
