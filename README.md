# Digital Clone

**English** | [简体中文](README_CN.md)

> Corpus-driven digital clone toolkit — collect, refine, and assess persona data from AI conversations and writings.

Digital Clone combines a CLI/MCP data pipeline with a Claude Code Skill. The tools handle the mechanical work (scanning, cleaning, deduplication, PII sanitization, quality assessment). The Skill handles what AI does best (personality extraction, system prompt generation, verification).

## At A Glance

| Layer | What it does |
|-------|-------------|
| Ingest | Scan Claude Code, Codex, Gemini CLI transcripts + markdown + articles |
| Refine | Deduplicate, sanitize PII, normalize format |
| Quality | Volume, purity, coverage, recency assessment |
| Soul Forging | Personality extraction + System Prompt generation (Skill) |
| Verify | Test case templates + scoring rubric |
| Deploy | Platform-specific deployment guides |

## Two Modes

- **Self Mode**: clone yourself from local AI conversations and writings
- **Mentor Mode**: clone a public figure from manually collected corpus

## Quick Start

```bash
git clone https://github.com/AliceLJY/digital-clone-skill.git
cd digital-clone-skill
npm install

# initialize workspace
bun run src/cli.ts init --target "Your Name" --mode self

# scan your AI conversations
bun run src/cli.ts ingest --source all

# clean and deduplicate
bun run src/cli.ts refine

# check corpus quality
bun run src/cli.ts quality
```

Then invoke the Skill in Claude Code for Soul Forging (Stage 4).

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

## MCP Tools

| Tool | Description |
|------|-------------|
| `clone_ingest` | Scan and collect corpus |
| `clone_refine` | Clean and deduplicate |
| `clone_quality` | Assess corpus quality |
| `clone_stats` | Show statistics |
| `clone_read_corpus` | Read refined corpus slices (for AI personality extraction) |

### MCP Setup (Claude Code)

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

## Skill Installation

The Skill handles Stage 4 (Soul Forging) — personality extraction and System Prompt generation:

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

## Workflow

```
Stage 1: Target Profiling ─── Skill (conversational)
Stage 2: Data Hunting ─────── CLI: clone ingest / clone import
Stage 3: Data Refining ────── CLI: clone refine + clone quality
Stage 4: Soul Forging ─────── Skill (reads refined corpus, extracts personality)
Stage 5: Verification ─────── CLI: clone verify-template + Skill (scoring)
Stage 6: Deployment ────────── CLI: clone deploy-guide + Skill (customization)
```

## Architecture

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

## Credit

| Source | Contribution |
|--------|-------------|
| Claude Code | Foundation, CLI, MCP server, parsers |
| [RecallNest](https://github.com/AliceLJY/recallnest) | Parser architecture for CC/Codex/Gemini transcripts |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval clone tutorial — original inspiration |

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY))

WeChat public account: **我的AI小木屋**

## License

MIT
