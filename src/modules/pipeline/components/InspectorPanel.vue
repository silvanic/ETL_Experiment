<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { resolveValueWithVariables, toVariableToken, findUnresolvedVariables } from '@/modules/pipeline/domain/variables'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  FilterNodeConfig,
  OutputNodeConfig,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'
import { useI18n } from 'vue-i18n'
import { TabList, TabPanels, Tabs, Tab } from 'primevue'

const store = usePipelineEditorStore()
const { t } = useI18n()

const selected = computed(() => store.selectedNode)
const selectedData = computed(() => selected.value?.data)
const selectedType = computed(() => selectedData.value?.type)
const canEditNodeName = computed(() => selectedType.value !== 'start' && selectedType.value !== 'output')
const selectedLabel = computed(() => {
  if (!selectedData.value) {
    return ''
  }

  if (selectedData.value.type === 'start' || selectedData.value.type === 'output') {
    return selectedData.value.label
  }

  const name = selectedData.value.name?.trim() || selectedData.value.label
  return `${name} (${selectedData.value.label})`
})

const apiConfig = computed(() => {
  if (selectedType.value !== 'api') {
    return null
  }

  return selectedData.value?.config as ApiNodeConfig
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

const isApiLoading = ref(false)
const isApiResultDialogVisible = ref(false)
const lastApiResult = ref<unknown | null>(null)
const lastApiError = ref<string | null>(null)
const variableSuggestions = ref<string[]>([])

const variableMap = computed<Record<string, string>>(() => {
  return store.pipeline.variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.name] = variable.value
    return acc
  }, {})
})

const variableTokens = computed(() => store.pipeline.variables.map((variable) => toVariableToken(variable.name)))

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
  const unresolvedInHeaders = findUnresolvedVariables(apiConfig.value.headersRaw, variableMap.value)
  const unresolvedInBody = findUnresolvedVariables(apiConfig.value.bodyRaw, variableMap.value)
  const unresolvedInPath = findUnresolvedVariables(apiConfig.value.outputPath, variableMap.value)

  return Array.from(new Set([...unresolvedInUrl, ...unresolvedInHeaders, ...unresolvedInBody, ...unresolvedInPath]))
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

  const unresolvedInSource = findUnresolvedVariables(transformConfig.value.sourcePath, variableMap.value)
  const unresolvedInTarget = findUnresolvedVariables(transformConfig.value.targetPath, variableMap.value)
  const unresolvedInLiteral = findUnresolvedVariables(transformConfig.value.literalValue, variableMap.value)

  return Array.from(new Set([...unresolvedInSource, ...unresolvedInTarget, ...unresolvedInLiteral]))
})

const unresolvedOutputVariables = computed(() => {
  if (!outputConfig.value) {
    return []
  }

  return findUnresolvedVariables(outputConfig.value.outputPath, variableMap.value)
})

const hasApiResponse = computed(() => {
  if (lastApiError.value) {
    return true
  }

  return lastApiResult.value !== null
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

function patchNodeName(value: string | number | undefined): void {
  const node = selected.value
  if (!node || node.data.type === 'start' || node.data.type === 'output') {
    return
  }

  store.updateNodeName(node.id, String(value ?? ''))
}

function completeVariables(event: { query: string }): void {
  const rawQuery = String(event.query ?? '')
  const query = rawQuery.toLowerCase()

  if (rawQuery.startsWith('#')) {
    variableSuggestions.value = variableTokens.value.filter((token) => token.toLowerCase().includes(query))
  } else {
    variableSuggestions.value = outputPathSuggestions.value.filter((path) => path.toLowerCase().includes(query))
  }
}

function isVariableTokenInput(value: string | undefined): boolean {
  return String(value ?? '').trim().startsWith('#')
}

function variableTokenHint(value: string | undefined): string {
  const rawValue = String(value ?? '').trim()
  if (!rawValue.startsWith('#')) {
    return ''
  }

  const variableName = rawValue.slice(1)
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

  const resolvedHeadersRaw = resolveWithPipelineVariables(config.headersRaw)
  const resolvedBodyRaw = resolveWithPipelineVariables(config.bodyRaw)

  lastApiError.value = null
  lastApiResult.value = null
  isApiLoading.value = true

  try {
    let headers: Record<string, string> | undefined
    if (resolvedHeadersRaw?.trim()) {
      headers = JSON.parse(resolvedHeadersRaw) as Record<string, string>
    }

    const init: RequestInit = {
      method: config.method,
      headers,
    }

    if (config.method !== 'GET' && resolvedBodyRaw?.trim()) {
      init.body = resolvedBodyRaw
    }

    const response = await fetch(resolvedUrl, init)
    const contentType = response.headers.get('content-type') ?? ''

    let data: unknown
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
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
      <h2>{{ t('inspector.title') }}</h2>
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
                    :model-value="apiConfig.url"
                    :suggestions="variableSuggestions"
                    dropdown
                    @complete="completeVariables"
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
                  {{ t('inspector.fields.outputPath') }}
                  <AutoComplete
                    :model-value="apiConfig.outputPath"
                    :suggestions="variableSuggestions"
                    dropdown
                    @complete="completeVariables"
                    @update:model-value="patchConfig({ outputPath: String($event) })"
                  />
                  <p v-if="isVariableTokenInput(apiConfig.outputPath)" class="hint">
                    {{ variableTokenHint(apiConfig.outputPath) }}
                  </p>
                </label>
                <label>
                  {{ t('inspector.fields.headersJson') }}
                  <Textarea
                    rows="4"
                    auto-resize
                    :model-value="apiConfig.headersRaw"
                    @update:model-value="patchConfig({ headersRaw: String($event) })"
                  />
                </label>
                <label>
                  {{ t('inspector.fields.bodyJson') }}
                  <Textarea
                    rows="4"
                    auto-resize
                    :model-value="apiConfig.bodyRaw"
                    @update:model-value="patchConfig({ bodyRaw: String($event) })"
                  />
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
            :model-value="conditionConfig.leftPath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
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
            :model-value="conditionConfig.rightValue"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
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
            :model-value="filterConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.sourcePath)" class="hint">
            {{ variableTokenHint(filterConfig.sourcePath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.itemPath') }}
          <AutoComplete
            :model-value="filterConfig.itemPath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
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
            :model-value="filterConfig.rightValue"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ rightValue: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.rightValue)" class="hint">
            {{ variableTokenHint(filterConfig.rightValue) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.outputPath') }}
          <AutoComplete
            :model-value="filterConfig.outputPath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ outputPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(filterConfig.outputPath)" class="hint">
            {{ variableTokenHint(filterConfig.outputPath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.outputPathRejected') }}
          <AutoComplete
            :model-value="filterConfig.outputPathRejected"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
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
        <label>
          {{ t('inspector.fields.sourcePath') }}
          <AutoComplete
            :model-value="transformConfig.sourcePath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ sourcePath: String($event) })"
          />
          <p v-if="isVariableTokenInput(transformConfig.sourcePath)" class="hint">
            {{ variableTokenHint(transformConfig.sourcePath) }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.targetPath') }}
          <AutoComplete
            :model-value="transformConfig.targetPath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ targetPath: String($event) })"
          />
          <p v-if="isVariableTokenInput(transformConfig.targetPath)" class="hint">
            {{ variableTokenHint(transformConfig.targetPath) }}
          </p>
          <p v-else-if="!transformConfig.targetPath.includes('[*]')" class="hint hint--info">
            {{ t('inspector.hints.targetPathWildcard') }}
          </p>
        </label>
        <label>
          {{ t('inspector.fields.literalValue') }}
          <AutoComplete
            :model-value="transformConfig.literalValue"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
            @update:model-value="patchConfig({ literalValue: String($event) })"
          />
          <p v-if="isVariableTokenInput(transformConfig.literalValue)" class="hint">
            {{ variableTokenHint(transformConfig.literalValue) }}
          </p>
        </label>
      </template>

      <template v-if="selectedType === 'output' && outputConfig">
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
            :model-value="outputConfig.outputPath"
            :suggestions="variableSuggestions"
            dropdown
            @complete="completeVariables"
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
    </div>

    <Dialog
      v-model:visible="isApiResultDialogVisible"
      modal
      :header="t('inspector.dialog.apiResult')"
      :style="{ width: 'min(90vw, 700px)' }"
    >
      <pre class="api-result">{{ prettyApiResponse }}</pre>
    </Dialog>
  </Panel>
</template>

<style scoped>
.panel {
  height: 100%;
  overflow: auto;
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

.hint--info {
  color: var(--text-soft);
  font-style: normal;
  font-size: 0.78rem;
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
</style>
