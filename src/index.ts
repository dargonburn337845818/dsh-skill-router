/**
 * @dsh-external/dsh-skill-router — 技能路由与工作流约束。
 *
 * 与 dsh-skill-vault 孪生联动：
 *   - 首条真实用户消息启发式分类（外部路由，模型不自选）
 *   - 通过 vault 公开 API 切换技能簇（默认 session scope）
 *   - 注入“当前工作流 + 推荐 skill”提示；开发工作流注入完整开发规范/路径手册
 *   - 提供 skill_router_status / skill_router_switch / skill_suggest 三个工具
 *   - 提供三步向导 UI
 *
 * 运维边界：本插件不热更运行中 agent；安装/升级走 dsh-optimization-consensus 隔离冒烟。
 */
import type { Context } from 'cordis'
import z from 'schemastery'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { VaultClient } from './vault-client.js'
import { SkillRouterManager } from './router.js'
import { registerTools } from './tools.js'
import { registerApi } from './api.js'

type AppContext = Context & {
  tools: unknown
  get(name: string): unknown
}

export const name = '@dsh-external/dsh-skill-router'
export const inject = ['tools', 'webServer']

export interface Config {
  vaultBaseUrl: string
  resetOnStart: boolean
}

export const Config = z.object({
  vaultBaseUrl: z.string().default(''),
  resetOnStart: z.boolean().default(true),
})

function currentSessionId(ctx: AppContext): string | undefined {
  try {
    const agent = ctx.get('agent') as { session?: { id?: string } } | undefined
    return agent?.session?.id
  } catch {
    return undefined
  }
}

export function apply(ctx: AppContext, config: Config): void {
  const vault = new VaultClient(config.vaultBaseUrl || undefined)
  const manager = new SkillRouterManager(vault, () => currentSessionId(ctx) || activeSid)
  let activeSid: string | undefined

  registerTools(ctx, manager)
  registerApi(ctx, manager)

  // 首次启动：把全局 enabled 重置为只开底座（一次性；带 marker，避免每次重启覆盖用户后续手动开关）。
  if (config.resetOnStart) {
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
    const marker = join(dshHome, 'skill-router', 'reset.done')
    if (!existsSync(marker)) {
      void manager.resetBase().then(() => {
        try {
          mkdirSync(dirname(marker), { recursive: true })
          writeFileSync(marker, new Date().toISOString() + '\n', 'utf8')
          ctx.logger?.info?.('[skill-router] 已执行一次性底座重置: reset.done')
        } catch { /* marker 写失败不阻塞 */ }
      }).catch((e) => ctx.logger?.info?.('[skill-router] resetBase failed: ' + String(e)))
    }
  }

  const firstTexts = new (globalThis as any).Map();

  // 捕获首条真实用户消息，做一次性自动路由。
  (ctx as any).on('agent/inbox/claimed', (event: { agent?: { session?: { id?: string } }; message?: { source?: { kind?: string }; content?: unknown } }) => {
    const message = event?.message as { source?: { kind?: string }; content?: unknown } | undefined
    if (message?.source?.kind !== 'user') return
    const sid = event?.agent?.session?.id
    if (!sid) return
    activeSid = sid
    const text = extractText(message)
    if (!text.trim() || firstTexts.has(sid)) return
    firstTexts.set(sid, text.trim())
    void manager.ensureRoute(text, sid).catch((e) => ctx.logger?.info?.('[skill-router] route error: ' + String(e)))
  });

  // 在系统提示组装时注入当前工作流/推荐/开发规范（路由变化后下一轮自然体现）。
  (ctx as any).on('system-prompt/assemble', async (_assembly: unknown, context: { agent?: { session?: { id?: string } } }, next: () => Promise<any>) => {
    const assembled = await next()
    const sid = context?.agent?.session?.id
    if (sid) activeSid = sid
    let sectionText = '当前技能路由：搜索底座（未确定工作流）'
    let devSpec: string | undefined
    if (sid) {
      try {
        const injected = await manager.injectText(sid)
        sectionText = injected.routeText
        devSpec = injected.devSpec
      } catch (e) {
        sectionText = '当前技能路由：搜索底座（状态读取失败）'
      }
    }
    const sections = Array.isArray(assembled?.sections) ? [...assembled.sections] : []
    sections.push({ name: 'skill-router', order: 1, text: sectionText })
    if (devSpec) {
      sections.push({ name: 'skill-router-dev-spec', order: 2, text: devSpec })
    }
    return { ...assembled, sections }
  });

  ctx.logger?.info?.('[skill-router] 就绪：自动路由 + vault 联动 + 向导 UI')
}

function extractText(message: { content?: unknown }): string {
  const content = Array.isArray(message?.content) ? message.content : []
  return content.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join(' ').trim()
}
