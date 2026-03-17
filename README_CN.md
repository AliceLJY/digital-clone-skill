<div align="center">

# Digital Clone

**语料驱动的数字分身工具**

*采集你的 AI 对话，提取你的人格特质，部署一个说话像你的分身。*

一套 CLI/MCP 数据管道 + Claude Code Skill，把你的对话历史转化为数字分身——扫描 transcript、清洗数据、提取人格、生成 System Prompt 并部署。

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-blueviolet)](https://claude.com/claude-code)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-5_tools-blue)](https://modelcontextprotocol.io)

[English](README.md) | **简体中文**

</div>

---

## 它能做什么

工具负责机械性工作（扫描、清洗、去重、PII 脱敏、质量评估）。Skill 负责 AI 擅长的事（人格提取、System Prompt 生成、验证评分）。

| 阶段 | 名称 | 方式 |
|------|------|------|
| 1 | 目标画像 | Skill（对话式） |
| 2 | 语料搜集 | CLI：`clone ingest` / `clone import` |
| 3 | 语料清洗 | CLI：`clone refine` + `clone quality` |
| 4 | 灵魂锻造 | Skill（读取语料，提取人格） |
| 5 | 验证测试 | CLI：`clone verify-template` + Skill（评分） |
| 6 | 部署上线 | CLI：`clone deploy-guide` + Skill |
| 7 | 活的分身 | CLI：`clone refresh`（增量更新 + RecallNest 联动） |

### 两种模式

- **Self Mode** —— 从本地 AI 对话和写作克隆自己
- **Mentor Mode** —— 从手动采集的语料克隆名人

---

## 快速开始

```bash
git clone https://github.com/AliceLJY/digital-clone-skill.git
cd digital-clone-skill
npm install

# 初始化工作区
bun run src/cli.ts init --target "你的名字" --mode self

# 扫描 AI 对话
bun run src/cli.ts ingest --source all

# 清洗去重
bun run src/cli.ts refine

# 查看语料质量
bun run src/cli.ts quality
```

然后在 Claude Code 中调用 Skill 进行灵魂锻造（Stage 4）。

### 持续更新分身

```bash
# 增量更新：新对话 + RecallNest 记忆 → 清洗后的语料
bun run src/cli.ts refresh

# 自定义：最近 30 天，跳过 RecallNest
bun run src/cli.ts refresh --days 30 --skip-recallnest
```

> 需要 [RecallNest](https://github.com/AliceLJY/recallnest) 安装在 `~/recallnest/`。未安装可用 `--skip-recallnest` 跳过。

### Skill 安装

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `clone init` | 初始化工作区和配置 |
| `clone ingest --source <src>` | 扫描语料（cc, codex, gemini, memory, articles, all） |
| `clone import <path>` | 导入外部文件（Mentor Mode） |
| `clone refine` | 清洗、去重、脱敏 |
| `clone quality` | 生成质量报告 |
| `clone stats` | 显示语料统计 |
| `clone verify-template` | 生成测试用例模板 |
| `clone deploy-guide --platform <p>` | 生成部署指南 |
| `clone refresh` | 增量更新：采集新对话 + RecallNest 记忆 → 清洗 → 更新语料 |

---

<details>
<summary><strong>MCP 工具（5 个）</strong></summary>

| 工具 | 说明 |
|------|------|
| `clone_ingest` | 扫描和采集语料 |
| `clone_refine` | 清洗和去重 |
| `clone_quality` | 评估语料质量 |
| `clone_stats` | 显示统计 |
| `clone_read_corpus` | 读取清洗后的语料片段（供 AI 做人格提取） |

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
| `src/cli.ts` | CLI 入口 |
| `src/mcp-server.ts` | MCP 工具 |
| `src/parsers.ts` | 多源 transcript 解析 |
| `src/ingest.ts` | 语料采集管道 |
| `src/refine.ts` | 去重 + PII 脱敏 + 格式统一 |
| `src/quality.ts` | 质量评估 + 报告 |
| `src/templates.ts` | 验证和部署模板生成 |
| `src/config.ts` | 配置管理 |
| `SKILL.md` | Claude Code Skill（灵魂锻造） |

</details>

---

## 致谢

| 来源 | 贡献 |
|------|------|
| Claude Code | 基础架构、CLI、MCP、解析器 |
| [RecallNest](https://github.com/AliceLJY/recallnest) | CC/Codex/Gemini 对话解析器架构 |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval 克隆教程 —— 最初的灵感来源 |

## 作者

作者是 **小试AI**（[@AliceLJY](https://github.com/AliceLJY)），公众号为 **我的AI小木屋**。

## 许可证

MIT
