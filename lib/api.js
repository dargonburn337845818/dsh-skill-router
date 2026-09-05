import { DOMAIN_SCENARIOS } from './router.js';
const MAX_BODY_BYTES = 256 * 1024;
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'HttpError';
    }
}
export function registerApi(ctx, manager) {
    const webserver = ctx.get('webServer');
    if (!webserver)
        return;
    const readBody = async (req) => {
        const chunks = [];
        let total = 0;
        for await (const chunk of req) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            total += buf.length;
            if (total > MAX_BODY_BYTES) {
                req.destroy();
                throw new HttpError(413, 'request body too large (max 256KB)');
            }
            chunks.push(buf);
        }
        return Buffer.concat(chunks).toString('utf8');
    };
    const send = (res, code, obj) => {
        res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(obj));
    };
    ctx.effect(() => webserver.register({
        kind: 'prefix',
        path: '/skill-router/api',
        handler: async (req, res) => {
            try {
                const url = new URL(req.url ?? '/', 'http://localhost');
                const pathname = url.pathname;
                const path = pathname.replace(/^\/skill-router\/api/, '') || '/';
                const sid = url.searchParams.get('sid') || undefined;
                if (req.method === 'GET' && path === '/status') {
                    return send(res, 200, { ok: true, ...await manager.status(sid) });
                }
                if (req.method === 'POST' && path === '/switch') {
                    let raw;
                    try {
                        raw = await readBody(req);
                    }
                    catch (e) {
                        if (e instanceof HttpError)
                            return send(res, e.status, { ok: false, error: e.message });
                        throw e;
                    }
                    let body;
                    try {
                        body = JSON.parse(raw);
                    }
                    catch {
                        return send(res, 400, { ok: false, error: 'invalid JSON body' });
                    }
                    if (!body || typeof body !== 'object' || Array.isArray(body)) {
                        return send(res, 400, { ok: false, error: 'body must be a JSON object' });
                    }
                    const route = body.route;
                    if (!route || (route !== 'base' && route !== 'core' && route !== 'dev' && route !== 'domain')) {
                        return send(res, 400, { ok: false, error: 'route 必须是 base/core/dev/domain' });
                    }
                    const scenario = typeof body.scenario === 'string' && body.scenario.trim() ? body.scenario.trim() : undefined;
                    if (scenario && !DOMAIN_SCENARIOS.includes(scenario)) {
                        return send(res, 400, { ok: false, error: `scenario 必须是 ${DOMAIN_SCENARIOS.join('/')} 之一` });
                    }
                    if (route === 'domain' && !scenario) {
                        return send(res, 400, { ok: false, error: 'domain 路由需要提供 scenario' });
                    }
                    const decision = await manager.switch(route, scenario, sid);
                    return send(res, 200, { ok: true, decision });
                }
                return send(res, 404, { ok: false, error: 'not found: ' + path });
            }
            catch (e) {
                if (e instanceof HttpError)
                    return send(res, e.status, { ok: false, error: e.message });
                return send(res, 500, { ok: false, error: String(e) });
            }
        },
    }), 'skill-router: api');
}
//# sourceMappingURL=api.js.map