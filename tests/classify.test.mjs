import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyRoute } from '../lib/classify.js'

test('classifies skill iteration as core', () => {
  const d = classifyRoute('把这份材料蒸馏成 skill，并迭代到收敛')
  assert.equal(d.route, 'core')
})

test('classifies development as dev', () => {
  const d = classifyRoute('帮我写一个插件，实现路由逻辑')
  assert.equal(d.route, 'dev')
})

test('classifies source lookup as base', () => {
  const d = classifyRoute('查一下这个包的 GitHub 来源和安全公告')
  assert.equal(d.route, 'base')
})

test('classifies domain scenario', () => {
  const d = classifyRoute('准备算法竞赛教学，生成熵减盘问')
  assert.equal(d.route, 'domain')
  assert.equal(d.scenario, 'teaching')
})

test('classifies writing scenario', () => {
  const d = classifyRoute('帮我写一份产品发布文案')
  assert.equal(d.route, 'domain')
  assert.equal(d.scenario, 'writing')
})

test('defaults ambiguous to base', () => {
  const d = classifyRoute('你好')
  assert.equal(d.route, 'base')
  assert.equal(d.confidence, 'low')
})
