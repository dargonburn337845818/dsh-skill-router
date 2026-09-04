/**
 * dsh-skill-router — 启发式路由分类。
 *
 * 设计遵循 dsh-routing-suite 的“外部路由”原则：模型不自选，由规则/用户决定。
 * 只做确定性、可测试的文本分类，不调用 LLM。
 */
export type RouterRoute = 'base' | 'core' | 'dev' | 'domain';
export type DomainScenario = 'teaching' | 'research' | 'github' | 'dsh-ops' | 'writing';
export interface RouteDecision {
    route: RouterRoute;
    scenario?: DomainScenario | string;
    confidence: 'high' | 'medium' | 'low';
}
export declare function classifyRoute(text: string): RouteDecision;
export declare function routeLabel(route: string, scenario?: string): string;
