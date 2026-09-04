/**
 * dsh-skill-router — dsh-skill-vault 公开 API 客户端。
 *
 * 只通过 HTTP 调用 vault 的公开端点，不直接读写 vault 文件/状态，
 * 保持两个插件松耦合（用户已确认“调度器走 vault 公开 API”）。
 */
export class VaultClient {
    base;
    constructor(base) {
        this.base = (base || process.env.DSH_WEB_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');
    }
    async list() {
        const res = await fetch(`${this.base}/skill-vault/api/list`);
        if (!res.ok)
            throw new Error(`vault list failed: ${res.status}`);
        const data = await res.json();
        return { entries: data.entries || [], scenarios: data.scenarios || [] };
    }
    async route(enable, disable, scope = 'session') {
        const res = await fetch(`${this.base}/skill-vault/api/route`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enable, disable, scope }),
        });
        const data = await res.json();
        return { ok: !!data.ok, results: data.results || [] };
    }
    async resetBase(baseIds) {
        const res = await fetch(`${this.base}/skill-vault/api/reset-base`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ baseIds }),
        });
        const data = await res.json();
        return { ok: !!data.ok };
    }
    async teacherStatus(sessionId) {
        const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
        const res = await fetch(`${this.base}/skill-vault/api/teacher/status${query}`, {
            headers: { 'accept': 'application/json' },
        });
        if (!res.ok)
            throw new Error(`vault teacher status failed: ${res.status}`);
        return await res.json();
    }
}
//# sourceMappingURL=vault-client.js.map