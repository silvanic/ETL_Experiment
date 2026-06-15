import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executorByType } from '@/modules/pipeline/engine/nodeExecutors'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  ExecutionContext,
  FilterNodeConfig,
  PipelineNode,
} from '@/modules/pipeline/domain/types'

function createApiNode(overrides: Partial<ApiNodeConfig> = {}): PipelineNode<'api'> {
  return {
    id: 'api-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'api',
      label: 'API Request',
      config: {
        url: 'https://example.test/users',
        method: 'GET',
        headersRaw: '',
        bodyRaw: '',
        outputPath: 'api.result',
        ...overrides,
      },
    },
  }
}

function createConditionNode(overrides: Partial<ConditionNodeConfig> = {}): PipelineNode<'condition'> {
  return {
    id: 'condition-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'condition',
      label: 'Condition',
      config: {
        leftPath: 'users.0.age',
        operator: 'greaterThan',
        aggregation: 'any',
        rightType: 'number',
        rightValue: '18',
        ...overrides,
      },
    },
  }
}

function createFilterNode(overrides: Partial<FilterNodeConfig> = {}): PipelineNode<'filter'> {
  return {
    id: 'filter-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'filter',
      label: 'Filter',
      config: {
        sourcePath: 'users',
        itemPath: 'age',
        operator: 'greaterThan',
        rightType: 'number',
        rightValue: '18',
        outputPath: 'result.adults',
        outputPathRejected: 'result.minors',
        ...overrides,
      },
    },
  }
}

describe('api executor', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let context: ExecutionContext

  beforeEach(() => {
    fetchMock = vi.fn()
    context = {
      data: {},
      logs: [],
    }

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores a JSON response at outputPath', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ users: [{ id: 1, name: 'Ada' }] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const node = createApiNode()
    const result = await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/users',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(context.data).toEqual({
      api: {
        result: {
          users: [{ id: 1, name: 'Ada' }],
        },
      },
    })
    expect(result.message).toContain('completed (200)')
    expect(result.details).toEqual({
      request: {
        headers: {},
        body: null,
      },
      response: {
        users: [{ id: 1, name: 'Ada' }],
      },
    })
  })

  it('stores a text response when content type is not JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('ok', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      }),
    )

    const node = createApiNode({ outputPath: 'api.raw' })
    const result = await executorByType.api(node, context)

    expect(context.data).toEqual({
      api: {
        raw: 'ok',
      },
    })
    expect(result.details).toEqual({
      request: {
        headers: {},
        body: null,
      },
      response: 'ok',
    })
  })

  it('adds Content-Type for POST when missing', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ created: true }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const node = createApiNode({
      method: 'POST',
      bodyRaw: '{"name":"Ada"}',
      headersRaw: '{"Accept":"application/json"}',
    })

    await executorByType.api(node, context)

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toBe('{"name":"Ada"}')
    expect(requestInit.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
  })

  it('throws when API returns a non-success status', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad request' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const node = createApiNode()

    await expect(executorByType.api(node, context)).rejects.toThrow('API error 400: Bad Request')
  })

  it('throws when bodyRaw is not valid JSON in POST', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    const node = createApiNode({
      method: 'POST',
      bodyRaw: '{invalid-json}',
    })

    await expect(executorByType.api(node, context)).rejects.toThrow('Body JSON is not valid JSON.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves #variables for URL and outputPath', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    context.data.__variables = {
      apiUrl: 'https://example.test/from-variable',
      outputPath: 'result.fromVariable',
    }

    const node = createApiNode({
      url: '#apiUrl',
      outputPath: '#outputPath',
    })

    await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/from-variable',
      expect.objectContaining({ method: 'GET' }),
    )

    expect(context.data).toEqual(
      expect.objectContaining({
        __variables: {
          apiUrl: 'https://example.test/from-variable',
          outputPath: 'result.fromVariable',
        },
        result: {
          fromVariable: {
            ok: true,
          },
        },
      }),
    )
  })
})

describe('condition executor', () => {
  let context: ExecutionContext

  beforeEach(() => {
    context = {
      data: {
        users: [
          { age: 15 },
          { age: 21 },
          { age: 17 },
        ],
      },
      logs: [],
    }
  })

  it('supports wildcard path with aggregation any', async () => {
    const node = createConditionNode({
      leftPath: 'users.*.age',
      aggregation: 'any',
      rightValue: '18',
    })

    const result = await executorByType.condition(node, context)

    expect(result.nextBranch).toBe('true')
    expect(context.data.__lastCondition).toBe(true)
    expect(result.details).toEqual(
      expect.objectContaining({
        aggregation: 'any',
        totalItems: 3,
        matchedItems: 1,
      }),
    )
  })

  it('supports wildcard path with aggregation all', async () => {
    const node = createConditionNode({
      leftPath: 'users.*.age',
      aggregation: 'all',
      rightValue: '18',
    })

    const result = await executorByType.condition(node, context)

    expect(result.nextBranch).toBe('false')
    expect(context.data.__lastCondition).toBe(false)
  })

  it('supports wildcard path with aggregation none', async () => {
    const node = createConditionNode({
      leftPath: 'users.*.age',
      aggregation: 'none',
      rightValue: '50',
    })

    const result = await executorByType.condition(node, context)

    expect(result.nextBranch).toBe('true')
    expect(context.data.__lastCondition).toBe(true)
  })
})

describe('filter executor', () => {
  let context: ExecutionContext

  beforeEach(() => {
    context = {
      data: {
        users: [
          { age: 15, name: 'A' },
          { age: 21, name: 'B' },
          { age: 30, name: 'C' },
        ],
      },
      logs: [],
    }
  })

  it('filters array items and stores them at outputPath', async () => {
    const node = createFilterNode()

    const result = await executorByType.filter(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        users: [
          { age: 15, name: 'A' },
          { age: 21, name: 'B' },
          { age: 30, name: 'C' },
        ],
        result: {
          adults: [
            { age: 21, name: 'B' },
            { age: 30, name: 'C' },
          ],
          minors: [
            { age: 15, name: 'A' },
          ],
        },
      }),
    )

    expect(result.details).toEqual(
      expect.objectContaining({
        totalItems: 3,
        keptItems: 2,
        rejectedItems: 1,
      }),
    )
  })

  it('supports exists operator on itemPath', async () => {
    const node = createFilterNode({
      itemPath: 'name',
      operator: 'exists',
      rightType: 'null',
      rightValue: '',
      outputPath: 'result.withName',
      outputPathRejected: 'result.withoutName',
    })

    await executorByType.filter(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          withName: [
            { age: 15, name: 'A' },
            { age: 21, name: 'B' },
            { age: 30, name: 'C' },
          ],
          withoutName: [],
        },
      }),
    )
  })
})
