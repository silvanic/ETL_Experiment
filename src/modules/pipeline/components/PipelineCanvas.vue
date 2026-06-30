<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MenuItem } from 'primevue/menuitem'
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
import { ControlButton, Controls } from '@vue-flow/controls'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import { ITERATE_LAYOUT } from '@/modules/pipeline/domain/iterateLayout'
import type { NodeType } from '@/modules/pipeline/domain/types'
import CustomStepEdge from './CustomStepEdge.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
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
  selectionShortcutsEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoFitOnOpen: true,
  selectionShortcutsEnabled: true,
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
const iterateChildMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const activeIterateNodeId = ref<string | null>(null)
const panelElement = ref<HTMLElement | null>(null)
const canvasHasFocus = ref(false)
const isMacPlatform = /Mac|iPhone|iPad|iPod/.test(navigator.platform)

const selectedCount = computed(() => store.selectedNodeIds.size)
const hasSelection = computed(() => selectedCount.value > 0)
const canPaste = computed(() => store.clipboard.nodes.length > 0)

function isContainerNodeType(type: NodeType): boolean {
  return type === 'iterate' || type === 'subflow'
}

const flowNodes = computed(() => {
  return store.nodes.map((node) => {
    const isSelected = store.selectedNodeIds.has(node.id)
    const isIterate = isContainerNodeType(node.data.type)
    const iterateWidth = Number(node.style?.width ?? ITERATE_LAYOUT.minWidth)
    const iterateHeight = Number(node.style?.height ?? ITERATE_LAYOUT.minHeight)
    const iterateStyle = isIterate
      ? {
          backgroundColor: 'transparent',
          border: '1px dashed rgba(96, 165, 250, 0.45)',
          overflow: 'visible',
          width: `${Number.isFinite(iterateWidth) ? iterateWidth : ITERATE_LAYOUT.minWidth}px`,
          height: `${Number.isFinite(iterateHeight) ? iterateHeight : ITERATE_LAYOUT.minHeight}px`,
        }
      : {}

    return {
      ...node,
      class: isIterate ? 'iterate-node' : undefined,
      expandParent: node.parentNode ? true : node.expandParent,
      style: {
        ...(node.style ?? {}),
        ...iterateStyle,
      },
      selected: isSelected,
      data: {
        ...node.data,
        isSelected,
      },
    }
  })
})

const iterateChildNodeTypes: NodeType[] = [
  'start',
  'api',
  'setVariable',
  'condition',
  'filter',
  'transform',
  'map',
  'output',
]

function nodeTypeLabel(type: NodeType): string {
  if (type === 'start') return t('defaults.nodeLabel.start')
  if (type === 'api') return t('defaults.nodeLabel.api')
  if (type === 'setVariable') return t('defaults.nodeLabel.setVariable')
  if (type === 'condition') return t('defaults.nodeLabel.condition')
  if (type === 'filter') return t('defaults.nodeLabel.filter')
  if (type === 'transform') return t('defaults.nodeLabel.transform')
  if (type === 'map') return t('defaults.nodeLabel.map')
  if (type === 'iterate') return t('defaults.nodeLabel.iterate')
  if (type === 'subflow') return t('defaults.nodeLabel.subflow')
  return t('defaults.nodeLabel.output')
}

function containerTypeBadge(type: NodeType): string {
  return type === 'iterate'
    ? t('pipelineCanvas.containerTypeIterate')
    : t('pipelineCanvas.containerTypeSubflow')
}

function containerTypeHint(type: NodeType): string {
  return type === 'iterate'
    ? t('pipelineCanvas.iterateHint')
    : t('pipelineCanvas.subflowHint')
}

function containerTypeBadgeClass(type: NodeType): string {
  return type === 'iterate'
    ? 'container-type-badge container-type-badge--iterate'
    : 'container-type-badge container-type-badge--subflow'
}

function containerAddChildButtonClass(type: NodeType): string {
  return type === 'iterate'
    ? 'container-child-button container-child-button--iterate'
    : 'container-child-button container-child-button--subflow'
}

const iterateChildMenuItems = computed<MenuItem[]>(() => {
  return iterateChildNodeTypes.map((type) => ({
    label: nodeTypeLabel(type),
    command: () => {
      if (!activeIterateNodeId.value) {
        return
      }

      store.addChildNode(activeIterateNodeId.value, type)
    },
  }))
})

function openIterateChildMenu(event: Event, iterateNodeId: string): void {
  activeIterateNodeId.value = iterateNodeId
  iterateChildMenu.value?.toggle(event)
}

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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const editableSelector = 'input, textarea, select, [contenteditable="true"], [role="textbox"]'
  if (target.matches(editableSelector) || target.closest(editableSelector)) {
    return true
  }

  return false
}

function isTypingContext(event: KeyboardEvent): boolean {
  if (isEditableTarget(event.target)) {
    return true
  }

  const activeElement = document.activeElement
  return isEditableTarget(activeElement)
}

function syncCanvasFocus(): void {
  const panel = panelElement.value
  if (!panel) {
    canvasHasFocus.value = false
    return
  }

  const activeElement = document.activeElement
  canvasHasFocus.value = !!activeElement && panel.contains(activeElement)
}

function focusCanvasPanel(): void {
  panelElement.value?.focus({ preventScroll: true })
  canvasHasFocus.value = true
}

function onPanelMouseDown(event: MouseEvent): void {
  if (isEditableTarget(event.target)) {
    return
  }

  focusCanvasPanel()
}

function onKeyDown(event: KeyboardEvent): void {
  if (!props.selectionShortcutsEnabled) {
    return
  }

  if (isAnyDialogOpen()) {
    return
  }

  if (!canvasHasFocus.value) {
    return
  }

  if (isTypingContext(event)) {
    return
  }

  const isCtrlOrCmd = isMacPlatform ? event.metaKey : event.ctrlKey
  const key = event.key.toLowerCase()

  // Ctrl/Cmd+A: Select all nodes
  if (isCtrlOrCmd && key === 'a') {
    event.preventDefault()
    store.selectAllNodes()
    return
  }

  // Ctrl/Cmd+C: Copy selected nodes
  if (isCtrlOrCmd && key === 'c') {
    event.preventDefault()
    store.copySelectedNodes()
    return
  }

  // Ctrl/Cmd+X: Cut selected nodes
  if (isCtrlOrCmd && key === 'x') {
    event.preventDefault()
    store.cutSelectedNodes()
    return
  }

  // Ctrl/Cmd+V: Paste nodes
  if (isCtrlOrCmd && key === 'v') {
    event.preventDefault()
    store.pasteNodes()
    return
  }

  // Ctrl/Cmd+D: Duplicate selected nodes
  if (isCtrlOrCmd && key === 'd') {
    event.preventDefault()
    store.duplicateSelectedNodes()
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('focusin', syncCanvasFocus)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('focusin', syncCanvasFocus)
})

function onEdgesChange(changes: EdgeChange[]): void {
  store.onEdgesChange(changes)
}

function onConnect(connection: Connection): void {
  store.onConnect(connection)
}

function onNodeClick(event: NodeMouseEvent): void {
  focusCanvasPanel()

  const mouseEvent = event.event as MouseEvent
  const isCtrlOrCmd = isMacPlatform ? mouseEvent.metaKey : mouseEvent.ctrlKey

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
  focusCanvasPanel()
  store.clearSelection()
}

function onPaneClick(): void {
  focusCanvasPanel()
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

function runCurrentPipeline(): void {
  store.runCurrentPipeline()
}

function copySelectedNodes(): void {
  store.copySelectedNodes()
}

function pasteNodes(): void {
  store.pasteNodes()
}

function cutSelectedNodes(): void {
  store.cutSelectedNodes()
}

function duplicateSelectedNodes(): void {
  store.duplicateSelectedNodes()
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
  <section
    ref="panelElement"
    class="panel"
    tabindex="0"
    @mousedown.capture="onPanelMouseDown"
  >
    <Menu ref="iterateChildMenu" :model="iterateChildMenuItems" popup />
    <VueFlow
      :nodes="flowNodes"
      :edges="store.edges"
      :default-edge-options="{ markerEnd: MarkerType.ArrowClosed, type: 'step', zIndex: 5 }"
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
            @click="runCurrentPipeline"
            v-tooltip.right="t('pipelineEditor.menu.runPipeline')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="hasSelection" key="copy-button">
          <MdiIcon
            :path="mdiContentCopy"
            size="24"
            color="black"
            @click="copySelectedNodes"
            v-tooltip.right="t('pipelineEditor.multiselect.copy')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="canPaste" key="paste-button">
          <MdiIcon
            :path="mdiContentPaste"
            size="24"
            color="black"
            @click="pasteNodes"
            v-tooltip.right="t('pipelineEditor.multiselect.paste')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="hasSelection" key="cut-button">
          <MdiIcon
            :path="mdiContentCut"
            size="24"
            color="black"
            @click="cutSelectedNodes"
            v-tooltip.right="t('pipelineEditor.multiselect.cut')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="hasSelection" key="duplicate-button">
          <MdiIcon
            :path="mdiContentDuplicate"
            size="24"
            color="black"
            @click="duplicateSelectedNodes"
            v-tooltip.right="t('pipelineEditor.multiselect.duplicate')"
            style="cursor: pointer"
          />
        </ControlButton>
        <ControlButton v-if="hasSelection" key="delete-button">
          <MdiIcon
            :path="mdiDelete"
            size="24"
            color="black"
            @click="confirmDeleteSelectedNodes"
            v-tooltip.right="t('pipelineEditor.multiselect.delete')"
            style="cursor: pointer"
          />
        </ControlButton>
      </Controls>
      <template #node-default="{ id, data }">
        <template v-if="isContainerNodeType(data.type)">
          <div class="iterate-content">
            <div class="iterate-container-surface" />
            <div :class="containerTypeBadgeClass(data.type)">
              {{ containerTypeBadge(data.type) }}
            </div>
            <div class="iterate-container-header">
              <div v-if="data.name?.trim()" class="etl-node-label">{{ t(data.label) }}</div>
              <div class="etl-node-title">{{ data.name?.trim() || data.label }}</div>
            </div>
            <div class="iterate-container-hint">
              {{ containerTypeHint(data.type) }}
            </div>
          </div>
          <Handle type="target" :position="Position.Left" />
          <NodeToolbar :position="Position.Bottom" :is-visible="data.isSelected">
            <Button
              :class="containerAddChildButtonClass(data.type)"
              icon="pi pi-sitemap"
              severity="help"
              :label="t('pipelineCanvas.addChildNode')"
              @click="openIterateChildMenu($event, id)"
            />
            <Button
              v-if="selectedCount === 1"
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
        <template v-else>
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
              v-if="selectedCount === 1"
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

.panel:focus {
  outline: none;
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

.iterate-container-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  /* border-bottom: 1px dashed rgba(96, 165, 250, 0.45); */
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  padding-bottom: 0.35rem;
  margin-bottom: 0.35rem;
  padding-right: 7.4rem;
}

.container-type-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 2;
  padding: 0.16rem 0.52rem;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #dbeafe;
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid rgba(147, 197, 253, 0.5);
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.container-type-badge--iterate {
  color: var(--flow-iterate-text);
  border-color: var(--flow-iterate-border);
  background: var(--flow-iterate-badge-bg);
}

.container-type-badge--subflow {
  color: var(--flow-subflow-text);
  border-color: var(--flow-subflow-border);
  background: var(--flow-subflow-badge-bg);
}

.container-child-button {
  border-width: 1px !important;
}

.container-child-button--iterate {
  background: var(--flow-iterate-button-bg) !important;
  border-color: var(--flow-iterate-button-border) !important;
  color: var(--flow-iterate-text) !important;
}

.container-child-button--iterate:hover {
  background: var(--flow-iterate-button-bg-hover) !important;
  border-color: var(--flow-iterate-button-border-hover) !important;
}

.container-child-button--subflow {
  background: var(--flow-subflow-button-bg) !important;
  border-color: var(--flow-subflow-button-border) !important;
  color: var(--flow-subflow-text) !important;
}

.container-child-button--subflow:hover {
  background: var(--flow-subflow-button-bg-hover) !important;
  border-color: var(--flow-subflow-button-border-hover) !important;
}

.container-child-button--iterate :deep(.p-button-icon),
.container-child-button--iterate :deep(.p-button-label),
.container-child-button--subflow :deep(.p-button-icon),
.container-child-button--subflow :deep(.p-button-label) {
  color: inherit;
}

.iterate-container-eyebrow {
  /* margin-top:5px; */
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

.iterate-container-title {
  /* margin-top:5px; */
  font-size: 0.9rem;
  font-weight: 600;
  color: #dbeafe;
}

.iterate-container-hint {
  position: relative;
  z-index: 1;
  font-size: 0.74rem;
  color: #bfdbfe;
  width:100%
}

.iterate-content {
  position: relative;
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__node.iterate-node) {
  box-sizing: border-box;
  border-radius: 12px;
}

.iterate-container-surface {
  position: absolute;
  inset: 4px;
  /* border-radius: 8px; */
  /* box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.2); */
  pointer-events: none;
}

.iterate-size-chip {
  position: absolute;
  right: 10px;
  bottom: 8px;
  z-index: 1;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(147, 197, 253, 0.45);
  pointer-events: none;
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
