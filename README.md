# Digital Clone Skill for Claude Code

**English** | [简体中文](README_CN.md)

## Project Positioning

This repository is a Claude Code skill, not a standalone application.

It is a corpus-driven, human-in-the-loop workflow for building a digital clone from local or manually collected source material. It is not a one-click product, not a self-hosted service, and not a repository that automatically runs end to end after installation.

This skill is only tested in my own Claude Code workflow.

## What This Skill Does

The core of this repository is [`SKILL.md`](./SKILL.md). It defines a 6-stage workflow:

1. Target Profiling
2. Data Hunting
3. Data Refining
4. Soul Forging
5. Verification
6. Deployment

It supports two modes:

- `Self Mode`: build a clone from your own Claude Code transcripts, writing files, and local memory materials
- `Mentor Mode`: generate collection strategies for a public figure, then let the user manually download, organize, and review the corpus

Every stage requires user confirmation before the workflow proceeds. The final output is a cleaned corpus package plus persona and deployment materials, not an automatically hosted clone service.

## Install

Install it as a Claude Code skill:

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

## Usage

Start a Claude Code session and invoke the skill with requests such as:

```text
帮我克隆自己，用我的文章和对话记录
帮我克隆纳瓦尔做数字导师
我已经收集好了 Paul Graham 的语料，在 ~/pg-corpus/ 里
```

## Tested Environment

- macOS
- Claude Code
- Local corpus files
- Optional NotebookLM / Gemini workflow for deployment

## Compatibility Notes

- This skill is only tested in my own Claude Code workflow.
- It assumes access to local corpus files and a Claude Code skill environment.
- Some path conventions are based on my own machine and may require adjustment on other setups.
- It is not guaranteed to work unchanged on Linux or Windows.
- Deployment targets such as NotebookLM, Gemini Gem, CC Bot, or other LLM platforms may change over time.
- This is not a one-click product. Human review and manual collection are part of the workflow.

## Prerequisites

- Claude Code
- Local skill installation under `~/.claude/skills/`
- Enough corpus material to support personality extraction
- Willingness to do manual collection, review, and approval at each stage

## Local Assumptions

- The active Claude project may be scanned from `~/.claude/projects/*/`
- Self Mode may look for transcript files under `<project-dir>/*.jsonl`
- Optional files may be reused from `<project-dir>/memory/writing-persona.md`
- Optional files may be reused from `<project-dir>/memory/material-goldmine.md`
- An optional archive file may be read from `~/Documents/memory-archive/material-library.md`
- Workflow outputs are written to `./clone-workspace/`

## Outputs

The workflow is designed to produce these files under `./clone-workspace/`:

- `profile.md`
- `quality-report.md`
- `persona.md`
- `system-prompt.md`
- `test-cases.md`
- `deploy-guide.md`
- `raw/`
- `refined/`

The final deliverable is a cleaned corpus package plus persona, system prompt, verification materials, and a deployment guide for third-party platforms.

## Known Limits

- Not a one-click clone generator
- Quality depends heavily on corpus quality
- Public figure collection still requires manual work
- Final deployment depends on third-party platforms
- Self Mode assumes local Claude Code transcript and memory file conventions
- Mentor Mode does not auto-download the full public corpus for the user

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY))

## WeChat Public Account

WeChat public account: **我的AI小木屋**

<img src="./assets/wechat_qr.jpg" width="200" alt="WeChat QR Code">

## License

This repository does not currently include a standalone `LICENSE` file.
