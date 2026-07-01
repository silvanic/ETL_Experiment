import { getByPath, setByPath } from '@/modules/pipeline/engine/pathUtils'
import { t } from '@/i18n'
import type { NodeExecutor } from '@/modules/pipeline/engine/executorTypes'
import { getContextVariableMap } from '@/modules/pipeline/engine/variableContext'
import type {
  ApiNodeConfig,
  ConditionAggregation,
  ConditionOperator,
  ConditionNodeConfig,
  ExecutionContext,
  FilterNodeConfig,
  IterateNodeConfig,
  MapNodeConfig,
  NodeType,
  OutputNodeConfig,
  SetVariableNodeConfig,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'

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

  const resolvedPath = value.replace(
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

  return resolvedPath.replace(/\[([^\]]+)\]/g, (fullMatch: string, rawToken: string) => {
    const token = rawToken.trim()
    if (!token || token === '*' || /^\d+$/.test(token)) {
      return fullMatch
    }

    const tokenPath = token.startsWith('#') ? token.slice(1) : token
    let resolved: unknown = getByPath(context.data, tokenPath)

    if (resolved === undefined) {
      resolved = rawVariables[tokenPath]
    }

    if (typeof resolved === 'number' && Number.isInteger(resolved) && resolved >= 0) {
      return `[${resolved}]`
    }

    if (typeof resolved === 'string' && /^\d+$/.test(resolved.trim())) {
      return `[${resolved.trim()}]`
    }

    return fullMatch
  })
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

function parseSetVariableLiteral(rawValue: string): unknown {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed === 'null') {
    return null
  }

  if (trimmed === 'true') {
    return true
  }

  if (trimmed === 'false') {
    return false
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const numericValue = Number(trimmed)
    if (Number.isFinite(numericValue)) {
      return numericValue
    }
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return rawValue
    }
  }

  return rawValue
}

function parseStructuredJsonLiteral(rawValue: string): unknown {
  const trimmed = rawValue.trim()
  const isStructuredJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))

  if (!isStructuredJson) {
    return rawValue
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return rawValue
  }
}

function coerceIterateItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

class ApiHttpError extends Error {
  status: number
  statusText: string

  constructor(status: number, statusText: string) {
    super(
      t('engine.api.error', {
        status,
        statusText,
      }),
    )
    this.name = 'ApiHttpError'
    this.status = status
    this.statusText = statusText
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableApiError(error: unknown): boolean {
  if (error instanceof ApiHttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500
  }

  return error instanceof TypeError
}

const startExecutor: NodeExecutor = async () => {
  return {}
}

const defaultApiMaxRetries = 3
const defaultApiRetryDelayMs = 1000

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

  const maxRetries = Math.max(0, Math.trunc(config.retryConfig?.maxRetries ?? defaultApiMaxRetries))
  const delayMs = Math.max(0, Math.trunc(config.retryConfig?.delayMs ?? defaultApiRetryDelayMs))
  let attempts = 0

  let response: Response | null = null
  let contentType: string | null = null
  let payload: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      attempts += 1
      response = await fetch(resolvedUrl, requestInit)
      contentType = response.headers.get('content-type')
      payload = contentType?.includes('application/json')
        ? await response.json()
        : await response.text()

      if (!response.ok) {
        throw new ApiHttpError(response.status, response.statusText)
      }

      break
    } catch (error) {
      const canRetry = attempt < maxRetries && isRetryableApiError(error)

      if (!canRetry) {
        throw error
      }

      await delay(delayMs)
    }
  }

  if (!response) {
    throw new Error(t('engine.run.executionFailed'))
  }

  // Format the request body for logging
  const formattedBody = requestInit.body && typeof requestInit.body === 'string'
    ? JSON.parse(requestInit.body)
    : requestInit.body

  // Store the result at the specified output path
  setByPath(context.data, resolvedOutputPath, payload)

  // Create an output object showing only what was just stored
  const dataOut: Record<string, unknown> = {}
  dataOut[config.outputPath] = payload

  return {
    message: t('engine.api.completed', {
      method: config.method,
      url: resolvedUrl,
      status: response.status,
    }),
    details: {
      url: resolvedUrl,
      method: config.method,
      status: response.status,
      statusText: response.statusText,
      contentType: contentType ?? 'unknown',
      outputPath: resolvedOutputPath,
      headers: headers,
      body: formattedBody,
      attempts,
      retriesUsed: Math.max(0, attempts - 1),
      configuredMaxRetries: maxRetries,
      payloadType: getValueType(payload),
      payloadPreview: getValuePreview(payload),
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

  const resolvedLiteralValue = resolveTransformTemplate(config.literalValue, context)

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

/**
 * Resolve un template Transform contre le contexte complet du pipeline.
 * - {path}: lit un chemin dans context.data
 * - {#variable}: lit une variable globale
 * - texte mixte: concatène en string
 */
function resolveTransformTemplate(template: string, context: ExecutionContext): unknown {
  const regex = /\{([^}]+)\}/g
  const matches = Array.from(template.matchAll(regex))

  const resolveTemplateToken = (token: string): unknown => {
    const trimmed = token.trim()

    if (trimmed.includes('#')) {
      return resolveConfigValue(trimmed, context)
    }

    return getByPath(context.data, trimmed)
  }

  if (matches.length === 0) {
    return resolveConfigValue(template, context)
  }

  // Template simple: retourne la valeur brute (nombre, boolean, objet, etc.)
  if (matches.length === 1 && matches[0][0] === template) {
    const value = resolveTemplateToken(matches[0][1])
    return value
  }

  // Template mixte: concatène en string et laisse les tokens introuvables inchangés.
  const result = template.replace(regex, (match, pathPattern) => {
    const value = resolveTemplateToken(pathPattern)

    if (value === undefined || value === null) {
      return match
    }

    return String(value)
  })

  return resolveConfigValue(result, context)
}

/**
 * Résout une template de mapping en interpolant les chemins {path.to.field}
 * Si la template ne contient que {chemin} (sans texte statique), retourne la valeur résolue telle quelle
 * Sinon, interpole et retourne une string
 * Si un chemin est introuvable et qu'un fallback est défini, utilise le fallback
 */
function resolveMappingTemplate(
  template: string,
  item: unknown,
  fallbackValue: string | undefined,
  context: ExecutionContext,
): unknown {
  const regex = /\{([^}]+)\}/g
  let hasUnresolvedPath = false
  const matches = Array.from(template.matchAll(regex))

  const resolveTemplateToken = (token: string): unknown => {
    // Les tokens avec # sont résolus comme variables globales du pipeline.
    if (token.includes('#')) {
      return resolveConfigValue(token, context)
    }

    return getByPath(item, token)
  }

  const resolveLiteralOrJson = (rawValue: string): unknown => {
    const resolvedRaw = resolveConfigValue(rawValue, context)
    return parseStructuredJsonLiteral(resolvedRaw)
  }

  if (matches.length === 0) {
    return resolveLiteralOrJson(template)
  }

  // Si la template est juste {chemin} (sans texte statique autour)
  if (matches.length === 1 && matches[0][0] === template) {
    const pathPattern = matches[0][1].trim()
    const value = resolveTemplateToken(pathPattern)

    if (value === undefined || value === null) {
      return fallbackValue !== undefined ? resolveLiteralOrJson(fallbackValue) : undefined
    }

    return value
  }

  // Sinon, c'est une concaténation: interpoler et retourner une string
  const result = template.replace(regex, (match, pathPattern) => {
    const value = resolveTemplateToken(pathPattern.trim())

    if (value === undefined || value === null) {
      hasUnresolvedPath = true
      return match
    }

    return String(value)
  })

  // Si un chemin n'a pas pu être résolu et qu'on a un fallback, l'utiliser
  if (hasUnresolvedPath && fallbackValue !== undefined) {
    return resolveLiteralOrJson(fallbackValue)
  }

  return resolveConfigValue(result, context)
}

const mapExecutor: NodeExecutor = async (node, context) => {
  if (node.data?.type !== 'map') {
    return {}
  }

  const config = node.data.config as MapNodeConfig
  const resolvedSourcePath = resolvePathValue(config.sourcePath, context)
  const resolvedOutputPath = resolvePathValue(config.outputPath, context)
  const sourceValue = getByPath(context.data, resolvedSourcePath)
  const sourceItems = Array.isArray(sourceValue) ? sourceValue : []

  const mappedItems = sourceItems.map((item) => {
    const mappedItem: Record<string, unknown> = {}

    for (const mapping of config.mappings) {
      const value = resolveMappingTemplate(
        mapping.literalValue ?? '',
        item,
        mapping.fallbackValue,
        context,
      )

      setByPath(mappedItem, mapping.targetField, value)
    }

    return mappedItem
  })

  setByPath(context.data, resolvedOutputPath, mappedItems)

  const dataOut: Record<string, unknown> = {}
  setByPath(dataOut, resolvedOutputPath, mappedItems)

  return {
    message: t('engine.map.result', {
      sourcePath: resolvedSourcePath,
      outputPath: resolvedOutputPath,
      count: mappedItems.length,
    }),
    dataOut,
    details: {
      sourcePath: resolvedSourcePath,
      outputPath: resolvedOutputPath,
      mappingsCount: config.mappings.length,
      inputCount: sourceItems.length,
      outputCount: mappedItems.length,
    },
  }
}

const iterateExecutor: NodeExecutor = async (node, context, graph) => {
  if (node.data?.type !== 'iterate') {
    return {}
  }

  const config = node.data.config as IterateNodeConfig
  const rawVariables = getRawContextVariables(context)
  const exactVariableMatch = config.sourcePath.match(/^#([a-zA-Z][a-zA-Z0-9_-]*)(?:\.(.+))?$/)

  let resolvedSourcePath: string
  let sourceValue: unknown

  if (exactVariableMatch) {
    const variableName = exactVariableMatch[1]
    const rawSuffix = exactVariableMatch[2]
    const variableValue = rawVariables[variableName]

    resolvedSourcePath = config.sourcePath

    if (rawSuffix) {
      const normalizedSuffix = rawSuffix.replace(/\[\*\]/g, '*')
      sourceValue = getByPath(variableValue, normalizedSuffix)
    } else if (typeof variableValue === 'string') {
      // Legacy behavior: a string variable can represent a data path.
      const valueFromPath = getByPath(context.data, variableValue)
      sourceValue = valueFromPath === undefined ? variableValue : valueFromPath
    } else {
      sourceValue = variableValue
    }
  } else {
    resolvedSourcePath = resolvePathValue(config.sourcePath, context)
    sourceValue = getByPath(context.data, resolvedSourcePath)
  }

  const items = coerceIterateItems(sourceValue)
  const childrenNodeIds = (graph?.nodes ?? [])
    .filter((candidate) => candidate.parentNode === node.id)
    .map((candidate) => candidate.id)

  return {
    message: t('engine.iterate.result', {
      sourcePath: resolvedSourcePath,
      count: items.length,
    }),
    details: {
      sourcePath: resolvedSourcePath,
      count: items.length,
      hasChildren: childrenNodeIds.length > 0,
    },
    childrenNodeIds,
    scopedData: {
      iterateItems: items,
    },
  }
}

const subflowExecutor: NodeExecutor = async (node, _context, graph) => {
  if (node.data?.type !== 'subflow') {
    return {}
  }

  const childrenNodeIds = (graph?.nodes ?? [])
    .filter((candidate) => candidate.parentNode === node.id)
    .map((candidate) => candidate.id)

  return {
    message: t('engine.subflow.result', {
      count: childrenNodeIds.length,
    }),
    details: {
      hasChildren: childrenNodeIds.length > 0,
      count: childrenNodeIds.length,
    },
    childrenNodeIds,
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
    const sourceType = extraction.sourceType ?? 'path'
    const resolvedVariableName = resolveConfigValue(extraction.variableName, context)

    if (!Object.prototype.hasOwnProperty.call(variablesObj, resolvedVariableName)) {
      throw new Error(
        t('engine.setVariable.unknownVariable', {
          name: resolvedVariableName,
        }),
      )
    }

    let extractedValue: unknown
    if (sourceType === 'literal') {
      const resolvedLiteralValue = resolveConfigValue(extraction.literalValue ?? '', context)
      extractedValue = parseSetVariableLiteral(resolvedLiteralValue)
    } else {
      const resolvedExtractPath = resolvePathValue(extraction.extractPath, context)
      extractedValue = getByPath(context.data, resolvedExtractPath)
    }

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
  map: mapExecutor,
  iterate: iterateExecutor,
  subflow: subflowExecutor,
  output: outputExecutor
}
