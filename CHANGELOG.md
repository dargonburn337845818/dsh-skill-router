# Changelog

## Unreleased

- **效果敏感路由（P2 第一版）**：
  - 新增 `src/effects.ts`：读取 `~/.dsh/skill-vault/effect-log.json`，计算效果率/误触发率/样本量。
  - 达到阈值（样本 ≥3、效果率 <40% 或误触发率 >30%）的非底座 skill 会自动从“推荐调用”中移除，并在会话切换时不做 session 启用。
  - `RouterStatus` 新增 `demoted` 字段；`skill_router_status` 工具显示“效果降权”。
  - 底座/always-on 技能不因效果信号被禁用（仍是常驻底座）。
- **v0.0.2 修复 vault 状态读取失败**：
  - VaultClient 改为“显式配置 > DSH_WEB_URL > 常见本地端口”自动发现，不再写死 3080。
  - 修复 `/skill-router/api/status` 在默认端口不一致时返回 `TypeError: fetch failed` 的问题。
  - 新增 `requestJson` 统一重试候选基底，list/route/resetBase/teacherStatus 全部受益。
