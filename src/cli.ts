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
import { assessCorpusReadiness, CORPUS_READINESS_REPORT } from "./readiness.js";
import { sanitizeSensitiveText } from "./sanitize.js";
import { generateTestCases, generateDeployGuide } from "./templates.js";

const program = new Command();

program
  .name("clone")
  .description("Digital Clone — corpus-driven persona toolkit")
  .version("3.3.0");

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
  .option("--no-raw", "Scan and redact in memory without writing raw corpus artifacts")
  .action((opts) => {
    const config = loadConfig();
    ensureWorkspace(config, { createRaw: opts.raw !== false });

    if (opts.path && opts.source === "articles") {
      config.sources.articles = { path: opts.path, enabled: true };
    }

    console.log("Ingesting corpus...\n");
    const summary = ingest(config, opts.source, { writeRaw: opts.raw !== false });
    console.log(`\nDone: ${summary.totalFiles} files, ${summary.totalEntries} entries`);
    console.log(`Sensitive values redacted before write: ${summary.sensitiveValuesRedacted}`);
    console.log(summary.rawArtifactsWritten
      ? `Sanitized pre-refinement output: ${summary.outputDir}`
      : opts.raw === false
        ? "Raw artifacts: not written (--no-raw)"
        : "Raw artifacts: not written (no entries)");
  });

// --- import ---
program
  .command("import <path>")
  .description("Import external files as sanitized pre-refinement corpus (Mentor Mode)")
  .option("--no-raw", "Scan and redact in memory without writing raw corpus artifacts")
  .action((importPath, opts) => {
    const config = loadConfig();
    ensureWorkspace(config, { createRaw: opts.raw !== false });

    console.log(`Importing from ${importPath}...\n`);
    const summary = importDir(config, importPath, { writeRaw: opts.raw !== false });
    console.log(`\nDone: ${summary.totalFiles} files, ${summary.totalEntries} entries`);
    console.log(`Sensitive values redacted before write: ${summary.sensitiveValuesRedacted}`);
    console.log(summary.rawArtifactsWritten
      ? `Sanitized pre-refinement output: ${summary.outputDir}`
      : opts.raw === false
        ? "Raw artifacts: not written (--no-raw)"
        : "Raw artifacts: not written (no entries)");
  });

// --- refine ---
program
  .command("refine")
  .description("Clean, deduplicate, and sanitize raw corpus")
  .option("--skip-sanitize", "Skip the second sanitization pass (ingest still always redacts before raw writes)")
  .option("--readiness-only", "Only generate corpus-readiness report, no cleaning")
  .option("--quality-only", "Deprecated alias for --readiness-only")
  .action((opts) => {
    const config = loadConfig();

    if (opts.readinessOnly || opts.qualityOnly) {
      console.log("Assessing corpus readiness...\n");
      const report = assessCorpusReadiness(config.workspace);
      console.log(`\nCorpus readiness: ${report.readiness.toUpperCase()}`);
      console.log(`Report: ${config.workspace}/${CORPUS_READINESS_REPORT}`);
      return;
    }

    console.log("Refining corpus...\n");
    const result = refine(config.workspace, { skipSanitize: opts.skipSanitize });
    console.log(`\nDone: ${result.totalInput} → ${result.totalOutput} entries`);
    console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
    console.log(`PII redacted: ${result.piiRedacted}`);
    console.log(`Output: ${result.outputDir}`);
  });

// --- corpus readiness (quality remains a CLI alias for compatibility) ---
program
  .command("readiness")
  .alias("quality")
  .description("Generate corpus-readiness report")
  .action(() => {
    const config = loadConfig();
    console.log("Assessing corpus readiness...\n");
    const report = assessCorpusReadiness(config.workspace);
    console.log(`Volume: ${report.volume.totalEntries} entries, ~${report.volume.totalTokensEstimate.toLocaleString()} tokens`);
    console.log(`First-hand share: ${(report.purity.ratio * 100).toFixed(1)}%`);
    console.log(`Coverage: ${report.coverage.topicCount} topics`);
    console.log(`Date range: ${report.recency.dateRange}`);
    console.log(`\nCorpus readiness: ${report.readiness.toUpperCase()}`);
    console.log(`Report: ${config.workspace}/${CORPUS_READINESS_REPORT}`);
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
  .description("Re-scan sources and merge new content into the refined corpus (optionally exports recent RecallNest memories)")
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

    console.log(`🔄 Clone Refresh — 重扫数据源并合并语料`);
    console.log(`  上次刷新: ${lastRefresh ? new Date(lastRefresh).toISOString().slice(0, 10) : "从未"}`);
    console.log(``);

    // Step 1: Ingest new conversations
    console.log(`📝 Step 1: 采集新对话...`);
    const ingestResult = ingest(config, opts.source);

    // Step 2: Export recallnest memories (if available)
    if (!opts.skipRecallnest) {
      console.log(`\n🧠 Step 2: 导出 RecallNest 记忆...`);
      const recallnestCli = expandHome(process.env.RECALLNEST_CLI || "~/recallnest/lm");
      const days = opts.days || "14";

      if (existsSync(recallnestCli)) {
        const exportPath = join(refreshDir, `recallnest-${timestamp}.md`);
        try {
          const { execFileSync } = require("node:child_process");
          const exported = execFileSync(
            recallnestCli,
            ["export-memories", "--days", days],
            { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 },
          );
          const sanitized = sanitizeSensitiveText(exported);
          writeFileSync(exportPath, sanitized.value, "utf-8");
          console.log(`  ✅ 内存脱敏后导出到 ${exportPath}（${sanitized.count} 处）`);
        } catch (err: any) {
          const code = err?.code || err?.status || "unknown";
          console.log(`  ⚠️ RecallNest 导出失败（${code}）；未写入导出文件`);
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
      `- 采集前置脱敏: ${ingestResult.sensitiveValuesRedacted} redacted`,
      `- 精炼二次脱敏: ${refineResult.piiRedacted} redacted`,
      ``,
      `## 下一步`,
      ``,
      `将 refined/ 目录下的更新文件（排除 *-assistant.md）上传到分身的语料库，`,
      `让数字分身${config.target ? `「${config.target}」` : ""}获得最新记忆。`,
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
    console.log(`\n📤 下一步: 将 refined/ 文件（排除 *-assistant.md）上传到分身语料库`);
  });

function ensureWorkspace(config: CloneConfig, options: { createRaw?: boolean } = {}) {
  mkdirSync(config.workspace, { recursive: true });
  if (options.createRaw !== false) mkdirSync(join(config.workspace, "raw"), { recursive: true });
}

program.parse();
