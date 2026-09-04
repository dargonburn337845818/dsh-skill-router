# dsh-skill-router 安装与隔离冒烟

> 遵循 `~/.dsh/dsh-optimization-consensus.md`。不要在运行中的 agent 会话里热装。
> 本插件依赖：
> - `@dsh-external/dsh-skill-vault`（已装配）
> - `@dsh-external/dsh-graded-mode`（需先安装）

## 前置：dsh-graded-mode

已暂存在工作区：`$WORKSPACE/vendor/dsh-external-dsh-graded-mode-0.0.1-rc1.tgz`

```bash
# 隔离冒烟
DSH_HOME=/tmp/dsh-skill-router-smoke dsh plugin --profile web add $WORKSPACE/vendor/dsh-graded-mode
DSH_HOME=/tmp/dsh-skill-router-smoke dsh --dump-config
# 真实启动 + 检查 /graded-mode/api/audit 可访问后移除
DSH_HOME=/tmp/dsh-skill-router-smoke dsh plugin --profile web remove @dsh-external/dsh-graded-mode
```

## 安装本插件

```bash
cd $PROJECT_ROOT
npm pack
# 隔离冒烟
DSH_HOME=/tmp/dsh-skill-router-smoke dsh plugin --profile web add ./dsh-external-dsh-skill-router-0.0.1.tgz
DSH_HOME=/tmp/dsh-skill-router-smoke dsh --dump-config
# 启动 web 后检查：
#   GET /skill-router/api/status
#   conversation.view 出现“技能路由”面板
```

## 正式落地

1. 确认无 running agent（`agents.status` 为空）。
2. 备份：`~/.dsh/profiles/web/package.json`、`cordis.patch.yml`、`~/.dsh/skill-vault/enabled.json`。
3. 安装 dsh-graded-mode 与 dsh-skill-router。
4. 重启 `dsh web` 后检查 `/skill-router/api/status` 与技能面板。
5. 首次启动自动执行一次“只开底座”重置（写 `~/.dsh/skill-router/reset.done`）。

## 回滚

```bash
# 恢复实际文件
cp ~/.dsh/profiles/web/package.json.bak ~/.dsh/profiles/web/package.json
cp ~/.dsh/profiles/web/cordis.patch.yml.bak ~/.dsh/profiles/web/cordis.patch.yml
cp ~/.dsh/skill-vault/enabled.json.bak ~/.dsh/skill-vault/enabled.json
pnpm install --no-frozen-lockfile
# 真实重启验证
```
