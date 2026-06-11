<div align="center">

# Digital Clone

**语料驱动的数字分身 Claude Code Skill**

*采集你的 AI 对话，提取你的人格特质，部署一个说话像你的分身。*

一个 Claude Code Skill，把对话历史和写作转化为数字分身——引导你完成语料采集、清洗、人格提取、System Prompt 生成和验证全流程。附带可选的 Bun CLI/MCP 工具做机械性数据预处理。

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-blueviolet)](https://claude.com/claude-code)

[English](README.md) | **简体中文**

</div>

---

## 它能做什么

Skill 引导你走完 6 阶段流程，全程对话式——不需要任何运行时依赖：

| 阶段 | 名称 | 做什么 |
|------|------|--------|
| 1 | 目标画像 | 确定克隆目标，盘点数据源 |
| 2 | 语料搜集 | 采集原始语料（对话记录、文章、调研） |
| 3 | 语料清洗 | 清洗、去重、PII 脱敏、质量评估 |
| 4 | 灵魂锻造 | 提取人格，生成 System Prompt |
| 5 | 验证测试 | 陷阱问题测试，附通过标准（目标：≥80%） |
| 6 | 部署上线 | 平台部署指南（NotebookLM / bot / 通用 LLM） |

### 两种模式

- **Self Mode** —— 从本地 AI 对话和写作克隆自己
- **Mentor Mode** —— 通过 6 角度并行调研克隆名人（本人原声、即兴反应、外部评价、决策记录、社交碎片、时间线）

---

## 快速开始

安装 Skill（这就是全部安装步骤）：

```bash
mkdir -p ~/.claude/skills/digital-clone
curl -o ~/.claude/skills/digital-clone/SKILL.md \
  https://raw.githubusercontent.com/AliceLJY/digital-clone-skill/main/SKILL.md
```

然后在 Claude Code 里说：

> 帮我克隆自己，用我的公众号文章和 CC 对话记录
> 帮我克隆纳瓦尔做数字导师

Skill 会逐阶段对话式推进，每一步都等你确认。所有产出落在当前目录的 `./clone-workspace/`。

---

## 可选：CLI 预处理工具

> **需要 [Bun](https://bun.sh)。** CLI 无法在 Node.js 下运行（依赖 Bun 的 TypeScript 模块解析）。不用 Bun 的话可以完全跳过本节——Skill 自身覆盖完整流程。

语料量很大时（数千个 transcript 文件），CLI 做机械性工作比对话内处理更快：

```bash
git clone https://github.com/AliceLJY/digital-clone-skill.git
cd digital-clone-skill
bun install

bun run src/cli.ts init --target "你的名字" --mode self
bun run src/cli.ts ingest --source all
bun run src/cli.ts refine
bun run src/cli.ts quality
```

**重要：** workspace 路径相对于运行命令的目录。如果用 CLI 预处理，请在同一目录启动 Claude Code 会话，Skill 才能找到 `./clone-workspace/`。清洗后的语料会区分 `*-user.md`（你的原声——用于人格提取）和 `*-assistant.md`（AI 回复——仅作参考，不进灵魂锻造）。

| 命令 | 说明 |
|------|------|
| `bun run src/cli.ts init` | 初始化工作区和配置 |
| `bun run src/cli.ts ingest --source <src>` | 扫描语料（cc, codex, gemini, memory, articles, all） |
| `bun run src/cli.ts import <path>` | 导入外部文件（Mentor Mode） |
| `bun run src/cli.ts refine` | 清洗、去重、脱敏 |
| `bun run src/cli.ts quality` | 生成质量报告 |
| `bun run src/cli.ts stats` | 显示语料统计 |
| `bun run src/cli.ts verify-template` | 生成测试用例模板 |
| `bun run src/cli.ts deploy-guide --platform <p>` | 生成部署指南 |
| `bun run src/cli.ts refresh` | 重扫数据源，把新内容合并进清洗后的语料 |

设置 `CLONE_WORKSPACE` 环境变量可以把 workspace 固定到一个路径，让 CLI 和 Skill 会话共享。

> `refresh` 可以顺带从 [RecallNest](https://github.com/AliceLJY/recallnest) 导出近期记忆（作者自己的记忆系统；设 `RECALLNEST_CLI` 或安装在 `~/recallnest/lm`）。没装的话用 `--skip-recallnest`。

<details>
<summary><strong>MCP 工具（5 个，同样需要 Bun）</strong></summary>

| 工具 | 说明 |
|------|------|
| `clone_ingest` | 扫描和采集语料 |
| `clone_refine` | 清洗和去重 |
| `clone_quality` | 评估语料质量 |
| `clone_stats` | 显示统计 |
| `clone_read_corpus` | 读取清洗后的语料片段（默认只取 user 侧文本） |

**MCP 配置（Claude Code）：**

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
<summary><strong>架构</strong></summary>

| 文件 | 职责 |
|------|------|
| `SKILL.md` | Claude Code Skill —— 完整 6 阶段流程（产品本体） |
| `src/cli.ts` | 可选 CLI 入口（Bun） |
| `src/mcp-server.ts` | 可选 MCP 工具（Bun） |
| `src/parsers.ts` | 多源 transcript 解析 |
| `src/ingest.ts` | 语料采集管道 |
| `src/refine.ts` | 去重 + PII 脱敏 + 格式统一 |
| `src/quality.ts` | 质量评估 + 报告 |
| `src/templates.ts` | 验证和部署模板生成 |
| `src/config.ts` | 配置管理 |

</details>

---

## 致谢

| 来源 | 贡献 |
|------|------|
| Claude Code | 基础架构、CLI、MCP、解析器 |
| [RecallNest](https://github.com/AliceLJY/recallnest) | CC/Codex/Gemini 对话解析器架构 |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval 克隆教程 —— 最初的灵感来源 |
| alchaincyf/nuwa-skill | 6 角度调研 + 三遍验证 |
| LvPengfei1/PersonaVault | 证据分级 + 能力边界 |

## 作者

作者是 **小试AI**（[@AliceLJY](https://github.com/AliceLJY)），公众号为 **我的AI小木屋**。

## 生态

**小试AI** 开源 AI 工作流生态的一部分：

| 项目 | 简介 |
|------|------|
| [recallnest](https://github.com/AliceLJY/recallnest) | MCP 记忆工作台（LanceDB + Jina v5） |
| [content-publisher](https://github.com/AliceLJY/content-publisher) | 配图 + 排版 + 公众号发布 |
| [openclaw-tunnel](https://github.com/AliceLJY/openclaw-tunnel) | Docker ↔ 宿主机 CLI 桥（/cc /codex /gemini） |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Claude / Codex / Gemini 的 Telegram bot |
| [claude-code-studio](https://github.com/AliceLJY/claude-code-studio) | Claude Code 多会话协作平台 |
| [cc-empire](https://github.com/AliceLJY/cc-empire) | 完整的 Claude Code 工作流脚手架（规则 + 钩子 + agent） |
| [etwin-bot](https://github.com/AliceLJY/etwin-bot) | E-Twin Telegram bot —— 本 skill 的 1:1 实例化部署 |
| [trio-handoff](https://github.com/AliceLJY/trio-handoff) | AI 编程 agent 之间的双向交接 bundle |

## 许可证

MIT
