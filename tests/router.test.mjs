import test from 'node:test'
import assert from 'node:assert/strict'
import { SkillRouterManager } from '../lib/router.js'

function fakeVault(entries) {
  const calls = []
  return {
    calls,
    async list() {
      return { entries, scenarios: [] }
    },
    async route(enable, disable, scope) {
      calls.push({ enable, disable, scope })
      return { ok: true, results: [] }
    },
    async resetBase() {
      return { ok: true }
    },
  }
}

const entries = [
  { id: 'search-source', routing: 'base', activation: 'always-on', enabled: true, title: '搜索' },
  { id: 'work-consensus', routing: 'base', activation: 'always-on', enabled: true, title: '工作共识' },
  { id: 'core-iteration', routing: 'core', activation: 'catalog', enabled: false, title: '核心迭代' },
  { id: 'teacher-consensus', routing: 'domain', scenario: 'teaching', activation: 'catalog', enabled: false, title: '教师' },
]

test('switch to core enables core and keeps base', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-1')
  await m.switch('core')
  const call = vault.calls.at(-1)
  assert.ok(call.enable.includes('search-source'))
  assert.ok(call.enable.includes('core-iteration'))
  assert.ok(call.disable.includes('teaching'))
  assert.ok(!call.disable.includes('core-iteration'))
})

test('switch to domain enables the domain scenario', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-2')
  await m.switch('domain', 'teaching')
  const call = vault.calls.at(-1)
  assert.ok(call.enable.includes('teaching'))
  assert.ok(call.disable.includes('core-iteration'))
})

test('switch to writing domain enables writing scenario', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-6')
  await m.switch('domain', 'writing')
  const call = vault.calls.at(-1)
  assert.ok(call.enable.includes('writing'))
  assert.ok(call.disable.includes('core-iteration'))
})

test('switch to learning domain enables learning scenario', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-7')
  await m.switch('domain', 'learning')
  const call = vault.calls.at(-1)
  assert.ok(call.enable.includes('learning'))
  assert.ok(call.disable.includes('core-iteration'))
})

test('status returns route label', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-3')
  await m.switch('core')
  const status = await m.status('sid-3')
  assert.equal(status.route, 'core')
  assert.ok(status.suggested.includes('核心迭代'))
})

test('status is lossless JSON when optional fields are absent', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-4')
  const status = await m.status('sid-4')
  assert.equal(status.route, 'base')
  assert.equal('scenario' in status, false)
  assert.deepEqual(status, JSON.parse(JSON.stringify(status)))
})

test('status keeps scenario and remains lossless JSON', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-5')
  await m.switch('domain', 'teaching')
  const status = await m.status('sid-5')
  assert.equal(status.scenario, 'teaching')
  assert.deepEqual(status, JSON.parse(JSON.stringify(status)))
})

test('catalog reads are deduped while in flight', async () => {
  let listCalls = 0
  let resolveList
  const vault = {
    list() {
      listCalls++
      return new Promise((resolve) => { resolveList = resolve })
    },
    async route() { return { ok: true, results: [] } },
    async resetBase() { return { ok: true } },
  }
  const m = new SkillRouterManager(vault, () => 'sid-dedupe')
  const p1 = m.status('sid-dedupe')
  const p2 = m.status('sid-dedupe')
  resolveList({ entries, scenarios: [] })
  await Promise.all([p1, p2])
  assert.equal(listCalls, 1)
})

test('disposeSession removes the session route', async () => {
  const vault = fakeVault(entries)
  const m = new SkillRouterManager(vault, () => 'sid-dispose')
  await m.switch('core', undefined, 'sid-dispose')
  m.disposeSession('sid-dispose')
  const status = await m.status('sid-dispose')
  assert.equal(status.route, 'base')
})
