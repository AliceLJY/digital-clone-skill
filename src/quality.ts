/**
 * Quality assessment — analyze refined corpus and generate quality-report.md
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { CorpusEntry } from "./parsers.js";

export interface QualityReport {
  volume: { totalEntries: number; totalTokensEstimate: number; userEntries: number; assistantEntries: number; sufficient: boolean };
  purity: { firstHand: number; secondHand: number; ratio: number };
  coverage: { topics: Record<string, number>; topicCount: number; blindSpots: string[] };
  recency: { earliest: string; latest: string; dateRange: string };
  consistency: { contradictions: string[] };
  overall: "excellent" | "good" | "fair" | "insufficient";
}

function estimateTokens(text: string): number {
  // Rough: 1 token ~ 1.5 chars for mixed Chinese/English
  return Math.round(text.length / 1.5);
}

/**
 * Simple keyword-based topic detection.
 * Not perfect, but good enough for a quality overview.
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

export function assessQuality(workspaceDir: string): QualityReport {
  const refinedDir = join(workspaceDir, "refined");

  // Load all refined entries
  const allEntries: CorpusEntry[] = [];
  if (existsSync(refinedDir)) {
    const files = readdirSync(refinedDir).filter((f) => f.endsWith(".jsonl"));
    for (const file of files) {
      const lines = readFileSync(join(refinedDir, file), "utf-8").split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try { allEntries.push(JSON.parse(line)); } catch { /* skip */ }
      }
    }
  }

  const userEntries = allEntries.filter((e) => e.role === "user");
  const assistantEntries = allEntries.filter((e) => e.role === "assistant");
  const allText = allEntries.map((e) => e.text).join("\n");
  const totalTokens = estimateTokens(allText);

  // First-hand = user messages + memory + articles; second-hand = assistant messages
  const firstHand = allEntries.filter((e) => e.role === "user" || e.source === "memory" || e.source === "articles").length;
  const secondHand = allEntries.filter((e) => e.role === "assistant").length;

  // Topics
  const topics = detectTopics(userEntries.length > 0 ? userEntries : allEntries);
  const coveredTopics = Object.keys(topics);
  const allTopics = Object.keys(TOPIC_KEYWORDS);
  const blindSpots = allTopics.filter((t) => !coveredTopics.includes(t));

  // Recency
  const timestamps = allEntries
    .map((e) => e.timestamp)
    .filter((t) => t && t.length >= 10)
    .sort();
  const earliest = timestamps[0] || "unknown";
  const latest = timestamps[timestamps.length - 1] || "unknown";

  // Overall assessment
  let overall: QualityReport["overall"] = "insufficient";
  if (totalTokens >= 200000 && firstHand / Math.max(1, firstHand + secondHand) > 0.4 && coveredTopics.length >= 4) {
    overall = "excellent";
  } else if (totalTokens >= 50000 && coveredTopics.length >= 3) {
    overall = "good";
  } else if (totalTokens >= 20000) {
    overall = "fair";
  }

  const report: QualityReport = {
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
      ratio: firstHand / Math.max(1, firstHand + secondHand),
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
    consistency: { contradictions: [] },
    overall,
  };

  // Write report
  const reportMd = formatQualityReport(report);
  writeFileSync(join(workspaceDir, "quality-report.md"), reportMd, "utf-8");

  return report;
}

function formatQualityReport(r: QualityReport): string {
  const purityPct = (r.purity.ratio * 100).toFixed(1);
  const topicLines = Object.entries(r.coverage.topics)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => `| ${topic} | ${count} |`);

  return `# Corpus Quality Report

## Volume

| Metric | Value |
|--------|-------|
| Total entries | ${r.volume.totalEntries} |
| Estimated tokens | ${r.volume.totalTokensEstimate.toLocaleString()} |
| User entries | ${r.volume.userEntries} |
| Assistant entries | ${r.volume.assistantEntries} |
| Sufficient (>50K tokens) | ${r.volume.sufficient ? "Yes" : "No"} |

## Purity

| Metric | Value |
|--------|-------|
| First-hand (user/memory/articles) | ${r.purity.firstHand} |
| Second-hand (assistant) | ${r.purity.secondHand} |
| First-hand ratio | ${purityPct}% |

## Coverage

| Topic | Entries |
|-------|---------|
${topicLines.join("\n")}

Covered topics: ${r.coverage.topicCount} / ${Object.keys(TOPIC_KEYWORDS).length}
${r.coverage.blindSpots.length > 0 ? `\nBlind spots: ${r.coverage.blindSpots.join(", ")}` : ""}

## Recency

Date range: ${r.recency.dateRange}

## Overall Assessment

**${r.overall.toUpperCase()}**

${r.overall === "insufficient" ? "Recommendation: collect more corpus material before proceeding to Soul Forging." : ""}
${r.overall === "fair" ? "Recommendation: consider supplementing with more first-hand material." : ""}
${r.overall === "good" || r.overall === "excellent" ? "Corpus is ready for Soul Forging (Stage 4)." : ""}
`;
}
