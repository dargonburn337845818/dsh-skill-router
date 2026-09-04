# @dsh-external/dsh-skill-router

DSH 技能路由与工作流约束：与 `dsh-skill-vault` 孪生联动，按任务自动路由技能簇，提供用户可覆盖的清爽向导界面。

## 它解决什么

- 不再让所有蒸馏 skill 一股脑出现在目录里。
- 首条真实用户消息由规则外部路由（搜索底座 / 核心 Skill 迭代 / 开发·重构 / 领域场景）。
- 只开当前工作流需要的技能簇，并在系统提示中注入“当前工作流 + 推荐 skill”。
- 开发/重构时强制先调用 `commit_star` 激活 `dsh-graded-mode`，再注入完整开发规范与路径手册模板（脑暴→规格→审核→执行→打卡→红队→终验）。

## 依赖

- `@dsh-external/dsh-skill-vault`：技能库存储与开关。
- `@dsh-external/dsh-graded-mode`：强流程状态机（本插件直接复用其工具）。

## Agent 工具

- `skill_router_status`：当前路由、已启用/推荐 skill。
- `skill_router_switch`：显式切换 base / core / dev / domain。
- `skill_suggest`：获取当前或指定工作流的推荐 skill。

## 过程监视器

- 注入到 `conversation.view` 槽位，作为会话侧栏/标签页显示“过程监视器”。
- 每 5 秒轮询：
  - `/skill-router/api/status`：当前工作流、已启用 skill、推荐 skill（调用链）。
  - `/skill-vault/api/teacher/status`：教师回合式讨论真实轨迹（无教师会话时显示占位/待开始）。
- 教师/科研模式显示专家讨论；其他模式显示工作流与技能状态，不再用假数据冒充真实轨迹。

## 构建

```bash
bash scripts/build.sh
npm run build:client
```

## 运维安全

本插件不热更运行中的 agent；安装/升级按 `dsh-optimization-consensus` 先备份、隔离冒烟、再落地。

## 贡献与安全

- 贡献流程见 `CONTRIBUTING.md`；漏洞上报见 `SECURITY.md`；社区行为见 `CODE_OF_CONDUCT.md`。
- `.github/workflows/ci.yml` 在 push/PR 上运行插件测试。
- 本仓库提交预构建 `lib/`，保证 clone 后可直接安装/测试。
