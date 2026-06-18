import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Connection, EdgeChange, NodeChange } from '@vue-flow/core'
import { createInitialPipeline, createNode } from '@/modules/pipeline/domain/defaults'
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
import type {
  ConditionBranch,
  FilterBranch,
  ExecutionLog,
  ExecutionRun,
  NodeType,
  PipelineDefinition,
  PipelineEdge,
  PipelineNode,
  PipelineVariable,
} from '@/modules/pipeline/domain/types'
import { isValidVariableName } from '../domain/variables'

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

  if (type === 'setVariable') {
    return t('defaults.nodeLabel.setVariable')
  }

  return t('defaults.nodeLabel.output')
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export const usePipelineEditorStore = defineStore('pipeline-editor', () => {
  const toast = useToast()
  const pipeline = ref<PipelineDefinition>(loadPipeline())
  const savedPipelines = ref<SavedPipelineSummary[]>(listSavedPipelines())
  const selectedNodeId = ref<string | null>(null)
  const nodeCreationCenter = ref<{ x: number; y: number } | null>(null)
  const nodeCreationTick = ref(0)
  const isRunning = ref(false)
  const logs = ref<ExecutionLog[]>([])
  const runHistory = ref<ExecutionRun[]>([])

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

    pipeline.value.updatedAt = new Date().toISOString()
  }

  function removeVariable(variableId: string): void {
    pipeline.value.variables = pipeline.value.variables.filter((variable) => variable.id !== variableId)
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

  function updateNodeName(nodeId: string, name: string): void {
    const trimmedName = name.trim()

    nodes.value = nodes.value.map((node) => {
      if (node.id !== nodeId || node.data.type === 'start' || node.data.type === 'output') {
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

    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null
    }
  }

  function onNodesChange(changes: NodeChange[]): void {
    let nextNodes = [...nodes.value]

    for (const change of changes) {
      if (change.type === 'remove') {
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

  function onConnect(connection: Connection): void {
    if (!connection.source || !connection.target) {
      return
    }

    const sourceNode = nodes.value.find((node) => node.id === connection.source)
    let branch: ConditionBranch | FilterBranch | undefined

    if (sourceNode?.data.type === 'condition') {
      const sourceEdges = edges.value.filter((edge) => edge.source === sourceNode.id)
      const hasTrue = sourceEdges.some((edge) => edge.data?.branch === 'true')
      branch = hasTrue ? 'false' : 'true'
    }

    if (sourceNode?.data.type === 'filter') {
      const sourceEdges = edges.value.filter((edge) => edge.source === sourceNode.id)
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

  watch(
    pipeline,
    (value) => {
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
    nodeCreationTick,
    isRunning,
    logs,
    runHistory,
    addNodeByType,
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
    removeVariable,
    runCurrentPipeline,
  }
})
