import test from 'node:test'
import assert from 'node:assert/strict'
import { VaultClient } from '../lib/vault-client.js'

function withCleanEnv(fn) {
  const original = process.env.DSH_WEB_URL
  delete process.env.DSH_WEB_URL
  const originalFetch = globalThis.fetch
  return fn().finally(() => {
    globalThis.fetch = originalFetch
    if (original === undefined) delete process.env.DSH_WEB_URL
    else process.env.DSH_WEB_URL = original
  })
}

function okFetch({ onCall } = {}) {
  return async (url, init) => {
    const u = String(url)
    onCall?.({ url: u, method: init?.method || 'GET' })
    if (u.startsWith('http://127.0.0.1:3080')) throw new Error('down')
    return { ok: true, async json() { return { ok: true, entries: [], scenarios: [] } } }
  }
}

test('GET discovers a base and POST uses the confirmed base only', async () => {
  const calls = []
  await withCleanEnv(async () => {
    globalThis.fetch = okFetch({ onCall: (c) => calls.push(c) })
    const client = new VaultClient('http://127.0.0.1:3080')
    await client.list()
    await client.route([], [])
    const posts = calls.filter((c) => c.method === 'POST')
    assert.equal(posts.length, 1)
    assert.match(posts[0].url, /3082/)
  })
})

test('write before any base confirmation is rejected', async () => {
  await withCleanEnv(async () => {
    const client = new VaultClient('http://127.0.0.1:3080')
    await assert.rejects(client.route([], []), /not confirmed/)
  })
})

test('identical writes are deduped within the short TTL', async () => {
  let posts = 0
  await withCleanEnv(async () => {
    globalThis.fetch = okFetch({
      onCall: (c) => {
        if (c.method === 'POST') posts++
      },
    })
    const client = new VaultClient('http://127.0.0.1:3080')
    await client.list()
    await client.route([], [])
    await client.route([], [])
    assert.equal(posts, 1)
  })
})
