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
const FALLBACK_BASES = [
    'http://127.0.0.1:3080',
    'http://127.0.0.1:3082',
    'http://localhost:3080',
    'http://localhost:3082',
];
const REQUEST_TIMEOUT_MS = 3000;
const WRITE_CACHE_TTL_MS = 30_000;
const WRITE_CACHE_MAX = 32;
function candidateBases(explicit) {
    const list = [];
    const push = (u) => {
        const v = (u || '').trim().replace(/\/+$/, '');
        if (v && !list.includes(v))
            list.push(v);
    };
    push(explicit);
    push(process.env.DSH_WEB_URL);
    for (const u of FALLBACK_BASES)
        push(u);
    return list;
}
export class VaultClient {
    base;
    candidates;
    confirmedBase = null;
    writeCache = new Map();
    constructor(base) {
        this.candidates = candidateBases(base);
        this.base = this.candidates[0] || '';
    }
    async list() {
        const data = await this.getJson('/skill-vault/api/list');
        return { entries: data.entries || [], scenarios: data.scenarios || [] };
    }
    async route(enable, disable, scope = 'session') {
        const data = await this.postJson('/skill-vault/api/route', { enable, disable, scope });
        return { ok: !!data.ok, results: data.results || [] };
    }
    async resetBase(baseIds) {
        const data = await this.postJson('/skill-vault/api/reset-base', { baseIds });
        return { ok: !!data.ok };
    }
    async teacherStatus(sessionId) {
        const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
        return await this.getJson(`/skill-vault/api/teacher/status${query}`);
    }
    /** Read-only request: tries every candidate, then pins the first reachable base. */
    async getJson(path, init) {
        const candidates = this.discoveryCandidates();
        const errors = [];
        for (const candidate of candidates) {
            try {
                const data = await this.fetchJson(candidate, path, {
                    ...init,
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                this.confirmBase(candidate);
                return data;
            }
            catch (e) {
                errors.push(`${candidate} -> ${String(e)}`);
            }
        }
        throw new Error(`vault api unreachable (${errors.join('; ')})`);
    }
    /** Write request: only uses a base confirmed by a successful GET, and dedupes identical writes. */
    async postJson(path, body) {
        const base = this.confirmedBase;
        if (!base) {
            throw new Error('vault base not confirmed: call list()/teacherStatus() (GET) before any write');
        }
        this.pruneWriteCache();
        const key = JSON.stringify({ path, body });
        const now = Date.now();
        const existing = this.writeCache.get(key);
        if (existing && now - existing.at < WRITE_CACHE_TTL_MS) {
            return existing.value;
        }
        const init = {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        };
        const p = this.fetchJson(base, path, init)
            .then((data) => {
            this.assertWriteOk(data, path);
            this.confirmBase(base);
            return data;
        });
        this.writeCache.set(key, { at: now, value: p });
        try {
            return await p;
        }
        catch (e) {
            this.writeCache.delete(key);
            throw e;
        }
    }
    async fetchJson(base, path, init) {
        const res = await fetch(`${base}${path}`, init);
        if (!res.ok)
            throw new Error(`${path} failed: ${res.status}`);
        return await res.json();
    }
    assertWriteOk(data, path) {
        if (data && typeof data === 'object' && 'ok' in data && !data.ok) {
            throw new Error(`${path} returned ok=false`);
        }
    }
    discoveryCandidates() {
        const list = this.candidates.length ? [...this.candidates] : [this.base];
        if (this.confirmedBase && !list.includes(this.confirmedBase))
            list.unshift(this.confirmedBase);
        return list;
    }
    confirmBase(base) {
        this.base = base;
        this.confirmedBase = base;
    }
    pruneWriteCache() {
        const now = Date.now();
        for (const [key, entry] of this.writeCache) {
            if (now - entry.at >= WRITE_CACHE_TTL_MS)
                this.writeCache.delete(key);
        }
        while (this.writeCache.size > WRITE_CACHE_MAX) {
            const oldest = this.writeCache.keys().next().value;
            if (oldest === undefined)
                break;
            this.writeCache.delete(oldest);
        }
    }
}
//# sourceMappingURL=vault-client.js.map