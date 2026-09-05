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
    id: string;
    name: string;
    title: string;
    description: string;
    whenToUse?: string;
    boundary?: string;
    notWhenToUse?: string;
    scenario: string;
    scenarioTitle: string;
    routing: string;
    qualityCriteria?: {
        high?: string[];
        reject?: string[];
        minIndependentSources?: number;
        notes?: string;
    };
    tags: string[];
    experts: string[];
    sourceRefs: string[];
    activation: string;
    hidden: boolean;
    enabled: boolean;
}
export interface VaultApiList {
    entries: VaultApiRow[];
    scenarios: Array<{
        id: string;
        title: string;
        skillCount: number;
        enabledCount: number;
    }>;
}
export interface VaultTeacherSession {
    mode: string;
    session_id: string;
    domain: {
        id: string;
        name: string;
        confidence?: string;
        status?: string;
    } | null;
    experts: Array<{
        id: string;
        name: string;
        displayName: string;
        role?: string;
        persona_type: string;
        style?: string;
        sourceRefs: string[];
        status: string;
    }>;
    discussion: {
        status: string;
        current_round: number;
        rounds: Array<Record<string, unknown>>;
        gap_fallback: Record<string, unknown> | null;
    };
}
export interface VaultTeacherStatus {
    ok: boolean;
    sessions: VaultTeacherSession[];
    current: VaultTeacherSession | null;
}
export declare class VaultClient {
    private base;
    private candidates;
    constructor(base?: string);
    list(): Promise<VaultApiList>;
    route(enable: string[], disable: string[], scope?: 'session' | 'global'): Promise<{
        ok: boolean;
        results: unknown[];
    }>;
    resetBase(baseIds?: string[]): Promise<{
        ok: boolean;
    }>;
    teacherStatus(sessionId?: string): Promise<VaultTeacherStatus>;
    private requestJson;
}
