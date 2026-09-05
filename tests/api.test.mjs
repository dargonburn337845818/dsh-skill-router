import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { registerApi } from '../lib/api.js'

function setup(manager = {}) {
  let handler
  const ctx = {
    effect(fn) { fn() },
    get(name) {
      return name === 'webServer' ? { register(opts) { handler = opts.handler } } : undefined
    },
  }
  registerApi(ctx, manager)
  return async (method, url, body) => {
    const stream = Readable.from([body ?? ''])
    stream.method = method
    stream.url = url
    const res = {
      statusCode: 0,
      body: null,
      writeHead(code) { this.statusCode = code },
      end(data) { this.body = JSON.parse(data) },
    }
    await handler(stream, res)
    return res
  }
}

test('valid domain switch is accepted', async () => {
  const hits = []
  const manager = {
    async status() { return {} },
    async switch(route, scenario) {
      hits.push({ route, scenario })
      return { route, scenario }
    },
  }
  const call = setup(manager)
  const res = await call('POST', '/skill-router/api/switch', JSON.stringify({ route: 'domain', scenario: 'teaching' }))
  assert.equal(res.statusCode, 200)
  assert.deepEqual(hits, [{ route: 'domain', scenario: 'teaching' }])
})

test('scenario outside DOMAIN_SCENARIOS gets 400', async () => {
  const call = setup()
  const res = await call('POST', '/skill-router/api/switch', JSON.stringify({ route: 'domain', scenario: 'hacking' }))
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.ok, false)
})

test('domain switch without scenario gets 400', async () => {
  const call = setup()
  const res = await call('POST', '/skill-router/api/switch', JSON.stringify({ route: 'domain' }))
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.ok, false)
})

test('invalid JSON body gets 400', async () => {
  const call = setup()
  const res = await call('POST', '/skill-router/api/switch', '{not-json')
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'invalid JSON body')
})

test('oversized body gets 413', async () => {
  const call = setup()
  const big = JSON.stringify({ route: 'base', padding: 'x'.repeat(300 * 1024) })
  const res = await call('POST', '/skill-router/api/switch', big)
  assert.equal(res.statusCode, 413)
  assert.equal(res.body.ok, false)
})

test('non-object JSON body gets 400', async () => {
  const call = setup()
  const res = await call('POST', '/skill-router/api/switch', '42')
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'body must be a JSON object')
})
