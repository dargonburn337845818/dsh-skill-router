/**
 * dsh-skill-router — dsh-skill-vault 公开 API 客户端。
 *
 * 只通过 HTTP 调用 vault 的公开端点，不直接读写 vault 文件/状态，
 * 保持两个插件松耦合（用户已确认“调度器走 vault 公开 API”）。
 */

export interface VaultApiRow {
  id: string
  name: string
  title: string
  description: string
  whenToUse?: string
  boundary?: string
  notWhenToUse?: string
  scenario: string
  scenarioTitle: string
  routing: string
  qualityCriteria?: {
    high?: string[]
    reject?: string[]
    minIndependentSources?: number
    notes?: string
  }
  tags: string[]
  experts: string[]
  sourceRefs: string[]
  activation: string
  hidden: boolean
  enabled: boolean
}

export interface VaultApiList {
  entries: VaultApiRow[]
  scenarios: Array<{ id: string; title: string; skillCount: number; enabledCount: number }>
}

export interface VaultTeacherSession {
  mode: string
  session_id: string
  domain: { id: string; name: string; confidence?: string; status?: string } | null
  experts: Array<{
    id: string
    name: string
    displayName: string
    role?: string
    persona_type: string
    style?: string
    sourceRefs: string[]
    status: string
  }>
  discussion: {
    status: string
    current_round: number
    rounds: Array<Record<string, unknown>>
    gap_fallback: Record<string, unknown> | null
  }
}

export interface VaultTeacherStatus {
  ok: boolean
  sessions: VaultTeacherSession[]
  current: VaultTeacherSession | null
}

export class VaultClient {
  private base: string

  constructor(base?: string) {
    this.base = (base || process.env.DSH_WEB_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '')
  }

  async list(): Promise<VaultApiList> {
    const res = await fetch(`${this.base}/skill-vault/api/list`)
    if (!res.ok) throw new Error(`vault list failed: ${res.status}`)
    const data = await res.json() as { entries: VaultApiRow[]; scenarios: VaultApiList['scenarios'] }
    return { entries: data.entries || [], scenarios: data.scenarios || [] }
  }

  async route(enable: string[], disable: string[], scope: 'session' | 'global' = 'session'): Promise<{ ok: boolean; results: unknown[] }> {
    const res = await fetch(`${this.base}/skill-vault/api/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enable, disable, scope }),
    })
    const data = await res.json() as { ok: boolean; results: unknown[] }
    return { ok: !!data.ok, results: data.results || [] }
  }

  async resetBase(baseIds?: string[]): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.base}/skill-vault/api/reset-base`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ baseIds }),
    })
    const data = await res.json() as { ok: boolean }
    return { ok: !!data.ok }
  }

  async teacherStatus(sessionId?: string): Promise<VaultTeacherStatus> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
    const res = await fetch(`${this.base}/skill-vault/api/teacher/status${query}`, {
      headers: { 'accept': 'application/json' },
    })
    if (!res.ok) throw new Error(`vault teacher status failed: ${res.status}`)
    return await res.json() as VaultTeacherStatus
  }
}
