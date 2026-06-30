import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executorByType } from '@/modules/pipeline/engine/nodeExecutors'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  ExecutionContext,
  FilterNodeConfig,
  IterateNodeConfig,
  MapNodeConfig,
  OutputNodeConfig,
  PipelineNode,
  SetVariableNodeConfig,
  TransformNodeConfig,
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

function createMapNode(overrides: Partial<MapNodeConfig> = {}): PipelineNode<'map'> {
  return {
    id: 'map-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'map',
      label: 'Map',
      config: {
        sourcePath: 'users',
        outputPath: 'result.usersSlim',
        mappings: [
          { targetField: 'id', literalValue: '{id}', fallbackValue: '' },
          { targetField: 'profile.name', literalValue: '{name}', fallbackValue: '' },
        ],
        ...overrides,
      },
    },
  }
}

function createIterateNode(overrides: Partial<IterateNodeConfig> = {}): PipelineNode<'iterate'> {
  return {
    id: 'iterate-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'iterate',
      label: 'Iterate',
      config: {
        sourcePath: 'items',
        ...overrides,
      },
    },
  }
}

function createTransformNode(overrides: Partial<TransformNodeConfig> = {}): PipelineNode<'transform'> {
  return {
    id: 'transform-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: 'transform',
      label: 'Transform',
      config: {
        mode: 'assignLiteral',
        sourcePath: '',
        targetPath: 'result.value',
        literalValue: '',
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
      status: 200,
      statusText: '',
      contentType: 'application/json',
      outputPath: 'api.result',
      headers: {},
      body: undefined,
      attempts: 1,
      retriesUsed: 0,
      configuredMaxRetries: 3,
      payloadType: 'object',
      payloadPreview: '{"users":[{"id":1,"name":"Ada"}]}',
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
      status: 200,
      statusText: '',
      contentType: 'text/plain',
      outputPath: 'api.raw',
      headers: {},
      body: undefined,
      attempts: 1,
      retriesUsed: 0,
      configuredMaxRetries: 3,
      payloadType: 'string',
      payloadPreview: 'ok',
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

  it('retries on retryable HTTP errors and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'temporary failure' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [{ id: 42 }] }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

    const node = createApiNode({
      retryConfig: {
        maxRetries: 2,
        delayMs: 0,
      },
    })

    const result = await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.message).toContain('(200)')
    expect(result.details).toEqual(
      expect.objectContaining({
        attempts: 2,
        retriesUsed: 1,
        configuredMaxRetries: 2,
      }),
    )
    expect(context.data).toEqual(
      expect.objectContaining({
        api: {
          result: {
            users: [{ id: 42 }],
          },
        },
      }),
    )
  })

  it('retries on network failure and succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

    const node = createApiNode({
      retryConfig: {
        maxRetries: 1,
        delayMs: 0,
      },
    })

    await executorByType.api(node, context)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry on non-retryable HTTP errors', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad request' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const node = createApiNode({
      retryConfig: {
        maxRetries: 3,
        delayMs: 0,
      },
    })

    await expect(executorByType.api(node, context)).rejects.toThrow(/400: Bad Request/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

describe('map executor', () => {
  it('maps an array from sourcePath to outputPath with nested target fields', async () => {
    const context: ExecutionContext = {
      data: {
        users: [
          { id: 1, name: 'Ada', email: 'ada@example.test' },
          { id: 2, name: 'Linus', email: 'linus@example.test' },
        ],
      },
      logs: [],
    }

    const node = createMapNode({
      mappings: [
        { targetField: 'id', literalValue: '{id}', fallbackValue: '' },
        { targetField: 'profile.name', literalValue: '{name}', fallbackValue: '' },
      ],
    })

    const result = await executorByType.map(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          usersSlim: [
            { id: 1, profile: { name: 'Ada' } },
            { id: 2, profile: { name: 'Linus' } },
          ],
        },
      }),
    )

    expect(result.message).toContain('result.usersSlim')
    expect(result.details).toEqual({
      sourcePath: 'users',
      outputPath: 'result.usersSlim',
      mappingsCount: 2,
      inputCount: 2,
      outputCount: 2,
    })
  })

  it('supports literal values in mapping rows', async () => {
    const context: ExecutionContext = {
      data: {
        users: [{ id: 1, name: 'Ada' }],
      },
      logs: [],
    }

    const node = createMapNode({
      mappings: [
        { targetField: 'id', literalValue: '{id}', fallbackValue: '' },
        { targetField: 'meta.source', literalValue: 'manual', fallbackValue: '' },
      ],
    })

    await executorByType.map(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          usersSlim: [
            { id: 1, meta: { source: 'manual' } },
          ],
        },
      }),
    )
  })

  it('uses fallback value when path is missing', async () => {
    const context: ExecutionContext = {
      data: {
        users: [{ id: 1 }],
      },
      logs: [],
    }

    const node = createMapNode({
      mappings: [
        { targetField: 'name', literalValue: '{name}', fallbackValue: 'N/A' },
      ],
    })

    await executorByType.map(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          usersSlim: [
            { name: 'N/A' },
          ],
        },
      }),
    )
  })

  it('resolves global variables in literalValue without templates', async () => {
    const context: ExecutionContext = {
      data: {
        users: [{ id: 1 }],
        __variables: {
          env: 'prod',
        },
      },
      logs: [],
    }

    const node = createMapNode({
      mappings: [
        { targetField: 'meta.environment', literalValue: '#env', fallbackValue: '' },
      ],
    })

    await executorByType.map(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          usersSlim: [
            { meta: { environment: 'prod' } },
          ],
        },
      }),
    )
  })

  it('resolves global variables in mixed template literalValue', async () => {
    const context: ExecutionContext = {
      data: {
        users: [{ firstName: 'Ada', lastName: 'Lovelace' }],
        __variables: {
          env: 'prod',
        },
      },
      logs: [],
    }

    const node = createMapNode({
      mappings: [
        {
          targetField: 'label',
          literalValue: 'User: {firstName} {lastName} (env=#env)',
          fallbackValue: '',
        },
      ],
    })

    await executorByType.map(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          usersSlim: [
            { label: 'User: Ada Lovelace (env=prod)' },
          ],
        },
      }),
    )
  })
})

describe('iterate executor', () => {
  it('coerces a JSON array string into iterable items', async () => {
    const context: ExecutionContext = {
      data: {
        __variables: {
          values: '[1,2,3,4]',
        },
      },
      logs: [],
    }

    const node = createIterateNode({
      sourcePath: '#values',
    })

    const result = await executorByType.iterate(node, context)

    expect(result.scopedData).toEqual({
      iterateItems: [1, 2, 3, 4],
    })
    expect(result.details).toEqual(
      expect.objectContaining({
        sourcePath: '#values',
        count: 4,
      }),
    )
  })

  it('keeps non-array strings as empty iterate items', async () => {
    const context: ExecutionContext = {
      data: {
        __variables: {
          values: 'not-an-array',
        },
      },
      logs: [],
    }

    const node = createIterateNode({
      sourcePath: '#values',
    })

    const result = await executorByType.iterate(node, context)

    expect(result.scopedData).toEqual({
      iterateItems: [],
    })
    expect(result.details).toEqual(
      expect.objectContaining({
        sourcePath: '#values',
        count: 0,
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

describe('transform executor', () => {
  it('supports mixed templates with context paths and #variables in assignLiteral mode', async () => {
    const context: ExecutionContext = {
      data: {
        user: { firstName: 'Ada', lastName: 'Lovelace' },
        __variables: { env: 'prod' },
      },
      logs: [],
    }

    const node = createTransformNode({
      targetPath: 'result.label',
      literalValue: 'User: {user.firstName} {user.lastName} (env=#env)',
    })

    await executorByType.transform(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          label: 'User: Ada Lovelace (env=prod)',
        },
      }),
    )
  })

  it('supports dynamic bracket index in pickPath mode', async () => {
    const context: ExecutionContext = {
      data: {
        result: [{ name: 'Ada' }, { name: 'Bob' }],
        __currentIndex: 1,
      },
      logs: [],
    }

    const node = createTransformNode({
      mode: 'pickPath',
      sourcePath: 'result[__currentIndex].name',
      targetPath: 'currentName',
    })

    await executorByType.transform(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        currentName: 'Bob',
      }),
    )
  })

  it('returns raw value for a single template token in assignLiteral mode', async () => {
    const context: ExecutionContext = {
      data: {
        user: { age: 36 },
      },
      logs: [],
    }

    const node = createTransformNode({
      targetPath: 'result.age',
      literalValue: '{user.age}',
    })

    await executorByType.transform(node, context)

    expect(context.data).toEqual(
      expect.objectContaining({
        result: {
          age: 36,
        },
      }),
    )
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

  it('supports literal text assignment', async () => {
    const node = createSetVariableNode({
      extractions: [
        {
          sourceType: 'literal',
          extractPath: '',
          literalValue: 'bla bla',
          variableName: 'authToken',
        },
      ],
    })

    await executorByType.setVariable(node, context)

    expect(context.data.__variables).toEqual({
      authToken: 'bla bla',
      userId: 0,
    })
  })

  it('supports literal JSON array assignment', async () => {
    const node = createSetVariableNode({
      extractions: [
        {
          sourceType: 'literal',
          extractPath: '',
          literalValue: '[1,2,3,4]',
          variableName: 'authToken',
        },
      ],
    })

    await executorByType.setVariable(node, context)

    expect(context.data.__variables).toEqual({
      authToken: [1, 2, 3, 4],
      userId: 0,
    })
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
