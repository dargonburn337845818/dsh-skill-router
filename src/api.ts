/**
 * dsh-skill-router — Web API（供向导 UI 使用）。
 *
 * 端点：
 *   GET  /skill-router/api/status
 *   POST /skill-router/api/switch  { route, scenario? }
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from 'cordis'
import { DOMAIN_SCENARIOS, type SkillRouterManager } from './router.js'

const MAX_BODY_BYTES = 256 * 1024

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export function registerApi(ctx: Context, manager: SkillRouterManager): void {
  const webserver = ctx.get('webServer') as { register(opts: unknown): unknown } | undefined
  if (!webserver) return

  const readBody = async (req: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      total += buf.length
      if (total > MAX_BODY_BYTES) {
        req.destroy()
        throw new HttpError(413, 'request body too large (max 256KB)')
      }
      chunks.push(buf)
    }
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
          let raw: string
          try {
            raw = await readBody(req)
          } catch (e) {
            if (e instanceof HttpError) return send(res, e.status, { ok: false, error: e.message })
            throw e
          }
          let body: { route?: unknown; scenario?: unknown } | null
          try {
            body = JSON.parse(raw) as { route?: unknown; scenario?: unknown }
          } catch {
            return send(res, 400, { ok: false, error: 'invalid JSON body' })
          }
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return send(res, 400, { ok: false, error: 'body must be a JSON object' })
          }

          const route = body.route as string | undefined
          if (!route || (route !== 'base' && route !== 'core' && route !== 'dev' && route !== 'domain')) {
            return send(res, 400, { ok: false, error: 'route 必须是 base/core/dev/domain' })
          }

          const scenario = typeof body.scenario === 'string' && body.scenario.trim() ? body.scenario.trim() : undefined
          if (scenario && !(DOMAIN_SCENARIOS as readonly string[]).includes(scenario)) {
            return send(res, 400, { ok: false, error: `scenario 必须是 ${DOMAIN_SCENARIOS.join('/')} 之一` })
          }
          if (route === 'domain' && !scenario) {
            return send(res, 400, { ok: false, error: 'domain 路由需要提供 scenario' })
          }

          const decision = await manager.switch(route, scenario, sid)
          return send(res, 200, { ok: true, decision })
        }
        return send(res, 404, { ok: false, error: 'not found: ' + path })
      } catch (e) {
        if (e instanceof HttpError) return send(res, e.status, { ok: false, error: e.message })
        return send(res, 500, { ok: false, error: String(e) })
      }
    },
  }), 'skill-router: api')
}
