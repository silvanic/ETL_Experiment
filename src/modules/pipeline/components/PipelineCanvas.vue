<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import Button from 'primevue/button'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import './vueFlowTheme.css'
import { t } from '@/i18n'

const store = usePipelineEditorStore()
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
    const isSelected = store.selectedNodeId === node.id

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

function onEdgesChange(changes: EdgeChange[]): void {
  store.onEdgesChange(changes)
}

function onConnect(connection: Connection): void {
  store.onConnect(connection)
}

function onNodeClick(event: NodeMouseEvent): void {
  store.setSelectedNode(event.node.id)
}

function onPaneClick(): void {
  store.setSelectedNode(null)
}

function onPaneReady(event: unknown): void {
  const pane = event as PaneState
  paneState.value = pane
  syncNodeCreationCenter(pane.viewport)
}

function onMove(event: { flowTransform: ViewportState }): void {
  syncNodeCreationCenter(event.flowTransform)
}

function confirmDeleteNode(nodeId: string, nodeName?: string, nodeLabel?: string): void {
  const displayName = String(nodeName ?? '').trim() || String(nodeLabel ?? '').trim() || nodeId
  const confirmed = window.confirm(t('pipelineCanvas.deleteNodeConfirm', { name: displayName }))

  if (!confirmed) {
    return
  }

  store.removeNode(nodeId)
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
      :fit-view-on-init="true"
      :class="['canvas', 'dark']"
      :delete-key-code="null"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
      @pane-ready="onPaneReady"
      @move="onMove"
    >
      <Background :gap="20" :size="1.1" />
      <Controls position="top-left":show-interactive="false">
        <ControlButton>
          <i 
            class="pi pi-play" 
            style="color:black" 
            @click="() => store.runCurrentPipeline()"
            v-tooltip.right=" t('pipelineEditor.menu.runPipeline')"
            >
          </i>
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

.etl-node {
  min-width: 180px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  color: var(--text);
  padding: 0.6rem 0.7rem;
  box-shadow: var(--shadow);
}

.etl-node-default {
  display: grid;
  gap: 0.45rem;
}

.etl-node-fixed {
  min-width: 140px;
  text-align: center;
  font-weight: 700;
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
