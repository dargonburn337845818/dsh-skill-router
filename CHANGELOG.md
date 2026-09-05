# Changelog

## Unreleased

- **v0.0.2 修复 vault 状态读取失败**：
  - VaultClient 改为“显式配置 > DSH_WEB_URL > 常见本地端口”自动发现，不再写死 3080。
  - 修复 `/skill-router/api/status` 在默认端口不一致时返回 `TypeError: fetch failed` 的问题。
  - 新增 `requestJson` 统一重试候选基底，list/route/resetBase/teacherStatus 全部受益。
