/**
 * dsh-skill-router — 核心路由管理。
 *
 * 职责：
 *   - 保存当前会话路由（内存态，会话级）
 *   - 调用 dsh-skill-vault 公开 API 做技能簇开关（默认 session scope）
 *   - 生成 agent 提示（当前工作流 + 推荐 skill + 开发规范/路径手册）
 */
import { classifyRoute, routeLabel } from './classify.js';
const DOMAIN_SCENARIOS = ['teaching', 'research', 'github', 'dsh-ops', 'writing'];
export class SkillRouterManager {
    vault;
    getSessionId;
    routes = new Map();
    cache = null;
    constructor(vault, getSessionId) {
        this.vault = vault;
        this.getSessionId = getSessionId;
    }
    async ensureRoute(text, sessionId) {
        const sid = sessionId || this.getSessionId();
        if (sid && this.routes.has(sid))
            return this.routes.get(sid);
        const decision = classifyRoute(text);
        await this.applyDecision(decision, sid);
        return decision;
    }
    async switch(route, scenario, sessionId) {
        const sid = sessionId || this.getSessionId();
        const decision = { route, scenario, confidence: 'high' };
        await this.applyDecision(decision, sid);
        return decision;
    }
    async status(sessionId) {
        const sid = sessionId || this.getSessionId();
        const decision = sid ? this.routes.get(sid) : undefined;
        const route = decision?.route || 'base';
        const scenario = decision?.scenario;
        const catalog = await this.getCatalog();
        const suggested = this.suggestedFor(route, scenario, catalog);
        // 可选项为空时不带键：避免 undefined 字段破坏工具输出的 lossless JSON 校验。
        return {
            ...(sid ? { sessionId: sid } : {}),
            route,
            ...(scenario !== undefined ? { scenario } : {}),
            label: routeLabel(route, scenario),
            enabled: catalog.entries.filter((e) => e.enabled).map((e) => e.id),
            suggested,
            confidence: decision?.confidence || 'none',
        };
    }
    async suggested(route, scenario, sessionId) {
        const sid = sessionId || this.getSessionId();
        const decision = sid ? this.routes.get(sid) : undefined;
        const r = route || decision?.route || 'base';
        const s = scenario || decision?.scenario;
        const catalog = await this.getCatalog();
        return this.suggestedFor(r, s, catalog);
    }
    async injectText(sessionId) {
        const status = await this.status(sessionId);
        const lines = [
            `当前工作流：${status.label}`,
            `推荐调用：${status.suggested.length ? status.suggested.join(', ') : '（无额外 skill，先做搜索/来源底座）'}`,
            status.route === 'dev' ? '开发/重构任务：请先调用 commit_star(purpose=...) 激活分级模式；未激活前不得开始实现。' : '',
        ].filter(Boolean);
        return {
            routeText: lines.join('\n'),
            devSpec: status.route === 'dev' ? DEV_SPEC : undefined,
        };
    }
    async applyDecision(decision, sessionId) {
        const catalog = await this.getCatalog();
        const baseIds = catalog.entries.filter((e) => e.routing === 'base' || e.activation === 'always-on').map((e) => e.id);
        const coreIds = catalog.entries.filter((e) => e.routing === 'core').map((e) => e.id);
        const enable = new Set(baseIds);
        const disable = new Set(coreIds);
        for (const sc of DOMAIN_SCENARIOS)
            disable.add(sc);
        if (decision.route === 'core') {
            for (const id of coreIds) {
                enable.add(id);
                disable.delete(id);
            }
        }
        else if (decision.route === 'domain' && decision.scenario) {
            for (const id of coreIds)
                disable.add(id);
            enable.add(decision.scenario);
            disable.delete(decision.scenario);
        }
        else if (decision.route === 'dev') {
            // 开发/重构没有独立 skill 簇，只保持底座 + 注入开发规范。
            for (const id of coreIds)
                disable.add(id);
        }
        // session-scope 只影响当前会话；base 已在全局启用，这里显式 enable 无害。
        await this.vault.route([...enable], [...disable], 'session');
        if (sessionId) {
            this.routes.set(sessionId, decision);
        }
        this.cache = null;
    }
    /** One-time reset to base-only global enabled state. */
    async resetBase() {
        const catalog = await this.getCatalog();
        const baseIds = catalog.entries.filter((e) => e.routing === 'base' || e.activation === 'always-on').map((e) => e.id);
        const res = await this.vault.resetBase(baseIds);
        return { ok: res.ok, baseIds };
    }
    async getCatalog() {
        if (!this.cache)
            this.cache = await this.vault.list();
        return this.cache;
    }
    suggestedFor(route, scenario, catalog) {
        if (route === 'core') {
            return catalog.entries.filter((e) => e.routing === 'core').map((e) => e.title);
        }
        if (route === 'domain' && scenario) {
            return catalog.entries.filter((e) => e.scenario === scenario).map((e) => e.title);
        }
        if (route === 'dev') {
            return ['工作共识（深模块优先）', 'DSH 运维底线', '开发强流程（内置）'];
        }
        return catalog.entries.filter((e) => e.routing === 'base').map((e) => e.title);
    }
}
/**
 * 内置开发规范 + 路径手册模板（MVP 版）。
 * 用户确认：进入开发工作流时注入完整版；后续可随插件版本迭代。
 */
export const DEV_SPEC = `【内置开发规范 · dsh-skill-router】
方向：先激活分级模式，再对齐，再规格化，后执行，最后红队验收；不要跳过任何阶段。

0. 激活分级模式（硬性）
   - 先调用 commit_star(purpose=...) 写清北极星：为谁、在什么处境、达成什么可观测结果、不做什么。
   - 调用后按分级模式注入进入 edit_plan(L1/L2)；未拿到分级模式注入前，禁止开始写实现。
   - 若你已发现任务不适合完整分级流程，先向用户确认是否降级，不得自行跳过。

1. 脑暴/对齐
   - 先拆需求，用选择题式对话把歧义结清；不擅自替用户决定关键取舍。
   - 记录“北极星”：这次开发最终要交付什么、验收锚是什么。

2. 规格化
   - L1 组：spec（目标）/ accept（验收）/ verify（验证方式）
   - L2 小类：spec / accept / do / verify；复杂项可标 mode（correct/experience/research）
   - 规格必填门控：缺一项就拒绝进入下一阶段，不“先做着再看”。

3. 审核
   - 将完整规格单给用户做唯一确认；用户说“修改”就回滚重审，不自由发挥。

4. 执行
   - 每小类注入：任务规格 → 验收标准 → 执行形态
   - 深模块优先：简单接口 + 丰富实现；先画模块地图、固定公开接口。
   - 文件系统即模块地图：目录/命名直接反映功能边界。
   - 接口是测试面：用测试锁死对外行为，实现可交给 AI 重写。

5. 打卡/组收官
   - 每小类完成并自检通过后才打卡；组收官逐条核对组级验收。
   - verify=redteam 的项必须先独立裁决通过，禁止“自己写自己过”。

6. 终验
   - 全面复查：测试通过、真实启动/冒烟、证据可回溯、无未处理的边界。
   - 未通过终验不得宣告交付。

【路径手册模板】
project: <项目路径>
entry: <入口文件/命令>
module_map:
  - <模块> : <职责> : <公开接口>
public_api:
  - <接口名> : <输入/输出/错误>
tests: <测试命令>
constraints: <跨模块/环境/安全约束>
next_steps: <尚未解决的边界或待续工作>
`;
//# sourceMappingURL=router.js.map