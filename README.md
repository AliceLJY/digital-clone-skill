<div align="center">

# Digital Clone

**Corpus-Driven Digital Clone Toolkit**

*Collect your AI conversations, extract your personality, deploy a clone that talks like you.*

A CLI/MCP data pipeline + Claude Code Skill that turns your conversation history into a digital clone — scanning transcripts, cleaning data, extracting personality traits, and generating system prompts for deployment.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-blueviolet)](https://claude.com/claude-code)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-5_tools-blue)](https://modelcontextprotocol.io)

**English** | [简体中文](README_CN.md)

</div>

---

## What It Does

Tools handle the mechanical work (scanning, cleaning, dedup, PII sanitization, quality assessment). The Skill handles what AI does best (personality extraction, system prompt generation, verification).

| Stage | Name | How |
|-------|------|-----|
| 1 | Target Profiling | Skill (conversational) |
| 2 | Data Hunting | CLI: `clone ingest` / `clone import` |
| 3 | Data Refining | CLI: `clone refine` + `clone quality` |
| 4 | Soul Forging | Skill (reads corpus, extracts personality) |
| 5 | Verification | CLI: `clone verify-template` + Skill (scoring) |
| 6 | Deployment | CLI: `clone deploy-guide` + Skill |
| 7 | Living Clone | CLI: `clone refresh` (incremental update + RecallNest) |

### Two Modes

- **Self Mode** — clone yourself from local AI conversations and writings
- **Mentor Mode** — clone a public figure from manually collected corpus

---

## Quick Start

```bash
git clone https://github.com/AliceLJY/digital-clone-skill.git
cd digital-clone-skill
npm install

# Initialize workspace
bun run src/cli.ts init --target "Your Name" --mode self

# Scan your AI conversations
bun run src/cli.ts ingest --source all

# Clean and deduplicate
bun run src/cli.ts refine

# Check corpus quality
bun run src/cli.ts quality
```

Then invoke the Skill in Claude Code for Soul Forging (Stage 4).

### Keep Your Clone Updated

```bash
# Incremental update: new conversations + RecallNest memories → refined corpus
bun run src/cli.ts refresh

# Customize: last 30 days, skip RecallNest
bun run src/cli.ts refresh --days 30 --skip-recallnest
```

> Requires [RecallNest](https://github.com/AliceLJY/recallnest) at `~/recallnest/` for memory export. Use `--skip-recallnest` if not installed.

### Skill Installation

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `clone init` | Initialize workspace and config |
| `clone ingest --source <src>` | Scan corpus (cc, codex, gemini, memory, articles, all) |
| `clone import <path>` | Import external files (Mentor Mode) |
| `clone refine` | Clean, dedup, sanitize |
| `clone quality` | Generate quality report |
| `clone stats` | Show corpus statistics |
| `clone verify-template` | Generate test case template |
| `clone deploy-guide --platform <p>` | Generate deployment guide |
| `clone refresh` | Incremental update with RecallNest integration |

---

<details>
<summary><strong>MCP Tools (5 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `clone_ingest` | Scan and collect corpus |
| `clone_refine` | Clean and deduplicate |
| `clone_quality` | Assess corpus quality |
| `clone_stats` | Show statistics |
| `clone_read_corpus` | Read refined corpus slices (for AI personality extraction) |

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
| `src/cli.ts` | CLI entry |
| `src/mcp-server.ts` | MCP tools |
| `src/parsers.ts` | Multi-source transcript parsing |
| `src/ingest.ts` | Corpus collection pipeline |
| `src/refine.ts` | Dedup + PII sanitize + normalize |
| `src/quality.ts` | Quality assessment + report |
| `src/templates.ts` | Verify + deploy template generation |
| `src/config.ts` | Configuration management |
| `SKILL.md` | Claude Code Skill (Soul Forging) |

</details>

---

## Credit

| Source | Contribution |
|--------|-------------|
| Claude Code | Foundation, CLI, MCP server, parsers |
| [RecallNest](https://github.com/AliceLJY/recallnest) | Parser architecture for CC/Codex/Gemini transcripts |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval clone tutorial — original inspiration |

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY)) for the WeChat public account **我的AI小木屋**.

## License

MIT
