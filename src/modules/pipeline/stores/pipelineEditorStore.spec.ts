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

  it('ajoute un enfant rapide dans un conteneur iterate', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')

    const beforeChildrenCount = store.nodes.filter((node) => node.parentNode === iterateNode.id).length
    store.addIterateQuickChild(iterateNode.id)
    const afterChildren = store.nodes.filter((node) => node.parentNode === iterateNode.id)

    expect(afterChildren.length).toBe(beforeChildrenCount + 1)
    expect(afterChildren.some((node) => node.data.type === 'transform')).toBe(true)
  })

  it('n autorise qu un seul start enfant par conteneur iterate', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')

    // Le premier Start enfant est créé automatiquement à l'ajout du conteneur.
    const createdId = store.addChildNode(iterateNode.id, 'start')

    const childStarts = store.nodes.filter(
      (node) => node.parentNode === iterateNode.id && node.data.type === 'start',
    )

    expect(createdId).toBe('')
    expect(childStarts.length).toBe(1)
  })

  it('cree automatiquement un start interne a la creation d un iterate racine', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')

    const childStarts = store.nodes.filter(
      (node) => node.parentNode === iterateNode.id && node.data.type === 'start',
    )

    expect(childStarts.length).toBe(1)
  })

  it('cree automatiquement un start interne a la creation d un subflow racine', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('subflow')
    const subflowNode = getLastNodeByType(store, 'subflow')

    const childStarts = store.nodes.filter(
      (node) => node.parentNode === subflowNode.id && node.data.type === 'start',
    )

    expect(childStarts.length).toBe(1)
  })

  it('refuse la creation d un iterate enfant dans iterate', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const parentIterate = getLastNodeByType(store, 'iterate')
    const childIterateId = store.addChildNode(parentIterate.id, 'iterate')
    expect(childIterateId).toBe('')

    const childStarts = store.nodes.filter(
      (node) => node.parentNode === childIterateId && node.data.type === 'start',
    )

    expect(childStarts.length).toBe(0)
  })

  it('interdit explicitement l ajout d un iterate enfant', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const parentIterate = getLastNodeByType(store, 'iterate')
    const childIterateId = store.addChildNode(parentIterate.id, 'iterate')

    expect(childIterateId).toBe('')
    const nestedIterates = store.nodes.filter(
      (node) => node.parentNode === parentIterate.id && node.data.type === 'iterate',
    )
    expect(nestedIterates.length).toBe(0)
  })

  it('interdit explicitement l ajout d un subflow enfant', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const parentIterate = getLastNodeByType(store, 'iterate')
    const childSubflowId = store.addChildNode(parentIterate.id, 'subflow')

    expect(childSubflowId).toBe('')
    const nestedSubflows = store.nodes.filter(
      (node) => node.parentNode === parentIterate.id && node.data.type === 'subflow',
    )
    expect(nestedSubflows.length).toBe(0)
  })

  it('persiste la taille d un iterate lors d un resize', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')

    store.onNodesChange([
      {
        id: iterateNode.id,
        type: 'dimensions',
        dimensions: {
          width: 720,
          height: 360,
        },
      } as never,
    ])

    const refreshed = store.nodes.find((node) => node.id === iterateNode.id)
    expect((refreshed?.style as Record<string, unknown>)?.width).toBe(720)
    expect((refreshed?.style as Record<string, unknown>)?.height).toBe(360)
  })

  it('agrandit automatiquement iterate quand un enfant est deplace', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')
    const childTransformId = store.addChildNode(iterateNode.id, 'transform')

    store.onNodesChange([
      {
        id: childTransformId,
        type: 'position',
        position: { x: 780, y: 460 },
      } as never,
    ])

    const refreshedIterate = store.nodes.find((node) => node.id === iterateNode.id)
    const width = Number((refreshedIterate?.style as Record<string, unknown>)?.width)
    const height = Number((refreshedIterate?.style as Record<string, unknown>)?.height)

    expect(width).toBeGreaterThan(520)
    expect(height).toBeGreaterThan(240)
  })

  it('duplique un iterate avec ses enfants internes via duplicateNode', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')
    const childTransformId = store.addChildNode(iterateNode.id, 'transform')

    store.duplicateNode(iterateNode.id)

    const duplicatedIterateId = Array.from(store.selectedNodeIds)[0]
    const duplicatedIterate = store.nodes.find((node) => node.id === duplicatedIterateId)
    const duplicatedChildren = store.nodes.filter((node) => node.parentNode === duplicatedIterateId)

    expect(duplicatedIterate?.data.type).toBe('iterate')
    expect(duplicatedChildren.some((node) => node.data.type === 'start')).toBe(true)
    expect(duplicatedChildren.some((node) => node.data.type === 'transform')).toBe(true)

    const originalChildrenCount = store.nodes.filter((node) => node.parentNode === iterateNode.id).length
    expect(duplicatedChildren.length).toBe(originalChildrenCount)

    const originalTransform = store.nodes.find((node) => node.id === childTransformId)
    const duplicatedTransform = duplicatedChildren.find((node) => node.data.type === 'transform')

    expect(originalTransform?.position).toEqual(duplicatedTransform?.position)
  })

  it('duplique un iterate selectionne avec les liens internes via duplicateSelectedNodes', () => {
    const store = usePipelineEditorStore()

    store.addNodeByType('iterate')
    const iterateNode = getLastNodeByType(store, 'iterate')
    const childStart = store.nodes.find(
      (node) => node.parentNode === iterateNode.id && node.data.type === 'start',
    )
    const childTransformId = store.addChildNode(iterateNode.id, 'transform')

    const childTransform = store.nodes.find((node) => node.id === childTransformId)
    expect(childStart).toBeDefined()
    expect(childTransform).toBeDefined()

    store.onConnect({ source: childStart!.id, target: childTransform!.id })

    store.setSelectedNode(iterateNode.id)
    store.duplicateSelectedNodes()

    const duplicatedIterateId = Array.from(store.selectedNodeIds).find((id) => id !== iterateNode.id)
    expect(duplicatedIterateId).toBeDefined()

    const duplicatedChildren = store.nodes.filter((node) => node.parentNode === duplicatedIterateId)
    const duplicatedStart = duplicatedChildren.find((node) => node.data.type === 'start')
    const duplicatedTransform = duplicatedChildren.find((node) => node.data.type === 'transform')

    expect(duplicatedStart).toBeDefined()
    expect(duplicatedTransform).toBeDefined()

    const duplicatedInternalEdge = store.edges.find(
      (edge) => edge.source === duplicatedStart!.id && edge.target === duplicatedTransform!.id,
    )

    expect(duplicatedInternalEdge).toBeDefined()
  })
})
