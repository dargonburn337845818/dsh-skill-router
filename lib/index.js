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
const FIRST_TEXT_TTL_MS = 60 * 60 * 1000;
const SESSION_END_EVENTS = ['agent/session/end', 'agent/session/close', 'agent/session/dispose'];
export function apply(ctx, config) {
    const vault = new VaultClient(config.vaultBaseUrl || undefined);
    // 不再使用单全局 activeSid 兜底：路由与状态始终按显式传参或当前 agent session 读取，
    // 避免两个会话交叉时把 A 会话的 route 注入到 B 会话。
    const manager = new SkillRouterManager(vault, () => currentSessionId(ctx));
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
    // 会话级一次性首条消息记录；带 TTL，避免长驻增长。
    const firstTexts = new Map();
    const pruneFirstTexts = () => {
        const now = Date.now();
        for (const [sid, entry] of firstTexts) {
            if (now - entry.at > FIRST_TEXT_TTL_MS)
                firstTexts.delete(sid);
        }
    };
    const disposeSession = (sid) => {
        if (!sid)
            return;
        firstTexts.delete(sid);
        manager.disposeSession(sid);
    };
    // 会话结束类事件（若能触发）立即清掉对应会话内存；即使事件不可用，TTL 兜底。
    for (const eventName of SESSION_END_EVENTS) {
        ctx.on(eventName, (event) => {
            disposeSession(event?.agent?.session?.id);
        });
    }
    // 捕获首条真实用户消息，做一次性自动路由。
    ctx.on('agent/inbox/claimed', (event) => {
        const message = event?.message;
        if (message?.source?.kind !== 'user')
            return;
        const sid = event?.agent?.session?.id;
        if (!sid)
            return;
        pruneFirstTexts();
        const text = extractText(message);
        if (!text.trim() || firstTexts.has(sid))
            return;
        firstTexts.set(sid, { text: text.trim(), at: Date.now() });
        void manager.ensureRoute(text, sid).catch((e) => ctx.logger?.info?.('[skill-router] route error: ' + String(e)));
    });
    // 在系统提示组装时注入当前工作流/推荐/开发规范（路由变化后下一轮自然体现）。
    ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
        const assembled = await next();
        const sid = context?.agent?.session?.id;
        pruneFirstTexts();
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