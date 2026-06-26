<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Handle,
  MarkerType,
  Position,
  VueFlow,
  useNodesInitialized,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ControlButton } from '@vue-flow/controls'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import CustomStepEdge from './CustomStepEdge.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import {
  mdiPlay,
  mdiContentCopy,
  mdiContentPaste,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
} from '@mdi/js'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import './vueFlowTheme.css'
import { t } from '@/i18n'

interface Props {
  autoFitOnOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoFitOnOpen: true,
})

const store = usePipelineEditorStore()
const confirm = useConfirm()
type ViewportState = { x: number; y: number; zoom: number }
type PaneState = {
  dimensions: { width: number; height: number }
  viewport: ViewportState
  fitView: (options?: { padding?: number; duration?: number }) => Promise<boolean>
}

const paneState = ref<PaneState | null>(null)
const pendingNodeCreationFit = ref(false)
const nodesInitialized = useNodesInitialized()

const flowNodes = computed(() => {
  return store.nodes.map((node) => {
    const isSelected = store.selectedNodeIds.has(node.id)

    return {
      ...node,
      selected: isSelected,
      data: {
        ...node.data,
        isSelected,
      },
    }
  })
})

async function fitAfterNodeCreation(): Promise<void> {
  if (!pendingNodeCreationFit.value || !paneState.value) {
    return
  }

  await paneState.value.fitView({
    padding: 0.18,
    duration: 250,
  })
  pendingNodeCreationFit.value = false
}

function syncNodeCreationCenter(viewport: ViewportState): void {
  if (!paneState.value) {
    return
  }

  const { width, height } = paneState.value.dimensions
  const hasValidDimensions = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  const hasValidViewport =
    Number.isFinite(viewport.x)
    && Number.isFinite(viewport.y)
    && Number.isFinite(viewport.zoom)
    && viewport.zoom > 0

  if (!hasValidDimensions || !hasValidViewport) {
    store.setNodeCreationCenter(null)
    return
  }

  store.setNodeCreationCenter({
    x: (width / 2 - viewport.x) / viewport.zoom,
    y: (height / 2 - viewport.y) / viewport.zoom,
  })
}

function onNodesChange(changes: NodeChange[]): void {
  store.onNodesChange(changes)
}


function isAnyDialogOpen(): boolean {
  const openDialogSelectors = [
    '.p-dialog-mask',
    '.p-dialog[aria-modal="true"]',
    '[role="dialog"][aria-modal="true"]',
  ]

  return openDialogSelectors.some((selector) => {
    const element = document.querySelector(selector)
    if (!element) {
      return false
    }

    return (element as HTMLElement).offsetParent !== null
  })
}



function onKeyDown(event: KeyboardEvent): void {
  if (isAnyDialogOpen()) {
    return
  }

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey

  // Ctrl/Cmd+A: Select all nodes
  if (isCtrlOrCmd && event.key === 'a') {
    event.preventDefault()
    store.selectAllNodes()
    return
  }

  // Ctrl/Cmd+C: Copy selected nodes
  if (isCtrlOrCmd && event.key === 'c') {
    event.preventDefault()
    store.copySelectedNodes()
    return
  }

  // Ctrl/Cmd+X: Cut selected nodes
  if (isCtrlOrCmd && event.key === 'x') {
    event.preventDefault()
    store.cutSelectedNodes()
    return
  }

  // Ctrl/Cmd+V: Paste nodes
  if (isCtrlOrCmd && event.key === 'v') {
    event.preventDefault()
    store.pasteNodes()
    return
  }

  // Ctrl/Cmd+D: Duplicate selected nodes
  if (isCtrlOrCmd && event.key === 'd') {
    event.preventDefault()
    store.duplicateSelectedNodes()
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onEdgesChange(changes: EdgeChange[]): void {
  store.onEdgesChange(changes)
}

function onConnect(connection: Connection): void {
  store.onConnect(connection)
}

function onNodeClick(event: NodeMouseEvent): void {
  const mouseEvent = event.event as MouseEvent
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const isCtrlOrCmd = isMac ? mouseEvent.metaKey : mouseEvent.ctrlKey

  if (isCtrlOrCmd) {
    // Ctrl/Cmd+Click: Toggle selection
    store.toggleSelectNode(event.node.id)
  } else if (mouseEvent.shiftKey) {
    // Shift+Click: Add to selection
    store.addToSelection(event.node.id)
  } else {
    // Normal click: Single selection
    store.setSelectedNode(event.node.id)
  }
}

function onEdgeClick(): void {
  store.clearSelection()
}

function onPaneClick(): void {
  store.clearSelection()
}

function onPaneReady(event: unknown): void {
  const pane = event as PaneState
  paneState.value = pane
  syncNodeCreationCenter(pane.viewport)
}

function onMove(event: { flowTransform: ViewportState }): void {
  syncNodeCreationCenter(event.flowTransform)
}

function confirmDeleteSelectedNodes(): void {
  const count = store.selectedNodeIds.size
  if (count === 0) {
    return
  }

  const shouldConfirmDeletion = localStorage.getItem('pipeline.editor.confirmDeleteNode') !== 'false'
  if (!shouldConfirmDeletion) {
    store.deleteSelectedNodes()
    return
  }

  confirm.require({
    message: t('pipelineCanvas.deleteNodesConfirm', { count }),
    header: t('common.confirm'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteSelectedNodes()
    },
  })
}

function confirmDeleteNode(nodeId: string, nodeName?: string, nodeLabel?: string): void {
  const shouldConfirmDeletion = localStorage.getItem('pipeline.editor.confirmDeleteNode') !== 'false'
  if (!shouldConfirmDeletion) {
    store.removeNode(nodeId)
    return
  }

  const displayName = String(nodeName ?? '').trim() || String(nodeLabel ?? '').trim() || nodeId
  confirm.require({
    message: t('pipelineCanvas.deleteNodeConfirm', { name: displayName }),
    header: t('common.confirm'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.removeNode(nodeId)
    },
  })
}

watch(
  () => store.nodeCreationTick,
  (nextTickCount, previousTickCount) => {
    if (nextTickCount <= previousTickCount) {
      return
    }

    pendingNodeCreationFit.value = true

    if (nodesInitialized.value) {
      void fitAfterNodeCreation()
    }
  },
)

watch(nodesInitialized, (isInitialized) => {
  if (!isInitialized) {
    return
  }

  void fitAfterNodeCreation()
})
</script>

<template>
  <section class="panel">
    <VueFlow
      :nodes="flowNodes"
      :edges="store.edges"
      :default-edge-options="{ markerEnd: MarkerType.ArrowClosed, type: 'step' }"
      :fit-view-on-init="props.autoFitOnOpen"
      :delete-key-code="null"
      :class="['canvas', 'dark']"
      :snap-to-grid="true"      
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @pane-click="onPaneClick"
      @pane-ready="onPaneReady"
      @move="onMove"
    >
      <template #edge-step="edgeProps">
        <CustomStepEdge v-bind="edgeProps" />
      </template>
      <Background :gap="20" :size="1.1" />
      <Controls position="top-left" :show-interactive="false">
        <ControlButton key="run-button">
          <MdiIcon 
            :path="mdiPlay" 
            size="24"
            color="black"
            @click="() => store.runCurrentPipeline()"
            v-tooltip.right="t('pipelineEditor.menu.runPipeline')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="store.selectedNodeIds.size > 0" key="copy-button">
          <MdiIcon 
            :path="mdiContentCopy" 
            size="24"
            color="black"
            @click="() => store.copySelectedNodes()"
            v-tooltip.right="t('pipelineEditor.multiselect.copy')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="store.clipboard.nodes.length > 0" key="paste-button">
          <MdiIcon 
            :path="mdiContentPaste" 
            size="24"
            color="black"
            @click="() => store.pasteNodes()"
            v-tooltip.right="t('pipelineEditor.multiselect.paste')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="store.selectedNodeIds.size > 0" key="cut-button">
          <MdiIcon 
            :path="mdiContentCut" 
            size="24"
            color="black"
            @click="() => store.cutSelectedNodes()"
            v-tooltip.right="t('pipelineEditor.multiselect.cut')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="store.selectedNodeIds.size > 0" key="duplicate-button">
          <MdiIcon 
            :path="mdiContentDuplicate" 
            size="24"
            color="black"
            @click="() => store.duplicateSelectedNodes()"
            v-tooltip.right="t('pipelineEditor.multiselect.duplicate')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="store.selectedNodeIds.size > 0" key="delete-button">
          <MdiIcon 
            :path="mdiDelete" 
            size="24"
            color="black"
            @click="() => confirmDeleteSelectedNodes()"
            v-tooltip.right="t('pipelineEditor.multiselect.delete')"
            style="cursor: pointer"
          />
        </ControlButton>
      </Controls>
        <template #node-default="{ id, data }">
          <Handle type="target" :position="Position.Left" />
          <div v-if="data.name?.trim()">
              <div class="etl-node-label">{{ data.label }}</div>
              <div class="etl-node-title">{{ data.name }}</div>
          </div>
          <div v-else>
              <div class="etl-node-title">{{ data.label }}</div>
          </div>
          <NodeToolbar :position="Position.Bottom" :is-visible="data.isSelected">
            <Button
              v-if="store.selectedNodeIds.size === 1"
              icon="pi pi-copy"
              severity="secondary"
              :label="t('common.duplicate')"
              @click="store.duplicateNode(id)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              :label="t('common.delete')"
              @click="confirmDeleteNode(id, data.name, data.label)"
            />
          </NodeToolbar>
          <Handle type="source" :position="Position.Right" />
      </template>
    </VueFlow>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.canvas {
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: linear-gradient(180deg, #141a27 0%, #0f1419 100%);
}

.etl-node-label {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.etl-node-title {
  font-size: 0.92rem;
}

.vue-flow__node-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background-color: #2d3748;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
</style>
