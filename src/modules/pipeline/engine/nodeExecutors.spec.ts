import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executorByType } from '@/modules/pipeline/engine/nodeExecutors'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  ExecutionContext,
  FilterNodeConfig,
  OutputNodeConfig,
  PipelineNode,
  SetVariableNodeConfig,
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
        headers: [],
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

function createSetVariableNode(overrides: Partial<SetVariableNodeConfig> = {}): PipelineNode<'setVariable'> {
  return {
    id: 'set-variable-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'setVariable',
      label: 'Update variable',
      config: {
        extractions: [
          {
            extractPath: 'api.result.token',
            variableName: 'authToken',
          },
        ],
        ...overrides,
      },
    },
  }
}

function createOutputNode(overrides: Partial<OutputNodeConfig> = {}): PipelineNode<'output'> {
  return {
    id: 'output-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'output',
      label: 'Output',
      config: {
        outputPath: 'result',
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
    expect(result.message).toContain('(200)')
    expect(result.details).toEqual({
      url: 'https://example.test/users',
      method: 'GET',
      outputPath: 'api.result',
      headers: {},
      body: undefined,
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
      url: 'https://example.test/users',
      method: 'GET',
      outputPath: 'api.raw',
      headers: {},
      body: undefined,
    })
  })

  it('serializes POST JSON body before request', async () => {
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
      headers: [{ key: 'Accept', value: 'application/json' }],
    })

    await executorByType.api(node, context)

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toEqual('{"name":"Ada"}')
    expect(requestInit.headers).toEqual({
      Accept: 'application/json',
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

    await expect(executorByType.api(node, context)).rejects.toThrow(/400: Bad Request/)
  })

  it('throws when bodyRaw is not valid JSON in POST', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    const node = createApiNode({
      method: 'POST',
      bodyRaw: '{invalid-json}',
    })

    await expect(executorByType.api(node, context)).rejects.toThrow(/JSON/)
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

  it('supports concatenating variables inside URL and outputPath', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    context.data.__variables = {
      host: 'https://example.test',
      endpoint: '/users',
      outputBase: 'result',
    }

    const node = createApiNode({
      url: '#host#endpoint?source=#outputBase',
      outputPath: '#outputBase.items',
    })

    await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/users?source=result',
      expect.objectContaining({ method: 'GET' }),
    )

    expect(context.data).toEqual(
      expect.objectContaining({
        __variables: {
          host: 'https://example.test',
          endpoint: '/users',
          outputBase: 'result',
        },
        result: {
          items: {
            ok: true,
          },
        },
      }),
    )
  })

  it('supports concatenating an object variable property in headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    context.data.__variables = {
      myVar: {
        token: 'abc-123',
      },
    }

    const node = createApiNode({
      headers: [{ key: 'Authorization', value: 'Bearer #myVar.token' }],
    })

    await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/users',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer abc-123',
        },
      }),
    )
  })

  it('supports concatenating an object variable property in bodyRaw', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    context.data.__variables = {
      myVar: {
        token: 'abc-123',
      },
    }

    const node = createApiNode({
      method: 'POST',
      bodyRaw: '{"authorization":"Bearer #myVar.token"}',
    })

    await executorByType.api(node, context)

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toEqual('{"authorization":"Bearer abc-123"}')
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

describe('setVariable executor', () => {
  let context: ExecutionContext

  beforeEach(() => {
    context = {
      data: {
        api: {
          result: {
            token: 'token-123',
            profile: {
              id: 42,
            },
          },
        },
        __variables: {
          authToken: 'old-token',
          userId: 0,
        },
      },
      logs: [],
    }
  })

  it('updates only existing variables from pipeline parameters', async () => {
    const node = createSetVariableNode({
      extractions: [
        {
          extractPath: 'api.result.token',
          variableName: 'authToken',
        },
        {
          extractPath: 'api.result.profile.id',
          variableName: 'userId',
        },
      ],
    })

    await executorByType.setVariable(node, context)

    expect(context.data.__variables).toEqual({
      authToken: 'token-123',
      userId: 42,
    })
  })

  it('throws when trying to write into a variable not defined in parameters', async () => {
    const node = createSetVariableNode({
      extractions: [
        {
          extractPath: 'api.result.token',
          variableName: 'newVariable',
        },
      ],
    })

    await expect(executorByType.setVariable(node, context)).rejects.toThrow(/newVariable/)
  })
})

describe('output executor', () => {
  let context: ExecutionContext

  beforeEach(() => {
    context = {
      data: {
        result: {
          value: 123,
        },
        __variables: {
          dynamicPath: 'result.value',
          payload: {
            foo: 'bar',
          },
        },
      },
      logs: [],
    }
  })

  it('keeps legacy behavior for #variable containing a path string', async () => {
    const node = createOutputNode({ outputPath: '#dynamicPath' })

    await executorByType.output(node, context)

    expect(context.data.__output).toBe(123)
  })

  it('supports #variable.property when variable holds an object', async () => {
    const node = createOutputNode({ outputPath: '#payload.foo' })

    await executorByType.output(node, context)

    expect(context.data.__output).toBe('bar')
  })
})
