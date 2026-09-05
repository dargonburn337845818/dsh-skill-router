/**
 * dsh-skill-router — 核心路由管理。
 *
 * 职责：
 *   - 保存当前会话路由（内存态，会话级）
 *   - 调用 dsh-skill-vault 公开 API 做技能簇开关（默认 session scope）
 *   - 生成 agent 提示（当前工作流 + 推荐 skill + 开发规范/路径手册）
 */
import { type RouteDecision, type RouterRoute } from './classify.js';
import type { VaultClient } from './vault-client.js';
export interface RouterStatus {
    sessionId?: string;
    route: RouterRoute;
    scenario?: string;
    label: string;
    enabled: string[];
    suggested: string[];
    confidence: string;
}
export declare const DOMAIN_SCENARIOS: readonly ['teaching', 'learning', 'research', 'github', 'dsh-ops', 'writing'];
export declare class SkillRouterManager {
    private vault;
    private getSessionId;
    private routes;
    private cache;
    private catalogPromise;
    private catalogPromiseGeneration;
    private catalogGeneration;
    private catalogLoadedAt;
    constructor(vault: VaultClient, getSessionId: () => string | undefined);
    ensureRoute(text: string, sessionId?: string): Promise<RouteDecision>;
    switch(route: RouterRoute, scenario?: string, sessionId?: string): Promise<RouteDecision>;
    status(sessionId?: string): Promise<RouterStatus>;
    suggested(route?: RouterRoute, scenario?: string, sessionId?: string): Promise<string[]>;
    injectText(sessionId?: string): Promise<{
        routeText: string;
        devSpec?: string;
    }>;
    /** 会话结束/清理时移除该会话路由；路由表本身也会按 TTL 淘汰。 */
    disposeSession(sessionId: string | undefined): void;
    private applyDecision;
    /** One-time reset to base-only global enabled state. */
    resetBase(): Promise<{
        ok: boolean;
        baseIds: string[];
    }>;
    private getCatalog;
    private invalidateCatalog;
    private getRoute;
    private setRoute;
    private suggestedFor;
}
/**
 * 内置开发规范 + 路径手册模板（MVP 版）。
 * 用户确认：进入开发工作流时注入完整版；后续可随插件版本迭代。
 */
export declare const DEV_SPEC = "\u3010\u5185\u7F6E\u5F00\u53D1\u89C4\u8303 \u00B7 dsh-skill-router\u3011\n\u65B9\u5411\uFF1A\u5148\u6FC0\u6D3B\u5206\u7EA7\u6A21\u5F0F\uFF0C\u518D\u5BF9\u9F50\uFF0C\u518D\u89C4\u683C\u5316\uFF0C\u540E\u6267\u884C\uFF0C\u6700\u540E\u7EA2\u961F\u9A8C\u6536\uFF1B\u4E0D\u8981\u8DF3\u8FC7\u4EFB\u4F55\u9636\u6BB5\u3002\n\n0. \u6FC0\u6D3B\u5206\u7EA7\u6A21\u5F0F\uFF08\u786C\u6027\uFF09\n   - \u5148\u8C03\u7528 commit_star(purpose=...) \u5199\u6E05\u5317\u6781\u661F\uFF1A\u4E3A\u8C01\u3001\u5728\u4EC0\u4E48\u5904\u5883\u3001\u8FBE\u6210\u4EC0\u4E48\u53EF\u89C2\u6D4B\u7ED3\u679C\u3001\u4E0D\u505A\u4EC0\u4E48\u3002\n   - \u8C03\u7528\u540E\u6309\u5206\u7EA7\u6A21\u5F0F\u6CE8\u5165\u8FDB\u5165 edit_plan(L1/L2)\uFF1B\u672A\u62FF\u5230\u5206\u7EA7\u6A21\u5F0F\u6CE8\u5165\u524D\uFF0C\u7981\u6B62\u5F00\u59CB\u5199\u5B9E\u73B0\u3002\n   - \u82E5\u4F60\u5DF2\u53D1\u73B0\u4EFB\u52A1\u4E0D\u9002\u5408\u5B8C\u6574\u5206\u7EA7\u6D41\u7A0B\uFF0C\u5148\u5411\u7528\u6237\u786E\u8BA4\u662F\u5426\u964D\u7EA7\uFF0C\u4E0D\u5F97\u81EA\u884C\u8DF3\u8FC7\u3002\n\n1. \u8111\u66B4/\u5BF9\u9F50\n   - \u5148\u62C6\u9700\u6C42\uFF0C\u7528\u9009\u62E9\u9898\u5F0F\u5BF9\u8BDD\u628A\u6B67\u4E49\u7ED3\u6E05\uFF1B\u4E0D\u64C5\u81EA\u66FF\u7528\u6237\u51B3\u5B9A\u5173\u952E\u53D6\u820D\u3002\n   - \u8BB0\u5F55\u201C\u5317\u6781\u661F\u201D\uFF1A\u8FD9\u6B21\u5F00\u53D1\u6700\u7EC8\u8981\u4EA4\u4ED8\u4EC0\u4E48\u3001\u9A8C\u6536\u951A\u662F\u4EC0\u4E48\u3002\n\n2. \u89C4\u683C\u5316\n   - L1 \u7EC4\uFF1Aspec\uFF08\u76EE\u6807\uFF09/ accept\uFF08\u9A8C\u6536\uFF09/ verify\uFF08\u9A8C\u8BC1\u65B9\u5F0F\uFF09\n   - L2 \u5C0F\u7C7B\uFF1Aspec / accept / do / verify\uFF1B\u590D\u6742\u9879\u53EF\u6807 mode\uFF08correct/experience/research\uFF09\n   - \u89C4\u683C\u5FC5\u586B\u95E8\u63A7\uFF1A\u7F3A\u4E00\u9879\u5C31\u62D2\u7EDD\u8FDB\u5165\u4E0B\u4E00\u9636\u6BB5\uFF0C\u4E0D\u201C\u5148\u505A\u7740\u518D\u770B\u201D\u3002\n\n3. \u5BA1\u6838\n   - \u5C06\u5B8C\u6574\u89C4\u683C\u5355\u7ED9\u7528\u6237\u505A\u552F\u4E00\u786E\u8BA4\uFF1B\u7528\u6237\u8BF4\u201C\u4FEE\u6539\u201D\u5C31\u56DE\u6EDA\u91CD\u5BA1\uFF0C\u4E0D\u81EA\u7531\u53D1\u6325\u3002\n\n4. \u6267\u884C\n   - \u6BCF\u5C0F\u7C7B\u6CE8\u5165\uFF1A\u4EFB\u52A1\u89C4\u683C \u2192 \u9A8C\u6536\u6807\u51C6 \u2192 \u6267\u884C\u5F62\u6001\n   - \u6DF1\u6A21\u5757\u4F18\u5148\uFF1A\u7B80\u5355\u63A5\u53E3 + \u4E30\u5BCC\u5B9E\u73B0\uFF1B\u5148\u753B\u6A21\u5757\u5730\u56FE\u3001\u56FA\u5B9A\u516C\u5F00\u63A5\u53E3\u3002\n   - \u6587\u4EF6\u7CFB\u7EDF\u5373\u6A21\u5757\u5730\u56FE\uFF1A\u76EE\u5F55/\u547D\u540D\u76F4\u63A5\u53CD\u6620\u529F\u80FD\u8FB9\u754C\u3002\n   - \u63A5\u53E3\u662F\u6D4B\u8BD5\u9762\uFF1A\u7528\u6D4B\u8BD5\u9501\u6B7B\u5BF9\u5916\u884C\u4E3A\uFF0C\u5B9E\u73B0\u53EF\u4EA4\u7ED9 AI \u91CD\u5199\u3002\n\n5. \u6253\u5361/\u7EC4\u6536\u5B98\n   - \u6BCF\u5C0F\u7C7B\u5B8C\u6210\u5E76\u81EA\u68C0\u901A\u8FC7\u540E\u624D\u6253\u5361\uFF1B\u7EC4\u6536\u5B98\u9010\u6761\u6838\u5BF9\u7EC4\u7EA7\u9A8C\u6536\u3002\n   - verify=redteam \u7684\u9879\u5FC5\u987B\u5148\u72EC\u7ACB\u88C1\u51B3\u901A\u8FC7\uFF0C\u7981\u6B62\u201C\u81EA\u5DF1\u5199\u81EA\u5DF1\u8FC7\u201D\u3002\n\n6. \u7EC8\u9A8C\n   - \u5168\u9762\u590D\u67E5\uFF1A\u6D4B\u8BD5\u901A\u8FC7\u3001\u771F\u5B9E\u542F\u52A8/\u5192\u70DF\u3001\u8BC1\u636E\u53EF\u56DE\u6EAF\u3001\u65E0\u672A\u5904\u7406\u7684\u8FB9\u754C\u3002\n   - \u672A\u901A\u8FC7\u7EC8\u9A8C\u4E0D\u5F97\u5BA3\u544A\u4EA4\u4ED8\u3002\n\n\u3010\u8DEF\u5F84\u624B\u518C\u6A21\u677F\u3011\nproject: <\u9879\u76EE\u8DEF\u5F84>\nentry: <\u5165\u53E3\u6587\u4EF6/\u547D\u4EE4>\nmodule_map:\n  - <\u6A21\u5757> : <\u804C\u8D23> : <\u516C\u5F00\u63A5\u53E3>\npublic_api:\n  - <\u63A5\u53E3\u540D> : <\u8F93\u5165/\u8F93\u51FA/\u9519\u8BEF>\ntests: <\u6D4B\u8BD5\u547D\u4EE4>\nconstraints: <\u8DE8\u6A21\u5757/\u73AF\u5883/\u5B89\u5168\u7EA6\u675F>\nnext_steps: <\u5C1A\u672A\u89E3\u51B3\u7684\u8FB9\u754C\u6216\u5F85\u7EED\u5DE5\u4F5C>\n";
