/**
 * dsh-skill-router — dsh-skill-vault 公开 API 客户端。
 *
 * 只通过 HTTP 调用 vault 的公开端点，不直接读写 vault 文件/状态，
 * 保持两个插件松耦合（用户已确认“调度器走 vault 公开 API”）。
 *
 * 本客户端带“基底发现”：explicit config > DSH_WEB_URL > 常见本地端口。
 * 读操作（GET）可以逐候选尝试直到找到可用的 vault API；
 * 写操作（POST）只允许发给“已确认 base”（成功 GET 后固定），避免副作用被重放到错误实例。
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

const REQUEST_TIMEOUT_MS = 3000
const WRITE_CACHE_TTL_MS = 30_000
const WRITE_CACHE_MAX = 32

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
  private confirmedBase: string | null = null
  private writeCache = new Map<string, { at: number; value: Promise<unknown> }>()

  constructor(base?: string) {
    this.candidates = candidateBases(base)
    this.base = this.candidates[0] || ''
  }

  async list(): Promise<VaultApiList> {
    const data = await this.getJson<{ entries: VaultApiRow[]; scenarios: VaultApiList['scenarios'] }>('/skill-vault/api/list')
    return { entries: data.entries || [], scenarios: data.scenarios || [] }
  }

  async route(enable: string[], disable: string[], scope: 'session' | 'global' = 'session'): Promise<{ ok: boolean; results: unknown[] }> {
    const data = await this.postJson<{ ok: boolean; results: unknown[] }>('/skill-vault/api/route', { enable, disable, scope })
    return { ok: !!data.ok, results: data.results || [] }
  }

  async resetBase(baseIds?: string[]): Promise<{ ok: boolean }> {
    const data = await this.postJson<{ ok: boolean }>('/skill-vault/api/reset-base', { baseIds })
    return { ok: !!data.ok }
  }

  async teacherStatus(sessionId?: string): Promise<VaultTeacherStatus> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
    return await this.getJson<VaultTeacherStatus>(`/skill-vault/api/teacher/status${query}`)
  }

  /** Read-only request: tries every candidate, then pins the first reachable base. */
  private async getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const candidates = this.discoveryCandidates()
    const errors: string[] = []
    for (const candidate of candidates) {
      try {
        const data = await this.fetchJson<T>(candidate, path, {
          ...init,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        this.confirmBase(candidate)
        return data
      } catch (e) {
        errors.push(`${candidate} -> ${String(e)}`)
      }
    }
    throw new Error(`vault api unreachable (${errors.join('; ')})`)
  }

  /** Write request: only uses a base confirmed by a successful GET, and dedupes identical writes. */
  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const base = this.confirmedBase
    if (!base) {
      throw new Error('vault base not confirmed: call list()/teacherStatus() (GET) before any write')
    }

    this.pruneWriteCache()
    const key = JSON.stringify({ path, body })
    const now = Date.now()
    const existing = this.writeCache.get(key)
    if (existing && now - existing.at < WRITE_CACHE_TTL_MS) {
      return existing.value as Promise<T>
    }

    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
    const p = this.fetchJson<T>(base, path, init)
      .then((data) => {
        this.assertWriteOk(data, path)
        this.confirmBase(base)
        return data
      })

    this.writeCache.set(key, { at: now, value: p })
    try {
      return await p
    } catch (e) {
      this.writeCache.delete(key)
      throw e
    }
  }

  private async fetchJson<T>(base: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, init)
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
    return await res.json() as T
  }

  private assertWriteOk(data: unknown, path: string): void {
    if (data && typeof data === 'object' && 'ok' in data && !(data as { ok?: unknown }).ok) {
      throw new Error(`${path} returned ok=false`)
    }
  }

  private discoveryCandidates(): string[] {
    const list = this.candidates.length ? [...this.candidates] : [this.base]
    if (this.confirmedBase && !list.includes(this.confirmedBase)) list.unshift(this.confirmedBase)
    return list
  }

  private confirmBase(base: string): void {
    this.base = base
    this.confirmedBase = base
  }

  private pruneWriteCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.writeCache) {
      if (now - entry.at >= WRITE_CACHE_TTL_MS) this.writeCache.delete(key)
    }
    while (this.writeCache.size > WRITE_CACHE_MAX) {
      const oldest = this.writeCache.keys().next().value
      if (oldest === undefined) break
      this.writeCache.delete(oldest)
    }
  }
}
