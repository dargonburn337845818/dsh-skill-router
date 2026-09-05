/**
 * dsh-skill-router — dsh-skill-vault 公开 API 客户端。
 *
 * 只通过 HTTP 调用 vault 的公开端点，不直接读写 vault 文件/状态，
 * 保持两个插件松耦合（用户已确认“调度器走 vault 公开 API”）。
 *
 * 本客户端带“基底发现”：explicit config > DSH_WEB_URL > 常见本地端口，
 * 第一次请求失败时会自动尝试下一个候选，直到找到可用的 vault API。
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

const FALLBACK_BASES = [
  'http://127.0.0.1:3080',
  'http://127.0.0.1:3082',
  'http://localhost:3080',
  'http://localhost:3082',
]

function candidateBases(explicit?: string): string[] {
  const list: string[] = []
  const push = (u?: string) => {
    const v = (u || '').trim().replace(/\/+$/, '')
    if (v && !list.includes(v)) list.push(v)
  }
  push(explicit)
  push(process.env.DSH_WEB_URL)
  for (const u of FALLBACK_BASES) push(u)
  return list
}

export class VaultClient {
  private base: string
  private candidates: string[]

  constructor(base?: string) {
    this.candidates = candidateBases(base)
    this.base = this.candidates[0] || ''
  }

  async list(): Promise<VaultApiList> {
    const data = await this.requestJson<{ entries: VaultApiRow[]; scenarios: VaultApiList['scenarios'] }>('/skill-vault/api/list')
    return { entries: data.entries || [], scenarios: data.scenarios || [] }
  }

  async route(enable: string[], disable: string[], scope: 'session' | 'global' = 'session'): Promise<{ ok: boolean; results: unknown[] }> {
    const data = await this.requestJson<{ ok: boolean; results: unknown[] }>('/skill-vault/api/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enable, disable, scope }),
    })
    return { ok: !!data.ok, results: data.results || [] }
  }

  async resetBase(baseIds?: string[]): Promise<{ ok: boolean }> {
    const data = await this.requestJson<{ ok: boolean }>('/skill-vault/api/reset-base', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ baseIds }),
    })
    return { ok: !!data.ok }
  }

  async teacherStatus(sessionId?: string): Promise<VaultTeacherStatus> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
    return await this.requestJson<VaultTeacherStatus>(`/skill-vault/api/teacher/status${query}`, {
      headers: { 'accept': 'application/json' },
    })
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const candidates = this.candidates.length ? this.candidates : [this.base]
    const errors: string[] = []
    for (const candidate of candidates) {
      try {
        const res = await fetch(`${candidate}${path}`, init)
        if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
        return await res.json() as T
      } catch (e) {
        errors.push(`${candidate} -> ${String(e)}`)
      }
    }
    throw new Error(`vault api unreachable (${errors.join('; ')})`)
  }
}
