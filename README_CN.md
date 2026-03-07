# Claude Code 数字分身 Skill

[English](README.md) | **简体中文**

## 项目定位

这个仓库是一个 Claude Code skill，不是独立应用。

它本质上是一个由语料驱动、需要人工参与确认的数字分身工作流，不是安装后就会自动跑完的程序仓，也不是一键上线的托管服务。

这个 Skill 目前只在我自己的 Claude Code 工作流里实测通过。

## 这个 Skill 做什么

这个仓库的核心就是 [`SKILL.md`](./SKILL.md)。它定义了一个 6 阶段工作流：

1. 目标画像
2. 语料搜集
3. 语料清洗
4. 灵魂锻造
5. 验证测试
6. 部署上线

它支持两种模式：

- `Self Mode`：基于你自己的 Claude Code 对话、写作文件和本地记忆材料来构建分身
- `Mentor Mode`：由 AI 生成采集策略，再由用户自己去下载、整理和复核某位公开人物的语料

每个阶段都需要用户确认后才能继续。最终产物是清洗后的语料包、persona、system prompt 和部署说明，不是仓库自己负责托管上线的服务。

## 安装

按 Claude Code skill 的方式安装：

```bash
mkdir -p ~/.claude/skills/digital-clone
cp SKILL.md ~/.claude/skills/digital-clone/
```

## 使用方式

启动 Claude Code 会话后，可以这样调用：

```text
帮我克隆自己，用我的文章和对话记录
帮我克隆纳瓦尔做数字导师
我已经收集好了 Paul Graham 的语料，在 ~/pg-corpus/ 里
```

## 实测环境

- macOS
- Claude Code
- 本地语料文件
- 可选的 NotebookLM / Gemini 工作流用于部署

## 兼容性说明

- 这个 Skill 目前只在我自己的 Claude Code 工作流里实测通过。
- 它默认你有本地语料、可用的 Claude Code 技能环境，以及愿意进行人工确认。
- 部分路径假设基于我自己的目录结构，换机器或换系统通常需要自己调整。
- 目前不保证在 Linux 或 Windows 上无需修改即可使用。
- NotebookLM、Gemini Gem、CC Bot 或其他 LLM 平台的部署细节会随时间变化。
- 这不是一键生成分身的产品，人工参与和人工审核本来就是流程的一部分。

## 前置条件

- Claude Code
- 已安装到 `~/.claude/skills/` 下的本地 skill
- 足够支撑人格抽取的语料材料
- 愿意进行手动采集、人工审核和阶段确认

## 本地假设

- 当前活跃 Claude 项目可能会从 `~/.claude/projects/*/` 扫描
- Self Mode 可能读取 `<project-dir>/*.jsonl` 下的对话记录
- 可选复用 `<project-dir>/memory/writing-persona.md`
- 可选复用 `<project-dir>/memory/material-goldmine.md`
- 可选读取 `~/Documents/memory-archive/material-library.md`
- 所有工作流输出默认写入 `./clone-workspace/`

## 输出产物

工作流默认会在 `./clone-workspace/` 下生成这些内容：

- `profile.md`
- `quality-report.md`
- `persona.md`
- `system-prompt.md`
- `test-cases.md`
- `deploy-guide.md`
- `raw/`
- `refined/`

最终交付的是清洗后的语料包、人格画像、系统提示词、验证材料和第三方平台部署说明，不是“一键上线服务”。

## 已知限制

- 不是一键生成分身的工具
- 效果高度依赖语料质量
- 公开人物语料采集仍然需要人工完成
- 最终部署依赖第三方平台
- Self Mode 默认依赖本地 Claude Code 对话和记忆文件约定
- Mentor Mode 不会替用户自动下载完整公开语料

## 作者

作者：**小试AI**（[@AliceLJY](https://github.com/AliceLJY)）

## 公众号二维码

公众号：**我的AI小木屋**

<img src="./assets/wechat_qr.jpg" width="200" alt="公众号二维码">

## License

当前仓库里还没有单独的 `LICENSE` 文件。
