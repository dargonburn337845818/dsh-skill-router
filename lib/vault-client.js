/**
 * dsh-skill-router — dsh-skill-vault 公开 API 客户端。
 *
 * 只通过 HTTP 调用 vault 的公开端点，不直接读写 vault 文件/状态，
 * 保持两个插件松耦合（用户已确认“调度器走 vault 公开 API”）。
 *
 * 本客户端带“基底发现”：explicit config > DSH_WEB_URL > 常见本地端口，
 * 第一次请求失败时会自动尝试下一个候选，直到找到可用的 vault API。
 */
const FALLBACK_BASES = [
    'http://127.0.0.1:3080',
    'http://127.0.0.1:3082',
    'http://localhost:3080',
    'http://localhost:3082',
];
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
    constructor(base) {
        this.candidates = candidateBases(base);
        this.base = this.candidates[0] || '';
    }
    async list() {
        const data = await this.requestJson('/skill-vault/api/list');
        return { entries: data.entries || [], scenarios: data.scenarios || [] };
    }
    async route(enable, disable, scope = 'session') {
        const data = await this.requestJson('/skill-vault/api/route', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enable, disable, scope }),
        });
        return { ok: !!data.ok, results: data.results || [] };
    }
    async resetBase(baseIds) {
        const data = await this.requestJson('/skill-vault/api/reset-base', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ baseIds }),
        });
        return { ok: !!data.ok };
    }
    async teacherStatus(sessionId) {
        const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
        return await this.requestJson(`/skill-vault/api/teacher/status${query}`, {
            headers: { 'accept': 'application/json' },
        });
    }
    async requestJson(path, init) {
        const candidates = this.candidates.length ? this.candidates : [this.base];
        const errors = [];
        for (const candidate of candidates) {
            try {
                const res = await fetch(`${candidate}${path}`, init);
                if (!res.ok)
                    throw new Error(`${path} failed: ${res.status}`);
                return await res.json();
            }
            catch (e) {
                errors.push(`${candidate} -> ${String(e)}`);
            }
        }
        throw new Error(`vault api unreachable (${errors.join('; ')})`);
    }
}
//# sourceMappingURL=vault-client.js.map