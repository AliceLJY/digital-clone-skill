/**
 * Sensitive-data sanitization shared by ingest and refine.
 *
 * Ingest must call this module before serializing corpus entries so plaintext
 * secrets are never staged in clone-workspace/raw/ and overwritten later.
 */

import type { CorpusEntry } from "./parsers.js";

export interface SanitizationResult<T> {
  value: T;
  count: number;
}

const SENSITIVE_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  {
    regex: /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)* PRIVATE KEY-----/g,
    replacement: "[PRIVATE_KEY_REDACTED]",
  },
  {
    regex: /\b(?:[a-z][a-z0-9+.-]*:\/\/)(?:[^/\s:@]+):(?:[^@\s/]+)@/gi,
    replacement: "[URL_CREDENTIALS_REDACTED]@",
  },
  { regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replacement: "[JWT_REDACTED]" },
  { regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replacement: "[AWS_ACCESS_KEY_REDACTED]" },
  { regex: /\bAIza[0-9A-Za-z_-]{30,50}\b/g, replacement: "[GOOGLE_API_KEY_REDACTED]" },
  { regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, replacement: "[GITHUB_TOKEN_REDACTED]" },
  { regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, replacement: "[GITHUB_TOKEN_REDACTED]" },
  { regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, replacement: "[SLACK_TOKEN_REDACTED]" },
  { regex: /\b(?:xai-|jina_|npm_|hf_|glpat-)[A-Za-z0-9_-]{16,}\b/g, replacement: "[PROVIDER_TOKEN_REDACTED]" },
  { regex: /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g, replacement: "[BOT_TOKEN_REDACTED]" },
  { regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, replacement: "Bearer [TOKEN_REDACTED]" },
  { regex: /\b(?:sk|pk)-(?:proj-)?[A-Za-z0-9_-]{16,}\b/gi, replacement: "[API_KEY_REDACTED]" },
  {
    regex: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password|passwd|pwd)\b(?:\s*[_=:：]\s*|\s+is\s+)["']?[^\s"'`,;\[\]]{8,}["']?/gi,
    replacement: "[SECRET_REDACTED]",
  },
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[EMAIL_REDACTED]" },
  { regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g, replacement: "[PHONE_REDACTED]" },
  {
    regex: /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g,
    replacement: "[PHONE_REDACTED]",
  },
  {
    regex: /\b\d{1,5}\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/gi,
    replacement: "[ADDRESS_REDACTED]",
  },
];

export function sanitizeSensitiveText(text: string): SanitizationResult<string> {
  let count = 0;
  let value = text;

  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    value = value.replace(regex, () => {
      count++;
      return replacement;
    });
  }

  return { value, count };
}

export function sanitizeCorpusEntry(entry: CorpusEntry): SanitizationResult<CorpusEntry> {
  let count = 0;

  const text = sanitizeSensitiveText(entry.text);
  count += text.count;

  const file = sanitizeSensitiveText(entry.file);
  count += file.count;

  const sessionId = sanitizeSensitiveText(entry.sessionId);
  count += sessionId.count;

  return {
    value: {
      ...entry,
      text: text.value,
      file: file.value,
      sessionId: sessionId.value,
    },
    count,
  };
}

export function sanitizeCorpusEntries(entries: CorpusEntry[]): SanitizationResult<CorpusEntry[]> {
  const value: CorpusEntry[] = [];
  let count = 0;

  for (const entry of entries) {
    const sanitized = sanitizeCorpusEntry(entry);
    value.push(sanitized.value);
    count += sanitized.count;
  }

  return { value, count };
}
