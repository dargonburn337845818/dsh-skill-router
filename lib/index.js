import z from 'schemastery';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { VaultClient } from './vault-client.js';
import { SkillRouterManager } from './router.js';
import { registerTools } from './tools.js';
import { registerApi } from './api.js';
export const name = '@dsh-external/dsh-skill-router';
export const inject = ['tools', 'webServer'];
export const Config = z.object({
    vaultBaseUrl: z.string().default(''),
    resetOnStart: z.boolean().default(true),
});
function currentSessionId(ctx) {
    try {
        const agent = ctx.get('agent');
        return agent?.session?.id;
    }
    catch {
        return undefined;
    }
}
export function apply(ctx, config) {
    const vault = new VaultClient(config.vaultBaseUrl || undefined);
    const manager = new SkillRouterManager(vault, () => currentSessionId(ctx) || activeSid);
    let activeSid;
    registerTools(ctx, manager);
    registerApi(ctx, manager);
    // 首次启动：把全局 enabled 重置为只开底座（一次性；带 marker，避免每次重启覆盖用户后续手动开关）。
    if (config.resetOnStart) {
        const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
        const marker = join(dshHome, 'skill-router', 'reset.done');
        if (!existsSync(marker)) {
            void manager.resetBase().then(() => {
                try {
                    mkdirSync(dirname(marker), { recursive: true });
                    writeFileSync(marker, new Date().toISOString() + '\n', 'utf8');
                    ctx.logger?.info?.('[skill-router] 已执行一次性底座重置: reset.done');
                }
                catch { /* marker 写失败不阻塞 */ }
            }).catch((e) => ctx.logger?.info?.('[skill-router] resetBase failed: ' + String(e)));
        }
    }
    const firstTexts = new globalThis.Map();
    // 捕获首条真实用户消息，做一次性自动路由。
    ctx.on('agent/inbox/claimed', (event) => {
        const message = event?.message;
        if (message?.source?.kind !== 'user')
            return;
        const sid = event?.agent?.session?.id;
        if (!sid)
            return;
        activeSid = sid;
        const text = extractText(message);
        if (!text.trim() || firstTexts.has(sid))
            return;
        firstTexts.set(sid, text.trim());
        void manager.ensureRoute(text, sid).catch((e) => ctx.logger?.info?.('[skill-router] route error: ' + String(e)));
    });
    // 在系统提示组装时注入当前工作流/推荐/开发规范（路由变化后下一轮自然体现）。
    ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
        const assembled = await next();
        const sid = context?.agent?.session?.id;
        if (sid)
            activeSid = sid;
        let sectionText = '当前技能路由：搜索底座（未确定工作流）';
        let devSpec;
        if (sid) {
            try {
                const injected = await manager.injectText(sid);
                sectionText = injected.routeText;
                devSpec = injected.devSpec;
            }
            catch (e) {
                sectionText = '当前技能路由：搜索底座（状态读取失败）';
            }
        }
        const sections = Array.isArray(assembled?.sections) ? [...assembled.sections] : [];
        sections.push({ name: 'skill-router', order: 1, text: sectionText });
        if (devSpec) {
            sections.push({ name: 'skill-router-dev-spec', order: 2, text: devSpec });
        }
        return { ...assembled, sections };
    });
    ctx.logger?.info?.('[skill-router] 就绪：自动路由 + vault 联动 + 向导 UI');
}
function extractText(message) {
    const content = Array.isArray(message?.content) ? message.content : [];
    return content.map((c) => (typeof c === 'string' ? c : (c?.text ?? ''))).join(' ').trim();
}
//# sourceMappingURL=index.js.map