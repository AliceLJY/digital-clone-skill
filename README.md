# Digital Clone Skill for Claude Code

A 6-stage semi-automated workflow to create high-fidelity digital clones (mentors/personas) from corpus data.

> **Corpus-driven, platform-agnostic, human-in-the-loop.**
>
> 用语料驱动的方式，构建任何人的数字分身。支持克隆自己，也支持克隆名人导师。

## How It Works

| Stage | Name | What Happens |
|-------|------|-------------|
| 1 | **Target Profiling** | Identify clone target, map out data sources |
| 2 | **Data Hunting** | Collect raw corpus (auto for self, guided for public figures) |
| 3 | **Data Refining** | Clean, deduplicate, assess corpus quality |
| 4 | **Soul Forging** | Extract personality + generate System Prompt |
| 5 | **Verification** | Test with trap questions, iterate until pass |
| 6 | **Deployment** | Deploy to NotebookLM + Gemini Gem / CC Bot / any LLM |

## Two Modes

- **Self Mode**: Clone yourself using your own writing, transcripts, and published content
- **Mentor Mode**: Clone a public figure (Naval, Paul Graham, Munger, etc.) by collecting their public corpus

## Installation

Copy `SKILL.md` to your Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

## Usage

Start a new Claude Code session and say:

```
# Clone yourself
帮我克隆自己，用我的文章和对话记录

# Clone a public figure
帮我克隆纳瓦尔做数字导师

# Clone with existing corpus
我已经收集好了 Paul Graham 的语料，在 ~/pg-corpus/ 里
```

The skill will guide you through each stage with confirmation checkpoints.

## Key Principles

- **First-hand corpus > second-hand summaries**: Raw voice, original writing, real Q&A
- **Data determines the ceiling**: More high-quality corpus = better clone
- **Platform-agnostic output**: Produces System Prompt + cleaned corpus, deployable anywhere
- **Context-aware tone**: The clone knows when to be casual and when to be serious

## Recommended Mentor Targets

| Person | Domain | Corpus Richness |
|--------|--------|----------------|
| Naval Ravikant | Wealth + Happiness | Rich (blog, X, podcasts) |
| Paul Graham | Startups + Thinking | Rich (essays, X, HN) |
| Charlie Munger | Multi-disciplinary Thinking | Good (speeches, books) |
| Nassim Taleb | Anti-Fragility + Risk | Rich (books, X) |
| Ray Dalio | Principles-Based Decisions | Good (books, LinkedIn) |

## Acknowledgments

> Inspired by [@MinLiBuilds](https://x.com/MinLiBuilds)'s [zero-code Naval digital clone tutorial](https://x.com/MinLiBuilds/status/2023910591283474722). The method of using Deep Research for data mapping, NotebookLM as a RAG engine, and Gemini Gem for personality injection was pioneered in that thread.

This skill adapts and extends that methodology into a reusable, semi-automated Claude Code workflow with Self/Mentor dual modes, corpus quality assessment, and structured verification testing.

## License

MIT
