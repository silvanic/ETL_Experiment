import { getByPath, setByPath } from '@/modules/pipeline/engine/pathUtils'
import { t } from '@/i18n'
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
  SetVariableNodeConfig,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'

type NodeExecutor = (node: PipelineNode, context: ExecutionContext) => Promise<ExecutorResult>

function escapeMultilineJsonStrings(text: string): string {
  let inString = false
  let escaped = false
  let out = ''

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '"' && !escaped) {
      inString = !inString
      out += char
      escaped = false
      continue
    }

    if (char === '\\' && !escaped) {
      out += char
      escaped = true
      continue
    }

    if (inString && (char === '\n' || char === '\r')) {
      out += '\\n'
      escaped = false
      continue
    }

    if (inString && char === '\t') {
      out += '\\t'
      escaped = false
      continue
    }

    out += char
    escaped = false
  }

  return out
}

function parseJsonOrThrow(text: string, fieldName: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    try {
      return JSON.parse(escapeMultilineJsonStrings(text))
    } catch {
      throw new Error(t('engine.json.invalid', { fieldName }))
    }
  }
}

function parseHeaders(headersArray: Array<{ key: string; value: string }>): HeadersInit {
  if (!headersArray || headersArray.length === 0) {
    return {}
  }

  return headersArray.reduce<Record<string, string>>(
    (acc, { key, value }) => {
      if (key.trim()) {
        acc[key] = value
      }
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
  const rawVariables = getRawContextVariables(context)
  const stringVariables = getContextVariableMap(context)
  const variablePathRegex = /#([a-zA-Z][a-zA-Z0-9_-]*)(((?:\.[a-zA-Z0-9_-]+(?:\[\*\])?|\.[0-9]+|\[\*\]))*)/g

  return value.replace(
    variablePathRegex,
    (fullMatch: string, variableName: string, suffix: string) => {
      const rawValue = rawVariables[variableName]
      const hasSuffix = suffix.length > 0

      if (hasSuffix && typeof rawValue === 'object' && rawValue !== null) {
        const normalizedSuffix = suffix.startsWith('.') ? suffix.slice(1) : suffix
        const resolvedValue = getByPath(rawValue, normalizedSuffix)
        return resolvedValue === undefined ? fullMatch : String(resolvedValue)
      }

      const resolvedVariable = stringVariables[variableName]
      if (resolvedVariable === undefined) {
        return fullMatch
      }

      return `${resolvedVariable}${suffix}`
    },
  )
}

function getRawContextVariables(context: ExecutionContext): Record<string, unknown> {
  const source = context.data.__variables
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return {}
  }

  return source as Record<string, unknown>
}

function resolvePathValue(value: string, context: ExecutionContext): string {
  const rawVariables = getRawContextVariables(context)
  const stringVariables = getContextVariableMap(context)
  const variablePathRegex = /#([a-zA-Z][a-zA-Z0-9_-]*)(((?:\.[a-zA-Z0-9_-]+(?:\[\*\])?|\.[0-9]+|\[\*\]))*)/g

  return value.replace(
    variablePathRegex,
    (fullMatch: string, variableName: string, suffix: string) => {
      const rawValue = rawVariables[variableName]
      const hasSuffix = suffix.length > 0

      if (typeof rawValue === 'object' && rawValue !== null) {
        if (!hasSuffix) {
          return `__variables.${variableName}`
        }

        const normalizedSuffix = suffix.startsWith('.') ? suffix.slice(1) : suffix
        const separator = normalizedSuffix.startsWith('[') ? '' : '.'
        return `__variables.${variableName}${separator}${normalizedSuffix}`
      }

      const resolvedVariable = stringVariables[variableName]
      if (resolvedVariable === undefined) {
        return fullMatch
      }

      return `${resolvedVariable}${suffix}`
    },
  )
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
  const resolvedHeaders = config.headers.map(header => ({
    key: resolveConfigValue(header.key, context),
    value: resolveConfigValue(header.value, context),
  }))
  const resolvedBodyRaw = resolveConfigValue(config.bodyRaw, context)
  const resolvedOutputPath = resolvePathValue(config.outputPath, context)
  const headers = parseHeaders(resolvedHeaders)

  const requestInit: RequestInit = {
    method: config.method,
    headers,
  }

  if (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') {
    if (resolvedBodyRaw.trim()) {
      const parsedBody = parseJsonOrThrow(resolvedBodyRaw, t('inspector.fields.bodyJson'))
      requestInit.body = JSON.stringify(parsedBody)
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

  // Format the request body for logging
  const formattedBody = requestInit.body && typeof requestInit.body === 'string'
    ? JSON.parse(requestInit.body)
    : requestInit.body

  // Store the result at the specified output path
  setByPath(context.data, resolvedOutputPath, payload)

  // Create an output object showing only what was just stored
  const dataOut: Record<string, unknown> = {}
  dataOut[config.outputPath] = {...payload};

  return {
    message: t('engine.api.completed', {
      method: config.method,
      url: resolvedUrl,
      status: response.status,
    }),
    details: {
      url: resolvedUrl,
      method: config.method,
      outputPath: resolvedOutputPath,
      headers: headers,
      body: formattedBody,
    },
    dataOut,
    }
  }

const conditionExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'condition') {
    return {}
  }

  const config = node.data.config as ConditionNodeConfig
  const resolvedLeftPath = resolvePathValue(config.leftPath, context)
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
  const resolvedSourcePath = resolvePathValue(config.sourcePath, context)
  const resolvedItemPath = resolvePathValue(config.itemPath, context)
  const resolvedRightValue = resolveConfigValue(config.rightValue, context)
  const resolvedOutputPath = resolvePathValue(config.outputPath, context)
  const resolvedOutputPathRejected = resolvePathValue(config.outputPathRejected, context)

  const sourceValue = getByPath(context.data, resolvedSourcePath)
  const sourceItems = Array.isArray(sourceValue) ? sourceValue : []
  const rightValue = castRightValue(config.rightType, resolvedRightValue)

  const accepted = sourceItems.filter((item) => {
    const leftValue = resolvedItemPath.trim() ? getByPath(item, resolvedItemPath) : item
    return evaluateCondition(leftValue, config.operator, rightValue)
  })

  const rejected = sourceItems.filter((item) => !accepted.includes(item))

  setByPath(context.data, resolvedOutputPath, accepted)
  setByPath(context.data, resolvedOutputPathRejected, rejected)

  // Create an output object showing only what was just stored
  const dataOut: Record<string, unknown> = {}
  setByPath(dataOut, resolvedOutputPath, accepted)
  setByPath(dataOut, resolvedOutputPathRejected, rejected)

  return {
    message: t('engine.filter.result', {
      sourcePath: resolvedSourcePath,
      outputPath: resolvedOutputPath,
      outputPathRejected: resolvedOutputPathRejected,
      kept: accepted.length,
      rejected: rejected.length,
      total: sourceItems.length,
    }),
    dataOut,
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
  const resolvedTargetPath = resolvePathValue(config.targetPath, context)
  const resolvedLiteralValue = resolveConfigValue(config.literalValue, context)
  const previousTargetValue = getByPath(context.data, resolvedTargetPath)
  const targetExistedBefore = previousTargetValue !== undefined
  if (config.mode === 'pickPath') {
    const resolvedSourcePath = resolvePathValue(config.sourcePath, context)
    const sourceValue = getByPath(context.data, resolvedSourcePath)
    const sourceFound = sourceValue !== undefined
    setByPath(context.data, resolvedTargetPath, sourceValue)
    const targetValue = getByPath(context.data, resolvedTargetPath)
    const changed = previousTargetValue !== targetValue

    // Create an output object showing only what was just stored
    const dataOut: Record<string, unknown> = {}
    setByPath(dataOut, resolvedTargetPath, sourceValue)

    return {
      message: sourceFound
        ? t('engine.transform.pickPathApplied', {
            targetPath: resolvedTargetPath,
            sourcePath: resolvedSourcePath,
          })
        : t('engine.transform.pickPathSourceMissing', {
            targetPath: resolvedTargetPath,
            sourcePath: resolvedSourcePath,
          }),
      dataOut,
      details: {
        mode: config.mode,
        sourcePath: resolvedSourcePath,
        sourcePathValue: sourceValue,
        sourcePathValuePreview: getValuePreview(sourceValue),
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

  // Create an output object showing only what was just stored
  const dataOut: Record<string, unknown> = {}
  setByPath(dataOut, resolvedTargetPath, resolvedLiteralValue)

  return {
    message: t('engine.transform.literalApplied', {
      targetPath: resolvedTargetPath,
    }),
    dataOut,
    details: {
      mode: config.mode,
      sourcePath: config.sourcePath,
      previousValue: previousTargetValue,
      previousValuePreview: getValuePreview(previousTargetValue),
      literalValue: resolvedLiteralValue,
      literalValuePreview: getValuePreview(resolvedLiteralValue),
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
  const rawVariables = getRawContextVariables(context)
  const exactVariableMatch = config.outputPath.match(/^#([a-zA-Z][a-zA-Z0-9_-]*)(?:\.(.+))?$/)

  let value: unknown

  if (exactVariableMatch) {
    const variableName = exactVariableMatch[1]
    const rawSuffix = exactVariableMatch[2]
    const variableValue = rawVariables[variableName]

    if (rawSuffix) {
      const normalizedSuffix = rawSuffix.replace(/\[\*\]/g, '*')
      value = getByPath(variableValue, normalizedSuffix)
    } else if (typeof variableValue === 'string') {
      // Legacy behavior: a string variable can represent a data path.
      const valueFromPath = getByPath(context.data, variableValue)
      value = valueFromPath === undefined ? variableValue : valueFromPath
    } else {
      value = variableValue
    }
  } else {
    const resolvedOutputPath = resolvePathValue(config.outputPath, context)
    value = getByPath(context.data, resolvedOutputPath)
  }

  context.data.__output = value

  return {
    message: t('engine.output.resolved', { path: `${config.outputPath}` }),
    details: {
      outputPath: config.outputPath,
      value,
    },
  }
}

const setVariableExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'setVariable') {
    return {}
  }

  const config = node.data.config as SetVariableNodeConfig

  // Ensure __variables exists and is an object
  if (!context.data.__variables) {
    context.data.__variables = {}
  }
  
  const variablesObj = context.data.__variables as Record<string, unknown>
  if (typeof variablesObj !== 'object' || variablesObj === null) {
    throw new Error('__variables must be an object')
  }

  // Process all extractions
  const extractedValues: Record<string, { value: unknown; preview: string; type: string }> = {}
  
  for (const extraction of config.extractions) {
    const resolvedExtractPath = resolvePathValue(extraction.extractPath, context)
    const resolvedVariableName = resolveConfigValue(extraction.variableName, context)

    if (!Object.prototype.hasOwnProperty.call(variablesObj, resolvedVariableName)) {
      throw new Error(
        t('engine.setVariable.unknownVariable', {
          name: resolvedVariableName,
        }),
      )
    }

    // Extract value from context data using the path
    const extractedValue = getByPath(context.data, resolvedExtractPath)

    // Store the value in variables
    variablesObj[resolvedVariableName] = extractedValue
    
    extractedValues[resolvedVariableName] = {
      value: extractedValue,
      preview: getValuePreview(extractedValue),
      type: getValueType(extractedValue),
    }
  }

  return {
    message: t('engine.setVariable.completed', {
      count: config.extractions.length,
    }),
    details: {
      extractedCount: config.extractions.length,
      extractions: extractedValues,
    },
  }
}

export const executorByType: Record<NodeType, NodeExecutor> = {
  start: startExecutor,
  api: apiExecutor,
  setVariable: setVariableExecutor,
  condition: conditionExecutor,
  filter: filterExecutor,
  transform: transformExecutor,
  output: outputExecutor
}
