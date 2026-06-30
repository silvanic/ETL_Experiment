<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import Panel from 'primevue/panel'
import AutoComplete from 'primevue/autocomplete'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { resolveValueWithVariables, findUnresolvedVariables } from '@/modules/pipeline/domain/variables'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  FilterNodeConfig,
  IterateNodeConfig,
  MapNodeConfig,
  OutputNodeConfig,
  SetVariableNodeConfig,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'
import { useI18n } from 'vue-i18n'
import { TabList, TabPanels, Tabs, Tab } from 'primevue'

const store = usePipelineEditorStore()
const { t } = useI18n()
const defaultApiMaxRetries = 3
const defaultApiRetryDelayMs = 1000

const selected = computed(() => store.selectedNode)
const selectedData = computed(() => selected.value?.data)
const selectedType = computed(() => selectedData.value?.type)
const canEditNodeName = computed(() => selectedType.value !== 'start')
const selectedLabel = computed(() => {
  if (!selectedData.value) {
    return ''
  }

  const name = selectedData.value.name?.trim() || selectedData.value.label

  if (selectedData.value.type === 'start' || selectedData.value.label === name) {
    return selectedData.value.label
  }

  return `${name} (${selectedData.value.label})`
})

const apiConfig = computed(() => {
  if (selectedType.value !== 'api') {
    return null
  }

  return selectedData.value?.config as ApiNodeConfig
})

const setVariableConfig = computed(() => {
  if (selectedType.value !== 'setVariable') {
    return null
  }

  return selectedData.value?.config as SetVariableNodeConfig
})

const conditionConfig = computed(() =>
  selectedType.value === 'condition' ? (selectedData.value?.config as ConditionNodeConfig) : null,
)

const filterConfig = computed(() =>
  selectedType.value === 'filter' ? (selectedData.value?.config as FilterNodeConfig) : null,
)

const transformConfig = computed(() =>
  selectedType.value === 'transform' ? (selectedData.value?.config as TransformNodeConfig) : null,
)

const mapConfig = computed(() =>
  selectedType.value === 'map' ? (selectedData.value?.config as MapNodeConfig) : null,
)

const iterateConfig = computed(() =>
  selectedType.value === 'iterate' ? (selectedData.value?.config as IterateNodeConfig) : null,
)

const outputConfig = computed(() =>
  selectedType.value === 'output' ? (selectedData.value?.config as OutputNodeConfig) : null,
)

const apiMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const conditionOperatorOptions = computed<{ label: string; value: ConditionNodeConfig['operator'] }[]>(() => [
  { label: t('inspector.options.conditionOperator.equals'), value: 'equals' },
  { label: t('inspector.options.conditionOperator.notEquals'), value: 'notEquals' },
  { label: t('inspector.options.conditionOperator.greaterThan'), value: 'greaterThan' },
  { label: t('inspector.options.conditionOperator.lessThan'), value: 'lessThan' },
  { label: t('inspector.options.conditionOperator.contains'), value: 'contains' },
  { label: t('inspector.options.conditionOperator.exists'), value: 'exists' },
])
const conditionAggregationOptions = computed<{ label: string; value: ConditionNodeConfig['aggregation'] }[]>(() => [
  { label: t('inspector.options.conditionAggregation.any'), value: 'any' },
  { label: t('inspector.options.conditionAggregation.all'), value: 'all' },
  { label: t('inspector.options.conditionAggregation.none'), value: 'none' },
])
const conditionRightTypeOptions = computed<{ label: string; value: ConditionNodeConfig['rightType'] }[]>(() => [
  { label: t('inspector.options.rightType.string'), value: 'string' },
  { label: t('inspector.options.rightType.number'), value: 'number' },
  { label: t('inspector.options.rightType.boolean'), value: 'boolean' },
  { label: t('inspector.options.rightType.null'), value: 'null' },
])
const transformModeOptions = computed<{ label: string; value: TransformNodeConfig['mode'] }[]>(() => [
  { label: t('inspector.options.transformMode.pickPath'), value: 'pickPath' },
  { label: t('inspector.options.transformMode.assignLiteral'), value: 'assignLiteral' },
])
const setVariableSourceTypeOptions = computed<{ label: string; value: 'path' | 'literal' }[]>(() => [
  { label: t('inspector.options.setVariableSourceType.path'), value: 'path' },
  { label: t('inspector.options.setVariableSourceType.literal'), value: 'literal' },
])

const isApiLoading = ref(false)
const isApiResultDialogVisible = ref(false)
const lastApiResult = ref<unknown | null>(null)
const lastApiError = ref<string | null>(null)
const lastApiRequest = ref<{
  method: string
  url: string
  headers: Record<string, string>
  body: string
} | null>(null)
const lastApiResponseMeta = ref<{
  status: number
  statusText: string
  durationMs: number
  sizeBytes: number
  headers: Record<string, string>
} | null>(null)
const variableSuggestions = ref<string[]>([])
const cursorByField = ref<Record<string, { start: number; end: number; value: string }>>({})

const variableMap = computed<Record<string, string>>(() => {
  return store.effectiveVariableMap
})

const parameterVariableNames = computed(() => store.pipeline.variables.map((variable) => variable.name))

const templatePathSuggestions = computed(() => {
  const paths = new Set<string>()
  store.pipeline.nodes
    .filter((n) => (n.data.type === 'api' || n.data.type === 'transform' || n.data.type === 'map') && n.id !== selected.value?.id)
    .forEach((n) => {
      const config = n.data.config
      let path = ''
      if (n.data.type === 'api') path = (config as ApiNodeConfig).outputPath
      else if (n.data.type === 'transform') path = (config as TransformNodeConfig).targetPath
      else if (n.data.type === 'map') path = (config as MapNodeConfig).outputPath

      if (path) {
        paths.add(`{${path}}`)
        const parts = path.split('.')
        for (let i = 1; i < parts.length; i++) {
          paths.add(`{${parts.slice(0, i).join('.')}}`)
        }
      }
    })
  return Array.from(paths)
})

const templateVariableSuggestions = computed(() => {
  // For template fields: only suggest {#variable} (with braces) as #variable alone won't be interpolated
  const suggestions = new Set<string>()
  store.pipeline.variables.forEach((variable) => {
    suggestions.add(`{#${variable.name}}`)
  })
  return Array.from(suggestions)
})

const globalVariableSuggestions = computed(() => {
  // For non-template fields: suggest #variable (without braces)
  return store.pipeline.variables.map((variable) => `#${variable.name}`)
})

function getTemplateFieldSuggestions(fieldKey: string): string[] {
  const isTemplateField = [
    'transform.literalValue',
    'map.sourcePath',
    'map.outputPath',
  ].includes(fieldKey)

  if (isTemplateField) {
    // For template fields: only suggest {path} and {#variable} that will be interpreted
    return Array.from(new Set([
      ...templatePathSuggestions.value,
      ...templateVariableSuggestions.value,
    ]))
  }

  // For non-template fields: suggest #variable and output paths as before
  return Array.from(new Set([...globalVariableSuggestions.value, ...outputPathSuggestions.value]))
}

const outputPathSuggestions = computed(() =>
  store.pipeline.nodes
    .filter((n) => (n.data.type === 'api' || n.data.type === 'transform') && n.id !== selected.value?.id)
    .map((n) => {
      const config = n.data.config as ApiNodeConfig | TransformNodeConfig
      if (n.data.type === 'api') return (config as ApiNodeConfig).outputPath
      if (n.data.type === 'transform') return (config as TransformNodeConfig).targetPath
      return ''
    })
    .filter(Boolean),
)

const unresolvedApiVariables = computed(() => {
  if (!apiConfig.value) {
    return []
  }

  const unresolvedInUrl = findUnresolvedVariables(apiConfig.value.url, variableMap.value)
  const unresolvedInHeaders = apiConfig.value.headers.flatMap(header => [
    ...findUnresolvedVariables(header.key, variableMap.value),
    ...findUnresolvedVariables(header.value, variableMap.value),
  ])
  const unresolvedInBody = findUnresolvedVariables(apiConfig.value.bodyRaw, variableMap.value)
  const unresolvedInPath = findUnresolvedVariables(apiConfig.value.outputPath, variableMap.value)

  return Array.from(new Set([...unresolvedInUrl, ...unresolvedInHeaders, ...unresolvedInBody, ...unresolvedInPath]))
})

const unresolvedSetVariableVariables = computed(() => {
  if (!setVariableConfig.value) {
    return []
  }

  const unresolvedInExtractions = setVariableConfig.value.extractions.flatMap(extraction => {
    const sourceType = extraction.sourceType ?? 'path'
    const sourceValue = sourceType === 'literal'
      ? (extraction.literalValue ?? '')
      : extraction.extractPath

    return [
      ...findUnresolvedVariables(sourceValue, variableMap.value),
      ...findUnresolvedVariables(extraction.variableName, variableMap.value),
    ]
  })

  return Array.from(new Set([...unresolvedInExtractions]))
})

const invalidSetVariableNames = computed(() => {
  if (!setVariableConfig.value) {
    return []
  }

  const allowedVariableNames = new Set(parameterVariableNames.value)

  return Array.from(
    new Set(
      setVariableConfig.value.extractions
        .map((extraction) => extraction.variableName.trim())
        .filter((name) => name.length > 0 && !allowedVariableNames.has(name)),
    ),
  )
})

const unresolvedConditionVariables = computed(() => {
  if (!conditionConfig.value) {
    return []
  }

  const unresolvedInLeft = findUnresolvedVariables(conditionConfig.value.leftPath, variableMap.value)
  const unresolvedInRight = findUnresolvedVariables(conditionConfig.value.rightValue, variableMap.value)

  return Array.from(new Set([...unresolvedInLeft, ...unresolvedInRight]))
})

const unresolvedFilterVariables = computed(() => {
  if (!filterConfig.value) {
    return []
  }

  const unresolvedInSource = findUnresolvedVariables(filterConfig.value.sourcePath, variableMap.value)
  const unresolvedInItem = findUnresolvedVariables(filterConfig.value.itemPath, variableMap.value)
  const unresolvedInRight = findUnresolvedVariables(filterConfig.value.rightValue, variableMap.value)
  const unresolvedInOutput = findUnresolvedVariables(filterConfig.value.outputPath, variableMap.value)
  const unresolvedInRejectedOutput = findUnresolvedVariables(filterConfig.value.outputPathRejected, variableMap.value)

  return Array.from(
    new Set([
      ...unresolvedInSource,
      ...unresolvedInItem,
      ...unresolvedInRight,
      ...unresolvedInOutput,
      ...unresolvedInRejectedOutput,
    ]),
  )
})

const unresolvedTransformVariables = computed(() => {
  if (!transformConfig.value) {
    return []
  }

  const unresolvedInSource = transformConfig.value.mode === 'pickPath'
    ? findUnresolvedVariables(transformConfig.value.sourcePath, variableMap.value)
    : []
  const unresolvedInTarget = findUnresolvedVariables(transformConfig.value.targetPath, variableMap.value)
  const unresolvedInLiteral = transformConfig.value.mode === 'assignLiteral'
    ? findUnresolvedVariables(transformConfig.value.literalValue, variableMap.value)
    : []

  return Array.from(new Set([...unresolvedInSource, ...unresolvedInTarget, ...unresolvedInLiteral]))
})

const unresolvedMapVariables = computed(() => {
  if (!mapConfig.value) {
    return []
  }

  const unresolvedInSource = findUnresolvedVariables(mapConfig.value.sourcePath, variableMap.value)
  const unresolvedInOutput = findUnresolvedVariables(mapConfig.value.outputPath, variableMap.value)
  const unresolvedInMappings = mapConfig.value.mappings.flatMap((mapping) => [
    ...findUnresolvedVariables(mapping.targetField, variableMap.value),
    ...findUnresolvedVariables(mapping.literalValue, variableMap.value),
    ...findUnresolvedVariables(mapping.fallbackValue ?? '', variableMap.value),
  ])

  return Array.from(new Set([...unresolvedInSource, ...unresolvedInOutput, ...unresolvedInMappings]))
})

const unresolvedIterateVariables = computed(() => {
  if (!iterateConfig.value) {
    return []
  }

  return findUnresolvedVariables(iterateConfig.value.sourcePath, variableMap.value)
})

const unresolvedOutputVariables = computed(() => {
  if (!outputConfig.value) {
    return []
  }

  return findUnresolvedVariables(outputConfig.value.outputPath, variableMap.value)
})

const outputPathValidation = computed(() => {
  if (!outputConfig.value) {
    return null
  }

  const path = outputConfig.value.outputPath?.trim() ?? ''
  
  if (!path) {
    return {
      severity: 'error' as const,
      text: t('inspector.errors.outputPathEmpty'),
    }
  }

  return null
})

const apiHeadersValidation = computed(() => {
  if (!apiConfig.value) {
    return null
  }

  // Vérifier les clés vides
  const hasEmptyKeys = apiConfig.value.headers.some(header => !header.key.trim())
  if (hasEmptyKeys) {
    return {
      severity: 'warn' as const,
      text: t('inspector.messages.headersEmptyKey'),
    }
  }

  return null
})

const apiBodyValidation = computed(() => {
  if (!apiConfig.value) {
    return null
  }

  const rawBody = apiConfig.value.bodyRaw ?? ''
  if (!rawBody.trim()) {
    return {
      severity: 'info' as const,
      text: t('inspector.messages.bodyJsonEmpty'),
    }
  }

  const unresolvedInBody = findUnresolvedVariables(rawBody, variableMap.value)
  if (unresolvedInBody.length > 0) {
    return {
      severity: 'warn' as const,
      text: t('inspector.messages.bodyJsonPendingVariables', {
        variables: unresolvedInBody.join(', '),
      }),
    }
  }

  try {
    JSON.parse(resolveWithPipelineVariables(rawBody))
    return {
      severity: 'success' as const,
      text: t('inspector.messages.bodyJsonValid'),
    }
  } catch {
    return {
      severity: 'error' as const,
      text: t('inspector.messages.bodyJsonInvalid'),
    }
  }
})

const hasApiResponse = computed(() => {
  if (lastApiError.value) {
    return true
  }

  return lastApiResult.value !== null
})

const prettyApiRequest = computed(() => {
  if (!lastApiRequest.value) {
    return t('inspector.messages.noApiResult')
  }

  const { method, url, headers, body } = lastApiRequest.value
  const lines: string[] = [
    `${method} ${url}`,
    ...(Object.keys(headers).length > 0 ? [Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')] : []),
  ]

  if (body.trim()) {
    lines.push('', body)
  }

  return lines.join('\n')
})

const prettyApiResponse = computed(() => {
  if (lastApiError.value) {
    return `${t('inspector.prefix.error')}: ${lastApiError.value}`
  }

  if (lastApiResult.value === null) {
    return t('inspector.messages.noApiResult')
  }

  try {
    return JSON.stringify(lastApiResult.value, null, 2)
  } catch {
    return String(lastApiResult.value)
  }
})

const prettyApiResponseMeta = computed(() => {
  if (!lastApiResponseMeta.value) {
    return t('inspector.messages.noApiResult')
  }

  const { status, statusText, durationMs, sizeBytes, headers } = lastApiResponseMeta.value
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`)

  return [
    `HTTP ${status} ${statusText}`,
    `Duration: ${durationMs} ms`,
    `Size: ${sizeBytes} bytes`,
    headerLines.length > 0 ? '' : null,
    headerLines.length > 0 ? 'Headers:' : null,
    ...headerLines,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
})


function patchConfig(partial: Record<string, unknown>): void {
  const node = selected.value
  if (!node) {
    return
  }

  store.updateSelectedNodeConfig({
    ...(node.data?.config ?? {}),
    ...partial,
  })
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return fallback
  }

  return Math.max(0, parsed)
}

function patchApiRetryConfig(partial: Partial<NonNullable<ApiNodeConfig['retryConfig']>>): void {
  if (!apiConfig.value) {
    return
  }

  patchConfig({
    retryConfig: {
      maxRetries: apiConfig.value.retryConfig?.maxRetries ?? defaultApiMaxRetries,
      delayMs: apiConfig.value.retryConfig?.delayMs ?? defaultApiRetryDelayMs,
      ...partial,
    },
  })
}

function patchNodeName(value: string | number | undefined): void {
  const node = selected.value
  if (!node || node.data.type === 'start') {
    return
  }

  store.updateNodeName(node.id, String(value ?? ''))
}

// Méthode optimisée pour fournir des suggestions contextuelles selon le champ
function completeVariables(event: { query: string }, fieldKey?: string): void {
  const rawQuery = String(event.query ?? '')
  const query = rawQuery.toLowerCase()

  const candidates = fieldKey
    ? getTemplateFieldSuggestions(fieldKey)
    : Array.from(new Set([...globalVariableSuggestions.value, ...outputPathSuggestions.value]))
  variableSuggestions.value = query
    ? candidates.filter((candidate) => candidate.toLowerCase().includes(query))
    : candidates
}

function openSuggestionMenu(fieldKey?: string): void {
  variableSuggestions.value = fieldKey
    ? getTemplateFieldSuggestions(fieldKey)
    : Array.from(new Set([...globalVariableSuggestions.value, ...outputPathSuggestions.value]))
}

const fieldConfigKeyByFieldKey: Record<string, string> = {
  'api.url': 'url',
  'api.outputPath': 'outputPath',
  'api.headersRaw': 'headersRaw',
  'api.bodyRaw': 'bodyRaw',
  'condition.leftPath': 'leftPath',
  'condition.rightValue': 'rightValue',
  'filter.sourcePath': 'sourcePath',
  'filter.itemPath': 'itemPath',
  'filter.rightValue': 'rightValue',
  'filter.outputPath': 'outputPath',
  'filter.outputPathRejected': 'outputPathRejected',
  'transform.sourcePath': 'sourcePath',
  'transform.targetPath': 'targetPath',
  'transform.literalValue': 'literalValue',
  'map.sourcePath': 'sourcePath',
  'map.outputPath': 'outputPath',
  'iterate.sourcePath': 'sourcePath',
  'output.outputPath': 'outputPath',
}

const fieldValueReaderByFieldKey: Record<string, () => string> = {
  'api.url': () => apiConfig.value?.url ?? '',
  'api.outputPath': () => apiConfig.value?.outputPath ?? '',
  'api.bodyRaw': () => apiConfig.value?.bodyRaw ?? '',
  'condition.leftPath': () => conditionConfig.value?.leftPath ?? '',
  'condition.rightValue': () => conditionConfig.value?.rightValue ?? '',
  'filter.sourcePath': () => filterConfig.value?.sourcePath ?? '',
  'filter.itemPath': () => filterConfig.value?.itemPath ?? '',
  'filter.rightValue': () => filterConfig.value?.rightValue ?? '',
  'filter.outputPath': () => filterConfig.value?.outputPath ?? '',
  'filter.outputPathRejected': () => filterConfig.value?.outputPathRejected ?? '',
  'transform.sourcePath': () => transformConfig.value?.sourcePath ?? '',
  'transform.targetPath': () => transformConfig.value?.targetPath ?? '',
  'transform.literalValue': () => transformConfig.value?.literalValue ?? '',
  'map.sourcePath': () => mapConfig.value?.sourcePath ?? '',
  'map.outputPath': () => mapConfig.value?.outputPath ?? '',
  'iterate.sourcePath': () => iterateConfig.value?.sourcePath ?? '',
  'output.outputPath': () => outputConfig.value?.outputPath ?? '',
}

function patchFieldValue(fieldKey: string, value: string): void {
  const configKey = fieldConfigKeyByFieldKey[fieldKey]
  if (!configKey) {
    return
  }

  patchConfig({ [configKey]: value })
}

function readFieldValue(fieldKey: string): string {
  const reader = fieldValueReaderByFieldKey[fieldKey]
  return reader ? reader() : ''
}

function captureCursorPosition(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return
  }

  const fieldKey = target.id
  if (!fieldKey) {
    return
  }

  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? start
  cursorByField.value[fieldKey] = {
    start,
    end,
    value: target.value,
  }
}

function insertVariableTokenAtField(fieldKey: string, token: string): void {
  const currentValue = readFieldValue(fieldKey)
  const cursor = cursorByField.value[fieldKey] ?? {
    start: currentValue.length,
    end: currentValue.length,
    value: currentValue,
  }
  const nextValue =
    cursor.value.slice(0, cursor.start) + token + cursor.value.slice(cursor.end)

  patchFieldValue(fieldKey, nextValue)

  const nextCursorPosition = cursor.start + token.length
  cursorByField.value[fieldKey] = {
    start: nextCursorPosition,
    end: nextCursorPosition,
    value: nextValue,
  }

  nextTick(() => {
    const element = document.getElementById(fieldKey)
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return
    }

    element.focus()
    element.setSelectionRange(nextCursorPosition, nextCursorPosition)
  })
}

function handleSuggestionSelect(fieldKey: string, event: { value?: unknown }): void {
  const selectedValue = String(event.value ?? '')
  const isVariable = selectedValue.startsWith('#')
  const isTemplatePath = selectedValue.startsWith('{')

  if (!isVariable && !isTemplatePath) {
    return
  }

  setTimeout(() => {
    insertVariableTokenAtField(fieldKey, selectedValue)
  }, 0)
}

function isVariableTokenInput(value: string | undefined): boolean {
  return String(value ?? '').trim().startsWith('#')
}

function extractVariableNameFromToken(value: string): string {
  const match = value.trim().match(/^#([a-zA-Z][a-zA-Z0-9_-]*)/)
  return match?.[1] ?? ''
}

function variableTokenHint(value: string | undefined): string {
  const rawValue = String(value ?? '').trim()
  if (!rawValue.startsWith('#')) {
    return ''
  }

  const variableName = extractVariableNameFromToken(rawValue)
  if (!variableName) {
    return t('inspector.messages.variableTokenInvalid')
  }

  const resolvedValue = variableMap.value[variableName]
  if (resolvedValue === undefined) {
    return t('inspector.messages.variableTokenUnknown', { name: variableName })
  }

  return t('inspector.messages.variableTokenValue', {
    name: variableName,
    value: resolvedValue,
  })
}

function resolveWithPipelineVariables(value: string): string {
  return resolveValueWithVariables(value, variableMap.value)
}

async function runApiCall(): Promise<void> {
  const config = apiConfig.value
  const resolvedUrl = config ? resolveWithPipelineVariables(config.url) : ''

  if (!config || !resolvedUrl.trim()) {
    lastApiError.value = t('inspector.errors.missingApiUrl')
    return
  }

  const resolvedHeaders = config.headers.map(header => ({
    key: resolveWithPipelineVariables(header.key),
    value: resolveWithPipelineVariables(header.value),
  }))
  const resolvedBodyRaw = resolveWithPipelineVariables(config.bodyRaw)

  lastApiError.value = null
  lastApiResult.value = null
  lastApiResponseMeta.value = null
  isApiLoading.value = true

  try {
    const headers: Record<string, string> = {}
    resolvedHeaders.forEach(header => {
      if (header.key.trim()) {
        headers[header.key] = header.value
      }
    })

    const init: RequestInit = {
      method: config.method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    }

    if (config.method !== 'GET' && resolvedBodyRaw?.trim()) {
      init.body = resolvedBodyRaw
    }

    // Sauvegarder les détails de la requête
    lastApiRequest.value = {
      method: config.method,
      url: resolvedUrl,
      headers,
      body: resolvedBodyRaw,
    }

    const startTime = performance.now()
    const response = await fetch(resolvedUrl, init)
    const durationMs = Math.round(performance.now() - startTime)
    const contentType = response.headers.get('content-type') ?? ''
    const responseHeaders = Object.fromEntries(response.headers.entries())

    let data: unknown
    let sizeBytes = 0
    if (contentType.includes('application/json')) {
      data = await response.json()
      try {
        sizeBytes = new TextEncoder().encode(JSON.stringify(data)).length
      } catch {
        sizeBytes = 0
      }
    } else {
      const textBody = await response.text()
      data = textBody
      sizeBytes = new TextEncoder().encode(textBody).length
    }

    lastApiResponseMeta.value = {
      status: response.status,
      statusText: response.statusText,
      durationMs,
      sizeBytes,
      headers: responseHeaders,
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    lastApiResult.value = data
    isApiResultDialogVisible.value = true
  } catch (error) {
    lastApiError.value = error instanceof Error ? error.message : t('inspector.errors.unknown')
    isApiResultDialogVisible.value = true
  } finally {
    isApiLoading.value = false
  }
}

function openApiResultDialog(): void {
  isApiResultDialogVisible.value = true
}

</script>

<template>
  <Panel class="panel">
    <template #header>
      <div class="panel-header">
        <h2>{{ t('inspector.title') }}</h2>
        <Button
          v-if="store.selectedNode"
          icon="pi pi-times"
          severity="secondary"
          text
          rounded
          size="small"
          :aria-label="t('common.close')"
          @click="store.setSelectedNode(null)"
        />
      </div>
    </template>

    <header>
      <h3 v-if="selectedData">{{ selectedLabel }}</h3>
      <p v-else>{{ t('inspector.emptySelection') }}</p>
    </header>

    <div v-if="selected" class="form-grid">
      <label v-if="canEditNodeName">
        {{ t('inspector.fields.nodeName') }}
        <InputText
          :model-value="selectedData?.name ?? ''"
          :placeholder="t('inspector.fields.nodeNamePlaceholder')"
          @update:model-value="patchNodeName($event)"
        />
      </label>

      <template v-if="selectedType === 'api' && apiConfig">
        <Message
          v-if="unresolvedApiVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedApiVariables.join(', ') }}
        </Message>
        <Tabs value="params">
          <TabList>
            <Tab value="params">{{ t('inspector.tabs.parameters') }}</Tab>
            <Tab value="actions">{{ t('inspector.tabs.actions') }}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="params">
              <div class="tab-content">
                <label>
                  URL
                  <AutoComplete
                    input-id="api.url"
                    :model-value="apiConfig.url"
                    :suggestions="variableSuggestions"
                    dropdown
                    @focus="captureCursorPosition"
                    @click="captureCursorPosition"
                    @keyup="captureCursorPosition"
                    @focusin="openSuggestionMenu"
                    @complete="completeVariables"
                    @item-select="handleSuggestionSelect('api.url', $event)"
                    @update:model-value="patchConfig({ url: String($event) })"
                  />
                  <p v-if="isVariableTokenInput(apiConfig.url)" class="hint">
                    {{ variableTokenHint(apiConfig.url) }}
                  </p>
                </label>
                <label>
                  {{ t('inspector.fields.method') }}
                  <Select
                    :options="apiMethodOptions"
                    :model-value="apiConfig.method"
                    @update:model-value="patchConfig({ method: String($event) })"
                  />
                </label>
                <label>
                  {{ t('inspector.fields.retryMaxRetries') }}
                  <InputText
                    type="number"
                    min="0"
                    step="1"
                    :model-value="String(apiConfig.retryConfig?.maxRetries ?? defaultApiMaxRetries)"
                    @update:model-value="patchApiRetryConfig({ maxRetries: toNonNegativeInteger($event) })"
                  />
                </label>
                <label>
                  {{ t('inspector.fields.retryDelayMs') }}
                  <InputText
                    type="number"
                    min="0"
                    step="50"
                    :model-value="String(apiConfig.retryConfig?.delayMs ?? defaultApiRetryDelayMs)"
                    @update:model-value="patchApiRetryConfig({ delayMs: toNonNegativeInteger($event) })"
                  />
                </label>
                <label>
                  {{ t('inspector.fields.outputPath') }}
                  <AutoComplete
                    input-id="api.outputPath"
                    :model-value="apiConfig.outputPath"
                    :suggestions="variableSuggestions"
                    dropdown
                    @focus="captureCursorPosition"
                    @click="captureCursorPosition"
                    @keyup="captureCursorPosition"
                    @focusin="openSuggestionMenu"
                    @complete="completeVariables"
                    @item-select="handleSuggestionSelect('api.outputPath', $event)"
                    @update:model-value="patchConfig({ outputPath: String($event) })"
                  />
                  <p v-if="isVariableTokenInput(apiConfig.outputPath)" class="hint">
                    {{ variableTokenHint(apiConfig.outputPath) }}
                  </p>
                </label>
                <div class="headers-section">
                  <div class="headers-header">
                    <label>{{ t('inspector.fields.headersJson') }}</label>
                    <Button
                      size="small"
                      :label="t('inspector.buttons.addHeader')"
                      icon="pi pi-plus"
                      @click="patchConfig({ headers: [...(apiConfig.headers || []), { key: '', value: '' }] })"
                    />
                  </div>
                  <DataTable
                    :value="apiConfig.headers || []"
                    size="small"
                    responsive-layout="scroll"
                    :rows="10"
                  >
                    <Column header="Clé" style="width: 45%">
                      <template #body="slotProps">
                        <InputText
                          :model-value="slotProps.data.key"
                          @update:model-value="slotProps.data.key = $event; patchConfig({ headers: apiConfig.headers })"
                          placeholder="ex: Authorization"
                        />
                      </template>
                    </Column>
                    <Column header="Valeur" style="width: 45%">
                      <template #body="slotProps">
                        <InputText
                          :model-value="slotProps.data.value"
                          @update:model-value="slotProps.data.value = $event; patchConfig({ headers: apiConfig.headers })"
                          placeholder="ex: Bearer token"
                        />
                      </template>
                    </Column>
                    <Column style="width: 10%">
                      <template #body="slotProps">
                        <Button
                          size="small"
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          @click="patchConfig({ headers: apiConfig.headers.filter((_, i) => i !== slotProps.index) })"
                        />
                      </template>
                    </Column>
                  </DataTable>
                  <Message
                    v-if="apiHeadersValidation"
                    class="body-validation-message"
                    :severity="apiHeadersValidation.severity"
                    :closable="false"
                  >
                    {{ apiHeadersValidation.text }}
                  </Message>
                </div>
                <label>
                  {{ t('inspector.fields.bodyJson') }}
                  <Textarea
                    id="api_bodyRaw "
                    rows="5"
                    cols="30"
                    auto-resize
                    :model-value="apiConfig.bodyRaw"
                    @update:model-value="patchConfig({ bodyRaw: String($event) })"
                  />
                  <Message
                    v-if="apiBodyValidation"
                    class="body-validation-message"
                    :severity="apiBodyValidation.severity"
                    :closable="false"
                  >
                    {{ apiBodyValidation.text }}
                  </Message>
                </label>
              </div>
            </TabPanel>
            <TabPanel value="actions">
              <div class="tab-actions">
                <Button
                  :label="t('inspector.buttons.testApi')"
                  icon="pi pi-play"
                  :loading="isApiLoading"
                  @click="runApiCall"
                />
                <Button
                  :label="t('inspector.buttons.showResult')"
                  icon="pi pi-eye"
                  severity="secondary"
                  :disabled="!hasApiResponse"
                  @click="openApiResultDialog"
                />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>

      <template v-if="selectedType === 'setVariable' && setVariableConfig">
        <Message
          v-if="invalidSetVariableNames.length > 0"
          severity="error"
          :closable="false"
        >
          {{ t('inspector.errors.setVariableUnknownNames') }}: {{ invalidSetVariableNames.join(', ') }}
        </Message>
        <Message
          v-if="unresolvedSetVariableVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedSetVariableVariables.join(', ') }}
        </Message>
        <div class="extractions-section">
          <div class="extractions-header">
            <Button
              size="small"
              :label="t('inspector.buttons.addExtraction')"
              icon="pi pi-plus"
              @click="patchConfig({ extractions: [...(setVariableConfig.extractions || []), { sourceType: 'path', extractPath: '', literalValue: '', variableName: '' }] })"
            />
          </div>
          <DataTable
            :value="setVariableConfig.extractions || []"
            size="small"
            responsive-layout="scroll"
            :rows="10"
          >
            <Column :header="t('inspector.fields.sourceType')" style="width: 20%">
              <template #body="slotProps">
                <Select
                  :options="setVariableSourceTypeOptions"
                  option-label="label"
                  option-value="value"
                  :model-value="slotProps.data.sourceType ?? 'path'"
                  @update:model-value="slotProps.data.sourceType = String($event ?? 'path'); patchConfig({ extractions: setVariableConfig.extractions })"
                />
              </template>
            </Column>
            <Column :header="t('inspector.fields.valueExtractPath')" style="width: 35%">
              <template #body="slotProps">
                <InputText
                  :model-value="(slotProps.data.sourceType ?? 'path') === 'literal' ? (slotProps.data.literalValue ?? '') : slotProps.data.extractPath"
                  @update:model-value="(slotProps.data.sourceType ?? 'path') === 'literal' ? (slotProps.data.literalValue = String($event ?? '')) : (slotProps.data.extractPath = String($event ?? '')); patchConfig({ extractions: setVariableConfig.extractions })"
                  :placeholder="(slotProps.data.sourceType ?? 'path') === 'literal' ? t('inspector.placeholders.setVariableLiteralValue') : t('inspector.placeholders.setVariableExtractPath')"
                />
              </template>
            </Column>
            <Column :header="t('inspector.fields.variableName')" style="width: 35%">
              <template #body="slotProps">
                <Select
                  :options="parameterVariableNames"
                  :model-value="slotProps.data.variableName"
                  :placeholder="t('inspector.placeholders.setVariableVariableName')"
                  @update:model-value="slotProps.data.variableName = String($event ?? ''); patchConfig({ extractions: setVariableConfig.extractions })"
                />
              </template>
            </Column>
            <Column style="width: 10%">
              <template #body="slotProps">
                <Button
                  size="small"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  @click="patchConfig({ extractions: setVariableConfig.extractions.filter((_, i) => i !== slotProps.index) })"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <template v-if="selectedType === 'condition' && conditionConfig">
        <Message
          v-if="unresolvedConditionVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedConditionVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.leftPath') }}
          <AutoComplete
            input-id="condition.leftPath"
            :model-value="conditionConfig.leftPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('condition.leftPath', $event)"
            @update:model-value="patchConfig({ leftPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(conditionConfig.leftPath)" class="hint">
            {{ variableTokenHint(conditionConfig.leftPath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.operator') }}
          <Select
            :options="conditionOperatorOptions"
            option-label="label"
            option-value="value"
            :model-value="conditionConfig.operator"
            @update:model-value="patchConfig({ operator: String($event) })"
          />
        </label>
        <label>
          {{ t('inspector.fields.aggregation') }}
          <Select
            :options="conditionAggregationOptions"
            option-label="label"
            option-value="value"
            :model-value="conditionConfig.aggregation ?? 'any'"
            @update:model-value="patchConfig({ aggregation: String($event) })"
          />
        </label>
        <label>
          {{ t('inspector.fields.rightType') }}
          <Select
            :options="conditionRightTypeOptions"
            option-label="label"
            option-value="value"
            :model-value="conditionConfig.rightType"
            @update:model-value="patchConfig({ rightType: String($event) })"
          />
        </label>
        <label>
          {{ t('inspector.fields.rightValue') }}
          <AutoComplete
            input-id="condition.rightValue"
            :model-value="conditionConfig.rightValue"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('condition.rightValue', $event)"
            @update:model-value="patchConfig({ rightValue: String($event) })"
          />
          <p v-if="isVariableTokenInput(conditionConfig.rightValue)" class="hint">
            {{ variableTokenHint(conditionConfig.rightValue) }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'filter' && filterConfig">
        <Message
          v-if="unresolvedFilterVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedFilterVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.sourcePath') }}
          <AutoComplete
            input-id="filter.sourcePath"
            :model-value="filterConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('filter.sourcePath', $event)"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.sourcePath)" class="hint">
            {{ variableTokenHint(filterConfig.sourcePath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.itemPath') }}
          <AutoComplete
            input-id="filter.itemPath"
            :model-value="filterConfig.itemPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('filter.itemPath', $event)"
            @update:model-value="patchConfig({ itemPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.itemPath)" class="hint">
            {{ variableTokenHint(filterConfig.itemPath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.operator') }}
          <Select
            :options="conditionOperatorOptions"
            option-label="label"
            option-value="value"
            :model-value="filterConfig.operator"
            @update:model-value="patchConfig({ operator: String($event) })"
          />
        </label>
        <label>
          {{ t('inspector.fields.rightType') }}
          <Select
            :options="conditionRightTypeOptions"
            option-label="label"
            option-value="value"
            :model-value="filterConfig.rightType"
            @update:model-value="patchConfig({ rightType: String($event) })"
          />
        </label>
        <label>
          {{ t('inspector.fields.rightValue') }}
          <AutoComplete
            input-id="filter.rightValue"
            :model-value="filterConfig.rightValue"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('filter.rightValue', $event)"
            @update:model-value="patchConfig({ rightValue: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.rightValue)" class="hint">
            {{ variableTokenHint(filterConfig.rightValue) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.outputPath') }}
          <AutoComplete
            input-id="filter.outputPath"
            :model-value="filterConfig.outputPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('filter.outputPath', $event)"
            @update:model-value="patchConfig({ outputPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.outputPath)" class="hint">
            {{ variableTokenHint(filterConfig.outputPath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.outputPathRejected') }}
          <AutoComplete
            input-id="filter.outputPathRejected"
            :model-value="filterConfig.outputPathRejected"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('filter.outputPathRejected', $event)"
            @update:model-value="patchConfig({ outputPathRejected: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.outputPathRejected)" class="hint">
            {{ variableTokenHint(filterConfig.outputPathRejected) }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'transform' && transformConfig">
        <Message
          v-if="unresolvedTransformVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedTransformVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.mode') }}
          <Select
            :options="transformModeOptions"
            option-label="label"
            option-value="value"
            :model-value="transformConfig.mode"
            @update:model-value="patchConfig({ mode: String($event) })"
          />
        </label>
        <label v-if="transformConfig.mode === 'pickPath'">
          {{ t('inspector.fields.sourcePath') }}
          <AutoComplete
            input-id="transform.sourcePath"
            :model-value="transformConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('transform.sourcePath', $event)"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(transformConfig.sourcePath)" class="hint">
            {{ variableTokenHint(transformConfig.sourcePath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.targetPath') }}
          <AutoComplete
            input-id="transform.targetPath"
            :model-value="transformConfig.targetPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('transform.targetPath', $event)"
            @update:model-value="patchConfig({ targetPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(transformConfig.targetPath)" class="hint">
            {{ variableTokenHint(transformConfig.targetPath) }}
          </p>
          <p v-else-if="!transformConfig.targetPath.includes('[*]')" class="hint hint--info">
            {{ t('inspector.hints.targetPathWildcard') }}
          </p>
        </label>
        <label v-if="transformConfig.mode === 'assignLiteral'">
          {{ t('inspector.fields.literalValue') }}
          <AutoComplete
            input-id="transform.literalValue"
            :model-value="transformConfig.literalValue"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu('transform.literalValue')"
            @complete="completeVariables($event, 'transform.literalValue')"
            @item-select="handleSuggestionSelect('transform.literalValue', $event)"
            @update:model-value="patchConfig({ literalValue: String($event) })"
          />
          <p class="hint hint--info">
            {{ t('inspector.hints.transformTemplateSyntax') }}
          </p>
          <p v-if="isVariableTokenInput(transformConfig.literalValue)" class="hint">
            {{ variableTokenHint(transformConfig.literalValue) }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'map' && mapConfig">
        <Message
          v-if="unresolvedMapVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedMapVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.sourcePath') }}
          <AutoComplete
            input-id="map.sourcePath"
            :model-value="mapConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu('map.sourcePath')"
            @complete="completeVariables($event, 'map.sourcePath')"
            @item-select="handleSuggestionSelect('map.sourcePath', $event)"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(mapConfig.sourcePath)" class="hint">
            {{ variableTokenHint(mapConfig.sourcePath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.outputPath') }}
          <AutoComplete
            input-id="map.outputPath"
            :model-value="mapConfig.outputPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu('map.outputPath')"
            @complete="completeVariables($event, 'map.outputPath')"
            @item-select="handleSuggestionSelect('map.outputPath', $event)"
            @update:model-value="patchConfig({ outputPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(mapConfig.outputPath)" class="hint">
            {{ variableTokenHint(mapConfig.outputPath) }}
          </p>
        </label>
        <div class="extractions-section">
          <div class="extractions-header">
            <Button
              size="small"
              :label="t('inspector.buttons.addMapping')"
              icon="pi pi-plus"
              @click="patchConfig({ mappings: [...(mapConfig.mappings || []), { targetField: '', literalValue: '', fallbackValue: '' }] })"
            />
          </div>
          <DataTable
            :value="mapConfig.mappings || []"
            size="small"
            responsive-layout="scroll"
            :rows="10"
          >
            <Column :header="t('inspector.fields.targetField')" style="width: 30%">
              <template #body="slotProps">
                <InputText
                  :model-value="slotProps.data.targetField"
                  @update:model-value="slotProps.data.targetField = $event; patchConfig({ mappings: mapConfig.mappings })"
                  placeholder="ex: profile.name"
                />
              </template>
            </Column>
            <Column style="width: 50%">
              <template #header>
                <div class="map-template-header">
                  <span>{{ t('inspector.fields.literalValue') }}</span>
                  <Button
                    icon="pi pi-question"
                    text
                    rounded
                    severity="secondary"
                    class="map-template-help"
                    :aria-label="t('inspector.hints.templateSyntax')"
                    v-tooltip.top="t('inspector.hints.templateSyntax')"
                    v-tooltip.focus.top="t('inspector.hints.templateSyntax')"
                  />
                </div>
              </template>
              <template #body="slotProps">
                <InputText
                  :model-value="slotProps.data.literalValue"
                  @update:model-value="slotProps.data.literalValue = $event; patchConfig({ mappings: mapConfig.mappings })"
                  placeholder="ex: Name: {firstName} {lastName}"
                  class="w-full"
                />
              </template>
            </Column>
            <Column :header="t('inspector.fields.fallbackValue')" style="width: 14%">
              <template #body="slotProps">
                <InputText
                  :model-value="slotProps.data.fallbackValue"
                  @update:model-value="slotProps.data.fallbackValue = $event; patchConfig({ mappings: mapConfig.mappings })"
                  placeholder="ex: N/A"
                />
              </template>
            </Column>
            <Column style="width: 6%">
              <template #body="slotProps">
                <Button
                  size="small"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  @click="patchConfig({ mappings: mapConfig.mappings.filter((_, i) => i !== slotProps.index) })"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <template v-if="selectedType === 'iterate' && iterateConfig">
        <Message
          v-if="unresolvedIterateVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedIterateVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.sourcePath') }}
          <AutoComplete
            input-id="iterate.sourcePath"
            :model-value="iterateConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('iterate.sourcePath', $event)"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(iterateConfig.sourcePath)" class="hint">
            {{ variableTokenHint(iterateConfig.sourcePath) }}
          </p>
          <p class="hint hint--info">
            {{ t('inspector.hints.iterateRuntimeVars') }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'output' && outputConfig">
        <Message
          v-if="outputPathValidation"
          class="body-validation-message"
          :severity="outputPathValidation.severity"
          :closable="false"
        >
          {{ outputPathValidation.text }}
        </Message>
        <Message
          v-if="unresolvedOutputVariables.length > 0"
          severity="warn"
          :closable="false"
        >
          {{ t('inspector.warnings.unresolvedVariables') }}: {{ unresolvedOutputVariables.join(', ') }}
        </Message>
        <label>
          {{ t('inspector.fields.outputPath') }}
          <AutoComplete
            input-id="output.outputPath"
            :model-value="outputConfig.outputPath"
            :suggestions="variableSuggestions"
            dropdown
            @focus="captureCursorPosition"
            @click="captureCursorPosition"
            @keyup="captureCursorPosition"
            @focusin="openSuggestionMenu"
            @complete="completeVariables"
            @item-select="handleSuggestionSelect('output.outputPath', $event)"
            @update:model-value="patchConfig({ outputPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(outputConfig.outputPath)" class="hint">
            {{ variableTokenHint(outputConfig.outputPath) }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'start'">
        <Message severity="info" :closable="false">{{ t('inspector.messages.startNoConfig') }}</Message>
      </template>

      <template v-if="selectedType === 'subflow'">
        <Message severity="info" :closable="false">{{ t('inspector.messages.subflowNoConfig') }}</Message>
        <p class="hint hint--info">
          {{ t('inspector.hints.subflowBehavior') }}
        </p>
      </template>
    </div>

    <Dialog
      v-model:visible="isApiResultDialogVisible"
      modal
      :header="t('inspector.dialog.apiResult')"
      :style="{ width: 'min(90vw, 900px)' }"
    >
      <Tabs value="response">
        <TabList>
          <Tab value="request">{{ t('inspector.tabs.request') }}</Tab>
          <Tab value="response">{{ t('inspector.tabs.response') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="request">
            <pre class="api-result">{{ prettyApiRequest }}</pre>
          </TabPanel>
          <TabPanel value="response">
            <pre class="api-result api-result--meta">{{ prettyApiResponseMeta }}</pre>
            <pre class="api-result">{{ prettyApiResponse }}</pre>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Dialog>
  </Panel>
</template>

<style scoped>
.panel {
  height: 100%;
  overflow: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

p {
  margin: 0.35rem 0 1rem;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.form-grid {
  display: grid;
  gap: 0.7rem;
}

.tab-content {
  display: grid;
  gap: 0.7rem;
}

.tab-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-preview {
  margin-top: 1rem;
  padding: 0.7rem;
  border-radius: 0.375rem;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.preview-label {
  margin: 0 0 0.5rem 0;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-soft);
}

.api-result-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.45;
  max-height: 30vh;
  overflow: auto;
}

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.84rem;
  color: var(--text-soft);
}

.hint {
  margin: 0;
  font-style: italic;
}

.body-validation-message {
  margin-top: 0.2rem;
}

.hint--info {
  color: var(--text-soft);
  font-style: normal;
  font-size: 0.78rem;
}

.map-template-header {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.map-template-help {
  width: 1.15rem;
  height: 1.15rem;
  min-width: 1.15rem;
  padding: 0;
}

.api-result {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.45;
  max-height: 60vh;
  overflow: auto;
}

.api-result--meta {
  margin-bottom: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 0.5rem;
  background: var(--surface-100);
}

.headers-section {
  display: grid;
  gap: 0.5rem;
}

.headers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.headers-header label {
  margin: 0;
  color: var(--text-soft);
}

:deep(.p-datatable-sm .p-datatable-thead > tr > th) {
  padding: 0.35rem;
  font-size: 0.84rem;
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
  padding: 0.35rem;
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td input) {
  font-size: 0.9rem;
}

.extractions-header{
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>

