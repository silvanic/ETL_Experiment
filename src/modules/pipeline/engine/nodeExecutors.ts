import { getByPath, setByPath } from '@/modules/pipeline/engine/pathUtils'
import { t } from '@/i18n'
import { resolveValueWithVariables } from '@/modules/pipeline/domain/variables'
import type { ExecutorResult } from '@/modules/pipeline/engine/executorTypes'
import { getContextVariableMap } from '@/modules/pipeline/engine/variableContext'
import type {
  ApiNodeConfig,
  ConditionAggregation,
  ConditionOperator,
  ConditionNodeConfig,
  ExecutionContext,
  FilterNodeConfig,
  NodeType,
  OutputNodeConfig,
  PipelineNode,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'

type NodeExecutor = (node: PipelineNode, context: ExecutionContext) => Promise<ExecutorResult>

function parseJsonOrThrow(text: string, fieldName: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(t('engine.json.invalid', { fieldName }))
  }
}

function parseHeaders(headersRaw: string): HeadersInit {
  if (!headersRaw.trim()) {
    return {}
  }

  const parsed = parseJsonOrThrow(headersRaw, t('inspector.fields.headersJson'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(t('engine.json.headersMustBeObject'))
  }

  return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    },
    {},
  )
}

function castRightValue(type: 'string' | 'number' | 'boolean' | 'null', value: string): unknown {
  if (type === 'number') {
    return Number(value)
  }

  if (type === 'boolean') {
    return value.toLowerCase() === 'true'
  }

  if (type === 'null') {
    return null
  }

  return value
}

function resolveConfigValue(value: string, context: ExecutionContext): string {
  return resolveValueWithVariables(value, getContextVariableMap(context))
}

function evaluateCondition(left: unknown, operator: ConditionOperator, right: unknown): boolean {
  if (operator === 'equals') {
    return left === right
  }

  if (operator === 'notEquals') {
    return left !== right
  }

  if (operator === 'greaterThan') {
    return Number(left) > Number(right)
  }

  if (operator === 'lessThan') {
    return Number(left) < Number(right)
  }

  if (operator === 'contains') {
    if (Array.isArray(left)) {
      return left.includes(right)
    }

    return String(left ?? '').includes(String(right ?? ''))
  }

  if (operator === 'exists') {
    return left !== undefined && left !== null
  }

  return false
}

function resolveWildcardValues(data: unknown, path: string): unknown[] {
  if (!path) {
    return [data]
  }

  const segments = path.split('.').filter(Boolean)

  const walk = (current: unknown, index: number): unknown[] => {
    if (index >= segments.length) {
      return [current]
    }

    const segment = segments[index]
    if (segment === '*') {
      if (!Array.isArray(current)) {
        return []
      }

      return current.flatMap((item) => walk(item, index + 1))
    }

    if (current === null || current === undefined || typeof current !== 'object') {
      return [undefined]
    }

    const next = (current as Record<string, unknown>)[segment]
    return walk(next, index + 1)
  }

  return walk(data, 0)
}

function aggregateConditionResults(results: boolean[], aggregation: ConditionAggregation): boolean {
  if (results.length === 0) {
    return aggregation === 'all' || aggregation === 'none'
  }

  if (aggregation === 'all') {
    return results.every(Boolean)
  }

  if (aggregation === 'none') {
    return results.every((result) => !result)
  }

  return results.some(Boolean)
}

function getValueType(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  return typeof value
}

function getValuePreview(value: unknown, maxLength = 200): string {
  if (typeof value === 'string') {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
  }

  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      return String(value)
    }

    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized
  } catch {
    return String(value)
  }
}

const startExecutor: NodeExecutor = async () => {
  return {}
}

const apiExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'api') {
    return {}
  }

  const config = node.data.config as ApiNodeConfig
  const resolvedUrl = resolveConfigValue(config.url, context)
  const resolvedHeadersRaw = resolveConfigValue(config.headersRaw, context)
  const resolvedBodyRaw = resolveConfigValue(config.bodyRaw, context)
  const resolvedOutputPath = resolveConfigValue(config.outputPath, context)
  const headers = parseHeaders(resolvedHeadersRaw)

  const requestInit: RequestInit = {
    method: config.method,
    headers,
  }

  if (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') {
    if (resolvedBodyRaw.trim()) {
      const parsedBody = parseJsonOrThrow(resolvedBodyRaw, t('inspector.fields.bodyJson'))
      requestInit.body = JSON.stringify(parsedBody)
    }

    if (!(headers as Record<string, string>)['Content-Type']) {
      requestInit.headers = {
        ...(headers as Record<string, string>),
        'Content-Type': 'application/json',
      }
    }
  }

  const response = await fetch(resolvedUrl, requestInit)
  const contentType = response.headers.get('content-type')

  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new Error(
      t('engine.api.error', {
        status: response.status,
        statusText: response.statusText,
      }),
    )
  }

  setByPath(context.data, resolvedOutputPath, payload)

  return {
    message: t('engine.api.completed', {
      method: config.method,
      url: resolvedUrl,
      status: response.status,
    }),
    details: {
      url: resolvedUrl,
      requestInit
    }
  }
}

const conditionExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'condition') {
    return {}
  }

  const config = node.data.config as ConditionNodeConfig
  const resolvedLeftPath = resolveConfigValue(config.leftPath, context)
  const resolvedRightValue = resolveConfigValue(config.rightValue, context)
  const aggregation = config.aggregation ?? 'any'
  const leftValues = resolvedLeftPath.includes('*')
    ? resolveWildcardValues(context.data, resolvedLeftPath)
    : [getByPath(context.data, resolvedLeftPath)]
  const rightValue = castRightValue(config.rightType, resolvedRightValue)
  const evaluations = leftValues.map((leftValue) => evaluateCondition(leftValue, config.operator, rightValue))
  const result = aggregateConditionResults(evaluations, aggregation)

  context.data.__lastCondition = result
  return {
    nextBranch: result ? 'true' : 'false',
    message: t('engine.condition.result', {
      leftPath: resolvedLeftPath,
      operator: config.operator,
      rightValue: resolvedRightValue,
      branchLabel: result
        ? t('engine.condition.trueLabel')
        : t('engine.condition.falseLabel'),
    }),
    details: {
      left: leftValues,
      operator: config.operator,
      aggregation,
      right: rightValue,
      result,
      totalItems: leftValues.length,
      matchedItems: evaluations.filter(Boolean).length,
      branch: result ? 'true' : 'false',
    },
  }
}

const filterExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'filter') {
    return {}
  }

  const config = node.data.config as FilterNodeConfig
  const resolvedSourcePath = resolveConfigValue(config.sourcePath, context)
  const resolvedItemPath = resolveConfigValue(config.itemPath, context)
  const resolvedRightValue = resolveConfigValue(config.rightValue, context)
  const resolvedOutputPath = resolveConfigValue(config.outputPath, context)
  const resolvedOutputPathRejected = resolveConfigValue(config.outputPathRejected, context)

  const sourceValue = getByPath(context.data, resolvedSourcePath)
  const sourceItems = Array.isArray(sourceValue) ? sourceValue : []
  const rightValue = castRightValue(config.rightType, resolvedRightValue)

  const accepted = sourceItems.filter((item) => {
    const leftValue = resolvedItemPath.trim() ? getByPath(item, resolvedItemPath) : item
    return evaluateCondition(leftValue, config.operator, rightValue)
  })
  console.log('Filter Executor:', sourceValue, sourceItems, accepted, rightValue, resolvedItemPath, config.operator)

  const rejected = sourceItems.filter((item) => !accepted.includes(item))

  setByPath(context.data, resolvedOutputPath, accepted)
  setByPath(context.data, resolvedOutputPathRejected, rejected)
  return {
    message: t('engine.filter.result', {
      sourcePath: resolvedSourcePath,
      outputPath: resolvedOutputPath,
      outputPathRejected: resolvedOutputPathRejected,
      kept: accepted.length,
      rejected: rejected.length,
      total: sourceItems.length,
    }),
    dataOut: {
      filtered: accepted,
      rejected,
    },
    details: {
      sourcePath: resolvedSourcePath,
      itemPath: resolvedItemPath,
      operator: config.operator,
      right: rightValue,
      totalItems: sourceItems.length,
      keptItems: accepted.length,
      rejectedItems: rejected.length,
      outputPath: resolvedOutputPath,
      outputPathRejected: resolvedOutputPathRejected,
    },
  }
}

const transformExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'transform') {
    return {}
  }

  const config = node.data.config as TransformNodeConfig
  const resolvedSourcePath = resolveConfigValue(config.sourcePath, context)
  const resolvedTargetPath = resolveConfigValue(config.targetPath, context)
  const resolvedLiteralValue = resolveConfigValue(config.literalValue, context)
  const previousTargetValue = getByPath(context.data, resolvedTargetPath)
  const targetExistedBefore = previousTargetValue !== undefined
  if (config.mode === 'pickPath') {
    const sourceValue = getByPath(context.data, resolvedSourcePath)
    const sourceFound = sourceValue !== undefined
    setByPath(context.data, resolvedTargetPath, sourceValue)
    const targetValue = getByPath(context.data, resolvedTargetPath)
    const changed = previousTargetValue !== targetValue

    return {
      message: t('engine.transform.result', {
        mode: config.mode,
        targetPath: resolvedTargetPath,
        status: sourceFound
          ? t('engine.transform.status.applied')
          : t('engine.transform.status.sourceMissing'),
      }),
      dataOut: {
        mode: config.mode,
        targetPath: resolvedTargetPath,
        appliedValuePreview: getValuePreview(targetValue),
      },
      details: {
        mode: config.mode,
        sourcePath: resolvedSourcePath,
        targetPath: resolvedTargetPath,
        sourceFound,
        targetExistedBefore,
        valueTypeIn: getValueType(sourceValue),
        valueTypeOut: getValueType(targetValue),
        isNoop: !changed,
      },
    }
  }

  setByPath(context.data, resolvedTargetPath, resolvedLiteralValue)
  const targetValue = getByPath(context.data, resolvedTargetPath)
  const changed = previousTargetValue !== targetValue

  return {
    message: t('engine.transform.result', {
      mode: config.mode,
      targetPath: resolvedTargetPath,
      status: t('engine.transform.status.applied'),
    }),
    dataOut: {
      mode: config.mode,
      targetPath: resolvedTargetPath,
      appliedValuePreview: getValuePreview(targetValue),
    },
    details: {
      mode: config.mode,
      sourcePath: resolvedSourcePath,
      targetPath: resolvedTargetPath,
      targetExistedBefore,
      valueTypeIn: getValueType(resolvedLiteralValue),
      valueTypeOut: getValueType(targetValue),
      isNoop: !changed,
    },
  }
}

const outputExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'output') {
    return {}
  }
  const config = node.data.config as OutputNodeConfig
  const resolvedOutputPath = resolveConfigValue(config.outputPath, context)
  const value = getByPath(context.data, resolvedOutputPath)
  context.data.__output = value
  return {
    message: t('engine.output.resolved', { path: resolvedOutputPath }),
    details: value,
  }
}

export const executorByType: Record<NodeType, NodeExecutor> = {
  start: startExecutor,
  api: apiExecutor,
  condition: conditionExecutor,
  filter: filterExecutor,
  transform: transformExecutor,
  output: outputExecutor,
}
