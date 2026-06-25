import { defineStore } from 'pinia'
import { computed, ref, toRaw, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Connection, EdgeChange, NodeChange } from '@vue-flow/core'
import { createInitialPipeline, createNode, getDefaultConfig } from '@/modules/pipeline/domain/defaults'
import { pipelineDefinitionSchema } from '@/modules/pipeline/domain/schema'
import { runPipeline } from '@/modules/pipeline/engine/runPipeline'
import {
  listSavedPipelines,
  loadPipeline,
  loadSavedPipeline,
  savePipeline,
  type SavedPipelineSummary,
} from '@/modules/pipeline/services/pipelineStorage'
import { t } from '@/i18n'
import type { PipelineDefinition as PipelineDefinitionType } from '@/modules/pipeline/domain/types'
import type {
  ConditionBranch,
  FilterBranch,
  ExecutionLog,
  ExecutionRun,
  NodeType,
  PipelineEnvironment,
  PipelineDefinition,
  PipelineEdge,
  PipelineNode,
  PipelineVariable,
} from '@/modules/pipeline/domain/types'
import { buildVariableMap, isValidVariableName } from '../domain/variables'

function branchLabel(branch?: ConditionBranch | FilterBranch): string | undefined {
  if (branch === 'true') {
    return t('defaults.edge.true')
  }

  if (branch === 'false') {
    return t('defaults.edge.false')
  }

  if (branch === 'filtered') {
    return t('defaults.edge.filtered')
  }

  if (branch === 'rejected') {
    return t('defaults.edge.rejected')
  }

  return undefined
}

function nodeLabel(type: NodeType): string {
  if (type === 'start') {
    return t('defaults.nodeLabel.start')
  }

  if (type === 'api') {
    return t('defaults.nodeLabel.api')
  }

  if (type === 'condition') {
    return t('defaults.nodeLabel.condition')
  }

  if (type === 'filter') {
    return t('defaults.nodeLabel.filter')
  }

  if (type === 'transform') {
    return t('defaults.nodeLabel.transform')
  }

  if (type === 'map') {
    return t('defaults.nodeLabel.map')
  }

  if (type === 'setVariable') {
    return t('defaults.nodeLabel.setVariable')
  }

  return t('defaults.nodeLabel.output')
}

const maxOutgoingConnectionsByNodeType: Record<NodeType, number> = {
  start: 1,
  api: 1,
  setVariable: 1,
  condition: 2,
  filter: 2,
  transform: 1,
  map: 1,
  output: 1,
}

function getMaxOutgoingConnections(type: NodeType): number {
  return maxOutgoingConnectionsByNodeType[type]
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function ensurePipelineEnvironments(definition: PipelineDefinition): void {
  if (!definition.environments || definition.environments.length === 0) {
    const environmentId = crypto.randomUUID()
    definition.environments = [{ id: environmentId, name: 'default', variableOverrides: {} }]
    definition.activeEnvironmentId = environmentId
    return
  }

  const hasActiveEnvironment = definition.activeEnvironmentId
    && definition.environments.some((environment) => environment.id === definition.activeEnvironmentId)

  if (!hasActiveEnvironment) {
    definition.activeEnvironmentId = definition.environments[0].id
  }
}

function buildUniqueEnvironmentName(
  desiredName: string,
  existingEnvironments: PipelineEnvironment[],
  skipEnvironmentId?: string,
): string {
  const normalized = desiredName.trim() || 'environment'
  const existingNames = new Set(
    existingEnvironments
      .filter((environment) => environment.id !== skipEnvironmentId)
      .map((environment) => environment.name.trim().toLowerCase()),
  )

  if (!existingNames.has(normalized.toLowerCase())) {
    return normalized
  }

  let counter = 2
  while (existingNames.has(`${normalized} ${counter}`.toLowerCase())) {
    counter += 1
  }

  return `${normalized} ${counter}`
}

export const usePipelineEditorStore = defineStore('pipeline-editor', () => {
  const toast = useToast()
  const pipeline = ref<PipelineDefinition>(loadPipeline())
  const lastAutoFilledByNodeField = ref<Record<string, string>>({})
  const savedPipelines = ref<SavedPipelineSummary[]>(listSavedPipelines())
  const selectedNodeId = ref<string | null>(null)
  const nodeCreationCenter = ref<{ x: number; y: number } | null>(null)
  const nodeCreationTick = ref(0)
  const isRunning = ref(false)
  const logs = ref<ExecutionLog[]>([])
  const runHistory = ref<ExecutionRun[]>([])
  const autoSaveEnabled = ref(true)

  ensurePipelineEnvironments(pipeline.value)

  const nodes = computed({
    get: () => pipeline.value.nodes,
    set: (next: PipelineNode[]) => {
      pipeline.value.nodes = next
      pipeline.value.updatedAt = new Date().toISOString()
    },
  })

  const edges = computed({
    get: () => pipeline.value.edges,
    set: (next: PipelineEdge[]) => {
      pipeline.value.edges = next
      pipeline.value.updatedAt = new Date().toISOString()
    },
  })

  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value) ?? null
  })

  const environments = computed<PipelineEnvironment[]>(() => {
    ensurePipelineEnvironments(pipeline.value)
    return pipeline.value.environments ?? []
  })

  const activeEnvironment = computed<PipelineEnvironment | null>(() => {
    const environmentId = pipeline.value.activeEnvironmentId
    if (!environmentId) {
      return null
    }

    return environments.value.find((environment) => environment.id === environmentId) ?? null
  })

  const effectiveVariableMap = computed<Record<string, string>>(() => {
    return buildVariableMap(pipeline.value.variables, activeEnvironment.value?.variableOverrides)
  })

  function setSelectedNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId
  }

  function renamePipeline(name: string): void {
    if (!name.trim()) {
      return
    }

    pipeline.value.name = name.trim()
    pipeline.value.updatedAt = new Date().toISOString()
  }

  function resetPipeline(): void {
    pipeline.value = createInitialPipeline()
    lastAutoFilledByNodeField.value = {}
    ensurePipelineEnvironments(pipeline.value)
    selectedNodeId.value = null
    logs.value = []
    runHistory.value = []
  }

  function refreshSavedPipelines(): void {
    savedPipelines.value = listSavedPipelines()
  }

  function saveCurrentPipeline(): void {
    pipeline.value.updatedAt = new Date().toISOString()
    savePipeline(pipeline.value)
    refreshSavedPipelines()
    toast.add({
      severity: 'success',
      summary: t('pipelineEditor.storage.saveSuccess'),
      detail: t('pipelineEditor.storage.saveSuccessDetail'),
      life: 2500,
    })
  }

  function exportCurrentPipeline(): string {
    return JSON.stringify(pipeline.value, null, 2)
  }

  function importPipelineFromJson(rawJson: string): boolean {
    try {
      const parsed = JSON.parse(rawJson)
      const validated = pipelineDefinitionSchema.parse(parsed)

      pipeline.value = {
        ...validated,
        updatedAt: new Date().toISOString(),
      }
      lastAutoFilledByNodeField.value = {}
      ensurePipelineEnvironments(pipeline.value)
      selectedNodeId.value = null
      logs.value = []
      runHistory.value = []
      relocalizePipelineLabels()
      refreshSavedPipelines()

      toast.add({
        severity: 'success',
        summary: t('pipelineEditor.storage.importSuccess'),
        detail: t('pipelineEditor.storage.importSuccessDetail', { name: validated.name }),
        life: 3500,
      })
      return true
    } catch {
      toast.add({
        severity: 'error',
        summary: t('pipelineEditor.storage.importInvalid'),
        detail: t('pipelineEditor.storage.importInvalidDetail'),
        life: 5000,
      })
      return false
    }
  }

  function loadPipelineById(pipelineId: string): boolean {
    const loaded = loadSavedPipeline(pipelineId)
    if (!loaded) {
      toast.add({
        severity: 'warn',
        summary: t('pipelineEditor.storage.loadMissing'),
        detail: t('pipelineEditor.storage.loadMissingDetail'),
        life: 4000,
      })
      refreshSavedPipelines()
      return false
    }

    pipeline.value = loaded
    lastAutoFilledByNodeField.value = {}
    ensurePipelineEnvironments(pipeline.value)
    selectedNodeId.value = null
    logs.value = []
    runHistory.value = []
    relocalizePipelineLabels()
    refreshSavedPipelines()

    toast.add({
      severity: 'success',
      summary: t('pipelineEditor.storage.loadSuccess'),
      detail: t('pipelineEditor.storage.loadSuccessDetail', { name: loaded.name }),
      life: 3000,
    })
    return true
  }

  function addVariable(name: string, value: string): boolean {
    const trimmedName = name.trim()
    if (!trimmedName || !isValidVariableName(trimmedName)) {
      return false
    }

    const nameExists = pipeline.value.variables.some(
      (v) => v.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    )
    if (nameExists) {
      return false
    }

    pipeline.value.variables = [
      ...pipeline.value.variables,
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        value,
      },
    ]
    pipeline.value.updatedAt = new Date().toISOString()
    return true
  }

  function updateVariable(variableId: string, updates: Partial<Pick<PipelineVariable, 'name' | 'value'>>): void {
    const previousVariable = pipeline.value.variables.find((variable) => variable.id === variableId) ?? null
    const previousName = previousVariable?.name.trim() ?? ''

    pipeline.value.variables = pipeline.value.variables.map((variable) => {
      if (variable.id !== variableId) {
        return variable
      }

      const candidate = updates.name === undefined ? variable.name : updates.name.trim()
      const nextName = candidate && isValidVariableName(candidate) ? candidate : variable.name
      return {
        ...variable,
        name: nextName,
        value: updates.value === undefined ? variable.value : updates.value,
      }
    })


    const nextVariable = pipeline.value.variables.find((variable) => variable.id === variableId) ?? null
    const nextName = nextVariable?.name.trim() ?? ''

    if (previousName && nextName && previousName !== nextName) {
      pipeline.value.environments = (pipeline.value.environments ?? []).map((environment) => {
        if (!(previousName in environment.variableOverrides)) {
          return environment
        }

        const nextOverrides = { ...environment.variableOverrides }
        nextOverrides[nextName] = nextOverrides[previousName]
        delete nextOverrides[previousName]

        return {
          ...environment,
          variableOverrides: nextOverrides,
        }
      })
    }
    pipeline.value.updatedAt = new Date().toISOString()
  }

  function setActiveEnvironment(environmentId: string): void {
    ensurePipelineEnvironments(pipeline.value)
    const normalizedEnvironmentId = environmentId.trim()
    if (!normalizedEnvironmentId) {
      return
    }

    const exists = (pipeline.value.environments ?? []).some((environment) => environment.id === normalizedEnvironmentId)

    if (!exists) {
      return
    }

    pipeline.value.activeEnvironmentId = normalizedEnvironmentId
    pipeline.value.updatedAt = new Date().toISOString()
  }

  function addEnvironment(name: string): string {
    ensurePipelineEnvironments(pipeline.value)
    const uniqueName = buildUniqueEnvironmentName(name, pipeline.value.environments ?? [])
    const environmentId = crypto.randomUUID()
    const nextEnvironment: PipelineEnvironment = {
      id: environmentId,
      name: uniqueName,
      variableOverrides: {},
    }

    pipeline.value.environments = [...(pipeline.value.environments ?? []), nextEnvironment]
    pipeline.value.activeEnvironmentId = environmentId
    pipeline.value.updatedAt = new Date().toISOString()
    return environmentId
  }

  function renameEnvironment(environmentId: string, name: string): void {
    ensurePipelineEnvironments(pipeline.value)
    if (!name.trim()) {
      return
    }

    const environmentsList = pipeline.value.environments ?? []
    const uniqueName = buildUniqueEnvironmentName(name, environmentsList, environmentId)
    pipeline.value.environments = environmentsList.map((environment) => {
      if (environment.id !== environmentId) {
        return environment
      }

      return {
        ...environment,
        name: uniqueName,
      }
    })
    pipeline.value.updatedAt = new Date().toISOString()
  }

  function removeEnvironment(environmentId: string): boolean {
    ensurePipelineEnvironments(pipeline.value)
    const environmentsList = pipeline.value.environments ?? []
    if (environmentsList.length <= 1) {
      return false
    }

    const nextEnvironments = environmentsList.filter((environment) => environment.id !== environmentId)
    if (nextEnvironments.length === environmentsList.length) {
      return false
    }

    pipeline.value.environments = nextEnvironments
    if (pipeline.value.activeEnvironmentId === environmentId) {
      pipeline.value.activeEnvironmentId = nextEnvironments[0].id
    }

    pipeline.value.updatedAt = new Date().toISOString()
    return true
  }

  function removeVariable(variableId: string): void {
    const targetVariable = pipeline.value.variables.find((variable) => variable.id === variableId) ?? null
    const variableName = targetVariable?.name.trim() ?? ''

    pipeline.value.variables = pipeline.value.variables.filter((variable) => variable.id !== variableId)

    if (variableName) {
      pipeline.value.environments = (pipeline.value.environments ?? []).map((environment) => {
        if (!(variableName in environment.variableOverrides)) {
          return environment
        }

        const nextOverrides = { ...environment.variableOverrides }
        delete nextOverrides[variableName]

        return {
          ...environment,
          variableOverrides: nextOverrides,
        }
      })
    }

    pipeline.value.updatedAt = new Date().toISOString()
  }

  function getVariableValueForActiveEnvironment(variable: PipelineVariable): string {
    const variableName = variable.name.trim()
    if (!variableName) {
      return variable.value
    }

    return activeEnvironment.value?.variableOverrides?.[variableName] ?? variable.value
  }

  function updateVariableValueForActiveEnvironment(variableId: string, value: string): void {
    ensurePipelineEnvironments(pipeline.value)
    const variable = pipeline.value.variables.find((candidate) => candidate.id === variableId)
    if (!variable) {
      return
    }

    const activeEnvironmentId = pipeline.value.activeEnvironmentId
    const defaultEnvironmentId = pipeline.value.environments?.[0]?.id

    if (!activeEnvironmentId || !defaultEnvironmentId || activeEnvironmentId === defaultEnvironmentId) {
      updateVariable(variableId, { value })
      return
    }

    const variableName = variable.name.trim()
    if (!variableName) {
      return
    }

    pipeline.value.environments = (pipeline.value.environments ?? []).map((environment) => {
      if (environment.id !== activeEnvironmentId) {
        return environment
      }

      return {
        ...environment,
        variableOverrides: {
          ...environment.variableOverrides,
          [variableName]: value,
        },
      }
    })
    pipeline.value.updatedAt = new Date().toISOString()
  }

  function setNodeCreationCenter(position: { x: number; y: number } | null): void {
    nodeCreationCenter.value = position
  }

  function addNodeByType(type: NodeType): void {
    if (type === 'start' && nodes.value.some((node) => node.data.type === 'start')) {
      toast.add({
        severity: 'error',
        summary: t('pipelineEditor.toast.startNodeAlreadyExists'),
        detail: t('pipelineEditor.toast.startNodeAlreadyExistsDetail'),
        life: 4500,
      })
      return
    }

    let x = 220 + (nodes.value.length % 4) * 260
    let y = 100 + Math.floor(nodes.value.length / 4) * 160

    if (
      nodeCreationCenter.value
      && isFiniteCoordinate(nodeCreationCenter.value.x)
      && isFiniteCoordinate(nodeCreationCenter.value.y)
    ) {
      const estimatedNodeWidth = type === 'start' || type === 'output' ? 140 : 180
      const estimatedNodeHeight = 64
      x = nodeCreationCenter.value.x - estimatedNodeWidth / 2
      y = nodeCreationCenter.value.y - estimatedNodeHeight / 2
    }

    const newNode = createNode(type, x, y)
    nodes.value = [...nodes.value, newNode]
    selectedNodeId.value = newNode.id
    nodeCreationTick.value += 1
  }

  function duplicateNode(nodeId: string): void {
    const sourceNode = nodes.value.find((node) => node.id === nodeId)
    if (!sourceNode) {
      return
    }

    const rawNode = toRaw(sourceNode)
    const rawData = toRaw(rawNode.data)
    const clonedConfig = structuredClone(toRaw(rawData.config))

    const duplicate: PipelineNode = {
      ...rawNode,
      id: crypto.randomUUID(),
      position: {
        x: rawNode.position.x + 40,
        y: rawNode.position.y + 40,
      },
      data: {
        ...rawData,
        name: rawData.name?.trim()
          ? `${rawData.name} copy`
          : rawData.name,
        config: clonedConfig,
      },
    }

    nodes.value = [...nodes.value, duplicate]
    selectedNodeId.value = duplicate.id
    nodeCreationTick.value += 1
  }

  function updateNodeName(nodeId: string, name: string): void {
    const trimmedName = name.trim()

    nodes.value = nodes.value.map((node) => {
      if (node.id !== nodeId || node.data.type === 'start') {
        return node
      }

      return {
        ...node,
        data: {
          ...node.data,
          name: trimmedName || undefined,
        },
      }
    })
  }

  function removeNode(nodeId: string): void {
    nodes.value = nodes.value.filter((node) => node.id !== nodeId)
    edges.value = edges.value.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

    const prefix = `${nodeId}:`
    lastAutoFilledByNodeField.value = Object.fromEntries(
      Object.entries(lastAutoFilledByNodeField.value).filter(([key]) => !key.startsWith(prefix)),
    )

    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null
    }
  }

  function onNodesChange(changes: NodeChange[]): void {
    let nextNodes = [...nodes.value]

    for (const change of changes) {
      if (change.type === 'remove') {
        const removedNodeId = change.id
        const prefix = `${removedNodeId}:`
        lastAutoFilledByNodeField.value = Object.fromEntries(
          Object.entries(lastAutoFilledByNodeField.value).filter(([key]) => !key.startsWith(prefix)),
        )
        nextNodes = nextNodes.filter((node) => node.id !== change.id)
      }

      if (change.type === 'position' && change.position) {
        nextNodes = nextNodes.map((node) =>
          node.id === change.id
            ? {
                ...node,
                position: change.position,
              }
            : node,
        )
      }
    }

    nodes.value = nextNodes
  }

  function onEdgesChange(changes: EdgeChange[]): void {
    let nextEdges = [...edges.value]

    for (const change of changes) {
      if (change.type === 'remove') {
        nextEdges = nextEdges.filter((edge) => edge.id !== change.id)
      }
    }

    edges.value = nextEdges
  }

  function getSourceOutputPath(
    sourceNode: PipelineNode,
    branch: ConditionBranch | FilterBranch | undefined,
  ): string {
    const config = sourceNode.data.config as Record<string, unknown>
    switch (sourceNode.data.type) {
      case 'api':
        return (config.outputPath as string) || ''
      case 'filter':
        return branch === 'rejected'
          ? (config.outputPathRejected as string) || ''
          : (config.outputPath as string) || ''
      case 'transform':
        return (config.targetPath as string) || ''
      case 'map':
        return (config.outputPath as string) || ''
      default:
        return ''
    }
  }

  function shouldReplaceAutoFillValue(
    targetNode: PipelineNode,
    key: string,
    currentValue: unknown,
  ): boolean {
    const nodeFieldKey = `${targetNode.id}:${key}`

    if (typeof currentValue !== 'string' || !currentValue.trim()) {
      return true
    }

    const previousAutoFilledValue = lastAutoFilledByNodeField.value[nodeFieldKey]
    if (previousAutoFilledValue && currentValue === previousAutoFilledValue) {
      return true
    }

    const defaultConfig = getDefaultConfig(targetNode.data.type) as Record<string, unknown>
    const defaultValue = defaultConfig[key]

    return typeof defaultValue === 'string' && currentValue === defaultValue
  }

  function autoFillTargetNodeConfig(targetNode: PipelineNode, sourcePath: string): void {
    const config = targetNode.data.config as Record<string, unknown>
    switch (targetNode.data.type) {
      case 'output':
        if (shouldReplaceAutoFillValue(targetNode, 'outputPath', config.outputPath)) {
          config.outputPath = sourcePath
          lastAutoFilledByNodeField.value[`${targetNode.id}:outputPath`] = sourcePath
        }
        break
      case 'condition':
        if (shouldReplaceAutoFillValue(targetNode, 'leftPath', config.leftPath)) {
          config.leftPath = sourcePath
          lastAutoFilledByNodeField.value[`${targetNode.id}:leftPath`] = sourcePath
        }
        break
      case 'filter':
        if (shouldReplaceAutoFillValue(targetNode, 'sourcePath', config.sourcePath)) {
          config.sourcePath = sourcePath
          lastAutoFilledByNodeField.value[`${targetNode.id}:sourcePath`] = sourcePath
        }
        break
      case 'transform':
        if (shouldReplaceAutoFillValue(targetNode, 'sourcePath', config.sourcePath)) {
          config.sourcePath = sourcePath
          lastAutoFilledByNodeField.value[`${targetNode.id}:sourcePath`] = sourcePath
        }
        break
      case 'map':
        if (shouldReplaceAutoFillValue(targetNode, 'sourcePath', config.sourcePath)) {
          config.sourcePath = sourcePath
          lastAutoFilledByNodeField.value[`${targetNode.id}:sourcePath`] = sourcePath
        }
        break
    }
  }


  function onConnect(connection: Connection): void {
    if (!connection.source || !connection.target) {
      return
    }

    const sourceNode = nodes.value.find((node) => node.id === connection.source)
    if (!sourceNode) {
      return
    }

    const sourceEdges = edges.value.filter((edge) => edge.source === sourceNode.id)
    const maxOutgoingConnections = getMaxOutgoingConnections(sourceNode.data.type)
    if (sourceEdges.length >= maxOutgoingConnections) {
      const sourceName = sourceNode.data.name?.trim() || sourceNode.data.label
      toast.add({
        severity: 'warn',
        summary: t('pipelineEditor.toast.maxOutgoingConnectionsReached'),
        detail: t('pipelineEditor.toast.maxOutgoingConnectionsReachedDetail', {
          name: sourceName,
          max: maxOutgoingConnections,
        }),
        life: 4500,
      })
      return
    }

    let branch: ConditionBranch | FilterBranch | undefined

    if (sourceNode?.data.type === 'condition') {
      const hasTrue = sourceEdges.some((edge) => edge.data?.branch === 'true')
      branch = hasTrue ? 'false' : 'true'
    }

    if (sourceNode?.data.type === 'filter') {
      const hasFiltered = sourceEdges.some((edge) => edge.data?.branch === 'filtered')
      branch = hasFiltered ? 'rejected' : 'filtered'
    }

    edges.value = [
      ...edges.value,
      {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        label: branchLabel(branch),
        data: branch ? { branch } : undefined,
      },
    ]

    // Auto-remplissage du chemin d'entrée du nœud cible
    const targetNode = pipeline.value.nodes.find((n) => n.id === connection.target)
    if (targetNode) {
      const sourcePath = getSourceOutputPath(sourceNode, branch)
      if (sourcePath) {
        autoFillTargetNodeConfig(targetNode, sourcePath)
      }
    }
  }

  function relocalizePipelineLabels(): void {
    nodes.value = nodes.value.map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: nodeLabel(node.data.type),
      },
    }))

    edges.value = edges.value.map((edge) => ({
      ...edge,
      label: branchLabel(edge.data?.branch),
    }))
  }

  function updateSelectedNodeConfig(config: unknown): void {
    const selected = selectedNode.value
    if (!selected) {
      return
    }

    const prefix = `${selected.id}:`
    lastAutoFilledByNodeField.value = Object.fromEntries(
      Object.entries(lastAutoFilledByNodeField.value).filter(([key]) => !key.startsWith(prefix)),
    )

    nodes.value = nodes.value.map((node) => {
      if (node.id !== selected.id) {
        return node
      }

      return {
        ...node,
        data: {
          ...node.data,
          config: config as typeof node.data.config,
        },
      } as PipelineNode
    })
  }

  async function runCurrentPipeline(): Promise<void> {
    const startedAt = new Date().toISOString()
    isRunning.value = true
    logs.value = []
    let runSuccess = false
    let runLogs: ExecutionLog[] = []
    let runErrorMessage: string | undefined

    try {
      const result = await runPipeline(pipeline.value)
      runLogs = result.context.logs
      logs.value = runLogs
      runSuccess = true
      toast.add({
        severity: 'success',
        summary: t('pipelineEditor.toast.executionSuccess'),
        detail: t('pipelineEditor.toast.executionSuccessDetail'),
        life: 5000,
      })
    } catch (error) {
      runErrorMessage = error instanceof Error ? error.message : t('pipelineEditor.toast.executionErrorDetail')
      toast.add({
        severity: 'error',
        summary: t('pipelineEditor.toast.executionError'),
        detail: runErrorMessage,
        life: 5000,
      })
    } finally {
      runHistory.value = [
        {
          id: crypto.randomUUID(),
          startedAt,
          finishedAt: new Date().toISOString(),
          success: runSuccess,
          logs: runLogs,
          errorMessage: runErrorMessage,
        },
        ...runHistory.value,
      ].slice(0, 20)
      isRunning.value = false
    }
  }

  function loadFromTemplate(template: PipelineDefinitionType): void {
    pipeline.value = {
      ...structuredClone(template),
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    }
    lastAutoFilledByNodeField.value = {}
    ensurePipelineEnvironments(pipeline.value)
    selectedNodeId.value = null
    logs.value = []
    runHistory.value = []
    relocalizePipelineLabels()

    toast.add({
      severity: 'success',
      summary: t('pipelineEditor.templates.loadSuccess'),
      detail: t('pipelineEditor.templates.loadSuccessDetail', { name: pipeline.value.name }),
      life: 3000,
    })
  }

  function setAutoSaveEnabled(enabled: boolean): void {
    autoSaveEnabled.value = enabled
  }

  watch(
    pipeline,
    (value) => {
      if (!autoSaveEnabled.value) {
        return
      }

      savePipeline(value)
      refreshSavedPipelines()
    },
    { deep: true },
  )

  return {
    pipeline,
    savedPipelines,
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    environments,
    activeEnvironment,
    effectiveVariableMap,
    nodeCreationTick,
    isRunning,
    logs,
    runHistory,
    addNodeByType,
    duplicateNode,
    removeNode,
    updateNodeName,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    setNodeCreationCenter,
    updateSelectedNodeConfig,
    relocalizePipelineLabels,
    refreshSavedPipelines,
    saveCurrentPipeline,
    exportCurrentPipeline,
    importPipelineFromJson,
    loadPipelineById,
    renamePipeline,
    resetPipeline,
    addVariable,
    updateVariable,
    setActiveEnvironment,
    addEnvironment,
    renameEnvironment,
    removeEnvironment,
    getVariableValueForActiveEnvironment,
    updateVariableValueForActiveEnvironment,
    removeVariable,
    runCurrentPipeline,
    loadFromTemplate,
    setAutoSaveEnabled,
  }
})
