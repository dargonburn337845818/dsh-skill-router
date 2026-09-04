/**
 * dsh-skill-router — Web API（供向导 UI 使用）。
 *
 * 端点：
 *   GET  /skill-router/api/status
 *   POST /skill-router/api/switch  { route, scenario? }
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from 'cordis'
import type { SkillRouterManager } from './router.js'

export function registerApi(ctx: Context, manager: SkillRouterManager): void {
  const webserver = ctx.get('webServer') as { register(opts: unknown): unknown } | undefined
  if (!webserver) return

  const readBody = async (req: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    return Buffer.concat(chunks).toString('utf8')
  }

  const send = (res: ServerResponse, code: number, obj: unknown): void => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(obj))
  }

  ctx.effect(() => (webserver as any).register({
    kind: 'prefix',
    path: '/skill-router/api',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname
        const path = pathname.replace(/^\/skill-router\/api/, '') || '/'
        const sid = url.searchParams.get('sid') || undefined
        if (req.method === 'GET' && path === '/status') {
          return send(res, 200, { ok: true, ...await manager.status(sid) })
        }
        if (req.method === 'POST' && path === '/switch') {
          const body = JSON.parse(await readBody(req)) as { route?: string; scenario?: string }
          const route = body.route
          if (route !== 'base' && route !== 'core' && route !== 'dev' && route !== 'domain') {
            return send(res, 400, { ok: false, error: 'route 必须是 base/core/dev/domain' })
          }
          const decision = await manager.switch(route, body.scenario, sid)
          return send(res, 200, { ok: true, decision })
        }
        return send(res, 404, { ok: false, error: 'not found: ' + path })
      } catch (e) {
        return send(res, 500, { ok: false, error: String(e) })
      }
    },
  }), 'skill-router: api')
}
