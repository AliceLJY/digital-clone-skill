/**
 * Corpus-readiness assessment — measures whether the refined corpus is
 * sufficient for personality extraction. It does not measure clone quality.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CorpusEntry } from "./parsers.js";

export const CORPUS_READINESS_REPORT = "corpus-readiness-report.md";

export type CorpusReadinessLevel = "high" | "ready" | "developing" | "insufficient";

export interface CorpusReadinessReport {
  volume: { totalEntries: number; totalTokensEstimate: number; userEntries: number; assistantEntries: number; sufficient: boolean };
  purity: { firstHand: number; secondHand: number; ratio: number };
  coverage: { topics: Record<string, number>; topicCount: number; blindSpots: string[] };
  recency: { earliest: string; latest: string; dateRange: string };
  readiness: CorpusReadinessLevel;
}

function estimateTokens(text: string): number {
  // Rough: 1 token ~ 1.5 chars for mixed Chinese/English
  return Math.round(text.length / 1.5);
}

/**
 * Simple keyword-based topic detection.
 * This is a corpus-coverage signal, not an evaluation of the resulting clone.
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "AI/ML": ["AI", "模型", "GPT", "Claude", "LLM", "machine learning", "embedding", "prompt", "agent"],
  "Programming": ["代码", "bug", "API", "函数", "TypeScript", "Python", "Docker", "git", "npm", "bun"],
  "Writing": ["写作", "文章", "公众号", "标题", "风格", "文案", "排版"],
  "Philosophy": ["思考", "价值", "信念", "原则", "意义", "哲学"],
  "Business": ["产品", "用户", "增长", "商业", "创业", "市场"],
  "Personal": ["生活", "感受", "经历", "记忆", "朋友", "家"],
  "Tools": ["工具", "配置", "设置", "安装", "部署", "脚本"],
};

function detectTopics(entries: CorpusEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let count = 0;
    for (const entry of entries) {
      const lower = entry.text.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) count++;
    }
    if (count > 0) counts[topic] = count;
  }
  return counts;
}

export function assessCorpusReadiness(workspaceDir: string): CorpusReadinessReport {
  mkdirSync(workspaceDir, { recursive: true });
  const refinedDir = join(workspaceDir, "refined");

  const allEntries: CorpusEntry[] = [];
  if (existsSync(refinedDir)) {
    const files = readdirSync(refinedDir).filter((f) => f.endsWith(".jsonl"));
    for (const file of files) {
      const lines = readFileSync(join(refinedDir, file), "utf-8").split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try { allEntries.push(JSON.parse(line)); } catch { /* skip malformed entries */ }
      }
    }
  }

  const userEntries = allEntries.filter((entry) => entry.role === "user");
  const assistantEntries = allEntries.filter((entry) => entry.role === "assistant");
  const allText = allEntries.map((entry) => entry.text).join("\n");
  const totalTokens = estimateTokens(allText);

  const firstHand = allEntries.filter((entry) => entry.role === "user" || entry.source === "memory" || entry.source === "articles").length;
  const secondHand = allEntries.filter((entry) => entry.role === "assistant").length;

  const topics = detectTopics(userEntries.length > 0 ? userEntries : allEntries);
  const coveredTopics = Object.keys(topics);
  const allTopics = Object.keys(TOPIC_KEYWORDS);
  const blindSpots = allTopics.filter((topic) => !coveredTopics.includes(topic));

  const timestamps = allEntries
    .map((entry) => entry.timestamp)
    .filter((timestamp) => timestamp && timestamp.length >= 10)
    .sort();
  const earliest = timestamps[0] || "unknown";
  const latest = timestamps[timestamps.length - 1] || "unknown";

  const purityRatio = firstHand / Math.max(1, firstHand + secondHand);
  let readiness: CorpusReadinessLevel = "insufficient";
  if (totalTokens >= 200000 && purityRatio > 0.4 && coveredTopics.length >= 4) {
    readiness = "high";
  } else if (totalTokens >= 50000 && purityRatio > 0.4 && coveredTopics.length >= 3) {
    readiness = "ready";
  } else if (totalTokens >= 20000) {
    readiness = "developing";
  }

  const report: CorpusReadinessReport = {
    volume: {
      totalEntries: allEntries.length,
      totalTokensEstimate: totalTokens,
      userEntries: userEntries.length,
      assistantEntries: assistantEntries.length,
      sufficient: totalTokens >= 50000,
    },
    purity: {
      firstHand,
      secondHand,
      ratio: purityRatio,
    },
    coverage: {
      topics,
      topicCount: coveredTopics.length,
      blindSpots,
    },
    recency: {
      earliest: earliest.slice(0, 10),
      latest: latest.slice(0, 10),
      dateRange: earliest !== "unknown" && latest !== "unknown"
        ? `${earliest.slice(0, 10)} ~ ${latest.slice(0, 10)}`
        : "unknown",
    },
    readiness,
  };

  writeFileSync(join(workspaceDir, CORPUS_READINESS_REPORT), formatCorpusReadinessReport(report), "utf-8");
  return report;
}

export function formatCorpusReadinessReport(report: CorpusReadinessReport): string {
  const purityPct = (report.purity.ratio * 100).toFixed(1);
  const topicLines = Object.entries(report.coverage.topics)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => `| ${topic} | ${count} |`);

  return `# Corpus Readiness Report

This report measures corpus sufficiency for personality extraction. It does not score the quality or fidelity of a generated clone.

## Volume

| Metric | Value |
|--------|-------|
| Total entries | ${report.volume.totalEntries} |
| Estimated tokens | ${report.volume.totalTokensEstimate.toLocaleString()} |
| User entries | ${report.volume.userEntries} |
| Assistant entries | ${report.volume.assistantEntries} |
| Sufficient (>50K tokens) | ${report.volume.sufficient ? "Yes" : "No"} |

## First-hand Share

| Metric | Value |
|--------|-------|
| First-hand (user/memory/articles) | ${report.purity.firstHand} |
| Second-hand (assistant) | ${report.purity.secondHand} |
| First-hand ratio | ${purityPct}% |

## Coverage

| Topic | Entries |
|-------|---------|
${topicLines.join("\n")}

Covered topics: ${report.coverage.topicCount} / ${Object.keys(TOPIC_KEYWORDS).length}
${report.coverage.blindSpots.length > 0 ? `\nBlind spots: ${report.coverage.blindSpots.join(", ")}` : ""}

## Recency

Date range: ${report.recency.dateRange}

## Overall Corpus Readiness

**${report.readiness.toUpperCase()}**

${report.readiness === "insufficient" ? "Recommendation: collect more corpus material before proceeding to Soul Forging." : ""}
${report.readiness === "developing" ? "Recommendation: supplement the corpus with more first-hand material and topic coverage." : ""}
${report.readiness === "ready" || report.readiness === "high" ? "The corpus has enough material to proceed to Soul Forging (Stage 4); final clone fidelity still requires verification." : ""}
`;
}
