import test from 'node:test'
import assert from 'node:assert/strict'
import { demotedSkillIds, promotedSkillIds } from '../lib/effects.js'

function row(skill, total, pos, triggered, used) {
  return {
    skill,
    total,
    triggered,
    used,
    pos,
    neu: 0,
    neg: total - pos,
    effectRate: total ? pos / total : 0,
    misuseRate: triggered ? Math.max(0, (triggered - used) / triggered) : 0,
    lastAt: null,
  }
}

test('demoted requires enough evidence and negative signal', () => {
  const demoted = demotedSkillIds([
    row('weak', 3, 1, 3, 1), // effect 33%, misuse 67%
    row('ok-weak-sample', 2, 2, 2, 2), // below minSamples, not demoted
    row('good', 5, 5, 5, 5),
  ])
  assert.ok(demoted.has('weak'))
  assert.ok(!demoted.has('ok-weak-sample'))
  assert.ok(!demoted.has('good'))
})

test('promoted requires strong positive evidence', () => {
  const promoted = promotedSkillIds([
    row('good', 5, 5, 5, 5),
    row('marginal', 5, 2, 5, 5),
    row('few', 2, 2, 2, 2),
  ])
  assert.ok(promoted.has('good'))
  assert.ok(!promoted.has('marginal'))
  assert.ok(!promoted.has('few'))
})
