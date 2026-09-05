/**
 * dsh-skill-router — agent 工具面。
 *
 * 三个工具：状态 / 显式切换 / 推荐；都走 SkillRouterManager，
 * 不直接操作 vault 文件。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from 'cordis'
import type { SkillRouterManager } from './router.js'

export function registerTools(ctx: Context, manager: SkillRouterManager): void {
  ctx.tools.register(defineTool({
    name: 'skill_router_status',
    description: '查看当前技能路由状态：当前工作流、已启用/推荐 skill、是否处于开发强流程。',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const v = value as { route: string; label: string; enabled: string[]; suggested: string[]; demoted?: string[]; confidence: string }
        return [{
          type: 'text',
          text: [
            `当前路由：${v.label}`,
            `已启用：${v.enabled.join(', ') || '（仅底座）'}`,
            `推荐调用：${v.suggested.join(', ') || '无'}`,
            `效果降权：${v.demoted?.length ? v.demoted.join(', ') : '无'}`,
            `置信度：${v.confidence}`,
          ].join('\n'),
        }]
      },
    },
    async execute() {
      return manager.status() as any
    },
  }))

  ctx.tools.register(defineTool({
    name: 'skill_router_switch',
    description: '显式切换技能工作流：base（搜索/查资料）、core（创建/迭代 Skill）、dev（开发/重构）、domain（其他领域场景）。只影响当前会话。',
    parameters: {
      route: {
        type: 'string',
        required: true,
        enum: ['base', 'core', 'dev', 'domain'],
        description: '目标工作流。domain 时需要同时给 scenario。',
      },
      scenario: {
        type: 'string',
        description: 'domain 时的场景 id：teaching / learning / research / github / dsh-ops / writing。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean' },
          route: { type: 'string' },
          scenario: { type: 'string' },
          label: { type: 'string' },
          message: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const v = value as { ok: boolean; label: string; message: string }
        return [{ type: 'text', text: v.message }]
      },
    },
    async execute(args) {
      const route = args.route as 'base' | 'core' | 'dev' | 'domain'
      const scenario = args.scenario as string | undefined
      if (route === 'domain' && !scenario) {
        return { ok: false, route, scenario: '', label: '领域', message: 'domain 路由需要提供 scenario：teaching/learning/research/github/dsh-ops/writing' }
      }
      const decision = await manager.switch(route, scenario)
      const label = decision.route === 'domain' ? `${decision.route}:${decision.scenario || ''}` : decision.route
      return {
        ok: true,
        route: decision.route,
        scenario: decision.scenario || '',
        label,
        message: `已切换到 ${label}（仅当前会话生效）`,
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'skill_suggest',
    description: '获取当前/指定工作流下推荐调用的 skill 列表，帮助 agent 知道该调用哪个能力。',
    parameters: {
      route: {
        type: 'string',
        enum: ['base', 'core', 'dev', 'domain'],
        description: '可选；不传则用当前路由。',
      },
      scenario: {
        type: 'string',
        description: 'domain 时的场景 id。',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const v = value as { suggested: string[]; route: string }
        return [{ type: 'text', text: `当前路由 ${v.route} 推荐：${v.suggested.join(', ') || '无'}` }]
      },
    },
    async execute(args) {
      const suggested = await manager.suggested(args.route as 'base' | 'core' | 'dev' | 'domain' | undefined, args.scenario as string | undefined)
      const status = await manager.status()
      return { suggested, route: args.route || status.route } as any
    },
  }))
}
