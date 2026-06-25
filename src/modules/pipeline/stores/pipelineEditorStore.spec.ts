import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createInitialPipeline } from '@/modules/pipeline/domain/defaults'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import type { NodeType, PipelineNode } from '@/modules/pipeline/domain/types'

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}))

vi.mock('@/modules/pipeline/services/pipelineStorage', () => ({
  listSavedPipelines: vi.fn(() => []),
  loadPipeline: vi.fn(),
  loadSavedPipeline: vi.fn(() => null),
  savePipeline: vi.fn(),
}))

function getLastNodeByType(store: ReturnType<typeof usePipelineEditorStore>, type: NodeType): PipelineNode {
  const matches = store.nodes.filter((node) => node.data.type === type)
  const node = matches.at(-1)

  if (!node) {
    throw new Error(`Missing test node of type: ${type}`)
  }

  return node
}

describe('pipelineEditorStore onConnect auto-fill', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const storage = await import('@/modules/pipeline/services/pipelineStorage')
    vi.mocked(storage.loadPipeline).mockImplementation(() => createInitialPipeline())

    setActivePinia(createPinia())
  })

  it('auto-remplit output.outputPath depuis api.outputPath', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('api')
    store.addNodeByType('output')

    const apiNode = getLastNodeByType(store, 'api')
    const outputNode = getLastNodeByType(store, 'output')

    store.setSelectedNode(apiNode.id)
    store.updateSelectedNodeConfig({
      ...(apiNode.data.config as Record<string, unknown>),
      outputPath: 'api.users',
    })

    store.onConnect({ source: apiNode.id, target: outputNode.id })

    const refreshedOutputNode = store.nodes.find((node) => node.id === outputNode.id)
    expect((refreshedOutputNode?.data.config as Record<string, unknown>).outputPath).toBe('api.users')
  })

  it('n ecrase pas un output.outputPath personnalise', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('api')
    store.addNodeByType('output')

    const apiNode = getLastNodeByType(store, 'api')
    const outputNode = getLastNodeByType(store, 'output')

    store.setSelectedNode(apiNode.id)
    store.updateSelectedNodeConfig({
      ...(apiNode.data.config as Record<string, unknown>),
      outputPath: 'api.users',
    })

    store.setSelectedNode(outputNode.id)
    store.updateSelectedNodeConfig({
      ...(outputNode.data.config as Record<string, unknown>),
      outputPath: 'custom.keep',
    })

    store.onConnect({ source: apiNode.id, target: outputNode.id })

    const refreshedOutputNode = store.nodes.find((node) => node.id === outputNode.id)
    expect((refreshedOutputNode?.data.config as Record<string, unknown>).outputPath).toBe('custom.keep')
  })

  it('remplit selon la branche filter (filtered puis rejected)', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('filter')
    store.addNodeByType('output')
    store.addNodeByType('output')

    const filterNode = getLastNodeByType(store, 'filter')
    const outputs = store.nodes.filter((node) => node.data.type === 'output').slice(-2)
    const firstOutput = outputs[0]
    const secondOutput = outputs[1]

    store.setSelectedNode(filterNode.id)
    store.updateSelectedNodeConfig({
      ...(filterNode.data.config as Record<string, unknown>),
      outputPath: 'result.filteredUsers',
      outputPathRejected: 'result.rejectedUsers',
    })

    store.onConnect({ source: filterNode.id, target: firstOutput.id })
    store.onConnect({ source: filterNode.id, target: secondOutput.id })

    const refreshedFirst = store.nodes.find((node) => node.id === firstOutput.id)
    const refreshedSecond = store.nodes.find((node) => node.id === secondOutput.id)

    expect((refreshedFirst?.data.config as Record<string, unknown>).outputPath).toBe('result.filteredUsers')
    expect((refreshedSecond?.data.config as Record<string, unknown>).outputPath).toBe('result.rejectedUsers')
  })

  it('ignore l auto-remplissage si la source ne fournit pas de chemin', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('api')
    store.addNodeByType('output')

    const apiNode = getLastNodeByType(store, 'api')
    const outputNode = getLastNodeByType(store, 'output')

    store.setSelectedNode(apiNode.id)
    store.updateSelectedNodeConfig({
      ...(apiNode.data.config as Record<string, unknown>),
      outputPath: '',
    })

    store.onConnect({ source: apiNode.id, target: outputNode.id })

    const refreshedOutputNode = store.nodes.find((node) => node.id === outputNode.id)
    expect((refreshedOutputNode?.data.config as Record<string, unknown>).outputPath).toBe('result')
  })

  it('met a jour apres suppression et reconnexion du lien', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('api')
    store.addNodeByType('output')

    const apiNode = getLastNodeByType(store, 'api')
    const outputNode = getLastNodeByType(store, 'output')

    store.setSelectedNode(apiNode.id)
    store.updateSelectedNodeConfig({
      ...(apiNode.data.config as Record<string, unknown>),
      outputPath: 'result.v1',
    })

    store.onConnect({ source: apiNode.id, target: outputNode.id })

    const firstEdge = store.edges.find((edge) => edge.source === apiNode.id && edge.target === outputNode.id)
    expect(firstEdge).toBeDefined()

    store.onEdgesChange([
      {
        type: 'remove',
        id: firstEdge!.id,
        source: firstEdge!.source,
        target: firstEdge!.target,
        sourceHandle: null,
        targetHandle: null,
      },
    ])

    store.setSelectedNode(apiNode.id)
    store.updateSelectedNodeConfig({
      ...(store.nodes.find((node) => node.id === apiNode.id)!.data.config as Record<string, unknown>),
      outputPath: 'result.v2',
    })

    store.onConnect({ source: apiNode.id, target: outputNode.id })

    const refreshedOutputNode = store.nodes.find((node) => node.id === outputNode.id)
    expect((refreshedOutputNode?.data.config as Record<string, unknown>).outputPath).toBe('result.v2')
  })
})
