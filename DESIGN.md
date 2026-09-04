# dsh-skill-router 设计共识（MVP）

## 目标

- 将“技能库的调用逻辑”从全量枚举改为工作流路由。
- 用户面向三步向导：选工作流 → 看主卡 → 折叠其他场景。
- Agent 侧有状态/切换/推荐工具，能主动适应任务变化。

## 分层

- 常驻底座：search-source、work-consensus、dsh-optimization-consensus。
- 主卡：搜索底座、核心 Skill 迭代、开发/重构。
- 折叠其他场景：teaching / research / github / dsh-ops。

## 路由

- 首条真实用户消息启发式分类（外部路由）。
- 用户可覆盖；agent 可调用 skill_router_switch。
- 切换只影响当前 session，不污染全局 enabled.json。

## 联动

- 通过 dsh-skill-vault 公开 API：GET /skill-vault/api/list、POST /route、POST /reset-base。
- 复用 dsh-graded-mode 的 6 个工具，不重复实现状态机。
- 开发/重构路由强制先调用 `commit_star` 激活分级模式；未激活前不进入实现。

## 后续

- 完整状态机整合、审计面板、真实 A/B 收益验证。
