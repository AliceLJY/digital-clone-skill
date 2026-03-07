/**
 * Configuration management for Digital Clone
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface CloneConfig {
  target: string;
  mode: "self" | "mentor";
  workspace: string;
  sources: {
    cc: { path: string; enabled: boolean };
    codex: { path: string; enabled: boolean };
    gemini: { path: string; enabled: boolean };
    memory: { path: string; enabled: boolean };
    articles: { path: string; enabled: boolean };
  };
}

const DEFAULT_CONFIG: CloneConfig = {
  target: "",
  mode: "self",
  workspace: "./clone-workspace",
  sources: {
    cc: { path: "auto", enabled: true },
    codex: { path: "~/.codex/sessions", enabled: true },
    gemini: { path: "~/.gemini/tmp", enabled: true },
    memory: { path: "auto", enabled: true },
    articles: { path: "", enabled: false },
  },
};

export function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Auto-detect Claude Code transcript directory.
 * Looks for the most recently modified project dir with .jsonl files.
 */
export function detectCCTranscriptDir(): string | null {
  const base = expandHome("~/.claude/projects");
  if (!existsSync(base)) return null;

  const { readdirSync, statSync } = require("node:fs");
  const dirs: Array<{ path: string; mtime: number }> = [];

  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(base, entry.name);
    const files = readdirSync(full).filter((f: string) => f.endsWith(".jsonl"));
    if (files.length > 0) {
      dirs.push({ path: full, mtime: statSync(full).mtimeMs });
    }
  }

  if (dirs.length === 0) return null;
  dirs.sort((a, b) => b.mtime - a.mtime);
  return dirs[0].path;
}

/**
 * Auto-detect memory directory (look for writing-persona.md or similar).
 */
export function detectMemoryDir(): string | null {
  const base = expandHome("~/.claude/projects");
  if (!existsSync(base)) return null;

  const { readdirSync } = require("node:fs");

  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const memDir = join(base, entry.name, "memory");
    if (existsSync(memDir)) return memDir;
  }

  return null;
}

export function loadConfig(configPath?: string): CloneConfig {
  const paths = [
    configPath,
    "config.json",
    join(expandHome("~/.config/digital-clone"), "config.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, "utf-8"));
        return { ...DEFAULT_CONFIG, ...raw, sources: { ...DEFAULT_CONFIG.sources, ...raw.sources } };
      } catch {
        // Skip malformed config
      }
    }
  }

  return DEFAULT_CONFIG;
}

export function resolveSourcePath(config: CloneConfig, source: string): string | null {
  const src = config.sources[source as keyof typeof config.sources];
  if (!src || !src.enabled) return null;

  if (src.path === "auto") {
    if (source === "cc") return detectCCTranscriptDir();
    if (source === "memory") return detectMemoryDir();
    return null;
  }

  const resolved = expandHome(src.path);
  return existsSync(resolved) ? resolved : null;
}
