/**
 * @dsh-external/dsh-skill-router — 过程监视器。
 *
 * 顶部显示当前模式/进程；中间是调用链；
 * 教师/科研模式显示专家讨论流。数据来源于 vault 的 /teacher/status 与 /skill-router/api/status，不做假数据兜底。
 */
import { createElement, useEffect, useRef } from 'react'

type ClientContext = {
  effect(fn: () => unknown, label?: string): unknown
  slots: {
    inject(slot: string, factory: () => unknown): unknown
    register(reg: Record<string, unknown>, component: (props?: any) => any): unknown
  }
}

export const inject = ['slots']

interface MonitorRouterStatus {
  route?: string
  scenario?: string
  label?: string
  enabled?: string[]
  suggested?: string[]
  confidence?: string
}

interface MonitorData {
  router?: MonitorRouterStatus | null
  teacher?: any | null
}

const MODES = [
  { id: 'base', label: '搜索/底座' },
  { id: 'dev', label: '开发' },
  { id: 'distill', label: '蒸馏' },
  { id: 'teacher', label: '教师' },
  { id: 'research', label: '科研' },
  { id: 'writing', label: '文稿' },
  { id: 'domain', label: '领域' },
]

const PANEL_CLASS = 'dsh-skill-router-monitor'

/* 视觉统一：颜色/字体/边框走 DSH host 变量，明暗主题自动适配。 */
const UI_CSS = `
.${PANEL_CLASS} {
  box-sizing: border-box;
  padding: 12px;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-family: var(--dsw-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 20px;
}

.${PANEL_CLASS} *,
.${PANEL_CLASS} *::before,
.${PANEL_CLASS} *::after {
  box-sizing: border-box;
}

.${PANEL_CLASS} .dsh-monitor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.${PANEL_CLASS} .dsh-monitor-head-main {
  min-width: 0;
}

.${PANEL_CLASS} .dsh-monitor-title {
  margin: 0;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.${PANEL_CLASS} .dsh-monitor-current {
  margin: 2px 0 0;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-team {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, .16));
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, #444951);
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, .02));
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.${PANEL_CLASS} .dsh-monitor-team-label {
  color: var(--dsw-alias-label-tertiary, #62676d);
}

.${PANEL_CLASS} .dsh-monitor-team-names {
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #1f2328);
}

.${PANEL_CLASS} .dsh-monitor-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.${PANEL_CLASS} .dsh-monitor-mode {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border: .5px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, .16));
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, #444951);
  background: transparent;
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-mode.is-active {
  border-color: var(--dsw-alias-state-business-primary, #3866b3);
  color: var(--dsw-alias-label-primary, #1f2328);
  background: var(--dsw-alias-bg-module-platform, rgba(56, 102, 179, .08));
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.${PANEL_CLASS} .dsh-monitor-col {
  min-width: 0;
  border: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, .02));
  padding: 10px;
}

.${PANEL_CLASS} .dsh-monitor-col-title {
  margin: 0 0 6px;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-trace,
.${PANEL_CLASS} .dsh-monitor-discussion {
  margin: 0;
  padding: 0;
  list-style: none;
}

.${PANEL_CLASS} .dsh-monitor-trace-row {
  display: grid;
  grid-template-columns: 8px 34px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 6px 0;
  border-bottom: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
}

.${PANEL_CLASS} .dsh-monitor-trace-row:last-child {
  border-bottom: 0;
}

.${PANEL_CLASS} .dsh-monitor-dot {
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary, #16794b);
}

.${PANEL_CLASS} .dsh-monitor-dot.is-adjudicated {
  background: var(--dsw-alias-state-business-primary, #3866b3);
}

.${PANEL_CLASS} .dsh-monitor-dot.is-running {
  background: var(--dsw-alias-state-warn-primary, #8a5a00);
}

.${PANEL_CLASS} .dsh-monitor-time {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-variant-numeric: tabular-nums;
}

.${PANEL_CLASS} .dsh-monitor-body-text {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-actor {
  color: var(--dsw-alias-label-primary, #1f2328);
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-status {
  flex: none;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-status.is-done {
  color: var(--dsw-alias-state-success-primary, #16794b);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16794b) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-status.is-adjudicated {
  color: var(--dsw-alias-state-business-primary, #3866b3);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #3866b3) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-status.is-running {
  color: var(--dsw-alias-state-warn-primary, #8a5a00);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #8a5a00) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-discussion-row {
  display: flex;
  gap: 8px;
  min-width: 0;
  padding: 8px 0;
  border-bottom: .5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .06));
}

.${PANEL_CLASS} .dsh-monitor-discussion-row:last-child {
  border-bottom: 0;
}

.${PANEL_CLASS} .dsh-monitor-round {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 20px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, .05));
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}

.${PANEL_CLASS} .dsh-monitor-discussion-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.${PANEL_CLASS} .dsh-monitor-expert {
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

.${PANEL_CLASS} .dsh-monitor-stance {
  color: var(--dsw-alias-label-secondary, #444951);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.${PANEL_CLASS} .dsh-monitor-verdict {
  align-self: flex-start;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
}

.${PANEL_CLASS} .dsh-monitor-verdict.is-adopt {
  color: var(--dsw-alias-state-success-primary, #16794b);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16794b) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-verdict.is-ref {
  color: var(--dsw-alias-state-warn-primary, #8a5a00);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #8a5a00) 10%, transparent);
}

.${PANEL_CLASS} .dsh-monitor-note {
  margin: 12px 2px 0;
  color: var(--dsw-alias-label-tertiary, #62676d);
  font-size: 11px;
  line-height: 16px;
}

@media (max-width: 520px) {
  .${PANEL_CLASS} {
    padding: 10px;
  }

  .${PANEL_CLASS} .dsh-monitor-body {
    grid-template-columns: 1fr;
  }

  .${PANEL_CLASS} .dsh-monitor-trace-row {
    grid-template-columns: 8px 30px minmax(0, 1fr);
  }

  .${PANEL_CLASS} .dsh-monitor-status {
    grid-column: 2 / 4;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .${PANEL_CLASS} * {
    transition: none;
  }
}
`

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function statusClass(status: string): string {
  if (status === 'done') return 'is-done'
  if (status === 'adjudicated') return 'is-adjudicated'
  return 'is-running'
}

function dotClass(status: string): string {
  if (status === 'adjudicated') return 'is-adjudicated'
  if (status !== 'done') return 'is-running'
  return ''
}

function verdictClass(verdict: string): string {
  return ['采纳', '裁决', '结论', 'merge', 'adopt_a', 'adopt_b'].includes(verdict) ? 'is-adopt' : 'is-ref'
}

function buildTrace(data?: MonitorData): Array<{ time: string; actor: string; action: string; status: string }> {
  const s = data?.teacher?.current
  if (s) {
    const domainName = s.domain ? `${s.domain.name}（${s.domain.id}）` : '未知领域'
    const names = (s.experts || []).map((e: any) => e.displayNameZh || e.displayName || e.name).join(' / ')
    const trace: Array<{ time: string; actor: string; action: string; status: string }> = [
      { time: 'now', actor: '路由', action: `识别领域：${domainName}`, status: 'done' },
      { time: 'now', actor: '专家库', action: `专家团：${names || '无 ready 专家'}`, status: s.discussion?.status === 'expert_gap' ? 'running' : 'done' },
    ]
    for (const r of s.discussion?.rounds || []) {
      for (const sp of r.speaks || []) {
        trace.push({
          time: `R${r.round}`,
          actor: sp.expert_name,
          action: sp.stance,
          status: r.adjudications?.length ? 'adjudicated' : 'done',
        })
      }
    }
    return trace
  }
  const r = data?.router
  if (r?.label) {
    const trace: Array<{ time: string; actor: string; action: string; status: string }> = [
      { time: 'now', actor: '路由', action: `当前工作流：${r.label}`, status: 'done' },
    ]
    if (r.enabled?.length) {
      trace.push({ time: 'now', actor: '技能库', action: `已启用 ${r.enabled.length} 个 skill`, status: 'done' })
    }
    if (r.suggested?.length) {
      trace.push({ time: 'now', actor: '推荐', action: `建议调用：${r.suggested.join('、')}`, status: 'running' })
    }
    return trace
  }
  return []
}

function modeFromRouter(router?: MonitorRouterStatus | null): string {
  const route = router?.route || 'base'
  if (route === 'core') return 'distill'
  if (route === 'dev') return 'dev'
  if (route === 'domain') {
    if (router?.scenario === 'research') return 'research'
    if (router?.scenario === 'teaching') return 'teacher'
    if (router?.scenario === 'writing') return 'writing'
    return 'domain'
  }
  return 'base'
}

function buildDiscussion(data?: MonitorData): Array<{ round: number; expert: string; stance: string; verdict: string }> {
  const s = data?.teacher?.current
  if (!s) return []
  if (s.discussion?.status === 'expert_gap') {
    return [{
      round: 0,
      expert: '专家缺口',
      stance: s.discussion?.gap_fallback?.question || '该领域暂无 ready 人名专家',
      verdict: '缺口',
    }]
  }
  const rows: Array<{ round: number; expert: string; stance: string; verdict: string }> = []
  for (const r of s.discussion?.rounds || []) {
    for (const sp of r.speaks || []) {
      rows.push({ round: r.round, expert: sp.expert_name, stance: sp.stance, verdict: r.adjudications?.length ? '裁决' : '表态' })
    }
    for (const c of r.conflicts || []) {
      rows.push({
        round: r.round,
        expert: `${c.claim_a?.expert_name} vs ${c.claim_b?.expert_name}`,
        stance: c.topic,
        verdict: '冲突',
      })
    }
    for (const cc of r.conclusions || []) {
      rows.push({ round: r.round, expert: cc.expert_name, stance: cc.text, verdict: cc.decision || '结论' })
    }
  }
  if (!rows.length) {
    rows.push({ round: 0, expert: '教师会话', stance: '尚无讨论轮次；调用 teacher_discussion_start / teacher_discussion_round 开始。', verdict: '待开始' })
  }
  return rows
}

function createMonitorPanel(data?: MonitorData): { render(): HTMLElement } {
  return {
    render() {
      const root = el('div', PANEL_CLASS)

      const style = document.createElement('style')
      style.textContent = UI_CSS
      root.appendChild(style)

      const current = data?.teacher?.current
      const router = data?.router
      const mode = modeFromRouter(router)
      const activeMode = MODES.find((m) => m.id === mode)
      const routerLabel = router?.label || activeMode?.label || '搜索 / 查资料'
      const domainLabel = current?.domain ? `${current.domain.name}（${current.domain.id}）` : ''
      const teamNames = current?.experts?.length
        ? (current.experts as any[]).map((e: any) => e.displayNameZh || e.displayName || e.name).join(' / ')
        : mode === 'teacher'
          ? '未开始'
          : ''
      const sessionState = current?.discussion?.status === 'expert_gap'
        ? '· 专家缺口'
        : current?.discussion?.status === 'finished'
          ? '· 已完成'
          : current
            ? `· 第 ${current.discussion?.current_round || 0} 轮`
            : ''
      const processLine = current
        ? `当前进程：${routerLabel} · 领域：${domainLabel}${sessionState}`
        : `当前进程：${routerLabel}`

      const head = el('header', 'dsh-monitor-head')
      const headMain = el('div', 'dsh-monitor-head-main')
      headMain.append(
        el('h2', 'dsh-monitor-title', '过程监视器'),
        el('p', 'dsh-monitor-current', processLine),
      )
      const team = el('span', 'dsh-monitor-team')
      if (teamNames) {
        team.append(
          el('span', 'dsh-monitor-team-label', '专家团'),
          el('span', 'dsh-monitor-team-names', teamNames),
        )
      } else {
        team.append(
          el('span', 'dsh-monitor-team-label', '技能库'),
          el('span', 'dsh-monitor-team-names', `已启用 ${router?.enabled?.length || 0} 个`),
        )
      }
      head.append(headMain, team)
      root.appendChild(head)

      const modes = el('div', 'dsh-monitor-modes')
      modes.setAttribute('role', 'list')
      for (const m of MODES) {
        const isActive = m.id === mode
        const chip = el('span', `dsh-monitor-mode${isActive ? ' is-active' : ''}`, m.label)
        chip.setAttribute('role', 'listitem')
        if (isActive) chip.setAttribute('aria-current', 'true')
        modes.appendChild(chip)
      }
      root.appendChild(modes)

      const body = el('div', 'dsh-monitor-body')

      const traceCol = el('section', 'dsh-monitor-col')
      traceCol.append(el('h3', 'dsh-monitor-col-title', '调用链'))
      const trace = el('ul', 'dsh-monitor-trace')
      trace.setAttribute('role', 'list')
      const traceItems = buildTrace(data)
      for (const item of traceItems) {
        const row = el('li', 'dsh-monitor-trace-row')
        row.setAttribute('role', 'listitem')
        const dot = el('span', `dsh-monitor-dot ${dotClass(item.status)}`)
        dot.setAttribute('aria-hidden', 'true')
        const time = el('span', 'dsh-monitor-time', item.time)
        time.setAttribute('aria-hidden', 'true')
        const bodyText = el('span', 'dsh-monitor-body-text')
        bodyText.append(el('span', 'dsh-monitor-actor', item.actor), document.createTextNode(`：${item.action}`))
        const st = el('span', `dsh-monitor-status ${statusClass(item.status)}`, item.status)
        row.append(dot, time, bodyText, st)
        trace.appendChild(row)
      }
      traceCol.appendChild(trace)
      body.appendChild(traceCol)

      const discussionCol = el('section', 'dsh-monitor-col')
      discussionCol.append(el('h3', 'dsh-monitor-col-title', '专家讨论'))
      const discussion = el('ul', 'dsh-monitor-discussion')
      discussion.setAttribute('role', 'list')
      const discussionItems = buildDiscussion(data)
      for (const item of discussionItems) {
        const row = el('li', 'dsh-monitor-discussion-row')
        row.setAttribute('role', 'listitem')
        const round = el('span', 'dsh-monitor-round', `R${item.round}`)
        round.setAttribute('aria-hidden', 'true')
        const content = el('div', 'dsh-monitor-discussion-content')
        content.append(
          el('span', 'dsh-monitor-expert', item.expert),
          el('span', 'dsh-monitor-stance', item.stance),
          el('span', `dsh-monitor-verdict ${verdictClass(item.verdict)}`, item.verdict),
        )
        row.append(round, content)
        discussion.appendChild(row)
      }
      discussionCol.appendChild(discussion)
      body.appendChild(discussionCol)

      const note = current
        ? '教师讨论流来自 /skill-vault/api/teacher/status（只读展示）。'
        : router?.label
          ? '当前数据来自 /skill-router/api/status；教师讨论仅在教师会话数据返回后展示。'
          : '暂无路由状态数据（未返回真实轨迹）。'
      root.append(body, el('p', 'dsh-monitor-note', note))

      return root
    },
  }
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return await res.json()
}

function SkillRouterPanelComponent(): any {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = hostRef.current
    if (!container) return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    let currentAbort: AbortController | null = null
    let refreshing = false

    const render = (data?: MonitorData): void => {
      if (cancelled) return
      container.replaceChildren(createMonitorPanel(data).render())
    }

    const refresh = async (): Promise<void> => {
      if (cancelled || refreshing || document.visibilityState === 'hidden') return
      refreshing = true
      currentAbort?.abort()
      const controller = new AbortController()
      currentAbort = controller
      try {
        const [router, teacher] = await Promise.all([
          fetchJson('/skill-router/api/status', controller.signal).catch(() => null),
          fetchJson('/skill-vault/api/teacher/status', controller.signal).catch(() => null),
        ])
        if (!cancelled && !controller.signal.aborted) render({ router, teacher })
      } catch {
        // Abort/network errors: keep the last rendered state.
      } finally {
        if (currentAbort === controller) currentAbort = null
        refreshing = false
      }
    }

    const startTimer = (): void => {
      if (!timer) timer = setInterval(() => void refresh(), 5000)
    }
    const stopTimer = (): void => {
      if (timer) {
        clearInterval(timer)
        timer = undefined
      }
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        stopTimer()
        currentAbort?.abort()
      } else {
        startTimer()
        void refresh()
      }
    }

    void refresh()
    if (document.visibilityState !== 'hidden') startTimer()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stopTimer()
      currentAbort?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
      if (container.isConnected) container.replaceChildren()
    }
  }, [])

  return createElement('div', { ref: hostRef })
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.slots.inject('conversation.view', () =>
    ctx.slots.register({
      name: 'conversation.view',
      id: '@dsh-external/dsh-skill-router-panel',
      label: () => '过程监视器',
    }, SkillRouterPanelComponent),
  ), '@dsh-external/dsh-skill-router: monitor panel')
}
