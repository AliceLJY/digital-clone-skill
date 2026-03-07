/**
 * Corpus parsers — extract text from various AI conversation formats.
 * Adapted from RecallNest's ingest.ts, stripped of embedding/store dependencies.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { expandHome } from "./config.js";

export interface CorpusEntry {
  text: string;
  role: "user" | "assistant";
  timestamp: string;
  sessionId: string;
  source: "cc" | "codex" | "gemini" | "memory" | "articles";
  file: string;
}

export interface ParseResult {
  entries: CorpusEntry[];
  filesScanned: number;
  errors: string[];
}

// ============================================================================
// CC Transcript Parser
// ============================================================================

function parseCCTranscript(filePath: string): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const file = basename(filePath);
  let sessionId = "";

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (!sessionId && obj.sessionId) sessionId = obj.sessionId;

      if ((obj.type === "user" || obj.type === "assistant") && obj.message) {
        const msg = obj.message;
        let text = "";
        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text || "")
            .join("\n");
        }

        const minLen = obj.type === "user" ? 10 : 20;
        if (text.trim().length > minLen) {
          entries.push({
            text: text.trim(),
            role: obj.type as "user" | "assistant",
            timestamp: obj.timestamp || "",
            sessionId,
            source: "cc",
            file,
          });
        }
      }
    } catch { /* skip malformed */ }
  }

  return entries;
}

export function parseCCDir(dirPath: string): ParseResult {
  const result: ParseResult = { entries: [], filesScanned: 0, errors: [] };
  const dir = expandHome(dirPath);
  if (!existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();
  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const stat = statSync(filePath);
      if (stat.size < 500) continue;
      const entries = parseCCTranscript(filePath);
      result.entries.push(...entries);
      result.filesScanned++;
    } catch (err: any) {
      result.errors.push(`Error parsing ${file}: ${err.message}`);
    }
  }

  return result;
}

// ============================================================================
// Codex Session Parser
// ============================================================================

function parseCodexSession(filePath: string): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const file = basename(filePath);
  let sessionId = "";

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const payload = obj.payload;
      const timestamp = obj.timestamp || "";

      if (obj.type === "session_meta" && payload?.id) sessionId = payload.id;

      if (obj.type === "response_item" && payload) {
        const role = payload.role;
        const content = payload.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c.type === "input_text" && c.text && c.text.length > 10) {
              if (role === "developer" || c.text.includes("<permissions instructions>")) continue;
              entries.push({ text: c.text.trim(), role: "user", timestamp, sessionId, source: "codex", file });
            }
            if (c.type === "output_text" && c.text && c.text.length > 20) {
              entries.push({ text: c.text.trim(), role: "assistant", timestamp, sessionId, source: "codex", file });
            }
          }
        }
      }

      if (obj.type === "event_msg" && payload?.type === "user_message") {
        const msg = payload.message;
        if (msg && typeof msg === "string" && msg.length > 10) {
          const last = entries[entries.length - 1];
          if (!last || last.text !== msg.trim()) {
            entries.push({ text: msg.trim(), role: "user", timestamp, sessionId, source: "codex", file });
          }
        }
      }
    } catch { /* skip */ }
  }

  return entries;
}

export function parseCodexDir(dirPath: string): ParseResult {
  const result: ParseResult = { entries: [], filesScanned: 0, errors: [] };
  const dir = expandHome(dirPath);
  if (!existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const allFiles: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".jsonl")) allFiles.push(full);
    }
  }
  walk(dir);

  for (const filePath of allFiles) {
    try {
      const stat = statSync(filePath);
      if (stat.size < 200) continue;
      const entries = parseCodexSession(filePath);
      result.entries.push(...entries);
      result.filesScanned++;
    } catch (err: any) {
      result.errors.push(`Error parsing ${basename(filePath)}: ${err.message}`);
    }
  }

  return result;
}

// ============================================================================
// Gemini Session Parser
// ============================================================================

function parseGeminiSession(filePath: string): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  const file = basename(filePath);

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const sessionId = data.sessionId || basename(filePath, ".json");
    const messages = data.messages || [];

    for (const msg of messages) {
      if (msg.type === "info") continue;
      let text = "";
      if (typeof msg.content === "string") {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        text = msg.content.filter((c: any) => c.text).map((c: any) => c.text).join("\n");
      }
      if (text.trim().length < 10) continue;

      entries.push({
        text: text.trim(),
        role: msg.type === "user" ? "user" : "assistant",
        timestamp: data.startTime || "",
        sessionId,
        source: "gemini",
        file,
      });
    }
  } catch { /* skip */ }

  return entries;
}

export function parseGeminiDir(dirPath: string): ParseResult {
  const result: ParseResult = { entries: [], filesScanned: 0, errors: [] };
  const dir = expandHome(dirPath);
  if (!existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const allFiles: string[] = [];
  function walk(d: string) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.startsWith("session-") && entry.name.endsWith(".json")) allFiles.push(full);
      }
    } catch { /* skip */ }
  }
  walk(dir);

  for (const filePath of allFiles) {
    try {
      const stat = statSync(filePath);
      if (stat.size < 100) continue;
      const entries = parseGeminiSession(filePath);
      result.entries.push(...entries);
      result.filesScanned++;
    } catch (err: any) {
      result.errors.push(`Error parsing ${basename(filePath)}: ${err.message}`);
    }
  }

  return result;
}

// ============================================================================
// Markdown Parser
// ============================================================================

export function parseMarkdownDir(dirPath: string): ParseResult {
  const result: ParseResult = { entries: [], filesScanned: 0, errors: [] };
  const dir = expandHome(dirPath);
  if (!existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      if (content.trim().length < 30) continue;

      // Split by headings
      const sections = content.split(/^(#{1,3}\s+.+)$/m);
      let heading = basename(file, ".md");
      let sectionText = "";

      for (const section of sections) {
        if (/^#{1,3}\s+/.test(section)) {
          if (sectionText.trim().length > 30) {
            result.entries.push({
              text: `[${heading}] ${sectionText.trim()}`,
              role: "user",
              timestamp: "",
              sessionId: "",
              source: "memory",
              file,
            });
          }
          heading = section.replace(/^#+\s+/, "").trim();
          sectionText = "";
        } else {
          sectionText += section;
        }
      }
      if (sectionText.trim().length > 30) {
        result.entries.push({
          text: `[${heading}] ${sectionText.trim()}`,
          role: "user",
          timestamp: "",
          sessionId: "",
          source: "memory",
          file,
        });
      }

      result.filesScanned++;
    } catch (err: any) {
      result.errors.push(`Error parsing ${file}: ${err.message}`);
    }
  }

  return result;
}

// ============================================================================
// Articles Parser (plain text / markdown files from a user-specified dir)
// ============================================================================

export function parseArticlesDir(dirPath: string): ParseResult {
  const result: ParseResult = { entries: [], filesScanned: 0, errors: [] };
  const dir = expandHome(dirPath);
  if (!existsSync(dir)) {
    result.errors.push(`Directory not found: ${dir}`);
    return result;
  }

  const files = readdirSync(dir).filter((f) =>
    f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".html"),
  );

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      let content = readFileSync(filePath, "utf-8");

      // Strip HTML tags for .html files
      if (file.endsWith(".html")) {
        content = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      }

      if (content.trim().length < 50) continue;

      result.entries.push({
        text: content.trim(),
        role: "user",
        timestamp: "",
        sessionId: "",
        source: "articles",
        file,
      });
      result.filesScanned++;
    } catch (err: any) {
      result.errors.push(`Error parsing ${file}: ${err.message}`);
    }
  }

  return result;
}
