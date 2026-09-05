# dsh-skill-router

> DSH 技能路由与工作流约束插件：按任务自动路由技能簇，提供用户可覆盖的向导界面，并在开发/重构时注入开发规范。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 简介

dsh-skill-router 是 DSH（DeepSeek Harness）生态中的路由插件，与 `dsh-skill-vault` 孪生联动。它根据首条用户消息自动选择工作流，并只加载当前工作流需要的技能簇，减少无关技能对上下文的占用。

## 功能

- **自动路由**：首条用户消息由规则外部路由到搜索、Skill 迭代、开发重构、领域场景等工作流。
- **用户覆盖**：通过 `skill_router_switch` 显式切换工作流。
- **技能推荐**：`skill_suggest` 返回当前或指定工作流下的推荐 skill。
- **开发约束**：开发/重构模式下强制先调用 `commit_star` 激活 `dsh-graded-mode`，再注入开发规范与路径手册。
- **过程监视器**：注入 `conversation.view` 槽位，展示当前工作流、已启用 skill、推荐 skill，以及教师/科研模式的专家讨论轨迹。

## 依赖

- `@dsh-external/dsh-skill-vault`：技能库存储与开关。
- `@dsh-external/dsh-graded-mode`：强流程状态机。

## 安装

安装与加载步骤见 [INSTALL.md](INSTALL.md)。

## Agent 工具

| 工具 | 作用 |
|---|---|
| `skill_router_status` | 查看当前路由、已启用/推荐 skill |
| `skill_router_switch` | 切换 base / core / dev / domain |
| `skill_suggest` | 获取当前或指定工作流的推荐 skill |

## 仓库结构

```text
src/
├── index.ts             # 插件装配入口：注册工具、API 路由、过程监视器
├── api.ts               # /skill-router/api 路由与响应组装
├── classify.ts          # 首条用户消息分类
├── router.ts            # 工作流路由状态机与 skill 推荐
├── tools.ts             # Agent 工具
├── vault-client.ts      # dsh-skill-vault 客户端
└── client/              # 过程监视器 UI
lib/                     # 预构建产物（提交到仓库，clone 后可安装）
scripts/                 # 构建脚本
tests/                   # 路由、分类、API、vault-client 测试
```

## 开发与验证

```bash
npm run typecheck
npm test
bash scripts/build.sh
npm run build:client
```

修改源码后请同步 `lib/`，保证 clone 后可直接安装/测试。

## 运维安全

本插件不热更运行中的 agent。安装/升级遵循 `dsh-optimization-consensus`：先备份、隔离冒烟、再落地，回滚恢复实际文件。

## 贡献与安全

- 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 漏洞上报：[SECURITY.md](SECURITY.md)
- 社区行为：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 许可证

[MIT](LICENSE)
