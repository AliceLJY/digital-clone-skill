# Digital Clone 数字分身工具

[English](README.md) | **简体中文**

> 语料驱动的数字分身工具 — 从 AI 对话和写作中采集、清洗、评估人格数据。

Digital Clone 把 CLI/MCP 数据管道和 Claude Code Skill 结合在一起。工具负责机械性工作（扫描、清洗、去重、PII 脱敏、质量评估），Skill 负责 AI 擅长的事（人格提取、System Prompt 生成、验证评分）。

## 总览

| 层 | 做什么 |
|----|--------|
| Ingest | 扫描 Claude Code、Codex、Gemini CLI 对话 + markdown + 文章 |
| Refine | 去重、PII 脱敏、格式统一 |
| Quality | 体量、纯度、覆盖面、时效性评估 |
| Soul Forging | 人格提取 + System Prompt 生成（Skill） |
| Verify | 测试用例模板 + 评分标准 |
| Deploy | 平台部署指南 |

## 两种模式

- **Self Mode**：从本地 AI 对话和写作克隆自己
- **Mentor Mode**：从手动采集的语料克隆名人

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

然后在 Claude Code 中调用 Skill 进行 Soul Forging（Stage 4）。

### 持续更新分身

部署后，用 `clone refresh` 让分身跟上你的最新记忆：

```bash
# 增量更新：新对话 + RecallNest 记忆 → 清洗后的语料
bun run src/cli.ts refresh

# 自定义：最近 30 天，跳过 RecallNest
bun run src/cli.ts refresh --days 30 --skip-recallnest
```

> 需要 [RecallNest](https://github.com/AliceLJY/recallnest) 安装在 `~/recallnest/`。未安装可用 `--skip-recallnest` 跳过。

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

## MCP 工具

| 工具 | 说明 |
|------|------|
| `clone_ingest` | 扫描和采集语料 |
| `clone_refine` | 清洗和去重 |
| `clone_quality` | 评估语料质量 |
| `clone_stats` | 显示统计 |
| `clone_read_corpus` | 读取清洗后的语料片段（供 AI 做人格提取） |

## 工作流

```
Stage 1: 目标画像 ────── Skill（对话式）
Stage 2: 语料搜集 ────── CLI: clone ingest / clone import
Stage 3: 语料清洗 ────── CLI: clone refine + clone quality
Stage 4: 灵魂锻造 ────── Skill（读取清洗后语料，提取人格）
Stage 5: 验证测试 ────── CLI: clone verify-template + Skill（评分）
Stage 6: 部署上线 ────── CLI: clone deploy-guide + Skill（个性化建议）
Stage 7: 活的分身 ────── CLI: clone refresh（增量更新 + RecallNest 联动）
```

## 致谢

| 来源 | 贡献 |
|------|------|
| Claude Code | 基础架构、CLI、MCP、解析器 |
| [RecallNest](https://github.com/AliceLJY/recallnest) | CC/Codex/Gemini 对话解析器架构 |
| [@MinLiBuilds](https://x.com/MinLiBuilds) | Naval 克隆教程 — 最初的灵感来源 |

## 作者

作者：**小试AI**（[@AliceLJY](https://github.com/AliceLJY)）

公众号：**我的AI小木屋**

## License

MIT
