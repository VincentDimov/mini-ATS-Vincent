import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pipelineSource = readFileSync(
  new URL('../src/lib/pipeline.ts', import.meta.url),
  'utf8',
)

function declaredPipelineStages(source) {
  const declaration = source.match(
    /export const PIPELINE_STAGES\s*=\s*\[([\s\S]*?)\]\s*as const/,
  )

  assert.ok(declaration, 'PIPELINE_STAGES must remain an explicit const declaration')

  return [...declaration[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
}

test('the ATS pipeline has exactly the agreed canonical stages', () => {
  assert.deepEqual(declaredPipelineStages(pipelineSource), [
    'new',
    'screening',
    'interview',
    'offered',
    'rejected',
  ])
})

test('every pipeline stage has a human-readable UI label', () => {
  const expectedLabels = {
    new: 'New',
    screening: 'Screening',
    interview: 'Interview',
    offered: 'Offered',
    rejected: 'Rejected',
  }

  for (const [stage, label] of Object.entries(expectedLabels)) {
    assert.match(
      pipelineSource,
      new RegExp(`${stage}:\\s*\\{[\\s\\S]*?label:\\s*'${label}'`),
      `${stage} needs its expected UI label`,
    )
  }
})
