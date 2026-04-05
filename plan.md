# 实施计划：digital-clone-skill Mentor Mode 准确度提升

## 核心思路

不改流程形式，只补分析角度。名人资料大家都能拿，区别在于**从什么角度看材料**才能提取出准确的人格。

## 6 个分析角度

| # | 角度 | 解决什么问题 | 影响的 Stage |
|---|------|------------|-------------|
| 1 | 批评者视角 | 只有自我视角，缺盲区 | Stage 1 采集 + Stage 4 提取 |
| 2 | 言行对比 | 分不清场面话和真信念 | Stage 1 采集 + Stage 4 提取 |
| 3 | 三重验证 | 把随口一说当核心思想 | Stage 4 提取 |
| 4 | 矛盾处理 | 强行统一导致人格扁平 | Stage 4 提取 |
| 5 | 负空间 | 不知道边界，遇到就瞎编 | Stage 1 采集 + Stage 4 提取 |
| 6 | 争论模式 | 只有抛光后的思想，缺真实思维过程 | Stage 1 采集 + Stage 4 提取 |

## 改动清单

### 1. Workspace 结构：新增 `references/research/`
Mentor Mode 调研结果按角度分文件存放。

### 2. Stage 1 Mentor Mode：单一 prompt → 并行子 agent
不是为了好看，是因为不同角度需要不同的搜索策略：
- 搜"此人写的" vs 搜"别人评价此人" 是完全不同的检索任务
- 搜"此人的决策记录" vs 搜"此人的辩论" 也需要不同的信息源

### 3. Stage 1.5：调研质量审查（新增）
6 个 agent 结果汇总，用户确认再继续。

### 4. Stage 2 Mentor Mode：精简
Stage 1 已完成主要调研，Stage 2 改为转化+补充。

### 5. Stage 4：增加分析框架
- 心智模型三重验证（跨域复现 + 生成力 + 排他性）
- 矛盾三类处理（时间性 / 领域性 / 本质性张力）
- 负空间提取（系统性回避的话题 + 拒绝方式）
- 争论模式分析（反驳方式 + 压力下行为 + 让步模式）

### 6. Stage 4 System Prompt 模板：新增段落
Contradictions、Negative Space、Argument Style

### 7. Stage 5：增加验证维度
Voice Test + Mentor Mode 结构化 Pass Criteria

### 8. Metadata：inspired-by 加上 nuwa-skill

## 不改的部分
- Self Mode（完全不动）
- src/ 代码（Mentor Mode 逻辑在 SKILL.md 中）
- Stage 6 部署流程
- 不做表达 DNA 量化（定性够用，量化对 LLM 生成无实质帮助）
