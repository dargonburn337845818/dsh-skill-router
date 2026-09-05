import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const execFileAsync = promisify(execFile);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ARCHIFY_TYPES = new Set(['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle']);
function archifyBin() {
    return process.env.ARCHIFY_BIN
        || '$HOME/.dsh/profiles/web/node_modules/@tt-a1i/archify-dsh/skills/archify/bin/archify.mjs';
}
function artifactDir() {
    return process.env.ARCHIFY_ARTIFACT_DIR
        || path.join(os.homedir(), '.dsh', 'skill-router', 'archify');
}
async function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let total = 0;
        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > MAX_BODY_BYTES) {
                req.destroy();
                reject(new Error('body too large'));
                return;
            }
            body += chunk.toString('utf8');
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}
function send(res, code, data) {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}
export function registerArchifyApi(ctx) {
    const webServer = ctx.get('webServer');
    if (!webServer)
        return;
    const artifacts = artifactDir();
    ctx.effect(() => webServer.register({
        kind: 'prefix',
        path: '/skill-router/archify/api',
        handler: async (req, res) => {
            try {
                const url = new URL(req.url ?? '/', 'http://localhost');
                const pathname = url.pathname;
                const routePath = pathname.replace(/^\/skill-router\/archify\/api/, '') || '/';
                if (req.method !== 'POST' || routePath !== '/render') {
                    return send(res, 404, { ok: false, error: 'not found: ' + routePath });
                }
                let body;
                try {
                    body = await readBody(req);
                }
                catch {
                    return send(res, 400, { ok: false, error: 'invalid JSON body' });
                }
                const ir = body?.ir;
                if (!ir || typeof ir !== 'object' || typeof ir.diagram_type !== 'string' || !ARCHIFY_TYPES.has(ir.diagram_type)) {
                    return send(res, 400, { ok: false, error: 'missing or invalid Archify IR' });
                }
                await fs.mkdir(artifacts, { recursive: true });
                const stamp = String(Date.now());
                const safeName = typeof body?.name === 'string'
                    ? body.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40)
                    : `session-flow-${stamp}`;
                const jsonPath = path.join(artifacts, `${safeName}-${stamp}.json`);
                const htmlPath = path.join(artifacts, `${safeName}-${stamp}.html`);
                await fs.writeFile(jsonPath, JSON.stringify(ir, null, 2), 'utf8');
                const bin = archifyBin();
                try {
                    await execFileAsync(process.execPath, [
                        bin,
                        'deliver',
                        ir.diagram_type,
                        jsonPath,
                        htmlPath,
                        '--quality',
                        'standard',
                        '--json',
                    ], { timeout: 90_000, maxBuffer: 16 * 1024 * 1024 });
                }
                catch (e) {
                    const text = String(e?.stderr || e?.message || e);
                    return send(res, 500, { ok: false, error: 'Archify render failed', detail: text.slice(0, 2000) });
                }
                const fileName = path.basename(htmlPath);
                return send(res, 200, {
                    ok: true,
                    url: `/skill-router/archify/artifacts/${fileName}`,
                    htmlPath,
                });
            }
            catch (e) {
                return send(res, 500, { ok: false, error: String(e?.message ?? e) });
            }
        },
    }), 'skill-router: archify api');
    ctx.effect(() => webServer.register({
        kind: 'prefix',
        path: '/skill-router/archify/artifacts',
        handler: async (req, res) => {
            try {
                const url = new URL(req.url ?? '/', 'http://localhost');
                const fileName = path.basename(url.pathname.split('/').filter(Boolean).pop() || '');
                if (!fileName) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                const file = path.join(artifacts, fileName);
                const buf = await fs.readFile(file);
                const ext = path.extname(fileName).toLowerCase();
                const contentType = ext === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream';
                res.writeHead(200, { 'content-type': contentType, 'content-length': buf.length });
                res.end(buf);
            }
            catch {
                res.writeHead(404);
                res.end();
            }
        },
    }), 'skill-router: archify artifacts');
}
//# sourceMappingURL=archify.js.map