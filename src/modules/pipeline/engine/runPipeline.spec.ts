import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runPipeline } from '@/modules/pipeline/engine/runPipeline'
import { createInitialPipeline, createNode } from '@/modules/pipeline/domain/defaults'
import type { ApiNodeConfig, ConditionNodeConfig } from '@/modules/pipeline/domain/types'

function createRunnablePipeline() {
  const definition = createInitialPipeline()
  const startNode = definition.nodes.find((node) => node.data?.type === 'start')

  if (!startNode) {
    throw new Error('Invalid test pipeline: start node is missing')
  }

  const apiNode = createNode('api', 260, 180)
  const conditionNode = createNode('condition', 440, 180)
  const outputNode = createNode('output', 620, 180)

  definition.nodes.push(apiNode, conditionNode, outputNode)
  definition.edges.push(
    {
      id: 'edge-start-api',
      source: startNode.id,
      target: apiNode.id,
    },
    {
      id: 'edge-api-condition',
      source: apiNode.id,
      target: conditionNode.id,
    },
    {
      id: 'edge-condition-output-true',
      source: conditionNode.id,
      target: outputNode.id,
      data: { branch: 'true' },
    },
  )

  return {
    definition,
    apiNode,
    conditionNode,
    outputNode,
  }
}

describe('runPipeline', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify([{ id: 1, name: 'Ada' }]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  it('executes a simple pipeline from start to output', async () => {
    const { definition, apiNode, conditionNode } = createRunnablePipeline()

    const apiConfig = apiNode.data.config as ApiNodeConfig
    const conditionConfig = conditionNode.data.config as ConditionNodeConfig

    apiConfig.url = 'https://example.test/users'
    conditionConfig.leftPath = 'api.result.0.id'
    conditionConfig.operator = 'greaterThan'
    conditionConfig.rightType = 'number'
    conditionConfig.rightValue = '0'

    const result = await runPipeline(definition)

    expect(result.success).toBe(true)
    expect(result.context.logs.length).toBeGreaterThan(0)
  })

  it('fails when start node is missing', async () => {
    const definition = createInitialPipeline()
    definition.nodes = definition.nodes.filter((node) => node.data?.type !== 'start')

    await expect(runPipeline(definition)).rejects.toThrow(/Start|Départ/i)
  })

  it('sends a serialized POST body for api node', async () => {
    const { definition, apiNode } = createRunnablePipeline()

    const apiConfig = apiNode.data.config as ApiNodeConfig
    apiConfig.method = 'POST'
    apiConfig.bodyRaw = '{"name":"Ada","active":true}'
    apiConfig.headers = [{ key: 'Accept', value: 'application/json' }]

    await runPipeline(definition)

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toBe('{"name":"Ada","active":true}')
    expect(requestInit.headers).toEqual({
      Accept: 'application/json',
    })
  })
})
