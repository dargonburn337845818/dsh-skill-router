/**
 * @dsh-external/dsh-skill-router — 技能路由与工作流约束。
 *
 * 与 dsh-skill-vault 孪生联动：
 *   - 首条真实用户消息启发式分类（外部路由，模型不自选）
 *   - 通过 vault 公开 API 切换技能簇（默认 session scope）
 *   - 注入“当前工作流 + 推荐 skill”提示；开发工作流注入完整开发规范/路径手册
 *   - 提供 skill_router_status / skill_router_switch / skill_suggest 三个工具
 *   - 提供三步向导 UI
 *
 * 运维边界：本插件不热更运行中 agent；安装/升级走 dsh-optimization-consensus 隔离冒烟。
 */
import type { Context } from 'cordis';
type AppContext = Context & {
    tools: unknown;
    get(name: string): unknown;
};
export declare const name = "@dsh-external/dsh-skill-router";
export declare const inject: string[];
export interface Config {
    vaultBaseUrl: string;
    resetOnStart: boolean;
}
export declare const Config: any;
export declare function apply(ctx: AppContext, config: Config): void;
export {};
