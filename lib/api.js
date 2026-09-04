export function registerApi(ctx, manager) {
    const webserver = ctx.get('webServer');
    if (!webserver)
        return;
    const readBody = async (req) => {
        const chunks = [];
        for await (const chunk of req)
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
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
                    const body = JSON.parse(await readBody(req));
                    const route = body.route;
                    if (route !== 'base' && route !== 'core' && route !== 'dev' && route !== 'domain') {
                        return send(res, 400, { ok: false, error: 'route 必须是 base/core/dev/domain' });
                    }
                    const decision = await manager.switch(route, body.scenario, sid);
                    return send(res, 200, { ok: true, decision });
                }
                return send(res, 404, { ok: false, error: 'not found: ' + path });
            }
            catch (e) {
                return send(res, 500, { ok: false, error: String(e) });
            }
        },
    }), 'skill-router: api');
}
//# sourceMappingURL=api.js.map