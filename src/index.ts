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
import { registerArchifyApi } from './archify.js'

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

const FIRST_TEXT_TTL_MS = 60 * 60 * 1000
const SESSION_END_EVENTS = ['agent/session/end', 'agent/session/close', 'agent/session/dispose']

export function apply(ctx: AppContext, config: Config): void {
  const vault = new VaultClient(config.vaultBaseUrl || undefined)
  // 不再使用单全局 activeSid 兜底：路由与状态始终按显式传参或当前 agent session 读取，
  // 避免两个会话交叉时把 A 会话的 route 注入到 B 会话。
  const manager = new SkillRouterManager(vault, () => currentSessionId(ctx))

  registerTools(ctx, manager)
  registerApi(ctx, manager)
  registerArchifyApi(ctx)

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

  // 会话级一次性首条消息记录；带 TTL，避免长驻增长。
  const firstTexts = new Map<string, { text: string; at: number }>()

  const pruneFirstTexts = (): void => {
    const now = Date.now()
    for (const [sid, entry] of firstTexts) {
      if (now - entry.at > FIRST_TEXT_TTL_MS) firstTexts.delete(sid)
    }
  }

  const disposeSession = (sid?: string): void => {
    if (!sid) return
    firstTexts.delete(sid)
    manager.disposeSession(sid)
  }

  // 会话结束类事件（若能触发）立即清掉对应会话内存；即使事件不可用，TTL 兜底。
  for (const eventName of SESSION_END_EVENTS) {
    (ctx as any).on(eventName, (event?: { agent?: { session?: { id?: string } } }) => {
      disposeSession(event?.agent?.session?.id)
    })
  }

  // 捕获首条真实用户消息，做一次性自动路由。
  (ctx as any).on('agent/inbox/claimed', (event: { agent?: { session?: { id?: string } }; message?: { source?: { kind?: string }; content?: unknown } }) => {
    const message = event?.message as { source?: { kind?: string }; content?: unknown } | undefined
    if (message?.source?.kind !== 'user') return
    const sid = event?.agent?.session?.id
    if (!sid) return
    pruneFirstTexts()
    const text = extractText(message)
    if (!text.trim() || firstTexts.has(sid)) return
    firstTexts.set(sid, { text: text.trim(), at: Date.now() })
    void manager.ensureRoute(text, sid).catch((e) => ctx.logger?.info?.('[skill-router] route error: ' + String(e)))
  });

  // 在系统提示组装时注入当前工作流/推荐/开发规范（路由变化后下一轮自然体现）。
  (ctx as any).on('system-prompt/assemble', async (_assembly: unknown, context: { agent?: { session?: { id?: string } } }, next: () => Promise<any>) => {
    const assembled = await next()
    const sid = context?.agent?.session?.id
    pruneFirstTexts()
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
