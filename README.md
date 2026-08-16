<div align="center">

# Digital Clone

**Corpus-Driven Digital Clone Skill for Claude Code**

*Collect your AI conversations, extract your personality, deploy a clone that talks like you.*

A Claude Code Skill that turns conversation history and writings into a digital clone — guiding you through corpus collection, cleaning, personality extraction, system prompt generation, and verification. Optional Bun-based CLI/MCP tools are included for mechanical data preprocessing.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-blueviolet)](https://claude.com/claude-code)

**English** | [简体中文](README_CN.md)

</div>

---

## What It Does

The Skill walks you through a 6-stage pipeline, entirely conversational — no runtime dependencies required:

| Stage | Name | What Happens |
|-------|------|--------------|
| 1 | Target Profiling | Identify the clone target and map data sources |
| 2 | Data Hunting | Collect privacy-sanitized corpus (transcripts, articles, research) |
| 3 | Data Refining | Clean, dedup, second-pass sanitization, corpus-readiness assessment |
| 4 | Soul Forging | Extract personality, generate System Prompt |
| 5 | Verification | Trap-question testing with pass criteria (target: ≥80%) |
| 6 | Deployment | Platform-specific deploy guide (NotebookLM / bot / generic LLM) |

### Two Modes

- **Self Mode** — clone yourself from local AI conversations and writings
- **Mentor Mode** — clone a public figure via 6-angle parallel research (primary voice, live reactions, external views, decisions, social fragments, timeline)

---

## Quick Start

Install the Skill (this is the whole installation):

```bash
mkdir -p ~/.claude/skills/digital-clone
curl -o ~/.claude/skills/digital-clone/SKILL.md \
  https://raw.githubusercontent.com/AliceLJY/digital-clone-skill/main/SKILL.md
```

Then in Claude Code:

> 帮我克隆自己 / "Clone myself from my articles and CC transcripts"
> 帮我克隆纳瓦尔做数字导师 / "Clone Naval as my digital mentor"

The Skill handles everything conversationally, stage by stage, with your approval at each step. All outputs go to `./clone-workspace/` in your current directory.

---

## Optional: CLI Preprocessing Tools

> **Requires [Bun](https://bun.sh).** The CLI does not run on Node.js (it uses Bun's TypeScript module resolution). If you don't use Bun, skip this section entirely — the Skill covers the full pipeline on its own.

For large corpora (thousands of transcript files), the CLI does the mechanical work faster than in-conversation processing:

```bash
git clone https://github.com/AliceLJY/digital-clone-skill.git
cd digital-clone-skill
bun install

bun run src/cli.ts init --target "Your Name" --mode self
bun run src/cli.ts ingest --source all
bun run src/cli.ts refine
bun run src/cli.ts readiness
```

**Important:** the workspace path is relative to where you run the commands. If you preprocess with the CLI, start your Claude Code session in the same directory so the Skill finds `./clone-workspace/`. The refined corpus separates `*-user.md` (your voice — used for personality extraction) from `*-assistant.md` (AI replies — reference only, excluded from Soul Forging).

**Privacy boundary:** ingest/import applies best-effort sensitive-value redaction in memory before the first `raw/*.jsonl` write; it never writes an unfiltered copy and then overwrites it. Persisted `raw/` files still contain private conversation text and redaction cannot recognize every credential or personal detail, so inspect them before sharing or uploading. Add `--no-raw` to scan and report without writing any raw corpus artifact. Refinement performs a second sanitization pass for legacy or manually supplied files. Original source files are never modified.

| Command | Description |
|---------|-------------|
| `bun run src/cli.ts init` | Initialize workspace and config |
| `bun run src/cli.ts ingest --source <src> [--no-raw]` | Scan corpus, redact before writing, optionally write nothing |
| `bun run src/cli.ts import <path> [--no-raw]` | Import external files with the same privacy behavior (Mentor Mode) |
| `bun run src/cli.ts refine` | Clean, dedup, sanitize |
| `bun run src/cli.ts readiness` | Generate corpus-readiness report |
| `bun run src/cli.ts stats` | Show corpus statistics |
| `bun run src/cli.ts verify-template` | Generate test case template |
| `bun run src/cli.ts deploy-guide --platform <p>` | Generate deployment guide |
| `bun run src/cli.ts refresh` | Re-scan sources and merge new content into the refined corpus |

Set `CLONE_WORKSPACE` to pin the workspace to a fixed path shared between CLI and Skill sessions.

`bun run src/cli.ts quality` remains a compatibility alias for `readiness`; output and report naming use corpus readiness because these signals measure corpus sufficiency, not clone quality.

> `refresh` can optionally pull recent memories from a [RecallNest](https://github.com/AliceLJY/recallnest) install (the author's memory system; set `RECALLNEST_CLI` or place it at `~/recallnest/lm`). The export is captured from stdout, sanitized in memory, and only then written to `refreshed/`. Without RecallNest, use `--skip-recallnest`.

<details>
<summary><strong>MCP Tools (6 including one compatibility alias, also requires Bun)</strong></summary>

| Tool | Description |
|------|-------------|
| `clone_ingest` | Scan and collect corpus |
| `clone_refine` | Clean and deduplicate |
| `clone_corpus_readiness` | Assess corpus sufficiency for personality extraction |
| `clone_quality` | Deprecated compatibility alias for `clone_corpus_readiness` |
| `clone_stats` | Show statistics |
| `clone_read_corpus` | Read refined corpus slices (defaults to user-side text) |

**MCP Setup (Claude Code):**

```json
{
  "mcpServers": {
    "digital-clone": {
      "command": "bun",
      "args": ["run", "/path/to/digital-clone-skill/src/mcp-server.ts"],
      "cwd": "/path/to/digital-clone-skill"
    }
  }
}
```

</details>

<details>
<summary><strong>Architecture</strong></summary>

| File | Role |
|------|------|
| `SKILL.md` | Claude Code Skill — the full 6-stage pipeline (the product) |
| `src/cli.ts` | Optional CLI entry (Bun) |
| `src/mcp-server.ts` | Optional MCP tools (Bun) |
| `src/parsers.ts` | Multi-source transcript parsing |
| `src/ingest.ts` | Corpus collection pipeline |
| `src/sanitize.ts` | Shared pre-write sensitive-data redaction |
| `src/refine.ts` | Full-content hash dedup + second-pass sanitize + normalize |
| `src/readiness.ts` | Corpus-readiness assessment + report |
| `src/quality.ts` | Deprecated API compatibility shim |
| `src/templates.ts` | Verify + deploy template generation |
| `src/config.ts` | Configuration management |

</details>

---

## Credit

| Source | Contribution |
|--------|-------------|
| Claude Code | Foundation, CLI, MCP server, parsers |
| [RecallNest](https://github.com/AliceLJY/recallnest) | Parser architecture for CC/Codex/Kimi/Agy transcripts |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval clone tutorial — original inspiration |
| alchaincyf/nuwa-skill | 6-angle research + three-pass verification |
| LvPengfei1/PersonaVault | Evidence grading + capability boundaries |

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY)) for the WeChat public account **我的AI小木屋**.

## Ecosystem

Part of the **小试AI** open-source AI workflow:

| Project | Description |
|---------|-------------|
| [recallnest](https://github.com/AliceLJY/recallnest) | MCP memory workbench (LanceDB + Jina v5) |
| content-publisher (private) | Image generation + layout + WeChat publishing |
| [openclaw-tunnel](https://github.com/AliceLJY/openclaw-tunnel) | Docker ↔ host CLI bridge (/cc /codex) |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram bots for Claude, Codex, Agy, and Kimi |
| [claude-code-studio](https://github.com/AliceLJY/claude-code-studio) | Multi-session collaboration platform for Claude Code |
| cc-empire *(private)* | Complete Claude Code workflow scaffold (rules + hooks + agents) |
| [etwin-bot](https://github.com/AliceLJY/etwin-bot) | E-Twin Telegram bot — this skill's 1:1 instantiation as a runnable bot |
| [trio-handoff](https://github.com/AliceLJY/trio-handoff) | Bidirectional handoff bundles for AI coding agents |

## License

MIT
