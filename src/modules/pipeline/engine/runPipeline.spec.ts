import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runPipeline } from '@/modules/pipeline/engine/runPipeline'
import { createInitialPipeline } from '@/modules/pipeline/domain/defaults'
import type { ApiNodeConfig, ConditionNodeConfig } from '@/modules/pipeline/domain/types'

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
    const definition = createInitialPipeline()

    const apiNode = definition.nodes.find((node) => node.data?.type === 'api')
    const conditionNode = definition.nodes.find((node) => node.data?.type === 'condition')

    if (!apiNode || !conditionNode || !apiNode.data || !conditionNode.data) {
      throw new Error('Invalid test pipeline')
    }

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

    await expect(runPipeline(definition)).rejects.toThrow(/Start/)
  })

  it('sends a serialized POST body for api node', async () => {
    const definition = createInitialPipeline()
    const apiNode = definition.nodes.find((node) => node.data?.type === 'api')

    if (!apiNode || !apiNode.data) {
      throw new Error('Invalid test pipeline')
    }

    const apiConfig = apiNode.data.config as ApiNodeConfig
    apiConfig.method = 'POST'
    apiConfig.bodyRaw = '{"name":"Ada","active":true}'
    apiConfig.headers = [{ key: 'Accept', value: 'application/json' }]

    await runPipeline(definition)

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toBe('{"name":"Ada","active":true}')
    expect((requestInit.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })
})
