#!/usr/bin/env bun
/**
 * Digital Clone CLI
 */

import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, expandHome, type CloneConfig } from "./config.js";
import { ingest, importDir } from "./ingest.js";
import { refine } from "./refine.js";
import { assessQuality } from "./quality.js";
import { generateTestCases, generateDeployGuide } from "./templates.js";

const program = new Command();

program
  .name("clone")
  .description("Digital Clone — corpus-driven persona toolkit")
  .version("2.0.0");

// --- init ---
program
  .command("init")
  .description("Initialize a clone workspace")
  .option("--target <name>", "Clone target name")
  .option("--mode <mode>", "self or mentor", "self")
  .action((opts) => {
    const config = loadConfig();
    config.target = opts.target || "";
    config.mode = opts.mode;

    mkdirSync(config.workspace, { recursive: true });
    mkdirSync(join(config.workspace, "raw"), { recursive: true });
    mkdirSync(join(config.workspace, "refined"), { recursive: true });

    writeFileSync("config.json", JSON.stringify(config, null, 2), "utf-8");
    console.log(`Workspace initialized: ${config.workspace}`);
    console.log(`Mode: ${config.mode}`);
    if (config.target) console.log(`Target: ${config.target}`);
    console.log(`Config saved to config.json`);
  });

// --- ingest ---
program
  .command("ingest")
  .description("Scan and collect corpus from configured sources")
  .option("--source <source>", "Source to scan: cc, codex, gemini, memory, articles, all", "all")
  .option("--path <path>", "Override source path (for articles)")
  .action((opts) => {
    const config = loadConfig();
    ensureWorkspace(config);

    if (opts.path && opts.source === "articles") {
      config.sources.articles = { path: opts.path, enabled: true };
    }

    console.log("Ingesting corpus...\n");
    const summary = ingest(config, opts.source);
    console.log(`\nDone: ${summary.totalFiles} files, ${summary.totalEntries} entries`);
    console.log(`Output: ${summary.outputDir}`);
  });

// --- import ---
program
  .command("import <path>")
  .description("Import external files into raw/ (Mentor Mode)")
  .action((importPath) => {
    const config = loadConfig();
    ensureWorkspace(config);

    console.log(`Importing from ${importPath}...\n`);
    const summary = importDir(config, importPath);
    console.log(`\nDone: ${summary.totalFiles} files, ${summary.totalEntries} entries`);
  });

// --- refine ---
program
  .command("refine")
  .description("Clean, deduplicate, and sanitize raw corpus")
  .option("--skip-sanitize", "Skip PII sanitization")
  .option("--quality-only", "Only generate quality report, no cleaning")
  .action((opts) => {
    const config = loadConfig();

    if (opts.qualityOnly) {
      console.log("Assessing quality...\n");
      const report = assessQuality(config.workspace);
      console.log(`\nOverall: ${report.overall.toUpperCase()}`);
      console.log(`Report: ${config.workspace}/quality-report.md`);
      return;
    }

    console.log("Refining corpus...\n");
    const result = refine(config.workspace, { skipSanitize: opts.skipSanitize });
    console.log(`\nDone: ${result.totalInput} → ${result.totalOutput} entries`);
    console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
    console.log(`PII redacted: ${result.piiRedacted}`);
    console.log(`Output: ${result.outputDir}`);
  });

// --- quality ---
program
  .command("quality")
  .description("Generate corpus quality report")
  .action(() => {
    const config = loadConfig();
    console.log("Assessing quality...\n");
    const report = assessQuality(config.workspace);
    console.log(`Volume: ${report.volume.totalEntries} entries, ~${report.volume.totalTokensEstimate.toLocaleString()} tokens`);
    console.log(`Purity: ${(report.purity.ratio * 100).toFixed(1)}% first-hand`);
    console.log(`Coverage: ${report.coverage.topicCount} topics`);
    console.log(`Date range: ${report.recency.dateRange}`);
    console.log(`\nOverall: ${report.overall.toUpperCase()}`);
    console.log(`Report: ${config.workspace}/quality-report.md`);
  });

// --- stats ---
program
  .command("stats")
  .description("Show corpus statistics")
  .action(() => {
    const config = loadConfig();
    const rawDir = join(config.workspace, "raw");
    const refinedDir = join(config.workspace, "refined");

    console.log("Corpus Statistics\n");

    if (existsSync(rawDir)) {
      const rawFiles = readdirSync(rawDir);
      let rawEntries = 0;
      for (const f of rawFiles.filter((f) => f.endsWith(".jsonl"))) {
        rawEntries += readFileSync(join(rawDir, f), "utf-8").split("\n").filter((l) => l.trim()).length;
      }
      console.log(`Raw: ${rawFiles.length} files, ${rawEntries} entries`);
    } else {
      console.log("Raw: (not yet ingested)");
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
      console.log(`Refined: ${refinedFiles.length} files, ${refinedEntries} entries, ${(totalSize / 1024).toFixed(1)}KB`);
    } else {
      console.log("Refined: (not yet refined)");
    }
  });

// --- verify-template ---
program
  .command("verify-template")
  .description("Generate verification test case template")
  .option("--target <name>", "Clone target name")
  .action((opts) => {
    const config = loadConfig();
    const target = opts.target || config.target || "Unknown Target";
    const path = generateTestCases(config.workspace, target);
    console.log(`Test cases template: ${path}`);
  });

// --- deploy-guide ---
program
  .command("deploy-guide")
  .description("Generate deployment guide")
  .option("--platform <platform>", "notebooklm, ccbot, or generic", "generic")
  .option("--target <name>", "Clone target name")
  .action((opts) => {
    const config = loadConfig();
    const target = opts.target || config.target || "Unknown Target";
    const path = generateDeployGuide(config.workspace, target, opts.platform);
    console.log(`Deploy guide: ${path}`);
  });

// --- refresh ---
program
  .command("refresh")
  .description("Incremental update: ingest new conversations + recallnest memories, refine, append to corpus")
  .option("--source <source>", "Source to refresh: cc, codex, gemini, memory, all", "all")
  .option("--days <n>", "Only include recallnest memories from last N days", "14")
  .option("--skip-recallnest", "Skip recallnest memory export")
  .action((opts) => {
    const config = loadConfig();
    ensureWorkspace(config);

    const refreshDir = join(config.workspace, "refreshed");
    mkdirSync(refreshDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 10);
    const trackerPath = join(config.workspace, ".last-refresh");

    // Read last refresh time
    let lastRefresh = 0;
    if (existsSync(trackerPath)) {
      try {
        lastRefresh = Number(readFileSync(trackerPath, "utf-8").trim());
      } catch { /* first run */ }
    }

    console.log(`🔄 Clone Refresh — 增量更新语料`);
    console.log(`  上次刷新: ${lastRefresh ? new Date(lastRefresh).toISOString().slice(0, 10) : "从未"}`);
    console.log(``);

    // Step 1: Ingest new conversations
    console.log(`📝 Step 1: 采集新对话...`);
    const ingestResult = ingest(config, opts.source);

    // Step 2: Export recallnest memories (if available)
    if (!opts.skipRecallnest) {
      console.log(`\n🧠 Step 2: 导出 RecallNest 记忆...`);
      const recallnestCli = expandHome("~/recallnest/lm");
      const days = opts.days || "14";

      if (existsSync(recallnestCli)) {
        const exportPath = join(refreshDir, `recallnest-${timestamp}.md`);
        try {
          const { execFileSync } = require("node:child_process");
          execFileSync(
            recallnestCli,
            ["export-memories", "--days", days, "--output", exportPath],
            { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 },
          );
          console.log(`  ✅ 导出到 ${exportPath}`);
        } catch (err: any) {
          console.log(`  ⚠️ RecallNest 导出失败: ${err.message || err}`);
        }
      } else {
        console.log(`  ⚠️ RecallNest CLI 未找到 (${recallnestCli})，跳过`);
      }
    } else {
      console.log(`\n🧠 Step 2: 跳过 RecallNest 导出`);
    }

    // Step 3: Refine (processes everything in raw/)
    console.log(`\n✨ Step 3: 清洗 & 去重...`);
    const refineResult = refine(config.workspace);

    // Step 4: Copy refreshed content summary
    const summaryLines = [
      `# Clone Refresh ${timestamp}`,
      ``,
      `- 上次刷新: ${lastRefresh ? new Date(lastRefresh).toISOString().slice(0, 10) : "首次"}`,
      `- 采集: ${ingestResult.totalFiles} files, ${ingestResult.totalEntries} entries`,
      `- 精炼: ${refineResult.totalInput} → ${refineResult.totalOutput} entries`,
      `- 去重: ${refineResult.duplicatesRemoved}`,
      `- PII: ${refineResult.piiRedacted} redacted`,
      ``,
      `## 下一步`,
      ``,
      `将 refined/ 目录下的更新文件上传到 NotebookLM 语料库，`,
      `让数字分身「小试AI」获得最新记忆。`,
      ``,
      `需要更新的文件:`,
    ];

    const refinedDir = join(config.workspace, "refined");
    if (existsSync(refinedDir)) {
      for (const f of readdirSync(refinedDir).filter(f => f.endsWith(".md"))) {
        const size = statSync(join(refinedDir, f)).size;
        summaryLines.push(`- ${f} (${(size / 1024).toFixed(1)}KB)`);
      }
    }

    const summaryPath = join(refreshDir, `refresh-${timestamp}.md`);
    writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");

    // Update tracker
    writeFileSync(trackerPath, String(Date.now()), "utf-8");

    console.log(`\n✅ 刷新完成！`);
    console.log(`  报告: ${summaryPath}`);
    console.log(`  精炼: ${refinedDir}`);
    console.log(`\n📤 下一步: 将 refined/ 文件上传到 NotebookLM 更新分身语料`);
  });

function ensureWorkspace(config: CloneConfig) {
  mkdirSync(config.workspace, { recursive: true });
  mkdirSync(join(config.workspace, "raw"), { recursive: true });
}

program.parse();
